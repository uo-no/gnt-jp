/**
 * 1語のデータを flow chip 表示用オブジェクトに変換する。
 *
 * @param {Object} w   word data（text, morph, lemma, japanese/gloss, ref, strong）
 * @param {number} i   index
 * @returns {{ greek, gloss, roleClass, phraseBreakBefore, signals, morphText, jaWord, rawMorph, lemma, ref, strong }}
 */
/* __FLOW_CHIP_BEGIN__
   Stage B: Flow Renderer（docs/flow-rendering.md）[FROZEN 2026-07-17]
   基準値: NT 137,741 トークン / チップ変更 39,485 / 破損形（新）0 /
           chip⇔StudyPanel 一致率 100%。
   変更時は scripts/re-stageB-regression.cjs へ回帰ケース追加 →
   npm run test:re-stageB 全 PASS を確認すること。
   Flow Renderer は日本語を生成しない。日本語の SSOT は Reading Engine。
   Fallback 3 層:
     Tier 0: resolve 結果あり → resolved.japanese
     Tier 1: resolve null    → 素の w.japanese（_naturalize は適用しない —
             StudyPanel・Phrase 引用と同一の fallback = SSOT 一致）
     Tier 2: Engine 未ロード / cache 生成失敗 / resolved 未指定の旧呼び出し
             → 旧経路（_naturalize 含む）へ rollback */

/* 節単位 resolve cache（単一スロット・words 参照キー）。
   ContextBuilder の実行はこのキャッシュ生成時の 1 回のみで、
   チップ・ドロワー・原語タブはすべてこれを再利用する（再実行禁止）。 */
let _verseResolveCache = null;   // { words, resolved }

/* 経路6: Flow chip signal labels — JA / EN pair tables
   キーは形態素コード／ギリシア語テキスト（内部ID）。label は表示専用。 */
const _VERB_MOOD_SIG_JA = {
    M: { label: '強く勧めている',   cls: 'sig-exhort' },
    P: { label: '背景を描いている', cls: 'sig-logic'  },
    N: { label: '目的を示している', cls: 'sig-logic'  },
    S: { label: '願いを込めている', cls: 'sig-logic'  },
};
const _VERB_MOOD_SIG_EN = {
    M: { label: 'urging action',       cls: 'sig-exhort' },
    P: { label: 'painting the scene',  cls: 'sig-logic'  },
    N: { label: 'pointing to purpose', cls: 'sig-logic'  },
    S: { label: 'expressing a wish',   cls: 'sig-logic'  },
};
const _VERB_MOOD_SIG_ES = {
    M: { label: 'impulsando a actuar',    cls: 'sig-exhort' },
    P: { label: 'pintando la escena',     cls: 'sig-logic'  },
    N: { label: 'apuntando al propósito', cls: 'sig-logic'  },
    S: { label: 'expresando un deseo',    cls: 'sig-logic'  },
};
const _VERB_VOI_SIG_JA = {
    P: { label: '受けとめる側に立っている',     cls: 'sig-word' },
    M: { label: '深く関わりながら動いている', cls: 'sig-word' },
    D: { label: '深く関わりながら動いている', cls: 'sig-word' },
};
const _VERB_VOI_SIG_EN = {
    P: { label: 'placed on the receiving side', cls: 'sig-word' },
    M: { label: 'acting with full involvement', cls: 'sig-word' },
    D: { label: 'acting with full involvement', cls: 'sig-word' },
};
const _VERB_VOI_SIG_ES = {
    P: { label: 'en el lado que recibe',          cls: 'sig-word' },
    M: { label: 'actuando con plena implicación', cls: 'sig-word' },
    D: { label: 'actuando con plena implicación', cls: 'sig-word' },
};
const _NOUN_CASE_SIG_JA = {
    N: { label: '中心にいる',       cls: 'sig-logic' },
    G: { label: '結びついている',   cls: 'sig-logic' },
    D: { label: '関わりを受けている', cls: 'sig-logic' },
    A: { label: '動作の向かう先',   cls: 'sig-logic' },
    V: { label: '呼びかけられている', cls: 'sig-logic' },
};
const _NOUN_CASE_SIG_EN = {
    N: { label: 'at the center',              cls: 'sig-logic' },
    G: { label: 'in connection',              cls: 'sig-logic' },
    D: { label: 'receiving the connection',   cls: 'sig-logic' },
    A: { label: 'the goal of the action',     cls: 'sig-logic' },
    V: { label: 'being addressed',            cls: 'sig-logic' },
};
const _NOUN_CASE_SIG_ES = {
    N: { label: 'en el centro',             cls: 'sig-logic' },
    G: { label: 'en conexión',              cls: 'sig-logic' },
    D: { label: 'recibiendo la conexión',   cls: 'sig-logic' },
    A: { label: 'la meta de la acción',     cls: 'sig-logic' },
    V: { label: 'siendo invocado',          cls: 'sig-logic' },
};
const _NOUN_NUM_SIG_JA = { P: { label: '複数で語られている', cls: 'sig-logic' } };
const _NOUN_NUM_SIG_EN = { P: { label: 'spoken of as plural', cls: 'sig-logic' } };
const _NOUN_NUM_SIG_ES = { P: { label: 'mencionado en plural', cls: 'sig-logic' } };
const _ADJ_CASE_SIG_JA = {
    N: { label: '特徴を示している',         cls: 'sig-logic' },
    G: { label: '性質を結びつけている',     cls: 'sig-logic' },
    D: { label: '関わる対象を彩っている',   cls: 'sig-logic' },
    A: { label: '対象の様子を語っている',   cls: 'sig-logic' },
};
const _ADJ_CASE_SIG_EN = {
    N: { label: 'describing a quality',       cls: 'sig-logic' },
    G: { label: 'linking a characteristic',   cls: 'sig-logic' },
    D: { label: 'coloring what it relates to', cls: 'sig-logic' },
    A: { label: 'speaking to the one it describes', cls: 'sig-logic' },
};
const _ADJ_CASE_SIG_ES = {
    N: { label: 'describiendo una cualidad',             cls: 'sig-logic' },
    G: { label: 'vinculando una característica',         cls: 'sig-logic' },
    D: { label: 'dando color a aquello a lo que se refiere', cls: 'sig-logic' },
    A: { label: 'hablando de aquel a quien describe',    cls: 'sig-logic' },
};
const _CONJ_SIG_JA = {
    'γάρ':  { label: 'なぜなら、と理由へ進む',          cls: 'sig-logic'    },
    'ἀλλά': { label: 'しかし、と流れが変わる',          cls: 'sig-turn'     },
    'οὖν':  { label: 'だから、と結論へ向かう',          cls: 'sig-logic'    },
    'δέ':   { label: '話が次の段階へ進む',             cls: 'sig-turn'     },
    'καί':  { label: 'さらに、と積み重なる',            cls: 'sig-emphasis' },
    'ἵνα':  { label: '〜のために、と目的が示される',    cls: 'sig-logic'    },
    'ὅτι':  { label: '〜ということ、と内容が続く',      cls: 'sig-logic'    },
    'εἰ':   { label: 'もし〜なら、と仮定の話に入る',    cls: 'sig-logic'    },
    'ὥστε': { label: 'その結果として、と帰結が来る',    cls: 'sig-logic'    },
};
const _CONJ_SIG_EN = {
    'γάρ':  { label: 'because — a reason follows',           cls: 'sig-logic'    },
    'ἀλλά': { label: 'but — the direction shifts',           cls: 'sig-turn'     },
    'οὖν':  { label: 'therefore — moving toward a conclusion', cls: 'sig-logic'  },
    'δέ':   { label: 'and / now — the story moves on',       cls: 'sig-turn'     },
    'καί':  { label: 'and — adding to what came before',     cls: 'sig-emphasis' },
    'ἵνα':  { label: 'so that — a purpose is introduced',    cls: 'sig-logic'    },
    'ὅτι':  { label: 'that — the content continues',         cls: 'sig-logic'    },
    'εἰ':   { label: 'if — entering a conditional thought',   cls: 'sig-logic'    },
    'ὥστε': { label: 'so that — a result follows',           cls: 'sig-logic'    },
};
const _CONJ_SIG_ES = {
    'γάρ':  { label: 'porque — sigue una razón',               cls: 'sig-logic'    },
    'ἀλλά': { label: 'pero — la dirección cambia',             cls: 'sig-turn'     },
    'οὖν':  { label: 'por tanto — avanzando a una conclusión', cls: 'sig-logic'   },
    'δέ':   { label: 'y / ahora — el relato avanza',           cls: 'sig-turn'     },
    'καί':  { label: 'y — añadiendo a lo anterior',            cls: 'sig-emphasis' },
    'ἵνα':  { label: 'para que — se introduce un propósito',   cls: 'sig-logic'    },
    'ὅτι':  { label: 'que — el contenido continúa',            cls: 'sig-logic'    },
    'εἰ':   { label: 'si — entrando en un pensamiento condicional', cls: 'sig-logic' },
    'ὥστε': { label: 'de modo que — sigue un resultado',       cls: 'sig-logic'    },
};
const _CONJ_SIG_FB_JA = { label: '前後をつないでいる',                    cls: 'sig-logic' };
const _CONJ_SIG_FB_EN = { label: 'connecting what comes before and after', cls: 'sig-logic' };
const _CONJ_SIG_FB_ES = { label: 'conectando lo anterior con lo que sigue', cls: 'sig-logic' };
const _PREP_SIG_JA = { label: '関係の方向を示している',                cls: 'sig-logic' };
const _PREP_SIG_EN = { label: 'showing the direction of the connection', cls: 'sig-logic' };
const _PREP_SIG_ES = { label: 'mostrando la dirección de la conexión', cls: 'sig-logic' };
const _PRON_CASE_SIG_JA = {
    N: { label: '誰の話かを示している',       cls: 'sig-logic' },
    G: { label: '誰に関わるかを示している',   cls: 'sig-logic' },
    D: { label: '関わりを受けている人を指す', cls: 'sig-logic' },
    A: { label: '動作の向かう人を指す',       cls: 'sig-logic' },
};
const _PRON_CASE_SIG_EN = {
    N: { label: 'pointing to who is in view',           cls: 'sig-logic' },
    G: { label: 'pointing to whose concern',            cls: 'sig-logic' },
    D: { label: 'pointing to who receives the connection', cls: 'sig-logic' },
    A: { label: 'pointing to whom the action reaches',  cls: 'sig-logic' },
};
const _PRON_CASE_SIG_ES = {
    N: { label: 'apuntando a quién está en vista',       cls: 'sig-logic' },
    G: { label: 'apuntando a de quién se trata',         cls: 'sig-logic' },
    D: { label: 'apuntando a quién recibe la conexión',  cls: 'sig-logic' },
    A: { label: 'apuntando a quién alcanza la acción',   cls: 'sig-logic' },
};
function _getVerseResolved(words) {
    try {
        if (!window.App?.readingEngine || !Array.isArray(words) || words.length === 0) return null;
        if (_verseResolveCache && _verseResolveCache.words === words) {
            return _verseResolveCache.resolved;
        }
        const resolved = new Array(words.length).fill(null);
        for (let k = 0; k < words.length; k++) {
            const ctx = _buildReadingContext(words, k);
            if (!ctx) continue;
            resolved[k] = window.App.readingEngine.resolve(words[k], ctx) || null;
        }
        _verseResolveCache = { words, resolved };
        return resolved;
    } catch (_) {
        return null;   // Tier 2（呼び出し側は resolved 未指定で旧経路へ）
    }
}

