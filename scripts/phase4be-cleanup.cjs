'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4be — 3点クリーンアップ ===\n');

const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));
const preSha = sha256file(AG_PATH);

const preCounts = {};
ag.tokens.forEach(t => preCounts[t.state] = (preCounts[t.state] || 0) + 1);
console.log('変更前:', JSON.stringify(preCounts));

// ═══════════════════════════════════════════════════════
// Task 1: G3708 ✓ 3件のステータス確認
// ═══════════════════════════════════════════════════════
console.log('\n━━━ Task 1: G3708 MATCH 3件ステータス確認 ━━━');
const G3708_MATCH = ['JHN 4:45!12', 'JHN 14:9!16', 'JHN 19:35!3'];
const task1Changes = [];

for (const ref of G3708_MATCH) {
  const t = agMap.get(ref);
  if (!t) {
    console.log(ref + ': NOT IN INVENTORY（過去フェーズで処理済み）');
  } else {
    console.log(ref + ': state=' + t.state + ', note=' + (t.note || 'なし'));
    if (t.state === 'UNREVIEWED') {
      task1Changes.push(t);
    }
  }
}

// ═══════════════════════════════════════════════════════
// Task 2: G848 全493件 HOLD_DATA_QUALITY 拡大
// ═══════════════════════════════════════════════════════
console.log('\n━━━ Task 2: G848 全件スキャン ━━━');

// bible_data から全G848トークンを取得
const g848Bible = new Map();
const booksDir = fs.readdirSync(BIBLE).filter(b => fs.statSync(path.join(BIBLE, b)).isDirectory());
for (const book of booksDir.sort()) {
  const bookDir = path.join(BIBLE, book);
  for (const ch of fs.readdirSync(bookDir).filter(f => f.endsWith('.json'))
                       .sort((a, b) => parseInt(a) - parseInt(b))) {
    const data = loadJson(path.join(bookDir, ch));
    for (const t of data) {
      if (t.strong === 'G848') {
        g848Bible.set(t.ref, { ref: t.ref, text: t.text, morph: t.morph, japanese: t.japanese });
      }
    }
  }
}
console.log('bible_data G848 総件数:', g848Bible.size);

// inventory にある G848 の全状態を確認
const g848InvAll = ag.tokens.filter(t => t.strong === 'G848');
const g848InvStates = {};
g848InvAll.forEach(t => { g848InvStates[t.state] = (g848InvStates[t.state] || 0) + 1; });
console.log('inventory G848 件数:', g848InvAll.length, '/ 状態:', JSON.stringify(g848InvStates));

// bible_data にあって inventory にない参照を特定
const g848InvRefs = new Set(g848InvAll.map(t => t.ref));
const g848MissingFromInv = [...g848Bible.values()].filter(t => !g848InvRefs.has(t.ref));
console.log('inventory 未収録:', g848MissingFromInv.length, '件');
if (g848MissingFromInv.length > 0) {
  console.log('  → これらは inventory 自体に存在しないため移行不可。bible_data 側に記録のみ。');
  g848MissingFromInv.slice(0, 5).forEach(t => console.log('  例: ' + t.ref + ' morph=' + t.morph));
}

// F-3APM の2件を詳細確認
console.log('\n--- F-3APM 2件の詳細 ---');
const f3apm = [...g848Bible.values()].filter(t => t.morph === 'F-3APM');
for (const tok of f3apm) {
  // bible_data から周辺コンテキストも取得
  const m = tok.ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  const [, book, ch, verse, pos] = m;
  const fp = path.join(BIBLE, book, ch + '.json');
  const data = loadJson(fp);
  const idx = data.findIndex(t => t.ref === tok.ref);
  const ctx = data.slice(Math.max(0, idx - 2), idx + 3).map(t => t.text + '[' + t.strong + '/' + t.morph + ']').join(' ');
  console.log('  ref=' + tok.ref + ' text=' + tok.text + ' morph=' + tok.morph + ' ja="' + tok.japanese + '"');
  console.log('  ctx: ' + ctx);

  // 周辺のギリシャ語を見て再帰用法かどうか判断
  // F- code in biblical morphology: Reflexive pronoun
  const invTok = agMap.get(tok.ref);
  console.log('  inventory state:', invTok ? invTok.state : '未収録');
}

