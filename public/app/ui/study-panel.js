/* Study Panel（Bottom Sheet）の現在のコンテンツ種別。ドラッグ時の拡張上限を決めるためだけに使う。
   'verse' = 節全体の研究モード（_openWordListInternal）→ 拡張上限 --panel-expanded-h
   'word'  = 単語詳細（openStudyPanel）                  → 拡張上限 --panel-word-max-h */
let _panelContentMode = 'verse';

/* ── Panel Geometry SSOT ──
   高さの数値定義は CSS（#bottom-depth-panel のカスタムプロパティ）が唯一の真実。
   JS は本関数で getComputedStyle から読むだけで、vh/px の値を直接書かない。
   ドラッグ・高さ復元の clamp（min/max）はすべてここを通す。 */
function _panelGeomLimits(panel) {
    const cs = getComputedStyle(panel);
    const px = (v) => {
        v = String(v).trim();
        if (v.endsWith('vh')) return window.innerHeight * parseFloat(v) / 100;
        return parseFloat(v) || 0;
    };
    const maxProp = _panelContentMode === 'word'
        ? '--panel-word-max-h' : '--panel-expanded-h';
    return {
        minH: px(cs.getPropertyValue('--panel-drag-min-h')),
        maxH: px(cs.getPropertyValue(maxProp)),
    };
}

/* Level 2（節Panel）→ Level 3（単語詳細）へ進む直前の #word-list-view のスクロール位置。
   #word-list-view は Level 3 に入ると破棄されるため、panelGoBack() で Level 2 に
   戻った際にここへ保存しておいた値を読み戻すことでスクロール位置を復元する。
   null は「復元すべき位置が無い」を意味する（新しい節を開いた場合等）。 */
let _versePanelScrollTop = null;

/* StudyPanel UI状態の一元管理オブジェクト。
   UIロジック（open/close/drag）はこのオブジェクトを通じて状態を読み書きし、
   DOM状態・AppState・スクロール位置と混在させない。
   scrollTop: close直前に保存し、次のopen後に2段rAFで復元する。
   isDragging: pointer capture 中のみ true。pointerup/cancel で必ず false に戻す。 */
const StudyPanelState = {
    isOpen:    false,
    height:    0,   /* ユーザーが調整したパネル高さ（px）。0 = 未調整（CSS既定）。SSOT */
    scrollTop: 0,
    isDragging: false,
};

/* StudyPanelState.height（SSOT）を open 時にパネルへ適用する。
   - 0（未調整）なら inline height を消して CSS 既定に任せる
   - ≤768px は全画面モード（CSS top/bottom 管理）のため height を書かない
   - 適用時のみ現在の帯域の min/max へ clamp する（state の値は上書きしない —
     Level 3 の上限 80vh で縮んでも、Level 2 へ戻れば元の高さに復元される） */
function _applyPanelHeightFromState(panel) {
    if (!panel) return;
    if (window.innerWidth <= 768) { panel.style.height = ''; return; }
    const h = StudyPanelState.height;
    if (!h) { panel.style.height = ''; return; }
    const isMobile = _isMobile();
    const { minH, maxH } = _panelGeomLimits(panel);   /* Geometry SSOT（CSS）から取得 */
    const nh = Math.min(maxH, Math.max(minH, h));
    if (isMobile) panel.style.setProperty('height', nh + 'px', 'important');
    else panel.style.height = nh + 'px';
}

/* 本文（左カラム）の節要素を節番号から特定する。
   注意：左カラムの .verse-block には data-vnum 属性が付与されない（data-vnumがあるのは
   並列訳の右カラム .verse-pair-right のみで、しかも単一表示モードでは display:none）。
   そのため節番号は描画済みの .v-num のテキストで照合する（ref文字列の解析は行わない）。 */
function _findVisibleVerseBlock(vNum) {
    if (vNum == null) return null;
    const target = String(vNum);
    const blocks = document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)');
    for (const b of blocks) {
        const numEl = b.querySelector('.v-num');
        if (numEl && numEl.textContent.trim() === target) return b;
    }
    return null;
}

/* applyShareState 用: 章スコープ内で節ブロックを検索する。
   複数章がDOMにある場合でも bookKey/chapterStr で一致する chapter-block 内のみを対象とする。
   chapter-block が存在しない場合は null（呼び出し元で _findVisibleVerseBlock にフォールバック）。 */
function _findVerseInChapter(bookKey, chapterStr, vNumStr) {
    if (!bookKey || chapterStr == null) return null;
    const cb = document.querySelector(
        `.chapter-block[data-book="${bookKey}"][data-chapter="${chapterStr}"]`
    );
    if (!cb) return null;
    const target = String(vNumStr);
    for (const b of cb.querySelectorAll('.verse-block:not(.verse-pair-right)')) {
        const numEl = b.querySelector('.v-num');
        if (numEl && numEl.textContent.trim() === target) return b;
    }
    return null;
}

/**
 * StudyPanel を開いた直後に呼ぶ。
 * 選択節の底辺が読書エリアの底辺より下にある場合のみ、差分だけ scrollBy する（最小限）。
 * scrollIntoView 禁止 / 固定px禁止 / wasOpen=true（Level間遷移）では何もしない。
 * ※ モバイルでの読書エリア収縮（padding でなく flex-basis の高さ計算）は CSS 側が担う。
 */
function _adjustReadingAreaForPanel(wasOpen) {
    if (wasOpen) return;
    /* 全画面モードではパネルが画面全体を覆うため位置調整不要 */
    if (window.innerWidth <= 768) return;

    const mainArea = document.getElementById('main-reading-area');
    if (!mainArea) return;

    /* 選択節が読書エリアの可視底辺を超えている場合のみ最小限スクロール。
       モバイル・デスクトップ共に containerRect.bottom = 読書エリアの実効下端（パネル補正不要）。 */
    const vNum    = AppState.selectedVerse?.vNum ?? AppState.inspect.data?.verse;
    const verseEl = _findVisibleVerseBlock(vNum);
    if (!verseEl) return;

    const containerRect   = mainArea.getBoundingClientRect();
    const verseBottom     = verseEl.getBoundingClientRect().bottom;

    if (verseBottom > containerRect.bottom) {
        const MARGIN = 16;
        mainArea.scrollBy({ top: verseBottom - containerRect.bottom + MARGIN, behavior: 'smooth' });
    }
}

/* Study Panel を開くとき、モバイルではBottom Sheetのスライドイン遷移を起動 */
function _mobileOpenPanel(titleText, wasAlreadyOpen) {
    if (_isMobile()) {
        document.getElementById('app').classList.add('mobile-study-open');
        const navTitle = document.getElementById('mobile-nav-title');
        if (navTitle) navTitle.textContent = titleText || _T('panel.readWord', '語を読む');
    }
    /* 768px以下：CSS の top/bottom が環境によって効かない場合に備え
       window.innerHeight で高さを確定する（dvh/auto の非依存フォールバック） */
    if (window.innerWidth <= 768) {
        const panel = document.getElementById('bottom-depth-panel');
        if (panel) panel.style.height = window.innerHeight + 'px';
    }
}

/* StudyPanel の対応表: 現在の読み方 → 別の読み方（重複表示しない）。
   本文にすでに表示されているモードをStudyPanelで繰り返さない。 */
function _studyPanelCompanionMode(transA) {
    const map = {
        'JA1955':     'WORD_ORDER',
        'WORD_ORDER': 'JA1955',
        'DA_READING': 'WORD_ORDER',
        /* ギリシャ語本文で詰まった節は、語順モードと同じく基準訳で受ける */
        'GREEK_TEXT': 'JA1955',
    };
    return map[transA] || 'WORD_ORDER';
}

/* WORD_ORDER → JA1955: 同期描画後に口語訳テキストを非同期注入する。
   _openWordListInternal / _mobileInspectorRender の描画完了後に fire-and-forget で呼ぶ。 */
async function _fillStudyPanelTranslation(transId, vNum, bookKey, ch, container, words) {
    const data = await _fetchTranslation(transId, bookKey, String(ch));
    if (!data || !data.verses) return;
    const text = data.verses[String(vNum)];
    if (text == null) return;
    if (!container.isConnected) return;   // パネルが閉じられていたら中止
    if (_mobileVerseInspectorMode === 'detail') return;  // Level3（単語詳細）表示中は注入しない
    const rep = buildRepresentation(
        { kind: 'translation', translationId: transId },
        { verseRef: { book: bookKey, chapter: ch, verse: vNum }, tokens: [] },
        null,
        text
    );
    container.innerHTML = renderColumn(rep);
    _wlvChipCache = [];
    /* 口語訳で描画を置き換えても、PC版の読書メモ・本文批評欄を再配置する。 */
    _ensureStudyPanelReadingSections(container, words, bookKey, ch, vNum);
}

/* PC版 StudyPanel の節読書メモ・本文批評欄を、描画後に必ず確保する。
   mobile inspector の表示経路には介入しない。 */
function _ensureStudyPanelReadingSections(container, words, bookKey, ch, vNum) {
    if (!container) return;
    /* 入口導線 Phase 1: 読書メモ・異読は語リストより後ろ（末尾）に置く。
       初見の最初の表示に異読（符号とギリシャ語）を持ってこないための並び替え。
       appendChild は既存ノードの移動になるため、Renderer が先頭に含めた
       スロットもここで末尾へ移る。 */
    let passageSlot = container.querySelector('#wlv-passage-note-slot');
    if (!passageSlot) {
        container.insertAdjacentHTML('beforeend', '<div id="wlv-passage-note-slot"></div>');
        passageSlot = container.querySelector('#wlv-passage-note-slot');
    } else {
        container.appendChild(passageSlot);
    }
    let apparatusSlot = container.querySelector('#wlv-apparatus-slot');
    if (!apparatusSlot) {
        container.insertAdjacentHTML('beforeend', '<div id="wlv-apparatus-slot"></div>');
    } else {
        container.appendChild(apparatusSlot);
    }
    _fillWallacePassageNote(words || [], container);
    if (bookKey && ch != null && vNum != null) {
        _fillApparatusSection(bookKey, ch, vNum, container);
    }
}

/* 内部: 語形一覧を開く（depth stackは変えない） */
function _openWordListInternal(vNum, words, book, ch) {
    closeMobileSidebar();
    _wlvWordCache = words || [];
    const sidePanel    = document.getElementById('bottom-depth-panel');
    const wasOpen = sidePanel.classList.contains('open');
    /* 読書位置の保存: 閉→開の遷移時のみ。close 時の AppState.restoreScroll() は
       ここで保存した位置へ戻す。保存しないと初期値 0（＝最上部）や古い位置が
       復元されてしまう。Level間遷移（wasOpen=true）では保存しない —
       「パネルを開く前の位置」を上書きしないため。 */
    if (!wasOpen) AppState.saveScroll();
    _panelContentMode = 'verse';
    /* 高さの SSOT: ユーザーが調整した高さ（StudyPanelState.height）を尊重する。
       未調整なら CSS 既定。従来の style.height='' 一律リセットは廃止 */
    _applyPanelHeightFromState(sidePanel);
    sidePanel.classList.add('open');
    _syncStudyVerseNav();
    _syncReadingPanelPadding();
    document.getElementById('open-panel-btn').style.display = 'none';

    const notesWrap = document.getElementById('reading-notes-wrap');
    if (notesWrap) notesWrap.style.display = 'none';
    /* notesArea は display:none で隠すのみ。innerHTML = '' 禁止（DOMを維持する） */

    const rcb = document.getElementById('rcb-container');
    if (rcb) rcb.classList.remove('visible');
    const activeVEl = document.getElementById('active-v');
    if (activeVEl) {
        /* 入口導線 Phase 1: パネル見出しに箇所名を併記する（従来は「n節」だけ）。
           書・章が特定できない経路では従来表示にフォールバックする。 */
        const _avBook = book || AppState.location.book;
        const _avCh = ch != null ? ch : AppState.location.chapter;
        activeVEl.textContent = vNum
            ? ((_avBook && _avCh != null) ? `${_bookShortTitle(_avBook)} ${_avCh}:${vNum}` : ((window.I18N && window.I18N.lang !== 'ja') ? `Verse ${vNum}` : `${vNum}節`))
            : '';
    }
    _currentAnalysisParams = null;

    const existing = document.getElementById('word-list-view');
    if (existing) existing.remove();

    const listEl = document.createElement('div');
    listEl.id = 'word-list-view';
    listEl.style.cssText = 'flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0;';

    if (!words.length) {
        listEl.innerHTML = `<p style="color:var(--text-sub);font-size: var(--text-caption);text-align:center;padding: var(--space-xl) var(--space-md);">${_T('ui.noWordForms', 'この節では語形表示はまだ利用できません')}</p>`;
        sidePanel.appendChild(listEl);
        /* モバイルナビバー・戻るボタン・スクロール調整 */
        _mobileOpenPanel(_T('ui.wordList', '語形一覧'), wasOpen);
        updatePanelBackButton();
        _adjustReadingAreaForPanel(wasOpen);
        return;
    }

    /* Phase VR-3A/VR-3B: Flowタブの描画経路を Verse Representation Architecture 経由にする。
       renderColumn() は WordOrderRenderer（chips[] のみを入力とする）へ委譲するため、
       出力は _buildFlowTabHTML() 時代と完全一致（docs/development/verse-representation-design.md）。
       book / ch は描画時コンテキスト（明示引数）を優先し、省略時は AppState.location にフォールバック。 */
    {
        const _bk        = book || AppState.location.book;
        const _vrBookKey = _bk ? _bk.key : '';
        const _vrCh      = ch != null ? ch : (AppState.location.chapter != null ? AppState.location.chapter : null);
        const _vrVerse   = buildVerse(_vrBookKey, _vrCh, vNum, words);
        const _spMode    = _studyPanelCompanionMode(_transA);
        if (_spMode === 'DA_READING' && _sdChapterDataForRender) {
            /* RK_READING → DA_READING: 既存 renderDAReadingView を節単位で再利用 */
            renderDAReadingView(listEl, _sdChapterDataForRender, words);
            _wlvChipCache = [];
            if (typeof _applyPanelFlowHighlights === 'function') _applyPanelFlowHighlights(listEl, words, _vrBookKey, _vrCh, vNum);
        } else {
            const _vrRep = buildRepresentation({ kind: 'wordOrder' }, _vrVerse, getAnalysis(_vrVerse));
            /* VR-4-C Step 5: 「本文がFLOW表示中か」の判定はここ（呼び出し元）で解決し、
               WordOrderRenderer へは解決済みの真偽値のみを渡す（旧実装の "修正B" 判定を移設）。 */
            const _showOnboardingAnchor = _toColumnMode(_transA).kind !== 'wordOrder'
                && !!(window.App.onboarding && !window.App.onboarding.getState().onboardingComplete);
            /* VR-5-H-12: legend 表示可否も呼び出し元で解決し、Renderer へは真偽値のみ渡す
               （render() 内の window.App.onboarding 直参照を撤去。旧: onboardingComplete で凡例表示）。 */
            const _showOnboardingLegend = !!(window.App.onboarding?.getState()?.onboardingComplete);
            listEl.innerHTML = renderColumn(_vrRep, { showOnboardingAnchor: _showOnboardingAnchor, showOnboardingLegend: _showOnboardingLegend });
            if (typeof _applyPanelFlowHighlights === 'function') _applyPanelFlowHighlights(listEl, words, _vrBookKey, _vrCh, vNum);
            /* Phase VR-4B-3: 表示に使った chips[] をクリック時まで保持する（Interaction Lifecycle是正）。
               StudyPanel は常に1節分のみ表示するシングルトンのため、_wlvWordCache と対のグローバル
               キャッシュで足りる（複数節同時表示する Greek Flow View / 本文左列とは異なる方式）。 */
            _wlvChipCache = (_vrRep && _vrRep.chips) ? _vrRep.chips : [];
            if (_spMode === 'JA1955') {
                /* WORD_ORDER → 基本訳: 語順を即時表示後、訳文テキストで非同期上書き。
                   英語UIでは UI 言語の基本訳（WEB）を出す（D1）。 */
                const _fillTransId = (window.I18N && I18N.lang === 'en') ? 'WEB' : (window.I18N && I18N.lang === 'es') ? 'RVR1909' : 'JA1955';
                _fillStudyPanelTranslation(_fillTransId, vNum, _vrBookKey, _vrCh, listEl, words);
            }
        }
    }
    sidePanel.appendChild(listEl);
    /* PC版の節読書メモと本文批評欄を、通常表示・口語訳表示の両方で維持する。 */
    const _noteBook = book || AppState.location.book;
    const _noteBookKey = _noteBook ? _noteBook.key : '';
    const _noteChapter = ch != null ? ch : (AppState.location.chapter != null ? AppState.location.chapter : null);
    _ensureStudyPanelReadingSections(listEl, words, _noteBookKey, _noteChapter, vNum);

    /* モバイルナビバー・戻るボタン・スクロール調整 */
    const _clBook = book || AppState.location.book;
    const _clCh = ch != null ? ch : AppState.location.chapter;
    const chapterLabel = vNum
        ? ((window.I18N && I18N.lang !== 'ja')
            ? ((_clBook && _clCh != null) ? `${_bookShortName(_clBook.key || _clBook)} ${_clCh}:${vNum}` : _T('ui.verseFallback', `Verse ${vNum}`))
            : (vNum + '節'))
        : '';
    _mobileOpenPanel(chapterLabel || _T('ui.wordList', '語形一覧'), wasOpen);
    updatePanelBackButton();
    _adjustReadingAreaForPanel(wasOpen);
}

const JPN_MAP = {
    pos: { 'V': '動詞', 'N': '名詞', 'A': '形容詞', 'R': '関係代名詞', 'P': '人称代名詞', 'D': '指示代名詞', 'T': '冠詞', 'ADV': '副詞', 'PREP': '前置詞', 'CONJ': '接続詞', 'PRT': '添語' },
    tense: { 'P': '現在', 'I': '未完了', 'F': '未来', 'A': 'アオリスト', 'X': '完了' },
    voice: { 'A': '能動', 'M': '中動', 'P': '受動', 'D': '能動的受動' },
    mood: { 'I': '直説', 'S': '接続', 'O': '希求', 'M': '命令', 'N': '不定', 'P': '分詞' },
    case: { 'N': '主格', 'G': '属格', 'D': '与格', 'A': '対格', 'V': '呼格' },
    gender: { 'M': '男性', 'F': '女性', 'N': '中性' },
    number: { 'S': '単数', 'P': '複数' },
    person: { '1': '1人称', '2': '2人称', '3': '3人称' }
};

/* Abbott-Smith 本文を UI 言語で返す（英語UIでは description_en 原文、
   供給不能なら日本語版に落とす）。 */
function _abbottDesc(digits) {
    const e = (typeof abbottSmithDict !== 'undefined' && abbottSmithDict && digits)
        ? abbottSmithDict[digits] : null;
    if (!e) return '';
    if (window.I18N && I18N.lang !== 'ja' && e.descriptionEn) return e.descriptionEn;
    return e.description || '';
}


/* ══════════════════════════════════════════
   Inspect Popover 制御
   ══════════════════════════════════════════ */

/*
 * _inspectData は後方互換エイリアス。
 * 実態は AppState.inspect.data。
 * _renderMorphTab / _renderSemanticsTab が直接参照しているため
 * Proxy でリダイレクトする。
 */
const _inspectDataProxy = {
    get greek()    { return AppState.inspect.data?.greek    || ''; },
    get strong()   { return AppState.inspect.data?.strong   || ''; },
    get jpMorph()  { return AppState.inspect.data?.jpMorph  || ''; },
    get rawMorph() { return AppState.inspect.data?.rawMorph || ''; },
    get lemma()    { return AppState.inspect.data?.lemma    || ''; },
    get jaWord()   { return AppState.inspect.data?.jaWord   || ''; },
    get desc()     { return AppState.inspect.data?.desc     || ''; },
    get ref()      { return AppState.inspect.data?.ref      || ''; },
    get language() { return AppState.inspect.data?.language || ''; },
    get corpusId() { return AppState.inspect.data?.corpusId || ''; },
    get lemmaId()  { return AppState.inspect.data?.lemmaId  ?? null; },
};
/* 後方互換: _inspectData を参照している既存コードが動くよう変数として公開 */
let _inspectData = _inspectDataProxy;

/* ══════════════════════════════════════════
   Study Panel 制御
   ══════════════════════════════════════════ */

/*
 * _currentAnalysisParams は後方互換エイリアス。
 * 実態は AppState.study.params。
 * switchAnalysisTab / _renderMorphTab 等が直接参照しているため
 * get/set プロパティとして公開する。
 *
 * 注意: 代入は AppState.study.params への書き込みと等価。
 */
