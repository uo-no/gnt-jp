/**
 * neighborhood-view.js
 * NeighborhoodView Model Builder — Flow Tree Representation → NeighborhoodView Model
 *
 * 目的:  `flow-tree-adapter.js` の出力（Flow Tree Representation）を入力とし、
 *         対象語（focus）が実際に属する構成語群を観察可能にする
 *         NeighborhoodView Model を生成する。
 * 参照:  docs/development/neighborhood-view-design.md
 *         docs/development/flow-tree-adapter-design.md
 *         docs/development/flow-tree-representation-schema.md
 * 境界:  DOM / window に依存しない（Node 単体で動く純関数）。
 *         Flow Tree Adapter を呼び出さない（Representation を引数として受け取る）。
 *         SyntaxAnalyzer / PhraseAnalyzer / ClauseAnalyzer / ReadingFormatter /
 *         bible_data を一切参照しない。
 *
 * 実装する:
 *   - focus node探索（token ref または node id）
 *   - anchor探索（直近の clause 祖先）
 *   - type による clause 祖先探索
 *   - sentence root fallback（clause 祖先が無い場合）
 *   - expanded 状態生成
 *   - constituent抽出（anchor の直接の子を、対象語を含めてそのまま列挙）
 *
 * 実装しない（Renderer / UI / Display Policy 側の責務）:
 *   - 日本語ラベル生成・辞書参照
 *   - token の並び替え・surface order 処理
 *   - HTML生成・CSS判断
 *   - role / rule / semanticRole の利用
 *
 * type について:
 *   type は構造識別属性として anchor 探索（直近の clause 祖先の判定）にのみ
 *   利用する（neighborhood-view-design.md §6「type 利用の境界」＝ View内部
 *   判断用途は許可・表示用途は禁止）。出力 View Model には type を一切
 *   含めない。
 *
 * expanded について:
 *   これは NeighborhoodView Model 生成時点での構造展開状態（focus への
 *   経路上にあり、かつ子を持つか）を示すフラグに過ぎない。画面上の
 *   表示量制御（折りたたみ・件数表示等）は Display Policy 層の責務で
 *   あり、本モジュールはそれを行わない。children は expanded の値に
 *   かかわらず常に構造情報として保持し、省略しない
 *   （neighborhood-view-design.md §4「保証対象外」＝表示量制御と、
 *   本モジュールが供給するデータの完全性は別の性質である）。
 *
 * バージョン: 1.0.0
 */

'use strict';

// =============================================================
// § 1.  定数
// =============================================================
//
// flow-tree-adapter.js の CLASS_MAP により、Lowfat の class="cl" は
// type="clause" へ変換される（安定した契約値。CLASS_MAP.cl と一致）。

const CLAUSE_TYPE = 'clause';

// =============================================================
// § 2.  focus node探索
// =============================================================

/**
 * focus 指定（node id または token ref）から、Representation 上の
 * 該当ノードを探す。
 *
 * @param {Object} nodesById  id → Node
 * @param {string} focusSpec  node id または token ref
 * @returns {Object|null}
 */
function _findFocusNode(nodesById, focusSpec) {
    if (!nodesById || !focusSpec) return null;

    // node id として直接一致するか（Adapter の id はそのまま探索キーとして使える）
    if (Object.prototype.hasOwnProperty.call(nodesById, focusSpec)) {
        return nodesById[focusSpec];
    }

    // token ref として、word ノードの tokens[0] と一致するものを探す
    for (const id in nodesById) {
        const node = nodesById[id];
        if (node.type === 'word' && Array.isArray(node.tokens) && node.tokens[0] === focusSpec) {
            return node;
        }
    }
    return null;
}

// =============================================================
// § 3.  anchor探索（type による clause 祖先探索 + sentence root fallback）
// =============================================================

/**
 * focus node から parentId を辿り、祖先の並び（直近が先頭）を返す。
 *
 * @param {Object} nodesById
 * @param {Object} node
 * @returns {Object[]}
 */
function _buildParentChain(nodesById, node) {
    const chain = [];
    let curId = node ? node.parentId : null;
    while (curId !== null && curId !== undefined && nodesById[curId]) {
        const ancestor = nodesById[curId];
        chain.push(ancestor);
        curId = ancestor.parentId;
    }
    return chain;
}

/**
 * focus node から見た anchor（直近の clause 祖先。無ければ最上位祖先＝
 * sentence root 相当）を探す。
 *
 * @param {Object} nodesById
 * @param {Object} focusNode
 * @returns {{anchor: Object|null, usedFallback: boolean}}
 */
function _findAnchor(nodesById, focusNode) {
    const chain = _buildParentChain(nodesById, focusNode);
    for (const ancestor of chain) {
        if (ancestor.type === CLAUSE_TYPE) {
            return { anchor: ancestor, usedFallback: false };
        }
    }
    // Fallback: clause 祖先が見つからない場合、chain の最後（最上位祖先）を
    // anchor とする。
    const anchor = chain.length > 0 ? chain[chain.length - 1] : null;
    return { anchor, usedFallback: true };
}

// =============================================================
// § 4.  expanded 状態生成 + constituent抽出
// =============================================================

/**
 * node が focus への経路上（node 自身が focus、または子孫に focus を含む）
 * かどうかを判定する。
 *
 * @param {Object} node
 * @param {string} focusId
 * @returns {boolean}
 */
function _isOnPath(node, focusId) {
    if (!node) return false;
    if (node.id === focusId) return true;
    return (node.children || []).some((c) => _isOnPath(c, focusId));
}

/**
 * Representation の Node を NeighborhoodView Model の Node へ変換する。
 * children は expanded の値にかかわらず常に含める（省略しない）。
 *
 * @param {Object} node
 * @param {string} focusId
 * @returns {{nodeId: string, tokens: string[], isFocus: boolean, expanded: boolean, children: Array}}
 */
function _toViewModelNode(node, focusId) {
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const expanded = hasChildren && _isOnPath(node, focusId);
    return {
        nodeId: node.id,
        tokens: Array.isArray(node.tokens) ? node.tokens.slice() : [],
        isFocus: node.id === focusId,
        expanded,
        children: (node.children || []).map((c) => _toViewModelNode(c, focusId)),
    };
}

// =============================================================
// § 5.  公開 API
// =============================================================

/**
 * Flow Tree Representation から NeighborhoodView Model を構築する。
 *
 * @param {{root: Object, nodesById: Object}} representation
 *        flow-tree-adapter.js の buildFlowTree()/parseLowfatXml() 戻り値
 *        （{root, nodesById, unknownClasses}）。nodesById のみを利用する。
 * @param {string} focusSpec  focus token の ref、または node の id
 * @returns {{anchorId: string, usedFallback: boolean, constituents: Array}|null}
 *          focus node または anchor が特定できない場合は null（Failure Mode）
 */
function buildNeighborhoodView(representation, focusSpec) {
    if (!representation || !representation.nodesById) return null;
    const { nodesById } = representation;

    const focusNode = _findFocusNode(nodesById, focusSpec);
    if (!focusNode) return null;

    const { anchor, usedFallback } = _findAnchor(nodesById, focusNode);
    if (!anchor) return null;

    const constituents = (anchor.children || []).map((c) => _toViewModelNode(c, focusNode.id));

    return {
        anchorId: anchor.id,
        usedFallback,
        constituents,
    };
}

// =============================================================
// § 6.  エクスポート
// =============================================================

if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.neighborhoodView = window.App.neighborhoodView || {};
    window.App.neighborhoodView.buildNeighborhoodView = buildNeighborhoodView;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildNeighborhoodView };
}
