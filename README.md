<p align="center">
  <img src="https://img.shields.io/github/v/release/ljjluke/mcts-skill" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="license">
</p>

<h1 align="center">🧠 MCTS-TD</h1>

<p align="center">
  <b>A Claude Code skill that adds structured thinking — like giving the LLM a prefrontal cortex.</b><br>
  Multi-perspective divergence · Multi-scenario simulation · Self-evolving pipeline · MMA memory
</p>

<p align="center">
  <sub>Inspired by Free Energy Principle · HyperNEAT · Active Inference · 易经 · 荀子 · 庄子</sub>
</p>

<br>

> 🌐 中文用户请查看 [README_CN.md](./README_CN.md)
> 📦 [Releases](https://github.com/ljjluke/mcts-skill/releases)

---

## Install

```bash
/plugin marketplace add https://github.com/ljjluke/mcts-skill
/plugin install luke
```

Then type:

```
/luke:ponder <your question>
```

---

## Pipeline

9 phases, sub-agent enforced (cannot skip, cannot collapse):

```
Step 1 (you, interactive) → interview → 5-dimension profile → memory recall
    ↓
Step 2~5 (Workflow pipeline, autonomous):
  ┌─ 6-perspective divergence (system · micro · short · long · flow · selfless)
  ├─ Bagua Mirror 8-dimension check (force · foundation · change · penetration · risk · dependency · boundary · balance)
  ├─ DMN incubation (free association between structured phases)
  ├─ Multi-scenario simulation (parallel sub-agents, each with real WebSearch data)
  ├─ Social cognition debate (optimist · pessimist · contrarian → argue → rebut → revise)
  ├─ Convergence + somatic-marker weighted conclusion + 5-question self-check
  ├─ Hierarchical prediction (top-down prediction error computation)
  ├─ Independent verification (fresh context, adversarial audit)
  └─ Embodied action proposal (concrete action + expected outcome)
    ↓
Self-evolution: free_energy > 0.4 → data-driven pipeline mutation (weights / order / parallel)
```

Self-correcting loop: verification fails → repair loop (max 2 rounds) → fix specific steps → re-verify.

---

## Memory Architecture

| Layer | Timescale | What it does |
|-------|-----------|-------------|
| Triple Burner | seconds~min | Working memory cache (7±2 chunks) |
| Session Context | min~hours | Cross-analysis accumulation, step performance tracking |
| MMA Meridian | days~months | Permanent knowledge storage (12 meridians + 8 vessels) |

**MMA** stores knowledge as acupoints with: emotion-gated consolidation (joy +8, fear +15), source reliability tracking (firsthand 1.0 → hearsay 0.2), NREM→REM sleep consolidation cycles, tag-indexed retrieval (O(1) lookup).

```bash
# Check memory
node scripts/mcts.js mma status
node scripts/mcts.js mma deqi '{"tags":["<keyword>"],"limit":5}'
```

---

## Self-Evolution

No LLM decides what to change — statistics do.

```
free_energy = verify_fail×0.4 + self_check_fail×0.3 + prediction_error×0.3

> 0.4? → pipeline.js recommend-mutation (from historical success rates)
       → execute: weight_adjust / disable_step / change_order / insert_step / parallelize
       → record-mutation → MMA remembers for next round
```

All local. No data leaves your machine. `pipeline-meta.json` lives in `~/.claude/data/skills/mcts-td-planner/`.

---

## Theoretical Roots

| Idea | Applied as |
|------|-----------|
| Friston Free Energy Principle | Free energy drives topology mutation |
| HyperNEAT topology evolution | weight_adjust, insert_step, parallelize |
| TD Learning + Welford | Value update, confidence tracking |
| 易经 (I Ching) | 变易/不易 — change/unchanging meta-rule |
| 荀子 劝学 | Step-by-step accumulation (session context) |
| 王阳明 知行合一 | Analysis and action as one loop |
| 庄子 逍遥游 | Multi-perspective free divergence |

---

<p align="center">
  <b>Not a tool you use. A brain you raise.</b><br>
</p>
