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
//  - onboarding's _forceShowCompareOnMobile override: RESOLVED in RF-5
//    as a pair with the index side. Both sides dropped !important and
//    raised specificity with the same #app scoping; the override still
//    wins by being appended to <head> at runtime (later position). The
//    override text is extracted below from the onboarding file under
//    test, so the probe always exercises the pairing that file implies.
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
// RF-5 (phase 5) covers the structural group: the compare-mode grid /
// display rules in the @media 900px and @media 768px blocks, the paired
// onboarding override, the inspector heading reset, the @600 typography
// rules and the prefers-reduced-motion rules. Expected values were
// measured on the pre-RF-5 tree (main a3e2ab24) with this same probe
// method and must be reproduced exactly. All 22 structural
// declarations were resolved. The word-peek @media-900 left/top pair
// first looked like a residual on the assumption that the peek element
// persists with its inline styles, but peek-guide.js creates the
// element fresh on every open and removes it on close, and it sets
// inline left/top only when opening at >900px — a width where this
// media block does not apply. At <=900px no inline value and no other
// left/top rule competes, so the pair needs no !important either;
// phase 5 asserts the stylesheet values in the <=900 bands and that
// the inline values set at >900px (bandC) still win there. Note:
// jsdom evaluates a grouped selector list by its maximum specificity,
// so the @media-900 display:none for #parallel-text-area and for the
// right-column trio are separate rules in index.html (equivalent in
// real browsers, where specificity is per-selector).
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

// The style text injected by onboarding's _forceShowCompareOnMobile()
// (#ob-mobile-compare-override, appended to <head> at runtime, i.e.
// after every page stylesheet), extracted from the onboarding file
// under test so the probe exercises the pairing that file implies
// (RF-5: was a hard-coded mirror before).
const obFnStart = obSrc.indexOf('function _forceShowCompareOnMobile()');
if (obFnStart === -1) { console.error('check-index-styles: _forceShowCompareOnMobile not found in onboarding'); process.exit(2); }
const obArrStart = obSrc.indexOf('style.textContent = [', obFnStart);
const obArrEnd = obSrc.indexOf('].join', obArrStart);
if (obArrStart === -1 || obArrEnd === -1) { console.error('check-index-styles: compare override text not found in onboarding'); process.exit(2); }
const obArrText = obSrc.slice(obArrStart + 'style.textContent = ['.length, obArrEnd);
const COMPARE_OVERRIDE_CSS = [...obArrText.matchAll(/'((?:[^'\\]|\\.)*)'/g)]
  .map(m => m[1].replace(/\\(.)/g, '$1')).join('\n');
