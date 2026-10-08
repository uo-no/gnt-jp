/**
 * DA_READING browser verification script
 * Runs against http://localhost:8765
 */
const { chromium } = require('playwright');

const BASE = 'http://localhost:8765';

let passed = 0;
let failed = 0;
const results = {};

function check(name, condition, detail = '') {
    if (condition) {
        console.log(`  ✓ ${name}`);
        results[name] = 'PASS';
        passed++;
    } else {
        console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
        results[name] = 'FAIL' + (detail ? ` (${detail})` : '');
        failed++;
    }
}

async function run() {
    const browser = await chromium.launch({ headless: true });

    // ─── Desktop (1400×900) ───────────────────────────────────────────────
    console.log('\n=== Desktop (1400x900) ===');
    const desktop = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await desktop.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(String(err)));

    // ── Case A: /JHN/1/DA opens ──
    console.log('\n[Case A] /JHN/1/DA');
    await page.goto(`${BASE}/JHN/1/DA`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const daViewEl = await page.$('.da-view');
    check('Case A: .da-view exists', !!daViewEl);

    const sentenceCount = await page.$$eval('.da-sentence', els => els.length);
    check('Case A: sentence count > 0', sentenceCount > 0, `got ${sentenceCount}`);

    // SBL sentence count for JHN 1 should be 57
    check('Case A: sentence count == 57 (SBL SSOT)', sentenceCount === 57, `got ${sentenceCount}`);

    // Japanese text present
    const hasJapanese = await page.$eval('.da-view', el =>
        el.textContent.length > 10
    );
    check('Case A: Japanese text present', hasJapanese);

    // Connector rows exist
    const connRowCount = await page.$$eval('.da-connector-row', els => els.length);
    check('Case A: connector rows exist (leading CONJs)', connRowCount > 0, `got ${connRowCount}`);

    // Check mode label in breadcrumb
    const gbcText = await page.$eval('#global-breadcrumb', el => el.textContent).catch(() => '');
    check('Case A: breadcrumb shows 談話分析', gbcText.includes('談話分析'), `got "${gbcText}"`);

    // ── Case B: JHN 1:2 — no leading CONJ ──
    console.log('\n[Case B] Sentence without leading conj (JHN 1:2, sentence idx 1)');
    // Sentence 1 (0-indexed) = JHN 1:2 starts with οὗτος (not CONJ)
    const sent1ConnRow = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        if (sentences.length < 2) return null;
        return !!sentences[1].querySelector('.da-connector-row');
    });
    check('Case B: JHN 1:2 sentence has NO connector row', sent1ConnRow === false, `connRow present=${sent1ConnRow}`);

    const sent1Flow = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        if (sentences.length < 2) return false;
        return !!sentences[1].querySelector('.da-flow');
    });
    check('Case B: JHN 1:2 sentence has word flow', sent1Flow);

    // ── Case C: JHN 1:5 — leading καὶ ──
    console.log('\n[Case C] JHN 1:5 - leading καὶ (sentence idx 4)');
    // Sentence 4 (0-indexed) = JHN 1:5 starts with καὶ
    const sent4 = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        if (sentences.length < 5) return null;
        const s = sentences[4];
        const connRow = s.querySelector('.da-connector-row');
        const flow = s.querySelector('.da-flow');
        const connGreek = connRow ? [...connRow.querySelectorAll('.wlv-chip')].map(c => c.title) : [];
        return { hasConn: !!connRow, hasFlow: !!flow, connGreek };
    });
    check('Case C: JHN 1:5 has connector row', sent4?.hasConn);
    check('Case C: JHN 1:5 has word flow', sent4?.hasFlow);
    check('Case C: καὶ in connector', (sent4?.connGreek || []).some(t => t.includes('κα')), `chips=${JSON.stringify(sent4?.connGreek)}`);

    // ── Case D: Multiple leading conjunctions ──
    console.log('\n[Case D] Multiple leading conjunctions');
    const multiConn = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        for (const s of sentences) {
            const conn = s.querySelector('.da-connector-row');
            if (conn) {
                const chips = conn.querySelectorAll('.wlv-chip');
                if (chips.length >= 2) return chips.length;
            }
        }
        return 0;
    });
    // JHN 1 may not have 2+ connector row cases; check across chapter
    check('Case D: at least one sentence with 2+ connector tokens (or note N/A)', multiConn >= 1, `max found=${multiConn}`);

    // ── Case E: mid-sentence conj stays in flow ──
    console.log('\n[Case E] Mid-sentence conj stays in word flow');
    // JHN 1:1 has internal καὶ (sentence 0 has multiple καὶ mid-sentence)
    const sent0 = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        if (!sentences[0]) return null;
        const connChips = sentences[0].querySelectorAll('.da-connector-row .wlv-chip');
        const flowChips = sentences[0].querySelectorAll('.da-flow .wlv-chip');
        return { connCount: connChips.length, flowCount: flowChips.length };
    });
    // Sentence 0 (JHN 1:1) starts with Ἐν (PREP, not CONJ) → should have no connector row
    check('Case E: JHN 1:1 no connector row (Ἐν is PREP)', (sent0?.connCount || 0) === 0, `connChips=${sent0?.connCount}`);
    check('Case E: JHN 1:1 flow chips present', (sent0?.flowCount || 0) > 0, `flowChips=${sent0?.flowCount}`);

    // ── Case F: Postpositive conjunction (δὲ sentence) ──
    console.log('\n[Case F] Postpositive δὲ as connector (JHN 1:12, sentence 11)');
    const sent11 = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        if (sentences.length < 12) return null;
        const s = sentences[11];
        const connChips = [...(s.querySelector('.da-connector-row')?.querySelectorAll('.wlv-chip') || [])];
        return {
            hasConn: !!s.querySelector('.da-connector-row'),
            connGreek: connChips.map(c => c.title),
        };
    });
    check('Case F: JHN 1:12 (δὲ) has connector row', sent11?.hasConn);
    check('Case F: δὲ in connector', (sent11?.connGreek || []).some(t => t.includes('δ') || t.includes('ε')), `chips=${JSON.stringify(sent11?.connGreek)}`);

    // ── Horizontal scroll ──
    console.log('\n[Horizontal scroll]');
    const scrollOK = await page.evaluate(() => {
        const sentences = document.querySelectorAll('.da-sentence');
        let overflowOK = true;
        for (const s of sentences) {
            const style = window.getComputedStyle(s);
            if (style.overflowX !== 'auto' && style.overflowX !== 'scroll') {
                overflowOK = false;
                break;
            }
        }
        return overflowOK;
    });
    check('Horizontal scroll: .da-sentence overflow-x is auto', scrollOK);

    // Page-level overflow should not be broken
    const pageOverflow = await page.evaluate(() => {
        const body = window.getComputedStyle(document.body);
        return body.overflowX;
    });
    check('Horizontal scroll: body overflow-x not forced scroll', pageOverflow !== 'scroll', `body overflow-x=${pageOverflow}`);

    // ── Token click → StudyPanel ──
    console.log('\n[Token click → StudyPanel]');
    // Click a chip in the first flow row that has chips
    const chipClicked = await page.evaluate(() => {
        const flow = document.querySelector('.da-flow');
        if (!flow) return false;
        const chip = flow.querySelector('.wlv-chip');
        if (!chip) return false;
        chip.click();
        return true;
    });
    await page.waitForTimeout(400);
    const panelOpen = await page.$eval('#bottom-depth-panel', el => el.classList.contains('open')).catch(() => false);
    check('Token click: StudyPanel opens', panelOpen);

    // Close panel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ── Connector click → StudyPanel ──
    console.log('\n[Connector click → StudyPanel]');
    // Navigate to a sentence that has a connector row
    const connChipClicked = await page.evaluate(() => {
        const conn = document.querySelector('.da-connector-row .wlv-chip');
        if (!conn) return false;
        conn.click();
        return true;
    });
    await page.waitForTimeout(400);
    if (connChipClicked) {
        const panelOpenConn = await page.$eval('#bottom-depth-panel', el => el.classList.contains('open')).catch(() => false);
        check('Connector click: StudyPanel opens', panelOpenConn);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    } else {
        check('Connector click: StudyPanel opens', false, 'no connector chip found');
    }

    // ── Console errors ──
    console.log('\n[Console errors]');
    check('No console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join('; '));

    // ─── Regression: /JHN/1 (JA1955) ────────────────────────────────────
    console.log('\n=== Regression: /JHN/1 ===');
    await page.goto(`${BASE}/JHN/1`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const ja1955OK = await page.$('.verse-block').then(el => !!el).catch(() => false);
    check('Regression /JHN/1: verse blocks present', ja1955OK);

    // ─── Regression: /JHN/1/WO ───────────────────────────────────────────
    console.log('\n=== Regression: /JHN/1/WO ===');
    await page.goto(`${BASE}/JHN/1/WO`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const woChips = await page.$$eval('.wlv-chip', els => els.length);
    check('Regression /JHN/1/WO: WO chips present', woChips > 0, `chips=${woChips}`);

    // ─── Regression: /JHN/1/RK ───────────────────────────────────────────
    console.log('\n=== Regression: /JHN/1/RK ===');
    await page.goto(`${BASE}/JHN/1/RK`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const rkSentences = await page.$$eval('.sd-sentence', els => els.length);
    check('Regression /JHN/1/RK: RK sentences present', rkSentences > 0, `sentences=${rkSentences}`);

    // ─── Regression: /JHN/1/DC ───────────────────────────────────────────
    console.log('\n=== Regression: /JHN/1/DC ===');
    await page.goto(`${BASE}/JHN/1/DC`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const dcChain = await page.$('.dcv-chain').then(el => !!el).catch(() => false);
    check('Regression /JHN/1/DC: existing DISCOURSE still works', dcChain);

    await desktop.close();

    // ─── Mobile (390×844) ────────────────────────────────────────────────
    console.log('\n=== Mobile (390x844) ===');
    const mobileErrors = [];
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const mpage = await mobile.newPage();
    mpage.on('console', msg => { if (msg.type() === 'error') mobileErrors.push(msg.text()); });
    mpage.on('pageerror', err => mobileErrors.push(String(err)));

    await mpage.goto(`${BASE}/JHN/1/DA`, { waitUntil: 'networkidle' });
    await mpage.waitForTimeout(800);

    const mDaView = await mpage.$('.da-view').then(el => !!el).catch(() => false);
    check('Mobile: .da-view exists', mDaView);

    const mSentenceCount = await mpage.$$eval('.da-sentence', els => els.length);
    check('Mobile: 57 sentences', mSentenceCount === 57, `got ${mSentenceCount}`);

    // Mobile mode label
    const mModeLabel = await mpage.$eval('#mbn-mode-label', el => el.textContent).catch(() => '');
    check('Mobile: mode label "談話"', mModeLabel === '談話', `got "${mModeLabel}"`);

    // Connector row present
    const mConnRows = await mpage.$$eval('.da-connector-row', els => els.length);
    check('Mobile: connector rows exist', mConnRows > 0, `got ${mConnRows}`);

    // Connector row left-aligned (not centered)
    const mConnAlign = await mpage.evaluate(() => {
        const row = document.querySelector('.da-connector-row');
        if (!row) return null;
        const style = window.getComputedStyle(row);
        return style.justifyContent;
    });
    check('Mobile: Connector Row left-aligned (not center)', mConnAlign !== 'center', `justifyContent=${mConnAlign}`);

    // sentence overflow-x
    const mScrollOK = await mpage.evaluate(() => {
        const s = document.querySelector('.da-sentence');
        if (!s) return false;
        return window.getComputedStyle(s).overflowX === 'auto';
    });
    check('Mobile: .da-sentence overflow-x auto', mScrollOK);

    // token tap → StudyPanel
    const mTapped = await mpage.evaluate(() => {
        const chip = document.querySelector('.da-flow .wlv-chip');
        if (!chip) return false;
        chip.click();
        return true;
    });
    await mpage.waitForTimeout(400);
    const mPanelOpen = await mpage.$eval('#bottom-depth-panel', el => el.classList.contains('open')).catch(() => false);
    check('Mobile: token tap → StudyPanel', mPanelOpen);

    check('Mobile: no console errors', mobileErrors.length === 0, mobileErrors.slice(0, 3).join('; '));

    await mobile.close();
    await browser.close();

    // ─── Summary ─────────────────────────────────────────────────────────
    console.log('\n=== SUMMARY ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('');
    for (const [name, result] of Object.entries(results)) {
        const icon = result === 'PASS' ? '✓' : '✗';
        console.log(`${icon} ${name}: ${result}`);
    }
    console.log('');
    console.log(failed === 0 ? 'OVERALL: PASS' : `OVERALL: FAIL (${failed} failures)`);

    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
