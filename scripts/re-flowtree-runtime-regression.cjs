#!/usr/bin/env node
/**
 * re-flowtree-runtime-regression.cjs — VR-6-C: Flow Tree runtime loader chain 回帰
 *
 * 目的:
 *   runtime loader（index.html の _buildFlowTreeNeighborhoodViewHTML）が依存する
 *   「verseId → chapter asset(nodeIndex) → sentence root → nodesById 再構築 →
 *    既存 neighborhood-view.buildNeighborhoodView」のデータ結線を、ブラウザ非依存で固定する。
 *   fetch/DOM を伴う UI 層ではなく、loader の純データ論理と生成資産の契約を検証する。
 *
 * 検証:
 *   A. 代表 verseId が全て neighborhood を生成できる（MAT1:1 / JHN1:1 / JHN1:2 / JHN3:16 / ROM1:1 / 1CO6:1）
 *   B. JHN 1:1 と JHN 1:2 が別 sentence に解決される（sentence 分離）
 *   C. MAT 1:1 は inline prototype と asset で同一 neighborhood 構造（baseline 保証）
 *      ※ token id フォーマット差（inline=display ref / asset=verseId）のため構造比較のみ
 *   D. asset node は schema（id/parentId/type/tokens/children）のみ（role/rule/semantic を持たない = L-0）
 *
 * 変更しない: adapter / neighborhood-view / schema / index.html。
 * 実行: node scripts/re-flowtree-runtime-regression.cjs / npm run test:re-flowtree-runtime
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { DOMParser } = require('@xmldom/xmldom');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const ASSET  = path.join(PUBLIC, 'assets', 'data', 'flow-tree');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const fn = vm.runInThisContext(`(function(module,exports,require,__dirname,__filename){\n${code}\n})`, { filename: filePath });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}
const adapter = requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));
const { buildNeighborhoodView } = requireCjs(path.join(PUBLIC, 'core', 'neighborhood-view.js'));

let failed = 0;
const results = [];
function check(name, cond, detail) {
    results.push([cond ? 'PASS' : 'FAIL', name + (cond ? '' : (detail ? ' — ' + detail : ''))]);
    if (!cond) failed++;
}

// ── verseId パース ─────────────────────────────────────────────────────────
// verseId format: n{bb:02d}{ch:03d}{vs:03d}{idx:03d}  length=12
// MACULA book numbers (NT: 40–66)
const BOOK_CODES = {
    40:'MAT', 41:'MRK', 42:'LUK', 43:'JHN', 44:'ACT',
    45:'ROM', 46:'1CO', 47:'2CO', 48:'GAL', 49:'EPH',
    50:'PHP', 51:'COL', 52:'1TH', 53:'2TH', 54:'1TI',
    55:'2TI', 56:'TIT', 57:'PHM', 58:'HEB', 59:'JAS',
    60:'1PE', 61:'2PE', 62:'1JN', 63:'2JN', 64:'3JN',
    65:'JUD', 66:'REV',
};
function parseVerseId(vid) {
    if (!vid || vid.length !== 12 || vid[0] !== 'n') return null;
    const bb   = parseInt(vid.slice(1, 3), 10);
    const ch   = parseInt(vid.slice(3, 6), 10);
    const book = BOOK_CODES[bb];
    return book ? { book, chapter: ch } : null;
}

function loadChapter(book, ch) {
    const f = path.join(ASSET, book, ch + '.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
function nodesById(root) { const m = {}; (function w(n){ if(!n||!n.id) return; m[n.id]=n; (n.children||[]).forEach(w); })(root); return m; }

/* loader の純データ論理を Node で再現（index.html の fetch 抜き）。
   ref は verseId 形式（Phase 2 以降）。 */
function neighborhoodForVerseId(verseId) {
    const p = parseVerseId(verseId); if (!p) return null;
    const data = loadChapter(p.book, p.chapter); if (!data) return null;
    const idx = data.nodeIndex[verseId]; if (idx == null) return null;
    const root = data.sentences[idx]; if (!root) return null;
    return { sentIdx: idx, nv: buildNeighborhoodView({ root, nodesById: nodesById(root) }, verseId) };
}

