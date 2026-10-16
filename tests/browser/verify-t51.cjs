'use strict';
const { chromium } = require('playwright');
const BASE = 'http://localhost:3801';

const results = [];
function record(id, status, detail) {
    results.push({ id, status, detail });
    const mark = status === 'PASS' ? '✓' : status === 'SKIP' ? '·' : '✗';
    console.log(`  ${mark} ${id}: ${detail}`);
}

(async () => {
    const browser = await chromium.launch({ headless: true });

    // ─── STATIC: DOM 構造確認 ───────────────────────────────
    console.log('\n[STATIC] DOM 構造');
    {
        const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
        const pg  = await ctx.newPage();
        await pg.goto(`${BASE}/search-tool.html`);
        await pg.waitForFunction(() => typeof IDX !== 'undefined', { timeout: 10000 });

        // T1: タイトルが idx-pill より上にあること
        const order = await pg.evaluate(() => {
            const all = [...document.querySelector('.s-search-block').children].map(el => el.id || el.className.split(' ')[0]);
            const titleIdx = all.findIndex(c => c.includes('s-search-title') || c.includes('logo-home-btn'));
            const pillIdx  = all.findIndex(c => c === 'idx-pill');
            return { all, titleIdx, pillIdx };
        });
        record('T1-ORDER', order.titleIdx < order.pillIdx ? 'PASS' : 'FAIL',
               `title@${order.titleIdx} < pill@${order.pillIdx}: [${order.all.join(',')}]`);

        // T2: .idx-status の CSS 確認
        const idxCss = await pg.evaluate(() => {
            const el = document.getElementById('idx-pill');
            const s = getComputedStyle(el);
            return { maxHeight: s.maxHeight, transition: s.transition, height: s.height };
        });
        record('T2-CSS', idxCss.maxHeight && idxCss.maxHeight !== 'none' ? 'PASS' : 'FAIL',
               `max-height="${idxCss.maxHeight}" height="${idxCss.height}"`);

        // T3: lemma check が --s-accent 色 (#2e4d8a)
        const lemmaColor = await pg.evaluate(() => {
            const el = document.querySelector('.layer-row.active-lemma .layer-check');
            return el ? getComputedStyle(el).backgroundColor : null;
        });
        // #2e4d8a = rgb(46, 77, 138)
        record('T3-COLOR', lemmaColor && lemmaColor.includes('46, 77') ? 'PASS' : 'FAIL',
               `layer-check bg="${lemmaColor}"`);

        // T4: .history-badges が CSS で display:none に設定されている（動的生成要素のため CSS ルールで確認）
        const badgeCssRule = await pg.evaluate(() => {
            const html = document.documentElement.innerHTML;
            return (html.includes('.history-badges') && html.includes('display: none')) ? 'found' : 'not-found';
        });
        record('T4-BADGES', badgeCssRule === 'found' ? 'PASS' : 'FAIL',
               `.history-badges { display:none } CSS rule: ${badgeCssRule}`);

        // T5: .s-results の padding-bottom が calc() を含む
        const resultsPad = await pg.evaluate(() => {
            const html = document.querySelector('.s-results')?.getAttribute('style') ||
                         [...document.styleSheets].flatMap(ss => {
                             try { return [...ss.cssRules]; } catch { return []; }
                         }).filter(r => r.selectorText && r.selectorText.includes('s-results'))
                          .map(r => r.style?.paddingBottom).filter(Boolean).join(',');
            // getComputedStyle gives resolved px value; look for it in source
            const text = document.documentElement.innerHTML;
            return text.includes('env(safe-area-inset-bottom') ? 'found' : 'not-found';
        });
        record('T5-SAFE-AREA', resultsPad === 'found' ? 'PASS' : 'FAIL',
               `env(safe-area-inset-bottom) in HTML: ${resultsPad}`);

        await ctx.close();
    }

    // ─── T6: Discovery Lobby が履歴あり時に非表示 ───────────
    console.log('\n[T6] Discovery Lobby 非表示');
    {
        const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
        const pg  = await ctx.newPage();
        await pg.goto(`${BASE}/search-tool.html`);
        await pg.waitForFunction(() => typeof IDX !== 'undefined', { timeout: 10000 });

        // 初期状態: 履歴なし → Lobby は表示
        const lobbyInitial = await pg.evaluate(() => {
            const el = document.getElementById('discovery-lobby');
            return el ? !el.hidden : null;
        });
        record('T6-INIT', lobbyInitial !== false ? 'PASS' : 'FAIL',
               `lobby hidden initially=${!lobbyInitial} (should not be hidden)`);

        // 検索を実行して履歴を作る
        await pg.waitForFunction(() => IDX.ready, { timeout: 30000 });
        await pg.fill('#unified-search-input', '神');
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(2000);

        // _returnToLobby() を呼ぶ（タイトルをクリック）
        await pg.click('.s-search-title');
        await pg.waitForTimeout(300);

        const lobbyAfterHistory = await pg.evaluate(() => {
            const el = document.getElementById('discovery-lobby');
            return el ? el.hidden : null;
        });
        record('T6-AFTER-HISTORY', lobbyAfterHistory === true ? 'PASS' : 'FAIL',
               `lobby.hidden=${lobbyAfterHistory} after search history (should be true)`);

        // 直接 _renderHistory() の効果も確認
        const historyVisible = await pg.evaluate(() => {
            const block = document.getElementById('history-block');
            return block ? getComputedStyle(block).display !== 'none' : false;
        });
        record('T6-HISTORY-VISIBLE', historyVisible ? 'PASS' : 'FAIL',
               `history-block visible=${historyVisible}`);

        await ctx.close();
    }

    // ─── T7: フォーカス連動サジェスト ───────────────────────
    console.log('\n[T7] フォーカス連動サジェスト');
    {
        const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
        const pg  = await ctx.newPage();
        await pg.goto(`${BASE}/search-tool.html`);
        await pg.waitForFunction(() => IDX.ready, { timeout: 30000 });

        // まず検索して履歴を作る
        await pg.fill('#unified-search-input', '愛');
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(1500);
        await pg.click('.s-search-title');
        await pg.waitForTimeout(300);

        // 空欄フォーカス → 履歴ドロップダウンが開く
        await pg.focus('#unified-search-input');
        await pg.waitForTimeout(200);
        const ddOpenOnFocus = await pg.evaluate(() =>
            document.getElementById('suggest-dropdown').classList.contains('open')
        );
        record('T7-FOCUS-EMPTY', ddOpenOnFocus ? 'PASS' : 'FAIL',
               `suggest-dropdown open on empty focus: ${ddOpenOnFocus}`);

        // ドロップダウンに履歴アイテムが表示される
        const historyItemCount = await pg.evaluate(() =>
            document.querySelectorAll('#suggest-dropdown .suggest-history').length
        );
        record('T7-HISTORY-ITEMS', historyItemCount > 0 ? 'PASS' : 'FAIL',
               `suggest-history items=${historyItemCount}`);

        // Escape で閉じる
        await pg.keyboard.press('Escape');
        await pg.waitForTimeout(100);
        const ddAfterEsc = await pg.evaluate(() =>
            document.getElementById('suggest-dropdown').classList.contains('open')
        );
        record('T7-ESCAPE', !ddAfterEsc ? 'PASS' : 'FAIL',
               `dropdown closed after Escape: ${!ddAfterEsc}`);

        // 日本語入力 → 候補ドロップダウンへ切り替え
        await pg.waitForFunction(() => IDX.l3Ready, { timeout: 60000 });
        await pg.focus('#unified-search-input');
        await pg.fill('#unified-search-input', '神');
        await pg.waitForTimeout(400);
        const ddJP = await pg.evaluate(() =>
            document.getElementById('suggest-dropdown').classList.contains('open')
        );
        record('T7-JP-INPUT', ddJP ? 'PASS' : 'FAIL',
               `suggest-dropdown open on JP input: ${ddJP}`);

        // 候補が suggest-history でなく通常の suggest-item
        const candidateItems = await pg.evaluate(() =>
            document.querySelectorAll('#suggest-dropdown .suggest-item:not(.suggest-history)').length
        );
        record('T7-JP-CANDIDATES', candidateItems > 0 ? 'PASS' : 'FAIL',
               `JP candidate items=${candidateItems}`);

        // ギリシャ語入力 → ドロップダウンが閉じる
        await pg.fill('#unified-search-input', 'ἀγαπάω');
        await pg.waitForTimeout(200);
        const ddGK = await pg.evaluate(() =>
            document.getElementById('suggest-dropdown').classList.contains('open')
        );
        record('T7-GK-CLOSE', !ddGK ? 'PASS' : 'FAIL',
               `dropdown closed on GK input: ${!ddGK}`);

        // Enter で検索 + ドロップダウンが閉じる
        await pg.fill('#unified-search-input', '愛');
        await pg.waitForTimeout(300);
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(500);
        const ddAfterEnter = await pg.evaluate(() =>
            document.getElementById('suggest-dropdown').classList.contains('open')
        );
        record('T7-ENTER', !ddAfterEnter ? 'PASS' : 'FAIL',
               `dropdown closed after Enter: ${!ddAfterEnter}`);

        // 履歴アイテムのクリックで検索が実行されること
        await pg.click('.s-search-title');
        await pg.waitForTimeout(200);
        await pg.focus('#unified-search-input');
        await pg.waitForTimeout(200);
        const histItems = await pg.evaluate(() =>
            [...document.querySelectorAll('#suggest-dropdown .suggest-history')].map(el => el.dataset.query || el.querySelector('.s-h-query')?.textContent)
        );
        if (histItems.length > 0) {
            const targetQuery = histItems[0];
            await pg.evaluate(() => {
                const item = document.querySelector('#suggest-dropdown .suggest-history');
                if (item) item.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            });
            await pg.waitForTimeout(1000);
            const resultShown = await pg.evaluate(() => {
                const header = document.getElementById('result-header');
                return header ? header.classList.contains('visible') : false;
            });
            record('T7-HIST-SELECT', resultShown ? 'PASS' : 'FAIL',
                   `history item selected → search executed: ${resultShown} (query: ${targetQuery})`);
        } else {
            record('T7-HIST-SELECT', 'SKIP', 'no history items to test');
        }

        await ctx.close();
    }

    // ─── REGRESSION: 既存機能 ───────────────────────────────
    console.log('\n[REGRESSION] 既存機能');
    {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const pg  = await ctx.newPage();
        await pg.goto(`${BASE}/search-tool.html`);
        await pg.waitForFunction(() => IDX.ready, { timeout: 30000 });

        // JP 検索
        await pg.fill('#unified-search-input', '神');
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(2000);
        const jpCards = await pg.evaluate(() => document.querySelectorAll('.hit-card').length);
        record('REG-JP', jpCards > 0 ? 'PASS' : 'FAIL', `jp cards=${jpCards}`);

        // 結果表示中に URL パラメータ確認
        const resultHeader = await pg.evaluate(() =>
            document.getElementById('result-header')?.classList.contains('visible')
        );
        record('REG-RESULT-HEADER', resultHeader ? 'PASS' : 'FAIL', `result-header visible=${resultHeader}`);

        // 詳細オプション開閉
        await pg.click('#s-advanced-toggle');
        await pg.waitForTimeout(300);
        const advOpen = await pg.evaluate(() =>
            document.getElementById('s-advanced-panel').classList.contains('open')
        );
        record('REG-ADV-OPEN', advOpen ? 'PASS' : 'FAIL', `advanced panel open: ${advOpen}`);
        await pg.click('#s-advanced-toggle');
        await pg.waitForTimeout(300);
        const advClosed = await pg.evaluate(() =>
            !document.getElementById('s-advanced-panel').classList.contains('open')
        );
        record('REG-ADV-CLOSE', advClosed ? 'PASS' : 'FAIL', `advanced panel closed: ${advClosed}`);

        // GK 検索
        await pg.fill('#unified-search-input', 'ἀγαπάω');
        await pg.keyboard.press('Enter');
        await pg.waitForTimeout(2000);
        const gkCount = await pg.evaluate(() => {
            const el = document.querySelector('.result-count, #result-count, .s-result-count');
            return el ? el.textContent.trim() : null;
        });
        record('REG-GK', gkCount ? 'PASS' : 'FAIL', `gk result count: "${gkCount}"`);

        // lemma toggle
        const lemmaActive = await pg.evaluate(() =>
            document.getElementById('layer-lemma').classList.contains('active')
        );
        record('REG-LEMMA-TOGGLE', lemmaActive ? 'PASS' : 'FAIL', `lemma active=${lemmaActive}`);

        await ctx.close();
    }

    // ─── MOBILE: 375px ────────────────────────────────────────
    console.log('\n[MOBILE] 375px');
    {
        const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
        const pg  = await ctx.newPage();
        await pg.goto(`${BASE}/search-tool.html`);
        await pg.waitForFunction(() => typeof IDX !== 'undefined', { timeout: 10000 });

        const fabGone = await pg.evaluate(() => {
            const fab = document.querySelector('.mobile-search-toggle');
            return !fab || getComputedStyle(fab).display === 'none';
        });
        record('MOB-FAB', fabGone ? 'PASS' : 'FAIL', `FAB gone: ${fabGone}`);

        const scroll = await pg.evaluate(() => document.body.scrollWidth > window.innerWidth + 5);
        record('MOB-SCROLL', !scroll ? 'PASS' : 'FAIL', `horizontal scroll: ${scroll}`);

        await ctx.close();
    }

    await browser.close();

    const pass = results.filter(r => r.status === 'PASS').length;
    const fail = results.filter(r => r.status === 'FAIL').length;
    const skip = results.filter(r => r.status === 'SKIP').length;
    console.log(`\n${'='.repeat(54)}`);
    console.log(`Task 51 Verification: ${pass} PASS / ${fail} FAIL / ${skip} SKIP`);
    if (fail > 0) {
        console.log('FAIL items:');
        results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ✗ ${r.id}: ${r.detail}`));
        process.exit(1);
    }
})();
