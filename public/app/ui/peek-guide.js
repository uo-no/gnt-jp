/* ================================================================
   入口導線 v2 施策A: ピーク層
   本文の語タップで、その場に軽いカードを出す（画面は遷移しない）。
   原形・この箇所での意味・語義（最大3件）・出現回数だけを見せ、
   「詳しく見る」で従来の第3層遷移を実行する。出現回数は lexicon-lite の
   count（非同期ロード。届くまでは行を出さず、届いたら差し込む）。
   ================================================================ */
let _peekEl = null;
let _peekOpenedOnce = false;
let _peekOpenFor = null;
let _peekChipEl = null;
let _peekProceed = null;
let _peekLemmaId = null;

function _ntCountText(c) {
    const t = _T('panel.appearsInNt', null);
    return t ? t.replace('{n}', c) : '新約で ' + c + ' 回出てくる語';
}

function _peekCount(lemmaId) {
    try {
        const lite = (typeof _lexiconData !== 'undefined' && _lexiconData) || _peekLiteData;
        const e = (lite && lemmaId) ? lite[lemmaId] : null;
        return (e && typeof e.count === 'number') ? e.count : null;
    } catch (_) { return null; }
}


function _peekOnDocPointerDown(e) {
    if (!_peekEl || !e.target || !e.target.closest) return;
    if (e.target.closest('#word-peek')) return;
    const chipHit = e.target.closest('.wlv-chip, .ja-seg');
    /* 本文の chip は、そのクリック処理（切替・トグル）に委ねる。
       パネル等の chip は対象外なので、カードを閉じる側に倒れる。 */
    if (chipHit && !chipHit.closest('#study-panel, #mobile-inspector-area, #mobile-verse-view, #word-list-view')) return;
    _closeWordPeek();
}
function _peekOnKeyDown(e) { if (e.key === 'Escape') _closeWordPeek(); }
function _peekOnScrollOrResize() { _closeWordPeek(); }

let _peekSegEl = null;
function _closeWordPeek() {
    if (_peekEl) { _peekEl.remove(); _peekEl = null; }
    _peekOpenFor = null;
    _peekChipEl = null;
    _peekSegEl = null;
    _peekProceed = null;
    _peekLemmaId = null;
    document.removeEventListener('pointerdown', _peekOnDocPointerDown, true);
    document.removeEventListener('keydown', _peekOnKeyDown, true);
    window.removeEventListener('scroll', _peekOnScrollOrResize, true);
    window.removeEventListener('resize', _peekOnScrollOrResize);
}

function _openWordPeek(chipEl, chip, tokenId, proceed) {
    _peekOpenedOnce = true;
    _closeWordPeek();
    let data = {};
    try { data = (AppState && AppState.inspect && AppState.inspect.data) || {}; } catch (_) {}

    const el = document.createElement('div');
    el.className = 'word-peek';
    el.id = 'word-peek';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '語の概要');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'word-peek-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '閉じる');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => _closeWordPeek());
    el.appendChild(closeBtn);

    /* 階層：主役（この箇所での意味）を先に、名札（形＋原形）をその下に */
    const meaningText = data.jaWordDisplay || data.jaWord || '';
    if (meaningText) {
        const m = document.createElement('div');
        m.className = 'word-peek-meaning';
        m.textContent = meaningText;
        el.appendChild(m);
    }

    const head = document.createElement('div');
    head.className = 'word-peek-head';
    const g = document.createElement('span');
    g.className = 'word-peek-greek';
    g.textContent = chip.greek || '';
    head.appendChild(g);
    const lem = document.createElement('span');
    lem.className = 'word-peek-lemma';
    lem.textContent = _T('panel.lemmaPrefix', '原形：') + (chip.lemma || '');
    head.appendChild(lem);
    el.appendChild(head);

    if (window.I18N && I18N.lang === 'en') {
        /* 英語UI: 語義行は日本語の語義ではなく辞書の短い英語グロス。
           lite 未到着なら空で作り、_peekEnsureLite が到着後に差し込む。 */
        const gl = document.createElement('div');
        gl.className = 'word-peek-glosses';
        const en = _enSenseText(chip.lemmaId);
        if (en) gl.textContent = en; else { gl.hidden = true; _peekEnsureLite(); }
        _ensureEnSenses();
        el.appendChild(gl);
    } else {
        let glossArr = null;
        try { glossArr = chip.lemmaId ? window.App?.readingLexicon?.lookup(chip.lemmaId)?.glosses : null; } catch (_) {}
        if (Array.isArray(glossArr) && glossArr.length) {
            const gl = document.createElement('div');
            gl.className = 'word-peek-glosses';
            gl.textContent = glossArr.slice(0, 3).join('・');
            el.appendChild(gl);
        }
    }

    const countLine = document.createElement('div');
    countLine.className = 'word-peek-count';
    countLine.hidden = true;
    el.appendChild(countLine);

    const actions = document.createElement('div');
    actions.className = 'word-peek-actions';

    const more = document.createElement('button');
    more.className = 'word-peek-more';
    more.type = 'button';
    more.textContent = _T('panel.seeDetails', '詳しく見る');
    const chev = document.createElement('span');
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '›';
    more.appendChild(chev);
    more.addEventListener('click', () => {
        const p = _peekProceed;
        _closeWordPeek();
        if (p) p();
    });
    actions.appendChild(more);

    /* ピーク→ハイライト接続：この語を対象に既存の色ピッカーを開く。
       ピッカー側の「範囲指定」から複数選択へも、そのまま入れる。 */
    const hlBtn = document.createElement('button');
    hlBtn.className = 'word-peek-hl';
    hlBtn.type = 'button';
    hlBtn.textContent = _T('ui.highlight', 'ハイライト');
    /* 既にハイライト済みの語では、ドットをその色で出す */
    try {
        const r0 = (typeof _hlRefFromEl === 'function') ? _hlRefFromEl(chipEl) : null;
        const ex0 = r0 && (typeof _hlFindExisting === 'function')
            ? _hlFindExisting(r0.book, r0.chapter, r0.verse, r0.tokenStart, r0.tokenStart) : null;
        if (ex0 && HL_COLOR_HEX[ex0.color]) hlBtn.style.setProperty('--peek-hl-dot', HL_COLOR_HEX[ex0.color]);
    } catch (_) {}
    hlBtn.addEventListener('click', () => {
        const chipNow = _peekChipEl;
        _closeWordPeek();
        if (!chipNow || typeof _hlRefFromEl !== 'function' || typeof _hlOpenPicker !== 'function') return;
        const r = _hlRefFromEl(chipNow);
        if (!r) return;
        const existing = (typeof _hlFindExisting === 'function')
            ? _hlFindExisting(r.book, r.chapter, r.verse, r.tokenStart, r.tokenStart) : null;
        const entry = Object.assign({}, existing || {
            book: r.book, chapter: r.chapter, verse: r.verse,
            tokenStart: r.tokenStart, tokenEnd: r.tokenStart,
            color: 'yellow', createdAt: Date.now()
        }, { _isExisting: !!existing });
        _hlOpenPicker(entry, chipNow);
    });
    actions.appendChild(hlBtn);
    el.appendChild(actions);

    document.body.appendChild(el);
    _peekEl = el;
    _peekOpenFor = tokenId;
    _peekChipEl = chipEl;
    _peekProceed = proceed;
    _peekLemmaId = chip.lemmaId || null;

    /* 回数：辞書データが既にあれば即表示、無ければロードして差し込む */
    const c0 = _peekCount(_peekLemmaId);
    if (c0 != null) {
        countLine.textContent = _ntCountText(c0);
        countLine.hidden = false;
    } else {
        _peekEnsureLite();
    }

    /* 位置（PC：語の近くに浮かせる。モバイルは CSS が画面下部に固定する） */
    if (window.innerWidth > 900 && chipEl && chipEl.getBoundingClientRect) {
        const r = chipEl.getBoundingClientRect();
        const w = el.offsetWidth, h = el.offsetHeight;
        let left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, window.innerWidth - w - 8));
        let top = r.bottom + 8;
        if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    }

    document.addEventListener('pointerdown', _peekOnDocPointerDown, true);
    document.addEventListener('keydown', _peekOnKeyDown, true);
    window.addEventListener('scroll', _peekOnScrollOrResize, true);
    window.addEventListener('resize', _peekOnScrollOrResize);
}

