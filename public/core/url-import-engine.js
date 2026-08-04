/**
 * url-import-engine.js
 * URL Import Engine
 *
 * 目的:  外部の聖書Webサービスで表示中のURLを解析し、
 *         book / chapter / verse へ変換する（読書中の場所をそのまま引き継ぐため）。
 * 責務:  URL文字列 → { book, chapter, verse } | null の変換のみ。
 *         遷移・表示・DOM操作は呼び出し側（index.html）が行う。
 * 制約:  DOM / window に依存しない（Node.js 単体で動作する純関数）。
 *         対応サイトを増やす場合は SITE_PARSERS に解析関数を追加するだけでよい。
 * バージョン: 1.0.0
 */

'use strict';

// =============================================================
// § 1.  書物名解決テーブル（内部キー ← 英語の書物名・略称）
//       内部キーは SB_BOOKS（index.html）と同一の3文字キー。
//       対応サイトが増えても、この表だけを参照すればよい。
// =============================================================

const BOOK_NAME_ALIASES = [
    ['MAT', ['matthew', 'matt', 'mt']],
    ['MRK', ['mark', 'mk']],
    ['LUK', ['luke', 'lk']],
    ['JHN', ['john', 'jn']],
    ['ACT', ['acts', 'act']],
    ['ROM', ['romans', 'rom']],
    ['1CO', ['1 corinthians', '1 cor', '1cor']],
    ['2CO', ['2 corinthians', '2 cor', '2cor']],
    ['GAL', ['galatians', 'gal']],
    ['EPH', ['ephesians', 'eph']],
    ['PHP', ['philippians', 'phil', 'php']],
    ['COL', ['colossians', 'col']],
    ['1TH', ['1 thessalonians', '1 thess', '1thess']],
    ['2TH', ['2 thessalonians', '2 thess', '2thess']],
    ['1TI', ['1 timothy', '1 tim', '1tim']],
    ['2TI', ['2 timothy', '2 tim', '2tim']],
    ['TIT', ['titus', 'tit']],
    ['PHM', ['philemon', 'phlm', 'phm']],
    ['HEB', ['hebrews', 'heb']],
    ['JAS', ['james', 'jas']],
    ['1PE', ['1 peter', '1 pet', '1pet']],
    ['2PE', ['2 peter', '2 pet', '2pet']],
    ['1JN', ['1 john', '1 jn', '1jn']],
    ['2JN', ['2 john', '2 jn', '2jn']],
    ['3JN', ['3 john', '3 jn', '3jn']],
    ['JUD', ['jude']],
    ['REV', ['revelation', 'rev']],
    ['GEN', ['genesis', 'gen']],
    ['EXO', ['exodus', 'exod', 'ex']],
    ['LEV', ['leviticus', 'lev']],
    ['NUM', ['numbers', 'num']],
    ['DEU', ['deuteronomy', 'deut', 'dt']],
    ['JOS', ['joshua', 'josh']],
    ['JDG', ['judges', 'judg']],
    ['RUT', ['ruth']],
    ['1SA', ['1 samuel', '1 sam', '1sam']],
    ['2SA', ['2 samuel', '2 sam', '2sam']],
    ['1KI', ['1 kings', '1 kgs', '1kgs']],
    ['2KI', ['2 kings', '2 kgs', '2kgs']],
    ['1CH', ['1 chronicles', '1 chr', '1chr']],
    ['2CH', ['2 chronicles', '2 chr', '2chr']],
    ['EZR', ['ezra']],
    ['NEH', ['nehemiah', 'neh']],
    ['EST', ['esther', 'esth']],
    ['JOB', ['job']],
    ['PSA', ['psalm', 'psalms', 'ps']],
    ['PRO', ['proverbs', 'prov']],
    ['ECC', ['ecclesiastes', 'eccl']],
    ['SNG', ['song of solomon', 'song of songs', 'canticles', 'song']],
    ['ISA', ['isaiah', 'isa']],
    ['JER', ['jeremiah', 'jer']],
    ['LAM', ['lamentations', 'lam']],
    ['EZK', ['ezekiel', 'ezek']],
    ['DAN', ['daniel', 'dan']],
    ['HOS', ['hosea', 'hos']],
    ['JOL', ['joel']],
    ['AMO', ['amos']],
    ['OBA', ['obadiah', 'obad']],
    ['JON', ['jonah']],
    ['MIC', ['micah', 'mic']],
    ['NAH', ['nahum', 'nah']],
    ['HAB', ['habakkuk', 'hab']],
    ['ZEP', ['zephaniah', 'zeph']],
    ['HAG', ['haggai', 'hag']],
    ['ZEC', ['zechariah', 'zech']],
    ['MAL', ['malachi', 'mal']],
];

function _normalizeBookName(name) {
    return String(name || '')
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

const BOOK_NAME_TO_KEY = new Map();
for (const [key, aliases] of BOOK_NAME_ALIASES) {
    for (const alias of aliases) {
        BOOK_NAME_TO_KEY.set(_normalizeBookName(alias), key);
    }
}

function _resolveBookKey(name) {
    return BOOK_NAME_TO_KEY.get(_normalizeBookName(name)) || null;
}

// =============================================================
// § 2.  箇所文字列（例: "1 Corinthians 13:4-7"）→ book/chapter/verse
// =============================================================

/* 「(数字+空白省略可)書物名 章[:節[-節]]」形式を解析する。
   複数箇所（; , 区切り）は先頭のみを採用する。範囲指定は開始節のみ採用する。 */
function _parsePassageRef(raw) {
    if (!raw) return null;
    const first = String(raw).split(/[;,]/)[0].trim();
    const m = first.match(/^((?:[1-3]\s+)?[A-Za-z][A-Za-z\s]*?)\s+(\d{1,3})(?::(\d{1,3}))?/);
    if (!m) return null;

    const book = _resolveBookKey(m[1]);
    if (!book) return null;

    return {
        book,
        chapter: parseInt(m[2], 10),
        verse: m[3] ? parseInt(m[3], 10) : null,
    };
}

// =============================================================
// § 3.  サイト別パーサー
//       各関数は URL オブジェクトを受け取り、非対応なら null を返す。
//       サイト追加時はここへ解析関数を1つ足し、SITE_PARSERS へ登録するだけでよい。
// =============================================================

/* BibleGateway: https://www.biblegateway.com/passage/?search=John+3%3A16&version=NIV */
function _parseBibleGateway(url) {
    if (!/(^|\.)biblegateway\.com$/i.test(url.hostname)) return null;
    const search = url.searchParams.get('search');
    if (!search) return null;
    return _parsePassageRef(search);
}

const SITE_PARSERS = [
    _parseBibleGateway,
];

// =============================================================
// § 4.  公開API
// =============================================================

/**
 * 外部聖書サイトのURLを解析し、book/chapter/verseへ変換する。
 * @param {string} rawUrl
 * @returns {{book: string, chapter: number, verse: (number|null)}|null}
 *          対応していないURL・解析失敗時は null。
 */
function parseBibleUrl(rawUrl) {
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) return null;

    let url;
    try {
        url = new URL(rawUrl);
    } catch (_) {
        return null;
    }

    for (const parse of SITE_PARSERS) {
        try {
            const result = parse(url);
            if (result) return result;
        } catch (_) {
            /* 個別サイトの解析失敗は次のパーサーへフォールスルーする（例外を外へ漏らさない） */
        }
    }
    return null;
}

// =============================================================
// § 5.  エクスポート
// =============================================================

if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.urlImport = { parseBibleUrl };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseBibleUrl };
}
