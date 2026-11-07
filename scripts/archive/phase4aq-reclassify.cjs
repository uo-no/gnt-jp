'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// ---- Load sources ----
const ap = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ap-tier1-inferred-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// ---- G3708 +5: V-RAP non-NSM tokens in SAMPLE_SUPPORTED ----
// Phase 4aq instruction: confirm and exclude from reclassification
// (same εἰδ- perfect semantic risk as V-RAP-NSM exception group)
const G3708_VRAP_EXTRA = new Set([
  'JHN 4:45!12',   // V-RAP-NPM-ATT
  'JHN 14:9!16',   // V-RAP-NSM-ATT
  'JHN 19:35!3',   // V-RAP-NSM-ATT
  '2PE 1:12!9',    // V-RAP-APM
  'JUD 1:5!5',     // V-RAP-APM
]);

// Verify each of the 5 is currently UNREVIEWED and in SAMPLE_SUPPORTED
for (const ref of G3708_VRAP_EXTRA) {
  const apTok = ap.tokens.find(t => t.ref === ref);
  const agEntry = agMap.get(ref);
  if (!apTok) { console.error('G3708 +5 not found in Phase 4ap:', ref); process.exit(1); }
  if (apTok.verdict !== 'STRONG_CONSISTENT_SAMPLE_SUPPORTED') {
    console.error('G3708 +5 verdict mismatch:', ref, apTok.verdict); process.exit(1);
  }
  if (!agEntry || agEntry.state !== 'UNREVIEWED') {
    console.error('G3708 +5 not UNREVIEWED:', ref, agEntry?.state); process.exit(1);
  }
  console.log('G3708 +5 confirmed UNREVIEWED, excluded from Phase 4aq:', ref, apTok.cur_morph);
}

// ---- Extract promotion targets ----
// STRONG_CONSISTENT_SAMPLE_SUPPORTED excluding G3708 +5
const candidateTokens = ap.tokens.filter(t => t.verdict === 'STRONG_CONSISTENT_SAMPLE_SUPPORTED');
const okTokens = candidateTokens.filter(t => !G3708_VRAP_EXTRA.has(t.ref));
console.log('Phase 4ap STRONG_CONSISTENT_SAMPLE_SUPPORTED:', candidateTokens.length);
console.log('G3708 V-RAP non-NSM excluded:', G3708_VRAP_EXTRA.size);
console.log('Actual promotion targets:', okTokens.length);

// Verify EXCEPTION_RISK tokens are not in promotion set
const exceptionRefs = new Set(ap.exception_tokens.map(t => t.ref));
for (const t of okTokens) {
  if (exceptionRefs.has(t.ref)) { console.error('EXCEPTION token in OK set:', t.ref); process.exit(1); }
}
console.log('No EXCEPTION_RISK overlap: OK');

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
  const agEntry = agMap.get(t.ref);
  if (!agEntry || agEntry.state !== 'UNREVIEWED') {
    console.error('NOT_UNREVIEWED:', t.ref, agEntry?.state);
    preErrors++;
  }
  const bt = getTok(t.ref);
  if (!bt) { console.error('NOT_IN_BIBLE_DATA:', t.ref); preErrors++; continue; }
  if (bt.strong !== t.strong) { console.error('STRONG_MISMATCH:', t.ref, 'ap:', t.strong, 'now:', bt.strong); preErrors++; }
  if (bt.japanese !== t.cur_japanese) { console.error('JA_MISMATCH:', t.ref, 'ap:', t.cur_japanese, 'now:', bt.japanese); preErrors++; }
  if (bt.morph !== t.cur_morph) { console.error('MORPH_MISMATCH:', t.ref, 'ap:', t.cur_morph, 'now:', bt.morph); preErrors++; }
}
if (preErrors > 0) { console.error('Pre-flight FAILED:', preErrors, 'errors'); process.exit(1); }
console.log('Pre-flight: PASS (' + okTokens.length + ' refs)');

// ---- Verify EXCEPTION 439 + G3708_extra 5 remain UNREVIEWED ----
const protectedRefs = [...exceptionRefs, ...G3708_VRAP_EXTRA];
let protectedUnreviewed = 0;
for (const ref of protectedRefs) {
  const ag_state = agMap.get(ref)?.state;
  if (ag_state === 'UNREVIEWED') protectedUnreviewed++;
  else console.error('PROTECTED not UNREVIEWED:', ref, ag_state);
}
console.log('Protected tokens (439+5):', protectedRefs.length, '/ UNREVIEWED:', protectedUnreviewed);