/* ══════════════════════════════════════════
   口語訳アラインメント（パイロット）— セグメントのタップ／ピーク／詳細遷移
   本文チップのピーク（_openWordPeek）と同じ作法で、口語訳の区間からも
   軽いカードを挟む。詳細遷移は _wlvChipClick の proceed と同じ入口
   （openInspectorDetail / openMobileVerseView）を使い、チップ化は
   _wordToFlowChip で共通化する。
   ══════════════════════════════════════════ */
function _jaSegKey(segEl) {
    return 'seg:' + segEl.dataset.jaBook + ':' + segEl.dataset.jaCh + ':' + segEl.dataset.jaV + ':' + (segEl.dataset.jaTokens || '');
}
function _jaSegTokenIdxList(segEl) {
    return (segEl.dataset.jaTokens || '').split(',').map(Number).filter(n => Number.isFinite(n) && n >= 1);
}

function _jaSegClick(segEl, ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    if (!segEl || !segEl.dataset) return;
    const tis = _jaSegTokenIdxList(segEl);
    if (!tis.length) return;
    if (typeof _hlState !== 'undefined' && _hlState.multiSelectActive) {
        _jaSegMultiSelectTap(segEl, tis);
        return;
    }
    /* 既存ツアー実行中はチップと同じくピークを挟まず、詳細へ直接進む */
    const _tourActive = !!(window.App && window.App.onboarding
        && typeof window.App.onboarding.isActive === 'function'
        && window.App.onboarding.isActive());
    if (_tourActive) { _jaSegProceed(segEl, tis[0]); return; }
    if (_peekOpenFor === _jaSegKey(segEl)) { _closeWordPeek(); return; }
    _openSegPeek(segEl, tis);
}

/* 複数選択モード中のセグメントタップ：区間の全トークンをまとめて選択へ出し入れする */
function _jaSegMultiSelectTap(segEl, tis) {
    const book = segEl.dataset.jaBook, chapter = Number(segEl.dataset.jaCh), verse = Number(segEl.dataset.jaV);
    tis.forEach(tokenStart => {
        const key = [String(book), chapter, verse, tokenStart].join(':');
        const idx = _hlState.multiSelectEntries.findIndex(item => [String(item.book), Number(item.chapter), Number(item.verse), Number(item.tokenStart)].join(':') === key);
        if (idx >= 0) { _hlState.multiSelectEntries.splice(idx, 1); }
        else {
            const existing = _hlFindExisting(book, chapter, verse, tokenStart, tokenStart);
            _hlState.multiSelectEntries.push(Object.assign({}, existing || { book: String(book), chapter, verse, tokenStart, tokenEnd: tokenStart, color: 'yellow', createdAt: Date.now() }, { _isExisting: !!existing }));
        }
    });
    const anySelected = tis.some(t => _hlState.multiSelectEntries.some(item => String(item.book) === String(book) && Number(item.chapter) === chapter && Number(item.verse) === verse && Number(item.tokenStart) === t));
    segEl.classList.toggle('hl-multi-selected', anySelected);
    _hlShowSelectionBar('multi', _hlState.multiSelectEntries.length);
}

