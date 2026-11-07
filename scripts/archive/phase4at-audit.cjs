'use strict';
const fs = require('fs'), path = require('path');
const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

const ap = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ap-tier1-inferred-audit.json'), 'utf8'));
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
const e4 = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4e-tier1-audit.json'), 'utf8'));

const agStateMap = new Map(ag.tokens.map(t => [t.ref, t.state]));

// JA1955 verse map from Phase 4e
const ja1955Map = new Map();
for (const [, s] of Object.entries(e4.strongs || {})) {
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
function getVerse(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)/);
  if (!m) return [];
  return getChapter(m[1], m[2]).filter(t => { const vm = t.ref.match(/:\s*(\d+)!/); return vm && vm[1] === m[3]; });
}
function getTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  return getChapter(m[1], m[2]).find(t => t.ref === ref) || null;
}

// ---- Population ----
const targets = ap.exception_tokens.filter(t => t.strong === 'G3056');
console.log('G3056 N-ASM exception tokens:', targets.length);

// Verify
let urCount = 0, nonUR = [];
for (const t of targets) {
  const st = agStateMap.get(t.ref);
  if (st === 'UNREVIEWED') urCount++;
  else nonUR.push(t.ref + ':' + st);
}
if (nonUR.length) { console.error('Non-UNREVIEWED:', nonUR); process.exit(1); }
console.log('All UNREVIEWED:', urCount);

// ---- Semantic decision rules ----
// Key constructions identified by pre-analysis:
// APPROVE_MOSHIHIRAKI: λόγον + ἀποδίδωμι (G591), or αἰτέω (G154) asking for account
// Strong codes in bible_data format (no leading zeros)
const APODID_S = new Set(['G591']);           // ἀποδίδωμι
const AITEO_S  = new Set(['G154', 'G523']);   // αἰτέω, ἀπαιτέω

// RETAIN_KOTOBA: strong verbs of speech/hearing/receiving/keeping/proclaiming
const SPEECH_VERBS = new Set([
  'G191',   // ἀκούω hear
  'G2983',  // λαμβάνω receive
  'G1209',  // δέχομαι receive
  'G5083',  // τηρέω keep
  'G2902',  // κρατέω hold
  'G2784',  // κηρύσσω proclaim
  'G2980',  // λαλέω speak
  'G4687',  // σπείρω sow
  'G3936',  // παρίστημι present
  'G3056',  // λόγος itself (recursive protection)
  'G1718',  // ἐμφανίζω reveal
  'G1229',  // διαγγέλλω proclaim
  'G2605',  // καταγγέλλω announce
  'G4160',  // ποιέω do (when λόγος = "word to do/keep")
  'G4278',  // προκηρύσσω proclaim before
  'G2097',  // εὐαγγελίζω evangelize
  'G1448',  // ἐγγίζω approach (for "spread")
  'G4901',  // συνεπιμαρτυρέω co-witness
  'G4869',  // συναιχμάλωτος
  'G4100',  // πιστεύω believe
  'G3908',  // παρατίθημι set before
  'G3870',  // παρακαλέω exhort
  'G4294',  // προκαταρτίζω prepare beforehand
  'G5562',  // χωρέω receive/accept
  'G5319',  // φανερόω manifest
  'G5055',  // τελέω complete/fulfill
]);

// APPROVE_OTHER_GLOSS: specific constructions
// ACT 1:1 "Τὸν πρῶτον λόγον ἐποιησάμην" = "I composed the first account"
// ROM 9:28 "λόγον συντελῶν ποιήσει" = "will execute his word/sentence" (LXX)
const OTHER_GLOSS_MANUAL = {
  'ACT 1:1!4':   { verdict: 'APPROVE_OTHER_GLOSS', gloss: '著述', reason: '"Τὸν μὲν πρῶτον λόγον ἐποιησάμην" = "In my former book/treatise I wrote about". λόγον ποιέω (middle) = compose/write an account. ことば is not accurate; 著述/記述/報告 is more precise.', confidence: 'HIGH' },
  'ROM 9:28!1':  { verdict: 'RETAIN_KOTOBA',       gloss: 'ことば', reason: '"λόγον γὰρ συντελῶν καὶ συντέμνων ποιήσει κύριος" = "for the Lord will carry out his word/sentence". LXX quote (Isa 10:22-23). λόγον = divine word/decree. ことば is acceptable for God\'s decisive word.', confidence: 'MED' },
};

