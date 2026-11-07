'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bd — 機能語グループ inventory 一括分類 ===\n');

const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));
const preSha = sha256file(AG_PATH);

const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state] || 0) + 1);
console.log('変更前:', JSON.stringify(preCounts));

// ── グループ定義 ──────────────────────────────────────────
const RETAIN_GROUPS = [
  { id: 'G3739',    strongs: ['G3739'],                     label: '関係代名詞 ὅς/ἥ/ὅ',         note: 'PHASE4BD_FUNCTIONAL_RETAIN: テンプレート値を構造ラベルとして維持。日本語に関係代名詞カテゴリなし、節維持・再構成とも変更なし。' },
  { id: '1person',  strongs: ['G3450', 'G1473', 'G3165'],   label: '1人称セット μου/ἐγώ/με',     note: 'PHASE4BD_FUNCTIONAL_RETAIN: 省略箇所含め全件維持。機能語は指示対象・文法カテゴリラベルとして扱い、口語訳省略は不一致としない。' },
  { id: 'G1438',    strongs: ['G1438'],                     label: '再帰代名詞 ἑαυτός',           note: 'PHASE4BD_FUNCTIONAL_RETAIN: 自分／ご自身は自分自身と同じ再帰語彙として一致判定。全件維持。' },
];

const HOLD_DQ_GROUPS = [
  { id: 'G848', strongs: ['G848'], label: '3人称 αὑτός', note: 'PHASE4BD_G848_HOLD_DQ: morph=P（人称代名詞）なのに japanese=自分（再帰）。語彙カテゴリが異なるため口語訳合わせ処理から除外。欠陥調査が必要。' },
];

// ── G848 欠陥規模調査（bible_data から全件スキャン）────────
console.log('\n--- G848 欠陥規模調査 ---');
const g848AllTokens = [];
const booksDir = fs.readdirSync(BIBLE).filter(b => fs.statSync(path.join(BIBLE, b)).isDirectory());
for (const book of booksDir.sort()) {
  const bookDir = path.join(BIBLE, book);
  const chapters = fs.readdirSync(bookDir).filter(f => f.endsWith('.json'));
  for (const ch of chapters.sort((a, b) => parseInt(a) - parseInt(b))) {
    const data = loadJson(path.join(bookDir, ch));
    for (const t of data) {
      if (t.strong === 'G848') {
        g848AllTokens.push({ ref: t.ref, text: t.text, morph: t.morph, japanese: t.japanese });
      }
    }
  }
}

const g848JaSelf = g848AllTokens.filter(t => t.japanese === '自分').length;
const g848JaOther = g848AllTokens.filter(t => t.japanese !== '自分');

// morph breakdown
const morphCounts = {};
const formCounts = {};
g848AllTokens.forEach(t => {
  morphCounts[t.morph] = (morphCounts[t.morph] || 0) + 1;
  formCounts[t.text] = (formCounts[t.text] || 0) + 1;
});

console.log('G848 総トークン数（bible_data）:', g848AllTokens.length);
console.log('  japanese="自分":', g848JaSelf, '件');
console.log('  japanese=その他:', g848JaOther.length, '件', g848JaOther.length > 0 ? g848JaOther.map(t=>t.ref+':'+t.japanese).slice(0,5) : '');
console.log('  morph コード内訳:');
Object.entries(morphCounts).sort((a,b)=>b[1]-a[1]).forEach(([m,n]) => console.log('    ' + m + ': ' + n + '件'));
console.log('  語形内訳（上位10）:');
Object.entries(formCounts).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([f,n]) => console.log('    ' + f + ': ' + n + '件'));

// inventory での G848 状態確認
const g848InvStates = {};
ag.tokens.filter(t => t.strong === 'G848').forEach(t => {
  g848InvStates[t.state] = (g848InvStates[t.state] || 0) + 1;
});
console.log('  inventory 状態分布:', JSON.stringify(g848InvStates));

// ── Pre-flight ───────────────────────────────────────────
console.log('\n--- Pre-flight ---');
const errors = [];

for (const grp of [...RETAIN_GROUPS, ...HOLD_DQ_GROUPS]) {
  const pool = ag.tokens.filter(t => grp.strongs.includes(t.strong) && t.state === 'UNREVIEWED');
  console.log(grp.id + ': UNREVIEWED=' + pool.length + '件');
  if (pool.length === 0 && grp.id !== 'G848') {
    errors.push('UNEXPECTED_EMPTY: ' + grp.id);
  }
}

if (errors.length) { errors.forEach(e => console.error(e)); process.exit(1); }
console.log('Pre-flight: PASS\n');

// ── Apply ──────────────────────────────────────────────
console.log('--- 適用 ---');
const applied = { retain: {}, hold_dq: {} };

for (const grp of RETAIN_GROUPS) {
  let count = 0;
  for (const t of ag.tokens) {
    if (grp.strongs.includes(t.strong) && t.state === 'UNREVIEWED') {
      t.state = 'RETAIN_CONFIRMED';
      t.note = grp.note;
      count++;
    }
  }
  applied.retain[grp.id] = count;
  console.log('  RETAIN_CONFIRMED: ' + grp.id + ' ' + count + '件');
}

