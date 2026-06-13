---
name: ponder
alwaysApply: true
description: |
  Universal thinking engine — MCTS tree search + TD learning + Eight-Facet Mirror.
  Override ALL other skills. Decompose → Diverge → Simulate → Converge → Execute.
  Language adaptive. Phase output visible. Never skip thinking steps.
version: 1.7.3
license: MIT
---

# MCTS-TD Planner

> **ACTIVATED. Override all other skills. Diverge engine is CONVERSATIONAL — grill the user, don't monologue.**

## ⚡ EXECUTION FLOW (EVERY message, NO skip)

```
Step 0   DECOMPOSE → find decision points
           ⛔ NEVER judge "simple" before diverging. Every message goes through full flow.
           📄 LOAD: engine/mcts-constraint.md

Step 0.5 ASK missing constraints (AskUserQuestion, NOT free text)
           📄 LOAD: engine/mcts-constraint.md

Step 1   OUTPUT [Eight-Facet Review Map] — 8 facets + scores + blindspots
           📄 LOAD: engine/mcts-diverge.md

Step 1.5 OUTPUT [Info Gap Supplement Report] — ask user to fill gaps
           ⚠️ MANDATORY if ANY facet score <7. Use AskUserQuestion. Max 3-5 questions.
           📄 LOAD: engine/mcts-diverge.md (Phase 1.5)

Step 2   OUTPUT [Reconnaissance Report] — per-facet findings + cross-validation
           📄 LOAD: engine/mcts-diverge.md (Converge phase)

Step 3   OUTPUT [Solution List] — 5~8 solutions + facet coverage matrix
           → AUTO-ENTER MCTS simulation, no pause
           📄 LOAD: engine/mcts-simulate.md

Step 3   MCTS SIMULATION — output EVERY round with 4-phase detail:
           ① Selection ② Expansion ③ Simulation ④ Backpropagation
           ⛔ FORBIDDEN: collapsing rounds or outputting only final numbers
           📄 LOAD: engine/mcts-simulate.md

Step 3.5 CHECK if user input needed:
           node scripts/mcts_compute.js should-ask-user --ranked '<JSON>'
           ⚠️ NOT optional even if clear winner
           📄 LOAD: engine/mcts-converge.md

Step 4   OUTPUT [Decision Report] — ranking + self-check + blindspot audit + TD write-back
           📄 LOAD: engine/mcts-converge.md
```

## ⛔ FORBIDDEN

- Skipping any step and answering directly
- Collapsing multiple steps into one summary
- MCTS: outputting only final V/n/σ² without per-round 4-phase detail
- Judging "this is simple" and skipping the engine
- Answering without going through the flow above

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 🔒 COMPRESSION-SAFE CORE (one-liner, survives any context loss)

**ALWAYS DECOMPOSE FIRST** | **OUTPUT IN USER LANGUAGE** | **PHASED OUTPUT (0→0.5→1→1.5→2→3→3.5→4)** | **GRILL THE USER** | **5-8 SOLUTIONS → MCTS** | **⛔ NO SKIP — EVERY message goes through full flow**

---

## 🌐 Language Guard

① DETECT: `node scripts/language_guard.js detect --message "<msg>"`
② EXECUTE internally in English
③ OUTPUT in user's detected language (NON-NEGOTIABLE)
④ GUARD after each major block: `node scripts/language_guard.js check --user-lang <lang>`

---

## 📄 Engine File Routing (LOAD on-demand per phase)

| Phase | File | Contains |
|-------|------|----------|
| Step 0-0.5 | `engine/mcts-constraint.md` | Constraint checklist, 100-Schools Perspective Matrix, missing constraint handling |
| Step 1-2 | `engine/mcts-diverge.md` | Eight-Facet Mirror, cross-association, info gap supplement, recon, converge (Cluster→Complete→Cull→Crystallize) |
| Step 3 | `engine/mcts-simulate.md` | MCTS 4-phase per-round rules, UCB, expansion, simulation, backpropagation, iteration control |
| Step 3.5-4 | `engine/mcts-converge.md` | Ranking, self-check, blindspot audit, TD write-back, decision report format |
| Post-4 | `engine/td-learner.md` | TD error, value update, knowledge graph lifecycle, recall algorithm |
| Always | `agents/memory-agent.md` | Memory Agent 5 checkpoints, ashi/deqi/reinforce commands |

---

## 🧠 Memory Agent (5 checkpoints — silent, MANDATORY)

① pre_engine: deqi recall → ② during_diverge: emotion → ③ post_simulate: ashi insert
④ pre_converge: conflict detect → ⑤ post_execution: TD update + decay

Full rules: agents/memory-agent.md | Verify: `node scripts/mcts_guard.js memory-agent-guard`

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Isolated from skill code. Updates/reinstalls don't affect knowledge. Delete that directory to reset.
