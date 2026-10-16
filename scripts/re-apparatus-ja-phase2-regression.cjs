#!/usr/bin/env node
/**
 * re-apparatus-ja-phase2-regression.cjs — apparatus-ja-phase2.json 静的回帰テスト
 *
 * 検証対象: public/assets/data/apparatus-ja-phase2.json
 *
 * invariant:
 *  1. ファイルが存在し JSON として valid
 *  2. _meta 必須フィールドを持つ（version/phase/entryCount/policy/generatedAt）
 *  3. _meta.entryCount が実エントリ数と一致
 *  4. Phase 2 ID と apparatus-ja.json（人手確認）の ID が重複しない
 *  5. Phase 2 ID と apparatus-ja-auto.json（Phase 1）の ID が重複しない
 *  6. 全 ID が apparatus.json に存在する
 *  7. エントリ件数のベースライン（2796件）と一致
 *  8. 全エントリの status が '自動生成'
 *  9. 全エントリの tag が '読み差'
 * 10. 全エントリの autoPhase が 2
 * 11. 全エントリの ja が非空文字列で （） を含む形式
 * 12. 長文除外 ID（9件）が Phase 2 に含まれない
 * 13. スポットチェック: MAT-0007（γένεσις / γέννησις の2読み形式）
 * 14. スポットチェック: MAT-0101（3読み形式）
 * 15. _meta の excludedLongText が 9 件
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const P2_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase2.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const P1_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');
const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');

const EXPECTED_ENTRY_COUNT  = 2796;
const EXPECTED_LONG_EXCLUDE = 9;
const LONG_EXCLUDED_IDS     = [
    'MAT-0816', 'MRK-0745', 'LUK-0427', 'LUK-0428', 'LUK-0463',
    'JHN-0259', 'ACT-0808', 'ACT-1012', 'ROM-0229',
];

let failed = 0;
const results = [];

function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

// ── ファイル読み込み ───────────────────────────────────────────────
check('P2_FILE_EXISTS', fs.existsSync(P2_PATH), P2_PATH);

let p2Data, manualData, p1Data, baseData;

try {
    p2Data = JSON.parse(fs.readFileSync(P2_PATH, 'utf8'));
} catch (e) {
    check('P2_PARSE', false, e.message);
    process.exit(1);
}
check('P2_PARSE', true);

try { manualData = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8')); } catch (e) { check('MANUAL_PARSE', false, e.message); process.exit(1); }
try { p1Data     = JSON.parse(fs.readFileSync(P1_PATH, 'utf8'));     } catch (e) { check('P1_PARSE', false, e.message);     process.exit(1); }
try { baseData   = JSON.parse(fs.readFileSync(BASE_PATH, 'utf8'));   } catch (e) { check('BASE_PARSE', false, e.message);   process.exit(1); }

const entries   = p2Data.entries || {};
const p2Ids     = Object.keys(entries);
const manualIds = new Set(Object.keys(manualData.entries || {}));
const p1Ids     = new Set(Object.keys(p1Data.entries || {}));
const baseById  = {};
baseData.entries.forEach(e => { baseById[e.id] = e; });

// ── 1. _meta 必須フィールド ──
const meta = p2Data._meta || {};
check('META_VERSION',     meta.version    === '1.0.0',  `got: ${meta.version}`);
check('META_PHASE',       meta.phase      === 2,         `got: ${meta.phase}`);
check('META_ENTRY_COUNT', typeof meta.entryCount === 'number', 'entryCount missing');
check('META_POLICY',      typeof meta.policy === 'string' && meta.policy.includes('L-0'), `got: ${meta.policy}`);
check('META_GENERATED_AT',typeof meta.generatedAt === 'string' && meta.generatedAt.length >= 10);

// ── 2. _meta.entryCount と実エントリ数の一致 ──
check('ENTRY_COUNT_META_MATCH',
    meta.entryCount === p2Ids.length,
    `meta: ${meta.entryCount}, actual: ${p2Ids.length}`
);

// ── 3. 人手確認ファイルとの ID 重複なし ──
const manOverlap = p2Ids.filter(id => manualIds.has(id));
check('NO_MANUAL_OVERLAP',
    manOverlap.length === 0,
    `overlap: ${manOverlap.slice(0, 5).join(', ')}`
);

// ── 4. Phase 1 ファイルとの ID 重複なし ──
const p1Overlap = p2Ids.filter(id => p1Ids.has(id));
check('NO_PHASE1_OVERLAP',
    p1Overlap.length === 0,
    `overlap: ${p1Overlap.slice(0, 5).join(', ')}`
);

// ── 5. 全 ID が apparatus.json に存在 ──
let missingId = '';
for (const id of p2Ids) {
    if (!baseById[id]) { missingId = id; break; }
}
check('ALL_IDS_IN_BASE', !missingId, `missing: ${missingId}`);

// ── 6. ベースライン件数 ──
check('ENTRY_COUNT_BASELINE',
    p2Ids.length === EXPECTED_ENTRY_COUNT,
    `expected: ${EXPECTED_ENTRY_COUNT}, got: ${p2Ids.length}`
);

// ── 7. 全エントリ status = '自動生成' ──
let badStatus = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.status !== '自動生成') { badStatus = `${id}: '${e.status}'`; break; }
}
check('ALL_STATUS_AUTO', !badStatus, badStatus);

// ── 8. 全エントリ tag = '読み差' ──
let badTag = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.tag !== '読み差') { badTag = `${id}: '${e.tag}'`; break; }
}
check('ALL_TAG_YOMISA', !badTag, badTag);

// ── 9. 全エントリ autoPhase = 2 ──
let badPhase = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.autoPhase !== 2) { badPhase = `${id}: ${e.autoPhase}`; break; }
}
check('ALL_AUTOPHASE_2', !badPhase, badPhase);

// ── 10. 全エントリ ja が非空・（）形式 ──
let emptyJa = '';
for (const [id, e] of Object.entries(entries)) {
    if (typeof e.ja !== 'string' || e.ja.trim() === '') { emptyJa = id; break; }
}
check('JA_NONEMPTY', !emptyJa, `empty ja: ${emptyJa}`);

let badFormat = '';
for (const [id, e] of Object.entries(entries)) {
    if (!e.ja.includes('（') || !e.ja.includes('）')) { badFormat = `${id}: '${e.ja.slice(0, 40)}'`; break; }
}
check('JA_FORMAT_BRACKETS', !badFormat, badFormat);

// ── 11. 長文除外 ID が存在しない ──
const foundLong = LONG_EXCLUDED_IDS.filter(id => !!entries[id]);
check('LONG_IDS_EXCLUDED',
    foundLong.length === 0,
    `found: ${foundLong.join(', ')}`
);

// ── 12. _meta.excludedLongText = 9 ──
check('META_EXCLUDED_LONG_COUNT',
    meta.excludedLongText === EXPECTED_LONG_EXCLUDE,
    `expected: ${EXPECTED_LONG_EXCLUDE}, got: ${meta.excludedLongText}`
);

// ── 13. スポットチェック: MAT-0007（2読み形式）──
const m07 = entries['MAT-0007'];
check('SPOT_MAT0007_EXISTS',  !!m07,                                             'MAT-0007 not found');
check('SPOT_MAT0007_TAG',     m07 && m07.tag === '読み差',                       `tag: ${m07 && m07.tag}`);
check('SPOT_MAT0007_FORMAT',
    m07 && m07.ja.includes('γένεσις') && m07.ja.includes('γέννησις') && m07.ja.includes('・'),
    `ja: ${m07 && m07.ja}`
);

// ── 14. スポットチェック: MAT-0101（3読み形式）──
const m101 = entries['MAT-0101'];
check('SPOT_MAT0101_EXISTS', !!m101,                                              'MAT-0101 not found');
check('SPOT_MAT0101_3_PARTS',
    m101 && m101.ja.split('・').length >= 3,
    `parts: ${m101 && m101.ja.split('・').length}`
);

// ── 結果出力 ─────────────────────────────────────────────────────
console.log('\n=== re-apparatus-ja-phase2-regression ===');
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
