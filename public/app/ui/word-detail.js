/**
 * Flow タブ用 AI 補助（廃止：ローカルsignalのみ使用）
 */
async function _fetchFlowAI(area, p, jaWord) {
    /* no-op */
}

/**
 * Meaning タブ：「この語が今この文脈でどう響くか」を読書補助として表示。
 * Abbott-Smith は Study → Semantics へ移動済み。
 * ここは辞書ではなく、tone / relational force / contextual nuance の層。
 */
function _renderMeaningTab(area, p) {
    const word   = p.word   || '-';
    const jaWord = (_inspectData && _inspectData.jaWord) || '-';
    const ref    = p.ref    || '';

    /* ローカルルールベースの Meaning signals */
    const meaningSignals = _buildMeaningSignals(p);
    const signalHTML = meaningSignals.length
        ? `<div class="flow-signal-text reading-prose">${meaningSignals.map(s => s.text).join('<br>')}</div>`
        : `<div class="flow-signal-text" style="color:var(--text-sub);">${_T('flow.meaningFallback', '原語の詳細は「原語を見る」から確認できます。')}</div>`;

    area.innerHTML = `
        <div class="flow-word-head">
            <span class="flow-greek greek-headword">${_escH(word)}</span><span class="flow-ja">　${_escH(jaWord)}</span>
        </div>
        ${ref ? `<div class="flow-ref">${_escH(ref)}</div>` : ''}
        <div class="flow-hints reading-block">
            ${signalHTML}
        </div>
    `;
}

/**
 * Meaning タブ用ローカルシグナル生成。
 * AIなし。形態論データからルールベースでシグナルを導出する。
 */
function _buildMeaningSignals(p) {
    const signals = [];
    const pos   = p.pos   || '';
    const mood  = p.mood  || '';
    const tense = p.tense || '';
    const voice = p.voice || '';
    const word  = p.word  || '';

    if (pos === 'V') {
        if (mood === 'imperative') {
            signals.push({ cls: 'sig-exhort', kindLabel: '行為', text: '命令形。説明ではなく、行動への直接の呼びかけとして機能しています。' });
        }
        if (mood === 'subjunctive') {
            signals.push({ cls: 'sig-logic', kindLabel: '態度', text: '接続法。断定ではなく、目的・願望・可能性の含みをもちます。' });
        }
        if (mood === 'participle') {
            signals.push({ cls: 'sig-logic', kindLabel: '修飾', text: '分詞。主動詞の状況・背景・手段として機能しています。' });
        }
        if (tense === 'perfect') {
            signals.push({ cls: 'sig-promise', kindLabel: '状態', text: '完了形。過去の出来事の結果が現在も有効であることを示します。' });
        }
        if (tense === 'aorist' && mood === 'indicative') {
            signals.push({ cls: 'sig-declare', kindLabel: '宣言', text: 'アオリスト直説法。完結した出来事の事実提示。宣言的な重みがあります。' });
        }
        if (tense === 'future') {
            signals.push({ cls: 'sig-promise', kindLabel: '約束', text: '未来形。確かな約束・確約として機能することがあります。' });
        }
        if (voice === 'passive') {
            signals.push({ cls: 'sig-word', kindLabel: '態', text: '受動態。神学的文脈では「神による行為」を暗示することがあります。' });
        }
        if (voice === 'middle' || voice === 'middle deponent') {
            signals.push({ cls: 'sig-word', kindLabel: '態', text: '中動態。主語が動作に深く関与しています。' });
        }
    }

    if (pos === 'CONJ') {
        const CONJ_MEANING = {
            'γάρ':  { cls: 'sig-logic',    kindLabel: '論理', text: '理由の接続詞。前の主張への根拠として読みます。' },
            'ἀλλά': { cls: 'sig-turn',     kindLabel: '転換', text: '強い対比・転換。ここで話の方向が変わります。' },
            'οὖν':  { cls: 'sig-logic',    kindLabel: '帰結', text: '論理的帰結。前節の議論をここで集約しています。' },
            'δέ':   { cls: 'sig-turn',     kindLabel: '展開', text: '微妙な転換・進展のサイン。' },
            'καί':  { cls: 'sig-emphasis', kindLabel: '付加', text: '並列・強調。内容が積み重なっています。' },
            'ἵνα':  { cls: 'sig-logic',    kindLabel: '目的', text: '目的節。著者の意図がこの語の後に示されます。' },
            'ὅτι':  { cls: 'sig-logic',    kindLabel: '内容', text: '内容・理由節。主張の根拠か内容補足になります。' },
        };
        const cs = CONJ_MEANING[word];
        if (cs) signals.push(cs);
        else signals.push({ cls: 'sig-logic', kindLabel: '接続', text: '接続詞。前後の節をつなぎ、議論の流れを形作っています。' });
    }

    if (signals.length === 0) {
        signals.push({ cls: 'sig-default', kindLabel: '補足', text: 'この語の特記すべき語用論的特徴はありません。' });
    }

    return signals;
}

