#!/usr/bin/env node
/**
 * re-apparatus-ja-phase3-regression.cjs — apparatus-ja-phase3.json 静的回帰テスト
 *
 * 検証対象: public/assets/data/apparatus-ja-phase3.json
 *
 * invariant:
 *  1. ファイルが存在し JSON として valid
 *  2. _meta 必須フィールドを持つ（version/phase/entryCount/policy/generatedAt）
 *  3. _meta.entryCount が実エントリ数と一致
 *  4. _meta.phraseCount + _meta.elisionCount + _meta.caseCount === entryCount
 *  5. Phase 3 ID と apparatus-ja.json（人手確認）の ID が重複しない
 *  6. Phase 3 ID と apparatus-ja-auto.json（Phase 1）の ID が重複しない
 *  7. Phase 3 ID と apparatus-ja-phase2.json（Phase 2）の ID が重複しない
 *  8. 全 ID が apparatus.json に存在する
 *  9. エントリ件数のベースライン（1512件）と一致
 * 10. 全エントリの status が '自動生成'
 * 11. 全エントリの tag が '読み差'
 * 12. 全エントリの autoPhase が 3
 * 13. 全エントリの ja が非空文字列で （） を含む形式
 * 14. 全エントリの ja が '…' を含まない（除外条件の確認）
 * 15. 除外 ID（WHspur 1-reading 6件）が Phase 3 に含まれない
 * 16. スポットチェック: MAT-0024（phrase 語順差の代表）
 * 17. スポットチェック: MAT-0021（elision 代表）
 * 18. スポットチェック: MAT-0096（case 代表）
 * 19. スポットチェック: LUK-1050（WHspur 1-reading — 除外されていること）
 * 20. スポットチェック: MRK-0923（WHspur 2-reading — 生成されること）
 * 21. スポットチェック: MRK-0926（WHspur 2-reading — 生成されること）
 * 22. スポットチェック: LUK-0962（WHspur 2-reading — 生成されること）
 * 23. スポットチェック: LUK-0986（WHspur 2-reading — 生成されること）
 * 24. スポットチェック: LUK-0987（WHspur 2-reading — 生成されること）
 * 25. 証人-読み対応サンプル確認（100件）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const P3_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase3.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
const P1_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-auto.json');
const P2_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja-phase2.json');
const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');

const EXPECTED_ENTRY_COUNT  = 1512;
const EXPECTED_PHRASE_COUNT = 1429;
const EXPECTED_ELISION_COUNT = 68;
const EXPECTED_CASE_COUNT   = 15;

// WHspur 1-reading エントリ（oneReading フィルタで除外されているべき ID）
const WHSPUR_EXCLUDED_IDS = [
    'LUK-1050', 'LUK-1094', 'LUK-1099', 'LUK-1124', 'LUK-1139', 'LUK-1140',
];

// WHspur 2-reading エントリ（Task 35 で生成対象となった ID）
const WHSPUR_GENERATED_IDS = [
    'MRK-0923', 'MRK-0926', 'LUK-0962', 'LUK-0986', 'LUK-0987',
];

let failed = 0;
const results = [];

function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

// ── ファイル読み込み ───────────────────────────────────────────────
check('P3_FILE_EXISTS', fs.existsSync(P3_PATH), P3_PATH);

let p3Data, manualData, p1Data, p2Data, baseData;

try { p3Data     = JSON.parse(fs.readFileSync(P3_PATH,     'utf8')); } catch (e) { check('P3_PARSE', false, e.message); process.exit(1); }
check('P3_PARSE', true);
try { manualData = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8')); } catch (e) { check('MANUAL_PARSE', false, e.message); process.exit(1); }
try { p1Data     = JSON.parse(fs.readFileSync(P1_PATH,     'utf8')); } catch (e) { check('P1_PARSE', false, e.message);     process.exit(1); }
try { p2Data     = JSON.parse(fs.readFileSync(P2_PATH,     'utf8')); } catch (e) { check('P2_PARSE', false, e.message);     process.exit(1); }
try { baseData   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8')); } catch (e) { check('BASE_PARSE', false, e.message);   process.exit(1); }

const entries   = p3Data.entries || {};
const p3Ids     = Object.keys(entries);
const manualIds = new Set(Object.keys(manualData.entries || {}));
const p1Ids     = new Set(Object.keys(p1Data.entries     || {}));
const p2Ids     = new Set(Object.keys(p2Data.entries     || {}));
const baseById  = {};
baseData.entries.forEach(e => { baseById[e.id] = e; });

// ── 1. _meta 必須フィールド ──
const meta = p3Data._meta || {};
check('META_VERSION',     meta.version    === '1.0.0',  `got: ${meta.version}`);
check('META_PHASE',       meta.phase      === 3,         `got: ${meta.phase}`);
check('META_ENTRY_COUNT', typeof meta.entryCount === 'number', 'entryCount missing');
check('META_POLICY',      typeof meta.policy === 'string' && meta.policy.includes('L-0'), `got: ${meta.policy}`);
check('META_GENERATED_AT',typeof meta.generatedAt === 'string' && meta.generatedAt.length >= 10);

// ── 2. _meta.entryCount と実エントリ数の一致 ──
check('ENTRY_COUNT_META_MATCH',
    meta.entryCount === p3Ids.length,
    `meta: ${meta.entryCount}, actual: ${p3Ids.length}`
);

// ── 3. _meta 分類別件数の一致 ──
check('META_TRS_SUM',
    meta.phraseCount + meta.elisionCount + meta.caseCount === meta.entryCount,
    `${meta.phraseCount}+${meta.elisionCount}+${meta.caseCount} ≠ ${meta.entryCount}`
);

// ── 4-6. ID 重複確認 ──
const manOvl = p3Ids.filter(id => manualIds.has(id));
check('NO_MANUAL_OVERLAP', manOvl.length === 0, `overlap: ${manOvl.slice(0,5).join(', ')}`);
const p1Ovl = p3Ids.filter(id => p1Ids.has(id));
check('NO_PHASE1_OVERLAP', p1Ovl.length === 0,  `overlap: ${p1Ovl.slice(0,5).join(', ')}`);
const p2Ovl = p3Ids.filter(id => p2Ids.has(id));
check('NO_PHASE2_OVERLAP', p2Ovl.length === 0,  `overlap: ${p2Ovl.slice(0,5).join(', ')}`);

// ── 7. 全 ID が apparatus.json に存在 ──
let missingId = '';
for (const id of p3Ids) { if (!baseById[id]) { missingId = id; break; } }
check('ALL_IDS_IN_BASE', !missingId, `missing: ${missingId}`);

// ── 8. ベースライン件数 ──
check('ENTRY_COUNT_BASELINE', p3Ids.length === EXPECTED_ENTRY_COUNT,
    `expected: ${EXPECTED_ENTRY_COUNT}, got: ${p3Ids.length}`);

// ── 9. 分類別ベースライン ──
check('PHRASE_COUNT_BASELINE',  meta.phraseCount  === EXPECTED_PHRASE_COUNT,
    `expected: ${EXPECTED_PHRASE_COUNT}, got: ${meta.phraseCount}`);
check('ELISION_COUNT_BASELINE', meta.elisionCount === EXPECTED_ELISION_COUNT,
    `expected: ${EXPECTED_ELISION_COUNT}, got: ${meta.elisionCount}`);
check('CASE_COUNT_BASELINE',    meta.caseCount    === EXPECTED_CASE_COUNT,
    `expected: ${EXPECTED_CASE_COUNT}, got: ${meta.caseCount}`);

// ── 10. 全エントリ status = '自動生成' ──
let badStatus = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.status !== '自動生成') { badStatus = `${id}: '${e.status}'`; break; }
}
check('ALL_STATUS_AUTO', !badStatus, badStatus);

// ── 11. 全エントリ tag = '読み差' ──
let badTag = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.tag !== '読み差') { badTag = `${id}: '${e.tag}'`; break; }
}
check('ALL_TAG_YOMISA', !badTag, badTag);

// ── 12. 全エントリ autoPhase = 3 ──
let badPhase = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.autoPhase !== 3) { badPhase = `${id}: ${e.autoPhase}`; break; }
}
check('ALL_AUTOPHASE_3', !badPhase, badPhase);

// ── 13. 全エントリ ja が非空・（）形式 ──
let emptyJa = '';
for (const [id, e] of Object.entries(entries)) {
    if (typeof e.ja !== 'string' || e.ja.trim() === '') { emptyJa = id; break; }
}
check('JA_NONEMPTY', !emptyJa, `empty ja: ${emptyJa}`);

let badFmt = '';
for (const [id, e] of Object.entries(entries)) {
    if (!e.ja.includes('（') || !e.ja.includes('）')) { badFmt = `${id}: '${e.ja.slice(0,40)}'`; break; }
}
check('JA_FORMAT_BRACKETS', !badFmt, badFmt);

// ── 14. 全エントリ ja が '…' を含まない ──
let hasEllipsis = '';
for (const [id, e] of Object.entries(entries)) {
    if (e.ja.includes('…')) { hasEllipsis = `${id}: '${e.ja.slice(0,50)}'`; break; }
}
check('JA_NO_ELLIPSIS', !hasEllipsis, hasEllipsis);

// ── 15. WHspur 1-reading 除外 ID が Phase 3 に含まれない ──
const foundWHspur = WHSPUR_EXCLUDED_IDS.filter(id => !!entries[id]);
check('WHSPUR_1READING_IDS_EXCLUDED',
    foundWHspur.length === 0,
    `found: ${foundWHspur.join(', ')}`
);

// ── 16. スポットチェック: MAT-0024（phrase 代表）──
const m24     = entries['MAT-0024'];
const m24Base = baseById['MAT-0024'];
check('SPOT_MAT0024_EXISTS', !!m24, 'MAT-0024 not found');
check('SPOT_MAT0024_TAG',    m24 && m24.tag === '読み差',  `tag: ${m24 && m24.tag}`);
if (m24 && m24Base) {
    const expectedParts = m24Base.readings.map(r => r.text + '（' + r.witnesses.join(' ') + '）');
    const expectedJa = expectedParts.join('・');
    check('SPOT_MAT0024_FORMAT', m24.ja === expectedJa && m24.ja.includes('・'),
        `ja: ${m24.ja} | expected: ${expectedJa}`);
}

// ── 17. スポットチェック: MAT-0021（elision 代表）──
// 元データから期待値を構築してUnicode正規化の影響を避ける
const m21 = entries['MAT-0021'];
const m21Base = baseById['MAT-0021'];
check('SPOT_MAT0021_EXISTS', !!m21, 'MAT-0021 not found');
if (m21 && m21Base) {
    const expectedParts = m21Base.readings.map(r => r.text + '（' + r.witnesses.join(' ') + '）');
    const expectedJa = expectedParts.join('・');
    check('SPOT_MAT0021_FORMAT', m21.ja === expectedJa, `ja: ${m21.ja} | expected: ${expectedJa}`);
}

// ── 18. スポットチェック: MAT-0096（case 代表）──
const m96 = entries['MAT-0096'];
const m96Base = baseById['MAT-0096'];
check('SPOT_MAT0096_EXISTS', !!m96, 'MAT-0096 not found');
if (m96 && m96Base) {
    const expectedParts = m96Base.readings.map(r => r.text + '（' + r.witnesses.join(' ') + '）');
    const expectedJa = expectedParts.join('・');
    check('SPOT_MAT0096_FORMAT', m96.ja === expectedJa, `ja: ${m96.ja} | expected: ${expectedJa}`);
}

// ── 19. LUK-1050（WHspur 1-reading）が除外されている ──
check('LUK1050_EXCLUDED', !entries['LUK-1050'], 'LUK-1050 found (should be excluded)');

// ── 20-24. WHspur 2-reading 5件が生成されている（Task 35: every 条件で許可）──
for (const id of WHSPUR_GENERATED_IDS) {
    const e    = entries[id];
    const bE   = baseById[id];
    check('WHSPUR2_EXISTS_' + id, !!e, `${id} not found (should be generated)`);
    if (e && bE) {
        check('WHSPUR2_TAG_' + id, e.tag === '読み差', `tag: ${e.tag}`);
        check('WHSPUR2_STATUS_' + id, e.status === '自動生成', `status: ${e.status}`);
        const expectedParts = bE.readings.map(r => r.text + '（' + r.witnesses.join(' ') + '）');
        const expectedJa = expectedParts.join('・');
        check('WHSPUR2_FORMAT_' + id, e.ja === expectedJa,
            `ja: ${e.ja.slice(0,40)} | expected: ${expectedJa.slice(0,40)}`);
    }
}

// ── 25. 証人-読み対応サンプル確認（100件）──
const sample100 = p3Ids.slice(0, 100);
let mismatchCount = 0;
for (const id of sample100) {
    const entry  = entries[id];
    const baseE  = baseById[id];
    if (!baseE) continue;
    const parts  = entry.ja.split('・');
    if (parts.length !== baseE.readings.length) { mismatchCount++; continue; }
    for (let i = 0; i < parts.length; i++) {
        const m = parts[i].match(/^(.+)（(.+)）$/);
        if (!m) { mismatchCount++; continue; }
        const [,jaText, jaWit] = m;
        if (jaText !== baseE.readings[i].text)                   mismatchCount++;
        if (jaWit  !== baseE.readings[i].witnesses.join(' '))    mismatchCount++;
    }
}
check('WIT_READING_MATCH_100', mismatchCount === 0, `${mismatchCount} mismatches in first 100 entries`);

// ── 結果出力 ─────────────────────────────────────────────────────
console.log('\n=== re-apparatus-ja-phase3-regression ===');
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
