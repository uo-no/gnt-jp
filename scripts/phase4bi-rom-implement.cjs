'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CLASSIFY_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4bh-rom-classify.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bi — ローマ書 UNREVIEWED 語彙変更 実施 ===\n');

// ═══════════════════════════════════════════════════════
// 偽陽性・実質無変更 除外
// ═══════════════════════════════════════════════════════
const EXCL_STRONGS = new Set(['G2046', 'G4238', 'G264', 'G3107']);

// ═══════════════════════════════════════════════════════
// Phase 4bh 表由来 TABLE_OVERRIDES
// key: `${strong}\t${tok_ja}` → 確定グロス形
// ═══════════════════════════════════════════════════════
const TABLE = new Map([
  ['G782\t挨拶する',     'よろしく'],
  ['G1344\t義と認める',  '義とする'],
  ['G2556\t悪い',        '悪'],
  ['G2937\t創造物',      '被造物'],
  ['G18\t良い',          '善'],
  ['G4459\tどのように',  'どうして'],
  ['G435\t男',           '夫'],
  ['G3123\tむしろ',      'まして'],
  ['G1680\t希望',        '望み'],
  ['G2347\t苦難',        '患難'],
  ['G2089\tまだ',        'なおも'],
  ['G3049\t考える',      '認める'],
  ['G1659\t自由にする',  '解放する'],
  ['G2822\t招かれた',    '召す'],
  ['G4991\t救い',        '救'],
  ['G1342\t義の',        '義人'],
  ['G763\t不敬虔',       '不信心'],
  ['G379\t言い訳できない', '弁解の余地がない'],
  ['G165\t世',           '永遠'],
  ['G5540\t使用',        '関係'],
  ['G3441\tひとり',      'ばかりでなく'],
  ['G2917\t裁き',        'さばき'],
  ['G1391\t栄光',        '光栄'],
  ['G5092\t敬意',        'ほまれ'],
  ['G4412\t第一の',      'はじめ'],
]);

// 活用形残留チェック（8文字以下用）
function hasInflectedForm(s) {
  return /(?:されて|している|された|してい|さえしている|しているの)/.test(s);
}

// ═══════════════════════════════════════════════════════
// グロス形決定
// ═══════════════════════════════════════════════════════
function resolveGloss(strong, tok_ja, candidate) {
  if (EXCL_STRONGS.has(strong)) return { gloss: null, reason: 'EXCL_STRONG' };
  if (!candidate || candidate === tok_ja) return { gloss: null, reason: 'NO_OP' };

  const tableKey = strong + '\t' + tok_ja;
  const tableVal = TABLE.get(tableKey);
  if (tableVal) {
    if (tableVal === tok_ja) return { gloss: null, reason: 'TABLE_NO_OP' };
    return { gloss: tableVal, reason: 'TABLE' };
  }

  // TABLE対象外: length・活用形フィルタ
  const len = [...candidate].length;
  if (hasInflectedForm(candidate)) return { gloss: null, reason: 'SKIP_INFLECTED' };
  if (len > 8) return { gloss: null, reason: 'SKIP_LONG_CAND' };

  return { gloss: candidate, reason: 'CAND_OK' };
}

// ═══════════════════════════════════════════════════════
// データロード・実施計画確定
// ═══════════════════════════════════════════════════════
const classify = loadJson(CLASSIFY_PATH);
const ag = loadJson(AG_PATH);

const preShaAg = sha256file(AG_PATH);
console.log('AG SHA256 (pre):', preShaAg);

const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// 実施計画
const plan = []; // { ref, strong, tok_ja, gloss, reason, chapter }
const skipped = []; // { ref, strong, tok_ja, candidate, reason }

let excl_count = 0;

for (const rec of classify.all_vocab_unreviewed) {
  const { ref, strong, tok_ja, candidate } = rec;
  const { gloss, reason } = resolveGloss(strong, tok_ja, candidate);
  const ch = parseInt(ref.match(/ROM (\d+):/)[1]);

  if (reason === 'EXCL_STRONG') {
    excl_count++;
    continue;
  }
  if (gloss) {
    plan.push({ ref, strong, tok_ja, gloss, reason, chapter: ch });
  } else {
    skipped.push({ ref, strong, tok_ja, candidate: candidate || '', reason });
  }
}

