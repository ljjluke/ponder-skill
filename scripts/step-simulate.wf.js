export const meta = { name: 'step-simulate', description: '步骤6: 推演', phases: [{ title: '推演', detail: '并行十天干' }] }
var survivors = args?.survivors || []
if (!survivors.length) { return { _aborted: true, _step: 'simulate', reason: '无幸存方案可推演' } }
phase('推演')
var pList = survivors.slice(0, 5)
var sims = await parallel(pList.map(function(p) { return function() {
  return agent('完整模拟方案: ' + p.name + '\n依据: ' + (p.reason || '') + '\n评分: ' + (p.score || '') + '\n\n从开始到结束逐步推演,输出结果和V值(0-1)。十天干固定权重:阳干1.0(甲丙戊庚壬),阴干0.8(乙丁己辛癸)。\nV = Σ(达成度×权重)/Σ(权重)', {
    label: '推演_' + p.name.substring(0, 8),
    schema: { type:'object', properties: {
      plan_name:{type:'string'}, process:{type:'string'}, result:{type:'string'}, V:{type:'number'},
      gan_scores:{type:'object', properties:{
        jia_mu:{type:'number'}, yi_mu:{type:'number'}, bing_huo:{type:'number'}, ding_huo:{type:'number'},
        wu_tu:{type:'number'}, ji_tu:{type:'number'}, geng_jin:{type:'number'}, xin_jin:{type:'number'},
        ren_shui:{type:'number'}, gui_shui:{type:'number'},
      }, required:['jia_mu','yi_mu','bing_huo','ding_huo','wu_tu','ji_tu','geng_jin','xin_jin','ren_shui','gui_shui']},
    }, required:['plan_name','process','result','V','gan_scores'] },
  })
}}))
return { simulations: (sims || []).filter(Boolean), _step: 'simulate', _passed: true }
