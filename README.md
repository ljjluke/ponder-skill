<p align="center">
  <img src="https://img.shields.io/badge/version-1.15.2-blue?style=flat-square" alt="version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="license">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="status">
</p>

<h1 align="center">🧠 Ponder</h1>

<p align="center">
  <b>A cognitive analysis framework for Claude Code.</b><br>
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
┌─ You ask a question ─────────────────────────────────┐
│                                                       │
│  Interview → Divergence → Dimension → Plans           │
│           → Simulation → Debate → Synthesis → Verify  │
│                                                       │
│  Each step: clear? → proceed. Unclear? → loop deeper. │
│  Final: data-backed conclusion → stored as lesson.    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 🎯 Core Differentiators

| | Feature | Why It Matters |
|---|---|---|
| 🎯 **Data-driven** | Every claim requires a source. LLM never fabricates. |
| 🔄 **Code-enforced depth loop** | Not clear? Loop deeper. No cap. LLM cannot skip. |
| 🚫 **Step enforcement** | All 7 phases mandatory. Code checks, not prompt rules. |
| 💡 **Error convergence** | Records failures → avoids repeating → gets smarter. |
| 🌍 **Domain-agnostic** | Finance, medicine, strategy, tech — same framework. |
| 🧘 **Ancient Chinese philosophy** | Zhuangzi's perspectives, I-Ching's Bagua, 5-element profile. |

<br>

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ORCHESTRATOR (LLM)                            │
│  Interview → Call Workflow → Present → Store lessons                │
│  Role: translate between user and pipeline. No analysis by LLM.     │
├─────────────────────────────────────────────────────────────────────┤
│                     PONDER PIPELINE (Code-enforced)                   │
│                                                                       │
│      Divergence ──→ Dimension ──→ Plans ──→ Simulation(parallel)     │
│          │              │            │            │                   │
│      ←clear?──┐    ←clear?──┐   ←clear?──┐   (no loop needed)      │
│          │    ↓        │    ↓       │    ↓                           │
│      ┌──┴──┐     ┌──┴──┐     ┌──┴──┐                                │
│      │loop │     │loop │     │loop │                                  │
│      └─────┘     └─────┘     └─────┘                                  │
│                                                                       │
│      Debate ──→ Synthesis ──→ Verify ──→ Done                        │
│      │             │             │                                    │
│   ←clear?──┐   ←clear?──┐   (one pass)                               │
│      │    ↓       │    ↓                                              │
│   ┌──┴──┐    ┌──┴──┐                                                  │
│   │loop │    │loop │                                                    │
│   └─────┘    └─────┘                                                  │
│                                                                       │
│  Each loop: carries forward user_questions. Max 5 rounds.             │
├─────────────────────────────────────────────────────────────────────┤
│                     ERROR CONVERGENCE (Background)                     │
│  Captures failures from sessions → deduplicates → stores lessons     │
│  Runs continuously via SessionStart hook.                            │
└─────────────────────────────────────────────────────────────────────┘
```

<br>

---

## 🔄 The Thinking Circuit

### Phase 1: Requirements Decomposition

```
AskUserQuestion spiral interview → covers 5 dimensions:
  天时(Timing) · 地利(Resources) · 人和(People) · 法(Rules) · 本质(Essence)

Output: profile + pending assumptions
```

### Phase 2: Analysis (Single Workflow Call)

All 7 phases run inside `ponder-pipeline.wf.js`. The LLM calls it once and waits.

| Phase | What It Does | Key Fields |
|-------|-------------|------------|
| **Divergence** | 6 perspectives from different angles | `data_source`, `assumption` |
| **Bagua Mirror** | 8-dimension systematic scoring | `evidence`, `uncertainty` |
| **Plans** | 5-8 concrete actionable plans | `condition`, `condition_verified` |
| **Simulation** | Each plan independently simulated (parallel) | `optimistic`, `neutral`, `pessimistic` |
| **Debate** | Plans ranked and cross-examined | `pros`, `cons`, `synthesis` |
| **Synthesis** | Final conclusion + reasoning chain | `conclusion`, `reasoning`, `pending_user_questions` |
| **Verification** | Independent review for flaws | `verdict`, `issues`, `fake_clarity` |

Every phase outputs:
- `is_clear` — is the result clear enough to proceed?
- `user_questions` — specific unknowns discovered during this phase

### Depth Loop (Code-Enforced)

No `while`/`for` loops (Workflow parser limitation). Unrolled as sequential `if` statements:

```
Round 1 → is_clear? → yes → proceed
       → no → carry user_questions to →
