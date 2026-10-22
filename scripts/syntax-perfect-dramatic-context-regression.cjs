#!/usr/bin/env node
'use strict';

// Clause-local and verse-level past-indicative cues must remain distinct.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'public/core/syntax-analyzer.js'), 'utf8');
const helperStart = source.indexOf('function _clauseTokens(ctx) {');
const helperEnd = source.indexOf("\n\nCheckEvaluator.register('prev_pos_eq'", helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'clause token helper boundaries must exist');

function extractHandler(name) {
  const start = source.indexOf(`CheckEvaluator.register('${name}',`);
  assert(start >= 0, name + ' handler must exist');
  const end = source.indexOf("\n);", start) + 3;
  assert(end > start, name + ' handler must terminate');
  return source.slice(start, end);
}

const helperSource = source.slice(helperStart, helperEnd);
const clauseSource = extractHandler('clause_has_past_indicative');
const verseSource = extractHandler('verse_has_past_indicative');
const handlers = new Map();
const sandbox = {
  CheckEvaluator: { register(name, fn) { handlers.set(name, fn); } },
  decodeMorph(token) { return token.morph || {}; },
};
vm.runInNewContext(helperSource + '\n' + clauseSource + '\n' + verseSource, sandbox, {
  filename: 'perfect-dramatic-context-isolated.js',
});

const clauseCue = handlers.get('clause_has_past_indicative');
const verseCue = handlers.get('verse_has_past_indicative');
assert.equal(typeof clauseCue, 'function');
assert.equal(typeof verseCue, 'function');

const tokens = [
  { lemma: 'μαρτυρεῖ', morph: { mood: 'indicative', tense: 'present' } },
  { lemma: 'κέκραγεν', morph: { mood: 'indicative', tense: 'perfect' } },
  { lemma: 'ἦν', morph: { mood: 'indicative', tense: 'imperfect' } },
  { lemma: 'εἶπον', morph: { mood: 'indicative', tense: 'aorist' } },
];
const ctx = { tokens, target: tokens[1], targetIdx: 1, clauseStart: 0, clauseEnd: 1 };
assert.equal(clauseCue(ctx), false,
  'a past indicative in a different clause must not count as clause-local evidence');
assert.equal(verseCue(ctx), true,
  'the same past indicative may remain a weaker verse-level context cue');
console.log('PASS clause-local evidence ignores the other clause');
console.log('PASS verse-level narrative cue is preserved separately');

const localClauseTokens = [
  { lemma: 'ἦν', morph: { mood: 'indicative', tense: 'imperfect' } },
  { lemma: 'κέκραγεν', morph: { mood: 'indicative', tense: 'perfect' } },
];
ctx.tokens = localClauseTokens;
ctx.target = localClauseTokens[1];
ctx.targetIdx = 1;
ctx.clauseStart = 0;
ctx.clauseEnd = 1;
assert.equal(clauseCue(ctx), true,
  'a different token with past indicative inside the target clause must count as clause-local evidence');
console.log('PASS clause-local past indicative is detected');

const registry = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public/assets/data/syntax-registry.json'), 'utf8'));
function findById(obj, id) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.id === id) return obj;
  for (const value of Object.values(obj)) {
    const found = findById(value, id);
    if (found) return found;
  }
  return null;
}
const dramatic = findById(registry, 'verb.perfect_dramatic');
assert(dramatic, 'verb.perfect_dramatic must exist');
assert(dramatic.detection.conditions.some(c => c.id === 'narrative_clause' && c.check === 'clause_has_past_indicative()'),
  'dramatic perfect must have a clause-local evidence condition');
assert(dramatic.detection.conditions.some(c => c.id === 'narrative_verse_context' && c.check.includes('verse_has_past_indicative()')),
  'dramatic perfect must retain a separate verse-context condition');
assert(dramatic.xsc.signals.find(s => s.id === 'narrative_verse_context')?.value === 5,
  'cross-clause context must have the weaker +5 weight');
console.log('PASS registry keeps local and broader evidence separate');
