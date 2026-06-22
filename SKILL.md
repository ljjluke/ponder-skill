---
name: ponder
alwaysApply: true
description: 7-phase cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.32
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 一次一问, 覆盖天时/地利/人和/法/本质。所有问题必须带选项, 不能只让用户打字。不准问废话。

### Steps 2-8: 调用管道

```
Workflow({
  scriptPath: "[插件目录]/scripts/ponder-pipeline.wf.js",
  args: JSON.stringify({ userRequest: "<问题>", userProfile: "<画像>" })
})
```

### Step 9: 呈现
管道返回的 JSON 包含每步产出。逐项展示每步的推理链和结论, 不能合并为一句。
用自然语言, 不展示 JSON/路径/Bash 命令。
