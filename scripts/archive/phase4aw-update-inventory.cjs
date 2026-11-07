'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const AG_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const AV_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4av-proposed-inventory-diff.json');
const AR_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4ar-g3762-audit.json');
const AP_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4ap-tier1-inferred-audit.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4aw — Inventory Update ===\n');

// === 1. Load inputs ===
const ag = loadJson(AG_PATH);
const avDiff = loadJson(AV_PATH);

// Pre-snapshot of inventory state
const preSha = sha256file(AG_PATH);
const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state]||0)+1);
console.log('Phase 4ag inventory: total=' + ag.tokens.length + ', SHA256=' + preSha);
console.log('  states:', JSON.stringify(preCounts));

if (ag.tokens.length !== 92952) {
  console.error('FATAL: inventory total != 92,952:', ag.tokens.length);
  process.exit(1);
}

// === 2. Build the token map for fast lookup ===
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// === 3. PRE-FLIGHT: verify all 218 proposals match current state ===
console.log('\n--- Pre-Flight: Verifying 218 proposals ---');
const preErrors = [];
const diffs = avDiff.diffs;

console.log('  total diffs from Phase 4av:', diffs.length);
if (diffs.length !== 218) {
  preErrors.push('WRONG_DIFF_COUNT: expected 218, got ' + diffs.length);
}

// Verify each diff
for (const d of diffs) {
  const tok = agMap.get(d.ref);
  if (!tok) { preErrors.push('REF_NOT_FOUND: ' + d.ref); continue; }
  if (tok.state !== d.from) {
    preErrors.push('STATE_MISMATCH: ' + d.ref + ' expected="' + d.from + '" found="' + tok.state + '"');
  }
  if (d.from !== 'UNREVIEWED') {
    preErrors.push('NOT_UNREVIEWED: ' + d.ref + ' from=' + d.from + ' (all proposals must be from UNREVIEWED)');
  }
}

// Verify G3762 masculine 119 tokens are NOT in the diff (exclusion check)
const ar = loadJson(AR_PATH);
const ap = loadJson(AP_PATH);
const ar_refs = new Set(ar.tokens.map(t => t.ref));
const g3762ex = (ap.tokens||[]).filter(t => t.strong === 'G3762' && t.verdict === 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK');
const g3762masc = g3762ex.filter(t => !ar_refs.has(t.ref)); // 119 masculine
const diffRefSet = new Set(diffs.map(d => d.ref));
const masculine_in_diff = g3762masc.filter(t => diffRefSet.has(t.ref));
if (masculine_in_diff.length > 0) {
  preErrors.push('MASCULINE_IN_DIFF: ' + masculine_in_diff.length + ' G3762 masculine refs should NOT be in diff: ' + masculine_in_diff.map(t=>t.ref).join(', '));
}

if (preErrors.length > 0) {
  console.error('\nPRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error('  ' + e));
  console.error('\nSTOPPED: ' + preErrors.length + ' error(s). No changes applied.');
  process.exit(1);
}
console.log('  Pre-flight: PASS (218 refs verified, G3762 masculine exclusion verified)');

// === 4. Apply changes ===
console.log('\n--- Applying Changes ---');
const appliedDiffs = [];
const byCat = {};

for (const d of diffs) {
  const tok = agMap.get(d.ref);
  const prevState = tok.state;
  tok.state = d.to;
  // Update note to reflect basis
  tok.note = d.basis + (d.gloss ? ' (' + d.gloss + ')' : '') + (d.note ? ' — ' + d.note : '');
  appliedDiffs.push({ ref: d.ref, from: prevState, to: d.to, basis: d.basis, source: d.source });
  const k = prevState + '->' + d.to;
  byCat[k] = (byCat[k]||0)+1;
}

console.log('  Applied ' + appliedDiffs.length + ' changes');
Object.entries(byCat).forEach(([k,v]) => console.log('  ' + k + ': ' + v));

// === 5. POST-VERIFICATION ===
console.log('\n--- Post-Verification ---');
const postErrors = [];

// V1: total token count
if (ag.tokens.length !== 92952) postErrors.push('V1 total count changed: ' + ag.tokens.length);

// V2: ref uniqueness
const postRefs = new Set(ag.tokens.map(t => t.ref));
if (postRefs.size !== 92952) postErrors.push('V2 ref uniqueness: ' + postRefs.size + ' != 92952');

// V3: state counts
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state]||0)+1);
const expCounts = {
  UNREVIEWED: 33335 - 218,
  RETAIN_CONFIRMED: 59244 + 117,
  IMPLEMENTED_AND_VERIFIED: 365 + 100,
  HOLD_DATA_QUALITY: 7,
  HOLD_CONTEXT: 1 + 1
};
for (const [state, exp] of Object.entries(expCounts)) {
  if ((postCounts[state]||0) !== exp) {
    postErrors.push('V3 ' + state + ': expected=' + exp + ' got=' + (postCounts[state]||0));
  }
}
console.log('  V3 post counts:', JSON.stringify(postCounts));

