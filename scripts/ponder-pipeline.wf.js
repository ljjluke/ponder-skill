// Ponder Pipeline — full sequential + parallel, each step loops max 3 rounds
// No while/for (Workflow parser restriction). Unrolled via if statements.
export const meta = {
  name: 'ponder-pipeline',
  description: '发散→维度→方案→推演→辩论→综合→验证 (每步≤3轮)',
  phases: [
    { title: '发散分析', detail: '多角度审视' },
    { title: '维度评分', detail: '系统评估' },
    { title: '方案收敛', detail: '收敛可行方案' },
    { title: '方案推演', detail: '并行模拟' },
    { title: '方案辩论', detail: '交叉论证' },
    { title: '综合判断', detail: '最终结论' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const req = args?.user_request || ''
const profile = args?.step1 || ''
const fb1 = args?.step1_feedback || '' // user feedback for divergence
const fb2 = args?.step2_feedback || '' // user feedback for dimension
const fb3 = args?.step3_feedback || '' // user feedback for plans
const fb5 = args?.step5_feedback || '' // user feedback for synthesis

// SCHEMA: output structure for each agent
const BASE = { type: 'object', properties: {
  is_clear: { type: 'boolean', description: 'true=结论清晰, false=需要用户补充' },
  user_questions: { type: 'array', items: { type: 'string' }, description: '不清时问用户的问题' },
}, required: ['is_clear'] }

// ═══ STEP 1: Divergence (≤3 rounds) ═══
phase('发散分析')
let div = null
// Round 1
div = await agent('6视角发散分析\n需求:'+req+'\n画像:'+profile+(fb1?'\n用户反馈:'+fb1:'')+
  '\n每个视角:洞察+数据来源+假设。如不确定用户方向→user_questions。', {
  label: '发散分析',
  schema: { ...BASE, properties: { ...BASE.properties,
    perspectives: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, insight: { type: 'string' }, data_source: { type: 'string' },
      assumption: { type: 'string' },
    }, required: ['name', 'insight', 'data_source', 'assumption'] }, minItems: 6 },
    contradictions: { type: 'array', items: { type: 'string' } },
    consensus: { type: 'string' },
  }, required: ['is_clear', 'perspectives', 'contradictions', 'consensus'] },
})
// Round 2 (if unclear + feedback provided)
let div2 = null
if (!div.is_clear && fb1) {
  div2 = await agent('发散分析第2轮\n需求:'+req+'\n用户反馈:'+fb1+'\n基于反馈调整视角。仍不清继续问。', {
    label: '发散R2',
    schema: { ...BASE, properties: { ...BASE.properties,
      perspectives: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, insight: { type: 'string' }, data_source: { type: 'string' },
      }, required: ['name', 'insight', 'data_source'] }, minItems: 6 },
      contradictions: { type: 'array', items: { type: 'string' } },
      consensus: { type: 'string' },
    }, required: ['is_clear', 'perspectives', 'contradictions', 'consensus'] },
  })
}
// Round 3 (if still unclear + more feedback)
let div3 = null
if (div2 && !div2.is_clear && fb1) {
  div3 = await agent('发散分析第3轮(最终)\n'+req+'\n反馈:'+fb1+'\n最后一轮，尽力清晰。', {
    label: '发散R3',
    schema: { type: 'object', properties: {
      perspectives: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, insight: { type: 'string' },
      }, required: ['name', 'insight'] }, minItems: 6 },
      contradictions: { type: 'array', items: { type: 'string' } },
      consensus: { type: 'string' },
    }, required: ['perspectives', 'contradictions', 'consensus'] },
  })
}
const divergence = div3 || div2 || div
const divClear = (div3 && div3.is_clear) || (div2 && div2.is_clear) || div.is_clear

// ═══ STEP 2: Dimension (≤3 rounds) ═══
phase('维度评分')
let dim = null
dim = await agent('8维度评分\n\n发散结果:\n'+(divergence.consensus||'')+(fb2?'\n用户反馈:'+fb2:'')+
  '\n每个维度:评分+依据+不确定性。', {
  label: '维度评分',
  schema: { ...BASE, properties: { ...BASE.properties,
    dimensions: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' },
      uncertainty: { type: 'string' },
    }, required: ['name', 'score', 'evidence', 'uncertainty'] }, minItems: 8 },
    key_finding: { type: 'string' },
  }, required: ['is_clear', 'dimensions', 'key_finding'] },
})
let dim2 = null
if (!dim.is_clear && fb2) {
  dim2 = await agent('维度评分第2轮\n反馈:'+fb2+'\n调整评分。', {
    label: '评分R2',
    schema: { type: 'object', properties: {
      dimensions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, score: { type: 'number' }, evidence: { type: 'string' },
      }, required: ['name', 'score', 'evidence'] }, minItems: 8 },
      key_finding: { type: 'string' },
    }, required: ['dimensions', 'key_finding'] },
  })
}
let dim3 = null
if (dim2 && fb2) {
  dim3 = await agent('维度评分第3轮\n反馈:'+fb2+'\n最终调整。', {
    label: '评分R3',
    schema: { type: 'object', properties: {
      dimensions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, score: { type: 'number' },
      }, required: ['name', 'score'] }, minItems: 8 },
      key_finding: { type: 'string' },
    }, required: ['dimensions', 'key_finding'] },
  })
}
const dimension = dim3 || dim2 || dim
const dimClear = (dim3?true:false) || (dim2?true:false) || dim.is_clear

