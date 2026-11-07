#!/usr/bin/env node
/**
 * audit-stage3-s7-sample.cjs — Stage 3 S7 初回サンプル監査（554件）
 *
 * S7a(34) + S7b(82) + S7c(343) + S7d(87) + S7e(8) = 554件
 * 各層: Strong分散 + 書巻分散の層化抽出
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
  const a = Array.isArray(t)?t:Object.values(t);
  return a.filter(x=>String(x.verse)===String(verse));
}

// ── データ読み込み ─────────────────────────────────────────────────────────
console.log('データ読み込み中...');
const stage3Pool = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const allPoolTokens = stage3Pool.allTokens;
console.log(`Pool: ${allPoolTokens.length}件`);

// ── 固定層定義 ─────────────────────────────────────────────────────────────
const S1_STRONGS = new Set(['G2424','G5547']);
const S2_STRONGS = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS = new Set(['G444','G80','G3101','G1135','G5043']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);

const poolByStrong = {};
for (const tok of allPoolTokens) poolByStrong[tok.strong]=(poolByStrong[tok.strong]||0)+1;

const S5_STRONGS = new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n>=200&&!S1_STRONGS.has(s)&&!S2_STRONGS.has(s)&&!S3_STRONGS.has(s)&&!S4_STRONGS.has(s))
  .map(([s])=>s));
const definedStrongs = new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS,...S5_STRONGS]);
const S6_STRONGS = new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n<20&&!definedStrongs.has(s)).map(([s])=>s));

// S7 サブ層定義（wordClass 小文字）
const S7_WC = {
  S7a: new Set(['prep','adv','adverb','particle','part','conj','conj.','conj-coord','conj-subord','cond','interj','interjection']),
  S7b: new Set(['verb']),
  S7c: new Set(['noun']),
  S7d: new Set(['adj','adjective','pronoun','pron']),
  S7e: new Set(['other','unknown','','undefined']),
};

function assignS7(tok) {
  const wc = (tok.wordClass||'other').toLowerCase().trim();
  for (const [sub,wcs] of Object.entries(S7_WC)) {
    if (wcs.has(wc)) return sub;
  }
  return 'S7e';
}

function getLayer(tok) {
  const s=tok.strong;
  if (S1_STRONGS.has(s))return'S1'; if(S2_STRONGS.has(s))return'S2';
  if (S3_STRONGS.has(s))return'S3'; if(S4_STRONGS.has(s))return'S4';
  if (S5_STRONGS.has(s))return'S5'; if(S6_STRONGS.has(s))return'S6';
  return assignS7(tok);
}

// S7 トークンを取得
const s7Tokens = { S7a:[], S7b:[], S7c:[], S7d:[], S7e:[] };
for (const tok of allPoolTokens) {
  const l = getLayer(tok);
  if (l.startsWith('S7')) s7Tokens[l].push(tok);
}
for (const [l,toks] of Object.entries(s7Tokens)) {
  console.log(`${l}: ${toks.length}件, ${new Set(toks.map(t=>t.strong)).size}種Strong`);
}

// ── サンプリング ─────────────────────────────────────────────────────────
// Strong分散 + 書巻分散の層化抽出
const S7_TARGET = { S7a:34, S7b:82, S7c:343, S7d:87, S7e:8 };

function selectSample(tokens, targetN, seed) {
  // Strong ごとにグループ化
  const byStrong = {};
  for (const t of tokens) {
    if(!byStrong[t.strong]) byStrong[t.strong]=[];
    byStrong[t.strong].push(t);
  }
  const strongs = Object.keys(byStrong).sort();
  const nStrong = strongs.length;

  // 各 Strong への割り当て: floor(targetN/nStrong) + 余りを件数上位に配分
  const base = Math.floor(targetN / nStrong);
  const extra = targetN - base * nStrong;

  // Strong を件数降順でソート（多い Strong により多く割り当て）
  const strongsSorted = [...strongs].sort((a,b)=>(byStrong[b]||[]).length-(byStrong[a]||[]).length);
  const allocation = {};
  strongsSorted.forEach((s,i) => { allocation[s] = base + (i < extra ? 1 : 0); });

  // 各 Strong 内で書巻分散して抽出
  const result = [];
  const seenRefs = new Set();

  for (const s of strongs) {
    const n = allocation[s] || 0;
    if (n === 0) continue;
    const stoks = byStrong[s];
    if (!stoks || stoks.length === 0) continue;

    // 書巻グループ化
    const byBook = {};
    for (const t of stoks) {
      const bk = t.ref.split(' ')[0];
      if (!byBook[bk]) byBook[bk]=[];
      byBook[bk].push(t);
    }
    const books = Object.keys(byBook).sort();

    // ラウンドロビンで書巻を選択
    const picked = [];
    for (let i=0; picked.length<Math.min(n,stoks.length); i++) {
      const bk = books[(i * 3 + seed + s.charCodeAt(1)) % books.length];
      const cands = (byBook[bk]||[]).filter(t=>!seenRefs.has(t.ref)&&!picked.find(p=>p.ref===t.ref));
      if (cands.length>0) {
        const t = cands[(i * 7 + seed) % cands.length];
        picked.push(t);
        seenRefs.add(t.ref);
      } else {
        // fallback: 任意書巻から取る
        const allCands = stoks.filter(t=>!seenRefs.has(t.ref)&&!picked.find(p=>p.ref===t.ref));
        if (allCands.length>0) {
          const t = allCands[(i * 13 + seed) % allCands.length];
          picked.push(t);
          seenRefs.add(t.ref);
        } else break;
      }
    }
    result.push(...picked);
  }

  // targetN に満たない場合は補填
  if (result.length < targetN) {
    const remaining = tokens.filter(t=>!seenRefs.has(t.ref));
    for (let i=0; result.length<targetN&&i<remaining.length; i++) {
      result.push(remaining[i]);
      seenRefs.add(remaining[i].ref);
    }
  }

  return result.slice(0, targetN);
}

// 各サブ層のサンプルを生成
const samples = {};
for (const [sub, target] of Object.entries(S7_TARGET)) {
  samples[sub] = selectSample(s7Tokens[sub], target, sub.charCodeAt(2));
  console.log(`${sub}: ${samples[sub].length}件選定`);
}

// ── トークン分析 ─────────────────────────────────────────────────────────
function analyzeToken(tok) {
  const r = parseRef(tok.ref);
  if (!r) return { correspondence:'uncertain', reason:'ref解析不能', autoCorrect:false };

  const vt = loadJA(r.book,r.ch)[r.v]||null;
  const verseTokens = getVerseTokens(r.book,r.ch,r.v);
  const ja = tok.japanese||'';
  const cleanJa = strip(ja);

  if (!vt) return { correspondence:'uncertain', reason:'JA1955節テキストなし', autoCorrect:false, verseText:null };

  const sameLabel = verseTokens.filter(t=>t.ref!==tok.ref&&(t.japanese||'')===ja);
  const cntDirect = cleanJa ? (vt.split(cleanJa).length-1) : 0;

  // 漢字抽出
  const kanji = cleanJa
    .replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  const hasKanjiMatch = kanji.length>=2 && vt.includes(kanji) && !vt.includes(cleanJa);
  const cntKanji = kanji.length>=2 ? (vt.split(kanji).length-1) : 0;

  let correspondence, reason='', autoCorrect=false;

  if (sameLabel.length > 0) {
    correspondence = 'structural_review_required';
    reason = `節内に同じラベル「${ja}」が他に${sameLabel.length}件（${sameLabel.slice(0,2).map(t=>t.ref+'='+t.strong).join(', ')}）`;
  } else if (cntDirect > 1) {
    correspondence = 'uncertain';
    reason = `節テキストに「${cleanJa}」が${cntDirect}回出現（同ラベル他トークンなし）`;
  } else if (cntDirect === 1) {
    correspondence = 'explicit';
    reason = '';
    autoCorrect = true;
  } else if (hasKanjiMatch) {
    if (cntKanji > 1) {
      correspondence = 'uncertain';
      reason = `漢字「${kanji}」が節内${cntKanji}回出現`;
    } else {
      correspondence = 'implicit';
      reason = `直接一致なし。漢字「${kanji}」で間接マッチ`;
      autoCorrect = true;
    }
  } else {
    // containsBase() は通ったが再確認で一致なし（レアケース）
    correspondence = 'none';
    reason = `再確認で対応なし（cleanJa=${cleanJa||'空'}, kanji=${kanji||'空'}）`;
  }

  // コンテキスト（前後2トークン）
  const sortedVT = [...verseTokens].sort((a,b)=>(parseInt(a.globalIdx||0)-parseInt(b.globalIdx||0)));
  const selfIdx = sortedVT.findIndex(t=>t.ref===tok.ref);
  const ctxTokens = sortedVT.slice(Math.max(0,selfIdx-2),selfIdx+3)
    .map(t=>({ref:t.ref,text:t.text||'',jp:t.japanese||'',strong:t.strong||''}));

  return {
    correspondence, reason, autoCorrect,
    verseText: (vt||'').slice(0,120),
    sameLabel: sameLabel.map(t=>({ref:t.ref,strong:t.strong,jp:t.japanese})),
    matchInfo: { cntDirect, hasKanjiMatch, cntKanji, cleanJa, kanji },
    context: ctxTokens,
  };
}

// ── 全サンプル分析実行 ─────────────────────────────────────────────────────
console.log('\n分析開始...');
const results = {};
const allResults = [];

for (const [sub, sampleToks] of Object.entries(samples)) {
  results[sub] = [];
  for (const tok of sampleToks) {
    const eval_ = analyzeToken(tok);
    const rec = {
      ref: tok.ref, strong: tok.strong, text: tok.text||'',
      japanese: tok.japanese||'', wordClass: tok.wordClass||'',
      morph: tok.morph||'', matchType: tok.matchType||'',
      stratum: sub, ...eval_,
    };
    results[sub].push(rec);
    allResults.push(rec);
  }
  // サブ層別集計
  const counts = results[sub].reduce((acc,r)=>{
    acc[r.correspondence]=(acc[r.correspondence]||0)+1; return acc;
  },{});
  const n = results[sub].length;
  const srRate = ((counts.structural_review_required||0)/n*100).toFixed(1);
  const noneN = counts.none||0;
  console.log(`${sub}(${n}件): explicit=${counts.explicit||0} implicit=${counts.implicit||0} SR=${counts.structural_review_required||0}(${srRate}%) uncertain=${counts.uncertain||0} none=${noneN}`);
}

// ── 集計 ─────────────────────────────────────────────────────────────────
function summarize(recs) {
  const corr = { explicit:0, implicit:0, structural_review_required:0, uncertain:0, none:0 };
  for (const r of recs) corr[r.correspondence]=(corr[r.correspondence]||0)+1;
  const n = recs.length;
  const autoCorrect = recs.filter(r=>r.autoCorrect).length;
  return {
    n, ...corr,
    srRate: n>0 ? (corr.structural_review_required/n*100).toFixed(1)+'%' : '0%',
    explicitRate: n>0 ? ((corr.explicit+corr.implicit)/n*100).toFixed(1)+'%' : '0%',
    noneRate: n>0 ? (corr.none/n*100).toFixed(1)+'%' : '0%',
    autoCorrect,
    autoCorrectRate: n>0 ? (autoCorrect/n*100).toFixed(1)+'%' : '0%',
  };
}

const subSummary = {};
for (const [sub,recs] of Object.entries(results)) subSummary[sub]=summarize(recs);
const totalSummary = summarize(allResults);

// Strong別集計
const byStrongMap = {};
for (const r of allResults) {
  if (!byStrongMap[r.strong]) byStrongMap[r.strong]={strong:r.strong,japanese:r.japanese,layer:r.stratum,n:0,explicit:0,implicit:0,sr:0,uncertain:0,none:0};
  byStrongMap[r.strong].n++;
  const c=r.correspondence.replace('structural_review_required','sr');
  byStrongMap[r.strong][c]=((byStrongMap[r.strong][c]||0))+1;
}

// 書巻別集計
const byBookMap = {};
for (const r of allResults) {
  const bk = r.ref.split(' ')[0];
  if (!byBookMap[bk]) byBookMap[bk]={book:bk,n:0,explicit:0,implicit:0,sr:0,uncertain:0,none:0};
  byBookMap[bk].n++;
  const c=r.correspondence.replace('structural_review_required','sr');
  byBookMap[bk][c]=((byBookMap[bk][c]||0))+1;
}

// 誤判定（SR・none・uncertain）の具体例（各層最大5件）
const issues = {};
for (const [sub,recs] of Object.entries(results)) {
  issues[sub] = recs.filter(r=>r.correspondence!=='explicit'&&r.correspondence!=='implicit')
    .slice(0,8)
    .map(r=>({ref:r.ref,strong:r.strong,japanese:r.japanese,correspondence:r.correspondence,reason:r.reason,verseText:(r.verseText||'').slice(0,80)}));
}

// ── 全件処理への進行判定 ─────────────────────────────────────────────────
const THRESHOLD = { S7a:20, S7b:30, S7c:25, S7d:30, S7e:Infinity };
const passResults = {};
for (const [sub,summ] of Object.entries(subSummary)) {
  const srNum = parseFloat(summ.srRate);
  const noneN = summ.none||0;
  const pass = srNum <= THRESHOLD[sub] && noneN === 0;
  passResults[sub] = {
    srRate: summ.srRate, threshold: THRESHOLD[sub]+'%',
    noneCount: noneN, pass,
    // 95%信頼区間（Wilson score interval）
    ci95: (() => {
      const n=summ.n; const p=srNum/100;
      const z=1.96;
      const denom = 1 + z*z/n;
      const center = (p + z*z/(2*n)) / denom;
      const halfWidth = z * Math.sqrt(p*(1-p)/n + z*z/(4*n*n)) / denom;
      return `${Math.max(0,((center-halfWidth)*100)).toFixed(1)}%〜${Math.min(100,((center+halfWidth)*100)).toFixed(1)}%`;
    })(),
    verdict: pass ? '全件処理可' : 'SR率超過または none>0 → 要再設計',
  };
}
console.log('\n進行判定:');
for (const [sub,r] of Object.entries(passResults)) {
  console.log(`  ${sub}: SR=${r.srRate}(閾値${r.threshold}) none=${r.noneCount} ${r.pass?'PASS ✓':'FAIL ✗'} 95%CI=${r.ci95}`);
}

// ── サンプリング設計の記録 ─────────────────────────────────────────────────
const samplingRecord = {};
for (const [sub,sampleToks] of Object.entries(samples)) {
  const byStrong = {}; const byBook = {};
  for (const t of sampleToks) {
    byStrong[t.strong]=(byStrong[t.strong]||0)+1;
    const bk=t.ref.split(' ')[0]; byBook[bk]=(byBook[bk]||0)+1;
  }
  samplingRecord[sub] = {
    targetN: S7_TARGET[sub], actualN: sampleToks.length,
    strongCount: Object.keys(byStrong).length,
    poolStrongCount: new Set(s7Tokens[sub].map(t=>t.strong)).size,
    poolTokenCount: s7Tokens[sub].length,
    method: 'Strong分散×書巻分散 層化抽出（各Strong内でラウンドロビン書巻選択）',
    strongAllocation: Object.fromEntries(Object.entries(byStrong).sort((a,b)=>b[1]-a[1]).slice(0,15)),
    bookDistribution: Object.fromEntries(Object.entries(byBook).sort((a,b)=>b[1]-a[1]).slice(0,10)),
  };
}

// ── 出力 ─────────────────────────────────────────────────────────────────
const output = {
  meta: {
    title: 'Stage 3 S7 初回サンプル監査（554件）',
    generatedAt: new Date().toISOString().slice(0,10),
    totalSample: allResults.length,
    constraints: ['聖書JSON変更なし','japanese変更案作成なし','既存承認済みデータ変更なし','既存成果物上書きなし'],
  },
  samplingRecord,
  summary: { bySubLayer: subSummary, total: totalSummary },
  progressJudgment: passResults,
  byStrong: Object.values(byStrongMap).sort((a,b)=>b.n-a.n),
  byBook: Object.values(byBookMap).sort((a,b)=>b.n-a.n),
  issues,
  results,
};

const outPath = path.join(OUT_DIR,'stage3-s7-sample.json');
fs.writeFileSync(outPath, JSON.stringify(output,null,2),'utf8');
console.log(`\nOutput: ${outPath}`);