Object.defineProperty(window, '_currentAnalysisParams', {
    get()  { return AppState.study.params; },
    set(v) { AppState.study.params = v; },
    configurable: true,
});

/*
 * openStudyPanel / closeStudyPanel / reopenStudyPanel は
 * openWordListInStudyPanel の直後（このファイル末尾付近）に
 * 一箇所だけ定義されています。
 * AppState 更新・scroll 保存/復元を含む正規実装です。
 */

/**
 * 従来の toggleSidePanel を置き換え。
 * 外部から呼ばれる可能性があるため互換として残す。
 */
function toggleSidePanel() {
    const sidePanel = document.getElementById('bottom-depth-panel');
    const isHidden  = window.getComputedStyle(sidePanel).display === 'none';
    if (isHidden) {
        if (AppState.canReopen()) reopenStudyPanel();
    } else {
        closeStudyPanel();
    }
}

/**
 * 従来の closeAnalysis 互換（message handler等から呼ばれる）。
 */
function closeAnalysis() {
    closeStudyPanel();
}

/* ── 訳し分け・繰り返し Evidence（この語の読書メモ末尾の小さい行）
   訳の同定データは assets/data/rendering-variants/JA1955.json（JA1955 対応表から
   構築。少数派の訳の箇所・拮抗する訳し分けの箇所・語族の章内対比だけを収録）。
   データが無い／読めない場合は静寂（行を出さない）。 */

/* 開いた語（ref）の訳し分けを示す文を返す。対象でなければ null。 */
async function _translationEvidenceText(ref) {
    try {
        if (!ref) return null;
        const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
        const _isEs = typeof window !== 'undefined' && window.I18N && I18N.lang === 'es';
        const data = await _loadRenderingVariants();
        if (!data) return null;
        const fam = data.family;
        if (fam && fam.refs && fam.refs[ref]) {
            const mine = fam.refs[ref];
            const chKey = ref.substring(0, ref.indexOf(':'));
            const others = new Set();
            for (const r in fam.refs) {
                if (r.substring(0, r.indexOf(':')) === chKey && fam.refs[r] !== mine) others.add(fam.refs[r]);
            }
            if (others.size === 1) {
                return _isEs
                    ? `Esta palabra también se traduce como "${[...others][0]}" en otra parte de este capítulo. Aquí se traduce como "${mine}".`
                    : _isEn
                    ? `This word is also rendered as "${[...others][0]}" elsewhere in this chapter. Here it is rendered as "${mine}".`
                    : `この語は、同じ章では「${[...others][0]}」とも訳されています。ここでは「${mine}」になっています。`;
            }
            return null;
        }
        const bal = data.balanced && data.balanced[ref];
        if (bal) {
            return _isEs
                ? `Esta palabra también se traduce como "${bal.o}" en otros pasajes. Aquí se traduce como "${bal.r}".`
                : _isEn
                ? `This word is also rendered as "${bal.o}" in other passages. Here it is rendered as "${bal.r}".`
                : `この語は、ほかの箇所では「${bal.o}」とも訳されています。ここでは「${bal.r}」になっています。`;
        }
        const min = data.minority && data.minority[ref];
        if (min) {
            const grp = (data.groups || []).find(g => g.id === min.g);
            if (grp) {
                return _isEs
                    ? `En la Reina-Valera 1909, esta palabra suele traducirse como "${grp.majority}". Aquí se traduce como "${min.r}".`
                    : _isEn
                    ? `In the World English Bible, this word is usually rendered as "${grp.majority}". Here it is rendered as "${min.r}".`
                    : `この語は、口語訳ではふだん「${grp.majority}」と訳されています。ここでは「${min.r}」になっています。`;
            }
        }
        return null;
    } catch (_) { return null; }
}

/* 開いた語が同じ節で繰り返されるときの文を返す。対象でなければ null。
   閾値：NT出現200回超の語は3回以上、それ以外は2回以上。 */
function _repetitionEvidenceText(words, idx) {
    try {
        if (!Array.isArray(words) || idx == null || idx < 0 || !words[idx]) return null;
        const lemmaId = words[idx].lemmaId;
        if (!lemmaId) return null;
        let n = 0;
        for (const t of words) { if (t.lemmaId === lemmaId) n++; }
        if (n < 2) return null;
        const ntCount = (_lexiconData && _lexiconData[lemmaId]) ? (_lexiconData[lemmaId].count || 0) : 0;
        if (n < (ntCount > 200 ? 3 : 2)) return null;
        return (typeof window !== 'undefined' && window.I18N && I18N.lang === 'es')
            ? `Esta palabra aparece repetidamente en este versículo (${n} veces).`
            : (typeof window !== 'undefined' && window.I18N && I18N.lang === 'en')
            ? `This word appears repeatedly in this verse (${n} times).`
            : `この語は、この節でくりかえし出てきます（${n}回）。`;
    } catch (_) { return null; }
}

/* ══════════════════════════════════════════
   _renderReadingNotes
   4階層構造: 聖書読者 → 学習者 → 研究者

   reading_prose（語レベル読書メモ）は ReadingFormatter 統一版（2026-06-30）。
   旧 Wallace準拠 reading_prose（WALLACE_*_MAP / WALLACE_*_TEMPLATES /
   wallaceGrammarAdapter / generateWallaceReadingProse）と registry-based
   fallback（_ensureRnAnalyzer / _rnGetType / _getRegistryProse）は完全に削除した。
   自然文生成は ReadingFormatter（clause-analyzer.js）のみが行う。
   本関数は _buildWordResonanceText() 経由で ReadingFormatter.format() の
   結果を受け取り、そのまま描画するだけ（新規の文章生成は行わない）。
   ══════════════════════════════════════════ */

/**
 * 統語論ラベル HTML を返す（SyntaxAnalyzer の candidates から生成）。
 * confidence >= 0.60 かつ status !== 'stub' の候補のみ表示。
 * 候補がない場合・エンジン未初期化の場合は '' を返す（静寂）。
 * _wallacePipeline を再利用するため registry の二重 fetch は発生しない。
 */
