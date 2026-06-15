---
name: ponder
alwaysApply: false
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.11.0
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` triggered → Full framework engages. Every step mandatory. Every step visible.**

---

## ⚡ ACTIVATION — Step 0: Start Engine

1. Parse user request — extract task features (dimensions/domains/choices)
2. Determine mode: urgent/simple → **动(Dong)** compact 3-5 rounds | important/complex → **静(Jing)** full 8-10 rounds
3. Output activation banner:

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] Decision demand detected. Starting decision engine.
 Trigger: [task description, key dimensions]
 Mode: [Dong/Jing] ([N] candidate directions)
═══════════════════════════════════════════════
```

Proceed to 五診(Wuzhen) portrait. **Mandatory phased flow below.**

---

## 📐 MANDATORY PHASED FLOW

### Step 0.5: 五診 Requirement Portrait

**⛔ MUST LOAD `engine/mcts-constraint.md` — cannot execute without it.**

5 dimensions, score 0-10. Any <7 → ASK user.

| Dim | Probe | Score |
|-----|-------|-------|
| 天(Timing) | Stage? Deadline? Window closing? | ?/10 |
| 地(Resources) | People/budget? Locked-in deps? | ?/10 |
| 人(People) | Who affected? Final say? | ?/10 |
| 法(Rules) | Regulations? Forbidden? | ?/10 |
| 物(Essence) | Core purpose? Success criteria? | ?/10 |

After portrait: **本末(Ben-Mo)** identify root dimension + **有无(You-Wu)** detect absent constraints + **张力(Tension)** scan dimension pair gaps.

---

### Step 1: 逍遥游 Divergence ⭐ Core Phase

**⛔ MUST LOAD `engine/mcts-diverge.md` — complete Zhuangzi-based methodology.**

Divergence is NOT "looking from different angles." It is **completely changing observer identity, scale, and spacetime position.** Like human seeing Earth vs alien seeing Earth. Kun (deep-sea fish) seeing world vs Peng (90k li high bird) seeing world.

**Flow: 心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶**

**Phase 0: 心斋** — Expose default assumptions first. Skip this = fake divergence.
- List ≥3 unchecked assumptions + their sources + 3 counter-hypotheses
- Declare: "I don't know the answer yet. Blank slate."

**Phase 1: 六视** — Six free-wandering perspectives, each changes who observes:
- 鲲鹏之视 [Cosmic]: Redefine problem at system level
- 蜩鸠之视 [Ground]: Notice micro-details macro misses
- 朝菌之视 [Time-compressed]: What if only 1 day
- 冥灵之视 [Time-expanded]: What changes in 100 years
- 列子御风 [Flow]: Where without intervention
- 至人无己 [Selfless]: Remove personal stake

**Phase 2: 八卦镜** — Examine 8 facets with new eyes. Each: 体用 + 六视 cross-check + dual sub-lens reasoning + cultural analogy + blindspots/ideas/score. 5 rounds: depth→cross-associate→change analysis→blindspot fill→self-check.

**Phase 3: 齐物** — Equalize all views. The uncomfortable view may be the correct one.

**Phase 4: 梦蝶** — Ultimate flip: subject-object swap / success-failure swap / time-order swap.

Detailed templates in `engine/mcts-diverge.md`.

---

### Step 1.5: Info Gap Supplement

**⛔ Any facet <7 → MUST ask user via AskUserQuestion (not free text).**

```
【Info Gap】
 Gap: F?=[X/10] — [what's missing]
 Ask: [AskUserQuestion × 1-3]
 Updated: F?=X→Y
```

---

### Step 2: Reconnaissance Report

**⛔ MUST LOAD `engine/mcts-diverge.md` converge section.**

Per-facet findings + cross-validation (理事 Li-Shi separation) + explicit assumptions (Confirmed/Unconfirmed).

---

### Step 3: Solution List → Converge → MCTS

**⛔ MUST LOAD `engine/mcts-simulate.md`.**

