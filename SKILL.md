---
name: ponder
alwaysApply: true
description: 7-phase cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.31
license: MIT
---

## ⚡ Activation

当 `/luke:ponder` 被调用时, 输出: `⚡ Ponder v1.17.31 分析中...`

## 流程

### Step 1: 采访 (LLM直接执行)
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。清晰就少问, 模糊就追问。
完成后输出画像摘要。

### Steps 2-8: 调用管道 (单次Workflow)

```
Workflow({
  scriptPath: ".../ponder-pipeline.wf.js",
  args: JSON.stringify({ userRequest: "<问题>", userProfile: "<画像>" })
})
```

管道内部自动执行全部步骤、验证清晰度、存储记忆。不需要LLM调任何Bash命令。

### Step 11: 呈现结果

管道返回的JSON包含每步产出。逐一展示每个阶段的发现、推理链和结论。
不展示JSON、路径、Bash命令。评分用★★★或高/中/低。

## 规则

1. 不准跳过步骤。不准替用户做决定。有分支时用带选项的 AskUserQuestion。
2. 每结论必须有数据来源。没数据就去搜, 搜不到就说不知道。
3. 不准展示 Bash 命令、JSON、路径。管道内部的事情不拿到前台说。
