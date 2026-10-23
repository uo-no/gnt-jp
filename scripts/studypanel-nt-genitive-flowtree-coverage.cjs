#!/usr/bin/env node
'use strict';

// Read-only NT-wide coverage audit: morphology-tagged genitives versus existing
// Lowfat-derived flow-tree word nodes, phrase ancestry, roles, and frame links.
// This measures annotation availability; it does not infer genitive semantics.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const loadJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const CASE = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const NUMBER = { S:'singular', P:'plural' };
const GENDER = { M:'masculine', F:'feminine', N:'neuter' };

function decodeCase(token) {
  if (token.case) {
    const c = String(token.case).toLowerCase();
    if (c === 'genitive' || c === 'g') return 'genitive';
    if (CASE[c.toUpperCase()]) return CASE[c.toUpperCase()];
  }
  const parts = String(token.morph || '').split('-');
  const pos = String(token.pos || parts[0] || '').replace(/-$/, '').toUpperCase();
  const seg = parts[1] || '';
  if (!seg) return '';
  if (pos === 'V') return '';
  const body = /^[123]/.test(seg) ? seg.slice(1) : seg;
  return CASE[body[0]] || '';
}
function flatten(root, out = []) {
  out.push(root);
  for (const child of root.children || []) flatten(child, out);
  return out;
}
function frameArgs(frame) {
  return [...String(frame || '').matchAll(/A\\d+:(n[0-9A-Za-z]+)/g)].map(m => m[1]);
}

const books = loadJson(path.join(PUBLIC, 'books.json'));
const report = {
  purpose: 'Counts the availability of existing structural annotations for morphology-tagged genitive tokens across the NT; not a semantic classification audit.',
  limitations: [
    'A word node or phrase ancestor does not establish the correct syntactic head.',
    'role labels describe the source tree annotation and do not encode genitive semantic subtype.',
    'frame links are predicate-to-argument links and are not expected to cover every nominal relation.',
    'No missing relation is inferred or generated.'
  ],
  books: 0, chapters: 0, tokensScanned: 0, genitiveTokens: 0,
  genitivesWithWordNode: 0, genitivesWithNodeRole: 0, genitivesWithOwnFrame: 0,
  genitivesWithPredicateFrameLink: 0, genitivesWithNpAncestor: 0,
  genitivesWithNpAncestorRole: 0, missingTreeChapter: [], missingWordNode: [],
  byBook: {}, samples: []
};
const failures = [];
for (const book of books.NT) {
  report.books++;
  const bookStats = report.byBook[book.key] = { chapters: 0, tokens: 0, genitives: 0, wordNode: 0, ownRole: 0, ownFrame: 0, frameLink: 0, npAncestor: 0 };
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const corpusPath = path.join(PUBLIC, 'bible_data', books.corpora.NT, book.key, chapter + '.json');
    const treePath = path.join(PUBLIC, 'assets', 'data', 'flow-tree', book.key, chapter + '.json');
    if (!fs.existsSync(corpusPath)) { failures.push('Missing NT corpus chapter: ' + book.key + ' ' + chapter); continue; }
    report.chapters++; bookStats.chapters++;
    const corpus = loadJson(corpusPath);
    report.tokensScanned += corpus.length; bookStats.tokens += corpus.length;
    if (!fs.existsSync(treePath)) {
      report.missingTreeChapter.push(book.key + ' ' + chapter);
      continue;
    }
    const tree = loadJson(treePath);
    const nodes = [];
    for (const root of tree.sentences || []) flatten(root, nodes);
    const byId = new Map(nodes.map(n => [n.id, n]));
    const parents = new Map(nodes.map(n => [n.id, n.parentId || null]));
    const frameTargets = new Map();
    for (const n of nodes) {
      for (const id of frameArgs(n.frame)) {
        if (!frameTargets.has(id)) frameTargets.set(id, []);
        frameTargets.get(id).push({ predicateId: n.id, role: n.role || null, frame: n.frame });
      }
    }
    for (const token of corpus) {
      if (decodeCase(token) !== 'genitive') continue;
      report.genitiveTokens++; bookStats.genitives++;
      const id = token.tokenId || token.globalIdx || '';
      const node = byId.get(id);
      const row = { ref: token.ref || null, tokenId: id || null, text: token.text || token.normalized || token.word || '', morph: token.morph || '', wordNode: !!node,
        nodeRole: node?.role || null, nodeFrame: node?.frame || null, npAncestors: [], predicateFramesTargetingToken: frameTargets.get(id) || [] };
      if (!node || node.type !== 'word') {
        report.missingWordNode.push({ ref: row.ref, tokenId: row.tokenId, text: row.text, morph: row.morph });
        if (report.samples.length < 30) report.samples.push(row);
        continue;
      }
      report.genitivesWithWordNode++; bookStats.wordNode++;
      if (node.role) { report.genitivesWithNodeRole++; bookStats.ownRole++; }
      if (node.frame) { report.genitivesWithOwnFrame++; bookStats.ownFrame++; }
      if (row.predicateFramesTargetingToken.length) { report.genitivesWithPredicateFrameLink++; bookStats.frameLink++; }
      let parentId = parents.get(id);
      const seen = new Set();
      while (parentId && byId.has(parentId) && !seen.has(parentId)) {
        seen.add(parentId);
        const p = byId.get(parentId);
        if (p.type === 'phrase.np') row.npAncestors.push({ id: p.id, role: p.role || null });
        parentId = parents.get(parentId);
      }
      if (row.npAncestors.length) {
        report.genitivesWithNpAncestor++; bookStats.npAncestor++;
        if (row.npAncestors.some(x => x.role)) report.genitivesWithNpAncestorRole++;
      }
      if (row.nodeRole || row.nodeFrame || row.predicateFramesTargetingToken.length || row.npAncestors.length === 0 || report.samples.length < 12) {
        if (report.samples.length < 200) report.samples.push(row);
      }
    }
  }
}
report.coverage = {
  wordNodePercent: report.genitiveTokens ? +(100 * report.genitivesWithWordNode / report.genitiveTokens).toFixed(2) : 0,
  ownRolePercent: report.genitiveTokens ? +(100 * report.genitivesWithNodeRole / report.genitiveTokens).toFixed(2) : 0,
  ownFramePercent: report.genitiveTokens ? +(100 * report.genitivesWithOwnFrame / report.genitiveTokens).toFixed(2) : 0,
  predicateFrameLinkPercent: report.genitiveTokens ? +(100 * report.genitivesWithPredicateFrameLink / report.genitiveTokens).toFixed(2) : 0,
  npAncestorPercent: report.genitiveTokens ? +(100 * report.genitivesWithNpAncestor / report.genitiveTokens).toFixed(2) : 0
};
const outPath = path.join(ROOT, 'studypanel-nt-genitive-flowtree-coverage-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\\n');
console.log(JSON.stringify({ books: report.books, chapters: report.chapters, tokensScanned: report.tokensScanned,
  genitiveTokens: report.genitiveTokens, coverage: report.coverage,
  missingTreeChapters: report.missingTreeChapter.length, missingWordNodes: report.missingWordNode.length,
  report: outPath, failures: failures.length }, null, 2));
if (failures.length) { console.error(failures.join('\\n')); process.exit(1); }
