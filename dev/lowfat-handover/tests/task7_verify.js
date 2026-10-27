/**
 * task7_verify.js — Phase 3: 保存・再読込・回帰検証
 *
 * col_final.xml と luk_after_fold.xml を読み込んで:
 * 1. 位置が正しく復元される (save/reload)
 * 2. L字形接続線が fold 点で形成される
 * 3. 780px 以内に収まる
 * 4. コンソールエラーなし
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SS = path.resolve(__dirname, 'task7_ss');
const XML_OUT = path.resolve(__dirname, 'task7_xml');

const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ss = (pg, name) => pg.screenshot({
  path: path.join(SS, name + '.png'),
  clip: {x: 0, y: 0, width: VW, height: VH}
}).then(() => console.log('  📷', name + '.png'));

async function show390at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.5; view.x = 20; view.y = 40 - sy * 0.5; applyView();
  }, svgY);
}

async function fitView(pg) {
  await pg.evaluate((vw, vh) => {
    const xs = words.map(w => w.x), ys = words.map(w => w.y);
    const x1 = Math.min(...xs) - 30, x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
    const y1 = Math.min(...ys) - 30, y2 = Math.max(...ys) + 50;
    const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 1.0);
    view.k = k; view.x = 20 - x1 * k; view.y = 40 - y1 * k; applyView();
  }, VW, VH);
}

function check(label, passed, detail) {
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
  return passed;
}

(async () => {
  console.log('=== Task 7 Phase 3: 検証 ===\n');
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: {width: VW, height: VH}
  });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(APP);
  await wait(600);

  let pass = 0, fail = 0;
  const P = (l, ok, d) => { const r = check(l, ok, d); if (ok) pass++; else fail++; return r; };

  // ════════════════════════════════════════════
  // Colossians 1:3-8 検証
  // ════════════════════════════════════════════
  console.log('[Colossians 1:3-8]');

  const colXml = fs.readFileSync(path.join(XML_OUT, 'col_final.xml'), 'utf8');

  // V1: XML 読み込み
  const colLoaded = await pg.evaluate(xml => fresh(xml), colXml);
  await wait(300);
  await pg.click('#mL');
  await wait(200);
  P('V1: col_final.xml 読み込み成功', colLoaded);

  // V2: rk-dx/rk-dy 属性が保存されている
  const colRkDx = await pg.evaluate(() => {
    const gs = [...doc.querySelectorAll('wg[rk-dx]')];
    return gs.map(g => ({dx: g.getAttribute('rk-dx'), dy: g.getAttribute('rk-dy'), words: [...g.querySelectorAll('w')].slice(0,2).map(w=>w.getAttribute('unicode')).join(' ')}));
  });
  P('V2: rk-dx グループ数 = 3', colRkDx.length === 3, `${colRkDx.length}件`);
  colRkDx.forEach(g => console.log(`    rk-dx=${g.dx} rk-dy=${g.dy} "${g.words}"`));

  // V3: 全 GM グループが minX ≤ 780
  const colOver = await pg.evaluate(() => {
    const over = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const minX = Math.min(...ws.map(w => w.x));
      if (minX > 780) over.push({desc: bd(gEl), minX: Math.round(minX)});
    }
    return over;
  });
  P('V3: GM グループ全て minX ≤ 780', colOver.length === 0, `超過${colOver.length}件`);

  // V4: L字形接続線が fold 点で形成される (πατρί fold: dx=-1009, dy=938)
  const colEdges = await pg.evaluate(() => {
    const elbows = edges.filter(e => {
      const d = pd(e);
      return /V/.test(d) && /H/.test(d);
    });
    return elbows.map(e => ({kind: e.kind, d: pd(e)}));
  });
  P('V4: L字形エッジ存在 (fold後)', colEdges.length > 0, `${colEdges.length}件`);
  colEdges.slice(0, 3).forEach(e => console.log(`    ${e.kind}: ${e.d.substring(0, 50)}`));

  // V5: 保存 (serialize) して再読み込み後に位置が一致する
  const colXml2 = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  const colReloaded = await pg.evaluate(xml => fresh(xml), colXml2);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const colPosBefore = await pg.evaluate(() => words.map(w => Math.round(w.x)).join(','));
  // Load again from original col_final.xml to compare
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const colPosAfter = await pg.evaluate(() => words.map(w => Math.round(w.x)).join(','));
  P('V5: serialize → reload で位置一致', colPosBefore === colPosAfter);

  // V6: Undo/Redo
  const colUndoOk = await pg.evaluate(() => {
    const before = words.map(w => Math.round(w.x)).join(',');
    if (undoS.length === 0) return {ok: false, reason: 'undoS empty'};
    undo(); refresh();
    const afterUndo = words.map(w => Math.round(w.x)).join(',');
    redo(); refresh();
    const afterRedo = words.map(w => Math.round(w.x)).join(',');
    return {ok: afterRedo === before, beforeLen: before.length, undoChanged: afterUndo !== before};
  });
  P('V6: Undo/Redo 正常動作', colUndoOk.ok, colUndoOk.reason || `undo変化:${colUndoOk.undoChanged}`);
  await wait(200);

  // V7: コンソールエラーなし
  P('V7: コンソールエラーなし', errs.length === 0, `${errs.length}件`);

  // スクリーンショット (Colossians)
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  await show390at(pg, 0);
  await ss(pg, 'verify_col_390_row1');
  await show390at(pg, 1100);
  await ss(pg, 'verify_col_390_row2');
  await show390at(pg, 2400);
  await ss(pg, 'verify_col_390_row3');

  // ════════════════════════════════════════════
  // Luke 3:23-38 検証
  // ════════════════════════════════════════════
  console.log('\n[Luke 3:23-38]');
  errs.length = 0;

  const lukXml = fs.readFileSync(path.join(XML_OUT, 'luk_after_fold.xml'), 'utf8');
  const lukLoaded = await pg.evaluate(xml => fresh(xml), lukXml);
  await wait(300);
  await pg.click('#mL');
  await wait(200);
  P('V1: luk_after_fold.xml 読み込み成功', lukLoaded);

  // V2: rk-dx 3件
  const lukRkDx = await pg.evaluate(() => {
    const gs = [...doc.querySelectorAll('wg[rk-dx]')];
    return gs.map(g => ({dx: g.getAttribute('rk-dx'), words: [...g.querySelectorAll('w')].slice(0,2).map(w=>w.getAttribute('unicode')).join(' ')}));
  });
  P('V2: rk-dx グループ数 = 3', lukRkDx.length === 3, `${lukRkDx.length}件`);
  lukRkDx.forEach(g => console.log(`    rk-dx=${g.dx} "${g.words}"`));

  // V3: 全 GM グループが minX ≤ 780
  const lukOver = await pg.evaluate(() => {
    const over = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const minX = Math.min(...ws.map(w => w.x));
      if (minX > 780) over.push({desc: bd(gEl), minX: Math.round(minX)});
    }
    return over;
  });
  P('V3: GM グループ全て minX ≤ 780', lukOver.length === 0, `超過${lukOver.length}件`);

  // V4: fold 点で L字形接続線
  const lukElbows = await pg.evaluate(() => {
    return edges.filter(e => { const d = pd(e); return /V/.test(d) && /H/.test(d); })
                .map(e => ({kind: e.kind, d: pd(e)}));
  });
  P('V4: L字形エッジ存在 (fold後)', lukElbows.length > 0, `${lukElbows.length}件`);
  lukElbows.slice(0, 3).forEach(e => console.log(`    ${e.kind}: ${e.d.substring(0, 60)}`));

  // V5: serialize → reload 位置一致
  const lukXml2 = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  await pg.evaluate(xml => fresh(xml), lukXml2);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const lukPos1 = await pg.evaluate(() => words.map(w => Math.round(w.x)).join(','));
  await pg.evaluate(xml => fresh(xml), lukXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const lukPos2 = await pg.evaluate(() => words.map(w => Math.round(w.x)).join(','));
  P('V5: serialize → reload で位置一致', lukPos1 === lukPos2);

  // V6: Undo/Redo
  const lukUndoOk = await pg.evaluate(() => {
    const before = words.map(w => Math.round(w.x)).join(',');
    if (undoS.length === 0) return {ok: false, reason: 'undoS empty'};
    undo(); refresh();
    const afterUndo = words.map(w => Math.round(w.x)).join(',');
    redo(); refresh();
    const afterRedo = words.map(w => Math.round(w.x)).join(',');
    return {ok: afterRedo === before, undoChanged: afterUndo !== before};
  });
  P('V6: Undo/Redo 正常動作', lukUndoOk.ok, lukUndoOk.reason || `undo変化:${lukUndoOk.undoChanged}`);
  await wait(200);

  // V7: コンソールエラーなし
  P('V7: コンソールエラーなし', errs.length === 0, `${errs.length}件`);

  // Luke スクリーンショット
  await pg.evaluate(xml => fresh(xml), lukXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  await show390at(pg, 0);
  await ss(pg, 'verify_luk_390_top');
  await show390at(pg, 900);
  await ss(pg, 'verify_luk_390_fold1');
  await show390at(pg, 2100);
  await ss(pg, 'verify_luk_390_fold2');
  await show390at(pg, 3300);
  await ss(pg, 'verify_luk_390_fold3');

  await b.close();

  console.log(`\n=== 検証結果: PASS ${pass} / FAIL ${fail} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
