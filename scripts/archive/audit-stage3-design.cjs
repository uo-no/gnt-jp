#!/usr/bin/env node
/**
 * audit-stage3-design.cjs — Stage 3 設計・初回サンプリング
 *
 * 1. 追加ブラックリスト候補（σύ単数形等）の確認
 * 2. Stage 3 対象範囲の確定
 * 3. サンプリング設計（意味機能・リスク・多様性を考慮）
 * 4. 初回サンプル50件の分析実行
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

// ── ユーティリティ ─────────────────────────────────────────────────────────
function strip(s) { return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function containsBase(vt,jb){
  if(!vt||!jb)return false; const c=strip(jb); if(!c)return false;
  if(vt.includes(c))return true;
  const k=c.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  return k.length>=2&&vt.includes(k);
}
function parseRef(r){const m=r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);return m?{book:m[1],ch:m[2],v:m[3],idx:parseInt(m[4])}:null;}

const chCache=new Map();
function loadCh(book,ch){const k=`${book}/${ch}`;if(!chCache.has(k)){try{chCache.set(k,JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8')));}catch{chCache.set(k,[]);}}return chCache.get(k);}
const jaCache=new Map();
function loadJA(book,ch){const k=`${book}/${ch}`;if(!jaCache.has(k)){try{jaCache.set(k,JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{});}catch{jaCache.set(k,{});}}return jaCache.get(k);}
function getVerseTokens(book,ch,verse){const t=loadCh(book,ch);const a=Array.isArray(t)?t:Object.values(t);return a.filter(x=>String(x.verse)===String(verse));}

// ── データ読み込み ─────────────────────────────────────────────────────────
const stage3Pool = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const allPoolTokens = stage3Pool.allTokens; // 28,219件

console.log(`Stage 3 Pool: ${allPoolTokens.length}件`);

// ── ═══════════════════════════════════════════════════════════════════════
// 1. 追加ブラックリスト候補の確認
// σύ単数形（G4675/G4571/G4771/G4674/G4572）の duplicate_label 実態
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== 1. σύ単数形 追加ブラックリスト候補確認 ===');

const SU_STRONGS = {
  'G4675': 'σοί（与格）',
  'G4571': 'σε（対格）',
  'G4771': 'σύ（主格）',
  'G4674': 'σου（属格）',
};

const suAnalysis = {};
for (const [strong, form] of Object.entries(SU_STRONGS)) {
  const tokens = allPoolTokens.filter(t=>t.strong===strong);
  if (!tokens.length) { console.log(`${strong}: 0件`); continue; }

  let dup=0, multi=0, unique=0;
  for (const tok of tokens) {
    const r = parseRef(tok.ref); if(!r)continue;
    const vt = loadJA(r.book,r.ch)[r.v]||null; if(!vt)continue;
    const ja = tok.japanese||'';
    const verseTokens = getVerseTokens(r.book,r.ch,r.v);
    const sameLabel = verseTokens.filter(t=>t.ref!==tok.ref&&(t.japanese||'')===ja);
    if (sameLabel.length>0) dup++;
    else {
      const c=strip(ja);
      const cnt=(vt.split(c||'_').length-1);
      if (cnt>1) multi++; else unique++;
    }
  }
  const srCount = dup + multi;
  const srRate = (srCount/tokens.length*100).toFixed(1);
  suAnalysis[strong] = {
    form, count:tokens.length,
    structural_review_required: srCount,
    explicit: unique,
    srRate: srRate+'%',
    japanese: tokens[0]?.japanese||'',
  };
  console.log(`${strong}(${form}): ${tokens.length}件, SR=${srCount}(${srRate}%), explicit=${unique}`);
}

// SR率が高い（>30%）場合はblacklist候補
const suBlacklistCandidates = Object.entries(suAnalysis)
  .filter(([s,v])=>parseFloat(v.srRate)>30)
  .map(([s,v])=>({strong:s,...v}));
console.log(`\nブラックリスト候補（SR率>30%）:`, suBlacklistCandidates.map(v=>`${v.strong}(${v.srRate})`));

// ── ═══════════════════════════════════════════════════════════════════════
// 2. Stage 3 の意味グループ設計
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== 2. Stage 3 意味グループ設計 ===');

// 各Strongについて: ラベル・語クラス・SR実態を事前評価
function quickSRRate(tokens, maxN=50) {
  const sample = tokens.slice(0, maxN);
  let sr=0, exp=0;
  for (const tok of sample) {
    const r = parseRef(tok.ref); if(!r)continue;
    const vt = loadJA(r.book,r.ch)[r.v]||null; if(!vt)continue;
    const ja = tok.japanese||'';
    const verseTokens = getVerseTokens(r.book,r.ch,r.v);
    const sameLabel = verseTokens.filter(t=>t.ref!==tok.ref&&(t.japanese||'')===ja);
    const c=strip(ja);
    const cnt=(vt.split(c||'_').length-1);
    if (sameLabel.length>0||cnt>1) sr++; else exp++;
  }
  return { sr, exp, n:sample.length, srRate:(sr/sample.length*100).toFixed(0)+'%' };
}

// Top 30 Strongを意味グループに分類
const topStrong = stage3Pool.topStrong.slice(0,30);

// 意味グループ定義
const SEMANTIC_GROUPS = {
  'divine_proper': {
    label: '神的固有名詞（イエス・キリスト等）',
    strongs: ['G2424','G5547'],
    riskProfile: 'LOW',
    note: '固有名詞のため誤訳リスク低。多重出現は稀。',
  },
  'divine_titles': {
    label: '神的称号（神・主・父・子・霊）',
    strongs: ['G2316','G2962','G3962','G5207','G4151'],
    riskProfile: 'MEDIUM-HIGH',
    note: '節内に複数回出現する可能性あり（神・主は特に）',
  },
  'human_persons': {
    label: '人物関連（人・者・兄弟・弟子等）',
    strongs: ['G444','G3962','G80','G3101'],
    riskProfile: 'MEDIUM',
    note: '複数形が同節内に存在する可能性',
  },
  'pronoun_singular': {
    label: '単数代名詞（σύ各格）',
    strongs: ['G4675','G4571','G4771','G4674'],
    riskProfile: 'MEDIUM-HIGH',
    note: 'σύの格変化形が同節内に複数登場するケースあり',
  },
  'high_freq_noun': {
    label: '高頻度名詞（すべての・言等）',
    strongs: ['G3956','G3056'],
    riskProfile: 'MEDIUM',
    note: '多義性と多重出現のリスク',
  },
  'theological_noun': {
    label: '神学的名詞（律法・信仰・愛・命等）',
    strongs: ['G3551','G4102','G26','G2222','G2889'],
    riskProfile: 'LOW-MEDIUM',
    note: '意味は安定しているが文脈依存性あり',
  },
};

// Top30の意味グループ割り当てと SR率クイック評価
const groupAssignment = {};
for (const entry of topStrong) {
  const { strong, japanese, count, wordClass } = entry;

  // 意味グループへの割り当て
  let group = 'other';
  for (const [gk, gv] of Object.entries(SEMANTIC_GROUPS)) {
    if (gv.strongs.includes(strong)) { group = gk; break; }
  }

  // SR率評価（上限50件サンプル）
  const tokens = allPoolTokens.filter(t=>t.strong===strong);
  const srData = quickSRRate(tokens, 30);

  groupAssignment[strong] = {
    strong, japanese, count, wordClass, group,
    srRate: srData.srRate, srSample: srData.n,
    riskProfile: parseFloat(srData.srRate)>40?'HIGH':parseFloat(srData.srRate)>20?'MEDIUM':'LOW',
  };

  console.log(`${strong}(${japanese}) ${count}件: SR${srData.srRate}(n=${srData.n}) → ${group}`);
}

// ── ═══════════════════════════════════════════════════════════════════════
// 3. Stage 3 サンプリング設計
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== 3. Stage 3 サンプリング設計 ===');

/*
 * 設計原則:
 * - 意味機能別に6層を設定
 * - 各層で SR リスク・多様性・書巻分散を考慮
 * - 初回サンプル: 合計60件（設計提示用）
 * - 各トークンについて完全な分析を実施
 *
 * 層設計:
 * S1: 神的固有名詞（イエス・キリスト） - 確認目的・5件
 * S2: 神的称号（神・主・父・子・霊）  - 多重出現リスク確認・15件
 * S3: 人物関連名詞                     - 10件
 * S4: σύ単数代名詞形                  - 複数格変化の確認・10件
 * S5: 一般高頻度語（すべての・言等）  - 10件
 * S6: 低頻度Strong（<20件）           - 多様性確保・10件
 */

