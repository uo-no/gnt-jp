function _jaAlignSegmentsFor(transId, book, ch, verse) {
    const d = _jaAlignCache.get(transId + ':' + book + ':' + ch);
    const v = (d && d.verses) ? d.verses[String(verse)] : null;
    return (v && Array.isArray(v.segments)) ? v.segments : null;
}

/* ══════════════════════════════════════════
   Phase 1b Step 3: 翻訳グロスのサイドカー（多言語管理 B案）
   assets/data/gloss/{翻訳ID}/{書}/{章}.json
     = { translation, book, chapter, glosses: { "<token ref>": "<グロス>" } }
   グロスは対応表から機械生成したもの（D3）。英語UIのときだけ UI 言語に
   対応する翻訳（en → WEB）のグロスを章ロード時に先読みし、チップ／
   ピーク／パネルの「この箇所での意味」に使う。日本語UIでは読み込まず、
   従来の日本語経路がそのまま動く。
   フォールバック: サイドカー → bible_data.english → 従来経路（japanese）。
   2026-11-09 表示切り替え: トークン単位グロス（assets/data/gloss-token/）
   が存在する翻訳・章ではローダがそちらを優先して読み込む（_src='token'）。
   セグメント文が要る句の引用だけは対応表から組み立てる（phrase-renderers）。
   ══════════════════════════════════════════ */
function _glossTransIdForUi() {
    if (typeof window === 'undefined' || !window.I18N) return null;
    if (I18N.lang === 'en') return 'WEB';
    if (I18N.lang === 'es') return 'RVR1909';
    return null;
}
/* トークンの表示グロス（英語UIのみ）。該当が無ければ null を返し、
   呼び出し側は従来経路（japanese）に倒す。 */
function _glossSidecarFor(w) {
    const transId = _glossTransIdForUi();
    if (!transId || !w || !w.ref) return null;
    const book = w.book || w.bookKey;
    const ch = (w.chapter != null) ? w.chapter : w.ch;
    if (!book || ch == null) return null;
    const d = _glossSidecarCache.get(transId + ':' + book + ':' + ch);
    const g = (d && d.glosses) ? d.glosses[w.ref] : null;
    if (typeof g === 'string' && g) return g;
    return (typeof w.english === 'string' && w.english) ? w.english : null;
}

/* セグメント単位サイドカー（gloss/）由来かどうかを判定する（w.english
   フォールバックと区別）。セグメント文の重複排除（関係図の _segDedupeLabel と
   buildRepresentation wordOrder）でのみ使用。トークン単位グロス（gloss-token/）
   由来の値は各トークンが固有のグロスを持つため重複排除の対象にせず、false を
   返す（ローダが data._src に取得元を記録する）。 */
function _glossSidecarIsFromFile(w) {
    const transId = _glossTransIdForUi();
    if (!transId || !w || !w.ref) return false;
    const book = w.book || w.bookKey;
    const ch = (w.chapter != null) ? w.chapter : w.ch;
    if (!book || ch == null) return false;
    const d = _glossSidecarCache.get(transId + ':' + book + ':' + ch);
    return !!(d && d._src !== 'token' && d.glosses && typeof d.glosses[w.ref] === 'string' && d.glosses[w.ref]);
}

/* トークンが属するアラインメント・セグメントのキー（同一セグメントの
   トークンは、間に別セグメントのトークンが挟まっていても同じキーになる）。
   アラインメント未読込・該当なしは null（呼び出し側は隣接判定に倒す）。 */
const _alignSegKeyCache = new Map();
function _alignSegmentKeyFor(w) {
    const transId = _glossTransIdForUi();
    if (!transId || !w) return null;
    const book = w.book || w.bookKey;
    const ch = (w.chapter != null) ? w.chapter : w.ch;
    const ti = Number(w.tokenIndex);
    if (!book || ch == null || w.verse == null || !Number.isFinite(ti)) return null;
    const ck = transId + ':' + book + ':' + ch;
    let m = _alignSegKeyCache.get(ck);
    if (!m) {
        const d = _jaAlignCache.get(ck);
        if (!d || !d.verses) return null;
        m = new Map();
        for (const [v, vdata] of Object.entries(d.verses)) {
            const segs = (vdata && Array.isArray(vdata.segments)) ? vdata.segments : [];
            segs.forEach((seg, si) => {
                (seg.tokens || []).forEach(t => m.set(v + ':' + Number(t), ck + ':' + v + ':' + si));
            });
        }
        _alignSegKeyCache.set(ck, m);
    }
    return m.get(String(w.verse) + ':' + ti) || null;
}

