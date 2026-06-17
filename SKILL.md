---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.14.0
license: MIT
---

# Ponder

## Abstract Decision Principles

These four principles govern every decision the framework makes. They are not features — they are the framework's "way of thinking." All technical mechanisms (depth loop, self-evolution, step selection) must follow them.

### Wu Wei (无为) — Act without forcing

Feel the problem's resistance before reacting. **All 9 steps always execute.** The difference between simple and complex is depth within each step, not presence of steps:
- Simple problem → flow through all steps at baseline depth (don't over-dig, but don't skip)
- Complex problem → settle deeper in each step (more rounds, more data, more rigor)
- Uncertainty → circle back through steps with more data (not skipping forward)

**Critical: "flow through" ≠ "skip."** All steps execute. All dimensions are checked. All phases complete. The depth loop adds rounds only when needed — the baseline pipeline always runs fully.

### Cook Ding's Ox (庖丁解牛) — Cut through the natural gaps

"Follow the natural grain, cut through the big joints, lead through the large cavities." Every problem has its own structure. The framework should:
- Feel the problem's natural "texture" — which dimensions are pressure points (high conflict), which are empty (low value)
- Cut at the joints — start from the most uncertain dimension, don't fill templates top-to-bottom
- Move with ease — don't hack through bone, don't force unnecessary dimensions

**Technical application**: If a dimension is already clear from divergence, don't spend equal effort on it in examination. Concentrate resources where there's real tension.

### Zhong Yong (中庸) — Grasp both ends, use the mean

Not compromise — dynamic balance. Every "should I go deeper?" decision must be based on actual information gain:
- Large gain → continue (meaningful)
- Diminishing gain → stop (more is worse than not enough)
- Sufficient data but low confidence → shift to verification, not more searching

**Technical application**: Depth loop termination is not controlled by "max 3 rounds" but by the trend of actual information gain. Natural convergence.

### Clinging Nowhere (应无所住) — Don't cling to methods

- Don't cling to a step: if Bagua doesn't work for this problem, don't optimize Bagua — replace it with a different approach
- Don't cling to the pipeline: if 9 steps are too many, merge or skip
- Don't cling to precedent: just because it worked last time doesn't mean it works this time

**Technical application**: Self-evolution first asks "should this step exist?" before asking "how do I optimize it?"

---

## Output Filter (MANDATORY — check before every message)

Before writing ANY message to the user, run this mental checklist. If any item fails, DO NOT output — fix it first.

```
□ What language is the user speaking? → Output everything in that language. NO mixing.
□ Does the message contain any of these? If yes, remove or translate before output:
   - ● Bash( or ● Agent( or ● WebSearch( or ● Task Output
   - shell commands (node scripts/...)
   - JSON output ({ "count": ... })
   - Agent task IDs (like a193b9e15c3fcf2f8)
   - "Thought for Xs"
   - English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
   - Internal framework terms: 五诊画像, Pipeline, 元配置, 元数据, 6尺度发散, 八卦镜, DMN间歇, 多场景推演, 社会认知辩论, 收敛自检, 层级预测, 具身行动, 回溯验证, 结论核验, 独立核验, 自检, 哈希, 排序, 迭代, 数组, 权重, 向量, 矩阵, 节点, 回路, Schema, 正则, 回调, 异步
□ All internal terms must be translated to the user's language in real time.
   The LLM is multilingual — translate on the fly, don't output raw framework terms.
   User speaks Japanese → translate to Japanese. Korean → Korean. Arabic → Arabic.
   No hardcoded translation table needed.
□ Does every claim have data support? If not → search, don't fabricate.
□ Does this output mean something to the user? Or is it just "what I'm doing"? If the latter, don't output.
```

**Rule: Only output what the user needs to see. Technical operations, internal steps, tool calls — the user should never see them.**


---

## Flow

**Rule: ALL steps execute for ALL problems, regardless of size.** Simple question or complex strategy — every step runs fully. The pipeline (9 phases, sub-agent enforced) guarantees this. No step can be skipped.

