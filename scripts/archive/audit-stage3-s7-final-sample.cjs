#!/usr/bin/env node
/**
 * audit-stage3-s7-final-sample.cjs
 *
 * S7a: 追加66件 (既存34件と合わせて100件)
 * S7d: 独立120件 (既存118件とは別)
 *
 * 聖書JSON変更なし / 既存成果物上書きなし / 監査スクリプト変更なし
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── ユーティリティ ────────────────────────────────────────────────────────
function strip(s){ return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function parseRef(r){
  const m=r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  return m?{book:m[1],ch:m[2],v:m[3],idx:m[4]}:null;
}
const chCache=new Map();
function loadCh(book,ch){
  const k=`${book}/${ch}`;
  if(!chCache.has(k)){
    try{ chCache.set(k,JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8'))); }
    catch{ chCache.set(k,[]); }
  }
  return chCache.get(k);
}
const jaCache=new Map();
function loadJA(book,ch){
  const k=`${book}/${ch}`;
  if(!jaCache.has(k)){
    try{ jaCache.set(k,JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{}); }
    catch{ jaCache.set(k,{}); }
  }
  return jaCache.get(k);
}
function getVerseTokens(book,ch,verse){
  const t=loadCh(book,ch);
  const a=Array.isArray(t)?t:Object.values(t);
  return a.filter(x=>String(x.verse)===String(verse));
}

// ── 既存データ読み込み ────────────────────────────────────────────────────
console.log('データ読み込み中...');
const pool3       = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const prevSample  = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-s7-sample.json'),'utf8'));
const reclassData = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-s7-reclassify.json'),'utf8'));
const allPool     = pool3.allTokens;

const BLACKLIST  = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);
const S1_STRONGS = new Set(['G2424','G5547']);
const S2_STRONGS = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS = new Set(['G444','G80','G3101','G1135','G5043']);
const OUTHTOS    = new Set(['G3778','G5023','G5026','G5124','G5126','G5127','G5129','G5130']);

const poolByStrong={};
for(const t of allPool) poolByStrong[t.strong]=(poolByStrong[t.strong]||0)+1;
const S5_STRONGS=new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n>=200&&!S1_STRONGS.has(s)&&!S2_STRONGS.has(s)&&!S3_STRONGS.has(s)&&!S4_STRONGS.has(s))
  .map(([s])=>s));
const definedStrongs=new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS,...S5_STRONGS]);
const S6_STRONGS=new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n<20&&!definedStrongs.has(s))
  .map(([s])=>s));

function assignLayer(tok){
  const s=tok.strong;
  if(S1_STRONGS.has(s)) return 'S1';
  if(S2_STRONGS.has(s)) return 'S2';
  if(S3_STRONGS.has(s)) return 'S3';
  if(S4_STRONGS.has(s)) return 'S4';
  if(S5_STRONGS.has(s)) return 'S5';
  if(S6_STRONGS.has(s)) return 'S6';
  if(OUTHTOS.has(s))     return 'S7d';
  const wc=(tok.wordClass||'').toLowerCase().trim();
  if(['prep','adv','adverb','particle','part','conj','conj.','conj-coord','conj-subord','cond','interj','interjection'].includes(wc)) return 'S7a';
  if(wc==='verb')   return 'S7b';
  if(wc==='noun')   return 'S7c';
  if(['adj','adjective','pronoun','pron'].includes(wc)) return 'S7d';
  return 'S7e';
}

const s7aPool = allPool.filter(t=>assignLayer(t)==='S7a');
const s7dPool = allPool.filter(t=>assignLayer(t)==='S7d');
console.log(`S7a pool: ${s7aPool.length}件 / S7d pool: ${s7dPool.length}件`);

// ── 既存サンプルの ref 収集 ───────────────────────────────────────────────
// S7a: 既存34件（reclassifyレポートの新サンプル）
const existingS7aRefs = new Set(reclassData.task2_resampling.s7a.results.map(r=>r.ref));
console.log(`既存S7aサンプル refs: ${existingS7aRefs.size}件`);

// S7d: 既存118件（initial87 + moved15 + added16）
const existingS7dSample = [
  ...prevSample.results.S7d,
  ...prevSample.results.S7a.filter(r=>OUTHTOS.has(r.strong)),
  ...reclassData.task2_resampling.s7d.addedResults,
];
const existingS7dRefs = new Set(existingS7dSample.map(r=>r.ref));
console.log(`既存S7dサンプル refs: ${existingS7dRefs.size}件`);

// ── 抽出関数 ─────────────────────────────────────────────────────────────
/**
 * pool から excludeRefs を除いた tokens から targetN 件を抽出。
 * Strong × 書巻 ラウンドロビン。各 Strong への配分は pool サイズ比例。
 */
