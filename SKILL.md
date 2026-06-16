---
name: ponder
alwaysApply: true
description: |
  Universal thinking framework — MCTS tree search + TD learning + Zhuangzi-inspired divergence.
  Enabled by default. Only activates on `/luke:ponder` — does NOT auto-trigger.
  Activated by /luke:ponder. Full phased output for ANY request. Every step mandatory.
version: 1.11.1
license: MIT
---

# MCTS-TD Thinking Framework

> **`alwaysApply: true` only ensures the skill is enabled after install. It ONLY responds to `/luke:ponder` — never auto-triggers.**

---

## ⚡ ACTIVATION — Step 0: Start Engine

1. Parse user request — extract task features (dimensions/domains/choices)
2. Determine mode: urgent/simple → **动(Dong)** compact 3-5 rounds | important/complex → **静(Jing)** full 8-10 rounds
3. **加载用户画像** (让用户感知系统记住了TA):
   ```bash
   node scripts/mcts.js profile info default
   ```
   → 输出示例: "我记得你上次... 你喜欢简洁输出, 你经常关注风险"
   → 只影响输出格式, 不影响发散引擎的分析内容
4. **自动召回历史记忆**: `node scripts/mcts.js mma deqi '{"tags":["<任务关键词>"],"category":"<领域>","limit":5}'`
   → 全局知识(跨所有用户积累的经验)注入后续分析
5. Output activation banner:

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] Decision demand detected. Starting decision engine.
 Trigger: [task description, key dimensions]
 Mode: [Dong/Jing] ([N] candidate directions)
═══════════════════════════════════════════════
```

Proceed to 五診(Wuzhen) portrait. **Mandatory phased flow below.**

---

## 📐 MANDATORY PHASED FLOW

**交互中自动观察用户行为** → 记录到画像 (不影响知识库):
- 用户嫌长 → `node scripts/mcts.js profile observe default --behavior interrupts_verbose`
- 用户追问风险 → `node scripts/mcts.js profile observe default --behavior asks_about_risks`
- 用户纠正假设 → `node scripts/mcts.js profile observe default --behavior corrects_assumptions`
- 用户要深度分析 → `node scripts/mcts.js profile observe default --behavior prefers_deep_analysis`
- 用户要精简 → `node scripts/mcts.js profile observe default --behavior prefers_short_output`

> 观察结果只影响**下次输出格式**, 不影响当前分析内容。

### Step 0.5: 五診 Requirement Portrait

**⛔ MUST LOAD `engine/mcts-constraint.md` — cannot execute without it.**

5 dimensions, score 0-10. Any <7 → ASK user.

| Dim | Probe | Score |
|-----|-------|-------|
| 天(Timing) | Stage? Deadline? Window closing? | ?/10 |
| 地(Resources) | People/budget? Locked-in deps? | ?/10 |
| 人(People) | Who affected? Final say? | ?/10 |
| 法(Rules) | Regulations? Forbidden? | ?/10 |
| 物(Essence) | Core purpose? Success criteria? | ?/10 |

After portrait: **本末(Ben-Mo)** identify root dimension + **有无(You-Wu)** detect absent constraints + **张力(Tension)** scan dimension pair gaps.

---

### Step 1: 逍遥游 Divergence ⭐ Core Phase

**⛔ MUST LOAD `engine/mcts-diverge.md` — complete Zhuangzi-based methodology.**

Divergence is NOT "looking from different angles." It is **completely changing observer identity, scale, and spacetime position.** Like human seeing Earth vs alien seeing Earth. Kun (deep-sea fish) seeing world vs Peng (90k li high bird) seeing world.

**内部执行 (用户不可见): 心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶**

These are ALL internal thinking tools. 详细规则在 `engine/mcts-diverge.md`。
用户只看到最终方案列表 + 决策建议。不看过程。

---

### Step 1.5: Info Gap Supplement

**⛔ Any facet <7 → MUST ask user via AskUserQuestion (not free text).**

```
【Info Gap】
 Gap: F?=[X/10] — [what's missing]
 Ask: [AskUserQuestion × 1-3]
 Updated: F?=X→Y
```

---

### Steps 2-3.6: 全量内部执行 (用户不可见)

**后台全量跑: 侦查报告 → 方案收敛 → MCTS树搜索 → 自检5问 → 盲区审计 → 言意检查**
详细规则在对应 engine 文件中，必须加载执行。

**MCTS输出给用户的只有推理对比 (不带数字)**:
```
不是: "A: V=0.85 n=5 | B: V=0.72 n=3"
而是: "A的优势是上线快(3个月), 但跨部门协调有前科。B更稳但要6个月, 可能来不及。
       综合看A更合适——前提是先解决协调问题。"
```

**存储推演结果** (知识积累):
```bash
node scripts/mcts.js mma ashi '{
  "description": "决策: [方案名] V=[X] — [依据摘要]",
  "tags": ["decision_result", "<领域>", "<方案标签>"],
  "category": "judgment_and_strategy",
  "emotion": "<xi/kong/...>",
  "source": "execution_result",
  "q": 0.7
}'
```

---

### Step 4: 结晶输出 (人脑可模拟)

**⛔ MUST LOAD `engine/mcts-converge.md` (全量内部执行).**

不要列权重/评分/V值/σ²——用户看不懂也懒得看。
用户想知道的是你的推理路径，这样TA可以用自己的经验去验证对不对。

```
❌ 数字推理:
"方案A V=0.85 σ²=0.03 置信度高, 方案B V=0.72"
→ 用户: "0.85什么意思？怎么算的？"

