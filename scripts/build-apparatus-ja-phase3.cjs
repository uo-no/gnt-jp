#!/usr/bin/env node
/**
 * build-apparatus-ja-phase3.cjs
 *
 * Phase 3 自動生成: tokenRefStatus が phrase / elision / case の読み差記述。
 * 各読みのテキストと証拠者を中立的に提示する。
 *
 * 出力: public/assets/data/apparatus-ja-phase3.json
 *
 * 生成条件（全条件 AND）:
 *   - tokenRefStatus ∈ { 'phrase', 'elision', 'case' }
 *   - verseRange = false
 *   - readings.length >= 2
 *   - 全読みテキストが MAX_TEXT_LEN 字以内
 *   - 全読みテキストに '…' を含まない（元データの省略表示）
 *   - 全読みの証人が全て 'WHspur' を含むわけではない（全読みが WHspur のみの疑本文エントリを除外）
 *   - apparatus-ja.json / apparatus-ja-auto.json / apparatus-ja-phase2.json に未登録のID
 *
 * 制約（L-0）:
 *   - 語形・語義・語順・差異の種類を断定しない
 *   - tokenRefStatus は差異の言語学的性質を保証しない
 *   - 文字列と証拠者の事実のみを提示する
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const P1_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');
const P2_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase2.json');
const OUT_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase3.json');

const MAX_TEXT_LEN     = 30;
const TARGET_STATUSES  = new Set(['phrase', 'elision', 'case']);

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const p1     = JSON.parse(fs.readFileSync(P1_PATH,     'utf8'));
const p2     = JSON.parse(fs.readFileSync(P2_PATH,     'utf8'));

const manualIds = new Set(Object.keys(manual.entries));
const p1Ids     = new Set(Object.keys(p1.entries));
const p2Ids     = new Set(Object.keys(p2.entries));
const coveredIds = new Set([...manualIds, ...p1Ids, ...p2Ids]);

// 除外理由カウンタ（排他的: 最初に一致した理由で計上）
const excluded = {
    covered:    0,
    verseRange: 0,
    oneReading: 0,
    whspur:     0,
    ellipsis:   0,
    longText:   0,
};
const excludedIds = {
    oneReading: [],
    whspur:     [],
    ellipsis:   [],
    longText:   [],
};

const outEntries = {};
const countByTrs = { phrase: 0, elision: 0, case: 0 };

for (const e of base.entries) {
    if (!TARGET_STATUSES.has(e.tokenRefStatus)) continue;

    if (e.verseRange) {
        excluded.verseRange++;
        continue;
    }
    if (coveredIds.has(e.id)) {
        excluded.covered++;
        continue;
    }

    const rdgs = e.readings;

    // 1-reading（WHspur 疑本文など）
    if (rdgs.length < 2) {
        excluded.oneReading++;
        excludedIds.oneReading.push(e.id);
        continue;
    }
    // 全読みが WHspur を含む場合のみ除外（単一読みの疑本文マーカーエントリ相当）
    // some → every: 一部の読みだけ WHspur を持つ 2-reading エントリ（MRK-0923 等）は生成対象とする
    // 根拠: Task 34 監査で Group A（every）= 0件、Group B（some && !every）= 5件のみと確認
    if (rdgs.every(r => r.witnesses.includes('WHspur'))) {
        excluded.whspur++;
        excludedIds.whspur.push(e.id);
        continue;
    }
    // 元データの '…'（省略表示）
    if (rdgs.some(r => r.text.includes('…'))) {
        excluded.ellipsis++;
        excludedIds.ellipsis.push(e.id);
        continue;
    }
    // 長文（> MAX_TEXT_LEN 字）
    if (rdgs.some(r => r.text.length > MAX_TEXT_LEN)) {
        excluded.longText++;
        excludedIds.longText.push(e.id);
        continue;
    }

    // ja 生成: TEXT（WITNESSES）・TEXT（WITNESSES）...
    const parts = rdgs.map(r => r.text + '（' + r.witnesses.join(' ') + '）');
    const ja    = parts.join('・');

    outEntries[e.id] = {
        tag:       '読み差',
        ja,
        status:    '自動生成',
        autoPhase: 3,
    };
    countByTrs[e.tokenRefStatus]++;
}

const entryCount = Object.keys(outEntries).length;

const out = {
    _meta: {
        version:           '1.0.0',
        phase:             3,
        entryCount,
        generatedAt:       new Date().toISOString().slice(0, 10),
        description:       'Phase 3 自動生成: phrase・elision・case の読み差記述',
        policy:            'L-0準拠。読み文字列と証拠者の事実のみ。差異種別・語形・語義の断定なし。tokenRefStatus は差異の言語学的性質を保証しない。',
        generator:         'scripts/build-apparatus-ja-phase3.cjs',
        excludedManual:    manualIds.size,
        excludedPhase1:    p1Ids.size,
        excludedPhase2:    p2Ids.size,
        excludedVerseRange:excluded.verseRange,
        excludedCovered:   excluded.covered,
        excludedOneReading:excluded.oneReading,
        excludedOneReadingIds: excludedIds.oneReading,
        excludedWHspur:    excluded.whspur,
        excludedWHspurIds: excludedIds.whspur,
        excludedEllipsis:  excluded.ellipsis,
        excludedEllipsisIds: excludedIds.ellipsis.slice(0, 10),
        excludedLongText:  excluded.longText,
        excludedLongTextIds: excludedIds.longText,
        maxTextLength:     MAX_TEXT_LEN,
        phraseCount:       countByTrs.phrase,
        elisionCount:      countByTrs.elision,
        caseCount:         countByTrs.case,
        targetStatuses:    [...TARGET_STATUSES],
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log('apparatus-ja-phase3.json 生成完了: ' + entryCount + ' エントリ');
console.log('  phrase:', countByTrs.phrase,
    '  elision:', countByTrs.elision,
    '  case:', countByTrs.case);
console.log('  除外 — covered:', excluded.covered,
    '  1-reading:', excluded.oneReading,
    '  WHspur:', excluded.whspur,
    '  …:', excluded.ellipsis,
    '  長文:', excluded.longText);
console.log('  出力先:', OUT_PATH);
