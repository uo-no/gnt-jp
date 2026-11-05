'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = process.env.TEST_SCREENSHOT_DIR || '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/53b3f730-e5b6-47fc-ba34-faebbd78476c/scratchpad/screenshots';
require('fs').mkdirSync(SP, { recursive: true });

const errors   = [];
const findings = [];

function isIgnorable(msg) {
    const t = msg.text();
    return t.includes('Failed to load resource') || t.includes('net::ERR_')
        || t.includes('[initFromUrl]') || t.includes('[trans]');
}

async function run(name, viewport, fn) {
    const browser  = await chromium.launch({ headless: true });
    const isMobile = viewport.width <= 420;
    const ctx      = await browser.newContext({ viewport, isMobile });
    const page     = await ctx.newPage();
    const jsErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !isIgnorable(msg)) jsErrors.push(msg.text());
    });
    page.on('pageerror', err => jsErrors.push(`[pageerror] ${err.message}`));
    try {
        await fn(page);
        if (jsErrors.length) {
            console.log(`  ⚠ ${name} [${jsErrors.length} JS error(s)]`);
            jsErrors.forEach(e => console.log(`    - ${e.slice(0, 140)}`));
        } else {
            console.log(`  ✓ ${name}`);
        }
    } catch(e) {
        console.log(`  ✗ ${name}: ${e.message.slice(0, 200)}`);
        errors.push({ name, msg: e.message.slice(0, 300) });
    }
    await ctx.close();
    await browser.close();
}

const PC  = { width: 1280, height: 900 };
const M   = { width: 390, height: 844 };
const M2  = { width: 320, height: 568 };

