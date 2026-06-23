export const meta = { name: 'step-plans', description: '步骤4: 方案', phases: [{ title: '方案', detail: '5-8方案' }] }
var keyFinding = args?.key_finding || ''
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
phase('方案')
var r = await agent('基于八卦镜: ' + keyFinding + '\n\n生成5-8个方案,每个:名称+依据+条件' + extra, {
  label: '方案',
  schema: { type:'object', properties: {
    plans:{type:'array',items:{type:'object',properties:{name:{type:'string'},rationale:{type:'string'},condition:{type:'string'}},required:['name','rationale','condition']},minItems:5},
  }, required:['plans'] },
})
r._step = 'plans'
return r
