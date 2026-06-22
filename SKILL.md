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
║   先拆解 → 发散 → 推演 → 收敛        ║
╚═══════════════════════════════════════╝
```

## ⛔ Step Gate (Code-enforced)

每步完成后必须调: `node scripts/mcts.js compute step-gate --step <步骤> --score <清晰度> --issues <问题数>`
返回 BLOCKED → 不能进入下一步, 重做当前步骤。LLM 不能绕过。

| Step | Pass condition | If blocked |
|------|---------------|------------|
| interview | score≥6, issues≤2 | keep asking |
| divergence | score≥3 (≥3 perspectives) | add more |
| falsification | issues≥1 (≥1 contradiction) | redo divergence |
| scoring | score≥3 (≥3 dimensions) | add dimensions |

## 绝对规则

1. 不准跳过步骤。采访→发散(神思→六视→八卦镜)→推演→评分→辩论→综合→验证, 每步必做。
2. 不准无数据做判断。每结论必须有数据来源。
3. 不准替用户做决定。有分支时用 AskUserQuestion 问用户。
4. 所有问题用带选项的 AskUserQuestion。
5. 用户需求描述不清→追问到清。清晰→不问多余问题。

**深度循环**: `node scripts/mcts.js template depth-loop` — 任何步骤不清晰就循环本步, 不清不推进, 无上限。用户可见触发原因。

**流程详细**: `node scripts/mcts.js template pipeline-steps`
**输出格式**: `node scripts/mcts.js template output-format`

## 强制CLI调用

| 时机 | CLI | 作用 |
|------|-----|------|
| 神思后 | `compute random-anchor` | 获取外部锚点 |
| 八卦镜后 | `compute falsification-check` | 反证检验 |
| 每步 | `profile observe --behavior <x>` | 记录用户偏好 |
| 综合后 | `mma remember '{"description":"..."}'` | 存入记忆 |
| 会话结束 | `mma finalize` | 睡眠巩固 |

## 输出过滤器

□ 用户语言？不是就翻
□ 含 CLI/JSON/术语？删
□ 每行都是用户看得懂的洞察？不是就删
