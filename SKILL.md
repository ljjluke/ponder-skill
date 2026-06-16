---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Activated by `/luke:ponder`. Every step mandatory. No skipping. No "too simple to process."
version: 1.12.3
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` → 完整流程必须走完。不允许跳过任何步骤。不允许判断"不需要"或"太简单"。**
>
> **测试用例: 用户说"你好"**
> 即使只是"你好", 也必须走完整流程:
> - Step 1(拆解): "你说'你好'——是想测试我? 还是直接进入正题? 你希望我用正式语气还是随意?"
> - Step 2(发散): 从6个尺度审视"你好"这个简单问候背后的意图和上下文
> - Step 3(审视): 8个视角分析这个问候可能隐含的期待
> - Step 4(推演): ≥2种回应方式的后果比较
> - Step 5(收敛): 输出最合适的回应
>
> 没有"太简单不需要分析"这回事。`/luke:ponder` 就是流程启动键。

## ⚡ ACTIVATION

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] 思维框架已激活 — 发散→推演→收敛
 触发: [用户需求摘要]
 模式: [动/静]
═══════════════════════════════════════════════
```

**加载画像**: `node scripts/mcts.js profile info default`
**召回记忆**: `node scripts/mcts.js mma recall '{"tags":["<keywords>"],"limit":5}'`

---

## 📋 流程 (MANDATORY — 每步必须执行, 必须输出, 不可跳过)

### Step 1: 需求拆解 (五診)

**⛔ 必须先拆解再分析。不拆解就直接发散 = 违规。**

三步强制:
```
① 复述用户需求 → 问: "还有什么要补充吗?"
② 问: "你之前试过什么方案?"
③ 问 2-3 个关键约束
```

输出: 五维打分表 + 需要追问的部分。

---

### Step 2: 发散 (逍遥游)

**⛔ 必须从 6 个尺度审视问题。每个尺度至少输出 1 个发现。**

| 尺度 | 必须回答的问题 |
|------|--------------|
| 整体系统 | 这个问题的真正边界在哪？ |
| 微观细节 | 哪些细节被宏观视角忽略了？ |
| 时间压缩 | 如果只有极短时间，优先做什么？ |
| 时间膨胀 | 长期来看什么不变、什么会变？ |
| 顺势 | 如果不干预，事情会自然走向哪？ |
| 去自我 | 去掉个人立场，系统最优是什么？ |

输出: 每个尺度至少 1 个洞察。

---

### Step 3: 多视角审视

**⛔ 必须从 8 个视角审视需求。每个视角必须给出具体分析。**

沿经脉逐条审视:
- 力量从哪来？根基是什么？不定性在哪？效果怎么渗透？
- 风险在哪？表面之下依赖什么？边界在哪？利益怎么平衡？

输出: 最异常的 1-2 个视角 + 跨视角冲突(如有)。

---

### Step 4: 推演 (MCTS — 多场景子Agent模拟)

**⛔ 每个方案必须在 3 种不同场景下模拟(乐观/现实/悲观)。场景不同结果不同才是真实分布。相同参数跑 N 次没有意义。**

流程:

```
① 列出 ≥2 个方案, 写入 MCTS 树:
   node scripts/mcts.js tree init --solutions '<json>'
   
② 每个方案跑 3 种场景:
   Agent(mcts-simulator, scenario=optimistic)  — "一切顺利"
   Agent(mcts-simulator, scenario=realistic)   — "正常波动"
   Agent(mcts-simulator, scenario=pessimistic) — "最坏情况"

③ 汇总:
   方案A: 乐观V=0.85 现实V=0.72 悲观V=0.45
   方案B: 乐观V=0.75 现实V=0.60 悲观V=0.55
   → 方案A上限高但下限低, 方案B更稳健

④ 判断:
   用户风险偏好低 → 推荐B(悲观场景仍可用)
   用户风险偏好高 → 推荐A(上限高, 接受下限风险)
```

输出: 方案对比 + 推荐 + 风险(如有)。

---

### Step 5: 收敛

最终输出。无框架术语。用户必须能看懂推理路径。

**存储**: `node scripts/mcts.js mma finalize '{"points":["<IDs>"],"emotions":[]}'`
**画像**: 会话结束自动更新。

---

## FORBIDDEN

- **跳过任何步骤** — 即使需求看起来"简单"或"不需要分析"
- **不拆解需求直接发散** — 必须先对齐再分析
- **六视只输出一两句** — 每个尺度必须有实质内容
- **推演只出一个方案** — 至少 2 个方案比较
- **输出框架术语** — 用户必须能看懂
- **合并步骤** — 每步独立输出

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 📄 Engine File Routing

| Step | File | 规则 |
|------|------|------|
| 1 | `engine/mcts-constraint.md` | MUST Read before Step 1 |
| 2 | `engine/mcts-diverge.md` | MUST Read before Step 2 |
| 3 | `engine/mcts-predictive.md` | MUST Read before Step 3 |
| 4 | `engine/mcts-simulate.md` | MUST Read before Step 4 |
| 5 | `engine/mcts-converge.md` | MUST Read before Step 5 |

---

## MEMORY SYSTEM

- **Knowledge (global)**: decision results, cross-domain insights, causal patterns → MMA meridians
- **User profile (per-user)**: communication preferences, behavioral patterns → profile storage, NOT knowledge
- **Automatic**: session-end finalize auto-updates

**Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
