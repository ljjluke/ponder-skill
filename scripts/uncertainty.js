#!/usr/bin/env node
/**
 * UncertaintyRouter — 不确定性连续编码与路由
 *
 * 模拟大脑额顶叶网络对不确定性的连续编码（Badre & Nee, 2024）
 * 将 pipeline 中每个步骤的不确定性量化为连续值(0-1)
 * 并根据不确定性类型路由到不同策略
 *
 * 三种不确定性类型（对应不同神经环路）:
 *   AMBIGUITY (歧义) — 前额叶: 多种解释/多个方向 → 需要更多发散
 *   RISK (风险) — 眶额皮层: 概率已知但结果不确定 → 需要更多数据
 *   IGNORANCE (无知) — 前扣带皮层: 未知的未知 → 需要问用户
 *
 * 使用方式:
 *   const router = new UncertaintyRouter()
 *   router.assess('divergence', step2, { pluginPath })
 *   const decision = router.decide()
 */

const UNCERTAINTY_TYPES = {
  AMBIGUITY: 'ambiguity',
  RISK: 'risk',
  IGNORANCE: 'ignorance',
}

const TYPE_LABELS = {
  ambiguity: '歧义',
  risk: '风险',
  ignorance: '无知',
}

class UncertaintyRouter {
  constructor(options = {}) {
    this.history = [] // { step, ambiguity, risk, ignorance, composite, source }
    this.current = { ambiguity: 0, risk: 0, ignorance: 0, composite: 0 }
    this.thresholds = {
      low: options.lowThreshold || 0.3,
      medium: options.mediumThreshold || 0.55,
      high: options.highThreshold || 0.75,
    }
    this.lastDecision = null
  }

  /**
   * 分析步骤输出中的不确定性信号
   * @param {string} stepName — 步骤名称（如 'divergence', 'bagua', 'simulate', 'debate', 'converge'）
   * @param {object} output — 步骤的结构化输出
   * @param {object} opts
   * @param {number} opts.prevAmbiguity — 上一步的歧义值，用于计算趋势
   * @returns {{ ambiguity: number, risk: number, ignorance: number, composite: number, signals: object }}
   */
  assess(stepName, output = {}, opts = {}) {
    const signals = {}

    // ── 歧义(Ambiguity)信号检测 ──
    // 大脑的前额叶在面临多义性时激活
    let ambiguity = 0
    let ambiguitySignals = 0

    if (stepName === 'divergence' || stepName === 'step2') {
      // 视角重复度: 真正不同的视角 vs 总数
      const pCount = output?.perspectives?.length || 6
      // 矛盾点数量: 越多歧义越高
      const contradictions = output?.contradictions?.length || 0
      if (contradictions >= 5) ambiguity += 0.7
      else if (contradictions >= 3) ambiguity += 0.4
      else if (contradictions >= 1) ambiguity += 0.15
      ambiguitySignals++
    }

    if (stepName === 'bagua' || stepName === 'step3') {
      // 维度得分方差: 方差高 → 歧义高（不同维度指向不同方向）
      const scores = output?.dimensions?.map(d => d.score) || []
      if (scores.length > 0) {
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance = scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
        ambiguity += Math.min(0.8, variance / 8) // 归一化到0-0.8
        ambiguitySignals++
      }
      // 冲突对数
      const conflicts = output?.conflicts?.length || 0
      if (conflicts >= 5) ambiguity += 0.3
      else if (conflicts >= 3) ambiguity += 0.15
      ambiguitySignals++
    }

    if (stepName === 'simulate' || stepName === 'step4') {
      // 多方向分歧: 如果方向间的推荐不一致 → 歧义高
      const dirs = output?.directions || []
      if (dirs.length >= 2) {
        // 不同方向的存在本身就意味着歧义
        ambiguity += 0.25
        ambiguitySignals++
      }
    }

    if (stepName === 'converge' || stepName === 'step5') {
      // 自检不一致: failed self-checks → 歧义
      const checks = output?.self_check || []
      const failures = checks.filter(c => !c.passed).length
      ambiguity += (failures / Math.max(1, checks.length)) * 0.6
      ambiguitySignals++
    }

    // 归一化 ambiguity (0-1)
    ambiguity = ambiguitySignals > 0 ? Math.min(1, ambiguity / ambiguitySignals * 1.5) : 0
    signals.ambiguity_sources = { contradictions: output?.contradictions?.length, conflicts: output?.conflicts?.length }

    // ── 风险(Risk)信号检测 ──
    // 大脑的眶额皮层评估结果的可靠性/风险
    let risk = 0
    let riskSignals = 0

    // 自检通过率
    const checks = output?.self_check || []
    const passRate = checks.length > 0 ? checks.filter(c => c.passed).length / checks.length : 0.5
    risk += (1 - passRate) * 0.4
    riskSignals++

    // 验证问题数
    const issues = output?.issues || []
    if (issues.length >= 3) risk += 0.4
    else if (issues.length >= 1) risk += 0.15
    riskSignals++

    // 关键/严重问题
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    if (criticalCount > 0) risk += 0.35 * Math.min(1, criticalCount / 3)
    riskSignals++

    risk = riskSignals > 0 ? Math.min(1, risk / riskSignals * 2) : 0
    signals.risk_sources = { pass_rate: passRate, issues: issues.length, critical: criticalCount }

    // ── 无知(Ignorance)信号检测 ──
    // 大脑的前扣带皮层检测到信息缺失时激活
    let ignorance = 0
    let ignoranceSignals = 0

    // 用户问题: LLM不能回答 → 无知
    const userQuestions = output?.user_questions || []
    if (userQuestions.length >= 3) ignorance += 0.7
    else if (userQuestions.length >= 1) ignorance += 0.35
    ignoranceSignals++

    // 数据源覆盖
    const dataSources = output?.data_sources || output?.directions?.flatMap(d => d.data_sources || []) || []
    if (dataSources.length === 0) ignorance += 0.5
    else if (dataSources.length <= 2) ignorance += 0.2
    ignoranceSignals++

    // 遗漏维度 (来自验证)
    const whatWasMissed = output?.what_was_missed
    if (whatWasMissed && whatWasMissed.length > 10) ignorance += 0.5
    ignoranceSignals++

    ignorance = ignoranceSignals > 0 ? Math.min(1, ignorance / ignoranceSignals * 1.5) : 0
    signals.ignorance_sources = { user_questions: userQuestions.length, data_sources: dataSources.length }

    // ── 合成不确定性 (Composite) ──
    // 加权: 歧义占0.35, 风险占0.40, 无知占0.25
    // 权重设计: 风险最影响决策质量, 歧义次之, 无知可通过问用户解决
    const composite = Math.min(1, ambiguity * 0.35 + risk * 0.40 + ignorance * 0.25)

    const assessment = {
      ambiguity: Math.round(ambiguity * 100) / 100,
      risk: Math.round(risk * 100) / 100,
      ignorance: Math.round(ignorance * 100) / 100,
      composite: Math.round(composite * 100) / 100,
      signals,
    }

    return assessment
  }

