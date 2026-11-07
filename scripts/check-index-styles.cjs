#!/usr/bin/env node
'use strict';

// R-f RF-3: computed-style probe for public/index.html (base layer) and
// public/assets/js/onboarding.js (injected styles).
//
// Why: RF-3 removes !important declarations from index.html's base layer
// (retired-UI rules, .hl-word-* highlight colors, #app state-class FAB
// hiding, the chapter-navigation loading guard) and from onboarding.js's
// .ob-pulse rule, using specificity adjustments instead. Generated HTML
// does not change, so the safety property is "computed styles stay
// identical". This probe loads the page's real stylesheets
// (public/css/tokens.css, layout.css, components.css — in the page's
// <link> order — followed by the page's inline <style> blocks in document
// order) into jsdom over fixture DOMs that mirror the affected elements
// and their state classes, then asserts the computed values of the
// affected properties. Run it against the pre-change and post-change
// files: all checks must pass on both.
//
// Deliberate residuals (documented in the code, asserted here as-is):
//  - #mobile-fab-overlay state rules keep !important: the overlay's
//    display is driven by JS inline style (_fabOpen/_fabClose in
//    mobile-nav.js), and only !important guarantees the overlay stays
//    hidden under a state class even if an inline display:block lingers.
//    The probe asserts exactly that behavior (inline block + state class
//    => computed none).
//  - onboarding's _forceShowCompareOnMobile override keeps its two
//    !important declarations: its competitors are index's @media
//    (max-width: 900px) compare-mode rules, which still carry !important
//    (RF-4/RF-5 scope). The override text is mirrored below as a fixture
//    constant; if that function changes, update the mirror.
//
// Limitation (by design, see phase-rf-design.md §9): jsdom does not
// evaluate @media rules by viewport, and does not apply :hover/:active
// pseudo states. Phase 2 therefore simulates a <=600px viewport by
// unwrapping @media (max-width: 900px) and (max-width: 600px) blocks
// (their relative order in the file is preserved) and appending them
// after the base styles. Pseudo-state competitors (.wlv-chip:hover etc.)
// are covered analytically by the specificity design (1,3,0 beats 0,2,0
// in every state) and by the class-based competitor check
// (.hl-multi-selected) in phase 1. Preview smoke checks remain the
// final word for real viewports.
//
// RF-4 (phase 4) extends the same simulation to the three width bands
// of the breakpoint display switching: <=768px, 769-900px and >=901px.
// The 900/901 pair rules are mostly removed by source order / equal
// specificity; the >=901 picker / more-menu hides pair the plain and
// open-state selectors so they tie the base .mbp-open / .mmp-open /
// .open rules (1,1,0) and win by later position; the >=769
// #study-verse-nav hide is scoped to #app (2,0,0) to beat .is-visible
// (1,1,0) in the 769-900px overlap. Deliberate RF-4 residuals, asserted
// as-is below: the two >=901 overlay hides (JS inline display:block can
// linger across a resize; only !important guarantees hidden — same
// reason as the RF-3 base residuals), the <=900 #open-panel-btn hide
// (closeStudyPanel sets inline display:block regardless of width) and
// the <=900 #mvv-reading-slot display:contents (the slot's display is
// JS-inline-driven block/none; contents must always win so the slot
// stays layout-transparent).
//
// Usage: node scripts/check-index-styles.cjs [path-to-index.html] [path-to-onboarding.js]
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
    console.error('check-index-styles: jsdom is not resolvable. Set NODE_PATH to an install (e.g. ~/workspace/bible-app/harness/node_modules).');
    process.exit(2);
  }
}

const ROOT = process.cwd();
const indexPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'public/index.html');
const onboardingPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(ROOT, 'public/assets/js/onboarding.js');

const html = fs.readFileSync(indexPath, 'utf8');
const inlineStyles = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
if (!inlineStyles) {
  console.error(`check-index-styles: no inline <style> found in ${indexPath}`);
  process.exit(2);
}
const externalCss = ['tokens.css', 'layout.css', 'components.css']
  .map(name => fs.readFileSync(path.join(ROOT, 'public/css', name), 'utf8'))
  .join('\n');
const baseCss = `${externalCss}\n${inlineStyles}`;

