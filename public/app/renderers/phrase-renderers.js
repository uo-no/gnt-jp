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
    const _isEn  = window.I18N && I18N.lang === 'en';
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
    const _isEn = window.I18N && I18N.lang === 'en';
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
    const _isEn  = window.I18N && I18N.lang === 'en';
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
    const textTable  = (window.I18N && I18N.lang === 'es') ? _PHRASE_INTENT_TEXT_ES : (window.I18N && I18N.lang === 'en') ? _PHRASE_INTENT_TEXT_EN : _PHRASE_INTENT_TEXT;
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
        const _isEn = window.I18N && I18N.lang === 'en';
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

/* ══════════════════════════════════════════
   FLOW-TREE-11-A → 12: NeighborhoodView 統合境界確認 Prototype
   ------------------------------------------------------------------
   目的: 既存の単語タップ経路（openStudyPanel → _renderReadingNotes）に
   Lowfat 由来の構造情報を「追加情報として」接続できるかを確認する。
   機能追加ではなく境界確認のため、対象は Matthew 1:1 の8語のみ。

   データ経路（正式モジュール利用へ置換済み）:
     Lowfat XML（_FT11_SENTENCE_XML）
       → window.App.flowTree.parseLowfatXml()      … public/core/flow-tree-adapter.js
       → window.App.neighborhoodView.buildNeighborhoodView() … public/core/neighborhood-view.js
       → 以下の Renderer 処理（_ft11LabelOf / _ft11ToRenderItem / _ft11RenderList）
   Adapter が Tree 生成の唯一の経路、NeighborhoodView が構成語群抽出の唯一の
   経路であり、本ブロックはもう Lowfat 解析ロジック・parentOf/nodesById 構築
   ロジックを自前で持たない。

   境界:
   - SyntaxAnalyzer / PhraseAnalyzer / ClauseAnalyzer / ReadingFormatter は
     一切呼び出さない・参照しない（このブロックは完全に独立している）。
   - bible_data のスキーマは変更しない。以下の _FT11_JAPANESE は
     public/bible_data/nt/MAT/1.json（verse 1, japanese フィールド）を
     読み取り専用で転記したスナップショットであり、実行時に bible_data を
     読みにも書きにも行かない。
   - role/rule/class/type は画面へ一切出さない（neighborhood-view.js が
     出力する View Model 自体、これらを含まない）。
   - MAT 1:1 以外の ref では _buildFlowTreeNeighborhoodViewHTML() は
     空文字列を返し、既存表示に一切影響しない。
   参照設計: docs/development/flow-tree-adapter-design.md /
             docs/development/flow-tree-representation-schema.md /
             docs/development/neighborhood-view-design.md
   ══════════════════════════════════════════ */
