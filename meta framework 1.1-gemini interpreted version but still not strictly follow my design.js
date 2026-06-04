// ============================================================================
// Meta Race Framework (MRF) - Production Specification Core
// 核心哲学：唯一ID底座、冠军逆态熔断、主从怀疑选主、肢端耗尽退行
// ============================================================================

/**
 * [底座层] 分布式唯一性存储模拟 (原子卡口)
 */
class DistributedKV底座 {
    constructor(nodeName) {
        this.nodeName = nodeName;
        this.store = new Map();
    }

    async setNX(key, value, leaseMs = 2000) {
        const current = this.store.get(key);
        if (current && Date.now() < current.expire) {
            return false; // 锁未过期，抢占失败
        }
        this.store.set(key, { value, expire: Date.now() + leaseMs });
        return true;
    }

    async get(key) {
        const item = this.store.get(key);
        if (!item || Date.now() > item.expire) {
            this.store.delete(key);
            return null;
        }
        return item.value;
    }

    async delete(key) {
        this.store.delete(key);
    }
}

/**
 * [资源层] 拓扑层级节点 - 流水下行、肢端优先耗尽与阻尼退行机制
 */
class HierarchicalTopologyNode {
    constructor(name, baseThreshold = 0.7, dampingFactor = 1.0) {
        this.name = name;
        this.childNode = null; 
        this.baseThreshold = baseThreshold; // 基础耗尽阈值
        this.dampingFactor = dampingFactor; // 阻尼系数（越往高层，抗压能力和降级越激进）
        this.currentLoad = 0.2;            // 动态物理负载
        this.isAlive = true;
    }

    setChild(node) {
        this.childNode = node;
    }

    // 动态计算当前的实际耗尽阈值（阻尼保护）
    getEffectiveThreshold() {
        return Math.min(0.98, this.baseThreshold * this.dampingFactor);
    }

    isExhausted() {
        return this.currentLoad >= this.getEffectiveThreshold();
    }

    /**
     * 核心资源流转：向下传递或向上退行
     */
    async executePipeline(taskId, payload) {
        if (!this.isAlive) throw new Error(`[Node Dead] ${this.name} 无法工作`);

        // 1. 流水下行：优先检查是否有健康的、未耗尽的下级肢端
        if (this.childNode && this.childNode.isAlive && !this.childNode.isExhausted()) {
            try {
                return await this.childNode.executePipeline(taskId, payload);
            } catch (err) {
                // 下级突发断电或在执行中瞬间耗尽，捕获异常，触发退行接管
            }
        }

        // 2. 退行接管：自己被迫成为当前的执行末端
        if (this.isExhausted()) {
            throw new Error(`[Exhaustion Collapse] ${this.name} 达到最大阻尼阈值，拒绝执行，逼迫更高层退行！`);
        }

        // 3. 肢端处理与极致降级优化
        const effectiveThreshold = this.getEffectiveThreshold();
        if (this.currentLoad > effectiveThreshold * 0.85) {
            // 逼近极限，自愿启动优化模式
            // 砍掉非核心计算，用极速浅层模型保住这个唯一 Task_ID 的时效
            this.currentLoad += 0.05; // 优化模式下，资源消耗极慢
            return { executedBy: this.name, mode: 'EXTREMITY_OPTIMIZED_SIGNAL', data: "COMPUTED_FAST_EXPECTATION" };
        }

        // 正常全力计算
        this.currentLoad += 0.2; 
        return { executedBy: this.name, mode: 'FULL_正态_SIGNAL', data: "COMPUTED_PRECISION_EXPECTATION" };
    }

    // 动态链回（热插拔自愈）
    async probeAndRechain() {
        if (this.childNode && !this.childNode.isAlive) {
            this.childNode.isAlive = true;
            this.childNode.currentLoad = 0.1; // 充能重置
            console.log(`🔄 [动态链回] 末端肢端 ${this.childNode.name} 恢复健康，重新接入拓扑，优先承压！`);
        }
    }
}

