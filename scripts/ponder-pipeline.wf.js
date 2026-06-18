// Ponder Pipeline — Full reasoning transparency
export const meta = {
  name: 'ponder-pipeline',
  description: '发散→维度→方案收敛→独立推演→辩论→综合→验证',
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

// 推理追踪 schema — 每个子Agent输出这个
const REASONING_STEP = {
  type: 'object', properties: {
    step: { type: 'string', description: '推理步骤描述' },
    evidence: { type: 'string', description: '这一步用到的证据/数据来源' },
    knowledge_source: { type: 'string', enum: ['user_input', 'pipeline_previous_step', 'web_search', 'model_knowledge', 'reasoning'], description: '知识来源: 用户输入/管道前序步骤/网络搜索/模型知识/逻辑推理' },
  }, required: ['step', 'evidence', 'knowledge_source'],
}

// ─── Step 2: 发散分析 ───
phase('发散分析')
const step2 = await agent(`多视角分析: ${userRequest}\n用户画像: ${JSON.stringify(step1Result)}\n\n从6个不同视角审视问题, 找出矛盾点和共识点。\n\n对每个视角, 说明你的推理过程: 基于什么信息得出这个洞察? 是来自用户描述、你的知识、还是分析推理?`, {
  label: '发散分析',
  schema: {
    type: 'object', properties: {
      perspectives: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        insight: { type: 'string', minLength: 20 },
        detail: { type: 'string', minLength: 40 },
        reasoning: { type: 'array', items: REASONING_STEP, description: '得出这个视角洞察的推理步骤' },
      }, required: ['name', 'insight', 'detail', 'reasoning'] }, minItems: 6, maxItems: 6 },
      contradictions: { type: 'array', items: { type: 'object', properties: {
        pair: { type: 'string' }, description: { type: 'string' }, reasoning: { type: 'array', items: REASONING_STEP },
      }, required: ['pair', 'description'] }, minItems: 2 },
      consensus: { type: 'string', minLength: 30 },
      consensus_reasoning: { type: 'array', items: REASONING_STEP },
    }, required: ['perspectives', 'contradictions', 'consensus'],
  },
})

// ─── Step 3: 维度检查 ───
phase('维度检查')
const step3 = await agent(`8维交叉分析\n\n发散结果: ${JSON.stringify(step2)}\n\n从8个维度系统评估, 找出维度冲突和关键发现。对每个维度解释评分依据和推理过程。`, {
  label: '维度检查',
  schema: {
    type: 'object', properties: {
      dimensions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 10 },
        analysis: { type: 'string', minLength: 30 },
        reasoning: { type: 'array', items: REASONING_STEP, description: '评分的推理依据' },
      }, required: ['name', 'score', 'analysis', 'reasoning'] }, minItems: 8, maxItems: 8 },
      conflicts: { type: 'array', items: { type: 'object', properties: {
        pair: { type: 'string' }, tension: { type: 'string' }, severity: { type: 'number', minimum: 1, maximum: 10 },
      }, required: ['pair', 'tension'] }, minItems: 3 },
      key_finding: { type: 'string', minLength: 30 },
    }, required: ['dimensions', 'conflicts', 'key_finding'],
  },
})

// ─── Step 4: 方案收敛 ───
phase('方案收敛')
const step4 = await agent(`方案收敛生成\n\n请求: ${userRequest}\n6视角: ${JSON.stringify(step2)}\n8维度: ${JSON.stringify(step3)}\n\n基于发散和维度分析, 收敛生成5-10个具体可执行方案。每个方案解释:\n1. 为什么选择这个方案(推理依据)\n2. 基于哪个视角/维度的分析\n3. 预期效果\n4. 风险`, {
  label: '方案收敛',
  schema: {
    type: 'object', properties: {
      plans: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        rationale: { type: 'string', minLength: 50 },
        action: { type: 'string', minLength: 80 },
        prerequisites: { type: 'array', items: { type: 'string' } },
        expected_outcome: { type: 'string', minLength: 30 },
        risks: { type: 'array', items: { type: 'string' } },
        reasoning: { type: 'array', items: REASONING_STEP, description: '生成这个方案的推理过程' },
      }, required: ['name', 'rationale', 'action', 'expected_outcome', 'risks', 'reasoning'] }, minItems: 5, maxItems: 10 },
      convergence_logic: { type: 'string', minLength: 50 },
      convergence_reasoning: { type: 'array', items: REASONING_STEP },
    }, required: ['plans', 'convergence_logic'],
  },
})

// ─── Step 5: 独立推演 ───
phase('独立推演')
const simulationResults = await parallel(
  step4.plans.slice(0, 10).map(plan => () => agent(`独立推演\n\n请求: ${userRequest}\n方案: ${plan.name}\n行动: ${plan.action}\n依据: ${plan.rationale}\n\n模拟这个方案在乐观/中性/悲观三种情境下的演化路径。解释每一步推理: 为什么你认为会发生这个路径? 基于什么证据?`, {
    label: `推演: ${plan.name.substring(0, 12)}`,
    phase: '独立推演',
    schema: {
      type: 'object', properties: {
        plan_name: { type: 'string' },
        optimistic_path: { type: 'string', minLength: 50 },
        optimistic_reasoning: { type: 'array', items: REASONING_STEP },
        neutral_path: { type: 'string', minLength: 50 },
        neutral_reasoning: { type: 'array', items: REASONING_STEP },
        pessimistic_path: { type: 'string', minLength: 50 },
        pessimistic_reasoning: { type: 'array', items: REASONING_STEP },
        key_variable: { type: 'string' },
        break_point: { type: 'string' },
      }, required: ['plan_name', 'optimistic_path', 'neutral_path', 'pessimistic_path', 'key_variable'],
    },
  }))
)

