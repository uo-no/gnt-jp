async function loadBook(book, translation = 'JA1955') {
    const ch = AppState.location.chapter || 1;
    return await _fetchTranslation(translation, book, String(ch));
}

function _applyTransMode(mode) {
    _transMode = mode;
    const area = document.getElementById('main-reading-area');
    if (mode === 'compare') {
        area.classList.remove('single-mode');
        area.classList.add('compare-mode');
    } else {
        area.classList.remove('compare-mode');
        area.classList.add('single-mode');
        /* VR-5-H-6: 旧「単一表示復帰時に flow を解除」する cleanup（_rightMode 依存）は削除。
           _applyTransMode() の呼び出しは直後に必ず renderCurrentPage() を伴い、render() が
           DOM を全消去して作り直すため、この cleanup は表示上 no-op だった。 */
    }
    _updateColHeaders();
}

function _updateColHeaders() {
    _updateBibleLabel();
}

/* ── Greek Flow View: 右列表示モード切り替え ── */
function _setFlowInjection(mode) {
    /* flow タブ初回開封を onboarding へ通知 */
    if (mode === 'flow') {
        window.App.onboarding?.onFlowTabOpened();
        _syncOnboardingActiveFlag();
    }

    /* VR-5-H-4: Flow 対象列を位置クラス（.verse-pair-right）ではなく、_buildColumnBlock()
       が投影した data-col-mode="wordOrder"（= col.colMode.kind の projection）で探索する。
       これにより Flow Injection Layer が「右列」という位置に依存しなくなる。
       ※ 対象列の一般化（任意 wordOrder 列の Flow 化）は今回のスコープ外。現行 render では
         _setFlowInjection('flow') は _colB.kind==='wordOrder' の文脈で呼ばれ、通常は右列 wordOrder が
         ヒットする（挙動は従来と同一）。 */
    /* 描画時コンテキスト: AppState.location はここ（_setFlowInjection 呼び出し時）で1回だけ読む。 */
    const _fiBookKey = AppState.location.book ? AppState.location.book.key : '';
    const _fiCh      = AppState.location.chapter != null ? AppState.location.chapter : null;

    document.querySelectorAll('[data-col-mode="wordOrder"]').forEach(block => {
        const vNum = block.dataset.vnum;
        block.classList.toggle('gf-mode', mode === 'flow');

        if (mode === 'flow') {
            /* gf-verse-block がまだなければ生成 */
            if (!block.querySelector('.gf-verse-block')) {
                const words = (_cachedElByVerse && vNum) ? (_cachedElByVerse[vNum] || []) : [];
                const gfEl = document.createElement('div');
                gfEl.className = 'gf-verse-block';
                const _gfResult = _buildGfVerseBlock(vNum, words, _fiBookKey, _fiCh);
                gfEl.innerHTML = _gfResult.html;
                /* Phase VR-4B-3: chips[] をクリック時まで保持する（本文左列 block._flowChips と
                   同型）。複数節が同時に存在しうるため、単一グローバルcacheではなく
                   DOMノード単位で保存する（節取り違え防止）。 */
                gfEl._flowChips    = _gfResult.chips;
                gfEl._flowWords    = _gfResult.words;
                gfEl._flowResolved = _gfResult.analysis;
                block.appendChild(gfEl);
            }
        }
    });
}

function _updateBibleLabel() {
    const el = document.getElementById('sb-bible-label-text');
    if (!el) return;
    const labelA = (TRANSLATIONS[_transA] || {}).label || _transA;
    if (_transMode === 'compare') {
        const labelB = (TRANSLATIONS[_transB] || {}).label || _transB;
        el.textContent = labelA + ' / ' + labelB;
    } else {
        el.textContent = labelA;
    }
}

function _syncMobileLocationLabel() {
    const el  = document.getElementById('mobile-location-label');
    const btn = document.getElementById('mobile-location-btn');
    if (!el) return;

    if (AppState.ui.view !== 'bible') {
        el.textContent = '';
        if (btn) btn.style.display = 'none';
        return;
    }

    if (btn) btn.style.display = '';
    el.textContent = _bibleHeaderLabel();
}

/* ── MN: FAB ────────────────────────────────────────────────────────────── */

let _fabIsOpen = false;

