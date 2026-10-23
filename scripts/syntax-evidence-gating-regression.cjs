#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const PUBLIC = path.join(__dirname, '..', 'public');
const POS = {
  noun: 'N', adjective: 'A', adj: 'A', article: 'T', det: 'T',
  verb: 'V', prep: 'P', preposition: 'P', conj: 'C', conjunction: 'C',
  adv: 'D', adverb: 'D', ptcl: 'X', particle: 'X', pronoun: 'R', pron: 'R'
};
global.entryPosCode = token => {
  if (!token || typeof token !== 'object') return '';
  if (token.pos) return String(token.pos).replace(/-$/, '').toUpperCase();
  return POS[String(token.class || '').toLowerCase()] || '';
};
global.decodeMorph = token => ({
  tense:token?.tense || '', voice:token?.voice || '', mood:token?.mood || '',
  case:token?.case || '', number:token?.number || '', gender:token?.gender || '',
  person:token?.person || ''
});
global.cleanText = token => String(token?.text || token?.normalized || token || '')
  .replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();

const analyzerPath = path.join(PUBLIC, 'core', 'syntax-analyzer.js');
const analyzerSource = fs.readFileSync(analyzerPath, 'utf8');
const analyzerModule = { exports:{} };
const loadAnalyzer = vm.runInThisContext(
  `(function(module,exports,require,__dirname,__filename){\n${analyzerSource}\n})`,
  { filename:analyzerPath, displayErrors:true }
);
loadAnalyzer(analyzerModule, analyzerModule.exports, require, path.dirname(analyzerPath), analyzerPath);
const { SyntaxAnalyzer } = analyzerModule.exports;
const registry = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets/data/syntax-registry.json'), 'utf8'));
const books = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'books.json'), 'utf8'));
const analyzer = new SyntaxAnalyzer(registry);

function verse(book, chapter, verseNumber) {
  const file = path.join(PUBLIC, 'bible_data', books.corpora.NT, book, chapter + '.json');
  return JSON.parse(fs.readFileSync(file, 'utf8')).filter(t => t.ref.startsWith(`${book} ${chapter}:${verseNumber}!`));
}
function outputs(tokens) {
  const result = analyzer.analyzeAll(tokens);
  return new Map(result.results.map((r, i) => [tokens[i].text, r.output.candidates || []]));
}
function candidate(candidates, id) {
  return candidates.find(c => c.id === id);
}
function findType(value, id) {
  if (!value || typeof value !== 'object') return null;
  if (value.id === id && value.detection && value.xsc) return value;
  for (const child of Object.values(value)) {
    const found = findType(child, id);
    if (found) return found;
  }
  return null;
}
function assertEvidenceGate(tokens, label) {
  const byWord = outputs(tokens);
  for (const [word, candidates] of byWord) {
    for (const item of candidates) {
      const typeDef = findType(registry, item.id);
      if (!typeDef) continue;
      const conditions = typeDef.detection?.conditions || [];
      const matched = item.signals_matched || [];
      assert.ok(conditions.length === 0 || matched.length > 0,
        `${label} ${word} emitted ${item.id} despite all declared conditions failing`);
      const required = typeDef.detection?.required_signals || [];
      assert.ok(required.every(id => matched.includes(id)),
        `${label} ${word} emitted ${item.id} without all required signals: ${required.join(', ')}`);
    }
  }
}

// Ephesians 1:10: Χριστῷ is governed by ἐν and cannot be the left-dislocated
// token merely because a later dative pronoun is found in the same verse.
const eph110 = verse('EPH', 1, 10);
assertEvidenceGate(eph110, 'EPH 1:10');
const ephOutputs = outputs(eph110);
assert.equal(candidate(ephOutputs.get('Χριστῷ') || [], 'discourse.left_dislocation'), undefined,
  'a preposition-governed noun inside ἐν τῷ Χριστῷ must not be labelled left-dislocated');

// A left-dislocation candidate must carry the actual structural signal, not only
// the category's positive prior/base weight.
for (const [word, candidates] of ephOutputs) {
  const left = candidate(candidates, 'discourse.left_dislocation');
  if (left) assert.ok(left.signals_matched.includes('pendens'),
    `left-dislocation candidate for ${word} must have a matched pendens signal`);
}

// Acts 7:40 is the registry's canonical nominative-pendens example. A nominative
// form alone is not enough; both clause-initial position and resumption are required.
const act740 = verse('ACT', 7, 40);
assertEvidenceGate(act740, 'ACT 7:40');
const actsOutputs = outputs(act740);
for (const [word, candidates] of actsOutputs) {
  const pendens = candidate(candidates, 'nominative.pendens');
  if (pendens) {
    assert.ok(pendens.signals_matched.includes('initial'), `${word}: pendens must be initial`);
    assert.ok(pendens.signals_matched.includes('resume'), `${word}: pendens must have resumption evidence`);
  }
}

// Romans 12:15 is the Registry's canonical imperatival-infinitive example.
// Require both evidence signals before a candidate can be emitted.
const rom1215 = verse('ROM', 12, 15);
assertEvidenceGate(rom1215, 'ROM 12:15');
const romOutputs = outputs(rom1215);
const imperativeInfinitives = [...romOutputs.entries()]
  .filter(([word]) => ['χαίρειν', 'κλαίειν'].includes(word))
  .map(([word, candidates]) => ({ word, item:candidate(candidates, 'infinitive.imperatival') }));
for (const word of ['χαίρειν', 'κλαίειν']) {
  const found = imperativeInfinitives.find(x => x.word === word);
  assert.ok(found, `ROM 12:15 token ${word} must be present in the test data`);
  assert.ok(found.item, `ROM 12:15 ${word} should remain a candidate in the canonical example`);
  assert.ok(found.item.signals_matched.includes('no_finite_verb'), `${word}: missing no-finite-verb evidence`);
  assert.ok(found.item.signals_matched.includes('anarthrous_inf'), `${word}: missing anarthrous-infinitive evidence`);
}

console.log('PASS: emitted candidates satisfy required signals and evidence-first gates');
console.log('PASS: left-dislocation candidates require positive structural evidence');
console.log('PASS: preposition-governed Χριστῷ is not labelled left-dislocated');
console.log('PASS: nominative pendens requires initial + resumption signals');
console.log('PASS: canonical Romans 12:15 imperatival infinitives remain available');
