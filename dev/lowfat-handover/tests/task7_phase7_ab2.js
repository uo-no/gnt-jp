/**
 * task7_phase7_ab2.js — Phase 7: 冠詞インラインA/B/B2三方式比較
 *
 * 方式A (通常) / 方式B (インライン) / 方式B2 (インライン＋一本下線) を比較する。
 * XMLデータは変更しない。
 *
 * 出力: tests/task7_phase7_ss/  — A/B/B2比較スクリーンショット
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const XML_OUT = path.resolve(__dirname, 'task7_xml');
const SS_OUT = path.resolve(__dirname, 'task7_phase7_ss');

const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ss = (pg, name) => pg.screenshot({
  path: path.join(SS_OUT, name + '.png'),
  clip: {x: 0, y: 0, width: VW, height: VH}
}).then(() => console.log('  📷', name + '.png'));

function check(label, passed, detail) {
  const mark = passed ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ' — ' + detail : ''}`);
  return passed;
}

async function setMode(pg, mode) {
  // mode: 'A' | 'B' | 'B2'
  await pg.evaluate((m) => {
    detInline = (m === 'B' || m === 'B2');
    b2UL = (m === 'B2');
    $('#di').classList.toggle('on', detInline);
    $('#b2').classList.toggle('on', b2UL);
    refresh();
  }, mode);
  await wait(150);
}

async function show390at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.5; view.x = 20; view.y = 40 - sy * 0.5; applyView();
  }, svgY);
}

async function show360at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.46; view.x = 20; view.y = 40 - sy * 0.46; applyView();
  }, svgY);
}

async function show065at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.65; view.x = 20; view.y = 40 - sy * 0.65; applyView();
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

async function measureDiagram(pg) {
  return await pg.evaluate(() => ({
    minX: Math.round(Math.min(...words.map(w => w.x))),
    maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
    minY: Math.round(Math.min(...words.map(w => w.y))),
    maxY: Math.round(Math.max(...words.map(w => w.y))),
    wordCount: words.length,
    edgeCount: edges.length,
  }));
}

async function measureB2(pg) {
  return await pg.evaluate(() => {
    // b2Pairs の内容と、SVGに描画された一本線を確認する
    const pairs = b2Pairs.map(pr => ({
      det: pr.det ? pr.det.text : null,
      noun: pr.noun ? pr.noun.text : null,
      detX: pr.det ? Math.round(pr.det.x) : null,
      nounX: pr.noun ? Math.round(pr.noun.x) : null,
      nounW: pr.noun ? Math.round(pr.noun.w) : null,
      elOk: pr.el !== null,
      // 一本線の幅: nounX + nounW + PADX - (detX - PADX)
      spanW: pr.det && pr.noun ? Math.round((pr.noun.x + pr.noun.w + PADX) - (pr.det.x - PADX)) : null,
    }));
    return {pairs, pairCount: b2Pairs.length};
  });
}

async function measureGroups(pg) {
  return await pg.evaluate(() => {
    const over = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const minX = Math.round(Math.min(...ws.map(w => w.x)));
      if (minX > 780) over.push({minX, desc: bd(gEl)});
    }
    return over;
  });
}

(async () => {
  if (!fs.existsSync(SS_OUT)) fs.mkdirSync(SS_OUT, {recursive: true});

  console.log('=== Task 7 Phase 7: 冠詞インライン A/B/B2 三方式比較 ===\n');
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

  const colXml = fs.readFileSync(path.join(XML_OUT, 'col_final.xml'), 'utf8');
  const dims = {};

  // ─────────────────────────────────────────────
  // 方式A: 通常表示
  // ─────────────────────────────────────────────
  console.log('[方式A: 通常表示]');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  // Fix: fresh() は updateNav() を呼ばないため、ヘッダーを直接設定する
  await pg.evaluate(() => { $('#ref').textContent = 'Colossians 1:3–8'; });
  // Fix: #mL クリックを削除 — 全スクリーンショットを構造編集モード(デフォルト)で撮影
  await setMode(pg, 'A');

  dims.A = await measureDiagram(pg);
  const rkA = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].map(g => ({dx:g.getAttribute('rk-dx'),dy:g.getAttribute('rk-dy')})));
  const xmlA = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  console.log(`  図寸法: 幅${dims.A.maxX}px 高${dims.A.maxY}px`);
  check('方式A: GMグループ ≤780', (await measureGroups(pg)).length === 0);
  check('方式A: b2UL=false', await pg.evaluate(()=>b2UL) === false);
  check('方式A: ヘッダー=Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent) === 'Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent));
  check('方式A: 構造編集モード', await pg.evaluate(()=>mode) === 'struct', await pg.evaluate(()=>mode));

  await fitView(pg);
  await ss(pg, 'A_full');
  await show390at(pg, 0);   await ss(pg, 'A_390_r1');
  await show390at(pg, 1100); await ss(pg, 'A_390_r2');
  await show390at(pg, 2400); await ss(pg, 'A_390_r3');
  await show360at(pg, 0);   await ss(pg, 'A_360_r1');
  await show360at(pg, 1100); await ss(pg, 'A_360_r2');
  await show065at(pg, 0);   await ss(pg, 'A_read_top');
  await show065at(pg, 800);  await ss(pg, 'A_read_mid');
  await show065at(pg, 2000); await ss(pg, 'A_read_bot');

  // ─────────────────────────────────────────────
  // 方式B: 横並びのみ
  // ─────────────────────────────────────────────
  console.log('\n[方式B: 冠詞インライン (横並びのみ)]');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.evaluate(() => { $('#ref').textContent = 'Colossians 1:3–8'; });
  await setMode(pg, 'B');

  dims.B = await measureDiagram(pg);
  const rkB = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].map(g => ({dx:g.getAttribute('rk-dx'),dy:g.getAttribute('rk-dy')})));
  const xmlB = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  console.log(`  図寸法: 幅${dims.B.maxX}px 高${dims.B.maxY}px エッジ${dims.B.edgeCount}`);
  check('方式B: rk-dx/rk-dy 不変', JSON.stringify(rkA)===JSON.stringify(rkB));
  check('方式B: XML同一', xmlA===xmlB, xmlA===xmlB?'':`長差${Math.abs(xmlA.length-xmlB.length)}`);
  check('方式B: b2UL=false, b2Pairs空', await pg.evaluate(()=>!b2UL && b2Pairs.length===0));
  check('方式B: ヘッダー=Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent) === 'Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent));
  check('方式B: 構造編集モード', await pg.evaluate(()=>mode) === 'struct', await pg.evaluate(()=>mode));

  await fitView(pg);
  await ss(pg, 'B_full');
  await show390at(pg, 0);   await ss(pg, 'B_390_r1');
  await show390at(pg, 1100); await ss(pg, 'B_390_r2');
  await show390at(pg, 2400); await ss(pg, 'B_390_r3');
  await show360at(pg, 0);   await ss(pg, 'B_360_r1');
  await show360at(pg, 1100); await ss(pg, 'B_360_r2');
  await show065at(pg, 0);   await ss(pg, 'B_read_top');
  await show065at(pg, 800);  await ss(pg, 'B_read_mid');
  await show065at(pg, 2000); await ss(pg, 'B_read_bot');

  // ─────────────────────────────────────────────
  // 方式B2: 横並び＋一本アンダーライン
  // ─────────────────────────────────────────────
  console.log('\n[方式B2: 冠詞インライン＋一本アンダーライン]');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.evaluate(() => { $('#ref').textContent = 'Colossians 1:3–8'; });
  await setMode(pg, 'B2');

  dims.B2 = await measureDiagram(pg);
  const rkB2 = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].map(g => ({dx:g.getAttribute('rk-dx'),dy:g.getAttribute('rk-dy')})));
  const xmlB2 = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  console.log(`  図寸法: 幅${dims.B2.maxX}px 高${dims.B2.maxY}px エッジ${dims.B2.edgeCount}`);
  check('方式B2: rk-dx/rk-dy 不変', JSON.stringify(rkA)===JSON.stringify(rkB2));
  check('方式B2: XML同一', xmlA===xmlB2, xmlA===xmlB2?'':`長差${Math.abs(xmlA.length-xmlB2.length)}`);
  check('方式B2: b2UL=true, b2Pairs>0', await pg.evaluate(()=>b2UL && b2Pairs.length>0));
  check('方式B2: ヘッダー=Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent) === 'Colossians 1:3–8', await pg.evaluate(()=>$('#ref').textContent));
  check('方式B2: 構造編集モード', await pg.evaluate(()=>mode) === 'struct', await pg.evaluate(()=>mode));

  // B2固有の検証
  const b2Data = await measureB2(pg);
  check('B2: b2Pairs数=12', b2Data.pairCount===12, `実値:${b2Data.pairCount}`); // detInline=true + NPofNP inline (+3)
  check('B2: 全ペアにel参照あり', b2Data.pairs.every(pr=>pr.elOk), `OK件数:${b2Data.pairs.filter(pr=>pr.elOk).length}`);
  check('B2: B/B2の幅・高さ一致', dims.B.maxX===dims.B2.maxX&&dims.B.maxY===dims.B2.maxY,
    `B:${dims.B.maxX}x${dims.B.maxY} B2:${dims.B2.maxX}x${dims.B2.maxY}`);

  console.log('  一本下線の詳細:');
  b2Data.pairs.forEach((pr, i) => {
    console.log(`    ${i+1}. ${pr.det} ${pr.noun}  x:${pr.detX}→${pr.nounX}(+${pr.nounW}) 幅:${pr.spanW}px elOk:${pr.elOk}`);
  });

  await fitView(pg);
  await ss(pg, 'B2_full');
  await show390at(pg, 0);   await ss(pg, 'B2_390_r1');
  await show390at(pg, 1100); await ss(pg, 'B2_390_r2');
  await show390at(pg, 2400); await ss(pg, 'B2_390_r3');
  await show360at(pg, 0);   await ss(pg, 'B2_360_r1');
  await show360at(pg, 1100); await ss(pg, 'B2_360_r2');
  await show065at(pg, 0);   await ss(pg, 'B2_read_top');
  await show065at(pg, 800);  await ss(pg, 'B2_read_mid');
  await show065at(pg, 2000); await ss(pg, 'B2_read_bot');

  // ─────────────────────────────────────────────
  // 回帰: B2→A→B→B2→A で方式Aが完全一致
  // ─────────────────────────────────────────────
  console.log('\n[回帰: A→B→B2→A ラウンドトリップ]');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.evaluate(() => { $('#ref').textContent = 'Colossians 1:3–8'; });

  for (const m of ['A', 'B', 'B2', 'A']) await setMode(pg, m);

  const dimReg = await measureDiagram(pg);
  const rkReg  = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].map(g => ({dx:g.getAttribute('rk-dx'),dy:g.getAttribute('rk-dy')})));
  const xmlReg = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));

  check('回帰: maxX一致', dimReg.maxX===dims.A.maxX, `A:${dims.A.maxX} reg:${dimReg.maxX}`);
  check('回帰: maxY一致', dimReg.maxY===dims.A.maxY, `A:${dims.A.maxY} reg:${dimReg.maxY}`);
  check('回帰: wordCount一致', dimReg.wordCount===dims.A.wordCount);
  check('回帰: edgeCount一致', dimReg.edgeCount===dims.A.edgeCount);
  check('回帰: rk-dx/rk-dy不変', JSON.stringify(rkA)===JSON.stringify(rkReg));
  check('回帰: XML不変', xmlA===xmlReg);
  check('回帰: b2Pairs空 (方式A)', await pg.evaluate(()=>b2Pairs.length===0));

  // Auto Layout 回帰
  await setMode(pg, 'B2');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.evaluate(() => { $('#ref').textContent = 'Colossians 1:3–8'; });
  await setMode(pg, 'B2');
  const dimBeforeAL = await measureDiagram(pg);
  await pg.click('#al');
  await wait(300);
  const dimAfterAL = await measureDiagram(pg);
  check('Auto Layout後B2: maxY一致', dimBeforeAL.maxY===dimAfterAL.maxY, `前:${dimBeforeAL.maxY} 後:${dimAfterAL.maxY}`);

  // コンソールエラー
  check('コンソールエラーなし', errs.length===0, `${errs.length}件`);
  if (errs.length) errs.slice(0,3).forEach(e=>console.log('  エラー:',e));

  // ─────────────────────────────────────────────
  // 三方式比較サマリ
  // ─────────────────────────────────────────────
  console.log('\n=== 三方式比較サマリ ===');
  console.log(`  幅:   A=${dims.A.maxX}  B=${dims.B.maxX} (${dims.B.maxX>dims.A.maxX?'+':''}${dims.B.maxX-dims.A.maxX})  B2=${dims.B2.maxX} (${dims.B2.maxX>dims.A.maxX?'+':''}${dims.B2.maxX-dims.A.maxX})`);
  console.log(`  高さ: A=${dims.A.maxY}  B=${dims.B.maxY} (${dims.B.maxY-dims.A.maxY})  B2=${dims.B2.maxY} (${dims.B2.maxY-dims.A.maxY})`);
  console.log(`  エッジ: A=${dims.A.edgeCount}  B=${dims.B.edgeCount}  B2=${dims.B2.edgeCount}`);
  console.log(`  @k=0.5: A=${Math.round(dims.A.maxY*0.5)}px B=${Math.round(dims.B.maxY*0.5)}px B2=${Math.round(dims.B2.maxY*0.5)}px`);
  console.log(`  @k=0.65: A=${Math.round(dims.A.maxY*0.65)}px B=${Math.round(dims.B.maxY*0.65)}px B2=${Math.round(dims.B2.maxY*0.65)}px`);

  await b.close();
  console.log('\n=== Phase 7 完了 ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
