// Ponder Pipeline — code-enforced step-by-step with clarity gates
export const meta = {
  name: 'ponder-pipeline',
  description: '分步执行+代码强制清晰度检查',
  phases: [
    { title: '神思', detail: '反直觉' },
    { title: '发散', detail: '6视角' },
    { title: '八卦镜', detail: '8维度' },
    { title: '方案', detail: '5-8方案' },
    { title: '收敛', detail: '淘汰弱方案' },
    { title: '推演', detail: '十天干' },
    { title: '辩论', detail: '排名' },
    { title: '综合', detail: '结论' },
  ],
}

const req = args?.user_request || ''
const profile = args?.profile || ''

// 强制深度循环: is_clear + 问题数≤2 才通过
async function step(label, prompt, schema, maxRounds) {
  var lastQ = []
  for (var round = 1; round <= (maxRounds || 3); round++) {
    var ctx = lastQ.length > 0 ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
    var r = await agent(prompt + ' 第' + round + '轮' + ctx, { label: label + '_R' + round, schema: schema })
    r._depth_rounds = round
    // 清晰条件: is_clear + 问题数≤2 (上层直接判断, 非子agent)
    var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
    log(label + ' 第' + round + '轮: is_clear=' + r.is_clear + ' 问题=' + (r.user_questions || []).length + (pass ? ' ✅通过' : ' ❌不清晰'))
    if (pass) return r
    lastQ = r.user_questions || []
  }
  log(label + ' 已达最大轮数, 终止')
  return { _aborted: true, _depth_rounds: maxRounds, user_questions: lastQ }
}

// ─── 1. 神思 ───
phase('神思')
var shensi = await step('神思', '问题: ' + req + '\n画像: ' + profile + '\n\n虚静→神凝→神游→意象→言意。产出至少1个反直觉发现。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    counter_intuitive: { type: 'string' }, insight: { type: 'string' },
  }, required: ['is_clear', 'user_questions', 'counter_intuitive', 'insight']
})
if (shensi._aborted) { return { _aborted_at: 'shensi', partial: shensi } }

// ─── 2. 发散 ───
phase('发散')
var div = await step('发散', '基于神思: ' + (shensi.counter_intuitive || '') + '\n\n从6个视角审视,每个视角:洞察+数据来源+假设。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    perspectives: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, insight: { type: 'string' }, data_source: { type: 'string' },
      assumption: { type: 'string' },
    }, required: ['name', 'insight', 'data_source', 'assumption'] }, minItems: 6 },
    contradictions: { type: 'array', items: { type: 'string' } },
    consensus: { type: 'string' },
  }, required: ['is_clear', 'user_questions', 'perspectives', 'consensus']
})
if (div._aborted) { return { _aborted_at: 'divergence', _shensi: shensi, partial: div } }

// ─── 3. 八卦镜 ───
phase('八卦镜')
var dim = await step('八卦镜', '基于发散: ' + (div.consensus || '') + '\n\n从8个维度评分,每个维度:评分+依据+不确定性。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    dimensions: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' },
      uncertainty: { type: 'string' },
    }, required: ['name', 'score', 'evidence', 'uncertainty'] }, minItems: 8 },
    key_finding: { type: 'string' },
  }, required: ['is_clear', 'user_questions', 'dimensions', 'key_finding']
})
if (dim._aborted) { return { _aborted_at: 'dimension', _shensi: shensi, _div: div, partial: dim } }

// ─── 4. 方案 ───
phase('方案')
var plan = await step('方案', '基于八卦镜: ' + (dim.key_finding || '') + '\n\n生成5-8个方案,每个:名称+依据+条件。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    plans: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, rationale: { type: 'string' }, condition: { type: 'string' },
    }, required: ['name', 'rationale', 'condition'] }, minItems: 5 },
  }, required: ['is_clear', 'user_questions', 'plans']
})
if (plan._aborted) { return { _aborted_at: 'plans', _shensi: shensi, _div: div, _dim: dim, partial: plan } }

// ─── 5. 收敛 ───
phase('收敛')
var conv = await step('收敛', '基于方案结果\n\n淘汰弱方案,保留3-5个最优并评分。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    survivors: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, score: { type: 'number' }, reason: { type: 'string' },
    }, required: ['name', 'score', 'reason'] }, minItems: 3 },
  }, required: ['is_clear', 'user_questions', 'survivors']
})
if (conv._aborted) { return { _aborted_at: 'converge', partial: conv } }

// ─── 6. 推演(并行) ───
phase('推演')
var pList = (conv.survivors || []).slice(0, 5)
var sims = await parallel(pList.map(function(p) { return function() {
  return agent('模拟方案: ' + p.name + '\n' + (p.reason || '') + '\n\n完整模拟从开始到结束,输出结果和V值(0-1)', {
    label: '推演_' + p.name.substring(0, 8),
    schema: { type: 'object', properties: {
      plan_name: { type: 'string' }, process: { type: 'string' }, result: { type: 'string' }, V: { type: 'number' },
    }, required: ['plan_name', 'process', 'result', 'V'] },
  })
}}))
var simResults = (sims || []).filter(Boolean)

// ─── 7. 辩论 ───
phase('辩论')
var debate = await step('辩论', '推演结果:\n' + simResults.map(function(s) { return s.plan_name + ': V=' + s.V + ' ' + (s.result || '').substring(0, 60) }).join('\n') + '\n\n各方案互相反驳,排名+综合推荐。不清晰填user_questions', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    ranked: { type: 'array', items: { type: 'object', properties: {
      rank: { type: 'number' }, name: { type: 'string' },
      pros: { type: 'array', items: { type: 'string' } }, cons: { type: 'array', items: { type: 'string' } },
    }, required: ['rank', 'name', 'pros', 'cons'] }, minItems: 2 },
    synthesis: { type: 'string' },
  }, required: ['is_clear', 'user_questions', 'ranked', 'synthesis']
})
if (debate._aborted) { return { _aborted_at: 'debate', partial: debate } }

// ─── 8. 综合 ───
phase('综合')
var syn = await step('综合', '辩论总结: ' + (debate.synthesis || '') + '\n\n结论+推理+风险+待用户确认事项。', {
  type: 'object', properties: {
    is_clear: { type: 'boolean' }, user_questions: { type: 'array', items: { type: 'string' } },
    conclusion: { type: 'string' }, reasoning: { type: 'string' },
    risk: { type: 'string' },
    pending_user_questions: { type: 'array', items: { type: 'string' } },
  }, required: ['is_clear', 'user_questions', 'conclusion', 'reasoning']
})
if (syn._aborted) { return { _aborted_at: 'synthesis', partial: syn } }

return {
  shensi: { counter_intuitive: shensi.counter_intuitive },
  divergence: { perspectives: div.perspectives, consensus: div.consensus },
  dimension: { dimensions: dim.dimensions, key_finding: dim.key_finding },
  plans: { plans: plan.plans },
  converge: { survivors: conv.survivors },
  simulations: simResults,
  debate: { ranked: debate.ranked, synthesis: debate.synthesis },
  synthesis: { conclusion: syn.conclusion, reasoning: syn.reasoning, risk: syn.risk, pending_user_questions: syn.pending_user_questions || [] },
  _steps_completed: 8,
}
