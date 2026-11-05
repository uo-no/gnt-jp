#!/usr/bin/env node
/**
 * p6c-nt-wide-audit.cjs — P6-C NT 全巻 相対節 connector 監査
 *
 * 実行: node scripts/p6c-nt-wide-audit.cjs
 *       node scripts/p6c-nt-wide-audit.cjs --verbose
 *
 * 目的:
 *   deriveRelativeConnectors が NT 全 27 巻 / 260 章で安全に動作することを確認。
 *   FALSE POSITIVE = 0 (finite verb target connector) が主要指標。
 *
 * 出力:
 *   - 巻ごとの connector 件数
 *   - R4 (finite verb) 誤描画 = 0 確認
 *   - R3 (multi-token) skip 確認
 *   - exception なし確認
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const VERBOSE = process.argv.includes('--verbose');
const PUBLIC  = path.resolve(__dirname, '..', 'public');

// Load dg-engine.js
{
  const code = fs.readFileSync(path.join(PUBLIC, 'core', 'dg-engine.js'), 'utf8');
  vm.runInThisContext(code, { filename: 'dg-engine.js', displayErrors: true });
}
const { deriveRelativeConnectors } = global.DgEngine;

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

const booksJson = loadJson(path.join(PUBLIC, 'books.json'));
const ntBooks   = booksJson.NT;
const ntDir     = booksJson.corpora.NT;

// Stats
let totalConnectors   = 0;
let totalRelProns     = 0;
let totalSentences    = 0;
let totalChapters     = 0;
let exceptions        = 0;
let missingBdChapters = 0;
let missingSrChapters = 0;
const r4Violations    = [];   // FALSE POSITIVES: finite verb target
const connByBook      = {};

function isSRMorph(morph) {
  return typeof morph === 'string' && morph.startsWith('V-')
    && morph.length > 4 && morph[4] !== 'P'
    && morph[4] !== 'N';  // not participle, not infinitive = finite verb
}

for (const book of ntBooks) {
  const bookKey = book.key;
  const bookConnectors = [];
  let bookTotal = 0;

  for (let ch = 1; ch <= book.chapters; ch++) {
    const bdPath = path.join(PUBLIC, 'bible_data', ntDir, bookKey, `${ch}.json`);
    const srPath = path.join(PUBLIC, 'assets', 'data', 'sr', bookKey, `${ch}.json`);

    if (!fs.existsSync(bdPath)) { missingBdChapters++; continue; }
    if (!fs.existsSync(srPath)) { missingSrChapters++; continue; }

    let bdData, srData;
    try {
      bdData = loadJson(bdPath);
      srData = loadJson(srPath);
    } catch(e) { exceptions++; continue; }

    if (!srData.sentences) continue;

    totalChapters++;
    const bdByRef = new Map(bdData.filter(w => w.ref).map(w => [w.ref, w]));
    const bdById  = new Map(bdData.filter(w => w.verseId).map(w => [w.verseId, w]));

    for (const sentence of srData.sentences) {
      totalSentences++;
      try {
        const cons = deriveRelativeConnectors(sentence.root || sentence, bdByRef, bdById);
        bookTotal += cons.length;
        totalConnectors += cons.length;

        for (const c of cons) {
          // Verify no R4 false positive
          const targetTok = bdById.get(c.targetNodeId);
          if (targetTok && isSRMorph(targetTok.morph)) {
            r4Violations.push({
              relPronRef: c.relPronRef,
              relPronText: c.relPronText,
              targetRef: c.targetRef,
              targetText: c.targetText,
              targetMorph: targetTok.morph,
            });
          }
          // Verify no multi-token
          if (c.targetNodeId && c.targetNodeId.includes(' ')) {
            r4Violations.push({ ERROR: 'multi-token target', ...c });
          }
          if (VERBOSE) {
            bookConnectors.push(`  ${c.relPronText} (${c.relPronRef}) → ${c.targetText} (${c.targetRef})`);
          }
        }
      } catch(e) {
        exceptions++;
        if (VERBOSE) console.error(`  EXCEPTION ${bookKey} ${ch} sentence: ${e.message}`);
      }
    }
  }

  connByBook[bookKey] = bookTotal;
  if (VERBOSE && bookConnectors.length > 0) {
    console.log(`\n${bookKey} (${bookTotal} connectors):`);
    bookConnectors.slice(0, 10).forEach(l => console.log(l));
    if (bookConnectors.length > 10) console.log(`  ... +${bookConnectors.length - 10} more`);
  }
}

// Print summary
console.log('\n' + '='.repeat(70));
console.log('P6-C NT-wide Audit');
console.log('='.repeat(70));
console.log(`Chapters scanned:       ${totalChapters}`);
console.log(`Sentences scanned:      ${totalSentences}`);
console.log(`Total connectors:       ${totalConnectors}`);
console.log(`Exceptions:             ${exceptions}`);
console.log(`Missing bd chapters:    ${missingBdChapters}`);
console.log(`Missing SR chapters:    ${missingSrChapters}`);
console.log('');

// Book table
console.log('Book breakdown:');
for (const [book, count] of Object.entries(connByBook)) {
  if (count > 0) console.log(`  ${book.padEnd(8)} ${count}`);
}

console.log('');
if (r4Violations.length === 0) {
  console.log('✓ FALSE POSITIVE = 0 (no finite verb connectors produced)');
} else {
  console.log(`✗ FALSE POSITIVE VIOLATIONS: ${r4Violations.length}`);
  r4Violations.forEach(v => console.log(`  `, JSON.stringify(v)));
}

if (exceptions === 0) {
  console.log('✓ EXCEPTIONS = 0 (deriveRelativeConnectors ran without error)');
} else {
  console.log(`✗ EXCEPTIONS: ${exceptions}`);
}

const PASS = r4Violations.length === 0 && exceptions === 0;
console.log('\n' + '='.repeat(70));
console.log(`Result: ${PASS ? 'PASS' : 'FAIL'}`);
console.log('='.repeat(70));

if (!PASS) process.exitCode = 1;
