// Ponder Analysis Engine — complete self-contained pipeline
// LLM only: interview + call Workflow + present results. No analysis by LLM.
export const meta = {
  name: 'ponder-pipeline',
  description: 'Memory→Diverge→Dimension→Plans→Simulate→Debate→Synthesize→Verify→Store',
  phases: [
    { title: '发散分析', detail: '多角度审视' },
    { title: '维度评分', detail: '系统评估' },
    { title: '方案生成', detail: '收敛可行方案' },
    { title: '方案推演', detail: '并行模拟' },
    { title: '方案辩论', detail: '交叉论证' },
    { title: '综合判断', detail: '最终结论' },
    { title: '独立验证', detail: '结论审查' },
  ],
}

const req = args?.user_request || ''
const profile = args?.step1
const lessonsRaw = args?.lessons || ""
const lessonsProvided = (lessonsRaw && lessonsRaw.trim() !== "" && lessonsRaw !== "none")
let divergenceLessons = "", scoringLessons = "", planningLessons = "", simulationLessons = ""
let debateLessons = "", synthesisLessons = "", verifyLessons = "" || ''


if (lessonsProvided) {
  const cat = await agent(`Categorize these past lessons by decision type: ${lessonsRaw}`, {
    label: "归类经验",
    schema: { type: "object", properties: {
      divergence: { type: "string" }, scoring: { type: "string" }, planning: { type: "string" },
      simulation: { type: "string" }, debate: { type: "string" }, synthesis: { type: "string" }, verify: { type: "string" },
    }, required: [] },
  })
  divergenceLessons = cat.divergence || "none"; scoringLessons = cat.scoring || "none"
  planningLessons = cat.planning || "none"; simulationLessons = cat.simulation || "none"
  debateLessons = cat.debate || "none"; synthesisLessons = cat.synthesis || "none"
  verifyLessons = cat.verify || "none"
}

// ─── Step 1: 6-perspective divergence ───
phase('多角度审视')
const divergence = await agent(`Analyze from 6 perspectives: ${req}

User profile: ${profile}
Memory context: ${lessonsRaw}

IMPORTANT: You MUST check the Past lessons section below. If it has data, reference relevant lessons. If it says NONE, do NOT pretend there are lessons.

First line of your response MUST be: LESSONS_CHECK: [found N relevant lessons / no relevant lessons found]

For each perspective, provide: insight (20+ chars), detail (40+ chars), and reasoning with data sources.
If you need data, search for it. Base ALL claims on found data, not assumptions.

Output 6 perspectives, 2+ contradictions between them, and a consensus conclusion.`, {
  label: '多视角发散',
  schema: {
    type: 'object', properties: {
      perspectives: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, insight: { type: 'string', minLength: 20 }, detail: { type: 'string', minLength: 40 },
        data_source: { type: 'string', description: 'Specific data/evidence supporting this insight' },
      }, required: ['name', 'insight', 'detail', 'data_source'] }, minItems: 6, maxItems: 6 },
      contradictions: { type: 'array', items: { type: 'string' }, minItems: 2 },
      consensus: { type: 'string', minLength: 30 },
    }, required: ['perspectives', 'contradictions', 'consensus'],
  },
})

// ─── Step 2: 8-dimension scoring ───
phase('综合评分')
const dimensions = await agent(`Score 8 dimensions (0-10) based on the divergence analysis.

Past lessons (scoring): ${scoringLessons}

Divergence: ${JSON.stringify(divergence)}
User request: ${req}

For each dimension: score, analysis, and SPECIFIC data source for the score.
Search for data if needed. Every score MUST have a data basis.`, {
  label: '维度评分',
  schema: {
    type: 'object', properties: {
      dimensions: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 10 },
        analysis: { type: 'string', minLength: 30 },
        data_source: { type: 'string' },
      }, required: ['name', 'score', 'analysis', 'data_source'] }, minItems: 8, maxItems: 8 },
      conflicts: { type: 'array', items: { type: 'object', properties: {
        pair: { type: 'string' }, tension: { type: 'string' }, severity: { type: 'number', minimum: 1, maximum: 10 },
      }, required: ['pair', 'tension'] }, minItems: 2 },
      key_finding: { type: 'string', minLength: 30 },
    }, required: ['dimensions', 'conflicts', 'key_finding'],
  },
})

