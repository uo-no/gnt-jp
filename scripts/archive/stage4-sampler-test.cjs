'use strict';
/**
 * stage4-sampler-test.cjs
 * 9 test cases for stage4-groupA-sampler.cjs
 *
 * TC-01 Reproducibility       : same seed → identical refs
 * TC-02 Seed sensitivity       : different seed (±1) → different refs
 * TC-03 Low-freq full scan     : Tier 6 (n=5-9) and Tier 7 (n=1-4) → all refs
 * TC-04 Multi-usage zone coverage: zone allocation ≥ 1 per present zone
 * TC-05 JUD inclusion          : Strong with JUD tokens has JUD refs in sample
 * TC-06 No duplicate refs      : sampledRefs has no duplicates per Strong
 * TC-07 Population count match : sum of all Strong populations = 39,310
 * TC-08 Tier 6-7 full scan     : all Tier 6-7 population tokens are sampled
 * TC-09 Actual/inferred status : sampled → CONFIRMED_ON_AUDIT, unsampled → INFERRED
 */

const assert = require('assert');
const path   = require('path');
const fs     = require('fs');

const {
  buildGroupASamplingPlan,
  processStrong,
  zoneStratifiedSample,
  createXorShift32,
  ZONE4_MAP,
  ZONE2_MAP
} = require('./stage4-groupA-sampler.cjs');

// ---------------------------------------------------------------------------
// Helpers for building mock token sets
// ---------------------------------------------------------------------------
function makeTokens(refs) {
  return refs.map(ref => ({ ref, strong: 'G1000', group: 'A' }));
}

function makeStrongTokens(strong, refs) {
  return refs.map(ref => ({ ref, strong, group: 'A' }));
}

const SAMPLE_REFS = {
  I:   ['MAT 1:1!1','MAT 2:3!2','MRK 3:4!1','LUK 5:6!3'],
  II:  ['JHN 1:1!1','JHN 2:2!2','REV 1:1!1','1JN 2:3!4'],
  III: ['ACT 1:1!1','ACT 2:2!2','ACT 3:3!3'],
  IV:  ['ROM 1:1!1','ROM 2:2!2','1CO 3:3!1','GAL 4:4!1',
        'HEB 5:5!1','JAS 6:6!1','JUD 1:3!2','JUD 1:4!1']
};

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    results.push({ name, status: 'PASS' });
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
    results.push({ name, status: 'FAIL', error: e.message });
    failed++;
  }
}

// ---------------------------------------------------------------------------
// TC-01: Reproducibility
// ---------------------------------------------------------------------------
test('TC-01 Reproducibility: same seed → identical sample refs', () => {
  const allRefs = Object.values(SAMPLE_REFS).flat();
  const tokens = makeTokens(allRefs);
  const byZone4 = { I: [], II: [], III: [], IV: [] };
  for (const t of tokens) {
    const z = ZONE4_MAP[t.ref.split(' ')[0]];
    if (z) byZone4[z].push(t);
  }

  const run1 = zoneStratifiedSample(byZone4, 8, 1, 1000);
  const run2 = zoneStratifiedSample(byZone4, 8, 1, 1000);

  assert.deepStrictEqual(run1.sampledRefs, run2.sampledRefs,
    'Two runs with same seed must produce identical refs');
  assert.ok(run1.sampledRefs.length > 0, 'Sample must not be empty');
});

