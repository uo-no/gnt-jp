#!/usr/bin/env node
/**
 * Audit JA1955 verse coverage against the Greek NT corpus.
 * Reports missing/extra verse keys, empty translations, missing chapter files,
 * and malformed JSON. This is structural validation, not a judgment of
 * Japanese verse-boundary conventions or translation accuracy.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const booksPath = path.join(root, 'public/books.json');
const booksData = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const books = booksData.NT || [];
const issues = [];
let chaptersChecked = 0;
let expectedVerses = 0;
let translatedVerses = 0;

for (const book of books) {
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    chaptersChecked++;
    const label = book.key + ' ' + chapter;
    const translationPath = path.join(root, 'public/translations/JA1955', book.key, chapter + '.json');
    const greekPath = path.join(root, 'public/bible_data/nt', book.key, chapter + '.json');

    if (!fs.existsSync(translationPath)) {
      issues.push({type: 'missing-chapter-file', reference: label, path: path.relative(root, translationPath)});
      continue;
    }
    if (!fs.existsSync(greekPath)) {
      issues.push({type: 'missing-greek-chapter-file', reference: label, path: path.relative(root, greekPath)});
      continue;
    }

    let translation;
    let greek;
    try {
      translation = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
      greek = JSON.parse(fs.readFileSync(greekPath, 'utf8'));
    } catch (error) {
      issues.push({type: 'invalid-json', reference: label, detail: error.message});
      continue;
    }

    const verses = translation.verses;
    if (!verses || typeof verses !== 'object' || Array.isArray(verses)) {
      issues.push({type: 'invalid-verses-object', reference: label});
      continue;
    }

    const expected = new Set();
    for (const token of greek) {
      const ref = String(token.ref || '');
      const match = ref.match(/^[A-Z0-9]+\\s+\\d+:(\\d+)!/);
      if (match) expected.add(Number(match[1]));
    }

    const actual = new Set(Object.keys(verses).map(Number).filter(Number.isInteger));
    for (const verse of expected) {
      expectedVerses++;
      if (!actual.has(verse)) {
        issues.push({type: 'missing-verse', reference: label + ':' + verse});
      } else if (typeof verses[String(verse)] !== 'string' || !verses[String(verse)].trim()) {
        issues.push({type: 'empty-translation', reference: label + ':' + verse});
      } else {
        translatedVerses++;
      }
    }
    for (const verse of actual) {
      if (!expected.has(verse)) issues.push({type: 'extra-translation-verse', reference: label + ':' + verse});
    }
  }
}

console.log(JSON.stringify({
  corpus: 'JA1955 vs Greek NT',
  chaptersChecked,
  expectedVerses,
  translatedVerses,
  issueCount: issues.length,
  issues
}, null, 2));

if (issues.length) process.exitCode = 1;
