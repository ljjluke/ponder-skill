---
name: ponder
alwaysApply: true
description: 8-step sequential cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.18.0
license: MIT
---

## 流程

### ⚠️ 输出转义规则（全流程强制）

框架内部使用的所有概念术语，**展示给用户时必须翻译成用户领域语言**：

```
内部概念 → 用户语言（举例）
─────────────────────────────
神思       → 不出现，直接说"一个反直觉的发现"
发散(六视) → 不出现，直接说"从X角度看..."
八卦镜(8维) → 不出现，直接说"从Y维度评估..."
十天干推演 → 不出现，直接说"各阶段的达成度评估"
V值/σ²    → 不出现，后台只用不展示
步骤编号   → 不出现，用户不关心第几步

写作铁律:
1. 不要出现"我做了X分析"前缀 → 直接写结论
2. 不要出现用户看不懂的术语 → V值/权重/UCB/置信度全都不展示
3. 不要出现步骤编号 → 用户不关心这是第几步
4. 每步至少 3 行，让用户感觉认真分析了
5. 要让用户能用自己经验验证推理路径
6. 语言风格和领域词汇贴合用户的问题领域
```

### 流程开始前
```
node scripts/orchestrate.js before <问题类型> <问题描述>
```
输出: `{ applied_rules, step_history, error_warnings, profile }`

- **step_history**: 每步 20 条候选，自己从中选 top 3 最相关的注入 prompt 上下文
- **error_warnings**: 该类型问题过去犯过的错，注入每步 prompt 预防重复踩坑

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项, 不能只让用户打字。不准问废话。
产出: userRequest(最终确认的问题) + userProfile(问题画像)。

### Steps 2-9: 全部用 agent() 执行

每步模式一样（主线程步骤）:
```
读 prompts/<name>.json → 替换动态参数(注入 top 3 历史+错误警告)
→ agent(prompt, schema) → 展示成果
```

子 agent 步骤:
```
for each item: agent(dynamic_prompt + 该步骤的 top 3 历史)
→ 收集所有结果 → 整合展示
```

**每步结束后** — 清晰度评分 + 增量存储:
```
1. node scripts/clarity-check.js '<outputJSON>' → algoScore(算法分)
2. agent("评估[步骤名]产出质量...", {is_clear, clarity_score, user_questions}) → llmScore
3. finalScore = algoScore×0.35 + llmScore×0.65
4. ≥0.55 → node scripts/orchestrate.js step <步骤名> <问题类型> '<输出JSON>'
   <0.55 → 逐个 AskUserQuestion(user_questions) → 重试该步
```

| # | 步骤 | 提示文件 | 目标 | 执行方式 |
|---|------|---------|------|---------|
| 2 | 神思 | prompts/shensi.json | 反直觉发现，突破常规思维 | 主线程直接执行 |
| 3 | 发散 | prompts/divergence.json | 6视角审视，覆盖不同维度 | 主线程直接执行 |
| 4 | 八卦镜 | prompts/bagua.json | 8维度评分，量化评判 | 8个子 agent 并行，每维度一个 |
| 5 | 方案 | prompts/plans.json | 生成5-8个可选方案 | N个子 agent 并行，每方案一个 |
| 6 | 收敛 | prompts/converge.json | 淘汰弱方案，保留3-5个最优 | 主线程直接执行 |
| 7 | 推演 | — | 十天干推演各方案 | 每幸存方案一个子 agent |
| 8 | 辩论 | prompts/debate.json | 各方案互相反驳，排名推荐 | 每方案一个子 agent |
| 9 | 综合 | prompts/synthesis.json | 最终结论+风险+未决事项 | 主线程直接执行 |

**Step 2-3（主线程）**: 读 prompts/ 下的 JSON → 自己按 schema 思考产出 → 按输出转义规则展示。

**Step 4（八卦镜 ×8）**: 8 个维度各自独立，每维度起一个 agent 评分。主线程收集完 8 个结果后统一展示。展示时把 8 个维度的评分转义为领域描述（例如技术问题说"架构合理性 7/10"、医疗问题说"治疗方案安全性 7/10"）。

**Step 5（方案 ×5-8）**: 每个 agent 生成一个方案方向，prompt 里告知"已有哪些方向"，避免重复。主线程收集后去重合并展示。方案命名用描述性名称（如"快速方案"、"稳妥方案"、"分期方案"），不用框架编号。

**Step 6（收敛）**: 主线程 agent()，因为需要同时看所有方案做全局比较淘汰。展示时用对比表格，按领域语言描述强弱项。

**Step 7（推演 ×N）**: 从收敛拿到 survivors，每个调一次 agent("模拟方案: X..."，十天干框架)。收集所有结果传给辩论。展示时不出现十天干术语，只说"该方案在规划、执行、品质等阶段的评估结果"。

**Step 8（辩论 ×N）**: 每方案一个 agent 构建立场（立论+反驳其他方案）。主线程收集后整合排名。展示时用"方案A的优势在于...，但方案B指出..."的自然辩论形式。

**Step 9（综合）**: 主线程 agent()，整合推演+辩论结果出最终结论。展示结论、推理过程、风险点，以及需要用户确认的事项。

### Step 10: 呈现
逐项展示每步的推理链和结论, 不能合并为一句。

输出要求:
- 用自然语言，语言风格和领域词汇贴合用户的问题领域
- 不展示 JSON/路径/Bash 命令/步骤编号
- 不出现框架术语（神思/六视/八卦镜/十天干/V值/σ²/UCB 等）
- 每步的推理链要完整，不能只有结论没有过程
- 对比数据用表格，方案命名用描述性名称
- 最终结论要引用用户原话作为依据

### 流程结束后
```
node scripts/orchestrate.js finalize <问题类型> <问题描述>
```
知识保洁 + 权重学习 + 进化分析。自动完成，不需要等。
