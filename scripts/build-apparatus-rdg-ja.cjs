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
 *   4. reading.text の各語が wordMap または明示的な textJaMap に存在する
 *
 * 語形フォールバック（textJaMap）:
 *   lemWords に含まれない語形（語彙置換ヴァリアント）は、
 *   出典と採用ラベルを個別に確認した明示的な対応だけを許可する。
 *   morph-index 全体の語形一意性だけで意味を自動確定しない（L-0）。
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

// morph-index/word/ を再帰的に走査して ref → japanese のマップを構築
// （単語によってはサブディレクトリ内の part_*.json に分割格納されている）
// 語彙置換ヴァリアント用フォールバックは、出典確認済み語形を textJaMap に明示するする
console.log('Building ref → japanese map from morph-index/word/ ...');
const refMap = {};
let fileCount = 0;

function readMorphDir(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        if (item.isDirectory()) {
            readMorphDir(path.join(dir, item.name));
        } else if (item.name.endsWith('.json') && item.name !== 'index.json') {
            const data = JSON.parse(fs.readFileSync(path.join(dir, item.name), 'utf8'));
            for (const entries of Object.values(data)) {
                for (const e of entries) {
                    if (e.ref && e.japanese && e.japanese.trim()) {
                        refMap[e.ref] = e.japanese.trim();
                    }
                }
            }
            fileCount++;
            if (fileCount % 50 === 0) process.stdout.write(`  ${fileCount} files\r`);
        }
    }
}
readMorphDir(MORPH_DIR);
console.log(`\nBuilt ref map: ${Object.keys(refMap).length} entries from ${fileCount} files`);

// 出典を確認した語形のみ許可する限定フォールバック。
// 語形の一意性だけで意味を自動確定しない（L-0）。
const textJaMap = {
    'ὑπὲρ': '〜のために',
};

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

        // すべての語が wordMap（lemWords 由来）または textJaMap（出典確認済み語形別フォールバック）に存在するか確認
        if (!rWords.every(w => w in wordMap || w in textJaMap)) {
            nullReadings++;
            continue;
        }

        // 全語に空でない日本語ラベルがある場合のみ出力（部分ラベルを防ぐ）
        // wordMap 優先・不在の場合のみ textJaMap を使用
        const jaWords = rWords.map(w => (w in wordMap) ? wordMap[w] : textJaMap[w]);
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
        description: 'apparatus 各読みの日本語ラベル（morph-index から自動生成）',
        source: 'public/morph-index/word/ の japanese フィールド（lemWords 由来の wordMap + 出典確認済みの明示的な語形別フォールバック）',
        generatedAt: new Date().toISOString().slice(0, 10),
        entriesCount: entriesOut,
        readingsCovered: coveredReadings,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${entriesOut} entries, ${coveredReadings} readings)`);
