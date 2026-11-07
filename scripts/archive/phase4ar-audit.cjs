'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

const ap = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ap-tier1-inferred-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const e4 = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4e-tier1-audit.json'), 'utf8'));

const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// Phase 4e JA1955 verse text for sampled refs (G3762 RC)
const ja1955Map = new Map();
for (const [, s] of Object.entries(e4.strongs)) {
  if (!s.strong) continue;
  for (const t of (s.tokens || [])) if (t.ja1955Verse) ja1955Map.set(t.ref, t.ja1955Verse);
}

// bible_data helpers
const chCache = {};
function getChapter(book, ch) {
  const k = book + '/' + ch;
  if (!chCache[k]) {
    try { chCache[k] = JSON.parse(fs.readFileSync(path.join(BIBLE, book, ch + '.json'), 'utf8')); }
    catch (e) { chCache[k] = []; }
  }
  return chCache[k];
}
function getTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/); if (!m) return null;
  return getChapter(m[1], m[2]).find(t => t.ref === ref) || null;
}
function getVerseToks(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)/); if (!m) return [];
  const [, bk, ch, vs] = m;
  return getChapter(bk, ch).filter(t => { const vm = t.ref.match(/^(\S+)\s+\d+:(\d+)/); return vm && vm[2] === vs; });
}

// ---- Target population: G3762 neuter/feminine 95 refs ----
const neutFemMorphs = new Set(['A-ASN-N', 'A-NSN-N', 'A-ASF-N', 'A-DSN-N', 'A-GSN-N', 'A-NSF-N']);
const targets = ap.exception_tokens.filter(t => t.strong === 'G3762' && neutFemMorphs.has(t.cur_morph));
console.log('Target population:', targets.length);

// Verify population
let unreviewedCount = 0;
const notUR = [];
for (const t of targets) {
  const st = agStateMap.get(t.ref);
  if (st === 'UNREVIEWED') unreviewedCount++;
  else notUR.push({ ref: t.ref, state: st || 'missing' });
}
console.log('UNREVIEWED:', unreviewedCount, '/ Non-UNREVIEWED:', notUR.length);
if (notUR.length) { console.error('Non-UNREVIEWED targets:', JSON.stringify(notUR)); process.exit(1); }

