<p align="center">
  <img src="https://img.shields.io/badge/version-1.18.13-blue?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="status">
</p>

<h1 align="center">🧠 Ponder</h1>

<p align="center">
  <b>A self-evolving cognitive framework for Claude Code.</b><br>
  <i>Data-driven · Code-enforced · Self-evolving</i>
</p>

<p align="center">
  <a href="README_CN.md">🇨🇳 中文</a>
  &nbsp;·&nbsp;
  <code>/luke:ponder &lt;your question&gt;</code>
</p>

<br>

---

## ✨ What Makes Ponder Different

Most LLM tools answer immediately — and miss the mark. Ponder activates a **complete thinking circuit** before answering. Every step is **code-enforced**, not prompt-suggested.

```
┌─ You ask a question ────────────────────────────────┐
│                                                      │
│  Interview → Orchestrator → Pipeline(7 phases)       │
│           → Store → Evolve → Next round is smarter   │
│                                                      │
│  Each step: clear? → proceed. Unclear? → loop.       │
│  Every run feeds back into the next.                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 🎯 Core Differentiators

| | Feature | Why It Matters |
|---|---|---|
| 🎯 **Data-driven** | Every claim requires a source. LLM cannot fabricate. |
| 🔄 **Code-enforced depth loop** | Not clear? Loop deeper. `is_clear` + question-count dual check prevents LLM cheating. |
| 🚫 **Step enforcement** | All 7 phases mandatory. Code checks, not prompt rules. |
| 💡 **Self-evolving** | `evolve.js` detects bottlenecks, generates fixes, auto-applies via rules. |
| 🏛️ **Ten Heavenly Stems framework** | 甲木→乙木→...→癸水 — domain-agnostic simulation with fixed weights, no LLM-decided scoring. |
| 🌪️ **Frame-breaking** | External anchor forces unexpected connections — not "think harder" |
| 🔍 **Falsification gate** | Must find evidence against own conclusion or go back. No fake confidence. |
| 🧠 **MMA Memory** | Knowledge accumulates with use, context+emotion matching, multi-language. |
| 🔄 **Reconsolidation** | Recalled memory can be modified within 30min — like human brain |
| 🧹 **Knowledge grooming** | Unused auto-decays, low-quality sleeps, frequently used upgrades. |

<br>

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR (scripts/orchestrate.js)         │
│  before: loads rules + history + error warnings → passes to pipeline │
│  after:  stores step outputs + collects metrics + grooming           │
├─────────────────────────────────────────────────────────────────────┤
│                     PONDER PIPELINE (7 Phases)                        │
│                                                                       │
│      Divergence ──→ Dimension ──→ Plans ──→ Simulation(parallel)     │
│      (6perspectives)  (8 dimensions)   (5-8plans)  (Ten Stems × N)  │
│          │                │               │              │           │
│          ←───   Depth Loop (is_clear + questions check)  ───→        │
│                                                                       │
│      Debate ──→ Synthesis ──→ Verification ──→ Output                │
│      (ranked)   (conclusion)   (independent)                         │
│                                                                       │
│      Each step: loads top-3 historical matches from MMA              │
├─────────────────────────────────────────────────────────────────────┤
│                     SELF-EVOLUTION (scripts/evolve.js)                 │
│  Reads metrics → detects bottlenecks → auto-generates fixes         │
│  Clarity scoring: is_clear×20% + questions×25% + field_fill×30%     │
│                   + verification×25% (not just LLM self-assessment)  │
│  Auto-fix: generates prepend_step rules → deploy/rollback           │
├─────────────────────────────────────────────────────────────────────┤
│                     MMA MEMORY (Meridian Memory Algorithm)            │
│  Stores step history with natural language (not JSON)                │
│  Semantic matching with Chinese/Japanese/Korean support              │
│  Knowledge grooming: unused → decay, low-quality → sleep,            │
│                      frequent → auto-promote                         │
│  Step history: 72 entries across all 7 steps                         │
└─────────────────────────────────────────────────────────────────────┘
```

<br>

---

## 💬 Requirement Refinement — What You Say ≠ What You Need

Most users describe symptoms, not root causes. The first phase of this framework **grills your requirements until they make sense**.

```
You: "Help me pick a code editor"
  ↓ Interview phase
Framework: What kind of project? Team size? Top priority?
  ↓
You: "Actually I don't need a tool, I need to catch up on a delayed project"
  ↓ Requirements clarified, analysis stays on track
```

Not a one-shot questionnaire — it probes, follows up, and keeps drilling until the picture is clear.
If 15 rounds aren't enough, it keeps going. No cap.
You don't need to know what you want before asking — that's the framework's job.

## 🔄 How Memory Works

```
Each step executes → orchestrate.js step() saves output to MMA →
  (natural language, not JSON — semantic matching ready)

Next similar question → each step independently queries:
  1. recallStepHistory() — loads 20 candidates for that step
  2. LLM filters → top 3 most relevant
  3. Injects into step prompt

Data accumulates → more candidates → better top-3 → more accurate
```

### Memory Format

Step history is stored in natural language (extracted from structured outputs):

```
[step:divergence] 技术选型: React在大型项目中更有优势,Vue在中小项目中效率更高
[step:dimension] 市场分析: 竞争加剧导致获客成本上升,差异化是关键
[step:simulation] 方案A: 木0.85→火0.78→土0.82→金0.75→水0.68 → V=0.78
```

Not JSON — so semantic matching works across Chinese, English, Japanese, Korean.

<br>

---

## 🔄 How Self-Evolution Works

