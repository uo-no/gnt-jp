/* ══════════════════════════════════════════
   related-passages.js — 節パネルの「関連する箇所」（#86）
   データ: assets/data/related-passages.json（scripts/build-related-passages.cjs の生成物）
           UBS Parallel Passage Database © 2023 United Bible Societies（CC BY-SA 4.0）
   表示: 並行（新約箇所）／旧約（LXX の同じ書・章へ）。箇所名のみ。要約・抜粋・バッジは持たない。
   データのない節では何も出さない（静寂）。解析・解釈を行わない UI 部品。
   ══════════════════════════════════════════ */

let _relData = null;       /* { v: { "MAT 19:4": { p:[], o:[] } } } */
let _relDataPromise = null;

function _loadRelatedPassages() {
    if (_relData) return Promise.resolve(_relData);
    if (!_relDataPromise) {
        _relDataPromise = fetch(new URL('assets/data/related-passages.json', document.baseURI).href)
            .then(r => (r.ok ? r.json() : null))
            .then(d => { _relData = d && d.v ? d : null; return _relData; })
            .catch(() => null);
    }
    return _relDataPromise;
}

/* "MRK 1:32,34" → 表示用の箇所名（書名のみ UI 言語で置換し、章節表記はそのまま） */
function _relRefLabel(ref) {
    const m = /^(\S+) (.+)$/.exec(ref);
    if (!m) return ref;
    return _bookShortName(m[1]) + ' ' + m[2];
}

/* "MAT 19:5-6" → { book, ch, verse(先頭の節) } */
function _relParseNt(ref) {
    const m = /^(\S+) (\d+):(\d+)/.exec(ref);
    return m ? { book: m[1], ch: +m[2], verse: +m[3] } : null;
}

function _relLinkHTML(label, book, ch, verse) {
    if (!book) return `<span class="rel-ref rel-ref-plain">${_escH(label)}</span>`;
    return `<a class="rel-ref" href="#" data-rel-book="${_escH(book)}" data-rel-ch="${ch}" data-rel-verse="${verse == null ? '' : verse}">${_escH(label)}</a>`;
}

function _relSep() {
    return '<span class="rel-sep">' + ((window.I18N && I18N.lang !== 'ja') ? ', ' : '、') + '</span>';
}

function _relBuildHTML(entry) {
    const sections = [];
    if (entry.p && entry.p.length) {
        const sep = _relSep();
        const items = entry.p.map(ref => {
            const p = _relParseNt(ref);
            return _relLinkHTML(_relRefLabel(ref), p && p.book, p && p.ch, p && p.verse);
        }).join(sep);
        sections.push(`<div class="rel-section" data-rel-kind="parallel"><span class="rel-kind">${_escH(_T('panel.relatedParallel', '並行'))}</span><span class="rel-list">${items}</span></div>`);
    }
    if (entry.o && entry.o.length) {
        const sep = _relSep();
        const items = entry.o.map(o =>
            _relLinkHTML(_relRefLabel(o.r), o.b, o.c, o.v)
        ).join(sep);
        sections.push(`<div class="rel-section" data-rel-kind="ot"><span class="rel-kind">${_escH(_T('panel.relatedOt', '旧約'))}</span><span class="rel-list">${items}</span></div>`);
    }
    if (!sections.length) return '';
    const src = _T('panel.relatedSource', '並行箇所データ: UBS Parallel Passage Database © 2023 United Bible Societies（CC BY-SA 4.0）');
    return `${sections.join('')}<div class="rel-source">${_escH(src)}</div>`;
}

/**
 * 節（bookKey ch vNum）の「関連する箇所」を area 末尾に出す。データが無ければ何もしない。
 * 世代カウンタで、素早い節移動による古い結果の誤注入を防ぐ。
 */
async function _fillRelatedPassages(bookKey, ch, vNum, area) {
    if (!area) return;
    const myGen = (area._relGen || 0) + 1;
    area._relGen = myGen;
    area.querySelectorAll('.rel-passages').forEach(n => n.remove());
    if (!bookKey || ch == null || vNum == null) return;
    const data = await _loadRelatedPassages();
    if (myGen !== area._relGen || !data) return;
    const entry = data.v[`${bookKey} ${ch}:${vNum}`];
    if (!entry) return;
    const html = _relBuildHTML(entry);
    if (!html) return;
    const isPc = area.id === 'word-list-view';
    const det = document.createElement('details');
    det.className = 'rel-passages ' + (isPc ? 'wlv-reading-passage-note study-panel-apparatus-note' : 'mvv-passage-note mvv-apparatus-note');
    det.innerHTML = `<summary>${isPc ? `<span class="wlv-pn-label">${_escH(_T('panel.relatedPassages', '関連する箇所'))}</span>` : _escH(_T('panel.relatedPassages', '関連する箇所'))}</summary><div class="rel-body">${html}</div>`;
    area.appendChild(det);
    det.addEventListener('click', e => {
        const a = e.target.closest && e.target.closest('a.rel-ref');
        if (!a) return;
        e.preventDefault();
        /* 箇所ナビゲーション: 翻訳選択を保持した共有URLを生成して開く。
           章をまたぐ移動と節の選択状態の復元は、起動時のURL解決（init）に任せる。 */
        /* 旧約は LXX 本文（ギリシャ語）で開く。訳文は新約のみのため、読み方は語順フローに切り替える。 */
        const isOt = !!a.closest('[data-rel-kind="ot"]');
        const url = ShareURLService.generate(isOt ? {
            book: a.dataset.relBook,
            chapter: a.dataset.relCh,
            verse: a.dataset.relVerse || '',
            transA: 'WORD_ORDER',
            transB: null,
            mode: 'single',
        } : {
            book: a.dataset.relBook,
            chapter: a.dataset.relCh,
            verse: a.dataset.relVerse || '',
            transA: _transA,
            transB: _transB,
            mode: _transMode,
        });
        window.location.href = url.href;
    });
}
