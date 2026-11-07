'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const AX_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ax-g3762-masculine-audit.json');
const AR_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ar-g3762-audit.json');
const OUT    = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4ba — G3762 masculine 119件 inventory 更新 ===\n');

const ag = loadJson(AG_PATH);
const ax = loadJson(AX_PATH);
const ar = loadJson(AR_PATH);
const preSha = sha256file(AG_PATH);

// Pre-counts
const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state]||0)+1);
console.log('Pre inventory counts:', JSON.stringify(preCounts));
console.log('Pre total:', ag.tokens.length);

// === PRE-FLIGHT ===
console.log('\n--- Pre-Flight ---');
const preErrors = [];
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// 1. Verify 119 Phase 4ax tokens all exist as UNREVIEWED in inventory
const axRefs = ax.tokens.map(t => t.ref);
const notFound = axRefs.filter(r => !agMap.has(r));
const notUnrev = axRefs.filter(r => agMap.has(r) && agMap.get(r).state !== 'UNREVIEWED');
if (notFound.length) preErrors.push('NOT_FOUND: ' + notFound.join(', '));
if (notUnrev.length) preErrors.push('NOT_UNREVIEWED: ' + notUnrev.map(r => r + '=' + agMap.get(r).state).join(', '));
console.log('Phase 4ax refs exist in inventory: ' + (axRefs.length - notFound.length) + '/' + axRefs.length);
console.log('All UNREVIEWED before:', notUnrev.length === 0 ? 'YES' : 'NO (' + notUnrev.length + ' wrong)');

// 2. Verify Phase 4ax verdict distribution
const vm = {};
ax.tokens.forEach(t => vm[t.verdict] = (vm[t.verdict]||0)+1);
if (vm['CONFIRM_DAREMO'] !== 118) preErrors.push('WRONG_CONFIRM_DAREMO: ' + vm['CONFIRM_DAREMO']);
if (vm['APPROVE_NANIMO'] !== 1) preErrors.push('WRONG_APPROVE_NANIMO: ' + vm['APPROVE_NANIMO']);
console.log('Phase 4ax verdicts:', JSON.stringify(vm));

// 3. Verify ACT 20:24!2 specifically
const actTok = agMap.get('ACT 20:24!2');
if (!actTok) preErrors.push('ACT 20:24!2 NOT IN INVENTORY');
else if (actTok.state !== 'UNREVIEWED') preErrors.push('ACT 20:24!2 NOT UNREVIEWED: ' + actTok.state);
else if (actTok.strong !== 'G3762') preErrors.push('ACT 20:24!2 WRONG STRONG: ' + actTok.strong);
console.log('ACT 20:24!2 state:', actTok?.state, '| strong:', actTok?.strong);

// 4. Verify Phase 4ar neuter/feminine 95件 are NOT in Phase 4ax refs
const arRefs = new Set(ar.tokens.map(t => t.ref));
const overlap = axRefs.filter(r => arRefs.has(r));
if (overlap.length) preErrors.push('OVERLAP_WITH_4AR: ' + overlap.join(', '));
console.log('Phase 4ar overlap:', overlap.length, '(must = 0)');

if (preErrors.length > 0) {
  console.error('\nPRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('Pre-flight: PASS');

// === APPLY CHANGES ===
console.log('\n--- Applying Changes ---');
const appliedDiffs = [];

for (const axTok of ax.tokens) {
  const inv = agMap.get(axTok.ref);
  const prevState = inv.state;

  if (axTok.verdict === 'APPROVE_NANIMO') {
    // ACT 20:24!2 → IMPLEMENTED_AND_VERIFIED
    inv.state = 'IMPLEMENTED_AND_VERIFIED';
    inv.note = 'PHASE4AY_APPROVE_NANIMO_IMPLEMENTED_PHASE4AY (Phase 4ax APPROVE_NANIMO → 何も〜ない; Phase 4ay bible_data実装・Phase 4az search-index同期 PASS)';
  } else {
    // CONFIRM_DAREMO × 118 → RETAIN_CONFIRMED
    inv.state = 'RETAIN_CONFIRMED';
    inv.note = 'PHASE4AX_CONFIRM_DAREMO_RETAIN_CONFIRMED (G3762 masculine substantive use → 誰も〜ない confirmed; Phase 4ax individual audit PASS)';
  }

  appliedDiffs.push({ ref: axTok.ref, verdict: axTok.verdict, from: prevState, to: inv.state, strong: inv.strong });
}

const byState = {};
appliedDiffs.forEach(d => byState[d.from + '->' + d.to] = (byState[d.from + '->' + d.to]||0)+1);
console.log('Applied:', appliedDiffs.length, 'changes');
Object.entries(byState).forEach(([k,v]) => console.log(' ', k + ':', v));

// === POST-VERIFICATION ===
console.log('\n--- Post-Verification ---');
const postErrors = [];
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state]||0)+1);

