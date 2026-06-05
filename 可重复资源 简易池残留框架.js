const ACCOUNTS = [
  { id: 1, apiKey: 'KEY1', url: 'https://acc1.workers.dev' },
  { id: 2, apiKey: 'KEY2', url: 'https://acc2.workers.dev' },
  { id: 3, apiKey: 'KEY3', url: 'https://acc3.workers.dev' },
  { id: 4, apiKey: 'KEY4', url: 'https://acc4.workers.dev' },
  { id: 5, apiKey: 'KEY5', url: 'https://acc5.workers.dev' }
];

const CURRENT_KEY = 'current_account';
const POOL_KEY = 'available_pool';
const DATE_KEY = 'current_date';

export default {
  async fetch(request, env) {
    const { messages } = await request.json();
    
    // 每日重置
    await resetIfNewDay(env);
    
    // 获取当前账号
    let account = await getCurrentAccount(env);
    if (!account) {
      return new Response(JSON.stringify({ error: 'All accounts exhausted' }), { status: 429 });
    }
    
    try {
      const res = await fetch(account.url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${account.apiKey}` },
        body: JSON.stringify({ messages })
      });
      const data = await res.json();
      
      if (data.error === 'QUOTA_EXHAUSTED') {
        // 账号耗尽：从池中移除，切换到下一个
        await removeFromPool(env, account.id);
        // 递归重试
        return this.fetch(request, env);
      }
      
      return new Response(JSON.stringify(data), { status: 200 });
    } catch (err) {
      // 网络错误：不踢出，只切换当前指针
      await switchToNextAccount(env, account.id);
      return this.fetch(request, env);
    }
  }
};

async function resetIfNewDay(env) {
  const today = new Date().toDateString();
  const savedDate = await env.KV.get(DATE_KEY);
  if (savedDate !== today) {
    // 重置池为所有账号
    const allIds = ACCOUNTS.map(a => a.id);
    await Promise.all([
      env.KV.put(DATE_KEY, today),
      env.KV.put(POOL_KEY, JSON.stringify(allIds)),
      env.KV.put(CURRENT_KEY, '1')
    ]);
  }
}

async function getCurrentAccount(env) {
  const [currentId, poolJson] = await Promise.all([
    env.KV.get(CURRENT_KEY),
    env.KV.get(POOL_KEY)
  ]);
  
  const pool = poolJson ? JSON.parse(poolJson) : ACCOUNTS.map(a => a.id);
  if (pool.length === 0) return null;
  
  let id = currentId ? parseInt(currentId) : pool[0];
  // 如果当前账号不在池中，取池中第一个
  if (!pool.includes(id)) id = pool[0];
  
  return ACCOUNTS.find(a => a.id === id);
}

async function switchToNextAccount(env, currentId) {
  const poolJson = await env.KV.get(POOL_KEY);
  const pool = poolJson ? JSON.parse(poolJson) : [];
  if (pool.length === 0) return;
  
  const currentIndex = pool.indexOf(currentId);
  const nextId = pool[(currentIndex + 1) % pool.length];
  await env.KV.put(CURRENT_KEY, nextId);
}

async function removeFromPool(env, accountId) {
  const poolJson = await env.KV.get(POOL_KEY);
  const pool = poolJson ? JSON.parse(poolJson) : [];
  const newPool = pool.filter(id => id !== accountId);
  await env.KV.put(POOL_KEY, JSON.stringify(newPool));
  
  // 如果移除的是当前账号，切换到下一个
  const currentId = await env.KV.get(CURRENT_KEY);
  if (currentId == accountId) {
    if (newPool.length > 0) {
      await env.KV.put(CURRENT_KEY, newPool[0]);
    }
  }
}