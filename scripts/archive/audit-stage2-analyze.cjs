#!/usr/bin/env node
/**
 * audit-stage2-analyze.cjs — Stage 2 サンプル詳細分析
 *
 * stage2-jikoji-sample.json の 230件について自動分析:
 *   1. クロストークン衝突検出（同じ節内で同じ日本語ラベルが別のトークンにも存在）
 *   2. 漢字部分一致の曖昧性検出（2字漢字が別の熟語の一部である可能性）
 *   3. 節内でのトークン位置確認（日本語訳の対応箇所との空間的整合）
 *   4. 高頻度・機能語の偽陽性リスク評価
 *
 * 出力: scripts/output/ja1955-full-audit/reports/stage2-jikoji-analysis.json
 *       scripts/output/ja1955-full-audit/reports/stage2-jikoji-analysis.md
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC     = path.join(__dirname, '..', 'public');
const BIBLE_ROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT    = path.join(PUBLIC, 'translations', 'JA1955');
const OUT_DIR    = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

const SAMPLE_FILE   = path.join(OUT_DIR, 'stage2-jikoji-sample.json');
const OUT_ANALYSIS  = path.join(OUT_DIR, 'stage2-jikoji-analysis.json');
const OUT_REPORT    = path.join(OUT_DIR, 'stage2-jikoji-analysis.md');

// ── ユーティリティ ─────────────────────────────────────────────────────────
function stripBrackets(s) {
  return (s||'').replace(/^［(.*)］$/, '$1').replace(/^〔(.*)〕$/, '$1').trim();
}
function hasBracket(s) {
  return /^[［〔]/.test(s||'');
}
function extractKanji(s) {
  return (s||'').replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
}

// 高頻度機能語リスト（偽陽性リスクが特に高い）
const HIGH_FREQ_FUNCTION_WORDS = new Set([
  'そして','また','また、','さて','しかし','ところが','それゆえ','だから','しかし','または',
  'ある','いる','なる','する','ない','れる','られる',
  '彼','彼女','彼ら','それ','これ','あれ','その','この','あの',
  '主','神','人','者','こと','もの','時','中','前','後','上','下',
]);

// ── ファイルキャッシュ ─────────────────────────────────────────────────────
const chapterCache = new Map();
function loadChapter(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!chapterCache.has(key)) {
    const fp = path.join(BIBLE_ROOT, book, `${chapter}.json`);
    try { chapterCache.set(key, JSON.parse(fs.readFileSync(fp,'utf8'))); }
    catch { chapterCache.set(key, []); }
  }
  return chapterCache.get(key);
}

const jaCache = new Map();
function loadJA(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!jaCache.has(key)) {
    const fp = path.join(JA_ROOT, book, `${chapter}.json`);
    try { jaCache.set(key, JSON.parse(fs.readFileSync(fp,'utf8')).verses||{}); }
    catch { jaCache.set(key, {}); }
  }
  return jaCache.get(key);
}

// ── refからbook/chapter/verseを取り出す ───────────────────────────────────
function parseRef(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  if (!m) return null;
  return { book:m[1], chapter:parseInt(m[2]), verse:parseInt(m[3]), idx:parseInt(m[4]) };
}

// ── 節内の全トークンを取得 ─────────────────────────────────────────────────
function getVerseTokens(book, chapter, verse) {
  const tokens = loadChapter(book, chapter);
  return (Array.isArray(tokens) ? tokens : Object.values(tokens))
    .filter(t => String(t.verse) === String(verse));
}

// ── クロストークン衝突チェック ─────────────────────────────────────────────
function detectCrossTokenCollision(token, verseTokens) {
  const ja = token.japanese || '';
  const clean = stripBrackets(ja);
  const kanji = extractKanji(clean);

  const issues = [];

  // 同じ節内で同じJapaneseラベルを持つ別のトークン
  const sameLabel = verseTokens.filter(t =>
    t.ref !== token.ref &&
    (t.japanese||'') === ja
  );
  if (sameLabel.length > 0) {
    issues.push({
      type: 'duplicate_label',
      detail: `同じ節内に同じラベル「${ja}」を持つトークンが${sameLabel.length}件存在 (${sameLabel.map(t=>t.ref||'?').join(', ')})`,
      severity: 'HIGH',
    });
  }

  // 漢字2字のマッチ: 別のトークンのJapanese（striped）に同じ漢字が含まれる
  if (token.matchType === 'kanji' && kanji.length >= 2) {
    const kanjiCollision = verseTokens.filter(t => {
      if (t.ref === token.ref) return false;
      const oc = stripBrackets(t.japanese||'');
      return oc !== clean && oc.includes(kanji);
    });
    if (kanjiCollision.length > 0) {
      issues.push({
        type: 'kanji_collision',
        detail: `漢字「${kanji}」が別のトークンのラベル「${kanjiCollision.map(t=>stripBrackets(t.japanese||'')).join('、')}」にも含まれる`,
        severity: 'HIGH',
      });
    }
  }

  // 直接マッチ: 節テキスト内で同じ語が複数箇所に現れる
  if (token.matchType === 'direct' && clean) {
    const vt = token.verseText || '';
    // cleanが節内に2回以上現れるか
    const count = vt.split(clean).length - 1;
    if (count > 1) {
      issues.push({
        type: 'multi_occurrence',
        detail: `「${clean}」が節内に${count}回出現（どの出現に対応するか不明）`,
        severity: 'MEDIUM',
      });
    }
  }

  return issues;
}

// ── 意味的妥当性の自動評価 ─────────────────────────────────────────────────
function assessSemanticValidity(token) {
  const ja = token.japanese || '';
  const clean = stripBrackets(ja);
  const issues = [];

  // 高頻度機能語チェック
  if (HIGH_FREQ_FUNCTION_WORDS.has(clean)) {
    issues.push({
      type: 'high_freq_function_word',
      detail: `「${clean}」は高頻度機能語。節内での文脈依存性が高く、同じStrongでも異なる訳が自然な場合がある。`,
      severity: 'MEDIUM',
    });
  }

  // 代名詞チェック: 代名詞は指示対象が文脈依存
  if (token.wordClass === 'pronoun') {
    issues.push({
      type: 'pronoun_referent',
      detail: `代名詞（${token.strong}）は指示対象が文脈依存。「${clean}」が節テキスト中に存在しても意味的対応が正確かは別問題。`,
      severity: 'MEDIUM',
    });
  }

  // 括弧付きラベルのstripped値チェック: stripped後が空
  if (hasBracket(ja)) {
    if (!clean) {
      issues.push({
        type: 'empty_stripped_bracket',
        detail: `括弧付きラベル「${ja}」のstripped値が空`,
        severity: 'LOW',
      });
    }
  }

  return issues;
}

// ── 総合評価 ─────────────────────────────────────────────────────────────
function evaluateToken(token) {
  const ref = parseRef(token.ref);
  if (!ref) return { validity: 'uncertain', issues: [{type:'bad_ref', detail:'ref解析失敗', severity:'HIGH'}] };

  const verseTokens = getVerseTokens(ref.book, ref.chapter, ref.verse);

  // このトークン自体をverseTokensから特定
  const selfToken = verseTokens.find(t => t.ref === token.ref);

  const crossIssues = detectCrossTokenCollision(token, verseTokens);
  const semanticIssues = assessSemanticValidity(token);
  const allIssues = [...crossIssues, ...semanticIssues];

  // 節内の前後±3トークンのコンテキスト
  const sorted = verseTokens.sort((a,b)=>(parseInt(a.tokenId||a.globalIdx||0)-parseInt(b.tokenId||b.globalIdx||0)));
  const selfIdx = sorted.findIndex(t => t.ref === token.ref);
  const context = sorted.slice(Math.max(0,selfIdx-3), selfIdx+4).map(t=>({
    ref: t.ref,
    text: t.text||t.word||'',
    japanese: t.japanese||'',
    strong: t.strong||'',
  }));

  // 節内の全Japaneseラベル（ユニーク）
  const allLabels = [...new Set(verseTokens.map(t=>t.japanese||'').filter(Boolean))];

  // 最終評価
  const hasSevereIssue = allIssues.some(i=>i.severity==='HIGH');
  const hasMediumIssue = allIssues.some(i=>i.severity==='MEDIUM');

  let validity, ja1955Correspondence;

  if (hasSevereIssue) {
    validity = 'likely_false_positive';
    ja1955Correspondence = 'uncertain';
  } else if (hasMediumIssue && token.matchType === 'kanji') {
    validity = 'needs_review';
    ja1955Correspondence = 'implicit';
  } else if (token.matchType === 'direct' && !hasSevereIssue && !hasMediumIssue) {
    validity = 'likely_valid';
    ja1955Correspondence = 'explicit';
  } else if (token.matchType === 'kanji' && !hasSevereIssue) {
    validity = 'probably_valid';
    ja1955Correspondence = 'implicit';
  } else if (token.matchType === 'pattern_nomatch') {
    validity = 'likely_valid'; // パターン外 = 既に更新済みか該当外
    ja1955Correspondence = 'not_checked';
  } else if (token.matchType === 'pattern_match') {
    validity = 'likely_valid';
    ja1955Correspondence = 'explicit';
  } else {
    validity = 'probably_valid';
    ja1955Correspondence = hasMediumIssue ? 'implicit' : 'explicit';
  }

  return {
    validity,
    ja1955Correspondence,
    issues: allIssues,
    context,
    verseTokenCount: verseTokens.length,
  };
}

// ── メイン ─────────────────────────────────────────────────────────────────
const sampleData = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf8'));
const results = {
  meta: {
    title: 'Stage 2 サンプル詳細分析',
    generatedAt: new Date().toISOString().slice(0,10),
    totalSample: sampleData.meta.totalSample,
  },
  summary: {
    likely_valid: 0,
    probably_valid: 0,
    needs_review: 0,
    likely_false_positive: 0,
    uncertain: 0,
  },
  byStratum: {},
  allAnalyzed: [],
  falsePosAlerts: [],
};

for (const [stratumKey, stratum] of Object.entries(sampleData.strata)) {
  results.byStratum[stratumKey] = {
    label: stratum.label,
    sampleCount: stratum.sampleCount,
    likely_valid: 0,
    probably_valid: 0,
    needs_review: 0,
    likely_false_positive: 0,
    uncertain: 0,
    tokens: [],
  };

  for (const token of stratum.tokens) {
    const eval_ = evaluateToken(token);

    const rec = {
      ...token,
      stratum: stratumKey,
      validity: eval_.validity,
      ja1955_correspondence: eval_.ja1955Correspondence,
      issues: eval_.issues,
      context: eval_.context,
      verseTokenCount: eval_.verseTokenCount,
    };

    results.allAnalyzed.push(rec);
    results.byStratum[stratumKey].tokens.push(rec);
    results.summary[eval_.validity] = (results.summary[eval_.validity]||0) + 1;
    results.byStratum[stratumKey][eval_.validity] = (results.byStratum[stratumKey][eval_.validity]||0) + 1;

    if (eval_.validity === 'likely_false_positive' || eval_.validity === 'needs_review') {
      results.falsePosAlerts.push({
        ref: token.ref,
        stratum: stratumKey,
        japanese: token.japanese,
        strong: token.strong,
        matchType: token.matchType,
        validity: eval_.validity,
        issues: eval_.issues,
        verseText: token.verseText,
      });
    }
  }
}

fs.writeFileSync(OUT_ANALYSIS, JSON.stringify(results, null, 2), 'utf8');
console.log(`Analysis: ${OUT_ANALYSIS}`);
console.log('Summary:', results.summary);
console.log('FalsePosAlerts:', results.falsePosAlerts.length, '件');

// ── Markdownレポート ───────────────────────────────────────────────────────
const fpAlertsByType = {};
for (const a of results.falsePosAlerts) {
  for (const iss of a.issues) {
    if (!fpAlertsByType[iss.type]) fpAlertsByType[iss.type] = [];
    fpAlertsByType[iss.type].push(a);
  }
}

// 層別代表サンプル（likely_false_positive と needs_review を抜粋）
const alertRows = results.falsePosAlerts.slice(0,30).map(a=>`| ${a.ref} | ${a.japanese} | ${a.strong} | ${a.matchType} | ${a.validity} | ${a.issues.map(i=>i.detail.slice(0,50)).join('/')} |`).join('\n');

const md = `# Stage 2 サンプル詳細分析レポート

生成日: ${new Date().toISOString().slice(0,10)}

---

## 1. 分析サマリー

分析対象: ${sampleData.meta.totalSample}件（6層化サンプル）

### 自動評価結果

| 評価 | 件数 | 説明 |
|------|------|------|
| likely_valid | ${results.summary.likely_valid||0} | 偽陽性の可能性が低い |
| probably_valid | ${results.summary.probably_valid||0} | おそらく妥当（軽微な懸念あり） |
| needs_review | ${results.summary.needs_review||0} | 人的確認推奨 |
| likely_false_positive | ${results.summary.likely_false_positive||0} | 偽陽性の可能性が高い |
| uncertain | ${results.summary.uncertain||0} | 判定不能 |

### 妥当率推定

- 妥当（likely_valid + probably_valid）: **${((results.summary.likely_valid||0)+(results.summary.probably_valid||0))}件 / ${sampleData.meta.totalSample}件 (${(((results.summary.likely_valid||0)+(results.summary.probably_valid||0))/sampleData.meta.totalSample*100).toFixed(1)}%)**
- 要注意（needs_review + likely_false_positive）: **${((results.summary.needs_review||0)+(results.summary.likely_false_positive||0))}件 (${(((results.summary.needs_review||0)+(results.summary.likely_false_positive||0))/sampleData.meta.totalSample*100).toFixed(1)}%)**

---

## 2. 層別結果

${Object.entries(results.byStratum).map(([k,v])=>`
### ${k}: ${v.label} (${v.sampleCount}件)

| likely_valid | probably_valid | needs_review | likely_false_positive | uncertain |
|---|---|---|---|---|
| ${v.likely_valid||0} | ${v.probably_valid||0} | ${v.needs_review||0} | ${v.likely_false_positive||0} | ${v.uncertain||0} |
`).join('')}

---

## 3. 偽陽性アラート（上位30件）

| ref | Japanese | Strong | matchType | 評価 | 理由 |
|-----|----------|--------|-----------|------|------|
${alertRows}

---

## 4. 問題パターン別件数

${Object.entries(fpAlertsByType).map(([type,cases])=>`
### ${type}: ${cases.length}件

例:
${cases.slice(0,3).map(c=>`- ${c.ref}: 「${c.japanese}」 (${c.strong}) — ${c.issues.find(i=>i.type===type)?.detail?.slice(0,80)}`).join('\n')}
`).join('\n')}

---

## 5. 自動判定ロジックの改善候補

1. **クロストークン衝突チェックの欠如**: 現行の \`containsBase()\` は節テキスト中に語が存在するかのみ確認し、どのトークンに対応する語かを検証しない。節内に同じラベルが複数トークンに存在する場合、最初の出現に対応する語のみが妥当な可能性がある。

2. **高頻度機能語の一括通過**: 「そして」「また」「主」「神」「人」等の高頻度語は、節内に語が存在しても意味的対応が自動判定困難。これらは現状維持ではなく「要確認」に分類すべき。

3. **漢字抽出マッチのコンテキスト不検証**: kanji matchは2字以上の漢字を抽出して一致判定するが、その漢字が別の熟語の一部として現れている可能性を排除できない。

---

## 6. Stage 3前に解決すべき課題

1. **高頻度機能語の偽陽性率推定**: 「そして」「また」「主」「神」等がどの程度誤判定されているか、専用サンプリングが必要。
2. **Strong別の現状維持確度分布**: 高頻度Strongの現状維持件数に対し、実際に対応している割合の推定が不十分。
3. **lexi上の多義語チェック**: 同一Strongでも文脈によって訳語が異なる語（G435=男/人、G3962=父/先祖等）の現状維持判定は、Strong単位でなく文脈単位で検証が必要。

---
`;

fs.writeFileSync(OUT_REPORT, md, 'utf8');
console.log(`Report: ${OUT_REPORT}`);
