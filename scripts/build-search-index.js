#!/usr/bin/env node
/**
 * Build the static search data consumed by public/search-tool.html.
 *
 * Usage:
 *   node scripts/build-search-index.js
 *   node scripts/build-search-index.js --out-dir public/search-index
 *
 * The generated files preserve the browser indexer's token order:
 *   books.json order (NT, then OT/LXX), chapter ascending, token order in source.
 * globalIdx is therefore compatible with the current contiguous-token search model.
 *
 * The runtime loader uses these files when present and validates schema/order; the
 * legacy browser builder remains a fallback until search parity is verified.
 */
'use strict';

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const argValue = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const ROOT = path.resolve(argValue('--root', path.resolve(__dirname, '..')));
const firstExisting = (candidates, label) => {
    const found = candidates.find(p => fs.existsSync(p));
    if (!found) throw new Error(`Cannot locate ${label}. Checked:\n${candidates.join('\n')}`);
    return found;
};

const booksPath = firstExisting([
    path.join(ROOT, 'books.json'),
    path.join(ROOT, 'public', 'books.json'),
], 'books.json');
const dataRoot = firstExisting([
    path.join(ROOT, 'public', 'bible_data'),
    path.join(ROOT, 'bible_data'),
], 'bible_data directory');
const outDirArg = argValue('--out-dir', 'public/search-index');
const outDir = path.isAbsolute(outDirArg) ? outDirArg : path.join(ROOT, outDirArg);
const booksRaw = fs.readFileSync(booksPath);
const booksMaster = JSON.parse(booksRaw.toString('utf8'));
if (!Array.isArray(booksMaster.NT) || !Array.isArray(booksMaster.OT)) {
    throw new Error('books.json must contain NT and OT arrays.');
}

const ntKeys = new Set(booksMaster.NT.map(b => b.key));
const books = [...booksMaster.NT, ...booksMaster.OT];
const indexes = {
    NT: { lemma: Object.create(null), text: Object.create(null), strong: Object.create(null), morph: Object.create(null), textToJp: Object.create(null), tokens: [] },
    LXX: { lemma: Object.create(null), text: Object.create(null), strong: Object.create(null), morph: Object.create(null), textToJp: Object.create(null), tokens: [] },
};
const sourceHash = crypto.createHash('sha256');
sourceHash.update('books.json\\0');
sourceHash.update(booksRaw);
let globalIdx = 0;
let chapterCount = 0;
let tokenCount = 0;
let missingOrInvalid = [];

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
    (map[key] || (map[key] = [])).push(idx);
}

for (const book of books) {
    const corpus = ntKeys.has(book.key) ? 'NT' : 'LXX';
    const folder = ntKeys.has(book.key) ? 'nt' : (booksMaster.corpora?.OT || 'lxx');
    const corpusDir = path.join(dataRoot, folder, book.key);
    for (let ch = 1; ch <= Number(book.chapters); ch++) {
        const chapterPath = path.join(corpusDir, `${ch}.json`);
        if (!fs.existsSync(chapterPath)) {
            missingOrInvalid.push({ book: book.key, chapter: ch, issue: 'missing' });
            continue;
        }
        const raw = fs.readFileSync(chapterPath);
        sourceHash.update(book.key + '/' + ch + '\0');
        sourceHash.update(raw);
        let rows;
        try { rows = JSON.parse(raw.toString('utf8')); }
        catch (error) {
            missingOrInvalid.push({ book: book.key, chapter: ch, issue: 'invalid-json', message: error.message });
            continue;
        }
        if (!Array.isArray(rows)) {
            missingOrInvalid.push({ book: book.key, chapter: ch, issue: 'not-array' });
            continue;
        }
        chapterCount++;
        const target = indexes[corpus];
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
            target.tokens.push(tok);
            add(target.text, tok.text, globalIdx);
            add(target.lemma, tok.lemma, globalIdx);
            const nl = normalizeGreek(tok.lemma), nt = normalizeGreek(tok.text);
            if (nl && nl !== tok.lemma) add(target.lemma, nl, globalIdx);
            if (nt && nt !== tok.text) add(target.text, nt, globalIdx);
            add(target.strong, tok.strong != null ? normalizeStrong(tok.strong) : null, globalIdx);
            if (tok.morph) add(target.morph, tok.morph, globalIdx);
            const jpVals = tok.japanese ? (Array.isArray(tok.japanese) ? tok.japanese : [tok.japanese]) : (tok.gloss ? [tok.gloss] : []);
            if (tok.text && jpVals.length && !Object.hasOwn(target.textToJp, tok.text)) target.textToJp[tok.text] = jpVals[0];
            globalIdx++;
            tokenCount++;
        }
    }
}

