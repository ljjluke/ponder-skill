/**
 * Ponder Memory Monitor — 持续运行的后台记忆守护进程
 *
 * 监控 /tmp/ponder-knowledge/ 目录下的新知识文件，自动分类存储到MMA
 * 由 SessionStart hook 启动，Claude关闭时自动终止
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WATCH_DIR = '/tmp/ponder-knowledge';
const PID_FILE = '/tmp/ponder-monitor.pid';

// 确保监控目录存在
if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });

// 写PID文件标识自己正在运行
fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

let processedFiles = new Set();

function processKnowledge(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const mmaPath = data.plugin_path
      ? path.join(data.plugin_path, 'scripts', 'mcts.js')
      : '';

    if (fs.existsSync(mmaPath)) {
      const tagStr = (data.tags || []).join('","');
      const desc = data.description.replace(/"/g, '\\"');

      // 存储到MMA
      const result = spawnSync('node', [mmaPath, 'mma', 'ashi', JSON.stringify({
        description: desc.substring(0, 500),
        tags: data.tags || [],
        category: data.category || 'tools_and_means',
        emotion: data.emotion || 'an',
        q: data.q || 0.6,
      })], { timeout: 10000 });

      if (result.status === 0) {
        // 标记已处理：重命名文件
        fs.renameSync(filePath, filePath + '.done');
        console.log(`[Ponder-Monitor] ✅ Stored: ${desc.substring(0, 50)}...`);
      } else {
        console.error(`[Ponder-Monitor] ❌ Store failed: ${result.stderr?.toString().substring(0, 100)}`);
      }
    } else {
      // mcts.js 不存在，暂时跳过
      console.log(`[Ponder-Monitor] ⏳ Waiting for mcts.js at ${mmaPath}`);
    }
  } catch (e) {
    // 解析失败（文件正在写入），跳过
    console.log(`[Ponder-Monitor] ⏳ File not ready: ${filePath}`);
  }
}

console.log(`[Ponder-Monitor] 🟢 Started (PID: ${process.pid})`);
console.log(`[Ponder-Monitor] 📁 Watching: ${WATCH_DIR}`);

// 主循环：每秒检查新文件
const interval = setInterval(() => {
  try {
    if (!fs.existsSync(WATCH_DIR)) return;

    const files = fs.readdirSync(WATCH_DIR)
      .filter(f => f.endsWith('.json') && !f.endsWith('.done.json'))
      .sort();

    for (const file of files) {
      const filePath = path.join(WATCH_DIR, file);
      if (!processedFiles.has(filePath)) {
        processedFiles.add(filePath);
        processKnowledge(filePath);
      }
    }
  } catch (e) {
    // 忽略临时错误
  }
}, 1000); // 每秒检查一次

// 优雅退出
process.on('SIGTERM', () => {
  clearInterval(interval);
  try { fs.unlinkSync(PID_FILE); } catch(e) {}
  console.log('[Ponder-Monitor] 🔴 Stopped');
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(interval);
  try { fs.unlinkSync(PID_FILE); } catch(e) {}
  process.exit(0);
});