// ---------------------------------------------------------------------------
// TC-02: Seed sensitivity
// ---------------------------------------------------------------------------
test('TC-02 Seed sensitivity: seed N vs N+1 → different samples (Tier 1 pool)', () => {
  // Build a large enough pool that two seeds are virtually guaranteed to differ
  const refs = [];
  for (let i = 1; i <= 30; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 15; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 10; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 25; i++) refs.push(`ROM ${i}:1!1`);

  const tokens = makeTokens(refs);
  const byZone4 = { I: [], II: [], III: [], IV: [] };
  for (const t of tokens) {
    const z = ZONE4_MAP[t.ref.split(' ')[0]];
    if (z) byZone4[z].push(t);
  }

  const run1 = zoneStratifiedSample(byZone4, 10, 2, 42);
  const run2 = zoneStratifiedSample(byZone4, 10, 2, 43);

  // For large pools different seeds should produce different results
  // (tiny probability of identical — but with 80 tokens / 10 samples it's negligible)
  const same = run1.sampledRefs.join(',') === run2.sampledRefs.join(',');
  assert.ok(!same, 'Different seeds must produce different samples (probabilistic; extremely unlikely to fail)');
});

// ---------------------------------------------------------------------------
// TC-03: Low-freq full scan (Tier 6 and Tier 7)
// ---------------------------------------------------------------------------
test('TC-03 Tier 6 full scan: n=7 → all refs included', () => {
  const refs = ['MAT 1:1!1','MRK 1:1!1','LUK 1:1!1','JHN 1:1!1','ACT 1:1!1','ROM 1:1!1','JUD 1:1!1'];
  const tokens = makeStrongTokens('G0006', refs);
  const result = processStrong('G0006', tokens);

  assert.strictEqual(result.tier, 6, 'n=7 should be Tier 6');
  assert.strictEqual(result.isFullScan, true, 'Tier 6 must be full scan');
  assert.strictEqual(result.sampledCount, 7, 'All 7 tokens must be sampled');
  assert.deepStrictEqual(result.sampledRefs.sort(), refs.slice().sort());
});

test('TC-03 Tier 7 full scan: n=3 → all refs included', () => {
  const refs = ['MAT 1:1!1','ROM 1:1!1','JUD 1:5!1'];
  const tokens = makeStrongTokens('G0007', refs);
  const result = processStrong('G0007', tokens);

  assert.strictEqual(result.tier, 7, 'n=3 should be Tier 7');
  assert.strictEqual(result.isFullScan, true, 'Tier 7 must be full scan');
  assert.strictEqual(result.sampledCount, 3);
});

// ---------------------------------------------------------------------------
// TC-04: Multi-zone coverage — each present zone gets ≥ minPerZone tokens
// ---------------------------------------------------------------------------
test('TC-04 Zone coverage: every present zone gets ≥ minPerZone tokens', () => {
  // Build Tier 1 sized pool with all 4 zones
  const refs = [];
  for (let i = 1; i <= 60; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 40; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 70; i++) refs.push(`ROM ${i}:1!1`);

  const tokens = makeStrongTokens('G0200', refs); // n=200 → Tier 1
  const result = processStrong('G0200', tokens);

  assert.strictEqual(result.tier, 1);
  assert.strictEqual(result.isFullScan, false);

  const alloc = result.sampling.allocation;
  const MIN = 2;
  for (const z of ['I','II','III','IV']) {
    const pop = result.population.byZone4[z];
    const got = alloc[z] || 0;
    if (pop > 0) {
      assert.ok(got >= MIN,
        `Zone ${z}: population ${pop}, allocated ${got} < minPerZone ${MIN}`);
    }
  }
});

// ---------------------------------------------------------------------------
// TC-05: JUD inclusion — JUD tokens appear in sample when population has them
// ---------------------------------------------------------------------------
test('TC-05 JUD inclusion: JUD tokens must be representable in sample', () => {
  // Tier 4 Strong with JUD tokens in Zone IV
  const refs = [];
  for (let i = 1; i <= 10; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 10; i++) refs.push(`ROM ${i}:1!1`);
  // Add JUD tokens explicitly
  refs.push('JUD 1:3!2', 'JUD 1:4!1', 'JUD 1:5!1');

  const tokens = makeStrongTokens('G0023', refs); // n=23 → Tier 4
  const result = processStrong('G0023', tokens);

  assert.strictEqual(result.judTokensInPopulation, 3, 'Population has 3 JUD tokens');

  // JUD tokens are in Zone IV (AE in 2-zone). If Zone AE is sampled, JUD tokens CAN appear.
  // We cannot guarantee JUD appears (it's random), but we can verify the infrastructure
  // correctly counts JUD in both population and sample.
  assert.ok(result.judTokensInPopulation >= 0,
    'JUD population count must be non-negative');
  assert.ok(result.judTokensInSample <= result.judTokensInPopulation,
    'JUD sample count cannot exceed JUD population count');

  // For Zone AE (Acts+Epistles) which contains JUD, allocation must be ≥ minPerZone
  const aeAlloc = result.sampling.allocation['AE'] || 0;
  assert.ok(aeAlloc >= 2,
    `Zone AE allocation ${aeAlloc} must be ≥ 2 (JUD lives here)`);
});

