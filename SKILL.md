---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.18.2
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
产出: userRequest + userProfile。

### Steps 2-9

所有步骤由主线程执行。步骤内如果有多个独立项，每项起一个子 agent，每项返回后把内容完整输出到对话，都返回后再汇总。

| # | 步骤 | 做法 |
|---|------|------|
| 2 | 神思 | 主线程自己思考，直接输出 |
| 3 | 发散 | 主线程自己思考，直接输出 |
| 4 | 八卦镜(8维度) | 每维度一个 agent(dimension-evaluator)，全部返回后汇总 |
| 5 | 方案(5-8个) | 每方案一个 agent(solution-generator)，全部返回后汇总 |
| 6 | 收敛 | 主线程自己思考，直接输出 |
| 7 | 推演 | 每方案一个 agent(mcts-simulator)，全部返回后汇总 |
| 8 | 辩论 | 每方案一个 agent(debater)，全部返回后汇总 |
| 9 | 综合 | 主线程自己思考，直接输出 |

每步后 — 清晰度评分，展示分数和结论:
```
clarity-check.js → algoScore
agent("评估质量...", schema) → llmScore
综合 = algo×0.35 + llm×0.65
展示: "清晰度 X.XX（算法 X.XX ×0.35 + LLM X.XX ×0.65）"
≥0.55 → "✅ 通过" → orchestrate.js step + 继续
<0.55 → "❌ 重试" → 追问 → 重做该步
```

### Step 10: 呈现
逐项展示每步推理链和结论。用自然语言，贴合用户领域，不出现框架术语。

### 流程结束后
```
node scripts/orchestrate.js finalize <类型> <问题>
```
保洁 + 学习。
