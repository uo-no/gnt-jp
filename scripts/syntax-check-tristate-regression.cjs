#!/usr/bin/env node
'use strict';

// Focused runtime tests for CheckEvaluator's three-valued contract.
// The evaluator is intentionally isolated from browser-dependent analyzer code.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');

const source = fs.readFileSync(path.join(__dirname, '..', 'public/core/syntax-analyzer.js'), 'utf8');
const start = source.indexOf("const CHECK_UNSUPPORTED = Symbol('CHECK_UNSUPPORTED');");
const end = source.indexOf('// ── 組み込みハンドラー登録', start);
assert(start >= 0 && end > start, 'CheckEvaluator source boundaries must exist');

const evaluatorSource = source.slice(start, end) +
  '\nglobalThis.__CheckEvaluator = CheckEvaluator; globalThis.__CHECK_UNSUPPORTED = CHECK_UNSUPPORTED;\n';
const sandbox = { console: { warn() {} } };
vm.runInNewContext(evaluatorSource, sandbox, { filename: 'syntax-check-evaluator-isolated.js' });

const evaluator = sandbox.__CheckEvaluator;
const unsupported = sandbox.__CHECK_UNSUPPORTED;
evaluator.register('test_true', () => true);
evaluator.register('test_false', () => false);
evaluator.register('test_unsupported', () => unsupported);

const status = check => evaluator.evalDetailed(check, {}).status;
const expect = (name, actual, expected) => {
  assert.equal(actual, expected, name);
  console.log('PASS', name);
};

expect('true predicate', status('test_true()'), 'matched');
expect('false predicate', status('test_false()'), 'not_matched');
expect('unsupported predicate', status('test_unsupported()'), 'unsupported');
expect('unknown handler is unsupported', status('not_registered()'), 'unsupported');
expect('NOT true', status('NOT test_true()'), 'not_matched');
expect('NOT false', status('NOT test_false()'), 'matched');
expect('NOT unsupported stays unsupported', status('NOT test_unsupported()'), 'unsupported');
expect('AND with false is false', status('test_true() AND test_false()'), 'not_matched');
expect('AND with unsupported and true is unsupported', status('test_true() AND test_unsupported()'), 'unsupported');
expect('OR with true is true', status('test_true() OR test_unsupported()'), 'matched');
expect('OR with false and unsupported is unsupported', status('test_false() OR test_unsupported()'), 'unsupported');
expect('OR with two false predicates is false', status('test_false() OR test_false()'), 'not_matched');
assert.equal(typeof evaluator.eval('test_true()', {}), 'boolean', 'legacy eval must retain boolean return');
assert.equal(evaluator.eval('test_unsupported()', {}), false, 'legacy eval maps unsupported to false');
assert.equal(evaluator.eval('NOT test_unsupported()', {}), false, 'legacy NOT must not invert unsupported into true');
console.log('PASS legacy eval remains boolean-compatible');

// Guard scorer integration and all intentionally unsupported handlers.
const scorerStart = source.indexOf('CandidateScorer.prototype._evaluateType = function _evaluateType_patched');
const scorerEnd = source.indexOf('\n    };', scorerStart);
const scorer = source.slice(scorerStart, scorerEnd);
assert(scorer.includes('this._evalCheckDetailed(directCond.check, ctx)'), 'direct conditions use detailed results');
assert(scorer.includes('this._evalCheckDetailed(mappedCond.check, ctx)'), 'mapped conditions use detailed results');
assert(scorer.includes('signalsUnsupported: unsupported'), 'unsupported signals are exposed separately');
assert(scorer.includes('checksUnsupported'), 'unsupported exclusions are diagnosed');
for (const name of ['has_adjectival_equivalent', 'semantic_equivalence_test', 'semantic_substitution_test', 'context_discourse_type_eq']) {
  assert(source.includes(`CheckEvaluator.register('${name}',\n    (_ctx) => CHECK_UNSUPPORTED\n);`), name + ' must be explicitly unsupported');
}
console.log('PASS scorer integration source guards');


