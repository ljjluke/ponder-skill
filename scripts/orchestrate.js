#!/usr/bin/env node
/**
 * orchestrate.js — 管道编排器（增量式）
 *
 * 不再等完整管道输出，每步结束后单独处理。
 *
 * 用法:
 *   node scripts/orchestrate.js before <问题类型> <问题描述> [画像]
 *     输出: { applied_rules, step_history, error_warnings, profile }
 *
 *   node scripts/orchestrate.js step <步骤名> <问题类型> '<步骤输出JSON>'
 *     存一步产出到MMA + 记录该步指标
 *
 *   node scripts/orchestrate.js finalize <问题类型> <问题描述>
 *     知识保洁 + 权重学习 + 进化分析
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_DIR = process.env.PONDER_DATA_DIR ? require("path").resolve(process.env.PONDER_DATA_DIR) : path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder');
const RULES_FILE = path.join(__dirname, 'evolve-rules.json');
const META_FILE = path.join(__dirname, '..', 'pipeline-meta.json');

// 延迟加载
var _WeightRegistry = null;
function getWeightRegistry() {
  if (!_WeightRegistry) {
    var wr = require('./weights');
    _WeightRegistry = new wr.WeightRegistry();
  }
  return _WeightRegistry;
}

// ── Before: 加载规则和历史（一次性，流程开始前）──
function before(questionType, userRequest, profile) {
  var rules = [];
  try {
    var rulesData = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    rules = rulesData.rules.filter(function(r) {
      return r.status === 'active' && r.condition && r.condition.question_type &&
        r.condition.question_type.some(function(t) { return questionType.indexOf(t) !== -1 });
    });
  } catch(e) {}

  var stepHistory = {};
  try {
    var knowledge = require('./knowledge');
    var steps = ['shensi', 'divergence', 'dimension', 'plans', 'converge', 'simulate', 'debate', 'synthesis'];
    steps.forEach(function(s) {
      var hist = knowledge.recallStepHistory(s, questionType, { query: userRequest, limit: 20 });
      if (hist && hist.length > 0) stepHistory[s] = hist;
    });
  } catch(e) {}

  var errorWarnings = {};
  try {
    var knowledge2 = require('./knowledge');
    ['divergence', 'dimension', 'plans', 'simulate', 'debate', 'synthesis'].forEach(function(s) {
      var errs = knowledge2.recallErrors(questionType, s, { limit: 5 });
      if (errs && errs.length > 0) errorWarnings[s] = errs;
    });
  } catch(e) {}

  console.log(JSON.stringify({
    applied_rules: rules,
    step_history: stepHistory,
    error_warnings: errorWarnings,
    profile: profile || '',
    _orchestrated: true,
  }));
}

// ── Step: 存一步产出 + 记一步指标（增量式）──
function storeStep(stepName, questionType, stepOutputJson, userRequest) {
  var output;
  try { output = JSON.parse(stepOutputJson); } catch(e) { console.error('无法解析步骤输出'); process.exit(1); }

  var result = { stored: false, metric_recorded: false };

  // 1. 存步骤产出到MMA
  try {
    var knowledge = require('./knowledge');
    knowledge.storeStepOutput(stepName, questionType, stepOutputJson, {
      tags: [questionType],
      user_request: userRequest || '',
    });
    result.stored = true;
  } catch(e) { console.error('存储步骤产出失败:', e.message); }

  // 2. 记指标
  try {
    var metrics = require('./pipeline-metrics');
    var record = metrics.collectStep(stepName, output, {
      question_type: questionType,
      user_request: userRequest || '',
    });
    metrics.appendStepMetric(record);
    result.metric_recorded = true;
    result.is_clear = record.is_clear;
    result.questions = record.questions_count;
  } catch(e) { console.error('记录指标失败:', e.message); }

  console.log(JSON.stringify(result));
}

// ── Finalize: 所有步骤完成后统一保洁+学习 ──
function finalize(questionType, userRequest) {
  var result = {
    grooming_done: false,
    weights_learned: false,
    evolve_analyzed: false,
    mcts_tree_saved: false,
  };

  // 1. 知识保洁
  try {
    var io = require('./mma/io');
    var kg = io.loadMMA();
    var decay = require('./mma/decay');
    var actions = decay.knowledgeGroom(kg);
    if (actions && actions.length > 0) io.saveMMA(kg);
    result.grooming_done = true;
    result.groomed = (actions || []).length;
  } catch(e) { console.error('知识保洁失败:', e.message); }

  // 2. 权重学习
  try {
    var registry = getWeightRegistry();
    if (registry.weights._total_learns === undefined || registry.weights._total_learns === 0) {
      registry.learn('uncertainty_ambiguity', 0.02);
    }
    result.weights_learned = true;
  } catch(e) { console.error('权重学习失败:', e.message); }

  // 3. 进化分析
  try {
    var evolve = require('./evolve');
    var runs = evolve.loadRuns();
    if (runs.length >= 3) {
      var analysis = evolve.analyze(runs);
      result.evolve_analyzed = analysis.total_runs > 0;
    }
  } catch(e) { console.error('进化分析失败:', e.message); }

  // 4. pipeline-meta 版本递增（如果存在）
  try {
    if (fs.existsSync(META_FILE)) {
      var meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
      if (meta.evolution) {
        meta.evolution.generation = (meta.evolution.generation || 0) + 1;
        meta.topology = meta.topology || {};
        meta.topology.mutation_count = (meta.topology.mutation_count || 0) + 1;
        meta.free_energy = meta.free_energy || { current: 0, history: [], threshold: 0.4 };
        fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n', 'utf-8');
        result.meta_updated = true;
      }
    }
  } catch(e) { console.error('meta更新失败:', e.message); }

  console.log(JSON.stringify(result));
}

function main() {
  var args = process.argv.slice(2);
  var cmd = args[0];

  if (cmd === 'before') {
    before(args[1] || '', args[2] || '', args[3] || '');
  } else if (cmd === 'step') {
    storeStep(args[1] || '', args[2] || '', args[3] || '{}', args[4] || '');
  } else if (cmd === 'finalize') {
    finalize(args[1] || '', args[2] || '');
  } else {
    console.log('增量式编排器');
    console.log('');
    console.log('  node scripts/orchestrate.js before <问题类型> <问题描述>  — 加载规则+历史');
    console.log('  node scripts/orchestrate.js step <步骤名> <问题类型> \'<JSON>\' — 存一步产出+记指标');
    console.log('  node scripts/orchestrate.js finalize <问题类型> <问题描述> — 保洁+学习');
  }
}

if (require.main === module) main();
module.exports = { before, storeStep, finalize };
