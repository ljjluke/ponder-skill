// Ponder Parallel Engine — truly parallel simulation + debate
// Sequential steps done by main LLM, only concurrent tasks here
export const meta = {
  name: 'ponder-pipeline',
  description: '并行推演→并行辩论→汇总→验证',
  phases: [
    { title: '独立推演', detail: '各方案独立模拟(并行)' },
    { title: '方案辩论', detail: '各方案独立陈词(并行)' },
    { title: '辩论汇总', detail: '综合排名' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const userRequest = args?.user_request || '(未提供)'
const plans = args?.plans || []
const draftConclusion = args?.draft_conclusion || ''
const draftReasoning = args?.draft_reasoning || ''

// ═══ 阶段1: 独立推演（每个方案一个子Agent，并行） ═══
phase('独立推演')
log('推演: ' + plans.map(p => p.name).join(', '))
const simResults = await parallel(
  plans.slice(0, 10).map(plan => () => agent(
    '独立推演方案: ' + plan.name + '\n请求: ' + userRequest + '\n行动: ' + plan.action +
    '\n\n模拟乐观/中性/悲观三种路径，解释每条路径的推理依据和知识来源。',
    {
      label: '推演:' + plan.name.substring(0, 10),
      phase: '独立推演',
      schema: {
        type: 'object', properties: {
          plan_name: { type: 'string' },
          optimistic_path: { type: 'string', minLength: 50 },
          neutral_path: { type: 'string', minLength: 50 },
          pessimistic_path: { type: 'string', minLength: 50 },
          key_variable: { type: 'string' },
        }, required: ['plan_name', 'optimistic_path', 'neutral_path', 'pessimistic_path', 'key_variable'],
      },
    }
  ))
)

// ═══ 阶段2: 多方独立陈词（每个方案一个子Agent辩护，并行） ═══
// 每个stance不知道其他方案的存在，独立论证自己的优势
phase('方案辩论')
log('辩论: 各方案独立陈词')
const stanceResults = await parallel(
  plans.slice(0, 8).map(plan => () => agent(
    '方案辩护: ' + plan.name + '\n请求: ' + userRequest + '\n行动: ' + plan.action +
    '\n\n论证这个方案的优势和可行性。列出2-3个核心优势、2-3个潜在风险、适合什么条件。',
    {
      label: '辩护:' + plan.name.substring(0, 10),
      phase: '方案辩论',
      schema: {
        type: 'object', properties: {
          plan_name: { type: 'string' },
          strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
          risks: { type: 'array', items: { type: 'string' }, minItems: 2 },
          best_condition: { type: 'string' },
        }, required: ['plan_name', 'strengths', 'risks'],
      },
    }
  ))
)

// ═══ 阶段3: 辩论汇总（一个Agent综合所有陈词+推演，给出排名） ═══
phase('辩论汇总')
const simText = simResults.filter(Boolean).map(r =>
  '【' + r.plan_name + '】乐观:' + r.optimistic_path + ' 中性:' + r.neutral_path + ' 悲观:' + r.pessimistic_path + ' 关键:' + r.key_variable
).join('\n\n')
const stanceText = stanceResults.filter(Boolean).map(s =>
  '【' + s.plan_name + '】优势:' + s.strengths.join(',') + ' 风险:' + s.risks.join(',') + ' 最佳条件:' + s.best_condition
).join('\n\n')

const debateResult = await agent(
  '多方案辩论汇总\n\n请求:' + userRequest + '\n\n各方案推演:\n' + simText + '\n\n各方案陈词:\n' + stanceText +
  '\n\n综合所有推演和辩护，给出方案排名（第一名到最后一名的完整排序），以及综合选择建议。',
  {
    label: '辩论汇总',
    phase: '辩论汇总',
    schema: {
      type: 'object', properties: {
        ranked: {
          type: 'array', items: { type: 'object', properties: {
            rank: { type: 'number' }, name: { type: 'string' },
            strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
            weaknesses: { type: 'array', items: { type: 'string' }, minItems: 2 },
            best_for: { type: 'string' },
          }, required: ['rank', 'name', 'strengths', 'weaknesses'] }, minItems: 2
        },
        synthesis: { type: 'string', minLength: 80 },
      }, required: ['ranked', 'synthesis'],
    },
  }
)

// ═══ 阶段4: 独立验证 ═══
phase('独立验证')
const verifyResult = await agent(
  '独立验证\n\n结论:' + draftConclusion + '\n推理链:' + draftReasoning + '\n\n作为独立第三方审查漏洞。',
  {
    label: '独立验证',
    phase: '独立验证',
    schema: {
      type: 'object', properties: {
        all_clear: { type: 'boolean' },
        verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
        issues: { type: 'array', items: { type: 'object', properties: {
          severity: { type: 'string', enum: ['critical', 'major', 'minor'] }, detail: { type: 'string' },
        }, required: ['severity', 'detail'] } },
      }, required: ['all_clear', 'verdict'],
    },
  }
)

return {
  simulation: simResults.filter(Boolean).map(r => ({
    plan_name: r.plan_name, optimistic: r.optimistic_path, neutral: r.neutral_path, pessimistic: r.pessimistic_path, key_variable: r.key_variable,
  })),
  stances: stanceResults.filter(Boolean).map(s => ({
    plan_name: s.plan_name, strengths: s.strengths, risks: s.risks, best_condition: s.best_condition,
  })),
  debate: { ranked: debateResult.ranked, synthesis: debateResult.synthesis },
  verify: { verdict: verifyResult.verdict, issues: verifyResult.issues, all_clear: verifyResult.all_clear },
}
