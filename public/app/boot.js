/* 初回ロード画面（スプラッシュ）の最低表示つき終了処理。
   読み込み自体は並行して進み、オーバーレイの解除だけを
   表示開始から約1秒までは待つ（過ぎていれば待たない）。
   終了時はフェードアウト用の done を付けてから外す。 */
let _splashStartedAt = 0;
function _finishFirstLoadSplash() {
    if (!document.body.classList.contains('app-first-load')) return;
    const MIN_MS = 1000;
    const wait = Math.max(0, MIN_MS - (performance.now() - _splashStartedAt));
    setTimeout(() => {
        document.body.classList.add('app-first-load-done');
        setTimeout(() => {
            document.body.classList.remove('app-first-load');
            document.body.classList.remove('app-first-load-done');
        }, 420);
    }, wait);
}

async function init() {
    /* 初回ロード画面（スマホ）用マーカー: 本文の表示直前に
       _finishFirstLoadSplash() が最低表示を経て外す */
    _splashStartedAt = performance.now();
    document.body.classList.add('app-first-load');
    /* URL Import: ?import= があれば book/ch/verse へ変換し、通常のURL形式へ
       書き換えてから以降の初期化（Router.parse 以降）へ引き継ぐ。 */
    _applyUrlImportIfPresent();
    /* 今回のimportに関わらず、セッション中に保存済みのsourceUrlがあればボタンを出す
       （importが起きたその場のロードだけでなく、以降のチャプター送り等でも表示し続けるため
       _applyUrlImportIfPresent() の成否とは切り離して毎回呼ぶ）。 */
    _syncUrlImportSourceButton();

    /* アイコンレジストリから data-icon 要素へSVGを挿入する（☆🔗📝☰ 等の絵文字置き換え） */
    _renderStaticIcons();
    /* Reading Hint v1（加算表示・非ブロッキング・失敗許容） */
    _loadReadingHints();

    /* onboarding未完了なら、render/applyShareState/onPageRendered実行前に
       フラグを立てておく（onboarding.js の自動デモによるURL書き換えを防ぐ） */
    _syncOnboardingActiveFlag();

    const urlParams = Router.parse();
    const book = urlParams.book || 'ROM';
    const ch   = urlParams.chapter || '1';

    if (urlParams.transA) _transA = normalizeModeId(urlParams.transA);
    /* 基底訳スロットは UI 言語に従う（D1）: 言語切替は同じ URL で再読込されるため、
       他言語の基底訳（JA1955/WEB）が URL に残っていると既定値を上書きしてしまう。
       スロットの値であれば現在の UI 言語の基底訳へ付け替える（比較相手 _transB は対象外）。 */
    const _baseForLang = (window.I18N && I18N.lang === 'en') ? 'WEB' : 'JA1955';
    if ((_transA === 'JA1955' || _transA === 'WEB') && _transA !== _baseForLang) _transA = _baseForLang;
    /* Legacy ?view=hierarchical → STRUCTURE は 2026-10-28 の整理で削除済みのため WORD_ORDER に着地させる。 */
    if (!urlParams.transA && _hdgInitViewParam === 'hierarchical') _transA = 'WORD_ORDER';
    if (urlParams.mode) {
        _transMode = urlParams.mode;
    }
    if (_transMode === 'compare' && urlParams.transB) {
        _transB = normalizeModeId(urlParams.transB);
    }
    _applyTransMode(_transMode);
    
    const isNt = SB_BOOKS.nt.some(b => b.key === book);

    const allBooks = [...SB_BOOKS.nt, ...SB_BOOKS.ot];
    const found = allBooks.find(b => b.key === book);
    const chNum = parseInt(ch);

    /* AppState.location を設定 */
    AppState.location.testament = isNt ? 'nt' : 'ot';
    AppState.location.book      = found || null;
    AppState.location.chapter   = chNum;

    /* ヘッダー/パンくず/サイドバー選択状態は AppState.ui.view から一括同期する */
    AppState.ui.view = 'bible';
    syncUIFromState();

    syncUrlState();

    sbInitState(book, chNum);

    /* Abbott-Smith辞書は本文描画のクリティカルパスから外す。
       本文を先に表示し、初回描画後に辞書を取得・解析する。 */

    const hasGreek = GREEK_BOOKS.has(book);

    try {
        /* VR-4-C Step 2: _transA/_transB === 'FLOW' という文字列比較を ColumnMode.kind へ
           置換する（_transA/_transB 自体は state として維持。_toColumnMode() は Step 1 参照）。 */
        const _colA = _toColumnMode(_transA);
        const _colB = _toColumnMode(_transB);

        /* ColumnMode が wordOrder / discourse（Greek由来・訳文なし）の場合は翻訳JSONをfetchしない */
        const jpData = _isGreekReadingMode(_colA.kind)
            ? null
            : await _fetchTranslation(_transA, book, ch);
        if (!_isGreekReadingMode(_colA.kind) && !jpData) throw new Error(`bible_jp not found: ${book}/${ch}`);

        let jpDataB = null;
        if (_transMode === 'compare' && !_isGreekReadingMode(_colB.kind)) {
            jpDataB = await _fetchTranslation(_transB, book, ch);
        }

        let elData = [];
        if (hasGreek) {
            try {
                const testament = SB_BOOKS.nt.some(b => b.key === book) ? 'nt' : 'lxx';
                const elRes = await fetch(`../bible_data/${testament}/${book}/${ch}.json`);
                if (elRes.ok) {
                    elData = await elRes.json();
                } else {
                    console.warn(`bible_data not found for ${book}/${ch} - Greek panel disabled`);
                }
            } catch (e) {
                console.warn(`bible_data fetch error for ${book}/${ch}:`, e);
            }
        }

        /* 口語訳アラインメント（パイロット）: 対応表とトークン索引を render() の前に先読みする。
           対応表が無い翻訳・書・章では null のまま（従来表示）。 */
        if (!_isGreekReadingMode(_colA.kind)) await _loadJaAlignForRender(_transA, book, ch);
        if (_transMode === 'compare' && !_isGreekReadingMode(_colB.kind)) await _loadJaAlignForRender(_transB, book, ch);
        /* Phase 1b Step 3: 英語UIでは WEB グロスも先読みする（日本語UIでは no-op）。 */
        await _loadGlossForRender(book, ch);
        await _loadAlignForRender(book, ch);
        if (elData && elData.length) _jaSegIndexTokens(book, ch, elData);

        /* DA-1: discourse は flow-tree（clause/sentence 構造）を先読みして render() へ渡す。 */
        _dcvChapterTreeForRender = (_colA.kind === 'discourse')
            ? await _loadFlowTreeChapter(book, ch) : null;
        /* P2: structural-diagram は SR 章データを先読みして render() へ渡す。E-4-D: relation も同一SR JSONを使用。
           B列が passage-level の場合も同じ SR JSON を使用するため、_colB.kind も対象に含める。
           Phase E: rk-reading も同一 SR JSON を使用する。 */
        _sdChapterDataForRender = (
            _colA.kind === 'structural-diagram' || _colA.kind === 'hierarchical' || _colA.kind === 'relation' || _colA.kind === 'da-reading' || _colA.kind === 'rk-reading' || _colA.kind === 'rk-reading-v' || _colA.kind === 'rk-reading-p' || _colA.kind === 'role-reading' /* C-17 Phase 1 / E-4-D / Phase E / L.2 / M */
            || _colB.kind === 'structural-diagram' || _colB.kind === 'hierarchical' || _colB.kind === 'relation' || _colB.kind === 'da-reading' || _colB.kind === 'rk-reading' || _colB.kind === 'rk-reading-v' || _colB.kind === 'rk-reading-p' || _colB.kind === 'role-reading' /* B列 passage-level */
        ) ? await _loadSrChapter(book, ch) : null;


        /* VR-5-D: resolvedJpData 決定ロジックを _getVerseSource() へ抽出（VR-5-C 参照） */
        const resolvedJpData = _getVerseSource(_colA, jpData, elData);
        if (!resolvedJpData) throw new Error(`bible_jp not found: ${book}/${ch}`);

        /* VR-5-E-1: render() 入口を columns[] ベースへ移行（columns[i] = { colMode, jpData }） */
        const columns = [
            { colMode: _colA, jpData: resolvedJpData },
            { colMode: _colB, jpData: jpDataB },
        ];
        render(columns, elData, hasGreek && elData.length > 0);
        _applyHighlights(); /* BUG-1: 初回ロード時、Storage準備済みで再適用 */
        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.getElementById('bible-text-area').style.opacity = '1';
            /* 本文が見えるタイミングで初回ロード画面を終える（最低表示つき） */
            _finishFirstLoadSplash();
            /* 辞書取得・TSV解析による本文表示の遅延を避け、初回描画後に開始する。 */
            loadDict();
        }));

        /* 冒頭の urlParams を再利用する（syncUrlState() が既に history を
           verse/panel/word なしの状態に書き換えているため、ここで
           Router.parse() を再実行すると消えてしまう） */
        applyShareState(urlParams);

            if (window.App.onboarding && !window.App.onboarding.getState().onboardingComplete) {
                document.querySelectorAll('[data-onboarding-anchor="true"]').forEach(function(el) {
                    el.removeAttribute('data-onboarding-anchor');
                });
                const ANCHOR_WORDS = ['γάρ', 'ἠγάπησεν', 'οὕτως'];
                let anchorEl = null;
                for (var aw = 0; aw < ANCHOR_WORDS.length; aw++) {
                    anchorEl = document.querySelector('.wlv-chip[data-greek="' + ANCHOR_WORDS[aw] + '"], .word-card[data-greek="' + ANCHOR_WORDS[aw] + '"]');
                    if (anchorEl) break;
                }
                if (!anchorEl) anchorEl = document.querySelector('.verse-block, .verse-pair-left');
                if (anchorEl) anchorEl.setAttribute('data-onboarding-anchor', 'true');
                window.App.onboarding.onPageRendered();
                _syncOnboardingActiveFlag();
        }

    } catch (err) {
        console.error(err);
        const errArea = document.getElementById('bible-text-area');
        errArea.innerHTML = `<p style="color:red">データが見つかりません（${_escH(book)} ${_escH(ch)}章）</p>`;
        _finishFirstLoadSplash();
        requestAnimationFrame(() => requestAnimationFrame(() => { errArea.style.opacity = '1'; }));
    }
}