/**
 * @param {Object} w       - 語トークン（生JSON）
 * @param {number} i       - 節内インデックス
 * @param {string} [_bookKey] - 書物キー（呼び出し元が持つ構造フィールド）
 * @param {number} [_ch]      - 章番号（呼び出し元が持つ構造フィールド）
 * @param {Object|null} [_resolved] - Engine resolve 結果（Stage B）。
 *        指定時: Tier 0/1（Engine が日本語の SSOT）。
 *        未指定（undefined）: Tier 2 = 従来動作（既存呼び出し互換）。
 * @param {Object[]} [_words] - 節トークン配列（Stage C P1: 表示整形用。
 *        省略時は整形なし = 従来表示）。
 */
function _wordToFlowChip(w, i, _bookKey, _ch, _resolved, _words) {
    const greek    = w.text   || '-';
    const rawMorph = w.morph  || '';
    const lemma    = w.lemma  || '';
    // ★ ref は表示専用。ナビゲーション/ロジックには bookKey / ch / verse を使う。
    const ref      = w.ref    || '';
    // ★ SSOT: 書物キー・章番号は構造フィールドから取得（ref パース禁止）
    // 生データのフィールド名は book / chapter（bookKey / ch ではない）なのでフォールバック追加
    const bookKey  = w.bookKey  || w.book    || _bookKey || '';
    const ch       = w.ch      != null ? w.ch
                   : w.chapter != null ? w.chapter
                   : _ch       != null ? _ch
                   : null;
    const verse    = w.verse    != null ? w.verse    : null;
    const strong   = normalizeStrong(w.strong);
    // Stage B: 日本語の決定は Reading Engine（docs/flow-rendering.md §0）。
    //   Tier 0: _resolved.japanese / Tier 1: 素の w.japanese /
    //   Tier 2（_resolved === undefined = 旧呼び出し）: 従来経路
    const _engineJa = (_resolved !== undefined)
        ? ((_resolved && typeof _resolved.japanese === 'string') ? _resolved.japanese : null)
        : undefined;
    const jaWord = (_engineJa !== undefined && _engineJa !== null)
        ? _engineJa
        : (w.japanese || '—');

    const parts    = rawMorph.split('-');
    const pos      = parts[0] || '';

    /* ── グロス自然化（Tier 2 = 旧経路のみ。Tier 0/1 では適用しない） ── */
    let gloss = jaWord;

    /* Phase 1b Step 3: 英語UIでは WEB グロス（サイドカー → bible_data.english）を
       優先する。適用時は日本語向けの整形・自然化をスキップする。 */
    const _enGloss = _glossSidecarFor(w);
    if (_enGloss) gloss = _enGloss;

    /* セグメント無所属などでサイドカー/英語フィールドが空の語は、英語UIでは
       日本語フィールドではなく辞書（lexicon-lite）の英語グロスへ落とす。 */
    let _lexGloss = null;
    if (!_enGloss && typeof window !== 'undefined' && window.I18N && I18N.lang !== 'ja'
        && typeof _uiShortGloss === 'function') {
        _lexGloss = _uiShortGloss(w.lemmaId);
        if (_lexGloss) gloss = _lexGloss;
    }
    const _enLike = !!_enGloss || !!_lexGloss;

    /* Stage C P1: 表示整形（Presentation Policy — 表示のみ。jaWord は生のまま。
       docs/presentation-policy.md。_words 省略時・Policy 未ロード時は整形なし） */
    if (!_enLike && _engineJa !== undefined && _engineJa !== null &&
        _words && window.App?.PresentationPolicy) {
        gloss = window.App.PresentationPolicy.formatDisplay(
            gloss, _resolved.source, _words, i);
    }

    /* 動詞の法・時制に応じた接尾調整 */
    if (!_enLike && _engineJa === undefined && pos === 'V' && parts[1]) {
        const off       = /^[0-9]/.test(parts[1]) ? 1 : 0;
        const tenseCode = parts[1][off]     || '';
        const voiceCode = parts[1][off + 1] || '';
        const moodCode  = parts[1][off + 2] || '';

        /* 分詞：「〜ながら」「〜した（上で）」など */
        if (moodCode === 'P') {
            if (tenseCode === 'P') gloss = _naturalize(jaWord, 'part-pres');
            else if (tenseCode === 'A') gloss = _naturalize(jaWord, 'part-aor');
            else if (tenseCode === 'X') gloss = _naturalize(jaWord, 'part-perf');
        }
        /* 不定詞 */
        else if (moodCode === 'N') {
            gloss = _naturalize(jaWord, 'inf');
        }
        /* 命令法 */
        else if (moodCode === 'M') {
            gloss = _naturalize(jaWord, 'imp');
        }
        /* 受動態 */
        if (voiceCode === 'P') {
            gloss = _naturalize(gloss, 'pass');
        }
    }

    /* 冠詞：gloss/lemma をそのまま使う（他の品詞と統一） */

    /* roleClass：chip dot の色付けと signal 生成 */
    const dpGrammarClasses = buildDepthGrammarClasses(rawMorph).join(' ');
    const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
    const _isEs = typeof window !== 'undefined' && window.I18N && I18N.lang === 'es';

    let roleClass = 'role-other';
    const signals = [];

    if (pos === 'V') {
        roleClass = 'role-verb';
        const off      = /^[0-9]/.test(parts[1] || '') ? 1 : 0;
        const moodCode = (parts[1] || '')[off + 2] || '';
        const tenCode  = (parts[1] || '')[off]     || '';
        const voiCode  = (parts[1] || '')[off + 1] || '';

        /* 法（Mood）シグナル */
        const _moodSig = (_isEn ? _VERB_MOOD_SIG_EN : _isEs ? _VERB_MOOD_SIG_ES : _VERB_MOOD_SIG_JA)[moodCode];
        if (_moodSig) signals.push(_moodSig);

        /* 時制シグナル（複合条件のため if/else を保持） */
        if (tenCode === 'X')
            signals.push(_isEn ? { label: 'still in effect',           cls: 'sig-promise' }
                                : _isEs ? { label: 'todavía en efecto',  cls: 'sig-promise' }
                                : { label: '今も続いている',              cls: 'sig-promise' });
        else if (tenCode === 'A' && moodCode === 'I')
            signals.push(_isEn ? { label: 'stated as a completed event', cls: 'sig-declare' }
                                : _isEs ? { label: 'presentado como un acontecimiento concluido', cls: 'sig-declare' }
                                : { label: '一つの出来事として語っている',  cls: 'sig-declare' });
        else if (tenCode === 'F' && moodCode === 'I')
            signals.push(_isEn ? { label: 'declared as certain',        cls: 'sig-promise' }
                                : _isEs ? { label: 'declarado como seguro', cls: 'sig-promise' }
                                : { label: '確かに起きると語っている',     cls: 'sig-promise' });

        /* 態シグナル */
        const _voiSig = (_isEn ? _VERB_VOI_SIG_EN : _isEs ? _VERB_VOI_SIG_ES : _VERB_VOI_SIG_JA)[voiCode];
        if (_voiSig) signals.push(_voiSig);
    }
    else if (pos === 'N')    {
        roleClass = 'role-noun';
        const caseParts = parts[1] || '';
        const base = ['1','2','3'].includes(caseParts[0]) ? caseParts.slice(1) : caseParts;
        const cs = (_isEn ? _NOUN_CASE_SIG_EN : _isEs ? _NOUN_CASE_SIG_ES : _NOUN_CASE_SIG_JA)[base[0]];
        if (cs) signals.push(cs);
        const ns = (_isEn ? _NOUN_NUM_SIG_EN : _isEs ? _NOUN_NUM_SIG_ES : _NOUN_NUM_SIG_JA)[base[1]];
        if (ns) signals.push(ns);
    }
    else if (pos === 'A')    {
        roleClass = 'role-adj';
        const caseParts = parts[1] || '';
        const base = ['1','2','3'].includes(caseParts[0]) ? caseParts.slice(1) : caseParts;
        const cs = (_isEn ? _ADJ_CASE_SIG_EN : _isEs ? _ADJ_CASE_SIG_ES : _ADJ_CASE_SIG_JA)[base[0]];
        if (cs) signals.push(cs);
    }
    else if (pos === 'CONJ') {
        roleClass = 'role-conj';
        const _conjSig = (_isEn ? _CONJ_SIG_EN : _isEs ? _CONJ_SIG_ES : _CONJ_SIG_JA)[w.text];
        if (_conjSig) signals.push(_conjSig);
        else signals.push(_isEn ? _CONJ_SIG_FB_EN : _isEs ? _CONJ_SIG_FB_ES : _CONJ_SIG_FB_JA);
    }
    else if (pos === 'PREP') { roleClass = 'role-prep'; signals.push(_isEn ? _PREP_SIG_EN : _isEs ? _PREP_SIG_ES : _PREP_SIG_JA); }
    else if (pos === 'T')    { roleClass = 'role-art'; /* 冠詞はsignalなし。静かに */ }
    else if (['P','R','D'].includes(pos)) {
        roleClass = 'role-pron';
        const caseParts = parts[1] || '';
        const base = ['1','2','3'].includes(caseParts[0]) ? caseParts.slice(1) : caseParts;
        const cs = (_isEn ? _PRON_CASE_SIG_EN : _isEs ? _PRON_CASE_SIG_ES : _PRON_CASE_SIG_JA)[base[0]];
        if (cs) signals.push(cs);
    }

    /* 句区切りの判定：接続詞・前置詞の前で区切る */
    const phraseBreakBefore = (pos === 'CONJ' && i > 0) || (pos === 'PREP' && i > 0);

    /* morphText：ドロワーに表示する人が読める文法メモ */
    const morphText = _buildMorphText(rawMorph, pos, parts);

    // ★ SSOT: bookKey / ch / verse を chip に持たせる。
    //          openStudyPanel 等のロジックはこれらを使い、ref 文字列に依存しない。
    const language = w.language  || 'grc';
    const corpusId = w.corpusId  || '';
    const lemmaId  = w.lemmaId   != null ? w.lemmaId : null;
    // VR-2 Phase 1: Token Identity Contract（docs/development/verse-representation-design.md）。
    //   tokenId = runtime内 Canonical Identity（bible_data 由来、NT全体で一意）。
    //   verseId = persistent identity（Lowfat xml:id 由来、cross-build 安定）。
    //   本フェーズでは Representation への保持のみを行う。Consumer側（Renderer/
    //   Interaction）はまだこれらを参照しない（Phase 2 以降）。
    const tokenId  = isFinite(Number(w.tokenId)) ? String(Number(w.tokenId)) : '';
    const verseId  = w.verseId  != null ? w.verseId  : null;
    // EN UI: true when gloss came from sidecar file (segment text), not w.english fallback.
    // Used by buildRepresentation() to dedup repeated segment text in consecutive chips.
    const glossFromSidecar = !!_enGloss && typeof _glossSidecarIsFromFile === 'function' && _glossSidecarIsFromFile(w);
    return { greek, gloss, roleClass, phraseBreakBefore, signals, morphText, jaWord, rawMorph, lemma, ref, strong, dpGrammarClasses, bookKey, ch, verse, language, corpusId, lemmaId, tokenId, verseId, glossFromSidecar };
}

