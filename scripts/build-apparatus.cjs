#!/usr/bin/env node
/**
 * build-apparatus.cjs — SBLGNT Apparatus TEI XML → apparatus.json
 *
 * 入力: work/apparatus/sblgnt_tei.xml (jjmccollum/sblgnt-tei, CC BY 4.0)
 * 出力: public/assets/data/apparatus.json
 *
 * 設計境界:
 *   - XML解析のみ。bible_data・形態素・ID を変更しない。
 *   - 不確かな対応付けを推測で確定しない (tokenRefStatus で明示)。
 *   - AI補完なし。ソース XML をそのまま構造化する。
 *   - @xmldom/xmldom を XML 解析に使用（build-flow-tree.cjs と同パターン）。
 *
 * tokenRefStatus:
 *   "exact"       — 1語 lem、bible_data で1件一致
 *   "phrase"      — 複数語 lem（句単位の異読）
 *   "multi"       — 1語 lem だが同節に同語が複数回出現
 *   "elision"     — lem語がエリジョン形（例: ἀπ᾽）、展開後に一致
 *   "case"        — 大文字/小文字の差異で一致
 *   "verse_range" — @loc が節範囲（例: 1:7-8）
 *   "no_match"    — 対応するトークンが見つからない
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

const PROJECT_ROOT    = path.join(__dirname, '..');
const XML_PATH        = path.join(PROJECT_ROOT, 'work', 'apparatus', 'sblgnt_tei.xml');
const _outArgIdx  = process.argv.indexOf('--output');
const OUTPUT_PATH = (_outArgIdx !== -1 && process.argv[_outArgIdx + 1])
  ? process.argv[_outArgIdx + 1]
  : path.join(PROJECT_ROOT, 'public', 'assets', 'data', 'apparatus.json');
const BIBLE_DATA_DIR  = path.join(PROJECT_ROOT, 'public', 'bible_data', 'nt');

const SCRIPT_VERSION  = '1.0.0';
const SOURCE_REF      = 'jjmccollum/sblgnt-tei';
const SOURCE_URL      = 'https://github.com/jjmccollum/sblgnt-tei';
const XML_NS          = 'http://www.w3.org/XML/1998/namespace';

// TEI <div xml:id="B01"> → 書巻コード
const BOOK_BY_DIV_ID = {
  B01:'MAT', B02:'MRK', B03:'LUK', B04:'JHN',
  B05:'ACT', B06:'ROM', B07:'1CO', B08:'2CO',
  B09:'GAL', B10:'EPH', B11:'PHP', B12:'COL',
  B13:'1TH', B14:'2TH', B15:'1TI', B16:'2TI',
  B17:'TIT', B18:'PHM', B19:'HEB', B20:'JAS',
  B21:'1PE', B22:'2PE', B23:'1JN', B24:'2JN',
  B25:'3JN', B26:'JUD', B27:'REV',
};

// ─── ユーティリティ ──────────────────────────────────────────────

/** el の全テキストを再帰取得 */
function allText(el) {
  if (!el) return '';
  let s = '';
  const walk = (node) => {
    if (node.nodeType === 3) { s += node.nodeValue || ''; return; }
    for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
  };
  walk(el);
  return s;
}

/** ギリシャ語文字を含む単語を lem テキストから抽出（句読点除去） */
const GREEK_RE = /[Ͱ-Ͽἀ-῿]/;
function extractGreekWords(text) {
  return text
    .split(/\s+/)
    .map(w => w.replace(/^[,.·’‘“”;:·]+|[,.·’‘“”;:·\[\]]+$/g, ''))
    .filter(w => GREEK_RE.test(w));
}

