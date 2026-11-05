// 読書メモの非同期世代はコンテナごとに保持し、PC/Mobile の描画が互いを無効化しない。
let _apparatusData         = null;  // apparatus.json キャッシュ（初回のみ fetch）
let _apparatusLoadP        = null;  // 進行中 fetch Promise
// 本文批評欄の非同期世代はコンテナごとに保持し、PC/Mobile 間の競合を防ぐ。
let _apparatusJaData       = null;  // apparatus-ja.json キャッシュ（失敗時は null のまま）
let _apparatusJaLoadP      = null;  // 進行中 fetch Promise
let _apparatusJaAllData    = null;  // 4データセット統合キャッシュ（失敗時は null のまま）
let _apparatusJaAllLoadP   = null;  // 進行中 fetch Promise
let _apparatusLemJaData    = null;  // apparatus-lem-ja.json キャッシュ（失敗時は null のまま）
let _apparatusLemJaLoadP   = null;  // 進行中 fetch Promise
let _apparatusRdgJaData    = null;  // apparatus-rdg-ja.json キャッシュ（失敗時は null のまま）
let _apparatusRdgJaLoadP   = null;  // 進行中 fetch Promise
let _ft11Cache = null;
/* ── VR-6-C: Flow Tree runtime asset loader（chapter 単位 JSON）──
   token ref → BOOK/chapter → public/assets/data/flow-tree/{BOOK}/{ch}.json を fetch し、
   refIndex から所属 sentence root を得る。neighborhood-view が要求する nodesById は
   保存 JSON に持たせず root walk で再構築する（schema 非変更）。
   すべて Failure Mode（fetch 失敗・不正・不在は null/''）で静かに失敗する。 */
