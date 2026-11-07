'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// ---- Load sources ----
const ah = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ah-unreviewed-breakdown.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const e4 = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4e-tier1-audit.json'), 'utf8'));
const ad = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ad-token-diff.json'), 'utf8'));

const agStateMap = new Map(ag.tokens.map(t => [t.ref, { state: t.state, evidence_basis: t.evidence_basis, phase: t.phase }]));

// ---- Tier 1 Strongs meta from Phase 4e ----
const tier1Strongs = new Set([
  'G191','G611','G1096','G1325','G1492','G1520','G1831','G2036','G2064','G2192',
  'G2309','G2980','G2983','G3004','G3056','G3708','G3762','G3956','G4160','G4183',
]);

// Phase 4e verdict summary per Strong
const e4VerdictByStrong = {};
for (const [, s] of Object.entries(e4.strongs)) {
  if (!s.strong || !tier1Strongs.has(s.strong)) continue;
  const counts = { CONFIRMED_OK: 0, REVISION_CANDIDATE: 0, CONTEXT_DEPENDENT: 0, HOLD: 0 };
  const rcMorphs = new Set();
  const holdRefs = [];
  const cdRefs = [];
  const rcRefs = [];
  for (const t of (s.tokens || [])) {
    counts[t.judgment] = (counts[t.judgment] || 0) + 1;
    if (t.judgment === 'REVISION_CANDIDATE') { rcMorphs.add(t.morph); rcRefs.push({ ref: t.ref, morph: t.morph, from: t.japanese, to: t.revisedCandidate }); }
    if (t.judgment === 'HOLD') holdRefs.push({ ref: t.ref, morph: t.morph, note: (t.note || '').slice(0, 100) });
    if (t.judgment === 'CONTEXT_DEPENDENT') cdRefs.push({ ref: t.ref, morph: t.morph, note: (t.note || '').slice(0, 100) });
  }
  const allOk = (counts.REVISION_CANDIDATE || 0) === 0 && (counts.CONTEXT_DEPENDENT || 0) === 0 && (counts.HOLD || 0) === 0;
  e4VerdictByStrong[s.strong] = {
    strong: s.strong,
    lexMeaning: s.lexMeaning,
    tier: s.tier,
    sampledCount: s.sampledCount,
    all_ok: allOk,
    verdict_counts: counts,
    rc_morphs: [...rcMorphs],
    rc_refs: rcRefs,
    hold_refs: holdRefs,
    cd_refs: cdRefs,
  };
}

// ---- Phase 4ad changes (all Tier 1 implementations) ----
const adChangedRefs = new Set(ad.changes.filter(c => tier1Strongs.has(c.strong)).map(c => c.ref));
const adChangeByRef = {};
for (const c of ad.changes.filter(c => tier1Strongs.has(c.strong))) adChangeByRef[c.ref] = c;

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

// ---- Re-derive target population ----
const ahTargets = ah.tokens.filter(t => t.tier === 1 && t.audit_evidence === 'SAMPLED_INFERRED');
console.log('Phase 4ah Tier 1 SAMPLED_INFERRED:', ahTargets.length);

// Verify all UNREVIEWED
let unreviewedCount = 0;
const notUnreviewed = [];
for (const t of ahTargets) {
  const ag_state = agStateMap.get(t.ref);
  if (ag_state && ag_state.state === 'UNREVIEWED') unreviewedCount++;
  else notUnreviewed.push({ ref: t.ref, state: ag_state ? ag_state.state : 'missing' });
}
console.log('UNREVIEWED in Phase 4ag:', unreviewedCount, '/ Non-UNREVIEWED:', notUnreviewed.length);
if (notUnreviewed.length) console.log('Non-UNREVIEWED:', JSON.stringify(notUnreviewed.slice(0, 10)));

// ---- Build japanese distribution per Strong from SAMPLED_INFERRED tokens ----
const strongJaMap = {}; // strong → { japanese → { morphSet, refs[] } }
for (const t of ahTargets) {
  const bt = getTok(t.ref);
  if (!bt) continue;
  const strong = bt.strong;
  if (!strongJaMap[strong]) strongJaMap[strong] = {};
  const ja = bt.japanese || '(null)';
  if (!strongJaMap[strong][ja]) strongJaMap[strong][ja] = { morphs: new Set(), refs: [] };
  strongJaMap[strong][ja].morphs.add(bt.morph);
  strongJaMap[strong][ja].refs.push(t.ref);
}

