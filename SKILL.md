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
5. Output activation banner.

**Streaming output: each step outputs its crystallization as it completes.**
   - 五診(scores + what needs asking) → output immediately
   - 心斋(assumption contradiction found) → output if surprising
   - 六视(counter-intuitive finding) → output if any
   - 八卦镜(most abnormal facet) → output if striking
   - 齐物/梦蝶(perspective flip) → output if flips conclusion
   - MCTS(detailed comparison, no numbers) → output when ready
   - Final recommendation + risk → last output
   - User answers → wait for input, then continue

---

## 📐 MANDATORY PHASED FLOW

### Step 0.5: 五診 (Wuzhen) Requirement Portrait

**⛔ MUST LOAD `engine/mcts-constraint.md` — cannot execute without it.**

5 dimensions scored 0-10. Any <7 → ask user. Output: concise table showing scores + what needs asking.

**本末(Ben-Mo)**: identify root dimension | **有无(You-Wu)**: detect absent constraints | **张力(Tension)**: scan gaps

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

### Step 1: 逍遥游 (Free Wandering) Divergence ⭐

**⛔ MUST LOAD `engine/mcts-diverge.md` — complete Zhuangzi-based methodology.**

Not "looking from different angles." **Completely changing observer identity, scale, position.**

**Each sub-phase outputs 1 finding if surprising, skips if not**: 心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶

**Store key divergence insights as knowledge**:
```bash
node scripts/mcts.js mma capture-divergence '[{"description":"...","tags":["divergence","..."],"phase":"bagua","q":0.65}]'
```

---

### Step 1.5: Info Gap

**⛔ Any facet <7 → ask user via AskUserQuestion.**

---

### Steps 2-3: Recon → MCTS

**⛔ MUST LOAD `engine/mcts-simulate.md`.**

Full backend execution: Reconnaissance → Converge → MCTS tree search. MCTS outputs ranking when done.

**Step 3.5-3.6 自检/盲区/言意**: All internal, only output if genuine risk uncovered.

**Store simulation results**:
```bash
node scripts/mcts.js mma ashi '{"description":"Decision: [name] V=[X] — [summary]","tags":["decision_result","<domain>"],"category":"judgment_and_strategy","source":"execution_result","q":0.7}'
```

---

### Step 4: Memory + Session End

For format rules: `node scripts/mcts.js template output-spec`
For anti-guessing rules: `node scripts/mcts.js template anti-guessing`

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
