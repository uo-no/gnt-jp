/**
 * MVV Level 2 ドロワー復活確認テスト
 * 修正: 8e65786c ブロック削除により MVV Level 2 チップタップ → ドロワー（二層目）が表示されること
 *
 * テスト:
 *   MVV-D1: モバイル - 節タップ → Level 2 word list が表示される
 *   MVV-D2: モバイル - チップタップ → ドロワーが表示される（二層目）
 *   MVV-D3: モバイル - ドロワーに Greek が表示される
 *   MVV-D4: モバイル - ドロワーに日本語が表示される
 *   MVV-D5: モバイル - ドロワーに語義（glosses）が表示される
 *   MVV-D6: モバイル - 「語の意味や用法を調べる」ボタンタップ → Level 3 が表示される
 *   MVV-D7: モバイル - Level 3 に語義（rn-glosses）が表示される
 */

const { chromium, devices } = require('playwright');
const BASE = 'http://localhost:8765';
const SCRAP = '/private/tmp/claude-501/-Users-373da/8529806c-ff5c-46a9-b3ba-2741b6d322a5/scratchpad';

let pass = 0, fail = 0;
function ok(name, cond, detail) {
    if (cond) { console.log(`  PASS  ${name}`); pass++; }
    else       { console.log(`  FAIL  ${name}${detail ? ' (' + detail + ')' : ''}`); fail++; }
}

async function testMvvDrawer(browser) {
    const ctx = await browser.newContext({ ...devices['iPhone 14'] });
    const page = await ctx.newPage();

    console.log('\n[MVV Drawer] Mobile JA1955 - 節タップ → Level2 チップ → ドロワー（二層目）');
    await page.goto(`${BASE}/index.html?transA=JA1955&ref=ROM+1:1`);
    await page.waitForTimeout(4000);

    // 節タップ → MVV Level 2
    const vb = await page.$('.verse-block');
    ok('MVV-D1a verse-block exists', !!vb);
    if (!vb) { await ctx.close(); return; }

    await vb.tap();
    await page.waitForTimeout(2000);

    const inspArea = await page.$('#mobile-inspector-area');
    ok('MVV-D1 Level 2 opens (mobile-inspector-area)', !!inspArea);

    const chips = await page.$$('#mobile-inspector-area .wlv-chip');
    ok('MVV-D1 chips in Level 2', chips.length > 0, `found ${chips.length}`);

    await page.screenshot({ path: `${SCRAP}/mvv_d1_level2.png` });

    // チップタップ → ドロワー
    if (chips.length === 0) {
        ok('MVV-D2 drawer appears', false, 'no chips');
        await ctx.close(); return;
    }

    await chips[0].tap();
    await page.waitForTimeout(1000);

    // ドロワーが表示されているか
    const drawer = await page.$('#wlv-detail-drawer.visible');
    ok('MVV-D2 drawer visible after chip tap', !!drawer);

    await page.screenshot({ path: `${SCRAP}/mvv_d2_drawer.png` });

    if (!drawer) {
        // Level 3 に行ってしまっているか確認
        const wordDetail = await page.$('.mvv-word-detail');
        console.log(`    → Level3 (.mvv-word-detail) present: ${!!wordDetail}`);
        await ctx.close(); return;
    }

    // ドロワー内容確認
    const greekText = await page.$eval('#wlv-dd-greek', el => el.textContent.trim()).catch(() => '');
    ok('MVV-D3 drawer shows Greek', greekText.length > 0, `got: "${greekText}"`);

    const jaText = await page.$eval('#wlv-dd-ja', el => el.textContent.trim()).catch(() => '');
    ok('MVV-D4 drawer shows Japanese', jaText.length > 0 && jaText !== '-', `got: "${jaText}"`);

    const glossText = await page.$eval('#wlv-dd-glosses', el => el.textContent.trim()).catch(() => '');
    ok('MVV-D5 drawer shows glosses', glossText.length > 0, `got: "${glossText}"`);

    console.log(`    Greek: ${greekText}, JA: ${jaText}, Glosses: ${glossText}`);

    // 「語の意味や用法を調べる」 → Level 3
    const studyBtn = await page.$('#wlv-dd-study-btn');
    ok('MVV-D6a study button exists', !!studyBtn);

    if (studyBtn) {
        await studyBtn.tap();
        await page.waitForTimeout(2000);

        const wordDetail = await page.$('.mvv-word-detail');
        ok('MVV-D6 Level 3 opens after study btn', !!wordDetail);
        await page.screenshot({ path: `${SCRAP}/mvv_d6_level3.png` });

        if (wordDetail) {
            const rnGlosses = await page.$('.rn-glosses');
            ok('MVV-D7 Level 3 rn-glosses present', !!rnGlosses);
        }
    }

    await ctx.close();
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        await testMvvDrawer(browser);
    } finally {
        await browser.close();
    }
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`結果: ${pass} PASS / ${fail} FAIL`);
    if (fail > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
