#!/usr/bin/env node
/**
 * search-cooc-test.cjs — Term 共起検索（Pattern Search Phase 2）単体テスト
 *
 * 実行: node scripts/search-cooc-test.cjs
 *
 * search-tool.html の実物ソースから抽出して検証:
 *   1. verse スコープ: 「互いに＋命令形」型の共起判定
 *   2. anchor 自身は共起相手に数えない（同一トークン除外）
 *   3. window スコープ: 既存 runProximitySearch と結果完全互換
 *   4. hits の節境界（start/end）
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const src  = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'search-tool.html'), 'utf8');

function extractFn(name) {
    const asyncIdx = src.indexOf(`async function ${name}(`);
    const start = asyncIdx >= 0 ? asyncIdx : src.indexOf(`function ${name}(`);
    if (start < 0) throw new Error('not found: ' + name);
    /* 引数リスト（分割代入の {} を含み得る）を括弧対応で読み飛ばし、
       その後の { から関数本体をブレース対応で抽出する */
    let i = src.indexOf('(', start), pdepth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '(') pdepth++;
        else if (src[i] === ')') { pdepth--; if (pdepth === 0) break; }
    }
    i = src.indexOf('{', i);
    let depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
}
const extractConst = n => {
    const m = src.match(new RegExp(`const ${n} = [^;]+;`));
    if (!m) throw new Error('not found: ' + n);
    return m[0];
};
const extractBlock = (re, label) => {
    const m = src.match(re);
    if (!m) throw new Error('not found: ' + label);
    return m[0];
};

const code = [
    extractFn('normalizeGreek'),
    extractFn('normalizeStrong'),
    extractFn('detectQueryType'),
    extractFn('searchGreek'),
    extractFn('searchJapanese'),
    extractFn('searchStrong'),
    extractConst('_MORPH_TERM_FIELDS'),
    extractBlock(/const _MORPH_TAG_CODE = \{[\s\S]*?\n\};/, '_MORPH_TAG_CODE'),
    extractFn('_morphFieldFromTag'),
    extractFn('_resolveMorphTerm'),
    extractFn('resolveTerm'),
    extractFn('termFromQuery'),
    extractFn('resolveIndices'),
    extractFn('runProximitySearch'),
    extractFn('_verseKeyOf'),
    extractFn('runTermProximitySearch'),
].join('\n');

/* フィクスチャ: 3節。globalIdx 連番・節は連続配置 */
const T = (gi, ref, text, lemma, japanese, morph) =>
    ({ globalIdx: gi, ref, text, lemma, japanese, gloss: '', strong: '', morph });
const TOKENS = [
    /* JHN 13:34 … 互いに＋命令形（ヒットすべき） */
    T(0, 'JHN 13:34!1', 'ἐντολὴν',  'ἐντολή',  '戒め',   'N-ASF'),
    T(1, 'JHN 13:34!2', 'ἀγαπᾶτε',  'ἀγαπάω',  '愛する', 'V-PAM-2P'),
    T(2, 'JHN 13:34!3', 'ἀλλήλους', 'ἀλλήλων', '互いに', 'C-APM'),
    /* ROM 12:10 … 互いに だが命令形なし（ヒットしない） */
    T(3, 'ROM 12:10!1', 'ἀλλήλους', 'ἀλλήλων', '互いに', 'C-APM'),
    T(4, 'ROM 12:10!2', 'προηγούμενοι', 'προηγέομαι', '先んじる', 'V-PNP-NPM'),
    /* MAT 5:1 … 命令形のみ（anchor にならない） */
    T(5, 'MAT 5:1!1',  'ἴδε',      'ὁράω',    '見よ',   'V-AAM-2S'),
    /* 1TH 5:11 … 命令形が2つ（同一トークン除外の検証用） */
    T(6, '1TH 5:11!1', 'παρακαλεῖτε', 'παρακαλέω', '励ます', 'V-PAM-2P'),
    T(7, '1TH 5:11!2', 'οἰκοδομεῖτε', 'οἰκοδομέω', '建てる', 'V-PAM-2P'),
];

