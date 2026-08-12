#!/usr/bin/env node
/**
 * re-flowtree-runtime-regression.cjs — VR-6-C: Flow Tree runtime loader chain 回帰
 *
 * 目的:
 *   runtime loader（index.html の _buildFlowTreeNeighborhoodViewHTML）が依存する
 *   「token ref → chapter asset(refIndex) → sentence root → nodesById 再構築 →
 *    既存 neighborhood-view.buildNeighborhoodView」のデータ結線を、ブラウザ非依存で固定する。
 *   fetch/DOM を伴う UI 層ではなく、loader の純データ論理と生成資産の契約を検証する。
 *
 * 検証:
 *   A. 代表 ref が全て neighborhood を生成できる（MAT1:1 / JHN1:1 / JHN1:2 / JHN3:16 / ROM1:1 / 1CO6:1）
 *   B. JHN 1:1 と JHN 1:2 が別 sentence に解決される（sentence 分離）
 *   C. MAT 1:1 は inline prototype と asset で同一 neighborhood 構造（baseline 保証）
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

/* loader の純データ論理を Node で再現（index.html の fetch 抜き）。 */
const REF_RE = /^(\S+)\s+(\d+):(\d+)!(\d+)$/;
function parseRef(ref) { const m = REF_RE.exec(ref || ''); return m ? { book: m[1], chapter: parseInt(m[2], 10) } : null; }
function loadChapter(book, ch) {
    const f = path.join(ASSET, book, ch + '.json');
    return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
}
function nodesById(root) { const m = {}; (function w(n){ if(!n||!n.id) return; m[n.id]=n; (n.children||[]).forEach(w); })(root); return m; }
function neighborhoodForRef(ref) {
    const p = parseRef(ref); if (!p) return null;
    const data = loadChapter(p.book, p.chapter); if (!data) return null;
    const idx = data.refIndex[ref]; if (idx == null) return null;
    const root = data.sentences[idx]; if (!root) return null;
    return { sentIdx: idx, nv: buildNeighborhoodView({ root, nodesById: nodesById(root) }, ref) };
}

/* ── A. 代表 ref ── */
const REPRESENTATIVE = ['MAT 1:1!1', 'JHN 1:1!1', 'JHN 1:2!1', 'JHN 3:16!1', 'ROM 1:1!1', '1CO 6:1!1'];
const resolved = {};
for (const ref of REPRESENTATIVE) {
    const r = neighborhoodForRef(ref);
    resolved[ref] = r;
    check(`A. ${ref} が neighborhood を生成`, !!(r && r.nv && Array.isArray(r.nv.constituents) && r.nv.constituents.length > 0),
        r && r.nv ? 'constituents=0' : 'nv=null');
}

/* ── B. JHN 1:1 と 1:2 の sentence 分離 ── */
check('B. JHN 1:1 と JHN 1:2 は別 sentence に解決',
    resolved['JHN 1:1!1'] && resolved['JHN 1:2!1'] &&
    resolved['JHN 1:1!1'].sentIdx !== resolved['JHN 1:2!1'].sentIdx,
    'same sentence index');

/* ── C. MAT 1:1 baseline: inline prototype と asset が同一 neighborhood 構造 ── */
(function () {
    const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    const m = /const _FT11_SENTENCE_XML = (".*?");\n/s.exec(html);
    if (!m) { check('C. MAT1:1 inline XML 抽出', false, '_FT11_SENTENCE_XML 見つからず'); return; }
    const doc = new DOMParser().parseFromString(JSON.parse(m[1]), 'text/xml');
    const repInline = adapter.parseLowfatXml(doc, { scopeId: 'MAT#00000' });
    const summarize = nv => JSON.stringify(nv.constituents.map(c => ({ t: c.tokens.slice().sort().join(','), f: c.isFocus, e: c.expanded, ch: c.children.length })));
    let ok = true;
    for (const ref of ['MAT 1:1!1', 'MAT 1:1!5', 'MAT 1:1!8']) {
        const a = buildNeighborhoodView(repInline, ref);
        const b = resolved[ref] ? resolved[ref].nv : neighborhoodForRef(ref)?.nv;
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
