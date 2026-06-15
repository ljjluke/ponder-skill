---
name: ponder
alwaysApply: false
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.11.0
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` 触发 → 完整框架介入。每一步必须执行，每一步必须对用户可见。**

## ⚡ ACTIVATION

当 `/luke:ponder` 被调用时:

### Step 0: 启动引擎

1. 解读用户需求，提取任务特征（涉及哪些维度/领域/选择）
2. 判断模式：紧急/简单 → **动(Dong)** 精简3-5轮 | 重要/复杂 → **静(Jing)** 完整8-10轮
3. 输出激活信号：

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] 决策需求检测。启动决策引擎
 触发: [具体任务描述, 关键维度]
 模式: [Dong/Jing] ([N]个候选方向)
═══════════════════════════════════════════════
```

然后进入五诊需求画像。**每一步都是强制的。无跳过。无合并。**

---

## 📐 MANDATORY PHASED FLOW

### Step 0.5: 五診需求画像

**⛔ MUST LOAD `engine/mcts-constraint.md` — 不加载无法执行此步骤。**

五维度打分 (0-10)，任何 <7 → 追问用户：

| 维度 | 探查 | 评分 |
|------|------|------|
| 天(Timing) | 时机/阶段/窗口期 | ?/10 |
| 地(Resources) | 资源/约束/依赖 | ?/10 |
| 人(People) | 利益相关者/决策者 | ?/10 |
| 法(Rules) | 规则/限制/红线 | ?/10 |
| 物(Essence) | 本质/成功标准 | ?/10 |

输出画像后，执行 **本末(Ben-Mo)**: 识别根维度 + **有无(You-Wu)**: 缺失约束检测 + **张力(Tension)**: 维度对差异扫描。

---

### Step 1: 逍遥游发散 ⭐ 核心阶段

**⛔ MUST LOAD `engine/mcts-diverge.md` — 基于庄子哲学的完整方法论，必须加载。**

发散不是"换个角度看问题"，而是**彻底改变观察者的身份、尺度和时空位置**。
就像人类看地球 vs 外星人看地球，鲲(深海)看世界 vs 鹏(九万里高空)看世界。
井底之蛙看不见大海，不是因为不够努力，而是因为没有改变观察位置。

**学术基础**: Lai (2021) 认知灵活性理论 / Liu Xiaogan (2015) 齐物不知升维模型 / Malaie et al. (2024) 创造力作为策略觅食 / Deckert & Scherer (2017) 创新之道

**发散流程: 心斋 → 六视漫游 → 八卦镜 → 齐物 → 梦蝶翻转**

**Phase 0: 心斋坐忘 — 先清空，再发散**

最关键的一步。不做心斋的发散是假发散。逐项对用户输出:
- 我默认相信什么? (至少3条未经检验的假设)
- 这些假设从哪来? 在当前场景是否仍然有效?
- 如果所有假设都是错的, 会怎样? (至少3个反假设)
- 坐忘: "我暂时不知道答案。我是一张白纸。"

**Phase 1: 逍遥游 — 六视漫游**

每次彻底改变观察者的身份、尺度和时空位置。不是"从不同角度分析"，而是"变成不同存在"。

视① 鲲鹏之视 [九万里高空·宇宙尺度]: 大鹏鸟翼若垂天之云，从太空看全局。大尺度洞察 + 问题重新定义 + 边界之外是什么。
视② 蜩鸠之视 [榆枋之间·地面尺度]: 蝉和小鸠生活在树枝之间，只看见眼前细节。微观洞察 + 被宏观忽略的具体痛点。
视③ 朝菌之视 [不知晦朔·时间压缩]: 朝菌生命周期只有一天。即时行动 + 什么在极短尺度下可以完全忽略。
视④ 冥灵之视 [五百岁为春·时间膨胀]: 以500年为一个季节。长期不变的基础 + 10年/50年/100年后果链。
视⑤ 列子御风 [泠然善也·顺势无为]: 御风而行，不强迫。自然趋势(不干预会怎样) + 最小干预方案。
视⑥ 至人无己 [无己无功无名·去自我]: 彻底去除"我"的利益和立场。被遮蔽的声音 + 系统最优而非"我"最优。

**Phase 2: 八卦镜 — 换完眼睛再审视**

用六视的六双新眼睛来审视八卦镜。每卦必须输出: 体用分解 + 六视交叉(哪个视改变了评分?) + 双诸子子镜推理 + 跨界文化类比 + 盲区/想法/评分。
5轮发散: 逐卦深度 → 交叉关联(理事分离) → 变化条件(二阶效应) → 盲区补全 → 自检(5问)。

