---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.18.0
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
产出: userRequest + userProfile。

### Steps 2-9: 全部用 agent() 执行

主线程步骤 — 读 prompts/<name>.json → 替换参数 → 查 top 3 历史 → agent(prompt, schema) → 展示

子 agent 步骤 — for each item: agent(input, {agentType}) → 立即展示全部返回内容（不可折叠） → 全部收集后汇总

| # | 步骤 | agent 类型 |
|---|------|-----------|
| 2 | 神思 | 主线程直行 |
| 3 | 发散 | 主线程直行 |
| 4 | 八卦镜(8维度) | dimension-evaluator ×8 |
| 5 | 方案(5-8个) | solution-generator ×N |
| 6 | 收敛 | 主线程直行 |
| 7 | 推演 | mcts-simulator ×N |
| 8 | 辩论 | debater ×N |
| 9 | 综合 | 主线程直行 |

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
