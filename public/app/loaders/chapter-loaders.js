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
let _apparatusEnAllData    = null;  // apparatus-en 4データセット統合キャッシュ（失敗時は null のまま）
let _apparatusEnAllLoadP   = null;  // 進行中 fetch Promise
let _apparatusLemEnData    = null;  // apparatus-lem-en.json キャッシュ（失敗時は null のまま）
let _apparatusLemEnLoadP   = null;  // 進行中 fetch Promise
let _apparatusRdgEnData    = null;  // apparatus-rdg-en.json キャッシュ（失敗時は null のまま）
let _apparatusRdgEnLoadP   = null;  // 進行中 fetch Promise
let _apparatusEsAllData    = null;  // apparatus-es 4データセット統合キャッシュ（失敗時は null のまま）
let _apparatusEsAllLoadP   = null;  // 進行中 fetch Promise
let _apparatusLemEsData    = null;  // apparatus-lem-es.json キャッシュ（失敗時は null のまま）
let _apparatusLemEsLoadP   = null;  // 進行中 fetch Promise
let _apparatusRdgEsData    = null;  // apparatus-rdg-es.json キャッシュ（失敗時は null のまま）
let _apparatusRdgEsLoadP   = null;  // 進行中 fetch Promise
let _ft11Cache = null;
/* ── #105：取得失敗を「データ無し」と区別して扱う共通部品 ──
   成功（データ有り）／確定の不在（404・本番は未存在パスが index.html を 200 で返すため JSON として読めない場合も）は
   従来どおりキャッシュし、再取得しない。一時的な失敗（通信エラー・408・429・5xx）はキャッシュに固定せず、
   次の表示で再試行できるようにする。再試行は「表示（呼び出し）ごとに1回」だけで、ループは持たない。 */
async function _fetchJsonOutcome(url) {
    try {
        const res = await fetch(url);
        if (res.ok) {
            try { return { ok: true, data: await res.json() }; }
            catch (_) { return { ok: true, data: null }; }
        }
        if (res.status === 408 || res.status === 429 || res.status >= 500) return { ok: false, data: null };
        return { ok: true, data: null };
    } catch (_) { return { ok: false, data: null }; }
}
/* 章単位などのキャッシュ付きローダ共通。同時要求は1本にまとめ、一時的な失敗はキャッシュに書かない。 */
const _jsonLoadInflight = new Map();
function _loadJsonCached(cache, key, url) {
    if (key in cache) return Promise.resolve(cache[key]);
    if (_jsonLoadInflight.has(url)) return _jsonLoadInflight.get(url);
    const p = _fetchJsonOutcome(url).then(o => {
        if (o.ok) cache[key] = o.data;
        return o.data;
    }).finally(() => { _jsonLoadInflight.delete(url); });
    _jsonLoadInflight.set(url, p);
    return p;
}
/* ── VR-6-C: Flow Tree runtime asset loader（chapter 単位 JSON）──
   token ref → BOOK/chapter → public/assets/data/flow-tree/{BOOK}/{ch}.json を fetch し、
   refIndex から所属 sentence root を得る。neighborhood-view が要求する nodesById は
   保存 JSON に持たせず root walk で再構築する（schema 非変更）。
   すべて Failure Mode（fetch 失敗・不正・不在は null/''）で静かに失敗する。 */
const _flowTreeChapterCache = {};
function _loadFlowTreeChapter(book, chapter) {
    return _loadJsonCached(_flowTreeChapterCache, book + '/' + chapter, `../assets/data/flow-tree/${book}/${chapter}.json`);
}
/* #105: 404＝データ無し（null を確定）、それ以外の非OKは一時的な失敗として投げる（呼び出し側の catch でキャッシュを解除して再試行可能にする） */
function _okJsonOrNull(r) {
    if (r && r.ok) return r.json();
    if (r && r.status === 404) return null;
    throw new Error('fetch ' + (r && r.status));
}
/** apparatus.json を一度だけ fetch してキャッシュする。失敗時は null を返す（静寂優先）。 */
async function _loadApparatusData() {
    if (_apparatusData) return _apparatusData;
    if (_apparatusLoadP) return _apparatusLoadP;
    _apparatusLoadP = fetch('../assets/data/apparatus.json')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => { _apparatusData = d; return d; })
        .catch(() => { _apparatusLoadP = null; return null; });
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
        .catch(() => { _apparatusJaLoadP = null; return null; });
    return _apparatusJaLoadP;
}