/**
 * Meaning タブ用 AI 補助（廃止：ローカルsignalのみ使用）
 */
async function _fetchMeaningAI(area, p, jaWord, desc) {
    /* no-op */
}




/**
 * Syntax セクション用 AI 補助（廃止：ローカルルールベースのみ使用）
 */
async function _fetchSyntaxAI(p, jaWord) {
    /* no-op */
}

function updateReadingCoreBar(p) {
    /* 新しい実装では openStudyPanel 内で直接処理するため no-op */
}

function _getCurrentVerseRef() {
    return {
        book:    AppState.location.book    ? AppState.location.book.key : null,
        chapter: AppState.location.chapter || null,
        verse:   AppState.selectedVerse.vNum || 1
    };
}

/* ══════════════════════════════════════════
   buildDepthGrammarClasses
   Depth Panel 限定の文法装飾クラスを合成して返す。
   原文文字列は一切変更しない。
   ══════════════════════════════════════════ */
function buildDepthGrammarClasses(rawMorph) {
    const classes = ['dp-word'];
    if (!rawMorph) return classes;

    const parts = rawMorph.split('-');
    const pos   = parts[0] || '';

    if (pos === 'V' && parts[1]) {
        const off      = /^[0-9]/.test(parts[1]) ? 1 : 0;
        const tenCode  = parts[1][off]     || '';
        const voiCode  = parts[1][off + 1] || '';
        const moodCode = parts[1][off + 2] || '';

        /* 法 */
        if (moodCode === 'M') classes.push('dp-mood-imperative');
        else if (moodCode === 'I') classes.push('dp-mood-indicative');

        /* 時制 */
        if (tenCode === 'P')      classes.push('dp-tense-present');
        else if (tenCode === 'A') classes.push('dp-tense-aorist');
        else if (tenCode === 'X') classes.push('dp-tense-perfect');

        /* 態 */
        if (voiCode === 'M' || voiCode === 'D') classes.push('dp-voice-middle');
        else if (voiCode === 'P')               classes.push('dp-voice-passive');
    }

    return classes;
}

function parseMorphForSearch(rawMorph) {
    const parts = rawMorph.split('-');
    const pos = parts[0];
    const result = { pos };

    if (pos === 'V' && parts[1]) {
        const off = /^[0-9]/.test(parts[1]) ? 1 : 0;
        const tenseCode = parts[1][off + 0];
        const voiceCode = parts[1][off + 1];
        const moodCode  = parts[1][off + 2];

        const TENSE_MAP = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect' };
        const VOICE_MAP = { A:'active', M:'middle', P:'passive', D:'middle deponent' };
        const MOOD_MAP  = { I:'indicative', S:'subjunctive', O:'optative',
                            M:'imperative', N:'infinitive', P:'participle' };

        if (tenseCode) result.tense = TENSE_MAP[tenseCode] || '';
        if (voiceCode) result.voice = VOICE_MAP[voiceCode] || '';
        if (moodCode)  result.mood  = MOOD_MAP[moodCode]   || '';

        if (moodCode === 'P' && parts[2]) {
            const CASE_MAP   = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
            const NUMBER_MAP = { S:'singular', P:'plural' };
            const GENDER_MAP = { M:'masculine', F:'feminine', N:'neuter' };
            result.case   = CASE_MAP[parts[2][0]]   || '';
            result.number = NUMBER_MAP[parts[2][1]] || '';
            result.gender = GENDER_MAP[parts[2][2]] || '';
        } else if (parts[2]) {
            const PERSON_MAP = { '1':'1', '2':'2', '3':'3' };
            const NUMBER_MAP = { S:'singular', P:'plural' };
            result.person = PERSON_MAP[parts[2][0]] || '';
            result.number = NUMBER_MAP[parts[2][1]] || '';
        }
    } else if (['N','A','R','P','T','D'].includes(pos) && parts[1]) {
        const CASE_MAP   = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
        const NUMBER_MAP = { S:'singular', P:'plural' };
        const GENDER_MAP = { M:'masculine', F:'feminine', N:'neuter' };
        const base = ['1','2','3'].includes(parts[1][0]) ? parts[1].slice(1) : parts[1];
        result.case   = CASE_MAP[base[0]]   || '';
        result.number = NUMBER_MAP[base[1]] || '';
        result.gender = GENDER_MAP[base[2]] || '';
    }
    return result;
}

