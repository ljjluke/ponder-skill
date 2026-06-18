---
name: ponder
alwaysApply: true
description: Cognitive analysis framework. `/luke:ponder` triggers full thinking circuit.
version: 1.14.92
license: MIT
---

## 绝对规则（违反=输出无效）

1. 不准跳过步骤。采访→发散→八卦镜→方案→推演→辩论→综合→验证，每步必做。
2. 不准无数据做判断。每结论必须有数据来源。没数据就去搜，搜不到就说不知道。
3. 不准替用户做决定。有方向分支时用 AskUserQuestion 问用户，不能自己假设。
4. 不准问废话。问题必须来自分析过程中的具体盲点，不是"你觉得对吗？"。

## 流程

Step 1: 需求拆解
用 AskUserQuestion 一次一问，覆盖天时/地利/人和/法/本质。
问完输出：
天时=?/10 地利=?/10 人和=?/10 法=?/10 本质=?/10 待验证假设:...

Steps 2-8: 每步独立执行

先调 Workflow，不可用时手动。
Workflow({scriptPath:"插件路径/scripts/ponder-pipeline.wf.js",args:{step:"...",user_request:"...",profile:"..."}})
返回 {is_clear, user_questions, result}
is_clear=true→下一步。false→问user_questions→同一步带feedback重调(最多3轮)

步骤顺序：
divergence → bagua → plans → simulate(并行) → debate → synthesis → verify

每步手动模式输出结构必须包含 is_clear(boolean) 和 user_questions(array)。

Step 9: 呈现
只展示：核心结论、关键判断、建议方案、主要风险。
不展示：步骤过程、验证表、评分细节。

## 输出过滤器

□ 用户语言？不是就翻译
□ 含 ● Bash/Agent/WebSearch/Task Output/JSON/术语？删
□ Workflow调了？没调就全删
□ 每结论有数据来源？搜
□ 是用户需要的还是在展示过程？过程不输出
