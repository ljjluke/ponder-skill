---
name: mcts-diverge
description: Ponder Step 1 — 逍遥游 Free Wandering Diverge Engine. Zhuangzi-inspired multi-perspective divergence + Eight-Facet Mirror × 诸子百家 sub-lenses → Cluster/Complete/Cull/Crystallize.
---

# Phase 1: Diverge Engine — 逍遥游 (Free Wandering) × 齐物 (Equalizing) × 庖丁解牛

> **Path note**: Commands use node $P/scripts/mcts.js (relative). When executing, use node <plugin>/scripts/mcts.js <args> — <plugin> = path from SessionStart [Ponder] Plugin:.

> **🔒 COMPRESSION-SAFE RULES:**
> 1. OUTPUT in user language | 2. Phase order: 心斋→逍遥游→八卦镜→齐物→庖丁解牛→Info Gap→方案收敛
> 3. NO SKIP / NO COLLAPSE | 4. Every perspective shift MUST be visible | 5. Domain-agnostic
> 6. ANTI-SINGLE: decomposition-guard before claiming "only one solution"
> 7. DIVERSITY: if <3 solutions → diversity-challenge

---

## 🌐 Concept Translation Rule (MANDATORY)

**Internal thinking uses cultural concept names. Output MUST translate into user's domain language.**

Chinese philosophical concepts (心斋, 逍遥游, 齐物, 梦蝶, etc.) are internal "thinking opcodes" — they are NOT output format. The language adaptation layer handles the final translation.

Translation logic (internal concept → what user sees):

心斋 (Xinzhai)  → "Expose default assumptions about this problem"
鲲鹏之视 (Kunpeng View) → "Redefine the problem from system-wide perspective"
蜩鸠之视 (Tiaojiu View) → "Notice micro-details macro analysis misses"
朝菌之视 (Zhaojun View) → "Under extreme time pressure, what's the priority"
冥灵之视 (Mingling View) → "At geological timescale, what stays, what changes"
列子御风 (Liezi View) → "If no intervention, where does it naturally go"
至人无己 (Sage View) → "Remove personal stake — what's optimal for the system"
八卦镜 (Bagua Mirror) → "Examine from 8 independent perspectives"
齐物 (Qiwu) → "Every perspective has validity — the uncomfortable one may be key"
梦蝶翻转 (Dream Flip) → "Invert all assumptions"
庖丁解牛 (Cook Ding) → "Find the path of least resistance"


⛔ FORBIDDEN:
- Output raw Chinese concepts to non-Chinese users
- Only explain after user asks "what does that mean"
- Incomplete translation — translate EVERY time, not just the first

✅ Correct:

Internal: "From 鲲鹏之视, this module is..."
Output:  "From the system-wide perspective, the positioning of this module is..."


### Mapping table (internal → domain language)

| Concept | Essence | Software Engineering | Business Analysis |
|---------|---------|-------------------|-------------------|
| 心斋 | Expose unchecked assumptions | "List default tech choices" | "Expose business model premises" |
| 鲲鹏之视 | System-wide redefinition | "From architecture level" | "From industry chain top" |
| 蜩鸠之视 | Micro-detail focus | "Per-call UX experience" | "Per-customer touchpoint friction" |
| 朝菌之视 | Time-compressed action | "What ships in 1 day" | "What adjusts in 1 month" |
| 冥灵之视 | Long-term change | "Architecture in 10 years" | "Market in 10 years" |
| 列子御风 | Follow natural flow | "Where users go without new features" | "Where market goes without changes" |
| 至人无己 | Remove self-interest | "Unbiased tech selection" | "Beyond departmental interest" |
| 齐物 | Equalize all views | "Every tech has its place" | "Every strategy has merit" |
| 梦蝶翻转 | Invert assumptions | "What if 'don't build' is best" | "What if 'exit market' is best" |

### Eight Trigrams (八卦镜 facets)

| Internal | Essence | → Translation |
|----------|---------|-------------|
| F1 ☰ 乾 (Source of Force) | Where does driving force come from? | "Motivation analysis: what drives this" |
| F2 ☷ 坤 (Foundation) | What foundation does this rest on? | "Base analysis: available resources and capacity" |
| F3 ☳ 震 (Change/Disruption) | Where might unexpected change occur? | "Change analysis: where surprises hide" |
| F4 ☴ 巽 (Penetration) | How does effect spread? | "Spread analysis: how impact propagates" |
| F5 ☵ 坎 (Risk/Abyss) | Deepest pit? Worst case? | "Risk analysis: worst outcome possible" |
| F6 ☲ 离 (Visible/Dependent) | Surface vs hidden dependencies? | "Dependency analysis: what supports the surface" |
| F7 ☶ 艮 (Boundary) | Lines never to cross? | "Boundary analysis: hard constraints" |
| F8 ☱ 兑 (Convergence) | Balance all interests? | "Balance analysis: stakeholder equilibrium" |

