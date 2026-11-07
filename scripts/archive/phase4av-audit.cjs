'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

console.log('=== Phase 4av — Inventory Reconciliation Audit ===\n');

// === 1. Load Phase 4ag inventory (the unchanged source of truth) ===
console.log('--- Loading Phase 4ag inventory ---');
const ag = loadJson(path.join(OUT, 'stage4-phase4ag-residual-inventory.json'));
const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));
const agTokenMap  = new Map(ag.tokens.map(t => [t.ref, t]));

const agCounts = {};
ag.tokens.forEach(t => agCounts[t.state] = (agCounts[t.state]||0)+1);
console.log('  Total:', ag.tokens.length);
console.log('  States:', JSON.stringify(agCounts));

if (ag.tokens.length !== 92952) {
  console.error('FATAL: inventory total != 92,952:', ag.tokens.length);
  process.exit(1);
}

// V1: ref uniqueness
const agRefs = new Set(ag.tokens.map(t => t.ref));
if (agRefs.size !== ag.tokens.length) {
  console.error('FATAL: duplicate refs in inventory:', ag.tokens.length - agRefs.size);
  process.exit(1);
}
console.log('  V1 ref uniqueness: PASS (92,952 unique refs)');

// === 2. Load bible_data ref set for V2 ===
console.log('\n--- Loading bible_data ref set ---');
const bibleTokenMap = new Map();
const books = fs.readdirSync(BIBLE);
let bibleTotal = 0;
for (const book of books) {
  const bookDir = path.join(BIBLE, book);
  if (!fs.statSync(bookDir).isDirectory()) continue;
  const chapters = fs.readdirSync(bookDir).filter(f => f.endsWith('.json'));
  for (const ch of chapters) {
    const data = loadJson(path.join(bookDir, ch));
    for (const t of data) {
      bibleTokenMap.set(t.ref, { strong: t.strong, morph: t.morph, japanese: t.japanese, text: t.text });
      bibleTotal++;
    }
  }
}
console.log('  bible_data tokens loaded:', bibleTotal);

// V2: inventory refs vs bible_data
let v2_notInBible = 0;
for (const ref of agRefs) {
  if (!bibleTokenMap.has(ref)) v2_notInBible++;
}
console.log('  V2 inventory refs in bible_data:', agRefs.size - v2_notInBible + '/' + agRefs.size, v2_notInBible > 0 ? '(MISMATCH: ' + v2_notInBible + ')' : '(PASS)');

// === 3. Collect proposed state changes from each Phase ===
console.log('\n--- Collecting Phase proposals ---');

// Accumulate proposed changes: ref → { new_state, basis, source }
const proposed = new Map(); // ref → proposal
const conflicts = [];
const errors = [];

function addProposal(ref, new_state, basis, source, extra = {}) {
  const cur = agStateMap.get(ref);
  if (!cur) {
    errors.push({ type: 'REF_NOT_IN_INVENTORY', ref, source });
    return;
  }
  if (proposed.has(ref)) {
    const existing = proposed.get(ref);
    if (existing.new_state !== new_state) {
      conflicts.push({ ref, existing, challenger: { new_state, basis, source } });
    }
    return; // keep first
  }
  proposed.set(ref, { ref, cur_state: cur, new_state, basis, source, ...extra });
}

// --- Phase 4ai: 196 UNREVIEWED → RETAIN_CONFIRMED ---
const ai = loadJson(path.join(OUT, 'stage4-phase4ai-reclassification.json'));
let ai_ok = 0, ai_skip = 0;
for (const t of (ai.tokens || [])) {
  if (agStateMap.get(t.ref) === 'UNREVIEWED') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AI_TIER2_RECLASSIFICATION', 'phase4ai-reclassification.json');
    ai_ok++;
  } else { ai_skip++; }
}
console.log('  Phase 4ai: added=' + ai_ok + ', skipped(already non-UNREVIEWED)=' + ai_skip);