// onboarding.js's injected stylesheet: the `const _css = \`...\`;` template
// literal (injected as <style id="ob-styles">, appended last in <head>).
const obSrc = fs.readFileSync(onboardingPath, 'utf8');
const obCssStart = obSrc.indexOf('const _css = `');
if (obCssStart === -1) { console.error('check-index-styles: onboarding _css literal not found'); process.exit(2); }
const obCssEnd = obSrc.indexOf('`;', obCssStart);
const obCss = obSrc.slice(obCssStart + 'const _css = `'.length, obCssEnd);
if (!obCss.includes('.ob-pulse')) { console.error('check-index-styles: onboarding _css extraction looks wrong (no .ob-pulse)'); process.exit(2); }

// Mirror of the style text injected by onboarding's
// _forceShowCompareOnMobile() (#ob-mobile-compare-override, appended to
// <head> at runtime, i.e. after every page stylesheet).
const COMPARE_OVERRIDE_CSS = [
  '#main-reading-area.compare-mode {',
  '    grid-template-columns: 1fr 1fr !important;',
  '}',
  '#main-reading-area.compare-mode #parallel-text-area,',
  '#main-reading-area.compare-mode .verse-pair-right,',
  '#main-reading-area.compare-mode .verse-grid-spacer-right,',
  '#main-reading-area.compare-mode .verse-grid-footer-right {',
  '    display: block !important;',
  '}',
].join('\n');

let failures = 0;
let total = 0;
function check(label, el, prop, expected) {
  total++;
  if (!el) { failures++; console.log(`FAIL ${label}: fixture element missing`); return; }
  const actual = el.ownerDocument.defaultView.getComputedStyle(el).getPropertyValue(prop);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: expected "${expected}", got "${actual}"`);
}
function makeDom(cssText, bodyHtml, bodyClass) {
  return new JSDOM(`<!DOCTYPE html><html><head><style>${cssText}</style></head><body${bodyClass ? ` class="${bodyClass}"` : ''}>${bodyHtml}</body></html>`, {
    url: 'https://localhost/',
  });
}

// ── Phase 1: base layer (no @media simulation) ─────────────────────────
const HL = {
  yellow: 'rgba(252, 204, 0, 0.28)',
  blue: 'rgba(0, 76, 151, 0.25)',
  green: 'rgba(21, 114, 44, 0.25)',
  red: 'rgba(235, 97, 0, 0.25)',
};
function appFixture(appClass) {
  return `
  <div id="app" class="${appClass}">
    <div id="main-reading-area">
      <div id="bible-text-area">
        ${Object.keys(HL).map(c => `<span class="wlv-chip hl-word-${c}" id="chip-${c}">w</span>`).join('')}
        <span class="wlv-chip hl-word-yellow hl-multi-selected" id="chip-multi">w</span>
      </div>
      <div id="parallel-text-area"></div>
    </div>
    <div id="mobile-verse-view">
      <div id="mobile-verse-area"><span class="wlv-chip hl-word-blue" id="chip-mvv">w</span></div>
      <div id="mobile-inspector-area"></div>
    </div>
    <div id="analysis-frame-wrap"></div>
    <div id="mobile-fab-overlay"></div>
    <div id="mobile-fab"></div>
  </div>`;
}
for (const appClass of ['', 'mobile-mvv-open', 'mobile-picker-open', 'mobile-study-open']) {
  const tag = appClass || 'no-state';
  const dom = makeDom(baseCss, appFixture(appClass));
  const d = dom.window.document;
  check(`[${tag}] #analysis-frame-wrap display`, d.getElementById('analysis-frame-wrap'), 'display', 'none');
  check(`[${tag}] #mobile-fab display`, d.getElementById('mobile-fab'), 'display', 'none');
  check(`[${tag}] #mobile-fab-overlay display`, d.getElementById('mobile-fab-overlay'), 'display', 'none');
  if (!appClass) {
    for (const [color, value] of Object.entries(HL)) {
      check(`[${tag}] .wlv-chip.hl-word-${color} background-color`, d.getElementById(`chip-${color}`), 'background-color', value);
    }
    check(`[${tag}] .wlv-chip.hl-word-yellow.hl-multi-selected background-color`, d.getElementById('chip-multi'), 'background-color', HL.yellow);
    check(`[${tag}] #mobile-verse-area .wlv-chip.hl-word-blue background-color`, d.getElementById('chip-mvv'), 'background-color', HL.blue);
    check(`[${tag}] #main-reading-area pointer-events (no loading class)`, d.getElementById('main-reading-area'), 'pointer-events', 'auto');
  }
}
// Loading guard: body class present.
{
  const dom = makeDom(baseCss, appFixture(''), 'chapter-navigation-loading');
  check('[loading] #main-reading-area pointer-events', dom.window.document.getElementById('main-reading-area'), 'pointer-events', 'none');
}
// Overlay residual: inline display:block (as _fabOpen leaves it) must be
// overridden by the state-class rule, and must win without a state class.
{
  const dom = makeDom(baseCss, appFixture('mobile-picker-open'));
  const ov = dom.window.document.getElementById('mobile-fab-overlay');
  ov.style.display = 'block';
  check('[picker-open + inline block] #mobile-fab-overlay display', ov, 'display', 'none');
}
{
  const dom = makeDom(baseCss, appFixture(''));
  const ov = dom.window.document.getElementById('mobile-fab-overlay');
  ov.style.display = 'block';
  check('[no-state + inline block] #mobile-fab-overlay display', ov, 'display', 'block');
}

