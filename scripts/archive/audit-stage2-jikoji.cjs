#!/usr/bin/env node
/**
 * audit-stage2-jikoji.cjs — Stage 2: 現状維持 32,169件の検証
 *
 * 自動判定で「現状維持」とされたトークンを再抽出し、
 * 誤判定リスク別に層化サンプルを設計・分析する。
 *
 * 分析軸:
 *   A. マッチ種別: direct（完全一致）/ kanji（漢字抽出一致）/ pattern（パターン分岐）/ bracket（括弧付き）
 *   B. 語クラス: 名詞 / 動詞 / 形容詞 / 副詞 / 代名詞 / 前置詞 / 不変化詞
 *   C. 偽陽性リスク: HIGH / MEDIUM / LOW
 *
 * 実行: node scripts/audit-stage2-jikoji.cjs
 * 出力: scripts/output/ja1955-full-audit/reports/stage2-jikoji-census.json
 *       scripts/output/ja1955-full-audit/reports/stage2-jikoji-sample.json
 *       scripts/output/ja1955-full-audit/reports/stage2-jikoji-report.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC      = path.join(__dirname, '..', 'public');
const BIBLE_ROOT  = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT     = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR     = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

const OUT_CENSUS  = path.join(OUT_DIR, 'stage2-jikoji-census.json');
const OUT_SAMPLE  = path.join(OUT_DIR, 'stage2-jikoji-sample.json');
const OUT_REPORT  = path.join(OUT_DIR, 'stage2-jikoji-report.md');

// ── audit-ja1955-nt-wide.cjs と同一の判定ロジック ────────────────────────

// audit-ja1955-nt-wide.cjs の PILOT_PATTERNS と完全一致（12件）
const PATTERNS = [
  { strong:'G5088', before:'産む',        after:'生む',     conservative:false },
  { strong:'G658',  before:'完成する',    after:'熟する',   conservative:false },
  { strong:'G1828', before:'引き出す',    after:'引く',     conservative:false },
  { strong:'G4815', before:'捕らえる',    after:'はらむ',   conservative:false },
  { strong:'G5278', before:'忍耐する',    after:'耐え忍ぶ', conservative:false },
  { strong:'G1939', before:'欲望',        after:'欲',       conservative:false },
  { strong:'G1538', before:'各自',        after:'それぞれ', conservative:false },
  { strong:'G435',  before:'男',          after:'人',       conservative:true  },
  { strong:'G3985', before:'試みる',      after:'誘惑する', conservative:true  },
  { strong:'G3986', before:'誘惑',        after:'試錬',     conservative:true  },
  { strong:'G1161', before:'［転換語句］', after:'また',    conservative:true  },
  { strong:'G846',  before:'彼',          after:'自ら',     conservative:true  },
];

function stripBrackets(s) {
  return (s||'').replace(/^［(.*)］$/, '$1').replace(/^〔(.*)〕$/, '$1').trim();
}
function hasBracket(s) {
  return /^[［〔]/.test(s||'');
}
function containsBase(verseText, japaneseBase) {
  if (!verseText || !japaneseBase) return false;
  const clean = stripBrackets(japaneseBase);
  if (!clean) return false;
  if (verseText.includes(clean)) return true;
  const kanji = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  if (kanji.length >= 2 && verseText.includes(kanji)) return true;
  return false;
}
function verseContains(v, w) { return (v||'').includes(w||''); }

function getMatchType(ja, verseText) {
  if (!ja || !verseText) return 'none';
  const clean = stripBrackets(ja);
  if (verseText.includes(clean)) return 'direct';
  const kanji = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  if (kanji.length >= 2 && verseText.includes(kanji)) return 'kanji';
  return 'none';
}

function classify(token, verseText, pattern) {
  const ja = token.japanese || '';
  const isBracket = hasBracket(ja);
  const strippedJa = stripBrackets(ja);

  if (!verseText) return null; // 要確認

  if (pattern) {
    const currentMatches = ja === pattern.before;
    const verseHasAfter  = verseContains(verseText, pattern.after);
    const verseHasBefore = containsBase(verseText, pattern.before);
    if (!currentMatches) return { verdict:'現状維持', matchType:'pattern_nomatch' };
    if (pattern.conservative) {
      if (verseHasAfter && !verseHasBefore) return null; // 更新候補
      return null; // 要確認
    } else {
      if (verseHasAfter) return null; // 更新候補
      if (verseHasBefore) return { verdict:'現状維持', matchType:'pattern_match' };
      return null; // 要確認
    }
  }

  if (isBracket) {
    if (strippedJa && verseContains(verseText, strippedJa))
      return { verdict:'現状維持', matchType:'bracket' };
    return null; // 要確認
  }

  if (containsBase(verseText, ja)) {
    const mt = getMatchType(ja, verseText);
    return { verdict:'現状維持', matchType: mt };
  }
  return null; // 要確認
}

// ── キャッシュ ────────────────────────────────────────────────────────────
const jaCache = new Map();
function loadJA(book, ch) {
  const key=`${book}/${ch}`;
  if (!jaCache.has(key)) {
    try {
      const d=JSON.parse(fs.readFileSync(path.join(JA_ROOT,book,`${ch}.json`),'utf8'));
      jaCache.set(key, d.verses||{});
    } catch { jaCache.set(key,{}); }
  }
  return jaCache.get(key);
}

// ── 語クラス分類 ─────────────────────────────────────────────────────────
function getWordClass(morph, pos, cls) {
  const p = (morph||'').split('-')[0] || pos || '';
  if (p==='V') return 'verb';
  if (p==='N') return 'noun';
  if (p==='A') return 'adj';
  if (p==='D') return 'adv';
  if (p==='P') return 'pronoun';
  if (p==='R') return 'pronoun'; // relative
  if (p==='C') return 'conj';
  if (p==='T') return 'article';
  if (p==='PREP') return 'prep';
  if (p==='PRT') return 'particle';
  if (cls==='verb') return 'verb';
  if (cls==='noun') return 'noun';
  if (cls==='adj') return 'adj';
  if (cls==='adv') return 'adv';
  if (cls==='conj') return 'conj';
  if (cls==='det') return 'article';
  if (cls==='prep') return 'prep';
  if (cls==='prtcl') return 'particle';
  return 'other';
}

// ── 偽陽性リスク評価 ─────────────────────────────────────────────────────
function assessFalsePosRisk(token, matchType, verseText, allVerseTokens) {
  const ja = token.japanese || '';
  const clean = stripBrackets(ja);

  // bracket は medium（strippedValue の単語が別の文脈で現れる可能性）
  if (matchType === 'bracket') return 'MEDIUM';
  if (matchType === 'pattern_nomatch' || matchType === 'pattern_match') return 'LOW';

  // direct match
  if (matchType === 'direct') {
    // 1文字・ひらがなのみ → HIGH risk（一般的な語が他の単語に含まれる可能性）
    if (clean.length <= 1) return 'HIGH';
    if (/^[ぁ-ん]+$/.test(clean) && clean.length <= 3) return 'HIGH';
    // 非常に一般的な語（〜する, する, ない等）→ HIGH
    const highFreqTokens = ['する','ない','ある','いる','なる','れる','られる',
                            '〜する','〜ない','〜ある','〜なる','〜的','〜者'];
    if (highFreqTokens.some(h => clean.includes(h) && clean.length <= 3)) return 'HIGH';
    // 2-3字の一般的な語 → MEDIUM
    if (clean.length <= 3 && /[ぁ-ん]/.test(clean)) return 'MEDIUM';
    // 4字以上の複合語 → LOW
    return 'LOW';
  }

  // kanji match（最もリスクが高い）
  if (matchType === 'kanji') {
    const kanji = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
    // 漢字が節内の別のトークンに含まれる可能性 → cross-token collision check
    const otherJa = allVerseTokens
      .filter(t => t.ref !== token.ref)
      .map(t => t.japanese || '');
    const kanjiInOther = otherJa.some(oja => {
      const oClean = stripBrackets(oja);
      return oClean !== clean && oClean.includes(kanji);
    });
    if (kanjiInOther) return 'HIGH'; // 別トークンが同じ漢字を含む → 衝突の可能性
    // 2文字漢字 → MEDIUM（別の熟語の一部である可能性）
    if (kanji.length === 2) return 'MEDIUM';
    // 3字以上の漢字 → LOW（より特定性が高い）
    return 'LOW';
  }

  return 'MEDIUM';
}

// ── メイン走査 ────────────────────────────────────────────────────────────
const patternMap = new Map();
for (const p of PATTERNS) {
  if (!patternMap.has(p.strong)) patternMap.set(p.strong, []);
  patternMap.get(p.strong).push(p);
}

const allTokens = [];     // 全NT
const jikojiTokens = [];  // 現状維持のみ

const books = fs.readdirSync(BIBLE_ROOT).sort();
let totalNT = 0;

console.log('NT全体を走査中...');

for (const book of books) {
  const dir = path.join(BIBLE_ROOT, book);
  const chs = fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort((a,b)=>parseInt(a)-parseInt(b));
  for (const chFile of chs) {
    const chapter = path.basename(chFile,'.json');
    const data = JSON.parse(fs.readFileSync(path.join(dir,chFile),'utf8'));
    const ja1955 = loadJA(book, chapter);
    const tokens = Object.values(data).sort((a,b)=>parseInt(a.globalIdx||0)-parseInt(b.globalIdx||0));
    totalNT += tokens.length;

    // 節別にグループ化
    const byVerse = new Map();
    for (const t of tokens) {
      if (!byVerse.has(t.verse)) byVerse.set(t.verse, []);
      byVerse.get(t.verse).push(t);
    }

    for (const token of tokens) {
      const verseText = ja1955[token.verse] || null;
      const patterns = patternMap.get(token.strong) || [];
      let matchedPattern = null;
      for (const pat of patterns) {
        const res = classify(token, verseText, pat);
        if (res && res.verdict === '現状維持') { matchedPattern = pat; break; }
        if (pat.strong === token.strong && token.japanese === pat.before) { matchedPattern = null; break; }
      }

      const result = classify(token, verseText,
        patterns.find(p => p.strong === token.strong) || null);

      if (!result || result.verdict !== '現状維持') continue;

      const verseTokens = byVerse.get(token.verse) || [];
      const risk = assessFalsePosRisk(token, result.matchType, verseText, verseTokens);
      const wc = getWordClass(token.morph, token.role || '', token.class || '');

      jikojiTokens.push({
        ref:         token.ref,
        book,
        chapter,
        verse:       token.verse,
        globalIdx:   parseInt(token.globalIdx||0),
        text:        token.text,
        lemma:       token.lemma,
        strong:      token.strong,
        morph:       token.morph,
        japanese:    token.japanese,
        english:     token.english,
        wordClass:   wc,
        matchType:   result.matchType,
        falsePosRisk: risk,
        verseText,
      });
    }
  }
}

console.log(`走査完了: NT ${totalNT}件, 現状維持 ${jikojiTokens.length}件`);

// ── 統計集計 ─────────────────────────────────────────────────────────────
const stats = {
  total: jikojiTokens.length,
  byMatchType: {},
  byWordClass: {},
  byFalsePosRisk: {},
  byBook: {},
  byStrong: {},
  topStrong: [],
};

for (const t of jikojiTokens) {
  stats.byMatchType[t.matchType]   = (stats.byMatchType[t.matchType]||0) + 1;
  stats.byWordClass[t.wordClass]   = (stats.byWordClass[t.wordClass]||0) + 1;
  stats.byFalsePosRisk[t.falsePosRisk] = (stats.byFalsePosRisk[t.falsePosRisk]||0) + 1;
  stats.byBook[t.book]             = (stats.byBook[t.book]||0) + 1;
  stats.byStrong[t.strong]         = (stats.byStrong[t.strong]||0) + 1;
}
stats.topStrong = Object.entries(stats.byStrong)
  .sort((a,b)=>b[1]-a[1]).slice(0,30)
  .map(([s,n])=>({strong:s,count:n}));

// ── 層化サンプル設計 ─────────────────────────────────────────────────────
/*
 * 層化基準:
 *   L1: HIGH falsePosRisk（偽陽性リスク高）— 全件または上限
 *   L2: MEDIUM risk × kanji matchType
 *   L3: MEDIUM risk × direct matchType
 *   L4: LOW risk × high-frequency Strong（≥ 100件）
 *   L5: LOW risk × rare Strong（< 10件）
 *   L6: bracket / pattern matchType
 *
 * 目標: 各層から代表性のあるサンプルを取得し、人的確認 300件以内で覆域を確保
 */

