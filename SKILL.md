---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.12.3
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` = full flow, always. No "too simple."**
> 
> Test case: `template hello-test` — even "hello" goes through all 5 steps.

## ACTIVATION

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] Active — diverge→simulate→converge
 Trigger: [request summary]
 Mode: [Dong/Jing]
═══════════════════════════════════════════════
```

Load profile: `node scripts/mcts.js profile info default`
Recall memory: `node scripts/mcts.js mma recall '{"tags":["<keywords>"],"limit":5}'`

---

## MANDATORY 5-STEP FLOW

### Step 1: Decompose

**MUST decompose before analyzing. No decomposition → violation.**

3-step interview — `template interview-script`:
```
① Paraphrase user → ask: "Anything to add?"
② Ask: "What have you tried?"
③ Ask 2-3 critical constraints (with options)
```

Output: dimension scores + what needs clarification.

---

### Step 2: Diverge

**MUST examine from 6 scales. Each scale ≥1 insight.**

`template six-views` — system, micro, time-compressed, time-expanded, flow, selfless.

Output: one key insight per scale.

---

### Step 3: Examine

**MUST examine from 8 perspectives. Each needs substance.**

`template bagua-questions` — force, foundation, change, penetration, risk, dependencies, boundary, balance.

Output: 1-2 most abnormal + cross-perspective conflicts.

---

### Step 4: Simulate

**Each solution → 3 scenarios (optimistic/realistic/pessimistic).**

```
① List ≥2 solutions → tree init
② Each solution → Agent(mcts-simulator) × 3 scenarios
③ Aggregate: optimistic V, realistic V, pessimistic V
④ Recommend based on risk preference
```

Output: comparison + recommendation + key risk.

---

### Step 5: Converge

Plain language. No framework terms. User must follow the reasoning.

Store: `node scripts/mcts.js mma finalize '{"points":["<IDs>"],"emotions":[]}'`

---

## FORBIDDEN

- Skip any step (even "simple" requests)
- Decompose → diverge without full interview
- Surface-level divergence (each scale needs substance)
- Single-solution simulation (minimum 2)
- Framework terms in output (user must understand)
- Merged steps (each step independent output)

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## Engine Routing

| Step | File | Rule |
|------|------|------|
| 1 | `engine/mcts-constraint.md` | MUST Read |
| 2 | `engine/mcts-diverge.md` | MUST Read |
| 3 | `engine/mcts-predictive.md` | MUST Read |
| 4 | `engine/mcts-simulate.md` | MUST Read |
| 5 | `engine/mcts-converge.md` | MUST Read |

---

## Memory

- **Knowledge**: decision results, insights, patterns → MMA meridians
- **Profile**: preferences, habits → profile storage, NOT knowledge
- **Session-end auto-update**: `mma finalize`

**Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
