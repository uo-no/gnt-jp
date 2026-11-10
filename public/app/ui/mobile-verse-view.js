function openVerseInspector(vNum, words, book, ch) {
    if (_isActualMobile()) {
        return openMobileVerseView(vNum, words, book, ch);
    }
    return openWordListInStudyPanel(vNum, words, book, ch);
}

/**
 * openMobileVerseView — モバイル専用 Verse Inspector の器（Phase A-2 / B）。
 *
 * Phase B: 上半分 #mobile-verse-area にタップした節の本文を表示する。
 * 下半分 #mobile-inspector-area は placeholder のまま（次 Phase）。
 * 既存 StudyPanel / Bottom Sheet には一切触れない。
 */
/* ── MobileVerseView 内部の階層状態（Phase C-4） ──
   AppState / depth stack / panelGoBack とは独立した、MobileVerseView 専用の UI 状態。
   'list'   = Level2（語順フロー・単語一覧）
   'detail' = Level3（単語詳細）
   戻るボタンはこの値だけを見て「詳細→一覧」か「一覧→クローズ」かを決める。 */
let _mobileVerseInspectorMode = 'list';
/* 一覧へ戻す際の再描画に必要な現在節のコンテキスト（AppState には持たせない）。 */
let _mvvVNum    = null;
let _mvvWords   = [];
/* 描画時コンテキスト: タップされた節が属する book オブジェクト・chapter（AppState.location に持たせない）。 */
let _mvvBook    = null;
let _mvvChapter = null;
/* E-1B: Level2→Level3→戻る で復元する #mobile-inspector-area のスクロール位置。 */
let _mvvInspectorScrollTop = 0;
/* Level3 の innerHTML 再描画で失われないよう、口語訳 DOM を階層間で保持する。 */
let _mvvTranslationNode = null;
/* E-1C: MVV が積んだ history エントリの管理フラグ（AppState / URL は変更しない）。 */
let _mvvHistoryActive = false;
let _mvvIgnoreNextPop = false;

function openMobileVerseView(vNum, words, book, ch) {
    closeMobileSidebar();
    const view = document.getElementById('mobile-verse-view');
    if (!view) return;
    view.classList.add('open');
    _syncStudyVerseNav();
    /* MN: MobileVerseView 全画面中は Bottom Nav を隠す */
    document.getElementById('app')?.classList.add('mobile-mvv-open');
    /* E-1C: Android/ブラウザの戻るで MVV を閉じられるよう履歴エントリを1つ積む（URL は不変）。 */
    _mvvPushHistory();
    /* 内部状態を初期化: 節を開いた直後は必ず Level2（一覧）。戻り再描画用に節情報も保持。
       book / ch は描画時コンテキスト（明示引数）を優先し、省略時は AppState.location にフォールバック。 */
    _mvvVNum    = vNum;
    _mvvWords   = words || [];
    _mvvBook    = book    != null ? book    : (AppState.location.book    || null);
    _mvvChapter = ch      != null ? ch      : (AppState.location.chapter != null ? AppState.location.chapter : null);
    _mvvInspectorScrollTop = 0;   /* E-1B: 新しい節を開いたら復元位置はリセット */
    _mobileVerseInspectorMode = 'list';
    /* 上半分に節本文を描画（DOM取得は同期・FLOW時のfetchは非同期のため fire-and-forget）。
       下半分の Inspector（Level2）描画も _renderMobileVerseArea 内から続けて呼ぶ。 */
    _renderMobileVerseArea(vNum, words);
    return view;
}

/**
 * _mobileVerseViewBack — MobileVerseView の戻るボタン（#mobile-verse-view-back）専用ハンドラ。
 *
 * detail（Level3・単語詳細）→ list（Level2・語形一覧）へ戻す。
 * list（Level2）→ MobileVerseView 自体を閉じる。
 * AppState の depth stack / panelGoBack は使わない（MobileVerseView 内部で完結）。
 */
