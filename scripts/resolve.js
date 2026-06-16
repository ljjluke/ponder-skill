#!/usr/bin/env node
/**
 * 跨平台插件路径解析器
 * 在所有操作系统(Linux/macOS/Windows Git Bash)上统一找到插件目录
 * 用法: node scripts/resolve.js <scripts/mcts.js args...>
 * 示例: node scripts/resolve.js profile info default
 */
const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

// 搜索顺序: 当前目录 → 插件缓存 → 兜底
const CANDIDATES = [
    // 当前工作目录
    process.cwd(),
    // 插件缓存目录 (跨平台: os.homedir() 在Windows返回 C:\Users\...)
    path.join(os.homedir(), '.claude', 'plugins', 'cache', 'luke', 'luke'),
    path.join(os.homedir(), '.claude', 'plugins', 'cache', 'mcts', 'mcts'),
    path.join(os.homedir(), '.claude', 'plugins', 'cache', 'mcts-td-planner', 'mcts-td-planner'),
];

// 找最新的版本目录
function findPluginDir() {
    for (const base of CANDIDATES) {
        try {
            const items = require('fs').readdirSync(base)
                .filter(f => /^\d+\.\d+\.\d+$/.test(f))
                .sort((a, b) => {
                    const [a1,a2,a3] = a.split('.').map(Number);
                    const [b1,b2,b3] = b.split('.').map(Number);
                    return b1-a1 || b2-a2 || b3-a3;
                });
            if (items.length > 0) {
                const dir = path.join(base, items[0]);
                // 验证 mcts.js 存在
                if (require('fs').existsSync(path.join(dir, 'scripts', 'mcts.js'))) {
                    return dir;
                }
            }
        } catch (e) { /* try next */ }
    }
    // 兜底: 假设自己在插件目录
    const selfDir = path.dirname(process.argv[1]);
    const projectRoot = path.dirname(selfDir); // scripts/ 的父目录
    if (require('fs').existsSync(path.join(projectRoot, 'scripts', 'mcts.js'))) {
        return projectRoot;
    }
    return process.cwd();
}

function main() {
    const pluginDir = findPluginDir();
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(pluginDir); // 只输出路径
        process.exit(0);
    }

    const scriptPath = path.join(pluginDir, 'scripts', 'mcts.js');
    if (!require('fs').existsSync(scriptPath)) {
        console.error(`[resolve] mcts.js not found at ${scriptPath}`);
        process.exit(1);
    }

    const result = spawnSync('node', [scriptPath, ...args], {
        cwd: pluginDir,
        stdio: 'inherit',
    });
    process.exit(result.status || 0);
}

main();