function _toggleSyntaxContext(btn) {
    const body = btn && btn.parentElement ? btn.parentElement.querySelector('.rn-syntax-context-body') : null;
    if (!body) return;
    const open = body.hasAttribute('hidden');
    if (open) { body.removeAttribute('hidden'); btn.textContent = '文脈を閉じる'; }
    else { body.setAttribute('hidden', ''); btn.textContent = '文脈で確かめる'; }
}
function _jumpToSyntaxVerse(book, chapter, verse) {
    let target = null;
    try {
        target = (typeof _findVerseInChapter === 'function' && _findVerseInChapter(book, String(chapter), String(verse)))
            || (typeof _findVisibleVerseBlock === 'function' && _findVisibleVerseBlock(verse));
    } catch (_) { target = null; }
    if (!target) return;
    try { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {}
    target.classList.add('rn-ctx-flash');
    setTimeout(() => { try { target.classList.remove('rn-ctx-flash'); } catch (_) {} }, 1900);
}
/* 前後の節と当節（対象語を強調）を並べた文脈ブロック。当節が作れない場合は '' */
function _syntaxContextBlockHTML(chapterTokens, targetRef, hintJa) {
    if (!Array.isArray(chapterTokens) || !chapterTokens.length) return '';
    const target = chapterTokens.find(t => t.ref === targetRef);
    if (!target) return '';
    const book = target.book, chapter = target.chapter, verseNum = parseInt(target.verse, 10);
    if (!book || !chapter || !verseNum) return '';
    const verseLine = v => {
        const toks = chapterTokens.filter(t => parseInt(t.verse, 10) === v);
        if (!toks.length) return '';
        const text = toks.map(t => {
            const s = _escH(String(t.text || '')) + _escH(String(t.after || ''));
            return t.ref === targetRef ? `<span class="rn-syntax-ctx-target">${s}</span>` : s;
        }).join(' ');
        return `<div class="rn-syntax-ctx-verse"><span class="rn-syntax-ctx-ref">${_escH(book)} ${chapter}:${v}</span><span class="rn-syntax-ctx-text" lang="el">${text}</span></div>`;
    };
    const lines = [verseLine(verseNum - 1), verseLine(verseNum), verseLine(verseNum + 1)].filter(Boolean).join('');
    if (!lines) return '';
    const hint = typeof hintJa === 'string' && hintJa.trim()
        ? `<div class="rn-syntax-ctx-hint"><span class="rn-syntax-ctx-hint-label">${_T('ctx.hintLabel', '見分ける手がかり：')}</span>${_escH(hintJa.trim())}</div>`
        : '';
    return `<button type="button" class="rn-syntax-context-toggle" onclick="_toggleSyntaxContext(this)">${_T('ctx.checkContext', '文脈で確かめる')}</button>`
        + `<div class="rn-syntax-context-body" hidden>${lines}${hint}`
        + `<button type="button" class="rn-syntax-ctx-jump" onclick="_jumpToSyntaxVerse('${_escH(book)}', '${_escH(chapter)}', ${verseNum})">${_T('ctx.seeInText', '本文で見る')}</button></div>`;
}

/* 識別不能ペアの読み分け（第4段階・単位B / 仕分け G5）: 必須条件が完全同一で
   検出では区別できないペアが揃って発火したときだけ、2つの読みの違いと
   文脈での見分け方を示す。人手で読み分けを書いた組み合わせに限る。 */
function _syntaxPairBlockHTML(rawIdSet) {
    const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
    const _isEs = typeof window !== 'undefined' && window.I18N && I18N.lang === 'es';
    const PAIRS = [
        {
            a: 'verb.imperative_constative', b: 'verb.imperative_ingressive',
            body: '<p><strong>総括的命令</strong>は行為全体を行うよう命じ、<strong>起動的命令</strong>は行為を始めるよう命じます。アオリスト命令法の形はどちらも同じで、区別は形には現れません。</p>',
            body_en: '<p>The <strong>constative imperative</strong> commands an action to be carried out as a whole, while the <strong>ingressive imperative</strong> commands an action to be begun. Both use the same aorist imperative form; the distinction does not appear in the form.</p>',
            body_es: '<p>El <strong>imperativo constatativo</strong> ordena realizar una acción como un todo, mientras que el <strong>imperativo ingresivo</strong> ordena comenzar una acción. Ambos usan la misma forma de imperativo aoristo; la distinción no aparece en la forma.</p>',
            fact: 'この語はアオリスト・命令法として解析されています。',
            fact_en: 'This word is analyzed as an aorist imperative.',
            fact_es: 'Esta palabra se analiza como un imperativo aoristo.',
            judge: '行為が一回で完結する事柄か、これから始めて続く事柄かは、前後の文脈と行為の性質から判断します。',
            judge_en: 'Whether the act is something completed in a single action, or something to begin and continue, is judged from the surrounding context and the nature of the act.',
            judge_es: 'Si el acto es algo que se completa en una sola acción, o algo que se comienza y continúa, se juzga por el contexto que lo rodea y por la naturaleza del acto.',
        },
        {
            a: 'verb.present_customary', b: 'verb.present_iterative',
            body: '<p><strong>習慣的現在</strong>は、その人の通常のあり方や規則的な習慣を述べ、<strong>反復的現在</strong>は、個別の行為の繰り返しを述べます。現在形の形はどちらも同じです。</p>',
            body_en: '<p>The <strong>customary present</strong> states a person\'s usual way of being or a regular habit, while the <strong>iterative present</strong> states the repetition of individual acts. Both use the same present form.</p>',
            body_es: '<p>El <strong>presente habitual</strong> expresa la manera usual de ser de una persona o un hábito regular, mientras que el <strong>presente iterativo</strong> expresa la repetición de actos individuales. Ambos usan la misma forma de presente.</p>',
            fact: 'この語は現在・直説法として解析されています。',
            fact_en: 'This word is analyzed as a present indicative.',
            fact_es: 'Esta palabra se analiza como un presente de indicativo.',
            judge: '繰り返しが規則的・恒常的か、その都度のものかは、時間を示す副詞や場面の文脈で判断します。',
            judge_en: 'Whether the repetition is regular and constant, or a matter of each occasion, is judged from adverbs of time and the context of the scene.',
            judge_es: 'Si la repetición es regular y constante, o algo de cada ocasión, se juzga por los adverbios de tiempo y el contexto de la escena.',
        },
        {
            a: 'verb.imperfect_customary', b: 'verb.imperfect_iterative',
            body: '<p><strong>習慣的未完了</strong>は、過去における通常のあり方や規則的な習慣を述べ、<strong>反復的未完了</strong>は、過去の個別の行為の繰り返しを述べます。未完了形の形はどちらも同じです。</p>',
            body_en: '<p>The <strong>customary imperfect</strong> states a usual state of affairs or a regular habit in the past, while the <strong>iterative imperfect</strong> states the repetition of individual acts in the past. Both use the same imperfect form.</p>',
            body_es: '<p>El <strong>imperfecto habitual</strong> expresa un estado de cosas usual o un hábito regular en el pasado, mientras que el <strong>imperfecto iterativo</strong> expresa la repetición de actos individuales en el pasado. Ambos usan la misma forma de imperfecto.</p>',
            fact: 'この語は未完了（インパーフェクト）・直説法として解析されています。',
            fact_en: 'This word is analyzed as an imperfect indicative.',
            fact_es: 'Esta palabra se analiza como un imperfecto de indicativo.',
            judge: '過去の繰り返しが規則的だったか、その都度のものだったかは、時間を示す副詞や場面の文脈で判断します。',
            judge_en: 'Whether the past repetition was regular or a matter of each occasion is judged from adverbs of time and the context of the scene.',
            judge_es: 'Si la repetición pasada era regular o algo de cada ocasión, se juzga por los adverbios de tiempo y el contexto de la escena.',
        },
    ];
    for (const p of PAIRS) {
        if (rawIdSet.has(p.a) && rawIdSet.has(p.b)) {
            return _isEs
                ? `<div class="rn-syntax-comparison"><div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>${p.body_es}<div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body"><p><strong>Lo que puede confirmarse en el texto: </strong>${p.fact_es}</p><p><strong>Lo que puede decirse a partir de esto: </strong>${p.judge_es}</p></div></div></div>`
                : _isEn
                ? `<div class="rn-syntax-comparison"><div class="rn-syntax-comparison-title">Telling the readings apart</div>${p.body_en}<div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body"><p><strong>What can be confirmed from the text: </strong>${p.fact_en}</p><p><strong>What can be said from this: </strong>${p.judge_en}</p></div></div></div>`
                : `<div class="rn-syntax-comparison"><div class="rn-syntax-comparison-title">読み分け</div>${p.body}<div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div><div class="rn-syntax-evidence-body"><p><strong>本文で確認できること：</strong>${p.fact}</p><p><strong>ここから言えること：</strong>${p.judge}</p></div></div></div>`;
        }
    }
    return '';
}

async function _buildSyntaxLabelHTML(words, targetRef) {
    if (!words || !words.length || !targetRef) return '';
    const targetIdx = words.findIndex(t => t.ref === targetRef);
    if (targetIdx === -1) return '';
    const pipeline = await _ensureWallacePipeline();
    if (!pipeline) return '';
    let output;
    try {
        output = pipeline.sa.analyze({ target: words[targetIdx], tokens: words, targetIdx });
    } catch (_) { return ''; }
    if (!output || !Array.isArray(output.candidates) || !output.candidates.length) return '';
    /* 0.60 以上かつ非 stub の候補を、スコア順に並べて重複排除 */
    const CONF_MEDIUM = 0.60;
    const candidates = output.candidates
        .filter(c => c.confidence >= CONF_MEDIUM && c.status !== 'stub' && !c.display_exempt && c.label_ja)
        .sort((a, b) => b.confidence - a.confidence);
    const seen = new Set();
    const unique = candidates.filter(c => {
        if (seen.has(c.label_ja)) return false;
        seen.add(c.label_ja);
        return true;
    });
    /* 監査（一次監査台帳）で unresolved とされたタイプ。表示候補に出たとき、
       文脈で判断が分かれる用法であることを小さく添える。根拠のない断定を避ける
       ための注記で、スコアの説明ではない。読み分けブロックが付く組み合わせでは
       そちらが説明を担うため、対象 id は注記を出さない。 */
    const AUDIT_UNRESOLVED_IDS = new Set([
        'accusative.adverbial', 'adjective.restrictive',
        'article.abstract', 'article.generic', 'article.monadic', 'article.par_excellence',
        'clause.causal_hoti',
        'dative.ethical', 'dative.interest_advantage', 'dative.interest_disadvantage',
        'discourse.topic_fronting',
        'genitive.attributed', 'genitive.content', 'genitive.descriptive',
        'genitive.material', 'genitive.means', 'genitive.place',
        'infinitive.means',
        'nominative.nominative_absolute', 'nominative.pendens', 'nominative.vocative_nominative',
        'participle.adverbial_causal', 'participle.adverbial_means',
        'participle.adverbial_temporal', 'participle.redundant',
        'particle.rhetorical_particle', 'preposition.adverbial_pp',
        'verb.aorist_gnomic', 'verb.dramatic_aorist', 'verb.future_gnomic',
        'verb.gnomic_present', 'verb.imperative_ingressive', 'verb.imperfect_iterative',
        'verb.perfect_dramatic',
    ]);
    if (!unique.length) {
        /* 表示候補が無い場合の静かな導線（第4段階・単位B）。
           (1) 識別不能ペア（G5）が揃っていれば、その読み分けを出す。
           (2) 最上位の未満候補が監査未解決なら、注記と文脈導線を出す（G4）。
           どちらにも当たらなければ従来どおり何も出さない。 */
        const rawIdSet = new Set((output.candidates || []).map(c => c.id));
        const pairFallback = _syntaxPairBlockHTML(rawIdSet);
        if (pairFallback) return `<div class="rn-syntax-candidates">${pairFallback}</div>`;
        const topRaw = (output.candidates || [])
            .filter(c => c.status !== 'stub' && c.label_ja)
            .sort((x, y) => y.confidence - x.confidence)[0];
        if (topRaw && AUDIT_UNRESOLVED_IDS.has(topRaw.id)) {
            const m = /^([A-Za-z0-9]+)\s+(\d+):(\d+)/.exec(String(targetRef || ''));
            let ctxBlock = '';
            if (m) {
                const chapterTokens = await _fetchSyntaxChapterTokens(m[1], m[2]);
                if (chapterTokens) ctxBlock = _syntaxContextBlockHTML(chapterTokens, targetRef, (window.I18N && I18N.lang === 'es' ? (topRaw.hint_es || '') : window.I18N && I18N.lang === 'en' ? (topRaw.hint_en || topRaw.hint_ja) : topRaw.hint_ja));
            }
            const _isEnNote = window.I18N && I18N.lang === 'en';
            const _isEsNote = window.I18N && I18N.lang === 'es';
            const note = (topRaw.id === 'infinitive.means' && rawIdSet.has('infinitive.time'))
                ? (_isEsNote
                    ? 'La construcción ἐν τῷ + infinitivo es una cuyo sentido — «tiempo» o «medio» — se decide por el contexto.'
                    : _isEnNote
                    ? 'The ἐν τῷ + infinitive construction is one whose reading — "time" or "means" — is decided by context.'
                    : 'ἐν τῷ＋不定詞は、「時」か「手段」かを文脈で判断する用法です。')
                : (_isEsNote
                    ? `Este uso se decide por el contexto (candidato: ${_escH(topRaw.label_es || '')}).`
                    : _isEnNote
                    ? `This usage is decided by context (candidate: ${_escH(topRaw.label_en || topRaw.label_ja)}).`
                    : `文脈で判断が分かれる用法です（候補：${_escH(topRaw.label_ja)}）。`);
            return `<div class="rn-syntax-candidates"><div class="rn-syntax-item"><div class="rn-syntax-context-note">${note}</div>${ctxBlock}</div></div>`;
        }
        return '';
    }
    /* しきい値未満の候補 id は、表示はしないが読み分けの発火判定にだけ使う
       （例：手段不定詞は確度が低く候補一覧に出ないが、時の不定詞と
       同じ形で競合するため、読み分けの対象には含める）。 */
    const rawIds = new Set((output.candidates || []).map(c => c.id));
    const candidateIds = new Set(unique.map(c => c.id));
    const targetLemma = String(words[targetIdx]?.lemma || '').normalize('NFC');
    const refText = String(targetRef || '');
    const hasLemma = lemma => words.some(t => String(t.lemma || '').normalize('NFC') === lemma);
    const comparisonCoveredIds = new Set();
    if (candidateIds.has('infinitive.time') && rawIds.has('infinitive.means')) {
        comparisonCoveredIds.add('infinitive.means');
    }
    if (targetLemma === 'ὅτι' &&
        (candidateIds.has('clause.substantival_hoti') || rawIds.has('clause.causal_hoti'))) {
        comparisonCoveredIds.add('clause.causal_hoti');
    }
    /* 文脈導線（第4段階トラックb）: 注記対象の表示候補がある場合だけ章データを
       取得し、前後の節と見分ける手がかりを添える。用意できない場合は注記のみ。 */
    const ctxBlockById = new Map();
    {
        const needy = unique.filter(c => AUDIT_UNRESOLVED_IDS.has(c.id) && !comparisonCoveredIds.has(c.id));
        const m = /^([A-Za-z0-9]+)\s+(\d+):(\d+)/.exec(refText);
        if (needy.length && m) {
            const chapterTokens = await _fetchSyntaxChapterTokens(m[1], m[2]);
            if (chapterTokens) {
                for (const c of needy) {
                    const block = _syntaxContextBlockHTML(chapterTokens, targetRef, (window.I18N && I18N.lang === 'es' ? (c.hint_es || '') : window.I18N && I18N.lang === 'en' ? (c.hint_en || c.hint_ja) : c.hint_ja));
                    if (block) ctxBlockById.set(c.id, block);
                }
            }
        }
    }
    /* 最高候補と次点の差が小さい場合は、近い候補を同列に表示 */
    const topHasLead = unique.length > 1 && (unique[0].confidence - unique[1].confidence) >= 0.05;
    const primaryCount = topHasLead ? 1 : unique.filter(c => unique[0].confidence - c.confidence < 0.05).length;
    const primaryCandidates = unique.slice(0, primaryCount);
    const otherCandidates = unique.slice(primaryCount);
    const renderCandidate = (c, primary) => {
        const label = _escH((window.I18N && I18N.lang === 'es') ? (c.label_es || '') : (window.I18N && I18N.lang === 'en') ? (c.label_en || c.label_ja) : c.label_ja);
        const _isEnUI = window.I18N && I18N.lang === 'en';
        const _isEsUI = window.I18N && I18N.lang === 'es';
        const explanation = _isEsUI
            ? (typeof c.description_es === 'string' && c.description_es.trim()
                ? c.description_es.trim()
                : (typeof c.hint_es === 'string' ? c.hint_es.trim() : ''))
            : _isEnUI
            ? (typeof c.description_en === 'string' && c.description_en.trim()
                ? c.description_en.trim()
                : (typeof c.description_ja === 'string' && c.description_ja.trim()
                    ? c.description_ja.trim()
                    : (typeof c.hint_en === 'string' && c.hint_en.trim()
                        ? c.hint_en.trim()
                        : (typeof c.hint_ja === 'string' ? c.hint_ja.trim() : ''))))
            : (typeof c.description_ja === 'string' && c.description_ja.trim()
                ? c.description_ja.trim()
                : (typeof c.hint_ja === 'string' ? c.hint_ja.trim() : ''));
        const description = explanation
            ? `<div class="rn-syntax-description">${_escH(explanation)}</div>`
            : '';
        const badge = primary && topHasLead
            ? `<span class="rn-syntax-best-label">${_T('panel.topCandidate', '第一候補')}</span>`
            : '';
        const contextNote = AUDIT_UNRESOLVED_IDS.has(c.id) && !comparisonCoveredIds.has(c.id)
            ? `<div class="rn-syntax-context-note">${_T('panel.contextDecided', '文脈で判断が分かれる用法です。')}</div>` + (ctxBlockById.get(c.id) || '')
            : '';
        return `<div class="rn-syntax-item${primary && topHasLead ? ' rn-syntax-item-primary' : ''}"><div class="rn-syntax-item-heading"><span class="rn-syntax-term">${label}</span>${badge}</div>${description}${contextNote}</div>`;
    };
    const primaryHTML = primaryCandidates.map(c => renderCandidate(c, true)).join('');
    const tiedNotice = !topHasLead && primaryCandidates.length > 1
        ? `<div class="rn-syntax-tied-notice">${_T('panel.tiedNotice', '今回の解析では、一つの候補に絞れていません。')}</div>`
        : '';
    const otherHTML = otherCandidates.length
        ? `<div class="rn-syntax-alternatives"><div class="rn-syntax-alternatives-label">${_T('panel.otherCandidates', 'ほかの候補（{n}件）').replace('{n}', otherCandidates.length)}</div><div class="rn-syntax-alternatives-list">${otherCandidates.map(c => renderCandidate(c, false)).join('')}</div></div>`
        : '';

    /*
     * 候補比較は、意味の対立と適用箇所を人手レビューしたケースに限定する。
     * confidence の大小や共通シグナルを、解釈の決め手として扱わない。
     * 対象外・候補不足では何も追加しない（静寂優先）。
     */
    let comparisonHTML = '';
    const _isEnCmp = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
    const _isEsCmp = typeof window !== 'undefined' && window.I18N && I18N.lang === 'es';
    if (
        targetLemma === 'οἶκος' &&
        /(?:JHN|John)[\s._:-]*2[\s._:-]*17(?:[\s._:!-]|$)/i.test(refText) &&
        hasLemma('ζῆλος') &&
        candidateIds.has('genitive.objective') &&
        candidateIds.has('genitive.subjective')
    ) {
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p>Si es un <strong>genitivo objetivo</strong>, el sentido es «el celo por la casa»: la casa es aquello hacia lo que se dirige el celo. Si es un <strong>genitivo subjetivo</strong>, el sentido es «el celo que muestra la casa»: la casa es el lado que muestra el celo.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p><strong>Lo que puede confirmarse en el texto: </strong>La frase en genitivo <span lang="el">τοῦ οἴκου σου</span> sigue a <span lang="el">ζῆλος</span>, que expresa celo.</p>
                    <p><strong>Lo que puede decirse a partir de esto: </strong>Lo que está en cuestión es la relación entre un sustantivo que expresa una acción o un sentimiento y la frase en genitivo. Pero la pista de que existe tal sustantivo es común a ambos candidatos, así que por sí sola no puede decidir si la casa es el lado hacia el que se dirige el celo o el lado que muestra el celo.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p>If it is an <strong>objective genitive</strong>, the sense is "zeal for the house" — the house is what the zeal is directed toward. If it is a <strong>subjective genitive</strong>, the sense is "the zeal the house shows" — the house is the side that shows the zeal.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p><strong>What can be confirmed from the text: </strong>The genitive phrase <span lang="el">τοῦ οἴκου σου</span> follows <span lang="el">ζῆλος</span>, which expresses zeal.</p>
                    <p><strong>What can be said from this: </strong>What is at issue is the relation between a noun expressing an action or a feeling and the genitive phrase. But the clue that there is such a noun is common to both candidates, so it alone cannot decide whether the house is the side the zeal is directed toward, or the side that shows the zeal.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p><strong>目的語的属格</strong>なら「家に対する熱意」で、「家」は熱意の向かう対象です。<strong>主語的属格</strong>なら「家が示す熱意」で、「家」は熱意を示す側です。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p><strong>本文で確認できること：</strong>「熱意」を表す <span lang="el">ζῆλος</span> に、<span lang="el">τοῦ οἴκου σου</span> という属格句が続いています。</p>
                    <p><strong>ここから言えること：</strong>動作・感情を表す名詞と属格句の関係が問題になります。ただし、動作名詞があるという手がかりは両候補に共通するため、それだけでは「熱意を向ける側」か「熱意を示す側」かを決められません。</p>
                </div>
            </div>
        </div>`;
    } else if (
        targetLemma === 'Χριστός' &&
        /(?:ROM|Romans)[\s._:-]*8[\s._:-]*35(?:[\s._:!-]|$)/i.test(refText) &&
        hasLemma('ἀγάπη') &&
        candidateIds.has('genitive.subjective') &&
        candidateIds.has('genitive.objective')
    ) {
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p>Con un <strong>genitivo subjetivo</strong>, es «el amor con el que Cristo nos ama»; con un <strong>genitivo objetivo</strong>, es «el amor dirigido hacia Cristo». La diferencia está en si Cristo es quien ama o aquel hacia quien se dirige el amor.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p><strong>Lo que puede confirmarse en el texto: </strong><span lang="el">τοῦ Χριστοῦ</span> es un genitivo que sigue a <span lang="el">τῆς ἀγάπης</span>.</p>
                    <p><strong>Lo que puede decirse a partir de esto: </strong>La forma gramatical por sí sola no resuelve si Cristo es el sujeto que ama o el objeto del amor. El contexto que lo rodea y el sentido de la expresión «el amor de Cristo» en su conjunto deben sopesarse juntos. Las puntuaciones del análisis no expresan probabilidades.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p>With a <strong>subjective genitive</strong>, it is "the love with which Christ loves us"; with an <strong>objective genitive</strong>, it is "love directed toward Christ." The difference is whether Christ is the one who loves, or the one to whom love is directed.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p><strong>What can be confirmed from the text: </strong><span lang="el">τοῦ Χριστοῦ</span> is a genitive following <span lang="el">τῆς ἀγάπης</span>.</p>
                    <p><strong>What can be said from this: </strong>The grammatical form alone does not settle whether Christ is the subject who loves or the object of love. The surrounding context and the sense of the expression "the love of Christ" as a whole must be weighed together. The analysis scores do not express probabilities.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p><strong>主語的属格</strong>なら「キリストが私たちを愛する愛」、<strong>目的語的属格</strong>なら「キリストに向けられた愛」です。違いは、キリストが愛する側なのか、愛を向けられる側なのかにあります。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p><strong>本文で確認できること：</strong><span lang="el">τοῦ Χριστοῦ</span> は <span lang="el">τῆς ἀγάπης</span> に続く属格です。</p>
                    <p><strong>ここから言えること：</strong>文法上の形だけでは、キリストが愛する主体か、愛の対象かは確定しません。前後の文脈と「キリストの愛」という表現全体の意味を合わせて判断する必要があります。解析スコアは確率を表すものではありません。</p>
                </div>
            </div>
        </div>`;
    }

    /* 一般的な候補比較：人手レビュー済みの型の組み合わせだけを比較する。 */
    if (!comparisonHTML &&
        candidateIds.has('nominal_syntax.nested_np') &&
        candidateIds.has('nominal_syntax.modified_np')) {
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>una diferencia estructural: si otra frase nominal está incrustada dentro de la frase nominal (una estructura anidada, como el patrón de Apolonio de artículo–sustantivo–artículo–sustantivo en genitivo), o si un modificador está simplemente unido al sustantivo principal.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p>Estos dos son candidatos que explican la estructura de la frase nominal. Cuál es el apropiado se juzga observando no solo la palabra en cuestión, sino también la disposición y la agrupación de los artículos, sustantivos y modificadores que la rodean. La estructura no queda resuelta solo por el orden o la puntuación de los candidatos.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>a structural difference — whether another noun phrase is embedded inside the noun phrase (a nested structure, such as the Apollonius pattern of article–noun–article–genitive noun), or a modifier is simply attached to the head noun.</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p>These two are candidates that explain the structure of the noun phrase. Which is appropriate is judged by looking not only at the word in question, but at the arrangement and grouping of the surrounding articles, nouns, and modifiers. The structure is not settled by the order or the score of the candidates alone.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong>名詞句の内部に別の名詞句が組み込まれているか（入れ子。冠詞・名詞・冠詞・属格名詞という Apollonius 型など）、中心語に修飾語が付いているだけか、という構造上の違いです。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p>この二つは名詞句の構造を説明する候補です。どちらが適切かは、対象語だけでなく、周囲の冠詞・名詞・修飾語の並びとまとまりを確認して判断します。候補の表示順位やスコアだけで構造が確定するわけではありません。</p>
                </div>
            </div>
        </div>`;
    } else if (!comparisonHTML &&
        candidateIds.has('genitive.subjective') &&
        candidateIds.has('genitive.possessive') &&
        candidateIds.has('genitive.objective')) {
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p><strong>Genitivo subjetivo:</strong> el genitivo expresa el lado que realiza la acción. Si el sustantivo de acción se sustituye por un verbo, el genitivo corresponde a su sujeto.</p>
            <p><strong>Genitivo posesivo:</strong> el genitivo expresa una relación de posesión, pertenencia o atribución respecto al sustantivo principal. A veces puede traducirse con «de».</p>
            <p><strong>Genitivo objetivo:</strong> el genitivo expresa aquello hacia lo que se dirige la acción. Si el sustantivo de acción se sustituye por un verbo, el genitivo corresponde a su objeto.</p>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>una diferencia de significado: si el genitivo expresa «el lado que actúa», «una relación de posesión o pertenencia» o «lo que recibe la acción».</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p>La forma del genitivo por sí sola no puede distinguir los tres usos. El significado del sustantivo principal, su relación con el genitivo y el contexto se sopesan juntos. Las puntuaciones de los candidatos no expresan probabilidades.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p><strong>Subjective genitive:</strong> the genitive expresses the side that performs the action. If the action noun is replaced by a verb, the genitive corresponds to its subject.</p>
            <p><strong>Possessive genitive:</strong> the genitive expresses a relation of possession, belonging, or attribution to the head noun. It can sometimes be translated with "of."</p>
            <p><strong>Objective genitive:</strong> the genitive expresses what the action is directed toward. If the action noun is replaced by a verb, the genitive corresponds to its object.</p>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>a difference in meaning — whether the genitive expresses "the side that acts," "a relation of possession or belonging," or "what receives the action."</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p>The genitive form alone cannot distinguish the three usages. The meaning of the head noun, its relation to the genitive, and the context are weighed together. The candidate scores do not express probabilities.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p><strong>主語的属格：</strong>属格が動作を行う側を表します。動作名詞を動詞に置き換えると、属格が主語に当たります。</p>
            <p><strong>所有属格：</strong>属格が中心語との所有・所属・帰属の関係を表します。「〜の」と訳せることがあります。</p>
            <p><strong>目的語的属格：</strong>属格が動作の向かう対象を表します。動作名詞を動詞に置き換えると、属格が目的語に当たります。</p>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong>属格が「動作をする側」「所有・帰属の関係」「動作を受ける対象」のどれを表すか、という意味上の違いです。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p>属格という形だけで三つの用法を区別できるわけではありません。中心となる名詞の意味、属格との関係、文脈を合わせて判断します。候補のスコアは確率を表すものではありません。</p>
                </div>
            </div>
        </div>`;
    } else if (!comparisonHTML &&
        candidateIds.has('nominal_syntax.modified_np') &&
        candidateIds.has('nominal_syntax.multiple_modifier_np')) {
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>el número de modificadores unidos al sustantivo principal. Si hay varios modificadores, entra en la categoría de «frase nominal con múltiples modificadores»; si solo hay uno, en la de «frase nominal modificada» (una frase con múltiples modificadores es un tipo de frase nominal modificada).</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p>Comprueba cuántos modificadores —adjetivos, genitivos, participios, frases preposicionales y similares— están unidos alrededor de esta palabra. No se decide solo por el orden o la puntuación de los candidatos.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>the number of modifiers attached to the head noun. If there are several modifiers, it falls under a "multiple-modifier noun phrase"; if there is only one, under a "modified noun phrase" (a multiple-modifier phrase is a kind of modified noun phrase).</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p>Check how many modifiers — adjectives, genitives, participles, prepositional phrases, and the like — are attached around this word. It is not decided by the order or the score of the candidates alone.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong>中心となる名詞に付く修飾語の数です。修飾語が複数付いていれば「複数修飾名詞句」、1つだけなら「修飾名詞句」の範囲に入ります（複数修飾は修飾名詞句の一種です）。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p>この語の周りで、形容詞・属格・分詞・前置詞句などの修飾語がいくつ付いているかを確認してください。候補の表示順位やスコアだけで決まるものではありません。</p>
                </div>
            </div>
        </div>`;
    } else if (!comparisonHTML &&
        candidateIds.has('infinitive.time') &&
        rawIds.has('infinitive.means')) {
        /* ἐν τῷ＋不定詞：時と手段は同じ形で競合する（一次監査・不定詞）。
           手段不定詞は確度が低く候補一覧には出ないため、表示される
           時の不定詞を起点に、しきい値未満の手段候補で発火させる。 */
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>una diferencia en la relación de significado: si <span lang="el">ἐν τῷ</span> + infinitivo expresa el «tiempo», simultáneo al acontecimiento de la cláusula principal, o el «medio», «al hacer…».</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p><strong>Lo que puede confirmarse en el texto: </strong>La forma —la preposición <span lang="el">ἐν</span> y el artículo <span lang="el">τῷ</span> seguidos de un infinitivo— es exactamente la misma para el tiempo y para el medio.</p>
                    <p><strong>Lo que puede decirse a partir de esto: </strong>La forma por sí sola no puede decidirlo; el significado del verbo principal y el flujo de la oración se sopesan juntos. La lectura de medio es poco frecuente, y la lectura de tiempo es cercana a la lectura por defecto.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>a difference in the relation of meaning — whether <span lang="el">ἐν τῷ</span> + infinitive expresses the "time," simultaneous with the event of the main clause, or the "means," "by doing …".</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p><strong>What can be confirmed from the text: </strong>The form — the preposition <span lang="el">ἐν</span> and the article <span lang="el">τῷ</span> followed by an infinitive — is exactly the same for time and for means.</p>
                    <p><strong>What can be said from this: </strong>The form alone cannot decide it; the meaning of the main verb and the flow of the sentence are weighed together. The means reading is infrequent, and the time reading is close to the default reading.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong><span lang="el">ἐν τῷ</span>＋不定詞が、主節の出来事と同時の「時」を表すか、「〜することによって」という「手段」を表すか、という意味関係の違いです。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p><strong>本文で確認できること：</strong>前置詞 <span lang="el">ἐν</span> と冠詞 <span lang="el">τῷ</span> に不定詞が続く形は、時と手段とでまったく同じです。</p>
                    <p><strong>ここから言えること：</strong>形式だけでは決まらず、主節の動詞の意味と文の流れを合わせて判断します。手段の読みは頻度が低く、時の読みが既定に近い読みです。</p>
                </div>
            </div>
        </div>`;
    } else if (!comparisonHTML &&
        targetLemma === 'ὅτι' &&
        (candidateIds.has('clause.substantival_hoti') || rawIds.has('clause.causal_hoti'))) {
        /* ὅτι 節：内容と理由は形が同じで、理由側には形式の標識がない
           （一次監査・節。理由節は残余条件の定義で unresolved）。
           理由節は確度が低く候補一覧に出ないことがあるため、
           内容節の表示またはしきい値未満の理由節候補で発火させる。 */
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>una diferencia en el papel de la cláusula: si la cláusula con <span lang="el">ὅτι</span> expresa el «contenido» de una declaración, un pensamiento o un reconocimiento («que…»), o la «razón» del acontecimiento de la cláusula principal («porque…»).</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p><strong>Lo que puede confirmarse en el texto: </strong>Una pista para la lectura de contenido es si un verbo que expresa decir, pensar, saber o algo similar está antes de <span lang="el">ὅτι</span>.</p>
                    <p><strong>Lo que puede decirse a partir de esto: </strong>La lectura de razón no tiene un marcador formal fijo y se juzga por la conexión de significado con la cláusula principal. Como la forma es la misma, ambas lecturas pueden ser válidas, según el contexto.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>a difference in the role of the clause — whether the <span lang="el">ὅτι</span> clause expresses the "content" of an utterance, a thought, or a recognition ("that …"), or the "reason" for the event of the main clause ("because …").</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p><strong>What can be confirmed from the text: </strong>A clue for the content reading is whether a verb expressing saying, thinking, knowing, or the like stands before <span lang="el">ὅτι</span>.</p>
                    <p><strong>What can be said from this: </strong>The reason reading has no fixed formal marker and is judged by the connection of meaning with the main clause. Because the form is the same, both readings can hold, depending on the context.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong><span lang="el">ὅτι</span> 節が、発話・思考・認識の「内容（〜ということ）」を表すか、主節の出来事の「理由（〜だから）」を表すか、という節の役割の違いです。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p><strong>本文で確認できること：</strong><span lang="el">ὅτι</span> の前に「言う・思う・知る」など発話や認識を表す動詞があるかどうかが、内容節の手がかりになります。</p>
                    <p><strong>ここから言えること：</strong>理由の読みには決まった形式の標識がなく、主節との意味のつながりで判断します。形が同じため、文脈によっては両方の読みが成り立つことがあります。</p>
                </div>
            </div>
        </div>`;
    } else if (!comparisonHTML &&
        candidateIds.has('clause.purpose_hina')) {
        /* ἵνα 節：目的だけでなく願望・要求の内容も表す（一次監査・節。
           機能候補の併記が実態に合うとされた）。単独候補への注記として出す。 */
        comparisonHTML = _isEsCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Cómo distinguir las lecturas</div>
            <p class="rn-syntax-comparison-difference"><strong>Diferencia: </strong>una cláusula con <span lang="el">ἵνα</span> puede expresar no solo el propósito, «para que…», sino también el contenido de un deseo, una orden o una petición, «que…».</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Base</div><div class="rn-syntax-evidence-body">
                    <p><strong>Lo que puede decirse a partir de esto: </strong>La forma —<span lang="el">ἵνα</span> con el subjuntivo— por sí sola no decide entre el propósito y el contenido; el significado del verbo que introduce la cláusula y el contexto se sopesan juntos.</p>
                </div>
            </div>
        </div>`
        : _isEnCmp
        ? `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">Telling the readings apart</div>
            <p class="rn-syntax-comparison-difference"><strong>Difference: </strong>an <span lang="el">ἵνα</span> clause can express not only purpose, "in order to …", but also the content of a wish, a command, or a request, "that … should …".</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">Basis</div><div class="rn-syntax-evidence-body">
                    <p><strong>What can be said from this: </strong>The form — <span lang="el">ἵνα</span> with the subjunctive — alone does not decide between purpose and content; the meaning of the verb that introduces the clause and the context are weighed together.</p>
                </div>
            </div>
        </div>`
        : `<div class="rn-syntax-comparison">
            <div class="rn-syntax-comparison-title">読み分け</div>
            <p class="rn-syntax-comparison-difference"><strong>違い：</strong><span lang="el">ἵνα</span> 節は「〜するために」という目的だけでなく、「〜するように」という願望・命令・要求の内容を表すこともあります。</p>
            <div class="rn-syntax-evidence"><div class="rn-syntax-evidence-label">根拠</div>
                <div class="rn-syntax-evidence-body">
                    <p><strong>ここから言えること：</strong><span lang="el">ἵνα</span> と接続法という形だけでは目的か内容かは決まらず、節を導く動詞の意味と文脈を合わせて判断します。</p>
                </div>
            </div>
        </div>`;
    }
    /*
     * 汎用の候補比較は出さない。候補の定義は上の候補一覧で一度だけ示し、
     * ここで並べ直すと重複になる。人手で読み分けを書いた組み合わせだけを
     * 上で追加し、それ以外は何も足さない（静寂優先）。
     * 見出しは呼び出し側のグループ見出し「分析候補・統語情報」に一本化し、
     * このブロック内には小見出しを付けない。
     */
    /* 識別不能ペアの読み分け（単位B / G5）: 候補が表示される場合も、ペアが
       揃っていれば読み分けを末尾に足す（既存の読み分けとは独立に付く）。 */
    comparisonHTML += _syntaxPairBlockHTML(rawIds);
    return `<div class="rn-syntax-candidates">${tiedNotice}${primaryHTML}${otherHTML}${comparisonHTML}</div>`;
}

async function _renderReadingNotes(p) {
    const area = document.getElementById('reading-notes-area');
    if (!area) return;
    area.scrollTop = 0;

    const word   = p.word   || '-';
    const pos    = p.pos    || '';
    const mood   = p.mood   || '';
    const tense  = p.tense  || '';
    const voice  = p.voice  || '';
    const ref    = p.ref    || '';
    const lemma  = p.lemma  || '';
    const jaWord = (AppState.inspect.data?.jaWord) || '';
    const strong = normalizeStrong(AppState.inspect.data?.strong);
    const w      = jaWord ? `「${jaWord}」` : 'この語';

    /* ═══════════════════════════════════════════════════════
       Reading prose — ReadingFormatter 統一版
       本関数は文章生成を一切行わない。words配列中の対象語idxを
       _buildWordResonanceText()（wlv-detail-resonance/wlv-pn-proseと同じ
       関数）へ渡し、ReadingFormatter.format()の戻り値をそのまま描画する。
       表示すべき内容が無ければ null のまま → 固定文字列で埋めない（静寂優先）。
       ═══════════════════════════════════════════════════════ */
    let wordProseText = null;
    let phraseReadingHTML = '';
    let observationHTML = '';
    if (ref && Array.isArray(_wlvWordCache)) {
        const targetIdx = _wlvWordCache.findIndex(t => t.ref === ref);
        if (targetIdx !== -1) {
            wordProseText = await _buildWordResonanceText(_wlvWordCache, targetIdx);
            /* Phase 25B-2: Phrase Reading（かたまりの読書メモ）。
               失敗・該当なしは '' = 既存表示のみ（Failure Mode 現状維持）。 */
            try {
                phraseReadingHTML =
                    (await _buildPhraseReadingHTML(_wlvWordCache, targetIdx)) || '';
            } catch (_) { phraseReadingHTML = ''; }
            /* Phase 25B-3: Observation（どこを見ると読みやすいかの一文）。
               失敗・該当なしは '' = 既存表示のみ。
               Phase ESM-44-B: 生成結果はそのまま _naturalizeObservationText() へ通す
               （表示層のみの角括弧引用置換、生成ロジックは無変更）。 */
            try {
                observationHTML = _naturalizeObservationText((await _buildObservationHTML(
                    _wlvWordCache, targetIdx, [wordProseText, phraseReadingHTML])) || '');
            } catch (_) { observationHTML = ''; }
        }
    }
    const proseHTML = wordProseText
        ? `<div class="rn-prose reading-block"><p class="rn-prose-text reading-prose">${wordProseText}</p></div>`
        : '';

    /* FLOW-TREE-11-A: NeighborhoodView（境界確認 Prototype, Matthew 1:1 のみ）。
       既存の SyntaxAnalyzer/PhraseAnalyzer/ClauseAnalyzer/ReadingFormatter の
       いずれも呼び出さない、完全に独立した経路。対象外の ref では '' が返り、
       既存表示に一切影響しない（Failure Mode, _buildFlowTreeNeighborhoodViewHTML 内で吸収済み）。 */
    const neighborhoodViewHTML = await _buildFlowTreeNeighborhoodViewHTML(ref, AppState.studyTarget?.verseId);

    /* ═══════════════════════════════════════════════════════
       Lexicon data (async)
       ═══════════════════════════════════════════════════════ */
    await _ensureSemanticData();
    const resolvedId  = (AppState.inspect.data?.lemmaId) || _resolveLemmaId(strong);
    const lexEntry    = resolvedId ? _lexiconData?.[resolvedId] : null;

    /* Stage E: 3 層分離（docs/display-label.md）
       ② 語義見出し(Display Label) = ReadingLexicon.getDisplayLabel（lemma 単位・
          文脈非依存・短い代表訳）。gloss_ja(③説明) も jaWord(①読む日本語) も見出しの
          SSOT にしない。getDisplayLabel は NT 全トークン 100% 供給（未供給は
          jaWord への安全網のみ・実トークンでは発火しない）。 */
    const displayLabel    = (window.App?.readingLexicon?.getDisplayLabel(resolvedId)) || jaWord || '';
    /* ③ 語義説明は abbottSmith（下の語義セクション）が担う。gloss_ja は見出しに使わない */
    const _enUiAbbott = window.I18N && I18N.lang !== 'ja';
    const _abbottDigits = resolvedId ? resolvedId.replace(/^grc:G/i, '') : '';
    if (_enUiAbbott && _abbottDigits && !abbottSmithDict) await loadDict();
    const abbottSmithText = _enUiAbbott
        ? (abbottSmithDict?.[_abbottDigits]?.descriptionEn || '')
        : (lexEntry?.abbottSmith || '');
    const contexts        = lexEntry?.contexts || {};
    const synopticRefs    = contexts.synoptic_refs || [];
    const paulineRefs     = contexts.pauline_refs  || [];

    const qsConcord = new URLSearchParams();
    if (p.word)   qsConcord.set('word',   p.word);
    if (lemma)    qsConcord.set('lemma',  lemma);
    if (ref)      qsConcord.set('ref',    ref);
    if (p.pos)    qsConcord.set('pos',    p.pos);
    if (p.tense)  qsConcord.set('tense',  p.tense);
    if (p.mood)   qsConcord.set('mood',   p.mood);
    if (p.voice)  qsConcord.set('voice',  p.voice);
    /* 動詞形（分詞含む）では格・数・性を送らない。名詞的品詞のみ */
    if (p.pos !== 'V') {
        if (p.gender) qsConcord.set('gender', p.gender);
        if (p.number) qsConcord.set('number', p.number);
        if (p.case)   qsConcord.set('case',   p.case);
    }
    qsConcord.set('layers', 'lemma,morph');
    qsConcord.set('tool',   'search');
    const concordURL = `search-tool.html?${qsConcord.toString()}`;

    /* [DIAG] StudyPanel → search-tool 遷移ログ */
    console.info('[StudyPanel→search] 元トークン rawMorph:', p._rawMorph);
    console.info('[StudyPanel→search] parseMorphForSearch 入力:', p._rawMorph);
    console.info('[StudyPanel→search] parseMorphForSearch 出力 (openStudyPanel 済):', {
        pos: p.pos, tense: p.tense, mood: p.mood, voice: p.voice,
        case: p.case, number: p.number, gender: p.gender,
    });
    console.info('[StudyPanel→search] concordURL パラメータ:', {
        word: p.word || '', lemma: lemma || '',
        pos: p.pos || '', tense: p.tense || '', mood: p.mood || '', voice: p.voice || '',
        number: p.number || '', case: p.case || '', gender: p.gender || '',
        person: '(URLには付与しない)', layers: 'lemma,morph',
    });
    console.info('[StudyPanel→search] concordURL:', concordURL);

    /* ── Morph grid (Level 2) ── */
    const JPN_FULL = _morphFull();
    const morphRows = [];
    if (p.pos)    morphRows.push({ k:_T('morph.pos', '品詞'), v: JPN_FULL.pos[p.pos]       || p.pos,    core:true  });
    if (p.tense)  morphRows.push({ k:_T('morph.tense', '時制'), v: JPN_FULL.tense[p.tense]   || p.tense,  core:true  });
    if (p.mood)   morphRows.push({ k:_T('morph.mood', '法'),   v: JPN_FULL.mood[p.mood]     || p.mood,   core:true  });
    if (p.voice)  morphRows.push({ k:_T('morph.voice', '態'),   v: JPN_FULL.voice[p.voice]   || p.voice,  core:false });
    if (p.case)   morphRows.push({ k:_T('morph.case', '格'),   v: JPN_FULL.case[p.case]     || p.case,   core:false });
    if (p.number) morphRows.push({ k:_T('morph.number', '数'),   v: JPN_FULL.number[p.number] || p.number, core:false });
    if (p.gender) morphRows.push({ k:_T('morph.gender', '性'),   v: JPN_FULL.gender[p.gender] || p.gender, core:false });

    /* 構造軸（冠詞付き不定詞）: 機能候補とは別の「形の事実」として、
       原文から確認できる情報に1行置く。検出は syntax-analyzer の共通
       ヘルパー（desktop / mobile 共用、確度なし）。 */
    if (p.mood === 'infinitive' && Array.isArray(_wlvWordCache)) {
        const _structFn = window.App?.syntax?.articularInfinitiveStructure;
        const _structIdx = _wlvWordCache.findIndex(t => t.ref === ref);
        const _struct = (typeof _structFn === 'function' && _structIdx >= 0)
            ? _structFn(_wlvWordCache, _structIdx) : null;
        if (_struct) morphRows.push({ k: _T('panel.structureLabel', '構造'), v: (window.I18N && I18N.lang === 'es') ? (_struct.label_es || '') : (window.I18N && I18N.lang === 'en') ? (_struct.label_en || _struct.label_ja) : _struct.label_ja, core: false });
    }

    const morphGridHTML = morphRows.length
        ? `<div class="rn-morph-grid">${morphRows.map(r =>
            `<span class="rn-morph-key">${r.k}</span><span class="rn-morph-val${r.core?' core':''}">${_escH(r.v)}</span>`
          ).join('')}</div>`
        : '';

    /* ── Morphological candidates (Type-A homographs) ── */
    const PERSON_JP = _morphFull().person;
    let morphCandidatesHTML = '';
    if (Array.isArray(p._morphCandidates) && p._morphCandidates.length > 0) {
        const candItems = p._morphCandidates.map(c => {
            const parts = [_morphFull().pos.V];
            if (c.mood) parts.push(JPN_FULL.mood[c.mood] || c.mood);
            if (c.voice) parts.push(JPN_FULL.voice[c.voice] || c.voice);
            if (c.tense) parts.push(JPN_FULL.tense[c.tense] || c.tense);
            if (c.mood === 'participle') {
                if (c.gender) parts.push(JPN_FULL.gender[c.gender] || c.gender);
                if (c.number) parts.push(JPN_FULL.number[c.number] || c.number);
                if (c.case) parts.push(JPN_FULL.case[c.case] || c.case);
            } else {
                if (c.person) parts.push(_personText(c.person));
                if (c.number) parts.push(JPN_FULL.number[c.number] || c.number);
            }
            return `<li class="rn-mc-item"><div class="rn-mc-chips">${parts.map(part => `<span class="rn-mc-chip">${_escH(part)}</span>`).join('')}</div></li>`;
        }).join('');
        morphCandidatesHTML = `<div class="rn-mc-details"><div class="rn-mc-label">${_T('panel.otherForms', '他に成立する形態')}</div><ul class="rn-mc-list">${candItems}</ul></div>`;
    }

    /* ── Etymology / composition (Level 2) — 単純語は非表示 ── */
    const compositionParts = getWordComposition(resolvedId || AppState.inspect.data?.lemmaId || null);
    const etymologyHTML = compositionParts
        ? `<div class="rn-etymology">${_T('panel.etymology', '語源')}&emsp;<span class="rn-etymology-parts">${_buildEtymPartsHTML(compositionParts)}</span></div>`
        : '';

    /* 使用傾向は検索ツールで確認するため、第三層では重複表示しない。 */

    /* ── Experienced reader labels ── */
    let expLabelHTML = '';
    if (window.App.onboarding?.getState()?.experiencedReader && pos === 'V') {
        const labels = [];
        if (typeof classifyMiddleVoice === 'function') {
            const mvc = classifyMiddleVoice(lemma, voice);
            if (mvc) labels.push(_T('exp.middleVoice', '中動態として読むこともできます'));
        }
        if (typeof detectDivinePassive === 'function' && typeof decodeMorph === 'function') {
            const tokenForDP  = { word, lemma, morph: p._rawMorph };
            const verseTokens = [];
            const dp = detectDivinePassive(tokenForDP, verseTokens, decodeMorph);
            if (dp && dp.isDivinePassive) labels.push(_T('exp.impliedAgent', '行為者が暗示されています'));
        }
        if (['indicative','subjunctive','imperative'].includes(mood) && pos === 'V') {
            const hasExplicitSubject = (AppState.inspect.data?.rawMorph || '').includes('1S')
                || (AppState.inspect.data?.rawMorph || '').includes('2S');
            if (!hasExplicitSubject && ['1st','2nd'].some(pp => (p._rawMorph || '').includes(pp))) {
                labels.push(_T('exp.subjectOmitted', '主語が省略されています'));
            }
        }
        if (labels.length > 0) {
            expLabelHTML = `<div class="rn-exp-labels">${
                labels.map(l => `<span class="rn-exp-label">${l}</span>`).join('')
            }</div>`;
        }
    }

    /* ── Abbott-Smith full text (Level 2) ── */
    const abbottFullHTML = abbottSmithText
        ? `<div class="rn-dict-full-section">
               <div class="rn-dict-full-text">${_enUiAbbott ? _renderDictionaryLinkedText(abbottSmithText) : _renderAbbottFullText(abbottSmithText)}</div>
           </div>`
        : '';

    /* 辞書的な説明は下の辞書全文のみを表示する。 */
    const glossesHTML = '';

    /* Phase ESM-9: Referent Evidence を Reading Notes 本文末尾へ統合
       （ESM-8のStudyPanelヘッダー表示#rcb-container配下は廃止）。
       表示するのは referentEvidence が存在する場合のみ（静寂設計・ESM-7仕様維持）。
       文言・生成源は変更しない：bible_data.referent の transcription のみ、
       createReferentEvidence()/_resolveReferentEvidenceText() をそのまま利用する。 */
    const _reText = _resolveReferentEvidenceText(AppState.inspect.data?.referentEvidence);
    const referentEvidenceHTML = _reText
        ? `<div class="rn-referent-evidence" style="margin-top:var(--space-md);padding-top:var(--space-sm);font-size:var(--text-caption);color:var(--text-sub);">${(window.I18N && I18N.lang === 'es') ? `Esta palabra se refiere a "${_escH(_reText)}".` : (window.I18N && I18N.lang === 'en') ? `This word refers to "${_escH(_reText)}".` : `この語は「${_escH(_reText)}」を指しています。`}</div>`
        : '';

    /* Phase ESM-39: Subjref Evidence を Referent Evidence の直後へ統合
       （docs/specs/LAYER_ARCHITECTURE.md §4「Subjref」ESM-38-A/B確定仕様）。
       表示するのは subjrefEvidence が存在する場合のみ（静寂設計）。
       参照先の取得は bible_data.subjref の transcription のみ。
       表示文は ReadingFormatter.formatSubjrefEvidence() で参照関係として表現し、
       文法上の主語だと断定しない。 */
    const _subjText = _resolveSubjrefEvidenceText(AppState.inspect.data?.subjrefEvidence);
    const _subjEvidenceText = _subjText
        ? _wallacePipeline?.rf?.formatSubjrefEvidence(_subjText)
        : null;
    const subjrefEvidenceHTML = _subjEvidenceText
        ? `<div class="rn-subjref-evidence" style="margin-top:var(--space-md);padding-top:var(--space-sm);font-size:var(--text-caption);color:var(--text-sub);">${_escH(_subjEvidenceText)}</div>`
        : '';

    /* 訳し分け・繰り返し Evidence を読書メモ末尾へ統合（Referent/Subjref と同じ様式）。
       表示するのは対象の場合のみ（静寂設計）。 */
    const _trText = await _translationEvidenceText(ref);
    const translationEvidenceHTML = _trText
        ? `<div class="rn-translation-evidence" style="margin-top:var(--space-md);padding-top:var(--space-sm);font-size:var(--text-caption);color:var(--text-sub);">${_escH(_trText)}</div>`
        : '';
    const _repText = _repetitionEvidenceText(_wlvWordCache, Array.isArray(_wlvWordCache) ? _wlvWordCache.findIndex(t => t.ref === ref) : -1);
    const repetitionEvidenceHTML = _repText
        ? `<div class="rn-repetition-evidence" style="margin-top:var(--space-md);padding-top:var(--space-sm);font-size:var(--text-caption);color:var(--text-sub);">${_escH(_repText)}</div>`
        : '';

    /* 語の読書メモは節メモと同じ開閉 UI。初期状態は開いて既存の可視性を保つ。 */
    const wordReadingMemoBody = [
        proseHTML ? `<div data-study-section="reading">${proseHTML}</div>` : '',
        phraseReadingHTML ? `<div data-study-section="phrase">${phraseReadingHTML}</div>` : '',
        observationHTML ? `<div data-study-section="observation">${observationHTML}</div>` : '',
        referentEvidenceHTML ? `<div data-study-section="referent">${referentEvidenceHTML}</div>` : '',
        subjrefEvidenceHTML ? `<div data-study-section="subjref">${subjrefEvidenceHTML}</div>` : '',
        translationEvidenceHTML ? `<div data-study-section="translation">${translationEvidenceHTML}</div>` : '',
        repetitionEvidenceHTML ? `<div data-study-section="repetition">${repetitionEvidenceHTML}</div>` : ''
    ].filter(Boolean).join('');
    const wordReadingMemoHTML = wordReadingMemoBody
        ? `<details class="rn-word-reading-note" open><summary>${_T('panel.wordReadingNote', 'この語の読書メモ')}</summary>${wordReadingMemoBody}</details>`
        : '';

    const syntaxLabelHTML = await _buildSyntaxLabelHTML(_wlvWordCache, ref);

    const analysisGroupHTML = (morphCandidatesHTML || syntaxLabelHTML)
        ? `<div class="rn-l3-group" data-study-group="analysis"><div class="rn-l3-group-label">${_T('panel.analysisInfo', '分析候補・統語情報')}</div>${(morphCandidatesHTML ? `<div data-study-section="candidates">${morphCandidatesHTML}</div>` : '')}${(syntaxLabelHTML ? `<div class="rn-syntax-labels" data-study-section="syntax">${syntaxLabelHTML}</div>` : '')}</div>`
        : '';
    const lexicalGroupHTML = (etymologyHTML || abbottFullHTML)
        ? `<div class="rn-l3-group" data-study-group="lexical"><div class="rn-l3-group-label">${_T('panel.lexicalMaterials', '語義・語彙資料')}</div><div class="rn-l3-group-content">${(etymologyHTML ? `<div data-study-section="etymology">${etymologyHTML}</div>` : '')}${(abbottFullHTML ? `<div data-study-section="abbott">${abbottFullHTML}</div>` : '')}</div></div>`
        : '';

    /* ═══════════════════════════════════════════════════════
       HTML 出力 — 4階層構造
       ═══════════════════════════════════════════════════════ */
    area.innerHTML = `
        <!-- ギリシャ語見出し・日本語代表語義は画面ヘッダーに表示済み。重複する空領域は生成しない。 -->
        ${glossesHTML}

        ${wordReadingMemoHTML}

        ${expLabelHTML ? `<div data-study-section="explabel">${expLabelHTML}</div>` : ''}

        <div data-study-section="structure">${neighborhoodViewHTML}</div>

        <!-- 語の役割の局所表示（選択語の文全体をパン可能な枠に表示）: _fillRnRelationSlot が非同期注入 -->
        <div id="rn-relation-slot" class="role-reading-view"></div>

        <!-- LEVEL 3: 詳細資料は2つの入口（形と関係／辞書的意味）から任意に開く -->
        ${(morphGridHTML || analysisGroupHTML) ? `
        <details class="rn-level-section rn-l3-entry" data-study-section="morphology" open>
            <summary class="rn-l3-entry-summary">${_T('panel.formAndRelations', '形と関係を見る')}</summary>
            <div class="rn-level-body">
                ${(morphGridHTML ? `<div class="rn-l3-group" data-study-group="facts"><div class="rn-l3-group-label">${_T('panel.factsFromText', '原文から確認できる情報')}</div>${morphGridHTML}</div>` : '')}
                ${analysisGroupHTML}
            </div>
        </details>` : ''}
        ${lexicalGroupHTML ? `
        <details class="rn-level-section rn-l3-entry" data-study-section="lexical">
            <summary class="rn-l3-entry-summary">${_T('panel.lexicalMeaning', '辞書的意味を見る')}</summary>
            <div class="rn-level-body">
                ${lexicalGroupHTML}
            </div>
        </details>` : ''}

${LN_RELATED_WORDS_ENABLED ? `
        <!-- TEMPORARILY DISABLED: LN 由来の関連語表示。再開条件は docs/DATA_LICENSE.md を参照。 -->
        <details class="rn-level-section" data-study-section="semantic">
            <summary><span class="rn-level-arrow">${icon('chevronRight')}</span>関連する語を調べる</summary>
            <div class="rn-level-body">
                <div id="rn-semantic-layers"></div>
            </div>
        </details>` : ''}

    `;

    /* LN 由来の関連語表示は一時停止中。フラグ有効時のみ注入する。 */
    if (LN_RELATED_WORDS_ENABLED) {
        _injectStudyPanelContent(
            document.getElementById('rn-semantic-layers'),
            strong, resolvedId, word
        );
    }

    /* 語の役割の局所表示を非同期注入（世代管理は filler 側）。 */
    _fillRnRelationSlot(ref);

    /* SF-14: Structure Flow の frame/referent 弧をレイアウト後に描画（無ければ無処理）。 */
    _sfScheduleEnhance();
}

/* ══════════════════════════════════════════
   Semantic layer injection
   LN Layer / Cluster Layer / Concordance
   ══════════════════════════════════════════ */

/**
 * SSOT (Single Source of Truth):
 * index.html is the only authoritative source for data ACCESS.
 *
 * - getTokens()     : sole getter for the token array (ALL_TOKENS)
 * - getLemmaIndex() : sole getter for the lemma index (window.lemmaIndex)
 *
 * search.html role  : DATA INGESTION ONLY
 *   - Builds ALL_TOKENS via _indexChapter()
 *   - Builds window.lemmaIndex / window.morphIndex
 *   - Does NOT define getTokens() or getLemmaIndex()
 *   - Does NOT call these getters
 *
 * All Layers (LN / Cluster / Graph / Concordance) access data
 * exclusively through the two getters defined below.
 */

/* ──────────────────────────────────────────────────────────────
   Data accessors — defined here, used everywhere (index.html only)
   ────────────────────────────────────────────────────────────── */

/** Returns the full token array built by search.html. */
function getTokens() {
    return typeof ALL_TOKENS !== 'undefined' ? ALL_TOKENS : [];
}
/** Returns the current lemmaIndex built by search.html, or null. */
function getLemmaIndex() { return window.lemmaIndex || null; }

/* ──────────────────────────────────────────
   Shared lemmaIndex lookup helper
   Single access point for lemmaIndex.
   Used by Basic Concordance and Graph views.
   Graph / Fusion MUST go through this;
   they must never bypass Basic source rules.
   ────────────────────────────────────────── */

/**
 * _giListFromLemmaIndex(id)
 *
 * Returns the globalIdx array for a lemmaId by looking up its headword
 * via getLemmaIndex() (with NFD-normalised fallback).
 * This is the ONLY authorised access point for lemmaIndex lookups.
 * All concordance lookups — Basic and derived — must use this function.
 *
 * @param {string} id – lemmaId
 * @returns {number[]} array of globalIdx values (empty array if not found)
 */
function _giListFromLemmaIndex(id) {
    const idx = getLemmaIndex();
    if (!idx) return [];
    const entry  = _lexiconData[id];
    const hw     = entry?.headword || '';
    if (!hw) return [];
    const direct = idx.get(hw);
    if (direct && direct.length) return direct;
    const norm = hw.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[⸀⸁⸂⸃⌈⌉.,;:·]/g, '').replace(/ς/g, 'σ').toLowerCase().trim();
    return idx.get(norm) || [];
}

