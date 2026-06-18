// Ponder Pipeline — Clear conclusion oriented with depth loop
// Workflow parser compatible: no while/for/do-while
export const meta = {
  name: 'ponder-pipeline',
  description: '发散→维度→推演→辩论→综合→验证→深度循环(至多3轮)→清晰结论',
  phases: [
    { title: '发散分析', detail: '多视角发散' },
    { title: '维度检查', detail: '8维系统分析' },
    { title: '场景推演', detail: '多方向模拟' },
    { title: '多方辩论', detail: '观点交锋' },
    { title: '综合判断', detail: '自审与结论' },
    { title: '独立验证', detail: '结论审查' },
    { title: '深度循环', detail: '针对性深挖' },
  ],
}

const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无输入)'
const pluginPath = args?.plugin_path || ''
const memoryContext = args?.memory_context || ''

// Helper: extract clarity assessment from verification result
function assessClarity(verifyResult, conclusion) {
  if (!verifyResult) return 'needs_deeper'
  // If verdict is PASS and no critical issues, conclusion is clear
  if (verifyResult.verdict === 'PASS' && verifyResult.all_clear) return 'clear'
  // If all issues are about missing user context/requirements
  const userRelated = verifyResult.issues.filter(i =>
    i.detail.includes('用户') || i.detail.includes('偏好') || i.detail.includes('需求') || i.detail.includes('goal')
  )
  if (userRelated.length >= verifyResult.issues.length * 0.5) return 'needs_user_input'
  // Otherwise needs deeper research
  return 'needs_deeper'
}

// ─── Step 2-5: Core analysis chain ───

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
      recommendation: { type: 'string', minLength: 30 },
    }, required: ['directions', 'comparison', 'recommendation'],
  },
})

phase('多方辩论')
const debateResult = await agent(`多方向辩论\n\n推演方向:\n${step4.directions.map((d, i) => `方向${i+1}: ${d.name}\n  乐观: ${d.optimistic.path}\n  现实: ${d.realistic.path}\n  悲观: ${d.pessimistic.path}`).join('\n\n')}\n\n每个方向派出辩护师陈词, 然后互相驳斥。最后综合各方论点的优劣。`, {
  label: '多方辩论',
  schema: {
    type: 'object', properties: {
      stances: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, argument: { type: 'string', minLength: 50 }, evidence: { type: 'array', items: { type: 'string' }, minItems: 1 },
      }, required: ['name', 'argument'] }, minItems: 2 },
      rebuttals: { type: 'array', items: { type: 'object', properties: {
        attacker: { type: 'string' }, target: { type: 'string' }, point: { type: 'string', minLength: 30 }, severity: { type: 'string', enum: ['fatal', 'significant', 'minor'] },
      }, required: ['attacker', 'target', 'point'] }, minItems: 2 },
      debate_synthesis: { type: 'string', minLength: 50 },
    }, required: ['stances', 'rebuttals', 'debate_synthesis'],
  },
})

phase('综合判断')
const step5 = await agent(`综合判断\n\n用户请求: ${userRequest}\n发散: ${JSON.stringify(step2)}\n维度: ${JSON.stringify(step3)}\n推演: ${JSON.stringify(step4)}\n辩论: ${debateResult.debate_synthesis}\n\n给出最终结论、推理链、自检结果。结论必须清晰、确定、可执行。如果存在模糊点, 明确标注是"需要用户补充信息"还是"需要更深入研究"。`, {
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
      clarity_gaps: { type: 'array', items: { type: 'object', properties: {
        gap: { type: 'string' }, type: { type: 'string', enum: ['needs_user_input', 'needs_deeper'] }, questions_for_user: { type: 'array', items: { type: 'string' } },
      }, required: ['gap', 'type'] } },
    }, required: ['conclusion', 'reasoning_chain', 'what_if_wrong', 'all_clear', 'self_check'],
  },
})

// ─── Step 6: Verification ───

