#!/usr/bin/env node
/**
 * re-stageB-regression.cjs — Stage B（Flow Renderer）回帰テスト
 *
 * 実行: node scripts/re-stageB-regression.cjs
 *       npm run test:re-stageB
 *
 * Stage B は 2026-07-17 の NT 全巻差分監査で固定。
 * Flow chip（index.html __FLOW_CHIP__ 区間）を変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合（re-stageB-audit.cjs）が PASS することを確認する
 *
 * 設計正典: docs/flow-rendering.md
 *   - Reading Engine が日本語の SSOT。Flow Renderer は日本語を決定しない
 *   - Tier 0: resolved.japanese / Tier 1: 素の w.japanese（_naturalize 不適用）/
 *     Tier 2: resolved 未指定（旧呼び出し）= 従来動作（rollback）
 *   - 表示メタ（roleClass/signals/morphText/phraseBreakBefore）は Flow の責務
 *
 * Part 1: 単体回帰（Tier 分岐・表示メタ不変・既存呼び出し互換）
 * Part 2: NT 全巻基準値照合
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

// ── Stage B 凍結基準値（2026-07-17 NT全巻差分監査） ─────────────────
const STAGEB_BASELINE = {
    tokens:        137741,
    // 2026-07-19 J-3: αὐτós(G846) Morph Rule で αὐτós チップが gender/number 反映
    // （彼の→彼らの・彼を→それを 等・1,680件）。改善チップ 39,485 → 39,540（+55）、
    // 一致 98,256 → 98,201（−55）。chip⇔panel 不一致 0・破損形（新）0 は維持。
    // 2026-07-19 J-5: τίς(G5101) neuter→何 で neuter τίス チップ改善（誰を→何を 等・354件）。
    // 改善チップ 39,540 → 39,603（+63）、一致 98,201 → 98,138（−63）。chip⇔panel・破損形は維持。
    changed:        39603,   // Engine 化で改善されたチップ（J-5 で +63）
    identical:      98138,
    brokenOld:       1257,   // 旧経路の破損形（参考記録）
    brokenNew:          0,   // 新経路の破損形は常に 0
    panelMismatch:      0,   // chip ⇔ StudyPanel 不一致は常に 0（SSOT）
    presented:       4244,   // Stage C P1: 括弧化された PP head（2026-07-17）
};

// ── Flow chip 実物ソースの抽出 ───────────────────────────────────────
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const m = html.match(/\/\* __FLOW_CHIP_BEGIN__[\s\S]*?__FLOW_CHIP_END__ \*\//);
if (!m) { console.error('__FLOW_CHIP__ 区間が見つかりません'); process.exit(1); }
const sandbox = {
    window: { App: {} },
    normalizeStrong: s => s || '',
    buildDepthGrammarClasses: () => [],
    _buildReadingContext: () => null,
    console,
};
vm.createContext(sandbox);
vm.runInContext(m[0], sandbox, { displayErrors: true });
const { PresentationPolicy } = requireCjs(path.join(PUBLIC, 'core', 'presentation-policy.js'));
sandbox.window.App.PresentationPolicy = PresentationPolicy;   // Stage C P1
const chip = sandbox._wordToFlowChip;

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

const tok = (japanese, morph, over = {}) => Object.assign(
    { text: 'X', japanese, morph, lemma: '', strong: '', book: '', chapter: '1', verse: '1' }, over);

// Tier 0: Engine 出力が SSOT
check('Tier0: morph 出力（なった）',
    chip(tok('なる', 'V-AMP-SM'), 0, 'JHN', 1, { japanese: 'なった', source: 'morph' }).gloss, 'なった');
check('Tier0: semantic 出力（世の）',
    chip(tok('世界', 'N-GSM'), 0, 'JHN', 1, { japanese: '世の', source: 'semantic' }).gloss, '世の');
check('Tier0: syntax 出力（世から）',
    chip(tok('世界', 'N-GSM'), 0, 'JHN', 1, { japanese: '世から', source: 'syntax' }).gloss, '世から');
check('Tier0: particle 出力（神は）',
    chip(tok('神', 'N-NSM'), 0, 'JHN', 1, { japanese: '神は', source: 'particle' }).gloss, '神は');
check('Tier0: jaWord も Engine 出力',
    chip(tok('なる', 'V-AMP-SM'), 0, 'JHN', 1, { japanese: 'なった', source: 'morph' }).jaWord, 'なった');

// Tier 1: resolve null → 素の japanese（_naturalize 不適用）
check('Tier1: 語る（語ながら 復活禁止）',
    chip(tok('語る', 'V-PAP-NSM'), 0, 'JHN', 1, null).gloss, '語る');
check('Tier1: なる（なよ 復活禁止）',
    chip(tok('なる', 'V-2AMM-2P'), 0, 'JHN', 1, null).gloss, 'なる');
check('Tier1: jaWord = 素の japanese',
    chip(tok('語る', 'V-PAP-NSM'), 0, 'JHN', 1, null).jaWord, '語る');

// Tier 2: resolved 未指定（旧呼び出し）→ 従来動作（rollback 保証）
check('Tier2: 従来動作（愛しながら）',
    chip(tok('愛する', 'V-PAP-NSM'), 0, 'JHN', 1).gloss, '愛しながら');
check('Tier2: 旧経路の挙動そのまま（なた = 旧バグ込み）',
    chip(tok('なる', 'V-AAP-NSM'), 0, 'JHN', 1).gloss, 'なた');

// 表示メタは Tier に依らず不変（Flow の責務）
{
    const t = tok('神', 'N-NSM');
    const a = chip(t, 0, 'JHN', 1, { japanese: '神は', source: 'particle' });
    const b = chip(t, 0, 'JHN', 1);
    check('roleClass 不変', a.roleClass === b.roleClass, true);
    check('morphText 不変', a.morphText === b.morphText, true);
    check('phraseBreakBefore 不変', a.phraseBreakBefore === b.phraseBreakBefore, true);
    check('signals 数不変', a.signals.length === b.signals.length, true);
}

// ── Stage C P1: Presentation（Flow と StudyPanel の共有表示規則） ──
{
    const verse = [tok('〜へ', 'PREP', { class: 'prep' }), tok('福音', 'N-ASN', { class: 'noun' })];
    const c = chip(verse[1], 1, 'ROM', 1, { japanese: '福音へ', source: 'syntax' }, verse);
    check('P1: gloss = 福音（へ）', c.gloss, '福音（へ）');
    check('P1: jaWord は生のまま（SSOT 不変）', c.jaWord, '福音へ');
}
{
    const verse = [tok('〜の中に', 'PREP', { class: 'prep' }), tok('世界', 'N-DSM', { class: 'noun' })];
    const c = chip(verse[1], 1, 'JHN', 1, { japanese: 'キリストにあって', source: 'syntax' }, verse);
    check('P1: 最長一致（にあって）', c.gloss, 'キリスト（にあって）');
}
{
    // morph（に・の 等）は対象外
    const verse = [tok('〜の中に', 'PREP', { class: 'prep' }), tok('聖書', 'N-DSF', { class: 'noun' })];
    const c = chip(verse[1], 1, 'ROM', 1, { japanese: '聖書に', source: 'morph' }, verse);
    check('P1: morph は括弧化しない（聖書に）', c.gloss, '聖書に');
}
{
    // words 未指定 → 整形なし（互換）
    const verse = [tok('〜へ', 'PREP', { class: 'prep' }), tok('福音', 'N-ASN', { class: 'noun' })];
    const c = chip(verse[1], 1, 'ROM', 1, { japanese: '福音へ', source: 'syntax' });
    check('P1: words 未指定 → 整形なし', c.gloss, '福音へ');
}

// _getVerseResolved: Engine 未ロード → null（Tier 2 へ）
check('cache: Engine 未ロード → null',
    sandbox._getVerseResolved([tok('神', 'N-NSM')]), null);

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（差分監査 実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-stageB-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'output', 're-stageB-audit.json'), 'utf8')).stats;

check('トークン数（コーパス不変）', audit.tokens, STAGEB_BASELINE.tokens);
check('チップ変更件数', audit.changed, STAGEB_BASELINE.changed);
check('一致件数', audit.identical, STAGEB_BASELINE.identical);
check('破損形（旧・参考）', audit.brokenOld, STAGEB_BASELINE.brokenOld);
check('破損形（新）= 0', audit.brokenNew, STAGEB_BASELINE.brokenNew);
check('chip⇔panel 不一致 = 0（SSOT）', audit.panelMismatch, STAGEB_BASELINE.panelMismatch);
check('P1 括弧化件数', audit.presented, STAGEB_BASELINE.presented);

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Stage B 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('Flow chip か Engine 出力か bible_data が変わっています。');
    console.log('意図的な改善の場合: 差分監査のサンプルをレビューし、STAGEB_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
