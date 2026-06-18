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
  var lastQ = r1.user_questions || []
  if (r1.is_clear) return result
  if (maxRounds <= 1) return result
  // Round 2 (carrying forward previous blind spots)
  var r2 = await agent(prompt + ' 第2轮。前轮盲点:'+JSON.stringify(lastQ)+'。针对性加深。', { label: label+'R2', schema: schema })
  result = r2
  if (r2.is_clear) return result
  lastQ = r2.user_questions || []
  if (maxRounds <= 2) return result
  // Round 3
  var r3 = await agent(prompt + ' 第3轮。前轮盲点:'+JSON.stringify(lastQ)+'。继续加深。', { label: label+'R3', schema: schema })
  result = r3
  if (r3.is_clear) return result
  if (maxRounds <= 3) return result
  // Round 4
  var r4 = await agent(prompt + ' 第4轮。', { label: label+'R4', schema: schema })
  result = r4
  if (r4.is_clear) return result
  if (maxRounds <= 4) return result
  // Round 5
  var r5 = await agent(prompt + ' 第5轮，最后一轮。', { label: label+'R5', schema: schema })
  result = r5
  return result
}

// Phase 1: Divergence
phase('发散')
var div = runUntilClear('发散', '6视角分析\n需求:'+req+'\n画像:'+profile+'\n每个视角:洞察+数据来源+假设。', {
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
var dim = runUntilClear('八卦镜', '8维度评分\n发散:'+(div.consensus||'')+'\n每维度:评分+依据。', {
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
var plan = runUntilClear('方案', '生成5-8方案\n维度:'+(dim.key_finding||'')+'\n每个:名称+依据+条件。', {
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
  return agent('模拟:'+p.name+' 需求:'+req+' 乐观/中性/悲观路径。', {
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
var debate = runUntilClear('辩论', '多方案辩论\n需求:'+req+'\n推演:\n'+simTxt+'\n排名+综合推荐。', {
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
var syn = runUntilClear('综合', '综合判断\n需求:'+req+'\n辩论:'+(debate.synthesis||'')+'\n结论+推理+假设+用户确认。', {
  type:'object', properties: {
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    conclusion:{type:'string',minLength:50}, reasoning:{type:'string',minLength:50},
    assumptions:{type:'array',items:{type:'string'}},
    user_confirmed:{type:'boolean'},
  }, required:['is_clear','user_questions','conclusion','reasoning','assumptions','user_confirmed'],
}, 0)

// Phase 7: Verification
phase('验证')
var ver = await agent('独立审查\n结论:'+(syn.conclusion||'')+'\n逐条列问题。', {
  label: '验证',
  schema: { type:'object', properties: {
    verdict:{type:'string',enum:['PASS','REVISE']},
    fake_clarity:{type:'boolean'},
    issues:{type:'array',items:{type:'object',properties:{
      severity:{type:'string',enum:['critical','major','minor']}, detail:{type:'string'},
    },required:['severity','detail']}},
  }, required:['verdict','fake_clarity'] },
})

return {
  divergence: div,
  dimension: dim,
  plans: plan,
  simulations: simResults,
  debate: debate,
  synthesis: syn,
  verification: ver,
}
