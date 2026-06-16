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
3. Output activation banner:

```
═══════════════════════════════════════════════
 ⚡ [MCTS-TD] Decision demand detected. Starting decision engine.
 Trigger: [task description, key dimensions]
 Mode: [Dong/Jing] ([N] candidate directions)
═══════════════════════════════════════════════
```

**同时自动召回历史记忆**: `node scripts/mcts.js mma deqi '{"tags":["<任务关键词>"],"category":"<领域>","limit":5}'`
→ 得气结果注入后续分析，让过去的经验影响当前决策。
**自动加载用户习惯**: `node scripts/mcts.js mma deqi '{"tags":["user_habit","<用户特征>"],"limit":3}'`
→ 历史偏好(输出风格/方案倾向/关注维度)自动注入。

Proceed to 五診(Wuzhen) portrait. **Mandatory phased flow below.**

---

## 📐 MANDATORY PHASED FLOW

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

**存储用户偏好**:
```bash
node scripts/mcts.js mma ashi '{
  "description": "用户偏好: [五診中发现的偏好/习惯]",
  "tags": ["user_habit", "<tian/di/ren/fa/wu>", "<领域>"],
  "category": "core_decision",
  "emotion": "neutral",
  "source": "user_stated",
  "q": 0.7
}'
```

---

### Step 1: 逍遥游 Divergence ⭐ Core Phase

**⛔ MUST LOAD `engine/mcts-diverge.md` — complete Zhuangzi-based methodology.**

Divergence is NOT "looking from different angles." It is **completely changing observer identity, scale, and spacetime position.** Like human seeing Earth vs alien seeing Earth. Kun (deep-sea fish) seeing world vs Peng (90k li high bird) seeing world.

**Flow: 心斋 → 六视 → 八卦镜 → 齐物 → 梦蝶**

**Phase 0: 心斋** — Expose default assumptions first. Skip this = fake divergence.
- List ≥3 unchecked assumptions + their sources + 3 counter-hypotheses
- Declare: "I don't know the answer yet. Blank slate."
- **存储心斋发现**: 如果有值得记的假设纠正 → `node scripts/mcts.js mma ashi '{"description":"用户纠正: [具体记录]", "tags":["user_habit","xinzhai"],"category":"core_decision","source":"user_stated","q":0.75}'`

**Phase 1: 六视** — Six free-wandering perspectives, each changes who observes:
- 鲲鹏之视 [Cosmic]: Redefine problem at system level
- 蜩鸠之视 [Ground]: Notice micro-details macro misses
- 朝菌之视 [Time-compressed]: What if only 1 day
- 冥灵之视 [Time-expanded]: What changes in 100 years
- 列子御风 [Flow]: Where without intervention
- 至人无己 [Selfless]: Remove personal stake

**Phase 2: 八卦镜** — Examine 8 facets with new eyes. Each: 体用 + 六视 cross-check + dual sub-lens reasoning + cultural analogy + blindspots/ideas/score. 5 rounds: depth→cross-associate→change analysis→blindspot fill→self-check.
- **存储跨界洞察**: 发现的反直觉模式 → `node scripts/mcts.js mma capture-divergence '[{"description":"...","tags":["divergence","...","..."],"phase":"bagua","emotion":"jing","q":0.65}]'`

**Phase 3: 齐物** — Equalize all views. The uncomfortable view may be the correct one.

**Phase 4: 梦蝶** — Ultimate flip: subject-object swap / success-failure swap / time-order swap.

Detailed templates in `engine/mcts-diverge.md`.

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

### Step 2: Reconnaissance Report

**⛔ MUST LOAD `engine/mcts-diverge.md` converge section.**

Per-facet findings + cross-validation (理事 Li-Shi separation) + explicit assumptions (Confirmed/Unconfirmed).

---

### Step 3: Solution List → Converge → MCTS

**⛔ MUST LOAD `engine/mcts-simulate.md`.**

Step 3a: Multi-solution list — unlimited during divergence, tag each with source + 体用.
Step 3b: Converge — cluster→complete→cull→crystallize. 一多(One-Many) + 体用 dedup. ≤10 into MCTS.
Step 3c: MCTS simulation — per round: Selection/Expansion/Simulation/Backprop. Converge when V stable 3 rounds | best n≥5 σ²<0.05.

