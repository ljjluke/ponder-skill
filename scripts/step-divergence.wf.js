export const meta = { name: 'step-divergence', description: '步骤2: 发散', phases: [{ title: '发散', detail: '6视角' }] }
var shensi = args?.shensi || ''
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('发散')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('基于神思: ' + shensi + '\n\n从6个视角审视,每个视角:洞察+数据来源+假设。不清晰填user_questions' + ctx, {
    label: '发散_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      perspectives:{type:'array',items:{type:'object',properties:{name:{type:'string'},insight:{type:'string'},data_source:{type:'string'},assumption:{type:'string'}},required:['name','insight','data_source','assumption']},minItems:6},
      consensus:{type:'string'},
    }, required:['is_clear','user_questions','perspectives','consensus'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'divergence'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'divergence', user_questions: lastQ }