/** apparatus-ja の4データセット（manual + Phase 1〜3）を並列 fetch してマージする。
 *  優先順位: manual > Phase 1 > Phase 2 > Phase 3。
 *  個別 fetch が失敗したデータセットは空として扱い、残りを統合して返す。
 *  全て失敗した場合は { entries: {} } を返す（静寂優先、ギリシャ語 apparatus 表示には影響しない）。 */
async function _loadApparatusJaAllData() {
    if (_apparatusJaAllData) return _apparatusJaAllData;
    if (_apparatusJaAllLoadP) return _apparatusJaAllLoadP;
    _apparatusJaAllLoadP = Promise.all([
        _fetchJsonOutcome('../assets/data/apparatus-ja.json'),
        _fetchJsonOutcome('../assets/data/apparatus-ja-auto.json'),
        _fetchJsonOutcome('../assets/data/apparatus-ja-phase2.json'),
        _fetchJsonOutcome('../assets/data/apparatus-ja-phase3.json'),
    ]).then(outs => {
        const [manual, p1, p2, p3] = outs.map(o => o.data);
        const merged = {};
        // Phase 3 → Phase 2 → Phase 1 の順で先書きし、manual で上書き（manual 最優先）
        for (const src of [p3, p2, p1, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        const result = { entries: merged };
        /* #105: 1本でも一時的に失敗していたら固定しない（今回の表示は取れた分で出し、次の表示で再取得する） */
        if (outs.every(o => o.ok)) _apparatusJaAllData = result;
        else _apparatusJaAllLoadP = null;
        return result;
    }).catch(() => { _apparatusJaAllLoadP = null; return null; });
    return _apparatusJaAllLoadP;
}

/** apparatus-lem-ja.json を fetch して語句日本語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusLemJaData() {
    if (_apparatusLemJaData) return _apparatusLemJaData;
    if (_apparatusLemJaLoadP) return _apparatusLemJaLoadP;
    _apparatusLemJaLoadP = fetch('../assets/data/apparatus-lem-ja.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusLemJaData = d; return d; })
        .catch(() => { _apparatusLemJaLoadP = null; return null; });
    return _apparatusLemJaLoadP;
}

/** apparatus-rdg-ja.json を fetch して各読みの日本語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusRdgJaData() {
    if (_apparatusRdgJaData) return _apparatusRdgJaData;
    if (_apparatusRdgJaLoadP) return _apparatusRdgJaLoadP;
    _apparatusRdgJaLoadP = fetch('../assets/data/apparatus-rdg-ja.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusRdgJaData = d; return d; })
        .catch(() => { _apparatusRdgJaLoadP = null; return null; });
    return _apparatusRdgJaLoadP;
}

/** apparatus-en の4データセット（manual + Phase 1〜3）を並列 fetch してマージする。
 *  _loadApparatusJaAllData の英語版。優先順位・失敗時の扱いは JA 版と同じ。 */
async function _loadApparatusEnAllData() {
    if (_apparatusEnAllData) return _apparatusEnAllData;
    if (_apparatusEnAllLoadP) return _apparatusEnAllLoadP;
    _apparatusEnAllLoadP = Promise.all([
        _fetchJsonOutcome('../assets/data/apparatus-en.json'),
        _fetchJsonOutcome('../assets/data/apparatus-en-auto.json'),
        _fetchJsonOutcome('../assets/data/apparatus-en-phase2.json'),
        _fetchJsonOutcome('../assets/data/apparatus-en-phase3.json'),
    ]).then(outs => {
        const [manual, p1, p2, p3] = outs.map(o => o.data);
        const merged = {};
        for (const src of [p3, p2, p1, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        const result = { entries: merged };
        /* #105: 1本でも一時的に失敗していたら固定しない（今回の表示は取れた分で出し、次の表示で再取得する） */
        if (outs.every(o => o.ok)) _apparatusEnAllData = result;
        else _apparatusEnAllLoadP = null;
        return result;
    }).catch(() => { _apparatusEnAllLoadP = null; return null; });
    return _apparatusEnAllLoadP;
}

/** apparatus-lem-en.json を fetch して語句英語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusLemEnData() {
    if (_apparatusLemEnData) return _apparatusLemEnData;
    if (_apparatusLemEnLoadP) return _apparatusLemEnLoadP;
    _apparatusLemEnLoadP = fetch('../assets/data/apparatus-lem-en.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusLemEnData = d; return d; })
        .catch(() => { _apparatusLemEnLoadP = null; return null; });
    return _apparatusLemEnLoadP;
}

/** apparatus-rdg-en.json を fetch して各読みの英語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusRdgEnData() {
    if (_apparatusRdgEnData) return _apparatusRdgEnData;
    if (_apparatusRdgEnLoadP) return _apparatusRdgEnLoadP;
    _apparatusRdgEnLoadP = fetch('../assets/data/apparatus-rdg-en.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusRdgEnData = d; return d; })
        .catch(() => { _apparatusRdgEnLoadP = null; return null; });
    return _apparatusRdgEnLoadP;
}
/** apparatus-es の4データセット（manual + Phase 1〜3）を並列 fetch してマージする。
 *  _loadApparatusEnAllData のスペイン語版。優先順位・失敗時の扱いは EN 版と同じ。 */
async function _loadApparatusEsAllData() {
    if (_apparatusEsAllData) return _apparatusEsAllData;
    if (_apparatusEsAllLoadP) return _apparatusEsAllLoadP;
    _apparatusEsAllLoadP = Promise.all([
        _fetchJsonOutcome('../assets/data/apparatus-es.json'),
        _fetchJsonOutcome('../assets/data/apparatus-es-auto.json'),
        _fetchJsonOutcome('../assets/data/apparatus-es-phase2.json'),
        _fetchJsonOutcome('../assets/data/apparatus-es-phase3.json'),
    ]).then(outs => {
        const [manual, p1, p2, p3] = outs.map(o => o.data);
        const merged = {};
        for (const src of [p3, p2, p1, manual]) {
            if (src && src.entries) Object.assign(merged, src.entries);
        }
        const result = { entries: merged };
        /* #105: 1本でも一時的に失敗していたら固定しない（今回の表示は取れた分で出し、次の表示で再取得する） */
        if (outs.every(o => o.ok)) _apparatusEsAllData = result;
        else _apparatusEsAllLoadP = null;
        return result;
    }).catch(() => { _apparatusEsAllLoadP = null; return null; });
    return _apparatusEsAllLoadP;
}

/** apparatus-lem-es.json を fetch して語句スペイン語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusLemEsData() {
    if (_apparatusLemEsData) return _apparatusLemEsData;
    if (_apparatusLemEsLoadP) return _apparatusLemEsLoadP;
    _apparatusLemEsLoadP = fetch('../assets/data/apparatus-lem-es.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusLemEsData = d; return d; })
        .catch(() => { _apparatusLemEsLoadP = null; return null; });
    return _apparatusLemEsLoadP;
}

/** apparatus-rdg-es.json を fetch して各読みのスペイン語マッピングを返す。
 *  失敗時は null を返す（静寂優先）。 */
async function _loadApparatusRdgEsData() {
    if (_apparatusRdgEsData) return _apparatusRdgEsData;
    if (_apparatusRdgEsLoadP) return _apparatusRdgEsLoadP;
    _apparatusRdgEsLoadP = fetch('../assets/data/apparatus-rdg-es.json')
        .then(r => _okJsonOrNull(r))
        .then(d => { _apparatusRdgEsData = d; return d; })
        .catch(() => { _apparatusRdgEsLoadP = null; return null; });
    return _apparatusRdgEsLoadP;
}
/* ══════════════════════════════════════════
   口語訳アラインメント（パイロット）— 対応表ストアとトークン索引
   対応表: assets/data/alignment/{翻訳ID}/{書}/{章}.json（章ごとのファイル。ファイル内の book/chapter/translation でも照合）。
   章ロード時に render() の前へ先読みする（_dcvChapterTreeForRender と同じ方式）。
   対応表が無い場合はすべて null/空に倒れ、翻訳表示は従来どおりになる。
   ══════════════════════════════════════════ */
const _jaAlignCache = new Map();
/* #105：一時的な失敗で null を固定しない。失敗したキーは次の呼び出しで1回だけ再取得する（読み側は _jaAlignCache を直接参照するため、
   キャッシュには直近の結果を残し、再試行の要否だけを別の集合で持つ）。 */
const _jaAlignRetry = new Set();
async function _loadJaAlignForRender(transId, book, ch) {
    if (!transId || !book || ch == null) return null;
    if (typeof TRANSLATION_REGISTRY !== 'undefined'
        && !TRANSLATION_REGISTRY.some(t => t.id === transId)) return null;
    const key = transId + ':' + book + ':' + ch;
    if (_jaAlignCache.has(key) && !_jaAlignRetry.has(key)) return _jaAlignCache.get(key);
    const o = await _fetchJsonOutcome(`../assets/data/alignment/${transId}/${book}/${ch}.json`);
    const d = o.data;
    const data = (d && d.book === book && Number(d.chapter) === Number(ch) && d.translation === transId) ? d : null;
    _jaAlignCache.set(key, data);
    if (o.ok) _jaAlignRetry.delete(key); else _jaAlignRetry.add(key);
    return data;
}
const _glossSidecarCache = new Map();
/* #101：非日本語UIの辞書グロス（サイドカーに無い語の代替）は描画時に同期参照される
   （_uiShortGloss：EN＝lexicon-lite、ES＝gloss-es-senses の第1語義）。到着前に描画すると
   日本語グロスに倒れるため、render() の前に到着を待つ（再描画方式ではなく待機方式）。
   サイドカーの取得と並行して読み込み、待つのは辞書の到着まで。取得が止まった場合に
   章表示ごと止めないよう、待機には上限を置く（上限を超えたら従来どおりの表示）。 */
const _GLOSS_DICT_WAIT_MS = 15000;
function _glossDictReady() {
    const lang = (typeof window !== 'undefined' && window.I18N) ? I18N.lang : null;
    let p = null;
    /* lexicon（ReadingLexicon の補強・StudyPanel 等も使う）は従来どおり非日本語UIで先読みする */
    if (typeof _ensureSemanticData === 'function') {
        let sp = null;
        try { sp = _ensureSemanticData(); } catch (_) {}
        if (lang === 'en') p = sp;
    }
    if (lang === 'es' && typeof _ensureEsSenses === 'function') {
        _ensureEsSenses();
        p = _esSensesPromise;
    }
    if (!p) return Promise.resolve();
    return Promise.race([
        Promise.resolve(p).catch(() => {}),
        new Promise(r => setTimeout(r, _GLOSS_DICT_WAIT_MS)),
    ]);
}
const _glossSidecarRetry = new Set();   /* #105：一時的な失敗のあったキー（次の呼び出しで1回だけ再取得する） */
async function _loadGlossForRender(book, ch) {
    const transId = _glossTransIdForUi();
    if (!transId || !book || ch == null) return null;
    const dictReady = _glossDictReady();   /* #101：サイドカーと並行して取得し、返す前に待つ */
    const key = transId + ':' + book + ':' + ch;
    if (_glossSidecarCache.has(key) && !_glossSidecarRetry.has(key)) { await dictReady; return _glossSidecarCache.get(key); }
    /* トークン単位グロス（gloss-token/）を優先し、無い翻訳・章では従来の
       セグメント単位サイドカー（gloss/）に落とす。どちらの粒度で読めたかを
       data._src ('token' | 'segment') に記録し、セグメント文の重複排除の
       要否を _glossSidecarIsFromFile が判定する。 */
    let data = null;
    let failed = false;
    for (const [dir, src] of [['gloss-token', 'token'], ['gloss', 'segment']]) {
        if (data) break;
        const o = await _fetchJsonOutcome(`../assets/data/${dir}/${transId}/${book}/${ch}.json`);
        if (!o.ok) { failed = true; continue; }   /* 次の候補へ（失敗は記録して、次回の表示で再試行する） */
        const d = o.data;
        if (d && d.book === book && Number(d.chapter) === Number(ch) && d.translation === transId && d.glosses) { d._src = src; data = d; }
    }
    _glossSidecarCache.set(key, data);
    if (failed) _glossSidecarRetry.add(key); else _glossSidecarRetry.delete(key);
    await dictReady;
    return data;
}
/* UI 言語の翻訳のアラインメント（セグメント構造）も先読みする。
   セグメント単位の重複排除（飛び越し配置のセグメント判定）に使う。
   日本語UIでは no-op。 */
async function _loadAlignForRender(book, ch) {
    const transId = _glossTransIdForUi();
    if (!transId || !book || ch == null) return null;
    return _loadJaAlignForRender(transId, book, ch);
}
/* 英語の語義リスト（Abbott-Smith 原文から生成した gloss-en-senses.json）。
   日本語UIの語義行が最大3件出すのに合わせ、英語でも最大3件を返す。
   データ未到着・該当なしの語は lite の代表グロス（_enShortGloss）に落とす。 */
let _enSensesData = null;
let _enSensesPromise = null;
function _ensureEnSenses() {
    if (_enSensesData || _enSensesPromise) return;
    _enSensesPromise = fetch('../assets/data/lexicon/gloss-en-senses.json')
        .then(r => _okJsonOrNull(r))
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
/* スペイン語の語義リスト（gloss-es-senses.json、EN 版と同じ Abbott-Smith 系
   語義のスペイン語訳）。英語版と同じく最大3件を返す。lite の代表グロスは
   英語のため、フォールバックは置かず、該当なしは null（行を出さない）。 */
let _esSensesData = null;
let _esSensesPromise = null;
function _ensureEsSenses() {
    if (_esSensesData || _esSensesPromise) return;
    _esSensesPromise = fetch('../assets/data/lexicon/gloss-es-senses.json')
        .then(r => _okJsonOrNull(r))
        .then(d => {
            _esSensesData = (d && typeof d === 'object') ? d : null;
            if (_esSensesData && _peekEl && _peekLemmaId) {
                const gl = _peekEl.querySelector('.word-peek-glosses');
                const es = (typeof _esSenseText === 'function') ? _esSenseText(_peekLemmaId) : null;
                if (gl && es && !gl.textContent) { gl.textContent = es; gl.hidden = false; }
            }
        })
        .catch(() => { _esSensesPromise = null; });
}
/* 語の役割で読む: 章×デバイスの公開可否（rk-availability.json）と
   手動オフセット（rk-offsets/{BOOK}.json）の読み込み。 */
window._rkAvail = null;
window._rkAvailPromise = fetch('../assets/data/rk-availability.json')
    .then(r => r.ok ? r.json() : {})
    .then(d => {
        window._rkAvail = d || {};
        /* 取得完了後にモード一覧を再描画する（初期描画とのレース回避） */
        if (typeof _sbRenderModesL0 === 'function') _sbRenderModesL0();
        if (typeof _mmpRenderModes === 'function') _mmpRenderModes();
        return window._rkAvail;
    })
    .catch(() => { window._rkAvail = {}; return window._rkAvail; });
const _rkOffsetsCache = {};
function _loadRkOffsets(book) {
    if (!book) return Promise.resolve(null);
    return _loadJsonCached(_rkOffsetsCache, book, `../assets/data/rk-offsets/${book}.json`);
}
/* SR 章データキャッシュ（DA の _flowTreeChapterCache と同パターン） */
const _srChapterCache = {};
function _loadSrChapter(book, chapter) {
    return _loadJsonCached(_srChapterCache, book + '/' + chapter, `../assets/data/sr/${book}/${chapter}.json`);
}
/* bible_data 章トークンのキャッシュ付きローダ（局所表示の japanese 参照用） */
const _bdChapterCache = {};
function _loadBdChapter(book, chapter) {
    return _loadJsonCached(_bdChapterCache, book + '/' + chapter, `../bible_data/nt/${book}/${chapter}.json`);
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
/*
 * _fetchMissingVerseTexts — 品質監査 QA-02。
 * ギリシャ語由来の読み方モード（語順／文の構造／ギリシャ語／語の役割）は節一覧を底本
 * （bible_data）から作るため、翻訳にだけ存在する節（SBLGNT に無い節）が無言で欠落する。
 * UI 言語の基準訳（ja=JA1955／en=WEB／es=RVR1909）の節集合から底本の節集合を引いた差を
 * { 節番号: 訳文 } で返す。節リストはハードコードせず、データから導出する。
 * 該当なし・取得失敗・非ギリシャ語モードでは null（従来表示のまま＝静寂）。
 */
async function _fetchMissingVerseTexts(book, ch, kind, elData) {
    if (!_isGreekReadingMode(kind) || !elData || elData.length === 0) return null;
    const lang = window.I18N && window.I18N.lang;
    const tid  = lang === 'en' ? 'WEB' : (lang === 'es' ? 'RVR1909' : 'JA1955');
    const tr   = await _fetchTranslation(tid, book, ch);
    if (!tr || !tr.verses) return null;
    const have = new Set();
    elData.forEach(w => { const v = _elTokenVerse(w); if (v) have.add(String(v)); });
    const out = {};
    let n = 0;
    Object.entries(tr.verses).forEach(([v, t]) => {
        if (!have.has(String(v)) && t) { out[v] = t; n++; }
    });
    return n ? out : null;
}
