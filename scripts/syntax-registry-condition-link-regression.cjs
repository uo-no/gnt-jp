#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const registryPath = path.join(__dirname, '..', 'public', 'assets', 'data', 'syntax-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Temporary, explicit baseline for the one type whose semantic-substitution check needs implementation/review.
// Exact matching prevents fixed IDs from drifting back and prevents new mismatches.
const EXPECTED_UNRESOLVED = {
  'dative.means': ['substitutable_with_dia'],
};

const actual = {};
let typeCount = 0;
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
assert.deepEqual(actual, EXPECTED_UNRESOLVED,
  'Condition/signal ID mismatches changed. Review and update the explicit baseline only after semantic review.');

const mismatchCount = Object.values(actual).reduce((sum, ids) => sum + ids.length, 0);
console.log(`PASS: audited ${typeCount} syntax types; 32 condition IDs are connected; ${Object.keys(actual).length} types / ${mismatchCount} conditions remain explicitly tracked for semantic review.`);
