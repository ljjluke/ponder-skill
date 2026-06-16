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

> **`/luke:ponder` = Step 1(你来做) → Pipeline(Workflow强制) → 呈现结果**
> Steps 2-5 由 workflow 脚本强制执行，LLM 无法跳过。

## ⚙️ 架构

5步中Step 1是交互式的（你需要向用户提问），Steps 2-5由`scripts/ponder-pipeline.wf.js`以子Agent管道形式强制执行。

**管道强制机制**：
- 每步由一个独立子Agent执行，通过 JSON Schema 约束输出格式
- 前一步输出未完成→后一步不会启动（代码控制，不是prompt")
- 子Agent不能跳过、不能合并、不能取巧

---

## 流程

### Step 1: 交互式访谈（你做）

**入口**：用户原始请求

做3步访谈，输出五维画像。这个阶段需要你和用户对话。

**3步访谈**：
```
① 复述用户需求 → 问："是这样吗？还有什么补充？"
② 问："你之前尝试过什么方法？考虑过什么方向？"
③ 问2-3个关键约束（用 AskUserQuestion 选项式提问）
```

**出口画像**（必须包含全部5维评分）：
```
天(Timing)= ?/10    地(Resources)= ?/10
人(People)= ?/10    法(Rules)= ?/10
物(Essence)= ?/10
待澄清: [追问列表]
```

⛔ 用户未回答约束→不能输出完整画像→不能进入Pipeline。

---

### Step 2-5: 启动强制管道

Step 1 完成后，用 Workflow 工具启动管道：

```
Workflow({scriptPath: 'scripts/ponder-pipeline.wf.js', args: {
  user_request: '<用户原始请求>',
  step1: '<Step1画像输出>'
}})
```

管道内部结构：
- `phase('6尺度发散')` — 子Agent执行6视角发散，受 STEP2_SCHEMA 约束（6视角 × 每视角20+40字）
- `phase('八卦镜8维')` — 子Agent执行8维度检查，受 STEP3_SCHEMA 约束（8维 × 每维30字 + 3组冲突）
- `phase('多场景推演')` — 子Agent执行3场景推演，受 STEP4_SCHEMA 约束（2方向 × 3场景）
- `phase('收敛自检')` — 子Agent执行自检5问，受 STEP5_SCHEMA 约束（5问全部通过才 all_clear=true）

**你不能手动执行 Steps 2-5**。必须通过 Workflow 工具启动管道。管道会返回结构化结果。

---

### 呈现结果

Workflow 返回后，将结构化结果转换为用户可理解的语言：

```
╔═══════════════════════════════════════════╗
║  分析完成                                 ║
╚═══════════════════════════════════════════╝

[结论] — 用日常语言输出，不出现框架术语
推理链: [从发散→检查→推演到结论的简要过程]
如果判断错了: [反向假设]

自检结果: [全部通过/有风险(说明)]
```

---

## FORBIDDEN

- 跳过 Step 1 直接启动 Pipeline（没有用户访谈就做分析是无效的）
- 手动执行 Steps 2-5（必须通过 Workflow，不能自己假装做完了）
- 输出框架术语（MCTS/Schema/Agent/UCB 等）
- 运行 shell 命令
- 在用户未回答约束前进入下一步

---

## Memory

- **Knowledge**: decision results, insights, patterns → auto-stored via SessionEnd hooks
- **Profile**: preferences, habits → loaded via SessionStart hooks
- **Session-end**: hooks auto-run decay + finalize. No explicit action needed.
- **Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
