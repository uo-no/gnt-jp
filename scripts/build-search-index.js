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

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const argValue = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
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
const booksMaster = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
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
for (const corpus of ['NT', 'LXX']) {
    const value = indexes[corpus];
    const file = path.join(outDir, `${corpus.toLowerCase()}.json`);
    fs.writeFileSync(file, JSON.stringify({
        schemaVersion: 1,
        sourceVersion: version,
        corpus,
        tokenCount: value.tokens.length,
        globalIdxStart: value.tokens.length ? value.tokens[0].globalIdx : null,
        globalIdxEnd: value.tokens.length ? value.tokens[value.tokens.length - 1].globalIdx : null,
        tokens: value.tokens,
        index: {
            lemma: value.lemma,
            text: value.text,
            strong: value.strong,
            morph: value.morph,
            textToJp: value.textToJp,
        },
    }));
    console.log(`[search-index] wrote ${path.relative(ROOT, file)}: ${value.tokens.length.toLocaleString()} tokens`);
}
const meta = {
    schemaVersion: 1,
    sourceVersion: version,
    generatedAt: new Date().toISOString(),
    booksSource: path.relative(ROOT, booksPath),
    dataRoot: path.relative(ROOT, dataRoot),
    chapterCount,
    tokenCount,
    corpora: {
        NT: { tokenCount: indexes.NT.tokens.length },
        LXX: { tokenCount: indexes.LXX.tokens.length },
    },
    japanesePartialIndex: 'intentionally omitted in schema v1; preserve current runtime fallback until separately benchmarked',
};
fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
console.log(`[search-index] complete: ${chapterCount.toLocaleString()} chapters, ${tokenCount.toLocaleString()} tokens, source ${version}`);