// CONTEXT_DEPENDENT: constructions needing L-0 design decision
// 1PE 3:15 is an ambiguous case: λόγον = reason/account (like ἀπολογία context)
const CD_MANUAL = {
  '1PE 3:15!18': { verdict: 'APPROVE_MOSHIHIRAKI', gloss: '申し開き', reason: '"τῷ αἰτοῦντι ὑμᾶς λόγον περὶ τῆς ἐν ὑμῖν ἐλπίδος" = "him who asks you for an account about the hope in you". αἰτέω + λόγον περί = demand for a reason/defense. Context is explicitly paired with ἀπολογίαν (defense) in v.15. → 申し開き.', confidence: 'HIGH' },
};

// ---- Main audit loop ----
const auditTokens = [];
const classCounts = { RETAIN_KOTOBA: 0, APPROVE_MOSHIHIRAKI: 0, APPROVE_OTHER_GLOSS: 0, CONTEXT_DEPENDENT: 0, DATA_QUALITY_HOLD: 0, UNRESOLVED: 0 };

for (const target of targets) {
  const bt = getTok(target.ref);
  if (!bt) {
    auditTokens.push({ ref: target.ref, verdict: 'DATA_QUALITY_HOLD', reason: 'bible_data lookup failed', confidence: 'FAIL' });
    classCounts.DATA_QUALITY_HOLD++;
    continue;
  }

  const vs = getVerse(target.ref);
  const tIdx = vs.findIndex(x => x.ref === target.ref);
  // Wide context window: ±6 tokens
  const ctx = vs.slice(Math.max(0, tIdx - 6), tIdx + 7);
  const ctxStrongs = ctx.map(x => x.strong);
  const ctxGreek = ctx.map(x => x.text).join(' ');
  const ctxJa = ctx.map(x => x.japanese).join(' ');
  const verseGreek = vs.map(x => x.text).join(' ');

  let verdict, reason, confidence, gloss;

  // === Priority 1: manual overrides (OTHER_GLOSS and special CD) ===
  if (OTHER_GLOSS_MANUAL[target.ref]) {
    ({ verdict, gloss, reason, confidence } = OTHER_GLOSS_MANUAL[target.ref]);
  } else if (CD_MANUAL[target.ref]) {
    ({ verdict, gloss, reason, confidence } = CD_MANUAL[target.ref]);
  }
  // === Priority 2: ἀποδίδωμι constructions → APPROVE_MOSHIHIRAKI ===
  else if (ctxStrongs.some(s => APODID_S.has(s))) {
    // Find the apodidomi token for description
    const apodTok = ctx.find(x => APODID_S.has(x.strong));
    verdict = 'APPROVE_MOSHIHIRAKI';
    gloss = '申し開き';
    reason = `"λόγον ἀποδίδωμι" idiom: "${ctxGreek}". ${apodTok?.text}(${apodTok?.strong}) + λόγον = give/render an account. JA1955 uses 言いひらき/報告 type language. 申し開き appropriate.`;
    confidence = 'HIGH';
  }
  // === Priority 3: αἰτέω/ἀπαιτέω asking for account → APPROVE_MOSHIHIRAKI ===
  else if (ctxStrongs.some(s => AITEO_S.has(s))) {
    const askTok = ctx.find(x => AITEO_S.has(x.strong));
    verdict = 'APPROVE_MOSHIHIRAKI';
    gloss = '申し開き';
    reason = `αἰτέω + λόγον idiom: "${ctxGreek}". ${askTok?.text}(${askTok?.strong}) = ask/demand a reason/account. → 申し開き.`;
    confidence = 'HIGH';
  }
  // === Priority 4: ποιέω constructions → check individually ===
  else if (ctxStrongs.some(s => s === 'G4160')) {
    // Check if it's "do/perform the word" (λόγον ποιέω = keep/do the word) or other
    const poiTok = ctx.find(x => x.strong === 'G4160');
    // "τὸν λόγον... ποιοῦντες" = do the word → ことば
    if (poiTok && (poiTok.ref > target.ref || vs.findIndex(x=>x.ref===poiTok.ref) > tIdx)) {
      // ποιέω comes after λόγον: "do the word" → ことば
      verdict = 'RETAIN_KOTOBA';
      gloss = 'ことば';
      reason = `"τὸν λόγον... ποιέω" = "do/keep the word": "${ctxGreek}". ποιέω follows λόγον as action upon it. ことば appropriate.`;
      confidence = 'HIGH';
    } else {
      // ποιέω before λόγον or unclear: needs context
      verdict = 'CONTEXT_DEPENDENT';
      gloss = '(設計判断待ち)';
      reason = `ποιέω + λόγον: "${ctxGreek}". Position relationship unclear. Manual check needed.`;
      confidence = 'LOW';
    }
  }
  // === Priority 5: standard context — check adjacent/nearby structure ===
  else {
    // Check for genitive markers indicating "word of God/Lord/truth"
    const prevTokens = vs.slice(Math.max(0, tIdx - 2), tIdx);
    const nextTokens = vs.slice(tIdx + 1, Math.min(vs.length, tIdx + 4));
    const nearStrongs = [...prevTokens, ...nextTokens].map(x => x.strong);
    const nearMorphs = [...prevTokens, ...nextTokens].map(x => x.morph || '');

    // "τὸν λόγον σου / αὐτοῦ / τοῦ θεοῦ / κυρίου / τῆς ἀληθείας / τοῦτον / ἐκεῖνον"
    // → τὸν λόγον + genitive noun or pronoun
    const hasGenitiveModifier = nearMorphs.some(m => m.startsWith('N-GS') || m.startsWith('P-') || m.startsWith('D-AS') || m.startsWith('T-GS'));
    // Check specific "word of God" genitive
    const GOD_STRONGS = new Set(['G2316', 'G2962', 'G5547', 'G2424']); // θεός, κύριος, Χριστός, Ἰησοῦς
    const hasGodWord = nextTokens.some(x => GOD_STRONGS.has(x.strong));

    // "τὸν λόγον τοῦτον/ἐκεῖνον" demonstrative
    const DEMO = new Set(['G3778','G1565','G3739','G3773']);
    const hasDemonstrative = nextTokens.some(x => DEMO.has(x.strong)) ||
                              prevTokens.some(x => DEMO.has(x.strong));

    // Verbs in full verse that govern communication
    const verbsInVerse = vs.filter(x => x.morph?.startsWith('V-') && x.strong !== 'G3056');
    const hasCommVerb = verbsInVerse.some(x => SPEECH_VERBS.has(x.strong));

    // Adjectives modifying λόγον (word-type adjectives): e.g. σκληρός, εὔσημος, καλός, ἀληθής
    const prevAdj = prevTokens.find(x => x.morph?.startsWith('A-ASM'));
    const isDescribedWord = !!prevAdj;

    if (hasGodWord || hasDemonstrative || isDescribedWord) {
      verdict = 'RETAIN_KOTOBA';
      gloss = 'ことば';
      reason = `"τὸν λόγον + ${hasGodWord?'genitive of God/Lord':hasDemonstrative?'demonstrative':prevAdj?.text+' (adj)'}": "${ctxGreek}". Standard "word/speech" use. ことば appropriate.`;
      confidence = 'HIGH';
    } else if (hasGenitiveModifier || hasCommVerb) {
      verdict = 'RETAIN_KOTOBA';
      gloss = 'ことば';
      reason = `τὸν λόγον with ${hasGenitiveModifier?'genitive modifier':'communication verb ('+verbsInVerse.filter(x=>SPEECH_VERBS.has(x.strong)).map(x=>x.text).join(',')+')'}. "${ctxGreek}". Standard word/speech use. ことば appropriate.`;
      confidence = hasGenitiveModifier && hasCommVerb ? 'HIGH' : 'MED';
    } else {
      // Fallback: check the verb pattern more broadly
      const govVerb = verbsInVerse[0];
      verdict = 'RETAIN_KOTOBA';
      gloss = 'ことば';
      reason = `"${ctxGreek}" — no special account-giving idiom detected. λόγος N-ASM as word/speech object. ことば appropriate.`;
      confidence = 'MED';
    }
  }

  // Build verse context string
  const verseCtxGreek = ctx.map(x => x.text).join(' ');

  classCounts[verdict]++;
  auditTokens.push({
    ref: bt.ref,
    book: target.ref.split(' ')[0],
    strong: 'G3056',
    greek_form: bt.text,
    morph: target.cur_morph,
    cur_japanese: bt.japanese,
    verse_greek: verseGreek,
    ctx_greek: verseCtxGreek,
    ctx_ja: ctxJa,
    ja1955_verse: ja1955Map.get(target.ref) || null,
    verdict,
    gloss,
    reason,
    confidence,
  });
}

