#!/usr/bin/env node
/**
 * audit-stage4-prep.cjs — Stage 4 準備：残存内容語の対象母集団確定
 *
 * NT 137,741 トークン全件を走査し、各トークンの監査履歴を照合する。
 * 既存成果物は一切変更しない。
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');
const OUT4       = path.join(__dirname, 'output', 'stage4-prep');

if (!fs.existsSync(OUT4)) fs.mkdirSync(OUT4, { recursive: true });

// ── 既存成果物の読み込み ─────────────────────────────────────────────────

// Stage 3 pool refs
const pool3     = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-pool.json'),'utf8'));
const stage3Refs = new Set(pool3.allTokens.map(t => t.ref));
console.log(`Stage 3 pool: ${stage3Refs.size}件`);

// Stage 2 jikoji census refs
const census2   = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
const stage2Refs = new Set(census2.allTokens.map(t => t.ref));
console.log(`Stage 2 census: ${stage2Refs.size}件`);

// Ledger candidates (ref-indexed)
const ledger    = JSON.parse(fs.readFileSync(
  path.join(__dirname,'output','ja1955-nt-ledger.json'),'utf8'));
const ledgerByRef = new Map();
(ledger.candidates || []).forEach(c => {
  if (c.ref) ledgerByRef.set(c.ref, c);
});
console.log(`Ledger candidates: ${ledgerByRef.size}件`);

// BL / S4 strongs
const BLACKLIST  = new Set(['G5213','G5209','G5210','G5216','G2532','G846']);
const S4_STRONGS = new Set(['G4675','G4571','G4771','G4674']);

// Stage 3 S4-excluded refs
const s4ExcRaw  = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage3-full-audit-excluded.json'),'utf8'));
const s4ExcArr  = Array.isArray(s4ExcRaw) ? s4ExcRaw : (s4ExcRaw.items || []);
const s4ExcRefs = new Set(s4ExcArr.map(t => t.ref));
console.log(`S4 暫定除外: ${s4ExcRefs.size}件`);

// ── ユーティリティ ───────────────────────────────────────────────────────
const BOOKS = ['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH',
               'PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS',
               '1PE','2PE','1JN','2JN','3JN','JUD','REV'];

function strip(s){ return (s||'').replace(/^[［〔](.*)[］〕]$/,'$1').trim(); }

function containsBase(vt, jb){
  if(!vt || !jb) return false;
  const c = strip(jb);
  if(!c) return false;
  if(vt.includes(c)) return true;
  const k = c.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'')
             .replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  return k.length >= 2 && vt.includes(k);
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

// ── NT全件走査 ────────────────────────────────────────────────────────────
console.log('\n[Stage 4 Prep] NT全件走査開始...');
const tStart = Date.now();

let totalTokens = 0;
const categories = {
  stage3_pool:         [],  // Stage 3 pool (28,219)
  bl_excluded:         [],  // 恒久BL (G5213/G5209/G5210/G5216/G2532/G846)
  s4_excluded:         [],  // S4暫定除外 (σύ単数形)
  ledger_approved:     [],  // 承認済み変更 (修正承認+修正済み)
  ledger_hold:         [],  // 判断保留55件
  ledger_taigai:       [],  // 対象外（今回）
  stage2_only:         [],  // Stage 2 census にのみ存在 (Stage 3 pool外)
  remaining:           [],  // 上記いずれにも属さない = Stage 4 候補
};

// bookTokenCounts for verification
const bookCounts = {};

for (const book of BOOKS){
  const bookDir = path.join(BIBLE_ROOT, book);
  if(!fs.existsSync(bookDir)) continue;
  const chapters = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.json'))
    .map(f => parseInt(f))
    .filter(n => !isNaN(n))
    .sort((a,b) => a-b);

  for (const chNum of chapters){
    const tokens = loadCh(book, String(chNum));
    const arr = Array.isArray(tokens) ? tokens : Object.values(tokens);
    const jaVerses = loadJA(book, String(chNum));

    for (const tok of arr){
      totalTokens++;
      if(!bookCounts[book]) bookCounts[book] = 0;
      bookCounts[book]++;

      const ref      = tok.ref || `${book} ${chNum}:${tok.verse}!${tok.globalIdx||0}`;
      const strong   = tok.strong || '';
      const wc       = (tok.wordClass||'').toLowerCase().trim();
      const japanese = tok.japanese || '';
      const matchType = tok.matchType || 'none';
      const morph    = tok.morph || '';
      const lemma    = tok.lemma || '';
      const text     = tok.text || '';

      const compact = {
        ref, book, chapter: chNum, verse: tok.verse,
        strong, morph, wordClass: wc, japanese,
        matchType, lemma, text: text.slice(0,30)
      };

      // Priority 1: Stage 3 pool
      if(stage3Refs.has(ref)){
        categories.stage3_pool.push(compact);
        continue;
      }

      // Priority 2: BL
      if(BLACKLIST.has(strong)){
        categories.bl_excluded.push(compact);
        continue;
      }

      // Priority 3: S4 暫定除外 (in Stage 3 pool's S4 set OR s4ExcRefs)
      if(S4_STRONGS.has(strong) || s4ExcRefs.has(ref)){
        categories.s4_excluded.push(compact);
        continue;
      }

      // Priority 4: Ledger candidates
      const lEntry = ledgerByRef.get(ref);
      if(lEntry){
        const st = lEntry.status;
        if(st === '修正承認' || st === '修正済み'){
          categories.ledger_approved.push({...compact, ledgerStatus: st, proposed: lEntry.proposedJapanese});
        } else if(st === '判断保留'){
          categories.ledger_hold.push({...compact, ledgerStatus: st, proposed: lEntry.proposedJapanese});
        } else if(st === '対象外（今回）'){
          categories.ledger_taigai.push({...compact, ledgerStatus: st});
        } else {
          // 現状維持 in ledger = 3件
          categories.ledger_approved.push({...compact, ledgerStatus: st});
        }
        continue;
      }

      // Priority 5: Stage 2 census only
      if(stage2Refs.has(ref)){
        categories.stage2_only.push(compact);
        continue;
      }

      // Remaining = Stage 4 candidate
      categories.remaining.push(compact);
    }
  }
}

const elapsed = ((Date.now() - tStart)/1000).toFixed(1);
console.log(`走査完了: ${totalTokens}件 (${elapsed}秒)`);

// ── 結果集計 ─────────────────────────────────────────────────────────────
console.log('\n=== カテゴリ別件数 ===');
let catSum = 0;
for(const [k,v] of Object.entries(categories)){
  console.log(`  ${k}: ${v.length}件`);
  catSum += v.length;
}
console.log(`  合計: ${catSum}件 (期待値: ${totalTokens})`);
console.log(`  整合性: ${catSum === totalTokens ? '✅' : '❌ 差分: '+(totalTokens-catSum)}`);

// ── Stage 4 候補: remaining の詳細分析 ──────────────────────────────────
const remaining = categories.remaining;
console.log(`\n=== Stage 4 候補 (remaining): ${remaining.length}件 ===`);

// matchType別
const mt = {};
remaining.forEach(t => { mt[t.matchType] = (mt[t.matchType]||0)+1; });
console.log('matchType:', JSON.stringify(mt));

// wordClass別
const wc = {};
remaining.forEach(t => { wc[t.wordClass] = (wc[t.wordClass]||0)+1; });
console.log('wordClass:', JSON.stringify(wc));

// japanese有無
const hasJA = remaining.filter(t => t.japanese && t.japanese.trim()).length;
const noJA  = remaining.length - hasJA;
console.log(`japanese有: ${hasJA}, 無: ${noJA}`);

// strong別
const byStrong = {};
remaining.forEach(t => {
  if(!byStrong[t.strong]) byStrong[t.strong] = {n:0, wordClass:t.wordClass, japanese:t.japanese};
  byStrong[t.strong].n++;
});
const strongArr = Object.entries(byStrong)
  .map(([s,v]) => ({strong:s, n:v.n, wordClass:v.wordClass, japanese:v.japanese}))
  .sort((a,b) => b.n - a.n);

console.log(`ユニークStrong: ${strongArr.length}`);
console.log('Top 30 Strong (remaining):');
strongArr.slice(0,30).forEach(r =>
  console.log(`  ${r.strong} n=${r.n} wc=${r.wordClass} ja="${r.japanese?.slice(0,15)||'(null)'}"`)
);

// 内容語の分類 (wordClass別)
const contentWC  = new Set(['noun','verb','adj','adjective','adv','adverb','pronoun','pron']);
const functionWC = new Set(['conj','cond','prep','particle','part','interj','interjection']);

const contentWords   = remaining.filter(t => contentWC.has(t.wordClass));
const functionWords  = remaining.filter(t => functionWC.has(t.wordClass));
const unknownWords   = remaining.filter(t => !contentWC.has(t.wordClass) && !functionWC.has(t.wordClass));

console.log(`\n内容語: ${contentWords.length}, 機能語: ${functionWords.length}, 未分類/other: ${unknownWords.length}`);

// matchType=none または japanese=null の内容語
const cw_noJA = contentWords.filter(t => !t.japanese || !t.japanese.trim());
const cw_matchNone = contentWords.filter(t => t.matchType === 'none' || !t.matchType);
const cw_withJA = contentWords.filter(t => t.japanese && t.japanese.trim());
console.log(`  内容語のうち japanese無し: ${cw_noJA.length}`);
console.log(`  内容語のうち matchType=none: ${cw_matchNone.length}`);
console.log(`  内容語のうち japanese有り（matchType≠direct/kanji）: ${cw_withJA.length}`);

// wordClass='' or 'other' breakdown
const otherItems = remaining.filter(t => t.wordClass === '' || t.wordClass === 'other');
console.log(`\nwc='other'/'': ${otherItems.length}件`);

// Stage 2 only の内訳
const s2only = categories.stage2_only;
console.log(`\n=== Stage 2 census only (Stage 3 pool外): ${s2only.length}件 ===`);
const s2mt = {};
s2only.forEach(t => { s2mt[t.matchType] = (s2mt[t.matchType]||0)+1; });
console.log('matchType:', JSON.stringify(s2mt));
const s2wc = {};
s2only.forEach(t => { s2wc[t.wordClass] = (s2wc[t.wordClass]||0)+1; });
console.log('wordClass:', JSON.stringify(s2wc));
const s2strongSet = new Set(s2only.map(t=>t.strong));
console.log('ユニークStrong:', s2strongSet.size);
// Which strongs?
const s2strongArr = {};
s2only.forEach(t => { s2strongArr[t.strong] = (s2strongArr[t.strong]||0)+1; });
const s2top = Object.entries(s2strongArr).sort((a,b)=>b[1]-a[1]).slice(0,20);
console.log('Top 20:', s2top.map(([s,n])=>`${s}(${n})`).join(', '));

// ── 書巻別 remaining 集計 ─────────────────────────────────────────────────
console.log('\n=== 書巻別 remaining 件数 ===');
const byBook = {};
remaining.forEach(t => { byBook[t.book] = (byBook[t.book]||0)+1; });
BOOKS.forEach(b => { if(byBook[b]) console.log(`  ${b}: ${byBook[b]}`); });

// ── NT 137,741 との整合性 ─────────────────────────────────────────────────
console.log('\n=== NT 137,741 対応確認 ===');
console.log(`走査済み: ${totalTokens}`);
console.log(`カテゴリ合計: ${catSum}`);
console.log('内訳:');
console.log(`  Stage 3 pool:        ${categories.stage3_pool.length}`);
console.log(`  BL 恒久除外:         ${categories.bl_excluded.length}`);
console.log(`  S4 暫定除外:         ${categories.s4_excluded.length}`);
console.log(`  Ledger approved:     ${categories.ledger_approved.length}`);
console.log(`  Ledger 保留:         ${categories.ledger_hold.length}`);
console.log(`  Ledger 対象外:       ${categories.ledger_taigai.length}`);
console.log(`  Stage 2 only:        ${categories.stage2_only.length}`);
console.log(`  Remaining (Stage 4): ${categories.remaining.length}`);

// ── 出力ファイル ─────────────────────────────────────────────────────────
const summary = {
  meta: {
    generatedAt: new Date().toISOString().split('T')[0],
    totalNT: totalTokens,
    stage: 'Stage 4 準備',
    note: 'NT全件走査によるtoken単位の監査履歴照合'
  },
  categoryBreakdown: {
    stage3_pool:         { n: categories.stage3_pool.length,     description: 'Stage 3 全件監査済み (pool)' },
    bl_excluded:         { n: categories.bl_excluded.length,     description: '恒久BL (G5213/G5209/G5210/G5216/G2532/G846)' },
    s4_excluded:         { n: categories.s4_excluded.length,     description: 'S4 暫定除外 (σύ単数形)' },
    ledger_approved:     { n: categories.ledger_approved.length, description: '承認済み変更 (修正承認+修正済み+現状維持3件)' },
    ledger_hold:         { n: categories.ledger_hold.length,     description: '判断保留' },
    ledger_taigai:       { n: categories.ledger_taigai.length,   description: '対象外（今回）' },
    stage2_only:         { n: categories.stage2_only.length,     description: 'Stage 2 census のみ (pattern matchTypeまたはBL除外前)' },
    remaining:           { n: categories.remaining.length,       description: 'Stage 4 候補' },
    total:               totalTokens,
  },
  remainingAnalysis: {
    total: remaining.length,
    byMatchType: mt,
    byWordClass: wc,
    byJapanese: { hasJapanese: hasJA, noJapanese: noJA },
    contentWords: {
      total: contentWords.length,
      noJapanese: cw_noJA.length,
      matchTypeNone: cw_matchNone.length,
      hasJapanese: cw_withJA.length,
    },
    functionWords: functionWords.length,
    unknownWordClass: unknownWords.length,
    uniqueStrongs: strongArr.length,
    topStrongs: strongArr.slice(0,50),
  },
  stage2OnlyAnalysis: {
    total: s2only.length,
    byMatchType: s2mt,
    byWordClass: s2wc,
    uniqueStrongs: s2strongSet.size,
    topStrongs: s2top.map(([strong,n])=>({strong,n})),
  },
  integrity: {
    categorySum: catSum,
    matches_totalNT: catSum === totalTokens,
    diff: totalTokens - catSum,
  }
};

// strong別詳細 (remaining)
const remainingByStrong = strongArr.map(r => {
  const toks = remaining.filter(t => t.strong === r.strong);
  const wcDist = {};
  const mtDist = {};
  const books = new Set();
  toks.forEach(t => {
    wcDist[t.wordClass] = (wcDist[t.wordClass]||0)+1;
    mtDist[t.matchType] = (mtDist[t.matchType]||0)+1;
    books.add(t.book);
  });
  const sampleJA = [...new Set(toks.filter(t=>t.japanese).map(t=>t.japanese))].slice(0,5);
  return {
    strong: r.strong,
    n: r.n,
    wordClass: r.wordClass,
    japanese: sampleJA,
    byWordClass: wcDist,
    byMatchType: mtDist,
    books: [...books].sort(),
    bookCount: books.size,
  };
});

// 書巻別 remaining
const remainingByBook = {};
BOOKS.forEach(b => {
  const bt = remaining.filter(t => t.book === b);
  if(!bt.length) return;
  const bwc = {};
  bt.forEach(t => { bwc[t.wordClass] = (bwc[t.wordClass]||0)+1; });
  const bmt = {};
  bt.forEach(t => { bmt[t.matchType] = (bmt[t.matchType]||0)+1; });
  remainingByBook[b] = { n: bt.length, byWordClass: bwc, byMatchType: bmt };
});

// 出力
fs.writeFileSync(path.join(OUT4,'stage4-prep-summary.json'),
  JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(OUT4,'stage4-prep-by-strong.json'),
  JSON.stringify(remainingByStrong, null, 2));
fs.writeFileSync(path.join(OUT4,'stage4-prep-by-book.json'),
  JSON.stringify(remainingByBook, null, 2));

// remaining全件（コンパクト）
fs.writeFileSync(path.join(OUT4,'stage4-prep-pool.json'),
  JSON.stringify({
    meta: { generatedAt: new Date().toISOString().split('T')[0], total: remaining.length },
    allTokens: remaining,
  }, null, 2));

// stage2_only全件
fs.writeFileSync(path.join(OUT4,'stage4-stage2only.json'),
  JSON.stringify({
    meta: { generatedAt: new Date().toISOString().split('T')[0], total: s2only.length },
    allTokens: s2only,
  }, null, 2));

console.log('\n出力完了:');
console.log('  stage4-prep-summary.json');
console.log('  stage4-prep-by-strong.json');
console.log('  stage4-prep-by-book.json');
console.log('  stage4-prep-pool.json');
console.log('  stage4-stage2only.json');