/* トークン集合 → ハイライトエントリ。連続範囲は1エントリ、飛び飛びは語ごとの
   エントリにする（既存の範囲保存モデルにそのまま乗せるためのパイロット方針）。 */
function _hlEntriesForTokens(book, chapter, verse, tis) {
    const sorted = [...new Set((tis || []).map(Number))].filter(n => Number.isFinite(n) && n >= 1).sort((a, b) => a - b);
    if (!sorted.length) return [];
    const mk = (st, en) => {
        const ex = (typeof _hlFindExisting === 'function') ? _hlFindExisting(book, chapter, verse, st, en) : null;
        return Object.assign({}, ex || { book: String(book), chapter, verse, tokenStart: st, tokenEnd: en, color: 'yellow', createdAt: Date.now() }, { _isExisting: !!ex });
    };
    const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
    if (contiguous) return [mk(sorted[0], sorted[sorted.length - 1])];
    return sorted.map(n => mk(n, n));
}

function _openSegPeek(segEl, tis) {
    _peekOpenedOnce = true;
    _closeWordPeek();
    const book = segEl.dataset.jaBook, ch = Number(segEl.dataset.jaCh), v = Number(segEl.dataset.jaV);
    const toks = tis.map(ti => _jaSegToken(book, ch, v, ti)).filter(Boolean);
    if (!toks.length) return;

    const el = document.createElement('div');
    el.className = 'word-peek';
    el.id = 'word-peek';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', '語の概要');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'word-peek-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '閉じる');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => _closeWordPeek());
    el.appendChild(closeBtn);

    let lemmaIdForCount = null;
    if (toks.length === 1) {
        /* 単一トークンの区間：チップのピークと同じ階層（意味→名札→語義→回数） */
        const w = toks[0];
        const words = _jaSegVerseWords(book, ch, v);
        const idx = words.indexOf(w);
        let meaning = '';
        try {
            const resolved = window.App?.readingEngine?.resolve(w, _buildReadingContext(words, idx));
            meaning = (resolved && resolved.japanese) || w.japanese || '';
            if (meaning && window.App?.PresentationPolicy) {
                meaning = window.App.PresentationPolicy.formatDisplay(meaning, resolved && resolved.source, words, idx);
            }
        } catch (_) { meaning = w.japanese || ''; }
        /* Phase 1b Step 3: 英語UIでは WEB グロスを「この箇所での意味」にする。 */
        const _enSegMeaning = _glossSidecarFor(w);
        if (_enSegMeaning) meaning = _enSegMeaning;
        if (meaning) {
            const m = document.createElement('div');
            m.className = 'word-peek-meaning';
            m.textContent = meaning;
            el.appendChild(m);
        }
        const head = document.createElement('div');
        head.className = 'word-peek-head';
        const g = document.createElement('span');
        g.className = 'word-peek-greek';
        g.textContent = w.text || '';
        head.appendChild(g);
        const lem = document.createElement('span');
        lem.className = 'word-peek-lemma';
        lem.textContent = _T('panel.lemmaPrefix', '原形：') + (w.lemma || '');
        head.appendChild(lem);
        el.appendChild(head);

        if (window.I18N && I18N.lang === 'en') {
            /* 英語UI: 辞書の短い英語グロス（無ければ bible_data の gloss） */
            const gl = document.createElement('div');
            gl.className = 'word-peek-glosses';
            const en = _enSenseText(w.lemmaId) || ((typeof w.gloss === 'string' && w.gloss) ? w.gloss : null);
            if (en) gl.textContent = en; else { gl.hidden = true; _peekEnsureLite(); }
            _ensureEnSenses();
            el.appendChild(gl);
        } else {
            let glossArr = null;
            try { glossArr = w.lemmaId ? window.App?.readingLexicon?.lookup(w.lemmaId)?.glosses : null; } catch (_) {}
            if (Array.isArray(glossArr) && glossArr.length) {
                const gl = document.createElement('div');
                gl.className = 'word-peek-glosses';
                gl.textContent = glossArr.slice(0, 3).join('・');
                el.appendChild(gl);
            }
        }
        lemmaIdForCount = w.lemmaId || null;
    } else {
        /* 複数トークンの区間：見出しは区間の訳文そのもの（この箇所での意味）、
           名札として内訳の各語を並べる。出現回数は合算に意味がないため出さない。 */
        const m = document.createElement('div');
        m.className = 'word-peek-meaning';
        m.textContent = segEl.textContent || '';
        el.appendChild(m);
        toks.forEach(w => {
            const head = document.createElement('div');
            head.className = 'word-peek-head';
            const g = document.createElement('span');
            g.className = 'word-peek-greek';
            g.textContent = w.text || '';
            head.appendChild(g);
            const lem = document.createElement('span');
            lem.className = 'word-peek-lemma';
            const _wTag = _glossSidecarFor(w) || w.japanese;
            const _tagSuffix = _wTag
                ? ((window.I18N && I18N.lang === 'en') ? ' (' + _wTag + ')' : '（' + _wTag + '）')
                : '';
            lem.textContent = _T('panel.lemmaPrefix', '原形：') + (w.lemma || '') + _tagSuffix;
            head.appendChild(lem);
            el.appendChild(head);
        });
    }

    const countLine = document.createElement('div');
    countLine.className = 'word-peek-count';
    countLine.hidden = true;
    el.appendChild(countLine);

    const actions = document.createElement('div');
    actions.className = 'word-peek-actions';

    const more = document.createElement('button');
    more.className = 'word-peek-more';
    more.type = 'button';
    more.textContent = _T('panel.seeDetails', '詳しく見る');
    const chev = document.createElement('span');
    chev.setAttribute('aria-hidden', 'true');
    chev.textContent = '›';
    more.appendChild(chev);
    more.addEventListener('click', () => {
        const p = _peekProceed;
        _closeWordPeek();
        if (p) p();
    });
    actions.appendChild(more);

    const hlBtn = document.createElement('button');
    hlBtn.className = 'word-peek-hl';
    hlBtn.type = 'button';
    hlBtn.textContent = _T('ui.highlight', 'ハイライト');
    /* 既にハイライト済みの区間では、ドットをその色で出す */
    try {
        const exEntries = _hlEntriesForTokens(book, ch, v, tis).filter(en => en._isExisting);
        if (exEntries.length && HL_COLOR_HEX[exEntries[0].color]) {
            hlBtn.style.setProperty('--peek-hl-dot', HL_COLOR_HEX[exEntries[0].color]);
        }
    } catch (_) {}
    hlBtn.addEventListener('click', () => {
        const segNow = _peekSegEl;
        _closeWordPeek();
        if (!segNow || typeof _hlOpenPicker !== 'function') return;
        const entries = _hlEntriesForTokens(segNow.dataset.jaBook, Number(segNow.dataset.jaCh), Number(segNow.dataset.jaV), _jaSegTokenIdxList(segNow));
        if (!entries.length) return;
        if (entries.length === 1) _hlOpenPicker(entries[0], segNow);
        else _hlOpenPicker({ _isBatch: true, entries });
    });
    actions.appendChild(hlBtn);
    el.appendChild(actions);

    document.body.appendChild(el);
    _peekEl = el;
    _peekOpenFor = _jaSegKey(segEl);
    _peekChipEl = null;
    _peekSegEl = segEl;
    _peekProceed = () => _jaSegProceed(segEl, tis[0]);
    _peekLemmaId = lemmaIdForCount;

    const c0 = _peekCount(_peekLemmaId);
    if (c0 != null) {
        countLine.textContent = _ntCountText(c0);
        countLine.hidden = false;
    } else if (_peekLemmaId) {
        _peekEnsureLite();
    }

    if (window.innerWidth > 900 && segEl && segEl.getBoundingClientRect) {
        const r = segEl.getBoundingClientRect();
        const pw = el.offsetWidth, ph = el.offsetHeight;
        let left = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), Math.max(8, window.innerWidth - pw - 8));
        let top = r.bottom + 8;
        if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    }

    document.addEventListener('pointerdown', _peekOnDocPointerDown, true);
    document.addEventListener('keydown', _peekOnKeyDown, true);
    window.addEventListener('scroll', _peekOnScrollOrResize, true);
    window.addEventListener('resize', _peekOnScrollOrResize);
}

