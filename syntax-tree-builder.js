/**
 * syntax-tree-builder.js — Phase G: SyntaxTreeBuilder
 *
 * syntax-tree-spec.md 準拠。
 * HTML/CSS 縦展開ツリーのノード配列を構築する。
 * 依存: syntax-search.html の groupTokens() / cleanText() / ROLE_META / decodeMorph()
 *
 * 使用方法:
 *   const nodes = SyntaxTreeBuilder.build(tokens, roleMap, params, analysisResults);
 *   SyntaxTreeBuilder.render(nodes, containerEl, onNodeClick);
 */

'use strict';

/* ── 表示順序（syntax-tree-spec.md § 4-3） ─────────────────────────── */
const DISPLAY_ORDER = [
    'conj',
    'verb',
    'subj',
    'pred-nom',
    'obj',
    'ptc',
    'inf',
    'prep',
    'mod',
    'vocative',
    'other',
];

/* ── confidence 文字列 → 数値（§ 7-2） ────────────────────────────── */
const CONFIDENCE_NUMERIC = {
    high:   0.85,
    medium: 0.60,
    low:    0.35,
};

/* ── 分詞用法ラベル（candidates[].id → 日本語） ────────────────────── */
const PARTICIPLE_USAGE_LABEL = {
    'participle.substantival':        '実体用法（名詞的）',
    'participle.attributive':         '限定用法（形容詞的）',
    'participle.adverbial_temporal':  '副詞的分詞（時間）',
    'participle.adverbial_causal':    '副詞的分詞（理由）',
    'participle.adverbial_conditional':'副詞的分詞（条件）',
    'participle.adverbial_concessive':'副詞的分詞（譲歩）',
    'participle.adverbial_purpose':   '副詞的分詞（目的）',
    'participle.adverbial_manner':    '副詞的分詞（様態）',
    'participle.genitive_absolute':   '属格絶対分詞',
    'participle.complementary':       '補語的分詞',
    'participle.periphrastic':        '迂言的分詞',
    'genitive.absolute':              '属格絶対',
};

/* ── 形態情報 → 日本語（ノード Level 2 展開用） ────────────────────── */
/* TENSE_JP / VOICE_JP / MOOD_JP / CASE_JP / NUMBER_JP / GENDER_JP は
   syntax-search.html で定義済み。重複宣言を削除。 */

function morphLabel(morph) {
    if (!morph) return '';
    const parts = [];
    if (morph.mood)   parts.push(MOOD_JP[morph.mood]   || morph.mood);
    if (morph.tense)  parts.push(TENSE_JP[morph.tense] || morph.tense);
    if (morph.voice)  parts.push(VOICE_JP[morph.voice] || morph.voice);
    if (morph.case)   parts.push(CASE_JP[morph.case]   || morph.case);
    if (morph.number) parts.push(NUMBER_JP[morph.number]|| morph.number);
    if (morph.gender) parts.push(GENDER_JP[morph.gender]|| morph.gender);
    return parts.join('・');
}

