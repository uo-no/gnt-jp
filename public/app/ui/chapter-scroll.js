const _lacPending     = new Set();
const _comparePending = new Set(); /* Phase 3-7-E: compare loader in-flight guard */

/**
 * _loadAndAppendChapter — JA1955 単章モード専用。
 *
 * 指定章のデータを非同期取得し、既存の #bible-text-area に章コンテナを追加する。
 * render() によるDOMクリアは行わない（既存章を保持する）。
 *
 * 制約:
 *   - 比較モード（_transMode === 'compare'）では呼ばない（guard あり）。
 *   - autoloadブロック対象モード（discourse / ST / CR / RL）では動作しない（guard あり）。
 *   - WO（wordOrder）は連続章対応: Greekデータから _buildFlowJpData() で jpData を生成する。
 *   - _cachedElByVerse は更新しない。vNum キー衝突を避けるため、追加章データは
 *     _appendedChapterCache（Phase 2B-2）に格納する（キー: "bookKey|chapter"）。
 *     click path は closure-capture で解決済み。evidence 解決は _resolveTokenJaById が両キャッシュを検索。
 *
 * @param {Object} bookObj  SB_BOOKS entry { key, name, ch }
 * @param {number} chNum    chapter number (integer)
 * @returns {Promise<boolean>}  true=追加成功、false=スキップ（重複/失敗/無効モード）
 */
