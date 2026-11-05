'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:8080/gnt-jp/public';
const SS = path.join(__dirname, 'test-results/studypanel-companion');
fs.mkdirSync(SS, { recursive: true });

const DESKTOP = { viewport: { width: 1280, height: 800 } };
const MOBILE  = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
                  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' };

let fails = 0;

async function check(label, fn) {
    try {
        await fn();
        console.log('  ✓', label);
    } catch (e) {
        console.log('  ✗', label, ':', e.message.slice(0, 180));
        fails++;
    }
}

async function openApp(page, mode) {
    await page.goto(`${BASE}/?book=JHN&ch=3&transA=${mode}`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(2000);
}

/* Click verse 16 via standard verse-block click (JA1955 / WORD_ORDER have verse-blocks) */
async function clickVerse16(page) {
    await page.evaluate(() => {
        const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
            .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
        if (!b) throw new Error('verse 16 block not found');
        b.click();
    });
}

/* Open StudyPanel directly via JS API (for DA_READING / RK_READING which have no verse-blocks).
   Note: let-declared variables in non-module scripts are NOT on window, access directly. */
async function openStudyPanelDirect(page, vNum) {
    await page.evaluate((vNum) => {
        const words = _cachedElByVerse[String(vNum)] || [];
        openWordListInStudyPanel(String(vNum), words, AppState.location.book, AppState.location.chapter);
    }, vNum);
}

async function openMobileStudyPanelDirect(page, vNum) {
    await page.evaluate((vNum) => {
        const words = _cachedElByVerse[String(vNum)] || [];
        openMobileVerseView(String(vNum), words, AppState.location.book, AppState.location.chapter);
    }, vNum);
}

async function ss(page, name) {
    await page.screenshot({ path: path.join(SS, `${name}.png`) });
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    console.log('\n=== StudyPanel CompanionMode Verification ===');

    // ─── Desktop ───
    console.log('\nDesktop:');

    // Case 1: JA1955 → WORD_ORDER (語順チップ)
    await check('JA1955 → StudyPanel: 語順チップ (WORD_ORDER)', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'JA1955');
        await clickVerse16(page);
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'desktop-01-ja1955');
        const chipCount = await page.locator('#word-list-view .wlv-chip').count();
        if (chipCount === 0) throw new Error('No .wlv-chip in StudyPanel');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Case 2: WORD_ORDER → JA1955 (口語訳テキスト)
    await check('WORD_ORDER → StudyPanel: 口語訳テキスト (JA1955)', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'WORD_ORDER');
        await clickVerse16(page);
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(3000);
        await ss(page, 'desktop-02-wordorder');
        const jpTextCount = await page.locator('#word-list-view .jp-text').count();
        const chipCount   = await page.locator('#word-list-view .wlv-chip').count();
        if (jpTextCount === 0) throw new Error(`No .jp-text (translation). chips=${chipCount}`);
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Case 3: DA_READING → WORD_ORDER (語順チップ) — direct JS API
    await check('DA_READING → StudyPanel: 語順チップ (WORD_ORDER)', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'DA_READING');
        await openStudyPanelDirect(page, '16');
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'desktop-03-da_reading');
        const chipCount = await page.locator('#word-list-view .wlv-chip').count();
        if (chipCount === 0) throw new Error('No .wlv-chip in StudyPanel');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Case 4: RK_READING → DA_READING view — direct JS API
    await check('RK_READING → StudyPanel: DA_READING view', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'RK_READING');
        await page.waitForTimeout(2000);
        await openStudyPanelDirect(page, '16');
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'desktop-04-rk_reading');
        const daCount = await page.locator(
            '#word-list-view .da-view, #word-list-view .da-sentence, #word-list-view .da-empty'
        ).count();
        if (daCount === 0) throw new Error('No .da-view/.da-sentence in StudyPanel');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Regression: JA1955 → chip tap → no crash
    await check('Regression: JA1955 → chip tap → no crash', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'JA1955');
        await clickVerse16(page);
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        const chip = page.locator('#word-list-view .wlv-chip').first();
        await chip.click({ timeout: 3000 });
        await page.waitForTimeout(500);
        await ss(page, 'desktop-reg-chip-tap');
        if (errs.length) throw new Error('JS error after chip tap: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Regression: JA1955 → chip → 詳しく見る → word detail
    await check('Regression: JA1955 → chip → 詳しく見る → no crash', async () => {
        const ctx = await browser.newContext(DESKTOP);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'JA1955');
        await clickVerse16(page);
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 5000 });
        await page.waitForTimeout(300);
        await page.locator('#word-list-view .wlv-chip').first().click();
        await page.waitForTimeout(300);
        const studyBtn = page.locator('#wlv-dd-study-btn');
        if (await studyBtn.isVisible().catch(() => false)) await studyBtn.click();
        await page.waitForTimeout(500);
        await ss(page, 'desktop-reg-word-detail');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // ─── Mobile ───
    console.log('\nMobile:');

    // Mobile Case 1: JA1955 → WORD_ORDER
    await check('Mobile JA1955 → Inspector: 語順チップ', async () => {
        const ctx = await browser.newContext(MOBILE);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'JA1955');
        await clickVerse16(page);
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'mobile-01-ja1955');
        const chipCount = await page.locator('#mobile-inspector-area .wlv-chip').count();
        if (chipCount === 0) throw new Error('No .wlv-chip in mobile inspector');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Mobile Case 2: WORD_ORDER → JA1955
    await check('Mobile WORD_ORDER → Inspector: 口語訳テキスト', async () => {
        const ctx = await browser.newContext(MOBILE);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'WORD_ORDER');
        await clickVerse16(page);
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 5000 });
        await page.waitForTimeout(3000);
        await ss(page, 'mobile-02-wordorder');
        const jpTextCount = await page.locator('#mobile-inspector-area .jp-text').count();
        const chipCount   = await page.locator('#mobile-inspector-area .wlv-chip').count();
        if (jpTextCount === 0) throw new Error(`No .jp-text. chips=${chipCount}`);
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Mobile Case 3: DA_READING → WORD_ORDER
    await check('Mobile DA_READING → Inspector: 語順チップ', async () => {
        const ctx = await browser.newContext(MOBILE);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'DA_READING');
        await openMobileStudyPanelDirect(page, '16');
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'mobile-03-da_reading');
        const chipCount = await page.locator('#mobile-inspector-area .wlv-chip').count();
        if (chipCount === 0) throw new Error('No .wlv-chip in mobile inspector');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    // Mobile Case 4: RK_READING → DA_READING
    await check('Mobile RK_READING → Inspector: DA_READING view', async () => {
        const ctx = await browser.newContext(MOBILE);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        await openApp(page, 'RK_READING');
        await page.waitForTimeout(2000);
        await openMobileStudyPanelDirect(page, '16');
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 5000 });
        await page.waitForTimeout(500);
        await ss(page, 'mobile-04-rk_reading');
        const daCount = await page.locator(
            '#mobile-inspector-area .da-view, #mobile-inspector-area .da-sentence, #mobile-inspector-area .da-empty'
        ).count();
        if (daCount === 0) throw new Error('No .da-view/.da-sentence in mobile inspector');
        if (errs.length) throw new Error('JS error: ' + errs[0].slice(0, 100));
        await ctx.close();
    });

    await browser.close();

    const total = 10;
    console.log('\n' + (fails === 0
        ? `PASS — all ${total} checks`
        : `FAIL — ${fails}/${total} failed`));
    process.exit(fails > 0 ? 1 : 0);
})();
