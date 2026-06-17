<p align="center">
  <img src="https://img.shields.io/github/v/release/ljjluke/mcts-skill" alt="版本">
  <img src="https://img.shields.io/badge/状态-稳定-green" alt="状态">
  <img src="https://img.shields.io/badge/许可-MIT-yellow" alt="许可">
</p>

<h1 align="center">🧠 MCTS-TD 认知管道</h1>

<p align="center">
  <b>一个本地训练认知婴儿，适用于 Claude Code。<br>
  每个用户训练自己的大脑 — 无中心模型，不上传数据。</b>
</p>

<br>

> 🌐 For English, see [README.md](./README.md)

---

## 是什么

一个 Claude Code 技能，提供结构化认知管道——6 视角发散、8 维度检查、多场景推演、自进化——全部在本地运行，每个用户训练自己的实例。

```
/luke:ponder → 访谈 → 管道(子Agent强制执行) → 数据驱动进化
```

---

## 安装与升级

```bash
# 安装 (GitHub)
/plugin marketplace add https://github.com/ljjluke/mcts-skill
/plugin install luke

# 升级
/plugin marketplace update luke
/plugin install luke
/reload-plugins

# 安装 (Gitee 国内镜像)
/plugin marketplace add https://gitee.com/luke2438107466/mcts-skill
/plugin install luke
```

> 版本历史见 [Releases](https://github.com/ljjluke/mcts-skill/releases)
>
> 记忆数据: `~/.claude/data/skills/mcts-td-planner/` — 与技能代码物理隔离，升级不丢失

---

## 管道架构

### 9步工作流（子Agent强制执行）

| 阶段 | 功能 | 脑功能区类比 |
|------|------|------------|
| 6视角发散 | 多尺度观察：系统→微观→短期→长期→自然→无立场 | DMN 默认模式网络 |
| 八卦镜8维 | 8维度交叉检查 | PFC 前额叶 |
| DMN间歇 | 结构化阶段间的自由联想 | DMN 静息态 |
| 多场景推演 | 并行子Agent独立推演 + WebSearch真实数据 | 运动皮层规划 |
| 社会辩论 | 乐观/悲观/异见三方陈词→反驳→修正 | TPJ 社会认知 |
| 收敛自检 | 躯体标记加权结论 + 5问自检 | 前扣带回 |
| 层级预测 | 结论反推低层应有模式 → 计算预测误差 | 新皮层 L6→L2 |
| 独立验证 | 新上下文Agent，对抗式审计 | PFC 错误监控 |
| 具身行动 | 具体行动建议 + 预期结果 | 运动→感知循环 |

每步独立子Agent执行，JSON Schema约束输出——不可跳过，不可合并。

### 自纠错循环

验证不通过时进入修复循环（最多2轮）：失败的步骤携带验证Agent的修复上下文重新执行。

---

## 自进化

管道根据使用情况自我进化。**LLM 不决定进化方向——统计数据决定。**

```
自由能 = 验证失败率 × 0.4 + 自检失败率 × 0.3 + 预测误差 × 0.3

如果自由能 > 0.4:
  → pipeline.js recommend-mutation    # 基于历史成功率推荐
  → 执行变异                          # weight_adjust / disable_step / change_order / insert_step / parallelize
  → record-mutation + 写入MMA         # 下次变异会参考这次的历史
```

进化是**本地**的——pipeline-meta.json 位于 `~/.claude/data/skills/mcts-td-planner/`，插件更新不影响。

```bash
# 查看进化状态
node scripts/pipeline.js status

# 基于历史推荐变异类型
node scripts/pipeline.js recommend-mutation

# 查看变异历史
node scripts/pipeline.js mutation-history
```

---

## 三层记忆

| 层级 | 时间尺度 | 位置 | 功能 |
|------|---------|------|------|
| 三焦工作记忆 | 秒~分钟 | working_memory.json | 即时召回缓存 (7±2块) |
| 会话上下文 | 分钟~小时 | session-context.json | 跨分析积累、步骤性能追踪 |
| MMA经脉记忆 | 天~月 | shards/*.json | 永久知识巩固 |

### MMA经脉记忆系统

12正经 + 8奇经。每个穴位 = 一条知识点。

```bash
# 查看记忆状态
node scripts/mcts.js mma status

# 按标签召回知识点
node scripts/mcts.js mma deqi '{"tags":["<关键词>"],"limit":5}'

# 插入新知识
node scripts/mcts.js mma ashi '{"description":"...","tags":["..."],"emotion":"xi"}'

# 查看会话上下文（跨分析记忆）
node scripts/mcts.js mma session-context status
```

---

## 注意力门控

竞争性抑制机制（模拟丘脑TRN）：

```bash
node scripts/mcts.js compute attention-gate --dimensions '[
  {"name":"时机","score":3,"criticality":0.9},
  {"name":"资源","score":7,"criticality":0.6}
]'
# 返回排序后的维度 + 抑制系数
# top1 全权重，后续逐级压制（二次函数）
```

---

## 统一CLI

```bash
node scripts/mcts.js <引擎> <命令> [参数...]

compute   — UCB/rank/attention-gate/状态转换
guard     — 9种合规守卫
mma       — 经脉记忆 (deqi/ashi/reinforce/decay/session-end/session-context)
tree      — MCTS树 (init/select/add-children/simulate/backprop)
template  — Markdown渲染 (portrait/review-map/decision-report)
pipeline  — 自进化元配置管理 (status/recommend-mutation/mutation-history)
```

跨平台:
```bash
./mcts.sh <引擎> <命令>    # Bash (Linux/macOS/Windows Git Bash)
mcts.cmd <引擎> <命令>     # Windows CMD
```

---

## 理论基础

| 框架 | 应用 |
|------|------|
| 自由能原理 (Friston 2025) | 自由能驱动架构变异 |
| HyperNEAT (GECCO 2024) | 拓扑变异 (weight_adjust, insert_step, parallelize) |
| TD学习 (Sutton & Barto) | 值更新、Welford方差、资格迹 |
| 主动推理 (Friston 2025) | 预测→感知→行动循环 |
| 易经 | 变易=进化信号，不易=最小化自由能元规则 |
| 荀子"积" | 逐步积累、会话上下文 |
| 王阳明"知行合一" | 分析即行动，行动即分析 |
| 庄子"逍遥游" | 多视角自由发散 |

---

<p align="center">
  <b>不是使用的工具，而是训练的大脑。</b><br>
  <i>Powered by 自由能原理 · HyperNEAT · 主动推理 · 易经</i>
</p>