if (missingOrInvalid.length) {
    console.error(`[search-index] ${missingOrInvalid.length} missing/invalid chapter files; refusing to emit incomplete indexes.`);
    console.error(missingOrInvalid.slice(0, 30));
    process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const version = sourceHash.digest('hex').slice(0, 16);
const mib = bytes => (bytes / (1024 * 1024)).toFixed(2) + ' MiB';
const corpusMeta = { NT: [], LXX: [] };
let totalRawBytes = 0;
let totalGzipBytes = 0;

for (const corpus of ['NT', 'LXX']) {
    const value = indexes[corpus];
    const byBook = new Map();
    for (const tok of value.tokens) {
        if (!byBook.has(tok.bookKey)) byBook.set(tok.bookKey, []);
        byBook.get(tok.bookKey).push(tok);
    }
    for (const [bookKey, tokens] of byBook) {
        const first = tokens[0].globalIdx;
        const last = tokens[tokens.length - 1].globalIdx;
        const inRange = arr => arr.filter(idx => idx >= first && idx <= last);
        const sliceMap = map => {
            const result = Object.create(null);
            for (const [term, postings] of Object.entries(map)) {
                const filtered = inRange(postings);
                if (filtered.length) result[term] = filtered;
            }
            return result;
        };
        const bookTexts = new Set(tokens.map(tok => tok.text));
        const textToJp = Object.create(null);
        for (const text of bookTexts) {
            if (Object.hasOwn(value.textToJp, text)) textToJp[text] = value.textToJp[text];
        }
        const shard = {
            schemaVersion: 2,
            sourceVersion: version,
            corpus,
            bookKey,
            tokenCount: tokens.length,
            globalIdxStart: first,
            globalIdxEnd: last,
            tokens,
            index: {
                lemma: sliceMap(value.lemma),
                text: sliceMap(value.text),
                strong: sliceMap(value.strong),
                morph: sliceMap(value.morph),
                textToJp,
            },
        };
        const dir = path.join(outDir, corpus.toLowerCase());
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, `${bookKey}.json`);
        const serialized = JSON.stringify(shard);
        fs.writeFileSync(file, serialized);
        const rawBytes = Buffer.byteLength(serialized);
        const gzipBytes = zlib.gzipSync(serialized, { level: 9 }).length;
        totalRawBytes += rawBytes;
        totalGzipBytes += gzipBytes;
        corpusMeta[corpus].push({
            bookKey, path: `${corpus.toLowerCase()}/${bookKey}.json`,
            tokenCount: tokens.length, globalIdxStart: first, globalIdxEnd: last,
            rawBytes, gzipBytes,
        });
        console.log(`[search-index] wrote ${corpus.toLowerCase()}/${bookKey}.json: ${tokens.length.toLocaleString()} tokens; raw ${mib(rawBytes)}, gzip ${mib(gzipBytes)}`);
    }
}
const meta = {
    schemaVersion: 2,
    sourceVersion: version,
    generatedAt: new Date().toISOString(),
    booksSource: path.relative(ROOT, booksPath),
    dataRoot: path.relative(ROOT, dataRoot),
    chapterCount,
    tokenCount,
    totalRawBytes,
    totalGzipBytes,
    corpora: {
        NT: { tokenCount: indexes.NT.tokens.length, books: corpusMeta.NT },
        LXX: { tokenCount: indexes.LXX.tokens.length, books: corpusMeta.LXX },
    },
    japanesePartialIndex: 'intentionally omitted in schema v2; preserve current runtime fallback until separately benchmarked',
};
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`[search-index] complete: ${chapterCount.toLocaleString()} chapters, ${tokenCount.toLocaleString()} tokens, source ${version}; raw ${mib(totalRawBytes)}, gzip ${mib(totalGzipBytes)}`);