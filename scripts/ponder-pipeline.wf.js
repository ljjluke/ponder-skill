// Ponder Complete Engine — one call, code-enforced depth loop
export const meta = {
  name: 'ponder-pipeline',
  description: '全流程一步到位+代码级深度循环',
  phases: [
    { title: '发散', detail: '6视角' }, { title: '八卦镜', detail: '8维度' },
    { title: '方案', detail: '收敛' }, { title: '推演', detail: '并行' },
    { title: '辩论', detail: '排名' }, { title: '综合', detail: '结论' },
    { title: '验证', detail: '审查' },
  ],
}

const req = args?.user_request || ''
const profile = args?.profile || ''
const lessons = args?.lessons || ''
const appliedRules = args?.applied_rules || []
// 步骤历史积累: 每个步骤可用的历史输出(如历史发散视角/历史维度等)
const stepHistory = args?.step_history || {}  // { divergence: [...], dimension: [...], ... }
// 错误前置警告: 每步独享，只拿自己相关的错误
const errorWarnings = args?.error_warnings || {}  // { divergence: [...], dimension: [...], ... }
// 预计算每步错误警告文本（避免行内函数表达式）
var errDiv = '', errDim = '', errPlan = '', errDebate = '', errSyn = '', errVer = ''
// 直接使用 errorWarnings
if (errorWarnings.divergence && errorWarnings.divergence.length > 0) errDiv = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.divergence.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')
if (errorWarnings.dimension && errorWarnings.dimension.length > 0) errDim = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.dimension.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')
if (errorWarnings.plans && errorWarnings.plans.length > 0) errPlan = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.plans.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')
if (errorWarnings.debate && errorWarnings.debate.length > 0) errDebate = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.debate.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')
if (errorWarnings.synthesis && errorWarnings.synthesis.length > 0) errSyn = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.synthesis.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')
if (errorWarnings.verify && errorWarnings.verify.length > 0) errVer = '\n\n⚠️ 已知错误规避:\n' + errorWarnings.verify.map(function(e) { return '- ['+e.type+'] '+e.summary }).join('\n')

// Phase 0: Pre-step from evolution rules (e.g. market research before divergence)
var researchContext = ''
var researchRule = appliedRules.find(function(r) { return r.action?.type === 'prepend_step' })
if (researchRule) {
  phase('数据采集')
  var rData = await agent('收集市场数据\n需求:' + req + '\n输出: 市场概况,关键数据,趋势', {
    label: '前置研究',
    schema: { type:'object', properties: {
      market_overview:{type:'string',minLength:100},
      key_stats:{type:'array',items:{type:'object',properties:{stat:{type:'string'},source:{type:'string'}}}},
      trends:{type:'array',items:{type:'string'}},
    }, required:['market_overview','key_stats','trends'] },
  })
  researchContext = '参考数据: ' + (rData.market_overview||'') + '\n关键数据: ' + JSON.stringify((rData.key_stats||[]).slice(0,5)) + '\n趋势: ' + ((rData.trends||[]).join(', '))
}

// Force depth: run round 1, if not clear run round 2, if not clear run round 3
// No while/for. Unrolled as sequential if statements.
async function runUntilClear(label, prompt, schema, rounds) {
  // rounds=0 means unlimited (but we limit to 5 in practice)
  var maxRounds = rounds > 0 ? rounds : 5
  var result = null
  var r1 = null
  // Round 1
  r1 = await agent(prompt + ' 第1轮。必须清晰。不清晰填user_questions。', { label: label, schema: schema })
  result = r1
  r1._depth_rounds = 1
  var lastQ = r1.user_questions || []
  // is_clear + 问题数≤2 同时满足才跳过(防止LLM偷懒说清楚)
  if (r1.is_clear && (!r1.user_questions || r1.user_questions.length <= 2)) { r1._depth_rounds = 1; return result }
  if (maxRounds <= 1) return result
  // Round 2 (carrying forward previous blind spots)
  var r2 = await agent(prompt + ' 第2轮。前轮盲点:'+JSON.stringify(lastQ)+'。针对性加深。', { label: label+'R2', schema: schema })
  result = r2
  r2._depth_rounds = 2
  if (r2.is_clear && (!r2.user_questions || r2.user_questions.length <= 2)) { r2._depth_rounds = 2; return result }
  lastQ = r2.user_questions || []
  if (maxRounds <= 2) return result
  // Round 3
  var r3 = await agent(prompt + ' 第3轮。前轮盲点:'+JSON.stringify(lastQ)+'。继续加深。', { label: label+'R3', schema: schema })
  result = r3
  r3._depth_rounds = 3
  if (r3.is_clear) { r3._depth_rounds = 3; return result }
  if (maxRounds <= 3) return result
  // Round 4
  var r4 = await agent(prompt + ' 第4轮。', { label: label+'R4', schema: schema })
  result = r4
  r4._depth_rounds = 4
  if (r4.is_clear) { r4._depth_rounds = 4; return result }
  if (maxRounds <= 4) return result
  // Round 5
  var r5 = await agent(prompt + ' 第5轮，最后一轮。', { label: label+'R5', schema: schema })
  result = r5
  r5._depth_rounds = 5
  return result
}