/**
 * Generate morphology-only alternative parses for genuine Type-A homographs.
 * Corpus annotation is never modified; alternatives are a secondary display layer.
 *
 * @param {string} rawMorph  e.g. "V-PAI-2P"
 * @param {string} surface   surface form from bible_data  e.g. "ἔχετε"
 * @returns {{ alternatives: MorphCandidate[] }}
 */
function getMorphCandidates(rawMorph, surface) {
    const T_MAP   = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect', L:'pluperfect' };
    const V_MAP   = { A:'active', M:'middle', P:'passive', D:'middle deponent', N:'middle or passive' };
    const M_MAP   = { I:'indicative', S:'subjunctive', O:'optative',
                      M:'imperative', N:'infinitive',  P:'participle' };
    const C_MAP   = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
    const NUM_MAP = { S:'singular', P:'plural' };

    function mkC(morph, tCode, vCode, mCode, pnCode, kind) {
        const tense = T_MAP[tCode] || '';
        const voice = V_MAP[vCode] || '';
        const mood  = M_MAP[mCode] || '';
        let person = '', number = '', cas = '', gender = '';
        if (mCode === 'P' && pnCode && pnCode.length >= 3) {
            cas    = C_MAP[pnCode[0]]   || '';
            number = NUM_MAP[pnCode[1]] || '';
            gender = pnCode[2] === 'M' ? 'masculine'
                   : pnCode[2] === 'F' ? 'feminine'
                   : pnCode[2] === 'N' ? 'neuter' : '';
        } else if (pnCode && pnCode.length >= 2) {
            person = pnCode[0];
            number = NUM_MAP[pnCode[1]] || '';
        }
        return { morph, tense, voice, mood, person, number, case: cas, gender, kind };
    }

    try {
        if (typeof rawMorph !== 'string' || !rawMorph.startsWith('V-')) {
            return { alternatives: [] };
        }
        const parts = rawMorph.split('-');
        if (parts.length < 2 || !parts[1]) return { alternatives: [] };

        const seg0      = parts[1];
        const hasPrefix = /^[0-9]/.test(seg0);
        const prefix    = hasPrefix ? seg0[0] : '';
        const seg       = hasPrefix ? seg0.slice(1) : seg0;
        if (seg.length < 3) return { alternatives: [] };

        const T  = seg[0], V = seg[1], M = seg[2];
        const PN = parts[2] || '';
        const sf = typeof surface === 'string' ? surface : '';
        const alts = [];

        // Class A — Present Indicative-2P ↔ Present Imperative-2P (any present-tense voice)
        // Restricted to T='P': imperfect/future have no imperative; aorist augment prevents surface identity.
        if (T === 'P' && PN === '2P') {
            if      (M === 'I') alts.push(mkC(`V-${T}${V}M-2P`, T, V, 'M', '2P', 'HOMOGRAPH_MOOD'));
            else if (M === 'M') alts.push(mkC(`V-${T}${V}I-2P`, T, V, 'I', '2P', 'HOMOGRAPH_MOOD'));
        }

        // Class B — PAI-1S ↔ PAS-1S (ω-verb: surface ends in ω or ῶ)
        // ῶ (U+1FF6) covers contracted ε-verbs (ποιέω → ποιῶ, λαλέω → λαλῶ, etc.)
        if (!prefix && T === 'P' && V === 'A' && PN === '1S' && (sf.endsWith('ω') || sf.endsWith('ῶ'))) {
            if      (M === 'I') alts.push(mkC('V-PAS-1S', 'P', 'A', 'S', '1S', 'HOMOGRAPH_MOOD'));
            else if (M === 'S') alts.push(mkC('V-PAI-1S', 'P', 'A', 'I', '1S', 'HOMOGRAPH_MOOD'));
        }

        // Class C — FAI-1S ↔ AAS-1S (σω: sigma-aorist; ψω: labial+σ; ξω: velar+σ)
        if (!prefix && V === 'A' && PN === '1S' && (sf.endsWith('σω') || sf.endsWith('ψω') || sf.endsWith('ξω'))) {
            if      (T === 'F' && M === 'I') alts.push(mkC('V-AAS-1S', 'A', 'A', 'S', '1S', 'HOMOGRAPH_TENSE_MOOD'));
            else if (T === 'A' && M === 'S') alts.push(mkC('V-FAI-1S', 'F', 'A', 'I', '1S', 'HOMOGRAPH_TENSE_MOOD'));
        }

        // Class D — PAI-3P ↔ PAP-DPM / PAP-DPN (-ουσιν / -ουσι and contracted forms)
        // NT corpus confirms DPN annotation for same surface (λέγουσιν → V-PAP-DPN).
        // οῦσιν (U+03BF+U+1FE6+σιν): ε-contract (αἰτέω → αἰτοῦσιν, ζητέω → ζητοῦσιν)
        // ῶσιν (U+1FF6+σιν): α-contract (ἀγαπάω → ἀγαπῶσιν)
        if (!prefix && T === 'P' && V === 'A') {
            const endsOusin = sf.endsWith('ουσιν') || sf.endsWith('ουσι')
                           || sf.endsWith('οῦσιν') || sf.endsWith('οῦσι')
                           || sf.endsWith('ῶσιν')  || sf.endsWith('ῶσι');
            if (M === 'I' && PN === '3P' && endsOusin) {
                alts.push(mkC('V-PAP-DPM', 'P', 'A', 'P', 'DPM', 'HOMOGRAPH_MOOD'));
                alts.push(mkC('V-PAP-DPN', 'P', 'A', 'P', 'DPN', 'HOMOGRAPH_MOOD'));
            } else if (M === 'P' && (PN === 'DPM' || PN === 'DPN') && endsOusin) {
                alts.push(mkC('V-PAI-3P', 'P', 'A', 'I', '3P', 'HOMOGRAPH_MOOD'));
            }
        }

        // Class E — IAI-1S ↔ IAI-3P (imperfect active indicative)
        // 3P→1S is blocked when surface ends in -αν (U+03B1+U+03BD): these are 3P-only suffixes
        // (-σαν: εἰμί ἦσαν, μι-verbs ἐδίδοσαν; bare -αν is never shared with 1S in NT corpus).
        if (!prefix && T === 'I' && V === 'A' && M === 'I') {
            if      (PN === '1S') alts.push(mkC('V-IAI-3P', 'I', 'A', 'I', '3P', 'HOMOGRAPH_PERSON'));
            else if (PN === '3P' && !sf.endsWith('αν')) alts.push(mkC('V-IAI-1S', 'I', 'A', 'I', '1S', 'HOMOGRAPH_PERSON'));
        }

        // Class F — 2AAI-1S ↔ 2AAI-3P (2nd-aorist active indicative)
        // Only generate when surface ends in -ον (U+03BF+U+03BD) or -όν (U+03CC+U+03BD).
        // -όν covers enclitic-shifted accent forms (εἶπόν, εἶδόν).
        // Forms ending in -αν/-σαν/-ησαν (3P-only) or -α/-ην/-ών (1S-only) are excluded.
        if (prefix === '2' && T === 'A' && V === 'A' && M === 'I') {
            const endsON = sf.endsWith('ον') || sf.endsWith('όν');
            if (PN === '1S' && endsON) alts.push(mkC('V-2AAI-3P', 'A', 'A', 'I', '3P', 'HOMOGRAPH_PERSON'));
            if (PN === '3P' && endsON) alts.push(mkC('V-2AAI-1S', 'A', 'A', 'I', '1S', 'HOMOGRAPH_PERSON'));
        }

        return { alternatives: alts };
    } catch (_) {
        return { alternatives: [] };
    }
}

