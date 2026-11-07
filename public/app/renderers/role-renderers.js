/* render() が discourse 描画時に読む flow-tree（章単位）。renderCurrentPage()/init() が
   render() 呼び出し前に await 済みで格納する（既存の翻訳fetchと同じ同期タイミング）。 */
let _dcvChapterTreeForRender = null;

/* P2: render() が structural-diagram 描画時に読む SR 章データ（章単位）。
   DA-1 の _dcvChapterTreeForRender と同じタイミングで事前 fetch して格納する。 */
let _sdChapterDataForRender = null;
/* 語の役割で読む レンダー関数。
   SR JSON → RoleReadingAdapter（シム木）→ RoleReadingLayout（作業スペースの
   エディタ配置コアの移植）→ 文ごとの SVG。座標は作業スペース側が正で、
   ここでは再現のみを行う。語クリックで StudyPanel を開く（RK ビューと同じ連携）。 */
/* Sidecar segment texts are replicated onto every token of a segment.
   In the sentence diagrams, show the segment text only on the segment's
   first token; continuation tokens (same verse, consecutive tokenIndex,
   identical sidecar label) get an empty label, so a phrase is not
   repeated on every node and no Greek is mixed into the label row
   (user decision 2026-11-07: hide, as in the word-order view).
   `state` is carried by the caller across tokens in chapter order.
   Language-agnostic: keyed on the sidecar-file source, not on a
   specific UI language. Callers must distinguish '' (hide) from null
   (no gloss — fall back). */
function _segLabelState() { return { verse: null, tokenIndex: null, label: null, shownKeys: new Set() }; }
function _segDedupeLabel(tok, gloss, state) {
    const fromFile = !!gloss && typeof _glossSidecarIsFromFile === 'function' && _glossSidecarIsFromFile(tok);
    if (!fromFile) { state.verse = null; state.tokenIndex = null; state.label = null; return gloss; }
    /* Segment identity from the alignment when available: a segment's
       tokens are not always consecutive (postpositives can sit inside
       another segment's span), so adjacency alone re-displays the text. */
    const _segKey = (typeof _alignSegmentKeyFor === 'function') ? _alignSegmentKeyFor(tok) : null;
    if (_segKey) {
        if (state.shownKeys.has(_segKey)) return '';
        state.shownKeys.add(_segKey);
        state.verse = tok.verse; state.tokenIndex = Number(tok.tokenIndex); state.label = gloss;
        return gloss;
    }
    const ti = Number(tok.tokenIndex);
    const isCont = state.label !== null && tok.verse === state.verse
        && ti === state.tokenIndex + 1 && gloss === state.label;
    if (isCont) {
        state.tokenIndex = ti;
        return '';
    }
    state.verse = tok.verse; state.tokenIndex = ti; state.label = gloss;
    return gloss;
}