const STRATUM_TARGETS = {
  L1: 50,   // HIGH risk — 全件か上限50
  L2: 50,   // MEDIUM + kanji
  L3: 40,   // MEDIUM + direct
  L4: 40,   // LOW + high-freq Strong
  L5: 30,   // LOW + rare Strong
  L6: 20,   // bracket + pattern
};

function pickStratifiedSample(pool, n, seedRng) {
  if (pool.length <= n) return [...pool];
  // 書巻の多様性を確保しつつ疑似ランダムに選択
  const byBook = {};
  for (const t of pool) {
    if (!byBook[t.book]) byBook[t.book] = [];
    byBook[t.book].push(t);
  }
  const result = [];
  const booksWithData = Object.keys(byBook);
  let i = 0;
  while (result.length < n && i < pool.length) {
    for (const bk of booksWithData) {
      if (result.length >= n) break;
      const candidates = byBook[bk];
      const idx = Math.floor((i * 37 + seedRng) % candidates.length); // 疑似乱数
      const candidate = candidates[idx];
      if (candidate && !result.find(r=>r.ref===candidate.ref)) {
        result.push(candidate);
      }
    }
    i++;
  }
  return result;
}

const L1_pool = jikojiTokens.filter(t=>t.falsePosRisk==='HIGH');
const L2_pool = jikojiTokens.filter(t=>t.falsePosRisk==='MEDIUM'&&t.matchType==='kanji');
const L3_pool = jikojiTokens.filter(t=>t.falsePosRisk==='MEDIUM'&&t.matchType==='direct');