// F-3APM 判定: F = Reflexive pronoun コード
// GNT の形態論コードで F- は再帰代名詞を示す場合がある（Friberg coding 等）
// G848 × F-3APM: Strong番号はαὑτόςだが形態コードは再帰 → 語形確認が必要
const f3apmForms = f3apm.map(t => t.text);
console.log('  F-3APM 語形:', f3apmForms);
// αὑτούς（気息記号あり）ならば再帰αὑτός として日本語「自分」が正当
// αὐτούς（気息記号なし）ならば人称代名詞 αὐτός
const isReflexiveForm = f3apm.map(t => ({
  ref: t.ref, form: t.text,
  has_rough_breathing: t.text.includes('αὑ') || t.text.includes('Αὑ'),
  verdict: (t.text.includes('αὑ') || t.text.includes('Αὑ')) ? '再帰形（αὑτός）可能性あり' : '人称代名詞形（αὐτός）'
}));
isReflexiveForm.forEach(r => console.log('  ' + r.ref + ' form=' + r.form + ' → ' + r.verdict));

// ── G848 HOLD_DQ 拡大：inventory に収録されている UNREVIEWED 以外のもの ──
// 現在 HOLD_DQ になっているのは Phase 4bd で 437件（UNREVIEWED→HOLD_DQ）
// 他の状態（RETAIN_CONFIRMED 等）にある G848 があれば HOLD_DQ に変更
const task2Changes = [];
for (const invTok of g848InvAll) {
  if (invTok.state !== 'HOLD_DATA_QUALITY') {
    task2Changes.push({ ref: invTok.ref, prev_state: invTok.state });
  }
}
console.log('\nHOLD_DQ 以外の G848 inventory tokens:', task2Changes.length, '件');
if (task2Changes.length > 0) {
  task2Changes.forEach(c => console.log('  ' + c.ref + ' prev_state=' + c.prev_state));
}

// ═══════════════════════════════════════════════════════
// Task 3: UNREVIEWED 29,522件 Strong グループ内訳
// ═══════════════════════════════════════════════════════
console.log('\n━━━ Task 3: UNREVIEWED Strong グループ内訳 ━━━');

// UNREVIEWED トークンの Strong 別集計（Task 1,2 適用前の現在値で集計）
const unrev = ag.tokens.filter(t => t.state === 'UNREVIEWED');
console.log('現在の UNREVIEWED:', unrev.length, '件');

const strongCounts = {};
unrev.forEach(t => { strongCounts[t.strong] = (strongCounts[t.strong] || 0) + 1; });
const strongSorted = Object.entries(strongCounts).sort((a, b) => b[1] - a[1]);
console.log('Strong グループ総数:', strongSorted.length);

// 機能語の定義（代名詞・冠詞・接続詞・前置詞・助詞的語）
// Strong 番号から大まかに分類する heuristic
// 主要機能語グループを手動で定義
const FUNCTIONAL_STRONGS = new Set([
  // 冠詞
  'G3588',
  // 人称代名詞
  'G3450','G1473','G3165','G2257','G2254','G1438',
  'G4771','G4675','G4671','G5216','G5213',
  'G846','G848','G5207',
  // 指示代名詞
  'G3778','G3778','G3739','G1565','G3592',
  'G1565','G3754','G3761','G3762',
  // 関係代名詞
  'G3739','G3748',
  // 疑問代名詞
  'G5101','G3748',
  // 接続詞
  'G2532','G1161','G235','G3767','G2443','G3754',
  'G1063','G3303','G3756','G3361','G1510',
  'G3326','G1223','G2596','G1519','G1537',
  'G4314','G1909','G1722','G3844','G4862',
  // 前置詞
  'G575','G0575','G1537','G1519','G1722',
  // 副詞的語
  'G3568','G3767','G1161',
]);

// より精度高く：bible_data から実際の品詞 morph コードで分類
// morph の最初の文字で品詞判定
// V=動詞, N=名詞, A=形容詞, P=代名詞, R=代名詞, D=副詞, C=接続詞, PREPなど
// まずトークンの morph を bible_data から取得して集計

console.log('\n上位30グループ（件数順）:');
strongSorted.slice(0, 30).forEach(([s, n], i) => {
  console.log('  ' + String(i+1).padStart(2) + '. ' + s.padEnd(8) + ' ' + String(n).padStart(5) + '件');
});

console.log('\n全グループ（閾値100件以上）:');
strongSorted.filter(([,n]) => n >= 100).forEach(([s, n]) => {
  console.log('  ' + s.padEnd(8) + ' ' + n);
});

// 機能語グループ候補（前回処理した G3739/1人称/G1438 以外で代名詞・冠詞・接続詞系）
// morph コードを使って分類する
// UNREVIEWED トークンの morph を bible_data から取得（サンプル）
const unrevByStrong = {};
unrev.forEach(t => {
  if (!unrevByStrong[t.strong]) unrevByStrong[t.strong] = [];
  unrevByStrong[t.strong].push(t.ref);
});