async function _renderRoleReadingView(app, srData, elData) {
    const wrap = document.createElement('div');
    wrap.className = 'sd-view role-reading-view';
    wrap.setAttribute('aria-label', _T('mode.ROLE_READING', '語の役割で読む'));

    if (!srData || !Array.isArray(srData.sentences) || srData.sentences.length === 0) {
        const emptyEl = document.createElement('div');
        emptyEl.className = 'sd-empty';
        emptyEl.textContent = _T('rr.noData', 'この章の構文データがありません。');
        wrap.appendChild(emptyEl);
        app.innerHTML = '';
        app.appendChild(wrap);
        return;
    }
    if (!window.RoleReadingAdapter || !window.RoleReadingLayout) {
        const errEl = document.createElement('div');
        errEl.className = 'sd-empty';
        errEl.textContent = _T('rr.rendererMissing', '語の役割で読むレンダラーが読み込まれていません。');
        wrap.appendChild(errEl);
        app.innerHTML = '';
        app.appendChild(wrap);
        return;
    }
    app.innerHTML = '';
    app.appendChild(wrap);

    const book = ((srData.sentences[0] || {}).ref || '').split(' ')[0] || '';
    /* 公開ゲート: 座標の確定が済んでいない章は、URL直打ちでも表示しない */
    await window._rkAvailPromise;
    if (!wrap.isConnected) return; /* 描画中に画面が切り替わった */
    const _locCh = (typeof AppState !== 'undefined' && AppState.location) ? AppState.location.chapter : null;
    if (!_roleReadingAvailableFor(book, _locCh)) {
        const naEl = document.createElement('div');
        naEl.className = 'sd-empty';
        naEl.textContent = _T('rr.notAvailable', '「語の役割で読む」はこの章ではまだ利用できません（座標の確定が済んだ章から順に公開します）。');
        wrap.appendChild(naEl);
        return;
    }
    const offsets = await _loadRkOffsets(book);
    if (!wrap.isConnected) return; /* 描画中に画面が切り替わった */

    const bdTokenMap = (window.RKReadingAdapter && RKReadingAdapter.buildTokenMap)
        ? RKReadingAdapter.buildTokenMap(elData) : new Map();
    const _rkRefToBd = new Map();
    for (const tok of bdTokenMap.values()) {
        if (tok && tok.ref) _rkRefToBd.set(tok.ref, tok);
    }

    /* 表示倍率: 他のモードのギリシャ語（--text-body）と同じ大きさになる固定値 */
    const textScale = _roleTextScale();

    let chapter, result;
    try {
        /* 表示は bible_data の japanese（語順で読む／文の構造で読むと同じ語義）。
           EN UI の場合は _glossSidecarFor() による英語グロスを優先し、
           供給できない語は tok.japanese にフォールバックする。 */
        const jaByRef = new Map();
        for (const [r, tok] of _rkRefToBd) { if (tok && tok.japanese) jaByRef.set(r, tok.japanese); }
        let _rkLabelMap = jaByRef;
        if (window.I18N && I18N.lang === 'en') {
            const enByRef = new Map();
            const _segState = _segLabelState();
            for (const [r, tok] of _rkRefToBd) {
                if (tok && tok.ref) {
                    const gloss = _glossSidecarFor(tok);
                    const label = _segDedupeLabel(tok, gloss, _segState);
                    enByRef.set(r, label != null ? label : (tok.japanese || ''));
                }
            }
            _rkLabelMap = enByRef;
        }
        chapter = RoleReadingAdapter.buildChapter(srData, offsets, _rkLabelMap);
        /* PCでも横に長い文は下へ折り返す（スマホと同じ折り返し機構）。
           折り返し幅は「表示カラム幅 ÷ 表示倍率」でレイアウト単位に換算する。 */
        let wrapW;
        if (window.innerWidth <= 900) {
            wrapW = 342;
        } else {
            const availPx = (wrap.clientWidth > 0 ? wrap.clientWidth : 680) - 8;
            wrapW = Math.round(availPx / textScale);
            if (wrapW < 500) wrapW = 500;
            if (wrapW > 1600) wrapW = 1600;
        }
        result = RoleReadingLayout.layoutChapter(
            chapter.sentences.map(s => s.root),
            { spWrapW: wrapW }
        );
    } catch (e) {
        const errEl = document.createElement('div');
        errEl.className = 'sd-empty';
        errEl.textContent = _T('rr.layoutError', 'レイアウトエラー: ') + String(e);
        wrap.appendChild(errEl);
        return;
    }

    const NS = 'http://www.w3.org/2000/svg';
    const _buildRoleSection = (s, si) => {
        const laid = result.sentences[si];
        const secEl = document.createElement('section');
        secEl.className = 'sd-sentence';
        secEl.setAttribute('data-ref', s.ref || '');
        const refText = (s.ref || '').replace(/^\S+\s+\d+:/, '');
        if (laid && laid.words.length) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity;
            for (const w of laid.words) { minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x + w.w); minY = Math.min(minY, w.y); }
            /* 節番号は他のモードと同様に、図の先頭行の先頭の語の左に置く
               （従来は番号だけの行が図の上に1行あり、その分空白に見えた）。
               SVG内のテキストとして先頭行のベースラインに揃える。 */
            let anchorX = Infinity;
            for (const w of laid.words) { if (w.y === minY) anchorX = Math.min(anchorX, w.x); }
            const vbLeft = Math.min(minX - 18, anchorX - 52);
            const vbRight = maxX + 18;
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', `${vbLeft} ${laid.y0 - 36} ${vbRight - vbLeft} ${laid.h + 66}`);
            svg.setAttribute('class', 'role-svg');
            /* 文字サイズは他のモードに合わせ、全ての文で固定倍率にする
               （倍率は描画前に textScale として算出済み）。 */
            const extentW = vbRight - vbLeft;
            const scale = textScale;
            svg.style.width = Math.round(extentW * scale) + 'px';
            svg.style.height = Math.round((laid.h + 66) * scale) + 'px';
            if (refText) {
                const vn = document.createElementNS(NS, 'text');
                vn.setAttribute('class', 'vnum');
                vn.setAttribute('x', String(anchorX - 16));
                vn.setAttribute('y', String(minY));
                vn.setAttribute('text-anchor', 'end');
                vn.textContent = refText;
                svg.appendChild(vn);
            }
            for (const e of laid.edges) {
                const p = document.createElementNS(NS, 'path');
                p.setAttribute('d', RoleReadingLayout.edgePath(e));
                p.setAttribute('class', 'e ' + e.kind);
                svg.appendChild(p);
            }
            laid.words.forEach((w, wi) => {
                const g = document.createElementNS(NS, 'g');
                g.setAttribute('class', 'wn');
                g.setAttribute('data-i', String(wi));
                const ul = document.createElementNS(NS, 'line');
                ul.setAttribute('x1', String(w.x - RoleReadingLayout.PADX));
                ul.setAttribute('x2', String(w.x + w.w + RoleReadingLayout.PADX + (w.ew || 0)));
                ul.setAttribute('y1', String(w.y + 4));
                ul.setAttribute('y2', String(w.y + 4));
                ul.setAttribute('class', 'ul');
                g.appendChild(ul);
                const t = document.createElementNS(NS, 'text');
                t.setAttribute('x', String(w.x));
                t.setAttribute('y', String(w.y));
                t.textContent = w.text;
                g.appendChild(t);
                const meta = s.tokenMeta.get(w.id);
                if (meta && meta.ref) {
                    g.style.cursor = 'pointer';
                    g.addEventListener('click', function () {
                        const bd = _rkRefToBd.get(meta.ref);
                        if (bd) {
                            _setInspectDataFromElToken(bd);
                            _setStudyTarget(meta.ref, bd.verseId);
                        }
                        openStudyPanel(meta.text, meta.rawMorph, meta.ref, (bd && bd.lemma) || '');
                    });
                }
                svg.appendChild(g);
            });
            secEl.appendChild(svg);
        } else if (refText) {
            /* 図が無い文は従来どおり番号だけの行で示す */
            const refEl = document.createElement('div');
            refEl.className = 'sd-sentence-ref';
            refEl.textContent = refText;
            secEl.appendChild(refEl);
        }
        wrap.appendChild(secEl);
    };
    /* 巨大な文のSVGを一括構築すると初回描画まで画面が固まるため、
       文単位で少しずつ作り、先頭の文から順に表示する。 */
    let _rsi = 0;
    const _buildNextSections = () => {
        if (!wrap.isConnected) return;
        const _t0 = (window.performance && performance.now) ? performance.now() : 0;
        while (_rsi < chapter.sentences.length) {
            _buildRoleSection(chapter.sentences[_rsi], _rsi);
            _rsi++;
            if (_t0 && _rsi < chapter.sentences.length && performance.now() - _t0 > 24) break;
        }
        if (_rsi < chapter.sentences.length) requestAnimationFrame(_buildNextSections);
    };
    _buildNextSections();
}