// ═══ STEP 3: Plans (≤3 rounds) ═══
phase('方案收敛')
let plan = null
plan = await agent('方案收敛\n\n发散:'+(divergence.consensus||'')+'\n维度:'+(dimension.key_finding||'')+
  (fb3?'\n用户反馈:'+fb3:'')+'\n生成5-8个方案，每个:名称+依据+前提条件。', {
  label: '方案收敛',
  schema: { ...BASE, properties: { ...BASE.properties,
    plans: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, rationale: { type: 'string' }, condition: { type: 'string' },
      condition_verified: { type: 'boolean' },
    }, required: ['name', 'rationale', 'condition', 'condition_verified'] }, minItems: 5 },
    logic: { type: 'string' },
  }, required: ['is_clear', 'plans', 'logic'] },
})
// Plans rounds 2-3 (same pattern, omitted for brevity - only 1 round if clear)
let planR = plan

// ═══ STEP 4: Simulation (parallel) ═══
phase('方案推演')
const planList = planR.plans || []
const sims = await parallel(
  planList.slice(0,8).map(p => () => agent(
    '模拟:'+p.name+'\n需求:'+req+'\n乐观/中性/悲观路径。',
    { label: '推演:'+(p.name||'').substring(0,10),
      schema: { type:'object', properties: {
        plan_name:{type:'string'}, optimistic:{type:'string',minLength:50},
        neutral:{type:'string',minLength:50}, pessimistic:{type:'string',minLength:50},
      }, required:['plan_name','optimistic','neutral','pessimistic'] },
    }
  ))
)

// ═══ STEP 5: Debate ═══
phase('方案辩论')
const simTxt = sims.filter(Boolean).map(r =>
  r.plan_name+': 乐观='+r.optimistic.substring(0,100)+' 中性='+r.neutral.substring(0,100)
).join('\n\n')
const debate = await agent('多方案辩论\n\n需求:'+req+'\n\n推演:\n'+simTxt+'\n排名+综合推荐。', {
  label: '方案辩论',
  schema: { type:'object', properties: {
    ranked:{type:'array',items:{type:'object',properties:{
      rank:{type:'number'}, name:{type:'string'},
      pros:{type:'array',items:{type:'string'}},
      cons:{type:'array',items:{type:'string'}},
    },required:['rank','name','pros','cons']},minItems:2},
    synthesis:{type:'string',minLength:50},
  }, required:['ranked','synthesis'] },
})

// ═══ STEP 6: Synthesis (≤3 rounds) ═══
phase('综合判断')
let syn = null
syn = await agent('综合判断\n\n需求:'+req+'\n推演:'+(debate.synthesis||'')+(fb5?'\n用户反馈:'+fb5:'')+
  '\n结论+推理链+假设清单+用户已确认。', {
  label: '综合判断',
  schema: { ...BASE, properties: { ...BASE.properties,
    conclusion:{type:'string',minLength:50},
    reasoning:{type:'string',minLength:50},
    assumptions:{type:'array',items:{type:'string'}},
    user_confirmed:{type:'boolean'},
  }, required:['is_clear','conclusion','reasoning','assumptions','user_confirmed'] },
})
// Synthesis rounds 2-3
let synR = syn
if (!syn.is_clear && fb5) {
  synR = await agent('综合第2轮\n反馈:'+fb5+'\n修正结论。', {
    label: '综合R2',
    schema: { type:'object', properties: {
      conclusion:{type:'string'}, reasoning:{type:'string'},
      assumptions:{type:'array',items:{type:'string'}},
      user_confirmed:{type:'boolean'},
    }, required:['conclusion','reasoning','assumptions','user_confirmed'] },
  })
}

// ═══ STEP 7: Verification ═══
phase('独立验证')
const verify = await agent('独立验证\n\n结论:'+(synR.conclusion||'')+'\n推理:'+(synR.reasoning||'')+
  '\n检查:结论清晰?数据缺失?跳过步骤?替用户决定?', {
  label: '独立验证',
  schema: { type:'object', properties: {
    verdict:{type:'string',enum:['PASS','REVISE']},
    fake_clarity:{type:'boolean'},
    issues:{type:'array',items:{type:'object',properties:{
      severity:{type:'string',enum:['critical','major','minor']},
      detail:{type:'string'},
    },required:['severity','detail']}},
  }, required:['verdict','fake_clarity'] },
})

return {
  divergence: {
    perspectives: divergence.perspectives,
    contradictions: divergence.contradictions,
    consensus: divergence.consensus,
    is_clear: divClear,
    user_questions: divergence.user_questions || [],
  },
  dimension: {
    scores: dimension.dimensions,
    key_finding: dimension.key_finding,
    is_clear: dimClear,
    user_questions: dimension.user_questions || [],
  },
  plans: {
    items: planR.plans,
    logic: planR.logic,
  },
  simulation: sims.filter(Boolean).map(s => ({
    name: s.plan_name, optimistic: s.optimistic, neutral: s.neutral, pessimistic: s.pessimistic,
  })),
  debate: { ranked: debate.ranked, synthesis: debate.synthesis },
  synthesis: {
    conclusion: synR.conclusion,
    reasoning: synR.reasoning,
    assumptions: synR.assumptions,
    user_confirmed: synR.user_confirmed,
    user_questions: synR.user_questions || [],
  },
  verify: { verdict: verify.verdict, issues: verify.issues || [], fake_clarity: verify.fake_clarity },
}
