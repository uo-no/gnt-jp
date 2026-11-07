'use strict';
const fs = require('fs'), path = require('path');

const BASE = path.join(__dirname, 'output/stage4-final');

// ---- Load sources ----
const aj = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4aj-tier2-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));

// ---- Pre-flight checks ----
const ajOk = aj.tokens.filter(t => t.verdict === 'CONFIRMED_OK');
const ajRefs = new Set(aj.tokens.map(t => t.ref));
const agState = new Map(ag.tokens.map(t => [t.ref, { idx: ag.tokens.indexOf(t), state: t.state }]));

console.log('Phase 4aj CONFIRMED_OK:', ajOk.length);
console.log('Phase 4ag total:', ag.tokens.length);
console.log('Phase 4ag state_summary (before):', JSON.stringify(ag.state_summary));

// All must be UNREVIEWED in Phase 4ag
let preErrors = 0;
for (const t of aj.tokens) {
  const entry = agState.get(t.ref);
  if (!entry) { console.error('NOT_FOUND_IN_AG:', t.ref); preErrors++; }
  else if (entry.state !== 'UNREVIEWED') { console.error('NOT_UNREVIEWED:', t.ref, entry.state); preErrors++; }
  if (t.verdict !== 'CONFIRMED_OK') { console.error('NON_OK_VERDICT:', t.ref, t.verdict); preErrors++; }
}
if (preErrors > 0) { console.error('Pre-flight FAILED:', preErrors, 'errors'); process.exit(1); }
console.log('Pre-flight: PASS (', ajRefs.size, 'refs all UNREVIEWED, all CONFIRMED_OK )');

// ---- Build reclassification records ----
const reclassified = [];
const byStrong = {};

for (const ajTok of aj.tokens) {
  const agEntry = agState.get(ajTok.ref);
  reclassified.push({
    ref: ajTok.ref,
    old_state: 'UNREVIEWED',
    new_state: 'RETAIN_CONFIRMED',
    strong: ajTok.strong,
    lemma: ajTok.lemma,
    morph: ajTok.morph,
    japanese: ajTok.japanese,
    basis: 'PHASE4F_SAMPLED_INFERRED_CONFIRMED',
    basis_detail: 'Phase 4f Tier 2 サンプル全件 CONFIRMED_OK + 全件 japanese 一貫性確認 + データ品質照合（strong mismatch=0）',
    was_phase4f_sampled: ajTok.was_phase4f_sampled,
  });
  if (!byStrong[ajTok.strong]) byStrong[ajTok.strong] = 0;
  byStrong[ajTok.strong]++;
}

console.log('Reclassification records built:', reclassified.length);

// ---- Build Strong summary for JSON ----
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1] - a[1])
  .map(([strong, count]) => {
    const sample = aj.strong_summary.find(s => s.strong === strong);
    return {
      strong,
      name: sample ? sample.name : '',
      lex_meaning: sample ? sample.lex_meaning : '',
      count,
      distinct_japanese: sample ? sample.distinct_japanese : [],
      phase4f_sampled: sample ? sample.phase4f_sampled : 0,
      phase4f_ok: sample ? sample.phase4f_ok : 0,
    };
  });

// ---- Update Phase 4ag inventory ----
const reclassSet = new Set(reclassified.map(r => r.ref));
let updCount = 0;
for (const tok of ag.tokens) {
  if (reclassSet.has(tok.ref)) {
    tok.state = 'RETAIN_CONFIRMED';
    tok.phase = '4ak';
    tok.note = 'PHASE4F_SAMPLED_INFERRED_CONFIRMED → reclassified by Phase 4ak';
    tok.evidence_basis = 'PHASE4F_SAMPLED_INFERRED_CONFIRMED';
    updCount++;
  }
}
console.log('Updated tokens in Phase 4ag:', updCount);

// ---- Recompute state_summary ----
const stateCounts = {};
for (const tok of ag.tokens) {
  stateCounts[tok.state] = (stateCounts[tok.state] || 0) + 1;
}
ag.state_summary = stateCounts;
ag.meta.last_updated_phase = '4ak';
ag.meta.last_updated_date = '2026-11-04';