/**
 * _jaGlossFromLemmaId(id)
 * Returns a Japanese gloss for a lemma by looking up the first token occurrence.
 * Falls back to the English gloss from lexicon if no Japanese is found.
 */
function _jaGlossFromLemmaId(id) {
    const giList = _giListFromLemmaIndex(id);
    for (const gi of giList.slice(0, 5)) {
        const ja = getTokens()[gi]?.japanese;
        if (ja && ja !== '-' && ja !== '—') return ja;
    }
    return '';
}

/* ══════════════════════════════════════════════════════════════
   StudyPanel injection — orchestrator  [STABLE / DO NOT EXTEND]

   Fixed layer order (UI structure must not change):
     ① Identity          — word chip / gloss / ref
     ② Cluster Layer     — co-occurrence cluster display (auxiliary)
     ③ Basic Concordance — FACT LAYER (canonical / lemmaIndex only)
     ④ Semantic Graph    — graph view (auxiliary, derived from Basic)
     ⑤ Further View      — Morphology / Syntax / Abbott-Smith

   Data flow (enforced):
     window.lemmaIndex  →  _giListFromLemmaIndex()  →  Basic Concordance only
     domainCodes        →  _buildClusterLayerHTML() →  Cluster Layer only

   Invariants:
     • Basic Concordance result is identical for a given lemmaId regardless
       of whether Graph or Cluster data are present.
     • All lemmaIndex access goes through _giListFromLemmaIndex().
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════
   Semantic Domain / Cluster / Raw Code — 設計境界
   詳細: docs/semantic-domain.md

   ■ Raw Domain Code   clusterIndex のキー。ゼロ埋め有無で別エントリが存在する。
                       clusterIndex アクセスは必ず生コードで行うこと。
   ■ Normalized Code   ラベル辞書（semantic-domain-labels.json）用のキー。
                       clusterIndex のキーとして使用してはいけない。
   ■ Semantic Domain   Louw-Nida 意味領域。ユーザー向け表示分類。
   ■ Cluster           Semantic Domain 内の語群。1ドメインに複数存在しうる。
   ══════════════════════════════════════════════════════════════════ */

