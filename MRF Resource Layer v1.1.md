Meta Race Framework (MRF)
Unified Architecture Specification v1.0
Status: Stable Draft
Author: cccwhatuneed

1. Vision
Meta Race Framework (MRF) 是一种面向长期稳定运行系统的元框架。
MRF 不追求：
• 无限扩张
• 无限自治
• 无限资源
• 永久运行
MRF 追求：
• 自动运行
• 自动收敛
• 自动降级
• 自动恢复
• 优雅死亡
• 被动重生
核心哲学：
允许老化。
允许故障。
允许死亡。
允许终结。

2. Core Architecture
MRF 由五层组成：
Task Layer
    ↓
Decision Layer
    ↓
Risk Layer
    ↓
Resource Layer
    ↓
Lifecycle Layer
Chaos Layer 横向覆盖所有层。

3. Task Layer
3.1 Task Identity
每个任务拥有唯一 TaskID。
TaskID 用于：
• 跟踪
• 审计
• 统计
TaskID 不用于生命周期继承。

3.2 Task Independence Principle (TIP)
新任务不依赖旧任务。
资源死亡：
不会影响未来任务。
资源重生：
不会继承旧任务。
每个任务天然独立。

3.3 Path Independence Principle (PIP)
任务身份独立于路径。
例如：
Task123

A → B → C
与：
Task123

A → D → E
逻辑等价。
路径不同不构成脑裂。

4. Decision Layer
4.1 Champion Decision
所有候选策略参与竞速。
谁先完成：
谁成为 Champion。
Champion 不代表最优。
Champion 代表最快收敛。

4.2 Champion + Veto
普通层负责产生结果。
风险层负责否决结果。
形成：
Champion
    ↓
Risk Check
    ↓
Final Decision

4.3 Majority Champion
多数意见形成 Champion。
少数高风险意见保留否决权。

5. Risk Layer
5.1 Risk Veto Champion
风险结果同样参与竞速。
最先满足否决条件者：
成为 Risk Champion。

5.2 Descending Confirmation Veto
风险等级越高：
所需确认越少。
Level 3
1票否决

Level 2
2票否决

Level 1
3票否决

5.3 Conservative Direction Principle
风险层只能推动结果向更保守方向变化。
禁止：
Hold → Buy
允许：
Buy → Hold
Buy → Reduce
Buy → Sell

5.4 Market Close Exit-Only
收盘前 N 分钟：
禁止新增风险。
允许：
• Hold
• Reduce
• Sell
• Stop Loss
• Panic Exit
禁止：
• Buy
• Open Position

6. Resource Layer
6.1 Resource Homogeneity Assumption
同层资源满足相同能力契约。
同层资源可互换。
MRF 不处理异构兼容问题。

6.2 Resource Contract Principle (RCP)
MRF 只验证契约。
MRF 不适配契约。
流程：
Join Request
      ↓
Contract Check
      ↓
Pass → Join
Fail → Reject
资源不兼容：
资源提供者自行开发适配模块。
MRF 不负责：
• Adapter Development
• Protocol Translation
• Compatibility Layer

6.3 Terminal Exhaustion Principle (TEP)
优先消耗当前末端资源。
示例：
L1
↓
L2
↓
L3
↓
L4
当前末端：
L4
优先消耗：
L4

资源失效：
L4 Fail
自动退级：
Terminal = L3

资源耗尽：
Remove(L4)
系统继续运行。

6.4 Position Defines Burn Rate
位置决定消耗速度。
L4
↓
L3
↓
L2
↓
L1
耗尽顺序：
L4 → L3 → L2 → L1
插入越靠近末端：
消耗越快。
插入越靠近根部：
寿命越长。

6.5 Parallel Exhaustion Distribution (PED)
允许多个合法末端。
Root
├─ A → C
└─ B → D
Terminal：
C
D
同时成立。
任务自然分流。
耗尽呈统计分布。
不属于脑裂。

6.6 Failure Driven Principle (FDP)
系统默认相信当前状态。
失败时才重新发现。
Use Terminal
      ↓
Fail
      ↓
Degrade
      ↓
Rediscover
MRF 追求：
可工作一致。
不追求：
强一致。

6.7 Resource Rejoin Principle (RRP)
故障不等于死亡。
恢复后：
Recover
↓
Rediscover
↓
Rejoin
重新加入系统。

7. Lifecycle Layer
7.1 Graceful Death Principle (GDP)
死亡不是错误。
资源耗尽：
Save State
↓
Exit
↓
Dormant
允许优雅退出。

7.2 Passive Lifecycle Principle (PLP)
生命周期必须被动触发。
允许：
• Deploy
• Recover
• Rejoin
禁止：
• Self Create Resource
• Self Expand
• Self Purchase Resource
• Self Register Resource

7.3 Passive Rebirth
重生必须来自外部。
例如：
• 人工部署
• 新硬件接入
• 新节点接入
系统不会主动创造资源。

7.4 Data Inheritance Clarification
历史数据允许继承。
目的：
• 审计
• 分析
• 统计
• 策略优化
不是：
• 新任务依赖旧任务
任务始终独立。

8. Chaos Layer
Chaos Layer 用于验证框架鲁棒性。
支持：
• 随机故障
• 网络分区
• 节点失联
• 资源耗尽
• 级联故障
• 全局故障
验证目标：
自动降级
自动恢复
自动收敛
优雅死亡

9. Resource Lifecycle Model
Deploy
↓
Join
↓
Active
↓
Fault
↓
Recover
↓
Rediscover
↓
Rejoin
↓
Active
↓
Exhausted
↓
Graceful Death
↓
Dormant
↓
External Deploy
↓
Rebirth

10. Framework Boundary
MRF负责：
• Discovery
• Validation
• Champion Selection
• Risk Veto
• Scheduling
• Degradation
• Recovery
• Rejoin
• Exhaustion
• Graceful Death
MRF不负责：
• Adapter Development
• Resource Creation
• Resource Expansion
• Resource Purchase
• Autonomous Growth

11. MRF Philosophy
自动运行。
自动收敛。
允许老化。
允许故障。
允许死亡。
允许终结。
拒绝无限扩张。
有限资源下长期稳定运行。

12. Final Definition
Meta Race Framework (MRF) 是一种：
在有限资源约束下，
通过 Champion Race、Risk Veto、Terminal Exhaustion、Graceful Death 与 Passive Rebirth，
实现长期稳定、自适应收敛、允许老化与终结的元框架。