// Whole-registry structural coverage: this is deliberately not a two-example-only test.
const registryPath = path.join(__dirname, '..', 'public/assets/data/syntax-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const registryTypes = [];
const checkExpressions = [];
function walkRegistry(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const item of node) walkRegistry(item); return; }
  if (node.id && node.detection && node.xsc) registryTypes.push(node);
  if (typeof node.check === 'string') checkExpressions.push(node.check);
  for (const value of Object.values(node)) walkRegistry(value);
}
walkRegistry(registry.categories);
assert.equal(registryTypes.length, 242, 'all 242 syntax types must be included in the registry audit');
assert(registryTypes.every(type => Array.isArray(type.xsc?.signals) && type.xsc.signals.length > 0), 'all 242 types must have scoring signals');
assert(registryTypes.every(type => Array.isArray(type.detection?.conditions) && type.detection.conditions.length > 0), 'all 242 types must have detection conditions');
const registeredNames = new Set([...source.matchAll(/CheckEvaluator\.register\(['"]([^'"]+)['"]/g)].map(match => match[1]));
const referencedNames = new Set();
for (const expression of checkExpressions) { for (const match of expression.matchAll(/([A-Za-z_]\w*)\s*\(/g)) referencedNames.add(match[1]); }
const unregisteredNames = [...referencedNames].filter(name => !registeredNames.has(name));
assert.deepEqual(unregisteredNames, [], 'every check function used by the registry must have a handler');
const unsupportedNames = ['has_adjectival_equivalent', 'semantic_equivalence_test', 'semantic_substitution_test', 'context_discourse_type_eq'];
const unsupportedUsage = Object.fromEntries(unsupportedNames.map(name => [name, checkExpressions.filter(expression => new RegExp('\\b' + name + '\\s*\\(').test(expression)).length]));
assert.deepEqual(unsupportedUsage, { has_adjectival_equivalent: 1, semantic_equivalence_test: 2, semantic_substitution_test: 2, context_discourse_type_eq: 2 }, 'all current unsupported-handler usages must be explicitly accounted for');
console.log('PASS whole-registry coverage (' + registryTypes.length + ' types, ' + checkExpressions.length + ' check expressions, ' + referencedNames.size + ' handler names)');


// Ensure every scoring signal across all 242 types resolves to a condition, including the 39 legacy ID fallbacks.
const mapStart = source.indexOf('const _BUILTIN_CONDITION_SIGNAL_MAP = {');
const mapEnd = source.indexOf('\n    };', mapStart);
assert(mapStart >= 0 && mapEnd > mapStart, 'built-in condition-to-signal map must be present');
const mapEntries = [...source.slice(mapStart, mapEnd).matchAll(/'([^']+)'\s*:\s*'([^']+)'/g)].map(match => [match[1], match[2]]);
const reverseMap = new Map();
for (const [conditionId, signalId] of mapEntries) {
  if (!reverseMap.has(signalId)) reverseMap.set(signalId, []);
  reverseMap.get(signalId).push(conditionId);
}
let directSignalMatches = 0;
let fallbackSignalMatches = 0;
let signalsWithoutCondition = 0;
let conditionsWithoutSignal = 0;
for (const type of registryTypes) {
  const conditions = type.detection.conditions || [];
  const signals = type.xsc.signals || [];
  for (const signal of signals) {
    if (conditions.some(condition => condition.id === signal.id)) { directSignalMatches++; continue; }
    const mappedConditionIds = reverseMap.get(signal.id) || [];
    if (mappedConditionIds.some(id => conditions.some(condition => condition.id === id))) fallbackSignalMatches++;
    else signalsWithoutCondition++;
  }
  for (const condition of conditions) {
    if (!signals.some(signal => signal.id === condition.id) && !Object.prototype.hasOwnProperty.call(Object.fromEntries(mapEntries), condition.id)) conditionsWithoutSignal++;
  }
}
assert.equal(directSignalMatches, 410, 'direct condition/signal IDs must match for all expected signals');
assert.equal(fallbackSignalMatches, 39, 'all 39 legacy ID-mismatched signals must resolve through the fallback map');
assert.equal(signalsWithoutCondition, 0, 'no scoring signal may silently score without a condition');
assert.equal(conditionsWithoutSignal, 1, 'the known single non-scoring condition must remain explicit and auditable');
console.log('PASS scoring-map coverage (410 direct, 39 fallback, 0 unconditioned signals, 1 non-scoring condition)');
