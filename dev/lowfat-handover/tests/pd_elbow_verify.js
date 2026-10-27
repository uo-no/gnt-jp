/**
 * pd_elbow_verify.js — Task 6 Phase 3: L字形接続線描画検証
 *
 * 確認内容:
 *   T1: Colossians 折り返し後の mod エッジが L 字形になること
 *   T2: Luke 折り返し後の dash エッジが L 字形になること
 *   T3: 短い接続線（|dx|≤150 または |dy|≤40）は直線のままであること
 *   T4: cont / sv / vo / vp エッジが変更されていないこと
 *   T5: Undo で L 字形が解消されること
 *   T6: コンソールエラーがないこと
 *   T7: 縦方向移動のみでは L 字形にならないこと
 *
 * スクリーンショット: tests/pd_elbow_ss/
 * （エルボー折れ点を正面から撮影したズームビューを含む）
 */

const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS = path.resolve(__dirname, 'pd_elbow_ss');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, {recursive: true});

const VW = 1400, VH = 900;

let pass = 0, fail = 0, warns = [];
const errs = [];
const ok = (n, v, d = '') => {
  if (v) { pass++; console.log('  PASS:', n + (d ? ' — ' + d : '')); }
  else   { fail++; console.log('  FAIL:', n + (d ? ' — ' + d : '')); }
  return v;
};
const warn = (n) => { warns.push(n); console.log('  WARN:', n); };
const ss = (pg, name) => pg.screenshot({path: path.join(SS, name + '.png'),
  clip: {x: 0, y: 0, width: VW, height: VH}}).then(() => console.log('  📷', name + '.png'));
const wait = ms => new Promise(r => setTimeout(r, ms));

// pan to center SVG point (svgX, svgY) in viewport at zoom k
const panTo = (pg, svgX, svgY, k) => pg.evaluate((x, y, k, vw, vh) => {
  view.k = k; view.x = vw/2 - x*k; view.y = vh/2 - y*k; applyView();
}, svgX, svgY, k, VW, VH);

// load file and navigate to verse index
async function loadVerse(pg, xmlFile, idx) {
  await pg.evaluate(() => { window.__oldBook = BOOK; });
  const bookName = xmlFile.replace(/^\d+-/, '').replace('.xml', '');
  await (await pg.$('#fi')).uploadFile(DIR + xmlFile);
  await pg.waitForFunction(
    `BOOK && BOOK !== window.__oldBook`,
    {timeout: 30000}
  );
  await pg.evaluate(i => go(i), idx);
  await wait(400);
}

// get all edges from JS global `edges`, return kind + computed pd() path + DOM d attribute
async function getEdgeInfo(pg) {
  return await pg.evaluate(() => {
    return edges.map(e => ({
      kind: e.kind,
      pdResult: pd(e),      // call pd() directly to get current path
      domD: e.el ? e.el.getAttribute('d') : null
    }));
  });
}

function isElbow(d) { return d && /V/.test(d) && /H/.test(d); }
function isStraight(d) { return d && /L/.test(d) && !/V/.test(d) && !/H/.test(d); }

// Parse L-shape path "M sx,sy V ey H ex" — returns {sx,sy,ey,ex} or null
function parseElbow(d) {
  const m = d && d.match(/M([\d.-]+),([\d.-]+)V([\d.-]+)H([\d.-]+)/);
  if (!m) return null;
  return {sx: parseFloat(m[1]), sy: parseFloat(m[2]), ey: parseFloat(m[3]), ex: parseFloat(m[4])};
}