function _mobileVerseViewBack() {
    if (_mobileVerseInspectorMode === 'detail') {
        /* Level3 → Level2: 保持しておいた節コンテキストで一覧を再描画 */
        _mobileInspectorRender(_mvvVNum, _mvvWords);
        _mobileVerseInspectorMode = 'list';
        /* E-1B: Level3 へ入る前の Level2 スクロール位置を復元（描画後の 1 フレームで適用） */
        const area = document.getElementById('mobile-inspector-area');
        if (area) {
            const y = _mvvInspectorScrollTop;
            requestAnimationFrame(function () { area.scrollTop = y; });
        }
        return;
    }
    /* Level2 → クローズ */
    closeMobileVerseView();
}

/* ── E-1C: MobileVerseView の履歴連携（Android/ブラウザ戻る対応。URL・AppState は不変） ── */
function _mvvPushHistory() {
    if (_mvvHistoryActive) return;
    _mvvHistoryActive = true;
    /* URL は変えず（第3引数省略）、state マーカーのみのエントリを積む。失敗しても致命でない。 */
    try { history.pushState({ __mvv: true }, ''); } catch (_) {}
}

/* DOM を閉じるだけの内部処理（履歴操作を伴わない）。popstate と UI 戻るの共通処理。 */
function _doCloseMobileVerseView() {
    const view = document.getElementById('mobile-verse-view');
    if (view) view.classList.remove('open');
    /* MN: Bottom Nav を復元 */
    document.getElementById('app')?.classList.remove('mobile-mvv-open');
    _closeMvvActionMenu();   /* Phase G-1: MVV クローズ時はアクションメニューも閉じる */
    /* 次回 open 時は openMobileVerseView が 'list' を再設定するが、閉じた時点でも
       内部状態を list に戻しておく（状態リセットの明示・防御的ハイジーン）。 */
    _mobileVerseInspectorMode = 'list';
    /* MVV 閉じ時に StudyPanel が裏で開いていた場合も閉じて Layer 1 に確実に戻す。
       通常フローでは StudyPanel と MVV は共存しないが、URL 共有・ページ遷移・
       リサイズなど想定外の経路で StudyPanel が open になっている可能性がある。
       これ以外に closeStudyPanel() を呼ぶ必要はない（意図しない閉鎖禁止）。 */
    const _sp = document.getElementById('bottom-depth-panel');
    if (_sp && _sp.classList.contains('open')) closeStudyPanel();
}

/* ── Phase G-1: MobileVerseView アクションメニュー（ハイライト / 共有） ──
   バーを静かに保つため、アクションは ⋮ メニューへ集約。既存関数を呼ぶだけで、
   _hlVerseHighlight / copyShareUrl / storage / AppState / URL は一切変更しない。 */
function _mvvOutsideCloseActionMenu(e) {
    const menu = document.getElementById('mobile-verse-action-menu');
    const btn  = document.getElementById('mobile-verse-view-action');
    if (menu && (menu.contains(e.target) || (btn && btn.contains(e.target)))) return;
    _closeMvvActionMenu();
}

function _closeMvvActionMenu() {
    const menu = document.getElementById('mobile-verse-action-menu');
    if (menu) menu.classList.remove('open');
    const btn = document.getElementById('mobile-verse-view-action');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _mvvOutsideCloseActionMenu);
}

function _toggleMvvActionMenu(e) {
    if (e) e.stopPropagation();   /* 開くクリックが直後の outside-close に拾われないように */
    const menu = document.getElementById('mobile-verse-action-menu');
    if (!menu) return;
    if (menu.classList.contains('open')) { _closeMvvActionMenu(); return; }

    menu.classList.add('open');
    const btn = document.getElementById('mobile-verse-view-action');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    /* 外側タップで閉じる（開いた後に登録） */
    document.addEventListener('click', _mvvOutsideCloseActionMenu);
}