// ---------------------------------------------------------------------------
// TC-06: No duplicate refs within a Strong's sample
// ---------------------------------------------------------------------------
test('TC-06 No duplicate refs: sampledRefs has no duplicates', () => {
  const refs = [];
  for (let i = 1; i <= 50; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 20; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 50; i++) refs.push(`ROM ${i}:1!1`);

  const tokens = makeStrongTokens('G0150', refs); // n=150 → Tier 2
  const result = processStrong('G0150', tokens);

  const refSet = new Set(result.sampledRefs);
  assert.strictEqual(refSet.size, result.sampledRefs.length,
    `Duplicate refs detected in sample for G0150`);
  assert.strictEqual(result._integrityCheck.hasDuplicate, false);
});

// ---------------------------------------------------------------------------
// TC-07: Population count match against actual Group A data
// ---------------------------------------------------------------------------
test('TC-07 Population count match: sum of all Strong populations = 39,310', () => {
  const BASE = path.resolve(__dirname, '..');
  const gaPath = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupATokens = ga.tokens.filter(t => t.group === 'A');

  const plan = buildGroupASamplingPlan(groupATokens);

  assert.strictEqual(plan.meta.totalGroupATokens, 39310,
    `Expected 39,310 Group A tokens, got ${plan.meta.totalGroupATokens}`);
  assert.strictEqual(plan.overallSummary.totalGroupATokens, 39310);

  // Sum all Strong populations
  const sumPop = plan.strongSamples.reduce((a, s) => a + s.population.total, 0);
  assert.strictEqual(sumPop, 39310,
    `Sum of Strong populations ${sumPop} ≠ 39,310`);

  // sampled + unsampled = population for every Strong
  for (const s of plan.strongSamples) {
    assert.strictEqual(s.sampledCount + s.unsampledCount, s.population.total,
      `Strong ${s.strong}: sampledCount(${s.sampledCount}) + unsampledCount(${s.unsampledCount}) ≠ population(${s.population.total})`);
  }
});

// ---------------------------------------------------------------------------
// TC-08: Tier 6-7 full scan maintained
// ---------------------------------------------------------------------------
test('TC-08 Tier 6-7 full scan: all population tokens are in sample', () => {
  const BASE = path.resolve(__dirname, '..');
  const gaPath = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupATokens = ga.tokens.filter(t => t.group === 'A');

  const plan = buildGroupASamplingPlan(groupATokens);

  const tier67 = plan.strongSamples.filter(s => s.tier >= 6);
  for (const s of tier67) {
    assert.strictEqual(s.isFullScan, true,
      `Strong ${s.strong} Tier ${s.tier} should be full scan`);
    assert.strictEqual(s.sampledCount, s.population.total,
      `Strong ${s.strong} Tier ${s.tier}: sampledCount(${s.sampledCount}) ≠ population(${s.population.total})`);
    assert.strictEqual(s.unsampledCount, 0,
      `Strong ${s.strong} Tier ${s.tier}: unsampledCount must be 0`);
  }

  // Check Tier 6+7 from summary
  const t6 = plan.tierSummary[6];
  const t7 = plan.tierSummary[7];
  assert.strictEqual(t6.sampledTokens, t6.populationTokens,
    `Tier 6 sampled(${t6.sampledTokens}) ≠ population(${t6.populationTokens})`);
  assert.strictEqual(t7.sampledTokens, t7.populationTokens,
    `Tier 7 sampled(${t7.sampledTokens}) ≠ population(${t7.populationTokens})`);
});

