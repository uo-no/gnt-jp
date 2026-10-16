#!/usr/bin/env node
'use strict';

// Streaming full-corpus integrity check: generated book shards must reproduce
// the browser indexer's token mapping and postings without retaining the corpus twice.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const root = path.resolve(arg('--root', path.resolve(__dirname, '../..')));
const indexDir = path.resolve(arg('--index-dir', path.join(root, 'public/search-index')));
const booksPath = fs.existsSync(path.join(root, 'public/books.json'))
    ? path.join(root, 'public/books.json') : path.join(root, 'books.json');
const booksMaster = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const dataRoot = fs.existsSync(path.join(root, 'public/bible_data'))
    ? path.join(root, 'public/bible_data') : path.join(root, 'bible_data');
const ntKeys = new Set(booksMaster.NT.map(b => b.key));
const meta = JSON.parse(fs.readFileSync(path.join(indexDir, 'meta.json'), 'utf8'));
assert.equal(meta.schemaVersion, 2);

let globalIdx = 0;
let chapterCount = 0;
let tokenCount = 0;
const textToJpByCorpus = { NT: new Map(), LXX: new Map() };

function normalizeGreek(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[⸀⸁⸂⸃⌈⌉.,;:·]/g, '').replace(/ς/g, 'σ').toLowerCase().trim();
}
function normalizeStrong(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    return digits ? 'G' + digits : '';
}
function add(map, key, idx) {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(idx);
}
function asObject(map) {
    const result = {};
    for (const [key, value] of map) result[key] = value;
    return result;
}

for (const book of [...booksMaster.NT, ...booksMaster.OT]) {
    const corpus = ntKeys.has(book.key) ? 'NT' : 'LXX';
    const folder = ntKeys.has(book.key) ? 'nt' : (booksMaster.corpora?.OT || 'lxx');
    const descriptorIndex = corpusDataBookIndex(corpus, book.key);
    const descriptor = meta.corpora[corpus].books[descriptorIndex];
    assert.ok(descriptor, `${corpus} manifest missing ${book.key}`);
    assert.equal(descriptor.bookKey, book.key, `${corpus} manifest order at ${descriptorIndex}`);

    const expectedTokens = [];
    const postings = { lemma: new Map(), text: new Map(), strong: new Map(), morph: new Map() };
    const chapterStartIdx = globalIdx;
    for (let ch = 1; ch <= Number(book.chapters); ch++) {
        const chapterPath = path.join(dataRoot, folder, book.key, `${ch}.json`);
        const rows = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
        assert.ok(Array.isArray(rows), `Expected array: ${chapterPath}`);
        chapterCount++;
        for (const w of rows) {
            const tok = {
                ref: w.ref || `${book.key} ${ch}:${w.verse ?? '?'}`,
                bookKey: book.key,
                ch: Number(ch),
                verse: w.verse != null ? Number(w.verse) : null,
                text: w.text || '',
                lemma: w.lemma || w.text || '',
                morph: w.morph ?? null,
                japanese: w.japanese || w.gloss_ja || w.gloss || null,
                gloss: w.gloss || w.gloss_ja || null,
                strong: w.strong || w.strongs || null,
                language: 'grc',
                corpusId: corpus,
                lemmaId: w.lemmaId ?? w.lemma_id ?? null,
                globalIdx,
            };
            expectedTokens.push(tok);
            add(postings.text, tok.text, globalIdx);
            add(postings.lemma, tok.lemma, globalIdx);
            const nl = normalizeGreek(tok.lemma), nt = normalizeGreek(tok.text);
            if (nl && nl !== tok.lemma) add(postings.lemma, nl, globalIdx);
            if (nt && nt !== tok.text) add(postings.text, nt, globalIdx);
            add(postings.strong, tok.strong != null ? normalizeStrong(tok.strong) : null, globalIdx);
            if (tok.morph) add(postings.morph, tok.morph, globalIdx);

            const jpVals = tok.japanese ? (Array.isArray(tok.japanese) ? tok.japanese : [tok.japanese]) : (tok.gloss ? [tok.gloss] : []);
            const textToJp = textToJpByCorpus[corpus];
            if (tok.text && jpVals.length && !textToJp.has(tok.text)) textToJp.set(tok.text, jpVals[0]);
            globalIdx++;
            tokenCount++;
        }
    }

    const shard = JSON.parse(fs.readFileSync(path.join(indexDir, descriptor.path), 'utf8'));
    assert.equal(shard.sourceVersion, meta.sourceVersion);
    assert.equal(shard.corpus, corpus);
    assert.equal(shard.bookKey, book.key);
    assert.deepStrictEqual(shard.tokens, expectedTokens, `${corpus}/${book.key} token mapping`);
    assert.equal(shard.tokenCount, expectedTokens.length);
    assert.equal(shard.globalIdxStart, chapterStartIdx);
    assert.equal(shard.globalIdxEnd, globalIdx - 1);
    for (const name of ['lemma', 'text', 'strong', 'morph']) {
        assert.deepStrictEqual(shard.index[name], asObject(postings[name]), `${corpus}/${book.key} ${name} postings`);
    }
    const expectedTextToJp = {};
    for (const tok of expectedTokens) {
        if (tok.text && textToJpByCorpus[corpus].has(tok.text)) {
            expectedTextToJp[tok.text] = textToJpByCorpus[corpus].get(tok.text);
        }
    }
    assert.deepStrictEqual(shard.index.textToJp, expectedTextToJp, `${corpus}/${book.key} textToJp`);
}
function corpusDataBookIndex(corpus, bookKey) {
    return meta.corpora[corpus].books.findIndex(b => b.bookKey === bookKey);
}

assert.equal(meta.chapterCount, chapterCount);
assert.equal(meta.tokenCount, tokenCount);
console.log(`PASS: full-corpus shard parity (${chapterCount.toLocaleString()} chapters, ${tokenCount.toLocaleString()} tokens, every token and posting)`);