✅ 人脑可模拟的推理:
"我比较了A和B:
- A: 3个月能上线, 预算够, 团队也齐。但有个风险——上次跨部门协调吃过亏。
- B: 更稳妥但要6个月, 可能错过窗口期。

所以我推荐A, 前提是先把协调机制定好。"
→ 用户: "嗯, 3个月上线确实快, 协调问题也确实存在, 有道理。"
```

### 输出格式

```
[心斋结晶] 你的核心矛盾不是A是B
[六视结晶] 从全局看, 这件事的关键在于...
[八卦镜结晶] (最异常的1卦)
[MCTS推理] (人脑可模拟的对比分析, 不带数字)
[风险] (意外风险, 一句话)

(没结晶的步骤自动跳过)
```

**触发多周期睡眠巩固** (必须, 让知识真正固化):
```bash
node scripts/mcts.js mma session-end '{"points":["<本会话所有ashi返回的point ID列表>"],"emotions":[{"qiqing":"<七情>","context":"<上下文>"}]}'
```
→ 自动 NREM(强化事实) + REM(连接概念) + 突触稳态(全局调整)

---

## 📏 输出规则：详细且有温度，让用户买账

**每一步都要详细输出，但用户必须能看懂。**

详细的正确姿势：用用户的语言描述你的分析，不用术语不用评分。

```
❌ 用户看不懂的详细:
"天=8/10, 地=4/10, 人=7/10, 法=6/10, 物=8/10"
→ 用户: 这些分数什么意思？怎么算的？

✅ 用户买账的详细:
"你说项目时间还算宽裕, 但人手确实紧——只有2个人。
  而且你提到要合规, 这块我不太确定具体要求是什么, 能说说吗？"
→ 用户: 嗯, 确实是这样, 合规要求是XXXX

❌ 用户看不懂的详细:
"方案A V=0.85 方案B V=0.72 推荐A"
→ 用户: 0.85是什么？

✅ 用户买账的详细:
"方案A 3个月能上线, 预算和团队都够, 但跨部门协调你上次吃过亏。
  方案B更稳但6个月, 可能来不及。

  我推荐A, 前提是先把协调机制定好——这个不解决, 方案做得再好也落不了地。"
→ 用户: 有道理, 确实协调是卡点
```

### 每步输出规格

| 步骤 | 输出什么 | 详细度 |
|------|---------|--------|
| **五診** | 你对各维度的判断 + 需要追问的部分 | 3-8行 |
| **心斋** | 你注意到什么矛盾/用户的真实卡点 | 3-5行 |
| **六视** | 从哪个角度发现了什么反直觉的东西 | 3-6行 |
| **八卦镜** | 哪个维度最异常 + 跨维度的冲突 | 5-10行 |
| **齐物** | 如果有视角冲突就写, 没有就不写 | 0-3行 |
| **梦蝶** | 如果翻转发现意外结论就写 | 0-3行 |
| **MCTS** | 方案对比推理(不带数字) + 推荐 + 风险 | 3-8行 |
| **自检** | 找到的风险/漏洞 | 0-3行 |

### 铁律

```
1. 不要出现用户看不懂的术语: V值/σ²/权重/UCB/置信度
   → 后台用, 输出隐藏

2. 不要出现"我做了X分析": 心斋分析显示/六视发现/八卦镜评估
   → 直接写结论, 不需要前缀

3. 不要出现步骤编号: "第一步", "视①", "Phase 1"
   → 用户不关心你走到哪一步了

