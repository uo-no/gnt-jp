/**
 * flow-tree-adapter.js
 * Flow Tree Adapter — Lowfat XML → Flow Tree Representation
 *
 * 目的:  SBLGNT Lowfat XML（`<sentence>`/`<wg>`/`<w>`）を入力とし、
 *         docs/development/flow-tree-representation-schema.md v1 に
 *         準拠した Flow Tree Representation を生成する。
 * 参照:  docs/development/flow-tree-adapter-design.md
 *         docs/development/flow-tree-representation-schema.md
 *         docs/development/neighborhood-view-design.md
 * 制約:  DOM / window に依存しない（Node 単体で動く純関数）。
 *         入力として DOM Element（DOMParser・Node用XMLパーサいずれの
 *         出力でも可）を受け取る。文字列入力は、呼び出し側の実行環境に
 *         `DOMParser` が存在する場合のみパースする。
 *         Lowfat が保持する構造をそのまま変換するのみで、新しい統語
 *         判断・意味解釈・日本語文章・confidence を一切生成しない。
 *         SyntaxAnalyzer / PhraseAnalyzer / ClauseAnalyzer /
 *         ReadingFormatter を参照しない。
 * バージョン: 1.0.0
 */

'use strict';

// =============================================================
// § 1.  class → 構造識別情報 マッピング（Adapter Guarantee (c)）
// =============================================================
//
// docs/development/flow-tree-adapter-design.md §4(c) の通り、既知の
// class 値のみを機械的に 1:1 変換する。未知の class 値は暗黙変換せず、
// Failure Mode（当該ノードを構造識別不能として返さない）を発動する。

const CLASS_MAP = Object.freeze({
    cl:   'clause',
    np:   'phrase.np',
    pp:   'phrase.pp',
    vp:   'phrase.vp',
    adjp: 'phrase.adjp',
    advp: 'phrase.advp',
    nump: 'phrase.nump',
    adv:  'phrase.adv',
    conj: 'phrase.conj',
});

const XML_ID_ATTR = 'xml:id';

// =============================================================
// § 2.  内部ユーティリティ
// =============================================================

function _getAttr(el, name) {
    return typeof el.getAttribute === 'function' ? el.getAttribute(name) : null;
}

function _childElements(el) {
    if (el.children) return Array.from(el.children);
    // children が無い実装（一部のNode用XMLパーサ）向けのフォールバック。
    const out = [];
    for (const node of Array.from(el.childNodes || [])) {
        if (node.nodeType === 1 /* ELEMENT_NODE */) out.push(node);
    }
    return out;
}

function _descendantWords(el) {
    return Array.from(el.getElementsByTagName('w'));
}

function _wordId(wEl) {
    return _getAttr(wEl, XML_ID_ATTR) || _getAttr(wEl, 'ref');
}

/* SF-11: Lowfat の関係属性を「値を改変せず」node へ透過搬送する。
 * role（<w>/<wg> 両方に付きうる）・frame（述語 <w>）・referent（<w>）。
 * 存在する時のみ付与し、無い場合はキーを作らない
 * （L-0: 欠損を埋めない／後方互換／出力サイズ最小）。
 * 値は生の Lowfat 文字列のまま保持する（意味解釈・正規化・別relationへの変換をしない）。 */
function _attachRelationAttrs(node, el) {
    const role = _getAttr(el, 'role');
    if (role != null && role !== '') node.role = role;
    const frame = _getAttr(el, 'frame');
    if (frame != null && frame !== '') node.frame = frame;
    const referent = _getAttr(el, 'referent');
    if (referent != null && referent !== '') node.referent = referent;
}

// =============================================================
// § 3.  Node 変換
// =============================================================
//
// Representation Schema §2 必須項目:
//   id / parentId / type / tokens / children
// SF-11（schema v2）で、Lowfat が持つ関係属性のうち role / frame / referent を
// 「値を改変せず・存在する時のみ」透過搬送する（表示可否は表示層の責務・L-0）。
// rule / clauseType / word type 等は依然として生成しない（SF-10 Tier3・非表示）。
// v1 consumer は追加キーを無視して動く（後方互換）。

/**
 * 単一の DOM 要素（`<w>` または `<wg>`）を Flow Tree Node へ変換する。
 * 子要素は文書順のまま再帰的に変換し、structural order を保持する。
 *
 * @param {Element} el
 * @param {string}   scopeId          合成 id の接頭辞（呼び出し側が指定する
 *                                    一意な文脈識別子。例: 文単位のID）
 * @param {string|null} parentId
 * @param {Object}   nodesById        id → Node（副作用として書き込む索引）
 * @param {Set<string>} unknownClasses 未知の class 値を収集する（Failure Mode検知用）
 * @returns {Object|null} Node、または Failure Mode（未知 class）で null
 */