/**
 * UI ラベル取得専用。clusterIndex のアクセスには使用禁止。
 *
 * Raw Domain Code → Normalized Domain Code へ変換する。
 * 正規化後のコードは semantic-domain-labels.json のキーとして使用する。
 * domains-cluster-index.json (_clusterIndexData) のキーとして使ってはいけない。
 *
 * 変換規則: メジャードメイン部分（末尾3桁を除く全桁）の先頭ゼロを除去。
 * Examples: '033029' → '33029', '008002' → '8002', '064' → '64', '49' → '49'
 *
 * 根拠: ゼロ埋め有無で cluster は別エントリ（内容が異なる）。
 *       '013001'(19語) と '13001'(71語) は異なるクラスター。正規化して
 *       clusterIndex を引くと誤ったクラスターを参照する。docs/semantic-domain.md 参照。
 */
function _normalizeDomainCode(code) {
    const s = String(code).replace(/^0+/, '') || '0';
    if (s.length >= 4) {
        return String(parseInt(s.slice(0, -3), 10)) + s.slice(-3);
    }
    return s;
}

/**
 * Raw Code を受け取り、表示用ラベルのみ返す。
 *
 * clusterIndex へのアクセスは行わない。ラベル辞書 (_semanticDomainLabels) のみ参照。
 * 同じ Semantic Domain に属する複数の Raw Code（'013001' / '13001' 等）は
 * 正規化後に同一ラベルを返す — これは意図した動作（意味カテゴリーは同一のため）。
 *
 * Lookup order:
 *   1. subdomains[normalized]   specific subdomain label
 *   2. majorDomains[majorNum]   major domain fallback
 *   3. '分類 <code>'            final fallback — never returns empty
 */
function _getDomainLabel(code) {
    if (!_semanticDomainLabels) return `分類 ${code}`;
    const normalized = _normalizeDomainCode(code);

    const sub = _semanticDomainLabels.subdomains?.[normalized];
    if (sub?.title) return sub.title;

    let majorNum;
    if (normalized.length >= 4) {
        majorNum = String(parseInt(normalized.slice(0, -3), 10));
    } else {
        majorNum = normalized;
    }
    const major = _semanticDomainLabels.majorDomains?.[majorNum];
    if (major?.title) return major.title;

    return `分類 ${code}`;
}

/**
 * Semantic Domain オブジェクトを返す公開 API。
 *
 * Raw Domain Code を受け取り、ラベル辞書から解決した意味領域情報を返す。
 * 検索・フィルター・意味領域ブラウザ・関連語表示など、将来の機能で共通利用できる。
 *
 * clusterIndex へのアクセスは行わない。ラベル辞書 (_semanticDomainLabels) のみ参照。
 * 呼び出し前に _ensureSemanticData() が完了している必要がある。
 *
 * @param  {string} code  Raw Domain Code（例: '33029', '013001', '016'）
 * @returns {{
 *   rawCode:        string,   // 入力された生コードそのまま
 *   normalizedCode: string,   // 正規化コード（ラベル辞書キー）
 *   majorCode:      string,   // メジャードメイン番号（例: '33'）
 *   title:          string,   // 日本語タイトル（サブ or メジャー or フォールバック）
 *   titleEn:        string,   // 英語タイトル（存在する場合のみ）
 *   description:    string,   // 説明文（存在する場合のみ）
 * }}
 */
function _getSemanticDomain(code) {
    const rawCode        = String(code);
    const normalizedCode = _normalizeDomainCode(rawCode);
    const majorCode      = normalizedCode.length >= 4
        ? String(parseInt(normalizedCode.slice(0, -3), 10))
        : normalizedCode;

    if (!_semanticDomainLabels) {
        return { rawCode, normalizedCode, majorCode, title: `分類 ${rawCode}`, titleEn: '', description: '' };
    }

    const sub   = _semanticDomainLabels.subdomains?.[normalizedCode]  || {};
    const major = _semanticDomainLabels.majorDomains?.[majorCode]     || {};

    const title       = sub.title       || major.title       || `分類 ${rawCode}`;
    const titleEn     = sub.titleEn     || major.titleEn     || '';
    const description = sub.description || major.description || '';

    return { rawCode, normalizedCode, majorCode, title, titleEn, description };
}

/**
 * Cluster を描画する関数。Semantic Domain そのものを描画しているわけではない。
 *
 * 1つの Semantic Domain に複数の Cluster が存在するため、domainCodes に複数コードが
 * 含まれる場合は同じ「意味グループ」見出しのセクションが複数並ぶ。これは仕様であり
 * バグではない（例: κλητός の '33029' と '33030' は同一ドメイン内の別クラスター）。
 *
 * clusterIndex アクセスは生コード (code) そのままで行う。正規化コードで引いてはいけない。
 * domainCodes は lexicon-lite の domains[] フィールドから取得した Raw Domain Code の配列。
 */
function _buildClusterLayerHTML(domainCodes, currentLemmaId, currentWord) {
    const sections = [];

    for (const code of domainCodes.slice(0, 2)) {
        const entry = _clusterIndexData[code];
        if (!entry || !entry.lemmas) continue;

        const siblings = entry.lemmas
            .map(id => {
                const e = _lexiconData[id];
                if (!e) return null;
                return {
                    id,
                    headword: e.headword || '',
                    gloss: e.gloss_ja || _jaGlossFromLemmaId(id) || '',
                    count: e.count || 0,
                    isCurrent: id === currentLemmaId,
                };
            })
            .filter(Boolean)
            // 比較しやすさを優先し、意味グループ内は新約聖書での出現頻度順に表示する。
            .sort((a, b) => b.count - a.count);

        // UX方針: 初期表示は最小限にし、必要な場合のみ全件を表示する。
        const CHIP_SHOW = 5;
        const CHIP_MIN_OVER = 3;
        const useLimit = siblings.length > CHIP_SHOW + CHIP_MIN_OVER - 1;

        const chips = siblings.map((s, i) => {
            const hidden = useLimit && !s.isCurrent && i >= CHIP_SHOW;
            return `
            <span class="rn-sibling-chip${s.isCurrent ? ' current' : ''}${hidden ? ' rn-chip-hidden' : ''}" data-lemma-id="${_escH(s.id)}" data-headword="${_escH(s.headword)}" data-cluster-id="${code}" title="${_escH(s.gloss || '')}">
                <span class="rn-sibling-gr">${_escH(s.headword)}</span>
                ${s.gloss ? `<span class="rn-sibling-ja">${_escH(s.gloss)}</span>` : ''}

                ${s.isCurrent
                    ? `<span class="rn-sibling-badge">基準語</span>`
                    : `<span class="rn-sibling-action">用例を探す →</span>`}
            </span>`;
        }).join('');

        const hiddenCount = useLimit
            ? siblings.filter((s, i) => !s.isCurrent && i >= CHIP_SHOW).length
            : 0;
        const moreBtn = hiddenCount > 0
            ? `<button class="rn-chip-more">${_T('panel.showAllMatches', 'データ由来照合語をすべて表示')}</button>`
            : '';

        const domainTitle  = _getDomainLabel(code);
        sections.push(`
            <div class="rn-ln-domain-label">
                <span class="rn-ln-domain-category">意味グループ</span>
                <span class="rn-ln-domain-title">${_escH(domainTitle)}</span>
            </div>
            <div class="rn-sibling-chips">${chips}</div>
            ${moreBtn}
        `);
    }

    if (!sections.length) return '';

    return `
    <div class="rn-cluster-section">
        <button class="rn-layer-toggle" data-target="rn-cluster-body">
            <span>関連語のグループ</span>
            <span class="rn-layer-toggle-icon icon">${icon('chevronRight')}</span>
        </button>
        <div class="rn-layer-body" id="rn-cluster-body">
            ${sections.join('')}
        </div>
    </div>`;
}


/**
 * TODO: _buildConcordanceHTML は未接続（_injectStudyPanelContent から呼ばれていない）。
 * 「さらに学ぶ」セクションへの用例一覧注入を将来実装する場合に使用する。
 * 実装するまでは削除せず保持する。接続する際は _injectStudyPanelContent を修正すること。
 *
 * Basic Concordance builder — canonical source of truth (fact layer).
 *
 * This is the ONLY authoritative concordance. It is strictly lemmaId-based,
 * driven by window.lemmaIndex, and preserves natural occurrence order.
 * No scoring or reranking is applied.
 *
 * @param {string} resolvedId  – lemmaId of the focused word (canonical source)
 * @param {string} word        – surface form (for Basic fallback lookup only)
 */
function _buildConcordanceHTML(resolvedId, word) {
    /*
     * Basic Concordance — canonical fact layer.
     * Builds HTML for actual verse occurrences of resolvedId.
     * Source: window.lemmaIndex via _giListFromLemmaIndex().
     * No scoring. No reordering. No fusion input.
     */
    if (!getLemmaIndex()) return '';

    const byVerse   = new Map();   // verseKey → { gi, tok }
    const VERSE_CAP = 60;

    /* Primary lookup: resolvedId via shared lemmaIndex helper */
    if (resolvedId) {
        for (const gi of _giListFromLemmaIndex(resolvedId)) {
            if (byVerse.size >= VERSE_CAP) break;
            const tok = getTokens()[gi];
            if (!tok) continue;
            const vk = `${tok.bookKey}:${tok.ch}:${tok.verse}`;
            if (!byVerse.has(vk)) byVerse.set(vk, { gi, tok });
        }
    }

    /* Fallback: surface form lookup — lemmaIndex only, no fusion */
    if (!byVerse.size) {
        const fallbackList = (word ? getLemmaIndex().get(word) : null) || [];
        for (const gi of fallbackList) {
            if (byVerse.size >= VERSE_CAP) break;
            const tok = getTokens()[gi];
            if (!tok) continue;
            const vk = `${tok.bookKey}:${tok.ch}:${tok.verse}`;
            if (!byVerse.has(vk)) byVerse.set(vk, { gi, tok });
        }
    }

    if (!byVerse.size) return '';

    const SHOW    = 30;
    const allRows = [...byVerse.values()];
    const rows    = allRows.slice(0, SHOW).map(({ gi, tok }) => {
        const start   = Math.max(0, gi - 3);
        const end     = Math.min(getTokens().length - 1, gi + 3);
        const snippet = getTokens().slice(start, end + 1).map((t, li) => {
            const isAnchor = start + li === gi;
            const txt = _escH(t.text || '');
            return isAnchor ? `<span class="rn-concord-hl">${txt}</span>` : txt;
        }).join(' ');
        const refLabel = _rnFmtRef(tok);
        const href     = tok.bookKey && tok.ch != null
            ? `index.html?book=${encodeURIComponent(tok.bookKey)}&ch=${Number(tok.ch)}`
            : '#';
        return `<div class="rn-concord-row" onclick="window.open('${href}','_blank')">
            <div class="rn-concord-ref">${_escH(refLabel)}</div>
            <div class="rn-concord-text">${snippet}</div>
        </div>`;
    }).join('');

    const moreNote = byVerse.size > SHOW
        ? `<div class="rn-concord-more">${(window.I18N && I18N.lang !== 'ja') ? _T('panel.moreVerses', '他 {n} 節…').replace('{n}', byVerse.size - SHOW) : `他 ${byVerse.size - SHOW} 節…`}</div>`
        : '';

    return `
    <div class="rn-concord-section">
        <button class="rn-layer-toggle" data-target="rn-concord-body">
            <span>${(window.I18N && I18N.lang !== 'ja') ? _T('panel.concordance', '用例一覧（{n}節）').replace('{n}', byVerse.size) : `用例一覧（${byVerse.size}節）`}</span>
            <span class="rn-layer-toggle-icon icon">${icon('chevronRight')}</span>
        </button>
        <div class="rn-layer-body" id="rn-concord-body">
            <div class="rn-concord-list">
                ${rows}
                ${moreNote}
            </div>
        </div>
    </div>`;
}

/* ══════════════════════════════════════════
   Semantic Graph View — 未接続（TODO）
   buildSemanticGraph は定義済みだが _injectStudyPanelContent から呼ばれていない。
   グラフ表示 UI を実装する際に接続すること。
   削除禁止: 将来の意味グラフ機能のために保持する。
   ══════════════════════════════════════════ */

/**
 * buildSemanticGraph(lemmaId)
 *
 * Structure assembler — builds a weighted node list centered on lemmaId.
 * Signal collection rules:
 *   LN membership      → lnSignal     (semantic category signal)
 *   Cluster membership → clusterSignal (relational proximity signal)
 *   Co-verse occurrence → coocHits    (contextual signal)
 *
 * Weight for each node is delegated entirely to scoreEngine.evaluate().
 * This function does NOT perform scoring; it only collects signals and
 * assembles the resulting structure.
 *
 * Returns { centerId, centerEntry, nodes } where nodes is sorted by
 * weight descending and capped at 20.
 */