function _fabOpen() {
    _fabIsOpen = true;
    const fab     = document.getElementById('mobile-fab');
    const overlay = document.getElementById('mobile-fab-overlay');
    const btn     = document.getElementById('mobile-fab-btn');
    const menu    = document.getElementById('mobile-fab-menu');
    if (fab)     fab.classList.add('fab-open');
    if (overlay) overlay.style.display = 'block';
    if (btn)     btn.setAttribute('aria-expanded', 'true');
    if (menu)    menu.removeAttribute('aria-hidden');
}

function _fabClose() {
    _fabIsOpen = false;
    const fab     = document.getElementById('mobile-fab');
    const overlay = document.getElementById('mobile-fab-overlay');
    const btn     = document.getElementById('mobile-fab-btn');
    const menu    = document.getElementById('mobile-fab-menu');
    if (fab)     fab.classList.remove('fab-open');
    if (overlay) overlay.style.display = 'none';
    if (btn)     btn.setAttribute('aria-expanded', 'false');
    if (menu)    menu.setAttribute('aria-hidden', 'true');
}

function _fabToggle() { _fabIsOpen ? _fabClose() : _fabOpen(); }

function _fabTapBible()  { _fabClose(); _openMobileBookPicker(); _mbpLayer = 2; _mbpRenderLayer(2); }
function _fabTapMode()   { _fabClose(); _openMobileModePicker(); }
function _fabTapSearch() { _fabClose(); window.location.href = '/search-tool.html'; }


/* ── MN: Mobile More Menu（⋯） ─────────────────────────────────────────── */

let _moreMenuIsOpen = false;

function _moreMenuOpen() {
    _moreMenuIsOpen = true;
    const menu    = document.getElementById('mobile-more-menu');
    const overlay = document.getElementById('mobile-more-overlay');
    const btn     = document.getElementById('mobile-more-btn');
    if (menu)    { menu.classList.add('open'); menu.removeAttribute('aria-hidden'); }
    if (overlay) { overlay.style.display = 'block'; }
    if (btn)     { btn.setAttribute('aria-expanded', 'true'); }
}

function _moreMenuClose() {
    _moreMenuIsOpen = false;
    const menu    = document.getElementById('mobile-more-menu');
    const overlay = document.getElementById('mobile-more-overlay');
    const btn     = document.getElementById('mobile-more-btn');
    if (menu)    { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); }
    if (overlay) { overlay.style.display = 'none'; }
    if (btn)     { btn.setAttribute('aria-expanded', 'false'); }
}

function _moreMenuToggle() { _moreMenuIsOpen ? _moreMenuClose() : _moreMenuOpen(); }


/* ══════════════════════════════════════════════════════════════
   MN: Mobile Book Picker
   ══════════════════════════════════════════════════════════════ */

let _mbpLayer          = 2;    /* 2:Book / 3:Chapter（1:Testament は緑版では経由しない。旧約版用に描画コードは残置） */
let _mbpSection        = 'nt'; /* 'nt' | 'ot' */
let _mbpBookKey        = '';
let _mbpBookName       = '';
let _mbpBookMaxCh      = 0;
let _mbpHistoryActive  = false;
let _mbpIgnoreNextPop  = false;

function _openMobileBookPicker() {
    if (window.innerWidth > 900) return; /* Desktop では無効 */

    /* 競合する UI を閉じる */
    _fabClose();
    if (StudyPanelState.isOpen) closeStudyPanel();
    closeSidebar();
    _closeMobileModePicker();

    const picker = document.getElementById('mobile-book-picker');
    if (!picker) return;

    /* picker open */
    document.getElementById('app')?.classList.add('mobile-picker-open');
    picker.classList.add('mbp-open');
    picker.setAttribute('aria-hidden', 'false');

    /* 現在地を反映した初期 layer から表示 */
    const loc = AppState.location;
    if (loc && loc.book) {
        _mbpSection   = loc.testament || 'nt';
        _mbpBookKey   = loc.book.key;
        _mbpBookName  = _bookFullName(loc.book.key);
        _mbpBookMaxCh = loc.book.ch || 0;
        _mbpLayer = 3; /* 現在 chapter 選択画面から開始 */
    } else {
        _mbpLayer = 2; /* 書物未選択時は Testament を挟まず書物一覧から */
    }
    _mbpRenderLayer(_mbpLayer);

    /* Android back でこの picker を閉じるための履歴エントリ */
    _mbpPushHistory();
}

function _mbpPushHistory() {
    if (_mbpHistoryActive) return;
    _mbpHistoryActive = true;
    try { history.pushState({ __mbp: true }, ''); } catch (_) {}
}

