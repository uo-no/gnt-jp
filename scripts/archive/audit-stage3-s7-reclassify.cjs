#!/usr/bin/env node
/**
 * audit-stage3-s7-reclassify.cjs
 *
 * 1. οὗτος 格変化形の S7a → S7d 移動（語彙・形態確認付き）
 * 2. S7a / S7d 再サンプリング（変更前後の数値併記）
 * 3. クロス Strong 衝突の全サンプル確認
 * 4. 自動照合の限界整理
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
function parseRef(r){const m=r.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);return m?{book:m[1],ch:m[2],v:m[3]}:null;}
const chCache=new Map();
function loadCh(book,ch){const k=`${book}/${ch}`;if(!chCache.has(k)){try{chCache.set(k,JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8')));}catch{chCache.set(k,[]);}}return chCache.get(k);}
const jaCache=new Map();
function loadJA(book,ch){const k=`${book}/${ch}`;if(!jaCache.has(k)){try{jaCache.set(k,JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,ch+'.json'),'utf8')).verses||{});}catch{jaCache.set(k,{});}}return jaCache.get(k);}
function getVerseTokens(book,ch,verse){const t=loadCh(book,ch);const a=Array.isArray(t)?t:Object.values(t);return a.filter(x=>String(x.verse)===String(verse));}

// ── 既存データ読み込み ─────────────────────────────────────────────────────
console.log('データ読み込み中...');
const stage3Pool    = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const prevSample    = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-s7-sample.json'),'utf8'));
const allPoolTokens = stage3Pool.allTokens;
console.log(`Pool: ${allPoolTokens.length}件`);

// 既存554件の結果をフラット化
const prevResults = Object.values(prevSample.results).flat();
console.log(`既存サンプル: ${prevResults.length}件`);

// ── 層定義（変更前） ─────────────────────────────────────────────────────
const S1_STRONGS=new Set(['G2424','G5547']);
const S2_STRONGS=new Set(['G2316','G2962','G3962','G5207','G4151']);
const S3_STRONGS=new Set(['G444','G80','G3101','G1135','G5043']);
const S4_STRONGS=new Set(['G4675','G4571','G4771','G4674']);
const poolByStrong={};
for(const t of allPoolTokens) poolByStrong[t.strong]=(poolByStrong[t.strong]||0)+1;
const S5_STRONGS=new Set(Object.entries(poolByStrong).filter(([s,n])=>n>=200&&!S1_STRONGS.has(s)&&!S2_STRONGS.has(s)&&!S3_STRONGS.has(s)&&!S4_STRONGS.has(s)).map(([s])=>s));
const definedStrongs=new Set([...S1_STRONGS,...S2_STRONGS,...S3_STRONGS,...S4_STRONGS,...S5_STRONGS]);
const S6_STRONGS=new Set(Object.entries(poolByStrong).filter(([s,n])=>n<20&&!definedStrongs.has(s)).map(([s])=>s));

const S7_WC_ORIG={
  S7a: new Set(['prep','adv','adverb','particle','part','conj','conj.','conj-coord','conj-subord','cond','interj','interjection']),
  S7b: new Set(['verb']),
  S7c: new Set(['noun']),
  S7d: new Set(['adj','adjective','pronoun','pron']),
  S7e: new Set(['other','unknown','','undefined']),
};

// ── タスク1: οὗτος 格変化形の特定と移動 ─────────────────────────────────────
console.log('\n=== タスク1: οὗτος 格変化形の確認 ===');

// Strong別の語彙情報を収集（池内トークンの実データから）
const strongInfo = {};
for(const tok of allPoolTokens){
  if(!strongInfo[tok.strong]){
    strongInfo[tok.strong]={
      strong:tok.strong,
      japanese:tok.japanese||'',
      wordClass:(tok.wordClass||'').toLowerCase(),
      morph:tok.morph||'',
      text:tok.text||'',
      count:0,
    };
  }
  strongInfo[tok.strong].count++;
}

// S7a に含まれる全 Strong を列挙
const s7aStrongs = Object.values(strongInfo).filter(s=>{
  if(definedStrongs.has(s.strong)||S6_STRONGS.has(s.strong)) return false;
  return S7_WC_ORIG.S7a.has(s.wordClass);
});

console.log(`S7a の全 Strong 数: ${s7aStrongs.length}種`);
console.log('\nS7a の全 Strong（語彙・形態確認）:');
s7aStrongs.sort((a,b)=>b.count-a.count).forEach(s=>{
  console.log(`  ${s.strong}(${s.japanese}) wc=${s.wordClass} morph=${s.morph.slice(0,12)} count=${s.count}`);
});

// οὗτος 格変化形の定義
// Strong's concordance に基づく οὗτος (G3778) の格変化形
// 参考: G3778=οὗτος/αὕτη/τοῦτο, G5023〜G5130 が各格形
// G3779(οὕτως=thus)は派生副詞として S7a に残す
// G5119(τότε=then)は別語根の副詞として S7a に残す
const OUTHTOS_STRONGS = new Set([
  'G5023', // ταῦτα (neut pl NOM/ACC)
  'G5024', // ταὐτά (the same things)
  'G5025', // ταύταις (fem pl DAT)
  'G5026', // ταύτης/ταύτῃ (fem sg GEN/DAT)
  'G5124', // τοῦτο (neut sg NOM/ACC)
  'G5125', // τούτοις (masc/neut pl DAT)
  'G5126', // τοῦτον (masc sg ACC)
  'G5127', // τούτου (masc/neut sg GEN)
  'G5128', // τούτους (masc pl ACC)
  'G5129', // τούτῳ (masc/neut sg DAT)
  'G5130', // τούτων (all genders pl GEN)
  // G3778 (αὕτη/οὗτος/τοῦτο) - pool内の件数と wordClass を確認してから判断
]);

// G3778 の確認
const g3778 = strongInfo['G3778'];
if(g3778) console.log(`\nG3778: japanese=${g3778.japanese} wc=${g3778.wordClass} count=${g3778.count}`);

// pool内の οὗτος 形の確認
console.log('\nοὗτος 形の pool 内確認:');
const outhtosInPool = [];
for(const strong of OUTHTOS_STRONGS){
  const info = strongInfo[strong];
  if(!info){ console.log(`  ${strong}: pool外（0件）`); continue; }
  const inS7a = !definedStrongs.has(strong)&&!S6_STRONGS.has(strong)&&S7_WC_ORIG.S7a.has(info.wordClass);
  const inS7d = !definedStrongs.has(strong)&&!S6_STRONGS.has(strong)&&S7_WC_ORIG.S7d.has(info.wordClass);
  console.log(`  ${strong}(${info.japanese}): wc=${info.wordClass}, count=${info.count}, 現在=${inS7a?'S7a':inS7d?'S7d':'他層'}`);
  if(inS7a) outhtosInPool.push({strong, japanese:info.japanese, wordClass:info.wordClass, count:info.count});
}

// G3778 も確認
if(g3778){
  const inS7a = !definedStrongs.has('G3778')&&!S6_STRONGS.has('G3778')&&S7_WC_ORIG.S7a.has(g3778.wordClass);
  if(inS7a){
    outhtosInPool.push({strong:'G3778', japanese:g3778.japanese, wordClass:g3778.wordClass, count:g3778.count});
    console.log(`  G3778: pool内でS7a（count=${g3778.count}）→ οὗτοsの基本形として移動対象`);
  }
}

console.log(`\n移動対象（S7a → S7d）: ${outhtosInPool.length}種, 計${outhtosInPool.reduce((s,v)=>s+v.count,0)}件`);
outhtosInPool.forEach(s=>console.log(`  ${s.strong}(${s.japanese}): ${s.count}件`));

// 移動するトークンの全件特定
const outhtosStrongSet = new Set(outhtosInPool.map(s=>s.strong));
const movedTokens = allPoolTokens.filter(t=>outhtosStrongSet.has(t.strong));
console.log(`\n移動トークン（全件）: ${movedTokens.length}件`);

// 初回サンプル中で移動対象のトークン
const prevS7aSample = prevResults.filter(r=>r.stratum==='S7a');
const movedFromPrev = prevS7aSample.filter(r=>outhtosStrongSet.has(r.strong));
console.log(`初回サンプル(S7a=34件)中の移動対象: ${movedFromPrev.length}件`);
movedFromPrev.forEach(r=>console.log(`  ${r.ref} ${r.strong}(${r.japanese}) → ${r.correspondence}`));

// ── 変更後の層定義 ─────────────────────────────────────────────────────────
// οὗτος 形は wordClass に関わらず S7d として扱う（S7a 割り当て前に S7d 判定）
function assignS7new(tok){
  const wc=(tok.wordClass||'other').toLowerCase().trim();
  // οὗτος 格変化形は S7d（指示代名詞）
  if(outhtosStrongSet.has(tok.strong)) return 'S7d';
  if(S7_WC_ORIG.S7a.has(wc)) return 'S7a';
  if(S7_WC_ORIG.S7b.has(wc)) return 'S7b';
  if(S7_WC_ORIG.S7c.has(wc)) return 'S7c';
  if(S7_WC_ORIG.S7d.has(wc)) return 'S7d';
  return 'S7e';
}
function getLayerNew(tok){
  const s=tok.strong;
  if(S1_STRONGS.has(s))return'S1'; if(S2_STRONGS.has(s))return'S2';
  if(S3_STRONGS.has(s))return'S3'; if(S4_STRONGS.has(s))return'S4';
  if(S5_STRONGS.has(s))return'S5'; if(S6_STRONGS.has(s))return'S6';
  return assignS7new(tok);
}

// 変更後の S7 層カウント
const s7new={S7a:[],S7b:[],S7c:[],S7d:[],S7e:[]};
for(const tok of allPoolTokens){
  const l=getLayerNew(tok);
  if(l.startsWith('S7')) s7new[l].push(tok);
}

console.log('\n変更後 S7 層:');
for(const[l,toks]of Object.entries(s7new)){
  const sc=new Set(toks.map(t=>t.strong)).size;
  console.log(`  ${l}: ${sc}種, ${toks.length}件`);
}

// ── タスク2: S7a / S7d 再サンプリング ──────────────────────────────────────
console.log('\n=== タスク2: S7a / S7d 再サンプリング ===');

// 抽出関数（audit-stage3-s7-sample.cjs と同一）
function selectSample(tokens, targetN, seed){
  const byStrong={};
  for(const t of tokens){if(!byStrong[t.strong])byStrong[t.strong]=[];byStrong[t.strong].push(t);}
  const strongs=Object.keys(byStrong).sort();
  const nS=strongs.length;
  const base=Math.floor(targetN/nS); const extra=targetN-base*nS;
  const sBySz=[...strongs].sort((a,b)=>(byStrong[b]||[]).length-(byStrong[a]||[]).length);
  const alloc={}; sBySz.forEach((s,i)=>{alloc[s]=base+(i<extra?1:0);});
  const result=[]; const seen=new Set();
  for(const s of strongs){
    const n=alloc[s]||0; if(n===0)continue;
    const stoks=byStrong[s]; if(!stoks||!stoks.length)continue;
    const byBook={}; for(const t of stoks){const bk=t.ref.split(' ')[0];if(!byBook[bk])byBook[bk]=[];byBook[bk].push(t);}
    const books=Object.keys(byBook).sort();
    const picked=[];
    for(let i=0;picked.length<Math.min(n,stoks.length);i++){
      const bk=books[(i*3+seed+s.charCodeAt(1))%books.length];
      const cands=(byBook[bk]||[]).filter(t=>!seen.has(t.ref)&&!picked.find(p=>p.ref===t.ref));
      if(cands.length>0){const t=cands[(i*7+seed)%cands.length];picked.push(t);seen.add(t.ref);}
      else{const ac=stoks.filter(t=>!seen.has(t.ref)&&!picked.find(p=>p.ref===t.ref));if(ac.length>0){const t=ac[(i*13+seed)%ac.length];picked.push(t);seen.add(t.ref);}else break;}
    }
    result.push(...picked);
  }
  if(result.length<targetN){const rem=tokens.filter(t=>!seen.has(t.ref));for(let i=0;result.length<targetN&&i<rem.length;i++){result.push(rem[i]);seen.add(rem[i].ref);}}
  return result.slice(0,targetN);
}

// 分析関数（audit-stage3-s7-sample.cjs と同一）
function analyzeToken(tok){
  const r=parseRef(tok.ref);
  if(!r)return{correspondence:'uncertain',reason:'ref解析不能',autoCorrect:false};
  const vt=loadJA(r.book,r.ch)[r.v]||null;
  const verseTokens=getVerseTokens(r.book,r.ch,r.v);
  const ja=tok.japanese||''; const cleanJa=strip(ja);
  if(!vt)return{correspondence:'uncertain',reason:'JA1955節テキストなし',autoCorrect:false,verseText:null};
  const sameLabel=verseTokens.filter(t=>t.ref!==tok.ref&&(t.japanese||'')===ja);
  const cntDirect=cleanJa?(vt.split(cleanJa).length-1):0;
  const kanji=cleanJa.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  const hasKanji=kanji.length>=2&&vt.includes(kanji)&&!vt.includes(cleanJa);
  const cntKanji=kanji.length>=2?(vt.split(kanji).length-1):0;
  let correspondence,reason='',autoCorrect=false;
  if(sameLabel.length>0){
    correspondence='structural_review_required';
    reason=`節内に同じラベル「${ja}」が他に${sameLabel.length}件（${sameLabel.slice(0,2).map(t=>t.ref+'='+t.strong).join(', ')}）`;
  } else if(cntDirect>1){
    correspondence='uncertain'; reason=`節テキストに「${cleanJa}」が${cntDirect}回出現`;
  } else if(cntDirect===1){
    correspondence='explicit'; autoCorrect=true;
  } else if(hasKanji){
    if(cntKanji>1){correspondence='uncertain'; reason=`漢字「${kanji}」が節内${cntKanji}回出現`;}
    else{correspondence='implicit'; reason=`漢字「${kanji}」で間接マッチ`; autoCorrect=true;}
  } else {
    correspondence='none'; reason=`再確認で対応なし（cleanJa=${cleanJa||'空'}）`;
  }
  return{correspondence,reason,autoCorrect,verseText:(vt||'').slice(0,120),
    sameLabel:sameLabel.map(t=>({ref:t.ref,strong:t.strong,jp:t.japanese})),
    matchInfo:{cntDirect,hasKanji,cntKanji,cleanJa,kanji}};
}

// S7a 再サンプル: 変更後プールから34件
// 移動対象が抜けた新 S7a pool
const newS7aPool = s7new.S7a;
const newS7aTarget = 34;
const newS7aSample = selectSample(newS7aPool, newS7aTarget, 97); // 異なるseed
console.log(`新S7aサンプル: ${newS7aSample.length}件（pool=${newS7aPool.length}件, ${new Set(newS7aPool.map(t=>t.strong)).size}種Strong）`);

// S7d 再サンプル: 既存サンプル + 移動分の補充
// 既存S7dサンプル（87件） + 移動したStrong（outhtosStrongSet）のサンプルを追加
const newS7dPool = s7new.S7d;
const existingS7dSample = prevResults.filter(r=>r.stratum==='S7d');
const existingS7dRefs = new Set(existingS7dSample.map(r=>r.ref));

// 移動した Strong の中でまだサンプルにないものを補充
// 目標: 移動 Strong あたり 2件（合計 2×movedStrongs 件を追加）
const addTarget = Math.min(outhtosInPool.length * 2, 20); // 最大20件の追加
const addPool = newS7dPool.filter(t=>outhtosStrongSet.has(t.strong)&&!existingS7dRefs.has(t.ref));
const addedSample = selectSample(addPool, addTarget, 101);
console.log(`S7d 追加サンプル: ${addedSample.length}件（移動Strong から ${new Set(addedSample.map(t=>t.strong)).size}種）`);

// 各サンプルを分析
const newS7aResults = newS7aSample.map(tok=>({...tok,stratum:'S7a_revised',...analyzeToken(tok)}));
const addedS7dResults = addedSample.map(tok=>({...tok,stratum:'S7d_addition',...analyzeToken(tok)}));

// 集計
function summarize(recs){
  const c={explicit:0,implicit:0,structural_review_required:0,uncertain:0,none:0};
  for(const r of recs) c[r.correspondence]=(c[r.correspondence]||0)+1;
  const n=recs.length;
  return{n,...c,srRate:n>0?(c.structural_review_required/n*100).toFixed(1)+'%':'0%',
    autoCorrect:recs.filter(r=>r.autoCorrect).length};
}

const newS7aSumm = summarize(newS7aResults);
const addedS7dSumm = summarize(addedS7dResults);
const prevS7aSumm = prevSample.summary.bySubLayer.S7a;
const prevS7dSumm = prevSample.summary.bySubLayer.S7d;

// 既存S7dサンプルに新しい移動Strongの結果を加えたS7d合計
const allS7dResults = [
  ...existingS7dSample.map(r=>({...r,stratum:'S7d_existing'})),
  ...addedS7dResults,
];
// 既存S7dサンプルの中で移動対象だったものを特定
const prevS7aMovedInSample = movedFromPrev;
const allS7dResultsCorrected = [...allS7dResults, ...prevS7aMovedInSample.map(r=>({...r,stratum:'S7d_from_S7a'}))];
const combinedS7dSumm = summarize(allS7dResultsCorrected);

console.log('\n[S7a] 変更前 vs 変更後:');
console.log(`  変更前(34件): explicit=${prevS7aSumm.explicit} implicit=${prevS7aSumm.implicit} SR=${prevS7aSumm.structural_review_required}(${prevS7aSumm.srRate}) uncertain=${prevS7aSumm.uncertain} none=${prevS7aSumm.none}`);
console.log(`  変更後(${newS7aSumm.n}件): explicit=${newS7aSumm.explicit} implicit=${newS7aSumm.implicit} SR=${newS7aSumm.structural_review_required}(${newS7aSumm.srRate}) uncertain=${newS7aSumm.uncertain} none=${newS7aSumm.none}`);

console.log('\n[S7d] 変更前 vs 変更後（統合）:');
console.log(`  変更前(87件): explicit=${prevS7dSumm.explicit} implicit=${prevS7dSumm.implicit} SR=${prevS7dSumm.structural_review_required}(${prevS7dSumm.srRate}) uncertain=${prevS7dSumm.uncertain} none=${prevS7dSumm.none}`);
console.log(`  追加(${addedSample.length}件): explicit=${addedS7dSumm.explicit} implicit=${addedS7dSumm.implicit} SR=${addedS7dSumm.structural_review_required}(${addedS7dSumm.srRate}) uncertain=${addedS7dSumm.uncertain} none=${addedS7dSumm.none}`);
console.log(`  統合(${combinedS7dSumm.n}件): explicit=${combinedS7dSumm.explicit} implicit=${combinedS7dSumm.implicit} SR=${combinedS7dSumm.structural_review_required}(${combinedS7dSumm.srRate}) uncertain=${combinedS7dSumm.uncertain} none=${combinedS7dSumm.none}`);

// ── タスク3: クロス Strong 衝突の全サンプル確認 ─────────────────────────────
console.log('\n=== タスク3: クロス Strong 衝突 ===');

// 3件の個別確認
const CROSS_CASES = [
  {ref:'JHN 20:25!12', strong:'G2036', desc:'言う'},
  {ref:'MAT 13:14!16', strong:'G991',  desc:'見る'},
  {ref:'ACT 20:11!11', strong:'G5037', desc:'そして'},
];

const BLACKLIST = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);

for(const c of CROSS_CASES){
  const r=parseRef(c.ref); if(!r)continue;
  const vt=loadJA(r.book,r.ch)[r.v]||null;
  const vTokens=getVerseTokens(r.book,r.ch,r.v);
  const selfTok=vTokens.find(t=>t.ref===c.ref);
  if(!selfTok){console.log(`${c.ref}: token not found`);continue;}
  const sameLabel=vTokens.filter(t=>t.ref!==c.ref&&(t.japanese||'')===selfTok.japanese);
  const crossStrong=sameLabel.filter(t=>t.strong!==c.strong);
  const sameStrongDup=sameLabel.filter(t=>t.strong===c.strong);
  console.log(`\n${c.ref} ${c.strong}(${selfTok.japanese}):`);
  console.log(`  Greek text: ${selfTok.text||'?'}`);
  console.log(`  JA1955: ${(vt||'').slice(0,100)}`);
  console.log(`  同節内の同ラベルトークン: ${sameLabel.map(t=>`${t.ref}=${t.strong}(${t.text||'?'})`).join(', ')}`);
  console.log(`  Cross-Strong: ${crossStrong.length}件（${crossStrong.map(t=>`${t.strong}=${t.text||'?'}`).join(', ')}）${crossStrong.some(t=>BLACKLIST.has(t.strong))?'[BL衝突あり]':''}`);
  console.log(`  Same-Strong dup: ${sameStrongDup.length}件`);
}

// 全554件のサンプルでクロス Strong 衝突を検出
const crossCollisions = [];
const sameStrongDups = [];

for(const r of prevResults){
  if(r.correspondence!=='structural_review_required') continue;
  const sameLabelArr = r.sameLabel||[];
  const crossArr = sameLabelArr.filter(sl=>sl.strong!==r.strong);
  const sameArr  = sameLabelArr.filter(sl=>sl.strong===r.strong);
  if(crossArr.length>0){
    crossCollisions.push({
      ref:r.ref, strong:r.strong, japanese:r.japanese, stratum:r.stratum,
      crossStrongConflicts:crossArr,
      crossBL: crossArr.filter(sl=>BLACKLIST.has(sl.strong)),
      sameStrongCount:sameArr.length,
    });
  } else {
    sameStrongDups.push({ref:r.ref,strong:r.strong,japanese:r.japanese,stratum:r.stratum,dupCount:sameArr.length});
  }
}

console.log(`\n全サンプル中クロス Strong 衝突: ${crossCollisions.length}件`);
console.log(`  うち BL Strong との衝突: ${crossCollisions.filter(c=>c.crossBL.length>0).length}件`);
console.log(`同 Strong 内重複: ${sameStrongDups.length}件`);

console.log('\nクロス Strong 衝突一覧:');
for(const c of crossCollisions){
  const blNote=c.crossBL.length>0?` [BL: ${c.crossBL.map(s=>s.strong).join(',')}]`:'';
  console.log(`  ${c.ref} ${c.strong}(${c.japanese}) [${c.stratum}] ↔ ${c.crossStrongConflicts.map(s=>`${s.strong}(${s.jp})`).join(', ')}${blNote}`);
}

// ── タスク4: 自動照合の限界整理 ────────────────────────────────────────────
console.log('\n=== タスク4: 自動照合の限界 ===');

// 検出できる条件・できない条件の分類
// [検出できる]
// - 同 Strong の duplicate_label: ✓ sameLabel 検出済み
// - Cross-Strong の duplicate_label: ✓ sameLabel で検出（同ラベルの他トークンすべて）
// - multi-occurrence (節内複数回): ✓ cntDirect > 1

// [検出できない]
// - どのトークンが JA1955 のどの語に対応するか: ✗ duplicate_label の場合
// - 語義の妥当性（同じ語でも文脈で意味が変わる）: ✗
// - implicit match の意味的妥当性（漢字だけで確認）: ✗ 特定の文脈での誤マッチ

const detection = {
  detectable: [
    '同 Strong 内の duplicate_label（同ラベル他トークンが同節内に存在）',
    'クロス Strong の duplicate_label（異なる Strong が同じ Japanese ラベルを持ち同節内に共存）',
    '節内複数回出現（same label なしで cleanJa が 2回以上出現）',
    'none（containsBase 再確認でマッチなし）',
    '漢字間接マッチ（implicit）の有無',
  ],
  notDetectable: [
    'duplicate_label 発生時：どのトークンが JA1955 のどの表現に対応するか',
    'Cross-Strong 衝突での意味的優先度（どちらの Strong が JA1955 の使用語義に近いか）',
    '語義の妥当性（同一 Strong でも文脈によって意味が変わるが確認不可）',
    'implicit マッチの意味的妥当性（漢字「御使」が別の文脈での使用かどうか）',
    'JA1955 の文体的意図による同語反復（MAT 23:37「エルサレムよエルサレムよ」等）',
    'BL 追加済み Strong と衝突した場合の正しい帰属（G2532/G846 等のBL Strongとの交差）',
  ],
  improvements: [
    {
      priority: 'HIGH',
      proposal: 'Cross-Strong ラベル衝突の事前マップ生成',
      detail: '全 Strong ペアで同一 Japanese ラベルを持つ組み合わせを事前に列挙し、collision_map.json として管理。sameLabel 検出時に cross-Strong かどうかを即座に判別可能にする。',
      impact: 'クロス Strong SR の種別分類が自動化。別 Strong による誤検知率を定量化できる。',
    },
    {
      priority: 'HIGH',
      proposal: 'duplicate_label の帰属推定（節内位置順）',
      detail: '同ラベルトークンが同節内に複数ある場合、globalIdx 順で「最初の n件が前半の n件の出現に対応」と仮定して帰属を推定。100% 正確ではないが、explicit-uncertain 判定の精度向上に寄与。',
      impact: '現在 SR として保留している duplicate_label の一部を「帰属推定あり」として扱え、Stage 3後半の精査対象を絞り込める。',
    },
    {
      priority: 'MEDIUM',
      proposal: 'BL Strong との Cross-Strong 衝突フラグ',
      detail: 'sameLabel の中に BL Strong（G2532 等）が含まれる場合、`bl_cross_strong` フラグを付与。BL は既に除外済みのため SR 扱いは不要だが、他 Strong の JA1955 対応には影響する可能性があることを示す。',
      impact: 'G5037(そして) ↔ G2532(そして) のようなケースを区別できる。G2532 のような高頻度 BL Strong との衝突は多発する可能性。',
    },
    {
      priority: 'MEDIUM',
      proposal: 'οὗτος 形の wordClass 修正',
      detail: 'G5023〜G5130 などの指示代名詞形が wc=adv として誤分類されている。bible_data 生成スクリプト側で wordClass を pronoun/adj に修正する（bible_data JSON の変更が必要）。ただし聖書 JSON 本体（japanese 等）の変更は不要。',
      impact: '今後の分類で S7a/S7d の混入が自動的に解消される。',
    },
    {
      priority: 'LOW',
      proposal: 'implicit マッチの文脈確認スコア',
      detail: 'kanji マッチ時に、抽出された漢字が JA1955 内で意味的に適切なコンテキストで使用されているかを周辺語で確認。ただし「意味的確認」はルールベースでは困難。',
      impact: '限定的。現状の漢字マッチは精度が高く（S7b の 10件すべて valid）、優先度は低い。',
    },
  ],
};

// ── 出力 ─────────────────────────────────────────────────────────────────
const output = {
  meta: {
    title: 'Stage 3 S7 分類修正・再集計',
    generatedAt: new Date().toISOString().slice(0,10),
    constraints: ['聖書JSON変更なし','監査判定変更なし','恒久BL変更なし','既存成果物上書きなし'],
  },

  task1_reclassification: {
    title: 'οὗτος 格変化形の S7a→S7d 移動',
    movedStrongs: outhtosInPool,
    movedTokenCount: movedTokens.length,
    sampledInPrevS7a: movedFromPrev.map(r=>({ref:r.ref,strong:r.strong,japanese:r.japanese,correspondence:r.correspondence})),
    prevLayerSizes: {
      S7a: {strongs:new Set(allPoolTokens.filter(t=>!definedStrongs.has(t.strong)&&!S6_STRONGS.has(t.strong)&&S7_WC_ORIG.S7a.has((t.wordClass||'').toLowerCase())).map(t=>t.strong)).size,
            tokens:allPoolTokens.filter(t=>!definedStrongs.has(t.strong)&&!S6_STRONGS.has(t.strong)&&S7_WC_ORIG.S7a.has((t.wordClass||'').toLowerCase())).length},
      S7d: {strongs:new Set(allPoolTokens.filter(t=>!definedStrongs.has(t.strong)&&!S6_STRONGS.has(t.strong)&&!outhtosStrongSet.has(t.strong)&&S7_WC_ORIG.S7d.has((t.wordClass||'').toLowerCase())).map(t=>t.strong)).size,
            tokens:allPoolTokens.filter(t=>!definedStrongs.has(t.strong)&&!S6_STRONGS.has(t.strong)&&!outhtosStrongSet.has(t.strong)&&S7_WC_ORIG.S7d.has((t.wordClass||'').toLowerCase())).length},
    },
    newLayerSizes: {
      S7a: {strongs:new Set(s7new.S7a.map(t=>t.strong)).size, tokens:s7new.S7a.length},
      S7d: {strongs:new Set(s7new.S7d.map(t=>t.strong)).size, tokens:s7new.S7d.length},
    },
  },

  task2_resampling: {
    title: 'S7a / S7d 再サンプリング',
    s7a: {
      before: prevS7aSumm,
      after: newS7aSumm,
      newSampleRefs: newS7aSample.map(t=>t.ref),
      results: newS7aResults,
    },
    s7d: {
      existing: prevS7dSumm,
      added: addedS7dSumm,
      combined: combinedS7dSumm,
      addedSampleRefs: addedSample.map(t=>t.ref),
      addedResults: addedS7dResults,
    },
  },

  task3_cross_strong: {
    title: 'クロス Strong 衝突（全サンプル）',
    totalSample: prevResults.length,
    crossStrongCollisions: crossCollisions.length,
    sameStrongDuplicates: sameStrongDups.length,
    blCrossStrong: crossCollisions.filter(c=>c.crossBL.length>0).length,
    details: crossCollisions,
    caseStudies: CROSS_CASES.map(c=>{
      const r=parseRef(c.ref);
      const vt=r?loadJA(r.book,r.ch)[r.v]||null:null;
      const vTokens=r?getVerseTokens(r.book,r.ch,r.v):[];
      const selfTok=vTokens.find(t=>t.ref===c.ref);
      return{
        ref:c.ref, strong:c.strong, japanese:selfTok?.japanese||'',
        greekText:selfTok?.text||'', verseText:(vt||'').slice(0,150),
        sameLabel:vTokens.filter(t=>t.ref!==c.ref&&(t.japanese||'')===selfTok?.japanese)
          .map(t=>({ref:t.ref,strong:t.strong,text:t.text||'',japanese:t.japanese||'',inBL:BLACKLIST.has(t.strong)})),
      };
    }),
  },

  task4_detection_limits: detection,
};

const outPath = path.join(OUT_DIR,'stage3-s7-reclassify.json');
fs.writeFileSync(outPath, JSON.stringify(output,null,2),'utf8');
console.log(`\nOutput: ${outPath}`);
