'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const AR_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ar-g3762-audit.json');
const OUT = path.join(__dirname, 'output/stage4-final');
const SCRATCHPAD = '/private/tmp/claude-501/-Users-373da/8aaaba66-9b55-4401-81c0-0f799bfed13d/scratchpad';

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

// === Load sources ===
const ar = loadJson(AR_PATH);
const ag = loadJson(AG_PATH);
const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// === Extract change set: APPROVE_NANIMO only ===
const okTokens = ar.tokens.filter(t => t.verdict === 'APPROVE_NANIMO');
const retainToken = ar.tokens.find(t => t.verdict === 'RETAIN_DAREMO');
const ctxToken = ar.tokens.find(t => t.verdict === 'CONTEXT_DEPENDENT');

console.log('Phase 4ar APPROVE_NANIMO:', okTokens.length);
console.log('RETAIN_DAREMO (protected):', retainToken?.ref);
console.log('CONTEXT_DEPENDENT (protected):', ctxToken?.ref);

// === PROTECTION: verify LUK 4:26!3 and PHP 4:15!15 are NOT in change set ===
const PROTECTED = new Set(['LUK 4:26!3', 'PHP 4:15!15']);
for (const ref of PROTECTED) {
  if (okTokens.some(t => t.ref === ref)) {
    console.error('FATAL: protected token is in APPROVE_NANIMO set:', ref);
    process.exit(1);
  }
}
console.log('Protected tokens not in change set: OK');

// === Group changes by bible_data file ===
function bibleFilePath(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  return path.join(BIBLE, m[1], m[2] + '.json');
}
function bibleRelPath(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  return 'public/bible_data/nt/' + m[1] + '/' + m[2] + '.json';
}

const byFile = {};
for (const t of okTokens) {
  const fp = bibleFilePath(t.ref);
  const rp = bibleRelPath(t.ref);
  if (!byFile[rp]) byFile[rp] = { filePath: fp, relPath: rp, changes: [] };
  byFile[rp].changes.push(t);
}
const fileKeys = Object.keys(byFile).sort();
console.log('Unique files to modify:', fileKeys.length);

// === PRE-FLIGHT CHECKS ===
console.log('\n=== Pre-Flight Checks ===');
const preErrors = [];
const preSnapshot = { phase: '4as', date: new Date().toISOString().slice(0,10), files: {} };

for (const rp of fileKeys) {
  const { filePath, changes } = byFile[rp];
  const data = loadJson(filePath);
  const dataMap = new Map(data.map(t => [t.ref, t]));
  const preSha = sha256(filePath);
  preSnapshot.files[rp] = { pre_sha256: preSha, tokens: [] };

  for (const c of changes) {
    const bt = dataMap.get(c.ref);
    if (!bt) { preErrors.push('NOT_FOUND: ' + c.ref); continue; }

    // Verify strong
    if (bt.strong !== 'G3762') preErrors.push('STRONG_MISMATCH: ' + c.ref + ' got ' + bt.strong);
    // Verify cur_japanese matches Phase 4ar record
    if (bt.japanese !== c.cur_japanese) {
      preErrors.push('JA_MISMATCH: ' + c.ref + ' phase4ar="' + c.cur_japanese + '" current="' + bt.japanese + '"');
    }
    // Verify UNREVIEWED in Phase 4ag
    const st = agStateMap.get(c.ref);
    if (st !== 'UNREVIEWED') preErrors.push('NOT_UNREVIEWED: ' + c.ref + ' state=' + st);
    // Verify morph matches
    if (bt.morph !== c.morph) preErrors.push('MORPH_MISMATCH: ' + c.ref + ' phase4ar=' + c.morph + ' current=' + bt.morph);

    preSnapshot.files[rp].tokens.push({
      ref: c.ref, strong: bt.strong, morph: bt.morph,
      greek_form: bt.text, pre_japanese: bt.japanese,
      new_japanese: c.recommended_ja, pre_sha: preSha
    });
  }
}

// Also verify protected tokens are intact
for (const ref of PROTECTED) {
  const fp = bibleFilePath(ref);
  const data = loadJson(fp);
  const bt = data.find(t => t.ref === ref);
  if (!bt) { preErrors.push('PROTECTED_NOT_FOUND: ' + ref); continue; }
  if (bt.strong !== 'G3762') preErrors.push('PROTECTED_STRONG_MISMATCH: ' + ref);
  console.log('  PROTECTED ' + ref + ': japanese="' + bt.japanese + '" (must remain unchanged)');
}

