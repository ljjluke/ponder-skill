export const meta = { name: 'step-plans', description: '步骤4: 方案', phases: [{ title: '方案', detail: '5-8方案' }] }
var keyFinding = args?.key_finding || ''
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('方案')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('基于八卦镜: ' + keyFinding + '\n\n生成5-8个方案,每个:名称+依据+条件。不清晰填user_questions' + ctx, {
    label: '方案_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      plans:{type:'array',items:{type:'object',properties:{name:{type:'string'},rationale:{type:'string'},condition:{type:'string'}},required:['name','rationale','condition']},minItems:5},
    }, required:['is_clear','user_questions','plans'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'plans'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'plans', user_questions: lastQ }
