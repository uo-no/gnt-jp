'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CL_PATH  = path.join(__dirname, 'output/stage4-final/stage4-phase4bi-rom-changelog.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bi-revert — CAND_OK 差し戻し（TABLE保持）===\n');

const cl  = loadJson(CL_PATH);
const ag  = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// CAND_OK 対象を収集（TABLE は保持）
const revertList = [];
for (const chRecs of Object.values(cl.by_chapter)) {
  for (const r of chRecs) {
    if (r.reason === 'CAND_OK') revertList.push(r);
  }
}
console.log('差し戻し対象 (CAND_OK):', revertList.length, '件');
console.log('保持 (TABLE):', Object.values(cl.by_chapter).flat().filter(r=>r.reason==='TABLE').length, '件');

// chapter ごとにまとめて処理
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
    tok.japanese = r.from; // 元の値に戻す
    chChanged++;
  }

  if (chChanged) saveJson(fpath, data);
  revBib += chChanged;
}

// inventory 差し戻し
for (const r of revertList) {
  const inv = agMap.get(r.ref);
  if (!inv) continue;
  if (inv.state !== 'IMPLEMENTED_AND_VERIFIED') {
    console.error('inventory状態不整合:', r.ref, inv.state);
    continue;
  }
  inv.state = 'UNREVIEWED';
  inv.note = 'PHASE4BI_REVERT: CAND_OKを差し戻し。TABLE変更は保持済み。';
  revInv++;
}

// state_summary 更新
const newCounts = {};
ag.tokens.forEach(t => { newCounts[t.state] = (newCounts[t.state]||0)+1; });
ag.state_summary = newCounts;
ag.meta.phase = '4bi-partial';

saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nbible_data 差し戻し:', revBib, '件');
console.log('inventory 差し戻し:', revInv, '件');
console.log('AG SHA256 (post-revert):', postSha);

console.log('\n=== 最終集計 ===');
console.log('UNREVIEWED    :', newCounts.UNREVIEWED);
console.log('RETAIN_CONF   :', newCounts.RETAIN_CONFIRMED);
console.log('IMPL          :', newCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DQ       :', newCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX      :', newCounts.HOLD_CONTEXT);
console.log('  うちTABLE保持 (ROM):', Object.values(cl.by_chapter).flat().filter(r=>r.reason==='TABLE').length);

// TABLE保持件数の内訳（章ごと）
const tableByChap = {};
Object.entries(cl.by_chapter).forEach(([ch, recs]) => {
  const n = recs.filter(r=>r.reason==='TABLE').length;
  if (n) tableByChap[ch] = n;
});
let total = 0;
for (let c = 1; c <= 16; c++) {
  if (tableByChap[c]) {
    process.stdout.write('ROM'+c+':'+tableByChap[c]+'  ');
    total += tableByChap[c];
  }
}
console.log('\nTABLE合計:', total);

saveJson(path.join(OUT, 'stage4-phase4bi-revert.json'), {
  meta: { phase: '4bi-revert', date: '2026-11-05' },
  reverted_cand_ok: revBib,
  retained_table: total,
  post_sha256_ag: postSha,
  post_counts: newCounts,
});
console.log('\nWrote: stage4-phase4bi-revert.json');
