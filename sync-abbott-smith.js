#!/usr/bin/env node
/**
 * sync-abbott-smith.js — lexicon-lite.json の abbottSmith フィールドを
 *                         abbott-smith.tsv の最新内容と同期する
 *
 * 背景:
 *   abbott-smith.tsv（strong / lemma / description_en / description_ja）は
 *   index.html / search-tool.html がブラウザ実行時に直接 fetch する一次データであり、
 *   引き続き本リポジトリに残す必要がある。
 *
 *   一方 lexicon/lexicon-lite.json は、頻度数(count)・意味ドメイン(domains/ln)・
 *   文脈参照(contexts)など abbott-smith.tsv には存在しない独自データを多数含む
 *   別系統の辞書データだが、その中の abbottSmith フィールドだけは
 *   abbott-smith.tsv の内容を静的に焼き込んだコピーになっている。
 *   このため abbott-smith.tsv を編集しても lexicon-lite.json 側には
 *   自動反映されず、ズレが発生する（2026-06-19 に発覚）。
 *
 *   本スクリプトはその abbottSmith フィールドのみを、現在の
 *   abbott-smith.tsv の description_ja で上書き同期する。
 *   abbottSmith フィールドを元々持たないエントリ（見出し語のみで
 *   解説文が無いもの）は対象外のまま据え置く。
 *
 * 実行:
 *   node sync-abbott-smith.js
 *
 *   abbott-smith.tsv を編集した後、コミット前に毎回実行することを想定。
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT      = __dirname;
const TSV_PATH  = path.join(ROOT, 'abbott-smith.tsv');
const LEX_PATH  = path.join(ROOT, 'lexicon', 'lexicon-lite.json');

function main() {
    const tsvText = fs.readFileSync(TSV_PATH, 'utf8');
    const lines = tsvText.split(/\r?\n/);

    /* strong（数字のみ）-> description_ja のマップを構築 */
    const tsvMap = new Map();
    for (let i = 1; i < lines.length; i++) { // 0行目はヘッダー
        const line = lines[i];
        if (!line.trim()) continue;
        const cols = line.split('\t');
        if (cols.length < 4) continue;
        const strong = cols[0].trim();
        const descJa = cols[3].trim();
        if (strong) tsvMap.set(strong, descJa);
    }
    console.log(`[INFO] abbott-smith.tsv: ${tsvMap.size} 件のstrong番号を読み込み`);

    const lexData = JSON.parse(fs.readFileSync(LEX_PATH, 'utf8'));

    let updated = 0;
    const notFound = [];
    for (const [key, entry] of Object.entries(lexData)) {
        if (!('abbottSmith' in entry)) continue; // 元々フィールドを持たないものは対象外
        const strongRaw = entry.strong || '';
        const digits = strongRaw.startsWith('G') ? strongRaw.slice(1) : strongRaw;
        if (tsvMap.has(digits)) {
            entry.abbottSmith = tsvMap.get(digits);
            updated++;
        } else {
            notFound.push(`${key} (${strongRaw})`);
        }
    }

    fs.writeFileSync(LEX_PATH, JSON.stringify(lexData));

    console.log(`[OK] 更新件数: ${updated}`);
    if (notFound.length > 0) {
        console.warn(`[WARN] TSVに対応行が無く未更新のまま: ${notFound.length}件`);
        console.warn(`       ${notFound.slice(0, 10).join(', ')}${notFound.length > 10 ? ' ...' : ''}`);
    }
}

main();
