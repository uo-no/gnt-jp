/* __PHRASE_READING_BEGIN__
   Phase 25B-2: Phrase Reading（かたまりの読書メモ）— 二層構成
   構造層: Q3「どこまでが一まとまりか」への回答（Mapping §3.2）。
   意味層 (v1.1): そのまとまりをどう読むか（docs/phrase-reading.md が設計正典。
   現象 → Reading Intent → 文章。解釈・文法用語・翻訳は出さない）。
   ReadingSupportProjection の phrases / genitivePhrases / words だけを読む。
   内部構造（種別・位置）は言い回しの選択にのみ使い、
   画面には本文の引用と日本語の一文しか出さない。
   静寂条件: Projection null / 語がどの まとまり にも属さない / 1 語のみ /
   長すぎる まとまり（引用が読書を止める）→ null（既存表示のみ）。 */

/* 言い回し選択の内部キー（画面には出さない）と引用長の上限 */
const _PHRASE_READING_PRIORITY = { NP: 0, PP: 1, PtcP: 2 };
const _PHRASE_READING_MAX_SPAN = 7;

/* ── Stage A: Phrase Renderer 用の語解決（docs/phrase-rendering.md §4）──
   引用の日本語ソースは Reading Engine の resolve 出力（唯一のソース）。
   失敗・改善なしは null を返し、Renderer 側が w.japanese へ fallback する。 */
function _phraseResolveWord(words, idx) {
    try {
        const ctx = _buildReadingContext(words, idx);
        const r = window.App?.readingEngine?.resolve(words[idx], ctx);
        return r ? r.japanese : null;
    } catch (_) {
        return null;
    }
}

/* Stage A: 引用生成の新経路。PhraseRenderer 未ロード時は旧 renderPhraseJP へ
   fallback（旧実装は比較・切戻し用に残置 — 削除しない）。戻り値は HTML エスケープ済み。 */
/* EN UI の引用は Engine（日本語整形）を通さず、セグメント文から組み立てる。
   セグメント文は区間の全トークンへ複製されているため、連続する同一文は
   1回だけ取る。材料は読み込み済みのアラインメント（対応表）のセグメント文
   を使う：サイドカーの値はトークン単位グロスへ切り替わったが、セグメント文
   そのものは対応表が保持しており、値はサイドカー生成時のものと同一で
   あることを全章で検証済み（差異は空白のみで、ここで trim される）。
   セグメントに属さない語は従来どおり w.english に落とす。日本語が混ざる
   ことはない。 */
function _renderQuoteFromSidecar(p, endIdx, words) {
    try {
        const start = p.start | 0;
        const end = Math.min(endIdx | 0, words.length - 1);
        if (end < start) return '';
        const transId = (typeof _glossTransIdForUi === 'function') ? _glossTransIdForUi() : null;
        const segTextByRef = new Map(); /* "verse:tokenIndex" -> セグメント文 */
        if (transId && typeof _jaAlignSegmentsFor === 'function') {
            const seenVerses = new Set();
            for (let i = start; i <= end; i++) {
                const w = words[i];
                if (!w || w.verse == null || seenVerses.has(w.verse)) continue;
                seenVerses.add(w.verse);
                const book = w.book || w.bookKey;
                const ch = (w.chapter != null) ? w.chapter : w.ch;
                const segs = _jaAlignSegmentsFor(transId, book, ch, w.verse);
                if (!Array.isArray(segs)) continue;
                for (const seg of segs) {
                    if (!seg || !Array.isArray(seg.tokens)) continue;
                    for (const t of seg.tokens) segTextByRef.set(w.verse + ':' + Number(t), seg.t);
                }
            }
        }
        const parts = [];
        let prev = null;
        for (let i = start; i <= end; i++) {
            const w = words[i];
            if (!w) continue;
            let g = segTextByRef.get(w.verse + ':' + Number(w.tokenIndex));
            if (typeof g !== 'string' || !g.trim()) {
                g = (typeof w.english === 'string' && w.english) ? w.english : null;
            }
            const text = (g || '').trim();
            if (!text) continue;
            if (text === prev) continue;
            parts.push(text);
            prev = text;
        }
        return parts.join(' ');
    } catch (_) { return ''; }
}