async function _loadAndAppendChapter(bookObj, chNum) {
    if (!bookObj || chNum == null) return false;

    /* 連続章ガード: autoloadブロック対象モード / 比較モードでは動作しない */
    const _lacColAKind = _toColumnMode(_transA).kind;
    if (_isAutoloadBlockedMode(_lacColAKind) || _transMode === 'compare') return false;

    const _lacBookKey = bookObj.key || '';
    const _lacCh      = String(chNum);
    if (!_lacBookKey || !_lacCh) return false;

    const app = document.getElementById('bible-text-area');
    if (!app) return false;

    /* 重複チェック（既に同一章がDOMにある） */
    if (app.querySelector(`.chapter-block[data-book="${_lacBookKey}"][data-chapter="${_lacCh}"]`)) return false;

    /* 同時リクエスト防止 */
    const _lacKey = `${_lacBookKey}|${_lacCh}`;
    if (_lacPending.has(_lacKey)) return false;
    _lacPending.add(_lacKey);

    let _lacCb = null; /* 未挿入コンテナの参照 */
    try {
        /* 翻訳データ取得: WO・ギリシャ語本文はGreekデータ由来のため翻訳JSONをfetchしない */
        const _lacJpData = (_lacColAKind === 'wordOrder' || _lacColAKind === 'greek-text')
            ? null
            : await _fetchTranslation(_transA, _lacBookKey, _lacCh);
        if (_lacColAKind !== 'wordOrder' && _lacColAKind !== 'greek-text' && (!_lacJpData || !_lacJpData.verses)) return false;

        /* Greekデータ取得 */
        const _lacHasGreek = GREEK_BOOKS.has(_lacBookKey);
        let _lacElData = [];
        if (_lacHasGreek) {
            try {
                const _lacTestament = SB_BOOKS.nt.some(b => b.key === _lacBookKey) ? 'nt' : 'lxx';
                const _lacElRes = await fetch(`../bible_data/${_lacTestament}/${_lacBookKey}/${_lacCh}.json`);
                if (_lacElRes.ok) _lacElData = await _lacElRes.json();
            } catch (_) { /* Greek取得失敗 → 翻訳のみ表示 */ }
        }

        /* elByVerse 構築（render() と同じロジック） */
        const _lacElByVerse = {};
        _lacElData.forEach(w => {
            const v = _elTokenVerse(w);
            if (v) { if (!_lacElByVerse[v]) _lacElByVerse[v] = []; _lacElByVerse[v].push(w); }
        });
        const _lacHasGreekResolved = _lacHasGreek && _lacElData.length > 0;

        /* WO・ギリシャ語本文: Greekデータからjpdata互換オブジェクトを生成する（verse番号一覧として使用） */
        const _lacJpDataResolved = (_lacColAKind === 'wordOrder' || _lacColAKind === 'greek-text')
            ? _buildFlowJpData(_lacElData, await _fetchMissingVerseTexts(_lacBookKey, _lacCh, _lacColAKind, _lacElData))
            : _lacJpData;
        if (!_lacJpDataResolved || !_lacJpDataResolved.verses) return false;

        /* ColumnMode（ループ外で1回計算） */
        const _lacColAMode = _toColumnMode(_transA);
        const _lacColBMode = _toColumnMode(_transB);
        const _lacColA     = { colMode: _lacColAMode, jpData: _lacJpDataResolved };
        const _lacColB     = { colMode: _lacColBMode, jpData: null };

        /* 章コンテナ生成（Phase 2A-1 の _chapterBlock と同じ構造） */
        _lacCb = document.createElement('div');
        _lacCb.className       = 'chapter-block';
        _lacCb.dataset.book    = _lacBookKey;
        _lacCb.dataset.chapter = _lacCh;
        const _lacHdr = document.createElement('div');
        _lacHdr.className   = 'chapter-header';
        _lacHdr.setAttribute('aria-hidden', 'true');
        _lacHdr.textContent = '· · ·';
        _lacCb.appendChild(_lacHdr);

        /* verse-block 生成（単章モード専用: useVersePair=false） */
        Object.entries(_lacJpDataResolved.verses).forEach(([vNum, text]) => {
            const block = _buildColumnBlock(
                0, _lacColA, _lacColB,
                vNum, text, _lacElByVerse,
                _lacHasGreekResolved, false,
                _lacCb, bookObj, chNum
            );
            /* JA1955訳文列のonclickは_buildColumnBlockでは設定されないため、ここで設定する
               （render()と同じパターン）。 */
            if (_lacHasGreekResolved && _lacColAMode.kind !== 'wordOrder' && _lacColAMode.kind !== 'greek-text') {
                block.onclick = () => {
                    /* Phase 3-6-I C: _lacCb は DOM挿入後に null にリセットされるため、
                       click時点でのDOM参照を使う（closure値渡し問題の解消）。 */
                    _selectVerseBlocks(vNum, block, block.closest('.chapter-block'));
                    AppState.toBrowsing(vNum, _lacElByVerse[vNum] || [], bookObj, chNum);
                    openVerseInspector(vNum, _lacElByVerse[vNum] || [], bookObj, chNum);
                    notifyAppStateChange();
                };
            }
            _lacCb.appendChild(block);
            _appendReadingHint(block, vNum, _lacBookKey, chNum);
        });

        /* 挿入直前に再度重複確認（fetch中にDOMが変わった場合） */
        if (app.querySelector(`.chapter-block[data-book="${_lacBookKey}"][data-chapter="${_lacCh}"]`)) {
            _lacCb = null;
            return false;
        }

        app.appendChild(_lacCb);
        _appendedChapterCache.set(`${_lacBookKey}|${_lacCh}`, _lacElByVerse); /* Phase 2B-2: evidenceキャッシュ登録 */
        _observeChapterBlock(_lacCb); /* Phase 2A-4: 追加章をObserverに登録 */
        _lacCb = null; /* DOM挿入完了 */
        return true;

    } catch (_lacErr) {
        return false;
    } finally {
        _lacPending.delete(_lacKey);
    }
}

/* ══════════════════════════════════════════
   Phase 2A-4: Chapter Focus Observer
   ══════════════════════════════════════════ */
let _chapterFocusTimer = null;
let _chapterObserver   = null;
const _chapterObserverVisible = new Map();

/**
 * Focus Chapter判定と AppState 更新。
 * スクロールコンテナ(#main-reading-area)上端を基準に、
 * top<=0 の章の中で最大 top（最も 0 に近い章）を Focus Chapter とする。
 * 全章 top>0 の場合は最小 top（最初に見える章）を選ぶ。
 * intersectionRatio は章高 >> viewport 高で 0 近くなるため使わない。
 */