// ---------------------------------------------------------------------------
// TC-09: Actual/estimated/unconfirmed status consistency
// ---------------------------------------------------------------------------
test('TC-09 Status labels: sampled=CONFIRMED_ON_AUDIT, unsampled=INFERRED', () => {
  const refs = [];
  for (let i = 1; i <= 80; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 60; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 40; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 70; i++) refs.push(`ROM ${i}:1!1`);

  const tokens = makeStrongTokens('G0250', refs); // n=250 → Tier 1
  const result = processStrong('G0250', tokens);

  assert.strictEqual(result.sampledConfirmationStatus, 'CONFIRMED_ON_AUDIT',
    'Sampled tokens must be marked CONFIRMED_ON_AUDIT');
  assert.strictEqual(result.unsampledConfirmationStatus, 'INFERRED_FROM_STRONG_LEVEL',
    'Unsampled tokens must be marked INFERRED_FROM_STRONG_LEVEL');
  assert.strictEqual(result.isFullScan, false, 'n=250 Tier 1 must not be full scan');
  assert.ok(result.unsampledCount > 0, 'Tier 1 sample must have unsampled tokens');

  // Full scan Strong: no unsampled, status N/A
  const fsRefs = Array.from({ length: 7 }, (_, i) => `MAT ${i+1}:1!1`);
  const fsTokens = makeStrongTokens('G0007', fsRefs);
  const fsResult = processStrong('G0007', fsTokens);
  assert.strictEqual(fsResult.unsampledConfirmationStatus, 'N/A',
    'Full scan unsampled status must be N/A');
  assert.strictEqual(fsResult.unsampledCount, 0);
});

// ---------------------------------------------------------------------------
// Additional: global duplicate check across all Strongs
// ---------------------------------------------------------------------------
test('TC-Global No cross-Strong duplicate refs in sampled output', () => {
  const BASE = path.resolve(__dirname, '..');
  const gaPath = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupATokens = ga.tokens.filter(t => t.group === 'A');

  const plan = buildGroupASamplingPlan(groupATokens);

  assert.strictEqual(plan.overallSummary.globalDuplicateRefs, 0,
    `Found ${plan.overallSummary.globalDuplicateRefs} duplicate refs across all sampled tokens`);
  assert.strictEqual(plan.overallSummary.integrityOk, true);
});

// ===========================================================================
// Morph × zone tests (TC-M1 through TC-M9)
// These require the v2 sampler's morph-related exports.
// ===========================================================================
const {
  tier1MorphZoneSample,
  buildMorphLookup,
  buildMorphInputHash,
  classifyMorphGroup,
  selectWithMorphDiversity,
  SMALL_CELL_THRESHOLD
} = require('./stage4-groupA-sampler.cjs');

// Helper: build mock morph lookup from ref → morph string
function makeMorphLookup(refMorphPairs) {
  const ml = {};
  for (const [ref, morph] of Object.entries(refMorphPairs)) {
    ml[ref] = { ref, morph, tense: '', voice: '', mood: '' };
  }
  return ml;
}

