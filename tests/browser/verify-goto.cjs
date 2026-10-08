'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-playwright';
require('fs').mkdirSync(SP, { recursive: true });

const errors = [];

function isIgnorable(msg) {
    const t = msg.text();
    return t.includes('Failed to load resource') || t.includes('net::ERR_');
}

async function run(name, viewport, fn) {
    const browser = await chromium.launch({ headless: true });
    const isMobile = viewport.width <= 420;
    const ctx = await browser.newContext({ viewport, isMobile });
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !isIgnorable(msg)) consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message}`));
    try {
        await fn(page);
        if (consoleErrors.length) {
            console.log(`  ✗ ${name} [${consoleErrors.length} JS errors]`);
            consoleErrors.forEach(e => console.log(`    - ${e.slice(0, 140)}`));
            errors.push(`${name}: ${consoleErrors.join('; ')}`);
        } else {
            console.log(`  ✓ ${name}`);
        }
    } catch(e) {
        console.log(`  ✗ ${name}: ${e.message}`);
        errors.push(`${name}: ${e.message}`);
    }
    await ctx.close();
    await browser.close();
}

const D = { width: 1280, height: 900 };
const M = { width: 390, height: 844 };

(async () => {
    // 1. decodeURIComponent fix: regex match
    await run('goToWord fix: regex matches decoded ref', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2000);
        const result = await page.evaluate(() => {
            const encodedRef = 'MAT%201%3A23!22';
            const prefix = decodeURIComponent(String(encodedRef||'')).replace(/!.*$/,'').trim();
            const m = prefix.match(/^([A-Z0-9]+)\s+(\d+):(\d+)/);
            return { raw: encodedRef, decoded: prefix, matched: !!m, bookKey: m?.[1], chapter: m?parseInt(m[2],10):null };
        });
        console.log(`    raw="${result.raw}" → decoded="${result.decoded}" matched=${result.matched} book=${result.bookKey} ch=${result.chapter}`);
        if (!result.matched) throw new Error('regex still fails');
        if (result.bookKey !== 'MAT') throw new Error(`unexpected bookKey: ${result.bookKey}`);
        if (result.chapter !== 1) throw new Error(`unexpected chapter: ${result.chapter}`);
    });

    // 2. occur-row expand → 本文へ button ref decodes correctly
    await run('本文へ button: ref arg decodes to valid book+ch', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        const row = await page.$('.occur-row');
        if (!row) throw new Error('no .occur-row');
        await row.click();
        await page.waitForTimeout(2000);
        const btn = await page.$('.morph-ctx-goto button');
        if (!btn) throw new Error('本文へ button not found');
        const onclickAttr = await btn.evaluate(el => el.getAttribute('onclick') || '');
        const m = onclickAttr.match(/goToWord\('([^']+)'/);
        if (!m) throw new Error('could not parse ref from onclick');
        const refArg = m[1];
        const decoded = decodeURIComponent(refArg).replace(/!.*$/, '').trim();
        const rm = decoded.match(/^([A-Z0-9]+)\s+(\d+):(\d+)/);
        if (!rm) throw new Error(`regex fails on actual ref: ${refArg} → ${decoded}`);
        console.log(`    ref="${refArg}" → decoded="${decoded}" bookKey=${rm[1]} ch=${rm[2]}`);
        await page.screenshot({ path: `${SP}/goto-btn-visible.png` });
    });

    // 3. standalone: 本文へ click → window.open
    await run('本文へ standalone: window.open called', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        const row = await page.$('.occur-row');
        if (!row) throw new Error('no .occur-row');
        await row.click();
        await page.waitForTimeout(2000);
        await page.evaluate(() => { window._openedUrl = null; window.open = (url) => { window._openedUrl = url; return null; }; });
        const btn = await page.$('.morph-ctx-goto button');
        if (!btn) throw new Error('本文へ button not found');
        await btn.click();
        await page.waitForTimeout(500);
        const openedUrl = await page.evaluate(() => window._openedUrl);
        console.log(`    window.open url: ${openedUrl}`);
        if (!openedUrl) throw new Error('window.open NOT called → still early-returning');
        if (!openedUrl.includes('book=') || !openedUrl.includes('ch=')) throw new Error(`url missing book/ch: ${openedUrl}`);
    });

    // 4. iframe: GO_TO_VERSE postMessage
    await run('本文へ iframe: GO_TO_VERSE postMessage', D, async (page) => {
        const html = `<!DOCTYPE html><html><body>