### 诸子百家 Sub-lens Translations

| Internal | Essence | → Translation |
|----------|---------|-------------|
| 兵家 | Competition and high ground | "Who's opponent/ally — where's advantage" |
| 縱横家 | Interest alignment | "Stakeholder positions and alignment" |
| 農家 | What conditions suit what | "What strategy fits current conditions" |
| 水利家 | Resource flow and bottlenecks | "How resources flow — where are they stuck" |
| 醫家 | Symptom vs root cause | "Surface symptom vs root cause" |
| 陰陽家 | Opposite forces and tipping points | "Counter-direction view and inflection points" |
| 工匠 | Are tools sufficient | "Is current approach adequate" |
| 禪家 | Strip to essence | "Remove convention — what's the core" |
| 史家 | Historical precedent | "Lessons from similar past cases" |
| 道家 | Risk of over-intervention | "Cost of doing too much" |
| 法家 | Rules and enforcement | "Rule constraints and enforcement reality" |
| 儒家 | Who gets overlooked | "Neglected stakeholders and baseline ethics" |

### Validation Concepts

| Internal | Essence | → Translation |
|----------|---------|-------------|
| 本末 (Ben-Mo) | Root vs branch factors | "Fundamental vs secondary factors" |
| 体用 (Ti-Yong) | Universal essence vs specific function | "General principle vs specific application" |
| 理事 (Li-Shi) | Universal pattern vs concrete case | "General pattern vs specific instance" |
| 有无 (You-Wu) | Absent-but-expected constraints | "Constraints that should exist but are missing" |
| 言意 (Yan-Yi) | Words vs intended meaning | "What user said vs what they actually mean" |
| 一多 (One-Many) | One core + multiple mechanisms | "One essence + multiple implementations" |
| 动静 (Dong-Jing) | Quick execution vs deep analysis | "Move fast vs analyze thoroughly" |
| 奇正相生 (Qi-Zheng) | Explore vs exploit balance | "Innovation vs stability balance" |

---

## Why Conventional Brainstorming Fails

Conventional brainstorming generates ideas **within the same cognitive framework**. You can list 100 options without a single genuine frame-break.

Zhuangzi (369-286 BCE) offers a fundamentally different model in 逍遥游 (Free Wandering):

> "In the Northern Ocean there is a fish called Kun. It is so huge no one knows how many thousand li across. It transforms into a bird called Peng. Its back is so vast no one knows how many thousand li wide. When it rouses and flies, its wings are like clouds hanging from the sky."

Kun — deep-sea giant fish — transforms into Peng — a bird soaring 90,000 li high. Complete form-transformation, scale-shift, perspective revolution.

**Core insight**: A frog at the bottom of a well cannot imagine the ocean. A summer insect cannot conceive of ice. Not because they lack effort — because **they never changed their observation position**.

### Academic Foundation

| Paper | Core Finding |
|-------|-------------|
| **Lai (2021)** "Freedom and Agency in the Zhuangzi" — *BJHP* | Freedom = working with constraints via cognitive flexibility, not escaping them |
| **Liu Xiaogan (2015)** "Zhuangzi's Philosophy" — *Springer* | 齐物 + 不知 = cognitive tools to ascend from mundane to spiritual freedom |
| **Malaie et al. (2024)** "Divergent and Convergent Creativity Are Different Kinds of Foraging" — *Psych Science* | Divergent thinking = dispersed spatial exploration — more dispersion = more creativity |
| **Dietrich (2024)** "Where in the Brain is Creativity?" — *Frontiers* | Creativity is distributed, not monolithic — frame-breaking = switching exploration modes |
| **Deckert & Scherer (2017)** "The Dao of Innovation" — *Kindai* | Creativity cannot be forced — mind must "wander and spontaneously discover" |

---

## Phase 0: 心斋 (Fasting of the Mind)

**⛔ Most critical step. Skip it = all subsequent divergence stays within old framework. 心斋-less divergence is fake divergence.**

Zhuangzi's "Fasting of the Mind":
> "Make your will one. Don't listen with your ears, listen with your mind. Don't listen with your mind, listen with your qi. The ear stops at hearing. The mind stops at matching. But qi is empty and waits for things. The Way gathers in emptiness alone. Emptiness is the fasting of the mind."