function selectSample(tokens, targetN, excludeRefs, seed){
  const available = tokens.filter(t=>!excludeRefs.has(t.ref));
  if(available.length < targetN){
    console.warn(`警告: 利用可能tokens(${available.length}) < target(${targetN})`);
  }

  // Strong 別にグループ化
  const byStrong = {};
  for(const t of available){
    if(!byStrong[t.strong]) byStrong[t.strong]=[];
    byStrong[t.strong].push(t);
  }
  const strongs = Object.keys(byStrong).sort();
  const nS = strongs.length;

  // pool 件数比例配分（最低1件保証）
  const totalAvail = available.length;
  const alloc = {};
  let allocated = 0;
  for(const s of strongs){
    const share = Math.round((byStrong[s].length / totalAvail) * targetN);
    alloc[s] = Math.max(1, share);
    allocated += alloc[s];
  }
  // 過剰分を最大プールのStrongから削る
  let diff = allocated - targetN;
  if(diff > 0){
    const sorted = [...strongs].sort((a,b)=>byStrong[b].length-byStrong[a].length);
    for(const s of sorted){
      if(diff<=0) break;
      if(alloc[s]>1){ alloc[s]--; diff--; }
    }
  } else if(diff < 0){
    const sorted = [...strongs].sort((a,b)=>byStrong[b].length-byStrong[a].length);
    for(const s of sorted){
      if(diff>=0) break;
      alloc[s]++; diff++;
    }
  }

  const result = [];
  const seen   = new Set();

  for(const s of strongs){
    const n = alloc[s] || 0;
    if(n===0) continue;
    const stoks = byStrong[s];
    if(!stoks || !stoks.length) continue;

    // 書巻ラウンドロビン
    const byBook = {};
    for(const t of stoks){
      const bk = t.ref.split(' ')[0];
      if(!byBook[bk]) byBook[bk]=[];
      byBook[bk].push(t);
    }
    const books = Object.keys(byBook).sort();
    const picked = [];
    for(let i=0; picked.length < Math.min(n, stoks.length); i++){
      const bk = books[(i*3 + seed + s.charCodeAt(1)) % books.length];
      const cands = (byBook[bk]||[]).filter(t=>!seen.has(t.ref)&&!picked.find(p=>p.ref===t.ref));
      if(cands.length > 0){
        const t = cands[(i*7 + seed) % cands.length];
        picked.push(t); seen.add(t.ref);
      } else {
        const ac = stoks.filter(t=>!seen.has(t.ref)&&!picked.find(p=>p.ref===t.ref));
        if(ac.length > 0){
          const t = ac[(i*13 + seed) % ac.length];
          picked.push(t); seen.add(t.ref);
        } else break;
      }
    }
    result.push(...picked);
  }

  // 不足分を補充
  if(result.length < targetN){
    const rem = available.filter(t=>!seen.has(t.ref));
    for(let i=0; result.length<targetN && i<rem.length; i++){
      result.push(rem[i]); seen.add(rem[i].ref);
    }
  }
  return result.slice(0, targetN);
}

