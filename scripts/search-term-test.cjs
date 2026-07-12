#!/usr/bin/env node
/**
 * search-term-test.cjs — Term 抽象（Pattern Search Phase 1）単体テスト
 *
 * 実行: node scripts/search-term-test.cjs
 *
 * search-tool.html の実物ソースから対象関数を抽出して実行する
 * （テスト用の再実装を作らない — phrase-intent-audit.cjs と同方針）。
 * 検証対象:
 *   1. resolveIndices が resolveTerm 委譲後も従来の解決関数と同一結果
 *   2. resolveTerm の morph 軸（タグ完全一致 / 分解フィールド一致）
 *   3. termFromQuery の軸分類
 *   4. 不正 Term の安全な空集合
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const src  = fs.readFileSync(
    path.join(__dirname, '..', 'public', 'search-tool.html'), 'utf8');

/* function NAME(...) { ... } をブレース対応で抽出 */
function extractFn(name) {
    const start = src.indexOf(`function ${name}(`);
    if (start < 0) throw new Error('not found: ' + name);
    let i = src.indexOf('{', start), depth = 0;
    for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    return src.slice(start, i + 1);
}
function extractConst(name) {
    const m = src.match(new RegExp(`const ${name} = [^;]+;`));
    if (!m) throw new Error('not found: ' + name);
    return m[0];
}

const code = [
    extractFn('normalizeGreek'),
    extractFn('normalizeStrong'),
    extractFn('detectQueryType'),
    extractFn('searchGreek'),
    extractFn('searchJapanese'),
    extractFn('searchStrong'),
    extractFn('buildMorphIndex'),
    extractFn('searchByMorph'),
    extractConst('_MORPH_TERM_FIELDS'),
    (() => { const m = src.match(/const _MORPH_TAG_CODE = \{[\s\S]*?\n\};/); if (!m) throw new Error('_MORPH_TAG_CODE'); return m[0]; })(),
    extractFn('_morphFieldFromTag'),
    extractFn('_resolveMorphTerm'),
    extractFn('resolveTerm'),
    extractFn('termFromQuery'),
    extractFn('resolveIndices'),
].join('\n');

/* フィクスチャ: 最小トークン集合 */
const TOKENS = [
    { globalIdx: 0, text: 'Ἀγαπᾶτε',  lemma: 'ἀγαπάω',   japanese: '愛する',  gloss: 'love',
      strong: 'G25', morph: 'V-PAM-2P', mood: 'imperative', tense: 'present', voice: 'active',
      case: '', number: 'plural', gender: '', person: '2', class: 'verb' },
    { globalIdx: 1, text: 'ἀλλήλους', lemma: 'ἀλλήλων',  japanese: '互いに', gloss: 'one another',
      strong: 'G240', morph: 'C-APM', mood: '', tense: '', voice: '',
      case: 'accusative', number: 'plural', gender: 'masculine', person: '', class: 'pron' },
    { globalIdx: 2, text: 'ἵνα',      lemma: 'ἵνα',      japanese: '〜ために', gloss: 'so that',
      strong: 'G2443', morph: 'CONJ', mood: '', tense: '', voice: '',
      case: '', number: '', gender: '', person: '', class: 'conj' },
    { globalIdx: 3, text: 'ἀγαπῶμεν', lemma: 'ἀγαπάω',   japanese: '愛する', gloss: 'we love',
      strong: 'G25', morph: 'V-PAS-1P', mood: 'subjunctive', tense: 'present', voice: 'active',
      case: '', number: 'plural', gender: '', person: '1', class: 'verb' },
    /* search-tool 実データ形状: morphタグのみ・平坦フィールドなし */
    { globalIdx: 4, text: 'φεῦγε',    lemma: 'φεύγω',    japanese: '逃げる', gloss: 'flee',
      strong: 'G5343', morph: 'V-PAM-2S' },
    { globalIdx: 5, text: 'λέγων',    lemma: 'λέγω',     japanese: '言う',   gloss: 'saying',
      strong: 'G3004', morph: 'V-PAP-NSM' },
    { globalIdx: 6, text: 'αὐτοῦ',   lemma: 'αὐτός',    japanese: '彼',     gloss: 'his',
      strong: 'G846', morph: 'P-GSM' },
];

/* サンドボックス（IDX 等は線形走査パスを通すスタブ） */
const sandbox = new Function('ALL_TOKENS', 'window', `
    const IDX = { ready: false, l3Ready: false };
    const SEARCH_INDEX = null, JP_PARTIAL_INDEX = null;
    ${code}
    return { searchGreek, searchJapanese, searchStrong, buildMorphIndex,
             _resolveMorphTerm, resolveTerm, termFromQuery, resolveIndices };
`);
const win = {};
const api = sandbox(TOKENS, win);
win.morphIndex = api.buildMorphIndex(TOKENS);