Round 2 → is_clear? → yes → proceed  
       → no → carry questions to →
...
Round 5 → last round → proceed regardless
```

The LLM cannot skip, reduce rounds, or ignore `user_questions`.

### Phase 3: Confirmation Before Delivery

Before presenting results, the LLM **must** check:
- `pending_user_questions` from the pipeline → ask the user
- Red lines / conditions → have they been triggered? → ask
- Assumptions → does the user agree? → ask

Only after confirmation → present final conclusion.

<br>

---

## 💡 Error Convergence (Not a Memory System)

This is **not** a general-purpose memory. It records **what failed** so it's never repeated.

```
Decision → Outcome → Stored as lesson
                      ↓
Next similar situation → Check past failures → Exclude known bad paths
                                                ↓
                                          Less trial and error over time
```

### Lesson Format

```
Scenario: what was happening
Attempt: what was tried
Conditions: key factors
Root cause: why it failed
Alternative: what to do instead
```

### Storage Rules

- ✅ Failures, mistakes, corrections
- ❌ Market prices, statistics, news (they expire)
- ❌ User preferences (just ask directly)
- ❌ Model knowledge (LLM already knows)

The background daemon (`memory-monitor.js`) runs from session start to end, auto-capturing lessons and merging duplicates (newer/better info replaces older entries).

<br>

---

## 🧘 Philosophical Grounding

| Concept | Origin | Application |
|---------|--------|-------------|
| 鲲鹏之视 (Peng's View) | Zhuangzi · Free Wandering | Macro perspective |
| 蜩鸠之视 (Cicada's View) | Zhuangzi | Micro/detail perspective |
| 朝菌之视 (Morning Mushroom) | Zhuangzi | Short-term perspective |
| 冥灵之视 (Eternal Tree) | Zhuangzi | Long-term perspective |
| 八卦镜 (Bagua Mirror) | I Ching | 8-dimension cross-check |
| 天时/地利/人和 | Chinese strategy | User profile dimensions |

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
/luke:ponder Analyze this startup competitive landscape
/luke:ponder Compare remote work vs office work productivity
```

<br>

---

## 📁 Project Structure

```
ponder-skill/
├── SKILL.md                    # Orchestrator instructions (45 lines, minimal)
├── scripts/
│   ├── ponder-pipeline.wf.js   # 7-phase analysis engine w/ depth loop
│   └── memory-monitor.js       # Error convergence background daemon
├── hooks/
│   └── hooks.json              # Session lifecycle (start/end)
├── engine/
│   ├── mcts-simulate.md        # MCTS + CLT-UCB algorithm reference
│   └── td-learner.md           # TD(lambda) learning reference
├── .claude-plugin/
│   └── marketplace.json        # Plugin registry
└── pipeline-meta.json          # Step weights & evolution tracking
```

<br>

---

## 📊 Maturity

| Component | Status | Description |
|-----------|--------|-------------|
| Pipeline engine | ✅ **Active** | 7 phases, depth loop, data-enforced |
| Error convergence | ✅ **Active** | Background daemon, merge/update logic |
| MCTS tree search | ⏳ Dormant | Code exists, not wired to pipeline |
| TD(lambda) learning | ⏳ Dormant | Weight registry exists, never triggered |
| Self-evolution | ⏳ Dormant | Pipeline meta tracking ready, not active |

<br>

---

<p align="center">
  <sub>Cognitive framework for Claude Code · Built with ❤️ · Not a prompt, a brain</sub>
</p>
