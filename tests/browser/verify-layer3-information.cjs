#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
const TARGET = 'θεὸς';
const SHOTS = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-layer3';

fs.mkdirSync(SHOTS, { recursive:true });

async function openTarget(browser, mobile) {
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

  await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForSelector('#bible-text-area .verse-block .v-num', { timeout:20000 });
  await page.waitForTimeout(1500);

  const clickedVerse = await page.evaluate(() => {
    for (const block of document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')) {
      if (block.querySelector('.v-num')?.textContent.trim() === '16') {
        block.click();
        return true;
      }
    }
    return false;
  });
  assert.ok(clickedVerse, `${mobile ? 'Mobile' : 'Desktop'}: JHN 3:16 exists`);

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
  }, TARGET);
  assert.ok(clickedToken, `${mobile ? 'Mobile' : 'Desktop'}: ${TARGET} chip exists`);

  await page.waitForSelector('#wlv-detail-drawer.visible', { timeout:12000 });
  await page.waitForTimeout(250);
  const clickedStudy = await page.evaluate(() => {
    const btn = document.getElementById('wlv-dd-study-btn');
    if (!btn) return false;
    btn.click();
    return true;
  });
  assert.ok(clickedStudy, `${mobile ? 'Mobile' : 'Desktop'}: StudyPanel entry exists`);

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
    return {
      morphologyTag: morphology?.tagName || null,
      morphologyVisible: visible(morphology),
      morphologyInsideDetails: !!morphology?.closest('details'),
      dictionaryVisible: visible(dictionary),
      dictionaryTextLength: (dictionary?.textContent || '').trim().length,
      usageTrendsTextPresent: scopeText.includes('使用傾向'),
      semanticSectionPresent: !!scope?.querySelector('[data-study-section="semantic"]'),
      researchLinksPresent: !!scope?.querySelector('.rn-research-links'),
    };
  }, mobile);

  assert.ok(state.morphologyTag, `${mobile ? 'Mobile' : 'Desktop'}: morphology section exists`);
  assert.ok(state.dictionaryVisible && state.dictionaryTextLength > 20,
    `${mobile ? 'Mobile' : 'Desktop'}: Abbott-Smith dictionary text is present`);
  assert.equal(state.usageTrendsTextPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: Usage Trends should stay in the search tool, not duplicate in StudyPanel`);
  assert.equal(state.semanticSectionPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: LN semantic section should remain disabled until license/quality review`);
  assert.equal(state.researchLinksPresent, false,
    `${mobile ? 'Mobile' : 'Desktop'}: current markup should not claim a Research Links section without a rendered implementation`);
  assert.equal(consoleErrors.length, 0,
    `${mobile ? 'Mobile' : 'Desktop'}: page errors: ${consoleErrors.join('; ')}`);

  await page.screenshot({
    path:path.join(SHOTS, mobile ? 'layer3-mobile.png' : 'layer3-desktop.png'),
    fullPage:false
  });

  console.log(`PASS: ${mobile ? 'Mobile 390×844' : 'Desktop 1280×900'} — Abbott-Smith preserved; Usage Trends / semantic / Research Links absent.`);
  console.log(`AUDIT: ${mobile ? 'Mobile' : 'Desktop'} morphology tag=${state.morphologyTag}, visible=${state.morphologyVisible}, inside <details>=${state.morphologyInsideDetails}`);
  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  try {
    await openTarget(browser, false);
    await openTarget(browser, true);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
