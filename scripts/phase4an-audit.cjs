'use strict';
const fs = require('fs'), path = require('path');

const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// ---- Load sources ----
const ah = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ah-unreviewed-breakdown.json'), 'utf8'));
const e4 = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4e-tier1-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));

// ---- Build Phase 4e detail map ----
const e4Map = new Map();
const e4StrongMeta = new Map();
for (const [, s] of Object.entries(e4.strongs)) {
  if (!s.strong) continue;
  e4StrongMeta.set(s.strong, {
    lexMeaning: s.lexMeaning,
    tier: s.tier,
    populationTotal: s.populationTotal,
    sampledCount: s.sampledCount,
    zoneAllocation: s.zoneAllocation,
  });
  for (const t of (s.tokens || [])) {
    e4Map.set(t.ref, {
      strong: s.strong,
      lexMeaning: s.lexMeaning,
      greekForm: t.greekForm,
      lemma: t.lemma,
      morph: t.morph,
      morphGroup: t.morphGroup,
      zone: t.zone,
      japanese: t.japanese,
      english: t.english || '',
      gloss: t.gloss || '',
      judgment: t.judgment,
      confidence: t.confidence,
      note: t.note || '',
    });
  }
}
console.log('Phase 4e refs loaded:', e4Map.size);

// ---- Phase 4ag state map ----
const agStateMap = new Map(ag.tokens.map(t => [t.ref, { state: t.state, phase: t.phase }]));

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
// Tier 1 SAMPLED_TOKEN: refs in Phase 4ah with audit_evidence=SAMPLED_TOKEN AND tier=1
const ahTargets = ah.tokens.filter(t => t.tier === 1 && t.audit_evidence === 'SAMPLED_TOKEN');
console.log('Phase 4ah Tier 1 SAMPLED_TOKEN:', ahTargets.length);

// Verify all still UNREVIEWED in current Phase 4ag
let unreviewedCount = 0;
const notUnreviewed = [];
for (const t of ahTargets) {
  const st = agStateMap.get(t.ref);
  if (st && st.state === 'UNREVIEWED') unreviewedCount++;
  else notUnreviewed.push({ ref: t.ref, state: st ? st.state : 'missing' });
}
console.log('All UNREVIEWED in Phase 4ag:', unreviewedCount, '/ Not UNREVIEWED:', notUnreviewed.length);
if (notUnreviewed.length) console.log('Not UNREVIEWED:', JSON.stringify(notUnreviewed));

// ---- Main audit loop ----
const auditTokens = [];
let directlyConfirmedOk = 0;
let directlyConfirmedHold = 0;
let evidenceMismatch = 0;
let notFoundInPhase4e = 0;
let alreadyClassifiedElsewhere = 0;

const byStrong = {};

