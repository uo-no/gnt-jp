/**
 * task7_survey.js — Phase 1: 現状測定
 *
 * Colossians 1:3-8 と Luke 3:23-38 の現在の配置を測定する。
 * コード変更なし。
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS = path.resolve(__dirname, 'task7_ss');
const XML_OUT = path.resolve(__dirname, 'task7_xml');
if (!fs.existsSync(SS)) fs.mkdirSync(SS, {recursive: true});
if (!fs.existsSync(XML_OUT)) fs.mkdirSync(XML_OUT, {recursive: true});

const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ss = (pg, name) => pg.screenshot({path: path.join(SS, name + '.png'),
  clip:{x:0,y:0,width:VW,height:VH}}).then(() => console.log('  📷', name + '.png'));

async function loadVerse(pg, xmlFile, idx) {
  await pg.evaluate(() => { window.__oldBook = BOOK; });
  await (await pg.$('#fi')).uploadFile(DIR + xmlFile);
  await pg.waitForFunction(`BOOK && BOOK !== window.__oldBook`, {timeout: 30000});
  await pg.evaluate(i => go(i), idx);
  await wait(500);
}

// Show all groups with their positions
async function surveyGroups(pg) {
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
        autoY: Math.round(gm.nom),
        visualY: Math.round(gm.py),
        minX: Math.round(Math.min(...xs)),
        maxX: Math.round(Math.max(...xws)),
        minY: Math.round(Math.min(...ys)),
        maxY: Math.round(Math.max(...ys)),
        rk_dx: gEl.getAttribute('rk-dx') || '0',
        rk_dy: gEl.getAttribute('rk-dy') || '0',
        wordCount: ws.length,
        // ax: auto-computed x from words (before rk-dx offset)
        autoX: Math.round(Math.min(...ws.map(w => w.ax || w.x))),
      });
    }
    return results.sort((a, b) => a.minX - b.minX);
  });
}

// Get bounding box of entire diagram
async function getDiagramBB(pg) {
  return await pg.evaluate(() => {
    if (!words || !words.length) return null;
    return {
      xMin: Math.round(Math.min(...words.map(w => w.x))),
      xMax: Math.round(Math.max(...words.map(w => w.x + w.w))),
      yMin: Math.round(Math.min(...words.map(w => w.y))),
      yMax: Math.round(Math.max(...words.map(w => w.y))),
      wordCount: words.length,
    };
  });
}

// Get XML from the app for backup
async function getXml(pg) {
  // Trigger JSON sync to get current state including rk-dx/rk-dy
  return await pg.evaluate(() => {
    // serialize the current document XML
    const ser = new XMLSerializer();
    return ser.serializeToString(doc);
  });
}

// Fit view to content
async function fitView(pg) {
  await pg.evaluate((vw, vh) => {
    const xs = words.map(w => w.x), ys = words.map(w => w.y);
    const x1 = Math.min(...xs) - 30, x2 = Math.max(...words.map(w => w.x + w.w)) + 30;
    const y1 = Math.min(...ys) - 30, y2 = Math.max(...ys) + 50;
    const k = Math.min((vw - 40) / (x2 - x1 || 1), (vh - 80) / (y2 - y1 || 1), 1.0);
    view.k = k; view.x = 20 - x1*k; view.y = 40 - y1*k; applyView();
  }, VW, VH);
}

// Show 390px viewport guide and readable zoom (k=0.5)
async function show390(pg) {
  await pg.evaluate(() => {
    view.k = 0.5;
    view.x = 20;
    view.y = 40;
    applyView();
  });
}

(async () => {
  console.log('=== Task 7 Phase 1: 現状測定 ===\n');
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

  // ──────────────────────────────────────────────
  // Colossians 1:3-8 調査
  // ──────────────────────────────────────────────
  console.log('[Colossians 1:3-8]');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL');
  await wait(300);

  // L字形ルーティング確認（mod エッジが pd() を使っているか）
  const lShapeCheck = await pg.evaluate(() => {
    const s = pd.toString();
    return s.includes('V${by}H${tx}') || s.includes('V${by-24}H${tx}');
  });
  console.log('  L字形ルーティング実装確認:', lShapeCheck ? 'CONFIRMED' : 'NOT DETECTED');

  const colBB = await getDiagramBB(pg);
  console.log('  ダイアグラム全体サイズ (SVG px):',
    `幅${colBB.xMax - colBB.xMin} 高さ${colBB.yMax - colBB.yMin}`,
    `(x:${colBB.xMin}~${colBB.xMax}, y:${colBB.yMin}~${colBB.yMax})`);
  console.log('  語数:', colBB.wordCount);
  console.log('  スマホ390px × k=0.5 = 780SVG幅に対して', Math.ceil((colBB.xMax - colBB.xMin) / 780), '画面分');

  const colGroups = await surveyGroups(pg);
  console.log('\n  GMグループ一覧（x昇順）:');
  colGroups.forEach(g => {
    const needsFold = g.maxX > 780 ? '★折返候補' : '';
    console.log(`  [x${g.minX}~${g.maxX} y${g.minY}~${g.maxY}] dx=${g.rk_dx} dy=${g.rk_dy} "${g.desc.substring(0,30)}" ${needsFold}`);
  });

  // Groups that need folding (rightmost extent > 780)
  const colFoldCandidates = colGroups.filter(g => g.minX > 780).sort((a, b) => b.minX - a.minX);
  console.log(`\n  折返候補 (minX > 780): ${colFoldCandidates.length}件`);
  colFoldCandidates.forEach(g => {
    console.log(`  → minX=${g.minX} maxX=${g.maxX} autoX=${g.autoX} "${g.desc.substring(0,40)}"`);
  });

  // Save current XML (before any changes)
  const colXmlBefore = await getXml(pg);
  fs.writeFileSync(path.join(XML_OUT, 'col_before.xml'), colXmlBefore, 'utf8');
  console.log('\n  バックアップ保存: task7_xml/col_before.xml');

  // Screenshots: full view
  await fitView(pg);
  await wait(200);
  await ss(pg, 'col_before_full');

  // 390px guide view (k=0.5)
  await show390(pg);
  await wait(200);
  await ss(pg, 'col_before_390');

  // ──────────────────────────────────────────────
  // Luke 3:23-38 調査
  // ──────────────────────────────────────────────
  console.log('\n[Luke 3:23-38]');
  await loadVerse(pg, '03-luke.xml', 119);
  await pg.click('#mL');
  await wait(300);

  const lukBB = await getDiagramBB(pg);
  console.log('  ダイアグラム全体サイズ (SVG px):',
    `幅${lukBB.xMax - lukBB.xMin} 高さ${lukBB.yMax - lukBB.yMin}`,
    `(x:${lukBB.xMin}~${lukBB.xMax}, y:${lukBB.yMin}~${lukBB.yMax})`);
  console.log('  語数:', lukBB.wordCount);
  console.log('  スマホ390px × k=0.5 = 780SVG幅に対して', Math.ceil((lukBB.xMax - lukBB.xMin) / 780), '画面分');

  const lukGroups = await surveyGroups(pg);
  console.log('\n  GMグループ一覧（x昇順）:');
  lukGroups.forEach(g => {
    const needsFold = g.minX > 780 ? '★折返候補' : '';
    console.log(`  [x${g.minX}~${g.maxX} y${g.minY}~${g.maxY}] dx=${g.rk_dx} dy=${g.rk_dy} "${g.desc.substring(0,30)}" ${needsFold}`);
  });

  const lukFoldCandidates = lukGroups.filter(g => g.minX > 780).sort((a, b) => b.minX - a.minX);
  console.log(`\n  折返候補 (minX > 780): ${lukFoldCandidates.length}件`);
  lukFoldCandidates.forEach(g => {
    console.log(`  → minX=${g.minX} maxX=${g.maxX} autoX=${g.autoX} "${g.desc.substring(0,40)}"`);
  });

  // Save Luke XML before
  const lukXmlBefore = await getXml(pg);
  fs.writeFileSync(path.join(XML_OUT, 'luk_before.xml'), lukXmlBefore, 'utf8');
  console.log('\n  バックアップ保存: task7_xml/luk_before.xml');

  // Screenshots
  await fitView(pg);
  await wait(200);
  await ss(pg, 'luk_before_full');

  await show390(pg);
  await wait(200);
  await ss(pg, 'luk_before_390');

  // Error check
  console.log('\nコンソールエラー:', errs.length > 0 ? errs.join('; ') : 'なし');

  await b.close();
  console.log('\n=== Phase 1 完了 ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
