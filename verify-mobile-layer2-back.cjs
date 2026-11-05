/**
 * verify-mobile-layer2-back.cjs
 * モバイル版：第二層から第一層への戻る操作を検証する。
 *
 * Exit Criteria:
 *   1. FLOW chip tap → Level3 → Level2 → Level1（基本フロー）
 *   2. MVV Level2 → Level1（通常の節タップ後、単純バック）
 *   3. StudyPanel open + MVV open → Level1（StudyPanel 競合解決）
 *   4. StudyPanel open + MVV open → hardware back → Level1
 *   5. PC 回帰：非タッチ390px StudyPanel Layer2 → Layer1
 *
 * 環境: 390×844 + touch (テスト 1〜4)、390×844 非touch (テスト 5)
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';

let passCount = 0;
let failCount = 0;

async function check(label, cond, info = '') {
    if (cond) {
        console.log(`  ✅ ${label}${info ? ' — ' + info : ''}`);
        passCount++;
    } else {
        console.log(`  ❌ FAIL: ${label}${info ? ' — ' + info : ''}`);
        failCount++;
    }
}

async function getState(page) {
    return page.evaluate(() => ({
        mvvOpen:  !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
        spOpen:   !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        mvvMode:  typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
        backLabel: document.getElementById('mobile-verse-view-back')?.textContent?.trim() || '',
        verseCount: document.querySelectorAll('.verse-block').length,
    }));
}

async function forceSPOpen(page) {
    await page.evaluate(() => {
        const sp = document.getElementById('bottom-depth-panel');
        if (sp) {
            sp.classList.add('open');
            document.getElementById('app')?.classList.add('mobile-study-open');
        }
    });
    await page.waitForTimeout(200);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ── タッチ環境 (テスト 1〜4) ──────────────────────────────────────
    const ctxTouch = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const page = await ctxTouch.newPage();
    page.on('pageerror', err => console.error('[page error]', err.message));

    // ────────────────────────────────────────────────────────────────
    console.log('\n[T1] FLOW chip → Level3 → Level2 → Level1（通常フロー）');
    await page.goto(`${BASE}/?book=JHN&chapter=3&transA=FLOW`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    const t1_chips = await page.locator('.wlv-chip').count();
    if (t1_chips === 0) {
        console.log('  SKIP: chip が存在しない');
    } else {
        await page.locator('.wlv-chip').first().tap();
        await page.waitForTimeout(500);
        const t1_l3 = await getState(page);
        await check('chip tap後 MVV が開く', t1_l3.mvvOpen);
        await check('Level3 mode=detail', t1_l3.mvvMode === 'detail');
        await check('Level3 back label=‹一覧', t1_l3.backLabel.includes('一覧'));
        await check('StudyPanel は closed', !t1_l3.spOpen);

        // Level3 → Level2
        await page.locator('#mobile-verse-view-back').tap();
        await page.waitForTimeout(400);
        const t1_l2 = await getState(page);
        await check('L3→L2: MVV still open', t1_l2.mvvOpen);
        await check('L3→L2: mode=list', t1_l2.mvvMode === 'list');
        await check('L3→L2: back label=‹読書に戻る', t1_l2.backLabel.includes('読書に戻る'));
        await check('L3→L2: StudyPanel closed', !t1_l2.spOpen);

        // Level2 → Level1
        await page.locator('#mobile-verse-view-back').tap();
        await page.waitForTimeout(400);
        const t1_l1 = await getState(page);
        await check('L2→L1: MVV closed', !t1_l1.mvvOpen);
        await check('L2→L1: StudyPanel closed', !t1_l1.spOpen);
        await check('L2→L1: verse blocks visible', t1_l1.verseCount > 0);
    }

    // ────────────────────────────────────────────────────────────────
    console.log('\n[T2] JS強制でMVV Level2→Level1（シンプルバック）');
    await page.goto(`${BASE}/?book=JHN&chapter=3`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
        const words = typeof _wlvWordCache !== 'undefined' ? _wlvWordCache : [];
        if (typeof openMobileVerseView === 'function') openMobileVerseView(1, words, null, 3);
    });
    await page.waitForTimeout(400);
    const t2_l2 = await getState(page);
    await check('MVV が Level2 で開く', t2_l2.mvvOpen && t2_l2.mvvMode === 'list');

    await page.locator('#mobile-verse-view-back').tap();
    await page.waitForTimeout(400);
    const t2_l1 = await getState(page);
    await check('戻り後 MVV closed', !t2_l1.mvvOpen);
    await check('戻り後 StudyPanel closed', !t2_l1.spOpen);

    // ────────────────────────────────────────────────────────────────
    console.log('\n[T3] StudyPanel open + MVV open → UI back → Layer1（バグ修正確認）');
    await page.goto(`${BASE}/?book=JHN&chapter=3`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await forceSPOpen(page);
    const t3_sp = await getState(page);
    await check('StudyPanel が open', t3_sp.spOpen);

    await page.evaluate(() => {
        if (typeof openMobileVerseView === 'function') openMobileVerseView(1, [], null, 3);
    });
    await page.waitForTimeout(400);
    const t3_mvv = await getState(page);
    await check('MVV が open（SP の上に乗る）', t3_mvv.mvvOpen);
    await check('StudyPanel はまだ open（MVV の裏）', t3_mvv.spOpen);

    await page.locator('#mobile-verse-view-back').tap();
    await page.waitForTimeout(500);
    const t3_l1 = await getState(page);
    await check('UI back後 MVV closed', !t3_l1.mvvOpen, `actual: ${t3_l1.mvvOpen}`);
    await check('UI back後 StudyPanel も closed（Layer 1）', !t3_l1.spOpen, `actual: ${t3_l1.spOpen}`);
    await check('verse blocks が見える', t3_l1.verseCount > 0);

    // ────────────────────────────────────────────────────────────────
    console.log('\n[T4] StudyPanel open + MVV open → hardware back → Layer1');
    await page.goto(`${BASE}/?book=JHN&chapter=3`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);

    await forceSPOpen(page);
    await page.evaluate(() => {
        if (typeof openMobileVerseView === 'function') openMobileVerseView(1, [], null, 3);
    });
    await page.waitForTimeout(400);
    const t4_mvv = await getState(page);
    await check('MVV + SP が open', t4_mvv.mvvOpen && t4_mvv.spOpen);

    await page.goBack();
    await page.waitForTimeout(500);
    const t4_l1 = await getState(page);
    await check('hardware back後 MVV closed', !t4_l1.mvvOpen);
    await check('hardware back後 StudyPanel も closed', !t4_l1.spOpen);

    await ctxTouch.close();

    // ── 非タッチ環境 (テスト 5: PC 回帰) ───────────────────────────────
    console.log('\n[T5] 非タッチ390px StudyPanel Layer2 → Layer1（PC 回帰）');
    const ctxNoTouch = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: false,
    });
    const page5 = await ctxNoTouch.newPage();
    await page5.goto(`${BASE}/?book=JHN&chapter=3&transA=FLOW`, { waitUntil: 'networkidle' });
    await page5.waitForTimeout(1200);

    const t5_isActualMobile = await page5.evaluate(() =>
        typeof _isActualMobile === 'function' ? _isActualMobile() : null
    );
    await check('_isActualMobile() = false (非タッチ)', t5_isActualMobile === false);

    // 節をクリック → StudyPanel Layer2
    await page5.locator('.verse-block').first().click();
    await page5.waitForTimeout(500);
    const t5_l2 = await page5.evaluate(() => ({
        spOpen: !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        panelMode: typeof _panelContentMode !== 'undefined' ? _panelContentMode : '?',
    }));
    await check('非タッチ: 節クリックで StudyPanel Layer2 が開く', t5_l2.spOpen, `mode=${t5_l2.panelMode}`);
    await check('非タッチ: _panelContentMode = verse', t5_l2.panelMode === 'verse');

    // #mobile-panel-back クリック → panelGoBack() → closeStudyPanel()
    await page5.locator('#mobile-panel-back').click();
    await page5.waitForTimeout(400);
    const t5_l1 = await page5.evaluate(() => ({
        spOpen: !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
    }));
    await check('非タッチ: #mobile-panel-back で StudyPanel 閉じる（Layer 1）', !t5_l1.spOpen);

    await ctxNoTouch.close();
    await browser.close();

    // ── 結果サマリー ──────────────────────────────────────────────────
    console.log(`\n${'='.repeat(50)}`);
    console.log(`結果: ${passCount} PASS / ${failCount} FAIL`);
    if (failCount > 0) {
        console.log('OVERALL: FAIL');
        process.exit(1);
    } else {
        console.log('OVERALL: PASS');
    }
})().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
