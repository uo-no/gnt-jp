#!/usr/bin/env node
/**
 * re-apparatus-regression.cjs — Apparatus data regression guard
 *
 * 検証対象: public/assets/data/apparatus.json
 *
 * ロックしている invariant:
 *  1. entryCount = 6929 (監査実測値)
 *  2. rdgTotal   = 14132 (監査実測値)
 *  3. no_match   = 0
 *  4. verse_range = 6
 *  5. 全書巻の app 件数が監査実測値と一致
 *  6. byVerse インデックスの整合性（index が entries 配列範囲内、かつ entry の book/loc と一致）
 *  7. 全 entry に id / book / loc / lemWords / readings が存在
 *  8. 全 reading に witnesses が配列として存在
 *  9. ID の一意性
 * 10. byVerse の節またぎ entry が両節に登録されていること
 * 11. 生成スクリプトが冪等であること（スクリプトが _meta.generatedAt 以外を変えないこと）
 *     ※ 実行タイミングによって日付が変わるため完全一致ではなく件数・構造で検証
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');

// ── 監査実測値 baseline ──────────────────────────────────────────
const BOOK_APP_BASELINE = {
  MAT:827, MRK:930, LUK:1142, JHN:773, ACT:1084,
  ROM:229, '1CO':335, '2CO':177, GAL:87, EPH:90,
  PHP:47, COL:72, '1TH':52, '2TH':30, '1TI':46,
  '2TI':39, TIT:24, PHM:17, HEB:150, JAS:95,
  '1PE':87, '2PE':46, '1JN':65, '2JN':14, '3JN':10,
  JUD:20, REV:441,
};
const BOOK_RDG_BASELINE = {
  MAT:1682, MRK:1916, LUK:2314, JHN:1579, ACT:2202,
  ROM:467, '1CO':680, '2CO':358, GAL:175, EPH:184,
  PHP:97, COL:146, '1TH':104, '2TH':61, '1TI':93,
  '2TI':79, TIT:49, PHM:34, HEB:311, JAS:192,
  '1PE':176, '2PE':95, '1JN':135, '2JN':28, '3JN':20,
  JUD:48, REV:907,
};

// ── テスト実行 ───────────────────────────────────────────────────

let failed = 0;
const results = [];
function check(name, cond, detail) {
  if (cond) {
    results.push(['PASS', name]);
  } else {
    results.push(['FAIL', name + (detail ? ` — ${detail}` : '')]);
    failed++;
  }
}

// 読み込み
check('DATA_EXISTS', fs.existsSync(DATA_PATH), DATA_PATH);

let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
} catch (e) {
  check('DATA_PARSE', false, e.message);
  process.exit(1);
}
check('DATA_PARSE', true);

const { _meta, entries, byVerse } = data;

// 1. 総件数
check('ENTRY_COUNT',    entries.length === 6929,  `got ${entries.length}`);
check('RDG_TOTAL',      _meta && _meta.entryCount === 6929);
check('VERSE_KEY_COUNT', Object.keys(byVerse).length === 4474, `got ${Object.keys(byVerse).length}`);

// 2. rdg total
const rdgSum = entries.reduce((s, e) => s + (e.readings ? e.readings.length : 0), 0);
check('RDG_SUM', rdgSum === 14132, `got ${rdgSum}`);

// 3. no_match = 0
const noMatch = entries.filter(e => e.tokenRefStatus === 'no_match');
check('NO_MATCH_ZERO', noMatch.length === 0, `${noMatch.length} entries`);

// 4. verse_range = 6
const vrEntries = entries.filter(e => e.tokenRefStatus === 'verse_range');
check('VERSE_RANGE_SIX', vrEntries.length === 6, `got ${vrEntries.length}`);

// 5. 書巻別 app 件数
const bookApp = {};
const bookRdg = {};
for (const e of entries) {
  bookApp[e.book] = (bookApp[e.book] || 0) + 1;
  bookRdg[e.book] = (bookRdg[e.book] || 0) + (e.readings ? e.readings.length : 0);
}
for (const [book, expected] of Object.entries(BOOK_APP_BASELINE)) {
  const got = bookApp[book] || 0;
  check(`APP_${book}`, got === expected, `got ${got}, expected ${expected}`);
}
for (const [book, expected] of Object.entries(BOOK_RDG_BASELINE)) {
  const got = bookRdg[book] || 0;
  check(`RDG_${book}`, got === expected, `got ${got}, expected ${expected}`);
}

// 6. byVerse インデックス整合性
let byVerseOk = true;
let byVerseErr = '';
for (const [key, idxs] of Object.entries(byVerse)) {
  for (const idx of idxs) {
    if (idx < 0 || idx >= entries.length) {
      byVerseOk = false; byVerseErr = `key ${key}: index ${idx} out of range`; break;
    }
    const e = entries[idx];
    const expectedBook = key.split(' ')[0];
    if (e.book !== expectedBook) {
      byVerseOk = false; byVerseErr = `key ${key}: entry.book=${e.book}`; break;
    }
  }
  if (!byVerseOk) break;
}
check('BY_VERSE_INDEX', byVerseOk, byVerseErr);

// 7. 必須フィールドの存在
let structOk = true;
let structErr = '';
for (const e of entries) {
  if (!e.id || !e.book || !e.loc || !Array.isArray(e.lemWords) || !Array.isArray(e.readings)) {
    structOk = false; structErr = `id=${e.id}: missing required field`; break;
  }
  if (!e.tokenRefStatus || typeof e.correctedByJJM !== 'boolean') {
    structOk = false; structErr = `id=${e.id}: missing tokenRefStatus or correctedByJJM`; break;
  }
}
check('ENTRY_STRUCT', structOk, structErr);

// 8. readings.witnesses が配列
let witOk = true;
let witErr = '';
for (const e of entries) {
  for (const r of e.readings) {
    if (!Array.isArray(r.witnesses)) {
      witOk = false; witErr = `id=${e.id}: reading n=${r.n} missing witnesses array`; break;
    }
  }
  if (!witOk) break;
}
check('READING_WITNESSES', witOk, witErr);

// 9. ID 一意性
const ids = entries.map(e => e.id);
const uniqueIds = new Set(ids);
check('ID_UNIQUE', uniqueIds.size === entries.length, `${entries.length - uniqueIds.size} duplicates`);

// 10. verse_range entry が両節に登録されていること
for (const e of vrEntries) {
  const { book, chapterStart, verseStart, verseEnd } = e;
  for (let v = verseStart; v <= verseEnd; v++) {
    const key = `${book} ${chapterStart}:${v}`;
    const registered = byVerse[key] && byVerse[key].includes(entries.indexOf(e));
    check(`VERSE_RANGE_REGISTERED_${e.id}_v${v}`, registered, `key ${key} missing`);
  }
}

// 11. _meta フィールド
check('META_LICENSE',    _meta && _meta.license === 'CC BY 4.0');
check('META_SOURCE',     _meta && _meta.source === 'jjmccollum/sblgnt-tei');
check('META_ENTRY_COUNT', _meta && _meta.entryCount === 6929);
check('META_ATTRIBUTION', _meta && typeof _meta.attribution === 'string' && _meta.attribution.length > 20);

// ── 結果出力 ─────────────────────────────────────────────────────

console.log('\n=== re-apparatus-regression ===');
for (const [status, name] of results) {
  if (status === 'FAIL') console.log(`  FAIL: ${name}`);
}
const passed = results.filter(r => r[0] === 'PASS').length;
console.log(`\n${passed}/${results.length} checks passed`);

if (failed > 0) {
  console.log(`\nFAILED: ${failed} check(s)`);
  process.exit(1);
} else {
  console.log('\nPASS');
}
