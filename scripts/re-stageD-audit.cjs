#!/usr/bin/env node
/**
 * re-stageD-audit.cjs — Stage D: Context Layer 等価・性能・fallback 監査（NT 全巻）
 *
 * 実行: node scripts/re-stageD-audit.cjs
 * 出力: scripts/output/re-stageD-audit.json
 *
 * ★ 監査方法（レビュー反映・条件 2）:
 *   監査スクリプトに旧ロジックを書き写さない。index.html の
 *   __READING_CTX__ 区間から**実物の _buildReadingContext を抽出**して実行する。
 *     新経路 = 実物 _buildReadingContext（window.App.readingContext あり）
 *     現行実装(旧経路) = 同じ実物 _buildReadingContext（readingContext を外す
 *              → 関数内の fallback ブロック = ソース上の現行実装そのもの）
 *   両者を全 NT トークンでバイト照合する。比較基準も新経路も同一の実ソース由来。
 *
 * 監査項目:
 *   1. バイト等価: 新経路 == 現行実装(実ソース fallback)
 *   2. fallback 件数: 新経路で readingContext が使えず旧経路へ落ちた回数（条件 3）
 *   3. ReadingContext 内部の range 外 per-token build 回数（観測）
 *   4. 性能: ContextBuilder.build 呼び出し回数の削減 + 時間
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

const _CLS2P = {'verb':'V','noun':'N','adjective':'A','adj':'A','article':'T','det':'T',
    'preposition':'P','prep':'P','conjunction':'C','conj':'C','adverb':'D','adv':'D',
    'particle':'X','ptcl':'X','pronoun':'R','pron':'R'};
global.entryPosCode = e => e.pos ? String(e.pos).replace(/-$/, '').toUpperCase()
    : (_CLS2P[String(e.class || '').toLowerCase()] || '');
global.decodeMorph = e => { const n = v => (!v || v === '-') ? '' : v;
    return { pos: global.entryPosCode(e), tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
             case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person) }; };
global.cleanText = e => (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();

function requireCjs(fp) {
    const code = fs.readFileSync(fp, 'utf8');
    const mod = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    vm.runInThisContext(wrapped, { filename: fp })(mod, mod.exports, require, path.dirname(fp), fp);
    return mod.exports;
}

// ── 実ソースの取得 ──
const CB = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js')).ContextBuilder;
const { ReadingContext } = requireCjs(path.join(PUBLIC, 'core', 'reading-context.js'));

// index.html の __READING_CTX__ 区間から実物 _buildReadingContext を抽出
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const m = html.match(/\/\* __READING_CTX_BEGIN__[\s\S]*?__READING_CTX_END__ \*\//);
if (!m) { console.error('__READING_CTX__ 区間が見つかりません'); process.exit(1); }

// build 呼び出し計数ラッパ
let buildCalls = 0;
const origBuild = CB.build.bind(CB);
const countingCB = { build(t, toks, i) { buildCalls++; return origBuild(t, toks, i); } };

// sandbox: 実物 _buildReadingContext を評価。window.App を差し替えて 2 経路を作る
function makeBRC(withReadingContext) {
    const rc = new ReadingContext();
    rc.setContextBuilder(countingCB);
    const sandbox = {
        window: { App: {
            syntax: { ContextBuilder: countingCB },
            readingContext: withReadingContext ? rc : undefined,
            _readingCtxStats: { rcFallback: 0 },
        } },
        console,
    };
    vm.createContext(sandbox);
    vm.runInContext(m[0], sandbox, { displayErrors: true });
    return { fn: sandbox._buildReadingContext, app: sandbox.window.App, rc };
}

const NEW = makeBRC(true);    // ReadingContext あり（新経路）
const OLD = makeBRC(false);   // ReadingContext なし → 実ソース fallback = 現行実装

const norm = c => { if (!c) return 'null'; const { tokens, ...rest } = c; return JSON.stringify(rest); };

// ── 節収集 ──
const verses = [];
for (const book of fs.readdirSync(NT_DIR).filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort()) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book)).filter(f => f.endsWith('.json')).sort()) {
        const toks = JSON.parse(fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
        const byV = new Map();
        for (const t of toks) { if (!byV.has(t.verse)) byV.set(t.verse, []); byV.get(t.verse).push(t); }
        for (const words of byV.values()) verses.push({ book, words });
    }
}

// ── 1. バイト等価（新経路 vs 実ソース fallback）+ fallback 件数 ──
NEW.app._readingCtxStats.rcFallback = 0;
let total = 0, match = 0, tokensRefOk = 0;
const mismatch = [];
for (const { book, words } of verses) {
    NEW.rc._cache = null; OLD.rc._cache = null;
    for (let k = 0; k < words.length; k++) {
        total++;
        const cNew = NEW.fn(words, k);
        const cOld = OLD.fn(words, k);
        const a = norm(cNew), b = norm(cOld);
        if (a === b) match++;
        else if (mismatch.length < 8) mismatch.push(`${book} ${words[k].ref}\n  new=${a}\n  old=${b}`);
        if (cNew && cNew.tokens === words) tokensRefOk++;
    }
}
const rcFallback = NEW.app._readingCtxStats.rcFallback;   // 新経路が旧に落ちた回数（条件3）
const rangeOuterBuild = NEW.rc.getStats().rangeOuterBuild;

// ── 2. build 呼び出し回数（新 vs 旧・独立計測）+ 性能 ──
buildCalls = 0;
const rcN = new ReadingContext(); rcN.setContextBuilder(countingCB);
const tN0 = Date.now();
for (const { words } of verses) { rcN._cache = null; for (let k = 0; k < words.length; k++) rcN.getContext(words, k); }
const tNew = Date.now() - tN0; const newBuilds = buildCalls;

buildCalls = 0;
const tO0 = Date.now();
for (const { words } of verses) { for (let k = 0; k < words.length; k++) OLD.fn(words, k); }
const tOld = Date.now() - tO0; const oldBuilds = buildCalls;

const report = {
    generated: new Date().toISOString().slice(0, 10),
    method: 'real-source marker extraction (__READING_CTX__); baseline = source fallback path',
    equivalence: { total, match, mismatch: total - match,
        rate: Number((match / total * 100).toFixed(4)), tokensRefOk },
    fallback: { rcFallback, rangeOuterBuild },
    buildCalls: { old: oldBuilds, new: newBuilds,
        reductionPct: Number(((1 - newBuilds / oldBuilds) * 100).toFixed(2)) },
    performance: { oldMs: tOld, newMs: tNew, verses: verses.length },
    mismatchSamples: mismatch,
};
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-stageD-audit.json'), JSON.stringify(report, null, 2));

const pct = (n, d) => d ? (n / d * 100).toFixed(4) + '%' : '-';
console.log('Stage D Context Layer 監査（NT 全巻・実ソース抽出比較）');
console.log('='.repeat(64));
console.log(`比較基準       : 実物 _buildReadingContext の fallback 経路（再実装なし）`);
console.log(`バイト等価     : ${match}/${total} (${pct(match, total)})`);
console.log(`tokens 参照一致: ${tokensRefOk}/${total}`);
console.log(`rcFallback     : ${rcFallback}（新経路が旧へ落ちた回数・条件3・理想 0）`);
console.log(`rangeOuterBuild: ${rangeOuterBuild}（RC 内部 per-token・正常経路）`);
console.log(`build 呼び出し : 旧 ${oldBuilds} → 新 ${newBuilds}（${report.buildCalls.reductionPct}% 削減）`);
console.log(`性能           : 旧 ${tOld}ms → 新 ${tNew}ms（節 ${verses.length}）`);
if (mismatch.length) { console.log('不一致:'); mismatch.forEach(s => console.log('  ' + s)); }
console.log('');
console.log('詳細: scripts/output/re-stageD-audit.json');
process.exit(report.equivalence.mismatch === 0 && rcFallback === 0 ? 0 : 1);
