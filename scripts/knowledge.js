#!/usr/bin/env node
/**
 * Unified knowledge acquisition layer.
 *
 * Single entry point for all data needs:
 *   1. Check local MMA memory (deqi)
 *   2. If empty → WebSearch
 *   3. Store what's found in MMA with classification
 *   4. Return best available data
 *
 * Classification (brain-like):
 *   CONFIRMED   — user confirmed or cross-verified → use with high confidence
 *   PROVISIONAL — used but not verified → use with caution
 *   HYPOTHESIS  — new, unverified → treat as tentative
 *   DISPUTED    — has contradictory evidence → flag when used
 *   REFUTED     — proven wrong → EXCLUDE from recall
 *   SLEEPING    — unused for 30d
 */
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const MMA_SCRIPT = findMmaScript();

function findMmaScript() {
  const candidates = [
    path.join(os.homedir(), '.claude', 'plugins', 'cache', 'luke', 'luke'),
    path.join(os.homedir(), '.claude', 'plugins', 'cache', 'luke', 'luke', '1.14.0'),
  ];
  for (const base of candidates) {
    try {
      const items = require('fs').readdirSync(base).filter(f => /^\d+\.\d+\.\d+$/.test(f)).sort().reverse();
      for (const v of items) {
        const p = path.join(base, v, 'scripts', 'mcts.js');
        if (require('fs').existsSync(p)) return p;
      }
    } catch (e) {}
  }
  // Fallback: try relative path (development mode)
  const devPath = path.join(__dirname, 'mcts.js');
  if (require('fs').existsSync(devPath)) return devPath;
  return null;
}

/**
 * Acquire knowledge for a set of tags.
 * Priority: MMA memory → WebSearch → store as HYPOTHESIS
 *
 * @param {object} query
 * @param {string[]} query.tags — tags to search for
 * @param {number} query.limit — max results (default 5)
 * @param {object} options
 * @param {boolean} options.allowSearch — whether to fallback to WebSearch (default true)
 * @param {boolean} options.storeNew — whether to store new knowledge found via search (default true)
 * @returns {{ source: string, entries: object[] }}
 */
function acquire(query, options = {}) {
  const { tags = [], limit = 5, allowSearch = true, storeNew = true } = query || {};
  const result = { source: 'none', entries: [] };

  // Phase 1: Check MMA memory
  if (MMA_SCRIPT && tags.length > 0) {
    const mmaResult = spawnSync('node', [MMA_SCRIPT, 'mma', 'deqi', JSON.stringify({ tags, limit })], {
      timeout: 10000, encoding: 'utf-8',
    });
    if (mmaResult.status === 0) {
      try {
        const parsed = JSON.parse(mmaResult.stdout);
        if (parsed.count > 0) {
          // Filter out REFUTED entries — they're proven wrong
          const valid = parsed.results.filter(r => r.point?.status !== 'REFUTED' && r.point?.status !== 'DISPUTED');
          if (valid.length > 0) {
            result.source = 'mma';
            result.entries = valid.map(r => ({
              id: r.point.id,
              content: r.point.description,
              tags: r.point.tags,
              confidence: r.deqi_score,
              status: r.point.status,
              source: 'mma',
            }));
          }
        }
      } catch (e) {}
    }
  }

  // Phase 2: If MMA has results, return them
  if (result.entries.length > 0) return result;

  // Phase 3: Fallback to WebSearch
  if (allowSearch) {
    result.source = 'web';
    result.entries = [{
      content: `[WebSearch needed for: ${tags.join(', ')}]`,
      tags,
      confidence: 0,
      status: 'HYPOTHESIS',
      source: 'web',
      needs_search: true,
    }];
  }

  return result;
}

/**
 * Store acquired knowledge into MMA.
 *
 * @param {object} entry
 * @param {string} entry.description
 * @param {string[]} entry.tags
 * @param {string} entry.emotion — optional emotion tag
 * @returns {object|null} stored point info or null
 */
