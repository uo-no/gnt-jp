/**
 * verify-studypanel-parity.cjs
 *
 * StudyPanel Parity Test — Desktop (1280×900) vs Mobile (390×844)。
 * 同じ Greek token を開いたとき、data-study-section の set が一致することを検証する。
 *
 * 検証原則：
 *   - 順序は比較しない（Set 比較）
 *   - 空コンテナは「存在しない」と同等（populated のみカウント）
 *   - レイアウト・折りたたみ状態は比較しない
 *   - 非同期注入が完了するまで待つ
 *
 * Navigation flow（翻訳表示モード / default）:
 *   Desktop:
 *     verseBlock.click()
 *       → openVerseInspector → openWordListInStudyPanel → _openWordListInternal
 *       → #bottom-depth-panel.open + #word-list-view（chips with data-greek）
 *     chip.click()  ← chipEl.closest('.verse-block') === null → drawer path
 *       → #wlv-detail-drawer.visible
 *     #wlv-dd-study-btn.click()
 *       → _wlvStudyBtnClick → openInspectorDetail → openStudyPanel
 *       → #reading-notes-area に data-study-section が揃う
 *
 *   Mobile:
 *     verseBlock.click()
 *       → openVerseInspector → openMobileVerseView
 *       → #mobile-verse-view.open + #mobile-inspector-area（chips with data-greek）
 *     chip.click()  ← chipEl.closest('.verse-block') === null → drawer path
 *       → #wlv-detail-drawer.visible
 *     #wlv-dd-study-btn.click()
 *       → _wlvStudyBtnClick → openInspectorDetail
 *       → _isActualMobile() && mvv.open → _mobileInspectorDetail
 *       → #mobile-inspector-area に data-study-section が揃う
 *
 * 使い方: node verify-studypanel-parity.cjs
 *   (事前に localhost:8765 でサーバーを起動しておく)
 */
'use strict';

const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const ASYNC_WAIT_MS = 5000;   // 非同期注入（semantic / reading / level2）完了を待つ時間

/* スクラッチパスはセッション固定のパスを使用 */
const SP = '/private/tmp/claude-501/-Users-373da-Claude----/5918df54-2e00-455d-bcdf-b1aeae09eee0/scratchpad';

/* ── ユーティリティ ── */
async function ss(page, name) {
    const path = `${SP}/${name}.png`;
    await page.screenshot({ path, fullPage: false });
    console.log(`  📸 ${name}.png`);
}

/**
 * `[data-study-section]` 要素のうち、非空のもののセクション名セットを返す。
 * 空コンテナ（innerHTML/textContent が空）は除外する（静寂設計）。
 */
async function getPopulatedSections(page) {
    return page.evaluate(() => {
        const els = document.querySelectorAll('[data-study-section]');
        const result = new Set();
        for (const el of els) {
            const name = el.dataset.studySection;
            const hasChildren = el.children.length > 0;
            const hasText = el.textContent.trim().length > 0;
            if (hasChildren || hasText) result.add(name);
        }
        return [...result].sort();
    });
}

/**
 * Desktop (1280×900) で指定 Greek token の StudyPanel を開く。
 *
 * 1. verseBlock.click() → #bottom-depth-panel.open + #word-list-view
 * 2. chip[data-greek=greekTarget].click() → drawer
 * 3. #wlv-dd-study-btn.click() → openStudyPanel
 * 4. ASYNC_WAIT_MS 後のセクション set を返す
 */