  /**
   * 记录不确定性评估到历史
   * @param {string} stepName
   * @param {object} assessment — 从 assess() 返回
   */
  record(stepName, assessment) {
    this.history.push({
      step: stepName,
      ...assessment,
      at: new Date().toISOString(),
    })
    this.current.ambiguity = assessment.ambiguity
    this.current.risk = assessment.risk
    this.current.ignorance = assessment.ignorance
    this.current.composite = assessment.composite
  }

  /**
   * 基于当前不确定性做出路由决策
   *
   * @param {object} opts
   * @param {number} opts.loopCount — 当前修复轮次
   * @param {number} opts.maxLoops — 最大修复轮次
   * @returns {object}
   *   action: 'proceed' | 'deepen' | 'diverge_more' | 'search_more' | 'ask_user' | 'report_gaps'
   *   target: string — 影响的目标步骤
   *   reason: string
   *   uncertainty_type: string — 主导不确定性类型
   */
  decide(opts = {}) {
    const loopCount = opts.loopCount || 0
    const maxLoops = opts.maxLoops || 3
    const c = this.current

    // 决定主导不确定性类型
    const dominantType = Object.keys(UNCERTAINTY_TYPES)
      .map(k => UNCERTAINTY_TYPES[k])
      .sort((a, b) => c[b] - c[a])[0]

    const dominantValue = c[dominantType]

    // ── 低不确定性: 顺畅进入下一步 ──
    if (c.composite < this.thresholds.low || loopCount >= maxLoops) {
      return {
        action: 'proceed',
        target: 'next',
        reason: `不确定性低(${c.composite})，可继续`,
        uncertainty_type: dominantType,
        confidence: 1 - c.composite,
      }
    }

    // ── 中不确定性: 根据主导类型选择策略 ──
    if (c.composite < this.thresholds.medium) {
      let action, target, reason

      if (c.ambiguity >= c.risk && c.ambiguity >= c.ignorance) {
        // 歧义主导 → 在当前步骤增加发散深度
        action = 'diverge_more'
        target = opts.currentStep || 'diverge'
        reason = `歧义(${c.ambiguity})主导，需要更多发散`
      } else if (c.risk >= c.ambiguity && c.risk >= c.ignorance) {
        // 风险主导 → 搜索更多数据
        action = 'search_more'
        target = 'simulate'
        reason = `风险(${c.risk})主导，需要更多数据`
      } else {
        // 无知主导 → 问用户
        action = 'ask_user'
        target = 'constraint'
        reason = `无知(${c.ignorance})主导，需要用户输入`
      }

      return { action, target, reason, uncertainty_type: dominantType, confidence: 1 - c.composite }
    }

    // ── 高不确定性: 需要修复循环 ──
    if (c.ambiguity >= c.risk && c.ambiguity >= c.ignorance) {
      return {
        action: 'deepen',
        target: 'diverge',
        reason: `高歧义(${c.ambiguity}) — 返回发散阶段增加视角多样性`,
        uncertainty_type: 'ambiguity',
        confidence: 1 - c.ambiguity,
        fixInstruction: `系统检测到高歧义(${c.ambiguity})。请在当前步骤增加更多的视角或维度，不要满足于现有发现。`
      }
    } else if (c.risk >= c.ambiguity && c.risk >= c.ignorance) {
      return {
        action: 'deepen',
        target: 'verify',
        reason: `高风险(${c.risk}) — 需要更严格的独立验证`,
        uncertainty_type: 'risk',
        confidence: 1 - c.risk,
        fixInstruction: `系统检测到高风险(${c.risk})。请增加数据来源，对每个关键假设提供真实数据支撑。`
      }
    } else {
      return {
        action: 'ask_user',
        target: 'constraint',
        reason: `高无知(${c.ignorance}) — 需要用户提供关键信息`,
        uncertainty_type: 'ignorance',
        confidence: 1 - c.ignorance,
        fixInstruction: `系统检测到信息缺失(${c.ignorance})。请明确向用户提问，获取必要信息。`
      }
    }
  }

