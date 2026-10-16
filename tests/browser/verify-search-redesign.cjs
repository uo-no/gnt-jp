'use strict';
/* E-12 回帰テスト — search-tool.html 新デザイン検証
   Usage: node tests/browser/verify-search-redesign.cjs [base-url]
   Default base: http://localhost:3799 */

const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:3799';
const SP = '/tmp/gnt-search-redesign-test';
require('fs').mkdirSync(SP, { recursive: true });

const results = [];
function pass(id, msg) { results.push({ id, status: 'PASS', msg }); process.stdout.write('.'); }
function fail(id, msg) { results.push({ id, status: 'FAIL', msg }); process.stdout.write('F'); }

async function withPage(browser, name, fn) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const jsErrors = [];
    page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
    page.on('pageerror', e => jsErrors.push(`[pageerror] ${e.message}`));
    try { await fn(page, jsErrors); }
    catch(e) { fail(name, `throw: ${e.message}`); }
    finally { await ctx.close(); }
}

async function withMobilePage(browser, name, fn) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await ctx.newPage();
    const jsErrors = [];
    page.on('console', m => { if (m.type() === 'error') jsErrors.push(m.text()); });
    page.on('pageerror', e => jsErrors.push(`[pageerror] ${e.message}`));
    try { await fn(page, jsErrors); }
    catch(e) { fail(name, `throw: ${e.message}`); }
    finally { await ctx.close(); }
}

