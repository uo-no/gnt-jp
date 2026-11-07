#!/usr/bin/env node
/**
 * audit-stage4-analyze.cjs — Stage 4 候補の詳細分析
 *
 * stage4-prep-pool.json (92,952件) を対象に:
 * 1. class フィールドによる内容語/機能語分類
 * 2. japanese値の種類分類 (bracket / tilde / plain / null)
 * 3. JA1955 対応計算 (containsBase)
 * 4. Stage 4 監査対象の絞り込み
 * 5. Strong別・品詞別・書巻別集計
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const BIBLE_ROOT = path.join(__dirname,'..','public','bible_data','nt');
const JA_ROOT    = path.join(__dirname,'..','public','translations','JA1955');
const OUT4       = path.join(__dirname,'output','stage4-prep');

// ── 既存成果物 ────────────────────────────────────────────────────────────
const prep = JSON.parse(fs.readFileSync(path.join(OUT4,'stage4-prep-pool.json'),'utf8'));
const remaining = prep.allTokens;  // 92,952件 (ref/book/chapter/verse/strong/morph/japanese/matchType/text)
console.log(`Input: ${remaining.length}件`);

// Stage 3 pool の Strong set (Stage 3 で処理済みの Strong を把握)
const pool3     = JSON.parse(fs.readFileSync(path.join(__dirname,'output','ja1955-full-audit','reports','stage3-pool.json'),'utf8'));
const stage3PoolStrongs = new Map();  // strong → count
pool3.allTokens.forEach(t => { stage3PoolStrongs.set(t.strong, (stage3PoolStrongs.get(t.strong)||0)+1); });

// BL / S4
const BLACKLIST  = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);

// ── ユーティリティ ────────────────────────────────────────────────────────
function strip(s){ return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }
function containsBase(vt, jb){
  if(!vt || !jb) return { match: false, type: 'none' };
  const c = strip(jb);
  if(!c) return { match: false, type: 'none' };
  if(vt.includes(c)) return { match: true, type: 'direct' };
  const k = c.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'')
             .replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  if(k.length >= 2 && vt.includes(k)) return { match: true, type: 'kanji' };
  return { match: false, type: 'none' };
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
const chCache = new Map();
function loadCh(book, ch){
  const k = `${book}/${ch}`;
  if(!chCache.has(k)){
    try{ chCache.set(k, JSON.parse(fs.readFileSync(path.join(BIBLE_ROOT,book,ch+'.json'),'utf8'))); }
    catch{ chCache.set(k, []); }
  }
  return chCache.get(k);
}
function getVerseToks(book, ch, verse){
  const t = loadCh(book, ch);
  const a = Array.isArray(t) ? t : Object.values(t);
  return a.filter(x => String(x.verse)===String(verse));
}

// ── Step 1: class フィールドを bible_data から読み込み ──────────────────
// remaining pool は scan 時に class を読んでいなかったため、bible_data から補完
console.log('[Step 1] class フィールド補完中...');
const tStart = Date.now();

const CONTENT_CLASSES = new Set(['noun','verb','adj','adv','num']);
const PRON_CLASSES    = new Set(['pron']);
const FUNCTION_CLASSES = new Set(['det','conj','prep','ptcl','intj']);

// ref → token map (bible_dataを直接走査)
function getTokenClass(book, ch, ref){
  const toks = loadCh(book, String(ch));
  const arr = Array.isArray(toks) ? toks : Object.values(toks);
  const t = arr.find(x => x.ref === ref);
  return t ? { class: t.class||'', type: t.type||'', morph: t.morph||'', gloss: t.gloss||'' } : null;
}

// Japanese 値の種類分類
function classifyJA(ja){
  if(!ja || !ja.trim()) return 'empty';
  if(/^[［〔].*[］〕]$/.test(ja.trim())) return 'bracket';  // ［冠詞］ type
  if(ja.trim().startsWith('〜')) return 'tilde';              // 〜の中に type
  return 'plain';                                              // 言う type
}

// ── 全件に class を付けて分析 ─────────────────────────────────────────
console.log('[Step 2] 全件分析中...');

const BOOKS = ['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
               'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
               '1PE','2PE','1JN','2JN','3JN','JUD','REV'];

const analyzed = [];
let done = 0;
for(const tok of remaining){
  const extra = getTokenClass(tok.book, tok.chapter, tok.ref);
  const cls   = extra?.class || '';
  const type  = extra?.type  || '';
  const morph = extra?.morph || tok.morph || '';
  const ja    = tok.japanese || '';
  const jaType = classifyJA(ja);
  const isContent  = CONTENT_CLASSES.has(cls);
  const isPron     = PRON_CLASSES.has(cls);
  const isFunction = FUNCTION_CLASSES.has(cls);

  // JA1955 対応を計算 (内容語 plain-label のみ)
  let ja1955Match = null;
  let sameLabel = null;
  if(isContent && jaType === 'plain'){
    const vt = loadJA(tok.book, String(tok.chapter))[String(tok.verse)] || null;
    if(vt){
      const { match, type: mt } = containsBase(vt, ja);
      ja1955Match = match ? mt : 'none';

      // same-label チェック (同節に同日本語が他にあるか)
      if(match){
        const vtoks = getVerseToks(tok.book, String(tok.chapter), String(tok.verse));
        const sl = vtoks.filter(t => t.ref!==tok.ref && (t.japanese||'')===ja);
        sameLabel = sl.length > 0;
      }
    } else {
      ja1955Match = 'no_ja1955';
    }
  }

  analyzed.push({
    ref: tok.ref, book: tok.book, chapter: tok.chapter, verse: tok.verse,
    strong: tok.strong, morph, class: cls, type,
    japanese: ja, jaType,
    isContent, isPron, isFunction,
    ja1955Match, sameLabel,
    stage3Coverage: stage3PoolStrongs.has(tok.strong),
    stage3PoolCount: stage3PoolStrongs.get(tok.strong) || 0,
  });

  done++;
  if(done % 10000 === 0) process.stdout.write(`\r  ${done}/${remaining.length}`);
}
process.stdout.write('\n');
console.log(`  完了: ${((Date.now()-tStart)/1000).toFixed(1)}秒`);

// ── 集計 ─────────────────────────────────────────────────────────────────

// 1. class別件数
const clsDist = {};
analyzed.forEach(t => { clsDist[t.class||''] = (clsDist[t.class||'']||0)+1; });
console.log('\n=== class別件数 (全92,952件) ===');
Object.entries(clsDist).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));

// 2. jaType別件数
const jaTypeDist = {};
analyzed.forEach(t => { jaTypeDist[t.jaType] = (jaTypeDist[t.jaType]||0)+1; });
console.log('\n=== jaType別件数 ===');
Object.entries(jaTypeDist).sort((a,b)=>b[1]-a[1]).forEach(([j,n]) => console.log(`  ${j}: ${n}`));

// 3. 内容語 (content) 件数
const contentToks = analyzed.filter(t => t.isContent);
console.log(`\n=== 内容語 (class: noun/verb/adj/adv/num): ${contentToks.length}件 ===`);
const ctClsDist = {};
contentToks.forEach(t => { ctClsDist[t.class] = (ctClsDist[t.class]||0)+1; });
console.log('class別:', JSON.stringify(ctClsDist));

// 4. 内容語 × jaType
const ctJaDist = {};
contentToks.forEach(t => {
  const k = t.class+'×'+t.jaType;
  ctJaDist[k] = (ctJaDist[k]||0)+1;
});
console.log('class × jaType:');
Object.entries(ctJaDist).sort((a,b)=>b[1]-a[1]).forEach(([k,n]) => console.log(`  ${k}: ${n}`));

// 5. 内容語 + plain label + JA1955対応あり → Stage 4 Pool
const stage4Toks = analyzed.filter(t => t.isContent && t.jaType==='plain' && (t.ja1955Match==='direct' || t.ja1955Match==='kanji'));
console.log(`\n=== Stage 4 Pool (内容語×plain×JA1955対応あり): ${stage4Toks.length}件 ===`);
const s4ClsDist = {};
const s4MtDist  = {};
stage4Toks.forEach(t => {
  s4ClsDist[t.class] = (s4ClsDist[t.class]||0)+1;
  s4MtDist[t.ja1955Match] = (s4MtDist[t.ja1955Match]||0)+1;
});
console.log('class別:', JSON.stringify(s4ClsDist));
console.log('matchType別:', JSON.stringify(s4MtDist));
console.log('SR候補 (sameLabel=true):', stage4Toks.filter(t=>t.sameLabel).length);

// 6. Stage 4 Pool の Strong別
const s4ByStrong = {};
stage4Toks.forEach(t => {
  if(!s4ByStrong[t.strong]) s4ByStrong[t.strong] = {
    n:0, class:t.class, japanese:t.japanese, stage3:t.stage3Coverage, s3n:t.stage3PoolCount
  };
  s4ByStrong[t.strong].n++;
});
const s4StrongArr = Object.entries(s4ByStrong)
  .map(([s,v]) => ({strong:s,...v}))
  .sort((a,b) => b.n-a.n);
console.log(`ユニークStrong: ${s4StrongArr.length}`);
console.log('Top 30:');
s4StrongArr.slice(0,30).forEach(r =>
  console.log(`  ${r.strong} n=${r.n} class=${r.class} s3n=${r.s3n} ja="${r.japanese?.slice(0,12)||''}"`));

// 7. Stage 4 Pool の書巻別
const s4ByBook = {};
stage4Toks.forEach(t => { s4ByBook[t.book] = (s4ByBook[t.book]||0)+1; });
console.log('\n書巻別:');
BOOKS.forEach(b => { if(s4ByBook[b]) process.stdout.write(`${b}:${s4ByBook[b]} `); });
process.stdout.write('\n');

// 8. 除外対象の確認
const contentPlainNoJA = analyzed.filter(t => t.isContent && t.jaType==='plain' && t.ja1955Match==='none');
const contentBracket   = analyzed.filter(t => t.isContent && t.jaType==='bracket');
const contentTilde     = analyzed.filter(t => t.isContent && t.jaType==='tilde');
const contentNoJA1955  = analyzed.filter(t => t.isContent && t.jaType==='plain' && t.ja1955Match==='no_ja1955');
console.log(`\n=== 内容語のうち Stage 4 Pool 外 ===`);
console.log(`  JA1955 対応なし (none): ${contentPlainNoJA.length}`);
console.log(`  JA1955 節テキストなし: ${contentNoJA1955.length}`);
console.log(`  bracket label: ${contentBracket.length}`);
console.log(`  tilde label: ${contentTilde.length}`);
console.log(`  pron class: ${analyzed.filter(t=>t.isPron).length}`);
console.log(`  function class: ${analyzed.filter(t=>t.isFunction).length}`);
console.log(`  class empty: ${analyzed.filter(t=>!t.class).length}`);

// 9. pron class の内訳 (個人代名詞分析)
const pronToks = analyzed.filter(t => t.isPron);
console.log(`\n=== pron class: ${pronToks.length}件 ===`);
const pronTypeDist = {};
pronToks.forEach(t => { pronTypeDist[t.type||''] = (pronTypeDist[t.type||'']||0)+1; });
console.log('type別:', JSON.stringify(pronTypeDist));
// pron × plain label
const pronPlain = pronToks.filter(t => t.jaType==='plain');
console.log(`pron × plain: ${pronPlain.length}`);

// 10. Stage 4 Pool + pron (plainのみ) のJA1955計算
const pronPlainJA1955 = pronPlain.filter(t => {
  // compute on the fly
  const vt = loadJA(t.book, String(t.chapter))[String(t.verse)] || null;
  if(!vt) return false;
  return containsBase(vt, t.japanese).match;
});
console.log(`  pron×plain×JA1955対応: ${pronPlainJA1955.length}`);

// ── 出力 ─────────────────────────────────────────────────────────────────
// Stage 4 Pool 全件
const stage4Full = [...stage4Toks, ...pronPlainJA1955];
// deduplicate by ref
const s4dedup = [];
const s4refSet = new Set();
for(const t of stage4Full){ if(!s4refSet.has(t.ref)){ s4dedup.push(t); s4refSet.add(t.ref); } }

console.log(`\n=== Stage 4 Pool (内容語 + pron×JA1955) 合計: ${s4dedup.length}件 ===`);

// Recompute by-strong for final pool
const s4FinalByStrong = {};
s4dedup.forEach(t => {
  if(!s4FinalByStrong[t.strong]) s4FinalByStrong[t.strong] = {
    n:0, class:t.class, japanese:[], stage3PoolCount:t.stage3PoolCount, books:new Set()
  };
  s4FinalByStrong[t.strong].n++;
  if(t.japanese && !s4FinalByStrong[t.strong].japanese.includes(t.japanese))
    s4FinalByStrong[t.strong].japanese.push(t.japanese);
  s4FinalByStrong[t.strong].books.add(t.book);
});
const s4FinalStrongArr = Object.entries(s4FinalByStrong)
  .map(([s,v]) => ({strong:s, n:v.n, class:v.class, japanese:v.japanese,
    stage3PoolCount:v.stage3PoolCount, bookCount:v.books.size, books:[...v.books].sort()}))
  .sort((a,b) => b.n-a.n);

// Stage 4 の件数サマリー
const s4Summary = {
  meta: {
    generatedAt: new Date().toISOString().split('T')[0],
    title: 'Stage 4 準備: 監査対象母集団詳細分析',
    note: '92,952件（remaining）の class × jaType × JA1955対応 分析結果'
  },
  fullPicture: {
    NT_total: 137741,
    stage3_pool: 28219,
    bl_excluded: 15883,
    s4_excluded: 156 + 723,  // 879
    ledger: 148 + 49 + 303,  // 500
    stage2_only: 31,
    remaining: 92952,
    verified_sum: 28219 + 15883 + 879 + 500 + 31 + 92952,
  },
  remaining_breakdown: {
    class_dist: clsDist,
    jaType_dist: jaTypeDist,
  },
  contentWordAnalysis: {
    total_content: contentToks.length,
    class_dist: ctClsDist,
    classXjaType: ctJaDist,
    plain_ja1955_match: stage4Toks.length,
    plain_no_match: contentPlainNoJA.length,
    bracket_label: contentBracket.length,
    tilde_label: contentTilde.length,
    no_ja1955_verse: contentNoJA1955.length,
    pron_class: pronToks.length,
    pron_plain_ja1955: pronPlainJA1955.length,
  },
  stage4Pool: {
    total: s4dedup.length,
    uniqueStrongs: s4FinalStrongArr.length,
    byMatchType: s4MtDist,
    byClass: s4ClsDist,
    topStrongs: s4FinalStrongArr.slice(0,50),
    byBook: (() => {
      const bb = {};
      s4dedup.forEach(t => { bb[t.book] = (bb[t.book]||0)+1; });
      return bb;
    })(),
  },
  notInStage4_reasons: {
    bracket_label_allClass: analyzed.filter(t=>t.jaType==='bracket').length,
    tilde_label_allClass: analyzed.filter(t=>t.jaType==='tilde').length,
    function_words: analyzed.filter(t=>t.isFunction).length,
    content_no_ja1955: contentPlainNoJA.length + contentNoJA1955.length,
    empty_class: analyzed.filter(t=>!t.class).length,
  }
};

fs.writeFileSync(path.join(OUT4,'stage4-analysis-summary.json'),
  JSON.stringify(s4Summary, null, 2));
fs.writeFileSync(path.join(OUT4,'stage4-pool-by-strong.json'),
  JSON.stringify(s4FinalStrongArr, null, 2));
fs.writeFileSync(path.join(OUT4,'stage4-pool.json'),
  JSON.stringify({
    meta: { generatedAt: new Date().toISOString().split('T')[0], total: s4dedup.length },
    allTokens: s4dedup.map(t => ({
      ref:t.ref, book:t.book, chapter:t.chapter, verse:t.verse,
      strong:t.strong, morph:t.morph, class:t.class, type:t.type,
      japanese:t.japanese, ja1955Match:t.ja1955Match, sameLabel:t.sameLabel||false,
      stage3PoolCount:t.stage3PoolCount
    }))
  }, null, 2));

console.log('\n出力完了:');
console.log('  stage4-analysis-summary.json');
console.log('  stage4-pool-by-strong.json');
console.log('  stage4-pool.json');
