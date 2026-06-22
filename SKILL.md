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

### Step 11: 呈现结果 — 展开子agent发现

管道返回的 JSON 包含每个子 agent 的产出。**不能只给最终结论。必须逐一展开每步的发现, 让用户看到完整的推理链：**

```
【发散】子agent发现了一个反直觉的角度: [最意外的发现]
【八卦镜】8个维度交叉后最异常的是: [核心矛盾]
【推演】3个子agent并行推演了每个方案:
  · 方案A走了一遍: [推理过程]
  · 方案B走了一遍: [推理过程]
  · 方案C走了一遍: [推理过程]
【辩论】子agent之间产生了分歧: [核心分歧点]
【综合】推荐[方案], 理由: [引用用户原话]
风险: [一句话]
```

**每步输出的是"子agent发现了什么", 不是"子agent做了什么"。**
**用【】标题翻译为用户能理解的语言, 内容用自然语言展开。**

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
7. 会话结束时调 `mma finalize` 巩固记忆。

## 强制调用

| 时机 | 操作 |
|------|------|
| 采访后 | `Workflow({scriptPath: "scripts/ponder-pipeline.wf.js", args})` — 管道内自含所有步骤 |
| 每步 | `profile observe default --behavior <x>` (Bash调, 但用户看不到输出) |
| 结束 | `mma finalize` — 巩固记忆 |
