const { chromium } = require('playwright');

const OUT = '/private/tmp/claude-501/-Users-373da-Claude----/3468abe1-9236-4b1b-ba31-8bbcf2b61ea9/scratchpad/';

async function screenshot(page, name) {
    await page.screenshot({ path: OUT + name, fullPage: false });
    console.log('  Screenshot:', name);
}

async function captureCSS(page, selector, props) {
    return await page.evaluate(({ sel, props }) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const result = {};
        props.forEach(p => result[p] = cs.getPropertyValue(p));
        return result;
    }, { sel: selector, props });
}

const STYLE_PROPS = ['font-size', 'font-weight', 'letter-spacing', 'color'];

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ─── PC ───────────────────────────────────────────────────────────────
    console.log('\n======== PC (1280x900) ========');
    const pc = await browser.newPage();
    await pc.setViewportSize({ width: 1280, height: 900 });

    // 本文
    console.log('\n[本文]');
    await pc.goto('http://localhost:8765/?book=ROM&ch=1&transA=JA1955', { waitUntil: 'networkidle' });
    await pc.waitForTimeout(2500);
    await screenshot(pc, 'pc-honbun.png');
    const honbunRef = await pc.evaluate(() => {
        return [...document.querySelectorAll('.verse-block .v-num')].slice(0, 4).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', honbunRef);
    const honbunCSS = await captureCSS(pc, '.v-num', STYLE_PROPS);
    console.log('  .v-num CSS:', JSON.stringify(honbunCSS));

    // 語順で読む
    console.log('\n[語順で読む]');
    await pc.goto('http://localhost:8765/?book=ROM&ch=1&transA=WORD_ORDER', { waitUntil: 'networkidle' });
    await pc.waitForTimeout(2500);
    await screenshot(pc, 'pc-wordorder.png');
    const woRef = await pc.evaluate(() => {
        return [...document.querySelectorAll('.verse-block .v-num')].slice(0, 4).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', woRef);

    // 談話分析
    console.log('\n[談話分析]');
    await pc.goto('http://localhost:8765/?book=ROM&ch=1&transA=DISCOURSE', { waitUntil: 'networkidle' });
    await pc.waitForTimeout(3000);
    await screenshot(pc, 'pc-discourse.png');
    const discourseRef = await pc.evaluate(() => {
        return [...document.querySelectorAll('.dcv-unit-vlabel')].slice(0, 5).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', discourseRef);
    const discourseCSS = await captureCSS(pc, '.dcv-unit-vlabel', STYLE_PROPS);
    console.log('  .dcv-unit-vlabel CSS:', JSON.stringify(discourseCSS));

    // 語句の関係
    console.log('\n[語句の関係]');
    await pc.goto('http://localhost:8765/?book=ROM&ch=1&transA=RK_READING', { waitUntil: 'networkidle' });
    await pc.waitForTimeout(4000);
    await screenshot(pc, 'pc-rk-reading.png');
    const rkRef = await pc.evaluate(() => {
        return [...document.querySelectorAll('.sd-sentence-ref')].slice(0, 5).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', rkRef);
    const rkCSS = await captureCSS(pc, '.sd-sentence-ref', STYLE_PROPS);
    console.log('  .sd-sentence-ref CSS:', JSON.stringify(rkCSS));

    // DA_READING 回帰確認
    console.log('\n[DA_READING 回帰確認]');
    await pc.goto('http://localhost:8765/?book=ROM&ch=1&transA=DA_READING', { waitUntil: 'networkidle' });
    await pc.waitForTimeout(3500);
    await screenshot(pc, 'pc-da-reading.png');
    const daRef = await pc.evaluate(() => {
        return [...document.querySelectorAll('.sd-sentence-ref')].slice(0, 4).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', daRef);

    await pc.close();

    // ─── Mobile ───────────────────────────────────────────────────────────
    console.log('\n======== Mobile (375x812) ========');
    const mb = await browser.newPage();
    await mb.setViewportSize({ width: 375, height: 812 });

    console.log('\n[本文 mobile]');
    await mb.goto('http://localhost:8765/?book=ROM&ch=1&transA=JA1955', { waitUntil: 'networkidle' });
    await mb.waitForTimeout(2500);
    await screenshot(mb, 'mb-honbun.png');
    const mbHonbunRef = await mb.evaluate(() => {
        return [...document.querySelectorAll('.verse-block .v-num')].slice(0, 3).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', mbHonbunRef);

    console.log('\n[語順で読む mobile]');
    await mb.goto('http://localhost:8765/?book=ROM&ch=1&transA=WORD_ORDER', { waitUntil: 'networkidle' });
    await mb.waitForTimeout(2500);
    await screenshot(mb, 'mb-wordorder.png');

    console.log('\n[談話分析 mobile]');
    await mb.goto('http://localhost:8765/?book=ROM&ch=1&transA=DISCOURSE', { waitUntil: 'networkidle' });
    await mb.waitForTimeout(3000);
    await screenshot(mb, 'mb-discourse.png');
    const mbDiscourseRef = await mb.evaluate(() => {
        return [...document.querySelectorAll('.dcv-unit-vlabel')].slice(0, 4).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', mbDiscourseRef);

    console.log('\n[語句の関係 mobile]');
    await mb.goto('http://localhost:8765/?book=ROM&ch=1&transA=RK_READING', { waitUntil: 'networkidle' });
    await mb.waitForTimeout(4000);
    await screenshot(mb, 'mb-rk-reading.png');
    const mbRkRef = await mb.evaluate(() => {
        return [...document.querySelectorAll('.sd-sentence-ref')].slice(0, 4).map(el => el.textContent.trim());
    });
    console.log('  verse labels:', mbRkRef);

    await mb.close();
    await browser.close();
    console.log('\nDone.');
})();
