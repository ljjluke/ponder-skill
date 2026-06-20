#!/usr/bin/env node
/**
 * orchestrate.js — 管道编排器
 *
 * 替代 SKILL.md 中 LLM 手动执行的编排步骤。
 * LLM 只需知道: 调这个脚本获取参数 → 调管道 → 调这个脚本收尾
 *
 * 用法:
 *   node scripts/orchestrate.js before <questionType> <userRequest> [profile]
 *     输出: { applied_rules, step_history, error_warnings, profile }
 *     直接将输出传给 Workflow 的 args
 *
 *   node scripts/orchestrate.js after <questionType> <userRequest> <pipelineOutputJSON>
 *     自动执行: 存步骤输出 → 收集指标 → 生成auto-fix
 *
 * 不需要 LLM 记住加载规则、存储输出、收集指标。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder');
const METRICS_FILE = path.join(DATA_DIR, 'metrics', 'pipeline-runs.ndjson');
const RULES_FILE = path.join(__dirname, 'evolve-rules.json');

// ── Before: 加载规则和历史 ──
function before(questionType, userRequest, profile) {
  // 1. 匹配活跃规则
  var rules = []
  try {
    var rulesData = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'))
    rules = rulesData.rules.filter(function(r) { return r.status === 'active' && r.condition && r.condition.question_type && r.condition.question_type.some(function(t) { return questionType.includes(t) }) })
  } catch(e) {}

  // 2. 加载历史步骤输出（每步取20个候选，管道内LLM筛选top8）
  var stepHistory = {}
  try {
    var knowledge = require('./knowledge')
    var steps = ['divergence', 'dimension', 'plans', 'debate', 'synthesis', 'verify']
    steps.forEach(function(s) {
      var hist = knowledge.recallStepHistory(s, questionType, { query: userRequest, limit: 20 })
      if (hist && hist.length > 0) stepHistory[s] = hist
    })
  } catch(e) {}

  // 3. 加载错误警告
  var errorWarnings = {}
  try {
    var knowledge2 = require('./knowledge')
    var steps2 = ['divergence', 'dimension', 'plans', 'debate', 'synthesis', 'verify']
    steps2.forEach(function(s) {
      var errs = knowledge2.recallErrors(questionType, s, { limit: 5 })
      if (errs && errs.length > 0) errorWarnings[s] = errs
    })
  } catch(e) {}

  console.log(JSON.stringify({
    applied_rules: rules,
    step_history: stepHistory,
    error_warnings: errorWarnings,
    profile: profile || '',
    _orchestrated: true,
  }))
}

// ── After: 存储和收集 ──
function after(questionType, userRequest, pipelineOutputJson) {
  var output
  try { output = JSON.parse(pipelineOutputJson) } catch(e) { console.error('无法解析管道输出'); process.exit(1) }

  // 1. 存步骤输出
  var stored = 0
  try {
    var knowledge = require('./knowledge')
    if (output._step_outputs) {
      Object.keys(output._step_outputs).forEach(function(step) {
        var data = output._step_outputs[step]
        if (data) {
          knowledge.storeStepOutput(step, questionType, JSON.stringify(data), { tags: [questionType], user_request: userRequest })
          stored++
        }
      })
    }
    // 2. 存lessons（附推理上下文）
    if (output.lessons_to_store && output.lessons_to_store.length > 0) {
      output.lessons_to_store.forEach(function(l) {
        knowledge.store(l)
      })
    }
  } catch(e) {}

  // 3. 收集指标
  try {
    var metrics = require('./pipeline-metrics')
    var run = metrics.collect(output)
    run._question_type = questionType
    run._user_request = userRequest
    var dir = path.dirname(METRICS_FILE)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(METRICS_FILE, JSON.stringify(run) + '\n')
  } catch(e) {}

  // 4. 知识保洁（触发一次）
  try {
    var io = require('./mma/io')
    var kg = io.loadMMA()
    var decay = require('./mma/decay')
    var actions = decay.knowledgeGroom(kg)
    if (actions && actions.length > 0) io.saveMMA(kg)
  } catch(e) {}

  console.log(JSON.stringify({
    steps_stored: stored,
    lessons_stored: (output.lessons_to_store || []).length,
    metrics_collected: true,
    grooming_done: true,
  }))
}

function main() {
  var args = process.argv.slice(2)
  var cmd = args[0]

  if (cmd === 'before') {
    before(args[1] || '', args[2] || '', args[3] || '')
  } else if (cmd === 'after') {
    var input = ''
    process.stdin.on('data', function(d) { input += d.toString() })
    process.stdin.on('end', function() { after(args[1] || '', args[2] || '', input) })
  } else {
    console.log('用法:')
    console.log('  node scripts/orchestrate.js before <问题类型> <问题描述>')
    console.log('  echo \'<管道JSON输出>\' | node scripts/orchestrate.js after <问题类型> <问题描述>')
  }
}

if (require.main === module) main()
module.exports = { before, after }