// ─── Step 3: Plan convergence ───
phase('生成方案')
const plans = await agent(`Generate actionable plans based on analysis.

Past lessons (planning): ${planningLessons}

Divergence: ${JSON.stringify(divergence)}
Dimensions: ${JSON.stringify(dimensions)}
User: ${req}

Generate 5-8 concrete actionable plans. For each: name, rationale (which perspective/dimension it comes from), action, expected outcome, risks.
Each plan must have a clear data foundation.`, {
  label: '方案收敛',
  schema: {
    type: 'object', properties: {
      plans: { type: 'array', items: { type: 'object', properties: {
        name: { type: 'string' },
        rationale: { type: 'string', minLength: 50 },
        action: { type: 'string', minLength: 50 },
        expected_outcome: { type: 'string' },
        risks: { type: 'array', items: { type: 'string' } },
      }, required: ['name', 'rationale', 'action', 'expected_outcome', 'risks'] }, minItems: 5, maxItems: 8 },
      convergence_logic: { type: 'string', minLength: 50 },
    }, required: ['plans', 'convergence_logic'],
  },
})

// ─── Step 4: Simulate each plan (parallel) ───
phase('模拟推演')
const sims = await parallel(
  plans.plans.slice(0, 8).map(p => () => agent(
    `Simulate plan independently: ${p.name}\nAction: ${p.action}\nRequest: ${req}\nPast lessons (simulation): ${simulationLessons}\n\nProvide optimistic/neutral/pessimistic paths. Base each path on concrete data.`,
    { label: '推演:' + p.name.substring(0, 10),
      schema: { type: 'object', properties: {
        plan_name: { type: 'string' },
        optimistic_path: { type: 'string', minLength: 50 },
        neutral_path: { type: 'string', minLength: 50 },
        pessimistic_path: { type: 'string', minLength: 50 },
        key_assumption: { type: 'string', description: 'The single assumption this plan depends on most' },
      }, required: ['plan_name', 'optimistic_path', 'neutral_path', 'pessimistic_path', 'key_assumption'],
    }}
  ))
)

// ─── Step 5: Cross-debate (parallel stances) ───
phase('方案辩论')
const simText = sims.filter(Boolean).map(r =>
  `${r.plan_name}: Opt=${r.optimistic_path.substring(0,100)} Neu=${r.neutral_path.substring(0,100)} Pes=${r.pessimistic_path.substring(0,100)}`
).join('\n\n')

const stances = await parallel(
  plans.plans.slice(0, 5).map(p => () => agent(
    `Defend this plan: ${p.name}\nPast lessons (debate): ${debateLessons}\nRationale: ${p.rationale}\nSimulations:\n${sims.filter(Boolean).find(s=>s.plan_name===p.name)?Object.entries(sims.find(s=>s.plan_name===p.name)).map(([k,v])=>`${k}:${v}`).join('\n'):''}\n\nArgue for this plan. List 2-3 strengths with evidence, 2-3 risks.`,
    { label: '辩护:' + p.name.substring(0, 10),
      schema: { type: 'object', properties: {
        plan_name: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' }, minItems: 2 },
        risks: { type: 'array', items: { type: 'string' }, minItems: 2 },
      }, required: ['plan_name', 'strengths', 'risks'],
    }}
  ))
)

const debate = await agent(`Rank and synthesize all plans.

Past lessons (debate): ${debateLessons}

Request: ${req}
Simulations:\n${simText}
Stances:\n${(stances.filter(Boolean).map(s=>`${s.plan_name}: strengths=${s.strengths.join(',')} risks=${s.risks.join(',')}`)).join('\n')}

Rank all plans 1st to last. For each: strengths, weaknesses, best condition.
Final synthesis: which plan is recommended and why. Base on data, not opinion.`, {
  label: '辩论汇总',
  schema: { type: 'object', properties: {
    ranked: { type: 'array', items: { type: 'object', properties: {
      rank: { type: 'number' }, name: { type: 'string' },
      strengths: { type: 'array', items: { type: 'string' }, minItems: 1 },
      weaknesses: { type: 'array', items: { type: 'string' }, minItems: 1 },
    }, required: ['rank', 'name', 'strengths', 'weaknesses'] }, minItems: 2 },
    synthesis: { type: 'string', minLength: 80 },
  }, required: ['ranked', 'synthesis'],
  },
})