// 状態確認: plan内のtokはすべてUNREVIEWEDであること
let preStateErr = 0;
for (const p of plan) {
  const inv = agMap.get(p.ref);
  if (!inv) { console.error('AG未収録:', p.ref); preStateErr++; }
  else if (inv.state !== 'UNREVIEWED') {
    console.error('状態違反:', p.ref, 'state='+inv.state);
    preStateErr++;
  }
}
if (preStateErr) { console.error('事前検証 FAIL:', preStateErr, '件'); process.exit(1); }

console.log('実施計画:');
console.log('  対象 (EXCL除外後):', classify.all_vocab_unreviewed.length - excl_count, '件');
console.log('  実施:', plan.length, '件');
console.log('  スキップ:', skipped.length, '件');
console.log('    TABLE適用:', plan.filter(p=>p.reason==='TABLE').length, '件');
console.log('    候補直接適用:', plan.filter(p=>p.reason==='CAND_OK').length, '件');
console.log('  スキップ理由別:');
const skipReasons = {};
skipped.forEach(s => { skipReasons[s.reason] = (skipReasons[s.reason]||0)+1; });
Object.entries(skipReasons).forEach(([k,v]) => console.log('    '+k+': '+v));

// ═══════════════════════════════════════════════════════
// bible_data 更新
// ═══════════════════════════════════════════════════════
console.log('\nbible_data 更新中...');

// 章ごとにグループ化
const byChapter = {};
for (const p of plan) {
  if (!byChapter[p.chapter]) byChapter[p.chapter] = [];
  byChapter[p.chapter].push(p);
}

const changelog = {}; // chapter → [{ref, strong, from, to, reason}]
let bibChanged = 0;
const bibChangedChapters = new Set();

for (const [chStr, changes] of Object.entries(byChapter)) {
  const ch = parseInt(chStr);
  const fpath = path.join(BIBLE, 'ROM', ch + '.json');
  const data = loadJson(fpath);
  const refMap = new Map(data.map(t => [t.ref, t]));

  const chLog = [];
  let chChanged = 0;

  for (const p of changes) {
    const tok = refMap.get(p.ref);
    if (!tok) {
      console.error('bible_data未収録:', p.ref);
      continue;
    }
    if (tok.japanese !== p.tok_ja) {
      console.error('bible_data japanese不一致:', p.ref,
        'expect="' + p.tok_ja + '" got="' + tok.japanese + '"');
      continue;
    }

    // 変更実施
    tok.japanese = p.gloss;
    chLog.push({ ref: p.ref, strong: p.strong, from: p.tok_ja, to: p.gloss, reason: p.reason });
    chChanged++;
  }

  if (chChanged > 0) {
    saveJson(fpath, data);
    bibChangedChapters.add(ch);
    bibChanged += chChanged;
  }
  changelog[ch] = chLog;
}

console.log('bible_data 変更完了:', bibChanged, '件', '(', [...bibChangedChapters].length, '章 )');

// ═══════════════════════════════════════════════════════
// AG inventory 更新
// ═══════════════════════════════════════════════════════
console.log('\nAG inventory 更新中...');

let invChanged = 0;
for (const p of plan) {
  const inv = agMap.get(p.ref);
  if (!inv) continue;
  inv.state = 'IMPLEMENTED_AND_VERIFIED';
  inv.note = 'PHASE4BI_ROM_JA1955: ' + p.tok_ja + '→' + p.gloss + ' (' + p.reason + ')';
  invChanged++;
}

