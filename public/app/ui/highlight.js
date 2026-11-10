const HL_COLORS = ['yellow', 'blue', 'green', 'red'];
function _hlColorNames() {
    return { yellow: _T('hl.yellow', '黄'), blue: _T('hl.blue', '青'), green: _T('hl.green', '緑'), red: _T('hl.red', '赤') };
}
const HL_COLOR_HEX = { yellow: '#fccc00', blue: '#004c97', green: '#15722c', red: '#eb6100' };

/* ── 操作状態（色選択・複数語選択）── */
const _hlState = {
    lastUsedColor: null,       /* null = 初回のため色選択UIを出す */
    pickerPending: null,       /* 保存待ちのハイライトエントリ */
    multiSelectActive: false,
    multiSelectEntries: [],
};

/* ── ユーティリティ ── */

/* ref 文字列 "BOOK CH:V!N" から tokenIndex (N) を整数で返す。失敗時 null */
function _hlTokenIdxFromRef(ref) {
    if (!ref) return null;
    const idx = ref.indexOf('!');
    if (idx === -1) return null;
    const n = parseInt(ref.slice(idx + 1), 10);
    return isFinite(n) && n >= 1 ? n : null;
}

/* Bracket placeholder glosses (per-token sidecars, EN/ES): the token has
   no visible word of its own, so a saved highlight must not paint its
   chip — paint the segment partner carrying visible text instead (same
   principle as the dp decoration donation): prefer a real-text verb
   token in the same alignment segment, else the nearest real-text token
   (following first). Returns the index into `words` to paint, the same
   index when no redirection applies, or -1 when nothing may be painted.
   JA and Greek-text chips are unaffected (no sidecar / real text). */
function _hlPaintTargetIndex(words, idx) {
    if (typeof _glossTransIdForUi !== 'function' || !_glossTransIdForUi()) return idx;
    if (typeof _glossSidecarOnlyFor !== 'function' || typeof _alignSegmentKeyFor !== 'function') return idx;
    const isPh = function (w) {
        const g = _glossSidecarOnlyFor(w);
        return !!g && /^\[[^\]]*\]$/.test(String(g).trim());
    };
    if (!words[idx] || !isPh(words[idx])) return idx;
    const key = _alignSegmentKeyFor(words[idx]);
    if (!key) return -1;
    const seg = [];
    words.forEach(function (w, i) {
        if (w && _alignSegmentKeyFor(w) === key && !isPh(w)) seg.push(i);
    });
    if (!seg.length) return -1;
    const verb = seg.find(function (i) { return String(words[i].morph || '').charAt(0) === 'V'; });
    if (verb != null) return verb;
    seg.sort(function (a, b) { return (Math.abs(a - idx) - Math.abs(b - idx)) || (b - a); });
    return seg[0];
}

function _hlPaintChip(chip, color) {
    if (!chip) return;
    HL_COLORS.forEach(function (c) { chip.classList.remove('hl-word-' + c); });
    if (HL_COLORS.indexOf(color) !== -1) chip.classList.add('hl-word-' + color);
}

/* Segment surfaces outside the reading area (StudyPanel translation
   companion, mobile verse translation): paint .ja-seg segments under
   rootEl with the same rule as the reading base-text view — a segment
   is painted when its token set overlaps a saved word highlight for
   the verse (later highlights win). */
function _applySegHighlightsIn(rootEl, book, ch, vNum) {
    if (!rootEl || !window.App || !window.App.storage) return;
    const highlights = window.App.storage.getHighlights().filter(function (h) {
        return h && h.tokenStart != null
            && String(h.book) === String(book)
            && Number(h.chapter) === Number(ch)
            && Number(h.verse) === Number(vNum);
    });
    if (!highlights.length) return;
    rootEl.querySelectorAll('.ja-seg').forEach(function (seg) {
        if (seg.dataset.jaBook !== String(book)) return;
        if (Number(seg.dataset.jaCh) !== Number(ch)) return;
        if (seg.dataset.jaV != null && Number(seg.dataset.jaV) !== Number(vNum)) return;
        const tis = (seg.dataset.jaTokens || '').split(',').map(Number);
        highlights.forEach(function (h) {
            if (tis.some(function (ti) { return ti >= Number(h.tokenStart) && ti <= Number(h.tokenEnd); })) {
                _hlPaintChip(seg, h.color);
            }
        });
    });
}

/* StudyPanel verse flow: apply saved word highlights to the flow chips
   with the same per-token painting as the reading word-order view
   (including placeholder redirection). Called by study-panel.js right
   after the flow is rendered. Verse-level highlights are not painted
   here — the flow is a single-verse list, not a verse block. */
function _applyPanelFlowHighlights(rootEl, words, book, ch, vNum) {
    if (!rootEl || !Array.isArray(words) || !words.length) return;
    if (!window.App || !window.App.storage) return;
    const highlights = window.App.storage.getHighlights().filter(function (h) {
        return h && h.tokenStart != null
            && String(h.book) === String(book)
            && Number(h.chapter) === Number(ch)
            && Number(h.verse) === Number(vNum);
    });
    if (!highlights.length) return;
    const chips = Array.from(rootEl.querySelectorAll('.wlv-chip[data-token-id]'));
    if (!chips.length) return;
    highlights.forEach(function (h) {
        words.forEach(function (w, wi) {
            if (!w) return;
            const tidx = w.tokenIndex != null && w.tokenIndex !== ''
                ? parseInt(w.tokenIndex, 10)
                : _hlTokenIdxFromRef(w.ref);
            if (tidx == null || tidx < Number(h.tokenStart) || tidx > Number(h.tokenEnd)) return;
            const ti = _hlPaintTargetIndex(words, wi);
            if (ti < 0) return;
            const target = words[ti];
            const chip = chips.find(function (c) { return String(c.dataset.tokenId) === String(target.tokenId); });
            _hlPaintChip(chip, h.color);
        });
    });
}

/* AppState から現在の書物・章を返す。{book, chapter} または null */
function _hlCurrentContext() {
    const loc = AppState.location;
    if (!loc || !loc.book || loc.chapter == null) return null;
    return { book: loc.book.key, chapter: Number(loc.chapter) };
}

/* _currentVerseRef() に相当するが {book, chapter, verse} を構造で返す */
function _hlCurrentVersePos() {
    const book = AppState.location?.book?.key;
    if (!book) return null;
    const chapter = AppState.selectedVerse?.ch ?? AppState.location?.chapter;
    const verse = AppState.selectedVerse?.vNum;
    if (chapter == null || !verse) return null;
    return { book, chapter: Number(chapter), verse: Number(verse) };
}

/* AppState.inspect.data から語の位置を構造で返す。
   inspect.data.ref は "BOOK CH:VERSE!TOKEN_INDEX" 形式（表示用）。
   ここでは表示用 ref を分解して canonical 位置フィールドを抽出する。
   ref は canonical key としてではなく、座標の導出元として使用する。 */
function _hlCurrentWordPos() {
    const d = AppState.inspect.data;
    if (!d) return null;

    /* 位置の正本は inspect の構造化フィールド。ref は token index の抽出にだけ使う。 */
    const ref = typeof d.ref === 'string' ? d.ref : '';
    const sp = ref.split(' ');
    const cvt = sp.length > 1 ? sp[1].split(':') : [];
    const vt = cvt.length > 1 ? cvt[1].split('!') : [];
    const book = d.bookKey || d.book || sp[0] || '';
    const chapter = Number(d.ch != null ? d.ch : (cvt[0] || NaN));
    const verse = Number(d.verse != null ? d.verse : (vt[0] || NaN));
    const tokenStart = parseInt(vt[1], 10);

    if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse) ||
        !Number.isFinite(tokenStart) || tokenStart < 1) return null;
    return { book: String(book), chapter, verse, tokenStart, tokenEnd: tokenStart };
}