/* ── A. 代表 verseId ── */
const REPRESENTATIVE = [
    'n40001001001',  // MAT 1:1!1
    'n43001001001',  // JHN 1:1!1
    'n43001002001',  // JHN 1:2!1
    'n43003016001',  // JHN 3:16!1
    'n45001001001',  // ROM 1:1!1
    'n46006001001',  // 1CO 6:1!1
];
const resolved = {};
for (const vid of REPRESENTATIVE) {
    const r = neighborhoodForVerseId(vid);
    resolved[vid] = r;
    check(`A. ${vid} が neighborhood を生成`, !!(r && r.nv && Array.isArray(r.nv.constituents) && r.nv.constituents.length > 0),
        r && r.nv ? 'constituents=0' : 'nv=null');
}

/* ── B. JHN 1:1 と 1:2 の sentence 分離 ── */
check('B. JHN 1:1 と JHN 1:2 は別 sentence に解決',
    resolved['n43001001001'] && resolved['n43001002001'] &&
    resolved['n43001001001'].sentIdx !== resolved['n43001002001'].sentIdx,
    'same sentence index');

/* ── C. MAT 1:1 baseline: inline prototype と asset が同一 neighborhood 構造 ──
 * inline prototype（_FT11_SENTENCE_XML）は flow-tree-adapter が ref 属性（display ref）
 * をトークン id として使用するため、asset（verseId）と token id フォーマットが異なる。
 * 構造（トークン数・focus・expanded・子数）で同一性を検証する。 */
(function () {
    const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    const m = /const _FT11_SENTENCE_XML = (".*?");\n/s.exec(html);
    if (!m) { check('C. MAT1:1 inline XML 抽出', false, '_FT11_SENTENCE_XML 見つからず'); return; }
    const doc = new DOMParser().parseFromString(JSON.parse(m[1]), 'text/xml');
    const repInline = adapter.parseLowfatXml(doc, { scopeId: 'MAT#00000' });
    // token id フォーマットが異なるため token 文字列ではなくトークン数で構造比較
    const summarize = nv => JSON.stringify(nv.constituents.map(c => ({
        tc: c.tokens.length, f: c.isFocus, e: c.expanded, ch: c.children.length,
    })));
    let ok = true;
    // MAT 1:1 の代表トークン: display ref（inline用）と verseId（asset用）のペア
    const C_REFS = [
        { inline: 'MAT 1:1!1', asset: 'n40001001001' },
        { inline: 'MAT 1:1!5', asset: 'n40001001005' },
        { inline: 'MAT 1:1!8', asset: 'n40001001008' },
    ];
    const mat1Data = loadChapter('MAT', 1);
    for (const { inline, asset } of C_REFS) {
        const a = buildNeighborhoodView(repInline, inline);
        const assetIdx  = mat1Data ? mat1Data.nodeIndex[asset] : null;
        const assetRoot = (assetIdx != null) ? mat1Data.sentences[assetIdx] : null;
        const b = assetRoot
            ? buildNeighborhoodView({ root: assetRoot, nodesById: nodesById(assetRoot) }, asset)
            : null;
        if (!a || !b || summarize(a) !== summarize(b)) ok = false;
    }
    check('C. MAT 1:1 inline == asset（neighborhood 構造 baseline）', ok);
})();

/* ── D. schema v2（SF-11）: asset node は基本5フィールド＋透過搬送 role/frame/referent のみ。
 *    rule/clauseType/class/semanticRole/confidence 等の意味解釈・生成属性は依然として持たない（L-0）。 ── */
(function () {
    const allowed = new Set(['id', 'parentId', 'type', 'tokens', 'children', 'role', 'frame', 'referent']);
    const forbidden = ['rule', 'clauseType', 'class', 'semanticRole', 'confidence'];
    const data = loadChapter('JHN', 3);
    let extra = null, forb = null;
    (function walk(n) {
        for (const k of Object.keys(n)) { if (!allowed.has(k)) extra = extra || k; if (forbidden.includes(k)) forb = forb || k; }
        (n.children || []).forEach(walk);
    })(data.sentences[0]);
    check('D. asset node は schema v2（5基本+role/frame/referent）のみ（未知キーなし）', extra === null, 'extra key: ' + extra);
    check('D. asset node に生成系/意味解釈属性なし（rule/clauseType/semantic 等）', forb === null, 'forbidden key: ' + forb);
})();

/* ── 出力 ── */
console.log('── VR-6-C: Flow Tree runtime loader chain regression ──\n');
for (const [s, n] of results) console.log(`  ${s === 'PASS' ? '✓' : '✗'} [${s}] ${n}`);
const pass = results.filter(r => r[0] === 'PASS').length;
console.log(`\n${failed === 0 ? 'ALL PASS' : 'FAILED'} (${pass}/${results.length} checks)`);
process.exit(failed === 0 ? 0 : 1);
