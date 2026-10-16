#!/usr/bin/env node
/**
 * build-apparatus-rdg-ja.cjs
 *
 * apparatus.json の各読み（reading）に対して、
 * lemWords + tokenRefs + morph-index から日本語ラベルを生成し
 * apparatus-rdg-ja.json を出力する。
 *
 * 対象条件（すべて満たす場合のみ処理）:
 *   1. entry.lemWords と entry.tokenRefs が同じ長さで空でない
 *   2. lemWords に重複語形がない（マッピングの一意性）
 *   3. reading.isOmission が false で text が空でない
 *   4. reading.text の各語がすべて lemWords に含まれる
 *
 * 出力形式:
 *   { "entries": { "ROM-0001": { "0": "キリスト・イエス", "1": "イエス・キリスト" }, ... } }
 *
 * キーは readings 配列の 0-based インデックス（文字列）。
 * 対応できない reading はエントリ自体を省略する（静寂優先）。
 *
 * 再生成:
 *   node scripts/build-apparatus-rdg-ja.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const APPARATUS_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MORPH_DIR      = path.join(__dirname, '..', 'public', 'morph-index', 'word');
const OUT_PATH       = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-rdg-ja.json');

// morph-index/word/*.json を全走査して ref → japanese のマップを構築
console.log('Building ref → japanese map from morph-index/word/ ...');
const refMap = {};
const files = fs.readdirSync(MORPH_DIR).filter(f => f.endsWith('.json'));
let fileCount = 0;
for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(MORPH_DIR, file), 'utf8'));
    for (const entries of Object.values(data)) {
        for (const e of entries) {
            if (e.ref && e.japanese && e.japanese.trim()) {
                refMap[e.ref] = e.japanese.trim();
            }
        }
    }
    fileCount++;
    if (fileCount % 50 === 0) process.stdout.write(`  ${fileCount}/${files.length} files\r`);
}
console.log(`\nBuilt ref map: ${Object.keys(refMap).length} entries from ${fileCount} files`);

// apparatus.json を読み込む
const apparatus = JSON.parse(fs.readFileSync(APPARATUS_PATH, 'utf8'));
const entries = apparatus.entries;

const result = {};
let coveredReadings = 0;
let nullReadings    = 0;
let entriesOut      = 0;
let entriesSkipped  = 0;

for (const entry of entries) {
    const tokenRefs = entry.tokenRefs || [];
    const lemWords  = entry.lemWords  || [];

    // lemWords と tokenRefs が並列である必要がある
    if (tokenRefs.length !== lemWords.length || lemWords.length === 0) {
        entriesSkipped++;
        continue;
    }

    // lemWords の語形が一意であること（重複があるとマッピングが曖昧になる）
    if (new Set(lemWords).size !== lemWords.length) {
        entriesSkipped++;
        continue;
    }

    // word → japanese のマップを構築（NFC 正規化でアクセント変種を統一）
    const wordMap = {};
    for (let i = 0; i < lemWords.length; i++) {
        wordMap[lemWords[i].normalize('NFC')] = refMap[tokenRefs[i]] || null;
    }

    const rdgJa = {};
    for (let idx = 0; idx < entry.readings.length; idx++) {
        const r = entry.readings[idx];

        // 省略読みおよびテキストなしはスキップ
        if (r.isOmission || !r.text) {
            nullReadings++;
            continue;
        }

        const rWords = r.text.split(/\s+/).filter(Boolean).map(w => w.normalize('NFC'));

        // すべての語が wordMap のキーとして存在するか確認
        // （lemWords にない語形が reading に含まれる場合はスキップ）
        if (!rWords.every(w => w in wordMap)) {
            nullReadings++;
            continue;
        }

        // 全語に空でない日本語ラベルがある場合のみ出力（部分ラベルを防ぐ）
        const jaWords = rWords.map(w => wordMap[w]);
        if (!jaWords.every(Boolean)) {
            nullReadings++;
            continue;
        }

        rdgJa[String(idx)] = jaWords.join('・');
        coveredReadings++;
    }

    if (Object.keys(rdgJa).length > 0) {
        result[entry.id] = rdgJa;
        entriesOut++;
    }
}

console.log(`Entries: processed=${entriesOut}, skipped=${entriesSkipped}`);
console.log(`Readings: covered=${coveredReadings}, null=${nullReadings}`);

const output = {
    _meta: {
        description: 'apparatus 各読みの日本語ラベル（morph-index の lemWords 一致から自動生成）',
        source: 'public/morph-index/word/ の japanese フィールド（lemWords と同一語形の読みのみ対応）',
        generatedAt: new Date().toISOString().slice(0, 10),
        entriesCount: entriesOut,
        readingsCovered: coveredReadings,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${entriesOut} entries, ${coveredReadings} readings)`);