/* ── 色ピッカー ── */

function _hlPickerClose() {
    const overlay = document.getElementById('hl-color-picker-overlay');
    const picker  = document.getElementById('hl-color-picker');
    if (overlay) overlay.classList.remove('hl-open');
    if (picker)  picker.classList.remove('hl-open');
    _hlState.pickerPending = null;
}

/* ドラッグで作ったブラウザのテキスト選択を解除する。
   選択が残ったまま同じ語を再ドラッグすると、ブラウザがテキストの
   ドラッグ操作として扱い mouseup でピッカーが開かなくなる
   （作成直後の再ドラッグで色変更・削除ができない不具合の原因）。
   ハイライトの確定・取消のタイミングで毎回片付ける。 */
function _hlClearNativeSelection() {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed) sel.removeAllRanges();
}

/* オーバーレイで閉じたときは、確定前の複数語選択の見た目も片付ける。 */
function _hlPickerDismiss() {
    const pending = _hlState.pickerPending;
    const fromTouch = _hlPickerFromTouch;
    _hlPickerFromTouch = false;
    _hlPickerClose();
    /* タッチ用ピルから開いた場合は、ハンドルで範囲調整を続けられるよう
       ネイティブ選択を残す（マウス経由は従来どおり選択を解除する）。 */
    if (!fromTouch) _hlClearNativeSelection();
    if (pending && pending._isBatch) {
        document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
    }
    if (fromTouch) _hlScheduleTouchTextSelection(60);
}

function _hlPositionPicker(picker, anchorEl) {
    const selection = window.getSelection();
    let anchorRect = null;
    if (_hlState.pickerPending && _hlState.pickerPending._isBatch && selection && selection.rangeCount && !selection.isCollapsed && selection.toString().trim()) {
        try { anchorRect = selection.getRangeAt(0).getBoundingClientRect(); } catch (_) {}
    }
    if (!anchorRect || (!anchorRect.width && !anchorRect.height)) {
        const anchor = anchorEl || document.querySelector('.wlv-chip.active') || document.querySelector('#bible-text-area .verse-block');
        if (anchor) anchorRect = anchor.getBoundingClientRect();
    }

    // Portal both elements to body so they cannot remain inside a StudyPanel
    // subtree or inherit a transformed ancestor's fixed-position coordinate space.
    if (picker.parentElement !== document.body) document.body.appendChild(picker);
    const overlay = document.getElementById('hl-color-picker-overlay');
    if (overlay && overlay.parentElement !== document.body) document.body.appendChild(overlay);

    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    const pw = picker.offsetWidth || 240, ph = picker.offsetHeight || 150, gap = 10, pad = 12;
    const panel = document.getElementById('bottom-depth-panel');
    const panelRect = panel && getComputedStyle(panel).display !== 'none' ? panel.getBoundingClientRect() : null;
    const overlapsPanel = (x, y) => !!panelRect && x < panelRect.right && x + pw > panelRect.left && y < panelRect.bottom && y + ph > panelRect.top;
    const clamp = (v, min, max) => Math.max(min, Math.min(v, Math.max(min, max)));
    let chosen = null;
    if (vw <= 900) {
        /* スマホ幅（アプリのモバイル表示ブレークポイント）では、ピッカーの位置を
           選択範囲に追従させず、ピークと同じ下部カードとして固定する：
           左右 --space-md インセットの全幅、下端 calc(safe-area + --space-md)。
           選択位置によって表示場所が変わらないため、操作の予測がしやすい。
           StudyPanel が開いている場合もピッカーはモーダルとして前面に出るので、
           パネルとの重なり回避は行わない。 */
        picker.style.position = 'fixed';
        picker.style.left = 'var(--space-md)';
        picker.style.right = 'var(--space-md)';
        picker.style.width = 'auto';
        picker.style.top = 'auto';
        picker.style.bottom = 'calc(env(safe-area-inset-bottom, 0px) + var(--space-md))';
        picker.style.transform = 'none';
        return;
    } else {
        const candidates = [];
        if (anchorRect) {
            candidates.push({x: anchorRect.left, y: anchorRect.bottom + gap});
            candidates.push({x: anchorRect.right + gap, y: anchorRect.top});
            candidates.push({x: anchorRect.left - pw - gap, y: anchorRect.top});
            candidates.push({x: anchorRect.left, y: anchorRect.top - ph - gap});
        }
        if (panelRect) {
            candidates.push({x: pad, y: panelRect.top - ph - gap});
            candidates.push({x: pad, y: panelRect.bottom + gap});
            candidates.push({x: panelRect.left - pw - gap, y: pad});
            candidates.push({x: panelRect.right + gap, y: pad});
        }
        candidates.push({x: vw - pw - pad, y: pad});
        candidates.push({x: pad, y: pad});
        candidates.push({x: vw - pw - pad, y: vh - ph - pad});
        for (const c of candidates) {
            const x = clamp(c.x, pad, vw - pw - pad), y = clamp(c.y, pad, vh - ph - pad);
            if (!overlapsPanel(x, y)) { chosen = {x, y}; break; }
        }
        if (!chosen) {
            // If the panel fills almost the whole viewport, use the topmost available strip.
            const top = panelRect ? Math.min(vh - ph - pad, panelRect.top - ph - gap) : pad;
            chosen = {x: clamp((vw - pw) / 2, pad, vw - pw - pad), y: clamp(top, pad, vh - ph - pad)};
        }
    }
    picker.style.position = 'fixed';
    picker.style.left = chosen.x + 'px';
    picker.style.top = chosen.y + 'px';
    picker.style.right = 'auto';
    picker.style.bottom = 'auto';
    picker.style.transform = 'none';
}
/* ピッカーが1語だけを対象にするとき、その語の「この箇所での意味＋名札」を
   引く。対象チップを本文から探し、フロー用チップデータ（ピークと同じ源）から
   組む。引けない場合は null（ヘッダーを出さない）。 */
function _hlPickerWordInfo(entry, anchorEl) {
    const entries = entry._isBatch ? entry.entries : [entry];
    if (!entries || entries.length !== 1) return null;
    const e = entries[0];
    if (!e || e.tokenStart == null) return null;
    const isRange = e.tokenEnd != null && Number(e.tokenEnd) !== Number(e.tokenStart);
    /* 範囲エントリはチップ1語の情報にはならない（従来どおり）。ただし範囲が
       口語訳セグメント全体と一致する場合は、セグメントとして解決する。 */
    if (isRange) return _hlPickerSegInfo(e);
    const keyOf = r => [String(r.book), Number(r.chapter), Number(r.verse), Number(r.tokenStart)].join(':');
    const key = keyOf(e);
    const matches = el => {
        if (!el || !el.classList || !el.classList.contains('wlv-chip')) return false;
        const r = _hlRefFromEl(el);
        return !!r && keyOf(r) === key;
    };
    let el = matches(anchorEl) ? anchorEl : null;
    if (!el) {
        el = Array.from(document.querySelectorAll('#bible-text-area .wlv-chip, #parallel-text-area .wlv-chip')).find(matches) || null;
    }
    if (!el) return _hlPickerSegInfo(e);
    const block = el.closest('.gf-verse-block, .verse-block');
    const list = block && (block._flowChips || block._flowWords);
    const chip = list && list.find(item => String(item.tokenId) === String(el.dataset.tokenId));
    const glossEl = el.querySelector('.wlv-chip-ja');
    const meaning = (chip && (chip.jaWordDisplay || chip.gloss || chip.jaWord)) || (glossEl ? glossEl.textContent.trim() : '') || '';
    const greek = (chip && chip.greek) || el.title || '';
    const lemma = (chip && chip.lemma) || '';
    if (!meaning && !greek) return null;
    return { meaning, greek, lemma };
}