function _renderQuoteViaEngine(p, endIdx, words) {
    if (typeof window !== 'undefined' && window.I18N && I18N.lang !== 'ja') {
        const q = _renderQuoteFromSidecar(p, endIdx, words);
        return q ? _escH(q) : '';
    }
    const PR = window.App?.PhraseRenderer;
    if (!PR) return renderPhraseJP(p, endIdx, words);
    const q = PR.renderQuote(p, endIdx, words, i => _phraseResolveWord(words, i));
    return q ? _escH(q) : '';
}

/* ── PhraseRenderer v0.1: 前置詞句（PP）の日本語化 ──────────────────
   PP のみ語順を組み替え「modifier + head + 前置詞訳」で自然な日本語を生成。
   その他の句種はトークンの w.japanese → w.text を連結する（フォールバック）。 */
const _PP_TRANS_JP = {
    'ἐν':  ()  => 'の中で',
    'εἰς': ()  => 'へ',
    'ἐκ':  ()  => 'から',
    'ἀπό': ()  => 'から',
    'διά': (c) => c === 'genitive' ? 'によって' : 'を通して',
    'μετά':(c) => c === 'genitive' ? 'とともに' : 'の後で',
    'κατά':()  => 'に従って',
};
const _PP_TRANS_ES = {
    'ἐν':  ()  => 'en',
    'εἰς': ()  => 'a / hacia',
    'ἐκ':  ()  => 'de / desde',
    'ἀπό': ()  => 'desde',
    'διά': (c) => c === 'genitive' ? 'a través de' : 'por causa de',
    'μετά':(c) => c === 'genitive' ? 'con' : 'después de',
    'κατά':()  => 'según',
};
const _PP_TRANS_EN = {
    'ἐν':  ()  => 'in',
    'εἰς': ()  => 'into',
    'ἐκ':  ()  => 'out of',
    'ἀπό': ()  => 'from',
    'διά': (c) => c === 'genitive' ? 'through' : 'because of',
    'μετά':(c) => c === 'genitive' ? 'with' : 'after',
    'κατά':()  => 'according to',
};

function _buildPhraseContext(p, end, words) {
    const _isEn  = window.I18N && I18N.contentLang === 'en';
    const _isEs  = window.I18N && I18N.lang === 'es';
    const jaOf   = _isEs
        ? (w => _escH((w && (typeof _glossSidecarOnlyFor === 'function' ? _glossSidecarOnlyFor(w) : null)) || (w && w.text) || ''))
        : _isEn
        ? (w => _escH((w && (w.english || w.text)) || ''))
        : (w => _escH((w && (w.japanese || w.text)) || ''));
    const tokens = words.slice(p.start, end + 1);

    let prep      = null;
    let head      = null;
    const modifiers = [];

    if (p.type === 'PP') {
        const prepWord  = words[p.start];
        const prepLemma = (prepWord && prepWord.lemma) || (prepWord && prepWord.text) || '';
        if (prepWord) prep = { lemma: prepLemma, ja: jaOf(prepWord) };

        const headIdx  = (p.head != null && p.head <= end) ? p.head : end;
        const headWord = words[headIdx];
        if (headWord) head = { ja: jaOf(headWord) };

        for (let k = p.start + 1; k < headIdx; k++) {
            const t = jaOf(words[k]);
            if (t) modifiers.push({ ja: t });
        }
    } else if (p.type === 'NP' || p.type === 'PtcP') {
        // NP : head = 最後の N（p.head）、modifiers = 先行する T/A
        // PtcP: head = 分詞（p.end）、  modifiers = 先行冠詞（あれば）
        const headIdx  = (p.head != null && p.head <= end) ? p.head : end;
        const headWord = words[headIdx];
        if (headWord) head = { ja: jaOf(headWord) };

        for (let k = p.start; k < headIdx; k++) {
            const t = jaOf(words[k]);
            if (t) modifiers.push({ ja: t });
        }
    }

    return { type: p.type, tokens, prep, head, modifiers,
             start: p.start, end, case: p.case || '' };
}

function _renderDefault(ctx) {
    const _isEn = window.I18N && I18N.contentLang === 'en';
    const _isEs = window.I18N && I18N.lang === 'es';
    if (_isEs) {
        return ctx.tokens
            .map(w => _escH((w && (typeof _glossSidecarOnlyFor === 'function' ? _glossSidecarOnlyFor(w) : null)) || (w && w.text) || ''))
            .filter(Boolean).join(' ');
    }
    return ctx.tokens
        .map(w => _escH((w && (_isEn ? (w.english || w.text) : (w.japanese || w.text))) || ''))
        .filter(Boolean).join('');
}

