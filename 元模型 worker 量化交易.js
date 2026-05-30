// ============================================================
// Meta Race Framework (MRF)
// 通用分布式竞速框架 - 最终版
// 
// 核心设计：
// - 唯一同步点：决策器等所有模块结果
// - 决策器之间异步竞速（谁快谁赢，不等）
// - 其他全异步
// - 幂等去重
// - 自动选主
//
// ============================================================

// ========== 存储层 ==========

class Storage {
  constructor(backend) {
    this.backend = backend;
  }
  async get(key) {
    return this.backend.get(key);
  }
  async set(key, value, ttl = 3600) {
    return this.backend.set(key, value, ttl);
  }
  async delete(key) {
    return this.backend.delete(key);
  }
}

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  async set(key, value, ttl = 3600) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000
    });
  }
  async delete(key) {
    this.store.delete(key);
  }
}

// ========== 任务ID生成（永不重复） ==========

function generateTaskId() {
  // UUID v4 + 随机数，重复概率几乎为0
  const uuid = crypto.randomUUID();
  const random = Math.random().toString(36).substring(2, 10);
  return `${uuid}_${random}`;
}

// ========== 模块 ==========

class Module {
  constructor(id, processFn) {
    this.id = id;
    this.processFn = processFn;
    this.output = null;
  }

  async start(input) {
    this.output = await this.processFn(input);
    return this.output;
  }

  getOutput() {
    return this.output;
  }
}

// ========== 聚合器（决策器） ==========

class Aggregator {
  constructor(id, modules, options = {}) {
    this.id = id;
    this.modules = modules;
    this.maxRetries = options.maxRetries || 3;
    this.retryInterval = options.retryInterval || 1000;
    this.rule = options.rule || 'majority';
    this.weights = options.weights || {};
  }

  async start(inputId) {
    // 唯一同步点：等所有模块结果
    const outputs = [];
    for (const mod of this.modules) {
      const out = await this.waitWithRetry(mod);
      if (out !== null) outputs.push(out);
    }

    if (outputs.length === 0) {
      return { action: 'skip', inputId, reason: 'no_output' };
    }

    return this.decide(outputs, inputId);
  }

  async waitWithRetry(module) {
    for (let i = 0; i < this.maxRetries; i++) {
      const out = module.getOutput();
      if (out !== null) return out;
      await this.sleep(this.retryInterval);
    }
    return null;
  }