const _FT11_SENTENCE_XML = "<sentence>\n      <p>\n         <milestone unit=\"verse\" id=\"MAT 1:1\">MAT 1:1</milestone> Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.</p>\n      <wg class=\"np\" rule=\"NPofNP\" role=\"p\">\n         <w ref=\"MAT 1:1!1\"\n            after=\" \"\n            class=\"noun\"\n            type=\"common\"\n            xml:id=\"n40001001001\"\n            lemma=\"βίβλος\"\n            normalized=\"Βίβλος\"\n            strong=\"976\"\n            number=\"singular\"\n            gender=\"feminine\"\n            case=\"nominative\"\n            english=\"book\"\n            mandarin=\"谱\"\n            gloss=\"[The] book\"\n            domain=\"033005\"\n            ln=\"33.38\"\n            morph=\"N-NSF\"\n            unicode=\"Βίβλος\">Βίβλος</w>\n         <wg class=\"np\" rule=\"NPofNP\">\n            <w ref=\"MAT 1:1!2\"\n               after=\" \"\n               class=\"noun\"\n               type=\"common\"\n               xml:id=\"n40001001002\"\n               lemma=\"γένεσις\"\n               normalized=\"γενέσεως\"\n               strong=\"1078\"\n               number=\"singular\"\n               gender=\"feminine\"\n               case=\"genitive\"\n               english=\"genealogy\"\n               mandarin=\"族\"\n               gloss=\"of [the] genealogy\"\n               domain=\"010002 033003\"\n               ln=\"10.24 33.19\"\n               morph=\"N-GSF\"\n               unicode=\"γενέσεως\">γενέσεως</w>\n            <wg type=\"apposition\" class=\"np\" rule=\"Np-Appos\">\n               <wg type=\"apposition\" class=\"np\" rule=\"Np-Appos\">\n                  <wg type=\"apposition\" class=\"np\" rule=\"Np-Appos\">\n                     <w ref=\"MAT 1:1!3\"\n                        after=\" \"\n                        class=\"noun\"\n                        type=\"proper\"\n                        xml:id=\"n40001001003\"\n                        lemma=\"Ἰησοῦς\"\n                        normalized=\"Ἰησοῦ\"\n                        strong=\"2424\"\n                        number=\"singular\"\n                        gender=\"masculine\"\n                        case=\"genitive\"\n                        english=\"Jesus\"\n                        mandarin=\"耶稣\"\n                        gloss=\"of Jesus\"\n                        domain=\"093001\"\n                        ln=\"93.169a\"\n                        morph=\"N-GSM\"\n                        unicode=\"Ἰησοῦ\">Ἰησοῦ</w>\n                     <w ref=\"MAT 1:1!4\"\n                        after=\" \"\n                        class=\"noun\"\n                        type=\"proper\"\n                        xml:id=\"n40001001004\"\n                        lemma=\"Χριστός\"\n                        normalized=\"χριστοῦ\"\n                        strong=\"5547\"\n                        number=\"singular\"\n                        gender=\"masculine\"\n                        case=\"genitive\"\n                        english=\"Christ\"\n                        mandarin=\"基督\"\n                        gloss=\"Christ\"\n                        domain=\"093001\"\n                        ln=\"93.387\"\n                        morph=\"N-GSM\"\n                        unicode=\"χριστοῦ\"\n                        junction=\"apposition\">χριστοῦ</w>\n                  </wg>\n                  <wg class=\"np\" rule=\"NPofNP\" junction=\"apposition\">\n                     <w ref=\"MAT 1:1!5\"\n                        after=\" \"\n                        class=\"noun\"\n                        type=\"common\"\n                        xml:id=\"n40001001005\"\n                        lemma=\"υἱός\"\n                        normalized=\"υἱοῦ\"\n                        strong=\"5207\"\n                        number=\"singular\"\n                        gender=\"masculine\"\n                        case=\"genitive\"\n                        english=\"son\"\n                        mandarin=\"子孙\"\n                        gloss=\"son\"\n                        domain=\"010002\"\n                        ln=\"10.30\"\n                        morph=\"N-GSM\"\n                        unicode=\"υἱοῦ\">υἱοῦ</w>\n                     <w ref=\"MAT 1:1!6\"\n                        after=\" \"\n                        class=\"noun\"\n                        type=\"proper\"\n                        xml:id=\"n40001001006\"\n                        lemma=\"Δαυίδ\"\n                        normalized=\"Δαυὶδ\"\n                        strong=\"1138\"\n                        number=\"singular\"\n                        gender=\"masculine\"\n                        case=\"genitive\"\n                        english=\"David\"\n                        mandarin=\"大卫\"\n                        gloss=\"of David\"\n                        domain=\"093001\"\n                        ln=\"93.91\"\n                        morph=\"N-PRI\"\n                        unicode=\"Δαυὶδ\">Δαυὶδ</w>\n                  </wg>\n               </wg>\n               <wg class=\"np\" rule=\"NPofNP\" junction=\"apposition\">\n                  <w ref=\"MAT 1:1!7\"\n                     after=\" \"\n                     class=\"noun\"\n                     type=\"common\"\n                     xml:id=\"n40001001007\"\n                     lemma=\"υἱός\"\n                     normalized=\"υἱοῦ\"\n                     strong=\"5207\"\n                     number=\"singular\"\n                     gender=\"masculine\"\n                     case=\"genitive\"\n                     english=\"son\"\n                     mandarin=\"后裔\"\n                     gloss=\"son\"\n                     domain=\"010002\"\n                     ln=\"10.30\"\n                     morph=\"N-GSM\"\n                     unicode=\"υἱοῦ\">υἱοῦ</w>\n                  <w ref=\"MAT 1:1!8\"\n                     after=\".\"\n                     class=\"noun\"\n                     type=\"proper\"\n                     xml:id=\"n40001001008\"\n                     lemma=\"Ἀβραάμ\"\n                     normalized=\"Ἀβραάμ\"\n                     strong=\"11\"\n                     number=\"singular\"\n                     gender=\"masculine\"\n                     case=\"genitive\"\n                     english=\"Abraham\"\n                     mandarin=\"亚伯拉罕\"\n                     gloss=\"of Abraham\"\n                     domain=\"093001\"\n                     ln=\"93.7\"\n                     morph=\"N-PRI\"\n                     unicode=\"Ἀβραάμ.\">Ἀβραάμ</w>\n               </wg>\n            </wg>\n         </wg>\n      </wg>\n   </sentence>";
const _FT11_JAPANESE = {"MAT 1:1!1": "書物", "MAT 1:1!2": "起源", "MAT 1:1!3": "イエス", "MAT 1:1!4": "キリスト", "MAT 1:1!5": "子", "MAT 1:1!6": "ダビデ", "MAT 1:1!7": "子", "MAT 1:1!8": "アブラハム"};