function _renderPP(ctx) {
    const modJa    = ctx.modifiers.map(m => m.ja).join('');
    const headJa   = ctx.head ? ctx.head.ja : '';
    const suffixFn = ctx.prep ? _PP_TRANS_JP[ctx.prep.lemma] : null;
    const suffix   = suffixFn ? suffixFn(ctx.case) : (ctx.prep ? ctx.prep.ja : '');
    return modJa + headJa + suffix;
}

function _renderPP_EN(ctx) {
    const prefixFn = ctx.prep ? _PP_TRANS_EN[ctx.prep.lemma] : null;
    const prefix   = prefixFn ? prefixFn(ctx.case) : (ctx.prep ? ctx.prep.ja : '');
    const modEn    = ctx.modifiers.map(m => m.ja).filter(Boolean).join(' ');
    const headEn   = ctx.head ? ctx.head.ja : '';
    const body     = [modEn, headEn].filter(Boolean).join(' ');
    return prefix ? prefix + (body ? ' ' + body : '') : body;
}

function _renderPP_ES(ctx) {
    const prefixFn = ctx.prep ? _PP_TRANS_ES[ctx.prep.lemma] : null;
    const prefix   = prefixFn ? prefixFn(ctx.case) : (ctx.prep ? ctx.prep.ja : '');
    const modEs    = ctx.modifiers.map(m => m.ja).filter(Boolean).join(' ');
    const headEs   = ctx.head ? ctx.head.ja : '';
    const body     = [modEs, headEs].filter(Boolean).join(' ');
    return prefix ? prefix + (body ? ' ' + body : '') : body;
}

function _renderNP(ctx) {
    const modJa  = ctx.modifiers.map(m => m.ja).filter(Boolean).join('');
    const headJa = ctx.head ? ctx.head.ja : '';
    return modJa + headJa;
}

function _renderParticipial(ctx) {
    const modJa  = ctx.modifiers.map(m => m.ja).filter(Boolean).join('');
    const headJa = ctx.head ? ctx.head.ja : '';
    return modJa + headJa;
}

const _PHRASE_RENDERERS = {
    PP:   _renderPP,
    NP:   _renderNP,
    PtcP: _renderParticipial,
};
const _PHRASE_RENDERERS_EN = {
    PP:   _renderPP_EN,
    NP:   _renderNP,
    PtcP: _renderParticipial,
};
function _renderNP_ES(ctx) {
    const modEs  = ctx.modifiers.map(m => m.ja).filter(Boolean).join(' ');
    const headEs = ctx.head ? ctx.head.ja : '';
    return [modEs, headEs].filter(Boolean).join(' ');
}
const _PHRASE_RENDERERS_ES = {
    PP:   _renderPP_ES,
    NP:   _renderNP_ES,
    PtcP: _renderNP_ES,
};

function renderPhraseJP(p, end, words) {
    const ctx    = _buildPhraseContext(p, end, words);
    const _isEn  = window.I18N && I18N.contentLang === 'en';
    const _isEs  = window.I18N && I18N.lang === 'es';
    const render = ((_isEs ? _PHRASE_RENDERERS_ES : _isEn ? _PHRASE_RENDERERS_EN : _PHRASE_RENDERERS)[ctx.type]) || _renderDefault;
    return render(ctx);
}

function _phraseReadingSentence(kind, quoted) {
    switch (kind) {
        case 'PP':   return `「${quoted}」は、ひとつづきのまとまりです。`;
        case 'PtcP': return `「${quoted}」は、ここまでをまとめて読むと意味がつながります。`;
        default:     return `「${quoted}」は、ここまでで一つの内容です。`;
    }
}
function _phraseReadingSentenceES(kind, quoted) {
    switch (kind) {
        case 'PP':   return `"${quoted}" forma una sola frase preposicional.`;
        case 'PtcP': return `Leer "${quoted}" como una unidad hace que el significado fluya.`;
        default:     return `"${quoted}" forma una sola unidad de significado.`;
    }
}
function _phraseReadingSentenceEN(kind, quoted) {
    switch (kind) {
        case 'PP':   return `"${quoted}" forms a single prepositional phrase.`;
        case 'PtcP': return `Reading "${quoted}" as a unit lets the meaning flow.`;
        default:     return `"${quoted}" forms a single unit of meaning.`;
    }
}

