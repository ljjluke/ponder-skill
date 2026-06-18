// Ponder Parallel Engine — only runs parallelizable sub-tasks
// Sequential steps (divergence, dimension check, plan convergence, synthesis) are done by the main LLM
export const meta = {
  name: 'ponder-pipeline',
  description: '并行推演+多方辩论 → 返回结构化结果供主LLM综合',
  phases: [
    { title: '独立推演', detail: '每个方案独立模拟' },
    { title: '多方辩论', detail: '方案间交叉辩论' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const userRequest = args?.user_request || '(未提供)'

// ─── 输入: 主LLM提供的方案列表 ───
const plans = args?.plans || []
const draftConclusion = args?.draft_conclusion || ''
const draftReasoning = args?.draft_reasoning || ''

// ─── Step 1: 每个方案独立推演（并行） ───

phase('独立推演')
const simulationResults = await parallel(
  plans.slice(0, 10).map(plan => () => agent(`独立推演\n\n请求: ${userRequest}\n方案: ${plan.name}\n行动描述: ${plan.action}\n\n模拟这个方案在乐观/中性/悲观三种情境下的演化路径。对每条路径解释推理依据和知识来源。`, {
    label: `推演:${plan.name.substring(0, 10)}`,
    phase: '独立推演',
    schema: {
      type: 'object', properties: {
        plan_name: { type: 'string' },
        optimistic_path: { type: 'string', minLength: 50 },
        optimistic_reasoning: { type: 'array', items: { type: 'object', properties: {
          step: { type: 'string' }, evidence: { type: 'string' }, knowledge_source: { type: 'string', enum: ['user_input', 'pipeline_previous_step', 'web_search', 'model_knowledge', 'reasoning'] },
        }, required: ['step', 'evidence', 'knowledge_source'] } },
        neutral_path: { type: 'string', minLength: 50 },
        pessimistic_path: { type: 'string', minLength: 50 },
        key_variable: { type: 'string' },
      }, required: ['plan_name', 'optimistic_path', 'neutral_path', 'pessimistic_path', 'key_variable'],
    },
  }))
)

// ─── Step 2: 多方辩论（并行陈词+综合） ───

phase('多方辩论')
const simText = simulationResults.filter(Boolean).map(r =>
  `【${r.plan_name}】乐观:${r.optimistic_path} 中性:${r.neutral_path} 悲观:${r.pessimistic_path} 关键:${r.key_variable}`
).join('\n\n')

const debateResult = await agent(`多方案辩论\n\n请求:${userRequest}\n\n各方案推演:\n${simText}\n\n请排名各方案，给出每个方案的优劣势和最佳适用条件，最后给出综合选择建议。`, {
  label: '多方辩论',
  phase: '多方辩论',
  schema: {
    type: 'object', properties: {
      ranked: { type: 'array', items: { type: 'object', properties: {
        rank: { type: 'number' }, name: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
        weaknesses: { type: 'array', items: { type: 'string' }, minItems: 2 },
        best_for: { type: 'string' },
      }, required: ['rank', 'name', 'strengths', 'weaknesses'] }, minItems: 2 },
      synthesis: { type: 'string', minLength: 80 },
    }, required: ['ranked', 'synthesis'],
  },
})

// ─── Step 3: 独立验证（独立的第三方审查） ───

phase('独立验证')
const verifyResult = await agent(`独立验证\n\n初步结论:${draftConclusion}\n推理链:${draftReasoning}\n\n作为独立第三方审查推理链和数据基础，指出漏洞和不足。`, {
  label: '独立验证',
  phase: '独立验证',
  schema: {
    type: 'object', properties: {
      all_clear: { type: 'boolean' },
      verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
      issues: { type: 'array', items: { type: 'object', properties: {
        severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, detail: { type: 'string', minLength: 30 },
      }, required: ['severity', 'detail'] } },
    }, required: ['all_clear', 'verdict'],
  },
})

return {
  simulation: simulationResults.filter(Boolean).map(r => ({
    plan_name: r.plan_name,
    optimistic: r.optimistic_path,
    optimistic_reasoning: r.optimistic_reasoning,
    neutral: r.neutral_path,
    pessimistic: r.pessimistic_path,
    key_variable: r.key_variable,
  })),
  debate: {
    ranked: debateResult.ranked,
    synthesis: debateResult.synthesis,
  },
  verify: {
    verdict: verifyResult.verdict,
    issues: verifyResult.issues,
    all_clear: verifyResult.all_clear,
  },
}