/* 英語UIでの辞書の短いグロス（lexicon-lite の gloss フィールド、lemma 単位）。
   語義行の日本語（readingLexicon の glosses）の置き換え用。供給不能は null
   （英語UIで日本語の語義は出さない）。 */
function _enShortGloss(lemmaId) {
    try {
        const lite = (typeof _lexiconData !== 'undefined' && _lexiconData) || _peekLiteData;
        const e = (lite && lemmaId) ? lite[lemmaId] : null;
        return (e && typeof e.gloss === 'string' && e.gloss) ? e.gloss : null;
    } catch (_) { return null; }
}

function _enSenseText(lemmaId) {
    try {
        const digits = String(lemmaId || '').replace(/[^0-9]/g, '');
        const arr = (_enSensesData && digits) ? _enSensesData[digits] : null;
        if (Array.isArray(arr) && arr.length) return arr.slice(0, 3).join(', ');
    } catch (_) {}
    return _enShortGloss(lemmaId);
}

/* スペイン語UIでの辞書語義（gloss-es-senses.json、lemma 単位・最大3件）。
   該当なしは null（スペイン語UIで英語・日本語の語義は出さない）。 */
function _esSenseText(lemmaId) {
    try {
        const digits = String(lemmaId || '').replace(/[^0-9]/g, '');
        const arr = (typeof _esSensesData !== 'undefined' && _esSensesData && digits) ? _esSensesData[digits] : null;
        if (Array.isArray(arr) && arr.length) return arr.slice(0, 3).join(', ');
    } catch (_) {}
    return null;
}

/* UI 言語に応じた辞書語義テキスト（ja では呼び出し側の従来経路を使うため null）。 */
function _uiSenseText(lemmaId) {
    if (typeof window === 'undefined' || !window.I18N) return null;
    if (I18N.lang === 'es') return _esSenseText(lemmaId);
    if (I18N.lang === 'en') return _enSenseText(lemmaId);
    return null;
}

/* UI 言語の senses データの先読みを開始する。 */
function _ensureUiSenses() {
    if (typeof window === 'undefined' || !window.I18N) return;
    if (I18N.lang === 'es') { if (typeof _ensureEsSenses === 'function') _ensureEsSenses(); }
    else if (I18N.lang === 'en') { if (typeof _ensureEnSenses === 'function') _ensureEnSenses(); }
}

/* 章の生トークン（elData）を節・トークン番号で引けるようにした索引。
   セグメントのタップ時に、ピーク表示と詳細遷移へ必要なトークンを解決するために使う。 */
const _jaSegTokenIndex = new Map();
function _jaSegIndexTokens(book, ch, tokens) {
    const byVerse = new Map(), wordsByVerse = new Map();
    (tokens || []).forEach(w => {
        const v = Number(w.verse), ti = Number(w.tokenIndex);
        if (!Number.isFinite(v) || !Number.isFinite(ti)) return;
        if (!byVerse.has(v)) { byVerse.set(v, new Map()); wordsByVerse.set(v, []); }
        byVerse.get(v).set(ti, w);
        wordsByVerse.get(v).push(w);
    });
    wordsByVerse.forEach(arr => arr.sort((a, b) => Number(a.tokenIndex) - Number(b.tokenIndex)));
    _jaSegTokenIndex.set(book + ':' + ch, { byVerse, wordsByVerse });
}
function _jaSegToken(book, ch, v, ti) {
    const e = _jaSegTokenIndex.get(book + ':' + ch);
    const m = e ? e.byVerse.get(Number(v)) : null;
    return m ? m.get(Number(ti)) : undefined;
}
function _jaSegVerseWords(book, ch, v) {
    const e = _jaSegTokenIndex.get(book + ':' + ch);
    return (e && e.wordsByVerse.get(Number(v))) || [];
}