/* 口語訳セグメント対象のピッカーヘッダー情報。チップが存在しないモードでは
   _hlPickerWordInfo が引けないため、.ja-seg から解決する（PR #496 の
   「1語対象では意味＋名札を出す」を口語訳にも届かせる）。
   - 単一トークンのセグメント：セグメントピーク（単一トークン時）と同源から
     「この箇所での意味」＋形・原形を引く。
   - 複数トークンのセグメント内にある単一トークンのエントリ（セグメント
     ピークで語を選んで付けるハイライト）：その語について同源から引く。
   - 複数トークンのセグメント全体が対象の範囲エントリ：セグメントはタップ
     対象として1つの句なので、見出しは区間の訳文そのもの（セグメントピークの
     複数トークン時と同じ）、名札に内訳の形・原形を並べる。
   それ以外（セグメントに一致しない範囲など）は null（ヘッダーを出さない）。 */
function _hlPickerSegInfo(e) {
    if (!e || e.tokenStart == null || typeof _jaSegTokenIdxList !== 'function') return null;
    const isRange = e.tokenEnd != null && Number(e.tokenEnd) !== Number(e.tokenStart);
    const seg = Array.from(document.querySelectorAll(
        '#bible-text-area .ja-seg, #parallel-text-area .ja-seg'
    )).find(s => {
        if (String(s.dataset.jaBook) !== String(e.book)) return false;
        if (Number(s.dataset.jaCh) !== Number(e.chapter) || Number(s.dataset.jaV) !== Number(e.verse)) return false;
        const tis = _jaSegTokenIdxList(s);
        if (!tis.length) return false;
        if (isRange) return tis.length > 1 && tis[0] === Number(e.tokenStart) && tis[tis.length - 1] === Number(e.tokenEnd);
        return tis.includes(Number(e.tokenStart));
    });
    if (!seg) return null;
    const tis = _jaSegTokenIdxList(seg);
    const toks = tis.map(ti => _jaSegToken(e.book, Number(e.chapter), Number(e.verse), ti)).filter(Boolean);
    if (!toks.length) return null;
    if (isRange && toks.length > 1) {
        return {
            meaning: (seg.textContent || '').trim(),
            greek: toks.map(w => w.text || '').filter(Boolean).join(' '),
            lemma: toks.map(w => w.lemma || '').filter(Boolean).join(' ')
        };
    }
    /* 単一トークンのエントリ：対象は tokenStart の語そのもの（複数トークンの
       セグメント内では先頭の語とは限らない）。 */
    const w = _jaSegToken(e.book, Number(e.chapter), Number(e.verse), Number(e.tokenStart)) || toks[0];
    const words = _jaSegVerseWords(e.book, Number(e.chapter), Number(e.verse));
    const idx = words.indexOf(w);
    let meaning = '';
    try {
        const resolved = window.App?.readingEngine?.resolve(w, _buildReadingContext(words, idx));
        meaning = (resolved && resolved.japanese) || w.japanese || '';
        if (meaning && window.App?.PresentationPolicy) {
            meaning = window.App.PresentationPolicy.formatDisplay(meaning, resolved && resolved.source, words, idx);
        }
    } catch (_) { meaning = w.japanese || ''; }
    /* 英語UIでは WEB グロスを「この箇所での意味」にする（セグメントピークと同源）。 */
    const _enPickerGloss = (typeof _glossSidecarFor === 'function') ? _glossSidecarFor(w) : null;
    if (_enPickerGloss) meaning = _enPickerGloss;
    if (!meaning && !w.text) return null;
    return { meaning, greek: w.text || '', lemma: w.lemma || '' };
}

function _hlOpenPicker(entry, anchorEl) {
    const picker = document.getElementById('hl-color-picker');
    const overlay = document.getElementById('hl-color-picker-overlay');
    /* UI要素がない場合は、以前の選択待ち状態も残さず終了する。 */
    if (!picker || !overlay) {
        _hlState.pickerPending = null;
        /* バッチ選択のピッカーを開けない場合だけ、一時選択表示を解除する。 */
        if (entry && entry._isBatch) {
            document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
        }
        return;
    }
    _hlState.pickerPending = entry;
    const pickerEntries = entry._isBatch ? entry.entries : [entry];
    const sharedColor = pickerEntries.length && pickerEntries.every(item => item.color === pickerEntries[0].color) ? pickerEntries[0].color : null;
    picker.querySelectorAll('.hl-picker-swatch').forEach(s => s.classList.toggle('hl-selected', !!sharedColor && s.dataset.color === sharedColor));
    const del = picker.querySelector('.hl-picker-delete');
    if (del) del.style.display = pickerEntries.some(item => item._isExisting) ? '' : 'none';
    const actions = picker.querySelector('.hl-picker-actions');
    if (actions) actions.style.display = !entry._isBatch && entry.tokenStart != null ? 'flex' : 'none';
    /* 1語対象のときだけ、意味＋名札のヘッダーを出す（ドラッグ派にも意味を見せる） */
    const wordBox = document.getElementById('hl-picker-word');
    if (wordBox) {
        const winfo = _hlPickerWordInfo(entry, anchorEl);
        if (winfo) {
            document.getElementById('hl-picker-meaning').textContent = winfo.meaning || '';
            document.getElementById('hl-picker-greek').textContent = winfo.greek || '';
            const lemEl = document.getElementById('hl-picker-lemma');
            lemEl.textContent = winfo.lemma ? _T('panel.lemmaPrefix', '原形：') + winfo.lemma : '';
            lemEl.style.display = winfo.lemma ? '' : 'none';
            wordBox.style.display = '';
        } else {
            wordBox.style.display = 'none';
        }
    }
    overlay.classList.add('hl-open');
    picker.classList.add('hl-open');
    _hlPositionPicker(picker, anchorEl);
}

function _hlColorSelected(color) {
    const entry = _hlState.pickerPending;
    _hlPickerClose();
    _hlPickerFromTouch = false;
    _hlTouchEntries = [];
    _hlHideTouchPill();
    /* 色の確定（削除含む）でドラッグ選択は消費済み。残すと次の再ドラッグが
       テキストのドラッグ操作になり、ピッカーが開かなくなるため解除する。 */
    _hlClearNativeSelection();
    /* 保存処理に進めない場合も、確定前の選択表示だけは残さない。 */
    if (!entry || !window.App || !window.App.storage) {
        document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
        return;
    }
    const entries = entry._isBatch ? entry.entries : [entry];
    entries.forEach(item => {
        if (color === null) {
            if (item._isExisting) window.App.storage.removeHighlight(item);
        } else {
            _hlState.lastUsedColor = color;
            if (item._isExisting) window.App.storage.updateHighlightColor(item, color);
            else {
                const toSave = Object.assign({}, item);
                delete toSave._isExisting;
                delete toSave.tokenId;
                toSave.color = color;
                window.App.storage.addHighlight(toSave);
            }
        }
    });
    document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
    _applyHighlights();
}

/* ── 節全体ハイライト（Phase B） ── */