/* Per-token sidecar glosses (EN/ES): a token whose gloss is a bracket
   placeholder ([absorbido], [article], ...) has no visible word of its
   own, so it must not wear verb decorations (dp mood/tense/voice) — the
   decoration belongs to visible text, as in the base-text segment rule.
   Strip the decoration from the placeholder chip and donate it inside
   the same alignment segment: prefer a real-text verb chip missing a
   mood class, else the first real-text chip without verb decorations.
   Donation merges per class type (mood/tense/voice) so the recipient
   keeps its own classes. If the segment has no real-text chip, the
   decoration is dropped. JA is unaffected (no sidecar, no placeholders). */
function _applyPlaceholderDpDonation(chips, tokens) {
    if (!Array.isArray(chips) || !chips.length) return;
    if (typeof _glossTransIdForUi !== 'function' || !_glossTransIdForUi()) return;
    const isPlaceholder = g => /^\[[^\]]*\]$/.test(String(g || '').trim());
    const verbDpOf = c => (String(c.dpGrammarClasses || '').match(/dp-(?:mood|tense|voice)-[a-z]+/g) || []);
    const groups = new Map();
    chips.forEach((chip, i) => {
        const key = (typeof _alignSegmentKeyFor === 'function' && tokens && tokens[i])
            ? _alignSegmentKeyFor(tokens[i]) : null;
        const gk = key || ('_solo' + i);
        if (!groups.has(gk)) groups.set(gk, []);
        groups.get(gk).push(chip);
    });
    groups.forEach(g => {
        let donation = null;
        g.forEach(chip => {
            const dp = verbDpOf(chip);
            if (dp.length && isPlaceholder(chip.gloss)) {
                if (!donation) donation = dp;
                chip.dpGrammarClasses = 'dp-word';
            }
        });
        if (!donation) return;
        const real = g.filter(chip => chip.gloss && !isPlaceholder(chip.gloss));
        let target = real.find(chip => String(chip.rawMorph || '').charAt(0) === 'V'
            && !/dp-mood-/.test(chip.dpGrammarClasses || ''));
        if (!target) target = real.find(chip => !verbDpOf(chip).length);
        if (!target) return;
        const have = verbDpOf(target).map(c => c.split('-')[1]);
        const add = donation.filter(c => have.indexOf(c.split('-')[1]) < 0);
        if (add.length) target.dpGrammarClasses = (String(target.dpGrammarClasses || 'dp-word') + ' ' + add.join(' ')).trim();
    });
}

