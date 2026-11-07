'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');

const al = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4al-sampled-token-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// Pre-flight
const okTokens = al.tokens.filter(t => t.verdict === 'CONFIRMED_OK');
let preErrors = 0;
for (const t of okTokens) {
  if (agStateMap.get(t.ref) !== 'UNREVIEWED') { console.error('NOT_UNREVIEWED:', t.ref); preErrors++; }
  if (t.basis !== 'PHASE4F_DIRECTLY_SAMPLED_OK') { console.error('WRONG_BASIS:', t.ref, t.basis); preErrors++; }
  if (t.f4f_confidence !== 'HIGH') { console.error('NOT_HIGH_CONF:', t.ref); preErrors++; }
  if (!t.ja_match) { console.error('JA_MISMATCH:', t.ref); preErrors++; }
}
if (preErrors > 0) { console.error('Pre-flight FAILED:', preErrors, 'errors'); process.exit(1); }
console.log('Pre-flight: PASS (' + okTokens.length + ' refs)');

// Build reclassification records
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
    basis: 'PHASE4F_DIRECTLY_SAMPLED_OK',
    f4f_zone: t.f4f_zone,
    f4f_confidence: t.f4f_confidence,
  };
});

// Update Phase 4ag inventory
const reclassSet = new Set(reclassified.map(r => r.ref));
let updCount = 0;
for (const tok of ag.tokens) {
  if (reclassSet.has(tok.ref)) {
    tok.state = 'RETAIN_CONFIRMED';
    tok.phase = '4am';
    tok.note = 'PHASE4F_DIRECTLY_SAMPLED_OK → reclassified by Phase 4am';
    tok.evidence_basis = 'PHASE4F_DIRECTLY_SAMPLED_OK';
    updCount++;
  }
}
console.log('Updated tokens in Phase 4ag:', updCount);

// Recompute state_summary
const stateCounts = {};
for (const tok of ag.tokens) stateCounts[tok.state] = (stateCounts[tok.state] || 0) + 1;
ag.state_summary = stateCounts;
ag.meta.last_updated_phase = '4am';
ag.meta.last_updated_date = '2026-11-04';

// Integrity checks
const checks = {
  total_tokens:               { expected: 92952, actual: ag.tokens.length, pass: ag.tokens.length === 92952 },
  state_sum:                  { expected: 92952, actual: Object.values(stateCounts).reduce((a,b)=>a+b,0), pass: Object.values(stateCounts).reduce((a,b)=>a+b,0) === 92952 },
  UNREVIEWED:                 { expected: 41590, actual: stateCounts.UNREVIEWED, pass: stateCounts.UNREVIEWED === 41590 },
  RETAIN_CONFIRMED:           { expected: 50989, actual: stateCounts.RETAIN_CONFIRMED, pass: stateCounts.RETAIN_CONFIRMED === 50989 },
  IMPLEMENTED_AND_VERIFIED:   { expected: 365,   actual: stateCounts.IMPLEMENTED_AND_VERIFIED, pass: stateCounts.IMPLEMENTED_AND_VERIFIED === 365 },
  HOLD_DATA_QUALITY:          { expected: 7,     actual: stateCounts.HOLD_DATA_QUALITY, pass: stateCounts.HOLD_DATA_QUALITY === 7 },
  HOLD_CONTEXT:               { expected: 1,     actual: stateCounts.HOLD_CONTEXT, pass: stateCounts.HOLD_CONTEXT === 1 },
  reclassified_count:         { expected: 410,   actual: updCount, pass: updCount === 410 },
  no_duplicates:              { expected: 410,   actual: reclassSet.size, pass: reclassSet.size === 410 },
};
const allPass = Object.values(checks).every(c => c.pass === true);
ag.integrity.phase4am_check = allPass ? 'PASS' : 'FAIL';

console.log('Phase 4ag state_summary (after):', JSON.stringify(stateCounts));
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(checks)) if (!v.pass) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);

// Strong summary
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1] - a[1])
  .map(([strong, count]) => {
    const prof = al.strong_summary.find(s => s.strong === strong) || {};
    return { strong, lex_meaning: prof.lex_meaning || '', count, distinct_japanese: prof.distinct_japanese || [] };
  });

// Write reclassification JSON
const outJson = {
  meta: {
    phase: '4am',
    date: '2026-11-04',
    description: 'Phase 4al CONFIRMED_OK 410件を UNREVIEWED → RETAIN_CONFIRMED に再分類',
    basis: 'PHASE4F_DIRECTLY_SAMPLED_OK',
    basis_definition: 'Phase 4f Tier 2 サンプルで ref 単位に直接確認・CONFIRMED_OK / HIGH confidence。Phase 4al で bible_data japanese 完全一致確認済み。',
    individual_note: 'ref 単位の直接サンプル確認。PHASE4F_SAMPLED_INFERRED_CONFIRMED（Strong単位推定）やPHASE4H_INDIVIDUALLY_CONFIRMED_OK（changeNeeded全件確認）とは区別する。',
    source_phase4al: 'stage4-phase4al-sampled-token-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
  },
  pre_flight: { all_unreviewed: 410, all_confirmed_ok: 410, all_high_confidence: 410, all_ja_match: 410, no_overlaps: true, result: 'PASS' },
  integrity: checks,
  state_delta: {
    UNREVIEWED:        { before: 42000, after: 41590, delta: -410 },
    RETAIN_CONFIRMED:  { before: 50579, after: 50989, delta: +410 },
  },
  retain_confirmed_basis_breakdown: {
    DESIGN_RULE_GROUP_Z:                              40990,
    ALL_INDIVIDUALLY_CONFIRMED_CandE:                  2636,
    PHASE4H_INDIVIDUALLY_CONFIRMED_OK_phase4ai:         196,
    PHASE4B_AUDITED_D:                                  281,
    GROUP_RULE_INFERRED_B:                             2318,
    PHASE4F_SAMPLED_INFERRED_CONFIRMED_phase4ak:       4158,
    PHASE4F_DIRECTLY_SAMPLED_OK_phase4am:               410,
    total: 50989,
  },
  strong_summary: strongSummary,
  tokens: reclassified,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4am-reclassification.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4am-reclassification.json');

fs.writeFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), JSON.stringify(ag, null, 2));
console.log('Updated stage4-phase4ag-residual-inventory.json');
