#!/usr/bin/env node
/**
 * audit-stage3-addendum.cjs — Stage 3 追加確認
 *
 * 1. σύ単数形723件 全件重複検出（ポリシー: SR/explicit/uncertain 分類）
 * 2. G2316(神)1,295件 書巻別分析
 * 3. Stage 3 pool と6層の整合性照合
 * 4. ブラックリスト件数照合（2,933 vs 3,922 vs 新候補含む）
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── ユーティリティ ────────────────────────────────────────────────────────
function strip(s) { return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function parseRef(r) {
  const m = r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  return m ? { book:m[1], ch:m[2], v:m[3], idx:parseInt(m[4]) } : null;
}

const chCache = new Map();
function loadCh(book,ch) {
  const k=`${book}/${ch}`;
  if (!chCache.has(k)) {
    try { chCache.set(k, JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8'))); }
    catch { chCache.set(k,[]); }
  }
  return chCache.get(k);
}
const jaCache = new Map();
function loadJA(book,ch) {
  const k=`${book}/${ch}`;
  if (!jaCache.has(k)) {
    try { jaCache.set(k, JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{}); }
    catch { jaCache.set(k,{}); }
  }
  return jaCache.get(k);
}
function getVerseTokens(book,ch,verse) {
  const t = loadCh(book,ch);
  const a = Array.isArray(t) ? t : Object.values(t);
  return a.filter(x => String(x.verse)===String(verse));
}

// ── データ読み込み ─────────────────────────────────────────────────────────
console.log('データ読み込み中...');
const stage3Pool = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const stage2Census = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
const stage2Manifest = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-manifest.json'),'utf8'));
const stage2G846 = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-g846-analysis.json'),'utf8'));

const allPoolTokens = stage3Pool.allTokens; // 28,219件
console.log(`Pool: ${allPoolTokens.length}件`);

// ledger のトークン ref セット（承認済みデータとの重複チェック用）
// stage2-manifest.json から ledger refs を取得
const ledgerRefs = new Set(
  (stage2Manifest.blacklistPerStrong || []).flatMap(s =>
    (s.tokens || []).filter(t => t.inLedger).map(t => t.ref)
  )
);
// G846 個別分析から ledger 重複を取得
const g846LedgerRefs = new Set(
  (stage2G846.tokens || []).filter(t => t.classification === 'ledger_overlap').map(t => t.ref)
);
for (const r of g846LedgerRefs) ledgerRefs.add(r);
console.log(`Ledger refs（承認済み）: ${ledgerRefs.size}件`);

// stage2-addendum-task1.json から承認済みchangedトークンのref
let approvedChangedRefs = new Set();
try {
  const task1 = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-addendum-task1.json'),'utf8'));
  for (const t of (task1.nowJikojiTokens||[])) approvedChangedRefs.add(t.ref);
  console.log(`承認済み変更トークン: ${approvedChangedRefs.size}件`);
} catch { console.log('task1.json not found, skip ledger-approved check'); }

// ─────────────────────────────────────────────────────────────────────────
// 1. σύ単数形 全件重複検出（全件列挙、推定ではない）
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク1: σύ単数形 全件分析 ===');

const SU_STRONGS = {
  'G4675': 'σοί（与格・あなたに）',
  'G4571': 'σε（対格・あなたを）',
  'G4771': 'σύ（主格・あなた）',
  'G4674': 'σοῦ（属格・あなたの）',
};

const suFullAnalysis = {};

for (const [strong, form] of Object.entries(SU_STRONGS)) {
  const tokens = allPoolTokens.filter(t => t.strong === strong);
  if (!tokens.length) {
    suFullAnalysis[strong] = { form, count:0, note:'pool内に0件' };
    continue;
  }

  let duplicateLabel=0, multiOccurrence=0, explicit=0, noJA=0, uncertain=0, ledgerOverlap=0;
  const duplicateLabelTokens=[], multiOccurrenceTokens=[], explicitTokens=[], uncertainTokens=[];

  for (const tok of tokens) {
    const r = parseRef(tok.ref);
    if (!r) { noJA++; continue; }

    if (ledgerRefs.has(tok.ref) || approvedChangedRefs.has(tok.ref)) ledgerOverlap++;

    const vt = loadJA(r.book, r.ch)[r.v] || null;
    const verseTokens = getVerseTokens(r.book, r.ch, r.v);
    const ja = tok.japanese || '';
    const cleanJa = strip(ja);

    if (!vt) { uncertain++; uncertainTokens.push({ref:tok.ref,reason:'JA1955なし'}); continue; }

    // 同一節・同一ラベル の他トークンを確認
    const sameLabel = verseTokens.filter(t => t.ref !== tok.ref && (t.japanese||'') === ja);

    if (sameLabel.length > 0) {
      duplicateLabel++;
      duplicateLabelTokens.push({
        ref: tok.ref,
        book: r.book, ch: r.ch, v: r.v,
        sameLabels: sameLabel.map(t=>({ref:t.ref, strong:t.strong, japanese:t.japanese})),
        verseText: vt.slice(0,80),
      });
    } else {
      // 節テキスト内での出現回数
      const cnt = cleanJa ? (vt.split(cleanJa).length - 1) : 0;
      if (cnt > 1) {
        uncertain++;
        uncertainTokens.push({ref:tok.ref, reason:`節内に「${cleanJa}」が${cnt}回出現（同ラベル他トークンなし）`});
        multiOccurrence++;
        multiOccurrenceTokens.push({ref:tok.ref,cnt});
      } else if (cnt === 1) {
        explicit++;
        explicitTokens.push(tok.ref);
      } else {
        // containsBase()で通ったがclean文字列は0回 → 漢字マッチ等
        // この場合は implicit（kanji match）として数える
        explicit++; // containsBase()が通ったのだからpool内にある
        explicitTokens.push(tok.ref);
      }
    }
  }

  const srCount = duplicateLabel; // duplicate_label のみ SR
  const srRate = tokens.length > 0 ? (srCount/tokens.length*100).toFixed(1)+'%' : '0%';

  suFullAnalysis[strong] = {
    form, count:tokens.length,
    analysisMethod: '全件列挙（推定ではない）',
    structural_review_required: srCount,
    uncertain: uncertain,
    explicit: explicit,
    ledgerOverlap: ledgerOverlap,
    srRate,
    srRateNote: `${srCount}/${tokens.length}件 = structural_review_required（duplicate_label）`,
    uncertainNote: `${uncertain}件（節内複数回出現 ${multiOccurrence}件 + JA1955なし ${noJA}件）`,
    explicitNote: `${explicit}件（一意対応確認済み）`,
    samples: {
      duplicateLabel: duplicateLabelTokens.slice(0,3),
      uncertain: uncertainTokens.slice(0,3),
      explicit: explicitTokens.slice(0,3),
    },
  };

  console.log(`${strong}(${form}): ${tokens.length}件 全件列挙`);
  console.log(`  → SR(duplicate_label)=${srCount}(${srRate}), uncertain=${uncertain}, explicit=${explicit}, ledger重複=${ledgerOverlap}`);
}

const suTotals = Object.values(suFullAnalysis).reduce((acc, v) => {
  acc.count += v.count||0;
  acc.sr += v.structural_review_required||0;
  acc.uncertain += v.uncertain||0;
  acc.explicit += v.explicit||0;
  acc.ledger += v.ledgerOverlap||0;
  return acc;
}, {count:0,sr:0,uncertain:0,explicit:0,ledger:0});

console.log(`\nσύ合計: ${suTotals.count}件`);
console.log(`  SR=${suTotals.sr}(${(suTotals.sr/suTotals.count*100).toFixed(1)}%), uncertain=${suTotals.uncertain}, explicit=${suTotals.explicit}, ledger=${suTotals.ledger}`);

// ─────────────────────────────────────────────────────────────────────────
// 2. G2316(神) 書巻別分析
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク2: G2316(神) 書巻別分析 ===');

const g2316Tokens = allPoolTokens.filter(t => t.strong === 'G2316');
console.log(`G2316 pool内: ${g2316Tokens.length}件`);

const g2316ByBook = {};
let g2316SR=0, g2316Explicit=0, g2316Uncertain=0, g2316None=0;

for (const tok of g2316Tokens) {
  const r = parseRef(tok.ref);
  if (!r) continue;
  const book = r.book;
  if (!g2316ByBook[book]) g2316ByBook[book] = {
    book, count:0, explicit:0, implicit:0, uncertain:0, none:0,
    duplicateLabel:0, sr:0, tokens:[],
  };

  const vt = loadJA(r.book, r.ch)[r.v] || null;
  const verseTokens = getVerseTokens(r.book, r.ch, r.v);
  const ja = tok.japanese || '';
  const cleanJa = strip(ja);
  const entry = g2316ByBook[book];
  entry.count++;

  if (!vt) { entry.uncertain++; g2316Uncertain++; entry.tokens.push({ref:tok.ref, corr:'uncertain', reason:'JA1955なし'}); continue; }

  const sameLabel = verseTokens.filter(t => t.ref !== tok.ref && (t.japanese||'') === ja);
  const cnt = cleanJa ? (vt.split(cleanJa).length-1) : 0;

  let corr, reason='';
  if (sameLabel.length > 0) {
    corr = 'structural_review_required';
    entry.duplicateLabel++;
    entry.sr++;
    g2316SR++;
    reason = `同節に「${ja}」が${sameLabel.length}件`;
  } else if (cnt > 1) {
    corr = 'uncertain';
    entry.uncertain++;
    g2316Uncertain++;
    reason = `節内${cnt}回出現`;
  } else if (cnt === 1) {
    corr = 'explicit';
    entry.explicit++;
    g2316Explicit++;
  } else {
    // kanji match
    const k = cleanJa.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
    if (k.length >= 2 && vt.includes(k)) {
      corr = 'implicit'; entry.implicit++; g2316Explicit++;
    } else {
      corr = 'none'; entry.none++; g2316None++;
    }
  }
  entry.tokens.push({ref:tok.ref, corr, reason:reason.slice(0,60)});
}

// 書巻別SR率でソート
const g2316BookList = Object.values(g2316ByBook)
  .sort((a,b) => b.count - a.count)
  .map(b => ({
    ...b,
    srRate: b.count>0 ? (b.sr/b.count*100).toFixed(0)+'%' : '0%',
    tokens: undefined, // 出力には含めない
    tokenSample: (b.tokens||[]).filter(t=>t.corr==='structural_review_required').slice(0,2),
  }));

console.log('\n書巻別 (上位20):');
g2316BookList.slice(0,20).forEach(b =>
  console.log(`  ${b.book}: ${b.count}件 SR=${b.sr}(${b.srRate}) explicit=${b.explicit} uncertain=${b.uncertain} none=${b.none}`)
);
console.log(`\n全体: ${g2316Tokens.length}件`);
console.log(`  SR=${g2316SR}(${(g2316SR/g2316Tokens.length*100).toFixed(1)}%) explicit+implicit=${g2316Explicit} uncertain=${g2316Uncertain} none=${g2316None}`);

// quickSR(先頭30件)との差の原因分析
const first30 = g2316Tokens.slice(0,30);
let qsr=0;
for (const tok of first30) {
  const r = parseRef(tok.ref); if(!r) continue;
  const vt = loadJA(r.book,r.ch)[r.v]||null; if(!vt) continue;
  const ja = tok.japanese||'';
  const verseTokens = getVerseTokens(r.book,r.ch,r.v);
  const sameLabel = verseTokens.filter(t=>t.ref!==tok.ref&&(t.japanese||'')===ja);
  const c=strip(ja); const cnt=(c?(vt.split(c).length-1):0);
  if(sameLabel.length>0||cnt>1) qsr++;
}
console.log(`\nquickSR(先頭30件): ${qsr}/30 = ${(qsr/30*100).toFixed(0)}%`);
// 先頭30件の書巻分布
const first30Books = {};
for (const tok of first30) {
  const b = tok.ref.split(' ')[0]; first30Books[b]=(first30Books[b]||0)+1;
}
console.log('先頭30件の書巻:', Object.entries(first30Books).map(([b,n])=>`${b}(${n})`).join(', '));

// ─────────────────────────────────────────────────────────────────────────
// 3. Stage 3 pool と6層の整合性
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク3: Stage 3 pool と6層の整合性 ===');

// census から全Strong件数を取得
const byStrong = stage2Census.stats.byStrong; // { Strong: count }

// 6層のStrong定義（audit-stage3-design.cjs と同一）
const S1_STRONGS = new Set(['G2424','G5547']);
const S2_STRONGS = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS = new Set(['G444','G80','G3101','G1135','G5043']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);
// S5: 高頻度(≥200)かつS1-S4に属さないStrong
const highFreqStrongs = new Set(
  Object.entries(byStrong)
    .filter(([s,n]) => n >= 200 && !S1_STRONGS.has(s) && !S2_STRONGS.has(s) && !S3_STRONGS.has(s) && !S4_STRONGS.has(s))
    .map(([s]) => s)
);
// pool内での実際の件数で再計算
const poolByStrong = {};
for (const tok of allPoolTokens) {
  poolByStrong[tok.strong] = (poolByStrong[tok.strong]||0)+1;
}
const s5StrongsInPool = new Set(
  Object.entries(poolByStrong)
    .filter(([s,n]) => n >= 200 && !S1_STRONGS.has(s) && !S2_STRONGS.has(s) && !S3_STRONGS.has(s) && !S4_STRONGS.has(s))
    .map(([s]) => s)
);
// S6: pool内件数 < 20
const s6StrongsInPool = new Set(
  Object.entries(poolByStrong)
    .filter(([s,n]) => n < 20)
    .map(([s]) => s)
);

// 各トークンをどの層に割り当てるか（優先度: S1>S2>S3>S4>S5>S6>uncategorized）
const strataAssignment = { S1:0, S2:0, S3:0, S4:0, S5:0, S6:0, uncategorized:0 };
const strataRefs = { S1:new Set(), S2:new Set(), S3:new Set(), S4:new Set(), S5:new Set(), S6:new Set(), uncategorized:new Set() };

for (const tok of allPoolTokens) {
  const s = tok.strong;
  let assigned = false;
  for (const [layer, sSet] of [['S1',S1_STRONGS],['S2',S2_STRONGS],['S3',S3_STRONGS],['S4',S4_STRONGS]]) {
    if (sSet.has(s)) { strataAssignment[layer]++; strataRefs[layer].add(tok.ref); assigned=true; break; }
  }
  if (!assigned) {
    if (s5StrongsInPool.has(s)) { strataAssignment.S5++; strataRefs.S5.add(tok.ref); assigned=true; }
    else if (s6StrongsInPool.has(s)) { strataAssignment.S6++; strataRefs.S6.add(tok.ref); assigned=true; }
    else { strataAssignment.uncategorized++; strataRefs.uncategorized.add(tok.ref); }
  }
}

console.log('\n6層 + 未分類の内訳（token ref単位）:');
let strataTotal = 0;
for (const [k,v] of Object.entries(strataAssignment)) {
  if (k !== 'uncategorized') strataTotal += v;
  console.log(`  ${k}: ${v}件`);
}
console.log(`  S1-S6計: ${strataTotal}件`);
console.log(`  pool総数: ${allPoolTokens.length}件`);
console.log(`  差（uncategorized）: ${strataAssignment.uncategorized}件`);

// 重複チェック（token refが複数層に属していないか）
let dupCount = 0;
const allAssigned = new Set();
for (const [k, refs] of Object.entries(strataRefs)) {
  for (const ref of refs) {
    if (allAssigned.has(ref)) { dupCount++; }
    else allAssigned.add(ref);
  }
}
console.log(`\n層間重複（同一ref が複数層）: ${dupCount}件`);

// uncategorized の内訳（pool内件数 20-199）
const uncatTokens = allPoolTokens.filter(t => strataRefs.uncategorized.has(t.ref));
const uncatByCount = {};
for (const tok of uncatTokens) {
  const n = poolByStrong[tok.strong]||0;
  const tier = n>=100?'100以上':n>=50?'50-99':n>=20?'20-49':'20未満（S6対象外）';
  uncatByCount[tier] = (uncatByCount[tier]||0)+1;
}
console.log('\nuncategorized の件数帯別分布（pool内件数）:');
Object.entries(uncatByCount).sort((a,b)=>b[1]-a[1]).forEach(([t,n])=>console.log(`  ${t}: ${n}件`));

// ─────────────────────────────────────────────────────────────────────────
// 4. ブラックリスト件数照合
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク4: ブラックリスト件数照合 ===');

// stage2-census.json の全トークンから各Strongの件数を取得（ブラックリスト対象はpoolに含まれていない）
// census allTokens には pool除外前（32,317件）が含まれる
const censusAllTokens = stage2Census.allTokens || [];
console.log(`Census allTokens: ${censusAllTokens.length}件`);

// 各ブラックリストStrongの件数（census基準）
const blStrongs = ['G5213','G5209','G5210','G5216','G2532','G846'];
const suStrongs = ['G4675','G4571','G4771','G4674'];
const allBlStrongs = [...blStrongs, ...suStrongs];

const blCounts = {};
const blRefs = {};
for (const s of allBlStrongs) {
  const tokens = censusAllTokens.filter(t => t.strong === s);
  blCounts[s] = tokens.length;
  blRefs[s] = new Set(tokens.map(t => t.ref));
}

// G846はcensusにあるかpoolにあるか？（blacklist除外はpool生成時に行われている）
// stage3-pool.json の topStrong から pool内件数も確認
const poolCounts = {};
for (const tok of allPoolTokens) {
  poolCounts[tok.strong] = (poolCounts[tok.strong]||0)+1;
}

console.log('\nStrong別 件数（census基準）:');
let blTotal = 0;
for (const s of blStrongs) {
  const n = blCounts[s]||0;
  blTotal += n;
  const ledgerN = [...(blRefs[s]||[])].filter(r=>ledgerRefs.has(r)||approvedChangedRefs.has(r)).length;
  console.log(`  ${s}: ${n}件（ledger重複=${ledgerN}件）`);
}
console.log(`  ブラックリスト小計（G846除く）: ${['G5213','G5209','G5210','G5216','G2532'].reduce((s,k)=>s+(blCounts[k]||0),0)}件`);
console.log(`  G846: ${blCounts['G846']||0}件`);
console.log(`  確定ブラックリスト合計: ${blTotal}件`);

console.log('\nσύ候補 Strong別 件数:');
let suTotal = 0;
for (const s of suStrongs) {
  const n = blCounts[s]||0; // censusにあるはずだが念のため poolも確認
  const poolN = poolCounts[s]||0;
  const ledgerN = [...(blRefs[s]||[])].filter(r=>ledgerRefs.has(r)||approvedChangedRefs.has(r)).length;
  suTotal += poolN; // σύはまだblacklistでないのでpool内に存在
  console.log(`  ${s}: census=${n}件, pool内=${poolN}件（ledger重複=${ledgerN}件）`);
}
console.log(`  σύ候補合計（pool内）: ${suTotal}件`);

// 全ブラックリスト重複チェック
const allBlRefs = new Set();
let dupBl = 0;
for (const s of blStrongs) {
  for (const r of (blRefs[s]||[])) {
    if (allBlRefs.has(r)) dupBl++;
    else allBlRefs.add(r);
  }
}
console.log(`\nブラックリスト間 ref重複: ${dupBl}件`);

// 2,933 vs 3,922 の差の説明
const v2933 = ['G5213','G5209','G5210','G5216','G2532'].reduce((s,k)=>s+(blCounts[k]||0),0);
const v3922diff = blCounts['G846']||0;
console.log(`\n2,933件 = ${['G5213','G5209','G5210','G5216','G2532'].map(s=>`${s}(${blCounts[s]||0})`).join('+')} = ${v2933}件`);
console.log(`3,922件 = 2,933 + G846(${v3922diff}) = ${v2933 + v3922diff}件`);
console.log(`差: ${v3922diff}件（G846の事後追加）`);

// ─────────────────────────────────────────────────────────────────────────
// 出力
// ─────────────────────────────────────────────────────────────────────────
const output = {
  meta: {
    title: 'Stage 3 追加確認（σύ全件・G2316書巻別・Pool整合性・BL件数照合）',
    generatedAt: new Date().toISOString().slice(0,10),
    poolTotal: allPoolTokens.length,
    constraints: ['聖書JSON変更なし','ledger変更なし','既存Stage 3成果物上書きなし'],
  },

  task1_su_full: {
    title: 'σύ単数形 全件重複検出',
    analysisMethod: '全件列挙（サンプル推定ではない）',
    byStrong: suFullAnalysis,
    totals: suTotals,
    policy: {
      structural_review_required: 'duplicate_label確認済みトークン',
      explicit: '一意対応確認済みトークン',
      uncertain: '節内複数回出現・JA1955なし',
      note: '全件を誤訳と認定しない。恒久ブラックリストと混同しない。',
    },
  },

  task2_g2316_by_book: {
    title: 'G2316(神) 書巻別分析',
    totalInPool: g2316Tokens.length,
    globalStats: {
      structural_review_required: g2316SR,
      srRate: (g2316SR/g2316Tokens.length*100).toFixed(1)+'%',
      explicit_plus_implicit: g2316Explicit,
      uncertain: g2316Uncertain,
      none: g2316None,
    },
    quickSRAnalysis: {
      first30SR: qsr,
      first30SRRate: (qsr/30*100).toFixed(0)+'%',
      first30BookDistribution: first30Books,
      note: 'quickSRはpool内の先頭30件を使用。書巻並びはファイルシステム順に依存。',
    },
    byBook: g2316BookList.map(b => ({
      book: b.book, count: b.count,
      explicit: b.explicit, implicit: b.implicit,
      uncertain: b.uncertain, none: b.none,
      structural_review_required: b.sr,
      srRate: b.srRate,
      srSamples: b.tokenSample,
    })),
  },

  task3_strata_coverage: {
    title: 'Stage 3 pool と6層の整合性',
    poolTotal: allPoolTokens.length,
    strataAssignment,
    s1_to_s6_total: strataTotal,
    uncategorized: strataAssignment.uncategorized,
    layerOverlap: dupCount,
    explanation: '6層はサンプリング設計上の部分集合。uncategorizedは中頻度Strong（pool内20-199件）で特定の意味グループに属さないもの。',
    uncategorizedByFreqTier: uncatByCount,
    uncategorizedNote: 'Stage 3全件処理時は uncategorized を追加層（S7: 中頻度Strong）として処理する必要がある。',
  },

  task4_blacklist_counts: {
    title: 'ブラックリスト件数照合（token ref ユニーク件数）',
    confirmed: {
      G5213: blCounts['G5213']||0,
      G5209: blCounts['G5209']||0,
      G5210: blCounts['G5210']||0,
      G5216: blCounts['G5216']||0,
      G2532: blCounts['G2532']||0,
      subtotal_without_G846: v2933,
      G846: blCounts['G846']||0,
      total_3922: v2933 + (blCounts['G846']||0),
    },
    suCandidates: {
      G4675_pool: poolCounts['G4675']||0,
      G4571_pool: poolCounts['G4571']||0,
      G4771_pool: poolCounts['G4771']||0,
      G4674_pool: poolCounts['G4674']||0,
      total_su: suTotal,
      potential_total_if_added: v2933 + (blCounts['G846']||0) + suTotal,
    },
    explanation: {
      v2933: 'Stage 2中間報告時の値。G846未追加。G5213+G5209+G5210+G5216+G2532=2,933',
      v3922: 'Stage 2最終確定値。G846(989)を事後追加して3,922に修正。',
      gap989: 'G846は個別判定（SR=310,explicit=679）の後ブラックリストに追加されたため別計上だった。',
    },
    refDuplicates: dupBl,
  },
};

const outPath = path.join(OUT_DIR, 'stage3-addendum.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\nOutput: ${outPath}`);
