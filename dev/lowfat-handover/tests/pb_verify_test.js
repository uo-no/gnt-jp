/**
 * pb_verify_test.js — ページ区切り機能 ブラウザ検証
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const XML  = '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml';
const SS_OUT = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/pb_ss';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(SS_OUT)) fs.mkdirSync(SS_OUT, {recursive: true});
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900}
  });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(APP); await wait(600);

  let pass = 0, fail = 0;
  const chk = (label, ok, detail) => {
    if (ok) { pass++; console.log('  [PASS]', label, detail || ''); }
    else     { fail++; console.log('  [FAIL]', label, detail || ''); }
  };
  const ss = async (name) => {
    await pg.screenshot({ path: path.join(SS_OUT, name + '.png'), clip: {x:0,y:0,width:1400,height:900} });
    console.log('  📷', name + '.png');
  };

  await pg.evaluate(xml => fresh(xml), fs.readFileSync(XML, 'utf8'));
  await wait(300);

  // 画角ガイド ON → sp-std
  await pg.click('#vgTog'); await wait(100);
  await pg.select('#vgPre', 'sp-std'); await wait(200);
  chk('pbRow表示', await pg.evaluate(() => document.querySelector('#pbRow').style.display !== 'none'));
  await pg.evaluate(() => { document.querySelector('#vgSlChk').checked = true; vgSlOn = true; vgSlDraw(); });
  await pg.evaluate(() => { view.k = 0.5; view.x = 20; view.y = 40; applyView(); });
  await wait(100);

  // GM グループ一覧 (全件)
  const gmGroups = await pg.evaluate(() => {
    const res = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      const minY = Math.min(...ws.map(w => w.y));
      res.push({
        idx: res.length, minY: Math.round(minY),
        bottom: Math.round(pbGroupBottom(g)),
        hasNext: !!pbNextGroup(g),
        label: bd(g),
        cls: g.getAttribute('class') || '',
        parentCls: g.parentNode?.getAttribute('class') || '',
      });
    }
    return res.sort((a, b) => a.minY - b.minY);
  });

  console.log('\nGM groups (' + gmGroups.length + '件):');
  gmGroups.forEach(g => console.log(
    `  [${g.idx}] y=${g.minY} bot=${g.bottom} hasNext:${g.hasNext} cls:${g.cls} parent:${g.parentCls} "${g.label}"`
  ));

  // 境界候補: bottom <= 844 & hasNext
  const cands = gmGroups.filter(g => g.bottom <= 844 && g.hasNext);
  const bnd = cands[cands.length - 1];
  chk('境界候補が存在', !!bnd, bnd ? `bottom=${bnd.bottom} "${bnd.label}"` : 'なし');
  if (!bnd) { await b.close(); process.exit(1); }

  const bndIdx = bnd.idx;
  console.log('\n使用する境界グループ: [' + bndIdx + '] bottom=' + bnd.bottom + ' "' + bnd.label + '"');

  // 全語位置を保存
  const beforePos = await pg.evaluate(() =>
    words.map(w => ({ x: Math.round(w.x), y: Math.round(w.y) }))
  );

  // 境界とその前後 sibling の y を記録
  const snapshotBefore = await pg.evaluate((bi) => {
    const gmArr = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      gmArr.push({ g, minY: Math.min(...ws.map(w => w.y)) });
    }
    gmArr.sort((a, b) => a.minY - b.minY);
    const bndEl = gmArr[bi].g;
    const parent = bndEl.parentNode;
    const siblings = [...parent.children].filter(c => c.tagName === 'wg' && GM.has(c));
    const bndI = siblings.indexOf(bndEl);
    const yOf = g => {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      return ws.length ? Math.round(Math.min(...ws.map(w => w.y))) : null;
    };
    return {
      bndY: yOf(bndEl),
      bndBottom: Math.round(pbGroupBottom(bndEl)),
      beforeYs: siblings.slice(0, bndI).map(yOf),
      afterYs:  siblings.slice(bndI + 1).map(yOf),
    };
  }, bndIdx);
  console.log('  境界 y=' + snapshotBefore.bndY + ' bottom=' + snapshotBefore.bndBottom);
  console.log('  前sibling数=' + snapshotBefore.beforeYs.length + ' 後sibling数=' + snapshotBefore.afterYs.length);

  // 境界設定
  const bndSet = await pg.evaluate((bi) => {
    const gmArr = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      gmArr.push({ g, minY: Math.min(...ws.map(w => w.y)) });
    }
    gmArr.sort((a, b) => a.minY - b.minY);
    const bndEl = gmArr[bi].g;
    pbSetBnd(bndEl);
    return { label: bd(pbBnd), bottom: Math.round(pbGroupBottom(pbBnd)), hasNext: !!pbNextGroup(pbBnd) };
  }, bndIdx);
  chk('境界設定成功', !!bndSet, '"' + bndSet?.label + '" bottom=' + bndSet?.bottom);
  chk('後続グループあり', !!bndSet?.hasNext);
  await wait(100);
  await ss('01_before_pbnd_selected');

  // GAP=200px 適用
  const GAP = 200;
  const applyRes = await pg.evaluate((gap) => {
    const ng = pbNextGroup(pbBnd);
    if (!ng) return 'no-next-group';
    act(() => applyGroupDy(ng, dyOf(ng) + gap));
    return 'ok';
  }, GAP);
  chk('後続移動実行', applyRes === 'ok', applyRes);
  await wait(200);
  await ss('02_after_pagebreak_gap200');

  // 移動後の検証
  const snapshotAfter = await pg.evaluate((bi) => {
    const gmArr = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      gmArr.push({ g, minY: Math.min(...ws.map(w => w.y)) });
    }
    gmArr.sort((a, b) => a.minY - b.minY);
    const bndEl = gmArr[bi].g;
    const parent = bndEl.parentNode;
    const siblings = [...parent.children].filter(c => c.tagName === 'wg' && GM.has(c));
    const bndI = siblings.indexOf(bndEl);
    const yOf = g => {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      return ws.length ? Math.round(Math.min(...ws.map(w => w.y))) : null;
    };
    return {
      bndY: yOf(bndEl),
      beforeYs: siblings.slice(0, bndI).map(yOf),
      afterYs:  siblings.slice(bndI + 1).map(yOf),
    };
  }, bndIdx);

  // 1: 前不動
  const beforeOk = snapshotBefore.beforeYs.every((y, i) => y === snapshotAfter.beforeYs[i]);
  chk('境界より前のグループが移動していない', beforeOk,
    beforeOk ? snapshotBefore.beforeYs.length + '語確認' : '差分あり');

  // 2: 境界不動
  chk('境界グループ自体が移動していない', snapshotBefore.bndY === snapshotAfter.bndY,
    'Δy=' + (snapshotAfter.bndY - snapshotBefore.bndY));

  // 3: 後続 GAP 移動
  let movedOk = true, movedBad = [];
  for (let i = 0; i < snapshotBefore.afterYs.length; i++) {
    const d = snapshotAfter.afterYs[i] - snapshotBefore.afterYs[i];
    if (Math.abs(d - GAP) > 2) { movedOk = false; movedBad.push('[' + i + ']Δy=' + d); }
  }
  chk('後続sibling が ' + GAP + 'px 下へ移動', movedOk,
    movedOk ? snapshotBefore.afterYs.length + '語確認' : movedBad.slice(0,3).join(' '));

  // 4: #pbg 境界線
  chk('#pbg に境界線描画', await pg.evaluate(() => !!pbg.querySelector('.pb-line') && !!pbg.querySelector('.pb-lbl')));

  // 5: パン追従
  const pbY0 = await pg.evaluate(() => +pbg.querySelector('.pb-line')?.getAttribute('y1'));
  await pg.evaluate(() => { view.x = -300; view.y = 200; applyView(); });
  await wait(100);
  await ss('03_after_pan');
  const pbYPan = await pg.evaluate(() => +pbg.querySelector('.pb-line')?.getAttribute('y1'));
  chk('パン後も境界線 y 不変', Math.abs(pbY0 - pbYPan) < 0.01,
    'before=' + pbY0.toFixed(1) + ' pan=' + pbYPan.toFixed(1));

  const lblSX = await pg.evaluate(() => {
    const lbl = pbg.querySelector('.pb-lbl');
    return lbl ? Math.round(+lbl.getAttribute('x') * view.k + view.x) : null;
  });
  chk('パン後もラベル screen-x ≈ 6', Math.abs((lblSX || 0) - 6) <= 3, 'screen-x=' + lblSX);

  // 6: ズーム追従
  await pg.evaluate(() => { view.k = 0.3; view.x = 20; view.y = 40; applyView(); });
  await wait(100);
  await ss('04_after_zoom_out');
  const pbYZoom = await pg.evaluate(() => +pbg.querySelector('.pb-line')?.getAttribute('y1'));
  chk('ズーム後も境界線 y 不変', Math.abs(pbY0 - pbYZoom) < 0.01,
    'zoom=' + pbYZoom.toFixed(1));

  // 7: Undo
  await pg.evaluate(() => { view.k = 0.5; view.x = 20; view.y = 40; applyView(); });
  await wait(100);
  await pg.click('#un'); await wait(300);
  await ss('05_after_undo');

  const undoPos = await pg.evaluate(() =>
    words.map(w => ({ x: Math.round(w.x), y: Math.round(w.y) }))
  );
  let undoOk = true;
  const diffs = [];
  for (let i = 0; i < beforePos.length; i++) {
    if (beforePos[i].x !== undoPos[i].x || beforePos[i].y !== undoPos[i].y) {
      undoOk = false;
      diffs.push('[' + i + '] Δx=' + (undoPos[i].x - beforePos[i].x) + ' Δy=' + (undoPos[i].y - beforePos[i].y));
    }
  }
  chk('Undoで全語の位置が正確に復元', undoOk,
    undoOk ? beforePos.length + '語確認' : '差分' + diffs.length + '件: ' + diffs.slice(0,3).join(', '));

  chk('コンソールエラー0件', errs.length === 0, errs.length + '件');
  if (errs.length) errs.slice(0, 3).forEach(e => console.log('  エラー:', e));

  await b.close();
  console.log('\n=== 結果:', pass, 'PASS /', fail, 'FAIL ===');
  console.log('📁 SS:', SS_OUT);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
