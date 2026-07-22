#!/usr/bin/env node
/**
 * re-stageA-regression.cjs — Stage A（Phrase Renderer）回帰テスト
 *
 * 実行: node scripts/re-stageA-regression.cjs
 *       npm run test:re-stageA
 *
 * Stage A は 2026-07-17 の NT 全巻差分監査・実表示レビューで固定。
 * PhraseRenderer（core/phrase-renderer.js）を変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合（re-stageA-audit.cjs）が PASS することを確認する
 *
 * 設計正典: docs/phrase-rendering.md
 *   - Renderer は日本語を決定しない（Engine 出力の句整形のみ）
 *   - 冠詞スキップ / PP は前置詞トークンスキップ・句末省略なし
 *   - NP/PtcP/単語引用は句末の を・は・が・に を省略（の は保持）
 *   - NP は「属格修飾語 → 中心語」へ並べ替え / 固有名詞同格連鎖の の 整形
 *
 * Part 1: 単体回帰（整形規則）
 * Part 2: NT 全巻基準値照合（引用差分監査の凍結値）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Stage A 凍結基準値（2026-07-17 NT全巻差分監査） ─────────────────
const STAGEA_BASELINE = {
    quotes:    23101,
    // M-15 反映移行(2026-07-22): 固定点2,537反映で一部が反映後 Data と一致化。
    // identical 2163→2174 / changed 20936→20925。pre-reflection historical=2163/20936（削除しない）。
    identical:  2174,
    changed:   20925,
    newSilent:     2,   // 旧「［冠詞］［冠詞］」のみの引用 2 件が正しく沈黙
    newKanshi:     0,   // 新引用への ［冠詞］ 混入は常に 0
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { PhraseRenderer } = requireCjs(path.join(PUBLIC, 'core', 'phrase-renderer.js'));
const R = PhraseRenderer.renderQuote;

let pass = 0, fail = 0;
function check(desc, actual, expect) {
    const ok = actual === expect;
    ok ? pass++ : fail++;
    if (!ok) console.log(`FAIL  ${desc}: got=${JSON.stringify(actual)} expect=${JSON.stringify(expect)}`);
    return ok;
}

// ══════════════════════════════════════════════════════════════════
// Part 1: 単体回帰
// ══════════════════════════════════════════════════════════════════
console.log('── Part 1: 単体回帰 ──');

const tok = (cls, japanese, kase = '', type = 'common') =>
    ({ class: cls, japanese, case: kase, type });
const mk = (map) => (i) => map[i] ?? null;

// 冠詞スキップ + NP 属格並べ替え + 句末省略
{
    const w = [tok('det', '［冠詞］'), tok('noun', 'ことば', 'accusative'),
               tok('det', '［冠詞］'), tok('noun', '神', 'genitive')];
    check('NP: 神のことば（冠詞スキップ・並べ替え・を省略）',
        R({ type: 'NP', start: 0, end: 3, head: 3 }, 3, w, mk({ 1: 'ことばを', 3: '神の' })), '神のことば');
}
{
    const w = [tok('det', '［冠詞］'), tok('noun', '教会', 'dative'),
               tok('det', '［冠詞］'), tok('noun', '神', 'genitive')];
    check('NP: 神の教会（に省略）',
        R({ type: 'NP', start: 0, end: 3, head: 3 }, 3, w, mk({ 1: '教会に', 3: '神の' })), '神の教会');
}
// PP: 前置詞トークンスキップ・句末省略なし（Engine 出力そのまま）
{
    const w = [tok('prep', '〜から'), tok('det', '［冠詞］'), tok('noun', '世界', 'genitive')];
    check('PP: 世から（Engine 出力保持）',
        R({ type: 'PP', start: 0, end: 2, head: 2 }, 2, w, mk({ 2: '世から' })), '世から');
}
{
    const w = [tok('prep', '〜のもとに'), tok('det', '［冠詞］'), tok('noun', '神', 'accusative')];
    check('PP: 神を（Engine 未対応前置詞・省略なし）',
        R({ type: 'PP', start: 0, end: 2, head: 2 }, 2, w, mk({ 2: '神を' })), '神を');
}
{
    const w = [tok('prep', '〜の中に'), tok('noun', 'コリント', 'dative', 'proper')];
    check('PP: コリントに（に保持）',
        R({ type: 'PP', start: 0, end: 1, head: 1 }, 1, w, mk({ 1: 'コリントに' })), 'コリントに');
}
// 固有名詞同格連鎖の の 整形
{
    const w = [tok('noun', '主', 'genitive', 'common'), tok('noun', 'イエス', 'genitive', 'proper'),
               tok('noun', 'キリスト', 'genitive', 'proper')];
    check('同格連鎖: 主イエスキリストの',
        R({ type: 'GenP', start: 0, end: 2, head: 2 }, 2, w,
            mk({ 0: '主の', 1: 'イエスの', 2: 'キリストの' })), '主イエスキリストの');
}
{
    const w = [tok('noun', '主', 'genitive', 'common'), tok('pron', '私たち', 'genitive'),
               tok('noun', 'イエス', 'genitive', 'proper')];
    check('代名詞の所有「の」は保持',
        R({ type: 'GenP', start: 0, end: 2, head: 2 }, 2, w,
            mk({ 0: '主の', 1: '私たちの', 2: 'イエスの' })), '主の私たちのイエスの');
}
{
    const w = [tok('noun', '神', 'genitive', 'common'), tok('noun', '希望', 'genitive', 'common')];
    check('common 同士の属格連鎖は保持',
        R({ type: 'GenP', start: 0, end: 1, head: 1 }, 1, w,
            mk({ 0: '神の', 1: '希望の' })), '神の希望の');
}
// GenP: 句末の の 保持（関係文用）
{
    const w = [tok('det', '［冠詞］'), tok('noun', '神', 'genitive')];
    check('GenP: 神の（の保持）',
        R({ type: 'GenP', start: 0, end: 1, head: 1 }, 1, w, mk({ 1: '神の' })), '神の');
}
// 単語引用 + fallback + 静寂
{
    const w = [tok('noun', '申し開き', 'accusative')];
    check('単語: 申し開き（を省略）',
        R({ type: '', start: 0, end: 0 }, 0, w, mk({ 0: '申し開きを' })), '申し開き');
}
{
    const w = [tok('noun', '御心', 'genitive')];
    check('fallback: resolveWord null → w.japanese',
        R({ type: '', start: 0, end: 0 }, 0, w, mk({})), '御心');
}
{
    const w = [tok('det', '［冠詞］')];
    check('冠詞のみ → null（静寂）',
        R({ type: 'NP', start: 0, end: 0 }, 0, w, mk({})), null);
}
check('不正入力 → null', R(null, 0, [], mk({})), null);
// PtcP: 分詞形（Engine 出力）
{
    const w = [tok('det', '［冠詞］'), tok('verb', '呼ぶ')];
    check('PtcP: 呼びながら（冠詞スキップ・Engine 分詞形）',
        R({ type: 'PtcP', start: 0, end: 1, head: 1 }, 1, w, mk({ 1: '呼びながら' })), '呼びながら');
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（差分監査 実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-stageA-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'output', 're-stageA-audit.json'), 'utf8')).stats;

check('引用対象句（コーパス・句検出不変）', audit.quotes, STAGEA_BASELINE.quotes);
check('一致件数', audit.identical, STAGEA_BASELINE.identical);
check('変更件数', audit.changed, STAGEA_BASELINE.changed);
check('新規沈黙（旧冠詞ゴミのみ）', audit.newSilent, STAGEA_BASELINE.newSilent);
check('新引用の ［冠詞］ 混入 0', audit.newKanshi, STAGEA_BASELINE.newKanshi);

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Stage A 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('PhraseRenderer か Engine 出力（引用経由）か bible_data が変わっています。');
    console.log('意図的な改善の場合: 差分監査のサンプルをレビューし、STAGEA_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
