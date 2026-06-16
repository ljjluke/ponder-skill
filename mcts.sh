#!/usr/bin/env bash
# MCTS-TD cross-platform CLI wrapper
# Usage: ./mcts.sh <command> [args...]
# Works from any directory on Linux/macOS/Windows Git Bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$DIR/scripts/mcts.js" "$@"
