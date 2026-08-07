#!/usr/bin/env node
/**
 * re-neighborhoodview-regression.cjs — NeighborhoodView Model 単体テスト
 *
 * 実行: node scripts/re-neighborhoodview-regression.cjs
 *
 * 対象: public/core/neighborhood-view.js
 * 設計正典:
 *   docs/development/neighborhood-view-design.md
 *   docs/development/flow-tree-adapter-design.md
 *   docs/development/flow-tree-representation-schema.md
 *
 * 確認範囲:
 *   1. focus token が正しく特定されること
 *   2. clause anchor 探索（直近の type==='clause' 祖先）
 *   3. root fallback（clause 祖先が無い場合）
 *   4. children の structural order 保持
 *   5. type 以外の意味属性（role/rule/semanticRole）へ依存していないこと
 *
 * 制約:
 *   - public/index.html / Renderer / UI には一切接続しない。
 *   - flow-tree-adapter.js を経由して実際の Representation を生成し、
 *     それを neighborhood-view.js へ渡す（Adapter/View 間の実接続を検証する）。
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

const { buildFlowTree, convertElement } =
    requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));
const { buildNeighborhoodView } =
    requireCjs(path.join(PUBLIC, 'core', 'neighborhood-view.js'));

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
// 手作り Element フィクスチャ（re-flowtree-adapter-regression.cjs と同じ方式）
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

// 検索用の再帰ヘルパー（出力ツリーの中から特定 nodeId のノードを探す）
function findVm(vmNode, nodeId) {
    if (!vmNode) return null;
    if (vmNode.nodeId === nodeId) return vmNode;
    for (const c of vmNode.children || []) {
        const found = findVm(c, nodeId);
        if (found) return found;
    }
    return null;
}
function findVmInList(list, nodeId) {
    for (const item of list) {
        const found = findVm(item, nodeId);
        if (found) return found;
    }
    return null;
}

console.log('=== 1. focus node探索 / 2. clause anchor探索 / 4. structural order保持 ===\n');

// 構造: sentence > wg[cl] > ( w[w1], wg[np,nodeId=n-inner] > (w[w2], w[w3]) )
// focus = w3（inner np の2番目の子）→ anchor は cl（直近の clause 祖先）
{
    const w1 = el('w', { ref: 'TEST 1:1!1', 'xml:id': 'w1' });
    const w2 = el('w', { ref: 'TEST 1:1!2', 'xml:id': 'w2' });
    const w3 = el('w', { ref: 'TEST 1:1!3', 'xml:id': 'w3' });
    const innerWg = el('wg', { class: 'np', nodeId: 'n-inner' }, [w2, w3]);
    const clWg = el('wg', { class: 'cl', nodeId: 'n-clause' }, [w1, innerWg]);
    const sentence = el('sentence', {}, [el('p', {}, []), clWg]);

    const rep = buildFlowTree(sentence, { scopeId: 'TEST#0001' });
    checkTrue('Representation が構築できる（前提条件）', rep !== null);

    // --- 1. focus node探索: token ref 指定 ---
    const vmByRef = buildNeighborhoodView(rep, 'TEST 1:1!3');
    checkTrue('1. token ref で focus node を特定できる（null でない）', vmByRef !== null);

    // --- 1. focus node探索: node id 指定 ---
    const vmById = buildNeighborhoodView(rep, 'w3');
    check('1. node id 指定と token ref 指定で同じ結果になる', vmById, vmByRef);

    // --- 2. clause anchor探索 ---
    check('2. anchor は直近の clause 祖先（n-clause）', vmByRef.anchorId, 'n-clause');
    checkTrue('2. usedFallback は false（clause 祖先が見つかったため）', vmByRef.usedFallback === false);

    // --- constituent抽出 + 4. structural order保持 ---
    check('4. anchor.children の並びが XML子要素順のまま（w1 が先、n-inner が後）',
        vmByRef.constituents.map(c => c.nodeId), ['w1', 'n-inner']);

    // isFocus: w3 のみ true
    const w1Vm = findVmInList(vmByRef.constituents, 'w1');
    const innerVm = findVmInList(vmByRef.constituents, 'n-inner');
    const w2Vm = findVm(innerVm, 'w2');
    const w3Vm = findVm(innerVm, 'w3');
    checkTrue('isFocus: w1 は false', w1Vm.isFocus === false);
    checkTrue('isFocus: w2 は false', w2Vm.isFocus === false);
    checkTrue('isFocus: w3 は true（focus 本人）', w3Vm.isFocus === true);

    // expanded: focus への経路上のみ true。children は expanded=false でも削除しない。
    checkTrue('expanded: w1（葉・経路外）は false', w1Vm.expanded === false);
    check('expanded=false でも children は空配列として保持される（省略しない）', w1Vm.children, []);
    checkTrue('expanded: n-inner（focus を含む経路上・子を持つ）は true', innerVm.expanded === true);
    check('expanded=true の場合、children は構成員を保持する', innerVm.children.map(c => c.nodeId), ['w2', 'w3']);
    checkTrue('expanded: w2（葉・経路外）は false', w2Vm.expanded === false);
    checkTrue('expanded: w3（葉・focus 本人／子を持たない）は false（子が無いため定義上 true になり得ない）', w3Vm.expanded === false);

    // tokens: 未加工のまま Representation の tokens を透過する（並び替え・辞書引きをしない）
    check('tokens は Representation の値をそのまま透過する（w1）', w1Vm.tokens, ['TEST 1:1!1']);
    check('tokens は Representation の値をそのまま透過する（n-inner, 未加工の構造順）', innerVm.tokens, ['TEST 1:1!2', 'TEST 1:1!3']);
}

console.log('\n=== 3. root fallback（clause 祖先が無い場合） ===\n');

// 構造: sentence > wg[np,nodeId=n-root] > ( w[w1], wg[np,nodeId=n-inner] > w[w2] )
// clause が一切存在しない → anchor は最上位祖先（n-root）にフォールバック
{
    const w1 = el('w', { ref: 'TEST 2:1!1', 'xml:id': 'w1' });
    const w2 = el('w', { ref: 'TEST 2:1!2', 'xml:id': 'w2' });
    const innerWg = el('wg', { class: 'np', nodeId: 'n-inner' }, [w2]);
    const rootWg = el('wg', { class: 'np', nodeId: 'n-root' }, [w1, innerWg]);
    const sentence = el('sentence', {}, [el('p', {}, []), rootWg]);

    const rep = buildFlowTree(sentence, { scopeId: 'TEST#0002' });
    const vm2 = buildNeighborhoodView(rep, 'TEST 2:1!2');

    checkTrue('3. clause 祖先が無い場合 usedFallback は true', vm2.usedFallback === true);
    check('3. anchor は最上位祖先（n-root）にフォールバックする', vm2.anchorId, 'n-root');
    check('3. フォールバック anchor の constituents も structural order を保持する',
        vm2.constituents.map(c => c.nodeId), ['w1', 'n-inner']);
}

console.log('\n=== 3b. root fallback（focus 自身が root で祖先が無い場合） ===\n');
{
    // sentence 直下が単一 <w> のみ（Acts 15:29 相当）。祖先が存在しないため
    // anchor が特定できず、buildNeighborhoodView は null（Failure Mode）を返す。
    const w1 = el('w', { ref: 'TEST 3:1!1', 'xml:id': 'w1' });
    const sentence = el('sentence', {}, [el('p', {}, []), w1]);
    const rep = buildFlowTree(sentence, { scopeId: 'TEST#0003' });
    const vm3 = buildNeighborhoodView(rep, 'TEST 3:1!1');
    check('3b. 祖先を持たない focus（root 自身）は anchor 不在として null を返す（Failure Mode）', vm3, null);
}

console.log('\n=== 5. type 以外の意味属性へ依存していないこと（role/rule/semanticRole） ===\n');
{
    // neighborhood-view.js は Representation を直接受け取る設計であり、
    // Adapter が生成しないフィールド（role/rule/semanticRole）が仮に
    // 混入していても、出力にもロジックにも影響しないことを確認する。
    const nodesById = {
        'root':  { id: 'root',  parentId: null,  type: 'clause',    tokens: [], children: [], role: 'p', rule: 'NPofNP', semanticRole: 'agent' },
        'child': { id: 'child', parentId: 'root', type: 'word',     tokens: ['TEST 4:1!1'], children: [], role: 'adv', rule: 'X', semanticRole: 'theme' },
    };
    nodesById.root.children = [nodesById.child];
    const rep = { root: nodesById.root, nodesById };

    const vm4 = buildNeighborhoodView(rep, 'TEST 4:1!1');
    checkTrue('5. role/rule/semanticRole が混入していても focus/anchor 判定は成立する', vm4 !== null && vm4.anchorId === 'root');

    const outputJson = JSON.stringify(vm4);
    checkTrue('5. 出力に "role" というキーが一切現れない', !/"role"/.test(outputJson));
    checkTrue('5. 出力に "rule" というキーが一切現れない', !/"rule"/.test(outputJson));
    checkTrue('5. 出力に "semanticRole" というキーが一切現れない', !/"semanticRole"/.test(outputJson));
    checkTrue('5. 出力に "type" というキーが一切現れない（表示禁止・anchor探索用途のみ）', !/"type"/.test(outputJson));

    // role/rule/semanticRole の値を変えても、同じ focus/構造であれば出力が変わらないこと
    const nodesById2 = {
        'root':  { id: 'root',  parentId: null,  type: 'clause', tokens: [], children: [], role: 'DIFFERENT', rule: 'DIFFERENT', semanticRole: 'DIFFERENT' },
        'child': { id: 'child', parentId: 'root', type: 'word',  tokens: ['TEST 4:1!1'], children: [] },
    };
    nodesById2.root.children = [nodesById2.child];
    const rep2 = { root: nodesById2.root, nodesById: nodesById2 };
    const vm4b = buildNeighborhoodView(rep2, 'TEST 4:1!1');
    check('5. role/rule/semanticRole の値を変えても出力は不変', vm4b, vm4);
}

console.log('\n=== Failure Mode: 不正入力 ===\n');
{
    check('Representation が null の場合 null を返す', buildNeighborhoodView(null, 'X'), null);
    check('focusSpec が未指定の場合 null を返す', buildNeighborhoodView({ nodesById: {} }, undefined), null);
    check('focus node が存在しない場合 null を返す', buildNeighborhoodView({ nodesById: {} }, 'not-found'), null);
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — NeighborhoodView Model の最小契約を満たす`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
}
process.exit(fail ? 1 : 0);