// LOW risk: 高頻度 vs 低頻度 Strong
const highFreqStrongs = new Set(
  Object.entries(stats.byStrong).filter(([,n])=>n>=100).map(([s])=>s));
const L4_pool = jikojiTokens.filter(t=>t.falsePosRisk==='LOW'&&highFreqStrongs.has(t.strong));
const L5_pool = jikojiTokens.filter(t=>t.falsePosRisk==='LOW'&&
  stats.byStrong[t.strong]&&stats.byStrong[t.strong]<10);
const L6_pool = jikojiTokens.filter(t=>t.matchType==='bracket'||t.matchType.startsWith('pattern'));

const sampleL1 = pickStratifiedSample(L1_pool, STRATUM_TARGETS.L1, 13);
const sampleL2 = pickStratifiedSample(L2_pool, STRATUM_TARGETS.L2, 7);
const sampleL3 = pickStratifiedSample(L3_pool, STRATUM_TARGETS.L3, 19);
const sampleL4 = pickStratifiedSample(L4_pool, STRATUM_TARGETS.L4, 41);
const sampleL5 = pickStratifiedSample(L5_pool, STRATUM_TARGETS.L5, 3);
const sampleL6 = pickStratifiedSample(L6_pool, STRATUM_TARGETS.L6, 23);

