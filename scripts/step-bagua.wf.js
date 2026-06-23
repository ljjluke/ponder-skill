export const meta = { name: 'step-bagua', description: '步骤3: 八卦镜', phases: [{ title: '八卦镜', detail: '8维度' }] }
var consensus = args?.consensus || ''
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
phase('八卦镜')
var r = await agent('基于发散: ' + consensus + '\n\n从8个维度评分,每个维度:评分+依据+不确定性' + extra, {
  label: '八卦镜',
  schema: { type:'object', properties: {
    dimensions:{type:'array',items:{type:'object',properties:{name:{type:'string'},score:{type:'number'},evidence:{type:'string'},uncertainty:{type:'string'}},required:['name','score','evidence','uncertainty']},minItems:8},
    key_finding:{type:'string'},
  }, required:['dimensions','key_finding'] },
})
r._step = 'bagua'
return r
