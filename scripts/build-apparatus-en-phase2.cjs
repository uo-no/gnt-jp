#!/usr/bin/env node
/**
 * build-apparatus-en-phase2.cjs
 *
 * Phase 2 auto-generation (EN): reading-difference notes for
 * tokenRefStatus=exact entries. Mirror of build-apparatus-ja-phase2.cjs
 * with English typography; readings that have an rdg-en label are shown
 * as 'label (Greek text)', exactly as the JA version uses rdg-ja.
 *
 * Output: public/assets/data/apparatus-en-phase2.json
 *
 * Conditions:
 *   - tokenRefStatus = 'exact'
 *   - verseRange = false
 *   - every reading text within MAX_TEXT_LEN
 *   - no reading with '+' prefix / isOmission / internal '…'
 *   - ID not present in apparatus-en.json (manual) or apparatus-en-auto.json
 *
 * Constraints (L-0):
 *   - No judgement of form, sense, morphology, identity, or superiority.
 *   - Strings and witness facts only; the kind of difference is not asserted.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const BASE_PATH    = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus.json');
const MANUAL_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en.json');
const PHASE1_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-auto.json');
const OUT_PATH     = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-en-phase2.json');
const RDG_EN_PATH  = path.join(__dirname, '..', 'public', 'assets', 'data', 'apparatus-rdg-en.json');

const MAX_TEXT_LEN = 30;

const base   = JSON.parse(fs.readFileSync(BASE_PATH,   'utf8'));
const manual = JSON.parse(fs.readFileSync(MANUAL_PATH, 'utf8'));
const phase1 = JSON.parse(fs.readFileSync(PHASE1_PATH, 'utf8'));
const rdgEnData = JSON.parse(fs.readFileSync(RDG_EN_PATH, 'utf8')).entries || {};

const manualIds = new Set(Object.keys(manual.entries));
const phase1Ids = new Set(Object.keys(phase1.entries));
const coveredIds = new Set([...manualIds, ...phase1Ids]);

const excludedLong   = [];
const excludedOther  = [];
const outEntries     = {};

for (const e of base.entries) {
    if (e.verseRange)           continue;
    if (e.tokenRefStatus !== 'exact') continue;
    if (coveredIds.has(e.id))   continue;

    const rdgs = e.readings;

    // Long-text exclusion.
    if (rdgs.some(r => r.text.length > MAX_TEXT_LEN)) {
        excludedLong.push(e.id);
        continue;
    }

    // Exclude entries with '+' prefix / omission readings.
    if (rdgs.some(r => r.text.startsWith('+') || r.isOmission)) {
        excludedOther.push(e.id);
        continue;
    }

    // Exclude readings containing '…'.
    if (rdgs.some(r => r.text.includes('…'))) {
        excludedOther.push(e.id);
        continue;
    }

    // Exclude empty or dash reading texts (isOmission=false yet empty).
    if (rdgs.some(r => !r.isOmission && (r.text === '' || r.text === '-' || r.text === '–'))) {
        excludedOther.push(e.id);
        continue;
    }

    // en: LABEL (TEXT) (WITNESSES) · TEXT (WITNESSES) ...
    const parts = rdgs.map((r, idx) => {
        const witStr = r.witnesses.join(' ');
        const enLabel = rdgEnData[e.id] && rdgEnData[e.id][String(idx)];
        // Only readings with an existing English label get 'label (Greek)';
        // unlabelled forms stay in the original Greek (L-0, no guessing).
        const readingLabel = enLabel ? `${enLabel} (${r.text})` : r.text;
        return readingLabel + ' (' + witStr + ')';
    });
    const en = parts.join(' · ');

    outEntries[e.id] = {
        tag:       '読み差',
        en,
        status:    '自動生成',
        autoPhase: 2,
    };
}

const entryCount = Object.keys(outEntries).length;

const out = {
    _meta: {
        version:          '1.0.0',
        phase:            2,
        entryCount,
        generatedAt:      new Date().toISOString().slice(0, 10),
        description:      'Phase 2 auto-generation (EN): reading-difference notes for tokenRefStatus=exact entries',
        policy:           'L-0. Reading strings and witness facts only; no assertion of form, sense, or difference type.',
        generator:        'scripts/build-apparatus-en-phase2.cjs',
        excludedManual:   manualIds.size,
        excludedPhase1:   phase1Ids.size,
        excludedLongText: excludedLong.length,
        excludedLongIds:  excludedLong,
        excludedOther:    excludedOther.length,
        maxTextLength:    MAX_TEXT_LEN,
        targetStatus:     'tokenRefStatus=exact, verseRange=false',
    },
    entries: outEntries,
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), 'utf8');
console.log('apparatus-en-phase2.json generated: ' + entryCount + ' entries');
console.log('  long-text exclusions: ' + excludedLong.length + ' — ' + excludedLong.join(', '));
console.log('  other exclusions: ' + excludedOther.length);
console.log('  manual exclusions: ' + manualIds.size);
console.log('  Phase 1 exclusions: ' + phase1Ids.size);
console.log('  output: ' + OUT_PATH);