function buildMorphTagsHTML(rawMorph) {
    const m = parseMorphForSearch(rawMorph);
    const JPN = _morphFull();

    const tags = [];
    const addTag = (value, label, core = false) => {
        if (value) tags.push({ label, core });
    };
    addTag(m.pos, JPN.pos[m.pos] || m.pos, true);

    if (m.pos === 'V' && m.mood === 'participle') {
        /* 分詞：品詞 → 法（分詞）→ 態 → 時称 → 性 → 数 → 格 */
        addTag(m.mood, JPN.mood[m.mood] || m.mood, true);
        addTag(m.voice, JPN.voice[m.voice] || m.voice);
        addTag(m.tense, JPN.tense[m.tense] || m.tense, true);
        addTag(m.gender, JPN.gender[m.gender] || m.gender);
        addTag(m.number, JPN.number[m.number] || m.number);
        addTag(m.case, JPN.case[m.case] || m.case);
    } else if (m.pos === 'V') {
        /* 動詞：品詞 → 法 → 態 → 時称 → 人称 → 数 */
        addTag(m.mood, JPN.mood[m.mood] || m.mood, true);
        addTag(m.voice, JPN.voice[m.voice] || m.voice);
        addTag(m.tense, JPN.tense[m.tense] || m.tense, true);
        addTag(m.person, m.person ? _personText(m.person) : '');
        addTag(m.number, JPN.number[m.number] || m.number);
    } else if (['N','A','R','P','T','D'].includes(m.pos)) {
        /* 名詞・名詞系：品詞 → 性 → 数 → 格 */
        addTag(m.gender, JPN.gender[m.gender] || m.gender);
        addTag(m.number, JPN.number[m.number] || m.number);
        addTag(m.case, JPN.case[m.case] || m.case);
    } else {
        /* その他の品詞は取得できる情報を標準順で表示 */
        addTag(m.mood, JPN.mood[m.mood] || m.mood, true);
        addTag(m.voice, JPN.voice[m.voice] || m.voice);
        addTag(m.tense, JPN.tense[m.tense] || m.tense, true);
        addTag(m.person, m.person ? _personText(m.person) : '');
        addTag(m.number, JPN.number[m.number] || m.number);
        addTag(m.gender, JPN.gender[m.gender] || m.gender);
        addTag(m.case, JPN.case[m.case] || m.case);
    }

    if (tags.length === 0) return '';
    return `<div class="morph-tag-row">
        ${tags.map(t => `<span class="morph-tag-pill${t.core ? ' core' : ''}">${t.label}</span>`).join('')}
    </div>`;
}