// ── 分析関数 ─────────────────────────────────────────────────────────────
function analyzeToken(tok){
  const r = parseRef(tok.ref);
  if(!r) return {correspondence:'uncertain', reason:'ref解析不能', autoCorrect:false};
  const vt = loadJA(r.book,r.ch)[r.v] || null;
  const verseTokens = getVerseTokens(r.book,r.ch,r.v);
  const ja = tok.japanese || '';
  const cleanJa = strip(ja);

  if(!vt) return {correspondence:'uncertain', reason:'JA1955節テキストなし', autoCorrect:false, verseText:null};

  const sameLabel = verseTokens.filter(t=>t.ref!==tok.ref && (t.japanese||'')===ja);
  const cntDirect = cleanJa ? (vt.split(cleanJa).length-1) : 0;
  const kanji = cleanJa
    .replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'')
    .replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  const hasKanji = kanji.length>=2 && vt.includes(kanji) && !vt.includes(cleanJa);
  const cntKanji = kanji.length>=2 ? (vt.split(kanji).length-1) : 0;

  let correspondence, reason='', autoCorrect=false;
  if(sameLabel.length > 0){
    correspondence = 'structural_review_required';
    reason = `節内に同じラベル「${ja}」が他に${sameLabel.length}件（${sameLabel.slice(0,2).map(t=>t.ref+'='+t.strong).join(', ')}）`;
  } else if(cntDirect > 1){
    correspondence = 'uncertain';
    reason = `節テキストに「${cleanJa}」が${cntDirect}回出現`;
  } else if(cntDirect === 1){
    correspondence = 'explicit'; autoCorrect = true;
  } else if(hasKanji){
    if(cntKanji > 1){
      correspondence = 'uncertain';
      reason = `漢字「${kanji}」が節内${cntKanji}回出現`;
    } else {
      correspondence = 'implicit'; reason = `漢字「${kanji}」で間接マッチ`; autoCorrect = true;
    }
  } else {
    correspondence = 'none';
    reason = `対応なし（cleanJa=${cleanJa||'空'}）`;
  }

  // SR の種別判定
  let srType = null;
  if(correspondence === 'structural_review_required'){
    const cross = sameLabel.filter(sl=>sl.strong!==tok.strong);
    const same  = sameLabel.filter(sl=>sl.strong===tok.strong);
    const crossBL = cross.filter(sl=>BLACKLIST.has(sl.strong));
    const crossS4 = cross.filter(sl=>S4_STRONGS.has(sl.strong));
    const crossPool = cross.filter(sl=>!BLACKLIST.has(sl.strong)&&!S4_STRONGS.has(sl.strong));
    if(cross.length===0)          srType = 'same_strong';
    else if(same.length>0)        srType = 'mixed';
    else if(crossBL.length>0)     srType = 'cross_strong_bl';
    else if(crossS4.length>0)     srType = 'cross_strong_s4';
    else                          srType = 'cross_strong_pool';
  }

  return {
    correspondence, reason, autoCorrect, srType,
    verseText: (vt||'').slice(0,120),
    sameLabel: sameLabel.map(t=>({ref:t.ref,strong:t.strong,jp:t.japanese})),
    matchInfo: {cntDirect, hasKanji, cntKanji, cleanJa, kanji},
  };
}

// ── 集計ユーティリティ ────────────────────────────────────────────────────
function summarize(recs){
  const c={explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0};
  const srTypes={same_strong:0,cross_strong_pool:0,cross_strong_bl:0,cross_strong_s4:0,mixed:0};
  for(const r of recs){
    c[r.correspondence]=(c[r.correspondence]||0)+1;
    if(r.srType) srTypes[r.srType]=(srTypes[r.srType]||0)+1;
  }
  const n=recs.length;
  return{
    n, ...c,
    srRate: n>0 ? (c.structural_review_required/n*100).toFixed(2)+'%' : '0.00%',
    autoCorrect: recs.filter(r=>r.autoCorrect).length,
    srTypes,
  };
}

function wilsonCI(k,n,z=1.96){
  if(n===0) return {lower:0, upper:0};
  const p=k/n;
  const denom=1+z*z/n;
  const center=(p+z*z/(2*n))/denom;
  const margin=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
  return{
    lower: parseFloat(Math.max(0,center-margin).toFixed(4)),
    upper: parseFloat(Math.min(1,center+margin).toFixed(4)),
  };
}

