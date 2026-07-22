#!/usr/bin/env node
/**
 * re-phase3-regression.cjs — Reading Engine Phase 3-A（Particle Engine）回帰テスト
 *
 * 実行: node scripts/re-phase3-regression.cjs
 *       npm run test:re-phase3
 *
 * Phase 3-A は完了状態として固定済み（2026-07-16 NT全巻監査・悪化ケース0）。
 * Particle Engine（_resolveParticle / _COPULA_LEMMAS / _FINITE_MOODS）を
 * 変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する
 *
 * 範囲（Phase 3-A）: 主格 noun/pron の は/が のみ。
 *   - 対格→を・与格→に は Phase 1 Morphology の責務（ここでは扱わない）
 *   - コプラ節は全面除外（述語主格の区別は Phase 5 Semantic 領域）
 *   - は/が は clause.subordinate のみで決定（topicality 判断なし）
 *
 * Part 1: 単体回帰（6 フィルタ・ガード・凍結互換）
 * Part 2: NT 全巻基準値照合（scripts/re-phase2-audit.cjs 実行 —
 *         syntax/particle 両層を同一 audit が集計する）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Phase 3-A 凍結基準値（2026-07-16 NT全巻監査） ───────────────────
// Phase 5-D 追加（2026-07-17）: particle 3,131 → 3,123（は −5 / が −3）。
// lnGloss replace 対象の主格主語（κόσμος 41.38「世が」・σάρξ 9.11「人が」等）
// が semantic へ昇格したため。particle コード自体は不変更（lnGloss は
// base 置換後に _resolveParticle を再利用しており は/が 規則は同一）。
// 2026-07-19 J-3: αὐτός(G846) Morph Rule 追加により、主格の αὐτός 44件が
// morph 層で語幹解決（彼→彼ら/彼女/それ等）され、particle 層に到達しなくなった
// （morph が非 null を返すと短絡するため）。particle 3,123 → 3,079（は −33 / が −11）。
// これらは主格の複数・女性・中性 αὐτós で、旧「彼は/彼が」（数・性が不適合）より
// 新「彼ら/彼女/それ」の方が referent に適合する（悪化 0・chip⇔panel 一致 100%）。
// 主格での語幹＋助詞の両立（彼らは）は morph/particle 協調が必要で J-3 対象外。
// 2026-07-19 J-5: τίς(G5101) neuter→何 で主格 neuter τίς 16件が morph 短絡し
// particle 非到達。particle 3,079 → 3,063（は −16）。旧「誰は」は疑問詞への は 付与で
// 不自然（H-3a Phase 4 が指摘）であり、新「何」への解消は改善（悪化 0）。
// 2026-07-20 J-6b: 関係詞 ὅς/ὅστις/ὅσος の neuter→もの・ὅσος masc→者 で、主格の関係詞 46件が
// morph 短絡し particle 非到達。particle 3,063 → 3,017（が −46）。旧「〜する者が」は関係詞を
// 名詞句主語化する が 付与（H-3a Phase 4/5 が指摘）で、格役割は Syntax 責務。解消は悪化 0。
// 2026-07-20 M-7c: 純複数人称代名詞（私→私たち/あなた→あなたがた）で主格複数 2件が morph 短絡し
// particle 非到達。particle 3,017 → 3,015（は −1 / が −1）。旧「私は/あなたが」（単数扱い）より
// 新「私たち/あなたがた」の方が number に適合（悪化 0）。
const PHASE3A_BASELINE = {
    totalTokens: 137741,
    // M-15 反映移行(2026-07-22): 固定点2,537反映で主語代名詞(私たち/彼ら/これ 等)が は/が を得た。
    // 3015→3084（は 2170→2202 / が 845→882）。pre-reflection historical=3015（削除しない）。
    particle:    3084,
    byParticle: { 'は': 2202, 'が': 882 },
    zeroFlags: ['doubleParticle', 'brokenWaGa', 'morphMismatch'],
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { ReadingEngine } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const engine = new ReadingEngine();

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

const nn = (japanese, kase, lemma = 'X', number = 'singular') =>
    ({ class: 'noun', lemma, japanese, case: kase, number, person: '', tense: '', voice: '', mood: '' });
const pr = (japanese, kase, person = '', number = 'singular') =>
    ({ class: 'pron', lemma: 'αὐτός', japanese, case: kase, person, number, tense: '', voice: '', mood: '' });
const vb = (lemma) =>
    ({ class: 'verb', lemma, japanese: '行う', mood: 'indicative', person: '3', number: 'singular', tense: 'aorist', voice: 'active', case: '' });
const np = (s, e, h) => ({ type: 'NP', start: s, end: e, head: h, dependents: [] });
const pp = (s, e, h) => ({ type: 'PP', start: s, end: e, head: h, dependents: [] });
const MV = (over = {}) => Object.assign(
    { lemma: 'ποιέω', person: '3', number: 'singular', mood: 'indicative' }, over);
const CTX = (tokens, targetIdx, over = {}) => Object.assign({
    tokens, targetIdx, phrases: [],
    mainVerb: MV(),
    clause: { start: 0, end: tokens.length - 1, subordinate: false },
    hasPassiveVerb: false,
}, over);

function T(desc, fn, expectJa, expectSrc) {
    let r;
    try { r = fn(); } catch (e) { r = { japanese: `EXCEPTION: ${e.message}`, source: '?' }; }
    const ja  = r ? r.japanese : null;
    const src = r ? r.source : null;
    const ok  = ja === expectJa &&
        (expectSrc === undefined || src === expectSrc || expectJa === null);
    ok ? pass++ : fail++;
    if (!ok) console.log(`FAIL  ${desc}: got=${ja} [${src}] expect=${expectJa} [${expectSrc ?? ''}]`);
}

// ── 基本規則: 主節 → は / 従属節 → が
{
    const t = [nn('神', 'nominative', 'θεός'), vb('ποιέω')];
    T('主節主語 → は', () => engine.resolve(t[0], CTX(t, 0)), '神は', 'particle');
}
{
    const t = [nn('世界', 'nominative', 'κόσμος'), vb('γινώσκω')];
    T('従属節主語 → が', () => engine.resolve(t[0],
        CTX(t, 0, { clause: { start: 0, end: 1, subordinate: true } })), '世界が', 'particle');
}
{
    const t = [pr('私', 'nominative', '1'), vb('ποιέω')];
    T('1人称代名詞主語 → は', () => engine.resolve(t[0],
        CTX(t, 0, { mainVerb: MV({ person: '1' }) })), '私は', 'particle');
}

// ── 6 フィルタ（1つでも欠ければ fallback）
{
    const t = [nn('神', 'nominative', 'θεός'), vb('εἰμί')];
    T('コプラ節（εἰμί）→ fallback', () => engine.resolve(t[0],
        CTX(t, 0, { mainVerb: MV({ lemma: 'εἰμί' }) })), null);
}
{
    const t = [nn('神', 'nominative', 'θεός'), vb('γίνομαι')];
    T('コプラ節（γίνομαι）→ fallback', () => engine.resolve(t[0],
        CTX(t, 0, { mainVerb: MV({ lemma: 'γίνομαι' }) })), null);
}
{
    const t = [nn('神', 'nominative', 'θεός')];
    T('定形動詞なし → fallback', () => engine.resolve(t[0],
        CTX(t, 0, { mainVerb: MV({ mood: 'participle', person: '', number: '' }) })), null);
}
{
    const t = [nn('神', 'nominative', 'θεός'), vb('ποιέω')];
    T('数不一致 → fallback', () => engine.resolve(t[0],
        CTX(t, 0, { mainVerb: MV({ number: 'plural' }) })), null);
}
{
    const t = [pr('私', 'nominative', '1'), vb('ποιέω')];
    T('人称不一致 → fallback', () => engine.resolve(t[0], CTX(t, 0)), null);
}
{
    const t = [nn('神', 'nominative', 'θεός'), nn('人', 'nominative', 'ἄνθρωπος'), vb('ποιέω')];
    T('主語候補複数 → fallback', () => engine.resolve(t[0], CTX(t, 0)), null);
}
{
    const t = [nn('神', 'nominative', 'θεός'), vb('ποιέω')];
    T('NP 非head → fallback', () => engine.resolve(t[0],
        CTX(t, 0, { phrases: [np(0, 1, 1)] })), null);
}
{
    const t = [nn('神', 'nominative', 'θεός'), vb('ποιέω')];
    T('PP 内 → fallback', () => engine.resolve(t[0],
        CTX(t, 0, { phrases: [pp(0, 0, 0)] })), null);
}

// ── ガード
{
    const t = [pr('あれも', 'nominative'), vb('ποιέω')];
    T('末尾「も」ガード → fallback', () => engine.resolve(t[0], CTX(t, 0)), null);
}
{
    const t = [pr('ある', 'nominative'), vb('ποιέω')];
    T('「ある」ガード → fallback', () => engine.resolve(t[0], CTX(t, 0)), null);
}
{
    const t = [nn('滅びの', 'nominative', 'ἀπώλεια'), vb('ποιέω')];
    T('末尾助詞ガード → fallback', () => engine.resolve(t[0], CTX(t, 0)), null);
}
{
    const t = [nn('忌まわしいもの', 'nominative', 'βδέλυγμα'), vb('ποιέω')];
    T('「もの」例外 → ものは', () => engine.resolve(t[0], CTX(t, 0)), '忌まわしいものは', 'particle');
}

// ── 責務境界: 対格・与格・生格は Phase 1 Morphology（particle 不干渉）
{
    const t = [nn('世界', 'accusative', 'κόσμος'), vb('ποιέω')];
    T('対格+context → morph（を）', () => engine.resolve(t[0], CTX(t, 0)), '世界を', 'morph');
}
{
    const t = [nn('神', 'dative', 'θεός'), vb('ποιέω')];
    T('与格+context → morph（に）', () => engine.resolve(t[0], CTX(t, 0)), '神に', 'morph');
}
{
    const t = [nn('神', 'genitive', 'θεός'), vb('ποιέω')];
    T('生格+context → morph（の）', () => engine.resolve(t[0], CTX(t, 0)), '神の', 'morph');
}

// ── 凍結互換
T('contextなし主格 → fallback（Phase 1 互換）',
    () => engine.resolve(nn('神', 'nominative', 'θεός')), null);
{
    const t = [nn('神', 'nominative', 'θεός'), vb('ποιέω')];
    T('mainVerb 欠落 context（Phase 2 形式）→ fallback',
        () => engine.resolve(t[0], { tokens: t, targetIdx: 0, phrases: [], hasPassiveVerb: false }), null);
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（audit 実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-phase2-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'output', 're-phase2-audit.json'), 'utf8'));

check('total tokens（コーパス不変）', audit.total, PHASE3A_BASELINE.totalTokens);
check('particle 件数（基準値一致）', audit.particle, PHASE3A_BASELINE.particle);
for (const [p, count] of Object.entries(PHASE3A_BASELINE.byParticle)) {
    check(`変換内訳: ${p}`, audit.byParticle[p]?.count ?? 0, count);
}
for (const flag of PHASE3A_BASELINE.zeroFlags) {
    check(`悪化ケース 0: ${flag}`, (audit.qualityFlags[flag] || []).length, 0);
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Phase 3-A 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('Particle Engine か bible_data が変わっています。');
    console.log('意図的な改善の場合: audit で悪化ケース 0 を確認し、PHASE3A_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
