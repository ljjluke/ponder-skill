// MCTS-TD 5-Step Forced Pipeline
// 代码驱动的强制思考管道。每步由独立子Agent执行，输出受JSON Schema约束。
// 调用方式: Workflow({scriptPath: 'scripts/ponder-pipeline.wf.js', args: step1Output})

export const meta = {
  name: 'ponder-pipeline',
  description: '5-step forced thinking pipeline — Step2(发散)→Step3(八卦镜)→Step4(推演)→Step5(收敛)',
  phases: [
    { title: '6尺度发散', detail: '从6个观测位置审视问题' },
    { title: '八卦镜8维', detail: '8维度交叉检查' },
    { title: '多场景推演', detail: '2-3方向×3场景模拟' },
    { title: '收敛自检', detail: '综合判断 + 5问自检' },
  ],
}

// ═══ Schema定义 — 每一步的结构化输出强制 ═══

const PERSPECTIVE = {
  type: 'object', properties: {
    name: { type: 'string' },
    insight: { type: 'string', minLength: 20 },
    detail: { type: 'string', minLength: 40 },
    conflict_with: { type: 'array', items: { type: 'string' }, description: '与此视角冲突的其他视角名称' },
  }, required: ['name', 'insight', 'detail']
}

const STEP2_SCHEMA = {
  type: 'object', properties: {
    perspectives: { type: 'array', items: PERSPECTIVE, minItems: 6, maxItems: 6 },
    contradictions: { type: 'array', items: { type: 'string' }, minItems: 2, description: '视角间的主要矛盾' },
    consensus: { type: 'string', description: '所有视角的共同指向' },
  }, required: ['perspectives', 'contradictions', 'consensus']
}

const DIMENSION = {
  type: 'object', properties: {
    name: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 10 },
    analysis: { type: 'string', minLength: 30 },
    cross_ref: { type: 'string', description: '引用的Step2视角名称' },
  }, required: ['name', 'score', 'analysis', 'cross_ref']
}

const STEP3_SCHEMA = {
  type: 'object', properties: {
    dimensions: { type: 'array', items: DIMENSION, minItems: 8, maxItems: 8 },
    conflicts: { type: 'array', items: { type: 'object', properties: {
      pair: { type: 'string' }, tension: { type: 'string' }, severity: { type: 'number', minimum: 1, maximum: 10 },
    }, required: ['pair', 'tension'] }, minItems: 3 },
    key_finding: { type: 'string', minLength: 30 },
  }, required: ['dimensions', 'conflicts', 'key_finding']
}

const SCENARIO = {
  type: 'object', properties: {
    probability: { type: 'string' },
    path: { type: 'string', minLength: 30 },
    signal: { type: 'string' },
    break_point: { type: 'string', description: '此场景的脆弱假设' },
  }, required: ['probability', 'path', 'signal']
}

const DIRECTION = {
  type: 'object', properties: {
    name: { type: 'string' },
    conflict_source: { type: 'string', description: '源自Step3的哪个维度冲突' },
    optimistic: SCENARIO, realistic: SCENARIO, pessimistic: SCENARIO,
  }, required: ['name', 'conflict_source', 'optimistic', 'realistic', 'pessimistic']
}

const STEP4_SCHEMA = {
  type: 'object', properties: {
    directions: { type: 'array', items: DIRECTION, minItems: 2 },
    comparison: { type: 'string', minLength: 40 },
    recommendation: { type: 'string', minLength: 30 },
  }, required: ['directions', 'comparison', 'recommendation']
}

const SELF_CHECK_ITEM = {
  type: 'object', properties: {
    question: { type: 'string' }, answer: { type: 'string' }, passed: { type: 'boolean' },
  }, required: ['question', 'answer', 'passed']
}

const STEP5_SCHEMA = {
  type: 'object', properties: {
    conclusion: { type: 'string', minLength: 50 },
    reasoning_chain: { type: 'string', description: '从Step2→3→4到结论的推理链' },
    what_if_wrong: { type: 'string' },
    self_check: { type: 'array', items: SELF_CHECK_ITEM, minItems: 5, maxItems: 5 },
    all_clear: { type: 'boolean', description: '自检全部通过' },
    follow_up_signals: { type: 'array', items: { type: 'string' }, description: '后续观察信号' },
  }, required: ['conclusion', 'reasoning_chain', 'self_check', 'all_clear']
}