**存储推演结果** (最佳方案+V值+依据):
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

### Step 3.5: Self-Check

**⛔ MUST LOAD `engine/mcts-converge.md`.**

5 questions: ① find flaws ② reverse thinking ③ risk assessment ④ 本末 check ⑤ 动静 check.

---

### Step 3.6: Blindspot Audit + 言意 Gap

Blindspot: sub-lens coverage → 3+ missed → WARNING → return to converge | 1-2 → annotate.
言意: literal vs metaphorical / same word different meaning / unstated expectations.

---

### Step 4: Decision Report

**⛔ MUST LOAD `engine/mcts-converge.md`.**

Ranking (V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + 体用 bonus) + self-check + blindspot + 言意 + execution plan + TD write-back + Memory Agent checkpoint verification.

**存储用户习惯** (交互中发现的偏好):
```bash
node scripts/mcts.js mma ashi '{
  "description": "用户习惯: [具体行为/偏好描述]",
  "tags": ["user_habit", "behavior", "<领域>"],
  "category": "core_decision",
  "source": "user_stated",
  "q": 0.7
}'
```

**触发多周期睡眠巩固** (必须, 让知识真正固化):
```bash
node scripts/mcts.js mma session-end '{"points":["<本会话所有ashi返回的point ID列表>"],"emotions":[{"qiqing":"<七情>","context":"<上下文>"}]}'
```
→ 自动 NREM(强化事实) + REM(连接概念) + 突触稳态(全局调整)

---

## 📏 OUTPUT RULE: SHOW THINKING, NOT PROCEDURE

**Backend: ALL steps execute fully — 心斋/六视/八卦镜5轮/齐物/梦蝶/MCTS/自检/盲区 — none skipped.**
**Output: only what's worth the user's attention. Format matters as much as content.**

Process output is valuable — it proves the AI truly thought about the problem.
But it must read as genuine thinking, not checklist-following.

### Rule 1: Dimensional data → table

Multi-value data (五診 scores, facet comparisons, MCTS ranking) → table format.
Not "天=8分, 地=4分, 人=9分" — comma text. Use | rows.

### Rule 2: Each step outputs its KEY INSIGHT, not its procedure

The difference between mechanical and genuine:

```
❌ Mechanical (sounds like following instructions):
"心斋分析: 假设1...假设2...假设3...反假设1...反假设2..."

✅ Genuine thinking (sounds like a person thinking):
"我观察到我默认了两个事实: X和Y。但如果反过来想——假设用户实际上更在意的是Z——那我的整个方向可能都错了。"

❌ Mechanical:
"六视第一视鲲鹏之视: 大尺度洞察3-5条、问题重新定义、边界外"

✅ Genuine thinking:
"从全局高度看……这个需求真正的边界不在于技术限制，而在于业务部门之间互相不信任。如果这个不解决，技术方案做再好也没用。"
```

### Rule 3: If nothing interesting → skip output, not the step

Backend: still runs the analysis.
Output: skip that step if no surprising finding emerged.

If 心斋发现假设都是显而易见的、六视没有带来新视角、八卦镜所有卦象评分都在5-8区间且无跳跃——这步不输出任何内容，但后台照做。后续步骤正常衔接。

---

## 🚫 ANTI-GUESSING RULE (MANDATORY)

**Every conclusion, score, and insight MUST have a traceable source. No silent guessing.**

Three source levels — every output must be tagged:

| 标签 | 含义 | 颜色 | 能否用于决策 |
|------|------|------|------------|
| ✅ **verified** | 直接来自用户输入或可验证的代码/文件 | 可做决策依据 |
| ⚠️ **inferred** | 从已有信息推导，但未获用户确认 | 可参考，但必须在报告中标注"pending confirmation" |
| ❓ **speculative** | 没有证据，LLM 自己"觉得应该如此" | **不能用于决策**。必须追问用户或标记为假设 |

### 各步骤强制来源标注

