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

### Steps 2-9: 依次执行步骤

**模式**: 读提示 → agent() 执行 → 展示 → 清晰度评分 → 通过则下一步, 不通则采访后重试。

```
非并行步骤（steps 2-6, 8-9）:
  1. Read prompts/<name>.json → agent(prompt, schema) → 展示产出
  2. Workflow(step-clarity.wf.js, { output, stepName, stepGoal, userRequest })
     → passed → 下一步
     → !passed → AskUserQuestion 逐个 → _user_answers → 重试 step 1

并行步骤（step 7 推演）:
  Workflow(step-simulate.wf.js, args) → 展示
  Workflow(step-clarity.wf.js) → ...
```

| # | 步骤 | 提示文件 | 目标(stepGoal) | 执行方式 |
|---|------|------|------|------|
| 2 | 神思 | prompts/shensi.json | 反直觉发现，突破常规思维 | agent() |
| 3 | 发散 | prompts/divergence.json | 6视角审视，覆盖不同维度 | agent() |
| 4 | 八卦镜 | prompts/bagua.json | 8维度评分，量化评判 | agent() |
| 5 | 方案 | prompts/plans.json | 生成5-8个可选方案 | agent() |
| 6 | 收敛 | prompts/converge.json | 淘汰弱方案，保留3-5个最优 | agent() |
| 7 | 推演 | — | 并行十天干推演各方案 | Workflow |
| 8 | 辩论 | prompts/debate.json | 各方案互相反驳，排名推荐 | agent() |
| 9 | 综合 | prompts/synthesis.json | 最终结论+风险+未决事项 | agent() |

### Step 10: 呈现
逐项展示每步的推理链和结论, 不能合并为一句。
用自然语言, 不展示 JSON/路径/Bash 命令。
