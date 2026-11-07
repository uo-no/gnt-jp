'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CL_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4bi-v2-changelog.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bi-revert-v2 — v2 CAND_OK 全件差し戻し ===\n');

const cl  = loadJson(CL_PATH);
const ag  = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

const revertList = Object.values(cl.by_chapter).flat();
console.log('差し戻し対象 (v2 CAND_OK全件):', revertList.length, '件');

const byChap = {};
revertList.forEach(r => {
  const ch = parseInt(r.ref.match(/ROM (\d+):/)[1]);
  if (!byChap[ch]) byChap[ch] = [];
  byChap[ch].push(r);
});

let revBib = 0, revInv = 0;
for (const [chStr, recs] of Object.entries(byChap)) {
  const ch = parseInt(chStr);
  const fpath = path.join(BIBLE, 'ROM', ch + '.json');
  const data = loadJson(fpath);
  const refMap = new Map(data.map(t => [t.ref, t]));
  let chChanged = 0;

  for (const r of recs) {
    const tok = refMap.get(r.ref);
    if (!tok) { console.error('bible_data未収録:', r.ref); continue; }
    if (tok.japanese !== r.to) {
      console.error('差し戻し不整合:', r.ref, 'expect="'+r.to+'" got="'+tok.japanese+'"');
      continue;
    }
    tok.japanese = r.from;
    chChanged++;
  }

  if (chChanged) saveJson(fpath, data);
  revBib += chChanged;
}

for (const r of revertList) {
  const inv = agMap.get(r.ref);
  if (!inv) continue;
  if (inv.state !== 'IMPLEMENTED_AND_VERIFIED') {
    console.error('inventory状態不整合:', r.ref, inv.state);
    continue;
  }
  inv.state = 'UNREVIEWED';
  inv.note = 'PHASE4BI_REVERT_V2: v2 CAND_OKを差し戻し。TABLE(192件)は保持。';
  revInv++;
}

const newCounts = {};
ag.tokens.forEach(t => { newCounts[t.state] = (newCounts[t.state]||0)+1; });
ag.state_summary = newCounts;
ag.meta.phase = '4bi-TABLE-only';
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);

console.log('bible_data 差し戻し:', revBib, '件');
console.log('inventory 差し戻し :', revInv, '件');
if (revBib !== revInv) { console.error('不整合!'); process.exit(1); }
console.log('整合性確認:', revBib, '件 ✓');
console.log('AG SHA256 (post):', postSha);

console.log('\n=== 確定集計 ===');
console.log('UNREVIEWED    :', newCounts.UNREVIEWED);
console.log('RETAIN_CONF   :', newCounts.RETAIN_CONFIRMED);
console.log('IMPL          :', newCounts.IMPLEMENTED_AND_VERIFIED);
console.log('  うち ROM TABLE保持: 192件');
console.log('HOLD_DQ       :', newCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX      :', newCounts.HOLD_CONTEXT);

saveJson(path.join(OUT, 'stage4-phase4bi-final-state.json'), {
  meta: { phase: '4bi-final', date: '2026-11-05' },
  confirmed_impl: 192,
  reverted_v2: revBib,
  post_sha256_ag: postSha,
  post_counts: newCounts,
});
console.log('\nWrote: stage4-phase4bi-final-state.json');
