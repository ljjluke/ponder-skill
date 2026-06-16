@echo off
REM MCTS-TD CLI wrapper for Windows CMD
REM Usage: mcts.cmd <command> [args...]
set DIR=%~dp0
node "%DIR%scripts\mcts.js" %*