// ---- Sort by ref ----
auditTokens.sort((a, b) => a.ref.localeCompare(b.ref));

console.log('Verdict distribution:', JSON.stringify(classCounts));
console.log('Total:', auditTokens.length);

// ---- Integrity checks ----
const checks = {
  total_123:        { expected: 123, actual: auditTokens.length, pass: auditTokens.length === 123 },
  no_duplicates:    { expected: 123, actual: new Set(auditTokens.map(t => t.ref)).size, pass: new Set(auditTokens.map(t => t.ref)).size === 123 },
  all_unreviewed:   { expected: 123, actual: urCount, pass: urCount === 123 },
  no_dqh:           { expected: 0, actual: classCounts.DATA_QUALITY_HOLD, pass: classCounts.DATA_QUALITY_HOLD === 0 },
};
const allPass = Object.values(checks).every(c => c.pass === true);
console.log('Integrity:', allPass ? 'PASS' : 'FAIL');
for (const [k, v] of Object.entries(checks)) if (!v.pass) console.error('  FAIL:', k, 'exp', v.expected, 'got', v.actual);

// morph_summary
const morphSummary = {};
for (const t of auditTokens) {
  const k = t.morph;
  if (!morphSummary[k]) morphSummary[k] = { morph: k, count: 0, by_verdict: {} };
  morphSummary[k].count++;
  morphSummary[k].by_verdict[t.verdict] = (morphSummary[k].by_verdict[t.verdict] || 0) + 1;
}