/* DOM だけ閉じる（履歴操作なし）。popstate からも呼ばれる。 */
function _closeMobileBookPickerDOM() {
    const picker = document.getElementById('mobile-book-picker');
    if (!picker) return;
    picker.classList.remove('mbp-open');
    picker.setAttribute('aria-hidden', 'true');
    document.getElementById('app')?.classList.remove('mobile-picker-open');
    _mbpLayer = 2;
}

/* UI ボタン（×・overlay）からの close。履歴エントリも戻す（MVV パターンと同様）。 */
function _closeMobileBookPicker() {
    _closeMobileBookPickerDOM();
    if (_mbpHistoryActive) {
        _mbpHistoryActive = false;
        _mbpIgnoreNextPop = true;
        try { history.back(); } catch (_) {}
    }
}

/* ‹ 戻るボタン: layer を 1 段戻る */
function _mbpBack() {
    if (_mbpLayer <= 2) { _closeMobileBookPicker(); return; }
    _mbpLayer--;
    _mbpRenderLayer(_mbpLayer);
}

/* Layer 描画 */
function _mbpRenderLayer(layer) {
    _mbpLayer = layer;
    const content = document.getElementById('mobile-book-picker-content');
    const titleEl  = document.getElementById('mobile-book-picker-title');
    const backBtn  = document.getElementById('mobile-book-picker-back');
    if (!content || !titleEl || !backBtn) return;

    backBtn.style.display = (layer > 2) ? '' : 'none';

    if (layer === 1) {
        /* Layer 1: NT / OT 選択 */
        titleEl.textContent = _T('picker.bookTitle', '書物を選ぶ');
        content.innerHTML =
            '<div class="mbp-section-label">Testament</div>' +
            '<div class="mbp-row" onclick="_mbpSelectTestament(\'nt\')">' +
                '<span>' + _T('ui.newTestament', '新約聖書') + '</span><span class="mbp-row-chevron">›</span></div>';
    } else if (layer === 2) {
        /* Layer 2: Book 一覧（ピッカーの起点。タイトルは「書物を選ぶ」。
           区分見出し（新約聖書）は出さない：判別に使えないラベルは引く） */
        titleEl.textContent = _T('picker.bookTitle', '書物を選ぶ');
        const books = (SB_BOOKS[_mbpSection] || []);
        const curKey = AppState.location.book ? AppState.location.book.key : '';
        let html = '';
        for (const b of books) {
            const isCur = (b.key === curKey) ? ' style="font-weight:700;"' : '';
            html +=
                '<div class="mbp-row" onclick="_mbpSelectBook(\'' + b.key + '\',\'' +
                _escH(_bookFullName(b.key)) + '\',' + b.ch + ')"' + isCur + '>' +
                '<span>' + _escH(_bookFullName(b.key)) + '</span>' +
                '<span class="mbp-row-chevron">›</span></div>';
        }
        content.innerHTML = html;
    } else if (layer === 3) {
        /* Layer 3: Chapter グリッド */
        titleEl.textContent = _mbpBookName || _mbpBookKey;
        const curCh = (AppState.location.book && AppState.location.book.key === _mbpBookKey)
            ? AppState.location.chapter : null;
        let html = '<div class="mbp-ch-grid">';
        for (let c = 1; c <= _mbpBookMaxCh; c++) {
            const cur = (c === curCh) ? ' current' : '';
            html += '<button class="mbp-ch-btn' + cur + '" onclick="_mbpSelectChapter(' + c + ')">' + c + '</button>';
        }
        html += '</div>';
        content.innerHTML = html;
    }
}


function _mbpSelectTestament(section) {
    _mbpSection = section;
    _mbpRenderLayer(2);
}

function _mbpSelectBook(key, name, maxCh) {
    _mbpBookKey   = key;
    _mbpBookName  = name;
    _mbpBookMaxCh = maxCh;
    _mbpRenderLayer(3);
}

function _mbpSelectChapter(ch) {
    _closeMobileBookPickerDOM();
    /* フラグだけクリア。_navTo() はフルリロードを行うため、
       積んだ history エントリはページ遷移で自然に消える。
       history.back() を呼ぶと非同期競合が起きるため呼ばない。 */
    _mbpHistoryActive = false;
    /* 現在 mode を継承して章移動（既存 _navTo が _transA/_transB/_transMode を使う） */
    _navTo(_mbpBookKey, ch);
}

