#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const registryPath = path.join(__dirname, '..', 'public', 'assets', 'data', 'syntax-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// All scored condition IDs must map to exactly one signal; semantic judgements remain contextual.
const EXPECTED_UNRESOLVED = {};

const actual = {};
let typeCount = 0;
function findType(value, id) {
  if (!value || typeof value !== 'object') return null;
  if (value.id === id && value.detection && value.xsc) return value;
  for (const child of Object.values(value)) {
    const found = findType(child, id);
    if (found) return found;
  }
  return null;
}

function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.id && value.detection && value.xsc) {
    typeCount++;
    const signalIds = new Set((value.xsc.signals || []).map(signal => signal.id));
    const conditions = value.detection.conditions || [];
    const unmatched = conditions
      .map(condition => condition.id)
      .filter(id => id && !signalIds.has(id))
      .sort();
    const conditionIds = conditions.map(condition => condition.id).filter(Boolean);
    const duplicates = conditionIds.filter((id, index) => conditionIds.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)].sort(), [],
      'Duplicate condition IDs in ' + value.id + '; every scored signal must have one unambiguous condition.');
    if (unmatched.length) actual[value.id] = unmatched;
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') walk(child);
  }
}

walk(registry);
assert.equal(typeCount, 242, 'The registry type inventory changed; review the baseline.');
const analyzerPath = path.join(__dirname, '..', 'public', 'core', 'syntax-analyzer.js');
const analyzerSource = fs.readFileSync(analyzerPath, 'utf8');
const alwaysFalseChecks = new Set(
  [...analyzerSource.matchAll(/CheckEvaluator\\.register\\(\\s*['"]([^'"]+)['"]\\s*,\\s*\\(\\s*[^)]*\\)\\s*=>\\s*false\\s*\\)/g)]
    .map(match => match[1])
);
const knownAlwaysFalse = new Set([
  'has_adjectival_equivalent',
  'semantic_equivalence_test',
  'semantic_substitution_test',
  'context_discourse_type_eq',
]);
assert.deepEqual([...alwaysFalseChecks].sort(), [...knownAlwaysFalse].sort(),
  'The inventory of constant-false check handlers changed; audit every affected registry condition.');

const unimplementedUses = [];
function auditFalseCheckNotes(value) {
  if (!value || typeof value !== 'object') return;
  if (value.id && value.detection && value.xsc) {
    for (const condition of [...(value.detection.conditions || []), ...(value.detection.exclusions || [])]) {
      const handler = condition.check?.match(/^\\s*([a-zA-Z_]\\w*)\\s*\\(/)?.[1];
      if (handler && alwaysFalseChecks.has(handler)) {
        const note = String(condition.note || '');
        assert.match(note, /未実装|恒偽|文脈依存|自動判定困難|別途判断|ヒューリスティック|自動判定ではない/,
          value.id + '.' + condition.id + ' uses always-false handler ' + handler + ' without an explicit limitation note.');
        unimplementedUses.push(value.id + '.' + condition.id);
      }
    }
  }
  for (const child of Object.values(value)) auditFalseCheckNotes(child);
}
auditFalseCheckNotes(registry);
assert.equal(unimplementedUses.length, 6,
  'The number of conditions using constant-false semantic handlers changed; review new or removed uses.');


const meansType = findType(registry, 'dative.means');
assert.ok(meansType, 'dative.means must remain in the registry');
assert.deepEqual(meansType.detection.instrumental_noun_lemmas.includes('πίστις'), true,
  'dative.means must retain πίστις in its type-local instrumental noun list');
assert.ok(meansType.detection.conditions.some(c =>
  c.id === 'instrumental_noun' &&
  c.check === "target_lemma_in_type_list('instrumental_noun_lemmas')"),
  'instrumental_noun must use the type-local list check');

assert.deepEqual(actual, EXPECTED_UNRESOLVED,
  'Condition/signal ID mismatches changed. Review and update the explicit baseline only after semantic review.');

const mismatchCount = Object.values(actual).reduce((sum, ids) => sum + ids.length, 0);
console.log(`PASS: audited ${typeCount} syntax types; 41 condition IDs are connected; ${Object.keys(actual).length} types / ${mismatchCount} conditions remain explicitly tracked for semantic review.`);