function _hlVerseHighlight() {
    /* 語順・文構造モードで語が選択されている場合、ヘッダーのハイライト操作はその語を対象にする。
       口語訳など、語を選択していない通常モードでは従来どおり節全体を対象にする。 */
    const wordPos = _hlCurrentWordPos();
    /* 読み方は A 列が主表示の場合もある。DA_READING の実DOMには .da-view が
       付かないため、DOMクラスだけでなく列モードの kind を正として判定する。
       列モードは現在の _transA/_transB から導出する（_colA/_colB は render 系の
       ローカル変数で、この関数のスコープには存在しない）。 */
    const isWordReadingMode = [_toColumnMode(_transA), _toColumnMode(_transB)].some(col =>
        col && (col.kind === 'wordOrder' || col.kind === 'da-reading' || col.kind === 'greek-text')
    ) || !!document.querySelector('.rk-reading-view');
    if (isWordReadingMode && wordPos) {
        _hlWordHighlight();
        return;
    }

    const pos = _hlCurrentVersePos();
    if (!pos) return;

    /* 既存ハイライト確認 */
    const existing = _hlFindExisting(pos.book, pos.chapter, pos.verse, null, null);
    if (existing) {
        const entry = Object.assign({}, existing, { _isExisting: true });
        _hlOpenPicker(entry);
        return;
    }

    const entry = {
        book: pos.book, chapter: pos.chapter, verse: pos.verse,
        tokenStart: null, tokenEnd: null,
        color: 'yellow', createdAt: Date.now(),
        _isExisting: false,
    };
    _hlOpenPicker(entry);
}

/* ── 語ハイライト（Phase C/D）── */

function _hlWordHighlight() {
    const pos = _hlCurrentWordPos();
    if (!pos) return;

    const existing = _hlFindExisting(pos.book, pos.chapter, pos.verse, pos.tokenStart, pos.tokenEnd);
    if (existing) {
        const entry = Object.assign({}, existing, { _isExisting: true });
        _hlOpenPicker(entry);
        return;
    }

    const entry = Object.assign({}, pos, { color: 'yellow', createdAt: Date.now(), _isExisting: false });
    _hlOpenPicker(entry);
}

/* ── 複数語選択 ── */