Translated into cognitive operations:


【心斋 · Expose Assumptions】

Output each item — MUST be visible to user:

① What do I take for granted about this task?
   → List at least 3 unchecked assumptions
   → E.g. "I assume X is the standard solution" / "I assume budget is limited"

② Where do these assumptions come from?
   → Past experience? Industry convention? Analogous cases?
   → Are these sources still valid for THIS scenario?

③ What if ALL my assumptions are wrong?
   → What if the opposite is true? What if cost doesn't matter?
   → At least 3 counter-hypotheses

④ 坐忘 (Sitting-forget): Temporarily suspend all known solutions and "best practices"
   → Declare: "I don't know the answer yet. I'm a blank slate."
   → This isn't ignorance — it's 不知 (epistemic humility)


**After output, user sees your assumption list. User can correct: "No, budget isn't the issue — time is."**

---

## Phase 0.5: Attention Gate — Selective Focus (Thalamic Gating)

**Core insight from neuroscience (Halassa et al., 2024 Nature Neuroscience):** The prefrontal cortex relies on the thalamus (not sensory cortices) to modulate selective attention. The thalamic reticular nucleus (TRN) suppresses ~99% of incoming information — the brain does NOT process everything equally. It gates, selects, and prioritizes.

**Apply here:** After exposing assumptions but BEFORE diverging into 6 perspectives, calculate which dimensions will yield the highest INFORMATION GAIN.


【Attention Gate · Selective Focus】

① List all dimensions from constraints (五诊: 天/地/人/法/物) + any domain-specific facets.
   → For each: current score (0-10, lower = less known) + criticality (0-1, how important)

② Compute attention priority:
   node $P/scripts/mcts.js compute attention-gate --dimensions '<JSON>'
   → Returns ranked dimensions by priority = uncertainty × criticality + entropy_bonus

③ Select TOP 2-3 dimensions to focus on (highest priority).
   → These get full depth during 逍遥游 divergence.
   → Remaining dimensions get 1 insight minimum, not full depth.

④ Output:
   ┌─ Focus: [dimension A] (priority: X) — high uncertainty, high criticality
   ├─ Focus: [dimension B] (priority: Y) — moderate uncertainty, high criticality
   └─ Background: [dimension C, D...] — well understood, low priority

⛔ This is NOT "skip the easy ones." This is "allocate cognitive resources
   where they yield the most new information."


---

## Phase 1: 逍遥游 — Six-Perspective Free Wandering

**Core principle**: Not "looking at the same problem from different angles" — that's shallow. 逍遥游 is **completely changing the observer's identity, scale, and spacetime position**.

Like:
- Human seeing Earth vs Alien seeing Earth
- Physicist seeing light vs Poet seeing light vs Photographer seeing light
- Kun (deep sea) seeing world vs Peng (90k li high) seeing world vs Tiaojiu (branch-level) seeing world

**Six perspective shifts — each MUST be output independently:**


【逍遥游 · Six Perspectives】

Not "analyze from 6 angles."
But "BECOME 6 different beings — each redefines what the 'problem' even is."

