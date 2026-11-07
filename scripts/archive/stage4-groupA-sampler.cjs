'use strict';
/**
 * stage4-groupA-sampler.cjs  v2.0.0
 * Group A (class=plain) sampling engine.
 *
 * Tier 1 : morph × zone 2-dimensional stratification (plan §1.3 Tier 1)
 * Tier 2-3 : zone-stratified 4-zone
 * Tier 4-5 : zone-stratified 2-zone
 * Tier 6-7 : full scan
 *
 * Requirements implemented:
 * R1  Reproducible seed = parseInt(strong.replace('G','')) % 10000
 * R2  4-zone stratification (Tier 1-3) / 2-zone (Tier 4-5)
 * R3  All sampled refs saved in output
 * R4  Per-Strong: population / sampled / unsampled counts
 * R5  Tier 6-7 full scan
 * R6  Zone minimum guarantees (min 2 per zone) + morph-zone small cell rule
 * R7  Duplicate ref detection on output
 * R8  Input data hash (SHA-256 of sorted Group A refs)
 * R9  Output distinguishes: CONFIRMED (sampled) / INFERRED (unsampled) / FULL_SCAN
 * R10 Expansion conditions documented per tier (machine-checkable thresholds)
 *
 * Tier 1 morph × zone design:
 *   SMALL_CELL_THRESHOLD = 1 — (zone, morphGroup) cells with n=1 are included
 *   unconditionally (guaranteed inclusion of hapax morph-zone combinations).
 *   This keeps the total sample within the 15-20 target for all Tier 1 Strongs.
 *   Threshold=2 would cause G1096/G1831/G3708 to exceed 20 from small cells alone.
 *   See stage4-phase4d-tier1-morph-zone-addendum.md for full rationale.
 */

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------
const ZONE4_MAP = {
  MAT:'I', MRK:'I', LUK:'I',
  JHN:'II','1JN':'II','2JN':'II','3JN':'II', REV:'II',
  ACT:'III',
  ROM:'IV','1CO':'IV','2CO':'IV', GAL:'IV', EPH:'IV',
  PHP:'IV', COL:'IV','1TH':'IV','2TH':'IV','1TI':'IV',
  '2TI':'IV', TIT:'IV', PHM:'IV', HEB:'IV',
  JAS:'IV','1PE':'IV','2PE':'IV', JUD:'IV'
};

const ZONE2_MAP = {
  MAT:'GJ', MRK:'GJ', LUK:'GJ',
  JHN:'GJ','1JN':'GJ','2JN':'GJ','3JN':'GJ', REV:'GJ',
  ACT:'AE',
  ROM:'AE','1CO':'AE','2CO':'AE', GAL:'AE', EPH:'AE',
  PHP:'AE', COL:'AE','1TH':'AE','2TH':'AE','1TI':'AE',
  '2TI':'AE', TIT:'AE', PHM:'AE', HEB:'AE',
  JAS:'AE','1PE':'AE','2PE':'AE', JUD:'AE'
};

// ---------------------------------------------------------------------------
// Tier configuration (plan §1.3)
// ---------------------------------------------------------------------------
const TIER_CONFIG = {
  1: {
    minN: 200, maxN: Infinity,
    target: 20, nZones: 4, minPerZone: 2,
    method: 'morph_zone_stratified_2d',   // upgraded in v2
    methodFallback: 'zone_stratified_4zone',
    expansionTrigger: 'NOTE/AMBIGUOUS > 3 in any zone',
    expansionAction: 'full_scan_affected_zone',
    fullScanTrigger: 'CONFIRMED_ERROR or AMBIGUOUS > 30%'
  },
  2: {
    minN: 100, maxN: 199,
    target: 12, nZones: 4, minPerZone: 2,
    method: 'zone_stratified_4zone',
    expansionTrigger: 'NOTE/AMBIGUOUS >= 2',
    expansionAction: 'expand_2x',
    fullScanTrigger: 'CONFIRMED_ERROR or AMBIGUOUS > 30%'
  },
  3: {
    minN: 50, maxN: 99,
    target: 10, nZones: 4, minPerZone: 2,
    method: 'zone_stratified_4zone',
    smallNFullScanThreshold: 60,
    expansionTrigger: 'NOTE/AMBIGUOUS >= 2',
    expansionAction: 'full_scan',
    fullScanTrigger: 'n <= 99 always manageable'
  },
  4: {
    minN: 20, maxN: 49,
    target: 10, nZones: 2, minPerZone: 2,
    method: 'zone_stratified_2zone',
    expansionTrigger: 'NOTE/AMBIGUOUS >= 2',
    expansionAction: 'full_scan',
    fullScanTrigger: 'n <= 49 manageable'
  },
  5: {
    minN: 10, maxN: 19,
    target: 7, nZones: 2, minPerZone: 2,
    method: 'zone_stratified_2zone',
    expansionTrigger: 'NOTE/AMBIGUOUS >= 1',
    expansionAction: 'full_scan',
    fullScanTrigger: 'n <= 19 manageable'
  },
  6: { minN: 5, maxN: 9,  method: 'full_scan' },
  7: { minN: 1, maxN: 4,  method: 'full_scan' }
};