/* ══════════════════════════════════════════
   P2: Structural Diagram Renderer
   SR JSON（public/assets/data/sr/）を読み取り専用で消費する。
   flow-tree / Reading Engine / Discourse Analysis とは完全に独立したパイプライン。
   ══════════════════════════════════════════ */

function _roleReadingAvailableFor(book, chapter) {
    const a = window._rkAvail;
    if (!a || !book || chapter == null) return false;
    const dev = window.innerWidth <= 900 ? 'sp' : 'pc';
    /* PC では「語の役割で読む」を一旦非表示にする（ユーザー方針 2026-10-31）。
       ピッカーから消え、URL直打ちでも未公開章と同じ案内になる。
       StudyPanel の局所図は _rkAvail を直接見るため影響しない。
       再表示はこの2行を外すだけ。 */
    if (dev === 'pc') return false;
    const ch = String(chapter);
    return !!(a[book] && a[book][ch] && a[book][ch][dev]);
}
function _roleReadingAvailable() {
    const loc = (typeof AppState !== 'undefined' && AppState.location) || {};
    return _roleReadingAvailableFor(loc.book ? loc.book.key : '', loc.chapter);
}


/* StudyPanel data bridge — DG / HDG / ClauseFlow / RK click handlers.
   bible_data token から AppState.inspect.data を設定し、_renderReadingNotes が
   lexicon / content セクションを生成できるようにする。
   _wlvChipClick が設定する同一 schema を踏襲。ReadingEngine 解決は省略し
   jaWord = bible_data.japanese の直転写とする。 */
function _setInspectDataFromElToken(token) {
    if (!token) return;
    AppState.inspect.data = {
        greek:            token.text     || '',
        strong:           token.strong   || '',
        jpMorph:          '',
        rawMorph:         token.morph    || '',
        lemma:            token.lemma    || '',
        jaWord:           token.japanese || '',
        jaWordDisplay:    token.japanese || '',
        desc:             '',
        ref:              token.ref      || '',
        verseId:          token.verseId  || '',
        bookKey:          token.book     || '',
        ch:               token.chapter  != null ? token.chapter  : null,
        verse:            token.verse    != null ? token.verse    : null,
        language:         token.language || 'grc',
        corpusId:         token.corpusId || '',
        lemmaId:          token.lemmaId  != null ? token.lemmaId : null,
        referentEvidence: createReferentEvidence(token),
        subjrefEvidence:  createSubjrefEvidence(token),
    };
}
/* Capture ?view param at module-eval time, before app init() rewrites the URL.
   _renderStructuralDiagramView reads this value after URL has already changed. */
const _hdgInitViewParam = new URLSearchParams(window.location.search).get('view'); /* C-17 */
/* __VR2_SCAFFOLD_END__ */

/**
 * 日本語グロスを品詞・法に応じて自然化する。
 * グロスの末尾をルールベースで変換する。複雑な形態素分析は行わない。
 * 変換できなければ元の gloss をそのまま返す。
 */
