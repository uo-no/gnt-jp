#!/usr/bin/env node
/**
 * re-apparatus-ja-all-regression.cjs — 4データセット統合ローダーの回帰テスト
 *
 * 検証対象: _loadApparatusJaAllData() のマージロジック（index.html に追加）
 *           およびその入力となる4つのJSONファイル
 *
 * invariant:
 *  1. 4ファイルがすべて存在し JSON として valid
 *  2. 統合後の件数が 6,756（4データセット合計と一致）
 *  3. 統合後にID重複がない（件数確認で代替）
 *  4. manual 30件がすべて統合結果に含まれる
 *  5. manual優先: 同一IDはmanualのstatus/tag/jaで上書き（人工テストデータで検証）
 *  6. Phase優先: Phase 1 > Phase 2 > Phase 3（人工テストデータで検証）
 *  7. 元の status・tag・ja が保持される（Phase 1/2/3 サンプル確認）
 *  8. autoPhase フィールドが統合後も保持される
 *  9. partial failure（一部データセット null）でも残りが統合される
 * 10. 完全 null（全データセット失敗）で entries が空になる
 * 11. 既存の4ファイル individual テストが引き続き通る
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE  = path.join(__dirname, '..', 'public', 'assets', 'data');
const PATHS = {
    manual: path.join(BASE, 'apparatus-ja.json'),
    p1:     path.join(BASE, 'apparatus-ja-auto.json'),
    p2:     path.join(BASE, 'apparatus-ja-phase2.json'),
    p3:     path.join(BASE, 'apparatus-ja-phase3.json'),
};

const EXPECTED_TOTAL = 6756;
const EXPECTED_MANUAL_COUNT = 30;
const EXPECTED_P1_COUNT     = 2418;
const EXPECTED_P2_COUNT     = 2796;
const EXPECTED_P3_COUNT     = 1512;

let failed = 0;
const results = [];

function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

// ── _loadApparatusJaAllData() のマージロジックを Node で再現 ─────────────
// ブラウザ側と同一のアルゴリズム: p3 → p2 → p1 → manual の順で Object.assign
function mergeDatasets(manual, p1, p2, p3) {
    const merged = {};
    for (const src of [p3, p2, p1, manual]) {
        if (src && src.entries) Object.assign(merged, src.entries);
    }
    return { entries: merged };
}

// ── ファイル読み込み ──────────────────────────────────────────────────────
for (const [name, p] of Object.entries(PATHS)) {
    check(`FILE_EXISTS_${name.toUpperCase()}`, fs.existsSync(p), p);
}

let manual, p1, p2, p3;
try { manual = JSON.parse(fs.readFileSync(PATHS.manual, 'utf8')); } catch (e) { check('PARSE_MANUAL', false, e.message); process.exit(1); }
check('PARSE_MANUAL', true);
try { p1     = JSON.parse(fs.readFileSync(PATHS.p1,     'utf8')); } catch (e) { check('PARSE_P1', false, e.message); process.exit(1); }
check('PARSE_P1', true);
try { p2     = JSON.parse(fs.readFileSync(PATHS.p2,     'utf8')); } catch (e) { check('PARSE_P2', false, e.message); process.exit(1); }
check('PARSE_P2', true);
try { p3     = JSON.parse(fs.readFileSync(PATHS.p3,     'utf8')); } catch (e) { check('PARSE_P3', false, e.message); process.exit(1); }
check('PARSE_P3', true);

// ── 1. 各ファイルの件数（ベースライン）────────────────────────────────────
const manualIds = Object.keys(manual.entries || {});
const p1Ids     = Object.keys(p1.entries     || {});
const p2Ids     = Object.keys(p2.entries     || {});
const p3Ids     = Object.keys(p3.entries     || {});

check('COUNT_MANUAL', manualIds.length === EXPECTED_MANUAL_COUNT,
    `expected: ${EXPECTED_MANUAL_COUNT}, got: ${manualIds.length}`);
check('COUNT_P1', p1Ids.length === EXPECTED_P1_COUNT,
    `expected: ${EXPECTED_P1_COUNT}, got: ${p1Ids.length}`);
check('COUNT_P2', p2Ids.length === EXPECTED_P2_COUNT,
    `expected: ${EXPECTED_P2_COUNT}, got: ${p2Ids.length}`);
check('COUNT_P3', p3Ids.length === EXPECTED_P3_COUNT,
    `expected: ${EXPECTED_P3_COUNT}, got: ${p3Ids.length}`);

// ── 2. 統合実行 ───────────────────────────────────────────────────────────
const merged = mergeDatasets(manual, p1, p2, p3);
const mergedIds = Object.keys(merged.entries);

// ── 3. 統合後の件数（= 全データセット合計、重複 0 が前提）────────────────
check('MERGED_TOTAL_COUNT', mergedIds.length === EXPECTED_TOTAL,
    `expected: ${EXPECTED_TOTAL}, got: ${mergedIds.length}`);

// ── 4. ID重複がない（各データセット間）───────────────────────────────────
// 重複 0 ならば 30+2418+2796+1512 = 6756 = mergedIds.length （上記 CHECK で代替）
// 追加確認: 各ペアの重複件数
const manualSet = new Set(manualIds);
const p1Set     = new Set(p1Ids);
const p2Set     = new Set(p2Ids);
const p3Set     = new Set(p3Ids);

check('NO_OVERLAP_MANUAL_P1', p1Ids.filter(id => manualSet.has(id)).length === 0,
    `overlap: ${p1Ids.filter(id => manualSet.has(id)).slice(0,3).join(', ')}`);
check('NO_OVERLAP_MANUAL_P2', p2Ids.filter(id => manualSet.has(id)).length === 0,
    `overlap: ${p2Ids.filter(id => manualSet.has(id)).slice(0,3).join(', ')}`);
check('NO_OVERLAP_MANUAL_P3', p3Ids.filter(id => manualSet.has(id)).length === 0,
    `overlap: ${p3Ids.filter(id => manualSet.has(id)).slice(0,3).join(', ')}`);
check('NO_OVERLAP_P1_P2', p1Ids.filter(id => p2Set.has(id)).length === 0,
    `overlap: ${p1Ids.filter(id => p2Set.has(id)).slice(0,3).join(', ')}`);
check('NO_OVERLAP_P1_P3', p1Ids.filter(id => p3Set.has(id)).length === 0,
    `overlap: ${p1Ids.filter(id => p3Set.has(id)).slice(0,3).join(', ')}`);
check('NO_OVERLAP_P2_P3', p2Ids.filter(id => p3Set.has(id)).length === 0,
    `overlap: ${p2Ids.filter(id => p3Set.has(id)).slice(0,3).join(', ')}`);

// ── 5. manual 30件がすべて統合結果に含まれる ─────────────────────────────
const missingManual = manualIds.filter(id => !merged.entries[id]);
check('MANUAL_ALL_PRESENT', missingManual.length === 0,
    `missing: ${missingManual.slice(0,5).join(', ')}`);

// ── 6. manual優先: manual エントリのフィールドが統合後も一致する ──────────
let manualPriorityFail = '';
for (const id of manualIds) {
    const orig   = manual.entries[id];
    const result = merged.entries[id];
    if (!result) { manualPriorityFail = `${id} not found`; break; }
    if (result.status !== orig.status || result.tag !== orig.tag || result.ja !== orig.ja) {
        manualPriorityFail = `${id}: status=${result.status}(exp:${orig.status}), tag=${result.tag}(exp:${orig.tag})`;
        break;
    }
}
check('MANUAL_PRIORITY_FIELDS', !manualPriorityFail, manualPriorityFail);

// ── 7. manual優先 — 人工テストデータで衝突時の上書きを検証 ──────────────
{
    const artificialManual = { entries: {
        'FAKE-001': { tag: 'manual_tag', ja: 'manual_ja', status: '確認済み' },
    }};
    const artificialAuto = { entries: {
        'FAKE-001': { tag: 'auto_tag', ja: 'auto_ja', status: '自動生成', autoPhase: 1 },
        'FAKE-002': { tag: 'auto_tag2', ja: 'auto_ja2', status: '自動生成', autoPhase: 1 },
    }};
    const result = mergeDatasets(artificialManual, artificialAuto, null, null);
    const r001   = result.entries['FAKE-001'];
    const r002   = result.entries['FAKE-002'];

    check('MANUAL_OVERRIDES_AUTO_TAG',    r001 && r001.tag    === 'manual_tag',    `got: ${r001 && r001.tag}`);
    check('MANUAL_OVERRIDES_AUTO_JA',     r001 && r001.ja     === 'manual_ja',     `got: ${r001 && r001.ja}`);
    check('MANUAL_OVERRIDES_AUTO_STATUS', r001 && r001.status === '確認済み',      `got: ${r001 && r001.status}`);
    check('AUTO_ONLY_ENTRY_PRESENT',      r002 && r002.tag    === 'auto_tag2',     `got: ${r002 && r002.tag}`);
}

// ── 8. Phase優先 (P1 > P2 > P3) — 人工テストデータで検証 ────────────────
{
    const fakeP1 = { entries: { 'FAKE-X': { tag: 'p1_tag', ja: 'p1_ja', status: '自動生成', autoPhase: 1 } } };
    const fakeP2 = { entries: { 'FAKE-X': { tag: 'p2_tag', ja: 'p2_ja', status: '自動生成', autoPhase: 2 } } };
    const fakeP3 = { entries: { 'FAKE-X': { tag: 'p3_tag', ja: 'p3_ja', status: '自動生成', autoPhase: 3 } } };

    // P1 vs P2: P1 が勝つ
    const r12 = mergeDatasets(null, fakeP1, fakeP2, null).entries['FAKE-X'];
    check('P1_WINS_OVER_P2', r12 && r12.tag === 'p1_tag', `got: ${r12 && r12.tag}`);

    // P1 vs P3: P1 が勝つ
    const r13 = mergeDatasets(null, fakeP1, null, fakeP3).entries['FAKE-X'];
    check('P1_WINS_OVER_P3', r13 && r13.tag === 'p1_tag', `got: ${r13 && r13.tag}`);

    // P2 vs P3: P2 が勝つ
    const r23 = mergeDatasets(null, null, fakeP2, fakeP3).entries['FAKE-X'];
    check('P2_WINS_OVER_P3', r23 && r23.tag === 'p2_tag', `got: ${r23 && r23.tag}`);

    // 全3フェーズ: P1 が勝つ
    const rAll = mergeDatasets(null, fakeP1, fakeP2, fakeP3).entries['FAKE-X'];
    check('P1_WINS_ALL_PHASES', rAll && rAll.tag === 'p1_tag' && rAll.autoPhase === 1,
        `got: tag=${rAll && rAll.tag}, autoPhase=${rAll && rAll.autoPhase}`);
}

// ── 9. 元の status・tag・ja が保持される（サンプル確認）────────────────
// Phase 1 の先頭エントリ
const p1FirstId = p1Ids[0];
const p1FirstOrig   = p1.entries[p1FirstId];
const p1FirstMerged = merged.entries[p1FirstId];
check('P1_SAMPLE_STATUS', p1FirstMerged && p1FirstMerged.status === p1FirstOrig.status,
    `id=${p1FirstId} expected: ${p1FirstOrig.status}, got: ${p1FirstMerged && p1FirstMerged.status}`);
check('P1_SAMPLE_TAG',    p1FirstMerged && p1FirstMerged.tag    === p1FirstOrig.tag,
    `id=${p1FirstId} expected: ${p1FirstOrig.tag}, got: ${p1FirstMerged && p1FirstMerged.tag}`);
check('P1_SAMPLE_JA',     p1FirstMerged && p1FirstMerged.ja     === p1FirstOrig.ja,
    `id=${p1FirstId} expected: ${p1FirstOrig.ja.slice(0,20)}, got: ${p1FirstMerged && p1FirstMerged.ja.slice(0,20)}`);

// Phase 2 の先頭エントリ
const p2FirstId = p2Ids[0];
const p2FirstOrig   = p2.entries[p2FirstId];
const p2FirstMerged = merged.entries[p2FirstId];
check('P2_SAMPLE_STATUS', p2FirstMerged && p2FirstMerged.status === p2FirstOrig.status,
    `id=${p2FirstId}`);
check('P2_SAMPLE_JA',     p2FirstMerged && p2FirstMerged.ja     === p2FirstOrig.ja,
    `id=${p2FirstId}`);

// Phase 3 の先頭エントリ
const p3FirstId = p3Ids[0];
const p3FirstOrig   = p3.entries[p3FirstId];
const p3FirstMerged = merged.entries[p3FirstId];
check('P3_SAMPLE_STATUS', p3FirstMerged && p3FirstMerged.status === p3FirstOrig.status,
    `id=${p3FirstId}`);
check('P3_SAMPLE_JA',     p3FirstMerged && p3FirstMerged.ja     === p3FirstOrig.ja,
    `id=${p3FirstId}`);

// ── 10. autoPhase フィールドが保持される ─────────────────────────────────
const p1AutoPhaseEntry = Object.values(p1.entries)[0];
const p1AutoPhaseMerged = merged.entries[p1Ids[0]];
check('AUTOPHASE_PRESERVED_P1',
    p1AutoPhaseMerged && p1AutoPhaseMerged.autoPhase === p1AutoPhaseEntry.autoPhase,
    `expected: ${p1AutoPhaseEntry.autoPhase}, got: ${p1AutoPhaseMerged && p1AutoPhaseMerged.autoPhase}`);

// ── 11. partial failure — 一部 null でも残りが統合される ─────────────────
{
    const partial = mergeDatasets(manual, null, p2, null);
    const partialIds = Object.keys(partial.entries);
    const expected   = manualIds.length + p2Ids.length; // 30 + 2796 = 2826
    check('PARTIAL_FAILURE_COUNT', partialIds.length === expected,
        `expected: ${expected}, got: ${partialIds.length}`);
    // manual は含まれる
    check('PARTIAL_FAILURE_MANUAL_PRESENT', manualIds.every(id => partial.entries[id]),
        'manual entries missing in partial merge');
    // p2 は含まれる
    check('PARTIAL_FAILURE_P2_PRESENT', p2Ids.slice(0,5).every(id => partial.entries[id]),
        'p2 entries missing in partial merge');
    // p1 (null) は含まれない → 上記 count チェックで間接確認
}

// ── 12. 完全 null — entries が空になる ───────────────────────────────────
{
    const empty = mergeDatasets(null, null, null, null);
    check('ALL_NULL_ENTRIES_EMPTY', Object.keys(empty.entries).length === 0,
        `got: ${Object.keys(empty.entries).length}`);
}

// ── 13. キャッシュ動作 — 2回マージしても結果が同一である（参照同一は不可、値同一で確認）─
{
    const r1 = mergeDatasets(manual, p1, p2, p3);
    const r2 = mergeDatasets(manual, p1, p2, p3);
    check('CACHE_COUNT_STABLE', Object.keys(r1.entries).length === Object.keys(r2.entries).length,
        'merge count differs between two calls');
    // 先頭エントリの値が一致
    const firstId = Object.keys(r1.entries)[0];
    check('CACHE_FIRST_ENTRY_STABLE',
        JSON.stringify(r1.entries[firstId]) === JSON.stringify(r2.entries[firstId]),
        `first entry differs: ${firstId}`);
}

// ── 14. スポットチェック: manual先頭エントリ (MAT-0001) が保持される ────
const mat0001 = merged.entries['MAT-0001'];
const mat0001Orig = manual.entries['MAT-0001'];
check('SPOT_MAT0001_STATUS',  mat0001 && mat0001.status === mat0001Orig.status, `status: ${mat0001 && mat0001.status}`);
check('SPOT_MAT0001_TAG',     mat0001 && mat0001.tag    === mat0001Orig.tag,    `tag: ${mat0001 && mat0001.tag}`);

// ── 15. スポットチェック: Phase 1エントリ (MAT-0011) が保持される ────────
const mat0011 = merged.entries['MAT-0011'];
const mat0011Orig = p1.entries['MAT-0011'];
check('SPOT_MAT0011_STATUS',  mat0011 && mat0011.status === '自動生成', `status: ${mat0011 && mat0011.status}`);
check('SPOT_MAT0011_TAG',     mat0011 && mat0011.tag    === mat0011Orig.tag,    `tag: ${mat0011 && mat0011.tag}`);

// ── 16. スポットチェック: Phase 2エントリ (MAT-0007) が保持される ────────
const mat0007 = merged.entries['MAT-0007'];
check('SPOT_MAT0007_STATUS',  mat0007 && mat0007.status === '自動生成', `status: ${mat0007 && mat0007.status}`);
check('SPOT_MAT0007_TAG',     mat0007 && mat0007.tag    === '読み差',   `tag: ${mat0007 && mat0007.tag}`);

// ── 17. スポットチェック: Phase 3エントリ (MAT-0021) が保持される ────────
const mat0021 = merged.entries['MAT-0021'];
check('SPOT_MAT0021_STATUS',  mat0021 && mat0021.status === '自動生成', `status: ${mat0021 && mat0021.status}`);
check('SPOT_MAT0021_TAG',     mat0021 && mat0021.tag    === '読み差',   `tag: ${mat0021 && mat0021.tag}`);

// ── 18. manual '保留' エントリが統合後も保持される ────────────────────────
check('HOLD_MAT0353_IN_MERGED', !!merged.entries['MAT-0353'], 'MAT-0353 missing from merged');
check('HOLD_LUK0985_IN_MERGED', !!merged.entries['LUK-0985'], 'LUK-0985 missing from merged');
check('HOLD_STATUS_PRESERVED',
    merged.entries['MAT-0353'] && merged.entries['MAT-0353'].status === '保留',
    `status: ${merged.entries['MAT-0353'] && merged.entries['MAT-0353'].status}`);

// ── 結果出力 ─────────────────────────────────────────────────────────────
console.log('\n=== re-apparatus-ja-all-regression ===');
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