/* メニュー項目 → 既存機能へ委譲（メニューは先に閉じる）。 */
function _mvvMenuAction(kind) {
    _closeMvvActionMenu();
    if (kind === 'highlight') _hlVerseHighlight();
    else if (kind === 'share') copyShareUrl();
}

/* Android/ブラウザの戻る操作。MVV → Book picker → Mode picker の順で閉じる。 */
window.addEventListener('popstate', function (e) {
    /* ① 既存: MVV IgnorePop（UI 戻るが誘発した pop は無視） */
    if (_mvvIgnoreNextPop) { _mvvIgnoreNextPop = false; return; }
    /* ② 既存: MVV close（MVV 由来を最優先） */
    if (_mvvHistoryActive) { _mvvHistoryActive = false; _doCloseMobileVerseView(); return; }
    /* ③ MN: Book picker close */
    if (_mbpIgnoreNextPop) { _mbpIgnoreNextPop = false; return; }
    if (_mbpHistoryActive) { _mbpHistoryActive = false; _closeMobileBookPickerDOM(); return; }
    /* ④ MN: Mode picker close */
    if (_mmpIgnoreNextPop) { _mmpIgnoreNextPop = false; return; }
    if (_mmpHistoryActive) { _mmpHistoryActive = false; _closeMobileModePicker(); return; }

    /* 通常の章移動でブラウザの戻る／進むが発生した場合、URL と本文を同期する。 */
    const route = Router.parse();
    const routeBook = route.book || 'ROM';
    const routeChapter = parseInt(route.chapter || '1', 10);
    if (AppState.location.book?.key !== routeBook || AppState.location.chapter !== routeChapter) {
        renderCurrentPage();
    }
});

/* ── E-1A: MobileVerseView 限定のキーボード回避（visualViewport）。desktop / StudyPanel 非影響。 ── */
(function _setupMvvKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return;
    let active = false;
    function apply() {
        const view = document.getElementById('mobile-verse-view');
        if (!view) return;
        if (!active) { view.style.paddingBottom = ''; return; }
        /* キーボード高さ ≒ レイアウトビューポート − ビジュアルビューポート（下端）。 */
        const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        view.style.paddingBottom = kb > 0 ? (kb + 'px') : '';
    }
    document.addEventListener('focusin', function (e) {
        const t = e.target;
        if (!t || t.tagName !== 'TEXTAREA' || !t.closest || !t.closest('#mobile-verse-view')) return;
        active = true;
        vv.addEventListener('resize', apply);
        vv.addEventListener('scroll', apply);
        apply();
        setTimeout(function () { try { t.scrollIntoView({ block: 'center' }); } catch (_) {} }, 100);
    });
    document.addEventListener('focusout', function (e) {
        const t = e.target;
        if (!t || t.tagName !== 'TEXTAREA' || !t.closest || !t.closest('#mobile-verse-view')) return;
        active = false;
        vv.removeEventListener('resize', apply);
        vv.removeEventListener('scroll', apply);
        apply();   /* paddingBottom を '' に戻し、CSS の env(safe-area) を復帰 */
    });
})();

/**
 * _syncMobileVerseViewBackLabel — 戻るボタンのラベルを内部状態に合わせて更新する（Phase C-5）。
 *   detail（Level3）: 「一覧」へ戻る
 *   list（Level2）  : 「読書に戻る」（＝閉じる）
 * 表示改善のみ。挙動は _mobileVerseViewBack() が担う。
 */
function _syncMobileVerseViewBackLabel() {
    const btn = document.getElementById('mobile-verse-view-back');
    if (!btn) return;
    const isDetail = _mobileVerseInspectorMode === 'detail';
    const label = isDetail ? _T('mvv.backLabel.list', '一覧') : _T('mvv.backLabel.read', '読書に戻る');
    btn.innerHTML =
        `<span aria-hidden="true">‹</span>` +
        `<span style="margin-left:4px;font-size:var(--text-body);">${_escH(label)}</span>`;
    btn.setAttribute('aria-label', isDetail ? _T('mvv.backAriaLabel.list', '一覧に戻る') : _T('mvv.backAriaLabel.read', '読書に戻る'));
}

