#!/usr/bin/env node
/**
 * Session Context — Mid-timescale working memory (minutes~hours)
 *
 * Bridges the gap between:
 *   Triple Burner (seconds~minutes) — immediate recall results
 *   MMA Meridian Memory (days~months) — consolidated knowledge
 *
 * Stores: step performance across analyses, user correction patterns,
 *         repeated themes, pipeline adjustments within a conversation.
 *
 * Lifecycle:
 *   init()        — load or create fresh context
 *   update(stats) — add results from one /luke:ponder cycle
 *   getSummary()  — compact form to pass into workflow args
 *   shouldConsolidateToMMA() — at session end, what earned permanent storage
 *
 * Based on Xunzi's "积" (accumulation): each analysis adds a small step,
 * but direction matters more than speed.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder');
const SESSION_FILE = path.join(DATA_DIR, 'session-context.json');
const MMA_SCRIPT = path.join(os.homedir(), '.claude', 'plugins', 'cache', 'luke', 'luke');

// ── Default session context ──

function freshContext() {
  return {
    version: 1,
    session_id: null,
    started_at: new Date().toISOString(),
    analyses_count: 0,
    step_tracking: {
      diverge: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      bagua:  { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      dmn:    { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      simulate: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      debate: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      converge: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      hierarchy: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      verify: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
      action: { runs: 0, pass_count: 0, fail_count: 0, avg_completion: 0 },
    },
    user_patterns: {
      preferred_domains: [],      // ['tech', 'finance', 'health', ...]
      repeated_corrections: [],   // 'user often challenges assumptions about risk'
      emphasis_shift: null,       // 'user started caring more about timeframe'
    },
    free_energy_trend: [],       // last 5 free_energy values
    repeated_themes: {},         // tag→count, accumulates across analyses
  };
}

// ── I/O ──

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadContext() {
  ensureDir();
  if (!fs.existsSync(SESSION_FILE)) return freshContext();
  try {
    const data = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    // Ensure all step keys exist (in case new steps were added in a newer version)
    const fresh = freshContext();
    for (const key of Object.keys(fresh.step_tracking)) {
      if (!data.step_tracking[key]) data.step_tracking[key] = fresh.step_tracking[key];
    }
    return data;
  } catch (e) { return freshContext(); }
}

function saveContext(ctx) {
  ensureDir();
  const tmp = SESSION_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(ctx, null, 2), 'utf-8');
  fs.renameSync(tmp, SESSION_FILE);
}

// ── Core operations ──

/**
 * Call at start of each /luke:ponder cycle.
 * Returns: { context, summary } — summary is compact form for workflow args
 */
function initSession() {
  const ctx = loadContext();
  ctx.analyses_count++;
  ctx.session_id = ctx.session_id || new Date().toISOString().replace(/[:.]/g, '-');
  saveContext(ctx);
  const summary = getSummary(ctx);
  return { context: ctx, summary };
}

/**
 * Call after Workflow returns. Updates step tracking, free energy trend, user patterns.
 * @param {object} ctx — current session context
 * @param {object} stats — from workflow return: { step_fitness, free_energy, evolution_suggestions, user_request }
 * @returns {object} updated context
 */
function updateSession(ctx, stats) {
  // Track free energy
  if (stats.free_energy !== undefined) {
    ctx.free_energy_trend.push(stats.free_energy);
    if (ctx.free_energy_trend.length > 5) ctx.free_energy_trend.shift();
  }

  // Track step performance
  if (stats.step_fitness) {
    for (const [step, fitness] of Object.entries(stats.step_fitness)) {
      if (ctx.step_tracking[step]) {
        ctx.step_tracking[step].runs++;
        if (fitness >= 0.7) ctx.step_tracking[step].pass_count++;
        else ctx.step_tracking[step].fail_count++;
        ctx.step_tracking[step].avg_completion = Math.round(
          (ctx.step_tracking[step].avg_completion + fitness) / 2 * 100
        ) / 100;
      }
    }
  }

  // Track user patterns from request
  if (stats.user_request) {
    const request = stats.user_request.toLowerCase();
    const domains = ['tech', 'finance', 'health', 'education', 'business', 'policy'];
    for (const d of domains) {
      if (request.includes(d)) {
        if (!ctx.repeated_themes[d]) ctx.repeated_themes[d] = 0;
        ctx.repeated_themes[d]++;
      }
    }
  }

  saveContext(ctx);
  return ctx;
}

/**
 * Generate a compact summary for workflow args.
 * This is what gets passed to the pipeline — keeps it small.
 */