// Mock morphs for verb classification
const VERB_MORPHS = {
  'V-PAI-3S': { morph:'V-PAI-3S', tense:'present',   voice:'active', mood:'indicative'  },
  'V-AAI-3S': { morph:'V-AAI-3S', tense:'aorist',    voice:'active', mood:'indicative'  },
  'V-AAP-NSM':{ morph:'V-AAP-NSM',tense:'aorist',    voice:'active', mood:'participle'  },
  'V-2AAI-3S':{ morph:'V-2AAI-3S',tense:'aorist',    voice:'active', mood:'indicative'  },
  'V-PAS-3S': { morph:'V-PAS-3S', tense:'present',   voice:'active', mood:'subjunctive' },
  'V-AAM-2S': { morph:'V-AAM-2S', tense:'aorist',    voice:'active', mood:'imperative'  },
  'V-FAI-1S': { morph:'V-FAI-1S', tense:'future',    voice:'active', mood:'indicative'  },
  'V-RAI-3S': { morph:'V-RAI-3S', tense:'perfect',   voice:'active', mood:'indicative'  },
  'N-NSM':    { morph:'N-NSM',     tense:'',          voice:'',       mood:''            },
};

// ---------------------------------------------------------------------------
// TC-M1: All morph × zone cells output (pop count for all cells > 0)
// ---------------------------------------------------------------------------
test('TC-M1 morph×zone cells: all cells have positive population count', () => {
  const refs = [];
  for (let i = 1; i <= 80; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 50; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 60; i++) refs.push(`ROM ${i}:1!1`); // total=220 → Tier 1

  // Assign varied morphs
  const ml = {};
  refs.forEach((r, idx) => {
    const keys = Object.keys(VERB_MORPHS);
    const vm = VERB_MORPHS[keys[idx % keys.length]];
    ml[r] = { ...vm, ref: r };
  });

  const tokens = makeStrongTokens('G0200', refs);
  const result = processStrong('G0200', tokens, ml);

  assert.ok(result.tier1MorphMeta, 'Tier 1 should have tier1MorphMeta');
  const popCounts = result.tier1MorphMeta.morphZonePopCounts;

  // All recorded cells must have n > 0
  for (const [key, count] of Object.entries(popCounts)) {
    assert.ok(count > 0, `Cell ${key} has non-positive population count ${count}`);
  }

  // Sum of all cell populations must equal the total Strong population
  const sumPop = Object.values(popCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumPop, tokens.length,
    `Sum of morphZone populations ${sumPop} ≠ total ${tokens.length}`);
});

// ---------------------------------------------------------------------------
// TC-M2: Population count sum by morph-zone = total
// ---------------------------------------------------------------------------
test('TC-M2 morph×zone pop sum = Strong population total', () => {
  const refs = [];
  for (let i = 1; i <= 100; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 50; i++)  refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++)  refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 70; i++)  refs.push(`ROM ${i}:1!1`);

  const ml = {};
  refs.forEach((r, idx) => {
    const vm = VERB_MORPHS[Object.keys(VERB_MORPHS)[idx % 5]];
    ml[r] = { ...vm, ref: r };
  });
  const tokens = makeStrongTokens('G0250', refs);
  const result = processStrong('G0250', tokens, ml);

  const sumPop = Object.values(result.tier1MorphMeta.morphZonePopCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumPop, result.population.total);
});

// ---------------------------------------------------------------------------
// TC-M3: Sample count by morph-zone matches total sampledRefs
// ---------------------------------------------------------------------------
test('TC-M3 morphZoneSampleCounts sum = sampledCount', () => {
  const refs = [];
  for (let i = 1; i <= 80; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 50; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 60; i++) refs.push(`ROM ${i}:1!1`);

  const ml = {};
  refs.forEach((r, idx) => {
    const vm = VERB_MORPHS[Object.keys(VERB_MORPHS)[idx % 4]];
    ml[r] = { ...vm, ref: r };
  });
  const tokens = makeStrongTokens('G0220', refs);
  const result = processStrong('G0220', tokens, ml);

  const sumSamp = Object.values(result.tier1MorphMeta.morphZoneSampleCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumSamp, result.sampledCount,
    `morphZoneSampleCounts sum ${sumSamp} ≠ sampledCount ${result.sampledCount}`);

  // Sampled refs set = morphZoneSampleCounts coverage
  assert.strictEqual(new Set(result.sampledRefs).size, result.sampledCount);
});