/* ── Phrase Reading 意味層（v1.1・docs/phrase-reading.md）─────────────
   生成の型は「現象 → Reading Intent → 文章」。本テーブルは Intent → 2文
   （1文目=役割、2文目=読むコツ）のみを持ち、現象名・scope・priority は
   一切書かない。どの現象がどの Intent を持つかは reading-policy.json の
   intent フィールドが決める（唯一の機械可読定義源）。
   Intent キーは内部専用で画面には出さない。文言の正典は
   docs/phrase-reading.md Phase D の表 — 変更は必ず正典から。 */
const _PHRASE_INTENT_TEXT = {
    background: ['このまとまりは、背景となる状況を先に示しています。',
                 'ここを読んでから本文へ進むと、流れがつかみやすくなります。'],
    reason: ['このまとまりは、その理由を添えています。',
             '前の内容と結び付けながら読むと理解しやすくなります。'],
    purpose: ['このまとまりは、何のためなのかを示しています。',
              '動きの向かう先を意識して読むと流れがつながります。'],
    result: ['このまとまりは、その結果どうなるかを示しています。',
             '前の内容の流れを受けて読むとつながりが見えます。'],
    condition: ['このまとまりは、「もし〜なら」の条件を示しています。',
                'この条件を頭に置いて本文を読むと流れがつかめます。'],
    concession: ['このまとまりは、予想とは逆の展開になることを知らせています。',
                 '「それでも」と心に置いて読むと流れが見えてきます。'],
    comparison: ['このまとまりは、何かと比べる形になっています。',
                 '比べながら読むと意味が見えやすくなります。'],
    contrast: ['このまとまりは、前の内容との対比を示しています。',
               '違いを並べて読むと流れがはっきりします。'],
    explanation: ['このまとまりは、中心の語の中身や性質を説明しています。',
                  'どの語を説明しているかを意識すると読みやすくなります。'],
    identification: ['このまとまりは、だれのこと・何のことかを指しています。',
                     '同じ人やものを思い浮かべながら読むとつながりが見えます。'],
    progression: ['このまとまりは、話が次へ進む合図になっています。',
                  '展開の変わり目として読むと流れが追いやすくなります。'],
    single_action: ['このまとまりは、全体で一つの動きを表しています。',
                    '分けずにひとまとめで読むと意味が入りやすくなります。'],
};
const _PHRASE_INTENT_TEXT_EN = {
    background:     ['This phrase sets up the background before the main thought.',
                     'Reading this first helps the flow of what follows make sense.'],
    reason:         ['This phrase gives the reason for what was said.',
                     'Connecting it with what came before helps the meaning come through.'],
    purpose:        ['This phrase shows what the action is aimed at.',
                     'Keeping the goal in view as you read helps the flow connect.'],
    result:         ['This phrase shows what comes of what was said.',
                     'Reading it as the outcome of what came before makes the connection visible.'],
    condition:      ['This phrase states an "if" condition.',
                     'Holding that condition in mind as you read helps the flow make sense.'],
    concession:     ['This phrase signals that what follows goes against expectation.',
                     'Reading with an "and yet" in mind helps the direction become clear.'],
    comparison:     ['This phrase introduces a point of comparison.',
                     'Reading with the comparison in mind helps the meaning stand out.'],
    contrast:       ['This phrase sets up a contrast with what came before.',
                     'Placing the two side by side makes the direction clear.'],
    explanation:    ['This phrase describes the content or nature of a key word.',
                     'Noticing which word it qualifies makes the passage easier to follow.'],
    identification: ['This phrase identifies who or what is meant.',
                     'Holding the same person or thing in mind as you read shows the connection.'],
    progression:    ['This phrase signals that the narrative is moving forward.',
                     'Reading it as a turning point helps you follow the flow.'],
    single_action:  ['This phrase expresses a single movement taken as a whole.',
                     'Reading it together without breaking it apart helps the meaning land.'],
};

