#!/usr/bin/env node
/**
 * Language Adaptation Layer (L10N)
 *
 * Three responsibilities:
 * 1. Detect user language from request
 * 2. Map internal operation names → user-friendly descriptions
 * 3. Provide language-aware output instruction
 *
 * Usage:
 *   const l10n = require('./l10n');
 *   l10n.init(userRequest);           // detect language
 *   l10n.t('memory_recall');          // → "记忆提取中..." or "Recalling memory..."
 *   l10n.label('diverge');            // → "发散分析" or "Divergence analysis"
 */

// ── Operation → human-friendly description ──
const DESCRIPTIONS = {
  zh: {
    memory_recall:     '记忆提取中...',
    web_search:        '正在获取信息...',
    pipeline_start:    '分析进行中...',
    deep_cycle:        '深入分析中...',
    self_review:       '审查自身假设',
    interview:         '了解需求',
    diverge:           '多视角发散',
    bagua:             '维度交叉检查',
    dmn:               '自由联想',
    simulate:          '场景推演',
    debate:            '多方辩论',
    converge:          '收敛判断',
    hierarchy:         '层级验证',
    verify:            '结果审查',
    action:            '行动建议',
    evolving:          '自我优化中...',
    memory_save:       '记忆存储中...',
    config_loading:    '加载配置',
    result_present:    '整理结论',
  },
  en: {
    memory_recall:     'Recalling memory...',
    web_search:        'Gathering information...',
    pipeline_start:    'Analysis in progress...',
    deep_cycle:        'Deepening analysis...',
    self_review:       'Reviewing assumptions',
    interview:         'Understanding needs',
    diverge:           'Multi-perspective divergence',
    bagua:             'Cross-dimension examination',
    dmn:               'Free association',
    simulate:          'Scenario simulation',
    debate:            'Multi-stance debate',
    converge:          'Convergence',
    hierarchy:         'Hierarchical verification',
    verify:            'Result review',
    action:            'Action proposal',
    evolving:          'Self-optimizing...',
    memory_save:       'Saving memory...',
    config_loading:    'Loading config',
    result_present:    'Compiling results',
  }
};

function detectLanguage(request = '') {
  // Simple detection: if request contains Chinese characters
  return /[一-鿿]/.test(request) ? 'zh' : 'en';
}

// ── Phase label translation (language-aware) ──
const labels = {};

function init(request = '') {
  const lang = detectLanguage(request);
  const dict = DESCRIPTIONS[lang] || DESCRIPTIONS.en;
  return { lang, dict };
}

function load(detectResult) {
  const { lang, dict } = detectResult;
  return {
    lang,
    t: (key) => dict[key] || key,
    label: (stepId) => dict[stepId] || stepId,
    friendly: (operation) => dict[operation] || operation,
    instruction: () => lang === 'zh'
      ? '全程使用中文输出, 所有术语用用户语言表达'
      : 'Output in English throughout, no framework jargon',
  };
}

module.exports = { init, load, detectLanguage, DESCRIPTIONS };

if (require.main === module) {
  const test = process.argv[2] || '帮我分析一下当前情况';
  const info = init(test);
  console.log('Request:', test);
  console.log('Detected:', JSON.stringify({ lang: info.lang }));
  const l10n = load(info);
  console.log('Front:', l10n.t('pipeline_start'));
  console.log('Label diverge:', l10n.label('diverge'));
  console.log('Label bagua:', l10n.label('bagua'));
  console.log('Friendly:', l10n.friendly('memory_recall'));
}
