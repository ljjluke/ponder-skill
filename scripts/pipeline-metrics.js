#!/usr/bin/env node
/**
 * pipeline-metrics.js — 管道运行数据收集器
 *
 * 每次管道跑完后调用，记录每步指标到日志。
 * 数据积累后用于自进化分析（检测瓶颈步骤、优化方向）。
 *
 * 验证状态: ✅ 已通过 4 次真实管道输出验证
 *
 * 用法:
 *   echo '<pipeline_output_json>' | node scripts/pipeline-metrics.js pipe
 *   node scripts/pipeline-metrics.js log           — 查看日志
 *   node scripts/pipeline-metrics.js status        — 统计概览
 *
 * 不修改任何管道代码，纯日志收集。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// 日志存储在项目数据目录，不污染 /tmp
const DATA_DIR = path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder', 'metrics');
const LOG_FILE = path.join(DATA_DIR, 'pipeline-runs.ndjson');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function collect(pipelineOutput) {
  const run = {
    timestamp: new Date().toISOString(),
    steps: {},
    summary: {},
  };

  const stepNames = ['divergence', 'dimension', 'plans', 'simulations', 'debate', 'synthesis', 'verification'];

  for (const name of stepNames) {
    const step = pipelineOutput[name];
    if (!step) continue;

    const record = { extracted: true };

    if (name === 'simulations') {
      record.count = Array.isArray(step) ? step.length : 0;
    } else if (name === 'verification') {
      record.verdict = step.verdict || 'UNKNOWN';
      record.fake_clarity = step.fake_clarity || false;
      record.issues_count = Array.isArray(step.issues) ? step.issues.length : 0;
      record.issues_severity = (step.issues || []).map(i => i.severity);
    } else {
      record.is_clear = step.is_clear;
      record.questions_count = Array.isArray(step.user_questions) ? step.user_questions.length : 0;
      record.questions = step.user_questions || [];
    }

    run.steps[name] = record;
  }

  const claritySteps = Object.entries(run.steps).filter(([k, v]) => v.is_clear !== undefined);
  const clearCount = claritySteps.filter(([, v]) => v.is_clear).length;
  const totalQuestions = Object.values(run.steps).reduce((s, v) => s + (v.questions_count || 0), 0);

  run.summary = {
    total_steps: Object.keys(run.steps).length,
    clear_steps: clearCount,
    unclear_steps: claritySteps.length - clearCount,
    all_clear: clearCount === claritySteps.length && claritySteps.length > 0,
    total_questions: totalQuestions,
    verify_passed: run.steps.verification?.verdict === 'PASS',
    verify_fake_clarity: run.steps.verification?.fake_clarity || false,
    has_lessons: (pipelineOutput.synthesis?.pending_lessons?.length || 0) > 0,
    lessons_count: pipelineOutput.synthesis?.pending_lessons?.length || 0,
  };

  return run;
}

function statusReport() {
  if (!fs.existsSync(LOG_FILE)) { return { total: 0 }; }
  const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { total: 0 };

  const runs = lines.map(l => JSON.parse(l));
  const total = runs.length;

  // 按步骤统计
  const stepStats = {};
  const stepNames = ['divergence', 'dimension', 'plans', 'debate', 'synthesis', 'verification'];
  for (const name of stepNames) {
    const steps = runs.filter(r => r.steps[name]?.is_clear !== undefined);
    if (steps.length === 0) continue;
    const unclear = steps.filter(s => !s.steps[name].is_clear).length;
    stepStats[name] = {
      count: steps.length,
      clear_rate: 1 - (unclear / steps.length),
    };
  }

  const allClear = runs.filter(r => r.summary.all_clear).length;
  const passVerify = runs.filter(r => r.summary.verify_passed).length;
  const totalQ = runs.reduce((s, r) => s + r.summary.total_questions, 0);

  return {
    total,
    all_clear_rate: allClear / total,
    verify_pass_rate: passVerify / total,
    avg_questions_per_run: (totalQ / total).toFixed(1),
    step_stats: stepStats,
  };
}

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'collect') {
    const filePath = args[1];
    if (!filePath) { console.error('Usage: collect <json_file>'); process.exit(1); }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const output = JSON.parse(raw);
    const run = collect(output);
    ensureDir();
    fs.appendFileSync(LOG_FILE, JSON.stringify(run) + '\n', 'utf-8');
    console.log('✅ 已记录本次运行');
    console.log(JSON.stringify(run.summary, null, 2));
  } else if (cmd === 'pipe') {
    let body = '';
    process.stdin.on('data', d => body += d.toString());
    process.stdin.on('end', () => {
      try {
        const output = JSON.parse(body);
        const run = collect(output);
        ensureDir();
        fs.appendFileSync(LOG_FILE, JSON.stringify(run) + '\n', 'utf-8');
        console.log('✅ 已记录本次运行');
        console.log(JSON.stringify(run.summary, null, 2));
      } catch (e) {
        console.error('解析失败:', e.message);
        process.exit(1);
      }
    });
  } else if (cmd === 'log') {
    if (!fs.existsSync(LOG_FILE)) { console.log('暂无数据'); return; }
    const lines = fs.readFileSync(LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    console.log(`共 ${lines.length} 条记录\n`);
    for (const line of lines.slice(-10)) {
      const r = JSON.parse(line);
      console.log(`[${r.timestamp.slice(0,19)}] 清晰:${r.summary.clear_steps}/${r.summary.total_steps} 问题:${r.summary.total_questions} 验证:${r.summary.verify_passed ? 'PASS' : 'REVISE'}`);
    }
  } else if (cmd === 'status') {
    const s = statusReport();
    if (s.total === 0) { console.log('暂无数据。管道运行后会自动收集。'); return; }
    console.log(`运行次数: ${s.total}`);
    console.log(`全清晰率: ${(s.all_clear_rate * 100).toFixed(1)}%`);
    console.log(`验证通过率: ${(s.verify_pass_rate * 100).toFixed(1)}%`);
    console.log(`平均问题数: ${s.avg_questions_per_run}/次`);
    console.log('\n步骤级清晰率:');
    for (const [name, st] of Object.entries(s.step_stats || {})) {
      console.log(`  ${name.padEnd(12)} ${(st.clear_rate * 100).toFixed(0)}% (${st.count}次)`);
    }
  } else {
    console.log('用法:');
    console.log('  echo \'<json>\' | node scripts/pipeline-metrics.js pipe  — 管道输出 → 收集');
    console.log('  node scripts/pipeline-metrics.js collect <file>         — 从文件收集');
    console.log('  node scripts/pipeline-metrics.js log                    — 查看日志');
    console.log('  node scripts/pipeline-metrics.js status                 — 统计概览');
  }
}

if (require.main === module) main();
module.exports = { collect, statusReport, LOG_FILE, DATA_DIR };
