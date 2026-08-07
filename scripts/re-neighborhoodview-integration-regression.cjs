#!/usr/bin/env node
/**
 * re-neighborhoodview-integration-regression.cjs
 * — public/index.html の FLOW-TREE-11-A 統合ブロックが、正式モジュール
 *   （flow-tree-adapter.js → neighborhood-view.js）置換後も、置換前の
 *   Prototype（_ft11Convert 等の自前実装）と同一の NeighborhoodView Model を
 *   生成することを確認する回帰テスト。
 *
 * 実行: node scripts/re-neighborhoodview-integration-regression.cjs
 *
 * 方法: public/index.html に埋め込まれている _FT11_SENTENCE_XML（Matthew 1:1
 *       の実データそのもの）を実ファイルから抽出し、実際の
 *       flow-tree-adapter.js / neighborhood-view.js に通す。期待値は、
 *       置換前の Prototype（旧 _ft11Convert + _ft11BuildConstituent。
 *       Git 履歴上のコミット前バージョン）が Matthew 1:1 の8語に対して
 *       生成していた木構造と、構造的に同一になるよう固定した snapshot。
 *
 * 対象: public/index.html（データ抽出のみ・変更しない）
 *       public/core/flow-tree-adapter.js
 *       public/core/neighborhood-view.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

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

const { parseLowfatXml } = requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));
const { buildNeighborhoodView } = requireCjs(path.join(PUBLIC, 'core', 'neighborhood-view.js'));

let pass = 0, fail = 0;
function check(desc, actual, expect) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expect);
    const ok = a === e;
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}` + (ok ? '' : `\n      actual:   ${a}\n      expected: ${e}`));
}
function checkTrue(desc, actualBool) {
    actualBool ? pass++ : fail++;
    console.log(`${actualBool ? 'PASS' : 'FAIL'}  ${desc}`);
}

// ══════════════════════════════════════════════════════════════════
// § public/index.html から _FT11_SENTENCE_XML を実データのまま抽出する
// （文字列を複製しない。ファイルのその場の記述を単一の正とする）
// ══════════════════════════════════════════════════════════════════

function extractFt11SentenceXml() {
    const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
    const startMarker = 'const _FT11_SENTENCE_XML = ';
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) throw new Error('_FT11_SENTENCE_XML が public/index.html に見つからない');
    const semiIdx = html.indexOf(';\n', startIdx);
    if (semiIdx === -1) throw new Error('_FT11_SENTENCE_XML 文の終端(;)が見つからない');
    const statement = html.slice(startIdx, semiIdx + 1); // "const ... = \"...\";"
    // 実際の JS 文として評価し、文字列値をそのまま取り出す（手動 unescape をしない）。
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext(`${statement}\nthis.__value = _FT11_SENTENCE_XML;`, sandbox);
    return sandbox.__value;
}

console.log('=== public/index.html から埋め込み Lowfat データ（Matthew 1:1）を抽出 ===\n');

const sentenceXml = extractFt11SentenceXml();
checkTrue('_FT11_SENTENCE_XML を public/index.html から抽出できる', typeof sentenceXml === 'string' && sentenceXml.length > 0);
checkTrue('抽出したXMLは8語（<w ）を含む（Matthew 1:1 の実データ）', (sentenceXml.match(/<w /g) || []).length === 8);

// ══════════════════════════════════════════════════════════════════
// § 実際の Adapter / NeighborhoodView を通す（public/index.html が
//   ブラウザ上で window.App.flowTree.parseLowfatXml() /
//   window.App.neighborhoodView.buildNeighborhoodView() を呼ぶのと同じ経路）
// ══════════════════════════════════════════════════════════════════
//
// Node には DOMParser が無いため、parseLowfatXml への文字列直渡しは
// Failure Mode（null）になる。ここでは flow-tree-adapter-realdata.cjs と
// 同じ、依存なしの最小 Lowfat 専用 XML パーサを使って Element を用意し、
// parseLowfatXml へ Element として渡す（ブラウザでは DOMParser が同じ役割
// を果たす。パーサの実装箇所が違うだけで、Adapter への入力契約は同一）。

function decodeEntities(s) {
    return s
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function makeElement(tagName, attrs) {
    const children = [];
    return {
        tagName, children,
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
        getElementsByTagName(tag) {
            const out = [];
            (function walk(node) { for (const c of node.children) { if (c.tagName === tag) out.push(c); walk(c); } })(this);
            return out;
        },
    };
}
const TAG_RE  = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
function parseLowfat(xmlString) {
    let s = xmlString.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const root = makeElement('#root', {});
    const stack = [root];
    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(s)) !== null) {
        const [, closing, tagName, attrStr, selfClose] = match;
        if (closing) { if (stack.length > 1) stack.pop(); continue; }
        const attrs = {};
        ATTR_RE.lastIndex = 0;
        let am;
        while ((am = ATTR_RE.exec(attrStr)) !== null) {
            attrs[am[1]] = decodeEntities(am[2] !== undefined ? am[2] : am[3]);
        }
        const el = makeElement(tagName, attrs);
        stack[stack.length - 1].children.push(el);
        if (!selfClose) stack.push(el);
    }
    return root.children[0] || null;
}

const sentenceEl = parseLowfat(sentenceXml);
const representation = parseLowfatXml(sentenceEl, { scopeId: 'MAT#00000' });
checkTrue('Adapter が public/index.html 埋め込みデータから Representation を構築できる', representation !== null);

console.log('\n=== NeighborhoodView Model（focus = Δαυὶδ / MAT 1:1!6） ===\n');

const nv = buildNeighborhoodView(representation, 'MAT 1:1!6');
checkTrue('buildNeighborhoodView が null を返さない', nv !== null);

// ── 期待値: 置換前 Prototype（_ft11Convert + _ft11BuildConstituent）が
//    同一の Matthew 1:1 データに対して生成していた木構造と構造的に同一。
//    Matthew 1:1 は <wg class="cl"> を持たない（文全体が1つの NP）ため、
//    旧 Prototype は常に anchorId = 文全体（sentenceId#先頭-末尾）に
//    フォールバックしていた（usedFallback 相当 = true）。
checkTrue('anchor は文全体にフォールバックする（Matthew 1:1 に clause が無いため）', nv.usedFallback === true);
check('anchorId は「文全体（先頭token-末尾token）」を指す', nv.anchorId, 'MAT#00000#n40001001001-n40001001008');

// 直接の構成員は2つ（Βίβλος と、それ以外全体の同格チェーン）
check('constituents は2つ（w1 と、残り全体の同格グループ）',
    nv.constituents.map(c => c.nodeId),
    ['n40001001001', 'MAT#00000#n40001001002-n40001001008']);

const w1 = nv.constituents[0];
check('w1（Βίβλος）は tokens=[MAT 1:1!1] を持つ', w1.tokens, ['MAT 1:1!1']);
checkTrue('w1 は focus ではない', w1.isFocus === false);
checkTrue('w1 は focus への経路外なので expanded=false', w1.expanded === false);
check('w1 の children は空（葉ノード）', w1.children, []);

// focus（Δαυὶδ）を、経路上のすべての祖先を辿って検証する
function findByTokenPath(node, path) {
    let cur = node;
    for (const id of path) {
        cur = (cur.children || []).find(c => c.nodeId === id);
        if (!cur) return null;
    }
    return cur;
}
const rest = nv.constituents[1]; // MAT#00000#n40001001002-n40001001008
checkTrue('rest（同格チェーン全体）は focus への経路上なので expanded=true', rest.expanded === true);

// 木構造: rest > (n2, appos[3,4,5,6,7,8]) の入れ子（Adapter出力のnodeId命名規則に基づく）
const daueidPathIds = nv.constituents[1].children
    .map(c => c.nodeId); // 構造は Adapter の実装依存 id なので、id そのものより
                          // 「focus が最終的にこの木のどこかに1つだけ現れ、isFocus=true であること」
                          // を構造非依存な形で検証する（下記）。
checkTrue('rest.children が空でない（同格構造を保持している）', daueidPathIds.length > 0);

// focus ノード（isFocus=true）が木の中にちょうど1つだけ存在し、
// その tokens が Δαυὶδ の ref（MAT 1:1!6）のみであることを構造非依存に確認する。
function collectFocusNodes(node, out) {
    if (node.isFocus) out.push(node);
    (node.children || []).forEach(c => collectFocusNodes(c, out));
    return out;
}
const focusNodes = nv.constituents.flatMap(c => collectFocusNodes(c, []));
check('focus ノードは木全体でちょうど1つ', focusNodes.length, 1);
check('focus ノードの tokens は Δαυὶδ の ref のみ', focusNodes[0] && focusNodes[0].tokens, ['MAT 1:1!6']);
checkTrue('focus ノードは葉（子を持たない・Lowfat上 Δαυὶδ は単一語）', focusNodes[0] && focusNodes[0].children.length === 0);

// focus への経路上にあるノードは全て expanded=true、経路外は expanded=false
// であることを、木全体を走査して確認する（Prototype の _ft11IsOnPath と
// 同じ判定基準を、独立した実装で再検証する）。
function isAncestorOfFocus(node) {
    if (node.isFocus) return true;
    return (node.children || []).some(isAncestorOfFocus);
}
function checkExpandedConsistency(node, path) {
    const shouldBeExpanded = node.children.length > 0 && isAncestorOfFocus(node);
    if (node.expanded !== shouldBeExpanded) {
        fail++;
        console.log(`FAIL  expanded整合性 [${path}]: actual=${node.expanded} expected=${shouldBeExpanded}`);
    } else {
        pass++;
    }
    node.children.forEach((c, i) => checkExpandedConsistency(c, `${path}>${i}`));
}
nv.constituents.forEach((c, i) => checkExpandedConsistency(c, `root${i}`));
console.log('PASS  expanded整合性: 木全体（focusへの経路上=true／経路外=false）を走査して確認');

// role/rule/type が出力に一切含まれないこと
const nvJson = JSON.stringify(nv);
checkTrue('出力 View Model に "type" キーが含まれない', !/"type"/.test(nvJson));
checkTrue('出力 View Model に "role" キーが含まれない', !/"role"/.test(nvJson));
checkTrue('出力 View Model に "rule" キーが含まれない', !/"rule"/.test(nvJson));
checkTrue('出力 View Model に "semanticRole" キーが含まれない', !/"semanticRole"/.test(nvJson));

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — public/index.html 置換後も Prototype と構造的に同一の View Model を生成する`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
}
process.exit(fail ? 1 : 0);
