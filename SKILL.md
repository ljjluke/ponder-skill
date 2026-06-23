---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.34
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项, 不能只让用户打字。不准问废话。
产出: userRequest(最终确认的问题) + userProfile(问题画像)。

### Steps 2-9: 全部用 agent() 执行，无 Workflow

每步模式一样:

```
读 prompts/<name>.json → 替换动态参数 → agent(prompt, schema) → 展示成果
```

**每步结束后** — 清晰度评分（算法 + LLM 双重，LLM 无法操纵）:

```
1. node scripts/clarity-check.js '<outputJSON>' → algoScore(算法分)
2. agent("评估[步骤名]产出质量...", {is_clear, clarity_score, user_questions}) → llmScore
3. finalScore = algoScore×0.35 + llmScore×0.65
4. ≥0.55 → 下一步。 <0.55 → 逐个 AskUserQuestion(user_questions) → 重试该步
```

| # | 步骤 | 提示文件 | 目标(stepGoal) | 说明 |
|---|------|------|------|------|
| 2 | 神思 | prompts/shensi.json | 反直觉发现，突破常规思维 | 一次 agent() |
| 3 | 发散 | prompts/divergence.json | 6视角审视，覆盖不同维度 | 一次 agent() |
| 4 | 八卦镜 | prompts/bagua.json | 8维度评分，量化评判 | 一次 agent() |
| 5 | 方案 | prompts/plans.json | 生成5-8个可选方案 | 一次 agent() |
| 6 | 收敛 | prompts/converge.json | 淘汰弱方案，保留3-5个最优 | 一次 agent() |
| 7 | 推演 | — | 十天干推演各方案 | 每个幸存方案调一次 agent() |
| 8 | 辩论 | prompts/debate.json | 各方案互相反驳，排名推荐 | 一次 agent() |
| 9 | 综合 | prompts/synthesis.json | 最终结论+风险+未决事项 | 一次 agent() |

**推演(Step 7)**: 从收敛拿到 survivors，每个调一次 `agent("模拟方案: X...")`，收集所有结果传给辩论。

**不清爽处理**: clarity 返回 user_questions 后，逐个 AskUserQuestion 带选项提问，收集回答后重试该步。

### Step 10: 呈现
逐项展示每步的推理链和结论, 不能合并为一句。
用自然语言, 不展示 JSON/路径/Bash 命令。