if (preErrors.length > 0) {
  console.error('\nPRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error('  ' + e));
  console.error('\nSTOPPED: ' + preErrors.length + ' error(s). No changes applied.');
  process.exit(1);
}
console.log('Pre-flight: PASS (' + okTokens.length + ' refs verified)');

// Save pre-snapshot to scratchpad
fs.mkdirSync(SCRATCHPAD, { recursive: true });
const preSnapPath = path.join(SCRATCHPAD, 'phase4as-pre-snapshot.json');
saveJson(preSnapPath, preSnapshot);
console.log('Pre-snapshot saved to:', preSnapPath);

// === APPLY CHANGES ===
console.log('\n=== Applying Changes ===');
const tokenDiffs = [];

for (const rp of fileKeys) {
  const { filePath, changes } = byFile[rp];
  const data = loadJson(filePath);
  const dataMap = new Map(data.map(t => [t.ref, t]));
  let changed = 0;

  for (const c of changes) {
    const bt = dataMap.get(c.ref);
    const prevJa = bt.japanese;
    bt.japanese = c.recommended_ja;
    changed++;
    tokenDiffs.push({
      ref: c.ref, strong: 'G3762', morph: c.morph,
      greek_form: bt.text || c.greek_form,
      from: prevJa, to: c.recommended_ja,
      file: rp, confidence: c.confidence
    });
  }

  saveJson(filePath, data);
  console.log('  ' + rp + ': ' + changed + ' change(s)');
}

console.log('Applied: ' + tokenDiffs.length + ' token updates');

// === POST-VERIFICATION ===
console.log('\n=== Post-Verification ===');
const postErrors = [];
const fileDiffs = [];

for (const rp of fileKeys) {
  const { filePath, changes } = byFile[rp];
  const data = loadJson(filePath);
  const dataMap = new Map(data.map(t => [t.ref, t]));
  const postSha = sha256(filePath);
  const preInfo = preSnapshot.files[rp];

  for (const c of changes) {
    const bt = dataMap.get(c.ref);
    if (!bt) { postErrors.push('POST_NOT_FOUND: ' + c.ref); continue; }
    if (bt.japanese !== c.recommended_ja) postErrors.push('POST_JA_WRONG: ' + c.ref + ' got ' + bt.japanese);
    if (bt.strong !== 'G3762') postErrors.push('POST_STRONG_CHANGED: ' + c.ref);
    if (bt.morph !== c.morph) postErrors.push('POST_MORPH_CHANGED: ' + c.ref);
    if (bt.text !== c.greek_form) postErrors.push('POST_TEXT_CHANGED: ' + c.ref);
    // Verify JSON integrity
    try { JSON.stringify(data); } catch (e) { postErrors.push('JSON_ERROR in ' + rp + ': ' + e.message); }
  }

  fileDiffs.push({
    file: rp,
    pre_sha256: preInfo.pre_sha256,
    post_sha256: postSha,
    changes: changes.length,
    changed: postSha !== preInfo.pre_sha256
  });
}

// Verify protected tokens unchanged
for (const ref of PROTECTED) {
  const fp = bibleFilePath(ref);
  const data = loadJson(fp);
  const bt = data.find(t => t.ref === ref);
  if (!bt) { postErrors.push('PROTECTED_NOT_FOUND_POST: ' + ref); continue; }
  if (ref === 'LUK 4:26!3' && bt.japanese !== '誰も〜ない')
    postErrors.push('PROTECTED_CHANGED: ' + ref + ' now=' + bt.japanese);
  console.log('  PROTECTED ' + ref + ': japanese="' + bt.japanese + '" (unchanged: ' +
    (bt.japanese === '誰も〜ない' || ref === 'PHP 4:15!15') + ')');
}

if (postErrors.length > 0) {
  console.error('\nPOST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error('  ' + e));
  process.exit(1);
}
console.log('Post-verification: PASS (' + tokenDiffs.length + ' tokens)');

// === WRITE DELIVERABLES ===
// 1. token-diff
const tokenDiffPath = path.join(OUT, 'stage4-phase4as-token-diff.json');
saveJson(tokenDiffPath, {
  meta: { phase: '4as', date: '2026-11-04', total: tokenDiffs.length, strong: 'G3762', from: '誰も〜ない', to: '何も〜ない' },
  protected: [
    { ref: 'LUK 4:26!3', verdict: 'RETAIN_DAREMO', japanese: '誰も〜ない' },
    { ref: 'PHP 4:15!15', verdict: 'CONTEXT_DEPENDENT', japanese: '(unchanged)' }
  ],
  tokens: tokenDiffs
});
console.log('Wrote:', tokenDiffPath);

// 2. file-diff
const fileDiffPath = path.join(OUT, 'stage4-phase4as-file-diff.json');
saveJson(fileDiffPath, { meta: { phase: '4as', date: '2026-11-04', files_changed: fileDiffs.filter(f=>f.changed).length }, files: fileDiffs });
console.log('Wrote:', fileDiffPath);

// 3. pre-snapshot also save to output
const preSnapOutPath = path.join(OUT, 'stage4-phase4as-pre-implementation-snapshot.json');
saveJson(preSnapOutPath, preSnapshot);
console.log('Wrote:', preSnapOutPath);

// Summary
console.log('\n=== Phase 4as Bible JSON: PASS ===');
console.log('Changed:', tokenDiffs.length, 'tokens (G3762 japanese: 誰も〜ない → 何も〜ない)');
console.log('Protected:', PROTECTED.size, 'tokens (LUK 4:26!3=RETAIN_DAREMO, PHP 4:15!15=CONTEXT_DEPENDENT)');
console.log('Files modified:', fileDiffs.filter(f=>f.changed).length);
console.log('\nNext: npm run build:lexicon && npm run build:search-index');