/* セグメントから StudyPanel 詳細へ。_wlvChipClick の proceed と同じ状態遷移を、
   対象トークン（区間の最初の語）に対して行う。 */
function _jaSegProceed(segEl, ti) {
    const book = segEl.dataset.jaBook, ch = Number(segEl.dataset.jaCh);
    const words = _jaSegVerseWords(book, ch, Number(segEl.dataset.jaV));
    const idx = words.findIndex(w => Number(w.tokenIndex) === Number(ti));
    if (idx < 0) return;
    const w = words[idx];
    let analysis = null;
    try { analysis = getAnalysis({ tokens: words }); } catch (_) { analysis = null; }
    const chip = _wordToFlowChip(w, idx, book, ch, analysis ? analysis[idx] : undefined, words);
    if (!chip) return;

    const _reCtx = _buildReadingContext(words, idx);
    const _reResolved = window.App?.readingEngine?.resolve(w, _reCtx);
    const _resolvedJa = _reResolved?.japanese;
    const _resolvedJaDisplay = (_resolvedJa && window.App?.PresentationPolicy)
        ? window.App.PresentationPolicy.formatDisplay(_resolvedJa, _reResolved.source, words, idx)
        : _resolvedJa;
    /* Phase 1b Step 3: 英語UIでは「この箇所での意味」を WEB グロスにする
       （ピーク／ドロワー／パネルは inspect.data の jaWord 系を読む）。 */
    const _enGlossInspect = _glossSidecarFor(w);

    AppState.inspect.data = {
        greek:    chip.greek,
        strong:   chip.strong,
        jpMorph:  chip.morphText,
        rawMorph: chip.rawMorph,
        lemma:    chip.lemma,
        jaWord:   _enGlossInspect || _resolvedJa || chip.jaWord,
        jaWordDisplay: _enGlossInspect || _resolvedJaDisplay || _resolvedJa || chip.jaWord,
        desc:     chip.strong ? _abbottDesc(chip.strong.slice(1)) : '',
        ref:      chip.ref,
        bookKey:  chip.bookKey || '',
        ch:       chip.ch != null ? chip.ch : null,
        verse:    chip.verse != null ? chip.verse : null,
        language: chip.language || 'grc',
        corpusId: chip.corpusId || '',
        lemmaId:  chip.lemmaId != null ? chip.lemmaId : null,
        referentEvidence: createReferentEvidence(w),
        subjrefEvidence: createSubjrefEvidence(w),
    };
    _wlvActiveTokenId = chip.tokenId;
    _wlvActiveScopeWords = words;

    if (window.App.storage && chip.strong) {
        window.App.storage.addRecentWord({
            lemma: chip.lemma,
            strong: chip.strong,
            bookKey: chip.bookKey || '',
            chapter: chip.ch != null ? Number(chip.ch) : null,
            verse: chip.verse != null ? Number(chip.verse) : null,
        });
    }

    if (_isActualMobile()) {
        const _keep = {
            jaWordDisplay: AppState.inspect.data.jaWordDisplay,
            jaWord: AppState.inspect.data.jaWord,
            strong: AppState.inspect.data.strong,
            lemmaId: AppState.inspect.data.lemmaId,
            referentEvidence: AppState.inspect.data.referentEvidence,
            subjrefEvidence: AppState.inspect.data.subjrefEvidence,
        };
        AppState.toBrowsing(chip.verse ?? null, words, null, chip.ch != null ? Number(chip.ch) : null);
        AppState.inspect.data = _keep;
        notifyAppStateChange();
        openMobileVerseView(chip.verse ?? null, words, null, chip.ch != null ? Number(chip.ch) : null);
        openInspectorDetail(chip.greek, chip.rawMorph, chip.ref, chip.lemma);
        window.App.onboarding?.onWordClicked(segEl);
        _syncOnboardingActiveFlag();
        return;
    }
    AppState.selectedVerse = { vNum: chip.verse ?? null, elWords: words, ch: chip.ch != null ? Number(chip.ch) : null };
    AppState.studyOrigin = { surface: _transA, entryPoint: 'wlv' };
    _setStudyTarget(chip.ref, chip.verseId);
    openInspectorDetail(chip.greek, chip.rawMorph, chip.ref, chip.lemma);
    window.App.onboarding?.onWordClicked(segEl);
    _syncOnboardingActiveFlag();
}

