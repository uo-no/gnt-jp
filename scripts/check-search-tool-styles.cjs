#!/usr/bin/env node
'use strict';

// R-f RF-2: computed-style probe for public/search-tool.html.
//
// Why: RF-2 removes !important declarations from search-tool.html's inline
// CSS (behavior-preserving specificity cleanup). Generated HTML does not
// change, so the safety property is "computed styles stay identical".
// This probe loads the page's real stylesheets (public/css/tokens.css,
// layout.css, components.css — in the page's <link> order — followed by the
// page's inline <style>) into jsdom over a fixture DOM that mirrors the
// affected elements and their state classes, then asserts the computed
// values of the affected properties. Run it against the pre-change and
// post-change file: all checks must pass on both.
//
// Limitation (by design, see phase-rf-design.md §9): jsdom does not evaluate
// @media rules by viewport. The 3 items inside @media (max-width: 700px) are
// therefore covered in phase 2 by a simulation: the media blocks' contents
// are unwrapped and appended after the base styles (their relative order in
// the file is preserved), approximating a <=700px viewport for the affected
// selectors. Preview smoke checks at mobile width remain the final word.
//
// Usage: node scripts/check-search-tool-styles.cjs [path-to-search-tool.html]
// jsdom must be resolvable (NODE_PATH or the bible-app harness install).

const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch (_) {
  const fallback = path.join(process.env.HOME || '', 'workspace/bible-app/harness/node_modules/jsdom');
  try {
    ({ JSDOM } = require(fallback));
  } catch (_) {
    console.error('check-search-tool-styles: jsdom is not resolvable. Set NODE_PATH to an install (e.g. ~/workspace/bible-app/harness/node_modules).');
    process.exit(2);
  }
}

const ROOT = process.cwd();
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'public/search-tool.html');

const html = fs.readFileSync(target, 'utf8');
const inlineStyles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
if (!inlineStyles) {
  console.error(`check-search-tool-styles: no inline <style> found in ${target}`);
  process.exit(2);
}
const externalCss = ['tokens.css', 'layout.css', 'components.css']
  .map(name => fs.readFileSync(path.join(ROOT, 'public/css', name), 'utf8'))
  .join('\n');

const FIXTURE = `
  <div class="s-search-block"><div class="idx-status" id="idx-pill"></div></div>
  <div class="mobile-overlay" id="mobile-overlay"></div>
  <button class="mobile-search-toggle" id="mobile-fab"></button>
  <div class="search-input-wrap"><button class="search-icon-btn" id="search-icon-btn"></button></div>
  <div id="layer-phrase"></div>
  <div id="phrase-sub" class="phrase-sub visible"></div>
  <div id="history-block"></div>
  <div id="history-recent-section"></div>
  <div class="search-filters multi-word"><div class="morph-sub is-open" id="ms-multi-open"></div></div>
  <div class="search-filters"><div class="morph-sub is-open" id="ms-open"></div></div>
  <div class="search-filters"><div class="morph-sub" id="ms-plain"></div></div>
  <div class="search-filters single-word"><button class="morph-panel-toggle" id="mpt-single"></button></div>
  <div class="search-filters"><button class="morph-panel-toggle" id="mpt-plain"></button></div>
  <div class="morph-section"><div class="morph-chips" id="chips-closed"></div></div>
  <div class="morph-section is-open"><div class="morph-chips" id="chips-open"></div></div>
`;

const dom = new JSDOM(`<!DOCTYPE html><html><head><style>${externalCss}\n${inlineStyles}</style></head><body>${FIXTURE}</body></html>`, {
  url: 'https://localhost/search-tool.html',
});
const { window } = dom;

// [element id, property, expected computed value, note]
const CHECKS = [
  ['idx-pill', 'display', 'none', 'idx-status is internal state, never reader-facing'],
  ['mobile-overlay', 'display', 'none', 'retired FAB overlay stays hidden'],
  ['mobile-fab', 'display', 'none', 'retired mobile search toggle stays hidden'],
  ['search-icon-btn', 'position', 'absolute', 'search icon anchored to the input'],
  ['search-icon-btn', 'right', '12px', 'search icon horizontal anchor'],
  ['search-icon-btn', 'top', '30px', 'search icon vertical anchor (fixed-height input)'],
  ['layer-phrase', 'display', 'none', 'phrase layer row removed by simplification'],
  ['phrase-sub', 'display', 'none', '#phrase-sub ID rule beats .phrase-sub.visible'],
  ['history-block', 'display', 'none', 'legacy history area hidden (data kept)'],
  ['history-recent-section', 'display', 'none', 'legacy recent-history area hidden'],
  ['ms-multi-open', 'display', 'none', 'multi-word queries never show the morph panel'],
  ['ms-open', 'display', 'block', 'single-word morph panel opens'],
  ['ms-plain', 'display', 'none', 'morph panel closed by default'],
  ['mpt-single', 'display', 'flex', 'single-word shows the morph panel toggle (desktop/base)'],
  ['mpt-plain', 'display', 'none', 'morph panel toggle hidden without a single-word query'],
  ['chips-closed', 'display', 'none', 'collapsed accordion section hides its chips'],
  ['chips-open', 'display', 'flex', 'open accordion section shows its chips'],
];

