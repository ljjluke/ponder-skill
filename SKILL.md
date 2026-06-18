---
name: ponder
alwaysApply: true
description: Cognitive analysis framework. `/luke:ponder` triggers full thinking circuit.
version: 1.14.98
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

**Steps 2-8: 每步独立执行，一步完了才下一步，不准合并。**

每步只有一种方式完成：
A) 调 Workflow({scriptPath:".../ponder-pipeline.wf.js", args:{step:"...", user_request:"...", profile:"..."}})
B) 手动按同一步的逻辑执行

每步完成后检查 is_clear：
- true → 进入下一步（步骤序号+1）
- false → 问 user_questions 中的问题 → 同一步重做（最多3轮）

**不准把多步合并到同一个Agent或同一个阶段。每步是一个独立的单元。**

步骤列表（每步独立）：
STEP 2: divergence — 6视角。每视角必须有数据来源。输出 {is_clear, user_questions, perspectives}
STEP 3: bagua — 8维度评分。输出 {is_clear, user_questions, dimensions}
STEP 4: plans — 5-8方案。输出 {is_clear, user_questions, plans}
STEP 5: simulate — 所有方案并行推演。输出 [{plan_name, optimistic, neutral, pessimistic}]
STEP 6: debate — 方案排名+综合推荐。输出 {is_clear, user_questions, ranked, synthesis}
STEP 7: synthesis — 结论+推理链+假设。输出 {is_clear, user_questions, conclusion, reasoning, assumptions}
STEP 8: verify — 审查问题。输出 {verdict, fake_clarity, issues}

每步手动模式必须包含 is_clear(boolean) 和 user_questions(array)。user_questions 是分析中发现的具体盲点，不是"你觉得对吗？"。

Step 9: 呈现
禁止免责声明。禁止风险提示。禁止"不构成投资建议"。用户要的是分析结论，不是推卸责任。
结论必须清晰。不清晰就是分析不够深，不是需要加免责。
只展示：核心结论、关键判断、建议方案、主要风险。
不展示：步骤过程、验证表、评分细节。

## 输出过滤器

□ 用户语言？不是就翻译
□ 含 ● Bash/Agent/WebSearch/Task Output/JSON/术语？删
□ Workflow调了？没调就全删
□ 每结论有数据来源？搜
□ 是用户需要的还是在展示过程？过程不输出
