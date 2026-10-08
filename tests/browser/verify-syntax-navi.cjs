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
    const jsErrors = [];
    page.on('console', msg => { if (msg.type() === 'error' && !isIgnorable(msg)) jsErrors.push(msg.text()); });
    page.on('pageerror', err => jsErrors.push(`[pageerror] ${err.message}`));
    try {
        await fn(page);
        if (jsErrors.length) {
            console.log(`  ✗ ${name} [${jsErrors.length} JS errors]`);
            jsErrors.forEach(e => console.log(`    - ${e.slice(0, 140)}`));
            errors.push(`${name}: JS errors`);
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

const URL_JHN = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N&case=nominative&number=singular&gender=masculine`;
const D = { width: 1280, height: 900 };
const M = { width: 390, height: 844 };

(async () => {
    // 1. 🔍 絵文字 削除確認
    await run('A. 🔍 削除: similar-syntax-link にテキストのみ', D, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);
        const links = await page.evaluate(() =>
            [...document.querySelectorAll('.similar-syntax-link')].map(a => ({
                text: a.textContent.trim(),
                href: a.href,
            }))
        );
        console.log(`    link count: ${links.length}`);
        if (links.length === 0) throw new Error('similar-syntax-link not found');
        links.slice(0, 2).forEach(l => console.log(`    text="${l.text}" href=${l.href.slice(0, 80)}`));
        const hasEmoji = links.some(l => l.text.includes('🔍'));
        if (hasEmoji) throw new Error('🔍 emoji still present');
        const hasText = links.every(l => l.text.includes('統合検索で探す'));
        if (!hasText) throw new Error('expected text "統合検索で探す" not found');
        // URL は変わっていないはず
        const hasSearchTool = links.every(l => l.href.includes('search-tool.html'));
        if (!hasSearchTool) throw new Error('href does not include search-tool.html');
        await page.screenshot({ path: `${SP}/syntax-navi-emoji-removed.png`, fullPage: false });
    });

    // 2. 「単語」Standalone: window.open が呼ばれる
    await run('B1. 単語 Standalone: window.open 呼び出し確認', D, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(2500);
        await page.evaluate(() => {
            window._openedUrls = [];
            window.open = (url, ...a) => { window._openedUrls.push(url); return null; };
        });
        await page.evaluate(() => {
            const btn = [...document.querySelectorAll('.ms-explore-item')]
                .find(el => el.querySelector('.ms-explore-title')?.textContent?.trim() === '単語');
            if (btn) btn.click(); else throw new Error('単語 button not found');
        });
        await page.waitForTimeout(400);
        const opened = await page.evaluate(() => window._openedUrls);
        console.log(`    window.open: ${JSON.stringify(opened)}`);
        if (!opened.length) throw new Error('window.open NOT called');
        const url = opened[0];
        if (!url.includes('search-tool.html')) throw new Error(`unexpected url: ${url}`);
        if (!url.includes('layers=lemma')) throw new Error('layers param missing');
    });

    // 3. 「単語」App iframe: NAV_TO_SEMANTICS を送らず window.open が呼ばれる
    await run('B2. 単語 App iframe: postMessage 送らない + window.open', D, async (page) => {
        const html = `<!DOCTYPE html><html><body style="margin:0">
<iframe id="f" src="${URL_JHN}" width="360" height="900"></iframe>
<script>window._msgs=[]; window.addEventListener('message',e=>{window._msgs.push(e.data);});</script>
</body></html>`;
        await page.setContent(html);
        const frameEl = await page.waitForSelector('#f', { timeout: 10000 });
        const iframe = await frameEl.contentFrame();
        await iframe.waitForSelector('.ms-explore-item', { timeout: 15000 });
        await page.waitForTimeout(3000);

        // iframe 内で window.open をスパイ
        await iframe.evaluate(() => {
            window._iframeOpened = [];
            window.open = (url, ...a) => { window._iframeOpened.push(url); return null; };
        });
        await page.evaluate(() => { window._msgs = []; });

        await iframe.evaluate(() => {
            const btn = [...document.querySelectorAll('.ms-explore-item')]
                .find(el => el.querySelector('.ms-explore-title')?.textContent?.trim() === '単語');
            if (btn) btn.click(); else throw new Error('単語 button not found');
        });
        await page.waitForTimeout(500);

        const msgs = await page.evaluate(() => window._msgs);
        const opened = await iframe.evaluate(() => window._iframeOpened);
        const navMsg = msgs.find(m => m && m.type === 'NAV_TO_SEMANTICS');

        console.log(`    NAV_TO_SEMANTICS sent: ${!!navMsg} (expect false)`);
        console.log(`    window.open in iframe: ${JSON.stringify(opened)}`);
        if (navMsg) throw new Error('NAV_TO_SEMANTICS still being sent (must NOT send)');
        if (!opened.length) throw new Error('window.open NOT called in iframe');
        if (!opened[0].includes('search-tool.html')) throw new Error(`unexpected url: ${opened[0]}`);
        if (!opened[0].includes('layers=lemma')) throw new Error('layers param missing');
        console.log(`    url: ${opened[0].slice(0, 100)}`);
    });

    // 4. 「形態論」App iframe: NAV_TO_MORPH は引き続き postMessage される
    await run('B3. 形態論 App iframe: NAV_TO_MORPH postMessage 維持', D, async (page) => {
        const html = `<!DOCTYPE html><html><body style="margin:0">
<iframe id="f" src="${URL_JHN}" width="360" height="900"></iframe>
<script>window._msgs=[]; window.addEventListener('message',e=>{window._msgs.push(e.data);});</script>
</body></html>`;
        await page.setContent(html);
        const frameEl = await page.waitForSelector('#f', { timeout: 10000 });
        const iframe = await frameEl.contentFrame();
        await iframe.waitForSelector('.ms-explore-item', { timeout: 15000 });
        await page.waitForTimeout(3000);
        await page.evaluate(() => { window._msgs = []; });

        await iframe.evaluate(() => {
            const btn = [...document.querySelectorAll('.ms-explore-item')]
                .find(el => el.querySelector('.ms-explore-title')?.textContent?.trim() === '形態論');
            if (btn) btn.click(); else throw new Error('形態論 button not found');
        });
        await page.waitForTimeout(500);

        const msgs = await page.evaluate(() => window._msgs);
        const morphMsg = msgs.find(m => m && m.type === 'NAV_TO_MORPH');
        console.log(`    NAV_TO_MORPH sent: ${!!morphMsg} (expect true)`);
        if (!morphMsg) throw new Error('NAV_TO_MORPH NOT sent — regression');
        console.log(`    message: ${JSON.stringify(morphMsg)}`);
    });

    // 5. Desktop regression
    await run('C1. 回帰 Desktop 1280: page load', D, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);
        const titles = await page.evaluate(() =>
            [...document.querySelectorAll('.ms-section-title')].map(el => el.textContent.trim())
        );
        console.log(`    section titles: ${JSON.stringify(titles)}`);
        if (!titles.includes('さらに調べる')) throw new Error('さらに調べる section missing');
        await page.screenshot({ path: `${SP}/syntax-navi-desktop.png`, fullPage: false });
    });

    // 6. Mobile regression
    await run('C2. 回帰 Mobile 390: no overflow', M, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);
        const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
        if (overflow) {
            const w = await page.evaluate(() => ({ s: document.body.scrollWidth, vp: window.innerWidth }));
            throw new Error(`overflow: ${w.s} > ${w.vp}`);
        }
        await page.screenshot({ path: `${SP}/syntax-navi-mobile.png`, fullPage: false });
    });

    // 7. Visual Baseline: ms-section-title
    await run('C3. Visual Baseline 15296856: ms-section-title', D, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);
        const styles = await page.evaluate(() =>
            [...document.querySelectorAll('.ms-section-title')].map(el => {
                const cs = window.getComputedStyle(el);
                return { text: el.textContent.trim(), fontSize: cs.fontSize, fontWeight: cs.fontWeight };
            })
        );
        styles.forEach(s => console.log(`    "${s.text}": ${s.fontSize} fw:${s.fontWeight}`));
        for (const s of styles) {
            const fs = parseFloat(s.fontSize);
            if (fs < 10.5 || fs > 13) throw new Error(`"${s.text}": ${s.fontSize} outside baseline`);
            if (s.fontWeight !== '600') throw new Error(`"${s.text}": fontWeight ${s.fontWeight} ≠ 600`);
        }
    });

    // 8. Hero typography
    await run('C4. Visual Baseline 15296856: hero word', D, async (page) => {
        await page.goto(URL_JHN, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(3000);
        const hero = await page.evaluate(() => {
            const el = document.querySelector('.role-primary-word');
            if (!el) return null;
            const cs = window.getComputedStyle(el);
            return { fontSize: cs.fontSize, fontWeight: cs.fontWeight };
        });
        console.log(`    hero: ${JSON.stringify(hero)}`);
        if (!hero) throw new Error('.role-primary-word not found');
        const fs = parseFloat(hero.fontSize);
        if (fs < 48 || fs > 56) throw new Error(`hero fontSize ${hero.fontSize} outside 48–56px`);
        if (hero.fontWeight !== '700') throw new Error(`hero fontWeight ${hero.fontWeight} ≠ 700`);
    });

    console.log(errors.length ? `\n✗ ${errors.length} failure(s)` : '\n✓ All checks PASS');
    if (errors.length) process.exit(1);
})();
