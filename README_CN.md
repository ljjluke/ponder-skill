<p align="center">
  <img src="https://img.shields.io/github/v/release/ljjluke/mcts-skill" alt="版本">
  <img src="https://img.shields.io/badge/许可-MIT-yellow" alt="许可">
</p>

<h1 align="center">🧠 MCTS-TD</h1>

<p align="center">
  <b>一个 Claude Code 技能，给 LLM 装上结构化思考能力。</b><br>
  多视角发散 · 多场景推演 · 自进化管道 · 经脉记忆
</p>

<p align="center">
  <sub>基于自由能原理 · HyperNEAT · 主动推理 · 易经 · 荀子 · 庄子</sub>
</p>

<br>

> 🌐 For English: [README.md](./README.md)
> 📦 [Releases](https://github.com/ljjluke/mcts-skill/releases)

---

## 安装

```bash
/plugin marketplace add https://github.com/ljjluke/mcts-skill
/plugin install luke
```

然后输入：

```
/luke:ponder <你的问题>
```

---

## 管道

9步流程，子Agent强制执行（不可跳过、不可合并）：

```
Step 1（你来做，交互式）→ 访谈 → 五维画像 → 记忆召回
    ↓
Step 2~5（Workflow管道，自动执行）:
  ┌─ 6视角发散（系统·微观·短期·长期·自然·无立场）
  ├─ 八卦镜8维检查（动力·根基·扰动·渗透·风险·表象·边界·平衡）
  ├─ DMN间歇（结构化阶段间的自由联想）
  ├─ 多场景推演（并行子Agent，各自基于真实WebSearch数据）
  ├─ 社会认知辩论（乐观·悲观·异见 → 陈词 → 反驳 → 修正）
  ├─ 收敛 + 躯体标记加权结论 + 5问自检
  ├─ 层级预测（自上而下的预测误差计算）
  ├─ 独立验证（全新上下文、对抗式审计）
  └─ 具身行动建议（具体行动 + 预期结果）
    ↓
自进化：自由能 > 0.4 → 数据驱动的管道变异（权重 / 顺序 / 并行化）
```

自纠错：验证不通过 → 修复循环（最多2轮）→ 修复指定步骤 → 重新验证。

---

## 记忆架构

| 层级 | 时间尺度 | 功能 |
|------|---------|------|
| 三焦工作记忆 | 秒~分钟 | 即时召回缓存（7±2块） |
| 会话上下文 | 分钟~小时 | 跨分析积累、步骤性能追踪 |
| MMA经脉记忆 | 天~月 | 永久知识存储（12正经 + 8奇经） |

MMA 以穴位形式存储知识：情绪门控巩固（喜+8，恐+15）、来源可靠性追踪（亲历1.0→传闻0.2）、NREM→REM睡眠巩固周期、标签索引检索（O(1)查找）。

```bash
# 查看记忆
node scripts/mcts.js mma status
node scripts/mcts.js mma deqi '{"tags":["<关键词>"],"limit":5}'
```

---

## 自进化

LLM 不决定进化方向——统计数据决定。

```
自由能 = 验证失败×0.4 + 自检失败×0.3 + 预测误差×0.3

> 0.4? → pipeline.js recommend-mutation（基于历史成功率推荐）
       → 执行：weight_adjust / disable_step / change_order / insert_step / parallelize
       → record-mutation → MMA记录 → 下次参考
```

全部本地运行。数据不离机。`pipeline-meta.json` 位于 `~/.claude/data/skills/mcts-td-planner/`。

---

## 理论基础

| 思想 | 应用 |
|------|------|
| Friston 自由能原理 | 自由能驱动拓扑变异 |
| HyperNEAT 拓扑进化 | weight_adjust, insert_step, parallelize |
| TD学习 + Welford | 值更新、置信度追踪 |
| 易经 | 变易/不易 — 变与不变的元规则 |
| 荀子 劝学 | 逐步积累（会话上下文） |
| 王阳明 知行合一 | 分析即行动，行动即分析 |
| 庄子 逍遥游 | 多视角自由发散 |

---

<p align="center">
  <b>不是使用的工具，而是训练的大脑。</b><br>
</p>
