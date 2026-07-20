#!/usr/bin/env node
/**
 * build-reading-lexicon.cjs — reading-lexicon-data.js 生成スクリプト（Phase 4-B/4-C）
 *
 * 実行: node scripts/build-reading-lexicon.cjs
 * 出力: public/assets/data/reading-lexicon-data.js（上書き。手編集禁止）
 *
 * 処理:
 *   1. bible_data 全体（nt/ + lxx/）を走査し、lemmaId ごとに japanese を集約
 *      - 空文字・null・placeholder（—/-/読み込んでいます...）は除外
 *      - 重複除去のうえ出現頻度順（同数は初出順）で glosses 配列にする
 *      - lemmaId を持たないトークンは対象外（LXX は lemmaId・japanese とも
 *        未整備のため実質 NT のみが寄与する。将来 LXX 整備時は再実行で反映）
 *   2.（Phase 4-C）lexicon-lite.json の Abbott-Smith 語義テキストと gloss_ja
 *      から語義候補を抽出し、glosses へ補完する（優先順位:
 *      bible_data 実使用グロス → Abbott-Smith 語義 → gloss_ja）。
 *      Louw-Nida（ln/domains コード）は日本語グロスを持たないため glosses には
 *      寄与せず、実行時 enrich() で semanticDomains として付与される。
 *   3. デポネント・自動詞グロスのフラグ（下記 DEPONENT_LEMMA_IDS が SSOT）を
 *      マージして deponent を付与
 *
 * 生成は決定的（同じ入力から同じ出力）: 走査順をソートで固定し、
 * 頻度同数の並びは初出順とする。
 *
 * 設計判断（Phase 4-C）: Abbott-Smith 全文・ln/domains コードは本ファイルへ
 * 焼き込まない（同期ロードのサイズを抑える）。それらは lexicon-lite の
 * 非同期ロード後に ReadingLexicon.enrich() が付与する。
 *
 * 設計正典: docs/reading-lexicon.md §3
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BIBLE  = path.join(PUBLIC, 'bible_data');
const OUT    = path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js');

// ── デポネント・自動詞グロス lemmaId（SSOT — Phase 1 監査 2026-07-16 由来） ──
// 再生成してもこのフラグが維持されるよう、生成スクリプトが唯一の定義元。
// 値はコメントの Greek lemma / 区分（デポネント or 自動詞グロス）を含めて管理する。
const DEPONENT_LEMMA_IDS = new Map([
    ['grc:G611',  'ἀποκρίνομαι 答える（デポネント）'],
    ['grc:G4198', 'πορεύομαι 行く（デポネント）'],
    ['grc:G1096', 'γίνομαι なる（デポネント）'],
    ['grc:G5399', 'φοβέομαι 恐れる（デポネント）'],
    ['grc:G5463', 'χαίρω 喜ぶ（受動デポネント形）'],
    ['grc:G3415', 'μιμνῄσκομαι 思い出す（デポネント）'],
    ['grc:G3403', 'μιμνῄσκομαι 思い出す（デポネント・別ID）'],
    ['grc:G2853', 'κολλάομαι 付く（デポネント）'],
    ['grc:G2837', 'κοιμάομαι 眠る（デポネント）'],
    ['grc:G1410', 'δύναμαι できる（デポネント）'],
    ['grc:G4697', 'σπλαγχνίζομαι 深く憐れむ（デポネント）'],
    ['grc:G4762', 'στρέφω 向く（自動詞グロス）'],
    ['grc:G3583', 'ξηραίνω 枯れる（自動詞グロス）'],
    ['grc:G2165', 'εὐφραίνω 喜ぶ（自動詞グロス）'],
    ['grc:G4059', 'περιτέμνω 割礼を受ける（グロスが既に受動的）'],
    ['grc:G5316', 'φαίνω 輝く（自動詞グロス）'],
    ['grc:G4130', 'πίμπλημι 満ちる（自動詞グロス）'],
    ['grc:G2476', 'ἵστημι 立つ（自動詞グロス）'],
    ['grc:G5248', 'ὑπερπερισσεύω あふれるほど満ちる（自動詞グロス）'],
]);

const PLACEHOLDERS = new Set(['', '—', '-', '読み込んでいます...']);

// ── Phase 4-C: Abbott-Smith 語義候補パーサ ──────────────────────────
// lexicon-lite.json の abbottSmith（日本語テキスト）から語義候補を抽出する。
// 抽出源: 【語義】直後のセグメント / ①②…センスマーカー後のセグメント
// （「」引用があれば引用内優先）/ 短い gloss_ja。
// ノイズ除去: 文法ラベル・参照記号・「〜として/について」句・長すぎる定義文。
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const GRAMMAR_LABELS = new Set([
    '自動詞', '他動詞', '受動態', '中動態', '副詞', '形容詞', '名詞', '動詞',
    '不変化名詞', '複数形', '単数形', '絶対用法', '比喩的', '字義通り',
    '間投詞', '接続詞', '前置詞', '冠詞',
]);

function _cleanCandidates(seg) {
    seg = seg.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '');
    seg = seg.replace(new RegExp(`[${CIRCLED}]`, 'g'), '');
    const out = [];
    for (const part of seg.split('、')) {
        const p = part.trim().replace(/。$/, '');
        if (!p || p.length > 10) continue;
        if (GRAMMAR_LABELS.has(p)) continue;
        if (/[a-zA-Zα-ωΑ-Ω0-9：；:;・§【】「」]/.test(p)) continue;
        if (/として|について|常用|など$|等$/.test(p)) continue;
        out.push(p);
    }
    return out;
}

function parseAbbottSmithGlosses(text, glossJa) {
    const cands = [];
    text = text || '';
    // 1. 【語義】直後 〜 最初の 。：；【 まで
    const mLead = text.match(/【語義】([^。：；【]+)/);
    if (mLead) cands.push(..._cleanCandidates(mLead[1]));
    // 2. センスマーカー ①… 後 〜 次の区切りまで（「」引用があれば引用内優先）
    const senseRe = new RegExp(`[${CIRCLED}]([^${CIRCLED}]*?)(?=[：；。]|[${CIRCLED}]|$)`, 'g');
    let m;
    while ((m = senseRe.exec(text)) !== null) {
        const quoted = [...m[1].matchAll(/「([^」]+)」/g)].map(x => x[1]);
        if (quoted.length) {
            for (const q of quoted) cands.push(..._cleanCandidates(q));
        } else {
            cands.push(..._cleanCandidates(m[1]));
        }
    }
    // 3. gloss_ja（短く、センスマーカー始まりでないもの）
    if (glossJa && glossJa.length <= 10 && !CIRCLED.includes(glossJa[0])) {
        cands.push(..._cleanCandidates(glossJa));
    }
    return cands;
}

// ── 集約 ───────────────────────────────────────────────────────────
// lemmaId → Map(gloss → { count, firstSeen })
const agg = new Map();
let seq = 0;
let scannedTokens = 0;
let contributed = 0;

for (const corpus of ['nt', 'lxx']) {
    const dir = path.join(BIBLE, corpus);
    if (!fs.existsSync(dir)) continue;
    const books = fs.readdirSync(dir)
        .filter(b => fs.statSync(path.join(dir, b)).isDirectory()).sort();
    for (const book of books) {
        const chapters = fs.readdirSync(path.join(dir, book))
            .filter(f => f.endsWith('.json'))
            .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));
        for (const ch of chapters) {
            const tokens = JSON.parse(
                fs.readFileSync(path.join(dir, book, ch), 'utf8'));
            for (const t of tokens) {
                scannedTokens++;
                const lemmaId = t.lemmaId;
                const ja = t.japanese;
                if (!lemmaId || typeof lemmaId !== 'string') continue;
                if (ja == null || typeof ja !== 'string' || PLACEHOLDERS.has(ja)) continue;
                contributed++;
                if (!agg.has(lemmaId)) agg.set(lemmaId, new Map());
                const m = agg.get(lemmaId);
                if (!m.has(ja)) m.set(ja, { count: 0, firstSeen: seq++ });
                m.get(ja).count++;
            }
        }
    }
}

// デポネント lemmaId で出現ゼロのものもエントリ化する（フラグ維持）
for (const id of DEPONENT_LEMMA_IDS.keys()) {
    if (!agg.has(id)) agg.set(id, new Map());
}

// ── Phase 4-C: lexicon-lite から Abbott-Smith 語義候補を補完 ─────────
const LITE_PATH = path.join(PUBLIC, 'assets', 'data', 'lexicon', 'lexicon-lite.json');
let lite = {};
try {
    lite = JSON.parse(fs.readFileSync(LITE_PATH, 'utf8'));
} catch (e) {
    console.warn('lexicon-lite.json が読めません（glosses は bible_data のみ）:', e.message);
}
let asEnriched = 0;

// ── エントリ生成 ─────────────────────────────────────────────────────
// glosses の並び: bible_data 実使用（頻度順）→ Abbott-Smith 語義 → gloss_ja
// （重複除去・先勝ち）。lexicon-lite にしか存在しない lemmaId はエントリ化
// しない（bible_data に出現しない語はトークン解決の対象にならないため）。
const lemmaIds = [...agg.keys()].sort();
const lines = [];
for (const id of lemmaIds) {
    const usage = [...agg.get(id).entries()]
        .sort((a, b) => (b[1].count - a[1].count) || (a[1].firstSeen - b[1].firstSeen))
        .map(([g]) => g);
    const liteEntry = lite[id];
    const asCands = liteEntry
        ? parseAbbottSmithGlosses(liteEntry.abbottSmith, liteEntry.gloss_ja) : [];
    const seen = new Set();
    const glosses = [];
    for (const g of [...usage, ...asCands]) {
        if (!seen.has(g)) { seen.add(g); glosses.push(g); }
    }
    if (asCands.length && glosses.length > usage.length) asEnriched++;
    const deponent = DEPONENT_LEMMA_IDS.has(id);
    const note = deponent ? ` // ${DEPONENT_LEMMA_IDS.get(id)}` : '';
    lines.push(`            ${JSON.stringify(id)}: { lemmaId: ${JSON.stringify(id)}, deponent: ${deponent}, glosses: ${JSON.stringify(glosses)} },${note}`);
}

const today = new Date().toISOString().slice(0, 10);
const output = `/**
 * reading-lexicon-data.js — Reading Lexicon データ（Phase 4-B/4-C 生成物）
 *
 * ★ 生成ファイル — 手編集禁止。再生成: node scripts/build-reading-lexicon.cjs
 *
 * 内容:
 *   - glosses: 語義候補。並びは
 *       bible_data 実使用グロス（頻度順）→ Abbott-Smith 語義 → gloss_ja
 *     （重複除去・placeholder/文法ラベル除外）
 *   - deponent: デポネント・自動詞グロスのフラグ
 *     （SSOT は build-reading-lexicon.cjs の DEPONENT_LEMMA_IDS）
 *   - glossJa / abbottSmith 全文 / semanticDomains（ln・domains）は
 *     本ファイルには含めない。lexicon-lite の非同期ロード後に
 *     ReadingLexicon.enrich() が付与する（サイズ抑制のための設計判断）。
 *
 * キー: lemmaId（token.lemmaId と同形。lexicon-lite.json との結合キー）
 * 消費者: ReadingLexicon（core/reading-lexicon.js）。
 *   Phase 4 時点で ReadingEngine が読むのは deponent のみ。
 *   glosses は Phase 5 Semantic Layer のための語義候補（未消費）。
 *
 * 読み込み順序: 本ファイル → core/reading-lexicon.js →
 *               core/reading-engine.js（script タグ同期実行）。
 */

'use strict';

(function (root) {
    const data = {
        version: 3,
        generated: '${today}',
        source: 'bible_data (nt+lxx) + Abbott-Smith/gloss_ja (lexicon-lite) + Phase 1 audit deponent set',
        entryCount: ${lemmaIds.length},
        entries: {
${lines.join('\n')}
        },
    };

    if (typeof window !== 'undefined') {
        window.App = window.App || {};
        window.App.readingLexiconData = data;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { readingLexiconData: data };
    }
})(this);
`;

fs.writeFileSync(OUT, output);

console.log('build-reading-lexicon 完了');
console.log(`  走査トークン   : ${scannedTokens}`);
console.log(`  集約対象       : ${contributed}`);
console.log(`  エントリ数     : ${lemmaIds.length}`);
console.log(`  AS補完エントリ : ${asEnriched}`);
console.log(`  deponent       : ${DEPONENT_LEMMA_IDS.size}`);
console.log(`  出力            : ${path.relative(ROOT, OUT)} (${(output.length / 1024).toFixed(0)} KB)`);