/* ─────────────────────────────────────────────────────────────────────
   SyntaxTreeBuilder
───────────────────────────────────────────────────────────────────── */
const SyntaxTreeBuilder = (() => {

    /**
     * build(tokens, roleMap, params, analysisResults) → TreeNode[]
     *
     * @param {Array}  tokens          節内トークン配列
     * @param {Map}    roleMap         assignSyntacticRoles() の結果
     * @param {Object} params          URLパラメータ（params.word / params.lemma）
     * @param {Object} analysisResults SyntaxAnalyzer.analyzeAll() の結果（任意）
     *                                 { results: [{ tokenIdx, output }] }
     */
    function build(tokens, roleMap, params, analysisResults) {
        // 1. グループ化（groupTokens を再実装。前置詞句は members をまとめる）
        const groups = _groupTokens(tokens, roleMap);

        // 2. DISPLAY_ORDER でソート
        groups.sort((a, b) => {
            const ia = DISPLAY_ORDER.indexOf(a.role);
            const ib = DISPLAY_ORDER.indexOf(b.role);
            return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
        });

        // 3. analysisResults をトークンインデックス → output の Map に変換
        const analysisMap = new Map();
        if (analysisResults && Array.isArray(analysisResults.results)) {
            for (const r of analysisResults.results) {
                analysisMap.set(r.tokenIdx, r.output);
            }
        }

        // 4. 各グループを TreeNode に変換
        const targetNorm = _normalize(params && (params.word || params.lemma) || '');
        let nodes = groups.map(g => _buildNode(g, tokens, roleMap, analysisMap, targetNorm));

        // 5. Phase G 完了条件: 分詞ノードを動詞ノードの children に移動する
        //    動詞ノードが存在する場合のみ。存在しない場合はルートに残す。
        const verbNode = nodes.find(n => n.role === 'verb');
        if (verbNode) {
            const ptcNodes = nodes.filter(n => n.role === 'ptc');
            if (ptcNodes.length > 0) {
                verbNode.children = verbNode.children.concat(ptcNodes);
                const ptcSet = new Set(ptcNodes);
                nodes = nodes.filter(n => !ptcSet.has(n));
            }
        }

        return nodes;
    }

    /* ── グループ化（syntax-search.html の groupTokens と同等） ──── */
    function _groupTokens(tokens, roleMap) {
        const groups = [];
        let i = 0;
        while (i < tokens.length) {
            const t   = tokens[i];
            const pos = _posCode(t);

            if (pos === 'P') {
                // 前置詞句: 後続する名詞系をかき集める
                const members = [t];
                let j = i + 1;
                while (j < tokens.length) {
                    const np = _posCode(tokens[j]);
                    const isNominal = ['N','T','A','D','R',''].includes(np);
                    if (isNominal) { members.push(tokens[j]); j++; }
                    else break;
                }
                groups.push({ role: 'prep', members, baseIdx: i });
                i = j;
            } else {
                const r = roleMap.get(t);
                groups.push({ role: r ? r.role : 'other', members: [t], baseIdx: i });
                i++;
            }
        }
        return groups;
    }

    /* ── TreeNode 構築 ───────────────────────────────────────────── */
    function _buildNode(group, tokens, roleMap, analysisMap, targetNorm) {
        const { role, members, baseIdx } = group;

        // words: cleanText を結合
        const words = members.map(_cleanText).filter(Boolean).join(' ');

        // confidence: roleMap から取得 → 数値に変換
        const roleInfo = roleMap.get(members[0]);
        const confStr  = roleInfo ? (roleInfo.confidence || 'medium') : 'medium';
        const confidence = CONFIDENCE_NUMERIC[confStr] || 0.60;

        // isTarget: params.word と一致するトークンを含むか
        const isTarget = members.some(t => _normalize(_cleanText(t)) === targetNorm && targetNorm !== '');

        // children: 前置詞句・分詞・不定詞の場合に子ノードを生成
        const children = _buildChildren(role, members, baseIdx, tokens, analysisMap);

        // usageInfo: 分詞の場合のみ
        const usageInfo = _buildUsageInfo(role, members, baseIdx, analysisMap);

        // morph: Level 2 表示用
        const morph = members[0] ? _decodeMorph(members[0]) : null;

        return {
            role,
            members,
            baseIdx,
            words,
            confidence,
            children,
            usageInfo,
            isTarget,
            morph,
        };
    }

    /* ── 子ノード生成 ────────────────────────────────────────────── */
    function _buildChildren(role, members, baseIdx, tokens, analysisMap) {
        const children = [];

        if (role === 'prep') {
            // 前置詞句: 前置詞 + 格補語 を子ノードとして列挙
            members.forEach((t, i) => {
                const m   = _decodeMorph(t);
                const pos = _posCode(t);
                const lbl = pos === 'P' ? '前置詞'
                          : m.case ? (CASE_JP[m.case] || m.case)
                          : '補語';
                children.push({
                    role:       'other',
                    members:    [t],
                    baseIdx:    baseIdx + i,
                    words:      _cleanText(t),
                    confidence: 1.0,
                    children:   [],
                    usageInfo:  null,
                    isTarget:   false,
                    morph:      m,
                    _subLabel:  lbl,
                });
            });
        } else if (role === 'ptc' || role === 'inf') {
            // 分詞・不定詞: usageInfo は別フィールド。子ノードなし（spec § 4-2）
        }

        return children;
    }

    /* ── 分詞用法情報 ────────────────────────────────────────────── */
    function _buildUsageInfo(role, members, baseIdx, analysisMap) {
        if (role !== 'ptc') return null;

        const output = analysisMap.get(baseIdx);
        if (!output || !Array.isArray(output.candidates) || output.candidates.length === 0) {
            return null;
        }

        const top = output.candidates[0];
        const label = PARTICIPLE_USAGE_LABEL[top.id] || top.label_ja || top.id;
        return {
            label,
            confidence: top.confidence,
            id:         top.id,
        };
    }

    /* ── DOM レンダリング（親子インデントツリー形式） ──────────────── */
    /**
     * render(nodes, container, onNodeClick)
     *
     * 仕様通りの親子インデント形式で描画する。
     *   例：
     *     動詞
     *     └─ 主語
     *         └─ 修飾語
     *
     * @param {TreeNode[]} nodes
     * @param {Element}    container   — .syn-tree コンテナ要素
     * @param {Function}   onNodeClick — (baseIdx) => void
     */
    function render(nodes, container, onNodeClick) {
        container.innerHTML = '';

        if (!nodes || nodes.length === 0) {
            container.innerHTML = '<div class="tree-empty">構文グループを特定できませんでした。</div>';
            return;
        }

        // 動詞ノードをルートとして、残りを子として配置する
        // 動詞がない場合は全ノードをフラットに並べる
        const verbNode = nodes.find(n => n.role === 'verb');
        const otherNodes = nodes.filter(n => n !== verbNode);

        if (verbNode) {
            // 動詞ノード下に全他ノードをぶら下げる構造
            const rootEl = _renderIndentNode(verbNode, otherNodes, onNodeClick, 0);
            container.appendChild(rootEl);
        } else {
            // 動詞なし: そのままインデントなしで並べる
            for (const node of nodes) {
                const el = _renderIndentNode(node, [], onNodeClick, 0);
                container.appendChild(el);
            }
        }
    }

    /**
     * _renderIndentNode — 親子インデント形式のノード1行を描画する
     * @param {Object}   node         描画対象ノード
     * @param {Array}    childNodes   このノードの子として表示するノード配列
     * @param {Function} onNodeClick
     * @param {number}   depth        インデント深さ（0 = ルート）
     */
    function _renderIndentNode(node, childNodes, onNodeClick, depth) {
        const ROLE_META_LOCAL = window.ROLE_META || {};
        const meta   = ROLE_META_LOCAL[node.role] || { label: node.role, barColor: '#bbb' };
        const confPct = Math.round(node.confidence * 100);
        const confCls = node.confidence >= 0.75 ? 'conf-high'
                      : node.confidence >= 0.55 ? 'conf-medium' : 'conf-low';
        const morphText = morphLabel(node.morph);
        const hasSubChildren = (node.children && node.children.length > 0) || node.usageInfo;
        const hasChildren = childNodes.length > 0 || hasSubChildren;

        /* ── ラッパー ── */
        const wrap = document.createElement('div');
        wrap.className = 'itree-wrap';
        wrap.style.cssText = `
            display: flex;
            flex-direction: column;
            margin-left: ${depth > 0 ? '0' : '0'}px;
        `;

        /* ── インデントガイド行 ── */
        const row = document.createElement('div');
        row.style.cssText = `display: flex; align-items: stretch; min-height: 36px;`;

        // 深さ分のインデント柱
        for (let d = 0; d < depth; d++) {
            const guide = document.createElement('div');
            guide.style.cssText = `
                width: 20px;
                flex-shrink: 0;
                position: relative;
            `;
            // 縦線
            const vline = document.createElement('div');
            vline.style.cssText = `
                position: absolute;
                left: 10px; top: 0; bottom: 0;
                width: 1.5px;
                background: var(--border, rgba(0,0,0,0.08));
            `;
            guide.appendChild(vline);
            // 最後の列のみ L 字横線を追加
            if (d === depth - 1) {
                const hline = document.createElement('div');
                hline.style.cssText = `
                    position: absolute;
                    left: 10px; top: 50%;
                    width: 10px; height: 1.5px;
                    background: var(--border, rgba(0,0,0,0.08));
                `;
                guide.appendChild(hline);
            }
            row.appendChild(guide);
        }

        /* ── ノード本体ボタン ── */
        const nodeEl = document.createElement('div');
        nodeEl.className = 'itree-node' + (node.isTarget ? ' active' : '');
        nodeEl.dataset.role    = node.role;
        nodeEl.dataset.baseIdx = node.baseIdx;
        nodeEl.setAttribute('role', 'button');
        nodeEl.setAttribute('tabindex', '0');
        nodeEl.setAttribute('aria-label', `${meta.label} ${node.words} ${confPct}%`);
        nodeEl.style.cssText = `
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid var(--border, rgba(0,0,0,0.07));
            background: var(--bg, #fff);
            cursor: pointer;
            min-height: 36px;
            transition: background 0.1s, border-color 0.12s;
            margin: 2px 0;
            user-select: none;
        `;
        if (node.isTarget) {
            nodeEl.style.borderColor = meta.barColor;
            nodeEl.style.boxShadow   = `0 0 0 2px ${meta.barColor}22`;
        }

        nodeEl.innerHTML = `
            <span style="
                width: 3px; height: 20px; border-radius: 2px; flex-shrink:0;
                background: ${_esc(meta.barColor)};
            "></span>
            <span style="
                font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em;
                color: ${_esc(meta.barColor)}; flex-shrink: 0; min-width: 36px;
            ">${_esc(meta.label)}</span>
            <span class="greek-headword" style="flex:1; font-size:1.0rem; min-width:0; word-break:break-word;">${_esc(node.words)}</span>
            ${morphText ? `<span style="font-size:0.65rem;color:var(--text-hint,#8e8e93);flex-shrink:0;">${_esc(morphText)}</span>` : ''}
            <span class="${confCls}" style="font-size:0.65rem;font-weight:700;flex-shrink:0;">${confPct}%</span>
            ${hasChildren ? `<span style="font-size:0.65rem;color:var(--text-hint,#8e8e93);flex-shrink:0;transition:transform 0.15s;" class="itree-arrow">›</span>` : ''}
        `;

        row.appendChild(nodeEl);
        wrap.appendChild(row);

        /* ── 子コンテナ（折りたたみ） ── */
        const childWrap = document.createElement('div');
        childWrap.className = 'itree-children';
        childWrap.style.display = 'none';

        // 前置詞句などの sub-children
        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                if (child.role === 'ptc') {
                    const childEl = _renderIndentNode(child, [], onNodeClick, depth + 1);
                    childWrap.appendChild(childEl);
                } else {
                    // 前置詞句子要素
                    const childEl = _renderPrepChild(child, depth + 1, onNodeClick);
                    childWrap.appendChild(childEl);
                }
            }
        }

        // usageInfo（分詞用法）
        if (node.usageInfo) {
            const uConf    = Math.round(node.usageInfo.confidence * 100);
            const uConfCls = node.usageInfo.confidence >= 0.75 ? 'conf-high'
                           : node.usageInfo.confidence >= 0.55 ? 'conf-medium' : 'conf-low';
            const uRow = document.createElement('div');
            uRow.style.cssText = `display:flex;align-items:stretch;`;
            for (let d = 0; d <= depth; d++) {
                const g = document.createElement('div');
                g.style.cssText = `width:20px;flex-shrink:0;position:relative;`;
                const vl = document.createElement('div');
                vl.style.cssText = `position:absolute;left:10px;top:0;bottom:0;width:1.5px;background:var(--border,rgba(0,0,0,0.08));`;
                g.appendChild(vl);
                if (d === depth) {
                    const hl = document.createElement('div');
                    hl.style.cssText = `position:absolute;left:10px;top:50%;width:10px;height:1.5px;background:var(--border,rgba(0,0,0,0.08));`;
                    g.appendChild(hl);
                }
                uRow.appendChild(g);
            }
            const uEl = document.createElement('div');
            uEl.style.cssText = `flex:1;display:flex;align-items:center;gap:6px;padding:4px 10px;font-size:0.75rem;color:var(--text-sub,#6e6e73);`;
            uEl.innerHTML = `<span style="font-size:0.62rem;font-weight:700;color:var(--text-hint,#8e8e93);min-width:36px;">用法</span>
                <span style="flex:1;">${_esc(node.usageInfo.label)}</span>
                <span class="${uConfCls}" style="font-size:0.65rem;font-weight:700;">${uConf}%</span>`;
            uRow.appendChild(uEl);
            childWrap.appendChild(uRow);
        }

        // 動詞ルート直下の sibling ノード群
        if (childNodes.length > 0) {
            for (const child of childNodes) {
                // 各子ノードはさらにその子（前置詞句内部）を持つ可能性がある
                const subChildren = child.children && child.children.length > 0 ? [] : [];
                const childEl = _renderIndentNode(child, subChildren, onNodeClick, depth + 1);
                childWrap.appendChild(childEl);
            }
        }

        if (hasChildren) {
            wrap.appendChild(childWrap);
            // デフォルトで展開
            childWrap.style.display = '';

            /* トグル */
            const arrowEl = nodeEl.querySelector('.itree-arrow');
            nodeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = childWrap.style.display !== 'none';
                childWrap.style.display = isOpen ? 'none' : '';
                if (arrowEl) arrowEl.style.transform = isOpen ? '' : 'rotate(90deg)';
                if (onNodeClick) onNodeClick(node.baseIdx);
            });
            nodeEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nodeEl.click(); }
            });
            // 初期状態（展開済み）の矢印
            if (arrowEl) arrowEl.style.transform = 'rotate(90deg)';
        } else {
            nodeEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (onNodeClick) onNodeClick(node.baseIdx);
            });
            nodeEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nodeEl.click(); }
            });
        }

        return wrap;
    }

    /* ── 前置詞句子ノード（インデントツリー用） ─────────────────────── */
    function _renderPrepChild(child, depth, onNodeClick) {
        const row = document.createElement('div');
        row.style.cssText = `display:flex;align-items:stretch;`;

        for (let d = 0; d < depth; d++) {
            const g = document.createElement('div');
            g.style.cssText = `width:20px;flex-shrink:0;position:relative;`;
            const vl = document.createElement('div');
            vl.style.cssText = `position:absolute;left:10px;top:0;bottom:0;width:1.5px;background:var(--border,rgba(0,0,0,0.08));`;
            g.appendChild(vl);
            if (d === depth - 1) {
                const hl = document.createElement('div');
                hl.style.cssText = `position:absolute;left:10px;top:50%;width:10px;height:1.5px;background:var(--border,rgba(0,0,0,0.08));`;
                g.appendChild(hl);
            }
            row.appendChild(g);
        }

        const el = document.createElement('div');
        el.className = 'itree-node';
        el.dataset.baseIdx = child.baseIdx;
        el.style.cssText = `
            flex:1; display:flex; align-items:center; gap:8px;
            padding:5px 10px; border-radius:6px;
            border:1px solid var(--border,rgba(0,0,0,0.07));
            background:var(--bg-inset,#fafafa);
            cursor:pointer; min-height:32px; margin:2px 0;
            transition:background 0.1s;
        `;
        el.innerHTML = `
            <span style="font-size:0.62rem;font-weight:700;color:var(--text-hint,#8e8e93);min-width:36px;">${_esc(child._subLabel || '')}</span>
            <span class="greek-headword" style="flex:1;font-size:0.95rem;">${_esc(child.words)}</span>
        `;
        el.addEventListener('click', (e) => { e.stopPropagation(); if (onNodeClick) onNodeClick(child.baseIdx); });
        row.appendChild(el);
        return row;
    }

    /* ── 旧 _renderNode（後方互換のため残す） ───────────────────────── */
    function _renderNode(node, onNodeClick, depth) {
        return _renderIndentNode(node, [], onNodeClick, depth);
    }

    /* ── 旧 _renderChildNode（後方互換のため残す） ──────────────────── */
    function _renderChildNode(child, onNodeClick) {
        return _renderPrepChild(child, 1, onNodeClick);
    }

    /* ── ノードの active 状態更新（§ 1 連動） ───────────────────── */
    function setActiveNode(container, baseIdx) {
        container.querySelectorAll('.tree-node').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.baseIdx, 10) === baseIdx);
        });
    }

    /* ── ユーティリティ ────────────────────────────────────────── */
    function _posCode(entry) {
        const CLASS_TO_POS = {
            'verb':'V','noun':'N','adjective':'A','article':'T',
            'preposition':'P','conjunction':'C','adverb':'D',
            'particle':'X','pronoun':'R','relative pronoun':'R',
            'personal pronoun':'R','demonstrative pronoun':'D',
        };
        if (entry.pos) return String(entry.pos).replace(/-$/, '').toUpperCase();
        if (entry.class) return CLASS_TO_POS[String(entry.class).toLowerCase()] || '';
        return '';
    }

    function _cleanText(entry) {
        // syntax-search.html の cleanText と同じ
        if (typeof window !== 'undefined' && typeof cleanText === 'function') {
            return cleanText(entry);
        }
        return (entry.word || entry.normalized || entry.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
    }

    function _decodeMorph(entry) {
        if (typeof window !== 'undefined' && typeof decodeMorph === 'function') {
            return decodeMorph(entry);
        }
        // フォールバック
        const n = v => (!v || v === '-') ? '' : v;
        if (entry.tense || entry.mood || entry.voice) {
            return { tense: n(entry.tense), voice: n(entry.voice), mood: n(entry.mood),
                     case: n(entry.case), number: n(entry.number), gender: n(entry.gender) };
        }
        return { tense:'', voice:'', mood:'', case: n(entry.case), number:'', gender:'' };
    }

    function _normalize(str) {
        // normalizeGreek が利用可能なら使う
        if (typeof window !== 'undefined' && typeof normalizeGreek === 'function') {
            return normalizeGreek(str);
        }
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    return { build, render, setActiveNode };

})();

/* ── ブラウザグローバル export  ── STEP8: App.syntax 配下へ移行 ── */
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.syntax = window.App.syntax || {};
    window.App.syntax.TreeBuilder = SyntaxTreeBuilder;

    /* 互換エイリアス（既存の window.SyntaxTreeBuilder 参照を壊さない） */
    window.SyntaxTreeBuilder = window.App.syntax.TreeBuilder;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyntaxTreeBuilder };
}