phase('独立验证')
let verifyResult = await agent(`独立验证\n\n结论: ${step5.conclusion}\n推理链: ${step5.reasoning_chain}\nclarity_gaps: ${JSON.stringify(step5.clarity_gaps || [])}\n\n主动找漏洞。同时判断: 结论是否清晰? 如果不清晰, 是因为缺乏用户信息还是研究不够深?`, {
  label: '独立验证',
  schema: {
    type: 'object', properties: {
      all_clear: { type: 'boolean' },
      verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
      conclusion_clarity: { type: 'string', enum: ['clear', 'needs_user_input', 'needs_deeper'], description: '结论清晰度' },
      user_gaps: { type: 'array', items: { type: 'string' }, description: '需要用户补充的信息' },
      issues: { type: 'array', items: { type: 'object', properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, detail: { type: 'string', minLength: 30 },
      }, required: ['severity', 'detail'] } },
      what_was_missed: { type: 'string' },
    }, required: ['all_clear', 'verdict', 'conclusion_clarity'],
  },
})

// Determine path
const clarity = assessClarity(verifyResult, step5)

// ─── Depth Loop Rounds (hardcoded, max 3) ───
let deepResearch = null
let step5b = null
let verifyResult2 = null
let clarity2 = null
let deepResearch2 = null
let step5c = null
let verifyResult3 = null
let clarity3 = null

// --- Round 1 ---
if (clarity === 'needs_deeper') {
  phase('深度循环')
  deepResearch = await agent(`深度研究\n\n原始结论: ${step5.conclusion}\n验证发现的问题:\n${verifyResult.issues.map(i => `[${i.severity}] ${i.detail}`).join('\n')}\n遗漏: ${verifyResult.what_was_missed}\n\n针对验证指出的漏洞进行深度研究, 搜索新证据, 修正分析缺陷。目标: 得出清晰、确定的结论。`, {
    label: '深度研究R1',
    schema: {
      type: 'object', properties: {
        findings: { type: 'array', items: { type: 'object', properties: {
          addresses_issue: { type: 'string' }, new_evidence: { type: 'string', minLength: 30 }, revised_judgment: { type: 'string' },
        }, required: ['addresses_issue', 'new_evidence'] }, minItems: 1 },
        revised_conclusion: { type: 'string', minLength: 50 },
      }, required: ['findings', 'revised_conclusion'],
    },
  })

  step5b = await agent(`修正综合判断\n\n原始结论: ${step5.conclusion}\n深度研究发现:\n${deepResearch.findings.map(f => `- ${f.addresses_issue}: ${f.new_evidence}`).join('\n')}\n修后结论: ${deepResearch.revised_conclusion}\n\n给出修正后的结论。必须清晰、确定。如果仍需用户补充信息, 在user_questions中列出。`, {
    label: '再综合R1',
    schema: {
      type: 'object', properties: {
        conclusion: { type: 'string', minLength: 50 },
        reasoning_chain: { type: 'string', minLength: 50 },
        what_if_wrong: { type: 'string', minLength: 20 },
        follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
        user_questions: { type: 'array', items: { type: 'string' } },
      }, required: ['conclusion', 'reasoning_chain'],
    },
  })

  verifyResult2 = await agent(`二次验证\n\n修正后结论: ${step5b.conclusion}\n推理链: ${step5b.reasoning_chain}\n\n结论是否清晰? PASS还是仍需深挖?`, {
    label: '再验证R1',
    schema: {
      type: 'object', properties: {
        all_clear: { type: 'boolean' },
        verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
        conclusion_clarity: { type: 'string', enum: ['clear', 'needs_user_input', 'needs_deeper'] },
        remaining_issues: { type: 'array', items: { type: 'string' } },
      }, required: ['all_clear', 'verdict', 'conclusion_clarity'],
    },
  })
  clarity2 = assessClarity(verifyResult2, step5b)

  // --- Round 2 ---
  if (clarity2 === 'needs_deeper') {
    phase('深度循环')
    deepResearch2 = await agent(`继续深度研究\n\n当前结论仍有模糊:\n${(verifyResult2.remaining_issues || []).join('\n')}\n已有研究成果: ${deepResearch.findings.map(f => f.revised_judgment).join('\n')}\n\n在已有基础上继续深挖, 直到得出清晰确定的结论。`, {
      label: '深度研究R2',
      schema: {
        type: 'object', properties: {
          findings: { type: 'array', items: { type: 'object', properties: {
            addresses_issue: { type: 'string' }, new_evidence: { type: 'string', minLength: 30 }, revised_judgment: { type: 'string' },
          }, required: ['addresses_issue', 'new_evidence'] }, minItems: 1 },
          final_conclusion: { type: 'string', minLength: 50 },
        }, required: ['findings', 'final_conclusion'],
      },
    })

    step5c = await agent(`最终综合\n\n已有研究R1: ${deepResearch.revised_conclusion}\n新研究R2: ${deepResearch2.findings.map(f => f.new_evidence).join('\n')}\n最终结论: ${deepResearch2.final_conclusion}\n\n产出最终清晰确定的结论。`, {
      label: '最终综合',
      schema: {
        type: 'object', properties: {
          conclusion: { type: 'string', minLength: 50 },
          reasoning_chain: { type: 'string', minLength: 50 },
          what_if_wrong: { type: 'string', minLength: 20 },
          follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
        }, required: ['conclusion', 'reasoning_chain'],
      },
    })

    verifyResult3 = await agent(`最终验证\n\n结论: ${step5c.conclusion}\n推理链: ${step5c.reasoning_chain}\n\n此结论是否清晰可执行?`, {
      label: '最终验证',
      schema: {
        type: 'object', properties: {
          all_clear: { type: 'boolean' },
          verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
          conclusion_clarity: { type: 'string', enum: ['clear', 'needs_user_input', 'needs_deeper'] },
        }, required: ['all_clear', 'verdict', 'conclusion_clarity'],
      },
    })
    clarity3 = assessClarity(verifyResult3, step5c)
  }
}

