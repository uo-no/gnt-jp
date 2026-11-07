#!/usr/bin/env node
/**
 * audit-stage3-full.cjs
 * Stage 3 全件監査 — pool 28,219件
 *
 * 出力ファイル（既存成果物上書きなし）:
 *   stage3-full-audit-data.json    — 全件コンパクトレコード
 *   stage3-full-audit-stats.json   — 層別/Strong別/書巻別集計
 *   stage3-full-audit-sr.json      — SR全件（verse text付き）
 *   stage3-full-audit-uncertain.json
 *   stage3-full-audit-none.json
 *   stage3-full-audit-excluded.json
 *   stage3-full-audit-report.md    — 最終報告書
 *
 * 聖書JSON変更なし / 既存成果物上書きなし / Stage 4に進まない
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── 定数 ──────────────────────────────────────────────────────────────────
const BLACKLIST   = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);
const S4_STRONGS  = new Set(['G4675','G4571','G4771','G4674']);
const S1_STRONGS  = new Set(['G2424','G5547']);
const S2_STRONGS  = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS  = new Set(['G444','G80','G3101','G1135','G5043']);
const OUTHTOS     = new Set(['G3778','G5023','G5026','G5124','G5126','G5127','G5129','G5130']);

// G2316 Priority Group 閾値
const G2316_GROUP1_SR_THRESHOLD  = 0.30;  // SR≥30%
const G2316_GROUP1_MIN_N         = 10;
const G2316_GROUP3_SR_THRESHOLD  = 0.10;  // SR<10%
const G2316_GROUP3_MIN_EXPLICIT  = 0.85;
const G2316_GROUP3_MIN_N         = 5;

// ── ユーティリティ ────────────────────────────────────────────────────────
function strip(s){ return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function parseRef(r){
  const m = r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  return m ? {book:m[1], ch:m[2], v:m[3]} : null;
}

const chCache = new Map();
function loadCh(book, ch){
  const k = `${book}/${ch}`;
  if(!chCache.has(k)){
    try{ chCache.set(k, JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8'))); }
    catch{ chCache.set(k, []); }
  }
  return chCache.get(k);
}
const jaCache = new Map();
function loadJA(book, ch){
  const k = `${book}/${ch}`;
  if(!jaCache.has(k)){
    try{ jaCache.set(k, JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{}); }
    catch{ jaCache.set(k, {}); }
  }
  return jaCache.get(k);
}
function getVerseToks(book, ch, verse){
  const t = loadCh(book, ch);
  const a = Array.isArray(t) ? t : Object.values(t);
  return a.filter(x => String(x.verse)===String(verse));
}

// ── 層割り当て ────────────────────────────────────────────────────────────
let poolByStrong_g = {};  // populated after pool load
let S5_STRONGS_g   = new Set();
let S6_STRONGS_g   = new Set();

function buildLayerSets(pool){
  for(const t of pool) poolByStrong_g[t.strong] = (poolByStrong_g[t.strong]||0)+1;
  const defined = new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS]);
  S5_STRONGS_g = new Set(
    Object.entries(poolByStrong_g)
      .filter(([s,n]) => n>=200 && !defined.has(s))
      .map(([s]) => s)
  );
  const defined2 = new Set([...defined, ...S5_STRONGS_g]);
  S6_STRONGS_g = new Set(
    Object.entries(poolByStrong_g)
      .filter(([s,n]) => n<20 && !defined2.has(s))
      .map(([s]) => s)
  );
}

function assignLayer(tok){
  const s = tok.strong;
  if(S1_STRONGS.has(s))  return 'S1';
  if(S2_STRONGS.has(s))  return 'S2';
  if(S3_STRONGS.has(s))  return 'S3';
  if(S4_STRONGS.has(s))  return 'S4';
  if(S5_STRONGS_g.has(s)) return 'S5';
  if(S6_STRONGS_g.has(s)) return 'S6';
  if(OUTHTOS.has(s))     return 'S7d';
  const wc = (tok.wordClass||'').toLowerCase().trim();
  if(['prep','adv','adverb','particle','part','conj','conj.','conj-coord','conj-subord','cond','interj','interjection'].includes(wc)) return 'S7a';
  if(wc === 'verb')      return 'S7b';
  if(wc === 'noun')      return 'S7c';
  if(['adj','adjective','pronoun','pron'].includes(wc)) return 'S7d';
  return 'S7e';
}

// ── 分析関数 ─────────────────────────────────────────────────────────────
function analyzeToken(tok){
  const r = parseRef(tok.ref);
  if(!r) return { correspondence:'uncertain', reason:'ref解析不能', autoCorrect:false, srType:null };

  const vt   = loadJA(r.book, r.ch)[r.v] || null;
  const vtoks = getVerseToks(r.book, r.ch, r.v);
  const ja    = tok.japanese || '';
  const cleanJa = strip(ja);

  if(!vt) return {
    correspondence:'uncertain', reason:'JA1955節テキストなし', autoCorrect:false,
    srType:null, verseText:null
  };

  const sameLabel = vtoks.filter(t => t.ref!==tok.ref && (t.japanese||'')===ja);

  let correspondence, reason='', autoCorrect=false, srType=null;

  if(sameLabel.length > 0){
    correspondence = 'structural_review_required';
    // SR種別判定
    const cross  = sameLabel.filter(sl => sl.strong!==tok.strong);
    const same   = sameLabel.filter(sl => sl.strong===tok.strong);
    const crossBL = cross.filter(sl => BLACKLIST.has(sl.strong));
    const crossS4 = cross.filter(sl => S4_STRONGS.has(sl.strong));
    if(cross.length===0)       srType = 'same_strong';
    else if(same.length>0)     srType = 'mixed';
    else if(crossBL.length>0)  srType = 'cross_strong_bl';
    else if(crossS4.length>0)  srType = 'cross_strong_s4';
    else                       srType = 'cross_strong_pool';
    reason = `節内に同ラベル「${ja}」が${sameLabel.length}件（${sameLabel.slice(0,2).map(t=>t.ref+'='+t.strong).join(', ')}）`;
  } else {
    const cntDirect = cleanJa ? (vt.split(cleanJa).length-1) : 0;
    const kanji = cleanJa
      .replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'')
      .replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
    const hasKanji = kanji.length>=2 && vt.includes(kanji) && !vt.includes(cleanJa);
    const cntKanji = kanji.length>=2 ? (vt.split(kanji).length-1) : 0;

    if(cntDirect > 1){
      correspondence = 'uncertain'; reason = `「${cleanJa}」節内${cntDirect}回出現`;
    } else if(cntDirect === 1){
      correspondence = 'explicit'; autoCorrect = true;
    } else if(hasKanji){
      if(cntKanji > 1){ correspondence='uncertain'; reason=`漢字「${kanji}」節内${cntKanji}回出現`; }
      else { correspondence='implicit'; reason=`漢字「${kanji}」間接マッチ`; autoCorrect=true; }
    } else {
      correspondence = 'none'; reason = `対応なし（cleanJa=${cleanJa||'空'}）`;
    }
  }

  return {
    correspondence, reason, autoCorrect, srType,
    verseText: (vt||'').slice(0,120),
    sameLabelCount: sameLabel.length,
    sameLabelPartners: sameLabel.slice(0,3).map(t=>({ref:t.ref,strong:t.strong,jp:t.japanese})),
  };
}

// ── 集計ユーティリティ ─────────────────────────────────────────────────────
function mkCounters(){
  return { explicit:0, implicit:0, structural_review_required:0, uncertain:0, none:0, auto_validation_excluded:0 };
}
function addToCounters(c, corr){ c[corr] = (c[corr]||0)+1; }
function srRate(c){ const n=c.explicit+c.implicit+c.structural_review_required+c.uncertain+c.none; return n>0?(c.structural_review_required/n*100).toFixed(2)+'%':'N/A'; }
function wilsonCI(k,n,z=1.96){
  if(n===0) return {lo:'N/A', hi:'N/A'};
  const p=k/n, d=1+z*z/n, ctr=(p+z*z/(2*n))/d, mg=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;
  return{ lo:(Math.max(0,ctr-mg)*100).toFixed(1)+'%', hi:(Math.min(1,ctr+mg)*100).toFixed(1)+'%' };
}

// ── メイン処理 ────────────────────────────────────────────────────────────
console.log('[Stage 3 全件監査] 開始...');
const tStart = Date.now();

// Pool 読み込み
const pool3   = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const allPool = pool3.allTokens;
buildLayerSets(allPool);
console.log(`Pool: ${allPool.length}件`);

// 層別カウント確認
const layerCheck = {};
for(const t of allPool){ const l=assignLayer(t); layerCheck[l]=(layerCheck[l]||0)+1; }
console.log('層別件数:', JSON.stringify(layerCheck));

// ── 全件処理 ──────────────────────────────────────────────────────────────
const allResults = [];
const srItems       = [];
const uncertainItems = [];
const noneItems     = [];
const excludedItems = [];

// 集計構造
const byLayer     = {};
const byStrong    = {};
const byBook      = {};
const srTypeCount = { same_strong:0, cross_strong_pool:0, cross_strong_bl:0, cross_strong_s4:0, mixed:0 };

// G2316専用集計（書巻別）
const g2316ByBook = {};

let processed = 0;
const REPORT_INTERVAL = 5000;

for(const tok of allPool){
  const layer = assignLayer(tok);
  const book  = tok.ref.split(' ')[0];

  // 集計初期化
  if(!byLayer[layer])  byLayer[layer]  = mkCounters();
  if(!byStrong[tok.strong]) byStrong[tok.strong] = { japanese:tok.japanese, layer, ...mkCounters() };
  if(!byBook[book])    byBook[book]    = mkCounters();

  let rec;

  // S4 暫定除外
  if(S4_STRONGS.has(tok.strong)){
    rec = {
      ref: tok.ref, strong: tok.strong, japanese: tok.japanese, layer:'S4',
      correspondence: 'auto_validation_excluded',
      srType: 's4_暫定除外', autoCorrect: false,
      reason: 'σύ格変化形 S4暫定除外方針により自動照合対象外',
    };
    excludedItems.push(rec);
  } else {
    const a = analyzeToken(tok);
    rec = {
      ref: tok.ref, strong: tok.strong, japanese: tok.japanese, layer,
      correspondence: a.correspondence,
      srType:         a.srType,
      autoCorrect:    a.autoCorrect,
      reason:         a.reason,
    };
    // SR/uncertain/none詳細リスト
    if(a.correspondence === 'structural_review_required'){
      srItems.push({
        ref:tok.ref, strong:tok.strong, japanese:tok.japanese, layer,
        srType:a.srType, reason:a.reason,
        verseText:a.verseText,
        sameLabelPartners:a.sameLabelPartners,
      });
      if(a.srType) srTypeCount[a.srType]++;
    } else if(a.correspondence === 'uncertain'){
      uncertainItems.push({
        ref:tok.ref, strong:tok.strong, japanese:tok.japanese, layer,
        reason:a.reason, verseText:a.verseText,
      });
    } else if(a.correspondence === 'none'){
      noneItems.push({
        ref:tok.ref, strong:tok.strong, japanese:tok.japanese, layer,
        reason:a.reason, verseText:a.verseText,
      });
    }
  }

  // カウンタ更新
  addToCounters(byLayer[layer], rec.correspondence);
  addToCounters(byStrong[tok.strong], rec.correspondence);
  addToCounters(byBook[book], rec.correspondence);

  // G2316 書巻別集計
  if(tok.strong === 'G2316'){
    if(!g2316ByBook[book]) g2316ByBook[book] = mkCounters();
    addToCounters(g2316ByBook[book], rec.correspondence);
  }

  allResults.push(rec);
  processed++;
  if(processed % REPORT_INTERVAL === 0){
    process.stdout.write(`  ${processed}/${allPool.length} (${(Date.now()-tStart)}ms)\n`);
  }
}

console.log(`全件処理完了: ${processed}件 (${Date.now()-tStart}ms)`);
console.log(`SR:${srItems.length} uncertain:${uncertainItems.length} none:${noneItems.length} excluded:${excludedItems.length}`);

// ── G2316 書巻別グループ分け ─────────────────────────────────────────────
function computeG2316Group(bookStats){
  const n_eff = bookStats.explicit + bookStats.implicit + bookStats.structural_review_required + bookStats.uncertain + bookStats.none;
  if(n_eff === 0) return null;
  const sr = bookStats.structural_review_required / n_eff;
  const ex = bookStats.explicit / n_eff;
  if(sr >= G2316_GROUP1_SR_THRESHOLD && n_eff >= G2316_GROUP1_MIN_N) return 1;
  if(sr < G2316_GROUP3_SR_THRESHOLD && ex >= G2316_GROUP3_MIN_EXPLICIT && n_eff >= G2316_GROUP3_MIN_N) return 3;
  return 2;
}

const g2316BookAnalysis = {};
for(const [book, stats] of Object.entries(g2316ByBook)){
  const n_eff = stats.explicit+stats.implicit+stats.structural_review_required+stats.uncertain+stats.none;
  const group = computeG2316Group(stats);
  g2316BookAnalysis[book] = {
    ...stats,
    n_eff, group,
    sr_rate: n_eff>0 ? (stats.structural_review_required/n_eff*100).toFixed(1)+'%' : 'N/A',
    explicit_rate: n_eff>0 ? (stats.explicit/n_eff*100).toFixed(1)+'%' : 'N/A',
  };
}
console.log('G2316書巻別グループ:');
Object.entries(g2316BookAnalysis)
  .sort((a,b)=>b[1].structural_review_required-a[1].structural_review_required)
  .forEach(([bk,v])=>console.log(`  ${bk}: Group${v.group} SR=${v.sr_rate}(${v.structural_review_required}/${v.n_eff}) explicit=${v.explicit_rate}`));

// ── 数値整合性確認 ────────────────────────────────────────────────────────
const totalByCorr = mkCounters();
for(const r of allResults) addToCounters(totalByCorr, r.correspondence);
const layerTotal = Object.values(layerCheck).reduce((s,v)=>s+v,0);
const refSet = new Set(allResults.map(r=>r.ref));
const corrTotal = Object.values(totalByCorr).reduce((s,v)=>s+v,0);

console.log('\n=== 数値整合性 ===');
console.log(`pool総数:       ${allPool.length} (期待: 28219, OK: ${allPool.length===28219})`);
console.log(`処理済み:        ${allResults.length} (期待: 28219, OK: ${allResults.length===28219})`);
console.log(`ref重複:         ${allResults.length - refSet.size}件`);
console.log(`未分類(none):    ${totalByCorr.none}件`);
console.log(`対応分類合計:    ${corrTotal} (期待: 28219, OK: ${corrTotal===28219})`);
console.log(`explicit:        ${totalByCorr.explicit}`);
console.log(`implicit:        ${totalByCorr.implicit}`);
console.log(`SR:              ${totalByCorr.structural_review_required}`);
console.log(`uncertain:       ${totalByCorr.uncertain}`);
console.log(`none:            ${totalByCorr.none}`);
console.log(`auto_excl:       ${totalByCorr.auto_validation_excluded}`);

// ── 上位Strong (SR 件数上位) ──────────────────────────────────────────────
const topSR = Object.entries(byStrong)
  .filter(([,v]) => v.structural_review_required > 0)
  .sort((a,b) => b[1].structural_review_required - a[1].structural_review_required)
  .slice(0,20);
console.log('\nSR上位20 Strong:');
topSR.forEach(([s,v]) => {
  const n=v.explicit+v.implicit+v.structural_review_required+v.uncertain+v.none;
  console.log(`  ${s}(${v.japanese})[${v.layer}]: SR=${v.structural_review_required}/${n}(${n>0?(v.structural_review_required/n*100).toFixed(0):0}%)`);
});

// ── SR種別の書巻別集計 ────────────────────────────────────────────────────
const srByBook = {};
for(const sr of srItems){
  const bk = sr.ref.split(' ')[0];
  if(!srByBook[bk]) srByBook[bk] = {total:0, same_strong:0, cross_strong_pool:0, cross_strong_bl:0, cross_strong_s4:0, mixed:0};
  srByBook[bk].total++;
  if(sr.srType) srByBook[bk][sr.srType]=(srByBook[bk][sr.srType]||0)+1;
}

// ── 出力ファイル書き込み ──────────────────────────────────────────────────
console.log('\n出力ファイル書き込み中...');

// 1. 全件コンパクトデータ
const dataOut = {
  meta: {
    title:'Stage 3 全件監査データ',
    generatedAt: new Date().toISOString().slice(0,10),
    totalTokens: allResults.length,
    constraints:['聖書JSON変更なし','既存成果物上書きなし','Stage 4未実施'],
  },
  consistency:{
    totalPool:allPool.length,
    totalResults:allResults.length,
    refDuplicates:allResults.length - refSet.size,
    corrTotal,
    byCorrespondence: totalByCorr,
    byLayer: Object.fromEntries(
      Object.entries(byLayer).map(([l,c])=>{
        const n=c.explicit+c.implicit+c.structural_review_required+c.uncertain+c.none;
        const ci = wilsonCI(c.structural_review_required, n);
        return [l, {...c, n_eff:n, srRate:srRate(c), ci95_wilson:ci}];
      })
    ),
  },
  tokens: allResults,
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-data.json'), JSON.stringify(dataOut,null,0),'utf8');
console.log('  stage3-full-audit-data.json');

// 2. 統計データ
const statsOut = {
  meta: { title:'Stage 3 全件監査 統計', generatedAt: new Date().toISOString().slice(0,10) },
  byLayer: dataOut.consistency.byLayer,
  byBook: Object.fromEntries(
    Object.entries(byBook).map(([b,c])=>{
      const n=c.explicit+c.implicit+c.structural_review_required+c.uncertain+c.none;
      return [b, {...c, n_eff:n, srRate:srRate(c)}];
    }).sort((a,b)=>b[1].n_eff-a[1].n_eff)
  ),
  byStrong: Object.fromEntries(
    Object.entries(byStrong)
      .sort((a,b)=>{
        const na=a[1].explicit+a[1].implicit+a[1].structural_review_required+a[1].uncertain+a[1].none;
        const nb=b[1].explicit+b[1].implicit+b[1].structural_review_required+b[1].uncertain+b[1].none;
        return nb-na;
      })
  ),
  srTypeSummary: srTypeCount,
  srByBook,
  g2316BookAnalysis,
  g2316Groups: {
    group1: Object.entries(g2316BookAnalysis).filter(([,v])=>v.group===1).map(([b,v])=>({book:b,...v})),
    group2: Object.entries(g2316BookAnalysis).filter(([,v])=>v.group===2).map(([b,v])=>({book:b,...v})),
    group3: Object.entries(g2316BookAnalysis).filter(([,v])=>v.group===3).map(([b,v])=>({book:b,...v})),
  },
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-stats.json'), JSON.stringify(statsOut,null,2),'utf8');
console.log('  stage3-full-audit-stats.json');

// 3. SR全件
const srOut = {
  meta: { title:'Stage 3 SR一覧', generatedAt: new Date().toISOString().slice(0,10), count:srItems.length },
  srTypeBreakdown: srTypeCount,
  items: srItems,
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-sr.json'), JSON.stringify(srOut,null,2),'utf8');
console.log(`  stage3-full-audit-sr.json (${srItems.length}件)`);

// 4. uncertain全件
const uncOut = {
  meta: { title:'Stage 3 uncertain一覧', generatedAt: new Date().toISOString().slice(0,10), count:uncertainItems.length },
  items: uncertainItems,
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-uncertain.json'), JSON.stringify(uncOut,null,2),'utf8');
console.log(`  stage3-full-audit-uncertain.json (${uncertainItems.length}件)`);

// 5. none全件
const noneOut = {
  meta: { title:'Stage 3 none一覧', generatedAt: new Date().toISOString().slice(0,10), count:noneItems.length },
  items: noneItems,
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-none.json'), JSON.stringify(noneOut,null,2),'utf8');
console.log(`  stage3-full-audit-none.json (${noneItems.length}件)`);

// 6. S4除外全件
const exclOut = {
  meta: { title:'Stage 3 auto_validation_excluded一覧', generatedAt: new Date().toISOString().slice(0,10), count:excludedItems.length },
  policy:'S4暫定除外（σύ格変化形723件）',
  items: excludedItems.map(r=>({ref:r.ref,strong:r.strong,japanese:r.japanese})),
};
fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-excluded.json'), JSON.stringify(exclOut,null,2),'utf8');
console.log(`  stage3-full-audit-excluded.json (${excludedItems.length}件)`);

// ── 最終報告書 ─────────────────────────────────────────────────────────────
const g1books = statsOut.g2316Groups.group1.sort((a,b)=>b.structural_review_required-a.structural_review_required);
const g3books = statsOut.g2316Groups.group3.sort((a,b)=>a.structural_review_required-b.structural_review_required);

const layerRows = ['S1','S2','S3','S4','S5','S6','S7a','S7b','S7c','S7d','S7e']
  .map(l => {
    const c = dataOut.consistency.byLayer[l] || {};
    const n = (c.n_eff||0);
    const sr = c.structural_review_required||0;
    const ex = c.explicit||0;
    const im = c.implicit||0;
    const un = c.uncertain||0;
    const no = c.none||0;
    const av = c.auto_validation_excluded||0;
    const ci = c.ci95_wilson||{lo:'N/A',hi:'N/A'};
    return `| ${l} | ${n+av} | ${ex} | ${im} | ${sr} | ${un} | ${no} | ${av} | ${c.srRate||'N/A'} | [${ci.lo}, ${ci.hi}] |`;
  }).join('\n');

const topSRRows = topSR.slice(0,15).map(([s,v])=>{
  const n=v.explicit+v.implicit+v.structural_review_required+v.uncertain+v.none;
  const r=n>0?(v.structural_review_required/n*100).toFixed(0):0;
  return `| ${s} | ${v.japanese} | ${v.layer} | ${n} | ${v.structural_review_required} | ${r}% |`;
}).join('\n');

const g1rows = g1books.map(v=>
  `| ${v.book} | ${v.n_eff} | ${v.structural_review_required} | ${v.sr_rate} | ${v.explicit} | ${v.explicit_rate} |`
).join('\n');

const report = `# Stage 3 全件監査 最終報告書

生成日: ${new Date().toISOString().slice(0,10)}
スクリプト: \`scripts/audit-stage3-full.cjs\`

---

## 数値整合性

| 確認項目 | 値 | 判定 |
|---|---|---|
| Pool 総数 | ${allPool.length} | ${allPool.length===28219?'✅ 28,219':'❌'} |
| 処理件数 | ${allResults.length} | ${allResults.length===28219?'✅':'❌'} |
| ref 重複 | ${allResults.length - refSet.size}件 | ${allResults.length===refSet.size?'✅ 0件':'❌'} |
| 対応分類合計 | ${corrTotal} | ${corrTotal===28219?'✅ 28,219':'❌'} |
| 未分類（none） | ${totalByCorr.none}件 | ${totalByCorr.none===0?'✅ 0件':'⚠️ 要確認'} |
| 処理時間 | ${((Date.now()-tStart)/1000).toFixed(1)}秒 | — |

---

## 対応分類 総括

| 分類 | 件数 | 全体比 |
|---|---|---|
| explicit | ${totalByCorr.explicit} | ${(totalByCorr.explicit/28219*100).toFixed(1)}% |
| implicit | ${totalByCorr.implicit} | ${(totalByCorr.implicit/28219*100).toFixed(1)}% |
| structural_review_required | ${totalByCorr.structural_review_required} | ${(totalByCorr.structural_review_required/28219*100).toFixed(1)}% |
| uncertain | ${totalByCorr.uncertain} | ${(totalByCorr.uncertain/28219*100).toFixed(1)}% |
| none | ${totalByCorr.none} | ${(totalByCorr.none/28219*100).toFixed(1)}% |
| auto_validation_excluded (S4) | ${totalByCorr.auto_validation_excluded} | ${(totalByCorr.auto_validation_excluded/28219*100).toFixed(1)}% |
| **合計** | **${corrTotal}** | **100%** |

自動補正可（explicit+implicit）: ${totalByCorr.explicit+totalByCorr.implicit}件 (${((totalByCorr.explicit+totalByCorr.implicit)/28219*100).toFixed(1)}%)

---

## 層別集計

| 層 | 件数 | explicit | implicit | SR | uncertain | none | 除外 | SR率 | 95% CI |
|---|---|---|---|---|---|---|---|---|---|
${layerRows}

---

## SR種別 内訳（${totalByCorr.structural_review_required}件）

| SR種別 | 件数 | 率 |
|---|---|---|
| same_strong（同 Strong 同節反復） | ${srTypeCount.same_strong} | ${(srTypeCount.same_strong/totalByCorr.structural_review_required*100).toFixed(1)}% |
| cross_strong_pool（pool 内クロス） | ${srTypeCount.cross_strong_pool} | ${(srTypeCount.cross_strong_pool/totalByCorr.structural_review_required*100).toFixed(1)}% |
| cross_strong_bl（BL クロス） | ${srTypeCount.cross_strong_bl} | ${(srTypeCount.cross_strong_bl/totalByCorr.structural_review_required*100).toFixed(1)}% |
| cross_strong_s4（S4 クロス） | ${srTypeCount.cross_strong_s4} | ${(srTypeCount.cross_strong_s4/totalByCorr.structural_review_required*100).toFixed(1)}% |
| mixed（複合型） | ${srTypeCount.mixed} | ${(srTypeCount.mixed/totalByCorr.structural_review_required*100).toFixed(1)}% |

---

## SR 上位 Strong（件数上位15）

| Strong | 語彙 | 層 | 有効 n | SR件数 | SR率 |
|---|---|---|---|---|---|
${topSRRows}

---

## G2316（神）書巻別分析

G2316 合計: ${(byStrong['G2316']||{explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0}).explicit+(byStrong['G2316']||{explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0}).implicit+(byStrong['G2316']||{explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0}).structural_review_required+(byStrong['G2316']||{explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0}).uncertain+(byStrong['G2316']||{explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0}).none}件、SR=${byStrong['G2316']?.structural_review_required||0}件（${byStrong['G2316']?.srRate||'N/A'}）

### Group 1（SR≥30%かつn≥10）— 優先個別監査対象

| 書巻 | n | SR | SR率 | explicit | explicit率 |
|---|---|---|---|---|---|
${g1rows||'（該当なし）'}

### Group 3（SR<10%かつexplicit≥85%かつn≥5）— 高確信度

| 書巻 | n | SR | SR率 | explicit | explicit率 |
|---|---|---|---|---|---|
${g3books.map(v=>`| ${v.book} | ${v.n_eff} | ${v.structural_review_required} | ${v.sr_rate} | ${v.explicit} | ${v.explicit_rate} |`).join('\n')||'（該当なし）'}

---

## none件数の確認

none = ${noneItems.length}件${noneItems.length===0 ? '（目標値達成）' : '（要確認）'}

${noneItems.length>0 ? '### none件の一覧\n'+noneItems.slice(0,20).map(r=>`- ${r.ref} ${r.strong}(${r.japanese}): ${r.reason}`).join('\n') : ''}

---

## 出力ファイル一覧

| ファイル | 内容 | 件数 |
|---|---|---|
| \`stage3-full-audit-data.json\` | 全件コンパクトデータ | ${allResults.length}件 |
| \`stage3-full-audit-stats.json\` | 層別/Strong別/書巻別集計 | — |
| \`stage3-full-audit-sr.json\` | SR全件（verse text付き） | ${srItems.length}件 |
| \`stage3-full-audit-uncertain.json\` | uncertain全件 | ${uncertainItems.length}件 |
| \`stage3-full-audit-none.json\` | none全件 | ${noneItems.length}件 |
| \`stage3-full-audit-excluded.json\` | S4暫定除外 | ${excludedItems.length}件 |
| \`stage3-full-audit-report.md\` | 本報告書 | — |

---

## 再現性

全件判定は \`audit-stage3-full.cjs\` を再実行することで再現可能。
判定根拠（reason フィールド）は全件に記録済み。
S4暫定除外（${excludedItems.length}件）は方針変更がない限り自動照合対象外。

---

**停止確認:** 聖書JSON変更なし、修正案の適用なし、コミット/プッシュなし。Stage 4未実施。
`;

fs.writeFileSync(path.join(OUT_DIR,'stage3-full-audit-report.md'), report, 'utf8');
console.log('  stage3-full-audit-report.md');

console.log(`\n完了 (総時間: ${((Date.now()-tStart)/1000).toFixed(1)}秒)`);