/**
 * ReadingEngine 用の ResolveContext を構築する（Phase 2 Syntax Layer）。
 * ContextBuilder.build()（同期・O(n)）の結果から純粋データのみを抽出する。
 * ReadingEngine は SyntaxAnalyzer / ContextBuilder を直接呼ばない設計のため、
 * 注入するデータはここで組み立てる（設計正典: resolve(token, context?)）。
 * 失敗・未ロード時は null（ReadingEngine は Phase 1 Morphology のみで動作する）。
 */
/* __READING_CTX_BEGIN__
   Stage D: Reading Context Layer — 唯一の Context Source（docs/context-layer.md）
   Flow / StudyPanel / Phrase Reading / Presentation はすべて本関数を共有し、
   ReadingContext が供給する ResolveContext を使う。出力は従来とバイト等価。
   観測: ReadingContext が使えず旧経路へ落ちた回数を _readingCtxStats.rcFallback に
   集計する（将来の警告表示の土台。通常 0 = SSOT 維持）。 */
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App._readingCtxStats = window.App._readingCtxStats || { rcFallback: 0 };
}
function _buildReadingContext(words, idx) {
    try {
        /* Stage D: ReadingContext が唯一の Context Source */
        const RC = window.App?.readingContext;
        if (RC) {
            const c = RC.getContext(words, idx);
            if (c) return c;
        }
        /* fallback（観測可能）: Context Layer 未ロード or getContext null のときのみ
           従来ロジックへ。比較・rollback 用に残置し、使用回数を集計する。 */
        if (window.App?._readingCtxStats) window.App._readingCtxStats.rcFallback++;
        const CB = window.App?.syntax?.ContextBuilder;
        if (!CB || !Array.isArray(words) || !words[idx]) return null;
        const ctx = CB.build(words[idx], words, idx);
        return {
            tokens:    words,
            targetIdx: idx,
            phrases:   Array.isArray(ctx?.phrases) ? ctx.phrases : [],
            hasPassiveVerb: words.some(w =>
                (w.class || '') === 'verb' && (w.voice || '') === 'passive'),
            /* Phase 3-A: 主格の は/が 判定用（純粋データのみ） */
            mainVerb: ctx?.mainVerb ? {
                lemma:  ctx.mainVerb.lemma  || '',
                person: ctx.mainVerb.person || '',
                number: ctx.mainVerb.number || '',
                mood:   ctx.mainVerb.mood   || '',
            } : null,
            clause: ctx?.clause ? {
                start: ctx.clause.start,
                end:   ctx.clause.end,
                subordinate: ctx.clause.subordinate === true,
            } : null,
        };
    } catch (_) {
        return null;
    }
}
/* __READING_CTX_END__ */

/* ══════════════════════════════════════════════════════════════════
   Verse Representation Architecture — Phase VR-2（scaffolding）
   設計正典: docs/development/verse-representation-design.md

   本ブロックは新アーキテクチャ（Verse → Analysis → Representation →
   Renderer）への橋渡しとなる型・関数を追加するのみ。
   ★ 表示は一切変更しない: 以下の関数は現時点でどこからも呼ばれていない
     （render() / _buildFlowTabHTML() / _buildGfVerseBlock() 等の既存
     経路は無変更）。VR-3 以降で段階的に接続する。
   ★ Reading Engine（resolve()）・StudyPanel・HTML/CSS 出力には一切
     手を加えない。すべて既存関数を呼び出すだけの薄いラッパー。
   __VR2_SCAFFOLD_BEGIN__ */

/**
 * ColumnMode — 表示モードを表すタグ付き構造体（docs/.../verse-representation-design.md C-1）。
 * @typedef {{ kind: 'translation', translationId: string }
 *         | { kind: 'wordOrder' }
 *         | { kind: 'syntaxTree' }} ColumnMode
 */