const _PHRASE_INTENT_TEXT_ES = {
    background:     ['Esta frase prepara el trasfondo antes del pensamiento principal.',
                     'Leerla primero ayuda a que lo que sigue tenga sentido.'],
    reason:         ['Esta frase da la razón de lo dicho.',
                     'Conectarla con lo anterior ayuda a que el significado se haga claro.'],
    purpose:        ['Esta frase muestra el fin al que apunta la acción.',
                     'Tener presente la meta mientras lees ayuda a que el flujo conecte.'],
    result:         ['Esta frase muestra lo que resulta de lo dicho.',
                     'Leerla como la consecuencia de lo anterior hace visible la conexión.'],
    condition:      ['Esta frase plantea una condición, un «si».',
                     'Tener en mente esa condición mientras lees ayuda a seguir el flujo.'],
    concession:     ['Esta frase anuncia que lo que sigue va contra lo esperado.',
                     'Leer con un «y sin embargo» en mente ayuda a ver la dirección.'],
    comparison:     ['Esta frase introduce un punto de comparación.',
                     'Leer teniendo presente la comparación ayuda a destacar el significado.'],
    contrast:       ['Esta frase plantea un contraste con lo anterior.',
                     'Poner los dos lados uno junto al otro aclara la dirección.'],
    explanation:    ['Esta frase describe el contenido o la naturaleza de una palabra clave.',
                     'Notar a qué palabra califica hace más fácil seguir el pasaje.'],
    identification: ['Esta frase identifica de quién o de qué se trata.',
                     'Mantener en mente a la misma persona o cosa mientras lees muestra la conexión.'],
    progression:    ['Esta frase anuncia que el relato avanza.',
                     'Leerla como un punto de giro ayuda a seguir el flujo.'],
    single_action:  ['Esta frase expresa un solo movimiento tomado como un todo.',
                     'Leerla junta, sin partirla, ayuda a que el significado llegue.'],
};

/* 意味層の選択（1句1現象の原則・docs/phrase-reading.md Phase E）:
   対象語の categories から「phrase scope × phrase_reading の priority ×
   confidence ≥ min_confidence × intent 定義済み」の現象を探し、
   priority（phrase_reading.priorities の並び順）→ confidence で
   ただ1つの Intent を選ぶ。該当なしは空配列（静寂）。 */
function _phraseIntentLines(proj, idx) {
    const w = proj && proj.words ? proj.words[idx] : null;
    if (!w || !w.categories) return [];
    const policy = _wallacePipeline?.policy;
    const rule   = policy?.rules?.phrase_reading;
    if (!policy || !rule) return [];
    const minConf    = policy.rules?.min_confidence ?? 0.40;
    const prios      = rule.priorities || [];
    const textTable  = (window.I18N && I18N.lang === 'es') ? _PHRASE_INTENT_TEXT_ES : (window.I18N && I18N.contentLang === 'en') ? _PHRASE_INTENT_TEXT_EN : _PHRASE_INTENT_TEXT;
    let best = null;
    for (const c of Object.values(w.categories)) {
        if (!c || c.confidence < minConf) continue;
        const ph = policy.byId[c.id];
        if (!ph || !ph.intent || !textTable[ph.intent]) continue;
        if (!_policyScopes(ph).includes('phrase')) continue;
        const rank = prios.indexOf(ph.priority);
        if (rank < 0) continue;
        if (!best || rank < best.rank ||
            (rank === best.rank && c.confidence > best.confidence)) {
            best = { rank, confidence: c.confidence, intent: ph.intent };
        }
    }
    return best ? textTable[best.intent].slice(0, 2) : [];
}

/* ── v1.2 対象語引用型（docs/phrase-reading.md Phase H → v1.2）──────────
   構造層（NP/PP/PtcP）の引用が成立しない語でも、意味層候補があれば
   対象語を引用して案内する。構造層が検出しない不定詞句・無冠詞の
   副詞的分詞句（属格絶対・迂言法・目的/結果不定詞・理由/条件/譲歩分詞）が
   これで表示に入る。文言は文テーブル（正典）から変えず、1文目の
   「このまとまりは、」を「「◯◯」のまとまりは、」に置き換えるだけ。 */