/**
 * _mvvDisplayTrans — MobileVerseView で表示する翻訳を決定する唯一の責務。
 *
 * 「現在ユーザーが読んでいるモード（_transA）から、MobileVerseView で
 *  表示する翻訳 ID を決める」。ルール:
 *    JA1955 → JA1955
 *    BUN    → BUN
 *    Greek 由来モード（語順・構造・役割・ギリシャ語本文）→ UI 言語の基準訳
 *      （英語 UI では WEB、日本語 UI では口語訳。PC パネルの
 *       _fillStudyPanelTranslation と同じ規則＝D1 の適用）
 * それ以外の翻訳が来た場合も _transA をそのまま返す（将来の翻訳追加に追随）。
 */
function _mvvDisplayTrans() {
    /* DA-1: discourse も FLOW と同様、訳文が無いので基準訳へフォールバックする。 */
    return _isGreekReadingMode(_toColumnMode(_transA).kind)
        ? ((window.I18N && I18N.lang === 'en') ? 'WEB' : (window.I18N && I18N.lang === 'es') ? 'RVR1909' : 'JA1955')
        : _transA;
}

/**
 * _mvvGetVerseText — 表示すべき節本文（プレーンテキスト）を取得する。
 *
 * 優先順位:
 *   1) FLOW 以外（_transA が実際の訳文）: 現在表示中の DOM（左節ブロックの
 *      .jp-text）からそのまま読む。追加 fetch を避ける。
 *   2) FLOW（DOM に訳文が無い）または DOM 取得不可: 既存の翻訳データ取得経路
 *      _fetchTranslation() で _mvvDisplayTrans()（基準訳）を読む。
 */
async function _mvvGetVerseText(vNum) {
    if (!_isGreekReadingMode(_toColumnMode(_transA).kind)) {   /* DA-1: discourse も FLOW と同様 DOM に訳文が無い */
        /* Phase 3-6-I A': _mvvChapter が確定している場合は対象章スコープで探す。
           章スコープで見つからない場合は fallback しない（別章の同番号verse取得を防ぐ）。 */
        const _mvgBookObj = _mvvBook || AppState.location.book;
        const _mvgBookKey = _mvgBookObj ? _mvgBookObj.key : '';
        const _mvgChStr   = _mvvChapter != null ? String(_mvvChapter) : null;
        const block = (_mvgBookKey && _mvgChStr)
            ? _findVerseInChapter(_mvgBookKey, _mvgChStr, String(vNum))
            : _findVisibleVerseBlock(vNum);
        if (block) {
            const jt = block.querySelector('.jp-text');
            if (jt) {
                const t = jt.textContent.trim();
                if (t) return t;
            }
        }
    }
    /* FLOW もしくは DOM から取れない場合のみ、既存 fetch 経路を使う */
    const bookKey = AppState.location.book ? AppState.location.book.key : '';
    /* Phase 3-6-I A': fetch も対象章で取得する。 */
    const ch = _mvvChapter != null ? _mvvChapter : AppState.location.chapter;
    if (!bookKey || ch == null) return '';
    const data = await _fetchTranslation(_mvvDisplayTrans(), bookKey, String(ch));
    if (data && data.verses && data.verses[vNum] != null) return String(data.verses[vNum]);
    return '';
}

/**
 * _renderMobileVerseArea — #mobile-verse-area に「書名・章節・本文」を描画する。
 * 続けて下半分の Inspector（Level2）を _mobileInspectorRender() で描画する。
 * 上半分の本文取得は非同期のため、Inspector 描画は本文を待たずに先行させる
 * （両者は独立した領域で、描画順に依存しない）。
 */
