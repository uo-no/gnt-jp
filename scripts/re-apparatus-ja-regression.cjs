#!/usr/bin/env node
/**
 * re-apparatus-ja-regression.cjs — apparatus-ja.json 静的回帰テスト
 *
 * 検証対象: public/assets/data/apparatus-ja.json
 *
 * invariant:
 *  1. JSON が valid で必須フィールドを持つ
 *  2. 全 ID が apparatus.json に存在する
 *  3. tag が許可リスト（7種）に含まれる
 *  4. status が許可値（3種）に含まれる
 *  5. エントリ件数が 30
 *  6. status='確認済み' の件数が 28、'保留' が 2
 *  7. status='保留' のエントリが MAT-0353 と LUK-0985 であること
 *  8. MAT-0013 が '節構造差'（「追加（PLUS）」修正の確認）
 *  9. ja が空文字でない（確認済みエントリのみ）
 * 10. note フィールドは任意（存在しなくても PASS）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const JA_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const BASE_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');

const ALLOWED_TAGS    = new Set(['形態差','語彙差','語順差','添加','省略','表記差','節構造差']);
const ALLOWED_STATUSES = new Set(['確認済み','要確認','保留']);

let failed = 0;
const results = [];
function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

// ── ファイル読み込み ───────────────────────────────────────────────
check('JA_FILE_EXISTS', fs.existsSync(JA_PATH), JA_PATH);

let jaData, baseData;
try {
    jaData = JSON.parse(fs.readFileSync(JA_PATH, 'utf8'));
} catch (e) {
    check('JA_PARSE', false, e.message);
    process.exit(1);
}
check('JA_PARSE', true);
check('JA_HAS_ENTRIES',  jaData && typeof jaData.entries === 'object');
check('JA_HAS_META',     jaData && typeof jaData._meta === 'object');

check('BASE_FILE_EXISTS', fs.existsSync(BASE_PATH), BASE_PATH);
try {
    baseData = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));
} catch (e) {
    check('BASE_PARSE', false, e.message);
    process.exit(1);
}
check('BASE_PARSE', true);

const entries = jaData.entries;
const baseById = {};
baseData.entries.forEach(e => { baseById[e.id] = e; });

const ids = Object.keys(entries);

// 1. 件数
check('ENTRY_COUNT_30', ids.length === 30, `got ${ids.length}`);

// 2. 全 ID が apparatus.json に存在
let missingId = '';
for (const id of ids) {
    if (!baseById[id]) { missingId = id; break; }
}
check('ALL_IDS_IN_BASE', !missingId, `missing: ${missingId}`);

// 3. tag が許可リストに含まれる
let badTag = '';
for (const [id, e] of Object.entries(entries)) {
    if (!ALLOWED_TAGS.has(e.tag)) { badTag = `${id}: '${e.tag}'`; break; }
}
check('TAG_ALLOWED', !badTag, badTag);

// 4. status が許可値に含まれる
let badStatus = '';
for (const [id, e] of Object.entries(entries)) {
    if (!ALLOWED_STATUSES.has(e.status)) { badStatus = `${id}: '${e.status}'`; break; }
}
check('STATUS_ALLOWED', !badStatus, badStatus);

// 5. 確認済み=28、保留=2
const confirmedIds = ids.filter(id => entries[id].status === '確認済み');
const holdIds      = ids.filter(id => entries[id].status === '保留');
check('CONFIRMED_COUNT_28', confirmedIds.length === 28, `got ${confirmedIds.length}`);
check('HOLD_COUNT_2',       holdIds.length === 2,       `got ${holdIds.length}`);

// 6. 保留エントリが MAT-0353 と LUK-0985
check('HOLD_MAT0353', holdIds.includes('MAT-0353'),  `hold: ${JSON.stringify(holdIds)}`);
check('HOLD_LUK0985', holdIds.includes('LUK-0985'),  `hold: ${JSON.stringify(holdIds)}`);

// 7. MAT-0013 が '節構造差'（PLUS 誤分類の修正確認）
check('MAT0013_TAG_CORRECT',
    entries['MAT-0013'] && entries['MAT-0013'].tag === '節構造差',
    `got: ${entries['MAT-0013'] && entries['MAT-0013'].tag}`
);

// 8. 確認済みエントリの ja が空文字でない
let emptyJa = '';
for (const id of confirmedIds) {
    if (!entries[id].ja || entries[id].ja.trim() === '') { emptyJa = id; break; }
}
check('CONFIRMED_JA_NONEMPTY', !emptyJa, `empty ja: ${emptyJa}`);

// 9. tag と ja が文字列（全エントリ）
let badField = '';
for (const [id, e] of Object.entries(entries)) {
    if (typeof e.tag !== 'string' || typeof e.ja !== 'string' || typeof e.status !== 'string') {
        badField = id; break;
    }
}
check('FIELD_TYPES', !badField, `bad types: ${badField}`);

// 10. _meta 必須フィールド
check('META_VERSION',    jaData._meta.version    === '1.0.0');
check('META_TAGS',       Array.isArray(jaData._meta.tags) && jaData._meta.tags.length === 7);
check('META_POLICY',     typeof jaData._meta.policy === 'string' && jaData._meta.policy.includes('L-0'));
check('META_ENTRY_COUNT', jaData._meta.entryCount === 30);
check('META_DISPLAYABLE', jaData._meta.displayableCount === 28);

// ── 結果出力 ─────────────────────────────────────────────────────
console.log('\n=== re-apparatus-ja-regression ===');
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