function _hlShowSelectionBar(mode, count) {
    const bar = document.getElementById('hl-selection-bar'), label = document.getElementById('hl-selection-count');
    const finish = document.getElementById('hl-selection-finish');
    if (!bar) return;
    if (label) label.textContent = count + ' 語を選択中';
    if (finish) finish.style.display = mode === 'multi' ? '' : 'none';
    bar.dataset.mode = mode; bar.classList.add('hl-open');
}
function _hlHideSelectionBar() { document.getElementById('hl-selection-bar')?.classList.remove('hl-open'); }
function _hlEnterMultiSelectMode(entry) {
    const seed = entry || _hlState.pickerPending;
    if (!seed || seed.tokenStart == null) return;
    _hlPickerClose();

    _hlState.multiSelectActive = true;
    _hlState.multiSelectEntries = [Object.assign({}, seed)];
    document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
    document.querySelectorAll('.wlv-chip.active').forEach(c => c.classList.add('hl-multi-selected'));
    _hlShowSelectionBar('multi', _hlState.multiSelectEntries.length);
}
function _hlMultiSelectTap(chipEl, chip) {
    const tokenStart = _hlTokenIdxFromRef(chip.ref), book = chip.bookKey || chip.book;
    const chapter = Number(chip.ch), verse = Number(chip.verse);
    if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse) || !tokenStart) return;
    const key = [String(book), chapter, verse, tokenStart].join(':');
    const idx = _hlState.multiSelectEntries.findIndex(item => [String(item.book), Number(item.chapter), Number(item.verse), Number(item.tokenStart)].join(':') === key);
    if (idx >= 0) { _hlState.multiSelectEntries.splice(idx, 1); chipEl.classList.remove('hl-multi-selected'); }
    else {
        const existing = _hlFindExisting(book, chapter, verse, tokenStart, tokenStart);
        _hlState.multiSelectEntries.push(Object.assign({}, existing || { book: String(book), chapter, verse, tokenStart, tokenEnd: tokenStart, color: 'yellow', createdAt: Date.now() }, { _isExisting: !!existing }));
        chipEl.classList.add('hl-multi-selected');
    }
    _hlShowSelectionBar('multi', _hlState.multiSelectEntries.length);
}
function _hlFinishMultiSelection() {
    if (!_hlState.multiSelectActive) return;
    const entries = _hlState.multiSelectEntries.slice();
    _hlState.multiSelectActive = false; _hlState.multiSelectEntries = []; _hlHideSelectionBar();
    if (!entries.length) { document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected, .ja-seg.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected')); return; }
    _hlOpenPicker({ _isBatch: true, entries });
}
function _hlCancelSelection() {
    _hlState.multiSelectActive = false;
    _hlState.multiSelectEntries = [];
    _hlHideSelectionBar();
    document.querySelectorAll('.wlv-chip.hl-multi-selected, .dg-token.hl-multi-selected, .ja-seg.hl-multi-selected').forEach(c => c.classList.remove('hl-multi-selected'));
}

/* ── ハイライト検索ヘルパー ── */

function _hlFindExisting(book, chapter, verse, tokenStart, tokenEnd) {
    if (!window.App || !window.App.storage) return null;
    const list = window.App.storage.getHighlights();
    const sameVerse = h =>
        h.book === String(book) &&
        Number(h.chapter) === Number(chapter) &&
        Number(h.verse) === Number(verse);
    const sameRange = h =>
        (h.tokenStart == null ? null : Number(h.tokenStart)) === (tokenStart == null ? null : Number(tokenStart)) &&
        (h.tokenEnd   == null ? null : Number(h.tokenEnd))   === (tokenEnd == null ? null : Number(tokenEnd));

    /* まず保存範囲の完全一致を優先する。 */
    const exact = list.find(h => sameVerse(h) && sameRange(h));
    if (exact) return exact;

    /* 範囲ハイライトの途中の語を選んだ場合も、その保存済み範囲を編集・削除できるようにする。
       節全体ハイライト（tokenStart=null）は語ハイライトの候補に含めない。 */
    if (tokenStart != null && tokenEnd != null) {
        const start = Number(tokenStart);
        const end = Number(tokenEnd);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return list.find(h =>
            sameVerse(h) &&
            h.tokenStart != null && h.tokenEnd != null &&
            Number(h.tokenStart) <= start &&
            Number(h.tokenEnd) >= end
        ) || null;
    }
    return null;
}

/* ── DOM 適用（Phase G）── */

function _applyHighlights() {
    if (!window.App || !window.App.storage) return;
    const highlights = window.App.storage.getHighlights();

    /* Clear stale classes before reapplying the saved state, including when empty. */
    document.querySelectorAll('.verse-block').forEach(block => {
        HL_COLORS.forEach(c => block.classList.remove('hl-verse-' + c));
    });
    document.querySelectorAll('.wlv-chip, .dg-token, .ja-seg').forEach(token => {
        HL_COLORS.forEach(c => token.classList.remove('hl-word-' + c));
    });
    /* 保存済みハイライトが0件でも、構造モードの古い表示クラスを消す必要があるため早期returnしない。 */

    /* ── A. 節全体ハイライト（全モード共通） ── */
    const verseHighlights = highlights.filter(h => h.tokenStart == null);

    verseHighlights.forEach(h => {
        const chStr = String(h.chapter);
        /* chapter-block が存在する場合はそのスコープで検索 */
        const cb = document.querySelector(
            `.chapter-block[data-book="${h.book}"][data-chapter="${chStr}"], .compare-chapter-block[data-book="${h.book}"][data-chapter="${chStr}"]`
        );
        /* chapter-block がない場合は AppState で現在の書/章を確認して誤適用を防ぐ */
        if (!cb) {
            const curBook = AppState.location?.book?.key;
            const curCh   = AppState.location?.chapter;
            if (String(h.book) !== String(curBook) || Number(h.chapter) !== Number(curCh)) return;
        }
        const mainArea = document.getElementById('main-reading-area');
        const scope = cb || (mainArea && mainArea.classList.contains('compare-mode')
            ? mainArea
            : document.getElementById('bible-text-area'));
        if (!scope) return;

        scope.querySelectorAll(`.verse-block[data-vnum="${h.verse}"]:not(.verse-pair-right)`).forEach(block => {
            HL_COLORS.forEach(c => block.classList.remove(`hl-verse-${c}`));
            block.classList.add(`hl-verse-${h.color}`);
        });
    });

    /* ── B. 語・句ハイライト：WORD_ORDER（data-token-id） ── */
    const wordHighlights = highlights.filter(h => h.tokenStart != null);

    wordHighlights.forEach(h => {
        const chStr = String(h.chapter);
        const cb = document.querySelector(
            `.chapter-block[data-book="${h.book}"][data-chapter="${chStr}"], .compare-chapter-block[data-book="${h.book}"][data-chapter="${chStr}"]`
        );
        if (!cb) {
            const curBook = AppState.location?.book?.key;
            const curCh   = AppState.location?.chapter;
            if (String(h.book) !== String(curBook) || Number(h.chapter) !== Number(curCh)) return;
        }
        const mainArea = document.getElementById('main-reading-area');
        const scope = cb || (mainArea && mainArea.classList.contains('compare-mode')
            ? mainArea
            : document.getElementById('bible-text-area'));
        if (!scope) return;

        /* wordOrder の語データは表示状態により verse-block または内側の gf-verse-block に保持される。
           実際に _flowWords を持つ要素から tokenIndex → tokenId を解決する。 */
        scope.querySelectorAll(`.verse-block[data-vnum="${h.verse}"]`).forEach(block => {
            const flowBlock = block._flowWords ? block : block.querySelector('.gf-verse-block');
            const words = flowBlock && Array.isArray(flowBlock._flowWords) ? flowBlock._flowWords : [];
            if (!words.length) return;
            words.forEach((w, wi) => {
                /* 生トークンには tokenIndex がない場合がある。表示用 ref の !N をフォールバックに使う。 */
                const tidx = w.tokenIndex != null && w.tokenIndex !== ''
                    ? parseInt(w.tokenIndex, 10)
                    : _hlTokenIdxFromRef(w.ref);
                if (tidx == null || tidx < h.tokenStart || tidx > h.tokenEnd) return;
                let chip = flowBlock.querySelector(`.wlv-chip[data-token-id="${w.tokenId}"]`) ||
                             block.querySelector(`.wlv-chip[data-token-id="${w.tokenId}"]`);
                if (!chip) return;
                /* [ ] 仮印グロスのチップは塗らず、実語を持つ相方チップへ寄せる
                   （ギリシャ語チップは実テキストなので対象外）。 */
                if (!chip.classList.contains('gk-word')) {
                    const ti = _hlPaintTargetIndex(words, wi);
                    if (ti < 0) return;
                    if (ti !== wi) {
                        chip = flowBlock.querySelector(`.wlv-chip[data-token-id="${words[ti].tokenId}"]`) ||
                               block.querySelector(`.wlv-chip[data-token-id="${words[ti].tokenId}"]`);
                        if (!chip) return;
                    }
                }
                HL_COLORS.forEach(c => chip.classList.remove(`hl-word-${c}`));
                chip.classList.add(`hl-word-${h.color}`);
            });
        });

        /* ── C. 語・句ハイライト：CLAUSE_ROLE（data-dg-ref） ── */
        scope.querySelectorAll('.dg-token[data-dg-ref]').forEach(span => {
            const ref = span.dataset.dgRef;
            if (!ref) return;
            const parts = ref.split(' ');
            if (parts.length < 2) return;
            const book  = parts[0];
            if (book !== h.book) return;
            const cvParts = parts[1].split(':');
            if (cvParts.length < 2) return;
            const ch = parseInt(cvParts[0], 10);
            const vTok = cvParts[1].split('!');
            const v    = parseInt(vTok[0], 10);
            const tidx = parseInt(vTok[1], 10);
            if (ch !== h.chapter || v !== h.verse) return;
            if (tidx >= h.tokenStart && tidx <= h.tokenEnd) {
                HL_COLORS.forEach(c => span.classList.remove(`hl-word-${c}`));
                span.classList.add(`hl-word-${h.color}`);
            }
        });

        /* ── D. 語・句ハイライト：口語訳セグメント ──
           区間は最小単位として、そのトークン集合が保存範囲と少しでも重なれば塗る。 */
        scope.querySelectorAll(`.verse-block[data-vnum="${h.verse}"] .ja-seg`).forEach(seg => {
            if (seg.dataset.jaBook !== h.book || Number(seg.dataset.jaCh) !== Number(h.chapter)) return;
            const tis = (seg.dataset.jaTokens || '').split(',').map(Number);
            if (tis.some(ti => ti >= h.tokenStart && ti <= h.tokenEnd)) {
                HL_COLORS.forEach(c => seg.classList.remove('hl-word-' + c));
                seg.classList.add('hl-word-' + h.color);
            }
        });
    });

    /* 文の構造で読む：保存済み token 範囲を sentence._flowWords と表示チップへ同期。 */
    _applyDaReadingHighlights(highlights);
}

function _applyDaReadingHighlights(highlights) {
    const daSentences = Array.from(document.querySelectorAll(".da-sentence"));
    daSentences.forEach(function (sentence) {
        sentence.querySelectorAll(".wlv-chip").forEach(function (chip) {
            HL_COLORS.forEach(function (color) {
                chip.classList.remove("hl-word-" + color);
            });
        });
    });

    const currentBook = window.AppState && window.AppState.location && window.AppState.location.book
        ? window.AppState.location.book.key : null;
    const currentChapter = window.AppState && window.AppState.location
        ? window.AppState.location.chapter : null;

    /* 節ハイライト: その節を含む文ブロックの左帯にも反映する。
       DA の文ブロック（.da-sentence.verse-block）には data-vnum が無いため、
       _applyHighlights 本体の節ハイライト適用（data-vnum セレクタ）では拾えない。
       ここで sentence._flowWords の書・章・節と照合して hl-verse-<color> を付け替える
       （古い色クラスは _applyHighlights 冒頭の全 .verse-block クリアで除去済み）。 */
    const verseHighlights = highlights.filter(function (h) {
        return h && h.tokenStart == null;
    });
    if (verseHighlights.length && daSentences.length) {
        daSentences.forEach(function (sentence) {
            const words = Array.isArray(sentence._flowWords) ? sentence._flowWords : [];
            if (!words.length) return;
            verseHighlights.forEach(function (h) {
                if (HL_COLORS.indexOf(h.color) === -1) return;
                const hit = words.some(function (word) {
                    if (!word) return false;
                    const book = word.book != null ? String(word.book) : (currentBook != null ? String(currentBook) : "");
                    const chapter = word.chapter != null ? Number(word.chapter) : Number(currentChapter);
                    return book === String(h.book) && chapter === Number(h.chapter) && Number(word.verse) === Number(h.verse);
                });
                if (hit) {
                    HL_COLORS.forEach(function (color) {
                        sentence.classList.remove("hl-verse-" + color);
                    });
                    sentence.classList.add("hl-verse-" + h.color);
                }
            });
        });
    }

    const wordHighlights = highlights.filter(function (h) {
        return h && h.tokenStart != null;
    });
    if (!wordHighlights.length || !daSentences.length) return;

    daSentences.forEach(function (sentence) {
        const words = Array.isArray(sentence._flowWords) ? sentence._flowWords : [];
        if (!words.length) return;
        const chips = Array.from(sentence.querySelectorAll(".wlv-chip[data-token-id]"));
        if (!chips.length) return;

        wordHighlights.forEach(function (h) {
            words.forEach(function (word, wi) {
                if (!word) return;
                const book = word.book != null ? String(word.book) : (currentBook != null ? String(currentBook) : "");
                const chapter = word.chapter != null ? Number(word.chapter) : Number(currentChapter);
                const verse = Number(word.verse);
                /* 生トークンでは tokenIndex が省略される場合があるため canonical ref の !N を使う。 */
                const ref = typeof word.ref === "string" ? word.ref : "";
                const refMatch = ref.match(/!(\d+)\s*$/);
                const tokenIndex = word.tokenIndex != null && word.tokenIndex !== ""
                    ? Number(word.tokenIndex)
                    : (refMatch ? Number(refMatch[1]) : NaN);
                if (book !== String(h.book) || chapter !== Number(h.chapter) || verse !== Number(h.verse) ||
                    !Number.isFinite(tokenIndex) || tokenIndex < Number(h.tokenStart) || tokenIndex > Number(h.tokenEnd)) return;

                /* [ ] 仮印グロスのチップは塗らず、実語を持つ相方チップへ寄せる。 */
                const ti = _hlPaintTargetIndex(words, wi);
                if (ti < 0) return;
                const paintWord = words[ti];
                const chip = chips.find(function (candidate) {
                    return String(candidate.dataset.tokenId) === String(paintWord.tokenId);
                });
                if (chip) {
                    /* 同じ語に複数の保存範囲が重なる場合も、色クラスは1色に統一する。
                       通常モードの _applyHighlights と同じく、後から処理する保存項目を優先。 */
                    HL_COLORS.forEach(function (color) {
                        chip.classList.remove("hl-word-" + color);
                    });
                    if (HL_COLORS.indexOf(h.color) !== -1) {
                        chip.classList.add("hl-word-" + h.color);
                    }
                }
            });
        });
    });
}

/* ── ハイライト一覧（Phase F）── */

let _hlListFilter = 'all';
let _hlRenderToken = 0;

function showHighlights() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');
    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;
    AppState.ui.view = 'highlights';
    syncUIFromState();
    _hlListFilter = 'all';
    _hlRenderHighlightList(app);
}