Step 3a: Multi-solution list — unlimited during divergence, tag each with source + 体用.
Step 3b: Converge — cluster→complete→cull→crystallize. 一多(One-Many) + 体用 dedup. ≤10 into MCTS.
Step 3c: MCTS simulation — per round: Selection/Expansion/Simulation/Backprop. Converge when V stable 3 rounds | best n≥5 σ²<0.05.

---

### Step 3.5: Self-Check

**⛔ MUST LOAD `engine/mcts-converge.md`.**

5 questions: ① find flaws ② reverse thinking ③ risk assessment ④ 本末 check ⑤ 动静 check.

---

### Step 3.6: Blindspot Audit + 言意 Gap

Blindspot: sub-lens coverage → 3+ missed → WARNING → return to converge | 1-2 → annotate.
言意: literal vs metaphorical / same word different meaning / unstated expectations.

---

### Step 4: Decision Report

**⛔ MUST LOAD `engine/mcts-converge.md`.**

Ranking (V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + 体用 bonus) + self-check + blindspot + 言意 + execution plan + TD write-back + Memory Agent checkpoint verification.

---

## 🌐 Concept Translation Rule (MANDATORY)

**Internal thinking uses cultural concept names. Output translates into user's domain language.**

Chinese philosophical concepts (心斋, 逍遥游, 齐物, 诸子百家, etc.) are internal "thinking opcodes" — NOT output format.

If a concept can be naturally translated → translate it.
If translation would lose the core meaning → keep the original name BUT explain its essence in the user's language.

| Principle | In practice |
|-----------|-------------|
| **Can translate cleanly** → translate | 心斋 → "Expose implicit assumptions" |
| **Original name is the most precise** → keep name + explain | 齐物(Qiwu) → "Qiwu: every perspective has equal validity, the uncomfortable one may be key" |
| **Chinese user would understand** → can keep with brief explanation | 心斋 (assumption-exposure) can stay as 心斋 for Chinese users |

Translation tables (core concepts, 八卦 facets, 诸子百家 sub-lenses, validation terms) in `engine/mcts-diverge.md`.

---

## ⛔ FORBIDDEN

- **Skip any step** — even if task looks "simple"
- **Skip 心斋 and diverge directly** — fake divergence
- **六视 surface-level** — must truly BECOME each perspective
- **八卦镜 perfunctory** — every facet needs 体用 + sub-lens reasoning + cultural analogy + 六视 cross
- **Execute without reading engine files** — MUST LOAD files are mandatory reads
- **Merge steps** — each step independent output
- **MCTS: final numbers only without per-round detail**
- **Limit solutions during divergence** — unlimited until converge
- **Output raw cultural concepts without translation/explanation**

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 🔒 COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **心斋→六视→八卦镜→齐物→梦蝶** | **DIVERGE THEN CONVERGE** | **≤10 INTO MCTS** | **EVERY STEP VISIBLE** | **CONCEPT → DOMAIN LANGUAGE**

---

## 📄 Engine File Routing

| Phase | File | Load Rule |
|-------|------|-----------|
| Step 0-0.5b | `engine/mcts-constraint.md` | **MUST Read before Step 0.5** |
| Step 1-2 | `engine/mcts-diverge.md` | **MUST Read before Step 1** |
| Step 3 | `engine/mcts-simulate.md` | **MUST Read before MCTS** |
| Step 3.5-4 | `engine/mcts-converge.md` | **MUST Read before Step 3.5** |
| Post-4 | `engine/td-learner.md` | For TD write-back |
| Always | `agents/memory-agent.md` | 6 checkpoint reference |

**⚠️ Not "can load" — "MUST load". Not loading = cannot execute the step = VIOLATION.**

---

## 🧠 Memory Agent (6 checkpoints)

① pre_engine: `mma deqi` → ② during_diverge: `mma observe` → ③ post_simulate: `mma ashi` + `mma cluster` → ③.5 complete → ④ pre_converge: `mma observe` → ⑤ post_execution: `mma observe` → ⑥ session_end: `mma session-end`

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete to reset.
