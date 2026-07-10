---
name: ponder
alwaysApply: false
description: "8-step structured reasoning. Domain-agnostic. Each step: read prompt → load engine docs → execute → present results."
version: 1.18.49
license: MIT
---

## Pipeline

⛔ NO environment checks, config validation, file scanning, or anything unrelated to the user's question. Start directly.

⛔ Codex: no request_user_input tool. Use plain text options instead — ask ONE question at a time with A/B/C labels. User types a single letter to answer. Continue until all 5 dimensions covered. Claude: use AskUserQuestion, behavior unchanged.

### Requirement Refinement
Use AskUserQuestion one question at a time, covering: time/place/people/method/essence. Every question MUST have options.
After completion, summarize user needs in 1-2 sentences. ⛔ Once interview is done, immediately enter analysis phase. Do NOT pause to ask "anything else to add".

**Socratic Ignorance Check (gate: reuse Shensi stake judgment; skip for reversible minor issues; mandatory for high-stake problems)**: After 5-dimension profile is complete, perform a socratic ignorance check based on the profile — list 2-5 "known unknowns" that are domain-specific professional matters. ⛔ Do NOT list "uncertain about user budget" (that's a weak dimension in the profile). Must list **domain-sensitive matters** (professional dimensions that the 5 generic profile dimensions cannot probe, but significantly affect decision quality — e.g., domain-specific constraints, evaluation dimensions only known to practitioners, professional preconditions that change solution feasibility in certain contexts). Each ignorance item must include: (a) why the domain needs to know this; (b) why lacking it in the current profile is a risk. Research publicly available info first; for what cannot be found, use AskUserQuestion to ask the user — preface with **one sentence explaining why it matters**, then provide 2-3 specific options. Results inject into profile's domain professional dimensions, subsequent steps may reference them. If the profile is already sufficiently professional with no significant unknowns, honestly leave empty (do not fabricate false ignorance). See engine/socratic-ignorance.md.

### Analysis Phase

⛔ No framework internal terminology in any output. Use natural language.
⛔ **Noise boundary**: Script invocations (`node scripts/...`), script stdout (`{"stored":true,...}` JSON), file paths, command strings, internal pipeline actions like "query history/store output/cleanup learning" — never show to user. Users see **the reasoning process and conclusions of each step**: what was considered, what each agent produced, what judgment was made. Internal actions execute silently; reasoning process is fully displayed.
⛔ Do NOT output status messages like "waiting", "let me check", "in progress". Only output reasoning, conclusions, and scores.
⛔ After all sub-agents return, MUST display each agent's output to the conversation first, then summarize or proceed to next step. Skip-free display is forbidden.
⛔ **Shensi → Divergence → Bagua: strictly serial**. Divergence must consume Shensi output; Bagua must consume Divergence output. Do NOT launch these three as parallel agents. Bagua's internal 8-dimension agents ARE parallel.
⛔ Every step must execute in full order below. Use Read tool for files, forbid bash echo:

```
(Internal execution order — do not output step numbers or labels)
🔇 Silent internal actions — never show commands/stdout/paths to user:
   - Query history (node scripts/orchestrate.js history <stepName> <questionType>) + error warnings; results only inject into prompt reference
   - Query evolution rules (node scripts/orchestrate.js rules <stepName> <questionType>); matching adaptive rules blend into this step's reasoning reference in natural language (same path as history query, silently inject without showing command)
   - Read JSON prompt / read engine docs (use Read tool)
   - Store output (node scripts/orchestrate.js step ...)
   These are pipeline operations, irrelevant to user; complete silently. If history match brings new constraints/blindspots, blend into this step's reasoning display in natural language, do not show "found in history" itself.

📢 The following reasoning steps MUST be shown to user (process and results clearly presented for each step):
   1. **Execute**: Main thread directly; or spawn sub-agents (after all return, **MUST display each agent's output item by item in conversation before summarizing; skip-free is forbidden**)
   2. **Profile refresh + Stance refresh**: Check if this step's output contains new discoveries (new constraints, blindspots, user preferences, contradictions) that need to update the requirement profile. Yes → update profile, subsequent steps use new profile. No → continue. **Convergence and subsequent steps additionally do stance refresh**: check if this step's new output shakes the framework's working stance from the previous step (the inclination born at convergence). If shaken → change inclination and record why, subsequent steps use new stance. If not shaken → record why unchanged. Stance is the framework's own judgment, distinct from user profile (user's constraints). Reversible minor issues do not establish stance.
   3. **Need confirmation**: Among content expanded by Shensi/Divergence/Bagua, **only ask about matters involving user needs/preferences/real situations** (use AskUserQuestion for user to pick). Pure analytical blindspots and perspectives go directly to solution phase, no need to ask.
```

⛔ The "method" column in the table below for each phase (Shensi/Divergence/Bagua/Plans/Converge/Scoring/Simulation/Debate/Synthesis) describes what to display — that is the reasoning content for the user and MUST be shown. The `finalize` after the pipeline is also a silent internal action, do not show.
⛔ **Gate boundary (important)**: "Skip for reversible minor issues" in the table means: for problems whose consequences are easily reversible (e.g., picking a restaurant, choosing a learning path), skippable items marked "skip for reversible minor issues" may be skipped; high-stake problems (e.g., investment decisions, medical treatment, irreversible major decisions) enforce all items even those marked skippable. ⛔ Simulation and Debate steps are mandatory regardless of stake level, immune to gate control.
⛔ **agent-reach is available**. When needing platform-specific real-time data (GitHub, YouTube, Bilibili, RSS, any webpage, etc.), prefer the platform interfaces exposed by agent-reach (it provides platform read interfaces via its own registered skill, NOT `agent-reach search` subcommand — v1.5+ no longer has this command). After installation, use `agent-reach doctor` to check available platforms. Without agent-reach, use WebSearch normally; core pipeline unaffected.

| Phase | Prompt File | Goal | Method |
|-------|------------|------|--------|
| Shensi | scripts/prompts/shensi.json | Prerequisite scrutiny + break out of conventional thinking | Main thread directly. **First produce stake field (stake judgment; entire downstream reads this field for gate control; schema enforces mandatory; reuse v1.18.37 hard criteria: any hit → high / unclear → treat as high / user solemn → high)**; for high-stake problems, first scrutinize prerequisites (use AskUserQuestion to confirm prerequisites involving user's real situation), then present counterintuitive findings. If prerequisite scrutiny exposes that "the question's formulation presupposes unverified premises", trigger frame dissolution (question whether the question should be asked this way rather than solving within the framework; most problems do not trigger, leave empty). Prerequisite scrutiny internally self-checks prospect attitude (loss aversion/reference point dependence/probability weighting distortion; do not show labels; see engine/prospect-theory.md). |
| Divergence | scripts/prompts/divergence.json | Multi-perspective scan | **Must wait for Shensi output**, then main thread directly (consuming Shensi conclusions). Present 6 perspectives. **For high-stake problems, after 6-perspective output, perform perspective mutual negation** (find 1-2 pairs of opposing perspectives, mutually challenge then synthesize; skip for reversible minor issues). Consensus must be surviving judgment after mutual negation, not simple summarization. |
| Bagua | scripts/prompts/bagua.json | Blindspot discovery | **Must wait for Divergence output**, then spawn sub-agents (consuming Divergence consensus). One agent per dimension; display blindspot table. After all return, main thread synthesizes as key_finding and hands to Plans. |
| Plans | scripts/prompts/plans.json | 5-10 alternative solutions | **For high-stake problems, before launching agents, first do end-state profile** (describe "what success concretely looks like", must be verifiable like acceptance criteria, then reverse-chain decompose to today's first step; skip for reversible minor issues). Inject end-state into each agent so solutions converge toward it. One agent per solution. **For high-stake problems, each solution must undergo dialectical movement (thesis → antithesis → synthesis); skip for reversible minor issues**: after generating a solution, write out under what specific conditions it fails (antithesis, must write "does not hold when X"); after absorbing the antithesis, how the solution is corrected or scoped (synthesis). Display solution comparison table + antithesis/synthesis per solution. |
| Converge | scripts/prompts/converge.json | Eliminate weak solutions, keep optimal | Main thread directly (consuming plans). Display surviving solutions and elimination reasons. **For high-stake problems, additionally output working stance** (which surviving solution the framework currently leans toward + based on what + what would change my mind; no fence-sitting; skip for reversible minor issues). |
| Scoring | scripts/prompts/simulate.json | 8-dimension scoring of surviving solutions | **Must wait for convergence survivors**, then one agent per solution (consuming survivors). **Must display per-dimension individual scores and total score**. **For high-stake problems, attribute the top-scoring solution** (why it got this score: 3 most likely reasons + counterfactual ranking if reasons do not hold; skip for reversible minor issues). If scoring legitimacy is questionable (scores cluster near ranking-sensitive weights / diverge from intuition / certain dimension lacks experience anchor / weight source case-type mismatch), trigger prior self-check (question the scoring tool's prior framework rather than continue using results; most cases do not trigger, leave empty). |
| Simulation | scripts/prompts/simulate-scenarios.json | Simulate surviving solutions | ⛔ **Mandatory regardless of stake level, immune to reversible-minor gate control**. **Must wait for scoring**, then one agent per solution (mcts-simulator, consuming scored_survivors). **Must display simulation result table + 💡 findings**. |
| Debate | scripts/prompts/debate.json | Ranked recommendation | ⛔ **Mandatory regardless of stake level, immune to reversible-minor gate control**. Each solution presents opening → aggregate → attack evaluation → pressure-tested ranking. **Must display ranking table**. **For high-stake problems, additionally output stance evolution** (did debate attacks change the inclination formed at convergence: if changed, record from X to Y + which attack shook it; if unchanged, record why not; skip for reversible minor issues). Counterfactual thinking internally upgraded to systematic counterfactual investigation (bidirectional counterfactuals / causal chain investigation / controllable vs uncontrollable distinction; do not show methodology labels; see engine/counterfactual-thinking.md). |
| Synthesis | scripts/prompts/synthesis.json | Final conclusion + risks + conclusion self-reflection + fallibility annotation + unassimilable items + stance genealogy + preference introspection | Main thread directly (consuming debate debate_summary + ranked). For high-stake problems, output complete conclusion + conclusion self-reflection (challenge ledger convergence + shared premises) + fallibility annotation (**stance-based**: framework ultimately leans toward A; A is most likely wrong due to X + fallback option; skip for reversible minor issues) + unassimilable items + stance genealogy + preference introspection (intertemporal preference / motivational orientation / preference stability; do not show labels; see engine/preference-structure.md). Three-action mutual exclusion constraint has code guard (synthesis_guard.js blocks fallibility↔self-reflection / fallibility↔otherness object collision + otherness field completeness). ⛔ Reversible minor issues only skip these four deep actions, but **simulation and debate conclusions must be displayed normally**; do not swallow previous step outputs by "just giving the conclusion". |

### User Confirmation
Profile refresh at each step already covers most user confirmation. After synthesis, if there are still **core directional choices** requiring user's personal judgment (not information confirmation), use AskUserQuestion with options. After user responds, output final conclusion. If nothing remains, directly output conclusion.

### Presenting Conclusions
Use natural language to connect reasoning across phases. Do not use mechanical labels like "Step X", "Now entering phase Y". Each phase's output should read like insightful analysis, not a dry report.

Table design:
- **Bold** headers; **bold** key numbers or conclusions
- Brief assessment after each data row, not just raw numbers
- Scoring tables paired with a summary line (e.g., "Overall, dimension X is strongest, Y is weakest")
- Comparison tables highlight the best option

Copy style:
- First sentence grabs attention — directly state the most valuable insight (not "Let me summarize", but "The core finding is X")
- ⭐ Highlight / 💡 Key Finding / ⚠️ Risk / ✅ Conclusion / 🏆 Recommendation
- No JSON, file paths, Bash commands, or framework jargon
- No "requires user confirmation" prompts

Per-phase format:
- **Bagua**: Blindspot table + one-sentence summary of the most critical blindspot
- **Plans**: For high-stake problems, first present **end-state profile** (what success looks like + reverse-chain to today's first step), then comparison table (name/direction/core logic), with differentiated commentary per solution; **each solution accompanied by "under what conditions it fails"** (antithesis) and "therefore how to correct or scope it" (synthesis)
- **Converge**: Survivor table (name/retention reason), with one line "eliminated N, kept M, mainly eliminated due to X"
- **Scoring**: Scoring table must include **per-dimension individual scores** and total. **Bold the top scorer**. Add one line "Solution X performs best on dimension Y". For high-stake problems, append **top scorer attribution** (why it got this score + if reasons don't hold, where it would fall)
- **Simulation**: Simulation result table; **key findings written as a separate 💡 paragraph**, not stuffed in the table
- **Debate**: Ranking table; **🏆 first place bolded**; one-line pressure-resistance commentary per solution
- **Final Conclusion**: 🏆 **Recommended solution (bolded)** → Core judgment → Risks and responses → Items to confirm → Conclusion self-reflection (high-stake only: top 3 challenge responses + shared premises) → Fallibility annotation (high-stake only, **stance-based**: framework ultimately leans toward A; where A is most likely to fail + if it fails, switch to what) → Unassimilable items (high-stake only; most problems have none: stances that synthesis cannot digest + who the conclusion does not apply to) → Stance genealogy (high-stake only: how the framework's inclination moved from convergence → debate → synthesis; one sentence per phase + why it settled here) → Preference introspection (high-stake only: what intertemporal preferences and motivational orientations the conclusion implicitly assumes; would the conclusion still hold for someone with a different time horizon or motivational orientation)

### After Pipeline
```
node scripts/orchestrate.js finalize <type> <question>
```
Cleanup + learning.