/* 本文プレビューを非同期で取得し、章単位でfetchを共有する。
   フィルター連打時に古いrenderが上書きしないようtokenで管理する。 */
async function _hlRenderHighlightList(app) {
    if (!app) return;
    const token = ++_hlRenderToken;

    const highlights = window.App?.storage?.getHighlights() || [];
    const bookmarks  = window.App?.storage?.getBookmarks()  || [];

    /* フィルタ適用 */
    const filtered = _hlListFilter === 'all'
        ? highlights
        : highlights.filter(h => h.color === _hlListFilter);

    /* フィルタタブ（件数表示なし） */
    const counts = {};
    HL_COLORS.forEach(c => { counts[c] = highlights.filter(h => h.color === c).length; });
    const totalHL = highlights.length;
    const dotColors = { yellow: '#fccc00', blue: '#004c97', green: '#15722c', red: '#eb6100' };
    let tabsHtml = `<div class="hl-filter-tabs">`;
    tabsHtml += `<button class="hl-filter-tab${_hlListFilter === 'all' ? ' hl-tab-active' : ''}" onclick="_hlSetFilter('all')">${_T('ui.allHighlights', 'すべて')}</button>`;
    HL_COLORS.forEach(c => {
        if (counts[c] > 0) {
            const active = _hlListFilter === c ? ' hl-tab-active' : '';
            tabsHtml += `<button class="hl-filter-tab${active}" onclick="_hlSetFilter('${c}')"><span class="hl-tab-dot" style="background:${dotColors[c]}"></span>${_hlColorNames()[c]}</button>`;
        }
    });
    tabsHtml += `</div>`;

    /* 章ごとに本文をfetch（同じ章は1回のみ） */
    const _hlTrans = (window.I18N && I18N.lang === 'en') ? 'WEB' : (window.I18N && I18N.lang === 'es') ? 'RVR1909' : 'JA1955';
    const chFetches = {};
    filtered.forEach(h => {
        const key = `${h.book}:${h.chapter}`;
        if (!chFetches[key]) chFetches[key] = _fetchTranslation(_hlTrans, h.book, String(h.chapter));
    });
    const chData = {};
    await Promise.all(Object.entries(chFetches).map(async ([key, p]) => {
        try { chData[key] = await p; } catch(e) {}
    }));
    if (token !== _hlRenderToken) return;

    /* ハイライト一覧 */
    let rowsHtml = '';
    if (filtered.length) {
        rowsHtml = filtered.map(h => {
            const bookName = _bookFullName(h.book);
            const titleText = `${bookName} ${h.chapter}:${h.verse}`;
            const isEnHL = window.I18N && I18N.lang === 'en';
            const isEsHL = window.I18N && I18N.lang === 'es';
            const rangeLabel = h.tokenStart == null ? _T('ui.wholeVerse', '節全体') :
                (h.tokenStart === h.tokenEnd
                    ? (isEsHL ? `Palabra ${h.tokenStart}` : isEnHL ? `Word ${h.tokenStart}` : `語${h.tokenStart}`)
                    : (isEsHL ? `Palabras ${h.tokenStart}–${h.tokenEnd}` : isEnHL ? `Words ${h.tokenStart}–${h.tokenEnd}` : `語${h.tokenStart}–${h.tokenEnd}`));
            const href = `index.html?book=${encodeURIComponent(h.book)}&ch=${encodeURIComponent(h.chapter)}&verse=${encodeURIComponent(h.verse)}${h.tokenStart != null ? '&hltoken=' + Number(h.tokenStart) : ''}`;
            const verseText = chData[`${h.book}:${h.chapter}`]?.verses?.[String(h.verse)] || '';
            const previewHtml = verseText ? `<div class="list-item-preview">${_escH(verseText)}</div>` : '';
            const titleHtml = `<span class="hl-list-dot" data-color="${_escH(h.color)}"></span><span>${_escH(titleText)}</span>`;
            const subHtml   = `<div class="list-item-sub">${_escH(rangeLabel + ' · ' + _listMetaDate(h.createdAt))}</div>`;
            return `<div class="list-item-card" role="link" tabindex="0" onclick="location.href='${href}'" onkeydown="if(event.target===this&&event.key==='Enter'){event.preventDefault();location.href='${href}'}"><div class="list-item-main"><div class="list-item-title">${titleHtml}</div>${previewHtml}${subHtml}</div></div>`;
        }).join('');
    } else if (_hlListFilter === 'all' && !totalHL) {
        rowsHtml = `<p class="list-item-empty">${_T('ui.noHighlightsYet', 'ハイライトはまだありません。読んでいて残しておきたい箇所を選んで色をつけることができます。')}</p>`;
    } else {
        rowsHtml = `<p class="list-item-empty">${_T('ui.noHighlightsInColor', 'この色のハイライトはありません。')}</p>`;
    }

    /* ブックマーク（旧データ）を別セクションで表示 */
    let bkSection = '';
    if (bookmarks.length && _hlListFilter === 'all') {
        const bkRows = bookmarks.map(b => {
            const bk = _bookShortName(b.bookKey);
            const title = (b.bookKey && b.chapter != null && b.verse != null)
                ? ((window.I18N && I18N.lang !== 'ja') ? `${bk} ${b.chapter}:${b.verse}` : `${bk}${b.chapter}章${b.verse}節`)
                : (b.ref || '');
            const href = (b.bookKey && b.chapter != null && b.verse != null)
                ? `index.html?book=${encodeURIComponent(b.bookKey)}&ch=${encodeURIComponent(b.chapter)}&verse=${encodeURIComponent(b.verse)}&panel=study`
                : '';
            return _listItemCard({ title: '★ ' + title, meta: _listMetaDate(b.createdAt), href });
        }).join('');
        bkSection = `<section><h3 style="font-size:var(--text-caption);color:var(--text-hint);font-weight:500;margin:var(--space-lg) 0 var(--space-sm);">${_T('ui.legacyBookmarks', '移行前のブックマーク')}</h3>${bkRows}</section>`;
    }

    app.innerHTML = `
        <div class="static-page list-page">
            <section>
                ${tabsHtml}
                ${rowsHtml}
            </section>
            ${bkSection}
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </div>`;
}

