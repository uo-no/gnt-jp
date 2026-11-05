/**
 * verify-drawer-close.cjs
 * #wlv-detail-drawer 単体クローズ機能の検証
 *
 * Exit Criteria:
 *   T1: chip タップ → ドロワーが開く
 *   T2: × ボタン → ドロワーだけ閉じる（StudyPanel・語句一覧は維持）
 *   T3: StudyPanel は開いたまま、語句一覧（.wlv-chip）が維持される
 *   T4: 同一 chip の再タップ → ドロワーが閉じる
 *   T5: 別の chip タップ → ドロワーの内容が更新される
 *   T6: 「語の意味や用法を調べる」→ StudyPanel が Level 3 へ遷移する
 *   T7: 「ほかの箇所での使われ方を見る」→ 新しいタブが開く
 *   T8: PC回帰: 本文 chip タップ → Level 3 / 戻るで Panel 全閉
 *   T9: 非タッチ狭窓回帰: 戻るボタンで Level 2 → Panel 全閉
 *   T10: 実タッチモバイル回帰: MVV 戻る操作に影響しない
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:5174';
/* transA=JA1955 のとき _transA='JA1955' → companion='WORD_ORDER' → StudyPanel に chip が表示される */
const FLOW_URL = `${BASE}/?book=JHN&chapter=3&transA=JA1955`;

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
        drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
        spOpen:        !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        chipCount:     document.querySelectorAll('#word-list-view .wlv-chip').length,
        activeTokenId: typeof _wlvActiveTokenId !== 'undefined' ? _wlvActiveTokenId : null,
        ddGreek:       document.getElementById('wlv-dd-greek')?.textContent?.trim() || '',
        panelMode:     typeof _panelContentMode !== 'undefined' ? _panelContentMode : '?',
    }));
}

/**
 * StudyPanel を Level 2（語句一覧）で開く。
 * FLOW URL（transA=JA1955）では verse-block.onclick() を直接呼ぶことで chip 経由の
 * Level3 直行を避ける。_cachedElByVerse は JA1955 モードでは空のためこのアプローチを取る。
 */
