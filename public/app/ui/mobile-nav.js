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

function _fabTapBible()  { _fabClose(); _openMobileBookPicker(); }
function _fabTapMode()   { _fabClose(); _openMobileModePicker(); }
function _fabTapSearch() { _fabClose(); window.location.href = '/search'; }


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
   #209：書物｜章｜節の3列を同時に表示する（段階式の Layer 2→3 を置き換え）。
     書タップ＝選択のみ（章列・節列を更新）／章タップ＝選択のみ（節列を更新）／
     節タップ＝その節へ遷移して閉じる（共有 URL の verse 復元と同じ経路）。
     下部の「○章を開く」＝選択中の章へ節なしで遷移（従来の _mbpSelectChapter → _navTo 経路）。
   節列は章の選択時に bible_data（リーダーが読むのと同じ章 JSON）を1回だけ取得して列挙する。
   取得できない／節を列挙できない章（LXX の一部など）は節列を空にし、「章を開く」での遷移は妨げない。
   ══════════════════════════════════════════════════════════════ */

let _mbpSection        = 'nt'; /* 'nt' | 'ot'（書物列に出す区分。現在地から引き継ぐ） */
let _mbpBookKey        = '';
let _mbpBookMaxCh      = 0;
let _mbpCh             = 0;    /* 選択中の章（0 = 未選択） */
let _mbpVerse          = null; /* 選択状態で示す節（開いた時点の本文の節位置。章を変えたら外す） */
let _mbpVerseReq       = 0;    /* 節列の取得の世代番号（素早く章を切り替えたとき古い結果を捨てる） */
let _mbpHistoryActive  = false;
let _mbpIgnoreNextPop  = false;

/* 章ごとの節番号リスト（成功した取得だけを保持。失敗は固定しない） */
const _mbpVerseCache = new Map();