**Phase 3: 齐物 — 等视所有视角**

所有视角都有平等价值。没有哪个"正确"。每个视角揭示了什么独特的东西? 哪些视角让我最不舒服(触及盲区)? 如果最不舒服的视角才是正确的会怎样?

**Phase 4: 庄周梦蝶 — 终极翻转**

庄周梦蝶，不知周之梦为蝴蝶与? 蝴蝶之梦为周与? 主体客体互换 / 成功失败互换 / 时间顺序互换。

详细模板和执行规则全部在 `engine/mcts-diverge.md` 中。

---

### Step 1.5: 信息缺口补全

**⛔ 任何卦象分数 <7 → 必须追问用户。使用 AskUserQuestion，不用自由文本。**

```
【Info Gap】
 缺口卦象: F?=[X/10] — [具体缺什么]
 追问: [AskUserQuestion × 1-3]
 更新后分数: F?=X→Y
```

---

### Step 2: 侦查报告

**⛔ MUST LOAD `engine/mcts-diverge.md` 收敛部分。**

逐卦发现 + 交叉验证(理事分离) + 明确假设(已确认/未确认)。

---

### Step 3: 方案列表 → 收敛 → MCTS推演

**⛔ MUST LOAD `engine/mcts-simulate.md`。**

Step 3a: 多方案列表 — 发散阶段不限数量，标注来源和体用。
Step 3b: 收敛 — 聚类→补全→裁剪→结晶。一多(One-Many)体用去重。筛选后 ≤10 个进入MCTS。
Step 3c: MCTS推演 — 每轮4阶段(Selection/Expansion/Simulation/Backprop)。收敛条件: V稳定3轮 | 最佳n≥5且σ²<0.05。

---

### Step 3.5: 自检

**⛔ MUST LOAD `engine/mcts-converge.md`。**

5问逐一回答: ①找漏洞 ②反向思考 ③风险评估 ④本末检查 ⑤动静检查。

---

### Step 3.6: 盲区审计 + 言意缺口

盲区: 子镜覆盖检查 → 3+遗漏→警告→退回收敛 | 1-2→标注。
言意: 字面vs隐喻 / 同词不同义 / 未说出的期望。

---

### Step 4: 决策报告

**⛔ MUST LOAD `engine/mcts-converge.md`。**

排序(V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + 体用) + 自检 + 盲区 + 言意 + 执行计划 + TD写回 + Memory Agent检查点验证。

---

## ⛔ FORBIDDEN

- **跳过任何步骤** — 即使需求"简单"，完整流程必须走完
- **心斋不做就发散** — 不清空预设的发散是假发散
- **六视只做表面功夫** — 必须真的"变成"那个视角，不是列几句话
- **八卦镜敷衍** — 每卦必须有体用+双镜推理+文化类比+六视交叉
- **不加载 engine 文件就执行** — 每步标注了 MUST LOAD 的文件必须先 Read
- **合并步骤** — 每步独立输出，不可"一步带过"
- **MCTS只输出最终数字不输出每轮细节**
- **发散阶段就给方案数量设上限** — 收敛后才筛选

---

## 🔒 COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **心斋清空→六视漫游→八卦镜→齐物→梦蝶翻转** | **先发散后收敛** | **≤10方案入MCTS** | **每步对用户可见**

---

## 📄 Engine File Routing

| Phase | File | 加载规则 |
|-------|------|---------|
| Step 0-0.5b | `engine/mcts-constraint.md` | **MUST Read before Step 0.5** |
| Step 1-2 | `engine/mcts-diverge.md` | **MUST Read before Step 1** (逍遥游完整方法论) |
| Step 3 | `engine/mcts-simulate.md` | **MUST Read before MCTS** |
| Step 3.5-4 | `engine/mcts-converge.md` | **MUST Read before Step 3.5** |
| Post-4 | `engine/td-learner.md` | TD write-back 时加载 |
| Always | `agents/memory-agent.md` | 6检查点参考 |

**⚠️ 不是"可以加载"，是"必须加载"。不加载 = 无法输出该步骤 = VIOLATION。**

---

## 🧠 Memory Agent (6 checkpoints)

① pre_engine: `mma deqi` → ② during_diverge: `mma observe` → ③ post_simulate: `mma ashi` + `mma cluster` → ③.5 complete → ④ pre_converge: `mma observe` → ⑤ post_execution: `mma observe` → ⑥ session_end: `mma session-end`

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete to reset.