/**
 * VR-4-C Step 1: _transA/_transB（既存 state。URL 互換・rollback のため削除しない）
 * から ColumnMode（VR-1設計書 §C-1）を導出する。
 * 'FLOW' という疑似翻訳IDは wordOrder Representation のトリガーであり、それ以外の
 * 値はそのまま translationId として扱う（現行 TRANSLATIONS.FLOW 混在状態の解釈層）。
 * 既存 state 自体は書き換えない、純粋な変換関数。
 * @param {string} transId - _transA または _transB の現在値
 * @returns {ColumnMode}
 */
function _toColumnMode(transId) {
    if (transId === 'WORD_ORDER')  return { kind: 'wordOrder' };
    if (transId === 'DA_READING') return { kind: 'da-reading' };
    if (transId === 'ROLE_READING') return { kind: 'role-reading' };         /* 語の役割で読む */
    if (transId === 'GREEK_TEXT')  return { kind: 'greek-text' };          /* ギリシャ語で読む */
    /* 2026-10-28 のモード整理で削除した旧モードの ID と、その legacy alias は、
       旧URLを壊さないよう「語順で読む」にフォールバックさせる。 */
    if (transId === 'DISCOURSE' || transId === 'STRUCTURAL' || transId === 'STRUCTURE'
        || transId === 'CLAUSE_ROLE' || transId === 'RELATION' || transId === 'RK_READING'
        || transId === 'RK_READING_V' || transId === 'RK_READING_P'
        || transId === 'HIERARCHICAL' || transId === 'REED_KELLOGG') return { kind: 'wordOrder' };
    /* Legacy aliases — kept for URL backward compatibility (old deep links) */
    if (transId === 'FLOW')         return { kind: 'wordOrder' };          /* legacy → WORD_ORDER */
    return { kind: 'translation', translationId: transId };
}

/**
 * DA-1: Greek由来の「読み方」モード（訳文JSONを持たず、bible_data の Greek token を
 * 表示源とするモード）かどうか。wordOrder（語順フロー）と discourse（談話分析）が該当する。
 * 翻訳fetchのスキップ・elData 由来 VerseSource の選択・MobileVerseView フォールバックなど、
 * 「訳文が無いGreekビュー」共通の判定にのみ使用する（chip描画等 wordOrder 固有の分岐には使わない）。
 * @param {string} kind - ColumnMode.kind
 * @returns {boolean}
 */
function _isGreekReadingMode(kind) {
    return kind === 'wordOrder' || kind === 'da-reading' || kind === 'role-reading' || kind === 'greek-text'; /* 旧モードの kind は 2026-10-28 の整理で削除 */
}

/**
 * 連続章の autoload をブロックするモード判定。
 * wordOrder（WO）は連続章対応のため除外する。
 * discourse / structural-diagram / hierarchical / relation は引き続きブロックする。
 * @param {string} kind - ColumnMode.kind
 * @returns {boolean}
 */
function _isAutoloadBlockedMode(kind) {
    return kind === 'role-reading'; /* 旧モードの kind は 2026-10-28 の整理で削除 */
}

/**
 * Verse — 節の同一性を保証する束（docs/.../verse-representation-design.md B章）。
 * 既存データ構造（words 配列そのもの）は変更せず、そのまま tokens として包むだけ。
 * @typedef {{ verseRef: { book: string, chapter: (number|null), verse: (string|number) },
 *             tokens: Object[] }} Verse
 * @param {string} bookKey
 * @param {number|null} ch
 * @param {string|number} vNum
 * @param {Object[]} words - 既存の elByVerse[vNum] 等（無加工でそのまま保持）
 * @returns {Verse}
 */
function buildVerse(bookKey, ch, vNum, words) {
    return {
        verseRef: { book: bookKey || '', chapter: (ch != null ? ch : null), verse: vNum },
        tokens: Array.isArray(words) ? words : [],
    };
}

/**
 * Verse から AnalysisResult[] を取得する。中身は既存 _getVerseResolved() の呼び出しのみ
 * （Reading Engine・resolve() 自体には一切手を加えない。唯一の SSOT を維持）。
 * @param {Verse} verse
 * @returns {(Object|null)[]|null}
 */
function getAnalysis(verse) {
    try {
        if (!verse || !Array.isArray(verse.tokens)) return null;
        return _getVerseResolved(verse.tokens);
    } catch (_) {
        return null;
    }
}

/**
 * WordOrder Representation の1チップ分の形。中身は既存 _wordToFlowChip() の戻り値と
 * 同一（greek / gloss / roleClass / morphText / phraseBreakBefore / signals を含む）。
 * @typedef {{ greek: string, gloss: string, roleClass: string, morphText: string,
 *             phraseBreakBefore: boolean, signals: Object[] }} FlowChip
 */

/**
 * Representation — Analysis / 翻訳テキストを displayMode 別の構造化データに整える
 * （docs/.../verse-representation-design.md C章）。
 * Phase VR-3B: WordOrder Representation を正式化。{ kind, verseRef, chips[] } の
 * 最小契約とし、Renderer が Reading Engine / _getVerseResolved / words を直接扱わずに
 * 済む形にする（Renderer に渡すのは chips のみ）。
 * ★ WordOrderBuilder（本関数の wordOrder 分岐）は既存 _wordToFlowChip() を呼んで
 *   Analysis 結果を chip 形式へ転写するだけであり、新しい日本語生成は行わない。
 * @param {ColumnMode} columnMode
 * @param {Verse} verse
 * @param {(Object|null)[]|null} analysis - getAnalysis(verse) の結果（wordOrder系のみ使用）
 * @param {string} [translationText] - 対象節の翻訳文字列（translation系のみ使用）
 * @returns {Object|null}
 */
