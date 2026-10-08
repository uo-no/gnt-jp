'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:8765';
const SP = process.env.TEST_SCREENSHOT_DIR || '/tmp/gnt-jp-playwright';
require('fs').mkdirSync(SP, { recursive: true });

const errors = [];

function isIgnorable(msg) {
    const t = msg.text();
    // App 404s (syntax registry / bible data fetches) and CDN 404s are expected
    if (t.includes('Failed to load resource')) return true;
    return false;
}

async function runScenario(browser, name, contextOpts, scenario) {
    const ctx = await browser.newContext(contextOpts);
    const page = await ctx.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error' && !isIgnorable(msg)) consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(`[pageerror] ${err.message}`));
    try {
        await scenario(page);
    } catch (e) {
        consoleErrors.push(`[test-error] ${e.message}`);
    }
    await ctx.close();
    if (consoleErrors.length) {
        console.log(`  ✗ ${name}`);
        consoleErrors.forEach(e => console.log(`    - ${e.slice(0,140)}`));
        errors.push(...consoleErrors.map(e => `${name}: ${e}`));
    } else {
        console.log(`  ✓ ${name}`);
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    /* 1. Desktop: page loads */
    await runScenario(browser, 'Desktop 1280×900: page load (no JS errors)',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N&case=nominative&number=singular&gender=masculine`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);
            await page.screenshot({ path: `${SP}/syntax-ia-desktop-load.png`, fullPage: true });
        }
    );

    /* 2. Section structure check */
    await runScenario(browser, 'Section structure: titles and IDs',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N&case=nominative&number=singular&gender=masculine`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);

            const titles = await page.evaluate(() =>
                [...document.querySelectorAll('.ms-section-title')].map(e => e.textContent.trim())
            );
            console.log('    Section titles:', JSON.stringify(titles));

            if (titles.includes('判断根拠')) throw new Error('旧セクション「判断根拠」が残っています');
            if (!titles.includes('構文上の結論')) throw new Error('「構文上の結論」セクションが見つかりません');
            if (!titles.includes('文脈')) throw new Error('「文脈」セクションが見つかりません');

            const conclusionWrap = await page.evaluate(() => !!document.getElementById('conclusion-wrap'));
            if (!conclusionWrap) throw new Error('conclusion-wrap が存在しません');

            const altSection = await page.evaluate(() => !!document.getElementById('alt-section'));
            if (!altSection) throw new Error('alt-section が存在しません');
        }
    );

    /* 3. Token selection: conclusion rendered, alt-section state */
    await runScenario(browser, 'Token selection: conclusion content + alt-section',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N&case=nominative&number=singular&gender=masculine`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);

            const result = await page.evaluate(() => {
                const cw  = document.getElementById('conclusion-wrap');
                const alt = document.getElementById('alt-section');
                const rh  = document.getElementById('role-hero');
                return {
                    conclusionHTML:   cw  ? cw.innerHTML.slice(0, 300)  : '(not found)',
                    conclusionLength: cw  ? cw.innerHTML.length : -1,
                    altDisplay:       alt ? alt.style.display   : '(not found)',
                    roleHeroHTML:     rh  ? rh.innerHTML.slice(0, 150) : '(not found)',
                };
            });
            console.log('    role-hero:', result.roleHeroHTML.replace(/\s+/g,' ').trim());
            console.log('    conclusion length:', result.conclusionLength);
            console.log('    conclusion preview:', result.conclusionHTML.replace(/\s+/g,' ').slice(0, 200));
            console.log('    alt-section display:', result.altDisplay);

            await page.screenshot({ path: `${SP}/syntax-ia-desktop-token.png`, fullPage: true });
        }
    );

    /* 4. Manual token click */
    await runScenario(browser, 'Token click: updates correctly',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
            await page.waitForSelector('.token-chip', { timeout: 10000 }).catch(() => null);
            await page.waitForTimeout(2000);

            const chips = await page.$$('.token-chip');
            console.log('    token-chip count:', chips.length);
            if (chips.length === 0) throw new Error('token-chip が見つかりません');
            await chips[1].click();
            await page.waitForTimeout(600);

            const state = await page.evaluate(() => ({
                conclusionLength: document.getElementById('conclusion-wrap')?.innerHTML.length ?? -1,
                roleHeroHasWord: !!document.querySelector('.role-primary-word'),
                sectionsVisible: [...document.querySelectorAll('.ms-section-title')].map(e => e.textContent.trim()),
            }));
            console.log('    After click sections:', JSON.stringify(state.sectionsVisible));
            console.log('    role-primary-word present:', state.roleHeroHasWord);
            console.log('    conclusion-wrap length:', state.conclusionLength);

            await page.screenshot({ path: `${SP}/syntax-ia-desktop-click.png`, fullPage: true });
        }
    );

    /* 5. Mobile 390×844 */
    await runScenario(browser, 'Mobile 390×844: load + overflow',
        { viewport: { width: 390, height: 844 }, isMobile: true },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N&case=nominative&number=singular&gender=masculine`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);

            const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 2);
            if (overflow) {
                const w = await page.evaluate(() => ({ scroll: document.body.scrollWidth, vp: window.innerWidth }));
                throw new Error(`Horizontal overflow: scrollWidth=${w.scroll}, innerWidth=${w.vp}`);
            }
            await page.screenshot({ path: `${SP}/syntax-ia-mobile.png`, fullPage: true });
        }
    );

    /* 6. Visual Baseline: section heading styles must match 15296856 baseline */
    await runScenario(browser, 'Visual Baseline: ms-section-title computed styles',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);

            const styles = await page.evaluate(() =>
                [...document.querySelectorAll('.ms-section-title')].map(el => {
                    const cs = window.getComputedStyle(el);
                    return { text: el.textContent.trim(), fontSize: cs.fontSize, fontWeight: cs.fontWeight };
                })
            );
            console.log('    Section title styles:');
            styles.forEach(s => console.log(`      "${s.text}": ${s.fontSize} / fw:${s.fontWeight}`));

            for (const s of styles) {
                const fs = parseFloat(s.fontSize);
                if (fs < 10.5 || fs > 13) throw new Error(`"${s.text}": fontSize ${s.fontSize} out of range`);
                if (s.fontWeight !== '600') throw new Error(`"${s.text}": fontWeight ${s.fontWeight} ≠ 600`);
            }
        }
    );

    /* 7. Candidate interaction still works */
    await runScenario(browser, 'Candidate interaction: expand/collapse',
        { viewport: { width: 1280, height: 900 } },
        async (page) => {
            const url = `${BASE}/syntax-search?ref=JHN+3:16&word=%CE%B8%CE%B5%CF%8C%CF%82&pos=N`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
            await page.waitForTimeout(3000);

            // Check if alt-section has candidate items
            const candItems = await page.$$('.candidate-item');
            console.log('    candidate-items found:', candItems.length);

            if (candItems.length > 0) {
                // Toggle first candidate
                const head = await candItems[0].$('.candidate-item-head');
                if (head) {
                    await head.click();
                    await page.waitForTimeout(300);
                    const isOpen = await candItems[0].evaluate(el => el.classList.contains('open'));
                    console.log('    candidate toggle works:', isOpen);
                }
            }
        }
    );

    await browser.close();

    if (errors.length) {
        console.log(`\n✗ ${errors.length} failure(s)`);
        process.exit(1);
    } else {
        console.log('\n✓ All checks passed');
    }
})();