const sandbox = new Function('ALL_TOKENS', 'window', 'STOP_WORDS', '_ensureFullIndex', 'loadTokensForScope', `
    const IDX = { ready: false, l3Ready: false };
    const SEARCH_INDEX = null, JP_PARTIAL_INDEX = null;
    ${code}
    return { resolveTerm, runProximitySearch, runTermProximitySearch, _verseKeyOf };
`);
const api = sandbox(TOKENS, {}, new Set(), async () => {}, async () => TOKENS);

let pass = 0, fail = 0;
const check = (ok, name, detail = '') => {
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  ' + detail}`);
};

(async () => {
    const A = { axis: 'lemma', value: 'ἀλλήλων' };
    const B = { axis: 'morph', field: 'mood', value: 'imperative' };

    /* 1. verse スコープ: 互いに＋命令形 */
    const r1 = await api.runTermProximitySearch(A, B, { scope: 'verse' });
    check(r1.hits.length === 1 && r1.hits[0].anchorIdx === 2,
        'verse: 互いに＋命令形 → JHN 13:34 のみヒット',
        JSON.stringify(r1.hits.map(h => h.anchorIdx)));
    check(r1.hits[0]?.start === 0 && r1.hits[0]?.end === 2,
        'verse: hits の start/end が節境界（0..2）',
        JSON.stringify([r1.hits[0]?.start, r1.hits[0]?.end]));
    check(r1.totalW1 === 2, 'verse: totalW1 = anchor候補数（互いに×2）', String(r1.totalW1));

    /* 2. 同一トークン除外: 命令形×命令形 */
    const r2 = await api.runTermProximitySearch(B, B, { scope: 'verse' });
    /* 1TH 5:11 は命令形2つ → 両方 anchor に。JHN/MAT の単独命令形は自分しか居ないので除外 */
    check(JSON.stringify(r2.hits.map(h => h.anchorIdx)) === '[6,7]',
        'verse: anchor 自身は共起相手に数えない（単独命令形の節は不成立）',
        JSON.stringify(r2.hits.map(h => h.anchorIdx)));

    /* 3. window スコープ: 既存 runProximitySearch と完全互換（語×語） */
    const rOld = await api.runProximitySearch({ word1: 'ἀλλήλων', word2: 'ἀγαπάω', distance: 3, scope: 'all' });
    const rNew = await api.runTermProximitySearch(
        { axis: 'lemma', value: 'ἀλλήλων' }, { axis: 'lemma', value: 'ἀγαπάω' },
        { scope: 'window', distance: 3 });
    const anchorsEq = JSON.stringify(rOld.hits.map(h => [h.anchorIdx, h.start, h.end]))
        === JSON.stringify(rNew.hits.map(h => [h.anchorIdx, h.start, h.end]));
    const coocEq = JSON.stringify([...rOld.coocMap.entries()].sort())
        === JSON.stringify([...rNew.coocMap.entries()].sort());
    check(anchorsEq && coocEq && rOld.totalW1 === rNew.totalW1,
        'window: 既存 runProximitySearch と hits/coocMap/totalW1 完全一致',
        JSON.stringify({ old: rOld.hits.length, neu: rNew.hits.length, coocEq }));

    /* 4. termB なし: anchor 全件が返る（既存と同じ縮退動作） */
    const r4 = await api.runTermProximitySearch(A, null, { scope: 'verse' });
    check(r4.hits.length === 2, 'verse: termB なしは anchor 全件', String(r4.hits.length));

    /* 5. ヒットゼロの安全性 */
    const r5 = await api.runTermProximitySearch(
        { axis: 'lemma', value: 'ζζζ' }, B, { scope: 'verse' });
    check(r5.hits.length === 0 && r5.coocMap.size === 0, 'ヒットなしでも安全', '');

    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
