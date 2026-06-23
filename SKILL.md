---
name: ponder
alwaysApply: true
description: "8-step structured reasoning. Domain-agnostic. Each step: read prompt → load engine docs → execute → present results."
version: 1.18.12
license: MIT
---

## 流程

⛔ 禁止做任何环境检查、配置验证、文件扫描等与用户问题无关的操作。直接开始。

### 需求打磨
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项。
完成后用一两句话总结用户需求。

### 分析阶段

⛔ 所有输出中不允许出现框架内部术语，用自然语言表达。
⛔ 不允许输出"正在等待"、"让我检查"、"等待中"等无关状态消息。只输出结论和评分。
⛔ 子 agent 全部返回后，必须先把各 agent 的产出内容展示到对话，再汇总或进入下一步。禁止跳过展示。
⛔ 每步必须按以下顺序完整执行。读文件用 Read 工具，禁止 bash echo:

```
（内部执行顺序，不输出步骤编号和标签）
1. 查历史 + 错误警告（注入 prompt，作为当前分析的参考和补充。历史不足时自行评估领域常识和可行性边界）
2. 读 JSON prompt
3. 读引擎文档
4. **执行**: 主线程直行；或起子 agent（全部返回后，**必须把每个 agent 的产出逐条展示到对话再汇总，禁止跳过**）
5. **需求确认**: 神思/发散/八卦镜 扩展出的内容中，**涉及用户需求/偏好/真实情况的才问**（用 AskUserQuestion 让用户选）。纯分析性盲点和视角直接交给方案阶段处理，不需要问
6. orchestrate.js step 存产出（后台）
```

| 阶段 | 提示文件 | 目标 | 做法 |
|-----|---------|------|------|
| 神思 | scripts/prompts/shensi.json | 跳出常规思维 | 主线程直行 |
| 发散 | scripts/prompts/divergence.json | 多角度审视 | 主线程直行 |
| 八卦镜 | scripts/prompts/bagua.json | 发现盲点 | 每维度一个 agent，全部返回后汇总 |
| 方案 | scripts/prompts/plans.json | 5-10个可选方案 | 每方案一个 agent(solution-generator)，全部返回后汇总 |
| 方案评分 | scripts/prompts/simulate.json | 8维度评方案 | 每方案一个 agent，用8维度评分，全部返回后汇总 |
| 收敛 | scripts/prompts/converge.json | 依据评分保留最优 | 主线程直行 |
| 推演 | — | 模拟幸存方案 | 每方案一个 agent(mcts-simulator) |
| 辩论 | scripts/prompts/debate.json | 排名推荐 | 每方案立论→汇总→攻击评估→抗压排名 |
| 综合 | scripts/prompts/synthesis.json | 最终结论+风险 | 主线程直行 |

### 用户确认
辩论后、最终结论前，简要总结问题盲点，用 AskUserQuestion 询问用户是否有补充或想调整的方向。用户回应后再出最终结论。

### 呈现结论
用自然语言串联各阶段推理，不要出现"第X步"、"现在进入XX阶段"等机械标签。

通用格式:
- 评分/对比/排名 用表格展示，表格简洁不拥挤，每列宽度适宜
- ⭐ 标注亮点，💡 标注关键发现，⚠️ 标注风险，✅ 标注结论，🏆 标注最终推荐
- 不允许出现 JSON、文件路径、Bash 命令
- 不允许出现框架内部术语
- 每段至少 2-3 句话
- 同类型内容用分隔线区分，不要堆在一起

各阶段具体格式:
- **八卦镜**: 维度评分表格 + 最异常维度的单独说明（1-2句）
- **方案**: 方案对比表格（名称/方向/核心逻辑三列即可）
- **推演**: 模拟结果表格（方案/评分/关键发现/瓶颈四列）+ 💡发现单独突出
- **辩论**: 排名表格 + 各方案抗压能力一句话点评
- **最终结论**: 🏆 推荐方案（加粗突出）→ 核心判断 → 风险与应对 → 待确认事项

### 流程结束后
```
node scripts/orchestrate.js finalize <类型> <问题>
```
保洁 + 学习。