// 代表的なグループの morph を確認（上位20グループを対象）
console.log('\n上位グループの morph 確認（内容語 vs 機能語の判断に使用）:');
const morphByStrong = {};
for (const [strong, refs] of Object.entries(unrevByStrong)) {
  if (strongCounts[strong] < 200) continue; // 200件以上に絞る
  // 1件だけ bible_data から取得して morph を確認
  const ref = refs[0];
  const m2 = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
  if (!m2) continue;
  const [, book, ch] = m2;
  try {
    const data = loadJson(path.join(BIBLE, book, ch + '.json'));
    const tok = data.find(t => t.ref === ref);
    if (tok) morphByStrong[strong] = tok.morph;
  } catch (e) {}
}

// morph プレフィックスで大分類
const PREFIX_LABEL = {
  'V': '動詞', 'N': '名詞', 'A': '形容詞', 'P': '代名詞',
  'R': '相関/代名詞', 'D': '副詞', 'C': '接続詞', 'F': '再帰代名詞',
  'T': '冠詞', 'I': '感嘆詞', 'X': '不変化詞', 'Q': '小辞',
  'B': '前置詞副詞', 'K': '接続詞', 'S': '関係形容詞',
};

for (const [strong, morph] of Object.entries(morphByStrong)) {
  const prefix = morph[0];
  const label = PREFIX_LABEL[prefix] || morph;
  console.log('  ' + strong.padEnd(8) + ' ' + String(strongCounts[strong]).padStart(5) + '件  morph=' + morph.padEnd(12) + ' → ' + label);
}

// ═══════════════════════════════════════════════════════
// 適用（Task 1 と Task 2 の変更）
// ═══════════════════════════════════════════════════════
console.log('\n━━━ 変更適用 ━━━');
let t1Applied = 0, t2Applied = 0;

// Task 1: G3708 ✓ 3件 UNREVIEWED → RETAIN_CONFIRMED
for (const t of task1Changes) {
  t.state = 'RETAIN_CONFIRMED';
  t.note = 'PHASE4BC_G3708_MATCH_RETAIN: JA1955 との語彙一致確認済み（見る→見る維持）';
  t1Applied++;
  console.log('Task1 RETAIN: ' + t.ref);
}

// Task 2: G848 HOLD_DQ 以外の inventory tokens を HOLD_DQ に変更
for (const c of task2Changes) {
  const t = agMap.get(c.ref);
  t.state = 'HOLD_DATA_QUALITY';
  t.note = 'PHASE4BE_G848_HOLD_DQ_EXTEND: ' + (t.note || '') + ' prev_state=' + c.prev_state;
  t2Applied++;
  console.log('Task2 HOLD_DQ: ' + c.ref + ' (was ' + c.prev_state + ')');
}

if (t1Applied === 0) console.log('Task1: 変更なし（3件は inventory 未収録または既に処理済み）');
if (t2Applied === 0) console.log('Task2: inventory 追加変更なし（HOLD_DQ 以外の G848 inventory 件なし）');

// ═══════════════════════════════════════════════════════
// Post-verification
// ═══════════════════════════════════════════════════════
console.log('\n━━━ Post-verification ━━━');
const postCounts = {};
ag.tokens.forEach(t => postCounts[t.state] = (postCounts[t.state] || 0) + 1);

const expUnrev  = preCounts.UNREVIEWED   - t1Applied;
const expRc     = preCounts.RETAIN_CONFIRMED + t1Applied - t2Applied;
const expHoldDq = preCounts.HOLD_DATA_QUALITY + t2Applied;

let vPass = true;
[
  [expUnrev,                              postCounts.UNREVIEWED,          'UNREVIEWED'],
  [expRc,                                 postCounts.RETAIN_CONFIRMED,    'RETAIN_CONFIRMED'],
  [expHoldDq,                             postCounts.HOLD_DATA_QUALITY,   'HOLD_DATA_QUALITY'],
  [preCounts.IMPLEMENTED_AND_VERIFIED,    postCounts.IMPLEMENTED_AND_VERIFIED, 'IMPL (unchanged)'],
  [preCounts.HOLD_CONTEXT,                postCounts.HOLD_CONTEXT,        'HOLD_CTX (unchanged)'],
].forEach(([exp, act, name]) => {
  const ok = exp === act;
  if (!ok) vPass = false;
  console.log((ok ? '✓' : '✗') + ' ' + name + ': ' + act + (exp !== act ? ' (expect ' + exp + ')' : ''));
});

if (ag.tokens.length !== 92952) { console.error('TOTAL MISMATCH'); process.exit(1); }
console.log('✓ 合計: 92,952');
if (!vPass) { console.error('Post-verification FAIL'); process.exit(1); }
console.log('Post-verification: PASS');

// Save
saveJson(AG_PATH, ag);
const postSha = sha256file(AG_PATH);
console.log('\nInventory saved. Post SHA256:', postSha);

