#!/usr/bin/env node
/**
 * re-phase2-regression.cjs — Reading Engine Phase 2-A（Syntax Layer）回帰テスト
 *
 * 実行: node scripts/re-phase2-regression.cjs
 *       npm run test:re-phase2
 *
 * Phase 2-A は完了状態として固定済み（2026-07-16 NT全巻監査・悪化ケース0）。
 * Syntax Layer（_resolveSyntax / _PREP_PARTICLE / _EN_DATIVE_LEMMAS / _AGENT_PREP）
 * を変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する
 *
 * Phase 2-B 以降の拡張は Phase 2-A テーブルを変更せず「追加方式」で行う。
 * 新しい前置詞の追加で syntax 件数が増えた場合は、監査で悪化ケース 0 を
 * 確認した上で PHASE2A_BASELINE を更新する（既存 6 エントリの内訳件数は
 * 追加方式なら変わらないはず — 変わったら既存処理を壊している）。
 *
 * Part 1: 単体回帰（合成 context による前置詞×格・ガード・fallback 経路）
 * Part 2: NT 全巻基準値照合（scripts/re-phase2-audit.cjs 実行）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Phase 2-A + 2-B 凍結基準値（2026-07-16 NT全巻監査） ─────────────
// 2-B 追加（2026-07-16）: syntax 3,210 → 4,266（+1,056）。
// 2-A の 6 エントリ内訳は追加前後で不変であることを確認済み（追加方式の実証）。
// Phase 5-A 追加（2026-07-17）: syntax 4,266 → 4,213（−53）。
// εἰς τὸν αἰῶνα の head（αἰών）53 件が semantic 層（慣用句「永遠に」）へ
// 昇格したため。syntax コード自体は不変更（semantic 不発時は従来どおり
// εἰς→へ が発火する。単体回帰で維持を検証）。
// Phase 5-D 追加（2026-07-17）: syntax 4,213 → 4,194（−19）。
// lnGloss replace 対象（κόσμος 41.38 等）の PP head が semantic へ昇格
// （εἰς −4 / ἐκ −14 / ἀπό −1。出力は base 置換後に syntax を再利用するため
// 「世から」等の前置詞助詞は維持される）。
const PHASE2A_BASELINE = {
    totalTokens: 137741,
    // M-15 反映移行(2026-07-22): 固定点2,537反映で一部トークンの base 変化により syntax 再利用が増加。
    // 4194→4208。pre-reflection historical=4194（data-role-migration-freeze・削除しない）。
    syntax:      4208,
    byPrep: {
        // Phase 2-A（FROZEN）※ εἰς/ἐκ/ἀπό は 5-A/5-D の semantic 昇格分を控除
        // M-15 反映移行: εἰς|accusative 1449→1458 / περί|genitive 226→229 / μετά|accusative 35→37
        'εἰς|accusative': 1458,
        'ἐκ|genitive':     752,
        'ἀπό|genitive':    545,
        'ἐν|dative':       146,
        'ὑπό|genitive':    130,
        'σύν|dative':      116,
        // Phase 2-B（FROZEN）
        'διά|genitive':    351,
        'μετά|genitive':   336,
        'περί|genitive':   229,
        'παρά|genitive':    78,
        'μετά|accusative':  37,
        'πρό|genitive':     30,
    },
    zeroFlags: ['doubleParticle', 'morphMismatch'],
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { ReadingEngine, ResolveSource } =
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
// Part 1: 単体回帰（合成 context）
// ══════════════════════════════════════════════════════════════════
console.log('── Part 1: 単体回帰 ──');

const prep = (lemma) => ({ class: 'prep', lemma, japanese: '〜', case: '', tense: '', voice: '', mood: '' });
const det  = (kase)  => ({ class: 'det', lemma: 'ὁ', japanese: '［冠詞］', case: kase, tense: '', voice: '', mood: '' });
const nn   = (japanese, kase, lemma = 'X') =>
    ({ class: 'noun', lemma, japanese, case: kase, tense: '', voice: '', mood: '' });
const pr   = (japanese, kase) =>
    ({ class: 'pron', lemma: 'αὐτός', japanese, case: kase, tense: '', voice: '', mood: '' });
const pp   = (start, end, head) => ({ type: 'PP', start, end, head, dependents: [] });
const ctx  = (tokens, targetIdx, phrases, hasPassiveVerb = false) =>
    ({ tokens, targetIdx, phrases, hasPassiveVerb });

function T(desc, fn, expectJa, expectSrc) {
    let r;
    try { r = fn(); } catch (e) { r = { japanese: `EXCEPTION: ${e.message}`, source: '?' }; }
    const ja  = r ? r.japanese : null;
    const src = r ? r.source : null;
    const okJa  = ja === expectJa;
    const okSrc = expectSrc === undefined || src === expectSrc ||
                  (expectJa === null && src === null);
    (okJa && okSrc) ? pass++ : fail++;
    if (!(okJa && okSrc)) {
        console.log(`FAIL  ${desc}: got=${ja} [${src}] expect=${expectJa} [${expectSrc ?? ''}]`);
    }
}

// ── 採用テーブル（Phase 2-A 凍結対象）
{
    const t = [prep('ἐκ'), pr('彼', 'genitive')];
    T('ἐκ+属格 → から', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '彼から', 'syntax');
}
{
    const t = [prep('ἀπό'), nn('神', 'genitive', 'θεός')];
    T('ἀπό+属格 → から', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '神から', 'syntax');
}
{
    const t = [prep('εἰς'), det('accusative'), nn('世界', 'accusative', 'κόσμος')];
    T('εἰς+対格 → へ', () => engine.resolve(t[2], ctx(t, 2, [pp(0, 2, 2)])), '世界へ', 'syntax');
}
{
    const t = [prep('σύν'), pr('彼', 'dative')];
    T('σύν+与格 → と共に', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '彼と共に', 'syntax');
}
// ── ὑπό: 受動の有無で分岐
{
    const t = [prep('ὑπό'), pr('彼', 'genitive')];
    T('ὑπό+属格+受動 → によって', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)], true)), '彼によって', 'syntax');
    T('ὑπό+属格+受動なし → morph', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)], false)), '彼の', 'morph');
}
// ── ἐν+与格: ホワイトリスト（Χριστός / κύριος / Ἰησοῦς / θεός）
{
    const t = [prep('ἐν'), nn('キリスト', 'dative', 'Χριστός')];
    T('ἐν Χριστῷ → にあって', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), 'キリストにあって', 'syntax');
}
{
    const t = [prep('ἐν'), nn('主', 'dative', 'κύριος')];
    T('ἐν κυρίῳ → にあって', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '主にあって', 'syntax');
}
{
    const t = [prep('ἐν'), nn('神', 'dative', 'θεός')];
    T('ἐν θεῷ → にあって', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '神にあって', 'syntax');
}
{
    const t = [prep('ἐν'), nn('水', 'dative', 'ὕδωρ')];
    T('ἐν+WL外 → 既存出力維持（morph）', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '水に', 'morph');
}
// ── Phase 2-B 追加テーブル（2026-07-16 凍結）
{
    const t = [prep('μετά'), pr('彼', 'genitive')];
    T('2-B: μετά+属格 → と共に', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '彼と共に', 'syntax');
}
{
    const t = [prep('μετά'), nn('日', 'accusative', 'ἡμέρα')];
    T('2-B: μετά+対格 → の後で', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '日の後で', 'syntax');
}
{
    const t = [prep('περί'), nn('罪', 'genitive', 'ἁμαρτία')];
    T('2-B: περί+属格 → について', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '罪について', 'syntax');
}
{
    const t = [prep('πρό'), nn('基', 'genitive', 'καταβολή')];
    T('2-B: πρό+属格 → の前に', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '基の前に', 'syntax');
}
{
    const t = [prep('διά'), nn('信仰', 'genitive', 'πίστις')];
    T('2-B: διά+属格 → を通して', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '信仰を通して', 'syntax');
}
{
    const t = [prep('παρά'), nn('父', 'genitive', 'πατήρ')];
    T('2-B: παρά+属格 → から', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '父から', 'syntax');
}
// ── Phase 2-B 保留（Semantic Layer 領域 → fallback 維持）
{
    const t = [prep('διά'), nn('名', 'accusative', 'ὄνομα')];
    T('2-B保留: διά+対格 → morph', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '名を', 'morph');
}
{
    const t = [prep('παρά'), nn('神', 'dative', 'θεός')];
    T('2-B保留: παρά+与格 → morph', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '神に', 'morph');
}
{
    const t = [prep('παρά'), nn('海', 'accusative', 'θάλασσα')];
    T('2-B保留: παρά+対格 → morph', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '海を', 'morph');
}
{
    const t = [prep('περί'), nn('腰', 'accusative', 'ὀσφῦς')];
    T('2-B保留: περί+対格 → morph', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '腰を', 'morph');
}
// ── 多義前置詞はテーブル外 → fallback（morph）
{
    const t = [prep('ἐπί'), nn('地', 'genitive', 'γῆ')];
    T('ἐπί → fallback（morph）', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '地の', 'morph');
}
{
    const t = [prep('πρός'), nn('神', 'accusative', 'θεός')];
    T('πρός → fallback（morph）', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), '神を', 'morph');
}
// ── 2-B ガード継承（末尾助詞ガードが 2-B テーブルにも効く）
{
    const t = [prep('μετά'), nn('これらの', 'genitive', 'οὗτος')];
    T('2-B: 末尾助詞ガード継承', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), null);
}
// ── ガード群
{
    const t = [prep('ἐκ'), nn('滅びの', 'genitive', 'ἀπώλεια')];
    T('末尾助詞ガード → fallback', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), null);
}
{
    const t = [prep('ἐκ'), pr('ある', 'genitive')];
    T('「ある」ガード → fallback', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 1, 1)])), null);
}
{
    const t = [prep('ἐκ'), det('genitive'), nn('水', 'genitive', 'ὕδωρ')];
    T('PP内の非head → syntax不適用', () => engine.resolve(t[1], ctx(t, 1, [pp(0, 2, 2)])), null);
}
{
    const t = [prep('ἐκ')];
    T('目的語なしPP → 安全にskip', () => engine.resolve(t[0], ctx(t, 0, [pp(0, 0, 0)])), null);
}
// ── context なし → Phase 1 完全互換
T('contextなし = Phase 1 互換（morph）',
    () => engine.resolve(nn('神', 'genitive', 'θεός')), '神の', 'morph');
T('contextなし = Phase 1 互換（fallback）',
    () => engine.resolve(nn('神', 'nominative', 'θεός')), null);
// ── 不正 context は安全に無視
{
    const t = [prep('ἐκ'), nn('神', 'genitive', 'θεός')];
    T('token不一致context → morph', () => engine.resolve(nn('神', 'genitive', 'θεός'), ctx(t, 1, [pp(0, 1, 1)])), '神の', 'morph');
    T('phrases欠落context → morph', () => engine.resolve(t[1], { tokens: t, targetIdx: 1 }), '神の', 'morph');
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

check('total tokens（コーパス不変）', audit.total, PHASE2A_BASELINE.totalTokens);
check('syntax 件数（基準値一致）', audit.syntax, PHASE2A_BASELINE.syntax);
for (const [key, count] of Object.entries(PHASE2A_BASELINE.byPrep)) {
    check(`変換内訳: ${key}`, audit.byPrep[key]?.count ?? 0, count);
}
for (const flag of PHASE2A_BASELINE.zeroFlags) {
    check(`悪化ケース 0: ${flag}`, (audit.qualityFlags[flag] || []).length, 0);
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Phase 2-A/2-B 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('Syntax Layer か bible_data が変わっています。');
    console.log('Phase 2-B の追加なら既存 6 エントリの内訳は変わらないはず — 変わった場合は既存処理を壊しています。');
    console.log('意図的な改善の場合: audit で悪化ケース 0 を確認し、PHASE2A_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
