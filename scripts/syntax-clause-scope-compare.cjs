#!/usr/bin/env node
'use strict';

// Whole-NT impact report for the clause-scoped narrative predicate fix.
// Only perfect-tense tokens need comparison because verb.perfect_dramatic is
// the sole registry type using clause_is_narrative().
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BASELINE_ROOT = process.env.SYNTAX_BASELINE_DIR || path.join(ROOT, 'baseline');
const baselinePath = path.join(BASELINE_ROOT, 'public/core/syntax-analyzer.js');
assert(fs.existsSync(baselinePath), 'PR base analyzer missing: ' + baselinePath);

global.decodeMorph = e => !e || typeof e !== 'object' ? {} : ({
  pos: e.pos || (e.class ? String(e.class).slice(0, 1).toUpperCase() : ''),
  tense: e.tense || '', voice: e.voice || '', mood: e.mood || '',
  case: e.case || '', number: e.number || '', gender: e.gender || '', person: e.person || '',
});
global.cleanText = e => {
  const s = e && typeof e === 'object' ? (e.text || e.normalized || '') : String(e || '');
  return s.replace(/[.,;:!?·—'··]+$/g, '').trim();
};
global.entryPosCode = t => {
  if (!t || typeof t !== 'object') return '';
  if (t.pos) return String(t.pos).replace(/-$/, '').toUpperCase();
  if (t.class) return ({verb:'V',noun:'N',adjective:'A',adj:'A',article:'T',det:'T',preposition:'P',prep:'P',conjunction:'C',conj:'C',adverb:'D',adv:'D',particle:'X',ptcl:'X',pronoun:'R',pron:'R',num:'M'})[String(t.class).toLowerCase()] || '';
  if (typeof t.morph === 'string' && t.morph) {
    const seg = t.morph.split('-')[0];
    if (seg === 'PREP' || seg === 'COND') return 'P';
    if (seg === 'CONJ') return 'C';
    if (seg === 'ADV' || seg === 'PRT') return 'D';
    if (seg === 'PART' || seg === 'INJ') return 'X';
    if (seg.length === 1) return seg;
  }
  if (t.mood || t.tense || t.voice) return 'V';
  return '';
};
function requireCjs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const mod = { exports: {}, id: filePath, filename: filePath, loaded: false };
  const fn = vm.runInThisContext('(function(module,exports,require,__dirname,__filename){\\n' + code + '\\n})', { filename: filePath, displayErrors: true });
  fn(mod, mod.exports, require, path.dirname(filePath), filePath);
  return mod.exports;
}
const baseline = requireCjs(baselinePath);
const current = requireCjs(path.join(PUBLIC, 'core/syntax-analyzer.js'));
const books = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'books.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'assets/data/syntax-registry.json'), 'utf8'));
const oldAnalyzer = new baseline.SyntaxAnalyzer(registry);
const newAnalyzer = new current.SyntaxAnalyzer(registry);
const report = {
  purpose: 'clause_is_narrative scope fix impact; review changes rather than require zero',
  corpus: { books: 0, chapters: 0, tokens: 0, verses: 0 },
  targets: { perfectTense: 0 },
  comparisons: { changedTargets: 0, changedScores: 0, rankChangedTargets: 0, candidatesAdded: 0, candidatesRemoved: 0 },
  changedExamples: [], byBook: {},
};
function candidateMap(output) {
  return new Map((output?.candidates || []).map((candidate, index) => [
    candidate.id, { rank: index + 1, score: Number(candidate.raw_score ?? candidate.rawScore ?? candidate.confidence ?? 0) }
  ]));
}
function verseKey(token) {
  const m = String(token.ref || '').match(/^([A-Z0-9]+)\\s+(\\d+):(\\d+)!/);
  return m ? m[1] + ' ' + m[2] + ':' + m[3] : null;
}
for (const book of books.NT) {
  report.corpus.books++;
  const bs = report.byBook[book.key] = { chapters: 0, tokens: 0, verses: 0, perfectTenseTargets: 0, changedTargets: 0 };
  const dir = path.join(PUBLIC, 'bible_data', books.corpora.NT, book.key);
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const chapterPath = path.join(dir, String(chapter) + '.json');
    assert(fs.existsSync(chapterPath), 'missing NT chapter ' + book.key + ' ' + chapter);
    const tokens = JSON.parse(fs.readFileSync(chapterPath, 'utf8'));
    report.corpus.chapters++; bs.chapters++;
    report.corpus.tokens += tokens.length; bs.tokens += tokens.length;
    const verses = new Map();
    for (const token of tokens) {
      const key = verseKey(token);
      if (key) { if (!verses.has(key)) verses.set(key, []); verses.get(key).push(token); }
    }
    report.corpus.verses += verses.size; bs.verses += verses.size;
    for (const [ref, verseTokens] of verses) {
      for (let targetIdx = 0; targetIdx < verseTokens.length; targetIdx++) {
        const target = verseTokens[targetIdx];
        if (global.decodeMorph(target).tense !== 'perfect') continue;
        report.targets.perfectTense++; bs.perfectTenseTargets++;
        const input = { target, tokens: verseTokens, targetIdx };
        const oldMap = candidateMap(oldAnalyzer.analyze(input));
        const newMap = candidateMap(newAnalyzer.analyze(input));
        const ids = new Set([...oldMap.keys(), ...newMap.keys()]);
        let changed = false, scoreChanged = false;
        const diffs = [];
        for (const id of ids) {
          const a = oldMap.get(id), b = newMap.get(id);
          if (!a) { report.comparisons.candidatesAdded++; changed = true; diffs.push({id, old:null, new:b}); }
          else if (!b) { report.comparisons.candidatesRemoved++; changed = true; diffs.push({id, old:a, new:null}); }
          else if (a.score !== b.score) {
            report.comparisons.changedScores++; changed = true; scoreChanged = true;
            diffs.push({id, old:a, new:b, delta:b.score-a.score});
          } else if (a.rank !== b.rank) { changed = true; diffs.push({id, old:a, new:b}); }
        }
        const oldOrder = [...oldMap.keys()].join('|'), newOrder = [...newMap.keys()].join('|');
        const rankChanged = oldOrder !== newOrder;
        if (changed || rankChanged) {
          report.comparisons.changedTargets++;
          if (rankChanged) report.comparisons.rankChangedTargets++;
          bs.changedTargets++;
          if (report.changedExamples.length < 250) report.changedExamples.push({
            ref, book:book.key, tokenIndex:target.tokenIndex, text:target.text, lemma:target.lemma,
            oldCandidates:[...oldMap.entries()].map(([id,v])=>({id,...v})),
            newCandidates:[...newMap.entries()].map(([id,v])=>({id,...v})),
            changed:diffs,
          });
        }
      }
    }
  }
}
assert.equal(report.corpus.books, 27, 'expected all 27 NT books');
assert.equal(report.corpus.chapters, 260, 'expected all 260 NT chapters');
assert(report.corpus.tokens > 100000, 'unexpectedly low NT token count');
assert(report.targets.perfectTense > 0, 'no perfect-tense targets evaluated');
fs.writeFileSync(path.join(ROOT, 'syntax-clause-scope-compare-report.json'), JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify({
  corpus: report.corpus, targets: report.targets, comparisons: report.comparisons,
  changedExamples: report.changedExamples.length,
  report: 'syntax-clause-scope-compare-report.json'
}, null, 2));
