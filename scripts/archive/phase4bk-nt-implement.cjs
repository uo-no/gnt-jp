'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { execSync } = require('child_process');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const CL4BH_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4bh-rom-classify.json');
const CL4BI_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4bi-rom-changelog.json');
const ALIGN_DIR = '/private/tmp/claude-501/-Users-373da/8aaaba66-9b55-4401-81c0-0f799bfed13d/scratchpad/alignment/JA1955';
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, o) { fs.writeFileSync(p, JSON.stringify(o, null, 2), 'utf8'); }
function sha256file(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

console.log('=== Phase 4bk — NT全体 P01〜P08 機械適用 ===\n');

// ═══════════════════════════════════════════════════════════════════
// 1. パターン定義
// ═══════════════════════════════════════════════════════════════════
const P_TABLE = [
  // P01-P05: UNREVIEWED vocab-diff tokens → check JA1955 alignment condition
  { id: 'P01', strong: 'G18',   fromJa: '良い',       toJa: '善',          condWord: ['善'],
    tableUNREV: 42, note: 'ἀγαθός 名詞的用法・善悪対比文脈' },
  { id: 'P02', strong: 'G165',  fromJa: '世',         toJa: '永遠',        condWord: ['永遠'],
    tableUNREV: 36, note: 'αἰών 副詞的用法「永遠に」' },
  { id: 'P03', strong: 'G435',  fromJa: '男',         toJa: '夫',          condWord: ['夫'],
    tableUNREV: 92, note: 'ἀνήρ 婚姻文脈' },
  { id: 'P04', strong: 'G3441', fromJa: 'ひとり',     toJa: 'ばかりでなく', condWord: ['ばかりでなく', 'のみならず'],
    tableUNREV: 82, note: 'μόνος 否定文脈' },
  { id: 'P05', strong: 'G4459', fromJa: 'どのように', toJa: 'どうして',    condWord: ['どうして'],
    tableUNREV: 86, note: 'πῶς JA1955が「どうして」と訳す文脈' },
];

// P06-P08: G848 P-morph → 形態素条件のみ（JA1955不要）
const P_G848 = [
  { id: 'P06', morph: 'P-APM', toJa: '彼ら',     tableBible: 352 },
  { id: 'P07', morph: 'P-ASF', toJa: '彼女',     tableBible: 128 },
  { id: 'P08', morph: 'P-APF', toJa: '彼女たち', tableBible: 11 },
];
const G848_EXCL = new Set(['MRK 9:16!7']); // F-3APM 既知の残件

// ═══════════════════════════════════════════════════════════════════
// 2. データ読み込み
// ═══════════════════════════════════════════════════════════════════
console.log('データ読み込み中...');
const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));
const cl4bh = loadJson(CL4BH_PATH);
const cl4bi = loadJson(CL4BI_PATH);

// Phase 4bh all_vocab_unreviewed: ref → candidate (for reference record)
const ph4bhCandMap = new Map();
cl4bh.all_vocab_unreviewed.forEach(r => ph4bhCandMap.set(r.ref, r.candidate));

// Phase 4bi TABLE changelog: ref → {from, to} (for reference record)
const ph4biTableMap = new Map();
Object.values(cl4bi.by_chapter).flat().filter(r=>r.reason==='TABLE').forEach(r => {
  ph4biTableMap.set(r.ref, { from: r.from, to: r.to });
});

const preShaAg = sha256file(AG_PATH);
console.log('AG SHA256 (pre):', preShaAg);

// ═══════════════════════════════════════════════════════════════════
// 3. アライメント表読み込み・lookup構築
// ═══════════════════════════════════════════════════════════════════
console.log('アライメント表読み込み中...');
// lookup: `${book}:${ch}:${verse}` → [{t, tokens}]
const alignLookup = new Map();
let alignFilesLoaded = 0;

const books = fs.readdirSync(BIBLE).filter(f => !f.includes('.'));
for (const book of books.sort()) {
  const alignBookDir = path.join(ALIGN_DIR, book);
  if (!fs.existsSync(alignBookDir)) continue;
  const chFiles = fs.readdirSync(alignBookDir).filter(f => f.endsWith('.json'));
  for (const chFile of chFiles) {
    try {
      const align = loadJson(path.join(alignBookDir, chFile));
      const ch = parseInt(chFile);
      for (const [verse, vData] of Object.entries(align.verses || {})) {
        const key = `${book}:${ch}:${verse}`;
        alignLookup.set(key, vData.segments || []);
      }
      alignFilesLoaded++;
    } catch(e) { /* skip bad files */ }
  }
}
console.log('アライメントファイル読み込み:', alignFilesLoaded, '件');

