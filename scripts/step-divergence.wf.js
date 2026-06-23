export const meta = { name: 'step-divergence', description: '步骤2: 发散', phases: [{ title: '发散', detail: '6视角' }] }
var shensi = args?.shensi || ''
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
phase('发散')
var r = await agent('基于神思: ' + shensi + '\n\n从6个视角审视,每个视角:洞察+数据来源+假设' + extra, {
  label: '发散',
  schema: { type:'object', properties: {
    perspectives:{type:'array',items:{type:'object',properties:{name:{type:'string'},insight:{type:'string'},data_source:{type:'string'},assumption:{type:'string'}},required:['name','insight','data_source','assumption']},minItems:6},
    consensus:{type:'string'},
  }, required:['perspectives','consensus'] },
})
r._step = 'divergence'
return r
