#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765';
const TARGET = 'ἀνακεφαλαιώσασθαι';
const EXPECTED = '命令とは決まりません';
const SHOTS = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-evidence-note';
fs.mkdirSync(SHOTS, { recursive:true });

async function openTarget(browser, mobile) {
  const context = await browser.newContext(mobile ? {
    viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  } : { viewport:{ width:1280, height:900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(`${BASE}/?book=EPH&ch=1`, { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForSelector('#bible-text-area .verse-block .v-num', { timeout:20000 });
  await page.waitForTimeout(1500);

  const clickedVerse = await page.evaluate(() => {
    const selector = '#bible-text-area .verse-block:not(.verse-pair-right)';
    for (const block of document.querySelectorAll(selector)) {
      const num = block.querySelector('.v-num')?.textContent.trim();
      if (num === '10') { block.click(); return true; }
    }
    return false;
  });
  assert.ok(clickedVerse, `${mobile ? 'Mobile' : 'Desktop'}: Ephesians 1:10 verse block exists`);

  await page.waitForSelector(mobile ? '#mobile-verse-view.open' : '#bottom-depth-panel.open', { timeout:12000 });
  const chipSelector = mobile ? '#mobile-inspector-area .wlv-chip' : '#word-list-view .wlv-chip';
  await page.waitForSelector(chipSelector, { timeout:12000 });

  const clickedToken = await page.evaluate(target => {
    const normalize = s => String(s || '').normalize('NFC').trim();
    const chips = [...document.querySelectorAll(
      '#word-list-view .wlv-chip, #mobile-inspector-area .wlv-chip'
    )];
    const chip = chips.find(el =>
      normalize(el.dataset.greek) === target ||
      normalize(el.getAttribute('title')) === target ||
      normalize(el.textContent).includes(target)
    );
    if (!chip) return false;
    chip.click();
    return true;
  }, TARGET);
  assert.ok(clickedToken, `${mobile ? 'Mobile' : 'Desktop'}: target Greek token chip exists`);

  await page.waitForSelector('#wlv-detail-drawer.visible', { timeout:12000 });
  await page.waitForTimeout(250);
  const clickedStudy = await page.evaluate(() => {
    const btn = document.getElementById('wlv-dd-study-btn');
    if (!btn) return false;
    btn.click();
    return true;
  });
  assert.ok(clickedStudy, `${mobile ? 'Mobile' : 'Desktop'}: StudyPanel button exists`);

  await page.waitForTimeout(5500);
  // Locate the current Layer 3 entry by its stable data attribute.
  // It is open by default in the current UI, so only click when collapsed.
  const layer3Entry = page.locator(mobile
    ? '#mobile-inspector-area details[data-study-section="morphology"]'
    : '#reading-notes-area details[data-study-section="morphology"]');
  await layer3Entry.waitFor({ state:'attached', timeout:10000 });
  const layer3Open = await layer3Entry.evaluate(el => el.open);
  if (!layer3Open) {
    await layer3Entry.locator(':scope > summary').click();
  }
  await page.waitForTimeout(250);
  const targetText = await page.evaluate(mobile => {
    const selectors = mobile
      ? ['#mvv-reading-slot', '#mobile-inspector-area', '#reading-notes-area']
      : ['#reading-notes-area'];
    return selectors.map(sel => document.querySelector(sel)?.innerText || '').join('\n');
  }, mobile);
  await page.screenshot({ path:path.join(SHOTS, mobile ? 'evidence-note-mobile.png' : 'evidence-note-desktop.png') });
  assert.ok(targetText.includes(EXPECTED),
    `${mobile ? 'Mobile' : 'Desktop'}: evidence note should include caution phrase; excerpt=${targetText.slice(0,500)}`);
  assert.ok(targetText.includes('動作を行う側として'),
    `${mobile ? 'Mobile' : 'Desktop'}: subjref should be described as an action reference, not a grammatical subject`);
  assert.ok(!targetText.includes('この語の主語は「神」です'),
    `${mobile ? 'Mobile' : 'Desktop'}: old categorical subject wording must not remain`);
  assert.ok(targetText.includes('分析候補・統語情報'),
    `${mobile ? 'Mobile' : 'Desktop'}: syntax label section should be present under its group heading`);
  assert.equal(consoleErrors.length, 0,
    `${mobile ? 'Mobile' : 'Desktop'}: page errors: ${consoleErrors.join('; ')}`);

  console.log(`PASS: ${mobile ? 'Mobile 390×844' : 'Desktop 1280×900'} shows evidence and judgment criteria for ${TARGET}`);
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