/* 表示倍率（レイアウト上の22単位 = 他のモードのギリシャ語 --text-body のpx数）。
   読書モード本体と第3層の局所表示で共用する。 */
function _roleTextScale() {
    /* 注意: キャッシュ名を関数名と別にすること（同名だと window._roleTextScale が
       関数自身を指し、計算が走らず倍率が壊れる）。 */
    if (window._roleTextScaleCache == null) {
        let targetPx = 14.4;
        try {
            const cs = getComputedStyle(document.documentElement);
            const v = parseFloat(cs.getPropertyValue('--text-body'));
            const rootPx = parseFloat(cs.fontSize) || 16;
            if (v > 0 && rootPx > 0) targetPx = v * rootPx;
        } catch (_) { /* フォールバック 14.4px */ }
        window._roleTextScaleCache = targetPx / 22;
    }
    return window._roleTextScaleCache;
}


/* ─────────────────────────────────────────────
   語の役割の局所表示（StudyPanel 第3層）:
   選択中の語が属する文全体の図を、2つのトグルの上の
   枠（パン可能なビューポート）の中に表示する。レイアウト・
   倍率・折り返し・公開ゲートは読書モード本体と同一で、
   初期表示は選択語が枠の中心に来る位置。表示専用。
   ───────────────────────────────────────────── */