/* ================================================================
   入口導線 v2 施策C: 初回ガイド（軽量版）
   初めての「素の着地」でのみ、本文の最初の語チップをそっと光らせて
   一言だけ添える。その語が押されればピークが開く（＝体験で覚える）。
   それ以外の操作でも静かに終わり、二度と出ない（一度きり）。
   - 共有リンク着地（節・モード指定つき URL）では出さない
   - 既存ツアー実行中は重ねない
   - 口語訳など本文に語チップが無い画面では出さない（資格は保持され、
     同じ訪問で語順などに切り替われば、その時点で出す）
   ================================================================ */
const _FG_GUIDE_KEY = 'fg_guide_seen';
let _fgGuideChip = null;
let _fgGuideHint = null;
let _fgGuideTimer = null;

function _fgGuideSeen() {
    try { return !!localStorage.getItem(_FG_GUIDE_KEY); } catch (_) { return true; }
}
function _fgGuideMarkSeen() {
    try { localStorage.setItem(_FG_GUIDE_KEY, '1'); } catch (_) {}
}

function _fgGuideEnd() {
    if (_fgGuideChip) { _fgGuideChip.classList.remove('fg-guide-pulse'); _fgGuideChip = null; }
    if (_fgGuideHint) { _fgGuideHint.remove(); _fgGuideHint = null; }
    if (_fgGuideTimer) { clearTimeout(_fgGuideTimer); _fgGuideTimer = null; }
    document.removeEventListener('pointerdown', _fgGuideOnPointerDown, true);
    window.removeEventListener('scroll', _fgGuideEnd, true);
    window.removeEventListener('resize', _fgGuideEnd);
}

function _fgGuideOnPointerDown() {
    /* 対象チップのタップでも、それ以外の操作でも、ガイドはここで終わる。
       対象チップのクリック自体は通常どおり伝播し、ピークが開く。 */
    _fgGuideEnd();
}

function _fgGuideStart(chip) {
    _fgGuideMarkSeen();
    _fgGuideChip = chip;
    chip.classList.add('fg-guide-pulse');
    const hint = document.createElement('div');
    hint.className = 'fg-guide-hint';
    hint.id = 'fg-guide-hint';
    hint.textContent = (window.I18N && I18N.lang === 'en')
        ? 'Tap any word to explore it.'
        : '気になる語を押してみてください';
    document.body.appendChild(hint);
    _fgGuideHint = hint;
    const r = chip.getBoundingClientRect();
    const w = hint.offsetWidth, h = hint.offsetHeight;
    const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), Math.max(8, window.innerWidth - w - 8));
    let top = r.bottom + 10;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 10);
    hint.style.left = left + 'px';
    hint.style.top = top + 'px';
    document.addEventListener('pointerdown', _fgGuideOnPointerDown, true);
    window.addEventListener('scroll', _fgGuideEnd, true);
    window.addEventListener('resize', _fgGuideEnd);
    _fgGuideTimer = setTimeout(_fgGuideEnd, 20000);
}

