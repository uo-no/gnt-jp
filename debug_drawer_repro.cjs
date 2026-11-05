const { chromium } = require('playwright');
const SCRAP = '/private/tmp/claude-501/-Users-373da/8529806c-ff5c-46a9-b3ba-2741b6d322a5/scratchpad';
(async () => {
    const browser = await chromium.launch({ headless: true });

    // テスト1: JA1955 モード（PC）- 節タップ → word list → chip タップ → drawer
    const ctx1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p1 = await ctx1.newPage();
    const errs1 = [];
    p1.on('pageerror', e => errs1.push(e.message));
    await p1.goto('http://localhost:8765/index.html?transA=JA1955&ref=ROM+1:1');
    await p1.waitForTimeout(3000);
    const vb1 = await p1.$('.verse-block');
    await vb1.click();
    await p1.waitForTimeout(1500);
    const wlv1 = await p1.$('#word-list-view');
    console.log('[JA1955 PC] word-list-view:', !!wlv1);
    const chips1 = await p1.$$('#word-list-view .wlv-chip');
    console.log('[JA1955 PC] chips in word-list:', chips1.length);
    if (chips1.length > 0) {
        await chips1[0].click();
        await p1.waitForTimeout(500);
        const drawer1 = await p1.$('.wlv-detail-drawer.visible');
        console.log('[JA1955 PC] drawer visible:', !!drawer1);
        if (drawer1) {
            const greek = await p1.$eval('#wlv-dd-greek', e => e.textContent);
            const ja = await p1.$eval('#wlv-dd-ja', e => e.textContent);
            const glosses = await p1.$eval('#wlv-dd-glosses', e => e.textContent);
            console.log('[JA1955 PC] Greek:', greek, '/ JA:', ja, '/ Glosses:', glosses);
        }
    }
    await p1.screenshot({ path: `${SCRAP}/repro_ja1955_drawer.png` });
    await ctx1.close();

    // テスト2: WORD_ORDER(FLOW)モード（PC）
    const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const p2 = await ctx2.newPage();
    await p2.goto('http://localhost:8765/index.html?transA=WORD_ORDER&ref=ROM+1:1');
    await p2.waitForTimeout(3000);
    const vb2 = await p2.$('.verse-block');
    await vb2.click();
    await p2.waitForTimeout(2000); // wait for async translation overwrite
    const wlv2_chips = await p2.$$('#word-list-view .wlv-chip');
    console.log('\n[WORD_ORDER PC] chips in word-list:', wlv2_chips.length);
    const wlv2_content = await p2.$eval('#word-list-view', e => e.innerHTML.slice(0, 200));
    console.log('[WORD_ORDER PC] word-list content (first 200):', wlv2_content);
    await p2.screenshot({ path: `${SCRAP}/repro_flow_drawer.png` });
    await ctx2.close();

    // テスト3: モバイル（iPhone）- 節タップ → MVV Level 2 → chip タップ
    const ctx3 = await browser.newContext({ ...require('playwright').devices['iPhone 14'] });
    const p3 = await ctx3.newPage();
    await p3.goto('http://localhost:8765/index.html?transA=JA1955&ref=ROM+1:1');
    await p3.waitForTimeout(4000);
    const vb3 = await p3.$('.verse-block');
    await vb3.tap();
    await p3.waitForTimeout(2000);
    const mvvChips = await p3.$$('#mobile-inspector-area .wlv-chip');
    console.log('\n[Mobile JA1955] chips in MVV Level 2:', mvvChips.length);
    if (mvvChips.length > 0) {
        await mvvChips[0].tap();
        await p3.waitForTimeout(2000);
        const level3 = await p3.$('.mvv-word-detail');
        const drawer = await p3.$('.wlv-detail-drawer.visible');
        console.log('[Mobile JA1955] Level 3 (mvv-word-detail):', !!level3, '/ drawer visible:', !!drawer);
    }
    await p3.screenshot({ path: `${SCRAP}/repro_mobile_l2_chip.png` });
    await ctx3.close();

    await browser.close();
    console.log('\nDone. Check screenshots at SCRAP.');
})().catch(e => { console.error(e); process.exit(1); });
