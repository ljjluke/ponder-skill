---
name: ponder
alwaysApply: true
description: Data-driven analysis pipeline for Claude Code. 7-phase cognitive workflow with code-enforced depth loop. Every claim needs a source. Domain-agnostic.
version: 1.15.3
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

只有一种方式：一次调用 Workflow 执行全部 7 步。

调用前先加载规则和历史：

```bash
# 检测规则
RULES=$(node scripts/evolve.js get-rules "<问题类型>" "divergence")
# 加载历史积累（取20个候选，管道内LLM筛选top8）
DIV_HISTORY=$(node -e "JSON.stringify(require('./scripts/knowledge').recallStepHistory('divergence', '<问题类型>', {query:'<问题描述>'}).map(e=>({content:e.content, tags:e.tags})))")
DIM_HISTORY=$(node -e "JSON.stringify(require('./scripts/knowledge').recallStepHistory('dimension', '<问题类型>', {query:'<问题描述>'}).map(e=>({content:e.content, tags:e.tags})))")
```

然后一次调用管道（不准分步）：

```
Workflow({scriptPath:".../ponder-pipeline.wf.js", args:{
  user_request: "...", 
  profile: "...",
  applied_rules: $RULES,
  step_history: { divergence: $DIV_HISTORY, dimension: $DIM_HISTORY },
  error_warnings: {}
}})
```

管道内部自动执行深度循环（is_clear+问题数双重验证），不需要也不允许外部插手。

Step 9: 存储步骤输出（自动执行）

管道返回后，取出 `_step_outputs` 字段，对每一步执行存储：

```bash
# 每个步骤的输出存进MMA，供未来同类问题参考
node -e "
const { storeStepOutput, recallStepHistory } = require('./scripts/knowledge');
const outputs = <管道返回的_step_outputs>;  // 从管道返回值中取
const qType = '<当前问题类型>';
const req = '<当前问题描述>';
for (const [step, data] of Object.entries(outputs)) {
  if (data) storeStepOutput(step, qType, JSON.stringify(data), {tags:[qType], user_request: req});
}
"
```

这样每次管道运行后，所有7步的输出都存进 MMA。下次同类问题时通过 `recallStepHistory` 加载，LLM筛选 top 8 注入对应步骤的 prompt。

Step 10: 收集运行指标

```bash
cat > /tmp/_last_pipeline_output.json << 'EOF'
<这里放管道返回的完整JSON>
EOF
node scripts/pipeline-metrics.js collect /tmp/_last_pipeline_output.json
```

不改变管道结果，只记录指标到日志。

Step 11: 直接呈现结果

管道已经完成了所有推理。直接输出核心结论、推理链、主要风险。
不问"还有什么要深挖的吗"，不把盲点推给用户判断。

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