// ─────────────────────────────────────────────────────────────────────────────
// ST-004: 詳細条件の開閉
// ─────────────────────────────────────────────────────────────────────────────
async function st004_pc(page) {
    await page.goto(`${BASE}/search-tool.html`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SP}/ST004-PC-00-initial.png` });

    // prox layer toggle
    await page.click('#layer-prox');
    await page.waitForTimeout(300);
    const proxDisplay = await page.$eval('#prox-sub', el => window.getComputedStyle(el).display);
    if (proxDisplay === 'none') throw new Error('prox-sub not shown after clicking prox layer');
    const proxAriaOpen = await page.$eval('#layer-prox', el => el.getAttribute('aria-checked'));
    if (proxAriaOpen !== 'true') throw new Error(`prox aria-checked should be true, got ${proxAriaOpen}`);
    await page.screenshot({ path: `${SP}/ST004-PC-01-prox-open.png` });

    // morph layer toggle
    await page.click('#layer-morph');
    await page.waitForTimeout(300);
    const morphDisplay = await page.$eval('#morph-sub', el => window.getComputedStyle(el).display);
    if (morphDisplay === 'none') throw new Error('morph-sub not shown after clicking morph layer');
    await page.screenshot({ path: `${SP}/ST004-PC-02-morph-open.png` });

    // close prox
    await page.click('#layer-prox');
    await page.waitForTimeout(300);
    const proxClosed = await page.$eval('#prox-sub', el => window.getComputedStyle(el).display);
    if (proxClosed !== 'none') throw new Error('prox-sub did not close on toggle-off');
    const proxAriaOff = await page.$eval('#layer-prox', el => el.getAttribute('aria-checked'));
    if (proxAriaOff !== 'false') throw new Error(`prox aria-checked should be false after close, got ${proxAriaOff}`);

    // Do a search with morph active — verify conditions persist
    await page.fill('#unified-search-input', 'ἀγαπάω');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    const morphStillOpen = await page.$eval('#morph-sub', el => window.getComputedStyle(el).display);
    if (morphStillOpen === 'none') throw new Error('morph-sub closed after search — state not maintained');
    await page.screenshot({ path: `${SP}/ST004-PC-03-after-search.png` });

    console.log(`    PC: prox open/close ✓, morph open ✓, aria-checked ✓, state persists after search ✓`);
}

async function st004_mobile(page, label) {
    await page.goto(`${BASE}/search-tool.html`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);

    // Panel is off-screen — open it first
    const panelOffscreen = await page.$eval('.search-panel', el => {
        const t = window.getComputedStyle(el).transform;
        // translateY > 0 means off-screen
        const m = t.match(/matrix\([\d.e,\s]+,\s*([\d.e-]+)\)$/);
        return m ? parseFloat(m[1]) > 10 : false;
    });
    console.log(`    ${label}: panel initially off-screen=${panelOffscreen}`);

    await page.click('#mobile-fab');
    await page.waitForTimeout(600);
    const panelOpen = await page.$eval('.search-panel', el => el.classList.contains('mobile-open'));
    if (!panelOpen) throw new Error('drawer did not open after FAB click');
    await page.screenshot({ path: `${SP}/ST004-${label}-00-drawer-open.png` });

    // Scroll drawer to find #layer-prox
    await page.evaluate(() => {
        const panel = document.querySelector('.search-panel');
        const prox  = document.getElementById('layer-prox');
        if (panel && prox) panel.scrollTop = prox.offsetTop - 20;
    });
    await page.waitForTimeout(300);

    // click prox via evaluate (panel is in fixed/overflow context)
    const proxState0 = await page.evaluate(() => {
        const proxRow = document.getElementById('layer-prox');
        proxRow.click();
        const sub = document.getElementById('prox-sub');
        return { display: window.getComputedStyle(sub).display, aria: proxRow.getAttribute('aria-checked') };
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SP}/ST004-${label}-01-prox-open.png` });
    if (proxState0.display === 'none') throw new Error(`prox-sub not shown: display=${proxState0.display}`);
    if (proxState0.aria !== 'true') throw new Error(`aria-checked not true: ${proxState0.aria}`);

    // close prox
    const proxState1 = await page.evaluate(() => {
        document.getElementById('layer-prox').click();
        return { display: window.getComputedStyle(document.getElementById('prox-sub')).display,
                 aria: document.getElementById('layer-prox').getAttribute('aria-checked') };
    });
    if (proxState1.display !== 'none') throw new Error('prox-sub did not close');
    if (proxState1.aria !== 'false') throw new Error(`aria-checked not false after close: ${proxState1.aria}`);

    // keyboard accessibility: Enter key
    const keyResult = await page.evaluate(() => {
        const row = document.getElementById('layer-prox');
        const evt = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
        row.dispatchEvent(evt);
        return { aria: row.getAttribute('aria-checked'), proxDisplay: window.getComputedStyle(document.getElementById('prox-sub')).display };
    });
    if (keyResult.aria !== 'true') throw new Error(`Enter key did not toggle: aria=${keyResult.aria}`);
    await page.screenshot({ path: `${SP}/ST004-${label}-02-prox-reopened-by-key.png` });

    console.log(`    ${label}: drawer open ✓, prox toggle ✓, aria-sync ✓, keyboard Enter ✓`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ST-005: 「本文で読む」の視認性
// ─────────────────────────────────────────────────────────────────────────────
async function st005(page, label) {
    await page.goto(`${BASE}/search-tool.html?lemma=%E6%84%9B&layers=lemma`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SP}/ST005-${label}-00-results.png` });

    const btnCount = await page.$$eval('.hit-open-btn-lg', els => els.length);
    if (btnCount === 0) throw new Error('No .hit-open-btn-lg found in results');

    const btnProps = await page.$eval('.hit-open-btn-lg', el => {
        const cs = window.getComputedStyle(el);
        const r  = el.getBoundingClientRect();
        return {
            text: el.textContent.trim(),
            bg: cs.backgroundColor,
            color: cs.color,
            fontSize: cs.fontSize,
            href: el.getAttribute('href') || '',
            target: el.getAttribute('target') || '',
            w: Math.round(r.width), h: Math.round(r.height),
        };
    });
    console.log(`    ${label}: text="${btnProps.text}", bg=${btnProps.bg}, ${btnProps.w}×${btnProps.h}px, href="${btnProps.href.slice(0,60)}", target="${btnProps.target}"`);

    if (!btnProps.text.includes('本文で読む')) throw new Error(`text unexpected: "${btnProps.text}"`);
    if (!btnProps.href.includes('index.html')) throw new Error(`href missing index.html: ${btnProps.href}`);
    if (!btnProps.href.includes('book=')) throw new Error('href missing book=');
    if (!btnProps.href.includes('ch=')) throw new Error('href missing ch=');
    if (!btnProps.href.includes('verse=')) {
        findings.push({ item: `ST-005 ${label}`, issue: `href has no verse= param: ${btnProps.href}` });
    }
    // touch target
    if (btnProps.h < 36) {
        findings.push({ item: `ST-005 ${label}`, issue: `button height ${btnProps.h}px < 36px touch target` });
    }
    // color contrast check (bg should not be white, should be highlight)
    const isColored = btnProps.bg !== 'rgba(0, 0, 0, 0)' && btnProps.bg !== 'rgb(255, 255, 255)';
    if (!isColored) {
        findings.push({ item: `ST-005 ${label}`, issue: `button background may lack visual salience: ${btnProps.bg}` });
    }
    await page.screenshot({ path: `${SP}/ST005-${label}-01-btn.png` });
    console.log(`    ${label}: count=${btnCount}, ${btnProps.w}×${btnProps.h}px ✓`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ST-006: 本文への移動と状態復元
// ─────────────────────────────────────────────────────────────────────────────
async function st006(page, label) {
    const searchUrl = `${BASE}/search-tool.html?lemma=%E6%84%9B&layers=lemma,morph&dist=7`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(4000);

    // URL after auto-search: should contain lemma + layers + dist
    const urlAfter = page.url();
    const usp = new URLSearchParams(urlAfter.split('?')[1] || '');
    console.log(`    ${label}: URL params — lemma="${usp.get('lemma')}", layers="${usp.get('layers')}", dist="${usp.get('dist')}"`);
    if (!usp.get('lemma')) throw new Error('lemma not in URL after search');
    if (!usp.get('layers')) throw new Error('layers not in URL after search');
    if (!usp.get('dist')) throw new Error('dist not in URL after search');

    // Verify href has verse
    const href = await page.$eval('.hit-open-btn-lg', el => el.getAttribute('href')).catch(() => null);
    if (!href) throw new Error('No .hit-open-btn-lg found');
    const hasVerse = href.includes('verse=');
    console.log(`    ${label}: href="${href.slice(0,80)}", verse=${hasVerse}`);
    if (!href.includes('book=') || !href.includes('ch=')) throw new Error('href missing book/ch');

    // target=_blank means new tab → search page URL is preserved in current tab (no back needed)
    const target = await page.$eval('.hit-open-btn-lg', el => el.getAttribute('target'));
    console.log(`    ${label}: target="${target}" — opens in new tab, current tab URL preserved`);

    // _searchGoBack logic check
    const backInfo = await page.evaluate(() => {
        const sameOrigin = document.referrer &&
            (new URL(document.referrer, window.location.href)).origin === window.location.origin;
        return { referrer: document.referrer, sameOrigin, historyLen: history.length };
    });
    console.log(`    ${label}: referrer="${backInfo.referrer}", sameOrigin=${backInfo.sameOrigin}, history.length=${backInfo.historyLen}`);

    // Check syncURL only uses replaceState (no extra history entries)
    // We'll verify by navigating programmatically and checking URL still has search params
    await page.evaluate(() => window._searchCount = 0);
    // Re-run search — URL should update via replaceState, not pushState
    await page.evaluate(() => unifiedSearch());
    await page.waitForTimeout(3000);
    const urlAfterReSearch = page.url();
    const hasTool = urlAfterReSearch.includes('tool=search');
    console.log(`    ${label}: URL after re-search has tool=search=${hasTool}`);

    // MN-back-bar present on mobile?
    const mnBarDisplay = await page.$eval('#mn-back-bar', el => window.getComputedStyle(el).display);
    console.log(`    ${label}: #mn-back-bar display="${mnBarDisplay}"`);

    await page.screenshot({ path: `${SP}/ST006-${label}-01-url-state.png` });
    console.log(`    ${label}: URL state sync ✓, href has book/ch ✓, target=${target}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ST-007: モバイルのドロワーと検索結果
// ─────────────────────────────────────────────────────────────────────────────
async function st007(page, label, vp) {
    await page.goto(`${BASE}/search-tool.html`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(1500);

    // FAB check
    const fabDisplay = await page.$eval('#mobile-fab', el => window.getComputedStyle(el).display);
    if (fabDisplay === 'none') throw new Error(`FAB not visible (display=${fabDisplay})`);
    console.log(`    ${label}: FAB display=${fabDisplay} ✓`);

    // Panel off-screen initially
    const initTransform = await page.$eval('.search-panel', el => window.getComputedStyle(el).transform);
    console.log(`    ${label}: initial panel transform="${initTransform}"`);

    // Horizontal overflow — initial
    const ovf0 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    if (ovf0) {
        const w = await page.evaluate(() => ({ sw: document.body.scrollWidth, iw: window.innerWidth }));
        throw new Error(`initial horizontal overflow ${w.sw}>${w.iw}`);
    }

    // Open drawer
    await page.click('#mobile-fab');
    await page.waitForTimeout(700);
    const panelOpen = await page.$eval('.search-panel', el => el.classList.contains('mobile-open'));
    if (!panelOpen) throw new Error('drawer did not open');
    const overlayVisible = await page.$eval('.mobile-overlay', el => el.classList.contains('visible'));
    if (!overlayVisible) throw new Error('overlay not visible');
    const fabIcon = await page.$eval('#mobile-fab-icon', el => el.textContent.trim());
    console.log(`    ${label}: drawer open ✓, overlay visible ✓, FAB icon="${fabIcon}"`);
    await page.screenshot({ path: `${SP}/ST007-${label}-01-drawer-open.png` });

    // Check drawer metrics
    const drawerMetrics = await page.evaluate((vpH) => {
        const panel = document.querySelector('.search-panel');
        const r = panel.getBoundingClientRect();
        const exposed = r.top; // space above drawer = exposed overlay area
        return { top: Math.round(r.top), height: Math.round(r.height), exposedPx: Math.round(r.top) };
    }, vp.height);
    console.log(`    ${label}: drawer top=${drawerMetrics.top}px, height=${drawerMetrics.height}px, exposed overlay=${drawerMetrics.exposedPx}px`);
    if (drawerMetrics.exposedPx < 40) {
        findings.push({ item: `ST-007 ${label}`, issue: `Exposed overlay (tap-to-close area) is only ${drawerMetrics.exposedPx}px — may be too small` });
    }

    // Close via overlay — click the EXPOSED area (top of viewport, not overlay center)
    await page.mouse.click(vp.width / 2, Math.min(20, drawerMetrics.top - 10));
    await page.waitForTimeout(700);
    const panelClosed = await page.$eval('.search-panel', el => !el.classList.contains('mobile-open'));
    const closedViaExposed = panelClosed;
    console.log(`    ${label}: closed via exposed overlay area=${closedViaExposed}`);
    if (!closedViaExposed) {
        // Fallback: try clicking directly on overlay element via evaluate
        await page.evaluate(() => document.querySelector('.mobile-overlay').click());
        await page.waitForTimeout(500);
        const closedViaJS = await page.$eval('.search-panel', el => !el.classList.contains('mobile-open'));
        console.log(`    ${label}: closed via overlay.click() JS=${closedViaJS}`);
        if (!closedViaJS) findings.push({ item: `ST-007 ${label}`, issue: 'overlay click to close drawer did not work' });
    }
    await page.screenshot({ path: `${SP}/ST007-${label}-02-drawer-closed.png` });

    // Search results + overflow
    await page.goto(`${BASE}/search-tool.html?lemma=%E6%84%9B&layers=lemma`, { waitUntil: 'networkidle', timeout: 25000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${SP}/ST007-${label}-03-results.png` });

    const ovf1 = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
    if (ovf1) {
        const w = await page.evaluate(() => ({ sw: document.body.scrollWidth, iw: window.innerWidth }));
        throw new Error(`results horizontal overflow ${w.sw}>${w.iw}`);
    }

    const hitCount = await page.$$eval('.hit-open-btn-lg', els => els.length);
    console.log(`    ${label}: results horizontal overflow=false ✓, hit-open-btn-lg count=${hitCount}`);

    // Check result cards don't overflow
    const cardOverflow = await page.evaluate(() => {
        const cards = document.querySelectorAll('.hit-card');
        let maxOverflow = 0;
        cards.forEach(c => {
            const r = c.getBoundingClientRect();
            if (r.right > window.innerWidth) maxOverflow = Math.max(maxOverflow, r.right - window.innerWidth);
        });
        return maxOverflow;
    });
    console.log(`    ${label}: max hit-card right overflow=${cardOverflow.toFixed(1)}px`);
    if (cardOverflow > 4) {
        findings.push({ item: `ST-007 ${label}`, issue: `hit-card overflows viewport by ${cardOverflow.toFixed(1)}px` });
    }

    // FAB obscures hit-open-btn-lg?
    if (hitCount > 0) {
        const fabRect = await page.$eval('#mobile-fab', el => {
            const r = el.getBoundingClientRect();
            return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
        });
        const lastBtn = await page.$$eval('.hit-open-btn-lg', els => {
            if (!els.length) return null;
            const last = els[els.length - 1];
            const r = last.getBoundingClientRect();
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
        });
        if (lastBtn) {
            const overlaps = fabRect.top < lastBtn.bottom && fabRect.bottom > lastBtn.top
                          && fabRect.left < lastBtn.right && fabRect.right > lastBtn.left;
            console.log(`    ${label}: FAB rect=${JSON.stringify(fabRect)}, last btn rect=${JSON.stringify(lastBtn)}, FAB overlaps last btn=${overlaps}`);
            if (overlaps) findings.push({ item: `ST-007 ${label}`, issue: 'FAB overlaps last hit-open-btn-lg in viewport' });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run all
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n══════════════════════════════════════════');
    console.log('ST-004: 詳細条件の開閉');
    console.log('══════════════════════════════════════════');
    await run('ST-004 PC',        PC, page => st004_pc(page));
    await run('ST-004 Mobile 390', M, page => st004_mobile(page, 'M390'));
    await run('ST-004 Mobile 320', M2, page => st004_mobile(page, 'M320'));

    console.log('\n══════════════════════════════════════════');
    console.log('ST-005: 「本文で読む」の視認性');
    console.log('══════════════════════════════════════════');
    await run('ST-005 PC',        PC, page => st005(page, 'PC'));
    await run('ST-005 Mobile 390', M, page => st005(page, 'M390'));

    console.log('\n══════════════════════════════════════════');
    console.log('ST-006: 本文への移動と状態復元');
    console.log('══════════════════════════════════════════');
    await run('ST-006 PC',        PC, page => st006(page, 'PC'));
    await run('ST-006 Mobile 390', M, page => st006(page, 'M390'));

    console.log('\n══════════════════════════════════════════');
    console.log('ST-007: モバイルのドロワーと検索結果');
    console.log('══════════════════════════════════════════');
    await run('ST-007 Mobile 390', M,  page => st007(page, 'M390', M));
    await run('ST-007 Mobile 320', M2, page => st007(page, 'M320', M2));

    console.log('\n══════════════════════════════════════════');
    if (errors.length) {
        console.log(`HARD ERRORS: ${errors.length}`);
        errors.forEach(e => console.log(`  ✗ ${e.name}: ${e.msg}`));
    } else {
        console.log('No hard errors');
    }
    if (findings.length) {
        console.log(`\nFINDINGS (UX/warnings): ${findings.length}`);
        findings.forEach(f => console.log(`  ⚠ ${f.item}: ${f.issue}`));
    }
    console.log('\nScreenshots:', SP);
})();
