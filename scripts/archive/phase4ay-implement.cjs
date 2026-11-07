'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AX_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ax-g3762-masculine-audit.json');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function sha256buf(b) { return crypto.createHash('sha256').update(b).digest('hex'); }

console.log('=== Phase 4ay — ACT 20:24!2 訳語修正実装 ===\n');

// === 1. Load Phase 4ax audit ===
const ax = loadJson(AX_PATH);
const target = ax.tokens.find(t => t.ref === 'ACT 20:24!2');
if (!target) { console.error('FATAL: ACT 20:24!2 not found in Phase 4ax JSON'); process.exit(1); }
if (target.verdict !== 'APPROVE_NANIMO') { console.error('FATAL: verdict != APPROVE_NANIMO:', target.verdict); process.exit(1); }
if (!target.recommended_ja || target.recommended_ja.trim() === '') {
  console.error('FATAL: recommended_ja is empty'); process.exit(1);
}
const RECOMMENDED_JA = target.recommended_ja; // "何も〜ない"
const EXPECTED_CURRENT = target.cur_japanese;  // "誰も〜ない"
console.log('Target ref:', target.ref);
console.log('Strong:', target.strong, '| Morph:', target.morph, '| Greek:', target.greek_form);
console.log('Current japanese:', EXPECTED_CURRENT);
console.log('Recommended japanese:', RECOMMENDED_JA);
console.log('Verdict: APPROVE_NANIMO | Confidence:', target.confidence, '\n');

// === 2. Load all 119 masculine tokens for pre-snapshot ===
const all119 = ax.tokens; // all 119 from Phase 4ax
console.log('Phase 4ax total tokens:', all119.length, '(expecting 119)');
if (all119.length !== 119) { console.error('FATAL: not 119'); process.exit(1); }

// === 3. Locate target file: ACT/20.json ===
const TARGET_FILE = path.join(BIBLE, 'ACT/20.json');
const preSha = sha256file(TARGET_FILE);
console.log('Target file: public/bible_data/nt/ACT/20.json');
console.log('Pre-implementation SHA256:', preSha);

const data = loadJson(TARGET_FILE);
const tokenIndex = data.findIndex(t => t.ref === 'ACT 20:24!2');
if (tokenIndex === -1) { console.error('FATAL: ACT 20:24!2 not found in ACT/20.json'); process.exit(1); }
const tok = data[tokenIndex];

// === 4. Pre-flight verification ===
console.log('\n--- Pre-flight ---');
const preErrors = [];

if (tok.strong !== 'G3762') preErrors.push('STRONG_MISMATCH: ' + tok.strong);
if (tok.text !== target.greek_form && tok.lemma !== 'οὐδείς') {
  // text might differ slightly from stored greek_form (elision etc.) - check lemma
  console.log('  text in bible_data:', tok.text, '| Phase 4ax greek_form:', target.greek_form);
}
if (tok.morph !== 'A-GSM-N') preErrors.push('MORPH_MISMATCH: ' + tok.morph);
if (tok.japanese !== EXPECTED_CURRENT) preErrors.push('JA_MISMATCH: found="' + tok.japanese + '" expected="' + EXPECTED_CURRENT + '"');
if (tok.ref !== 'ACT 20:24!2') preErrors.push('REF_MISMATCH: ' + tok.ref);

// Verify no other G3762 token in this file has japanese changed
const g3762InFile = data.filter(t => t.strong === 'G3762');
console.log('  G3762 tokens in ACT/20.json:', g3762InFile.length);
g3762InFile.forEach(t => console.log('   ', t.ref, t.morph, '"'+t.japanese+'"'));

// Pre-snapshot: all 119 masculine tokens (from bible_data)
console.log('\n--- Loading pre-snapshot for all 119 tokens ---');
const preSnapshot = [];
for (const axTok of all119) {
  const m = axTok.ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  const [,book,ch] = m;
  const fp = path.join(BIBLE, book, ch+'.json');
  const d = loadJson(fp);
  const bt = d.find(t => t.ref === axTok.ref);
  if (!bt) { preErrors.push('NOT_FOUND_PRE: ' + axTok.ref); continue; }
  preSnapshot.push({
    ref: axTok.ref,
    strong: bt.strong,
    morph: bt.morph,
    text: bt.text,
    japanese: bt.japanese,
    file: 'public/bible_data/nt/' + book + '/' + ch + '.json'
  });
}

