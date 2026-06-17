<p align="center">
  <img src="https://img.shields.io/github/v/release/ljjluke/mcts-skill" alt="version">
  <img src="https://img.shields.io/badge/status-stable-green" alt="status">
  <img src="https://img.shields.io/badge/license-MIT-yellow" alt="license">
</p>

<h1 align="center">🧠 MCTS-TD Cognitive Pipeline</h1>

<p align="center">
  <b>A locally-trained cognitive infant for Claude Code.<br>
  Each user trains their own brain — no central model, no data upload.</b>
</p>

<br>

> 🌐 中文用户请查看 [README_CN.md](./README_CN.md)

---

## What It Is

A Claude Code skill that adds a structured cognitive pipeline — 6 perspectives, 8 dimensions, multi-scenario simulation, self-evolution — all running locally, each user training their own instance.

```
/luke:ponder → interview → pipeline (sub-agent enforced) → data-driven evolution
```

---

## Install & Upgrade

```bash
# Install
/plugin marketplace add https://github.com/ljjluke/mcts-skill
/plugin install luke

# Upgrade
/plugin marketplace update luke
/plugin install luke
/reload-plugins

# Gitee (CN mirror)
/plugin marketplace add https://gitee.com/luke2438107466/mcts-skill
/plugin install luke
```

