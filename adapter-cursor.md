# Ponder → Cursor 适配方案

## 方案: 多 .mdc 规则文件 + Agent 模式 + 全 CLI

### 规则文件拆分

创建一个适配脚本, 一键生成 `.cursor/rules/` 目录下的所有规则文件:

```bash
node scripts/adapt-cursor.js
```

生成的文件结构:

```
.cursor/rules/
├── 00-core.mdc              # 绝对规则 + 输出过滤器 (always apply)
├── 01-interview.mdc          # 采访阶段规则 (描述式触发)
├── 02-divergence.mdc         # 发散/神思/八卦镜规则
├── 03-plans.mdc             # 方案生成规则
├── 04-simulation.mdc         # 推演规则
├── 05-synthesis.mdc          # 辩论/综合/验证规则
├── 06-memory.mdc             # MMA 记忆召回规则
├── 07-depth-loop.mdc         # 深度循环触发规则
.cursor/modes.json            # Ponder Agent 模式
```

### 规则文件内容示例

每个 .mdc 文件包含:
1. frontmatter (用于 Cursor 判断何时触发)
2. 该阶段的 CLI 命令引用
3. 输出格式要求

```markdown
---
description: "Ponder divergence phase — 神思 + 六视 + 八卦镜"
globs: []
alwaysApply: false
---

## 发散阶段 (Agent 手动触发)

当你需要多角度分析问题时:

1. 神思: 先让精神漫游 (打破框架)
   ```bash
   node <插件路径>/scripts/mcts.js compute random-anchor
   ```
   使用返回的种子从训练数据中选冷门知识, 与问题强关联。

2. 六视: 切换6种视角系统审视

3. 八卦镜: 8维度交叉检查

完整规则在: `<插件路径>/engine/mcts-diverge.md`
```

### Agent 模式配置

`.cursor/modes.json`:

```json
{
  "modes": [
    {
      "name": "Ponder",
      "description": "深度分析模式 — 先拆解需求, 再发散/推演/综合",
      "model": "claude-3.5-sonnet",
      "systemPrompt": "node <插件路径>/scripts/adapt-rule.js",
      "tools": ["agent"]
    }
  ]
}
```

### 核心逻辑

所有 `scripts/` 下的文件无需修改 — Cursor Agent 可以直接 `node scripts/mcts.js mma recall '...'`。

需要额外的工作:
1. `scripts/adapt-cursor.js` — 一键生成本地 `.cursor/rules/` 配置
2. 路径解析 — 因为 Cursor 中插件路径与 Claude Code 不同

### 安装方式

```bash
# 1. 下载项目到本地
git clone https://github.com/ljjluke/ponder-skill.git
cd ponder-skill

# 2. 运行适配脚本 (生成 .cursor/rules/)
node scripts/adapt-cursor.js

# 3. 或者直接从 GitHub 加载远程规则
# Cursor Settings → Rules → Add Remote Rule
# 添加 https://github.com/ljjluke/ponder-skill/raw/main/.cursor/rules/00-core.mdc
```

### 能力对比

| 功能 | Claude Code | Cursor |
|------|-----------|--------|
| 需求拆解 | 采访阶段 | 同, Agent 执行 |
| 神思+六视 | MMA CLI | 同, 规则文件 |
| 推演 | MCTS tree | 同, 脚本通用 |
| 记忆 | hooks自动触发 | 需要手动 `mma recall` |
| 深度循环 | is_clear 检查 | 规则文件中的条件 |
| 自动存储 | hooks + orchestrate | 需要手动调用 |
| 模型 | Claude | 支持多种(claude/gpt/gemini) |