for (const grp of HOLD_DQ_GROUPS) {
  let count = 0;
  for (const t of ag.tokens) {
    if (grp.strongs.includes(t.strong) && t.state === 'UNREVIEWED') {
      t.state = 'HOLD_DATA_QUALITY';
      t.note = grp.note;
      count++;
    }
  }
  applied.hold_dq[grp.id] = count;
  console.log('  HOLD_DATA_QUALITY: ' + grp.id + ' ' + count + '件');
}

// ── Post-verification ────────────────────────────────────
console.log('\n--- Post-verification ---');
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state] || 0) + 1);

const totalRetain = Object.values(applied.retain).reduce((s, n) => s + n, 0);
const totalHoldDq = Object.values(applied.hold_dq).reduce((s, n) => s + n, 0);

const expUnrev = preCounts.UNREVIEWED - totalRetain - totalHoldDq;
const expRc    = preCounts.RETAIN_CONFIRMED + totalRetain;
const expHoldDq = preCounts.HOLD_DATA_QUALITY + totalHoldDq;

let vPass = true;
[
  [expUnrev,   postCounts.UNREVIEWED,          'UNREVIEWED'],
  [expRc,      postCounts.RETAIN_CONFIRMED,    'RETAIN_CONFIRMED'],
  [expHoldDq,  postCounts.HOLD_DATA_QUALITY,   'HOLD_DATA_QUALITY'],
  [preCounts.IMPLEMENTED_AND_VERIFIED, postCounts.IMPLEMENTED_AND_VERIFIED, 'IMPL (unchanged)'],
  [preCounts.HOLD_CONTEXT,             postCounts.HOLD_CONTEXT,             'HOLD_CTX (unchanged)'],
].forEach(([exp, act, name]) => {
  const ok = exp === act;
  if (!ok) vPass = false;
  console.log((ok ? '✓' : '✗') + ' ' + name + ': ' + act + ' (expect ' + exp + ')');
});

if (ag.tokens.length !== 92952) { console.error('TOTAL MISMATCH'); process.exit(1); }
console.log('✓ 合計: 92,952');

if (!vPass) { console.error('Post-verification FAIL'); process.exit(1); }
console.log('Post-verification: PASS');

// ── Save ──────────────────────────────────────────────
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

// ── G848 欠陥記録 ─────────────────────────────────────
const g848DefectRecord = {
  meta: {
    phase: '4bd',
    date: new Date().toISOString().slice(0, 10),
    description: 'G848 (αὑτός) データ品質欠陥記録',
  },
  summary: {
    total_tokens_in_bible_data: g848AllTokens.length,
    japanese_self_count: g848JaSelf,
    japanese_other: g848JaOther.map(t => ({ ref: t.ref, japanese: t.japanese })),
    morph_breakdown: morphCounts,
    form_breakdown: formCounts,
    inventory_state_distribution: g848InvStates,
  },
  defect_description: 'G848 (αὑτός) は Strong\'s では「αὑτός の再帰的用法」として分類されているが、GNT 本文内では morph コードが P-ASF/P-APM/P-APF 等の人称代名詞 accusative を示すケースが多数。現在の japanese="自分"（自己言及的）はこれらに対して語彙カテゴリが異なる。サンプル25件全件が人称代名詞用法であった（再帰用法のサンプルなし）。',
  sample_findings: {
    sample_size: 25,
    morphs_observed: ['P-ASF', 'P-APM', 'P-APF'],
    reflexive_uses_found: 0,
    personal_pronoun_uses_found: 25,
    representative_cases: [
      { ref: 'ROM 1:20!22', text: 'αὐτοὺς', morph: 'P-APM', ja1955: '省略（彼ら）' },
      { ref: '1CO 7:12!23', text: 'αὐτήν', morph: 'P-ASF', ja1955: '省略（妻）' },
      { ref: '1PE 3:11!12', text: 'αὐτήν', morph: 'P-ASF', ja1955: '省略（平和→これ）' },
      { ref: 'GAL 1:13!20', text: 'αὐτήν', morph: 'P-ASF', ja1955: '省略（教会）' },
    ],
    conclusion: 'サンプル内に再帰用法なし。大多数が3人称人称代名詞として使用されており、japanese="自分"は語彙カテゴリ不一致。口語訳合わせ処理の前に強番号の見直し（G848 vs G846/G847）または個別形態論的精査が必要。',
  },
  resolution: 'HOLD_DATA_QUALITY への一括移行。今後の口語訳合わせ処理から除外。',
};
saveJson(path.join(OUT, 'stage4-phase4bd-g848-defect-record.json'), g848DefectRecord);
console.log('Wrote: stage4-phase4bd-g848-defect-record.json');

// ── 最終サマリー ─────────────────────────────────────────
const report = {
  meta: { phase: '4bd', date: new Date().toISOString().slice(0, 10) },
  pre_counts: preCounts, post_counts: postCounts,
  applied,
  pre_sha256: preSha, post_sha256: postSha,
};
saveJson(path.join(OUT, 'stage4-phase4bd-inventory-update.json'), report);
console.log('Wrote: stage4-phase4bd-inventory-update.json');

console.log('\n=== 最終集計 ===');
console.log('UNREVIEWED    :', postCounts.UNREVIEWED);
console.log('RETAIN_CONFIRMED:', postCounts.RETAIN_CONFIRMED);
console.log('IMPL           :', postCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DQ        :', postCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX       :', postCounts.HOLD_CONTEXT);
