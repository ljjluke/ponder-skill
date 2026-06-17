#!/usr/bin/env node
/**
 * Language Adaptation Layer (L10N)
 *
 * Three responsibilities:
 * 1. Detect user language from request
 * 2. Map internal operation names → user-friendly descriptions
 * 3. Map framework keywords → domain-specific terms
 *
 * Usage:
 *   const l10n = require('./l10n');
 *   l10n.init(userRequest);           // detect language + domain
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
    // Domain-specific step descriptions
    diverge_finance:   '多角度市场扫描',
    diverge_tech:      '技术方案对比',
    diverge_strategy:  '战略方向发散',
    bagua_finance:     '多维度风险评估',
    bagua_tech:        '技术架构审查',
    bagua_strategy:    '战略维度分析',
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
    diverge_finance:   'Market multi-angle scan',
    diverge_tech:      'Technical solution comparison',
    diverge_strategy:  'Strategic divergence',
    bagua_finance:     'Multi-dimensional risk assessment',
    bagua_tech:        'Technical architecture review',
    bagua_strategy:    'Strategic dimension analysis',
  }
};

// ── Domain detection keywords ──
const DOMAIN_KEYWORDS = {
  finance:  ['stock', 'market', 'invest', 'finance', 'financial', 'portfolio', 'trade', 'fund', '股票', '投资', '基金', '理财', '金融', 'A股', '股市'],
  tech:     ['software', 'architecture', 'system design', 'coding', 'programming', 'database', 'api', '技术', '架构', '开发', '系统', '代码'],
  strategy: ['strategy', 'expansion', 'market entry', 'competition', 'business', '战略', '商业', '市场', '竞争', '扩张'],
  health:   ['treatment', 'diagnosis', 'patient', 'medical', 'clinical', '医疗', '诊断', '治疗', '临床', '患者'],
};

function detectDomain(request = '') {
  const r = request;
  const rLow = request.toLowerCase();
  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(k => r.includes(k) || rLow.includes(k)).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : 'general';
}

function detectLanguage(request = '') {
  // Simple detection: if request contains Chinese characters
  return /[一-鿿]/.test(request) ? 'zh' : 'en';
}

// ── Phase label translation (domain-aware) ──
const labels = {};

function init(request = '') {
  const lang = detectLanguage(request);
  const domain = detectDomain(request);
  const dict = DESCRIPTIONS[lang] || DESCRIPTIONS.en;
  const domainDict = DESCRIPTIONS[lang + '_' + domain] || {};
  return { lang, domain, dict, domainDict };
}

function load(detectResult) {
  const { lang, domain, dict, domainDict } = detectResult;
  return {
    lang,
    domain,
    t: (key) => domainDict[key] || dict[key] || key,
    label: (stepId) => {
      // Domain-specific label for diverge/bagua
      const domainKey = stepId + '_' + domain;
      return domainDict[domainKey] || dict[stepId] || stepId;
    },
    friendly: (operation) => dict[operation] || operation,
    instruction: () => lang === 'zh'
      ? '全程使用中文输出, 所有术语用用户语言表达'
      : 'Output in English throughout, no framework jargon',
  };
}

module.exports = { init, load, detectLanguage, detectDomain, DESCRIPTIONS };

if (require.main === module) {
  const test = process.argv[2] || '帮我分析一下A股';
  const info = init(test);
  console.log('Request:', test);
  console.log('Detected:', JSON.stringify({ lang: info.lang, domain: info.domain }));
  const l10n = load(info);
  console.log('Front:', l10n.t('pipeline_start'));
  console.log('Label diverge:', l10n.label('diverge'));
  console.log('Label bagua:', l10n.label('bagua'));
  console.log('Friendly:', l10n.friendly('memory_recall'));
}