// --- Phase 4ak: 4158 UNREVIEWED → RETAIN_CONFIRMED ---
const ak = loadJson(path.join(OUT, 'stage4-phase4ak-reclassification.json'));
let ak_ok = 0, ak_skip = 0;
for (const t of (ak.tokens || [])) {
  if (agStateMap.get(t.ref) === 'UNREVIEWED') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AK_RECLASSIFICATION', 'phase4ak-reclassification.json');
    ak_ok++;
  } else { ak_skip++; }
}
console.log('  Phase 4ak: added=' + ak_ok + ', skipped=' + ak_skip);

// --- Phase 4am: 410 UNREVIEWED → RETAIN_CONFIRMED ---
const am = loadJson(path.join(OUT, 'stage4-phase4am-reclassification.json'));
let am_ok = 0, am_skip = 0;
for (const t of (am.tokens || [])) {
  if (agStateMap.get(t.ref) === 'UNREVIEWED') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AM_RECLASSIFICATION', 'phase4am-reclassification.json');
    am_ok++;
  } else { am_skip++; }
}
console.log('  Phase 4am: added=' + am_ok + ', skipped=' + am_skip);

// --- Phase 4ao: 375 UNREVIEWED → RETAIN_CONFIRMED ---
const ao = loadJson(path.join(OUT, 'stage4-phase4ao-reclassification.json'));
let ao_ok = 0, ao_skip = 0;
for (const t of (ao.tokens || [])) {
  if (agStateMap.get(t.ref) === 'UNREVIEWED') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AO_RECLASSIFICATION', 'phase4ao-reclassification.json');
    ao_ok++;
  } else { ao_skip++; }
}
console.log('  Phase 4ao: added=' + ao_ok + ', skipped=' + ao_skip);

// --- Phase 4aq: 7880 UNREVIEWED → RETAIN_CONFIRMED (STRONG_CONSISTENT_SAMPLE_SUPPORTED) ---
const aq = loadJson(path.join(OUT, 'stage4-phase4aq-reclassification.json'));
let aq_ok = 0, aq_skip = 0;
for (const t of (aq.tokens || [])) {
  if (agStateMap.get(t.ref) === 'UNREVIEWED') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AQ_TIER1_INFERRED_SAMPLE_SUPPORTED', 'phase4aq-reclassification.json');
    aq_ok++;
  } else { aq_skip++; }
}
console.log('  Phase 4aq: added=' + aq_ok + ', skipped=' + aq_skip);

// --- Phase 4ar + 4as: G3762 95 tokens ---
// APPROVE_NANIMO 93 → IMPLEMENTED_AND_VERIFIED (already changed in bible_data)
// RETAIN_DAREMO 1 (LUK 4:26!3) → RETAIN_CONFIRMED
// CONTEXT_DEPENDENT 1 (PHP 4:15!15) → HOLD_CONTEXT
const ar = loadJson(path.join(OUT, 'stage4-phase4ar-g3762-audit.json'));
const as_ = loadJson(path.join(OUT, 'stage4-phase4as-token-diff.json'));
const asRefs = new Set(as_.tokens.map(t => t.ref));

let ar_impl = 0, ar_rc = 0, ar_hold = 0;
for (const t of (ar.tokens || [])) {
  if (t.verdict === 'APPROVE_NANIMO') {
    // Verify it's in the Phase 4as token-diff
    if (asRefs.has(t.ref)) {
      addProposal(t.ref, 'IMPLEMENTED_AND_VERIFIED', 'PHASE4AR_APPROVE_NANIMO_IMPLEMENTED_PHASE4AS', 'phase4as-token-diff.json', { gloss: '何も〜ない' });
      ar_impl++;
    } else {
      errors.push({ type: 'AS_MISSING', ref: t.ref, msg: 'APPROVE_NANIMO not found in Phase 4as token-diff' });
    }
  } else if (t.verdict === 'RETAIN_DAREMO') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AR_RETAIN_DAREMO_INDIVIDUALLY_CONFIRMED', 'phase4ar-g3762-audit.json');
    ar_rc++;
  } else if (t.verdict === 'CONTEXT_DEPENDENT') {
    addProposal(t.ref, 'HOLD_CONTEXT', 'PHASE4AR_CONTEXT_DEPENDENT', 'phase4ar-g3762-audit.json', { note: 'ἐκκλησία feminine: 誰も vs 何も design decision pending' });
    ar_hold++;
  }
}
console.log('  Phase 4ar/4as (G3762): IMPL=' + ar_impl + ', RC=' + ar_rc + ', HOLD_CTX=' + ar_hold);