if (!COMPARE_OVERRIDE_CSS.includes('compare-mode')) { console.error('check-index-styles: compare override extraction looks wrong'); process.exit(2); }

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
// RF-5: reduced-motion band (the RM media blocks unwrapped in place).
// The <=900px simulations reuse bandA (the @media 900/768/600 blocks are
// all unwrapped there, which is exactly the <=900 cascade for the
// inspector-heading and word-peek rules, neither of which is affected
// by the 768/600-only rules).
const bandRMcss = unwrapMedia(stripComments(baseCss),
  '@media (prefers-reduced-motion: reduce)');

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

  // ---- Phase 5 (RF-5): compare-mode matrix across width bands ----
  // Expected values were measured on the pre-RF-5 tree (main a3e2ab24)
  // with the RF-3/RF-4 probe method; RF-5 must reproduce them exactly
  // after removing the compare-mode !important declarations
  // (specificity raises on the index side and the paired onboarding
  // override, whose selectors were raised the same way).
  const CMP_FIXTURE = '<div id="app">' +
    '<div id="bottom-depth-panel"><div id="panel-resize-handle"></div></div>' +
    '<div id="main-reading-area">' +
    '<div id="parallel-text-area"></div>' +
    '<div class="verse-block verse-pair-right" id="vpr"></div>' +
    '<div class="verse-grid-spacer-right" id="vgsr"></div>' +
    '<div class="verse-grid-footer-right" id="vgfr"></div>' +
    '<div class="verse-block" id="vb-plain"></div>' +
    '<div class="verse-block" id="vb-hidden" data-hidden-verse="true"></div>' +
    '</div></div>';
  { const d = makeDom(bandA, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 A(<=768) cls=compare-mode #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 A(<=768) cls=compare-mode #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', 'none');
    check('RF-5 A(<=768) cls=compare-mode #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 A(<=768) cls=compare-mode #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandA + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 A(<=768) cls=compare-mode +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 A(<=768) cls=compare-mode +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 A(<=768) cls=compare-mode +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 A(<=768) cls=compare-mode +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandA, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 A(<=768) cls=compare-mode panel-open #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 A(<=768) cls=compare-mode panel-open #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', 'none');
    check('RF-5 A(<=768) cls=compare-mode panel-open #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 A(<=768) cls=compare-mode panel-open #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode panel-open #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode panel-open #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandA + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'none');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=compare-mode panel-open +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandA, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 A(<=768) cls=none #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 A(<=768) cls=none #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 A(<=768) cls=none #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 A(<=768) cls=none #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=none #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandA + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 A(<=768) cls=none +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 A(<=768) cls=none +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 A(<=768) cls=none +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 A(<=768) cls=none +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 A(<=768) cls=none +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'none');
  }
  { const d = makeDom(bandB, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 B(769-900) cls=compare-mode #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 B(769-900) cls=compare-mode #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr');
    check('RF-5 B(769-900) cls=compare-mode #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 B(769-900) cls=compare-mode #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode #vpr display', d.window.document.getElementById('vpr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandB + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 B(769-900) cls=compare-mode +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 B(769-900) cls=compare-mode +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 B(769-900) cls=compare-mode +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 B(769-900) cls=compare-mode +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandB, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 B(769-900) cls=compare-mode panel-open #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 B(769-900) cls=compare-mode panel-open #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr');
    check('RF-5 B(769-900) cls=compare-mode panel-open #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 B(769-900) cls=compare-mode panel-open #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode panel-open #vpr display', d.window.document.getElementById('vpr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode panel-open #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode panel-open #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'none');
    check('RF-5 B(769-900) cls=compare-mode panel-open #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandB + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'flex');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'column');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=compare-mode panel-open +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandB, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 B(769-900) cls=none #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 B(769-900) cls=none #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 B(769-900) cls=none #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 B(769-900) cls=none #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=none #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandB + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 B(769-900) cls=none +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 B(769-900) cls=none +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 B(769-900) cls=none +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 B(769-900) cls=none +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 B(769-900) cls=none +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 C(>=901) cls=compare-mode #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=compare-mode #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 C(>=901) cls=compare-mode #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=compare-mode #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode';
    check('RF-5 C(>=901) cls=compare-mode +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=compare-mode +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 C(>=901) cls=compare-mode +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=compare-mode +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 C(>=901) cls=compare-mode panel-open #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=compare-mode panel-open #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 0');
    check('RF-5 C(>=901) cls=compare-mode panel-open #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=compare-mode panel-open #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open #vpr display', d.window.document.getElementById('vpr'), 'display', 'none');
    check('RF-5 C(>=901) cls=compare-mode panel-open #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'none');
    check('RF-5 C(>=901) cls=compare-mode panel-open #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'none');
    check('RF-5 C(>=901) cls=compare-mode panel-open #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = 'compare-mode panel-open';
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 1fr');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=compare-mode panel-open +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 C(>=901) cls=none #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=none #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 C(>=901) cls=none #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=none #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=none #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }
  { const d = makeDom(bandC + '\n' + COMPARE_OVERRIDE_CSS, CMP_FIXTURE); d.window.document.getElementById('main-reading-area').className = '';
    check('RF-5 C(>=901) cls=none +override #main-reading-area display', d.window.document.getElementById('main-reading-area'), 'display', 'grid');
    check('RF-5 C(>=901) cls=none +override #main-reading-area grid-template-columns', d.window.document.getElementById('main-reading-area'), 'grid-template-columns', '1fr 42%');
    check('RF-5 C(>=901) cls=none +override #main-reading-area flex-direction', d.window.document.getElementById('main-reading-area'), 'flex-direction', 'row');
    check('RF-5 C(>=901) cls=none +override #parallel-text-area display', d.window.document.getElementById('parallel-text-area'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #vpr display', d.window.document.getElementById('vpr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #vgsr display', d.window.document.getElementById('vgsr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #vgfr display', d.window.document.getElementById('vgfr'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #vb-hidden display', d.window.document.getElementById('vb-hidden'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #vb-plain display', d.window.document.getElementById('vb-plain'), 'display', 'block');
    check('RF-5 C(>=901) cls=none +override #panel-resize-handle display', d.window.document.getElementById('panel-resize-handle'), 'display', 'flex');
  }

  // ---- Phase 5 (RF-5): inspector heading reset (plain removal) ----
  {
    const d = makeDom(bandA,
      '<div id="mobile-inspector-area"><div class="rn-word-reading-note-heading" id="h5"></div></div>');
    const h = d.window.document.getElementById('h5');
    check('RF-5 inspector heading border-top-width', h, 'border-top-width', '0px');
    check('RF-5 inspector heading border-bottom-width', h, 'border-bottom-width', '0px');
    check('RF-5 inspector heading box-shadow', h, 'box-shadow', 'none');
  }

  // ---- Phase 5 (RF-5): word-peek @900 left/top carry no !important.
  // peek-guide.js creates the peek element fresh on every open and
  // removes it on close (_closeWordPeek), and it sets inline left/top
  // only when opening at >900px — where the @media-900 block does not
  // apply. So at <=900px the element never carries a competing inline
  // value, and no other stylesheet rule sets left/top on .word-peek:
  // the plain declarations below are the computed values as-is. The
  // bandC checks pin the other side: with the inline values the JS
  // sets at >900px, those inline values still win (media block off).
  {
    const d = makeDom(bandA, '<div class="word-peek" id="peek5"></div>');
    const p = d.window.document.getElementById('peek5');
    check('RF-5 peek left (stylesheet, <=900)', p, 'left', 'var(--space-md)');
    check('RF-5 peek top (stylesheet, <=900)', p, 'top', 'auto');
    const dB = makeDom(bandB, '<div class="word-peek" id="peek5b"></div>');
    const pB = dB.window.document.getElementById('peek5b');
    check('RF-5 peek left (stylesheet, 769-900)', pB, 'left', 'var(--space-md)');
    check('RF-5 peek top (stylesheet, 769-900)', pB, 'top', 'auto');
    const dC = makeDom(bandC, '<div class="word-peek" id="peek5c"></div>');
    const pC = dC.window.document.getElementById('peek5c');
    pC.style.left = '333px'; pC.style.top = '222px';
    check('RF-5 peek left (inline set at >900 wins)', pC, 'left', '333px');
    check('RF-5 peek top (inline set at >900 wins)', pC, 'top', '222px');
  }

  // ---- Phase 5 (RF-5): prefers-reduced-motion ----
  // jsdom does not expand the animation/transition shorthands into
  // longhands, so the shorthand property itself is asserted. The
  // unwrapped band is the reduced-motion simulation; the base band is
  // the contrast proving the fixture really carries animations.
  {
    const FIX = '<div class="word-peek" id="rmp"></div>' +
      '<div id="hl-color-picker" class="hl-open"></div>' +
      '<div id="hl-touch-pill" class="hl-show"></div>' +
      '<div id="hl-selection-bar" class="hl-open"></div>' +
      '<div class="local-rel-backdrop" id="lrbd"></div>' +
      '<div class="local-rel-sheet" id="lrsh"></div>' +
      '<div class="local-rel-bar" id="lrbar"></div>';
    const dOn = makeDom(bandRMcss, FIX);
    const g = id => dOn.window.document.getElementById(id);
    check('RF-5 RM word-peek animation', g('rmp'), 'animation', 'none');
    check('RF-5 RM hl-color-picker animation', g('hl-color-picker'), 'animation', 'none');
    check('RF-5 RM hl-touch-pill animation', g('hl-touch-pill'), 'animation', 'none');
    check('RF-5 RM hl-selection-bar animation', g('hl-selection-bar'), 'animation', 'none');
    check('RF-5 RM local-rel-backdrop transition', g('lrbd'), 'transition', 'none');
    check('RF-5 RM local-rel-sheet transition', g('lrsh'), 'transition', 'none');
    check('RF-5 RM local-rel-bar transition', g('lrbar'), 'transition', 'none');
    const dOff = makeDom(baseCss, FIX);
    const g2 = id => dOff.window.document.getElementById(id);
    check('RF-5 RM contrast: word-peek animation without RM', g2('rmp'), 'animation', 'bottomCardIn .22s ease-out');
    check('RF-5 RM contrast: hl-color-picker animation without RM', g2('hl-color-picker'), 'animation', 'bottomCardIn .22s ease-out');
    check('RF-5 RM contrast: local-rel-backdrop transition without RM', g2('lrbd'), 'transition', 'opacity .2s ease');
  }

  // ---- Phase 5 (RF-5): @600 typography in the polish <style> block ----
  // Fixture mirrors the real chip markup (word-renderers.js):
  // .wlv-flow-stream > .wlv-chip > .wlv-chip-ja > span.
  {
    const FIX =
      '<div id="mobile-inspector-area"><div class="wlv-flow-stream" id="ts1">' +
      '<span class="wlv-chip" id="tc1"><span class="wlv-chip-ja" id="tj1"><span id="ti1">x</span></span></span></div></div>' +
      '<div id="mobile-verse-area"><div class="wlv-flow-stream" id="ts2">' +
      '<span class="wlv-chip" id="tc2"><span class="wlv-chip-ja" id="tj2"><span id="ti2">x</span></span></span></div></div>';
    const d = makeDom(mobileCss, FIX);
    const g = id => d.window.document.getElementById(id);
    for (const id of ['ts1', 'tc1', 'ti1', 'ts2', 'tc2', 'ti2']) {
      check('RF-5 typo #' + id + ' font-family', g(id), 'font-family', 'var(--font-prose)');
      check('RF-5 typo #' + id + ' font-weight', g(id), 'font-weight', '400');
    }
    for (const id of ['tj1', 'tj2']) {
      check('RF-5 typo #' + id + ' font-size', g(id), 'font-size', 'var(--text-body-lg)');
      check('RF-5 typo #' + id + ' letter-spacing', g(id), 'letter-spacing', '0.16px');
    }
  }


if (failures > 0) {
  console.error(`check-index-styles: FAIL — ${failures}/${total} computed-style checks failed (index: ${path.relative(ROOT, indexPath)}, onboarding: ${path.relative(ROOT, onboardingPath)})`);
  process.exit(1);
}
console.log(`check-index-styles: PASS — ${total}/${total} computed-style checks (phases 1-5; phase 2 simulates a <=600px viewport, phase 4 the <=768 / 769-900 / >=901px bands and phase 5 the compare-mode matrix, the reduced-motion band and the @600 typography by unwrapping/removing media blocks; see header).`);