// ═══════════════════════════════════════════════════════
// UNREVIEWED 内訳レポート（変更後）
// ═══════════════════════════════════════════════════════
const unrevFinal = ag.tokens.filter(t => t.state === 'UNREVIEWED');
const scFinal = {};
unrevFinal.forEach(t => { scFinal[t.strong] = (scFinal[t.strong] || 0) + 1; });
const scSorted = Object.entries(scFinal).sort((a, b) => b[1] - a[1]);

// bible_data から morph プレフィックスを取得してグループ分類
const morphPrefixByStrong = {};
for (const [strong, n] of scSorted.slice(0, 50)) {
  const refs = unrevFinal.filter(t => t.strong === strong).map(t => t.ref);
  const ref = refs[0];
  const m2 = ref.match(/^(\S+)\s+(\d+):(\d+)!/);
  if (!m2) continue;
  const [, book, ch] = m2;
  try {
    const data = loadJson(path.join(BIBLE, book, ch + '.json'));
    const tok = data.find(t => t.ref === ref);
    if (tok) morphPrefixByStrong[strong] = tok.morph[0];
  } catch (e) {}
}

// 機能語 vs 内容語の分類
// 機能語: P=代名詞, T=冠詞, C=接続詞, D=副詞(機能的), X=不変化詞, F=再帰代名詞, R=相関詞
// 内容語: V=動詞, N=名詞, A=形容詞
const FUNC_PREFIXES = new Set(['P', 'T', 'C', 'F', 'R', 'X']);
const CONTENT_PREFIXES = new Set(['V', 'N', 'A']);

const funcGroups = [], contentGroups = [], unknownGroups = [];
for (const [strong, n] of scSorted) {
  const prefix = morphPrefixByStrong[strong];
  if (!prefix) {
    unknownGroups.push([strong, n]);
  } else if (FUNC_PREFIXES.has(prefix)) {
    funcGroups.push([strong, n, prefix]);
  } else if (CONTENT_PREFIXES.has(prefix)) {
    contentGroups.push([strong, n, prefix]);
  } else {
    unknownGroups.push([strong, n, prefix]);
  }
}

const funcTotal = funcGroups.reduce((s, [, n]) => s + n, 0);
const contentTotal = contentGroups.reduce((s, [, n]) => s + n, 0);
const unknownTotal = unknownGroups.reduce((s, [, n]) => s + n, 0);

console.log('\n=== UNREVIEWED 残件数内訳 ===');
console.log('総 Strong グループ数:', scSorted.length);
console.log('総 UNREVIEWED 件数  :', unrevFinal.length);
console.log('');
console.log('機能語グループ (' + funcGroups.length + 'グループ, ' + funcTotal + '件):');
funcGroups.forEach(([s, n, p]) => console.log('  ' + s.padEnd(8) + ' ' + String(n).padStart(5) + '件  morph_prefix=' + p));
console.log('');
console.log('内容語グループ (' + contentGroups.length + 'グループ, ' + contentTotal + '件, 上位20):');
contentGroups.slice(0, 20).forEach(([s, n, p]) => console.log('  ' + s.padEnd(8) + ' ' + String(n).padStart(5) + '件  morph_prefix=' + p));
console.log('  ... 合計', contentGroups.length, 'グループ');
console.log('');
console.log('分類未確定 (' + unknownGroups.length + 'グループ, ' + unknownTotal + '件):');
unknownGroups.slice(0, 10).forEach(([s, n, p]) => console.log('  ' + s.padEnd(8) + ' ' + String(n).padStart(5) + (p ? '  morph_prefix=' + p : '  (morph未取得)')));

// Save deliverable
saveJson(path.join(OUT, 'stage4-phase4be-unreviewed-breakdown.json'), {
  meta: { phase: '4be', date: new Date().toISOString().slice(0, 10) },
  post_counts: postCounts,
  post_sha256: postSha,
  unreviewed_total: unrevFinal.length,
  strong_group_count: scSorted.length,
  functional_groups: { count: funcGroups.length, total: funcTotal, groups: funcGroups.map(([s,n,p]) => ({strong:s,count:n,morph_prefix:p})) },
  content_groups:    { count: contentGroups.length, total: contentTotal, groups: contentGroups.map(([s,n,p]) => ({strong:s,count:n,morph_prefix:p})) },
  unknown_groups:    { count: unknownGroups.length, total: unknownTotal, groups: unknownGroups.map(([s,n,p]) => ({strong:s,count:n,morph_prefix:p||null})) },
  g848_bible_total: g848Bible.size,
  g848_missing_from_inv: g848MissingFromInv.map(t => ({ ref: t.ref, morph: t.morph })),
  f3apm_analysis: isReflexiveForm,
});
console.log('\nWrote: stage4-phase4be-unreviewed-breakdown.json');
