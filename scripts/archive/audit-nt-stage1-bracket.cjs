#!/usr/bin/env node
/**
 * audit-nt-stage1-bracket.cjs
 *
 * NT全トークン監査 Stage 1: 括弧付きトークン 27,632件 の予備監査
 *
 * 目的:
 *   各括弧タイプのギリシャ語的性格・JA1955での扱いをサンプリングで調査し、
 *   カテゴリ別の予備判定（AUTO = 人的確認の前段階）を記録する。
 *
 * 原則:
 *   - 括弧表記だけを理由に対象外と判定しない
 *   - Strong番号だけを根拠に一括判定しない
 *   - JA1955節テキストとのサンプル照合結果を根拠として記録する
 *   - AUTO判定と人的確認済み判定を明示的に区別する
 *   - bible_data / 既存台帳への変更なし
 *
 * 出力:
 *   scripts/output/ja1955-full-audit/manifest.json
 *   scripts/output/ja1955-full-audit/reports/stage1-bracket.json
 *   scripts/output/ja1955-full-audit/reports/stage1-bracket-report.md
 *
 * 実行: node scripts/audit-nt-stage1-bracket.cjs
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
const ledgerMap  = new Map(); // ref → {status, currentJapanese, proposedJapanese, strong}
for (const c of ledgerData.candidates) {
  ledgerMap.set(c.ref, {
    status:          c.status,
    currentJapanese: c.currentJapanese || c.japanese_before || '',
    proposedJapanese: c.proposedJapanese || '',
    strong:          c.strong,
  });
}
for (const c of ledgerData.pilotApplied) {
  ledgerMap.set(c.ref, {
    status:          '修正済み',
    currentJapanese: c.after,
    proposedJapanese: c.after,
    strong:          c.strong,
  });
}

// ── JA1955 ロード（節単位キャッシュ） ──────────────────────────────────────
const ja1955Cache = new Map();
function getJA1955Verse(book, chapter, verse) {
  const key = `${book}/${chapter}`;
  if (!ja1955Cache.has(key)) {
    const fp = path.join(JA_ROOT, book, `${chapter}.json`);
    if (!fs.existsSync(fp)) { ja1955Cache.set(key, {}); }
    else { ja1955Cache.set(key, JSON.parse(fs.readFileSync(fp, 'utf8')).verses || {}); }
  }
  return ja1955Cache.get(key)[String(verse)] || null;
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
    const data = JSON.parse(fs.readFileSync(path.join(bookDir, chFile), 'utf8'));
    for (const tok of Object.values(data)) {
      if (!/^[［〔]/.test(tok.japanese)) continue;
      const verseText = getJA1955Verse(book, chapter, tok.verse);
      const entry = ledgerMap.get(tok.ref);
      allBracket.push({
        tokenId:     tok.tokenId,
        ref:         tok.ref,
        book,
        chapter:     String(chapter),
        verse:       String(tok.verse),
        strong:      tok.strong,
        lemma:       tok.lemma || '',
        morph:       tok.morph  || '',
        text:        tok.text   || '',
        japanese:    tok.japanese,
        bracketType: tok.japanese,
        ja1955_verse: verseText || null,
        ledgerStatus:   entry ? entry.status : null,
        ledgerProposed: entry ? entry.proposedJapanese : null,
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

// ── Strong番号分布（上位N件） ──────────────────────────────────────────────
function strongDist(tokens, top = 8) {
  const m = {};
  for (const t of tokens) m[t.strong] = (m[t.strong] || 0) + 1;
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, top);
}

// ── 多様性を確保したサンプリング（書巻 × morph大区分） ────────────────────
function pickSamples(tokens, MAX = 20) {
  // 書巻ごとにひとつずつ選ぶことで地理的多様性を確保
  const byBook = {};
  for (const t of tokens) {
    if (!byBook[t.book]) byBook[t.book] = [];
    byBook[t.book].push(t);
  }
  const bks   = Object.keys(byBook).sort();
  const picked = [];
  for (let i = 0; picked.length < MAX && i < bks.length * 5; i++) {
    const bk  = bks[i % bks.length];
    const arr = byBook[bk];
    if (arr && arr.length > 0) picked.push(arr.shift());
  }
  return picked;
}

// ── JA1955テキストに指標語が含まれるか確認 ────────────────────────────────
// 各括弧タイプについて「こういう日本語表現が JA1955 にあれば対応がある可能性」を定義
const JA1955_INDICATORS = {
  '［冠詞］':   ['その', 'この', 'あの', 'かの', 'ある'],
  '［転換語句］': ['しかし', 'ところが', 'また', 'さて', 'さらに', 'ただし', '一方', 'それから',
                  'なお', 'では', 'ところで', 'もっとも'],
  '［内容語句］': ['ということ', 'こと', 'と言', 'と思', 'と知', 'と聞', 'と見', 'とは'],
  '［理由語句］': ['なぜなら', 'というのは', 'ので', 'から', 'ため', 'ゆえ'],
  '［目的語句］': ['ために', 'ように', 'ことが', 'うえで'],
  '［対比語句］': ['しかし', 'けれども', 'ところが', 'それとも', 'だが', 'でも', 'が、'],
  '［結論語句］': ['それゆえ', 'だから', 'したがって', 'そこで', 'それで', 'ゆえに', 'よって'],
  '［条件語句］': ['もし', 'ならば', 'たら', 'れば', 'なら', 'ならば', 'としたら'],
};

function checkIndicators(verseText, bracketType) {
  if (!verseText) return [];
  const indicators = JA1955_INDICATORS[bracketType] || [];
  return indicators.filter(ind => verseText.includes(ind));
}

// ── 括弧タイプごとの言語的説明（監査根拠として記録） ─────────────────────
const TYPE_KNOWLEDGE = {
  '［冠詞］': {
    greekLemmas:  ['ὁ（G3588）', 'τό（G5120）'],
    greekRole:    'ギリシャ語定冠詞。名詞句の定性（definiteness）を表示する。意味内容は「定」のみ。',
    morphology:   '性・数・格に一致して変化。NMS/NFS/NNS/GMS/DMS/AMS 等 24形式。',
    jaStructural: '日本語には定冠詞が存在しない。定性は固有名詞・文脈・「この/その/あの」で表される。',
    hypothesis:   '系統的に独立した日本語訳語を持たない可能性が高い。ただし「その」等の指示詞が対応する例外的ケースがあるか確認が必要。',
    verificationQ: 'JA1955節テキストに指示詞（その/この/あの）が冠詞相当として現れるケースを確認する。',
  },
  '［転換語句］': {
    greekLemmas:  ['δέ（G1161）', 'τε（G5037）'],
    greekRole:    '後置詞的小辞（postpositive particle）。前節からの継続・転換・対比を示す。',
    morphology:   '不変化詞。常に節の2番目以降の位置に置かれる。',
    jaStructural: '「しかし」「ところが」「また」「さて」等の接続表現が対応するが、日本語の文脈では吸収されることも多い。303件は既存台帳で対象外（今回）。',
    hypothesis:   '対応する日本語接続表現がJA1955にある場合は修正候補。吸収される場合は現状維持または対象外。文脈ごとの判定が必要。',
    verificationQ: 'JA1955節に転換接続詞（しかし/また/ところが/さて等）がある比率を確認する。',
  },
  '［内容語句］': {
    greekLemmas:  ['ὅτι（G3754）', 'ὡς（G5613）'],
    greekRole:    '従属接続詞。間接話法・内容節を導く ("that")。主節の動詞が言語・知覚・思考等の場合に多用。',
    morphology:   '不変化詞。',
    jaStructural: '日本語では「〜と（言った/思った/知った）」の引用助詞「と」に相当。「と」自体は意味が希薄で文構造に吸収される。',
    hypothesis:   '引用助詞「と」への対応は文構造的に自明なため、現状維持または対象外が有力。ただし「〜ということ」「〜という事実」等で独立訳語化される例外もあり確認が必要。',
    verificationQ: 'JA1955節テキストで内容節が「と言った/と思った」等の形で現れ、「ということ」等の独立表現がある比率を確認する。',
  },
  '［理由語句］': {
    greekLemmas:  ['γάρ（G1063）', 'ὅτι（G3754 causal）', 'διότι（G1360）'],
    greekRole:    '理由節を導く接続詞。"for, because, since"。γάρ も postpositive。',
    morphology:   '不変化詞。',
    jaStructural: '「なぜなら〜から/だ」「というのは」「〜ので」「〜から」等。文に吸収されることも多い。',
    hypothesis:   '「なぜなら」「というのは」等の独立表現がJA1955にあれば修正候補。文構造に吸収されていれば現状維持または対象外。文脈ごとの判定が必要。',
    verificationQ: 'JA1955節に「なぜなら/というのは/ので/から/ため」等がある比率を確認する。',
  },
  '［目的語句］': {
    greekLemmas:  ['ἵνα（G2443）', 'ὅπως（G3704）', 'ὥστε（G5620）'],
    greekRole:    '目的節・結果節を導く従属接続詞。"in order that, so that, that"。',
    morphology:   '不変化詞。',
    jaStructural: '「〜ために」「〜ように」等の目的表現で対応することが多い。日本語動詞活用形に吸収されることもある。',
    hypothesis:   '「ために」「ように」等がJA1955にあれば修正候補として確認が必要。活用形に吸収されていれば現状維持または対象外。',
    verificationQ: 'JA1955節に「ために/ように/うえで」等の目的表現がある比率を確認する。',
  },
  '［対比語句］': {
    greekLemmas:  ['ἀλλά（G235）', 'εἰ μή（G1508）', 'πλήν（G4133）'],
    greekRole:    '対比・逆接を示す接続詞。"but, on the contrary, however"。',
    morphology:   '不変化詞。',
    jaStructural: '「しかし」「けれども」「ところが」「それとも」等の逆接表現が対応することが多い。比較的安定した対応が期待される。',
    hypothesis:   '「しかし」等がJA1955にあれば明確な修正候補。逆接表現が頻繁に現れると予想されるため、対象外より現状維持または修正承認が多くなる可能性。',
    verificationQ: 'JA1955節に「しかし/けれども/ところが/それとも/だが」等がある比率を確認する。',
  },
  '［結論語句］': {
    greekLemmas:  ['οὖν（G3767）', 'ἄρα（G686）', 'ὥστε（G5620）', 'τοιγαροῦν（G5105）'],
    greekRole:    '結論・帰結を示す接続詞。"therefore, so, then, consequently"。',
    morphology:   '不変化詞。',
    jaStructural: '「それゆえ」「だから」「したがって」「そこで」等。独立した対応表現が比較的安定して現れる可能性。',
    hypothesis:   '「それゆえ」「だから」等がJA1955にあれば修正候補が多い。独立訳語を持ちやすいタイプ。',
    verificationQ: 'JA1955節に「それゆえ/だから/したがって/そこで/それで」等がある比率を確認する。',
  },
  '［条件語句］': {
    greekLemmas:  ['εἰ（G1487）', 'ἐάν（G1437）', 'εἴπερ（G1512）'],
    greekRole:    '条件節を導く接続詞。"if, whether, provided that"。',
    morphology:   '不変化詞。ἐάν は εἰ + ἄν の合成。',
    jaStructural: '「もし〜ならば」「〜たら」「〜ば」等。日本語動詞の仮定形（〜すれば/〜したら）に吸収されることが多い。',
    hypothesis:   '日本語動詞活用形に吸収される場合が多く、対象外または現状維持が有力。「もし」等の独立表現が現れる場合は修正候補の確認が必要。',
    verificationQ: 'JA1955節に「もし/ならば/たら/れば/なら」等の条件表現がある比率を確認する。',
  },
};

// ── カテゴリ別分析 ─────────────────────────────────────────────────────────
const typeReports = [];

for (const [bt, tokens] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const total    = tokens.length;
  const inLedger = tokens.filter(t => t.ledgerStatus !== null).length;
  const newCount = total - inLedger;

  const ledgerStatusDist = {};
  for (const t of tokens.filter(t => t.ledgerStatus)) {
    ledgerStatusDist[t.ledgerStatus] = (ledgerStatusDist[t.ledgerStatus] || 0) + 1;
  }

  const sdist   = strongDist(tokens);
  const samples = pickSamples(tokens.filter(t => t.ledgerStatus === null), 20);
  const knowledge = TYPE_KNOWLEDGE[bt] || null;

  // サンプルにJA1955指標照合を追加
  const sampleRecords = samples.map(s => {
    const hits = checkIndicators(s.ja1955_verse, bt);
    return {
      ref:           s.ref,
      strong:        s.strong,
      lemma:         s.lemma,
      morph:         s.morph,
      text:          s.text,
      ja1955_verse:  s.ja1955_verse ? s.ja1955_verse.slice(0, 120) : null,
      indicator_hits: hits,
      has_indicator:  hits.length > 0,
    };
  });

  // サンプル内での指標ヒット率
  const hitCount   = sampleRecords.filter(s => s.has_indicator).length;
  const hitRate    = samples.length > 0 ? (hitCount / samples.length) : 0;

  typeReports.push({
    bracketType:         bt,
    total,
    inLedger,
    newCount,
    ledgerStatusDist,
    strongDistribution:  sdist,
    knowledge:           knowledge || null,
    sampleCount:         sampleRecords.length,
    indicatorHitCount:   hitCount,
    indicatorHitRate:    Math.round(hitRate * 100),
    samples:             sampleRecords,
    // AUTO判定メモ（人的確認の前段階）
    autoNote: '',
  });
}

// ── AUTO判定メモ設定（サンプル分析に基づく暫定コメント） ─────────────────
for (const tr of typeReports) {
  const rate = tr.indicatorHitRate;
  switch (tr.bracketType) {
    case '［冠詞］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に指示詞（その/この/あの等）を検出（${rate}%）。` +
        '定冠詞は日本語に構造的対応物がなく、指示詞への対応は部分的・非系統的。' +
        '現状の「［冠詞］」表記が適切か、対象外とすべきかは人的確認が必要。AUTO判定: 要人的確認（構造的根拠あり）';
      break;
    case '［転換語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に転換接続詞を検出（${rate}%）。` +
        'JA1955に対応表現がある場合は訳語の見直しが必要な可能性。既存台帳303件（G1161）は対象外（今回）。残余は個別確認要。' +
        'AUTO判定: 要個別確認';
      break;
    case '［内容語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に引用表現を検出（${rate}%）。` +
        '引用助詞「と」への対応は文構造に吸収されるケースが多い。' +
        'AUTO判定: 要個別確認';
      break;
    case '［理由語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に理由表現を検出（${rate}%）。` +
        'AUTO判定: 要個別確認';
      break;
    case '［目的語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に目的表現を検出（${rate}%）。` +
        'AUTO判定: 要個別確認';
      break;
    case '［対比語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に逆接表現を検出（${rate}%）。` +
        '対比語句は「しかし」等との対応が比較的安定。高ヒット率の場合は修正候補が多い可能性。' +
        'AUTO判定: 要個別確認（修正候補多数の可能性）';
      break;
    case '［結論語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に結論表現を検出（${rate}%）。` +
        'AUTO判定: 要個別確認（修正候補の可能性）';
      break;
    case '［条件語句］':
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に条件表現を検出（${rate}%）。` +
        'AUTO判定: 要個別確認';
      break;
    default:
      tr.autoNote = `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件に指標を検出（${rate}%）。AUTO判定: 要個別確認`;
  }
}

// ── 出力 JSON ─────────────────────────────────────────────────────────────
const totalBracket   = allBracket.length;
const totalInLedger  = allBracket.filter(t => t.ledgerStatus !== null).length;
const totalNewCount  = totalBracket - totalInLedger;

const outputJson = {
  _meta: {
    stage:       'Stage 1',
    generated:   new Date().toISOString(),
    description: '括弧付きトークン予備監査。AUTO判定はすべて人的確認の前段階。',
    constraints: [
      'bible_data への変更なし',
      '既存台帳の判定変更なし',
      'AUTO判定と人的確認済み判定を明示的に区別',
    ],
  },
  summary: {
    totalBracketTokens:  totalBracket,
    inExistingLedger:    totalInLedger,
    newToProcess:        totalNewCount,
    bracketTypeCount:    byType.size,
  },
  typeReports: typeReports.map(tr => ({
    bracketType:       tr.bracketType,
    total:             tr.total,
    inLedger:          tr.inLedger,
    newCount:          tr.newCount,
    ledgerStatusDist:  tr.ledgerStatusDist,
    strongDistribution: tr.strongDistribution,
    sampleCount:        tr.sampleCount,
    indicatorHitCount:  tr.indicatorHitCount,
    indicatorHitRate:   tr.indicatorHitRate,
    autoNote:           tr.autoNote,
    knowledge: tr.knowledge ? {
      greekLemmas:  tr.knowledge.greekLemmas,
      greekRole:    tr.knowledge.greekRole,
      jaStructural: tr.knowledge.jaStructural,
      hypothesis:   tr.knowledge.hypothesis,
      verificationQ: tr.knowledge.verificationQ,
    } : null,
    samples: tr.samples,
  })),
};

const jsonPath = path.join(REPT_DIR, 'stage1-bracket.json');
fs.writeFileSync(jsonPath, JSON.stringify(outputJson, null, 2), 'utf8');
console.log(`JSON出力: ${jsonPath}`);

// ── Markdown レポート ──────────────────────────────────────────────────────
const lines = [];
lines.push('# NT全トークン監査 Stage 1: 括弧付きトークン予備監査');
lines.push('');
lines.push(`生成日時: ${new Date().toISOString()}`);
lines.push('');
lines.push('> **注記**: AUTO判定はスクリプトによる自動分析結果であり、すべて人的確認が必要。');
lines.push('> 人的確認済みのものだけを台帳に反映する。');
lines.push('');

lines.push('## 1. 全体統計');
lines.push('');
lines.push('| 項目 | 件数 |');
lines.push('|------|------|');
lines.push(`| NT全トークン | 137,741 |`);
lines.push(`| 括弧付きトークン総数 | ${totalBracket.toLocaleString()} |`);
lines.push(`| 既存台帳収録済み | ${totalInLedger.toLocaleString()} |`);
lines.push(`| 今回新規対象 | ${totalNewCount.toLocaleString()} |`);
lines.push(`| 括弧タイプ数 | ${byType.size} |`);
lines.push('');

lines.push('### 既存台帳収録（303件）の内訳');
lines.push('');
lines.push('| ステータス | Strong | 件数 | 備考 |');
lines.push('|-----------|--------|------|------|');
lines.push('| 対象外（今回） | G1161 | 303 | ［転換語句］（δέ）。既存監査で承認済み |');
lines.push('');

lines.push('### 括弧タイプ別件数');
lines.push('');
lines.push('| タイプ | 総件数 | 台帳収録 | 新規対象 |');
lines.push('|--------|--------|----------|----------|');
for (const tr of typeReports) {
  lines.push(`| ${tr.bracketType} | ${tr.total.toLocaleString()} | ${tr.inLedger} | ${tr.newCount.toLocaleString()} |`);
}
lines.push('');

lines.push('## 2. 括弧タイプ別 詳細分析');
lines.push('');

for (const tr of typeReports) {
  lines.push(`### ${tr.bracketType} (${tr.total.toLocaleString()}件)`);
  lines.push('');

  if (tr.knowledge) {
    lines.push(`**ギリシャ語**: ${tr.knowledge.greekLemmas.join(' / ')} — ${tr.knowledge.greekRole}`);
    lines.push('');
    lines.push(`**形態論**: ${tr.knowledge.morphology || '—'}`);
    lines.push('');
    lines.push(`**日本語との構造的関係**: ${tr.knowledge.jaStructural}`);
    lines.push('');
    lines.push(`**仮説**: ${tr.knowledge.hypothesis}`);
    lines.push('');
    lines.push(`**検証設問**: ${tr.knowledge.verificationQ}`);
    lines.push('');
  }

  lines.push('**Strong番号分布（上位）:**');
  lines.push('');
  lines.push('| Strong | 件数 |');
  lines.push('|--------|------|');
  for (const [s, n] of tr.strongDistribution) lines.push(`| ${s} | ${n.toLocaleString()} |`);
  lines.push('');

  lines.push(`**JA1955サンプル指標照合** (サンプル${tr.sampleCount}件中 ${tr.indicatorHitCount}件に指標検出: ${tr.indicatorHitRate}%)`);
  lines.push('');
  lines.push('| ref | Strong | morph | text | JA1955節（抜粋100文字） | 指標ヒット |');
  lines.push('|-----|--------|-------|------|----------------------|-----------|');
  for (const s of tr.samples) {
    const verse = (s.ja1955_verse || '(なし)').replace(/\r?\n/g, ' ').replace(/\|/g, '｜');
    const hits  = s.indicator_hits.length > 0 ? s.indicator_hits.join('／') : '—';
    lines.push(`| ${s.ref} | ${s.strong} | ${s.morph} | ${s.text} | ${verse} | ${hits} |`);
  }
  lines.push('');

  lines.push(`**AUTO判定メモ**: ${tr.autoNote}`);
  lines.push('');
  lines.push('---');
  lines.push('');
}

lines.push('## 3. 件数整合性チェック');
lines.push('');
const sumNewCount = typeReports.reduce((a, tr) => a + tr.newCount, 0);
const sumInLedger = typeReports.reduce((a, tr) => a + tr.inLedger, 0);
const sumTotal    = typeReports.reduce((a, tr) => a + tr.total, 0);
lines.push(`- 括弧付きトークン総数: ${sumTotal.toLocaleString()} (期待値: 27,632)`);
lines.push(`- 台帳収録合計: ${sumInLedger.toLocaleString()} (期待値: 303)`);
lines.push(`- 新規対象合計: ${sumNewCount.toLocaleString()} (期待値: 27,329)`);
lines.push(`- 整合性: ${sumTotal === 27632 && sumInLedger === 303 && sumNewCount === 27329 ? 'OK ✓' : 'NG ✗'}`);
lines.push('');

lines.push('## 4. 次のステップ（Stage 1 人的確認待ち）');
lines.push('');
lines.push('このレポートの AUTO判定はすべて暫定。以下の確認を行うこと:');
lines.push('');
lines.push('1. **G3588 ［冠詞］ 19,795件**: 「その/この」等の指示詞対応例のサンプルを確認し、');
lines.push('   対象外（独立訳語なし）として確定するか、現状維持として扱うかを判断する。');
lines.push('2. **残余 ［転換語句］ (27,329件のうち 2,473件がG1161)**: 既存303件と同様に対象外とするか、');
lines.push('   個別確認するかを判断する（他Strong番号の ［転換語句］ 含む）。');
lines.push('3. **その他6タイプ（1,798〜333件）**: サンプルのヒット率と実例を確認し、');
lines.push('   タイプ別に一括判定基準を設けるか、個別判定するかを判断する。');
lines.push('');

const mdPath = path.join(REPT_DIR, 'stage1-bracket-report.md');
fs.writeFileSync(mdPath, lines.join('\n'), 'utf8');
console.log(`Markdown出力: ${mdPath}`);

// ── manifest.json ────────────────────────────────────────────────────────
const manifest = {
  _meta: {
    version:     1,
    generated:   new Date().toISOString(),
    description: 'NT全トークン日本語訳監査 — 全体マニフェスト',
    auditVersion: 'v2.0 (full-audit)',
  },
  scope: {
    totalTokens:  137741,
    books:        27,
    chapters:     260,
    uniqueStrong: 5440,
  },
  currentStatus: {
    '修正承認→適用済み':        132,
    '修正済み（PR#471）':         16,
    '判断保留':                   55,
    '対象外（今回）':             303,
    '現状維持（台帳）':            3,
    '現状維持（スクリプト未収録）': 32169,
    '要確認':                 105063,
    '合計':                  137741,
  },
  stages: {
    'Stage 0': { status: 'COMPLETED', description: '既存監査資産棚卸し・計画策定', tokens: 0 },
    'Stage 1': { status: 'IN_PROGRESS', description: '括弧付きトークン予備監査', tokens: 27632 },
    'Stage 2': { status: 'PENDING', description: 'スクリプト現状維持 32,169件検証', tokens: 32169 },
    'Stage 3': { status: 'PENDING', description: '高頻度機能語系統監査', tokens: null },
    'Stage 4': { status: 'PENDING', description: 'コンテンツ語個別監査', tokens: null },
    'Stage 5': { status: 'PENDING', description: '判断保留 55件再確認', tokens: 55 },
  },
  files: {
    'reports/stage1-bracket.json':       { stage: 1, tokens: totalBracket },
    'reports/stage1-bracket-report.md':  { stage: 1, tokens: totalBracket },
  },
  bookTokenCounts: {},
};

// 書巻別トークン数を埋める
for (const book of books) {
  let cnt = 0;
  for (const ch of fs.readdirSync(path.join(NT_ROOT, book)).filter(f => f.endsWith('.json'))) {
    cnt += Object.keys(JSON.parse(fs.readFileSync(path.join(NT_ROOT, book, ch), 'utf8'))).length;
  }
  manifest.bookTokenCounts[book] = cnt;
}

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log(`manifest: ${path.join(OUT_DIR, 'manifest.json')}`);

// ── 最終サマリー出力 ───────────────────────────────────────────────────────
console.log('\n=== Stage 1 完了 ===');
console.log(`括弧付きトークン総数: ${totalBracket.toLocaleString()}`);
console.log(`既存台帳収録済み:     ${totalInLedger}`);
console.log(`今回新規対象:         ${totalNewCount.toLocaleString()}`);
console.log('');
console.log('タイプ別サンプル指標照合:');
for (const tr of typeReports) {
  console.log(`  ${tr.bracketType.padEnd(10)} ${String(tr.total).padStart(6)}件 ` +
              `サンプル${tr.sampleCount}件中${tr.indicatorHitCount}件ヒット (${tr.indicatorHitRate}%)`);
}
