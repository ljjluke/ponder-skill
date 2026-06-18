#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  MMA Memory Seed-and-Recall Validation Pipeline
#  "经脉者，所以决死生，处百病，调虚实，不可不通" —《灵枢·经脉》
#
#  Purpose:
#    1. Create directory structure and fresh knowledge graph
#    2. Seed 15 knowledge entries across 9+ meridians (framework architecture data)
#    3. Validate deqi recall ranking order
#    4. Validate reinforce TD weight update
#    5. Validate status output with expected meridian counts
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

MCTS="node $(dirname "$0")/mcts.js"
PASS=0
FAIL=0

# ─── Helpers ───
pass() { echo "  PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL+1)); }
check() {
    local desc="$1" result="$2"
    if echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); assert $3" 2>/dev/null; then
        pass "$desc"
    else
        echo "  FAIL: $desc"
        echo "    Expected: $3"
        echo "    Got: $(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin))" 2>/dev/null || echo "$result")"
        FAIL=$((FAIL+1))
    fi
}

# ═══════════════════════════════════════════════════════════════
#  Step 1: Clean and create directory structure
# ═══════════════════════════════════════════════════════════════
echo "=== Step 1: Directory Structure ==="
# Remove any existing data to start clean
rm -rf ~/.claude/data/skills/ponder/memory 2>/dev/null || true

MMA_DIR=~/.claude/data/skills/ponder/memory
mkdir -p "$MMA_DIR/shards" "$MMA_DIR/archive" "$MMA_DIR/wal" "$MMA_DIR/locks"

for d in shards archive wal locks; do
    if [ -d "$MMA_DIR/$d" ]; then
        pass "Directory created: $MMA_DIR/$d"
    else
        fail "Directory missing: $MMA_DIR/$d"
    fi
done

echo ""
echo "=== Step 2: Seed 15 Knowledge Entries Across 9+ Meridians ==="
echo ""

# ─── Helper to insert via ashi ───
insert() {
    local desc="$1" tags="$2" category="$3"
    $MCTS mma ashi "$(printf '{"description":"%s","tags":%s,"category":"%s","emotion":"xi","source":"execution_result","q":0.7,"memory_type":"semantic"}' "$desc" "$tags" "$category")" 2>/dev/null
}

declare -a POINT_IDS

# 1. heart (core_decision)
echo "--- heart/core_decision ---"
R=$(insert "Pipeline uses 7 phases: Divergence->Dimension->Plans->Simulate->Debate->Synthesize->Verify" '["pipeline","architecture","core_decision","7_phases"]' "core_decision")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"
check "heart entry has id" "$R" "'id' in d.get('point',{})"