function _recalcFocusChapter() {
    const container = document.getElementById('main-reading-area');
    if (!container || _chapterObserverVisible.size === 0) return;
    const containerTop = container.getBoundingClientRect().top;
    let focusEl = null, bestAbove = -Infinity, bestBelowEl = null, bestBelow = Infinity;
    for (const [key, el] of _chapterObserverVisible) {
        if (!el.isConnected) { _chapterObserverVisible.delete(key); continue; }
        const top = el.getBoundingClientRect().top - containerTop;
        if (top <= 0) { if (top > bestAbove) { bestAbove = top; focusEl = el; } }
        else          { if (top < bestBelow) { bestBelow = top; bestBelowEl = el; } }
    }
    if (!focusEl) focusEl = bestBelowEl;
    if (!focusEl) return;
    const newBookKey = focusEl.dataset.book || '';
    const newCh      = parseInt(focusEl.dataset.chapter, 10);
    if (!newBookKey || isNaN(newCh)) return;
    /* Focus Chapter が変化していない場合は余計な同期をしない */
    if (AppState.location.book && AppState.location.book.key === newBookKey &&
        AppState.location.chapter === newCh) return;
    const _allBooks = [...(SB_BOOKS.nt || []), ...(SB_BOOKS.ot || [])];
    const bookObj   = _allBooks.find(b => b.key === newBookKey);
    if (!bookObj) return;
    AppState.location.testament = SB_BOOKS.nt.some(b => b.key === newBookKey) ? 'nt' : 'ot';
    AppState.location.book      = bookObj;
    AppState.location.chapter   = newCh;
    syncUrlState();
    renderGlobalBreadcrumb();
    updateHeader('bible');
    _syncMobileLocationLabel();
}

/** 単一章ブロックを Observer に登録する。_loadAndAppendChapter から呼ぶ。 */
function _observeChapterBlock(block) {
    if (!block || !_chapterObserver) return;
    _chapterObserver.observe(block);
}

/**
 * ChapterFocusObserver を初期化する。render() 末尾で呼ぶ（DOM 全消去後のため再初期化が必要）。
 * single mode: #bible-text-area 内の .chapter-block を observe する。
 * compare desktop: #main-reading-area 内の .compare-chapter-block を observe する（Phase 3-7-D）。
 */
function _setupChapterObserver() {
    if (_chapterObserver) { _chapterObserver.disconnect(); _chapterObserver = null; }
    _chapterObserverVisible.clear();
    if (_chapterFocusTimer) { clearTimeout(_chapterFocusTimer); _chapterFocusTimer = null; }
    const container = document.getElementById('main-reading-area');
    const app       = document.getElementById('bible-text-area');
    if (!container || !app || typeof IntersectionObserver === 'undefined') return;
    _chapterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            const key = (entry.target.dataset.book || '') + '|' + (entry.target.dataset.chapter || '');
            if (entry.isIntersecting) { _chapterObserverVisible.set(key, entry.target); }
            else                      { _chapterObserverVisible.delete(key); }
        });
        if (_chapterFocusTimer) clearTimeout(_chapterFocusTimer);
        _chapterFocusTimer = setTimeout(_recalcFocusChapter, 150);
    }, { root: container, threshold: 0 });
    /* Phase 3-7-D: compare mode は container > .compare-chapter-block、single mode は app > .chapter-block。
       _recalcFocusChapter() は dataset.book / dataset.chapter を読むため両ブロック型で変更なく動作する。 */
    if (_transMode === 'compare') {
        container.querySelectorAll('.compare-chapter-block').forEach(function (block) {
            _chapterObserver.observe(block);
        });
    } else {
        app.querySelectorAll('.chapter-block').forEach(function (block) {
            _chapterObserver.observe(block);
        });
    }
}

/* ══════════════════════════════════════════
   Phase 3-7-E: Desktop Compare Chapter Loader
   ══════════════════════════════════════════ */
/**
 * _loadAndAppendChapterCompare — Desktop compare 専用章ローダー。
 * JA1955 翻訳データと Greek データを並列取得し、1 transaction として
 * .compare-chapter-block を #main-reading-area へ追加する。
 * 片側取得失敗時は partial DOM を残さない。
 * WO 右列は _setFlowInjection() ではなく loader 内で per-chapter データを使い inline 注入する。
 *
 * @param {Object} bookObj  SB_BOOKS entry { key, name, ch }
 * @param {number} chNum    chapter number
 * @returns {Promise<boolean>}  true=追加成功、false=スキップ/失敗
 */