// ═══ 管道执行 ═══

const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无Step1输入)'

log('用户请求: ' + userRequest)
log('Step1输入: ' + (typeof step1Result === 'string' ? step1Result : JSON.stringify(step1Result)))

// ── Step 2: 6尺度发散 ──
phase('6尺度发散')

const step2 = await agent(`你是MCTS-TD框架的"发散师"。你的任务是执行6尺度发散分析。

输入（来自Step1需求发散）:
${JSON.stringify(step1Result, null, 2)}

原始用户请求: ${userRequest}

注意：Step1中标注的"待验证假设"和"确定度"是你的出发点。
- 确定度低的维度 = 需要更多发散的焦点
- 待验证的假设 = 在发散中专门寻找支持或反驳的证据
- 如果用户访谈中暴露了矛盾（比如用户说"要短期"又"要保守"），这是最重要的发散起点

从以下6个观测位置审视问题。每个位置代表一种完全不同的认知尺度——不是"从6个角度看",而是"成为6种不同的存在":

① 全局视角（鲲鹏之视）: 从最高处俯瞰，系统的真正边界在哪？问题在整个系统中的位置是什么？
② 微观视角（蜩鸠之视）: 日常接触的细节中，宏观分析遗漏了什么？具体痛点是什么？
③ 短期视角（朝菌之视）: 如果只有极短时间，第一优先是什么？什么看似重要但其实可以放弃？
④ 长期视角（冥灵之视）: 极长时间尺度下，什么是不可改变的？10年后的影响链是什么？
⑤ 自然演化视角（列子御风）: 如果不做干预，事物会自然走向哪里？最小干预点在哪？
⑥ 无立场视角（至人无己）: 剥离所有个人立场和利益偏向，系统最优解是什么样的？

约束:
- 每个视角必须输出至少20字的洞见和40字以上的具体分析
- 6个视角必须完全独立，不能相互重复
- 最后必须综合出视角间的矛盾点和共识点`, {
  label: 'Step2: 6尺度发散',
  phase: '6尺度发散',
  schema: STEP2_SCHEMA,
})

log('Step2完成: ' + step2.perspectives.length + '个视角')

// ── Step 3: 八卦镜8维检查 ──
phase('八卦镜8维')

const step3 = await agent(`你是MCTS-TD框架的"检查师"。你的任务是执行八卦镜8维交叉检查。

输入（来自Step2发散结果）:
${JSON.stringify(step2, null, 2)}

原始用户请求: ${userRequest}
Step1假设清单: ${JSON.stringify(step1Result?.assumptions || "(未提供)")}

注意交叉引用Step1的假设校验：
- Step1中"待验证"的假设——8维检查能否提供验证/反驳？
- 低确定度维度——是否被Step2覆盖？
- 已发现的矛盾——8维中是否有更深层原因？


从8个独立维度交叉审视问题。每个维度必须:
1. 输出具体分析（至少30字）
2. 给出维度评分（0-10）
3. 交叉引用至少1个Step2的视角（说明哪个视角揭示了此维度的关键信息）

8个维度:
☰ F1 动力(Source of Force): 驱动力来自哪？内生还是外生？可持续性如何？
☷ F2 根基(Foundation): 基础条件是什么？现有资源匹配度如何？基础能力的边界在哪？
☳ F3 扰动(Change/Disruption): 哪里可能出意外？不稳定因素？翻转点？
☴ F4 渗透(Penetration): 影响如何扩散？阻力最小路径？传导链条？
☵ F5 风险(Risk/Abyss): 最坏情况？不做是否更好？下行空间？
☲ F6 表象(Visible/Dependent): 表面依赖什么？被忽视的支撑？名实是否一致？
☶ F7 边界(Boundary): 绝不可越过的线？停下的保护与局限？
☱ F8 平衡(Convergence/Balance): 各方利益均衡点？取舍优先级？

完成后做交叉分析: 至少3组维度冲突对 + 最异常发现

约束:
- 每个维度必须交叉引用Step2的视角（cross_ref字段）
- 8个维度全部完成，每个至少30字分析
- 维度冲突至少3组`, {
  label: 'Step3: 八卦镜8维',
  phase: '八卦镜8维',
  schema: STEP3_SCHEMA,
})