/**
 * showDetail: iframe等からの呼び出し用フォールバック（後方互換）。
 */
function showDetail(greek, strong, jpMorph, rawMorph, lemma, jaWord, desc, ref) {
    AppState.inspect.data = { greek, strong: normalizeStrong(strong), jpMorph, rawMorph, lemma, jaWord, desc, ref };
    if (ref && rawMorph) {
        openStudyPanel(greek, rawMorph, ref, lemma);
    }
}

function closeDetail() {
    // 廃止済み（互換のため残す）
}

function goMorphSearch(greek, rawMorph, ref, lemma) {
    openStudyPanel(greek, rawMorph, ref, lemma);
}

/* メッセージ受信: 聖書本文への移動と既存の意味タブ連携のみ保持 */
window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.type) return;
    if (d.type === 'NAV_TO_SEMANTICS') switchAnalysisTab('semantics');
    if (d.type === 'GO_TO_VERSE' && d.bookKey && d.chapter != null) {
        if (e.origin !== location.origin) return;
        _navTo(d.bookKey, d.chapter);
    }
});

/** apparatus-ja の tag 値 → 日本語話者向け表示ラベルのマッピング。
 *  データ側の tag 値は変更しない。表示層でのみ変換する。 */
const _APPARATUS_TAG_LABELS_EN = {
    '語順差':   'The word order differs',
    '添加':     'One text includes words the other does not',
    '省略':     'One text omits words found in the other',
    '読み差':   'Different wording is used',
    '形態差':   'The word form differs',
    '表記差':   'The spelling differs',
    '節構造差': 'The sentence is structured differently',
    '語彙差':   'A different word is used',
};

const _APPARATUS_TAG_LABELS_ES = {
    '語順差':   'El orden de las palabras difiere',
    '添加':     'Un texto incluye palabras que el otro no tiene',
    '省略':     'Un texto omite palabras que el otro tiene',
    '読み差':   'Se usa una redacción diferente',
    '形態差':   'La forma de la palabra difiere',
    '表記差':   'La ortografía difiere',
    '節構造差': 'La oración está estructurada de otra manera',
    '語彙差':   'Se usa una palabra diferente',
};

const _APPARATUS_TAG_LABELS = {
    '語順差':   '語句の並び順が異なります',
    '添加':     '一方の本文には語句が加わっています',
    '省略':     '一方の本文では語句が省かれています',
    '読み差':   '使用されている語句が異なります',
    '形態差':   '語形が異なります',
    '表記差':   'つづり・表記が異なります',
    '節構造差': '文の組み立て方が異なります',
    '語彙差':   '異なる語が使われています',
};

