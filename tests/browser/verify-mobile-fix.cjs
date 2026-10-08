const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-playwright';
require('fs').mkdirSync(SP, { recursive: true });

async function ss(page, name) {
    await page.screenshot({ path: `${SP}/${name}.png` });
    console.log(`  ss: ${name}.png`);
}

async function getLabels(page) {
    return page.evaluate(() => {
        const ml  = document.getElementById('mobile-location-label');
        const gbc = document.getElementById('global-breadcrumb');
        const as  = typeof AppState !== 'undefined'
            ? { book: AppState.location.book?.key, chapter: AppState.location.chapter }
            : null;
        return {
            mobileLabel: ml  ? ml.textContent.trim() : '(not found)',
            globalBc:    gbc ? gbc.textContent.replace(/\s+/g,' ').trim().slice(0,60) : '(not found)',
            appState:    as,
        };
    });
}

async function scrollToChapter(page, ch) {
    await page.evaluate((c) => {
        const container = document.getElementById('main-reading-area');
        const block = document.querySelector(`.chapter-block[data-chapter="${c}"]`);
        if (container && block) container.scrollTop = block.offsetTop + 200;
    }, ch);
    await page.waitForTimeout(800);
}

async function scrollDown(page, steps, step = 400, delay = 350) {
    for (let i = 0; i < steps; i++) {
        await page.evaluate((s) => {
            const c = document.getElementById('main-reading-area');
            if (c) c.scrollTop += s;
        }, step);
        await page.waitForTimeout(delay);
    }
    await page.waitForTimeout(800);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ============================================================
    // Mobile (390×844) — MAIN CHECK
    // ============================================================
    console.log('\n=== MOBILE: ROM 1→2→3→4 ===');
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mob  = await mCtx.newPage();
    await mob.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 15000 });
    await mob.waitForTimeout(2000);

    console.log('@ ch1:');
    const m1 = await getLabels(mob);
    console.log(m1);
    await ss(mob, 'fix-mobile-ch1');

    // Load ch2
    await scrollDown(mob, 12);
    let blocks = await mob.$$('.chapter-block');
    console.log(`  Blocks loaded: ${blocks.length}`);
    await scrollToChapter(mob, 2);
    console.log('@ ch2:');
    const m2 = await getLabels(mob);
    console.log(m2);
    await ss(mob, 'fix-mobile-ch2');

    // Load ch3
    await scrollDown(mob, 20);
    blocks = await mob.$$('.chapter-block');
    console.log(`  Blocks loaded: ${blocks.length}`);
    if (await mob.$('.chapter-block[data-chapter="3"]')) {
        await scrollToChapter(mob, 3);
        console.log('@ ch3:');
        const m3 = await getLabels(mob);
        console.log(m3);
        await ss(mob, 'fix-mobile-ch3');

        // Load ch4
        await scrollDown(mob, 20);
        blocks = await mob.$$('.chapter-block');
        console.log(`  Blocks loaded: ${blocks.length}`);
        if (await mob.$('.chapter-block[data-chapter="4"]')) {
            await scrollToChapter(mob, 4);
            console.log('@ ch4:');
            const m4 = await getLabels(mob);
            console.log(m4);
            await ss(mob, 'fix-mobile-ch4');
        }
    }

    // ============================================================
    // Mobile result summary
    // ============================================================
    console.log('\n--- Mobile summary ---');
    const mFinal = await getLabels(mob);
    console.log('AppState.chapter:', mFinal.appState?.chapter);
    console.log('mobileLabel:     ', mFinal.mobileLabel);
    const mPass = mFinal.mobileLabel.includes(String(mFinal.appState?.chapter));
    console.log('Mobile PASS?', mPass ? 'YES ✅' : 'NO ❌');

    // ============================================================
    // Desktop (1280×800) — REGRESSION CHECK
    // ============================================================
    console.log('\n=== DESKTOP REGRESSION: ROM 1→2→3→4 ===');
    const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desk  = await dCtx.newPage();
    await desk.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 15000 });
    await desk.waitForTimeout(2000);

    console.log('Desktop @ ch1:');
    const d1 = await getLabels(desk);
    console.log(d1);

    await scrollDown(desk, 12);
    await scrollToChapter(desk, 2);
    console.log('Desktop @ ch2:');
    const d2 = await getLabels(desk);
    console.log(d2);
    await ss(desk, 'fix-desktop-ch2');

    await scrollDown(desk, 20);
    if (await desk.$('.chapter-block[data-chapter="3"]')) {
        await scrollToChapter(desk, 3);
        console.log('Desktop @ ch3:');
        const d3 = await getLabels(desk);
        console.log(d3);

        await scrollDown(desk, 20);
        if (await desk.$('.chapter-block[data-chapter="4"]')) {
            await scrollToChapter(desk, 4);
            console.log('Desktop @ ch4:');
            const d4 = await getLabels(desk);
            console.log(d4);
            await ss(desk, 'fix-desktop-ch4');
        }
    }

    // ============================================================
    // Chapter boundary · · · check
    // ============================================================
    console.log('\n=== CHAPTER BOUNDARY CHECK ===');
    const ch2HeaderMob = await mob.$eval(
        '.chapter-block[data-chapter="2"] .chapter-header',
        e => ({ text: e.textContent, display: window.getComputedStyle(e).display })
    ).catch(() => null);
    console.log('Mobile ch2 header:', ch2HeaderMob);

    const ch2HeaderDesk = await desk.$eval(
        '.chapter-block[data-chapter="2"] .chapter-header',
        e => ({ text: e.textContent, display: window.getComputedStyle(e).display })
    ).catch(() => null);
    console.log('Desktop ch2 header:', ch2HeaderDesk);

    // ============================================================
    // Verse numbers & studypanel presence
    // ============================================================
    console.log('\n=== REGRESSION SPOT CHECKS ===');
    const mobVerseNums = await mob.$$eval('.v-num', els => els.slice(0,5).map(e => e.textContent.trim()));
    console.log('Mobile verse numbers (first 5):', mobVerseNums);

    const studyPanelExists = await mob.$('#bottom-depth-panel') !== null;
    console.log('StudyPanel DOM present:', studyPanelExists);

    await browser.close();
    console.log('\n=== Done ===');
})();
