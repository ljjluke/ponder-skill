---
name: ponder
alwaysApply: false
description: |
  Universal thinking framework — MCTS tree search + TD learning + Eight-Facet Mirror.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.10.1
license: MIT
---

# MCTS-TD Thinking Framework

> **`/luke:ponder` 触发 → 完整框架介入。每一步必须执行，每一步必须对用户可见。**

## ⚡ ACTIVATION

当 `/luke:ponder` 被调用时，必须先输出激活信号：

```
⚡ [MCTS-TD] 思维框架已激活 — 五诊对齐 → 八卦发散 → 多方案收敛 → MCTS推演 → 决策报告
```

然后立即执行以下流程。**每一步都是强制的。无跳过。无合并。**

---

## 📐 MANDATORY PHASED FLOW

### Step 0: 动静模式

判断模式并告知用户：
- 紧急/简单 → **动(Dong)**: 精简输出, 3-5轮MCTS
- 重要/复杂/多方案 → **静(Jing)**: 完整输出, 8-10轮MCTS

```
[Step 0] 模式: 动(Dong) / 静(Jing)
原因: [一句话]
```

---

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

### Step 1: 八卦镜发散 ⭐ 核心阶段

**⛔ MUST LOAD `engine/mcts-diverge.md` — 这是最重要的阶段，必须加载完整规则。**

**⛔ 必须执行全部 5 轮发散。每轮对用户可见。不可合并。不可跳过。**

**5轮发散流程：**

```
Round 1: 基础审视 — F1→F8 逐卦审视
  对每个卦象:
  - 确定当前任务的具体维度名
  - 应用 体(Ti) 用(Yong) 分解: 体=通用本质 / 用=当前任务的具体表现
  - 应用两个子镜(诸子百家)交叉审视:
    F1: 兵家(势从何来?) + 縱横家(利益能否对齐?)
    F2: 農家(土壤适合什么?) + 水利家(资源流向?堵塞?)
    F3: 醫家(症状还是根因?) + 陰陽家(对立面是谁?)
    F4: 工匠(核心工具够吗?) + 禪家(剥离装饰后剩下什么?)
    F5: 史家(历史上谁犯过类似错误?) + 道家(不干预是否更好?)
    F6: 工匠(什么支撑表面?) + 儒家(谁被忽视了?)
    F7: 法家(规则过时了吗?) + 道家(知止是保护还是限制?)
    F8: 儒家(道德基线是什么?) + 縱横家(谁是天然盟友?)
  - 打分 0-10 + 已知信息 + 盲区 + 初步想法
  - 执行文化类比(③步) — 跳出当前领域框架

Round 2: 交叉关联 — 关键维度对
  - 最高2个分 → 优势对: 如何互相增强?
  - 最低2个分 → 盲区对: 如何互相拖累?
  - 分差>4 → 张力对: 冲突如何调和?
  - 每对: 理事分离 — 理(Li)=通用模式 / 事(Shi)=当前具体表现

Round 3: 变化条件分析
  - 每个关键对: 哪些因素稳定?哪些在变化?
  - 变化因素发生位移 → 二阶效应是什么?
  - 最多标记2-3个不稳定因素/对

Round 4: 盲区补全
  - 分数<7的卦象 → ①查知识图谱 ②WebSearch ③追问用户
  - ≤3分的卦象 → 必须WebSearch

Round 5: 发散自检
  - 有没有卦象没有产生任何想法?
  - 有没有想法太早被否决了?
  - 有没有未声明的假设?
  - 8个卦象的想法是否能拼成完整图景?
```

**输出格式 (每轮必须输出)**:
```
【八卦镜 · Round N】
 [该轮的具体分析内容]

【八卦镜 · 发散总结】
 Strong=[F?F?] | Weak=[F?F?] | Tension=[F?↔F?]
 关键发现: [3-5条跨界洞察]
```

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

```
【Reconnaissance Report】
 F1-F8 逐卦: [来源: 搜索/记忆/用户] → [发现]
 交叉验证: F?↔F? → 理: [...] | 事: [...]
 明确假设: "Assume [X]" ← [已确认/未确认]
```

---

### Step 3: 方案列表 → 收敛 → MCTS推演

**⛔ MUST LOAD `engine/mcts-simulate.md`。**

```
Step 3a: 多方案列表 — 发散阶段不限数量，每个方案标注来源和体用
Step 3b: 收敛 — 聚类 → 补全 → 裁剪 → 结晶。
         一多(One-Many): 每个方案集群1个核心+2-4个机制
         体用(Ti-Yong): 同体不同用→合并 / 不同体同用→保留
         筛选后 ≤10 个进入MCTS
Step 3c: MCTS推演 — 每轮4阶段输出:
         ① Selection (UCB+奇正)  ② Expansion
         ③ Simulation (3层: 可行性/反事实/视角)
         ④ Backprop (Welford)
         收敛条件: V稳定3轮 | 最佳n≥5且σ²<0.05
```

---

### Step 3.5: 自检

**⛔ MUST LOAD `engine/mcts-converge.md`。**

5个问题必须逐一回答：
```
① 找漏洞: 是否有模糊判断?未验证假设?被忽略的风险?
② 反向思考: 如果第2名实际比第1名好,原因是什么?可能性?
③ 风险评估: 选第1名的最坏结果?能否承受?
④ 本末检查: 第1名是否违反五诊根维度?
⑤ 动静检查: 过度分析(静→动)?或分析不足(动→静)?
```

---

### Step 3.6: 盲区审计 + 言意缺口

```
盲区: 子镜覆盖检查 → 3+遗漏→警告→退回收敛 | 1-2→标注
言意: ①字面vs隐喻 ②同词不同义 ③未说出的期望
```

---

### Step 4: 决策报告

**⛔ MUST LOAD `engine/mcts-converge.md`。**

```
【MCTS-TD Decision Report】
 排序 (V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + 体用)
 自检: ✅/⚠️/❌
 盲区: ✅/⚠️
 言意: ✅/⚠️
 执行计划 + 回退方案
 TD写回 + Memory Agent检查点验证
```

---

## ⛔ FORBIDDEN

- **跳过任何步骤** — 即使需求"简单"，完整流程必须走完
- **八卦镜只输出8行分数不深入分析** — 必须执行全部5轮发散 + 子镜 + 文化类比
- **不加载 engine 文件就执行** — 每步标注了 MUST LOAD 的文件必须先 Read
- **合并步骤** — 每步独立输出，不可"一步带过"
- **MCTS只输出最终数字不输出每轮细节**
- **发散阶段就给方案数量设上限** — 收敛后才筛选
- **只在当前领域内思考** — 发散必须跨界联想

---

## 🔒 COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **八卦镜5轮发散** | **先发散后收敛** | **≤10方案入MCTS** | **每步对用户可见**

---

## 📄 Engine File Routing

| Phase | File | 加载规则 |
|-------|------|---------|
| Step 0-0.5b | `engine/mcts-constraint.md` | **MUST Read before Step 0.5** |
| Step 1-2 | `engine/mcts-diverge.md` | **MUST Read before Step 1** |
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
