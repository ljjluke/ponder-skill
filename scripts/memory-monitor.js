/**
 * Ponder Memory Monitor — 后台记忆守护进程
 *
 * 两种工作模式:
 *   主动模式: 技能步骤调 knowledge acquire 查询记忆（skill内部）
 *   被动模式: 监控 Claude 输出中的有用信息，过滤噪声后存储（全窗口）
 *
 * 启动: SessionStart hook
 * 终止: SessionEnd hook 或 Claude 关闭
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const WATCH_DIR = '/tmp/ponder-knowledge';
const PID_FILE = '/tmp/ponder-monitor.pid';

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

// ─── 信息质量过滤算法 ───
// 过滤掉无用的信息，只保留有价值的知识

// 中文无意义词汇（过滤掉只有这些词的内容）
const NOISE_WORDS = new Set([
  '嗯', '哦', '啊', '好的', '明白', '知道了', '是的', '对的', '没错',
  '嗯嗯', '好', '行', 'ok', 'okay', '收到', '了解', '呵呵', '哈哈',
  '再见', '拜拜', '谢谢', '感谢', '不客气', '没事',
  'hello', 'hi', 'hey', 'yes', 'no', 'ok', 'thanks',
])

// 信息密度评分: 值越高越值得存储
function qualityScore(text) {
  if (!text || typeof text !== 'string') return 0
  const t = text.trim()
  if (t.length < 15) return 0  // 太短，无价值
  if (t.length > 5000) return 0.3  // 太长，可能是对话记录而非知识

  // 纯噪声词
  if (NOISE_WORDS.has(t.toLowerCase())) return 0

  // 含数字/百分比/日期 → 高价值（数据型知识）
  const hasData = /\d+%|\d+\.\d+|\d{4}年|\d+月|\d+亿|\d+万|涨幅|跌幅|收益率/.test(t)
  // 含结论性词汇 → 有价值
  const hasConclusion = /因此|所以|结论|建议|应该|需要|必须|原因是|因为|意味着|说明|表明/.test(t)
  // 含结构标记 → 高价值
  const hasStructure = /[①②③④⑤⑥⑦]|[-–—]\s|\d+[\.\)]\s|方案|视角|维度/.test(t)
  // 含争议/矛盾 → 高价值
  const hasConflict = /矛盾|冲突|分歧|争议|不同观点|vs|VS|对比|差异/.test(t)
  // 含来源 → 可信度高
  const hasSource = /根据|报道|研究|数据显示|统计|来源|引用/.test(t)
  // 含推理 → 有价值
  const hasReasoning = /推理|推导|基于|依据|因为|所以|如果|那么/.test(t)

  let score = 0.3  // 基础分
  if (hasData) score += 0.3
  if (hasConclusion) score += 0.2
  if (hasStructure) score += 0.15
  if (hasConflict) score += 0.15
  if (hasSource) score += 0.1
  if (hasReasoning) score += 0.1

  // 长度奖励: 100-500字的知识描述最佳
  if (t.length >= 50 && t.length <= 1000) score += 0.1
  if (t.length < 30) score *= 0.5  // 太短扣分

  return Math.min(1.0, score)
}

// 自动分类
function autoCategorize(text, q) {
  if (q >= 0.7) return 'tools_and_means'  // 高质量知识
  if (text.includes('建议') || text.includes('方案') || text.includes('策略')) return 'methods'
  if (text.includes('分析') || text.includes('数据') || text.includes('统计')) return 'analysis'
  if (text.includes('历史') || text.includes('案例') || text.includes('经验')) return 'experience'
  return 'tools_and_means'
}

function processKnowledge(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const mmaPath = data.plugin_path
      ? path.join(data.plugin_path, 'scripts', 'mcts.js')
      : '';

    // 质量过滤
    const q = data.q || qualityScore(data.description || '')
    if (q < 0.3) {
      fs.renameSync(filePath, filePath + '.lowq')
      console.log(`[Ponder-Monitor] ⏭️ Low quality (${q.toFixed(2)}), skipped: ${(data.description||'').substring(0, 50)}`)
      return
    }

    if (fs.existsSync(mmaPath)) {
      const desc = data.description.replace(/"/g, '\\"').substring(0, 500)
      const category = data.category || autoCategorize(data.description, q)
      const tags = data.tags || []
      const emotion = data.emotion || (q >= 0.7 ? 'xi' : 'an')

      const result = spawnSync('node', [mmaPath, 'mma', 'ashi', JSON.stringify({
        description: desc,
        tags: tags,
        category: category,
        emotion: emotion,
        q: q,
      })], { timeout: 10000 });

      if (result.status === 0) {
        fs.renameSync(filePath, filePath + '.done')
        console.log(`[Ponder-Monitor] ✅ Stored (q=${q.toFixed(2)}): ${desc.substring(0, 50)}...`)
      } else {
        console.error(`[Ponder-Monitor] ❌ Store failed: ${result.stderr?.toString().substring(0, 100)}`)
      }
    }
  } catch (e) {
    console.log(`[Ponder-Monitor] ⏳ Not ready: ${filePath}`)
  }
}

console.log(`[Ponder-Monitor] 🟢 Started (PID: ${process.pid})`)
console.log(`[Ponder-Monitor] 📁 Watching: ${WATCH_DIR}`)
console.log(`[Ponder-Monitor] 👀 Mode: skill-active + passive-monitor`)
console.log(`[Ponder-Monitor] 🎯 Quality threshold: 0.3`)

// 每2秒检查一次新文件
const interval = setInterval(() => {
  try {
    if (!fs.existsSync(WATCH_DIR)) return
    const files = fs.readdirSync(WATCH_DIR)
      .filter(f => f.endsWith('.json') && !f.endsWith('.done.json') && !f.endsWith('.lowq'))
      .sort()
    for (const file of files) {
      const fp = path.join(WATCH_DIR, file)
      // 保护：文件至少存在2秒才处理（避免正在写入时读取）
      const stat = fs.statSync(fp)
      if (Date.now() - stat.mtime.getTime() < 2000) continue
      processKnowledge(fp)
    }
  } catch(e) {}
}, 2000)

process.on('SIGTERM', () => {
  clearInterval(interval)
  try { fs.unlinkSync(PID_FILE) } catch(e) {}
  console.log('[Ponder-Monitor] 🔴 Stopped')
  process.exit(0)
})

process.on('SIGINT', () => {
  clearInterval(interval)
  try { fs.unlinkSync(PID_FILE) } catch(e) {}
  process.exit(0)
})