// ── Phase 2: <=600px viewport simulation ───────────────────────────────
// Unwrap @media (max-width: 900px) and (max-width: 600px) blocks
// (brace-matched, repeatedly, in file order) and append after base CSS.
function unwrapMedia(css, query) {
  let out = css;
  for (;;) {
    const at = out.indexOf(query);
    if (at === -1) break;
    const open = out.indexOf('{', at);
    let depth = 0;
    let i = open;
    for (; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') { depth--; if (depth === 0) break; }
    }
    const inner = out.slice(open + 1, i);
    out = out.slice(0, at) + '\n' + inner + '\n' + out.slice(i + 1);
  }
  return out;
}
// Comments are stripped first: a comment that merely mentions a media
// query (e.g. an RF-3 note citing "@media (max-width: 900px)") must not
// be mistaken for a real block by the brace matcher.
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const mobileCss = unwrapMedia(unwrapMedia(stripComments(baseCss), '@media (max-width: 900px)'), '@media (max-width: 600px)');
{
  const dom = makeDom(mobileCss, appFixture(''));
  const d = dom.window.document;
  check('[mobile] #mobile-fab display (FAB enabled <=900px)', d.getElementById('mobile-fab'), 'display', 'flex');
  check('[mobile] #mobile-verse-area chip hl background', d.getElementById('chip-mvv'), 'background-color', HL.blue);
}
for (const appClass of ['mobile-mvv-open', 'mobile-picker-open', 'mobile-study-open']) {
  const dom = makeDom(mobileCss, appFixture(appClass));
  check(`[mobile ${appClass}] #mobile-fab display`, dom.window.document.getElementById('mobile-fab'), 'display', 'none');
  check(`[mobile ${appClass}] #mobile-fab-overlay display`, dom.window.document.getElementById('mobile-fab-overlay'), 'display', 'none');
}
{
  // The comparison-polish @media rule for .active chips (1,2,0) must not
  // override a highlight color on an active chip.
  const fixture = `
  <div id="app"><div id="mobile-verse-view"><div id="mobile-verse-area">
    <span class="wlv-chip active hl-word-yellow" id="chip-active-hl">w</span>
    <span class="wlv-chip active" id="chip-active-only">w</span>
  </div></div></div>`;
  const dom = makeDom(mobileCss, fixture);
  const d = dom.window.document;
  check('[mobile] .wlv-chip.active.hl-word-yellow background-color', d.getElementById('chip-active-hl'), 'background-color', HL.yellow);
  check('[mobile] .wlv-chip.active background-color (polish rule intact)', d.getElementById('chip-active-only'), 'background-color', 'rgba(44, 79, 52, 0.09)');
}
{
  // Compare-mode: index @media rules alone collapse to one column and
  // hide the right column; the onboarding override restores two columns.
  const fixture = `
  <div id="app"><div id="main-reading-area" class="compare-mode">
    <div id="parallel-text-area"></div>
    <div class="verse-pair-right" id="vpr"></div>
  </div></div>`;
  const domA = makeDom(mobileCss, fixture);
  const dA = domA.window.document;
  check('[mobile compare] grid-template-columns (index rules only)', dA.getElementById('main-reading-area'), 'grid-template-columns', '1fr');
  check('[mobile compare] #parallel-text-area display (index rules only)', dA.getElementById('parallel-text-area'), 'display', 'none');
  const domB = makeDom(`${mobileCss}\n${COMPARE_OVERRIDE_CSS}`, fixture);
  const dB = domB.window.document;
  check('[mobile compare + override] grid-template-columns', dB.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
  check('[mobile compare + override] #parallel-text-area display', dB.getElementById('parallel-text-area'), 'display', 'block');
  check('[mobile compare + override] .verse-pair-right display', dB.getElementById('vpr'), 'display', 'block');
}

// ── Phase 3: onboarding .ob-pulse (stylesheet appended last, as at runtime) ──
{
  const fixture = `
  <div id="app"><div id="main-reading-area"><div id="bible-text-area">
    <span class="wlv-chip ob-pulse" id="pulse-chip">w</span>
    <span class="ja-seg ob-pulse" id="pulse-seg">w</span>
  </div></div>
  <div class="word-card ob-pulse" id="pulse-card">w</div>
  <div class="verse-block ob-pulse" id="pulse-block">w</div>
  <span class="ob-pulse" id="pulse-bare">w</span></div>`;
  const dom = makeDom(`${baseCss}\n${obCss}`, fixture);
  const d = dom.window.document;
  check('[pulse] .wlv-chip.ob-pulse cursor', d.getElementById('pulse-chip'), 'cursor', 'pointer');
  check('[pulse] .ja-seg.ob-pulse cursor', d.getElementById('pulse-seg'), 'cursor', 'pointer');
  check('[pulse] .word-card.ob-pulse cursor', d.getElementById('pulse-card'), 'cursor', 'pointer');
  check('[pulse] .verse-block.ob-pulse cursor', d.getElementById('pulse-block'), 'cursor', 'pointer');
  check('[pulse] bare .ob-pulse cursor', d.getElementById('pulse-bare'), 'cursor', 'pointer');
}

// ── Phase 4 (RF-4): width-band simulation for breakpoint display switching ──
// jsdom never applies @media, so a band is simulated by unwrapping the
// in-band queries in place (relative order preserved) and removing the
// out-of-band max-width blocks; leftover out-of-band min-width blocks
// stay wrapped and inert.
function removeMedia(css, query) {
  let out = css;
  for (;;) {
    const at = out.indexOf(query);
    if (at === -1) break;
    const open = out.indexOf('{', at);
    let depth = 0;
    let i = open;
    for (; i < out.length; i++) {
      if (out[i] === '{') depth++;
      else if (out[i] === '}') { depth--; if (depth === 0) break; }
    }
    out = out.slice(0, at) + '\n' + out.slice(i + 1);
  }
  return out;
}
const bandA = unwrapMedia(unwrapMedia(unwrapMedia(stripComments(baseCss),
  '@media (max-width: 900px)'), '@media (max-width: 768px)'), '@media (max-width: 600px)');
const bandB = unwrapMedia(unwrapMedia(stripComments(baseCss),
  '@media (max-width: 900px)'), '@media (min-width: 769px)');
const bandC = unwrapMedia(unwrapMedia(
  removeMedia(removeMedia(removeMedia(stripComments(baseCss),
    '@media (max-width: 900px)'), '@media (max-width: 768px)'), '@media (max-width: 600px)'),
  '@media (min-width: 901px)'), '@media (min-width: 769px)');

function rf4Fixture(appClass) {
  return `
  <header class="app-header">
    <button id="mobile-menu-btn"></button>
    <div id="global-breadcrumb"></div>
    <button id="mobile-location-btn"></button>
    <button id="open-panel-btn"></button>
    <button id="research-open-btn"></button>
    <div id="header-lang-toggle"></div>
    <button id="mobile-more-btn"></button>
  </header>
  <div id="app" class="${appClass}">
    <div id="mobile-nav-bar"><button id="mobile-panel-back"></button></div>
    <div id="main-reading-area"><div id="parallel-text-area"></div></div>
    <div id="study-verse-nav"></div>
    <div id="mobile-inspector-area"><div id="mvv-reading-slot"></div></div>
    <div id="mobile-fab-overlay"></div>
    <div id="mobile-fab"></div>
  </div>
  <div id="mobile-book-picker"></div>
  <div id="mobile-mode-picker"></div>
  <div id="mobile-more-overlay"></div>
  <div id="mobile-more-menu"></div>`;
}
function bandChecks(bandLabel, css, spec) {
  const dom = makeDom(css, rf4Fixture(spec.appClass || ''));
  const d = dom.window.document;
  const byId = id => d.getElementById(id);
  for (const [label, id, expected] of spec.plain) {
    check(`[${bandLabel}] ${label}`, byId(id), 'display', expected);
  }
  for (const [label, id, cls, expected] of spec.withClass || []) {
    const el = byId(id);
    el.classList.add(cls);
    check(`[${bandLabel}] ${label}`, el, 'display', expected);
    el.classList.remove(cls);
  }
  for (const [label, id, inline, expected] of spec.withInline || []) {
    const el = byId(id);
    el.style.display = inline;
    check(`[${bandLabel}] ${label}`, el, 'display', expected);
    el.style.display = '';
  }
  return dom;
}
// Band A: <=768px (all max-width blocks active, min-width blocks inert)
bandChecks('rf4 <=768px', bandA, {
  plain: [
    ['#mobile-nav-bar display', 'mobile-nav-bar', 'flex'],
    ['#mobile-panel-back display', 'mobile-panel-back', 'flex'],
    ['#mobile-menu-btn display', 'mobile-menu-btn', 'none'],
    ['#header-lang-toggle display', 'header-lang-toggle', 'none'],
    ['#global-breadcrumb display', 'global-breadcrumb', 'none'],
    ['#research-open-btn display', 'research-open-btn', 'none'],
    ['#open-panel-btn display', 'open-panel-btn', 'none'],
    ['#mobile-location-btn display', 'mobile-location-btn', 'flex'],
    ['#mobile-more-btn display', 'mobile-more-btn', 'flex'],
    ['#mobile-fab display', 'mobile-fab', 'flex'],
    ['#mobile-fab-overlay display', 'mobile-fab-overlay', 'none'],
    ['#study-verse-nav display', 'study-verse-nav', 'none'],
    ['#mvv-reading-slot display', 'mvv-reading-slot', 'contents'],
    ['#mobile-book-picker display', 'mobile-book-picker', 'none'],
    ['#mobile-mode-picker display', 'mobile-mode-picker', 'none'],
    ['#mobile-more-overlay display', 'mobile-more-overlay', 'none'],
    ['#mobile-more-menu display', 'mobile-more-menu', 'none'],
  ],
  withClass: [
    ['#study-verse-nav.is-visible display', 'study-verse-nav', 'is-visible', 'flex'],
    ['#mobile-book-picker.mbp-open display', 'mobile-book-picker', 'mbp-open', 'flex'],
    ['#mobile-mode-picker.mmp-open display', 'mobile-mode-picker', 'mmp-open', 'flex'],
    ['#mobile-more-menu.open display', 'mobile-more-menu', 'open', 'block'],
  ],
  withInline: [
    ['#open-panel-btn display (inline block, residual !important)', 'open-panel-btn', 'block', 'none'],
    ['#mobile-fab-overlay display (inline block, no state class)', 'mobile-fab-overlay', 'block', 'block'],
    ['#mobile-more-overlay display (inline block)', 'mobile-more-overlay', 'block', 'block'],
    ['#mvv-reading-slot display (inline block, residual !important)', 'mvv-reading-slot', 'block', 'contents'],
    ['#mvv-reading-slot display (inline none, residual !important)', 'mvv-reading-slot', 'none', 'contents'],
  ],
});
bandChecks('rf4 <=768px study-open', bandA, {
  appClass: 'mobile-study-open',
  plain: [['#mobile-fab display (study panel open)', 'mobile-fab', 'none']],
});
// Band B: 769-900px (max-width:900 and the nested min-width:769 active)
bandChecks('rf4 769-900px', bandB, {
  plain: [
    ['#mobile-nav-bar display', 'mobile-nav-bar', 'flex'],
    ['#mobile-panel-back display', 'mobile-panel-back', 'flex'],
    ['#mobile-menu-btn display', 'mobile-menu-btn', 'none'],
    ['#header-lang-toggle display', 'header-lang-toggle', 'none'],
    ['#global-breadcrumb display', 'global-breadcrumb', 'none'],
    ['#research-open-btn display', 'research-open-btn', 'none'],
    ['#open-panel-btn display', 'open-panel-btn', 'none'],
    ['#mobile-location-btn display', 'mobile-location-btn', 'flex'],
    ['#mobile-more-btn display', 'mobile-more-btn', 'flex'],
    ['#mobile-fab display', 'mobile-fab', 'flex'],
    ['#study-verse-nav display', 'study-verse-nav', 'none'],
    ['#mvv-reading-slot display', 'mvv-reading-slot', 'contents'],
    ['#mobile-book-picker display', 'mobile-book-picker', 'none'],
    ['#mobile-more-menu display', 'mobile-more-menu', 'none'],
  ],
  withClass: [
    ['#study-verse-nav.is-visible display (>=769 hide wins)', 'study-verse-nav', 'is-visible', 'none'],
    ['#mobile-book-picker.mbp-open display', 'mobile-book-picker', 'mbp-open', 'flex'],
    ['#mobile-mode-picker.mmp-open display', 'mobile-mode-picker', 'mmp-open', 'flex'],
    ['#mobile-more-menu.open display', 'mobile-more-menu', 'open', 'block'],
  ],
  withInline: [
    ['#open-panel-btn display (inline block, residual !important)', 'open-panel-btn', 'block', 'none'],
    ['#mvv-reading-slot display (inline block, residual !important)', 'mvv-reading-slot', 'block', 'contents'],
  ],
});
bandChecks('rf4 769-900px study-open', bandB, {
  appClass: 'mobile-study-open',
  plain: [['#mobile-fab display (study panel open)', 'mobile-fab', 'none']],
});
// Band C: >=901px (max-width blocks removed, min-width blocks active)
bandChecks('rf4 >=901px', bandC, {
  plain: [
    ['#mobile-nav-bar display', 'mobile-nav-bar', 'none'],
    ['#mobile-panel-back display', 'mobile-panel-back', 'none'],
    ['#mobile-menu-btn display', 'mobile-menu-btn', 'flex'],
    ['#header-lang-toggle display', 'header-lang-toggle', 'flex'],
    ['#global-breadcrumb display', 'global-breadcrumb', 'flex'],
    ['#research-open-btn display', 'research-open-btn', 'inline-flex'],
    ['#mobile-location-btn display', 'mobile-location-btn', 'none'],
    ['#mobile-fab display', 'mobile-fab', 'none'],
    ['#mobile-fab-overlay display', 'mobile-fab-overlay', 'none'],
    ['#study-verse-nav display', 'study-verse-nav', 'none'],
    ['#mobile-book-picker display', 'mobile-book-picker', 'none'],
    ['#mobile-mode-picker display', 'mobile-mode-picker', 'none'],
    ['#mobile-more-btn display', 'mobile-more-btn', 'none'],
    ['#mobile-more-overlay display', 'mobile-more-overlay', 'none'],
    ['#mobile-more-menu display', 'mobile-more-menu', 'none'],
  ],
  withClass: [
    ['#study-verse-nav.is-visible display', 'study-verse-nav', 'is-visible', 'none'],
    ['#mobile-book-picker.mbp-open display (paired selector wins)', 'mobile-book-picker', 'mbp-open', 'none'],
    ['#mobile-mode-picker.mmp-open display (paired selector wins)', 'mobile-mode-picker', 'mmp-open', 'none'],
    ['#mobile-more-menu.open display (paired selector wins)', 'mobile-more-menu', 'open', 'none'],
  ],
  withInline: [
    ['#open-panel-btn display (inline none, as in markup)', 'open-panel-btn', 'none', 'none'],
    ['#mobile-fab-overlay display (inline block, residual !important)', 'mobile-fab-overlay', 'block', 'none'],
    ['#mobile-more-overlay display (inline block, residual !important)', 'mobile-more-overlay', 'block', 'none'],
  ],
});

if (failures > 0) {
  console.error(`check-index-styles: FAIL — ${failures}/${total} computed-style checks failed (index: ${path.relative(ROOT, indexPath)}, onboarding: ${path.relative(ROOT, onboardingPath)})`);
  process.exit(1);
}
console.log(`check-index-styles: PASS — ${total}/${total} computed-style checks (phases 1-4; phase 2 simulates a <=600px viewport and phase 4 the <=768 / 769-900 / >=901px bands by unwrapping/removing media blocks; see header).`);
