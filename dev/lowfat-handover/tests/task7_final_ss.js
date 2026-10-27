/**
 * task7_final_ss.js — 通常ブック読み込み経路でのスクリーンショット
 *
 * 12-colossians.xml → sentence idx=2
 * 03-luke.xml → sentence idx=119
 * 390px (k=0.5) / 360px (k=0.46) / 読書ズーム(k=0.65) で各行を記録
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS = path.resolve('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_final_ss');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, {recursive: true});

const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ss = (pg, name) => pg.screenshot({
  path: path.join(SS, name + '.png'),
  clip: {x: 0, y: 0, width: VW, height: VH}
}).then(() => console.log('  📷', name + '.png'));

async function loadVerse(pg, xmlFile, idx) {
  await pg.evaluate(() => { window.__oldBook = BOOK; });
  await (await pg.$('#fi')).uploadFile(DIR + xmlFile);
  await pg.waitForFunction(`BOOK && BOOK !== window.__oldBook`, {timeout: 30000});
  await pg.evaluate(i => go(i), idx);
  await wait(600);
}

async function setView(pg, k, svgY = 0) {
  await pg.evaluate((k, sy) => {
    view.k = k; view.x = 20; view.y = 40 - sy * k; applyView();
  }, k, svgY);
}

async function fitView(pg) {
  await pg.evaluate((vw, vh) => {
    const xs = words.map(w => w.x), ys = words.map(w => w.y);
    const x1 = Math.min(...xs)-30, x2 = Math.max(...words.map(w=>w.x+w.w))+30;
    const y1 = Math.min(...ys)-30, y2 = Math.max(...ys)+50;
    const k = Math.min((vw-40)/(x2-x1||1),(vh-80)/(y2-y1||1),1.0);
    view.k=k; view.x=20-x1*k; view.y=40-y1*k; applyView();
  }, VW, VH);
}

(async () => {
  console.log('=== Task 7 最終スクリーンショット（通常ブック読み込み経路）===\n');
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport: {width: VW, height: VH}
  });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type()==='error'&&errs.push(m.text()));
  await pg.goto(APP);
  await wait(600);

  // ─── Colossians 1:3-8 ───
  console.log('[Colossians 1:3-8 — 12-colossians.xml idx=2]');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL');
  await wait(200);

  // rk-dx確認
  const colRk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  console.log(`  rk-dx確認: ${colRk}件`);

  const colBB = await pg.evaluate(() => ({
    xMax: Math.round(Math.max(...words.map(w=>w.x+w.w))),
    yMax: Math.round(Math.max(...words.map(w=>w.y))),
    gmOver: (() => {
      let n=0; for(const [gEl,gm] of GM){
        const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
        if(ws.length && Math.min(...ws.map(w=>w.x))>780) n++;
      } return n;
    })()
  }));
  console.log(`  BB: 幅${colBB.xMax} 高さ${colBB.yMax} GMover780:${colBB.gmOver}件`);

  // フルビュー
  await fitView(pg);
  await wait(200);
  await ss(pg, 'col_full_via_book');

  // 390px (k=0.5) 各行
  for (const [lbl, y] of [['row1_y0',0],['row2_y1100',1100],['row3_y2400',2400]]) {
    await setView(pg, 0.5, y);
    await wait(150);
    await ss(pg, `col_390_${lbl}`);
  }

  // 360px (k=0.46)
  for (const [lbl, y] of [['row1_y0',0],['row2_y1100',1100],['row3_y2400',2400]]) {
    await setView(pg, 0.46, y);
    await wait(150);
    await ss(pg, `col_360_${lbl}`);
  }

  // 読書ズーム (k=0.65 — 上部から)
  for (const [lbl, y] of [['top_y0',0],['mid_y800',800],['bot_y2000',2000]]) {
    await setView(pg, 0.65, y);
    await wait(150);
    await ss(pg, `col_read_${lbl}`);
  }

  // ─── Luke 3:23-38 ───
  console.log('\n[Luke 3:23-38 — 03-luke.xml idx=119]');
  await loadVerse(pg, '03-luke.xml', 119);
  await pg.click('#mL');
  await wait(200);

  const lukRk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  console.log(`  rk-dx確認: ${lukRk}件`);

  const lukBB = await pg.evaluate(() => ({
    xMax: Math.round(Math.max(...words.map(w=>w.x+w.w))),
    yMax: Math.round(Math.max(...words.map(w=>w.y))),
    gmOver: (() => {
      let n=0; for(const [gEl,gm] of GM){
        const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
        if(ws.length && Math.min(...ws.map(w=>w.x))>780) n++;
      } return n;
    })()
  }));
  console.log(`  BB: 幅${lukBB.xMax} 高さ${lukBB.yMax} GMover780:${lukBB.gmOver}件`);

  await fitView(pg);
  await wait(200);
  await ss(pg, 'luk_full_via_book');

  // 390px (k=0.5) fold付近
  for (const [lbl, y] of [
    ['top_y0',0], ['fold1_y900',900], ['fold2_y3080',3080],
    ['fold3_y5260',5260], ['bot_y6500',6500]
  ]) {
    await setView(pg, 0.5, y);
    await wait(150);
    await ss(pg, `luk_390_${lbl}`);
  }

  // 360px (k=0.46) fold付近
  for (const [lbl, y] of [['fold1_y900',900],['fold2_y3080',3080],['fold3_y5260',5260]]) {
    await setView(pg, 0.46, y);
    await wait(150);
    await ss(pg, `luk_360_${lbl}`);
  }

  // 読書ズーム (k=0.65) 上部
  for (const [lbl, y] of [['intro_y0',0],['gen_y280',280]]) {
    await setView(pg, 0.65, y);
    await wait(150);
    await ss(pg, `luk_read_${lbl}`);
  }

  console.log(`\nコンソールエラー: ${errs.length}件`);
  await b.close();
  console.log(`\nSS保存先: ${SS}`);
  console.log(`SS件数: ${fs.readdirSync(SS).filter(f=>f.endsWith('.png')).length}件`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