// ─── Build return value ───
const base = {
  user_request: userRequest,
  conclusion_clarity: clarity,
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
    directions: step4.directions.map(d => ({ name: d.name, optimistic: d.optimistic, realistic: d.realistic, pessimistic: d.pessimistic })),
  },
  debate: {
    stance_count: debateResult.stances.length,
    rebuttal_count: debateResult.rebuttals.length,
    synthesis: debateResult.debate_synthesis,
  },
  step5: {
    conclusion: step5.conclusion,
    reasoning_chain: step5.reasoning_chain,
    what_if_wrong: step5.what_if_wrong,
    all_clear: step5.all_clear,
    follow_up_signals: step5.follow_up_signals,
    self_check: step5.self_check,
    self_check_passed: step5.self_check.filter(s => s.passed).length + '/' + step5.self_check.length,
    clarity_gaps: step5.clarity_gaps || [],
  },
  verify: {
    verdict: verifyResult.verdict,
    issues: verifyResult.issues,
    all_clear: verifyResult.all_clear,
    conclusion_clarity: verifyResult.conclusion_clarity,
    user_gaps: verifyResult.user_gaps || [],
    what_was_missed: verifyResult.what_was_missed,
  },
  deep_dive: { performed: false },
  deep_dive_r2: { performed: false },
  deep_dive_r3: { performed: false },
}

if (clarity === 'needs_user_input' || clarity === 'needs_deeper') {
  if (deepResearch) {
    base.deep_dive = {
      performed: true,
      round: 1,
      findings: deepResearch.findings,
      revised_conclusion: deepResearch.revised_conclusion,
      final_conclusion: step5b?.conclusion || deepResearch.revised_conclusion,
      final_verdict: verifyResult2?.verdict,
      clarity_after: clarity2,
    }
  }
  if (deepResearch2) {
    base.deep_dive_r2 = {
      performed: true,
      round: 2,
      findings: deepResearch2.findings,
      final_conclusion: deepResearch2.final_conclusion,
      final_conclusion_r2: step5c?.conclusion,
      final_verdict: verifyResult3?.verdict,
      clarity_after: clarity3,
    }
    base.conclusion_clarity = clarity3 || clarity2 || clarity
  } else {
    base.conclusion_clarity = clarity2 || clarity
  }
}

return base
