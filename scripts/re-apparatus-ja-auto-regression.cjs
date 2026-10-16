#!/usr/bin/env node
/**
 * re-apparatus-ja-auto-regression.cjs — apparatus-ja-auto.json 静的回帰テスト
 *
 * 検証対象: public/assets/data/apparatus-ja-auto.json
 *
 * invariant:
 *  1. ファイルが存在し JSON として valid
 *  2. _meta 必須フィールドを持つ（version/phase/entryCount/policy/generatedAt）
 *  3. _meta.entryCount が実エントリ数と一致
 *  4. 自動生成 ID と apparatus-ja.json（人手確認）の ID が重複しない
 *  5. 全 ID が apparatus.json に存在する
 *  6. エントリ件数のベースライン（2418件）と一致
 *  7. 全エントリの status が '自動生成'
 *  8. 全エントリの tag が ['添加','省略'] のいずれか
 *  9. tag='添加' のエントリは ja が全角 ＋ で始まる
 * 10. tag='省略' のエントリは ja に 'の省略' を含む
 * 11. 両方エントリ（1TI-0014）が添加タグ・複合 ja で存在する
 * 12. 保留 ID（MAT-0353, LUK-0985）が自動生成ファイルに含まれない
 * 13. _meta.truncatedLemCount が 14 と一致する（カテゴリB: lemText > 25字）
 * 14. スポットチェック: MAT-0244（カテゴリB — '長文lem' ラベルあり）
 * 15. スポットチェック: MAT-0028（短 lemText — '長文lem' ラベルなし）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const AUTO_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');

const EXPECTED_ENTRY_COUNT = 2418;
const ALLOWED_TAGS         = new Set(['添加', '省略']);

let failed = 0;
const results = [];

function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

// ── ファイル読み込み ───────────────────────────────────────────────
check('AUTO_FILE_EXISTS', fs.existsSync(AUTO_PATH), AUTO_PATH);

let autoData, manualData, baseData;

try {
    autoData = JSON.parse(fs.readFileSync(AUTO_PATH, 'utf8'));
} catch (e) {
    check('AUTO_PARSE', false, e.message);
    process.exit(1);
}
check('AUTO_PARSE', true);

try {
    manualData = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
} catch (e) {
    check('MANUAL_PARSE', false, e.message);
    process.exit(1);
}

try {
    baseData = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
} catch (e) {
    check('BASE_PARSE', false, e.message);
    process.exit(1);
}

const entries   = autoData.entries || {};
const autoIds   = Object.keys(entries);
const manualIds = new Set(Object.keys(manualData.entries || {}));
const baseById  = {};
baseData.entries.forEach(e => { baseById[e.id] = e; });

// ── 1. _meta 必須フィールド ──
const meta = autoData._meta || {};
check('META_VERSION',     meta.version    === '1.0.0',   `got: ${meta.version}`);
check('META_PHASE',       meta.phase      === 1,          `got: ${meta.phase}`);
check('META_ENTRY_COUNT', typeof meta.entryCount === 'number', 'entryCount missing');
check('META_POLICY',      typeof meta.policy === 'string' && meta.policy.includes('L-0'), `got: ${meta.policy}`);
check('META_GENERATED_AT',typeof meta.generatedAt === 'string' && meta.generatedAt.length >= 10);

// ── 2. _meta.entryCount と実エントリ数の一致 ──
check('ENTRY_COUNT_META_MATCH',
    meta.entryCount === autoIds.length,
    `meta: ${meta.entryCount}, actual: ${autoIds.length}`
);

// ── 3. 人手確認ファイルとの ID 重複なし ──
const overlap = autoIds.filter(id => manualIds.has(id));
check('NO_MANUAL_OVERLAP',
    overlap.length === 0,
    `overlap: ${overlap.slice(0, 5).join(', ')}`
);

// ── 4. 全 ID が apparatus.json に存在 ──
let missingId = '';
for (const id of autoIds) {
    if (!baseById[id]) { missingId = id; break; }
}
check('ALL_IDS_IN_BASE', !missingId, `missing: ${missingId}`);

// ── 5. ベースライン件数 ──
check('ENTRY_COUNT_BASELINE',
    autoIds.length === EXPECTED_ENTRY_COUNT,
    `expected: ${EXPECTED_ENTRY_COUNT}, got: ${autoIds.length}`
);

// ── 6. 全エントリ status = '自動生成' ──
let badStatus = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.status !== '自動生成') { badStatus = `${id}: '${e.status}'`; break; }
}
check('ALL_STATUS_AUTO', !badStatus, badStatus);

// ── 7. 全エントリ tag が許可リスト内 ──
let badTag = '';
for (const [id, e] of Object.entries(entries)) {
    if (!ALLOWED_TAGS.has(e.tag)) { badTag = `${id}: '${e.tag}'`; break; }
}
check('TAG_ALLOWED', !badTag, badTag);

// ── 8. 全エントリ ja が非空文字列 ──
let emptyJa = '';
for (const [id, e] of Object.entries(entries)) {
    if (typeof e.ja !== 'string' || e.ja.trim() === '') { emptyJa = id; break; }
}
check('JA_NONEMPTY', !emptyJa, `empty ja: ${emptyJa}`);

// ── 9. tag=添加 → ja が全角 ＋ で始まる ──
let badAddFormat = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.tag === '添加' && !e.ja.startsWith('＋')) { badAddFormat = `${id}: '${e.ja.slice(0, 40)}'`; break; }
}
check('ADDITION_FORMAT_PLUS_PREFIX', !badAddFormat, badAddFormat);

// ── 10. tag=省略 → ja に 'の省略' を含む ──
let badOmitFormat = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.tag === '省略' && !e.ja.includes('の省略')) { badOmitFormat = `${id}: '${e.ja.slice(0, 40)}'`; break; }
}
check('OMISSION_FORMAT_NO_OMISSION', !badOmitFormat, badOmitFormat);

// ── 11. 両方エントリ（1TI-0014）の検証 ──
const both = entries['1TI-0014'];
check('BOTH_ENTRY_EXISTS',    !!both,                                  '1TI-0014 not found');
check('BOTH_ENTRY_TAG',       both && both.tag === '添加',             `tag: ${both && both.tag}`);
check('BOTH_ENTRY_JA_PLUS',   both && both.ja.startsWith('＋'),        `ja: ${both && both.ja.slice(0, 40)}`);
check('BOTH_ENTRY_JA_OMIT',   both && both.ja.includes('の省略'),      `ja: ${both && both.ja.slice(0, 40)}`);

// ── 12. 保留 ID が自動生成ファイルに含まれない ──
check('PENDING_MAT0353_ABSENT', !entries['MAT-0353'], 'MAT-0353 found in auto file');
check('PENDING_LUK0985_ABSENT', !entries['LUK-0985'], 'LUK-0985 found in auto file');

// ── スポットチェック ──
// MAT-0097: 複数の + reading がある代表エントリ
const m97 = entries['MAT-0097'];
check('SPOT_MAT0097_EXISTS', !!m97, 'MAT-0097 not found');
check('SPOT_MAT0097_TAG',    m97 && m97.tag === '添加',                 `tag: ${m97 && m97.tag}`);
check('SPOT_MAT0097_MULTI',  m97 && m97.ja.includes('／'),             `ja: ${m97 && m97.ja.slice(0,60)}`);

// MAT-0068: 長文添加（> 30 chars）の切り詰め確認
const m68 = entries['MAT-0068'];
check('SPOT_MAT0068_EXISTS', !!m68, 'MAT-0068 not found');
check('SPOT_MAT0068_TRUNC',  m68 && m68.ja.includes('…') && m68.ja.includes('長文'),
    `ja: ${m68 && m68.ja.slice(0, 60)}`);

// ── 13. _meta.truncatedLemCount ──
check('META_TRUNCATED_LEM_COUNT',
    meta.truncatedLemCount === 14,
    `expected: 14, got: ${meta.truncatedLemCount}`
);

// ── 14. スポットチェック: MAT-0244（カテゴリB — 長文lem ラベルあり）──
const m244 = entries['MAT-0244'];
check('SPOT_MAT0244_EXISTS', !!m244, 'MAT-0244 not found');
check('SPOT_MAT0244_LONGLEM',
    m244 && m244.ja.includes('・長文lem）') && m244.ja.includes('… の省略'),
    `ja: ${m244 && m244.ja.slice(0, 60)}`
);

// ── 15. スポットチェック: MAT-0028（短 lemText — 長文lem ラベルなし）──
const m28 = entries['MAT-0028'];
check('SPOT_MAT0028_EXISTS', !!m28, 'MAT-0028 not found');
check('SPOT_MAT0028_NO_LONGLEM',
    m28 && m28.ja.includes('の省略') && !m28.ja.includes('長文lem'),
    `ja: ${m28 && m28.ja.slice(0, 60)}`
);

// ── 結果出力 ─────────────────────────────────────────────────────
console.log('\n=== re-apparatus-ja-auto-regression ===');
for (const [status, name] of results) {
    if (status === 'FAIL') console.log(`  FAIL: ${name}`);
}
const passed = results.filter(r => r[0] === 'PASS').length;
console.log(`\n${passed}/${results.length} checks passed`);

if (failed > 0) {
    console.log(`\nFAILED: ${failed} check(s)`);
    process.exit(1);
} else {
    console.log('\nPASS');
}