/** apparatus entries を <div class="mvv-apparatus-entries"> に変換する。
 *  jaEntries は UI 言語の注記 entries（JA: _loadApparatusJaAllData()、
 *  EN: _loadApparatusEnAllData()。テキストフィールドは JA が ja、EN が en）。
 *  lemJaEntries は同言語の lem entries（省略可）。
 *  rdgJaEntries は同言語の rdg entries（省略可）。
 *  status='確認済み' → mvv-app-anno、status='自動生成' → mvv-app-anno mvv-app-anno--auto で表示。
 *  status='保留' および未知のステータスは表示しない（静寂優先）。 */
function _buildApparatusHTML(entries, jaEntries, lemJaEntries, rdgJaEntries) {
    if (!entries || !entries.length) return '';
    const parts = entries.map(e => {
        const lemJa = lemJaEntries && lemJaEntries[e.id];
        const lemHtml = lemJa
            ? `<div class="mvv-app-lem">${_escH(lemJa)}<span class="mvv-app-lem-gr">（${_escH(e.lemText)}）</span></div>`
            : `<div class="mvv-app-lem">${_escH(e.lemText)}</div>`;
        const ja = jaEntries && jaEntries[e.id];
        // 注記テキストは言語でフィールドが異なる（JA: ja、EN: en）。渡された
        // entries は呼び出し側が UI 言語で選んだものなので、ある方を使う。
        const noteText = ja && (ja.ja || ja.en || ja.es);
        const isConfirmed = ja && ja.status === '確認済み' && ja.tag && noteText;
        const isAuto      = ja && ja.status === '自動生成' && ja.tag && noteText;
        const tagLabel = (tag) => _escH(((window.I18N && I18N.contentLang === 'en') ? (_APPARATUS_TAG_LABELS_EN[tag] || tag) : (window.I18N && I18N.lang === 'es') ? (_APPARATUS_TAG_LABELS_ES[tag] || tag) : (_APPARATUS_TAG_LABELS[tag] || tag)));
        const showJaText = (isConfirmed || isAuto) && noteText !== 'περὶ（WH Treg NIV）・ὑπὲρ（RP）' && noteText !== 'for (περὶ) (WH Treg NIV) · for (ὑπὲρ) (RP)' && noteText !== 'acerca de (περὶ) (WH Treg NIV) · por (ὑπὲρ) (RP)' && !(e.readings.length >= 2 && (noteText.startsWith('語順: ') || noteText.startsWith('Word order: ') || noteText.startsWith('Orden de palabras: ')));
        const jaSpan = showJaText ? `<span class="mvv-app-ja">${_escH(noteText)}</span>` : '';
        const annoHtml = isConfirmed
            ? `<div class="mvv-app-anno"><span class="mvv-app-tag">${tagLabel(ja.tag)}</span>${jaSpan}</div>`
            : isAuto
            ? `<div class="mvv-app-anno mvv-app-anno--auto"><span class="mvv-app-tag">${tagLabel(ja.tag)}</span>${jaSpan}</div>`
            : '';
        const _rdgNums = ['①', '②', '③', '④'];
        const entryRdgJa = rdgJaEntries && rdgJaEntries[e.id];
        const rdgHtml = e.readings.map((r, idx) => {
            const numHtml = e.readings.length >= 2
                ? `<span class="mvv-app-rdg-num">${_rdgNums[idx] || (idx + 1)}</span>`
                : '';
            const rdgJa = !r.isOmission && entryRdgJa && entryRdgJa[String(idx)];
            const textInner = r.isOmission
                ? _T('panel.omitted', '（省略）')
                : rdgJa
                ? `${_escH(rdgJa)}<span class="mvv-app-rdg-gr">（${_escH(r.text || '')}）</span>`
                : _escH(r.text || '');
            const wit  = _escH((r.witnesses || []).join(' · '));
            return `<div class="mvv-app-rdg">${numHtml}<span class="mvv-app-rdg-text">${textInner}</span><span class="mvv-app-rdg-wit">${wit}</span></div>`;
        }).join('');
        return `<div class="mvv-app-entry">${lemHtml}${annoHtml}${rdgHtml}</div>`;
    });
    const srcLine = _T('panel.apparatusSource', '異読データ: The Greek New Testament: SBL Edition © 2010 Society of Biblical Literature and Logos Bible Software。装置は Joey McCollum が TEI XML に符号化（2021）。CC BY 4.0');
    return `<div class="mvv-apparatus-entries">${parts.join('')}<div class="mvv-app-source">${_escH(srcLine)}</div></div>`;
}

