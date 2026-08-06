#!/usr/bin/env node
/**
 * re-semantic-completion-regression.cjs — Semantic Completion（Stage L-4c）回帰テスト
 *
 * 実行: node scripts/re-semantic-completion-regression.cjs
 *       npm run test:re-semantic-completion
 *
 * 対象:
 *   - getSemanticInfo(token)  Stage L-4c（決定的意味情報の read-only 読み取り）
 *
 * 設計正典:
 *   docs/development/semantic-completion-design.md（L-4b）
 *   docs/archive/semantic-completion-implementation-report.md（L-4c、FROZEN候補 2026-07-20）
 *
 * L-4c は「既存注釈・形態・構造（ln/strong/morph/class/role/lemma）から決定的に導ける
 * 意味情報のみを read-only で返す」情報層であり、resolve() の japanese 出力は一切変えない
 * （バイト等価）。推論しない・非決定的は付与しない（未判定=欠落）。本テストはこの読み取り
 * ロジック自体（6情報種の正例・4未判定系統の非付与・安全 fallback）を検証する。
 * 変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する（崩れる場合は
 *      悪化 0・推論混入 0 を監査で確認した上で SEMANTIC_COMPLETION_BASELINE を更新する）
 *
 * Part 1: 単体回帰（6情報種の正例・4未判定系統・安全 fallback）
 * Part 2: NT 全巻基準値照合（bible_data を直接走査し getSemanticInfo を全トークンへ
 *         適用・集計。ESM-53-A で 2026-07-20 版報告値との完全一致を実測確認済みの
 *         数値を基準値とする）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');

// ── Semantic Completion 凍結基準値（2026-07-20 実装報告 / ESM-53-A で現行 bible_data と
//    完全一致することを実測確認済み） ─────────────────────────────────────────
const SEMANTIC_COMPLETION_BASELINE = {
    totalTokens:     137741,
    semanticInfoAny: 129022,   // 93.7%
    lnDomain:        128493,   // 93.3%
    interrogative:   555,
    indefinite:      530,
    reflexivePerson: 408,
    intensive:       85,
    deixis:          1687,
    adverbial:       79,
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { ReadingEngine } = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
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

const tok = (over = {}) => Object.assign(
    { strong: '', lemma: '', class: '', role: '', morph: '', ln: '' }, over);

// ── 6情報種の正例 ─────────────────────────────────────────────────
{
    const t = tok({ ln: '57.228 1.2' });
    check('L-4c: lnDomain（ln 先頭区画）', engine.getSemanticInfo(t).lnDomain, '57.228');
}
{
    const t = tok({ strong: 'G5101', lemma: 'τίς', class: 'pron' });
    check('L-4c: pronType=interrogative（τίς G5101）',
        engine.getSemanticInfo(t).pronType, 'interrogative');
}
{
    const t = tok({ strong: 'G5100', lemma: 'τις', class: 'pron' });
    check('L-4c: pronType=indefinite（τις G5100）',
        engine.getSemanticInfo(t).pronType, 'indefinite');
}
{
    const t = tok({ strong: 'G1683', lemma: 'ἐμαυτοῦ', class: 'pron', morph: 'F-1S---NM-' });
    check('L-4c: reflexivePerson=1（ἐμαυτοῦ morph F-1）',
        engine.getSemanticInfo(t).reflexivePerson, 1);
}
{
    const t = tok({ strong: 'G4572', lemma: 'σεαυτοῦ', class: 'pron', morph: 'F-2S---NM-' });
    check('L-4c: reflexivePerson=2（σεαυτοῦ morph F-2）',
        engine.getSemanticInfo(t).reflexivePerson, 2);
}
{
    const t = tok({ strong: 'G1438', lemma: 'ἑαυτοῦ', class: 'pron', morph: 'F-3S---NM-' });
    check('L-4c: reflexivePerson=3（ἑαυτοῦ morph F-3）',
        engine.getSemanticInfo(t).reflexivePerson, 3);
}
{
    const t = tok({ strong: 'G846', lemma: 'αὐτός', class: 'adj' });
    check('L-4c: intensive=true（αὐτός class=adj のみ決定的）',
        engine.getSemanticInfo(t).intensive, true);
}
{
    // class=pron の αὐτός は intensive/anaphoric の区別が決定的でない → 未判定（付与しない）
    const t = tok({ strong: 'G846', lemma: 'αὐτός', class: 'pron' });
    check('L-4c: αὐτός class=pron は intensive を付与しない（未判定・推論しない）',
        engine.getSemanticInfo(t), null);
}
{
    const t = tok({ lemma: 'οὗτος', class: 'pron' });
    check('L-4c: deixis=near（οὗτος）', engine.getSemanticInfo(t).deixis, 'near');
}
{
    const t = tok({ lemma: 'ἐκεῖνος', class: 'pron' });
    check('L-4c: deixis=far（ἐκεῖνος）', engine.getSemanticInfo(t).deixis, 'far');
}
{
    const t = tok({ lemma: 'τοιοῦτος', class: 'pron' });
    check('L-4c: deixis=qualitative（τοιοῦτος）', engine.getSemanticInfo(t).deixis, 'qualitative');
}
{
    const t = tok({ strong: 'G5101', lemma: 'τίς', class: 'pron', role: 'adv' });
    const r = engine.getSemanticInfo(t);
    check('L-4c: adverbial=true（τίς role=adv、副詞的τί）', r.adverbial, true);
    check('L-4c: adverbial 発火時も pronType=interrogative は併存', r.pronType, 'interrogative');
}
{
    // role=adv でなければ adverbial は付与しない
    const t = tok({ strong: 'G5101', lemma: 'τίς', class: 'pron', role: 's' });
    check('L-4c: τίς role=s（非adv）→ adverbial 未付与',
        engine.getSemanticInfo(t).adverbial, undefined);
}

// ── 未判定系統（4種、推論せず付与しない） ────────────────────────────
{
    // ἑαυτοῦ が morph F 桁なし（G848 の person-leveling 残）→ reflexivePerson 未判定
    const t = tok({ strong: 'G848', lemma: 'ἑαυτοῦ', class: 'pron', morph: 'P---SM-' });
    check('L-4c: ἑαυτοῦ(G848) morph F 桁なし → reflexivePerson 未付与',
        engine.getSemanticInfo(t), null);
}
{
    // ln 未注釈 → lnDomain 未付与
    const t = tok({ ln: '' });
    check('L-4c: ln 未注釈 → lnDomain 未付与（null）', engine.getSemanticInfo(t), null);
}
{
    // discourse 系（この/その/あの の精緻化）は本アクセサの対象外 = 常に未実装（安全側）
    // deixis は付与されるが、談話上の pronominal/adnominal 区別（Builder 側 M-8d 責務）は
    // 本アクセサに含まれないことを確認する。
    const t = tok({ lemma: 'οὗτος', class: 'pron' });
    const r = engine.getSemanticInfo(t);
    check('L-4c: deixis は返るが discourse 区別（pronominal/adnominal）は持たない',
        Object.prototype.hasOwnProperty.call(r, 'discourse'), false);
}

// ── 安全 fallback ────────────────────────────────────────────────
check('L-4c: token null → null', engine.getSemanticInfo(null), null);
check('L-4c: token undefined → null', engine.getSemanticInfo(undefined), null);
check('L-4c: 全フィールド空 → null', engine.getSemanticInfo(tok()), null);

// ── resolve() への read-only 付帯確認（japanese は不変であること） ───────
{
    // 既存 Phase 1（J-5）確定挙動: τίς 男性対格 → 誰を（re-phase1-regression.cjs 準拠）
    const t = { class: 'pron', japanese: '誰', strong: 'G5101', lemma: '',
                gender: 'masculine', number: 'singular', case: 'accusative',
                tense: '', voice: '', mood: '', role: '' };
    const r = engine.resolve(t, { tokens: [t], targetIdx: 0, phrases: [], hasPassiveVerb: false });
    check('resolve(): japanese は既存 Phase 1 挙動のまま（L-4c で書き換わらない）',
        r.japanese, '誰を');
    check('resolve(): semanticInfo が read-only 付帯される（interrogative）',
        r.semanticInfo && r.semanticInfo.pronType, 'interrogative');
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（bible_data 直接走査） ──');

const allTokens = [];
for (const book of fs.readdirSync(NT_DIR)) {
    const bookPath = path.join(NT_DIR, book);
    if (!fs.statSync(bookPath).isDirectory()) continue;
    for (const file of fs.readdirSync(bookPath).filter((f) => f.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(bookPath, file), 'utf8'));
        for (const t of arr) allTokens.push(t);
    }
}

let semanticAny = 0, lnDomain = 0, interrogative = 0, indefinite = 0,
    reflexivePerson = 0, intensive = 0, deixis = 0, adverbial = 0;

for (const t of allTokens) {
    const si = engine.getSemanticInfo(t);
    if (!si) continue;
    semanticAny++;
    if (si.lnDomain) lnDomain++;
    if (si.pronType === 'interrogative') interrogative++;
    if (si.pronType === 'indefinite') indefinite++;
    if (si.reflexivePerson) reflexivePerson++;
    if (si.intensive) intensive++;
    if (si.deixis) deixis++;
    if (si.adverbial) adverbial++;
}

check('total tokens（コーパス不変）', allTokens.length, SEMANTIC_COMPLETION_BASELINE.totalTokens);
check('L-4c: semanticInfo付与', semanticAny, SEMANTIC_COMPLETION_BASELINE.semanticInfoAny);
check('L-4c: lnDomain', lnDomain, SEMANTIC_COMPLETION_BASELINE.lnDomain);
check('L-4c: pronType=interrogative', interrogative, SEMANTIC_COMPLETION_BASELINE.interrogative);
check('L-4c: pronType=indefinite', indefinite, SEMANTIC_COMPLETION_BASELINE.indefinite);
check('L-4c: reflexivePerson', reflexivePerson, SEMANTIC_COMPLETION_BASELINE.reflexivePerson);
check('L-4c: intensive', intensive, SEMANTIC_COMPLETION_BASELINE.intensive);
check('L-4c: deixis', deixis, SEMANTIC_COMPLETION_BASELINE.deixis);
check('L-4c: adverbial', adverbial, SEMANTIC_COMPLETION_BASELINE.adverbial);

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Semantic Completion（L-4c）基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('getSemanticInfo か bible_data の注釈が変わっています。');
    console.log('意図的な改善の場合: 悪化0・推論混入0を確認した上で SEMANTIC_COMPLETION_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
