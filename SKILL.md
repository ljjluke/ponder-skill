---
name: ponder
alwaysApply: true
description: Data-driven analysis pipeline for Claude Code. 7-phase cognitive workflow with code-enforced depth loop. Every claim needs a source. Domain-agnostic.
version: 1.17.4
license: MIT
---

## ⚡ Activation

当 `/luke:ponder` 被调用时, 输出启动界面, 然后按以下规则执行:

```
╔═══════════════════════════════════════╗
║           Ponder  v1.17.10           ║
║   采访 → 神思 → 发散 → 推演 → 收敛    ║
╚═══════════════════════════════════════╝
```

## ⛔ Step Gate (Code-enforced)

每步完成后必须调: `node scripts/mcts.js compute step-gate --step <步骤> --score <清晰度> --issues <问题数>`
返回 BLOCKED → 不能进入下一步, 重做当前步骤。LLM 不能绕过。

| Step | Pass condition | If blocked |
|------|---------------|------------|
| interview | score≥6, issues≤2 | keep asking |
| shensi | score≥5 (≥1 counter-intuitive finding) | deepen 神思 |
| divergence | score≥3 (≥3 perspectives) | add more perspectives |
| falsification | issues≥1 (≥1 contradiction) | redo divergence |
| scoring | score≥3 (≥3 dimensions) | add dimensions |

## 绝对规则

1. 不准跳过步骤。采访→神思→发散(六视→八卦镜)→推演→评分→辩论→综合→验证, 每步必做。
2. 不准无数据做判断。每结论必须有数据来源。
3. 不准替用户做决定。有分支时用 AskUserQuestion 问用户。
4. 所有问题用带选项的 AskUserQuestion。
5. 用户需求描述不清→追问到清。清晰→不问多余问题。
6. **不准在用户面前展示任何 CLI 命令、Bash 调用、JSON、代码路径。所有 CLI 调用的结果必须用自然语言总结后展示，原始输出不准出现。**

**深度循环**: `node scripts/mcts.js template depth-loop` — 任何步骤不清晰就循环本步, 不清不推进, 无上限。用户可见触发原因。

**流程详细**: `node scripts/mcts.js template pipeline-steps`
**输出格式**: `node scripts/mcts.js template output-format`

## 强制CLI调用

| 时机 | CLI | 作用 |
|------|-----|------|
| 【神思】打破框架 | 内部五步法, 不调CLI | 虚静→神凝→神游→意象→言意, 产出至少1个反直觉发现 |
| 【发散】多视角+交叉 | `compute falsification-check` | 六视+八卦镜后反证检验 |
| 【推演】子进程模拟 | `compute simulate --plans '<json>'` | 每个方案独立进程推演 |
| 【辩论】立场生成 | `compute debate --plans '<json>'` | 各方案自动生成立场 |
| 【反证】八卦镜后 | `compute falsification-check` | 反证检验 |
| 【记录】每步 | `profile observe --behavior <x>` | 记录用户偏好 |
| 【存储】综合后 | `mma remember '{"description":"..."}'` | 存入记忆 |
| 【巩固】会话结束 | `mma finalize` | 睡眠巩固 |

## 输出过滤器

□ 用户语言？不是就翻
□ 含 Bash 工具调用痕迹(命令/路径/JSON/执行过程)？删。用户只看自然语言结果。
□ 含 JSON/评分数字？删。评分用"高/中/低"或"★"代替数字。
□ 每一行用户都看得懂是什么？不是就删。
