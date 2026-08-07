#!/usr/bin/env node
/**
 * re-flowtree-adapter-regression.cjs — Flow Tree Adapter Output Contract 回帰テスト
 *
 * 実行: node scripts/re-flowtree-adapter-regression.cjs
 *
 * 対象: public/core/flow-tree-adapter.js
 * 設計正典:
 *   docs/development/flow-tree-adapter-design.md
 *   docs/development/flow-tree-representation-schema.md
 *   docs/development/neighborhood-view-design.md
 *
 * 検証範囲（Adapter Output Contract, A〜F）:
 *   A. token完全性        B. wg完全性            C. parent整合性
 *   D. structural order保持  E. deterministic     F. type mapping完全性
 *
 * 制約:
 *   - NeighborhoodView / Renderer / public/index.html / dev prototype には接続しない。
 *   - 実データ（work/SBLGNT/lowfat/*.xml）を読み込む XML パーサが本プロジェクトに
 *     存在しないため（DOMParser は Node に無く、xmldom 等の依存も未導入）、
 *     本テストは手作りの Element 相当フィクスチャ（DOM Level 2 の最小サブセットを
 *     満たすプレーンオブジェクト）のみを入力とする。実データ全27書での検証は
 *     別途 XML パーサ経路が用意された後のフェーズで行う。
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

const { parseLowfatXml, buildFlowTree, convertElement, CLASS_MAP } =
    requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));

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
// 手作り Element フィクスチャ（DOM Level 2 最小サブセット）
// ══════════════════════════════════════════════════════════════════
function el(tagName, attrs, children) {
    attrs = attrs || {};
    children = children || [];
    return {
        tagName,
        children,
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
        },
        getElementsByTagName(tag) {
            const out = [];
            (function walk(node) {
                for (const c of node.children) {
                    if (c.tagName === tag) out.push(c);
                    walk(c);
                }
            })(this);
            return out;
        },
    };
}

// ══════════════════════════════════════════════════════════════════
// フィクスチャ1: 基本構造（A/B/C/D/E 共通）
//   sentence > wg[cl] > ( w[1], wg[np,nodeId=n-inner] > (w[2], w[3]) )
// ══════════════════════════════════════════════════════════════════
function makeBasicSentence() {
    const w1 = el('w', { ref: 'TEST 1:1!1', 'xml:id': 'w1' });
    const w2 = el('w', { ref: 'TEST 1:1!2', 'xml:id': 'w2' });
    const w3 = el('w', { ref: 'TEST 1:1!3', 'xml:id': 'w3' });
    const innerWg = el('wg', { class: 'np', nodeId: 'n-inner' }, [w2, w3]);
    const rootWg  = el('wg', { class: 'cl' }, [w1, innerWg]);
    const p = el('p', {}, []);
    return el('sentence', {}, [p, rootWg]);
}

console.log('=== A. token完全性 / B. wg完全性 / C. parent整合性 / D. structural order保持 ===\n');

const sentence1 = makeBasicSentence();
const result1 = buildFlowTree(sentence1, { scopeId: 'TEST#0001' });

checkTrue('buildFlowTree が null を返さない（基本構造）', result1 !== null);

// --- A. token完全性 ---
const rawRefs = new Set(sentence1.getElementsByTagName('w').map(w => w.getAttribute('ref')));
const capturedRefs = new Set();
(function collect(node) {
    if (node.type === 'word') capturedRefs.add(node.tokens[0]);
    node.children.forEach(collect);
})(result1.root);
check('A. raw <w> の ref 集合 == Adapter が捕捉した token 集合',
    [...rawRefs].sort(), [...capturedRefs].sort());

// --- B. wg完全性 ---
const rawWgCount = sentence1.getElementsByTagName('wg').length;
let flowNonWordCount = 0;
(function countNonWord(node) {
    if (node.type !== 'word') flowNonWordCount++;
    node.children.forEach(countNonWord);
})(result1.root);
check('B. raw <wg> 数 == Adapter node数（word以外）', flowNonWordCount, rawWgCount);

// --- C. parent整合性（双方向） ---
let parentIntegrityOk = true;
for (const id in result1.nodesById) {
    const node = result1.nodesById[id];
    if (node.parentId !== null && !result1.nodesById[node.parentId]) {
        parentIntegrityOk = false;
    }
}
for (const id in result1.nodesById) {
    const node = result1.nodesById[id];
    for (const child of node.children) {
        if (child.parentId !== node.id) parentIntegrityOk = false;
    }
}
checkTrue('C. 全Nodeについて parentId が指す親が実在し、children↔parentId が双方向一致する', parentIntegrityOk);
check('C. root の parentId は null', result1.root.parentId, null);

// --- D. structural order保持 ---
check('D. root.children の並びが XML子要素順と一致（w1 が先、n-inner が後）',
    result1.root.children.map(c => c.id), ['w1', 'n-inner']);
const innerNode = result1.root.children[1];
check('D. innerWg.children の並びが XML子要素順と一致（w2, w3）',
    innerNode.children.map(c => c.id), ['w2', 'w3']);
check('D. nodeId 属性を持つ wg は、その値をそのまま id として使う', innerNode.id, 'n-inner');

console.log('\n=== E. deterministic ===\n');

const resultA = buildFlowTree(makeBasicSentence(), { scopeId: 'TEST#0001' });
const resultB = buildFlowTree(makeBasicSentence(), { scopeId: 'TEST#0001' });
check('E. 同一入力から2回構築した root が完全一致する', resultA.root, resultB.root);

console.log('\n=== F. type mapping完全性 ===\n');

// F1: CLASS_MAP の全既知 class が期待通り変換される
for (const [cls, expectedType] of Object.entries(CLASS_MAP)) {
    const w = el('w', { ref: `TEST 1:1!${cls}`, 'xml:id': `w-${cls}` });
    const wg = el('wg', { class: cls }, [w]);
    const nodesById = {};
    const node = convertElement(wg, 'TEST#F1', null, nodesById, new Set());
    check(`F1. class="${cls}" → type="${expectedType}"`, node && node.type, expectedType);
}

// F2: 未知 class は Failure Mode（null を返し、unknownClasses に記録）
{
    const w = el('w', { ref: 'TEST 1:1!99', 'xml:id': 'w99' });
    const wg = el('wg', { class: 'zzz-unknown' }, [w]);
    const unknownClasses = new Set();
    const node = convertElement(wg, 'TEST#F2', null, {}, unknownClasses);
    check('F2. 未知 class は node を null として返す（暗黙変換しない）', node, null);
    checkTrue('F2. 未知 class 値が unknownClasses に記録される', unknownClasses.has('zzz-unknown'));
}

// F3: class 属性が存在しない wg は type="group" として保持する（Failure Mode ではない）
{
    const w = el('w', { ref: 'TEST 1:1!5', 'xml:id': 'w5' });
    const wgNoClass = el('wg', {}, [w]); // class 属性なし
    const nodesById = {};
    const node = convertElement(wgNoClass, 'TEST#F3', null, nodesById, new Set());
    checkTrue('F3. class 属性なし wg は破棄されない', node !== null);
    check('F3. class 属性なし wg の type は "group"', node && node.type, 'group');
    check('F3. class 属性なし wg でも配下 token は失われない', node && node.tokens, ['TEST 1:1!5']);
}

console.log('\n=== 補足: <sentence> 直下が <w> のみのケース（既知の実例: Acts 15:29） ===\n');
{
    const w = el('w', { ref: 'TEST 1:1!1', 'xml:id': 'w1' });
    const bareSentence = el('sentence', {}, [el('p', {}, []), w]);
    const result = buildFlowTree(bareSentence, { scopeId: 'TEST#BARE' });
    checkTrue('補足. <wg> を持たない sentence でも root が特定される', result !== null);
    check('補足. root の type は "word"', result && result.root.type, 'word');
    check('補足. root の id は該当 <w> の xml:id', result && result.root.id, 'w1');
}

console.log('\n=== parseLowfatXml（文字列入力・Element入力） ===\n');
{
    // Node 実行環境には DOMParser が存在しないため、文字列入力は
    // Failure Mode（null）として扱われることを確認する。
    const strResult = parseLowfatXml('<sentence><wg class="cl"><w ref="X 1:1!1" xml:id="w1">λόγος</w></wg></sentence>');
    check('parseLowfatXml: DOMParser が存在しない Node 環境では文字列入力は null（Failure Mode）', strResult, null);

    // 事前パース済み Element（本テストのフィクスチャ）を直接渡した場合は
    // buildFlowTree と同じ結果になることを確認する。
    const elResult = parseLowfatXml(makeBasicSentence(), { scopeId: 'TEST#0001' });
    checkTrue('parseLowfatXml: 事前パース済み Element を渡すと buildFlowTree と同じ結果を返す',
        elResult !== null && JSON.stringify(elResult.root) === JSON.stringify(result1.root));
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Flow Tree Adapter Output Contract（手作りフィクスチャ範囲）を満たす`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
}
process.exit(fail ? 1 : 0);