const STRATA_DEF = {
  S1: { label:'神的固有名詞（イエス・キリスト）', target:5,
        filter: t => ['G2424','G5547'].includes(t.strong) },
  S2: { label:'神的称号（神・主・父・子・霊）', target:15,
        filter: t => ['G2316','G2962','G3962','G5207','G4151'].includes(t.strong) },
  S3: { label:'人物関連名詞（人・兄弟等）', target:10,
        filter: t => ['G444','G80','G3101','G1135','G5043'].includes(t.strong) },
  S4: { label:'σύ単数代名詞各格', target:10,
        filter: t => ['G4675','G4571','G4771','G4674'].includes(t.strong) },
  S5: { label:'高頻度名詞・形容詞（すべての・言等）', target:10,
        filter: t => ['G3956','G3056','G3588'].includes(t.strong) ||
                     (t.count||0) >= 200 && !['G2424','G5547','G2316','G2962','G3962','G5207','G4151','G444','G80'].includes(t.strong) },
  S6: { label:'低頻度Strong（<20件）', target:10,
        filter: t => stage3Pool.topStrong.find(s=>s.strong===t.strong)?.count < 20 ||
                     (census_count(t.strong) < 20) },
};

// censusから件数を取得するヘルパー
const censusData = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
function census_count(strong) {
  return censusData.stats.byStrong[strong] || 0;
}
// S5の追加条件: 高頻度かつ他グループに属さない
const s5Strongs = new Set(Object.values(groupAssignment)
  .filter(g=>g.count>=200&&!['divine_proper','divine_titles','human_persons','pronoun_singular'].includes(g.group))
  .map(g=>g.strong));

