#!/usr/bin/env node
/**
 * build-apparatus-en-auto.cjs
 *
 * Phase 1 auto-generation (EN): factual English notes for addition
 * ('+' prefix) and omission (isOmission=true) entries, generated from
 * apparatus.json. Mirror of build-apparatus-ja-auto.cjs with English
 * templates; the lemma label embedded in omission notes comes from
 * apparatus-lem-en.json (generate lem-en first).
 *
 * Output: public/assets/data/apparatus-en-auto.json
 *
 * Constraints:
 *   - L-0: no translation, inference, or sense selection. Mechanical facts
 *     only (witness names, added text, lemText).
 *   - The 30 hand-edited entries in apparatus-en.json are excluded.
 *   - verseRange=true entries are excluded.
 *   - Typography (approved 2026-11-09): '+', ' (witnesses)', parts joined
 *     by ' / ', long-text marker ' · long text', long-lemma marker
 *     ' · long lemma', omission as '{label} omitted ({witnesses})'.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en.json');
const LEM_EN_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-lem-en.json');
const OUT_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-auto.json');

const MAX_ADDED_LEN = 30;
const MAX_LEM_LEN   = 25;

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const lemEn = JSON.parse(fs.readFileSync(LEM_EN_PATH, 'utf8')).entries || {};

const manualIds = new Set(Object.keys(manual.entries));

/** Format one addition unit. */
function formatAdded(addedText, witnesses) {
    const witStr = witnesses.join(' ');
    if (addedText.length > MAX_ADDED_LEN) {
        const head = addedText.slice(0, 20);
        const tail = addedText.slice(-4);
        return `+${head}…${tail} (${witStr} · long text)`;
    }
    return `+${addedText} (${witStr})`;
}

/** Generate the {tag, en, status, autoPhase} for an entry, or null. */
function generateEntry(e) {
    const plusRdgs = e.readings.filter(r => r.text.startsWith('+'));
    const omitRdgs = e.readings.filter(r => r.isOmission);

    if (plusRdgs.length === 0 && omitRdgs.length === 0) return null;

    const parts = [];

    // Additions first (guarantees tag=添加 notes start with '+').
    if (plusRdgs.length > 0) {
        const groups = new Map();
        for (const r of plusRdgs) {
            const added = r.text.slice(1).trim();
            if (!groups.has(added)) groups.set(added, []);
            groups.get(added).push(...r.witnesses);
        }
        for (const [added, wits] of groups) {
            parts.push(formatAdded(added, wits));
        }
    }

    // Omissions after additions in combined entries.
    if (omitRdgs.length > 0) {
        const wits = omitRdgs.flatMap(r => r.witnesses);
        let lem = e.lemText;
        let lemTruncated = false;
        if (lem.length > MAX_LEM_LEN) {
            lem = lem.slice(0, 20) + '…';
            lemTruncated = true;
        }
        // lemTruncated=true marks a generator truncation (not a source ellipsis).
        const enLem = lemEn[e.id];
        const lemmaLabel = enLem ? `${enLem} (${lem})` : lem;
        parts.push(`${lemmaLabel} omitted (${wits.join(' ')}${lemTruncated ? ' · long lemma' : ''})`);
    }

    const tag = plusRdgs.length > 0 ? '添加' : '省略';
    return { tag, en: parts.join(' / '), status: '自動生成', autoPhase: 1 };
}

// ── Generation ──────────────────────────────────────────────────────
const outEntries = {};
let additionCount = 0;
let omissionCount = 0;
let bothCount     = 0;

for (const e of base.entries) {
    if (e.verseRange)       continue;
    if (manualIds.has(e.id)) continue;

    const result = generateEntry(e);
    if (!result) continue;

    outEntries[e.id] = result;

    const hasPlus = e.readings.some(r => r.text.startsWith('+'));
    const hasOmit = e.readings.some(r => r.isOmission);
    if (hasPlus && hasOmit) bothCount++;
    else if (hasPlus)       additionCount++;
    else                    omissionCount++;
}

const entryCount = Object.keys(outEntries).length;
// Entries whose lemText exceeded MAX_LEM_LEN and was truncated (JA: 14).
const truncatedLemCount = Object.values(outEntries)
    .filter(e => e.en.includes('· long lemma)')).length;

const out = {
    _meta: {
        version:          '1.0.0',
        phase:            1,
        entryCount,
        additionCount,
        omissionCount,
        bothCount,
        truncatedLemCount,
        generatedAt:      new Date().toISOString().slice(0, 10),
        description:      'Phase 1 auto-generation (EN): factual notes for addition (+ prefix) and omission (isOmission=true) entries',
        policy:           'L-0. Mechanical facts only (witness names, added text, lemText). Not hand-checked.',
        generator:        'scripts/build-apparatus-en-auto.cjs',
        excludedManual:   manualIds.size,
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log(`apparatus-en-auto.json generated: ${entryCount} entries`);
console.log(`  addition-only: ${additionCount}, omission-only: ${omissionCount}, both: ${bothCount}`);
console.log(`  truncated lemText (long lemma): ${truncatedLemCount}`);
console.log(`  manual exclusions: ${manualIds.size}`);
console.log(`  output: ${OUT_PATH}`);
