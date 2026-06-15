---
name: ponder
alwaysApply: false
description: |
  Universal thinking framework — MCTS tree search + TD learning + Eight-Facet Mirror.
  Activated by /luke:ponder. Full phased output for ANY request.
  Language adaptive. 五诊需求对齐 → 八卦发散 → 多方案收敛 → MCTS推演 → 决策报告.
version: 1.10.0
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` 触发即全流程。无决策点检测门 — 任何需求都走完整框架。**

## ⚡ EXECUTION STRATEGY

**`/luke:ponder` 被调用 → ALWAYS full framework. No gate. No "0 decision points" bypass.**

```
/luke:ponder <任何需求>
  → 完整框架介入 → 按阶段输出
```

这是一个**通用思维框架**，不是只做"方案选择"。扫描项目、分析问题、评估风险、设计方案——任何需要思考的需求都适用。

核心哲学：**先发散后收敛** — 跳出领域框架找到所有可能性 → 再用 MCTS 逐个推演 → 留下适用的。

## 📐 PHASED FLOW (MANDATORY — 按序输出)

```
Step 0   动静(Dong-Jing) MODE (動/Dong=精简 / 靜/Jing=完整)
Step 0.5 五診(Wuzhen) 需求画像 — 5维度, 与用户对齐需求, 任何 <7 → ASK
Step 0.5b 本末(Ben-Mo)/有无(You-Wu)/张力(Tension) (AFTER Wuzhen, MANDATORY)
Step 1   八卦镜(Eight-Facet Mirror) 发散 — 8个视角 × 跨界联想, 跳出领域框架
Step 1.5 信息缺口补全 — 与用户对齐, 补全盲区 (任何 facet <7 → ASK)
Step 2   侦查报告(Reconnaissance Report) — 发现 + 交叉验证
Step 3   多方案列表(Solution List) — 数量不限, 发散充分
Step 3   收敛(Converge) — 适用的才是最好的, 筛选后 ≤10 个进入 MCTS
Step 3   MCTS 推演 — 每轮 4 阶段: Selection→Expansion→Simulation→Backprop
Step 3.5 自检(Self-Check) — 找漏洞 + 反向思考 + 风险评估
Step 3.6 盲区审计 + 言意(Yan-Yi) Gap
Step 4   决策报告(Decision Report) — 排序 + 自检 + TD 写回
```

## 📏 CONTEXT BUDGET

| Rule | Description |
|------|-------------|
| **Dong mode** | 每阶段输出 ≤500 chars, MCTS 3-5轮, 跳过 Round 3 变化分析, 交叉关联仅 Top-2 |
| **Jing mode** | 完整输出, Round 3+ 使用紧凑格式(一行摘要) |
| **CLI call batching** | 同一阶段合并多个 CLI 调用; 语言检查仅在 Phase 4 final |
| **Engine file on-demand** | 只加载当前阶段的引擎文件, 不预读后续文件 |
| **Context pressure** | 输出截断或响应变慢 → 自动切换 Dong 模式 |
| **MCTS round compression** | Round 1-2: 完整4阶段 | Round 3+: "Round N: Selected [path], V=X, n=N" |

**Dong mode 模板** (每阶段 ≤500 chars):
```
[Phase Name] Key: [1-2 bullet points]
Scores: F1=8 F2=4↓ F3=7 F4=5↓ F5=9 F6=6 F7=8 F8=7
Action: [next step]
```

## ⛔ FORBIDDEN

- **跳过任何阶段** — 即使需求看起来"简单", 也必须走完整流程
- **声称"不需要框架"** — `/luke:ponder` 被调用 = 用户要求使用框架
- **内化完成不输出** — 每个阶段必须对用户可见
- MCTS 只输出最终 V/n/σ² 无每轮细节
- Dong 模式下冗长输出(超出上下文预算 = VIOLATION)
- **方案数量预先设限** — 发散阶段不限量, 收敛后才筛选到 ≤10
- **只在领域内思考** — 发散阶段必须跨界联想, 跳出当前领域框架

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 🔒 COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **OUTPUT IN USER LANGUAGE** | **PHASED (0→0.5→0.5b→1→1.5→2→3→3.5→4)** | **先发散后收敛** | **≤10方案入MCTS** | **Dong-Jing CHECK FIRST** | **五诊对齐需求** | **八卦跨界联想** | **CONTEXT BUDGET**

---

## 🌐 Language Guard

① DETECT 用户语言 → ② 内部英文思考 → ③ 输出用户语言 → ④ Phase 4 最终检查

---

## 📄 Engine File Routing

| Phase | File | Key Content |
|-------|------|-------------|
| Step 0-0.5b | `engine/mcts-constraint.md` | Dong-Jing, Wuzhen, Ben-Mo/You-Wu/Tension, constraints |
| Step 1-2 | `engine/mcts-diverge.md` | Eight-Facet(+Ti-Yong+Li-Shi), info gap, converge(+One-Many) |
| Step 3 | `engine/mcts-simulate.md` | MCTS 4-phase, UCB, mutation, body-use, ≤10 solutions |
| Step 3.5-4 | `engine/mcts-converge.md` | Ranking(+body-use), self-check(+Ben-Mo+Dong-Jing), blindspot(+Yan-Yi), TD(+Li-Shi) |
| Post-4 | `engine/td-learner.md` | TD error, value update, knowledge lifecycle |
| Always | `agents/memory-agent.md` | 6 checkpoints (direct-call, conflict alert only) |

**⚠️ 每个引擎文件对其阶段自包含 — LLM 可以不调用 guard 命令直接执行该阶段。**

Shorthand: `node scripts/mcts_guard.js phase-rules --phase <0|1|2|3>`

---

## 🧠 Memory Agent (direct-call, 6 checkpoints)

LLM 直接调用 MMA 命令。无守护进程。无缓冲区。

① pre_engine: `mma deqi` → ② during_diverge: `mma observe --phase during_diverge` → ③ post_simulate: `mma ashi` + `mma cluster`
③.5 complete: fill _needs_completion → ④ pre_converge: `mma observe --phase pre_converge` (ALERT if conflicts)
⑤ post_execution: `mma observe --phase post_execution` (TD + decay) → ⑥ session_end: `mma session-end` with session point IDs

Session tracking: LLM 收集每个 ashi 返回的 point ID, 传给 session-end.
完整规则: `agents/memory-agent.md`

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete that directory to reset.