/**
 * #wlv-apparatus-slot を apparatus.json の結果で非同期に埋める。
 * 対象節に異読がなければ何も注入しない（静寂優先）。
 * 世代カウンタで fast verse-switching による古い結果の誤注入を防ぐ。
 */
async function _fillApparatusSection(bookKey, ch, vNum, area) {
    if (!area) return;
    const myGen = (area._apparatusNoteGen || 0) + 1;
    area._apparatusNoteGen = myGen;
    const isEn = window.I18N && I18N.contentLang === 'en';
    const isEs = window.I18N && I18N.lang === 'es';
    const [data, jaData, lemJaData, rdgJaData] = await Promise.all([
        _loadApparatusData(),
        isEs ? _loadApparatusEsAllData() : isEn ? _loadApparatusEnAllData() : _loadApparatusJaAllData(),
        isEs ? _loadApparatusLemEsData() : isEn ? _loadApparatusLemEnData() : _loadApparatusLemJaData(),
        isEs ? _loadApparatusRdgEsData() : isEn ? _loadApparatusRdgEnData() : _loadApparatusRdgJaData(),
    ]);
    if (myGen !== area._apparatusNoteGen) return;
    if (!data) return;
    const verseKey = `${bookKey} ${ch}:${vNum}`;
    const idxs = data.byVerse[verseKey];
    if (!idxs || !idxs.length) return;
    const entries = idxs.map(i => data.entries[i]);
    const jaEntries = jaData && jaData.entries;
    const lemJaEntries = lemJaData && lemJaData.entries;
    const rdgJaEntries = rdgJaData && rdgJaData.entries;
    const html = _buildApparatusHTML(entries, jaEntries, lemJaEntries, rdgJaEntries);
    if (!html) return;
    const slot = area && area.querySelector('#wlv-apparatus-slot');
    if (!slot) return;
    if (area.id === 'word-list-view') {
        /* 入口導線 Phase 1: PC版も既定は折りたたみ（見出しと件数は見える）。
           従来の「読書メモと同じ階層で常時表示」という判断は、初見の最初の
           表示に符号とギリシャ語を持ってこないため、承認済み設計で上書きする。 */
        slot.outerHTML = `<details class="wlv-reading-passage-note study-panel-apparatus-note"><summary><span class="wlv-pn-label">${_T('panel.textualVariants', '本文の異読')} <span class="mvv-app-count">${(window.I18N && window.I18N.lang !== 'ja') ? entries.length : entries.length + '件'}</span></span></summary>${html}</details>`;
    } else {
        /* モバイル版の既存 UI はそのまま維持する。 */
        slot.outerHTML = `<details class="mvv-passage-note mvv-apparatus-note"><summary>${_T('panel.textualVariants', '本文の異読')} <span class="mvv-app-count">${(window.I18N && window.I18N.lang !== 'ja') ? entries.length : entries.length + '件'}</span></summary>${html}</details>`;
    }
}

/**
 * 語ドロワーの resonance テキストと「この節の読書メモ」を比較し、
 * 同一文の場合は読書メモを非表示にする。
 * @param {string} resoText - #wlv-dd-resonance の現在のテキスト（trim済み）
 */
function _syncWlvPassageNoteVisibility(resoText) {
    const pnEl = document.querySelector('.wlv-reading-passage-note');
    if (!pnEl) return;
    /* 全段落を結合して比較する。節レベル現象の段落を含む場合は語ドロワーと
       全体一致しない（= 読書メモにしかない情報がある）ため隠さない。 */
    const pnText = Array.from(pnEl.querySelectorAll('.wlv-pn-prose p'))
        .map(p => (p.textContent || '').trim()).filter(Boolean).join('');
    pnEl.style.display = (resoText && pnText && resoText === pnText) ? 'none' : '';
}

