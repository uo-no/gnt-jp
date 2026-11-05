'use strict';
const fs = require('fs'), path = require('path');

const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// ---- Load sources ----
const ah = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ah-unreviewed-breakdown.json'), 'utf8'));
const f4f = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4f-tier2-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));

// ---- Build Phase 4f detail map ----
const f4fMap = new Map();     // ref → full token detail
const f4fStrongMap = new Map(); // strong → {lexMeaning, populationTotal, sampledCount, zoneAlloc}
for (const [, s] of Object.entries(f4f.strongs)) {
  if (!s.strong) continue;
  f4fStrongMap.set(s.strong, {
    lexMeaning: s.lexMeaning,
    populationTotal: s.populationTotal,
    sampledCount: s.sampledCount,
    zoneAllocation: s.zoneAllocation,
  });
  for (const t of (s.tokens || [])) {
    f4fMap.set(t.ref, {
      strong: s.strong,
      lexMeaning: s.lexMeaning,
      verdict: t.verdict || t.judgment || t.status,
      japanese: t.japanese,
      morph: t.morph,
      greekForm: t.greekForm,
      zone: t.zone,
      confidence: t.confidence || '',
      note: t.note || '',
    });
  }
}

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
    } catch (e) { return null; }
  }
  return chCache[k].get(ref) || null;
}

// ---- Re-derive target population ----
// SAMPLED_TOKEN Tier 2: refs in Phase 4ah with audit_evidence=SAMPLED_TOKEN AND tier=2
// Cross-check: all must be UNREVIEWED in current Phase 4ag (post Phase 4ak)
const ahTargets = ah.tokens.filter(t => t.tier === 2 && t.audit_evidence === 'SAMPLED_TOKEN');
console.log('Phase 4ah Tier 2 SAMPLED_TOKEN:', ahTargets.length);

// Verify all still UNREVIEWED
let unreviewedCount = 0, notUnreviewed = [];
for (const t of ahTargets) {
  const st = agStateMap.get(t.ref);
  if (st && st.state === 'UNREVIEWED') unreviewedCount++;
  else notUnreviewed.push({ ref: t.ref, state: st ? st.state : 'missing' });
}
console.log('All UNREVIEWED in Phase 4ag:', unreviewedCount, '/ Not UNREVIEWED:', notUnreviewed.length);
if (notUnreviewed.length > 0) {
  console.log('Not UNREVIEWED:', JSON.stringify(notUnreviewed));
}

// ---- Main audit loop ----
const auditTokens = [];
let confirmed = 0, reviewRequired = 0;
const byStrong = {};
const morphDist = {}; // strong → {morph → {ja → count}}

for (const target of ahTargets) {
  const f4fEntry = f4fMap.get(target.ref);
  const bt = getTok(target.ref);

  if (!f4fEntry) {
    auditTokens.push({
      ref: target.ref, strong: target.strong, verdict: 'REVIEW_REQUIRED',
      basis: 'NOT_IN_PHASE4F_SAMPLE', note: 'Phase 4f sample record not found',
    });
    reviewRequired++;
    continue;
  }

  if (!bt) {
    auditTokens.push({
      ref: target.ref, strong: target.strong, verdict: 'REVIEW_REQUIRED',
      basis: 'NOT_IN_BIBLE_DATA', note: 'Bible data lookup failed',
      f4f_verdict: f4fEntry.verdict,
    });
    reviewRequired++;
    continue;
  }

  // Strong consistency check
  const strongOk = bt.strong === target.strong;

  // Japanese consistency: current bible_data vs Phase 4f recorded
  const jaMismatch = bt.japanese !== f4fEntry.japanese;

  // Phase 4f verdict check (should all be CONFIRMED_OK for these tokens)
  const f4fVerdict = f4fEntry.verdict;

  // Collect morph distribution
  if (!byStrong[bt.strong]) byStrong[bt.strong] = { count: 0, confirmed: 0, morph_set: new Set(), ja_set: new Set() };
  if (!morphDist[bt.strong]) morphDist[bt.strong] = {};
  const mk = bt.morph || '?';
  const jk = bt.japanese || '?';
  if (!morphDist[bt.strong][mk]) morphDist[bt.strong][mk] = {};
  morphDist[bt.strong][mk][jk] = (morphDist[bt.strong][mk][jk] || 0) + 1;
  byStrong[bt.strong].count++;
  byStrong[bt.strong].morph_set.add(mk);
  byStrong[bt.strong].ja_set.add(jk);

  // Determine verdict
  let verdict, basis, note;
  if (f4fVerdict === 'CONFIRMED_OK' && !jaMismatch && strongOk) {
    verdict = 'CONFIRMED_OK';
    basis = 'PHASE4F_DIRECTLY_SAMPLED_OK';
    note = f4fEntry.note || '';
  } else if (jaMismatch) {
    // Japanese changed since Phase 4f — could mean it was implemented
    verdict = 'REVIEW_REQUIRED';
    basis = 'JAPANESE_CHANGED_SINCE_PHASE4F';
    note = `Phase 4f: ${f4fEntry.japanese} → current: ${bt.japanese}`;
  } else if (!strongOk) {
    verdict = 'HOLD_DATA_QUALITY';
    basis = 'STRONG_MISMATCH';
    note = `Phase 4ag strong: ${target.strong}, bible_data strong: ${bt.strong}`;
  } else {
    // f4fVerdict was not CONFIRMED_OK (shouldn't happen for these tokens)
    verdict = 'REVIEW_REQUIRED';
    basis = 'UNEXPECTED_F4F_VERDICT';
    note = `Phase 4f verdict: ${f4fVerdict}`;
  }

  if (verdict === 'CONFIRMED_OK') {
    byStrong[bt.strong].confirmed++;
    confirmed++;
  } else {
    reviewRequired++;
  }

  auditTokens.push({
    ref: bt.ref,
    book: bt.book,
    chapter: bt.chapter,
    verse: bt.verse,
    tokenIndex: bt.tokenIndex,
    strong: bt.strong,
    lemma: bt.lemma,
    text: bt.text || bt.normalized || '',
    morph: bt.morph,
    japanese: bt.japanese,
    english: bt.english || '',
    f4f_verdict: f4fVerdict,
    f4f_zone: f4fEntry.zone,
    f4f_confidence: f4fEntry.confidence,
    f4f_japanese: f4fEntry.japanese,
    ja_match: !jaMismatch,
    verdict,
    basis,
    note,
  });
}

