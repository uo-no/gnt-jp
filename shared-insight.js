/**
 * shared-insight.js
 * iframe版3タブ共通の軽量読解支援ユーティリティ
 *
 * 設計方針：
 *   - full-search.htmlのanalyzePatterns完全移植は禁止
 *   - side-panel幅（280px〜420px）で成立する軽量版
 *   - データロード後に呼び出す想定
 *   - 各タブが必要な関数だけ呼べばよい疎結合設計
 *
 * 使用タブ：
 *   - morph-search.html  : calcDistribution, lightweightReadingHint,
 *                          buildXscPanelShared, classifyParticipleLiteShared
 *   - syntax-search.html : lightweightPatternSummary, buildXscPanelShared
 *   - semantic-search.html: calcDistribution（将来）, buildXscPanelShared
 */

/* ═══════════════════════════════════════════════════
   1. calcDistribution
   書物別ヒット数を集計して降順配列で返す
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched - matchEntry()済みのエントリ配列
 * @param {Object} BOOK_JP - 書物コード→日本語名マップ
 * @returns {Array<{key:string, label:string, count:number}>}
 */
function calcDistribution(matched, BOOK_JP) {
    const counts = {};
    matched.forEach(e => {
        const bk = e._bookKey
            || (String(e.ref || '').match(/^([A-Z0-9]+)/) || [])[1]
            || '?';
        counts[bk] = (counts[bk] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({
            key,
            label: (BOOK_JP && BOOK_JP[key]) || key,
            count,
        }));
}

/* ═══════════════════════════════════════════════════
   2. renderDistBar
   書物別分布をコンパクトなHTMLバーで返す（挿入用）
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched
 * @param {Object} BOOK_JP
 * @param {number} [limit=8] 表示上限書物数
 * @returns {string} HTML文字列
 */
function renderDistBar(matched, BOOK_JP, limit) {
    limit = limit || 8;
    const dist  = calcDistribution(matched, BOOK_JP);
    const total = matched.length;
    if (!dist.length) return '';
    const max = dist[0].count;

    const rows = dist.slice(0, limit).map(d => {
        const pct = Math.round(d.count / max * 100);
        return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
            <span style="width:60px;font-size:0.68rem;color:var(--text-sub);text-align:right;flex-shrink:0;">${d.label}</span>
            <div style="flex:1;height:4px;background:var(--bg-panel,#f5f5f7);border-radius:2px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;border-radius:2px;background:var(--accent,#5a6e82);transition:width .4s;"></div>
            </div>
            <span style="font-size:0.65rem;color:var(--text-hint,#aaa);width:24px;text-align:right;flex-shrink:0;">${d.count}</span>
        </div>`;
    }).join('');

    return `<div style="
            border:1px solid var(--border,rgba(0,0,0,.07));
            border-radius:10px;
            padding:10px 13px;
            background:var(--bg,#fff);
            margin-bottom:12px;
        ">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                    color:var(--text-hint,#aaa);margin-bottom:8px;">書物別分布（全${total}件）</div>
        ${rows}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   3. lightweightPatternSummary
   Morphタブ向け：法+時制の組み合わせから
   「よく見られる構文パターン」を1〜2行で返す
   ═══════════════════════════════════════════════════ */
const _PATTERN_HINTS = {
    'aorist+indicative':  '過去の一回的出来事。主語＋動詞＋目的語の基本語順が多い。',
    'present+indicative': '継続・習慣。主語省略が多く、前節の主語が継続することが多い。',
    'imperfect+indicative': '過去の継続。物語文脈で線的な進行を表す。',
    'perfect+indicative': '現在も続く完了状態。νεκρός・πεπίστευκα等の結果状態語と共起多い。',
    'aorist+imperative':  '即時的命令。否定はμή＋アオリスト接続法（禁止）。',
    'present+imperative': '継続的命令。否定はμή＋現在命令（〜するのをやめよ）。',
    'aorist+subjunctive': '接続詞依存。ἵνα（目的）・ἐάν（条件）・ὅταν（時間）を先に確認。',
    'present+subjunctive':'同上。継続ニュアンスが付加される。',
    'aorist+participle':  '先行動作。冠詞→名詞的、格一致名詞→形容詞的、それ以外→副詞的。',
    'present+participle': '同時動作。付帯状況が最多。主節との時間的関係を確認。',
    'perfect+participle': '結果状態の継続。完了動作の状態を名詞・副詞的に表す。',
    'aorist+infinitive':  '目的・補語用法が多い。支配動詞の種類が意味を決める。',
    'present+infinitive': '継続目的・補語。ἄρχεσθαι・θέλειν等と共起多い。',
};

/**
 * @param {string} tense
 * @param {string} mood
 * @returns {string|null}
 */
function lightweightPatternSummary(tense, mood) {
    const key = [tense, mood].filter(Boolean).join('+');
    return _PATTERN_HINTS[key] || null;
}

/* ═══════════════════════════════════════════════════
   4. lightweightReadingHint
   Morphタブ向け：検索件数＋書物分布から
   「この語形の使われ方の傾向」を1カード分のHTMLで返す
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched
 * @param {string} tense
 * @param {string} mood
 * @param {Object} BOOK_JP
 * @returns {string} HTML文字列（空なら''）
 */
function lightweightReadingHint(matched, tense, mood, BOOK_JP) {
    if (!matched.length) return '';

    const patternHint = lightweightPatternSummary(tense, mood);
    const dist        = calcDistribution(matched, BOOK_JP);
    const total       = matched.length;

    let distNote = '';
    if (dist.length === 1) {
        distNote = `${dist[0].label}のみに登場（限定的）`;
    } else if (dist.length >= 2 && dist[0].count / total >= 0.4) {
        distNote = `${dist[0].label}に集中（${Math.round(dist[0].count / total * 100)}%）`;
    } else if (dist.length >= 4) {
        distNote = `${dist.length}書物に分布（比較的一般的）`;
    }

    const lines = [];
    if (patternHint) lines.push(patternHint);
    if (distNote)    lines.push(distNote);

    if (!lines.length) return '';

    return `<div style="
            padding:9px 13px;
            background:var(--accent-light,rgba(90,110,130,.09));
            border:1px solid var(--accent-mid,rgba(90,110,130,.20));
            border-left:3px solid var(--accent,#5a6e82);
            border-radius:9px;
            margin-bottom:12px;
            font-size:0.77rem;
            line-height:1.7;
            color:var(--text,#1d1d1f);
        ">
        <div style="font-size:0.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                    color:var(--accent,#5a6e82);margin-bottom:4px;">この語形の傾向</div>
        ${lines.map(l => `<div>${l}</div>`).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   5. insertInsightCard
   morph-search.html の renderResults() 末尾から呼び出す
   ═══════════════════════════════════════════════════ */
/**
 * @param {string} containerId
 * @param {Array}  matched
 * @param {string} tense
 * @param {string} mood
 * @param {Object} BOOK_JP
 */
function insertInsightCard(containerId, matched, tense, mood, BOOK_JP) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const hint = lightweightReadingHint(matched, tense, mood, BOOK_JP);
    const bar  = matched.length >= 3
        ? renderDistBar(matched, BOOK_JP, 6)
        : '';

    el.innerHTML  = hint + bar;
    el.style.display = (hint || bar) ? 'block' : 'none';
}

/* ═══════════════════════════════════════════════════
   6. buildXscPanelShared  ★新規追加★
   morph / syntax / semantic 3タブ共通の
   Explainable Scoring パネル HTML を生成する。
   各タブ固有の buildXscPanel は本関数でラップ可能。
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array}  deltas        - [{label:string, value:number}]
 * @param {number} confidence    - 0〜100
 * @param {string} panelId       - 一意なDOM id
 * @param {string} [accentColor] - バーのアクセントカラー（省略可）
 * @returns {string} HTML文字列
 */
function buildXscPanelShared(deltas, confidence, panelId, accentColor) {
    if (!deltas || !deltas.length) return '';
    accentColor = accentColor || 'var(--accent,#5a6e82)';

    const confColor = confidence >= 75 ? '#4a7a5a'
                    : confidence >= 55 ? '#a09050'
                    : '#b05050';

    const maxAbs = Math.max(...deltas.map(d => Math.abs(d.value)), 1);

    const rows = deltas.map(d => {
        const cls   = d.value > 0 ? 'pos' : d.value < 0 ? 'neg' : '';
        const sign  = d.value > 0 ? '+' : '';
        const barW  = Math.round(Math.abs(d.value) / maxAbs * 100);
        const barC  = d.value > 0 ? 'rgba(74,122,90,0.55)' : 'rgba(176,80,80,0.45)';
        return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;font-size:0.72rem;">
            <span style="font-size:0.68rem;font-weight:700;min-width:28px;text-align:right;
                         flex-shrink:0;color:${d.value > 0 ? '#4a7a5a' : d.value < 0 ? '#b05050' : '#888'};">
                ${sign}${d.value}
            </span>
            <div style="width:44px;height:3px;background:#eee;border-radius:2px;overflow:hidden;flex-shrink:0;">
                <div style="width:${barW}%;height:100%;border-radius:2px;background:${barC};"></div>
            </div>
            <span style="flex:1;color:var(--text,#1d1d1f);line-height:1.4;">${d.label}</span>
        </div>`;
    }).join('');

    /* toggleXscShared はインライン onclick で処理。グローバル関数依存なし */
    return `<div id="${panelId}" style="
                margin-top:7px;
                border:1px solid var(--border,rgba(0,0,0,.07));
                border-radius:7px;
                overflow:hidden;
                font-size:0.78rem;
            ">
        <div style="
                display:flex;align-items:center;justify-content:space-between;
                padding:6px 10px 5px;
                background:var(--bg-panel,#f5f5f7);
                cursor:pointer;
                user-select:none;
            "
            onclick="(function(){
                var p=document.getElementById('${panelId}');
                if(!p) return;
                var body=p.querySelector('[data-xsc-body]');
                var arrow=p.querySelector('[data-xsc-arrow]');
                if(!body||!arrow) return;
                var open=body.style.display!=='none';
                body.style.display=open?'none':'block';
                arrow.textContent=open?'▾':'▴';
            })()">
            <span style="font-size:0.6rem;font-weight:700;letter-spacing:.1em;
                         text-transform:uppercase;color:var(--text-hint,#aaa);">
                なぜこの判定？
            </span>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:0.7rem;font-weight:700;color:${confColor};">
                    確信度 ${confidence}%
                </span>
                <span data-xsc-arrow style="font-size:0.68rem;color:var(--text-hint,#aaa);">▾</span>
            </div>
        </div>
        <div data-xsc-body style="
                display:none;
                padding:8px 10px 10px;
                border-top:1px solid var(--border,rgba(0,0,0,.07));
            ">
            <div style="font-size:0.58rem;font-weight:700;letter-spacing:.1em;
                        text-transform:uppercase;color:var(--text-hint,#aaa);margin-bottom:6px;">
                スコア内訳
            </div>
            ${rows}
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════
   7. classifyParticipleLiteShared  ★新規追加★
   Morphタブ・Semanticタブ共用の軽量分詞分類。
   deltas[] を含む戻り値で buildXscPanelShared と接続する。

   依存：呼び出し元で以下を定義しておくこと
     - entryPosCode(entry) → string
     - decodeMorph(entry)  → {case, gender, number, tense, ...}
   ═══════════════════════════════════════════════════ */
/**
 * @param {Object} entry   - 対象トークン
 * @param {Array}  tokens  - 節全体のトークン配列
 * @param {Function} _entryPosCode - 呼び出し元のentryPosCode
 * @param {Function} _decodeMorph  - 呼び出し元のdecodeMorph
 * @param {Function} _cleanText    - 呼び出し元のcleanText（省略可）
 * @returns {{label, hint, conf, deltas}}
 */
function classifyParticipleLiteShared(entry, tokens, _entryPosCode, _decodeMorph, _cleanText) {
    _cleanText = _cleanText || (e => (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim());

    const hm       = _decodeMorph(entry);
    const ptcCase  = hm.case;
    const ptcGender= hm.gender;
    const ptcNumber= hm.number;
    const hitIdx   = tokens.indexOf(entry);
    const prevTok  = hitIdx > 0 ? tokens[hitIdx - 1] : null;
    const prevPos  = prevTok ? _entryPosCode(prevTok) : '';
    const deltas   = [];

    /* ── 1. 冠詞一致 → 実体用法（名詞的） ── */
    if (prevPos === 'T') {
        const pm = _decodeMorph(prevTok);
        if (pm.case === ptcCase && pm.gender === ptcGender && pm.number === ptcNumber) {
            deltas.push(
                { label: '直前に冠詞あり', value: +45 },
                { label: '格・性・数が冠詞と一致', value: +35 },
                { label: '形容詞・副詞用法を除外', value: +10 }
            );
            return { label: '実体用法（名詞的）', hint: '「〜する者」として機能', conf: 90, deltas };
        }
    }

    /* ── 2. 格一致名詞 → 形容詞用法 ── */
    let matchNoun = null;
    tokens.forEach((t, i) => {
        if (i === hitIdx) return;
        const pos = _entryPosCode(t);
        if (!['N','T','A','D','R'].includes(pos)) return;
        const tm = _decodeMorph(t);
        if (tm.case === ptcCase && tm.gender === ptcGender && tm.number === ptcNumber) {
            if (!matchNoun) matchNoun = { token: t, idx: i };
        }
    });
    if (matchNoun) {
        const dist = Math.abs(matchNoun.idx - hitIdx);
        const nw   = _cleanText(matchNoun.token);
        deltas.push(
            { label: '格一致名詞あり（' + nw + '）', value: +35 },
            { label: dist <= 2 ? '近接（' + dist + '語）' : '距離あり（' + dist + '語）', value: dist <= 2 ? +10 : -5 },
            { label: '冠詞なし → 実体用法を除外', value: +10 }
        );
        return { label: '形容詞用法', hint: '「' + nw + '」を修飾', conf: 80, deltas };
    }

    /* ── 3. 属格形 → 属格絶対の可能性 ── */
    if (ptcCase === 'genitive') {
        const genNoun = tokens.find((t, i) => {
            if (i === hitIdx) return false;
            const pos = _entryPosCode(t);
            if (!['N','T','A','D','R'].includes(pos)) return false;
            return _decodeMorph(t).case === 'genitive';
        });
        deltas.push(
            { label: '分詞が属格形をとっている', value: +30 },
            { label: genNoun ? '同節に属格名詞あり（' + _cleanText(genNoun) + '）' : '格一致名詞なし', value: genNoun ? +25 : +10 },
            { label: '冠詞なし → 実体用法を除外', value: +10 },
            { label: '属格絶対はデフォルト推定', value: -5 }
        );
        return { label: '属格絶対の可能性', hint: '主節と独立した時間・条件節を形成', conf: 65, deltas };
    }

    /* ── 4. デフォルト → 副詞用法 ── */
    const tHint  = hm.tense === 'aorist'  ? '〜してから（先行動作）'
                 : hm.tense === 'present' ? '〜しながら（同時動作）'
                 : hm.tense === 'perfect' ? '〜した状態で（結果状態）'
                 : '副詞的に主動詞を修飾';
    const tBonus = hm.tense === 'aorist'  ? 15
                 : hm.tense === 'present' ? 12
                 : hm.tense === 'perfect' ? 10 : 5;
    deltas.push(
        { label: '冠詞なし → 実体用法を除外', value: +15 },
        { label: '格一致名詞なし → 形容詞用法を除外', value: +10 },
        { label: '時制シグナル（' + (hm.tense || '—') + '）', value: +tBonus },
        { label: '副詞用法はデフォルト推定', value: -5 }
    );
    return { label: '副詞用法（推定）', hint: tHint, conf: 60, deltas };
}

/* ═══════════════════════════════════════════════════
   8. calcCoocNeighbors  ★新規追加★
   節内トークンから意味的に重要な共起語を抽出する。
   Morph ctx-panel と Semantic sem-context で共用。
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array}   tokens       - 節全体のトークン配列
 * @param {number}  targetIdx    - 対象語のインデックス
 * @param {Set}     stopLemmas   - ストップワード lemma セット
 * @param {Function} _entryPosCode
 * @param {Function} _cleanText
 * @param {number}  [maxResults=6]
 * @returns {Array<{word:string, pos:string}>}
 */
function calcCoocNeighbors(tokens, targetIdx, stopLemmas, _entryPosCode, _cleanText, maxResults) {
    maxResults = maxResults || 6;
    _cleanText = _cleanText || (e => (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim());
    stopLemmas = stopLemmas || new Set();

    const SEMANTIC_POS = new Set(['N','V','A','D','R']);
    const results = [];

    tokens.forEach((t, i) => {
        if (i === targetIdx) return;
        const w = _cleanText(t);
        if (!w || w.length < 2) return;
        const pos = _entryPosCode(t);
        if (!SEMANTIC_POS.has(pos)) return;
        const lemma = (t.lemma || '').trim();
        if (stopLemmas.has(lemma) || stopLemmas.has(w)) return;
        results.push({ word: w, pos, lemma });
    });

    return results.slice(0, maxResults);
}

/* ═══════════════════════════════════════════════════
   9. scoreEngine  ★新規追加★
   morph / syntax / semantic 統合スコアリングエンジン。
   各タブが自前で実装していた XSC ロジックを統一する。
   ═══════════════════════════════════════════════════ */
const scoreEngine = {
    /**
     * @param {Object} opts
     *   morphology  : { tense, mood, voice, case, gender, number }
     *   syntax      : { role, hasArticle, matchNoun, ptcCase }
     *   semantics   : { lemma, coocHits, objType, subjType, baseScore }
     *   context     : { tokens, targetIdx }
     * @returns {{ score:number, confidence:number, reasons:Array, rejected:Array, alternatives:Array }}
     */
    evaluate(opts) {
        const { morphology = {}, syntax = {}, semantics = {}, context = {} } = opts;
        const deltas  = [];
        const reasons = [];

        /* ── 形態論スコア ── */
        if (morphology.tense) {
            const tBonus = { aorist:12, perfect:10, present:8, imperfect:6, future:5 };
            const b = tBonus[morphology.tense] || 4;
            deltas.push({ label:'時制（' + morphology.tense + '）', value: b });
        }
        if (morphology.mood && morphology.mood !== 'indicative') {
            const mBonus = { participle:10, subjunctive:8, infinitive:7, imperative:6, optative:5 };
            const b = mBonus[morphology.mood] || 4;
            deltas.push({ label:'法（' + morphology.mood + '）', value: b });
        }

        /* ── 統語論スコア ── */
        if (syntax.hasArticle) {
            deltas.push({ label:'冠詞あり（実体用法シグナル）', value: +20 });
            reasons.push('直前に冠詞が存在する');
        }
        if (syntax.matchNoun) {
            deltas.push({ label:'格一致名詞（' + syntax.matchNoun + '）', value: +18 });
            reasons.push('節内に格・性・数が一致する名詞がある');
        }
        if (syntax.role === 'verb') {
            deltas.push({ label:'主動詞として機能', value: +15 });
        }
        if (syntax.ptcCase === 'genitive') {
            deltas.push({ label:'属格形（属格絶対の可能性）', value: +12 });
        }

        /* ── 意味論スコア ── */
        const base = semantics.baseScore || 40;
        deltas.push({ label:'語彙頻度ベース', value: base });
        if (semantics.coocHits && semantics.coocHits.length) {
            const bonus = Math.min(semantics.coocHits.length * 8, 32);
            deltas.push({ label:'共起語一致（' + semantics.coocHits.slice(0,2).join('・') + '）', value: bonus });
            reasons.push('共起語 ' + semantics.coocHits.slice(0,2).join('・') + ' が文中に存在する');
        }
        if (semantics.objType === 'person') {
            deltas.push({ label:'人称目的語（文脈一致）', value: +10 });
        }
        if (semantics.subjType === 'god') {
            deltas.push({ label:'神・キリストが主語（神学的文脈）', value: +8 });
        }

        const total      = deltas.reduce((s, d) => s + d.value, 0);
        const maxPossible = 100;
        const score      = Math.min(100, Math.round(total));
        const confidence = Math.min(99, Math.max(20, score));

        /* rejected / alternatives は呼び出し元が付与して使う */
        return { score, confidence, reasons, deltas, rejected: [], alternatives: [] };
    }
};

/* ═══════════════════════════════════════════════════
   10. renderExplainability  ★新規追加★
   統合 XSC パネルを <details> 形式で返す。
   iframe幅に最適化したコンパクト表示。
   ═══════════════════════════════════════════════════ */
/**
 * @param {{ confidence:number, reasons:Array, deltas:Array, alternatives:Array }} result
 * @param {string} [summaryLabel] - summary テキスト（省略可）
 * @returns {string} HTML文字列
 */
function renderExplainability(result, summaryLabel) {
    if (!result || !result.deltas || !result.deltas.length) return '';

    summaryLabel = summaryLabel || '判定根拠';
    const confColor = result.confidence >= 75 ? '#4a7a5a'
                    : result.confidence >= 55 ? '#a09050'
                    : '#b05050';

    const maxAbs = Math.max(...result.deltas.map(d => Math.abs(d.value)), 1);

    const deltaRows = result.deltas.map(d => {
        const sign  = d.value > 0 ? '+' : '';
        const barW  = Math.round(Math.abs(d.value) / maxAbs * 100);
        const barC  = d.value > 0 ? 'rgba(74,122,90,0.55)' : 'rgba(176,80,80,0.45)';
        const col   = d.value > 0 ? '#4a7a5a' : d.value < 0 ? '#b05050' : '#888';
        return `<div class="exp-row">
            <span class="exp-delta" style="color:${col};">${sign}${d.value}</span>
            <div style="width:40px;height:3px;background:#eee;border-radius:2px;overflow:hidden;flex-shrink:0;">
                <div style="width:${barW}%;height:100%;border-radius:2px;background:${barC};"></div>
            </div>
            <span class="exp-label">${d.label}</span>
        </div>`;
    }).join('');

    const altRows = (result.alternatives || []).slice(0, 3).map(a =>
        `<div class="exp-alt-row">
            <span style="flex:1;">${a.label}</span>
            <span style="font-size:0.65rem;color:var(--text-hint,#aaa);">${a.score}%</span>
        </div>`
    ).join('');

    return `<details class="exp-panel">
        <summary>
            <span>${summaryLabel}</span>
            <span style="font-weight:700;color:${confColor};">${result.confidence}%</span>
        </summary>
        <div class="exp-body">
            ${deltaRows}
            ${altRows ? `<div class="exp-alts">${altRows}</div>` : ''}
        </div>
    </details>`;
}

/* ═══════════════════════════════════════════════════
   11. buildCompactInsight  ★新規追加★
   読解支援の最優先情報（Level0-1）を1オブジェクトで返す。
   ICSummaryCard / Beginnerパネルの情報源として使用。
   ═══════════════════════════════════════════════════ */
/**
 * @param {{ tense, mood, voice, matched, BOOK_JP }} data
 * @returns {{ primary, secondary, confidence, quickGuide }}
 */
function buildCompactInsight(data) {
    const { tense, mood, matched = [], BOOK_JP = {} } = data;

    const primary   = _detectPrimaryInsight(tense, mood);
    const secondary = _detectSecondaryInsight(tense, mood, matched, BOOK_JP);
    const confidence = _computeInsightConfidence(tense, mood);
    const quickGuide = _buildQuickGuide(tense, mood);

    return { primary, secondary, confidence, quickGuide };
}

function _detectPrimaryInsight(tense, mood) {
    const key = [tense, mood].filter(Boolean).join('+');
    const MAP = {
        'aorist+indicative':  '〜した（完結した動作）',
        'present+indicative': '〜している／〜する（継続・習慣）',
        'imperfect+indicative': '〜していた（過去の継続）',
        'perfect+indicative': '〜した状態にある（現在への影響）',
        'future+indicative':  '〜するだろう（将来の出来事）',
        'aorist+imperative':  '〜しなさい（即時命令）',
        'present+imperative': '〜し続けなさい（継続命令）',
        'aorist+subjunctive': '〜するように／〜するならば（目的・条件）',
        'aorist+participle':  '〜してから（先行動作・副詞的）',
        'present+participle': '〜しながら（同時動作・付帯状況）',
        'aorist+infinitive':  '〜すること（目的・補語）',
        'present+infinitive': '〜し続けること（継続的行為）',
    };
    return MAP[key] || null;
}

function _detectSecondaryInsight(tense, mood, matched, BOOK_JP) {
    const dist  = calcDistribution(matched, BOOK_JP);
    const total = matched.length;
    if (!dist.length || !total) return null;
    if (dist.length === 1)                           return dist[0].label + 'のみ（限定的語形）';
    if (dist[0].count / total >= 0.45)               return dist[0].label + '中心（' + Math.round(dist[0].count/total*100) + '%）';
    if (dist.length >= 5)                            return dist.length + '書物に広く分布（一般的語形）';
    return null;
}

function _computeInsightConfidence(tense, mood) {
    if (['indicative','imperative'].includes(mood)) return 92;
    if (mood === 'participle')  return 75;
    if (mood === 'subjunctive') return 70;
    if (mood === 'infinitive')  return 78;
    if (mood === 'optative')    return 65;
    return 55;
}

function _buildQuickGuide(tense, mood) {
    const key = [tense, mood].filter(Boolean).join('+');
    const GUIDES = {
        'aorist+indicative':  '主語（主格）と目的語（対格）を探してください',
        'present+indicative': '主語省略に注意。前節から継続されることが多い',
        'aorist+participle':  '冠詞→名詞的 / 格一致名詞→形容詞的 / その他→副詞的',
        'present+participle': '付帯状況「〜しながら」が最多。冠詞の有無を確認',
        'aorist+subjunctive': '先行する接続詞（ἵνα・ἐάν・ὅταν）を必ず確認',
        'aorist+imperative':  '否定はμή＋アオリスト接続法（禁止）を使う',
        'present+imperative': '否定はμή＋現在命令（〜するのをやめなさい）',
    };
    return GUIDES[key] || '文中の格構造（主格・対格・属格）を確認してください';
}

/* ═══════════════════════════════════════════════════
   12. buildRepresentativeExamples  ★新規追加★
   マッチ済みエントリから代表用例を選出してHTML返す。
   selectBestExamples の軽量版。
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array}  matched
 * @param {Object} BOOK_JP
 * @param {Function} getJaVerse  - ref→日本語訳を返す関数
 * @param {number}  [limit=3]
 * @returns {string} HTML文字列
 */
function buildRepresentativeExamples(matched, BOOK_JP, getJaVerse, limit) {
    limit = limit || 3;
    if (!matched.length) return '';

    /* 書物を分散させつつ上位 limit 件を選ぶ */
    const seen  = new Set();
    const picks = [];
    for (const e of matched) {
        const bk = e._bookKey || (String(e.ref||'').match(/^([A-Z0-9]+)/)||[])[1] || '?';
        if (!seen.has(bk)) {
            seen.add(bk);
            picks.push(e);
            if (picks.length >= limit) break;
        }
    }
    if (!picks.length) picks.push(...matched.slice(0, limit));

    const rows = picks.map(e => {
        const word = e.word || e.normalized || e.text || '';
        const ref  = e.ref  || '';
        const bk   = e._bookKey || (String(ref).match(/^([A-Z0-9]+)/)||[])[1] || '';
        const label = (BOOK_JP[bk] || bk) + ' ' + String(ref).replace(/^[A-Z0-9]+\s*/,'');
        const ja    = typeof getJaVerse === 'function' ? getJaVerse(e) : '';
        return `<div style="padding:6px 0;border-bottom:1px solid var(--border,rgba(0,0,0,.06));">
            <div style="display:flex;align-items:baseline;gap:8px;">
                <span style="font-family:'Gentium Plus',serif;font-size:1.05rem;color:var(--accent,#5a6e82);font-weight:700;">${word}</span>
                <span style="font-size:0.65rem;color:var(--text-hint,#aaa);">${label}</span>
            </div>
            ${ja ? `<div style="font-size:0.75rem;color:var(--text-sub,#6e6e73);margin-top:2px;line-height:1.5;">${ja}</div>` : ''}
        </div>`;
    }).join('');

    return `<div style="
            border:1px solid var(--border,rgba(0,0,0,.07));
            border-radius:10px;padding:10px 13px;
            background:var(--bg,#fff);margin-bottom:12px;">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                    color:var(--text-hint,#aaa);margin-bottom:6px;">代表用例</div>
        ${rows}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   13. buildMeaningContrast  ★新規追加★
   Semanticタブ向け：採用意味 vs 除外意味の対比を表示。
   renderMeaningContrast の実装。
   ═══════════════════════════════════════════════════ */
/**
 * @param {Object} top    - { meaning, score }
 * @param {Array}  others - [{ meaning, score, rejectReason }]
 * @returns {string} HTML文字列
 */
function buildMeaningContrast(top, others) {
    if (!top || !others || !others.length) return '';

    const rejectRows = others.slice(0, 2).map(o =>
        `<div class="contrast-row">
            <span class="contrast-meaning">${o.meaning}</span>
            <span class="contrast-reason">${o.rejectReason || 'スコアが低い'}</span>
        </div>`
    ).join('');

    return `<div class="meaning-contrast">
        <div class="contrast-adopted">
            <span class="contrast-label-adopted">採用</span>
            <span class="contrast-top">${top.meaning}</span>
            <span class="contrast-score">${top.score}%</span>
        </div>
        ${rejectRows ? `<div class="contrast-label-rejected">除外候補</div>${rejectRows}` : ''}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   14. buildRoleSummary  ★新規追加★
   Syntaxタブ向け：主語・動詞・目的語の要約を1行で返す。
   reading-core-bar に表示する情報源として使用。
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array}  tokens
 * @param {Map}    roleMap  - token → { role } のMap
 * @param {Function} _cleanText
 * @returns {{ subj:string, verb:string, obj:string, ptc:string }}
 */
function buildRoleSummary(tokens, roleMap, _cleanText) {
    _cleanText = _cleanText || (e => (e.word||e.normalized||e.text||'').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim());
    const find = role => {
        const t = tokens.find(t => roleMap && roleMap.get && roleMap.get(t)?.role === role);
        return t ? _cleanText(t) : '';
    };
    return {
        subj: find('subj'),
        verb: find('verb'),
        obj:  find('obj'),
        ptc:  find('ptc'),
    };
}

/* ═══════════════════════════════════════════════════
   15. buildSemanticShift  ★新規追加★
   Semanticタブ向け：文脈による意味変化の可能性を返す。
   ═══════════════════════════════════════════════════ */
/**
 * @param {string} lemma
 * @param {Array}  verseLemmas  - 節内のlemma配列
 * @returns {{ hasShift:boolean, note:string }}
 */
function buildSemanticShift(lemma, verseLemmas) {
    /* 文脈によって意味が大きく変わる語リスト */
    const SHIFT_TRIGGERS = {
        'λόγος':  { normal:'言葉', shifted:'神のことば（ヨハネ的）', trigger: ['θεός','ἦν','πρός'] },
        'σάρξ':   { normal:'肉体', shifted:'罪ある本性（パウロ的）', trigger: ['πνεῦμα','κατά','νόμος'] },
        'νόμος':  { normal:'法律', shifted:'モーセの律法（パウロ的）', trigger: ['ἔργον','πίστις','δικαιόω'] },
        'κόσμος': { normal:'世界', shifted:'罪に支配された世（ヨハネ的）', trigger: ['θεός','ἀγαπάω','σκοτία'] },
        'ζωή':    { normal:'命・生命', shifted:'永遠の命（神学的）', trigger: ['αἰώνιος','θεός','Ἰησοῦς'] },
        'ψυχή':   { normal:'魂・命', shifted:'命（救済の文脈）', trigger: ['σώζω','ἀπόλλυμι','δίδωμι'] },
    };

    const info = SHIFT_TRIGGERS[lemma];
    if (!info) return { hasShift: false, note: '' };

    const hit = info.trigger.some(t => verseLemmas.includes(t));
    if (!hit)  return { hasShift: false, note: '' };

    return {
        hasShift: true,
        note: `「${info.normal}」より「${info.shifted}」の意味の可能性（文脈語が一致）`,
    };
}