# 2. lung (tools_and_means)
echo "--- lung/tools_and_means ---"
R=$(insert "CLT-UCB formula balances exploration and exploitation using Central Limit Theorem for uncertainty estimation" '["mcts","ucb","algorithm","exploration","clt"]' "tools_and_means")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 3. stomach (core_process)
echo "--- stomach/core_process ---"
R=$(insert "Divergence phase produces 6 perspectives with contradictions and consensus conclusion from each analysis round" '["divergence","process","flow","perspectives","analysis"]' "core_process")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 4. gallbladder (judgment_and_strategy)
echo "--- gallbladder/judgment_and_strategy ---"
R=$(insert "Six-perspective divergence analysis ensures multi-dimensional coverage: at least 2 contradictions required between perspectives" '["divergence","strategy","perspective","coverage","contradiction"]' "judgment_and_strategy")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 5. spleen (structure_and_framework)
echo "--- spleen/structure_and_framework ---"
R=$(insert "Knowledge organized in 12-meridian structure with 7 cognitive dimensions: core, why, when, how, risks, alternatives, prerequisites" '["architecture","framework","structure","dimensions","12_meridians","knowledge"]' "structure_and_framework")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 6. kidney (safety_and_bottom_line)
echo "--- kidney/safety_and_bottom_line ---"
R=$(insert "Quality gate rejects true noise: entry must have description>=10 chars OR tags>0 OR emotion set OR source known to pass" '["quality","safety","guard","noise","rejection"]' "safety_and_bottom_line")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 7. liver (efficiency_and_resources)
echo "--- liver/efficiency_and_resources ---"
R=$(insert "Tag index in io.js provides O(1) tag-to-point lookup replacing O(n) full meridian scan for deqi recall performance" '["performance","optimization","index","tag","lookup","algorithm"]' "efficiency_and_resources")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 8. pericardium (verification_and_validation)
echo "--- pericardium/verification_and_validation ---"
R=$(insert "Debate phase uses multi-stance cross-examination: each plan gets 2-3 evidence-based strengths and 2-3 risks with data citations" '["verification","debate","validation","cross_examination","evidence"]' "verification_and_validation")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 9. large_intestine (input_and_output)
echo "--- large_intestine/input_and_output ---"
R=$(insert "User request enters pipeline, structured JSON output carries divergence perspectives, dimension scores, plans, simulations, debate synthesis, verification verdict" '["input","output","data_flow","json","pipeline","schema"]' "input_and_output")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 10. triple_burner (dependencies_and_coordination)
echo "--- triple_burner/dependencies_and_coordination ---"
R=$(insert "Triple burner working memory: upper burner holds 7 most recent, middle burner holds session data up to 72h, lower burner holds historic up to 24h" '["memory","working_memory","dependency","coordination","burner"]' "dependencies_and_coordination")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 11. bladder (environment_and_conditions)
echo "--- bladder/environment_and_conditions ---"
R=$(insert "MMA data stored in ~/.claude/data/skills/ponder/memory/ with shard-per-meridian files in shards/, WAL logs in wal/, snapshots in archive/, locks in locks/" '["environment","storage","filesystem","directory","shard","persistence"]' "environment_and_conditions")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 12. small_intestine (external_interface)
echo "--- small_intestine/external_interface ---"
R=$(insert "Unified CLI via mcts.js: node scripts/mcts.js <engine> <command> with engines compute, guard, mma, lang, template, tree, knowledge, decisions, uncertainty, weights" '["interface","cli","external","command","engine","gateway"]' "external_interface")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 13. heart (core_decision) — second entry in heart
echo "--- heart/core_decision #2 ---"
R=$(insert "Five-element interactions govern knowledge relationships: generating nourishes, controlling restrains, over_acting overwhelms, insulting counter-controls" '["five_element","interaction","philosophy","yin_yang","cycle"]' "core_decision")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 14. gallbladder (judgment_and_strategy) — second entry
echo "--- gallbladder/judgment_and_strategy #2 ---"
R=$(insert "Ziwu Liuzhu time-based meridian activation uses hourly branch + daily ganzhi + yearly flying star to determine active meridians for deqi" '["time","activation","circadian","ziwu","meridian","computation"]' "judgment_and_strategy")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

# 15. liver (efficiency_and_resources) — second entry
echo "--- liver/efficiency_and_resources #2 ---"
R=$(insert "Experience replay consolidates up to 50 points per session-end: emotion-filtered replay strengthens consolidation_score by emotion boost value" '["consolidation","replay","memory","emotion","session","reinforcement"]' "efficiency_and_resources")
PID=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin)['point']['id'])" 2>/dev/null)
POINT_IDS+=("$PID")
echo "  Inserted: $PID"

echo ""
echo "Total seeded: ${#POINT_IDS[@]} entries"
echo "Point IDs: ${POINT_IDS[*]}"

echo ""
echo "=== Step 3: Deqi Recall — Validate Ranking Order ==="

# ─── Deqi with query matching multiple entries ───
echo "--- Query: pipeline + architecture ---"
DEQI_R=$($MCTS mma deqi '{"tags":["pipeline","architecture"],"limit":6}' 2>/dev/null)

check "deqi returns at least 3 results" "$DEQI_R" "len(d.get('results',[])) >= 3"

