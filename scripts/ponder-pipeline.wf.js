// Ponder Step Engine — each step is an independent atomic unit
export const meta = {
  name: 'ponder-pipeline',
  description: '单步执行引擎',
  phases: [{ title: '执行中', detail: '' }],
}

const step = args?.step || ''
const req = args?.user_request || ''
const profile = args?.profile || ''
const prev = args?.previous_results || ''
const feedback = args?.feedback || ''
const round = args?.round || 1

// ─── Divergence ───
if (step === 'divergence') {
  phase('发散分析')
  const r = await agent('6视角发散分析\n需求:'+req+'\n画像:'+profile+(feedback?'\n反馈:'+feedback:'')+'\n第'+round+'轮。每视角:洞察+数据来源+假设。缺知识先搜索，搜不到→user_questions。', {
    label: '鲲鹏之视(6视角发散)',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'},
      user_questions:{type:'array',items:{type:'string'}},
      perspectives:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, insight:{type:'string'}, data_source:{type:'string'},
        assumption:{type:'string'},
      },required:['name','insight','data_source','assumption']},minItems:6},
      contradictions:{type:'array',items:{type:'string'}},
      consensus:{type:'string'},
    }, required:['is_clear','user_questions','perspectives','contradictions','consensus'] },
  })
  return { step:'divergence', is_clear:r.is_clear, user_questions:r.user_questions||[], round:round, result:r, max_rounds:3, next_step: r.is_clear ? 'bagua' : null }
}

// ─── Dimension (Bagua) ───
if (step === 'bagua') {
  phase('八卦镜')
  const r = await agent('8维度评分\n发散:'+prev+(feedback?'\n反馈:'+feedback:'')+'\n第'+round+'轮。每维度:评分+依据+不确定性。缺数据搜，搜不到→user_questions。', {
    label: '八卦镜(8维评分)',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'},
      user_questions:{type:'array',items:{type:'string'}},
      dimensions:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, score:{type:'number'},
        evidence:{type:'string'}, uncertainty:{type:'string'},
      },required:['name','score','evidence','uncertainty']},minItems:8},
      key_finding:{type:'string'},
    }, required:['is_clear','user_questions','dimensions','key_finding'] },
  })
  return { step:'bagua', is_clear:r.is_clear, user_questions:r.user_questions||[], round:round, result:r, max_rounds:3, next_step: r.is_clear ? 'plans' : null }
}

// ─── Plans ───
if (step === 'plans') {
  phase('方案收敛')
  const r = await agent('方案收敛\n维度:'+prev+(feedback?'\n反馈:'+feedback:'')+'\n第'+round+'轮。5-8方案，每:名称+依据+条件。条件未验证→user_questions。', {
    label: '方案收敛',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'},
      user_questions:{type:'array',items:{type:'string'}},
      plans:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, rationale:{type:'string'},
        condition:{type:'string'}, condition_verified:{type:'boolean'},
      },required:['name','rationale','condition','condition_verified']},minItems:5},
      logic:{type:'string'},
    }, required:['is_clear','user_questions','plans','logic'] },
  })
  return { step:'plans', is_clear:r.is_clear, user_questions:r.user_questions||[], round:round, result:r, max_rounds:3, next_step: r.is_clear ? 'simulate' : null }
}

// ─── Simulation (parallel) ───
if (step === 'simulate') {
  phase('方案推演')
  const planList = args?.plans || []
  const sims = await parallel(planList.slice(0,8).map(function(p) { return function() {
    return agent('模拟:'+(p.name||'')+' 乐观/中性/悲观路径。', {
      label: '推演:'+(p.name||'').substring(0,10),
      schema: { type:'object', properties: {
        plan_name:{type:'string'}, optimistic:{type:'string',minLength:50},
        neutral:{type:'string',minLength:50}, pessimistic:{type:'string',minLength:50},
      }, required:['plan_name','optimistic','neutral','pessimistic'] },
    })
  }}))
  return { step:'simulate', is_clear:true, round:round, result:sims, max_rounds:1, next_step:'debate' }
}

// ─── Debate ───
if (step === 'debate') {
  phase('方案辩论')
  const simData = args?.simulations || []
  const txt = simData.map(function(r) { return r.name+': 乐观='+(r.optimistic||'').substring(0,100) }).join('\n\n')
  const r = await agent('多方案辩论\n需求:'+req+'\n推演:\n'+txt+'\n排名+综合。有不确定→user_questions。', {
    label: '多方辩论',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'},
      user_questions:{type:'array',items:{type:'string'}},
      ranked:{type:'array',items:{type:'object',properties:{
        rank:{type:'number'}, name:{type:'string'},
        pros:{type:'array',items:{type:'string'}}, cons:{type:'array',items:{type:'string'}},
      },required:['rank','name','pros','cons']},minItems:2},
      synthesis:{type:'string'},
    }, required:['is_clear','user_questions','ranked','synthesis'] },
  })
  return { step:'debate', is_clear:r.is_clear, user_questions:r.user_questions||[], round:round, result:r, max_rounds:3, next_step: r.is_clear ? 'synthesis' : null }
}

// ─── Synthesis ───
if (step === 'synthesis') {
  phase('综合判断')
  const r = await agent('综合判断\n需求:'+req+'\n辩论:'+prev+(feedback?'\n反馈:'+feedback:'')+'\n第'+round+'轮。结论+推理链+假设。模糊→user_questions。', {
    label: '综合判断',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'},
      user_questions:{type:'array',items:{type:'string'}},
      conclusion:{type:'string',minLength:50}, reasoning:{type:'string',minLength:50},
      assumptions:{type:'array',items:{type:'string'}},
      user_confirmed:{type:'boolean'},
    }, required:['is_clear','user_questions','conclusion','reasoning','assumptions','user_confirmed'] },
  })
  return { step:'synthesis', is_clear:r.is_clear, user_questions:r.user_questions||[], round:round, result:r, max_rounds:3, next_step: r.is_clear ? 'verify' : null }
}

// ─── Verification ───
if (step === 'verify') {
  phase('独立验证')
  const r = await agent('审查\n结论:'+prev+'\n逐条列出发现的问题。没有就issues:[ ]。', {
    label: '独立验证',
    schema: { type:'object', properties: {
      verdict:{type:'string',enum:['PASS','REVISE']},
      fake_clarity:{type:'boolean'},
      issues:{type:'array',items:{type:'object',properties:{
        severity:{type:'string',enum:['critical','major','minor']}, detail:{type:'string'},
      },required:['severity','detail']}},
    }, required:['verdict','fake_clarity'] },
  })
  return { step:'verify', is_clear:r.verdict==='PASS', round:round, result:r, max_rounds:1, next_step:null }
}

return { step:step, error:'unknown step' }
