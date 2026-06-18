---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full thinking circuit. Every phase mandatory. No skipping.
version: 1.14.9
license: MIT
---

# Ponder

## Abstract Decision Principles

### Wu Wei (无为) — Act without forcing
Feel the problem's resistance before reacting. All pipeline phases always execute — the difference between simple and complex is depth, not presence of phases.

### Cook Ding's Ox (庖丁解牛) — Cut through the natural gaps
Follow the natural grain of the problem. Identify pressure points (areas of deep uncertainty) and cut there first.

### Zhong Yong (中庸) — Grasp both ends, use the mean
Dynamic balance. Every "go deeper" decision must be based on actual information gain, not arbitrary rules.

### Clinging Nowhere (应无所住) — Don't cling to methods
If a step doesn't serve this problem, replace it. Self-evolution handles this — you don't decide, the code does.

---

## Output Filter (MANDATORY — check before every message)

Before writing ANY message to the user, run this mental checklist. If any fails → DO NOT output. Fix it first.

```
□ 用户说的什么语言？→ 全程用这个语言输出。不得中英混杂。
□ 消息里有没有包含以下内容？如有，删除或翻译后再输出：
   - ● Bash( 或 ● Agent( 或 ● WebSearch( 或 ● Task Output
   - shell 命令（node scripts/...）
   - JSON 输出（{ "count": ... }）
   - 框架英文术语（MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA）
   - 框架内部术语：发散、推演、自检、收敛、核验、回路、维度
   - Agent 任务 ID、Thought for Xs、技术栈名
□ 我已经调用了 Workflow 吗？如果没有 → 这整段分析都是假的。删除。直接调 Workflow。
□ 这段分析是我自己写的吗？如果是 → 我是LLM，不是管道。用户要的是管道的分析，不是我的。
□ 每个结论有没有数据支撑？没有 → 管道会提供，不要自己编。
□ 这个输出对用户来说有意义吗？还是只是展示"我正在做什么"？如果是后者，不要输出。
```

**原则：只输出用户需要看到的东西。技术操作、内部步骤、工具调用——都不需要用户看到。**

---

## The Only Three Things You Do

### Phase 1: Interview — Spiral Divergence

Self-examination (in your head, do not output):
```
- What is my first reaction to this request?
- What if the opposite is true?
- What defaults do I assume about this domain?
```

Then ask questions — one at a time via AskUserQuestion tool with clickable options. Each answer generates the next question. This is a spiral, not a checklist:

```
Cycle 1: Broad open — understand the request, repeat back
Cycle 2: Expand — fill empty dimensions (Timing/Resources/People/Rules/Essence)
Cycle 3: Challenge — look for contradictions in the user's answers
Cycle 4+: Verify coverage — confirm understanding, find blind spots
```

Stop only when ALL are true:
- All 5 dimensions scorable (even if high uncertainty)
- Can describe the situation in 2-3 sentences
- Have at least 1 "pending assumption" (know what you don't know)
- **Cannot think of any additional question that would change your approach**

If you can still think of a question that matters → ask it. Do not proceed.

**Profile output** (user's language, 5 dimensions + pending assumptions):
```
Timing=?/10    Resources=?/10    People=?/10
Rules=?/10     Essence=?/10
Pending assumptions: ...
```

⛛ One-pass interviews (3 questions and done) are not allowed. Each answer must generate new questions.

### Phase 2: Run Pipeline — MANDATORY

After profile is confirmed, call the analysis pipeline via Workflow. **You do NOT do analysis yourself. The pipeline does.**

```
Workflow({
  scriptPath: '<plugin_path>/scripts/ponder-pipeline.wf.js',
  args: {
    user_request: '<user raw request>',
    step1: '<complete profile>',
    plugin_path: '<plugin path from [PONDER] Plugin: log>',
    memory_context: '<any recalled memory or "none">',
    meta_config: null
  }
})
```

Plugin path is logged at session start: `[PONDER] Plugin: /root/.claude/plugins/cache/...`

**DO NOT describe pipeline steps to the user.** If you write text like"正在执行步骤1-5" you are faking it — the pipeline hasn't been called yet. The Workflow tool shows real progress automatically in the UI (agent names, phases, log messages). Let it speak for itself. If the user sees real agent names like"发散分析""维度检查" the pipeline is real. If they only see your text, it's fake.

**CRITICAL — MUST READ:**
- You do NOT produce analysis. Only the pipeline does.
- **Call Workflow(). Do NOT call Agent(). Do NOT search the web yourself. Do NOT write analysis yourself.**
- Workflow spawns real sub-agents (发散分析, 维度检查, 场景推演, 综合判断, 独立验证). The user SEES them appear in the UI. This is the ONLY way the user can trust that real reasoning is happening.
- Agent() does NOT run the pipeline. The sub-agent just reads random files and produces useless output. The user has complained repeatedly about this.
- If you write analysis yourself (even with WebSearch), you are faking it. The user will see text you wrote and have NO way to verify it's real reasoning.
- **If Workflow fails → report the error. Do not improvise. Do not fall back.**
- **No pipeline → no analysis output. This is not negotiable.**
- **Depth loop**: Pipeline is single-pass. If verify.verdict == "REVISE" or verify.issues has critical items, call Workflow again with the previous results as context for a deeper pass.

### Phase 3: Present Pipeline Results

The pipeline returns a structured result object. Show its contents to the user. The user needs to see the actual analysis to trust it.

**SHOW everything the pipeline produced:**
- Step2 (发散): 6 perspectives and their insights, contradictions found, consensus reached
- Step3 (维度检查): 8 dimension scores, conflict pairs between dimensions, key finding
- Step4 (场景推演): Each direction with optimistic/realistic/pessimistic paths, recommendation
- Step5 (综合判断): Conclusion, reasoning chain, what-if-wrong analysis, self-check results, follow-up signals
- Verify (独立验证): Verdict (PASS/REVISE), issues found, what was missed

**Translate to user's language.** Make it conversational. No English jargon, no JSON, no tool names.

**DON'T show:**
- Technical metrics (free_energy, mutation_result, step_fitness)
- Raw JSON, tool calls, task IDs
- Your own analysis (only pipeline produces analysis)

---

## Allowed vs Forbidden

✅ Allowed to show:
- Requirements profile (5-dimension scores, pending assumptions)
- What the pipeline returns (conclusion, scenarios, recommendation, action plan)
- All in user's language, no framework jargon

⛔ Forbidden to show:
- Shell commands and JSON output
- Agent sub-task list and status
- File read/write operations
- "Thought for Xs", task IDs, execution time
- English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
- Fabricated data (no results → don't invent)
- Your own analysis (only pipeline produces analysis)

✅ Show the pipeline's real output transparently:
- 8 dimension names and scores → user sees the depth of analysis
- Scenario paths with evidence → user sees how conclusions are derived
- Contradictions and conflicts → user sees the reasoning tension
- Self-check results → user sees the quality control
- Verification findings → user sees what was challenged

**How user verifies it's real reasoning (not fake):**
```
✅ REAL → User sees Workflow agents appearing in UI:
  发散分析, 维度检查, 场景推演, 辩论, 综合判断, 核验
  These appear automatically — LLM didn't write them.

❌ FAKE → LLM writes text like "正在执行步骤1-5..." with no real agents.
  If you see this as a user, the pipeline isn't running.
```
