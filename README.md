<p align="center">
  <img src="https://img.shields.io/github/v/release/ljjluke/mcts-skill" alt="version">
  <img src="https://img.shields.io/badge/status-stable-green" alt="status">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="license">
</p>

<h1 align="center">🧠 MCTS-TD Cognitive Pipeline</h1>

<p align="center">
  <b>A locally-trained cognitive infant.<br>
  Each user trains their own brain — no central model, no data upload.<br>
  Starts minimal. Grows with you. Thinks the way you teach it.</b>
</p>

<p align="center">
  <sub>Self-evolving pipeline · MMA memory · Free-energy-driven evolution · Multi-perspective divergence</sub>
</p>

<br>

> 🌐 中文用户请查看 [README_CN.md](./README_CN.md)

---

## ⚡ What It Is

This is not a decision tree. Not a prompt chain. It is a **cognitive infant** — a minimal thinking architecture that:

1. **Analyzes** any problem from 6 perspectives × 8 dimensions → multi-scenario simulation → convergence
2. **Remembers** everything via MMA meridian memory (episodic/semantic, emotion-gated, sleep-consolidated)
3. **Evolves itself** — free energy > threshold → data-driven mutation → pipeline changes for next use

Every user trains their own local instance. Your framework learns your patterns. No one else's.

---

## 🧬 Core Architecture

```
/luke:ponder →
  Step 1 (you ask user 3 layers) → 
  Workflow pipeline (9 phases, sub-agent enforced):

  6视角发散 ─→ 八卦镜8维 ─→ DMN间歇 ─→ 
  多场景推演(并行) ─→ 社会辩论 ─→ 收敛自检 ─→ 
  层级预测 ─→ 独立验证 ─→ 具身行动建议

  ↓ 每次执行后评估自由能
  free_energy > 0.4 → 数据驱动进化 → 管道变异
```

| Phase | Brain Analog | Function |
|-------|-------------|----------|
| 6视角发散 | DMN (Default Mode) | Multi-perspective free wandering |
| 八卦镜8维 | PFC (Prefrontal) | Structured dimension analysis |
| DMN间歇 | DMN Resting State | Unstructured free association |
| 多场景推演 | Motor Cortex Simulation | Parallel scenario planning |
| 社会辩论 | Social Cognition (TPJ) | Multi-stance argumentation |
| 收敛自检 | Anterior Cingulate | Self-monitoring + error detection |
| 层级预测 | Neocortex Layer 6→2 | Top-down prediction error |
| 独立验证 | Prefrontal error monitor | Fresh-context adversarial audit |
| 具身行动 | Motor→Sensory loop | Action proposal + outcome observation |

---

## 🧠 MMA Meridian Memory

12 meridians + 8 extraordinary vessels. Each acupoint = one knowledge entry.

| Mechanism | Brain Analog |
|-----------|-------------|
| Deqi recall | Hippocampal pattern completion |
| Emotion gating | Amygdala modulation |
| Sleep consolidation | NREM→REM replay cycles |
| Slow wave pruning | Synaptic homeostasis |
| Tag index lookup | Cortical indexing |
| Reconsolidation window | Memory update |

> All memory is LOCAL. `~/.claude/data/skills/mcts-td-planner/`

---

## 🔄 Self-Evolution

The pipeline evolves itself through use. No LLM decides what to change — statistics do.

```
每次 /luke:ponder:
  ├── free_energy = 验证失败率×0.4 + 自检失败率×0.3 + 预测误差×0.3
  ├── > 0.4? → recommend-mutation (从MMA历史统计中选最优)
  ├── 执行变异 (weight_adjust / disable_step / change_order / insert_step / parallelize)
  └── record-mutation → MMA记忆 → 下次推荐更准
```

No central training. No data upload. Your framework evolves from your usage.

---

## 🚀 Install

```bash
# GitHub (International)
/plugin marketplace add https://github.com/ljjluke/mcts-skill
/plugin install luke

# Gitee (China)
/plugin marketplace add https://gitee.com/luke2438107466/mcts-skill
/plugin install luke
```

> See [Releases](https://github.com/ljjluke/mcts-skill/releases) for version history.

## 🔄 Upgrade

```bash
/plugin marketplace update luke
/plugin install luke
/reload-plugins
```

---

## 🔌 Unified CLI

```
node scripts/mcts.js <engine> <command> [args...]

Engines:
  compute   — UCB/rank/attention-gate/status-transition
  guard     — 9 compliance guards
  mma       — Meridian Memory (deqi/ashi/reinforce/session-end)
  tree      — MCTS tree CRUD + persist
  template  — Markdown rendering
  pipeline  — Self-evolution meta management
```

---

<p align="center">
  <b>Not a tool you use. A brain you raise.</b><br>
  <i>Powered by Free Energy Principle · HyperNEAT · Active Inference · 易经</i>
</p>
