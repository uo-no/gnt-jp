#!/usr/bin/env node
/**
 * audit-ja1955-nt-wide.cjs — NT全体 JA1955 対応監査
 *
 * 目的: JAS 1:12-15 パイロット（16件）で確立したルールを基準に、
 *       NT全260章の bible_data.japanese フィールドを口語訳（JA1955）と照合し、
 *       更新候補・現状維持・要確認を分類する。
 *
 * 出力: scripts/output/ja1955-nt-audit.json
 *       scripts/output/ja1955-nt-audit-summary.md
 *
 * 禁止: bible_data への書き込みは一切行わない。
 * 実行: node scripts/audit-ja1955-nt-wide.cjs
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NTROOT = path.join(PUBLIC, 'bible_data', 'nt');
const JA_ROOT= path.join(PUBLIC, 'translations', 'JA1955');
const OUT    = path.join(__dirname, 'output');

// ── パイロット16件で確立した変更パターン ─────────────────────────────────
// before: 現在の japanese 値（変更前）
// after:  提案値（変更後）
// rule:   適用ルール
// conservative: true = 高頻度機能語につき個別確認が必要
const PILOT_PATTERNS = [
  // 低頻度・意味明確型（JA1955一致が高確信度）
  { strong:'G5088', before:'産む',    after:'生む',     rule:'産む→生む（JA1955: 生む）',    conservative:false },
  { strong:'G658',  before:'完成する',after:'熟する',   rule:'完成する→熟する（死が熟す文脈）', conservative:false },
  { strong:'G1828', before:'引き出す',after:'引く',     rule:'引き出す→引く（JA1955: 引かれ）', conservative:false },
  { strong:'G4815', before:'捕らえる',after:'はらむ',   rule:'捕らえる→はらむ（妊娠文脈）',   conservative:false },
  // 中頻度・意味明確型
  { strong:'G5278', before:'忍耐する',after:'耐え忍ぶ', rule:'忍耐する→耐え忍ぶ',           conservative:false },
  { strong:'G1939', before:'欲望',    after:'欲',       rule:'欲望→欲',                    conservative:false },
  { strong:'G1538', before:'各自',    after:'それぞれ',  rule:'各自→それぞれ',              conservative:false },
  // 中頻度・文脈依存型
  { strong:'G435',  before:'男',      after:'人',       rule:'男→人（JA1955: 人 の場合）', conservative:true  },
  { strong:'G3985', before:'試みる',  after:'誘惑する', rule:'試みる→誘惑する（誘惑文脈）',  conservative:true  },
  { strong:'G3986', before:'誘惑',    after:'試錬',     rule:'誘惑→試錬（試練・信仰文脈）',  conservative:true  },
  // 高頻度・機能語型（個別確認必須）
  { strong:'G1161', before:'［転換語句］', after:'また', rule:'転換語句→また（JA1955明示時のみ）', conservative:true },
  { strong:'G846',  before:'彼',      after:'自ら',     rule:'彼→自ら（reflexive文脈のみ）', conservative:true  },
];

const PILOT_MAP = new Map(PILOT_PATTERNS.map(p => [p.strong, p]));

// ── JA1955 ロード ────────────────────────────────────────────────────────
function loadJA1955(bookKey, chNum) {
    const fp = path.join(JA_ROOT, bookKey, chNum + '.json');
    if (!fs.existsSync(fp)) return null;
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    return d.verses || {}; // { "1": "text", "2": "text", ... }
}

// ── テキストマッチング ───────────────────────────────────────────────────
function stripBrackets(s) {
    return (s||'').replace(/^［(.*)］$/, '$1').replace(/^〔(.*)〕$/, '$1').trim();
}

function hasBracket(s) {
    return /^[［〔]/.test(s||'');
}

// japaneseBase が verseText に含まれるか（基本形・漢字ベース）
function containsBase(verseText, japaneseBase) {
    if (!verseText || !japaneseBase) return false;
    const clean = stripBrackets(japaneseBase);
    if (!clean) return false;
    // 直接含む
    if (verseText.includes(clean)) return true;
    // 漢字部分（2文字以上）で確認
    const kanji = clean.replace(/[ぁ-ん]/g, '').replace(/[ァ-ン]/g, '').replace(/[a-zA-Z]/g, '').replace(/[ー]/g,'').trim();
    if (kanji.length >= 2 && verseText.includes(kanji)) return true;
    return false;
}

// JA1955 テキスト中で alternativeが含まれるか確認
function verseContains(verseText, word) {
    if (!verseText || !word) return false;
    return verseText.includes(word);
}

// ── 判定ロジック ──────────────────────────────────────────────────────────
function classify(token, verseText, pattern) {
    const ja = token.japanese || '';
    const isBracket = hasBracket(ja);
    const strippedJa = stripBrackets(ja);

    if (!verseText) {
        return { verdict:'要確認', reason:'JA1955節なし', confidence:'低', proposedJapanese: null };
    }

    // パイロットパターン該当
    if (pattern) {
        const currentMatches = ja === pattern.before;
        const verseHasAfter  = verseContains(verseText, pattern.after);
        const verseHasBefore = containsBase(verseText, pattern.before);

        if (!currentMatches) {
            // 現在値がパターンのbefore値でない（すでに変更済みかその他の値）
            return { verdict:'現状維持', reason:'現在値がパターンbefore値でない（'+ja+'）', confidence:'高', proposedJapanese: null };
        }

        if (pattern.conservative) {
            // 保守的パターン: JA1955にafterが明示されている場合のみ候補
            if (verseHasAfter && !verseHasBefore) {
                return { verdict:'更新候補', reason:'JA1955に「'+pattern.after+'」を確認、既存値なし（保守判定）', confidence:'中', proposedJapanese: pattern.after };
            } else if (verseHasAfter && verseHasBefore) {
                return { verdict:'要確認', reason:'JA1955に「'+pattern.after+'」「'+pattern.before+'」両方含む可能性', confidence:'低', proposedJapanese: pattern.after };
            } else {
                return { verdict:'要確認', reason:'保守的パターン・JA1955確認必要', confidence:'低', proposedJapanese: pattern.after };
            }
        } else {
            // 非保守: JA1955にafterが含まれれば候補
            if (verseHasAfter) {
                return { verdict:'更新候補', reason:'JA1955に「'+pattern.after+'」を確認', confidence:'高', proposedJapanese: pattern.after };
            } else if (verseHasBefore) {
                return { verdict:'現状維持', reason:'JA1955にも「'+pattern.before+'」を確認', confidence:'高', proposedJapanese: null };
            } else {
                return { verdict:'要確認', reason:'JA1955にbefore/after両方なし・文脈確認要', confidence:'低', proposedJapanese: pattern.after };
            }
        }
    }

    // 非パターントークン
    if (isBracket) {
        // 括弧付きトークン: JA1955に対応テキストがあるか
        const plainVerse = verseText.replace(/\s/g,'');
        if (strippedJa && verseContains(verseText, strippedJa)) {
            return { verdict:'現状維持', reason:'括弧付き・JA1955に「'+strippedJa+'」確認', confidence:'中', proposedJapanese: null };
        }
        return { verdict:'要確認', reason:'括弧付きトークン・JA1955照合要', confidence:'低', proposedJapanese: null };
    }

    // 通常トークン: JA1955テキストとの照合
    if (containsBase(verseText, ja)) {
        return { verdict:'現状維持', reason:'JA1955テキスト内に確認', confidence:'高', proposedJapanese: null };
    }
    // 見つからない場合
    return { verdict:'要確認', reason:'JA1955テキスト内に未確認', confidence:'低', proposedJapanese: null };
}

// ── メイン走査 ──────────────────────────────────────────────────────────
const books = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'books.json'), 'utf8')).NT;

const results = [];       // 全件
const candidates = [];    // 更新候補のみ
const stats = {
    total: 0,
    更新候補: 0,
    現状維持: 0,
    要確認: 0,
    byStrong: {},
    byBook: {},
    bracketTotal: 0,
    bracketCandidate: 0,
    pilotLemmaTotal: 0,
    pilotLemmaCandidate: 0,
    missingVerseText: 0,
};

let booksDone = 0;
for (const bk of books) {
    stats.byBook[bk.key] = { 更新候補:0, 現状維持:0, 要確認:0 };
    const jaChapters = {}; // chapter -> { verseNum -> text }
    // Preload all JA1955 chapters for this book
    for (let c = 1; c <= bk.chapters; c++) {
        jaChapters[c] = loadJA1955(bk.key, c);
    }

    for (let c = 1; c <= bk.chapters; c++) {
        const gntPath = path.join(NTROOT, bk.key, c + '.json');
        const tokens = JSON.parse(fs.readFileSync(gntPath, 'utf8'));
        const jaVersesMap = jaChapters[c]; // {verse_str: text} or null

        for (const tok of tokens) {
            stats.total++;
            const verseStr = String(tok.verse);
            const verseText = jaVersesMap ? (jaVersesMap[verseStr] || null) : null;
            if (!verseText) stats.missingVerseText++;

            const pattern = PILOT_MAP.get(tok.strong) || null;
            const isPilot  = !!pattern;
            const isBracket= hasBracket(tok.japanese);

            if (isPilot) stats.pilotLemmaTotal++;
            if (isBracket) stats.bracketTotal++;

            const { verdict, reason, confidence, proposedJapanese } = classify(tok, verseText, pattern);

            stats[verdict]++;
            stats.byBook[bk.key][verdict]++;
            if (isPilot && verdict === '更新候補') stats.pilotLemmaCandidate++;
            if (isBracket && verdict === '更新候補') stats.bracketCandidate++;

            if (!stats.byStrong[tok.strong]) stats.byStrong[tok.strong] = { 更新候補:0, 現状維持:0, 要確認:0, total:0 };
            stats.byStrong[tok.strong][verdict]++;
            stats.byStrong[tok.strong].total++;

            const rec = {
                tokenId:  tok.verseId,
                ref:      tok.ref || (bk.key+' '+c+':'+tok.verse+'!'+(tok.tokenIndex||'')),
                book:     bk.key,
                chapter:  c,
                verse:    tok.verse,
                text:     tok.text || tok.word || '',
                lemma:    tok.lemma || '',
                morph:    tok.morph || '',
                strong:   tok.strong || '',
                japanese_before: tok.japanese || '',
                japanese_proposed: proposedJapanese,
                ja1955_verse: verseText ? verseText.slice(0,80)+'...' : null,
                verdict,
                reason,
                confidence,
                isBracket,
                isPilotLemma: isPilot,
                pilotRule: pattern ? pattern.rule : null,
            };

            if (verdict === '更新候補') candidates.push(rec);
            // 要確認かつパイロットレンマのものは全件保存、それ以外は現状維持は除外して軽量化
            if (verdict !== '現状維持') results.push(rec);
        }
    }
    booksDone++;
    process.stderr.write(`\r${booksDone}/${books.length} books processed...`);
}
process.stderr.write('\n');

// ── 出力 ──────────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 更新候補・要確認のみ保存（現状維持 = 10万件超を省く）
const outputData = {
    generated: new Date().toISOString().slice(0,10),
    stats,
    candidates,
    needsReview: results.filter(r => r.verdict === '要確認'),
};
fs.writeFileSync(path.join(OUT, 'ja1955-nt-audit.json'),
    JSON.stringify(outputData, null, 2));

// サマリー markdown
const md = [];
md.push('# JA1955 NT全体監査 サマリー');
md.push('');
md.push(`生成日: ${outputData.generated}`);
md.push('');
md.push('## 全体集計');
md.push('');
md.push(`| 判定 | 件数 |`);
md.push(`|------|------|`);
md.push(`| 更新候補 | ${stats.更新候補} |`);
md.push(`| 現状維持 | ${stats.現状維持} |`);
md.push(`| 要確認   | ${stats.要確認} |`);
md.push(`| **合計** | **${stats.total}** |`);
md.push('');
md.push(`- 走査トークン総数: ${stats.total}`);
md.push(`- JA1955節テキストなし: ${stats.missingVerseText}`);
md.push(`- パイロットレンマ合計: ${stats.pilotLemmaTotal}件`);
md.push(`- パイロットレンマ更新候補: ${stats.pilotLemmaCandidate}件`);
md.push(`- 括弧付きトークン合計: ${stats.bracketTotal}件`);
md.push(`- 括弧付き更新候補: ${stats.bracketCandidate}件`);
md.push('');

// 書巻別
md.push('## 書巻別 更新候補件数（上位）');
md.push('');
md.push('| 書巻 | 更新候補 | 要確認 |');
md.push('|------|---------|--------|');
const booksByCandidate = Object.entries(stats.byBook)
    .sort((a,b) => b[1].更新候補 - a[1].更新候補)
    .filter(([,v]) => v.更新候補 > 0 || v.要確認 > 0);
for (const [bk, v] of booksByCandidate) {
    md.push(`| ${bk} | ${v.更新候補} | ${v.要確認} |`);
}
md.push('');

// Strong別
md.push('## Strong番号別 集計（パイロットレンマ）');
md.push('');
md.push('| Strong | 更新候補 | 要確認 | 現状維持 | 合計 | パターン |');
md.push('|--------|---------|--------|---------|------|---------|');
for (const pat of PILOT_PATTERNS) {
    const s = stats.byStrong[pat.strong] || {更新候補:0,現状維持:0,要確認:0,total:0};
    md.push(`| ${pat.strong} | ${s.更新候補} | ${s.要確認} | ${s.現状維持} | ${s.total} | ${pat.rule} |`);
}
md.push('');

// 更新候補サンプル（最初の30件）
md.push('## 更新候補サンプル（最初の30件）');
md.push('');
md.push('| ref | Strong | morph | 現在値 | 提案値 | 確信度 | 根拠 |');
md.push('|-----|--------|-------|-------|-------|-------|------|');
for (const r of candidates.slice(0,30)) {
    md.push(`| ${r.ref} | ${r.strong} | ${r.morph} | ${r.japanese_before} | ${r.japanese_proposed} | ${r.confidence} | ${r.reason} |`);
}
md.push('');
md.push(`（更新候補 ${candidates.length}件中 30件表示）`);

fs.writeFileSync(path.join(OUT, 'ja1955-nt-audit-summary.md'), md.join('\n'));

// コンソール出力
console.log('JA1955 NT全体監査');
console.log('='.repeat(60));
console.log(`走査トークン数    : ${stats.total}`);
console.log(`更新候補          : ${stats.更新候補}`);
console.log(`現状維持          : ${stats.現状維持}`);
console.log(`要確認            : ${stats.要確認}`);
console.log(`JA1955節なし      : ${stats.missingVerseText}`);
console.log('');
console.log('パイロットレンマ別:');
for (const pat of PILOT_PATTERNS) {
    const s = stats.byStrong[pat.strong] || {更新候補:0,現状維持:0,要確認:0,total:0};
    console.log(`  ${pat.strong.padEnd(6)} 候補${String(s.更新候補).padStart(4)} 確認${String(s.要確認).padStart(5)} 維持${String(s.現状維持).padStart(5)} 計${String(s.total).padStart(6)}  ${pat.rule}`);
}
console.log('');
console.log(`出力: scripts/output/ja1955-nt-audit.json`);
console.log(`      scripts/output/ja1955-nt-audit-summary.md`);
process.exit(0);