// ref → segment text(s)
function findSegments(ref, tokenIdx) {
  // ref format: "MAT 5:7!3" → book=MAT, ch=5, verse=7, tokenIdx=3
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  if (!m) return [];
  const [, book, ch, verse, posStr] = m;
  const key = `${book}:${ch}:${verse}`;
  const segs = alignLookup.get(key) || [];
  const pos = parseInt(posStr);
  return segs.filter(s => Array.isArray(s.tokens) && s.tokens.includes(pos));
}

function checkCondition(ref, tokenIdx, condWords) {
  const segs = findSegments(ref, tokenIdx);
  if (segs.length === 0) return { pass: false, reason: 'NO_SEGMENT', segText: null };
  for (const seg of segs) {
    const t = seg.t || '';
    for (const w of condWords) {
      if (t.includes(w)) return { pass: true, reason: 'COND_MET', segText: t, isSingle: seg.tokens.length === 1 };
    }
  }
  const firstSeg = segs[0].t || '';
  return { pass: false, reason: 'COND_FAIL', segText: firstSeg };
}

// ═══════════════════════════════════════════════════════════════════
// 4. NT全体 bible_data 走査 → 変更計画
// ═══════════════════════════════════════════════════════════════════
console.log('NT bible_data 走査中...');

// パターン別変更計画: ref → {patternId, strong, fromJa, toJa, reason, segText, curState}
const changePlan = new Map(); // ref → change record
const skipLog = []; // { ref, patternId, reason, segText }

// 変更不要フラグ: 既存IMPL / RC は変更しない（P01-P05の場合）
// G848: HOLD_DQ → IMPLEMENTED, scope-outside → 新規追加

// P01-P05: bible_data走査でUNREVIEWED × (strong, japanese) を探し条件チェック
const tablePatternMap = new Map(P_TABLE.map(p => [p.strong + '\t' + p.fromJa, p]));

// G848: P-morph × japanese="自分" を探す
const g848MorphMap = new Map(P_G848.map(p => [p.morph, p]));

