#!/usr/bin/env node
'use strict';

/*
 * Compare prebuilt postings with the legacy token-scan semantics against the
 * generated full corpus. The test streams one book shard at a time and reports
 * exact globalIdx mismatches for representative query families.
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
function jpValues(tok) {
  if (tok.japanese) return Array.isArray(tok.japanese) ? tok.japanese : [tok.japanese];
  return tok.gloss ? [tok.gloss] : [];
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
function posting(metaCorpus, indexName, term) {
  const ids = [];
  for (const book of meta.corpora[metaCorpus].books) {
    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, book.path), 'utf8'));
    ids.push(...(shard.index[indexName][term] || []));
  }
  return ids;
}
function scanCorpus(metaCorpus, visit) {
  for (const book of meta.corpora[metaCorpus].books) {
    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, book.path), 'utf8'));
    for (const tok of shard.tokens) visit(tok);
  }
}
let checks = 0;

for (const corpus of ['NT', 'LXX']) {
  const greekQueries = ['ἀγάπη', 'Ἰησοῦς', 'λόγος', 'ἐν'];
  for (const query of greekQueries) {
    const norm = normalizeGreek(query);
    const expected = [];
    scanCorpus(corpus, tok => {
      if (tok.text === query || tok.lemma === query ||
          normalizeGreek(tok.text) === norm || normalizeGreek(tok.lemma) === norm) {
        expected.push(tok.globalIdx);
      }
    });
    const actual = sortedUnique([
      ...posting(corpus, 'text', query),
      ...posting(corpus, 'lemma', query),
      ...(norm !== query ? posting(corpus, 'text', norm) : []),
      ...(norm !== query ? posting(corpus, 'lemma', norm) : []),
    ]);
    equalIds(corpus + ' Greek/lemma query ' + query, actual, expected); checks++;
  }

  const strongQueries = ['G25', 'G3056', 'G2316'];
  for (const query of strongQueries) {
    const expected = [];
    scanCorpus(corpus, tok => {
      if (normalizeStrong(tok.strong) === normalizeStrong(query)) expected.push(tok.globalIdx);
    });
    equalIds(corpus + ' Strong query ' + query, posting(corpus, 'strong', normalizeStrong(query)), expected);
    checks++;
  }

  const morphQueries = ['V-PAM-2P', 'V-PAI-3S', 'N-NSM'];
  for (const query of morphQueries) {
    const expected = [];
    scanCorpus(corpus, tok => { if (tok.morph === query) expected.push(tok.globalIdx); });
    equalIds(corpus + ' morphology query ' + query, posting(corpus, 'morph', query), expected);
    checks++;
  }

  // Phrase parity: legacy lemma index is derived from every token, then adjacent
  // globalIdxs are checked exactly as searchPhrase does in the page.
  for (const phrase of [['ἐν', 'ἀρχή'], ['Ἰησοῦς', 'Χριστός']]) {
    const lists = phrase.map(q => {
      const norm = normalizeGreek(q), ids = [];
      scanCorpus(corpus, tok => {
        if ((tok.lemma || tok.text) === q || normalizeGreek(tok.lemma || tok.text) === norm) ids.push(tok.globalIdx);
      });
      return new Set(ids);
    });
    const expected = [];
    for (const gi of lists[0]) {
      if (phrase.slice(1).every((_, i) => lists[i + 1].has(gi + i + 1))) expected.push(gi);
    }
    const actual = [];
    // Same generated lemma postings used by the runtime lemmaIndex.
    const anchor = posting(corpus, 'lemma', normalizeGreek(phrase[0]));
    const next = phrase.slice(1).map(q => new Set(posting(corpus, 'lemma', normalizeGreek(q))));
    for (const gi of anchor) if (next.every((set, i) => set.has(gi + i + 1))) actual.push(gi);
    equalIds(corpus + ' Greek phrase ' + phrase.join(' '), actual, expected); checks++;
  }

  // Japanese phrase parity: scan tokens with the runtime's substring semantics.
  // This deliberately does not claim the Japanese partial index is prebuilt.
  for (const words of [['神', 'の'], ['愛', 'する']]) {
    const expected = [];
    let previous = [];
    scanCorpus(corpus, tok => {
      const vals = jpValues(tok).filter(Boolean).map(String);
      if (vals.some(v => v.includes(words[0]))) previous.push(tok.globalIdx);
      if (words.length > 1 && previous.some(gi => gi === tok.globalIdx - 1) &&
          vals.some(v => v.includes(words[1]))) expected.push(tok.globalIdx - 1);
      if (!vals.some(v => v.includes(words[0]))) previous = previous.filter(gi => gi >= tok.globalIdx - 1);
    });
    // No generated Japanese partial posting exists in schema v2; compare the
    // token-derived reference to the same scan-based semantics explicitly.
    const actual = [];
    let prev = null;
    scanCorpus(corpus, tok => {
      const vals = jpValues(tok).filter(Boolean).map(String);
      if (prev && prev.globalIdx + 1 === tok.globalIdx &&
          jpValues(prev).filter(Boolean).some(v => String(v).includes(words[0])) &&
          vals.some(v => v.includes(words[1]))) actual.push(prev.globalIdx);
      prev = tok;
    });
    equalIds(corpus + ' Japanese phrase scan ' + words.join(' '), actual, expected); checks++;
  }
}
console.log('PASS: ' + checks + ' generated-index/legacy-scan parity checks.');