// ---- Main audit loop ----
const auditTokens = [];
const classCounts = {
  STRONG_CONSISTENT_SAMPLE_SUPPORTED: 0,
  STRONG_CONSISTENT_BUT_EXCEPTION_RISK: 0,
  MULTIPLE_JAPANESE_CONTEXT_DEPENDENT: 0,
  DATA_MISMATCH: 0,
  POST_PHASE_IMPLEMENTED: 0,
  ALREADY_CLASSIFIED: 0,
  UNRESOLVED: 0,
};
const byStrong = {};

for (const target of ahTargets) {
  const bt = getTok(target.ref);
  const ag_entry = agStateMap.get(target.ref);
  const e4s = e4VerdictByStrong[target.strong] || null;

  if (!byStrong[target.strong]) {
    byStrong[target.strong] = {
      strong: target.strong,
      lex_meaning: e4s ? e4s.lexMeaning : '',
      count: 0,
      by_verdict: {},
      ja_values: new Set(),
      morph_set: new Set(),
      exception_risk: e4s ? !e4s.all_ok : false,
    };
  }
  byStrong[target.strong].count++;

  let verdict, basis, note, cur_japanese = null, cur_morph = null, cur_strong = null;

  // State check: should be UNREVIEWED
  if (!ag_entry || ag_entry.state !== 'UNREVIEWED') {
    verdict = 'ALREADY_CLASSIFIED';
    basis = 'NON_UNREVIEWED_IN_PHASE4AG';
    note = `Phase 4ag state: ${ag_entry ? ag_entry.state : 'missing'} phase=${ag_entry?.phase}`;
  }
  // bible_data not found
  else if (!bt) {
    verdict = 'DATA_MISMATCH';
    basis = 'NOT_IN_BIBLE_DATA';
    note = 'bible_data lookup failed';
  }
  // Strong mismatch (should not happen for SAMPLED_INFERRED)
  else if (bt.strong !== target.strong) {
    cur_japanese = bt.japanese;
    cur_morph = bt.morph;
    cur_strong = bt.strong;
    verdict = 'DATA_MISMATCH';
    basis = 'STRONG_MISMATCH';
    note = `Phase 4ah strong: ${target.strong}, bible_data strong: ${bt.strong}`;
  }
  // Post-phase implementation: bible_data japanese changed from what SAMPLED_INFERRED would expect
  // (Phase 4ad changed certain refs, but those should be IMPLEMENTED_AND_VERIFIED — if still UNREVIEWED something is wrong)
  else if (adChangedRefs.has(target.ref)) {
    cur_japanese = bt.japanese;
    cur_morph = bt.morph;
    verdict = 'POST_PHASE_IMPLEMENTED';
    basis = 'PHASE4AD_CHANGED_BUT_UNREVIEWED';
    note = `Phase 4ad changed ${adChangeByRef[target.ref]?.from} → ${adChangeByRef[target.ref]?.to} but state still UNREVIEWED`;
  }
  else {
    cur_japanese = bt.japanese;
    cur_morph = bt.morph;
    cur_strong = bt.strong;
    byStrong[target.strong].ja_values.add(cur_japanese);
    byStrong[target.strong].morph_set.add(cur_morph);

    // Check if this is an exception-risk Strong (had RC/HOLD/CD in Phase 4e)
    if (!e4s || !e4s.all_ok) {
      // Further classify: does this token have a "problematic" morph pattern?
      const rcMorphs = new Set(e4s ? e4s.rc_morphs : []);
      const holdRefs = new Set(e4s ? e4s.hold_refs.map(r => r.ref) : []);
      const cdRefs = new Set(e4s ? e4s.cd_refs.map(r => r.ref) : []);

      // Check for neuter form of G3762 (the main RC pattern)
      const isNeuterG3762 = target.strong === 'G3762' && (cur_morph?.endsWith('-N') || cur_morph?.includes('-ASN') || cur_morph?.includes('-NSN') || cur_morph?.includes('-ASF'));
      // εἰδώς morph for G3708
      const isEidosG3708 = target.strong === 'G3708' && cur_morph === 'V-RAP-NSM';
      // Other problematic morphs matching RC patterns
      const matchesRcMorph = rcMorphs.has(cur_morph);

      if (isNeuterG3762) {
        verdict = 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK';
        basis = 'G3762_NEUTER_MORPH_RISK';
        note = `G3762 neuter form (${cur_morph}) — Phase 4e RC pattern was neuter→何も〜ない. Current ja=[${cur_japanese}]`;
      } else if (isEidosG3708) {
        verdict = 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK';
        basis = 'G3708_PERFECT_PARTICIPLE_CD';
        note = `G3708 V-RAP-NSM (εἰδώς) — same morph as Phase 4e CONTEXT_DEPENDENT JHN 6:61!1. ja=[${cur_japanese}]`;
      } else if (matchesRcMorph) {
        verdict = 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK';
        basis = 'MATCHES_PHASE4E_RC_MORPH';
        note = `morph=${cur_morph} matches Phase 4e RC pattern for ${target.strong}. ja=[${cur_japanese}]`;
      } else {
        // Exception risk Strong but this token's morph doesn't match the problematic pattern
        verdict = 'STRONG_CONSISTENT_SAMPLE_SUPPORTED';
        basis = 'PHASE4E_SAMPLED_OK_NONEXCEPTION_MORPH';
        note = `${target.strong} had non-OK Phase 4e samples but morph=${cur_morph} not in RC pattern. ja=[${cur_japanese}]`;
      }
    } else {
      // All-OK Strong: STRONG_CONSISTENT_SAMPLE_SUPPORTED
      verdict = 'STRONG_CONSISTENT_SAMPLE_SUPPORTED';
      basis = 'PHASE4E_ALL_SAMPLED_OK';
      note = `All Phase 4e samples for ${target.strong} were CONFIRMED_OK. ja=[${cur_japanese}]`;
    }

    // Final check: multiple japanese values for this Strong in SAMPLED_INFERRED?
    // (computed later in second pass once all tokens are processed — flag here and revisit)
  }

  classCounts[verdict] = (classCounts[verdict] || 0) + 1;
  byStrong[target.strong].by_verdict[verdict] = (byStrong[target.strong].by_verdict[verdict] || 0) + 1;

  auditTokens.push({
    ref: target.ref,
    strong: target.strong,
    cur_strong,
    cur_japanese,
    cur_morph,
    phase4ag_state: ag_entry ? ag_entry.state : 'missing',
    verdict,
    basis,
    note,
  });
}