// ─── Step 6: Synthesis ───
phase('综合判断')
const conclusion = await agent(`Final synthesis.

Past lessons (synthesis): ${synthesisLessons}

User: ${req}
Divergence: ${divergence.consensus}
Key finding: ${dimensions.key_finding}
Debate: ${debate.synthesis}

Produce: conclusion, reasoning chain, what-if-wrong, self-check (3+ items), follow-up signals.
Every claim must cite data. NEVER say "generally" or "it is believed" without a source.`, {
  label: '综合判断',
  schema: { type: 'object', properties: {
    conclusion: { type: 'string', minLength: 60 },
    reasoning_chain: { type: 'string', minLength: 60 },
    what_if_wrong: { type: 'string', minLength: 30 },
    self_check: { type: 'array', items: { type: 'object', properties: {
      question: { type: 'string' }, answer: { type: 'string' }, passed: { type: 'boolean' },
    }, required: ['question', 'answer', 'passed'] }, minItems: 3 },
    follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
  }, required: ['conclusion', 'reasoning_chain', 'what_if_wrong', 'self_check'],
  },
})

// ─── Step 7: Verification ───
phase('独立验证')
const verify = await agent(`Independent verification of the analysis.

Past lessons (verify): ${verifyLessons}

Conclusion: ${conclusion.conclusion}
Reasoning: ${conclusion.reasoning_chain}

Find holes: logical gaps, missing perspectives, unsupported claims.
Is each claim backed by data? Mark unsupported claims.`, {
  label: '独立验证',
  schema: { type: 'object', properties: {
    verdict: { type: 'string', enum: ['PASS', 'REVISE'] },
    data_issues: { type: 'array', items: { type: 'object', properties: {
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      claim: { type: 'string' },
      problem: { type: 'string', minLength: 20 },
    }, required: ['severity', 'claim', 'problem'] } },
  }, required: ['verdict'],
  },
})

// ─── Return ALL data for the LLM to present ───

// ═══ Step 8: Clarity assessment ═══
phase("结论评估")
const clarity = await agent("Assess conclusion clarity.\n\nConclusion: " + JSON.stringify(conclusion.conclusion) + "\nSelf-check: " + JSON.stringify(conclusion.self_check) + "\nVerification: " + verify.verdict + "\n\nAnswer: is the conclusion clear? If not, is it missing user info or lacking research depth?", {
  label: "结论评估",
  schema: { type: "object", properties: {
    verdict: { type: "string", enum: ["clear", "needs_user_input", "needs_deeper"] },
    user_gaps: { type: "array", items: { type: "string" } },
    research_gaps: { type: "array", items: { type: "string" } },
  }, required: ["verdict"] },
})

return {
  user_request: req,
  profile: profile,
  lessons_provided: lessonsProvided,
  clarity_verdict: clarity.verdict,
  clarity_user_gaps: clarity.user_gaps || [],
  clarity_research_gaps: clarity.research_gaps || [],
  lessons_count: lessonsProvided ? 1 : 0,
  divergence: {
    perspectives: divergence.perspectives,
    contradictions: divergence.contradictions,
    consensus: divergence.consensus,
  },
  dimensions: {
    scores: dimensions.dimensions,
    conflicts: dimensions.conflicts,
    key_finding: dimensions.key_finding,
  },
  plans: {
    logic: plans.convergence_logic,
    items: plans.plans,
  },
  simulations: sims.filter(Boolean).map(s => ({
    name: s.plan_name, optimistic: s.optimistic_path, neutral: s.neutral_path, pessimistic: s.pessimistic_path, key_assumption: s.key_assumption,
  })),
  debate: {
    ranked: debate.ranked,
    synthesis: debate.synthesis,
  },
  conclusion: {
    text: conclusion.conclusion,
    reasoning: conclusion.reasoning_chain,
    what_if_wrong: conclusion.what_if_wrong,
    self_check: conclusion.self_check,
    signals: conclusion.follow_up_signals,
  },
  verification: {
    verdict: verify.verdict,
    data_issues: verify.data_issues,
  },
}