  /**
   * 获取不确定性趋势
   * @returns {string} 'increasing' | 'decreasing' | 'stable'
   */
  trend() {
    if (this.history.length < 2) return 'stable'
    const recent = this.history.slice(-3)
    if (recent.length < 2) return 'stable'
    const composites = recent.map(h => h.composite)
    const first = composites[0]
    const last = composites[composites.length - 1]
    const diff = last - first
    if (diff > 0.05) return 'increasing'
    if (diff < -0.05) return 'decreasing'
    return 'stable'
  }

  /**
   * 获取不确定性报告摘要
   * @returns {object}
   */
  summary() {
    return {
      current: this.current,
      trend: this.trend(),
      historyCount: this.history.length,
      thresholds: this.thresholds,
    }
  }

  /**
   * 动态调整阈值
   */
  setThresholds(newThresholds) {
    if (newThresholds.low !== undefined) this.thresholds.low = newThresholds.low
    if (newThresholds.medium !== undefined) this.thresholds.medium = newThresholds.medium
    if (newThresholds.high !== undefined) this.thresholds.high = newThresholds.high
  }
}

// ── CLI 接口 ──
function cli(args) {
  const subcommand = args[0]
  switch (subcommand) {
    case 'assess': {
      const input = JSON.parse(args[1] || '{}')
      const router = new UncertaintyRouter()
      const result = router.assess(input.step, input.output || {}, input.opts || {})
      console.log(JSON.stringify(result))
      break
    }
    case 'decide': {
      const input = JSON.parse(args[1] || '{}')
      const router = new UncertaintyRouter()
      const assessment = router.assess(input.step, input.output || {}, input.opts || {})
      router.record(input.step, assessment)
      const decision = router.decide({ loopCount: input.loopCount || 0, maxLoops: input.maxLoops || 3, currentStep: input.currentStep })
      console.log(JSON.stringify({ assessment, decision }))
      break
    }
    default:
      console.log(JSON.stringify({
        usage: 'node scripts/uncertainty.js <assess|decide> <json-args>',
        example: 'node scripts/uncertainty.js assess \'{"step":"divergence","output":{"perspectives":[],"contradictions":[]}}\'',
      }))
  }
}

if (require.main === module) {
  cli(process.argv.slice(2))
}

module.exports = { UncertaintyRouter, UNCERTAINTY_TYPES, TYPE_LABELS }