// V4: Changed tokens have correct new state
let v4_ok = 0;
for (const d of appliedDiffs) {
  const tok = agMap.get(d.ref);
  if (tok.state !== d.to) postErrors.push('V4 ' + d.ref + ': state=' + tok.state + ' expected=' + d.to);
  else v4_ok++;
}
console.log('  V4 changed tokens correct: ' + v4_ok + '/' + appliedDiffs.length);

// V5: G3762 masculine 119 tokens still UNREVIEWED
const masculine_still_unreviewed = g3762masc.filter(t => agMap.get(t.ref)?.state === 'UNREVIEWED').length;
if (masculine_still_unreviewed !== g3762masc.length) {
  postErrors.push('V5 G3762 masculine not all UNREVIEWED: ' + masculine_still_unreviewed + '/' + g3762masc.length);
}
console.log('  V5 G3762 masculine still UNREVIEWED: ' + masculine_still_unreviewed + '/' + g3762masc.length);

// V6: existing HOLD_DATA_QUALITY tokens unchanged
const holdDQ_refs = ['MRK 4:8!20','MRK 4:8!23','MRK 4:20!19','MRK 4:20!22','MRK 4:20!25','MRK 10:50!7','LUK 24:28!11'];
for (const ref of holdDQ_refs) {
  const tok = agMap.get(ref);
  if (!tok || tok.state !== 'HOLD_DATA_QUALITY') {
    postErrors.push('V6 HOLD_DQ changed: ' + ref + ' now=' + (tok?.state || 'NOT_FOUND'));
  }
}
console.log('  V6 HOLD_DATA_QUALITY 7 refs unchanged: ' + (postErrors.filter(e=>e.startsWith('V6')).length===0 ? 'PASS' : 'FAIL'));

// V7: ACT 3:13!27 HOLD_CONTEXT unchanged
const actCtx = agMap.get('ACT 3:13!27');
if (!actCtx || actCtx.state !== 'HOLD_CONTEXT') {
  postErrors.push('V7 ACT 3:13!27 HOLD_CONTEXT changed: ' + actCtx?.state);
}

// V8: PHP 4:15!15 is now HOLD_CONTEXT
const php = agMap.get('PHP 4:15!15');
if (!php || php.state !== 'HOLD_CONTEXT') {
  postErrors.push('V8 PHP 4:15!15 not HOLD_CONTEXT: ' + php?.state);
}

// V9: LUK 4:26!3 is now RETAIN_CONFIRMED
const luk = agMap.get('LUK 4:26!3');
if (!luk || luk.state !== 'RETAIN_CONFIRMED') {
  postErrors.push('V9 LUK 4:26!3 not RETAIN_CONFIRMED: ' + luk?.state);
}

// V10: total = 92952
const totalPost = Object.values(postCounts).reduce((a,b)=>a+b,0);
if (totalPost !== 92952) postErrors.push('V10 total post != 92952: ' + totalPost);

console.log('  V7 ACT 3:13!27 HOLD_CONTEXT:', actCtx?.state);
console.log('  V8 PHP 4:15!15 HOLD_CONTEXT:', php?.state);
console.log('  V9 LUK 4:26!3 RETAIN_CONFIRMED:', luk?.state);
console.log('  V10 total post:', totalPost);

