#!/usr/bin/env node
'use strict';

/*
 * Compare generated postings with the legacy token-scan semantics on the full
 * generated corpus. This validates the indexed query families and phrase
 * adjacency; Japanese substring/phrase search is intentionally excluded
 * because schema v2 does not prebuild the Japanese partial index.
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
function posting(corpus, indexName, term) {
  const ids = [];
  for (const book of meta.corpora[corpus].books) {
    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, book.path), 'utf8'));
    ids.push(...(shard.index[indexName][term] || []));
  }
  return ids;
}
function scanCorpus(corpus, visit) {
  for (const book of meta.corpora[corpus].books) {
    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, book.path), 'utf8'));
    for (const tok of shard.tokens) visit(tok);
  }
}
let checks = 0;

for (const corpus of ['NT', 'LXX']) {
  for (const query of ['ἀγάπη', 'Ἰησοῦς', 'λόγος', 'ἐν']) {
    const norm = normalizeGreek(query);
    const expected = [];
    scanCorpus(corpus, tok => {
      if (tok.text === query || tok.lemma === query ||
          normalizeGreek(tok.text) === norm || normalizeGreek(tok.lemma) === norm) {
        expected.push(tok.globalIdx);
      }
    });
    const actual = [
      ...posting(corpus, 'text', query),
      ...posting(corpus, 'lemma', query),
      ...(norm !== query ? posting(corpus, 'text', norm) : []),
      ...(norm !== query ? posting(corpus, 'lemma', norm) : []),
    ];
    equalIds(corpus + ' Greek/lemma query ' + query, actual, expected); checks++;
  }

  for (const query of ['G25', 'G3056', 'G2316']) {
    const expected = [];
    scanCorpus(corpus, tok => {
      if (normalizeStrong(tok.strong) === normalizeStrong(query)) expected.push(tok.globalIdx);
    });
    equalIds(corpus + ' Strong query ' + query,
      posting(corpus, 'strong', normalizeStrong(query)), expected);
    checks++;
  }

  for (const query of ['V-PAM-2P', 'V-PAI-3S', 'N-NSM']) {
    const expected = [];
    scanCorpus(corpus, tok => { if (tok.morph === query) expected.push(tok.globalIdx); });
    equalIds(corpus + ' morphology query ' + query, posting(corpus, 'morph', query), expected);
    checks++;
  }

  // Reproduce searchPhrase's legacy lemma-index semantics and contiguous globalIdx check.
  for (const phrase of [['ἐν', 'ἀρχή'], ['Ἰησοῦς', 'Χριστός']]) {
    const lists = phrase.map(q => {
      const norm = normalizeGreek(q), ids = [];
      scanCorpus(corpus, tok => {
        const key = tok.lemma || tok.text;
        if (key === q || normalizeGreek(key) === norm) ids.push(tok.globalIdx);
      });
      return new Set(ids);
    });
    const expected = [];
    for (const gi of lists[0]) {
      if (phrase.slice(1).every((_, i) => lists[i + 1].has(gi + i + 1))) expected.push(gi);
    }
    const actual = [];
    const anchor = posting(corpus, 'lemma', normalizeGreek(phrase[0]));
    const next = phrase.slice(1).map(q => new Set(posting(corpus, 'lemma', normalizeGreek(q))));
    for (const gi of anchor) if (next.every((set, i) => set.has(gi + i + 1))) actual.push(gi);
    equalIds(corpus + ' Greek phrase ' + phrase.join(' '), actual, expected); checks++;
  }
}
console.log('PASS: ' + checks + ' generated-index/legacy-scan parity checks.');
