#!/usr/bin/env node
/**
 * re-stageD-regression.cjs — Stage D（Context Layer）回帰テスト
 *
 * 実行: node scripts/re-stageD-regression.cjs
 *       npm run test:re-stageD
 *
 * Stage D は 2026-07-18 の NT 全巻等価監査（実ソース抽出比較）で固定。
 * ReadingContext（core/reading-context.js）または _buildReadingContext
 * （index.html __READING_CTX__ 区間）を変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻等価監査（re-stageD-audit.cjs）が PASS することを確認する
 *
 * 設計正典: docs/context-layer.md
 *   - ReadingContext が唯一の Context Source
 *   - 出力は現行 _buildReadingContext とバイト等価（実ソース比較で証明）
 *   - fallback は観測可能（rcFallback = 0 が SSOT 維持の証拠）
 *
 * Part 1: 単体（ReadingContext の出力・節キャッシュ・観測カウンタ・冠詞非介入）
 * Part 2: NT 全巻等価監査の基準値照合
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Stage D 凍結基準値（2026-07-18・実ソース抽出比較） ──
const STAGED_BASELINE = {
    tokens:        137741,
    equivalence:   137741,   // 新経路 == 実ソース fallback（100%）
    rcFallback:         0,   // 新経路が旧経路へ落ちた回数（SSOT 維持）
    buildCallsOld: 137741,
    buildCallsNew:  30499,   // 節スコープ 1 回計算による削減
};

const _CLS2P = {'verb':'V','noun':'N','adj':'A','det':'T','prep':'P','conj':'C','adv':'D','ptcl':'X','pron':'R'};
global.entryPosCode = e => e.pos ? String(e.pos).replace(/-$/, '').toUpperCase()
    : (_CLS2P[String(e.class || '').toLowerCase()] || '');
global.decodeMorph = e => { const n = v => (!v || v === '-') ? '' : v;
    return { pos: global.entryPosCode(e), tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
             case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person) }; };
global.cleanText = e => (e.word || e.normalized || e.text || '').replace(/[.,:;]/g, '').trim();

function requireCjs(fp) {
    const code = fs.readFileSync(fp, 'utf8');
    const mod = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    vm.runInThisContext(wrapped, { filename: fp })(mod, mod.exports, require, path.dirname(fp), fp);
    return mod.exports;
}

const CB = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js')).ContextBuilder;
const { ReadingContext } = requireCjs(path.join(PUBLIC, 'core', 'reading-context.js'));

// 比較基準は実ソースの _buildReadingContext（__READING_CTX__ 抽出・再実装しない）
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const mk = html.match(/\/\* __READING_CTX_BEGIN__[\s\S]*?__READING_CTX_END__ \*\//);
if (!mk) { console.error('__READING_CTX__ 区間が見つかりません'); process.exit(1); }
function makeBRC(withRC) {
    const rc = new ReadingContext(); rc.setContextBuilder(CB);
    const sandbox = { window: { App: {
        syntax: { ContextBuilder: CB },
        readingContext: withRC ? rc : undefined,
        _readingCtxStats: { rcFallback: 0 },
    } }, console };
    vm.createContext(sandbox);
    vm.runInContext(mk[0], sandbox, { displayErrors: true });
    return { fn: sandbox._buildReadingContext, rc };
}

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

const jhn = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'bible_data', 'nt', 'JHN', '1.json'), 'utf8'));
const v1 = jhn.filter(t => t.verse === '1');

const NEW = makeBRC(true);    // ReadingContext あり
const OLD = makeBRC(false);   // 実ソース fallback = 現行実装
const norm = c => { if (!c) return 'null'; const { tokens, ...rest } = c; return JSON.stringify(rest); };

// 実ソース比較で全語バイト等価
let v1match = 0;
for (let k = 0; k < v1.length; k++) if (norm(NEW.fn(v1, k)) === norm(OLD.fn(v1, k))) v1match++;
check('JHN 1:1 全語バイト等価（新 == 実ソース fallback）', v1match, v1.length);

// ReadingContext 直接の出力形
const RC = new ReadingContext(); RC.setContextBuilder(CB);
const c0 = RC.getContext(v1, 0);
check('tokens 参照 = words', c0.tokens === v1, true);
check('targetIdx', c0.targetIdx, 0);
check('phrases は配列', Array.isArray(c0.phrases), true);
check('hasPassiveVerb は真偽', typeof c0.hasPassiveVerb, 'boolean');
const phSame = v1.every((_, k) => RC.getContext(v1, k).phrases === c0.phrases);
check('phrases 節内で参照共有（節スコープ）', phSame, true);

// 節キャッシュ: 2 語目以降は build 追加なし
let calls = 0; const orig = CB.build.bind(CB);
const cCB = { build(t, tk, i) { calls++; return orig(t, tk, i); } };
const RC2 = new ReadingContext(); RC2.setContextBuilder(cCB);
RC2.getContext(v1, 0); const afterFirst = calls;
for (let k = 1; k < v1.length; k++) RC2.getContext(v1, k);
check('節キャッシュ: 2 語目以降 build 追加なし', calls, afterFirst);

// 観測カウンタ getStats
check('getStats に rangeOuterBuild', typeof RC.getStats().rangeOuterBuild, 'number');

// CB 未注入 → null
check('CB 未注入 → null', new ReadingContext().getContext(v1, 0), null);

// 冠詞非介入: 冠詞トークンも他と同じく Context 供給（除外・改変しない）
const detIdx = v1.findIndex(w => (w.class || '') === 'det');
if (detIdx >= 0) {
    check('冠詞トークンも Context 供給（非介入）',
        norm(NEW.fn(v1, detIdx)) === norm(OLD.fn(v1, detIdx)), true);
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻等価監査
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻等価監査（実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-stageD-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(path.join(__dirname, 'output', 're-stageD-audit.json'), 'utf8'));

check('総トークン', audit.equivalence.total, STAGED_BASELINE.tokens);
check('バイト等価 = 全トークン（100%）', audit.equivalence.match, STAGED_BASELINE.equivalence);
check('不一致 0', audit.equivalence.mismatch, 0);
check('tokens 参照一致 = 全トークン', audit.equivalence.tokensRefOk, STAGED_BASELINE.tokens);
check('rcFallback = 0（SSOT 維持）', audit.fallback.rcFallback, STAGED_BASELINE.rcFallback);
check('build 呼び出し（旧・基準値）', audit.buildCalls.old, STAGED_BASELINE.buildCallsOld);
check('build 呼び出し（新・基準値）', audit.buildCalls.new, STAGED_BASELINE.buildCallsNew);
check('build 削減あり（新 < 旧）', audit.buildCalls.new < audit.buildCalls.old, true);

console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Stage D 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('ReadingContext か _buildReadingContext か bible_data が変わっています。');
    console.log('バイト等価が崩れた場合は該当語を per-token fallback に落とすこと（等価が絶対上位）。');
}
process.exit(fail ? 1 : 0);