function buildSemanticGraph(lemmaId) {
    const centerEntry = _lexiconData[lemmaId] || null;
    if (!centerEntry) return { centerId: lemmaId, centerEntry: null, nodes: [] };

    const lnCodes     = centerEntry.ln      || [];
    const domainCodes = centerEntry.domains || [];

    /* Step 1: Collect signals per candidate lemmaId — no scoring here */
    const candidateMap = new Map(); // lemmaId → { lnHit, clusterHit, coocHits[] }

    function _register(id, asLn, asCluster) {
        if (id === lemmaId) return;
        if (!candidateMap.has(id)) {
            candidateMap.set(id, { lnHit: false, clusterHit: false, coocHits: [] });
        }
        const c = candidateMap.get(id);
        if (asLn)      c.lnHit      = true;
        if (asCluster) c.clusterHit = true;
    }

    /* LN neighbors — semantic category signal */
    for (const ln of lnCodes.slice(0, 3)) {
        for (const id of (_lnIndexData[ln]?.lemmas || [])) _register(id, true, false);
    }

    /* Cluster neighbors — relational proximity signal */
    for (const code of domainCodes.slice(0, 3)) {
        for (const id of (_clusterIndexData[code]?.lemmas || [])) _register(id, false, true);
    }

    /* Co-verse occurrence — contextual signal (sample first 200 verses of center word) */
    /* Uses shared _giListFromLemmaIndex — same Basic source lookup rules */
    if (getLemmaIndex()) {
        const giList = _giListFromLemmaIndex(lemmaId);
        const SAMPLE_VERSES = 200;
        const WINDOW        = 5;
        let sampled = 0;
        for (const gi of giList) {
            if (sampled++ >= SAMPLE_VERSES) break;
            const start = Math.max(0, gi - WINDOW);
            const end   = Math.min(getTokens().length - 1, gi + WINDOW);
            for (let j = start; j <= end; j++) {
                if (j === gi) continue;
                const t = getTokens()[j];
                if (!t || !t.lemmaId || t.lemmaId === lemmaId) continue;
                if (!candidateMap.has(t.lemmaId)) {
                    candidateMap.set(t.lemmaId, { lnHit: false, clusterHit: false, coocHits: [] });
                }
                candidateMap.get(t.lemmaId).coocHits.push(t.text || '');
            }
        }
    }

    /* Step 2: Delegate scoring to scoreEngine — structure assembler does not score */
    const nodes = [];
    for (const [id, signals] of candidateMap) {
        const freq = _lexiconData[id]?.count || 0;
        const result = scoreEngine.evaluate({
            semantics: {
                baseScore:     Math.round(Math.log(freq + 1) * 10),
                lnSignal:      signals.lnHit,
                clusterSignal: signals.clusterHit,
                coocHits:      signals.coocHits,
            }
        });
        nodes.push({
            lemmaId: id,
            weight:  result.score,
            headword: _lexiconData[id]?.headword || id,
            gloss:    _jaGlossFromLemmaId(id),
        });
    }

    /* Step 3: Sort and cap — assembler responsibility */
    nodes.sort((a, b) => b.weight - a.weight);
    nodes.splice(20);

    return { centerId: lemmaId, centerEntry, nodes };
}

/* _rnToggleDeep: 廃止（Layer 1/2 統合のため）互換のためno-op残す */
function _rnToggleDeep() {}

/* LN 由来の関連語 UI はライセンス・精度確認が終わるまで一時停止する。
   元データと依存ロジックは保持し、再開時はこのフラグと表示箇所を見直す。 */
const LN_RELATED_WORDS_ENABLED = false;

/* ══════════════════════════════════════════
   _injectStudyPanelContent
   Level 3（さらに学ぶ）のセマンティックレイヤーを非同期注入。
   _renderReadingNotes から呼ばれる。
   ══════════════════════════════════════════ */
async function _injectStudyPanelContent(semContainer, strong, lemmaId, word) {
    if (!semContainer || !LN_RELATED_WORDS_ENABLED) return;
    await _ensureSemanticData();

    const resolvedId  = lemmaId || _resolveLemmaId(strong);
    const lexEntry    = resolvedId ? _lexiconData[resolvedId] : null;
    const domainCodes = lexEntry?.domains || [];

    /*
     * Cluster Layer — 設計注意点
     *
     * 1つの Semantic Domain（意味領域）に複数の Cluster が存在するため、
     * domainCodes に含まれる複数の Raw Code が同一ドメインを指すことがある。
     * _buildClusterLayerHTML は先頭2コードをそれぞれ別セクションとして描画するため、
     * 「意味グループ」の見出しが同じタイトルで2行並ぶケースは仕様（バグではない）。
     *
     * 例: κλητός の domainCodes = ['33029', '33030']
     *   → 両方とも Semantic Domain 33（コミュニケーション）内の別 Cluster。
     *   → UI には「召す・呼び出す（261回）」と「招く・呼び寄せる（312回）」が並ぶ。
     *
     * 詳細: docs/semantic-domain.md
     */
    if (domainCodes.length > 0) {
        const clHTML = _buildClusterLayerHTML(domainCodes, resolvedId, word);
        if (clHTML) semContainer.insertAdjacentHTML('beforeend', clHTML);
    }

    /* アコーディオン構造の決定：item数に応じて分岐 */
    const toggleSections = semContainer.querySelectorAll('.rn-cluster-section, .rn-concord-section');

    if (toggleSections.length === 1) {
        /* 単一項目：トグルを除去してフラット展開 */
        const toggle = toggleSections[0].querySelector('.rn-layer-toggle');
        const body   = toggleSections[0].querySelector('.rn-layer-body');
        if (toggle) toggle.remove();
        if (body)   body.classList.add('visible');
        toggleSections[0].classList.add('rn-flat');

    } else if (toggleSections.length > 1) {
        /* 複数項目：従来通りトグルを配線 */
        semContainer.querySelectorAll('.rn-layer-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const bodyId = btn.dataset.target;
                const body   = document.getElementById(bodyId);
                if (!body) return;
                const isOpen = body.classList.contains('visible');
                body.classList.toggle('visible', !isOpen);
                btn.classList.toggle('open', !isOpen);
                const icon = btn.querySelector('.rn-layer-toggle-icon');
                if (icon) icon.style.transform = '';
            });
        });
    }

    /* Cluster chip → 共起検索へ遷移 */
    const clusterSection = semContainer.querySelector('.rn-cluster-section');
    if (clusterSection) {
        clusterSection.addEventListener('click', (e) => {
            const chip = e.target.closest('.rn-sibling-chip');
            if (!chip || chip.classList.contains('current')) return;
            e.stopPropagation();
            const hw = chip.dataset.headword || '';
            if (!hw) return;
            const p = new URLSearchParams();
            p.set('lemma', hw);
            const refLemmaId = AppState.inspect.data?.lemmaId;
            if (refLemmaId) p.set('ref_lemma', refLemmaId);
            const cmpLemmaId = chip.dataset.lemmaId;
            if (cmpLemmaId) p.set('cmp_lemma', cmpLemmaId);
            const clusterId = chip.dataset.clusterId;
            if (clusterId) p.set('cluster', clusterId);
            p.set('layers', 'lemma');
            const _stw = window.open(`search-tool.html?${p.toString()}`, '_blank');
            if (_stw) _searchToolWindows.add(_stw);
        });

        /* 「データ由来照合語をすべて表示」ボタン
           TODO: 現在は一括展開としている。
           将来的に段階的表示や別UIへの変更を検討する。 */
        clusterSection.querySelectorAll('.rn-chip-more').forEach(btn => {
            btn.addEventListener('click', () => {
                const chipsEl = btn.previousElementSibling;
                if (chipsEl) chipsEl.querySelectorAll('.rn-chip-hidden').forEach(c => c.classList.remove('rn-chip-hidden'));
                btn.remove();
            });
        });
    }
}


/* switchAnalysisTab: 後方互換のため残す（内部ではno-op）*/
function switchAnalysisTab(tab) {
    /* タブは廃止されました。読書メモモードで動作します。 */
    if (_currentAnalysisParams) _renderReadingNotes(_currentAnalysisParams);
}


/* ══════════════════════════════════════════
   インライン分析タブ描画ヘルパー
   ══════════════════════════════════════════ */

function _renderMorphTab(area, p) {
    const JPN_FULL = _morphFull();

    const rows = [];
    if (p.pos)    rows.push({ k:_T('morph.pos', '品詞'),  v: JPN_FULL.pos[p.pos]    || p.pos,    core: true });
    if (p.tense)  rows.push({ k:_T('morph.tense', '時制'),  v: JPN_FULL.tense[p.tense]|| p.tense,  core: true });
    if (p.mood)   rows.push({ k:_T('morph.mood', '法'),    v: JPN_FULL.mood[p.mood]  || p.mood,   core: true });
    if (p.voice)  rows.push({ k:_T('morph.voice', '態'),    v: JPN_FULL.voice[p.voice]|| p.voice,  core: false });
    if (p.case)   rows.push({ k:_T('morph.case', '格'),    v: JPN_FULL.case[p.case]  || p.case,   core: false });
    if (p.number) rows.push({ k:_T('morph.number', '数'),    v: JPN_FULL.number[p.number]||p.number,core: false });
    if (p.gender) rows.push({ k:_T('morph.gender', '性'),    v: JPN_FULL.gender[p.gender]||p.gender,core: false });

    const morphGridHTML = rows.length
        ? `<div class="ac-morph-grid">
            ${rows.map(r => `
                <span class="ac-morph-key">${r.k}</span>
                <span class="ac-morph-val${r.core ? ' core' : ''}">${_escH(r.v)}</span>
            `).join('')}
           </div>`
        : `<p class="ac-no-data">${_T('panel.noMorphData', '形態論データがありません')}</p>`;

    const jaWord = (_inspectData && _inspectData.jaWord) || '-';
    const desc   = (_inspectData && _inspectData.desc)   || '';
    const strong = (_inspectData && _inspectData.strong)  || '';
    const ref    = p.ref || '';
    const lemma  = p.lemma || '';

    area.innerHTML = `
        <span class="ac-section-label">${_T('panel.morphology', '形態論')}</span>
        <div class="ac-entry">
            <div class="ac-entry-greek">${_escH(p.word || '-')}</div>
            <div class="ac-entry-ja">${_escH(jaWord)}</div>
            ${strong ? `<span class="ac-entry-strong">${_escH(strong)}</span>` : ''}
            ${morphGridHTML}
            ${ref ? `<span class="ac-cite-ref">${icon('pin')} ${_escH(ref)}</span>` : ''}
        </div>
        ${desc ? `<div class="ac-abbottsmith">${_escH(desc).replace(/\n/g,'<br>')}</div>` : ''}
    `;
}

function _renderSyntaxTab(area, p) {
    const _mf = _morphFull();

    const features = [];
    if (p.mood)  features.push(_mf.mood[p.mood]   || p.mood);
    if (p.tense) features.push(_mf.tense[p.tense] || p.tense);

    area.innerHTML = `
        <span class="ac-section-label">${_T('panel.syntax', '統語論')}</span>
        <div class="ac-entry">
            <div class="ac-entry-greek">${_escH(p.word || '-')}</div>
            ${features.length ? `<div style="margin-top: var(--space-xs);">${features.map(f =>
                `<span class="morph-tag-pill core" style="margin-right: var(--space-xs);">${_escH(f)}</span>`).join('')}</div>` : ''}
            ${ref ? `<span class="ac-cite-ref ac-cite-ref--block">${icon('pin')} ${_escH(ref)}</span>` : ''}
        </div>
    `;
}

function _renderSemanticsTab(area, p) {
    const qs = new URLSearchParams();
    const ref   = p.ref   || '';
    const lemma = p.lemma || '';
    if (ref)    qs.set('ref',   ref);
    if (p.word) qs.set('word',  p.word);
    if (lemma)  qs.set('lemma', lemma);
    if (p.pos)  qs.set('pos',   p.pos);
    const semanticsURL = `semantic-search.html?${qs.toString()}`;

    const jaWord = (_inspectData && _inspectData.jaWord) || '-';
    const strong = (_inspectData && _inspectData.strong) || '';
    const strongDigits = String(strong).replace(/[^0-9]/g, '');
    const desc = (_inspectData && _inspectData.desc)
        || _abbottDesc(strongDigits)
        || '';

    const abbottHtml = desc
        ? `<div class="ac-abbottsmith">${_escH(desc).replace(/\n/g,'<br>')}</div>`
        : `<p class="ac-no-data">${_T('panel.noDictData', '辞書データが見つかりません')}</p>`;

    area.innerHTML = `
        <span class="ac-section-label">${_T('panel.semantics', '意味論')}</span>
        <div class="ac-entry">
            <div class="ac-entry-greek">${_escH(p.word || '-')}</div>
            <div class="ac-entry-ja">${_escH(jaWord)}</div>
            ${strong ? `<span class="ac-entry-strong">${_escH(strong)}（Abbott-Smith）</span>` : ''}
        </div>
        ${abbottHtml}
        <div style="margin-top: var(--space-md);">
            <a href="${semanticsURL}" class="morph-search-btn">語の意味を詳しく調べる →</a>
        </div>
    `;

    /* 辞書読み込みとタブ表示が競合した場合、同じ語が引き続き選択されていれば再描画する。 */
    if (!desc && strong && !abbottSmithDict) {
        loadDict().then(dict => {
            if (!dict || !area.isConnected) return;
            const currentStrong = String((_inspectData && _inspectData.strong) || '');
            if (currentStrong === String(strong)) _renderSemanticsTab(area, p);
        });
    }
}

/* ══════════════════════════════════════════
   Flow / Meaning / Study タブ描画
   （読解支援を主役にした新タブ体系）
   ══════════════════════════════════════════ */

/**
 * Flow タブ：「この語・この節が何をしているか」を読解補助として表示。
 * AIによるニュアンス補助（Anthropic API）。
 * データなし時はローカルルールベースフォールバックを表示。
 */
function _renderFlowTab(area, p) {
    const word   = p.word   || '-';
    const pos    = p.pos    || '';
    const mood   = p.mood   || '';
    const tense  = p.tense  || '';
    const voice  = p.voice  || '';
    const jaWord = (_inspectData && _inspectData.jaWord) || '';
    const ref    = p.ref    || '';

    /* ══════════════════════════════════════════
       ローカルフォールバック：9種 Flow signal
       「著者の流れ・強調・意図」を静かに補助する。
       チェックリスト化禁止。自然な文章として表示。
       ══════════════════════════════════════════ */
    const signals = [];
    // signal: { kind: CSS class suffix, kindLabel: 極小ラベル, text: 自然文 }

    /* ── #1 鍵となるフレーズ・単語（繰り返し・転換・強調） ── */
    if (pos === 'CONJ') {
        const CONJ_SIGNAL = {
            'γάρ':  { cls: 'sig-logic',    text: 'ここで理由が始まります。直前の主張の根拠として読むと、議論の構造が見えてきます。' },
            'ἀλλά': { cls: 'sig-turn',     text: '「しかし」による転換。ここで流れが変わります。' },
            'οὖν':  { cls: 'sig-logic',    text: 'ここで論理が結論へ進みます。前節の集約として読む箇所です。' },
            'δέ':   { cls: 'sig-turn',     text: '話が次の段階に進んでいます。微妙な展開・対比のサインです。' },
            'καί':  { cls: 'sig-emphasis', text: '内容が積み重なっています。強調の「そして」として機能する場合もあります。' },
            'ἵνα':  { cls: 'sig-logic',    text: '目的節。この語以降に「なぜそうするのか」という著者の意図が示されます。' },
            'ὅτι':  { cls: 'sig-logic',    text: '内容・理由節。以降が主張の根拠か内容補足になります。' },
            'εἰ':   { cls: 'sig-logic',    text: '条件節。仮定の前提の上で議論が展開されています。' },
            'ὥστε': { cls: 'sig-logic',    text: 'ここに議論の帰結があります。「その結果として」という流れです。' },
        };
        const s = CONJ_SIGNAL[word];
        if (s) signals.push({ cls: s.cls, kindLabel: '流れ', text: s.text });
        else   signals.push({ cls: 'sig-logic', kindLabel: '流れ', text: '接続詞。前後をつなぎ、議論の流れを形作っています。' });
    }

    /* ── #6 論理的展開（最重要：Flow の中心機能） ── */
    /* 動詞の法：命令・約束・宣言・論理を区別して表示 */
    if (pos === 'V') {
        /* #2 命令・勧め */
        if (mood === 'imperative') {
            signals.push({ cls: 'sig-exhort', kindLabel: '呼びかけ', text: 'ここは説明ではなく、行動への呼びかけです。' });
        }
        /* 接続法：目的・願望 */
        if (mood === 'subjunctive') {
            signals.push({ cls: 'sig-logic', kindLabel: '願い', text: '目的・条件・願望を表しています。断定ではなく「〜するために」「〜であれば」という含みです。' });
        }
        /* 不定詞：補足・目的 */
        if (mood === 'infinitive') {
            signals.push({ cls: 'sig-logic', kindLabel: '補足', text: '動作の目的か内容を補足する役割です。' });
        }
        /* 分詞：修飾・同時進行 */
        if (mood === 'participle') {
            signals.push({ cls: 'sig-logic', kindLabel: '背景', text: '主動詞の状況・背景を描写しています。' });
        }

        /* 時制による流れへの影響 */
        if (tense === 'aorist' && mood === 'indicative') {
            signals.push({ cls: 'sig-declare', kindLabel: '出来事', text: '「その出来事が起きた」という完結した事実の提示です。命令でも約束でもなく、宣言的な重みがあります。' });
        }
        if (tense === 'present' && mood === 'indicative') {
            signals.push({ cls: 'sig-logic', kindLabel: '継続', text: '継続・習慣・普遍的な事実として述べています。' });
        }
        if (tense === 'perfect') {
            signals.push({ cls: 'sig-promise', kindLabel: '今も続く', text: '過去の出来事の結果が今も有効です。単なる過去の話ではなく、現在の状態を含む表現です。' });
        }
        if (tense === 'future' && mood === 'indicative') {
            signals.push({ cls: 'sig-promise', kindLabel: '約束', text: 'これは命令というより、確かな約束・確約として機能していることがあります。' });
        }

        /* #7 語の選択：態のニュアンス */
        if (voice === 'passive') {
            signals.push({ cls: 'sig-word', kindLabel: '受けとめる', text: '主語は動作を受ける側に置かれています。神学的文脈では「神による行為」を暗示することがあります。' });
        }
        if (voice === 'middle' || voice === 'middle deponent') {
            signals.push({ cls: 'sig-word', kindLabel: '深く関わる', text: '主語が動作に深く関与しています。単なる能動でも受動でもない、自身が関わる動作です。' });
        }
    }

    /* ── 名詞系の格：論理的役割を「流れ」として表示 ── */
    if (['N','A','R','P','T','D'].includes(pos)) {
        const CASE_SIGNAL = {
            nominative: { cls: 'sig-logic',   text: 'この語が文の中心にいます。主語または述語として機能しています。' },
            genitive:   { cls: 'sig-logic',   text: '「〜の」という関係を示します。所有・由来・特徴などのニュアンスがあります。' },
            dative:     { cls: 'sig-logic',   text: '動作の間接的な受け手・場所・手段を示します。' },
            accusative: { cls: 'sig-logic',   text: '動作の直接の対象です。' },
        };
        const caseSig = CASE_SIGNAL[p.case];
        if (caseSig) signals.push({ cls: caseSig.cls, kindLabel: '役割', text: caseSig.text });
    }

    /* ── #5 比喩表現：特定語の比喩的使用に注意を促す ── */
    const METAPHOR_WORDS = {
        'περιπατέω': '「歩む」は、ここでは文字通りの歩行ではなく、生き方・行動様式の比喩として使われています。',
        'περιπατεῖν': '「歩む」は、生き方の比喩として使われています。',
        'φωτί':      '「光」は比喩的な表現として機能していることが多く、知識・啓示・義などを指すことがあります。',
        'σκότος':    '「闇」は比喩的に罪・無知・神との断絶を示すことがあります。',
        'σταυρός':   '十字架は当時の読者にとって処刑の道具であると同時に、贖いの象徴として受け取られた語です。',
    };
    if (METAPHOR_WORDS[word]) {
        signals.push({ cls: 'sig-metaphor', kindLabel: '比喩', text: METAPHOR_WORDS[word] });
    }

    if (signals.length === 0) {
        signals.push({ cls: 'sig-default', kindLabel: '補足', text: 'この語の文脈的な役割は「含み」タブでさらに確認できます。' });
    }

    /* signals を prose として統合（列挙しない） */
    const localHTML = `<div class="flow-signal-text reading-prose">${signals.map(s => s.text).join('　')}</div>`;

    area.innerHTML = `
        <div class="flow-word-head">
            <span class="flow-greek greek-headword">${_escH(word)}</span>${jaWord ? `<span class="flow-ja">　${_escH(jaWord)}</span>` : ''}
        </div>
        ${ref ? `<div class="flow-ref">${_escH(ref)}</div>` : ''}
        <div class="flow-hints reading-block" id="flow-hints-local">
            ${localHTML}
        </div>
    `;
}

