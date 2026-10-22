#!/usr/bin/env node
'use strict';

// Regression test: clause_is_narrative must not see finite past indicatives
// that belong to another clause in the same verse.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'public/core/syntax-analyzer.js'), 'utf8');
const helperStart = source.indexOf('function _clauseTokens(ctx) {');
const helperEnd = source.indexOf("\n\nCheckEvaluator.register('prev_pos_eq'", helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'clause token helper boundaries must exist');

const handlerStart = source.indexOf("CheckEvaluator.register('clause_is_narrative',");
const handlerEnd = source.indexOf("\n);", handlerStart) + 3;
assert(handlerStart >= 0 && handlerEnd > handlerStart, 'narrative handler must exist');
const helperSource = source.slice(helperStart, helperEnd);
const handlerSource = source.slice(handlerStart, handlerEnd);

const handlers = new Map();
const sandbox = {
  CheckEvaluator: { register(name, fn) { handlers.set(name, fn); } },
  decodeMorph(token) { return token.morph || {}; },
};
vm.runInNewContext(helperSource + '\n' + handlerSource, sandbox, { filename: 'clause-narrative-isolated.js' });
const isNarrative = handlers.get('clause_is_narrative');
assert.equal(typeof isNarrative, 'function', 'narrative handler should register');

const tokens = [
  { lemma: 'ὁ', morph: { mood: '', tense: '' } },
  { lemma: 'λέγω', morph: { mood: 'indicative', tense: 'present' } },
  { lemma: 'ἦλθεν', morph: { mood: 'indicative', tense: 'aorist' } },
  { lemma: 'αὐτός', morph: { mood: '', tense: '' } },
];
const ctx = { tokens, targetIdx: 1, clauseStart: 0, clauseEnd: 1 };
assert.equal(isNarrative(ctx), false,
  'a past indicative in a different clause must not make this clause narrative');
console.log('PASS past indicative in another clause is ignored');

ctx.clauseStart = 2;
ctx.clauseEnd = 3;
assert.equal(isNarrative(ctx), true,
  'a past indicative inside the current clause must make the narrative check true');
console.log('PASS past indicative in the current clause is detected');

// Guard against a regression to scanning the entire token array.
const handlerText = handlerSource;
assert(handlerText.includes('_clauseTokens(ctx)'), 'narrative handler must use clause-scoped tokens');
assert(!handlerText.includes('(ctx.tokens ?? []).some'), 'narrative handler must not scan all verse tokens directly');
console.log('PASS narrative check is explicitly clause-scoped');