let pass = 0, fail = 0;
function eq(name, actual, expected) {
    const a = JSON.stringify([...actual].sort((x, y) => x - y));
    const e = JSON.stringify(expected);
    const ok = a === e;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `  got=${a} want=${e}`}`);
}

/* 1. resolveIndices 後方互換（委譲後 ≡ 従来の直接呼び出し） */
eq('後方互換: 日本語クエリ ≡ searchJapanese',
    api.resolveIndices(TOKENS, '愛'), [...api.searchJapanese(TOKENS, '愛')].sort((a,b)=>a-b));
eq('後方互換: Strong ≡ searchStrong',
    api.resolveIndices(TOKENS, 'G25'), [...api.searchStrong(TOKENS, 'G25')].sort((a,b)=>a-b));
eq('後方互換: ギリシャ語 ≡ searchGreek',
    api.resolveIndices(TOKENS, 'ἀγαπάω'), [...api.searchGreek(TOKENS, 'ἀγαπάω')].sort((a,b)=>a-b));

/* 2. termFromQuery の軸分類 */
console.log((api.termFromQuery('愛').axis === 'japanese' ? 'PASS' : 'FAIL') + '  termFromQuery: 日本語 → japanese'); api.termFromQuery('愛').axis === 'japanese' ? pass++ : fail++;
console.log((api.termFromQuery('G25').axis === 'strong' ? 'PASS' : 'FAIL') + '  termFromQuery: G25 → strong'); api.termFromQuery('G25').axis === 'strong' ? pass++ : fail++;
console.log((api.termFromQuery('ἵνα').axis === 'lemma' ? 'PASS' : 'FAIL') + '  termFromQuery: ギリシャ語 → lemma'); api.termFromQuery('ἵνα').axis === 'lemma' ? pass++ : fail++;

/* 3. Term 各軸の解決 */
eq('Term lemma', api.resolveTerm(TOKENS, { axis: 'lemma', value: 'ἀγαπάω' }), [0, 3]);
eq('Term japanese', api.resolveTerm(TOKENS, { axis: 'japanese', value: '互いに' }), [1]);
eq('Term strong', api.resolveTerm(TOKENS, { axis: 'strong', value: 'G2443' }), [2]);
eq('Term morph タグ完全一致（morphIndex 経由）',
    api.resolveTerm(TOKENS, { axis: 'morph', value: 'V-PAM-2P' }), [0]);
eq('Term morph field: mood=imperative（平坦フィールド＋タグ解読の両対応）',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'mood', value: 'imperative' }), [0, 4]);
eq('Term morph field: mood=subjunctive',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'mood', value: 'subjunctive' }), [3]);
eq('Term morph field: case=accusative',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'case', value: 'accusative' }), [1]);
eq('Term morph field: pos=V（タグ接頭辞）',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'pos', value: 'v' }), [0, 3, 4, 5]);
eq('Term morph field: タグ解読 mood=M（1文字コード直接）',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'mood', value: 'M' }), [0, 4]);
eq('Term morph field: 分詞タグの case=nominative（V-PAP-NSM）',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'case', value: 'nominative' }), [5]);
eq('Term morph field: 名詞類タグの gender=masculine（P-GSM）',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'gender', value: 'masculine' }), [1, 5, 6]);
eq('Term morph field: タグのみトークンの genitive',
    api.resolveTerm(TOKENS, { axis: 'morph', field: 'case', value: 'genitive' }), [6]);

/* 4. 不正 Term は空集合（例外を投げない） */
eq('不正: axis 不明', api.resolveTerm(TOKENS, { axis: 'unknown', value: 'x' }), []);
eq('不正: 空 value', api.resolveTerm(TOKENS, { axis: 'lemma', value: '' }), []);
eq('不正: null term', api.resolveTerm(TOKENS, null), []);
eq('不正: morph field 不明', api.resolveTerm(TOKENS, { axis: 'morph', field: 'bogus', value: 'x' }), []);

/* 5. 将来拡張（共起）の型確認: Set 同士で積が取れる */
{
    const a = api.resolveTerm(TOKENS, { axis: 'japanese', value: '愛する' });
    const b = api.resolveTerm(TOKENS, { axis: 'morph', field: 'mood', value: 'imperative' });
    const inter = [...a].filter(gi => b.has(gi));
    eq('共起素材: Set 積（愛する ∩ 命令形）', new Set(inter), [0]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
