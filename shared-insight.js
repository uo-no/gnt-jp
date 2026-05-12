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