async function _buildLocalRelationFrame(ref) {
    const parsed = _flowTreeParseRef(ref);
    if (!parsed) return null;
    if (!window.RoleReadingAdapter || !window.RoleReadingLayoutL3S) return null;
    if (window._rkAvailPromise) { try { await window._rkAvailPromise; } catch (_) { /* ゲート側で判定 */ } }
    /* パネル内の枠は幅に合わせる必要がない（パンして見る）ため、読書モード本体の
       デバイス別ゲートは適用しない。章の役割データが公開済みかだけを見る。 */
    const _avail = window._rkAvail && window._rkAvail[parsed.book] && window._rkAvail[parsed.book][parsed.chapter];
    if (!_avail || (!_avail.pc && !_avail.sp)) return null;
    const sr = await _loadSrChapter(parsed.book, parsed.chapter);
    if (!sr) return null;
    const offsets = await _loadRkOffsets(parsed.book);
    /* 表示は bible_data の japanese（読書モード本体と同じ）。
       EN UI の場合は _glossSidecarFor() による英語グロスを優先し、
       供給できない語は tok.japanese にフォールバックする。 */
    const bd = await _loadBdChapter(parsed.book, parsed.chapter);
    const jaByRef = new Map();
    if (Array.isArray(bd)) {
        for (const tok of bd) { if (tok && tok.ref && tok.japanese) jaByRef.set(tok.ref, tok.japanese); }
    }
    let _lrfLabelMap = jaByRef;
    if (window.I18N && I18N.lang === 'en' && Array.isArray(bd)) {
        const enByRef = new Map();
        const _segState = _segLabelState();
        for (const tok of bd) {
            if (tok && tok.ref) {
                const gloss = _glossSidecarFor(tok);
                const label = _segDedupeLabel(tok, gloss, _segState);
                enByRef.set(tok.ref, label != null ? label : (tok.japanese || ''));
            }
        }
        _lrfLabelMap = enByRef;
    }
    const chapter = RoleReadingAdapter.buildChapter(sr, offsets, _lrfLabelMap);
    let sentence = null, centerId = null;
    for (const s of chapter.sentences) {
        for (const [id, meta] of s.tokenMeta) {
            if (meta && meta.ref === ref) { sentence = s; centerId = id; break; }
        }
        if (sentence) break;
    }
    if (!sentence) return null;
    const scale = _roleTextScale();
    /* 枠はパンして見るので、幅に合わせて無理に折り返さない。
       折り返しなし（右へ流れていく）レイアウトにする
       （ユーザー方針 2026-10-31: 無理に折り返さなくて良い、
       右に逃していって見やすく）。 */
    const result = RoleReadingLayoutL3S.layoutChapter([sentence.root], { spWrapW: null });
    const laid = result && result.sentences && result.sentences[0];
    if (!laid || !laid.words.length) return null;
    const words = laid.words, edges = laid.edges;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, center = null;
    for (const w of words) {
        minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x + w.w);
        minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y);
        if (w.id === centerId) center = w;
    }
    if (!center) return null;
    /* 線の経路が語より外へはみ出す場合（左端チャネルの分散など）も
       表示範囲に含め、はみ出した線が枠端で切れないようにする。 */
    for (const e of edges) {
        const toks = RoleReadingLayoutL3S.edgePath(e).match(/[MLVH]|-?\d+(?:\.\d+)?/g) || [];
        let pcmd = null;
        for (let ti = 0; ti < toks.length; ti++) {
            const tk = toks[ti];
            if (/^[MLVH]$/.test(tk)) { pcmd = tk; continue; }
            const v = parseFloat(tk);
            if (pcmd === 'H') { minX = Math.min(minX, v); maxX = Math.max(maxX, v); }
            else if (pcmd === 'M' || pcmd === 'L') { minX = Math.min(minX, v); maxX = Math.max(maxX, v); ti++; if (pcmd === 'M') pcmd = 'L'; }
        }
    }
    minX -= 18; maxX += 18;
    const top = minY - 40, widthU = maxX - minX, heightU = (maxY - minY) + 70;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `${minX} ${top} ${widthU} ${heightU}`);
    svg.setAttribute('class', 'role-svg');
    svg.style.width = Math.round(widthU * scale) + 'px';
    svg.style.height = Math.round(heightU * scale) + 'px';
    for (const e of edges) {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', RoleReadingLayoutL3S.edgePath(e));
        p.setAttribute('class', 'e ' + e.kind);
        svg.appendChild(p);
    }
    for (const w of words) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'wn' + (w.id === centerId ? ' focus' : ''));
        const ul = document.createElementNS(NS, 'line');
        ul.setAttribute('x1', String(w.x - RoleReadingLayoutL3S.PADX));
        ul.setAttribute('x2', String(w.x + w.w + RoleReadingLayoutL3S.PADX + (w.ew || 0)));
        ul.setAttribute('y1', String(w.y + 4));
        ul.setAttribute('y2', String(w.y + 4));
        ul.setAttribute('class', 'ul');
        g.appendChild(ul);
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', String(w.x));
        t.setAttribute('y', String(w.y));
        t.textContent = w.text;
        g.appendChild(t);
        svg.appendChild(g);
    }
    const frame = document.createElement('div');
    frame.className = 'local-rel-frame';
    frame.appendChild(svg);
    /* 地図式UIの状態: 倍率・ズーム・中心（レイアウト単位、viewBox原点基準） */
    frame._svgEl = svg;
    frame._baseScale = scale;
    frame._zoom = 1;
    frame._widthU = widthU;
    frame._heightU = heightU;
    frame._centerU = { x: center.x + center.w / 2 - minX, y: center.y - top };
    _attachPanScroll(frame);
    _attachLocalRelGestures(frame);
    /* コントロール（拡大・縮小・選択語へ戻る）: 枠の右下に固定（地図アプリ式） */
    const controls = document.createElement('div');
    controls.className = 'local-rel-controls';
    controls.innerHTML =
        '<button type="button" class="local-rel-btn" data-act="expand" aria-label="' + _T('panel.expandView', '大きく表示') + '" title="' + _T('panel.expandView', '大きく表示') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/></svg></button>' +
        '<button type="button" class="local-rel-btn" data-act="zin" aria-label="' + _T('panel.zoomIn', '拡大') + '" title="' + _T('panel.zoomIn', '拡大') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>' +
        '<button type="button" class="local-rel-btn" data-act="zout" aria-label="' + _T('panel.zoomOut', '縮小') + '" title="' + _T('panel.zoomOut', '縮小') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg></button>' +
        '<button type="button" class="local-rel-btn" data-act="recenter" aria-label="' + _T('panel.recenterWord', '選択中の語へ戻る') + '" title="' + _T('panel.recenterWord', '選択中の語へ戻る') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg></button>';
    controls.addEventListener('click', e => {
        const btn = e.target.closest('[data-act]');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        if (act === 'zin') _setLocalRelZoom(frame, frame._zoom * 1.3);
        else if (act === 'zout') _setLocalRelZoom(frame, frame._zoom / 1.3);
        else if (act === 'recenter') _centerLocalRelationFrame(frame);
        else if (act === 'expand') _openLocalRelOverlay(frame.parentElement);
    });
    const wrap = document.createElement('div');
    wrap.className = 'local-rel-wrap';
    wrap.appendChild(frame);
    wrap.appendChild(controls);
    wrap._frameEl = frame;
    const _rm = /^(\S+)\s+(\d+):(\d+)/.exec(ref || '');
    wrap._refLabel = _rm ? _bookFullName(_rm[1]) + ' ' + _rm[2] + ':' + _rm[3] : '';
    return wrap;
}

