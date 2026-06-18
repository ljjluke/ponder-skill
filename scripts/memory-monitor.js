/**
 * Ponder Memory Monitor — 双模式记忆守护进程
 *
 * 模式1: 主动查询 — skill步骤调 knowledge acquire（已有）
 * 模式2: 被动监控 — 监听 transcript .jsonl 增量，自动提取有用信息
 *
 * 启动: SessionStart hook | 终止: SessionEnd hook
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const WATCH_DIR = '/tmp/ponder-knowledge';
const PID_FILE = '/tmp/ponder-monitor.pid';
const TRANSCRIPT_DIR = path.join(os.homedir(), '.claude', 'projects');

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

// ─── 质量过滤 ───
const NOISE_WORDS = new Set(['嗯','哦','啊','好的','明白','知道了','是的','对的','没错','好','行','ok','收到','谢谢','感谢','不客气','hello','hi','hey','yes','no','thanks','bye'])
function qualityScore(text) {
  if (!text || typeof text !== 'string') return 0
  const t = text.trim()
  if (t.length < 20) return 0
  if (NOISE_WORDS.has(t.toLowerCase())) return 0
  let score = 0.3
  if (/\d+%|\d+\.\d+|\d{4}年|\d+月|\d+亿|\d+万|涨幅|跌幅/.test(t)) score += 0.3
  if (/因此|所以|结论|建议|应该|需要|必须|原因是|意味着|说明|表明/.test(t)) score += 0.2
  if (/[①②③④⑤⑥⑦]|[-–—]\s|\d+[\.\)]\s|方案|视角|维度/.test(t)) score += 0.15
  if (/矛盾|冲突|分歧|争议|对比|差异/.test(t)) score += 0.15
  if (/根据|报道|研究|数据显示|统计|来源|引用/.test(t)) score += 0.1
  if (/推理|推导|基于|依据|因为|所以|如果|那么/.test(t)) score += 0.1
  if (t.length >= 50 && t.length <= 1000) score += 0.1
  return Math.min(1.0, score)
}

function storeToMMA(description, tags, q) {
  if (q < 0.3) return false
  // 找 mcts.js
  const base = path.join(os.homedir(), '.claude', 'plugins', 'cache')
  for (const name of ['luke', 'mcts']) {
    const d = path.join(base, name, name)
    if (!fs.existsSync(d)) continue
    const dirs = fs.readdirSync(d).filter(f => /^\d+\.\d+\.\d+$/.test(f)).sort().reverse()
    if (dirs.length === 0) continue
    const mma = path.join(d, dirs[0], 'scripts', 'mcts.js')
    if (!fs.existsSync(mma)) continue
    const cat = q >= 0.7 ? 'tools_and_means' : 'hypothesis'
    const emo = q >= 0.7 ? 'xi' : 'an'
    const r = spawnSync('node', [mma, 'mma', 'ashi', JSON.stringify({
      description: description.substring(0, 500).replace(/"/g, '\\"'),
      tags: tags || [],
      category: cat, emotion: emo, q: q,
    })], { timeout: 10000 })
    return r.status === 0
  }
  return false
}

// ─── 模式1: 监控 /tmp/ponder-knowledge/ ───
function processKnowledgeFile(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    const q = data.q || qualityScore(data.description || '')
    if (q < 0.3) {
      fs.renameSync(filePath, filePath + '.lowq')
      return
    }
    if (storeToMMA(data.description, data.tags, q)) {
      fs.renameSync(filePath, filePath + '.done')
      console.log(`[Ponder] ✅ Knowledge: q=${q.toFixed(2)} ${(data.description||'').substring(0,50)}`)
    }
  } catch(e) {}
}

// ─── 模式2: 监控 transcript .jsonl（增量） ───
// 每个对话目录有一个 .jsonl ，记录所有交互
// 结构: {"role":"user"/"assistant","content":"...","tool_calls":[...],...}
// 我们只取 assistant 的纯文本回复（过滤工具调用结果/JSON/系统信息）

const transcriptStates = new Map() // dir -> { file, pos, lastSize }

function scanTranscripts() {
  try {
    if (!fs.existsSync(TRANSCRIPT_DIR)) return
    const sessions = fs.readdirSync(TRANSCRIPT_DIR).filter(d => /^[a-f0-9-]{36,}$/.test(d))
    for (const sessionId of sessions) {
      const dir = path.join(TRANSCRIPT_DIR, sessionId)
      const jsonlFile = path.join(dir, 'transcript.jsonl')
      if (!fs.existsSync(jsonlFile)) continue

      const stat = fs.statSync(jsonlFile)
      const state = transcriptStates.get(sessionId) || { pos: 0, lastSize: 0 }

      if (stat.size <= state.lastSize) {
        state.lastSize = stat.size
        transcriptStates.set(sessionId, state)
        continue
      }

      // 读增量
      const fd = fs.openSync(jsonlFile, 'r')
      const buf = Buffer.alloc(stat.size - state.pos)
      fs.readSync(fd, buf, 0, buf.length, state.pos)
      fs.closeSync(fd)

      state.pos = stat.size
      state.lastSize = stat.size
      transcriptStates.set(sessionId, state)

      // 解析新增行
      const lines = buf.toString('utf-8').split('\n').filter(l => l.trim())
      for (const line of lines) {
        try {
          const entry = JSON.parse(line)
          // 只取 assistant 的纯文本回复，跳过工具调用和系统内容
          if (entry.role === 'assistant' && entry.content && typeof entry.content === 'string') {
            // 跳过明显的工具结果/JSON
            const text = entry.content.trim()
            if (text.startsWith('{') || text.startsWith('[') || text.startsWith('```')) continue
            if (text.length < 30) continue
            const q = qualityScore(text)
            if (q >= 0.3 && storeToMMA(text, ['auto_capture', 'transcript'], q)) {
              console.log(`[Ponder] 📝 Auto-captured from transcript (q=${q.toFixed(2)})`)
            }
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
}

console.log(`[Ponder] 🟢 Memory Monitor started (PID: ${process.pid})`)
console.log(`[Ponder] 📁 Knowledge dir: ${WATCH_DIR}`)
console.log(`[Ponder] 📝 Monitoring transcripts: ${TRANSCRIPT_DIR}`)
console.log(`[Ponder] 🎯 Quality threshold: 0.3`)

const interval = setInterval(() => {
  // 模式1: 检查知识文件
  try {
    if (fs.existsSync(WATCH_DIR)) {
      for (const f of fs.readdirSync(WATCH_DIR).filter(f => f.endsWith('.json') && !f.includes('.done') && !f.includes('.lowq'))) {
        const fp = path.join(WATCH_DIR, f)
        if (Date.now() - fs.statSync(fp).mtimeMs > 2000) processKnowledgeFile(fp)
      }
    }
  } catch(e) {}
  // 模式2: 扫描 transcript 增量
  scanTranscripts()
}, 3000)

process.on('SIGTERM', () => { clearInterval(interval); try{fs.unlinkSync(PID_FILE)}catch(e){}; process.exit(0) })
process.on('SIGINT', () => { clearInterval(interval); try{fs.unlinkSync(PID_FILE)}catch(e){}; process.exit(0) })
