#!/usr/bin/env node
/**
 * build-reading-ln-gloss.cjs — (lemmaId, Louw-Nida) → 日本語 gloss 対応表生成
 * （Phase 5-C1: データ生成のみ。ReadingEngine には接続しない）
 *
 * 実行: node scripts/build-reading-ln-gloss.cjs
 *       npm run build:ln-gloss
 * 出力: public/assets/data/reading-ln-gloss-data.js（上書き。手編集禁止）
 *
 * 生成方法:
 *   1. NT 全トークンを走査（bible_data/nt。走査順はソートで固定 = 決定的）
 *   2. lemmaId・ln・japanese がすべて有効なトークンだけを対象にする
 *      - ln が複数（スペース区切り）の場合は先頭コードを採用
 *        （Macula の第一義。docs/reading-semantic.md の監査と同じ扱い）
 *      - japanese の placeholder（空/—/-/???/読み込んでいます...）は除外
 *   3. (lemmaId, ln) ごとに japanese を頻度集計し、最頻値を採用。
 *      同率は初出順（決定的）
 *
 * キー: lemmaId は token.lemmaId と同形（'grc:G3056'）。
 *       Phase 4 以降の lemmaId キー正典（reading-lexicon / semantic）と
 *       一貫させる。
 *
 * 出力形式: window.READING_LN_GLOSS = Object.freeze({ lemmaId: Object.freeze({ ln: gloss }) })
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(PUBLIC, 'assets', 'data', 'reading-ln-gloss-data.js');

const PLACEHOLDERS = new Set(['', '—', '-', '???', '読み込んでいます...']);

// ── 集計: lemmaId → ln → gloss → { count, firstSeen } ────────────────
const agg = new Map();
let seq = 0;
let scanned = 0;      // NT 全トークン
let covered = 0;      // lemmaId + ln + 有効 japanese が揃うトークン
let uncovered = 0;    // いずれか欠落

const books = fs.readdirSync(NT_DIR)
    .filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort();
for (const book of books) {
    const chapters = fs.readdirSync(path.join(NT_DIR, book))
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));
    for (const ch of chapters) {
        const tokens = JSON.parse(
            fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
        for (const t of tokens) {
            scanned++;
            const lemmaId = t.lemmaId;
            const ja = t.japanese;
            const lnRaw = t.ln;
            if (!lemmaId || typeof lemmaId !== 'string' ||
                !lnRaw || typeof lnRaw !== 'string' ||
                ja == null || typeof ja !== 'string' || PLACEHOLDERS.has(ja)) {
                uncovered++;
                continue;
            }
            covered++;
            const ln = lnRaw.split(' ')[0];
            if (!agg.has(lemmaId)) agg.set(lemmaId, new Map());
            const byLn = agg.get(lemmaId);
            if (!byLn.has(ln)) byLn.set(ln, new Map());
            const byGloss = byLn.get(ln);
            if (!byGloss.has(ja)) byGloss.set(ja, { count: 0, firstSeen: seq++ });
            byGloss.get(ja).count++;
        }
    }
}

// ── 最頻 gloss の決定（同率は初出順） ────────────────────────────────
const lemmaIds = [...agg.keys()].sort();
let pairCount = 0;
const lnSet = new Set();
const lines = [];
for (const lemmaId of lemmaIds) {
    const byLn = agg.get(lemmaId);
    const lns = [...byLn.keys()].sort();
    const parts = [];
    for (const ln of lns) {
        const winner = [...byLn.get(ln).entries()]
            .sort((a, b) => (b[1].count - a[1].count) || (a[1].firstSeen - b[1].firstSeen))[0][0];
        parts.push(`${JSON.stringify(ln)}: ${JSON.stringify(winner)}`);
        pairCount++;
        lnSet.add(ln);
    }
    lines.push(`    ${JSON.stringify(lemmaId)}: Object.freeze({ ${parts.join(', ')} }),`);
}

const today = new Date().toISOString().slice(0, 10);
const output = `/**
 * reading-ln-gloss-data.js — (lemmaId, Louw-Nida) → 日本語 gloss 対応表
 * （Phase 5-C1 生成物）
 *
 * ★ 生成ファイル — 手編集禁止。再生成: node scripts/build-reading-ln-gloss.cjs
 * ★ Phase 5-C1 時点では ReadingEngine に未接続（データのみ。
 *    接続は Phase 5-C2 の対応表監査を通過してから）。
 *
 * 生成元: bible_data/nt の token.lemmaId × token.ln（先頭コード）ごとに
 *         token.japanese を頻度集計した最頻値（同率は初出順・決定的）。
 * キー:   lemmaId（token.lemmaId と同形）→ ln コード → gloss。
 */

'use strict';

window.READING_LN_GLOSS = Object.freeze({
${lines.join('\n')}
});

// Node（監査・回帰テスト）用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { READING_LN_GLOSS: window.READING_LN_GLOSS };
}
`;

// window が無い Node 実行でも生成物を requireCjs で読めるようにするため、
// 先頭で window を自己定義する（ブラウザでは既存 window を使う）
const finalOutput = output.replace(
    "'use strict';\n",
    "'use strict';\n\nif (typeof window === 'undefined') { globalThis.window = globalThis; }\n"
);

fs.writeFileSync(OUT, finalOutput);

console.log('build-reading-ln-gloss 完了');
console.log(`  走査トークン       : ${scanned}`);
console.log(`  集計対象トークン   : ${covered}`);
console.log(`  未対応トークン     : ${uncovered} (${(uncovered / scanned * 100).toFixed(1)}%)`);
console.log(`  lemma 数           : ${lemmaIds.length}`);
console.log(`  (lemmaId, ln) 対数 : ${pairCount}`);
console.log(`  ln コード種類      : ${lnSet.size}`);
console.log(`  出力               : ${path.relative(ROOT, OUT)} (${(finalOutput.length / 1024).toFixed(0)} KB)`);