(async () => {
    console.log(`\n検索ページ新デザイン E-12 回帰テスト  BASE=${BASE}\n`);
    const browser = await chromium.launch({ headless: true });

    /* ══════════════════════════════════════════
       L1: 静的構造チェック（DOM存在確認）
       ══════════════════════════════════════════ */

    await withPage(browser, 'L1-1', async (page, jsErrors) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const ids = ['result-panel','state-empty','state-loading','result-header','result-body'];
        for (const id of ids) {
            const el = await page.$(`#${id}`);
            if (!el) { fail('L1-1', `#${id} missing`); return; }
        }
        pass('L1-1', '必須IDがすべて存在');
    });

    await withPage(browser, 'L1-2', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const ids = ['concept-insight','dist-panel','syntax-panel','pattern-explore-section'];
        for (const id of ids) {
            const el = await page.$(`#${id}`);
            if (!el) { fail('L1-2', `#${id} missing`); return; }
        }
        pass('L1-2', 'セカンダリ結果IDが存在');
    });

    await withPage(browser, 'L1-3', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const el = await page.$('#sqs-filter-bar');
        if (!el) { fail('L1-3', '#sqs-filter-bar missing'); return; }
        pass('L1-3', '#sqs-filter-bar が .s-mode-bar 内に存在');
    });

    await withPage(browser, 'L1-4', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        // s-header 内に戻るボタンがある
        const backBtn = await page.$('.s-header .s-btn-back');
        if (!backBtn) { fail('L1-4', '.s-btn-back が .s-header 内に見つからない'); return; }
        pass('L1-4', '戻るボタンが s-header 内に存在');
    });

    await withPage(browser, 'L1-5', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const el = await page.$('#unified-search-input');
        if (!el) { fail('L1-5', '#unified-search-input missing'); return; }
        pass('L1-5', '#unified-search-input が存在');
    });

    await withPage(browser, 'L1-6', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const el = await page.$('#suggest-dropdown');
        if (!el) { fail('L1-6', '#suggest-dropdown missing'); return; }
        pass('L1-6', '#suggest-dropdown が存在');
    });

    await withPage(browser, 'L1-7', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        // --s-accent が CSS に存在するか
        const accent = await page.evaluate(() => {
            return getComputedStyle(document.documentElement).getPropertyValue('--s-accent').trim();
        });
        if (!accent) { fail('L1-7', '--s-accent not found in computed style'); return; }
        pass('L1-7', `--s-accent = "${accent}"`);
    });

    await withPage(browser, 'L1-8', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        // tokens.css の --bg-paper は別変数 (alias) として存在してよいが
        // s-header/s-search-block は --s-bg を使うべき
        const headerBg = await page.evaluate(() => {
            const h = document.querySelector('.s-header');
            return h ? getComputedStyle(h).backgroundColor : null;
        });
        if (!headerBg) { fail('L1-8', '.s-header 要素が見つからない'); return; }
        pass('L1-8', `.s-header 背景色 = "${headerBg}"`);
    });

    /* ══════════════════════════════════════════
       L2: 機能・動作テスト
       ══════════════════════════════════════════ */

    await withPage(browser, 'L2-1', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        // インデックス構築待ち（最大30秒）
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            const h = document.getElementById('result-header');
            return h && h.classList.contains('visible');
        }, { timeout: 10000 });
        const count = await page.$eval('#result-count', el => el.textContent.trim());
        if (!count || count === '0') { fail('L2-1', `result-count = "${count}"`); return; }
        pass('L2-1', `「愛」検索結果: ${count}`);
    });

    await withPage(browser, 'L2-2', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', 'ἀγαπάω');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            const h = document.getElementById('result-header');
            return h && h.classList.contains('visible');
        }, { timeout: 10000 });
        const count = await page.$eval('#result-count', el => el.textContent.trim());
        if (!count) { fail('L2-2', 'result-count empty'); return; }
        pass('L2-2', `「ἀγαπάω」検索結果: ${count}`);
    });

    await withPage(browser, 'L2-3', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', 'G25');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            const h = document.getElementById('result-header');
            return h && h.classList.contains('visible');
        }, { timeout: 10000 });
        const count = await page.$eval('#result-count', el => el.textContent.trim());
        if (!count) { fail('L2-3', 'result-count empty for G25'); return; }
        pass('L2-3', `Strong G25 検索結果: ${count}`);
    });

    await withPage(browser, 'L2-6', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            return document.querySelectorAll('.hit-open-btn-lg').length > 0;
        }, { timeout: 10000 });
        const href = await page.$eval('.hit-open-btn-lg', el => el.getAttribute('href') || '');
        const ok = href.includes('index.html?book=') && href.includes('&ch=');
        if (!ok) { fail('L2-6', `href = "${href}"`); return; }
        pass('L2-6', `「本文で読む」href = "${href.slice(0,50)}"`);
    });

    await withPage(browser, 'L2-7', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const fn = await page.evaluate(() => typeof _searchGoBack);
        if (fn !== 'function') { fail('L2-7', '_searchGoBack not function'); return; }
        pass('L2-7', '_searchGoBack 関数が存在');
    });

    await withPage(browser, 'L2-8', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        // サジェストは日本語クエリのみ動作
        await page.fill('#unified-search-input', '愛');
        await page.waitForFunction(() => {
            const d = document.getElementById('suggest-dropdown');
            return d && d.classList.contains('open');
        }, { timeout: 5000 }).catch(()=>{});
        const isOpen = await page.$eval('#suggest-dropdown', el => el.classList.contains('open'));
        if (!isOpen) { fail('L2-8', '日本語クエリでサジェストドロップダウンが開かない'); return; }
        pass('L2-8', '日本語クエリでサジェストドロップダウンが表示');
    });

    await withPage(browser, 'L2-10', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        // Discovery Lobby のテーマチップをクリック
        const chip = await page.$('.discovery-verse-pill');
        if (!chip) { pass('L2-10', 'Discovery Lobby チップなし（N/A）'); return; }
        await chip.click();
        await page.waitForFunction(() => {
            const h = document.getElementById('result-header');
            return h && h.classList.contains('visible');
        }, { timeout: 8000 });
        pass('L2-10', 'Discovery Lobby チップクリックで検索実行');
    });

    await withPage(browser, 'L2-12', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        // Abbott-Smith モーダル: result-query クリック
        await page.fill('#unified-search-input', 'ἀγαπάω');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            const h = document.getElementById('result-header');
            return h && h.classList.contains('visible');
        }, { timeout: 10000 });
        await page.click('#result-query-label');
        await page.waitForFunction(() => {
            const b = document.getElementById('as-backdrop');
            return b && b.classList.contains('open');
        }, { timeout: 5000 });
        pass('L2-12', 'Abbott-Smith モーダルが開く');
    });

    /* ══════════════════════════════════════════
       L4: ブラウザ / DOM / レイアウト
       ══════════════════════════════════════════ */

    await withPage(browser, 'L4-1', async (page) => {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const rect = await page.$eval('.s-search-block', el => {
            const r = el.getBoundingClientRect();
            return { width: r.width, left: r.left };
        });
        // max-width 720px, centered
        if (rect.width > 740) { fail('L4-1', `s-search-block width=${rect.width} (>720px)`); return; }
        pass('L4-1', `s-search-block width=${Math.round(rect.width)}px (≤720px)`);
    });

    await withPage(browser, 'L4-2', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const pos = await page.$eval('.s-header', el => getComputedStyle(el).position);
        if (pos !== 'sticky') { fail('L4-2', `.s-header position = "${pos}"`); return; }
        pass('L4-2', '.s-header が sticky');
    });

    await withMobilePage(browser, 'L4-3', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const inputW = await page.$eval('#unified-search-input', el => el.getBoundingClientRect().width);
        const vw = 375;
        if (inputW < vw * 0.7) { fail('L4-3', `input width=${Math.round(inputW)} on mobile 375px`); return; }
        pass('L4-3', `モバイル検索入力幅=${Math.round(inputW)}px`);
    });

    await withMobilePage(browser, 'L4-4', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const fab = await page.$('#mobile-fab');
        if (!fab) { pass('L4-4', 'FAB DOM要素なし（廃止確認）'); return; }
        const visible = await fab.isVisible();
        if (visible) { fail('L4-4', 'FAB が表示されている（廃止されていない）'); return; }
        pass('L4-4', 'FAB は表示されない');
    });

    await withMobilePage(browser, 'L4-5', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        const toggle = await page.$('#s-advanced-toggle');
        if (toggle) { fail('L4-5', '詳細オプショントグルが残っている'); return; }
        const filters = page.locator('#search-filters');
        const initiallyHidden = await filters.evaluate(el => getComputedStyle(el).display === 'none');
        if (!initiallyHidden) { fail('L4-5', '空欄時に絞り込み提案が表示されている'); return; }
        await page.fill('#unified-search-input', 'λόγος');
        const single = await filters.evaluate(el => ({
            visible: getComputedStyle(el).display !== 'none',
            mode: el.classList.contains('single-word'),
            morph: getComputedStyle(document.getElementById('morph-sub')).display !== 'none',
            prox: getComputedStyle(document.getElementById('prox-sub')).display !== 'none'
        }));
        if (!single.visible || !single.mode || !single.morph || single.prox) {
            fail('L4-5', `単語1語の絞り込み表示が不正: ${JSON.stringify(single)}`); return;
        }
        await page.fill('#unified-search-input', 'λόγος θεοῦ');
        const multi = await filters.evaluate(el => ({
            visible: getComputedStyle(el).display !== 'none',
            mode: el.classList.contains('multi-word'),
            morph: getComputedStyle(document.getElementById('morph-sub')).display !== 'none',
            prox: getComputedStyle(document.getElementById('prox-sub')).display !== 'none'
        }));
        if (!multi.visible || !multi.mode || multi.morph || !multi.prox) {
            fail('L4-5', `複数語の絞り込み表示が不正: ${JSON.stringify(multi)}`); return;
        }
        pass('L4-5', '空欄は非表示、1語は品詞・語形、複数語は近接距離を提案');
    });

    await withPage(browser, 'L4-7', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0, { timeout: 10000 });
        // 日本語クエリ: カードに data-qtype="japanese" が付与されている
        const qtype = await page.$eval('.hit-card', el => el.dataset.qtype);
        if (qtype !== 'japanese') { fail('L4-7', `data-qtype="${qtype}" (expected "japanese")`); return; }
        // スニペットが折りたたまれている（CSSで非表示）
        const snippetVisible = await page.$eval('.hit-card .hit-snippet', el => {
            const style = getComputedStyle(el);
            return style.display !== 'none';
        });
        if (snippetVisible) { fail('L4-7', '日本語クエリなのにスニペットが表示されている'); return; }
        // トグルボタンが表示されている
        const toggleVisible = await page.$eval('.hit-card .hit-greek-toggle', el => {
            return getComputedStyle(el).display !== 'none';
        });
        if (!toggleVisible) { fail('L4-7', '日本語クエリなのに折りたたみトグルが非表示'); return; }
        pass('L4-7', '日本語クエリ: スニペット折りたたみ・トグル表示');
    });

    await withPage(browser, 'L4-8', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', 'ἀγαπάω');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0, { timeout: 10000 });
        // ギリシャ語クエリ: data-qtype="greek"
        const qtype = await page.$eval('.hit-card', el => el.dataset.qtype);
        if (qtype !== 'greek') { fail('L4-8', `data-qtype="${qtype}" (expected "greek")`); return; }
        // スニペットが展開されている
        const snippetVisible = await page.$eval('.hit-card .hit-snippet', el => {
            return getComputedStyle(el).display !== 'none';
        });
        if (!snippetVisible) { fail('L4-8', 'ギリシャ語クエリなのにスニペットが非表示'); return; }
        pass('L4-8', 'ギリシャ語クエリ: スニペット展開');
    });

    await withPage(browser, 'L4-10', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => {
            const dp = document.getElementById('dist-panel');
            return dp && dp.style.display !== 'none';
        }, { timeout: 15000 });
        pass('L4-10', '書物分布パネルが表示される');
    });

    /* ══════════════════════════════════════════
       L5: 視覚・UX監査
       ══════════════════════════════════════════ */

    await withPage(browser, 'L5-1', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0, { timeout: 10000 });
        // カードに border が付いていないこと（リスト型: border-topのみ）
        const card = await page.$('.hit-card');
        if (!card) { fail('L5-1', '.hit-card not found'); return; }
        const styles = await card.evaluate(el => {
            const cs = getComputedStyle(el);
            return {
                borderLeft: cs.borderLeftWidth,
                borderRight: cs.borderRightWidth,
                boxShadow: cs.boxShadow,
                background: cs.backgroundColor,
            };
        });
        const hasCardBorder = styles.borderLeft !== '0px' || styles.borderRight !== '0px';
        const hasCardShadow = styles.boxShadow && styles.boxShadow !== 'none' && !styles.boxShadow.includes('rgba(0, 0, 0, 0)');
        if (hasCardBorder) { fail('L5-1', `border-left=${styles.borderLeft}, border-right=${styles.borderRight}`); return; }
        if (hasCardShadow) { fail('L5-1', `box-shadow=${styles.boxShadow}`); return; }
        pass('L5-1', 'ヒットカードはカードシャドウ・左右ボーダーなし（リスト型）');
    });

    await withPage(browser, 'L5-4', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-open-btn-lg').length > 0, { timeout: 10000 });
        const bg = await page.$eval('.hit-open-btn-lg', el => getComputedStyle(el).backgroundColor);
        // --s-accent = #2e4d8a → rgb(46, 77, 138)
        if (!bg.includes('46') || !bg.includes('77') || !bg.includes('138')) {
            fail('L5-4', `「本文で読む」background = "${bg}" (expected --s-accent rgb(46,77,138))`); return;
        }
        pass('L5-4', `「本文で読む」background = "${bg}"`);
    });

    await withPage(browser, 'L5-5', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForLoadState('domcontentloaded');
        await page.click('#unified-search-input');
        const borderColor = await page.$eval('#unified-search-input', el => getComputedStyle(el).borderColor);
        // フォーカス時に --s-accent 系の色が付く
        if (!borderColor) { fail('L5-5', 'borderColor empty'); return; }
        pass('L5-5', `入力欄フォーカスボーダー = "${borderColor}"`);
    });

    /* スクリーンショット撮影 */
    await withPage(browser, 'SS-desktop', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.screenshot({ path: `${SP}/01-desktop-lobby.png`, fullPage: false });
        await page.fill('#unified-search-input', '愛');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0, { timeout: 10000 });
        await page.screenshot({ path: `${SP}/02-desktop-jp-results.png`, fullPage: false });
        await page.fill('#unified-search-input', 'ἀγαπάω');
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => document.querySelectorAll('.hit-card').length > 0, { timeout: 10000 });
        await page.screenshot({ path: `${SP}/03-desktop-greek-results.png`, fullPage: false });
        pass('SS-desktop', `スクリーンショット → ${SP}/`);
    });

    await withMobilePage(browser, 'SS-mobile', async (page) => {
        await page.goto(`${BASE}/search-tool.html`);
        await page.waitForFunction(() => typeof IDX !== 'undefined' && IDX.ready, { timeout: 30000 });
        await page.screenshot({ path: `${SP}/04-mobile-lobby.png`, fullPage: false });
        // Query-aware filter suggestions
        await page.fill('#unified-search-input', 'λόγος θεοῦ');
        await page.screenshot({ path: `${SP}/05-mobile-multiword-filters.png`, fullPage: false });
        pass('SS-mobile', 'モバイルスクリーンショット完了');
    });

    await browser.close();

    /* ── Summary ── */
    console.log('\n\n═══════════════════════════ E-12 Results ═══════════════════════════');
    let passCount = 0, failCount = 0;
    results.forEach(r => {
        const mark = r.status === 'PASS' ? '✓' : '✗';
        if (r.status === 'PASS') passCount++; else failCount++;
        console.log(`${mark} [${r.id}] ${r.msg}`);
    });
    console.log(`\n  PASS: ${passCount}  FAIL: ${failCount}  TOTAL: ${results.length}`);
    if (failCount > 0) {
        console.log('\n  スクリーンショット:', SP);
        process.exit(1);
    } else {
        console.log('\n  スクリーンショット:', SP);
        process.exit(0);
    }
})();