async function getDesktopSections(browser, bookChVerse, greekTarget) {
    const ctx  = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    const { book, ch, v } = bookChVerse;
    await page.goto(`${BASE}/?book=${book}&ch=${ch}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500);

    /* Step 1: 対象 verse ブロックをクリックして word list を開く */
    const verseClicked = await page.evaluate(({ vNum }) => {
        const blocks = document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)');
        for (const b of blocks) {
            const numEl = b.querySelector('.v-num');
            if (numEl && numEl.textContent.trim() === String(vNum)) {
                b.click();
                return true;
            }
        }
        return false;
    }, { vNum: v });

    if (!verseClicked) {
        console.error(`  ⚠ Desktop verse block not found for verse ${v}`);
        await ss(page, `desktop-noverse-${book}${ch}-v${v}`);
        await ctx.close();
        return [];
    }

    /* Step 2: #bottom-depth-panel.open + word list 描画完了を待つ */
    try {
        await page.waitForSelector('#bottom-depth-panel.open', { timeout: 6000 });
    } catch (_) {
        console.warn(`  ⚠ #bottom-depth-panel did not open within 6s`);
    }
    await page.waitForTimeout(1000);

    /* Step 3: word list 内の chip を Greek で特定してクリック → drawer を出す */
    const chipClicked = await page.evaluate(({ greekTarget }) => {
        /* _openWordListInternal が使う WordOrderRenderer.render() は data-greek を付与する */
        const chip = document.querySelector(`#word-list-view .wlv-chip[data-greek="${greekTarget}"]`);
        if (!chip) {
            /* fallback: title 属性で検索 */
            const fallback = document.querySelector(`#word-list-view .wlv-chip[title="${greekTarget}"]`);
            if (fallback) { fallback.click(); return 'fallback'; }
            return false;
        }
        chip.click();
        return 'data-greek';
    }, { greekTarget });

    if (!chipClicked) {
        console.error(`  ⚠ Desktop chip not found for "${greekTarget}" in word list`);
        await ss(page, `desktop-nochip-${book}${ch}-v${v}`);
        await ctx.close();
        return [];
    }
    console.log(`  Desktop chip clicked via ${chipClicked}`);

    /* Step 4: "詳しく見る" ボタンをクリック → openStudyPanel */
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const btn = document.getElementById('wlv-dd-study-btn');
        if (btn) btn.click();
    });

    /* Step 5: 非同期注入完了を待つ */
    await page.waitForTimeout(ASYNC_WAIT_MS);
    await ss(page, `desktop-studypanel-${book}${ch}-v${v}`);

    const sections = await getPopulatedSections(page);
    await ctx.close();
    return sections;
}

/**
 * Mobile (390×844) で指定 Greek token の MobileInspector を開く。
 *
 * 1. verseBlock.click() → #mobile-verse-view.open + #mobile-inspector-area
 * 2. chip[data-greek=greekTarget].click() → drawer
 * 3. #wlv-dd-study-btn.click() → _mobileInspectorDetail
 * 4. ASYNC_WAIT_MS 後のセクション set を返す
 */
async function getMobileSections(browser, bookChVerse, greekTarget) {
    const ctx  = await browser.newContext({
        viewport:        { width: 390, height: 844 },
        isMobile:        true,
        hasTouch:        true,
        userAgent:       'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    });
    const page = await ctx.newPage();

    const { book, ch, v } = bookChVerse;
    await page.goto(`${BASE}/?book=${book}&ch=${ch}`, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500);

    /* Step 1: 対象 verse ブロックをクリックして MVV を開く */
    const verseClicked = await page.evaluate(({ vNum }) => {
        const blocks = document.querySelectorAll('#bible-text-area .verse-block:not(.verse-pair-right)');
        for (const b of blocks) {
            const numEl = b.querySelector('.v-num');
            if (numEl && numEl.textContent.trim() === String(vNum)) {
                b.click();
                return true;
            }
        }
        return false;
    }, { vNum: v });

    if (!verseClicked) {
        console.error(`  ⚠ Mobile verse block not found for verse ${v}`);
        await ss(page, `mobile-noverse-${book}${ch}-v${v}`);
        await ctx.close();
        return [];
    }

    /* Step 2: #mobile-verse-view.open + inspector 描画完了を待つ */
    try {
        await page.waitForSelector('#mobile-verse-view.open', { timeout: 6000 });
    } catch (_) {
        console.warn(`  ⚠ #mobile-verse-view did not open within 6s`);
    }
    await page.waitForTimeout(1000);

    /* Step 3: inspector 内の chip を Greek で特定してクリック → drawer を出す */
    const chipClicked = await page.evaluate(({ greekTarget }) => {
        /* _mobileInspectorRender が使う renderColumn → WordOrderRenderer.render() は data-greek を付与する */
        const chip = document.querySelector(`#mobile-inspector-area .wlv-chip[data-greek="${greekTarget}"]`);
        if (!chip) {
            const fallback = document.querySelector(`#mobile-inspector-area .wlv-chip[title="${greekTarget}"]`);
            if (fallback) { fallback.click(); return 'fallback'; }
            return false;
        }
        chip.click();
        return 'data-greek';
    }, { greekTarget });

    if (!chipClicked) {
        console.error(`  ⚠ Mobile chip not found for "${greekTarget}" in MVV inspector`);
        await ss(page, `mobile-nochip-${book}${ch}-v${v}`);
        await ctx.close();
        return [];
    }
    console.log(`  Mobile chip clicked via ${chipClicked}`);

    /* Step 4: "詳しく見る" ボタンをクリック → _mobileInspectorDetail */
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        const btn = document.getElementById('wlv-dd-study-btn');
        if (btn) btn.click();
    });

    /* Step 5: 非同期注入完了を待つ */
    await page.waitForTimeout(ASYNC_WAIT_MS);
    await ss(page, `mobile-inspector-${book}${ch}-v${v}`);

    const sections = await getPopulatedSections(page);
    await ctx.close();
    return sections;
}

