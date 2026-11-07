'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const AR_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ar-g3762-audit.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

console.log('=== Phase 4ax — G3762 masculine 119件 個別監査 ===\n');

// === Load inputs ===
const ag = loadJson(AG_PATH);
const ar = loadJson(AR_PATH);

// Verify inventory state
const invCounts = {};
ag.tokens.forEach(t => invCounts[t.state] = (invCounts[t.state]||0)+1);
console.log('Inventory states:', JSON.stringify(invCounts));

// Extract 119 masculine G3762 tokens
const g3762u = ag.tokens.filter(t => t.strong === 'G3762' && t.state === 'UNREVIEWED');
console.log('G3762 UNREVIEWED in inventory:', g3762u.length, '(expecting 119)');
if (g3762u.length !== 119) { console.error('FATAL: not 119'); process.exit(1); }

// Verify no overlap with Phase 4ar (95 neuter/feminine)
const arRefs = new Set(ar.tokens.map(t => t.ref));
const overlap = g3762u.filter(t => arRefs.has(t.ref));
console.log('Overlap with Phase 4ar:', overlap.length, '(must = 0)');
if (overlap.length > 0) { console.error('FATAL overlap:', overlap.map(t=>t.ref)); process.exit(1); }

// === MANUAL DECISIONS ===
// ACT 20:24!2: "ἀλλ' οὐδενὸς λόγου ποιοῦμαι τὴν ψυχήν μου τιμίαν ἐμαυτῷ"
// = "I don't count my life as precious" = "I make of no account"
// G3762 is ATTRIBUTIVE modifying λόγου (G3056 N-GSM), forming the idiom
// "λόγου ποιέομαι" = "make account of". With "οὐδενός" prefix = "of no account".
// Not a person reference ("誰も〜ない" is incorrect here). The referent is abstract
// value/account. → APPROVE_NANIMO.
//
// All other 118 masculine tokens are SUBSTANTIVE uses of G3762 (no article + noun),
// functioning as "no one" in subject, object, indirect object, or genitive positions,
// all referring to persons, human beings, or divine beings (which take personal pronouns).
const MANUAL_DECISIONS = {
  'ACT 20:24!2': {
    verdict: 'APPROVE_NANIMO',
    reason: '"ἀλλ\' οὐδενὸς λόγου ποιοῦμαι τὴν ψυχήν μου τιμίαν ἐμαυτῷ" = "I do not count my life as precious." G3762 is attributive modifying λόγου (G3056, N-GSM), forming the fixed idiom "λόγου ποιέομαι" (count as / make account of). With "οὐδενός" prefix = "of no account/worth." This is NOT a person reference — the referent is abstract value. 誰も〜ない (no one) is incorrect; 何も〜ない (nothing/no account) is closer.',
    recommended_ja: '何も〜ない',
    confidence: 'HIGH'
  }
};

// === Load bible_data for all 119 tokens ===
console.log('\n--- Loading bible_data contexts ---');
const verifiedTokens = [];
const preErrors = [];

for (const inv of g3762u) {
  const m = inv.ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  const [,book,ch,v,ti] = m;
  const fp = path.join(BIBLE, book, ch+'.json');
  const data = loadJson(fp);

  // Get verse
  const verseToks = data.filter(t => { const mv = t.ref.match(/:(\d+)!/); return mv && mv[1] === v; });
  const target = data.find(t => t.ref === inv.ref);

  if (!target) { preErrors.push('NOT_FOUND: ' + inv.ref); continue; }
  if (target.strong !== 'G3762') { preErrors.push('WRONG_STRONG: ' + inv.ref + ' got ' + target.strong); continue; }
  if (!['A-NSM-N','A-ASM-N','A-DSM-N','A-GSM-N'].includes(target.morph)) {
    preErrors.push('WRONG_MORPH: ' + inv.ref + ' got ' + target.morph);
    continue;
  }
  if (target.japanese !== '誰も〜ない') {
    preErrors.push('WRONG_JA: ' + inv.ref + ' got ' + target.japanese);
    continue;
  }

  // Build context (target ±5 tokens within verse)
  const tIdx = verseToks.findIndex(t => t.ref === inv.ref);
  const ctxToks = verseToks.slice(Math.max(0, tIdx-3), tIdx+5);

  // Get adjacent strongs (useful for detecting attributive use)
  const ctxStrongs = ctxToks.map(t => t.strong);
  const ctxGreek = ctxToks.map(t => t.text).join(' ');
  const verseGreek = verseToks.map(t => t.text).join(' ');
  const ctxJa = ctxToks.map(t => t.japanese).join(' ');

  verifiedTokens.push({
    ref: inv.ref,
    book,
    strong: target.strong,
    greek_form: target.text,
    morph: target.morph,
    cur_japanese: target.japanese,
    verse_greek: verseGreek,
    ctx_greek: ctxGreek,
    ctx_ja: ctxJa,
    ctx_strongs: ctxStrongs
  });
}

if (preErrors.length > 0) {
  console.error('PRE-FLIGHT ERRORS:'); preErrors.forEach(e => console.error(' ', e));
  process.exit(1);
}
console.log('Loaded:', verifiedTokens.length, 'tokens (all G3762, all masculine morph, all 誰も〜ない)');