/* ═════════════════════════════════════════════════════════════════
 * 単語クリック時の表示（Wordレイヤー）— ReadingFormatter 統一版
 *
 * 旧 _buildResonanceText（pos/tense/voice/mood ごとの独自ヒューリス
 * ティック文と、resonance専用の CONJ_FEEL辞書）は完全に削除した。
 *
 * Word レイヤーは新規の文章を一切生成しない。クリックされた語が
 * 属する節（あれば、最も範囲の狭い節）を ClauseAnalyzer の結果から
 * 特定し、その節の discourse 判定結果を wordContext.clauseContext と
 * して ReadingFormatter.format(wordContext) に渡すだけ — 「節の意味の
 * 一部として単語を見る」という Wallace 思想のとおり、単語自体の
 * 文法（reason/purpose 等の分析語、grammarタグ、confidence）は
 * 一切表示しない。
 *
 * 意味のある clauseContext が見つからない場合（語がどの節にも
 * 属さない、または解析自体が行えない）は null を返し、呼び出し側で
 * 完全に非表示にする（説明文で埋めない＝静寂優先）。
 * ═════════════════════════════════════════════════════════════════ */

/**
 * words 配列中の idx 番目の語が属する節（あれば最も範囲の狭い節）を返す。
 */
function _findEnclosingClause(clauseResults, idx) {
    let best = null;
    for (const c of clauseResults) {
        if (c.start <= idx && idx <= c.end) {
            if (!best || (c.end - c.start) < (best.end - best.start)) best = c;
        }
    }
    return best;
}

/**
 * 1語（words[idx]）について、その語が属する節の ReadingFormatter 文を
 * 返す。単語レベルの独立解釈は一切行わない。
 * @returns {Promise<string|null>} 意味のある clauseContext が無ければ null
 */
async function _buildWordResonanceText(words, idx) {
    if (!words || words.length === 0 || idx == null || !words[idx]) return null;

    const clauseResults = await _getWallaceClauseAnalysis(words);
    if (!clauseResults || clauseResults.length === 0) return null;

    const clause = _findEnclosingClause(clauseResults, idx);
    if (!clause) return null; // ⑤ 意味のある clauseContext が無い → 完全非表示

    const pipeline = await _ensureWallacePipeline();
    if (!pipeline) return null;
    const { ca, rf } = pipeline;

    const w = words[idx];
    const discourse = ca.classifyDiscourseRelation(words, clause);
    const wordContext = {
        type:          w.lemma || w.morph || '',
        text:          w.text  || '',
        verseContext:  w.verse != null ? String(w.verse) : '',
        clauseContext: { discourse, type: clause.type },
    };
    const formatted = rf.format(wordContext);
    const clauseSentence = (formatted && formatted.summary) || null;

    /* Phase 25B-1: Reading Support Projection の top.id をテンプレート選択キー
       としてのみ利用し、語粒度の 1 文を節の文に「加える」（Mapping §3.1）。
       - 帯C（confidence < 0.40）・候補なし・テンプレ未整備・既存文と重複・
         Projection null では従来どおり節の文のみ（静寂条件 = Phase 25A §5）。
       - 文の生成は従来どおり ReadingFormatter.format/combine のみが行う。 */
    let wordSentence = null;
    try {
        const proj = await _getReadingSupportProjection(words);   // キャッシュ再利用のみ
        const pw = proj && proj.words ? proj.words[idx] : null;
        if (pw && pw.top && pw.top.confidence >= 0.40) {
            const unclassified = rf.format({}).summary;           // 未整備判定の基準文
            const f2 = rf.format({ type: pw.top.id });
            const s2 = (f2 && f2.summary) || null;
            if (s2 && s2 !== unclassified && s2 !== clauseSentence) wordSentence = s2;
        }
    } catch (_) { wordSentence = null; }

    if (clauseSentence && wordSentence) {
        const combined = rf.combine([clauseSentence, wordSentence]);
        return combined || clauseSentence;
    }
    return clauseSentence || null;
}

let _wlvResonanceGen = 0; // 古い非同期結果の誤注入を防ぐ世代カウンタ

/**
 * #wlv-dd-resonance を ReadingFormatter の結果で非同期に埋める。
 * 表示すべき内容が無ければ空のまま（静寂優先）。
 */
async function _fillWlvResonance(ddReso, words, idx) {
    if (!ddReso) return;
    const myGen = ++_wlvResonanceGen;
    ddReso.textContent = '';
    const sentence = await _buildWordResonanceText(words, idx);
    if (myGen !== _wlvResonanceGen) return; // 既に別の語に移動済み
    if (sentence) ddReso.textContent = sentence;
    /* 節全体の読書メモと同一文なら非表示 */
    _syncWlvPassageNoteVisibility((sentence || '').trim());
}
