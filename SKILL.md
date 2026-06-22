---
name: ponder
alwaysApply: true
description: 7-phase cognitive pipeline with code-enforced depth loop. Domain-agnostic.
version: 1.17.31
license: MIT
---

## 流程

### Step 1: 采访
用 AskUserQuestion 覆盖天时/地利/人和/法/本质。完成后输出画像。

### Steps 2-8: 调用管道

```
Workflow({
  scriptPath: "[插件目录]/scripts/ponder-pipeline.wf.js",
  args: JSON.stringify({ userRequest: "<问题>", userProfile: "<画像>" })
})
```

管道返回 JSON, 包含每步的产出。展示结论时用自然语言, 不展示JSON/路径/Bash命令。
