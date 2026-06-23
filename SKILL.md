---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.33
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项, 不能只让用户打字。不准问废话。
产出: userRequest(最终确认的问题) + userProfile(问题画像)。

### Steps 2-9: 依次执行步骤

对每步: Workflow({ scriptPath, args }). 如果 _aborted=true → 展示 user_questions(带选项), 收集回答后重试。每步产出传给下一步。

**每步结束后** → Workflow({ scriptPath: "step-clarity.wf.js", args: { output, stepName, stepGoal, userRequest } })
- `passed=true` → 进入下一步
- `passed=false` → 逐个 AskUserQuestion(user_questions) → 收集完回答 → 重试同一步

| 步骤 | 脚本 | 目标(stepGoal) | 接收 | 产出 |
|------|------|------|------|------|
| 2 神思 | step-shensi.wf.js | 反直觉发现，突破常规思维 | userRequest, userProfile | counter_intuitive, insight |
| 3 发散 | step-divergence.wf.js | 6视角审视，覆盖不同维度 | shensi | perspectives(6), consensus |
| 4 八卦镜 | step-bagua.wf.js | 8维度评分，量化评判 | consensus | dimensions(8), key_finding |
| 5 方案 | step-plans.wf.js | 生成5-8个可选方案 | key_finding | plans(5-8) |
| 6 收敛 | step-converge.wf.js | 淘汰弱方案，保留3-5个最优 | plans | survivors(3-5) |
| 7 推演 | step-simulate.wf.js | 并行十天干推演各方案 | survivors | simulations(并行十天干) |
| 8 辩论 | step-debate.wf.js | 各方案互相反驳，排名推荐 | simulations | ranked, synthesis |
| 9 综合 | step-synthesis.wf.js | 最终结论+风险+未决事项 | synthesis+ranked | conclusion+reasoning+risk |

脚本路径: scripts/step-*.wf.js

### Step 10: 呈现
逐项展示每步的推理链和结论, 不能合并为一句。
用自然语言, 不展示 JSON/路径/Bash 命令。
