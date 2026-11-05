'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/53b3f730-e5b6-47fc-ba34-faebbd78476c/scratchpad/screenshots-st005';
require('fs').mkdirSync(SP, { recursive: true });

const errors = [];

function isIgnorable(msg) {
    const t = msg.text();
    return t.includes('Failed to load resource') || t.includes('net::ERR_')
        || t.includes('[initFromUrl]') || t.includes('[trans]') || t.includes('[DIAG]');
}

async function run(name, viewport, fn) {
    const browser = await chromium.launch({ headless: true });
    const isMobile = viewport.width <= 420;
    const ctx = await browser.newContext({ viewport, isMobile });
    const page = await ctx.newPage();
    const jsErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !isIgnorable(msg)) jsErrors.push(msg.text());
    });
    page.on('pageerror', err => jsErrors.push(`[pageerror] ${err.message}`));
    try {
        await fn(page);
        if (jsErrors.length) {
            console.log(`  ⚠ ${name} [${jsErrors.length} JS error(s)]`);
            jsErrors.forEach(e => console.log(`    JS: ${e.slice(0, 140)}`));
            errors.push(`${name}: JS errors`);
        } else {
            console.log(`  ✓ ${name}`);
        }
    } catch(e) {
        console.log(`  ✗ ${name}: ${e.message.slice(0, 200)}`);
        errors.push(`${name}: ${e.message.slice(0, 200)}`);
    }
    await ctx.close();
    await browser.close();
}

const PC  = { width: 1280, height: 900 };
const M   = { width: 390,  height: 844 };
const M2  = { width: 320,  height: 568 };

async function check(page, label) {
    await page.goto(`${BASE}/search-tool.html?lemma=%E6%84%9B&layers=lemma`, {
        waitUntil: 'networkidle', timeout: 25000,
    });
    await page.waitForTimeout(4000);

    // 1. ボタン高さ ≥ 36px（可視ボタン = offsetHeight > 0 のみ対象）
    //    ゼロ高さ = 非表示親（collapsed lg-panel）内 — 計測対象外
    const btnData = await page.$$eval('.hit-open-btn-lg', els =>
        els.map(el => ({
            h:      el.offsetHeight,
            minH:   window.getComputedStyle(el).minHeight,
            text:   el.textContent.trim(),
            href:   el.getAttribute('href') || '',
            target: el.getAttribute('target') || '',
        }))
    );
    const visible = btnData.filter(b => b.h > 0);
    const hidden  = btnData.filter(b => b.h === 0);
    if (visible.length === 0) throw new Error('No visible .hit-open-btn-lg found');

    const heights = visible.map(b => b.h);
    const minH    = Math.min(...heights);
    const maxH    = Math.max(...heights);
    console.log(`    ${label}: visible=${visible.length}, in-hidden-parent=${hidden.length}, height ${minH}–${maxH}px, min-height CSS="${visible[0].minH}"`);
    if (minH < 36) throw new Error(`visible button height ${minH}px < 36px`);

    // 2. テキスト・href・target が変わっていない
    for (const b of visible) {
        if (b.text !== '本文で読む')                              throw new Error(`text: "${b.text}"`);
        if (!b.href.includes('index.html') || !b.href.includes('book=')) throw new Error(`href: ${b.href}`);
        if (b.target !== '_blank')                                throw new Error(`target: "${b.target}"`);
    }
    console.log(`    ${label}: text ✓, href="${visible[0].href.slice(0,55)}", target=_blank ✓`);

    // 3. 水平オーバーフロー（ページ全体）
    const ovf = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    if (ovf) {
        const w = await page.evaluate(() => ({ sw: document.body.scrollWidth, iw: window.innerWidth }));
        throw new Error(`horizontal overflow ${w.sw}>${w.iw}`);
    }
    console.log(`    ${label}: no horizontal overflow ✓`);

    // 4. hit-footer 内でボタンが footer を視覚的に超えていないか (getBoundingClientRect)
    //    可視フッターのみチェック（bH > 0 で判定）
    const footerOvf = await page.evaluate(() => {
        let maxOver = 0;
        document.querySelectorAll('.hit-footer').forEach(f => {
            const fr = f.getBoundingClientRect();
            if (fr.width === 0) return; // off-screen footer はスキップ
            f.querySelectorAll('.hit-open-btn-lg').forEach(b => {
                if (b.offsetHeight === 0) return; // 非表示親内はスキップ
                const br = b.getBoundingClientRect();
                const over = br.right - fr.right;
                if (over > 2) maxOver = Math.max(maxOver, over);
            });
        });
        return maxOver;
    });
    if (footerOvf > 2) throw new Error(`button overflows footer by ${footerOvf.toFixed(1)}px`);
    console.log(`    ${label}: footer overflow=${footerOvf.toFixed(1)}px ✓`);

    // 5. スクリーンショット
    await page.screenshot({ path: `${SP}/st005-${label}-results.png` });
    console.log(`    ${label}: screenshot saved`);
}

(async () => {
    console.log('\n== ST-005 height verification ==');
    await run('PC 1280',    PC,  page => check(page, 'PC'));
    await run('Mobile 390', M,   page => check(page, 'M390'));
    await run('Mobile 320', M2,  page => check(page, 'M320'));

    if (errors.length) {
        console.log(`\n✗ ${errors.length} failure(s):`);
        errors.forEach(e => console.log(`  - ${e}`));
        process.exit(1);
    } else {
        console.log('\n✓ All checks PASS');
    }
    console.log('Screenshots:', SP);
})();
