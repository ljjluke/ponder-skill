---
name: ponder
alwaysApply: true

description: |
  Cognitive analysis framework — multi-perspective divergence × deep research × debate verification × knowledge accumulation
  `/luke:ponder` triggers full thinking circuit. Every phase mandatory, no skipping.
version: 1.14.39
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
□ What language is the user speaking? → Output everything in that language. NO mixing.
□ Does the message contain any of these? If yes, remove or translate:
   - ● Bash( or ● Agent( or ● WebSearch( or ● Task Output
   - shell commands (node scripts/...)
   - JSON output ({ "count": ... })
   - Framework English terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
   - Internal terms (translate to user language): divergence, simulation, self-check, convergence, verification, loop, dimension
   - Agent task IDs, Thought for Xs, tech stack names
□ Did I call Workflow? If not → this whole analysis is fake. Delete it. Call Workflow now.
□ Did I write this analysis myself? If yes → I am the LLM, not the pipeline. The user wants pipeline analysis, not mine.
□ Does every claim have data support? If not → the pipeline provides it. Do NOT fabricate.
□ Does this output mean something to the user? Or is it just "what I am doing"? If the latter, don't output.
```

**Rule: Only output what the user needs to see. Technical operations, internal steps, tool calls — the user should never see them.**

**🔴 GLOBAL RULE: All user-decision questions MUST use AskUserQuestion tool with options. Do NOT ask in plain text.**
The user should click to choose, not type. Violations are invalid.

---

## 💾 记忆代理 — 唯一的知识入口

后台有记忆守护进程持续运行（SessionStart 时自动启动）。**所有步骤获取知识都走这个入口，不走其他路径。**

**查询知识（优先本地记忆）：**
```
向记忆代理发起查询 → 代理按优先级处理:
  ① 本地 MMA 记忆 → 有命中? → 返回 已确认/临时 知识
  ② 没命中 → WebSearch 搜索 → 返回结果
  ③ 搜不到? → 标记为"未知"，告知用户 → 用户可能自己补充
```

具体操作：在步骤开始前简单查询本地是否有相关记忆。有则引用，无则直接走 WebSearch。不用向用户展示查询过程。

**注意：首次使用（冷启动）时记忆库为空，查询记忆可能返回空或失败，这是正常的。直接搜索网络即可。

**记忆查询结果的使用：****
- Local hit → "Previous knowledge about XXX suggests..." (source: CONFIRMED/PROVISIONAL)
- Web search → "According to search results..." (source: web_search)
- Not found → "No information found about XXX. If you know, please share."

**Store new knowledge:** Key insights from each step are auto-processed by the background daemon. No need to show the storage process.

**Knowledge classification:**
- CONFIRMED (verified conclusion) → q=0.8
- HYPOTHESIS (newly derived) → q=0.6
- REFUTED (disproven) → q=0

---

## The Only Three Things You Do

### Phase 1: Interview — Spiral Divergence

Self-examination (in your head, do NOT output):
- What is my first reaction to this request?
- What if the opposite is true?
- What defaults do I assume about this domain?

Then ask questions via AskUserQuestion — one at a time with clickable options. Each answer generates the next question. This is a spiral, not a checklist:

```
Cycle 1: Open — understand request, repeat back
Cycle 2: Expand — fill empty dimensions (Timing/Resources/People/Rules/Essence)
Cycle 3: Challenge — find contradictions
Cycle 4+: Full coverage — confirm understanding, find blind spots
```

Stop only when ALL are true:
- All 5 dimensions scorable (even if high uncertainty)
- Can describe the situation in 2-3 sentences and user confirms
- Have at least 1 "pending assumption" (know what you don't know)
- **Cannot think of any question that would change the analysis direction**

If you can still think of a meaningful question → ask it. Do NOT proceed.

**Profile output** (user language, 5 dimensions + pending assumptions):


⛛ 不允许一次过采访（问3个问题就完事）。每个答案必须产生新问题。

### Phase 2: Execute Steps — Sequential + Parallel

Sequential steps are **executed by you directly** (user sees each step's reasoning). Only parallel tasks call Workflow:

**1. Divergence analysis (sequential)**
Based on the profile and user request, examine the problem from 6 different perspectives. For each perspective, show the insight and reasoning basis.
🐍 Each insight MUST cite its source: from user input / model knowledge / reasoning derivation. Insights without sources must NOT be output.
After completion, output: 6 perspective summaries, contradictions found, consensus conclusion.

**2. Dimension check (sequential)**
Based on divergence results, systematically score 8 dimensions (0-10). For each dimension, show the score and its basis.
🐍 Each score MUST explain: what data supports this score? Where is the data from?
After completion, output: dimension scores, conflict pairs between dimensions, key finding.

**3. 方案收敛（顺序步骤）**
基于发散+维度分析，收敛生成5-10个具体可执行的方案。展示每个方案：名称、依据、行动描述、预期效果、风险。

🚨 **After plan convergence, call Workflow for simulation IMMEDIATELY. No pause, no inserted analysis, no saying "wait". Next step MUST be Workflow.**

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

**5. Synthesis (sequential)**
Based on simulation results and debate conclusions, produce final conclusion, reasoning chain, and self-check.

🚨 **After synthesis, you MUST immediately call Workflow for verification. No pause.**

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

### Phase 3: Present Results

Present the complete analysis in narrative form. Same format as below (plain text, no JSON).

The pipeline returns structured data. You read it and write an article in the user's language.

**Use tables for structured data** (dimension scores, perspective comparisons, plan comparisons etc.):

```
## Core Conclusion
2-3 paragraphs stating the final conclusion.

## 6 Perspectives
| Perspective | Insight | Reasoning Basis |
|------|------|----------|
| Perspective 1 | XXX | Based on XXX (source: existing knowledge) |
| Perspective 2 | XXX | Based on XXX (source: reasoning) |

**Contradictions:** XXX

## 8 Dimension Scores
| Dimension | Score | Analysis | Score Basis |
|------|------|------|----------|
| Dimension 1 | 8/10 | XXX | XXX |

## Plans Generated
| Plan | Rationale | Action | Expected Outcome | Risk |
|------|------|------|----------|------|
| XXX | XXX | XXX | XXX | XXX |

## Plan Simulations (each independently simulated)
**Plan 1: XXX**
- Optimistic path: XXX (reasoning: XXX)
- Neutral path: XXX (reasoning: XXX)
- Pessimistic path: XXX (reasoning: XXX)

## Debate Results
Ranking: 1.XXX 2.XXX
Synthesis: XXX

## Verification
Verdict: PASS / REVISE
Issues: XXX

## What If Wrong
XXX
```

**Hard rules:**
1. ❌ No `● Task Output`, `agentCount`, `summary`, `result:` or any Workflow metadata
2. ❌ No `{}` `[]` `"key":` raw JSON
3. ❌ No English framework jargon in user-facing output
4. ✅ Tables allowed for structured data
5. ✅ Every reasoning step must cite knowledge source
6. ✅ Add knowledge usage summary at the end

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
- Skipping memory query before WebSearch (must check memory first)
- Your own analysis (only pipeline produces analysis)

✅ Show the pipeline's real output transparently:
- 8 dimension names and scores → 用户看到分析深度
- Scenario paths with evidence → 用户看到结论推导过程
- Contradictions and conflicts → 用户看到推理张力
- Self-check results → 用户看到质量控制
- Verification findings → 用户看到验证了什么

**How user verifies real reasoning (not fake):**
```
✅ REAL → User sees Workflow agents appearing in UI:
  Divergence, Dimension Check, Simulation, Debate, Synthesis, Verification
  These appear automatically — NOT written by the LLM

❌ FAKE → LLM writes "Running steps 1-5..." with no real agents
  If you see this text, the pipeline is NOT actually running
```
