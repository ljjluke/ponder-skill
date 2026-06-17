---
name: mcts-converge
description: Ponder Step 3~3.6 — Converge Engine. CLT-UCB ranking + self-check + blindspot audit + TD write-back.
---

# Step 3~3.6: Converge Engine

> **Path note**: Commands use node $P/scripts/mcts.js (relative). When executing, use node <plugin>/scripts/mcts.js <args> — <plugin> = path from SessionStart [Ponder] Plugin:.

> **🔒 COMPRESSION-SAFE RULES:**
> 1. OUTPUT in user language | 2. Phases: Aggregate → Self-Check → Blindspot → Decision Report
> 3. Rank ALL solutions (not just top 3) with n/V/σ²/confidence + multi-layer breakdown
> 4. SELF-CHECK mandatory: self-check-guard | 5. COMPLIANCE: compliance-report before decision

---

## Step 3: Aggregate Comparison

### 执两用中 — Doctrine of the Mean (中庸)

"执其两端，用其中于民" — Not averaging, but finding the optimal balance by grasping both ends.

Converge ranking is not simply picking the highest V:
- V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + Body-Use bonus
- This quantifies Zhi-Liang-Yong-Zhong: feasibility(orthodox) + robustness(unorthodox) → comprehensive optimum(mean)
- 1st place high V_feas but low V_robust → deviant, not the "mean"
- Self-Check ④(Ben-Mo) = check if deviating from the "mean"

Academic support: Herbert Simon "Bounded Rationality" (1956) — When optimal is unattainable, satisficing(mean) is more practical.

### Multi-Layer Ranking


Rank │ Solution │ V_final │ V_feas │ V_robust │ V_persp │ σ² │ n │ Conf
─────┼──────────┼─────────┼────────┼──────────┼─────────┼────┼───┼──────
  1  │ [...]    │ [...]   │ [...]  │ [...]    │ [...]   │ .. │ . │ HIGH


V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + Body-Use bonus
Code: rank --solutions '<JSON>'

### Convergence

check-final-convergence: Root n≥solutions×4, 1st n≥5, σ²<0.10, V gap >0.05
Not converged → +3 rounds (max 2×), still not → mark "not fully converged"

### Display + Confirm

Before self-check, **display MCTS conclusion to user** with ranking + best path + main risk + confidence.

---

## Step 3.5: Self-Check (Critical Error Prevention)

**⛔ MANDATORY — answer ALL 5 questions before proceeding.**

① **Find flaws** → "为人谋而不忠乎?": Is any judgment vague? Any assumption unverified? Any risk ignored?
   - Zhong=loyal to the problem itself, not own preferences. Check if biased by "I'm good at X"
   - Check each solution: does it rely on "probably fine" or "should work"?
   - Check for wishful thinking: "the API will handle it" → really?

② **Reverse thinking**: If 2nd place > 1st place, why? How likely? Does it change selection?
   - Construct a scenario where 2nd place wins. Is it plausible?
   - If yes → ask user about that scenario specifically

③ **Risk assessment** → "与朋友交而不信乎?": Worst outcome of the #1 choice? Can we bear it?
   - Xin=whether the solution's promises can be fulfilled. 1st place says "feasible" — is it truly credible?
   - What's the maximum downside? Probability? Can it be reversed?
   - If irreversible and probability >10% → ⚠️ Risk

④ **Root-Shift Check** (本末): Does 1st place violate the root dimension from 五診?
   - Root dimension = the one that defines the problem's essence
   - If 1st place sacrifices root for branch convenience → conditional pass only

⑤ **動静 Mode Check** → "传不习乎?": Are we biased?
   - Xi=practical verification, not mechanically following process. Are we "going through motions" rather than "truly thinking"?
   - Over-analyzing a simple problem (靜→動 bias)? → simplify, decide
   - Under-analyzing a complex problem (動→靜 bias)? → slow down, more sim


Self-Check Verdict:
  ✅ Pass — all 5 questions satisfied
  ⚠️ Risk — specific concern, recommend user confirm (use AskUserQuestion)
  ❌ Not passed — re-simulate with adjusted assumptions


Template: node $P/scripts/mcts.js template self-check --data '<JSON>'