const _PHRASE_INTENT_LEAD    = 'このまとまりは、';
const _PHRASE_INTENT_LEAD_EN = 'This phrase ';
const _PHRASE_INTENT_LEAD_ES = 'Esta frase ';
function _phraseIntentStandaloneHTML(words, idx, proj) {
    try {
        const intentLines = _phraseIntentLines(proj, idx);
        if (intentLines.length === 0) return null;
        /* Stage A: 対象語引用も Engine 出力ベース（単語の擬似句として整形） */
        const quoted = _renderQuoteViaEngine({ type: '', start: idx, end: idx }, idx, words);
        if (!quoted) return null;
        const _isEn = window.I18N && I18N.contentLang === 'en';
        const _isEs = window.I18N && I18N.lang === 'es';
        const LEAD  = _isEs ? _PHRASE_INTENT_LEAD_ES : _isEn ? _PHRASE_INTENT_LEAD_EN : _PHRASE_INTENT_LEAD;
        const first = intentLines[0].startsWith(LEAD)
            ? ((_isEn || _isEs)
                ? `"${quoted}" ` + intentLines[0].slice(LEAD.length)
                : `「${quoted}」のまとまりは、` + intentLines[0].slice(LEAD.length))
            : intentLines[0];
        const shown = [first, ...intentLines.slice(1)];
        return `<div class="rn-prose reading-block">${
            shown.map(l => `<p class="rn-prose-text reading-prose">${l}</p>`).join('')
        }</div>`;
    } catch (_) {
        return null;   // Failure Mode: 静寂
    }
}

/* 引用品質ガード（Phase 26 編集）: 句検出は句読点・格の変わり目を跨ぐことが
   あるため、引用時にのみ範囲を安全側へ縮める（判定・Projection は不変）。
   1) 途中に句読点（. · ; ,）があればそこまで
   2) 途中で格が変わったら（『〜の』のかたちは透過）その手前まで
   3) 中心語のあとに、冠詞を伴わない普通名詞が続いたらその手前まで
      （Σίμων Πέτρος のような呼び名の並びは残す） */
function _trimPhraseEnd(words, p) {
    let end = p.end;
    for (let k = p.start; k < end; k++) {
        if (/[.\u00b7;,\u037e]/.test(String(words[k]?.after ?? ''))) { end = k; break; }
    }
    if (p.type === 'NP') {
        let baseCase = null, baseNum = null, nounSeen = false;
        for (let k = p.start; k <= end; k++) {
            const w = words[k] || {};
            const c = w.case || '';
            if (!c) continue;
            if (c === 'genitive' && baseCase && baseCase !== 'genitive') continue;
            if (baseCase === null) { baseCase = c; baseNum = w.number || ''; }
            else if (c !== baseCase || (w.number || '') !== baseNum) { end = k - 1; break; }
            if (w.class === 'noun') {
                if (nounSeen) {
                    const prevIsArt = (words[k - 1] || {}).class === 'det';
                    const isProper = /^[\u0391-\u03a9\u1f08-\u1fbc]/.test(String(w.lemma ?? w.text ?? ''));
                    if (!prevIsArt && !isProper) { end = k - 1; break; }
                }
                nounSeen = true;
            }
        }
    }
    return end;
}

/* SF-14: レイアウト後に focusband を測り、frame(下・実線・矢頭)/referent(上・点線)の弧を
 * inline SVG で描く。折返し or 幅不足なら縮退（弧を消し .sf-frame-note/.sf-ref-note を表示）。
 * 推論はしない（edge は data 属性の明示 index ペアのみ）。 */
