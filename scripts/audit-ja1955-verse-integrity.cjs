#!/usr/bin/env node
/**
 * Structural audit of JA1955 verse keys against the Greek NT token corpus.
 * The Greek corpus is not a complete versification authority: JA1955 retains
 * several traditional/textual-variant verses, and its Romans 16 doxology
 * (25–27) is not indexed in the current Greek token corpus. Those differences
 * are reported separately and never deleted or treated as missing Japanese text.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const booksData = JSON.parse(fs.readFileSync(path.join(root, 'public/books.json'), 'utf8'));
const books = booksData.NT || [];
const blockingIssues = [];
const knownDifferences = [];
let chaptersChecked = 0;
let expectedVerses = 0;
let translatedVerses = 0;

// Verses present in the traditional JA1955 text but absent from this Greek
// corpus due to textual/versification differences. Keep the Japanese text.
const translationOnlyVerses = new Set([
  'MAT 17:21', 'MAT 18:11', 'MAT 23:14',
  'MRK 7:16', 'MRK 9:44', 'MRK 9:46', 'MRK 11:26', 'MRK 15:28',
  'LUK 17:36', 'LUK 23:17', 'JHN 5:4',
  'ACT 8:37', 'ACT 15:34', 'ACT 19:41', 'ACT 24:7', 'ACT 28:29'
]);

// The token corpus currently has no indexed tokens for Romans 16:25–27.
// The Japanese text is present and is checked manually in the data file.
const greekCorpusCoverageGaps = new Set([
  'ROM 16:25', 'ROM 16:26', 'ROM 16:27'
]);

for (const book of books) {
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    chaptersChecked++;
    const label = book.key + ' ' + chapter;
    const translationPath = path.join(root, 'public/translations/JA1955', book.key, chapter + '.json');
    const greekPath = path.join(root, 'public/bible_data/nt', book.key, chapter + '.json');

    if (!fs.existsSync(translationPath)) {
      blockingIssues.push({type: 'missing-chapter-file', reference: label});
      continue;
    }
    if (!fs.existsSync(greekPath)) {
      blockingIssues.push({type: 'missing-greek-chapter-file', reference: label});
      continue;
    }

    let translation;
    let greek;
    try {
      translation = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
      greek = JSON.parse(fs.readFileSync(greekPath, 'utf8'));
    } catch (error) {
      blockingIssues.push({type: 'invalid-json', reference: label, detail: error.message});
      continue;
    }

    const verses = translation.verses;
    if (!verses || typeof verses !== 'object' || Array.isArray(verses)) {
      blockingIssues.push({type: 'invalid-verses-object', reference: label});
      continue;
    }

    const expected = new Set();
    for (const token of greek) {
      const ref = String(token.ref || '');
      const match = ref.match(/^[A-Z0-9]+ [0-9]+:([0-9]+)!/);
      if (match) expected.add(Number(match[1]));
    }

    const actual = new Set(Object.keys(verses).map(Number).filter(Number.isInteger));
    for (const verse of expected) {
      expectedVerses++;
      const reference = label + ':' + verse;
      if (!actual.has(verse)) {
        blockingIssues.push({type: 'missing-verse', reference});
      } else if (typeof verses[String(verse)] !== 'string' || !verses[String(verse)].trim()) {
        blockingIssues.push({type: 'empty-translation', reference});
      } else {
        translatedVerses++;
      }
    }

    for (const verse of actual) {
      const reference = label + ':' + verse;
      if (expected.has(verse)) continue;
      if (translationOnlyVerses.has(reference)) {
        knownDifferences.push({type: 'traditional-verse-not-in-greek-corpus', reference});
      } else if (greekCorpusCoverageGaps.has(reference)) {
        knownDifferences.push({type: 'greek-corpus-coverage-gap', reference});
      } else {
        blockingIssues.push({type: 'unclassified-extra-translation-verse', reference});
      }
      if (typeof verses[String(verse)] !== 'string' || !verses[String(verse)].trim()) {
        blockingIssues.push({type: 'empty-translation', reference});
      }
    }
  }
}

const result = {
  corpus: 'JA1955 vs Greek NT',
  chaptersChecked,
  expectedVerses,
  translatedVerses,
  blockingIssueCount: blockingIssues.length,
  knownDifferenceCount: knownDifferences.length,
  blockingIssues,
  knownDifferences
};
console.log(JSON.stringify(result, null, 2));
if (blockingIssues.length) process.exitCode = 1;
