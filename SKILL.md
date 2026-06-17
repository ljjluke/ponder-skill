---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.14.0
license: MIT
---

# MCTS-TD

## Abstract Decision Principles

These four principles govern every decision the framework makes. They are not features — they are the framework's "way of thinking." All technical mechanisms (depth loop, self-evolution, step selection) must follow them.

### Wu Wei (无为) — Act without forcing

Feel the problem's resistance before reacting. Do not mechanically execute 9 steps:
- Simple problem → flow through (don't over-dig)
- Complex problem → settle deeper (naturally, not rushed)
- Uncertainty → circle back (like water finding its way around a rock)

**Technical application**: The depth loop does not trigger on "uncertainty" alone — it first senses information density. Low density → deepen. Enough density → flow through. No preset rounds.

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

## Output Rules

- **Everything the user sees must be in their language**. Chinese user → full Chinese output, including agent labels, progress messages, error messages.
- **Hide all technical operations**. No commands, JSON, Agent tasks, "Thought for Xs".
- **Final conclusion must be complete, readable, jargon-free**.
- **Every claim must have data support**. No "maybe" or "perhaps" — uncertainty triggers depth loop.

Only the analysis results are visible. All machinery is hidden.

---

## Flow

### Step 1: Requirements Divergence (you talk to user)

Self-examination (in your head, not output), then 3-layer interview, then 5-dimension profile.

**Self-examination** (do not output):
- What is my first reaction? What if the opposite is true?
- What default assumptions do I hold about this domain?
- If all first reactions are wrong, what might the truth be?

**3-layer interview**:
```
Layer 1: Align surface
"You said [paraphrase], correct? Anything to add?"
Layer 2: Dig motivation  
"Why are you focused on this now? What will you DO after this analysis?"
Layer 3: Constraints (AskUserQuestion with options)
```

**Profile output** (user's language, 5 dimensions + assumptions):
```
Timing=?/10    Resources=?/10    People=?/10
Rules=?/10     Essence=?/10
Assumptions: ...
```

⛔ User hasn't answered constraint questions → cannot enter pipeline.

---

### Steps 2-5: Analysis Pipeline + Adaptive Depth Loop

After profile is ready, enter the pipeline. **If result is uncertain, automatically deepen — until a data-supported judgment is possible**.

**Execution — user sees only a progress line, no technical details:**
```
📊 Analysis in progress...
```

**Step selection (Cook Ding's Ox principle)**: Do not mechanically execute all 9 steps:
1. Attention gate identifies the most uncertain dimensions (the "joints")
2. Only deepen unclear dimensions; skip those already clear
3. Feel the problem's texture — where information density is lowest, cut there

Run in background: read meta → memory recall | WebSearch → pipeline (step selection based on Cook Ding principle)

**Depth loop — uncertain result triggers automatic deepening**:

After pipeline returns, evaluate conclusion confidence before presenting.

```
① Evaluate:
   - Is the conclusion vague ("might need more data", "maybe", "uncertain")?
   - Are all direction scenarios converging to the same outcome? (uniformity = no conclusion)
   - Did self-check pass?
   - Does each claim have specific data support (numbers, sources, citations)?

② If uncertain (any condition unmet):
   → Evaluate information gain this round (Zhong Yong principle):
      - Round 1 uncertain → deepen naturally
      - Round 2+ uncertain → assess gain:
        Quality improved? → continue (positive gain)
        No change? → stop (more harms)
   → Display: "📊 Deepening analysis..."
   → Focused collection on specific gaps
   → Re-execute pipeline

③ Continue/stop determined by information gain trend, NOT fixed rounds:
   - Large gain (new key data, conflicts resolved) → continue
   - Small gain (similar conclusions) → naturally stop
   - Zero gain (data saturated) → stop, present current results

④ After stopping:
   → Clear with data support → present
   → Still uncertain but data saturated → honestly tell user the gaps
   → List conditions for re-analysis
```

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