// ─── Step 6: 多方辩论 ───
phase('多方辩论')
const planNames = step4.plans.slice(0, 10).map(p => p.name)
const simulationText = simulationResults.filter(Boolean).map(r =>
  `【${r.plan_name}】\n乐观: ${r.optimistic_path}\n中性: ${r.neutral_path}\n悲观: ${r.pessimistic_path}\n关键变量: ${r.key_variable}`
).join('\n\n')

const topPlans = planNames.slice(0, 5)
const debateResult = await agent(`多方案辩论\n\n请求: ${userRequest}\n\n各方案推演:\n${simulationText}\n\n以下是辩论方案:\n${topPlans.map((n, i) => `${i+1}. ${n}`).join('\n')}\n\n每个方案: 陈词(优势+证据+推理) → 找对方致命缺陷。最终给出排名和综合判断。`, {
  label: '多方辩论',
  phase: '多方辩论',
  schema: {
    type: 'object', properties: {
      plans_ranked: { type: 'array', items: { type: 'object', properties: {
        rank: { type: 'number' }, name: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
        weaknesses: { type: 'array', items: { type: 'string' }, minItems: 2 },
        best_for: { type: 'string' },
        reasoning: { type: 'array', items: REASONING_STEP, description: '这个排名的推理依据' },
      }, required: ['rank', 'name', 'strengths', 'weaknesses', 'reasoning'] }, minItems: 2 },
      fatal_flaws: { type: 'array', items: { type: 'string' } },
      synthesis: { type: 'string', minLength: 80 },
      synthesis_reasoning: { type: 'array', items: REASONING_STEP },
    }, required: ['plans_ranked', 'synthesis'],
  },
})

// ─── Step 7: 综合判断 ───
phase('综合判断')
const step5 = await agent(`最终综合判断\n\n请求: ${userRequest}\n6视角: ${JSON.stringify(step2)}\n8维度: ${JSON.stringify(step3)}\n方案: ${JSON.stringify(step4.plans.map(p => ({ name: p.name, action: p.action, reasoning: p.reasoning })))}\n推演: ${simulationText}\n辩论: ${debateResult.synthesis}\n\n给出最终结论、推理链、自检。展示完整的推理过程。`, {
  label: '综合判断',
  schema: {
    type: 'object', properties: {
      conclusion: { type: 'string', minLength: 50 },
      reasoning_chain: { type: 'string', minLength: 50 },
      reasoning_steps: { type: 'array', items: REASONING_STEP, description: '从发散到最终结论的完整推理链' },
      what_if_wrong: { type: 'string', minLength: 20 },
      all_clear: { type: 'boolean' },
      self_check: { type: 'array', items: { type: 'object', properties: {
        question: { type: 'string' }, answer: { type: 'string' }, passed: { type: 'boolean' },
        reasoning: { type: 'array', items: REASONING_STEP },
      }, required: ['question', 'answer', 'passed'] }, minItems: 3 },
      follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
    }, required: ['conclusion', 'reasoning_chain', 'what_if_wrong', 'all_clear', 'self_check'],
  },
})

// ─── Step 8: 独立验证 ───
phase('独立验证')
const verifyResult = await agent(`独立验证\n\n结论: ${step5.conclusion}\n推理链: ${step5.reasoning_chain}\n推理步骤: ${JSON.stringify(step5.reasoning_steps || [])}\n\n审查推理过程的每一步是否有漏洞。`, {
  label: '独立验证',
  schema: {
    type: 'object', properties: {
      all_clear: { type: 'boolean' },
      verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
      conclusion_clarity: { type: 'string', enum: ['clear', 'needs_deeper'] },
      issues: { type: 'array', items: { type: 'object', properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
        detail: { type: 'string', minLength: 30 },
        reasoning_gap: { type: 'string', description: '推理链中哪一步有问题' },
      }, required: ['severity', 'detail'] } },
    }, required: ['all_clear', 'verdict'],
  },
})

// ─── Return ───
return {
  user_request: userRequest,
  conclusion_clarity: verifyResult.conclusion_clarity || 'clear',
  step2: {
    perspectives: step2.perspectives.map(p => ({
      name: p.name, insight: p.insight, detail: p.detail,
      reasoning: p.reasoning, // 推理过程
    })),
    contradictions: step2.contradictions,
    consensus: step2.consensus,
  },
  step3: {
    dimensions: step3.dimensions.map(d => ({
      name: d.name, score: d.score, analysis: d.analysis,
      reasoning: d.reasoning, // 评分推理
    })),
    conflicts: step3.conflicts,
    key_finding: step3.key_finding,
  },
  step4: {
    convergence_logic: step4.convergence_logic,
    plans: step4.plans.map(p => ({
      name: p.name, rationale: p.rationale, action: p.action,
      expected_outcome: p.expected_outcome, risks: p.risks,
      reasoning: p.reasoning, // 方案推理
    })),
  },
  simulation: simulationResults.filter(Boolean).map(r => ({
    plan_name: r.plan_name,
    optimistic: r.optimistic_path,
    neutral: r.neutral_path,
    pessimistic: r.pessimistic_path,
    key_variable: r.key_variable,
    reasoning: { optimistic: r.optimistic_reasoning, neutral: r.neutral_reasoning, pessimistic: r.pessimistic_reasoning },
  })),
  debate: {
    ranked: debateResult.plans_ranked.map(p => ({
      rank: p.rank, name: p.name, strengths: p.strengths, weaknesses: p.weaknesses,
      reasoning: p.reasoning,
    })),
    synthesis: debateResult.synthesis,
  },
  step5: {
    conclusion: step5.conclusion,
    reasoning_chain: step5.reasoning_chain,
    reasoning_steps: step5.reasoning_steps, // 完整推理链
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
