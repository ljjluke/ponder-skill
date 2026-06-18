// Ponder Pipeline — Plan-oriented: diverge → examine → converge → simulate → debate → synthesize → verify
// Workflow parser compatible: no while/for/do-while
export const meta = {
  name: 'ponder-pipeline',
  description: '发散→维度检查→方案收敛→独立推演→多方辩论→综合判断→验证',
  phases: [
    { title: '发散分析', detail: '多视角发散' },
    { title: '维度检查', detail: '8维系统分析' },
    { title: '方案收敛', detail: '多方案生成' },
    { title: '独立推演', detail: '每方案独立模拟' },
    { title: '多方辩论', detail: '方案间交叉辩论' },
    { title: '综合判断', detail: '最终结论' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无输入)'
const pluginPath = args?.plugin_path || ''

// ─── Step 2: 发散分析 (6 perspectives) ───

phase('发散分析')
const step2 = await agent(`多视角分析: ${userRequest}\n用户画像: ${JSON.stringify(step1Result)}\n\n从6个不同视角审视问题, 找出矛盾点和共识点。`, {
  label: '发散分析',
  schema: {
    type: 'object', properties: {
      perspectives: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, insight: { type: 'string', minLength: 20 }, detail: { type: 'string', minLength: 40 },
      }, required: ['name', 'insight'] }, minItems: 6, maxItems: 6 },
      contradictions: { type: 'array', items: { type: 'string' }, minItems: 2 },
      consensus: { type: 'string', minLength: 30 },
    }, required: ['perspectives', 'contradictions', 'consensus'],
  },
})

// ─── Step 3: 维度检查 (8 dimensions) ───

phase('维度检查')
const step3 = await agent(`8维交叉分析\n\n发散结果: ${JSON.stringify(step2)}\n\n从8个维度系统评估, 找出维度冲突和关键发现。`, {
  label: '维度检查',
  schema: {
    type: 'object', properties: {
      dimensions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 10 }, analysis: { type: 'string', minLength: 30 },
      }, required: ['name', 'score'] }, minItems: 8, maxItems: 8 },
      conflicts: { type: 'array', items: { type: 'object', properties: {
        pair: { type: 'string' }, tension: { type: 'string' }, severity: { type: 'number', minimum: 1, maximum: 10 },
      }, required: ['pair', 'tension'] }, minItems: 3 },
      key_finding: { type: 'string', minLength: 30 },
    }, required: ['dimensions', 'conflicts', 'key_finding'],
  },
})

// ─── Step 4: 方案收敛 (从发散+维度中收敛出5-10个方案) ───

phase('方案收敛')
const step4 = await agent(`方案收敛生成\n\n请求: ${userRequest}\n6视角: ${JSON.stringify(step2)}\n8维度: ${JSON.stringify(step3)}\n\n基于以上发散分析和维度检查, 收敛生成5-10个具体、可执行的方案。每个方案必须:\n1. 有明确的行动描述\n2. 有理论依据(来自哪个视角/维度的分析)\n3. 有前提条件\n4. 有预期收益和风险\n\n方案之间必须有本质差异——不是微调参数, 而是不同的策略方向。`, {
  label: '方案收敛',
  schema: {
    type: 'object', properties: {
      plans: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string', description: '方案名称, 简洁明了' },
        rationale: { type: 'string', minLength: 50, description: '理论依据, 来自哪个视角/维度的分析' },
        action: { type: 'string', minLength: 80, description: '具体行动描述, 做什么、怎么做、何时做' },
        prerequisites: { type: 'array', items: { type: 'string' }, description: '方案成立需要的前提条件' },
        expected_outcome: { type: 'string', minLength: 30, description: '预期收益/效果' },
        risks: { type: 'array', items: { type: 'string' }, description: '主要风险和应对' },
      }, required: ['name', 'rationale', 'action', 'expected_outcome', 'risks'] }, minItems: 5, maxItems: 10 },
      convergence_logic: { type: 'string', minLength: 50, description: '从发散到收敛的逻辑: 为什么是这些方案, 排除了哪些可能性' },
    }, required: ['plans', 'convergence_logic'],
  },
})

// ─── Step 5: 独立推演 (每个方案独立模拟, 并行) ───

phase('独立推演')
// 每个方案由独立子Agent推演, 互不知道其他方案的存在
const simulationResults = await parallel(
  step4.plans.slice(0, 10).map(plan => () => agent(`独立推演\n\n请求: ${userRequest}\n方案: ${plan.name}\n行动: ${plan.action}\n依据: ${plan.rationale}\n前提: ${(plan.prerequisites || []).join(', ')}\n\n对这个方案做独立推演: 如果执行这个方案, 在乐观/中性/悲观三种情境下各会发生什么? 需要具体路径, 不是抽象描述。`, {
    label: `推演: ${plan.name.substring(0, 12)}`,
    phase: '独立推演',
    schema: {
      type: 'object', properties: {
        plan_name: { type: 'string' },
        optimistic_path: { type: 'string', minLength: 50, description: '最优情况下的事件链' },
        neutral_path: { type: 'string', minLength: 50, description: '最可能情况下的事件链' },
        pessimistic_path: { type: 'string', minLength: 50, description: '最差情况下的事件链' },
        key_variable: { type: 'string', description: '决定方案成败的关键变量' },
        break_point: { type: 'string', description: '第一个可能断裂的假设' },
      }, required: ['plan_name', 'optimistic_path', 'neutral_path', 'pessimistic_path', 'key_variable'],
    },
  }))
)

// ─── Step 6: 多方辩论 (方案间交叉辩论, 并行) ───

