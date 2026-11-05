'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// ---- Load sources ----
const an = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4an-tier1-sampled-token-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// ---- Extract DIRECTLY_CONFIRMED_OK tokens ----
const okTokens = an.tokens.filter(t => t.verdict === 'DIRECTLY_CONFIRMED_OK');
console.log('Phase 4an DIRECTLY_CONFIRMED_OK:', okTokens.length);

// Verify HOLD token is NOT included
const holdToken = an.tokens.find(t => t.verdict === 'DIRECTLY_CONFIRMED_HOLD');
if (holdToken) {
  if (okTokens.some(t => t.ref === holdToken.ref)) {
    console.error('FATAL: HOLD token is in OK set:', holdToken.ref);
    process.exit(1);
  }
  console.log('HOLD token protected (not in OK set):', holdToken.ref);
}

// ---- bible_data chapter cache ----
const chCache = {};
function getTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  if (!m) return null;
  const [, book, ch] = m;
  const k = book + '/' + ch;
  if (!chCache[k]) {
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(BIBLE, book, ch + '.json'), 'utf8'));
      chCache[k] = new Map(arr.map(t => [t.ref, t]));
    } catch (e) { chCache[k] = new Map(); }
  }
  return chCache[k].get(ref) || null;
}

// ---- Pre-flight checks ----
let preErrors = 0;
for (const t of okTokens) {
  // Must be UNREVIEWED in current Phase 4ag
  if (agStateMap.get(t.ref) !== 'UNREVIEWED') {
    console.error('NOT_UNREVIEWED:', t.ref, agStateMap.get(t.ref));
    preErrors++;
  }
  // Must have correct basis from Phase 4an
  if (t.basis !== 'PHASE4E_DIRECTLY_SAMPLED_OK') {
    console.error('WRONG_BASIS:', t.ref, t.basis);
    preErrors++;
  }
  // Cross-check bible_data: strong/morph/japanese must still match Phase 4an record
  const bt = getTok(t.ref);
  if (!bt) {
    console.error('NOT_IN_BIBLE_DATA:', t.ref);
    preErrors++;
    continue;
  }
  if (bt.strong !== t.strong) {
    console.error('STRONG_MISMATCH:', t.ref, 'phase4an:', t.strong, 'now:', bt.strong);
    preErrors++;
  }
  if (bt.japanese !== t.japanese) {
    console.error('JA_MISMATCH:', t.ref, 'phase4an:', t.japanese, 'now:', bt.japanese);
    preErrors++;
  }
  if (bt.morph !== t.morph) {
    console.error('MORPH_MISMATCH:', t.ref, 'phase4an:', t.morph, 'now:', bt.morph);
    preErrors++;
  }
}
if (preErrors > 0) {
  console.error('Pre-flight FAILED:', preErrors, 'errors');
  process.exit(1);
}
console.log('Pre-flight: PASS (' + okTokens.length + ' refs)');

// ---- Build reclassification records ----
const byStrong = {};
const reclassified = okTokens.map(t => {
  byStrong[t.strong] = (byStrong[t.strong] || 0) + 1;
  return {
    ref: t.ref,
    old_state: 'UNREVIEWED',
    new_state: 'RETAIN_CONFIRMED',
    strong: t.strong,
    lemma: t.lemma,
    morph: t.morph,
    japanese: t.japanese,
    basis: 'PHASE4E_DIRECTLY_SAMPLED_OK',
    e4_zone: t.zone,
    e4_confidence: t.e4_confidence,
  };
});

// ---- Apply updates to Phase 4ag inventory ----
const reclassSet = new Set(reclassified.map(r => r.ref));
let updCount = 0;
for (const tok of ag.tokens) {
  if (reclassSet.has(tok.ref)) {
    tok.state = 'RETAIN_CONFIRMED';
    tok.phase = '4ao';
    tok.note = 'PHASE4E_DIRECTLY_SAMPLED_OK → reclassified by Phase 4ao';
    tok.evidence_basis = 'PHASE4E_DIRECTLY_SAMPLED_OK';
    updCount++;
  }
}
console.log('Updated tokens in Phase 4ag:', updCount);

// Verify HOLD token unchanged
const holdInAg = ag.tokens.find(t => t.ref === 'JHN 6:61!1');
if (!holdInAg || holdInAg.state !== 'UNREVIEWED') {
  console.error('FATAL: JHN 6:61!1 state changed:', holdInAg?.state);
  process.exit(1);
}
console.log('JHN 6:61!1 state:', holdInAg.state, '— PROTECTED ✓');

// ---- Recompute state_summary ----
const stateCounts = {};
for (const tok of ag.tokens) stateCounts[tok.state] = (stateCounts[tok.state] || 0) + 1;
ag.state_summary = stateCounts;
ag.meta.last_updated_phase = '4ao';
ag.meta.last_updated_date = '2026-11-04';

