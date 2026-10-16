#!/usr/bin/env node
/**
 * re-apparatus-display-regression.cjs — _buildApparatusHTML 表示条件の回帰テスト
 *
 * 検証対象:
 *   1. _buildApparatusHTML のステータス別出力（ソースから再現した純粋関数として検証）
 *   2. CSS クラス mvv-app-anno--auto が index.html に存在する
 *   3. word-analysis-open の除外ルール（mvv-apparatus-note）が維持されている
 *   4. _loadApparatusJaAllData() が _fillApparatusSection で使われている
 *   5. デスクトップパスに wlv-apparatus-slot が追加されていない
 *
 * invariant:
 *  1. status='確認済み' → mvv-app-anno クラスあり、mvv-app-anno--auto クラスなし
 *  2. status='自動生成' → mvv-app-anno クラスあり、mvv-app-anno--auto クラスあり
 *  3. status='保留'   → anno HTML なし（ギリシャ語 apparatus 本体は表示される）
 *  4. 未知のステータス → anno HTML なし
 *  5. ja または tag が空 → anno HTML なし
 *  6. jaEntries = null → anno HTML なし（readings は表示される）
 *  7. entries が空 → 空文字列を返す
 *  8. CSS: #mobile-verse-area .mvv-app-anno--auto .mvv-app-tag が font-style: italic で定義されている（Task 41-Fix）
 *  9. CSS: #mobile-verse-area.word-analysis-open .mvv-passage-note:not(.mvv-apparatus-note) の除外ルール維持
 * 10. _fillApparatusSection が _loadApparatusJaAllData を呼んでいる
 * 11. デスクトップの wlv-passage-note-slot 付近に wlv-apparatus-slot が追加されていない
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'public', 'index.html');

let failed = 0;
const results = [];
function check(name, cond, detail) {
    results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
    if (!cond) failed++;
}

check('HTML_EXISTS', fs.existsSync(HTML_PATH), HTML_PATH);
const html = fs.readFileSync(HTML_PATH, 'utf8');

// ── _buildApparatusHTML の純粋関数再現（ソース実装と同一ロジック）────────────
function _escH(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _buildApparatusHTML(entries, jaEntries, lemJaEntries) {
    if (!entries || !entries.length) return '';
    const _rdgNums = ['①', '②', '③', '④'];
    const parts = entries.map(e => {
        const lemJa   = lemJaEntries && lemJaEntries[e.id];
        const lemHtml = lemJa
            ? `<div class="mvv-app-lem">${_escH(lemJa)}<span class="mvv-app-lem-gr">（${_escH(e.lemText)}）</span></div>`
            : `<div class="mvv-app-lem">${_escH(e.lemText)}</div>`;
        const ja = jaEntries && jaEntries[e.id];
        const isConfirmed = ja && ja.status === '確認済み' && ja.tag && ja.ja;
        const isAuto      = ja && ja.status === '自動生成' && ja.tag && ja.ja;
        const showJaText = (isConfirmed || isAuto) && !(e.readings.length >= 2 && ja.ja.startsWith('語順: '));
        const jaSpan = showJaText ? `<span class="mvv-app-ja">${_escH(ja.ja)}</span>` : '';
        const annoHtml = isConfirmed
            ? `<div class="mvv-app-anno"><span class="mvv-app-tag">${_escH(ja.tag)}</span>${jaSpan}</div>`
            : isAuto
            ? `<div class="mvv-app-anno mvv-app-anno--auto"><span class="mvv-app-tag">${_escH(ja.tag)}</span>${jaSpan}</div>`
            : '';
        const rdgHtml = e.readings.map((r, idx) => {
            const numHtml = e.readings.length >= 2
                ? `<span class="mvv-app-rdg-num">${_rdgNums[idx] || (idx + 1)}</span>`
                : '';
            const text = r.isOmission ? '（省略）' : _escH(r.text || '');
            const wit  = _escH((r.witnesses || []).join(' · '));
            return `<div class="mvv-app-rdg">${numHtml}<span class="mvv-app-rdg-text">${text}</span><span class="mvv-app-rdg-wit">${wit}</span></div>`;
        }).join('');
        return `<div class="mvv-app-entry">${lemHtml}${annoHtml}${rdgHtml}</div>`;
    });
    return `<div class="mvv-apparatus-entries">${parts.join('')}</div>`;
}

// テスト用 apparatus エントリ（apparatus.json と同一スキーマ）
const fakeEntry = {
    id: 'MAT-0001',
    lemText: 'τοῦ',
    readings: [
        { text: 'τοῦ', witnesses: ['WH', 'Treg'] },
        { text: 'omit', isOmission: true, witnesses: ['RP'] },
    ],
};

// ── 1. status='確認済み' → anno あり、--auto なし ────────────────────────────
{
    const ja = { 'MAT-0001': { status: '確認済み', tag: '添加', ja: '＋foo（WH）' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('CONFIRMED_HAS_ANNO',     h.includes('mvv-app-anno'),      `html: ${h.slice(0,100)}`);
    check('CONFIRMED_NO_AUTO_CLASS',!h.includes('mvv-app-anno--auto'), `html: ${h.slice(0,100)}`);
    check('CONFIRMED_HAS_TAG',       h.includes('mvv-app-tag'),       `html: ${h.slice(0,100)}`);
    check('CONFIRMED_HAS_JA',        h.includes('mvv-app-ja'),        `html: ${h.slice(0,100)}`);
    check('CONFIRMED_READINGS_PRESENT', h.includes('mvv-app-rdg'),   `html: ${h.slice(0,100)}`);
}

// ── 2. status='自動生成' → anno あり、--auto あり ────────────────────────────
{
    const ja = { 'MAT-0001': { status: '自動生成', tag: '読み差', ja: 'foo（WH）・bar（RP）' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('AUTO_HAS_ANNO',           h.includes('mvv-app-anno'),       `html: ${h.slice(0,100)}`);
    check('AUTO_HAS_AUTO_CLASS',     h.includes('mvv-app-anno--auto'), `html: ${h.slice(0,100)}`);
    check('AUTO_HAS_TAG',            h.includes('mvv-app-tag'),        `html: ${h.slice(0,100)}`);
    check('AUTO_HAS_JA',             h.includes('mvv-app-ja'),         `html: ${h.slice(0,100)}`);
    check('AUTO_READINGS_PRESENT',   h.includes('mvv-app-rdg'),        `html: ${h.slice(0,100)}`);
}

// ── 3. status='保留' → anno なし、readings は表示 ────────────────────────────
{
    const ja = { 'MAT-0001': { status: '保留', tag: '添加', ja: '＋foo（WH）' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('HOLD_NO_ANNO',    !h.includes('mvv-app-anno'),  `html: ${h.slice(0,100)}`);
    check('HOLD_HAS_READINGS', h.includes('mvv-app-rdg'), `html: ${h.slice(0,100)}`);
}

// ── 4. 未知ステータス → anno なし ────────────────────────────────────────────
{
    const ja = { 'MAT-0001': { status: '未知_UNKNOWN', tag: '読み差', ja: 'test' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('UNKNOWN_NO_ANNO', !h.includes('mvv-app-anno'), `html: ${h.slice(0,100)}`);
}

// ── 5. ja が空文字 → anno なし ────────────────────────────────────────────────
{
    const ja = { 'MAT-0001': { status: '自動生成', tag: '読み差', ja: '' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('EMPTY_JA_NO_ANNO', !h.includes('mvv-app-anno'), `html: ${h.slice(0,100)}`);
}

// ── 6. tag が空文字 → anno なし ────────────────────────────────────────────────
{
    const ja = { 'MAT-0001': { status: '自動生成', tag: '', ja: 'foo' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('EMPTY_TAG_NO_ANNO', !h.includes('mvv-app-anno'), `html: ${h.slice(0,100)}`);
}

// ── 7. jaEntries = null → anno なし、readings は表示 ─────────────────────────
{
    const h = _buildApparatusHTML([fakeEntry], null);
    check('NULL_JA_NO_ANNO',      !h.includes('mvv-app-anno'), `html: ${h.slice(0,100)}`);
    check('NULL_JA_HAS_READINGS',  h.includes('mvv-app-rdg'),  `html: ${h.slice(0,100)}`);
    check('NULL_JA_HAS_LEM',       h.includes('mvv-app-lem'),  `html: ${h.slice(0,100)}`);
}

// ── 8. entries = [] → 空文字列 ────────────────────────────────────────────────
{
    const h = _buildApparatusHTML([], null);
    check('EMPTY_ENTRIES_EMPTY_HTML', h === '', `got: ${h.slice(0,40)}`);
}

// ── 9. isOmission エントリの表示 → '（省略）' ────────────────────────────────
{
    const h = _buildApparatusHTML([fakeEntry], null);
    check('OMISSION_DISPLAYED', h.includes('（省略）'), `html: ${h.slice(0,150)}`);
}

// ── 10. 確認済みと自動生成が混在する複数エントリ ────────────────────────────
{
    const entry2 = { id: 'MAT-0002', lemText: 'bar', readings: [{ text: 'bar', witnesses: ['WH'] }] };
    const ja = {
        'MAT-0001': { status: '確認済み', tag: '添加', ja: '＋foo（WH）' },
        'MAT-0002': { status: '自動生成', tag: '読み差', ja: 'bar（WH）・baz（RP）' },
    };
    const h = _buildApparatusHTML([fakeEntry, entry2], ja);
    const annoCount     = (h.match(/mvv-app-anno/g) || []).length;
    const autoCount     = (h.match(/mvv-app-anno--auto/g) || []).length;
    const confirmedPart = h.includes('class="mvv-app-anno"');
    const autoPart      = h.includes('class="mvv-app-anno mvv-app-anno--auto"');
    check('MIXED_CONFIRMED_EXISTS', confirmedPart,  `no confirmed class in: ${h.slice(0,200)}`);
    check('MIXED_AUTO_EXISTS',      autoPart,       `no auto class in: ${h.slice(0,200)}`);
    // anno は2個（confirmed + auto）
    check('MIXED_ANNO_COUNT',       annoCount >= 2, `anno count: ${annoCount}`);
    // --auto は1個のみ
    check('MIXED_AUTO_COUNT',       autoCount === 1, `auto count: ${autoCount}`);
}

// ── 11. 語順差 + 2 readings + "語順: X / Y" → mvv-app-ja を表示しない ──────────
// ROM-0001 相当のケース — 番号付き語順が冗長な ja テキストを隠す
{
    const woEntry = {
        id: 'ROM-0001', lemText: 'Χριστοῦ Ἰησοῦ',
        readings: [
            { text: 'Χριστοῦ Ἰησοῦ', witnesses: ['Treg', 'NIV'] },
            { text: 'Ἰησοῦ Χριστοῦ', witnesses: ['WH', 'RP'] },
        ],
    };
    const ja = { 'ROM-0001': { status: '確認済み', tag: '語順差', ja: '語順: Χριστοῦ Ἰησοῦ / Ἰησοῦ Χριστοῦ' } };
    const h = _buildApparatusHTML([woEntry], ja);
    check('WORDORDER_JA_SPAN_HIDDEN',   !h.includes('mvv-app-ja'),         `ja span should be absent: ${h.slice(0,250)}`);
    check('WORDORDER_ANNO_PRESENT',      h.includes('mvv-app-anno'),        `anno div should remain: ${h.slice(0,250)}`);
    check('WORDORDER_TAG_PRESENT',       h.includes('mvv-app-tag'),         `tag chip should remain: ${h.slice(0,250)}`);
    check('WORDORDER_NUM1_SHOWN',        h.includes('①'),                  `① not in output: ${h.slice(0,250)}`);
    check('WORDORDER_NUM2_SHOWN',        h.includes('②'),                  `② not in output: ${h.slice(0,250)}`);
    check('WORDORDER_READING1_PRESENT',  h.includes('Χριστοῦ Ἰησοῦ'),     `reading 1 missing: ${h.slice(0,250)}`);
    check('WORDORDER_READING2_PRESENT',  h.includes('Ἰησοῦ Χριστοῦ'),     `reading 2 missing: ${h.slice(0,250)}`);
    check('WORDORDER_WITNESS_PRESENT',   h.includes('Treg'),                `witness missing: ${h.slice(0,250)}`);
}

// ── 12. 語順差 + 非 "語順: " テキスト → mvv-app-ja を保持する ───────────────────
// MRK-0392 相当のケース — 説明的テキストは抑制しない
{
    const descEntry = {
        id: 'MRK-0392', lemText: 'test',
        readings: [
            { text: 'A', witnesses: ['WH'] },
            { text: 'B', witnesses: ['RP'] },
        ],
    };
    const ja = { 'MRK-0392': { status: '確認済み', tag: '語順差', ja: 'リストの語順の入れ替え' } };
    const h = _buildApparatusHTML([descEntry], ja);
    check('WORDORDER_DESCRIPTIVE_JA_KEPT', h.includes('mvv-app-ja'), `descriptive ja should be shown: ${h.slice(0,200)}`);
}

// ── 13. 他タグ（添加）+ 2 readings → mvv-app-ja を抑制しない ─────────────────────
{
    const ja = { 'MAT-0001': { status: '確認済み', tag: '添加', ja: '＋ὁ βασιλεύς（RP）' } };
    const h = _buildApparatusHTML([fakeEntry], ja);
    check('NON_WORDORDER_JA_NOT_SUPPRESSED', h.includes('mvv-app-ja'), `添加 ja should still show: ${h.slice(0,200)}`);
}

// ── 14. 実データ: ROM-0001 の HTML に "語順: " 行なし、①② 保持 ──────────────────
{
    const APP_PATH2 = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
    const JAR_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-ja.json');
    try {
        const appData  = JSON.parse(fs.readFileSync(APP_PATH2, 'utf8'));
        const jaData2  = JSON.parse(fs.readFileSync(JAR_PATH, 'utf8'));
        const rom0001  = appData.entries.find(e => e.id === 'ROM-0001');
        check('ROM0001_ENTRY_EXISTS',       !!rom0001,                    'ROM-0001 not found in apparatus.json');
        if (rom0001) {
            const jaMap = { 'ROM-0001': jaData2.entries['ROM-0001'] };
            const h = _buildApparatusHTML([rom0001], jaMap);
            check('ROM0001_NO_DUPLICATE_LABEL', !h.includes('語順: '),      `found 語順: in: ${h.slice(0,300)}`);
            check('ROM0001_JA_SPAN_ABSENT',     !h.includes('mvv-app-ja'),   `mvv-app-ja should be absent: ${h.slice(0,300)}`);
            check('ROM0001_ANNO_PRESENT',        h.includes('mvv-app-anno'),  `anno div missing: ${h.slice(0,300)}`);
            check('ROM0001_NUM1_SHOWN',          h.includes('①'),             `① missing: ${h.slice(0,300)}`);
            check('ROM0001_NUM2_SHOWN',          h.includes('②'),             `② missing: ${h.slice(0,300)}`);
            check('ROM0001_WITNESS_PRESENT',     h.includes('Treg'),           `witness missing: ${h.slice(0,300)}`);
        }
    } catch (e) {
        check('ROM0001_REAL_DATA_LOAD', false, e.message);
    }
}

// ── 静的ソース監査: CSS / JS ─────────────────────────────────────────────────

// 11. CSS: .mvv-app-anno--auto .mvv-app-tag が font-style: italic で定義されている
//     （Task 41-Fix: opacity: 0.7 → タグチップのイタリックに変更）
check('CSS_AUTO_CLASS_EXISTS',
    html.includes('.mvv-app-anno--auto'),
    'mvv-app-anno--auto not found in CSS');
check('CSS_AUTO_TAG_ITALIC',
    html.includes('mvv-app-anno--auto') && html.includes('font-style: italic'),
    'font-style: italic not found for mvv-app-anno--auto .mvv-app-tag');

// 12. CSS: word-analysis-open の除外ルール（mvv-apparatus-note）が維持されている
check('CSS_WORD_ANALYSIS_EXCLUSION',
    html.includes('.mvv-passage-note:not(.mvv-apparatus-note)'),
    'word-analysis-open exclusion rule missing');

// 13. _fillApparatusSection が _loadApparatusJaAllData を呼んでいる
check('FILL_CALLS_ALL_LOADER',
    html.includes('_loadApparatusJaAllData()'),
    '_fillApparatusSection does not call _loadApparatusJaAllData');

// 14. 旧 _loadApparatusJaData() 関数が残っている（後方互換）
check('OLD_LOADER_PRESERVED',
    html.includes('async function _loadApparatusJaData()'),
    '_loadApparatusJaData function missing');

// 15. デスクトップパスに wlv-apparatus-slot が追加されていない
// デスクトップパスの passageNoteHTML = '<div id="wlv-passage-note-slot"></div>'
// wlv-apparatus-slot は mobile の area.innerHTML にのみ存在するべき
const apparatusSlotCount = (html.match(/wlv-apparatus-slot/g) || []).length;
// 現行: 3箇所（area.innerHTML の定義、コメント、querySelector）— デスクトップに追加されていなければ増えない
check('NO_DESKTOP_APPARATUS_SLOT',
    apparatusSlotCount <= 3,
    `wlv-apparatus-slot count: ${apparatusSlotCount} (expected ≤3)`);

// 16. _apparatusNoteGen 世代カウンタが _fillApparatusSection 内に存在する
check('GEN_COUNTER_PRESENT',
    html.includes('++_apparatusNoteGen') && html.includes('myGen !== _apparatusNoteGen'),
    'generation counter missing from _fillApparatusSection');

// 17. _buildApparatusHTML の新コメントが isConfirmed / isAuto を参照している
check('BUILD_HTML_COMMENT_UPDATED',
    html.includes("status='確認済み'") && html.includes("status='自動生成'"),
    'updated comment not found in _buildApparatusHTML');

// 18. 語順重複抑制ロジック（showJaText / jaSpan / startsWith）が index.html に存在する
check('SOURCE_SHOWJATEXT_PRESENT',
    html.includes('showJaText'),
    'showJaText not found in _buildApparatusHTML source');
check('SOURCE_JASPAN_PRESENT',
    html.includes('jaSpan'),
    'jaSpan not found in _buildApparatusHTML source');
check('SOURCE_STARTSWITH_WORDORDER',
    html.includes("startsWith('語順: ')"),
    "startsWith('語順: ') not found in _buildApparatusHTML source");

// ── 結果出力 ─────────────────────────────────────────────────────────────────
console.log('\n=== re-apparatus-display-regression ===');
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