function _naturalize(gloss, kind) {
    /* 動詞語幹の末尾を変換するルールテーブル */
    const RULES = {
        'part-pres': [ /* 現在分詞：〜ながら / 〜つつ → 〜ながら */
            [/する$/, 'しながら'], [/する$/, 'しながら'],
            [/いる$/, 'いながら'], [/える$/, 'えながら'],
            [/くる$/, 'きながら'], [/ある$/, 'ありながら'],
            [/([^ん])る$/, '$1ながら'],
            [/つ$/, 'ちながら'],   [/ぬ$/, 'にながら'],
            [/む$/, 'みながら'],   [/ぶ$/, 'びながら'],
            [/う$/, 'いながら'],   [/く$/, 'きながら'],
            [/す$/, 'しながら'],   [/ぐ$/, 'ぎながら'],
        ],
        'part-aor': [ /* アオリスト分詞：〜した（後で） */
            [/する$/, 'した'],     [/いる$/, 'いた'],
            [/える$/, 'えた'],     [/くる$/, 'きた'],
            [/([^ん])る$/, '$1た'],
            [/つ$/, 'った'],       [/ぬ$/, 'んだ'],
            [/む$/, 'んだ'],       [/ぶ$/, 'んだ'],
            [/う$/, 'った'],       [/く$/, 'いた'],
            [/す$/, 'した'],       [/ぐ$/, 'いだ'],
        ],
        'part-perf': [ /* 完了分詞：〜した（状態） */
            [/する$/, 'してきた'], [/いる$/, 'いてきた'],
            [/([^ん])る$/, '$1てきた'],
            [/つ$/, 'ってきた'],   [/む$/, 'んできた'],
        ],
        'inf': [ /* 不定詞：〜すること */
            [/する$/, 'すること'], [/いる$/, 'いること'],
            [/える$/, 'えること'], [/くる$/, 'くること'],
            [/([^ん])る$/, '$1ること'],
            [/つ$/, 'つこと'],    [/ぬ$/, 'ぬこと'],
            [/む$/, 'むこと'],    [/ぶ$/, 'ぶこと'],
            [/う$/, 'うこと'],    [/く$/, 'くこと'],
            [/す$/, 'すこと'],
        ],
        'imp': [ /* 命令法：そのまま（「〜せよ」は重い）*/
            [/する$/, 'せよ'],    [/([^ん])る$/, '$1よ'],
        ],
        'pass': [ /* 受動：〜される */
            [/する$/, 'される'],  [/いる$/, 'いられる'],
            [/([^ん])る$/, '$1られる'],
            [/つ$/, 'たれる'],    [/む$/, 'まれる'],
            [/ぶ$/, 'ばれる'],    [/く$/, 'かれる'],
            [/す$/, 'される'],
        ],
    };

    const rules = RULES[kind] || [];
    for (const [pattern, replacement] of rules) {
        if (pattern.test(gloss)) {
            return gloss.replace(pattern, replacement);
        }
    }
    return gloss; /* 変換できなければ元のまま */
}

/**
 * rawMorph から読書感覚の補助メモ（1行）を生成する。
 * ドロワーに表示するだけなので学術ラベルは使わない。
 * Study タブでは別途詳細が表示される。
 */
