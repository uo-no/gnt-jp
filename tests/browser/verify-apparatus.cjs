#!/usr/bin/env node
/**
 * verify-apparatus-ui.cjs — 本文の異読セクション動作確認
 */
'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const fs   = require('fs');

const SP = '/private/tmp/claude-501/apparatus-ui-ss';
fs.mkdirSync(SP, { recursive: true });
async function ss(page, name) {
    const p = `${SP}/${name}.png`;
    await page.screenshot({ path: p });
    console.log(`  ss: ${p}`);
}

let passed = 0, failed = 0;
function check(name, cond, detail = '') {
    if (cond) { console.log(`  PASS: ${name}`); passed++; }
    else       { console.log(`  FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++; }
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ── Mobile 390×844 (hasTouch: true で maxTouchPoints を有効化) ──
    console.log('\n=== MOBILE 390×844 — MAT 1:5 ===');
    const mCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,  // maxTouchPoints >= 1 を保証
    });
    const mob  = await mCtx.newPage();
    const errs = [];
    mob.on('console', msg => { if (msg.type() === 'error') errs.push(msg.text()); });
    mob.on('pageerror', err => errs.push(String(err)));

    await mob.goto(`${BASE}/?book=MAT&ch=1`, { waitUntil: 'networkidle', timeout: 20000 });
    await mob.waitForSelector('.verse-block', { timeout: 10000 });
    await mob.waitForTimeout(2000);

    // _isActualMobile() 確認
    const isMob = await mob.evaluate(() =>
        typeof _isActualMobile === 'function' ? _isActualMobile() : 'N/A');
    console.log('  _isActualMobile():', isMob);
    check('_isActualMobile() === true', isMob === true, String(isMob));

    await ss(mob, '01-initial');

    // MAT 1:5 の verse-block をクリック (verse-block は章全体に50個ある)
    // data-vnum 属性か位置で5節を見つける
    const vb5 = await mob.evaluate(() => {
        // data-vnum="5" の verse-block を探す
        const v5 = document.querySelector('.verse-block[data-vnum="5"]');
        if (v5) { v5.click(); return 'data-vnum=5'; }
        // なければ vNum をチェック
        const blocks = document.querySelectorAll('.verse-block');
        for (const b of blocks) {
            if (b.dataset && b.dataset.vnum === '5') { b.click(); return 'dataset.vnum=5'; }
        }
        // 5番目のブロックをクリック
        const arr = Array.from(blocks);
        if (arr.length >= 5) { arr[4].click(); return 'index 4'; }
        if (arr.length > 0)  { arr[0].click(); return 'index 0'; }
        return 'none';
    });
    console.log('  verse block click:', vb5);
    await mob.waitForTimeout(1000);

    // apparatus.json fetch 待ち (最初は 5.7MB fetch)
    // networkidle より waitForTimeout の方が確実
    await mob.waitForTimeout(8000);
    await ss(mob, '02-after-apparatus-load');

    // mobile-verse-view が .open か確認
    const mvvOpen = await mob.evaluate(() =>
        document.getElementById('mobile-verse-view')?.classList.contains('open') || false);
    check('mobile-verse-view.open', mvvOpen);

    // mobile-verse-area の内容確認
    const mvaHTML = await mob.evaluate(() =>
        document.getElementById('mobile-verse-area')?.innerHTML || '');
    const isPlaceholder = mvaHTML.trim() === 'placeholder' || mvaHTML.trim() === '';
    check('#mobile-verse-area populated', !isPlaceholder, mvaHTML.slice(0,80));
    console.log('  #mobile-verse-area (200chars):', mvaHTML.slice(0, 200));

    // 本文の異読セクション
    const appNote = await mob.$('.mvv-apparatus-note');
    check('.mvv-apparatus-note exists', !!appNote);

    if (appNote) {
        const summary  = await appNote.$eval('summary', el => el.textContent.trim());
        const isOpen   = await appNote.evaluate(el => el.open);
        const ents     = await appNote.$$('.mvv-app-entry');
        const hasLem   = await appNote.$('.mvv-app-lem') !== null;
        const hasRdg   = await appNote.$('.mvv-app-rdg') !== null;
        const hasWit   = await appNote.$('.mvv-app-rdg-wit') !== null;
        console.log('  summary text:', summary);
        console.log('  entry count:', ents.length);
        check('summary contains "本文の異読"', summary.includes('本文の異読'), summary);
        check('apparatus closed by default', !isOpen);
        check('.mvv-app-entry count > 0', ents.length > 0, String(ents.length));
        check('.mvv-app-lem exists', hasLem);
        check('.mvv-app-rdg exists', hasRdg);
        check('.mvv-app-rdg-wit exists', hasWit);

        // 展開してスクリーンショット
        await appNote.evaluate(el => { el.open = true; });
        await mob.waitForTimeout(300);
        await ss(mob, '03-apparatus-expanded');
    }

    check('no console errors', errs.length === 0, errs.slice(0,2).join('; '));

    // ── word-analysis-open: .mvv-apparatus-note は隠れない ───────
    console.log('\n=== word-analysis-open state ===');
    await mob.evaluate(() => {
        document.getElementById('mobile-verse-area').classList.add('word-analysis-open');
    });
    await mob.waitForTimeout(100);

    // .mvv-apparatus-note は word-analysis-open でも表示されたまま
    const appDisplayWAO = await mob.evaluate(() => {
        const el = document.querySelector('.mvv-apparatus-note');
        if (!el) return 'NOT_FOUND';
        return getComputedStyle(el).display;
    });
    check('word-analysis-open: .mvv-apparatus-note not hidden', appDisplayWAO !== 'none', `display=${appDisplayWAO}`);

    // .mvv-passage-note（.mvv-apparatus-note を持たない）は隠れる
    // テスト要素を一時挿入して CSS の適用を確認
    const pnHidden = await mob.evaluate(() => {
        const area = document.getElementById('mobile-verse-area');
        if (!area) return 'NO_AREA';
        const mock = document.createElement('div');
        mock.className = 'mvv-passage-note';  // apparatus クラスなし
        area.appendChild(mock);
        const result = getComputedStyle(mock).display === 'none' ? 'hidden' : 'visible';
        mock.remove();
        return result;
    });
    check('word-analysis-open: .mvv-passage-note(non-apparatus) hidden', pnHidden === 'hidden', `result=${pnHidden}`);

    // クリーンアップ
    await mob.evaluate(() => {
        document.getElementById('mobile-verse-area').classList.remove('word-analysis-open');
    });

    // ── 実操作テスト: 節タップ → Level2 chip タップ → 詳しく見る → Level3 → 戻る ──
    // 区別: 上記の word-analysis-open テストは JS で直接クラスを操作した（CSS単体確認）。
    //       このセクションは実際の UI 操作フローで _mobileInspectorDetail() を経由して
    //       word-analysis-open を誘発する。
    //
    // 実際のフロー（モバイル）:
    //   verse-block タップ → MVV Level2 → chip タップ → ドロワー → 「詳しく見る」 → Level3 + word-analysis-open
    console.log('\n=== 実操作: Level2 chip → 詳しく見る → Level3（ROM 5:1） ===');
    await mob.goto(`${BASE}/?book=ROM&ch=5`, { waitUntil: 'domcontentloaded' });
    await mob.waitForSelector('.verse-block', { timeout: 8000 });
    await mob.waitForTimeout(500);

    // Step 1: ROM 5:1 の verse-block をタップ → MVV を開く
    await mob.evaluate(() => {
        const v1 = document.querySelector('.verse-block[data-vnum="1"]') ||
                   document.querySelector('.verse-block');
        if (v1) v1.click();
    });
    await mob.waitForFunction(
        () => document.getElementById('mobile-verse-view')?.classList.contains('open'),
        { timeout: 5000 }
    );
    // apparatus 非同期ロード（~5.7MB、初回）+ Level2 描画を待つ
    await mob.waitForSelector('#mobile-verse-area .mvv-apparatus-note', { timeout: 12000 }).catch(() => {});
    await mob.waitForSelector('#mobile-inspector-area .wlv-chip', { timeout: 6000 }).catch(() => {});
    await mob.waitForTimeout(300);

    const level2Chips = await mob.$$eval('#mobile-inspector-area .wlv-chip', els => els.length);
    console.log('  Level2 chips found:', level2Chips);

    // Step 2: Level2 の chip をタップ → ドロワーが開く
    const l2Chip = await mob.$('#mobile-inspector-area .wlv-chip');
    if (l2Chip) {
        await l2Chip.click();
        await mob.waitForSelector('#wlv-detail-drawer.visible', { timeout: 3000 }).catch(() => {});
        await mob.waitForTimeout(200);

        const drawerVisible = await mob.evaluate(() =>
            document.getElementById('wlv-detail-drawer')?.classList.contains('visible') || false
        );
        console.log('  drawer visible:', drawerVisible);

        // Step 3: 「詳しく見る」ボタンをタップ → Level3 + word-analysis-open
        const studyBtn = await mob.$('#wlv-dd-study-btn');
        if (studyBtn) {
            await studyBtn.click();
            // _mobileInspectorDetail が word-analysis-open を同期的に追加する
            await mob.waitForFunction(
                () => document.getElementById('mobile-verse-area')?.classList.contains('word-analysis-open'),
                { timeout: 4000 }
            );
            await mob.waitForTimeout(200);
            await ss(mob, '04-real-level3-apparatus');

            // 実操作で word-analysis-open が付いたか
            const waoByReal = await mob.evaluate(() =>
                document.getElementById('mobile-verse-area')?.classList.contains('word-analysis-open') || false
            );
            check('real-op: word-analysis-open set via 詳しく見る', waoByReal);

            // Level3 state で .mvv-apparatus-note は CSS によって隠れていない
            const appDisplayReal = await mob.evaluate(() => {
                const el = document.querySelector('#mobile-verse-area .mvv-apparatus-note');
                if (!el) return 'NOT_FOUND';
                return getComputedStyle(el).display;
            });
            check('real-op: .mvv-apparatus-note not hidden in Level3', appDisplayReal !== 'none', `display=${appDisplayReal}`);

            // Level3 state で .mvv-passage-note（apparatus 以外）は CSS によって隠れる
            const pnHiddenReal = await mob.evaluate(() => {
                const area = document.getElementById('mobile-verse-area');
                if (!area) return 'NO_AREA';
                const mock = document.createElement('div');
                mock.className = 'mvv-passage-note';
                area.appendChild(mock);
                const result = getComputedStyle(mock).display === 'none' ? 'hidden' : 'visible';
                mock.remove();
                return result;
            });
            check('real-op: .mvv-passage-note(non-apparatus) hidden in Level3', pnHiddenReal === 'hidden', `result=${pnHiddenReal}`);

            // Step 4: 戻るボタンをタップ → Level2 に戻る → word-analysis-open が外れる
            const backBtn = await mob.$('#mobile-verse-view-back');
            if (backBtn) {
                await backBtn.click();
                await mob.waitForTimeout(400);

                const waoAfterBack = await mob.evaluate(() =>
                    document.getElementById('mobile-verse-area')?.classList.contains('word-analysis-open') || false
                );
                check('real-op: word-analysis-open removed after back', !waoAfterBack);

                const appAfterBack = await mob.evaluate(() => {
                    const el = document.querySelector('#mobile-verse-area .mvv-apparatus-note');
                    if (!el) return 'NOT_FOUND';
                    return getComputedStyle(el).display;
                });
                check('real-op: .mvv-apparatus-note visible after back to Level2', appAfterBack !== 'none', `display=${appAfterBack}`);
            } else {
                check('real-op: back button found', false, 'not found');
            }
        } else {
            // 「詳しく見る」ボタンが見つからない
            console.log('  SKIP: #wlv-dd-study-btn が見つからない');
            check('real-op: study button found', false, 'drawer present but no study-btn');
        }
    } else {
        // Level2 に chips がない（語形データなし）
        console.log('  SKIP: Level2 に chips が見つからない（語形データなし）');
        check('real-op: Level2 chips present', false, `count=${level2Chips}`);
    }

    // ── Fast verse switching test (stale injection guard) ──
    console.log('\n=== Fast switching — stale injection guard ===');
    await mob.goto(`${BASE}/?book=MAT&ch=1`, { waitUntil: 'domcontentloaded' });
    await mob.waitForSelector('.verse-block', { timeout: 8000 });
    await mob.waitForTimeout(500);
    await mob.evaluate(() => {
        // 連続して別節をクリック
        const blocks = document.querySelectorAll('.verse-block');
        if (blocks.length >= 3) {
            if (typeof blocks[0].onclick === 'function') blocks[0].onclick();
            if (typeof blocks[1].onclick === 'function') blocks[1].onclick();
        }
    });
    await mob.waitForTimeout(5000);
    const staleErrs = await mob.evaluate(() => {
        // 異読セクションが複数ないことを確認
        return document.querySelectorAll('.mvv-apparatus-note').length;
    });
    check('stale injection: single apparatus note', staleErrs <= 1, `count=${staleErrs}`);

    // ── Desktop 1280×800 ──────────────────────────────────────
    console.log('\n=== DESKTOP 1280×800 ===');
    const dCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desk  = await dCtx.newPage();
    const dErrs = [];
    desk.on('pageerror', err => dErrs.push(String(err)));
    await desk.goto(`${BASE}/?book=MAT&ch=1`, { waitUntil: 'networkidle', timeout: 20000 });
    await desk.waitForSelector('.verse-block', { timeout: 10000 });
    await desk.waitForTimeout(1000);

    // desktop で verse-block クリック → #bottom-depth-panel 開く
    await desk.evaluate(() => {
        const vb = document.querySelector('.verse-block');
        if (vb) vb.click();
    });
    await desk.waitForTimeout(3000);

    const dApp = await desk.$('.mvv-apparatus-note');
    check('desktop: .mvv-apparatus-note absent', !dApp);
    check('desktop: no page errors', dErrs.length === 0, dErrs.slice(0,2).join('; '));

    await browser.close();

    console.log(`\n${passed}/${passed+failed} checks passed`);
    if (failed > 0) { console.log(`FAILED: ${failed}`); process.exit(1); }
    else console.log('\nALL PASS');
})().catch(e => { console.error(e); process.exit(1); });
