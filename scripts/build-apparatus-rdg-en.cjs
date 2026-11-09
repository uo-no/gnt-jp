#!/usr/bin/env node
/**
 * build-apparatus-rdg-en.cjs
 *
 * apparatus.json の各読みに対して英語ラベルを生成し、apparatus-rdg-en.json
 * を生成する。アルゴリズムは build-apparatus-rdg-ja.cjs と同一（素材のみ
 * 英語側）：各エントリの lemWords と tokenRefs の対応から wordMap を作り、
 * 読みの全語が wordMap または出典確認済みの textEnMap に存在し、かつ全語に
 * 空でない英語ラベルがある場合のみラベルを付ける（部分ラベルは出さない）。
 *
 * 出力形式: { "entries": { "ROM-0001": { "0": "Christ · Jesus" }, ... } }
 *
 * 入力:
 *   - public/assets/data/apparatus.json (lemWords / tokenRefs / readings)
 *   - ref → 英語グロスは apparatus-en-refmap.cjs（bible_data 素材の3段スタック）
 *
 * 出力:
 *   - public/assets/data/apparatus-rdg-en.json
 *
 * 再生成:
 *   node scripts/build-apparatus-rdg-en.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');
const { buildResolver } = require('./apparatus-en-refmap.cjs');

const APPARATUS_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const OUT_PATH       = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-rdg-en.json');
const JOINER         = ' · ';

console.log('Building ref → english resolver from bible_data ...');
const { resolve } = buildResolver();
const refMap = {};
{
    const apparatusPre = JSON.parse(fs.readFileSync(APPARATUS_PATH, 'utf8'));
    for (const e of apparatusPre.entries) {
        for (const ref of e.tokenRefs || []) {
            if (!(ref in refMap)) {
                const r = resolve(ref);
                refMap[ref] = r ? r.value : null;
            }
        }
    }
}
console.log(`Built ref map: ${Object.keys(refMap).length} refs`);

// 出典を確認した語形のみ許可する限定フォールバック（JA 版 textJaMap と同じ
// 2語形のみ。語形の一意性だけで意味を自動確定しない — L-0）。
//   ὑπὲρ  : JA 版は「〜のために」。辞書グロス（for, on behalf of）で個別確認
//   πατέρα: ROM-0039 の読み替え形。JA 版は「父」。πατήρ の対格形として個別確認
const textEnMap = {
    'ὑπὲρ': 'for',
    'πατέρα': 'father',
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

    // word → english のマップを構築（NFC 正規化でアクセント変種を統一）
    const wordMap = {};
    for (let i = 0; i < lemWords.length; i++) {
        wordMap[lemWords[i].normalize('NFC')] = refMap[tokenRefs[i]] || null;
    }

    const rdgEn = {};
    for (let idx = 0; idx < entry.readings.length; idx++) {
        const r = entry.readings[idx];

        // 省略読みおよびテキストなしはスキップ
        if (r.isOmission || !r.text) {
            nullReadings++;
            continue;
        }

        const rWords = r.text.split(/\s+/).filter(Boolean).map(w => w.normalize('NFC'));

        // すべての語が wordMap（lemWords 由来）または textEnMap（出典確認済み
        // 語形別フォールバック）に存在するか確認
        if (!rWords.every(w => w in wordMap || w in textEnMap)) {
            nullReadings++;
            continue;
        }

        // 全語に空でない英語ラベルがある場合のみ出力（部分ラベルを防ぐ）
        // wordMap 優先・不在の場合のみ textEnMap を使用
        const enWords = rWords.map(w => (w in wordMap) ? wordMap[w] : textEnMap[w]);
        if (!enWords.every(Boolean)) {
            nullReadings++;
            continue;
        }

        rdgEn[String(idx)] = enWords.join(JOINER);
        coveredReadings++;
    }

    if (Object.keys(rdgEn).length > 0) {
        result[entry.id] = rdgEn;
        entriesOut++;
    }
}

console.log(`Entries: processed=${entriesOut}, skipped=${entriesSkipped}`);
console.log(`Readings: covered=${coveredReadings}, null=${nullReadings}`);

const output = {
    _meta: {
        description: 'apparatus 各読みの英語ラベル（bible_data から自動生成）',
        source: 'bible_data english フィールド → gloss-token/WEB → lexicon-lite gloss の3段フォールバック（lemWords 由来の wordMap + 出典確認済みの明示的な語形別フォールバック textEnMap）',
        generatedAt: new Date().toISOString().slice(0, 10),
        entriesCount: entriesOut,
        readingsCovered: coveredReadings,
    },
    entries: result,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`Written: ${OUT_PATH} (${entriesOut} entries, ${coveredReadings} readings)`);
