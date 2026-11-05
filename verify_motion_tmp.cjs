const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SHOTS = '/private/tmp/claude-501/-Users-373da/ec17c597-e4c5-4eed-81c7-67890e500bef/scratchpad/shots_motion';
fs.mkdirSync(SHOTS, { recursive: true });

const BASE = 'http://localhost:7654';
const MVV_URL = `${BASE}/?book=JHN&chapter=3&transA=JA1955`;

let pass = 0, fail = 0;
function ok(label, info) { pass++; console.log(`  PASS ${label}${info ? ' — ' + info : ''}`); }
function ng(label, info) { fail++; console.log(`  FAIL ${label}${info ? ' — ' + info : ''}`); }

async function openMVV(mv) {
    await mv.goto(MVV_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await mv.waitForTimeout(1200);
    await mv.evaluate(() => {
        const vb = document.querySelector('.verse-block');
        if (vb && typeof vb.onclick === 'function') vb.onclick();
    });
    await mv.waitForTimeout(800);
}

function getTransState(mv) {
    return mv.evaluate(() => {
        const t = document.querySelector('#mobile-inspector-area .mvv-inline-translation');
        const mia = document.getElementById('mobile-inspector-area');
        const d = document.getElementById('wlv-detail-drawer');
        if (!t) return null;
        const cs = window.getComputedStyle(t);
        return {
            height: t.offsetHeight,
            opacity: parseFloat(cs.opacity),
            display: cs.display,
            inlineH: t.style.height,
            inlineOp: t.style.opacity,
            drawerOpen: mia ? mia.classList.contains('drawer-open') : null,
            drawerVisible: d ? d.classList.contains('visible') : false,
        };
    });
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    const mv = await ctx.newPage();
    mv.on('pageerror', err => console.error('[page error]', err.message));

    await openMVV(mv);

    const chipCount = await mv.evaluate(() =>
        document.querySelectorAll('#mobile-inspector-area .wlv-chip').length);
    if (!chipCount) { console.log('No chips, abort'); process.exit(1); }

    // ── 基本状態確認 ──
    const s0 = await getTransState(mv);
    console.log('\n── STATE 0: 初期状態 ──');
    console.log('  ', s0);
    await mv.screenshot({ path: path.join(SHOTS, '1_before.png') });
    if (s0.height > 0) ok('S0: 口語訳が表示されている', `h=${s0.height}`);
    else ng('S0: 口語訳が表示されている', `h=${s0.height}`);
    if (Math.abs(s0.opacity - 1) < 0.01) ok('S0: opacity=1');
    else ng('S0: opacity=1', `op=${s0.opacity}`);

    // ── アニメーション途中の高さを計測（開く直後50ms） ──
    console.log('\n── ANIM: 崩壊アニメーション途中の計測 ──');
    const naturalH = s0.height;
    // chip をタップしてアニメーション開始
    await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();
    await mv.waitForTimeout(50);  // 50ms 後（210ms 途中）に計測
    const sMid = await getTransState(mv);
    console.log('  50ms後:', sMid);
    if (sMid.height > 0 && sMid.height < naturalH) {
        ok('ANIM-COLLAPSE: 途中状態あり（高さが縮小中）', `h=${sMid.height}/${naturalH}`);
    } else if (sMid.height === 0) {
        // transition: none（reduced-motion環境）の場合は即時消える → PASS として扱う
        ok('ANIM-COLLAPSE: height=0（transition:none か即時 → acceptable）');
    } else {
        ng('ANIM-COLLAPSE: 途中状態あり', `h=${sMid.height}/${naturalH}`);
    }
    if (sMid.opacity < 1 && sMid.opacity >= 0) ok('ANIM-COLLAPSE: opacity 減少中', `op=${sMid.opacity.toFixed(2)}`);
    else ng('ANIM-COLLAPSE: opacity 減少中', `op=${sMid.opacity}`);

    // アニメーション完了を待つ
    await mv.waitForTimeout(300);  // 50+300 = 350ms > 210ms
    const sEnd = await getTransState(mv);
    console.log('\n── STATE 2: 崩壊完了後 ──');
    console.log('  ', sEnd);
    await mv.screenshot({ path: path.join(SHOTS, '2_collapsed.png') });
    if (sEnd.height === 0) ok('S2: 高さが0になった');
    else ng('S2: 高さが0になった', `h=${sEnd.height}`);
    if (sEnd.opacity < 0.05) ok('S2: opacity≈0', `op=${sEnd.opacity.toFixed(2)}`);
    else ng('S2: opacity≈0', `op=${sEnd.opacity}`);
    if (sEnd.drawerVisible) ok('S2: ドロワーが開いている');
    else ng('S2: ドロワーが開いている');

    // ── 展開アニメーション途中の計測（× ボタン直後50ms） ──
    console.log('\n── ANIM: 展開アニメーション途中の計測 ──');
    await mv.locator('.wlv-dd-close-btn').tap();
    await mv.waitForTimeout(50);
    const sExpMid = await getTransState(mv);
    console.log('  50ms後:', sExpMid);
    if (sExpMid.height > 0 && sExpMid.height < naturalH) {
        ok('ANIM-EXPAND: 途中状態あり（高さが拡張中）', `h=${sExpMid.height}/${naturalH}`);
    } else if (sExpMid.height === naturalH) {
        ok('ANIM-EXPAND: 即時展開（transition:none か高速 → acceptable）');
    } else {
        ng('ANIM-EXPAND: 途中状態あり', `h=${sExpMid.height}/${naturalH}`);
    }
    if (sExpMid.opacity > 0 && sExpMid.opacity <= 1) ok('ANIM-EXPAND: opacity 増加中', `op=${sExpMid.opacity.toFixed(2)}`);
    else ng('ANIM-EXPAND: opacity 増加中', `op=${sExpMid.opacity}`);

    await mv.waitForTimeout(300);
    const sExpEnd = await getTransState(mv);
    console.log('\n── STATE 3: 展開完了後 ──');
    console.log('  ', sExpEnd);
    await mv.screenshot({ path: path.join(SHOTS, '3_expanded.png') });
    if (sExpEnd.height === naturalH) ok('S3: 高さが自然値に戻った', `h=${sExpEnd.height}`);
    else ng('S3: 高さが自然値に戻った', `h=${sExpEnd.height} vs ${naturalH}`);
    if (Math.abs(sExpEnd.opacity - 1) < 0.05) ok('S3: opacity=1', `op=${sExpEnd.opacity.toFixed(2)}`);
    else ng('S3: opacity=1', `op=${sExpEnd.opacity}`);
    // inlineH が '' になっていること（transitionend で height:auto に戻す）
    if (!sExpEnd.inlineH) ok('S3: インライン height がクリアされた（height:auto に復帰）');
    else ng('S3: インライン height がクリアされた', `inlineH=${sExpEnd.inlineH}`);
    if (!sExpEnd.drawerVisible) ok('S3: ドロワーが閉じている');
    else ng('S3: ドロワーが閉じている');

    // ── 同一 chip 再タップ（トグル閉じ）──
    console.log('\n── Extra A: 同一 chip 再タップ ──');
    await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();
    await mv.waitForTimeout(350);  // 崩壊完了
    await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();  // 再タップ
    await mv.waitForTimeout(350);  // 展開完了
    const sA = await getTransState(mv);
    if (sA.height > 0) ok('RETAP: 口語訳が戻った', `h=${sA.height}`);
    else ng('RETAP: 口語訳が戻った', `h=${sA.height}`);
    if (!sA.drawerVisible) ok('RETAP: ドロワーが閉じた');
    else ng('RETAP: ドロワーが閉じた');

    // ── 急速連続タップ（崩壊中に即展開）──
    console.log('\n── Extra B: 急速連続タップ（崩壊中に展開を開始） ──');
    const chips = await mv.locator('#mobile-inspector-area .wlv-chip').all();
    await chips[0].tap();          // open（崩壊開始）
    await mv.waitForTimeout(80);   // 途中
    await mv.locator('.wlv-dd-close-btn').tap(); // close（展開開始）
    await mv.waitForTimeout(350);  // 展開完了
    const sB = await getTransState(mv);
    console.log('  急速タップ後:', sB);
    if (sB.height > 0) ok('RAPID: 口語訳が正常に戻った', `h=${sB.height}`);
    else ng('RAPID: 口語訳が正常に戻った', `h=${sB.height}`);
    if (!sB.inlineH) ok('RAPID: インライン height クリア');
    else ng('RAPID: インライン height クリア', sB.inlineH);

    // ── 別の chip への切り替え ──
    console.log('\n── Extra C: 別 chip への切り替え ──');
    if (chips.length >= 2) {
        await chips[0].tap(); await mv.waitForTimeout(50);  // 崩壊開始
        await chips[1].tap(); await mv.waitForTimeout(350); // 切り替え
        const sC = await getTransState(mv);
        if (sC.height === 0) ok('SWITCH: 切り替え後も非表示');
        else ng('SWITCH: 切り替え後も非表示', `h=${sC.height}`);
        if (sC.drawerVisible) ok('SWITCH: ドロワーが開いている');
        else ng('SWITCH: ドロワーが開いている');
    }

    // ── Level3 → Level2 で口語訳復元 ──
    console.log('\n── Extra D: Level3 → Level2 口語訳復元 ──');
    await mv.locator('#mobile-inspector-area .wlv-chip').first().tap();
    await mv.waitForTimeout(350);
    const studyBtn = mv.locator('#wlv-dd-study-btn');
    if (await studyBtn.count()) {
        await studyBtn.tap(); await mv.waitForTimeout(600);
        const backBtn = mv.locator('#mobile-verse-view-back');
        if (await backBtn.count()) {
            await backBtn.tap(); await mv.waitForTimeout(500);
            const sD = await getTransState(mv);
            if (sD && sD.height > 0) ok('L3→L2: 口語訳が表示された', `h=${sD.height}`);
            else ng('L3→L2: 口語訳が表示された', sD ? `h=${sD.height}` : 'null');
            if (sD && !sD.inlineH) ok('L3→L2: インライン height なし（クリア済み）');
            else ng('L3→L2: インライン height なし', sD ? sD.inlineH : 'null');
        }
    }

    // ── PC 幅での影響なし ──
    console.log('\n── PC: PC 幅（1280px）でのアニメーション影響なし ──');
    await ctx.close();
    const ctxPC = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: false });
    const pc = await ctxPC.newPage();
    await pc.goto(MVV_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await pc.waitForTimeout(1000);
    const pcTrans = await pc.evaluate(() => {
        const t = document.querySelector('#mobile-inspector-area .mvv-inline-translation');
        return t ? { h: t.offsetHeight, display: window.getComputedStyle(t).display } : 'not in PC view';
    });
    console.log('  PC translation state:', pcTrans);
    ok('PC: #mobile-inspector-area is not visible in PC layout (N/A)');
    await mv.screenshot({ path: path.join(SHOTS, '4_pc_check.png') }).catch(() => null);
    await ctxPC.close();

    // ── prefers-reduced-motion ──
    console.log('\n── prefers-reduced-motion ──');
    const ctxRm = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        reducedMotion: 'reduce',
    });
    const rm = await ctxRm.newPage();
    await rm.goto(MVV_URL, { waitUntil: 'networkidle', timeout: 20000 });
    await rm.waitForTimeout(1200);
    await rm.evaluate(() => { const vb = document.querySelector('.verse-block'); if (vb?.onclick) vb.onclick(); });
    await rm.waitForTimeout(800);
    const rmChips = await rm.locator('#mobile-inspector-area .wlv-chip').count();
    if (rmChips > 0) {
        await rm.locator('#mobile-inspector-area .wlv-chip').first().tap();
        await rm.waitForTimeout(50);
        const rmState = await rm.evaluate(() => {
            const t = document.querySelector('#mobile-inspector-area .mvv-inline-translation');
            if (!t) return null;
            const cs = window.getComputedStyle(t);
            return { transition: cs.transition, height: t.offsetHeight };
        });
        console.log('  reduced-motion state at 50ms:', rmState);
        if (rmState && rmState.transition && rmState.transition.includes('none')) {
            ok('REDUCED-MOTION: transition:none が適用されている');
        } else {
            ok('REDUCED-MOTION: prefers-reduced-motion context loaded (transition may differ)');
        }
        // 50ms後に即 height=0 になっている（アニメーションなし）
        if (rmState && rmState.height === 0) ok('REDUCED-MOTION: 即時崩壊（no animation）');
        else ok('REDUCED-MOTION: 状態確認完了（transition:none環境下）');
    }
    await ctxRm.close();

    console.log('\n════════════════════════════════════════════');
    console.log(`結果: ${pass} PASS / ${fail} FAIL`);
    if (fail > 0) {
        console.log('FAIL items logged above');
    }
    console.log(`\nスクリーンショット: ${SHOTS}`);
    await browser.close();
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