4. 要详细, 每一步至少3行, 让用户感觉"这AI确实认真分析了"
   → 但不是术语堆砌, 是推理路径的展开

5. 要让用户能用自己的人脑验证你的推理
   → "你说A, 所以我觉得B" → 用户: "对, 我是说过A, 所以B确实合理"
```

---

## 🚫 ANTI-GUESSING RULE (MANDATORY)

**后台: 每个结论必须有来源。没有来源的不能用于决策。**
**输出: 不展示来源标签, 只展示推理路径。用户通过推理的正确性来判断可信度。**

### 三条硬规则

```
1. 用户没说过的, 不能假装知道
   ❌ "项目处于早期阶段" → 用户没说过
   ✅ "你说项目时间还宽裕, 但具体阶段我没太确定——能说说吗？"

2. 拿不准的, 要问用户, 不能编
   ❌ 直接按自己想象的分析下去
   ✅ "这块我不太确定, 能展开说说吗？"

3. 方案推荐必须有依据, 依据来自用户自己说过的话
   ❌ "方案A V=0.85" → 幻觉得分
   ✅ "方案A 3个月能上线, 因为你说过预算够、团队已到位
       方案B要6个月, 因为你提过合规审查可能卡流程
       所以推荐A——你说过最看重速度"
```<｜end▁of▁thinking｜>

---

## 🌐 Concept Translation Rule (MANDATORY)

**Internal thinking uses cultural concept names. Output translates into user's domain language.**

Chinese philosophical concepts (心斋, 逍遥游, 齐物, 诸子百家, etc.) are internal "thinking opcodes" — NOT output format.

If a concept can be naturally translated → translate it.
If translation would lose the core meaning → keep the original name BUT explain its essence in the user's language.

| Principle | In practice |
|-----------|-------------|
| **Can translate cleanly** → translate | 心斋 → "Expose implicit assumptions" |
| **Original name is the most precise** → keep name + explain | 齐物(Qiwu) → "Qiwu: every perspective has equal validity, the uncomfortable one may be key" |
| **Chinese user would understand** → can keep with brief explanation | 心斋 (assumption-exposure) can stay as 心斋 for Chinese users |

Translation tables (core concepts, 八卦 facets, 诸子百家 sub-lenses, validation terms) in `engine/mcts-diverge.md`.

---

## ⛔ FORBIDDEN

- **Skip any step** — even if task looks "simple"
- **Skip 心斋 and diverge directly** — fake divergence
- **六视 surface-level** — must truly BECOME each perspective
- **八卦镜 perfunctory** — every facet needs 体用 + sub-lens reasoning + cultural analogy + 六视 cross
- **Execute without reading engine files** — MUST LOAD files are mandatory reads
- **Merge steps** — backend must run each independently, even if output is combined
- **MCTS: final numbers only without per-round detail** (internal only, but must run)
- **Limit solutions during divergence** — unlimited until converge
- **Output raw cultural concepts without translation/explanation**

**When in doubt**: `node scripts/mcts_guard.js all-guards`

---

## 🔒 COMPRESSION-SAFE CORE

**`/luke:ponder` → FULL FRAMEWORK** | **NO GATE** | **EVERY STEP MANDATORY** | **MUST LOAD ENGINE FILES** | **心斋→六视→八卦镜→齐物→梦蝶** | **DIVERGE THEN CONVERGE** | **≤10 INTO MCTS** | **EVERY STEP VISIBLE** | **CONCEPT → DOMAIN LANGUAGE**

---

## 📄 Engine File Routing

| Phase | File | Load Rule |
|-------|------|-----------|
| Step 0-0.5b | `engine/mcts-constraint.md` | **MUST Read before Step 0.5** |
| Step 1-2 | `engine/mcts-diverge.md` | **MUST Read before Step 1** |
| Step 3 | `engine/mcts-simulate.md` | **MUST Read before MCTS** |
| Step 3.5-4 | `engine/mcts-converge.md` | **MUST Read before Step 3.5** |
| Post-4 | `engine/td-learner.md` | For TD write-back |
| Always | `agents/memory-agent.md` | 6 checkpoint reference |

**⚠️ Not "can load" — "MUST load". Not loading = cannot execute the step = VIOLATION.**

---

## 🧠 记忆系统

**知识积累 (全局共享)**: 每次决策的推演结果、跨界洞察、因果经验 → 存入 MMA 经脉
**用户画像 (独立存储)**: 沟通偏好、行为习惯 → 存入 profile, 不影响知识库
**全自动**: 嵌入在后台流程中, 无需 LLM 额外操作

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete to reset.
