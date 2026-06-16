---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.13.0
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

### Step 1: 需求发散（你做）

**入口**：用户原始请求
**核心原则**：用户说的是"想要什么"，但你得找到他"真正需要什么"。开局发散不充分，后面的分析全是白搭。

#### 1a. 自我审查 — 你在哪些方面已经下了判断？

在看到用户请求的第一时间，先停下。你的大脑已经在自动归类了：这是技术问题/投资问题/职业选择...但那个分类本身可能就是错的。

```
① 我对这个请求的第一反应是什么？
   → 写出来。然后问自己：如果用户说的是反话呢？
   
② 我对这个领域有什么默认假设？
   → 例：用户说"分析A股" → 你假设他是投资者？
     也许他是研究者、监管者、或者正在写报告？
   
③ 我有没有"这个问题的答案大概是X"的预判？
   → 有这个预判很正常。但要标注它，然后在访谈中故意求证反面。

④ 如果我所有的第一反应都是错的，那真实情况可能是什么？
   → 至少列出3个反方向假设
```

这一步是在你脑中完成的。不需要输出给用户看。但你必须做过它。

#### 1b. 深度访谈 — 不光问"什么"，还要问"为什么"

向用户提问，逐步深入。不是3个固定问题，而是一个螺旋深入的对话。

**第一层：对齐表面需求**
```
"你说的是[复述]，是这样吗？还有什么补充？"
"你之前试过什么方法？"
```

**第二层：深挖动机和场景**
```
"你为什么现在关注这个？之前发生了什么触发点？"
"你希望[分析]之后做什么？" ← 关键！用户的下一步动作决定了分析的用途
"如果你已经有了答案，它大概长什么样？" ← 让用户描述他心中的"答案画像"
```

**第三层：挑战和约束**
```
问2-3个约束性问题（用 AskUserQuestion 选项式提问），专门挑战用户的默认假设。
例如：
- "你说要分析A股——你关注的是大盘方向、板块轮动还是个股？"
- "你是个人投资者还是机构角色？这会影响表达的颗粒度"
- "分析完你打算怎么做？会影响什么决策？"
```

⛔ 不要接受用户的第一层回答就停止。"我想分析A股"下面可能藏着"我想知道现在该不该买"的决策需求。继续往下挖。

#### 1c. 整理画像

输出五维需求画像。每一步都标注你有多确定、以及你的假设是什么。

```
天(Timing)= ?/10 — 时机、节奏、决策窗口    [确定度: 高/中/低]
地(Resources)= ?/10 — 可用条件、限制       [确定度: 高/中/低]
人(People)= ?/10 — 角色、立场、利益相关方  [确定度: 高/中/低]
法(Rules)= ?/10 — 规则、边界、禁止        [确定度: 高/中/低]
物(Essence)= ?/10 — 核心目标、成功标准     [确定度: 高/中/低]

假设清单:
- [假设A] 来自[什么线索] → 待验证/已验证
- [假设B] 来自[什么线索] → 待验证/已验证

待追问: [Step1c中未澄清的事项]
```

#### 1d. 记忆召回 + 知识采集 — 启动管道前加载历史经验

在进入自动化管道之前，先查询MMA记忆系统，找到与当前问题相关的历史分析经验。

从 SessionStart 日志 `[MCTS-TD] Plugin:` 获取插件路径 `$P`。

执行记忆召回:
```
node $P/scripts/mcts.js mma deqi '{"tags":["<与用户请求相关的关键词>"],"limit":5}'
```

**如果召回返回结果 > 0**: 将历史经验融入Step 1画像，标注哪些结论有历史支撑。如有匹配度 > 0.7的案例，在管道参数中标注。

**如果召回返回结果 = 0**: **绝对不能自己编造记忆**。使用 WebSearch 搜索与用户问题相关的真实资料/数据。这是新知识的合法来源。将搜到的资料摘要并入 Step 1 画像。

管道内各步骤也遵循同样规则: 先查记忆 → 无结果则搜真实数据 → 不能自己编造。

⛔ 用户未回答第三层约束问题→画像不完整→不能进入Pipeline。

⛔ 至少要有1个"待验证"的假设。如果你没有任何不确定的判断→审查不够深入。

---

### Step 2-5: 启动强制管道

Step 1 完成后，用 Workflow 工具启动管道。**必须传入插件路径和记忆上下文**——管道内各步骤需要它们来参与记忆系统。

```
Workflow({scriptPath: 'scripts/ponder-pipeline.wf.js', args: {
  user_request: '<用户原始请求>',
  step1: '<Step1画像输出>',
  plugin_path: '<从[MCTS-TD] Plugin:获取的路径>',
  memory_context: '<deqi召回的结果摘要>'
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
