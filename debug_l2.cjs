const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    // Mobile (MVV path)
    const ctx = await browser.newContext({ ...require('playwright').devices['iPhone 14'] });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('http://localhost:8765/index.html?transA=JA1955&ref=ROM+1:1');
    await page.waitForTimeout(4000);

    // 節タップ → MVV Level 2
    const vb = await page.$('.verse-block');
    await vb.tap();
    await page.waitForTimeout(2000);

    const mvv = await page.$('#mobile-verse-view.open');
    const inspArea = await page.$('#mobile-inspector-area');
    const chips = await page.$$('#mobile-inspector-area .wlv-chip');
    const mode = await page.$eval('#mobile-verse-view', el => el.classList.contains('open') ? 'open' : 'closed').catch(() => 'N/A');

    console.log('MVV open:', !!mvv);
    console.log('inspector-area:', !!inspArea);
    console.log('chips in Level 2:', chips.length);
    console.log('JS errors:', errors.length ? errors.join('\n') : 'none');

    // PC path
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await ctx2.newPage();
    const errors2 = [];
    page2.on('pageerror', e => errors2.push(e.message));
    await page2.goto('http://localhost:8765/index.html?transA=JA1955&ref=ROM+1:1');
    await page2.waitForTimeout(2000);
    const vb2 = await page2.$('.verse-block');
    await vb2.click();
    await page2.waitForTimeout(1000);
    const wlv2 = await page2.$('#word-list-view');
    console.log('\nPC word-list-view:', !!wlv2);
    console.log('PC JS errors:', errors2.length ? errors2.join('\n') : 'none');

    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
