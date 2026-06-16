---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Enabled by default. Only activates on `/luke:ponder` — does NOT auto-trigger.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.11.1
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
4. **Recall memories**: `node scripts/mcts.js mma deqi '{"tags":["<keywords>"],"category":"<domain>","limit":5}'`
   - Global knowledge (cross-user) feeds into current analysis
5. Output activation banner, then proceed through mandatory phases.

---

## 📐 MANDATORY PHASED FLOW

### Step 0.5: 五診 (Wuzhen) Requirement Portrait

**⛔ MUST LOAD `engine/mcts-constraint.md` — cannot execute without it.**

5 dimensions scored 0-10. Any <7 → ask user. Output: concise table showing scores + what needs asking.

**本末(Ben-Mo)**: identify root dimension | **有无(You-Wu)**: detect absent constraints | **张力(Tension)**: scan gaps

**Throughout interaction, call profile observe when user shows a pattern** (≥3 same behavior triggers auto-adjustment):
```bash
node scripts/mcts.js profile observe default --behavior <prefers_short_output|prefers_deep_analysis|corrects_assumptions|asks_about_risks|interrupts_verbose>
```
- Observations only affect NEXT output format, NEVER current analysis content.
- At end: `node scripts/mcts.js profile infer default --signals '<json>'` to update personality type.

---

### Step 1: 逍遥游 (Free Wandering) Divergence ⭐

**⛔ MUST LOAD `engine/mcts-diverge.md` — complete Zhuangzi-based methodology.**

Not "looking from different angles." **Completely changing observer identity, scale, position.**

**Internal only (no user output)**: 心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶
User only sees: the one most surprising finding per phase (if any), at step 4.

**Store key divergence insights as knowledge**:
```bash
node scripts/mcts.js mma capture-divergence '[{"description":"...","tags":["divergence","..."],"phase":"bagua","q":0.65}]'
```

---

### Step 1.5: Info Gap

**⛔ Any facet <7 → ask user via AskUserQuestion.**

---

### Steps 2-3.6: Internal Processing (no direct output)

**⛔ MUST LOAD `engine/mcts-simulate.md` and `engine/mcts-converge.md`.**

Full backend execution: Reconnaissance → Converge → MCTS tree search → Self-check → Blindspot audit → 言意 check. All internal.

**Store simulation results**:
```bash
node scripts/mcts.js mma ashi '{"description":"Decision: [name] V=[X] — [summary]","tags":["decision_result","<domain>"],"category":"judgment_and_strategy","source":"execution_result","q":0.7}'
```

---

### Step 4: Crystalline Output (what user sees)

Each internal step may produce 0-1 crystallized insight. Output format — no numbers, no weights, no V/σ².
User must be able to mentally simulate and validate the reasoning path.

For format rules: `node scripts/mcts.js template output-spec`
For anti-guessing rules: `node scripts/mcts.js template anti-guessing`

**Store final user habits** (current session only, not knowledge base):
```bash
node scripts/mcts.js profile observe default --behavior <observed_behavior>
```

**Finalize memory consolidation**:
```bash
node scripts/mcts.js mma session-end '{"points":["<all ashi point IDs>"],"emotions":[{"qiqing":"<emotion>","context":"<context>"}]}'
```
→ Multi-cycle sleep: NREM(facts) → REM(connections) → synaptic homeostasis

---

## FORBIDDEN

- **Skip any step** — even simple tasks go through full flow
- **Skip 心斋** — fake divergence without assumption-exposure
- **六视 surface-level** — must truly BECOME each perspective, not list views
- **八卦镜 perfunctory** — each facet: 体用 + sub-lens + cultural analogy + 六视 cross
- **Execute without reading MUST LOAD engine files** — mandatory
- **MCTS: final numbers only without per-round detail** (internal runs full, but user sees narrative)
- **Limit solutions during divergence** — unlimited until converge
- **Output raw cultural terms without explanation/translation** — concept → domain language
- **Merge steps** — backend must run each independently

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 📄 Engine File Routing

| Phase | File | Rule |
|-------|------|------|
| Step 0-0.5b | `engine/mcts-constraint.md` | MUST Read before Step 0.5 |
| Step 1-2 | `engine/mcts-diverge.md` | MUST Read before Step 1 |
| Step 3 | `engine/mcts-simulate.md` | MUST Read before MCTS |
| Step 3.5-4 | `engine/mcts-converge.md` | MUST Read before Step 3.5 |
| Post-4 | `engine/td-learner.md` | TD write-back |
| Always | `agents/memory-agent.md` | 6 checkpoint reference |

---

## CONCEPT TRANSLATION RULE

**Internal uses concept names (心斋, 逍遥游, 齐物...). Output translates to user's domain language.**

Detailed translation tables (concepts, 八卦 facets, 诸子百家 sub-lenses, validation terms) in `engine/mcts-diverge.md`.

---

## COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **心斋→六视→八卦镜→齐物→梦蝶** | **DIVERGE THEN CONVERGE** | **≤10 INTO MCTS** | **CONCEPT → DOMAIN LANGUAGE**

---

## MEMORY SYSTEM

- **Knowledge (global)**: decision results, cross-domain insights, causal patterns → MMA meridians
- **User profile (per-user)**: communication preferences, behavioral patterns → profile storage, NOT knowledge
- **Automatic**: embedded in backend flow, no extra LLM steps

**Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
