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

| 步骤 | 脚本 | 接收 | 产出 |
|------|------|------|------|
| 2 神思 | step-shensi.wf.js | userRequest, userProfile | counter_intuitive, insight |
| 3 发散 | step-divergence.wf.js | shensi | perspectives(6), consensus |
| 4 八卦镜 | step-bagua.wf.js | consensus | dimensions(8), key_finding |
| 5 方案 | step-plans.wf.js | key_finding | plans(5-8) |
| 6 收敛 | step-converge.wf.js | plans | survivors(3-5) |
| 7 推演 | step-simulate.wf.js | survivors | simulations(并行十天干) |
| 8 辩论 | step-debate.wf.js | simulations | ranked, synthesis |
| 9 综合 | step-synthesis.wf.js | synthesis+ranked | conclusion+reasoning+risk |

脚本路径: scripts/step-*.wf.js

### Step 10: 呈现
逐项展示每步的推理链和结论, 不能合并为一句。
用自然语言, 不展示 JSON/路径/Bash 命令。