async function _loadAndAppendChapterCompare(bookObj, chNum) {
    if (!bookObj || chNum == null || _transMode !== 'compare') return false;

    const _lccBookKey = bookObj.key || '';
    const _lccCh      = String(chNum);
    if (!_lccBookKey || !_lccCh) return false;

    const mainArea = document.getElementById('main-reading-area');
    if (!mainArea) return false;

    /* DOM 重複チェック */
    if (mainArea.querySelector(`.compare-chapter-block[data-book="${_lccBookKey}"][data-chapter="${_lccCh}"]`)) return false;

    /* 同時リクエスト防止 */
    const _lccKey = `${_lccBookKey}|${_lccCh}`;
    if (_comparePending.has(_lccKey)) return false;
    _comparePending.add(_lccKey);

    let _lccCcb = null;
    try {
        /* JA1955 翻訳データと Greek データを並列取得する */
        const _lccHasGreek  = GREEK_BOOKS.has(_lccBookKey);
        const _lccTestament = SB_BOOKS.nt.some(b => b.key === _lccBookKey) ? 'nt' : 'lxx';

        const [_lccJpDataA, _lccElDataRaw] = await Promise.all([
            _fetchTranslation(_transA, _lccBookKey, _lccCh),
            _lccHasGreek
                ? fetch(`../bible_data/${_lccTestament}/${_lccBookKey}/${_lccCh}.json`)
                    .then(r => r.ok ? r.json() : [])
                    .catch(() => [])
                : Promise.resolve([]),
        ]);

        /* JA1955 データ必須（WO は Greek 由来のため Greek 失敗でも継続可） */
        if (!_lccJpDataA || !_lccJpDataA.verses) return false;

        const _lccElData = Array.isArray(_lccElDataRaw) ? _lccElDataRaw : [];

        /* elByVerse 構築（render() と同じロジック） */
        const _lccElByVerse = {};
        _lccElData.forEach(w => {
            const v = _elTokenVerse(w);
            if (v) { if (!_lccElByVerse[v]) _lccElByVerse[v] = []; _lccElByVerse[v].push(w); }
        });
        const _lccHasGreekResolved = _lccHasGreek && _lccElData.length > 0;

        /* Greek → _buildFlowJpData() → WO jpData（verse 番号一覧として使用） */
        const _lccJpDataB = _buildFlowJpData(_lccElData);
        if (!_lccJpDataB || !_lccJpDataB.verses) return false;

        /* ColumnMode */
        const _lccColAMode = _toColumnMode(_transA);
        const _lccColBMode = _toColumnMode(_transB);
        const _lccColA     = { colMode: _lccColAMode, jpData: _lccJpDataA };
        const _lccColB     = { colMode: _lccColBMode, jpData: _lccJpDataB };

        /* .compare-chapter-block 生成（render() compare path と同一構造） */
        _lccCcb = document.createElement('div');
        _lccCcb.className       = 'compare-chapter-block';
        _lccCcb.dataset.book    = _lccBookKey;
        _lccCcb.dataset.chapter = _lccCh;
        const _lccHdr = document.createElement('div');
        _lccHdr.className   = 'compare-chapter-header';
        _lccHdr.setAttribute('aria-hidden', 'true');
        _lccHdr.textContent = '· · ·';
        _lccCcb.appendChild(_lccHdr);

        /* verse-pair 生成 */
        Object.entries(_lccJpDataA.verses).forEach(([vNum, text]) => {
            const block = _buildColumnBlock(
                0, _lccColA, _lccColB,
                vNum, text, _lccElByVerse,
                _lccHasGreekResolved, true,
                _lccCcb, bookObj, chNum
            );

            if (_lccHasGreekResolved && _lccColAMode.kind !== 'wordOrder') {
                block.onclick = () => {
                    _selectVerseBlocks(vNum, block, block.closest('.compare-chapter-block'));
                    AppState.toBrowsing(vNum, _lccElByVerse[vNum] || [], bookObj, chNum);
                    openVerseInspector(vNum, _lccElByVerse[vNum] || [], bookObj, chNum);
                    notifyAppStateChange();
                };
            }

            const pBlock = _buildColumnBlock(
                1, _lccColB, _lccColA,
                vNum, text, _lccElByVerse,
                _lccHasGreekResolved, true,
                _lccCcb, bookObj, chNum
            );

            /* Phase 3-7-E: WO 右列に Greek flow を inline 注入する。
               _setFlowInjection() は _cachedElByVerse（初期章のみ）を参照するため、
               autoload 章は loader 内で per-chapter データを使い直接注入する。 */
            if (_lccColBMode.kind === 'wordOrder' && _lccHasGreekResolved) {
                pBlock.classList.add('gf-mode');
                if (!pBlock.querySelector('.gf-verse-block')) {
                    const gfEl = document.createElement('div');
                    gfEl.className = 'gf-verse-block';
                    const _gfResult = _buildGfVerseBlock(vNum, _lccElByVerse[vNum] || [], _lccBookKey, chNum);
                    gfEl.innerHTML     = _gfResult.html;
                    gfEl._flowChips    = _gfResult.chips;
                    gfEl._flowWords    = _gfResult.words;
                    gfEl._flowResolved = _gfResult.analysis;
                    pBlock.appendChild(gfEl);
                }
            }

            const pairEl = document.createElement('div');
            pairEl.className = 'verse-pair';
            pairEl.appendChild(block);
            pairEl.appendChild(pBlock);
            _lccCcb.appendChild(pairEl);
        });

        /* 挿入直前に再度重複確認（fetch 中に DOM が変わった場合） */
        if (mainArea.querySelector(`.compare-chapter-block[data-book="${_lccBookKey}"][data-chapter="${_lccCh}"]`)) {
            _lccCcb = null;
            return false;
        }

        mainArea.appendChild(_lccCcb);
        _appendedChapterCache.set(`${_lccBookKey}|${_lccCh}`, _lccElByVerse); /* Greek evidence キャッシュ */

        /* Phase 3-7-D の ChapterFocusObserver に新規ブロックを登録する */
        if (_chapterObserver) { _chapterObserver.observe(_lccCcb); }

        _lccCcb = null;
        return true;

    } catch (_lccErr) {
        return false;
    } finally {
        _comparePending.delete(_lccKey);
    }
}

