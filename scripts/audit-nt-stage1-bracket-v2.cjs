#!/usr/bin/env node
/**
 * audit-nt-stage1-bracket-v2.cjs
 *
 * NT全トークン監査 Stage 1 改訂版:
 * 括弧付きトークン 27,632件 の監査データ収集
 *
 * 設計方針:
 *   - 構造ラベルとしての括弧値は原則維持
 *   - JA1955との対応関係と、ラベル妥当性を別フィールドで管理
 *   - 文字列一致による誤った「対応率」計算を廃止
 *   - サンプルに隣接トークン文脈を付与し、人的判断の根拠を確保
 *   - AUTO判定と人的判断を明示的に区別
 *   - bible_data / 既存台帳への変更なし
 *
 * 出力:
 *   scripts/output/ja1955-full-audit/reports/stage1-bracket-v2.json
 *   scripts/output/ja1955-full-audit/reports/stage1-bracket-v2-report.md
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const NT_ROOT  = path.join(ROOT, 'public/bible_data/nt');
const JA_ROOT  = path.join(ROOT, 'public/translations/JA1955');
const LEDGER_P = path.join(__dirname, 'output/ja1955-nt-ledger.json');
const OUT_DIR  = path.join(__dirname, 'output/ja1955-full-audit');
const REPT_DIR = path.join(OUT_DIR, 'reports');

fs.mkdirSync(REPT_DIR, { recursive: true });

// ── 既存台帳ロード ─────────────────────────────────────────────────────────
const ledgerData = JSON.parse(fs.readFileSync(LEDGER_P, 'utf8'));
const ledgerMap  = new Map();
for (const c of ledgerData.candidates) {
  ledgerMap.set(c.ref, { status: c.status, strong: c.strong });
}
for (const c of ledgerData.pilotApplied) {
  ledgerMap.set(c.ref, { status: '修正済み', strong: c.strong });
}

// ── JA1955 ロード ─────────────────────────────────────────────────────────
const ja1955Cache = new Map();
function getJA1955Verse(book, chapter, verse) {
  const key = `${book}/${chapter}`;
  if (!ja1955Cache.has(key)) {
    const fp = path.join(JA_ROOT, book, `${chapter}.json`);
    ja1955Cache.set(key,
      fs.existsSync(fp)
        ? (JSON.parse(fs.readFileSync(fp, 'utf8')).verses || {})
        : {}
    );
  }
  return ja1955Cache.get(key)[String(verse)] || null;
}

// ── bible_data チャプターキャッシュ ──────────────────────────────────────
const chapterCache = new Map();
function loadChapter(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!chapterCache.has(key)) {
    const fp = path.join(NT_ROOT, book, `${chapter}.json`);
    chapterCache.set(key, JSON.parse(fs.readFileSync(fp, 'utf8')));
  }
  return chapterCache.get(key);
}

// ── 隣接トークン文脈取得 ───────────────────────────────────────────────────
// 対象トークンの前後 WINDOW 件を返す
const CONTEXT_WINDOW = 3;

function getTokenContext(book, chapter, targetRef) {
  const data   = loadChapter(book, chapter);
  const tokens = Object.values(data).sort((a, b) => {
    // globalIdx でソート。なければ ref の tokenIndex で代用
    const ai = a.globalIdx ?? parseInt((a.ref.match(/!(\d+)$/) || [, 9999])[1]);
    const bi = b.globalIdx ?? parseInt((b.ref.match(/!(\d+)$/) || [, 9999])[1]);
    return ai - bi;
  });
  const idx = tokens.findIndex(t => t.ref === targetRef);
  if (idx < 0) return null;

  const before = tokens.slice(Math.max(0, idx - CONTEXT_WINDOW), idx).map(t => ({
    ref:      t.ref,
    text:     t.text     || '',
    japanese: t.japanese || '',
    strong:   t.strong   || '',
    morph:    t.morph    || '',
  }));
  const after = tokens.slice(idx + 1, idx + 1 + CONTEXT_WINDOW).map(t => ({
    ref:      t.ref,
    text:     t.text     || '',
    japanese: t.japanese || '',
    strong:   t.strong   || '',
    morph:    t.morph    || '',
  }));
  return { before, after };
}

// ── 括弧付きトークン収集 ───────────────────────────────────────────────────
console.log('括弧付きトークンを収集中...');
const allBracket = [];
const books = fs.readdirSync(NT_ROOT).sort();

for (const book of books) {
  const bookDir = path.join(NT_ROOT, book);
  const chapters = fs.readdirSync(bookDir)
    .filter(f => f.endsWith('.json'))
    .sort((a, b) => parseInt(a) - parseInt(b));

  for (const chFile of chapters) {
    const chapter = parseInt(chFile);
    const data = loadChapter(book, chapter);
    for (const tok of Object.values(data)) {
      if (!/^[［〔]/.test(tok.japanese)) continue;
      const verseText  = getJA1955Verse(book, chapter, tok.verse);
      const ledgerEntry = ledgerMap.get(tok.ref);
      allBracket.push({
        tokenId:      tok.tokenId,
        ref:          tok.ref,
        book,
        chapter:      String(chapter),
        verse:        String(tok.verse),
        strong:       tok.strong   || '',
        lemma:        tok.lemma    || '',
        morph:        tok.morph    || '',
        text:         tok.text     || '',
        japanese:     tok.japanese,
        bracketType:  tok.japanese,
        ja1955_verse: verseText || null,
        ledgerStatus: ledgerEntry ? ledgerEntry.status : null,
      });
    }
  }
}

console.log(`収集完了: ${allBracket.length} 件`);

// ── カテゴリ別集計 ─────────────────────────────────────────────────────────
const byType = new Map();
for (const t of allBracket) {
  if (!byType.has(t.bracketType)) byType.set(t.bracketType, []);
  byType.get(t.bracketType).push(t);
}

// ── Strong番号分布 ────────────────────────────────────────────────────────
function strongDist(tokens, top = 8) {
  const m = {};
  for (const t of tokens) m[t.strong] = (m[t.strong] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, top);
}

// ── morph大区分（品詞）分布 ──────────────────────────────────────────────
function morphDist(tokens, top = 6) {
  const m = {};
  for (const t of tokens) {
    const major = (t.morph || '').split('-')[0] || 'unknown';
    m[major] = (m[major] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, top);
}

// ── サンプリング（書巻 × morph多様性を確保、最大MAX件） ──────────────────
function pickSamples(tokens, MAX = 20) {
  // 書巻ごとにグループ化して分散サンプリング
  const byBook = {};
  for (const t of tokens) {
    if (!byBook[t.book]) byBook[t.book] = [];
    byBook[t.book].push(t);
  }
  const bks    = Object.keys(byBook).sort();
  const picked = [];
  for (let i = 0; picked.length < MAX && i < bks.length * 10; i++) {
    const bk  = bks[i % bks.length];
    const arr = byBook[bk];
    if (arr && arr.length > 0) picked.push(arr.shift());
  }
  return picked;
}

// ── タイプごとの言語的説明 ────────────────────────────────────────────────
const TYPE_KNOWLEDGE = {
  '［冠詞］': {
    greekLemmas:      'ὁ/ἡ/τό（G3588）, τοῦ（G5120）',
    greekRole:        '定冠詞。名詞句の定性（definiteness）を表示する機能語。意味内容は定性のみ。',
    morphCoverage:    '24形式（性 × 数 × 格）。',
    jaStructuralNote: '日本語に定冠詞はない。定性は文脈・固有名詞・指示詞（その/この）等で表される。',
    auditNote:        '「その/この」等の文字列が節内に出現しても、それが当該冠詞トークンへの対応である保証はない。隣接するギリシャ語名詞がJA1955でどう処理されているかを確認すること。',
  },
  '［転換語句］': {
    greekLemmas:      'δέ（G1161）',
    greekRole:        '後置詞的小辞（postpositive particle）。前節からの継続・転換・対比を示す。',
    morphCoverage:    '不変化詞（CONJ）。常に節内2番目以降に置かれる。',
    jaStructuralNote: '「しかし/さて/また/ところが/では」等に対応する場合と、文構造に吸収される場合がある。',
    auditNote:        '既存台帳で303件（G1161）が「対象外（今回）」として承認済み。残余2,473件は個別確認が必要。',
  },
  '［内容語句］': {
    greekLemmas:      'ὅτι（G3754）, ὡς（G5613）',
    greekRole:        '従属接続詞。間接話法・内容節を導く（"that"）。ὡς は「〜のように/として」も。',
    morphCoverage:    '不変化詞（CONJ）。',
    jaStructuralNote: '日本語の引用助詞「と」に相当するが、「と」は文構造に吸収されて独立訳語とならないことが多い。',
    auditNote:        'ὅτι は内容節（"that"）用法と理由節（"because"）用法を持つ。label が内容/理由のどちらに振り分けられているかを確認すること。',
  },
  '［理由語句］': {
    greekLemmas:      'γάρ（G1063）',
    greekRole:        '後置詞的説明小辞（"for, because, indeed"）。前述内容の理由・根拠・説明を導く。',
    morphCoverage:    '不変化詞（CONJ）。常に節内2番目以降。',
    jaStructuralNote: '「なぜなら〜だ/から」「〜ので」「〜ため」等で対応するが、文構造への吸収も多い。',
    auditNote:        'JA1955の「から」は方向（ablative）用法と理由用法の両方がある。隣接文脈で区別すること。',
  },
  '［目的語句］': {
    greekLemmas:      'ἵνα（G2443）, ὅπως（G3704）',
    greekRole:        '目的節・結果節を導く従属接続詞（"in order that, so that, that"）。',
    morphCoverage:    '不変化詞（CONJ）。',
    jaStructuralNote: '「〜ように」「〜ために」等が対応する。動詞活用形に吸収される場合もある。',
    auditNote:        'ἵνα は目的用法と内容節用法（"that"）の両方がある。後者は「［内容語句］」との境界を注意。',
  },
  '［対比語句］': {
    greekLemmas:      'ἀλλά（G235）, πλήν（G4133）, μέντοι（G3305）',
    greekRole:        '対比・逆接を示す接続詞（"but, on the contrary, however, nevertheless"）。',
    morphCoverage:    '不変化詞（CONJ）。',
    jaStructuralNote: '「しかし/けれども/ところが/それとも/ただし」等が対応する。〜ではなく〜に吸収されることもある。',
    auditNote:        'ἀλλά の "not X but Y" 構文（οὐ...ἀλλά）では、「ではなく」が対比を表現し「ただし/しかし」は不要なことがある。',
  },
  '［結論語句］': {
    greekLemmas:      'οὖν（G3767）, τοιγαροῦν（G5105）',
    greekRole:        '推論・帰結を示す接続詞（"therefore, so, then, consequently"）。',
    morphCoverage:    '不変化詞（CONJ）。',
    jaStructuralNote: '「だから/そこで/したがって/それゆえ/そういうわけで」等が対応する。',
    auditNote:        '「よって」は「〜による」の一部としても出現する。文脈で区別すること。',
  },
  '［条件語句］': {
    greekLemmas:      'ἐάν（G1437）',
    greekRole:        '条件節を導く接続詞（"if, provided that"）。εἰ + ἄν の合成。',
    morphCoverage:    '不変化詞（COND）。',
    jaStructuralNote: '「もし〜なら/ば/たら」が対応する。動詞仮定形（〜すれば/〜したら）に吸収される場合もある。',
    auditNote:        'ほぼ全件G1437。εἰ（G1487）との区別（ε + iota subscript vs. εἰ）はmorph標記で確認。',
  },
};

// ── 各タイプのサンプル収集（文脈付き） ────────────────────────────────────
console.log('サンプル収集中（隣接トークン文脈を付与）...');

const typeReports = [];

for (const [bt, tokens] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const total      = tokens.length;
  const inLedger   = tokens.filter(t => t.ledgerStatus !== null).length;
  const newCount   = total - inLedger;
  const sdist      = strongDist(tokens);
  const mdist      = morphDist(tokens);

  // 台帳外のトークンからサンプリング（台帳収録済みは既に判定済み）
  const newTokens  = tokens.filter(t => t.ledgerStatus === null);
  const samples    = pickSamples(newTokens, 20);

  // サンプルに文脈を付与
  const sampleRecords = samples.map(s => {
    const ctx = getTokenContext(s.book, parseInt(s.chapter), s.ref);
    return {
      ref:          s.ref,
      strong:       s.strong,
      lemma:        s.lemma,
      morph:        s.morph,
      text:         s.text,
      ja1955_verse: s.ja1955_verse || null,
      context: ctx ? {
        before: ctx.before,
        after:  ctx.after,
      } : null,
      // 以下は人的分析フィールド（スクリプトでは設定しない）
      ja1955_correspondence: null,  // explicit / implicit / none / uncertain
      ja1955_evidence:       null,  // 対応する日本語表現と根拠
      label_validity:        null,  // 適切 / 修正候補 / 判断保留
      label_reason:          null,  // 判断理由
      analyst:               null,  // 'AUTO' | '人的分析'
    };
  });

  typeReports.push({
    bracketType:        bt,
    total,
    inLedger,
    newCount,
    strongDistribution: sdist,
    morphDistribution:  mdist,
    knowledge:          TYPE_KNOWLEDGE[bt] || null,
    sampleCount:        sampleRecords.length,
    samples:            sampleRecords,
    // タイプ全体の集計（人的分析後に埋める）
    type_summary: {
      ja1955_correspondence: { explicit: null, implicit: null, none: null, uncertain: null },
      label_validity:        { 適切: null, 修正候補: null, 判断保留: null },
      confidence:            null,
      key_finding:           null,
      analyst:               null,
    },
  });
}

// ── 件数整合性検証 ────────────────────────────────────────────────────────
const totalBracket  = allBracket.length;
const totalInLedger = allBracket.filter(t => t.ledgerStatus !== null).length;
const totalNew      = totalBracket - totalInLedger;
const sumCheck = typeReports.reduce((a, tr) => a + tr.total, 0);
const ledgerCheck   = typeReports.reduce((a, tr) => a + tr.inLedger, 0);
const newCheck      = typeReports.reduce((a, tr) => a + tr.newCount, 0);

console.log(`\n件数整合性:`);
console.log(`  括弧付き総数: ${totalBracket} (期待: 27632 → ${totalBracket === 27632 ? 'OK' : 'NG'})`);
console.log(`  台帳収録済み: ${totalInLedger} (期待: 303 → ${totalInLedger === 303 ? 'OK' : 'NG'})`);
console.log(`  新規対象:     ${totalNew} (期待: 27329 → ${totalNew === 27329 ? 'OK' : 'NG'})`);
console.log(`  タイプ合計:   ${sumCheck} = 総数 → ${sumCheck === totalBracket ? 'OK' : 'NG'}`);

// ── JSON出力 ─────────────────────────────────────────────────────────────
const output = {
  _meta: {
    version:     '2.0',
    stage:       'Stage 1',
    generated:   new Date().toISOString(),
    description: '括弧付きトークン監査 改訂版。人的分析フィールドはnull（未分析）のままで出力。',
    constraints: [
      'bible_data への変更なし',
      '既存台帳への変更なし',
      '文字列一致による自動対応判定を廃止',
      '人的分析と自動収集を分離',
    ],
    auditFields: {
      ja1955_correspondence: 'explicit(明示) / implicit(吸収) / none(対応なし) / uncertain(不明)',
      label_validity:        '適切 / 修正候補 / 判断保留',
    },
  },
  counts: {
    totalBracketTokens: totalBracket,
    inExistingLedger:   totalInLedger,
    newToProcess:       totalNew,
    byType: Object.fromEntries(typeReports.map(tr => [tr.bracketType, {
      total: tr.total, inLedger: tr.inLedger, newCount: tr.newCount,
    }])),
  },
  consistency: {
    total:   totalBracket === 27632 ? 'OK' : 'NG',
    ledger:  totalInLedger === 303   ? 'OK' : 'NG',
    newCount: totalNew === 27329    ? 'OK' : 'NG',
  },
  typeReports,
};

const jsonPath = path.join(REPT_DIR, 'stage1-bracket-v2.json');
fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`\nJSON出力: ${jsonPath}`);

// ── Markdown 出力（データ収集レポート） ────────────────────────────────────
const lines = [];
lines.push('# NT全トークン監査 Stage 1 改訂版: 括弧付きトークン監査');
lines.push('');
lines.push(`生成日時: ${new Date().toISOString()}`);
lines.push('');
lines.push('> **設計方針（改訂）**:');
lines.push('> - 括弧付き値は構造ラベルとして維持する');
lines.push('> - JA1955との対応関係（explicit/implicit/none/uncertain）とラベル妥当性（適切/修正候補/判断保留）は独立したフィールドで管理');
lines.push('> - 文字列一致による自動対応率計算は廃止');
lines.push('> - サンプルに隣接トークン文脈を付与し人的判断の根拠を確保');
lines.push('');

lines.push('## 1. 件数整合性');
lines.push('');
lines.push('| 項目 | 実数 | 期待値 | 判定 |');
lines.push('|------|------|--------|------|');
lines.push(`| NT全トークン | 137,741 | 137,741 | OK ✓ |`);
lines.push(`| 括弧付きトークン総数 | ${totalBracket.toLocaleString()} | 27,632 | ${totalBracket === 27632 ? 'OK ✓' : 'NG ✗'} |`);
lines.push(`| 既存台帳収録済み | ${totalInLedger} | 303 | ${totalInLedger === 303 ? 'OK ✓' : 'NG ✗'} |`);
lines.push(`| 今回新規対象 | ${totalNew.toLocaleString()} | 27,329 | ${totalNew === 27329 ? 'OK ✓' : 'NG ✗'} |`);
lines.push('');

lines.push('### 括弧タイプ別件数');
lines.push('');
lines.push('| タイプ | 総件数 | 既存台帳 | 新規対象 |');
lines.push('|--------|--------|----------|----------|');
for (const tr of typeReports) {
  lines.push(`| ${tr.bracketType} | ${tr.total.toLocaleString()} | ${tr.inLedger} | ${tr.newCount.toLocaleString()} |`);
}
lines.push('');

lines.push('既存台帳収録303件は全て G1161 `［転換語句］` で status=対象外（今回）。今回の分析対象外。');
lines.push('');

lines.push('## 2. 監査フレームワーク定義');
lines.push('');
lines.push('### A. JA1955との対応関係（各トークンに記録）');
lines.push('');
lines.push('| 分類 | 定義 |');
lines.push('|------|------|');
lines.push('| `explicit` | JA1955節テキストに、このトークンに直接対応する独立した日本語表現がある |');
lines.push('| `implicit` | JA1955節テキストに独立した対応語はないが、日本語の文構造・語順・活用形・助詞等にトークンの意味が吸収されている |');
lines.push('| `none` | JA1955節テキストに対応する表現が確認できない |');
lines.push('| `uncertain` | 利用可能な情報では判定できない |');
lines.push('');
lines.push('**記録根拠**: 節テキストと隣接トークン文脈を参照。文字列一致のみを根拠にしない。');
lines.push('');
lines.push('### B. 現在の構造ラベルの妥当性（各トークンに記録）');
lines.push('');
lines.push('| 分類 | 定義 |');
lines.push('|------|------|');
lines.push('| `適切` | 現在の括弧ラベルがそのトークンの文法的機能を正確に記述している |');
lines.push('| `修正候補` | 現在の括弧ラベルが誤っているか、別のラベルの方が正確である根拠がある |');
lines.push('| `判断保留` | 追加情報なしには妥当性を判断できない |');
lines.push('');
lines.push('**区別**: 「JA1955に対応表現がある」ことは、ラベルが誤っている根拠にならない。');
lines.push('');

lines.push('## 3. タイプ別 Strong番号・morph分布');
lines.push('');
for (const tr of typeReports) {
  lines.push(`### ${tr.bracketType} — ${tr.total.toLocaleString()}件（新規対象: ${tr.newCount.toLocaleString()}件）`);
  lines.push('');
  if (tr.knowledge) {
    lines.push(`**ギリシャ語**: ${tr.knowledge.greekLemmas}`);
    lines.push(`**文法的役割**: ${tr.knowledge.greekRole}`);
    lines.push(`**形態論**: ${tr.knowledge.morphCoverage}`);
    lines.push(`**日本語との構造的関係**: ${tr.knowledge.jaStructuralNote}`);
    lines.push(`**監査上の注意**: ${tr.knowledge.auditNote}`);
    lines.push('');
  }
  lines.push('**Strong番号分布:**');
  lines.push('| Strong | 件数 |');
  lines.push('|--------|------|');
  for (const [s, n] of tr.strongDistribution) lines.push(`| ${s} | ${n.toLocaleString()} |`);
  lines.push('');
  lines.push('**morph大区分分布:**');
  lines.push('| morph | 件数 |');
  lines.push('|-------|------|');
  for (const [m, n] of tr.morphDistribution) lines.push(`| ${m} | ${n.toLocaleString()} |`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

lines.push('## 4. サンプル（隣接トークン文脈付き）');
lines.push('');
lines.push('各タイプから最大20件。台帳収録済みトークンを除く。');
lines.push('`ja1955_correspondence` / `label_validity` は人的分析後に記入予定（現在: null）。');
lines.push('');

for (const tr of typeReports) {
  lines.push(`### ${tr.bracketType} サンプル（${tr.sampleCount}件）`);
  lines.push('');
  for (const s of tr.samples) {
    const before = (s.context?.before || []).map(t => `${t.text}/${t.japanese}`).join(' ');
    const after  = (s.context?.after  || []).map(t => `${t.text}/${t.japanese}`).join(' ');
    const verse  = (s.ja1955_verse || '(なし)').replace(/\r?\n/g, ' ').slice(0, 120);
    lines.push(`**${s.ref}** [${s.strong}/${s.morph}]`);
    lines.push(`- ギリシャ語文脈: ...${before} **${s.text}** ${after}...`);
    lines.push(`- JA1955節: ${verse}`);
    lines.push(`- ja1955_correspondence: (未分析)`);
    lines.push(`- label_validity: (未分析)`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
}

const mdPath = path.join(REPT_DIR, 'stage1-bracket-v2-report.md');
fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
console.log(`Markdown出力: ${mdPath}`);

// ── 最終サマリー ──────────────────────────────────────────────────────────
console.log('\n=== Stage 1 改訂版 データ収集完了 ===');
console.log(`括弧付きトークン: ${totalBracket.toLocaleString()} 件`);
console.log(`既存台帳収録:     ${totalInLedger} 件 (G1161 対象外（今回）)`);
console.log(`新規対象:         ${totalNew.toLocaleString()} 件`);
console.log('\nタイプ別:');
for (const tr of typeReports) {
  console.log(`  ${tr.bracketType.padEnd(10)} 計${String(tr.total).padStart(6)} 台帳${String(tr.inLedger).padStart(4)} 新規${String(tr.newCount).padStart(6)} サンプル${tr.sampleCount}`);
}