// --- Phase 4at + 4au: G3056 N-ASM 123 tokens ---
// RETAIN_KOTOBA 116 → RETAIN_CONFIRMED
// APPROVE_MOSHIHIRAKI 6 → IMPLEMENTED_AND_VERIFIED
// APPROVE_OTHER_GLOSS 1 → IMPLEMENTED_AND_VERIFIED
const at = loadJson(path.join(OUT, 'stage4-phase4at-g3056-audit.json'));
const auTD = loadJson(path.join(OUT, 'stage4-phase4au-token-diff.json'));
const auRefs = new Set(auTD.tokens.map(t => t.ref));

let at_rc = 0, at_impl = 0;
for (const t of (at.tokens || [])) {
  if (t.verdict === 'RETAIN_KOTOBA') {
    addProposal(t.ref, 'RETAIN_CONFIRMED', 'PHASE4AT_RETAIN_KOTOBA_INDIVIDUALLY_CONFIRMED', 'phase4at-g3056-audit.json');
    at_rc++;
  } else if (t.verdict === 'APPROVE_MOSHIHIRAKI' || t.verdict === 'APPROVE_OTHER_GLOSS') {
    if (auRefs.has(t.ref)) {
      addProposal(t.ref, 'IMPLEMENTED_AND_VERIFIED', 'PHASE4AT_APPROVED_IMPLEMENTED_PHASE4AU', 'phase4au-token-diff.json', { gloss: t.gloss });
      at_impl++;
    } else {
      errors.push({ type: 'AU_MISSING', ref: t.ref, msg: 'APPROVE not found in Phase 4au token-diff' });
    }
  }
}
console.log('  Phase 4at/4au (G3056): RC=' + at_rc + ', IMPL=' + at_impl);

// === 4. Build proposed state counts ===
console.log('\n--- Building proposed state counts ---');

// Start from current states
const newStateCounts = { ...agCounts };
const proposalList = [...proposed.values()];

for (const p of proposalList) {
  if (p.cur_state !== p.new_state) {
    newStateCounts[p.cur_state]--;
    newStateCounts[p.new_state] = (newStateCounts[p.new_state] || 0) + 1;
  }
}

const newTotal = Object.values(newStateCounts).reduce((a,b) => a+b, 0);
console.log('  Current states:', JSON.stringify(agCounts));
console.log('  Proposed states:', JSON.stringify(newStateCounts));
console.log('  Total (must = 92,952):', newTotal, newTotal === 92952 ? '✓' : '✗ MISMATCH');

// === 5. Verify proposed changes are correct ===
console.log('\n--- Verifying proposals ---');

// V3: All IMPLEMENT proposals should have matching bible_data japanese
let v3_pass = 0, v3_fail = 0;
const v3_failures = [];
for (const p of proposalList) {
  if (p.new_state === 'IMPLEMENTED_AND_VERIFIED') {
    const bib = bibleTokenMap.get(p.ref);
    if (!bib) {
      v3_failures.push({ ref: p.ref, issue: 'NOT_IN_BIBLE' });
      v3_fail++;
      continue;
    }
    // The japanese should NOT be the original UNREVIEWED value anymore
    const agTok = agTokenMap.get(p.ref);
    if (bib.japanese === agTok?.japanese) {
      v3_failures.push({ ref: p.ref, issue: 'BIBLE_JAPANESE_UNCHANGED', agJa: agTok?.japanese, bibJa: bib.japanese });
      v3_fail++;
    } else {
      v3_pass++;
    }
  }
}
console.log('  V3 IMPL tokens have changed japanese: ' + v3_pass + ' PASS, ' + v3_fail + ' FAIL');
if (v3_failures.length) console.log('    failures:', JSON.stringify(v3_failures.slice(0,5)));