/* ══════════════════════════════════════════
   Phase 2A-5: Scroll-triggered Chapter Autoload
   ══════════════════════════════════════════ */
let _alObserver   = null;   /* Autoload 専用 IntersectionObserver */
let _alSentinel   = null;   /* 最終章末に配置する trigger 要素 */
let _alRunning    = false;  /* _doAutoload 実行中フラグ（二重起動防止） */
let _alRetryCount = 0;      /* 同一章の連続失敗カウンタ */
let _alCancelGen  = 0;      /* render() 中断を検知するための世代番号 */

/** Autoload を停止し関連リソースをすべて解放する。render() 経由でも呼ばれる。 */
function _stopAutoload() {
    _alCancelGen++;
    if (_alObserver) { _alObserver.disconnect(); _alObserver = null; }
    if (_alSentinel && _alSentinel.parentNode) { _alSentinel.parentNode.removeChild(_alSentinel); }
    _alSentinel = null;
    _alRunning  = false;
}

/**
 * sentinel を現在の最終章ブロック末尾に配置し Observer に登録する。
 * 最終章（bookObj.ch）に到達したら _stopAutoload() で停止する。
 * Phase 3-7-E: compare mode は #main-reading-area の .compare-chapter-block を対象にする。
 */
function _placeSentinel() {
    /* Phase 3-7-E: compare mode は mainArea > .compare-chapter-block、single mode は app > .chapter-block */
    const _psRoot     = _transMode === 'compare'
        ? document.getElementById('main-reading-area')
        : document.getElementById('bible-text-area');
    const _psSelector = _transMode === 'compare' ? '.compare-chapter-block' : '.chapter-block';
    if (!_psRoot || !_alObserver) return;
    const blocks = _psRoot.querySelectorAll(_psSelector);
    if (!blocks.length) return;
    const last    = blocks[blocks.length - 1];
    const bookKey = last.dataset.book || '';
    const chNum   = parseInt(last.dataset.chapter, 10);
    const bookObj = [...(SB_BOOKS.nt || []), ...(SB_BOOKS.ot || [])].find(b => b.key === bookKey);
    /* 最終章 or 書物不明 → これ以上ロード不要 */
    if (!bookObj || isNaN(chNum) || chNum >= bookObj.ch) { _stopAutoload(); return; }
    if (!_alSentinel) {
        _alSentinel = document.createElement('div');
        _alSentinel.className = 'chapter-load-sentinel';
    }
    /* sentinel を最終章末に移動（appendChild は既存の親から自動的に外す） */
    if (_alSentinel.parentNode !== last) { last.appendChild(_alSentinel); }
    /* Observer を最初の sentinel のみに絞り込む */
    _alObserver.disconnect();
    _alObserver.observe(_alSentinel);
}

/**
 * 次章を非同期ロードする。
 * _alRunning フラグ と _alCancelGen で二重起動・render() 中断を防ぐ。
 * 失敗 3 回連続で自動停止する。
 */
