#!/usr/bin/env node
/**
 * build-apparatus-ja-auto.cjs
 *
 * Phase 1 自動生成: 添加（+ プレフィックス）・省略（isOmission=true）エントリの
 * 日本語事実説明を apparatus.json から生成する。
 *
 * 出力: public/assets/data/apparatus-ja-auto.json
 *
 * 制約:
 *   - L-0: 翻訳・推論・語義選択なし。witnesses名・追加テキスト・lemText の機械的事実のみ。
 *   - apparatus-ja.json の既存30件（人手確認済み・保留）は生成対象外。
 *   - verseRange=true エントリは除外。
 *   - ASCII '+' プレフィックスはユーザー向けテキストに含めない（全角 ＋ に変換）。
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const LEM_JA_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-lem-ja.json');
const OUT_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');

const MAX_ADDED_LEN = 30;
const MAX_LEM_LEN   = 25;

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const lemJa = JSON.parse(fs.readFileSync(LEM_JA_PATH, 'utf8')).entries || {};
// 出典・語形を確認した添加語の日本語ラベル。未登録語は原語のまま残す（L-0）。
const addedJa = { 'εὑρηκέναι': '見つける' };

const manualIds = new Set(Object.keys(manual.entries));

/** 添加テキストを1ユニット分フォーマット */
function formatAdded(addedText, witnesses) {
    const witStr = witnesses.join(' ');
    if (addedText.length > MAX_ADDED_LEN) {
        const head = addedText.slice(0, 20);
        const tail = addedText.slice(-4);
        return `＋${head}…${tail}（${witStr}・長文）`;
    }
    return `＋${addedText}（${witStr}）`;
}

/** エントリの {tag, ja, status, autoPhase} を生成。対象外なら null を返す。 */
function generateEntry(e) {
    const plusRdgs = e.readings.filter(r => r.text.startsWith('+'));
    const omitRdgs = e.readings.filter(r => r.isOmission);

    if (plusRdgs.length === 0 && omitRdgs.length === 0) return null;

    const parts = [];

    // 添加パート（先に記述: tag=添加 のとき ja が ＋ で始まることを保証）
    if (plusRdgs.length > 0) {
        const groups = new Map();
        for (const r of plusRdgs) {
            const added = r.text.slice(1).trim();
            if (!groups.has(added)) groups.set(added, []);
            groups.get(added).push(...r.witnesses);
        }
        for (const [added, wits] of groups) {
            parts.push(formatAdded(added, wits));
        }
    }

    // 省略パート（添加との複合エントリでは後に記述）
    if (omitRdgs.length > 0) {
        const wits = omitRdgs.flatMap(r => r.witnesses);
        let lem = e.lemText;
        let lemTruncated = false;
        if (lem.length > MAX_LEM_LEN) {
            lem = lem.slice(0, 20) + '…';
            lemTruncated = true;
        }
        // lemTruncated=true: 生成処理による切り詰め（元データの省略記号ではない）を明示
        const jaLem = lemJa[e.id];
        const lemmaLabel = jaLem ? `${jaLem}（${lem}）` : lem;
        parts.push(`${lemmaLabel} の省略（${wits.join(' ')}${lemTruncated ? '・長文lem' : ''}）`);
    }

    const tag = plusRdgs.length > 0 ? '添加' : '省略';
    return { tag, ja: parts.join('／'), status: '自動生成', autoPhase: 1 };
}

// ── 生成 ──────────────────────────────────────────────────────────────
const outEntries = {};
let additionCount = 0;
let omissionCount = 0;
let bothCount     = 0;

for (const e of base.entries) {
    if (e.verseRange)       continue;
    if (manualIds.has(e.id)) continue;

    const result = generateEntry(e);
    if (!result) continue;

    outEntries[e.id] = result;

    const hasPlus = e.readings.some(r => r.text.startsWith('+'));
    const hasOmit = e.readings.some(r => r.isOmission);
    if (hasPlus && hasOmit) bothCount++;
    else if (hasPlus)       additionCount++;
    else                    omissionCount++;
}

const entryCount = Object.keys(outEntries).length;
// lemText が MAX_LEM_LEN を超えて切り詰められた省略エントリ数（カテゴリB: 14件）
const truncatedLemCount = Object.values(outEntries)
    .filter(e => e.ja.includes('・長文lem）')).length;

const out = {
    _meta: {
        version:          '1.0.0',
        phase:            1,
        entryCount,
        additionCount,
        omissionCount,
        bothCount,
        truncatedLemCount,
        generatedAt:      new Date().toISOString().slice(0, 10),
        description:      'Phase 1 自動生成: 添加（+プレフィックス）・省略（isOmission=true）エントリの日本語事実説明',
        policy:           'L-0準拠。機械的事実（witnesses名・追加テキスト・lemText）のみ。人手確認未実施。',
        generator:        'scripts/build-apparatus-ja-auto.cjs',
        excludedManual:   manualIds.size,
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log(`apparatus-ja-auto.json 生成完了: ${entryCount} エントリ`);
console.log(`  添加専用: ${additionCount}, 省略専用: ${omissionCount}, 両方: ${bothCount}`);
console.log(`  lemText 切り詰め（長文lem）: ${truncatedLemCount} 件`);
console.log(`  手動除外: ${manualIds.size} 件`);
console.log(`  出力先: ${OUT_PATH}`);
