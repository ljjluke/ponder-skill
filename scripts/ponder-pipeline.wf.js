// MCTS-TD Self-Correcting Pipeline
// Generate → Critique → Refine loop with independent verification
// Inspired by Self-Refine (Madaan 2023) + ultragoal + BoT (prompt self-evolution)

export const meta = {
  name: 'ponder-pipeline',
  description: 'Self-correcting pipeline: Step2(发散)→Step3(八卦镜)→Step4(推演)→Step5(收敛)→验证(独立Agent)→不通过回退',
  phases: [
    { title: '6尺度发散', detail: '从6个观测位置审视问题' },
    { title: '八卦镜8维', detail: '8维度交叉检查' },
    { title: '多场景推演', detail: '2-3方向×3场景模拟' },
    { title: '收敛自检', detail: '综合判断 + 5问自检' },
    { title: '独立验证', detail: 'fresh context找茬——主动证明分析有漏洞' },
  ],
}

// ═══════════════════════════════════════════════════════════════
//  Schema定义 — JSON Schema为强制约束，子Agent不可跳过
// ═══════════════════════════════════════════════════════════════

const MEMORY_TAG = { type: 'string', description: '用于mma deqi召回的标签' }

const PERSPECTIVE = {
  type: 'object', properties: {
    name: { type: 'string' },
    insight: { type: 'string', minLength: 20 },
    detail: { type: 'string', minLength: 40 },
    conflict_with: { type: 'array', items: { type: 'string' } },
    _memory_tag: MEMORY_TAG,
  }, required: ['name', 'insight', 'detail']
}

const STEP2_SCHEMA = {
  type: 'object', properties: {
    perspectives: { type: 'array', items: PERSPECTIVE, minItems: 6, maxItems: 6 },
    contradictions: { type: 'array', items: { type: 'string' }, minItems: 2 },
    consensus: { type: 'string', minLength: 30 },
  }, required: ['perspectives', 'contradictions', 'consensus']
}

const DIMENSION = {
  type: 'object', properties: {
    name: { type: 'string' },
    score: { type: 'number', minimum: 0, maximum: 10 },
    analysis: { type: 'string', minLength: 30 },
    cross_ref: { type: 'string' },
    _memory_tag: MEMORY_TAG,
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
    break_point: { type: 'string' },
  }, required: ['probability', 'path', 'signal']
}

const DIRECTION = {
  type: 'object', properties: {
    name: { type: 'string' },
    conflict_source: { type: 'string' },
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
    reasoning_chain: { type: 'string', minLength: 50 },
    what_if_wrong: { type: 'string' },
    self_check: { type: 'array', items: SELF_CHECK_ITEM, minItems: 5, maxItems: 5 },
    all_clear: { type: 'boolean' },
    follow_up_signals: { type: 'array', items: { type: 'string' }, minItems: 2 },
  }, required: ['conclusion', 'reasoning_chain', 'self_check', 'all_clear']
}

// ── 独立验证 Schema ──
// 验证Agent是独立上下文，任务是主动找茬（不是检查格式，是证明分析有漏洞）
const VERIFY_SCHEMA = {
  type: 'object', properties: {
    all_clear: { type: 'boolean', description: 'true=没有致命问题, false=发现问题需要回退' },
    verdict: { type: 'string', enum: ['PASS', 'REVISE_STEP2', 'REVISE_STEP3', 'REVISE_STEP4', 'REVISE_STEP5'] },
    issues: { type: 'array', items: { type: 'object', properties: {
      step: { type: 'number', description: '问题所在的步骤编号(2-5)' },
      severity: { type: 'string', enum: ['critical', 'major', 'minor'] },
      detail: { type: 'string', minLength: 30 },
      evidence: { type: 'string', description: '从分析内容中引用的具体证据' },
    }, required: ['step', 'severity', 'detail'] }, minItems: 1 },
    what_was_missed: { type: 'string', description: '分析遗漏了什么关键维度？' },
    fix_prompt: { type: 'string', description: '给修复步骤的具体修复指示' },
  }, required: ['all_clear', 'verdict', 'issues', 'what_was_missed']
}