function buildRepresentation(columnMode, verse, analysis, translationText) {
    try {
        if (!columnMode) return null;
        if (columnMode.kind === 'translation') {
            const rep = {
                kind: 'translation',
                verseRef: verse ? verse.verseRef : null,
                translationId: columnMode.translationId,
                text: (translationText != null ? translationText : ''),
            };
            /* 口語訳アラインメント（パイロット）: 対応表がある節だけ segments を付ける。
               無い節・書・翻訳は従来どおり text のみ（表示不変）。 */
            const _vr = rep.verseRef;
            if (_vr && typeof _jaAlignSegmentsFor === 'function') {
                const _segs = _jaAlignSegmentsFor(columnMode.translationId, _vr.book, _vr.chapter, _vr.verse);
                if (_segs) rep.segments = _segs;
            }
            /* 初見10秒対策・案4（本採用 2026-11-07）: 翻訳のセグメントにも、語順で
               読むと同じ動詞の視覚文法（dp 装飾）を出す。判定は既存 SSOT
               buildDepthGrammarClasses() のみを使い、新しい装飾は作らない。
               セグメント内の動詞トークン（seg.tokens → _jaSegToken で解決）のうち、
               最初に dp-(mood|tense|voice) クラスを持つもののクラス一式を、その
               セグメントの表示テキストへ付ける（EN サイドカーの donation と同じ
               「セグメントの見えるテキストが動詞装飾を持つ」考え方）。
               動詞のないセグメント・装飾クラスのない動詞は従来どおり無装飾。
               対象はアラインメント・セグメントを持つ全翻訳（JA1955 / WEB /
               RVR1909）。セグメントのない翻訳・節は従来どおり text のみ。 */
            if (rep.segments
                && typeof _jaSegToken === 'function'
                && typeof buildDepthGrammarClasses === 'function') {
                rep.segments = rep.segments.map(seg => {
                    if (!Array.isArray(seg.tokens) || !seg.tokens.length) return seg;
                    for (const ti of seg.tokens) {
                        const tok = _jaSegToken(_vr.book, _vr.chapter, _vr.verse, ti);
                        if (!tok || !tok.morph) continue;
                        const cls = buildDepthGrammarClasses(tok.morph);
                        if (cls.some(c => /^dp-(mood|tense|voice)-/.test(c))) {
                            return Object.assign({}, seg, { dpClasses: cls.join(' ') });
                        }
                    }
                    return seg;
                });
            }
            return rep;
        }
        if (columnMode.kind === 'wordOrder') {
            const tokens  = verse ? verse.tokens : [];
            const bookKey = (verse && verse.verseRef) ? verse.verseRef.book : '';
            const ch      = (verse && verse.verseRef) ? verse.verseRef.chapter : null;
            /* WordOrderBuilder: 既存 _wordToFlowChip() で Analysis 結果を chip へ
               転写するだけ（_buildFlowTabHTML() が内部で行っていたのと同じ呼び出し。
               resolve() の再計算はしない — analysis は呼び出し元の getAnalysis(verse) の
               結果をそのまま使う）。 */
            const chips = tokens.map((w, i) => _wordToFlowChip(w, i, bookKey, ch,
                analysis ? analysis[i] : undefined, tokens));
            /* Sidecar segment glosses: when consecutive chips share the same sidecar-file
               gloss (one alignment segment's text replicated onto every token), show the
               gloss only on the first chip; continuation chips render an empty gloss
               (class wlv-chip-cont collapses their width) so the row reads as continuous
               translation text, like the per-token Japanese glosses. The chip element and
               its click handling stay intact, so the drawer still opens the exact token
               with the segment meaning. Only applies to sidecar file glosses
               (glossFromSidecar=true), not w.english fallback.
               JA UI: glossFromSidecar is always false → loop is a no-op. */
            /* Segment identity comes from the alignment when available: a
               segment's tokens are not always consecutive (a postpositive
               such as γάρ can sit inside another segment's span — ROM 1:9),
               so adjacency alone re-displays the segment text after the gap.
               Without alignment data, fall back to the adjacency rule.
               Verb decorations (dp classes: mood background, tense underline,
               voice asterisk) belong to the segment's visible text: the first
               verb chip of a segment donates its dp classes to the display
               chip, and continuation chips keep no decorations (an empty
               span would otherwise show a bare asterisk). */
            let _prevSidecarGloss = null;
            const _segShownKeys = new Set();
            /* Groups are tracked per segment (keyed by the alignment segment
               when available), because segments interleave: another segment's
               chip can sit between a segment's head and its verb. */
            const _segGroups = new Map();
            let _adjGroup = null;
            const _applyDonation = (g) => {
                if (g && g.donor && g.head !== g.donor
                    && !/dp-(mood|tense|voice)-/.test(g.head.dpGrammarClasses)) {
                    g.head.dpGrammarClasses = g.donor.dpGrammarClasses;
                }
            };
            chips.forEach((chip, ci) => {
                if (!chip.glossFromSidecar) { _prevSidecarGloss = null; _adjGroup = null; return; }
                const _dpSnapshot = chip.dpGrammarClasses;
                const _isVerbDp = /dp-(mood|tense|voice)-/.test(_dpSnapshot);
                const _segKey = (typeof _alignSegmentKeyFor === 'function')
                    ? _alignSegmentKeyFor(tokens[ci]) : null;
                const _isCont = _segKey
                    ? _segShownKeys.has(_segKey)
                    : (chip.gloss === _prevSidecarGloss);
                if (_isCont) {
                    chip.gloss = '';
                    chip.segmentContinuation = true;
                    chip.glossFromSidecar = false;
                    chip.dpGrammarClasses = 'dp-word';
                    const g = _segKey ? _segGroups.get(_segKey) : _adjGroup;
                    if (g && !g.donor && _isVerbDp) g.donor = { dpGrammarClasses: _dpSnapshot };
                } else {
                    if (_segKey) {
                        _segShownKeys.add(_segKey);
                        _segGroups.set(_segKey, { head: chip, donor: _isVerbDp ? chip : null });
                    } else {
                        _adjGroup = { head: chip, donor: _isVerbDp ? chip : null };
                    }
                    _prevSidecarGloss = chip.gloss;
                }
            });
            _segGroups.forEach(_applyDonation);
            _applyDonation(_adjGroup);
            /* Per-token glosses: bracket placeholders never wear verb
               decorations (see _applyPlaceholderDpDonation). Runs for all
               chips; the helper itself gates on a sidecar UI language. */
            _applyPlaceholderDpDonation(chips, tokens);
            return {
                kind: 'wordOrder',
                verseRef: verse ? verse.verseRef : null,
                chips,
            };
        }
        return null; // 'syntaxTree' 等、未実装の kind は Unresolved by Design
    } catch (_) {
        return null;
    }
}

/**
 * WordOrderRenderer — WordOrder Representation（{ kind, verseRef, chips[] }）専用の Renderer。
 * Phase VR-3B で新設。
 *
 * ★ 責務境界（docs/development/verse-representation-design.md B章）:
 *   - 入力は representation（chips[]）のみ。Reading Engine・_getVerseResolved・
 *     生の words 配列を一切参照しない（chip の生成は WordOrderBuilder =
 *     buildRepresentation() の責務。ここでは転写されたデータを描画するだけ）。
 *   - HTML出力は既存 _buildFlowTabHTML() と完全一致させる（chip 計算部分を除く
 *     後段の HTML 組み立てロジックをそのまま移植したもの。表示は不変）。
 */