function byStrongStats(pool, sample){
  const ps={}, ss={};
  for(const t of pool)   ps[t.strong]=(ps[t.strong]||0)+1;
  for(const r of sample) ss[r.strong]=(ss[r.strong]||0)+1;
  return Object.keys(ps).sort((a,b)=>ps[b]-ps[a]).map(s=>{
    const info = pool.find(t=>t.strong===s);
    return { strong:s, japanese:info?.japanese||'', pool:ps[s], sample:ss[s]||0 };
  });
}

function byBookStats(sample){
  const bs={};
  for(const r of sample){ const bk=r.ref.split(' ')[0]; bs[bk]=(bs[bk]||0)+1; }
  return Object.entries(bs).sort((a,b)=>b[1]-a[1]).map(([book,n])=>({book,n}));
}

// ──────────────────────────────────────────────────────────────────────────
// S7a: 追加66件
// ──────────────────────────────────────────────────────────────────────────
console.log('\n=== S7a: 追加66件 (seed=151) ===');

const s7aAdded = selectSample(s7aPool, 66, existingS7aRefs, 151);
console.log(`抽出: ${s7aAdded.length}件`);
console.log(`既存34件との重複: ${s7aAdded.filter(t=>existingS7aRefs.has(t.ref)).length}件`);

const s7aAddedResults = s7aAdded.map(tok=>({
  ...tok, stratum:'S7a_add66',
  ...analyzeToken(tok),
}));

// 既存34件の結果を reclassify.json から取得
const existingS7aResults = reclassData.task2_resampling.s7a.results.map(r=>({...r,stratum:'S7a_orig34'}));

// 100件統合
const s7a100 = [...existingS7aResults, ...s7aAddedResults];
console.log(`統合100件の重複チェック: ${new Set(s7a100.map(r=>r.ref)).size === 100 ? 'OK' : 'NG'}`);

const summOrig34  = summarize(existingS7aResults);
const summAdd66   = summarize(s7aAddedResults);
const summ100     = summarize(s7a100);
const ci100       = wilsonCI(summ100.structural_review_required, 100);

console.log(`\n[S7a 集計]`);
console.log(`  既存34件: explicit=${summOrig34.explicit} implicit=${summOrig34.implicit} SR=${summOrig34.structural_review_required}(${summOrig34.srRate}) uncertain=${summOrig34.uncertain} none=${summOrig34.none}`);
console.log(`  追加66件: explicit=${summAdd66.explicit} implicit=${summAdd66.implicit} SR=${summAdd66.structural_review_required}(${summAdd66.srRate}) uncertain=${summAdd66.uncertain} none=${summAdd66.none}`);
console.log(`  計100件:  explicit=${summ100.explicit} implicit=${summ100.implicit} SR=${summ100.structural_review_required}(${summ100.srRate}) uncertain=${summ100.uncertain} none=${summ100.none}`);
console.log(`  SR種別: ${JSON.stringify(summ100.srTypes)}`);
console.log(`  95% CI (Wilson): [${(ci100.lower*100).toFixed(1)}%, ${(ci100.upper*100).toFixed(1)}%]`);
console.log(`  閾値20%判定: ${parseFloat(summ100.srRate)<=20?'PASS':'FAIL'}`);

// ──────────────────────────────────────────────────────────────────────────
// S7d: 独立120件
// ──────────────────────────────────────────────────────────────────────────
console.log('\n=== S7d: 独立120件 (seed=173) ===');

const s7dNew = selectSample(s7dPool, 120, existingS7dRefs, 173);
console.log(`抽出: ${s7dNew.length}件`);
console.log(`既存118件との重複: ${s7dNew.filter(t=>existingS7dRefs.has(t.ref)).length}件`);

const s7dNewResults = s7dNew.map(tok=>({
  ...tok, stratum:'S7d_ind120',
  ...analyzeToken(tok),
}));

const summ120   = summarize(s7dNewResults);
const ci120     = wilsonCI(summ120.structural_review_required, 120);