// ---- Build reclassification records ----
const byStrong = {};
const reclassified = okTokens.map(t => {
  byStrong[t.strong] = (byStrong[t.strong] || 0) + 1;
  return {
    ref: t.ref,
    old_state: 'UNREVIEWED',
    new_state: 'RETAIN_CONFIRMED',
    strong: t.strong,
    cur_japanese: t.cur_japanese,
    cur_morph: t.cur_morph,
    basis: 'PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1',
    phase4ap_verdict: t.verdict,
    phase4ap_basis: t.basis,
  };
});

// ---- Apply updates to Phase 4ag inventory ----
const reclassSet = new Set(reclassified.map(r => r.ref));
let updCount = 0;
for (const tok of ag.tokens) {
  if (reclassSet.has(tok.ref)) {
    tok.state = 'RETAIN_CONFIRMED';
    tok.phase = '4aq';
    tok.note = 'PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1 → reclassified by Phase 4aq';
    tok.evidence_basis = 'PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1';
    updCount++;
  }
}
console.log('Updated tokens in Phase 4ag:', updCount);

// Verify protected tokens unchanged
for (const ref of protectedRefs) {
  const tok = agMap.get(ref);
  if (!tok || tok.state !== 'UNREVIEWED') {
    console.error('PROTECTED token was modified:', ref, tok?.state);
    process.exit(1);
  }
}
console.log('Protected tokens (439+5) all UNREVIEWED after update: OK');

// ---- Recompute state_summary ----
const stateCounts = {};
for (const tok of ag.tokens) stateCounts[tok.state] = (stateCounts[tok.state] || 0) + 1;
ag.state_summary = stateCounts;
ag.meta.last_updated_phase = '4aq';
ag.meta.last_updated_date = '2026-11-04';

// ---- Integrity checks ----
// Note: actual promotion is 7,880 (not 7,885) due to G3708 +5 exclusion
// Phase 4aq instruction expected 33,330/59,249 — actual is 33,335/59,244
const ACTUAL_PROMOTED = 7880;
const EXPECTED_UNREVIEWED_AFTER = 41215 - ACTUAL_PROMOTED; // 33335
const EXPECTED_RC_AFTER = 51364 + ACTUAL_PROMOTED;         // 59244
const checks = {
  total_tokens:               { expected: 92952, actual: ag.tokens.length,            pass: ag.tokens.length === 92952 },
  state_sum:                  { expected: 92952, actual: Object.values(stateCounts).reduce((a,b)=>a+b,0), pass: Object.values(stateCounts).reduce((a,b)=>a+b,0) === 92952 },
  UNREVIEWED:                 { expected: EXPECTED_UNREVIEWED_AFTER, actual: stateCounts.UNREVIEWED, pass: stateCounts.UNREVIEWED === EXPECTED_UNREVIEWED_AFTER },
  RETAIN_CONFIRMED:           { expected: EXPECTED_RC_AFTER,         actual: stateCounts.RETAIN_CONFIRMED, pass: stateCounts.RETAIN_CONFIRMED === EXPECTED_RC_AFTER },
  IMPLEMENTED_AND_VERIFIED:   { expected: 365, actual: stateCounts.IMPLEMENTED_AND_VERIFIED, pass: stateCounts.IMPLEMENTED_AND_VERIFIED === 365 },
  HOLD_DATA_QUALITY:          { expected: 7,   actual: stateCounts.HOLD_DATA_QUALITY,         pass: stateCounts.HOLD_DATA_QUALITY === 7 },
  HOLD_CONTEXT:               { expected: 1,   actual: stateCounts.HOLD_CONTEXT,              pass: stateCounts.HOLD_CONTEXT === 1 },
  reclassified_count:         { expected: ACTUAL_PROMOTED, actual: updCount, pass: updCount === ACTUAL_PROMOTED },
  no_duplicates:              { expected: ACTUAL_PROMOTED, actual: reclassSet.size, pass: reclassSet.size === ACTUAL_PROMOTED },
  exception_439_protected:    { expected: 439, actual: ap.exception_tokens.length, pass: ap.exception_tokens.length === 439 },
  g3708_extra5_protected:     { expected: 5,   actual: G3708_VRAP_EXTRA.size,     pass: G3708_VRAP_EXTRA.size === 5 },
  no_exception_in_promo:      { expected: 0, actual: reclassified.filter(r => exceptionRefs.has(r.ref)).length, pass: reclassified.filter(r => exceptionRefs.has(r.ref)).length === 0 },
  no_g3708extra_in_promo:     { expected: 0, actual: reclassified.filter(r => G3708_VRAP_EXTRA.has(r.ref)).length, pass: reclassified.filter(r => G3708_VRAP_EXTRA.has(r.ref)).length === 0 },
};
const allPass = Object.values(checks).every(c => c.pass === true);
ag.integrity = ag.integrity || {};
ag.integrity.phase4aq_check = allPass ? 'PASS' : 'FAIL';

