export const meta = { name: 'step-converge', description: '步骤5: 收敛', phases: [{ title: '收敛', detail: '淘汰弱方案' }] }
var plans = args?.plans || []
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('收敛')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('基于方案: ' + JSON.stringify(plans.slice(0, 8)) + '\n\n淘汰弱方案,保留3-5个最优并评分(0-1)。不清晰填user_questions' + ctx, {
    label: '收敛_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      survivors:{type:'array',items:{type:'object',properties:{name:{type:'string'},score:{type:'number'},reason:{type:'string'}},required:['name','score','reason']},minItems:3},
    }, required:['is_clear','user_questions','survivors'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'converge'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'converge', user_questions: lastQ }