for (const book of books.sort()) {
  const bookDir = path.join(BIBLE, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  for (const chFile of fs.readdirSync(bookDir).filter(f => f.endsWith('.json'))) {
    const data = loadJson(path.join(bookDir, chFile));
    for (const tok of data) {
      if (!tok.ref) continue;
      const strong = tok.strong || '';
      const japanese = tok.japanese || '';
      const morph = tok.morph || '';
      const ref = tok.ref;
      const curInv = agMap.get(ref);
      const curState = curInv ? curInv.state : 'OUT_OF_SCOPE';

      // P01-P05: UNREVIEWED only
      const tKey = strong + '\t' + japanese;
      if (tablePatternMap.has(tKey) && curState === 'UNREVIEWED') {
        const pat = tablePatternMap.get(tKey);
        const { pass, reason, segText, isSingle } = checkCondition(ref, parseInt(tok.tokenIndex), pat.condWord);
        if (pass) {
          changePlan.set(ref, {
            patternId: pat.id, strong, fromJa: japanese, toJa: pat.toJa,
            reason: reason + (isSingle ? '_SINGLE' : '_MULTI'),
            segText, curState, isNew: false,
          });
        } else {
          skipLog.push({ ref, patternId: pat.id, reason, segText });
        }
      }

      // P06-P08: G848 P-APM/P-ASF/P-APF + japanese="自分"
      if (strong === 'G848' && g848MorphMap.has(morph) && japanese === '自分' && !G848_EXCL.has(ref)) {
        const pat = g848MorphMap.get(morph);
        const isNew = curState === 'OUT_OF_SCOPE'; // not in inventory
        changePlan.set(ref, {
          patternId: pat.id, strong, morph, fromJa: '自分', toJa: pat.toJa,
          reason: 'G848_PMORPH',
          segText: null, curState, isNew,
          bookForNew: book, // for new inventory entry
          tok_data: isNew ? { ref, strong, group: 'F' } : null,
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// 5. 変更計画確認
// ═══════════════════════════════════════════════════════════════════
const patSummary = {};
for (const r of changePlan.values()) {
  if (!patSummary[r.patternId]) patSummary[r.patternId] = { applied: 0, new: 0, single: 0, multi: 0 };
  patSummary[r.patternId].applied++;
  if (r.isNew) patSummary[r.patternId].new++;
  if (r.reason && r.reason.includes('SINGLE')) patSummary[r.patternId].single++;
  if (r.reason && r.reason.includes('MULTI')) patSummary[r.patternId].multi++;
}

console.log('\n変更計画:');
console.log('パターン | 表の件数 | 実施件数 | 差 | 新規収録 | SINGLE | MULTI');
console.log('-'.repeat(70));
for (const p of P_TABLE) {
  const s = patSummary[p.id] || { applied: 0 };
  const diff = p.tableUNREV - s.applied;
  console.log(p.id + '  ' + String(p.tableUNREV).padStart(8) + '  ' + String(s.applied).padStart(8) +
    '  ' + String(diff).padStart(3) + (diff !== 0 ? ' ←差あり' : '') +
    '  ' + String(s.new||0).padStart(8) + '  ' + String(s.single||0).padStart(6) + '  ' + String(s.multi||0).padStart(5));
}
for (const p of P_G848) {
  const s = patSummary[p.id] || { applied: 0, new: 0 };
  const diff = p.tableBible - s.applied;
  console.log(p.id + '  ' + String(p.tableBible).padStart(8) + '  ' + String(s.applied).padStart(8) +
    '  ' + String(diff).padStart(3) + (diff !== 0 ? ' ←差あり（G848_EXCL除外）' : '') +
    '  ' + String(s.new||0).padStart(8));
}
console.log('\n総変更件数:', changePlan.size);
console.log('スキップ:', skipLog.length, '件');

// スキップ理由別
const skipByReason = {};
skipLog.forEach(s => { skipByReason[s.reason] = (skipByReason[s.reason]||0)+1; });
console.log('スキップ理由別:', JSON.stringify(skipByReason));

// ═══════════════════════════════════════════════════════════════════
// 6. bible_data 更新
// ═══════════════════════════════════════════════════════════════════
console.log('\nbible_data 更新中...');

// book/ch → [changes] グループ化
const byBookCh = {};
for (const [ref, r] of changePlan) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  if (!m) continue;
  const [, book, ch] = m;
  const k = `${book}/${ch}`;
  if (!byBookCh[k]) byBookCh[k] = [];
  byBookCh[k].push({ ref, ...r });
}

let bibChanged = 0;
const changelog = {}; // bookCh → [{ref, from, to, reason, segText}]

for (const [bookCh, changes] of Object.entries(byBookCh)) {
  const [book, ch] = bookCh.split('/');
  const fpath = path.join(BIBLE, book, ch + '.json');
  const data = loadJson(fpath);
  const refMap = new Map(data.map(t => [t.ref, t]));

  const chLog = [];
  let chChanged = 0;
  for (const r of changes) {
    const tok = refMap.get(r.ref);
    if (!tok) { console.error('bible_data未収録:', r.ref); continue; }
    if (tok.japanese !== r.fromJa) {
      console.error('japanese不一致:', r.ref, 'expect="' + r.fromJa + '" got="' + tok.japanese + '"');
      continue;
    }
    tok.japanese = r.toJa;
    chLog.push({ ref: r.ref, strong: r.strong, from: r.fromJa, to: r.toJa, reason: r.reason, segText: r.segText || '' });
    chChanged++;
  }
  if (chChanged > 0) saveJson(fpath, data);
  bibChanged += chChanged;
  if (chLog.length) changelog[bookCh] = chLog;
}
console.log('bible_data 変更完了:', bibChanged, '件');

// ═══════════════════════════════════════════════════════════════════
// 7. AG inventory 更新
// ═══════════════════════════════════════════════════════════════════
console.log('\nAG inventory 更新中...');

let invChanged = 0, invNew = 0;
const newEntries = [];

for (const [ref, r] of changePlan) {
  if (r.isNew) {
    // 55件の未収録G848トークン → 新規追加
    const newEntry = {
      ref,
      strong: 'G848',
      group: 'F',
      state: 'IMPLEMENTED_AND_VERIFIED',
      note: `PHASE4BK_G848_PMORPH: 自分→${r.toJa} (morph ${r.morph}) inventory未収録だったG848 P-morph人称代名詞トークン`,
    };
    ag.tokens.push(newEntry);
    agMap.set(ref, newEntry);
    newEntries.push({ ref, morph: r.morph, toJa: r.toJa });
    invNew++;
  } else {
    const inv = agMap.get(ref);
    if (!inv) { console.error('inventory未収録(想定外):', ref); continue; }
    const prevState = inv.state;
    inv.state = 'IMPLEMENTED_AND_VERIFIED';
    inv.note = `PHASE4BK_${r.patternId}: ${r.fromJa}→${r.toJa}` +
      (r.segText ? ` (seg: "${r.segText}")` : '') +
      (prevState !== 'UNREVIEWED' ? ` [prev:${prevState}]` : '');
    invChanged++;
  }
}

// state_summary 更新
const newCounts = {};
ag.tokens.forEach(t => { newCounts[t.state] = (newCounts[t.state]||0)+1; });
ag.state_summary = newCounts;
ag.meta.phase = '4bk';
ag.meta.date = '2026-11-05';

console.log('inventory 更新:', invChanged, '件  新規追加:', invNew, '件');

// ═══════════════════════════════════════════════════════════════════
// 8. Phase 4bi 参考記録（個別候補 ≠ 適用グロス形 トークン一覧）
// ═══════════════════════════════════════════════════════════════════
const ph4bi_cand_diff = [];
for (const [ref, tableData] of ph4biTableMap) {
  const candidate = ph4bhCandMap.get(ref);
  if (candidate !== undefined && candidate !== tableData.to) {
    ph4bi_cand_diff.push({
      ref,
      strong: tableData.from.length < 10 ? cl4bh.all_vocab_unreviewed.find(r=>r.ref===ref)?.strong || '' : '',
      from: tableData.from,
      candidate,
      applied: tableData.to,
      note: 'TABLE適用により候補値を上書き（再実施なし）',
    });
  }
}
// strongを補完
ph4bi_cand_diff.forEach(r => {
  if (!r.strong) {
    const ph4bhEntry = cl4bh.all_vocab_unreviewed.find(e=>e.ref===r.ref);
    if (ph4bhEntry) r.strong = ph4bhEntry.strong;
  }
});

saveJson(path.join(OUT, 'stage4-phase4bi-cand-vs-gloss-ref.json'), {
  meta: { phase: '4bi-reference', date: '2026-11-05', note: '参考記録のみ。再実施はしない。' },
  description: 'Phase 4biのTABLE適用において、自動グロス形候補（candidate）とは異なる値が適用されたトークン一覧',
  total: ph4bi_cand_diff.length,
  items: ph4bi_cand_diff,
});
console.log('\nPhase 4bi 参考記録: candidate≠applied 件数 =', ph4bi_cand_diff.length, '件');

// ═══════════════════════════════════════════════════════════════════
// 9. known_residuals 更新 — [D] Phase 4bh SKIP 446件 vs v2 SKIP 446件 の説明
// ═══════════════════════════════════════════════════════════════════
if (!ag.known_residuals) ag.known_residuals = {};

// phase4bi_closure の [D] 説明を更新・正確化
ag.known_residuals.phase4bh_vs_v2_skip_clarification = {
  date: '2026-11-05',
  question: 'Phase 4bh SKIP 446件 と CAND_OK差し戻し マルチトークン446件 は同一か？',
  answer: '異なるセット（二重記載ではない）',
  set_A: {
    label: 'Phase 4bh SKIP_MULTI_TOKEN_SEG 446件',
    source: 'Phase 4bh classify script',
    description: 'Phase 4bh分類段階でスキップ。all_vocab_unreviewedに含まれていない。',
    scope: 'ROM語彙相違検出時にskipされたトークン（JA1955セグメントが複数トークンを包含するもの）',
  },
  set_B: {
    label: 'Phase 4bi-v2 SKIP_MULTI_TOKEN_SEG 446件',
    source: 'Phase 4bi-v2 script（993件プールから）',
    description: 'v2が993件プール（all_vocab_unreviewed内）を処理中に検出。',
    scope: 'all_vocab_unreviewed内のトークンで、v2のアライメント確認でシングルトークン条件を満たさなかったもの',
  },
  conclusion: 'Set_Aはall_vocab_unreviewedの外側、Set_Bはその内側。重複なし。ROM語彙相違SKIP合計=446+446=892件（マルチトークンセグメントに起因）',
};

// phase4bk 既知残件
ag.known_residuals.phase4bk = {
  date: '2026-11-05',
  source: 'Phase 4bk NT全体適用',
  p01_to_p05_skip: skipLog.length,
  p01_to_p05_skip_by_reason: skipByReason,
  p01_to_p05_skip_detail: 'JA1955セグメントが条件語を含まない（適用条件不一致）またはアライメント未整備',
  g848_excl_mrk_9_16_7: 'MRK 9:16!7 F-3APM 既知の残件（morph=F-3APM、P-morph集計から除外済み）',
};

saveJson(AG_PATH, ag);
const postShaAg = sha256file(AG_PATH);
console.log('AG SHA256 (post):', postShaAg);

if (bibChanged !== invChanged + invNew) {
  console.error('不整合: bible_data', bibChanged, '≠ inventory', invChanged + invNew);
  process.exit(1);
}
console.log('整合性確認:', bibChanged, '件 ✓');

// ═══════════════════════════════════════════════════════════════════
// 10. サマリー出力
// ═══════════════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(70));
console.log('Phase 4bk 適用結果サマリー');
console.log('='.repeat(70));

console.log('\nパターン別 表の件数 vs 実際の適用件数:');
console.log('Pat | 表(UNREV) | 適用 | 差 | 理由');
console.log('-'.repeat(70));
for (const p of P_TABLE) {
  const s = patSummary[p.id] || { applied: 0 };
  const diff = p.tableUNREV - s.applied;
  let reason = '';
  if (diff > 0) {
    const mySkips = skipLog.filter(sk => sk.patternId === p.id);
    const reasonDist = {};
    mySkips.forEach(sk => reasonDist[sk.reason] = (reasonDist[sk.reason]||0)+1);
    reason = JSON.stringify(reasonDist);
  }
  console.log(p.id + '  ' + String(p.tableUNREV).padStart(9) + '  ' + String(s.applied).padStart(5) +
    '  ' + String(diff).padStart(3) + '  ' + (diff > 0 ? reason : '表と一致'));
}
for (const p of P_G848) {
  const s = patSummary[p.id] || { applied: 0, new: 0 };
  const diff = p.tableBible - s.applied;
  let reason = diff > 0 ? `G848_EXCL(MRK 9:16!7)除外: ${diff}件` : '';
  console.log(p.id + '  bible:' + String(p.tableBible).padStart(5) + '  ' + String(s.applied).padStart(5) +
    '  ' + String(diff).padStart(3) + '  ' + (s.new ? `うち新規収録:${s.new}件 ` : '') + reason);
}

console.log('\n台帳状態:');
console.log('  UNREVIEWED     :', newCounts.UNREVIEWED);
console.log('  RETAIN_CONF    :', newCounts.RETAIN_CONFIRMED);
console.log('  IMPL           :', newCounts.IMPLEMENTED_AND_VERIFIED);
console.log('  HOLD_DQ        :', newCounts.HOLD_DATA_QUALITY);
console.log('  HOLD_CTX       :', newCounts.HOLD_CONTEXT);
console.log('  Total          :', ag.tokens.length);

// ═══════════════════════════════════════════════════════════════════
// 11. 変更ログ保存
// ═══════════════════════════════════════════════════════════════════
saveJson(path.join(OUT, 'stage4-phase4bk-nt-changelog.json'), {
  meta: { phase: '4bk', date: '2026-11-05', total_changed: bibChanged },
  pattern_summary: Object.fromEntries(
    [...P_TABLE, ...P_G848].map(p => {
      const s = patSummary[p.id] || { applied: 0, new: 0, single: 0, multi: 0 };
      const tableCount = p.tableUNREV !== undefined ? p.tableUNREV : p.tableBible;
      return [p.id, { tableCount, applied: s.applied, diff: tableCount - s.applied, new: s.new||0 }];
    })
  ),
  by_book_chapter: changelog,
  skipped: skipLog,
  new_inventory_entries: newEntries,
  pre_sha256_ag: preShaAg,
  post_sha256_ag: postShaAg,
});
console.log('\nWrote: stage4-phase4bk-nt-changelog.json');
console.log('Wrote: stage4-phase4bi-cand-vs-gloss-ref.json');
console.log('\nNext: npm run build:search-index');
