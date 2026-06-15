---
name: ponder
alwaysApply: true
description: |
  Universal thinking engine — MCTS tree search + TD learning + Eight-Facet Mirror.
  Always active, engages on demand: decompose → detect decision points → engine engages.
  Language adaptive. Phase output visible when engine engages.
version: 1.9.0
license: MIT
---

# MCTS-TD Planner

> **ALWAYS ACTIVE. Engine stands by — engages whenever decision points detected.**

## ⚡ EXECUTION STRATEGY

**Engine is ALWAYS on standby. No "skip" — only "engage now" or "stand by".**

```
EVERY message:
  Step 0: DECOMPOSE → detect decision points
    ├─ 0 decision points → direct answer (engine stands by)
    └─ 1+ decision points → ENGINE ENGAGES
```

**When engine engages, execute this flow IN ORDER:**

```
Step 0   DECOMPOSE + 动静(Dong-Jing) MODE (動/Dong=simplified / 靜/Jing=full)
Step 0.5 五診(Wuzhen) Requirement Portrait — 5 dimensions, any <7 → ASK
Step 0.5b 本末(Ben-Mo)/有无(You-Wu)/张力(Tension) (AFTER Wuzhen, MANDATORY)
Step 1   [Eight-Facet Review Map] — 8 facets + scores
Step 1.5 [Info Gap Supplement] — ask user to fill gaps (if any <7)
Step 2   [Reconnaissance Report] — findings + cross-validation
Step 3   [Solution List] → AUTO-ENTER MCTS simulation
Step 3   MCTS SIMULATION — per-round 4-phase output
Step 3.5 Self-Check + ask user if needed
Step 3.6 [Blindspot Audit + 言意(Yan-Yi) Gap]
Step 4   [Decision Report] — ranking + self-check + TD write-back
```

## 📏 CONTEXT BUDGET

**⚠️ Context is a scarce resource — must be managed consciously to prevent bloat.**

| Rule | Description |
|------|-------------|
| **Dong mode compact output** | 動(Dong): each Phase output ≤500 chars, MCTS 3-5 rounds, skip Round 3 change analysis, cross-association only Top-2 pairs |
| **Jing mode full output** | 靜(Jing): full output, but from Round 3 onward use compact format (one-line summary) |
| **CLI call batching** | Merge multiple compute/guard commands in same Phase into one call; language check only once at Phase 4 final |
| **Engine file on-demand loading** | Only load engine file for current Phase, do not pre-read subsequent Phase files |
| **Context pressure detection** | If output starts getting truncated or responses slow → auto-switch to Dong mode |
| **MCTS round compression** | Round 1-2: full 4-phase | Round 3+: "Round N: Selected [path], V=X, n=N" |

**Dong mode output template** (each Phase ≤ 500 chars):
```
[Phase Name] Key: [1-2 bullet points]
Scores: F1=8 F2=4↓ F3=7 F4=5↓ F5=9 F6=6 F7=8 F8=7
Action: [what to do next]
```

Template: `node scripts/mcts.js template dong-template --data '<JSON>'`

## ⛔ FORBIDDEN

- Ignoring detected decision points and answering directly
- Collapsing multiple steps into one summary
- MCTS: outputting only final V/n/σ² without per-round detail
- Claiming "engine not needed" when decision points exist
- Verbose output in Dong mode (context budget exceeded = VIOLATION)

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 🔒 COMPRESSION-SAFE CORE

**ALWAYS ACTIVE** | **DECOMPOSE FIRST** | **OUTPUT IN USER LANGUAGE** | **DECISION POINT → ENGINE ENGAGES** | **PHASED OUTPUT (0→0.5→0.5b→1→1.5→2→3→3.5→4)** | **Dong-Jing CHECK BEFORE ENGINE** | **Ben-Mo/You-Wu/Tension CHECK AFTER Wuzhen** | **CONTEXT BUDGET — Dong compact, Jing full**

---

## 🌐 Language Guard

① DETECT: `language_guard.js detect` → ② Internal English → ③ OUTPUT in user language → ④ FINAL check only (at Step 4)

---

## 📄 Engine File Routing

| Phase | File | Key Content | Detailed Rules (on-demand CLI) |
|-------|------|-------------|-------------------------------|
| Step 0-0.5b | `engine/mcts-constraint.md` | Dong-Jing, Wuzhen, Ben-Mo/You-Wu/Tension, constraints | `guard five-diagnosis-detail` |
| Step 1-2 | `engine/mcts-diverge.md` | Eight-Facet(+Ti-Yong+Li-Shi), info gap, converge(+One-Many) | `guard diverge-detail` |
| Step 3 | `engine/mcts-simulate.md` | MCTS 4-phase, UCB, mutation, body-use | `guard simulate-detail` |
| Step 3.5-4 | `engine/mcts-converge.md` | Ranking(+body-use), self-check(+Ben-Mo+Dong-Jing), blindspot(+Yan-Yi), TD(+Li-Shi) | `guard converge-detail` |
| Post-4 | `engine/td-learner.md` | TD error, value update, knowledge lifecycle | — |
| Always | `agents/memory-agent.md` | 6 checkpoints (direct-call, conflict alert only) | — |

**⚠️ Each engine file is self-sufficient for its phase — LLM can execute that phase without calling guard commands. Guard detail commands provide extra reference for edge cases.**

Shorthand: `node scripts/mcts_guard.js phase-rules --phase <0|1|2|3>`

---

## 🧠 Memory Agent (direct-call, 6 checkpoints)

LLM calls MMA commands directly. No daemon. No buffer.

① pre_engine: `mma deqi` → ② during_diverge: `mma observe --phase during_diverge` → ③ post_simulate: `mma ashi` + `mma cluster`
③.5 complete: fill _needs_completion → ④ pre_converge: `mma observe --phase pre_converge` (ALERT if conflicts)
⑤ post_execution: `mma observe --phase post_execution` (TD + decay) → ⑥ session_end: `mma session-end` with session point IDs

Session tracking: LLM collects point IDs from each ashi response, passes list to session-end.
Full rules + exact CLI syntax: `agents/memory-agent.md`

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete that directory to reset.