// V4: All RETAIN_CONFIRMED proposals were UNREVIEWED (or already RC - no downgrade)
let v4_ok = 0, v4_warn = 0;
for (const p of proposalList) {
  if (p.new_state === 'RETAIN_CONFIRMED') {
    if (p.cur_state === 'UNREVIEWED' || p.cur_state === 'RETAIN_CONFIRMED') v4_ok++;
    else { v4_warn++; console.log('    V4 WARN: RC proposal for non-UNREVIEWED:', p.ref, p.cur_state); }
  }
}
console.log('  V4 RC proposals from UNREVIEWED/RC only:', v4_ok, '(warnings:', v4_warn + ')');

// V5: HOLD_CONTEXT proposals
const holdCtxProposals = proposalList.filter(p => p.new_state === 'HOLD_CONTEXT');
console.log('  V5 HOLD_CONTEXT proposals:', holdCtxProposals.length, holdCtxProposals.map(p=>p.ref).join(', '));

// V6: Conflicts and errors
console.log('  V6 conflicts:', conflicts.length);
console.log('  V6 errors:', errors.length);
if (errors.length) errors.forEach(e => console.log('    ERROR:', JSON.stringify(e)));
if (conflicts.length) conflicts.forEach(c => console.log('    CONFLICT:', JSON.stringify(c)));

// === 6. Check existing HOLD_DATA_QUALITY and HOLD_CONTEXT ===
console.log('\n--- Checking existing holds ---');
const holdDQ = ag.tokens.filter(t => t.state === 'HOLD_DATA_QUALITY');
const holdCtx = ag.tokens.filter(t => t.state === 'HOLD_CONTEXT');
console.log('  HOLD_DATA_QUALITY:', holdDQ.length, 'refs:', holdDQ.map(t=>t.ref).join(', '));
console.log('  HOLD_CONTEXT:', holdCtx.length, 'refs:', holdCtx.map(t=>t.ref).join(', '));

// === 7. Identify tokens in UNREVIEWED that are NOT covered by any proposal ===
console.log('\n--- Remaining UNREVIEWED after proposals ---');
let remainingUnreviewed = 0;
const remainingRefs = [];
for (const t of ag.tokens) {
  if (t.state === 'UNREVIEWED') {
    if (!proposed.has(t.ref)) {
      remainingUnreviewed++;
      if (remainingRefs.length < 10) remainingRefs.push(t.ref);
    }
  }
}
console.log('  Remaining UNREVIEWED (not covered):', remainingUnreviewed);
if (remainingRefs.length) console.log('  Sample:', remainingRefs.join(', '));

// What is proposed UNREVIEWED count?
const proposedUNREVIEWED = newStateCounts['UNREVIEWED'] || 0;
console.log('  Proposed UNREVIEWED after:', proposedUNREVIEWED);

// === 8. Phase 4ap EXCEPTION_RISK check ===
console.log('\n--- Phase 4ap exception_risk tokens ---');
const ap = loadJson(path.join(OUT, 'stage4-phase4ap-tier1-inferred-audit.json'));
const exceptionRisk = (ap.tokens || []).filter(t => t.verdict === 'STRONG_CONSISTENT_BUT_EXCEPTION_RISK');
console.log('  exception_risk total:', exceptionRisk.length);

// Of these, which are covered by proposals?
const exByStrong = {};
exceptionRisk.forEach(t => { exByStrong[t.strong] = (exByStrong[t.strong]||0)+1; });
// Key exceptions: G3762, G3056, G3708, G4183, G2983, G4160
const keyStrongs = ['G3762','G3056','G3708','G4183','G2983','G4160'];
keyStrongs.forEach(s => { if (exByStrong[s]) console.log('    ' + s + ': ' + exByStrong[s]); });
const covered = exceptionRisk.filter(t => proposed.has(t.ref)).length;
const uncovered = exceptionRisk.filter(t => !proposed.has(t.ref)).length;
console.log('  covered by proposals:', covered, '/ uncovered:', uncovered);