function _buildMorphText(rawMorph, pos, parts) {
    const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
    if (pos === 'V' && parts[1]) {
        const off  = /^[0-9]/.test(parts[1]) ? 1 : 0;
        const moodCode  = parts[1][off + 2] || '';
        const tenCode   = parts[1][off]     || '';
        const voiCode   = parts[1][off + 1] || '';

        const ptcNote = _isEn
            ? (tenCode === 'A' ? 'an action preceding the main verb'
              : tenCode === 'P' ? 'describing a situation alongside the main verb'
              : 'adding circumstance to the scene')
            : (tenCode === 'A' ? '先行する副詞的動作（先行状況）'
              : tenCode === 'P' ? '副詞的・形容詞的に同時の状況を描き添えている'
              : '副詞的・実体的に状況を補っている');
        const MOOD_NOTE = _isEn ? {
            'M': 'a call to action',
            'P': ptcNote,
            'N': 'adding purpose or content',
            'S': 'carrying a wish or purpose',
            'I': 'stated as fact',
            'O': 'expressed as a wish',
        } : {
            'M': '行動への呼びかけ',
            'P': ptcNote,
            'N': '目的や内容を補っている',
            'S': '願いや目的を含んでいる',
            'I': '事実として語っている',
            'O': '望みを込めた表現',
        };
        const TEN_NOTE = _isEn ? {
            'X': 'a state from the past still in effect',
            'A': 'as a single event',
            'F': 'as something certain to happen',
            'P': 'now, continuously',
            'I': 'an ongoing state',
        } : {
            'X': '過去から今も続く状態',
            'A': 'ある出来事として',
            'F': '確かに起きること',
            'P': '今・継続して',
            'I': '続いていた状態',
        };
        const VOI_NOTE = _isEn ? {
            'P': 'on the receiving side',
            'M': 'with full involvement',
            'D': 'with full involvement',
        } : {
            'P': '受けとめる側に',
            'M': '深く関わりながら',
            'D': '深く関わりながら',
        };

        const notes = [];
        if (MOOD_NOTE[moodCode]) notes.push(MOOD_NOTE[moodCode]);
        if (TEN_NOTE[tenCode] && moodCode !== 'N' && moodCode !== 'P') notes.push(TEN_NOTE[tenCode]);
        if (VOI_NOTE[voiCode]) notes.push(VOI_NOTE[voiCode]);
        return notes.join(_isEn ? ', ' : '・') || (_isEn ? 'verb' : '動詞');
    } else if (['N','A'].includes(pos) && parts[1]) {
        const base = ['1','2','3'].includes(parts[1][0]) ? parts[1].slice(1) : parts[1];
        const CASE_NOTE = _isEn ? {
            'N': 'at the center of the sentence', 'G': 'connected with "of"',
            'D': 'receiving the connection', 'A': 'the goal of the action', 'V': 'address'
        } : {
            'N': '文の中心にいる', 'G': '〜の、と結びつく',
            'D': '関わりを受ける', 'A': '動作の向かう先', 'V': '呼びかけ'
        };
        const notes = [];
        if (CASE_NOTE[base[0]]) notes.push(CASE_NOTE[base[0]]);
        if (base[1] === 'P') notes.push(_isEn ? 'spoken of as plural' : '複数で語られている');
        return notes.join(_isEn ? ', ' : '・') || (_isEn ? (pos === 'N' ? 'noun' : 'adjective') : (pos === 'N' ? '名詞' : '形容詞'));
    } else if (pos === 'CONJ') {
        return _isEn ? 'connecting word' : '前後をつなぐことば';
    } else if (pos === 'PREP') {
        return _isEn ? 'showing the direction of the connection' : '関係の方向を示す';
    } else if (pos === 'T') {
        return _isEn ? 'pointing word (article)' : '指し示すことば（冠詞）';
    } else if (['P','R','D'].includes(pos)) {
        return _isEn ? 'pointing to someone' : '誰かを指し示している';
    }
    return '';
}
/* __FLOW_CHIP_END__ */

/* ── chip クリック：詳細ドロワーを展開 ── */
/* VR-2 Phase 2: グローバルに現在選択中 chip の tokenId を保持
   （ドロワーから「詳しく見る」するため。配列位置ではなく Token Identity Contract の
   runtime内 Canonical Identity である tokenId で保持する）。 */
let _wlvActiveTokenId = null;

/* ── 口語訳アニメーション helpers ───────────────────────────────────────
   ドロワー開閉に連動して .mvv-inline-translation の高さと透明度を滑らかに変化させる。
   CSS transition（height / opacity / padding / margin-bottom）はモバイルmedia query内で定義済み。
   prefers-reduced-motion 時は transition: none が適用されるためアニメーション不要。
   padding を含めてアニメーションさせる理由: padding-top+padding-bottom が border と合わさると
   box-sizing:border-box 下でも height:0 が padding 分 (≈35px) 下限に留まるため。 */
let _translationExpandHandler = null;

function _collapseInlineTranslation() {
    const mia = document.getElementById('mobile-inspector-area');
    const t = mia && mia.querySelector('.mvv-inline-translation');
    // height が既に '0px' ならアニメーション完了済み（再起動しない）
    if (!t || t.style.height === '0px') return;
    // 進行中のトランジションを現在の視覚位置で中断してから新たに開始する
    t.style.transition = 'none';
    t.style.height = t.offsetHeight + 'px';
    void t.offsetHeight;
    t.style.transition = '';
    void t.offsetHeight;
    t.style.height = '0';
    t.style.opacity = '0';
    t.style.paddingTop = '0';
    t.style.paddingBottom = '0';
    t.style.borderBottomWidth = '0';
    t.style.marginBottom = '0';
}

