const { chromium } = require('playwright');

const BASE = 'http://localhost:8765';
const scratchpad = '/private/tmp/claude-501/-Users-373da-Claude----/f9539f27-1169-4f42-9484-643ff753b052/scratchpad';

async function screenshot(page, name) {
    await page.screenshot({ path: `${scratchpad}/${name}.png`, fullPage: false });
    console.log(`Screenshot: ${name}.png`);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // === PC (1280x800) ===
    const pcCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const pc = await pcCtx.newPage();

    // Load ROM chapter 1 - navigate to near end (verse 30) to be close to boundary
    console.log('=== PC: Loading Romans 1:30 (near end of ch1) ===');
    await pc.goto(`${BASE}/?book=ROM&ch=1&verse=30`, { waitUntil: 'networkidle', timeout: 15000 });
    await pc.waitForTimeout(3000);

    // Check sentinel presence
    const sentinelInfo = await pc.evaluate(() => {
        const s = document.querySelector('.chapter-load-sentinel');
        if (!s) return 'no sentinel';
        const r = s.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, inViewport: r.top < window.innerHeight };
    });
    console.log('Sentinel info:', sentinelInfo);

    // Scroll step by step with wheel events to better simulate user
    for (let i = 0; i < 10; i++) {
        await pc.mouse.wheel(0, 500);
        await pc.waitForTimeout(600);
    }

    await pc.waitForTimeout(2000);

    const blocks = await pc.$$('.chapter-block');
    console.log('Chapter blocks after step-scroll:', blocks.length);

    if (blocks.length < 2) {
        // Try another approach - use keyboard
        await pc.keyboard.press('End');
        await pc.waitForTimeout(2000);
        await pc.mouse.wheel(0, 1000);
        await pc.waitForTimeout(3000);
        const blocks2 = await pc.$$('.chapter-block');
        console.log('Chapter blocks after End key:', blocks2.length);
    }

    const allHeaders = await pc.$$eval('.chapter-header', els => els.map(e => ({
        text: e.textContent,
        display: window.getComputedStyle(e).display,
        chapter: e.closest('[data-chapter]') ? e.closest('[data-chapter]').dataset.chapter : '?'
    })));
    console.log('All headers:', JSON.stringify(allHeaders, null, 2));

    const blocks3 = await pc.$$('.chapter-block');
    if (blocks3.length >= 2) {
        const ch2 = await pc.$('.chapter-block[data-chapter="2"]');
        if (ch2) {
            await ch2.scrollIntoViewIfNeeded();
            await pc.waitForTimeout(500);
            await pc.evaluate(() => window.scrollBy(0, -200));
            await pc.waitForTimeout(400);
            await screenshot(pc, 'pc-boundary-ch1-ch2');
            console.log('PC: boundary screenshot captured');
        }
    } else {
        // Just navigate to ch2 directly to verify the header is hidden
        console.log('Autoload did not trigger, navigating directly to ch2');
        await pc.goto(`${BASE}/?book=ROM&ch=2`, { waitUntil: 'networkidle', timeout: 15000 });
        await pc.waitForTimeout(2000);
        await screenshot(pc, 'pc-rom2-direct');

        const ch2Headers = await pc.$$eval('.chapter-header', els => els.map(e => ({
            text: e.textContent,
            display: window.getComputedStyle(e).display,
            chapter: e.closest('[data-chapter]') ? e.closest('[data-chapter]').dataset.chapter : '?'
        })));
        console.log('ROM ch2 direct headers:', JSON.stringify(ch2Headers));
    }

    // Take a scrolled view from ch2 start
    await screenshot(pc, 'pc-final');

    // Check header text for current chapter
    const headerText = await pc.evaluate(() => {
        const h = document.querySelector('#app-header, .app-header, header, [class*="app-header"]');
        return h ? h.textContent.trim().slice(0, 100) : 'not found';
    });
    console.log('App header:', headerText);

    // === Mobile view ===
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mob = await mCtx.newPage();

    console.log('\n=== Mobile: Loading Romans 1:30 ===');
    await mob.goto(`${BASE}/?book=ROM&ch=1&verse=30`, { waitUntil: 'networkidle', timeout: 15000 });
    await mob.waitForTimeout(3000);
    await screenshot(mob, 'mobile-rom1-v30');

    // Scroll with touch events
    for (let i = 0; i < 10; i++) {
        await mob.mouse.wheel(0, 400);
        await mob.waitForTimeout(600);
    }
    await mob.waitForTimeout(2000);

    const mobBlocks = await mob.$$('.chapter-block');
    console.log('Mobile chapter blocks after scroll:', mobBlocks.length);

    if (mobBlocks.length < 2) {
        console.log('Mobile: autoload did not trigger, navigating to ch2 directly');
        await mob.goto(`${BASE}/?book=ROM&ch=2`, { waitUntil: 'networkidle', timeout: 15000 });
        await mob.waitForTimeout(2000);
        await screenshot(mob, 'mobile-rom2-direct');
        const mHeaders = await mob.$$eval('.chapter-header', els => els.map(e => ({
            text: e.textContent, display: window.getComputedStyle(e).display
        })));
        console.log('Mobile ROM ch2 headers:', JSON.stringify(mHeaders));
    } else {
        const mCh2 = await mob.$('.chapter-block[data-chapter="2"]');
        if (mCh2) {
            await mCh2.scrollIntoViewIfNeeded();
            await mob.evaluate(() => window.scrollBy(0, -150));
            await mob.waitForTimeout(400);
            await screenshot(mob, 'mobile-boundary-ch1-ch2');
        }
    }

    await browser.close();
    console.log('\n=== Done ===');
})();
