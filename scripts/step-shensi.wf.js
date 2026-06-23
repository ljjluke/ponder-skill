export const meta = { name: 'step-shensi', description: '步骤1: 神思', phases: [{ title: '神思', detail: '反直觉发现' }] }
var req = args?.userRequest || ''
var profile = args?.userProfile || ''
var extra = args?._user_answers ? '\n用户补充: ' + args._user_answers : ''
phase('神思')
var r = await agent('虚静→神凝→神游→意象→言意。产出至少1个反直觉发现\n问题:' + req + '\n画像:' + profile + extra, {
  label: '神思',
  schema: { type:'object', properties: {
    counter_intuitive:{type:'string'}, insight:{type:'string'},
  }, required:['counter_intuitive','insight'] },
})
r._step = 'shensi'
return r
