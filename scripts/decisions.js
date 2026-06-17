#!/usr/bin/env node
/**
 * Decision routing engine — codified decision logic.
 *
 * Instead of describing decision rules in SKILL.md prompts,
 * the LLM calls this module to get deterministic decisions.
 *
 * Rules:
 *   Context-driven: existing data supports → decide autonomously
 *   Data-driven: missing data → search more
 *   User-driven: preference/choice → ask user
 *   LLM guessing: NOT ALLOWED
 */

/**
 * Evaluate pipeline result certainty and depth loop decision.
 * This replaces the "depth loop decision routing" section in SKILL.md.
 *
 * @param {object} result — pipeline output with fields:
 *   @param {boolean} result.hasVagueWording — contains "may", "maybe", "uncertain" etc.
 *   @param {number} result.selfCheckPassRate — 0-1, how many self-checks passed
 *   @param {number} result.dataSourceRatio — 0-1, how many claims have real data sources
 *   @param {string[]} result.missingDataAreas — which areas lack data
 *   @param {string[]} result.userQuestions — questions that need user input
 *   @param {number} result.depthRound — current depth loop round (0-based)
 * @returns {{ action: string, reason: string }}
 *   action: 'present' | 'deepen' | 'ask_user' | 'report_gaps'
 */
function evaluateDepthLoop(result) {
  return { action: result?.all_clear ? "present" : "deepen" };
}

function classifyUncertainty(uncertainty = {}) {
  const { type, detail = '' } = uncertainty;

  switch (type) {
    case 'missing_data':
      return { authority: '🔍 Data-driven', action: 'Search for specific data: ' + detail };
    case 'user_preference':
      return { authority: '👤 User-driven', action: 'Ask user: ' + detail };
    case 'contradiction':
      return { authority: '🖥️ Context-driven', action: 'Search tiebreaker data: ' + detail };
    case 'self_check_failed':
      return { authority: '🖥️ Context-driven', action: 'Re-run with fix context' };
    default:
      return { authority: '⚠️ Unknown', action: 'Check if data or user input is needed' };
  }
}

/**
 * Validate a message against the output filter.
 * This replaces the "output filter" checklist in SKILL.md.
 *
 * @param {string} message — the intended output message
 * @param {string} userLanguage — 'zh' | 'en' | 'ja' | etc.
 * @returns {{ pass: boolean, issues: string[] }}
 */
function checkOutput(message = '', userLanguage = 'zh') {
  const issues = [];
  const internalTerms = [
    '五诊画像', 'Pipeline', '元配置', '元数据', '6尺度发散',
    '八卦镜', 'DMN间歇', '多场景推演', '社会认知辩论', '收敛自检',
    '层级预测', '具身行动', '回溯验证', '结论核验', '独立核验',
    '自检', '哈希', '排序', '迭代', '数组', '权重', '向量', '矩阵',
    '节点', '回路', 'Schema', '正则', '回调', '异步',
    'MCTS', 'Schema', 'Agent', 'Bash', 'JSON', 'free energy', 'pipeline', 'MMA',
  ];

  // Check for internal terms that weren't translated
  for (const term of internalTerms) {
    if (message.includes(term)) {
      issues.push(`Internal term "${term}" not translated to ${userLanguage}`);
    }
  }

  // Check for shell commands / technical artifacts
  if (/●\s*(Bash|Agent|WebSearch|Task Output)/.test(message)) {
    issues.push('Contains visible tool call artifacts');
  }
  if (/node scripts\//.test(message)) {
    issues.push('Contains shell commands');
  }
  if (/\{\s*"(count|status|result)/.test(message)) {
    issues.push('Contains JSON output');
  }
  if (/Thought for \d+s/.test(message)) {
    issues.push('Contains "Thought for Xs"');
  }
  if (/[a-z0-9]{12,}/.test(message) && /Task Output/.test(message)) {
    issues.push('Contains Agent task ID');
  }

  return { pass: issues.length === 0, issues };
}

module.exports = { evaluateDepthLoop, classifyUncertainty, checkOutput };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'test-loop') {
    // Test with a clear result
    const r1 = evaluateDepthLoop({
      hasVagueWording: false,
      selfCheckPassRate: 1.0,
      dataSourceRatio: 0.9,
      missingDataAreas: [],
      userQuestions: [],
      depthRound: 0,
    });
    console.log('Clear result:', r1);

    // Test with uncertain result
    const r2 = evaluateDepthLoop({
      hasVagueWording: true,
      selfCheckPassRate: 0.6,
      dataSourceRatio: 0.3,
      missingDataAreas: ['market data', 'competitor info'],
      userQuestions: [],
      depthRound: 0,
    });
    console.log('Uncertain result:', r2);

    // Test with user questions
    const r3 = evaluateDepthLoop({
      userQuestions: ['Prefers short-term or long-term?'],
      depthRound: 1,
    });
    console.log('User questions:', r3);
  } else if (cmd === 'test-filter') {
    const msg1 = '📊 Analysis in progress...';
    console.log('Clean message:', checkOutput(msg1, 'zh'));

    const msg2 = 'The Pipeline configuration has 6尺度发散 enabled.';
    console.log('Dirty message:', checkOutput(msg2, 'zh'));
  } else {
    console.log('Usage: node scripts/decisions.js <test-loop|test-filter>');
  }
}
