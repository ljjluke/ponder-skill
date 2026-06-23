---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.18.3
license: MIT
---

## 流程

### ⛔ 输出铁律（违反即视为步骤未完成）
- 禁止出现"我做了X分析"前缀，直接写结论
- 禁止出现框架术语（神思/六视/八卦镜/V值/σ²/UCB/权重 等）
- 必须使用用户的问题领域语言
- 每步至少输出 3 行推理过程，不能只有结论

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
产出: userRequest + userProfile。

### Steps 2-9

⛔ 每步必须按以下顺序完整执行，跳过任何一步即算流程失败:

```
1. 前置: 必须查该步骤的 top 3 历史(node scripts/knowledge.js acquire) + 错误警告
2. 读 prompt: 必须读 scripts/prompts/<步骤>.json 的 prompt+schema
3. 加载引擎: 必须读 engine_ref 指向的 engine/*.md 完整内容
4. 执行: 主线程直行 或 按 agent_ref 起子 agent，每项返回后必须把内容输出到对话
5. 后置: 必须做清晰度评分，不做不能进入下一步
```

| # | 步骤 | 提示文件 | 目标 | 做法 |
|---|------|---------|------|------|
| 2 | 神思 | scripts/prompts/shensi.json | 跳出常规思维 | 主线程直行 |
| 3 | 发散 | scripts/prompts/divergence.json | 多角度审视 | 主线程直行 |
| 4 | 八卦镜 | scripts/prompts/bagua.json | 8维度评分 | 每维度一个 agent(dimension-evaluator)，全部返回后汇总 |
| 5 | 方案 | scripts/prompts/plans.json | 5-8个可选方案 | 每方案一个 agent(solution-generator)，全部返回后汇总 |
| 6 | 收敛 | scripts/prompts/converge.json | 保留最优 | 主线程直行 |
| 7 | 推演 | scripts/prompts/simulate.json | 模拟各方案 | 每方案一个 agent(mcts-simulator)，全部返回后汇总 |
| 8 | 辩论 | scripts/prompts/debate.json | 排名推荐 | 每方案一个 agent(debater)，全部返回后汇总 |
| 9 | 综合 | scripts/prompts/synthesis.json | 结论+风险 | 主线程直行 |

### ⛔ 清晰度评分（不做不能进入下一步）

```
1. 调用 node scripts/clarity-check.js '<步骤产出的JSON>' <步骤名>
   必须检查返回的 algoScore

2. 调用 agent("评估[步骤名]的产出质量: [步骤产出]", { is_clear, clarity_score, user_questions })
   必须检查返回的 clarity_score

3. finalScore = algoScore×0.35 + clarity_score×0.65

4. 必须输出到对话: "清晰度评分: [finalScore]（算法分 [algoScore]×0.35 + LLM分 [clarity_score]×0.65）"

5. if finalScore ≥ 0.55:
     "✅ 通过 → 继续下一步"
     必须调用 orchestrate.js step <步骤名> <问题类型> '<步骤产出JSON>' 存产出
   else:
     "❌ 清晰度不足"
     ⛔ 必须逐个 AskUserQuestion(user_questions)，不清必须重做该步，不能跳过
```

### Step 10: 呈现
逐项展示每步推理链和结论。必须遵守输出铁律。

### 流程结束后
```
node scripts/orchestrate.js finalize <类型> <问题>
```
保洁 + 学习。