Code: handle-self-check --conclusion <Pass/Risk/NotPassed>

**Circuit breaker**: get-fuse-mode --accuracy <float> --consecutive-bad <int>
<70% → simplified | <50% → ask user | 3× <50% → suggest manual

---

## Step 3.6: Blindspot Audit + 言意 Gap

### Cultural Sub-Lens Coverage

1. Extract blindspots from diverge phase's sub-lenses
2. Check each against ranked solutions → covered/missed
3. 3+ missed → WARNING → return to converge | 1-2 → annotate in report

### 言意 (Word-Meaning) Gap Detection

**⛔ Scan for 3 specific mismatches between user statements and our interpretations:**

① **Literal vs Metaphorical**: User said X literally, but we interpreted as metaphor? Or vice versa?
   - "Make it fast" → faster delivery timeline? Or "don't make people wait"?
   - "Must be robust" → zero failure tolerance? Or "shouldn't break easily"?

② **Same words, different intent**: User and we use the same term but mean different things.
   - "Simple" → minimal steps? Easy to explain? Quick to implement?
   - "Secure" → protected? Verified? Documented?

③ **Unstated expectations**: User didn't say it, but we assumed it (or missed it).
   - Did we assume a specific methodology or toolset without confirmation?
   - Did we ignore an implicit "it should work like [familiar process]"?

**Resolution rules:**
- Same yi different yan → merge solutions (false diversity)
- Same yan different yi → keep both (fundamental disagreement, need user clarification)
- Gap affects ranking → re-simulate → mark for user confirmation

Code: yan-yi-check --statements '<JSON>' --interpretations '<JSON>'

### Blindspot Audit Framework

1. List perspectives of all solutions
2. Compare with Eight-Facet + Sub-Lens coverage → find missing dimensions
3. For each blindspot: need supplement? (based on feature complexity / user-facing vs backend)
4. Decision: all covered → pass | 1st place biased → supplement | 1st covers well → annotate

---

## Re-simulate Mode

re-simulation-decide: 2nd place has sim → compare | no sim → quick 2-step | all affected → return to Diverge
Update: failure → knowledge graph, new constraints → list, success → full trace

---

## TD Write-back (MANDATORY)

**Without TD update, skill CANNOT learn.**

1. Calculate V_actual, TD_error = V_actual - V_predicted
2. Traverse optimal path → match knowledge graph → update/create HYPOTHESIS
3. Check status transitions, sleep, archive

### 理事 (Li-Shi) Dual-Layer Write-back

- **Li(Principle)**: universal pattern → tag layer:principle, cross-domain reusable, CONFIRMED after 3+ validations
- **Shi(Phenomenon)**: concrete case → tag layer:phenomenon, same-domain reference

Code: li-shi-split --insight '<JSON>'

---

## Decision Report Format


【Ponder Decision Report】
 Task: [...] | Date: [...] | Iterations: [N] | Solutions: [5-8]

 Ranking (V_final = 0.5×V_feas + 0.3×V_robust + 0.2×V_persp + Body-Use):
 Rank │ Solution │ V_final │ V_feas │ V_robust │ V_persp │Body-Use│ σ² │ n │ Conf

 Self-Check: ✅/⚠️/❌ [findings]
 Blindspot Audit: ✅/⚠️/❌ [sub-lens coverage]
 言意 Gap Check: ✅/⚠️ [specific gaps]

 Execution Plan: [solution] → [steps] → [key risks] | [fallback]
 Phase 3.5: should-ask-user --ranked '<JSON>'

 Knowledge Update: [new knowledge] [TD error: V_predicted → V_actual]

 Memory Agent Checkpoints:
   ☐ pre_engine: [DONE/SKIPPED(why)]
   ☐ during_diverge: [DONE/SKIPPED(why)]
   ☐ post_simulate: [DONE/IDs:.../SKIPPED(why)]
   ☐ pre_converge: [DONE/ALERT(what)]
   ☐ post_execution: [DONE/SKIPPED(why)]
   ☐ session_end: [DONE/N points/SKIPPED(why)]

 Session Points: [list of ashi point IDs created this session]

 Language Guard: check --user-lang <lang> --output "..." [PASS/FAIL]


Template: node $P/scripts/mcts.js template decision-report --data '<JSON>'