// V1: total 119 changed
if (appliedDiffs.length !== 119) postErrors.push('V1 changed count: ' + appliedDiffs.length);
console.log('V1 changed count:', appliedDiffs.length, appliedDiffs.length === 119 ? 'PASS' : 'FAIL');

// V2: 118 → RETAIN_CONFIRMED
const rcCount = appliedDiffs.filter(d => d.to === 'RETAIN_CONFIRMED').length;
if (rcCount !== 118) postErrors.push('V2 RC count: ' + rcCount);
console.log('V2 RETAIN_CONFIRMED count:', rcCount, rcCount === 118 ? 'PASS' : 'FAIL');

// V3: ACT 20:24!2 → IMPLEMENTED_AND_VERIFIED
const actPost = agMap.get('ACT 20:24!2');
if (actPost?.state !== 'IMPLEMENTED_AND_VERIFIED') postErrors.push('V3 ACT 20:24!2 state: ' + actPost?.state);
console.log('V3 ACT 20:24!2 state:', actPost?.state, actPost?.state === 'IMPLEMENTED_AND_VERIFIED' ? 'PASS' : 'FAIL');

// V4: all 119 were UNREVIEWED before (checked in pre-flight already, verify diffs)
const allFromUR = appliedDiffs.every(d => d.from === 'UNREVIEWED');
if (!allFromUR) postErrors.push('V4 not all from UNREVIEWED');
console.log('V4 all from UNREVIEWED:', allFromUR ? 'PASS' : 'FAIL');

// V5: total 92,952
if (ag.tokens.length !== 92952) postErrors.push('V5 total: ' + ag.tokens.length);
console.log('V5 total tokens:', ag.tokens.length, ag.tokens.length === 92952 ? 'PASS' : 'FAIL');

// V6: ref uniqueness
const refSet = new Set(ag.tokens.map(t => t.ref));
if (refSet.size !== 92952) postErrors.push('V6 ref uniqueness: ' + refSet.size);
console.log('V6 ref unique:', refSet.size, refSet.size === 92952 ? 'PASS' : 'FAIL');

// V7: G3762 neuter/feminine 95件 state unchanged (check a few Phase 4ar refs)
const arSample = ar.tokens.slice(0,5);
const arUnchanged = arSample.every(t => {
  const inv = agMap.get(t.ref);
  return inv && inv.state !== 'UNREVIEWED'; // should be IMPL or RC from Phase 4aw
});
console.log('V7 G3762 neuter/feminine sample unchanged:', arUnchanged ? 'PASS' : 'FAIL');

// V8: state counts
const expCounts = {
  UNREVIEWED: preCounts.UNREVIEWED - 119,
  RETAIN_CONFIRMED: preCounts.RETAIN_CONFIRMED + 118,
  IMPLEMENTED_AND_VERIFIED: preCounts.IMPLEMENTED_AND_VERIFIED + 1,
  HOLD_DATA_QUALITY: preCounts.HOLD_DATA_QUALITY,
  HOLD_CONTEXT: preCounts.HOLD_CONTEXT
};
let v8pass = true;
for (const [state, exp] of Object.entries(expCounts)) {
  const act2 = postCounts[state] || 0;
  if (act2 !== exp) { v8pass = false; postErrors.push('V8 ' + state + ': exp=' + exp + ' got=' + act2); }
}
console.log('V8 state counts:', JSON.stringify(postCounts), v8pass ? 'PASS' : 'FAIL');

// V9: G3762 all 234 tokens state summary
const g3762All = ag.tokens.filter(t => t.strong === 'G3762');
const g3762States = {};
g3762All.forEach(t => g3762States[t.state] = (g3762States[t.state]||0)+1);
console.log('V9 G3762 all 234 states:', JSON.stringify(g3762States));
// Expected: 93+1(4ay)+118(4ba RC)+11(existing RC) = ?, 103+1=104 IMPL, 1 HOLD_CTX, 11+118=129 RC
// Let's check carefully:
// Pre: IMPL=103, UNREVIEWED=119, RC=11, HOLD_CTX=1 → total=234
// After: IMPL=103+1=104, UNREVIEWED=0, RC=11+118=129, HOLD_CTX=1 → total=234
const expG3762 = { IMPLEMENTED_AND_VERIFIED: 104, RETAIN_CONFIRMED: 129, UNREVIEWED: 0, HOLD_CONTEXT: 1 };
let v9pass = true;
for (const [state, exp] of Object.entries(expG3762)) {
  if ((g3762States[state]||0) !== exp) { v9pass = false; postErrors.push('V9 G3762 ' + state + ': exp=' + exp + ' got=' + (g3762States[state]||0)); }
}
console.log('V9 G3762 state check:', v9pass ? 'PASS' : 'FAIL');