> See [Releases](https://github.com/ljjluke/mcts-skill/releases) for version history.
>
> Memory data: `~/.claude/data/skills/mcts-td-planner/` — physically separate from skill code. Safe across upgrades.

---

## Pipeline Architecture

### 9-Phase Workflow (sub-agent enforced)

| # | Phase | Function | Brain Analog |
|---|-------|----------|-------------|
| 2a | 6-perspective divergence | Multi-scale observation: system → micro → time-compressed → time-expanded → flow → selfless | DMN (Default Mode Network) |
| 2b | Bagua Mirror 8-dimension | Force / Foundation / Change / Penetration / Risk / Dependency / Boundary / Balance | PFC (Prefrontal Cortex) |
| 2c | DMN Incubation | Unstructured free association between structured phases | DMN Resting State |
| 3 | Multi-scenario simulation | Parallel sub-agents, each independently simulating one direction with real data (WebSearch) | Motor Cortex Planning |
| 3b | Social Cognition Debate | 3 agents (optimist / pessimist / contrarian) argue → rebut → revise | TPJ / mPFC |
| 4 | Convergence + Self-Check | Somatic-marker-weighted conclusion + 5-question mandatory self-check | Anterior Cingulate |
| 4b | Hierarchical Prediction | Top-down: conclusion predicts lower-level patterns → compute prediction error | Neocortex L6→L2 |
| 5 | Independent Verification | Fresh-context agent, adversarial audit — tries to prove the analysis wrong | PFC Error Monitor |
| 5b | Embodied Action | Concrete action proposal + expected outcome + observation signal | Motor→Sensory Loop |

Each phase runs as an independent sub-agent. Output is constrained by JSON Schema — no skipping, no collapsing.

### Self-Correction Loop

When verification fails, the pipeline enters a **repair loop** (max 2 iterations): failed steps are re-executed with targeted fix context from the verifier.

---

## Self-Evolution

The pipeline evolves itself based on usage. **No LLM decides what to change — statistics do.**

```
free_energy = verification_fail_rate × 0.4 + self_check_fail_rate × 0.3 + prediction_error × 0.3

if free_energy > 0.4:
  → pipeline.js recommend-mutation    # from historical success rates
  → execute mutation                  # weight_adjust / disable_step / change_order / insert_step / parallelize
  → record-mutation + write to MMA    # next mutation will reference this history
```

Evolution is **local** — pipeline-meta.json lives in `~/.claude/data/skills/mcts-td-planner/`, independent of plugin updates.

```bash
# View evolution status
node scripts/pipeline.js status

# Recommend mutation type based on history
node scripts/pipeline.js recommend-mutation

# View mutation history
node scripts/pipeline.js mutation-history
```

---

## Three Memory Layers

| Layer | Timescale | Location | Function |
|-------|-----------|----------|----------|
| Triple Burner | seconds~minutes | working_memory.json | Immediate recall cache (7±2 chunks) |
| Session Context | minutes~hours | session-context.json | Cross-analysis accumulation, step performance tracking |
| MMA Meridian | days~months | shards/*.json | Permanent knowledge consolidation |

### MMA Meridian Memory

12 meridians + 8 extraordinary vessels. Inspired by Yellow Emperor's Inner Canon (《黄帝内经》).

| Mechanism | Description |
|-----------|-------------|
| Deqi recall | Tag-based retrieval with emotional priming and Ziwu Liuzhu context activation |
| Ashi insert | Emotion-gated writing: emotion present → q=0.6, no emotion → q=0.3 (harder to consolidate) |
| Emotion modulation | kong(fear)+15, jing(shock)+12, nu(anger)+10, xi(joy)+8 consolidation boost |
| Sleep consolidation | NREM slow-wave pruning → NREM strengthening → REM cross-domain linking → synaptic homeostasis |
| Tag index | O(1) tag→point lookup, auto-rebuilt on save |
| Source monitoring | 7-level reliability: firsthand(1.0) → hearsay(0.2) |
| State machine | HYPOTHESIS → PROVISIONAL → CONFIRMED → DISPUTED → REFUTED → SLEEPING → ARCHIVED |

```bash
# View memory status
node scripts/mcts.js mma status

# Recall knowledge by tags
node scripts/mcts.js mma deqi '{"tags":["<keyword>"],"limit":5}'

# Insert knowledge
node scripts/mcts.js mma ashi '{"description":"...","tags":["..."],"emotion":"xi"}'

# View session context (cross-analysis memory)
node scripts/mcts.js mma session-context status

# Extract session insights for MMA consolidation
node scripts/mcts.js mma session-context extract
```

---

## Built-in Attention Mechanism

Selective focus via competitive inhibition (inspired by thalamic TRN):

```bash
node scripts/mcts.js compute attention-gate --dimensions '[
  {"name":"timing","score":3,"criticality":0.9},
  {"name":"resources","score":7,"criticality":0.6},
  {"name":"people","score":5,"criticality":0.4}
]'
# Returns ranked dimensions with inhibition values.
# Top 1 gets full attention; others are progressively suppressed (quadratic).
```

---

## Unified CLI

```bash
node scripts/mcts.js <engine> <command> [args...]

compute   — UCB/rank/attention-gate/status-transition/mutation-vector
guard     — 9 compliance guards (decomposition / diversity / self-check / ...)
mma       — Meridian Memory (deqi / ashi / reinforce / decay / session-end / session-context)
tree      — MCTS tree CRUD (init / select / add-children / simulate / backprop)
template  — Markdown rendering (portrait / review-map / decision-report)
pipeline  — Self-evolution meta management (status / recommend-mutation / mutation-history)
```

Cross-platform wrappers:
```bash
./mcts.sh <engine> <command>    # Bash (Linux/macOS/Windows Git Bash)
mcts.cmd <engine> <command>     # Windows CMD
```

---

## Theoretical Foundations

| Framework | Application | Source |
|-----------|------------|--------|
| Free Energy Principle | Free energy drives architecture mutation | Friston (2025) *Active Inference and Intentional Behavior* |
| HyperNEAT | Topology mutation (weight_adjust, insert_step, parallelize) | GECCO 2024 *Tensorized NeuroEvolution* |
| TD Learning | Value update, Welford variance, eligibility trace | Sutton & Barto *Reinforcement Learning* |
| Active Inference | Prediction → perception → action loop | Friston et al. *Neural Computation* 2025 |
| 易经 (I Ching) | 变易="change" signal, 不易="minimize free energy" meta-rule | |
| 荀子 "积" | Step-by-step accumulation, session context | Xunzi *劝学* |
| 王阳明 "知行合一" | Unity of analysis and action | Wang Yangming *传习录* |
| 庄子 "逍遥游" | Multi-perspective free wandering divergence | Zhuangzi *齐物论* |

---

<p align="center">
  <b>Not a tool you use. A brain you raise.</b><br>
  <i>Powered by Free Energy Principle · HyperNEAT · Active Inference · 易经</i>
</p>