/* Adapter が Tree 生成の唯一の経路（public/core/flow-tree-adapter.js）。
 * このブロックはもう独自の Lowfat 解析ロジックを持たない。 */
function _ft11BuildFlowTree() {
    if (_ft11Cache) return _ft11Cache;
    _ft11Cache = window.App.flowTree.parseLowfatXml(_FT11_SENTENCE_XML, { scopeId: 'MAT#00000' });
    return _ft11Cache;
}

function _ft11SurfaceIndex(ref) {
    // verseId: n{bb:02d}{ch:03d}{vs:03d}{idx:03d} — tokenIndex at chars 9-11
    return (ref && ref.length === 12) ? parseInt(ref.slice(9), 10) : 0;
}
/* label生成処理（Renderer）: NeighborhoodView Model が渡す tokens（未加工・
 * structural order のまま）を受け取り、surface order へ並べ替えてから
 * 既存日本語表示値を連結する。並べ替え・辞書引きは Renderer 側の責務であり、
 * neighborhood-view.js はこれを行わない（flow-tree-representation-schema.md §5）。 */
function _ft11LabelOf(tokens) {
    return tokens.slice().sort((a, b) => _ft11SurfaceIndex(a) - _ft11SurfaceIndex(b))
        .map(ref => _flowTreeJaForRef(ref)).join('');
}
/* SF-32: relation の tokens を「1 token = 1 視覚 chip」で描画する（surface 順）。gloss は既存
 * _flowTreeJaForRef のみ（Reading Engine / naturalize / PresentationPolicy 非経由・新日本語生成
 * なし＝L-0）。gloss 空 token は flat 連結（_ft11LabelOf）でも不可視なので出さない＝表示内容は
 * 不変で「区切り」だけ加わる。interaction は付けない（視覚語彙のみ FLOW と共有）。可視 chip が
 * 無ければ '' を返し、呼び出し側が従来 flat ラベルへフォールバック。 */
function _sfTokenChipsHTML(tokens) {
    if (!Array.isArray(tokens) || !tokens.length) return '';
    const sorted = tokens.slice().sort((a, b) => _ft11SurfaceIndex(a) - _ft11SurfaceIndex(b));
    let out = '';
    for (const ref of sorted) {
        const g = _flowTreeJaForRef(ref);
        if (!g) continue;
        out += `<span class="sf-token-chip">${_escH(g)}</span>`;
    }
    return out;
}
/* label 用の既存日本語表示値を token ref から引く（新規生成・推論はしない）。
   VR-6-C: MAT 1:1 は既存 prototype マップ _FT11_JAPANESE を厳密維持（baseline）、
   それ以外は現在の章キャッシュ _cachedElByVerse（bible_data の既存 japanese 値）を参照。
   見つからなければ ''（Failure Mode: 静かに空・_ft11RenderList が構成語プレースホルダを出す）。 */
function _flowTreeJaForRef(ref) {
    if (_FT11_JAPANESE[ref] != null) return _FT11_JAPANESE[ref];
    const cache = _cachedElByVerse;
    if (cache) {
        for (const v in cache) {
            const arr = cache[v];
            if (!Array.isArray(arr)) continue;
            for (const t of arr) if (t && t.verseId === ref) return t.japanese || '';
        }
    }
    return '';
}
/* SF-11/SF-16: role の生値→表示ラベル（SF-10 §4）。生の s/o/v… は UI に出さない。
   _SF_ROLE_JA は表示ラベルの JA テーブルと同時に「有効 role 判定」の基準テーブルを兼ねる
   （644行: filter で truthiness 判定。JA/EN どちらも同じ 9 キーを持つ）。 */
