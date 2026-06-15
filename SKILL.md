---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Enabled by default. Only activates on `/luke:ponder` — does NOT auto-trigger.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.11.0
license: MIT
---

# MCTS-TD Thinking Framework

> **`alwaysApply: true` only ensures the skill is enabled after install. It ONLY responds to `/luke:ponder` — never auto-triggers.**

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

## 📏 OUTPUT RULES: HIGHLIGHTS FIRST, PROCESS SECOND

**Principle: for each step, ask "what's the most interesting finding here?" → show that. Everything else → 1-line summary or skip.**

The goal isn't to hide output — it's to make every line count. A 50-line report with 10 real insights beats a 200-line report with the same 10 insights buried in process text.

### Priority Rule

```
For each step:
  S = Surprising finding? (counter-intuitive, contradicts assumption, score≥9 or ≤3)
  I = Insightful finding? (genuinely new perspective, restructuring the problem)
  P = Process/Procedure? (obvious result of following the method)

  Output priority: S > I > P
  - S findings → show full detail (1-3 lines)
  - I findings → show briefly (1 line)
  - P findings → skip, unless required for understanding S/I
```

### Per-Step Output Specification

| Step | What to output | What to skip |
|------|---------------|--------------|
| **Activation** | "⚡ MCTS started — [task] — [mode]" | Long banner unnecessary |
| **五診** | Scores + only the dimensions that need asking | 本末/有无/张力 as separate sections — fuse into scores |
| **心斋** | Assumptions user is LIKELY TO DISAGREE with | Obvious/uncontroversial assumptions |
| **六视** | Which view gave the MOST SURPRISING insight (maybe 1-3, not all 6) | Views that confirm what's already known |
| **八卦镜** | Facets where 六视 changed the score ≥2, OR score is extreme (≤3 or ≥9), OR reveals a blindspot | Facets where nothing surprising found |
| **Round 2-5** | Nothing — process steps, not outputs | All internal |
| **齐物/梦蝶** | Only if they flip a conclusion | If result is the same, skip |
| **MCTS** | Final ranking + confidence + why #1 beats #2 | Per-round 4-phase process |
| **自检** | "✅ Pass" or "⚠️ [concern]" or "❌ [reason]" | 5 questions individually |
| **盲区+言意** | Gaps that affect the recommendation | Minor gaps |
| **决策报告** | Ranking + execution plan | Verification blocks |
| **Memory Agent** | Nothing | Never show |

### Format: "One strong line per finding"

- ❌ **Bad**: "F1 乾 from cosmic view scored 7/10 because..." (process)
- ✅ **Good**: "从全局来看，这个需求真正驱动它的不是技术需求，是业务部门的KPI压力" (insight)
- ❌ **Bad**: "齐物分析中朝菌之视最不舒服" (process)
- ✅ **Good**: "如果把时间压到只剩1天，这个项目优先级最高的根本不是编码，是确认需求" (insight)

### When to go deeper

- **User asks**: "tell me more about X" → expand X's full analysis
- **Finding is truly counter-intuitive** → show the reasoning, user needs to see it to believe it
- **MCTS ranking is tight** (deltaV < 0.05 between #1 and #2) → show why
- **Skill author/debug** → full output, no compression<｜end▁of▁thinking｜>

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
