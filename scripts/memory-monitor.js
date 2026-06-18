/**
 * Ponder Memory Monitor — background daemon
 * Internal language: English. User-facing output via l10n layer.
 *
 * Mode 1: Watch /tmp/ponder-knowledge/ for explicit knowledge writes
 * Mode 2: Scan transcript .jsonl increments for passive capture
 *
 * Started by: SessionStart | Stopped by: SessionEnd
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const WATCH_DIR = path.join(os.tmpdir(), 'ponder-knowledge');
const PID_FILE = path.join(os.tmpdir(), 'ponder-monitor.pid');
const TRANSCRIPT_DIR = path.join(os.homedir(), '.claude', 'projects');

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');

function qualityScore(text) {
  if (!text || typeof text !== 'string') return 0;
  const t = text.trim();
  if (t.length < 20) return 0;
  let score = 0.3;
  if (/\d+%|\d+\.\d+|\d{4}年|\d+月|\d+亿|\d+万|涨幅|跌幅/.test(t)) score += 0.3;
  if (/因此|所以|结论|建议|应该|需要|必须|原因是|意味着|说明|表明/.test(t)) score += 0.2;
  if (/矛盾|冲突|分歧|争议|对比|差异/.test(t)) score += 0.15;
  if (/根据|报道|研究|数据显示|统计|来源|引用/.test(t)) score += 0.1;
  if (/推理|推导|基于|依据|因为|所以|如果|那么/.test(t)) score += 0.1;
  if (t.length >= 50 && t.length <= 1000) score += 0.1;
  return Math.min(1.0, score);
}

function storeToMMA(desc, tags, q) {
  if (q < 0.3) return false;
  const base = path.join(os.homedir(), '.claude', 'plugins', 'cache');
  for (const name of ['luke', 'mcts']) {
    const d = path.join(base, name, name);
    if (!fs.existsSync(d)) continue;
    const dirs = fs.readdirSync(d).filter(f => /^\d+\.\d+\.\d+$/.test(f)).sort().reverse();
    if (dirs.length === 0) continue;
    const mma = path.join(d, dirs[0], 'scripts', 'mcts.js');
    if (!fs.existsSync(mma)) continue;
    const r = spawnSync('node', [mma, 'mma', 'ashi', JSON.stringify({
      description: desc.substring(0, 500).replace(/"/g, '\\"'),
      tags: tags || [],
      category: q >= 0.7 ? 'tools_and_means' : 'hypothesis',
      emotion: q >= 0.7 ? 'xi' : 'an',
      q: q,
    })], { timeout: 10000 });
    return r.status === 0;
  }
  return false;
}

function processFile(fp) {
  try {
    const d = JSON.parse(fs.readFileSync(fp, 'utf-8'));
    const q = d.q || qualityScore(d.description || '');
    if (q < 0.3) { fs.renameSync(fp, fp + '.lowq'); return; }
    if (storeToMMA(d.description, d.tags, q)) {
      fs.renameSync(fp, fp + '.done');
      console.log(`[Cognitive Core] Memorized (q=${q.toFixed(2)}): ${(d.description||'').substring(0,50)}`);
    }
  } catch(e) {}
}

const tStates = new Map();
function scanTranscripts() {
  try {
    if (!fs.existsSync(TRANSCRIPT_DIR)) return;
    for (const sid of fs.readdirSync(TRANSCRIPT_DIR).filter(d => /^[a-f0-9-]{36,}$/.test(d))) {
      const jf = path.join(TRANSCRIPT_DIR, sid, 'transcript.jsonl');
      if (!fs.existsSync(jf)) continue;
      const st = fs.statSync(jf);
      const state = tStates.get(sid) || { pos: 0, lastSize: 0 };
      if (st.size <= state.lastSize) { state.lastSize = st.size; tStates.set(sid, state); continue; }
      const fd = fs.openSync(jf, 'r');
      const buf = Buffer.alloc(st.size - state.pos);
      fs.readSync(fd, buf, 0, buf.length, state.pos);
      fs.closeSync(fd);
      state.pos = st.size; state.lastSize = st.size; tStates.set(sid, state);
      for (const line of buf.toString('utf-8').split('\n').filter(l => l.trim())) {
        try {
          const e = JSON.parse(line);
          if (e.role === 'assistant' && typeof e.content === 'string') {
            const txt = e.content.trim();
            if (txt.startsWith('{') || txt.startsWith('[') || txt.startsWith('```') || txt.length < 30) continue;
            const q = qualityScore(txt);
            if (q >= 0.3 && storeToMMA(txt, ['auto_capture', 'transcript'], q))
              console.log(`[Cognitive Core] Auto-learned (q=${q.toFixed(2)})`);
          }
        } catch(e) {}
      }
    }
  } catch(e) {}
}

console.log('[Cognitive Core] Memory system online');
console.log('[Cognitive Core] Watching: ' + WATCH_DIR);
console.log('[Cognitive Core] Threshold: 0.3');

setInterval(() => {
  try {
    if (fs.existsSync(WATCH_DIR))
      for (const f of fs.readdirSync(WATCH_DIR).filter(f => f.endsWith('.json') && !f.includes('.done') && !f.includes('.lowq'))) {
        const fp = path.join(WATCH_DIR, f);
        if (Date.now() - fs.statSync(fp).mtimeMs > 2000) processFile(fp);
      }
  } catch(e) {}
  scanTranscripts();
}, 3000);

process.on('SIGTERM', () => { try{fs.unlinkSync(PID_FILE)}catch(e){}; process.exit(0); });
process.on('SIGINT', () => { try{fs.unlinkSync(PID_FILE)}catch(e){}; process.exit(0); });