const _SF_ROLE_JA = { s: '主語', o: '目的語', o2: '第二目的語', io: '間接目的語', v: '動詞', vc: '繋ぎの動詞', p: '補語', adv: '副詞的', aux: '助動詞' };
const _SF_ROLE_EN = { s: 'subject', o: 'object', o2: 'second object', io: 'indirect object', v: 'verb', vc: 'linking verb', p: 'complement', adv: 'adverbial', aux: 'auxiliary' };
const _SF_ROLE_ES = { s: 'sujeto', o: 'objeto', o2: 'segundo objeto', io: 'objeto indirecto', v: 'verbo', vc: 'verbo copulativo', p: 'complemento', adv: 'adverbial', aux: 'auxiliar' };
/* SF-16: Structure Flow 横軸の「表示配置優先順位」（文法的正解語順ではなく UI layout rank）。
 * 原文順は Word Order Flow が担うため、Structure Flow は関係を読みやすい順で並べる。
 * role を持たない語は 8（末尾・元の相対順を維持）。role の推測付与はしない。 */
const _SF_ROLE_RANK = { s: 1, v: 2, vc: 3, p: 4, o: 5, o2: 6, io: 7, adv: 8, aux: 9 };
/* SF-8〜SF-14: focus 中心の関係モデル。構造(parentId/children/order)＋SF-11 搬送の
 * role/frame/referent を「存在する時のみ」読む。SF-14: frame/referent の明示 node-id を
 * band chip index へ写像した edge を作る（focus-incident・同 band・非ゼロ・非文外のみ）。
 * nested target は「その語を含む band chip」へ写像（個別 token へ drill しない）。
 * ὃ→πᾶν 等、データに無い関係は生成しない（L-0）。 */
function _sfRelationModel(nodesById, ref) {
    if (!nodesById || !ref) return null;
    let focus = null;
    for (const id in nodesById) {
        const n = nodesById[id];
        if (n && n.type === 'word' && Array.isArray(n.tokens) && n.tokens[0] === ref) { focus = n; break; }
    }
    if (!focus) return null;
    const parent = focus.parentId != null ? nodesById[focus.parentId] : null;
    if (!parent) return null;
    const sibs0 = Array.isArray(parent.children) ? parent.children : [];
    // SF-16: 横軸を原文順→layout rank 順へ並べ替える（Word Order と役割分離）。
    // stable sort（rank, 元の index）。role 無しは rank 8＝末尾で元順維持（中立順）。
    const _rankOf = (n) => (n && n.role && _SF_ROLE_RANK[n.role]) ? _SF_ROLE_RANK[n.role] : 8;
    const sibs = sibs0.map((s, i) => i)
        .sort((a, b) => (_rankOf(sibs0[a]) - _rankOf(sibs0[b])) || (a - b))
        .map(i => sibs0[i]);
    const focusIdx = sibs.findIndex(s => s.id === focus.id);
    let upper = null;
    if (parent.type !== 'clause') {
        let cur = parent.parentId != null ? nodesById[parent.parentId] : null;
        while (cur) {
            if (cur.type === 'clause') { upper = cur; break; }
            cur = cur.parentId != null ? nodesById[cur.parentId] : null;
        }
    }
    const bandRole = (parent.role && _SF_ROLE_JA[parent.role]) ? parent.role : null;

    // node-id → それを含む band chip の index（文外/写像不能は -1）
    const idxForNode = (id) => {
        const t = nodesById[id];
        if (!t || !Array.isArray(t.tokens) || !t.tokens.length) return -1;
        const r = t.tokens[0];
        return sibs.findIndex(s => Array.isArray(s.tokens) && s.tokens.indexOf(r) !== -1);
    };
    const frameArgIds = (n) => (n && n.frame ? String(n.frame).trim().split(/\s+/) : [])
        .map(p => (/^A\d+:(\S+)$/.exec(p) || [])[1]).filter(Boolean);

    // frame edges（focus-incident・同 band）。edge = {pred, arg}（arrowhead=arg 側）。
    const frameEdges = [];
    const seen = new Set();
    const addEdge = (pred, arg) => {
        if (pred < 0 || arg < 0 || pred === arg) return;
        const k = pred + ':' + arg; if (seen.has(k)) return; seen.add(k); frameEdges.push({ pred, arg });
    };
    if (focusIdx >= 0) {
        // focus が述語 → その項へ
        if ((focus.role === 'v' || focus.role === 'vc')) {
            for (const id of frameArgIds(focus)) {
                if (id === 'n00000000000' || !nodesById[id]) continue;   // ゼロ/文外は接続しない
                addEdge(focusIdx, idxForNode(id));
            }
        }
        // focus が項 → focus を項に持つ同 band 述語へ
        sibs.forEach((s, i) => {
            if (i === focusIdx || !s.frame) return;
            if (frameArgIds(s).indexOf(focus.id) !== -1) addEdge(i, focusIdx);
        });
    }

    // referent edges（同 sentence のみ・別チャネル）＋文外含めた解決語ラベル（縮退注記用・同文のみ）
    const referentEdges = [];
    let referentLabels = null;
    if (focus.referent && focusIdx >= 0) {
        const labels = [];
        for (const id of String(focus.referent).trim().split(/\s+/)) {
            if (id === 'n00000000000') continue;
            const rn = nodesById[id];
            if (!rn) continue;                             // 文外は線もラベルも作らない
            const t = _ft11LabelOf(rn.tokens); if (t) labels.push(t);
            const ti = idxForNode(id);
            if (ti >= 0 && ti !== focusIdx) referentEdges.push({ src: focusIdx, tgt: ti });
        }
        if (labels.length) referentLabels = labels;
    }

    // SF-18: 2段レイアウト。上段=節の核 {s,v,vc}、下段=項 {o,io,p,adv,…}。
    // role のみで段を決める（推測付与しない）。上段/下段が両方揃う時だけ2段化、
    // それ以外（role無し/片方のみ）は単段（SF-16 フォールバック）。
    const _SF_TOP = { s: 1, v: 1, vc: 1 };
    const rows = sibs.map(s => (s && s.role && _SF_TOP[s.role]) ? 't' : 'b');
    const useTwoRow = rows.indexOf('t') !== -1 && rows.indexOf('b') !== -1;

    return { focus, parent, sibs, upper, bandRole, focusIdx, frameEdges, referentEdges, referentLabels, rows, useTwoRow };
}
/* Relation Flow レンダラ（SF-19 縦型）。第1層＝主語＋主動詞（横並び・固定）、
 * その下に「動詞→各項」を縦に1つずつ並べる（CSS の trunk＋横枝）。frame は accent の枝、
 * 主語は第1層配置で表現し線を引かない。nested（項の内部 children）は包含として項の下に別チャネルで表示。
 * referent は同文明示のみ注記。生値・推論・ὃ→πᾶン は出さない。動詞が無い band は単段へフォールバック。 */