async function _renderMobileVerseArea(vNum, words) {
    /* 下半分（Level2: 語順フロー・単語一覧）を先に描画（同期・本文fetchを待たない） */
    _mobileInspectorRender(vNum, words);

    const area = document.getElementById('mobile-verse-area');
    if (!area) return;

    const book = AppState.location.book;
    const bookName = book ? _bookFullName(book.key) : '';
    /* Phase 3-6-I A: _syncMobileVerseTitle と同じchapter sourceを使い、title/ref の不一致を解消する。 */
    const ch = _mvvChapter != null ? _mvvChapter : AppState.location.chapter;
    const ref = (bookName && ch != null && vNum != null) ? `${bookName} ${ch}:${vNum}` : '';

    const text = await _mvvGetVerseText(vNum);

    /* 入口導線 Phase 1: 読書メモ・異読は語リストより後ろに置く。
       モバイルでは Inspector 領域の末尾へスロットを移し、上部の verse-area は空にする
       （従来は verse-area の先頭に描画され、語リストより前に出ていた）。
       Inspector の描画（renderColumn）が含む同名スロットは未使用の置き場なので除去し、
       id の重複を避ける。 */
    area.innerHTML = '';
    area.style.display = 'none';
    const _inspectorForNotes = document.getElementById('mobile-inspector-area');
    if (_inspectorForNotes) {
        const _staleSlot = _inspectorForNotes.querySelector('#wlv-passage-note-slot');
        if (_staleSlot) _staleSlot.remove();
        _inspectorForNotes.insertAdjacentHTML('beforeend', '<div id="wlv-passage-note-slot"></div><div id="wlv-apparatus-slot"></div>');
        _fillWallacePassageNote(words, _inspectorForNotes);
        const _bookKey = book ? book.key : '';
        if (_bookKey && ch != null && vNum != null) _fillApparatusSection(_bookKey, ch, vNum, _inspectorForNotes);
    }

    const inspector = document.getElementById('mobile-inspector-area');
    if (!inspector) return;
    const translation = document.createElement('div');
    translation.className = 'mvv-inline-translation';
    _mvvTranslationNode = translation;
    const _transId = _mvvDisplayTrans();
    const _MVV_REF_JA = { JA1955: '口語訳', WEB: 'World English Bible（英語訳）' };
    translation.innerHTML =
        `<div class="mvv-ref">${_escH(_T('mode.' + _transId, _MVV_REF_JA[_transId] || _transId))}</div>` +
        `<div class="mvv-body">${_escH(text)}</div>`;
    /* 口語訳だけを「原語の順序」と同じスクロール領域へ移し、左右の余白をそろえる。 */
    const previous = inspector.querySelector('.mvv-inline-translation');
    if (previous) previous.remove();
    inspector.prepend(translation);
}

/**
 * _mobileInspectorRender — #mobile-inspector-area に Level2 内容を描画する。
 *
 * 既存の Level2 描画ロジックをそのまま再利用する:
 *   - _buildFlowTabHTML(words) … 語順フロー + 単語一覧（chip 列 + 詳細ドロワー等）
 *   - _fillWallacePassageNote(words, area) … 節読書メモスロットの非同期充填
 * StudyPanel（#bottom-depth-panel）や _openWordListInternal のコードは複製せず、
 * 同じ生成関数を別コンテナへ出力するだけ。
 *
 * 注:
 *   - chip クリックは既存 _wlvChipClick が使う _wlvWordCache を SSOT とするため、
 *     ここで従来どおり words をセットする（_openWordListInternal と同じ振る舞い）。
 */
