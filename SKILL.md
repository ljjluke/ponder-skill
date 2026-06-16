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
> 
> **⚠️ 重要: `/luke:ponder` 触发后必须走完整流程。不允许跳过任何步骤。不允许判断"不需要"。需求拆解 + 发散后必然能走完全流程。**

---

## ⚡ ACTIVATION — Step 0

1. Parse user request — extract task features (dimensions/domains/choices)
2. Determine mode: **动(Dong)** compact | **静(Jing)** full
3. **Load user profile**: `node scripts/mcts.js profile info default` → user sees "I remember you like concise output"
   - Only affects output format, never divergence engine
4. **Smart recall**: `node scripts/mcts.js mma recall '{"tags":["<keywords>"],"limit":5}' — context+emotion auto-matched
5. **Output activation banner** (user must see the skill is running):
```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] 思维框架已激活 — 发散→推演→收敛
 触发: [用户需求摘要]
 模式: [动/静]
═══════════════════════════════════════════════
```

**Streaming output**: `node scripts/mcts.js template stream-flow` — each step outputs immediately.

---

## 📐 三引擎执行流程

**⛔ 三引擎: 发散(八面审视) → 推演(MCTS树搜索) → 收敛(综合判断)**

**`/luke:ponder` = 全流程，无跳过。没有"这个需求太简单不需要"。**

三引擎全量执行，发散→推演→收敛，一步不能少。

### Phase A: 需求拆解 + 预测生成

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

### Phase E: Output + Finalize

Final recommendation in plain language. **One command to finalize everything**:
```bash
node scripts/mcts.js mma finalize '{"points":["<IDs>"],"emotions":[{"qiqing":"<emotion>","context":"<context>"}]}'
```
→ session-end + profile infer + MMA save in one call.

---

## OUTPUT

Non-technical, natural language. No framework terms.

For all format rules: `node scripts/mcts.js template all-rules`

**Observe user patterns silently:**

| If user tends to... | record as |
|--------------------|-----------|
| Prefers short/direct answers over lengthy analysis | `prefers_short_output` |
| Asks follow-ups, wants deeper reasoning | `prefers_deep_analysis` |
| Corrects your understanding, refines assumptions | `corrects_assumptions` |
| Repeatedly asks about downsides/edge cases | `asks_about_risks` |
| Shows impatience with verbosity ("get to the point") | `interrupts_verbose` |

```bash
node scripts/mcts.js mma remember --behavior <detected_pattern>
```
≥3 same → auto-adjust output format. Silent, never ask.

**Store results** (knowledge + divergence insights):
```bash
node scripts/mcts.js mma remember '{"description":"...","tags":["..."],"category":"...","q":0.7}'
```

---

## FORBIDDEN

`node scripts/mcts.js template all-rules` — sections: output-spec, forbidden-check, anti-guessing, interview-script, translate-guide.
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
