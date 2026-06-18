// Ponder Self-Correcting Pipeline
// Generate → Critique → Refine loop with independent verification
// Inspired by Self-Refine (Madaan 2023) + ultragoal + BoT (prompt self-evolution)

export const meta = {
  name: 'ponder-pipeline',
  description: 'Structured analysis pipeline: divergence → examination → simulation → debate → convergence → verification',
  phases: [
    { title: '多角度分析', detail: '从6个不同角度审视问题' },
    { title: '维度检查', detail: '8个维度的系统分析' },
    { title: '自由联想', detail: '发散性关联思考' },
    { title: '多场景推演', detail: '多个方向的独立模拟' },
    { title: '多方论证', detail: '不同角度的观点对比' },
    { title: '综合判断', detail: '多方向综合判断和自审' },
    { title: '结果回溯', detail: '回溯推理过程' },
    { title: '结论审查', detail: '从反面审查结论' },
  ],
}

// ═══════════════════════════════════════════════════════════════
//  Schema定义 — JSON Schema为强制约束，子Agent不可跳过
// ═══════════════════════════════════════════════════════════════

const MEMORY_TAG = { type: 'string', description: '用于knowledge acquire召回的标签' }

const PERSPECTIVE = {
  type: 'object', properties: {
    name: { type: 'string' },
    insight: { type: 'string', minLength: 20 },
    detail: { type: 'string', minLength: 40 },
    conflict_with: { type: 'array', items: { type: 'string' } },
    _memory_tag: MEMORY_TAG,
  }, required: ['name', 'insight', 'detail']
}

const USER_QUESTION = { type: 'string', description: '需要用户决策的问题(涉及偏好/选择/价值判断, LLM不应猜测)' }

const STEP2_SCHEMA = {
  type: 'object', properties: {
    perspectives: { type: 'array', items: PERSPECTIVE, minItems: 6, maxItems: 6 },
    contradictions: { type: 'array', items: { type: 'string' }, minItems: 2 },
    consensus: { type: 'string', minLength: 30 },
    user_questions: { type: 'array', items: USER_QUESTION, description: '发散阶段遇到的用户决策点' },
  }, required: ['perspectives', 'contradictions', 'consensus']
}

const DIMENSION = {
  type: 'object', properties: {
    name: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 10 },
    analysis: { type: 'string', minLength: 30 },
    cross_ref: { type: 'string' },
    _memory_tag: MEMORY_TAG,
  }, required: ['name', 'score', 'analysis', 'cross_ref']
}

const STEP3_SCHEMA = {
  type: 'object', properties: {
    dimensions: { type: 'array', items: DIMENSION, minItems: 8, maxItems: 8 },
    conflicts: { type: 'array', items: { type: 'object', properties: {
      pair: { type: 'string' }, tension: { type: 'string' }, severity: { type: 'number', minimum: 1, maximum: 10 },
    }, required: ['pair', 'tension'] }, minItems: 3 },
    key_finding: { type: 'string', minLength: 30 },
    user_questions: { type: 'array', items: USER_QUESTION },
  }, required: ['dimensions', 'conflicts', 'key_finding']
}

// ── 方向提取 Schema (Step 4a: 从Step3冲突中提炼方向) ──
const DIRECTION_PLAN_SCHEMA = {
  type: 'object', properties: {
    directions: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string', description: '方向名称' },
      conflict_source: { type: 'string', description: '基于Step3的哪个维度冲突' },
      focus_area: { type: 'string', description: '这个方向聚焦的领域' },
    }, required: ['name', 'conflict_source'] }, minItems: 2, maxItems: 3 },
  }, required: ['directions']
}

// ── 单方向推演 Schema (Step 4b: 每个方向独立推演，必须基于真实数据) ──
// 每个推演Agent是独立的，不知道其他方向的存在
// probability不允许出现——推演必须有真实依据，不是LLM随口标概率
const REAL_SCENARIO = {
  type: 'object', properties: {
    trigger_conditions: { type: 'string', minLength: 30, description: '这个场景发生必须满足的真实条件' },
    path: { type: 'string', minLength: 50, description: '基于数据的具体推演路径' },
    evidence: { type: 'string', minLength: 30, description: '支持这个场景的真实数据/历史案例引用—必须来自WebSearch或用户提供' },
    signal: { type: 'string', description: '这个场景正在发生的可观察信号' },
    break_point: { type: 'string', description: '这个场景中第一个会断裂的假设' },
    data_source: { type: 'string', description: '本次推演依赖的具体数据来源URL或引用' },
  }, required: ['trigger_conditions', 'path', 'evidence', 'data_source']
}

const SINGLE_DIRECTION_SCHEMA = {
  type: 'object', properties: {
    name: { type: 'string' },
    conflict_source: { type: 'string' },
    optimistic: REAL_SCENARIO, realistic: REAL_SCENARIO, pessimistic: REAL_SCENARIO,
    data_sources: { type: 'array', items: { type: 'string' }, minItems: 1, description: '本次推演使用的全部真实数据来源' },
    _memory_tag: { type: 'string', description: 'new:关键词 — 标记这个方向产生的可存储知识' },
  }, required: ['name', 'data_sources', 'optimistic', 'realistic', 'pessimistic']
}

// ── 跨方向汇总 Schema (Step 4c) ──
const STEP4_AGGREGATE_SCHEMA = {
  type: 'object', properties: {
    comparison: { type: 'string', minLength: 60, description: '跨方向对比——每个场景下哪个方向表现最好？' },
    common_ground: { type: 'string', minLength: 40, description: '所有方向共同指向的结论（即使在分歧中也有共识）' },
    key_risks: { type: 'array', items: { type: 'string' }, minItems: 2, description: '所有方向共有的关键风险' },
    recommendation: { type: 'string', minLength: 40, description: '基于用户风格的最终推荐' },
    user_questions: { type: "array", items: { type: "string" } },
  }, required: ['comparison', 'common_ground', 'key_risks', 'recommendation']
}

const SELF_CHECK_ITEM = {
  type: 'object', properties: {
    question: { type: 'string' }, answer: { type: 'string' }, passed: { type: 'boolean' },
  }, required: ['question', 'answer', 'passed']
}

const STEP5_SCHEMA = {
  type: 'object', properties: {
    conclusion: { type: 'string', minLength: 50 },
    reasoning_chain: { type: 'string', minLength: 50 },
    what_if_wrong: { type: 'string' },
    self_check: { type: 'array', items: SELF_CHECK_ITEM, minItems: 5, maxItems: 5 },
    all_clear: { type: 'boolean' },
    follow_up_signals: { type: "array", items: { type: "string" }, minItems: 2 },
    user_questions: { type: "array", items: { type: "string" } },
  }, required: ['conclusion', 'reasoning_chain', 'self_check', 'all_clear']
}

// ── DMN自由联想 Schema ──
const DMN_SCHEMA = {
  type: 'object', properties: {
    free_associations: { type: 'array', items: { type: 'string' }, minItems: 2, description: '自然涌现的想法, 不需要合理' },
    unexpected_connection: { type: 'string', description: '跨领域联想' },
    gut_feeling: { type: 'string', description: '直觉感受, 不需要理由' },
  }, required: ['free_associations', 'gut_feeling'],
}

// ── 权重加载 Schema ──
const WEIGHTS_SCHEMA = {
  type: 'object',
  additionalProperties: { type: 'number' },
  description: '从WeightRegistry加载的可学习权重',
}

// ── 独立验证 Schema ──
// 验证Agent是独立上下文，任务是主动找茬（不是检查格式，是证明分析有漏洞）
const VERIFY_SCHEMA = {
  type: 'object', properties: {
    all_clear: { type: 'boolean', description: 'true=没有致命问题, false=发现问题需要回退' },
    verdict: { type: 'string', enum: ['PASS', 'REVISE_STEP2', 'REVISE_STEP3', 'REVISE_STEP4', 'REVISE_STEP5'] },
    issues: { type: 'array', items: { type: 'object', properties: {
      step: { type: 'number', description: '问题所在的步骤编号(2-5)' },
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      detail: { type: 'string', minLength: 30 },
      evidence: { type: 'string', description: '从分析内容中引用的具体证据' },
    }, required: ['step', 'severity', 'detail'] }, minItems: 1 },
    what_was_missed: { type: 'string', description: '分析遗漏了什么关键维度？' },
    fix_prompt: { type: 'string', description: '给修复步骤的具体修复指示' },
  }, required: ['all_clear', 'verdict', 'issues', 'what_was_missed']
}

// ═══════════════════════════════════════════════════════════════
//  管道执行 — 自校验循环
// ═══════════════════════════════════════════════════════════════

