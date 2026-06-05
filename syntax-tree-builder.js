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
const TENSE_JP  = { present:'現在', imperfect:'半過去', future:'未来', aorist:'アオリスト', perfect:'完了', pluperfect:'大過去' };
const VOICE_JP  = { active:'能動', middle:'中間', passive:'受動', 'middle deponent':'中間態', 'middle or passive':'中受動' };
const MOOD_JP   = { indicative:'直説法', subjunctive:'接続法', optative:'希求法', imperative:'命令法', infinitive:'不定詞', participle:'分詞' };
const CASE_JP   = { nominative:'主格', genitive:'属格', dative:'与格', accusative:'対格', vocative:'呼格' };
const NUMBER_JP = { singular:'単数', plural:'複数' };
const GENDER_JP = { masculine:'男性', feminine:'女性', neuter:'中性' };

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
        const nodes = groups.map(g => _buildNode(g, tokens, roleMap, analysisMap, targetNorm));

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

    /* ── DOM レンダリング ────────────────────────────────────────── */
    /**
     * render(nodes, container, onNodeClick)
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

        for (const node of nodes) {
            const el = _renderNode(node, onNodeClick, 0);
            container.appendChild(el);
        }
    }

    /* ── 単ノード描画 ────────────────────────────────────────────── */
    function _renderNode(node, onNodeClick, depth) {
        const ROLE_META_LOCAL = window.ROLE_META || {};
        const meta    = ROLE_META_LOCAL[node.role] || { label: node.role, barColor: '#bbb', bg: 'var(--bg-panel)' };
        const hasChildren = (node.children && node.children.length > 0) || node.usageInfo;
        const confPct = Math.round(node.confidence * 100);
        const confCls = node.confidence >= 0.75 ? 'conf-high' : node.confidence >= 0.55 ? 'conf-medium' : 'conf-low';

        // 形態ラベル（Level 2 用）
        const morphText = morphLabel(node.morph);

        // aria-label
        const ariaLabel = `${meta.label} ${node.words} ${morphText} 確信度${confPct}%`;

        const wrap = document.createElement('div');
        wrap.className = 'tree-node-wrap';

        /* ノード本体 */
        const nodeEl = document.createElement('div');
        nodeEl.className = 'tree-node' + (node.isTarget ? ' active' : '');
        nodeEl.dataset.role    = node.role;
        nodeEl.dataset.baseIdx = node.baseIdx;
        nodeEl.setAttribute('role', 'button');
        nodeEl.setAttribute('tabindex', '0');
        nodeEl.setAttribute('aria-expanded', 'false');
        nodeEl.setAttribute('aria-label', ariaLabel);

        nodeEl.innerHTML = `
            <div class="node-bar" style="background:${meta.barColor};"></div>
            <div class="node-inner">
                <span class="node-role-tag" style="color:${meta.barColor};">${meta.label}</span>
                <span class="node-words greek-headword">${_esc(node.words)}</span>
                <span class="node-conf ${confCls}">${confPct}%</span>
                ${hasChildren ? '<span class="node-arrow">›</span>' : ''}
            </div>`;

        /* Level 2: 形態情報 + usageInfo */
        const detailEl = document.createElement('div');
        detailEl.className = 'node-detail';

        let detailHtml = '';
        if (morphText) {
            detailHtml += `<div class="node-detail-morph">${_esc(morphText)}</div>`;
        }
        if (node.usageInfo) {
            const uConf    = Math.round(node.usageInfo.confidence * 100);
            const uConfCls = node.usageInfo.confidence >= 0.75 ? 'conf-high' : node.usageInfo.confidence >= 0.55 ? 'conf-medium' : 'conf-low';
            detailHtml += `<div class="usage-node">
                <span class="usage-node-label">用法</span>
                <span class="usage-node-value">${_esc(node.usageInfo.label)}</span>
                <span class="usage-node-conf ${uConfCls}">${uConf}%</span>
            </div>`;
        }
        detailEl.innerHTML = detailHtml;

        /* 子ノードコンテナ */
        const childrenEl = document.createElement('div');
        childrenEl.className = 'tree-children';

        if (node.children && node.children.length > 0) {
            for (const child of node.children) {
                const childEl = _renderChildNode(child, onNodeClick);
                childrenEl.appendChild(childEl);
            }
        }

        wrap.appendChild(nodeEl);
        if (detailHtml) wrap.appendChild(detailEl);
        if (node.children && node.children.length > 0) wrap.appendChild(childrenEl);

        /* クリックハンドラ */
        const handleActivate = (e) => {
            e.stopPropagation();
            const isOpen = nodeEl.classList.contains('open');

            if (hasChildren) {
                nodeEl.classList.toggle('open');
                nodeEl.setAttribute('aria-expanded', String(!isOpen));
                if (detailHtml) detailEl.classList.toggle('open');
                if (node.children && node.children.length > 0) childrenEl.classList.toggle('open');
            }

            // § 1 トークン選択と連動
            if (onNodeClick) onNodeClick(node.baseIdx);
        };

        nodeEl.addEventListener('click', handleActivate);
        nodeEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(e); }
        });

        return wrap;
    }

    /* ── 前置詞句子ノード描画 ────────────────────────────────────── */
    function _renderChildNode(child, onNodeClick) {
        const confPct = Math.round(child.confidence * 100);
        const el = document.createElement('div');
        el.className = 'tree-child-node';
        el.dataset.baseIdx = child.baseIdx;
        el.innerHTML = `
            <span class="child-node-label">${_esc(child._subLabel || '')}</span>
            <span class="child-node-words greek-headword">${_esc(child.words)}</span>`;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onNodeClick) onNodeClick(child.baseIdx);
        });
        return el;
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

/* ── ブラウザグローバル export ─────────────────────────────────────── */
if (typeof window !== 'undefined') {
    window.SyntaxTreeBuilder = SyntaxTreeBuilder;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyntaxTreeBuilder };
}
