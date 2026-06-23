export const meta = { name: 'step-debate', description: '步骤7: 辩论', phases: [{ title: '辩论', detail: '排名' }] }
var simResults = args?.simulations || []
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
var simText = simResults.map(function(s){ return s.plan_name + ': V=' + s.V + ' ' + (s.result||'').substring(0,60) }).join('\n')
phase('辩论')
var r = await agent('推演结果:\n' + simText + '\n\n各方案互相反驳优缺点,按V值+论证强度排名,输出综合推荐' + extra, {
  label: '辩论',
  schema: { type:'object', properties: {
    ranked:{type:'array',items:{type:'object',properties:{rank:{type:'number'},name:{type:'string'},pros:{type:'array',items:{type:'string'}},cons:{type:'array',items:{type:'string'}}},required:['rank','name','pros','cons']},minItems:2},
    synthesis:{type:'string'},
  }, required:['ranked','synthesis'] },
})
r._step = 'debate'
return r