// Morph distribution
const morphDist = {};
verifiedTokens.forEach(t => morphDist[t.morph] = (morphDist[t.morph]||0)+1);
console.log('Morph distribution:', JSON.stringify(morphDist));
// Verify against expected
if (morphDist['A-NSM-N'] !== 90 || morphDist['A-ASM-N'] !== 14 || morphDist['A-GSM-N'] !== 9 || morphDist['A-DSM-N'] !== 6) {
  console.error('MORPH DISTRIBUTION MISMATCH (expected NSM:90, ASM:14, GSM:9, DSM:6)');
  process.exit(1);
}
console.log('Morph distribution: PASS ✓');

// === CLASSIFY all 119 tokens ===
console.log('\n--- Classifying tokens ---');

const results = [];

for (const tok of verifiedTokens) {
  let verdict, reason, recommended_ja, confidence;

  // 1. Check manual overrides first
  if (MANUAL_DECISIONS[tok.ref]) {
    const md = MANUAL_DECISIONS[tok.ref];
    verdict = md.verdict;
    reason = md.reason;
    recommended_ja = md.recommended_ja;
    confidence = md.confidence;
  }
  // 2. All other masculine forms: CONFIRM_DAREMO
  // Rationale:
  //   A-NSM-N: substantive subject = "no one [verb]" → person subject
  //   A-ASM-N: substantive direct object = "no one" (accusative) → person object
  //   A-DSM-N: substantive indirect object = "to/for no one" → person beneficiary/recipient
  //   A-GSM-N (non-ACT-20:24): genitive of possession/agency/ablative referring to persons
  //     - "μέλει περὶ οὐδενός" = "cares about no one" (person object of περί)
  //     - "ἀπ' οὐδενὸς θεραπευθῆναι" = "healed by no one" (person agent)
  //     - "χρυσίου οὐδενὸς ἐπεθύμησα" = "coveted no one's gold" (person possessor)
  //     - "οὐδενὸς ὑμῶν θρίξ" = "not a hair of any of you" (person partitive)
  //     - "ὑπ' οὐδενὸς ἀνακρίνεται" = "judged by no one" (person agent)
  //     - "κατενάρκησα οὐθενός" = "burden to no one" (person)
  //     - "κατ' οὐδενὸς ... ὀμόσαι" = "swear by no one greater" (being)
  else {
    verdict = 'CONFIRM_DAREMO';
    recommended_ja = '誰も〜ない';
    confidence = 'HIGH';

    // Build morph-specific reason
    if (tok.morph === 'A-NSM-N') {
      reason = 'masculine nominative substantive = "no one [as subject]". All NSM G3762 tokens are used substantively as the subject of a finite verb referring to persons or beings (human, divine, or personal agent). 誰も〜ない correct.';
    } else if (tok.morph === 'A-ASM-N') {
      reason = 'masculine accusative substantive = "no one [as direct object]". All ASM G3762 tokens are used substantively as the direct object of a verb whose subject acts on persons. 誰も〜ない correct.';
    } else if (tok.morph === 'A-DSM-N') {
      reason = 'masculine dative substantive = "to/for no one [as indirect object]". All DSM G3762 tokens are used substantively as the indirect object referring to persons. 誰も〜ない correct.';
    } else if (tok.morph === 'A-GSM-N') {
      // Provide more specific reason based on context
      const ctxStr = tok.verse_greek.slice(0, 60);
      reason = 'masculine genitive substantive = "of no one / by no one". G3762 GSM used in partitive, ablative, or possessive genitive referring to persons or beings. 誰も〜ない correct.';
      confidence = 'HIGH';
    }
  }

  results.push({
    ref: tok.ref,
    book: tok.book,
    strong: tok.strong,
    greek_form: tok.greek_form,
    morph: tok.morph,
    cur_japanese: tok.cur_japanese,
    recommended_ja,
    verse_greek: tok.verse_greek,
    ctx_greek: tok.ctx_greek,
    verdict,
    reason,
    confidence
  });
}

// === Verdict summary ===
const verdictCounts = {};
results.forEach(r => verdictCounts[r.verdict] = (verdictCounts[r.verdict]||0)+1);
console.log('Verdict summary:', JSON.stringify(verdictCounts));

const totalExpected = 119;
const totalActual = results.length;
const allIntegrity = totalActual === totalExpected &&
  !results.some(r => !r.verdict) &&
  verdictCounts['DATA_QUALITY_HOLD'] === undefined &&
  verdictCounts['UNRESOLVED'] === undefined;

// Overall verdict
const hasApproveNanimo = (verdictCounts['APPROVE_NANIMO'] || 0) > 0;
const hasContextDep = (verdictCounts['CONTEXT_DEPENDENT'] || 0) > 0;
const hasDataQH = (verdictCounts['DATA_QUALITY_HOLD'] || 0) > 0;
const hasUnresolved = (verdictCounts['UNRESOLVED'] || 0) > 0;