/** エリジョン記号の正規化（᾽ U+1FBD / ᾿ U+1FBF / ' U+2019 / ' U+0027） */
const ELISION_MARK = /[᾽᾿’']$/;
function stripElision(w) { return w.replace(ELISION_MARK, ''); }
function hasElision(w)   { return ELISION_MARK.test(w); }

// ─── bible_data ローダー（chapter 単位 lazy キャッシュ）──────────

const _bibCache = {};
function loadChapter(book, ch) {
  const key = `${book}:${ch}`;
  if (_bibCache[key] !== undefined) return _bibCache[key];
  const fpath = path.join(BIBLE_DATA_DIR, book, `${ch}.json`);
  if (!fs.existsSync(fpath)) { _bibCache[key] = []; return []; }
  _bibCache[key] = JSON.parse(fs.readFileSync(fpath, 'utf8'));
  return _bibCache[key];
}

/** 指定書巻・節範囲のトークン列を返す */
function tokensForVerses(book, ch, vStart, vEnd) {
  const tokens = loadChapter(book, ch);
  return tokens.filter(t => {
    const v = parseInt(t.verse, 10);
    return v >= vStart && v <= vEnd;
  });
}

// ─── トークン対応付け ─────────────────────────────────────────────

/** lem の Greek words に対応するトークン refs を返す */
function alignLem(lemWords, tokens) {
  const found = [];
  const used = new Set();

  for (const word of lemWords) {
    const elided = hasElision(word);
    const base   = elided ? stripElision(word) : null;
    // NFC正規化: Greek Extended oxia (U+1F71等) ↔ Greek Block tonos (U+03AC等) の差異を吸収
    const nWord  = word.normalize('NFC');
    const lowerW = nWord.toLowerCase();

    let matchRef = null;
    let matchStatus = null;

    for (const tok of tokens) {
      if (used.has(tok.ref)) continue;
      const t  = (tok.text       || '').normalize('NFC');
      const n  = (tok.normalized || '').normalize('NFC');
      const lt = t.toLowerCase();
      const ln = n.toLowerCase();

      // 1. 完全一致（NFC後）
      if (t === nWord || n === nWord) {
        matchRef = tok.ref; matchStatus = 'exact'; break;
      }
      // 2. 大文字小文字無視
      if (lt === lowerW || ln === lowerW) {
        matchRef = tok.ref; matchStatus = 'case'; break;
      }
      // 3. エリジョン展開（base は ≥2 文字の場合のみ）
      if (elided && base && base.length >= 2) {
        const nBase = base.normalize('NFC').toLowerCase();
        if (lt.startsWith(nBase) || ln.startsWith(nBase)) {
          matchRef = tok.ref; matchStatus = 'elision'; break;
        }
      }
    }

    if (matchRef) {
      found.push({ ref: matchRef, status: matchStatus });
      used.add(matchRef);
    }
  }

  return found;
}

/** tokenRefStatus を決定する */
function resolveStatus(alignResults, lemWords, isVerseRange) {
  if (isVerseRange) return 'verse_range';
  if (lemWords.length === 0) return 'no_match';
  if (alignResults.length === 0) return 'no_match';

  const statuses = alignResults.map(a => a.status);
  if (lemWords.length > 1 || alignResults.length > 1) {
    // いずれかがエリジョン/case 差異なら優先的に示す
    if (statuses.some(s => s === 'elision')) return 'elision';
    if (statuses.some(s => s === 'case'))    return 'case';
    if (lemWords.length > 1)                 return 'phrase';
    return 'multi';
  }
  return statuses[0]; // 'exact' | 'case' | 'elision'
}

// ─── メイン処理 ─────────────────────────────────────────────────

if (!fs.existsSync(XML_PATH)) {
  console.error(`ERROR: XML not found at ${XML_PATH}`);
  console.error('Run: cp <scratchpad>/sblgnt_tei.xml work/apparatus/sblgnt_tei.xml');
  process.exit(1);
}

console.log('Reading TEI XML …');
const xmlSrc = fs.readFileSync(XML_PATH, 'utf8');

const parser = new DOMParser({
  onError: (level, msg) => {
    if (level === 'fatalError' || level === 'error') {
      console.error(`XML ${level}: ${msg}`);
    }
  },
});
const doc = parser.parseFromString(xmlSrc, 'text/xml');
if (!doc || !doc.documentElement) {
  console.error('ERROR: Failed to parse XML');
  process.exit(1);
}

const body = doc.getElementsByTagName('body')[0];
if (!body) { console.error('ERROR: <body> not found'); process.exit(1); }

const entries = [];
const byVerse = {};  // "MAT 1:5" → [entryIdx, ...]
const bookCounters = {};
const statusCounters = {};
const globalCounters = { books: 0, appTotal: 0, lemTotal: 0, rdgTotal: 0 };

// <div type="book" xml:id="B01"> を順に処理
const bookDivs = Array.from(body.getElementsByTagName('div'));

for (const bookDiv of bookDivs) {
  const divId = bookDiv.getAttributeNS(XML_NS, 'id') || bookDiv.getAttribute('xml:id') || '';
  if (!divId.startsWith('B')) continue;
  const book = BOOK_BY_DIV_ID[divId];
  if (!book) continue;

  globalCounters.books++;
  bookCounters[book] = { app: 0, rdg: 0 };
  let seqInBook = 0;

  const apps = Array.from(bookDiv.getElementsByTagName('app'));

  for (const appEl of apps) {
    const loc = appEl.getAttribute('loc') || '';
    if (!loc) continue;

    // ── @loc 解析 ──────────────────────────────────────────
    let chapterStart, verseStart, verseEnd, isVerseRange;
    if (loc.includes('-')) {
      // 例: "1:7-8" → same chapter, verse range
      const [left, rightV] = loc.split('-');
      const [chStr, vStr] = left.split(':');
      chapterStart = parseInt(chStr, 10);
      verseStart   = parseInt(vStr, 10);
      verseEnd     = parseInt(rightV, 10);
      isVerseRange = true;
    } else {
      const [chStr, vStr] = loc.split(':');
      chapterStart = parseInt(chStr, 10);
      verseStart   = parseInt(vStr, 10);
      verseEnd     = verseStart;
      isVerseRange = false;
    }

    // ── <lem> / <rdg> ： app の直接子要素のみ取得 ──────────
    // getElementsByTagName は孫要素（lem 内ネスト app の rdg 等）も含むため
    // 直接子ノードを走査して取得する。
    let lemEl = null;
    const rdgEls = [];
    for (let c = appEl.firstChild; c; c = c.nextSibling) {
      if (c.nodeType !== 1) continue;
      const tag = c.localName || c.nodeName;
      if (tag === 'lem' && !lemEl) lemEl = c;
      if (tag === 'rdg') rdgEls.push(c);
    }

    const lemText = lemEl ? allText(lemEl).replace(/\s+/g, ' ').trim() : '';
    const lemWords = extractGreekWords(lemText);
    const readings = rdgEls.map(rdgEl => {
      const witRaw  = rdgEl.getAttribute('wit') || '';
      const witnesses = witRaw.split(/\s+/).map(w => w.replace(/^#/, '')).filter(Boolean);
      const rdgText = allText(rdgEl).replace(/\s+/g, ' ').trim();
      const respRaw = rdgEl.getAttribute('resp') || '';
      const entry = {
        n: rdgEl.getAttribute('n') || '',
        text: rdgText,
        witnesses,
        isOmission: rdgText === '' || rdgText === '–' || rdgText === '-',
      };
      if (respRaw) entry.correctedByJJM = respRaw.includes('JJM');
      return entry;
    });

    // ── app @resp ─────────────────────────────────────────
    const appResp = appEl.getAttribute('resp') || '';
    const correctedByJJM = appResp.includes('JJM') ||
      readings.some(r => r.correctedByJJM);

    // ── トークン対応付け ──────────────────────────────────
    const tokens = tokensForVerses(book, chapterStart, verseStart, verseEnd);
    const alignResults = alignLem(lemWords, tokens);
    const tokenRefs = alignResults.map(a => a.ref);
    const tokenRefStatus = resolveStatus(alignResults, lemWords, isVerseRange);

    // ── エントリ ID ────────────────────────────────────────
    seqInBook++;
    const id = `${book}-${String(seqInBook).padStart(4, '0')}`;

    // ── エントリ構築 ───────────────────────────────────────
    const entry = {
      id,
      book,
      loc,
      chapterStart,
      verseStart,
      verseEnd,
      verseRange: isVerseRange,
      lemText,
      lemWords,
      tokenRefs,
      tokenRefStatus,
      correctedByJJM: correctedByJJM || false,
      readings,
    };

    const entryIdx = entries.length;
    entries.push(entry);

    // ── byVerse インデックス ───────────────────────────────
    for (let v = verseStart; v <= verseEnd; v++) {
      const verseKey = `${book} ${chapterStart}:${v}`;
      if (!byVerse[verseKey]) byVerse[verseKey] = [];
      byVerse[verseKey].push(entryIdx);
    }

    globalCounters.appTotal++;
    globalCounters.rdgTotal += readings.length;
    bookCounters[book].app++;
    bookCounters[book].rdg += readings.length;

    const sc = tokenRefStatus;
    statusCounters[sc] = (statusCounters[sc] || 0) + 1;
  }

  globalCounters.lemTotal += bookCounters[book].app;
  console.log(`  ${book}: ${bookCounters[book].app} app, ${bookCounters[book].rdg} rdg`);
}

// ─── 出力 JSON 組み立て ──────────────────────────────────────────

const output = {
  _meta: {
    source:      SOURCE_REF,
    sourceUrl:   SOURCE_URL,
    sourceFile:  'xml/sblgnt_tei.xml',
    license:     'CC BY 4.0',
    attribution: 'The Greek New Testament: SBL Edition © 2010 Society of Biblical Literature and Logos Bible Software. Apparatus encoded in TEI XML by Joey McCollum (2021). https://github.com/jjmccollum/sblgnt-tei',
    scriptVersion: SCRIPT_VERSION,
    generatedAt: new Date().toISOString().slice(0, 10),
    entryCount:  entries.length,
    verseCount:  Object.keys(byVerse).length,
    statusBreakdown: statusCounters,
    bookBreakdown: bookCounters,
    witnessIds: [
      'ECM','Greeven','Holmes','NA','NIV','RP','TR',
      'Treg','Tregmarg','WH','WHapp','WHmarg','WHspur',
    ],
  },
  entries,
  byVerse,
};

// ─── 書き込み ────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf8');

// ─── サマリ出力 ──────────────────────────────────────────────────

console.log('\n=== build-apparatus summary ===');
console.log(`entries:     ${entries.length}`);
console.log(`verse keys:  ${Object.keys(byVerse).length}`);
console.log(`rdg total:   ${globalCounters.rdgTotal}`);
console.log('\ntokenRefStatus breakdown:');
for (const [k, v] of Object.entries(statusCounters).sort((a, b) => b[1] - a[1])) {
  const pct = (v / entries.length * 100).toFixed(1);
  console.log(`  ${k.padEnd(12)} ${v.toString().padStart(5)} (${pct}%)`);
}
console.log(`\nOutput: ${OUTPUT_PATH}`);
const outSize = fs.statSync(OUTPUT_PATH).size;
console.log(`Size:   ${(outSize / 1024).toFixed(0)} KB`);