/* 倍率の適用: anchorU（レイアウト座標）を anchorOff（枠内px位置）に保つ。
   anchorOff 省略時は枠の中央に置く */
function _applyLocalRelZoom(frame, z, anchorU, anchorOff) {
    if (!frame || !frame._svgEl) return;
    if (z < 0.1) z = 0.1;
    if (z > 3) z = 3;
    frame._zoom = z;
    frame._svgEl.style.width = Math.round(frame._widthU * frame._baseScale * z) + 'px';
    frame._svgEl.style.height = Math.round(frame._heightU * frame._baseScale * z) + 'px';
    if (anchorU) {
        const k = frame._baseScale * z;
        const ox = anchorOff ? anchorOff.x : frame.clientWidth / 2;
        const oy = anchorOff ? anchorOff.y : frame.clientHeight / 2;
        frame.scrollLeft = Math.max(0, Math.round(anchorU.x * k - ox));
        frame.scrollTop = Math.max(0, Math.round(anchorU.y * k - oy));
    }
    if (frame._zoomLabelEls) {
        const label = Math.round(z * 100) + '%';
        for (const el of frame._zoomLabelEls) { if (el && el.isConnected) el.textContent = label; }
    }
}

/* ズーム変更: 図の表示倍率だけを変え、選択語が中央に来る位置へ寄せ直す */
function _setLocalRelZoom(frame, z) {
    if (!frame || !frame._svgEl) return;
    frame._fitActive = false;
    _applyLocalRelZoom(frame, z, frame._centerU);
}

/* 地図アプリ式のドラッグ移動: 枠の余白部分を押さえたまま動かすと
   上下左右に移動する（PC は左ボタンを押したまま、モバイルは指で
   押さえたまま）。語や線の上からは開始しない（余白が対象）。
   タッチでも同じ仕組みで動くよう Pointer Events に統一し、
   .local-rel-frame の touch-action: none でブラウザのスクロール
   奪取を防ぐ。移動自体はスクロール位置の変更として行う。 */
function _attachPanScroll(frame) {
    let down = false, sx = 0, sy = 0, sl = 0, st = 0;
    frame.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (frame._pinchActive) return;   /* ピンチ中はパンしない */
        /* 余白部分だけを対象にする: フレーム自身か、SVG の地の部分 */
        if (e.target !== frame && e.target !== frame._svgEl) return;
        e.preventDefault();   /* ドラッグ中の文字選択・画像ドラッグを防ぐ */
        down = true; sx = e.clientX; sy = e.clientY; sl = frame.scrollLeft; st = frame.scrollTop;
        try { frame.setPointerCapture(e.pointerId); } catch (_) { /* 任意 */ }
        frame.classList.add('dragging');
    });
    frame.addEventListener('pointermove', e => {
        if (!down) return;
        if (frame._pinchActive) { down = false; frame.classList.remove('dragging'); return; }
        frame.scrollLeft = sl - (e.clientX - sx);
        frame.scrollTop = st - (e.clientY - sy);
    });
    const end = () => { down = false; frame.classList.remove('dragging'); };
    frame.addEventListener('pointerup', end);
    frame.addEventListener('pointercancel', end);
}

function _scrollLocalRelTo(frame, u) {
    if (!frame || !u) return;
    const k = frame._baseScale * (frame._zoom || 1);
    frame.scrollLeft = Math.max(0, Math.round(u.x * k - frame.clientWidth / 2));
    frame.scrollTop = Math.max(0, Math.round(u.y * k - frame.clientHeight / 2));
}

function _centerLocalRelationFrame(frame) {
    if (!frame || !frame._centerU) return;
    _scrollLocalRelTo(frame, frame._centerU);
}

/* いま枠の中央に見えている点（レイアウト座標） */
function _localRelViewportCenterU(frame) {
    const k = frame._baseScale * (frame._zoom || 1);
    return { x: (frame.scrollLeft + frame.clientWidth / 2) / k, y: (frame.scrollTop + frame.clientHeight / 2) / k };
}

/* 図全体を枠に収める（拡大表示での全体把握用） */
function _fitLocalRelationFrame(frame) {
    if (!frame || !frame._widthU || !frame.clientWidth) return;
    const z = Math.min(frame.clientWidth / (frame._widthU * frame._baseScale), frame.clientHeight / (frame._heightU * frame._baseScale));
    _applyLocalRelZoom(frame, z, { x: frame._widthU / 2, y: frame._heightU / 2 });
    frame._fitActive = true;
}

function _toggleLocalRelFit(frame) {
    if (!frame) return;
    if (frame._fitActive) {
        frame._fitActive = false;
        const prev = frame._preFitView;
        _applyLocalRelZoom(frame, prev ? prev.zoom : 1, prev ? prev.centerU : frame._centerU);
    } else {
        frame._preFitView = { zoom: frame._zoom || 1, centerU: _localRelViewportCenterU(frame) };
        _fitLocalRelationFrame(frame);
    }
}

