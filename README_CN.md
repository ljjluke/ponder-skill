<p align="center">
  <img src="https://img.shields.io/badge/版本-1.18.13-blue?style=flat-square" alt="版本">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="许可">
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square" alt="状态">
</p>

<h1 align="center">🧠 Ponder</h1>

<p align="center">
  <b>Claude Code 自进化认知框架</b><br>
  <i>数据驱动 · 代码强制 · 自我进化</i>
</p>

<p align="center">
  <a href="README.md">🌐 English</a>
  &nbsp;·&nbsp;
  <code>/luke:ponder &lt;你的问题&gt;</code>
</p>

<br>

---

## ✨ 为什么不一样

大多数 LLM 工具直接回答——大概率答偏。Ponder 在回答前激活**完整思考回路**，每一步**代码强制**执行。每次运行的结果自动积累，下一次比上一次更准。

```
┌─ 用户提问 ──────────────────────────────────────────┐
│                                                       │
│  采访 → 发散 → 八卦镜 → 方案 → 推演(十天干)           │
│       → 辩论 → 综合 → 验证 → 存储 → 进化             │
│                                                       │
│  每步: 清晰? → 继续。不清晰? → 深度循环。             │
│  每次运行的结果自动喂给下一次。                       │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 🎯 核心亮点

| | 特性 | 为什么重要 |
|---|---|---|
| 🎯 **数据驱动** | 每个结论必须有数据来源。LLM 不准编。 |
| 🔄 **代码深度循环** | is_clear + 问题数双重验证，LLM 无法假装清晰跳过。 |
| 🚫 **步骤强制** | 7个阶段全部必须执行，代码检查不是规则提醒。 |
| 💡 **自进化** | `evolve.js` 检测瓶颈→自动生成修复→上线规则。 |
| 🏛️ **十天干推演** | 甲→乙→丙→丁→戊→己→庚→辛→壬→癸。固定权重，不依赖LLM评分。 |
| 🌪️ **神思破框** | 外部锚点强制跳出思维定势，不是"换个角度"是"换个存在" |
| 🔍 **主动反证** | 发散后主动找推翻自己的证据，找不到不进入下一步 |
| 🧠 **MMA记忆** | 知识持续积累，上下文+情绪匹配召回，支持中日韩文。 |
| 🔄 **记忆再巩固** | 召回后30分钟内可以被新信息修改，跟人脑一样 |
| 🧹 **知识保洁** | 未用降权、低质沉睡、高频升级。 |

<br>

---

## 🏗 架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         编排器 (scripts/orchestrate.js)               │
│  before: 加载规则+历史+错误警告 → 传给管道                          │
│  after:  存步骤输出+收集指标+知识保洁                                │
├─────────────────────────────────────────────────────────────────────┤
│                      管道 (7步, 代码强制)                             │
│                                                                       │
│  发散 ──→ 八卦镜 ──→ 方案 ──→ 推演(并行, 十天干)                    │
│  6视角    8维度      5-8方案   甲→乙→丙→丁→戊→己→庚→辛→壬→癸       │
│                                                                       │
│  辩论 ──→ 综合 ──→ 验证 ──→ 输出                                     │
│  排名      结论      独立审查                                          │
│                                                                       │
│  每步: 从MMA加载历史top3 → LLM筛选 → 注入prompt                      │
├─────────────────────────────────────────────────────────────────────┤
│                      自进化引擎 (scripts/evolve.js)                    │
│  读指标 → 检测模式 → 自动生成修复                                    │
│  验证清晰度 = is_clear×20% + 问题数×25% + 字段填充率×30%             │
│                + 验证通过率×25% (不是LLM自说自话)                      │
│  auto-fix → deploy-fix上线 / rollback-fix回滚                       │
├─────────────────────────────────────────────────────────────────────┤
│                      MMA 记忆引擎                                      │
│  知识按语义匹配, 步骤历史归档                                          │
│  自然语言存储(非JSON) → 语义匹配支持中日韩                              │
│  知识保洁: 未用→降权, 低质→沉睡, 频繁→升级                           │
│  每次acquire()自动触发保洁                                             │
└─────────────────────────────────────────────────────────────────────┘
```

<br>

---

## 💬 需求打磨 — 你说的不一定是你真想要的

大多数用户提需求时说的只是"症状"，不是"病因"。这个框架的第一个步骤就是**帮你把需求搞清楚**。

```
你说: "帮我选个编程工具"
   ↓ 采访阶段
框架问: 你做什么类型的项目?团队几个人?最看重什么?
   ↓ 发现你说的和真正的问题是两回事
你说: "你实际要的不是'选工具', 是'我项目进度落后了怎么追'"
   ↓ 需求拆解完成, 后续分析不跑偏
```

不是一次性问完所有问题，而是顺着你的回答追问，直到画像清晰。
如果问了 15 轮还不清晰就继续挖，没有上限。
不需要你在提问前就把需求想清楚——这是框架的工作。

## 🔄 记忆怎么工作

```
每次步骤执行完 → orchestrate.js step() 存产出到MMA →
  (自然语言,不是JSON — 语义匹配可用)

下次同类问题 → 每步独立查询:
  1. recallStepHistory() → 加载20条候选
  2. LLM筛选 → 最相关的top3
  3. 注入步骤prompt

数据越积累 → 候选越多 → top3越准 → 分析越精准
```

### 存储格式

步骤历史存自然语言（从结构化输出中提取关键文本）：

```
[step:divergence] 技术选型: React在大型项目中更有优势,Vue在中小项目中效率更高
[step:dimension] 市场分析: 竞争加剧导致获客成本上升,差异化是关键
[step:simulation] 方案A: 木0.85→火0.78→土0.82→金0.75→水0.68 → V=0.78
```

