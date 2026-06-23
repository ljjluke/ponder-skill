# Ponder → Cursor 适配方案

## 方案: 多 .mdc 规则文件 + Agent 模式 + CLI 工具

规则文件已在 `adapters/cursor/` 目录下生成。

### 安装方式

```bash
# 1. 下载项目到本地
git clone https://github.com/ljjluke/ponder-skill.git
cd ponder-skill

# 2. 复制规则到 Cursor 配置目录
cp -r adapters/cursor/* .cursor/

# 3. 或者在 Cursor Settings → Rules → Add Remote Rule
# 添加 https://github.com/ljjluke/ponder-skill/raw/main/adapters/cursor/rules/00-core.mdc
```

### 规则文件结构

```
.cursor/rules/
├── 00-core.mdc         # 核心规则（always apply）
├── 01-interview.mdc     # 需求打磨阶段
├── 02-divergence.mdc    # 神思 + 发散 + 八卦镜
├── 03-plans.mdc         # 方案 + 8维评分 + 收敛
├── 04-simulation.mdc    # 推演
├── 05-synthesis.mdc     # 辩论 + 用户确认 + 结论
├── 06-memory.mdc        # MMA 记忆操作
└── 07-quality.mdc       # 输出质量检查
.cursor/modes.json       # Ponder Agent 模式
```

### 与 Claude Code 能力对比

| 功能 | Claude Code | Cursor |
|------|-----------|--------|
| 需求打磨 | SKILL.md 编排 | 01-interview.mdc 规则 |
| 神思+发散+八卦镜 | 同上 | 02-divergence.mdc 规则 |
| 方案+评分+收敛 | 同上 | 03-plans.mdc 规则 |
| 推演 | 同上 | 04-simulation.mdc 规则 |
| 辩论+确认+结论 | 同上 | 05-synthesis.mdc 规则 |
| 记忆存储 | orchestrate.js 自动 | 06-memory.mdc 手动 |
| 输出质量 | SKILL.md 约束 | 00-core.mdc + 07-quality.mdc |
| 模型 | Claude 系列 | 支持多种模型 |

### 差异说明

- Cursor 没有 `alwaysApply` 技能机制，规则通过 .mdc 文件触发
- Cursor 的 Agent 模式需要手动切换（Ponder 模式）
- Cursor 中插件路径与 Claude Code 不同，需替换 `<插件路径>` 为实际安装路径
- 自动记忆存储由 `hooks/hooks.json` 触发，Cursor 需要手动执行记忆操作