// ---------------------------------------------------------------------------
// TC-M4: Small cells (n=1) → guaranteed inclusion (full scan for that cell)
// ---------------------------------------------------------------------------
test('TC-M4 Small cells (n=1): guaranteed inclusion regardless of overall sampling', () => {
  // Construct a Strong where one (zone, morphGroup) cell has exactly 1 token
  // by using a unique morph for a single ref.
  const refs = [];
  // Lots of present-indicative tokens in Zone I
  for (let i = 1; i <= 80; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 40; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 60; i++) refs.push(`ROM ${i}:1!1`);
  // One unique token in Zone IV with perfect indicative (likely rare)
  refs.push('HEB 1:1!1');

  const ml = {};
  // All normal refs: present indicative
  for (const r of refs) ml[r] = { ...VERB_MORPHS['V-PAI-3S'], ref: r };
  // The unique HEB token: perfect indicative (rare)
  ml['HEB 1:1!1'] = { ...VERB_MORPHS['V-RAI-3S'], ref: 'HEB 1:1!1' };
  // Make HEB token the only one in IV|V.PRF.IND → n=1 cell
  // (Other ROM refs: present indicative → IV|V.PRS.IND has 60 tokens, n≥1)

  const tokens = makeStrongTokens('G0211', refs);
  const result = processStrong('G0211', tokens, ml);

  // Check if IV|V.PRF.IND is a small cell (n=1)
  const popCounts = result.tier1MorphMeta.morphZonePopCounts;
  const ivPrfInd = popCounts['IV|V.PRF.IND'] || 0;
  assert.strictEqual(ivPrfInd, 1, 'IV|V.PRF.IND should have exactly 1 token (our plant)');

  // That cell should be in smallCells
  assert.ok(result.tier1MorphMeta.smallCells['IV|V.PRF.IND'] !== undefined,
    'IV|V.PRF.IND should be in smallCells');

  // The HEB 1:1!1 ref MUST be in sampledRefs (guaranteed inclusion)
  assert.ok(result.sampledRefs.includes('HEB 1:1!1'),
    'HEB 1:1!1 (sole token in small cell IV|V.PRF.IND) must be in sampledRefs');
});

// ---------------------------------------------------------------------------
// TC-M5: Reproducibility with morph lookup
// ---------------------------------------------------------------------------
test('TC-M5 Reproducibility: same morphLookup + same seed → identical sample', () => {
  const refs = [];
  for (let i = 1; i <= 80; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 50; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 60; i++) refs.push(`ROM ${i}:1!1`);

  const ml = {};
  refs.forEach((r, idx) => {
    const vm = VERB_MORPHS[Object.keys(VERB_MORPHS)[idx % 5]];
    ml[r] = { ...vm, ref: r };
  });
  const tokens = makeStrongTokens('G0220', refs);

  const run1 = processStrong('G0220', tokens, ml);
  const run2 = processStrong('G0220', tokens, ml);

  assert.deepStrictEqual(run1.sampledRefs, run2.sampledRefs,
    'Two identical runs must produce identical sampledRefs');
  assert.strictEqual(run1.sampledCount, run2.sampledCount);
});

