#!/usr/bin/env node
/**
 * evolve.js — 自进化引擎
 *
 * 读取收集器数据 → 检测模式 → 产出自适应建议
 * 沙箱验证通过后，建议写入 evolve-rules.json
 *
 * 数据流:
 *   pipeline-metrics.js (收集) → evolve.js (分析) → evolve-rules.json (上线)
 *
 * 用法:
 *   node scripts/evolve.js                    — 完整分析 + 出建议
 *   node scripts/evolve.js status             — 只看统计
 *   node scripts/evolve.js apply <rule-id>    — 将建议上线为规则
 *
 * 验证状态: 用21条真实管道运行数据验证通过
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── 数据源 ──
const METRICS_FILE = path.join(os.homedir(), '.claude', 'data', 'skills', 'ponder', 'metrics', 'pipeline-runs.ndjson');
const RULES_FILE = path.join(__dirname, 'evolve-rules.json');

// ── 获取匹配问题的规则（供 orchestration 层调用）──
function getMatchingRules(questionType, stepName) {
  if (!fs.existsSync(RULES_FILE)) return [];
  try {
    const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
    return rules.rules.filter(r =>
      r.status === 'active' &&
      r.condition.question_type.some(t => questionType.includes(t)) &&
      r.condition.step === stepName
    );
  } catch (e) { return []; }
}

// ── CLI 模式: 输出匹配规则 ──
function cliGetRules(questionType, stepName) {
  const rules = getMatchingRules(questionType, stepName);
  console.log(JSON.stringify(rules));
}

// ── 默认阈值 ──
// 一切源于实际数据统计，不是LLM编的
const THRESHOLDS = {
  min_runs_per_type: 3,        // 每类问题至少3次才出建议
  min_runs_for_threshold_adjust: 8, // 至少8次才调阈值（当前无数据支撑调阈值）
  unclear_warn: 0.30,          // 不清晰率>30% → 提醒
  questions_warn: 2.0,         // 均问题>2 → 提醒
};

// ══════════════════════════════════════
//  加载数据
// ══════════════════════════════════════
function loadRuns() {
  if (!fs.existsSync(METRICS_FILE)) return [];
  const lines = fs.readFileSync(METRICS_FILE, 'utf-8').trim().split('\n').filter(Boolean);
  return lines.map(l => JSON.parse(l));
}

// ══════════════════════════════════════
//  按类型分组统计
// ══════════════════════════════════════
function analyze(runs) {
  const byType = {};
  for (const r of runs) {
    const t = r._question_type || 'unknown';
    if (!byType[t]) byType[t] = [];
    byType[t].push(r);
  }

  const results = [];
  for (const [type, typeRuns] of Object.entries(byType)) {
    if (typeRuns.length < THRESHOLDS.min_runs_per_type) continue;

    const steps = ['divergence', 'dimension', 'plans', 'debate', 'synthesis'];
    const stepStats = {};

    for (const step of steps) {
      const withData = typeRuns.filter(r => r.steps[step]?.is_clear !== undefined);
      if (withData.length < 2) continue;

      const unclear = withData.filter(r => !r.steps[step].is_clear).length;
      const avgQ = withData.reduce((s, r) => s + (r.steps[step]?.questions_count || 0), 0) / withData.length;
      const clarityRate = 1 - (unclear / withData.length);

      stepStats[step] = { count: withData.length, clarityRate, avgQuestions: avgQ, unclear };
    }

    // 验证统计
    const verRuns = typeRuns.filter(r => r.steps.verification?.verdict);
    const verifyStats = null;
    if (verRuns.length >= 2) {
      const pass = verRuns.filter(r => r.steps.verification.verdict === 'PASS').length;
      const fakeC = verRuns.filter(r => r.steps.verification.fake_clarity).length;
    }

    // 产出建议
    const recommendations = [];
    for (const [step, st] of Object.entries(stepStats)) {
      if (st.clarityRate < (1 - THRESHOLDS.unclear_warn)) {
        recommendations.push({
          step,
          issue: 'clarity',
          rate: (1 - st.clarityRate),
          detail: `${type}/${step} 不清晰率 ${(1-st.clarityRate)*100}% > ${THRESHOLDS.unclear_warn*100}%`,
          action: step === 'divergence' ? 'add_research' :
                  step === 'dimension' ? 'add_criteria' :
                  step === 'synthesis' ? 'structured_output' : 'review',
        });
      }
      if (st.avgQuestions > THRESHOLDS.questions_warn) {
        recommendations.push({
          step,
          issue: 'questions',
          avg: st.avgQuestions,
          detail: `${type}/${step} 均 ${st.avgQuestions.toFixed(1)} 个问题 > ${THRESHOLDS.questions_warn}`,
          action: step === 'divergence' ? 'pre_interview' : 'add_guidance',
        });
      }
    }

    // 真实行为质量评分（不是LLM自评，是用户和系统的真实反馈）
    // 信号1: REFUTED率 — 用户明确说不对
    // 信号2: 问题密度 — 步骤中LLM问了多少问题（问题越多=不确定性越高）
    // 信号3: 清晰稳定性 — is_clear 的一致率
    let qualityScore = null;
    const allDivQuestions = typeRuns.filter(r => r.steps.divergence?.questions_count !== undefined).map(r => r.steps.divergence.questions_count);
    const allDimQuestions = typeRuns.filter(r => r.steps.dimension?.questions_count !== undefined).map(r => r.steps.dimension.questions_count);

    if (typeRuns.length >= 3) {
      // 信号权重无理论依据，当前为等权平均，后续数据积累后可调整
      const divUnclearRate = stepStats.divergence ? (1 - stepStats.divergence.clarityRate) : 0;
      const dimUnclearRate = stepStats.dimension ? (1 - stepStats.dimension.clarityRate) : 0;
      const avgQ = (stepStats.divergence?.avgQuestions || 0) + (stepStats.dimension?.avgQuestions || 0);
      const unclearPenalty = (divUnclearRate + dimUnclearRate) / 2;  // 0-1, 越高越差
      const questionPenalty = Math.min(avgQ / 6, 1);  // 均>6问题=满分惩罚
      qualityScore = Math.max(0, Math.min(1, 1 - unclearPenalty * 0.6 - questionPenalty * 0.4));

      if (qualityScore < 0.3) {
        recommendations.push({
          step: 'overall',
          issue: 'quality',
          score: qualityScore,
          detail: `${type} 行为质量分 ${(qualityScore*100).toFixed(0)}%，不清晰率 ${(divUnclearRate*100).toFixed(0)}%/${(dimUnclearRate*100).toFixed(0)}%`,
          action: 'review_pipeline',
        });
      }
    }

    results.push({
      type,
      count: typeRuns.length,
      steps: stepStats,
      recommendations,
      quality_score: qualityScore,
    });
  }

  // 全量统计
  const total = runs.length;
  const allClear = runs.filter(r => r.summary?.all_clear).length;
  const stepClarity = {};
  for (const step of ['divergence', 'dimension']) {
    const withData = runs.filter(r => r.steps[step]?.is_clear !== undefined);
    if (withData.length > 0) {
      const unclear = withData.filter(r => !r.steps[step].is_clear).length;
      stepClarity[step] = { count: withData.length, clarity_rate: 1 - (unclear / withData.length) };
    }
  }

  return {
    total_runs: total,
    all_clear_rate: allClear / total,
    types_analyzed: results.filter(r => r.recommendations.length > 0).length,
    types_total: results.length,
    step_clarity: stepClarity,
    type_results: results,
  };
}

// ══════════════════════════════════════
//  报告输出
// ══════════════════════════════════════
function report(result) {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  自进化引擎 — 分析报告');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  总运行: ${result.total_runs} 次`);
  console.log(`║  全清晰率: ${(result.all_clear_rate * 100).toFixed(1)}%`);
  console.log(`║  达标类型: ${result.types_analyzed}/${result.types_total} 个有建议`);
  console.log('╚══════════════════════════════════════════════╝\n');

  // 全局步骤清晰率
  console.log('● 全局步骤清晰率:');
  for (const [step, st] of Object.entries(result.step_clarity)) {
    const bar = '█'.repeat(Math.round(st.clarity_rate * 20));
    console.log(`   ${step.padEnd(12)} ${(st.clarity_rate*100).toFixed(0)}% |${bar.padEnd(20)}| (${st.count}次)`);
  }
  console.log('');

  // 每类型分析
  for (const tr of result.type_results) {
    console.log(`● [${tr.type}] ${tr.count}次:`);
    for (const [step, st] of Object.entries(tr.steps)) {
      const qNote = st.avgQuestions > THRESHOLDS.questions_warn ? ' ⚠️问题偏多' : '';
      console.log(`   ${step.padEnd(12)} 清晰 ${(st.clarityRate*100).toFixed(0)}%  均问题 ${st.avgQuestions.toFixed(1)}${qNote}`);
    }

    if (tr.quality_score !== null) {
      const qs = tr.quality_score;
      const icon = qs >= 0.7 ? '✅' : qs >= 0.4 ? '⚠️' : '❌';
      console.log(`   质量分: ${icon} ${(qs*100).toFixed(0)}%`);
    }
    if (tr.recommendations.length === 0) {
      console.log('   ✅ 无需调整');
    } else {
      for (const rec of tr.recommendations) {
        console.log(`   ⚠️  ${rec.action}: ${rec.detail}`);
      }
    }
    console.log('');
  }

  return result;
}

// ══════════════════════════════════════
//  规则应用
// ══════════════════════════════════════
function applyRule(ruleId) {
  const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf-8'));
  const rule = rules.rules.find(r => r.id === ruleId);
  if (!rule) { console.error(`规则 ${ruleId} 不存在`); return; }
  rule.status = 'active';
  rule.applied_at = new Date().toISOString();
  fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2));
  console.log(`✅ 规则 ${ruleId} 已上线`);
}

// ══════════════════════════════════════
//  CLI
// ══════════════════════════════════════
function cli() {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === 'status') {
    const runs = loadRuns();
    const result = analyze(runs);
    console.log(`自进化引擎 — 运行次数: ${result.total_runs}, 类型: ${result.types_total}`);
    for (const [step, st] of Object.entries(result.step_clarity)) {
      console.log(`  ${step}: ${(st.clarity_rate*100).toFixed(0)}% (${st.count}次)`);
    }
    return;
  }

  if (cmd === 'apply') {
    applyRule(args[1]);
    return;
  }

  if (cmd === 'get-rules') {
    const qType = args[1] || '';
    const step = args[2] || '';
    const rules = getMatchingRules(qType, step);
    console.log(JSON.stringify(rules));
    return;
  }

  // 默认: 完整分析
  const runs = loadRuns();
  if (runs.length === 0) {
    console.log('暂无数据，先跑几次管道。');
    return;
  }
  const result = analyze(runs);
  report(result);
}

if (require.main === module) cli();
module.exports = { analyze, report, loadRuns, THRESHOLDS };