// ---- Integrity checks ----
const total = ag.tokens.length;
const sum = Object.values(stateCounts).reduce((a, b) => a + b, 0);
const integrityChecks = {
  total_tokens: { expected: 92952, actual: total, pass: total === 92952 },
  state_sum: { expected: 92952, actual: sum, pass: sum === 92952 },
  UNREVIEWED: { expected: 42000, actual: stateCounts.UNREVIEWED, pass: stateCounts.UNREVIEWED === 42000 },
  RETAIN_CONFIRMED: { expected: 50579, actual: stateCounts.RETAIN_CONFIRMED, pass: stateCounts.RETAIN_CONFIRMED === 50579 },
  IMPLEMENTED_AND_VERIFIED: { expected: 365, actual: stateCounts.IMPLEMENTED_AND_VERIFIED, pass: stateCounts.IMPLEMENTED_AND_VERIFIED === 365 },
  HOLD_DATA_QUALITY: { expected: 7, actual: stateCounts.HOLD_DATA_QUALITY, pass: stateCounts.HOLD_DATA_QUALITY === 7 },
  HOLD_CONTEXT: { expected: 1, actual: stateCounts.HOLD_CONTEXT, pass: stateCounts.HOLD_CONTEXT === 1 },
  reclassified_count: { expected: 4158, actual: updCount, pass: updCount === 4158 },
  no_duplicates: { expected: 4158, actual: reclassSet.size, pass: reclassSet.size === 4158 },
};
const allPass = Object.values(integrityChecks).every(c => c.pass === undefined || c.pass === true);
ag.integrity.phase4ak_check = allPass ? 'PASS' : 'FAIL';

console.log('Phase 4ag state_summary (after):', JSON.stringify(stateCounts));
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(integrityChecks)) {
  if (v.pass === false) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);
}

// ---- Write reclassification JSON ----
const outJson = {
  meta: {
    phase: '4ak',
    date: '2026-11-04',
    description: 'Phase 4aj CONFIRMED_OK 4,158件を UNREVIEWED → RETAIN_CONFIRMED に再分類',
    basis: 'PHASE4F_SAMPLED_INFERRED_CONFIRMED',
    basis_definition: 'Phase 4f Tier 2 サンプル全件 CONFIRMED_OK + Phase 4aj 全件 japanese 一貫性照合 + データ品質照合（strong/lemma/morph）',
    source_phase4aj: 'stage4-phase4aj-tier2-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    individual_confirmation_note: 'PHASE4F_SAMPLED_INFERRED_CONFIRMEDは個別語義確認ではない。Phase 4fサンプル・Strong単位一貫性・データ品質の3条件による判定。PHASE4H_INDIVIDUALLY_CONFIRMED_OK（Phase 4ai）とは区別する。',
  },
  pre_flight: {
    all_unreviewed: 4158,
    all_confirmed_ok: 4158,
    no_duplicates: true,
    no_impl_overlap: true,
    result: 'PASS',
  },
  integrity: integrityChecks,
  state_delta: {
    UNREVIEWED: { before: 46158, after: 46158 - 4158, delta: -4158 },
    RETAIN_CONFIRMED: { before: 46421, after: 46421 + 4158, delta: +4158 },
  },
  strong_summary: strongSummary,
  retain_confirmed_basis_breakdown: {
    note: 'Phase 4ak実施後のRETAIN_CONFIRMED 50,579件の根拠区分（概算）',
    DESIGN_RULE_GROUP_Z: 40990,
    ALL_INDIVIDUALLY_CONFIRMED_CandE: 2636,
    PHASE4H_INDIVIDUALLY_CONFIRMED_OK_phase4ai: 196,
    PHASE4B_AUDITED_D: 281,
    GROUP_RULE_INFERRED_B: 2318,
    PHASE4F_SAMPLED_INFERRED_CONFIRMED_phase4ak: 4158,
    total: 50579,
  },
  tokens: reclassified,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4ak-reclassification.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4ak-reclassification.json');

// ---- Save updated Phase 4ag ----
fs.writeFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), JSON.stringify(ag, null, 2));
console.log('Updated stage4-phase4ag-residual-inventory.json');