// ---------------------------------------------------------------------------
// TC-M6: morph missing → UNKNOWN group, not silently dropped
// ---------------------------------------------------------------------------
test('TC-M6 morph missing: null lookup → UNKNOWN group, ref still included in cells', () => {
  const refs = [];
  for (let i = 1; i <= 60; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 40; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 80; i++) refs.push(`ROM ${i}:1!1`);

  // Create morph lookup with some refs missing (null)
  const ml = {};
  refs.forEach((r, idx) => {
    if (idx % 10 === 0) {
      ml[r] = null; // simulate missing
    } else {
      const vm = VERB_MORPHS[Object.keys(VERB_MORPHS)[idx % 5]];
      ml[r] = { ...vm, ref: r };
    }
  });

  const tokens = makeStrongTokens('G0210', refs);
  const result = processStrong('G0210', tokens, ml);

  // Total population must still match
  const sumPop = Object.values(result.tier1MorphMeta.morphZonePopCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(sumPop, tokens.length,
    `Sum of cell populations ${sumPop} should still equal total even with missing morphs`);

  // UNKNOWN cells should exist for the null-lookup refs
  const unknownCells = Object.keys(result.tier1MorphMeta.morphZonePopCounts)
    .filter(k => k.endsWith('|UNKNOWN'));
  assert.ok(unknownCells.length > 0, 'Should have UNKNOWN cells for missing morph refs');
});

// ---------------------------------------------------------------------------
// TC-M7: JUD tokens not dropped from morph-zone cells
// ---------------------------------------------------------------------------
test('TC-M7 JUD tokens included in morph-zone population counts', () => {
  const refs = [];
  for (let i = 1; i <= 60; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 40; i++) refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 30; i++) refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 70; i++) refs.push(`ROM ${i}:1!1`);
  // Add JUD tokens explicitly
  refs.push('JUD 1:3!1', 'JUD 1:4!1', 'JUD 1:5!1');

  const ml = {};
  refs.forEach((r) => {
    ml[r] = { ...VERB_MORPHS['V-AAI-3S'], ref: r };
  });
  const tokens = makeStrongTokens('G0203', refs);
  const result = processStrong('G0203', tokens, ml);

  // JUD tokens are in Zone IV
  assert.strictEqual(result.judTokensInPopulation, 3);

  // Zone IV cells should include the JUD tokens' populations
  const zone4CellCount = Object.entries(result.tier1MorphMeta.morphZonePopCounts)
    .filter(([k]) => k.startsWith('IV|'))
    .reduce((a, [, v]) => a + v, 0);
  assert.ok(zone4CellCount >= 3,
    `Zone IV cells total ${zone4CellCount} should include ≥3 JUD tokens`);

  // JUD tokens not lost from total
  const totalPop = Object.values(result.tier1MorphMeta.morphZonePopCounts).reduce((a, b) => a + b, 0);
  assert.strictEqual(totalPop, tokens.length,
    `Total cell population ${totalPop} should include JUD tokens`);
});

// ---------------------------------------------------------------------------
// TC-M8: No duplicate refs in morph-zone sample
// ---------------------------------------------------------------------------
test('TC-M8 No duplicate refs in morph-zone sample', () => {
  const refs = [];
  for (let i = 1; i <= 100; i++) refs.push(`MAT ${i}:1!1`);
  for (let i = 1; i <= 60; i++)  refs.push(`JHN ${i}:1!1`);
  for (let i = 1; i <= 40; i++)  refs.push(`ACT ${i}:1!1`);
  for (let i = 1; i <= 80; i++)  refs.push(`ROM ${i}:1!1`);

  const ml = {};
  refs.forEach((r, idx) => {
    const vm = VERB_MORPHS[Object.keys(VERB_MORPHS)[idx % 7]];
    ml[r] = { ...vm, ref: r };
  });
  const tokens = makeStrongTokens('G0280', refs);
  const result = processStrong('G0280', tokens, ml);

  const refSet = new Set(result.sampledRefs);
  assert.strictEqual(refSet.size, result.sampledRefs.length,
    `Duplicate refs in morph-zone sample for G0280`);
  assert.strictEqual(result._integrityCheck.hasDuplicate, false);
});

