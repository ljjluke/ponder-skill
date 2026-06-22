export const meta = { name: 'step-synthesis', description: '步骤8: 综合', phases: [{ title: '综合', detail: '结论' }] }
var debateSyn = args?.synthesis || ''
var ranked = args?.ranked || []
var rankedText = ranked.map(function(r){ return '#' + r.rank + ' ' + r.name + ' 优点:' + (r.pros||[]).join(',') + ' 缺点:' + (r.cons||[]).join(',') }).join('\n')
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('综合')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('辩论总结: ' + debateSyn + '\n\n方案排名:\n' + rankedText + '\n\n输出最终结论+推理链+风险+待用户确认事项。不清晰填user_questions' + ctx, {
    label: '综合_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      conclusion:{type:'string'}, reasoning:{type:'string'}, risk:{type:'string'},
      pending_user_questions:{type:'array',items:{type:'string'}},
    }, required:['is_clear','user_questions','conclusion','reasoning','risk'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'synthesis'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'synthesis', user_questions: lastQ }