function _mobileInspectorRender(vNum, words) {
    const area = document.getElementById('mobile-inspector-area');
    if (!area) return;

    area.classList.remove('drawer-open');

    /* Level3 から戻る際も、一覧領域の口語訳 DOM を保持して再配置する。
       再配置前にアニメーション用インラインスタイルをクリアし、自然な高さに戻す。 */
    const translation = area.querySelector('.mvv-inline-translation') || _mvvTranslationNode;
    if (translation) { translation.remove(); _clearTranslationInlineStyles(translation); }

    /* 節の一覧へ戻ったら、節の読書メモを再表示する。 */
    const verseArea = document.getElementById('mobile-verse-area');
    if (verseArea) verseArea.classList.remove('word-analysis-open');
    /* Level2（一覧）を描画するので内部状態は list */
    _mobileVerseInspectorMode = 'list';
    _syncMobileVerseViewBackLabel();
    _syncMobileVerseTitle();

    /* chip クリック（_wlvChipClick）が参照するグローバルキャッシュ。
       モバイルでは desktop の #word-list-view を描画しないため衝突しない。 */
    _wlvWordCache = words || [];

    if (!words || !words.length) {
        area.innerHTML =
            `<p style="color:var(--text-sub);font-size:var(--text-caption);text-align:center;padding:var(--space-xl) var(--space-md);">${_T('ui.noWordForms', 'この節では語形表示はまだ利用できません')}</p>`;
        if (translation) area.prepend(translation);
        /* メモは固定領域 #mobile-verse-note-area（open 時に初期化）にあり、
           ここでは触れない（Level 遷移で内容・開閉状態を保持するため）。 */
        return;
    }

    /* Phase VR-3A/VR-3B: Flowタブの描画経路を Verse Representation Architecture 経由にする。
       renderColumn() は WordOrderRenderer（chips[] のみを入力とする）へ委譲するため、
       出力は _buildFlowTabHTML() 時代と完全一致（docs/development/verse-representation-design.md）。 */
    {
        const _vrBookKey = AppState.location.book ? AppState.location.book.key : '';
        /* Phase 3-6-I A: MVV内では_mvvChapterを使い、buildVerseのchapter keyを対象節と一致させる。 */
        const _vrCh      = _mvvChapter != null ? _mvvChapter : (AppState.location.chapter != null ? AppState.location.chapter : null);
        const _vrVerse   = buildVerse(_vrBookKey, _vrCh, vNum, words);
        const _spMode    = _studyPanelCompanionMode(_transA);
        if (_spMode === 'DA_READING' && _sdChapterDataForRender) {
            /* RK_READING → DA_READING: 既存 renderDAReadingView を節単位で再利用 */
            renderDAReadingView(area, _sdChapterDataForRender, words);
            _wlvChipCache = [];
            if (typeof _applyPanelFlowHighlights === 'function') _applyPanelFlowHighlights(area, words, _vrBookKey, _vrCh, vNum);
        } else {
            const _vrRep = buildRepresentation({ kind: 'wordOrder' }, _vrVerse, getAnalysis(_vrVerse));
            /* VR-4-C Step 5: 「本文がFLOW表示中か」の判定はここ（呼び出し元）で解決し、
               WordOrderRenderer へは解決済みの真偽値のみを渡す（旧実装の "修正B" 判定を移設）。 */
            const _showOnboardingAnchor = _toColumnMode(_transA).kind !== 'wordOrder'
                && !!(window.App.onboarding && !window.App.onboarding.getState().onboardingComplete);
            /* VR-5-H-12: legend 表示可否も呼び出し元で解決し、Renderer へは真偽値のみ渡す
               （render() 内の window.App.onboarding 直参照を撤去。旧: onboardingComplete で凡例表示）。 */
            const _showOnboardingLegend = !!(window.App.onboarding?.getState()?.onboardingComplete);
            area.innerHTML = renderColumn(_vrRep, { showOnboardingAnchor: _showOnboardingAnchor, showOnboardingLegend: _showOnboardingLegend });
            if (typeof _applyPanelFlowHighlights === 'function') _applyPanelFlowHighlights(area, words, _vrBookKey, _vrCh, vNum);
            /* Phase VR-4B-3: 表示に使った chips[] をクリック時まで保持する（Interaction Lifecycle是正）。
               Mobile Inspector も StudyPanel と同じくシングルトン表示のため同じキャッシュを共有する。 */
            _wlvChipCache = (_vrRep && _vrRep.chips) ? _vrRep.chips : [];
            /* モバイルの口語訳は専用 DOM として保持する。
               コンテナ全体を置換する非同期注入はここでは行わない。 */
        }
    }
    if (translation) area.prepend(translation);
    /* 節読書メモは訳文の上（#mobile-verse-area）に表示する。ここでは注入しない。 */
}