function _expandInlineTranslation() {
    const mia = document.getElementById('mobile-inspector-area');
    const t = mia && mia.querySelector('.mvv-inline-translation');
    if (!t || !t.style.height) return;  // インライン height なし = 既に自然な高さ
    if (_translationExpandHandler) {
        t.removeEventListener('transitionend', _translationExpandHandler);
        _translationExpandHandler = null;
    }
    // インラインスタイルをすべて除去して offsetHeight（border込み自然高）を計測する
    // scrollHeight は border を含まないため offsetHeight を使う
    t.style.transition = 'none';
    t.style.height = '';
    t.style.paddingTop = '';
    t.style.paddingBottom = '';
    t.style.borderBottomWidth = '';
    void t.offsetHeight;
    const naturalH = t.offsetHeight;  // CSS padding + border を含む自然高
    // アニメーション開始値（height:0, padding:0, border:0）に設定してからトランジションを再開
    t.style.height = '0';
    t.style.paddingTop = '0';
    t.style.paddingBottom = '0';
    t.style.borderBottomWidth = '0';
    void t.offsetHeight;
    t.style.transition = '';
    void t.offsetHeight;
    t.style.height = naturalH + 'px';
    t.style.opacity = '1';
    t.style.paddingTop = '';
    t.style.paddingBottom = '';
    t.style.borderBottomWidth = '';
    t.style.marginBottom = '';
    _translationExpandHandler = function(ev) {
        if (ev.propertyName !== 'height') return;
        t.style.height = '';
        t.removeEventListener('transitionend', _translationExpandHandler);
        _translationExpandHandler = null;
    };
    t.addEventListener('transitionend', _translationExpandHandler);
}

function _clearTranslationInlineStyles(el) {
    if (!el) return;
    if (_translationExpandHandler) {
        el.removeEventListener('transitionend', _translationExpandHandler);
        _translationExpandHandler = null;
    }
    el.style.height = '';
    el.style.opacity = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderBottomWidth = '';
    el.style.marginBottom = '';
    el.style.transition = '';
}
/* ── ここまで口語訳アニメーション helpers ────────────────────────────── */

/** ドロワーを閉じて chip の選択状態をリセットする。StudyPanel・MVV には触れない。 */
function _wlvDrawerClose() {
    const drawer = document.getElementById('wlv-detail-drawer');
    if (drawer) drawer.classList.remove('visible');
    _syncStudyVerseNav();
    document.querySelectorAll('.wlv-chip').forEach(c => c.classList.remove('active'));
    _wlvActiveTokenId = null;
    const _mia = document.getElementById('mobile-inspector-area');
    if (_mia) _mia.classList.remove('drawer-open');
    _expandInlineTranslation();
}
let _wlvChipData      = [];   /* _buildFlowTabHTML で生成した chip 配列を保持 */
/* Phase VR-4B-5: 現在選択中 chip の scope words（gfBlock/verseBlock/_wlvWordCache の
   優先順位で解決済み）。_mobileInspectorDetail から _fillMvvReadingSlot/_fillMvvSemanticSlot
   へ、_wlvChipClick が解決した scope と同じ words 配列を橋渡しするためのグローバル。 */
let _wlvActiveScopeWords = null;

/* ══════════════════════════════════════════════════════════════════
   Phase ESM-8: Referent Evidence（MVP）
   設計正典: docs/development/verse-representation-design.md 系列（ESM-1〜7監査）

   bible_data の referent フィールド（代名詞・指示詞の照応先、編集済み事実）を
   read-only で転写するだけの最小機能。日本語生成・推論は一切行わない。
   WordOrder Representation（_wordToFlowChip 等）・Reading Engine には触れない。
   ══════════════════════════════════════════════════════════════════ */

/**
 * bible_data の生トークンから ReferentEvidence を生成する（read-only 転写のみ）。
 * 生成条件: referent が存在し、単一 token を指す場合のみ。
 * 生成しない（null）: referent なし・空文字・汎用センチネル(n00000000000)・複数候補。
 * 複数候補（disjunctive）は「不確実な参照を1つに決めない」原則により、
 * 代表値を選ばずそのまま非表示とする（ESM-7 G2 判断: 案B）。
 * @param {Object} rawToken - _wlvChipClick 内の _rawToken（decoded 生token）
 * @returns {{kind:'referentEvidence', tokenId:string, targetTokenId:string, evidence:'annotated'}|null}
 */