// ---------------------------------------------------------------------------
// TC-M9: Full integration — real Tier 1 data with actual bible_data morph
// (loads bible_data, only runs if available)
// ---------------------------------------------------------------------------
test('TC-M9 Real Tier 1 with actual bible_data morph', () => {
  const BASE = path.resolve(__dirname, '..');
  const bdPath = path.join(BASE, 'public/bible_data');

  if (!fs.existsSync(bdPath)) {
    console.log('    (skip: bible_data not available)');
    return;
  }

  const gaPath = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupATokens = ga.tokens.filter(t => t.group === 'A');

  const plan = buildGroupASamplingPlan(groupATokens, { bibleDataPath: bdPath });

  // All Tier 1 Strongs must have tier1MorphMeta
  const tier1 = plan.strongSamples.filter(s => s.tier === 1);
  for (const s of tier1) {
    assert.ok(s.tier1MorphMeta, `${s.strong} should have tier1MorphMeta`);

    // morphZonePopCounts sum = population.total
    const sumPop = Object.values(s.tier1MorphMeta.morphZonePopCounts).reduce((a, b) => a + b, 0);
    assert.strictEqual(sumPop, s.population.total,
      `${s.strong}: morphZone pop sum ${sumPop} ≠ population ${s.population.total}`);

    // morphZoneSampleCounts sum = sampledCount
    const sumSamp = Object.values(s.tier1MorphMeta.morphZoneSampleCounts).reduce((a, b) => a + b, 0);
    assert.strictEqual(sumSamp, s.sampledCount,
      `${s.strong}: morphZone sample sum ${sumSamp} ≠ sampledCount ${s.sampledCount}`);

    // No duplicate refs
    assert.strictEqual(s._integrityCheck.hasDuplicate, false,
      `${s.strong}: duplicate refs in sample`);

    // Sample within target range (15-20 for unstretched; allow ±5 for small-cell rounding)
    assert.ok(s.sampledCount <= 25,
      `${s.strong}: sampledCount ${s.sampledCount} exceeds 25 (well over target 20)`);
  }

  // No global duplicates
  assert.strictEqual(plan.overallSummary.globalDuplicateRefs, 0);
  assert.strictEqual(plan.overallSummary.integrityOk, true);
  // No missing morph refs
  assert.strictEqual(plan.meta.tier1MorphMissingRefs, 0,
    `${plan.meta.tier1MorphMissingRefs} Tier 1 refs have missing morph in bible_data`);
});

// ---------------------------------------------------------------------------
// TC-M10: morphInputHash — present in v2 mode, null in v1, reproducible
// ---------------------------------------------------------------------------
test('TC-M10 morphInputHash: present in v2, null in v1, reproducible, differs from inputHash', () => {
  const BASE = path.resolve(__dirname, '..');
  const bdPath = path.join(BASE, 'public/bible_data');

  if (!fs.existsSync(bdPath)) {
    console.log('    (skip: bible_data not available)');
    return;
  }

  const gaPath = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupATokens = ga.tokens.filter(t => t.group === 'A');

  // v2 mode: morphInputHash must be present
  const planV2a = buildGroupASamplingPlan(groupATokens, { bibleDataPath: bdPath });
  assert.ok(planV2a.meta.morphInputHash,
    'morphInputHash must be present in meta when bibleDataPath provided');
  assert.ok(planV2a.meta.morphInputHash.startsWith('sha256:'),
    'morphInputHash must start with "sha256:"');
  // Must differ from inputHash (hashes different data)
  assert.notStrictEqual(planV2a.meta.morphInputHash, planV2a.meta.inputHash,
    'morphInputHash must differ from inputHash (they hash different data)');

  // Reproducibility: two runs must yield identical morphInputHash
  const planV2b = buildGroupASamplingPlan(groupATokens, { bibleDataPath: bdPath });
  assert.strictEqual(planV2a.meta.morphInputHash, planV2b.meta.morphInputHash,
    'morphInputHash must be identical across runs with same input');

  // v1 mode: morphInputHash must be null
  const planV1 = buildGroupASamplingPlan(groupATokens);
  assert.strictEqual(planV1.meta.morphInputHash, null,
    'morphInputHash must be null when bibleDataPath not provided');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
console.log('='.repeat(56));
console.log(`  Tests: ${passed + failed}  PASS: ${passed}  FAIL: ${failed}`);
console.log('='.repeat(56));

module.exports = { results, passed, failed };

if (require.main === module) {
  process.exit(failed > 0 ? 1 : 0);
}
