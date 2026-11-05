const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const scratchpad = '/private/tmp/claude-501/-Users-373da-Claude----/f9539f27-1169-4f42-9484-643ff753b052/scratchpad';

async function screenshot(page, name) {
    await page.screenshot({ path: `${scratchpad}/${name}.png`, fullPage: false });
    console.log(`Screenshot: ${name}.png`);
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const mob = await mCtx.newPage();

    console.log('=== Mobile: Loading Romans 1 (fresh, no panel open) ===');
    // Load at ch1 start to avoid any verse selection
    await mob.goto(`${BASE}/?book=ROM&ch=1`, { waitUntil: 'networkidle', timeout: 15000 });
    await mob.waitForTimeout(3000);
    await screenshot(mob, 'mobile-rom1-fresh');

    // Use the scroll container approach
    const containerInfo = await mob.evaluate(() => {
        const c = document.getElementById('main-reading-area');
        return c ? {
            scrollTop: c.scrollTop,
            scrollHeight: c.scrollHeight,
            clientHeight: c.clientHeight,
            overflow: window.getComputedStyle(c).overflowY
        } : 'not found';
    });
    console.log('Mobile container:', containerInfo);

    // Scroll to end of chapter 1 (near the bottom)
    await mob.evaluate(() => {
        const c = document.getElementById('main-reading-area');
        if (c) c.scrollTop = c.scrollHeight - c.clientHeight - 200;
    });
    await mob.waitForTimeout(2000);

    const mBlocks = await mob.$$('.chapter-block');
    console.log('Mobile blocks after scroll:', mBlocks.length);

    if (mBlocks.length >= 2) {
        // Find the ch2 header and scroll to it
        const ch2Info = await mob.evaluate(() => {
            const c = document.getElementById('main-reading-area');
            const ch2Block = document.querySelector('.chapter-block[data-chapter="2"]');
            if (!ch2Block || !c) return null;
            const header = ch2Block.querySelector('.chapter-header');
            const blockRect = ch2Block.getBoundingClientRect();
            const containerRect = c.getBoundingClientRect();
            // Scroll so ch2 header is near top of container
            const scrollNeeded = ch2Block.offsetTop - c.clientHeight * 0.2;
            c.scrollTop = scrollNeeded;
            return {
                headerText: header ? header.textContent : 'no header',
                headerDisplay: header ? window.getComputedStyle(header).display : 'no header'
            };
        });
        console.log('Ch2 header on mobile:', JSON.stringify(ch2Info));
        await mob.waitForTimeout(500);
        await screenshot(mob, 'mobile-boundary-clean');
    } else {
        // Fallback: just scroll more
        for (let i = 0; i < 10; i++) {
            await mob.evaluate(() => {
                const c = document.getElementById('main-reading-area');
                if (c) c.scrollTop += 500;
            });
            await mob.waitForTimeout(400);
        }
        const blocks2 = await mob.$$('.chapter-block');
        console.log('Mobile blocks after more scroll:', blocks2.length);
        await screenshot(mob, 'mobile-after-more-scroll');
    }

    await browser.close();
    console.log('Done.');
})();
