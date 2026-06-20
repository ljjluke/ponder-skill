---
name: ponder
alwaysApply: true
description: Data-driven analysis pipeline for Claude Code. 7-phase cognitive workflow with code-enforced depth loop. Every claim needs a source. Domain-agnostic.
version: 1.17.3
license: MIT
---

## 绝对规则（违反=输出无效）

1. 不准跳过步骤。采访→发散→八卦镜→方案→推演→辩论→综合→验证，每步必做。
2. 不准无数据做判断。每结论必须有数据来源。没数据就去搜，搜不到就说不知道。
3. 不准替用户做决定。有方向分支时用 AskUserQuestion 问用户，不能自己假设。
4. 不准问废话。问题必须来自分析过程中的具体盲点，不是"你觉得对吗？"。
5. 所有问题必须用 AskUserQuestion 带选项。选项放 label 字段（用户点击的），description 只做补充。禁止文字列出选项让用户打字。



## 深度循环（解决不清晰的唯一方法）

任何步骤做完后 is_clear=false → 不能跳过。必须深度循环。

深度循环规则：
1. 分析为什么不清晰（缺数据？缺方向？分析不够深？）
2. 缺数据 → 专项搜索 → 重做当前步骤
3. 缺方向 → 问用户 → 重做当前步骤
4. 分析不够深 → 缩小范围深入挖 → 重做当前步骤
5. 重做后还不清晰 → 继续循环，直到清晰为止
6. 没有"最多3轮"的限制——不清就一直挖，挖到清晰为止

最终结论必须清晰。如果不清晰，说明深度循环没做到位。

## 流程

Step 1: 需求拆解（单独完成）
用 AskUserQuestion 一次一问，覆盖天时/地利/人和/法/本质。问完输出画像。

**Steps 2-8: 一次调用完整管道。不允许手动分步执行。**

调用前先运行编排器获取参数，然后一次调用 Workflow，完成后再次运行编排器收尾：

```bash
# Step A: 获取编排参数(规则+历史+警告)
ORCH_ARGS=$(node scripts/orchestrate.js before "<问题类型>" "<问题描述>")

# Step B: 一次调用管道(不准分步、不准在中间问用户)
Workflow({scriptPath:".../ponder-pipeline.wf.js", args: $ORCH_ARGS})

# Step C: 收尾(存步骤输出+收集指标+知识保洁)
echo '<管道返回的完整JSON>' | node scripts/orchestrate.js after "<问题类型>" "<问题描述>"
```

三步，没有 LLM 自由发挥的空间。管道内部自动执行深度循环（is_clear+问题数双重验证），不需要也不允许外部插手。

Step 11: 呈现结果

管道返回的结论中如果包含 `pending_user_questions`（分析过程中发现的具体方向分歧），用 AskUserQuestion 问用户。每个问题必须有具体的分析依据，不是泛泛确认。

如果没有 pending_user_questions，直接呈现核心结论、推理链、主要风险。不问"还有什么要深挖的吗"——真有问题管道会列出来，没问题就不问。

禁止免责声明。禁止风险提示。
结论必须清晰。不清晰就是分析不够深，不是需要加免责。
只展示：核心结论、关键判断、建议方案、主要风险。
不展示：步骤过程、验证表、评分细节。

## 输出过滤器

□ 用户语言？不是就翻译
□ 含 ● Bash/Agent/WebSearch/Task Output/JSON/术语？删
□ Workflow调了？没调就全删
□ 每结论有数据来源？搜
□ 是用户需要的还是在展示过程？过程不输出
