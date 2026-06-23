export const meta = { name: 'step-converge', description: '步骤5: 收敛', phases: [{ title: '收敛', detail: '淘汰弱方案' }] }
var plans = args?.plans || []
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
phase('收敛')
var r = await agent('基于方案: ' + JSON.stringify(plans.slice(0, 8)) + '\n\n淘汰弱方案,保留3-5个最优并评分(0-1)' + extra, {
  label: '收敛',
  schema: { type:'object', properties: {
    survivors:{type:'array',items:{type:'object',properties:{name:{type:'string'},score:{type:'number'},reason:{type:'string'}},required:['name','score','reason']},minItems:3},
  }, required:['survivors'] },
})
r._step = 'converge'
return r
