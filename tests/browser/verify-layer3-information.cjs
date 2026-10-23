#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
const TARGETS = [
  { chapter:3, verse:16, text:'θεὸς', expectMorphCandidates:false },
  { chapter:3, verse:16, text:'κόσμον', expectMorphCandidates:false },
  { chapter:3, verse:16, text:'ἠγάπησεν', expectMorphCandidates:false },
  { chapter:3, verse:16, text:'μονογενῆ', expectMorphCandidates:false },
  // JHN 15:27: μαρτυρεῖτε permits a present indicative / imperative analysis.
  { chapter:15, verse:27, text:'μαρτυρεῖτε', expectMorphCandidates:true }
];
const SHOTS = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-layer3';

fs.mkdirSync(SHOTS, { recursive:true });

async function openTarget(browser, mobile, targetCase, captureScreenshot) {
  const { chapter, verse, text:target, expectMorphCandidates } = targetCase;
  const context = await browser.newContext(mobile ? {
    viewport:{ width:390, height:844 },
    isMobile:true,
    hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  } : { viewport:{ width:1280, height:900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(`${BASE}/?book=JHN&ch=${chapter}`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForSelector('#bible-text-area .verse-block .v-num', { timeout:20000 });
  await page.waitForTimeout(1200);

  const clickedVerse = await page.evaluate(verse => {
    for (const block of document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')) {
      if (block.querySelector('.v-num')?.textContent.trim() === String(verse)) {
        block.click();
        return true;
      }
    }
    return false;
  }, String(verse));
  assert.ok(clickedVerse, `${mobile ? 'Mobile' : 'Desktop'}: JHN ${chapter}:${verse} exists`);

  await page.waitForSelector(mobile ? '#mobile-verse-view.open' : '#bottom-depth-panel.open', { timeout:12000 });
  await page.waitForSelector(mobile ? '#mobile-inspector-area .wlv-chip' : '#word-list-view .wlv-chip', { timeout:12000 });

  const clickedToken = await page.evaluate(target => {
    const normalize = s => String(s || '').normalize('NFC').trim();
    const selector = '#word-list-view .wlv-chip, #mobile-inspector-area .wlv-chip';
    const chip = [...document.querySelectorAll(selector)].find(el =>
      normalize(el.dataset.greek) === target ||
      normalize(el.getAttribute('title')) === target ||
      normalize(el.textContent).includes(target)
    );
    if (!chip) return false;
    chip.click();
    return true;
  }, target);
  assert.ok(clickedToken, `${mobile ? 'Mobile' : 'Desktop'}: ${target} chip exists`);

  await page.waitForSelector('#wlv-detail-drawer.visible', { timeout:12000 });
  await page.waitForTimeout(200);
  const clickedStudy = await page.evaluate(() => {
    const btn = document.getElementById('wlv-dd-study-btn');
    if (!btn) return false;
    btn.click();
    return true;
  });
  assert.ok(clickedStudy, `${mobile ? 'Mobile' : 'Desktop'}: StudyPanel entry exists for ${target} (JHN ${chapter}:${verse})`);

  const dictionarySelector = mobile
    ? '#mvv-abbott-slot .rn-dict-full-text'
    : '#reading-notes-area .rn-dict-full-text';
  await page.waitForFunction(selector => {
    const el = document.querySelector(selector);
    return !!el && (el.textContent || '').trim().length > 20;
  }, dictionarySelector, { timeout:20000 });

  const state = await page.evaluate(mobile => {
    const scope = mobile
      ? document.querySelector('#mobile-inspector-area')
      : document.querySelector('#reading-notes-area');
    const morphology = mobile
      ? scope?.querySelector('.mvv-l3-section[data-study-section="morphology"]')
      : scope?.querySelector('#rn-level2-details');
    const candidates = scope?.querySelector('[data-study-section="candidates"] .rn-mc-details, [data-study-section="candidates"] .rn-mc-list, .rn-mc-details');
    const dictionary = mobile
      ? scope?.querySelector('#mvv-abbott-slot .rn-dict-full-text')
      : scope?.querySelector('#rn-level2-details .rn-dict-full-text');
    const visible = el => {
      if (!el) return false;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const scopeText = scope?.innerText || '';
    const visibleGroups = [...(scope?.querySelectorAll('[data-study-group]') || [])]
      .filter(visible)
      .map(el => {
        const body = el.cloneNode(true);
        body.querySelectorAll('.rn-l3-group-label').forEach(label => label.remove());
        return { key:el.getAttribute('data-study-group'), label:el.querySelector('.rn-l3-group-label')?.innerText.trim() || '', text:(body.textContent || '').trim() };
      });
    const emptyWrappers = [...(scope?.querySelectorAll('.rn-word-head, .rn-glosses, .mvv-l3-word, .rn-level-heading') || [])]
      .filter(el => !(el.textContent || '').trim())
      .map(el => ({ className:el.className?.baseVal || el.className || '', visible:visible(el) }));
    return {
      morphologyTag: morphology?.tagName || null,
      morphologyVisible: visible(morphology),
      morphologyInsideDetails: !!morphology?.closest('details'),
      morphCandidatesPresent: !!candidates && visible(candidates),
      dictionaryVisible: visible(dictionary),
      dictionaryTextLength: (dictionary?.textContent || '').trim().length,
      dictionaryTextSample: (dictionary?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      usageTrendsTextPresent: scopeText.includes('使用傾向'),
      semanticSectionPresent: !!scope?.querySelector('[data-study-section="semantic"]'),
      researchLinksPresent: !!scope?.querySelector('.rn-research-links'),
      visibleGroups,
      emptyWrappers
    };
  }, mobile);

  assert.ok(state.morphologyTag, `${mobile ? 'Mobile' : 'Desktop'}: morphology section exists for ${target}`);
  const groupKeys = state.visibleGroups.map(group => group.key);
  assert.ok(groupKeys.includes('facts'), `${mobile ? 'Mobile' : 'Desktop'}: original-language facts group is visible for ${target}`);
  const groupOrder = ['facts', 'analysis', 'lexical'];
  const orderPositions = groupKeys.map(key => groupOrder.indexOf(key)).filter(index => index >= 0);
  assert.deepEqual(orderPositions, [...orderPositions].sort((a, b) => a - b), `${mobile ? 'Mobile' : 'Desktop'}: visible Layer 3 groups must preserve facts → analysis → lexical order for ${target}: ${JSON.stringify(groupKeys)}`);
  assert.ok(state.visibleGroups.every(group => group.text.length > 0), `${mobile ? 'Mobile' : 'Desktop'}: visible Layer 3 groups must not be empty for ${target}`);
  if (state.visibleGroups.some(group => group.key === 'analysis')) {
    assert.equal(state.visibleGroups.find(group => group.key === 'analysis').label, '分析候補・統語情報',
      `${mobile ? 'Mobile' : 'Desktop'}: analysis group label must describe displayed candidates/labels, not imply explicit evidence for ${target}`);
  }
  if (expectMorphCandidates) {
    assert.ok(state.morphCandidatesPresent, `${mobile ? 'Mobile' : 'Desktop'}: expected alternative morphology candidates for ${target} (JHN ${chapter}:${verse})`);
  }
  assert.ok(state.dictionaryVisible && state.dictionaryTextLength > 20,
    `${mobile ? 'Mobile' : 'Desktop'}: Abbott-Smith dictionary text is present for ${target}`);
  const lexicalGroup = state.visibleGroups.find(group => group.key === 'lexical');
  const analysisGroup = state.visibleGroups.find(group => group.key === 'analysis');
  const normalizeGroupText = value => String(value || '').replace(/\s+/g, ' ').trim();
  if (state.dictionaryTextSample && lexicalGroup) {
    assert.ok(normalizeGroupText(lexicalGroup.text).includes(normalizeGroupText(state.dictionaryTextSample)),
      `${mobile ? 'Mobile' : 'Desktop'}: Abbott-Smith dictionary content must belong to the lexical-resources group for ${target}`);
  }
  if (state.dictionaryTextSample && analysisGroup) {
    assert.equal(normalizeGroupText(analysisGroup.text).includes(normalizeGroupText(state.dictionaryTextSample)), false,
      `${mobile ? 'Mobile' : 'Desktop'}: analysis group must not duplicate Abbott-Smith dictionary content for ${target}`);
  }
  assert.equal(state.usageTrendsTextPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: Usage Trends should stay in the search tool, not duplicate in StudyPanel`);
  assert.equal(state.semanticSectionPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: LN semantic section should remain disabled until license/quality review`);
  assert.equal(state.researchLinksPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: current markup should not claim a Research Links section without a rendered implementation`);
  assert.deepEqual(state.emptyWrappers, [],
    `${mobile ? 'Mobile' : 'Desktop'}: StudyPanel should not generate empty Layer 3 identity/heading wrappers for ${target}`);
  assert.equal(consoleErrors.length, 0,
    `${mobile ? 'Mobile' : 'Desktop'}: page errors for ${target}: ${consoleErrors.join('; ')}`);

  // Controlled race regression: force an older syntax result to resolve after the newer one.
  // This tests the generation guard deterministically; it is not a substitute for full user-driven token-switch coverage.
  if (captureScreenshot && mobile) {
    const staleResult = await page.evaluate(async () => {
      const fill = window._fillMvvSyntaxSlot;
      const build = window._buildSyntaxLabelHTML;
      const slot = document.getElementById('mvv-syntax-slot');
      if (typeof fill !== 'function' || typeof build !== 'function' || !slot) {
        return { supported:false, fillType:typeof fill, buildType:typeof build, slotPresent:!!slot };
      }
      window._buildSyntaxLabelHTML = async (_words, ref) => {
        await new Promise(resolve => setTimeout(resolve, ref === 'stale-old' ? 100 : 5));
        return `<span>${ref}</span>`;
      };
      try {
        const oldRequest = window._fillMvvSyntaxSlot([], 'stale-old');
        const newRequest = window._fillMvvSyntaxSlot([], 'current-new');
        await Promise.all([oldRequest, newRequest]);
        return { supported:true, text:slot.textContent.trim() };
      } finally {
        window._buildSyntaxLabelHTML = build;
      }
    });
    assert.equal(staleResult.supported, true,
      `Mobile: syntax stale-result test hooks must be available: ${JSON.stringify(staleResult)}`);
    assert.equal(staleResult.text, 'current-new',
      `Mobile: a late syntax result for an old token must not overwrite the current token: ${JSON.stringify(staleResult)}`);
    console.log('PASS: Mobile — delayed stale syntax result cannot overwrite the current token result.');
  }

  if (captureScreenshot) {
    await page.screenshot({
      path:path.join(SHOTS, mobile ? 'layer3-mobile.png' : 'layer3-desktop.png'),
      fullPage:false
    });
  }

  console.log(`PASS: ${mobile ? 'Mobile 390×844' : 'Desktop 1280×900'} — JHN ${chapter}:${verse} ${target}: dictionary preserved; duplicate/disabled sections absent.`);
  console.log(`AUDIT: ${mobile ? 'Mobile' : 'Desktop'} JHN ${chapter}:${verse} ${target}: morphology=${state.morphologyTag}, visible=${state.morphologyVisible}, inside <details>=${state.morphologyInsideDetails}, candidates=${state.morphCandidatesPresent}, empty wrappers=${JSON.stringify(state.emptyWrappers)}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    for (const mobile of [false, true]) {
      for (let i = 0; i < TARGETS.length; i++) {
        await openTarget(browser, mobile, TARGETS[i], i === 0);
      }
    }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
