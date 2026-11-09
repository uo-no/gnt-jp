/**
 * verify-nt-only.cjs
 * NT-only scope verification:
 *   - Desktop: OT row hidden, Layer 1 nav OT hidden, Layer 2 nav OT hidden
 *   - Mobile: picker Layer 1 shows only NT row (no OT)
 *   - Normal NT navigation still works (JHN 3 → Layer 1 → Layer 2 → nav)
 *   - DEFERRED: OT direct URL edge case (not tested here per user instruction)
 */
'use strict';

const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = '/private/tmp/claude-501/-Users-373da-Claude----/5918df54-2e00-455d-bcdf-b1aeae09eee0/scratchpad';

async function ss(page, name) {
    const path = `${SP}/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`  📸 ${name}`);
}

let pass = 0, fail = 0;

function check(label, actual, expected) {
    const ok = actual === expected;
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${label}: ${JSON.stringify(actual)}`);
    if (ok) pass++; else { fail++; console.log(`         expected: ${JSON.stringify(expected)}`); }
    return ok;
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    /* ── Desktop 1280×900 ── */
    console.log('\n=== Desktop 1280×900 ===');
    const dCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const desk = await dCtx.newPage();
    await desk.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
    await desk.waitForTimeout(2000);
    await ss(desk, 'nt-desktop-initial');

    /* 1. #sb-ot-row は display:none */
    const otRowDisplay = await desk.evaluate(() => {
        const el = document.getElementById('sb-ot-row');
        return el ? window.getComputedStyle(el).display : 'not found';
    });
    check('#sb-ot-row display', otRowDisplay, 'none');

    /* 2. sidebar を開いて Layer 0 を確認 */
    await desk.evaluate(() => {
        const btn = document.getElementById('sidebar-toggle');
        if (btn) btn.click();
        else {
            const sb = document.getElementById('sidebar');
            if (sb) sb.classList.add('open');
        }
    });
    await desk.waitForTimeout(500);
    await ss(desk, 'nt-desktop-sidebar-l0');

    /* 3. NT row は visible */
    const ntRowDisplay = await desk.evaluate(() => {
        const el = document.getElementById('sb-nt-row');
        return el ? window.getComputedStyle(el).display : 'not found';
    });
    check('#sb-nt-row visible', ntRowDisplay !== 'none', true);

    /* 4. 新約聖書をクリック → Layer 1 */
    await desk.evaluate(() => {
        const el = document.getElementById('sb-nt-row');
        if (el) el.click();
    });
    await desk.waitForTimeout(500);
    await ss(desk, 'nt-desktop-sidebar-l1');

    const navOtDisplay = await desk.evaluate(() => {
        const el = document.getElementById('sb-nav-ot');
        return el ? window.getComputedStyle(el).display : 'not found';
    });
    check('#sb-nav-ot display in L1', navOtDisplay, 'none');

    /* Layer 1 の書物リストにNTの書物が表示されているか */
    const firstBook = await desk.evaluate(() => {
        const rows = document.querySelectorAll('#sb-book-list .sb-row');
        return rows.length > 0 ? rows[0].querySelector('span')?.textContent?.trim() : 'none';
    });
    check('Layer1 first book (NT)', firstBook, 'マタイの福音書');

    /* 5. マタイをクリック → Layer 2 */
    await desk.evaluate(() => {
        const rows = document.querySelectorAll('#sb-book-list .sb-row');
        if (rows.length > 0) rows[0].click();
    });
    await desk.waitForTimeout(500);
    await ss(desk, 'nt-desktop-sidebar-l2');

    const navOtL2Display = await desk.evaluate(() => {
        const el = document.getElementById('sb-nav-ot-l2');
        return el ? window.getComputedStyle(el).display : 'not found';
    });
    check('#sb-nav-ot-l2 display in L2', navOtL2Display, 'none');

    /* Layer 2 ヘッダー: OT ボタンが display:none であることは既にチェック済み。
       visibleText チェックは textContent が hidden 要素を含むため省略する。 */

    /* 6. 章 1 をクリックして MAT 1 に移動できるか */
    await desk.evaluate(() => {
        const btn = document.querySelector('#sb-ch-grid .sb-ch-btn');
        if (btn) btn.click();
    });
    await desk.waitForTimeout(2000);
    const url = desk.url();
    console.log(`  After ch1 click URL: ${url}`);
    check('Layer2 chapter click navigates', url.includes('MAT'), true);

    await dCtx.close();

    /* ── Mobile 390×844 ── */
    console.log('\n=== Mobile 390×844 ===');
    const mCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const mob = await mCtx.newPage();
    await mob.goto(`${BASE}/?book=JHN&ch=3`, { waitUntil: 'networkidle', timeout: 20000 });
    await mob.waitForTimeout(2000);
    await ss(mob, 'nt-mobile-initial');

    /* Open mobile book picker */
    await mob.evaluate(() => {
        if (typeof _openMobileBookPicker === 'function') _openMobileBookPicker();
    });
    await mob.waitForTimeout(500);
    await ss(mob, 'nt-mobile-picker-l3');

    /* Since loc.book exists, it opens at Layer 3 (chapter grid). Check. */
    const pickerLayer = await mob.evaluate(() => {
        return typeof _mbpLayer !== 'undefined' ? _mbpLayer : -1;
    });
    console.log(`  Picker opened at layer: ${pickerLayer}`);

    /* Navigate back to Layer 1 to check OT is absent */
    await mob.evaluate(() => {
        if (typeof _mbpBack === 'function') { _mbpBack(); _mbpBack(); }
    });
    await mob.waitForTimeout(500);
    await ss(mob, 'nt-mobile-picker-l1');

    const layer1Content = await mob.evaluate(() => {
        const el = document.getElementById('mobile-book-picker-content');
        return el ? el.innerHTML : '';
    });
    console.log(`  Layer1 HTML length: ${layer1Content.length}`);
    check('Mobile Layer1 no OT row', layer1Content.includes('旧約聖書（LXX）'), false);
    check('Mobile Layer1 has NT row', layer1Content.includes('新約聖書'), true);
    check('Mobile Layer1 no _mbpSelectTestament ot', layer1Content.includes("_mbpSelectTestament('ot')"), false);

    /* Select NT → Layer 2 shows NT books */
    await mob.evaluate(() => {
        if (typeof _mbpSelectTestament === 'function') _mbpSelectTestament('nt');
    });
    await mob.waitForTimeout(300);
    await ss(mob, 'nt-mobile-picker-l2');

    const l2FirstBook = await mob.evaluate(() => {
        const rows = document.querySelectorAll('#mobile-book-picker-content .mbp-row');
        return rows.length > 0 ? rows[0].querySelector('span')?.textContent?.trim() : 'none';
    });
    check('Mobile Layer2 first NT book', l2FirstBook, 'マタイの福音書');

    /* Select Matthew → Layer 3 shows chapters */
    await mob.evaluate(() => {
        if (typeof _mbpSelectBook === 'function') _mbpSelectBook('MAT', 'マタイの福音書', 28);
    });
    await mob.waitForTimeout(300);
    await ss(mob, 'nt-mobile-picker-l3-mat');

    const chCount = await mob.evaluate(() =>
        document.querySelectorAll('#mobile-book-picker-content .mbp-ch-btn').length
    );
    check('Mobile Layer3 MAT chapter count', chCount, 28);

    await mCtx.close();
    await browser.close();

    console.log('\n' + '='.repeat(50));
    console.log(`NT-only verification: ${pass} PASS / ${fail} FAIL`);
    console.log('='.repeat(50));
    process.exit(fail > 0 ? 1 : 0);
})();
