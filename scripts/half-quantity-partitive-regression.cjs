#!/usr/bin/env node
'use strict';

// Focused runtime regression for the half-quantity partitive path in Mark 6:23.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

global.decodeMorph = function (e) {
  if (!e || typeof e !== 'object') return {};
  return {
    pos: e.pos || (e.class ? String(e.class).slice(0, 1).toUpperCase() : ''),
    tense: e.tense || '', voice: e.voice || '', mood: e.mood || '',
    case: e.case || '', number: e.number || '', gender: e.gender || '',
    person: e.person || ''
  };
};
global.cleanText = function (e) {
  const s = e && typeof e === 'object' ? (e.text || e.normalized || '') : String(e || '');
  return s.replace(/[.,;:!?·—'··]+$/g, '').trim();
};
global.entryPosCode = function (t) {
  if (!t || typeof t !== 'object') return '';
  if (t.pos) return String(t.pos).replace(/-$/, '').toUpperCase();
  const map = {
    verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T',
    preposition:'P', prep:'P', conjunction:'C', conj:'C',
    adverb:'D', adv:'D', particle:'X', ptcl:'X', pronoun:'R', pron:'R', num:'M'
  };
  if (t.class) return map[String(t.class).toLowerCase()] || '';
  if (t.mood || t.tense || t.voice) return 'V';
  return '';
};

function requireCjs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const mod = { exports: {}, id: filePath, filename: filePath, loaded: false };
  const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
  const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
  fn(mod, mod.exports, require, path.dirname(filePath), filePath);
  return mod.exports;
}

const { SyntaxAnalyzer } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const registry = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'), 'utf8'));
const books = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'books.json'), 'utf8'));
const analyzer = new SyntaxAnalyzer(registry);

function findType(node, id) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = findType(child, id); if (found) return found; }
    return null;
  }
  if (node.id === id && node.detection && node.xsc) return node;
  for (const child of Object.values(node)) { const found = findType(child, id); if (found) return found; }
  return null;
}

const type = findType(registry, 'genitive.partitive');
assert.ok(type, 'genitive.partitive must exist');
assert.deepEqual(type.detection.required_signal_groups, [
  ['partitive_trigger', 'plural_genitive', 'no_preposition'],
  ['half_quantity', 'no_preposition']
], 'partitive must allow either the standard plural pattern or the half-quantity pattern');
assert.deepEqual(type.detection.required_signals || [],
  [], 'legacy required_signals must not block the half-quantity alternative');

const bookKey = 'MRK';
const chapter = 6;
const verse = 23;
const corpus = books.corpora.NT;
const file = path.join(PUBLIC, 'bible_data', corpus, bookKey, chapter + '.json');
const tokens = JSON.parse(fs.readFileSync(file, 'utf8'))
  .filter(t => t.ref && t.ref.startsWith(`${bookKey} ${chapter}:${verse}!`));
assert.ok(tokens.length > 0, 'Mark 6:23 tokens must be present');

const result = analyzer.analyzeAll(tokens);
const entry = result.results.find(r =>
  (r.output?.targetLemma ?? '') === 'βασιλεία' ||
  (tokens[r.tokenIdx]?.lemma ?? '') === 'βασιλεία'
);
assert.ok(entry?.output, 'Mark 6:23 βασιλείας token must be analyzed');
const candidate = (entry.output.candidates || []).find(c => c.id === 'genitive.partitive');
assert.ok(candidate, `Mark 6:23 βασιλείας must retain genitive.partitive; candidates=${(entry.output.candidates || []).map(c => c.id).join(',')}`);
assert.ok((candidate.confidence ?? 0) >= 0.30,
  `Mark 6:23 genitive.partitive confidence must be >= 0.30; got ${candidate.confidence}`);

process.stdout.write('PASS: MRK 6:23 ἡμίσους τῆς βασιλείας μου retains genitive.partitive through the half-quantity alternative (confidence >= 0.30)\n');