log('Step3完成: ' + step3.dimensions.length + '个维度, ' + step3.conflicts.length + '组冲突')

// ── Step 4: 多场景推演 ──
phase('多场景推演')

const step4 = await agent(`你是MCTS-TD框架的"推演师"。你的任务是执行多场景推演。

输入（来自Step3八卦镜结果）:
${JSON.stringify(step3, null, 2)}

原始用户请求: ${userRequest}

基于Step3的维度冲突，提炼出至少2个逻辑上自洽的方向，每个方向做3场景推演。

场景结构（每个方向都必须包含）:
- 乐观场景(20-30%): 有利假设全部成立时的成功路径 + 前置信号
- 现实场景(40-50%): 部分成立、部分偏离时的预期路径 + 关键变量
- 悲观场景(20-30%): 第一个脆弱假设失效后的失败路径 + 止损信号

约束:
- 每个方向必须引用其来源的Step3维度冲突（conflict_source字段）
- 至少2个方向
- 每个场景必须包含: 概率标签、路径描述(30字+)、观察信号、断裂假设
- 最后必须给出跨方向对比和风险偏好推荐`, {
  label: 'Step4: 多场景推演',
  phase: '多场景推演',
  schema: STEP4_SCHEMA,
})

log('Step4完成: ' + step4.directions.length + '个方向')

// ── Step 5: 收敛与自检 ──
phase('收敛自检')

const step5 = await agent(`你是MCTS-TD框架的"收敛师"。你的任务是执行收敛判断和自检。

输入（来自Step4推演结果）:
${JSON.stringify(step4, null, 2)}

原始用户请求: ${userRequest}
Step2发散输出: ${JSON.stringify(step2, null, 2)}
Step3八卦镜输出: ${JSON.stringify(step3, null, 2)}

5.1 输出综合判断:
- 用日常语言输出结论（不使用框架术语）
- 包含: what（结论）+ why（从Step2→3→4的推理链）+ what if wrong（反向假设）
- 用户可以跟着推理走

5.2 自检5问（每问必须回答，passed必须明确true/false）:
① Step2的6个视角是否有1个被赋予了过多权重？如果权重最低的视角才是对的？
② Step3的8维分析中最异常的发现是否在最终结论中体现？
③ Step4的推演中哪个方向被排除？排除理由是否充分？
④ Step2→3→4的推理链是否有断裂？（某步的结论被后续忽略了）
⑤ 如果完全错了，第一步错在哪？如何纠正？

5.3 如果自检发现漏洞→在结论中标注"待确认"并说明。

约束:
- 自检5问必须全部回答，passed必须true/false
- all_clear=true表示自检全部通过
- follow_up_signals至少2个后续观察信号
- conclusion必须50字以上包含what+why+what_if_wrong`, {
  label: 'Step5: 收敛与自检',
  phase: '收敛自检',
  schema: STEP5_SCHEMA,
})

log('Step5完成: 自检' + (step5.all_clear ? '全部通过' : '有风险'))

// ═══ 返回结果 ═══

log('╔═══════════════════════════════════════════╗')
log('║  5步管道完成 — 返回结构化分析结果         ║')
log('╚═══════════════════════════════════════════╝')

return {
  user_request: userRequest,
  step2: {
    perspective_count: step2.perspectives.length,
    contradictions: step2.contradictions,
    consensus: step2.consensus,
  },
  step3: {
    dimension_count: step3.dimensions.length,
    key_finding: step3.key_finding,
    top_conflicts: step3.conflicts.slice(0, 3),
  },
  step4: {
    direction_count: step4.directions.length,
    recommendation: step4.recommendation,
  },
  step5: {
    conclusion: step5.conclusion,
    reasoning_chain: step5.reasoning_chain,
    what_if_wrong: step5.what_if_wrong,
    all_clear: step5.all_clear,
    follow_up_signals: step5.follow_up_signals,
    self_check_passed: step5.self_check.filter(s => s.passed).length + '/' + step5.self_check.length,
  },
}