function createReferentEvidence(rawToken) {
    try {
        if (!rawToken) return null;
        const tokenId = rawToken.verseId;
        if (!tokenId) return null;
        const raw = (typeof rawToken.referent === 'string') ? rawToken.referent.trim() : '';
        if (!raw) return null;
        const ids = raw.split(/\s+/).filter(Boolean);
        if (ids.length !== 1) return null;               // 複数候補は生成しない（null＝静寂）
        const targetTokenId = ids[0];
        if (!targetTokenId || targetTokenId === 'n00000000000') return null; // 汎用センチネル除外
        return { kind: 'referentEvidence', tokenId, targetTokenId, evidence: 'annotated' };
    } catch (_) {
        return null;
    }
}

/**
 * Phase 2B-2: _cachedElByVerse（初期章）と _appendedChapterCache（追加章全章）を検索し、
 * 指定 tokenId に対応する bible_data.japanese を返す。未発見は null（静寂）。
 * verseId はトークン固有値のため、章をまたいでも誤マッチしない。
 * @param {string|null} targetTokenId
 * @returns {string|null}
 */
function _resolveTokenJaById(targetTokenId) {
    try {
        if (!targetTokenId) return null;
        for (const vNum in _cachedElByVerse) {
            const words = _cachedElByVerse[vNum];
            if (!Array.isArray(words)) continue;
            for (const w of words) {
                if (w && w.verseId === targetTokenId) {
                    const ja = (w.japanese != null) ? String(w.japanese).trim() : '';
                    return ja || null;
                }
            }
        }
        for (const elByVerse of _appendedChapterCache.values()) {
            for (const vNum in elByVerse) {
                const words = elByVerse[vNum];
                if (!Array.isArray(words)) continue;
                for (const w of words) {
                    if (w && w.verseId === targetTokenId) {
                        const ja = (w.japanese != null) ? String(w.japanese).trim() : '';
                        return ja || null;
                    }
                }
            }
        }
        return null;
    } catch (_) {
        return null;
    }
}

/**
 * ReferentEvidence.targetTokenId から表示用の日本語(bible_data.japanese の転写のみ)を解決する。
 * 初期章・追加章の両キャッシュを検索（_resolveTokenJaById 経由）。見つからない場合は null（静寂）。
 * @param {{targetTokenId:string}|null} referentEvidence
 * @returns {string|null}
 */
function _resolveTokenLabelById(targetTokenId) {
    /* EN UI では参照先トークンの表示ラベルも英語（サイドカー優先）にする。 */
    try {
        if (typeof window === 'undefined' || !(window.I18N && I18N.lang === 'en')) {
            return _resolveTokenJaById(targetTokenId);
        }
        if (!targetTokenId) return null;
        for (const cache of [_cachedElByVerse, ..._appendedChapterCache.values()]) {
            for (const vNum in cache) {
                const words = cache[vNum];
                if (!Array.isArray(words)) continue;
                for (const w of words) {
                    if (w && w.verseId === targetTokenId) {
                        const label = (typeof _glossSidecarFor === 'function' ? _glossSidecarFor(w) : null)
                            || (w.japanese != null ? String(w.japanese).trim() : '');
                        return label || null;
                    }
                }
            }
        }
        return null;
    } catch (_) {
        return _resolveTokenJaById(targetTokenId);
    }
}

function _resolveReferentEvidenceText(referentEvidence) {
    try {
        if (!referentEvidence || !referentEvidence.targetTokenId) return null;
        return _resolveTokenLabelById(referentEvidence.targetTokenId);
    } catch (_) {
        return null;
    }
}