const strata = {
  L1: { label:'HIGH偽陽性リスク', target:STRATUM_TARGETS.L1, pool:L1_pool.length, sample:sampleL1 },
  L2: { label:'MEDIUM・漢字抽出マッチ', target:STRATUM_TARGETS.L2, pool:L2_pool.length, sample:sampleL2 },
  L3: { label:'MEDIUM・直接マッチ', target:STRATUM_TARGETS.L3, pool:L3_pool.length, sample:sampleL3 },
  L4: { label:'LOW・高頻度Strong(≥100件)', target:STRATUM_TARGETS.L4, pool:L4_pool.length, sample:sampleL4 },
  L5: { label:'LOW・低頻度Strong(<10件)', target:STRATUM_TARGETS.L5, pool:L5_pool.length, sample:sampleL5 },
  L6: { label:'bracket/patternマッチ', target:STRATUM_TARGETS.L6, pool:L6_pool.length, sample:sampleL6 },
};

const totalSample = Object.values(strata).reduce((s,l)=>s+l.sample.length, 0);
console.log(`サンプル総数: ${totalSample}件`);

// ── 出力 ──────────────────────────────────────────────────────────────────
fs.writeFileSync(OUT_CENSUS, JSON.stringify({
  meta: {
    title:'Stage 2 現状維持 32,169件 層化サンプル設計',
    generatedAt: new Date().toISOString().slice(0,10),
    ntTotal: totalNT,
    jikojiTotal: jikojiTokens.length,
    sampleTotal: totalSample,
  },
  stats,
  strataDesign: Object.entries(strata).reduce((a,[k,v])=>{
    a[k]={label:v.label,poolSize:v.pool,targetSample:v.target,actualSample:v.sample.length};
    return a;
  },{}),
  allTokens: jikojiTokens, // 全件（集計・波及調査に使用）
}, null, 2), 'utf8');
console.log(`Census: ${OUT_CENSUS}`);

