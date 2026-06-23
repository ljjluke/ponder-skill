#!/usr/bin/env node
/**
 * clarity-check.js — 清晰度算法检测（独立 CLI，无需 Workflow）
 *
 * 用法:
 *   node clarity-check.js <outputJSON> [stepName]
 *
 * 输出: { algoScore, fuzzyCount, densityScore, fieldScore, wordCount, warning }
 * LLM 结合此输出 + agent() 语义评判 → 综合分
 */
var args = process.argv.slice(2)
var outputRaw = args[0] || '{}'
var stepName = args[1] || ''

var output
try { output = JSON.parse(outputRaw) } catch(e) { output = { _parseError: outputRaw } }

// 展平对象为文本
function flattenText(obj) {
  if (!obj) return ''
  if (typeof obj === 'string') return obj.substring(0, 5000)
  if (Array.isArray(obj)) return obj.map(function(v) { return typeof v === 'object' ? JSON.stringify(v) : String(v) }).join(' ')
  var parts = []
  for (var k in obj) {
    if (['is_clear','user_questions','_depth_rounds','_passed','_step','_aborted'].indexOf(k) !== -1) continue
    var v = obj[k]
    if (Array.isArray(v)) parts.push(v.map(function(x) { return typeof x === 'object' ? JSON.stringify(x) : String(x) }).join(' '))
    else if (typeof v === 'object' && v !== null) parts.push(JSON.stringify(v))
    else if (typeof v === 'string') parts.push(v)
  }
  return parts.join(' ')
}

var text = flattenText(output)
var wordCount = text.length

// 1. 模糊词检测
var FUZZY_WORDS = ['可能','大概','或许','也许','maybe','probably','perhaps','似乎','好像','感觉']
var fuzzyCount = 0
FUZZY_WORDS.forEach(function(w) {
  var re = new RegExp(w, 'gi')
  var m = text.match(re)
  if (m) fuzzyCount += m.length
})
var fuzzyScore = Math.max(0, 1 - fuzzyCount / Math.max(wordCount / 8, 1))

// 2. 信息密度
var densityScore = Math.min(1, wordCount / 60)

// 3. 空字段检测
var emptyCount = 0, totalFields = 0
;(function scan(obj, depth) {
  if (depth > 3 || !obj || typeof obj !== 'object') return
  if (Array.isArray(obj)) { obj.forEach(function(item) { scan(item, depth + 1) }); return }
  for (var k in obj) {
    if (['is_clear','user_questions','_depth_rounds','_passed','_step','_aborted'].indexOf(k) !== -1) continue
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

var warning = null
if (fuzzyCount > 3) warning = '模糊词过多(' + fuzzyCount + '个)'
else if (wordCount < 30) warning = '内容过短(' + wordCount + '字)'
else if (fieldScore < 0.5) warning = emptyCount + '/' + totalFields + '字段为空'

console.log(JSON.stringify({
  algoScore: Math.round(algoScore * 100) / 100,
  fuzzyCount: fuzzyCount,
  densityScore: Math.round(densityScore * 100) / 100,
  fieldScore: Math.round(fieldScore * 100) / 100,
  wordCount: wordCount,
  warning: warning,
  _stepName: stepName,
}))
