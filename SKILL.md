---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.14.0
license: MIT
---

# MCTS-TD Thinking Framework — Your Local Cognitive Infant

> **`/luke:ponder` = Like teaching a baby: you use it, it grows, it learns your patterns.**
> Step 1 (you do, interactive) → Pipeline (Workflow-enforced) → Self-evolve

## ⚙️ Architecture Philosophy

This framework starts like an infant — a minimal cognitive architecture with the capacity to grow. Every time you use it, it learns:
- **Your thinking patterns** (via MMA memory — what types of analysis you prefer)
- **What works and what doesn't** (via free energy — which pipeline steps produce reliable results)
- **How to change itself** (via data-driven evolution — mutations based on historical success, not LLM guesses)

It is NOT trained on other users' data. It grows from YOUR usage, locally, like a brain developing through experience.

**Pipeline enforcement:**
- Each step runs as an independent sub-agent, output constrained by JSON Schema
- Previous step must complete before next starts (code control, not prompt)
- Sub-agents cannot skip, merge, or shortcut steps

---

## Flow

### Step 1: Requirements Divergence (You do this)

**Entry**: Raw user request
**Core principle**: The user says what they "want" — you need to find what they "actually need." Insufficient divergence at the start makes everything downstream useless.

#### 1a. Self-Examination — Where have you already judged?

When you first see the request, pause. Your brain has already auto-categorized it: tech problem / investment question / career choice... but that category itself might be wrong.

```
① What is my first reaction to this request?
   → Write it down. Then ask: what if the user means the opposite?

② What default assumptions do I hold about this domain?
   → E.g.: user says "analyze [this domain]" → you assume their role?
     Maybe they're a practitioner, a decision-maker, or just curious?

③ Do I have a preconception of "the answer is probably X"?
   → Having it is normal. Label it. Then deliberately seek disconfirming evidence.

④ If ALL my first reactions are wrong, what might the truth be?
   → List at least 3 counter-hypotheses
```

This step happens in your head. No need to output it. But you MUST do it.

#### 1b. Deep Interview — Don't just ask "what", ask "why"

Question the user in a spiral — three layers of depth.

**Layer 1: Align surface needs**
```
"You said [paraphrase], correct? Anything to add?"
"What have you tried before?"
```

**Layer 2: Dig motivation and context**
```
"Why are you focused on this now? What triggered this?"
"What will you DO after this analysis?" ← Critical! The user's next action determines the analysis purpose
"If you already had the answer, what would it look like?" ← Let the user describe their "answer image"
```

**Layer 3: Challenge constraints**
```
Ask 2-3 constraint questions (use AskUserQuestion with options) that specifically challenge the user's default assumptions.
Examples:
- "You said analyze [this domain] — are you looking at the big picture, specific details, or a particular angle?"
- "Are you approaching this as a practitioner, decision-maker, or external observer? This affects granularity."
- "After the analysis, what decision will it inform or what action will it lead to?"
```

⛔ Do NOT accept the first layer of answers and stop. "I want to analyze [this domain]" may hide a concrete decision need underneath. Keep digging.

#### 1c. Profile Synthesis

Output a five-dimension (五診/Wuzhen) requirement profile. Each dimension must include a confidence rating and your assumptions.

```
天(Tian/Timing)= ?/10 — timing, rhythm, decision window    [Confidence: High/Med/Low]
地(Di/Resources)= ?/10 — available conditions, constraints   [Confidence: High/Med/Low]
人(Ren/People)= ?/10 — role, stake, stakeholders            [Confidence: High/Med/Low]
法(Fa/Rules)= ?/10 — rules, boundaries, prohibitions        [Confidence: High/Med/Low]
物(Wu/Essence)= ?/10 — core goal, success criteria          [Confidence: High/Med/Low]

Assumptions list:
- [Assumption A] from [what clue] → pending/verified
- [Assumption B] from [what clue] → pending/verified

Pending questions: [items not yet clarified in Step 1c]
```

#### 1d. Memory Recall — Load historical experience

Before the pipeline, query the MMA memory system for relevant past analyses.

**Important — output format**: The user should see a friendly status, NOT raw shell output.

```
Step 1d execution:

① Display to user:
   "🧠 正在检索历史经验..."
   (friendly, one line, no technical details)

② Run recall:
   node $P/scripts/mcts.js mma deqi '{"tags":["<keywords>"],"limit":5}'

③ Interpret results for user:
   If > 0 results → "✅ 找到 N 条相关经验" + 1-line summary
   If 0 results → "📚 无历史经验，从新知识开始积累"
   Do NOT dump raw JSON to user.
   Do NOT show the bash command.
```

**If recall returns > 0**: Integrate into Step 1 profile. Note historical support. If match > 0.7, flag in pipeline args.

**If recall returns 0**: **NEVER fabricate.** Use WebSearch for real data. This is the only legitimate new knowledge source.

All pipeline steps follow: recall first → if nothing, search real data → never fabricate.

⛔ User must answer Layer 3 constraint questions → incomplete profile → cannot proceed.

⛔ At least 1 "pending" assumption. Zero uncertainty → insufficient examination.

---

### Steps 2-5: Launch Forced Pipeline

After Step 1 completes, launch the pipeline. Display to user only friendly messages, no technical details.

**Step A: Read meta config**
```bash
# Display: "⚙️ 正在加载分析配置..."
cat ~/.claude/data/skills/mcts-td-planner/pipeline-meta.json 2>/dev/null
```
(parse the output, pass as `meta_config`)

**Step B: Launch pipeline via Workflow tool**

