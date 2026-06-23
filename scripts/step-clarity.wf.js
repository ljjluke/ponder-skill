// step-clarity.wf.js — 通用清晰度评分
// 接收任何步骤的产出,算法+LLM双重评分,LLM无法操纵
export const meta = { name: 'step-clarity', description: '通用清晰度评分', phases: [{ title: '清晰度', detail: '算法+LLM双重评分' }] }

var output = args?.output || {}
var stepName = args?.stepName || ''
var stepGoal = args?.stepGoal || ''
var userReq = args?.userRequest || ''

// 将产出展平为文本（通用，不依赖结构）
function flattenText(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) return obj.map(function(v) { return typeof v === 'object' ? JSON.stringify(v) : String(v) }).join(' ')
  var parts = []
  for (var k in obj) {
    if (k === 'is_clear' || k === 'user_questions' || k === '_depth_rounds' || k === '_passed' || k === '_step') continue
    var v = obj[k]
    if (Array.isArray(v)) parts.push(v.map(function(x) { return typeof x === 'object' ? JSON.stringify(x) : String(x) }).join(' '))
    else if (typeof v === 'object' && v !== null) parts.push(JSON.stringify(v))
    else if (typeof v === 'string') parts.push(v)
  }
  return parts.join(' ')
}

var text = flattenText(output)
var wordCount = text.length

// ─── 算法检测（代码执行，LLM管不着） ───
phase('清晰度_算法')

// 1. 模糊词检测
var FUZZY_WORDS = ['可能','大概','或许','也许','maybe','probably','perhaps','似乎','好像','感觉']
var fuzzyCount = 0
FUZZY_WORDS.forEach(function(w) {
  var re = new RegExp(w, 'gi')
  var m = text.match(re)
  if (m) fuzzyCount += m.length
})
var fuzzyScore = Math.max(0, 1 - fuzzyCount / Math.max(wordCount / 10, 1))
if (fuzzyScore < 0.5 && fuzzyCount > 2) {
  log('警告: 模糊词过多(' + fuzzyCount + '个), 清晰度扣分')
}

// 2. 信息密度 — 字数太少=不清晰
var minWords = 20
var densityScore = Math.min(1, wordCount / (minWords * 3))

// 3. 空字段检测 — 任何字段为空或极短
var emptyCount = 0; var totalFields = 0
;(function scanFields(obj, depth) {
  if (depth > 3 || !obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) {
    obj.forEach(function(item) { scanFields(item, depth + 1) })
    return
  }
  for (var k in obj) {
    if (k === 'is_clear' || k === 'user_questions' || k === '_depth_rounds' || k === '_passed' || k === '_step') continue
    totalFields++
    var v = obj[k]
    if (v === null || v === undefined) emptyCount++
    else if (typeof v === 'string' && v.trim().length < 3) emptyCount++
    else if (Array.isArray(v) && v.length === 0) emptyCount++
  }
})(output, 0)
var fieldScore = totalFields > 0 ? (1 - emptyCount / totalFields) : 0.5

// 综合算法分
var algoScore = fuzzyScore * 0.3 + densityScore * 0.4 + fieldScore * 0.3
log('算法评分: 模糊=' + fuzzyScore.toFixed(2) + ' 密度=' + densityScore.toFixed(2) + ' 字段=' + fieldScore.toFixed(2) + ' 综合=' + algoScore.toFixed(2))

// ─── LLM语义评判 ───
phase('清晰度_语义')

var r = await agent('你是清晰度评审官。评估以下步骤产出是否足够清晰进入下一步。注意：这是系统内部判断，不展示给用户。\n\n用户原问题: ' + userReq + '\n当前步骤: ' + stepName + '\n步骤目标: ' + stepGoal + '\n\n产出内容:\n' + text.substring(0, 3000) + '\n\n判断: 产出是否清晰完整？哪些地方含糊？缺什么信息？是否需要追问用户？', {
  label: '清晰度_' + stepName,
  schema: { type:'object', properties: {
    is_clear:{type:'boolean'},
    clarity_score:{type:'number', description:'0-1, 0=完全不清晰 1=完全清晰'},
    user_questions:{type:'array', items:{type:'string'}, description:'需要追问用户的问题。即使is_clear=true也可以有补充性问题'},
    issues:{type:'array', items:{type:'string'}, description:'产出中的含糊/缺失之处'},
  }, required:['is_clear','clarity_score','user_questions','issues'] },
})

// ─── 综合判定 ───
var llmScore = r.clarity_score || (r.is_clear ? 0.7 : 0.3)
var finalScore = algoScore * 0.35 + llmScore * 0.65
var passed = finalScore >= 0.55 && r.is_clear !== false

log('最终: 算法=' + (algoScore * 0.35).toFixed(2) + ' LLM=' + (llmScore * 0.65).toFixed(2) + ' 总分=' + finalScore.toFixed(2) + ' ' + (passed ? '✅通过' : '❌不通过'))

return {
  _step: 'clarity',
  passed: passed,
  score: Math.round(finalScore * 100) / 100,
  algo_score: Math.round(algoScore * 100) / 100,
  llm_score: Math.round(llmScore * 100) / 100,
  user_questions: r.user_questions || [],
  issues: r.issues || [],
  is_clear: r.is_clear,
}