/**
 * 2セットを比較してレポートを出力する。
 * @returns {boolean} parity が成立すれば true
 */
function compareSections(label, desktopSets, mobileSets) {
    const dSet = new Set(desktopSets);
    const mSet = new Set(mobileSets);

    const onlyDesktop = [...dSet].filter(s => !mSet.has(s));
    const onlyMobile  = [...mSet].filter(s => !dSet.has(s));
    const both        = [...dSet].filter(s => mSet.has(s));

    const pass = onlyDesktop.length === 0 && onlyMobile.length === 0;

    console.log(`\n  [${pass ? 'PASS' : 'FAIL'}] ${label}`);
    console.log(`    Desktop sections (${dSet.size}): ${[...dSet].join(', ')}`);
    console.log(`    Mobile  sections (${mSet.size}): ${[...mSet].join(', ')}`);
    if (both.length)        console.log(`    ✓ Both:          ${both.join(', ')}`);
    if (onlyDesktop.length) console.log(`    ✗ Desktop only:  ${onlyDesktop.join(', ')}`);
    if (onlyMobile.length)  console.log(`    ✗ Mobile only:   ${onlyMobile.join(', ')}`);

    return pass;
}

/* ═══════════════════════════════════════════════════════════════
   Test tokens
   ・greekTarget: WordOrderRenderer.render() が生成する data-greek と一致させる
   ═══════════════════════════════════════════════════════════════ */
const TEST_CASES = [
    {
        label:       'JHN 3:16 — ἠγάπησεν（動詞・Reading Prose あり）',
        bookChVerse: { book: 'JHN', ch: 3, v: 16 },
        greekTarget: 'ἠγάπησεν',
    },
    {
        label:       'JHN 3:16 — θεὸς（名詞・semantic data）',
        bookChVerse: { book: 'JHN', ch: 3, v: 16 },
        greekTarget: 'θεὸς',
    },
    {
        label:       'ROM 1:1 — κλητὸς（morphology候補あり）',
        bookChVerse: { book: 'ROM', ch: 1, v: 1 },
        greekTarget: 'κλητὸς',
    },
];

/* ═══════════════════════════════════════════
   Main
   ═══════════════════════════════════════════ */
(async () => {
    let totalPass = 0;
    let totalFail = 0;

    const browser = await chromium.launch({ headless: true });

    console.log('='.repeat(60));
    console.log('StudyPanel Parity Test');
    console.log('Desktop 1280×900 vs Mobile 390×844');
    console.log('='.repeat(60));

    for (const tc of TEST_CASES) {
        console.log(`\n▶ ${tc.label}`);

        let dSections, mSections;
        try {
            dSections = await getDesktopSections(browser, tc.bookChVerse, tc.greekTarget);
        } catch (e) {
            console.error(`  Desktop error: ${e.message}`);
            dSections = [];
        }
        try {
            mSections = await getMobileSections(browser, tc.bookChVerse, tc.greekTarget);
        } catch (e) {
            console.error(`  Mobile error: ${e.message}`);
            mSections = [];
        }

        const pass = compareSections(tc.label, dSections, mSections);
        if (pass) totalPass++; else totalFail++;
    }

    await browser.close();

    console.log('\n' + '='.repeat(60));
    console.log(`Result: ${totalPass} PASS / ${totalFail} FAIL`);
    console.log('='.repeat(60));

    if (totalFail > 0) {
        process.exit(1);
    }
})();