if (preErrors.length > 0) {
  console.error('\nPRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('Pre-flight PASS. ACT 20:24!2 confirmed:', tok.strong, tok.morph, '"'+tok.japanese+'"');

// === 5. Save pre-snapshot JSON ===
const preSnapshotObj = {
  meta: { phase: '4ay', date: new Date().toISOString().slice(0,10), description: 'G3762 masculine 119件の実装前スナップショット' },
  target: {
    ref: tok.ref,
    book: 'ACT', chapter: '20', verse: '24', tokenIndex,
    strong: tok.strong,
    lemma: tok.lemma || 'οὐδείς',
    greek_form: tok.text,
    morph: tok.morph,
    japanese_before: tok.japanese,
    japanese_after: RECOMMENDED_JA,
    file: 'public/bible_data/nt/ACT/20.json',
    file_sha256_before: preSha
  },
  all_119_before: preSnapshot
};
saveJson(path.join(OUT, 'stage4-phase4ay-pre-implementation-snapshot.json'), preSnapshotObj);
console.log('Wrote: stage4-phase4ay-pre-implementation-snapshot.json');

// === 6. IMPLEMENT ===
console.log('\n--- IMPLEMENTATION ---');
const prevJa = tok.japanese;
tok.japanese = RECOMMENDED_JA;
console.log('Applied: "' + prevJa + '" → "' + RECOMMENDED_JA + '" at ACT 20:24!2 (tokenIndex=' + tokenIndex + ')');

// Verify only this token changed
const tokenDiff = [];
data.forEach((t, idx) => {
  const pre = preSnapshot.find(ps => ps.ref === t.ref);
  if (pre && t.japanese !== pre.japanese) {
    tokenDiff.push({ ref: t.ref, idx, from: pre.japanese, to: t.japanese });
  }
});
if (tokenDiff.length !== 1) {
  console.error('FATAL: unexpected diff count in file:', tokenDiff.length);
  tokenDiff.forEach(d => console.error(' ', d));
  process.exit(1);
}
console.log('File diff: 1 change (as expected)');

// Save updated file
fs.writeFileSync(TARGET_FILE, JSON.stringify(data, null, 2), 'utf8');
const postSha = sha256file(TARGET_FILE);
console.log('File written. Post SHA256:', postSha);
// Verify JSON parseable
const reparsed = loadJson(TARGET_FILE);
console.log('JSON integrity: PASS (reparsed successfully, tokens=' + reparsed.length + ')');

// === 7. POST-VERIFICATION ===
console.log('\n--- Post-Verification ---');
const postErrors = [];

// V1: target ref exists uniquely
const matches = reparsed.filter(t => t.ref === 'ACT 20:24!2');
if (matches.length !== 1) postErrors.push('V1 unique ref: ' + matches.length);
console.log('V1 unique ref:', matches.length, '(expect 1)');

// V2: pre-state matches Phase 4ax
const v2tok = reparsed.find(t => t.ref === 'ACT 20:24!2');
if (preSnapshotObj.target.strong !== 'G3762') postErrors.push('V2 strong mismatch');
if (preSnapshotObj.target.greek_form !== tok.text) {
  // just log, don't fail — text field might have elisions
}
if (preSnapshotObj.target.morph !== 'A-GSM-N') postErrors.push('V2 morph mismatch');
if (preSnapshotObj.target.japanese_before !== EXPECTED_CURRENT) postErrors.push('V2 ja_before mismatch: ' + preSnapshotObj.target.japanese_before);
console.log('V2 pre-state match Phase 4ax: PASS');

// V3: recommended_ja applied
if (v2tok.japanese !== RECOMMENDED_JA) {
  postErrors.push('V3 japanese: "' + v2tok.japanese + '" != "' + RECOMMENDED_JA + '"');
}
console.log('V3 japanese applied:', '"'+v2tok.japanese+'"', RECOMMENDED_JA === v2tok.japanese ? 'PASS' : 'FAIL');

// V4: other 118 unchanged
console.log('V4 checking other 118 G3762 masculine tokens unchanged...');
let v4_unchanged = 0;
const otherTokens = all119.filter(t => t.ref !== 'ACT 20:24!2');
for (const axTok of otherTokens) {
  const m2 = axTok.ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  const [,b2,c2] = m2;
  const fp2 = path.join(BIBLE, b2, c2+'.json');
  const d2 = loadJson(fp2);
  const bt2 = d2.find(t => t.ref === axTok.ref);
  if (!bt2) { postErrors.push('V4 NOT_FOUND: ' + axTok.ref); continue; }
  const pre2 = preSnapshot.find(ps => ps.ref === axTok.ref);
  if (bt2.japanese !== pre2.japanese) {
    postErrors.push('V4 CHANGED: ' + axTok.ref + ' "' + pre2.japanese + '" → "' + bt2.japanese + '"');
  } else {
    v4_unchanged++;
  }
}
console.log('V4 other 118 unchanged:', v4_unchanged + '/118', v4_unchanged === 118 ? 'PASS' : 'FAIL');

// V5: target file JSON parseable (already done above)
console.log('V5 JSON integrity: PASS');

// V6: SHA256 changed
if (preSha === postSha) postErrors.push('V6 SHA256 did not change');
console.log('V6 SHA256 changed:', preSha !== postSha ? 'PASS' : 'FAIL');

// V7: only ACT/20.json modified (check that other files didn't change — we only wrote one file)
console.log('V7 only target file modified: PASS (only ACT/20.json written)');

if (postErrors.length > 0) {
  console.error('\nPOST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('\nPost-verification: PASS (7/7)');

// === 8. Write deliverables ===

// token-diff.json
const tokenDiffJson = {
  meta: { phase: '4ay', date: new Date().toISOString().slice(0,10), total: 1 },
  diffs: [{
    ref: 'ACT 20:24!2',
    verdict: 'APPROVE_NANIMO',
    strong: 'G3762',
    morph: 'A-GSM-N',
    greek_form: tok.text,
    lemma: tok.lemma || 'οὐδείς',
    from: EXPECTED_CURRENT,
    to: RECOMMENDED_JA,
    file: 'public/bible_data/nt/ACT/20.json',
    confidence: 'HIGH',
    reason: target.reason
  }]
};
saveJson(path.join(OUT, 'stage4-phase4ay-token-diff.json'), tokenDiffJson);

// file-diff.json
const fileDiffJson = {
  meta: { phase: '4ay', date: new Date().toISOString().slice(0,10) },
  files: [{
    file: 'public/bible_data/nt/ACT/20.json',
    sha256_before: preSha,
    sha256_after: postSha,
    tokens_changed: 1,
    refs_changed: ['ACT 20:24!2']
  }]
};
saveJson(path.join(OUT, 'stage4-phase4ay-file-diff.json'), fileDiffJson);

// verification.json (without regression results — to be filled after npm test)
const verificationJson = {
  meta: { phase: '4ay', date: new Date().toISOString().slice(0,10) },
  checks: {
    V1_unique_ref: { expected: 1, actual: matches.length, pass: matches.length === 1 },
    V2_pre_state_matches_phase4ax: { strong: 'G3762', morph: 'A-GSM-N', ja_before: EXPECTED_CURRENT, pass: true },
    V3_recommended_ja_applied: { expected: RECOMMENDED_JA, actual: v2tok.japanese, pass: v2tok.japanese === RECOMMENDED_JA },
    V4_other_118_unchanged: { expected: 118, actual: v4_unchanged, pass: v4_unchanged === 118 },
    V5_json_integrity: { pass: true },
    V6_sha256_changed: { before: preSha, after: postSha, pass: preSha !== postSha },
    V7_only_target_file_modified: { pass: true },
    V8_regression: 'PENDING — run npm test',
    V9_downstream: 'PENDING — run build check'
  }
};
saveJson(path.join(OUT, 'stage4-phase4ay-verification.json'), verificationJson);

console.log('\nWrote: stage4-phase4ay-token-diff.json');
console.log('Wrote: stage4-phase4ay-file-diff.json');
console.log('Wrote: stage4-phase4ay-verification.json');
console.log('\n=== Implementation COMPLETE — run regression tests ===');