function store(entry) {
  if (!MMA_SCRIPT || !entry?.description) return null;

  // Determine emotion based on confidence
  const emotion = entry.emotion || 'an';

  const payload = JSON.stringify({
    description: entry.description,
    tags: entry.tags || [],
    category: 'tools_and_means',
    emotion,
    source: entry.source || 'web_search',
    q: entry.q || 0.5,
  });

  const result = spawnSync('node', [MMA_SCRIPT, 'mma', 'ashi', payload], {
    timeout: 10000, encoding: 'utf-8',
  });

  if (result.status === 0) {
    try {
      const parsed = JSON.parse(result.stdout);
      return parsed.point ? { id: parsed.point.id, status: 'HYPOTHESIS' } : null;
    } catch (e) { return null; }
  }
  return null;
}

/**
 * Record outcome — update knowledge classification based on real-world result.
 *
 * When user confirms → REINFORCE (move toward CONFIRMED)
 * When user corrects/refutes → DISPUTED or REFUTED
 *
 * @param {string} pointId
 * @param {'confirmed'|'refuted'|'corrected'} outcome
 * @param {string} detail — user's correction detail
 */
function recordOutcome(pointId, outcome, detail = '') {
  if (!MMA_SCRIPT || !pointId) return;

  if (outcome === 'confirmed') {
    // Reinforce: move toward CONFIRMED
    spawnSync('node', [MMA_SCRIPT, 'mma', 'reinforce', pointId, '0.15',
      JSON.stringify({ source: 'user_confirmation' })], { timeout: 5000 });
  } else if (outcome === 'refuted' || outcome === 'corrected') {
    // Store correction as new knowledge
    const correctionEntry = {
      description: `[CORRECTION] ${detail || 'User refuted previous knowledge'}`,
      tags: ['correction', 'refuted'],
      emotion: 'jing',
      q: 0.9,
      source: 'user_correction',
    };
    const storeResult = store(correctionEntry);
    if (storeResult) {
      // Schedule original point for review: reinforce with strong negative
      spawnSync('node', [MMA_SCRIPT, 'mma', 'reinforce', pointId, '-0.5'], { timeout: 5000 });
    }
  }
}

/**
 * Classify all existing MMA knowledge — generate summary.
 */
function classify(kg) {
  const summary = { confirmed: [], refuted: [], uncertain: [], unused: [] };
  for (const [, m] of Object.entries(kg.meridians)) {
    for (const p of m.points) {
      if (p.hidden) continue;
      if (p.status === 'CONFIRMED' && p.consolidation_score >= 3) {
        summary.confirmed.push({ id: p.id, desc: (p.description || '').substring(0, 60), q: p.q });
      } else if (p.status === 'REFUTED' || p.status === 'DISPUTED') {
        summary.refuted.push({ id: p.id, desc: (p.description || '').substring(0, 60) });
      } else if (p.status === 'SLEEPING' || p.status === 'ARCHIVED') {
        summary.unused.push({ id: p.id, desc: (p.description || '').substring(0, 60) });
      } else {
        summary.uncertain.push({ id: p.id, desc: (p.description || '').substring(0, 60), status: p.status, q: p.q });
      }
    }
  }
  return summary;
}

module.exports = { acquire, store, recordOutcome, classify };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'status') {
    const io = require('./mma/io');
    const kg = io.loadMMA();
    const summary = classify(kg);
    console.log('=== 知识分类 ===');
    console.log(`✅ 已验证正确 (CONFIRMED): ${summary.confirmed.length}`);
    summary.confirmed.forEach(k => console.log(`   ${k.id}: ${k.desc}`));
    console.log(`\n❌ 已知错误 (REFUTED/DISPUTED): ${summary.refuted.length}`);
    summary.refuted.forEach(k => console.log(`   ${k.id}: ${k.desc}`));
    console.log(`\n❓ 未验证 (HYPOTHESIS/PROVISIONAL): ${summary.uncertain.length}`);
    summary.uncertain.forEach(k => console.log(`   ${k.id} [${k.status}] q=${k.q}: ${k.desc}`));
    console.log(`\n💤 休眠 (SLEEPING/ARCHIVED): ${summary.unused.length}`);
  } else if (cmd === 'acquire') {
    const tags = JSON.parse(process.argv[3] || '[]');
    const result = acquire({ tags });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Usage: node scripts/knowledge.js <status|acquire>');
  }
}
