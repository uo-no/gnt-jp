#!/usr/bin/env node
/**
 * audit-stage3-s7-consistency.cjs
 * Stage 3 S7 最終整合性確認（読み取り専用）
 *
 * 確認項目:
 *  §1  S7a/S7d 再分類 574件の一意性・整合性
 *  §2  S7a 再サンプル 34件の詳細（Strong別・書巻別・SR内訳・95%CI）
 *  §3  S7d 118件の構成明確化（重複確認・Strong別・書巻別・対応内訳）
 *  §4  クロス Strong 衝突 10件の完全一覧
 *  §5  同 Strong 内重複 63件の正確な集計（ペア数・token数・節数）
 *  §6  自動照合改善案の設計
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
function parseRef(r){const m=r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);return m?{book:m[1],ch:m[2],v:m[3],idx:m[4]}:null;}
const chCache=new Map();
function loadCh(book,ch){
  const k=`${book}/${ch}`;
  if(!chCache.has(k)){
    try{chCache.set(k,JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8')));}
    catch{chCache.set(k,[]);}
  }
  return chCache.get(k);
}
const jaCache=new Map();
function loadJA(book,ch){
  const k=`${book}/${ch}`;
  if(!jaCache.has(k)){
    try{jaCache.set(k,JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{});}
    catch{jaCache.set(k,{});}
  }
  return jaCache.get(k);
}
function getVerseTokens(book,ch,verse){
  const t=loadCh(book,ch);
  const a=Array.isArray(t)?t:Object.values(t);
  return a.filter(x=>String(x.verse)===String(verse));
}

// ── データ読み込み ────────────────────────────────────────────────────────
console.log('読み込み中...');
const pool3      = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const prevSample = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-s7-sample.json'),'utf8'));
const reclassy   = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-s7-reclassify.json'),'utf8'));
const allPool    = pool3.allTokens;

const BLACKLIST = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);
const S1_STRONGS = new Set(['G2424','G5547']);
const S2_STRONGS = new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS = new Set(['G444','G80','G3101','G1135','G5043']);

const poolByStrong={};
for(const t of allPool) poolByStrong[t.strong]=(poolByStrong[t.strong]||0)+1;
const S5_STRONGS=new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n>=200&&!S1_STRONGS.has(s)&&!S2_STRONGS.has(s)&&!S3_STRONGS.has(s)&&!S4_STRONGS.has(s))
  .map(([s])=>s));
const definedStrongs=new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS,...S5_STRONGS]);
const S6_STRONGS=new Set(Object.entries(poolByStrong)
  .filter(([s,n])=>n<20&&!definedStrongs.has(s))
  .map(([s])=>s));

// οὗτος 移動 Strong
const OUTHTOS = new Set(['G3778','G5023','G5026','G5124','G5126','G5127','G5129','G5130']);

function assignLayer(tok){
  const s=tok.strong;
  if(S1_STRONGS.has(s))return'S1'; if(S2_STRONGS.has(s))return'S2';
  if(S3_STRONGS.has(s))return'S3'; if(S4_STRONGS.has(s))return'S4';
  if(S5_STRONGS.has(s))return'S5'; if(S6_STRONGS.has(s))return'S6';
  if(OUTHTOS.has(s))return'S7d';
  const wc=(tok.wordClass||'').toLowerCase().trim();
  if(['prep','adv','adverb','particle','part','conj','conj.','conj-coord','conj-subord','cond','interj','interjection'].includes(wc))return'S7a';
  if(wc==='verb')return'S7b';
  if(wc==='noun')return'S7c';
  if(['adj','adjective','pronoun','pron'].includes(wc))return'S7d';
  return'S7e';
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §1: S7a/S7d 再分類 574件の整合性 ===');

// 全 pool を再集計
const layerBuckets={S1:[],S2:[],S3:[],S4:[],S5:[],S6:[],S7a:[],S7b:[],S7c:[],S7d:[],S7e:[]};
for(const t of allPool) layerBuckets[assignLayer(t)].push(t);

// S7a の ref 一覧
const s7aRefs = new Set(layerBuckets.S7a.map(t=>t.ref));
const s7dRefs = new Set(layerBuckets.S7d.map(t=>t.ref));

// 移動対象の確認
const movedTokens = allPool.filter(t=>OUTHTOS.has(t.strong));
const movedRefs   = movedTokens.map(t=>t.ref);
const movedRefSet = new Set(movedRefs);

// 一意性チェック
const dupMoved = movedRefs.filter((r,i)=>movedRefs.indexOf(r)!==i);
console.log(`移動対象 ${movedTokens.length}件, ref重複: ${dupMoved.length}件`);

// Strong別内訳
const movedByStrong={};
for(const t of movedTokens) movedByStrong[t.strong]=(movedByStrong[t.strong]||0)+1;
console.log('Strong別:');
Object.entries(movedByStrong).sort((a,b)=>b[1]-a[1]).forEach(([s,c])=>{
  const info=allPool.find(t=>t.strong===s);
  console.log(`  ${s}(${info?.japanese||'?'}): ${c}件`);
});

// S7全体の整合性
const s7total = layerBuckets.S7a.length+layerBuckets.S7b.length+layerBuckets.S7c.length
               +layerBuckets.S7d.length+layerBuckets.S7e.length;
console.log(`\nS7合計: ${s7total} (期待値: 13103, 差: ${s7total-13103})`);
console.log(`  S7a: ${layerBuckets.S7a.length} (期待: 532)`);
console.log(`  S7b: ${layerBuckets.S7b.length} (期待: 1622)`);
console.log(`  S7c: ${layerBuckets.S7c.length} (期待: 8566)`);
console.log(`  S7d: ${layerBuckets.S7d.length} (期待: 2308)`);
console.log(`  S7e: ${layerBuckets.S7e.length} (期待: 75)`);

// S1〜S6との重複チェック
const otherLayers=new Set([...layerBuckets.S1,...layerBuckets.S2,...layerBuckets.S3,
  ...layerBuckets.S4,...layerBuckets.S5,...layerBuckets.S6].map(t=>t.ref));
const s7allRefs=[...layerBuckets.S7a,...layerBuckets.S7b,...layerBuckets.S7c,
  ...layerBuckets.S7d,...layerBuckets.S7e].map(t=>t.ref);
const overlapS1S6=s7allRefs.filter(r=>otherLayers.has(r));
console.log(`S1〜S6との重複: ${overlapS1S6.length}件`);

// 全体等式
const grandTotal=Object.values(layerBuckets).reduce((s,v)=>s+v.length,0);
console.log(`\n全体: ${grandTotal} (期待: 28219, 差: ${grandTotal-28219})`);

// S7aの全Strong一覧（確認用）
const s7aStrongs=new Map();
for(const t of layerBuckets.S7a){
  if(!s7aStrongs.has(t.strong)) s7aStrongs.set(t.strong,{japanese:t.japanese,count:0,wc:t.wordClass});
  s7aStrongs.get(t.strong).count++;
}
console.log('\nS7a全Strong(変更後):');
[...s7aStrongs.entries()].sort((a,b)=>b[1].count-a[1].count).forEach(([s,v])=>{
  console.log(`  ${s}(${v.japanese}) wc=${v.wc} n=${v.count}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §2: S7a 再サンプル 34件の詳細 ===');

const s7aNewResults = reclassy.task2_resampling.s7a.results;
console.log(`サンプル数: ${s7aNewResults.length}`);

// Strong別: 母数 vs 抽出数
const s7aByStrongCount={};
for(const t of layerBuckets.S7a) s7aByStrongCount[t.strong]=(s7aByStrongCount[t.strong]||0)+1;
const s7aSampleByStrong={};
for(const r of s7aNewResults) s7aSampleByStrong[r.strong]=(s7aSampleByStrong[r.strong]||0)+1;

console.log('\nStrong別 母数vs抽出:');
Object.entries(s7aByStrongCount).sort((a,b)=>b[1]-a[1]).forEach(([s,n])=>{
  const sm=s7aSampleByStrong[s]||0;
  const info=layerBuckets.S7a.find(t=>t.strong===s);
  console.log(`  ${s}(${info?.japanese||'?'}): pool=${n}, sample=${sm}`);
});

// 書巻別の抽出
const s7aSampleByBook={};
for(const r of s7aNewResults){
  const bk=r.ref.split(' ')[0];
  s7aSampleByBook[bk]=(s7aSampleByBook[bk]||0)+1;
}
console.log('\n書巻別:');
Object.entries(s7aSampleByBook).sort((a,b)=>b[1]-a[1]).forEach(([b,c])=>console.log(`  ${b}: ${c}`));

// 7件SR
const s7aSR=s7aNewResults.filter(r=>r.correspondence==='structural_review_required');
console.log(`\nSR ${s7aSR.length}件:`);
s7aSR.forEach(r=>{
  const sameStrongDup=(r.sameLabel||[]).filter(sl=>sl.strong===r.strong).length;
  const crossSt=(r.sameLabel||[]).filter(sl=>sl.strong!==r.strong);
  const kind=crossSt.length>0
    ? `クロスStrong(${crossSt.map(c=>c.strong).join(',')})`
    : `同Strong反復(${sameStrongDup}件)`;
  const blNote=crossSt.some(c=>BLACKLIST.has(c.strong))?'[BL]':'';
  console.log(`  ${r.ref} ${r.strong}(${r.japanese}) → ${kind}${blNote}`);
});

// 95% 信頼区間 (Wilson)
function wilsonCI(k,n,z=1.96){
  const p=k/n;
  const denom=1+z*z/n;
  const center=(p+z*z/(2*n))/denom;
  const margin=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/denom;
  return{lower:Math.max(0,center-margin),upper:Math.min(1,center+margin)};
}
const ci=wilsonCI(7,34);
console.log(`\n95% CI (Wilson): [${(ci.lower*100).toFixed(1)}%, ${(ci.upper*100).toFixed(1)}%] (点推定: ${(7/34*100).toFixed(1)}%)`);
console.log(`閾値 20% は CI の中に含まれる: ${ci.lower*100<20&&20<ci.upper*100?'YES（FAIL/PASSは統計的に不確定）':'NO'}`);

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §3: S7d 118件の構成 ===');

const existingS7dResults = prevSample.results.S7d;
const addedS7dResults    = reclassy.task2_resampling.s7d.addedResults;
const movedFromS7a       = prevSample.results.S7a.filter(r=>OUTHTOS.has(r.strong));

console.log(`既存S7dサンプル: ${existingS7dResults.length}件`);
console.log(`S7aから移動(初回サンプル内): ${movedFromS7a.length}件`);
console.log(`追加サンプル(新規抽出): ${addedS7dResults.length}件`);
console.log(`合計: ${existingS7dResults.length+movedFromS7a.length+addedS7dResults.length}件`);

// ref の重複チェック
const d118refs=[...existingS7dResults,...movedFromS7a,...addedS7dResults].map(r=>r.ref);
const dupD118=d118refs.filter((r,i)=>d118refs.indexOf(r)!==i);
console.log('ref 重複: '+dupD118.length+'件'+(dupD118.length>0?(' → '+dupD118.join(', ')):''));

// 118件全体の対応分類
function sumCorr(recs){
  const c={explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0};
  for(const r of recs) c[r.correspondence]=(c[r.correspondence]||0)+1;
  return c;
}
const c87=sumCorr(existingS7dResults);
const cMoved=sumCorr(movedFromS7a);
const cAdded=sumCorr(addedS7dResults);
const cAll=sumCorr([...existingS7dResults,...movedFromS7a,...addedS7dResults]);
console.log('\n対応分類内訳:');
console.log('                   explicit  implicit  SR  uncertain  none');
console.log(`  既存87件:         ${String(c87.explicit).padStart(7)} ${String(c87.implicit).padStart(8)} ${String(c87.structural_review_required).padStart(3)} ${String(c87.uncertain).padStart(9)} ${c87.none}`);
console.log(`  移動15件(S7a→):   ${String(cMoved.explicit).padStart(7)} ${String(cMoved.implicit).padStart(8)} ${String(cMoved.structural_review_required).padStart(3)} ${String(cMoved.uncertain).padStart(9)} ${cMoved.none}`);
console.log(`  追加16件(新規):   ${String(cAdded.explicit).padStart(7)} ${String(cAdded.implicit).padStart(8)} ${String(cAdded.structural_review_required).padStart(3)} ${String(cAdded.uncertain).padStart(9)} ${cAdded.none}`);
console.log(`  統合118件:        ${String(cAll.explicit).padStart(7)} ${String(cAll.implicit).padStart(8)} ${String(cAll.structural_review_required).padStart(3)} ${String(cAll.uncertain).padStart(9)} ${cAll.none}`);
const srRate=(cAll.structural_review_required/118*100).toFixed(1);
console.log(`  SR率: ${srRate}%`);

// 118件の構成方法の明記
console.log('\n[構成方法の説明]');
console.log('  118件はプールに比例した再抽出ではなく、以下の3グループの和集合(union):');
console.log('  Group A: 初回サンプル S7d 87件（変更前サンプルの再利用、移動前S7d母集団より）');
console.log('  Group B: 初回サンプル S7a 34件のうち οὗτος 形 15件（移動後 S7d へ再帰属）');
console.log('  Group C: 移動した8種Strong（574件）から新規16件追加抽出（初回未サンプル Strong を優先）');
console.log('  ⚠ Group A+B は旧S7d母集団(1734件)からのサンプル、Group C は移動分(574件)からのサンプル');
console.log('  ⚠ 母集団が統合後(2308件)に対応する proportional re-sampling ではない');

// Strong別の抽出状況
const d118BySt={};
for(const r of [...existingS7dResults,...movedFromS7a,...addedS7dResults]){
  if(!d118BySt[r.strong]) d118BySt[r.strong]={n:0,pool:0,src:[]};
  d118BySt[r.strong].n++;
  d118BySt[r.strong].src.push(OUTHTOS.has(r.strong)?'moved':'existing');
}
for(const t of layerBuckets.S7d) (d118BySt[t.strong]||(d118BySt[t.strong]={n:0,pool:0,src:[]})).pool++;
console.log('\nS7d Strong別(抽出>0のもの):');
Object.entries(d118BySt).filter(([,v])=>v.n>0).sort((a,b)=>b[1].n-a[1].n).forEach(([s,v])=>{
  const info=layerBuckets.S7d.find(t=>t.strong===s);
  const tag=OUTHTOS.has(s)?'[moved]':'';
  console.log(`  ${s}(${info?.japanese||'?'})${tag}: pool=${v.pool}, sample=${v.n}`);
});

// 書巻別
const d118ByBook={};
for(const r of [...existingS7dResults,...movedFromS7a,...addedS7dResults]){
  const bk=r.ref.split(' ')[0];
  d118ByBook[bk]=(d118ByBook[bk]||0)+1;
}
console.log('\n書巻別:');
Object.entries(d118ByBook).sort((a,b)=>b[1]-a[1]).forEach(([b,c])=>console.log(`  ${b}: ${c}`));

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §4: クロス Strong 衝突 10件の完全一覧 ===');

const allPrevResults = Object.values(prevSample.results).flat();
const crossCollisions=[];

for(const r of allPrevResults){
  if(r.correspondence!=='structural_review_required') continue;
  const sameLabelArr=r.sameLabel||[];
  const crossArr=sameLabelArr.filter(sl=>sl.strong!==r.strong);
  if(crossArr.length>0){
    const parsed=parseRef(r.ref);
    const vt=parsed?loadJA(parsed.book,parsed.ch)[parsed.v]||'':'' ;
    const vtoks=parsed?getVerseTokens(parsed.book,parsed.ch,parsed.v):[];
    crossCollisions.push({
      ref:r.ref, strong:r.strong, japanese:r.japanese, greekText:r.text||'',
      stratum:r.stratum,
      conflicts:crossArr.map(sl=>{
        const partnerTok=vtoks.find(t=>t.ref===sl.ref);
        return{
          ref:sl.ref, strong:sl.strong, japanese:sl.jp,
          greekText:partnerTok?.text||sl.ref,
          inBL:BLACKLIST.has(sl.strong), inS4:S4_STRONGS.has(sl.strong),
        };
      }),
      sameStrongCount:sameLabelArr.filter(sl=>sl.strong===r.strong).length,
      verseText:vt.slice(0,150),
    });
  }
}
console.log(`クロス Strong 衝突: ${crossCollisions.length}件`);

// 重複 ref の確認（同じ ref が複数回 cross として出るケース）
const crossRefs=crossCollisions.map(c=>c.ref);
const dupCross=crossRefs.filter((r,i)=>crossRefs.indexOf(r)!==i);
console.log(`ref 重複（相互衝突を含む）: ${dupCross.join(', ')||'なし'}`);

crossCollisions.forEach((c,i)=>{
  const blTag=c.conflicts.some(x=>x.inBL)?'[BL]':'';
  const s4Tag=c.conflicts.some(x=>x.inS4)?'[S4]':'';
  const ssDupTag=c.sameStrongCount>0?`[+同Strong×${c.sameStrongCount}]`:'';
  console.log(`\n[${i+1}] ${c.ref} (${c.stratum}) ${blTag}${s4Tag}${ssDupTag}`);
  console.log(`  自Strong: ${c.strong}(${c.japanese}) ギリシャ語: ${c.greekText}`);
  c.conflicts.forEach(x=>{
    console.log(`  衝突先:   ${x.strong}(${x.japanese}) ギリシャ語: ${x.greekText} BL:${x.inBL} S4:${x.inS4}`);
  });
  console.log(`  JA1955:   ${c.verseText}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §5: 同 Strong 内重複 63件の正確な集計 ===');

const sameStrongSR=[];
for(const r of allPrevResults){
  if(r.correspondence!=='structural_review_required') continue;
  const sameLabelArr=r.sameLabel||[];
  const ssDup=sameLabelArr.filter(sl=>sl.strong===r.strong);
  const crossArr=sameLabelArr.filter(sl=>sl.strong!==r.strong);
  // 純粋に「同Strongのみ」(cross=0 or both)
  if(ssDup.length>0){
    sameStrongSR.push({ref:r.ref,strong:r.strong,japanese:r.japanese,stratum:r.stratum,
      dupPartners:ssDup.map(s=>s.ref),crossPartners:crossArr.map(s=>s.strong),
      hasCross:crossArr.length>0});
  }
}

// — token ref 数（SR かつ同 Strong dup があるもの = sameStrongSR.length）
// — collision pair 数: 各 SR トークン の dupPartners 数の合計 / 2（双方向カウントの場合）
// — verse 数
const ssVerses=new Set(sameStrongSR.map(r=>{const p=parseRef(r.ref);return p?`${p.book}/${p.ch}/${p.v}`:r.ref;}));
const ssPairCandidates=sameStrongSR.reduce((s,r)=>s+r.dupPartners.length,0);
// ssPairCandidates = Σ(dupPartners per token).
// 各ペア (A,B) は A が B を、B が A を dupPartner として挙げるので /2 が純ペア数
// ただしA→B, B→AがどちらもSRかどうか確認
const ssPairCount = ssPairCandidates / 2;

console.log(`\n同 Strong 内重複の集計:`);
console.log(`  SR トークン数（dupPartner≥1）: ${sameStrongSR.length}件`);
console.log(`  衝突ペア数（≈token数/2）:       ${Math.round(ssPairCount)}件`);
console.log(`  衝突節数（ユニーク節）:           ${ssVerses.size}件`);
console.log(`  うち cross-Strong も併発:        ${sameStrongSR.filter(r=>r.hasCross).length}件`);

// 全件一覧（Strong, verse でソート）
console.log('\n同 Strong 内重複 全件一覧:');
const ssSorted=[...sameStrongSR].sort((a,b)=>a.strong.localeCompare(b.strong)||a.ref.localeCompare(b.ref));
ssSorted.forEach(r=>{
  const crossTag=r.hasCross?`[+cross:${r.crossPartners.join(',')}]`:'';
  console.log(`  ${r.ref} ${r.strong}(${r.japanese}) [${r.stratum}] dup:${r.dupPartners.join('/')} ${crossTag}`);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== §6: 自動照合改善案（設計のみ） ===');

const improvements = [
  {
    id:'IMP-1',
    title:'SR 種別フラグの追加（`sr_type`フィールド）',
    target:'analyzeToken() の返却値',
    design:`
      sr_type: "same_strong"       // 同Strong同節反復
             | "cross_strong"      // 異Strongの同ラベル衝突（非BL、非S4）
             | "cross_strong_bl"   // 異Strongで衝突相手がBL
             | "cross_strong_s4"   // 異Strongで衝突相手がS4除外
             | "cross_strong_pool" // 異Strongで衝突相手もpool内
             | "mixed"             // 複数種類が同時発生（MAT 13:14等）
    `,
    benefit:'SR の内訳を定量化できる。BL/S4との衝突をpoolとの衝突から分離して集計可能。',
    limitation:'現在のスクリプトの大規模改修は不要。analyzeToken()に数行追加するだけ。',
  },
  {
    id:'IMP-2',
    title:'クロス Strong 衝突マップの事前生成（`cross_strong_map.json`）',
    target:'pool 全体の前処理',
    design:`
      // 全Strong×書巻 の Japanese ラベルを比較し、
      // 同一書巻内で同一Japaneseを持つStrong番号の組み合わせを列挙
      // 例: { "G2036|G3004": { japanese:"言う", books:["JHN","ACT"], count:3 } }
    `,
    benefit:'どの Strong ペアが日本語ラベル衝突リスクを持つかを事前把握できる。衝突頻度の高いペアを優先的に人的確認の対象にできる。',
    limitation:'pool規模では計算コスト小。ただし「同一節」でなく「同一書巻」での衝突を列挙するため false positive が増える。',
  },
  {
    id:'IMP-3',
    title:'BL/除外Strong との衝突を SR カウントから分離する仕組み',
    target:'サンプル集計ロジック',
    design:`
      // SR を以下の3つに分離して集計:
      // sr_resolvable:   BL/S4との衝突のみ → G2532等は監査対象外なので
      //                  JA1955帰属が決定不能だが "G5037が対応先" と仮定可能
      // sr_unresolvable: 両方がpoolトークン → どちらかが誤Japanese
      // sr_mixed:        上記の複合
      // 公式SR率 = sr_resolvable + sr_unresolvable + sr_mixed（現行維持）
      // 参考値   = sr_unresolvable のみ（BL除外時の最小SR）
    `,
    benefit:'「BLとの共存」と「pool内トークン同士の衝突」という質的に異なる問題を分離して管理できる。',
    limitation:'「BL/S4との衝突はSRとしてカウントするか」のポリシーが別途必要。',
  },
  {
    id:'IMP-4',
    title:'位置順ベースの帰属推定（実験的）',
    target:'duplicate_label 解消の試み',
    design:`
      // 同Strong反復の場合:
      // 節内の globalIdx 順に並べたとき、「n番目のトークン → JA1955の先頭から n番目の同表現」
      // という仮定で帰属推定
      // 成立条件: JA1955がギリシャ語語順に比較的忠実な場合
      // 非成立条件: 語順転置が起きている場合（倒置強調等）
    `,
    benefit:'duplicate_label SR の一部を「帰属推定あり（provisional explicit）」として扱い、SR率の定性的な説明を改善できる。',
    limitation:'JA1955の語順がギリシャ語に忠実かどうかを検証できない。精度保証なし。あくまで仮説。',
  },
];

improvements.forEach(imp=>{
  console.log(`\n${imp.id}: ${imp.title}`);
  console.log(`  対象: ${imp.target}`);
  console.log(`  設計概要: ${imp.design.trim().slice(0,200)}...`);
  console.log(`  効果: ${imp.benefit}`);
  console.log(`  限界: ${imp.limitation}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 出力データ構築
const output={
  meta:{
    title:'Stage 3 S7 最終整合性確認',
    generatedAt:new Date().toISOString().slice(0,10),
    sourceFiles:['stage3-pool.json','stage3-s7-sample.json','stage3-s7-reclassify.json'],
    readOnly:true,
  },

  s1_reclassification:{
    movedCount:movedTokens.length,
    movedRefsDuplicate:dupMoved.length,
    movedByStrong:Object.fromEntries(Object.entries(movedByStrong).sort((a,b)=>b[1]-a[1])),
    layerCounts:{
      S7a:layerBuckets.S7a.length,
      S7b:layerBuckets.S7b.length,
      S7c:layerBuckets.S7c.length,
      S7d:layerBuckets.S7d.length,
      S7e:layerBuckets.S7e.length,
      S7total:s7total,
    },
    overlapWithS1S6:overlapS1S6.length,
    grandTotal,
    consistency:{
      s7totalMatch:s7total===13103,
      grandTotalMatch:grandTotal===28219,
      noOverlap:overlapS1S6.length===0,
      movedUnique:dupMoved.length===0,
    },
    s7aStrongs:[...s7aStrongs.entries()].map(([s,v])=>({strong:s,japanese:v.japanese,wordClass:v.wc,count:v.count}))
      .sort((a,b)=>b.count-a.count),
  },

  s2_s7aSample:{
    n:s7aNewResults.length,
    pool:layerBuckets.S7a.length,
    srCount:s7aSR.length,
    srRate:(7/34*100).toFixed(2)+'%',
    threshold:'20.0%',
    judgment:'FAIL',
    ci95_wilson:{lower:(ci.lower*100).toFixed(1)+'%',upper:(ci.upper*100).toFixed(1)+'%'},
    strongBreakdown:Object.fromEntries(
      Object.entries(s7aByStrongCount).sort((a,b)=>b[1]-a[1]).map(([s,n])=>
        [s,{pool:n, sample:s7aSampleByStrong[s]||0}]
      )
    ),
    bookBreakdown:s7aSampleByBook,
    srDetails:s7aSR.map(r=>({
      ref:r.ref, strong:r.strong, japanese:r.japanese,
      srType:(r.sameLabel||[]).every(sl=>sl.strong===r.strong)?'same_strong':
             (r.sameLabel||[]).some(sl=>BLACKLIST.has(sl.strong))?'cross_strong_bl':'cross_strong',
      sameLabel:r.sameLabel,
      reason:r.reason,
    })),
    samplingNote:'Strong×書巻ラウンドロビン（seed=97）。抽出は再現可能（同seed・同pool・同コードで同一結果）',
  },

  s3_s7dSample:{
    totalN:118,
    composition:{
      existingS7d:{n:existingS7dResults.length, source:'初回サンプルS7d、旧pool1734件より'},
      movedFromS7a:{n:movedFromS7a.length, source:'初回サンプルS7a中のοὗτος形（S7aから再帰属）'},
      newlyAdded:{n:addedS7dResults.length, source:'移動574件から新規Strong×書巻抽出（seed=101）'},
    },
    samplingMethodNote:'比例再抽出(proportional)ではなく、3グループの和集合(union)。母集団2308件に対する代表性は限定的',
    refDuplicates:dupD118.length,
    correspondenceSummary:{
      existing87:c87, moved15:cMoved, added16:cAdded, combined118:cAll,
      srRate118:(cAll.structural_review_required/118*100).toFixed(1)+'%',
    },
    strongBreakdown:Object.fromEntries(
      Object.entries(d118BySt).filter(([,v])=>v.n>0)
        .sort((a,b)=>b[1].n-a[1].n)
        .map(([s,v])=>[s,{pool:v.pool,sample:v.n,isMoved:OUTHTOS.has(s)}])
    ),
    bookBreakdown:d118ByBook,
  },

  s4_crossStrongCollisions:{
    total:crossCollisions.length,
    items:crossCollisions,
    summary:{
      blCross:crossCollisions.filter(c=>c.conflicts.some(x=>x.inBL)).length,
      s4Cross:crossCollisions.filter(c=>c.conflicts.some(x=>x.inS4)).length,
      poolCross:crossCollisions.filter(c=>c.conflicts.every(x=>!x.inBL&&!x.inS4)).length,
      mutualPairs:[...new Set(crossCollisions.filter(c=>
        c.conflicts.some(x=>crossRefs.includes(x.ref))
      ).map(c=>([c.strong,c.conflicts[0].strong].sort().join('|'))))],
    },
  },

  s5_sameStrongDuplicates:{
    tokenCount:sameStrongSR.length,
    pairCount:Math.round(ssPairCount),
    verseCount:ssVerses.size,
    withCrossStrong:sameStrongSR.filter(r=>r.hasCross).length,
    items:ssSorted,
  },

  s6_improvements:improvements,
};

const outPath=path.join(OUT_DIR,'stage3-s7-consistency.json');
fs.writeFileSync(outPath,JSON.stringify(output,null,2),'utf8');
console.log(`\nOutput: ${outPath}`);