/**
 * _syncMobileVerseTitle — MVV バー中央の現在地表示を内部状態に合わせて更新する（Phase D-3C）。
 *   list（Level2）  : 「書名 章:節」（AppState.location + _mvvVNum）
 *   detail（Level3）: 選択語（AppState.inspect.data.greek）
 * 表示のみ。戻る/メモの動作には関与しない。
 */
function _syncMobileVerseTitle() {
    const el = document.getElementById('mobile-verse-view-title');
    if (!el) return;
    let title = '';
    if (_mobileVerseInspectorMode === 'detail') {
        title = (AppState.inspect.data && AppState.inspect.data.greek) || '';
    } else {
        const book = _mvvBook || AppState.location.book;
        const bookName = book ? _bookFullName(book.key) : '';
        const ch = _mvvChapter != null ? _mvvChapter : AppState.location.chapter;
        if (bookName && ch != null && _mvvVNum != null) title = `${bookName} ${ch}:${_mvvVNum}`;
    }
    el.textContent = title;
}

/**
 * closeMobileVerseView — #mobile-verse-view を非表示にする（Phase A-2）。
 * closeStudyPanel() には触れない独立の閉じ処理。
 */
function closeMobileVerseView() {
    /* まず DOM を閉じる。 */
    _doCloseMobileVerseView();
    /* E-1C: UI 戻る/クローズで閉じた場合は、MVV が積んだ履歴エントリも戻して整合を取る。
       この history.back() が誘発する popstate は _mvvIgnoreNextPop で無視する（二重クローズ防止）。 */
    if (_mvvHistoryActive) {
        _mvvHistoryActive = false;
        _mvvIgnoreNextPop = true;
        history.back();
    }
}

/**
 * 節クリック時に side-panel を開き、語形リストを3タブで表示する。
 *
 * タブ構成:
 *   流れ（デフォルト） … ギリシャ語順の日本語chip列。「読解UI」のメイン。
 *   通常               … 既存の word-card リスト。
 *   原語               … ギリシャ語テキスト + 簡易morph。
 *
 * 既存の AppState / openStudyPanel との接続はそのまま。
 * word-card の onclick（onWordCardClick）も通常タブでは変わらず動作する。
 * 流れタブのchipクリックは _wlvChipClick() を経由して同じ AppState を更新する。
 *
 * 注: 節タップの入口は openVerseInspector()。この関数を直接呼ぶのは
 *     Adapter（openVerseInspector）と panelGoBack 経由の内部再描画のみ。
 */
function openWordListInStudyPanel(vNum, words, book, ch) {
    /* words をキャッシュ（chip クリック時の詳細参照用） */
    _wlvWordCache = words || [];

    /* depth stack に verse-flow を追加（reading が先頭になければ追加） */
    const stack = AppState.depth.stack;
    if (stack.length === 0 || stack[0].type !== 'reading') {
        /* reading を先頭に置いてからverse-flowを追加 */
        AppState.clearDepth();
        pushDepth({ type: 'reading', label: '読書' });
    }
    /* verse-flow を追加（重複しないよう top を確認） */
    const top = stack[stack.length - 1];
    if (!top || top.type !== 'verse-flow' || String(top.verse) !== String(vNum)) {
        pushDepth({
            type:  'verse-flow',
            label: 'ことばの流れ',
            verse: vNum,
        });
    }

    _openWordListInternal(vNum, words, book, ch);

    /* onboarding hook: 節タップ時にも通知 */
    if (window.App.onboarding) {
        window.App.onboarding.onStudyPanelOpened(window.innerWidth <= 900, String(vNum));
    }
    _syncOnboardingActiveFlag();

    notifyAppStateChange();
}

/* ── WLV タブ切り替え（廃止：タブレス設計へ移行済み） ── */
