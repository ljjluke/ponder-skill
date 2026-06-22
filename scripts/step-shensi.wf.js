export const meta = { name: 'step-shensi', description: '步骤1: 神思', phases: [{ title: '神思', detail: '反直觉发现' }] }
var req = args?.userRequest || ''
var profile = args?.userProfile || ''
var lastQ = []
for (var round = 1; round <= 3; round++) {
  phase('神思')
  var ctx = lastQ.length ? '\n前轮盲点: ' + JSON.stringify(lastQ) : ''
  var r = await agent('虚静→神凝→神游→意象→言意。产出至少1个反直觉发现。不清晰填user_questions\n问题:' + req + '\n画像:' + profile + ctx, {
    label: '神思_R' + round,
    schema: { type:'object', properties: {
      is_clear:{type:'boolean'}, user_questions:{type:'array',items:{type:'string'}},
      counter_intuitive:{type:'string'}, insight:{type:'string'},
    }, required:['is_clear','user_questions','counter_intuitive','insight'] },
  })
  r._depth_rounds = round
  var pass = r.is_clear && (!r.user_questions || r.user_questions.length <= 2)
  if (pass) { r._passed = true; r._step = 'shensi'; return r }
  lastQ = r.user_questions || []
}
return { _aborted: true, _depth_rounds: 3, _step: 'shensi', user_questions: lastQ }