console.log(`\n[S7d 集計]`);
console.log(`  独立120件: explicit=${summ120.explicit} implicit=${summ120.implicit} SR=${summ120.structural_review_required}(${summ120.srRate}) uncertain=${summ120.uncertain} none=${summ120.none}`);
console.log(`  SR種別: ${JSON.stringify(summ120.srTypes)}`);
console.log(`  95% CI (Wilson): [${(ci120.lower*100).toFixed(1)}%, ${(ci120.upper*100).toFixed(1)}%]`);
console.log(`  閾値25%判定: ${parseFloat(summ120.srRate)<=25?'PASS':'FAIL'}`);

// ──────────────────────────────────────────────────────────────────────────
// 詳細ブレークダウン
// ──────────────────────────────────────────────────────────────────────────
const s7aStrongStats = byStrongStats(s7aPool, s7a100);
const s7aBookStats   = byBookStats(s7a100);
const s7dStrongStats = byStrongStats(s7dPool, s7dNewResults);
const s7dBookStats   = byBookStats(s7dNewResults);

console.log('\nS7a Strong別(100件):');
s7aStrongStats.forEach(s=>console.log(`  ${s.strong}(${s.japanese}): pool=${s.pool}, sample=${s.sample}`));
console.log('\nS7a 書巻別(100件):');
s7aBookStats.slice(0,15).forEach(b=>console.log(`  ${b.book}: ${b.n}`));

console.log('\nS7d Strong別(120件, 上位20):');
s7dStrongStats.slice(0,20).forEach(s=>console.log(`  ${s.strong}(${s.japanese}): pool=${s.pool}, sample=${s.sample}`));

// ──────────────────────────────────────────────────────────────────────────
// 出力
// ──────────────────────────────────────────────────────────────────────────
const output = {
  meta:{
    title:'Stage 3 S7 最終サンプリング',
    generatedAt: new Date().toISOString().slice(0,10),
    constraints:['聖書JSON変更なし','既存判定変更なし','監査スクリプト変更なし','既存成果物上書きなし'],
  },

  s7a:{
    pool: s7aPool.length,
    existingSample:{
      n: existingS7aResults.length,
      seed: 97,
      source: 'audit-stage3-s7-reclassify.cjs (task2_resampling.s7a.results)',
      summary: summOrig34,
    },
    additionalSample:{
      n: s7aAddedResults.length,
      seed: 151,
      method: 'Strong比例配分+書巻ラウンドロビン、既存34件ref除外',
      results: s7aAddedResults,
      summary: summAdd66,
    },
    combined100:{
      n: 100,
      refDuplicates: 100 - new Set(s7a100.map(r=>r.ref)).size,
      summary: summ100,
      ci95_wilson:{
        lower: (ci100.lower*100).toFixed(1)+'%',
        upper: (ci100.upper*100).toFixed(1)+'%',
      },
      threshold: '20.0%',
      judgment: parseFloat(summ100.srRate)<=20 ? 'PASS' : 'FAIL',
      strongBreakdown: s7aStrongStats,
      bookBreakdown: s7aBookStats,
      allResults: s7a100,
    },
  },

  s7d:{
    pool: s7dPool.length,
    existingArchive:{
      n: existingS7dSample.length,
      note: '監査記録として保存。今回の代表サンプルには含めない',
    },
    independentSample:{
      n: s7dNewResults.length,
      seed: 173,
      method: 'Strong比例配分+書巻ラウンドロビン、既存118件ref除外',
      summary: summ120,
      ci95_wilson:{
        lower: (ci120.lower*100).toFixed(1)+'%',
        upper: (ci120.upper*100).toFixed(1)+'%',
      },
      threshold: '25.0%',
      judgment: parseFloat(summ120.srRate)<=25 ? 'PASS' : 'FAIL',
      strongBreakdown: s7dStrongStats,
      bookBreakdown: s7dBookStats,
      results: s7dNewResults,
    },
  },
};

const outPath = path.join(OUT_DIR,'stage3-s7-final-sample.json');
fs.writeFileSync(outPath, JSON.stringify(output,null,2),'utf8');
console.log(`\nOutput: ${outPath}`);