console.log('Phase 4ag state_summary (after):', JSON.stringify(stateCounts));
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(checks)) if (!v.pass) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);

// ---- Strong summary ----
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1] - a[1])
  .map(([strong, count]) => {
    const prof = ap.strong_summary.find(s => s.strong === strong) || {};
    return {
      strong,
      lex_meaning: prof.lex_meaning || '',
      promoted_count: count,
      exception_risk_count: (ap.exception_tokens.filter(t => t.strong === strong).length),
      distinct_japanese: prof.ja_values || [],
    };
  });

// ---- Write reclassification JSON ----
const outJson = {
  meta: {
    phase: '4aq',
    date: '2026-11-04',
    description: 'Phase 4ap STRONG_CONSISTENT_SAMPLE_SUPPORTED 7,880件を UNREVIEWED → RETAIN_CONFIRMED に再分類',
    basis: 'PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1',
    basis_definition: 'Phase 4eのTier 1サンプル結果とStrong単位の一貫性に基づく推定確認。個々のrefをすべて直接確認したものではない。',
    individual_note: 'ref単位の直接サンプル確認ではなく、Strong単位の推定。PHASE4E_DIRECTLY_SAMPLED_OK（Phase 4ao）やPHASE4H_INDIVIDUALLY_CONFIRMED_OK（Phase 4ai）より証拠強度は低い。',
    source_phase4ap: 'stage4-phase4ap-tier1-inferred-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    g3708_extra_excluded: {
      count: 5,
      refs: [...G3708_VRAP_EXTRA],
      reason: 'V-RAP非NSM形はεἰδ-完了語幹（PHASE4E_CONTEXT_DEPENDENT JHN 6:61!1と同一リスク）。Phase 4ap SAMPLE_SUPPORTED分類だが保守的除外。',
      state_after: 'UNREVIEWED',
    },
    deviation_from_phase4aq_expected_table: {
      note: 'Phase 4aq指示書の期待値は7,885件昇格（UNREVIEWED=33,330）。G3708 +5除外により実際は7,880件昇格（UNREVIEWED=33,335）。',
      expected_in_instruction: { UNREVIEWED: 33330, RETAIN_CONFIRMED: 59249, promoted: 7885 },
      actual: { UNREVIEWED: EXPECTED_UNREVIEWED_AFTER, RETAIN_CONFIRMED: EXPECTED_RC_AFTER, promoted: ACTUAL_PROMOTED },
    },
  },
  pre_flight: {
    all_unreviewed: ACTUAL_PROMOTED,
    all_bible_data_match: ACTUAL_PROMOTED,
    no_exception_overlap: true,
    g3708_extra5_excluded: true,
    result: 'PASS',
  },
  integrity: checks,
  state_delta: {
    UNREVIEWED:        { before: 41215, after: EXPECTED_UNREVIEWED_AFTER, delta: -ACTUAL_PROMOTED },
    RETAIN_CONFIRMED:  { before: 51364, after: EXPECTED_RC_AFTER,         delta: +ACTUAL_PROMOTED },
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
    PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1_phase4aq:    ACTUAL_PROMOTED,
    total: EXPECTED_RC_AFTER,
  },
  protected_tokens: {
    exception_risk_439: { count: 439, state: 'UNREVIEWED' },
    g3708_vrap_extra_5: {
      count: 5,
      refs: [...G3708_VRAP_EXTRA].map(ref => {
        const t = ap.tokens.find(x => x.ref === ref);
        return { ref, morph: t?.cur_morph, japanese: t?.cur_japanese };
      }),
      state: 'UNREVIEWED',
    },
  },
  strong_summary: strongSummary,
  tokens: reclassified,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4aq-reclassification.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4aq-reclassification.json');

fs.writeFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), JSON.stringify(ag, null, 2));
console.log('Updated stage4-phase4ag-residual-inventory.json');
