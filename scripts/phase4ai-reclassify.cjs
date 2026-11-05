'use strict';
const fs = require('fs'), path = require('path');

const BASE = path.join(__dirname, 'output/stage4-final');
const BIBLE = path.join(__dirname, '..', 'public/bible_data/nt');

// --- Load Phase 4h full population audit ---
const h4hRaw = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4h-full-population-audit.json'), 'utf8'));

// Build confirmed-OK map: ref → {strong, lemma, morph, h4h_japanese, cluster, confidence, note}
const h4hOk = new Map();
for (const [strong, pop] of Object.entries(h4hRaw.populations)) {
  for (const t of pop.tokens) {
    if (t.changeNeeded === false) {
      h4hOk.set(t.ref, {
        strong,
        lemma: t.lemma,
        morph: t.morph,
        h4h_japanese: t.japanese,
        h4h_cluster: t.cluster,
        h4h_confidence: t.confidence,
        h4h_note: t.note || null,
      });
    }
  }
}
console.log(`Phase 4h confirmed-OK: ${h4hOk.size} refs`);

// --- Load Phase 4ag inventory ---
const ag = JSON.parse(fs.readFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), 'utf8'));
console.log(`Phase 4ag tokens: ${ag.tokens.length}`);

// Build ref→index map for O(1) update
const agRefIdx = new Map(ag.tokens.map((t, i) => [t.ref, i]));

// --- bible_data lookup (flat array) ---
const chapterCache = {};
function getToken(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):/);
  if (!m) return null;
  const [, book, ch] = m;
  const key = book + '/' + ch;
  if (!chapterCache[key]) {
    const fp = path.join(BIBLE, book, ch + '.json');
    try {
      const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
      chapterCache[key] = new Map(arr.map(t => [t.ref, t]));
    } catch (e) { return null; }
  }
  return chapterCache[key].get(ref) || null;
}

// --- Main reclassification loop ---
const reclassified = [];
const errors = [];
let pass = 0, fail = 0;

for (const [ref, h4h] of h4hOk) {
  const agIdx = agRefIdx.get(ref);
  if (agIdx === undefined) {
    errors.push({ ref, error: 'NOT_IN_AG_INVENTORY' });
    fail++;
    continue;
  }
  const agTok = ag.tokens[agIdx];
  if (agTok.state !== 'UNREVIEWED') {
    errors.push({ ref, error: `UNEXPECTED_STATE:${agTok.state}` });
    fail++;
    continue;
  }
  const cur = getToken(ref);
  if (!cur) {
    errors.push({ ref, error: 'NOT_IN_BIBLE_DATA' });
    fail++;
    continue;
  }
  // All checks pass
  reclassified.push({
    ref,
    old_state: 'UNREVIEWED',
    new_state: 'RETAIN_CONFIRMED',
    strong: h4h.strong,
    lemma: h4h.lemma,
    morph: h4h.morph,
    h4h_japanese: h4h.h4h_japanese,
    cur_japanese: cur.japanese,
    h4h_cluster: h4h.h4h_cluster,
    h4h_confidence: h4h.h4h_confidence,
    h4h_note: h4h.h4h_note,
    basis: 'PHASE4H_INDIVIDUALLY_CONFIRMED_OK',
    evidence_match: (cur.japanese === h4h.h4h_japanese) ? 'EXACT' : 'DIFFER',
  });
  pass++;
}

console.log(`Reclassified: ${pass}, Errors: ${fail}`);
if (errors.length > 0) console.error('Errors:', JSON.stringify(errors));

// --- Write reclassification JSON ---
const byStrong = {};
for (const r of reclassified) {
  if (!byStrong[r.strong]) byStrong[r.strong] = [];
  byStrong[r.strong].push(r);
}
const strongSummary = Object.entries(byStrong).map(([s, arr]) => ({
  strong: s,
  count: arr.length,
  exact_match: arr.filter(x => x.evidence_match === 'EXACT').length,
  differ: arr.filter(x => x.evidence_match === 'DIFFER').length,
}));

const outJson = {
  meta: {
    phase: '4ai',
    date: '2026-11-01',
    description: 'Phase 4h 個別確認済み196件を UNREVIEWED → RETAIN_CONFIRMED に再分類',
    basis: 'PHASE4H_INDIVIDUALLY_CONFIRMED_OK (changeNeeded=false)',
    source_phase4h: 'stage4-phase4h-full-population-audit.json',
    source_phase4ag: 'stage4-phase4ag-residual-inventory.json',
  },
  integrity: {
    h4h_confirmed_ok_total: h4hOk.size,
    reclassified: pass,
    errors: fail,
    all_checks: fail === 0 ? 'PASS' : 'FAIL',
  },
  strong_summary: strongSummary,
  state_delta: {
    UNREVIEWED: { before: 46354, after: 46354 - pass, delta: -pass },
    RETAIN_CONFIRMED: { before: 46225, after: 46225 + pass, delta: +pass },
  },
  tokens: reclassified,
};

fs.writeFileSync(path.join(BASE, 'stage4-phase4ai-reclassification.json'), JSON.stringify(outJson, null, 2));
console.log('Wrote stage4-phase4ai-reclassification.json');

// --- Update Phase 4ag inventory ---
// Change all 196 tokens from UNREVIEWED to RETAIN_CONFIRMED
let updCount = 0;
const reclassSet = new Set(reclassified.map(r => r.ref));
for (const tok of ag.tokens) {
  if (reclassSet.has(tok.ref)) {
    tok.state = 'RETAIN_CONFIRMED';
    tok.phase = '4ai';
    tok.note = 'PHASE4H_INDIVIDUALLY_CONFIRMED_OK → reclassified by Phase 4ai';
    if (!tok.evidence_basis) tok.evidence_basis = 'PHASE4H_INDIVIDUALLY_CONFIRMED_OK';
    updCount++;
  }
}
console.log(`Updated ${updCount} tokens in Phase 4ag inventory`);

// Recompute state_summary
const stateCounts = {};
for (const tok of ag.tokens) {
  stateCounts[tok.state] = (stateCounts[tok.state] || 0) + 1;
}
ag.state_summary = stateCounts;
ag.meta.last_updated_phase = '4ai';
ag.meta.last_updated_date = '2026-11-01';

// Integrity check
const total = ag.tokens.length;
const sum = Object.values(stateCounts).reduce((a, b) => a + b, 0);
ag.integrity.total_tokens = total;
ag.integrity.state_sum = sum;
ag.integrity.phase4ai_check = (
  total === 92952 &&
  sum === 92952 &&
  stateCounts.UNREVIEWED === 46158 &&
  stateCounts.RETAIN_CONFIRMED === 46421
) ? 'PASS' : 'FAIL';

fs.writeFileSync(path.join(BASE, 'stage4-phase4ag-residual-inventory.json'), JSON.stringify(ag, null, 2));
console.log('Updated stage4-phase4ag-residual-inventory.json');
console.log('Final state summary:', JSON.stringify(stateCounts));
console.log('Integrity:', ag.integrity.phase4ai_check);
