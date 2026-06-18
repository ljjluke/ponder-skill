// Ponder Pipeline — Sequential (single-pass, no depth loop)
// Workflow parser compatible: no while/for/do-while/switch at top level
export const meta = {
  name: 'ponder-pipeline',
  description: 'Structured analysis: divergence → examination → simulation → debate → convergence → verification',
  phases: [
    { title: '发散分析', detail: '多视角发散' },
    { title: '维度检查', detail: '8维系统分析' },
    { title: '场景推演', detail: '多方向模拟' },
    { title: '综合判断', detail: '自审与结论' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

// ── Inputs ──
const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无输入)'
const pluginPath = args?.plugin_path || ''
const memoryContext = args?.memory_context || ''

// ── Step 2: 发散分析 ──
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

// ── Step 3: 维度检查 ──
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

// ── Step 4: 场景推演 ──
phase('场景推演')
const step4 = await agent(`场景推演\n\n维度分析: ${JSON.stringify(step3)}\n\n基于维度冲突提炼2-3个推演方向, 每个方向给出乐观/现实/悲观三种路径。`, {
  label: '场景推演',
  schema: {
    type: 'object', properties: {
      directions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        optimistic: { type: 'object', properties: { trigger_conditions: { type: 'string' }, path: { type: 'string', minLength: 30 } }, required: ['trigger_conditions', 'path'] },
        realistic: { type: 'object', properties: { trigger_conditions: { type: 'string' }, path: { type: 'string', minLength: 30 } }, required: ['trigger_conditions', 'path'] },
        pessimistic: { type: 'object', properties: { trigger_conditions: { type: 'string' }, path: { type: 'string', minLength: 30 } }, required: ['trigger_conditions', 'path'] },
      }, required: ['name', 'optimistic', 'realistic', 'pessimistic'] }, minItems: 2, maxItems: 3 },
      comparison: { type: 'string', minLength: 40 },
      common_ground: { type: 'string', minLength: 30 },
      recommendation: { type: 'string', minLength: 30 },
    }, required: ['directions', 'comparison', 'recommendation'],
  },
})

// ── Step 5: 综合判断 ──
phase('综合判断')
const step5 = await agent(`综合判断\n\n发散: ${JSON.stringify(step2)}\n维度: ${JSON.stringify(step3)}\n推演: ${JSON.stringify(step4)}\n\n给出最终结论、推理链、自检结果。`, {
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

// ── Step 6: 独立验证 ──
phase('独立验证')
const verifyResult = await agent(`独立验证\n\n结论: ${step5.conclusion}\n推理链: ${step5.reasoning_chain}\n\n主动找漏洞, 指出逻辑断裂、视角盲区、假设脆弱。`, {
  label: '独立验证',
  schema: {
    type: 'object', properties: {
      all_clear: { type: 'boolean' },
      verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
      issues: { type: 'array', items: { type: 'object', properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, detail: { type: 'string', minLength: 30 },
      }, required: ['severity', 'detail'] } },
      what_was_missed: { type: 'string' },
    }, required: ['all_clear', 'verdict'],
  },
})

return {
  user_request: userRequest,
  step2: { perspective_count: step2.perspectives.length, contradictions: step2.contradictions, consensus: step2.consensus },
  step3: { dimension_count: step3.dimensions.length, key_finding: step3.key_finding },
  step4: { direction_count: step4.directions.length, recommendation: step4.recommendation },
  step5: { conclusion: step5.conclusion, reasoning_chain: step5.reasoning_chain, what_if_wrong: step5.what_if_wrong, all_clear: step5.all_clear, follow_up_signals: step5.follow_up_signals, self_check_passed: step5.self_check.filter(s => s.passed).length + '/' + step5.self_check.length },
  verify: { verdict: verifyResult.verdict, issues: verifyResult.issues, all_clear: verifyResult.all_clear, what_was_missed: verifyResult.what_was_missed },
}
