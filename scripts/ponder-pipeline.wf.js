// Ponder Parallel Engine — only: simulation + debate + verification
export const meta = {
  name: 'ponder-pipeline',
  description: '方案推演→方案辩论→独立验证',
  phases: [
    { title: '方案推演', detail: '每个方案独立模拟' },
    { title: '方案辩论', detail: '多方案交叉论证' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const req = args?.user_request || ''
const plans = args?.plans || []
const draftConclusion = args?.draft_conclusion || ''
const draftReasoning = args?.draft_reasoning || ''

const planItems = Array.isArray(plans) ? plans : []

// ═══ Step 1: Simulate each plan in parallel ═══
phase('方案推演')
const sims = await parallel(
  planItems.slice(0, 8).map(p => () => agent(
    "模拟方案: " + p.name + "\n行动: " + (p.action || p.name) + "\n需求: " + req +
    "\n\n输出乐观/中性/悲观三种路径。每条路径解释推理依据。",
    { label: "推演:" + (p.name || '').substring(0, 10),
      schema: { type: "object", properties: {
        plan_name: { type: "string" },
        optimistic: { type: "string", minLength: 50 },
        neutral: { type: "string", minLength: 50 },
        pessimistic: { type: "string", minLength: 50 },
      }, required: ["plan_name", "optimistic", "neutral", "pessimistic"] },
    }
  ))
)

// ═══ Step 2: Cross-debate ═══
phase('方案辩论')
const simText = sims.filter(Boolean).map(r =>
  r.plan_name + ": 乐观=" + r.optimistic.substring(0,100) + " 中性=" + r.neutral.substring(0,100) + " 悲观=" + r.pessimistic.substring(0,100)
).join("\n\n")

const debate = await agent("多方案辩论\n\n需求: " + req + "\n\n各方案推演:\n" + simText +
  "\n\n请排名各方案，给出每个方案的优劣势和适用条件，最后给出综合推荐。",
  { label: "方案辩论",
    schema: { type: "object", properties: {
      ranked: { type: "array", items: { type: "object", properties: {
        rank: { type: "number" }, name: { type: "string" },
        pros: { type: "array", items: { type: "string" }, minItems: 1 },
        cons: { type: "array", items: { type: "string" }, minItems: 1 },
      }, required: ["rank", "name", "pros", "cons"] }, minItems: 2 },
      synthesis: { type: "string", minLength: 50 },
    }, required: ["ranked", "synthesis"] },
  }
)

// ═══ Step 3: Independent verification ═══
phase('独立验证')
const verify = await agent("独立验证\n\n结论: " + draftConclusion + "\n推理: " + draftReasoning +
  "\n\n审查推理链和数据基础，指出漏洞。",
  { label: "独立验证",
    schema: { type: "object", properties: {
      verdict: { type: "string", enum: ["PASS", "REVISE"] },
      issues: { type: "array", items: { type: "object", properties: {
        severity: { type: "string", enum: ["critical", "major", "minor"] },
        detail: { type: "string" },
      }, required: ["severity", "detail"] } },
    }, required: ["verdict"] },
  }
)

return {
  simulation: sims.filter(Boolean).map(s => ({
    name: s.plan_name, optimistic: s.optimistic, neutral: s.neutral, pessimistic: s.pessimistic,
  })),
  debate: { ranked: debate.ranked, synthesis: debate.synthesis },
  verify: { verdict: verify.verdict, issues: verify.issues || [] },
}
