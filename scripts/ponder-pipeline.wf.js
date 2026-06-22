// Ponder Pipeline — single orchestrator agent, sequential execution
export const meta = {
  name: 'ponder-pipeline',
  description: '全流程单agent顺序执行',
  phases: [{ title: '顺序分析', detail: '神思→发散→八卦镜→方案→收敛→推演→辩论→综合→验证' }],
}

const req = args?.user_request || ''
const profile = args?.profile || ''

// 清晰度评分: LLM自评40% + 深度轮数30% + 问题数30%
function clarityScore(result) {
  if (!result) return 0
  var score = 0
  score += (result.is_clear ? 4 : 0)
  var rounds = Math.min(result._depth_rounds || 1, 5)
  score += (rounds === 1 ? 1 : rounds === 2 ? 2 : rounds >= 3 ? 3 : 0)
  var qCount = result.user_questions ? result.user_questions.length : 0
  score += qCount === 0 ? 3 : qCount <= 2 ? 2 : 0
  return Math.round(score * 10) / 10
}

phase('Ponder全流程')
var result = await agent('按顺序执行以下所有分析阶段, 每个阶段完成后再进入下一个:\n\n' +
  '需求:' + req + '\n画像:' + profile + '\n\n' +
  '阶段1 神思: 虚静→神凝→神游→意象→言意。产出至少1个反直觉发现。\n' +
  '阶段2 发散: 基于神思发现, 从6个不同视角审视, 每个视角带洞察和数据来源。\n' +
  '阶段3 八卦镜: 基于发散结果, 从8个维度交叉评分, 找出最异常的维度。\n' +
  '阶段4 方案: 基于八卦镜结果, 生成5-8个可行方案。\n' +
  '阶段5 收敛: 基于八卦镜评分淘汰弱方案, 保留3-5个最优。\n' +
  '阶段6 推演: 对每个幸存方案独立推演, 模拟从开始到结束的完整过程。\n' +
  '阶段7 辩论: 各方案之间互相反驳, 指出对方漏洞, 给出排名。\n' +
  '阶段8 综合: 收拢成结论, 给出推荐+理由+风险。\n\n' +
  '每个阶段产出后检查清晰度。不清晰时填user_questions。', {
  label: '全流程分析',
  schema: { type:'object', properties: {
    reasoning_chain:{type:'string',description:'完整推理过程'},
    is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
    // 神思
    counter_intuitive:{type:'string'}, insight:{type:'string'},
    // 发散
    perspectives:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, insight:{type:'string'}, data_source:{type:'string'},
      assumption:{type:'string'}, reasoning:{type:'string'},
    },required:['name','insight','data_source','assumption','reasoning']}},
    contradictions:{type:'array',items:{type:'string'}}, consensus:{type:'string'},
    // 八卦镜
    dimensions:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, score:{type:'number'}, evidence:{type:'string'},
      uncertainty:{type:'string'}, reasoning:{type:'string'},
    },required:['name','score','evidence','uncertainty','reasoning']}},
    key_finding:{type:'string'},
    // 收敛
    survivors:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, score:{type:'number'}, reason:{type:'string'},
    },required:['name','score','reason']}},
    eliminated:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, reason:{type:'string'},
    }}},
    // 推演
    simulations:{type:'array',items:{type:'object',properties:{
      name:{type:'string'}, process:{type:'string'}, result:{type:'string'}, V:{type:'number'},
    },required:['name','process','result','V']}},
    // 辩论
    ranked:{type:'array',items:{type:'object',properties:{
      rank:{type:'number'}, name:{type:'string'},
      pros:{type:'array',items:{type:'string'}}, cons:{type:'array',items:{type:'string'}},
      reasoning_chain:{type:'string'},
    },required:['rank','name','pros','cons','reasoning_chain']}},
    debate_synthesis:{type:'string'},
    // 综合
    conclusion:{type:'string'}, reasoning:{type:'string'},
    assumptions:{type:'array',items:{type:'string'}},
    risk:{type:'string'},
  }, required:['is_clear','user_questions','reasoning_chain','conclusion','risk']},
})

// 清晰度检查
result._depth_rounds = result._depth_rounds || 1
var cs = clarityScore(result)
result._clarity_score = cs

if (cs < 6) {
  var questions = result.user_questions && result.user_questions.length > 0
    ? result.user_questions : ['分析深度不够(评分' + cs + '/10), 能否补充更多信息?']
  throw new Error("ABORT:" + JSON.stringify({
    pending_user_questions: questions, aborted_at: 'pipeline', clarity_score: cs,
    partial: { counter_intuitive: result.counter_intuitive, consensus: result.consensus, key_finding: result.key_finding },
  }))
}

// 整理输出
return {
  shensi: { counter_intuitive: result.counter_intuitive, insight: result.insight, is_clear: result.is_clear },
  divergence: { perspectives: result.perspectives, contradictions: result.contradictions, consensus: result.consensus, is_clear: result.is_clear },
  dimension: { dimensions: result.dimensions, key_finding: result.key_finding, is_clear: result.is_clear },
  converge: { survivors: result.survivors, eliminated: result.eliminated, is_clear: result.is_clear },
  convergence_summary: {
    survivor_count: (result.survivors||[]).length,
    survivors: (result.survivors||[]).map(function(s){return s.name+'('+s.score+'分)'}),
    eliminated: (result.eliminated||[]).map(function(e){return e.name+': '+e.reason}),
  },
  simulations: result.simulations,
  debate: { ranked: result.ranked, synthesis: result.debate_synthesis, is_clear: result.is_clear },
  debate_summary: {
    ranked: (result.ranked||[]).map(function(r){return '第'+r.rank+'名: '+r.name}),
    stances: (result.ranked||[]).map(function(r){return r.name+': 优势:'+(r.pros||[]).join(',')+' 劣势:'+(r.cons||[]).join(',')}),
  },
  synthesis: { conclusion: result.conclusion, reasoning: result.reasoning, assumptions: result.assumptions, risk: result.risk, is_clear: result.is_clear },
  _clarity: { score: cs, rounds: 1 },
}
