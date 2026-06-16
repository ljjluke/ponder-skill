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

## 📏 输出规则：呈现每步结晶，不是呈现思考过程

**用户要的是你的洞察，不是你做了哪几步。**

每一步后台全量执行，但输出给用户的只有该步产生的**结晶**——跟流程无关，跟洞察有关。

```
后台执行                       输出结晶
─────────────────────────────────────────────
心斋(列3假设+3反假设)    →    "你提到X, 但我注意到你也说了Y, 这两个有点矛盾"
六视(6种尺度看问题)      →    "从全局看, 这个需求的边界不在技术而在业务信任"
八卦镜(8卦评分推理)       →    (结构化表格或一句话洞察, 选最意外的)
齐物(等视视角)            →    (如果视角冲突才输出)
梦蝶(翻转前提)            →    (如果有反转才输出)
MCTS(树搜索)              →    "推荐A, 理由:... 主要风险:..."
自检(5问)                 →    ⚠️"有一个风险你可能没考虑到:..."

每一步的结晶 = 这一步最值得用户知道的1件事。
不是"我做了这件事"。
```

### 输出对照表

| 步骤 | 结晶是什么 | 格式 | 用户感知 |
|------|-----------|------|---------|
| **心斋** | 假设与用户真实情况的矛盾点 | 1句话 | "咦, 确实" |
| **六视** | 最颠覆惯常视角的那个发现 | 1-3行 | "这角度我没想过" |
| **八卦镜** | 最异常的卦象 + 跨维度冲突 | 表/1句话 | "原来问题是这个" |
| **齐物** | 视角之间的冲突(如有) | 1句话 | 可省 |
| **梦蝶** | 前提反转后得到的意外结论 | 1句话 | "如果反过来想..." |
| **MCTS** | 排名 + 推荐 + 一句理由 | 1-3行 | "有道理" |
| **自检** | 找到的漏洞/风险(如有) | 1句话 | "这个风险我没注意到" |

### 不是结晶的不要输出

```
❌ 不是结晶: "心斋分析发现3个假设和3个反假设"
   → 这是"我做了什么事", 不是洞察

❌ 不是结晶: "六视第一视鲲鹏之视: 从高空看..."
   → 这是步骤编号, 不是洞察

✅ 结晶: "我注意到你虽然说了预算有限, 但真正让你犹豫的不是钱,
  是上次跨部门协作的教训——那个问题不解决, 多少钱都白花。"
   → 直接指向用户的真实矛盾
```

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