视① 鲲鹏之视 [Cosmic Scale · 90,000 li high]

  Identity: Peng bird, wings like clouds, soaring 90,000 li
  View: From cosmic scale — see the whole system, see boundaries, see where this "problem" sits
  ⛔ MUST output:
  - System insight: [3-5 global patterns from macro view]
  - Problem redefinition: [What IS this problem when seen from cosmic scale? May be completely different]
  - Beyond boundary: [What lies outside this problem's boundary?]

视② 蜩鸠之视 [Ground Scale · Branch level]

  Identity: Cicada and dove, flying between elm branches
  View: Daily tangible experience — touchable details, concrete reality unfiltered by "big picture"
  ⛔ MUST output:
  - Micro insight: [3-5 concrete details macro perspective misses]
  - Pain points: [What friction if each detail is unresolved]

视③ 朝菌之视 [Time-Compressed · Morning mushroom]

  Identity: Morning mushroom, lives one day, knows nothing of the month
  View: Extreme short time scale — what changes instantly, what matters right now
  ⛔ MUST output:
  - Immediate action: [If only 1 day, what MUST be done]
  - Droppable: [What seems important but is irrelevant at this scale]

视④ 冥灵之视 [Time-Expanded · 500 years a season]

  Identity: Mingling tree, 500 years = one spring, 500 years = one autumn
  View: Geological time — ignores short-term fluctuation, sees only fundamental shifts
  ⛔ MUST output:
  - Eternal: [What never changes — what to bet on long term]
  - Cascades: [10/50/100 year consequence chains]

视⑤ 列子御风 [Flow State · Riding the wind]

  Identity: Liezi, riding the wind, effortless, following the current
  View: Complete relaxation — let answers emerge naturally, don't "force think"
  ⛔ MUST output:
  - Natural drift: [Where does it go with ZERO intervention]
  - Minimal force: [Smallest, most natural action — could doing nothing be best?]

视⑥ 至人无己 [Selfless · No self, no merit, no fame]

  Identity: Perfect person — no self, no striving, no identity
  View: Completely remove "I" — my stake, my position, my ego
  ⛔ MUST output:
  - Occluded: [What interests/voices are hidden by MY perspective]
  - System-optimal: [If I had zero self-interest, what's the optimal solution]


**⛔ All six perspectives must complete before entering 八卦镜. 六视 = change your eyes. 八卦镜 = examine with new eyes.**

---

## Phase 2: 八卦镜 (Bagua Mirror) — Eight-Facet Examination × 诸子百家 × Cultural Analogy

**⛔ You now have 6 new eyes from Phase 1. Use them to examine the 八卦镜.**

### Round 1: F1→F8 In-Depth per Facet

**Each facet MUST output complete structure. No one-liners.**


┌─────────────────────────────────────────────┐
│ F? ☰/☷/☳/☴/☵/☲/☶/☱ [Name] — [Domain dimension] │
│                                             │
│ 体(Ti): [Universal essence — what this facet IS] │
│ 用(Yong): [Specific manifestation — what it means HERE]│
│                                             │
│ Six-View Cross: [Which perspective from Phase 1 changed this score?] │
│                                             │
│ Sub-lens① [School A] + reasoning (≥3 sentences):  │
│   → Insight: [...]                              │
│ Sub-lens② [School B] + reasoning (≥3 sentences):  │
│   → Insight: [...]                              │
│                                             │
│ Cultural analogy (MUST jump out of domain frame):  │
│   Analogy: [concrete cross-domain example]    │
│   → Lesson: [what the analogy reveals]        │
│                                             │
│ Known: [3-5 facts already established]        │
│ Blindspot: [2-3 uncertain/missing info items] │
│ Ideas: [2-4 directions from this analysis]    │
│ Score: [0-10] — [pre/post 六视 change]        │
└─────────────────────────────────────────────┘


**Facet assignment:**

| Facet | Name | Core Question | 体(Ti) | Sub-lens① | Sub-lens② |
|-------|------|--------------|--------|-----------|-----------|
| F1 ☰ | 乾 Force | Where does drive come from? Is it created or borrowed? | EXTERNAL IMPETUS | 兵家: Competition/advantage | 縱横家: Interest alignment |
| F2 ☷ | 坤 Foundation | What foundation supports this? What soil suits what? | BASE CAPACITY | 農家: Suitability | 水利家: Resource flow |
| F3 ☳ | 震 Change | Where might unexpected change occur? What latent issues? | UNCERTAINTY | 醫家: Symptom vs cause | 陰陽家: Opposite forces |
| F4 ☴ | 巽 Penetration | How does effect spread and permeate? Where's the joint gap? | PROPAGATION | 工匠: Cook Ding's method | 禪家: Strip to essence |
| F5 ☵ | 坎 Risk | Deepest pit? Is non-intervention better? | VULNERABILITY | 史家: Historical precedent | 道家: Anti-intervention |
| F6 ☲ | 离 Visible | What supports the surface? Who's overlooked? | DEPENDENCY STRUCTURE | 工匠: Hidden structure | 儒家: Human values |
| F7 ☶ | 艮 Boundary | Line never to cross? Is stopping protection or limitation? | CONSTRAINT BOUNDARY | 法家: Rules/enforcement | 道家: Knowing when to stop |
| F8 ☱ | 兑 Convergence | How to balance interests? Can interests be redistributed? | STAKEHOLDER EQUILIBRIUM | 儒家: Moral baseline | 縱横家: Alliance building |

### Round 2: Cross-Association — Dimension Pair Interaction

Minimum 3 pairs. Each pair MUST include hexagram interaction (hexagram-lookup) + 理事(Li-Shi) separation + synergy/conflict analysis.

### Round 3: Changing Condition Analysis

For each pair: identify stable factors vs changing factors → second-order effect projection.

### Round 4: Blindspot Completion

For facets scoring <7: ① knowledge graph → ② WebSearch (≤3 score MUST search) → ③ ask user.

### Round 5: Divergence Self-Check

5 questions, answer each:
① Any facet that produced zero ideas?
② Any idea dismissed too early?
③ Any unstated assumptions? (list ≥3)
④ Do 8 facets form a complete picture? What's missing?
⑤ Did we truly jump domain? (≥2 cross-domain analogy examples)

---

## Phase 3: 齐物 (Equalizing All Things)

**⛔ Must pass through 齐物 before entering convergence.**

Zhuangzi's 齐物论: All perspectives have equal validity. None is "correct."


【齐物 · Equalize】

For each perspective (六视 + 八卦 + sub-lens + cultural analogy):

① What unique insight does this perspective reveal that others cannot see?
② If you ONLY see from this perspective, what do you miss?
③ What is the common ground between this perspective and the one you most disagree with?

Then answer:
→ Which perspectives make me most uncomfortable? (discomfort = blindspot contact)
→ What if the most uncomfortable perspective is the correct one?


---

## Phase 4: 庄周梦蝶 — Ultimate Flip

> "Once Zhuang Zhou dreamt he was a butterfly, fluttering about, enjoying itself. He did not know he was Zhou. Suddenly he awoke, and there he was, solid Zhuang Zhou. He did not know whether he was Zhou dreaming he was a butterfly, or a butterfly dreaming he was Zhou."


【梦蝶 Flip】

① Subject-Object Swap:
   "If I AM the problem itself, how would I describe the solution?"
   "If constraints are the main character and goals are background, what happens?"

② Success-Failure Swap:
   "If 'failure' is the actual goal, what do we learn?"
   "If the 'best solution' leads to disaster, what is that disaster?"

③ Time-Order Swap:
   "Looking back from the end, which steps can be skipped?"
   "If the outcome is already determined, do the 'choices' along the way matter?"


---

## Phase 1.5: Info Gap Supplement — User Alignment

After divergence, gaps become visible. Now ask — not before.

**⛔ Minimum 1 AskUserQuestion. Typical 2-3 rounds.**

Output: 【Info Gap Round N】 Asked→Answered | Updated scores | Remaining gaps

---

## Step 2: Reconnaissance Report

Per-facet findings + cross-validation (理事 Li-Shi separation) + explicit assumptions (Confirmed/Unconfirmed).

---

## Phase Two: Converge — Extract Solutions

**① Cluster**: Group idea fragments into directions. 一多(One-Many): 1 core identity + 2-4 mechanisms per cluster.
**② Ti-Yong Dedup**: Same-体 different-用 → merge. Different-体 same-用 → keep.
**③ Cull**: P0~P4 five-level criteria. Unlimited during divergence, ≤10 after convergence.
**④ Crystallize**: Complete solution + Bagua Auditable Scorecard (8 facets scored 1-10).

Output: solution list + coverage matrix (F1-F8 × solutions).

---

## Helper Tools

- Domain hint: identify-domain | Facet loading: get-dimensions
- Blindspot classification: classify-blindspot --score <0-10>
- Ti-Yong check: ti-yong-check | One-Many check: one-many-check
- Cull: node $P/scripts/mcts_compute.js cull --criteria

---

## 🔁 Self-Evolution Loop

The skill learns from every decision cycle. Three feedback loops:


① Divergence → Memory:
   Divergence insights (心斋/六视/八卦镜 findings) → semantic knowledge
   CLI: node $P/scripts/mcts.js mma capture-divergence '<json>'

② Five-Element Propagation:
   Tonify/drain one point → propagate through generating/controlling chain
   Auto-link promotes/inhibits between knowledge points
   CLI: node $P/scripts/mcts.js mma interact

③ Knowledge Audit:
   Periodic check: completeness / contradiction / staleness / five-element balance
   CLI: node $P/scripts/mcts.js mma audit [context_tags]


### Five Element Interactions

| Relationship | Logic | Effect |
|-------------|-------|--------|
| Generating(相生) | wood→fire→earth→metal→water→wood | Tonify nourishes child |
| Controlling(相克) | wood→earth, fire→metal... | Drain releases controlled |
| Over-acting(相乘) | same as controlling, excessive | Strong controller overwhelms |
| Insulting(相侮) | earth→wood, metal→fire... | Strong controlled counter-attacks |

### Knowledge Health Score (mma audit)

Score 0-100 based on: completeness, contradiction count, staleness, five-element balance.