/* 拡大表示の中だけのジェスチャ: ピンチ／ホイールで指・カーソル位置を中心に拡縮し、
   ダブルタップ／ダブルクリックで全体表示を切り替える。
   インライン表示では _expanded が立たないので従来の動きのまま */
function _attachLocalRelGestures(frame) {
    frame.addEventListener('wheel', e => {
        if (!frame._expanded) return;
        e.preventDefault();
        frame._fitActive = false;
        const rect = frame.getBoundingClientRect();
        const off = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const k = frame._baseScale * (frame._zoom || 1);
        const u = { x: (frame.scrollLeft + off.x) / k, y: (frame.scrollTop + off.y) / k };
        const f = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        _applyLocalRelZoom(frame, (frame._zoom || 1) * f, u, off);
    }, { passive: false });
    frame.addEventListener('dblclick', e => {
        if (!frame._expanded) return;
        e.preventDefault();
        _toggleLocalRelFit(frame);
    });
    /* ダブルタップ（タッチ／ペン）: 短く・ほとんど動かないタップ2回 */
    let lastTap = 0, tapX = 0, tapY = 0, downAt = 0, downX = 0, downY = 0;
    frame.addEventListener('pointerdown', e => { downAt = Date.now(); downX = e.clientX; downY = e.clientY; });
    frame.addEventListener('pointerup', e => {
        if (!frame._expanded || e.pointerType === 'mouse') return;
        if (frame._pinchActive || (frame._lastPinchEnd && Date.now() - frame._lastPinchEnd < 400)) { lastTap = 0; return; }
        const quick = Date.now() - downAt < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 10;
        if (!quick) { lastTap = 0; return; }
        const now = Date.now();
        if (now - lastTap < 350 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 40) { lastTap = 0; _toggleLocalRelFit(frame); }
        else { lastTap = now; tapX = e.clientX; tapY = e.clientY; }
    });
    /* ピンチ: 2点間の距離で拡縮する。パン側は _pinchActive の間止まる */
    const pts = new Map();
    let pinching = false, startDist = 0, startZoom = 1, startU = null;
    const midOff = () => {
        const ab = [...pts.values()];
        const rect = frame.getBoundingClientRect();
        return { x: (ab[0].x + ab[1].x) / 2 - rect.left, y: (ab[0].y + ab[1].y) / 2 - rect.top };
    };
    frame.addEventListener('pointerdown', e => {
        if (!frame._expanded) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) {
            const ab = [...pts.values()];
            startDist = Math.hypot(ab[0].x - ab[1].x, ab[0].y - ab[1].y) || 1;
            startZoom = frame._zoom || 1;
            const off = midOff();
            const k = frame._baseScale * startZoom;
            startU = { x: (frame.scrollLeft + off.x) / k, y: (frame.scrollTop + off.y) / k };
            pinching = true; frame._pinchActive = true; frame._fitActive = false;
        }
    });
    frame.addEventListener('pointermove', e => {
        if (!pinching || !pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size !== 2) return;
        const ab = [...pts.values()];
        const dist = Math.hypot(ab[0].x - ab[1].x, ab[0].y - ab[1].y) || 1;
        _applyLocalRelZoom(frame, startZoom * dist / startDist, startU, midOff());
    });
    const endPinch = e => {
        pts.delete(e.pointerId);
        if (pts.size < 2 && pinching) { pinching = false; frame._pinchActive = false; frame._lastPinchEnd = Date.now(); }
    };
    frame.addEventListener('pointerup', endPinch);
    frame.addEventListener('pointercancel', endPinch);
}

/* 拡大表示（シート式オーバーレイ）: 同じ枠要素をシートへ移して開き、閉じると
   元のスロットへ戻す。開く側は直前の倍率と「見ていた中心」を引き継ぎ、
   戻す側は開く直前の枠の状態（倍率・中心・スクロール）をそのまま復元する */
