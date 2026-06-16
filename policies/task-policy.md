---
name: task-policy
description: General decision task state feature definitions, simulation output formats, scoring standards, and aggregate comparison rules. Applicable to any domain.
---

# General Decision Policy

## Overview

This policy file defines general decision simulation rules, applicable to any domain. **This is a reference file; for complete rules during engine execution, refer to engine files in engine/ directory**:

| Topic | Reference File (More Detailed) |
|-------|-------------------------------|
| Diverge/Solution Generation | [engine/mcts-diverge.md](../engine/mcts-diverge.md) |
| Round-by-round Simulation | [engine/mcts-simulate.md](../engine/mcts-simulate.md) |
| Aggregate/Self-check/Blindspot Audit | [engine/mcts-converge.md](../engine/mcts-converge.md) |

This file contains:
1. Solution generation rules (don't list solutions from thin air, extract from resources)
2. Simulation output standardized format
3. Scoring standards (what counts as 0.8, what counts as 0.3)
4. Aggregate comparison rules
5. Policy function selection guide
6. Value function persistence format

---

## Solution Generation Rules

Solutions are not thought up from thin air, must be based on one of the following sources:

### Solution Sources and Basis

| Source | Basis Type | Credibility | Example |
|--------|-----------|-------------|---------|
| Existing materials | Directly see existing implementation in project/organization | HIGH | "Organization already uses X protocol, extend on that basis" |
| Official documentation | Official docs or accepted best practices | HIGH | "Industry guideline recommends Y approach for this scenario" |
| Knowledge graph (K00X) | Historical successful experience, context matches | MED-HIGH | "K003 succeeded with same pattern in similar scenario" |
| Industry standards | Widely used but no direct docs available | MED | "Most organizations in this sector use Z convention" |
| Analogical reasoning | Derived from other domains/contexts | LOW | "In field A this is handled this way, analogous to field B should be similar" |

### Solution Description Format


Solution A: [Name]
  Basis: [Source Type] [Specific Reference]
  Approach: [One-sentence core approach]
  Cost: [Low/Medium/High]

Solution B: [Name]
  Basis: [Source Type] [Specific Reference]
  Approach: [One-sentence core approach]
  Cost: [Low/Medium/High]


### Solution Diversity Rules


Minimum 4 solutions, maximum 8 (Perspective Wheel mechanism, 1 solution per perspective).
Solutions must have substantial difference (must be different perspectives,
not just different parameters).

Good Example:
  Solution A: "Extend based on organization's existing X protocol"
    (Basis: Existing materials)
  Solution B: "Switch to Y approach, use separate process"
    (Basis: Official documentation)
  → Two solutions have essential difference

Bad Example:
  Solution A: "Use X protocol"
  Solution B: "Also use X but add Y component"
  → Essentially the same solution, just different details
  → Merge into one solution


---

## Simulation Output Format

After each solution simulation completes, must output report in following standard format:

### Complete Simulation Report Template


═══════════════════════════════════════════════════════
Simulated Solution: [Solution Name]
Knowledge Injection:
  - Value Function: [Referenced historical entries]
  - Decision Pattern: [Referenced success/failure patterns]
  - Context: [Relevant current session knowledge]
═══════════════════════════════════════════════════════

Step 1: [Starting Action]
  → Operation Description: [Specifically what to do]
  → Target: [Involved area/resource]
  → Expected Result: [Success/Partial success]
  → Difficulty: [Low/Medium/High]
  → Time Estimate: [How many steps or operations]

Step 2: [Critical Path]
  → Path Description: [Causal chain of subsequent steps]
  → Key Risks: [Nodes that might have problems]
    • Risk 1: [Description] → Probability:[High/Medium/Low] →
              Response:[Fallback solution]
    • Risk 2: [Description] → Probability:[High/Medium/Low] →
              Response:[Fallback solution]
  → Branch Points: [If choices exist, anticipate here]

Step 3: [Endpoint Assessment]
  → Final Result: [Expected completion state]
  → Side Effects: [Other areas possibly affected]
  → Leftover Issues: [Problems solution cannot cover]
  → Rollback Cost: [If failed, difficulty to restore original state]

─── Simulation Score ───
  Expected Value V (0.0~1.0):
  Variance σ² (0.0~1.0):
  Confidence Level: [High(σ²<0.1) / Medium(σ²<0.3) / Low(σ²≥0.3)]
  Top 3 Key Risks:
    1. [Risk + Impact Level]
    2. [Risk + Impact Level]
    3. [Risk + Impact Level]
  Recommendation: [Strongly Recommended / Recommended / Optional / Not Recommended]


### Quick Simulation Report Template (for rough filter stage)


Solution: [Name]
Feasibility: [0-1]
Cost-Benefit: [0-1]
Risk: [0-1]
Rough Filter Score: = Feasibility×0.5 + Cost-Benefit×0.3 + (1-Risk)×0.2
Keep/Eliminate: [Keep / Eliminate]


---

## Scoring Standards

### Expected Value V (0.0~1.0)


V = 1.0: Solution perfect, no side effects, success in one attempt
V = 0.9: Solution excellent, may have minor adjustments, overall smooth
V = 0.8: Solution good, expect 1-2 minor bumps
V = 0.7: Solution feasible, some risk but controllable
V = 0.6: Solution barely feasible, need cautious execution
V = 0.5: Neutral, may or may not work, need more info
V = 0.4: Solution has significant uncertainty, may have hidden issues
V = 0.3: Solution high risk, not recommended
V = 0.2: Solution likely to fail
V = 0.1: Solution basically infeasible
V = 0.0: Solution completely infeasible


### Variance σ² (0.0~1.0)


σ² = 0.0~0.05: Highly certain (similar tasks done many times)
σ² = 0.05~0.15: Fairly certain
σ² = 0.15~0.30: Some uncertainty
σ² = 0.30~0.50: Uncertain
σ² = 0.50~1.00: Highly uncertain (first attempt)

Variance Sources:
  - Low variance: Matches historical success pattern + Current context clear
  - Medium variance: Partial history match + Context has fuzzy points
  - High variance: No history match + Complex context + Unfamiliar methodology


### Confidence Level

| σ² Range | Confidence Level | Meaning |
|----------|-----------------|---------|
| < 0.1 | High | Simulation result credible, can execute confidently |
| 0.1 ~ 0.3 | Medium | Simulation result reference-worthy, but watch for surprises |
| ≥ 0.3 | Low | Simulation result for reference only, suggest collecting more info |

---

## Aggregate Comparison Rules

### Summary Table Format

After all solutions simulated, output aggregate comparison table:


┌───────────┬───────┬────────┬────────────┬──────────────────────────┐
│ Solution  │ Value │ Variance│ Confidence │ Key Risks                │
├───────────┼───────┼────────┼────────────┼──────────────────────────┤
│ SolutionA │ 0.85  │ 0.05   │ High       │ Depends on external      │
│           │       │        │            │ resource                 │
│ SolutionB │ 0.72  │ 0.18   │ Medium     │ Large change scope,      │
│           │       │        │            │ affects 3 areas          │
│ SolutionC │ 0.91  │ 0.08   │ High       │ Requires new             │
│           │       │        │            │ methodology adoption     │
└───────────┴───────┴────────┴────────────┴──────────────────────────┘

CLT-UCB: node $P/scripts/mcts_compute.js compute_clt_ucb
φ⁻¹(N): N=2→1.5, 3→1.0, 4→0.8, 5→0.7, n_i is solution simulation count


### Handling Close Rankings


Close ranking: node $P/scripts/mcts_compute.js handle_close_ranking
UCB diff <0.05 → Detailed comparison (V/σ²), diff <0.02 → Suggest user decision


---

## Policy Function Selection Guide

Ported from tetris_mcts's policy module, select different policies by stage:

### Rough Filter Stage Policy

| Policy | Applicable Scenario | Rule |
|--------|---------------------|------|
| policy_greedy | When solutions > 8 | Take top-3~5 with highest rough filter scores |
| policy_random | Need multi-angle exploration | Randomly select 5 solutions (ensure diversity) |

### Aggregate Comparison Stage Policy

| Policy | Applicable Scenario | Formula |
|--------|---------------------|---------|
| policy_clt (recommended) | Has variance info | UCB = V + Φ⁻¹(N) × √(σ²/n_i) |
| policy_max | No variance info | UCB = V + max_σ² × √(ln(N)/n_i) |
| policy_greedy | High confidence | UCB = V (directly select highest value) |

### Re-simulation Stage Policy

| Policy | Applicable Scenario | Rule |
|--------|---------------------|------|
| policy_greedy | Execution blocked | Directly select 2nd ranked solution |
| policy_clt | Need re-evaluation | Recalculate all solutions' UCB
                            (new info may have changed variance) |

---

## Value Function Persistence

### Memory File Path


memory/mcts-td-value-archive.md


### Storage Format

markdown
---
name: mcts-td-value-archive
description: MCTS-TD Engine cross-session value function archive
metadata:
  type: reference
---

## Value Function Table

| task_type | domain | risk_level | Visits(n) | Success(w) | Mean(q) | Variance(σ²) | Confidence | Last Updated |
|-----------|--------|-----------|----------|---------|---------|---------|------|---------|
| CORRECTIVE | INTERFACE | LOW | 47 | 44 | 0.936 | 0.05 | HIGH | 2026-06-03 |
| CONSTRUCTIVE | OPERATION | MED | 12 | 9 | 0.750 | 0.18 | MED | 2026-06-02 |
| OPTIMIZING | STORAGE | HIGH | 3 | 1 | 0.333 | 0.42 | LOW | 2026-06-01 |

## Decision Sequence Patterns

### Success Patterns
  - CORRECTIVE|INTERFACE: recon → read_target → apply → verify → confirm
  - CONSTRUCTIVE|OPERATION: recon → plan → acquire_resources → execute → validate_all

### Failure Patterns
  - DIAGNOSTIC|GENERAL: Skip recon, modify directly → High probability failure
  - CONSTRUCTIVE|STORAGE: Modify all areas at once → High probability conflicts

## Cross-session Knowledge
  - [2026-06-01] Stakeholder preference: Prefers conservative/defensive approach
  - [2026-06-02] Constraint: Storage layer not allowed to use third-party solutions directly


### Update Rules


After execution completes, execute TD update:
  1. Collect actual results:
     - Did execution achieve expected outcome
     - Any side effects or collateral damage
     - Key methodology and resources involved
  
  2. Calculate TD error:
     V_actual = Actual result score (0.0~1.0)
     V_simulated = Expected value during simulation
     TD_error = V_actual - V_simulated
  
  3. Update knowledge graph:
     Execute multi-path recall, find matching knowledge entries:
     
     If matching entry found:
       - Update n, q, σ² (using Welford)
       - Consolidation score += 5
       - Update last_verified
       - Check if status needs transition (based on TD_error magnitude
         and direction)
     
     If no match found:
       - Create new HYPOTHESIS entry
       - Extract tags keywords from task description
       - Record current context (methodology, resources, etc.)
       - Initial values: q=V_actual, σ²=0.25, n=1
       - Assign new ID (incrementing)
  
  4. Update decision sequence patterns:
     If successful: Record execution path to "Success Patterns"
     If failed: Record execution path to "Failure Patterns"
  
  5. Write to memory file