// confidence summary
const confSummary = {};
for (const t of auditTokens) {
  const k = t.verdict + '/' + (t.confidence || '?');
  confSummary[k] = (confSummary[k] || 0) + 1;
}

// Overall verdict
const nontrivial = classCounts.APPROVE_MOSHIHIRAKI + classCounts.APPROVE_OTHER_GLOSS + classCounts.CONTEXT_DEPENDENT + classCounts.UNRESOLVED;
const overallVerdict = !allPass ? 'FAIL'
  : (classCounts.DATA_QUALITY_HOLD > 0 || classCounts.UNRESOLVED > 0) ? 'FAIL'
  : nontrivial > 0 ? 'CONDITIONAL PASS'
  : 'PASS';
console.log('Overall verdict:', overallVerdict);

// Write output
const outJson = {
  meta: {
    phase: '4at',
    date: '2026-11-04',
    description: 'G3056 λόγος N-ASM 123件の個別監査（READ-ONLY）',
    source_phase4ap: 'stage4-phase4ap-tier1-inferred-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
    readonly: true,
  },
  population: {
    total: 123,
    strong: 'G3056',
    lemma: 'λόγος',
    morph: 'N-ASM',
    all_unreviewed_before: urCount,
    derivation: 'Phase 4ap exception_tokens G3056 N-ASM（Phase 4e RC: ROM 14:12!6 N-ASM → 申し開き）。ROM 14:12!6は Phase 4adで実装済み（IMPLEMENTED_AND_VERIFIED）のため123件に含まれない。',
    phase4e_rc: 'ROM 14:12!6: N-ASM REVISION_CANDIDATE → Phase 4adで実装済み',
  },
  analysis_basis: {
    exception_trigger: 'Phase 4e RC: ROM 14:12!6 "λόγον δώσει τῷ θεῷ" → 申し開き (Gives account to God)',
    primary_idioms: {
      APPROVE_MOSHIHIRAKI: [
        'λόγον + ἀποδίδωμι (G591) = give/render an account',
        'λόγον + αἰτέω (G154) = ask for a reason/account',
      ],
      RETAIN_KOTOBA: [
        'τὸν λόγον + genitive of God/Lord/truth',
        'τὸν λόγον + demonstrative (τοῦτον, ἐκεῖνον)',
        'λόγον + adjective describing the word',
        'τὸν λόγον as object of communication verbs',
      ],
    },
  },
  integrity: checks,
  overall_verdict: overallVerdict,
  verdict_summary: classCounts,
  confidence_summary: confSummary,
  morph_summary: Object.values(morphSummary),
  tokens: auditTokens,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4at-g3056-audit.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4at-g3056-audit.json');