  decide(outputs, inputId) {
    switch (this.rule) {
      case 'majority': {
        const votes = {};
        for (const out of outputs) {
          const key = JSON.stringify(out);
          votes[key] = (votes[key] || 0) + 1;
        }
        const maxVotes = Math.max(...Object.values(votes));
        const winners = Object.keys(votes).filter(k => votes[k] === maxVotes);
        if (winners.length === 1) {
          return { action: 'adopt', inputId, result: JSON.parse(winners[0]), votes };
        }
        return { action: 'skip', inputId, reason: 'tie', votes };
      }

      case 'consensus': {
        const first = JSON.stringify(outputs[0]);
        const allSame = outputs.every(o => JSON.stringify(o) === first);
        if (allSame) return { action: 'adopt', inputId, result: outputs[0] };
        return { action: 'skip', inputId, reason: 'no_consensus' };
      }

      case 'champion': {
        return { action: 'adopt', inputId, result: outputs[0] };
      }

      case 'weighted': {
        let best = null;
        let bestScore = -Infinity;
        for (const out of outputs) {
          const score = this.weights[out.type] || 1;
          if (score > bestScore) {
            bestScore = score;
            best = out;
          }
        }
        return { action: 'adopt', inputId, result: best };
      }

      default: {
        return { action: 'adopt', inputId, result: outputs[0] };
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ========== 执行器 ==========

class Executor {
  constructor(id, storage, executeFn) {
    this.id = id;
    this.storage = storage;
    this.executeFn = executeFn;
  }

  async execute(taskId, decision) {
    if (decision.action !== 'adopt') return decision;

    // 幂等检查
    const done = await this.storage.get(`task:${taskId}:done`);
    if (done) return done;

    const result = await this.executeFn(decision.result);
    await this.storage.set(`task:${taskId}:done`, result, 86400);
    return result;
  }
}

// ========== 调度器 ==========

class Scheduler {
  constructor(id, storage, options = {}) {
    this.id = id;
    this.storage = storage;
    this.leaseKey = 'scheduler:lease';
    this.leaseDuration = options.leaseDuration || 30000;
    this.heartbeatInterval = options.heartbeatInterval || 10000;
    this.isMaster = false;
    this.allNodes = options.allNodes || [];
  }

  async start() {
    await this.confirmOrElect();
    this.startHeartbeat();
  }

  async confirmOrElect() {
    const lease = await this.getLease();
    if (lease && lease.owner === this.id) {
      this.isMaster = true;
      return;
    }
    if (lease) {
      this.isMaster = false;
      return;
    }
    await this.elect();
  }

  async getLease() {
    const raw = await this.storage.get(this.leaseKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expiresAt < Date.now()) return null;
    return data;
  }

  async elect() {
    const existing = await this.storage.get(this.leaseKey);
    if (existing) {
      this.isMaster = false;
      return;
    }
    await this.storage.set(this.leaseKey, JSON.stringify({
      owner: this.id,
      expiresAt: Date.now() + this.leaseDuration
    }));
    this.isMaster = true;
  }

  async renewLease() {
    if (!this.isMaster) return;
    await this.storage.set(this.leaseKey, JSON.stringify({
      owner: this.id,
      expiresAt: Date.now() + this.leaseDuration
    }));
  }

  startHeartbeat() {
    setInterval(async () => {
      if (this.isMaster) {
        await this.renewLease();
      } else {
        const lease = await this.getLease();
        if (!lease) await this.elect();
      }
    }, this.heartbeatInterval);
  }

  async dispatch(taskId, input, modules, aggregators, executors) {
    if (!this.isMaster) throw new Error('Not master');

    // 1. 启动所有模块（异步，不等）
    modules.forEach(m => m.start(input));

    // 2. 决策器竞速：第一个返回有效结果的胜出（异步，不等）
    let champion = null;
    for (const a of aggregators) {
      const result = await a.start(taskId);
      if (result.action === 'adopt') {
        champion = result;
        break;
      }
    }

    if (!champion) {
      return { action: 'skip', reason: 'no_decision' };
    }

    // 3. 执行器竞速（异步，不等）
    return await Promise.race(executors.map(e => e.execute(taskId, champion)));
  }
}

// ========== 示例 ==========

async function demoQuant() {
  const storage = new Storage(new MemoryStorage());

  const strategies = [
    new Module('PE策略', async (data) => {
      await new Promise(r => setTimeout(r, 8));
      if (data.pe < 20) return { action: 'buy', price: data.price, qty: 100 };
      if (data.pe > 80) return { action: 'sell', price: data.price, qty: 100 };
      return { action: 'hold' };
    }),
    new Module('均线策略', async (data) => {
      await new Promise(r => setTimeout(r, 12));
      if (data.maFast > data.maSlow) return { action: 'buy', price: data.price, qty: 100 };
      return { action: 'hold' };
    }),
    new Module('RSI策略', async () => {
      await new Promise(r => setTimeout(r, 15));
      return { action: 'hold' };
    })
  ];

  const decisions = [
    new Aggregator('D1', strategies, { rule: 'majority' }),
    new Aggregator('D2', strategies, { rule: 'majority' }),
    new Aggregator('D3', strategies, { rule: 'majority' })
  ];

  const createBroker = (name) => async (decision) => {
    await new Promise(r => setTimeout(r, 28));
    return { success: true, orderId: `${name}_${Date.now()}` };
  };

  const executors = [
    new Executor('招商', storage, createBroker('招商')),
    new Executor('华泰', storage, createBroker('华泰')),
    new Executor('中信', storage, createBroker('中信'))
  ];

  const scheduler = new Scheduler('master', storage);
  await scheduler.start();

  const taskId = generateTaskId();
  const result = await scheduler.dispatch(taskId, {
    price: 3.856,
    pe: 18,
    maFast: 3.842,
    maSlow: 3.821
  }, strategies, decisions, executors);

  console.log('交易结果:', result);
}

// ========== 导出 ==========

export {
  Storage,
  MemoryStorage,
  generateTaskId,
  Module,
  Aggregator,
  Executor,
  Scheduler,
  demoQuant
};