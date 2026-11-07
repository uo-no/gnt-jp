'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');
function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bc — inventory 追いつき更新 ===\n');

const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));
const preSha = sha256file(AG_PATH);

const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state]||0)+1);
console.log('変更前:', JSON.stringify(preCounts));

// A. 21件 G3708 UNREVIEWED → IMPLEMENTED_AND_VERIFIED
const G3708_IMPL = [
  { ref: 'MAT 12:25!1', from: '見る', to: '見抜く', ja1955: '見抜いて' },
  { ref: 'MRK 6:20!7',  from: '見る', to: '知る',   ja1955: '知って' },
  { ref: 'MRK 12:15!3', from: '見る', to: '見抜く',  ja1955: '見抜いて' },
  { ref: 'LUK 9:33!34', from: '見る', to: '知る',   ja1955: 'わからないで（否定→知る正規化）' },
  { ref: 'LUK 9:47!4',  from: '見る', to: '見抜く',  ja1955: '見抜き' },
  { ref: 'LUK 11:17!3', from: '見る', to: '見抜く',  ja1955: '見抜いて' },
  { ref: 'JHN 6:61!1',  from: '見る', to: '見破る',  ja1955: '見破って' },
  { ref: 'JHN 13:1!7',  from: '見る', to: '知る',   ja1955: '知り' },
  { ref: 'JHN 13:3!1',  from: '見る', to: '思う',   ja1955: '思い' },
  { ref: 'JHN 18:4!3',  from: '見る', to: '知る',   ja1955: '承知して（承知→知る正規化）' },
  { ref: 'JHN 19:28!3', from: '見る', to: '知る',   ja1955: '知って' },
  { ref: 'ACT 2:30!5',  from: '見る', to: '認める',  ja1955: '認めていた' },
  { ref: 'ACT 20:22!17',from: '見る', to: '知る',   ja1955: 'わからない（否定→知る正規化）' },
  { ref: 'ACT 24:22!7', from: '見る', to: 'わきまえる', ja1955: 'わきまえていた' },
  { ref: '2TI 2:23!8',  from: '見る', to: '知る',   ja1955: '知っている' },
  { ref: '2TI 3:14!9',  from: '見る', to: '知る',   ja1955: '知っており' },
  { ref: 'TIT 3:11!1',  from: '見る', to: '知る',   ja1955: '知りつつも' },
  { ref: '2PE 1:14!1',  from: '見る', to: '知る',   ja1955: '知っているから' },
  { ref: 'REV 12:12!26',from: '見る', to: '知る',   ja1955: '知り' },
  { ref: '2PE 1:12!9',  from: '見る', to: '知る',   ja1955: '知っており' },
  { ref: 'JUD 1:5!5',   from: '見る', to: '知る',   ja1955: '知っている' },
];

// B. 2件 G3708 [] 確定 UNREVIEWED → HOLD_CONTEXT
const G3708_HOLD = [
  { ref: '1TI 1:9!1',  note: '[] 確定: JA1955「すなわち」— Εἰδὼς τοῦτο ὅτι が接続詞に置換、知識動詞なし' },
  { ref: 'PHM 1:21!7', note: '[] 確定: JA1955「確かに」— εἰδὼς ὅτι が副詞的に置換、知識動詞なし' },
];

// === Pre-flight ===
const errors = [];
G3708_IMPL.forEach(c => {
  const t = agMap.get(c.ref);
  if (!t) { errors.push('NOT FOUND: '+c.ref); return; }
  if (t.state !== 'UNREVIEWED') errors.push('NOT UNREVIEWED: '+c.ref+' state='+t.state);
});
G3708_HOLD.forEach(c => {
  const t = agMap.get(c.ref);
  if (!t) { errors.push('NOT FOUND: '+c.ref); return; }
  if (t.state !== 'UNREVIEWED') errors.push('NOT UNREVIEWED: '+c.ref+' state='+t.state);
});
const actTok = agMap.get('ACT 20:24!2');
if (!actTok || actTok.state !== 'IMPLEMENTED_AND_VERIFIED')
  errors.push('ACT 20:24!2 unexpected: '+actTok?.state);

if (errors.length) { errors.forEach(e => console.error(e)); process.exit(1); }
console.log('Pre-flight: PASS\n');

// === Apply ===
G3708_IMPL.forEach(c => {
  const t = agMap.get(c.ref);
  t.state = 'IMPLEMENTED_AND_VERIFIED';
  t.note = 'PHASE4BC_JA1955_ALIGN_IMPL ('+c.from+' → '+c.to+'; JA1955: '+c.ja1955+')';
});
G3708_HOLD.forEach(c => {
  const t = agMap.get(c.ref);
  t.state = 'HOLD_CONTEXT';
  t.note = 'PHASE4BC_'+c.note;
});
// ACT 20:24!2: note 更新のみ
actTok.note = 'PHASE4AY_APPROVE_NANIMO_IMPLEMENTED_PHASE4AY; PHASE4BC_UPDATE: 何も〜ない → 少しも〜ない (JA1955「少しも惜しいとは思わない」— οὐδενὸς λόγου ποιοῦμαι 句全体のイディオムから切り出した断片)';

console.log('Applied: G3708 IMPL 21件, HOLD_CONTEXT 2件, ACT 20:24!2 note update');

// === Post-verification ===
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state]||0)+1);

const expUnrev = preCounts.UNREVIEWED - 23;
const expImpl  = preCounts.IMPLEMENTED_AND_VERIFIED + 21;
const expHold  = preCounts.HOLD_CONTEXT + 2;

let vPass = true;
[[expUnrev, postCounts.UNREVIEWED, 'UNREVIEWED'],
 [expImpl,  postCounts.IMPLEMENTED_AND_VERIFIED, 'IMPL'],
 [expHold,  postCounts.HOLD_CONTEXT, 'HOLD_CTX']
].forEach(([exp, act, name]) => {
  const ok = exp === act;
  if (!ok) vPass = false;
  console.log((ok?'✓':'✗') + ' ' + name + ': ' + act + ' (expect '+exp+')');
});
if (ag.tokens.length !== 92952) { console.error('TOTAL MISMATCH'); process.exit(1); }
console.log('✓ 合計: 92,952');

if (!vPass) { console.error('Post-verification FAIL'); process.exit(1); }
console.log('Post-verification: PASS');

// === Save ===
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

// === Deliverable ===
const report = {
  meta: { phase: '4bc-inventory', date: new Date().toISOString().slice(0,10) },
  pre_counts: preCounts, post_counts: postCounts,
  changes: {
    g3708_impl: G3708_IMPL.map(c => ({ ref: c.ref, state: 'IMPLEMENTED_AND_VERIFIED', note: c.to + ' (' + c.ja1955 + ')' })),
    g3708_hold: G3708_HOLD.map(c => ({ ref: c.ref, state: 'HOLD_CONTEXT', note: c.note })),
    act_20_24_2: { ref: 'ACT 20:24!2', state: 'IMPLEMENTED_AND_VERIFIED (no change)', note: 'note updated' }
  },
  pre_sha256: preSha, post_sha256: postSha
};
saveJson(path.join(OUT, 'stage4-phase4bc-inventory-update.json'), report);
console.log('Wrote: stage4-phase4bc-inventory-update.json');
console.log('\nUNREVIEWED 残件数:', postCounts.UNREVIEWED);
