'use strict';
/**
 * apparatus-en-refmap.cjs — shared ref → English gloss resolver for the
 * apparatus EN generators (build-apparatus-lem-en / build-apparatus-rdg-en).
 *
 * Mirrors the JA generators' ref → japanese map, but sourced from bible_data
 * (NOT morph-index/word/, which is retired) with a 3-stage fallback stack:
 *   stage 1: bible_data token.english          (the field paired with japanese)
 *   stage 2: gloss-token/WEB sidecar gloss     (trailing punctuation stripped)
 *   stage 3: lexicon-lite gloss via lemmaId    (Abbott-Smith English)
 * resolve(ref) returns { value, stage, source } or null when no stage yields
 * a non-empty gloss. `source` is the raw value before normalisation, kept for
 * the provenance ledger.
 */
const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BIBLE_DATA_DIR = path.join(ROOT, 'public', 'bible_data', 'nt');
const GLOSS_TOKEN_DIR = path.join(ROOT, 'public', 'assets', 'data', 'gloss-token', 'WEB');
const LEXICON_PATH = path.join(ROOT, 'public', 'assets', 'data', 'lexicon', 'lexicon-lite.json');

function stripTrailingPunct(v) {
    return v.replace(/[\s,.;:!?]+$/u, '');
}

// bible_data uses '*' / '-' as placeholder markers for untranslated function
// words (e.g. ἐὰν, JA labels them ［条件語句］). A placeholder is not an
// English gloss: treat it as empty so the next stage supplies the label
// (gloss-token gives [condition] / [particle] / [content] for these).
const PLACEHOLDER = /^[*-]+$/;
function isGloss(v) {
    return v !== '' && !PLACEHOLDER.test(v);
}

function buildResolver() {
    // bible_data: ref -> token
    const tokens = {};
    for (const book of fs.readdirSync(BIBLE_DATA_DIR)) {
        const bookDir = path.join(BIBLE_DATA_DIR, book);
        if (!fs.statSync(bookDir).isDirectory()) continue;
        for (const file of fs.readdirSync(bookDir)) {
            if (!file.endsWith('.json')) continue;
            for (const t of JSON.parse(fs.readFileSync(path.join(bookDir, file), 'utf8'))) {
                if (t && t.ref) tokens[t.ref] = t;
            }
        }
    }
    // gloss-token/WEB: ref -> gloss
    const gt = {};
    for (const book of fs.readdirSync(GLOSS_TOKEN_DIR)) {
        const bookDir = path.join(GLOSS_TOKEN_DIR, book);
        if (!fs.statSync(bookDir).isDirectory()) continue;
        for (const file of fs.readdirSync(bookDir)) {
            if (!file.endsWith('.json')) continue;
            const data = JSON.parse(fs.readFileSync(path.join(bookDir, file), 'utf8'));
            Object.assign(gt, data.glosses || {});
        }
    }
    const lexicon = JSON.parse(fs.readFileSync(LEXICON_PATH, 'utf8'));

    function resolve(ref) {
        const t = tokens[ref];
        if (!t) return null;
        const v1 = (t.english || '').trim();
        if (isGloss(v1)) return { value: v1, stage: 1, source: t.english };
        const raw2 = (gt[ref] || '').trim();
        const v2 = stripTrailingPunct(raw2);
        if (isGloss(v2)) return { value: v2, stage: 2, source: gt[ref] };
        const lex = t.lemmaId ? lexicon[t.lemmaId] : null;
        const v3 = lex ? (lex.gloss || '').trim() : '';
        if (isGloss(v3)) return { value: v3, stage: 3, source: lex.gloss };
        return null;
    }
    return { resolve, tokens };
}

module.exports = { buildResolver };
