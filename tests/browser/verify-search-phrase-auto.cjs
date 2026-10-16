'use strict';
const { chromium } = require('playwright');

const BASE = process.env.SEARCH_PREVIEW_URL || 'https://feat-search-auto-phrase-dist.bible-text.pages.dev/search-tool.html';
const results = [];
function record(id, ok, detail) {
  results.push({ id, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? '✓' : '✗'} ${id}: ${detail}`);
}
async function waitForIndex(page) {
  await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 120000 });
}
async function runSearch(page, query) {
  await page.locator('#unified-search-input').fill(query);
  await page.evaluate(() => unifiedSearch());
  await page.waitForFunction(() => {
    const loading = document.getElementById('state-loading');
    return loading && getComputedStyle(loading).display === 'none';
  }, { timeout: 60000 });
  return page.evaluate(() => ({
    query: document.getElementById('result-query-label')?.textContent || '',
    count: document.getElementById('result-count')?.textContent || '',
    headerVisible: document.getElementById('result-header')?.classList.contains('visible') || false
  }));
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  try {
    const response = await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    record('PAGE-LOAD', !!response && response.ok(), `HTTP ${response?.status()}`);
    await waitForIndex(page);

    // Instrument the actual phrase-search functions after the page's scripts have loaded.
    await page.evaluate(() => {
      window.__phraseCalls = { greek: 0, japanese: 0 };
      const greek = window.searchPhrase;
      const japanese = window.searchPhraseJapanese;
      window.searchPhrase = function (...args) {
        window.__phraseCalls.greek++;
        return greek.apply(this, args);
      };
      window.searchPhraseJapanese = function (...args) {
        window.__phraseCalls.japanese++;
        return japanese.apply(this, args);
      };
    });

    const greek = await runSearch(page, 'ἐν ἀρχῇ');
    const greekCalls = await page.evaluate(() => window.__phraseCalls.greek);
    record('GREEK-MULTIWORD-PHRASE', greekCalls > 0 && greek.headerVisible,
      `phrase calls=${greekCalls}, count=${greek.count || '(empty)'}`);

    await page.evaluate(() => { window.__phraseCalls.greek = 0; });
    const singleGreek = await runSearch(page, 'ἀγάπη');
    const singleGreekCalls = await page.evaluate(() => window.__phraseCalls.greek);
    record('GREEK-SINGLE-WORD-NOT-PHRASE', singleGreekCalls === 0 && singleGreek.headerVisible,
      `phrase calls=${singleGreekCalls}, count=${singleGreek.count || '(empty)'}`);

    const japanese = await runSearch(page, '神 の');
    const japaneseCalls = await page.evaluate(() => window.__phraseCalls.japanese);
    record('JAPANESE-MULTIWORD-PHRASE', japaneseCalls > 0 && japanese.headerVisible,
      `phrase calls=${japaneseCalls}, count=${japanese.count || '(empty)'}`);

    await page.evaluate(() => { window.__phraseCalls.japanese = 0; });
    const singleJapanese = await runSearch(page, '愛');
    const singleJapaneseCalls = await page.evaluate(() => window.__phraseCalls.japanese);
    record('JAPANESE-SINGLE-WORD-NOT-PHRASE', singleJapaneseCalls === 0 && singleJapanese.headerVisible,
      `phrase calls=${singleJapaneseCalls}, count=${singleJapanese.count || '(empty)'}`);

    const failed = results.filter(r => r.status === 'FAIL');
    console.log(JSON.stringify({ results, passed: results.length - failed.length, failed: failed.length }, null, 2));
    if (failed.length) process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