async function _doAutoload(bookObj, nextCh) {
    if (_alRunning) return;
    const _alColKind = _toColumnMode(_transA).kind;
    /* Phase 3-7-E: compare mode は専用 loader へ委譲。single mode は blocked mode チェック後に既存 loader を呼ぶ */
    if (_transMode !== 'compare' && _isAutoloadBlockedMode(_alColKind)) { _stopAutoload(); return; }
    _alRunning = true;
    const _myGen = _alCancelGen;
    try {
        const ok = _transMode === 'compare'
            ? await _loadAndAppendChapterCompare(bookObj, nextCh)
            : await _loadAndAppendChapter(bookObj, nextCh);

        /* render() が割り込んだ場合: stale DOM を除去して終了 */
        if (_alCancelGen !== _myGen) {
            if (ok) {
                if (_transMode === 'compare') {
                    const _ma = document.getElementById('main-reading-area');
                    if (_ma) {
                        const _stale = _ma.querySelector(`.compare-chapter-block[data-book="${bookObj.key}"][data-chapter="${String(nextCh)}"]`);
                        if (_stale) _stale.parentNode.removeChild(_stale);
                    }
                } else {
                    const _app = document.getElementById('bible-text-area');
                    if (_app) {
                        const _stale = _app.querySelector(`.chapter-block[data-book="${bookObj.key}"][data-chapter="${String(nextCh)}"]`);
                        if (_stale) _stale.parentNode.removeChild(_stale);
                    }
                }
            }
            return;
        }

        /* 成功 or 既にDOMにある → sentinel を次章末へ移動 */
        const _checkLoaded = () => {
            if (_transMode === 'compare') {
                const _ma = document.getElementById('main-reading-area');
                return !!(_ma && _ma.querySelector(`.compare-chapter-block[data-book="${bookObj.key}"][data-chapter="${String(nextCh)}"]`));
            }
            const _a = document.getElementById('bible-text-area');
            return !!(_a && _a.querySelector(`.chapter-block[data-book="${bookObj.key}"][data-chapter="${String(nextCh)}"]`));
        };
        const _loaded = ok || _checkLoaded();
        if (_loaded) {
            _alRetryCount = 0;
            _placeSentinel();
        } else {
            _alRetryCount++;
            if (_alRetryCount >= 3) { _stopAutoload(); } /* 3連続失敗で停止 */
        }
    } finally {
        _alRunning = false;
    }
}

/**
 * Autoload Observer を初期化する。
 * render() 末尾で _setupChapterObserver() と共に呼ぶ（single-mode のみ）。
 * rootMargin '0px 0px 300px 0px': 章末が viewport 下端から 300px 以内に入ったら fire。
 */
function _setupAutoload() {
    _stopAutoload();
    const _alColKind = _toColumnMode(_transA).kind;
    /* Phase 3-7-E: compare mode は _loadAndAppendChapterCompare を使う。blocked mode（discourse 等）は single/compare とも無効 */
    if (_isAutoloadBlockedMode(_alColKind)) return;
    const container = document.getElementById('main-reading-area');
    if (!container || typeof IntersectionObserver === 'undefined') return;
    _alObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting || !entry.target.parentElement) return;
            const parent  = entry.target.parentElement;
            const bookKey = parent.dataset.book || '';
            const chNum   = parseInt(parent.dataset.chapter, 10);
            const bookObj = [...(SB_BOOKS.nt || []), ...(SB_BOOKS.ot || [])].find(b => b.key === bookKey);
            if (!bookObj || isNaN(chNum)) return;
            const nextCh = chNum + 1;
            if (nextCh > bookObj.ch) { _stopAutoload(); return; }
            _doAutoload(bookObj, nextCh);
        });
    }, { root: container, rootMargin: '0px 0px 300px 0px', threshold: 0 });
    _placeSentinel();
}

/**
 * openVerseInspector — 節タップの単一入口（Adapter Layer）。
 *
 * 責務: 「節タップ後に適切な表示方式へ振り分ける」こと。
 * 節タップは必ずこの関数を経由し、以降の分岐（Desktop / Mobile）はここに閉じ込める。
 *
 * 振り分け:
 *   Desktop → openWordListInStudyPanel()（従来どおり）
 *   Mobile  → openMobileVerseView()（Phase A-2 で追加した器。中身は placeholder）
 *
 * モバイル判定は既存の _isMobile()（innerWidth <= 900）をそのまま使う。
 * 新しい判定方式は作らない。
 */