/* ══════════════════════════════════════════════════════════════════
   Phase ESM-39: Subjref Evidence
   設計正典: docs/specs/LAYER_ARCHITECTURE.md §4「Subjref」（ESM-38-A/B確定仕様）

   bible_data の subjref フィールド（動詞・分詞の（暗示された）主語トークンへの
   参照、編集済み事実）を read-only で転写するだけの最小機能。
   createReferentEvidence()/_resolveReferentEvidenceText() と同型（Referent Evidence
   と補完関係にあるため、Failure Mode・単一候補限定ルールも完全に踏襲する）。
   日本語生成・推論・主語判定ロジックは一切行わない。Frame（A0/A1等）は使用しない。
   ══════════════════════════════════════════════════════════════════ */

/**
 * bible_data の生トークンから SubjrefEvidence を生成する（read-only 転写のみ）。
 * 生成条件: subjref が存在し、単一 token を指す場合のみ。
 * 生成しない（null）: subjref なし・空文字・複数候補。
 * 複数候補は「不確実な参照を1つに決めない」原則（Referent Evidenceと同じ）により
 * 代表値を選ばずそのまま非表示とする。
 * @param {Object} rawToken - _wlvChipClick 内の _rawToken（decoded 生token）
 * @returns {{kind:'subjrefEvidence', tokenId:string, targetTokenId:string, evidence:'annotated'}|null}
 */
function createSubjrefEvidence(rawToken) {
    try {
        if (!rawToken) return null;
        const tokenId = rawToken.verseId;
        if (!tokenId) return null;
        const raw = (typeof rawToken.subjref === 'string') ? rawToken.subjref.trim() : '';
        if (!raw) return null;
        const ids = raw.split(/\s+/).filter(Boolean);
        if (ids.length !== 1) return null;               // 複数候補は生成しない（null＝静寂）
        const targetTokenId = ids[0];
        if (!targetTokenId) return null;
        return { kind: 'subjrefEvidence', tokenId, targetTokenId, evidence: 'annotated' };
    } catch (_) {
        return null;
    }
}

/**
 * SubjrefEvidence.targetTokenId から表示用の日本語(bible_data.japanese の転写のみ)を解決する。
 * _resolveReferentEvidenceText と同型。初期章・追加章の両キャッシュを検索（_resolveTokenJaById 経由）。
 * @param {{targetTokenId:string}|null} subjrefEvidence
 * @returns {string|null}
 */
function _resolveSubjrefEvidenceText(subjrefEvidence) {
    try {
        if (!subjrefEvidence || !subjrefEvidence.targetTokenId) return null;
        return _resolveTokenLabelById(subjrefEvidence.targetTokenId);
    } catch (_) {
        return null;
    }
}





/* ══════════════════════════════════════════
   本文スクロール同期
   ══════════════════════════════════════════ */
/* スクロール同期：#main-reading-area が単一スクロールコンテナになったため不要 */


/*
 * _getVerseSource — render() が節一覧（verse一覧）として用いる resolvedJpData を、
 * ColumnMode（colA）に応じて決定する。
 * VR-5-C（VerseSource Extraction Audit）で確認した「resolvedJpData 決定ロジック」を
 * init() / renderCurrentPage() の重複箇所から抽出したもの（VR-5-D）。
 * colA.kind==='wordOrder' の場合は elData（Greekデータ）由来の _buildFlowJpData()、
 * それ以外は jpData（翻訳データ）をそのまま返す。判定ロジックのみを担い、
 * fetch・エラーハンドリングは呼び出し元に残す（挙動差異を保持するため）。
 */
function _getVerseSource(colA, jpData, elData) {
    /* DA-1: discourse も wordOrder と同じく elData（Greek）由来の VerseSource を用いる
       （訳文JSONを持たない）。判定を _isGreekReadingMode() に集約。 */
    return _isGreekReadingMode(colA.kind) ? _buildFlowJpData(elData) : jpData;
}


/*
 * loadBook — 汎用ブック読み込み関数
 *   loadBook('JHN')                  … 既定値（'JA1955'）で読み込み
 *   loadBook('JHN', 'NKJ2017')       … 指定翻訳で読み込み
 *   loadBook('JHN', 'NKJ')           … 口語訳等を明示指定
 */