function _fgGuideMaybeStart() {
    if (_fgGuideSeen()) return;
    /* 素の着地のみ：パスが「/」「/書名/章」「/書名/章/モード」まで。
       節番号を含む URL（/書名/章/節…）は共有リンク着地とみなして出さない。
       モードは表示の好みであって課題ではないため、節とは区別する。 */
    const p = (location.pathname || '/').replace(/\/+$/, '');
    if (p !== '' && !/^\/[A-Za-z0-9]+\/\d+(\/[A-Za-z][A-Za-z0-9_]*)?$/.test(p)) return;
    /* 既存ツアー実行中は重ねない（ツアーが案内を担う。一度きりに数える） */
    let tourActive = false;
    try {
        tourActive = !!(window.App && window.App.onboarding
            && typeof window.App.onboarding.isActive === 'function'
            && window.App.onboarding.isActive());
    } catch (_) {}
    if (tourActive) { _fgGuideMarkSeen(); return; }
    const area = document.getElementById('bible-text-area');
    if (!area) return;
    let finished = false;
    let observer = null;
    const finish = () => {
        finished = true;
        if (observer) observer.disconnect();
    };
    const tryStart = () => {
        if (finished || _fgGuideSeen()) { finish(); return; }
        /* 既にピークを開いた人には不要（体験済み。一度きりに数える） */
        if (_peekOpenedOnce) { _fgGuideMarkSeen(); finish(); return; }
        const chip = area.querySelector('.verse-block .wlv-chip');
        if (!chip) return;
        const r = chip.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        finish();
        _fgGuideStart(chip);
    };
    observer = new MutationObserver(tryStart);
    observer.observe(area, { childList: true, subtree: true });
    setTimeout(finish, 30000);
    tryStart();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _fgGuideMaybeStart);
} else {
    _fgGuideMaybeStart();
}

