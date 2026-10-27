/**
 * task7_phase6_ab.js — Phase 6: 冠詞インラインA/B比較
 *
 * Colossians 1:3-8 を対象に方式A (通常) と方式B (冠詞インライン) を比較する。
 * XMLデータは変更しない。
 *
 * 出力:
 *   tests/task7_phase6_ss/  — A/B比較スクリーンショット
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const XML_OUT = path.resolve(__dirname, 'task7_xml');
const SS_OUT = path.resolve(__dirname, 'task7_phase6_ss');

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

/** k=0.5 (390px相当) で svgY を上端に表示 */
async function show390at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.5; view.x = 20; view.y = 40 - sy * 0.5; applyView();
  }, svgY);
}

/** k=0.65 (読書ズーム相当) で svgY を上端に表示 */
async function show065at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.65; view.x = 20; view.y = 40 - sy * 0.65; applyView();
  }, svgY);
}

/** 全体フィット */
async function fitView(pg) {
  await pg.evaluate((vw, vh) => {
    const xs = words.map(w => w.x), ys = words.map(w => w.y);
    const x1 = Math.min(...xs) - 30, x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
    const y1 = Math.min(...ys) - 30, y2 = Math.max(...ys) + 50;
    const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 1.0);
    view.k = k; view.x = 20 - x1 * k; view.y = 40 - y1 * k; applyView();
  }, VW, VH);
}

/** 図の寸法を測定する */
async function measureDiagram(pg) {
  return await pg.evaluate(() => {
    const xs = words.map(w => w.x);
    const ys = words.map(w => w.y);
    return {
      minX: Math.round(Math.min(...xs)),
      maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
      minY: Math.round(Math.min(...ys)),
      maxY: Math.round(Math.max(...ys)),
      wordCount: words.length,
      edgeCount: edges.length,
    };
  });
}

/** インライン適用された冠詞+名詞ペアを調べる */
async function measureInlinePairs(pg) {
  return await pg.evaluate(() => {
    // detInline=true のとき、colocated det+noun (同じ y) を数える
    const detWords = words.filter(w => w.el.getAttribute('class') === 'det');
    const pairs = [];
    for (const d of detWords) {
      // 同じy行に頭語が存在するか
      const sibling = words.find(w => w !== d && Math.abs(w.y - d.y) < 1 && Math.abs(w.x - (d.x + d.w + 14)) < 30);
      if (sibling) {
        pairs.push({
          det: d.text,
          noun: sibling.text,
          x: Math.round(d.x),
          y: Math.round(d.y),
        });
      }
    }
    return pairs;
  });
}

/** GMグループの最小x/最大xを測定 */
async function measureGroups(pg) {
  return await pg.evaluate(() => {
    const results = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      results.push({
        minX: Math.round(Math.min(...ws.map(w => w.x))),
        maxX: Math.round(Math.max(...ws.map(w => w.x + w.w))),
        minY: Math.round(Math.min(...ws.map(w => w.y))),
        rk_dx: gEl.getAttribute('rk-dx') || '0',
        rk_dy: gEl.getAttribute('rk-dy') || '0',
      });
    }
    return results;
  });
}