// ═══════════════════════════════════════════════════════════════
//  管道执行 — 自校验循环
// ═══════════════════════════════════════════════════════════════

const userRequest = args?.user_request || '(未提供)'
const step1Result = args?.step1 || '(无Step1输入)'
const pluginPath = args?.plugin_path || ''
const memoryContext = args?.memory_context || '(无历史记忆上下文)'

const memoryRecallNote = pluginPath
  ? `【记忆参与说明】\n在开始分析前，运行以下命令召回历史相关经验:\n  node ${pluginPath}/scripts/mcts.js mma deqi '{"tags":["<分析相关关键词>"],"limit":3}'\n将召回结果作为本步骤分析的参考输入。\n完成分析后，在你的输出中标记最有记忆价值的洞见（_memory_tag字段）。\n当前已有记忆上下文: ${memoryContext}\n`
  : ''

log('用户请求: ' + userRequest)
log('记忆上下文: ' + (memoryContext ? '有' : '无'))
log('插件路径: ' + (pluginPath || '未提供'))

const MAX_LOOPS = 2
let loopCount = 0
let fixContext = ''
let lastVerdict = ''

// ── 自校验主循环 ──
do {
  loopCount++
  if (fixContext) {
    log('═══════════════════════════════════════════════')
    log('  第 ' + loopCount + ' 轮修复循环 — 基于验证反馈重做')
    log('  修复上下文: ' + fixContext.substring(0, 100))
    log('═══════════════════════════════════════════════')
  }

  // ── Step 2: 6尺度发散 ──
  phase('6尺度发散')

  const step2 = await agent(`你是MCTS-TD框架的"发散师"。你的任务是执行6尺度发散分析。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step1需求发散）:
${JSON.stringify(step1Result, null, 2)}

原始用户请求: ${userRequest}

Step1中标注的"待验证假设"和"确定度"是你的出发点。
- 确定度低的维度 = 需要更多发散的焦点
- 待验证的假设 = 在发散中专门寻找支持或反驳的证据
- 如果用户访谈中暴露了矛盾，这是最重要的发散起点

从6个完全不同的观测位置审视问题——不是"从6个角度看",而是"成为6种不同的存在":

① 全局视角（鲲鹏之视）: 从最高处俯瞰，系统的真正边界在哪？
② 微观视角（蜩鸠之视）: 日常细节中宏观遗漏了什么？
③ 短期视角（朝菌之视）: 极短时间内的第一优先级？
④ 长期视角（冥灵之视）: 什么不可改变？10年尺度影响？
⑤ 自然演化视角（列子御风）: 不做干预会走向哪？
⑥ 无立场视角（至人无己）: 剥离立场后的系统最优解？

约束:
- 每个视角至少20字洞见+40字分析
- 6个视角必须真正不同，不能相互重复
- 最后综合出矛盾点和共识点`, {
    label: 'Step2: 6尺度发散',
    phase: '6尺度发散',
    schema: STEP2_SCHEMA,
  })

  log('Step2完成: ' + step2.perspectives.length + '个视角')

  // ── Step 3: 八卦镜8维检查 ──
  phase('八卦镜8维')

  const step3 = await agent(`你是MCTS-TD框架的"检查师"。你的任务是执行八卦镜8维交叉检查。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step2发散结果）:
${JSON.stringify(step2, null, 2)}

原始用户请求: ${userRequest}
Step1假设清单: ${JSON.stringify(step1Result?.assumptions || '(未提供)')}

注意交叉引用Step1的假设校验：
- Step1中"待验证"的假设——8维检查能否验证/反驳？
- 低确定度维度——是否被Step2覆盖？
- 已发现的矛盾——8维中是否有更深层原因？

从8个独立维度交叉审视，每个维度:
1. 至少30字分析
2. 评分0-10
3. 交叉引用至少1个Step2的视角

☰ F1 动力: 驱动力来源？可持续性？
☷ F2 根基: 基础条件？资源匹配度？
☳ F3 扰动: 意外在哪？翻转点？
☴ F4 渗透: 扩散路径？阻力最小切入点？
☵ F5 风险: 最坏情况？下行空间？
☲ F6 表象: 被忽视的支撑？
☶ F7 边界: 不可越过的线？
☱ F8 平衡: 利益均衡点？

完成后: 至少3组维度冲突对 + 最异常发现`, {
    label: 'Step3: 八卦镜8维',
    phase: '八卦镜8维',
    schema: STEP3_SCHEMA,
  })

  log('Step3完成: ' + step3.dimensions.length + '个维度, ' + step3.conflicts.length + '组冲突')

  // ── Step 4: 多场景推演 ──
  phase('多场景推演')

  const step4 = await agent(`你是MCTS-TD框架的"推演师"。你的任务是执行多场景推演。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step3八卦镜结果）:
${JSON.stringify(step3, null, 2)}

原始用户请求: ${userRequest}

基于Step3的维度冲突，提炼出至少2个方向，每个方向做3场景推演。
每个方向必须引用来源的Step3维度冲突。

场景结构:
- 乐观(20-30%): 成功路径 + 前置信号 + 假设条件
- 现实(40-50%): 预期路径 + 关键变量
- 悲观(20-30%): 第一个断裂点 + 止损信号

约束:
- 至少2个方向，每个3场景
- 每个场景含: 概率、路径(30字+)、信号、断裂假设
- 最后给出跨方向对比和风险偏好推荐`, {
    label: 'Step4: 多场景推演',
    phase: '多场景推演',
    schema: STEP4_SCHEMA,
  })

  log('Step4完成: ' + step4.directions.length + '个方向')

  // ── Step 5: 收敛与自检 ──
  phase('收敛自检')

  const step5 = await agent(`你是MCTS-TD框架的"收敛师"。你的任务是执行收敛判断和自检。

${memoryRecallNote}
${fixContext ? '【本轮是修复重做】\n上一轮验证发现的问题:\n' + fixContext + '\n请务必解决这些问题。\n' : ''}
输入（来自Step4推演结果）:
${JSON.stringify(step4, null, 2)}

原始用户请求: ${userRequest}
Step2发散: ${JSON.stringify(step2, null, 2)}
Step3八卦镜: ${JSON.stringify(step3, null, 2)}

5.1 综合判断（用日常语言，不出现框架术语）:
- what（结论）+ why（Step2→3→4推理链）+ what if wrong（反向假设）

5.2 自检5问（每问必须回答，passed必须true/false）:
① Step2的6视角是否有过重依赖某个视角？
② Step3最异常发现是否在结论中体现？
③ Step4排除的方向理由充分吗？
④ 推理链是否有断裂？
⑤ 完全错的话第一步在哪？

5.3 有漏洞→标注"待确认"并说明

约束: 自检5问全部回答、all_clear明确、follow_up_signals至少2个、结论含what+why+what_if_wrong`, {
    label: 'Step5: 收敛与自检',
    phase: '收敛自检',
    schema: STEP5_SCHEMA,
  })

  log('Step5完成: 自检' + (step5.all_clear ? '全部通过' : '有风险'))

  // ── Step 5.5: 独立验证（fresh context，主动找茬） ──
  // 这是关键创新：验证Agent是全新的独立上下文
  // 它不知道Steps 2-5是怎么做的，只看最终输出
  // 它的任务是主动证明分析有漏洞，不是检查格式
  phase('独立验证')

  const verifyResult = await agent(`你是独立的分析验证审查员。你的唯一任务是: **主动找出下面这份分析报告的漏洞**。

你与原始分析完全独立。你没有看过Step1-5的过程。你只审查最终输出。

你的任务是"魔鬼代言人"——你必须假设结论是错的，然后寻找证据证明它错了。
如果你找不到任何致命问题，那说明分析是可靠的。

要检查的方面:
1. 逻辑断裂: 结论真的能从分析中推导出来吗？还是跳过了中间步骤？
2. 视角盲区: 有没有明显的视角被完全忽略了？
3. 假设脆弱: 分析中依赖的核心假设是什么？如果那个假设是错的呢？
4. 伪精确: 评分、概率有依据吗？还是为了满足格式随意给的数字？
5. 确认偏误: 分析是否只找了支持某个方向的证据，忽略了反面？
6. 3个最常见的死因:
   - Step2的6个视角实际上只有3-4个真正不同，其他是重复的
   - Step3的8维分析流于表面，没有真正交叉引用Step2
   - 推演中的场景概率无依据，"乐观/现实/悲观"只是三段标签

分析报告（来自Step2-5的汇总）:
---
用户请求: ${userRequest}
视角数量: ${step2.perspectives.length}
矛盾点: ${step2.contradictions.join(', ')}
8维得分: ${step3.dimensions.map(d => d.name + '=' + d.score).join(', ')}
关键发现: ${step3.key_finding}
推演方向: ${step4.directions.map(d => d.name).join(', ')}
推荐: ${step4.recommendation}
结论: ${step5.conclusion}
推理链: ${step5.reasoning_chain}
如果错了: ${step5.what_if_wrong}
自检结果: ${step5.self_check.map(s => s.question.substring(0, 20) + ':' + (s.passed ? '✅' : '⛔')).join(' | ')}
---

注意:
- 如果所有自检都通过了，你不应该简单地也直接通过——你要比自检更严格
- 自检可能过于乐观(self-bias)——你要发现自检没看到的问题
- 具体引用报告中的内容作为证据
- "all_clear=false" + 详细的fix_prompt = 最好的修复`, {
    label: '独立验证',
    phase: '独立验证',
    schema: VERIFY_SCHEMA,
  })

  lastVerdict = verifyResult.verdict
  const issueCount = verifyResult.issues?.length || 0

  log('验证结果: ' + verifyResult.verdict + ' (' + issueCount + '个问题)')
  if (verifyResult.issues?.length > 0) {
    for (const issue of verifyResult.issues) {
      log('  [' + issue.severity + '] Step' + issue.step + ': ' + issue.detail.substring(0, 80))
    }
  }

  // ── 判断是否通过验证 ──
  if (verifyResult.all_clear) {
    log('✅ 独立验证通过 — 分析可靠')
    break
  }

  // ── 未通过: 生成修复上下文 ──
  const criticalCount = verifyResult.issues.filter(i => i.severity === 'critical').length
  if (criticalCount > 0 && loopCount >= MAX_LOOPS) {
    log('⚠️ 仍有' + criticalCount + '个关键问题，已达最大修复轮次，输出带警告')
    break
  }

  fixContext = '【验证Agent发现的漏洞】\n'
    + verifyResult.issues.map(i => '[' + i.severity + '] Step' + i.step + ': ' + i.detail + (i.evidence ? '\n  证据: ' + i.evidence : '')).join('\n')
    + '\n\n【遗漏维度】' + (verifyResult.what_was_missed || '无')
    + '\n\n【修复指示】' + (verifyResult.fix_prompt || '请增加分析深度，确保每个步骤都充分完成')

  log('验证未通过: ' + issueCount + '个问题, 进入第' + (loopCount + 1) + '轮修复')

} while (loopCount < MAX_LOOPS)

// ═══════════════════════════════════════════════════════════════
//  返回结果 — 包含验证记录
// ═══════════════════════════════════════════════════════════════

log('╔═══════════════════════════════════════════╗')
log('║  自校验管道完成                            ║')
log('║  循环轮次: ' + loopCount + '                               ║')
log('║  最终裁定: ' + lastVerdict + '                           ║')
log('╚═══════════════════════════════════════════╝')

return {
  user_request: userRequest,
  loop_count: loopCount,
  final_verdict: lastVerdict,
  verified: lastVerdict === 'PASS',
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
  memory_tags: {
    step2: step2.perspectives.filter(p => p._memory_tag).map(p => p._memory_tag),
    step3: step3.dimensions.filter(d => d._memory_tag).map(d => d._memory_tag),
    step4: step4.directions.filter(d => d._memory_tag).map(d => d._memory_tag),
    insight_count: [...(step2.perspectives.filter(p => p._memory_tag)), ...(step3.dimensions.filter(d => d._memory_tag))].length,
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