for (const target of ahTargets) {
  const e4Entry = e4Map.get(target.ref);
  const bt = getTok(target.ref);

  // Check Phase 4e membership
  if (!e4Entry) {
    auditTokens.push({
      ref: target.ref,
      strong: target.strong,
      verdict: 'NOT_FOUND_IN_PHASE4E',
      basis: 'PHASE4E_RECORD_MISSING',
      note: 'No Phase 4e record found — not in Tier 1 sample',
      e4_judgment: null,
      e4_japanese: null,
      cur_japanese: bt ? bt.japanese : null,
      ja_match: null,
      strong_match: null,
      morph_match: null,
    });
    notFoundInPhase4e++;
    continue;
  }

  if (!bt) {
    auditTokens.push({
      ref: target.ref,
      strong: target.strong,
      verdict: 'EVIDENCE_MISMATCH',
      basis: 'NOT_IN_BIBLE_DATA',
      note: 'bible_data lookup failed',
      e4_judgment: e4Entry.judgment,
      e4_japanese: e4Entry.japanese,
      cur_japanese: null,
      ja_match: null,
      strong_match: null,
      morph_match: null,
    });
    evidenceMismatch++;
    continue;
  }

  // Cross-reference checks
  const strongMatch = bt.strong === e4Entry.strong;
  const jaMatch = bt.japanese === e4Entry.japanese;
  const morphMatch = bt.morph === e4Entry.morph;

  // Update Strong stats
  if (!byStrong[e4Entry.strong]) {
    byStrong[e4Entry.strong] = { count: 0, ok: 0, hold: 0, mismatch: 0, morph_set: new Set(), ja_set: new Set() };
  }
  byStrong[e4Entry.strong].count++;
  byStrong[e4Entry.strong].morph_set.add(bt.morph);
  byStrong[e4Entry.strong].ja_set.add(bt.japanese);

  let verdict, basis, note;

  if (!strongMatch) {
    verdict = 'EVIDENCE_MISMATCH';
    basis = 'STRONG_MISMATCH';
    note = `Phase 4e strong: ${e4Entry.strong}, bible_data strong: ${bt.strong}`;
    byStrong[e4Entry.strong].mismatch++;
    evidenceMismatch++;
  } else if (!jaMatch) {
    verdict = 'EVIDENCE_MISMATCH';
    basis = 'JAPANESE_CHANGED_SINCE_PHASE4E';
    note = `Phase 4e ja: [${e4Entry.japanese}] → current bible_data: [${bt.japanese}]`;
    byStrong[e4Entry.strong].mismatch++;
    evidenceMismatch++;
  } else if (!morphMatch) {
    verdict = 'EVIDENCE_MISMATCH';
    basis = 'MORPH_MISMATCH';
    note = `Phase 4e morph: ${e4Entry.morph}, bible_data morph: ${bt.morph}`;
    byStrong[e4Entry.strong].mismatch++;
    evidenceMismatch++;
  } else if (e4Entry.judgment === 'CONTEXT_DEPENDENT') {
    verdict = 'DIRECTLY_CONFIRMED_HOLD';
    basis = 'PHASE4E_CONTEXT_DEPENDENT';
    note = e4Entry.note || 'Phase 4e judgment=CONTEXT_DEPENDENT — requires design decision';
    byStrong[e4Entry.strong].hold++;
    directlyConfirmedHold++;
  } else if (e4Entry.judgment === 'CONFIRMED_OK') {
    verdict = 'DIRECTLY_CONFIRMED_OK';
    basis = 'PHASE4E_DIRECTLY_SAMPLED_OK';
    note = e4Entry.note || '';
    byStrong[e4Entry.strong].ok++;
    directlyConfirmedOk++;
  } else {
    // Should not happen — REVISION_CANDIDATE/HOLD should be in Phase 4ag IMPLEMENTED_AND_VERIFIED or HOLD state
    verdict = 'ALREADY_CLASSIFIED_ELSEWHERE';
    basis = 'PHASE4E_NON_OK_VERDICT';
    note = `Phase 4e judgment=${e4Entry.judgment} — expected in IMPL/HOLD, not UNREVIEWED`;
    alreadyClassifiedElsewhere++;
  }

  auditTokens.push({
    ref: bt.ref,
    book: bt.book,
    chapter: bt.chapter,
    verse: bt.verse,
    tokenIndex: bt.tokenIndex,
    strong: bt.strong,
    lemma: e4Entry.lemma,
    greekForm: e4Entry.greekForm,
    morph: bt.morph,
    morphGroup: e4Entry.morphGroup,
    zone: e4Entry.zone,
    japanese: bt.japanese,
    english: e4Entry.english,
    e4_judgment: e4Entry.judgment,
    e4_confidence: e4Entry.confidence,
    e4_japanese: e4Entry.japanese,
    ja_match: jaMatch,
    strong_match: strongMatch,
    morph_match: morphMatch,
    verdict,
    basis,
    note,
  });
}

console.log('Total:', auditTokens.length,
  '/ DIRECTLY_CONFIRMED_OK:', directlyConfirmedOk,
  '/ DIRECTLY_CONFIRMED_HOLD:', directlyConfirmedHold,
  '/ EVIDENCE_MISMATCH:', evidenceMismatch,
  '/ NOT_FOUND_IN_PHASE4E:', notFoundInPhase4e,
  '/ ALREADY_CLASSIFIED_ELSEWHERE:', alreadyClassifiedElsewhere);

// ---- Build strong summary ----
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([strong, s]) => {
    const sp = e4StrongMeta.get(strong) || {};
    return {
      strong,
      lex_meaning: sp.lexMeaning || '',
      tier: sp.tier || 1,
      phase4an_count: s.count,
      directly_confirmed_ok: s.ok,
      directly_confirmed_hold: s.hold,
      evidence_mismatch: s.mismatch,
      distinct_japanese: [...s.ja_set],
      morph_count: s.morph_set.size,
      phase4e_population_total: sp.populationTotal || 0,
      phase4e_sampled_count: sp.sampledCount || 0,
      zone_allocation: sp.zoneAllocation || {},
    };
  });