function _hlSetFilter(color) {
    _hlListFilter = color;
    _hlRenderHighlightList(document.getElementById('bible-text-area'));
}

/* ── ブラウザ上で選択した複数語をハイライト ── */
/* チップ/トークン要素から {book, chapter, verse, tokenStart} を返す。解決できなければ null。
   Word-order chips and structure-reading tokens use different DOM shapes.
   Read the structured ref from either shape; never infer a verse from display text. */
function _hlRefFromEl(el) {
    let book, chapter, verse, tokenStart;
    if (el.matches('.dg-token[data-dg-ref]')) {
        const ref = el.dataset.dgRef || '';
        const parts = ref.split(' ');
        const cvt = parts.length > 1 ? parts[1].match(/^(\d+):(\d+)!(\d+)$/) : null;
        if (!cvt) return null;
        book = parts[0]; chapter = Number(cvt[1]); verse = Number(cvt[2]); tokenStart = Number(cvt[3]);
    } else {
        const tokenId = el.dataset.tokenId, block = el.closest('.gf-verse-block, .verse-block');
        const list = block && (block._flowChips || block._flowWords);
        let chip = list && list.find(item => String(item.tokenId) === String(tokenId));
        if (!chip && typeof _wlvGetChipData === 'function') chip = _wlvGetChipData(tokenId);
        if (!chip) return null;
        tokenStart = _hlTokenIdxFromRef(chip.ref);
        book = chip.bookKey || chip.book;
        chapter = Number(chip.ch); verse = Number(chip.verse);
    }
    if (!book || !Number.isFinite(chapter) || !Number.isFinite(verse) || !Number.isFinite(tokenStart) || tokenStart < 1) return null;
    return { book: String(book), chapter, verse, tokenStart };
}

/* 現在のネイティブ選択が本文のどの語に対応するかを解決する（ピッカーは開かない）。 */
function _hlResolveTextSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount || !selection.toString().trim()) return [];
    const range = selection.getRangeAt(0);
    const root = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    if (!root || !root.closest || !root.closest('#bible-text-area, #parallel-text-area')) return [];

    const selected = Array.from(document.querySelectorAll(
        '#bible-text-area .wlv-chip, #parallel-text-area .wlv-chip, ' +
        '#bible-text-area .dg-token[data-dg-ref], #parallel-text-area .dg-token[data-dg-ref], ' +
        '#bible-text-area .ja-seg, #parallel-text-area .ja-seg'
    )).filter(el => {
        try { return range.intersectsNode(el); } catch (_) { return false; }
    });
    const entries = [], seen = new Set();
    selected.forEach(el => {
        if (el.classList.contains('ja-seg')) {
            /* 口語訳セグメント：連続範囲は1エントリ、飛び飛びは語ごとに分ける */
            _hlEntriesForTokens(el.dataset.jaBook, Number(el.dataset.jaCh), Number(el.dataset.jaV),
                _jaSegTokenIdxList(el)).forEach(en => {
                const key = [en.book, en.chapter, en.verse, en.tokenStart, en.tokenEnd].join(':');
                if (seen.has(key)) return;
                seen.add(key);
                entries.push(en);
            });
            return;
        }
        const r = _hlRefFromEl(el);
        if (!r) return;
        const { book, chapter, verse, tokenStart } = r;
        const key = [book, chapter, verse, tokenStart].join(':');
        if (seen.has(key)) return;
        seen.add(key);
        const existing = _hlFindExisting(book, chapter, verse, tokenStart, tokenStart);
        entries.push(Object.assign({}, existing || {
            book, chapter, verse, tokenStart, tokenEnd: tokenStart,
            color: 'yellow', createdAt: Date.now()
        }, {_isExisting: !!existing}));
    });
    return entries;
}

/* ピッカーがタッチ用ピルから開かれたかどうか（閉じるときの選択保持の判定に使う）。 */
let _hlPickerFromTouch = false;