function _sfEnhanceRelations(scope) {
    const root = scope || document;
    const bands = root.querySelectorAll ? root.querySelectorAll('.sf-rel-focusband') : [];
    bands.forEach((band) => {
        const svg = band.querySelector(':scope > .sf-arc-svg');
        const frameEdges = _sfParseEdges(band.getAttribute('data-sf-frame'));
        const refEdges = _sfParseEdges(band.getAttribute('data-sf-ref'));
        if (!svg || (!frameEdges.length && !refEdges.length)) return;
        const bRect = band.getBoundingClientRect();
        const chipRect = (i) => {
            const el = band.querySelector('.sf-chip[data-sf-idx="' + i + '"]');
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const colEl = el.closest ? el.closest('.sf-col') : null;
            const cr = colEl ? colEl.getBoundingClientRect() : r;
            return {
                cx: r.left + r.width / 2 - bRect.left,
                top: r.top - bRect.top, bottom: r.bottom - bRect.top,
                colTop: cr.top - bRect.top,          // role キャップを含む列の上端（矢頭はここへ＝ラベルと非重複）
                row: el.getAttribute('data-sf-row') || 's',
                wrapKey: Math.round(r.top)
            };
        };
        const idxs = new Set();
        frameEdges.concat(refEdges).forEach(e => { idxs.add(e.a); idxs.add(e.b); });
        const rects = {}; let ok = true; const rowKey = {};
        // 折返し判定は「同一段(row)内で行がずれていないか」。2段(top/bottom)は別段なので OK。
        idxs.forEach(i => {
            const r = chipRect(i); if (!r) { ok = false; return; } rects[i] = r;
            if (rowKey[r.row] == null) rowKey[r.row] = r.wrapKey;
            else if (Math.abs(r.wrapKey - rowKey[r.row]) > 2) ok = false;
        });
        const rel = band.closest ? band.closest('.sf-rel') : null;
        const refNote = rel && rel.querySelector('.sf-ref-note');
        if (!ok) {   // 段内で折返し・chip 欠落 → 縮退（線を消し注記へ）
            band.classList.add('sf-degraded'); svg.innerHTML = '';
            if (refNote) refNote.classList.add('sf-show');
            return;
        }
        band.classList.remove('sf-degraded');
        if (refNote) refNote.classList.remove('sf-show');
        svg.setAttribute('width', bRect.width);
        svg.setAttribute('height', bRect.height);
        svg.setAttribute('viewBox', '0 0 ' + bRect.width + ' ' + bRect.height);
        let out = '';
        // frame: 上段述語 → 下段項の「短い縦エルボ」。同段(例: 述語↔主語)は配置で表すため線を引かない。
        // 述語ごとに trunk＋bus＋drop でまとめる（矢頭 ▾ は項側の列上端）。
        const groups = {};
        frameEdges.forEach(e => {
            const pr = rects[e.a], ar = rects[e.b];
            if (!pr || !ar || pr.row === ar.row) return;   // 同段はスキップ（主語は配置で表現）
            (groups[e.a] = groups[e.a] || []).push(e.b);
        });
        Object.keys(groups).forEach(pi => {
            const pr = rects[pi]; const args = groups[pi].map(i => rects[i]).filter(Boolean);
            if (!pr || !args.length) return;
            const minTop = Math.min.apply(null, args.map(a => a.colTop));
            const busY = pr.bottom + Math.max(6, (minTop - pr.bottom) * 0.5);
            out += `<path d="M ${pr.cx} ${pr.bottom} L ${pr.cx} ${busY}" class="sf-arc-frame-path"/>`;   // trunk
            args.forEach(a => {
                out += `<path d="M ${pr.cx} ${busY} L ${a.cx} ${busY} L ${a.cx} ${a.colTop}" class="sf-arc-frame-path"/>`;  // bus + drop
                out += `<path d="M ${a.cx} ${a.colTop} l -4 -6 l 8 0 z" class="sf-arw"/>`;                 // ▾ target
            });
        });
        // referent: 上・点線・矢頭なし（別チャネル）
        refEdges.forEach((e, li) => {
            const sr = rects[e.a], tr = rects[e.b]; if (!sr || !tr) return;
            const y0 = Math.min(sr.colTop, tr.colTop) - 3;
            const depth = 8 + li * 6;
            const midx = (sr.cx + tr.cx) / 2;
            out += `<path d="M ${sr.cx} ${y0} Q ${midx} ${y0 - depth} ${tr.cx} ${y0}" class="sf-arc-ref-path"/>`;
        });
        svg.innerHTML = out;
    });
}
function _sfParseEdges(s) {
    if (!s) return [];
    return s.split(',').map(p => { const m = /^(\d+):(\d+)$/.exec(p.trim()); return m ? { a: +m[1], b: +m[2] } : null; }).filter(Boolean);
}
let _sfEnhanceRAF = 0;
function _sfScheduleEnhance() {
    if (_sfEnhanceRAF) cancelAnimationFrame(_sfEnhanceRAF);
    _sfEnhanceRAF = requestAnimationFrame(() => { _sfEnhanceRAF = 0; try { _sfEnhanceRelations(document); } catch (_) {} });
}
if (typeof window !== 'undefined') window.addEventListener('resize', _sfScheduleEnhance);

