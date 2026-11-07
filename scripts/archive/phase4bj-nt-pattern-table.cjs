'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CL4BH_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4bh-rom-classify.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }

console.log('=== Phase 4bj — NT全体パターン集計表（変更なし）===\n');

// ═══════════════════════════════════════════════════════════════════
// 1. データ読み込み
// ═══════════════════════════════════════════════════════════════════
const ag = loadJson(AG_PATH);
const cl4bh = loadJson(CL4BH_PATH);

// inventory state map: ref → state
const stateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// ═══════════════════════════════════════════════════════════════════
// 2. Phase 4bi G18 差異説明データ収集
// ═══════════════════════════════════════════════════════════════════
console.log('--- Phase 4bi vs Phase 4bh 件数差異 ---');
const all_unrev = cl4bh.all_vocab_unreviewed;
const g18 = all_unrev.filter(r => r.strong === 'G18' && r.tok_ja === '良い');
console.log('ROM Phase 4bh all_vocab_unreviewed G18 "良い" 合計:', g18.length, '件');
const g18CandDist = {};
g18.forEach(r => { g18CandDist[r.candidate] = (g18CandDist[r.candidate] || 0) + 1; });
const g18Cand_sen = g18.filter(r => r.candidate === '善').length;
const g18Other = g18.length - g18Cand_sen;
console.log('  candidate="善" の件数:', g18Cand_sen, '件  ← Phase 4bh パターン表が示した件数');
console.log('  その他の候補を持つ件数:', g18Other, '件  ← TABLE適用で "善" に変換された追加分');
console.log('  TABLE実施合計:', g18.length, '件  ← Phase 4bi 実施件数');
console.log('  候補値分布:', JSON.stringify(g18CandDist));
console.log();

// ═══════════════════════════════════════════════════════════════════
// 3. NT全体 bible_data トークン読み込み
// ═══════════════════════════════════════════════════════════════════
console.log('NT bible_data 読み込み中...');
const books = fs.readdirSync(BIBLE).filter(f => !f.includes('.'));
let totalTokens = 0;

// Strong → { total, unreviewed, rc, impl, hold } の集計
const strongCount = {};      // strong → NT全体件数
// パターン: `${strong}\t${japanese}` → { total, UNREVIEWED, RC, IMPL, HOLD }
const patternCount = {};
// G848 morph patterns: `G848\t${morph}\t${japanese}` → counts
const g848MorphCount = {};

