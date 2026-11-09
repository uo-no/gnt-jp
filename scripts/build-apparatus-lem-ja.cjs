#!/usr/bin/env node
/**
 * build-apparatus-lem-ja.cjs
 *
 * apparatus.json の各エントリに対して、tokenRefs を使って bible_data から
 * 日本語語句を取得し、apparatus-lem-ja.json を生成する。
 *
 * 出力形式: { "entries": { "ROM-0001": "キリスト・イエス", ... } }
 *
 * 入力:
 *   - public/assets/data/apparatus.json (tokenRefs)
 *   - public/bible_data/nt/**           (ref → japanese)
 *
 * 出力:
 *   - public/assets/data/apparatus-lem-ja.json
 *
 * 再生成:
 *   node scripts/build-apparatus-lem-ja.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const APPARATUS_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const BIBLE_DATA_DIR = path.join(__dirname, '..', 'public', 'bible_data', 'nt');
const OUT_PATH       = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-lem-ja.json');

// bible_data/nt/{書}/{章}.json を全走査して ref → japanese のマップを構築
// （2026-11-09 付け替え: 旧入力 morph-index/word/ は bible_data の写しであり、
//   word/ 廃止に伴い正本の bible_data から直接引く）
console.log('Building ref → japanese map from bible_data ...');
const refMap = {};
let fileCount = 0;
for (const book of fs.readdirSync(BIBLE_DATA_DIR)) {
    const bookDir = path.join(BIBLE_DATA_DIR, book);
    if (!fs.statSync(bookDir).isDirectory()) continue;
    for (const file of fs.readdirSync(bookDir).filter(f => f.endsWith('.json'))) {
        const data = JSON.parse(fs.readFileSync(path.join(bookDir, file), 'utf8'));
        for (const e of data) {
            if (e.ref && e.japanese && e.japanese.trim()) {
                refMap[e.ref] = e.japanese.trim();
            }
        }
        fileCount++;
    }
}
console.log(`Built ref map: ${Object.keys(refMap).length} entries from ${fileCount} files`);

// apparatus.json を読み込んで各エントリのlemJaを計算
const apparatus = JSON.parse(fs.readFileSync(APPARATUS_PATH, 'utf8'));
const entries = apparatus.entries;

const result = {};
let covered = 0;
let partial = 0;
let missing = 0;

for (const entry of entries) {
    const refs = entry.tokenRefs || [];
    if (!refs.length) { missing++; continue; }

    const jaWords = refs.map(ref => refMap[ref]).filter(Boolean);
    if (jaWords.length === 0) { missing++; continue; }
    if (jaWords.length < refs.length) partial++;
    else covered++;

    // 重複を除去しつつ順序を保持
    const seen = new Set();
    const unique = jaWords.filter(w => seen.has(w) ? false : (seen.add(w), true));
    result[entry.id] = unique.join('・');
}

console.log(`Covered: ${covered}, Partial: ${partial}, Missing: ${missing}`);

const output = {
    _meta: {
        description: 'apparatus エントリの日本語語句（bible_data から自動生成）',
        source: 'public/bible_data の japanese フィールド',
        generatedAt: new Date().toISOString().slice(0, 10),
        entryCount: Object.keys(result).length,
        totalEntries: entries.length,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${Object.keys(result).length}/${entries.length} entries)`);
