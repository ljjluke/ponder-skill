export const meta = { name: 'step-bagua', description: '步骤3: 八卦镜', phases: [{ title: '八卦镜', detail: '8维度' }] }
var consensus = args?.consensus || ''
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('八卦镜')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('基于发散: ' + consensus + '\n\n从8个维度评分,每个维度:评分+依据+不确定性。不清晰填user_questions' + ctx, {
    label: '八卦镜_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      dimensions:{type:'array',items:{type:'object',properties:{name:{type:'string'},score:{type:'number'},evidence:{type:'string'},uncertainty:{type:'string'}},required:['name','score','evidence','uncertainty']},minItems:8},
      key_finding:{type:'string'},
    }, required:['is_clear','user_questions','dimensions','key_finding'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'bagua'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'bagua', user_questions: lastQ }
