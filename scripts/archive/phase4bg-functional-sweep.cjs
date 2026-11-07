'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bg — 機能語スイープ 9集合 RETAIN_CONFIRMED ===\n');

const ag = loadJson(AG_PATH);
const preSha = sha256file(AG_PATH);

const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state] || 0) + 1);
console.log('変更前:', JSON.stringify(preCounts));

const GROUPS = [
  { id: 'P1-plural', strongs: ['G2257','G2248','G2254','G2249'],
    note: 'PHASE4BG_FUNC_RETAIN: 1人称複数（ἡμεῖς系 ἡμῶν/ἡμᾶς/ἡμῖν/ἡμεῖς）。機能語ラベル、省略は不一致としない。' },
  { id: 'P1-other', strongs: ['G3427','G1698','G1691','G2504'],
    note: 'PHASE4BG_FUNC_RETAIN: 1人称単数その他（μοί/ἐμοί/ἐμέ/κἀγώ）。機能語ラベル。' },
  { id: 'P2',       strongs: ['G4671'],
    note: 'PHASE4BG_FUNC_RETAIN: 2人称単数与格 σοί。機能語ラベル、省略は不一致としない。' },
  { id: 'mutual',   strongs: ['G240'],
    note: 'PHASE4BG_FUNC_RETAIN: 相互代名詞 ἀλλήλων。機能語ラベル。' },
  { id: 'indef',    strongs: ['G5100'],
    note: 'PHASE4BG_FUNC_RETAIN: 不定代名詞 τις。機能語ラベル、省略は不一致としない。' },
  { id: 'D-top',    strongs: ['G5124','G1565','G3778','G5023'],
    note: 'PHASE4BG_FUNC_RETAIN: 指示詞 τοῦτο/ἐκεῖνος/οὗτος/ταῦτα（D-上位4）。機能語ラベル、省略は不一致としない。' },
  { id: 'I-top',    strongs: ['G5101','G4169'],
    note: 'PHASE4BG_FUNC_RETAIN: 疑問詞 τίς/ποῖος（I-）。機能語ラベル、省略は不一致としない。' },
  { id: 'KR',       strongs: ['G3745','G3748','G3634','G3755'],
    note: 'PHASE4BG_FUNC_RETAIN: 相関・関係詞 ὅσος/ὅστις（K-/R-）。構造ラベル（G3739 と同扱い）、省略は不一致としない。' },
  { id: 'S-poss',   strongs: ['G1699','G2251','G5212'],
    note: 'PHASE4BG_FUNC_RETAIN: 所有形容詞 ἐμός/ἡμέτερος/ὑμέτερος（S-）。機能語ラベル、省略は不一致としない。' },
];

const ALL_STRONGS = new Set(GROUPS.flatMap(g => g.strongs));

// Pre-flight
let totalExpected = 0;
for (const grp of GROUPS) {
  const cnt = ag.tokens.filter(t => grp.strongs.includes(t.strong) && t.state === 'UNREVIEWED').length;
  console.log(grp.id + ': UNREVIEWED=' + cnt + '件');
  totalExpected += cnt;
}
console.log('合計: ' + totalExpected + '件（期待値 3,468件）\n');

// Apply
let applied = 0;
const byGroup = {};
for (const t of ag.tokens) {
  if (t.state !== 'UNREVIEWED' || !ALL_STRONGS.has(t.strong)) continue;
  const grp = GROUPS.find(g => g.strongs.includes(t.strong));
  t.state = 'RETAIN_CONFIRMED';
  t.note = grp.note;
  applied++;
  byGroup[grp.id] = (byGroup[grp.id] || 0) + 1;
}

// Post-verification
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state] || 0) + 1);

const expUnrev = preCounts.UNREVIEWED - applied;
const expRc    = preCounts.RETAIN_CONFIRMED + applied;

let vPass = true;
[[expUnrev, postCounts.UNREVIEWED, 'UNREVIEWED'],
 [expRc,    postCounts.RETAIN_CONFIRMED, 'RETAIN_CONFIRMED'],
 [preCounts.IMPLEMENTED_AND_VERIFIED, postCounts.IMPLEMENTED_AND_VERIFIED, 'IMPL (unchanged)'],
 [preCounts.HOLD_DATA_QUALITY, postCounts.HOLD_DATA_QUALITY, 'HOLD_DQ (unchanged)'],
 [preCounts.HOLD_CONTEXT, postCounts.HOLD_CONTEXT, 'HOLD_CTX (unchanged)'],
].forEach(([exp, act, name]) => {
  const ok = exp === act;
  if (!ok) vPass = false;
  console.log((ok ? '✓' : '✗') + ' ' + name + ': ' + act + (exp !== act ? ' (expect ' + exp + ')' : ''));
});

if (ag.tokens.length !== 92952) { console.error('TOTAL MISMATCH'); process.exit(1); }
console.log('✓ 合計: 92,952');
if (!vPass) { console.error('Post-verification FAIL'); process.exit(1); }
console.log('Post-verification: PASS');

saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

console.log('\nグループ別適用件数:');
GROUPS.forEach(g => console.log('  ' + g.id.padEnd(12) + (byGroup[g.id] || 0) + '件'));
console.log('合計適用:', applied, '件');

console.log('\n=== 最終集計 ===');
console.log('UNREVIEWED    :', postCounts.UNREVIEWED);
console.log('RETAIN_CONF   :', postCounts.RETAIN_CONFIRMED);
console.log('IMPL          :', postCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DQ       :', postCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX      :', postCounts.HOLD_CONTEXT);

saveJson(path.join(OUT, 'stage4-phase4bg-sweep.json'), {
  meta: { phase: '4bg', date: new Date().toISOString().slice(0,10) },
  pre_counts: preCounts, post_counts: postCounts,
  applied_total: applied, by_group: byGroup,
  pre_sha256: preSha, post_sha256: postSha,
});
