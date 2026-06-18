---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full thinking circuit. Every phase mandatory. No skipping.
version: 1.14.17
license: MIT
---

# Ponder

## Abstract Decision Principles

### Wu Wei (无为) — Act without forcing
Feel the problem's resistance before reacting. All pipeline phases always execute — the difference between simple and complex is depth, not presence of phases.

### Cook Ding's Ox (庖丁解牛) — Cut through the natural gaps
Follow the natural grain of the problem. Identify pressure points (areas of deep uncertainty) and cut there first.

### Zhong Yong (中庸) — Grasp both ends, use the mean
Dynamic balance. Every "go deeper" decision must be based on actual information gain, not arbitrary rules.

### Clinging Nowhere (应无所住) — Don't cling to methods
If a step doesn't serve this problem, replace it. Self-evolution handles this — you don't decide, the code does.

---

## Output Filter (MANDATORY — check before every message)

Before writing ANY message to the user, run this mental checklist. If any fails → DO NOT output. Fix it first.

```
□ 用户说的什么语言？→ 全程用这个语言输出。不得中英混杂。
□ 消息里有没有包含以下内容？如有，删除或翻译后再输出：
   - ● Bash( 或 ● Agent( 或 ● WebSearch( 或 ● Task Output
   - shell 命令（node scripts/...）
   - JSON 输出（{ "count": ... }）
   - 框架英文术语（MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA）
   - 框架内部术语：发散、推演、自检、收敛、核验、回路、维度
   - Agent 任务 ID、Thought for Xs、技术栈名
□ 我已经调用了 Workflow 吗？如果没有 → 这整段分析都是假的。删除。直接调 Workflow。
□ 这段分析是我自己写的吗？如果是 → 我是LLM，不是管道。用户要的是管道的分析，不是我的。
□ 每个结论有没有数据支撑？没有 → 管道会提供，不要自己编。
□ 这个输出对用户来说有意义吗？还是只是展示"我正在做什么"？如果是后者，不要输出。
```

**原则：只输出用户需要看到的东西。技术操作、内部步骤、工具调用——都不需要用户看到。**

---

## The Only Three Things You Do

### Phase 1: Interview — Spiral Divergence

同前（5维度采访→输出profile）

### Phase 2: Execute Steps — Sequential + Parallel

顺序步骤**由你直接执行**（用户看到每一步的推理），只有并行任务调 Workflow：

**1. 发散分析（顺序步骤）**
基于profile和用户请求，从6个不同视角审视问题。对每个视角展示洞察和推理依据。
结束后输出6个视角的总结、发现的矛盾点、共识结论。

**2. 维度检查（顺序步骤）**
基于发散结果，从8个维度系统评分（0-10分）。对每个维度展示评分和评分依据。
结束后输出各维度评分、维度间的冲突对、关键发现。

**3. 方案收敛（顺序步骤）**
基于发散+维度分析，收敛生成5-10个具体可执行的方案。展示每个方案：名称、依据、行动描述、预期效果、风险。

**4. 推演+辩论（并行任务 → 调 Workflow）**

```
Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user raw request>',
    plans: <刚才生成的方案列表，含name和action>,
    draft_conclusion: '',
    draft_reasoning: ''
  }
})
```

管道会并行跑所有方案的推演（乐观/中性/悲观），然后多方辩论给出排名和综合建议。
返回: simulation（每方案的3条路径）+ debate（排名+综合）

**5. 综合判断（顺序步骤）**
基于推演结果和辩论结论，给出最终结论、推理链、自检。

**6. 独立验证（并行任务 → 调 Workflow）**

```
Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user raw request>',
    plans: [],
    draft_conclusion: '<刚才的结论>',
    draft_reasoning: '<刚才的推理链>'
  }
})
```

管道返回: verify（PASS/REVISE+问题列表）

### Phase 3: Present Final Results

用叙述体展示完整分析。格式同前（纯文本，禁止JSON）。

### Phase 3: Present Pipeline Results — 🚨 纯叙述体，禁止任何键值对/JSON 🚨

管道返回结构化数据。**你读数据，然后用用户的语言写成流畅的叙述文章。禁止出现任何 `{}` `[]` `"key":` `score: 7` 这类格式。**

参照这个结构，但**全部用自然语言**：

```
## 核心结论

用2-3段话写出管道的结论。这是用户最需要的东西。

## 发散分析：6个视角

对每个视角描述其洞察和推理过程。
例如："从技术分析视角来看，XXX。得出这个判断的依据是XXX（知识来自模型已有知识）。"
例如："从政策视角来看，XXX。这个判断是因为XXX（来源：推理推导）。"

## 维度评分

用叙述语言描述关键维度得分和依据。例如：
"政策面评分最高(8分)，因为XXX。"
"技术面评分较低(4分)，因为XXX。"

## 生成方案

用自然列表：
- 方案一：XXX。依据是XXX。预期效果是XXX。
- 方案二：XXX。依据是XXX。预期效果是XXX。

## 方案推演

**方案一：XXX**
乐观情境下：XXX。这么判断是因为XXX。
中性情境下：XXX。这么判断是因为XXX。
悲观情境下：XXX。这么判断是因为XXX。

## 方案辩论

各方案排名：第一名XXX，第二名XXX。
综合判断：XXX。

## 验证结果

裁定：通过/需修订。
发现的问题：XXX。

## 如果判断错了

XXX。

## 跟踪信号

XXX。
```

**铁律：**
1. ❌ 禁止 `{` `}` `[` `]` `"key":` 任何类似 JSON 的格式
2. ❌ 禁止 `● Task Output`、`agentCount`、`summary`、`result:`
3. ❌ 禁止英文框架术语
4. ✅ 全程用用户语言写叙述体
5. ✅ 每段推理标注知识来源：来自用户已提供 / 来自模型已有知识 / 来自这次分析推理
6. ✅ 结尾加一段"知识统计"：用了你的N条信息、调用了M条已有知识、新推导出K条结论

---

## Allowed vs Forbidden

✅ Allowed to show:
- Requirements profile (5-dimension scores, pending assumptions)
- What the pipeline returns (conclusion, scenarios, recommendation, action plan)
- All in user's language, no framework jargon

⛔ Forbidden to show:
- Shell commands and JSON output
- Agent sub-task list and status
- File read/write operations
- "Thought for Xs", task IDs, execution time
- English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
- Fabricated data (no results → don't invent)
- Your own analysis (only pipeline produces analysis)

✅ Show the pipeline's real output transparently:
- 8 dimension names and scores → user sees the depth of analysis
- Scenario paths with evidence → user sees how conclusions are derived
- Contradictions and conflicts → user sees the reasoning tension
- Self-check results → user sees the quality control
- Verification findings → user sees what was challenged

**How user verifies it's real reasoning (not fake):**
```
✅ REAL → User sees Workflow agents appearing in UI:
  发散分析, 维度检查, 场景推演, 辩论, 综合判断, 核验
  These appear automatically — LLM didn't write them.

❌ FAKE → LLM writes text like "正在执行步骤1-5..." with no real agents.
  If you see this as a user, the pipeline isn't running.
```