/* token ref（"BOOK c:v!i"）から book / chapter を取り出す。role-renderers.js（_buildLocalRelationFrame）が利用。 */
function _flowTreeParseRef(ref) {
    const m = /^(\S+)\s+(\d+):(\d+)!(\d+)$/.exec(ref || '');
    return m ? { book: m[1], chapter: parseInt(m[2], 10) } : null;
}

async function _buildPhraseReadingHTML(words, idx) {
    const proj = await _getReadingSupportProjection(words);
    if (!proj) return null;
    const _isEn = window.I18N && I18N.contentLang === 'en';

    /* 対象語を含む 2 語以上・上限以内の まとまり（NP / PP / PtcP のみ。
       『〜の』の連なりは単独では出さず、下の関係文にのみ使う） */
    const containing = (proj.phrases ?? []).filter(p =>
        p && (p.end - p.start) >= 1 && (p.end - p.start) < _PHRASE_READING_MAX_SPAN &&
        idx >= p.start && idx <= p.end &&
        (p.type in _PHRASE_READING_PRIORITY));
    if (containing.length === 0) return _phraseIntentStandaloneHTML(words, idx, proj);
    containing.sort((a, b) =>
        (_PHRASE_READING_PRIORITY[a.type] ?? 9) - (_PHRASE_READING_PRIORITY[b.type] ?? 9) ||
        (a.end - a.start) - (b.end - b.start));

    /* Stage A: 『〜の』関係文の引用も Engine 出力ベース（GenP は並べ替えなし・
       句末の「の」は保持 — docs/phrase-rendering.md §2-5） */
    const quoteOf = (s, e) => _renderQuoteViaEngine({ type: 'GenP', start: s, end: e }, e, words);

    const seen = new Set();
    const lines = [];
    for (const p of containing) {
        const key = `${p.start}-${p.end}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const trimmedEnd = _trimPhraseEnd(words, p);
        if (trimmedEnd - p.start < 1 || idx > trimmedEnd) continue;   // 縮めて成立しなければ沈黙
        /* Stage A: Engine 出力ベースの引用（旧 renderPhraseJP は残置・fallback） */
        const quoted = _renderQuoteViaEngine(p, trimmedEnd, words);
        if (!quoted) continue;
        lines.push((window.I18N && I18N.lang === 'es') ? _phraseReadingSentenceES(p.type, quoted) : _isEn ? _phraseReadingSentenceEN(p.type, quoted) : _phraseReadingSentence(p.type, quoted));

        /* 『〜の』の関係文: まとまり の中心となる語の後に『〜の』の連なりが
           続く場合のみ、「どれがどれを説明しているか」を一文で示す */
        if (p.type === 'NP') {
            let headIdx = -1;
            for (let k = p.start; k <= trimmedEnd; k++) {
                if (words[k]?.class === 'noun' && words[k]?.case !== 'genitive') {
                    headIdx = k; break;
                }
            }
            const inner = (proj.genitivePhrases ?? []).find(g =>
                headIdx >= 0 && g.start > headIdx && g.end <= trimmedEnd);
            if (inner && headIdx >= 0) {
                const genQ = quoteOf(inner.start, inner.end);
                const headW = _isEn
                    ? _escH(words[headIdx]?.english || words[headIdx]?.text || '')
                    : _escH(words[headIdx]?.japanese || words[headIdx]?.text || '');
                if (genQ && headW) lines.push(_isEn
                    ? `"${genQ}" describes "${headW}".`
                    : `「${genQ}」が「${headW}」を説明しています。`);
            }
        }
        if (lines.length >= 2) break;
    }
    if (lines.length === 0) return _phraseIntentStandaloneHTML(words, idx, proj);

    /* 意味層（v1.1・docs/phrase-reading.md Phase E）: 最大2文（役割＋読むコツ）。
       構造層が成立した語では構造層第1文＋意味層2文（最大3文）。
       構造層が沈黙した語は上の対象語引用型（v1.2）が担当する。
       意味層該当なしは従来表示のまま。 */
    let shown = lines.slice(0, 2);
    try {
        const intentLines = _phraseIntentLines(proj, idx);
        if (intentLines.length > 0) shown = [lines[0], ...intentLines];
    } catch (_) { /* 意味層の失敗は静寂（構造層はそのまま） */ }

    return `<div class="rn-prose reading-block">${
        shown.map(l => `<p class="rn-prose-text reading-prose">${l}</p>`).join('')
    }</div>`;
}
/* __PHRASE_READING_END__ */