/* ══════════════════════════════════════════
   openStudyPanel - 正規実装（唯一の定義）
   責務:
     - word-list-view を消去してiframe/インライン分析に切り替える
     - AppState.saveScroll() で scroll 位置を保存
     - AppState.toStudy() で状態を Study モードへ遷移
     - study.tab を引き継いで前回開いていたタブを復元
   ══════════════════════════════════════════ */
/* ══════════════════════════════════════════
   openStudyPanel - 読書メモ版
   タブを廃止し、単一スクロールの読書メモパネルに表示する。
   ══════════════════════════════════════════ */
function openStudyPanel(greek, rawMorph, ref, lemma, options = {}) {
    closeMobileSidebar();
    /* 高さの一律リセットは廃止 — StudyPanelState.height（SSOT）を
       下の _applyPanelHeightFromState() が適用する */
    const listEl = document.getElementById('word-list-view');
    /* 節Panel（Level 2）から来た場合のみ、破棄する直前のスクロール位置を保存しておく
       （panelGoBack() で Level 2 に戻った時に復元する。スクロール保持のための唯一の保存箇所）。 */
    _versePanelScrollTop = (_panelContentMode === 'verse' && listEl) ? listEl.scrollTop : null;
    if (listEl) listEl.remove();

    const m = parseMorphForSearch(rawMorph);
    const params = {
        ref,
        verseId:   AppState.studyTarget?.verseId || '',
        word:      greek,
        lemma:     lemma || '',
        pos:       m.pos    || '',
        _rawMorph: rawMorph,
        tense:     m.tense  || '',
        mood:      m.mood   || '',
        voice:     m.voice  || '',
        gender:    m.gender || '',
        number:    m.number || '',
        case:      m.case   || '',
    };
    params._morphCandidates = getMorphCandidates(rawMorph, greek).alternatives;

    /* 読書位置の保存: 閉→開の遷移時のみ。節Panel（Level 2）から単語詳細へ
       進む時に保存すると「パネルを開く前の位置」が open 中の位置で
       上書きされ、close 時に開く前へ戻れなくなる。 */
    if (!document.getElementById('bottom-depth-panel').classList.contains('open')) {
        AppState.saveScroll();
    }
    AppState.toStudy(params, 'notes');

    /* depth stack に追加（重複しないよう、top が同じなら追加しない） */
    const stack = AppState.depth.stack;
    const topEntry = stack[stack.length - 1];
    const isAlreadyDeep = topEntry && topEntry.type === 'deep-reading' && topEntry.strong === String(AppState.inspect.data?.strong || '');
    if (!options.skipDepthPush && !isAlreadyDeep) {
        pushDepth({
            type:   'deep-reading',
            label:  '深く読む',
            strong: String(AppState.inspect.data?.strong || ''),
        });
    }

    const sidePanel    = document.getElementById('bottom-depth-panel');
    const wasOpen = sidePanel.classList.contains('open');
    _panelContentMode = 'word';
    /* 高さの SSOT: Level 2⇄3 遷移でもユーザー調整高さを維持する
       （word モードの上限 80vh へは適用時のみ clamp。state は保持） */
    _applyPanelHeightFromState(sidePanel);
    sidePanel.classList.add('open');
    _syncStudyVerseNav();
    _syncReadingPanelPadding();
const activeVEl = document.getElementById('active-v');
    if (activeVEl && greek) activeVEl.textContent = greek;

    document.getElementById('open-panel-btn').style.display = 'none';

    /* 読書メモエリアを表示 */
    const notesWrap = document.getElementById('reading-notes-wrap');
    if (notesWrap) notesWrap.style.display = 'flex';

    _renderReadingNotes(params);

    /* スクロール位置の復元（close直前に StudyPanelState.scrollTop へ保存した位置を再適用）。
       _renderReadingNotes は async で DOM を置換するため、2段 rAF で確実に render 後に適用する。
       1段目：レイアウト計算開始を待つ。2段目：paint サイクル後に scrollTop を確定する。 */
    {
        const _savedScroll = StudyPanelState.scrollTop;
        StudyPanelState.scrollTop = 0;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const nw = document.getElementById('reading-notes-wrap');
                if (nw) nw.scrollTop = _savedScroll;
            });
        });
    }

    /* ── オンボーディング：アンカー語（ἠγάπησεν）初回タップ時に発見テキストを先頭注入 ── */
    (function _injectObDiscovery() {
        const obState = window.App.onboarding?.getState();
        if (!obState || obState.onboardingComplete) return;
        if (obState.wordClicked) return; /* 2語目以降は出さない */
        if (greek !== 'ἠγάπησεν') return;

        const area = document.getElementById('reading-notes-area');
        if (!area) return;

        const disc = document.createElement('div');
        disc.id = 'ob-discovery-banner';
        disc.style.cssText = [
            'margin:0 0 18px 0',
            'padding:13px 16px',
            'background:var(--accent-light)',
            'border-left:3px solid rgba(44,79,52,0.55)',
            'border-radius:0 var(--radius-s) var(--radius-s) 0',
            'font-family:\'Noto Serif JP\',Georgia,serif',
            'font-size:var(--text-caption)',
            'line-height:1.8',
            'color:rgba(29,29,31,0.82)',
            'letter-spacing:0.01em',
        ].join(';');
        disc.textContent = 'この語は文の先頭に置かれています。ギリシャ語では動詞が最初に来るとき、その行為が強調される読み方があります。日本語訳では見えにくい語順の意図が、原語には残っています。';

        area.insertBefore(disc, area.firstChild);
    })();
    /* ─────────────────────────────────────────────────────── */

    _mobileOpenPanel(greek || _T('panel.readWord', '語を読む'), wasOpen);
    updatePanelBackButton();
    _adjustReadingAreaForPanel(wasOpen);

    /* onboarding hook */
    if (window.App.onboarding) {
        window.App.onboarding.onStudyPanelOpened(window.innerWidth <= 900, AppState.selectedVerse?.vNum);
    }
    _syncOnboardingActiveFlag();

    notifyAppStateChange();
}

/* SP-3: StudyTarget v0 setter — 「何を調べているか」を記録する最小helper。
   ref = "JHN 3:1!1" 形式。falsy なら null（guard）。
   inspect.data / studyOrigin は変更しない。 */
function _setStudyTarget(ref, verseId) {
    AppState.studyTarget = ref ? { type: 'TOKEN', ref, verseId: verseId || '' } : null;
}

/* ══════════════════════════════════════════
   closeStudyPanel - 正規実装（唯一の定義）
   責務:
     - side-panel を非表示、並列訳を復帰
     - AppState.toReading() で状態を Reading モードへ遷移
       （study.params / study.tab はあえて保持する → 再開ボタンのため）
     - AppState.restoreScroll() で scroll 位置を復元
     - 「分析に戻る」ボタンを study.params の有無で制御
   ══════════════════════════════════════════ */
function closeStudyPanel() {
    AppState.clearDepth();
    AppState.studyOrigin = { surface: null, entryPoint: null };
    AppState.studyTarget = null;
    renderDepthHistory();
    _closeStudyPanelInternal();
    _syncStudyVerseNav();
    notifyAppStateChange();
}

/* ══════════════════════════════════════════
   reopenStudyPanel - 正規実装（唯一の定義）
   責務:
     - ヘッダー「分析に戻る」ボタンから呼ばれる
     - AppState.saveScroll() で現在の scroll 位置を保存してから展開
     - AppState.study.tab を引き継いで前回タブを復元
   ══════════════════════════════════════════ */
function reopenStudyPanel() {
    if (!AppState.canReopen()) return;
    const p = AppState.study.params;
    AppState.saveScroll();
    _setStudyTarget(p.ref, p.verseId);
    openStudyPanel(p.word, p._rawMorph, p.ref, p.lemma);
}
function _wlvSwitchTab(name) {
    /* no-op: タブは廃止されました */
}



/* clauseResults キャッシュ（直近に解析した verse の words 参照をキーにする）。
   節レイヤー（passage note）と単語レイヤー（resonance）が同じ解析結果を
   共有するための唯一の場所 — 「レイヤーごとの別ロジック」を作らない。 */
let _wallaceClauseCache = null; // { words, clauseResults }

/**
 * words（節の生トークン配列）に対する ClauseAnalyzer の解析結果を返す。
 * 同じ words 参照に対しては再解析せずキャッシュを返す（節レイヤー・
 * 単語レイヤーの両方から呼ばれるため）。
 * @returns {Promise<Array|null>}
 */
async function _getWallaceClauseAnalysis(words) {
    if (!words || words.length === 0) return null;
    if (_wallaceClauseCache && _wallaceClauseCache.words === words) {
        return _wallaceClauseCache.clauseResults;
    }
    const pipeline = await _ensureWallacePipeline();
    if (!pipeline) return null;
    const { sa, pa, ca } = pipeline;
    try {
        const all = sa.analyzeAll(words);
        const syntaxResults = all.results.map(r => r.output);
        const phraseResults = pa.analyze({ tokens: words, syntaxResults });
        const clauseResults = ca.analyze({ tokens: words, syntaxResults, phraseResults });

        /* Phase 24: Reading Support Projection を並列生成（additive・読み取り専用）。
           失敗しても projection = null になるだけで、既存の表示・戻り値は一切変わらない。 */
        let projection = null;
        try {
            const RSP = window.App?.syntax?.ReadingSupportProjection;
            const CB  = window.App?.syntax?.ContextBuilder;
            if (RSP) {
                projection = RSP.build({
                    tokens: words, syntaxResults, clauseResults,
                    contextBuilder: CB, registry: sa.registry,
                });
            }
        } catch (_) { projection = null; }

        _wallaceClauseCache = { words, clauseResults, projection };
        return clauseResults;
    } catch (e) {
        console.warn('[Wallace] analysis failed:', e);
        return null;
    }
}


/* __OBSERVATION_BEGIN__
   Phase 25B-3: Observation（本文のどこを見ると読みやすくなるかの指さし）
   目的は Q2「なぜこのように読めるのか」への入口を一文で示すことのみ。
   ReadingSupportProjection の words[idx].categories だけを読み、
   流れをつくる語（理由・結論・転換・目的・条件・対 など）を本文の引用で指す。
   一文だけ。内部の判定情報は言い回しの選択にのみ使い、画面には出さない。
   静寂条件: Projection null / 候補なし / 弱い判定 / 指させる語でない /
   既存の文と同内容 → null（既存表示のみ・フォールバック禁止）。 */

/* 言い回しの選択表（キーは内部専用・画面に出さない） */
const _OBSERVATION_SENTENCES = {
    'clause.purpose_hina':                q => `この「${q}」から、『〜するために』という目的が始まります。`,
    'conjunction.subordinating_purpose':  q => `この「${q}」から、『〜するために』という目的が始まります。`,
    'clause.substantival_hoti':           q => `この「${q}」から、その中身が語られます。`,
    'conjunction.subordinating_content':  q => `この「${q}」から、その中身が語られます。`,
    'clause.causal_hoti':                 q => `この「${q}」から、その理由が語られます。`,
    'clause.result_hoste':                q => `この「${q}」から、その結果が語られます。`,
    'conjunction.subordinating_result':   q => `この「${q}」から、その結果が語られます。`,
    /* clause.conditional_first_class / second_class は Phase 2 で multiple 化し
       _WORD_ROLE_TEXT（conditional_assumed_true / conditional_counterfactual）へ移動。 */
    'clause.conditional_third_class':     q => `この「${q}」から、『もし〜なら』の話に入ります。`,
    'conjunction.subordinating_conditional': q => `この「${q}」から、『もし〜なら』の話に入ります。`,
    'clause.temporal_hotan':              q => `この「${q}」から、いつのことかが語られます。`,
    'clause.temporal_hote':               q => `この「${q}」から、いつのことかが語られます。`,
    'conjunction.subordinating_temporal': q => `この「${q}」から、いつのことかが語られます。`,
    'clause.comparative_kathos':          q => `この「${q}」から、『〜のように』というたとえが始まります。`,
    'conjunction.subordinating_comparative': q => `この「${q}」から、『〜のように』というたとえが始まります。`,
    'conjunction.coordinating_explanatory': q => `この「${q}」が、前の内容の理由を語り始めます。`,
    'particle.explanatory_gar':           q => `この「${q}」が、前の内容の理由を語り始めます。`,
    'conjunction.coordinating_inferential': q => `この「${q}」が、前の内容を受けて、だから、と話を進めます。`,
    'particle.inferential_oun':           q => `この「${q}」が、前の内容を受けて、だから、と話を進めます。`,
    'conjunction.coordinating_adversative': q => `この「${q}」で、話の向きが変わります。`,
    'conjunction.coordinating_transition': q => `この「${q}」で、話が次へ進みます。`,
    /* particle.correlative_men / correlative_de は Phase 2 で men_de_contrast に
       統合（reading-policy.json）。役割文は _WORD_ROLE_TEXT が担当。 */
    /* particle.emphatic_negative / particle.double_negative は節レベル現象
       negative_emphasis へ移動（reading-policy.json / _VERSE_NOTE_TEXT）。
       単語を選択しなくても Passage Note に表示される。 */
    'particle.particle_an':               q => `この「${q}」が、実際にはそうならなかった、という響きを添えます。`,
    'particle.rhetorical_particle':       q => `この「${q}」が、断じて、と強く退けます。`,
};
const _OBSERVATION_SENTENCES_EN = {
    'clause.purpose_hina':                q => `From "${q}", the purpose begins — the "so that" direction of what follows.`,
    'conjunction.subordinating_purpose':  q => `From "${q}", the purpose begins — the "so that" direction of what follows.`,
    'clause.substantival_hoti':           q => `From "${q}", the content of what was said unfolds.`,
    'conjunction.subordinating_content':  q => `From "${q}", the content of what was said unfolds.`,
    'clause.causal_hoti':                 q => `From "${q}", the reason behind it is given.`,
    'clause.result_hoste':                q => `From "${q}", the outcome is stated.`,
    'conjunction.subordinating_result':   q => `From "${q}", the outcome is stated.`,
    'clause.conditional_third_class':     q => `From "${q}", an "if" condition is introduced.`,
    'conjunction.subordinating_conditional': q => `From "${q}", an "if" condition is introduced.`,
    'clause.temporal_hotan':              q => `From "${q}", the timing of events is laid out.`,
    'clause.temporal_hote':               q => `From "${q}", the timing of events is laid out.`,
    'conjunction.subordinating_temporal': q => `From "${q}", the timing of events is laid out.`,
    'clause.comparative_kathos':          q => `From "${q}", a comparison begins — something is being likened to something else.`,
    'conjunction.subordinating_comparative': q => `From "${q}", a comparison begins — something is being likened to something else.`,
    'conjunction.coordinating_explanatory': q => `"${q}" begins to explain the reason for what came before.`,
    'particle.explanatory_gar':           q => `"${q}" begins to explain the reason for what came before.`,
    'conjunction.coordinating_inferential': q => `"${q}" picks up what came before and draws it toward a conclusion.`,
    'particle.inferential_oun':           q => `"${q}" picks up what came before and draws it toward a conclusion.`,
    'conjunction.coordinating_adversative': q => `With "${q}", the direction of the thought shifts.`,
    'conjunction.coordinating_transition': q => `With "${q}", the narrative moves forward.`,
    'particle.particle_an':               q => `"${q}" adds a note of contingency — a sense that things could have gone otherwise.`,
    'particle.rhetorical_particle':       q => `"${q}" signals a strong denial — the expected answer is "no."`,
}
const _OBSERVATION_SENTENCES_ES = {
    'clause.purpose_hina':                q => `Desde «${q}», comienza el propósito — la dirección de «para que» de lo que sigue.`,
    'conjunction.subordinating_purpose':  q => `Desde «${q}», comienza el propósito — la dirección de «para que» de lo que sigue.`,
    'clause.substantival_hoti':           q => `Desde «${q}», se despliega el contenido de lo dicho.`,
    'conjunction.subordinating_content':  q => `Desde «${q}», se despliega el contenido de lo dicho.`,
    'clause.causal_hoti':                 q => `Desde «${q}», se da la razón de lo anterior.`,
    'clause.result_hoste':                q => `Desde «${q}», se declara el resultado.`,
    'conjunction.subordinating_result':   q => `Desde «${q}», se declara el resultado.`,
    'clause.conditional_third_class':     q => `Desde «${q}», se introduce una condición, un «si».`,
    'conjunction.subordinating_conditional': q => `Desde «${q}», se introduce una condición, un «si».`,
    'clause.temporal_hotan':              q => `Desde «${q}», se presenta el momento de los acontecimientos.`,
    'clause.temporal_hote':               q => `Desde «${q}», se presenta el momento de los acontecimientos.`,
    'conjunction.subordinating_temporal': q => `Desde «${q}», se presenta el momento de los acontecimientos.`,
    'clause.comparative_kathos':          q => `Desde «${q}», comienza una comparación — algo se está asemejando a otra cosa.`,
    'conjunction.subordinating_comparative': q => `Desde «${q}», comienza una comparación — algo se está asemejando a otra cosa.`,
    'conjunction.coordinating_explanatory': q => `«${q}» comienza a explicar la razón de lo anterior.`,
    'particle.explanatory_gar':           q => `«${q}» comienza a explicar la razón de lo anterior.`,
    'conjunction.coordinating_inferential': q => `«${q}» recoge lo anterior y lo lleva hacia una conclusión.`,
    'particle.inferential_oun':           q => `«${q}» recoge lo anterior y lo lleva hacia una conclusión.`,
    'conjunction.coordinating_adversative': q => `Con «${q}», la dirección del pensamiento cambia.`,
    'conjunction.coordinating_transition': q => `Con «${q}», el relato avanza.`,
    'particle.particle_an':               q => `«${q}» añade un matiz de contingencia — la sensación de que las cosas podrían haber sido de otro modo.`,
    'particle.rhetorical_particle':       q => `«${q}» anuncia una negación fuerte — la respuesta esperada es «no».`,
};;

/* multiple スコープ現象の単語役割文（Phase 1: negative_emphasis のみ）。
   節文（_VERSE_NOTE_TEXT）の再利用ではなく「その単語が現象の中で何を
   しているか」を語る（役割の分担: 節=意味、語=役割）。
   表示可否は Reading Policy（正規化スコープに word を含む現象）が決める。
   現象を増やすときは reading-policy.json の scope を配列にし、
   ここに「現象名 → (token) => 一文」を1件足すだけでよい。 */
