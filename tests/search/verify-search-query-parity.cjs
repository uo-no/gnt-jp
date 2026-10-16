#!/usr/bin/env node
'use strict';

/*
 * Compare generated postings with legacy token-scan semantics against the full
 * corpus. Each book shard is read once per corpus to keep CI time and memory
 * bounded. Japanese substring/phrase search is excluded because schema v2 does
 * not prebuild the Japanese partial index.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const root = path.resolve(arg('--root', path.resolve(__dirname, '../..')));
const indexDir = path.resolve(arg('--index-dir', path.join(root, 'public/search-index')));
const meta = JSON.parse(fs.readFileSync(path.join(indexDir, 'meta.json'), 'utf8'));
function normalizeGreek(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[⸀⸁⸂⸃⌈⌉.,;:·]/g, '').replace(/ς/g, 'σ').toLowerCase().trim();
}
function normalizeStrong(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  return digits ? 'G' + digits : '';
}
function sortedUnique(values) { return [...new Set(values)].sort((a, b) => a - b); }
function equalIds(label, actual, expected) {
  const a = sortedUnique(actual), e = sortedUnique(expected);
  try { assert.deepStrictEqual(a, e); console.log('PASS ' + label + ' (' + a.length + ' IDs)'); }
  catch (err) {
    console.error('FAIL ' + label + ': actual=' + a.length + ', expected=' + e.length);
    const as = new Set(a), es = new Set(e);
    console.error('  missing:', e.filter(x => !as.has(x)).slice(0, 20));
    console.error('  extra:', a.filter(x => !es.has(x)).slice(0, 20));
    throw err;
  }
}
const greekQueries = ['ἀγάπη', 'Ἰησοῦς', 'λόγος', 'ἐν'];
const strongQueries = ['G25', 'G3056', 'G2316'];
const morphQueries = ['V-PAM-2P', 'V-PAI-3S', 'N-NSM'];
const japaneseQueries = ['神', '書', '愛', '起源'];
const phrases = [['ἐν', 'ἀρχή'], ['Ἰησοῦς', 'Χριστός']];
let checks = 0;

for (const corpus of ['NT', 'LXX']) {
  const expected = new Map();
  const actual = new Map();
  const put = (map, key, id) => { if (!map.has(key)) map.set(key, []); map.get(key).push(id); };
  const greekNorms = new Map(greekQueries.map(q => [q, normalizeGreek(q)]));
  const phraseWords = new Set(phrases.flat().map(normalizeGreek));
  const hasRuntimeJapanesePartial = (value, query) => {
    if (typeof value !== 'string' || !value) return false;
    const maxLen = Math.min(value.length, 8);
    for (let start = 0; start < value.length; start++) {
      for (let length = 1; length <= maxLen - start; length++) {
        if (value.slice(start, start + length) === query) return true;
      }
    }
    return false;
  };

  // One streaming pass: compute reference scan results and collect generated postings.
  for (const book of meta.corpora[corpus].books) {
    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, book.path), 'utf8'));
    for (const tok of shard.tokens) {
      for (const q of greekQueries) {
        const norm = greekNorms.get(q);
        if (tok.text === q || tok.lemma === q ||
            normalizeGreek(tok.text) === norm || normalizeGreek(tok.lemma) === norm) {
          put(expected, 'greek:' + q, tok.globalIdx);
        }
      }
      for (const q of strongQueries) {
        if (normalizeStrong(tok.strong) === normalizeStrong(q)) put(expected, 'strong:' + q, tok.globalIdx);
      }
      for (const q of morphQueries) if (tok.morph === q) put(expected, 'morph:' + q, tok.globalIdx);
      const jpVals = tok.japanese ? (Array.isArray(tok.japanese) ? tok.japanese : [tok.japanese]) : (tok.gloss ? [tok.gloss] : []);
      for (const q of japaneseQueries) if (jpVals.some(value => hasRuntimeJapanesePartial(value, q))) put(expected, 'japanese:' + q, tok.globalIdx);
      const lemmaKey = normalizeGreek(tok.lemma || tok.text);
      if (phraseWords.has(lemmaKey)) put(expected, 'phraseword:' + lemmaKey, tok.globalIdx);
    }

    for (const q of greekQueries) {
      for (const indexName of ['text', 'lemma']) {
        const terms = new Set([q, greekNorms.get(q)]);
        for (const term of terms) for (const id of (shard.index[indexName][term] || [])) {
          put(actual, 'greek:' + q, id);
        }
      }
    }
    for (const q of strongQueries) for (const id of (shard.index.strong[normalizeStrong(q)] || [])) put(actual, 'strong:' + q, id);
    for (const q of morphQueries) for (const id of (shard.index.morph[q] || [])) put(actual, 'morph:' + q, id);
    for (const q of japaneseQueries) for (const id of (shard.index.japanesePartial[q] || [])) put(actual, 'japanese:' + q, id);
    for (const word of phraseWords) for (const id of (shard.index.lemma[word] || [])) put(actual, 'phraseword:' + word, id);
  }

  for (const q of greekQueries) { equalIds(corpus + ' Greek/lemma query ' + q, actual.get('greek:' + q) || [], expected.get('greek:' + q) || []); checks++; }
  for (const q of strongQueries) { equalIds(corpus + ' Strong query ' + q, actual.get('strong:' + q) || [], expected.get('strong:' + q) || []); checks++; }
  for (const q of morphQueries) { equalIds(corpus + ' morphology query ' + q, actual.get('morph:' + q) || [], expected.get('morph:' + q) || []); checks++; }
  for (const q of japaneseQueries) { equalIds(corpus + ' Japanese partial query ' + q, actual.get('japanese:' + q) || [], expected.get('japanese:' + q) || []); checks++; }
  for (const phrase of phrases) {
    const first = expected.get('phraseword:' + normalizeGreek(phrase[0])) || [];
    const nextSets = phrase.slice(1).map(q => new Set(expected.get('phraseword:' + normalizeGreek(q)) || []));
    const expectedHits = first.filter(gi => nextSets.every((set, i) => set.has(gi + i + 1)));
    const actualFirst = actual.get('phraseword:' + normalizeGreek(phrase[0])) || [];
    const actualNextSets = phrase.slice(1).map(q => new Set(actual.get('phraseword:' + normalizeGreek(q)) || []));
    const actualHits = actualFirst.filter(gi => actualNextSets.every((set, i) => set.has(gi + i + 1)));
    equalIds(corpus + ' Greek phrase ' + phrase.join(' '), actualHits, expectedHits); checks++;
  }

  // Existing proximity semantics: every w1 anchor with w2 within +/- 5
  // globalIdx positions, excluding the anchor itself. Compare IDs derived from
  // the legacy scan against IDs derived from generated postings.
  {
    const w1 = 'λόγος', w2 = 'ἐν', distance = 5;
    const expectedW1 = expected.get('greek:' + w1) || [];
    const expectedW2 = new Set(expected.get('greek:' + w2) || []);
    const actualW1 = actual.get('greek:' + w1) || [];
    const actualW2 = new Set(actual.get('greek:' + w2) || []);
    const within = (anchors, others) => anchors.filter(anchor => {
      for (let gi = Math.max(0, anchor - distance); gi <= anchor + distance; gi++) {
        if (gi !== anchor && others.has(gi)) return true;
      }
      return false;
    });
    equalIds(corpus + ' proximity ' + w1 + ' near ' + w2 + ' (±' + distance + ')',
      within(actualW1, actualW2), within(expectedW1, expectedW2));
    checks++;
  }
}
console.log('PASS: ' + checks + ' generated-index/legacy-scan parity checks.');