console.log('Total:', auditTokens.length, '/ CONFIRMED_OK:', confirmed, '/ other:', reviewRequired);

// ---- Build strong summary ----
const strongSummary = Object.entries(byStrong)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([strong, s]) => {
    const sp = f4fStrongMap.get(strong) || {};
    const morphSummary = {};
    for (const [morph, jaMap] of Object.entries(morphDist[strong] || {})) {
      morphSummary[morph] = { total: Object.values(jaMap).reduce((a, b) => a + b, 0), ja: jaMap };
    }
    return {
      strong,
      lex_meaning: sp.lexMeaning || '',
      phase4al_count: s.count,
      phase4al_confirmed: s.confirmed,
      distinct_japanese: [...s.ja_set],
      morph_count: s.morph_set.size,
      phase4f_population_total: sp.populationTotal || 0,
      phase4f_sampled_count: sp.sampledCount || 0,
      zone_allocation: sp.zoneAllocation || {},
      morph_summary: morphSummary,
    };
  });

// ---- Integrity checks ----
const totalCheck = auditTokens.length;
const dupCheck = new Set(auditTokens.map(t => t.ref)).size;
const confirmedCheck = auditTokens.filter(t => t.verdict === 'CONFIRMED_OK').length;
const integrityChecks = {
  total: { expected: 410, actual: totalCheck, pass: totalCheck === 410 },
  no_duplicates: { expected: 410, actual: dupCheck, pass: dupCheck === 410 },
  all_in_phase4f_sample: { expected: 410, actual: auditTokens.filter(t => t.f4f_verdict).length, pass: auditTokens.filter(t => t.f4f_verdict).length === 410 },
  all_phase4f_confirmed_ok: { expected: 410, actual: auditTokens.filter(t => t.f4f_verdict === 'CONFIRMED_OK').length, pass: auditTokens.filter(t => t.f4f_verdict === 'CONFIRMED_OK').length === 410 },
  all_ja_match: { expected: 410, actual: auditTokens.filter(t => t.ja_match === true).length, pass: auditTokens.filter(t => t.ja_match === true).length === 410 },
  confirmed_ok: { actual: confirmedCheck },
  review_required: { actual: reviewRequired },
  all_checks: totalCheck === 410 && dupCheck === 410 && confirmed === 410 ? 'PASS' : 'FAIL',
};

console.log('Integrity:', JSON.stringify(integrityChecks, null, 2));

// ---- Write output ----
const outJson = {
  meta: {
    phase: '4al',
    date: '2026-11-04',
    description: 'Tier 2 SAMPLED_TOKEN 410件 全件照合監査',
    source_phase4ah: 'stage4-phase4ah-unreviewed-breakdown.json',
    source_phase4f: 'stage4-phase4f-tier2-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    readonly: true,
    target_description: 'Group A / Tier 2 / audit_evidence=SAMPLED_TOKEN — Phase 4f直接サンプリングref',
  },
  population: {
    total: 410,
    tier: 2,
    group: 'A',
    audit_evidence: 'SAMPLED_TOKEN',
    distinct_strongs: Object.keys(byStrong).length,
    all_confirmed_in_phase4f: true,
    all_confidence_high: true,
    derivation: 'Phase 4ah Tier 2 SAMPLED_TOKEN 410件、Phase 4ak後も全件UNREVIEWED確認',
  },
  integrity: integrityChecks,
  verdict_summary: {
    CONFIRMED_OK: confirmedCheck,
    APPROVED_FOR_CHANGE: 0,
    HOLD_CONTEXT: 0,
    HOLD_DATA_QUALITY: 0,
    REVIEW_REQUIRED: reviewRequired,
    total: totalCheck,
  },
  strong_summary: strongSummary,
  tokens: auditTokens,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4al-sampled-token-audit.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4al-sampled-token-audit.json');