/* ══════════════════════════════════════════════════════════════
   MN: Mobile Mode Picker
   ══════════════════════════════════════════════════════════════ */

let _mmpHistoryActive  = false;
let _mmpIgnoreNextPop  = false;

/* Mode リスト定義（サイドバー側 _sbRenderModesL0() の items と対応。
   先頭の基本訳はモバイル側では従来どおり JA1955 固定表記） */
const MN_MODE_LIST = [
    { id: 'JA1955',      label: '本文（口語訳）',    i18n: 'mode.JA1955.picker' },
    { id: 'WORD_ORDER',  label: '語順で読む',         i18n: 'mode.WORD_ORDER' },
    { id: 'DA_READING',   label: '文の構造で読む',          i18n: 'mode.DA_READING' },
    { id: 'ROLE_READING', label: '語の役割で読む',          i18n: 'mode.ROLE_READING' },
];

function _openMobileModePicker() {
    if (window.innerWidth > 900) return;

    _fabClose();
    _closeMobileBookPickerDOM();

    const picker = document.getElementById('mobile-mode-picker');
    if (!picker) return;

    document.getElementById('app')?.classList.add('mobile-picker-open');
    picker.classList.add('mmp-open');
    picker.setAttribute('aria-hidden', 'false');

    _mmpRenderModes();
    _mmpPushHistory();
}

function _mmpPushHistory() {
    if (_mmpHistoryActive) return;
    _mmpHistoryActive = true;
    try { history.pushState({ __mmp: true }, ''); } catch (_) {}
}

function _closeMobileModePicker() {
    const picker = document.getElementById('mobile-mode-picker');
    if (!picker) return;
    picker.classList.remove('mmp-open');
    picker.setAttribute('aria-hidden', 'true');
    document.getElementById('app')?.classList.remove('mobile-picker-open');
    if (_mmpHistoryActive) {
        _mmpHistoryActive = false;
        try { history.back(); } catch (_) {}
    }
}

function _mmpRenderModes() {
    const content = document.getElementById('mobile-mode-picker-content');
    if (!content) return;
    /* 先頭の基底訳スロットは UI 言語に従う（サイドバー _sbRenderModesL0 と同じ規則） */
    const baseId = (window.I18N && I18N.lang === 'en') ? 'WEB' : 'JA1955';
    const baseItem = baseId === 'WEB'
        ? { id: 'WEB', label: 'Text (World English Bible)', i18n: 'mode.WEB.picker' }
        : MN_MODE_LIST[0];
    const items = [baseItem, ...MN_MODE_LIST.slice(1)];
    let html = '';
    for (const item of items.filter(it => it.id !== 'ROLE_READING' || _roleReadingAvailable())) {
        const cur = (_transA === item.id && _transMode === 'single') ? ' current' : '';
        html +=
            '<div class="mmp-row' + cur + '" onclick="_mmpSelectMode(\'' + item.id + '\')">' +
            '<span class="mmp-mode-text"><span>' + _T(item.i18n, item.label) + '</span>' +
            (_modeDescVisible() ? '<span class="mmp-mode-desc">' + (_modeDesc(item.id)) + '</span>' : '') + '</span>' +
            '<span class="mmp-checkmark">✓</span>' +
            '</div>';
    }
    content.innerHTML = html;
}

function _mmpSelectMode(id) {
    /* mode picker DOM を閉じ、孤立した history エントリも後始末する（MVV パターンと同様） */
    const picker = document.getElementById('mobile-mode-picker');
    if (picker) {
        picker.classList.remove('mmp-open');
        picker.setAttribute('aria-hidden', 'true');
        document.getElementById('app')?.classList.remove('mobile-picker-open');
    }
    if (_mmpHistoryActive) {
        _mmpHistoryActive  = false;
        _mmpIgnoreNextPop  = true;   /* popstate による二重処理を防ぐ */
        try { history.back(); } catch (_) {}
    }
    /* 既存 mode 変更フロー（_sbSelectMode と同等。sidebar は閉じない） */
    _fgCountModeSwitch();
    _transA = id;
    _applyTransMode('single');
    syncUrlState();
    renderCurrentPage();
}

/* ══════════════════════════════════════════════════════════════
   Highlight V1
   ══════════════════════════════════════════════════════════════ */

/* ── 定数 ── */
