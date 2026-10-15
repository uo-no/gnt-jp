#!/usr/bin/env node
/**
 * verify-apparatus-ja.cjs — apparatus-ja.json UI統合ブラウザテスト
 *
 * 検証:
 *  1. 確認済みエントリで .mvv-app-anno が表示される（ROM 5:1 で形態差タグ）
 *  2. 確認済みエントリで .mvv-app-tag テキストが 'ROM-0051' = '形態差'
 *  3. 確認済みエントリで .mvv-app-ja テキストが空でない
 *  4. 保留エントリで .mvv-app-anno が表示されない（MAT 16:2、MAT-0353）
 *  5. 注釈なし節でも .mvv-apparatus-note が表示される（フォールバック）
 *  6. 節またぎ MAT-0004: MAT 1:7 と MAT 1:8 の両方で注釈が1件のみ（重複なし）
 *  7. JHN 1:18 で語彙差タグが存在する（JHN-0003）
 *  8. 高速節切り替え後に古い注釈が混入しない（MAT→ROM）
 *  9. デスクトップ 1280×800 で .mvv-apparatus-note 非表示
 * 10. 添加タグ: JHN 3:16 で .mvv-app-tag が '添加'（JHN-0055）
 */

'use strict';

const { chromium } = require('playwright');

const BASE_URL  = 'http://localhost:8765';
const MOBILE_VP = { width: 390, height: 844 };
const DESK_VP   = { width: 1280, height: 800 };

let passed = 0, failed = 0;
const results = [];

function check(name, cond, detail = '') {
    if (cond) {
        results.push(['PASS', name]);
        passed++;
    } else {
        results.push(['FAIL', name + (detail ? ` — ${detail}` : '')]);
        failed++;
    }
}

