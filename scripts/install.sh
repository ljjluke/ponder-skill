#!/usr/bin/env bash
# =============================================================================
# MCTS-TD Planner — Claude Code 安装脚本
#
# 此脚本仅适用于 Claude Code。
# 其他平台（Cursor / OpenCode / Trae / CodeX）只支持单文件规则，
# 无法利用本项目的多文件模块化结构，请手动参考 deploy/ 下的文件。
# =============================================================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}ℹ️${NC} $1"; }
ok()    { echo -e "${GREEN}✅${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠️${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; }

# 项目根目录（脚本所在目录的上级）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# =============================================================================
# 安装函数
# =============================================================================

install_claude_code() {
    info "Claude Code 安装中..."

    # Claude Code 的 SKILL 安装路径
    local skill_dir="$HOME/.claude/skills/mcts-td-planner"
    mkdir -p "$skill_dir"

    # 复制核心文件
    cp "$PROJECT_DIR/SKILL.md" "$skill_dir/"
    cp "$PROJECT_DIR/.claude-plugin/plugin.json" "$skill_dir/" 2>/dev/null || true

    # 复制目录结构
    for dir in rules/ engine policies agents references memory/archive scripts deploy; do
        if [ -d "$PROJECT_DIR/$dir" ]; then
            mkdir -p "$skill_dir/$dir"
            cp -r "$PROJECT_DIR/$dir"/* "$skill_dir/$dir/" 2>/dev/null || true
        fi
    done

    # 初始化记忆数据目录（如果不存在）
    local data_dir="$HOME/.claude/data/skills/mcts-td-planner"
    if [ ! -f "$data_dir/memory/mcts-td-value-archive.md" ]; then
        mkdir -p "$data_dir/memory/archive"
        cp "$PROJECT_DIR/memory/mcts-td-value-archive.md" "$data_dir/memory/" 2>/dev/null || true
        ok "记忆数据目录已初始化"
    else
        info "记忆数据目录已存在，跳过初始化（数据保留）"
    fi

    ok "Claude Code 安装完成！"
    info "Skill 目录: $skill_dir"
    info "记忆数据: $data_dir（更新 skill 不会丢失）"
    info ""
    info "使用方法：输入任意任务，看到 ⚡ 标志说明生效"
}

# =============================================================================
# 主流程
# =============================================================================

main() {
    echo ""
    echo "==========================================="
    echo "  🧠 MCTS-TD Planner — Claude Code 安装"
    echo "==========================================="
    echo ""

    # 检查项目目录完整性
    if [ ! -f "$PROJECT_DIR/SKILL.md" ]; then
        error "未找到 SKILL.md，请确保在项目根目录运行此脚本"
        exit 1
    fi

    # 检查是否在 Claude Code 环境中
    if [ -z "${CLAUDE_CODE:-}" ]; then
        warn "未检测到 Claude Code 环境变量"
        warn "其他平台（Cursor / OpenCode / Trae / CodeX）仅支持单文件规则"
        warn "无法利用本项目的多文件模块化结构，体验会大幅简化"
        echo ""
        read -p "是否仍然继续安装到 Claude Code 的目录？(y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            info "安装已取消"
            exit 0
        fi
    fi

    install_claude_code

    echo ""
    echo "==========================================="
    echo "  🎉 安装完成！"
    echo "==========================================="
}

main "$@"