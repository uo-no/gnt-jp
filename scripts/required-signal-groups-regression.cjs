#!/usr/bin/env node
/**
 * required-signal-groups-regression.cjs
 * Direct runtime contract test for required_signal_groups (OR between groups,
 * AND within each group). Uses a temporary synthetic particle type so the
 * test exercises CandidateScorer._evaluateType rather than registry shape only.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

global.decodeMorph = function (e) {
  if (!e || typeof e !== 'object') return {};
  const pos = e.pos || ({
    verb: 'V', noun: 'N', adjective: 'A', adj: 'A', article: 'T',
    preposition: 'P', conjunction: 'C', adverb: 'D', particle: 'X',
    pronoun: 'R', num: 'M'
  }[String(e.class || '').toLowerCase()] || '');
  return {
    pos, tense: e.tense || '', voice: e.voice || '', mood: e.mood || '',
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
  return global.decodeMorph(t).pos || '';
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
const category = registry.categories && registry.categories.particle;
if (!category || !Array.isArray(category.subcategories) || !category.subcategories[0]) {
  throw new Error('particle category/subcategory not found in syntax registry');
}

const probeId = 'particle.__required_signal_groups_probe';
category.subcategories[0].types.push({
  id: probeId,
  label_ja: 'test only',
  label_en: 'Test only',
  status: 'active',
  priority: 999,
  detection: {
    conditions: [
      { id: 'probe_a', signal: 'lemma μή', check: "target_lemma_in(['μή'])" },
      { id: 'probe_b', signal: 'particle POS', check: "target_pos_eq('X')" },
      { id: 'probe_c', signal: 'lemma οὐ', check: "target_lemma_in(['οὐ'])" }
    ],
    required_signal_groups: [['probe_a', 'probe_b'], ['probe_c']]
  },
  xsc: {
    base_weight: 10,
    signals: [
      { id: 'probe_a', value: 10, label_ja: 'probe a' },
      { id: 'probe_b', value: 10, label_ja: 'probe b' },
      { id: 'probe_c', value: 10, label_ja: 'probe c' }
    ],
    default_confidence: 40
  }
});

const analyzer = new SyntaxAnalyzer(registry);
function hasProbe(lemma, klass) {
  const target = { lemma, text: lemma, class: klass, morph: '' };
  const output = analyzer.analyze({ target, tokens: [target], targetIdx: 0 });
  return (output.candidates || []).some(c => c.id === probeId);
}
function hasVerifiedMeGenoiToPattern() {
  const target = { lemma: 'μή', text: 'μή', class: 'particle', pos: 'X', morph: '' };
  const verb = {
    lemma: 'γίνομαι', text: 'γένοιτο', class: 'verb', pos: 'V',
    mood: 'optative', tense: 'aorist', voice: 'middle', morph: ''
  };
  const output = analyzer.analyze({ target, tokens: [target, verb], targetIdx: 0 });
  return (output.candidates || []).some(c => c.id === 'particle.rhetorical_particle');
}
const cases = [
  ['AND group succeeds when both signals match', hasProbe('μή', 'particle'), true],
  ['partial AND group is rejected', hasProbe('μή', 'noun'), false],
  ['alternative OR group succeeds', hasProbe('οὐ', 'particle'), true],
  ['no matching group is rejected', hasProbe('μήτι', 'particle'), false],
  ['verified μὴ γένοιτο morphology remains detectable', hasVerifiedMeGenoiToPattern(), true]
];
let failed = 0;
for (const [label, actual, expected] of cases) {
  const ok = actual === expected;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${label} (expected=${expected}, actual=${actual})\n`);
  if (!ok) failed++;
}
if (failed) process.exitCode = 1;
else process.stdout.write('PASS  required_signal_groups and verified rhetorical-pattern runtime contract (5/5)\n');