/** Morph group small-cell threshold for Tier 1: cells with n ≤ this are fully included. */
const SMALL_CELL_THRESHOLD = 1;

// ---------------------------------------------------------------------------
// XorShift32 PRNG (R1)
// ---------------------------------------------------------------------------
function createXorShift32(seed) {
  let s = (seed === 0 ? 1 : seed) >>> 0;
  return function next() {
    s ^= (s << 13) >>> 0;
    s ^= s >>> 17;
    s ^= (s << 5) >>> 0;
    return s >>> 0;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getBook(ref) { return ref.split(' ')[0]; }

function getTier(n) {
  if (n >= 200) return 1;
  if (n >= 100) return 2;
  if (n >= 50)  return 3;
  if (n >= 20)  return 4;
  if (n >= 10)  return 5;
  if (n >= 5)   return 6;
  return 7;
}

// ---------------------------------------------------------------------------
// Morph classification (bible_data token → morph group string)
// Uses tense/mood fields from bible_data (plain English values).
// ---------------------------------------------------------------------------
const TENSE_SHORT = {
  present:'PRS', imperfect:'IPF', future:'FUT',
  aorist:'AOR', perfect:'PRF', pluperfect:'PPF',
  '2ndaorist':'2AO', 'second aorist':'2AO'
};
const MOOD_SHORT = {
  indicative:'IND', subjunctive:'SUB', optative:'OPT',
  imperative:'IMP', infinitive:'INF', participle:'PTC'
};

function classifyMorphGroup(bibleToken) {
  if (!bibleToken) return 'UNKNOWN';
  const morph = bibleToken.morph || '';

  if (morph.startsWith('V-')) {
    const tense = bibleToken.tense || '';
    const mood  = bibleToken.mood  || '';
    if (!tense && !mood) return 'V.UNK.UNK';
    const t = TENSE_SHORT[tense.toLowerCase()] || tense.slice(0,3).toUpperCase();
    const m = MOOD_SHORT[mood.toLowerCase()]  || mood.slice(0,3).toUpperCase();
    // Distinguish 2nd aorist via morph code (tense/mood fields don't distinguish it)
    const is2Aorist = morph.startsWith('V-2');
    return is2Aorist ? `V.2AO.${m}` : `V.${t}.${m}`;
  }

  const pos = morph.split('-')[0];
  switch (pos) {
    case 'N':    return 'NOUN';
    case 'A':    return 'ADJ';
    case 'ADV':  return 'ADV';
    case 'PRT':  return 'PRT';
    case 'R':    return 'PRON';
    case 'P':    return 'PRON';
    case 'D':    return 'DEM';
    case 'CONJ': return 'CONJ';
    case 'I':    return 'INTJ';
    case 'HEB':  return 'HEB';
    default:     return pos ? `POS.${pos}` : 'UNKNOWN';
  }
}

// ---------------------------------------------------------------------------
// bible_data morph lookup
// Loads chapters on demand; returns { ref → bibleToken } map.
// Validates that each ref in `refs` maps to exactly one token.
// ---------------------------------------------------------------------------
function buildMorphLookup(bibleDataPath, refs) {
  const chapCache  = {};   // "BOOK/ch" → { ref → token }
  const morphLookup = {};  // ref → token
  const missing = [];

  for (const ref of refs) {
    const [book, loc] = ref.split(' ');
    const [chVerse]   = loc.split('!');
    const [chStr]     = chVerse.split(':');

    const cacheKey = `${book}/${chStr}`;
    if (!chapCache[cacheKey]) {
      const chapFile = path.join(bibleDataPath, 'nt', book, `${chStr}.json`);
      const arr = JSON.parse(fs.readFileSync(chapFile, 'utf8'));
      const idx = {};
      for (const tok of (Array.isArray(arr) ? arr : arr.data || [])) {
        idx[tok.ref] = tok;
      }
      chapCache[cacheKey] = idx;
    }

    const tok = chapCache[cacheKey][ref];
    if (!tok) {
      missing.push(ref);
      morphLookup[ref] = null;
    } else {
      morphLookup[ref] = tok;
    }
  }

  return { morphLookup, missing, chaptersLoaded: Object.keys(chapCache).length };
}

// ---------------------------------------------------------------------------
// Morph-diversity selection within a zone pool.
// Selects n tokens using round-robin by morphGroup for diversity.
// pool: array of tokens (each has .ref and morphLookup[.ref])
// ---------------------------------------------------------------------------
function selectWithMorphDiversity(pool, n, rng, morphLookup) {
  if (n >= pool.length) return pool.slice();

  // Group by morphGroup
  const byMorph = {};
  for (const t of pool) {
    const bibTok = morphLookup ? morphLookup[t.ref] : null;
    const mg = classifyMorphGroup(bibTok);
    if (!byMorph[mg]) byMorph[mg] = [];
    byMorph[mg].push(t);
  }

  // Fisher-Yates shuffle within each morph group
  for (const group of Object.values(byMorph)) {
    for (let i = group.length - 1; i > 0; i--) {
      const j = rng() % (i + 1);
      [group[i], group[j]] = [group[j], group[i]];
    }
  }

  // Sort groups by population size (largest first, for stable round-robin)
  const queues = Object.entries(byMorph)
    .sort(([, a], [, b]) => b.length - a.length)
    .map(([, toks]) => [...toks]);

  const selected = [];
  while (selected.length < n) {
    let advanced = false;
    for (const q of queues) {
      if (selected.length >= n) break;
      if (q.length > 0) { selected.push(q.shift()); advanced = true; }
    }
    if (!advanced) break; // all queues empty
  }
  return selected;
}

// ---------------------------------------------------------------------------
// Tier 1: morph × zone 2D stratified sampling
// When morphLookup is null, falls back to zone-only (backward compat).
// ---------------------------------------------------------------------------
function tier1MorphZoneSample(tokens, morphLookup, target, minPerZone, seed) {
  const rng = createXorShift32(seed);

  // ------ Build (zone, morphGroup) cells ------
  const cells = {}; // "zone|mg" → token[]
  for (const t of tokens) {
    const book = getBook(t.ref);
    const zone = ZONE4_MAP[book];
    if (!zone) continue;
    const mg = classifyMorphGroup(morphLookup ? morphLookup[t.ref] : null);
    const key = `${zone}|${mg}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(t);
  }

  // ------ Step 1: Small cells (n ≤ SMALL_CELL_THRESHOLD) → full scan ------
  const smallCellRefs   = new Set(); // refs committed via small-cell rule
  const smallCellsMeta  = {};        // for reporting

  for (const [key, cellToks] of Object.entries(cells)) {
    if (cellToks.length <= SMALL_CELL_THRESHOLD) {
      smallCellsMeta[key] = cellToks.length;
      for (const t of cellToks) smallCellRefs.add(t.ref);
    }
  }

  // ------ Step 2: Per-zone large-cell pools (n > SMALL_CELL_THRESHOLD) ------
  const largeByZone = { I: [], II: [], III: [], IV: [] };
  for (const [, cellToks] of Object.entries(cells)) {
    if (cellToks.length <= SMALL_CELL_THRESHOLD) continue;
    for (const t of cellToks) {
      if (!smallCellRefs.has(t.ref)) {
        largeByZone[ZONE4_MAP[getBook(t.ref)]].push(t);
      }
    }
  }

  // ------ Step 3: Remaining budget after small-cell commitments ------
  const committed = smallCellRefs.size;
  let remaining = target - committed;

  // Per-zone small-cell counts (to check minimum guarantee)
  const smallByZone = { I: 0, II: 0, III: 0, IV: 0 };
  for (const ref of smallCellRefs) {
    const z = ZONE4_MAP[getBook(ref)];
    if (z) smallByZone[z]++;
  }

  const sampledRefs = [...smallCellRefs];
  const zoneAllocation = {};

  if (remaining > 0) {
    const presentZones = Object.keys(largeByZone).filter(z => largeByZone[z].length > 0);
    const totalLarge   = presentZones.reduce((a, z) => a + largeByZone[z].length, 0);

    if (totalLarge > 0) {
      // Compute required from large (to satisfy minPerZone)
      const required = {};
      let totalRequired = 0;
      for (const z of presentZones) {
        required[z] = Math.max(0, minPerZone - smallByZone[z]);
        totalRequired += required[z];
      }

      // Proportional allocation on top of required
      const alloc = {};
      let allocated = 0;
      for (const z of presentZones) {
        const prop    = largeByZone[z].length / totalLarge;
        const rawProp = Math.floor(remaining * prop);
        alloc[z] = Math.min(
          Math.max(required[z], rawProp),
          largeByZone[z].length
        );
        allocated += alloc[z];
      }

      // Distribute remainder (largest slack first)
      const sorted = [...presentZones].sort(
        (a, b) => (largeByZone[b].length - alloc[b]) - (largeByZone[a].length - alloc[a])
      );
      let rem2 = remaining - allocated;
      for (const z of sorted) {
        if (rem2 <= 0) break;
        if (alloc[z] < largeByZone[z].length) { alloc[z]++; rem2--; }
      }

      // Select from large cells using morph diversity
      for (const z of presentZones) {
        const n = alloc[z];
        if (n <= 0) continue;
        const selected = selectWithMorphDiversity(largeByZone[z], n, rng, morphLookup);
        for (const t of selected) sampledRefs.push(t.ref);
        zoneAllocation[z] = n;
      }
    }
  }

  // Populate zone allocation with small-cell counts
  for (const z of ['I','II','III','IV']) {
    zoneAllocation[z] = (zoneAllocation[z] || 0) + smallByZone[z];
  }

  // ------ Build morph-zone sample counts ------
  const morphZoneSampleCounts = {};
  const morphZonePopCounts    = {};
  for (const [key, cellToks] of Object.entries(cells)) {
    morphZonePopCounts[key] = cellToks.length;
  }
  const sampledSet = new Set(sampledRefs);
  for (const [key, cellToks] of Object.entries(cells)) {
    morphZoneSampleCounts[key] = cellToks.filter(t => sampledSet.has(t.ref)).length;
  }

  // Distinct morph groups in population vs sample
  const allMorphGroupsPop  = new Set(Object.keys(cells).map(k => k.split('|')[1]));
  const allMorphGroupsSamp = new Set(
    sampledRefs.map(r => {
      const bT = morphLookup ? morphLookup[r] : null;
      return classifyMorphGroup(bT);
    })
  );

  return {
    sampledRefs: sampledRefs.sort(),
    isFullScan: false,
    method: morphLookup ? 'morph_zone_stratified_2d' : 'zone_stratified_4zone_fallback',
    smallCellsMeta,
    smallCellCount: Object.keys(smallCellsMeta).length,
    smallCellTokensCommitted: committed,
    zoneAllocation,
    morphZonePopCounts,
    morphZoneSampleCounts,
    morphCoverage: {
      distinctMorphGroupsInPop:    allMorphGroupsPop.size,
      distinctMorphGroupsInSample: allMorphGroupsSamp.size
    }
  };
}

// ---------------------------------------------------------------------------
// Zone-stratified sampling (Tier 2-5, also fallback for tests)
// ---------------------------------------------------------------------------
function zoneStratifiedSample(tokensByZone, target, minPerZone, seed) {
  const rng = createXorShift32(seed);
  const presentZones = Object.keys(tokensByZone).filter(z => tokensByZone[z].length > 0);
  const total = presentZones.reduce((sum, z) => sum + tokensByZone[z].length, 0);

  if (total <= target) {
    const sampledRefs = [], allocation = {};
    for (const z of presentZones) {
      allocation[z] = tokensByZone[z].length;
      sampledRefs.push(...tokensByZone[z]);
    }
    return { sampledRefs: sampledRefs.map(t => t.ref).sort(), allocation, isFullScan: true };
  }

  const alloc = {};
  let allocated = 0;
  for (const z of presentZones) {
    const prop = tokensByZone[z].length / total;
    const raw  = Math.floor(target * prop);
    alloc[z] = Math.max(minPerZone, Math.min(raw, tokensByZone[z].length));
    allocated += alloc[z];
  }

  const sortedBySlack = [...presentZones].sort(
    (a, b) => (tokensByZone[b].length - alloc[b]) - (tokensByZone[a].length - alloc[a])
  );
  let remainder = target - allocated;
  for (const z of sortedBySlack) {
    if (remainder <= 0) break;
    if (alloc[z] < tokensByZone[z].length) { alloc[z]++; remainder--; }
  }

  const sampledRefs = [];
  for (const z of presentZones) {
    const pool = [...tokensByZone[z]];
    const n = alloc[z];
    for (let i = pool.length - 1; i >= pool.length - n && i > 0; i--) {
      const j = rng() % (i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    sampledRefs.push(...pool.slice(pool.length - n).map(t => t.ref));
  }

  return { sampledRefs: sampledRefs.sort(), allocation: alloc, isFullScan: false };
}

// ---------------------------------------------------------------------------
// Process one Strong
// morphLookup: optional { ref → bibleToken } for Tier 1 2D stratification
// ---------------------------------------------------------------------------
function processStrong(strong, tokens, morphLookup) {
  const n   = tokens.length;
  const tier = getTier(n);
  const cfg  = TIER_CONFIG[tier];
  const seed = parseInt(strong.replace('G', ''), 10) % 10000;

  const sorted = [...tokens].sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));

  const byZone4 = { I: [], II: [], III: [], IV: [] };
  const byZone2 = { GJ: [], AE: [] };
  for (const t of sorted) {
    const book = getBook(t.ref);
    const z4 = ZONE4_MAP[book]; const z2 = ZONE2_MAP[book];
    if (z4) byZone4[z4].push(t);
    if (z2) byZone2[z2].push(t);
  }

  const popByZone4 = Object.fromEntries(Object.entries(byZone4).map(([z, ts]) => [z, ts.length]));
  const popByZone2 = Object.fromEntries(Object.entries(byZone2).map(([z, ts]) => [z, ts.length]));

  let sampledRefs, allocation, isFullScan, method;
  let tier1MorphMeta = null;

  if (tier >= 6) {
    sampledRefs = sorted.map(t => t.ref);
    allocation  = popByZone4;
    isFullScan  = true;
    method      = 'full_scan';
  } else if (tier === 3 && n <= cfg.smallNFullScanThreshold) {
    sampledRefs = sorted.map(t => t.ref);
    allocation  = popByZone4;
    isFullScan  = true;
    method      = 'full_scan_t3_small';
  } else if (tier === 1) {
    // Tier 1: morph × zone 2D sampling (or zone-only fallback if no morphLookup)
    const r = tier1MorphZoneSample(sorted, morphLookup || null, cfg.target, cfg.minPerZone, seed);
    sampledRefs   = r.sampledRefs;
    allocation    = r.zoneAllocation;
    isFullScan    = r.isFullScan;
    method        = r.method;
    tier1MorphMeta = {
      smallCellThreshold:      SMALL_CELL_THRESHOLD,
      smallCells:              r.smallCellsMeta,
      smallCellCount:          r.smallCellCount,
      smallCellTokensCommitted:r.smallCellTokensCommitted,
      morphZonePopCounts:      r.morphZonePopCounts,
      morphZoneSampleCounts:   r.morphZoneSampleCounts,
      morphCoverage:           r.morphCoverage
    };
  } else {
    const tokensByZone = cfg.nZones === 4 ? byZone4 : byZone2;
    const result = zoneStratifiedSample(tokensByZone, cfg.target, cfg.minPerZone, seed);
    sampledRefs = result.sampledRefs;
    allocation  = result.allocation;
    isFullScan  = result.isFullScan;
    method      = result.isFullScan ? 'full_scan_by_total' : cfg.method;
  }

  const refSet       = new Set(sampledRefs);
  const hasDuplicate = refSet.size !== sampledRefs.length;
  const judPop       = sorted.filter(t => getBook(t.ref) === 'JUD').length;
  const judSamp      = sampledRefs.filter(r => r.startsWith('JUD ')).length;

  const result = {
    strong,
    tier,
    population: { total: n, byZone4: popByZone4, byZone2: popByZone2 },
    sampling: { method, seed, target: cfg.target || n, allocation },
    sampledRefs,
    sampledCount:   sampledRefs.length,
    unsampledCount: n - sampledRefs.length,
    sampledConfirmationStatus:   'CONFIRMED_ON_AUDIT',
    unsampledConfirmationStatus: isFullScan ? 'N/A' : 'INFERRED_FROM_STRONG_LEVEL',
    isFullScan,
    expansionCondition: {
      trigger:         cfg.expansionTrigger  || 'N/A',
      action:          cfg.expansionAction   || 'N/A',
      fullScanTrigger: cfg.fullScanTrigger   || 'N/A'
    },
    judTokensInPopulation: judPop,
    judTokensInSample:     judSamp,
    _integrityCheck: { hasDuplicate },
    auditStatus: 'DRY_RUN_PENDING'
  };

  if (tier1MorphMeta) result.tier1MorphMeta = tier1MorphMeta;
  return result;
}

// ---------------------------------------------------------------------------
// morphInputHash: sha256 of sorted "ref:morphGroup" pairs for all Tier 1 tokens.
// Independent of inputHash (which hashes only Group A refs).
// Changes if bible_data morph content or classifyMorphGroup rules change.
// ---------------------------------------------------------------------------
function buildMorphInputHash(morphLookup, tier1Refs) {
  const pairs = [...tier1Refs].sort().map(ref => {
    const tok = morphLookup[ref] || null;
    return ref + ':' + classifyMorphGroup(tok);
  });
  return 'sha256:' + crypto.createHash('sha256')
    .update(pairs.join('\n'))
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Load morph data for all Tier 1 tokens in Group A
// ---------------------------------------------------------------------------
function loadTier1MorphData(groupATokens, bibleDataPath) {
  const byStrong = {};
  for (const t of groupATokens) {
    if (!byStrong[t.strong]) byStrong[t.strong] = [];
    byStrong[t.strong].push(t);
  }
  const tier1Refs = [];
  for (const [, toks] of Object.entries(byStrong)) {
    if (toks.length >= 200) tier1Refs.push(...toks.map(t => t.ref));
  }
  return buildMorphLookup(bibleDataPath, tier1Refs);
}

// ---------------------------------------------------------------------------
// Main plan builder
// ---------------------------------------------------------------------------
function buildGroupASamplingPlan(groupATokens, options) {
  const { bibleDataPath, verbose } = options || {};

  const sortedRefs = groupATokens.map(t => t.ref).sort();
  const inputHash  = 'sha256:' + crypto.createHash('sha256')
    .update(sortedRefs.join('\n'))
    .digest('hex')
    .slice(0, 16);

  const byStrong = {};
  for (const t of groupATokens) {
    if (!byStrong[t.strong]) byStrong[t.strong] = [];
    byStrong[t.strong].push(t);
  }

  // Load morph data for Tier 1 if bible_data path provided
  let tier1MorphLookup = null;
  let tier1MorphMissing = [];
  let chaptersLoaded = 0;
  let morphInputHash = null;

  if (bibleDataPath) {
    if (verbose) console.log('Loading Tier 1 morph data from bible_data...');
    const { morphLookup, missing, chaptersLoaded: cl } =
      loadTier1MorphData(groupATokens, bibleDataPath);
    tier1MorphLookup = morphLookup;
    tier1MorphMissing = missing;
    chaptersLoaded = cl;
    if (verbose) console.log(`  ${Object.keys(morphLookup).length} refs loaded, ${missing.length} missing, ${cl} chapters`);
    morphInputHash = buildMorphInputHash(morphLookup, Object.keys(morphLookup));
    if (verbose) console.log(`  morphInputHash: ${morphInputHash}`);
  }

  const strongSamples = Object.entries(byStrong)
    .sort(([a], [b]) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map(([strong, tokens]) => {
      const tier = getTier(tokens.length);
      const ml   = (tier === 1 && tier1MorphLookup) ? tier1MorphLookup : null;
      return processStrong(strong, tokens, ml);
    });

  const tierSummary = {};
  for (let t = 1; t <= 7; t++) {
    const ss = strongSamples.filter(s => s.tier === t);
    tierSummary[t] = {
      strongs:           ss.length,
      populationTokens:  ss.reduce((a, s) => a + s.population.total, 0),
      sampledTokens:     ss.reduce((a, s) => a + s.sampledCount, 0),
      unsampledTokens:   ss.reduce((a, s) => a + s.unsampledCount, 0),
      fullScanStrongs:   ss.filter(s => s.isFullScan).length,
      sampledStrongs:    ss.filter(s => !s.isFullScan).length,
      judTokensInPop:    ss.reduce((a, s) => a + s.judTokensInPopulation, 0),
      judTokensInSample: ss.reduce((a, s) => a + s.judTokensInSample, 0)
    };
  }

  const totalSampled   = strongSamples.reduce((a, s) => a + s.sampledCount, 0);
  const totalUnsampled = strongSamples.reduce((a, s) => a + s.unsampledCount, 0);
  const totalJudPop    = strongSamples.reduce((a, s) => a + s.judTokensInPopulation, 0);
  const totalJudSamp   = strongSamples.reduce((a, s) => a + s.judTokensInSample, 0);
  const allSampledRefs = strongSamples.flatMap(s => s.sampledRefs);
  const globalDupes    = allSampledRefs.length - new Set(allSampledRefs).size;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      phase: bibleDataPath ? '4d-dry-run-v2' : '4d-dry-run',
      group: 'A',
      mode: 'DRY_RUN',
      inputHash,
      morphInputHash,
      totalGroupATokens: groupATokens.length,
      distinctStrongs:   Object.keys(byStrong).length,
      samplingVersion:   '2.0.0',
      tier1MorphEnabled: !!bibleDataPath,
      tier1MorphMissingRefs: tier1MorphMissing.length,
      tier1MorphChaptersLoaded: chaptersLoaded
    },
    tierSummary,
    overallSummary: {
      totalSampledTokens:   totalSampled,
      totalUnsampledTokens: totalUnsampled,
      totalGroupATokens:    groupATokens.length,
      coveragePercent:      parseFloat(((totalSampled / groupATokens.length) * 100).toFixed(1)),
      fullScanStrongs:      strongSamples.filter(s => s.isFullScan).length,
      zoneStratifiedStrongs:strongSamples.filter(s => !s.isFullScan).length,
      judTokensInPopulation:totalJudPop,
      judTokensInSample:    totalJudSamp,
      globalDuplicateRefs:  globalDupes,
      integrityOk:          globalDupes === 0 && (totalSampled + totalUnsampled) === groupATokens.length
    },
    strongSamples
  };
}

// ---------------------------------------------------------------------------
// Module entry
// ---------------------------------------------------------------------------
function main(outputPath, withMorph) {
  const BASE    = path.resolve(__dirname, '..');
  const gaPath  = path.join(BASE, 'scripts/output/stage4-final/stage4-group-assignment.json');
  const ga      = JSON.parse(fs.readFileSync(gaPath, 'utf8'));
  const groupA  = ga.tokens.filter(t => t.group === 'A');

  const bdPath  = withMorph ? path.join(BASE, 'public/bible_data') : null;
  const plan    = buildGroupASamplingPlan(groupA, { bibleDataPath: bdPath, verbose: true });

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2), 'utf8');
    console.log(`Written to: ${outputPath}`);
  }

  const os = plan.overallSummary;
  console.log(`Sampled: ${os.totalSampledTokens} / ${os.totalGroupATokens} (${os.coveragePercent}%)`);
  console.log(`JUD in pop: ${os.judTokensInPopulation} / in sample: ${os.judTokensInSample}`);
  console.log(`Duplicates: ${os.globalDuplicateRefs}  integrityOk: ${os.integrityOk}`);
  return plan;
}

module.exports = {
  main,
  buildGroupASamplingPlan,
  buildMorphLookup,
  buildMorphInputHash,
  loadTier1MorphData,
  processStrong,
  tier1MorphZoneSample,
  zoneStratifiedSample,
  selectWithMorphDiversity,
  classifyMorphGroup,
  createXorShift32,
  getBook,
  getTier,
  ZONE4_MAP,
  ZONE2_MAP,
  TIER_CONFIG,
  SMALL_CELL_THRESHOLD
};

if (require.main === module) {
  const withMorph  = process.argv.includes('--morph');
  const defaultOut = withMorph
    ? path.join(__dirname, 'output/stage4-final/stage4-phase4d-sampling-dry-run-v2.json')
    : path.join(__dirname, 'output/stage4-final/stage4-phase4d-sampling-dry-run.json');
  const outPath = process.argv.find(a => a.endsWith('.json')) || defaultOut;
  main(outPath, withMorph);
}