const _WORD_ROLE_TEXT = {
    /* 原語表記の原則（reading-policy.md §12）: 日本語を入口とし、
       クリックした語と対になる「まだ選択されていない語」を本文から
       探させる時だけ、括弧内にギリシャ語を添える（指さし）。
       ギリシャ語を文の主語・目的語にしない。 */
    negative_emphasis: (token) => {
        const lm = (token && token.lemma) || '';
        if (['οὐ', 'οὐκ', 'οὐχ'].includes(lm)) {
            return 'ふだんは「〜ない」を表すことばですが、ここではあとに来るもう一つの打ち消し（μή）と重なり、『決して〜ない』という強い言い方を作っています。';
        }
        if (lm === 'μή') {
            return 'すぐ前の打ち消し（οὐ）と重なることで、単独のときより強い『決して〜ない』という意味になります。';
        }
        return '二重の打ち消し（οὐ μή）を受けることばで、『決して〜しない』という最も強い言い方で否定されています。';
    },
    men_de_contrast: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'μέν') return '『一方では』と対比の前半を開くことばです。あとに来る『他方では』の合図（δέ）と対になります。';
        if (lm === 'δέ')  return '『他方では』と対比の後半を受けることばです。前にある『一方では』の合図（μέν）と対になります。';
        return '『一方では…他方では』という対（μέν…δέ）の一部として、二つのことを対比して示しています。';
    },
    parenthesis: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'εἰμί') return '『つまり』と言いかえる合図で、ここから補足の説明がはさまれます。';
        if (['λέγω', 'φημί', 'οἶμαι'].includes(lm)) {
            return '語り手が本筋をいったん止めて、ひとこと差しはさむ合図です。';
        }
        return 'この語から、話の途中に説明がはさまれます。';
    },
    /* v1.0監査: 語文は「その単語の役割」だけを言う（節文の言い換え禁止） */
    nominative_pendens: () =>
        'この語が、この文の主題です。',
    conditional_counterfactual: () =>
        'この『もし』は、実際にはそうならなかったことを仮定する入口です。',
    conditional_assumed_true: () =>
        'この『もし』は疑いではなく、事実を前提にしています。',
};
const _WORD_ROLE_TEXT_EN = {
    negative_emphasis: (token) => {
        const lm = (token && token.lemma) || '';
        if (['οὐ', 'οὐκ', 'οὐχ'].includes(lm)) {
            return 'This word normally means "not," but here it pairs with another negative (μή) that follows, together forming the strongest possible denial: "absolutely not."';
        }
        if (lm === 'μή') {
            return 'Together with the negative that precedes it (οὐ), this word strengthens the denial into "absolutely not" — stronger than either negative alone.';
        }
        return 'This word is negated by a double negative (οὐ μή), which is the strongest form of denial available: "will absolutely not."';
    },
    men_de_contrast: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'μέν') return 'This word opens the first half of a contrast — the "on the one hand" side. It looks ahead to its pair (δέ) that completes the other half.';
        if (lm === 'δέ')  return 'This word takes up the second half of a contrast — the "on the other hand" side. It answers the first half introduced by μέν earlier.';
        return 'This word is part of a contrast (μέν…δέ) that sets two things side by side — "on the one hand…on the other hand."';
    },
    parenthesis: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'εἰμί') return 'This word signals a restatement — "that is to say" — and introduces an explanation inserted into the flow.';
        if (['λέγω', 'φημί', 'οἶμαι'].includes(lm)) {
            return 'This word signals that the speaker is briefly stepping outside the main thread to add something.';
        }
        return 'From this word, an explanatory note is inserted into the middle of the main thought.';
    },
    nominative_pendens:        () => 'This word is the topic of the sentence.',
    conditional_counterfactual:() => 'This "if" introduces a condition that did not actually come true — a "what if it had been otherwise" kind of statement.',
    conditional_assumed_true:  () => 'This "if" does not express doubt — it treats the condition as though it were true.',
}
const _WORD_ROLE_TEXT_ES = {
    negative_emphasis: (token) => {
        const lm = (token && token.lemma) || '';
        if (['οὐ', 'οὐκ', 'οὐχ'].includes(lm)) {
            return 'Esta palabra normalmente significa «no», pero aquí se combina con otra negación (μή) que sigue, formando juntas la negación más fuerte posible: «de ningún modo».';
        }
        if (lm === 'μή') {
            return 'Junto con la negación que la precede (οὐ), esta palabra refuerza la negación hasta convertirla en «de ningún modo» — más fuerte que cada negación por separado.';
        }
        return 'Esta palabra está negada por una doble negación (οὐ μή), que es la forma de negación más fuerte que existe: «de ningún modo sucederá».';
    },
    men_de_contrast: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'μέν') return 'Esta palabra abre la primera mitad de un contraste — el lado de «por una parte». Mira hacia su pareja (δέ), que completa la otra mitad.';
        if (lm === 'δέ')  return 'Esta palabra recoge la segunda mitad de un contraste — el lado de «por otra parte». Responde a la primera mitad introducida antes por μέν.';
        return 'Esta palabra forma parte de un contraste (μέν…δέ) que pone dos cosas lado a lado — «por una parte… por otra parte».';
    },
    parenthesis: (token) => {
        const lm = (token && token.lemma) || '';
        if (lm === 'εἰμί') return 'Esta palabra anuncia una reformulación — «es decir» — e introduce una explicación insertada en el flujo.';
        if (['λέγω', 'φημί', 'οἶμαι'].includes(lm)) {
            return 'Esta palabra anuncia que el hablante sale brevemente del hilo principal para añadir algo.';
        }
        return 'Desde esta palabra, se inserta una nota explicativa en medio del pensamiento principal.';
    },
    nominative_pendens:        () => 'Esta palabra es el tema de la oración.',
    conditional_counterfactual:() => 'Este «si» introduce una condición que en realidad no se cumplió — una declaración del tipo «qué habría pasado si hubiera sido de otro modo».',
    conditional_assumed_true:  () => 'Este «si» no expresa duda — trata la condición como si fuera verdadera.',
};;

async function _buildObservationHTML(words, idx, existingTexts) {
    const proj = await _getReadingSupportProjection(words);
    const w = proj && proj.words ? proj.words[idx] : null;
    if (!w || !w.categories) return null;

    /* 指させる語か: 節 → 打ち消し・対 → 接続 → 動詞 → 談話 → 主格の順で判定を探す。
       （discourse は挿入句、nominative は懸垂主格の役割文のためにのみ走査 —
       これらのカテゴリで文を持つのは _WORD_ROLE_TEXT の現象だけ）
       表示可否は Reading Policy（正規化スコープに word を含む × priority ≥ normal ×
       confidence ≥ min_confidence）が決める。verse 専用スコープの現象は
       Passage Note が担当するためここでは出さない（二重表示の禁止）。
       multiple（verse+word）の現象は _WORD_ROLE_TEXT の役割文を優先する。 */
    const _obPolicy  = _wallacePipeline?.policy;
    const _obRule    = _obPolicy?.rules?.observation || {};
    const _obMinConf = _obPolicy?.rules?.min_confidence ?? 0.40;
    const _obAllowed = (id) => {
        const ph = _obPolicy?.byId?.[id];
        if (!ph) return true;   // ポリシー未定義IDは従来どおり（保守的に許可）
        const scopes = _policyScopes(ph);
        return (_obRule.scopes || []).some(s => scopes.includes(s)) &&
               (_obRule.priorities || []).includes(ph.priority);
    };
    const _isEnOb    = window.I18N && I18N.lang === 'en';
    const _isEsOb    = window.I18N && I18N.lang === 'es';
    const _obRoleTable = _isEsOb ? _WORD_ROLE_TEXT_ES : _isEnOb ? _WORD_ROLE_TEXT_EN : _WORD_ROLE_TEXT;
    const _obSentTable = _isEsOb ? _OBSERVATION_SENTENCES_ES : _isEnOb ? _OBSERVATION_SENTENCES_EN : _OBSERVATION_SENTENCES;
    let make = null;
    let evidenceLine = null;
    for (const cat of ['clause', 'particle', 'conjunction', 'verb', 'infinitive', 'discourse', 'nominative']) {
        const c = w.categories[cat];
        if (!c || c.confidence < _obMinConf || !_obAllowed(c.id)) continue;

        /* matched signals は ReadingFormatter に渡し、実際の根拠と判断基準を
           一文に変換する。ID・信頼度・生シグナルは画面へ出さない。 */
        const evidence = _wallacePipeline?.rf?.formatEvidence({
            id: c.id,
            signals: c.signals || [],
        });
        if (evidence) {
            evidenceLine = evidence;
            break;
        }

        const ph = _obPolicy?.byId?.[c.id];
        if (ph && _obRoleTable[ph.phenomenon]) {
            make = () => _obRoleTable[ph.phenomenon](words[idx]);
            break;
        }
        if (_obSentTable[c.id]) {
            make = _obSentTable[c.id];
            break;
        }
    }
    if (!make && !evidenceLine) return null;

    let line = evidenceLine;
    if (!line) {
        /* Stage A: Observation の対象語引用も Engine 出力ベース */
        const quoted = _renderQuoteViaEngine({ type: '', start: idx, end: idx }, idx, words);
        if (!quoted) return null;
        line = make(quoted);
    }

    /* 重複禁止: 既に出ている文（この節の読書メモ・かたまり）と同内容なら沈黙 */
    if ((existingTexts || []).some(t => t && String(t).includes(line))) return null;
    /* 言い換え禁止（Phase 26 編集）: 節の読書メモが同じことを別の言い方で
       述べている場合も沈黙する（役割の重複を避ける） */
    const rnText = String((existingTexts || [])[0] ?? '');
    const OVERLAP = [
        [/なぜ成立|理由/, /理由/],
        [/対比|転換/, /向きが変わ|次へ進み/],
        [/内容が具体的/, /中身/],
        [/目的として何が/, /目的が始まり/],
    ];
    if (rnText && OVERLAP.some(([rn, ob]) => rn.test(rnText) && ob.test(line))) return null;

    return `<div class="rn-prose reading-block"><p class="rn-prose-text reading-prose">${line}</p></div>`;
}
/* __OBSERVATION_END__ */

/* ══════════════════════════════════════════════════════════════════
   Phase ESM-44-B: Observation 表示整形（案C・表示層のみ）
   設計正典: docs/specs/LAYER_ARCHITECTURE.md §4「Observation」

   _buildObservationHTML() / _OBSERVATION_SENTENCES / _WORD_ROLE_TEXT は
   一切変更しない。ここでは、その戻り値（既に生成済みのHTML文字列）に対し、
   bible_data.japanese 由来の既知の角括弧引用（「［○○語句］」の7パターンのみ）を
   汎用自己参照「語」へ機械的に置換するだけの後処理を行う。
   新しい意味生成・翻訳・推論は行わない（対象語自体は既にヘッダー表示済みのため
   情報欠落は生じない。_WORD_ROLE_TEXT の nominative_pendens が同種の
   汎用自己参照「この語」を既に用いている前例を踏襲する）。
   対象7パターン以外の文字列には一切触れない（単純な完全一致の置換のみ）。
   Desktop/Mobile共通で同じ結果になるよう、呼び出し元（_buildObservationHTML()の
   戻り値を受け取る側）で一律に適用する設計とする。
   ══════════════════════════════════════════════════════════════════ */
const _OBSERVATION_BRACKET_QUOTES = [
    '「［転換語句］」', '「［内容語句］」', '「［理由語句］」',
    '「［目的語句］」', '「［対比語句］」', '「［結論語句］」', '「［条件語句］」',
];
function _naturalizeObservationText(html) {
    if (!html) return html;
    const replacement = (window.I18N && I18N.lang === 'es') ? 'esta palabra' : (window.I18N && I18N.lang === 'en') ? 'this word' : '語';
    let out = html;
    for (const q of _OBSERVATION_BRACKET_QUOTES) {
        out = out.split(q).join(replacement);
    }
    return out;
}

/**
 * Phase 24: words に対する Reading Support Projection を返す（読み取り専用）。
 * StudyPanel 側は必要な時だけこれを読む（Phase 25 以降の消費者向け API）。
 * Projection が無い場合は null — 呼び出し側は現状表示のままでよい。
 * @returns {Promise<Object|null>}
 */
async function _getReadingSupportProjection(words) {
    if (!words || words.length === 0) return null;
    await _getWallaceClauseAnalysis(words);
    return (_wallaceClauseCache && _wallaceClauseCache.words === words)
        ? (_wallaceClauseCache.projection ?? null)
        : null;
}

/* __VERSE_NOTE_BEGIN__
   節レベル読書メモ（Passage Note の Projection 走査）— Reading Policy 駆動

   どの id をどこに表示するか（scope / priority / 現象グループ / verse_source）は
   assets/data/reading-policy.json（唯一の機械可読定義源）が決める。
   本テーブルは「現象 → 一文」の文言のみを持つ（IDは一切書かない）。
   検出は従来どおり SyntaxAnalyzer / ReadingSupportProjection（変更しない）。

   現象を追加する手順:
     1. reading-policy.json に phenomenon（scope/priority/ids）を1件追加
     2. verse スコープなら本テーブルに「現象名 → 一文」を1行追加
   コード側のロジック変更は不要。 */
const _VERSE_NOTE_TEXT = {
    /* 原語表記の原則（reading-policy.md §12）: 節文は語が未選択の場面なので、
       本文から探させたい語にだけ 日本語（ギリシャ語）の指さしを添える。 */
    negative_emphasis:
        'ここでは打ち消しのことば（οὐ μή）を二つ重ねて、『決して〜ない』と強く断言しています。',
    conditional_counterfactual:
        'ここでは、実際にはそうならなかった『もし〜だったなら』という仮定で語られています。',
    conditional_assumed_true:
        'ここでは、『もし〜なら』の条件が、事実として受け止められて話が進みます。',
    men_de_contrast:
        'ここでは、二つのことが対（μέν…δέ）に置かれて語られています。',
    emphasis_word_order:
        'ここでは、ことばの順序によって、あることばが際立たされています。',
    parenthesis:
        'ここでは、話の途中に説明の一言がはさまれています。',
    nominative_pendens:
        'ここでは、まず主題が示され、あとからそれを受け直して話が続きます。',
};
const _VERSE_NOTE_TEXT_EN = {
    negative_emphasis:
        'Here, two negatives (οὐ μή) are placed together to make a strong affirmation: this will absolutely not happen.',
    conditional_counterfactual:
        'Here, the condition is presented as something that did not actually happen — a "what if it had been otherwise" kind of statement.',
    conditional_assumed_true:
        'Here, the "if" condition is treated as something true, and the sentence proceeds on that assumption.',
    men_de_contrast:
        'Here, two things are set side by side in contrast (μέν…δέ).',
    emphasis_word_order:
        'Here, the word order brings a particular word into focus.',
    parenthesis:
        'Here, a brief explanatory note is inserted into the middle of the main thought.',
    nominative_pendens:
        'Here, the topic is introduced first, then picked up again as the sentence continues.',
}
const _VERSE_NOTE_TEXT_ES = {
    negative_emphasis:
        'Aquí, dos negaciones (οὐ μή) se colocan juntas para hacer una afirmación fuerte: esto de ningún modo sucederá.',
    conditional_counterfactual:
        'Aquí, la condición se presenta como algo que en realidad no sucedió — una declaración del tipo «qué habría pasado si hubiera sido de otro modo».',
    conditional_assumed_true:
        'Aquí, la condición del «si» se trata como algo verdadero, y la oración avanza sobre esa base.',
    men_de_contrast:
        'Aquí, dos cosas se ponen lado a lado en contraste (μέν…δέ).',
    emphasis_word_order:
        'Aquí, el orden de las palabras pone en foco una palabra en particular.',
    parenthesis:
        'Aquí, una breve nota explicativa se inserta en medio del pensamiento principal.',
    nominative_pendens:
        'Aquí, el tema se presenta primero y luego se retoma a medida que la oración continúa.',
};;

/* 現象の scope を原子スコープの配列に正規化する。
   文字列（'verse'等）・配列（['verse','word']）の両形式を受け、
   'multiple' は ['verse','word'] の別名として展開する（reading-policy.json
   の scope_note と対応）。 */
function _policyScopes(ph) {
    const s = ph?.scope;
    if (Array.isArray(s)) return s;
    if (s === 'multiple') return ['verse', 'word'];
    return s ? [s] : [];
}

/* Projection の全語 × 全カテゴリを走査し、Reading Policy の passage_note 規則
   （正規化スコープが verse を含む × priority ∈ {critical, high} × verse_source =
   'projection' × confidence ≥ min_confidence）を満たす現象の文を
   出現順・重複なしで返す。規則の値はすべて policy から読む。 */
function _collectVerseNoteSentences(proj, policy) {
    if (!proj || !Array.isArray(proj.words) || !policy) return [];
    const rule      = policy.rules?.passage_note || {};
    const minConf   = policy.rules?.min_confidence ?? 0.40;
    const textTable = (window.I18N && I18N.lang === 'es') ? _VERSE_NOTE_TEXT_ES : (window.I18N && I18N.lang === 'en') ? _VERSE_NOTE_TEXT_EN : _VERSE_NOTE_TEXT;
    const lines = [];
    for (const w of proj.words) {
        if (!w || !w.categories) continue;
        for (const c of Object.values(w.categories)) {
            if (!c || c.confidence < minConf) continue;
            const ph = policy.byId[c.id];
            if (!ph) continue;
            if (ph.verse_source !== 'projection') continue;
            const scopes = _policyScopes(ph);
            if (!(rule.scopes || []).some(s => scopes.includes(s))) continue;
            if (!(rule.priorities || []).includes(ph.priority)) continue;
            const line = textTable[ph.phenomenon];
            if (line && !lines.includes(line)) lines.push(line);
        }
    }
    return lines;
}
/* __VERSE_NOTE_END__ */

/**
 * words（節の生トークン配列）から ReadingFormatter による読書メモHTMLを
 * 組み立てる。文章は一切自前で生成しない — ReadingFormatter.format()の
 * title/summary と _VERSE_NOTE_TEXT の固定文のみを使う。
 *
 * 情報源は2系統（検出と表示の分離）:
 *   1) ClauseAnalyzer の discourse 分類 → ReadingFormatter.format/combine
 *   2) ReadingSupportProjection の節全体走査 → _collectVerseNoteSentences
 * 節が1つも検出されなくても、節レベル現象（οὐ μή 等）があれば表示する。
 * @returns {Promise<string|null>} 表示すべき内容が無ければ null
 */
async function _buildWallacePassageNoteHTML(words) {
    if (!words || words.length === 0) return null;

    const clauseResults = await _getWallaceClauseAnalysis(words);

    const pipeline = await _ensureWallacePipeline();
    if (!pipeline) return null;
    const { ca, rf } = pipeline;

    const seen = new Set();
    const sentences = [];
    for (const clause of (clauseResults || [])) {
        const discourse = ca.classifyDiscourseRelation(words, clause);
        /* UNCLASSIFIED は discourse 関係が判定されなかった節（= 言うべきことがない）
           を意味するため、汎用フォールバック文を出さずスキップする。 */
        if (!discourse?.type || discourse.type === 'UNCLASSIFIED') continue;
        const formatted  = rf.format({ discourse, type: clause.type });
        const sentence   = formatted && formatted.summary;
        if (sentence && !seen.has(sentence)) {
            seen.add(sentence);
            sentences.push(sentence);
        }
    }

    /* 複数節が検出された場合、節ごとに「ここでは、」を繰り返さず
       ReadingFormatter.combine() で1つの自然文に統合する
       （単一節の場合は combine() がそのまま元の文を返す）。 */
    const combined = sentences.length > 0 ? rf.combine(sentences) : null;

    /* 節レベル現象は combine() の「ここでは、」統合形式に合わないため、
       別段落として discourse 文の後に併記する。対象の選別は Reading Policy。 */
    const proj = await _getReadingSupportProjection(words);
    const verseLines = _collectVerseNoteSentences(proj, pipeline.policy);

    const paras = [];
    if (combined) paras.push(combined);
    for (const line of verseLines) {
        if (!paras.includes(line)) paras.push(line);
    }
    if (paras.length === 0) return null;

    return `
        <section class="wlv-reading-passage-note">
            <span class="wlv-pn-label">${_T('panel.passageReadingNote', 'この節の読書メモ')}</span>
            <div class="wlv-pn-prose">
                ${paras.map(t => `<p>${t}</p>`).join('')}
            </div>
        </section>`;
}

/**
 * #wlv-passage-note-slot を ReadingFormatter の結果で非同期に埋める。
 * 表示すべき内容が無ければ何も注入しない（説明文で埋めない＝静寂優先）。
 * ユーザーが別の節へ素早く移動した場合に古い結果を誤注入しないよう、
 * 世代カウンタで自分が最新の呼び出しかを確認してから反映する。
 */
async function _fillWallacePassageNote(words, container) {
    if (!container) return;
    const myGen = (container._wallacePassageNoteGen || 0) + 1;
    container._wallacePassageNoteGen = myGen;
    const html = await _buildWallacePassageNoteHTML(words);
    if (myGen !== container._wallacePassageNoteGen) return; // 同じコンテナで既に別の節へ移動済み
    if (!html) return;                                   // 静寂優先：空スロットのまま
    const slot = container && container.querySelector('#wlv-passage-note-slot');
    if (slot) {
        if (container.id === 'mobile-verse-area' || container.id === 'mobile-inspector-area') {
            /* 第一層の節読書メモは、本文描画の非同期完了が遅れても開いた状態で表示する。
               第三層の語レベル読書メモは別スロット（#mvv-reading-slot）で表示する。
               入口導線 Phase 1 以降、モバイルのスロットは Inspector 末尾にある。 */
            slot.outerHTML = `<details class="mvv-passage-note" open><summary>${_T('panel.passageReadingNote', 'この節の読書メモ')}</summary>${html}</details>`;
        } else {
            slot.outerHTML = html;
        }
    }
    /* 語ドロワーと同一文なら非表示。モバイルの節メモは別領域なので対象外。 */
    if (!container || (container.id !== 'mobile-verse-area' && container.id !== 'mobile-inspector-area')) {
        const ddReso = document.getElementById('wlv-dd-resonance');
        _syncWlvPassageNoteVisibility((ddReso?.textContent || '').trim());
    }
}





