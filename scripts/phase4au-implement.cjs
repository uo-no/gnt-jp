'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AT_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4at-g3056-audit.json');
const OUT = path.join(__dirname, 'output/stage4-final');
const SCRATCHPAD = '/private/tmp/claude-501/-Users-373da/8aaaba66-9b55-4401-81c0-0f799bfed13d/scratchpad';

function sha256(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

// === Load Phase 4at audit ===
const at = loadJson(AT_PATH);
console.log('Phase 4at overall_verdict:', at.overall_verdict);
console.log('verdict_summary:', JSON.stringify(at.verdict_summary));

// === Extract 7 target tokens ===
const changeSet = at.tokens.filter(t =>
  t.verdict === 'APPROVE_MOSHIHIRAKI' || t.verdict === 'APPROVE_OTHER_GLOSS'
);
const retainSet = at.tokens.filter(t => t.verdict === 'RETAIN_KOTOBA');

console.log('Change set:', changeSet.length, '(APPROVE_MOSHIHIRAKI:', changeSet.filter(t=>t.verdict==='APPROVE_MOSHIHIRAKI').length, '+ APPROVE_OTHER_GLOSS:', changeSet.filter(t=>t.verdict==='APPROVE_OTHER_GLOSS').length + ')');
console.log('Retain set (must NOT change):', retainSet.length);

if (changeSet.length !== 7) {
  console.error('FATAL: expected 7 change targets, got', changeSet.length);
  process.exit(1);
}

changeSet.forEach(t => {
  console.log('  TARGET:', t.verdict, '|', t.ref, '| cur=' + t.cur_japanese + ' → new=' + t.gloss);
});

// === Build file groups ===
function bibleFilePath(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  return path.join(BIBLE, m[1], m[2] + '.json');
}
function bibleRelPath(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  return 'public/bible_data/nt/' + m[1] + '/' + m[2] + '.json';
}

const byFile = {};
for (const t of changeSet) {
  const fp = bibleFilePath(t.ref);
  const rp = bibleRelPath(t.ref);
  if (!byFile[rp]) byFile[rp] = { filePath: fp, relPath: rp, changes: [] };
  byFile[rp].changes.push(t);
}
const fileKeys = Object.keys(byFile).sort();
console.log('\nUnique files to modify:', fileKeys.length);
fileKeys.forEach(k => console.log('  ' + k + ' (' + byFile[k].changes.length + ' change)'));

// === PRE-FLIGHT ===
console.log('\n=== Pre-Flight Checks ===');
const preErrors = [];
const preSnapshot = {
  phase: '4au',
  date: new Date().toISOString().slice(0,10),
  targets: [],
  all_at_123: [],
  files: {}
};

// Save all 123 Phase 4at tokens' current japanese
for (const t of at.tokens) {
  const fp = bibleFilePath(t.ref);
  const data = loadJson(fp);
  const tok = data.find(x => x.ref === t.ref);
  preSnapshot.all_at_123.push({
    ref: t.ref, verdict: t.verdict, cur_japanese: tok ? tok.japanese : null
  });
}

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
    if (bt.strong !== 'G3056') preErrors.push('STRONG_MISMATCH: ' + c.ref + ' got ' + bt.strong);
    // Verify morph
    if (bt.morph !== 'N-ASM') preErrors.push('MORPH_MISMATCH: ' + c.ref + ' got ' + bt.morph);
    // Verify cur_japanese matches Phase 4at record
    if (bt.japanese !== c.cur_japanese) {
      preErrors.push('JA_MISMATCH: ' + c.ref + ' phase4at="' + c.cur_japanese + '" current="' + bt.japanese + '"');
    }

    preSnapshot.files[rp].tokens.push({
      ref: c.ref, verdict: c.verdict,
      strong: bt.strong, morph: bt.morph,
      greek_form: bt.text, pre_japanese: bt.japanese,
      new_japanese: c.gloss, pre_sha: preSha
    });
    preSnapshot.targets.push({
      ref: c.ref, verdict: c.verdict, cur_japanese: bt.japanese, new_japanese: c.gloss
    });
  }
}

// Verify that RETAIN_KOTOBA tokens have japanese = 'ことば' (spot-check on changed files only)
const changedFileRefs = new Set(changeSet.map(c => c.ref));
for (const rp of fileKeys) {
  const { filePath } = byFile[rp];
  const data = loadJson(filePath);
  const dataMap = new Map(data.map(t => [t.ref, t]));
  for (const rt of retainSet) {
    const bt = dataMap.get(rt.ref);
    if (!bt) continue; // token is in a different file
    if (bt.japanese !== rt.cur_japanese) {
      preErrors.push('RETAIN_MISMATCH (pre): ' + rt.ref + ' expected=' + rt.cur_japanese + ' found=' + bt.japanese);
    }
  }
}

if (preErrors.length > 0) {
  console.error('\nPRE-FLIGHT ERRORS:');
  preErrors.forEach(e => console.error('  ' + e));
  console.error('\nSTOPPED: ' + preErrors.length + ' error(s). No changes applied.');
  process.exit(1);
}
console.log('Pre-flight: PASS (' + changeSet.length + ' targets verified, ' + fileKeys.length + ' files)');

// Save pre-snapshot to scratchpad
fs.mkdirSync(SCRATCHPAD, { recursive: true });
const preSnapScratch = path.join(SCRATCHPAD, 'phase4au-pre-snapshot.json');
saveJson(preSnapScratch, preSnapshot);
console.log('Pre-snapshot saved to scratchpad:', preSnapScratch);

