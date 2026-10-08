'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-playwright';
require('fs').mkdirSync(SP, { recursive: true });

const errors = [];

async function runScenario(browser, name, contextOpts, scenario) {
    const ctx = await browser.newContext(contextOpts);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message}`));
    try {
        await scenario(page);
    } catch (e) {
        consoleErrors.push(`[test-error] ${e.message}`);
    }
    await ctx.close();
    if (consoleErrors.length) {
        console.log(`  ✗ ${name}: ${consoleErrors.length} console errors`);
        consoleErrors.forEach(e => console.log(`    - ${e.slice(0, 120)}`));
        errors.push(...consoleErrors.map(e => `${name}: ${e}`));
    } else {
        console.log(`  ✓ ${name}`);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    console.log('=== Regression Check ===');

    const desktopCtx = { viewport: { width: 1280, height: 900 } };
    const mobileCtx  = {
        viewport: { width: 390, height: 844 },
        isMobile: true, hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    };

    /* 1. Desktop: page load */
    await runScenario(browser, 'Desktop: JHN 3 load', desktopCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
    });

    /* 2. Desktop: verse click → word list */
    await runScenario(browser, 'Desktop: verse click → word list', desktopCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
                .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
            if (b) b.click();
        });
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 6000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SP}/reg-desktop-wordlist.png` });
    });

    /* 3. Desktop: chip click → StudyPanel */
    await runScenario(browser, 'Desktop: chip → StudyPanel content', desktopCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
                .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
            if (b) b.click();
        });
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 6000 });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            const chip = document.querySelector('#word-list-view .wlv-chip[data-greek="ἠγάπησεν"]');
            if (chip) chip.click();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => document.getElementById('wlv-dd-study-btn')?.click());
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SP}/reg-desktop-studypanel.png` });
        const sections = await page.evaluate(() => {
            return [...document.querySelectorAll('[data-study-section]')]
                .filter(e => e.textContent.trim() || e.children.length)
                .map(e => e.dataset.studySection);
        });
        console.log(`    Sections: ${sections.join(', ')}`);
    });

    /* 4. Desktop: ROM 1 load + back to translation mode */
    await runScenario(browser, 'Desktop: ROM 1 load', desktopCtx, async page => {
        await page.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SP}/reg-desktop-rom1.png` });
    });

    /* 5. Mobile: page load */
    await runScenario(browser, 'Mobile: JHN 3 load', mobileCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `${SP}/reg-mobile-load.png` });
    });

    /* 6. Mobile: verse click → MVV */
    await runScenario(browser, 'Mobile: verse click → MVV', mobileCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
                .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
            if (b) b.click();
        });
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 6000 });
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${SP}/reg-mobile-mvv.png` });
    });

    /* 7. Mobile: chip → inspector detail */
    await runScenario(browser, 'Mobile: chip → inspector detail', mobileCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
                .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
            if (b) b.click();
        });
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 6000 });
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
            const chip = document.querySelector('#mobile-inspector-area .wlv-chip[data-greek="ἠγάπησεν"]');
            if (chip) chip.click();
        });
        await page.waitForTimeout(300);
        await page.evaluate(() => document.getElementById('wlv-dd-study-btn')?.click());
        await page.waitForTimeout(5000);
        await page.screenshot({ path: `${SP}/reg-mobile-detail.png` });
        const sections = await page.evaluate(() => {
            return [...document.querySelectorAll('[data-study-section]')]
                .filter(e => e.textContent.trim() || e.children.length)
                .map(e => e.dataset.studySection);
        });
        console.log(`    Sections: ${sections.join(', ')}`);
    });

    /* 8. Mobile: back navigation (MVV → close) */
    await runScenario(browser, 'Mobile: back navigation', mobileCtx, async page => {
        await page.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            const b = [...document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)')]
                .find(b => b.querySelector('.v-num')?.textContent?.trim() === '16');
            if (b) b.click();
        });
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 6000 });
        await page.waitForTimeout(500);
        // Press back button
        await page.evaluate(() => {
            const btn = document.getElementById('mobile-verse-view-back');
            if (btn) btn.click();
        });
        await page.waitForTimeout(500);
        const mvvOpen = await page.evaluate(() =>
            document.getElementById('mobile-verse-view')?.classList.contains('open')
        );
        if (mvvOpen) throw new Error('MVV still open after back button');
    });

    await browser.close();

    console.log('\n=== Summary ===');
    if (errors.length === 0) {
        console.log('All regression checks PASS (0 console errors)');
    } else {
        console.log(`FAIL: ${errors.length} errors found`);
        errors.forEach(e => console.log(`  - ${e.slice(0, 120)}`));
        process.exit(1);
    }
})();
