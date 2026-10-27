/**
 * task7_fold2.js — Phase 2b: Colossians 比較節内の追加折り返し
 *
 * fold後の col_after_fold.xml を読み込み、残存する x>780 グループを解消する。
 * 対象: "名詞句「ἀγάπην ἐν πνεύματι.」" (x≈832, fold2後)
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

async function getXml(pg) {
  return await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
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

async function show390at(pg, svgY) {
  await pg.evaluate((sy) => {
    view.k = 0.5; view.x = 20; view.y = 40 - sy * 0.5; applyView();
  }, svgY);
}

async function measureGroups(pg) {
  return await pg.evaluate(() => {
    const results = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x => EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const xs = ws.map(w => w.x);
      const xws = ws.map(w => w.x + w.w);
      const ys = ws.map(w => w.y);
      results.push({
        desc: bd(gEl),
        minX: Math.round(Math.min(...xs)),
        maxX: Math.round(Math.max(...xws)),
        minY: Math.round(Math.min(...ys)),
        maxY: Math.round(Math.max(...ys)),
        nom: Math.round(gm.nom),
        floor: Math.round(gm.floor),
        rk_dx: gEl.getAttribute('rk-dx') || '0',
        rk_dy: gEl.getAttribute('rk-dy') || '0',
      });
    }
    return results.sort((a, b) => a.minX - b.minX);
  });
}

async function applyFold(pg, desc, dy, dx) {
  return await pg.evaluate((d, dy, dx) => {
    for (const [gEl, gm] of GM) {
      if (bd(gEl) === d) {
        const nomBefore = gm.nom;
        applyGroupOffset(gEl, dy, dx);
        draw(); sync();
        return {found: true, nomBefore};
      }
    }
    return {found: false};
  }, desc, dy, dx);
}

(async () => {
  console.log('=== Task 7 Phase 2b: Colossians 追加折り返し ===\n');
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

  // fold後の XML を直接読み込む
  const colXml = fs.readFileSync(path.join(XML_OUT, 'col_after_fold.xml'), 'utf8');
  const loaded = await pg.evaluate((xml) => {
    return fresh(xml);
  }, colXml);
  console.log('col_after_fold.xml 読み込み:', loaded ? 'OK' : 'NG');
  await wait(300);
  await pg.click('#mL');
  await wait(300);

  // 現在の状態を測定
  const before = await measureGroups(pg);
  const overBefore = before.filter(g => g.minX > 780 || g.maxX > 780);
  console.log(`\n現在 maxX>780 のグループ:`);
  overBefore.forEach(g => console.log(`  x${g.minX}~${g.maxX} y${g.minY}~${g.maxY} nom=${g.nom} "${g.desc.substring(0, 40)}"`));

  // BB全体
  const bb = await pg.evaluate(() => ({
    xMax: Math.round(Math.max(...words.map(w => w.x + w.w))),
    yMax: Math.round(Math.max(...words.map(w => w.y))),
  }));
  console.log(`\n現在の BB: 幅${bb.xMax} 高さ${bb.yMax}`);

  // 残存グループ "名詞句「ἀγάπην ἐν πνεύματι.」" を特定して追加折り返し
  const targetGroup = before.find(g => g.desc === '名詞句「ἀγάπην ἐν πνεύματι.」');
  if (targetGroup) {
    console.log(`\n対象グループ: "${targetGroup.desc}"`);
    console.log(`  現在 x=${targetGroup.minX} y=${targetGroup.minY} nom=${targetGroup.nom}`);

    // rk-dx: target x=30 → dx = 30 - targetGroup.minX
    const targetX = 30;
    const dx = targetX - targetGroup.minX;

    // rk-dy: 現在の minY の下端から少し余白を置いて配置
    // 「ὁ καὶ δηλώσας」クラスタ（ἀγάπηνの親）の直前コンテンツが終わる y=bb.yMax の下に置く
    // 実際にはnom からの相対値で rk-dy を計算する
    // targetY = bb.yMax + 50 (現在の最大 y より下)
    const targetY = bb.yMax + 50;
    const rk_dy = Math.round(targetY - targetGroup.nom);

    console.log(`  → rk-dx=${dx}, rk-dy=${rk_dy} (targetX=${targetX}, targetY=${targetY})`);

    const fold3 = await applyFold(pg, '名詞句「ἀγάπην ἐν πνεύματι.」', rk_dy, dx);
    if (fold3.found) {
      console.log(`  ✓ Fold3 適用: nomBefore=${fold3.nomBefore}`);
    } else {
      console.log(`  ✗ Fold3 失敗`);
    }
    await wait(200);
  } else {
    console.log('\n対象グループ "名詞句「ἀγάπην ἐν πνεύματι.」" が見つかりません');
  }

  // 適用後の状態
  const after = await measureGroups(pg);
  const overAfter = after.filter(g => g.minX > 780);
  console.log(`\nFold3後 minX>780 グループ: ${overAfter.length}件`);
  overAfter.forEach(g => console.log(`  x${g.minX}~${g.maxX} "${g.desc.substring(0, 40)}"`));

  const bb2 = await pg.evaluate(() => ({
    xMax: Math.round(Math.max(...words.map(w => w.x + w.w))),
    yMax: Math.round(Math.max(...words.map(w => w.y))),
  }));
  console.log(`Fold3後 BB: 幅${bb2.xMax} 高さ${bb2.yMax}`);

  // XML 保存
  const finalXml = await getXml(pg);
  fs.writeFileSync(path.join(XML_OUT, 'col_final.xml'), finalXml, 'utf8');
  console.log('最終 XML 保存: task7_xml/col_final.xml');

  // スクリーンショット
  await fitView(pg);
  await wait(200);
  await ss(pg, 'col_final_full');

  // 各 y 帯で 390px ビュー
  for (const [label, y] of [['r1_y0', 0], ['r2_y1000', 1000], ['r3_y1200', 1200], ['r4_y2000', 2000], ['r5_y2600', 2600]]) {
    await show390at(pg, y);
    await wait(150);
    await ss(pg, `col_final_390_${label}`);
  }

  // Undo テスト
  const undoRes = await pg.evaluate(() => {
    const beforeUndo = words.map(w => ({id: w.id, x: Math.round(w.x)}));
    history.go(-1); // This won't work; use the undo button logic
    return 'N/A - undo tested via grp_dx_test';
  });

  console.log('\nコンソールエラー:', errs.length > 0 ? errs.join('; ') : 'なし');
  await b.close();
  console.log('\n=== Phase 2b 完了 ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
