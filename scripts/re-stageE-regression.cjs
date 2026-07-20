#!/usr/bin/env node
/**
 * re-stageE-regression.cjs — Stage E（Display Label / StudyPanel 責務整理）回帰
 *
 * 実行: node scripts/re-stageE-regression.cjs
 *       npm run test:re-stageE
 *
 * 設計正典: docs/display-label.md
 *   3 層分離: ①読む日本語(Engine) / ②語義見出し(getDisplayLabel) / ③語義説明(gloss_ja)
 *   StudyPanel rn-ja は ② getDisplayLabel を使う（① resolve も ③ gloss_ja も見出しにしない）
 *
 * Part 1: getDisplayLabel の単体（L1〜L4・context 未使用・NT カバレッジ）
 * Part 2: 実ソース構造照合（index.html rn-ja が displayLabel を使い gloss_ja を使わない）
 * Part 3: 3 層分離の実証（見出し② と 説明③ が別物であるトークン数）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');

// ── Stage E 凍結基準値（2026-07-18） ──
const STAGEE_BASELINE = {
    ntTokens:        137741,
    labelCoverage:   137741,   // getDisplayLabel が供給できたトークン（100%）
};

function requireCjs(fp) {
    const code = fs.readFileSync(fp, 'utf8');
    const mod = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    vm.runInThisContext(wrapped, { filename: fp })(mod, mod.exports, require, path.dirname(fp), fp);
    return mod.exports;
}

const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const lex = new ReadingLexicon(readingLexiconData);
const liteData = JSON.parse(fs.readFileSync(
    path.join(PUBLIC, 'assets', 'data', 'lexicon', 'lexicon-lite.json'), 'utf8'));
lex.enrich(liteData);

let pass = 0, fail = 0;
function check(desc, actual, expect) {
    const ok = actual === expect;
    ok ? pass++ : fail++;
    if (!ok) console.log(`FAIL  ${desc}: got=${JSON.stringify(actual)} expect=${JSON.stringify(expect)}`);
    return ok;
}

// ══════════════════════════════════════════════════════════════════
// Part 1: getDisplayLabel 単体
// ══════════════════════════════════════════════════════════════════
console.log('── Part 1: getDisplayLabel 単体 ──');

check('typeof getDisplayLabel', typeof lex.getDisplayLabel, 'function');
check('λόγος → ことば（L3 短い見出し）', lex.getDisplayLabel('grc:G3056'), 'ことば');
check('σάρξ → 肉', lex.getDisplayLabel('grc:G4561'), '肉');
check('θεός → 神', lex.getDisplayLabel('grc:G2316'), '神');
// L4 決定的
check('L4 決定的（2 回同一）',
    lex.getDisplayLabel('grc:G26') === lex.getDisplayLabel('grc:G26'), true);
// context 未使用（渡しても同一）
check('context 未使用（渡しても同一）',
    lex.getDisplayLabel('grc:G3056', { any: 'ctx' }) === lex.getDisplayLabel('grc:G3056'), true);
// 未登録・不正入力 → null
check('未登録 → null', lex.getDisplayLabel('grc:G99999'), null);
check('null → null', lex.getDisplayLabel(null), null);
check('空文字 → null', lex.getDisplayLabel(''), null);
// L2 文脈非依存・基本形（格助詞・活用を含まない）— 見出しに助詞末尾がないこと
const labelSample = ['grc:G3056', 'grc:G4561', 'grc:G2316', 'grc:G26', 'grc:G2889'];
const noParticle = labelSample.every(id => {
    const l = lex.getDisplayLabel(id);
    return l && !/[をはがにへ]$/.test(l) && !/（/.test(l);
});
check('L2 見出しに格助詞・括弧なし（基本形）', noParticle, true);
// ② 見出しと ③ 説明が別（gloss_ja を見出しにしていない証拠）
const logos = lex.lookup('grc:G3056');
check('② 見出し ≠ ③ gloss_ja（layer 分離）',
    lex.getDisplayLabel('grc:G3056') !== logos.glossJa, true);

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: index.html 実ソース構造照合（rn-ja の SSOT）
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: index.html rn-ja 構造照合 ──');

const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
check('displayLabel = getDisplayLabel(...) が定義されている',
    /const displayLabel\s*=\s*.*getDisplayLabel\(/.test(html), true);
check('rn-ja が displayLabel を描画',
    /rn-ja">\$\{displayLabel\}/.test(html), true);
check('rn-ja が gloss_ja を描画していない（③流用の撤廃）',
    /rn-ja">\$\{gloss_ja\}/.test(html), false);

// ══════════════════════════════════════════════════════════════════
// Part 3: NT カバレッジ + 3 層分離の規模
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 3: NT カバレッジ + 層分離 ──');

let tot = 0, labelHit = 0, labelDiffGloss = 0;
for (const b of fs.readdirSync(NT_DIR).filter(x => fs.statSync(path.join(NT_DIR, x)).isDirectory()).sort()) {
    for (const c of fs.readdirSync(path.join(NT_DIR, b)).filter(f => f.endsWith('.json')).sort()) {
        for (const t of JSON.parse(fs.readFileSync(path.join(NT_DIR, b, c), 'utf8'))) {
            if (!t.lemmaId) { tot++; continue; }
            tot++;
            const label = lex.getDisplayLabel(t.lemmaId);
            if (label) labelHit++;
            const e = lex.lookup(t.lemmaId);
            if (label && e && e.glossJa && label !== e.glossJa) labelDiffGloss++;
        }
    }
}
check('NT トークン（コーパス不変）', tot, STAGEE_BASELINE.ntTokens);
check('getDisplayLabel 供給 = 全トークン（100%）', labelHit, STAGEE_BASELINE.labelCoverage);
console.log(`  参考: 見出し② ≠ 説明③(gloss_ja) のトークン ${labelDiffGloss}（層が実際に分離している規模）`);

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Stage E 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
}
process.exit(fail ? 1 : 0);