function _openLocalRelOverlay(wrap) {
    if (!wrap || wrap._inOverlay || document.querySelector('.local-rel-overlay')) return;
    const frame = wrap._frameEl;
    if (!frame) return;
    const view = { zoom: frame._zoom || 1, centerU: _localRelViewportCenterU(frame) };
    const homeView = { zoom: view.zoom, centerU: view.centerU, sl: frame.scrollLeft, st: frame.scrollTop };
    const home = { parent: wrap.parentNode, next: wrap.nextSibling };
    const srcEl = frame.getBoundingClientRect();
    const sourceRect = { left: srcEl.left, top: srcEl.top, width: srcEl.width, height: srcEl.height, right: srcEl.right, bottom: srcEl.bottom };
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const IA = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"';
    const overlay = document.createElement('div');
    overlay.className = 'local-rel-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', _T('panel.relationsExpanded', '文の関係（拡大表示）'));
    overlay.innerHTML =
        '<div class="local-rel-backdrop"></div>' +
        '<div class="local-rel-sheet">' +
            '<div class="local-rel-sheet-head"><div class="local-rel-handle"></div>' +
                '<div class="local-rel-sheet-title"><span class="local-rel-pill">' + _T('panel.relationsPill', '文の関係') + '</span><span class="local-rel-ref"></span></div></div>' +
            '<div class="local-rel-sheet-body"></div>' +
        '</div>' +
        '<div class="local-rel-bar">' +
            '<button type="button" class="local-rel-bar-btn" data-oact="recenter" aria-label="' + _T('panel.recenterWord', '選択中の語へ戻る') + '" title="' + _T('panel.recenterWord', '選択中の語へ戻る') + '"><svg ' + IA + '><circle cx="12" cy="12" r="5.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></svg></button>' +
            '<div class="local-rel-bar-zoom">' +
                '<button type="button" class="local-rel-bar-btn" data-oact="zin" aria-label="' + _T('panel.zoomIn', '拡大') + '" title="' + _T('panel.zoomIn', '拡大') + '"><svg ' + IA + '><path d="M12 5v14M5 12h14"/></svg></button>' +
                '<button type="button" class="local-rel-zoom-label" data-oact="zreset" aria-label="' + _T('panel.zoomReset', '等倍に戻す') + '" title="' + _T('panel.zoomReset', '等倍に戻す') + '">100%</button>' +
                '<button type="button" class="local-rel-bar-btn" data-oact="zout" aria-label="' + _T('panel.zoomOut', '縮小') + '" title="' + _T('panel.zoomOut', '縮小') + '"><svg ' + IA + '><path d="M5 12h14"/></svg></button>' +
            '</div>' +
            '<button type="button" class="local-rel-bar-btn" data-oact="close" aria-label="' + _T('panel.closeView', '閉じる') + '" title="' + _T('panel.closeView', '閉じる') + '"><svg ' + IA + '><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</div>';
    overlay.querySelector('.local-rel-ref').textContent = wrap._refLabel || '';
    overlay.querySelector('.local-rel-sheet-body').appendChild(wrap);
    document.body.appendChild(overlay);
    wrap._inOverlay = true; frame._expanded = true; frame._fitActive = false;
    frame._zoomLabelEls = [overlay.querySelector('.local-rel-zoom-label')];
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    _applyLocalRelZoom(frame, view.zoom, view.centerU);   /* 図の位置決めはアニメーション開始前に済ませる（開始直後のレイアウト落ち防止） */
    const sheet = overlay.querySelector('.local-rel-sheet');
    const bar = overlay.querySelector('.local-rel-bar');
    /* 遷移（案B: 枠の位置から広がるコンテナ変換）: シートをインライン枠の
       位置・大きさに重ねた状態から、変形（移動＋拡縮）だけで定位置へ広げる。
       元の位置が取れない場合は下からせり上がる動きにフォールバックする */
    const dst = sheet.getBoundingClientRect();
    const flipOk = !reduced && sourceRect.width > 10 && sourceRect.height > 10 && dst.width > 10 && dst.height > 10 &&
        sourceRect.bottom > 0 && sourceRect.top < window.innerHeight && sourceRect.right > 0 && sourceRect.left < window.innerWidth;
    overlay._hasFlip = flipOk;
    overlay._sourceRect = sourceRect;
    if (flipOk) {
        const sx = sourceRect.width / dst.width, sy = sourceRect.height / dst.height;
        sheet.style.transformOrigin = '0 0';
        sheet.style.transform = 'translate(' + (sourceRect.left - dst.left) + 'px, ' + (sourceRect.top - dst.top) + 'px) scale(' + sx + ', ' + sy + ')';
        sheet.style.boxShadow = 'none';   /* 大きな影はアニメーション中の再描画が重いので、静止後に戻す。角丸は遷移させない（毎フレーム再クリップになるため） */
    } else if (!reduced) {
        sheet.style.transform = 'translateY(48px) scale(0.98)';
        sheet.style.boxShadow = 'none';
    }
    if (!reduced) { bar.style.opacity = '0'; bar.style.transform = 'translateY(10px)'; }
    let closing = false;
    const snapToFinal = () => {
        sheet.style.transition = 'none'; sheet.style.transform = ''; sheet.style.borderRadius = ''; sheet.style.transformOrigin = ''; sheet.style.boxShadow = '';
        bar.style.transition = 'none'; bar.style.opacity = ''; bar.style.transform = '';
    };
    const onResize = () => { if (!closing) snapToFinal(); };
    window.addEventListener('resize', onResize);
    const startAnim = () => {
        overlay.classList.add('open');
        if (reduced) return;
        sheet.style.transition = 'transform .32s cubic-bezier(0.22, 1, 0.36, 1)';
        sheet.style.transform = '';
        bar.style.transition = 'opacity .26s ease .04s, transform .26s cubic-bezier(0.22, 1, 0.36, 1) .04s';
        bar.style.opacity = '1'; bar.style.transform = '';
        setTimeout(() => { sheet.style.transition = ''; sheet.style.transformOrigin = ''; sheet.style.boxShadow = ''; bar.style.transition = ''; }, 340);
    };
    requestAnimationFrame(() => requestAnimationFrame(startAnim));
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    const finish = () => {
        window.removeEventListener('resize', onResize);
        if (home.parent) {
            if (home.next && home.next.parentNode === home.parent) home.parent.insertBefore(wrap, home.next);
            else home.parent.appendChild(wrap);
        }
        /* 枠の状態は開く直前のまま復元する。拡大側の倍率・スクロールを持ち帰って
           後から適用すると、戻った後に図が再配置されて「読み込み直し・広がり」に
           見えるため、オーバーレイを外す前に同期で戻し、最初の描画から元の姿にする */
        _applyLocalRelZoom(frame, homeView.zoom, homeView.centerU);
        frame.scrollLeft = homeView.sl; frame.scrollTop = homeView.st;
        overlay.remove();
        wrap._inOverlay = false; frame._expanded = false; frame._pinchActive = false;
        document.body.style.overflow = prevOverflow;
    };
    const close = () => {
        if (closing) return; closing = true;
        document.removeEventListener('keydown', onKey, true);
        overlay.classList.remove('open');
        if (reduced) { finish(); return; }
        bar.style.transition = 'opacity .15s ease'; bar.style.opacity = '0';
        /* 閉じる動き：元の枠へ縮めて戻すと、縦横比の違いで図が縦に潰れて
           見えるため、縮小はせず短いフェードでパッと消す（開く動きはFLIPのまま） */
        sheet.style.transition = 'opacity .16s ease';
        requestAnimationFrame(() => { sheet.style.opacity = '0'; });
        setTimeout(finish, 175);
    };
    document.addEventListener('keydown', onKey, true);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay || e.target.classList.contains('local-rel-backdrop')) close(); });
    overlay.addEventListener('click', e => {
        const btn = e.target.closest('[data-oact]');
        if (!btn) return;
        const act = btn.getAttribute('data-oact');
        if (act === 'close') close();
        else if (act === 'recenter') { frame._fitActive = false; _scrollLocalRelTo(frame, frame._centerU); }
        else if (act === 'zin') { frame._fitActive = false; _applyLocalRelZoom(frame, (frame._zoom || 1) * 1.3, _localRelViewportCenterU(frame)); }
        else if (act === 'zout') { frame._fitActive = false; _applyLocalRelZoom(frame, (frame._zoom || 1) / 1.3, _localRelViewportCenterU(frame)); }
        else if (act === 'zreset') { frame._fitActive = false; _applyLocalRelZoom(frame, 1, _localRelViewportCenterU(frame)); }
    });
    /* ハンドルを含む上部帯だけ、下ドラッグで閉じられる（図のパンとは領域が別） */
    const head = overlay.querySelector('.local-rel-sheet-head');
    let hy = null;
    head.addEventListener('pointerdown', e => { hy = e.clientY; });
    head.addEventListener('pointermove', e => { if (hy !== null && e.clientY - hy > 72) { hy = null; close(); } });
    head.addEventListener('pointerup', () => { hy = null; });
    head.addEventListener('pointercancel', () => { hy = null; });
}