/* Phase 2A: in-flight guard — 同一章への同時リクエストで重複追加しない */
/* ══════════════════════════════════════════
   モバイル：スワイプジェスチャー（右スワイプで戻る）
   Study Panel 上の端からスワイプすると本文に戻れる
   ══════════════════════════════════════════ */
function _mobileSwipeBack() {
    panelGoBack();
}
    
(function _initSwipeBack() {
    let touchStartX = 0;
    let touchStartY = 0;
    let isDragging  = false;
    const EDGE_THRESHOLD = 32;  /* 画面左端から何pxのスワイプを検知するか */
    const SWIPE_THRESHOLD = 80; /* 何px右にスワイプしたら戻るとみなすか */

    const panel = document.getElementById('bottom-depth-panel');
    if (!panel) return;

    panel.addEventListener('touchstart', (e) => {
        if (window.innerWidth > 900) return;
        if (!panel.classList.contains('open')) return;

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        /* isDragging はまだ確定しない。touchmove で方向確認後に決める */
        isDragging  = touchStartX < EDGE_THRESHOLD ? null : false;
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
        if (window.innerWidth > 900) return;
        if (isDragging === false) return;

        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;

        /* isDragging が未確定（null）の場合：最初の8px移動で方向を判定 */
        if (isDragging === null) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; /* まだ判定しない */
            /* 縦スクロールが主体 or 左スワイプ → 無効化 */
            if (Math.abs(dy) > Math.abs(dx) * 1.2 || dx < 0) {
                isDragging = false;
                return;
            }
            /* 右スワイプ確定 */
            isDragging = true;
        }

        /* 縦スクロールが主体なら無視 */
        if (Math.abs(dy) > Math.abs(dx) * 1.5) {
            isDragging = false;
            panel.style.transform = '';
            const mainArea = document.getElementById('main-reading-area');
            if (mainArea) { mainArea.style.transform = ''; mainArea.style.opacity = ''; }
            return;
        }

        if (dx > 0) {
            /* パネルを指の動きに追従（rubber band感） */
            panel.style.transition = 'none';
            panel.style.transform  = `translateX(${Math.min(dx, window.innerWidth)}px)`;
            /* 本文を逆方向に少し動かして奥行き感を出す */
            const mainArea = document.getElementById('main-reading-area');
            if (mainArea) {
                const ratio = dx / window.innerWidth;
                const offsetX = -24 + (24 * ratio);
                const opacityVal = 0.6 + (0.4 * ratio);
                mainArea.style.transition = 'none';
                mainArea.style.transform  = `translateX(${offsetX}px)`;
                mainArea.style.opacity    = opacityVal;
            }
        }
    }, { passive: true });

    panel.addEventListener('touchend', (e) => {
        if (window.innerWidth > 900) return;
        const wasTracking = isDragging === true || isDragging === null;
        isDragging = false;

        /* transform が動いていない場合は何もしない */
        if (!wasTracking) return;

        const dx = e.changedTouches[0].clientX - touchStartX;

        /* トランジションを戻す */
        panel.style.transition = '';
        const mainArea = document.getElementById('main-reading-area');
        if (mainArea) mainArea.style.transition = '';

        if (dx > SWIPE_THRESHOLD && panel.classList.contains('open')) {
            /* 閾値を超えた → 戻る */
            _mobileSwipeBack();
        } else {
            /* 閾値未満 or パネル未open → 元に戻す */
            panel.style.transform = '';
            if (mainArea) {
                mainArea.style.transform = '';
                mainArea.style.opacity   = '';
            }
        }
    }, { passive: true });
})();

    /* ── オンボーディング初期化 ── */
    /* ── オンボーディング用ブリッジ ──────────────────────────
       onboarding.js は 'use strict' IIFE のため index.html の
       let 変数に直接アクセスできない。window 経由で公開する。
    ─────────────────────────────────────────────────── */
    /* ── STEP8: App Namespace 初期化 ── */
    window.App = window.App || {};

    window.App.bridge = {
    activateFlowCompare: async function() {
        _transB = 'WORD_ORDER';
        _applyTransMode('compare');
        await renderCurrentPage();
        _setFlowInjection('flow');
    },
    activateCompare: async function(transBId) {
        _transB = transBId || 'BUN';
        _applyTransMode('compare');
        await renderCurrentPage();
    },
    openFlowTab: async function() {
        /* モバイル：StudyPanelを閉じてFLOWモードで本文を再描画 */
        if (_isMobile()) {
            closeStudyPanel();
        }
        _transA = 'WORD_ORDER';
        _applyTransMode('single');
        await renderCurrentPage();
        if (window.App.onboarding && typeof window.App.onboarding.onFlowTabOpened === 'function') {
            window.App.onboarding.onFlowTabOpened();
        }
        _syncOnboardingActiveFlag();
    },
    closeStudyPanel: function() {
        closeStudyPanel();
    },
    /* 読み取り専用ブリッジ: AppState の公開が必要な値のみ返す */
    getAppState: function() {
        return {
            mode:          AppState.mode,
            selectedVerse: { vNum: AppState.selectedVerse.vNum },
            location:      { book: AppState.location.book },
        };
    },
    };

    /* 互換エイリアス（既存参照を壊さない） */
    window.AppBridge = window.App.bridge;

    document.addEventListener('DOMContentLoaded', function () {
        if (window.App.onboarding) window.App.onboarding.init();
        _syncOnboardingActiveFlag();
        init();
        _ensureSemanticData().catch(function(){});

        /* 語源要素タップ → Abbott-Smith ポップアップ（イベントデリゲーション） */
        document.addEventListener('click', function(e) {
            const part = e.target.closest('.rn-etym-part');
            if (!part) return;
            _openEtymPopup(part.dataset.lexemeId);
        });

        /* 辞書本文の聖書参照タップ → 本文へ直行せず参照ポップアップを挟む（イベントデリゲーション） */
        document.addEventListener('click', function(e) {
            const a = e.target.closest && e.target.closest('.rn-inline-bible-ref');
            if (!a) return;
            const href = a.getAttribute('href') || '';
            const m = href.match(/^\/([A-Z0-9]+)\/(\d+)\/(\d+)/);
            if (!m) return;
            e.preventDefault();
            _openRefPopup(m[1], Number(m[2]), Number(m[3]), href);
        });

        /* ESC キーで語源ポップアップを閉じる */
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.getElementById('rn-etym-backdrop')?.classList.remove('open');
                document.getElementById('rn-ref-backdrop')?.classList.remove('open');
            }
        });
    });

