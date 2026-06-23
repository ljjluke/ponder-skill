---
name: ponder
alwaysApply: true
description: "8-step structured reasoning with code-enforced clarity checks. Domain-agnostic. Each step must: read prompt → load engine docs → execute → validate quality."
version: 1.18.5
license: MIT
---

## 流程

### 沟通需求
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
产出: userRequest + userProfile。

### 分析阶段

⛔ 每步必须按以下顺序完整执行，跳过任何一步即算流程失败。读文件用 Read 工具（不用 Bash），禁止 bash echo:

```
1. 前置: 查 top 3 历史（后台）
2. 读 prompt: Read scripts/prompts/<步骤>.json
3. 读引擎: Read engine_ref 指向的 engine/*.md
4. 执行: 主线程直行；或起子 agent。全部返回后，**先把每个 agent 产出逐条展示到对话，再汇总**
5. 后置: 清晰度评分（后台执行），结果输出到对话
```

| 阶段 | 提示文件 | 目标 | 做法 |
|-----|---------|------|------|
| 神思 | scripts/prompts/shensi.json | 跳出常规思维 | 主线程直行 |
| 发散 | scripts/prompts/divergence.json | 多角度审视 | 主线程直行 |
| 八卦镜 | scripts/prompts/bagua.json | 8维度评分 | 每维度一个 agent(dimension-evaluator)，全部返回后汇总 |
| 方案 | scripts/prompts/plans.json | 5-8个可选方案 | 每方案一个 agent(solution-generator)，全部返回后汇总 |
| 收敛 | scripts/prompts/converge.json | 保留最优 | 主线程直行 |
| 推演 | scripts/prompts/simulate.json | 模拟各方案 | 每方案一个 agent(mcts-simulator)，全部返回后汇总 |
| 辩论 | scripts/prompts/debate.json | 排名推荐 | 一轮立论→汇总展示→二轮反驳→汇总排名 |
| 综合 | scripts/prompts/synthesis.json | 结论+风险 | 主线程直行 |

### ⛔ 清晰度检查（不做不能进入下一步）

```
1. 调用 node scripts/clarity-check.js '<步骤产出的JSON>' <步骤名>
   返回: { algoScore, fuzzyCount, fieldScore, warning }

2. if algoScore ≥ 0.7 AND 无 warning:
     "✅ 通过 → 继续"
     必须调用 orchestrate.js step <步骤名> <问题类型> '<步骤产出JSON>' 存产出
   else:
     "❌ 清晰度不足 — [warning 或 分数不足]"
     检查问题所在，修正后重做该步
```

### 呈现结论
用自然语言串联各阶段推理，不要出现"第X步"、"现在进入XX阶段"等机械标签。整体读起来像一个人在讲述分析思路。

格式要求:
- 评分和对比数据用表格展示，配上评价性文字，不要单列数字
- 关键亮点用 ⭐ 或 💡 等图标标注，吸引注意
- 风险用 ⚠️ 标注，结论用 ✅ 标注
- 不允许出现 JSON、文件路径、Bash 命令
- 不允许出现框架内部术语
- 每段至少 2-3 句话，不能只是要点罗列

### 流程结束后
```
node scripts/orchestrate.js finalize <类型> <问题>
```
保洁 + 学习。
