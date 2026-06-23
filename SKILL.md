---
name: ponder
alwaysApply: true
description: "8-step structured reasoning. Domain-agnostic. Each step: read prompt → load engine docs → execute → present results."
version: 1.18.8
license: MIT
---

## 流程

⛔ 禁止做任何环境检查、配置验证、文件扫描等与用户问题无关的操作。直接开始。

### 沟通需求
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
沟通完成后用一两句话总结用户需求（不单独展示画像表格）。

### 分析阶段

⛔ 所有输出中不允许出现框架内部术语，用自然语言表达。
⛔ 不允许输出"正在等待"、"让我检查"、"等待中"等无关状态消息。只输出结论和评分。
⛔ 每步必须按以下顺序完整执行。读文件用 Read 工具，禁止 bash echo:

```
（内部执行顺序，不输出步骤编号和标签）
1. 查历史 + 错误警告
2. 读 JSON prompt
3. 读引擎文档
4. 主线程直行或起子 agent，产出逐条展示到对话
5. orchestrate.js step 存产出（后台）
```

| 阶段 | 提示文件 | 目标 | 做法 |
|-----|---------|------|------|
| 神思 | scripts/prompts/shensi.json | 跳出常规思维 | 主线程直行 |
| 发散 | scripts/prompts/divergence.json | 多角度审视 | 主线程直行 |
| 八卦镜 | scripts/prompts/bagua.json | 8维度评分 | 每维度一个 agent(dimension-evaluator)，全部返回后汇总 |
| 方案 | scripts/prompts/plans.json | 5-10个可选方案 | 每方案一个 agent(solution-generator)，全部返回后汇总 |
| 收敛 | scripts/prompts/converge.json | 保留最优 | 主线程直行 |
| 推演 | scripts/prompts/simulate.json | 模拟各方案 | 每方案一个 agent(mcts-simulator)，全部返回后汇总 |
| 辩论 | scripts/prompts/debate.json | 排名推荐 | 每方案立论→汇总→攻击评估→抗压排名 |
| 综合 | scripts/prompts/synthesis.json | 结论+风险 | 主线程直行 |

### 呈现结论
用自然语言串联各阶段推理，不要出现"第X步"、"现在进入XX阶段"等机械标签。整体读起来像一个人在讲述分析思路。

格式要求:
- 评分和对比数据用表格展示，配上评价性文字，不要单列数字
- 关键亮点用 ⭐ 或 💡 等图标标注，吸引注意
- 风险用 ⚠️ 标注，结论用 ✅ 标注
- 不允许出现 JSON、文件路径、Bash 命令
- 不允许出现框架内部术语
- 每段至少 2-3 句话，不能只是要点罗列

### 流程结束后
```
node scripts/orchestrate.js finalize <类型> <问题>
```
保洁 + 学习。
