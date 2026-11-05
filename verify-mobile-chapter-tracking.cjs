const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SCRATCHPAD = '/private/tmp/claude-501/-Users-373da-Claude----/f9539f27-1169-4f42-9484-643ff753b052/scratchpad';

async function ss(page, name) {
    await page.screenshot({ path: `${SCRATCHPAD}/${name}.png` });
    console.log(`  ss: ${name}.png`);
}

async function getLabels(page) {
    return page.evaluate(() => {
        const mobileLabel = document.getElementById('mobile-location-label');
        const globalBc    = document.getElementById('global-breadcrumb');
        const appState    = typeof AppState !== 'undefined'
            ? { book: AppState.location.book?.key, chapter: AppState.location.chapter }
            : null;
        return {
            mobileLabel:   mobileLabel ? mobileLabel.textContent.trim() : '(not found)',
            globalBreadcrumb: globalBc  ? globalBc.textContent.replace(/\s+/g,' ').trim().slice(0,60) : '(not found)',
            appStateChapter: appState,
        };
    });
}

async function scrollContainerTo(page, offsetTop) {
    await page.evaluate((top) => {
        const c = document.getElementById('main-reading-area');
        if (c) c.scrollTop = top;
    }, offsetTop);
    await page.waitForTimeout(600);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ============================================================
    // Desktop (1280×800)
    // ============================================================
    console.log('\n=== DESKTOP ===');
    const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desk  = await dCtx.newPage();
    await desk.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 15000 });
    await desk.waitForTimeout(2000);

    console.log('Desktop @ ch1:');
    console.log(await getLabels(desk));

    // Scroll to load and reach ch2
    for (let i = 0; i < 10; i++) {
        await desk.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            if (c) c.scrollTop += 400;
        });
        await desk.waitForTimeout(400);
    }
    await desk.waitForTimeout(1000);

    const dBlocks = await desk.$$('.chapter-block');
    console.log(`Desktop: ${dBlocks.length} chapter blocks loaded`);

    // Scroll to ch2 block top
    await desk.evaluate(() => {
        const c = document.getElementById('main-reading-area');
        const b = document.querySelector('.chapter-block[data-chapter="2"]');
        if (c && b) c.scrollTop = b.offsetTop + 200; // 200px into ch2
    });
    await desk.waitForTimeout(800);

    console.log('Desktop @ ch2:');
    console.log(await getLabels(desk));
    await ss(desk, 'desktop-at-ch2');

    // Scroll further to load/reach ch3
    for (let i = 0; i < 15; i++) {
        await desk.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            if (c) c.scrollTop += 400;
        });
        await desk.waitForTimeout(400);
    }
    await desk.waitForTimeout(1000);

    const dBlocks3 = await desk.$$('.chapter-block');
    console.log(`Desktop: ${dBlocks3.length} chapter blocks after more scroll`);
    console.log('Desktop @ ch3 area:');
    console.log(await getLabels(desk));
    await ss(desk, 'desktop-at-ch3');

    // ============================================================
    // Mobile (390×844)
    // ============================================================
    console.log('\n=== MOBILE ===');
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mob   = await mCtx.newPage();
    await mob.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 15000 });
    await mob.waitForTimeout(2000);

    console.log('Mobile @ ch1:');
    console.log(await getLabels(mob));
    await ss(mob, 'mobile-at-ch1');

    // Scroll to load ch2
    for (let i = 0; i < 10; i++) {
        await mob.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            if (c) c.scrollTop += 400;
        });
        await mob.waitForTimeout(400);
    }
    await mob.waitForTimeout(1000);

    const mBlocks = await mob.$$('.chapter-block');
    console.log(`Mobile: ${mBlocks.length} chapter blocks loaded`);

    // Scroll to 200px into ch2
    await mob.evaluate(() => {
        const c = document.getElementById('main-reading-area');
        const b = document.querySelector('.chapter-block[data-chapter="2"]');
        if (c && b) c.scrollTop = b.offsetTop + 200;
    });
    await mob.waitForTimeout(800);

    console.log('Mobile @ ch2 (200px in):');
    const labelsAtCh2 = await getLabels(mob);
    console.log(labelsAtCh2);
    await ss(mob, 'mobile-at-ch2');

    // Scroll more to load/reach ch3
    for (let i = 0; i < 20; i++) {
        await mob.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            if (c) c.scrollTop += 400;
        });
        await mob.waitForTimeout(350);
    }
    await mob.waitForTimeout(1000);

    const mBlocks3 = await mob.$$('.chapter-block');
    console.log(`Mobile: ${mBlocks3.length} chapter blocks after more scroll`);

    const ch3Block = await mob.$('.chapter-block[data-chapter="3"]');
    if (ch3Block) {
        await mob.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            const b = document.querySelector('.chapter-block[data-chapter="3"]');
            if (c && b) c.scrollTop = b.offsetTop + 200;
        });
        await mob.waitForTimeout(800);
    }

    console.log('Mobile @ ch3 area:');
    const labelsAtCh3 = await getLabels(mob);
    console.log(labelsAtCh3);
    await ss(mob, 'mobile-at-ch3');

    // KEY CHECK: is AppState updated but mobile label not?
    console.log('\n=== KEY COMPARISON ===');
    console.log('Mobile ch3: AppState.chapter =', labelsAtCh3.appStateChapter?.chapter);
    console.log('Mobile ch3: mobileLabel      =', labelsAtCh3.mobileLabel);
    const mismatch = labelsAtCh3.appStateChapter?.chapter !== undefined &&
        !labelsAtCh3.mobileLabel.includes(String(labelsAtCh3.appStateChapter.chapter));
    console.log('Mismatch (AppState updated but label not)?', mismatch ? 'YES — BUG CONFIRMED' : 'No mismatch');

    await browser.close();
    console.log('\n=== Done ===');
})();