<iframe id="f" src="${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N" width="800" height="800"></iframe>
<script>window._msgs=[]; window.addEventListener('message',e=>{window._msgs.push(e.data);});</script>
</body></html>`;
        await page.setContent(html);
        const frameEl = await page.waitForSelector('#f', { timeout: 10000 });
        const iframe = await frameEl.contentFrame();
        await iframe.waitForSelector('.occur-row', { timeout: 15000 });
        await page.waitForTimeout(3000);
        const row = await iframe.$('.occur-row');
        if (!row) throw new Error('no .occur-row in iframe');
        await row.click();
        await page.waitForTimeout(2000);
        const btn = await iframe.$('.morph-ctx-goto button');
        if (!btn) throw new Error('本文へ button not found in iframe');
        await page.evaluate(() => { window._msgs = []; });
        await btn.click();
        await page.waitForTimeout(500);
        const msgs = await page.evaluate(() => window._msgs);
        console.log(`    parent received: ${JSON.stringify(msgs)}`);
        const gotoMsg = msgs.find(m => m && m.type === 'GO_TO_VERSE');
        if (!gotoMsg) throw new Error('GO_TO_VERSE NOT received');
        console.log(`    GO_TO_VERSE: bookKey=${gotoMsg.bookKey} chapter=${gotoMsg.chapter}`);
        if (!gotoMsg.bookKey) throw new Error('bookKey missing');
        if (!gotoMsg.chapter) throw new Error('chapter missing');
    });

    // 5. 書物フィルター: DOM state check (title + active dist-row)
    await run('書物フィルター: title updated + dist-row active', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        const distRow = await page.$('.dist-row');
        if (!distRow) throw new Error('no .dist-row');
        const expectedBook = await distRow.evaluate(el => el.dataset.book);
        await distRow.click();
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
            title: document.getElementById('result-section-title')?.textContent,
            active: document.querySelector('.dist-row.active')?.dataset.book,
            clearBtn: document.getElementById('clear-book-filter')?.style.display,
        }));
        console.log(`    expectedBook=${expectedBook} title="${state.title}" active=${state.active} clearBtn.display=${state.clearBtn}`);
        if (!state.title?.includes('実際の出現 —')) throw new Error('title not updated');
        if (state.active !== expectedBook) throw new Error(`active dist-row=${state.active} ≠ expected=${expectedBook}`);
        if (state.clearBtn === 'none') throw new Error('clear-book-filter button not visible');
    });

    // 6. Desktop
    await run('回帰 Desktop 1280: load OK', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: `${SP}/reg-goto-desktop.png` });
        const heroFS = await page.evaluate(() => {
            const el = document.querySelector('.ms-hero-word');
            return el ? window.getComputedStyle(el).fontSize : null;
        });
        console.log(`    hero fontSize: ${heroFS}`);
        if (!heroFS) throw new Error('.ms-hero-word not found');
    });

    // 7. Mobile
    await run('回帰 Mobile 390: no overflow', M, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
        if (overflow) {
            const w = await page.evaluate(() => ({ s: document.body.scrollWidth, vp: window.innerWidth }));
            throw new Error(`horizontal overflow ${w.s}>${w.vp}`);
        }
        await page.screenshot({ path: `${SP}/reg-goto-mobile.png` });
    });

    // 8. Visual Baseline
    await run('Visual Baseline 15296856: ms-section-title', D, async (page) => {
        await page.goto(`${BASE}/morph-search?word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        const styles = await page.evaluate(() =>
            [...document.querySelectorAll('.ms-section-title')].map(el => {
                const cs = window.getComputedStyle(el);
                return { text: el.textContent.trim(), fontSize: cs.fontSize, fontWeight: cs.fontWeight };
            })
        );
        styles.forEach(s => console.log(`    "${s.text}": ${s.fontSize} fw:${s.fontWeight}`));
        for (const s of styles) {
            const fs = parseFloat(s.fontSize);
            if (fs < 10.5 || fs > 13) throw new Error(`"${s.text}": ${s.fontSize} out of range`);
            if (s.fontWeight !== '600') throw new Error(`"${s.text}": fontWeight ${s.fontWeight} ≠ 600`);
        }
    });

    console.log(errors.length ? `\n✗ ${errors.length} failure(s)` : '\n✓ All checks PASS');
    if (errors.length) process.exit(1);
})();