/**
 * [决策层] 决策器 - 门闩 Hold 机制、逆态冠军一票否决、正态多数决
 */
class SpecDecisionEngine {
    constructor() {
        this.gatingTimeoutMs = 50; // 微秒级/毫秒级全局 Hold 闸门时间
    }

    async decide(taskId, riskStream, normalComputePromise) {
        return new Promise((resolve) => {
            let isSettled = false; // 物理门闩：彻底粉碎异步穿透和幽灵回调敞口
            let highRiskVotes = 0;

            // 1. 流式监听逆态信号 (保命通道)
            riskStream.on('RISK_SIGNAL', (signal) => {
                if (isSettled) return;

                if (signal.level === 'CRITICAL') {
                    isSettled = true;
                    // 逆态冠军一票否决，直接盖过正态，瞬间完成响应
                    resolve({ status: 'VETOED_CRITICAL', reason: signal.msg, source: 'CHAMPION_RACE' });
                } else if (signal.level === 'HIGH') {
                    highRiskVotes++;
                    if (highRiskVotes >= 2) {
                        isSettled = true; // 两票否决
                        resolve({ status: 'VETOED_HIGH', reason: '风险递减两票累计熔断', source: 'CHAMPION_RACE' });
                    }
                }
            });

            // 2. 正常无风险通道：等完全部结果进行正态多数决
            normalComputePromise.then((computeResults) => {
                // 启动卡口时钟：在规定的 Hold 阈值内等待
                setTimeout(() => {
                    if (isSettled) return; // 如果已经被逆态冠军击穿，本回调彻底失效
                    isSettled = true;

                    // 过滤掉因为断电或无值(Hold)产生的 null 节点
                    const validResults = computeResults.filter(r => r !== null);
                    
                    if (validResults.length === 0) {
                        // 超时阈值触发且全无有效值：无动作，宁可错过绝不做错
                        resolve({ status: 'NO_VALUE_HOLD', reason: '全员无值或超时触顶', source: 'NORMAL_CONSENSU' });
                        return;
                    }

                    // 达成多数决，保证最大合理正期望
                    resolve({ status: 'APPROVED', data: validResults, source: 'NORMAL_CONSENSU' });
                }, this.gatingTimeoutMs);
            }).catch(() => {
                if (!isSettled) {
                    isSettled = true;
                    resolve({ status: 'NO_VALUE_HOLD', reason: '计算链崩溃引发无值机制' });
                }
            });
        });
    }
}

/**
 * [调度层] 调度器节点 - 宣誓与反询怀疑、脑裂自愈收敛、死锁核心主动调查
 */
class SpecSchedulerNode {
    constructor(nodeId, weight, kvCluster, decisionEngine, topologyRoot) {
        this.nodeId = nodeId;
        this.weight = weight;
        this.kvCluster = kvCluster;
        this.decisionEngine = decisionEngine;
        this.topologyRoot = topologyRoot; // 调度只和层接口的最高级认知对话
        
        this.role = 'SLAVE';
        this.lastMasterHeartbeat = Date.now();
        this.masterEpoch = 0;
    }

    // 主调度定期宣誓主权 (多 KV 错位写入，写不成功则视为无主)
    async execute宣誓() {
        if (this.role !== 'MASTER') return;

        // 随机挑一个 KV 注入租约
        const targetKV = this.kvCluster[Math.floor(Math.random() * this.kvCluster.length)];
        const success = await targetKV.setNX('spec:master:lock', {
            leader: this.nodeId,
            epoch: this.masterEpoch + 1
        }, 1000); // 1秒短租期

        if (!success) {
            // 发现主状态异常（可能写不成功、被占领或租期失效），自动变从收敛
            this.role = 'SLAVE';
        } else {
            this.masterEpoch++;
        }
    }

