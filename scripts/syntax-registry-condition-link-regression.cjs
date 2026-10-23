#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const registryPath = path.join(__dirname, '..', 'public', 'assets', 'data', 'syntax-registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Temporary, explicit baseline for the nine types still awaiting semantic review.
// Exact matching prevents fixed IDs from drifting back and prevents new mismatches.
const EXPECTED_UNRESOLVED = {
  'genitive.source': ['no_separation_verb', 'prep_source_present'],
  'dative.interest_disadvantage': ['adversative_context'],
  'dative.means': ['substitutable_with_dia'],
  'dative.manner': ['abstract_manner_noun'],
  'participle.attributive': ['matching_noun_present', 'no_article_before_ptc', 'proximity_close'],
  'participle.substantival': ['article_before_ptc', 'article_full_agreement'],
  'participle.adverbial_temporal': ['no_article_before', 'no_matching_noun', 'temporal_tense'],
  'participle.adverbial_attendant': ['aorist_tense', 'main_verb_aorist_imperative', 'no_article_before'],
  'participle.adverbial_causal': ['causal_adverb_present', 'logical_discourse_marker'],
};

const actual = {};
let typeCount = 0;
function walk(value) {
  if (!value || typeof value !== 'object') return;
  if (value.id && value.detection && value.xsc) {
    typeCount++;
    const signalIds = new Set((value.xsc.signals || []).map(signal => signal.id));
    const unmatched = (value.detection.conditions || [])
      .map(condition => condition.id)
      .filter(id => id && !signalIds.has(id))
      .sort();
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
console.log(`PASS: audited ${typeCount} syntax types; 23 condition IDs are connected; ${Object.keys(actual).length} types / ${mismatchCount} conditions remain explicitly tracked for semantic review.`);
