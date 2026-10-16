#!/usr/bin/env node
'use strict';

// Full-corpus integrity check: generated per-book shards must reproduce the
// token mapping and postings produced by the current browser index builder.
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
const corpusData = {
    NT: { books: new Map(), textToJp: new Map(), postings: { lemma: new Map(), text: new Map(), strong: new Map(), morph: new Map() } },
    LXX: { books: new Map(), textToJp: new Map(), postings: { lemma: new Map(), text: new Map(), strong: new Map(), morph: new Map() } },
};
let globalIdx = 0;
let chapterCount = 0;
let tokenCount = 0;

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
function getBook(corpus, bookKey) {
    const books = corpusData[corpus].books;
    if (!books.has(bookKey)) books.set(bookKey, { tokens: [], postings: { lemma: new Map(), text: new Map(), strong: new Map(), morph: new Map() } });
    return books.get(bookKey);
}

for (const book of [...booksMaster.NT, ...booksMaster.OT]) {
    const corpus = ntKeys.has(book.key) ? 'NT' : 'LXX';
    const folder = ntKeys.has(book.key) ? 'nt' : (booksMaster.corpora?.OT || 'lxx');
    const bookData = getBook(corpus, book.key);
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
            bookData.tokens.push(tok);
            const corpusIndexes = corpusData[corpus].postings;
            const localIndexes = bookData.postings;
            add(corpusIndexes.text, tok.text, globalIdx);
            add(corpusIndexes.lemma, tok.lemma, globalIdx);
            add(localIndexes.text, tok.text, globalIdx);
            add(localIndexes.lemma, tok.lemma, globalIdx);
            const nl = normalizeGreek(tok.lemma), nt = normalizeGreek(tok.text);
            if (nl && nl !== tok.lemma) {
                add(corpusIndexes.lemma, nl, globalIdx);
                add(localIndexes.lemma, nl, globalIdx);
            }
            if (nt && nt !== tok.text) {
                add(corpusIndexes.text, nt, globalIdx);
                add(localIndexes.text, nt, globalIdx);
            }
            const strong = tok.strong != null ? normalizeStrong(tok.strong) : null;
            add(corpusIndexes.strong, strong, globalIdx);
            add(localIndexes.strong, strong, globalIdx);
            if (tok.morph) {
                add(corpusIndexes.morph, tok.morph, globalIdx);
                add(localIndexes.morph, tok.morph, globalIdx);
            }
            const jpVals = tok.japanese ? (Array.isArray(tok.japanese) ? tok.japanese : [tok.japanese]) : (tok.gloss ? [tok.gloss] : []);
            if (tok.text && jpVals.length && !corpusData[corpus].textToJp.has(tok.text)) {
                corpusData[corpus].textToJp.set(tok.text, jpVals[0]);
            }
            globalIdx++;
            tokenCount++;
        }
    }
}

function asObject(map) {
    const result = {};
    for (const [key, value] of map) result[key] = value;
    return result;
}
function postingsForBook(corpus, bookData, name) {
    return asObject(bookData.postings[name]);
}

const meta = JSON.parse(fs.readFileSync(path.join(indexDir, 'meta.json'), 'utf8'));
assert.equal(meta.schemaVersion, 2);
assert.equal(meta.chapterCount, chapterCount);
assert.equal(meta.tokenCount, tokenCount);
for (const corpus of ['NT', 'LXX']) {
    const expectedBooks = [...corpusData[corpus].books.entries()];
    assert.equal(meta.corpora[corpus].books.length, expectedBooks.length, `${corpus} manifest book count`);
    for (let i = 0; i < expectedBooks.length; i++) {
        const [bookKey, expected] = expectedBooks[i];
        const descriptor = meta.corpora[corpus].books[i];
        assert.equal(descriptor.bookKey, bookKey, `${corpus} manifest order at ${i}`);
        const shard = JSON.parse(fs.readFileSync(path.join(indexDir, descriptor.path), 'utf8'));
        assert.equal(shard.sourceVersion, meta.sourceVersion);
        assert.equal(shard.corpus, corpus);
        assert.equal(shard.bookKey, bookKey);
        assert.deepStrictEqual(shard.tokens, expected.tokens, `${corpus}/${bookKey} token mapping`);
        assert.equal(shard.tokenCount, expected.tokens.length);
        assert.equal(shard.globalIdxStart, expected.tokens[0].globalIdx);
        assert.equal(shard.globalIdxEnd, expected.tokens[expected.tokens.length - 1].globalIdx);
        for (const name of ['lemma', 'text', 'strong', 'morph']) {
            assert.deepStrictEqual(shard.index[name], postingsForBook(corpus, expected, name),
                `${corpus}/${bookKey} ${name} postings`);
        }
        const expectedTextToJp = {};
        for (const tok of expected.tokens) {
            if (tok.text && corpusData[corpus].textToJp.has(tok.text)) {
                expectedTextToJp[tok.text] = corpusData[corpus].textToJp.get(tok.text);
            }
        }
        assert.deepStrictEqual(shard.index.textToJp, expectedTextToJp, `${corpus}/${bookKey} textToJp`);
    }
}
console.log(`PASS: full-corpus shard parity (${chapterCount.toLocaleString()} chapters, ${tokenCount.toLocaleString()} tokens, every token and posting)`);