/* ══════════════════════════════════════════
   Phase 5-2-C: RK Horizontal Scroll UX
   ══════════════════════════════════════════
   Display-layer only. Reads DOM measurements (scrollWidth, clientWidth, scrollLeft).
   Does NOT calculate or modify GL width, SVG width, viewBox, or any geometry.
   Boundary: Geometry → SVG → DOM → [this code starts here].
   ══════════════════════════════════════════ */
(function () {
    var _rafs = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
    var STEP  = 80; /* px per keyboard arrow press */

    /* ── State updater ─────────────────────────────────────────────────────
       Reads live scrollWidth / clientWidth / scrollLeft from DOM.
       Sets data-role-scroll="right|left|both" when overflow exists.
       Adds tabindex="0" + aria-label on first overflow detection.
       Removes all attributes when no overflow. */
    function _update(el) {
        var sw = el.scrollWidth;
        var cw = el.clientWidth;
        if (sw <= cw + 1) {
            /* No overflow: remove all scroll-UX attributes. */
            el.removeAttribute('data-role-scroll');
            el.removeAttribute('tabindex');
            el.removeAttribute('aria-label');
            return;
        }
        /* Overflow present: classify scroll position. */
        var sl     = Math.round(el.scrollLeft);
        var atLeft = sl <= 1;
        var atRight = sl + cw >= sw - 2;
        el.setAttribute('data-role-scroll',
            atLeft && !atRight ? 'right'
            : !atLeft && atRight ? 'left'
            : 'both');
        /* tabindex / aria-label: set once, not on every scroll event. */
        if (!el.getAttribute('tabindex')) {
            el.setAttribute('tabindex', '0');
            var svg  = el.querySelector('svg[aria-label]');
            var base = svg ? svg.getAttribute('aria-label')
                           : '文の役割 構造ダイアグラム';
            el.setAttribute('aria-label', base + '（横スクロール可）');
        }
    }

    /* ── rAF-throttled scroll handler ─────────────────────────────────── */
    function _onScroll(el) {
        if (!_rafs) { _update(el); return; }
        var id = _rafs.get(el);
        if (id) cancelAnimationFrame(id);
        _rafs.set(el, requestAnimationFrame(function () {
            _rafs.delete(el);
            _update(el);
        }));
    }

    /* ── ResizeObserver: handles panel open/close and window resize ────── */
    var _ro = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(function (entries) {
            entries.forEach(function (e) { _update(e.target); });
          })
        : null;

    /* ── Attach scroll UX to one .role-view element ────────────────────── */
    function attach(el) {
        /* Defer to next paint: scrollWidth may not be settled on insertion. */
        requestAnimationFrame(function () {
            _update(el);
            el.addEventListener('scroll', function () { _onScroll(el); },
                                { passive: true });
            if (_ro) _ro.observe(el);
        });
    }

    /* ── Keyboard handler (global delegated) ───────────────────────────── */
    document.addEventListener('keydown', function (e) {
        var el = document.activeElement;
        /* Only act when a scrollable .role-view has keyboard focus. */
        if (!el || !el.classList || !el.classList.contains('role-view')) return;
        if (!el.getAttribute('data-role-scroll')) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            el.scrollBy({ left:  STEP, behavior: 'smooth' });
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            el.scrollBy({ left: -STEP, behavior: 'smooth' });
        } else if (e.key === 'Home') {
            e.preventDefault();
            el.scrollTo({ left: 0,            behavior: 'smooth' });
        } else if (e.key === 'End') {
            e.preventDefault();
            el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
        }
    });

    /* ── window resize fallback (for browsers without ResizeObserver) ──── */
    window.addEventListener('resize', function () {
        /* Re-evaluate ALL .role-view elements: a resize may introduce or
           remove overflow on any diagram regardless of current state. */
        document.querySelectorAll('.role-view').forEach(_update);
    }, { passive: true });

    /* ── Public API ────────────────────────────────────────────────────── */
    window._roleScrollUX = { attach: attach };
})();
/* ── Phase 5-2-C end ─────────────────────────────────────────────────────── */

/* ══════════════════════════════════════════════════════════════
   MN: Mobile Navigation
   ══════════════════════════════════════════════════════════════ */

/* ヘッダーの現在地ラベルを AppState.location に基づいて更新する。
   既存 _bibleHeaderLabel() を直接利用し、実装を重複させない。 */