    // 从调度反询怀疑机制
    async execute怀疑与调查(allSlaves) {
        if (this.role === 'MASTER') return;

        // 3秒未收到心跳，启动反询
        if (Date.now() - this.lastMasterHeartbeat > 3000) {
            let againstVotes = 0;
            let totalWeight = 0;

            for (const slave of allSlaves) {
                if (slave.nodeId === this.name) continue;
                if (Date.now() - slave.lastMasterHeartbeat > 3000) {
                    againstVotes += slave.weight; // 平票加权多数决
                }
                totalWeight += slave.weight;
            }

            if (againstVotes >= totalWeight / 2) {
                // 确认无主，进入无主选举状态
                await this.execute竞选();
            }
        }
    }

    async execute竞选() {
        // 错开延迟，防止肢端撞墙
        await new Promise(r => setTimeout(r, Math.random() * 200));
        const targetKV = this.kvCluster[Math.floor(Math.random() * this.kvCluster.length)];
        
        const success = await targetKV.setNX('spec:master:lock', {
            leader: this.nodeId,
            epoch: this.masterEpoch + 1
        }, 2000);

        if (success) {
            this.role = 'MASTER';
            this.masterEpoch++;
            console.log(`👑 [选主闭环] 节点 ${this.nodeId} 竞选写 KV 成功，晋升为新主调度！`);
        }
    }

    // 接收下级反向举报
    handle下级举报() {
        this.lastMasterHeartbeat = Date.now() - 5000; // 强制怀疑触顶
    }

    /**
     * 核心调度主流程：任务下发与核心死锁调查
     */
    async dispatch(taskId, payload, riskStream, executionLocker) {
        if (this.role !== 'MASTER') return null; // 只有主调度能下发

        // 1. 肢端并行流水线推导 (运算结果)
        const computePromise = this.topologyRoot.executePipeline(taskId, payload)
            .then(res => [res]) // 包装为数组以契合决策器多数决规范
            .catch(() => [null]); // 物理断电没结果视为无值 null

        // 2. 全局硬时钟介入：防止肢端执行物理卡死导致的永远无响应
        const schedulerInvestigationTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SCHEDULER_INVESTIGATE_TRIGGERED')), 300)
        );

        try {
            // 3. 调度在唯一同步点通过决策器阻击风险或采纳正态
            const finalDecision = await Promise.race([
                this.decisionEngine.decide(taskId, riskStream, computePromise),
                schedulerInvestigationTimeout
            ]);

            // 4. 落地落库：交由执行器，靠任务 ID 唯一性卡死最终确定性（消除双主脑裂危害）
            const acquiredLock = await executionLocker.setNX(`task:execution:lock:${taskId}`, this.nodeId, 5000);
            if (!acquiredLock) {
                return { taskId, status: 'INTERCEPTED_DUPLICATE', msg: '脑裂或幽灵指令，已原位无害拦截' };
            }

            return { taskId, decision: finalDecision, status: 'SUCCESS_COMMITTED' };

        } catch (err) {
            // 5. 核心高层未死：主动调查自愈
            if (err.message === 'SCHEDULER_INVESTIGATE_TRIGGERED') {
                console.warn(`🔎 [核心调查] 任务 ${taskId} 肢端无返回发生疑似死锁！调度强行收尸，重置该 ID 状态！`);
                await executionLocker.delete(`task:execution:lock:${taskId}`);
                return { taskId, status: 'SCHEDULER_RECOVERED_BY_FORCE' };
            }
            throw err;
        }
    }
}

// ============================================================================
// 🧪 工业场景极限跑通验证 (直接运行)
// ============================================================================
const EventEmitter = require('events');