const _flowTreeChapterCache = {};
async function _loadFlowTreeChapter(book, chapter) {
    const key = book + '/' + chapter;
    if (key in _flowTreeChapterCache) return _flowTreeChapterCache[key];
    let data = null;
    try {
        const res = await fetch(`../assets/data/flow-tree/${book}/${chapter}.json`);
        if (res.ok) data = await res.json();
    } catch (_) { data = null; }
    _flowTreeChapterCache[key] = data; // null も cache（再 fetch 抑止・静音）
    return data;
}
/** apparatus.json を一度だけ fetch してキャッシュする。失敗時は null を返す（静寂優先）。 */
async function _loadApparatusData() {
    if (_apparatusData) return _apparatusData;
    if (_apparatusLoadP) return _apparatusLoadP;
    _apparatusLoadP = fetch('../assets/data/apparatus.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { _apparatusData = d; return d; })
        .catch(() => null);
    return _apparatusLoadP;
}

/** apparatus-ja.json を一度だけ fetch してキャッシュする。
 *  失敗時は null を返す — apparatus.json の表示は影響を受けない（静寂優先）。 */
async function _loadApparatusJaData() {
    if (_apparatusJaData) return _apparatusJaData;
    if (_apparatusJaLoadP) return _apparatusJaLoadP;
    _apparatusJaLoadP = fetch('../assets/data/apparatus-ja.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { _apparatusJaData = d; return d; })
        .catch(() => null);
    return _apparatusJaLoadP;
}

/** apparatus-ja の4データセット（manual + Phase 1〜3）を並列 fetch してマージする。
 *  優先順位: manual > Phase 1 > Phase 2 > Phase 3。
 *  個別 fetch が失敗したデータセットは空として扱い、残りを統合して返す。
 *  全て失敗した場合は { entries: {} } を返す（静寂優先、ギリシャ語 apparatus 表示には影響しない）。 */
async function _loadApparatusJaAllData() {
    if (_apparatusJaAllData) return _apparatusJaAllData;
    if (_apparatusJaAllLoadP) return _apparatusJaAllLoadP;
    const fetchJson = url => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);
    _apparatusJaAllLoadP = Promise.all([
        fetchJson('../assets/data/apparatus-ja.json'),
        fetchJson('../assets/data/apparatus-ja-auto.json'),
        fetchJson('../assets/data/apparatus-ja-phase2.json'),
        fetchJson('../assets/data/apparatus-ja-phase3.json'),
    ]).then(([manual, p1, p2, p3]) => {
        const merged = {};
        // Phase 3 → Phase 2 → Phase 1 の順で先書きし、manual で上書き（manual 最優先）
        for (const src of [p3, p2, p1, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        _apparatusJaAllData = { entries: merged };
        return _apparatusJaAllData;
    }).catch(() => null);
    return _apparatusJaAllLoadP;
}

/** apparatus-lem-ja.json を fetch して語句日本語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusLemJaData() {
    if (_apparatusLemJaData) return _apparatusLemJaData;
    if (_apparatusLemJaLoadP) return _apparatusLemJaLoadP;
    _apparatusLemJaLoadP = fetch('../assets/data/apparatus-lem-ja.json')
        .then(r => r.ok ? r.json() : null)
        .then(d => { _apparatusLemJaData = d; return d; })
        .catch(() => null);
    return _apparatusLemJaLoadP;
}

/** apparatus-rdg-ja.json を fetch して各読みの日本語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusRdgJaData() {
    if (_apparatusRdgJaData) return _apparatusRdgJaData;
    if (_apparatusRdgJaLoadP) return _apparatusRdgJaLoadP;
    _apparatusRdgJaLoadP = fetch('../assets/data/apparatus-rdg-ja.json')
        .then(r => r.ok ? r.json() : null)
        .then(d => { _apparatusRdgJaData = d; return d; })
        .catch(() => null);
    return _apparatusRdgJaLoadP;
}
/* ══════════════════════════════════════════
   口語訳アラインメント（パイロット）— 対応表ストアとトークン索引
   対応表: assets/data/alignment/{翻訳ID}/{書}/{章}.json（章ごとのファイル。ファイル内の book/chapter/translation でも照合）。
   章ロード時に render() の前へ先読みする（_dcvChapterTreeForRender と同じ方式）。
   対応表が無い場合はすべて null/空に倒れ、翻訳表示は従来どおりになる。
   ══════════════════════════════════════════ */
const _jaAlignCache = new Map();
async function _loadJaAlignForRender(transId, book, ch) {
    if (!transId || !book || ch == null) return null;
    if (typeof TRANSLATION_REGISTRY !== 'undefined'
        && !TRANSLATION_REGISTRY.some(t => t.id === transId)) return null;
    const key = transId + ':' + book + ':' + ch;
    if (_jaAlignCache.has(key)) return _jaAlignCache.get(key);
    let data = null;
    try {
        const res = await fetch(`../assets/data/alignment/${transId}/${book}/${ch}.json`);
        if (res.ok) {
            const d = await res.json();
            if (d && d.book === book && Number(d.chapter) === Number(ch) && d.translation === transId) data = d;
        }
    } catch (_) { data = null; }
    _jaAlignCache.set(key, data);
    return data;
}
const _glossSidecarCache = new Map();
async function _loadGlossForRender(book, ch) {
    const transId = _glossTransIdForUi();
    if (!transId || !book || ch == null) return null;
    const key = transId + ':' + book + ':' + ch;
    if (_glossSidecarCache.has(key)) return _glossSidecarCache.get(key);
    let data = null;
    try {
        const res = await fetch(`../assets/data/gloss/${transId}/${book}/${ch}.json`);
        if (res.ok) {
            const d = await res.json();
            if (d && d.book === book && Number(d.chapter) === Number(ch) && d.translation === transId && d.glosses) data = d;
        }
    } catch (_) { data = null; }
    _glossSidecarCache.set(key, data);
    return data;
}
/* 英語の語義リスト（Abbott-Smith 原文から生成した gloss-en-senses.json）。
   日本語UIの語義行が最大3件出すのに合わせ、英語でも最大3件を返す。
   データ未到着・該当なしの語は lite の代表グロス（_enShortGloss）に落とす。 */
let _enSensesData = null;
let _enSensesPromise = null;
function _ensureEnSenses() {
    if (_enSensesData || _enSensesPromise) return;
    _enSensesPromise = fetch('../assets/data/lexicon/gloss-en-senses.json')
        .then(r => (r && r.ok) ? r.json() : null)
        .then(d => {
            _enSensesData = (d && typeof d === 'object') ? d : null;
            if (_enSensesData && _peekEl && _peekLemmaId) {
                const gl = _peekEl.querySelector('.word-peek-glosses');
                const en = _enSenseText(_peekLemmaId);
                if (gl && en && (!gl.textContent || gl.textContent === _enShortGloss(_peekLemmaId))) { gl.textContent = en; gl.hidden = false; }
            }
        })
        .catch(() => { _enSensesPromise = null; });
}
/* 語の役割で読む: 章×デバイスの公開可否（rk-availability.json）と
   手動オフセット（rk-offsets/{BOOK}.json）の読み込み。 */
window._rkAvail = null;
window._rkAvailPromise = fetch('../assets/data/rk-availability.json')
    .then(r => r.ok ? r.json() : {})
    .then(d => {
        window._rkAvail = d || {};
        /* 取得完了後にモード一覧を再描画する（初期描画とのレース回避） */
        if (typeof _sbRenderModes === 'function') _sbRenderModes();
        if (typeof _sbRenderModesL0 === 'function') _sbRenderModesL0();
        if (typeof _mmpRenderModes === 'function') _mmpRenderModes();
        return window._rkAvail;
    })
    .catch(() => { window._rkAvail = {}; return window._rkAvail; });
const _rkOffsetsCache = {};
async function _loadRkOffsets(book) {
    if (!book) return null;
    if (book in _rkOffsetsCache) return _rkOffsetsCache[book];
    let data = null;
    try {
        const res = await fetch(`../assets/data/rk-offsets/${book}.json`);
        if (res.ok) data = await res.json();
    } catch (_) { data = null; }
    _rkOffsetsCache[book] = data;
    return data;
}
/* SR 章データキャッシュ（DA の _flowTreeChapterCache と同パターン） */
const _srChapterCache = {};
async function _loadSrChapter(book, chapter) {
    const key = book + '/' + chapter;
    if (key in _srChapterCache) return _srChapterCache[key];
    let data = null;
    try {
        const res = await fetch(`../assets/data/sr/${book}/${chapter}.json`);
        if (res.ok) data = await res.json();
    } catch (_) { data = null; }
    _srChapterCache[key] = data;
    return data;
}
/* bible_data 章トークンのキャッシュ付きローダ（局所表示の japanese 参照用） */
const _bdChapterCache = {};
async function _loadBdChapter(book, chapter) {
    const key = book + '/' + chapter;
    if (key in _bdChapterCache) return _bdChapterCache[key];
    let data = null;
    try {
        const res = await fetch(`../bible_data/nt/${book}/${chapter}.json`);
        if (res.ok) data = await res.json();
    } catch (_) { data = null; }
    _bdChapterCache[key] = data; // null も cache（再 fetch 抑止・静音）
    return data;
}
/*
 * transDataPath — 翻訳IDとbook/chからJSONパスを返す
 *   translations/{transId}/{book}/{ch}.json
 */
function transDataPath(transId, book, ch) {
    return `../translations/${transId}/${book}/${ch}.json`;
}
/*
 *   loadBook(book, translation) のエイリアスとして機能する。
 *
 *   translations/{transId}/{book}/{ch}.json を fetch する。
 *   失敗した場合は null を返す。
 */
async function _fetchTranslation(transId, book, ch) {
    try {
        const res = await fetch(transDataPath(transId, book, ch));
        if (res.ok) return await res.json();
    } catch(e) {}

    return null;
}