/* 局所図スロットへの注入は Desktop / Mobile で同一処理のため共通化した。
   世代カウンタはスロットごとに保持し、競合時の打ち切りは従来どおりスロット単位。 */
const _relationSlotGen = { 'rn-relation-slot': 0, 'mvv-relation-slot': 0 };
async function _fillRelationSlot(slotId, ref) {
    const slot0 = document.getElementById(slotId);
    if (!slot0) return;
    const myGen = ++_relationSlotGen[slotId];
    slot0.innerHTML = '';
    let frame = null;
    try { frame = await _buildLocalRelationFrame(ref); } catch (_) { frame = null; }
    if (myGen !== _relationSlotGen[slotId]) return;
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.innerHTML = '';
    if (frame) {
        /* 入口導線 Phase 1: 図に題と見方を付ける（従来は無題で、初見には何の図か伝わらなかった）。
           ヘッダーは枠（wrap）の外に置く。拡大表示へは枠だけが移るため二重に出ない。 */
        const head = document.createElement('div');
        head.className = 'local-rel-head';
        head.innerHTML =
            '<div class="local-rel-title">' + _T('panel.relationsInSentence', '文の中での関係') + '</div>' +
            '<div class="local-rel-caption">' + _T('panel.localRelCaption', '選んだ語が、文のほかの語とどう関わっているか') + '</div>' +
            '<details class="local-rel-legend"><summary>' + _T('panel.symbolGuide', '記号の見方') + '</summary>' +
            '<ul>' +
            '<li>' + _T('panel.localRelLegend1', '選んだ語は、緑色で太く表示されます') + '</li>' +
            '<li>' + _T('panel.localRelLegend2', '線は、語と語がどう関わっているかを表します') + '</li>' +
            '<li>' + _T('panel.localRelLegend3', '語のそばの小さな言葉（例：［冠詞］）は、その語の役割を表します') + '</li>' +
            '<li>' + _T('panel.localRelLegend4', '枠はドラッグで動かせます。右下のボタンで、拡大・縮小と「選択中の語へ戻る」ができます') + '</li>' +
            '</ul></details>';
        slot.appendChild(head);
        slot.appendChild(frame);
        _centerLocalRelationFrame(frame._frameEl);
    }   /* null は空のまま（静寂） */
}

async function _fillRnRelationSlot(ref) { return _fillRelationSlot('rn-relation-slot', ref); }

async function _fillMvvRelationSlot(ref) { return _fillRelationSlot('mvv-relation-slot', ref); }
