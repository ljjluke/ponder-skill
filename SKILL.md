---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Enabled by default. Only activates on `/luke:ponder` — does NOT auto-trigger.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.12.0
license: MIT
---

# MCTS-TD Thinking Framework

> **`alwaysApply: true` only ensures the skill is enabled. It ONLY responds to `/luke:ponder` — never auto-triggers.**

---

## ⚡ ACTIVATION — Step 0

1. Parse user request — extract task features (dimensions/domains/choices)
2. Determine mode: **动(Dong)** compact | **静(Jing)** full
3. **Load user profile**: `node scripts/mcts.js profile info default` → user sees "I remember you like concise output"
   - Only affects output format, never divergence engine
4. **Recall memories**: `node scripts/mcts.js mma deqi '{"tags":["<keywords>"],"category":"<domain>","limit":5}' --context '{"task_type":"<type>","domain":"<domain>","emotion":"<emotion>"}'`
   - Context-aware recall (Tulving 1983): same context → higher retrieval
   - Emotion-congruent recall (Bower 1981): same mood → biased retrieval
5. Output activation banner.

**Streaming output**: `node scripts/mcts.js template stream-flow` — each step outputs immediately.

---

## 📐 PROCESS FLOW: Prediction → Test → Correct → Converge

**⛔ MUST LOAD `engine/mcts-predictive.md` — transforms linear steps into recursive loop.**

The framework is not a linear pipeline. It is a **prediction-correction loop**, like the human brain:

### Phase A: Fast Path Check (System 1)

Before any analysis, check memory for a direct match. If high-confidence past solution exists, output it directly and skip to session end.

```bash
# Check fast path
node scripts/mcts.js compute fast-path-check --query '<json>' --memories '<deqi_results>'
```

### Phase B: Generate Prediction (System 2)

If no fast-path match, generate an initial prediction about the user's domain.

1. **Load prediction rules**: `node scripts/mcts.js template interview-script` → 3-step user interview
2. **Generate prediction**: `node scripts/mcts.js compute predict-generate --task '<json>' --memory '<deqi_results>'`
3. **Score dimensions**: 天(Timing) 地(Resources) 人(People) 法(Rules) 物(Essence)

### Phase C: Test → Error → Propagate (Recursive Loop)

Test prediction against user input, compute error, propagate corrections.

```
① Output current scores → ask about low-confidence dimensions
② Get user response → compute prediction error
③ If error > threshold → correct scores → re-run affected analysis
④ Repeat until error < threshold
```

### Phase D: Diverge → Converge (from corrected prediction)

**⛔ MUST LOAD `engine/mcts-diverge.md` and `engine/mcts-simulate.md`.**

Run divergence (心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶) using the corrected prediction.
Run MCTS tree search using the corrected scores.

```bash
# Propagate correction if user changes input mid-flow
node scripts/mcts.js compute predict-propagate --correction '<json>'
```

### Phase E: Output + Memory

Final recommendation in plain language. Store results.

```bash
node scripts/mcts.js mma session-end '{"points":["<IDs>"],"emotions":[{"qiqing":"<emotion>","context":"<context>"}]}'
```

---

## OUTPUT

Non-technical, natural language. No framework terms. The user should see analysis, not methodology.

For format rules: `node scripts/mcts.js template output-spec`

**Throughout the conversation, silently analyze user behavior patterns.** 
Use your understanding of natural conversation — not keyword matching — to detect:

| If user tends to... | record as |
|--------------------|-----------|
| Prefers short/direct answers over lengthy analysis | `prefers_short_output` |
| Asks follow-ups, wants deeper reasoning | `prefers_deep_analysis` |
| Corrects your understanding, refines assumptions | `corrects_assumptions` |
| Repeatedly asks about downsides/edge cases | `asks_about_risks` |
| Shows impatience with verbosity ("get to the point") | `interrupts_verbose` |

```bash
node scripts/mcts.js profile observe default --behavior <detected_pattern>
```

≥3 same behavior auto-adjusts output format. **Never ask user to confirm** — just record silently.
At session end: `node scripts/mcts.js profile infer default --signals '<json>'` to update personality type.

---

**Store simulation results**:
```bash
node scripts/mcts.js mma ashi '{"description":"Decision: [name] V=[X] — [summary]","tags":["decision_result","<domain>"],"category":"judgment_and_strategy","source":"execution_result","q":0.7}'
```

**Store divergence insights**:
```bash
node scripts/mcts.js mma capture-divergence '[{"description":"...","tags":["divergence","..."],"phase":"bagua","q":0.65}]'
```

---

## FORBIDDEN

`node scripts/mcts.js template forbidden-check` — apply all rules.
**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 📄 Engine File Routing

| Phase | File | Rule |
|-------|------|------|
| Step 0-0.2 | `engine/mcts-predictive.md` | MUST Read for predictive coding loop |
| Step 0.5-0.5b | `engine/mcts-constraint.md` | MUST Read before Step 0.5 |
| Step 1-2 | `engine/mcts-diverge.md` | MUST Read before Step 1 |
| Step 3 | `engine/mcts-simulate.md` | MUST Read before MCTS |
| Step 3.5-4 | `engine/mcts-converge.md` | MUST Read before Step 3.5 |
| Post-4 | `engine/td-learner.md` | TD write-back |
| Always | `agents/memory-agent.md` | 6 checkpoint reference |

---

## CONCEPT TRANSLATION RULE

`node scripts/mcts.js template translate-guide` — full translation table in `engine/mcts-diverge.md`.

---

## COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **心斋→六视→八卦镜→齐物→梦蝶** | **DIVERGE THEN CONVERGE** | **≤10 INTO MCTS** | **CONCEPT → DOMAIN LANGUAGE**

---

## MEMORY SYSTEM

- **Knowledge (global)**: decision results, cross-domain insights, causal patterns → MMA meridians
- **User profile (per-user)**: communication preferences, behavioral patterns → profile storage, NOT knowledge
- **Automatic**: embedded in backend flow, no extra LLM steps

**Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
