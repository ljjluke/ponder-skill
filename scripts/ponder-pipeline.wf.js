// Ponder Pipeline — Sequential with conditional depth pass
// Workflow parser compatible: no while/for/do-while/switch at top level
export const meta = {
  name: 'ponder-pipeline',
  description: '发散→维度→推演→辩论→综合→验证→深度研究→再综合',
  phases: [
    { title: '发散分析', detail: '多视角发散' },
    { title: '维度检查', detail: '8维系统分析' },
    { title: '场景推演', detail: '多方向模拟' },
    { title: '多方辩论', detail: '不同方向观点交锋' },
    { title: '综合判断', detail: '自审与结论' },
    { title: '独立验证', detail: '结论审查' },
    { title: '深度研究', detail: '针对漏洞深度挖掘' },
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

// ── Step 4.5: 多方辩论 —— 各方向互相挑战 ──
phase('多方辩论')
const debateResult = await agent(`多方向辩论\n\n用户请求: ${userRequest}\n\n各推演方向:\n${step4.directions.map((d, i) => `方向${i+1}: ${d.name}\n  乐观: ${d.optimistic.path}\n  现实: ${d.realistic.path}\n  悲观: ${d.pessimistic.path}`).join('\n\n')}\n\n跨方向对比: ${step4.comparison}\n共识: ${step4.common_ground}\n\n每个方向派出'辩护师'陈词, 然后互相驳斥对方的证据和逻辑链。最后综合各方论点的优劣。`, {
  label: '多方辩论',
  schema: {
    type: 'object', properties: {
      stances: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, argument: { type: 'string', minLength: 50 }, evidence: { type: 'array', items: { type: 'string' }, minItems: 1 },
      }, required: ['name', 'argument'] }, minItems: 2 },
      rebuttals: { type: 'array', items: { type: 'object', properties: {
        attacker: { type: 'string' }, target: { type: 'string' }, point: { type: 'string', minLength: 30 }, severity: { type: 'string', enum: ['fatal', 'significant', 'minor'] },
      }, required: ['attacker', 'target', 'point'] }, minItems: 2 },
      debate_synthesis: { type: 'string', minLength: 50, description: '辩论后综合判断——哪些论点被削弱了, 哪些被加强了' },
    }, required: ['stances', 'rebuttals', 'debate_synthesis'],
  },
})

// ── Step 5: 综合判断 ──
phase('综合判断')
const step5 = await agent(`综合判断\n\n用户请求: ${userRequest}\n发散: ${JSON.stringify(step2)}\n维度: ${JSON.stringify(step3)}\n推演: ${JSON.stringify(step4)}\n辩论: ${debateResult.debate_synthesis}\n\n给出最终结论、推理链、自检结果。`, {
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
let verifyResult = await agent(`独立验证\n\n结论: ${step5.conclusion}\n推理链: ${step5.reasoning_chain}\n\n主动找漏洞, 指出逻辑断裂、视角盲区、假设脆弱。`, {
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

// ── Step 7: 深度研究 (仅当验证发现严重问题) ──
let deepResearch = null
let step5b = null
let verifyResult2 = null
const hasCriticalIssues = verifyResult.issues.filter(i => i.severity === 'critical').length > 0

if (hasCriticalIssues) {
  phase('深度研究')
  deepResearch = await agent(`深度研究\n\n原始结论: ${step5.conclusion}\n验证发现的问题:\n${verifyResult.issues.map(i => `[${i.severity}] ${i.detail}`).join('\n')}\n遗漏: ${verifyResult.what_was_missed}\n\n针对验证指出的漏洞进行深度研究, 搜索新证据, 修正分析中的缺陷。`, {
    label: '深度研究',
    schema: {
      type: 'object', properties: {
        findings: { type: 'array', items: { type: 'object', properties: {
          addresses_issue: { type: 'string' }, new_evidence: { type: 'string', minLength: 30 }, revised_judgment: { type: 'string' },
        }, required: ['addresses_issue', 'new_evidence'] }, minItems: 1 },
        revised_conclusion: { type: 'string', minLength: 50 },
        remaining_uncertainties: { type: 'array', items: { type: 'string' } },
      }, required: ['findings', 'revised_conclusion'],
    },
  })

  // ── Step 8: 再综合 ──
  phase('深度研究')
  step5b = await agent(`修正综合判断\n\n原始结论: ${step5.conclusion}\n深度研究发现:\n${deepResearch.findings.map(f => `- ${f.addresses_issue}: ${f.new_evidence}`).join('\n')}\n修后结论: ${deepResearch.revised_conclusion}\n\n基于深度研究结果, 给出修正后的结论、推理链和跟踪信号。`, {
    label: '再综合',
    schema: {
      type: 'object', properties: {
        conclusion: { type: 'string', minLength: 50 },
        reasoning_chain: { type: 'string', minLength: 50 },
        what_if_wrong: { type: 'string', minLength: 20 },
        follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
      }, required: ['conclusion', 'reasoning_chain', 'what_if_wrong'],
    },
  })

  // ── Step 9: 再验证 ──
  phase('深度研究')
  verifyResult2 = await agent(`二次验证\n\n修正后结论: ${step5b.conclusion}\n推理链: ${step5b.reasoning_chain}\n\n还有没有遗留问题?`, {
    label: '再验证',
    schema: {
      type: 'object', properties: {
        all_clear: { type: 'boolean' },
        verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
        remaining_issues: { type: 'array', items: { type: 'string' } },
      }, required: ['all_clear', 'verdict'],
    },
  })
}

// ── Final return ──
return {
  user_request: userRequest,
  step2: {
    perspective_count: step2.perspectives.length,
    contradictions: step2.contradictions,
    consensus: step2.consensus,
    perspectives: step2.perspectives.map(p => ({ name: p.name, insight: p.insight, detail: p.detail })),
  },
  step3: {
    dimension_count: step3.dimensions.length,
    key_finding: step3.key_finding,
    dimensions: step3.dimensions.map(d => ({ name: d.name, score: d.score, analysis: d.analysis })),
    conflicts: step3.conflicts,
  },
  step4: {
    direction_count: step4.directions.length,
    recommendation: step4.recommendation,
    comparison: step4.comparison,
    common_ground: step4.common_ground,
    directions: step4.directions.map(d => ({
      name: d.name,
      optimistic: d.optimistic,
      realistic: d.realistic,
      pessimistic: d.pessimistic,
    })),
  },
  debate: {
    stance_count: debateResult.stances.length,
    rebuttal_count: debateResult.rebuttals.length,
    synthesis: debateResult.debate_synthesis,
    rebuttals: debateResult.rebuttals,
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
    what_was_missed: verifyResult.what_was_missed,
  },
  deep_dive: hasCriticalIssues ? {
    performed: true,
    findings: deepResearch.findings,
    revised_conclusion: deepResearch.revised_conclusion,
    remaining_uncertainties: deepResearch.remaining_uncertainties,
    final_conclusion: step5b.conclusion,
    final_verdict: verifyResult2.verdict,
    all_clear_final: verifyResult2.all_clear,
  } : { performed: false },
}
