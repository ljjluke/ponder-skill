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

> **`/luke:ponder` = full 5-step flow. Every step mandatory. No skipping.**
> Even "hello" goes through all 5: decompose, diverge, examine, simulate, converge.

## ⚠️ 关键规则

- 不要运行任何 shell 命令。这个文档本身包含了你需要的全部模板。
- 不要使用 Bash 工具。所有分析在你脑中完成，不需要调用 CLI。
- 不要跳过任何步骤。即使问题很简单，也走完5步。
- 不要合并步骤。每一步独立输出。

---

## MANDATORY 5-STEP FLOW

### Step 1: Decompose — 需求分解

先做3步访谈，再输出需求画像。不要跳过访谈直接分析。

**3步访谈：**
```
① 复述用户需求 → 问："是这样吗？还有什么补充？"
② 问："你之前尝试过什么方法？考虑过什么方向？"
③ 问2-3个关键约束（用选项式提问 AskUserQuestion）
```

**输出：** 五维画像（每个0-10分）+ 标注哪些维度需要追问
- 天(Timing) — 时机、节奏、窗口期
- 地(Resources) — 资源、条件、限制
- 人(People) — 受影响方、接受度
- 法(Rules) — 规则、边界、禁止项
- 物(Essence) — 本质、成功标准、关键目标

⛔ 在用户回答约束问题之前，不要进入下一阶段。

---

### Step 2: Diverge — 6尺度发散

从6个完全不同的观测位置审视问题。每个尺度至少输出1个洞见。

**6个观测尺度：**

```
① 全局视角 (System level)
   从最高处看——系统的真正边界在哪里？这个问题的位置是什么？
   输出：系统级模式 + 问题重新定义 + 边界外的可能性

② 微观视角 (Micro level)  
   从最细处看——宏观分析遗漏了什么日常细节？
   输出：具体痛点 + 被忽略的细节

③ 短期视角 (Time-compressed)
   如果只有极短时间，什么必须做？
   输出：必须做的第一件事 + 被高估但可放弃的事

④ 长期视角 (Time-expanded)
   极长时间尺度下，什么不变？什么在改变？
   输出：不变的核心 + 10年尺度的影响链

⑤ 自然演化视角 (Flow)
   如果不做任何干预，它会自然走向哪里？
   输出：自然漂移方向 + 最小的干预点

⑥ 无立场视角 (Selfless)
   剥离所有个人立场——系统最优解是什么？
   输出：被忽视的声音 + 无利益偏向的最优解
```

⛔ 必须6个视角全部完成才能进入下一步。不要合并视角。

---

### Step 3: Examine — 八卦镜8维检查

用8个独立维度交叉审视问题。每个维度必须写出具体分析（不是一句话带过）。

**8个检查维度：**

```
F1 ☰ 动力 (Source of Force)
  驱动力来自哪里？是内生还是外生？
  分析：动力来源 + 可持续性 + 博弈格局

F2 ☷ 根基 (Foundation)  
  基础条件是什么？土壤适合什么？
  分析：既有条件 + 资源匹配度 + 基础能力的边界

F3 ☳ 扰动 (Change/Disruption)
  哪里可能出意外？什么潜在问题在积累？
  分析：不稳定因素 + 症状与根因 + 翻转点

F4 ☴ 渗透 (Penetration)
  影响如何扩散？阻力最小的路径在哪？
  分析：传导链条 + 切入点 + 游刃有余的缝隙

F5 ☵ 风险 (Risk/Abyss)
  最坏情况是什么？不做是否更好？
  分析：最大下行 + 赔付能力 + 历史参照

F6 ☲ 表象 (Visible/Dependent)
  表面之下依赖什么？被忽视的支撑是什么？
  分析：隐性依赖 + 名实是否一致 + 被忽视的人

F7 ☶ 边界 (Boundary)
  绝不可越过的线在哪？停下是保护还是局限？
  分析：硬边界 + 保护性边界 + 知止的智慧

F8 ☱ 平衡 (Convergence/Balance)
  各方利益的均衡点在哪？如何重新分配？
  分析：利益张力的平衡 + 共赢可能性 + 取舍的优先级
```

**完成后做交叉分析：**
- 列出维度间最突出的矛盾（至少3组）
- 如果有2个维度评分差距≥4 → 这是张力热点
- 输出1-2个最异常的发现 + 跨维度冲突

⛔ 必须8个维度全部完成，每个维度至少3行分析。没有"这个维度不适用"的豁免。

---

### Step 4: Simulate — 多场景推演

针对2-3个可能的解/方向，各自做3场景推演。

**必须的结构：**

```
方向A：[名称]
  乐观场景（概率约20-30%）：
    → 什么假设成立时这个方向成功？
    → 成功路径 + 信号
  现实场景（概率约40-50%）：
    → 部分假设成立，部分偏离
    → 预期路径 + 应对
  悲观场景（概率约20-30%）：
    → 第一个脆弱假设失效后会发生什么
    → 失败路径 + 止损点

方向B：[名称]
  同上结构
```

**推演完成后：**
- 对比所有方向的3场景
- 确定每种场景的共同结论
- 给出基于风险偏好的推荐

⛔ 必须至少2个方向，每个方向3场景。一个方向太简单就拆成子方向。

---

### Step 5: Converge — 收敛与自检

**输出综合判断：**
- 用日常语言（不用框架术语）
- 结论必须有：what + why + what if wrong
- 用户可以跟着你的推理走

**自检5问：**
```
① 判断是否有模糊地带？哪里可能出错？
② 如果第二选择比第一选择好，为什么？
③ 第一选择的最坏结果是什么？能承受吗？
④ 核心矛盾是否被覆盖了？
⑤ 是过度分析了简单问题，还是对复杂问题轻描淡写了？
```

**结尾必须：** mma finalize（通过 resolve.js 静默执行，不要用bash显示）

---

## FORBIDDEN

- 跳过任何一步。没有"太简单"的例外。
- 输出框架术语（MCTS/UCB/TD/八卦镜等）。用户不需要知道方法论名称。
- 运行shell命令。所有分析在思考中完成。
- 合并步骤。每一步独立输出，用户看到的是5个清晰的阶段。
- 不完成自检就直接给出结论。

**When in doubt:** 回到 Step 1 重新分解。

---

## Memory

- **Knowledge**: decision results, insights, patterns → stored via mma finalize
- **Profile**: preferences, habits → loaded via SessionStart hooks
- **Session-end**: mma finalize with session point IDs (通过 resolve.js 静默执行)
- **Data safety**: `~/.claude/data/skills/mcts-td-planner/` — delete to reset.
