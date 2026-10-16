#!/usr/bin/env node
/**
 * build-apparatus-lem-ja.cjs
 *
 * apparatus.json の各エントリに対して、tokenRefs を使って morph-index から
 * 日本語語句を取得し、apparatus-lem-ja.json を生成する。
 *
 * 出力形式: { "entries": { "ROM-0001": "キリスト・イエス", ... } }
 *
 * 入力:
 *   - public/assets/data/apparatus.json (tokenRefs)
 *   - public/morph-index/word/*.json    (ref → japanese)
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
const MORPH_DIR      = path.join(__dirname, '..', 'public', 'morph-index', 'word');
const OUT_PATH       = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-lem-ja.json');

// morph-index/word/*.json を全走査して ref → japanese のマップを構築
console.log('Building ref → japanese map from morph-index/word/ ...');
const refMap = {};
const files = fs.readdirSync(MORPH_DIR).filter(f => f.endsWith('.json'));
let fileCount = 0;
for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(MORPH_DIR, file), 'utf8'));
    for (const entries of Object.values(data)) {
        for (const e of entries) {
            // NT トークンのみ（ref が "BOOK CH:V!N" 形式）
            if (e.ref && e.japanese && e.japanese.trim()) {
                refMap[e.ref] = e.japanese.trim();
            }
        }
    }
    fileCount++;
    if (fileCount % 50 === 0) process.stdout.write(`  ${fileCount}/${files.length} files\r`);
}
console.log(`\nBuilt ref map: ${Object.keys(refMap).length} entries from ${fileCount} files`);

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
        description: 'apparatus エントリの日本語語句（morph-index から自動生成）',
        source: 'public/morph-index/word/ の japanese フィールド',
        generatedAt: new Date().toISOString().slice(0, 10),
        entryCount: Object.keys(result).length,
        totalEntries: entries.length,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${Object.keys(result).length}/${entries.length} entries)`);