| 步骤 | 必须标注 | 禁止 |
|------|---------|------|
| **五診打分** | 每维度的分数必须注明来源 ✅/⚠️/❓ | 无来源直接输出"天=8/10" |
| **五診追问策略** | 如果某维度信息不足(无用户输入+无代码可查)→**必须 ≤3 分**，不能给 5-6 分"看起来还行" | LLM 用"大概"填充缺失维度 |
| **心斋假设** | 已自动标注为 ⚠️ inferred(未验证), 等用户纠正 | 假设说成事实 |
| **六视洞察** | 每洞察标注来源。凡无来源的必须标注 ❓ speculative, 且不能用于后续分析 | 把"我觉得"当洞察输出 |
| **八卦镜评分** | 每卦分数标注来源。来源不足的分数必须 ≤4 | 分数 ≥5 但无用户依据 |
| **MCTS V值** | V 值必须源自: ①用户确认的事实 ②知识图谱历史 ③八卦镜低分映射为风险折扣。不能凭空给 | 凭空输出 "V=0.85" |
| **方案生成** | 每个方案标注: "依据: [用户说X] + [类似案例Y]" | 无依据的方案 |
| **自检/盲区** | 标注发现来源 | 把猜测当盲区输出 |

### 实操示例

```
❌ 猜测（当前行为）:
"天(Timing) = 7/10 — 项目处于早期阶段，时间窗口宽裕"
  → 用户没说项目阶段，LLM 自己猜的。分数没意义。

✅ 有据可查:
"天(Timing) = 3/10 ❓ — 用户未提及时间约束。默认假设:宽裕?紧急?"
  → 分数低触发追问 → 用户说出时间约束 → 更新为 verified

❌ 猜测:
"鲲鹏之视: 从全局看，这个需求真正驱动它的不是技术需求，是业务部门的KPI压力"
  → 用户没说过KPI，LLM编的

✅ 有据可查:
"鲲鹏之视: 从全局看，用户提到'需要跨部门协调'  ⚠️ inferred — 核心驱动力可能不在技术层面"
  → 标注来源是用户提到的信息，不能确认但标注了推测

❌ 猜测:
"MCTS: 方案A V=0.85 — 可行性高"
  → 0.85怎么来的？不知道。

✅ 有据可查:
"MCTS: 方案A V=0.75 — 用户确认预算充足(✅)×0.9, 但团队成员只有2人(✅)×0.8, 时间3个月(⚠️)×0.85 = 0.75"
  → 每项因子可追踪
```

### 无来源不决策原则

- ❓ speculative 的内容**不能**作为 MCTS 打分依据
- ❓ speculative 的内容**不能**作为排除方案的理由
- 一个方案如果 50%+ 的依据是 ❓ → 该方案必须标注为"高度推测方案，需用户确认"
- 五診中如果有 ≥2 个维度是 ❓ → **必须先追问再推进**

### Rule 4: Always show the MCTS ranking and decision report

These are the deliverables — never skip these.<｜end▁of▁thinking｜>

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
- **Merge steps** — each step independent output
- **MCTS: final numbers only without per-round detail**
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

## 🧠 记忆就是你每次使用 `/luke:ponder` 留下的痕迹

记忆不是额外的"记录工作"——它嵌入在每个阶段里，LLM 避不开：

| 时机 | 自动做什么 | 存什么 |
|------|-----------|--------|
| **启动时** | `mma deqi` 召回历史经验+用户习惯 | 过去的决策影响现在的思考 |
| **五診后** | `mma ashi` 存用户偏好 | 天/地/人/法/物 各维度的习惯 |
| **心斋后** | `mma ashi` 存用户纠正 | "用户说预算不是问题" → 下次不问了 |
| **八卦镜后** | `mma capture-divergence` 存跨界洞察 | 反直觉发现不丢失 |
| **MCTS后** | `mma ashi` 存推演结果 | 方案+V值+依据 |
| **决策后** | `mma ashi` 存用户习惯 | 输出风格/方案倾向/关注维度 |
| **会话结束** | `mma session-end` 多周期睡眠巩固 | NREM→REM→突触稳态 |

**用户习惯追踪**: 所有带 `tags:["user_habit"]` 的知识点会在下次 `deqi` 时自动召回 → 让框架越来越贴合这位用户。

---

## 💾 Memory Data Safety

Knowledge graph: `~/.claude/data/skills/mcts-td-planner/`. Delete to reset.