不存JSON——所以中/英/日/韩都能语义匹配。

<br>

---

## 🔄 自进化怎么工作

```
evolve.js analyze() →
  读取35+次运行记录
  按问题类型分组(技术选型/市场分析/学习规划...)
  计算每类问题的每步验证清晰度

  检测问题:
    清晰度<70% → 生成auto-fix
    问题数>2 → 建议预采访
    模式识别 → 创建prepend_step规则

  auto-fix → auto-fixes/ → deploy-fix → evolve-rules.json
                          → rollback-fix → 移除
```

### 清晰度算法（不是LLM自评）

```
验证清晰度 = is_clear × 20% (最低权重,LLM可能说谎)
           + 问题数惩罚 × 25% (行为信号)
           + 字段填充率 × 30% (客观结构检查)
           + 验证通过率 × 25% (独立验证)
```

清晰度不是 LLM 说了算——是多信号综合评分，LLM 无法操纵。

### 十天干推演框架

```
固定10维度(跨领域通用):
  阳干(权重1.0): 甲木规划, 丙火推进, 戊土产出, 庚金效率, 壬水应变
  阴干(权重0.8): 乙木执行, 丁火调整, 己土品质, 辛金精简, 癸水储备

V = Σ(各阶段达成度 × 天干权重) / Σ(权重)
  达成度 = LLM模拟过程后给出,不是自己打分
  权重 = 阴阳属性固定,不是LLM决定
```

每个方案独立 agent 并行推演，互不阻塞。

<br>

---

## 🚀 快速开始

```bash
# 安装
/plugin marketplace add https://github.com/ljjluke/ponder-skill
/plugin install luke

# 使用——任何领域
/luke:ponder 帮我分析一下A股
/luke:ponder 规划一下Python学习路线
/luke:ponder 分析这个创业项目的竞争格局
/luke:ponder 比较三种营销策略的优劣
/luke:ponder 帮我评估两种治疗方案
/luke:ponder 分析这个农业项目的可行性
```

### 自定义存储目录

```bash
# Linux / macOS
export PONDER_DATA_DIR=/mnt/nas/my-knowledge
# 或单次运行
PONDER_DATA_DIR=/mnt/nas/my-knowledge claude

# Windows (PowerShell)
$env:PONDER_DATA_DIR = "D:\my-knowledge"
claude

# Windows (CMD)
set PONDER_DATA_DIR=D:\my-knowledge
claude
```

默认: `~/.claude/data/skills/ponder/`

<br>

---

## 📁 项目结构

```
ponder-skill/
├── SKILL.md                    # LLM编排指令(步骤顺序/错误处理)
├── agents/                     # 子agent定义
│   ├── dimension-evaluator.md  # 八卦镜维度评估
│   ├── solution-generator.md   # 方案生成
│   ├── debater.md              # 辩论立场
│   └── mcts-simulator.md       # 推演模拟
├── scripts/
│   ├── orchestrate.js          # 步骤存储 + 流程收尾
│   ├── mcts.js                 # 统一CLI入口
│   ├── mcts_compute.js         # 数学引擎
│   ├── mcts_guard.js           # 合规守卫
│   ├── clarity-check.js        # 清晰度评分
│   ├── evolve.js               # 自进化引擎
│   ├── knowledge.js            # 知识获取/存储/召回
│   ├── pipeline-metrics.js     # 指标收集
│   ├── weights.js              # 权重学习
│   ├── prompts/                # 7个步骤的JSON prompt
│   │   ├── shensi.json
│   │   ├── divergence.json
│   │   ├── bagua.json
│   │   ├── plans.json
│   │   ├── converge.json
│   │   ├── debate.json
│   │   └── synthesis.json
│   └── mma/                    # MMA记忆算法
│       ├── constants.js
│       ├── io.js               # 分片存储
│       ├── deqi.js             # 知识召回
│       ├── ashi.js             # 知识插入
│       ├── reinforce.js        # 价值更新
│       ├── decay.js            # 记忆衰减
│       ├── ziwu.js             # 子午流注
│       ├── diagnosis.js        # 八纲辨证
│       ├── state_machine.js    # 状态机
│       ├── cluster.js          # 知识集群
│       ├── audit.js            # 知识审计
│       └── user_profile.js     # 用户画像
├── engine/                     # 引擎文档
├── hooks/hooks.json            # 会话生命周期
├── scripts/evolve-rules.json
└── pipeline-meta.json
```

<br>

---

## 📊 成熟度

| 组件 | 状态 | 说明 |
|------|------|------|
| 8步管道 | ✅ **运行中** | 神思→发散→八卦镜→方案→收敛→推演→辩论→综合 |
| 十天干推演 | ✅ **运行中** | 并行推演,固定权重V值,非LLM自评 |
| MMA记忆 | ✅ **运行中** | 随使用持续积累,语义匹配,知识保洁 |
| 自进化 | ✅ **运行中** | evolve.js检测瓶颈,自动生成修复,上线规则 |
| 语义匹配 | ✅ **运行中** | 支持中/日/韩/英文 |
| 知识保洁 | ✅ **运行中** | 未用降权/低质沉睡/高频升级 |
| 编排器 | ✅ **运行中** | orchestrate.js,LLM无遗忘空间 |
| MCTS树搜索 | ⏳ **待接入** | 代码已写(mcts_tree.js),未接入管道 |
| 自定义存储目录 | ✅ **运行中** | PONDER_DATA_DIR环境变量 |

<br>

---

<p align="center">
  <sub>Claude Code 认知框架 · 用 ❤️ 构建 · 不是提示词，是一个大脑</sub>
</p>
