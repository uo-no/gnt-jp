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
 *         書物名（日本語含む）を増やす場合は BOOK_NAME_ALIASES に追加するだけでよい。
 *         比較対象（逆方向URL生成）を増やす場合は COMPARE_TARGET_GENERATORS に
 *         生成関数を追加するだけでよい（呼び出し側=UIはtargetIdしか知らない）。
 * バージョン: 1.5.0（比較対象=targetId方式の逆方向URL生成 generateExternalUrl 対応）
 */

'use strict';

// =============================================================
// § 1.  書物名解決テーブル（内部キー ← 英語/日本語の書物名・略称）
//       内部キーは SB_BOOKS（index.html）と同一の3文字キー。
//       日本語エイリアスは index.html の SB_BOOKS.name / BOOK_SHORT と
//       同一の表記を転記したもの（新たな訳語は作らない）。
//       対応サイト・対応言語が増えても、この表だけを参照すればよい。
// =============================================================

const BOOK_NAME_ALIASES = [
    ['MAT', ['matthew', 'matt', 'mt', 'マタイ', 'マタイの福音書']],
    ['MRK', ['mark', 'mk', 'マルコ', 'マルコの福音書']],
    ['LUK', ['luke', 'lk', 'ルカ', 'ルカの福音書']],
    ['JHN', ['john', 'jn', 'ヨハネ', 'ヨハネの福音書']],
    ['ACT', ['acts', 'act', '使徒', '使徒の働き']],
    ['ROM', ['romans', 'rom', 'ローマ', 'ローマ人への手紙']],
    ['1CO', ['1 corinthians', '1 cor', '1cor', 'Ⅰコリント', 'コリント人への手紙 第一']],
    ['2CO', ['2 corinthians', '2 cor', '2cor', 'Ⅱコリント', 'コリント人への手紙 第二']],
    ['GAL', ['galatians', 'gal', 'ガラテヤ', 'ガラテヤ人への手紙']],
    ['EPH', ['ephesians', 'eph', 'エペソ', 'エペソ人への手紙']],
    ['PHP', ['philippians', 'phil', 'php', 'ピリピ', 'ピリピ人への手紙']],
    ['COL', ['colossians', 'col', 'コロサイ', 'コロサイ人への手紙']],
    ['1TH', ['1 thessalonians', '1 thess', '1thess', 'Ⅰテサロニケ', 'テサロニケ人への手紙 第一']],
    ['2TH', ['2 thessalonians', '2 thess', '2thess', 'Ⅱテサロニケ', 'テサロニケ人への手紙 第二']],
    ['1TI', ['1 timothy', '1 tim', '1tim', 'Ⅰテモテ', 'テモテへの手紙 第一']],
    ['2TI', ['2 timothy', '2 tim', '2tim', 'Ⅱテモテ', 'テモテへの手紙 第二']],
    ['TIT', ['titus', 'tit', 'テトス', 'テトスへの手紙']],
    ['PHM', ['philemon', 'phlm', 'phm', 'ピレモン', 'ピレモンへの手紙']],
    ['HEB', ['hebrews', 'heb', 'ヘブル', 'ヘブル人への手紙']],
    ['JAS', ['james', 'jas', 'ヤコブ', 'ヤコブの手紙']],
    ['1PE', ['1 peter', '1 pet', '1pet', 'Ⅰペテロ', 'ペテロの手紙 第一']],
    ['2PE', ['2 peter', '2 pet', '2pet', 'Ⅱペテロ', 'ペテロの手紙 第二']],
    ['1JN', ['1 john', '1 jn', '1jn', 'Ⅰヨハネ', 'ヨハネの手紙 第一']],
    ['2JN', ['2 john', '2 jn', '2jn', 'Ⅱヨハネ', 'ヨハネの手紙 第二']],
    ['3JN', ['3 john', '3 jn', '3jn', 'Ⅲヨハネ', 'ヨハネの手紙 第三']],
    ['JUD', ['jude', 'ユダ', 'ユダの手紙']],
    ['REV', ['revelation', 'rev', '黙示録']],
    ['GEN', ['genesis', 'gen', '創世記']],
    ['EXO', ['exodus', 'exod', 'ex', '出エジプト', '出エジプト記']],
    ['LEV', ['leviticus', 'lev', 'レビ', 'レビ記']],
    ['NUM', ['numbers', 'num', '民数', '民数記']],
    ['DEU', ['deuteronomy', 'deut', 'dt', '申命', '申命記']],
    ['JOS', ['joshua', 'josh', 'ヨシュア', 'ヨシュア記']],
    ['JDG', ['judges', 'judg', '士師', '士師記']],
    ['RUT', ['ruth', 'ルツ', 'ルツ記']],
    ['1SA', ['1 samuel', '1 sam', '1sam', 'Ⅰサムエル', 'サムエル記 第一']],
    ['2SA', ['2 samuel', '2 sam', '2sam', 'Ⅱサムエル', 'サムエル記 第二']],
    ['1KI', ['1 kings', '1 kgs', '1kgs', 'Ⅰ列王', '列王記 第一']],
    ['2KI', ['2 kings', '2 kgs', '2kgs', 'Ⅱ列王', '列王記 第二']],
    ['1CH', ['1 chronicles', '1 chr', '1chr', 'Ⅰ歴代', '歴代誌 第一']],
    ['2CH', ['2 chronicles', '2 chr', '2chr', 'Ⅱ歴代', '歴代誌 第二']],
    ['EZR', ['ezra', 'エズラ', 'エズラ記']],
    ['NEH', ['nehemiah', 'neh', 'ネヘミヤ', 'ネヘミヤ記']],
    ['EST', ['esther', 'esth', 'エステル', 'エステル記']],
    ['JOB', ['job', 'ヨブ', 'ヨブ記']],
    ['PSA', ['psalm', 'psalms', 'ps', '詩篇']],
    ['PRO', ['proverbs', 'prov', '箴言']],
    ['ECC', ['ecclesiastes', 'eccl', '伝道', '伝道者の書']],
    ['SNG', ['song of solomon', 'song of songs', 'canticles', 'song', '雅歌']],
    ['ISA', ['isaiah', 'isa', 'イザヤ', 'イザヤ書']],
    ['JER', ['jeremiah', 'jer', 'エレミヤ', 'エレミヤ書']],
    ['LAM', ['lamentations', 'lam', '哀歌']],
    ['EZK', ['ezekiel', 'ezek', 'エゼキエル', 'エゼキエル書']],
    ['DAN', ['daniel', 'dan', 'ダニエル', 'ダニエル書']],
    ['HOS', ['hosea', 'hos', 'ホセア', 'ホセア書']],
    ['JOL', ['joel', 'ヨエル', 'ヨエル書']],
    ['AMO', ['amos', 'アモス', 'アモス書']],
    ['OBA', ['obadiah', 'obad', 'オバデヤ', 'オバデヤ書']],
    ['JON', ['jonah', 'ヨナ', 'ヨナ書']],
    ['MIC', ['micah', 'mic', 'ミカ', 'ミカ書']],
    ['NAH', ['nahum', 'nah', 'ナホム', 'ナホム書']],
    ['HAB', ['habakkuk', 'hab', 'ハバクク', 'ハバクク書']],
    ['ZEP', ['zephaniah', 'zeph', 'ゼパニヤ', 'ゼパニヤ書']],
    ['HAG', ['haggai', 'hag', 'ハガイ', 'ハガイ書']],
    ['ZEC', ['zechariah', 'zech', 'ゼカリヤ', 'ゼカリヤ書']],
    ['MAL', ['malachi', 'mal', 'マラキ', 'マラキ書']],
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
    /* 内部キー自身も別名として登録する（USFM準拠の3文字コードをそのままパスに
       使うサイト向け。例: PRS.app の "jhn" → JHN）。66書とも一意なため衝突しない。 */
    BOOK_NAME_TO_KEY.set(_normalizeBookName(key), key);
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

/* 書物名の文字クラス。英字に加え、日本語書名を構成するひらがな・カタカナ・漢字・
   （Ⅰ/Ⅱ/Ⅲ等の）ローマ数字を許可する（BOOK_NAME_ALIASESの日本語エイリアスに合わせる）。 */
const _BOOK_NAME_CHARS = 'A-Za-z\\u3040-\\u30FF\\u4E00-\\u9FFF\\u2160-\\u2169';

/* 「(数字+空白省略可)書物名 章[:節[-節]]」形式を解析する。
   複数箇所（; , 区切り）は先頭のみを採用する。範囲指定は開始節のみ採用する。 */
function _parsePassageRef(raw) {
    if (!raw) return null;
    const first = String(raw).split(/[;,]/)[0].trim();
    const pattern = new RegExp(
        `^((?:[1-3]\\s+)?[${_BOOK_NAME_CHARS}][${_BOOK_NAME_CHARS}\\s]*?)\\s+(\\d{1,3})(?::(\\d{1,3}))?`
    );
    const m = first.match(pattern);
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

/* PRS.app: https://prs.app/ja/bible/jhn.1.jdb （末尾の16.jdbのように節を含む場合もある）
   パスの書物コードはUSFM準拠の3文字（内部キーと同一・大小区別なし）。 */
function _parsePRS(url) {
    if (!/(^|\.)prs\.app$/i.test(url.hostname)) return null;
    const m = url.pathname.match(/^\/[a-z]{2}\/bible\/([a-z0-9]+)\.(\d{1,3})(?:\.(\d{1,3}))?\.[a-z0-9]+$/i);
    if (!m) return null;

    const book = _resolveBookKey(m[1]);
    if (!book) return null;

    return {
        book,
        chapter: parseInt(m[2], 10),
        verse: m[3] ? parseInt(m[3], 10) : null,
    };
}

/* Bible.com（YouVersion）:
     https://www.bible.com/ja/bible/81/JHN.3.JA1955
     https://www.bible.com/ja/bible/81/JHN.3.16.JA1955
     https://www.bible.com/bible/111/JHN.3.16.NIV        （ロケールprefixなし＝英語）
     https://bible.com/ja/bible/1820/JHN.1.口語訳          （wwwなし・訳名が日本語そのもの）
   パス構造: [/{2文字ロケール}]/bible/{訳版ID（数値・無視）}/{BOOK}.{chapter}[.{verse}[-{終了節}]][.{訳コード（無視）}]
   書物コードはPRS.appと同じUSFM準拠3文字。範囲指定（16-21）は開始節のみ採用する（既存2パーサーと同じ方針）。 */
function _parseBibleCom(url) {
    if (!/(^|\.)bible\.com$/i.test(url.hostname)) return null;
    const m = url.pathname.match(/^(?:\/[a-z]{2})?\/bible\/\d+\/([a-z0-9]+)\.(\d{1,3})(?:\.(\d{1,3})(?:-\d{1,3})?)?(?:\.[^/]+)?$/i);
    if (!m) return null;

    const book = _resolveBookKey(m[1]);
    if (!book) return null;

    return {
        book,
        chapter: parseInt(m[2], 10),
        verse: m[3] ? parseInt(m[3], 10) : null,
    };
}

const SITE_PARSERS = [
    _parseBibleGateway,
    _parsePRS,
    _parseBibleCom,
];

// =============================================================
// § 3.5  比較対象（COMPARE TARGETS。SITE_PARSERSの逆方向）
//        「どのサイトの、どの訳を開くか」は本エンジン内に閉じた責務であり、
//        呼び出し側（index.html のUI）は targetId という不透明な識別子しか
//        扱わない（サイト種別・version ID・URL構造はUI側に一切露出しない）。
//        各生成関数は state（book/chapter/verse。transAは無視してよい —
//        比較対象は「今アプリで表示中の訳」ではなく「常に決まった特定の訳」を
//        開くため）を受け取り、その訳で同じ箇所を開けるURLを返す。
//        生成できない場合（book/chapter不足等）は null。
//        比較対象を増やす場合はここへ生成関数を1つ足し、
//        COMPARE_TARGET_GENERATORS へ1行登録するだけでよい
//        （index.html側のswitch/if分岐は一切不要）。
// =============================================================

/* PRS.app: 新改訳2017（訳コード "jdb"。実機で "聖書 新改訳2017" 表記・
   ©新日本聖書刊行会 と一致することを確認済み）。 */
function _generatePrsShinkai2017(state) {
    if (!state || !state.book || !state.chapter) return null;
    const book = String(state.book).toLowerCase();
    let path = `/ja/bible/${book}.${state.chapter}`;
    if (state.verse) path += `.${state.verse}`;
    path += '.jdb';
    return `https://prs.app${path}`;
}

/* Bible.com（YouVersion）: 新共同訳（versionId 1819・訳コードは日本語表記
   "新共同訳" そのもの。実URLで直接確認済み）。 */
function _generateBibleComKyodo(state) {
    if (!state || !state.book || !state.chapter) return null;
    let path = `/ja/bible/1819/${state.book}.${state.chapter}`;
    if (state.verse) path += `.${state.verse}`;
    path += '.新共同訳';
    return `https://www.bible.com${path}`;
}

/* targetId → 生成関数。UIはこのオブジェクトの中身（サイト・訳・URL構造）を
   一切知らない。将来 ESV・NIV・口語訳等を増やす場合は、ここへ生成関数を
   1つ足してキーを1行追加するだけでよい。 */
const COMPARE_TARGET_GENERATORS = {
    'prs-shinkai2017': _generatePrsShinkai2017,
    'biblecom-kyodo': _generateBibleComKyodo,
};

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

/**
 * 現在地（state）から、指定した比較対象（targetId）で同じ箇所を開けるURLを
 * 生成する（parseBibleUrl の逆方向）。targetIdが「どのサイトの、どの訳か」を
 * 解決するのは本関数の内部（COMPARE_TARGET_GENERATORS）だけであり、
 * 呼び出し側はサイト種別・version ID・URL構造を一切知らなくてよい。
 * @param {string} targetId  COMPARE_TARGET_GENERATORS に登録されたキー（例: 'prs-shinkai2017'）
 * @param {{book: string, chapter: (number|string), verse: (number|string|null)}} state
 * @returns {string|null}  生成できない場合（未知のtargetId・情報不足）は null。
 */
function generateExternalUrl(targetId, state) {
    const generate = COMPARE_TARGET_GENERATORS[targetId];
    if (!generate) return null;
    try {
        return generate(state) || null;
    } catch (_) {
        return null;
    }
}

// =============================================================
// § 5.  エクスポート
// =============================================================

if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.urlImport = { parseBibleUrl, generateExternalUrl };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseBibleUrl, generateExternalUrl };
}