function convertElement(el, scopeId, parentId, nodesById, unknownClasses) {
    if (!el || !el.tagName) return null;
    const tag = el.tagName.toLowerCase();

    if (tag === 'w') {
        const ref = _getAttr(el, 'ref');
        const id = _wordId(el);
        if (!id) return null; // Failure Mode: 識別不能な token
        const node = {
            id,
            parentId: parentId ?? null,
            type: 'word',
            tokens: ref ? [ref] : [],
            children: [],
        };
        _attachRelationAttrs(node, el);
        nodesById[id] = node;
        return node;
    }

    if (tag === 'wg') {
        const cls = _getAttr(el, 'class');
        let type;
        if (cls === null) {
            // class 属性が存在しない wg。推測せず、構造的パススルーとして
            // 通過させる（Structure Comes From Source: 実在する要素を
            // 落とさない）。
            type = 'group';
        } else {
            type = CLASS_MAP[cls];
            if (!type) {
                // Failure Mode: 未知の class 値。暗黙変換しない。
                if (unknownClasses) unknownClasses.add(cls);
                return null;
            }
        }

        const words = _descendantWords(el);
        const tokens = words.map((w) => _getAttr(w, 'ref')).filter(Boolean);

        const nodeIdAttr = _getAttr(el, 'nodeId');
        const firstId = words.length ? _wordId(words[0]) : null;
        const lastId = words.length ? _wordId(words[words.length - 1]) : null;
        const id = nodeIdAttr || `${scopeId}#${firstId}-${lastId}`;

        const node = {
            id,
            parentId: parentId ?? null,
            type,
            tokens,
            children: [],
        };
        _attachRelationAttrs(node, el);
        nodesById[id] = node;

        for (const child of _childElements(el)) {
            const childNode = convertElement(child, scopeId, id, nodesById, unknownClasses);
            if (childNode !== null) node.children.push(childNode);
        }
        return node;
    }

    return null;
}

// =============================================================
// § 4.  Tree 構築（sentence 単位）
// =============================================================
//
// <sentence> の直下は通常 <wg> だが、まれに <wg> を持たず単一の <w>
// のみで構成される sentence が実在する（Acts 15:29 等, 既知の事実）。
// root を推測で作らず、実際に存在する要素をそのまま root として扱う。

function _findRootElement(sentenceOrRootEl) {
    if (!sentenceOrRootEl) return null;
    const tag = (sentenceOrRootEl.tagName || '').toLowerCase();
    if (tag === 'wg' || tag === 'w') return sentenceOrRootEl;
    if (tag === 'sentence') {
        const wg = typeof sentenceOrRootEl.getElementsByTagName === 'function'
            ? sentenceOrRootEl.getElementsByTagName('wg')[0]
            : null;
        if (wg) return wg;
        const w = typeof sentenceOrRootEl.getElementsByTagName === 'function'
            ? sentenceOrRootEl.getElementsByTagName('w')[0]
            : null;
        return w || null;
    }
    return null;
}

/**
 * Lowfat の `<sentence>`（または直接 `<wg>`/`<w>`）要素から
 * Flow Tree Representation を構築する。
 *
 * @param {Element} rootEl
 * @param {Object}  [options]
 * @param {string}  [options.scopeId='']  合成 id の接頭辞
 * @returns {{root: Object, nodesById: Object, unknownClasses: string[]}|null}
 *          Failure Mode（root が特定できない）の場合は null。
 */
function buildFlowTree(rootEl, options) {
    const opts = options || {};
    const scopeId = opts.scopeId ?? '';
    const el = _findRootElement(rootEl);
    if (!el) return null;

    const nodesById = {};
    const unknownClasses = new Set();
    const root = convertElement(el, scopeId, null, nodesById, unknownClasses);
    if (root === null) return null;

    return { root, nodesById, unknownClasses: Array.from(unknownClasses) };
}

// =============================================================
// § 5.  文字列入力からの構築（parseLowfatXml）
// =============================================================
//
// 文字列入力は、実行環境に DOMParser が存在する場合のみパースする。
// 存在しない場合（DOM/window非依存が要求される Node 実行環境で、
// 呼び出し側が XML パーサを用意していない場合）は Failure Mode として
// null を返す。DOM Element / Document が直接渡された場合はそのまま使う
// （呼び出し側が任意の XML パーサで事前にパース済みであってよい）。

function _resolveElement(xmlInput) {
    if (xmlInput == null) return null;
    if (typeof xmlInput === 'string') {
        if (typeof DOMParser === 'undefined') return null; // Failure Mode
        const doc = new DOMParser().parseFromString(xmlInput, 'application/xml');
        return doc && doc.documentElement ? doc.documentElement : null;
    }
    // Document をそのまま渡された場合
    if (typeof xmlInput.documentElement !== 'undefined') {
        return xmlInput.documentElement;
    }
    // Element が直接渡された場合
    return xmlInput;
}

/**
 * Lowfat XML（文字列 または 事前パース済みの Document/Element）から
 * Flow Tree Representation を構築する公開 API。
 *
 * @param {string|Document|Element} xmlInput
 * @param {Object} [options]  buildFlowTree と同じ
 * @returns {{root: Object, nodesById: Object, unknownClasses: string[]}|null}
 */
function parseLowfatXml(xmlInput, options) {
    const el = _resolveElement(xmlInput);
    if (!el) return null;
    return buildFlowTree(el, options);
}

// =============================================================
// § 6.  エクスポート
// =============================================================

if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.flowTree = window.App.flowTree || {};
    window.App.flowTree.parseLowfatXml = parseLowfatXml;
    window.App.flowTree.buildFlowTree = buildFlowTree;
    window.App.flowTree.convertElement = convertElement;
    window.App.flowTree.CLASS_MAP = CLASS_MAP;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseLowfatXml, buildFlowTree, convertElement, CLASS_MAP };
}