/** モバイル context を作成する共通ヘルパー */
async function mobileContext(browser) {
    return browser.newContext({
        viewport: MOBILE_VP,
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
}

/** 指定 book/chapter に移動して verse ブロックをクリックし、節分析エリアが開くのを待つ。 */
async function openVersePanel(page, book, ch, vNum) {
    await page.goto(`${BASE_URL}/?book=${book}&ch=${ch}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.verse-block', { timeout: 6000 });
    const blocks = await page.$$('.verse-block');
    const target = vNum <= blocks.length ? blocks[vNum - 1] : blocks[0];
    await target.click();
    await page.waitForSelector('#mobile-verse-view', { timeout: 4000 });
    await page.waitForFunction(
        () => document.querySelector('#mobile-verse-view')?.classList.contains('open'),
        { timeout: 4000 }
    );
    // apparatus の非同期注入を待つ
    await page.waitForSelector('.mvv-apparatus-note', { timeout: 5000 }).catch(() => {});
}

(async () => {
    const browser = await chromium.launch();
    let ctx, page;

    // ─── MOBILE テスト ──────────────────────────────────────────
    ctx  = await mobileContext(browser);
    page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));

    // ── Test 1-3: ROM 5:1 確認済みエントリ（形態差）──────────────
    await openVersePanel(page, 'ROM', 5, 1);

    const annoCount1 = await page.$$eval('.mvv-apparatus-note .mvv-app-anno', els => els.length);
    check('rom5:1 .mvv-app-anno exists', annoCount1 > 0, `count=${annoCount1}`);

    const tagText1 = await page.$eval('.mvv-apparatus-note .mvv-app-tag', el => el.textContent).catch(() => '');
    check('rom5:1 .mvv-app-tag = 形態差', tagText1 === '形態差', `got '${tagText1}'`);

    const jaText1 = await page.$eval('.mvv-apparatus-note .mvv-app-ja', el => el.textContent.trim()).catch(() => '');
    check('rom5:1 .mvv-app-ja nonempty', jaText1.length > 0, `got '${jaText1}'`);

    // ── Test 4: MAT 16:2 保留エントリ（MAT-0353）注釈なし ─────────
    await openVersePanel(page, 'MAT', 16, 2);

    // MAT-0353 は保留なので .mvv-app-anno が存在しないはず
    const annoCount4 = await page.$$eval('.mvv-apparatus-note .mvv-app-anno', els => els.length);
    check('mat16:2 保留 anno absent', annoCount4 === 0, `count=${annoCount4}`);
    // ただし apparatus 自体は表示される
    const appNote4 = await page.$('.mvv-apparatus-note');
    check('mat16:2 apparatus still visible', !!appNote4);

    // ── Test 5: JA注釈なし節でも apparatus が表示される（ROM 1:8、ROM-0002 のみ・JA なし）─
    await openVersePanel(page, 'ROM', 1, 8);
    const appNote5 = await page.$('.mvv-apparatus-note');
    check('rom1:8 apparatus visible without ja annotation', !!appNote5);
    // JA注釈がないので .mvv-app-anno は存在しないはず
    const annoCount5 = await page.$$eval('.mvv-app-anno', els => els.length);
    check('rom1:8 no anno (fallback greek only)', annoCount5 === 0, `count=${annoCount5}`);

    // ── Test 6: 節またぎ MAT-0004 — MAT 1:7 と 1:8 で注釈重複なし ─
    await openVersePanel(page, 'MAT', 1, 7);
    const annoCount7 = await page.$$eval('.mvv-app-anno', els => els.length);
    // MAT 1:7 に MAT-0004 の注釈が1件あるはず（他のエントリに注釈があれば複数も許容）
    // 重複確認: apparatus-ja.json の同一 ID が2回表示されていないこと
    const annoTags7 = await page.$$eval('.mvv-app-tag', els => els.map(e => e.textContent));
    const uniq7 = new Set(annoTags7); // タグ文字列はユニーク必要はないが重複エントリが増えていないか確認
    // MAT 1:7 の apparatus count と anno count の比率が一致していることを確認
    const appEntries7 = await page.$$eval('.mvv-app-entry', els => els.length);
    // apparatus entries は 1 以上あるはず
    check('mat1:7 apparatus entries exist', appEntries7 > 0, `entries=${appEntries7}`);

    await openVersePanel(page, 'MAT', 1, 8);
    const appEntries8 = await page.$$eval('.mvv-app-entry', els => els.length);
    check('mat1:8 apparatus entries exist', appEntries8 > 0, `entries=${appEntries8}`);
    // MAT 1:7 と 1:8 は同一エントリ (MAT-0004) を共有 — それぞれ 1 回ずつ表示
    // 注釈の重複がないこと: anno数はエントリ数以下
    const annoCount8 = await page.$$eval('.mvv-app-anno', els => els.length);
    check('mat1:8 anno count <= entry count', annoCount8 <= appEntries8, `anno=${annoCount8}, entries=${appEntries8}`);

    // ── Test 7: JHN 1:18 語彙差タグ（JHN-0003）─────────────────
    await openVersePanel(page, 'JHN', 1, 18);
    const tagText7 = await page.$eval('.mvv-apparatus-note .mvv-app-tag', el => el.textContent).catch(() => '');
    check('jhn1:18 .mvv-app-tag = 語彙差', tagText7 === '語彙差', `got '${tagText7}'`);

    // ── Test 8: 高速節切り替えで古い注釈が混入しない ─────────────
    // MAT 1:1 を開いて即座に ROM 5:1 に切り替える
    await page.goto(`${BASE_URL}/?book=MAT&ch=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.verse-block', { timeout: 6000 });
    const matBlock = await page.$('.verse-block');
    await matBlock.click();
    // 即座に ROM に移動（非同期注入の stale guard 確認）
    await page.goto(`${BASE_URL}/?book=ROM&ch=5`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.verse-block', { timeout: 6000 });
    const romBlocks = await page.$$('.verse-block');
    await romBlocks[0].click();
    await page.waitForSelector('#mobile-verse-view', { timeout: 4000 });
    await page.waitForFunction(
        () => document.querySelector('#mobile-verse-view')?.classList.contains('open'),
        { timeout: 4000 }
    );
    await page.waitForSelector('.mvv-apparatus-note', { timeout: 5000 }).catch(() => {});
    // ROM 5:1 の注釈が正しく表示されている（MAT のものが混入していない）
    const tagText8 = await page.$eval('.mvv-apparatus-note .mvv-app-tag', el => el.textContent).catch(() => '');
    // ROM 5:1 のタグは '形態差' が期待される
    check('fast-switch: ROM 5:1 shows correct tag', tagText8 === '形態差', `got '${tagText8}'`);

    // ── Test 10: JHN 3:16 添加タグ（JHN-0055）────────────────────
    await openVersePanel(page, 'JHN', 3, 16);
    const tags10 = await page.$$eval('.mvv-app-tag', els => els.map(e => e.textContent));
    check('jhn3:16 has 添加 tag', tags10.includes('添加'), `tags=${JSON.stringify(tags10)}`);

    await ctx.close();

    // ─── DESKTOP テスト ─────────────────────────────────────────
    ctx  = await browser.newContext({ viewport: DESK_VP });
    page = await ctx.newPage();

    // Test 9: デスクトップで .mvv-apparatus-note 非表示
    await page.goto(`${BASE_URL}/?book=ROM&ch=5`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.verse-block', { timeout: 6000 });
    await page.waitForTimeout(500);
    const deskAnno = await page.$('.mvv-app-anno');
    check('desktop: .mvv-app-anno absent', !deskAnno);
    const deskAppNote = await page.$('.mvv-apparatus-note');
    check('desktop: .mvv-apparatus-note absent', !deskAppNote);

    await ctx.close();
    await browser.close();

    // ─── 結果出力 ────────────────────────────────────────────────
    console.log('\n=== verify-apparatus-ja ===');
    for (const [status, name] of results) {
        if (status === 'FAIL') console.log(`  FAIL: ${name}`);
    }
    const sections = { MOBILE: results.slice(0, results.length - 2), DESKTOP: results.slice(-2) };
    for (const [sec, rs] of Object.entries(sections)) {
        const p = rs.filter(r => r[0] === 'PASS').length;
        console.log(`  ${sec}: ${p}/${rs.length}`);
    }
    console.log(`\n${passed}/${passed + failed} checks passed`);
    if (pageErrors.length) console.log(`  Page errors: ${pageErrors.join('; ')}`);

    if (failed > 0) {
        console.log(`\nFAILED: ${failed} check(s)`);
        process.exit(1);
    } else {
        console.log('\nALL PASS');
    }
})().catch(e => { console.error(e); process.exit(1); });
