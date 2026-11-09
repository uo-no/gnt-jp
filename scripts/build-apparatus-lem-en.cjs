#!/usr/bin/env node
/**
 * build-apparatus-lem-en.cjs
 *
 * apparatus.json の各エントリに対して、tokenRefs を使って bible_data の
 * 英語グロスを取得し、apparatus-lem-en.json を生成する。
 * アルゴリズムは build-apparatus-lem-ja.cjs と同一（素材のみ英語側）。
 * ref → 英語グロスの解決は apparatus-en-refmap.cjs の3段スタック。
 *
 * 出力形式: { "entries": { "ROM-0001": "Christ · Jesus", ... } }
 *
 * 入力:
 *   - public/assets/data/apparatus.json          (tokenRefs)
 *   - public/bible_data/nt/**                     (ref → english)
 *   - public/assets/data/gloss-token/WEB/**       (ref → gloss, 第2段)
 *   - public/assets/data/lexicon/lexicon-lite.json (lemmaId → gloss, 第3段)
 *
 * 出力:
 *   - public/assets/data/apparatus-lem-en.json
 *   - 来歴台帳 CSV（環境変数 APPARATUS_EN_LEDGER にパスを指定したときのみ）
 *
 * 再生成:
 *   node scripts/build-apparatus-lem-en.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const { buildResolver } = require('./apparatus-en-refmap.cjs');

const APPARATUS_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const OUT_PATH       = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-lem-en.json');
const JOINER         = ' · ';

console.log('Building ref → english resolver from bible_data ...');
const { resolve, tokens } = buildResolver();

// apparatus.json を読み込んで各エントリの lemEn を計算
const apparatus = JSON.parse(fs.readFileSync(APPARATUS_PATH, 'utf8'));
const entries = apparatus.entries;

const result = {};
const ledger = [['ref', 'greek', 'stage', 'source', 'value']];
let covered = 0;
let partial = 0;
let missing = 0;

for (const entry of entries) {
    const refs = entry.tokenRefs || [];
    if (!refs.length) { missing++; continue; }

    const enWords = [];
    for (const ref of refs) {
        const r = resolve(ref);
        if (r) {
            enWords.push(r.value);
            ledger.push([ref, tokens[ref] ? tokens[ref].text : '', String(r.stage),
                String(r.source).replace(/[\r\n,]/g, ' '), r.value.replace(/[\r\n,]/g, ' ')]);
        }
    }
    if (enWords.length === 0) { missing++; continue; }
    if (enWords.length < refs.length) partial++;
    else covered++;

    // 重複を除去しつつ順序を保持（JA 版と同一）
    const seen = new Set();
    const unique = enWords.filter(w => seen.has(w) ? false : (seen.add(w), true));
    result[entry.id] = unique.join(JOINER);
}

console.log(`Covered: ${covered}, Partial: ${partial}, Missing: ${missing}`);

if (process.env.APPARATUS_EN_LEDGER) {
    fs.writeFileSync(process.env.APPARATUS_EN_LEDGER,
        '\uFEFF' + ledger.map(row => row.join(',')).join('\n') + '\n');
    console.log(`Ledger: ${process.env.APPARATUS_EN_LEDGER} (${ledger.length - 1} rows)`);
}

const output = {
    _meta: {
        description: 'apparatus エントリの英語語句（bible_data から自動生成）',
        source: 'bible_data english フィールド → gloss-token/WEB → lexicon-lite gloss の3段フォールバック（apparatus-en-refmap.cjs）',
        generatedAt: new Date().toISOString().slice(0, 10),
        entryCount: Object.keys(result).length,
        totalEntries: entries.length,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${Object.keys(result).length}/${entries.length} entries)`);