for (const book of books.sort()) {
  const bookDir = path.join(BIBLE, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  const chapters = fs.readdirSync(bookDir).filter(f => f.endsWith('.json'));
  for (const chFile of chapters) {
    const data = loadJson(path.join(bookDir, chFile));
    for (const tok of data) {
      if (!tok.strong || !tok.ref) continue;
      totalTokens++;
      const strong = tok.strong;
      const japanese = tok.japanese || '';
      const morph = tok.morph || '';
      const state = stateMap.get(tok.ref) || 'UNKNOWN';

      // Strong NT全体件数
      if (!strongCount[strong]) strongCount[strong] = 0;
      strongCount[strong]++;

      // パターン (strong, japanese) 集計
      const pk = strong + '\t' + japanese;
      if (!patternCount[pk]) patternCount[pk] = { total: 0, UNREVIEWED: 0, RETAIN_CONFIRMED: 0, IMPLEMENTED_AND_VERIFIED: 0, HOLD_DATA_QUALITY: 0, HOLD_CONTEXT: 0 };
      patternCount[pk].total++;
      patternCount[pk][state] = (patternCount[pk][state] || 0) + 1;

      // G848 形態素パターン (HOLD_DQ 個人代名詞誤用)
      if (strong === 'G848') {
        const mk = 'G848\t' + morph + '\t' + japanese;
        if (!g848MorphCount[mk]) g848MorphCount[mk] = { total: 0, UNREVIEWED: 0, RETAIN_CONFIRMED: 0, IMPLEMENTED_AND_VERIFIED: 0, HOLD_DATA_QUALITY: 0 };
        g848MorphCount[mk].total++;
        g848MorphCount[mk][state] = (g848MorphCount[mk][state] || 0) + 1;
      }
    }
  }
}

console.log('NT総トークン数:', totalTokens);
console.log('Strong種類数:', Object.keys(strongCount).length);
console.log();

// ═══════════════════════════════════════════════════════════════════
// 4. TABLE パターン定義（Phase 4bi TABLE + 適用条件）
// ═══════════════════════════════════════════════════════════════════
const TABLE_PATTERNS = [
  // [strong, from, to, label, condition, nt_applicable]
  // nt_applicable: true=NT全体適用候補, 'cond'=条件付き, false=ROM固有の可能性
  ['G18',   '良い',         '善',             'ἀγαθός',         '名詞的用法・善悪対比文脈（JA1955が「善」と訳す箇所）', 'cond'],
  ['G165',  '世',           '永遠',           'αἰών',           'JA1955が「永遠に」と訳す副詞的用法（αἰῶνα単数対格等）', 'cond'],
  ['G379',  '言い訳できない', '弁解の余地がない', 'ἀναπολόγητος', '常時（NT全体出現数が少ない専用語）', true],
  ['G435',  '男',           '夫',             'ἀνήρ',           '婚姻文脈のみ（妻との関係として使われる場合）', 'cond'],
  ['G763',  '不敬虔',       '不信心',         'ἀσέβεια',        'JA1955が「不信心」と訳す場合（属格・呼格も含む）', 'cond'],
  ['G782',  '挨拶する',     'よろしく',       'ἀσπάζομαι',      '書簡の挨拶文（よろしくとお伝えください等）', true],
  ['G1342', '義の',         '義人',           'δίκαιος',        '名詞的用法「義人」（文脈上「正しい人」の意）', 'cond'],
  ['G1344', '義と認める',   '義とする',       'δικαιόω',        '常時（JA1955は「義とする」を一貫使用）', true],
  ['G1391', '栄光',         '光栄',           'δόξα',           'ROM固有箇所のみ確認済み・NT全体では「栄光」が標準', false],
  ['G1659', '自由にする',   '解放する',       'ἐλευθερόω',      '常時（JA1955は「解放する」を使用）', true],
  ['G1680', '希望',         '望み',           'ἐλπίς',          'JA1955が「望み」と訳す場合（「希望」とも訳す）', 'cond'],
  ['G2089', 'まだ',         'なおも',         'ἔτι',            'JA1955が「なおも」と訳す副詞的用法', 'cond'],
  ['G2347', '苦難',         '患難',           'θλίψις',         '常時（JA1955は「患難」を一貫使用）', true],
  ['G2556', '悪い',         '悪',             'κακός',          '名詞的用法「悪」（善悪対比・悪を行う等）', 'cond'],
  ['G2822', '招かれた',     '召す',           'κλητός',         '常時（神の召しの文脈、JA1955は「召された」等）', true],
  ['G2917', '裁き',         'さばき',         'κρίμα',          'JA1955が「さばき」と表記する場合', 'cond'],
  ['G2937', '創造物',       '被造物',         'κτίσις',         '常時（κτίσις=被造物、一貫語）', true],
  ['G3049', '考える',       '認める',         'λογίζομαι',      'JA1955が「認める」「数える」と訳す場合（みなす・勘定する文脈）', 'cond'],
  ['G3123', 'むしろ',       'まして',         'μᾶλλον',         'JA1955が「まして」と訳す比較文脈', 'cond'],
  ['G3441', 'ひとり',       'ばかりでなく',   'μόνος',          '否定文脈「〜のみならず・〜ばかりでなく」の副詞的用法のみ', 'cond'],
  ['G4412', '第一の',       'はじめ',         'πρῶτος',         '副詞的用法「まずはじめに」（JA1955の「はじめに」表記）', 'cond'],
  ['G4459', 'どのように',   'どうして',       'πῶς',            'JA1955が「どうして」と訳す文脈', 'cond'],
  ['G4991', '救い',         '救',             'σωτηρία',        'JA1955が「救」（救・救のもの等）と表記する場合', 'cond'],
  ['G5092', '敬意',         'ほまれ',         'τιμή',           'JA1955が「ほまれ」と訳す場合（一般的には「誉れ・名誉」等）', 'cond'],
  ['G5540', '使用',         '関係',           'χρῆσις',         'ROM 1:26,27限定（JA1955「自然の関係」文脈）', false],
];

// G848 HOLD_DQ パターン（個人代名詞形態素 P-APM/P-ASF/P-APF で japanese="自分" → 修正対象）
// ※ G846はinventory外。G848は強番号データ品質問題（本来G846相当の用法）だが、
//    morphologicalに個人代名詞形（P-*）であることは確定 → "自分"は誤り
// ※ MRK 9:16!7 F-3APM は既知の残件として対象外（G848 reflexiveかどうか未確定）
// ※ JHN 20:10!5 は inventory外（stage4スコープ外）
const G848_HOLD_PATTERNS = [
  ['G848', 'P-APM', '自分', '彼ら',     'αὑτούς等（対格複数男性）: G848タグだが個人代名詞形、G846規約に準拠', '彼ら'],
  ['G848', 'P-ASF', '自分', '彼女',     'αὑτήν等（対格単数女性）: G848タグだが個人代名詞形、G846規約に準拠',  '彼女'],
  ['G848', 'P-APF', '自分', '彼女たち', 'αὑτάς等（対格複数女性）: G848タグだが個人代名詞形、G846規約に準拠',  '彼女たち'],
];

// ═══════════════════════════════════════════════════════════════════
// 5. パターン別 NT全体件数集計
// ═══════════════════════════════════════════════════════════════════

// TABLE パターンの集計
const tableResults = [];
for (const [strong, from, to, lemma, cond, ntApply] of TABLE_PATTERNS) {
  const ntTotal = strongCount[strong] || 0;
  const pk = strong + '\t' + from;
  const counts = patternCount[pk] || { total: 0, UNREVIEWED: 0, RETAIN_CONFIRMED: 0, IMPLEMENTED_AND_VERIFIED: 0, HOLD_DATA_QUALITY: 0 };
  tableResults.push({ strong, from, to, lemma, cond, ntApply, ntTotal, counts });
}

// G848 HOLD パターンの集計
// bible_data 全体件数（スコープ外含む）と inventory HOLD_DQ 件数を両方集計
// MRK 9:16!7 (F-3APM) は既知の残件 → 除外（morphが異なるため P集計に影響しない）
const G848_BIBLE_COUNTS = { 'P-APM': 352, 'P-ASF': 128, 'P-APF': 11 }; // bible_data実測値
const g848Results = [];
for (const [strong, morphCode, fromJa, toJa, cond, label] of G848_HOLD_PATTERNS) {
  const ntTotal = strongCount[strong] || 0;
  let total = 0, unrev = 0, rc = 0, impl = 0, hold = 0;
  for (const [k, v] of Object.entries(g848MorphCount)) {
    const [ks, km, kj] = k.split('\t');
    if (ks === strong && km === morphCode && kj === fromJa) {
      total += v.total;
      unrev += v.UNREVIEWED || 0;
      rc += v.RETAIN_CONFIRMED || 0;
      impl += v.IMPLEMENTED_AND_VERIFIED || 0;
      hold += v.HOLD_DATA_QUALITY || 0;
    }
  }
  const bibleTotal = G848_BIBLE_COUNTS[morphCode] || 0;
  const outOfScope = total - hold; // bible_data内だがinventory HOLD_DQ外のトークン
  g848Results.push({ strong, morphCode, fromJa, toJa, cond, ntTotal, bibleTotal, outOfScope,
    counts: { total, UNREVIEWED: unrev, RETAIN_CONFIRMED: rc, IMPLEMENTED_AND_VERIFIED: impl, HOLD_DATA_QUALITY: hold } });
}

// ═══════════════════════════════════════════════════════════════════
// 6. 出力
// ═══════════════════════════════════════════════════════════════════

console.log('='.repeat(80));
console.log('Phase 4bj NT全体パターン集計表');
console.log('集計日: 2026-11-05  変更なし（集計のみ）');
console.log('='.repeat(80));

console.log('\n【1】Phase 4bi G18 件数差異の説明\n');
console.log('  Phase 4bh パターン表:  G18 "良い" → "善" = 6件');
console.log('    → candidate (自動グロス形) = "善" のトークン数。');
console.log('       phase4bh は (strong, tok_ja, candidate) の組合せで集計するため、');
console.log('       候補値が "善" の6件のみがこのパターンとして表示された。');
console.log('');
console.log('  Phase 4bi TABLE 実施: G18 "良い" = 20件');
console.log('    → TABLE は (strong, tok_ja) のみでマッチ。');
console.log('       G18 "良い" の all_vocab_unreviewed 全20件に適用された。');
console.log('       残り14件の候補値例: 善人の(1)/善なるもの(2)/善なるものによって(1)/');
console.log('       益となるようにして下さること(1)/良きおとずれを告げる者の(1)/');
console.log('       善であって(1)/善事をするがよい(1) 等（いずれも自動変換では不正確）。');
console.log('');
console.log('  一般原則:');
console.log('    phase4bh 表の件数 = 特定(strong, tok_ja, candidate)パターンの出現数');
console.log('    phase4bi TABLE実施件数 = (strong, tok_ja)で一致する全UNREVIEWED語彙相違トークン数');
console.log('    → NT全体集計表も後者の方式で集計（以下の "該当" 列 = UNREVIEWED件数）');

console.log('\n' + '='.repeat(80));
console.log('【2】TABLE パターン NT全体集計');
console.log('='.repeat(80));
console.log('\n対象条件: Strong NT全体出現数 ≥ 100件 / 変更後グロス形確定済み\n');

// 判定: NT全体 ≥ 100件かつ fromJa が実際に存在する
const INCLUDED = tableResults.filter(r => r.ntTotal >= 100 && r.ntApply !== false && r.counts.total > 0);
const EXCL_LOW = tableResults.filter(r => r.ntTotal < 100 && r.counts.total > 0);
const EXCL_ROM = tableResults.filter(r => r.ntApply === false);
const EXCL_ZERO = tableResults.filter(r => r.counts.total === 0 && r.ntApply !== false);

console.log('  Strong  現在のjapanese  → グロス形       NT件数  UNREV  RC    IMPL  適用');
console.log('  ' + '-'.repeat(80));

let totalUNREV = 0;
const includedRows = [...INCLUDED];

for (const r of includedRows) {
  const apply = r.ntApply === true ? '常時' : '条件付';
  const unrev = r.counts.UNREVIEWED || 0;
  totalUNREV += unrev;
  console.log(
    '  ' + r.strong.padEnd(7) +
    r.from.padEnd(16) + '→ ' + r.to.padEnd(14) +
    String(r.ntTotal).padStart(6) + '  ' +
    String(unrev).padStart(5) + '  ' +
    String(r.counts.RETAIN_CONFIRMED || 0).padStart(5) + '  ' +
    String(r.counts.IMPLEMENTED_AND_VERIFIED || 0).padStart(5) + '  ' +
    apply
  );
}

console.log('\n  G848 HOLD_DQ パターン（G846規約準拠・DQフロー）:');
console.log('  備考: G846はinventory外。G848 HOLD_DQ 437件のうち P-morph 436件が対象。');
console.log('        MRK 9:16!7 (F-3APM 1件) は既知の残件として除外。');
console.log('        JHN 20:10!5 は stage4スコープ外。');
console.log('  ' + '-'.repeat(80));
let g848TotalHOLD = 0, g848TotalBible = 0;
for (const r of g848Results) {
  const hold = r.counts.HOLD_DATA_QUALITY || 0;
  g848TotalHOLD += hold;
  g848TotalBible += r.bibleTotal;
  console.log(
    '  ' + r.strong.padEnd(7) +
    ('自分 [morph:' + r.morphCode + ']').padEnd(24) + '→ ' + r.toJa.padEnd(12) +
    '聖書全体:' + String(r.bibleTotal).padStart(4) + '  HOLD_DQ:' + String(hold).padStart(4) +
    '  スコープ外:' + String(r.outOfScope).padStart(3)
  );
}
console.log('  G848 P-morph 合計: bible_data=' + g848TotalBible + '件（HOLD_DQ=' + g848TotalHOLD + '件 + スコープ外55件）');
console.log('  ※「スコープ外55件」= stage4 inventory に含まれていないG848 P-morphトークン');

console.log('\n  パターン数（TABLE対象）:', includedRows.length);
console.log('  パターン数（G848 HOLD追加）:', g848Results.length);
console.log('  パターン総数:', includedRows.length + g848Results.length);
console.log('  適用した場合の変更トークン総数:');
console.log('    UNREVIEWED（標準ワークフロー）:', totalUNREV, '件');
console.log('    HOLD_DQ（G848 DQ解消後に別ワークフロー）:', g848TotalHOLD, '件');

// 詳細な適用条件
console.log('\n' + '='.repeat(80));
console.log('【3】各パターンの適用条件詳細');
console.log('='.repeat(80));
let pNum = 1;
for (const r of includedRows) {
  const unrev = r.counts.UNREVIEWED || 0;
  console.log('\n  P' + String(pNum++).padStart(2, '0') + ' ' + r.strong + ' ' + r.lemma + ' ' + r.from + '→' + r.to);
  console.log('      NT件数:' + r.ntTotal + '  UNREV:' + unrev + '  RC:' + (r.counts.RETAIN_CONFIRMED||0) + '  IMPL:' + (r.counts.IMPLEMENTED_AND_VERIFIED||0));
  console.log('      適用条件: ' + r.cond);
}
for (const r of g848Results) {
  const hold = r.counts.HOLD_DATA_QUALITY || 0;
  console.log('\n  P' + String(pNum++).padStart(2, '0') + ' G848 αὑτός [morph ' + r.morphCode + '] 自分→' + r.toJa);
  console.log('      G848 NT件数:' + r.ntTotal + '  HOLD_DQ:' + hold + '（全件 japanese="自分"）');
  console.log('      適用条件: ' + r.cond);
  console.log('      注意: strong=G848のままjapaneseのみ変更。MRK 9:16!7除外。JHN 20:10!5はスコープ外。');
}

// ═══════════════════════════════════════════════════════════════════
// 7. 除外パターン（既知の残件）
// ═══════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(80));
console.log('【4】対象外パターン（既知の残件として記録）');
console.log('='.repeat(80));

console.log('\n  [A] Strong NT全体出現数 < 100件（低頻度語）:');
for (const r of EXCL_LOW) {
  console.log('      ' + r.strong + ' ' + r.from + '→' + r.to + ' (' + r.lemma + ') NT:' + r.ntTotal + '件 UNREV:' + (r.counts.UNREVIEWED||0));
}

console.log('\n  [B] ROM固有の可能性・NT全体適用未確認:');
for (const r of EXCL_ROM) {
  console.log('      ' + r.strong + ' ' + r.from + '→' + r.to + ' NT:' + r.ntTotal + '件 UNREV:' + (r.counts.UNREVIEWED||0));
  console.log('      理由: ' + r.cond);
}

console.log('\n  [C] NT全体でtok_jaが該当なし（ROM以外に分布なし）:');
for (const r of EXCL_ZERO) {
  console.log('      ' + r.strong + ' "' + r.from + '" NT全体0件 (ROM限定語彙)');
}

console.log('\n  [D] ROM残件 未実施のまま閉じる内訳:');
console.log('      CAND_OK差し戻し    728件: マルチトークンセグメント446件 + グロス形変換エラー282件');
console.log('      SKIP_LONG_CAND     244件: 自動グロス形 8文字超（個別確認必要）');
console.log('      SKIP_INFLECTED      21件: 活用形残留（複合活用形の変換が不正確）');
console.log('      EXCL_STRONG         20件: 偽陽性（G2046/G4238/G264/G3107）');
console.log('      NO_OP                3件: 候補値=tok_ja（実質無変更）');
console.log('      RC 語彙相違        429件: 再確認待ち（今回対象外）');
console.log('      未収録 語彙相違    368件: 台帳未収録（今回対象外）');
console.log('      Phase 4bh SKIP     446件: マルチトークンセグメント（Phase 4bh段階でスキップ）');

console.log('\n  [E] G848 F-3APM 2件:');
console.log('      JHN 20:10!5 — 正当なG848使用（ἑαυτούς、再帰、HOLD_DQ据置）');
console.log('      MRK 9:16!7 — G846/G848判定不確定（既知の残件として記録）');

// ═══════════════════════════════════════════════════════════════════
// 8. ROM残件 台帳閉鎖 — known_residuals 更新
// ═══════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(80));
console.log('【5】ROM残件 台帳閉鎖（known_residuals 更新）');
console.log('='.repeat(80));

ag.known_residuals.phase4bi_closure = {
  date: '2026-11-05',
  status: 'CLOSED',
  total_vocab_unrev: all_unrev.length,
  implemented_table: 192,
  excl_strong: { count: 20, strongs: ['G2046', 'G4238', 'G264', 'G3107'], reason: '偽陽性（意味的に変更不要）' },
  cand_ok_reverted: {
    count: 728,
    breakdown: {
      multi_token_seg: 446,
      derive_error: 282,
    },
    reason: 'グロス形自動変換の精度不足（マルチトークンセグメント・複合活用形変換の3つの既知バグ）',
    bugs: [
      '文字クラスバグ: /[はがをに...よりから]$/ が多文字助詞を分割処理',
      'ているバグ: 熱望している→熱望しる（している→する処理が先行必要）',
      '受動→能動バグ: 言い伝えられている→言い伝え+する→言い伝えする（一段動詞で不正）',
    ],
  },
  phase4bi_skip: {
    SKIP_LONG_CAND: 244,
    SKIP_INFLECTED: 21,
    NO_OP: 3,
    total: 268,
    reason: '8文字超候補・活用形残留・変更不要',
  },
  phase4bh_skip: {
    multi_token_seg: 446,
    reason: 'Phase 4bh段階でスキップ（all_vocab_unreviewedに含まれていない）',
  },
  rc_vocab_diff: { count: 429, reason: 'RETAIN_CONFIRMED状態のため今回対象外' },
  unlisted_vocab_diff: { count: 368, reason: '台帳未収録（JA1955対応表との照合で差異を確認、個別確認が必要）' },
  g848_residuals: {
    jhn_20_10_5: '正当なG848（ἑαυτούς、再帰代名詞用法）、変更不要',
    mrk_9_16_7: '残件: G846/G848強番号判定要確認',
  },
};

saveJson(AG_PATH, ag);
console.log('\nknown_residuals.phase4bi_closure 追加済み');

// ═══════════════════════════════════════════════════════════════════
// 9. 集計表 JSON 保存
// ═══════════════════════════════════════════════════════════════════
const output = {
  meta: {
    phase: '4bj',
    date: '2026-11-05',
    description: 'NT全体パターン集計表 (変更なし)',
    counting_method: '(strong, tok_ja) match count in UNREVIEWED vocab-diff tokens — same as Phase 4bi TABLE method',
  },
  discrepancy_explanation: {
    g18_phase4bh_table: 6,
    g18_phase4bi_implemented: 20,
    cause: 'Phase 4bh表は (strong, tok_ja, candidate) 組合せでグループ化。G18 "良い" → candidate="善" の組合せが6件のみ。残り14件は異なる候補値を持つが、TABLE適用は (strong, tok_ja) のみでマッチするため全20件に適用された。',
    candidate_distribution: g18CandDist,
  },
  table_patterns: includedRows.map(r => ({
    strong: r.strong,
    lemma: r.lemma,
    from: r.from,
    to: r.to,
    condition: r.cond,
    nt_total: r.ntTotal,
    counts: r.counts,
  })),
  g848_hold_patterns: g848Results.map(r => ({
    strong: r.strong,
    morph_code: r.morphCode,
    from: r.fromJa,
    to: r.toJa,
    condition: r.cond,
    nt_total: r.ntTotal,
    counts: r.counts,
    note: 'HOLD_DQ状態。DQ解消後に別ワークフローで適用。MRK 9:16!7 (F-3APM)は既知の残件。',
  })),
  summary: {
    table_pattern_count: includedRows.length,
    g848_hold_pattern_count: g848Results.length,
    total_patterns: includedRows.length + g848Results.length,
    total_unreviewed_to_change: totalUNREV,
    total_hold_dq_to_change: g848TotalHOLD,
  },
  excluded_patterns: {
    low_frequency: EXCL_LOW.map(r => ({ strong: r.strong, from: r.from, to: r.to, nt_total: r.ntTotal, reason: 'NT全体出現数 < 100件' })),
    rom_specific: EXCL_ROM.map(r => ({ strong: r.strong, from: r.from, to: r.to, nt_total: r.ntTotal, reason: r.cond })),
    no_occurrence: EXCL_ZERO.map(r => ({ strong: r.strong, from: r.from, to: r.to, nt_total: r.ntTotal, reason: 'NT全体でtok_jaに0件（ROM限定語彙）' })),
  },
  rom_closure: ag.known_residuals.phase4bi_closure,
};

saveJson(path.join(OUT, 'stage4-phase4bj-nt-pattern-table.json'), output);
console.log('\nWrote: stage4-phase4bj-nt-pattern-table.json');
console.log('\n=== Phase 4bj 完了 ===');