// ---- Manual semantic decisions for all 10 feminine forms ----
// All feminine (A-*SF-N) tokens individually analyzed. The adjacent-noun heuristic
// is unreliable when the noun falls outside the ±1 window; hardcode all decisions.
const MANUAL_DECISIONS = {
  // A-ASF-N (7 tokens)
  'MRK 6:5!6':   { verdict: 'APPROVE_NANIMO',    reason: '"οὐδεμίαν δύναμιν" (no miracle/power). δύναμιν (G1411, N-ASF) = power/miracle, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  'LUK 4:26!3':  { verdict: 'RETAIN_DAREMO',     reason: '"πρὸς οὐδεμίαν αὐτῶν" = to none of them. αὐτῶν refers back to γυναῖκα χήραν (widow-women) in LUK 4:25-26 context. Person reference → 誰も〜ない correct.', confidence: 'HIGH' },
  'JHN 18:38!20':{ verdict: 'APPROVE_NANIMO',    reason: '"Ἐγὼ οὐδεμίαν εὑρίσκω ἐν αὐτῷ αἰτίαν" (I find no charge in him). αἰτίαν (G156, N-ASF) = charge/guilt, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  'JHN 19:4!18': { verdict: 'APPROVE_NANIMO',    reason: '"οὐδεμίαν αἰτίαν εὑρίσκω ἐν αὐτῷ" (no charge found in him). αἰτίαν (G156, N-ASF) = charge/guilt, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  'JHN 19:11!9': { verdict: 'APPROVE_NANIMO',    reason: '"Οὐκ εἶχες ἐξουσίαν κατ᾽ ἐμοῦ οὐδεμίαν" (you would have no authority at all). ἐξουσίαν (G1849, N-ASF) = authority, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  'ACT 25:18!6': { verdict: 'APPROVE_NANIMO',    reason: '"οὐδεμίαν αἰτίαν... ἔφερον" (brought no charge of evil). αἰτίαν (G156, N-ASF) = charge/accusation, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  '2CO 7:5!7':   { verdict: 'APPROVE_NANIMO',    reason: '"οὐδεμίαν... ἄνεσιν" (no rest). ἄνεσιν (G425, N-ASF) = relief/rest, an abstract non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  // A-NSF-N (3 tokens)
  'ACT 27:22!10':{ verdict: 'APPROVE_NANIMO',    reason: '"ἀποβολὴ ψυχῆς οὐδεμία" (no loss of life). ἀποβολή (G590, N-NSF) = loss, a non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
  'PHP 4:15!15': { verdict: 'CONTEXT_DEPENDENT', reason: '"οὐδεμία... ἐκκλησία ἐκοινώνησεν" (no church shared). ἐκκλησία = collective assembly; grammatically feminine, semantically institutional. Neither clearly a person (誰も) nor an abstract thing (何も). Design decision required.', confidence: 'MED' },
  '1JN 1:5!24':  { verdict: 'APPROVE_NANIMO',    reason: '"σκοτία ἐν αὐτῷ οὐκ ἔστιν οὐδεμία" (no darkness at all in him). σκοτία (G4653, N-NSF) = darkness, an abstract non-person noun. 何も〜ない appropriate.', confidence: 'HIGH' },
};

// ---- Main audit loop ----
const auditTokens = [];
const classCounts = { APPROVE_NANIMO: 0, RETAIN_DAREMO: 0, CONTEXT_DEPENDENT: 0, DATA_QUALITY_HOLD: 0, UNRESOLVED: 0 };

for (const target of targets) {
  const bt = getTok(target.ref);
  if (!bt) {
    auditTokens.push({ ref: target.ref, strong: 'G3762', cur_morph: target.cur_morph, verdict: 'DATA_QUALITY_HOLD', reason: 'bible_data lookup failed', confidence: 'FAIL' });
    classCounts.DATA_QUALITY_HOLD++;
    continue;
  }
  const vs = getVerseToks(target.ref);
  const tIdx = vs.findIndex(x => x.ref === target.ref);
  const verseGreek = vs.map(x => x.text).join(' ');
  const verseJa = vs.map(x => x.japanese).join(' ');

  // Window context (-2 to +2 tokens)
  const ctxToks = vs.slice(Math.max(0, tIdx - 2), tIdx + 3);
  const ctxGreek = ctxToks.map(x => x.text).join(' ');

  // Determine verdict
  let verdict, reason, confidence, recommended_ja, negated_referent;
  const isFem = target.cur_morph.includes('F');
  const isNeuter = !isFem; // A-*SN-N

  if (MANUAL_DECISIONS[target.ref]) {
    verdict = MANUAL_DECISIONS[target.ref].verdict;
    reason = MANUAL_DECISIONS[target.ref].reason;
    confidence = 'HIGH';
  } else if (isNeuter) {
    // Neuter forms (A-ASN-N, A-NSN-N, A-DSN-N, A-GSN-N):
    // Greek neuter = things/matters/actions; not persons
    // 誰も〜ない (no one) is incorrect for neuter; 何も〜ない (nothing) is correct
    verdict = 'APPROVE_NANIMO';
    reason = `neuter form (${target.cur_morph}) — Greek neuter gender = things/matters, not persons. 何も〜ない preserves structure.`;
    confidence = 'HIGH';
  } else {
    // Feminine forms not in MANUAL_DECISIONS:
    // Check the adjacent noun (what feminine noun is being negated)
    const nextTok = tIdx < vs.length - 1 ? vs[tIdx + 1] : null;
    const prevTok = tIdx > 0 ? vs[tIdx - 1] : null;
    // The adjacent noun in attributive use: usually immediately following
    const adjNoun = nextTok && nextTok.strong && nextTok.morph?.startsWith('N-') ? nextTok : null;
    const adjNounPrev = prevTok && prevTok.strong && prevTok.morph?.startsWith('N-') ? prevTok : null;

    // Feminine forms found to modify thing-nouns:
    // δύναμιν (G1411, power/miracle), αἰτίαν (G156, charge/guilt), ἐξουσίαν (G1849, authority)
    // ἄνεσιν (rest), σκοτία (darkness), ἀποβολή (loss)
    const thingNouns = new Set(['G1411', 'G156', 'G1849', 'G309', 'G4639', 'G590', 'G225']);
    const refNoun = adjNoun || adjNounPrev;

    if (refNoun && thingNouns.has(refNoun.strong)) {
      verdict = 'APPROVE_NANIMO';
      reason = `feminine form (${target.cur_morph}) modifying "${refNoun.text}" (${refNoun.strong}, ${refNoun.japanese}) — a non-person noun. 何も〜ない appropriate.`;
      confidence = 'HIGH';
    } else if (refNoun) {
      // Feminine noun adjacent but not in our known list — still a thing-noun
      verdict = 'APPROVE_NANIMO';
      reason = `feminine form (${target.cur_morph}) used attributively with "${refNoun.text}" (${refNoun.strong}, ${refNoun.japanese}) — feminine noun, not a person. 何も〜ない appropriate.`;
      confidence = 'MED';
    } else {
      // No adjacent noun identified — could be pronominal
      verdict = 'CONTEXT_DEPENDENT';
      reason = `feminine form (${target.cur_morph}) without clear adjacent noun. Context: "${ctxGreek}". Pronominal use could refer to person or thing.`;
      confidence = 'LOW';
    }
  }

  // Recommended japanese
  if (verdict === 'APPROVE_NANIMO') recommended_ja = '何も〜ない';
  else if (verdict === 'RETAIN_DAREMO') recommended_ja = '誰も〜ない';
  else recommended_ja = '(設計判断待ち)';

  classCounts[verdict]++;

  auditTokens.push({
    ref: bt.ref,
    book: bt.book || target.ref.split(' ')[0],
    chapter: bt.chapter || target.ref.match(/\d+:/)?.[0]?.replace(':', '') || '',
    verse: bt.verse || target.ref.match(/:(\d+)!/)?.[1] || '',
    tokenIndex: bt.tokenIndex || target.ref.match(/!(\d+)/)?.[1] || '',
    strong: 'G3762',
    greek_form: bt.text || '',
    morph: target.cur_morph,
    gender: target.cur_morph.includes('F') ? 'feminine' : 'neuter',
    cur_japanese: bt.japanese,
    english: bt.english || '',
    context_greek: ctxGreek,
    context_ja: ctxToks.map(x => x.japanese).join(' '),
    ja1955_verse: ja1955Map.get(target.ref) || null,
    verdict,
    reason,
    confidence,
    recommended_ja,
  });
}

console.log('Verdict distribution:', JSON.stringify(classCounts));
console.log('Total:', auditTokens.length);

// ---- Integrity checks ----
const checks = {
  total_95: { expected: 95, actual: auditTokens.length, pass: auditTokens.length === 95 },
  no_duplicates: { expected: 95, actual: new Set(auditTokens.map(t => t.ref)).size, pass: new Set(auditTokens.map(t => t.ref)).size === 95 },
  all_unreviewed: { expected: 95, actual: unreviewedCount, pass: unreviewedCount === 95 },
  no_data_quality_issues: { expected: 0, actual: classCounts.DATA_QUALITY_HOLD, pass: classCounts.DATA_QUALITY_HOLD === 0 },
  no_unresolved: { expected: 0, actual: classCounts.UNRESOLVED, pass: classCounts.UNRESOLVED === 0 },
};
const allPass = Object.values(checks).every(c => c.pass === true);
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(checks)) if (!v.pass) console.error('  FAIL:', k, 'expected', v.expected, 'got', v.actual);

// morph summary
const morphSummary = {};
for (const t of auditTokens) {
  const k = t.morph;
  if (!morphSummary[k]) morphSummary[k] = { morph: k, count: 0, by_verdict: {} };
  morphSummary[k].count++;
  morphSummary[k].by_verdict[t.verdict] = (morphSummary[k].by_verdict[t.verdict] || 0) + 1;
}

// Overall verdict:
// CONDITIONAL PASS when integrity is clean but non-trivial decisions remain
// (RETAIN_DAREMO = kept as-is by design; CONTEXT_DEPENDENT = pending L-0 decision)
const nonTrivialCount = classCounts.CONTEXT_DEPENDENT + classCounts.RETAIN_DAREMO;
const overallVerdict = !allPass ? 'FAIL'
  : (classCounts.DATA_QUALITY_HOLD > 0 || classCounts.UNRESOLVED > 0) ? 'FAIL'
  : nonTrivialCount > 0 ? 'CONDITIONAL PASS'
  : 'PASS';

console.log('Overall verdict:', overallVerdict);

// Write output
const outJson = {
  meta: {
    phase: '4ar',
    date: '2026-11-04',
    description: 'G3762 οὐδείς 中性・女性形95件の個別監査（READ-ONLY）',
    source_phase4ap: 'stage4-phase4ap-tier1-inferred-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    readonly: true,
  },
  population: {
    total: 95,
    strong: 'G3762',
    lemma: 'οὐδείς',
    lexMeaning: 'no one/nothing (masculine: no one; neuter: nothing)',
    all_unreviewed_before: unreviewedCount,
    morph_distribution: { 'A-ASN-N': 63, 'A-NSN-N': 18, 'A-ASF-N': 7, 'A-DSN-N': 3, 'A-GSN-N': 1, 'A-NSF-N': 3 },
    derivation: 'Phase 4ap exception_tokens G3762 neuter/feminine forms (95件). G3762 masculine forms 119件は別途処理。',
  },
  analysis_basis: {
    neuter_rule: 'Greek neuter gender (A-*SN-N) encodes semantic category "things/matters/actions" — not persons. 何も〜ない (nothing) is structurally correct. Applied to all 85 neuter tokens.',
    feminine_rule: 'All 10 feminine (A-*SF-N) tokens individually audited. Decision: (a) what noun/referent is modified, (b) person or thing?',
    feminine_decisions: {
      'MRK 6:5!6':   'APPROVE_NANIMO — δύναμιν (power/miracle)',
      'LUK 4:26!3':  'RETAIN_DAREMO — pronoun αὐτῶν = widows (persons)',
      'JHN 18:38!20':'APPROVE_NANIMO — αἰτίαν (charge/guilt)',
      'JHN 19:4!18': 'APPROVE_NANIMO — αἰτίαν (charge/guilt)',
      'JHN 19:11!9': 'APPROVE_NANIMO — ἐξουσίαν (authority)',
      'ACT 25:18!6': 'APPROVE_NANIMO — αἰτίαν (accusation)',
      '2CO 7:5!7':   'APPROVE_NANIMO — ἄνεσιν (relief/rest)',
      'ACT 27:22!10':'APPROVE_NANIMO — ἀποβολή (loss)',
      'PHP 4:15!15': 'CONTEXT_DEPENDENT — ἐκκλησία (church, institutional collective)',
      '1JN 1:5!24':  'APPROVE_NANIMO — σκοτία (darkness)',
    },
  },
  integrity: checks,
  overall_verdict: overallVerdict,
  verdict_summary: classCounts,
  morph_summary: Object.values(morphSummary),
  tokens: auditTokens,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4ar-g3762-audit.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4ar-g3762-audit.json');
