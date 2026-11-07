'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bk-P04-supplement: P04条件語表記ゆれ9件補足適用 ===\n');
console.log('原因: condWordに「ばかりでなく」のみ設定、同義の「ばかりではなく」を含む9件がCOND_FAILとなった');
console.log('修正: 「ばかりではなく」を含むセグメントにも同一グロス「ばかりでなく」を適用\n');

// 9件の補足対象
const TARGETS = [
  { ref: '1JN 2:2!14',  segText: 'わたしたちの罪のためばかりではなく、' },
  { ref: '2CO 7:7!2',   segText: '到来によるばかりではなく、' },
  { ref: '2CO 8:10!12', segText: '実行したばかりではなく、' },
  { ref: '2CO 8:21!5',  segText: '主のみまえばかりではなく、' },
  { ref: '2TI 2:20!7',  segText: 'ばかりではなく、' },
  { ref: '2TI 4:8!21',  segText: 'わたしばかりではなく、' },
  { ref: 'JHN 17:20!6', segText: '彼らのためばかりではなく、' },
  { ref: 'JHN 5:18!12', segText: 'ばかりではなく、' },
  { ref: 'PHP 2:27!14', segText: '彼ばかりではなく、' },
];
const FROM_JA = 'ひとり';
const TO_JA = 'ばかりでなく';

const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));
const preSha = sha256file(AG_PATH);
console.log('AG SHA256 (pre):', preSha);

// book→[target] グループ化
const byBook = {};
TARGETS.forEach(r => {
  const book = r.ref.split(' ')[0];
  if (!byBook[book]) byBook[book] = [];
  byBook[book].push(r);
});

const changelog = [];
let bibChanged = 0, invChanged = 0;

for (const [book, recs] of Object.entries(byBook)) {
  const chMap = {};
  recs.forEach(r => {
    const ch = parseInt(r.ref.split(' ')[1].split(':')[0]);
    if (!chMap[ch]) chMap[ch] = [];
    chMap[ch].push(r);
  });
  for (const [chStr, chRecs] of Object.entries(chMap)) {
    const ch = parseInt(chStr);
    const fpath = path.join(BIBLE, book, ch + '.json');
    const data = loadJson(fpath);
    const refMap = new Map(data.map(t => [t.ref, t]));
    let chChanged = 0;
    for (const r of chRecs) {
      const tok = refMap.get(r.ref);
      if (!tok) { console.error('bible_data未収録:', r.ref); continue; }
      if (tok.japanese !== FROM_JA) {
        console.error('不整合:', r.ref, 'expect="'+FROM_JA+'" got="'+tok.japanese+'"');
        continue;
      }
      tok.japanese = TO_JA;
      changelog.push({ ref: r.ref, from: FROM_JA, to: TO_JA, segText: r.segText, condMatch: 'ばかりではなく' });
      chChanged++;
      bibChanged++;
    }
    if (chChanged) saveJson(fpath, data);
  }
}

for (const r of TARGETS) {
  const inv = agMap.get(r.ref);
  if (!inv) { console.error('inventory未収録:', r.ref); continue; }
  if (inv.state !== 'UNREVIEWED') {
    console.error('状態不整合:', r.ref, inv.state);
    continue;
  }
  inv.state = 'IMPLEMENTED_AND_VERIFIED';
  inv.note = 'PHASE4BK_P04_SUPPLEMENT: ひとり→ばかりでなく (G3441 ADV) ばかりではなく表記ゆれ補足適用';
  invChanged++;
}

if (bibChanged !== invChanged) {
  console.error('不整合! bible:', bibChanged, 'inventory:', invChanged);
  process.exit(1);
}

const newCounts = {};
ag.tokens.forEach(t => { newCounts[t.state] = (newCounts[t.state]||0)+1; });
ag.state_summary = newCounts;
ag.meta.phase = '4bk-p04-supplement';
ag.meta.updated = '2026-11-05';
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);

const suppRecord = {
  meta: { phase: '4bk-p04-supplement', date: '2026-11-05' },
  root_cause: 'Phase 4bkのP04 condWordリストに「ばかりでなく」のみ設定。JA1955は同義形「ばかりではなく」（は付き）を多用しており、9件がCOND_FAILとなった',
  fix: '「ばかりではなく」を含むセグメントに同一グロス「ばかりでなく」を補足適用',
  applied: changelog.length,
  changelog,
  pre_sha256_ag: preSha,
  post_sha256_ag: postSha,
  post_counts: newCounts,
};
saveJson(path.join(OUT, 'stage4-phase4bk-p04-supplement.json'), suppRecord);

console.log('bible_data 適用:', bibChanged, '件');
console.log('inventory 更新 :', invChanged, '件');
console.log('AG SHA256 (post):', postSha);
console.log('\n=== 台帳最終集計 ===');
console.log('UNREVIEWED           :', newCounts.UNREVIEWED);
console.log('RETAIN_CONFIRMED     :', newCounts.RETAIN_CONFIRMED);
console.log('IMPLEMENTED_AND_VERIFIED:', newCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DATA_QUALITY    :', newCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CONTEXT         :', newCounts.HOLD_CONTEXT);
console.log('Total                :', Object.values(newCounts).reduce((a,b)=>a+b,0));
console.log('\nWrote: stage4-phase4bk-p04-supplement.json');