let failures = 0;
for (const [id, prop, expected, note] of CHECKS) {
  const el = window.document.getElementById(id);
  if (!el) { console.error(`FAIL #${id}: fixture element missing`); failures++; continue; }
  const actual = window.getComputedStyle(el).getPropertyValue(prop);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} #${id} ${prop}: expected "${expected}", got "${actual}" — ${note}`);
}
// position:relative on the wrapper is asserted via its child-independent rule target:
{
  const el = window.document.querySelector('.search-input-wrap');
  const actual = window.getComputedStyle(el).getPropertyValue('position');
  const ok = actual === 'relative';
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} .search-input-wrap position: expected "relative", got "${actual}" — anchor for the search icon`);
}
{
  const el = window.document.getElementById('search-icon-btn');
  const actual = window.getComputedStyle(el).getPropertyValue('transform');
  const ok = actual === 'translateY(-50%)';
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} #search-icon-btn transform: expected "translateY(-50%)", got "${actual}" — icon vertical centering`);
}

// ── Phase 2: @media (max-width: 700px) simulation ──────────────────────────
// Extract the media blocks' inner CSS (brace-matched) in file order.
function extractMediaBlocks(css, query) {
  const blocks = [];
  let idx = 0;
  while (true) {
    const at = css.indexOf(query, idx);
    if (at === -1) break;
    const open = css.indexOf('{', at);
    let depth = 0;
    let i = open;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') { depth--; if (depth === 0) break; }
    }
    blocks.push(css.slice(open + 1, i));
    idx = i + 1;
  }
  return blocks.join('\n');
}
const mediaCss = extractMediaBlocks(inlineStyles, '@media (max-width: 700px)');

const MOBILE_FIXTURE = `
  <div class="search-filters"><div class="morph-section"><div class="morph-chips morph-chip-group" id="m-chips-closed-group"></div></div></div>
  <div class="search-filters"><div class="morph-section is-open"><div class="morph-chips morph-chip-group" id="m-chips-open-group"></div></div></div>
  <div class="search-filters single-word"><button class="morph-panel-toggle" id="m-mpt-single"></button></div>
  <div class="search-filters"><div class="morph-sub" id="morph-sub"></div></div>
`;
// [body class, element id, property, expected, note]
const MOBILE_CHECKS = [
  ['', 'm-chips-closed-group', 'display', 'none', 'mobile: collapsed section stays collapsed despite the chip-group grid rule'],
  ['', 'm-chips-open-group', 'display', 'grid', 'mobile: open section lays chips out as a 2-column grid'],
  ['', 'm-mpt-single', 'display', 'none', 'mobile: panel toggle hidden (the FAB opens the filter sheet instead)'],
  ['', 'morph-sub', 'display', 'none', 'mobile: filter sheet hidden until opened'],
  ['morph-filter-open', 'morph-sub', 'display', 'block', 'mobile: body.morph-filter-open shows the filter sheet'],
];
let mobileTotal = 0;
for (const bodyClass of ['', 'morph-filter-open']) {
  const mdom = new JSDOM(`<!DOCTYPE html><html><head><style>${externalCss}\n${inlineStyles}\n${mediaCss}</style></head><body class="${bodyClass}">${MOBILE_FIXTURE}</body></html>`, {
    url: 'https://localhost/search-tool.html',
  });
  for (const [cls, id, prop, expected, note] of MOBILE_CHECKS) {
    if (cls !== bodyClass) continue;
    mobileTotal++;
    const el = mdom.window.document.getElementById(id);
    const actual = mdom.window.getComputedStyle(el).getPropertyValue(prop);
    const ok = actual === expected;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'} [mobile-sim] #${id} ${prop}: expected "${expected}", got "${actual}" — ${note}`);
  }
}

const total = CHECKS.length + 2 + mobileTotal;
if (failures > 0) {
  console.error(`check-search-tool-styles: FAIL — ${failures}/${total} computed-style checks failed for ${path.relative(ROOT, target)}`);
  process.exit(1);
}
console.log(`check-search-tool-styles: PASS — ${total}/${total} computed-style checks for ${path.relative(ROOT, target)} (phase 2 simulates @media (max-width: 700px); see header).`);
