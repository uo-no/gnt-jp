#!/usr/bin/env node
'use strict';

// Read-only audit of existing MACULA/Lowfat structural annotations for published
// bare-source-genitive examples. Does not classify genitives or alter the analyzer.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ASSET = path.join(ROOT, 'public', 'assets', 'data', 'flow-tree');
const targets = [
  { book: '2CO', chapter: 11, verse: 26, id: 'n47011026004', ref: '2CO 11:26!4', text: 'ποταμῶν',
    expectedAncestorType: 'phrase.np', expectedAncestorRole: 'p', expectedNodeRole: '', expectedFrame: '' },
  { book: '2CO', chapter: 11, verse: 26, id: 'n47011026006', ref: '2CO 11:26!6', text: 'λῃστῶν',
    expectedAncestorType: 'phrase.np', expectedRole: 'p', expectedFrame: '' },
  { book: 'JHN', chapter: 6, verse: 45, id: 'n43006045010', ref: 'JHN 6:45!10', text: 'θεοῦ',
    expectedAncestorType: 'phrase.np', expectedRole: 'p', expectedFrame: '' },
  { book: 'LUK', chapter: 19, verse: 8, id: 'n42019008013', ref: 'LUK 19:8!13', text: 'ὑπαρχόντων',
    expectedAncestorType: 'phrase.np', expectedAncestorRole: 'o', expectedNodeRole: 'v', expectedFrame: 'A0:n00000000000' }
];

const report = {
  purpose: 'Read-only inventory of existing Lowfat-derived role/frame/tree facts; not a gold-standard syntax judgment.',
  limitations: [
    'role is the source annotation copied from Lowfat; it does not by itself specify a genitive semantic relation.',
    'frame is a predicate-to-argument annotation, not a general noun/participle dependency graph.',
    'phrase/clause nesting records containment, not necessarily head-governor relations.',
    'No missing relation is inferred or generated.'
  ],
  targets: []
};
let failures = 0;
function check(ok, label, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : ' — ' + detail));
  if (!ok) failures++;
}
function flatten(root) {
  const nodes = [];
  function walk(n) { nodes.push(n); (n.children || []).forEach(walk); }
  walk(root);
  return nodes;
}
function frameArgs(frame) {
  return [...String(frame || '').matchAll(/A\d+:(n[0-9A-Za-z]+)/g)].map(m => m[1]);
}

const chapterCache = new Map();
for (const target of targets) {
  const key = target.book + '/' + target.chapter;
  if (!chapterCache.has(key)) {
    const file = path.join(ASSET, target.book, target.chapter + '.json');
    chapterCache.set(key, JSON.parse(fs.readFileSync(file, 'utf8')));
  }
  const data = chapterCache.get(key);
  const roots = data.sentences.filter(root => flatten(root).some(n => n.id === target.id));
  check(roots.length === 1, target.ref + ' resolves to exactly one sentence tree', 'matches=' + roots.length);
  if (roots.length !== 1) continue;

  const root = roots[0];
  const nodes = flatten(root);
  const byId = new Map(nodes.map(n => [n.id, n]));
  const node = byId.get(target.id);
  check(!!node && node.type === 'word', target.ref + ' resolves to a word node', 'missing or non-word');
  if (!node) continue;

  const ancestors = [];
  let parentId = node.parentId;
  while (parentId && byId.has(parentId)) {
    const parent = byId.get(parentId);
    ancestors.push({ id: parent.id, type: parent.type, role: parent.role || null, tokens: parent.tokens || [] });
    parentId = parent.parentId;
  }
  const frameLinksToTarget = nodes
    .filter(n => n.frame && frameArgs(n.frame).includes(target.id))
    .map(n => ({ predicateId: n.id, role: n.role || null, frame: n.frame }));
  const localFrames = nodes.filter(n => n.frame).map(n => ({
    predicateId: n.id, role: n.role || null, frame: n.frame,
    arguments: frameArgs(n.frame)
  }));
  const expectedAncestor = ancestors.find(a => a.type === target.expectedAncestorType && (a.role || '') === target.expectedAncestorRole);
  check(!!expectedAncestor, target.ref + ' has expected structural ancestor ' + target.expectedAncestorType + ' role=' + target.expectedAncestorRole,
    'ancestors=' + ancestors.map(a => a.type + (a.role ? '[' + a.role + ']' : '')).join(' > '));
  check((node.role || '') === target.expectedNodeRole, target.ref + ' word role remains as audited',
    'role=' + (node.role || ''));
  check((node.frame || '') === target.expectedFrame, target.ref + ' word frame remains as audited',
    'frame=' + (node.frame || ''));
  check(frameLinksToTarget.length === 0, target.ref + ' has no predicate frame directly targeting this token',
    JSON.stringify(frameLinksToTarget));

  report.targets.push({
    ref: target.ref, text: target.text, tokenId: target.id,
    node: { id: node.id, type: node.type, role: node.role || null, frame: node.frame || null },
    ancestors,
    frameLinksToTarget,
    localFrames,
    interpretationBoundary: 'Structural/role/frame observations only; no genitive subtype is assigned.'
  });
}

const outPath = path.join(ROOT, 'studypanel-bare-source-genitive-flowtree-report.json');
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ targets: report.targets.length, report: outPath, failures }, null, 2));
if (failures) process.exit(1);