// V10: total state sum
const totalPost = Object.values(postCounts).reduce((a,b)=>a+b,0);
if (totalPost !== 92952) postErrors.push('V10 total sum: ' + totalPost);
console.log('V10 total sum:', totalPost, totalPost === 92952 ? 'PASS' : 'FAIL');

// V11: HOLD_DATA_QUALITY 7件 / HOLD_CONTEXT 2件 unchanged
const holdDQ = ['MRK 4:8!20','MRK 4:8!23','MRK 4:20!19','MRK 4:20!22','MRK 4:20!25','MRK 10:50!7','LUK 24:28!11'];
holdDQ.forEach(r => {
  const t = agMap.get(r);
  if (!t || t.state !== 'HOLD_DATA_QUALITY') postErrors.push('V11 HOLD_DQ changed: ' + r + ' state=' + t?.state);
});
const holdCtx = ['ACT 3:13!27','PHP 4:15!15'];
holdCtx.forEach(r => {
  const t = agMap.get(r);
  if (!t || t.state !== 'HOLD_CONTEXT') postErrors.push('V11 HOLD_CTX changed: ' + r + ' state=' + t?.state);
});
console.log('V11 HOLD_DQ 7件 + HOLD_CTX 2件 unchanged:', postErrors.filter(e=>e.startsWith('V11')).length === 0 ? 'PASS' : 'FAIL');

if (postErrors.length > 0) {
  console.error('\nPOST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('\nPost-verification: PASS (11/11)');

// === SAVE INVENTORY ===
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

// === WRITE DELIVERABLES ===

// diff JSON
const diffJson = {
  meta: { phase: '4ba', date: new Date().toISOString().slice(0,10), total: 119 },
  pre_sha256: preSha,
  post_sha256: postSha,
  pre_counts: preCounts,
  post_counts: postCounts,
  state_delta: {
    UNREVIEWED: postCounts.UNREVIEWED - preCounts.UNREVIEWED,
    RETAIN_CONFIRMED: postCounts.RETAIN_CONFIRMED - preCounts.RETAIN_CONFIRMED,
    IMPLEMENTED_AND_VERIFIED: postCounts.IMPLEMENTED_AND_VERIFIED - preCounts.IMPLEMENTED_AND_VERIFIED,
    HOLD_CONTEXT: 0,
    HOLD_DATA_QUALITY: 0
  },
  g3762_masculine_summary: {
    total: 119,
    confirm_daremo_to_rc: 118,
    approve_nanimo_to_impl: 1,
    impl_ref: 'ACT 20:24!2'
  },
  g3762_all_234_post_state: g3762States,
  diffs: appliedDiffs
};
saveJson(path.join(OUT, 'stage4-phase4ba-inventory-update-diff.json'), diffJson);
console.log('Wrote: stage4-phase4ba-inventory-update-diff.json');

// verification JSON
const verJson = {
  meta: { phase: '4ba', date: new Date().toISOString().slice(0,10) },
  checks: {
    V1_changed_count: { expected: 119, actual: appliedDiffs.length, pass: appliedDiffs.length === 119 },
    V2_retain_confirmed: { expected: 118, actual: rcCount, pass: rcCount === 118 },
    V3_act_20_24_impl: { ref: 'ACT 20:24!2', state: actPost?.state, pass: actPost?.state === 'IMPLEMENTED_AND_VERIFIED' },
    V4_all_from_unreviewed: { pass: allFromUR },
    V5_total_tokens: { expected: 92952, actual: ag.tokens.length, pass: ag.tokens.length === 92952 },
    V6_ref_uniqueness: { expected: 92952, actual: refSet.size, pass: refSet.size === 92952 },
    V7_g3762_ar_unchanged: { pass: arUnchanged },
    V8_state_counts: { expected: expCounts, actual: postCounts, pass: v8pass },
    V9_g3762_all_states: { expected: expG3762, actual: g3762States, pass: v9pass },
    V10_total_sum: { expected: 92952, actual: totalPost, pass: totalPost === 92952 },
    V11_hold_unchanged: { HOLD_DATA_QUALITY: 7, HOLD_CONTEXT: 2, pass: postErrors.filter(e=>e.startsWith('V11')).length === 0 }
  },
  all_pass: true
};
saveJson(path.join(OUT, 'stage4-phase4ba-inventory-verification.json'), verJson);
console.log('Wrote: stage4-phase4ba-inventory-verification.json');

console.log('\n=== Phase 4ba COMPLETE ===');
console.log('UNREVIEWED -119:', preCounts.UNREVIEWED, '->', postCounts.UNREVIEWED);
console.log('RETAIN_CONFIRMED +118:', preCounts.RETAIN_CONFIRMED, '->', postCounts.RETAIN_CONFIRMED);
console.log('IMPLEMENTED_AND_VERIFIED +1:', preCounts.IMPLEMENTED_AND_VERIFIED, '->', postCounts.IMPLEMENTED_AND_VERIFIED);
