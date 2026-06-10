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
             || e.book
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
            <span class="ui-caption" style="width:60px;text-align:right;flex-shrink:0;">${d.label}</span>
            <div style="flex:1;height:4px;background:var(--bg-panel,#f5f5f7);border-radius:2px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;border-radius:2px;background:var(--accent,#5a6e82);transition:width .4s;"></div>
            </div>
            <span class="ui-caption" style="width:24px;text-align:right;flex-shrink:0;">${d.count}</span>
        </div>`;
    }).join('');

    return `<div class="ui-card">
        <div class="ui-section-label" style="margin-bottom:8px;">書物別分布（全${total}件）</div>
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
        <div class="ui-section-label" style="color:var(--accent,#5a6e82);margin-bottom:4px;">この語形の傾向</div>
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
    return `<div id="${panelId}" class="ui-panel">
        <div class="ui-panel-header"
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
            <span class="ui-section-label">なぜこの判定？</span>
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:0.7rem;font-weight:700;color:${confColor};">
                    確信度 ${confidence}%
                </span>
                <span data-xsc-arrow class="ui-caption">▾</span>
            </div>
        </div>
        <div data-xsc-body class="ui-panel-body">
            <div class="ui-section-label" style="margin-bottom:6px;">スコア内訳</div>
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
    const hitGIdx  = entry.globalIdx;
    const prevTok  = tokens.find(t => t.globalIdx === hitGIdx - 1) || null;
    const prevPos  = prevTok ? _entryPosCode(prevTok) : '';
    const deltas   = [];

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

    let matchNoun = null;
    tokens.forEach(t => {
        if (t.globalIdx === hitGIdx) return;
        const pos = _entryPosCode(t);
        if (!['N','T','A','D','R'].includes(pos)) return;
        const tm = _decodeMorph(t);
        if (tm.case === ptcCase && tm.gender === ptcGender && tm.number === ptcNumber) {
            if (!matchNoun) matchNoun = { token: t, gIdx: t.globalIdx };
        }
    });
    if (matchNoun) {
        const dist = Math.abs(matchNoun.gIdx - hitGIdx);
        const nw   = _cleanText(matchNoun.token);
        deltas.push(
            { label: '格一致名詞あり（' + nw + '）', value: +35 },
            { label: dist <= 2 ? '近接（' + dist + '語）' : '距離あり（' + dist + '語）', value: dist <= 2 ? +10 : -5 },
            { label: '冠詞なし → 実体用法を除外', value: +10 }
        );
        return { label: '形容詞用法', hint: '「' + nw + '」を修飾', conf: 80, deltas };
    }

    if (ptcCase === 'genitive') {
        const genNoun = tokens.find(t => {
            if (t.globalIdx === hitGIdx) return false;
            const pos = _entryPosCode(t);
            if (!['N','P','D','R'].includes(pos)) return false;
            return _decodeMorph(t).case === 'genitive';
        });
        const mainSubjects = tokens.filter(t => {
            if (t.globalIdx === hitGIdx) return false;
            const pos = _entryPosCode(t);
            if (!['N','P','D','R'].includes(pos)) return false;
            return _decodeMorph(t).case === 'nominative';
        });
        const genLemma  = genNoun ? (genNoun.lemma || _cleanText(genNoun)) : null;
        const subjLemmas = new Set(mainSubjects.map(t => t.lemma || _cleanText(t)));
        const hasDistinctSubject = genLemma && !subjLemmas.has(genLemma);
        let conf = 30;
        if (genNoun)             conf += 25;
        if (hasDistinctSubject)  conf += 25;
        if (mainSubjects.length === 0) conf -= 10;
        const hintText = genNoun
            ? `「${_cleanText(genNoun)}」が分詞の主語となり、主節から独立した時間・条件・理由節を形成`
            : '主節と独立した時間・条件節を形成する可能性';
        deltas.push(
            { label: '分詞が属格形をとっている',              value: +30 },
            { label: genNoun ? `同節に属格名詞あり（${_cleanText(genNoun)}）` : '格一致名詞なし', value: genNoun ? +25 : +5 },
            { label: hasDistinctSubject ? `主語の非同一性を確認（主節主語と異なる）` : mainSubjects.length > 0 ? `主語が主節と同一の可能性あり（注意）` : `主節主語が不明確`, value: hasDistinctSubject ? +25 : mainSubjects.length > 0 ? -15 : -10 },
            { label: '冠詞なし → 実体用法を除外',             value: +10 },
            { label: '属格絶対はデフォルト推定',              value: -5 }
        );
        return {
            label: hasDistinctSubject ? '属格絶対（推定）' : '属格絶対の可能性（要確認）',
            hint:  hintText,
            conf:  Math.min(Math.max(conf, 25), 92),
            deltas,
        };
    }

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
   8. calcCoocNeighbors
   ═══════════════════════════════════════════════════ */
function calcCoocNeighbors(tokens, targetGlobalIdx, stopLemmas, _entryPosCode, _cleanText, maxResults) {
    maxResults = maxResults || 6;
    _cleanText = _cleanText || (e => (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim());
    stopLemmas = stopLemmas || new Set();
    const SEMANTIC_POS = new Set(['N','V','A','D','R']);
    const results = [];
    tokens.forEach(t => {
        if (t.globalIdx === targetGlobalIdx) return;
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
   9. scoreEngine
   morph / syntax / semantic 統合スコアリングエンジン。
   ═══════════════════════════════════════════════════ */
const scoreEngine = {
    evaluate(opts) {
        const { morphology = {}, syntax = {}, semantics = {}, context = {} } = opts;
        const deltas  = [];
        const reasons = [];

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
        const score      = Math.min(100, Math.round(total));
        const confidence = Math.min(99, Math.max(20, score));

        return { score, confidence, reasons, deltas, rejected: [], alternatives: [] };
    }
};

/* ═══════════════════════════════════════════════════
   10〜18. 残存関数（省略なし、元のまま維持）
   ═══════════════════════════════════════════════════ */
function renderExplainability(result, summaryLabel) {
    if (!result || !result.deltas || !result.deltas.length) return '';
    summaryLabel = summaryLabel || '判定根拠';
    const confColor = result.confidence >= 75 ? '#4a7a5a' : result.confidence >= 55 ? '#a09050' : '#b05050';
    const maxAbs = Math.max(...result.deltas.map(d => Math.abs(d.value)), 1);
    const deltaRows = result.deltas.map(d => {
        const sign  = d.value > 0 ? '+' : '';
        const barW  = Math.round(Math.abs(d.value) / maxAbs * 100);
        const barC  = d.value > 0 ? 'rgba(74,122,90,0.55)' : 'rgba(176,80,80,0.45)';
        const col   = d.value > 0 ? '#4a7a5a' : d.value < 0 ? '#b05050' : '#888';
        return `<div class="exp-row"><span class="exp-delta" style="color:${col};">${sign}${d.value}</span><div style="width:40px;height:3px;background:#eee;border-radius:2px;overflow:hidden;flex-shrink:0;"><div style="width:${barW}%;height:100%;border-radius:2px;background:${barC};"></div></div><span class="exp-label">${d.label}</span></div>`;
    }).join('');
    const altRows = (result.alternatives || []).slice(0, 3).map(a => `<div class="exp-alt-row"><span style="flex:1;">${a.label}</span><span class="ui-caption">${a.score}%</span></div>`).join('');
    return `<details class="exp-panel"><summary><span>${summaryLabel}</span><span style="font-weight:700;color:${confColor};">${result.confidence}%</span></summary><div class="exp-body">${deltaRows}${altRows ? `<div class="exp-alts">${altRows}</div>` : ''}</div></details>`;
}

function buildCompactInsight(data) {
    const { tense, mood, matched = [], BOOK_JP = {} } = data;
    return {
        primary:    _detectPrimaryInsight(tense, mood),
        secondary:  _detectSecondaryInsight(tense, mood, matched, BOOK_JP),
        confidence: _computeInsightConfidence(tense, mood),
        quickGuide: _buildQuickGuide(tense, mood),
    };
}
function _detectPrimaryInsight(tense, mood) {
    const key = [tense, mood].filter(Boolean).join('+');
    const MAP = { 'aorist+indicative':'〜した（完結した動作）','present+indicative':'〜している／〜する（継続・習慣）','imperfect+indicative':'〜していた（過去の継続）','perfect+indicative':'〜した状態にある（現在への影響）','future+indicative':'〜するだろう（将来の出来事）','aorist+imperative':'〜しなさい（即時命令）','present+imperative':'〜し続けなさい（継続命令）','aorist+subjunctive':'〜するように／〜するならば（目的・条件）','aorist+participle':'〜してから（先行動作・副詞的）','present+participle':'〜しながら（同時動作・付帯状況）','aorist+infinitive':'〜すること（目的・補語）','present+infinitive':'〜し続けること（継続的行為）' };
    return MAP[key] || null;
}
function _detectSecondaryInsight(tense, mood, matched, BOOK_JP) {
    const dist = calcDistribution(matched, BOOK_JP); const total = matched.length;
    if (!dist.length || !total) return null;
    if (dist.length === 1) return dist[0].label + 'のみ（限定的語形）';
    if (dist[0].count / total >= 0.45) return dist[0].label + '中心（' + Math.round(dist[0].count/total*100) + '%）';
    if (dist.length >= 5) return dist.length + '書物に広く分布（一般的語形）';
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
    const GUIDES = { 'aorist+indicative':'主語（主格）と目的語（対格）を探してください','present+indicative':'主語省略に注意。前節から継続されることが多い','aorist+participle':'冠詞→名詞的 / 格一致名詞→形容詞的 / その他→副詞的','present+participle':'付帯状況「〜しながら」が最多。冠詞の有無を確認','aorist+subjunctive':'先行する接続詞（ἵνα・ἐάν・ὅταν）を必ず確認','aorist+imperative':'否定はμή＋アオリスト接続法（禁止）を使う','present+imperative':'否定はμή＋現在命令（〜するのをやめなさい）' };
    return GUIDES[key] || '文中の格構造（主格・対格・属格）を確認してください';
}

function buildRepresentativeExamples(matched, BOOK_JP, getJaVerse, limit) {
    limit = limit || 3;
    if (!matched.length) return '';
    const seen = new Set(); const picks = [];
    for (const e of matched) {
        const bk = e._bookKey || e.bookKey || '?';
        if (!seen.has(bk)) { seen.add(bk); picks.push(e); if (picks.length >= limit) break; }
    }
    if (!picks.length) picks.push(...matched.slice(0, limit));
    const rows = picks.map(e => {
        const word = e.word || e.normalized || e.text || '';
        const ref  = e.ref  || '';
        const bk   = e._bookKey || e.bookKey || '';
        const verseLabel = ref ? String(ref).replace(/^[A-Z0-9]+\s*/,'') : (e.verse != null ? e.verse : '');
        const label = (BOOK_JP[bk] || bk) + (verseLabel ? ' ' + verseLabel : '');
        const ja    = typeof getJaVerse === 'function' ? getJaVerse(e) : '';
        return `<div style="padding:6px 0;border-bottom:1px solid var(--border,rgba(0,0,0,.06));"><div style="display:flex;align-items:baseline;gap:8px;"><span style="font-family:'Gentium Plus',serif;font-size:1.05rem;color:var(--accent,#5a6e82);font-weight:700;">${word}</span><span class="ui-caption">${label}</span></div>${ja ? `<div style="font-size:0.75rem;color:var(--text-sub,#6e6e73);margin-top:2px;line-height:1.5;">${ja}</div>` : ''}</div>`;
    }).join('');
    return `<div class="ui-card"><div class="ui-section-label" style="margin-bottom:6px;">代表用例</div>${rows}</div>`;
}

function buildMeaningContrast(top, others) {
    if (!top || !others || !others.length) return '';
    const rejectRows = others.slice(0, 2).map(o => `<div class="contrast-row"><span class="contrast-meaning">${o.meaning}</span><span class="contrast-reason">${o.rejectReason || 'スコアが低い'}</span></div>`).join('');
    return `<div class="meaning-contrast"><div class="contrast-adopted"><span class="contrast-label-adopted">採用</span><span class="contrast-top">${top.meaning}</span><span class="contrast-score">${top.score}%</span></div>${rejectRows ? `<div class="contrast-label-rejected">除外候補</div>${rejectRows}` : ''}</div>`;
}

function buildRoleSummary(tokens, roleMap, _cleanText) {
    _cleanText = _cleanText || (e => (e.word||e.normalized||e.text||'').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g,'').trim());
    const find = role => { const t = tokens.find(t => roleMap && roleMap.get && roleMap.get(t)?.role === role); return t ? _cleanText(t) : ''; };
    return { subj: find('subj'), verb: find('verb'), obj: find('obj'), ptc: find('ptc') };
}

const ASPECT_INFO = {
    present:    { aspect:'線的（進行・継続）', symbol:'━━━', note:'動作が進行中・習慣的に繰り返されることを示す。「今」を意味するとは限らない' },
    imperfect:  { aspect:'線的（過去の継続）', symbol:'━━━', note:'過去に継続していた動作。「〜していた」という継続・反復を背景として描く' },
    aorist:     { aspect:'点的（完結・一回性）', symbol:'●', note:'動作を完結した一点として捉える。「過去」を意味するのは直説法のときのみ。不定詞・分詞・接続法では時間軸の位置を表さない' },
    perfect:    { aspect:'結果状態の継続', symbol:'●━━', note:'完結した動作の結果が現在も有効。コイネー完了形の核心は「今も続く状態」であり、単なる過去の記述ではない' },
    pluperfect: { aspect:'過去時点での結果状態', symbol:'●━', note:'過去のある時点で完結し、その後も続いていた状態。完了形の時制を過去に移したもの' },
    future:     { aspect:'期待的（将来の実現）', symbol:'◌', note:'将来の動作・状態を述べる。アスペクトより時間的位置（未来）が主な意味。約束・命令・予言の文脈で使われる' },
};
function renderAspectTag(tense) {
    if (!tense) return;
    const info = ASPECT_INFO[tense];
    if (!info) return;
    const el = document.getElementById('core-tags');
    if (!el) return;
    const tag = document.createElement('div');
    tag.className = 'morph-tag';
    tag.style.cssText = 'border-left: 3px solid var(--accent-mid);cursor: help;position: relative;';
    tag.title = info.note;
    tag.innerHTML = `<span class="morph-tag-key">アスペクト</span><span class="morph-tag-val" style="display:flex;align-items:center;gap:6px;"><span style="font-size:0.85rem;opacity:0.6;letter-spacing:1px;">${info.symbol}</span><span>${info.aspect}</span></span>`;
    el.appendChild(tag);
}

const DEPONENT_LEMMAS = new Set(['ἔρχομαι','πορεύομαι','ἄρχομαι','ἐγείρομαι','προσέρχομαι','ἀπέρχομαι','εἰσέρχομαι','ἐξέρχομαι','διέρχομαι','παρέρχομαι','συνέρχομαι','κάθημαι','κεῖμαι','ἀποκρίνομαι','βούλομαι','λογίζομαι','δέομαι','εὔχομαι','προσεύχομαι','ἐπιθυμέω','φοβέομαι','λυπέομαι','ἅπτομαι','θεάομαι','ὁράομαι','γίνομαι','δύναμαι','ἐργάζομαι','ἀσπάζομαι','χαρίζομαι','μιμνῄσκομαι','ἐπιλανθάνομαι']);
const BENEFACTIVE_LEMMAS = new Set(['αἱρέομαι','ποιέομαι','λαμβάνομαι','κτάομαι','προσλαμβάνομαι']);
const PERMISSIVE_LEMMAS  = new Set(['βαπτίζομαι','περιτέμνομαι','καθαρίζομαι']);

function classifyMiddleVoice(lemma, voice) {
    if (!['middle','middle deponent','middle or passive'].includes(voice)) return null;
    const l = (lemma || '').trim();
    if (DEPONENT_LEMMAS.has(l))    return { type:'Deponent（中動形・能動意味）', note:'この語は形が中動態ですが能動態の意味で使われます（deponent 動詞）。「受けとめる」ニュアンスはありません。', cssClass:'middle-deponent' };
    if (PERMISSIVE_LEMMAS.has(l))  return { type:'許容的中動', note:'主語が動作を受け入れる・許容するニュアンスです。受動態と意味が近いですが、主語の主体性が残ります。', cssClass:'middle-permissive' };
    if (BENEFACTIVE_LEMMAS.has(l)) return { type:'利益的中動', note:'主語が自分自身の利益のために動作を行います。能動態との使い分けが意味の核心です。', cssClass:'middle-benefactive' };
    return { type:'中動態（主語が動作に深く関与）', note:'動作が主語自身に関わります。再帰的（自分を〜する）か、利益的（自分のために〜する）かは文脈で判断します。', cssClass:'middle-general' };
}

const DIVINE_PASSIVE_VERBS = [
    { lemma:'ἀφίημι', ja:'赦す' },{ lemma:'δικαιόω', ja:'義とする' },{ lemma:'ἁγιάζω', ja:'聖別する' },
    { lemma:'σώζω', ja:'救う' },{ lemma:'καλέω', ja:'召す・呼ぶ' },{ lemma:'εὐλογέω', ja:'祝福する' },
    { lemma:'παρακαλέω', ja:'慰める' },{ lemma:'ἐλεέω', ja:'憐れむ' },{ lemma:'πληρόω', ja:'満たす・成就する' },
    { lemma:'χαρίζομαι', ja:'賜わる' },{ lemma:'γράφω', ja:'書く（聖書に記される）' },{ lemma:'τελέω', ja:'成就する' },
    { lemma:'ἐγείρω', ja:'起こす（復活させる）' },{ lemma:'κρίνω', ja:'裁く' },{ lemma:'ἀποστέλλω', ja:'遣わす' },
    { lemma:'δίδωμι', ja:'与える' },{ lemma:'χορτάζω', ja:'満足させる' },{ lemma:'ὁράω', ja:'見る（神を見る）' },
    { lemma:'κληρονομέω', ja:'相続する（神の国を）' },
];
const THEOLOGICAL_MARKERS_DP = new Set(['θεός','κύριος','Χριστός','Ἰησοῦς','πατήρ','βασιλεία','οὐρανός','πνεῦμα','ἅγιος','δικαιοσύνη','σωτηρία','ζωή','αἰώνιος','εὐαγγέλιον','ἐκκλησία','νόμος','πίστις','χάρις']);

function detectDivinePassive(entry, tokens, _decodeMorph, _cleanText) {
    _cleanText = _cleanText || (e => (e.word||e.normalized||e.text||'').trim());
    const m = _decodeMorph(entry);
    if (!['passive','middle or passive'].includes(m.voice)) return null;
    const lemma = (entry.lemma || '').trim();
    const verseLemmas = tokens.map(t => (t.lemma || '').trim());
    let score = 30;
    const verbMatch = DIVINE_PASSIVE_VERBS.find(v => v.lemma === lemma);
    const verbJa = verbMatch ? verbMatch.ja : '';
    if (verbMatch) score += 28;
    const theoCount = verseLemmas.filter(l => THEOLOGICAL_MARKERS_DP.has(l)).length;
    score += Math.min(theoCount * 8, 24);
    const hasExplicitAgent = tokens.some(t => (_cleanText(t) || '').trim() === 'ὑπό');
    if (!hasExplicitAgent) score += 15; else score -= 20;
    if (m.tense === 'future')  score += 8;
    if (m.tense === 'perfect') score += 5;
    if (m.tense === 'aorist' && m.mood === 'participle') score += 6;
    const confidence = Math.min(Math.max(score, 0), 95);
    if (confidence < 45) return null;
    return { isDivinePassive: true, confidence, verbJa, note: verbJa ? `神的受動態の可能性（確信度 ${confidence}%）— 「神が${verbJa}」を受動形で表現しています` : `神的受動態の可能性（確信度 ${confidence}%）— ユダヤ的伝統で神の名を避けるために受動態を使う用法です` };
}

function buildSemanticShift(lemma, verseLemmas) {
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
    return { hasShift: true, note: `「${info.normal}」より「${info.shifted}」の意味の可能性（文脈語が一致）` };
}

/* ═══════════════════════════════════════════════════
   Global registration — App 名前空間への統一登録
   ───────────────────────────────────────────────────
   設計方針：
     - 正規経路  : window.App.scoreEngine（唯一の公式API）
     - 非推奨経路: window.scoreEngine（互換エイリアス、将来削除予定）
   安定性保証：
     - 二重ロード耐性  : if (!window.App.scoreEngine) ガードで上書きしない
     - 実行順序耐性    : window.App || {} で先行定義済みのAppを保持
     - 再設定可能性    : configurable:false を使わず将来のテスト差し替えに対応
   ═══════════════════════════════════════════════════ */

/* ① App 名前空間の安全な初期化
      他スクリプトが先に window.App を定義していても破壊しない */
window.App = window.App || {};

/* ② scoreEngine の正規登録
      二重ロードされても既存インスタンスを上書きしない */
if (!window.App.scoreEngine) {
    window.App.scoreEngine = scoreEngine;
}

/* ③ 後方互換エイリアス（非推奨 / @deprecated）
      既存の外部HTMLが window.scoreEngine を参照している間の移行橋渡し。
      正規経路（window.App.scoreEngine）への移行完了後に削除すること。
      意図的に writable:true / configurable:true のままにし
      テスト環境でのモック差し替えを可能にする。            */
if (typeof window.scoreEngine === 'undefined') {
    window.scoreEngine = window.App.scoreEngine;
}
