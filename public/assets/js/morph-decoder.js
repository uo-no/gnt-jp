/**
 * morph-decoder.js — 統一形態論デコーダ
 *
 * 供給: decodeMorph / entryPosCode / normalizeClass
 * 消費: syntax-analyzer.js / index.html / search-tool.html
 *
 * 設計方針:
 *   - pos は entryPosCode 方式（normalizeClass → CLASS_TO_POS の単一文字コード）。
 *   - 格・数・性のフォールバック: morph 文字列パースで埋まらない場合は
 *     bible_data の構造化フィールド（token.case / .number / .gender）で補う。
 *   - PRT-N（否定粒子）には格を付けない（粒子に格なしがデータの意味論）。
 *   - morph が null / undefined の場合は例外を投げず {} を返す。
 *   - object 形式の morph に対応する。
 *   - '-' を空文字に正規化する。
 *   - 時制・態・法のコード表は全旧実装と完全一致。
 */

// =============================================================
// § 1. 品詞コード表
// =============================================================

// NT (MACULA) の短縮形を正規化する。LXX の長形式はそのまま CLASS_TO_POS へ。
const _SHORT_CLASS = {
    adj:  'adjective',
    det:  'article',        // NT determiner = article
    prep: 'preposition',
    conj: 'conjunction',
    adv:  'adverb',
    pron: 'pronoun',
    ptcl: 'particle',
    num:  'numeral',
    intj: 'interjection',
};

function normalizeClass(c) {
    return _SHORT_CLASS[c] || c;
}

// 12 項目（現行各表の欠落を補った完全版）。
// 値は syntax-registry.json の pos_codes を基準とし、X は syntax-analyzer.js の
// _resolveEntryPos と一致させる（PRT / INJ / PART のフォールバックコード）。
const CLASS_TO_POS = {
    verb:              'V',
    noun:              'N',
    adjective:         'A',
    article:           'T',
    preposition:       'P',
    conjunction:       'C',
    adverb:            'D',
    particle:          'X',
    pronoun:           'D',   // 人称・指示代名詞の総称。'P'（前置詞）との衝突を回避。
    'relative pronoun': 'R',
    numeral:           '',    // 数詞は pos 相当なし
    interjection:      'X',   // 感嘆詞は particle に近い
};

// =============================================================
// § 2. 形態コード表（時制・態・法・格・数・性）
//     全旧実装と完全一致。ここは変更しない。
// =============================================================

const _TENSE_CODE  = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect', Z:'pluperfect' };
const _VOICE_CODE  = { A:'active', M:'middle', P:'passive', D:'middle deponent', E:'middle or passive', N:'middle or passive' };
const _MOOD_CODE   = { I:'indicative', S:'subjunctive', O:'optative', M:'imperative', N:'infinitive', P:'participle' };
const _CASE_CODE   = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const _NUMBER_CODE = { S:'singular', P:'plural' };
const _GENDER_CODE = { M:'masculine', F:'feminine', N:'neuter' };

// =============================================================
// § 3. entryPosCode — 単一文字品詞コードの解決
// =============================================================

/**
 * token から正規化された単一文字品詞コードを返す。
 * morph 文字列フォールバックなし（spec §3）。
 *
 * @param {object} e - bible_data token
 * @returns {string} - 単一文字コード（'V'|'N'|'A'|'T'|'P'|'C'|'D'|'R'|'X'|''）
 */
function entryPosCode(e) {
    if (!e || typeof e !== 'object') return '';
    if (e.pos) {
        const p = String(e.pos).replace(/-$/, '').toUpperCase();
        // 単一文字なら直接返す
        if (p.length === 1) return p;
    }
    if (e.class) {
        return CLASS_TO_POS[normalizeClass(String(e.class).toLowerCase())] ?? '';
    }
    return '';
}

// =============================================================
// § 4. decodeMorph — 統一形態論デコーダ本体
// =============================================================

/**
 * bible_data token から形態論情報を展開する。
 *
 * @param {object|null|undefined} e - bible_data token
 * @returns {{ pos, tense, voice, mood, case, number, gender, person }}
 */
function decodeMorph(e) {
    // エッジ: null / undefined / 非オブジェクト → {}（例外なし）
    if (!e || typeof e !== 'object') return {};

    const n = v => (!v || v === '-') ? '' : v;  // '-' 正規化

    const pos = entryPosCode(e);
    // PRT-N 仕様: class='ptcl'/'particle' → pos='X' → 格なし
    const isParticle = (pos === 'X');

    // ── Branch 1: 構造化フィールドあり（NT tokens: tense/mood/voice が直接存在） ──
    if (e.tense || e.mood || e.voice) {
        return {
            pos,
            tense:  n(e.tense),
            voice:  n(e.voice),
            mood:   n(e.mood),
            case:   isParticle ? '' : n(e.case),
            number: n(e.number),
            gender: n(e.gender),
            person: n(e.person),
        };
    }

    // ── Branch 2: object 形式の morph ──
    if (e.morph && typeof e.morph === 'object') {
        const m = e.morph;
        return {
            pos,
            tense:  n(m.tense),
            voice:  n(m.voice),
            mood:   n(m.mood),
            case:   isParticle ? '' : n(m.case),
            number: n(m.number),
            gender: n(m.gender),
            person: n(m.person),
        };
    }

    // ── Branch 3: morph 文字列パース（LXX tokens など） ──
    const raw = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const morphPosRaw = n(parts[0] || '').replace(/-$/, '');

    // 動詞フォーム（morphPos='V'）
    if (morphPosRaw.toUpperCase() === 'V' && parts[1]) {
        const seg = parts[1];
        const off = /^[0-9]/.test(seg) ? 1 : 0;
        return {
            pos,
            tense:  _TENSE_CODE[seg[off]]     || '',
            voice:  _VOICE_CODE[seg[off + 1]] || '',
            mood:   _MOOD_CODE[seg[off + 2]]  || '',
            person: seg[off + 3]              || '',
            number: _NUMBER_CODE[seg[off + 4]] || '',
            gender: '',
            case:   '',
        };
    }

    // 名詞・形容詞・冠詞フォーム（格・数・性）
    if (parts[1]) {
        const seg = parts[1];
        const hp = ['1', '2', '3'].includes(seg[0]);
        const b = hp ? seg.slice(1) : seg;
        const parsedCase   = isParticle ? '' : (_CASE_CODE[b[0]]   || '');
        const parsedNumber = _NUMBER_CODE[b[1]] || '';
        const parsedGender = _GENDER_CODE[b[2]] || '';
        return {
            pos,
            tense:  '',
            voice:  '',
            mood:   '',
            person: hp ? seg[0] : '',
            // フォールバック: パースで埋まらない場合は構造化フィールドで補う（spec §2）
            case:   isParticle ? '' : (parsedCase   || n(e.case)),
            number: parsedNumber || n(e.number),
            gender: parsedGender || n(e.gender),
        };
    }

    // 最終フォールバック: 構造化フィールドをそのまま使う（spec §2）
    return {
        pos,
        tense:  '',
        voice:  '',
        mood:   '',
        case:   isParticle ? '' : n(e.case),
        number: n(e.number),
        gender: n(e.gender),
        person: n(e.person),
    };
}

// =============================================================
// § 5. エクスポート（ブラウザ / Node.js 共用）
// =============================================================

if (typeof window !== 'undefined') {
    window.decodeMorph    = decodeMorph;
    window.entryPosCode   = entryPosCode;
    window.normalizeClass = normalizeClass;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { decodeMorph, entryPosCode, normalizeClass, CLASS_TO_POS };
}
