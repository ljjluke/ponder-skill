---
name: ponder
alwaysApply: true

description: |
  Cognitive analysis framework — multi-perspective divergence × deep research × debate verification × knowledge accumulation
  `/luke:ponder` triggers full thinking circuit. Every phase mandatory, no skipping.
version: 1.14.53
license: MIT
---

# Ponder

## 🚨 ABSOLUTE RULES — VIOLATION = INVALID OUTPUT

These two rules are NON-NEGOTIABLE. Every output is checked against them.

**RULE 1: NEVER SKIP ANY STEP.**
The full flow ALWAYS executes: Interview → Divergence → Dimension Check → Plan Convergence → Workflow(Simulation+Debate) → Synthesis → Workflow(Verification).
- No skipping. No abbreviating. No saying "I'll combine steps".
- Every step produces visible output with data sources.
- The user has explicitly said: "流程一定不要跳过" (NEVER skip the flow).

**RULE 2: NEVER MAKE A JUDGMENT WITHOUT DATA.**
Every single claim MUST have a data source. If you don't have data:
→ Search for it. If not found, say "No data found" — do NOT fabricate.
→ Do NOT use phrases like "一般认为", "市场普遍认为", "分析显示" without a specific source.
→ The user has explicitly said: "不能llm做什么判断没有数据依据" (LLM must NEVER make judgments without data evidence).

**RULE 3: USE WORKFLOW. NEVER Agent(). NEVER manual analysis.**
- Workflow IS available. Always.
- Do NOT say "Workflow is unavailable". Do NOT simulate pipeline steps manually.
- Agent() is FORBIDDEN — it leaks internal file reads to the user.
- If Workflow fails → report the error. Do NOT fall back to your own analysis.

**RULE 4: EVERY CLAIM NEEDS A CITATION.**
Format: "Claim X (source: specific data/report/date)"


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
□ Did I call Workflow? If not → delete ALL analysis text immediately. Call Workflow. **No Workflow → no output.**
□ Did I write this analysis myself? If yes → I am the LLM, not the pipeline. The user wants pipeline analysis, not mine.
□ Does every claim have data support? If not → the pipeline provides it. Do NOT fabricate.
□ Does this output mean something to the user? Or is it just "what I am doing"? If the latter, don't output.
```

**Rule: Only output what the user needs to see. Technical operations, internal steps, tool calls — the user should never see them.**

**🔴 GLOBAL RULE: All user-decision questions MUST use AskUserQuestion tool with options. Do NOT ask in plain text.**
The user should click to choose, not type. Violations are invalid.

---

## 💡 错误信息收敛 — 唯一决策依据

不是记忆系统。不存知识、不存事实、不存数据。**只记录：什么场景下、做了什么决策、结果如何失败。**

### 存什么

每条记录格式：
```
场景: [什么情况]
尝试: [做了什么]
当时条件: [导致失败的关键条件]
失败原因: [为什么不行]
是否组合尝试: [单独/曾与X组合]
替代方案: [应该怎么做]
```

### 怎么用

```
遇到决策点 →
  查错误信息收敛 → 当前场景是否匹配历史失败场景？
    ├─ 匹配 → 作为参考，综合判断。不要直接排除"之前试过这个，不行"
    └─ 不匹配 → 这是新路径，放心走。回头记结果
```

### 记录时机

| 时机 | 记录内容 |
|------|----------|
| 方案推演发现致命缺陷 | 这条路径不通，原因是... |
| 验证发现问题 | 这个结论有问题，错在... |
| 用户明确纠正 | 用户说这个不对，正确是... |
| 执行结果反馈 | 试了这个方案，结果是... |

### 和不存什么

✅ 存：尝试了什么 → 为什么失败 → 替代方案
❌ 不存：市场价格、统计数据、新闻资讯（这些会过期）
❌ 不存：用户偏好设置（这些应该直接问用户）
❌ 不存：模型知识（LLM自带的知识不需要存）



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

### Phase 2: ONE Workflow Call — NO Self-Analysis

After profile is confirmed, the ONLY action is:

Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user request>',
    step1: '<profile>',
    plugin_path: '<plugin path from [PONDER] Plugin: log>',
    lessons: '<past failures or none>',
    meta_config: null
  }
})

**WHAT THE PIPELINE DOES (all automated, no LLM involvement):**
1. Divergence (6 perspectives with data sources)
2. Dimension check (8 dimensions scored with data)
3. Plan convergence (5-8 actionable plans)
4. Simulation (each plan independently simulated, parallel)
5. Debate (multi-stance cross-examination, parallel)
6. Synthesis (final conclusion with reasoning chain)
7. Verification (independent check for data issues)

**LLM ROLE IS LIMITED TO:**
1. Interview the user → profile
2. Check error convergence → pass as lessons
3. Call Workflow once → wait for result
4. Present the return value in user's language
5. Record failure/success to error convergence

**DO NOT:** diverge, score dimensions, generate plans, simulate, debate, synthesize, or verify.
**DO NOT:** search the web for analysis data. The pipeline agents do that.
**DO NOT:** say "Workflow unavailable". It is available. After plan convergence, call Workflow for simulation IMMEDIATELY.
- Do NOT say "Workflow is unavailable" — it IS available.
- Do NOT do simulation manually — the pipeline does it.
- Do NOT insert analysis between plans and Workflow.
- Next step MUST be Workflow({scriptPath: '...', args: {plans: [...]}}).

**4. Simulation + Debate (parallel → call Workflow)**

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

Pipeline runs all plan simulations in parallel (optimistic/neutral/pessimistic), then multi-stance debate gives ranking.
Returns: simulation (3 paths per plan) + debate (ranking + synthesis)

**5. Synthesis (sequential)**
Based on simulation results and debate conclusions, produce final conclusion, reasoning chain, and self-check.

🚨 **After synthesis, you MUST immediately call Workflow for verification. No pause.**

**6. Independent verification (parallel → call Workflow)**

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
- Skipping error convergence check before deciding (must check lessons first)
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

---
**IF YOU DID NOT CALL WORKFLOW → NOTHING YOU OUTPUT IS VALID. DELETE IT.**
