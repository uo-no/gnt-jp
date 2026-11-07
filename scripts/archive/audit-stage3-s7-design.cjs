#!/usr/bin/env node
/**
 * audit-stage3-s7-design.cjs — Stage 3 S7設計・数値整合性確認
 *
 * 1. 17件不一致の原因特定（S6定義差の診断）
 * 2. S7（中頻度Strong 13,103件）の機能別層設計
 * 3. G2316 書巻別監査設計（3群分類）
 * 4. ブラックリスト管理整理
 * 5. S1-S7 等式検証
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── データ読み込み ─────────────────────────────────────────────────────────
console.log('データ読み込み中...');
const stage3Pool     = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const stage2Census   = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
const stage3Addendum = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-addendum.json'),'utf8'));

const allPoolTokens = stage3Pool.allTokens;
console.log(`Pool: ${allPoolTokens.length}件`);

const censusCount = stage2Census.stats.byStrong || {};
const poolByStrong = {};
for (const tok of allPoolTokens) {
  poolByStrong[tok.strong] = (poolByStrong[tok.strong]||0)+1;
}
const censusCountFn = s => censusCount[s]||0;

// ─────────────────────────────────────────────────────────────────────────
// 固定層定義（S1-S5）
// ─────────────────────────────────────────────────────────────────────────
const S1_STRONGS = new Set(['G2424','G5547']);
const S2_STRONGS = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS = new Set(['G444','G80','G3101','G1135','G5043']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);
const S5_STRONGS = new Set(
  Object.entries(poolByStrong)
    .filter(([s,n]) => n >= 200 && !S1_STRONGS.has(s) && !S2_STRONGS.has(s)
                    && !S3_STRONGS.has(s) && !S4_STRONGS.has(s))
    .map(([s]) => s)
);
const definedStrongs = new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS,...S5_STRONGS]);

const S6_STRONGS = new Set(
  Object.entries(poolByStrong)
    .filter(([s,n]) => n < 20 && !definedStrongs.has(s))
    .map(([s]) => s)
);

// ─────────────────────────────────────────────────────────────────────────
// タスク4: 17件不一致の原因診断
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク4: 17件不一致の診断 ===');

// design.cjs での S6 pool = allPoolTokens.filter(t => census_count(t.strong) < 20)
// ──S1-S5 を除外せずに計算
let designS6raw = 0; // S1-S5 除外なし・census基準
let designS6excl = 0; // S1-S5 除外あり・census基準
let addendumS6count = 0; // S1-S5 除外あり・pool基準

for (const tok of allPoolTokens) {
  if (censusCountFn(tok.strong) < 20) designS6raw++;
  if (!definedStrongs.has(tok.strong) && censusCountFn(tok.strong) < 20) designS6excl++;
  if (S6_STRONGS.has(tok.strong)) addendumS6count++;
}

console.log(`design.cjs 再現（census<20, S1-S5除外なし）: ${designS6raw}件`);
console.log(`design.cjs 再現（census<20, S1-S5除外あり）: ${designS6excl}件`);
console.log(`addendum.cjs（pool<20, S1-S5除外あり）: ${addendumS6count}件`);

// S3 Strong の census vs pool 件数確認（S3が census<20 なら二重計上が発生）
console.log('\nS3 Strongs の census vs pool 件数:');
for (const s of S3_STRONGS) {
  const c = censusCountFn(s);
  const p = poolByStrong[s]||0;
  const flag = c < 20 ? ' ← census<20（design.cjs で S6 と重複）' : '';
  console.log(`  ${s}: census=${c}, pool=${p}${flag}`);
}

// S1-S4 Strong の census も確認
console.log('S1-S4 Strongs の census （参考）:');
for (const sset of [['S1',S1_STRONGS],['S2',S2_STRONGS],['S4',S4_STRONGS]]) {
  for (const s of sset[1]) {
    const c = censusCountFn(s);
    if (c < 20) console.log(`  ${sset[0]} ${s}: census=${c} ← census<20`);
  }
}

// design.cjs の S6 pool は「S1-S5 除外なし」で計算されていた
// S3 Strongs のうち census<20 のものが S6 pool に混入したかを確認
const s3CensusLt20 = [...S3_STRONGS].filter(s => censusCountFn(s) < 20);
const s3CensusLt20Tokens = allPoolTokens.filter(t => s3CensusLt20.includes(t.strong));
console.log(`\nS3 Strong で census<20: ${s3CensusLt20.length}種 → ${s3CensusLt20Tokens.length}件がdesign.cjs S6にも混入`);
s3CensusLt20.forEach(s => console.log(`  ${s}: census=${censusCountFn(s)}, pool=${poolByStrong[s]||0}`));

// 初回報告の数値との照合
// 初回: S1=1423,S2=3065,S3=1338,S4=723,S5=1843,S6=6741 合計=15133
// 今回: S1=1423,S2=3065,S3=1338,S4=723,S5=1843,S6=6724 合計=15116
// 差: S6で17件
console.log('\n数値照合:');
console.log('初回報告 (design.cjs): S6=6741, 合計=15133');
console.log(`今回確定 (pool基準): S6=${addendumS6count}, 合計=${1423+3065+1338+723+1843+addendumS6count}`);
console.log(`差: S6で${6741-addendumS6count}件`);

// ─────────────────────────────────────────────────────────────────────────
// タスク2: S7 設計（未分類 13,103件の機能別分類）
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク2: S7 設計 ===');

const uncatTokens = allPoolTokens.filter(t =>
  !definedStrongs.has(t.strong) && !S6_STRONGS.has(t.strong)
);
console.log(`S7 対象（uncategorized）: ${uncatTokens.length}件`);

// wordClass の実際の値を確認
const wclassValues = new Set(uncatTokens.map(t => t.wordClass||'').filter(Boolean));
console.log('wordClass の実際の値:', [...wclassValues].sort().join(', '));

// 品詞別集計（小文字正規化）
const wcSummary = {};
for (const tok of uncatTokens) {
  const wc = (tok.wordClass||'other').toLowerCase();
  if (!wcSummary[wc]) wcSummary[wc]={count:0, strongs:new Set()};
  wcSummary[wc].count++;
  wcSummary[wc].strongs.add(tok.strong);
}
console.log('\n品詞別（小文字正規化後）:');
Object.entries(wcSummary).sort((a,b)=>b[1].count-a[1].count).forEach(([wc,v])=>
  console.log(`  ${wc}: ${v.strongs.size}種, ${v.count}件`)
);

// S7 サブ層定義（小文字正規化で一致）
const S7_SUB = {
  S7a: {
    label: '機能語（前置詞・接続詞・小辞・副詞・条件詞）',
    wclasses: new Set(['prep','conj','conj.','conj-coord','conj-subord','adv','adverb','particle','part','cond','interj','interjection']),
    riskNote: '基本的に JA1955 との対応は安定しているが、接続詞は G2532 と同様のリスクあり。',
    sampleRate: 0.03,
  },
  S7b: {
    label: '動詞',
    wclasses: new Set(['verb']),
    riskNote: '語義の多様性大。活用形が多岐（現在・過去・完了・受動等）。文脈依存性高。',
    sampleRate: 0.05,
  },
  S7c: {
    label: '名詞（固有名詞含む・S1-S3外）',
    wclasses: new Set(['noun']),
    riskNote: '固有名詞は信頼度高。抽象名詞・多義語は要注意。節内複数出現の可能性あり。',
    sampleRate: 0.04,
  },
  S7d: {
    label: '形容詞・代名詞',
    wclasses: new Set(['adj','adjective','pronoun','pron','pronoun_relative','pronoun_demonstrative','pronoun_indefinite','pronoun_interrogative']),
    riskNote: '指示代名詞は αὐτός・σύ と類似リスク。形容詞は修飾名詞との対応で節内重複あり。',
    sampleRate: 0.05,
  },
  S7e: {
    label: 'その他・未分類（ヘブライ語・アラム語借用語等）',
    wclasses: new Set(['other','unknown','hebrew','aramaic','undefined','','aramaic_loanword','hebrew_loanword']),
    riskNote: '固有名詞・専門語・外来語を含む。個別検討が必要。',
    sampleRate: 0.10,
  },
};

// 各 S7 サブ層にトークンを割り当て
const s7Assignment = { S7a:[], S7b:[], S7c:[], S7d:[], S7e:[] };
for (const tok of uncatTokens) {
  const wc = (tok.wordClass||'other').toLowerCase().trim();
  let assigned = false;
  for (const [sub, def] of Object.entries(S7_SUB)) {
    if (def.wclasses.has(wc)) {
      s7Assignment[sub].push(tok); assigned=true; break;
    }
  }
  if (!assigned) s7Assignment.S7e.push(tok); // fallback
}

console.log('\nS7 サブ層割り当て:');
for (const [sub, tokens] of Object.entries(s7Assignment)) {
  const strongSet = new Set(tokens.map(t=>t.strong));
  const sampleN = Math.ceil(tokens.length * S7_SUB[sub].sampleRate);
  console.log(`  ${sub}(${S7_SUB[sub].label}): ${strongSet.size}種, ${tokens.length}件, 推奨サンプル=${sampleN}件`);
}

// 書巻別偏り（S7 全体）
const s7ByBook = {};
for (const tok of uncatTokens) {
  const bk = tok.ref.split(' ')[0];
  s7ByBook[bk] = (s7ByBook[bk]||0)+1;
}
const s7BookTop = Object.entries(s7ByBook).sort((a,b)=>b[1]-a[1]).slice(0,10);
console.log('\nS7 書巻別上位10:');
s7BookTop.forEach(([b,n])=>console.log(`  ${b}: ${n}件`));

// ─────────────────────────────────────────────────────────────────────────
// S1-S7 最終整合性確認
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== S1-S7 整合性確認（token ref単位）===');

const layerCount = { S1:0,S2:0,S3:0,S4:0,S5:0,S6:0,S7a:0,S7b:0,S7c:0,S7d:0,S7e:0 };
const refSeen = new Set();
let dupCheck = 0;

function assignLayer(tok) {
  const s = tok.strong;
  if (S1_STRONGS.has(s)) return 'S1';
  if (S2_STRONGS.has(s)) return 'S2';
  if (S3_STRONGS.has(s)) return 'S3';
  if (S4_STRONGS.has(s)) return 'S4';
  if (S5_STRONGS.has(s)) return 'S5';
  if (S6_STRONGS.has(s)) return 'S6';
  const wc = (tok.wordClass||'other').toLowerCase().trim();
  for (const [sub, def] of Object.entries(S7_SUB)) {
    if (def.wclasses.has(wc)) return sub;
  }
  return 'S7e';
}

for (const tok of allPoolTokens) {
  const layer = assignLayer(tok);
  layerCount[layer]++;
  if (refSeen.has(tok.ref)) dupCheck++;
  else refSeen.add(tok.ref);
}

const total = Object.values(layerCount).reduce((s,v)=>s+v,0);
console.log('最終割り当て（全28,219件）:');
for (const [l,n] of Object.entries(layerCount)) {
  console.log(`  ${l}: ${n}件`);
}
const s7total = Object.entries(layerCount).filter(([k])=>k.startsWith('S7')).reduce((s,[,n])=>s+n,0);
const s1to6total = Object.entries(layerCount).filter(([k])=>!k.startsWith('S7')).reduce((s,[,n])=>s+n,0);
console.log(`  S1-S6 計: ${s1to6total}件`);
console.log(`  S7 計: ${s7total}件`);
console.log(`  合計: ${total}件 ${total===allPoolTokens.length?'✓ MATCH':'✗ MISMATCH'}`);
console.log(`  層間重複（同一ref）: ${dupCheck}件`);

// ─────────────────────────────────────────────────────────────────────────
// タスク3: G2316 書巻別監査設計
// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== タスク3: G2316 書巻別監査設計 ===');

const g2316ByBook = stage3Addendum.task2_g2316_by_book.byBook;

// 3群分類: SR率 + 件数 + explicit率を考慮
// 第1群（優先個別監査）: SR率 ≥ 30% かつ 件数 ≥ 10
// 第3群（自動照合利用可）: SR率 < 10% かつ explicit率 ≥ 85% かつ 件数 ≥ 5
// 第2群: その他
const grp = { g1:[], g2:[], g3:[] };
for (const bk of g2316ByBook) {
  const srRate = parseInt(bk.srRate);
  const explicitRate = bk.count > 0 ? ((bk.explicit||0) / bk.count) * 100 : 0;
  if (srRate >= 30 && bk.count >= 10) grp.g1.push(bk);
  else if (srRate < 10 && explicitRate >= 85 && bk.count >= 5) grp.g3.push(bk);
  else grp.g2.push(bk);
}

// 各群の合計
['g1','g2','g3'].forEach(g => {
  const label = g==='g1'?'優先個別監査':g==='g2'?'通常監査':'自動照合利用可';
  const total = grp[g].reduce((s,b)=>s+b.count,0);
  console.log(`\n第${g==='g1'?1:g==='g2'?2:3}群（${label}）: ${grp[g].length}書巻, 計${total}件`);
  grp[g].sort((a,b)=>parseInt(b.srRate)-parseInt(a.srRate)||b.count-a.count)
    .forEach(b=>console.log(`  ${b.book}: ${b.count}件 SR=${b.srRate} explicit=${b.explicit||0} uncertain=${b.uncertain||0}`));
});
const g2316total = g2316ByBook.reduce((s,b)=>s+b.count,0);
console.log(`\n分類確認: ${grp.g1.length+grp.g2.length+grp.g3.length}書巻 / 計${g2316total}件`);

// ─────────────────────────────────────────────────────────────────────────
// 出力
// ─────────────────────────────────────────────────────────────────────────

// S7 サブ層の出力用データ（tokens 配列は除く）
const s7SubOutput = {};
for (const [sub, tokens] of Object.entries(s7Assignment)) {
  const strongSet = new Set(tokens.map(t=>t.strong));
  const wcBreakdown = {};
  for (const t of tokens) { const wc=(t.wordClass||'other').toLowerCase(); wcBreakdown[wc]=(wcBreakdown[wc]||0)+1; }
  const bookBreakdown = {};
  for (const t of tokens) { const bk=t.ref.split(' ')[0]; bookBreakdown[bk]=(bookBreakdown[bk]||0)+1; }
  s7SubOutput[sub] = {
    label: S7_SUB[sub].label,
    strongCount: strongSet.size,
    tokenCount: tokens.length,
    sampleTarget: Math.ceil(tokens.length * S7_SUB[sub].sampleRate),
    sampleRate: (S7_SUB[sub].sampleRate*100).toFixed(0)+'%',
    riskNote: S7_SUB[sub].riskNote,
    sampleMethod: '書巻分散・Strong分散を考慮した層化抽出。同一Strong内は書巻を分散。',
    progressCriteria: `初回サンプル${Math.ceil(tokens.length * S7_SUB[sub].sampleRate)}件でSR率≤25%かつnone=0を確認後、全件集計に進む判断。`,
    wordClassBreakdown: wcBreakdown,
    topBooks: Object.entries(bookBreakdown).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([b,n])=>({book:b,count:n})),
    topStrongs: [...strongSet].map(s=>({strong:s,count:poolByStrong[s]||0})).sort((a,b)=>b.count-a.count).slice(0,10),
  };
}

// 17件不一致の整理
const discrepancyExplain = {
  reportedDesign: 6741,
  reportedAddendum: 6724,
  diff: 17,
  cause: (() => {
    if (s3CensusLt20.length > 0) {
      return `S3 Strongs（${s3CensusLt20.join(',')}）が census_count<20 のため、design.cjs の S6 pool 計算（S1-S5除外なし・census基準）に混入。addendum.cjs は排他的割り当て（S3 優先）なので重複なし。`;
    }
    return 'design.cjs のS6 pool は census_count<20 でS1-S5除外なし。addendum.cjs は pool_count<20 でS1-S5除外あり。定義差による。どちらも再計算では6,724を示す（データ整合）。';
  })(),
  correctedS6: addendumS6count,
  method: 'pool内件数<20（定義済みStrongs除外あり）を正とする（addendum.cjs方式）',
  verifiedEquality: `S1(${layerCount.S1})+S2(${layerCount.S2})+S3(${layerCount.S3})+S4(${layerCount.S4})+S5(${layerCount.S5})+S6(${layerCount.S6})+S7(${s7total}) = ${total} ${total===28219?'= 28,219 ✓':'≠ 28,219 ✗'}`,
};

const output = {
  meta: {
    title: 'Stage 3 S7設計・数値整合性確認',
    generatedAt: new Date().toISOString().slice(0,10),
    constraints: ['設計・監査のみ','Stage 3全件処理不開始','聖書JSON変更なし','既存成果物上書きなし'],
  },

  task4_discrepancy: {
    title: '17件不一致の解消',
    ...discrepancyExplain,
  },

  task2_s7_design: {
    title: 'S7（中頻度Strong）層設計',
    totalUncategorized: uncatTokens.length,
    wordClassValuesFound: [...wclassValues].sort(),
    subLayers: s7SubOutput,
    wordClassSummary: Object.fromEntries(
      Object.entries(wcSummary).sort((a,b)=>b[1].count-a[1].count)
        .map(([wc,v])=>[wc,{strongCount:v.strongs.size,tokenCount:v.count}])
    ),
    topBooksByS7: s7BookTop.map(([b,n])=>({book:b,count:n})),
  },

  task3_g2316_audit_design: {
    title: 'G2316 書巻別監査設計',
    totalInPool: g2316total,
    globalSR: stage3Addendum.task2_g2316_by_book.globalStats.srRate,
    group1_priority: {
      label: '優先個別監査（SR≥30% かつ件数≥10）',
      totalTokens: grp.g1.reduce((s,b)=>s+b.count,0),
      bookCount: grp.g1.length,
      books: grp.g1.sort((a,b)=>parseInt(b.srRate)-parseInt(a.srRate)).map(b=>({book:b.book,count:b.count,srRate:b.srRate,explicit:b.explicit||0,uncertain:b.uncertain||0})),
    },
    group2_normal: {
      label: '通常監査',
      totalTokens: grp.g2.reduce((s,b)=>s+b.count,0),
      bookCount: grp.g2.length,
      books: grp.g2.sort((a,b)=>b.count-a.count).map(b=>({book:b.book,count:b.count,srRate:b.srRate})),
    },
    group3_auto: {
      label: '自動照合比較的利用可（SR<10%かつexplicit≥85%かつ件数≥5）',
      totalTokens: grp.g3.reduce((s,b)=>s+b.count,0),
      bookCount: grp.g3.length,
      books: grp.g3.sort((a,b)=>b.count-a.count).map(b=>({book:b.book,count:b.count,srRate:b.srRate,explicit:b.explicit||0})),
    },
    note: 'SR率だけで判断せず、件数とサンプル信頼性を考慮。SR≥30%でも件数<10の書巻は第2群。',
  },

  final_strata: {
    title: 'S1-S7 全体構成（確定版）',
    assignment: layerCount,
    s1_to_s6: s1to6total,
    s7_total: s7total,
    grand_total: total,
    pool_total: allPoolTokens.length,
    match: total === allPoolTokens.length,
    layerOverlap: dupCheck,
    equality: discrepancyExplain.verifiedEquality,
  },

  su_policy_design: {
    title: 'σύ単数形 暫定除外ポリシー（S4管理）',
    management: '暫定自動照合除外。恒久ブラックリスト（3,922件）とは分離管理。',
    structural_review_required: 437,
    uncertain: 65,
    explicit: 221,
    total_s4: 723,
    breakdown_by_strong: {
      G4675_SR: 259, G4675_uncertain: 34, G4675_explicit: 96,
      G4571_SR: 105, G4571_uncertain: 13, G4571_explicit: 47,
      G4771_SR: 68,  G4771_uncertain: 16, G4771_explicit: 68,
      G4674_SR: 5,   G4674_uncertain: 2,  G4674_explicit: 10,
    },
    in_pool: true,
    in_permanent_blacklist: false,
  },

  blacklist_management: {
    title: 'ブラックリスト管理（確定版）',
    permanent_blacklist: {
      total: 3922,
      breakdown: { G5213:508, G5209:390, G5210:218, G5216:521, G2532:1296, G846:989 },
      note: 'census基準。Stage 2確定値。pool外（Stage 3対象外）。',
    },
    temporary_exclusion_s4: {
      total: 723,
      status: '暫定自動照合除外（Stage 3 S4層として管理）',
      SR_confirmed: 437,
      uncertain: 65,
      explicit: 221,
      note: '437件は duplicate_label 確認済み SR。全件誤訳とは認定しない。恒久 BL 追加はユーザー判断待ち。',
    },
    v2933_explanation: 'G5213+G5209+G5210+G5216+G2532 の合計。G846 追加前の中間値。',
    v3922_explanation: 'v2933 + G846(989) = 3,922。Stage 2 最終確定値。',
  },
};

const outPath = path.join(OUT_DIR, 'stage3-s7-design.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\nOutput: ${outPath}`);