```
$P = <path from [MCTS-TD] Plugin: SessionStart log>

Workflow({scriptPath: '$P/scripts/ponder-pipeline.wf.js', args: {
  user_request: '<raw request>',
  step1: '<profile output>',
  plugin_path: '<$P>',
  memory_context: '<deqi summary>',
  meta_config: <meta config>
}})
```

Display during pipeline: "🧠 正在执行分析管道..." (not each phase detail).

After return: present conclusions in natural language, not JSON.

**If Workflow tool is unavailable**, use Agent tool to spawn a pipeline executor:
```
Agent({subagent_type: "general-purpose", prompt: "Read $P/scripts/ponder-pipeline.wf.js and simulate each phase sequentially using Agent() calls. Output results as structured JSON: {step2: ..., step3: ..., step4: ..., step5: ...}"})
```
But note: without Workflow, schema enforcement is weaker. Upgrade advice is displayed: "⚠️ 当前环境不支持Workflow工具，分析质量可能下降"

### Step 6: Self-Evolution Assessment (with MMA evolutionary history)

After Workflow returns, present results (friendly) + evaluate free energy.

```
① Present results to user:
   "📊 分析完成" + conclusion summary
   (no technical details, no JSON, no bash output)

② If needed, evaluate evolution (silent, user-facing friendly only):
   1. Display: "⚙️ 评估架构性能..."
   2. Read free_energy + evolution_suggestions
   3. Query MMA evolution history:
      $P = <[MCTS-TD] Plugin: path>
      node $P/scripts/mcts.js mma deqi '{"tags":["evolution","mutation"],"limit":5}'
   4. Present to user only if mutation occurs:
      "🧬 管道已微调: [step] [mutation type]"
   (do NOT show raw command output, do NOT show JSON, do NOT show bash calls)

③ Read pipeline-meta.json for current step fitness values

④ If free_energy > 0.4 (threshold):
   - Choose mutation type based on historical success (skip historically failed types)
   - Update pipeline-meta.json fail_count for affected steps
   - Execute mutation (modify pipeline-meta.json)
   - Write mutation record to mutation_history
   - Write to MMA knowledge:
     node $P/scripts/mcts.js mma ashi '{
       "description": "Evolution mutation: [type] on [step], free_energy [old→new]",
       "tags": ["evolution","mutation","<mutation_type>"],
       "category": "zangxiang",
       "emotion": "xi"
     }'
     → Next deqi will recall: "Last weight_adjust reduced free energy by 0.2, worth retrying"
   - Increment generation
   - Save pipeline-meta.json

⑤ If free_energy <= 0.4:
   - Only update step pass_count
   - No mutation needed

⑥ If no mutation but free_energy is lower than last time:
   - Write positive MMA tag: "current config effective"
   - Mark as CONFIRMED → more likely to be reused
```

**The memory engine's role**: MMA is not a bystander. Every mutation result is stored in MMA and retrievable by next deqi. Over time, MMA accumulates "which mutations work under which conditions" — same mechanism as the brain's "experience guides behavior."

This maps to three theoretical pillars:
- Free Energy Principle: free_energy > threshold → must change architecture
- **Data-driven evolution**: mutation decisions come from historical statistics (`pipeline.js recommend-mutation`), NOT from LLM judgment. This mirrors how the brain selects learning strategies based on past reinforcement, not conscious deliberation.
- Yijing (易经/I Ching): free_energy = "change" (变易) signal, "minimize free energy" = "unchanging" (不易) meta-rule

**Critical rule — LLM does NOT decide mutations:**
The LLM's job is to *analyze*, not to *evolve*. When free_energy > threshold:
1. LLM records the result via `pipeline.js record-mutation`
2. LLM calls `pipeline.js recommend-mutation` to get the statistically optimal mutation type
3. LLM executes the recommended mutation
4. All mutation outcomes are stored in MMA for future reference
This prevents the "LLM pretending to evolve" problem.

**Pipeline structure:**
- `phase('6-scale divergence')` — sub-agent executes 6-perspective divergence, constrained by STEP2_SCHEMA (6 perspectives × 20+40 chars each)
- `phase('Bagua Mirror 8-dimension')` — sub-agent executes 8-dimension check, constrained by STEP3_SCHEMA (8 dims × 30+ chars + 3 conflict pairs)
- `phase('multi-scenario simulation')` — sub-agent executes 3-scenario simulation, constrained by STEP4_SCHEMA (2 directions × 3 scenarios)
- `phase('convergence self-check')` — sub-agent executes 5-question self-check, constrained by STEP5_SCHEMA (all 5 passed → all_clear=true)

**You CANNOT manually execute Steps 2-5.** Must launch via Workflow tool. Pipeline returns structured results.

---

### Presenting Results

After Workflow returns, convert structured results to user-comprehensible language:

```
╔═══════════════════════════════════════════╗
║  Analysis Complete                        ║
╚═══════════════════════════════════════════╝

[Conclusion] — everyday language, no framework jargon
Reasoning chain: [from divergence → examination → simulation → conclusion]
If wrong: [counter-hypothesis]

Self-check: [all passed / issues found (details)]
```

---

## FORBIDDEN

- Skipping Step 1 and launching Pipeline directly (analysis without user interview is invalid)
- Manually executing Steps 2-5 (must use Workflow, cannot pretend to complete them)
- Outputting framework jargon (MCTS/Schema/Agent/UCB etc.)
- Running shell commands visible to user
- Proceeding to next step before user answers constraint questions

---

## Memory

- **Knowledge**: decision results, insights, patterns → auto-stored via SessionEnd hooks
- **Profile**: preferences, habits → loaded via SessionStart hooks
- **Session-end**: hooks auto-run decay + finalize. No explicit action needed.
- **Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