// === APPLY CHANGES ===
console.log('\n=== Applying Changes ===');
const tokenDiffs = [];

for (const rp of fileKeys) {
  const { filePath, changes } = byFile[rp];
  const data = loadJson(filePath);
  const dataMap = new Map(data.map(t => [t.ref, t]));

  for (const c of changes) {
    const bt = dataMap.get(c.ref);
    const prevJa = bt.japanese;
    bt.japanese = c.gloss;
    tokenDiffs.push({
      ref: c.ref, verdict: c.verdict,
      strong: 'G3056', morph: 'N-ASM',
      greek_form: bt.text,
      from: prevJa, to: c.gloss,
      file: rp, confidence: c.confidence
    });
  }

  saveJson(filePath, data);
  console.log('  ' + rp + ': ' + changes.length + ' change(s): ' + changes.map(c=>c.ref+' → '+c.gloss).join(', '));
}
console.log('Applied:', tokenDiffs.length, 'token updates');

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

  // V1: target tokens changed correctly
  for (const c of changes) {
    const bt = dataMap.get(c.ref);
    if (!bt) { postErrors.push('POST_NOT_FOUND: ' + c.ref); continue; }
    if (bt.japanese !== c.gloss) postErrors.push('POST_JA_WRONG: ' + c.ref + ' got=' + bt.japanese + ' expected=' + c.gloss);
    if (bt.strong !== 'G3056') postErrors.push('POST_STRONG_CHANGED: ' + c.ref);
    if (bt.morph !== 'N-ASM') postErrors.push('POST_MORPH_CHANGED: ' + c.ref);
  }

  // V2: RETAIN_KOTOBA tokens in this file are unchanged
  for (const rt of retainSet) {
    const bt = dataMap.get(rt.ref);
    if (!bt) continue;
    if (bt.japanese !== rt.cur_japanese) {
      postErrors.push('RETAIN_CHANGED: ' + rt.ref + ' expected=' + rt.cur_japanese + ' got=' + bt.japanese);
    }
  }

  // V3: JSON integrity
  try { JSON.stringify(data); } catch(e) { postErrors.push('JSON_ERROR: ' + rp + ': ' + e.message); }

  fileDiffs.push({
    file: rp,
    pre_sha256: preInfo.pre_sha256,
    post_sha256: postSha,
    changes: changes.length,
    changed: postSha !== preInfo.pre_sha256
  });
}

if (postErrors.length > 0) {
  console.error('\nPOST-VERIFICATION ERRORS:');
  postErrors.forEach(e => console.error('  ' + e));
  process.exit(1);
}
console.log('Post-verification: PASS');

// V4: All 7 targets show expected values
console.log('\nFinal spot-check (7 targets):');
for (const c of changeSet) {
  const data = loadJson(bibleFilePath(c.ref));
  const bt = data.find(x => x.ref === c.ref);
  const ok = bt && bt.japanese === c.gloss && bt.strong === 'G3056' && bt.morph === 'N-ASM';
  console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' | ' + c.ref + ' | japanese=' + (bt ? bt.japanese : 'NOT_FOUND'));
  if (!ok) postErrors.push('FINAL_FAIL: ' + c.ref);
}

if (postErrors.length > 0) {
  console.error('FINAL CHECK ERRORS:', postErrors.length);
  process.exit(1);
}

// === WRITE DELIVERABLES ===
// token-diff
const tokenDiffPath = path.join(OUT, 'stage4-phase4au-token-diff.json');
saveJson(tokenDiffPath, {
  meta: { phase: '4au', date: new Date().toISOString().slice(0,10), total: tokenDiffs.length, strong: 'G3056' },
  moshihiraki: tokenDiffs.filter(t=>t.verdict==='APPROVE_MOSHIHIRAKI').map(t=>t.ref),
  other_gloss: tokenDiffs.filter(t=>t.verdict==='APPROVE_OTHER_GLOSS').map(t=>t.ref),
  tokens: tokenDiffs
});
console.log('\nWrote:', tokenDiffPath);

// file-diff
const fileDiffPath = path.join(OUT, 'stage4-phase4au-file-diff.json');
saveJson(fileDiffPath, {
  meta: { phase: '4au', date: new Date().toISOString().slice(0,10), files_changed: fileDiffs.filter(f=>f.changed).length },
  files: fileDiffs
});
console.log('Wrote:', fileDiffPath);

// pre-snapshot (copy to output)
const preSnapOut = path.join(OUT, 'stage4-phase4au-pre-implementation-snapshot.json');
saveJson(preSnapOut, preSnapshot);
console.log('Wrote:', preSnapOut);

console.log('\n=== Phase 4au Bible JSON: PASS ===');
console.log('Changed:', tokenDiffs.length, 'tokens');
console.log('  APPROVE_MOSHIHIRAKI (ことば → 申し開き):', tokenDiffs.filter(t=>t.verdict==='APPROVE_MOSHIHIRAKI').length);
console.log('  APPROVE_OTHER_GLOSS (ことば → 著述):', tokenDiffs.filter(t=>t.verdict==='APPROVE_OTHER_GLOSS').length);
console.log('Files modified:', fileDiffs.filter(f=>f.changed).length);
console.log('\nNext: npm run build:lexicon && npm run build:search-index');