/* SF-31: 長主語（子孫に clause を持つ主語）だけ、既存 clause 境界で「最上位 clause 単位」に
   段組みする。各 leaf token を最上位 clause 祖先（無ければ orphan）へ排他的に1回だけ割当て、
   segment 内は surface index 順で既存 japanese 値のみを連結（再生成・並替・語義選択・referent/
   discourse 推定なし＝L-0）。clause を持たない or 単一 segment の主語は null を返し、呼び出し側が
   従来の chip にフォールバック（＝通常ケースは不変）。深い入れ子は最上位 clause で平坦化し、
   多段インデントは作らない（読みやすさ優先）。 */
function _sfSubjectHTML(n) {
    if (!n || !Array.isArray(n.tokens) || !n.tokens.length) return null;
    // leaf word の各 token を「最上位 clause 祖先」の id へ割当て（無ければ null＝orphan）。
    const owner = {};
    (function walk(node, topClause) {
        const tc = topClause || (node.type === 'clause' ? node : null);
        if (node.type === 'word' && Array.isArray(node.tokens)) {
            for (const r of node.tokens) owner[r] = tc ? tc.id : null;
        }
        if (Array.isArray(node.children)) node.children.forEach(c => walk(c, tc));
    })(n, null);
    let hasClause = false;
    for (const r in owner) { if (owner[r] != null) { hasClause = true; break; } }
    if (!hasClause) return null; // clause 無し＝従来 chip
    // surface 順に走査し、owner 単位で排他 bucket 化（clause は非連続 token を1 segment に集約）。
    const toks = n.tokens.slice().sort((a, b) => _ft11SurfaceIndex(a) - _ft11SurfaceIndex(b));
    const segs = []; const bucket = {}; let curNull = null;
    for (const r of toks) {
        const o = owner[r];
        if (o == null) {
            if (!curNull) { curNull = { refs: [] }; segs.push(curNull); }
            curNull.refs.push(r);
        } else {
            curNull = null;
            if (!bucket[o]) { bucket[o] = { refs: [] }; segs.push(bucket[o]); }
            bucket[o].refs.push(r);
        }
    }
    if (segs.length < 2) return null; // 単一 segment＝従来 chip と同義（変化させない）
    const segHTML = segs.map(s => `<span class="sf-subj-seg">${_sfTokenChipsHTML(s.refs) || _escH(_ft11LabelOf(s.refs) || ((typeof window !== 'undefined' && window.I18N && I18N.lang === 'es') ? '(este elemento)' : (typeof window !== 'undefined' && window.I18N && I18N.lang === 'en') ? '(this element)' : '（この構成語）'))}</span>`).join('');
    return `<span class="sf-chip sf-ctx sf-subj-struct">${segHTML}</span>`;
}
function _sfRenderRelationFlow(m) {
    const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
    const _roleTable = (window.I18N && I18N.lang === 'es') ? _SF_ROLE_ES : _isEn ? _SF_ROLE_EN : _SF_ROLE_JA;
    const roleLabel = (n) => (n && n.role && _roleTable[n.role]) ? _roleTable[n.role] : '';
    const _placeholder = (window.I18N && I18N.lang === 'es') ? '(este elemento)' : _isEn ? '(this element)' : '（この構成語）';
    const chip = (n, isF) => {
        // SF-32: 3 token 以上の relation のみ per-token chip 化（2 token 以下は「境目なし連結」問題が
        // 実質なく、chip 化は幅増→枝圧迫の副作用のみのため従来 flat を維持＝C7/通常ケース不変）。
        const per = (Array.isArray(n.tokens) && n.tokens.length >= 3) ? _sfTokenChipsHTML(n.tokens) : '';
        const inner = per || _escH(_ft11LabelOf(n.tokens) || _placeholder);
        return `<span class="sf-chip ${isF ? 'is-focus' : 'sf-ctx'}">${inner}</span>`;
    };
    const bandLabel = m.bandRole ? _roleTable[m.bandRole] : null;
    const _capBase = _isEn ? 'the containing group' : '所属するまとまり';
    const cap = bandLabel
        ? `${_capBase}<span class="sf-caprole"> · ${_escH(bandLabel)}</span>`
        : _capBase;
    const refNote = m.referentLabels
        ? `<div class="sf-ref-note sf-show"><span class="sf-note-h">${_isEn ? 'co-reference' : '共参照'}</span>${m.referentLabels.map(_escH).join(_isEn ? ', ' : '、')}</div>`
        : '';
    const _upperLabel = _isEn ? 'enclosing clause' : '上位';
    const upperHtml = m.upper
        ? `<div class="sf-rel-link"></div><div class="sf-rel-band"><span class="sf-cap">${_upperLabel}</span>${chip(m.upper, false)}</div>`
        : '';

    const TOP = { s: 1, v: 1, vc: 1 };
    const verbIdx = m.sibs.findIndex(s => s.role === 'v' || s.role === 'vc');

    // フォールバック（主動詞なし＝role無し band 等）: SF-16 単段（役割整列のみ）。
    if (verbIdx < 0) {
        const col = (n) => {
            const isF = n.id === m.focus.id; const rj = roleLabel(n);
            return `<span class="sf-col"><span class="sf-role-cap${isF && rj ? ' is-focus' : ''}">${_escH(rj)}</span>${chip(n, isF)}</span>`;
        };
        const cols = m.sibs.length ? m.sibs.map(col).join('') : col(m.focus);
        return `<div class="sf-rel"><div class="sf-rel-focusband"><span class="sf-cap">${cap}</span><div class="sf-rel-row">${cols}</div></div>${upperHtml}${refNote}</div>`;
    }

    // 第1層 col（role を chip の上に）。
    const l1col = (n) => {
        const isF = n.id === m.focus.id; const rj = roleLabel(n);
        return `<span class="sf-col"><span class="sf-role-cap${isF && rj ? ' is-focus' : ''}">${_escH(rj)}</span>${chip(n, isF)}</span>`;
    };
    const subjIdx = m.sibs.findIndex(s => s.role === 's');
    const verbSib = m.sibs[verbIdx];
    // SF-31: 主語が子孫 clause を持つ長主語のみ構造段組み。それ以外は従来 chip（l1col）で不変。
    const subjHtml = (() => {
        if (subjIdx < 0) return '';
        const sn = m.sibs[subjIdx];
        const struct = _sfSubjectHTML(sn);
        if (!struct) return l1col(sn);
        const isF = sn.id === m.focus.id; const rj = roleLabel(sn);
        return `<span class="sf-col"><span class="sf-role-cap${isF && rj ? ' is-focus' : ''}">${_escH(rj)}</span>${struct}</span>`;
    })();

    // 枝に載せる下段 sib。focus が第1層(主語/動詞)なら全ての下段 role sib、
    // focus が項ならその focus のみ（無理に他項を出さない＝focus-incident 維持）。
    const focusL1 = !!(m.focus.role && TOP[m.focus.role]);
    const branchIdxs = focusL1
        ? m.sibs.map((s, i) => i).filter(i => m.sibs[i].role && !TOP[m.sibs[i].role])
        : [m.focusIdx];
    const hasFrameTo = (argIdx) => m.frameEdges.some(e => e.pred === verbIdx && e.arg === argIdx);

    /* SF-27: 枝ラベルのみ、極端に長い従属節を表示上「先頭＋…」へ切り詰める（段落化を防ぎ
       "構造上の枝ラベル" として走査可能にする）。閾値 SF_BRANCH_MAX は SF-26 の実測に基づく
       （360px の 1 行 ≈ 20〜22 日本語字 → 約2行分＝40字）。短/中枝（C1/C3/C6=23字/C7=30字）は
       全文のまま、E1（137字/6行）型のみ短縮。data / Japanese / role / frame / referent は不変
       （表示文字列のみ・推論なし＝L-0 安全）。第1層(主語+動詞)・上位は対象外。 */
    const SF_BRANCH_MAX = 40;
    // SF-27/SF-33: 枝領域の relation ラベル共通の表示上限（先頭 SF_BRANCH_MAX 字＋…）。表示文字列を
    // 切るだけ（既存 japanese のみ・推論/再生成なし＝L-0）。branchChip と nested-item で共有する。
    const _sfTrunc = (s) => (s && s.length > SF_BRANCH_MAX) ? s.slice(0, SF_BRANCH_MAX) + '…' : s;
    // SF-35: 枝/nested 内容の語境界を可視化。40字以内（＝truncation 非発生）は既存 per-token gap
    //   (_sfTokenChipsHTML＝.sf-token-chip の spacing) で語間を表示。40字超は既存 SF-27 truncation を
    //   「一切変更せず」そのまま維持（gap と 40字 truncation は同一枝で同時発生しない＝新しい truncation
    //   仕様を作らない）。表示は既存 gloss のみ・token 順序/gloss/role 不変＝L-0。branchChip と nested で共有。
    const _sfContent = (tokens, placeholder) => {
        const full = _ft11LabelOf(tokens) || (placeholder || '');
        if (full.length <= SF_BRANCH_MAX) return _sfTokenChipsHTML(tokens) || _escH(full);
        // SF-37: >40字 は char slice せず token 境界で表示する。surface 順に累積 gloss 長が
        //   SF_BRANCH_MAX(=budget) を超えない範囲で token を per-token gap 表示し、残余 token が
        //   あれば「…」を preview marker として付す。token 途中切断・bracket 分断ゼロ（F2 解消）・
        //   gap 維持（F1 解消）。表示は既存 gloss のみ・surface 順・… は非 token＝L-0。
        const sorted = tokens.slice().sort((a, b) => _ft11SurfaceIndex(a) - _ft11SurfaceIndex(b));
        let acc = 0, out = '', omitted = false;
        for (const ref of sorted) {
            const g = _flowTreeJaForRef(ref);
            if (!g) continue;
            if (acc > 0 && acc + g.length > SF_BRANCH_MAX) { omitted = true; break; }
            out += `<span class="sf-token-chip">${_escH(g)}</span>`;
            acc += g.length;
        }
        if (omitted) out += `<span class="sf-token-chip">…</span>`;
        return out || _escH(full);
    };
    const branchChip = (n, isF) =>
        `<span class="sf-chip ${isF ? 'is-focus' : 'sf-ctx'}">${_sfContent(n.tokens, _placeholder)}</span>`;
    const branchHtml = branchIdxs.map(bi => {
        const n = m.sibs[bi]; const isF = n.id === m.focus.id; const rj = roleLabel(n);
        const frameCls = hasFrameTo(bi) ? ' sf-frame' : '';
        // nested: 項の直接の子のうち role を持つもの（1階層・包含・別チャネル）。存在データのみ。
        const kids = Array.isArray(n.children) ? n.children.filter(c => c && c.role && _SF_ROLE_JA[c.role]) : [];
        const nested = kids.length
            ? `<div class="sf-nested">${kids.map(c => `<div class="sf-nested-item"><span class="sf-branch-role">${_escH(_roleTable[c.role] || '')}</span>${_sfContent(c.tokens, '')}</div>`).join('')}</div>`
            : '';
        return `<div class="sf-branch${frameCls}"><span class="sf-branch-role">${_escH(rj)}</span>${branchChip(n, isF)}${nested}</div>`;
    }).join('');
    const branches = branchHtml ? `<div class="sf-branches">${branchHtml}</div>` : '';

    const html = `<div class="sf-rel-focusband sf-vert">`
        + `<span class="sf-cap">${cap}</span>`
        + `<div class="sf-l1">${subjHtml}<span class="sf-verb-wrap">${l1col(verbSib)}${branches}</span></div>`
        + `</div>`;
    return `<div class="sf-rel">${html}${upperHtml}${refNote}</div>`;
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

/* NeighborhoodView を既存 StudyPanel（word モード）へ差し込むための HTML を返す。
 * neighborhood-view-design.md の方針通り、実際の兄弟関係を "children" と
 * 詐称しない: anchor（所属clause、無ければ sentence root）の直接の子を、
 * 対象語自身を含めてそのまま列挙する。role/rule/class/type は出力しない
 * （neighborhood-view-design.md §6）。対象外の ref では空文字列を返す。 */
function _flowTreeParseRef(ref) {
    const m = /^(\S+)\s+(\d+):(\d+)!(\d+)$/.exec(ref || '');
    return m ? { book: m[1], chapter: parseInt(m[2], 10) } : null;
}
function _flowTreeRootForRef(chapterData, verseId) {
    if (!chapterData || !chapterData.nodeIndex || !Array.isArray(chapterData.sentences)) return null;
    const idx = chapterData.nodeIndex[verseId];
    if (idx == null) return null;
    return chapterData.sentences[idx] || null;
}
function _flowTreeNodesById(root) {
    const map = {};
    (function walk(n) { if (!n || !n.id) return; map[n.id] = n; (n.children || []).forEach(walk); })(root);
    return map;
}

/* NeighborhoodView を既存 StudyPanel（word モード）へ差し込むための HTML を返す。
 * neighborhood-view-design.md の方針通り、実際の兄弟関係を "children" と
 * 詐称しない: anchor（所属clause、無ければ sentence root）の直接の子を、
 * 対象語自身を含めてそのまま列挙する。role/rule/class/type は出力しない
 * （neighborhood-view-design.md §6）。
 * VR-6-C: MAT 1:1 は既存 inline prototype（オフライン・baseline byte 不変）、
 * それ以外は VR-6-B の runtime asset から所属 sentence tree を取得して一般化する。
 * 取得不能・focus 不在等はすべて '' を返し既存表示に影響しない（L-0: 推論しない）。 */
async function _buildFlowTreeNeighborhoodViewHTML(ref, verseId) {
    try {
        if (!ref) return '';
        const _isEn = typeof window !== 'undefined' && window.I18N && I18N.lang === 'en';
        let representation;
        let noteSuffix = '';
        if (ref.indexOf('MAT 1:1!') === 0) {
            // baseline: 既存 inline prototype をそのまま使用（fetch 依存なし・出力不変）
            representation = _ft11BuildFlowTree();
            noteSuffix = _isEn ? ' · Prototype / Matthew 1:1 only' : '・Prototype／Matthew 1:1 のみ';
        } else {
            const p = _flowTreeParseRef(ref);
            if (!p) return '';
            const chapterData = await _loadFlowTreeChapter(p.book, p.chapter);
            const root = _flowTreeRootForRef(chapterData, verseId);
            if (!root) return '';
            representation = { root, nodesById: _flowTreeNodesById(root) };
        }
        if (!representation) return '';

        // NeighborhoodView が構成語群抽出の唯一の経路（public/core/neighborhood-view.js）。
        // focus探索・anchor探索（type='clause' 祖先 + sentence root fallback）・
        // expanded判定・constituent抽出は全てここに委譲する。
        const nv = window.App.neighborhoodView.buildNeighborhoodView(representation, ref);
        if (!nv) return '';

        // SF-8: focus 中心の関係を既存 representation.nodesById から薄く抽出して描画する。
        // buildNeighborhoodView は経路維持と fallback 判定のために呼ぶ（上の nv）。
        const relModel = _sfRelationModel(representation.nodesById, verseId || ref);
        if (!relModel) return '';
        const listHTML = _sfRenderRelationFlow(relModel);
        const originNote = _isEn
            ? (nv.usedFallback ? 'No parent clause found — showing from the sentence root' : 'Showing the groups around this word')
            : (nv.usedFallback ? '所属節なし → 文全体を基準に表示' : 'この語を中心に、前後・所属・上位のまとまりを表示');

        return `
        <details class="rn-level-section" id="rn-flowtree-neighborhood">
            <summary><span class="rn-level-arrow">${icon('chevronRight')}</span>${_isEn ? 'See how this sentence is built' : '文の組み立てを見る'}</summary>
            <div class="rn-level-body">
                <div class="sf-flow">${listHTML}</div>
            </div>
        </details>`;
    } catch (_) {
        return ''; // Failure Mode: 例外は握りつぶし、既存表示のまま
    }
}

async function _buildPhraseReadingHTML(words, idx) {
    const proj = await _getReadingSupportProjection(words);
    if (!proj) return null;
    const _isEn = window.I18N && I18N.lang === 'en';

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
