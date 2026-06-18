// Ponder Step Engine — each step is an independent atomic unit with 3-round loop
// LLM calls one step at a time. Each step loops ≤3 internally. Clear → next.
export const meta = {
  name: 'ponder-pipeline',
  description: '单步执行引擎，每步≤3轮循环',
  phases: [
    { title: '执行中', detail: '请稍候' },
  ],
}

const step = args?.step || ''
const req = args?.user_request || ''
const profile = args?.profile || ''
const prev = args?.previous_results || ''
const feedback = args?.feedback || ''
const round = args?.round || 1

// ─── Divergence Step ───
if (step === 'divergence') {
  phase('发散分析')
  const r = await agent('6视角发散分析\n需求:'+req+'\n画像:'+profile+(feedback?'\n用户反馈:'+feedback:'')+
    '\n每视角:洞察+数据来源+假设。缺知识→先自己搜索查资料。查不到→user_questions填问题+选项(2-4个)。全确定→[]。第'+round+'轮。', {
    label: '鲲鹏之视(6视角发散)',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'object',properties:{q:{type:'string'},options:{type:'array',items:{type:'string'}}},required:['q']},
      perspectives:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, insight:{type:'string'}, data_source:{type:'string'},
        assumption:{type:'string'},
      },required:['name','insight','data_source','assumption']},minItems:6},
      contradictions:{type:'array',items:{type:'string'}},
      consensus:{type:'string'},
    }, required:['is_clear','perspectives','contradictions','consensus'] },
  })
  return { step:'divergence', is_clear:r.is_clear, user_questions:r.user_questions||[], round,
    result: r, max_rounds: 3, next_step: r.is_clear ? "bagua" : null
}

// ─── Dimension Step ───
if (step === 'bagua') {
  phase('维度评分')
  const r = await agent('8维度评分\n\n发散:'+(prev||'')+(feedback?'\n用户反馈:'+feedback:'')+
    '\n每维度:评分+依据+不确定性。缺数据→先搜索。搜不到→user_questions问用户。全确定→[]。第'+round+'轮。', {
    label: '八卦镜(8维评分)',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      dimensions:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, score:{type:'number'}, evidence:{type:'string'},
        uncertainty:{type:'string'},
      },required:['name','score','evidence','uncertainty']},minItems:8},
      key_finding:{type:'string'},
    }, required:['is_clear','dimensions','key_finding'] },
  })
  return { step:'dimension', is_clear:r.is_clear, user_questions:r.user_questions||[], round,
    result: r, max_rounds: 3, next_step: r.is_clear ? 'plans' : null }
}

// ─── Plans Step ───
if (step === 'plans') {
  phase('方案收敛')
  const r = await agent('方案收敛\n\n维度:'+(prev||'')+(feedback?'\n用户反馈:'+feedback:'')+
    '\n生成5-8个方案，每:名称+依据+前提条件+条件已验证。前提条件未验证?→先搜索验证。验证不了→user_questions填问题+选项。。第'+round+'轮。', {
    label: '方案收敛',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      plans:{type:'array',items:{type:'object',properties:{
        name:{type:'string'}, rationale:{type:'string'}, condition:{type:'string'},
        condition_verified:{type:'boolean'},
      },required:['name','rationale','condition','condition_verified']},minItems:5},
      logic:{type:'string'},
    }, required:['is_clear','plans','logic'] },
  })
  return { step:'plans', is_clear:r.is_clear, user_questions:r.user_questions||[], round,
    result: r, max_rounds: 3, next_step: r.is_clear ? 'simulate' : null }
}

// ─── Simulation Step (parallel sub-tasks) ───
if (step === 'simulate') {
  phase('方案推演')
  const planList = args?.plans || []
  const sims = await parallel(
    planList.slice(0,8).map(p => () => agent(
      '模拟方案:'+(p.name||'')+'\n需求:'+req+'\n乐观/中性/悲观。第'+round+'轮。',
      { label:'推演:'+(p.name||'').substring(0,10),
        schema:{type:'object',properties:{
          plan_name:{type:'string'}, optimistic:{type:'string',minLength:50},
          neutral:{type:'string',minLength:50}, pessimistic:{type:'string',minLength:50},
        },required:['plan_name','optimistic','neutral','pessimistic']},
      }
    ))
  )
  return { step:'simulate', is_clear:true, round,
    result: sims.filter(Boolean).map(s=>({
      name:s.plan_name, optimistic:s.optimistic, neutral:s.neutral, pessimistic:s.pessimistic,
    })),
    max_rounds: 1, next_step: 'debate' }
}

// ─── Debate Step ───
if (step === 'debate') {
  phase('方案辩论')
  const simData = args?.simulations || []
  const txt = simData.map(r => r.name+': 乐观='+(r.optimistic||'').substring(0,100)+' 中性='+(r.neutral||'').substring(0,100)).join('\n\n')
  const r = await agent('多方案辩论\n\n需求:'+req+'\n\n推演:\n'+txt+'\n排名+综合。如有不确定→先搜索查证。查不到→user_questions问用户。全确定→[]。第'+round+'轮。', {
    label: '多方辩论',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      ranked:{type:'array',items:{type:'object',properties:{
        rank:{type:'number'}, name:{type:'string'},
        pros:{type:'array',items:{type:'string'}}, cons:{type:'array',items:{type:'string'}},
      },required:['rank','name','pros','cons']},minItems:2},
      synthesis:{type:'string',minLength:50},
    }, required:['is_clear','ranked','synthesis'] },
  })
  return { step:'debate', is_clear:r.is_clear, user_questions:r.user_questions||[], round,
    result: r, max_rounds: 3, next_step: r.is_clear ? 'synthesis' : null }
}

// ─── Synthesis Step ───
if (step === 'synthesis') {
  phase('综合判断')
  const r = await agent('综合判断\n\n需求:'+req+'\n辩论:'+(prev||'')+(feedback?'\n用户反馈:'+feedback:'')+
    '\n结论+推理链+假设清单+用户已确认。任何模糊→先搜索查证。查不到→user_questions问用户。全确定→[]。第'+round+'轮。', {
    label: '综合判断',
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      conclusion:{type:'string',minLength:50}, reasoning:{type:'string',minLength:50},
      assumptions:{type:'array',items:{type:'string'}},
      user_confirmed:{type:'boolean'},
    }, required:['is_clear','conclusion','reasoning','assumptions','user_confirmed'] },
  })
  return { step:'synthesis', is_clear:r.is_clear, user_questions:r.user_questions||[], round,
    result: r, max_rounds: 3, next_step: r.is_clear ? 'verify' : null }
}

// ─── Verification Step ───
if (step === 'verify') {
  phase('独立验证')
  const r = await agent('审查结论\n\n结论:'+(prev||'')+'\n\n逐条列出发现的具体问题。没有就issues:[]。不要只写通过。', {
    label: '独立验证',
    schema: { type:'object', properties: {
      verdict:{type:'string',enum:['PASS','REVISE']},
      fake_clarity:{type:'boolean'},
      issues:{type:'array',items:{type:'object',properties:{
        severity:{type:'string',enum:['critical','major','minor']}, detail:{type:'string',minLength:20},
      },required:['severity','detail']}},
    }, required:['verdict','fake_clarity'] },
  })
  return { step:'verify', is_clear:r.verdict==='PASS', round,
    result: r, max_rounds: 1, next_step: null }
}

return { error: 'unknown step: '+step }