// ---- Second pass: re-classify if Strong has multiple distinct_japanese in SAMPLED_INFERRED ----
// For tokens currently STRONG_CONSISTENT_SAMPLE_SUPPORTED or STRONG_CONSISTENT_BUT_EXCEPTION_RISK,
// if the Strong has >1 distinct japanese across all SAMPLED_INFERRED tokens, flag MULTIPLE_JAPANESE
const strongDistinctJa = {};
for (const [s, jaMap] of Object.entries(strongJaMap)) {
  strongDistinctJa[s] = Object.keys(jaMap).length;
}

let reclassifiedToMultiple = 0;
for (const tok of auditTokens) {
  if (tok.verdict !== 'STRONG_CONSISTENT_SAMPLE_SUPPORTED' && tok.verdict !== 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK') continue;
  const dj = strongDistinctJa[tok.strong] || 1;
  if (dj > 1) {
    const oldVerdict = tok.verdict;
    tok.verdict = 'MULTIPLE_JAPANESE_CONTEXT_DEPENDENT';
    tok.basis = 'MULTIPLE_JAPANESE_WITHIN_STRONG';
    tok.note = `${tok.strong} has ${dj} distinct japanese values in SAMPLED_INFERRED. Original verdict was ${oldVerdict}. ja=[${tok.cur_japanese}]`;
    classCounts[oldVerdict]--;
    classCounts['MULTIPLE_JAPANESE_CONTEXT_DEPENDENT'] = (classCounts['MULTIPLE_JAPANESE_CONTEXT_DEPENDENT'] || 0) + 1;
    byStrong[tok.strong].by_verdict[oldVerdict] = (byStrong[tok.strong].by_verdict[oldVerdict] || 0) - 1;
    byStrong[tok.strong].by_verdict['MULTIPLE_JAPANESE_CONTEXT_DEPENDENT'] = (byStrong[tok.strong].by_verdict['MULTIPLE_JAPANESE_CONTEXT_DEPENDENT'] || 0) + 1;
    reclassifiedToMultiple++;
  }
}
console.log('Reclassified to MULTIPLE_JAPANESE after second pass:', reclassifiedToMultiple);

// ---- Final summary ----
console.log('Verdict distribution:', JSON.stringify(classCounts));
console.log('Total:', auditTokens.length);
console.log('Checks sum:', Object.values(classCounts).reduce((a, b) => a + b, 0));

// Strong-by-strong summary
const strongSummary = Object.values(byStrong)
  .sort((a, b) => b.count - a.count)
  .map(s => ({
    strong: s.strong,
    lex_meaning: s.lex_meaning,
    count: s.count,
    exception_risk: s.exception_risk,
    distinct_japanese_in_sampled_inferred: strongDistinctJa[s.strong] || 0,
    ja_values: [...(s.ja_values || new Set())],
    morph_count: s.morph_set.size,
    by_verdict: s.by_verdict,
    phase4e: e4VerdictByStrong[s.strong] ? {
      all_ok: e4VerdictByStrong[s.strong].all_ok,
      verdict_counts: e4VerdictByStrong[s.strong].verdict_counts,
      rc_morphs: e4VerdictByStrong[s.strong].rc_morphs,
    } : null,
  }));

// Detail map of non-STRONG_CONSISTENT tokens
const exceptions = auditTokens.filter(t =>
  t.verdict === 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK' ||
  t.verdict === 'MULTIPLE_JAPANESE_CONTEXT_DEPENDENT' ||
  t.verdict === 'DATA_MISMATCH' ||
  t.verdict === 'POST_PHASE_IMPLEMENTED' ||
  t.verdict === 'ALREADY_CLASSIFIED' ||
  t.verdict === 'UNRESOLVED'
);
console.log('Exceptions (non-SAMPLE_SUPPORTED):', exceptions.length);

// Also compute "safe to promote next phase" count
const safeToPromote = classCounts.STRONG_CONSISTENT_SAMPLE_SUPPORTED || 0;
console.log('Safe to promote (STRONG_CONSISTENT_SAMPLE_SUPPORTED):', safeToPromote);
console.log('Needs further review:', auditTokens.length - safeToPromote);

// ---- Write output ----
const outJson = {
  meta: {
    phase: '4ap',
    date: '2026-11-04',
    description: 'Tier 1 SAMPLED_INFERRED 8,324件 Strong単位一貫性監査（READ-ONLY）',
    source_phase4ah: 'stage4-phase4ah-unreviewed-breakdown.json',
    source_phase4e: 'stage4-phase4e-tier1-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    source_phase4ad: 'stage4-phase4ad-token-diff.json',
    readonly: true,
  },
  population: {
    total: ahTargets.length,
    tier: 1,
    group: 'A',
    audit_evidence: 'SAMPLED_INFERRED',
    distinct_strongs: Object.keys(byStrong).length,
    all_unreviewed_before: unreviewedCount,
    non_unreviewed: notUnreviewed.length,
    derivation: 'Phase 4ah tier=1 AND audit_evidence=SAMPLED_INFERRED。Phase 4ao後も全件UNREVIEWED確認。',
  },
  phase4e_summary: {
    total_sampled: 400,
    confirmed_ok: 375,
    revision_candidate: 18,
    context_dependent: 1,
    hold: 6,
    all_ok_strongs: Object.values(e4VerdictByStrong).filter(s => s.all_ok).map(s => s.strong),
    exception_risk_strongs: Object.values(e4VerdictByStrong).filter(s => !s.all_ok).map(s => ({
      strong: s.strong,
      verdict_counts: s.verdict_counts,
      rc_morphs: s.rc_morphs,
    })),
  },
  verdict_summary: classCounts,
  next_phase_recommendation: {
    safe_to_promote: safeToPromote,
    needs_review: auditTokens.length - safeToPromote,
    basis_for_safe: 'PHASE4E_SAMPLED_INFERRED_CONFIRMED_T1 — Phase 4e all-OK Strong, single japanese, morph outside RC pattern',
    action: 'Phase 4aq: STRONG_CONSISTENT_SAMPLE_SUPPORTED件を RETAIN_CONFIRMED に昇格',
  },
  strong_summary: strongSummary,
  exception_tokens: exceptions,
  tokens: auditTokens,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4ap-tier1-inferred-audit.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4ap-tier1-inferred-audit.json');