function _openMobileBookPicker() {
    if (window.innerWidth > 900) return; /* Desktop では無効 */

    /* 本文で選択中の節（あれば）。closeStudyPanel() が選択状態を戻す前に読んでおく */
    const loc = AppState.location;
    const sv  = AppState.selectedVerse;
    const curVerse = (sv && sv.vNum != null && loc && loc.chapter != null &&
                      (sv.ch == null || Number(sv.ch) === Number(loc.chapter)))
        ? String(sv.vNum) : null;

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

    /* 現在地（書・章・節）を3列の初期選択にする（従来の位置引き継ぎを再現） */
    if (loc && loc.book) {
        _mbpSection   = loc.testament || 'nt';
        _mbpBookKey   = loc.book.key;
        _mbpBookMaxCh = loc.book.ch || 0;
        _mbpCh        = loc.chapter || 0;
        _mbpVerse     = curVerse;
    } else {
        _mbpBookKey = ''; _mbpBookMaxCh = 0; _mbpCh = 0; _mbpVerse = null;
    }
    _mbpRenderAll();

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

/* 3列すべてを描画し、各列の選択行を見える位置へ寄せる（開いた時点） */
function _mbpRenderAll() {
    _mbpRenderBooks();
    _mbpRenderChapters();
    _mbpRenderVerses();
    _mbpUpdateBar();
    requestAnimationFrame(() => {
        _mbpRevealSelected('mbp-col-book');
        _mbpRevealSelected('mbp-col-ch');
        _mbpRevealSelected('mbp-col-verse');
    });
}

/* 列の中で選択行が見えるようにスクロールする（列だけを動かし、ページは動かさない） */
function _mbpRevealSelected(colId) {
    const col = document.getElementById(colId);
    if (!col) return;
    const sel = col.querySelector('.mbp-item.current');
    if (!sel) { col.scrollTop = 0; return; }
    const top = sel.offsetTop - col.offsetTop;
    if (top < col.scrollTop || top + sel.offsetHeight > col.scrollTop + col.clientHeight) {
        col.scrollTop = Math.max(0, top - (col.clientHeight - sel.offsetHeight) / 2);
    }
}

/* バー：タイトルは選択中の「書名＋章」。下部の「○章を開く」もここで更新する */
function _mbpUpdateBar() {
    const titleEl = document.getElementById('mobile-book-picker-title');
    const openBtn = document.getElementById('mbp-open-chapter');
    const isJa = !(window.I18N && window.I18N.lang !== 'ja');
    if (titleEl) {
        if (!_mbpBookKey) {
            titleEl.textContent = _T('picker.bookTitle', '書物を選ぶ');
        } else {
            const name = _bookFullName(_mbpBookKey);
            titleEl.textContent = _mbpCh ? (isJa ? `${name} ${_mbpCh}章` : `${name} ${_mbpCh}`) : name;
        }
    }
    if (openBtn) {
        openBtn.hidden = !(_mbpBookKey && _mbpCh);
        openBtn.textContent = _T('picker.openChapter', '{n}章を開く').replace('{n}', _mbpCh);
    }
}

/* 書物列（現行 Layer 2 と同じ SB_BOOKS の一覧。区分見出しは出さない）。
   列幅が狭いので名前は既存の略称表 BOOK_SHORT（UI 言語では bookshort.*）を使い、略称の無い書は正式名のまま。
   タイトル欄（_mbpUpdateBar）は正式名のまま。 */
function _mbpRenderBooks() {
    const col = document.getElementById('mbp-col-book');
    if (!col) return;
    const books = (SB_BOOKS[_mbpSection] || []);
    let html = '';
    for (const b of books) {
        const cur = (b.key === _mbpBookKey);
        html += '<button type="button" class="mbp-item mbp-item-book' + (cur ? ' current' : '') + '"' +
            (cur ? ' aria-current="true"' : '') +
            ' onclick="_mbpSelectBook(\'' + b.key + '\',' + b.ch + ')">' +
            _escH(BOOK_SHORT[b.key] ? _bookShortName(b.key) : _bookFullName(b.key)) + '</button>';
    }
    col.innerHTML = html;
}

/* 章列（選択中の書物の章番号を縦に並べる） */
function _mbpRenderChapters() {
    const col = document.getElementById('mbp-col-ch');
    if (!col) return;
    let html = '';
    for (let c = 1; c <= _mbpBookMaxCh; c++) {
        const cur = (c === _mbpCh);
        html += '<button type="button" class="mbp-item mbp-item-num' + (cur ? ' current' : '') + '"' +
            (cur ? ' aria-current="true"' : '') +
            ' onclick="_mbpPickChapter(' + c + ')">' + c + '</button>';
    }
    col.innerHTML = html;
}

/* 節列（選択中の章の節番号。取得は章ごとに1回。失敗・列挙不能なら空のまま） */
function _mbpRenderVerses() {
    const col = document.getElementById('mbp-col-verse');
    if (!col) return;
    col.innerHTML = '';
    if (!_mbpBookKey || !_mbpCh) return;

    const key = _mbpBookKey + '/' + _mbpCh;
    const draw = (verses) => {
        let html = '';
        for (const v of verses) {
            const cur = (_mbpVerse != null && v === _mbpVerse);
            html += '<button type="button" class="mbp-item mbp-item-num' + (cur ? ' current' : '') + '"' +
                (cur ? ' aria-current="true"' : '') +
                ' onclick="_mbpSelectVerse(\'' + v + '\')">' + v + '</button>';
        }
        col.innerHTML = html;
    };

    if (_mbpVerseCache.has(key)) { draw(_mbpVerseCache.get(key)); return; }

    const req = ++_mbpVerseReq;
    _mbpFetchVerses(_mbpBookKey, _mbpCh).then(verses => {
        if (req !== _mbpVerseReq) return;                 /* より新しい章の選択がある */
        if (key !== _mbpBookKey + '/' + _mbpCh) return;
        if (!verses || verses.length === 0) return;       /* 節列は空のまま（章を開くは使える） */
        draw(verses);
        requestAnimationFrame(() => _mbpRevealSelected('mbp-col-verse'));
    });
}

/* 章 JSON（bible_data）から節番号を出現順に列挙する。
   NT トークンは w.verse、LXX トークンは w.ref から取る（_elTokenVerse と同じ規則）。
   共有 URL の節として扱える数字の節だけを残す。失敗時は null（キャッシュしない）。 */
async function _mbpFetchVerses(book, ch) {
    const testament = SB_BOOKS.nt.some(b => b.key === book) ? 'nt' : 'lxx';
    try {
        const res = await fetch(`../bible_data/${testament}/${book}/${ch}.json`);
        if (!res.ok) return null;
        const tokens = await res.json();
        if (!Array.isArray(tokens)) return null;
        const seen = new Set();
        const verses = [];
        for (const w of tokens) {
            const v = _elTokenVerse(w);
            if (v == null || !/^\d+$/.test(v) || seen.has(v)) continue;
            seen.add(v);
            verses.push(v);
        }
        _mbpVerseCache.set(book + '/' + ch, verses);
        return verses;
    } catch (_) {
        return null;
    }
}

/* 書タップ＝選択のみ（章列・節列を更新。シートは閉じない）。
   開いている書と同じ書に戻したときは、現在の章を選択状態に戻す。 */
function _mbpSelectBook(key, maxCh) {
    _mbpBookKey   = key;
    _mbpBookMaxCh = maxCh;
    const loc = AppState.location;
    _mbpCh    = (loc && loc.book && loc.book.key === key && loc.chapter) ? loc.chapter : 1;
    _mbpVerse = null;
    _mbpRenderBooks();
    _mbpRenderChapters();
    _mbpRenderVerses();
    _mbpUpdateBar();
    const vCol = document.getElementById('mbp-col-verse');
    if (vCol) vCol.scrollTop = 0;
    requestAnimationFrame(() => _mbpRevealSelected('mbp-col-ch'));
}

/* 章タップ＝選択のみ（節列を更新。シートは閉じない） */
function _mbpPickChapter(ch) {
    _mbpCh    = ch;
    _mbpVerse = null;
    document.querySelectorAll('#mbp-col-ch .mbp-item').forEach(b => {
        const on = (Number(b.textContent) === ch);
        b.classList.toggle('current', on);
        if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    const vCol = document.getElementById('mbp-col-verse');
    if (vCol) vCol.scrollTop = 0;
    _mbpRenderVerses();
    _mbpUpdateBar();
}

/* 節タップ＝その節へ遷移して閉じる。
   verse 付きの共有 URL を読み込み、起動時の verse 復元（Router.parse → applyShareState）に委ねる。
   picker の履歴エントリは遷移先で置き換える（戻るで開く前の章へ1回で戻れるように）。 */
function _mbpSelectVerse(v) {
    const url = ShareURLService.generate({
        book: _mbpBookKey,
        chapter: _mbpCh,
        verse: String(v),
        transA: _transA,
        transB: _transB,
        mode: _transMode,
    });
    const replace = _mbpHistoryActive;
    _mbpHistoryActive = false;
    _closeMobileBookPickerDOM();
    const area = document.getElementById('bible-text-area');
    if (area) area.style.opacity = '0';
    setTimeout(() => {
        if (replace) window.location.replace(url.href);
        else window.location.href = url.href;
    }, 150);
}

/* 「○章を開く」：選択中の章へ節なしで遷移して閉じる（従来の章タップと同じ経路） */
function _mbpOpenChapter() {
    if (!_mbpBookKey || !_mbpCh) return;
    _mbpSelectChapter(_mbpCh);
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
    { id: 'GREEK_TEXT',  label: 'ギリシャ語で読む',          i18n: 'mode.GREEK_TEXT' },
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
    const baseId = ((window.I18N && window.I18N.baseTranslation) || 'JA1955');
    const baseItem = baseId === 'WEB'
        ? { id: 'WEB', label: 'Text (World English Bible)', i18n: 'mode.WEB.picker' }
        : baseId === 'RVR1909'
        ? { id: 'RVR1909', label: 'Texto (Reina-Valera 1909)', i18n: 'mode.RVR1909.picker' }
        : baseId === 'KARLXII1873'
        ? { id: 'KARLXII1873', label: 'Text (Karl XII:s bibel 1873)', i18n: 'mode.KARLXII1873.picker' }
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
