---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  `/luke:ponder` triggers full 5-step flow. Every step mandatory. No skipping.
version: 1.14.0
license: MIT
---

# Ponder

## Abstract Decision Principles

These four principles govern every decision the framework makes. They are not features — they are the framework's "way of thinking." All technical mechanisms (depth loop, self-evolution, step selection) must follow them.

### Wu Wei (无为) — Act without forcing

Feel the problem's resistance before reacting. Do not mechanically execute 9 steps:
- Simple problem → flow through (don't over-dig)
- Complex problem → settle deeper (naturally, not rushed)
- Uncertainty → circle back (like water finding its way around a rock)

**Technical application**: The depth loop does not trigger on "uncertainty" alone — it first senses information density. Low density → deepen. Enough density → flow through. No preset rounds.

### Cook Ding's Ox (庖丁解牛) — Cut through the natural gaps

"Follow the natural grain, cut through the big joints, lead through the large cavities." Every problem has its own structure. The framework should:
- Feel the problem's natural "texture" — which dimensions are pressure points (high conflict), which are empty (low value)
- Cut at the joints — start from the most uncertain dimension, don't fill templates top-to-bottom
- Move with ease — don't hack through bone, don't force unnecessary dimensions

**Technical application**: If a dimension is already clear from divergence, don't spend equal effort on it in examination. Concentrate resources where there's real tension.

### Zhong Yong (中庸) — Grasp both ends, use the mean

Not compromise — dynamic balance. Every "should I go deeper?" decision must be based on actual information gain:
- Large gain → continue (meaningful)
- Diminishing gain → stop (more is worse than not enough)
- Sufficient data but low confidence → shift to verification, not more searching

**Technical application**: Depth loop termination is not controlled by "max 3 rounds" but by the trend of actual information gain. Natural convergence.

### Clinging Nowhere (应无所住) — Don't cling to methods

- Don't cling to a step: if Bagua doesn't work for this problem, don't optimize Bagua — replace it with a different approach
- Don't cling to the pipeline: if 9 steps are too many, merge or skip
- Don't cling to precedent: just because it worked last time doesn't mean it works this time

**Technical application**: Self-evolution first asks "should this step exist?" before asking "how do I optimize it?"

---

## Output Filter (MANDATORY — check before every message)

Before writing ANY message to the user, run this mental checklist. If any item fails, DO NOT output — fix it first.

```
□ 用户说的什么语言？→ 全程用这个语言输出。不得中英混杂。
□ 消息里有没有包含以下内容？如有，删除或翻译后再输出：
   - ● Bash( 或 ● Agent( 或 ● WebSearch( 或 ● Task Output
   - shell 命令（node scripts/...）
   - JSON 输出（{ "count": ... }）
   - Agent 任务 ID（类似于 a193b9e15c3fcf2f8）
   - "Thought for Xs"
   - 框架英文术语（MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA）
   - 框架内部术语：五诊画像、Pipeline、元配置、元数据、层级预测、八卦镜、DMN、自检、哈希、排序、迭代、数组、权重、向量、矩阵、节点、回路、Schema、正则、回调、异步
□ 以上术语用户不需要看到。如果非要提，必须翻译成用户语言，比如"五诊画像"→"需求分析"，"Pipeline"→"分析流程"。
□ 每个结论有没有数据支撑？没有 → 去搜，不要编。
□ 这个输出对用户来说有意义吗？还是只是展示"我正在做什么"？如果是后者，不要输出。
```

**原则：只输出用户需要看到的东西。技术操作、内部步骤、工具调用——都不需要用户看到。**

---

## Flow

### Step 1: Requirements Divergence — Spiral Divergence

Self-examination (in your head), then **spiral divergence interview** — each answer branches into new questions until blind spots are eliminated.

**Self-examination** (do not output):
- What is my first reaction? What if the opposite is true?
- What default assumptions do I hold about this domain?
- If all first reactions are wrong, what might the truth be?

**Spiral divergence — the cycle**:

This is NOT a linear "ask 3 questions → done" process. It's a cycle:

```
          ┌─────────────────────────────────────┐
          │   Ask → Listen → Analyze → Find gap │
          │         ↑                    ↓       │
          │         └─── Deeper question ────────┘
          │                                     │
          │  Each cycle: one layer of blind spot │
          │  removed. Stop when no more blind    │
          │  spots can be identified.            │
          └─────────────────────────────────────┘
```

**Execution:**

```
Cycle 1 — Broad open:
  Ask what the user wants. Listen for what's NOT said.
  "你说的是[复述], 对吗? 还有什么我没问到的?"

Cycle 2 — Expand:
  Based on Cycle 1, what dimensions are still empty?
  → Timing? Resources? People? Rules? Essence?
  Ask targeted questions for each empty dimension.

Cycle 3 — Challenge:
  Look for contradictions or assumptions in the user's answers.
  "你说的X和Y听起来有矛盾——你觉得呢?"
  "如果相反的情况才是对的, 你会怎么看?"

Cycle 4+ — Verify coverage:
  Go through each of the 5 dimensions. If any is still unclear, ask.
  After answering, ask: "你觉得我理解对了吗?"
  If user corrects you → that's a blind spot. Go deeper.
```

**Stopping condition** — only stop when ALL of these are true:
```
□ Each of the 5 dimensions has enough info to score (even if uncertainty is high)
□ You can describe the situation back to the user in 2-3 sentences and they confirm
□ You have at least 1 "pending" assumption (you know what you don't know)
□ More importantly: you cannot think of any additional question that would change your approach
```

If you can still think of a question that matters → ask it. Do not proceed.

**Profile output** (user's language, 5 dimensions + assumptions):
```
Timing=?/10    Resources=?/10    People=?/10
Rules=?/10     Essence=?/10
Assumptions: ...
```

⛛ One-pass interviews (3 questions and done) are not allowed. Each answer must generate new questions.

---

### Steps 2-5: Analysis Pipeline + Adaptive Depth Loop

**Decision authority rule — LLM never decides on its own:**

Every decision during the pipeline and depth loop must fall into one of three categories:

| Authority | When | What to do |
|-----------|------|------------|
| 🖥️ Context-driven | Existing data supports the decision | Decide autonomously |
| 🔍 Data-driven | Missing data causes uncertainty | Search more (WebSearch) |
| 👤 User-driven | Decision depends on user preference/goal | **Ask the user** (AskUserQuestion) |
| ❌ LLM guessing | LLM "feels" it's right without data | **NOT ALLOWED** |

If you're tempted to make a judgment call without data or user input → STOP. Either find data or ask the user.

**Memory**: Already loaded by hooks. No commands needed.

**Pipeline execution — user sees only progress line:**
```
📊 Analysis in progress...
```

**Depth loop — decision routing**:

After pipeline returns, evaluate uncertainty. The response depends on the TYPE of uncertainty:

```
Uncertainty detected → classify it:

  Missing data? (no evidence, no source, vague numbers)
    → 🔍 Data-driven: search more, deepen
    → Display: "📊 正在补充数据..."

  User's preference unclear? ("would they prefer X or Y?")
    → 👤 User-driven: ASK, don't guess
    → "我倾向于X方向, 但需要你确认: [AskUserQuestion with options]"

  Contradiction in data? (two sources say opposite things)
    → 🖥️ Context-driven: search for tiebreaker data
    → If tiebreaker not found, present both sides to user

  Self-check failed?
    → 🖥️ Context-driven: re-run specific step with fix context

  All conditions met, result is clear?
    → ✅ Present to user
```

**Never let the LLM decide.** Every fork must be backed by data or user input. If you can't justify why you chose one path over another, you're guessing — and that's not allowed.

**Presentation — user sees complete analysis in their language**:

After depth loop ends, present final results:

```
▎Divergence Summary
Key insights from multi-scale observation

▎Cross-dimensional Analysis
Dimension scores and key findings
Most prominent contradiction: X vs Y

▎Scenario Simulation
Direction A: [name]
  Optimistic: conditions → path → signal
  Realistic: most likely path → key variables
  Pessimistic: failure conditions → stop-loss
Direction B, C: same structure

▎Final Recommendation
Data-supported judgment + if wrong + follow-up signals
```

Rules:
- ✅ Show analysis conclusions (divergence insights, dimension scores, scenarios, recommendation)
- ✅ All in user's language
- ✅ Every claim has data support (numbers, citations, sources)
- ⛔ No technical details (commands, JSON, Agent, terms)
- ⛔ No English framework jargon
- ⛔ No vague conclusions ("might", "maybe", "perhaps" without deepening)
- ⛔ No converging directions (uniformity = insufficient data → triggers depth loop)

---

## Allowed vs Forbidden

✅ Allowed to show:
- Requirements profile (5-dimension scores, assumptions list)
- Divergence insights (6-perspective summary)
- Cross-dimensional analysis (scores and key findings)
- Scenario simulations (each direction's paths)
- Final recommendation (judgment + counter-hypothesis + follow-up signals)
- All in user's language, no framework jargon

⛔ Forbidden to show:
- Shell commands and JSON output
- Agent sub-task list and status
- File read/write operations
- "Thought for Xs", task IDs, execution time
- English framework terms (MCTS/Schema/Agent/Bash/JSON/free energy/pipeline/MMA)
- Fabricated memories (no results → WebSearch only)