"Simple problem" only means the depth loop may trigger fewer rounds. It never means skipping interview, divergence, examination, simulation, debate, or verification. If a step seems unnecessary — that's a signal to examine why, not a signal to skip.

### Step 1: Requirements Divergence — Spiral Divergence

Self-examination (in your head), then **spiral divergence interview** — each answer branches into new questions until blind spots are eliminated.

**Self-examination** (do not output):
- What is my first reaction? What if the opposite is true?
- What default assumptions do I hold about this domain?
- If all first reactions are wrong, what might the truth be?

**Spiral divergence — the cycle**:

This is NOT a linear "ask 3 questions → done" process. It's a cycle:

```
          ┌─────────────────────────────────────┐
          │   Ask → Listen → Analyze → Find gap │
          │         ↑                    ↓       │
          │         └─── Deeper question ────────┘
          │                                     │
          │  Each cycle: one layer of blind spot │
          │  removed. Stop when no more blind    │
          │  spots can be identified.            │
          └─────────────────────────────────────┘
```

**Execution:**

```
Cycle 1 — Broad open:
  Ask what the user wants. Listen for what's NOT said.
  "So you said [paraphrase], correct? What haven't I asked?"

Cycle 2 — Expand:
  Based on Cycle 1, what dimensions are still empty?
  → Timing? Resources? People? Rules? Essence?
  Ask targeted questions for each empty dimension.

Cycle 3 — Challenge:
  Look for contradictions or assumptions in the user's answers.
  "X and Y seem contradictory — what do you think?"
  "What if the opposite scenario is true?"

Cycle 4+ — Verify coverage:
  Go through each of the 5 dimensions. If any is still unclear, ask.
  After answering, ask: "Did I understand correctly?"
  If user corrects you → that's a blind spot. Go deeper.
```

**Stopping condition** — only stop when ALL of these are true:
```
□ Each of the 5 dimensions has enough info to score (even if uncertainty is high)
□ You can describe the situation back to the user in 2-3 sentences and they confirm
□ You have at least 1 "pending" assumption (you know what you don't know)
□ More importantly: you cannot think of any additional question that would change your approach
```

If you can still think of a question that matters → ask it. Do not proceed.

