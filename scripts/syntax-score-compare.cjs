#!/usr/bin/env node
'use strict';
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
  const fn = vm.runInThisContext('(function(module,exports,require,__dirname,__filename){\n' + code + '\n})', { filename: filePath, displayErrors: true });
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
  baselineAnalyzer: baselinePath, currentAnalyzer: path.join(PUBLIC, 'core/syntax-analyzer.js'),
  corpus: { books: 0, chapters: 0, tokens: 0, verses: 0 },
  targets: { total: 0, genitive: 0, dative: 0, participle: 0 },
  comparisons: { changedTargets: 0, changedScores: 0, rankChangedTargets: 0, candidatesAdded: 0, candidatesRemoved: 0, scoreIncreases: 0, scoreDecreases: 0, maxAbsScoreDelta: 0 },
  byBook: {}, changedExamples: [], changedTypeCounts: {},
};
function candidateMap(output) {
  return new Map((output?.candidates || []).map((candidate, index) => [
    candidate.id, { rank: index + 1, score: Number(candidate.raw_score ?? candidate.rawScore ?? candidate.confidence ?? 0) }
  ]));
}
function verseKey(token) {
  const m = String(token.ref || '').match(/^([A-Z0-9]+)\s+(\d+):(\d+)!/);
  return m ? m[1] + ' ' + m[2] + ':' + m[3] : null;
}
for (const book of books.NT) {
  report.corpus.books++;
  const bs = report.byBook[book.key] = { name: book.name, chapters: 0, tokens: 0, verses: 0, targets: 0, changedTargets: 0, changedScores: 0, rankChangedTargets: 0 };
  const dir = path.join(PUBLIC, 'bible_data', books.corpora.NT, book.key);
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const chapterPath = path.join(dir, String(chapter) + '.json');
    assert(fs.existsSync(chapterPath), 'missing NT chapter ' + book.key + ' ' + chapter + ': ' + chapterPath);
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
        const morph = global.decodeMorph(target);
        const kind = morph.case === 'genitive' ? 'genitive' : morph.case === 'dative' ? 'dative' : morph.mood === 'participle' ? 'participle' : null;
        if (!kind) continue;
        report.targets.total++; report.targets[kind]++; bs.targets++;
        const input = { target, tokens: verseTokens, targetIdx };
        const oldMap = candidateMap(oldAnalyzer.analyze(input));
        const newMap = candidateMap(newAnalyzer.analyze(input));
        const ids = new Set([...oldMap.keys(), ...newMap.keys()]);
        const changed = [];
        let scoreChanged = false;
        for (const id of ids) {
          const oldV = oldMap.get(id), newV = newMap.get(id);
          if (!oldV) { report.comparisons.candidatesAdded++; changed.push({id, old:null, new:newV}); continue; }
          if (!newV) { report.comparisons.candidatesRemoved++; changed.push({id, old:oldV, new:null}); continue; }
          if (oldV.score !== newV.score) {
            const delta = newV.score - oldV.score;
            report.comparisons.changedScores++;
            report.comparisons.maxAbsScoreDelta = Math.max(report.comparisons.maxAbsScoreDelta, Math.abs(delta));
            if (delta > 0) report.comparisons.scoreIncreases++;
            if (delta < 0) report.comparisons.scoreDecreases++;
            report.changedTypeCounts[id] = (report.changedTypeCounts[id] || 0) + 1;
            scoreChanged = true; changed.push({id, old:oldV, new:newV, delta});
          } else if (oldV.rank !== newV.rank) changed.push({id, old:oldV, new:newV});
        }
        const oldOrder = [...oldMap.keys()].join('|'), newOrder = [...newMap.keys()].join('|');
        const rankChanged = oldOrder !== newOrder;
        if (changed.length || rankChanged) {
          report.comparisons.changedTargets++; bs.changedTargets++;
          if (scoreChanged) bs.changedScores++;
          if (rankChanged) { report.comparisons.rankChangedTargets++; bs.rankChangedTargets++; }
          if (report.changedExamples.length < 100) report.changedExamples.push({
            ref, book:book.key, tokenIndex:target.tokenIndex, text:target.text, lemma:target.lemma, kind,
            oldCandidates:[...oldMap.entries()].map(([id,v])=>({id,...v})),
            newCandidates:[...newMap.entries()].map(([id,v])=>({id,...v})), changed,
          });
        }
      }
    }
  }
}
assert.equal(report.corpus.books, 27, 'expected all 27 NT books');
assert.equal(report.corpus.chapters, 260, 'expected all 260 NT chapters');
assert(report.corpus.tokens > 100000, 'unexpectedly low NT token count: ' + report.corpus.tokens);
assert(report.targets.total > 0, 'no syntax-scored targets were evaluated');
const outPath = path.join(ROOT, 'syntax-score-compare-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
assert.equal(report.comparisons.changedScores, 0, 'tri-state change must not alter any NT candidate score without an explicit reviewed baseline update');
assert.equal(report.comparisons.rankChangedTargets, 0, 'tri-state change must not alter NT candidate rankings without an explicit reviewed baseline update');
assert.equal(report.comparisons.candidatesAdded, 0, 'tri-state change must not add NT candidates unexpectedly');
assert.equal(report.comparisons.candidatesRemoved, 0, 'tri-state change must not remove NT candidates unexpectedly');
console.log('Whole-NT syntax score/rank comparison');
console.log(JSON.stringify({
  corpus:report.corpus, targets:report.targets, comparisons:report.comparisons,
  changedTypeCounts:report.changedTypeCounts,
  byBook:Object.fromEntries(Object.entries(report.byBook).map(([key,v])=>[key,{targets:v.targets,changedTargets:v.changedTargets,changedScores:v.changedScores,rankChangedTargets:v.rankChangedTargets}])),
  report:outPath,
}, null, 2));
console.log('PASS whole-NT baseline comparison completed');