// Phase 1: Divergence
phase('发散')
var divCandidates = stepHistory.divergence || []
var divHistory = ''
if (divCandidates.length > 0) {
  phase('历史视角筛选')
  var divFiltered = await agent('需求: '+req+'\n从以下历史视角中选出最相关的8条用于本次分析:\n'+divCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '视角筛选',
    schema: { type:'object', properties: {
      selected_indices:{type:'array',items:{type:'number'},description:'最相关的历史视角编号'},
      reason:{type:'string'},
    }, required:['selected_indices'] },
  })
  divHistory = '\n\n同类问题历史视角参考:\n' + (divFiltered.selected_indices||[]).map(function(i){return '- '+(divCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var div = runUntilClear('发散', '6视角分析\n需求:'+req+'\n画像:'+profile+'\n每个视角:洞察+数据来源+假设。\n历史经验:'+lessons+divHistory+errDiv+(researchContext?'\n\n前置研究数据:\n'+researchContext+'':''), {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    perspectives:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, insight:{type:'string'}, data_source:{type:'string'},
      assumption:{type:'string'},
    },required:['name','insight','data_source','assumption']},minItems:6},
    contradictions:{type:'array',items:{type:'string'}},
    consensus:{type:'string'},
  }, required:['is_clear','user_questions','perspectives','contradictions','consensus'],
}, 0)

// Phase 2: Dimension
phase('八卦镜')
var dimCandidates = stepHistory.dimension || []
var dimHistory = ''
if (dimCandidates.length > 0) {
  phase('历史维度筛选')
  var dimFiltered = await agent('需求: '+req+'\n从以下历史维度中选出最相关的8条用于本次评分:\n'+dimCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '维度筛选',
    schema: { type:'object', properties: {
      selected_indices:{type:'array',items:{type:'number'}},
      reason:{type:'string'},
    }, required:['selected_indices'] },
  })
  dimHistory = '\n\n同类历史维度参考:\n' + (dimFiltered.selected_indices||[]).map(function(i){return '- '+(dimCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var dim = runUntilClear('八卦镜', '8维度评分\n发散:'+(div.consensus||'')+'\n每维度:评分+依据。\n历史经验:'+lessons+dimHistory+errDim, {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    dimensions:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, score:{type:'number'}, evidence:{type:'string'},
      uncertainty:{type:'string'},
    },required:['name','score','evidence','uncertainty']},minItems:8},
    key_finding:{type:'string'},
  }, required:['is_clear','user_questions','dimensions','key_finding'],
}, 0)

// Phase 3: Plans
phase('方案')
var planHistory = ''
var planCandidates = stepHistory.plans || []
if (planCandidates.length > 0) {
  phase('历史方案筛选')
  var planFiltered = await agent('需求: '+req+'\n从以下历史方案中选出最相关的8条:\n'+planCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '方案筛选',
    schema: { type:'object', properties: { selected_indices:{type:'array',items:{type:'number'}}, reason:{type:'string'} }, required:['selected_indices'] },
  })
  planHistory = '\n\n同类历史方案参考:\n' + (planFiltered.selected_indices||[]).map(function(i){return '- '+(planCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var plan = runUntilClear('方案', '生成5-8方案\n维度:'+(dim.key_finding||'')+'\n每个:名称+依据+条件。\n历史经验:'+lessons+planHistory+errPlan, {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    plans:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, rationale:{type:'string'},
      condition:{type:'string'}, condition_verified:{type:'boolean'},
    },required:['name','rationale','condition','condition_verified']},minItems:5},
    logic:{type:'string'},
  }, required:['is_clear','user_questions','plans','logic'],
}, 0)