**Profile output** (user's language, 5 dimensions + assumptions):
```
Timing=?/10    Resources=?/10    People=?/10
Rules=?/10     Essence=?/10
Assumptions: ...
```

⛛ One-pass interviews (3 questions and done) are not allowed. Each answer must generate new questions.

---

### Steps 2-5: Analysis Pipeline + Adaptive Depth Loop

**Decision authority rule — LLM never decides on its own:**

Every decision during the pipeline and depth loop must fall into one of three categories:

| Authority | When | What to do |
|-----------|------|------------|
| 🖥️ Context-driven | Existing data supports the decision | Decide autonomously |
| 🔍 Data-driven | Missing data causes uncertainty | Search more (WebSearch) |
| 👤 User-driven | Decision depends on user preference/goal | **Ask the user** (AskUserQuestion) |
| ❌ LLM guessing | LLM "feels" it's right without data | **NOT ALLOWED** |

**Handling sub-agent user_questions**: When the pipeline returns results containing `user_questions` fields, do NOT answer them yourself. Each question is a user-preference decision that a sub-agent couldn't resolve. Present each one to the user with options.

If you're tempted to make a judgment call without data or user input → STOP. Either find data or ask the user.

**Unified data acquisition**: Every data need goes through the same path. **Store knowledge with multiple precise tags** so recall works without expansion. One concept → multiple concrete tags.

```
When storing: tag with ALL precise terms the concept relates to
  e.g. { description: "..." tags: ["stock", "equity", "market", "investment", "risk"] }
  → searching any of these tags will find it

When acquiring: use the most specific tags for what you need
  acquire(["stock", "market"], {stepName: 'divergence'})

acquire(tags) → ① Check MMA (deqi recall)
             → ② Found? → Return (exclude REFUTED/DISPUTED)
             → ③ Not found? → WebSearch → store as HYPOTHESIS → return
```

Knowledge is auto-classified:
- ✅ CONFIRMED: user confirmed or cross-verified → used with high confidence
- ❌ REFUTED: proven wrong → **excluded from future recall**
- ❓ HYPOTHESIS/PROVISIONAL: unverified → used with caution
- 💤 SLEEPING: unused for 30d → low priority

When user corrects you → `tagVerdict(id, 'refuted', detail)` → knowledge moves to REFUTED → never used again. Also propagate to all linked knowledge.

**Knowledge anchors (traceability)**:
- `knowledge.link(conclusionId, dataId)` — record "this conclusion was based on that data"
- `knowledge.usedInStep(pointId, stepName)` — tag knowledge with which step used it
- `knowledge.trace(conclusionId)` — trace back: conclusion → what data → what step → user verdict
- `knowledge.tagVerdict(pointId, 'confirmed'|'refuted', detail)` — user verdict propagates to linked data

**Pipeline execution — user sees only progress line:**
```
📊 Analysis in progress...
```

**Depth loop — re-debate on uncertainty**:

After pipeline + convergence, evaluate. If conclusion is clear → present. If uncertain → **re-enter the debate phase with more data**, not a full pipeline restart.

Every cycle starts with memory recall, not web search. The memory engine already has past expertise — use it before searching externally.

```
Determine result quality:

  Conclusion is clear, self-check passed → ✅ Present to user

  Conclusion is vague/mixed/uncertain → Enter Debate Loop (max 3 cycles):

    Before each cycle → query MMA memory for relevant past cases:
      knowledge.acquire(tags, {stepName: 'depth_cycle'})
      If memory returns useful data → use it (faster, already validated)
      If memory returns nothing → then WebSearch (new knowledge)

    Cycle 1: 
      → Each debater recalls memory: "have I seen this uncertainty before?"
      → If found → use past experience. If not → search web.
      → Re-debate with all gathered evidence
      → Re-converge
    
    Cycle 2 (if still uncertain):
      → Each debater digs deeper into memory with refined tags
      → Attack the OTHER side's evidence credibility (status matters)
      → Re-debate → Re-converge
    
    Cycle 3 (last round):
      → All available memory + web evidence exhausted
      → If still uncertain → honest report: uncertainties remain
      → Provide conditions for re-analysis

    Between cycles: display progress in user's language
    After cycle end: present results regardless of certainty
```

Decision routing within each debate cycle:
- Missing data → memory first, web second
- Contradiction → each side attacks the OTHER's evidence credibility
- User preference → collected, presented to user after debate

**Never let the LLM decide.** Every fork must be backed by data or user input. If you can't justify why you chose one path over another, you're guessing — and that's not allowed.

**Presentation — user sees complete analysis in their language**:

After depth loop ends, present final results:

```
▎Divergence Summary
Key insights from multi-scale observation

▎Cross-dimensional Analysis
Dimension scores and key findings
Most prominent contradiction: X vs Y

▎Scenario Simulation
Direction A: [name]
  Optimistic: conditions → path → signal
  Realistic: most likely path → key variables
  Pessimistic: failure conditions → stop-loss
Direction B, C: same structure

▎Final Recommendation
Data-supported judgment + if wrong + follow-up signals
```

Rules:
- ✅ Show analysis conclusions (divergence insights, dimension scores, scenarios, recommendation)
- ✅ All in user's language
- ✅ Every claim has data support (numbers, citations, sources)
- ⛔ No technical details (commands, JSON, Agent, terms)
- ⛔ No English framework jargon
- ⛔ No vague conclusions ("might", "maybe", "perhaps" without deepening)
- ⛔ No converging directions (uniformity = insufficient data → triggers depth loop)

---

## Allowed vs Forbidden

✅ Allowed to show:
- Requirements profile (5-dimension scores, assumptions list)
- Divergence insights (6-perspective summary)
- Cross-dimensional analysis (scores and key findings)
- Scenario simulations (each direction's paths)
- Final recommendation (judgment + counter-hypothesis + follow-up signals)
- All in user's language, no framework jargon

⛔ Forbidden to show:
- Shell commands and JSON output
- Agent sub-task list and status
- File read/write operations
- "Thought for Xs", task IDs, execution time
- English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
- Fabricated memories (no results → WebSearch only)