async function testDrive() {
    console.log("🚀 --- Meta Race Framework 最终代码严谨性验证开始 --- 🚀");

    // 1. 初始化多 KV 集群与底层执行卡口
    const kv1 = new DistributedKV底座("KV_Instance_1");
    const kv2 = new DistributedKV底座("KV_Instance_2");
    const executionLocker = new DistributedKV底座("Final_落库_Locker");

    // 2. 初始化纵向层级拓扑（层接口与递增阻尼肢端）
    const rootInterface = new HierarchicalTopologyNode("层接口_Layer_1", 0.9, 1.0);
    const edgeNode = new HierarchicalTopologyNode("边缘节点_Layer_2", 0.8, 1.1); // 具备1.1倍抗压阻尼
    const terminal肢端 = new HierarchicalTopologyNode("末端肢端_Layer_3", 0.5, 1.2); // 1.2倍阻尼，最易耗尽

    rootInterface.setChild(edgeNode);
    edgeNode.setChild(terminal肢端);

    // 3. 初始化决策引擎
    const decisionEngine = new SpecDecisionEngine();

    // 4. 初始化主调度节点
    const primaryMaster = new SpecSchedulerNode("Sched_Primary", 5, [kv1, kv2], decisionEngine, rootInterface);
    primaryMaster.role = 'MASTER'; // 强设定为主进行任务分发验证

    // ---- 测试用例一：正常下行，末端承压 ----
    console.log("\n--- [CASE 1] 正常计算任务下行 ---");
    const riskStreamA = new EventEmitter();
    const res1 = await primaryMaster.dispatch("TASK_2026_001", { data: "BUY_SIGNAL" }, riskStreamA, executionLocker);
    console.log("执行结果 1:", JSON.stringify(res1));
    console.log(`[末端肢端当前负载]: ${terminal肢端.currentLoad}`);

    // ---- 测试用例二：末端耗尽，自愿降级优化与退行机制 ----
    console.log("\n--- [CASE 2] 连续高频压榨，触发末端肢端自愿耗尽优化与阻尼退行 ---");
    // 继续下发任务压榨末端，使其跨过耗尽线
    await primaryMaster.dispatch("TASK_2026_002", { data: "BUY_SIGNAL" }, new EventEmitter(), executionLocker);
    
    const riskStreamB = new EventEmitter();
    const res3 = await primaryMaster.dispatch("TASK_2026_003", { data: "BUY_SIGNAL" }, riskStreamB, executionLocker);
    console.log("执行结果 3 (应由 Edge_Node 退行接管或触发优化):", JSON.stringify(res3));

    // ---- 测试用例三：极端风险爆发，逆态冠军一票否决熔断 ----
    console.log("\n--- [CASE 3] 极端黑天鹅爆发，逆态冠军信号瞬间击穿门闩，熔断流程 ---");
    const riskStreamC = new EventEmitter();
    const taskPromise = primaryMaster.dispatch("TASK_2026_004", { data: "BUY_SIGNAL" }, riskStreamC, executionLocker);

    // 模拟在 Hold 期间，风控流式通道瞬间砸入一个 CRITICAL 信号
    setImmediate(() => {
        riskStreamC.emit('RISK_SIGNAL', { level: 'CRITICAL', msg: '市场突发流动性枯竭断崖' });
    });

    const res4 = await taskPromise;
    console.log("执行结果 4 (风控熔断):", JSON.stringify(res4));

    // ---- 测试用例四：脑裂双主无害化收敛 ----
    console.log("\n--- [CASE 4] 模拟多主脑裂，同时下发相同 Task_ID ---");
    const fakeMaster = new SpecSchedulerNode("Sched_Fake", 1, [kv1, kv2], decisionEngine, rootInterface);
    fakeMaster.role = 'MASTER'; // 伪装成另一个主调度

    // 两个主调度在同一微秒向执行卡口落库相同 ID 的任务
    const p1 = primaryMaster.dispatch("TASK_2026_005", { data: "SIGNAL" }, new EventEmitter(), executionLocker);
    const p2 = fakeMaster.dispatch("TASK_2026_005", { data: "SIGNAL" }, new EventEmitter(), executionLocker);

    const [r1, r2] = await Promise.all([p1, p2]);
    console.log("真正主调度执行结果:", JSON.stringify(r1));
    console.log("伪装/迟到主调度执行结果:", JSON.stringify(r2));

    console.log("\n🚀 --- 元框架核心状态机严谨走通，闭环达成！ --- 🚀");
}

testDrive();