# Check ranking: first result should have highest deqi_score
DEQI_SCORES=$(echo "$DEQI_R" | python3 -c "
import sys,json
d = json.load(sys.stdin)
results = d.get('results', [])
scores = [r.get('deqi_score',0) for r in results]
# Verify descending order
is_sorted = all(scores[i] >= scores[i+1] for i in range(len(scores)-1))
print(f'scores={scores} sorted={is_sorted}')
" 2>/dev/null)
echo "  $DEQI_SCORES"

if echo "$DEQI_SCORES" | grep -q "sorted=True"; then
    pass "Deqi results ranked in descending order by deqi_score"
else
    fail "Deqi results NOT in descending order"
fi

# Count distinct meridians returned
MERIDIAN_COUNT=$(echo "$DEQI_R" | python3 -c "
import sys,json
d = json.load(sys.stdin)
meridians = set(r.get('meridian','') for r in d.get('results',[]))
print(len(meridians))
" 2>/dev/null)
echo "  Distinct meridians in results: $MERIDIAN_COUNT"
if [ "$MERIDIAN_COUNT" -ge 2 ]; then
    pass "Deqi returns results from $MERIDIAN_COUNT different meridians"
else
    fail "Deqi returned results from only $MERIDIAN_COUNT meridian(s)"
fi

echo ""
echo "=== Step 4: Reinforce — Validate TD Weight Update ==="

# Use the first point ID from seeding
TARGET_ID="${POINT_IDS[0]}"
echo "Reinforcing point: $TARGET_ID with td_error=0.25 (tonify)"

# Get pre-reinforce q value
PRE_R=$($MCTS mma load 2>/dev/null)
PRE_Q=$(echo "$PRE_R" | python3 -c "
import sys,json
d = json.load(sys.stdin)
for m in d.get('meridians',{}).values():
    for p in m.get('points',[]):
        if p.get('id')=='$TARGET_ID':
            print(p.get('q',0.5))
            break
" 2>/dev/null)
echo "  Pre-reinforce q: $PRE_Q"

# Run reinforce with positive td_error (tonify)
REINF_R=$($MCTS mma reinforce "$TARGET_ID" 0.25 '{"v_actual":0.85}' 2>/dev/null)

check "reinforce returns point" "$REINF_R" "'point' in d"
check "reinforce uses tonify technique" "$REINF_R" "d.get('technique')=='tonify'"
check "reinforce updates q value" "$REINF_R" "d.get('newQ',0) > $PRE_Q"

NEW_Q=$(echo "$REINF_R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('newQ',0))" 2>/dev/null)
echo "  Post-reinforce q: $NEW_Q"
echo "  Delta: $(echo "$NEW_Q - $PRE_Q" | bc -l 2>/dev/null || echo 'N/A')"

# Now test drain (negative td_error)
TARGET_ID2="${POINT_IDS[3]}"
PRE_Q2=$(echo "$PRE_R" | python3 -c "
import sys,json
d = json.load(sys.stdin)
for m in d.get('meridians',{}).values():
    for p in m.get('points',[]):
        if p.get('id')=='$TARGET_ID2':
            print(p.get('q',0.5))
            break
" 2>/dev/null)
echo "  Pre-drain q for $TARGET_ID2: $PRE_Q2"

REINF_R2=$($MCTS mma reinforce "$TARGET_ID2" -0.3 '{"v_actual":0.3}' 2>/dev/null)

check "reinforce drain uses drain technique" "$REINF_R2" "d.get('technique')=='drain'"

NEW_Q2=$(echo "$REINF_R2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('newQ',0))" 2>/dev/null)
echo "  Post-drain q: $NEW_Q2"

if python3 -c "assert $NEW_Q2 < $PRE_Q2" 2>/dev/null; then
    pass "Drain decreases q value ($PRE_Q2 -> $NEW_Q2)"
else
    fail "Drain did not decrease q value"
fi

echo ""
echo "=== Step 5: Status — Validate Meridian Counts ==="

STATUS_R=$($MCTS mma status 2>/dev/null)

# Total points should be 15 (all seeded)
check "status total_points is 15" "$STATUS_R" "d.get('total_points')==15"
check "status visible_points is 15" "$STATUS_R" "d.get('visible_points')==15"
check "status hidden_points is 0" "$STATUS_R" "d.get('hidden_points')==0"

# Check specific meridians have non-zero counts
check "heart meridian has points" "$STATUS_R" "d['meridians'].get('heart',{}).get('visible',0)>=2"
check "lung meridian has points" "$STATUS_R" "d['meridians'].get('lung',{}).get('visible',0)>=1"
check "stomach meridian has points" "$STATUS_R" "d['meridians'].get('stomach',{}).get('visible',0)>=1"
check "liver meridian has points" "$STATUS_R" "d['meridians'].get('liver',{}).get('visible',0)>=2"
check "gallbladder has points" "$STATUS_R" "d['meridians'].get('gallbladder',{}).get('visible',0)>=2"
check "kidney meridian has points" "$STATUS_R" "d['meridians'].get('kidney',{}).get('visible',0)>=1"
check "spleen meridian has points" "$STATUS_R" "d['meridians'].get('spleen',{}).get('visible',0)>=1"

# Count non-empty meridians
ACTIVE_MERIDIANS=$(echo "$STATUS_R" | python3 -c "
import sys,json
d = json.load(sys.stdin)
count = sum(1 for m in d.get('meridians',{}).values() if m.get('visible',0) > 0)
print(count)
" 2>/dev/null)
echo "  Meridians with points: $ACTIVE_MERIDIANS"

if [ "$ACTIVE_MERIDIANS" -ge 9 ]; then
    pass "At least 9 meridians have seeded points (got $ACTIVE_MERIDIANS)"
else
    fail "Only $ACTIVE_MERIDIANS meridians have points (expected 9+)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