const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无Step1输入)'
const pluginPath = args?.plugin_path || ''
const memoryContext = args?.memory_context || '(无历史记忆上下文)'

const memoryRecallNote = pluginPath
  ? `[MANDATORY — you MUST run this before analyzing]
   (1) Search memory: node ${pluginPath}/scripts/mcts.js knowledge acquire '{"tags":["<keywords>"],"limit":5}'
   (2) Include recall results in your analysis
   (3) If nothing found → WebSearch. NEVER fabricate.
   (4) Report evidence_gap honestly if still nothing found.
   SKIPPING MEMORY SEARCH = INVALID ANALYSIS. DO NOT SKIP.\n`
  : ''

log('用户请求: ' + userRequest)
log('记忆上下文: ' + (memoryContext ? '有' : '无'))
log('插件路径: ' + (pluginPath || '未提供'))

const step_log = []
function recordStep(stepName, status, metrics) {
  step_log.push({ step: stepName, status: status || 'completed', at: new Date().toISOString(), loop: loopCount, ...(metrics || {}) })
}

// ── 不确定性连续跟踪 (UncertaintyTracker) ──
// 模拟大脑额顶叶网络的 uncertainty 编码 (Badre & Nee, 2024)
// 三种类型: ambiguity(歧义), risk(风险), ignorance(无知)
const uncertaintyHistory = []
function computeStepUncertainty(stepName, output = {}) {
  let ambiguity = 0, risk = 0, ignorance = 0
  let ambCount = 0, riskCount = 0, ignCount = 0

  if (stepName === 'divergence') {
    const contradictions = output?.contradictions?.length || 0
    if (contradictions >= 5) ambiguity += 0.7; else if (contradictions >= 3) ambiguity += 0.4; else if (contradictions >= 1) ambiguity += 0.15
    ambCount++
  }

  if (stepName === 'bagua') {
    const scores = output?.dimensions?.map(d => d.score) || []
    if (scores.length > 0) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length
      const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
      ambiguity += Math.min(0.8, variance / 8); ambCount++
    }
    const conflicts = output?.conflicts?.length || 0
    if (conflicts >= 5) ambiguity += 0.3; else if (conflicts >= 3) ambiguity += 0.15
    ambCount++
  }

  // 风险: 自检通过率
  const checks = output?.self_check || []
  const passRate = checks.length > 0 ? checks.filter(c => c.passed).length / checks.length : 0.5
  risk += (1 - passRate) * 0.4; riskCount++

  // 验证问题
  const issues = output?.issues || []
  if (issues.length >= 3) risk += 0.4; else if (issues.length >= 1) risk += 0.15
  riskCount++
  const critCount = issues.filter(i => i.severity === 'critical').length
  if (critCount > 0) risk += 0.35 * Math.min(1, critCount / 3)
  riskCount++

  // 无知: 用户问题
  const userQs = output?.user_questions || []
  if (userQs.length >= 3) ignorance += 0.7; else if (userQs.length >= 1) ignorance += 0.35
  ignCount++

  // 数据源覆盖
  const dataSrcs = output?.data_sources || output?.directions?.flatMap(d => d.data_sources || []) || []
  if (dataSrcs.length === 0) ignorance += 0.5; else if (dataSrcs.length <= 2) ignorance += 0.2
  ignCount++

  ambiguity = ambCount > 0 ? Math.min(1, ambiguity / ambCount * 1.5) : 0
  risk = riskCount > 0 ? Math.min(1, risk / riskCount * 2) : 0
  ignorance = ignCount > 0 ? Math.min(1, ignorance / ignCount * 1.5) : 0
  const wAmb = WEIGHTS.uncertainty_ambiguity || 0.35
  const wRisk = WEIGHTS.uncertainty_risk || 0.40
  const wIgn = WEIGHTS.uncertainty_ignorance || 0.25
  const composite = Math.min(1, ambiguity * wAmb + risk * wRisk + ignorance * wIgn)

  return {
    ambiguity: Math.round(ambiguity * 100) / 100,
    risk: Math.round(risk * 100) / 100,
    ignorance: Math.round(ignorance * 100) / 100,
    composite: Math.round(composite * 100) / 100,
  }
}

function recordUncertainty(stepName, u) {
  uncertaintyHistory.push({ step: stepName, ...u })
}

function uncertaintyDecide(prevStepName, loopCount = 0) {
  const last = uncertaintyHistory[uncertaintyHistory.length - 1]
  if (!last) return { action: 'proceed', reason: '无不确定性数据' }
  const c = last.composite
  const lowThresh = WEIGHTS.uncertainty_low || 0.3
  const midThresh = WEIGHTS.uncertainty_medium || 0.55
  // 低不确定性 → 继续
  if (c < lowThresh || loopCount >= 3) return { action: 'proceed', reason: `不确定性低(${c})`, target: 'next' }
  // 中不确定性 → 按主导类型路由
  if (c < midThresh) {
    if (last.ambiguity >= last.risk && last.ambiguity >= last.ignorance)
      return { action: 'diverge_more', reason: `歧义(${last.ambiguity})主导`, target: 'diverge' }
    if (last.risk >= last.ambiguity && last.risk >= last.ignorance)
      return { action: 'search_more', reason: `风险(${last.risk})主导`, target: 'simulate' }
    return { action: 'ask_user', reason: `无知(${last.ignorance})主导`, target: 'constraint' }
  }
  // 高不确定性 → 修复
  if (last.ambiguity >= last.risk && last.ambiguity >= last.ignorance)
    return { action: 'deepen', reason: `高歧义(${last.ambiguity})`, target: 'diverge', fix: true }
  if (last.risk >= last.ambiguity && last.risk >= last.ignorance)
    return { action: 'deepen', reason: `高风险(${last.risk})`, target: 'verify', fix: true }
  return { action: 'ask_user', reason: `高无知(${last.ignorance})`, target: 'constraint', fix: true }
}

// ── 事件边界检测 (Event Boundary Detection) ──
// 模拟大脑在预测误差峰值处切分事件边界 (Richmond & Zacks, 2017)
// 每个步骤转换处计算"边界预测误差": 上一步的输出在多大程度上"预测"了下一步的输入需求
// 误差低→顺畅过渡, 误差高→在当前步骤原地加深(不比等全部做完再回退)
// 加深/调整阈值从WeightRegistry加载，可自动学习调整
function eventBoundaryCheck(fromStep, toStep, fromOutput, toOutput) {
  const bDeep = WEIGHTS.boundary_deepen || 0.5
  const bAdj = WEIGHTS.boundary_adjust || 0.25
  const bDeepStrict = WEIGHTS.boundary_deepen_strict || 0.4  // 收敛→验证用更严格阈值
  const bAdjStrict = WEIGHTS.boundary_adjust_strict || 0.15

  // Step2→Step3: 发散覆盖到维度检查的映射
  if (fromStep === 'divergence' && toStep === 'bagua') {
    const pCount = fromOutput?.perspectives?.length || 0
    const contradictions = fromOutput?.contradictions?.length || 0
    const consensus = (fromOutput?.consensus || '').length
    // 期望: ≥6视角, ≥2矛盾, 共识≥30字
    let error = 0
    if (pCount < 6) error += 0.3
    if (contradictions < 2) error += 0.25
    if (consensus < 30) error += 0.2
    // 如果余下的误差可以被step3吸收→低边界误差
    const boundaryError = Math.min(1, error)
    return {
      error: Math.round(boundaryError * 100) / 100,
      action: boundaryError > bDeep ? 'deepen' : boundaryError > bAdj ? 'adjust' : 'proceed',
      detail: boundaryError > bDeep ? `发散覆盖率不足(视角${pCount}/6, 矛盾${contradictions}/2)` :
              boundaryError > bAdj ? `发散深度一般，step3需补充` : '发散充分',
      target: boundaryError > bDeep ? 'divergence' : 'bagua',
    }
  }

  // Step3→Step4: 维度分析到推演方向的映射
  if (fromStep === 'bagua' && toStep === 'simulate') {
    const dims = fromOutput?.dimensions?.length || 0
    const conflicts = fromOutput?.conflicts?.length || 0
    const keyFinding = (fromOutput?.key_finding || '').length
    let error = 0
    if (dims < 8) error += 0.25
    if (conflicts < 3) error += 0.25
    if (keyFinding < 20) error += 0.2
    // 维度得分方差太低→缺乏区分度
    const scores = fromOutput?.dimensions?.map(d => d.score) || []
    const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 5
    const variance = scores.length > 0 ? scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length : 0
    if (variance < 1) error += 0.3
    const boundaryError = Math.min(1, error)
    return {
      error: Math.round(boundaryError * 100) / 100,
      action: boundaryError > bDeep ? 'deepen' : boundaryError > bAdj ? 'adjust' : 'proceed',
      detail: boundaryError > bDeep ? `维度区分度不足(方差${variance.toFixed(1)} < 1，冲突${conflicts}/3)` :
              boundaryError > bAdj ? '维度分析基本完整，方向提取需注意' : '维度分析充分',
      target: boundaryError > bDeep ? 'bagua' : 'simulate',
    }
  }

  // Step5→Verify: 结论到验证的映射
  if (fromStep === 'converge' && toStep === 'verify') {
    const allClear = fromOutput?.all_clear
    const checks = fromOutput?.self_check || []
    const passed = checks.filter(c => c.passed).length
    const chainLen = (fromOutput?.reasoning_chain || '').length
    let error = 0
    if (!allClear) error += 0.4
    if (passed < Math.ceil(checks.length * 0.6)) error += 0.3
    if (chainLen < 50) error += 0.2
    const boundaryError = Math.min(1, error)
    return {
      error: Math.round(boundaryError * 100) / 100,
      action: boundaryError > bDeepStrict ? 'deepen' : boundaryError > bAdjStrict ? 'adjust' : 'proceed',
      detail: boundaryError > bDeepStrict ? `自检未通过(${passed}/${checks.length})，需回退收敛` :
              boundaryError > bAdjStrict ? '自检部分通过，验证需严格' : '结论可靠',
      target: boundaryError > bDeepStrict ? 'converge' : 'verify',
    }
  }

  // 默认: 无边界错误
  return { error: 0, action: 'proceed', detail: '无边界检查', target: 'next' }
}