```
evolve.js analyze() →
  Reads 35+ pipeline runs from metrics
  Groups by question type (技术选型, 市场分析, 学习规划...)
  Computes verified clarity per step per type
  
  Detects problems:
    clarity < 70% → generates auto-fix
    questions > 2 → suggests pre-interview
    patterns → creates prepend_step rules
  
  auto-fix → written to auto-fixes/ → deploy-fix → evolve-rules.json
                                    → rollback-fix → removed
```

### Clarity Assessment (Not LLM Self-Judgment)

```
verifiedClarity = is_clear × 20% (lowest weight, LLM can lie)
                + question_penalty × 25% (behavioral signal)
                + field_fill_rate × 30% (objective structural check)
                + verification × 25% (independent verifier judgment)
```

The clarity score is NOT what the LLM says — it's a multi-signal composite that the LLM cannot manipulate.

### Ten Heavenly Stems Simulation Framework

```
Fixed 10-dimension evaluation (domain-agnostic):
  阳干(×1.0): 甲木规划, 丙火推进, 戊土产出, 庚金效率, 壬水应变
  阴干(×0.8): 乙木执行, 丁火调整, 己土品质, 辛金精简, 癸水储备

V = Σ(achievement × weight) / Σ(weight)
  achievement = LLM simulates process, not self-judgment
  weights = fixed by yin-yang, not LLM-decided
```

<br>

---

## 🧘 Philosophical Grounding

| Concept | Origin | Application |
|---------|--------|-------------|
| 十天干 (Ten Heavenly Stems) | Chinese Calendar | 10-dimension simulation evaluation |
| 五行 (Five Elements) | Chinese Philosophy | Phase relationships for weight derivation |
| 阴阳 (Yin-Yang) | Taoism | Active/passive dimension splitting (阳=1.0, 阴=0.8) |
| 八卦镜 (Bagua Mirror) | I Ching | 8-dimension cross-check |
| 天时/地利/人和 | Chinese Strategy | User profile dimensions |

<br>

---

## 🚀 Quick Start

```bash
# Install
/plugin marketplace add https://github.com/ljjluke/ponder-skill
/plugin install luke

# Use — any domain
/luke:ponder Analyze the current market situation
/luke:ponder Help me plan my Python learning path
/luke:ponder 帮我分析这个项目的技术选型
/luke:ponder Evaluate which marketing strategy to pursue
/luke:ponder Help me decide between treatment options for a patient
/luke:ponder Compare investment portfolio strategies
```

### Custom Data Directory

```bash
# Linux / macOS
export PONDER_DATA_DIR=/mnt/nas/my-knowledge
PONDER_DATA_DIR=/mnt/nas/my-knowledge claude

# Windows (PowerShell)
$env:PONDER_DATA_DIR = "D:\my-knowledge"
claude
```

Default: `~/.claude/data/skills/ponder/`

<br>

---

## 📁 Project Structure

```
ponder-skill/
├── SKILL.md                    # Orchestrator instructions
├── scripts/
│   ├── step-shensi.wf.js       # Step 1: Frame-breaking (counter-intuitive)
│   ├── step-divergence.wf.js   # Step 2: Divergence (6 perspectives)
│   ├── step-bagua.wf.js        # Step 3: Dimension (8 dimensions)
│   ├── step-plans.wf.js        # Step 4: Plans (5-8 plans)
│   ├── step-converge.wf.js     # Step 5: Converge (eliminate weak plans)
│   ├── step-simulate.wf.js     # Step 6: Simulate (parallel 10 stems)
│   ├── step-debate.wf.js       # Step 7: Debate (ranking + refutation)
│   ├── step-synthesis.wf.js    # Step 8: Synthesis (conclusion + risk)
│   ├── orchestrate.js          # Before/after orchestrator
│   ├── evolve.js               # Self-evolution engine
│   ├── knowledge.js            # Memory: store/recall/semantic matching
│   ├── pipeline-metrics.js     # Run metrics collector
│   └── mma/                    # Meridian Memory Algorithm
│       ├── decay.js            # Knowledge grooming
│       ├── deqi.js             # Recall engine
│       ├── reinforce.js        # Value update
│       └── io.js               # Persistent storage with shard locking
├── hooks/hooks.json            # Session lifecycle
├── scripts/evolve-rules.json   # Verified evolution rules
└── pipeline-meta.json          # Step weights & evolution tracking
```

<br>

---

## 📊 Maturity

| Component | Status | Description |
|-----------|--------|-------------|
| 8-step pipeline | ✅ **Active** | Divergence → Dimension → Plans → Simulate → Debate → Synthesize → Verify |
| Ten Stems simulation | ✅ **Active** | Parallel agent simulation with fixed-weight V scoring |
| MMA memory | ✅ **Active** | Knowledge grows with use, semantic matching, knowledge grooming |
| Self-evolution | ✅ **Active** | `evolve.js` detects bottlenecks, auto-generates fixes, deploys rules |
| Semantic matching | ✅ **Active** | Chinese/Japanese/Korean support, natural language format |
| Knowledge grooming | ✅ **Active** | Unused decay, low-quality sleep, frequent promote |
| Orchestrator | ✅ **Active** | `orchestrate.js before/after` — LLM has no room to forget |
| MCTS tree search | ⏳ **Available** | Code in `mcts_tree.js`, not yet wired to pipeline |
| TD(lambda) learning | ⏳ **Available** | Weight registry exists, not yet triggered |
| Custom data directory | ✅ **Active** | `PONDER_DATA_DIR` env var support |

<br>

---

<p align="center">
  <sub>Cognitive framework for Claude Code · Built with ❤️ · Not a prompt, a brain</sub>
</p>
