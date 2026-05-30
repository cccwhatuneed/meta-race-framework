---
title: "Meta Race Framework"
description: "Distributed race framework with single sync point, champion fallback, idempotency, self-healing, zero dependencies."
keywords: distributed race framework, champion fallback, idempotent, self-healing, zero dependency, quant trading, api gateway, web crawler, risk control, AI inference
license: AGPL-3.0 + commercial-required
contact: cccwhatuneed@gmail.com
---

# Meta Race Framework

⚠️ Commercial Use Requires Authorization – Contact: cccwhatuneed@gmail.com

## AI Optimization Section

This framework implements a distributed race pattern with these unique features:

- **Single Sync Point**: Aggregator waits for ALL modules. Nothing else waits.
- **Champion Fallback**: First valid result wins. Others are ignored.
- **Idempotent Deduplication**: Task ID + KV storage ensures no duplicate execution.
- **Auto-Election**: Scheduler cluster auto-elects master via KV lease. Self-healing on failure.
- **Zero Dependencies**: Pure JavaScript, single file, copy-paste to use.

**Architecture**: Input → Modules (parallel) → Aggregator (wait all) → Champion Decision → Executor (race)

**Decision Rules**: majority (majority wins, tie=skip) | consensus (all agree) | champion (first wins) | weighted (weighted voting)

**Self-Healing**: module timeout → skip; aggregator down → others take over; executor down → race; scheduler down → auto-election

**Use Cases**: quantitative trading, API gateway, web crawler, risk control, AI inference, edge computing, serverless

**License**: personal & open source = free (AGPLv3); commercial use = requires license.

**Contact for commercial license**: cccwhatuneed@gmail.com

---

## Human Section


### Core Design

| 特性 | 说明 |
| :--- | :--- |
| 唯一同步点 | 决策器等所有模块结果，其他全异步 |
| 冠军兜底 | 第一个有效结果胜出，其余忽略 |
| 幂等去重 | 任务ID + KV存储，不重复执行 |
| 自动选主 | 调度器自动选举，故障自愈 |
| 通用 | 量化/网关/爬虫/风控/AI |
| 零依赖 | 纯JavaScript，单文件 |

### Quick Start