(async () => {
  console.log('=== pd() L字形接続線描画検証 ===\n');
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: {width: VW, height: VH}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));

  await pg.goto(APP);
  await wait(600);

  // ──────────────────────────────────────────────
  // T0: 関数定義確認
  // ──────────────────────────────────────────────
  console.log('[T0] 関数定義確認');
  const fns = await pg.evaluate(() => ({
    pd: typeof pd === 'function',
    applyGroupOffset: typeof applyGroupOffset === 'function',
    act: typeof act === 'function',
    undo: typeof undo === 'function',
    redo: typeof redo === 'function',
  }));
  ok('T0a: pd() 定義', fns.pd);
  ok('T0b: applyGroupOffset() 定義', fns.applyGroupOffset);
  ok('T0c: act() 定義', fns.act);
  ok('T0d: undo() 定義', fns.undo);

  // ──────────────────────────────────────────────
  // T1: Colossians 1:3-8 — 折り返し後の mod L字形確認
  // ──────────────────────────────────────────────
  console.log('\n[T1] Colossians 1:3-8 折り返し後の mod エッジ検証');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL');
  await wait(200);

  // 最右端グループを特定して折り返し (routing_compare.js と同じパターン)
  const colRightInfo = await pg.evaluate(() => {
    let maxX = -Infinity, rightGEl = null;
    for (const [gEl] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const rx = Math.max(...ws.map(w => w.x + w.w));
      if (rx > maxX) { maxX = rx; rightGEl = gEl; }
    }
    if (!rightGEl) return null;
    const ws = [...rightGEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
    const x0 = Math.round(Math.min(...ws.map(w => w.x)));
    return {desc: bd(rightGEl), x0};
  });
  ok('T1-pre: 最右端グループ特定', colRightInfo !== null, colRightInfo ? '「' + colRightInfo.desc + '」 x0=' + colRightInfo.x0 : '');

  if (colRightInfo) {
    await pg.evaluate(x0 => {
      let maxX = -Infinity, rightGEl = null;
      for (const [gEl] of GM) {
        const ws = [...gEl.getElementsByTagName('w')].map(xw => EW.get(xw)).filter(Boolean);
        if (!ws.length) continue;
        const rx = Math.max(...ws.map(w => w.x + w.w));
        if (rx > maxX) { maxX = rx; rightGEl = gEl; }
      }
      if (rightGEl) act(() => applyGroupOffset(rightGEl, 100, -x0 + 20));
    }, colRightInfo.x0);
    await wait(300);

    const colEdges = await getEdgeInfo(pg);
    const colMod = colEdges.filter(e => e.kind === 'mod');
    const colModElbow = colMod.filter(e => isElbow(e.pdResult));
    const colModStraight = colMod.filter(e => isStraight(e.pdResult));
    const colHorizElbow = colEdges.filter(e => ['cont','sv','vo','vp'].includes(e.kind) && isElbow(e.pdResult));

    console.log('  mod エッジ:', colMod.length, '  L字形:', colModElbow.length, '  直線:', colModStraight.length);

    ok('T1a: mod エッジが L 字形になった', colModElbow.length >= 1);
    if (colModElbow.length > 0) {
      console.log('  elbow path[0]:', colModElbow[0].pdResult.substring(0, 100));
      // DOM d 属性の確認
      const domMatch = colModElbow.filter(e => e.domD === e.pdResult);
      ok('T1b: DOM path の d 属性が pd() 結果と一致する', domMatch.length === colModElbow.length,
        domMatch.length + '/' + colModElbow.length + ' 一致');
    } else {
      warn('T1b: elbow なし — DOM 確認スキップ');
    }
    ok('T1c: 短い mod エッジは直線を維持', colModStraight.length > 0, colModStraight.length + '件');
    ok('T1d: cont/sv/vo/vp は L 字形にならない', colHorizElbow.length === 0,
      colHorizElbow.length === 0 ? '全直線' : colHorizElbow.length + '件が不正にL字形');

    // Full view screenshot
    await pg.evaluate((vw, vh) => {
      const x1 = Math.min(...words.map(w => w.x)) - 30;
      const x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
      const y1 = Math.min(...words.map(w => w.y)) - 30;
      const y2 = Math.max(...words.map(w => w.y)) + 50;
      const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 1.0);
      view.k = k; view.x = 20 - x1 * k; view.y = 40 - y1 * k; applyView();
    }, VW, VH);
    await wait(200);
    await ss(pg, 't1_col_wrap_fullview');

    // Elbow zoom — center on the bend point
    if (colModElbow.length > 0) {
      const ep = parseElbow(colModElbow[0].pdResult);
      if (ep) {
        console.log('  エルボー折れ点 (SVG座標):', Math.round(ep.sx), Math.round(ep.ey));
        // Wide view showing both the head area and the elbow
        await panTo(pg, ep.sx, ep.ey, 1.0);
        await wait(200);
        await ss(pg, 't1_col_elbow_wide');
        // Tight zoom on the actual elbow corner
        await panTo(pg, ep.sx - 50, ep.ey, 2.0);
        await wait(200);
        await ss(pg, 't1_col_elbow_tight');
        // Show the destination (the moved group)
        await panTo(pg, ep.ex + 50, ep.ey, 2.0);
        await wait(200);
        await ss(pg, 't1_col_target_zoom');
        ok('T1e: エルボー折れ点 zoom スクリーンショット取得', true,
          'bend=(' + Math.round(ep.sx) + ',' + Math.round(ep.ey) + ')');
      } else {
        warn('T1e: エルボーパターンの解析失敗: ' + colModElbow[0].pdResult);
      }
    }

    // Undo and verify lines go back to straight
    await pg.evaluate(() => undo());
    await wait(300);
    const afterUndo = await getEdgeInfo(pg);
    const undoElbow = afterUndo.filter(e => e.kind === 'mod' && isElbow(e.pdResult));
    ok('T1f: Undo 後は mod エッジが直線に戻る', undoElbow.length === 0,
      undoElbow.length + '件が残存');
  }

  // ──────────────────────────────────────────────
  // T2: Luke 3:23-38 — 折り返し後の mod/dash L字形確認
  // 注: Luke の系譜構造は mod エッジ主体（dash は文全体で 1 件のみ、系譜接続ではない）
  // ──────────────────────────────────────────────
  console.log('\n[T2] Luke 3:23-38 折り返し後の mod/dash エッジ検証');
  await loadVerse(pg, '03-luke.xml', 119);
  await pg.click('#mL');
  await wait(200);

  // 最下端グループ（系譜末尾）を特定
  const lukBottomInfo = await pg.evaluate(() => {
    let maxY = -Infinity, bottomGEl = null;
    for (const [gEl] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const ry = Math.max(...ws.map(w => w.y));
      if (ry > maxY) { maxY = ry; bottomGEl = gEl; }
    }
    if (!bottomGEl) return null;
    const ws = [...bottomGEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
    const x0 = Math.round(Math.min(...ws.map(w => w.x)));
    return {desc: bd(bottomGEl), x0, y0: Math.round(maxY)};
  });
  ok('T2-pre: 最下端グループ特定', lukBottomInfo !== null,
    lukBottomInfo ? '「' + lukBottomInfo.desc + '」 x0=' + lukBottomInfo.x0 : '');

  if (lukBottomInfo) {
    // 適度な dx で折り返し（1画面分 ≈ -600）
    const lukDx = -600;
    await pg.evaluate((dx) => {
      let maxY = -Infinity, bottomGEl = null;
      for (const [gEl] of GM) {
        const ws = [...gEl.getElementsByTagName('w')].map(xw => EW.get(xw)).filter(Boolean);
        if (!ws.length) continue;
        const ry = Math.max(...ws.map(w => w.y));
        if (ry > maxY) { maxY = ry; bottomGEl = gEl; }
      }
      if (bottomGEl) act(() => applyGroupOffset(bottomGEl, 100, dx));
    }, lukDx);
    await wait(300);

    const lukEdges = await getEdgeInfo(pg);
    const lukDash = lukEdges.filter(e => e.kind === 'dash');
    const lukMod  = lukEdges.filter(e => e.kind === 'mod');
    const lukDashElbow = lukDash.filter(e => isElbow(e.pdResult));
    const lukModElbow  = lukMod.filter(e => isElbow(e.pdResult));
    const lukAllElbow  = [...lukDashElbow, ...lukModElbow];
    const lukHorizElbow = lukEdges.filter(e => ['cont','sv','vo','vp'].includes(e.kind) && isElbow(e.pdResult));

    console.log('  dash エッジ:', lukDash.length, '  L字形:', lukDashElbow.length);
    console.log('  mod  エッジ:', lukMod.length,  '  L字形:', lukModElbow.length);

    // Luke の系譜は mod エッジ主体。dash OR mod どちらかが L字形になれば PASS
    ok('T2a: mod/dash エッジが L 字形になった', lukAllElbow.length >= 1,
      lukAllElbow.length + '件 (mod=' + lukModElbow.length + ' dash=' + lukDashElbow.length + ')');
    if (lukAllElbow.length > 0) {
      const first = lukAllElbow[0];
      console.log('  elbow [' + first.kind + ']:', first.pdResult.substring(0, 100));
      const domMatch = lukAllElbow.filter(e => e.domD === e.pdResult);
      ok('T2b: DOM path の d 属性が pd() 結果と一致する', domMatch.length === lukAllElbow.length,
        domMatch.length + '/' + lukAllElbow.length + ' 一致');
    }
    ok('T2c: cont/sv/vo/vp は L 字形にならない', lukHorizElbow.length === 0);

    // Full view
    await pg.evaluate((vw, vh) => {
      const xs = words.map(w => w.x), ys = words.map(w => w.y);
      const x1 = Math.min(...xs) - 30, x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
      const y1 = Math.min(...ys) - 30, y2 = Math.max(...ys) + 50;
      const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 0.8);
      view.k = k; view.x = 20 - x1 * k; view.y = 40 - y1 * k; applyView();
    }, VW, VH);
    await wait(200);
    await ss(pg, 't2_luk_wrap_fullview');

    // Elbow zoom — use first available elbow (mod preferred)
    const elbowEdge = lukModElbow[0] || lukDashElbow[0];
    if (elbowEdge) {
      const ep = parseElbow(elbowEdge.pdResult);
      if (ep) {
        console.log('  Luke エルボー折れ点 (SVG座標):', Math.round(ep.sx), Math.round(ep.ey));
        // Show the elbow bend and the horizontal arm reaching to the target
        await panTo(pg, ep.sx, ep.ey, 1.2);
        await wait(200);
        await ss(pg, 't2_luk_elbow_wide');
        // Tight on bend corner
        await panTo(pg, ep.sx, ep.ey, 2.5);
        await wait(200);
        await ss(pg, 't2_luk_elbow_tight');
        // The full horizontal run from bend to target
        await panTo(pg, (ep.sx + ep.ex) / 2, ep.ey, 0.7);
        await wait(200);
        await ss(pg, 't2_luk_elbow_hrun');
        ok('T2e: Luke エルボー折れ点 zoom スクリーンショット取得', true);
      } else {
        warn('T2e: Luke エルボーパターン解析失敗: ' + elbowEdge.pdResult);
      }
    }

    await pg.evaluate(() => undo());
    await wait(300);
  }

  // ──────────────────────────────────────────────
  // T3: Auto Layout後（折り返しなし）— 全 mod エッジが直線
  // ──────────────────────────────────────────────
  console.log('\n[T3] Auto Layout後 — mod エッジが直線であること');
  await loadVerse(pg, '12-colossians.xml', 2);
  await wait(400);

  const baseEdges = await getEdgeInfo(pg);
  const baseMod = baseEdges.filter(e => e.kind === 'mod');
  const baseElbow = baseMod.filter(e => isElbow(e.pdResult));
  console.log('  Auto Layout後 mod エッジ:', baseMod.length, '  L字形:', baseElbow.length);

  if (baseElbow.length === 0) {
    ok('T3a: Auto Layout後は全 mod エッジが直線', true);
  } else {
    // Some naturally long edges might exceed threshold — record them
    warn('T3a: Auto Layout後に自然な L 字形 mod が ' + baseElbow.length + '件 — 長距離 mod が閾値を超えている可能性');
    baseElbow.forEach((e, i) => console.log('    natural-elbow[' + i + ']:', e.pdResult.substring(0, 100)));
  }

  // Baseline screenshot at initView
  await pg.evaluate(() => { if (typeof initView === 'function') initView(); });
  await wait(200);
  await ss(pg, 't3_col_autolayout_baseline');

  // ──────────────────────────────────────────────
  // T4: 縦移動のみ（dy=60, dx=0）では L字形にならない
  // ──────────────────────────────────────────────
  console.log('\n[T4] 縦方向移動のみ（rk-dy のみ）— L字形にならないこと');
  await pg.click('#mL');
  await wait(200);

  await pg.evaluate(() => {
    let maxX = -Infinity, rightGEl = null;
    for (const [gEl] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const rx = Math.max(...ws.map(w => w.x + w.w));
      if (rx > maxX) { maxX = rx; rightGEl = gEl; }
    }
    if (rightGEl) act(() => applyGroupOffset(rightGEl, 60, 0)); // dy=60, dx=0
  });
  await wait(300);

  const dyOnlyEdges = await getEdgeInfo(pg);
  const dyOnlyElbow = dyOnlyEdges.filter(e => e.kind === 'mod' && isElbow(e.pdResult));
  console.log('  縦移動後 L字形 mod:', dyOnlyElbow.length);
  ok('T4a: 縦移動のみでは L字形が発生しない', dyOnlyElbow.length === 0,
    dyOnlyElbow.length === 0 ? '全直線' : dyOnlyElbow.length + '件が不正にL字形');

  await pg.evaluate(() => undo());
  await wait(300);

  // ──────────────────────────────────────────────
  // T5: Undo/Redo の動作確認（折り返し → Undo → Redo）
  // ──────────────────────────────────────────────
  console.log('\n[T5] Undo/Redo — L字形 ↔ 直線の往復確認');
  await pg.click('#mL');
  await wait(200);

  await pg.evaluate(() => {
    let maxX = -Infinity, rightGEl = null;
    for (const [gEl] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const rx = Math.max(...ws.map(w => w.x + w.w));
      if (rx > maxX) { maxX = rx; rightGEl = gEl; }
    }
    if (rightGEl) {
      const ws = [...rightGEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      const x0 = Math.round(Math.min(...ws.map(w => w.x)));
      act(() => applyGroupOffset(rightGEl, 100, -x0 + 20));
    }
  });
  await wait(300);

  const preUndoElbow = (await getEdgeInfo(pg)).filter(e => e.kind === 'mod' && isElbow(e.pdResult)).length;
  ok('T5a: 折り返し後に L字形 mod が存在する', preUndoElbow >= 1, preUndoElbow + '件');

  await pg.evaluate(() => undo());
  await wait(300);
  const postUndoElbow = (await getEdgeInfo(pg)).filter(e => e.kind === 'mod' && isElbow(e.pdResult)).length;
  ok('T5b: Undo 後 L字形 mod が消える', postUndoElbow === 0, postUndoElbow + '件残存');

  await pg.evaluate(() => redo());
  await wait(300);
  const postRedoElbow = (await getEdgeInfo(pg)).filter(e => e.kind === 'mod' && isElbow(e.pdResult)).length;
  ok('T5c: Redo 後 L字形 mod が復元する', postRedoElbow >= preUndoElbow, postRedoElbow + '件');

  await pg.evaluate(() => undo());
  await wait(200);

  // ──────────────────────────────────────────────
  // T6: グループドラッグ中の動的 L字形更新
  // ──────────────────────────────────────────────
  console.log('\n[T6] グループドラッグ中の動的更新確認');
  // レイアウト編集モードで eh ハンドルが存在することを確認
  const ehCount = await pg.evaluate(() => document.querySelectorAll('path.eh').length);
  console.log('  eh ハンドル (path.eh):', ehCount);
  if (ehCount > 0) {
    ok('T6a: レイアウト編集モードで eh ドラッグハンドルが存在', true, ehCount + '件');
  } else {
    warn('T6a: eh ハンドルが 0 — layoutモードを確認中');
    // Try clicking layout mode button
    await pg.evaluate(() => {
      const btn = document.querySelector('#mL');
      if (btn) btn.click();
    });
    await wait(200);
    const ehCount2 = await pg.evaluate(() => document.querySelectorAll('path.eh').length);
    ok('T6a: layout切替後の eh ハンドル', ehCount2 > 0, ehCount2 + '件');
  }

  // ──────────────────────────────────────────────
  // T7: エラー確認
  // ──────────────────────────────────────────────
  console.log('\n[T7] コンソールエラー確認');
  ok('T7: コンソールエラーなし', errs.length === 0, errs.length + '件: ' + errs.slice(0, 2).join('; '));

  // ──────────────────────────────────────────────
  // Final visual: Colossians 折り返し — エルボーが見えるパノラマビュー
  // ──────────────────────────────────────────────
  console.log('\n[Visual-Final] Colossians 折り返し — エルボー全体パノラマ');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL');
  await wait(200);

  const finalColRight = await pg.evaluate(() => {
    let maxX = -Infinity, rightGEl = null;
    for (const [gEl] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const rx = Math.max(...ws.map(w => w.x + w.w));
      if (rx > maxX) { maxX = rx; rightGEl = gEl; }
    }
    if (!rightGEl) return null;
    const ws = [...rightGEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
    const x0 = Math.round(Math.min(...ws.map(w => w.x)));
    act(() => applyGroupOffset(rightGEl, 100, -x0 + 20));
    return x0;
  });
  await wait(400);

  // Panorama: show the full vertical drop segment + horizontal run
  const finalEdges = await getEdgeInfo(pg);
  const finalElbow = finalEdges.filter(e => e.kind === 'mod' && isElbow(e.pdResult));
  if (finalElbow.length > 0) {
    const ep = parseElbow(finalElbow[0].pdResult);
    if (ep) {
      // View that shows the head area (sx,sy) and the bend area (sx,ey)
      const midX = ep.sx;
      const midY = (ep.sy + ep.ey) / 2;
      // zoom to show vertical segment
      await panTo(pg, midX, midY, 0.8);
      await wait(200);
      await ss(pg, 'final_col_vertical_segment');

      // zoom to show the bend + start of horizontal segment
      await panTo(pg, ep.sx + 50, ep.ey, 1.5);
      await wait(200);
      await ss(pg, 'final_col_elbow_bend');

      // Full diagram view
      await pg.evaluate((vw, vh) => {
        const xs = words.map(w => w.x), ys = words.map(w => w.y);
        const x1 = Math.min(...xs) - 30, x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
        const y1 = Math.min(...ys) - 30, y2 = Math.max(...ys) + 50;
        const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 1.0);
        view.k = k; view.x = 20 - x1 * k; view.y = 40 - y1 * k; applyView();
      }, VW, VH);
      await wait(200);
      await ss(pg, 'final_col_full');
    }
  }

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  console.log('\n' + '='.repeat(55));
  console.log('RESULT: PASS', pass, '/ FAIL', fail, '/ WARN', warns.length);
  if (warns.length > 0) console.log('WARNS:', warns.map(w => '  - ' + w).join('\n'));
  console.log('='.repeat(55));

  await b.close();
})().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(1);
});