phase('多方辩论')
// 每组辩论: 方案A辩护 vs 方案B反驳 (并行)
const planNames = step4.plans.slice(0, 10).map(p => p.name)
const simulationText = simulationResults.filter(Boolean).map(r => `【${r.plan_name}】\n乐观: ${r.optimistic_path}\n中性: ${r.neutral_path}\n悲观: ${r.pessimistic_path}\n关键变量: ${r.key_variable}`).join('\n\n')

// 汇总辩论: 让前5个方案互相辩论(若超过5个, 则选前5个)
const topPlans = planNames.slice(0, 5)
const debateResult = await agent(`多方案交叉辩论\n\n请求: ${userRequest}\n\n各方案推演结果:\n${simulationText}\n\n以下是需要辩论的方案:\n${topPlans.map((n, i) => `${i+1}. ${n}`).join('\n')}\n\n每个方案派辩护师陈词(优势+证据), 然后找出每个方案最致命的弱点。最终给出跨方案综合判断: 哪个方案最优? 为什么? 什么条件下应该选择其他方案?`, {
  label: '多方辩论',
  phase: '多方辩论',
  schema: {
    type: 'object', properties: {
      plans_ranked: { type: 'array', items: { type: 'object', properties: {
        rank: { type: 'number' }, name: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
        weaknesses: { type: 'array', items: { type: 'string' }, minItems: 2 },
        best_for: { type: 'string', description: '什么条件下这个方案最优' },
      }, required: ['rank', 'name', 'strengths', 'weaknesses'] }, minItems: 2 },
      fatal_flaws: { type: 'array', items: { type: 'string' }, description: '被淘汰方案的关键致命缺陷' },
      synthesis: { type: 'string', minLength: 80, description: '辩论综合判断: 最终推荐方案及理由' },
    }, required: ['plans_ranked', 'synthesis'],
  },
})

// ─── Step 7: 综合判断 ───

phase('综合判断')
const step5 = await agent(`最终综合判断\n\n请求: ${userRequest}\n6视角: ${JSON.stringify(step2)}\n8维度: ${JSON.stringify(step3)}\n方案: ${JSON.stringify(step4.plans.map(p => ({ name: p.name, action: p.action })))}\n辩论结论: ${debateResult.synthesis}\n\n给出最终结论、推理链、自检。结论必须清晰、确定、可执行。`, {
  label: '综合判断',
  schema: {
    type: 'object', properties: {
      conclusion: { type: 'string', minLength: 50 },
      reasoning_chain: { type: 'string', minLength: 50 },
      what_if_wrong: { type: 'string', minLength: 20 },
      all_clear: { type: 'boolean' },
      self_check: { type: 'array', items: { type: 'object', properties: {
        question: { type: 'string' }, answer: { type: 'string' }, passed: { type: 'boolean' },
      }, required: ['question', 'answer', 'passed'] }, minItems: 3 },
      follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
    }, required: ['conclusion', 'reasoning_chain', 'what_if_wrong', 'all_clear', 'self_check'],
  },
})

// ─── Step 8: 独立验证 ───

phase('独立验证')
const verifyResult = await agent(`独立验证\n\n结论: ${step5.conclusion}\n推理链: ${step5.reasoning_chain}\n\n主动找漏洞, 判断结论是否清晰可靠。`, {
  label: '独立验证',
  schema: {
    type: 'object', properties: {
      all_clear: { type: 'boolean' },
      verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
      conclusion_clarity: { type: 'string', enum: ['clear', 'needs_deeper'] },
      issues: { type: 'array', items: { type: 'object', properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, detail: { type: 'string', minLength: 30 },
      }, required: ['severity', 'detail'] } },
    }, required: ['all_clear', 'verdict'],
  },
})

// ─── Return ───

return {
  user_request: userRequest,
  conclusion_clarity: verifyResult.conclusion_clarity || 'clear',
  step2: {
    perspectives: step2.perspectives.map(p => ({ name: p.name, insight: p.insight, detail: p.detail })),
    contradictions: step2.contradictions,
    consensus: step2.consensus,
  },
  step3: {
    dimensions: step3.dimensions.map(d => ({ name: d.name, score: d.score, analysis: d.analysis })),
    conflicts: step3.conflicts,
    key_finding: step3.key_finding,
  },
  step4: {
    convergence_logic: step4.convergence_logic,
    plans: step4.plans.map(p => ({ name: p.name, rationale: p.rationale, action: p.action, prerequisites: p.prerequisites, expected_outcome: p.expected_outcome, risks: p.risks })),
  },
  simulation: simulationResults.filter(Boolean).map(r => ({
    plan_name: r.plan_name,
    optimistic: r.optimistic_path,
    neutral: r.neutral_path,
    pessimistic: r.pessimistic_path,
    key_variable: r.key_variable,
  })),
  debate: {
    ranked: debateResult.plans_ranked,
    synthesis: debateResult.synthesis,
  },
  step5: {
    conclusion: step5.conclusion,
    reasoning_chain: step5.reasoning_chain,
    what_if_wrong: step5.what_if_wrong,
    all_clear: step5.all_clear,
    follow_up_signals: step5.follow_up_signals,
    self_check: step5.self_check,
    self_check_passed: step5.self_check.filter(s => s.passed).length + '/' + step5.self_check.length,
  },
  verify: {
    verdict: verifyResult.verdict,
    issues: verifyResult.issues,
    all_clear: verifyResult.all_clear,
    conclusion_clarity: verifyResult.conclusion_clarity,
  },
}