// Phase 4: Simulation (parallel, no loop needed)
phase('推演')
var planList = (plan && plan.plans) || []
var sims = await parallel(planList.slice(0,8).map(function(p) { return function() {
  return agent('模拟:'+p.name+' 需求:'+req+' 乐观/中性/悲观路径。\n历史经验:'+lessons, {
    label: '推演:'+p.name.substring(0,10),
    schema: { type:'object', properties: {
      plan_name:{type:'string'}, optimistic:{type:'string',minLength:50},
      neutral:{type:'string',minLength:50}, pessimistic:{type:'string',minLength:50},
    }, required:['plan_name','optimistic','neutral','pessimistic'] },
  })
}}))
var simResults = (sims||[]).filter(Boolean).map(function(s) {
  return { name:s&&s.plan_name||'', optimistic:s&&s.optimistic||'', neutral:s&&s.neutral||'', pessimistic:s&&s.pessimistic||'' }
})

// Phase 5: Debate
phase('辩论')
var simTxt = simResults.map(function(r) {
  return r.name+': 乐观='+(r.optimistic||'').substring(0,100)+' 中性='+(r.neutral||'').substring(0,100)+' 悲观='+(r.pessimistic||'').substring(0,100)
}).join('\n\n')
var debateHistory = ''
var debateCandidates = stepHistory.debate || []
if (debateCandidates.length > 0) {
  phase('历史辩论筛选')
  var debateFiltered = await agent('需求: '+req+'\n从以下历史辩论结论中选出最相关的8条:\n'+debateCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '辩论筛选',
    schema: { type:'object', properties: { selected_indices:{type:'array',items:{type:'number'}}, reason:{type:'string'} }, required:['selected_indices'] },
  })
  debateHistory = '\n\n同类历史辩论参考:\n' + (debateFiltered.selected_indices||[]).map(function(i){return '- '+(debateCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var debate = runUntilClear('辩论', '多方案辩论\n需求:'+req+'\n推演:\n'+simTxt+'\n排名+综合推荐。\n历史经验:'+lessons+debateHistory+errDebate, {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    ranked:{type:'array',items:{type:'object',properties:{
      rank:{type:'number'}, name:{type:'string'},
      pros:{type:'array',items:{type:'string'}}, cons:{type:'array',items:{type:'string'}},
    },required:['rank','name','pros','cons']},minItems:2},
    synthesis:{type:'string',minLength:50},
  }, required:['is_clear','user_questions','ranked','synthesis'],
}, 0)

// Phase 6: Synthesis
phase('综合')
var synHistory = ''
var synCandidates = stepHistory.synthesis || []
if (synCandidates.length > 0) {
  phase('历史综合筛选')
  var synFiltered = await agent('需求: '+req+'\n从以下历史综合结论中选出最相关的8条:\n'+synCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '综合筛选',
    schema: { type:'object', properties: { selected_indices:{type:'array',items:{type:'number'}}, reason:{type:'string'} }, required:['selected_indices'] },
  })
  synHistory = '\n\n同类历史综合参考:\n' + (synFiltered.selected_indices||[]).map(function(i){return '- '+(synCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var syn = runUntilClear('综合', '综合判断\n需求:'+req+'\n辩论:'+(debate.synthesis||'')+synHistory+errSyn+'\n重要规则:\n1. 先检查辩论结果中是否存在方向分歧(方案优劣相当/需要用户偏好选择/条件未触发)。如有,必须填入pending_user_questions,不要自己决定。\n2. 只有当某个方案在所有维度(收益/风险/条件)都明显优于其他方案时,才直接出结论。\n3. 结论+推理+假设+用户确认+pending_user_questions+pending_lessons。\n4. 分析后认为值得记录的教训→填入pending_lessons。', {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    conclusion:{type:'string',minLength:50}, reasoning:{type:'string',minLength:50},
    assumptions:{type:'array',items:{type:'string'}},
    user_confirmed:{type:'boolean'}, pending_user_questions:{type:'array',items:{type:'string'},description:'呈现前必须问用户的问题清单'},pending_lessons:{type:'array',items:{type:'object',properties:{scenario:{type:'string'},attempt:{type:'string'},result:{type:'string'},lesson:{type:'string'}},required:['scenario','attempt','result','lesson']},description:'值得记录的教训'},
  }, required:['is_clear','user_questions','conclusion','reasoning','assumptions','user_confirmed','pending_user_questions'],
}, 0)

// Phase 7: Verification
phase('验证')
var verHistory = ''
var verCandidates = stepHistory.verify || []
if (verCandidates.length > 0) {
  phase('历史验证参考')
  var verFiltered = await agent('需求: '+req+'\n从以下历史验证发现中选出最相关的8条:\n'+verCandidates.map(function(h,i){return (i+1)+'. '+(h.content||'').replace(/^\S*?\]/,'')}).join('\n')+'\n\n输出所选编号', {
    label: '验证筛选',
    schema: { type:'object', properties: { selected_indices:{type:'array',items:{type:'number'}}, reason:{type:'string'} }, required:['selected_indices'] },
  })
  verHistory = '\n\n同类历史验证参考:\n' + (verFiltered.selected_indices||[]).map(function(i){return '- '+(verCandidates[i-1]?.content||'').replace(/^\S*?\]/,'')}).join('\n')
}
var ver = await agent('独立审查\n结论:'+(syn.conclusion||'')+'\n逐条列问题。'+verHistory+errVer, {
  label: '验证',
  schema: { type:'object', properties: {
    verdict:{type:'string',enum:['PASS','REVISE']},
    fake_clarity:{type:'boolean'},
    issues:{type:'array',items:{type:'object',properties:{
      severity:{type:'string',enum:['critical','major','minor']}, detail:{type:'string'},
    },required:['severity','detail']}},
  }, required:['verdict','fake_clarity'] },
})

// 结晶化: lessons附上本次分析的推理上下文
  var reasoningContext = {
    divergence_consensus: (div && div.consensus || '').substring(0, 200),
    dimension_finding: (dim && dim.key_finding || '').substring(0, 200),
    plans_logic: (plan && plan.logic || '').substring(0, 200),
    simulations_summary: (simResults || []).length + '个方案推演',
    debate_synthesis: (debate && debate.synthesis || '').substring(0, 200),
    debate_ranked: ((debate && debate.ranked || []).slice(0,3).map(function(r) { return r.name }).join(', ')),
    synthesis_conclusion: (syn && syn.conclusion || '').substring(0, 200),
    verification_verdict: ver && ver.verdict || '',
  }
  var lessonsWithReasoning = (syn && syn.pending_lessons || []).map(function(l) {
    return Object.assign({}, l, { _reasoning: reasoningContext })
  })

  return {
    divergence: div,
    dimension: dim,
    plans: plan,
    simulations: simResults,
    debate: debate,
    synthesis: syn,
    lessons_to_store: lessonsWithReasoning,
    reasoning: reasoningContext,
    verification: ver,
  _step_outputs: {
    divergence: div ? { is_clear: div.is_clear, consensus: (div.consensus||'').substring(0,200), perspective_count: (div.perspectives||[]).length } : null,
    dimension: dim ? { is_clear: dim.is_clear, key_finding: (dim.key_finding||'').substring(0,200), dimension_count: (dim.dimensions||[]).length } : null,
    plans: plan ? { is_clear: plan.is_clear, plan_count: (plan.plans||[]).length } : null,
    debate: debate ? { is_clear: debate.is_clear, synthesis: (debate.synthesis||'').substring(0,200), ranked_count: (debate.ranked||[]).length } : null,
    synthesis: syn ? { is_clear: syn.is_clear, conclusion: (syn.conclusion||'').substring(0,200), lessons_count: (syn.pending_lessons||[]).length } : null,
    verify: ver ? { verdict: ver.verdict, fake_clarity: ver.fake_clarity, issues_count: (ver.issues||[]).length } : null,
  },
}