fs.writeFileSync(OUT_SAMPLE, JSON.stringify({
  meta: {
    title:'Stage 2 層化サンプル — 人的確認用',
    generatedAt: new Date().toISOString().slice(0,10),
    totalSample,
    note:'各サンプルの ja1955_assessment / validity_verdict / reason は null（人的確認待ち）',
  },
  strata: Object.entries(strata).reduce((a,[k,v])=>{
    a[k]={
      label:v.label,
      poolSize:v.pool,
      sampleCount:v.sample.length,
      tokens: v.sample.map(t=>({
        ref:t.ref,
        text:t.text,
        strong:t.strong,
        japanese:t.japanese,
        matchType:t.matchType,
        falsePosRisk:t.falsePosRisk,
        wordClass:t.wordClass,
        morph:t.morph,
        english:t.english,
        verseText:t.verseText,
        // null → 人的確認待ち
        ja1955_correspondence: null,
        validity_verdict: null,
        reason: null,
      })),
    };
    return a;
  },{}),
}, null, 2), 'utf8');
console.log(`Sample: ${OUT_SAMPLE}`);

// ── Markdown レポート ─────────────────────────────────────────────────────
const md = `# Stage 2 現状維持 ${jikojiTokens.length}件 層化サンプル設計報告

生成日: ${new Date().toISOString().slice(0,10)}

---

## 1. 件数確認

| 区分 | 件数 |
|------|------|
| NT総トークン | ${totalNT} |
| 現状維持（再集計） | ${jikojiTokens.length} |
| 期待値 | 32,169 |
| 差 | ${jikojiTokens.length - 32169} |

## 2. 現状維持トークンの内訳

### マッチ種別

| マッチ種別 | 件数 | 説明 |
|-----------|------|------|
${Object.entries(stats.byMatchType).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} | — |`).join('\n')}

### 偽陽性リスク別

| リスク | 件数 | 割合 |
|--------|------|------|
${Object.entries(stats.byFalsePosRisk).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} | ${(v/jikojiTokens.length*100).toFixed(1)}% |`).join('\n')}

### 語クラス別

| 語クラス | 件数 |
|---------|------|
${Object.entries(stats.byWordClass).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} |`).join('\n')}

### 頻出 Strong番号（上位20）

| Strong | 件数 |
|--------|------|
${stats.topStrong.slice(0,20).map(s=>`| ${s.strong} | ${s.count} |`).join('\n')}

## 3. 層化サンプル設計

${Object.entries(strata).map(([k,v])=>`
### ${k}: ${v.label}

- プール規模: ${v.pool}件
- サンプル数: ${v.sample.length}件
- 選定基準: ${k === 'L1' ? 'falsePosRisk=HIGH（短い語・ひらがなのみ・衝突リスク）' :
             k === 'L2' ? 'falsePosRisk=MEDIUM かつ matchType=kanji（漢字抽出一致・cross-token衝突可能性）' :
             k === 'L3' ? 'falsePosRisk=MEDIUM かつ matchType=direct（直接マッチ・一般語）' :
             k === 'L4' ? 'falsePosRisk=LOW かつ Strong出現頻度≥100件（主要語彙）' :
             k === 'L5' ? 'falsePosRisk=LOW かつ Strong出現頻度<10件（稀少語・固有名詞等）' :
                          'matchType=bracket または pattern（特殊マッチ）'}
`).join('')}

**合計サンプル: ${totalSample}件**

## 4. 人的確認方法

各サンプルトークンについて以下を確認:

1. **文字列が別のギリシャ語に対応していないか** (cross-token collision)
2. **同じ Strong番号でも文脈によって意味が異なる可能性**
3. **JA1955の語が別の節構造から来ていないか**
4. **自動判定の根拠（matchType）が意味的に有効か**

確認用フィールド: \`ja1955_correspondence\`（explicit/implicit/none/uncertain）+ \`validity_verdict\`（適切/誤判定/判断保留）

---
`;

fs.writeFileSync(OUT_REPORT, md, 'utf8');
console.log(`Report: ${OUT_REPORT}`);
console.log('\n=== 集計サマリー ===');
console.log('matchType:', stats.byMatchType);
console.log('falsePosRisk:', stats.byFalsePosRisk);
console.log('wordClass:', stats.byWordClass);