function getSummary(ctx) {
  // Only include steps that have run at least once
  const experiencedSteps = {};
  for (const [step, data] of Object.entries(ctx.step_tracking)) {
    if (data.runs > 0) experiencedSteps[step] = {
      runs: data.runs,
      pass_rate: data.runs > 0 ? Math.round(data.pass_count / data.runs * 100) / 100 : 0,
      avg_completion: data.avg_completion,
    };
  }

  // Top themes
  const topThemes = Object.entries(ctx.repeated_themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}(${v})`);

  return {
    analyses_this_session: ctx.analyses_count,
    active_steps: Object.keys(experiencedSteps).length,
    step_summary: experiencedSteps,
    free_energy_trend: ctx.free_energy_trend,
    top_themes: topThemes,
    corrections: ctx.user_patterns.repeated_corrections.slice(-3),
  };
}

/**
 * At session end: decide what earned permanent MMA storage.
 * Returns: array of { description, tags, q } — ready for mma ashi
 */
function extractKnowledge(ctx) {
  const insights = [];

  // Step performance patterns worth remembering
  const underperformers = [];
  for (const [step, data] of Object.entries(ctx.step_tracking)) {
    if (data.runs >= 2 && data.avg_completion < 0.5) {
      underperformers.push(step);
    }
  }
  if (underperformers.length > 0) {
    insights.push({
      description: `Session pattern: steps [${underperformers.join(', ')}] consistently underperformed (completion < 0.5)`,
      tags: ['session', 'pattern', 'performance', ...underperformers],
      category: 'tools_and_means',
      q: 0.6,
    });
  }

  // User correction patterns
  for (const corr of ctx.user_patterns.repeated_corrections.slice(-2)) {
    insights.push({
      description: `User correction pattern: ${corr}`,
      tags: ['session', 'user-pattern', 'correction'],
      category: 'zangxiang',
      q: 0.7,
    });
  }

  // Free energy trend
  if (ctx.free_energy_trend.length >= 2) {
    const trend = ctx.free_energy_trend[ctx.free_energy_trend.length - 1] - ctx.free_energy_trend[0];
    if (Math.abs(trend) > 0.1) {
      insights.push({
        description: `Free energy trend this session: ${trend > 0 ? 'rising' : 'falling'} (${trend.toFixed(2)} over ${ctx.free_energy_trend.length} analyses)`,
        tags: ['session', 'free-energy', trend > 0 ? 'worsening' : 'improving'],
        category: 'zangxiang',
        q: 0.65,
      });
    }
  }

  return insights;
}

/**
 * Reset context (start fresh).
 */
function resetSession() {
  const ctx = freshContext();
  saveContext(ctx);
  return ctx;
}

// ── CLI ──

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'status': {
      const ctx = loadContext();
      console.log(`Session: ${ctx.session_id || '(none)'}`);
      console.log(`Analyses: ${ctx.analyses_count}`);
      console.log(`Free energy trend: ${ctx.free_energy_trend.length > 0 ? ctx.free_energy_trend.join(' → ') : '(none)'}`);
      console.log('');
      console.log('Step tracking:');
      for (const [step, d] of Object.entries(ctx.step_tracking)) {
        if (d.runs > 0) {
          console.log(`  ${step.padEnd(15)} ${d.runs}x runs, pass=${d.pass_count}, fail=${d.fail_count}, avg=${d.avg_completion}`);
        }
      }
      if (Object.keys(ctx.repeated_themes).length > 0) {
        console.log('');
        console.log('Themes:', Object.entries(ctx.repeated_themes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(', '));
      }
      break;
    }
    case 'reset': {
      resetSession();
      console.log('Session context reset.');
      break;
    }
    case 'summary': {
      const ctx = loadContext();
      console.log(JSON.stringify(getSummary(ctx), null, 2));
      break;
    }
    case 'extract': {
      const ctx = loadContext();
      const insights = extractKnowledge(ctx);
      console.log(JSON.stringify(insights, null, 2));
      console.log(`\n${insights.length} insights ready for MMA consolidation`);
      break;
    }
    default:
      console.log('Usage: node scripts/session-context.js <command>');
      console.log('  status    — Show session context');
      console.log('  summary   — Compact summary for workflow args');
      console.log('  extract   — Extract knowledge for MMA consolidation');
      console.log('  reset     — Clear session context');
  }
}

module.exports = { initSession, updateSession, getSummary, extractKnowledge, loadContext, freshContext, resetSession };

if (require.main === module) main();