(async () => {
  if (!fs.existsSync(SS_OUT)) fs.mkdirSync(SS_OUT, {recursive: true});

  console.log('=== Task 7 Phase 6: 冠詞インライン A/B 比較 ===\n');
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

  // ─────────────────────────────────────────────
  // 方式A: 通常表示
  // ─────────────────────────────────────────────
  console.log('[方式A: 通常表示]');
  const loadedA = await pg.evaluate(xml => fresh(xml), colXml);
  await wait(300);
  await pg.click('#mL');
  await wait(200);

  // detInlineがfalseであることを確認
  const diStateA = await pg.evaluate(() => detInline);
  check('方式A: detInline=false', diStateA === false, `実値: ${diStateA}`);

  const dimA = await measureDiagram(pg);
  console.log(`  図寸法: 幅${dimA.maxX}px 高${dimA.maxY}px (${dimA.wordCount}語 ${dimA.edgeCount}エッジ)`);

  const grpsA = await measureGroups(pg);
  const overA = grpsA.filter(g => g.minX > 780);
  check('方式A: GMグループ全て minX ≤ 780', overA.length === 0, `超過${overA.length}件`);

  // rk-dx/rk-dy の属性値記録
  const rkA = await pg.evaluate(() => {
    const gs = [...doc.querySelectorAll('wg[rk-dx]')];
    return gs.map(g => ({dx: g.getAttribute('rk-dx'), dy: g.getAttribute('rk-dy')}));
  });
  console.log(`  rk-dx/rk-dy 属性数: ${rkA.length}件`);
  rkA.forEach((g, i) => console.log(`    ${i+1}. rk-dx=${g.dx} rk-dy=${g.dy}`));

  // スクリーンショット A
  await fitView(pg);
  await wait(150);
  await ss(pg, 'A_full');

  const rowsA = [[0, 'r1_y0'], [1100, 'r2_y1100'], [2400, 'r3_y2400']];
  for (const [y, label] of rowsA) {
    await show390at(pg, y);
    await wait(100);
    await ss(pg, `A_390_${label}`);
  }
  await show065at(pg, 0);
  await ss(pg, 'A_read_top');
  await show065at(pg, 800);
  await ss(pg, 'A_read_mid');
  await show065at(pg, 2000);
  await ss(pg, 'A_read_bot');

  // XML が変わっていないことを確認
  const xmlAfterA = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));

  // ─────────────────────────────────────────────
  // 方式B: 冠詞インライン表示
  // ─────────────────────────────────────────────
  console.log('\n[方式B: 冠詞インライン表示]');

  // 同じXMLをリロードしてからモード切替 (A/Bで同一起点を保証)
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);

  // detInline を true にして再描画
  await pg.evaluate(() => {
    detInline = true;
    $('#di').classList.add('on');
    refresh();
  });
  await wait(200);

  const diStateB = await pg.evaluate(() => detInline);
  check('方式B: detInline=true', diStateB === true, `実値: ${diStateB}`);

  const dimB = await measureDiagram(pg);
  console.log(`  図寸法: 幅${dimB.maxX}px 高${dimB.maxY}px (${dimB.wordCount}語 ${dimB.edgeCount}エッジ)`);

  const grpsB = await measureGroups(pg);
  const overB = grpsB.filter(g => g.minX > 780);
  check('方式B: GMグループ全て minX ≤ 780', overB.length === 0, `超過${overB.length}件`);

  // rk-dx/rk-dy 不変確認
  const rkB = await pg.evaluate(() => {
    const gs = [...doc.querySelectorAll('wg[rk-dx]')];
    return gs.map(g => ({dx: g.getAttribute('rk-dx'), dy: g.getAttribute('rk-dy')}));
  });
  const rkUnchanged = JSON.stringify(rkA) === JSON.stringify(rkB);
  check('方式B: rk-dx/rk-dy 属性値が不変', rkUnchanged, `A:${JSON.stringify(rkA)} B:${JSON.stringify(rkB)}`);

  // XML の本文が変わっていないことを確認
  const xmlAfterB = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  const xmlSame = xmlAfterA === xmlAfterB;
  check('方式B: XML serialize 結果がAと一致', xmlSame, xmlSame ? '' : `差分あり(${Math.abs(xmlAfterA.length-xmlAfterB.length)}文字差)`);

  // 冠詞インライン化されたペアを調べる
  const pairs = await measureInlinePairs(pg);
  console.log(`  横並び冠詞+名詞ペア: ${pairs.length}件`);
  pairs.forEach(pair => console.log(`    τ:${pair.det} noun:${pair.noun} @ (${pair.x}, ${pair.y})`));

  // エッジ数変化
  console.log(`  エッジ数: A=${dimA.edgeCount} → B=${dimB.edgeCount} (差: ${dimB.edgeCount - dimA.edgeCount})`);
  console.log(`  語数:     A=${dimA.wordCount} → B=${dimB.wordCount} (差: ${dimB.wordCount - dimA.wordCount})`);

  // スクリーンショット B
  await fitView(pg);
  await wait(150);
  await ss(pg, 'B_full');

  const rowsB = [[0, 'r1_y0'], [1100, 'r2_y1100'], [2400, 'r3_y2400']];
  for (const [y, label] of rowsB) {
    await show390at(pg, y);
    await wait(100);
    await ss(pg, `B_390_${label}`);
  }
  await show065at(pg, 0);
  await ss(pg, 'B_read_top');
  await show065at(pg, 800);
  await ss(pg, 'B_read_mid');
  await show065at(pg, 2000);
  await ss(pg, 'B_read_bot');

  // ─────────────────────────────────────────────
  // A に戻す確認 (回帰)
  // ─────────────────────────────────────────────
  console.log('\n[回帰: 方式Aに戻す]');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  // detInline をリセット
  await pg.evaluate(() => {
    detInline = false;
    $('#di').classList.remove('on');
    refresh();
  });
  await wait(200);

  const dimReg = await measureDiagram(pg);
  check('回帰: 方式AのmaxY一致', dimReg.maxY === dimA.maxY, `A:${dimA.maxY} reg:${dimReg.maxY}`);
  check('回帰: 方式AのmaxX一致', dimReg.maxX === dimA.maxX, `A:${dimA.maxX} reg:${dimReg.maxX}`);
  check('回帰: wordCount一致', dimReg.wordCount === dimA.wordCount, `A:${dimA.wordCount} reg:${dimReg.wordCount}`);
  check('回帰: edgeCount一致', dimReg.edgeCount === dimA.edgeCount, `A:${dimA.edgeCount} reg:${dimReg.edgeCount}`);

  // コンソールエラー確認
  check('コンソールエラーなし', errs.length === 0, `${errs.length}件`);
  if (errs.length) errs.slice(0, 3).forEach(e => console.log('  エラー:', e));

  // ─────────────────────────────────────────────
  // 比較サマリ
  // ─────────────────────────────────────────────
  console.log('\n=== 比較サマリ ===');
  console.log(`  幅   A: ${dimA.maxX}px  →  B: ${dimB.maxX}px  (差: ${dimB.maxX - dimA.maxX}px)`);
  console.log(`  高さ A: ${dimA.maxY}px  →  B: ${dimB.maxY}px  (差: ${dimB.maxY - dimA.maxY}px)`);
  console.log(`  エッジ A: ${dimA.edgeCount}  →  B: ${dimB.edgeCount}  (mod辺が減少/変化)`);
  console.log(`  インライン適用ペア数: ${pairs.length}件`);
  console.log(`\n  スクリーンショット: ${SS_OUT}/`);
  console.log('    A_full.png, B_full.png         — 全体フィット比較');
  console.log('    A_390_r*.png, B_390_r*.png      — 390px相当 (k=0.5)');
  console.log('    A_read_*.png, B_read_*.png       — k=0.65 読書ズーム相当');

  await b.close();
  console.log('\n=== Phase 6 完了 ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