const WordOrderRenderer = {
    /**
     * VR-4-C Step 5: 第2引数 options は Representation Contract（VR-3-B Freeze済み、
     * {kind, verseRef, chips[]}）の一部ではない。呼び出し元（本文がFLOW表示中か、
     * オンボーディング未完了か等、グローバル state に依存する判断）が解決済みの
     * 真偽値として渡す薄いコンテキストであり、Renderer 自身は _transA /
     * window.App.onboarding を直接参照しない（旧実装の "修正B" 判定を呼び出し元へ移設）。
     * @param {{showOnboardingAnchor?: boolean}} [options]
     */
    render(representation, options) {
        const chips = (representation && Array.isArray(representation.chips)) ? representation.chips : [];
        const _showOnboardingAnchor = !!(options && options.showOnboardingAnchor);

        /* ── chip HTML（補助として小さく） ── */
        const chipsHTML = chips.map((c, i) => {
            const sepBefore = c.phraseBreakBefore ? `<span class="wlv-phrase-sep"></span>` : '';
            /* 修正B: FLOWモードでは本文chipにアンカーが付くため、Study Panel側は付与しない。
               判定自体は呼び出し元で解決済み（options.showOnboardingAnchor）。 */
            const anchorAttr = (i === 0 && _showOnboardingAnchor)
                ? ' data-onboarding-anchor="true"'
                : '';
            return `${sepBefore}<span class="wlv-chip ${c.roleClass}${c.segmentContinuation ? ' wlv-chip-cont' : ''}"
            data-token-id="${c.tokenId}"
            data-greek="${_escH(c.greek)}"${anchorAttr}
            onclick="_wlvChipClick(this,'${c.tokenId}')"
            title="${_escH(c.greek)}">
            <span class="wlv-chip-ja"><span class="${c.dpGrammarClasses}">${_escH(c.gloss)}</span></span>
        </span>`;
        }).join('');

        /* ── 詳細ドロワー：prosecontinuity design ── */
        const drawerHTML = `
        <div class="wlv-detail-drawer" id="wlv-detail-drawer">
            <button class="wlv-dd-close-btn" onclick="_wlvDrawerClose()" aria-label="${_escH(_T('wlv.closeDetail', '語句詳細を閉じる'))}">×</button>
            <div class="wlv-detail-meaning" id="wlv-dd-meaning"></div>
            <div class="wlv-detail-nametag"><span class="wlv-detail-greek" id="wlv-dd-greek">-</span><span class="wlv-detail-lemma" id="wlv-dd-lemma"></span></div>
            <div class="wlv-detail-glosses" id="wlv-dd-glosses"></div>
            <div class="wlv-detail-resonance" id="wlv-dd-resonance"></div>
            <div class="wlv-detail-actions">
                <button class="wlv-detail-study-btn" id="wlv-dd-study-btn" onclick="_wlvStudyBtnClick()">
                    <span class="wlv-action-icon material-symbols-outlined" aria-hidden="true">search</span>
                    <span class="wlv-action-label">${_escH(_T('wlv.studyWord', '語の意味や用法を調べる'))}</span>
                    <span class="wlv-action-chev material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
                <a class="wlv-detail-study-btn" href="/search?tool=search&layers=lemma%2Cmorph" onclick="return _wlvConcordanceClick(event)">
                    <span class="wlv-action-icon material-symbols-outlined" aria-hidden="true">list</span>
                    <span class="wlv-action-label">${_escH(_T('wlv.viewConcordance', 'ほかの箇所での使われ方を見る'))}</span>
                    <span class="wlv-action-chev material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </a>
            </div>
        </div>`;

        /* ── 節全体の読書メモ（ReadingFormatter駆動・非同期） ──
           空スロットのみここで同期的に確保し、中身は _fillWallacePassageNote() が
           非同期に埋める（データなし・節なしの場合は何も注入しない＝静寂）。 */
        const passageNoteHTML = '<div id="wlv-passage-note-slot"></div>';

        /* オンボーディング完了前は凡例を非表示。
           VR-5-H-12: onboarding state の解決は呼び出し元へ移設し、Renderer は
           representation と options のみを参照する（window.App.onboarding を直接読まない）。
           legend 表示可否は options.showOnboardingLegend（呼び出し元が解決済みの真偽値）。 */
        const legendHTML = (options && options.showOnboardingLegend) ? `<div class="dp-legend">
        <span class="dp-legend-item"><span class="dp-sample dp-mood-imperative">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.mood.imperative', '命令法'))}</span></span>
        <span class="dp-legend-item"><span class="dp-sample dp-mood-indicative">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.mood.indicative', '直説法'))}</span></span>
        <span class="dp-legend-item"><span class="dp-sample dp-tense-present">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.tense.present', '現在'))}</span></span>
        <span class="dp-legend-item"><span class="dp-sample dp-tense-aorist">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.tense.aorist', 'アオリスト'))}</span></span>
        <span class="dp-legend-item"><span class="dp-sample dp-tense-perfect">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.tense.perfect', '完了'))}</span></span>
        <span class="dp-legend-item"><span class="dp-sample dp-voice-middle">${_escH(_T('morph.legend.sample', '語'))}</span><span class="dp-legend-label">${_escH(_T('morph.voice.middlePassive', '中動/受動'))}</span></span>
    </div>` : '';

        return `
        ${passageNoteHTML}
        <div class="wlv-flow-section-compact">
            <span class="wlv-flow-label-compact">${_escH(_T('wlv.originalOrder', '原語の順序'))}</span>
            <span class="wlv-flow-caption">${_escH(_T('wlv.tapHint', '気になる語をタップすると、その語の意味と働きが見られます'))}</span>
            <div class="wlv-flow-stream" id="wlv-flow-stream">
                ${chipsHTML}
            </div>
            ${drawerHTML}
        </div>
        ${legendHTML}`;
    },

    /* VR-5-H-13-C: wordOrder chip 群の HTML 生成（唯一の chip primitive）。
       renderBodyColumn / renderGreekFlowView が共有する。wrapper（jp-section / bare div /
       v-num / wlv-flow-stream / gf-verse-block）は surface renderer 側の責務であり、ここには持たない。
       入力は chips[] と options のみ（representation.verseRef・CSS・Flow 契約を参照しない）。
       options:
         - stopPropagation: chip onclick 先頭に event.stopPropagation(); を付すか（Body=true / Flow=false）
         - showOnboardingAnchor: 先頭chip(index=0)に data-onboarding-anchor / data-greek を付すか
           （Body のみ true 可 / Flow=false 固定） */
    _wlvChipsHTML(chips, options) {
        const list = (chips && Array.isArray(chips)) ? chips : [];
        const _stop   = !!(options && options.stopPropagation);
        const _anchor = !!(options && options.showOnboardingAnchor);
        const _clickPrefix = _stop ? 'event.stopPropagation();' : '';
        return list.map((c, i) => {
            const sep = c.phraseBreakBefore ? `<span class="wlv-phrase-sep"></span>` : '';
            const anchorAttr = (_anchor && i === 0)
                ? ' data-onboarding-anchor="true" data-greek="' + _escH(c.greek) + '"'
                : '';
            /* テキスト項目（greek / gloss）はデータ由来のため、HTMLとして流さず
               エスケープしてから埋める（Phase 1b のグロス・サイドカー流入に備えた
               関門台帳 L1 の解消）。tokenId は DA 経路と同方針で正規化する／クラス名はコード生成の固定値。 */
            const tid = isFinite(Number(c.tokenId)) ? String(Number(c.tokenId)) : '';
            return `${sep}<span class="wlv-chip ${c.roleClass}${c.segmentContinuation ? ' wlv-chip-cont' : ''}" data-token-id="${tid}"${anchorAttr} onclick="${_clickPrefix}_wlvChipClick(this,'${tid}')" title="${_escH(c.greek)}"><span class="wlv-chip-ja"><span class="${c.dpGrammarClasses}">${_escH(c.gloss)}</span></span></span>`;
        }).join('');
    },

    /**
     * 本文左列（render() の語順フロー表示）用の HTML を生成する。
     * Phase VR-4A で新設。入力は representation.chips / representation.verseRef のみ
     * （Reading Engine・_getVerseResolved・生 words を参照しない）。
     * HTML出力は旧実装（render() 内に直書きされていたロジック）と完全一致させる。
     */
    renderBodyColumn(representation, options) {
        const chips = (representation && Array.isArray(representation.chips)) ? representation.chips : [];
        const vRef  = (representation && representation.verseRef) || {};
        const vNum  = vRef.verse;
        /* VR-5-H-12-D: anchor 付与可否は呼び出し元が options で解決（renderer は verse を判定しない）。
           VR-5-H-13-C: chip 生成は共有 primitive _wlvChipsHTML() へ委譲。本 method は wrapper
           （jp-section / jp-text / wlv-flow-stream / v-num）のみを責務として持つ。 */
        const chipsHTML = this._wlvChipsHTML(chips, {
            stopPropagation: true,
            showOnboardingAnchor: !!(options && options.showOnboardingAnchor),
        });
        return `<div class="jp-section"><span class="v-num">${vNum}</span><div class="jp-text" style="font-size: var(--text-body-lg);line-height:2.4;"><div class="wlv-flow-stream" style="flex-wrap:wrap;display:flex;gap:var(--rhythm-micro);align-items:baseline;">${chipsHTML}</div></div></div>`;
    },

    /**
     * Greek Flow View（_buildGfVerseBlock）用の HTML を生成する。
     * Phase VR-4A で新設。入力は representation.chips / representation.verseRef のみ。
     * HTML出力は旧実装と完全一致させる。
     */
    renderGreekFlowView(representation) {
        const chips = (representation && Array.isArray(representation.chips)) ? representation.chips : [];
        const vNum  = (representation && representation.verseRef) ? representation.verseRef.verse : undefined;
        /* VR-5-H-13-C: chip 生成は共有 primitive _wlvChipsHTML() へ委譲。
           Flow は stopPropagation=false（親ブロックに onclick 無し）・anchor=false 固定
           （本文専用アンカー対象外）。本 method は bare wrapper（v-num 含む）のみを責務として持つ。 */
        const chipsHTML = this._wlvChipsHTML(chips, { stopPropagation: false, showOnboardingAnchor: false });
        return `
    <div style="display:flex;align-items:baseline;gap: var(--space-sm);padding: var(--space-xs) 0;">
        <span class="v-num">${vNum}</span>
        <div style="flex:1;font-size: var(--text-body);line-height:2.4;display:flex;flex-wrap:wrap;gap: var(--space-xs) var(--space-xs);align-items:baseline;">${chipsHTML}</div>
    </div>`;
    },
};