// 各層のプールを構築
const strataPool = {};
for (const [k,def] of Object.entries(STRATA_DEF)) {
  let pool;
  if (k==='S5') {
    pool = allPoolTokens.filter(t => s5Strongs.has(t.strong) || ['G3956','G3056'].includes(t.strong));
  } else if (k==='S6') {
    pool = allPoolTokens.filter(t => census_count(t.strong) < 20);
  } else {
    pool = allPoolTokens.filter(def.filter);
  }
  strataPool[k] = pool;
  console.log(`${k}(${def.label}): pool=${pool.length}件, target=${def.target}件`);
}

// 層別サンプル選定（書巻多様性を確保）
function selectSample(pool, target, seed) {
  if (pool.length <= target) return [...pool];
  const byBook = {};
  for (const t of pool) {
    if (!byBook[t.book]) byBook[t.book]=[]; byBook[t.book].push(t);
  }
  const books = Object.keys(byBook);
  const result = [], seen = new Set();
  let i = 0;
  while (result.length < target && i < pool.length * 3) {
    const bk = books[(i * 7 + seed) % books.length];
    const cands = byBook[bk] || [];
    const tok = cands[(i * 13 + seed) % Math.max(1,cands.length)];
    if (tok && !seen.has(tok.ref)) { result.push(tok); seen.add(tok.ref); }
    i++;
  }
  return result;
}

const stage3Sample = {};
for (const [k,def] of Object.entries(STRATA_DEF)) {
  stage3Sample[k] = selectSample(strataPool[k], def.target, k.charCodeAt(1));
}

const totalSample = Object.values(stage3Sample).reduce((s,v)=>s+v.length,0);
console.log(`\n初回サンプル総数: ${totalSample}件`);

// ── ═══════════════════════════════════════════════════════════════════════
// 4. 初回サンプル60件の分析実行
// ═══════════════════════════════════════════════════════════════════════
console.log('\n=== 4. 初回サンプル分析 ===');

