#!/usr/bin/env node
/**
 * build-apparatus-en-phase3.cjs
 *
 * Phase 3 auto-generation (EN): reading-difference notes for entries with
 * tokenRefStatus phrase / elision / case. Mirror of
 * build-apparatus-ja-phase3.cjs with English typography.
 *
 * Output: public/assets/data/apparatus-en-phase3.json
 *
 * Conditions (all AND):
 *   - tokenRefStatus in { 'phrase', 'elision', 'case' }
 *   - verseRange = false
 *   - readings.length >= 2
 *   - every reading text within MAX_TEXT_LEN
 *   - no reading text contains '…' (source ellipsis notation)
 *   - not every reading's witnesses are WHspur-only
 *   - ID not present in apparatus-en.json / apparatus-en-auto.json /
 *     apparatus-en-phase2.json
 *
 * Constraints (L-0):
 *   - No assertion of the kind of difference, form, sense, or word order.
 *   - tokenRefStatus does not guarantee the linguistic nature of a difference.
 *   - Strings and witness facts only.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH   = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en.json');
const P1_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-auto.json');
const P2_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-phase2.json');
const OUT_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-phase3.json');

const MAX_TEXT_LEN     = 30;
const TARGET_STATUSES  = new Set(['phrase', 'elision', 'case']);

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const p1     = JSON.parse(fs.readFileSync(P1_PATH,     'utf8'));
const p2     = JSON.parse(fs.readFileSync(P2_PATH,     'utf8'));

const manualIds = new Set(Object.keys(manual.entries));
const p1Ids     = new Set(Object.keys(p1.entries));
const p2Ids     = new Set(Object.keys(p2.entries));
const coveredIds = new Set([...manualIds, ...p1Ids, ...p2Ids]);

// Exclusion counters (exclusive: counted at the first matching reason).
const excluded = {
    covered:    0,
    verseRange: 0,
    oneReading: 0,
    whspur:     0,
    ellipsis:   0,
    longText:   0,
};
const excludedIds = {
    oneReading: [],
    whspur:     [],
    ellipsis:   [],
    longText:   [],
};

const outEntries = {};
const countByTrs = { phrase: 0, elision: 0, case: 0 };

for (const e of base.entries) {
    if (!TARGET_STATUSES.has(e.tokenRefStatus)) continue;

    if (e.verseRange) {
        excluded.verseRange++;
        continue;
    }
    if (coveredIds.has(e.id)) {
        excluded.covered++;
        continue;
    }

    const rdgs = e.readings;

    if (rdgs.length < 2) {
        excluded.oneReading++;
        excludedIds.oneReading.push(e.id);
        continue;
    }
    // Exclude only when EVERY reading carries WHspur (single-reading
    // doubtful-text marker entries); mixed entries stay in scope.
    if (rdgs.every(r => r.witnesses.includes('WHspur'))) {
        excluded.whspur++;
        excludedIds.whspur.push(e.id);
        continue;
    }
    if (rdgs.some(r => r.text.includes('…'))) {
        excluded.ellipsis++;
        excludedIds.ellipsis.push(e.id);
        continue;
    }
    if (rdgs.some(r => r.text.length > MAX_TEXT_LEN)) {
        excluded.longText++;
        excludedIds.longText.push(e.id);
        continue;
    }

    // en: TEXT (WITNESSES) · TEXT (WITNESSES) ...
    const parts = rdgs.map(r => r.text + ' (' + r.witnesses.join(' ') + ')');
    const en    = parts.join(' · ');

    outEntries[e.id] = {
        tag:       '読み差',
        en,
        status:    '自動生成',
        autoPhase: 3,
    };
    countByTrs[e.tokenRefStatus]++;
}

const entryCount = Object.keys(outEntries).length;

const out = {
    _meta: {
        version:           '1.0.0',
        phase:             3,
        entryCount,
        generatedAt:       new Date().toISOString().slice(0, 10),
        description:       'Phase 3 auto-generation (EN): reading-difference notes for phrase / elision / case entries',
        policy:            'L-0. Reading strings and witness facts only; no assertion of difference type, form, or sense. tokenRefStatus does not guarantee the linguistic nature of a difference.',
        generator:         'scripts/build-apparatus-en-phase3.cjs',
        excludedManual:    manualIds.size,
        excludedPhase1:    p1Ids.size,
        excludedPhase2:    p2Ids.size,
        excludedVerseRange:excluded.verseRange,
        excludedCovered:   excluded.covered,
        excludedOneReading:excluded.oneReading,
        excludedOneReadingIds: excludedIds.oneReading,
        excludedWHspur:    excluded.whspur,
        excludedWHspurIds: excludedIds.whspur,
        excludedEllipsis:  excluded.ellipsis,
        excludedEllipsisIds: excludedIds.ellipsis.slice(0, 10),
        excludedLongText:  excluded.longText,
        excludedLongTextIds: excludedIds.longText,
        maxTextLength:     MAX_TEXT_LEN,
        phraseCount:       countByTrs.phrase,
        elisionCount:      countByTrs.elision,
        caseCount:         countByTrs.case,
        targetStatuses:    [...TARGET_STATUSES],
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log('apparatus-en-phase3.json generated: ' + entryCount + ' entries');
console.log('  phrase:', countByTrs.phrase,
    '  elision:', countByTrs.elision,
    '  case:', countByTrs.case);
console.log('  exclusions — covered:', excluded.covered,
    '  1-reading:', excluded.oneReading,
    '  WHspur:', excluded.whspur,
    '  …:', excluded.ellipsis,
    '  long text:', excluded.longText);
console.log('  output: ' + OUT_PATH);