function _wlvChipClick(chipEl, tokenId) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        const step = window.App.onboarding?.getState()?.onboardingStep;
        console.log('[Onboarding]', step);
    }
    const chips = document.querySelectorAll('.wlv-chip');
    chips.forEach(c => c.classList.remove('active'));
    chipEl.classList.add('active');

    const _prevActiveTokenId = _wlvActiveTokenId;  /* 同一chip再タップ判定用 */
    _wlvActiveTokenId = tokenId;

    /* Phase VR-4B-3: chip 取得の優先順位（Interaction Lifecycle是正）。
       複数節が同時に描画されうる面（Greek Flow View / 本文左列）は DOM ノードに個別保存された
       chips[] を最優先で使う。単一節のみ表示するシングルトン面（StudyPanel/Mobile Inspector）は
       _wlvChipCache を使う。どちらにも属さない、またはキャッシュ未設定の場合のみ、最終手段として
       _wlvGetChipData()（Tier 2 rollback）へフォールバックする。
       ★ .verse-pair-right は 'verse-block verse-pair-right' という複合クラスを持つため、
         .closest('.verse-block') は Greek Flow View の chip でも真になる（.gf-verse-block の
         祖先でもある）。そのため .gf-verse-block を必ず先に判定する（順序を変えないこと）。
       VR-2 Phase 2: 配列位置ではなく tokenId 一致で chip を検索する（Token Identity Contract）。
       複数節同時表示時に配列位置がずれて別節の chip を誤って取得するリスクを構造的に排除する。 */
    const gfBlock    = chipEl.closest('.gf-verse-block');
    const verseBlock = chipEl.closest('.verse-block');
    let chip;
    if (gfBlock && gfBlock._flowChips) {
        chip = gfBlock._flowChips.find(c => c.tokenId === tokenId);
    } else if (verseBlock && verseBlock._flowChips) {
        chip = verseBlock._flowChips.find(c => c.tokenId === tokenId);
    } else if (_wlvChipCache && _wlvChipCache.length) {
        chip = _wlvChipCache.find(c => c.tokenId === tokenId);
    } else {
        chip = _wlvGetChipData(tokenId);
    }
    if (!chip) return;

    if (_hlState.multiSelectActive) {
        _hlMultiSelectTap(chipEl, chip);
        return;
    }

    /* ReadingEngine: 生トークン（decoded フィールドを持つ）から改善済み日本語を取得。
       Phase 2: 節トークン配列から ResolveContext を構築して注入する（同期・軽量）。
       Phase VR-4B-5: Representation lifecycle 是正。
       prefer verse-local words stored on DOM representation（gfBlock/verseBlock）;
       _wlvWordCache remains legacy fallback only（シングルトン面専用・複数節同時表示時は
       別節の残骸を指しうるため最終手段としてのみ使う）。
       chip 取得（上記）と同じ優先順位に揃えることで、chip と Inspector 再解決が
       常に同一節を参照するようにする（節取り違え防止・SSOT維持）。
       VR-2 Phase 2: tokenId から findIndex() で一度だけ配列位置を求め、以降はその idx を
       使い回す（find() と indexOf() の二重探索をしない）。_buildReadingContext 等の下流関数は
       実際の配列位置を必要とするため、idx 自体は引き続き使用する（tokenId は「対象を特定する
       ための鍵」、idx は「その対象の文脈上の位置」という別の役割であり、後者は変更しない）。 */
    const _reWords  =
        gfBlock?._flowWords ||
        verseBlock?._flowWords ||
        _wlvWordCache;
    _wlvActiveScopeWords = _reWords;   /* _mobileInspectorDetail 側の橋渡し用 */
    const _reIdx    = _reWords ? _reWords.findIndex(w => w.tokenId === tokenId) : -1;
    const _rawToken = _reIdx !== -1 ? _reWords[_reIdx] : undefined;
    const _reCtx    = _buildReadingContext(_reWords, _reIdx);
    const _reResolved = window.App?.readingEngine?.resolve(_rawToken, _reCtx);
    const _resolvedJa = _reResolved?.japanese;
    /* Stage C P1: StudyPanel 用の表示整形（内部値 jaWord は生のまま保持） */
    const _resolvedJaDisplay = (_resolvedJa && window.App?.PresentationPolicy)
        ? window.App.PresentationPolicy.formatDisplay(
            _resolvedJa, _reResolved.source, _reWords, _reIdx)
        : _resolvedJa;
    /* Phase 1b Step 3: 英語UIでは「この箇所での意味」を WEB グロスにする。 */
    const _enGlossInspect2 = _rawToken ? _glossSidecarFor(_rawToken) : null;

    /* AppState の inspect を更新
       ★ SSOT: ref は表示専用として保持。ロジックには bookKey / ch / verse を使う。 */
    AppState.inspect.data = {
        greek:    chip.greek,
        strong:   chip.strong,
        jpMorph:  chip.morphText,
        rawMorph: chip.rawMorph,
        lemma:    chip.lemma,
        jaWord:   _enGlossInspect2 || _resolvedJa || chip.jaWord,
        /* Stage C P1: 表示用整形値（生の jaWord とは別に保持 — SSOT は不変） */
        jaWordDisplay: _enGlossInspect2 || _resolvedJaDisplay || _resolvedJa || chip.jaWord,
        desc:     chip.strong ? _abbottDesc(chip.strong.slice(1)) : '',
        ref:      chip.ref,      // 表示専用（ラベル・URL クエリ文字列のみ）
        bookKey:  chip.bookKey  || '',
        ch:       chip.ch       != null ? chip.ch    : null,
        verse:    chip.verse    != null ? chip.verse  : null,
        language: chip.language || 'grc',
        corpusId: chip.corpusId || '',
        lemmaId:  chip.lemmaId  != null ? chip.lemmaId : null,
        /* Phase ESM-8: Referent Evidence（存在する場合のみ。read-only転写、推論なし） */
        referentEvidence: createReferentEvidence(_rawToken),
        /* Phase ESM-39: Subjref Evidence（存在する場合のみ。read-only転写、推論なし） */
        subjrefEvidence: createSubjrefEvidence(_rawToken),
    };

    if (window.App.storage && chip.strong) {
        window.App.storage.addRecentWord({
            lemma: chip.lemma,
            strong: chip.strong,
            bookKey: chip.bookKey || '',
            chapter: chip.ch != null ? Number(chip.ch) : null,
            verse: chip.verse != null ? Number(chip.verse) : null,
        });
    }

    if (verseBlock) {
        /* 入口導線 v2 施策A: 本文の chip タップでは、画面を遷移させる前に
           ピーク層（その場の軽いカード）を挟む。「詳しく見る」で従来の
           Level3 遷移（_proceedToDetail に退避した既存処理）をそのまま実行する。
           ピークを挟まない場合:
             - 既存ツアー実行中（ツアーは語タップで進む設計のため、横取りしない）
             - 原形が無いなど、カードに出す材料が無い場合
           同じ語の再タップは、カードを閉じる（パネル内ドロワーと同じ作法）。 */
        const _proceedToDetail = () => {
        if (_isActualMobile()) {
            /* E-1D: Mobile では FLOW 本文 chip も MobileVerseView 経路へ統一（Bottom Sheet を出さない）。
               当該節の MVV を開いて（Level2 器・メモ・タイトル・履歴を準備）から Level3 詳細を表示する。
               AppState.toBrowsing は通常の節タップと同じ既存セッタ（selectedVerse を確定＝メモ ref 用）。 */
            const _mvWords = verseBlock._flowWords || _wlvWordCache || [];
            /* VR-2 Phase 2: _mvWords は _reWords と同一とは限らない（gfBlock/verseBlock が
               両方truthyな場合、_reWords は gfBlock 優先だが _mvWords は verseBlock固定のため）。
               既存の優先順位ロジックを変えないため、ここで独立に findIndex() する。 */
            const _mvIdx   = _mvWords.findIndex(w => w.tokenId === tokenId);
            const _mvVNum  = (chip.verse != null) ? chip.verse
                           : ((_mvWords[_mvIdx] && _mvWords[_mvIdx].verse != null) ? _mvWords[_mvIdx].verse : null);
            /* Phase ESM-9/ESM-25/ESM-39: AppState.toBrowsing() は inspect.data 全体を null に
               リセットする（既存仕様・他の呼び出し元があるため変更しない）。_mobileInspectorDetail は
               greek/lemma/rawMorph は関数引数からのフォールバックを持つため reset の影響を
               受けないが、jaWordDisplay/jaWord（Gloss）・strong・referentEvidence・subjrefEvidence は
               AppState.inspect.data からしか読めず reset で失われる（ESM-24で確認済みの構造と同型）。
               Referent Evidence と同じ要領で、失われるフィールドのみ退避し、reset 直後に復元する
               （greek/lemma/rawMorph は引数経由で渡るため対象外＝最小差分）。 */
            const _jaWordDisplayForMobile    = AppState.inspect.data?.jaWordDisplay || null;
            const _jaWordForMobile           = AppState.inspect.data?.jaWord || null;
            const _strongForMobile           = AppState.inspect.data?.strong || null;
            /* StudyPanel parity: lemmaId は Abbott-Smith / 語源 / 使用傾向 / Display Label の
               生成に必要。toBrowsing() で失われるため、他フィールドと同様に退避・復元する。 */
            const _lemmaIdForMobile          = AppState.inspect.data?.lemmaId ?? null;
            const _referentEvidenceForMobile = AppState.inspect.data?.referentEvidence || null;
            const _subjrefEvidenceForMobile  = AppState.inspect.data?.subjrefEvidence || null;
            /* ch: URL chapter 同期（連続章でchipをタップしても selectedVerse.ch が正しく更新されるよう chip.ch を渡す。desktop pathと同じ整合を取る）。 */
            AppState.toBrowsing(_mvVNum, _mvWords, null, chip.ch != null ? Number(chip.ch) : null);
            AppState.inspect.data = {
                jaWordDisplay:    _jaWordDisplayForMobile,
                jaWord:           _jaWordForMobile,
                strong:           _strongForMobile,
                lemmaId:          _lemmaIdForMobile,
                referentEvidence: _referentEvidenceForMobile,
                subjrefEvidence:  _subjrefEvidenceForMobile,
            };
            /* URL state sync: selectedVerse.ch が確定した後に章情報を URL へ反映する。 */
            notifyAppStateChange();
            openMobileVerseView(_mvVNum, _mvWords, null, chip.ch != null ? Number(chip.ch) : null);
            openInspectorDetail(chip.greek, chip.rawMorph, chip.ref, chip.lemma);
            window.App.onboarding?.onWordClicked(chipEl);
            _syncOnboardingActiveFlag();
            return;
        }
        /* Desktop は従来どおり openStudyPanel（openInspectorDetail 経由・挙動不変）。 */
        /* BUG FIX: panelGoBack() が selectedVerse.elWords を参照するため、
           word detail へ入る前に設定する（Mobile path は toBrowsing() で設定済み）。 */
        /* ch: URL chapter 同期（連続章で chip タップしても selectedVerse.ch が正しく更新されるよう chip.ch を渡す）。 */
        AppState.selectedVerse = { vNum: chip.verse ?? null, elWords: _reWords || [], ch: chip.ch != null ? Number(chip.ch) : null };
        AppState.studyOrigin = { surface: _transA, entryPoint: 'wlv' };
        _setStudyTarget(chip.ref, chip.verseId);
        openInspectorDetail(chip.greek, chip.rawMorph, chip.ref, chip.lemma);
        window.App.onboarding?.onWordClicked(chipEl);
        _syncOnboardingActiveFlag();
        };
        const _tourActive = !!(window.App && window.App.onboarding
            && typeof window.App.onboarding.isActive === 'function'
            && window.App.onboarding.isActive());
        if (_tourActive || !chip.lemma) { _proceedToDetail(); return; }
        if (_peekOpenFor === tokenId) { _closeWordPeek(); return; }
        _openWordPeek(chipEl, chip, tokenId, _proceedToDetail);
        return;
    }

    /* パネル内（流れタブ・MVV Level 2 を含む）の chip タップ：ドロワーで軽く確認する。
       Study panel へ進むかどうかは「詳しく見る」ボタン（_wlvStudyBtnClick）に委ねる。 */
    /* 同一 chip の再タップ：ドロワーが開いていれば閉じて戻る（トグル）。 */
    const drawer = document.getElementById('wlv-detail-drawer');
    if (_prevActiveTokenId === tokenId && drawer && drawer.classList.contains('visible')) {
        _wlvDrawerClose();
        return;
    }
    if (drawer) {
        const ddGreek = document.getElementById('wlv-dd-greek');
        const ddReso  = document.getElementById('wlv-dd-resonance');
        if (ddGreek) ddGreek.textContent = chip.greek || '-';
        /* 階層（ピーク層と統一）：主役＝この箇所での意味、名札に原形も添える */
        const ddMeaning = document.getElementById('wlv-dd-meaning');
        if (ddMeaning) {
            ddMeaning.textContent = (AppState.inspect.data && (AppState.inspect.data.jaWordDisplay || AppState.inspect.data.jaWord)) || '';
        }
        const ddLemma = document.getElementById('wlv-dd-lemma');
        if (ddLemma) ddLemma.textContent = chip.lemma ? _T('panel.lemmaPrefix', '原形：') + chip.lemma : '';
        /* 語義（readingLexicon.lookup().glosses）：chip 切り替え時に前の語義が残らないよう毎回更新 */
        const ddGlosses = document.getElementById('wlv-dd-glosses');
        if (ddGlosses) {
            if (window.I18N && I18N.lang === 'en') {
                /* 英語UI: 語義行は辞書の短い英語グロス */
                ddGlosses.textContent = _enSenseText(chip.lemmaId) || '';
                _ensureEnSenses();
            } else {
                const _ddGlossArr = chip.lemmaId
                    ? window.App?.readingLexicon?.lookup(chip.lemmaId)?.glosses
                    : null;
                ddGlosses.textContent = (Array.isArray(_ddGlossArr) && _ddGlossArr.length)
                    ? _ddGlossArr.slice(0, 3).join('・') : '';
            }
        }
        /* Phase ESM-18: ドロワーはLayer 1（Greek/Gloss/詳しく見る導線のみ）に限定する。
           resonance文（Wallace Reading Notesと同一生成経路）はLayer 2（StudyPanel）の
           責務のため、ここでは注入しない（_fillWlvResonance の呼び出しを停止）。 */
        if (ddReso) ddReso.textContent = '';
        drawer.classList.add('visible');
        _syncStudyVerseNav();
        const _miaOpen = document.getElementById('mobile-inspector-area');
        if (_miaOpen) _miaOpen.classList.add('drawer-open');
        _collapseInlineTranslation();
    }

    /* onboarding hook（クリックされたchip要素を渡す） */
    window.App.onboarding?.onWordClicked(chipEl);
    _syncOnboardingActiveFlag();
}

/** tokenId → chip データを _wlvWordCache から取得（VR-2 Phase 2: tokenId ベース） */
function _wlvGetChipData(tokenId) {
    if (!_wlvWordCache) return null;
    const idx = _wlvWordCache.findIndex(w => w.tokenId === tokenId);
    if (idx === -1) return null;
    return _wordToFlowChip(_wlvWordCache[idx], idx);
}