/**
 * GreekTextRenderer — ギリシャ語本文（{ kind:'wordOrder' } Representation の chips[]）専用の Renderer。
 *
 * ★ 責務境界: 表現は語順モードと完全に同一（buildRepresentation({kind:'wordOrder'}) の
 *   chips[]）。ここでは見える値を gloss ではなく greek に替えて、bible_data の
 *   after（句読点）とともに連続した本文として流すだけ。句読点は語要素の外に
 *   テキストとして置く（ハイライト・装飾が句読点に掛からない。訳文セグメントの
 *   案4と同じ扱い）。語要素は .wlv-chip の契約（data-token-id + _wlvChipClick）を
 *   そのまま使うため、peek / StudyPanel / ハイライトは無改造で効く。
 *   chips と tokens は buildRepresentation の map により 1:1 同順。
 * @param {Object} representation - wordOrder Representation
 * @param {Object[]} words - 節の生トークン（after の取得専用）
 */
const GreekTextRenderer = {
    renderBodyColumn(representation, words) {
        const chips = (representation && Array.isArray(representation.chips)) ? representation.chips : [];
        const vNum  = (representation && representation.verseRef) ? representation.verseRef.verse : '';
        const tokens = Array.isArray(words) ? words : [];
        const inner = chips.map((c, i) => {
            const tid = isFinite(Number(c.tokenId)) ? String(Number(c.tokenId)) : '';
            const punct = (tokens[i] && tokens[i].after) || '';
            return `<span class="wlv-chip gk-word" data-token-id="${tid}" onclick="event.stopPropagation();_wlvChipClick(this,'${tid}')">${_escH(c.greek)}</span>${_escH(punct)}`;
        }).join(' ');
        return `<div class="jp-section"><span class="v-num">${vNum}</span><div class="jp-text gk-text">${inner}</div></div>`;
    },
};

/**
 * TranslationRenderer — Translation Representation（{ kind, verseRef, translationId, text }）
 * 専用の Renderer。Phase TR-1 で新設。
 *
 * ★ 責務境界（docs/development/verse-representation-design.md B章）:
 *   - 入力は representation（text）のみ。翻訳データの fetch・Reading Engine・
 *     WordOrder 側の chips/analysis を一切参照しない。
 *   - HTML出力は既存 render() 左列の実装と完全一致させる（テンプレートをそのまま移植したもの。
 *     表示は不変。translationText 自体は既存の人手翻訳文字列をそのまま転写するだけで、
 *     新しい生成・推論は行わない）。
 */
const TranslationRenderer = {
    render(representation) {
        const vNum = (representation && representation.verseRef) ? representation.verseRef.verse : '';
        const text = (representation && representation.text != null) ? representation.text : '';
        const segs = (representation && Array.isArray(representation.segments)) ? representation.segments : null;
        const vr = (representation && representation.verseRef) ? representation.verseRef : null;
        /* 訳文は常にテキストとして扱う（HTMLとして流さない）。セグメント経路・
           フォールバック経路のどちらでも esc を通す。 */
        const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        if (segs && vr) {
            /* 対応づいた区間だけをタップ可能な span にする。対応なし区間は素のテキスト
               （＝従来表示と同一の見た目）。全区間の連結は訳文原文と一致する（データ側で検証済み）。 */
            const inner = segs.map(seg => {
                const t = esc(seg.t != null ? seg.t : '');
                if (Array.isArray(seg.tokens) && seg.tokens.length) {
                    /* 試作（案4）: 動詞セグメントは語順チップと同じ構造で、内側 span に
                       dp クラスを載せる（クラスは buildDepthGrammarClasses 由来の
                       固定文字列のみ許可）。クリック／ハイライトは外側 .ja-seg が担い従来どおり。
                       句読点は装飾の外: セグメント文字列の先頭・末尾にある句読点
                       （、。！？括弧類・ダッシュ・空白）は dp span の外に出す
                       （語順チップのグロスには句読点が含まれないため。タップ範囲・
                       ハイライト範囲・本文テキストは不変で、装飾の掛かる範囲だけが
                       狭まる）。核が空になる場合は全体を装飾する（従来動作）。 */
                    const dp = (typeof seg.dpClasses === 'string'
                        && /^dp-word( dp-(mood|tense|voice)-[a-z]+)*$/.test(seg.dpClasses))
                        ? seg.dpClasses : '';
                    let body = t;
                    if (dp) {
                        const raw = seg.t != null ? String(seg.t) : '';
                        /* 句読点セットは日本語（、。！？括弧類）に加え、英・西語の
                           約物（,.!?;:"'«»¿¡）も対象にする。全翻訳共通の扱い。 */
                        const m = raw.match(/^([「『（〔【〈《“‘(\[{¿¡«\s]*)([\s\S]*?)([、。，．！？：；」』）〕】〉》”’)\]}.,!?;:"'»\s―—…]*)$/);
                        body = (m && m[2])
                            ? esc(m[1]) + `<span class="${dp}">${esc(m[2])}</span>` + esc(m[3])
                            : `<span class="${dp}">${t}</span>`;
                    }
                    return `<span class="ja-seg" data-ja-book="${vr.book}" data-ja-ch="${vr.chapter}" data-ja-v="${vr.verse}" data-ja-tokens="${seg.tokens.join(',')}" onclick="_jaSegClick(this,event)">${body}</span>`;
                }
                return t;
            }).join('');
            return `<div class="jp-section"><span class="v-num">${vNum}</span><div class="jp-text">${inner}</div></div>`;
        }
        return `<div class="jp-section"><span class="v-num">${vNum}</span><div class="jp-text">${esc(text)}</div></div>`;
    },
};
