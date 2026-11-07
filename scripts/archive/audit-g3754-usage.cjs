#!/usr/bin/env node
/**
 * audit-g3754-usage.cjs
 *
 * NT全体のG3754 (ὅτι) 1,294件について、
 * content / causal / recitative / other / uncertain の用法を分類する。
 *
 * 分類根拠:
 *   1. LN (Louw-Nida) ドメインコード (90.21=content, 89.33=causal, 91.15=recitative)
 *   2. english フィールド (that/because/for/since/why/how)
 *   3. 前後文脈 (±5トークン) による統語的分析
 *   4. JA1955の節テキスト (理由節マーカーの確認)
 *
 * 出力: scripts/output/ja1955-full-audit/reports/stage1-g3754-usage.json
 *       scripts/output/ja1955-full-audit/reports/stage1-g3754-usage-report.md
 *
 * 実行: node scripts/audit-g3754-usage.cjs
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BIBLE_ROOT  = path.join(__dirname, '..', 'public', 'bible_data', 'nt');
const JA_ROOT     = path.join(__dirname, '..', 'public', 'translations', 'JA1955');
const OUT_DIR     = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');
const OUT_JSON    = path.join(OUT_DIR, 'stage1-g3754-usage.json');
const OUT_MD      = path.join(OUT_DIR, 'stage1-g3754-usage-report.md');

const CONTEXT_WINDOW = 5;

// ── キャッシュ ──────────────────────────────────────────────────────────────
const chapterCache  = new Map();
const ja1955Cache   = new Map();

function loadChapter(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!chapterCache.has(key)) {
    const fp = path.join(BIBLE_ROOT, book, `${chapter}.json`);
    chapterCache.set(key, JSON.parse(fs.readFileSync(fp, 'utf8')));
  }
  return chapterCache.get(key);
}

function loadJA1955(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!ja1955Cache.has(key)) {
    const fp = path.join(JA_ROOT, book, `${chapter}.json`);
    try {
      const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
      ja1955Cache.set(key, d.verses || {});
    } catch {
      ja1955Cache.set(key, {});
    }
  }
  return ja1955Cache.get(key);
}

// ── 前後文脈取得 ────────────────────────────────────────────────────────────
function getContext(book, chapter, targetRef) {
  const data   = loadChapter(book, chapter);
  const tokens = Object.values(data).sort((a, b) => {
    const ai = parseInt(a.globalIdx ?? 0);
    const bi = parseInt(b.globalIdx ?? 0);
    return ai - bi;
  });
  const idx = tokens.findIndex(t => t.ref === targetRef);
  if (idx < 0) return { before: [], after: [] };

  const before = tokens.slice(Math.max(0, idx - CONTEXT_WINDOW), idx)
    .map(t => ({ ref: t.ref, text: t.text, japanese: t.japanese, strong: t.strong,
                 morph: t.morph, english: t.english, lemma: t.lemma }));
  const after  = tokens.slice(idx + 1, idx + 1 + CONTEXT_WINDOW)
    .map(t => ({ ref: t.ref, text: t.text, japanese: t.japanese, strong: t.strong,
                 morph: t.morph, english: t.english, lemma: t.lemma }));
  return { before, after };
}

// ── 統治動詞分析 ────────────────────────────────────────────────────────────

// 強い内容節統治動詞のlemma パターン
const CONTENT_VERB_LEMMAS = new Set([
  // 認知・知識
  'οἶδα','γινώσκω','ἐπίσταμαι','νοέω','συνίημι','ἐπιγινώσκω','ἀγνοέω',
  // 知覚
  'ὁράω','βλέπω','θεωρέω','ἀκούω','αἰσθάνομαι',
  // 発言・報告
  'λέγω','λαλέω','ἀγγέλλω','ἀναγγέλλω','ἀπαγγέλλω','κηρύσσω',
  'μαρτυρέω','ὁμολογέω','εἶπον','ἀποκρίνομαι','γράφω',
  // 信念・確信
  'πιστεύω','νομίζω','δοκέω','ὑπολαμβάνω','πείθομαι',
  // 感情表現（内容節）
  'οἴομαι','ἐλπίζω',
  // 理解・発見
  'εὑρίσκω','δείκνυμι','φαίνομαι',
  // 承認・受容
  'δέχομαι','παραδέχομαι',
  // 示す・証明
  'ἀποδεικνύω','δηλόω',
  // 想起
  'μνημονεύω','ἀναμιμνήσκω',
  // 告白
  'ἐξομολογέω',
]);

// 強い理由節統治要素
const CAUSAL_CONTEXT_LEMMAS = new Set([
  // 感謝・賞賛
  'εὐχαριστέω','εὐλογέω','αἰνέω','δοξάζω',
  // 喜び
  'χαίρω','ἀγαλλιάω',
  // 適切さ・値する
  'ἄξιος','ἱκανός',
  // 幸い
  'μακάριος',
  // 哀しみ
  'λυπέω','πενθέω',
]);

// JA1955の理由節マーカー
const JA1955_CAUSAL_MARKERS = ['なぜなら','なぜかというと','というのは','ので','のは','だから','それは','それというのは','ゆえに','だからこそ'];
const JA1955_CONTENT_MARKERS = ['ということ','ことを','こととは','とは','ということは','のを','のは','ように','と伝え','と聞い','と知'];

// ── 分類ロジック ────────────────────────────────────────────────────────────
function classifyUsage(token, context, verseText) {
  const eng    = (token.english || '').toLowerCase().trim();
  const ln     = (token.ln || '').trim();
  const domain = (token.domain || '').trim();

  const hasLN_content    = ln.includes('90.21') || domain.includes('90006');
  const hasLN_causal     = ln.includes('89.33') || domain.includes('89007');
  const hasLN_recitative = ln.includes('91.15') || domain.includes('91005');

  // ── 高確度分類 ──
  // 1. 純粋 recitative（直接話法導入）
  if (hasLN_recitative && !hasLN_causal && !hasLN_content) {
    return {
      usage: 'recitative',
      confidence: 'HIGH',
      recommendedLabel: '［内容語句］',
      reason: 'LN 91.15のみ: 直接話法導入のὅτι。構造的には内容節導入と同機能',
      labelStatus: '適切',
    };
  }

  // 2. 純粋 content (LN 90.21 のみ)
  if (hasLN_content && !hasLN_causal && !hasLN_recitative) {
    return {
      usage: 'content',
      confidence: 'HIGH',
      recommendedLabel: '［内容語句］',
      reason: 'LN 90.21のみ: 補文節導入の "that"-ὅτι',
      labelStatus: '適切',
    };
  }

  // 3. 純粋 causal (LN 89.33 のみ)
  if (hasLN_causal && !hasLN_content && !hasLN_recitative) {
    // english と文脈で確度補強
    const isCausalEng = ['because','for','since','as','why'].includes(eng);
    const isContentEng = eng === 'that';
    const conf = isCausalEng ? 'HIGH' : (isContentEng ? 'MEDIUM' : 'MEDIUM');
    return {
      usage: 'causal',
      confidence: conf,
      recommendedLabel: '［理由語句］',
      reason: `LN 89.33のみ: 理由節導入の causal-ὅτι (english="${token.english}")`,
      labelStatus: '修正候補',
    };
  }

  // 4. content + causal 両方 (LN 89.33 90.21)
  if (hasLN_content && hasLN_causal && !hasLN_recitative) {
    // JA1955の節でマーカー確認
    if (verseText) {
      const hasCausalMark = JA1955_CAUSAL_MARKERS.some(m => verseText.includes(m));
      const hasContentMark = JA1955_CONTENT_MARKERS.some(m => verseText.includes(m));
      if (hasCausalMark && !hasContentMark) {
        return {
          usage: 'causal',
          confidence: 'MEDIUM',
          recommendedLabel: '［理由語句］',
          reason: `LN 89.33+90.21 (混合)、JA1955に理由節マーカーあり: "${JA1955_CAUSAL_MARKERS.find(m=>verseText.includes(m))}"`,
          labelStatus: '修正候補',
        };
      }
      if (hasContentMark && !hasCausalMark) {
        return {
          usage: 'content',
          confidence: 'MEDIUM',
          recommendedLabel: '［内容語句］',
          reason: `LN 89.33+90.21 (混合)、JA1955に内容節マーカーあり`,
          labelStatus: '適切',
        };
      }
    }
    return {
      usage: 'uncertain',
      confidence: 'LOW',
      recommendedLabel: '判断保留',
      reason: 'LN 89.33+90.21 (混合): content/causal いずれも可能',
      labelStatus: '判断保留',
    };
  }

  // 5. recitative + 他 (LN 91.15 + 89.33 または 90.21)
  if (hasLN_recitative && (hasLN_causal || hasLN_content)) {
    return {
      usage: 'uncertain',
      confidence: 'LOW',
      recommendedLabel: '判断保留',
      reason: `LN 複数 (${ln}): 用法が混在、文脈確認要`,
      labelStatus: '判断保留',
    };
  }

  // 6. LN なし — english と文脈で分類
  if (!hasLN_content && !hasLN_causal && !hasLN_recitative) {
    const isCausalEng   = ['because','for','since'].includes(eng);
    const isContentEng  = ['that','how','why'].includes(eng);

    // 前後文脈での統治動詞分析
    const prevLemmas = context.before.map(t => t.lemma || '');
    const hasContentVerb = prevLemmas.some(l => CONTENT_VERB_LEMMAS.has(l));
    const hasCausalVerb  = prevLemmas.some(l => CAUSAL_CONTEXT_LEMMAS.has(l));

    // JA1955 マーカー
    const hasCausalMark  = verseText ? JA1955_CAUSAL_MARKERS.some(m=>verseText.includes(m)) : false;
    const hasContentMark = verseText ? JA1955_CONTENT_MARKERS.some(m=>verseText.includes(m)) : false;

    if (isCausalEng) {
      // english が因果を示す
      if (hasCausalVerb || hasCausalMark) {
        return {
          usage: 'causal',
          confidence: 'MEDIUM',
          recommendedLabel: '［理由語句］',
          reason: `LN空・english="${eng}"・文脈/JA1955に理由節証拠あり`,
          labelStatus: '修正候補',
        };
      }
      return {
        usage: 'causal',
        confidence: 'LOW',
        recommendedLabel: '［理由語句］',
        reason: `LN空・english="${eng}"のみで判定（文脈証拠不足）`,
        labelStatus: '修正候補',
      };
    }

    if (isContentEng) {
      if (hasContentVerb || hasContentMark) {
        return {
          usage: 'content',
          confidence: 'MEDIUM',
          recommendedLabel: '［内容語句］',
          reason: `LN空・english="${eng}"・文脈に内容節統治動詞あり`,
          labelStatus: '適切',
        };
      }
      if (hasCausalVerb || hasCausalMark) {
        return {
          usage: 'causal',
          confidence: 'LOW',
          recommendedLabel: '判断保留',
          reason: `LN空・english="${eng}"だが文脈に因果証拠あり（要確認）`,
          labelStatus: '判断保留',
        };
      }
      return {
        usage: 'content',
        confidence: 'LOW',
        recommendedLabel: '［内容語句］',
        reason: `LN空・english="${eng}"のみで判定（文脈証拠不足）`,
        labelStatus: '適切',
      };
    }

    // english も空
    if (hasContentVerb && !hasCausalVerb) {
      return {
        usage: 'content',
        confidence: 'LOW',
        recommendedLabel: '［内容語句］',
        reason: 'LN空・english空・文脈に内容節統治動詞あり',
        labelStatus: '適切',
      };
    }
    if (hasCausalVerb && !hasContentVerb) {
      return {
        usage: 'causal',
        confidence: 'LOW',
        recommendedLabel: '判断保留',
        reason: 'LN空・english空・文脈に因果統治要素あり（要確認）',
        labelStatus: '判断保留',
      };
    }

    return {
      usage: 'uncertain',
      confidence: 'LOW',
      recommendedLabel: '判断保留',
      reason: `LN空・english="${eng}"・文脈証拠不足`,
      labelStatus: '判断保留',
    };
  }

  // フォールバック
  return {
    usage: 'uncertain',
    confidence: 'LOW',
    recommendedLabel: '判断保留',
    reason: `未分類 (ln="${ln}", english="${token.english}")`,
    labelStatus: '判断保留',
  };
}

// ── メイン処理 ──────────────────────────────────────────────────────────────
const records = [];

const books = fs.readdirSync(BIBLE_ROOT).sort();
let processed = 0;

for (const book of books) {
  const dir = path.join(BIBLE_ROOT, book);
  const chs = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort((a,b)=>parseInt(a)-parseInt(b));

  for (const chFile of chs) {
    const chapter = path.basename(chFile, '.json');
    const data    = loadChapter(book, chapter);
    const ja1955  = loadJA1955(book, chapter);
    const tokens  = Object.values(data).sort((a,b)=>parseInt(a.globalIdx||0)-parseInt(b.globalIdx||0));

    for (const token of tokens) {
      if (token.strong !== 'G3754') continue;

      const verseText = ja1955[token.verse] || null;
      const context   = getContext(book, chapter, token.ref);
      const cls       = classifyUsage(token, context, verseText);

      records.push({
        ref:           token.ref,
        book:          book,
        chapter:       chapter,
        verse:         token.verse,
        text:          token.text,
        lemma:         token.lemma,
        strong:        token.strong,
        morph:         token.morph,
        english:       token.english || '',
        ln:            token.ln || '',
        domain:        token.domain || '',
        currentLabel:  token.japanese,
        // classification
        usage:         cls.usage,
        confidence:    cls.confidence,
        recommendedLabel: cls.recommendedLabel,
        labelStatus:   cls.labelStatus,
        reason:        cls.reason,
        // context
        contextBefore: context.before,
        contextAfter:  context.after,
        ja1955Verse:   verseText,
      });
      processed++;
    }
  }
}

console.log(`処理完了: ${processed} / 1294 G3754トークン`);

// ── 集計 ────────────────────────────────────────────────────────────────────
const stats = {
  total: records.length,
  byUsage:      {},
  byConfidence: {},
  byLabelStatus:{},
  byUsageAndConfidence: {},
};

for (const r of records) {
  stats.byUsage[r.usage]           = (stats.byUsage[r.usage]||0) + 1;
  stats.byConfidence[r.confidence] = (stats.byConfidence[r.confidence]||0) + 1;
  stats.byLabelStatus[r.labelStatus] = (stats.byLabelStatus[r.labelStatus]||0) + 1;
  const uk = `${r.usage}/${r.confidence}`;
  stats.byUsageAndConfidence[uk] = (stats.byUsageAndConfidence[uk]||0) + 1;
}

// 修正候補（確度HIGH+MEDIUM）の抽出
const highConfidenceCausal = records.filter(r => r.usage==='causal' && r.confidence==='HIGH');
const mediumConfidenceCausal = records.filter(r => r.usage==='causal' && r.confidence==='MEDIUM');
const uncertain = records.filter(r => r.usage==='uncertain');
const labelPending = records.filter(r => r.labelStatus==='判断保留');

// ── 出力 ────────────────────────────────────────────────────────────────────
const output = {
  meta: {
    title: 'G3754 (ὅτι) 用法分類調査 — Stage 1追加調査',
    generatedAt: new Date().toISOString().slice(0,10),
    totalTokens: records.length,
    targetStrong: 'G3754',
    lemma: 'ὅτι',
    currentLabel: '［内容語句］',
    note: '全件が現在 ［内容語句］ 。causal用法の有無・件数を確認する調査。',
  },
  stats,
  summaryByUsage: {
    content:    { count: stats.byUsage['content']||0,    label: '内容節 (that)', currentLabelCorrect: true },
    causal:     { count: stats.byUsage['causal']||0,     label: '理由節 (because/for)', currentLabelCorrect: false },
    recitative: { count: stats.byUsage['recitative']||0, label: '直接話法導入 (recitative)', currentLabelCorrect: true },
    other:      { count: stats.byUsage['other']||0,      label: 'その他', currentLabelCorrect: null },
    uncertain:  { count: stats.byUsage['uncertain']||0,  label: '判断保留', currentLabelCorrect: null },
  },
  labelStatusSummary: {
    適切:    stats.byLabelStatus['適切']||0,
    修正候補: stats.byLabelStatus['修正候補']||0,
    判断保留: stats.byLabelStatus['判断保留']||0,
  },
  highConfidenceCausalSamples: highConfidenceCausal.slice(0, 20).map(r => ({
    ref: r.ref,
    english: r.english,
    ln: r.ln,
    ja1955Verse: r.ja1955Verse,
    contextBefore: r.contextBefore.map(t=>t.text+'/'+t.japanese).join(' '),
    contextAfter:  r.contextAfter.map(t=>t.text+'/'+t.japanese).join(' '),
    reason: r.reason,
  })),
  uncertainSamples: uncertain.slice(0, 20).map(r => ({
    ref: r.ref,
    english: r.english,
    ln: r.ln,
    ja1955Verse: r.ja1955Verse,
    contextBefore: r.contextBefore.map(t=>t.text+'/'+t.japanese).join(' '),
    reason: r.reason,
  })),
  // 特殊ケース
  specialCases: {
    causalLabeledContent: highConfidenceCausal.concat(mediumConfidenceCausal).slice(0, 5).map(r=>r.ref),
    recitativeTokens: records.filter(r=>r.usage==='recitative').map(r=>r.ref),
    confirmedTriggerCase: records.find(r=>r.ref==='1TH 1:5!1') || null,
  },
  records,
};

fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2), 'utf8');
console.log(`出力: ${OUT_JSON}`);

// ── Markdown レポート ─────────────────────────────────────────────────────────
const md = `# G3754 (ὅτι) 用法分類調査報告 — Stage 1追加調査

生成日: ${output.meta.generatedAt}
対象: NT全体 G3754 ${records.length}件

---

## 1. 件数サマリー

| 用法 | 件数 | 割合 | 現在ラベル評価 |
|------|------|------|--------------|
| content (補文 "that") | ${stats.byUsage['content']||0} | ${((stats.byUsage['content']||0)/records.length*100).toFixed(1)}% | ✓ 適切 |
| causal (理由 "because/for") | ${stats.byUsage['causal']||0} | ${((stats.byUsage['causal']||0)/records.length*100).toFixed(1)}% | △ 修正候補 |
| recitative (直接話法導入) | ${stats.byUsage['recitative']||0} | ${((stats.byUsage['recitative']||0)/records.length*100).toFixed(1)}% | ✓ 適切 |
| uncertain (判断保留) | ${stats.byUsage['uncertain']||0} | ${((stats.byUsage['uncertain']||0)/records.length*100).toFixed(1)}% | — 要確認 |
| **合計** | **${records.length}** | 100% | |

## 2. 確度別内訳

| 用法 / 確度 | 件数 |
|------------|------|
${Object.entries(stats.byUsageAndConfidence).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`| ${k} | ${v} |`).join('\n')}

## 3. ラベル妥当性判定

| 判定 | 件数 |
|------|------|
| 適切 | ${stats.byLabelStatus['適切']||0} |
| 修正候補 | ${stats.byLabelStatus['修正候補']||0} |
| 判断保留 | ${stats.byLabelStatus['判断保留']||0} |

## 4. 発見内容

### 4.1 Causal ὅτι の存在確認

G3754 ${records.length}件中 ${stats.byUsage['causal']||0}件が理由節 (causal) 用法と判定された。
これらは現在すべて \`［内容語句］\` と表記されているが、統語的には \`［理由語句］\` が適切な可能性がある。

ただし、構造ラベルとしての \`［内容語句］\` を維持するか、意味的に \`［理由語句］\` に変更するかは、
**設計上の判断事項であり、人的決定が必要**。

### 4.2 直接話法導入 (Recitative) ὅτι

${stats.byUsage['recitative']||0}件が直接話法を導くrecitative用法。
現在の \`［内容語句］\` ラベルは許容範囲内（内容を導入する機能は共通）。

### 4.3 トリガーケース: 1TH 1:5!1

${(() => {
  const r = records.find(r=>r.ref==='1TH 1:5!1');
  if (!r) return '(データ未確認)';
  return `- LN: ${r.ln}
- english: ${r.english}
- 用法判定: ${r.usage} (${r.confidence})
- ラベル判定: ${r.labelStatus}
- 理由: ${r.reason}
- JA1955: ${r.ja1955Verse||'(空)'}`;
})()}

## 5. High Confidence Causal サンプル (上位10件)

${highConfidenceCausal.slice(0,10).map(r => `
### ${r.ref}
- english: \`${r.english}\`, ln: \`${r.ln}\`
- 前文脈: ${r.contextBefore.map(t=>t.text+'/'+t.japanese).join(' ')}
- 後文脈: ${r.contextAfter.map(t=>t.text+'/'+t.japanese).join(' ')}
- JA1955: ${r.ja1955Verse||'(空)'}
- 判定根拠: ${r.reason}
`).join('')}

## 6. 類似問題: 同様の区別が必要な Strong 番号

G3754の調査から示唆される追加検討候補:

| Strong | 件数 | 現在ラベル | 問題の可能性 |
|--------|------|-----------|------------|
| G1063 | 1,039 | ［理由語句］ | γάρ の content用法は存在するか（確認不要の可能性高） |
| G2443 | 663 | ［目的語句］ | ἵνα の result/consequence用法と目的用法の区別 |
| G1437 | 333 | ［条件語句］ | ἐάν の concessive/indefinite用法との区別 |

---

*調査スクリプト: audit-g3754-usage.cjs*
*出力形式: 確度付き分類 (HIGH/MEDIUM/LOW) + ラベル妥当性判定*
`;

fs.writeFileSync(OUT_MD, md, 'utf8');
console.log(`レポート: ${OUT_MD}`);

// 要約出力
console.log('\n=== 集計結果 ===');
console.log('用法別:');
for (const [k,v] of Object.entries(stats.byUsage).sort((a,b)=>b[1]-a[1])) {
  console.log(`  ${k}: ${v}件 (${(v/records.length*100).toFixed(1)}%)`);
}
console.log('\nラベル妥当性:');
for (const [k,v] of Object.entries(stats.byLabelStatus)) {
  console.log(`  ${k}: ${v}件`);
}
const trigger = records.find(r=>r.ref==='1TH 1:5!1');
if (trigger) {
  console.log(`\n1TH 1:5!1: usage=${trigger.usage}, confidence=${trigger.confidence}, labelStatus=${trigger.labelStatus}`);
  console.log(`  ln="${trigger.ln}", english="${trigger.english}"`);
}
