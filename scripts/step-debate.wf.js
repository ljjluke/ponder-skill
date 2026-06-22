export const meta = { name: 'step-debate', description: '步骤7: 辩论', phases: [{ title: '辩论', detail: '排名' }] }
var simResults = args?.simulations || []
var simText = simResults.map(function(s){ return s.plan_name + ': V=' + s.V + ' ' + (s.result||'').substring(0,60) }).join('\n')
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('辩论')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('推演结果:\n' + simText + '\n\n各方案互相反驳优缺点,按V值+论证强度排名,输出综合推荐。不清晰填user_questions' + ctx, {
    label: '辩论_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      ranked:{type:'array',items:{type:'object',properties:{rank:{type:'number'},name:{type:'string'},pros:{type:'array',items:{type:'string'}},cons:{type:'array',items:{type:'string'}}},required:['rank','name','pros','cons']},minItems:2},
      synthesis:{type:'string'},
    }, required:['is_clear','user_questions','ranked','synthesis'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'debate'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'debate', user_questions: lastQ }
