---
name: ponder
alwaysApply: true
description: 7-phase cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.4
license: MIT
---

## ⚡ Activation

当 `/luke:ponder` 被调用时, 输出启动界面:

```
╔═══════════════════════════════════════╗
║           Ponder  v1.17.11           ║
║  采访 → 子agent管道 → 综合输出       ║
╚═══════════════════════════════════════╝
```

## 流程

### Step 1: 采访 (LLM直接执行)
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。清晰就少问, 模糊就追问。
完成后输出画像摘要, 指出用户没意识到的矛盾点。

### Steps 2-8: 子agent管道 (单次Workflow调用, 无Bash输出)

管道内部自动处理编排、验证、存储，不需要 LLM 单独调任何 Bash 命令。

```bash
# 只需要一行
Workflow({scriptPath: "scripts/ponder-pipeline.wf.js", args: { userRequest: "<问题描述>", userProfile: "<画像>" }})
```

管道内部: before(加载规则) → 采集→发散→八卦镜→方案→推演(并行子agent)→辩论→综合→验证 → after(存储+指标)
每步完成后管道内部调 step-gate 自检, 不经过 Bash, 不产生用户可见的输出。

### Step 11: 呈现结果 — 逐个子agent展开发现

**管道完成后, 必须逐一展示每个子agent的发现, 不能合并成一句。** Workflow 的 agent 完成标记用户已经看到了, 现在需要告诉他们每个 agent 具体发现了什么。

```
【采集】子agent搜索到: [数据发现1], [数据发现2], [数据发现3]
         → 这些数据说明: [分析结论]
         ✓ 清晰 (1轮完成)

【发散】子agent从6个视角审视后, 最反直觉的发现是:
         [具体发现和推理过程]
         → 这意味着: [对当前问题的启示]
         ⚠️ 经过3轮深度循环才清晰 (初始不清晰→追问→深化→清晰)

【八卦镜】8个维度交叉后, 最异常的维度是[维度名]:
          [具体数据和分析]
          → 核心矛盾在: [矛盾点]
          ✓ 清晰 (1轮完成)

【推演】3个子agent各自独立模拟了一个方案:
  子agent A推演[方案A]: [完整推理链, 遇到什么情况, 最后结果]
  子agent B推演[方案B]: [完整推理链, 遇到什么情况, 最后结果]
  子agent C推演[方案C]: [完整推理链, 遇到什么情况, 最后结果]

【辩论】两个子agent立场交锋:
  [方案A]方观点: "..." → [方案B]方反驳: "..." → 分歧根本点: "..."

【推演】3个子agent各自独立模拟了一个方案 — 3轮深度循环后清晰:
  子agent A推演[方案A]: [完整推理链, 遇到什么情况, 最后结果]
  子agent B推演[方案B]: [完整推理链, 遇到什么情况, 最后结果]
  子agent C推演[方案C]: [完整推理链, 遇到什么情况, 最后结果]

【辩论】两个子agent立场交锋 — ✓ 清晰:
  [方案A]方观点: "..." → [方案B]方反驳: "..." → 分歧根本点: "..."

【综合】推荐[方案]。理由: [引用用户原话]。
风险: [一句话]
✓ 综合判断清晰
```

⛔ 管道完成后的 JSON 包含每个子 agent 的完整产出。LLM 必须逐个读取并展开, 不能跳过任何一个阶段。
⛔ 每步输出的是"子 agent 发现了什么", 不是"子 agent 做了什么"。
⛔ 子 agent 之间的分歧点必须显式展示(这是最让用户"震撼"的部分)。

展示：每步亮点 + 推理链 + 方案评分对比(表格/星级) + 辩论分歧 + 推荐 + 风险。
评分用"★★★"或"高/中/低"展示, 不用原始数字。
不展示：CLI/JSON/路径。

## 规则

1. 不准跳过步骤。采访→子agent管道(采集/发散/八卦镜/方案/推演/辩论/综合/验证)→输出。
2. 不准无数据做判断。每结论必须有数据来源。
3. 不准替用户做决定。有分支时用 AskUserQuestion 问用户。
4. 所有问题用带选项的 AskUserQuestion。
5. **不准在用户面前展示任何 Bash 调用、JSON、代码路径。管道返回的 JSON 必须用自然语言总结后展示。**
6. 管道内部自动做步骤验证, LLM 不需要单独调 step-gate。
7. 会话结束时调 `node scripts/mcts.js mma finalize` 巩固记忆。

## 强制调用

| 时机 | 操作 |
|------|------|
| 采访后 | `Workflow({scriptPath: "scripts/ponder-pipeline.wf.js", args})` — 管道内自含所有步骤 |
| 每步 | `profile observe default --behavior <x>` (Bash调, 但用户看不到输出) |
| 结束 | `node scripts/mcts.js mma finalize` — 巩固记忆 |