// ---- Population reconciliation ----
// 400 total Phase 4e sampled − 376 target = 24
// 24 = 18 IMPLEMENTED_AND_VERIFIED (REVISION_CANDIDATE) + 6 HOLD (HOLD state)
const phase4eTotal = 400;
const phase4eTierCount = ahTargets.length; // 376
const accounted = phase4eTotal - phase4eTierCount; // 24
// Cross-check: how many Phase 4e refs have non-UNREVIEWED state in Phase 4ag
const e4AllRefs = [...e4Map.keys()];
const e4InAg = e4AllRefs.map(ref => ({ ref, state: agStateMap.get(ref)?.state || 'missing' }));
const e4ByState = {};
for (const r of e4InAg) e4ByState[r.state] = (e4ByState[r.state] || 0) + 1;
console.log('Phase 4e refs in Phase 4ag by state:', JSON.stringify(e4ByState));

// ---- Integrity checks ----
const totalCheck = auditTokens.length;
const dupCheck = new Set(auditTokens.map(t => t.ref)).size;
const integrityChecks = {
  total_376: { expected: 376, actual: totalCheck, pass: totalCheck === 376 },
  no_duplicates: { expected: 376, actual: dupCheck, pass: dupCheck === 376 },
  all_in_phase4e: { expected: 376, actual: directlyConfirmedOk + directlyConfirmedHold + evidenceMismatch + alreadyClassifiedElsewhere, pass: notFoundInPhase4e === 0 },
  directly_confirmed_ok: { expected: 375, actual: directlyConfirmedOk, pass: directlyConfirmedOk === 375 },
  directly_confirmed_hold: { expected: 1, actual: directlyConfirmedHold, pass: directlyConfirmedHold === 1 },
  evidence_mismatch: { expected: 0, actual: evidenceMismatch, pass: evidenceMismatch === 0 },
  not_found: { expected: 0, actual: notFoundInPhase4e, pass: notFoundInPhase4e === 0 },
  already_classified: { expected: 0, actual: alreadyClassifiedElsewhere, pass: alreadyClassifiedElsewhere === 0 },
  all_unreviewed_before: { expected: 376, actual: unreviewedCount, pass: unreviewedCount === 376 },
};
const allPass = Object.values(integrityChecks).every(c => c.pass === true);
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(integrityChecks)) if (!v.pass) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);

// Overall verdict
const overallVerdict = (evidenceMismatch === 0 && notFoundInPhase4e === 0 && alreadyClassifiedElsewhere === 0 && directlyConfirmedHold === 1 && directlyConfirmedOk === 375)
  ? 'CONDITIONAL PASS'
  : (allPass ? 'PASS' : 'FAIL');
console.log('Overall verdict:', overallVerdict);

// ---- Write audit JSON ----
const outJson = {
  meta: {
    phase: '4an',
    date: '2026-11-04',
    description: 'Tier 1 SAMPLED_TOKEN 376件 Phase 4e 直接サンプル照合監査',
    source_phase4ah: 'stage4-phase4ah-unreviewed-breakdown.json',
    source_phase4e: 'stage4-phase4e-tier1-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    readonly: true,
    target_description: 'Group A / Tier 1 / audit_evidence=SAMPLED_TOKEN — Phase 4e直接サンプリングref',
  },
  population: {
    total: 376,
    tier: 1,
    group: 'A',
    audit_evidence: 'SAMPLED_TOKEN',
    distinct_strongs: strongSummary.length,
    derivation: 'Phase 4ah Tier 1 SAMPLED_TOKEN: 786 SAMPLED_TOKEN総数 − 410 Tier 2 = 376 Tier 1。Phase 4am後も全件UNREVIEWED確認。',
    population_reconciliation: {
      phase4e_total_sampled: phase4eTotal,
      phase4an_target: phase4eTierCount,
      accounted_for: accounted,
      accounted_detail: {
        IMPLEMENTED_AND_VERIFIED: 18,
        HOLD_STATE: 6,
        total: 24,
      },
      phase4e_state_distribution_in_phase4ag: e4ByState,
    },
  },
  integrity: integrityChecks,
  overall_verdict: overallVerdict,
  verdict_summary: {
    DIRECTLY_CONFIRMED_OK: directlyConfirmedOk,
    DIRECTLY_CONFIRMED_HOLD: directlyConfirmedHold,
    EVIDENCE_MISMATCH: evidenceMismatch,
    NOT_FOUND_IN_PHASE4E: notFoundInPhase4e,
    ALREADY_CLASSIFIED_ELSEWHERE: alreadyClassifiedElsewhere,
    total: totalCheck,
  },
  strong_summary: strongSummary,
  tokens: auditTokens,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4an-tier1-sampled-token-audit.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4an-tier1-sampled-token-audit.json');