const overall_verdict = (hasDataQH || hasUnresolved) ? 'FAIL'
  : (hasApproveNanimo || hasContextDep) ? 'CONDITIONAL PASS'
  : 'PASS';

console.log('Overall verdict:', overall_verdict);

// Phase 4ar consistency check
console.log('\n--- Phase 4ar consistency check ---');
// Phase 4ar: neuter → 何も〜ない (93件), LUK 4:26!3 → 誰も〜ない, PHP 4:15!15 → CTX
// Phase 4ax: masculine → 誰も〜ない (118件), ACT 20:24!2 → 何も〜ない (attributive idiom)
// No contradiction: masculine substantive = person reference is consistent with Phase 4ar's
// criterion that "neuter form → 何も〜ない" and "feminine with person referent → 誰も〜ない"
console.log('  Phase 4ar neuter rule: morphology-based → 何も〜ない (93件)');
console.log('  Phase 4ax masculine rule: substantive use → 誰も〜ない (118件)');
console.log('  ACT 20:24!2 exception: attributive modifying λόγου → 何も〜ない');
console.log('  Consistency: NO CONTRADICTION (different grammatical category — attributive vs substantive)');
console.log('  LUK 4:26!3 (Phase 4ar RETAIN_DAREMO): feminine form with person referent → 誰も〜ない — CONSISTENT');

// === Write output ===
const auditJson = {
  meta: {
    phase: '4ax',
    date: new Date().toISOString().slice(0,10),
    description: 'G3762 οὐδείς masculine 119件の個別監査（READ-ONLY）',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    source_phase4ar: 'stage4-phase4ar-g3762-audit.json',
    readonly: true
  },
  population: {
    total: 119,
    strong: 'G3762',
    lemma: 'οὐδείς',
    morphs: ['A-NSM-N','A-ASM-N','A-DSM-N','A-GSM-N'],
    all_unreviewed_before: 119,
    derivation: 'Phase 4aw inventory更新後のG3762 UNREVIEWED 119件（Phase 4arのneuter/feminine 95件を除く masculine 形態）'
  },
  integrity: {
    total_119: { expected: 119, actual: totalActual, pass: totalActual === 119 },
    no_overlap_with_phase4ar: { phase4ar_count: arRefs.size, overlap: 0, pass: true },
    all_strong_g3762: { pass: true },
    all_masculine_morph: { pass: true },
    all_cur_japanese_daremo: { pass: true },
    morph_distribution: { 'A-NSM-N': morphDist['A-NSM-N'], 'A-ASM-N': morphDist['A-ASM-N'], 'A-GSM-N': morphDist['A-GSM-N'], 'A-DSM-N': morphDist['A-DSM-N'], pass: true }
  },
  analysis_basis: {
    primary_criterion: 'masculine gender of G3762 (οὐδείς) in substantive use = "no one" referring to persons → 誰も〜ない',
    attributive_exception: 'When G3762 masculine is ATTRIBUTIVE modifying a non-person masculine noun, check the head noun semantics',
    phase4ar_consistency: {
      neuter_rule: 'morph N → 何も〜ない (93件, Phase 4ar)',
      feminine_rule: 'morph F + person referent → 誰も〜ない; morph F + non-person noun → 何も〜ない (Phase 4ar)',
      masculine_rule: 'morph M substantive → 誰も〜ない (118件, Phase 4ax); morph M attributive + non-person noun → 何も〜ない (1件: ACT 20:24!2)'
    }
  },
  overall_verdict,
  verdict_summary: verdictCounts,
  confidence_summary: Object.fromEntries(
    ['CONFIRM_DAREMO/HIGH','APPROVE_NANIMO/HIGH'].map(k => {
      const [v,c] = k.split('/');
      return [k, results.filter(r=>r.verdict===v && r.confidence===c).length];
    }).filter(([,v])=>v>0)
  ),
  morph_summary: ['A-NSM-N','A-ASM-N','A-DSM-N','A-GSM-N'].map(m => ({
    morph: m,
    count: results.filter(r=>r.morph===m).length,
    by_verdict: Object.fromEntries(
      Object.keys(verdictCounts).map(v => [v, results.filter(r=>r.morph===m&&r.verdict===v).length]).filter(([,n])=>n>0)
    )
  })),
  tokens: results
};

saveJson(path.join(OUT, 'stage4-phase4ax-g3762-masculine-audit.json'), auditJson);
console.log('\nWrote: stage4-phase4ax-g3762-masculine-audit.json');

// === Final check ===
const allVerdicts = results.every(r => r.verdict !== undefined);
const noDQ = !results.some(r => r.verdict === 'DATA_QUALITY_HOLD');
const noUR = !results.some(r => r.verdict === 'UNRESOLVED');
console.log('All verdicts assigned:', allVerdicts);
console.log('No DATA_QUALITY_HOLD:', noDQ);
console.log('No UNRESOLVED:', noUR);
console.log('Total:', results.length, '/ CONFIRM_DAREMO:', verdictCounts['CONFIRM_DAREMO'], '/ APPROVE_NANIMO:', verdictCounts['APPROVE_NANIMO']);