// G3762 specific
const g3762ex = exceptionRisk.filter(t => t.strong === 'G3762');
const g3762covered = g3762ex.filter(t => proposed.has(t.ref));
const g3762uncovered = g3762ex.filter(t => !proposed.has(t.ref));
console.log('  G3762 exception_risk: total=' + g3762ex.length + ', covered=' + g3762covered.length + ', uncovered=' + g3762uncovered.length);
if (g3762uncovered.length) {
  console.log('  G3762 uncovered morphs:', [...new Set(g3762uncovered.map(t=>t.morph))].join(', '));
}

// G3056 specific
const g3056ex = exceptionRisk.filter(t => t.strong === 'G3056');
const g3056covered = g3056ex.filter(t => proposed.has(t.ref));
const g3056uncovered = g3056ex.filter(t => !proposed.has(t.ref));
console.log('  G3056 exception_risk: total=' + g3056ex.length + ', covered=' + g3056covered.length + ', uncovered=' + g3056uncovered.length);
if (g3056uncovered.length) {
  const morphDist = {};
  g3056uncovered.forEach(t => morphDist[t.morph] = (morphDist[t.morph]||0)+1);
  console.log('  G3056 uncovered morphs:', JSON.stringify(morphDist));
}

// === 9. Write deliverables ===
console.log('\n--- Writing deliverables ---');

// Sort proposals by ref
proposalList.sort((a,b) => a.ref.localeCompare(b.ref));

// Count by source Phase
const bySource = {};
proposalList.forEach(p => { bySource[p.source] = (bySource[p.source]||0)+1; });

// Count actual state changes (exclude no-ops)
const actualChanges = proposalList.filter(p => p.cur_state !== p.new_state);

// === Audit JSON ===
const auditJson = {
  meta: {
    phase: '4av',
    date: new Date().toISOString().slice(0,10),
    description: 'Stage 4 残余 inventory 全件整合性監査（READ-ONLY）',
    source_inventory: 'stage4-phase4ag-residual-inventory.json',
    total: ag.tokens.length
  },
  integrity: {
    total_92952: { expected: 92952, actual: ag.tokens.length, pass: ag.tokens.length === 92952 },
    ref_unique: { expected: 92952, actual: agRefs.size, pass: agRefs.size === 92952 },
    bible_ref_match: { inventory_refs: agRefs.size, not_in_bible: v2_notInBible, pass: v2_notInBible === 0 },
    total_preserved: { expected: 92952, actual: newTotal, pass: newTotal === 92952 }
  },
  current_states: agCounts,
  proposed_states: newStateCounts,
  proposal_summary: {
    total_proposals: proposalList.length,
    actual_state_changes: actualChanges.length,
    no_op: proposalList.length - actualChanges.length,
    by_source: bySource,
    by_new_state: Object.fromEntries(
      ['RETAIN_CONFIRMED','IMPLEMENTED_AND_VERIFIED','HOLD_CONTEXT','HOLD_DATA_QUALITY','UNREVIEWED']
        .map(s => [s, proposalList.filter(p=>p.new_state===s).length])
    )
  },
  errors: errors,
  conflicts: conflicts,
  verification: {
    V1_ref_unique: { pass: agRefs.size === 92952 },
    V2_bible_match: { pass: v2_notInBible === 0, not_in_bible: v2_notInBible },
    V3_impl_changed: { pass: v3_fail === 0, pass_count: v3_pass, fail_count: v3_fail, failures: v3_failures },
    V4_rc_from_unreviewed: { pass: v4_warn === 0, ok: v4_ok, warn: v4_warn },
    V5_hold_ctx: { count: holdCtxProposals.length, refs: holdCtxProposals.map(p=>p.ref) },
    V6_no_conflicts: { pass: conflicts.length === 0, count: conflicts.length },
    V6_no_errors: { pass: errors.length === 0, count: errors.length },
    V7_total_preserved: { pass: newTotal === 92952 }
  },
  unresolved_items: {
    remaining_unreviewed_after_proposals: remainingUnreviewed,
    exception_risk_uncovered: uncovered,
    exception_risk_detail: {
      G3762_masculine_uncovered: g3762uncovered.length,
      G3056_non_nasm_uncovered: g3056uncovered.length,
      other_exceptions: keyStrongs.filter(s=>s!=='G3762'&&s!=='G3056').map(s => ({ strong: s, count: exByStrong[s]||0, covered: exceptionRisk.filter(t=>t.strong===s&&proposed.has(t.ref)).length }))
    },
    hold_data_quality: { count: holdDQ.length, refs: holdDQ.map(t=>t.ref) },
    hold_context_existing: { count: holdCtx.length, refs: holdCtx.map(t=>t.ref) },
    php_4_15_15: { ref: 'PHP 4:15!15', current_state: agStateMap.get('PHP 4:15!15'), note: 'G3762 feminine ἐκκλησία: CONTEXT_DEPENDENT, L-0 decision needed' }
  }
};