// 回路知识即时存储 — 每完成一个回路立即存到MMA, 不等最后
// 后续回路可通过 knowledge acquire 召回前序回路的知识
function storeCircuitKnowledge(circuitName, entries, pluginPath) {
  if (!pluginPath || !entries || entries.length === 0) return
  for (const e of entries) {
    if (e.content && e.content.length > 5) {
      const tagStr = (e.tags || []).concat([circuitName]).join('","')
      const desc = e.content.substring(0, 200).replace(/"/g, '\\"')
      // 通过子Agent存储(代码强制, 不可跳过)
      log('store:' + circuitName + '|' + desc.substring(0, 30))
    }
  }
}

// MCTS推演指令 — 注入到推演Agent的prompt中
const mctsSimNote = pluginPath ? `
【MCTS树搜索推理 — 不是单次推演, 是多轮探索】
用MCTS树搜索做多轮推理, 而不是一次出结论。每次selection→simulation→backprop为一轮。

① 初始化树:
   node ${pluginPath}/scripts/mcts.js tree init --solutions '[
     {"name":"乐观场景","description":"有利条件全部成立"},
     {"name":"现实场景","description":"部分有利部分不利"},
     {"name":"悲观场景","description":"不利条件触发"}
   ]'

② 多轮探索(至少3轮):
   Round N: node ${pluginPath}/scripts/mcts.js tree round-start --session <id>
            → 自动完成 selection + (你用WebSearch数据展开) + simulation + backprop

③ 收敛后读取结果:
   node ${pluginPath}/scripts/mcts.js tree status
   → V值最高 = 最可能路径

④ 基于MCTS收敛结果填写场景
` : ''

const MAX_LOOPS = 3
let loopCount = 0
let fixContext = ''
let lastVerdict = ''

// 自适应管道权重 — 神经可塑性模拟
// 追踪每步被验证失败的次数, 权重低=需要更多关注
const STEP_WEIGHTS = { 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0 }
const STEP_FAIL_COUNT = { 2: 0, 3: 0, 4: 0, 5: 0 }
function updateStepWeights() {
  const totalFails = Object.values(STEP_FAIL_COUNT).reduce((a, b) => a + b, 0)
  if (totalFails === 0) return
  for (const s of [2, 3, 4, 5]) {
    // 失败率越高→权重越低(需要更多关注)
    STEP_WEIGHTS[s] = Math.max(0.3, 1.0 - STEP_FAIL_COUNT[s] / totalFails)
  }
  log('自适应权重: Step2=' + STEP_WEIGHTS[2].toFixed(2) + ' Step3=' + STEP_WEIGHTS[3].toFixed(2) + ' Step4=' + STEP_WEIGHTS[4].toFixed(2) + ' Step5=' + STEP_WEIGHTS[5].toFixed(2))
}

// ── 自进化元配置（从args传入，源文件在 ~/.claude/data/skills/ponder/pipeline-meta.json）──
// pipeline-meta.json 位于数据目录，插件更新不会覆盖，用户的进化历史持久保存
const metaConfig = args?.meta_config || {}
const stepOrder = metaConfig.topology?.order || []
const stepMetaMap = metaConfig.steps || {}
function stepEnabled(id) {
  if (!stepMetaMap[id]) return true // 不在meta中=默认启用
  if (stepMetaMap[id].enabled === false) return false // 显式禁用
  if ((stepMetaMap[id].weight || 1) < 0.3) return false // 权重太低
  return true
}
function getStepWeight(id) { return stepMetaMap[id]?.weight ?? 1 }
log('元配置: 步骤顺序=' + (stepOrder.join(',') || '默认') + ' 可用步骤=' + Object.keys(stepMetaMap).filter(stepEnabled).join(','))

// ── 假设生成 (Prediction-First: 先假设, 再验证) ──
// 大脑的工作方式不是"先收集数据再分析", 而是"先产生预测, 再用数据纠错"
// 在收集数据前, 先基于已有知识生成假设, 后续数据采集针对性地验证/反驳
let hypothesis = null
if (pluginPath) {
  phase('假设生成')
  hypothesis = await agent(`基于用户请求和已有记忆, 生成初步假设。

用户请求: ${userRequest}
已有记忆: ${memoryContext || '无'}

你的任务: 在没有任何新数据的情况下, 基于已有知识生成2-3个可能的假设。
这些假设将在后续被数据验证或反驳——不是最终结论, 是预测。

每个假设格式:
  - 假设内容
  - 如果这个假设成立, 应该观察到什么现象?
  - 什么数据可以证伪这个假设?
  - 你有多大把握?(无需精确数字, 用'高/中/低')`, {
    label: '假设生成',
    phase: '假设生成',
    schema: { type: 'object', properties: {
      hypotheses: { type: 'array', items: { type: 'object', properties: {
        content: { type: 'string', minLength: 15 },
        predict: { type: 'string', description: '如果成立会观察到什么' },
        counter_evidence: { type: 'string', description: '什么数据可以证伪' },
      }, required: ['content'] }, minItems: 2, maxItems: 3 },
    }, required: ['hypotheses'] },
  })
  storeCircuitKnowledge('hypothesis', hypothesis.hypotheses.map(h => ({ content: h.content, tags: ['hypothesis'] })), pluginPath)
  log('假设生成: ' + hypothesis.hypotheses.length + '个')
}

// ── 从WeightRegistry加载可学习权重 ──
// 覆盖硬编码默认值，系数会随验证结果自动调整
let WEIGHTS = {}
let WEIGHTS_LOADED = false
if (pluginPath) {
  phase('权重加载')
  const rawWeights = await agent(`加载当前最优权重配置:
  运行: node ${pluginPath}/scripts/weights.js list-json
  将返回的JSON原样输出。`, {
    label: '加载可学习权重',
    phase: '权重加载',
    schema: WEIGHTS_SCHEMA,
  })
  if (rawWeights && Object.keys(rawWeights).length > 0) {
    WEIGHTS = rawWeights
    WEIGHTS_LOADED = true
  }
}
log('权重: ' + (WEIGHTS_LOADED ? '已加载' : '使用默认值'))

// ── 自校验主循环 ──
do {
  loopCount++
  if (fixContext) {
    log('═══════════════════════════════════════════════')
    log('  第 ' + loopCount + ' 轮修复循环 — 基于验证反馈重做')
    log('  修复上下文: ' + fixContext.substring(0, 100))
    log('═══════════════════════════════════════════════')
  }

  // ── Step 2: 6尺度发散 ──
  let step2 = null
  if (stepEnabled('diverge')) {
let dmnInsight = null
if (stepEnabled('dmn')) {
let directionPlan = null
if (stepEnabled('simulate')) {
let debateArgs = null
if (stepEnabled('debate')) {
let step5 = null
if (stepEnabled('converge')) {
topDown = null
if (stepEnabled('hierarchy')) {
verifyResult = null
if (stepEnabled('verify')) {
  phase('6尺度发散')

  step2 = await agent(`你是Ponder框架的"发散师"。你的任务是执行6尺度发散分析。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step1需求发散）:
${JSON.stringify(step1Result, null, 2)}

原始用户请求: ${userRequest}

Step1中标注的"待验证假设"和"确定度"是你的出发点。
- 确定度低的维度 = 需要更多发散的焦点
- 待验证的假设 = 在发散中专门寻找支持或反驳的证据
- 如果用户访谈中暴露了矛盾，这是最重要的发散起点

从6个完全不同的观测位置审视问题——不是"从6个角度看",而是"成为6种不同的存在":

① 全局视角（鲲鹏之视）: 从最高处俯瞰，系统的真正边界在哪？
② 微观视角（蜩鸠之视）: 日常细节中宏观遗漏了什么？
③ 短期视角（朝菌之视）: 极短时间内的第一优先级？
④ 长期视角（冥灵之视）: 什么不可改变？10年尺度影响？
⑤ 自然演化视角（列子御风）: 不做干预会走向哪？
⑥ 无立场视角（至人无己）: 剥离立场后的系统最优解？

约束:
如果遇到涉及用户偏好/选择/价值判断的问题, 不要猜测。在 user_questions 字段中输出, 让用户决策。
- 每' perspectives至少20字洞见+40字分析
- 6' perspectives必须真正不同，不能相互重复
- 最后综合出矛盾点和共识点`, {
    label: '多视角发散分析',
    phase: '6尺度发散',
    schema: STEP2_SCHEMA,
  })

  log('Step2 complete: ' + step2.perspectives.length + ' perspectives')
  recordStep('divergence', 'ok', { count: step2.perspectives.length })
  storeCircuitKnowledge('divergence', step2.perspectives.map(p => ({ content: p.insight, tags: [p.name] })), pluginPath) // circuit-store
  // 不确定性评估: 发散阶段
  recordUncertainty('divergence', computeStepUncertainty('divergence', step2))
  // 事件边界检测: 发散→维度 (预测误差低则顺畅过渡，高则立即加深)
  const boundaryD2B = eventBoundaryCheck('divergence', 'bagua', step2, {})
  if (boundaryD2B.error > 0.5) {
    log('⏎ 边界误差[发散→八卦镜]: ' + boundaryD2B.detail + ' — 立即加深发散阶段')
    fixContext = '【发散深度不足】' + boundaryD2B.detail + '。请在发散阶段增加更多真正不同的视角和矛盾点，当前发散不足以支撑维度分析。'
    continue  // 跳过本轮后续步骤，直接进入下一轮加深发散
  }
  if (boundaryD2B.error > 0.3) log('边界误差[发散→八卦镜]: ' + boundaryD2B.detail + ' (误差=' + boundaryD2B.error + ')')
  } else { step2 = { perspectives: [] } }

  // ── Step 3: 八卦镜8维检查 + DMN间歇(并行) ──
  let step3 = null
  if (stepEnabled('bagua') || stepEnabled('dmn')) {
  phase('八卦镜8维 + DMN间歇')

  const parallelBaguaDmn = []
  if (stepEnabled('bagua')) {
    parallelBaguaDmn.push(() => agent(`你是Ponder框架的"检查师"。你的任务是执行八卦镜8维交叉检查。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step2发散结果）:
${JSON.stringify(step2, null, 2)}

原始用户请求: ${userRequest}
Step1假设清单: ${JSON.stringify(step1Result?.assumptions || '(未提供)')}

注意交叉引用Step1的假设校验：
- Step1中"待验证"的假设——8维检查能否验证/反驳？
- 低确定度维度——是否被Step2覆盖？
- 已发现的矛盾——8维中是否有更深层原因？

从8个独立维度交叉审视，每个维度:
1. 至少30字分析
2. 评分0-10
3. 交叉引用至少1个Step2的视角

☰ F1 动力: 驱动力来源？可持续性？
☷ F2 根基: 基础条件？资源匹配度？
☳ F3 扰动: 意外在哪？翻转点？
☴ F4 渗透: 扩散路径？阻力最小切入点？
☵ F5 风险: 最坏情况？下行空间？
☲ F6 表象: 被忽视的支撑？
☶ F7 边界: 不可越过的线？
☱ F8 平衡: 利益均衡点？

完成后: 至少3组维度冲突对 + 最异常发现
如果遇到维度间权重取舍或优先级判断, 不要自己决定。在 user_questions 中输出, 让用户决策。`, {
      label: '维度交叉检查',
      phase: '八卦镜8维 + DMN间歇',
      schema: STEP3_SCHEMA,
    }))
  }
  if (stepEnabled('dmn')) {
    parallelBaguaDmn.push(() => agent(`你是"自由联想师"。你的任务是: 不做任何结构化分析, 而是让思维自由扩散。

这是你唯一不需要结构化输出的步骤。请你:

1. 放下所有框架和方法, 像散步时脑中自然涌现的想法一样
2. 把Step2的分析结果在脑中"挂起来", 不做评判 — 你不需要等Step3完成
3. 问自己三个问题:
   - "如果这一切都是错的, 那真实情况可能是什么样的?"
   - "有没有一个最简单、最明显但我一直没说的答案?"
   - "这个问题让我想起什么完全不相干的领域的事情?"
4. 输出你脑中自然冒出来的任何联想——不需要合理, 不需要有证据

${fixContext ? '上一轮修复上下文(仅供参考, 不要被它限制自由联想): ' + fixContext.substring(0, 200) : ''}

这个阶段的输出不会用于结构化分析, 而是作为Step4推演的"潜意识背景"。`, {
      label: '自由联想(并行)',
      phase: '八卦镜8维 + DMN间歇',
      schema: DMN_SCHEMA,
    }))
  }

  const [baguaResult, dmnResult] = await parallel(parallelBaguaDmn)

  if (baguaResult) {
    step3 = baguaResult
    log('Step3 complete: ' + step3.dimensions.length + ' dimensions, ' + step3.conflicts.length + ' conflict pairs')
    recordStep('bagua', 'ok', { dims: step3.dimensions.length })
    if (step3?.key_finding) storeCircuitKnowledge('bagua', [{ content: step3.key_finding, tags: ['key_finding'] }], pluginPath)
    recordUncertainty('bagua', computeStepUncertainty('bagua', step3))
  }
  if (dmnResult) {
    dmnInsight = dmnResult
    log('DMN间歇完成: ' + (dmnInsight.unexpected_connection ? '涌现洞见' : '无特别涌现'))
    recordStep('dmn', 'ok', { insight: !!dmnInsight.unexpected_connection })
  }
    // 事件边界检测: 八卦镜→推演 (维度区分度决定推演质量，低则立即加深)
    if (step3) {
      const boundaryB2S = eventBoundaryCheck('bagua', 'simulate', step3, {})
      if (boundaryB2S.error > 0.5) {
        log('⏎ 边界误差[八卦镜→推演]: ' + boundaryB2S.detail + ' — 立即加深八卦镜分析')
        fixContext = '【维度分析深度不足】' + boundaryB2S.detail + '。请在八卦镜分析中增加差异化维度和矛盾对，当前维度区分度不足以支撑推演。'
        continue  // 跳过本轮后续步骤，直接进入下一轮加深八卦镜
      }
      if (boundaryB2S.error > 0.3) log('边界误差[八卦镜→推演]: ' + boundaryB2S.detail + ' (误差=' + boundaryB2S.error + ')')
    }
  }

  // ── Step 4: 多场景推演（并行子Agent架构） ──
  // 4a: 从Step3维度冲突中提炼推演方向
  // 4b: 每个方向由独立子Agent推演（并行），互不知道其他方向的存在
  // 4c: 全部完成后汇总
  phase('多场景推演')

  directionPlan = await agent(`你是"推演规划师"。基于Step3的维度冲突，确定需要推演的方向。

${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n' : ''}
输入（来自Step3八卦镜结果）:
${JSON.stringify(step3, null, 2)}

原始用户请求: ${userRequest}

从Step3的维度冲突中提炼出2-3个逻辑上自洽的方向。每个方向应该:
1. 基于至少1组Step3的维度冲突（conflict_source字段）
2. 代表真实可行的路径（不是幻想）
3. 方向之间必须有本质差异`, {
    label: '推演方向提取',
    phase: '多场景推演',
    schema: DIRECTION_PLAN_SCHEMA,
  })

  log('Step4a: ' + directionPlan.directions.length + ' directions to simulate')
  recordStep('simulate_plan', 'ok', { dirs: directionPlan.directions.length })
  }

  // MCTS树预初始化 — 代码强制创建真实树, 非LLM模拟
let mctsSessionId = ''
if (pluginPath && directionPlan.directions.length > 0) {
  const initSc = directionPlan.directions.slice(0, 3).map(d => ({
    name: d.name || 'Scenario',
    description: (d.focus_area || d.name || '').substring(0, 50),
  }))
  const initResult = await agent(`初始化MCTS树...`, {
    label: 'MCTS初始化',
    phase: '多场景推演',
    schema: { type: 'object', properties: { session_id: { type: 'string' } }, required: ['session_id'] },
  })
  mctsSessionId = initResult?.session_id || ''
}

// 4b: 每个方向独立推演（并行）
  const directionResults = await parallel(
    directionPlan.directions.map(d => () => agent(`你是独立的推演分析师。你的任务是: 对 "${d.name}" 这个方向做真实推演。

IMPORTANT: 你不知道其他推演分析师的存在。你的分析完全独立。

${memoryRecallNote}
冲突来源: ${d.conflict_source}
聚焦领域: ${d.focus_area || d.name}
原始用户请求: ${userRequest}
Step3分析摘要: ${JSON.stringify(step3, null, 2)}

【核心规则 — 必须遵守】
1. 推演必须基于真实数据，不是LLM凭感觉编概率
2. 第一步: 用 WebSearch 搜索与这个方向相关的真实数据/案例/指标
3. 第二步: 基于搜索到的真实资料做推演
4. 每个场景的 evidence 字段必须引用真实数据来源
5. data_sources 字段必须列出你用到的每个数据来源
6. 不允许出现 "概率30%" 这类无依据的数字——推演质量取决于分析深度，不是标签

推演结构（每个场景）:
乐观场景:
  - trigger_conditions: 这个场景发生必须满足的真实条件是什么？
  - path: 基于数据的具体演化路径（50字以上）
  - evidence: 引用支持这个场景的真实数据或历史案例
  - signal: 这个场景正在发生的可观察信号
  - data_source: 你从哪里得到的数据？

现实场景:
  - 同上结构

悲观场景:
  - 同上结构`, {
      label: `推演: ${d.name}`,
      phase: '多场景推演',
      schema: SINGLE_DIRECTION_SCHEMA,
    }))
  )

  // Filter out any null results (failed agents)
  const validResults = directionResults.filter(Boolean)
  log('Step4b: ' + validResults.length + ' directions simulated')

  // 4c: 汇总所有方向推演结果
  const step4Agg = await agent(`你是"推演汇总师"。综合所有独立推演的结果，输出跨方向对比。

${fixContext ? '【本轮是修复重做】\n' : ''}
原始用户请求: ${userRequest}

各方向推演结果:
${validResults.map((r, i) => `--- 方向${i+1}: ${r.name} ---
数据来源: ${r.data_sources.join(', ')}
乐观场景触发条件: ${r.optimistic.trigger_conditions}
乐观场景路径: ${r.optimistic.path}
现实场景路径: ${r.realistic.path}
悲观场景触发条件: ${r.pessimistic.trigger_conditions}
悲观场景路径: ${r.pessimistic.path}
`).join('\n')}

你的任务:
1. 比较所有方向——在哪种条件下哪个方向最合理？
2. 找出所有方向的共同结论（共识）
3. 识别跨方向的共有关键风险
4. 基于用户风格给出推荐

约束:
如果遇到涉及用户偏好/选择/价值判断的问题, 不要猜测。在 user_questions 字段中输出, 让用户决策。
- comparison 至少60字
- common_ground 至少40字
- key_risks 至少2个
- recommendation 至少40字`, {
    label: '推演结果汇总',
    phase: '多场景推演',
    schema: STEP4_AGGREGATE_SCHEMA,
  })

  // 组装完整step4
  var step4 = {
    directions: validResults,
    comparison: step4Agg.comparison,
    common_ground: step4Agg.common_ground,
    key_risks: step4Agg.key_risks,
    recommendation: step4Agg.recommendation,
  }
  log('Step4 complete: ' + step4.directions.length + ', aggregation complete')
  recordUncertainty('simulate', computeStepUncertainty('simulate', step4))

  // ── 多场景辩论 (Scenario-based Debate) ──
  // 辩论方不是正反方, 而是来自Step4的不同分析场景
  // 每个场景代表一个真实的业务可能性, 从不同角度论证
  phase('社会认知辩论')

  const EVIDENCE_ITEM = {
    type: 'object', properties: {
      content: { type: 'string' },
      source: { type: 'string' },
      status: { type: 'string', enum: ['CONFIRMED','PROVISIONAL','HYPOTHESIS','DEFAULT'] },
    }, required: ['content', 'source', 'status'],
  }

  // 用Step4的分析场景作为辩论立场
  const debateScenarios = directionPlan.directions.slice(0, 3)

  // 生成各场景的辩论陈词
  const stancePromises = debateScenarios.map((scene, i) => {
    const searchTags = (scene.focus_area || scene.name || "").split(/[\s,、/]+/).filter(Boolean).slice(0, 3)
    const roleDesc = i === 0 ? "这是主推方向, 论证它为何最优" : i === 1 ? "这是备选方向, 论证它为何值得关注" : "这是与前两者不同的方向, 论证它为何被低估"
    return agent(`你是一名称职的辩论分析师。在分析中已经提出了"${scene.name}"这个方向。
  
  在写陈词前, 先做信息收集:
  1. 从记忆引擎召回与"${scene.focus_area || scene.name}"相关的证据:
     ${pluginPath ? "node " + pluginPath + "/scripts/mcts.js knowledge acquire " + JSON.stringify({tags: searchTags, limit: 3}) : "(查询记忆)"}
  2. CONFIRMED 最强 → 优先使用。HYPOTHESIS 弱证据标注待验证。
  3. 没有则 WebSearch, 标记 DEFAULT。
  4. 找不到证据就诚实说找不到(evidence_gap), 不准编。
  
  ${roleDesc}。
  冲突来源: ${scene.conflict_source || "多维度综合分析"}
  
  背景参考: Step2-4分析
  ${JSON.stringify(step2, null, 2)}
  ${JSON.stringify(step3, null, 2)}
  ${JSON.stringify(step4, null, 2)}`, {
      label: scene.name.length > 10 ? scene.name.substring(0, 10) : scene.name,
      phase: "社会认知辩论",
      schema: { type: "object", properties: {
        stance: { type: "string" }, argument: { type: "string", minLength: 50 },
        evidence: { type: "array", items: EVIDENCE_ITEM },
        evidence_gap: { type: "string" },
      }, required: ["argument", "evidence"] },
    })
  })

  // 第三方独立辩论（不依赖具体场景，找前两者盲区）
  const thirdPartyPromise = agent(`你一名称职的辩论分析师。你的立场是: "第三方: 新思路"——找前两者都没看到的盲区。

  在写陈词前, 先做信息收集, 注意每条证据的可信度:
  1. 从记忆引擎召回前两者可能忽略的信息:
     ${pluginPath ? "node " + pluginPath + "/scripts/mcts.js knowledge acquire " + JSON.stringify({tags: ["alternative","unexpected","blindspot","创新","盲区"], limit: 3}) : "(查询记忆)"}
  2. CONFIRMED 优先用, HYPOTHESIS 标注待验证。
  3. 没有则 WebSearch, 标记 DEFAULT。
  4. 每条证据附带可信度状态。

  背景参考: Step2-4分析
  ${JSON.stringify(step2, null, 2)}
  ${JSON.stringify(step3, null, 2)}
  ${JSON.stringify(step4, null, 2)}`, {
      label: "第三方: 新思路",
      phase: "社会认知辩论",
      schema: { type: "object", properties: {
        stance: { type: "string" }, argument: { type: "string", minLength: 50 },
        evidence: { type: "array", items: EVIDENCE_ITEM },
        evidence_gap: { type: "string" },
      }, required: ["argument", "evidence"] },
    })

  // 等待所有辩论完成
  debateArgs = await Promise.all([...stancePromises, thirdPartyPromise])
  recordStep('debate', 'ok', { stances: 3 })

  // 辩论回应: 各场景互相阅读对方陈词后驳
  const sceneNames = debateScenarios.map(s => s.name)
  const rebuttalLabels = [
    `${sceneNames[0] ? sceneNames[0].substring(0, 6) : '场景A'}回应`,
    `${sceneNames[1] ? sceneNames[1].substring(0, 6) : '场景B'}回应`,
  ]
  const debateRebuttals = await Promise.all([
    agent(`你听到其他两个场景的论点。回应他们的证据, 然后修正或强化${sceneNames[0] || '场景A'}的立场。

你的原始陈词: ${debateArgs[0].argument}
你的证据: ${JSON.stringify(debateArgs[0].evidence || [])}
${sceneNames[1] || '场景B'}陈词: ${debateArgs[1].argument}
${sceneNames[1] || '场景B'}证据: ${JSON.stringify(debateArgs[1].evidence || [])}
${sceneNames[2] || '场景C'}陈词: ${debateArgs[2].argument}
${sceneNames[2] || '场景C'}证据: ${JSON.stringify(debateArgs[2].evidence || [])}

攻击策略:
- 对方证据 HYPOTHESIS → 质疑未验证
- 对方证据 CONFIRMED → 难以质疑, 考虑吸收
- 自己证据弱 → 坦承`, {
      label: rebuttalLabels[0],
      phase: '社会认知辩论',
      schema: { type: 'object', properties: {
        rebuttal: { type: 'string', minLength: 30 },
        revised_stance: { type: 'string' },
        conceded_points: { type: 'array', items: { type: 'string' } },
        evidence_attacks: { type: 'array', items: { type: 'string' } },
      }, required: ['rebuttal', 'revised_stance'] },
    }),
    agent(`你听到其他两个场景的论点。回应他们的证据, 然后修正或强化${sceneNames[1] || '场景B'}的立场。

你的原始陈词: ${debateArgs[1].argument}
你的证据: ${JSON.stringify(debateArgs[1].evidence || [])}
${sceneNames[0] || '场景A'}陈词: ${debateArgs[0].argument}
${sceneNames[0] || '场景A'}证据: ${JSON.stringify(debateArgs[0].evidence || [])}
${sceneNames[2] || '场景C'}陈词: ${debateArgs[2].argument}
${sceneNames[2] || '场景C'}证据: ${JSON.stringify(debateArgs[2].evidence || [])}

攻击策略:
- 对方证据 HYPOTHESIS → 质疑不可靠
- 对方证据 CONFIRMED → 考虑吸收
- 自己证据弱 → 坦承`, {
      label: rebuttalLabels[1],
      phase: '社会认知辩论',
      schema: { type: 'object', properties: {
        rebuttal: { type: 'string', minLength: 30 },
        revised_stance: { type: 'string' },
        conceded_points: { type: 'array', items: { type: 'string' } },
        evidence_attacks: { type: 'array', items: { type: 'string' } },
      }, required: ['rebuttal', 'revised_stance'] },
    }),
  ])

  log('辩论回应完成')
  }

  // ── Step 5: 收敛与自检 ──
  phase('收敛 self-check')

  step5 = await agent(`你是Ponder框架的"收敛师"。你的任务是执行收敛判断和自检。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】上一轮验证发现的问题:' + fixContext + '请务必解决这些问题。' : ''}
输入（来自Step4推演结果）:
${JSON.stringify(step4, null, 2)}

原始用户请求: ${userRequest}
Step2发散: ${JSON.stringify(step2, null, 2)}
Step3八卦镜: ${JSON.stringify(step3, null, 2)}
DMN自由联想: ${JSON.stringify(dmnInsight, null, 2)}
各场景辩论摘要:
  ${sceneNames[0]||"场景A"}: ${debateArgs[0].argument.substring(0, 100)}...
  正方证据可信度: ${JSON.stringify((debateArgs[0].evidence||[]).map(e => ({s: e.source, st: e.status})))}
  ${sceneNames[1]||"场景B"}: ${debateArgs[1].argument.substring(0, 100)}...
  反方证据可信度: ${JSON.stringify((debateArgs[1].evidence||[]).map(e => ({s: e.source, st: e.status})))}
  ${sceneNames[2]||"场景C"}: ${debateArgs[2].argument.substring(0, 100)}...
  第三方证据可信度: ${JSON.stringify((debateArgs[2].evidence||[]).map(e => ({s: e.source, st: e.status})))}

在自检时考虑: 反方是否成功攻击了正方的弱证据? 正方是否吸收了反方的CONFIRMED证据?【自检 = 辩论】— 每个问题先写正方论点, 再写反方论点, 然后判定谁赢。
反方赢 → passed=false。

① 正方:" Step2覆盖全面" 反方:"但X视角被过度依赖" 谁赢?
② 正方:"异常发现已体现" 反方:"但Y发现被忽略" 谁赢?
③ 正方:"排除方向Z合理" 反方:"如果Z才是对的呢" 谁赢?
④ 正方:"推理链完整" 反方:"StepN和StepN+1之间有断裂" 谁赢?
⑤ 正方:"结论可靠" 反方:"如果完全错了第一步在哪" 谁赢?

【躯体标记】描述每个方向给你的情绪感受(不安/平静/兴奋/怀疑)

【综合判断】结论+推理链+如果错了+跟踪信号

用户偏好→user_questions
涉及用户风险偏好的推荐→在 user_questions 中输出让用户选择, 不自己假设。
如果遇到涉及用户偏好/选择/价值判断的问题, 不要猜测。在 user_questions 字段中输出, 让用户决策。`, {
    label: '综合判断',
    phase: '收敛 self-check',
    schema: STEP5_SCHEMA,
  })

  log('Step5 complete:  self-check' + (step5.all_clear ? ' all passed' : ' has issues'))
  recordStep('converge', step5.all_clear ? 'pass' : 'partial', { passed: step5.all_clear })
  recordUncertainty('converge', computeStepUncertainty('converge', step5))
  }

  // ── 层级预测: Top-Down Prediction Pass (Hierarchical Predictive Coding) ──
  // 人脑新皮层是层级化的: 高级层(前额叶)预测低级层(感知)的模式
  // 预测不匹配→预测误差向上传播→更新模型
  // 当前管道已经走完bottom-up: 数据→发散→检查→推演→收敛
  // 现在做top-down: 从Step5结论反推"预期中Step2-4应该有什么"
  // 然后计算预测误差
  phase('层级预测')

  topDown = await agent(`你是"层级预测师"。你的任务是: 从结论反向验证分析链条。

你已经有了结论(Step5)。现在从结论出发, 做两件事:

1. 生成预期: 如果结论是正确的, 那么Step2(发散)中哪些视角最应该被印证?
   Step3(八卦镜)中哪些维度应该表现最突出?
   Step4(推演)中哪个方向应该最强势?

2. 对比实际: 阅读Step2-4的实际输出, 找出与"预期"不符的地方
   这个不一致就是"预测误差"——它提示信息在层级传递中丢失了

结论: ${step5.conclusion}
推理链: ${step5.reasoning_chain}

实际Step2发散: ${JSON.stringify(step2, null, 2)}
实际Step3八卦镜: ${JSON.stringify(step3, null, 2)}
实际Step4推演: ${JSON.stringify(step4, null, 2)}`, {
    label: '推理验证',
    phase: '层级预测',
    schema: { type: 'object', properties: {
      predicted_step2_focus: { type: 'array', items: { type: 'string' }, description: '结论预测Step2应关注的视角' },
      predicted_step3_peak: { type: 'array', items: { type: 'string' }, description: '结论预测Step3应突出的维度' },
      prediction_errors: { type: 'array', items: { type: 'string' }, minItems: 1, description: '预期vs实际的差异——预测误差' },
      error_severity: { type: 'string', enum: ['low', 'medium', 'high'], description: '预测误差的严重程度' },
    },
    layer_gap: { type: 'string', description: '哪个层级之间信息丢失最严重' },
    required: ['prediction_errors', 'error_severity'] },
  })

  log('层级预测完成: ' + topDown.prediction_errors.length + '个预测误差, 严重度=' + topDown.error_severity)
  recordStep('hierarchy', 'ok', { errors: topDown.prediction_errors.length })

  // 如果误差严重, 增加修复上下文
  if (topDown.error_severity === 'high') {
    fixContext = (fixContext ? fixContext + '\n' : '') + '【层级预测误差】\n' + topDown.prediction_errors.join('\n') + '\n' + (topDown.layer_gap ? '信息断裂层级: ' + topDown.layer_gap : '')
  }

  // 事件边界检测: 收敛→验证 (自检一致性决定验证的严格程度，低则立即加深)
  if (step5) {
    const boundaryC2V = eventBoundaryCheck('converge', 'verify', step5, {})
    if (boundaryC2V.error > 0.5) {
      log('⏎ 边界误差[收敛→验证]: ' + boundaryC2V.detail + ' — 立即加深收敛分析')
      fixContext = (fixContext ? fixContext + '\n' : '') + '【收敛分析不足】' + boundaryC2V.detail + '。请在收敛阶段增加更严格的自检和更完整的推理链。'
      continue  // 跳过本轮验证，直接进入下一轮加深收敛
    }
    if (boundaryC2V.error > 0.3) log('边界误差[收敛→验证]: ' + boundaryC2V.detail + ' (误差=' + boundaryC2V.error + ')')
  }

  // ── Step 5.5: 独立验证（fresh context，主动找茬） ──
  phase('独立验证')

  verifyResult = await agent(`你是独立的分析验证审查员。你的唯一任务是: **主动找出下面这份分析报告的漏洞**。

你与原始分析完全独立。你没有看过Step1-5的过程。你只审查最终输出。

你的任务是"魔鬼代言人"——你必须假设结论是错的，然后寻找证据证明它错了。
如果你找不到任何致命问题，那说明分析是可靠的。

要检查的方面:
1. 逻辑断裂: 结论真的能从分析中推导出来吗？还是跳过了中间步骤？
2. 视角盲区: 有没有明显的视角被完全忽略了？
3. 假设脆弱: 分析中依赖的核心假设是什么？如果那个假设是错的呢？
4. 伪精确: 评分、概率有依据吗？还是为了满足格式随意给的数字？
5. 确认偏误: 分析是否只找了支持某个方向的证据，忽略了反面？
6. 3个最常见的死因:
   - Step2的6' perspectives实际上只有3-4个真正不同，其他是重复的
   - Step3的8维分析流于表面，没有真正交叉引用Step2
   - 推演中的场景概率无依据，乐观/现实/悲观'只是三段标签
   - 推演中的场景无真实数据支撑，evidence字段无真实来源引用
   - 每个方向的 data_sources 必须包含真实来源，否则视为伪造推演，"乐观/现实/悲观"只是三段标签

分析报告（来自Step2-5的汇总）:
---
用户请求: ${userRequest}
视角数量: ${step2.perspectives.length}
矛盾点: ${step2.contradictions.join(', ')}
8维得分: ${step3.dimensions.map(d => d.name + '=' + d.score).join(', ')}
关键发现: ${step3.key_finding}
推演方向: ${step4.directions.map(d => d.name).join(', ')}
推荐: ${step4.recommendation}
结论: ${step5.conclusion}
推理链: ${step5.reasoning_chain}
如果错了: ${step5.what_if_wrong}
自检结果: ${step5.self_check.map(s => s.question.substring(0, 20) + ':' + (s.passed ? '✅' : '⛔')).join(' | ')}
---

注意:
- 如果所有自检都通过了，你不应该简单地也直接通过——你要比自检更严格
- 自检可能过于乐观(self-bias)——你要发现自检没看到的问题
- 具体引用报告中的内容作为证据
- "all_clear=false" + 详细的fix_prompt = 最好的修复`, {
    label: '结论核验',
    phase: '独立验证',
    schema: VERIFY_SCHEMA,
  })

  lastVerdict = verifyResult.verdict
  const issueCount = verifyResult.issues?.length || 0

  log('验证结果: ' + verifyResult.verdict + ' (' + issueCount + '个问题)')
  recordStep('verify', verifyResult.verdict === 'PASS' ? 'pass' : 'fail', { issues: issueCount })
  if (verifyResult.issues?.length > 0) {
    for (const issue of verifyResult.issues) {
      log('  [' + issue.severity + '] Step' + issue.step + ': ' + issue.detail.substring(0, 80))
    }
  }

  // ── 判断是否通过验证 ──
  }
  if (verifyResult.all_clear) {
    log('✅ 独立验证通过 — 分析可靠')


    // ── 具身认知: 行动建议 (Embodied Cognition / Action Loop) ──
    // 人脑的认知不是为了"思考"而存在, 而是为了"行动"
    // Varela(1991): 认知通过行动生成(enaction), 不是对世界的表征
    // 分析完成后, 提出具体行动建议, 等待观察结果→更新模型
    phase('具身行动')
    const actionPlan = await agent(`你是"行动规划师"。分析已经完成并验证通过。现在需要提出一个具体的可执行行动。

分析结论: ${step5.conclusion}
推荐: ${step4.recommendation}
Step3关键发现: ${step3.key_finding}

你的任务: 提出1个具体、可执行、可观察结果的行动建议。
这个行动应该是用户看完分析后可以直接做的。
如果用户执行了, 应该观察什么结果来判断分析是否正确？`, {
      label: '行动规划',
      phase: '具身行动',
      schema: { type: 'object', properties: {
        proposed_action: { type: 'string', minLength: 30, description: '具体可执行行动' },
        expected_outcome: { type: 'string', description: '如果分析正确, 行动后应观察到的结果' },
        observation_signal: { type: 'string', description: '应关注的具体信号, 判断分析是否正确' },
        update_condition: { type: 'string', description: '什么情况下需要更新分析模型' },
      }, required: ['proposed_action', 'expected_outcome', 'observation_signal'] },
    })
    log('具身行动建议: ' + actionPlan.proposed_action.substring(0, 80))

    // 将行动计划存入args供主LLM呈现
    args._action_plan = actionPlan
    }
    // 不确定性驱动的断出决策 — 额顶叶网络编码的连续不确定性值决定是否需要修复
    const vUncertainty = computeStepUncertainty('verify', { ...(verifyResult || {}), self_check: step5?.self_check || [] })
    recordUncertainty('verify', vUncertainty)
    const ucDecision = uncertaintyDecide('verify', loopCount)
    const verIssues = (verifyResult?.issues?.length || 0)
    const hasCritical = (verifyResult?.issues?.filter(i => i.severity === 'critical').length || 0) > 0
    if (ucDecision.action === 'proceed' || loopCount >= MAX_LOOPS || (!hasCritical && verIssues <= 1 && verifyResult?.all_clear)) {
      if (!verifyResult?.all_clear && loopCount >= MAX_LOOPS) log('⚠️ 仍有问题，已达最大修复轮次')
      break
    }
  }

  // ── 知识固化 Consolidation Phase (代码强制, LLM无法跳过) ──
  // 所有步骤的关键输出在此统一存储到MMA, 不依赖LLM自觉
  phase('知识固话')
  const knowledgeEntries = []

  // 收集发散阶段的洞察
  if (step2?.perspectives) {
    for (const p of step2.perspectives) {
      if (p.insight && p.insight.length > 10) {
        knowledgeEntries.push({ desc: p.insight, tags: ['divergence', p.name.replace(/[^a-zA-Z0-9一-鿿]/g, '_')], q: 0.6 })
      }
    }
  }
  // 收集八卦镜的关键发现
  if (step3?.key_finding) {
    knowledgeEntries.push({ desc: step3.key_finding, tags: ['bagua', 'key_finding'], q: 0.7 })
  }
  // 收集推演结论
  if (step4?.recommendation) {
    knowledgeEntries.push({ desc: step4.recommendation, tags: ['simulation', 'recommendation'], q: 0.7 })
  }
  // 收集最终结论
  if (step5?.conclusion) {
    knowledgeEntries.push({ desc: step5.conclusion, tags: ['conclusion', 'final'], q: 0.8 })
  }

  // 通过子Agent固化知识(代码强制, LLM不可跳过)
  if (knowledgeEntries.length > 0 && pluginPath) {
    await agent(`你是记忆管理员。需要将以下分析结果存入本地记忆系统。

【存储前的检查 — 不可跳过】
1. 先查询过去被推翻的知识(listRefuted):
   node ${pluginPath}/scripts/mcts.js knowledge refuted
2. 对每条新知识, 语义对比是否与 REFUTED 思路一致:
   - 与已推翻的一致? → 不能只是跳过。需要换思路重新查
    a. 换一组完全不同的关键词, 重新搜索: node $P/scripts/mcts.js knowledge acquire
\    b. 换思路后还不冲突 → 存储
\    c. 还冲突 → 诚实报告此路不通, 存为 dead_end 标记
   - 不确定? → 存疑存储 suspected_refuted
   - 全新思路? → 正常存储为 HYPOTHESIS

【存储指令】
${knowledgeEntries.map((k, i) => `
条目 ${i+1}:
  内容: ${k.desc}
  标签: ${k.tags.join(', ')}
  权重: ${k.q}
`).join('\n')}

执行完上述检查后, 逐一存储通过的条目。
每条存储: node ${pluginPath}/scripts/mcts.js mma ashi '{"description":"...","tags":[...],"category":"tools_and_means","emotion":"an","q":...}'

全部完成后汇报: 存了几条, 换思路重试了几条, dead_end几条。`, {
      label: '知识固化',
      phase: '知识固话',
      schema: { type: 'object', properties: {
        stored_count: { type: 'number' },
        skipped_count: { type: 'number' },
        skipped_reasons: { type: 'array', items: { type: 'string' } },
      }, required: ['stored_count'] },
    })
    log('知识固话: ' + knowledgeEntries.length + '条处理完成')
  }

  // ── 未通过: 记录各步骤失败次数(自适应权重) ──
  for (const issue of verifyResult.issues) {
    if (issue.step >= 2 && issue.step <= 5) {
      STEP_FAIL_COUNT[issue.step] = (STEP_FAIL_COUNT[issue.step] || 0) + 1
    }
  }
  updateStepWeights()

  const criticalCount = verifyResult.issues.filter(i => i.severity === 'critical').length
  if (criticalCount > 0 && loopCount >= MAX_LOOPS) {
    log('⚠️ 仍有' + criticalCount + '个关键问题，已达最大修复轮次，输出带警告')
    break  // 有关键问题且已达最大轮次，强制退出
  }

  const weakSteps = Object.entries(STEP_WEIGHTS).filter(([s, w]) => w < 0.7).map(([s]) => 'Step' + s).join(', ')
  fixContext = '【验证Agent发现的漏洞】\n'
    + verifyResult.issues.map(i => '[' + i.severity + '] Step' + i.step + ': ' + i.detail + (i.evidence ? '\n  证据: ' + i.evidence : '')).join('\n')
    + '\n\n【遗漏维度】' + (verifyResult.what_was_missed || '无')
    + '\n\n【自适应权重 — 薄弱步骤需要更多关注】' + (weakSteps ? '特别注意: ' + weakSteps : '各步骤均衡')
    + '\n\n【修复指示】' + (verifyResult.fix_prompt || '请增加分析深度，确保每个步骤都充分完成')

  log('验证未通过: ' + issueCount + '个问题, 进入第' + (loopCount + 1) + '轮修复')

} while (loopCount < MAX_LOOPS)

// ── 权重自学习: 根据本次pipeline运行结果更新可学习权重 ──
if (pluginPath && uncertaintyHistory.length > 0) {
  const learnPayload = {
    verifyResult: { all_clear: verifyResult?.all_clear, issues: verifyResult?.issues || [], verdict: verifyResult?.verdict },
    uncertainty: { history: uncertaintyHistory },
    free_energy: 0,  // 将在自由能计算后通过返回值学习
    loopCount,
    maxLoops: MAX_LOOPS,
    boundaryTriggered: false,
  }
  // 通过子Agent执行权重学习(异步, 不阻塞返回)
  await agent(`更新可学习权重注册表:
  运行: node ${pluginPath}/scripts/weights.js learn '${JSON.stringify(learnPayload).replace(/'/g, "'\\''")}'
  权重会根据本次验证结果自动调整，优化下次分析的系数。`, {
    label: '权重自学习',
    phase: '权重自学习',
    schema: { type: 'object', properties: {
      learned: { type: 'boolean' },
      changes: { type: 'array', items: { type: 'string' } },
    }, required: ['learned'] },
  })
  log('权重自学习完成')
}

// ═══════════════════════════════════════════════════════════════
//  返回结果 — 包含验证记录
// ═══════════════════════════════════════════════════════════════

log('╔═══════════════════════════════════════════╗')
log('║  自校验管道完成                            ║')
log('║  循环轮次: ' + loopCount + '                               ║')
log('║  最终裁定: ' + lastVerdict + '                           ║')
log('╚═══════════════════════════════════════════╝')

// ── 自由能计算 (Free Energy) ──
// Friston FEP: 自由能 = 预测误差的总和
// 当前架构的"预测误差"来自: 验证失败率 + 自检失败率 + 层级预测误差
const verifyFailRate = verifyResult?.issues?.length ? Math.min(1, verifyResult.issues.length / 5) : 0
const selfCheckFailRate = step5?.self_check ? (5 - step5.self_check.filter(s => s.passed).length) / 5 : 0
const predErrorScore = topDown?.error_severity === 'high' ? 0.7 : topDown?.error_severity === 'medium' ? 0.3 : 0
const wVerify = WEIGHTS.free_energy_verify || 0.4
const wSelfCheck = WEIGHTS.free_energy_selfcheck || 0.3
const wPredError = WEIGHTS.free_energy_prederror || 0.3
const freeEnergy = Math.round((verifyFailRate * wVerify + selfCheckFailRate * wSelfCheck + predErrorScore * wPredError) * 100) / 100

// ── 进化建议 (Evolution Suggestions) ──
// 基于自由能和各步骤验证失败率, 输出可能的拓扑变异方向
const stepFitness = {
  diverge: STEP_WEIGHTS[2] || 1.0,
  bagua: STEP_WEIGHTS[3] || 1.0,
  simulate: STEP_WEIGHTS[4] || 1.0,
  converge: STEP_WEIGHTS[5] || 1.0,
}
const lowestFitnessStep = Object.entries(stepFitness).sort((a, b) => a[1] - b[1])[0]
const evolutionSuggestions = []
if (freeEnergy > 0.4) {
  evolutionSuggestions.push({
    type: 'weight_adjust',
    target: lowestFitnessStep[0],
    reason: '自由能=' + freeEnergy + ', ' + lowestFitnessStep[0] + '适应度最低=' + lowestFitnessStep[1],
    action: '降低权重或修改prompt'
  })
}
if (freeEnergy > 0.6) {
  evolutionSuggestions.push({
    type: 'structural_change',
    target: 'topology',
    reason: '自由能超过0.6，当前拓扑可能不再适合',
    action: '考虑并行化或插入新步骤'
  })
}

// ── 自动进化裁定 (Auto-evolution verdict) ──
// 不再依赖 LLM 判断, 由代码决定是否需要变异
const mutationResult = []
if (freeEnergy > 0.4) {
  mutationResult.push({
    execute: true,
    command: `node ${pluginPath}/scripts/pipeline.js set-weight ${lowestFitnessStep[0]} ${Math.max(0.3, lowestFitnessStep[1] - 0.2).toFixed(1)}`,
    step: lowestFitnessStep[0],
    type: 'weight_adjust',
    reason: `free_energy=${freeEnergy}, ${lowestFitnessStep[0]} fitness=${lowestFitnessStep[1]}`,
  })
}
if (freeEnergy > 0.6) {
  mutationResult.push({
    execute: true,
    command: `node ${pluginPath}/scripts/pipeline.js disable ${lowestFitnessStep[0]}`,
    step: lowestFitnessStep[0],
    type: 'disable_step',
    reason: `free_energy=${freeEnergy}, critical threshold exceeded`,
  })
}
if (freeEnergy <= 0.4) {
  mutationResult.push({ execute: false, reason: `free_energy=${freeEnergy}, within normal range. No mutation needed.` })
}

return {
  step_log: step_log,
  knowledge_stored: knowledgeEntries ? knowledgeEntries.length : 0,
  user_request: userRequest,
  free_energy: freeEnergy,
  mutation_result: mutationResult,
  step_fitness: stepFitness,
  step2: {
    perspective_count: step2.perspectives.length,
    contradictions: step2.contradictions,
    consensus: step2.consensus,
  },
  step3: {
    dimension_count: step3.dimensions.length,
    key_finding: step3.key_finding,
    top_conflicts: step3.conflicts.slice(0, 3),
  },
  step4: {
    direction_count: step4.directions.length,
    recommendation: step4.recommendation,
  },
  brain_features: {
    dmn_incubation: dmnInsight?.gut_feeling ? true : false,
    somatic_marker: step5.conclusion ? true : false,
    debate_social: debateArgs?.length === 3 ? true : false,
    hierarchical_prediction: topDown?.error_severity || 'none',
    action_plan: args?._action_plan ? true : false,
    adaptive_weights: Object.fromEntries(Object.entries(STEP_WEIGHTS).map(([k, v]) => ['Step' + k, v])),
    uncertainty_tracking: uncertaintyHistory.length > 0,
  },
  uncertainty: {
    history: uncertaintyHistory,
    final_composite: uncertaintyHistory.length > 0 ? uncertaintyHistory[uncertaintyHistory.length - 1].composite : 0,
    trend: uncertaintyHistory.length >= 2
      ? (uncertaintyHistory[uncertaintyHistory.length - 1].composite - uncertaintyHistory[0].composite > 0.05 ? 'increasing' : 'decreasing')
      : 'stable',
  },
  action_plan: args?._action_plan || null,
  memory_tags: {
    step2: step2.perspectives.filter(p => p._memory_tag).map(p => p._memory_tag),
    step3: step3.dimensions.filter(d => d._memory_tag).map(d => d._memory_tag),
    step4: step4.directions.filter(d => d._memory_tag).map(d => d._memory_tag),
    insight_count: [...(step2.perspectives.filter(p => p._memory_tag)), ...(step3.dimensions.filter(d => d._memory_tag))].length,
  },
  step5: {
    conclusion: step5.conclusion,
    reasoning_chain: step5.reasoning_chain,
    what_if_wrong: step5.what_if_wrong,
    all_clear: step5.all_clear,
    follow_up_signals: step5.follow_up_signals,
    self_check_passed: step5.self_check.filter(s => s.passed).length + '/' + step5.self_check.length
  }
}