function _hlOpenPickerForTextSelection(event) {
    if (!event || !event.target || !event.target.closest || !event.target.closest('#bible-text-area, #parallel-text-area')) return;
    if (_hlState.multiSelectActive || _hlState.pickerPending) return;
    _hlPickerFromTouch = !!event._fromTouchPill;
    const entries = _hlResolveTextSelection();
    if (entries.length === 1) {
        /* StudyPanel 内の専用ボタンを廃止したため、本文で単語を選択した場合も
           同じポップアップを開き、色変更・削除の入口を本文側に集約する。 */
        _hlOpenPicker(entries[0]);
        return;
    }
    if (entries.length < 2) return;
    _hlOpenPicker({_isBatch: true, entries});
}
document.addEventListener('mouseup', _hlOpenPickerForTextSelection);
document.addEventListener('keyup', function(event) {
    if (['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
        _hlOpenPickerForTextSelection({target:window.getSelection()?.anchorNode?.parentElement});
    }
});

/* スマホ/タブレット向け: 長押しで本文の語句を選択したら、画面下部中央に
   「ハイライト」ピルを出す。以前は選択が安定した時点でピッカーを自動で
   開いていたが、全面オーバーレイが青ハンドルでの範囲調整を妨げ、
   複数語の選択ができなかった。そのためピッカーはピルのタップで
   明示的に開く形にし、選択が有効な間はピルを出し続ける
   （ハンドル調整・スクロールは妨げない）。
   タッチでは選択の確定後に mouseup が来ないため、touchend と
   selectionchange の安定を起点に、ピルの表示可否だけを判定する。 */
let _hlLastTouchAt = 0;
let _hlTouchSelTimer = null;
/* ピル表示時点の解決済みエントリ。ピルのアクションはタップ時点の
   ライブ選択を読み直さない（iOS ではタップ処理より先にネイティブ
   選択やメニューが解除され、読み直すと空になって無反応に見える）。 */
let _hlTouchEntries = [];
let _hlLastTouchInPill = false;
/* 口語訳セグメント選択のアプリ側表示ロック。ネイティブ選択を解除しても
   「選択中」の見た目とピルを保つための状態（_hlLockTouchSegs 参照）。 */
let _hlTouchSegLock = false;
let _hlTouchSegEls = [];
let _hlTouchSegDocHook = false;
function _hlTouchPillEl() { return document.getElementById('hl-touch-pill'); }
function _hlHideTouchPill() { const p = _hlTouchPillEl(); if (p) p.classList.remove('hl-show'); }
/* 口語訳では選択はセグメント単位でしか解釈されないのに、ネイティブ選択の
   青ハンドルは文字単位で調整できるように見え、実際の対象と食い違う。
   セグメントだけの選択が確定したら、ネイティブ選択を解除して対象セグメントに
   アプリ側の選択表示（.hl-touch-selected）を付け、選択表現を一本化する。
   ギリシャ語モード（チップ／トークン）ではハンドルでの範囲調整が要るため、
   対象がセグメントのみの場合に限る。 */
function _hlLockTouchSegs(els) {
    _hlUnlockTouchSegs();
    _hlTouchSegLock = true;
    _hlTouchSegEls = els.slice();
    _hlTouchSegEls.forEach(el => el.classList.add('hl-touch-selected'));
    _hlClearNativeSelection();
    if (!_hlTouchSegDocHook) {
        _hlTouchSegDocHook = true;
        document.addEventListener('pointerdown', function (event) {
            if (!_hlTouchSegLock) return;
            const t = event.target;
            if (t && t.closest && (t.closest('#hl-touch-pill') || t.closest('.ja-seg.hl-touch-selected'))) return;
            /* 選択範囲の外へのタップで選択を終える（ピークの外タップと同じ作法） */
            _hlUnlockTouchSegs();
            _hlTouchEntries = [];
            _hlHideTouchPill();
        }, true);
    }
}
function _hlUnlockTouchSegs() {
    if (_hlTouchSegEls.length) _hlTouchSegEls.forEach(el => el.classList.remove('hl-touch-selected'));
    document.querySelectorAll('.ja-seg.hl-touch-selected').forEach(el => el.classList.remove('hl-touch-selected'));
    _hlTouchSegLock = false;
    _hlTouchSegEls = [];
}
function _hlTryTouchTextSelection() {
    const pill = _hlTouchPillEl();
    if (!pill) return;
    if (_hlState.pickerPending || _hlState.multiSelectActive) { _hlUnlockTouchSegs(); _hlTouchEntries = []; _hlHideTouchPill(); return; }
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) {
        /* ロック中は、ネイティブ選択が解除済みでも選択表示とピルを保つ。 */
        if (_hlTouchSegLock && _hlTouchEntries.length) { pill.classList.add('hl-show'); return; }
        /* ピルへのタップで選択が解除されただけなら、ピルと種データを残す。 */
        if (_hlTouchEntries.length && _hlLastTouchInPill) { pill.classList.add('hl-show'); return; }
        _hlTouchEntries = []; _hlHideTouchPill(); return;
    }
    const anchorEl = selection.anchorNode && selection.anchorNode.parentElement;
    if (!anchorEl || !anchorEl.closest || !anchorEl.closest('#bible-text-area, #parallel-text-area')) { _hlUnlockTouchSegs(); _hlTouchEntries = []; _hlHideTouchPill(); return; }
    const entries = _hlResolveTextSelection();
    if (!entries.length) { _hlUnlockTouchSegs(); _hlTouchEntries = []; _hlHideTouchPill(); return; }
    _hlTouchEntries = entries;
    /* 対象が口語訳セグメントだけなら、アプリ側の選択表示に置き換える。 */
    let range = null;
    try { range = selection.getRangeAt(0); } catch (_) {}
    const hitEls = range ? Array.from(document.querySelectorAll(
        '#bible-text-area .wlv-chip, #parallel-text-area .wlv-chip, ' +
        '#bible-text-area .dg-token[data-dg-ref], #parallel-text-area .dg-token[data-dg-ref], ' +
        '#bible-text-area .ja-seg, #parallel-text-area .ja-seg'
    )).filter(el => { try { return range.intersectsNode(el); } catch (_) { return false; } }) : [];
    if (hitEls.length && hitEls.every(el => el.classList.contains('ja-seg'))) {
        _hlLockTouchSegs(hitEls);
    } else {
        _hlUnlockTouchSegs();
    }
    pill.classList.add('hl-show');
}
function _hlScheduleTouchTextSelection(delay) {
    if (_hlTouchSelTimer) clearTimeout(_hlTouchSelTimer);
    _hlTouchSelTimer = setTimeout(_hlTryTouchTextSelection, delay);
}
function _hlTouchPillTap() {
    _hlHideTouchPill();
    _hlUnlockTouchSegs();
    const entries = _hlTouchEntries;
    _hlTouchEntries = [];
    if (entries.length) {
        _hlPickerFromTouch = true;
        if (entries.length === 1) { _hlOpenPicker(entries[0]); return; }
        _hlOpenPicker({ _isBatch: true, entries });
        return;
    }
    /* 種データがない場合の保険: ライブ選択から開く。 */
    const selection = window.getSelection();
    const anchorEl = selection && selection.anchorNode && selection.anchorNode.parentElement;
    _hlOpenPickerForTextSelection({ target: anchorEl, _fromTouchPill: true });
}
/* 「範囲指定」: iOS では青ハンドルのドラッグがチップ単位で効かず
   （inline-flex / inline-block の塊ごとに選択が飛ぶ）複数語の調整が
   安定しないため、長押しで選んだ語を種にして、以降は語のタップで
   選択を増減するモードへ移る。状態管理は既存の複数選択と共用する。 */
function _hlEnterTouchRangeMode() {
    const entries = _hlTouchEntries.length ? _hlTouchEntries : _hlResolveTextSelection();
    if (!entries.length) return;
    _hlTouchEntries = [];
    _hlHideTouchPill();
    _hlUnlockTouchSegs();
    _hlClearNativeSelection();
    _hlState.multiSelectActive = true;
    _hlState.multiSelectEntries = entries.slice();
    const keys = new Set(entries.map(e => [String(e.book), Number(e.chapter), Number(e.verse), Number(e.tokenStart)].join(':')));
    document.querySelectorAll(
        '#bible-text-area .wlv-chip, #parallel-text-area .wlv-chip, ' +
        '#bible-text-area .dg-token[data-dg-ref], #parallel-text-area .dg-token[data-dg-ref]'
    ).forEach(el => {
        const r = _hlRefFromEl(el);
        if (r && keys.has([r.book, r.chapter, r.verse, r.tokenStart].join(':'))) el.classList.add('hl-multi-selected');
    });
    /* 口語訳セグメントも種の選択表示を付ける（従来はチップだけだった）。
       区間のトークンのどれかが種に含まれれば、区間単位で選択表示にする
       （タップ時の _jaSegMultiSelectTap と同じく区間をまとめて扱う作法）。 */
    document.querySelectorAll(
        '#bible-text-area .ja-seg, #parallel-text-area .ja-seg'
    ).forEach(seg => {
        const hit = _jaSegTokenIdxList(seg).some(t => keys.has(
            [String(seg.dataset.jaBook), Number(seg.dataset.jaCh), Number(seg.dataset.jaV), t].join(':')
        ));
        if (hit) seg.classList.add('hl-multi-selected');
    });
    _hlShowSelectionBar('multi', _hlState.multiSelectEntries.length);
}
/* 複数選択モード中は、構造モードのトークンのタップも選択の増減にする
   （トークン自体のクリックは StudyPanel を開くため、捕捉フェーズで先取りする）。
   語順チップ側は既存のチップタップ処理が同じ役割を担う。 */
document.addEventListener('click', function (event) {
    if (!_hlState.multiSelectActive) return;
    const token = event.target && event.target.closest && event.target.closest('.dg-token[data-dg-ref]');
    if (!token || !token.closest('#bible-text-area, #parallel-text-area')) return;
    const m = (token.dataset.dgRef || '').match(/^(\S+) (\d+):(\d+)!(\d+)$/);
    if (!m) return;
    event.stopPropagation();
    event.preventDefault();
    _hlMultiSelectTap(token, { ref: token.dataset.dgRef, bookKey: m[1], ch: Number(m[2]), verse: Number(m[3]) });
}, true);
document.addEventListener('touchend', function (event) {
    _hlLastTouchAt = Date.now();
    _hlLastTouchInPill = !!(event.target && event.target.closest && event.target.closest('#hl-touch-pill'));
    _hlScheduleTouchTextSelection(350);
}, { passive: true });
/* ピルのボタンは click だけでなく touchend でも発火させる。
   iOS の選択メニュー表示中は click が届かないことがあるため。
   どちらが先に発火しても、種データの消費により二重実行にはならない。 */
[['hl-pill-btn-color', _hlTouchPillTap], ['hl-pill-btn-range', _hlEnterTouchRangeMode]].forEach(([id, fn]) => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('touchend', function (event) { event.preventDefault(); fn(); }, { passive: false });
});
document.addEventListener('selectionchange', function () {
    /* タッチ操作由来の選択だけを対象にする（マウスは mouseup 側で処理）。 */
    if (Date.now() - _hlLastTouchAt > 3000) return;
    _hlScheduleTouchTextSelection(300);
});
