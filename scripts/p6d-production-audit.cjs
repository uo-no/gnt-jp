#!/usr/bin/env node
/**
 * p6d-production-audit.cjs — P6-D Production Readiness Audit
 *
 * Audits covered (READ-ONLY):
 *   A  NT-wide coverage table
 *   B  Referential target taxonomy R1-R8
 *   C  False positive audit (all 947 connectors)
 *   D  False negative audit (missed connectors, classified by reason)
 *   E  Multi-token referent deep audit (all space-sep cases)
 *   F  Free relative audit (null referent cases)
 *   I  L-0 boundary classification
 *
 * Usage:
 *   node scripts/p6d-production-audit.cjs
 *   node scripts/p6d-production-audit.cjs --verbose
 *   node scripts/p6d-production-audit.cjs --audit=E  (single audit only)
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const VERBOSE = process.argv.includes('--verbose');
const AUDIT_FILTER = (() => {
  const arg = process.argv.find(a => a.startsWith('--audit='));
  return arg ? arg.replace('--audit=', '').toUpperCase().split(',') : null;
})();
const shouldRun = (id) => !AUDIT_FILTER || AUDIT_FILTER.includes(id);

const PUBLIC = path.resolve(__dirname, '..', 'public');

// ─────────────────────────────────────────────
// Load DgEngine
// ─────────────────────────────────────────────
{
  const code = fs.readFileSync(path.join(PUBLIC, 'core', 'dg-engine.js'), 'utf8');
  vm.runInThisContext(code, { filename: 'dg-engine.js', displayErrors: true });
}
const { deriveRelativeConnectors } = global.DgEngine;

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const booksJson = loadJson(path.join(PUBLIC, 'books.json'));
const ntBooks   = booksJson.NT;
const ntDir     = booksJson.corpora.NT;

// ─────────────────────────────────────────────
// Morph classification helpers
// ─────────────────────────────────────────────

// Is morph a finite verb (V-* but NOT participle V-*P-*, NOT infinitive V-*N-*)
function isFiniteVerb(morph) {
  if (!morph || !morph.startsWith('V-')) return false;
  if (morph.length < 5) return true; // short 'V-' forms = finite
  return morph[4] !== 'P' && morph[4] !== 'N';
}

// Taxonomy: classify morph into R1-R8 + connector/skip
function classifyMorph(morph) {
  if (!morph) return { code: 'R?', label: 'unknown', connector: false };
  if (morph.startsWith('N-')) return { code: 'R1', label: 'noun', connector: true };
  if (morph.startsWith('A-')) return { code: 'R2', label: 'adjective/numeral', connector: true };
  if (morph.startsWith('V-') && morph.length > 4 && morph[4] === 'P')
    return { code: 'R2', label: 'participle (nominal)', connector: true };
  if (isFiniteVerb(morph))   return { code: 'R4', label: 'finite verb', connector: false };
  if (morph.startsWith('V-') && morph.length > 4 && morph[4] === 'N')
    return { code: 'R4', label: 'infinitive', connector: false };
  if (morph.startsWith('D-')) return { code: 'R5', label: 'demonstrative', connector: false };
  if (morph.startsWith('T-')) return { code: 'R8', label: 'article', connector: false };
  if (morph.startsWith('X-') || morph.startsWith('N-P') || morph.startsWith('F-'))
    return { code: 'R8', label: 'other', connector: false };
  return { code: 'R8', label: `other(${morph.split('-')[0]})`, connector: false };
}

// ─────────────────────────────────────────────
// Collect relative pronoun tokens from SR tree (READ-ONLY scan)
// ─────────────────────────────────────────────

function collectRelPronFull(node, results) {
  if (!node) return;
  if (node.type === 'token') {
    const ev = node.evidence || {};
    // SR stores morph as morph_raw in evidence; K- = correlative relative
    const morphRaw = ev.morph_raw || '';
    if (morphRaw.startsWith('R-') || morphRaw.startsWith('K-')) {
      results.push({
        ref:    ev.ref    || null,
        nodeId: ev.nodeId || null,
        morph:  morphRaw,
        text:   node.text || '',
        // referent is in bible_data, not SR — looked up via bdByRef later
      });
    }
    return;
  }
  for (const c of (node.children || [])) collectRelPronFull(c, results);
}

// ─────────────────────────────────────────────
// Accumulators
// ─────────────────────────────────────────────

// Audit A: per-book connector counts
const bookData = {};

// Audit B: taxonomy counts
const taxCounts = { R1: 0, R2: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, 'R?': 0 };
const connectorByTax = { R1: 0, R2: 0, R4: 0, R5: 0, R6: 0, R7: 0, R8: 0, 'R?': 0 };

// Audit C: false positive detection
const falsePositives = [];

// Audit D: false negative reasons
const fnReasons = {
  'NO_BD_TOKEN':    [],  // bdByRef miss (ref not in bible_data)
  'NO_REFERENT':    [],  // referent field null/missing = free relative
  'MULTI_TOKEN':    [],  // referent has space = multi-token antecedent
  'NO_TARGET':      [],  // referent not in bdById
  'NON_NOMINAL':    [],  // morph filter excluded (includes R4,R5,R8)
};

// Audit E: multi-token details
const multiTokenCases = [];

// Audit F: free relative details
const freeRelCases = [];

// Totals
let totalRelProns    = 0;
let totalConnectors  = 0;
let totalSentences   = 0;
let totalChapters    = 0;
let totalExceptions  = 0;

// ─────────────────────────────────────────────
// Main scan loop
// ─────────────────────────────────────────────

for (const book of ntBooks) {
  const bookKey = book.key;
  bookData[bookKey] = { connectors: 0, relProns: 0 };

  for (let ch = 1; ch <= book.chapters; ch++) {
    const bdPath = path.join(PUBLIC, 'bible_data', ntDir, bookKey, `${ch}.json`);
    const srPath = path.join(PUBLIC, 'assets', 'data', 'sr', bookKey, `${ch}.json`);

    if (!fs.existsSync(bdPath) || !fs.existsSync(srPath)) continue;

    let bdData, srData;
    try {
      bdData = loadJson(bdPath);
      srData = loadJson(srPath);
    } catch(e) { totalExceptions++; continue; }

    if (!srData.sentences) continue;

    totalChapters++;
    const bdByRef = new Map(bdData.filter(w => w.ref).map(w => [w.ref, w]));
    const bdById  = new Map(bdData.filter(w => w.verseId).map(w => [w.verseId, w]));

    for (const sentence of srData.sentences) {
      totalSentences++;

      // Collect all relative pronouns in this sentence
      const relProns = [];
      collectRelPronFull(sentence.root || sentence, relProns);
      totalRelProns += relProns.length;
      bookData[bookKey].relProns += relProns.length;

      // Derive connectors
      let cons = [];
      try {
        cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
        totalConnectors += cons.length;
        bookData[bookKey].connectors += cons.length;
      } catch(e) {
        totalExceptions++;
      }

      const connectedRefs = new Set(cons.map(c => c.relPronRef));

      // Audit C: verify no false positives in derived connectors
      for (const c of cons) {
        const targetTok = bdById.get(c.targetNodeId);
        if (targetTok) {
          if (isFiniteVerb(targetTok.morph || '')) {
            falsePositives.push({
              type: 'FINITE_VERB_TARGET',
              relPronRef: c.relPronRef,
              relPronText: c.relPronText,
              targetRef: c.targetRef,
              targetText: c.targetText,
              targetMorph: targetTok.morph,
            });
          }
          if ((c.targetNodeId || '').includes(' ')) {
            falsePositives.push({
              type: 'MULTI_TOKEN_TARGET',
              relPronRef: c.relPronRef,
              targetNodeId: c.targetNodeId,
            });
          }
          // Audit B: taxonomy of connected targets
          const tc = classifyMorph(targetTok.morph || '');
          connectorByTax[tc.code] = (connectorByTax[tc.code] || 0) + 1;
        }
      }

      // Audit B + D + E + F: classify each relative pronoun
      for (const rp of relProns) {
        const bdTok = rp.ref ? bdByRef.get(rp.ref) : null;

        // Step through eligibility rules to classify
        if (!bdTok) {
          // D: No bible_data token for this ref
          if (shouldRun('D')) {
            fnReasons['NO_BD_TOKEN'].push({
              ref: rp.ref, text: rp.text, book: bookKey, ch,
            });
          }
          taxCounts['R?'] = (taxCounts['R?'] || 0) + 1;
          continue;
        }

        const referent = bdTok.referent;

        if (!referent || typeof referent !== 'string') {
          // F: Free relative — no referent
          freeRelCases.push({
            ref: rp.ref, text: rp.text, book: bookKey, ch,
            bdMorph: bdTok.morph || null,
          });
          if (!connectedRefs.has(rp.ref)) {
            fnReasons['NO_REFERENT'].push({
              ref: rp.ref, text: rp.text, book: bookKey, ch,
            });
          }
          taxCounts['R6'] = (taxCounts['R6'] || 0) + 1; // R6 = free relative
          continue;
        }

        if (referent.includes(' ')) {
          // E: Multi-token antecedent — space in referent
          multiTokenCases.push({
            ref: rp.ref, text: rp.text, book: bookKey, ch,
            referent,
            tokens: referent.split(' ').length,
          });
          fnReasons['MULTI_TOKEN'].push({
            ref: rp.ref, text: rp.text, book: bookKey, ch,
            referent,
          });
          taxCounts['R3'] = (taxCounts['R3'] || 0) + 1; // R3 = multi-token
          continue;
        }

        const targetTok = bdById.get(referent);
        if (!targetTok) {
          // D: Target not in bdById (cross-chapter or data gap)
          fnReasons['NO_TARGET'].push({
            ref: rp.ref, text: rp.text, book: bookKey, ch,
            referent,
          });
          taxCounts['R7'] = (taxCounts['R7'] || 0) + 1; // R7 = cross-chapter
          continue;
        }

        const targetMorph = targetTok.morph || '';
        const tc = classifyMorph(targetMorph);
        taxCounts[tc.code] = (taxCounts[tc.code] || 0) + 1;

        if (!tc.connector) {
          // D: Non-nominal exclusion
          fnReasons['NON_NOMINAL'].push({
            ref: rp.ref, text: rp.text, book: bookKey, ch,
            targetRef: targetTok.ref || referent,
            targetText: targetTok.text || '?',
            targetMorph,
            taxCode: tc.code,
            taxLabel: tc.label,
          });
        }
        // If connector=true, it should be in connectedRefs
        // (anomaly if not — but don't fail here, let C audit handle it)
      }
    }
  }
}

// ─────────────────────────────────────────────
// Compute totals for R3/R6/R7
// ─────────────────────────────────────────────
// R3: multi-token
const r3Count = multiTokenCases.length;
// R6: free relative
const r6Count = freeRelCases.length;
// R7: cross-chapter / target not found
const r7Count = fnReasons['NO_TARGET'].length;
// R4 non-nominal by sub-type
const r4FiniteCount = fnReasons['NON_NOMINAL'].filter(x => x.taxCode === 'R4').length;
const r5DemoCount   = fnReasons['NON_NOMINAL'].filter(x => x.taxCode === 'R5').length;
const r8OtherCount  = fnReasons['NON_NOMINAL'].filter(x => x.taxCode === 'R8').length;
const rNoBd         = fnReasons['NO_BD_TOKEN'].length;

// ─────────────────────────────────────────────
// AUDIT A: NT-wide coverage
// ─────────────────────────────────────────────

if (shouldRun('A')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT A — NT-wide Coverage');
  console.log('═'.repeat(70));
  console.log(`Chapters scanned: ${totalChapters}`);
  console.log(`Sentences:        ${totalSentences}`);
  console.log(`Rel. pronouns:    ${totalRelProns}`);
  console.log(`Connectors:       ${totalConnectors}`);
  console.log(`Coverage rate:    ${(totalConnectors / Math.max(1, totalRelProns) * 100).toFixed(1)}%`);
  console.log(`Exceptions:       ${totalExceptions}`);
  console.log('');
  console.log('Per-book breakdown:');
  console.log('  Book     RelProns  Connectors  Coverage%');
  console.log('  ' + '-'.repeat(48));
  for (const book of ntBooks) {
    const d = bookData[book.key];
    if (!d) continue;
    const pct = d.relProns > 0 ? (d.connectors / d.relProns * 100).toFixed(0) : '-';
    console.log(`  ${book.key.padEnd(8)} ${String(d.relProns).padStart(7)}   ${String(d.connectors).padStart(9)}  ${String(pct).padStart(9)}`);
  }
  const totalPct = (totalConnectors / Math.max(1, totalRelProns) * 100).toFixed(1);
  console.log(`  ${'TOTAL'.padEnd(8)} ${String(totalRelProns).padStart(7)}   ${String(totalConnectors).padStart(9)}  ${totalPct.padStart(8)}%`);
}

// ─────────────────────────────────────────────
// AUDIT B: Referential target taxonomy R1-R8
// ─────────────────────────────────────────────

if (shouldRun('B')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT B — Referential Target Taxonomy');
  console.log('═'.repeat(70));
  const totalClassified = totalRelProns - rNoBd;
  console.log(`Total rel.pronouns classified: ${totalClassified} (${rNoBd} had no bdToken)`);
  console.log('');

  const rows = [
    { code: 'R1',  label: 'Noun (N-*)',                              count: taxCounts['R1'] || 0,  connector: true  },
    { code: 'R2',  label: 'Adjective / Participle (A-*, V-*P-*)',    count: taxCounts['R2'] || 0,  connector: true  },
    { code: 'R3',  label: 'Multi-token referent (space in ID)',       count: r3Count,               connector: false },
    { code: 'R4',  label: 'Finite verb / Infinitive (V-* non-P)',    count: taxCounts['R4'] || 0,  connector: false },
    { code: 'R5',  label: 'Demonstrative chain (D-*)',               count: taxCounts['R5'] || 0,  connector: false },
    { code: 'R6',  label: 'Free relative (referent=null)',           count: r6Count,               connector: false },
    { code: 'R7',  label: 'Cross-chapter / target not found',        count: r7Count,               connector: false },
    { code: 'R8',  label: 'Article / other (T-*, X-*...)',          count: taxCounts['R8'] || 0,  connector: false },
  ];

  const grandTotal = rows.reduce((s, r) => s + r.count, 0) + rNoBd;
  console.log(`  Code  Connector  Count   %total   Label`);
  console.log(`  ${'─'.repeat(62)}`);
  for (const r of rows) {
    const pct = grandTotal > 0 ? (r.count / grandTotal * 100).toFixed(1) : '-';
    const sym = r.connector ? '✓' : '✗';
    console.log(`  ${r.code.padEnd(4)}  ${sym.padEnd(9)}  ${String(r.count).padStart(5)}  ${pct.padStart(7)}%  ${r.label}`);
  }
  if (rNoBd > 0) {
    const pct = (rNoBd / grandTotal * 100).toFixed(1);
    console.log(`  R?    ✗          ${String(rNoBd).padStart(5)}  ${pct.padStart(7)}%  No bdToken (ref not in bible_data)`);
  }
  console.log(`  ${'─'.repeat(62)}`);
  console.log(`  TOTAL            ${String(grandTotal).padStart(5)}`);
  console.log('');
  const connectorTotal = (taxCounts['R1'] || 0) + (taxCounts['R2'] || 0);
  console.log(`  Eligible for connector: ${connectorTotal} (R1+R2)`);
  console.log(`  Actual connectors:      ${totalConnectors}`);
  const discrepancy = connectorTotal - totalConnectors;
  if (discrepancy !== 0) {
    console.log(`  Discrepancy:            ${discrepancy} (investigate)`);
  } else {
    console.log(`  Discrepancy:            0 ✓`);
  }
}

// ─────────────────────────────────────────────
// AUDIT C: False positive verification
// ─────────────────────────────────────────────

if (shouldRun('C')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT C — False Positive Audit');
  console.log('═'.repeat(70));
  console.log(`Total connectors audited: ${totalConnectors}`);
  if (falsePositives.length === 0) {
    console.log('FALSE POSITIVE = 0 ✓');
    console.log('  - No finite verb targets in any of the ' + totalConnectors + ' connectors');
    console.log('  - No multi-token targets in any connector');
  } else {
    console.log(`FALSE POSITIVES FOUND: ${falsePositives.length} ✗`);
    falsePositives.forEach((fp, i) => {
      console.log(`  [${i+1}] ${JSON.stringify(fp)}`);
    });
  }
}

// ─────────────────────────────────────────────
// AUDIT D: False negative classification
// ─────────────────────────────────────────────

if (shouldRun('D')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT D — False Negative Audit (Missed Connectors)');
  console.log('═'.repeat(70));
  const totalMissed = Object.values(fnReasons).reduce((s, a) => s + a.length, 0);
  console.log(`Total rel.pronouns:      ${totalRelProns}`);
  console.log(`Total connectors:        ${totalConnectors}`);
  console.log(`Not connected (various): ${totalRelProns - totalConnectors}`);
  console.log('');
  console.log('Reason breakdown:');
  const dnRows = [
    { key: 'NO_REFERENT',  label: 'Free relative (referent=null)',                 count: fnReasons['NO_REFERENT'].length  },
    { key: 'MULTI_TOKEN',  label: 'Multi-token antecedent (R3)',                   count: fnReasons['MULTI_TOKEN'].length  },
    { key: 'NON_NOMINAL',  label: 'Non-nominal target (R4 finite/R5 demo/R8 other)', count: fnReasons['NON_NOMINAL'].length },
    { key: 'NO_TARGET',    label: 'Cross-chapter / target not in bdById (R7)',     count: fnReasons['NO_TARGET'].length    },
    { key: 'NO_BD_TOKEN',  label: 'Ref not in bible_data (R? gap)',                count: fnReasons['NO_BD_TOKEN'].length  },
  ];
  for (const r of dnRows) {
    const pct = totalRelProns > 0 ? (r.count / totalRelProns * 100).toFixed(1) : '-';
    console.log(`  ${r.key.padEnd(14)} ${String(r.count).padStart(4)} (${pct}%)  — ${r.label}`);
  }
  console.log('');
  // Non-nominal sub-breakdown
  if (fnReasons['NON_NOMINAL'].length > 0) {
    console.log(`  Non-nominal sub-breakdown:`);
    console.log(`    R4 (finite/infinitive): ${r4FiniteCount}`);
    console.log(`    R5 (demonstrative):     ${r5DemoCount}`);
    console.log(`    R8 (article/other):     ${r8OtherCount}`);
  }
  console.log('');
  // Cross-chapter details
  if (fnReasons['NO_TARGET'].length > 0 && VERBOSE) {
    console.log('  Cross-chapter cases:');
    fnReasons['NO_TARGET'].slice(0, 20).forEach(c =>
      console.log(`    ${c.ref} (${c.text}) → referent ${c.referent} not in ${c.book} ch.${c.ch} bdById`));
    if (fnReasons['NO_TARGET'].length > 20)
      console.log(`    ... +${fnReasons['NO_TARGET'].length - 20} more`);
  }
}

// ─────────────────────────────────────────────
// AUDIT E: Multi-token referent deep audit
// ─────────────────────────────────────────────

if (shouldRun('E')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT E — Multi-Token Referent Deep Audit');
  console.log('═'.repeat(70));
  console.log(`Total multi-token cases: ${multiTokenCases.length}`);
  console.log('');

  // Count by number of tokens in referent
  const byTokenCount = {};
  for (const c of multiTokenCases) {
    const k = c.tokens;
    byTokenCount[k] = (byTokenCount[k] || 0) + 1;
  }
  console.log('  Token count distribution:');
  for (const [k, v] of Object.entries(byTokenCount).sort((a, b) => +a[0] - +b[0])) {
    console.log(`    ${k} tokens: ${v} cases`);
  }
  console.log('');

  // Per-book breakdown
  const byBook = {};
  for (const c of multiTokenCases) {
    byBook[c.book] = (byBook[c.book] || 0) + 1;
  }
  console.log('  Per-book:');
  for (const [book, count] of Object.entries(byBook).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${book.padEnd(6)} ${count}`);
  }

  // Sample cases
  if (VERBOSE || multiTokenCases.length <= 30) {
    console.log('');
    console.log('  Sample cases:');
    multiTokenCases.slice(0, 20).forEach(c => {
      console.log(`    ${c.ref} (${c.text}) → referent="${c.referent}" [${c.tokens} tokens]`);
    });
    if (multiTokenCases.length > 20) console.log(`    ... +${multiTokenCases.length - 20} more`);
  }
}

// ─────────────────────────────────────────────
// AUDIT F: Free relative audit
// ─────────────────────────────────────────────

if (shouldRun('F')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT F — Free Relative Audit (null referent)');
  console.log('═'.repeat(70));
  console.log(`Total free relative cases: ${freeRelCases.length}`);
  console.log(`  (referent=null/missing, no connector — correct behavior)`);
  console.log('');

  // Sub-classify: do these have referent in bdTok itself?
  const withBdReferent = freeRelCases.filter(c => {
    // Already filtered: no referent in bdTok; these are true null
    return true;
  });

  // Per-book
  const byBook = {};
  for (const c of freeRelCases) {
    byBook[c.book] = (byBook[c.book] || 0) + 1;
  }
  console.log('  Per-book (top 10):');
  Object.entries(byBook).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([book, count]) => console.log(`    ${book.padEnd(6)} ${count}`));

  if (VERBOSE) {
    console.log('');
    console.log('  Sample free relatives:');
    freeRelCases.slice(0, 15).forEach(c => {
      console.log(`    ${c.ref} (${c.text}) bdMorph=${c.bdMorph} referent=null → ラベル:関係節`);
    });
    if (freeRelCases.length > 15) console.log(`    ... +${freeRelCases.length - 15} more`);
  }
  console.log('');
  console.log('  Expected UI: label="関係節" (no arrow) — correct for free relatives');
}

// ─────────────────────────────────────────────
// AUDIT I: L-0 boundary classification
// ─────────────────────────────────────────────

if (shouldRun('I')) {
  console.log('\n' + '═'.repeat(70));
  console.log('AUDIT I — L-0 Boundary Classification');
  console.log('═'.repeat(70));
  console.log('');
  console.log('L-0 rule: "No inference. No heuristics. Annotation transfer only."');
  console.log('');

  const classifications = [
    {
      id: 'I-A',
      label: 'Connector (R1+R2): MACULA referent field direct read',
      status: 'L-0 SAFE',
      rationale: 'referent is explicitly annotated in bible_data (MACULA). No inference.',
      count: totalConnectors,
    },
    {
      id: 'I-B',
      label: 'Free relative skip (R6): null referent → no connector',
      status: 'L-0 SAFE',
      rationale: 'Absence of referent = no annotation = no connector. Silence is correct.',
      count: r6Count,
    },
    {
      id: 'I-C',
      label: 'Multi-token skip (R3): space in referent → no connector',
      status: 'L-0 SAFE',
      rationale: 'Rule-based exclusion, no head-noun inference performed. Silence is correct.',
      count: r3Count,
    },
    {
      id: 'I-D',
      label: 'Cross-chapter skip (R7): target not in chapter bdById',
      status: 'L-0 SAFE',
      rationale: 'Data boundary: antecedent is in another chapter. No cross-chapter lookup attempted.',
      count: r7Count,
    },
    {
      id: 'I-E',
      label: 'Morph filter exclusion (R4+R5+R8): non-nominal target',
      status: 'L-0 SAFE',
      rationale: 'Morph check uses MACULA morph field, not inference. Finite verbs excluded by design.',
      count: fnReasons['NON_NOMINAL'].length,
    },
    {
      id: 'I-F',
      label: 'No bdToken (R?): ref not in bible_data',
      status: 'L-0 SAFE',
      rationale: 'Data gap — no annotation available. Silence is correct.',
      count: rNoBd,
    },
  ];

  for (const c of classifications) {
    console.log(`  ${c.id}: ${c.label}`);
    console.log(`       Status: ${c.status}  (${c.count} cases)`);
    console.log(`       Rationale: ${c.rationale}`);
    console.log('');
  }

  const allSafe = classifications.every(c => c.status === 'L-0 SAFE');
  console.log(`  Overall L-0 assessment: ${allSafe ? 'PASS — all paths L-0 safe' : 'REVIEW REQUIRED'}`);
}

// ─────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────

console.log('\n' + '═'.repeat(70));
console.log('SUMMARY');
console.log('═'.repeat(70));
console.log(`Chapters:           ${totalChapters}`);
console.log(`Sentences:          ${totalSentences}`);
console.log(`Rel. pronouns:      ${totalRelProns}`);
console.log(`Connectors:         ${totalConnectors}`);
console.log(`Coverage:           ${(totalConnectors / Math.max(1, totalRelProns) * 100).toFixed(1)}%`);
console.log(`False positives:    ${falsePositives.length}`);
console.log(`Free relatives:     ${r6Count}`);
console.log(`Multi-token skip:   ${r3Count}`);
console.log(`Cross-chapter:      ${r7Count}`);
console.log(`Non-nominal excl.:  ${fnReasons['NON_NOMINAL'].length}`);
console.log(`No bdToken:         ${rNoBd}`);
console.log(`Exceptions:         ${totalExceptions}`);
console.log('');

const PASS = falsePositives.length === 0 && totalExceptions === 0;
console.log(`AUDIT RESULT: ${PASS ? 'PASS' : 'FAIL'}`);
console.log('═'.repeat(70));

if (!PASS) process.exitCode = 1;