function analyzeToken(token, stratum) {
  const r = parseRef(token.ref);
  if (!r) return { validity:'uncertain', correspondence:'uncertain' };

  const vt = loadJA(r.book,r.ch)[r.v]||null;
  const verseTokens = getVerseTokens(r.book,r.ch,r.v);

  if (!vt) return { validity:'uncertain', correspondence:'uncertain', verseText:null };

  const ja = token.japanese||'';
  const cleanJa = strip(ja);
  const sameLabel = verseTokens.filter(t=>t.ref!==token.ref&&(t.japanese||'')===ja);
  const countInVerse = cleanJa ? (vt.split(cleanJa).length-1) : 0;

  // コンテキスト（前後3トークン）
  const allVT = verseTokens.sort((a,b)=>(parseInt(a.globalIdx||0)-parseInt(b.globalIdx||0)));
  const selfIdx = allVT.findIndex(t=>t.ref===token.ref);
  const context = allVT.slice(Math.max(0,selfIdx-3), selfIdx+4).map(t=>({
    ref:t.ref, text:t.text||'', japanese:t.japanese||'', strong:t.strong||''
  }));

  // 対応分類
  let correspondence, autoCorrect, issues=[];

  if (sameLabel.length > 0) {
    correspondence = 'structural_review_required';
    autoCorrect = false;
    issues.push(`節内に同じラベル「${ja}」が${sameLabel.length}件存在: ${sameLabel.map(t=>t.ref).join(', ')}`);
  } else if (countInVerse > 1) {
    correspondence = 'uncertain';
    autoCorrect = false;
    issues.push(`節テキストに「${cleanJa}」が${countInVerse}回出現`);
  } else if (countInVerse === 1) {
    correspondence = 'explicit';
    autoCorrect = true;
  } else if (token.matchType === 'kanji') {
    // kanji matchで直接一致がない
    correspondence = 'implicit';
    autoCorrect = true; // kanji matchは意図的な設計
    const k = cleanJa.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
    issues.push(`漢字「${k}」での間接マッチ`);
  } else {
    correspondence = 'none';
    autoCorrect = false;
    issues.push(`節テキストに「${cleanJa}」が見当たらない（containsBase=trueだが直接なし）`);
  }

  return {
    correspondence, autoCorrect, issues,
    context, verseText: vt?.slice(0,100), verseTokenCount: verseTokens.length,
    sameLabels: sameLabel.map(t=>({ref:t.ref, strong:t.strong, japanese:t.japanese})),
  };
}

const stage3Results = {};
const summaryStats = { explicit:0, implicit:0, structural:0, uncertain:0, none:0, autoCorrect:0, autoIncorrect:0 };

for (const [k, tokens] of Object.entries(stage3Sample)) {
  stage3Results[k] = { stratum:k, label:STRATA_DEF[k].label, tokens:[] };
  for (const tok of tokens) {
    const eval_ = analyzeToken(tok, k);
    const rec = { ...tok, stratum:k, ...eval_ };
    stage3Results[k].tokens.push(rec);
    summaryStats[eval_.correspondence.replace('structural_review_required','structural')]
      = (summaryStats[eval_.correspondence.replace('structural_review_required','structural')]||0)+1;
    if (eval_.autoCorrect) summaryStats.autoCorrect++;
    else summaryStats.autoIncorrect++;
  }
  const stratSummary = stage3Results[k].tokens.reduce((acc,t)=>{
    const c=t.correspondence.replace('structural_review_required','SR');
    acc[c]=(acc[c]||0)+1; return acc;
  },{});
  console.log(`${k}: ${tokens.length}件 → ${JSON.stringify(stratSummary)}`);
}

console.log('\n全体サマリー:', summaryStats);
console.log('自動判定正確率:', (summaryStats.autoCorrect/totalSample*100).toFixed(1)+'%');

// ── 出力 ─────────────────────────────────────────────────────────────────
const output = {
  meta: {
    title: 'Stage 3 設計・初回サンプル分析',
    generatedAt: new Date().toISOString().slice(0,10),
    poolTotal: allPoolTokens.length,
    sampleTotal: totalSample,
    constraints: ['聖書JSON変更なし','token.japanese変更なし','既存ledger変更なし'],
  },
  additionalBlacklistCandidates: suAnalysis,
  suBlacklistCandidates,
  semanticGroupAssignment: groupAssignment,
  samplingDesign: {
    strata: Object.fromEntries(Object.entries(STRATA_DEF).map(([k,v])=>([k,{
      label:v.label, poolSize: strataPool[k].length, target:v.target,
      selected: stage3Sample[k].length,
    }]))),
    totalSample,
  },
  results: stage3Results,
  summary: summaryStats,
};

fs.writeFileSync(path.join(OUT_DIR,'stage3-initial-sample.json'), JSON.stringify(output, null, 2), 'utf8');
console.log(`\nOutput: ${path.join(OUT_DIR,'stage3-initial-sample.json')}`);
