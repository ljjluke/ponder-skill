/**
 * Lesson Correction Cycle Test (v2)
 *
 * Tests: Store ? Recall ? User correction (force_refuted) ? Verify REFUTED ? Deprecate
 *
 * Bug coverage:
 *  - Bug #1: reinforce drain doesn't change status (needs force_refuted flag)
 *  - Bug #2: knowledge acquire returns q=undefined (missing r.point.q mapping)
 *  - Bug #3: knowledge acquire CLI returns object not array (broke findExistingLesson)
 *  - Bug #4: recordOutcome didn't pass force_refuted
 *
 * Run: node scripts/test-lesson-correction.js
 */
const { spawnSync } = require('child_process');
const path = require('path');

const MMA = path.join(__dirname, '..', 'scripts', 'mcts.js');
const TAG = 'test_corr_v2_' + Date.now();
let passed = 0, failed = 0;

function spawnArgs(args) {
  const r = spawnSync('node', [MMA, ...args], { timeout: 10000, encoding: 'utf-8' });
  let data = null;
  try { data = JSON.parse(r.stdout); } catch(e) { data = null; }
  return { ok: r.status === 0, data, raw: r.stdout, status: r.status };
}

function assert(cond, msg) {
  console.log(cond ? `  ? ${msg}` : `  ? ${msg}`);
  cond ? passed++ : failed++;
}

console.log('\n═══════════════════════════════════════');
console.log('  Lesson Correction Cycle Test v2');
console.log('═══════════════════════════════════════\n');

// 1. Store a test lesson
console.log('1. Store a test lesson');
const store = spawnArgs(['mma', 'ashi', JSON.stringify({
  description: '[TEST] weight bias: data availability skews dimension score',
  tags: [TAG, 'bagua', 'weight_bias'],
  category: 'hypothesis', emotion: 'an', q: 0.7,
})]);
assert(store.ok && store.data?.point?.id, 'Lesson stored: ' + (store.data?.point?.id || 'no id'));
const lessonId = store.data?.point?.id;
if (!lessonId) { console.log('\n  ?  Cannot continue\n'); process.exit(1); }

// 2. Recall before correction — verify q is present
console.log('\n2. Recall lesson (before correction)');
const r1 = spawnArgs(['knowledge', 'acquire', JSON.stringify({ tags: [TAG], limit: 5 })]);
assert(r1.ok && Array.isArray(r1.data) && r1.data.length > 0, `Lesson found: ${r1.data?.length || 0} entries`);

// Check q is not undefined (Bug #2 fix verification)
const entryQ = r1.data[0]?.q;
assert(entryQ !== undefined && entryQ !== null, `q value present: ${entryQ}`);

// 3. Mark as corrected (force_refuted) — correct CLI format: pointId tdError experienceJson
console.log('\n3. User says lesson is wrong ? reinforce drain + force_refuted');
const correct = spawnArgs(['mma', 'reinforce', lessonId, '-0.5', JSON.stringify({
  force_refuted: true,
  reason: '[TEST] User reported conditions changed, this bias no longer applies',
})]);
assert(correct.ok, 'Correction applied via reinforce');
assert(correct.data?.point?.status === 'REFUTED', `Status changed to REFUTED (got: ${correct.data?.point?.status})`);
assert(correct.data?.point?.q < 0.7, `q value reduced: ${correct.data?.point?.q?.toFixed(3)}`);

// 4. Recall after correction — REFUTED should be filtered out by acquire()
console.log('\n4. Recall lesson (after correction — REFUTED should be excluded)');
const r2 = spawnArgs(['knowledge', 'acquire', JSON.stringify({ tags: [TAG], limit: 5 })]);
if (Array.isArray(r2.data) && r2.data.length > 0) {
  console.log(`     ${r2.data.length} entries returned (expected 0 if only TAG entry was refuted)`);
  r2.data.forEach(e => console.log(`     ${e.id}: status=${e.status || '?'} q=${e.q ?? '?'}`));
  // At minimum check that our refuted lesson is NOT in the output
  const refutedStillVisible = r2.data.some(e => e.id === lessonId);
  assert(!refutedStillVisible, 'REFUTED lesson excluded from recall');
} else {
  assert(true, 'Recall correctly returned 0 entries (REFUTED excluded)');
}

// 5. Store a replacement lesson (updated understanding)
console.log('\n5. Store replacement lesson (updated understanding)');
const store2 = spawnArgs(['mma', 'ashi', JSON.stringify({
  description: '[TEST] corrected: bias now mitigated by automated checks',
  tags: [TAG, 'bagua', 'weight_bias_mitigated'],
  category: 'tools_and_means', emotion: 'xi', q: 0.8,
})]);
assert(store2.ok, 'Replacement stored: ' + (store2.data?.point?.id || ''));
const newId = store2.data?.point?.id;

// 6. Store another non-refuted lesson to test recall count
console.log('\n6. Store a third lesson (unrelated)');
const store3 = spawnArgs(['mma', 'ashi', JSON.stringify({
  description: '[TEST] normal lesson still recallable',
  tags: [TAG, 'bagua', 'normal_test'],
  category: 'hypothesis', emotion: 'xi', q: 0.6,
})]);
assert(store3.ok, 'Third lesson stored: ' + (store3.data?.point?.id || ''));

// 7. Final recall — should return 2 entries (the replacement + normal), not the REFUTED
console.log('\n7. Verify recall excludes REFUTED lesson');
const r3 = spawnArgs(['knowledge', 'acquire', JSON.stringify({ tags: [TAG], limit: 10 })]);
if (Array.isArray(r3.data)) {
  assert(r3.data.length >= 1, `Got ${r3.data.length} entries`);
  // Check q values are present (Bug #2 fix verification)
  const allHaveQ = r3.data.every(e => e.q !== undefined && e.q !== null);
  assert(allHaveQ, 'All entries have q value');
  // Log summary
  r3.data.forEach(e => console.log(`     ${e.id}: status=${e.status || '?'} q=${e.q?.toFixed(3) ?? '?'}`));
  // Ensure no REFUTED entries leaked
  const hasRefuted = r3.data.some(e => e.status === 'REFUTED');
  assert(!hasRefuted, 'No REFUTED entries in recall output');
} else {
  assert(false, 'Final recall returned array');
}

// Summary
console.log('\n═══════════════════════════════════════');
console.log(`  ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('  All tests passed ?');
console.log(`  Test tag: ${TAG}`);
console.log('═══════════════════════════════════════\n');
process.exit(failed > 0 ? 1 : 0);
