export const meta = { name: 'step-synthesis', description: '步骤8: 综合', phases: [{ title: '综合', detail: '结论' }] }
var debateSyn = args?.synthesis || ''
var ranked = args?.ranked || []
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
var rankedText = ranked.map(function(r){ return '#' + r.rank + ' ' + r.name + ' 优点:' + (r.pros||[]).join(',') + ' 缺点:' + (r.cons||[]).join(',') }).join('\n')
phase('综合')
var r = await agent('辩论总结: ' + debateSyn + '\n\n方案排名:\n' + rankedText + '\n\n输出最终结论+推理链+风险+待用户确认事项' + extra, {
  label: '综合',
  schema: { type:'object', properties: {
    conclusion:{type:'string'}, reasoning:{type:'string'}, risk:{type:'string'},
    pending_user_questions:{type:'array',items:{type:'string'}},
  }, required:['conclusion','reasoning','risk'] },
})
r._step = 'synthesis'
return r