saveJson(path.join(OUT, 'stage4-phase4av-inventory-reconciliation-audit.json'), auditJson);
console.log('  Wrote: stage4-phase4av-inventory-reconciliation-audit.json');

// === Proposed diff JSON ===
const proposedDiff = {
  meta: {
    phase: '4av',
    date: new Date().toISOString().slice(0,10),
    description: 'Proposed inventory state changes',
    total_proposed: proposalList.length,
    actual_changes: actualChanges.length
  },
  state_delta: {
    before: agCounts,
    after: newStateCounts,
    changes: {
      UNREVIEWED: (newStateCounts.UNREVIEWED||0) - (agCounts.UNREVIEWED||0),
      RETAIN_CONFIRMED: (newStateCounts.RETAIN_CONFIRMED||0) - (agCounts.RETAIN_CONFIRMED||0),
      IMPLEMENTED_AND_VERIFIED: (newStateCounts.IMPLEMENTED_AND_VERIFIED||0) - (agCounts.IMPLEMENTED_AND_VERIFIED||0),
      HOLD_CONTEXT: (newStateCounts.HOLD_CONTEXT||0) - (agCounts.HOLD_CONTEXT||0),
      HOLD_DATA_QUALITY: (newStateCounts.HOLD_DATA_QUALITY||0) - (agCounts.HOLD_DATA_QUALITY||0)
    }
  },
  diffs: actualChanges.map(p => ({
    ref: p.ref,
    from: p.cur_state,
    to: p.new_state,
    basis: p.basis,
    source: p.source,
    ...(p.gloss ? { gloss: p.gloss } : {}),
    ...(p.note ? { note: p.note } : {})
  }))
};
saveJson(path.join(OUT, 'stage4-phase4av-proposed-inventory-diff.json'), proposedDiff);
console.log('  Wrote: stage4-phase4av-proposed-inventory-diff.json');

// === Final summary ===
console.log('\n=== Phase 4av Summary ===');
console.log('Integrity: total=' + ag.tokens.length + ', refs=' + agRefs.size + ', bible_match=' + (v2_notInBible===0?'PASS':'FAIL'));
console.log('Proposals: ' + proposalList.length + ' total, ' + actualChanges.length + ' actual changes');
console.log('After state: UNREVIEWED=' + (newStateCounts.UNREVIEWED||0) + ', RC=' + (newStateCounts.RETAIN_CONFIRMED||0) + ', IMPL=' + (newStateCounts.IMPLEMENTED_AND_VERIFIED||0) + ', HOLD_CTX=' + (newStateCounts.HOLD_CONTEXT||0) + ', HOLD_DQ=' + (newStateCounts.HOLD_DATA_QUALITY||0));
console.log('Errors:', errors.length, '/ Conflicts:', conflicts.length);
console.log('Remaining UNREVIEWED (after proposals):', remainingUnreviewed);
console.log('Exception risk uncovered:', uncovered);
const allIntegrity = agRefs.size === 92952 && v2_notInBible === 0 && newTotal === 92952 && errors.length === 0 && conflicts.length === 0;
console.log('\nOverall audit integrity:', allIntegrity ? 'PASS' : 'FAIL');