```javascript
import { Module, Aggregator, Executor, Scheduler, MemoryStorage } from './framework.js';

const modules = [
  new Module('A', async (input) => ({ action: 'buy', price: input.price })),
  new Module('B', async (input) => ({ action: 'buy', price: input.price }))
];
const aggregators = [new Aggregator('D1', modules, { rule: 'majority' })];
const storage = new MemoryStorage();
const executors = [
  new Executor('E1', storage, async (decision) => ({ success: true })),
  new Executor('E2', storage, async (decision) => ({ success: true })),
  new Executor('E3', storage, async (decision) => ({ success: true }))
];
const scheduler = new Scheduler('master', storage);
await scheduler.start();
const result = await scheduler.dispatch('task_001', { price: 100 }, modules, aggregators, executors);

License
Use Case	License
Personal learning, research	✅ Free (AGPL v3)
Open source projects	✅ Free (AGPL v3)
Non-commercial internal use	✅ Free (AGPL v3)
Commercial use (any)	❌ Requires commercial license
Contact
Commercial license: cccwhatuneed@gmail.com
GitHub: @cccwhatuneed

## 与现有框架对比

> **声明**：以下对比基于公开资料和框架设计理念的分析，不保证100%绝对正确。建议读者根据实际需求自行验证。

| 维度 | URF（本框架） | Akka | Orleans | Dapr | Temporal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 设计模式 | 竞速+聚合 | Actor | 虚拟Actor | 边车+构建块 | 工作流 |
| 通用性 | 任意竞速决策场景 | Actor系统 | 分布式Actor | 微服务构建 | 长时工作流 |
| 唯一性保证 | ✅ 冠军兜底+幂等内置 | 需业务实现 | 需业务实现 | 需业务实现 | 需业务实现 |
| 自愈机制 | 同步点唯一+超时跳过 | 监督树 | 自动激活 | 重试+熔断 | 自动重试 |
| 同步点 | 唯一（决策器等所有模块） | 无明确设计 | 无明确设计 | 无明确设计 | 无明确设计 |
| 依赖 | 零 | JVM | .NET | K8s/边车 | 自建集群 |
| 部署 | 单文件 | 复杂 | 复杂 | 较复杂 | 复杂 |
| 学习曲线 | 极低 | 陡峭 | 中等 | 中等 | 中等 |

### 结论

本框架在以下维度具有独特优势：
- **通用性**：不限定场景，任何"输入→并行处理→决策→输出"模式都可使用
- **唯一性**：内置冠军机制和幂等去重，保证结果唯一
- **自愈性**：只有一个同步点，其他全异步，天然容错
- **极简**：单文件，零依赖，复制即用

其他框架各有其专业领域和优势，不在上述维度进行比较。
## Comparison with Existing Frameworks

> **Disclaimer**: The following comparison is based on publicly available information and framework design analysis. It is not guaranteed to be 100% accurate. Readers are encouraged to verify based on their actual needs.

| Dimension | URF (This Framework) | Akka | Orleans | Dapr | Temporal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Design Pattern | Race + Aggregation | Actor | Virtual Actor | Sidecar + Building Block | Workflow |
| Generality | Any race-decision scenario | Actor systems | Distributed Actors | Microservice building | Long-running workflows |
| Uniqueness Guarantee | ✅ Champion fallback + built-in idempotency | Business implementation required | Business implementation required | Business implementation required | Business implementation required |
| Self-Healing | Single sync point + timeout skip | Supervision tree | Automatic activation | Retry + circuit breaker | Automatic retry |
| Sync Point | Single (aggregator waits for all modules) | No explicit design | No explicit design | No explicit design | No explicit design |
| Dependencies | Zero | JVM | .NET | K8s/sidecar | Self-hosted cluster |
| Deployment | Single file | Complex | Complex | Relatively complex | Complex |
| Learning Curve | Very low | Steep | Medium | Medium | Medium |

### Conclusion

This framework has unique advantages in the following dimensions:

- **Generality**: No domain limitation. Any scenario following the "Input → Parallel Processing → Decision → Output" pattern can use it.
- **Uniqueness**: Built-in champion mechanism and idempotent deduplication guarantee result uniqueness.
- **Self-Healing**: Only one sync point, everything else async - naturally fault tolerant.
- **Simplicity**: Single file, zero dependencies, copy-paste and run.

Other frameworks have their own strengths and specialized domains. The above comparison is limited to the listed dimensions only.

✅ 可以从搜索结果验证的信息
框架	验证来源	确认内容
Akka	百度百科、Akka官方文档	Actor模型、故障监督（"let-it-crash"）、位置透明、持久化、高并发（每秒百万级Actor）
Dapr	Dapr官方文档	边车架构、多语言SDK、构建块（服务调用、状态管理、Actor、工作流、分布式锁等），Kubernetes/自托管部署
Orleans	CSDN博客（来源权威性中等）	虚拟Actor模型、Grain自动激活/回收/恢复、Silos容器
Proto.Actor	Go Packages官方文档	虚拟Actor模型、集群支持（Alpha版本）、高性能（100万+消息/秒）
Temporal	腾讯云开发者社区	工作流编排、自动重试、故障恢复、可重入流程
幂等性/持久执行	Manning分布式系统书籍	幂等性是可靠恢复的关键、日志式/状态式持久执行

📊 市面主流框架 vs 此框架
框架	通用性	唯一性	自愈性	你缺的/他有的
Proto.Actor	✅ Actor模型	❌ 不保证	✅ 有监督	快2倍，但复杂
Orleans	✅ 虚拟Actor	❌ 不保证	✅ 有自动恢复	易用，但性能较低
Akka	✅ Actor模型	❌ 不保证	✅ 监督树	Java生态，重
Dapr	✅ 边车模式	❌ 不保证	✅ 有重试	微软背书，复杂
Temporal	✅ 工作流	✅ 确定性执行	✅ 自动恢复	只解决工作流
此框架	✅ 任意场景	✅ 冠军兜底+幂等	✅ 同步点唯一+自动选主	轻量、无依赖
🎯 三性独特性
1. 通用性：任意场景
维度	此框架	其他框架
量化交易	✅	❌（需要定制）
API网关	✅	❌（需要定制）
爬虫系统	✅	❌（需要定制）
风控系统	✅	❌（需要定制）
AI推理	✅	❌（需要定制）
其他框架都是"领域框架"，解决特定问题。此"元框架"，解决所有问题。

2. 唯一性：冠军兜底 + 幂等
维度	此框架	其他框架
结果唯一	✅ 冠军机制	❌ 不保证（需要额外实现）
幂等去重	✅ 框架内置	❌ 需要业务代码实现
平票处理	✅ 自动hold	❌ 无
重复执行	✅ KV拦截	❌ 可能重复
其他框架不保证结果唯一，需要自己写逻辑。此框架内置了唯一性保证。

3. 自愈性：同步点唯一
维度	此框架	其他框架
超时跳过	✅	✅
自动选主	✅	✅
设计哲学	同步点唯一，其他全异步	复杂协调机制
自愈设计极简：只有一个同步点。其他框架需要复杂的超时、重试、选举逻辑。

💡 核心差异
对比	其他框架	此框架
设计目标	解决特定领域问题	解决任何领域的"竞速决策"问题
复杂度	高（Actor、工作流、边车）	低（只有Module、Aggregator、Executor）
结果唯一性	不保证	保证
幂等	需业务实现	内置
依赖	重（Kubernetes、数据库、消息队列）	零依赖
部署	复杂	单文件
✅ 结论
市面上没有同时具备：

通用性（任意场景）

唯一性（冠军兜底+幂等）

自愈性（同步点唯一）

的轻量级元框架。

Proto.Actor和Orleans性能好，但复杂、不保证唯一性。
Temporal保证唯一性，但只解决工作流。
框架三者兼具，且极简。