// 既知残件メモ追加
if (!ag.known_residuals) ag.known_residuals = {};
ag.known_residuals.phase4bi = {
  date: '2026-11-05',
  source: 'JA1955対応表照合 Phase 4bh',
  rom_vocab_diff_rc: 429,
  rom_vocab_diff_misc: { 未収録: 368, IMPLEMENTED_AND_VERIFIED: 5 },
  rom_skip_long_cand: skipReasons.SKIP_LONG_CAND || 0,
  rom_skip_inflected: skipReasons.SKIP_INFLECTED || 0,
  note: 'RC/未収録/SKIP件は口語訳語彙差が確認されたが今回対象外。SKIP件はグロス形再導出が必要。',
};

// state_summary 更新
const newStateCounts = {};
ag.tokens.forEach(t => { newStateCounts[t.state] = (newStateCounts[t.state]||0)+1; });
ag.state_summary = newStateCounts;
ag.meta.phase = '4bi';
ag.meta.date = '2026-11-05';

saveJson(AG_PATH, ag);
const postShaAg = sha256file(AG_PATH);
console.log('AG inventory 更新完了:', invChanged, '件');
console.log('AG SHA256 (post):', postShaAg);

// 整合性確認
if (invChanged !== bibChanged) {
  console.error('不整合: bible_data変更', bibChanged, '≠ inventory変更', invChanged);
  process.exit(1);
}
console.log('整合性確認: bible_data == inventory (' + bibChanged + '件) ✓');

// ═══════════════════════════════════════════════════════
// 章ごと変更件数
// ═══════════════════════════════════════════════════════
console.log('\n=== 章ごと変更件数 ===');
let total = 0;
for (let c = 1; c <= 16; c++) {
  const n = (changelog[c] || []).length;
  if (n) {
    total += n;
    process.stdout.write('ROM' + c + ':' + n + '  ');
  }
}
console.log('\n合計:', total, '件');

// ═══════════════════════════════════════════════════════
// 代表例
// ═══════════════════════════════════════════════════════
console.log('\n=== 代表例 (上位パターンから) ===');
const repCandidates = plan
  .sort((a,b) => a.chapter - b.chapter)
  .slice(0, 20);
repCandidates.forEach(p => {
  console.log(p.ref + ' [' + p.strong + '] "' + p.tok_ja + '" → "' + p.gloss + '" (' + p.reason + ')');
});

// ═══════════════════════════════════════════════════════
// 最終集計
// ═══════════════════════════════════════════════════════
console.log('\n=== 最終集計 ===');
console.log('UNREVIEWED    :', newStateCounts.UNREVIEWED);
console.log('RETAIN_CONF   :', newStateCounts.RETAIN_CONFIRMED);
console.log('IMPL          :', newStateCounts.IMPLEMENTED_AND_VERIFIED);
console.log('HOLD_DQ       :', newStateCounts.HOLD_DATA_QUALITY);
console.log('HOLD_CTX      :', newStateCounts.HOLD_CONTEXT);

// ═══════════════════════════════════════════════════════
// 章ごと変更ログ保存
// ═══════════════════════════════════════════════════════
const summaryByChap = {};
for (let c = 1; c <= 16; c++) {
  if (changelog[c] && changelog[c].length > 0) {
    summaryByChap[c] = changelog[c];
  }
}

saveJson(path.join(OUT, 'stage4-phase4bi-rom-changelog.json'), {
  meta: { phase: '4bi', date: '2026-11-05', total_changed: bibChanged },
  stats: {
    total_unrev_vocab: classify.all_vocab_unreviewed.length,
    excl_strong: excl_count,
    implemented: plan.length,
    skipped: skipped.length,
    skip_reasons: skipReasons,
    impl_by_method: {
      TABLE: plan.filter(p=>p.reason==='TABLE').length,
      CAND_OK: plan.filter(p=>p.reason==='CAND_OK').length,
    },
    known_residuals: ag.known_residuals.phase4bi,
  },
  by_chapter: summaryByChap,
  skipped: skipped.map(s => ({
    ref: s.ref, strong: s.strong, tok_ja: s.tok_ja,
    candidate: s.candidate, reason: s.reason,
  })),
  pre_sha256_ag: preShaAg,
  post_sha256_ag: postShaAg,
});

console.log('\nWrote: stage4-phase4bi-rom-changelog.json');