async function openSPLevel2(page) {
    await page.goto(FLOW_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
        const vb = document.querySelector('.verse-block');
        if (vb && typeof vb.onclick === 'function') vb.onclick();
    });
    await page.waitForTimeout(500);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ══════════════════════════════════════════════════════
    // PC 環境（1280×800, no touch）
    // ══════════════════════════════════════════════════════
    const ctxPC = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        hasTouch: false,
    });
    const pc = await ctxPC.newPage();
    pc.on('pageerror', err => console.error('[page error]', err.message));

    // ────────────────────────────────────────────────────
    console.log('\n[T1] PC: chip タップでドロワーが開く');
    await openSPLevel2(pc);
    const t1_l2 = await getState(pc);
    await check('StudyPanel Level2 が開く', t1_l2.spOpen && t1_l2.panelMode === 'verse',
        `spOpen=${t1_l2.spOpen} mode=${t1_l2.panelMode}`);
    await check('StudyPanel 内に chip が存在する', t1_l2.chipCount > 0, `chips=${t1_l2.chipCount}`);

    // StudyPanel 内の chip（#word-list-view 内）をクリック
    await pc.locator('#word-list-view .wlv-chip').first().click();
    await pc.waitForTimeout(300);
    const t1_drawer = await getState(pc);
    await check('chip クリックでドロワーが開く', t1_drawer.drawerVisible);
    await check('StudyPanel は開いたまま（Level2）', t1_drawer.spOpen && t1_drawer.panelMode === 'verse',
        `spOpen=${t1_drawer.spOpen} mode=${t1_drawer.panelMode}`);
    await check('_wlvActiveTokenId が設定される', t1_drawer.activeTokenId !== null);
    await check('Greek 語形が表示される', t1_drawer.ddGreek !== '-' && t1_drawer.ddGreek !== '');

    // ────────────────────────────────────────────────────
    console.log('\n[T2] PC: × ボタンでドロワーだけ閉じる');
    await pc.locator('#wlv-detail-drawer .wlv-dd-close-btn').click();
    await pc.waitForTimeout(300);
    const t2 = await getState(pc);
    await check('× 後にドロワーが閉じる', !t2.drawerVisible);
    await check('× 後も StudyPanel は開いたまま', t2.spOpen);
    await check('× 後も panelMode = verse（語句一覧維持）', t2.panelMode === 'verse');
    await check('× 後 _wlvActiveTokenId = null', t2.activeTokenId === null);

    // ────────────────────────────────────────────────────
    console.log('\n[T3] PC: StudyPanel・語句一覧が維持される（chip の DOM 確認）');
    const t3_chipCount = await pc.evaluate(() =>
        document.querySelectorAll('#word-list-view .wlv-chip').length
    );
    await check('#word-list-view の chip が存在する', t3_chipCount > 0, `chips=${t3_chipCount}`);
    const t3_listExists = await pc.evaluate(() => !!document.getElementById('word-list-view'));
    await check('#word-list-view が DOM に存在する', t3_listExists);

    // ────────────────────────────────────────────────────
    console.log('\n[T4] PC: 同一 chip の再タップでドロワーが閉じる（トグル）');
    // 1回目のタップでドロワーを開く
    await pc.locator('#word-list-view .wlv-chip').first().click();
    await pc.waitForTimeout(300);
    const t4_open = await getState(pc);
    await check('1回目タップでドロワーが開く', t4_open.drawerVisible);

    // 同じ chip を再タップ
    await pc.locator('#word-list-view .wlv-chip').first().click();
    await pc.waitForTimeout(300);
    const t4_closed = await getState(pc);
    await check('同一 chip 再タップでドロワーが閉じる', !t4_closed.drawerVisible);
    await check('StudyPanel は開いたまま（トグル後）', t4_closed.spOpen);
    await check('panelMode は verse のまま（トグル後）', t4_closed.panelMode === 'verse');

    // ────────────────────────────────────────────────────
    console.log('\n[T5] PC: 別 chip タップでドロワー内容が更新される');
    const chipsInPanel = await pc.locator('#word-list-view .wlv-chip').all();
    if (chipsInPanel.length < 2) {
        console.log('  SKIP: chip が1個しかない');
    } else {
        // 1つ目を開く
        await pc.locator('#word-list-view .wlv-chip').nth(0).click();
        await pc.waitForTimeout(300);
        const t5_first = await getState(pc);
        await check('1つ目 chip でドロワーが開く', t5_first.drawerVisible);
        const t5_token1 = t5_first.activeTokenId;

        // 2つ目（別 chip）をタップ
        await pc.locator('#word-list-view .wlv-chip').nth(1).click();
        await pc.waitForTimeout(300);
        const t5_second = await getState(pc);
        await check('別 chip タップ後もドロワーが開いている', t5_second.drawerVisible);
        await check('tokenId が変わる', t5_second.activeTokenId !== t5_token1,
            `${t5_token1} → ${t5_second.activeTokenId}`);
        await check('StudyPanel は開いたまま', t5_second.spOpen);
    }

    // ────────────────────────────────────────────────────
    console.log('\n[T6] PC: 「語の意味や用法を調べる」→ StudyPanel Level 3 へ');
    // ドロワーを開く（T5 で閉じていた可能性があるためリロード不要、chip を再クリック）
    if (!(await getState(pc)).drawerVisible) {
        await pc.locator('#word-list-view .wlv-chip').first().click();
        await pc.waitForTimeout(300);
    }
    const t6_open = await getState(pc);
    await check('T6: ドロワーが開いている', t6_open.drawerVisible);

    await pc.locator('#wlv-dd-study-btn').click();
    await pc.waitForTimeout(600);
    const t6_l3 = await getState(pc);
    await check('Level3: StudyPanel が開いたまま', t6_l3.spOpen);
    await check('Level3: panelMode = word', t6_l3.panelMode === 'word', `mode=${t6_l3.panelMode}`);

    // ────────────────────────────────────────────────────
    console.log('\n[T7] PC: 「ほかの箇所での使われ方を見る」→ 新しいタブ');
    await openSPLevel2(pc);
    await pc.locator('#word-list-view .wlv-chip').first().click();
    await pc.waitForTimeout(300);

    const [newTab] = await Promise.all([
        ctxPC.waitForEvent('page', { timeout: 5000 }).catch(() => null),
        pc.locator('#wlv-detail-drawer a.wlv-detail-study-btn').click(),
    ]);
    await check('新しいタブが開く', newTab !== null);
    if (newTab) {
        await newTab.waitForLoadState('domcontentloaded').catch(() => {});
        const url = newTab.url();
        await check('URL に search-tool が含まれる', url.includes('search-tool'), `url=${url}`);
        await newTab.close();
    }

    // ────────────────────────────────────────────────────
    console.log('\n[T8] PC回帰: 本文 chip タップ → Level3、panelGoBack で全閉');
    await pc.goto(`${BASE}/?book=JHN&chapter=3&transA=FLOW`, { waitUntil: 'networkidle' });
    await pc.waitForTimeout(1200);
    // 本文の chip をクリック（verse-block 内 chip）→ Level 3 直行
    await pc.locator('.verse-block .wlv-chip').first().click();
    await pc.waitForTimeout(500);
    const t8_l3 = await pc.evaluate(() => ({
        spOpen:    !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        panelMode: typeof _panelContentMode !== 'undefined' ? _panelContentMode : '?',
        drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
    }));
    await check('本文 chip → Level3（mode=word）', t8_l3.spOpen && t8_l3.panelMode === 'word',
        `spOpen=${t8_l3.spOpen} mode=${t8_l3.panelMode}`);
    await check('本文 chip → ドロワーは非表示（Level3 直行）', !t8_l3.drawerVisible);

    // panelGoBack で全閉
    await pc.evaluate(() => typeof panelGoBack === 'function' && panelGoBack());
    await pc.waitForTimeout(400);
    const t8_closed = await pc.evaluate(() =>
        !!document.getElementById('bottom-depth-panel')?.classList.contains('open')
    );
    await check('panelGoBack() で StudyPanel が閉じる', !t8_closed);

    await ctxPC.close();

    // ══════════════════════════════════════════════════════
    // 非タッチ狭窓（390×844, no touch）
    // ══════════════════════════════════════════════════════
    console.log('\n[T9] 非タッチ狭窓: Level2 でドロワー開閉、戻るボタンで Panel 全閉');
    const ctxNarrow = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: false,
    });
    const narrow = await ctxNarrow.newPage();
    await narrow.goto(FLOW_URL, { waitUntil: 'networkidle' });
    await narrow.waitForTimeout(1200);

    // JS で Level 2 を開く（verse-block.onclick() 経由）
    await narrow.evaluate(() => {
        const vb = document.querySelector('.verse-block');
        if (vb && typeof vb.onclick === 'function') vb.onclick();
    });
    await narrow.waitForTimeout(500);
    const t9_l2 = await narrow.evaluate(() => ({
        spOpen: !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        mode:   typeof _panelContentMode !== 'undefined' ? _panelContentMode : '?',
    }));
    await check('非タッチ狭窓: StudyPanel Level2 が開く', t9_l2.spOpen && t9_l2.mode === 'verse');

    // chip → ドロワーが開く
    await narrow.locator('#word-list-view .wlv-chip').first().click();
    await narrow.waitForTimeout(300);
    const t9_drawer = await narrow.evaluate(() =>
        !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible')
    );
    await check('非タッチ狭窓: chip クリックでドロワーが開く', t9_drawer);

    // × ボタンでドロワーだけ閉じる
    await narrow.locator('#wlv-detail-drawer .wlv-dd-close-btn').click();
    await narrow.waitForTimeout(300);
    const t9_btnClose = await narrow.evaluate(() => ({
        drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
        spOpen: !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
    }));
    await check('非タッチ狭窓: × でドロワーだけ閉じる', !t9_btnClose.drawerVisible);
    await check('非タッチ狭窓: × 後も StudyPanel は開いたまま', t9_btnClose.spOpen);

    // #mobile-panel-back（×）で Panel 全閉
    await narrow.locator('#mobile-panel-back').click();
    await narrow.waitForTimeout(400);
    const t9_panelClosed = await narrow.evaluate(() =>
        !!document.getElementById('bottom-depth-panel')?.classList.contains('open')
    );
    await check('非タッチ狭窓: #mobile-panel-back で StudyPanel が全閉する', !t9_panelClosed);
    await ctxNarrow.close();

    // ══════════════════════════════════════════════════════
    // 実タッチモバイル（390×844, touch）
    // ══════════════════════════════════════════════════════
    console.log('\n[T10] 実タッチモバイル回帰: MVV 戻る操作に影響しない');
    const ctxTouch = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const touch = await ctxTouch.newPage();
    await touch.goto(`${BASE}/?book=JHN&chapter=3&transA=FLOW`, { waitUntil: 'networkidle' });
    await touch.waitForTimeout(1200);

    const t10_isActualMobile = await touch.evaluate(() =>
        typeof _isActualMobile === 'function' ? _isActualMobile() : null
    );
    await check('_isActualMobile() = true', t10_isActualMobile === true);

    // verseBlock 内 chip をタップ → MVV + Level3（ドロワーは出ない）
    const t10_chips = await touch.locator('.verse-block .wlv-chip').count();
    if (t10_chips > 0) {
        await touch.locator('.verse-block .wlv-chip').first().tap();
        await touch.waitForTimeout(500);
        const t10_state = await touch.evaluate(() => ({
            mvvOpen:       !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
            drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
            mode:          typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
        }));
        await check('タッチmobile: chip→MVV が開く（ドロワーは非表示）',
            t10_state.mvvOpen && !t10_state.drawerVisible);

        // Level3 → Level2 → 閉じる
        if (t10_state.mode === 'detail') {
            await touch.locator('#mobile-verse-view-back').tap();
            await touch.waitForTimeout(400);
        }
        await touch.locator('#mobile-verse-view-back').tap();
        await touch.waitForTimeout(400);
        const t10_closed = await touch.evaluate(() => ({
            mvvOpen: !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
            spOpen:  !!document.getElementById('bottom-depth-panel')?.classList.contains('open'),
        }));
        await check('タッチmobile: MVV 戻るで MVV が閉じる', !t10_closed.mvvOpen);
        await check('タッチmobile: StudyPanel も閉じている', !t10_closed.spOpen);
    } else {
        console.log('  SKIP: FLOW chip が存在しない');
    }
    await ctxTouch.close();

    // ══════════════════════════════════════════════════════
    // 実タッチモバイル MVV Level2 ドロワー（新規 T11-T13）
    // ══════════════════════════════════════════════════════
    const MVV_URL = `${BASE}/?book=JHN&chapter=3&transA=JA1955`;
    const ctxTouchMVV = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const mv = await ctxTouchMVV.newPage();
    mv.on('pageerror', err => console.error('[page error]', err.message));
    await mv.goto(MVV_URL, { waitUntil: 'networkidle' });
    await mv.waitForTimeout(1200);

    // verse-block.onclick() で MVV Level2 を開く（tap() では chip interception の可能性）
    await mv.evaluate(() => {
        const vb = document.querySelector('.verse-block');
        if (vb && typeof vb.onclick === 'function') vb.onclick();
    });
    await mv.waitForTimeout(600);

    const t11_mvv = await mv.evaluate(() => ({
        mvvOpen:   !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
        mode:      typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
        chipCount: document.querySelectorAll('#mobile-inspector-area .wlv-chip').length,
    }));

    console.log('\n[T11] タッチモバイル: MVV Level2 chip → ドロワーが開く');
    await check('T11: MVV Level2 が開く', t11_mvv.mvvOpen && t11_mvv.mode === 'list',
        `mvvOpen=${t11_mvv.mvvOpen} mode=${t11_mvv.mode}`);
    await check('T11: #mobile-inspector-area に chip が存在する', t11_mvv.chipCount > 0,
        `chips=${t11_mvv.chipCount}`);

    if (t11_mvv.chipCount > 0) {
        await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();
        await mv.waitForTimeout(400);
        const t11_drawer = await mv.evaluate(() => ({
            drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
            mvvOpen:       !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
            mode:          typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
            ddGreek:       document.getElementById('wlv-dd-greek')?.textContent?.trim() || '',
        }));
        await check('T11: chip タップでドロワーが開く', t11_drawer.drawerVisible);
        await check('T11: MVV は Level2 のまま（ドロワーは即 Level3 へ行かない）',
            t11_drawer.mvvOpen && t11_drawer.mode === 'list',
            `mvvOpen=${t11_drawer.mvvOpen} mode=${t11_drawer.mode}`);
        await check('T11: Greek 語形が表示される',
            t11_drawer.ddGreek !== '-' && t11_drawer.ddGreek !== '');

        // T12: × ボタンでドロワーだけ閉じる
        console.log('\n[T12] タッチモバイル: MVV Level2 ドロワー × 閉じ');
        await mv.locator('#wlv-detail-drawer .wlv-dd-close-btn').tap();
        await mv.waitForTimeout(300);
        const t12 = await mv.evaluate(() => ({
            drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
            mvvOpen:       !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
            mode:          typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
        }));
        await check('T12: × でドロワーが閉じる', !t12.drawerVisible);
        await check('T12: MVV は Level2 のまま（全閉せず）',
            t12.mvvOpen && t12.mode === 'list',
            `mvvOpen=${t12.mvvOpen} mode=${t12.mode}`);

        // T13: 「詳しく見る」→ Level3、Level3 バック → Level2
        console.log('\n[T13] タッチモバイル: MVV Level2 ドロワー「詳しく見る」→ Level3');
        await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();
        await mv.waitForTimeout(400);
        const t13_open = await mv.evaluate(() =>
            !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible')
        );
        await check('T13: ドロワーが開く', t13_open);

        if (t13_open) {
            await mv.locator('#wlv-dd-study-btn').tap();
            await mv.waitForTimeout(600);
            const t13_l3 = await mv.evaluate(() => ({
                mvvOpen:       !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
                mode:          typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
                drawerVisible: !!document.getElementById('wlv-detail-drawer')?.classList.contains('visible'),
            }));
            await check('T13: 「詳しく見る」→ Level3（mode=detail）',
                t13_l3.mvvOpen && t13_l3.mode === 'detail',
                `mvvOpen=${t13_l3.mvvOpen} mode=${t13_l3.mode}`);
            await check('T13: Level3 後はドロワー非表示', !t13_l3.drawerVisible);

            // Level3 → Level2 バック
            await mv.locator('#mobile-verse-view-back').tap();
            await mv.waitForTimeout(400);
            const t13_back = await mv.evaluate(() => ({
                mvvOpen: !!document.getElementById('mobile-verse-view')?.classList.contains('open'),
                mode:    typeof _mobileVerseInspectorMode !== 'undefined' ? _mobileVerseInspectorMode : '?',
            }));
            await check('T13: Level3 → Level2 バックが機能する',
                t13_back.mvvOpen && t13_back.mode === 'list',
                `mvvOpen=${t13_back.mvvOpen} mode=${t13_back.mode}`);
        }
    } else {
        console.log('  SKIP: #mobile-inspector-area に chip がない');
    }
    await ctxTouchMVV.close();

    await browser.close();

    // ── 結果サマリー ──────────────────────────────────────────────
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