// ---- Integrity checks ----
const checks = {
  total_tokens:               { expected: 92952, actual: ag.tokens.length,            pass: ag.tokens.length === 92952 },
  state_sum:                  { expected: 92952, actual: Object.values(stateCounts).reduce((a,b)=>a+b,0), pass: Object.values(stateCounts).reduce((a,b)=>a+b,0) === 92952 },
  UNREVIEWED:                 { expected: 41215, actual: stateCounts.UNREVIEWED,       pass: stateCounts.UNREVIEWED === 41215 },
  RETAIN_CONFIRMED:           { expected: 51364, actual: stateCounts.RETAIN_CONFIRMED, pass: stateCounts.RETAIN_CONFIRMED === 51364 },
  IMPLEMENTED_AND_VERIFIED:   { expected: 365,   actual: stateCounts.IMPLEMENTED_AND_VERIFIED, pass: stateCounts.IMPLEMENTED_AND_VERIFIED === 365 },
  HOLD_DATA_QUALITY:          { expected: 7,     actual: stateCounts.HOLD_DATA_QUALITY, pass: stateCounts.HOLD_DATA_QUALITY === 7 },
  HOLD_CONTEXT:               { expected: 1,     actual: stateCounts.HOLD_CONTEXT,     pass: stateCounts.HOLD_CONTEXT === 1 },
  reclassified_count:         { expected: 375,   actual: updCount,                    pass: updCount === 375 },
  no_duplicates:              { expected: 375,   actual: reclassSet.size,             pass: reclassSet.size === 375 },
  hold_protected:             { expected: 'UNREVIEWED', actual: holdInAg.state,       pass: holdInAg.state === 'UNREVIEWED' },
};
const allPass = Object.values(checks).every(c => c.pass === true);
ag.integrity = ag.integrity || {};
ag.integrity.phase4ao_check = allPass ? 'PASS' : 'FAIL';

console.log('Phase 4ag state_summary (after):', JSON.stringify(stateCounts));
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(checks)) if (!v.pass) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);

// ---- Strong summary ----
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1] - a[1])
  .map(([strong, count]) => {
    const prof = an.strong_summary.find(s => s.strong === strong) || {};
    return {
      strong,
      lex_meaning: prof.lex_meaning || '',
      count,
      distinct_japanese: prof.distinct_japanese || [],
      morph_count: prof.morph_count || 0,
    };
  });

// ---- Write reclassification JSON ----
const outJson = {
  meta: {
    phase: '4ao',
    date: '2026-11-04',
    description: 'Phase 4an DIRECTLY_CONFIRMED_OK 375件を UNREVIEWED → RETAIN_CONFIRMED に再分類',
    basis: 'PHASE4E_DIRECTLY_SAMPLED_OK',
    basis_definition: 'Phase 4e Tier 1 サンプリングで ref 単位に直接確認・CONFIRMED_OK。Phase 4an で bible_data strong/morph/japanese 完全一致確認済み。',
    individual_note: 'ref 単位の直接サンプル確認（Tier 1 高頻度 Strong 20件）。PHASE4F_DIRECTLY_SAMPLED_OK（Tier 2）とは対象 Tier が異なる同等の証拠強度。',
    source_phase4an: 'stage4-phase4an-tier1-sampled-token-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    hold_protected: 'JHN 6:61!1 (G3708 ὁράω εἰδὼς) — DIRECTLY_CONFIRMED_HOLD, state=UNREVIEWED を維持',
  },
  pre_flight: {
    all_unreviewed: 375,
    all_directly_confirmed_ok: 375,
    all_bible_data_match: 375,
    hold_not_in_ok_set: true,
    result: 'PASS',
  },
  integrity: checks,
  state_delta: {
    UNREVIEWED:        { before: 41590, after: 41215, delta: -375 },
    RETAIN_CONFIRMED:  { before: 50989, after: 51364, delta: +375 },
  },
  retain_confirmed_basis_breakdown: {
    DESIGN_RULE_GROUP_Z:                              40990,
    ALL_INDIVIDUALLY_CONFIRMED_CandE:                  2636,
    PHASE4H_INDIVIDUALLY_CONFIRMED_OK_phase4ai:         196,
    PHASE4B_AUDITED_D:                                  281,
    GROUP_RULE_INFERRED_B:                             2318,
    PHASE4F_SAMPLED_INFERRED_CONFIRMED_phase4ak:       4158,
    PHASE4F_DIRECTLY_SAMPLED_OK_phase4am:               410,
    PHASE4E_DIRECTLY_SAMPLED_OK_phase4ao:               375,
    total: 51364,
  },
  strong_summary: strongSummary,
  tokens: reclassified,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4ao-reclassification.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4ao-reclassification.json');

fs.writeFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), JSON.stringify(ag, null, 2));
console.log('Updated stage4-phase4ag-residual-inventory.json');