if (postErrors.length > 0) {
  console.error('\nPOST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error('  ' + e));
  process.exit(1);
}
console.log('\nPost-verification: PASS (10/10)');

// === 6. Update MD summary (top section only) ===
// Read existing MD and update state table in header
const mdPath = path.join(OUT, 'stage4-phase4ag-residual-inventory.md');
let md = '';
try { md = fs.readFileSync(mdPath, 'utf8'); } catch(e) { md = null; }

// === 7. Save updated inventory ===
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

// === 8. Write deliverables ===
// inventory-update-diff.json
const updateDiff = {
  meta: { phase: '4aw', date: new Date().toISOString().slice(0,10), source: 'stage4-phase4av-proposed-inventory-diff.json', total: appliedDiffs.length },
  pre_sha256: preSha,
  post_sha256: postSha,
  pre_counts: preCounts,
  post_counts: postCounts,
  state_delta: {
    UNREVIEWED: postCounts.UNREVIEWED - preCounts.UNREVIEWED,
    RETAIN_CONFIRMED: postCounts.RETAIN_CONFIRMED - preCounts.RETAIN_CONFIRMED,
    IMPLEMENTED_AND_VERIFIED: postCounts.IMPLEMENTED_AND_VERIFIED - preCounts.IMPLEMENTED_AND_VERIFIED,
    HOLD_CONTEXT: postCounts.HOLD_CONTEXT - preCounts.HOLD_CONTEXT,
    HOLD_DATA_QUALITY: postCounts.HOLD_DATA_QUALITY - preCounts.HOLD_DATA_QUALITY
  },
  diffs: appliedDiffs
};
saveJson(path.join(OUT, 'stage4-phase4aw-inventory-update-diff.json'), updateDiff);
console.log('Wrote: stage4-phase4aw-inventory-update-diff.json');

// inventory-verification.json
const verificationJson = {
  meta: { phase: '4aw', date: new Date().toISOString().slice(0,10) },
  checks: {
    V1_total: { expected: 92952, actual: ag.tokens.length, pass: ag.tokens.length === 92952 },
    V2_ref_unique: { expected: 92952, actual: postRefs.size, pass: postRefs.size === 92952 },
    V3_state_counts: { expected: expCounts, actual: postCounts, pass: Object.entries(expCounts).every(([s,e]) => (postCounts[s]||0) === e) },
    V4_changed_correct: { expected: 218, actual: v4_ok, pass: v4_ok === 218 },
    V5_g3762_masculine_unreviewed: { expected: g3762masc.length, actual: masculine_still_unreviewed, pass: masculine_still_unreviewed === g3762masc.length },
    V6_hold_dq_unchanged: { refs: holdDQ_refs, pass: postErrors.filter(e=>e.startsWith('V6')).length === 0 },
    V7_act_3_13_hold_ctx: { ref: 'ACT 3:13!27', state: actCtx?.state, pass: actCtx?.state === 'HOLD_CONTEXT' },
    V8_php_4_15_hold_ctx: { ref: 'PHP 4:15!15', state: php?.state, pass: php?.state === 'HOLD_CONTEXT' },
    V9_luk_4_26_rc: { ref: 'LUK 4:26!3', state: luk?.state, pass: luk?.state === 'RETAIN_CONFIRMED' },
    V10_total_sum: { expected: 92952, actual: totalPost, pass: totalPost === 92952 }
  },
  all_pass: true
};
saveJson(path.join(OUT, 'stage4-phase4aw-inventory-verification.json'), verificationJson);
console.log('Wrote: stage4-phase4aw-inventory-verification.json');

// === 9. Final summary ===
console.log('\n=== Phase 4aw: PASS ===');
console.log('Applied:', appliedDiffs.length, 'state changes to stage4-phase4ag-residual-inventory.json');
console.log('  UNREVIEWED → IMPL:', byCat['UNREVIEWED->IMPLEMENTED_AND_VERIFIED']);
console.log('  UNREVIEWED → RC:', byCat['UNREVIEWED->RETAIN_CONFIRMED']);
console.log('  UNREVIEWED → HOLD_CTX:', byCat['UNREVIEWED->HOLD_CONTEXT']);
console.log('Post state: UNREVIEWED=' + postCounts.UNREVIEWED + ', RC=' + postCounts.RETAIN_CONFIRMED + ', IMPL=' + postCounts.IMPLEMENTED_AND_VERIFIED + ', HOLD_CTX=' + postCounts.HOLD_CONTEXT + ', HOLD_DQ=' + postCounts.HOLD_DATA_QUALITY);
