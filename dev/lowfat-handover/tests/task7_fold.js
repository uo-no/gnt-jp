/**
 * task7_fold.js — Phase 2: スマホ向けレイアウト折り返し適用
 *
 * Colossians 1:3-8 と Luke 3:23-38 に rk-dx/rk-dy を適用して 390px 対応配置を確定する。
 * 変更: rk-dx/rk-dy 属性のみ。コード・XML 構造・原文データ不変。
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS = path.resolve(__dirname, 'task7_ss');
const XML_OUT = path.resolve(__dirname, 'task7_xml');

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
  await wait(500);
}

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

async function show390(pg, startX = 0) {
  await pg.evaluate((sx) => {
    view.k = 0.5; view.x = 20 - sx * 0.5; view.y = 40; applyView();
  }, startX);
}

// GM グループを bd() 説明文で検索
async function findGroupByDesc(pg, desc) {
  return await pg.evaluate((d) => {
    for (const [gEl, gm] of GM) {
      if (bd(gEl) === d) return true;
    }
    return false;
  }, desc);
}

// GM グループに rk-dx/rk-dy を適用
async function applyFold(pg, desc, dy, dx) {
  const result = await pg.evaluate((d, dy, dx) => {
    for (const [gEl, gm] of GM) {
      if (bd(gEl) === d) {
        applyGroupOffset(gEl, dy, dx);
        draw(); sync();
        return {found: true, nom: gm.nom, py: gm.py};
      }
    }
    return {found: false};
  }, desc, dy, dx);
  return result;
}

// 現在の全 GM グループを測定
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
        rk_dx: gEl.getAttribute('rk-dx') || '0',
        rk_dy: gEl.getAttribute('rk-dy') || '0',
      });
    }
    return results.sort((a, b) => a.minX - b.minX);
  });
}

async function getDiagramBB(pg) {
  return await pg.evaluate(() => ({
    xMin: Math.round(Math.min(...words.map(w => w.x))),
    xMax: Math.round(Math.max(...words.map(w => w.x + w.w))),
    yMin: Math.round(Math.min(...words.map(w => w.y))),
    yMax: Math.round(Math.max(...words.map(w => w.y))),
  }));
}

// =====================================
// Colossians 折り返し計画
// =====================================
// 対象グループ (折り返し前の minX):
//   1. "名詞句「πατρὶ τοῦ κυρίου」" minX≈1039
//      → rk-dx: 30 - 1039 = -1009 (x=30 へ)
//      → rk-dy: 950 - nom(≈62) = +888 (y≈1000 へ, 左列 y950 の下)
//   2. "節「καὶ ἐν παντὶ」" minX≈1392
//      → rk-dx: 30 - 1392 = -1362 (x=30 へ)
//      → rk-dy: 1200 - nom(≈24) = +1176 (y≈1200 へ, NP mods の下)
// =====================================

// =====================================
// Luke 折り返し計画
// =====================================
// 系譜カスケードを 780px 幅ごとに折り返す。rk-dx=-780 を適用するだけ。
// y は自然に連続するため rk-dy 不要。
//   1. "名詞句「τοῦ Ναοὺμ τοῦ」" minX=781 → rk-dx=-780
//   2. "名詞句「τοῦ Ἰωνὰμ τοῦ」" minX=781 (fold1後) → rk-dx=-780
//   3. "名詞句「τοῦ Ἔβερ τοῦ」" minX=781 (fold2後) → rk-dx=-780
// =====================================

(async () => {
  console.log('=== Task 7 Phase 2: 折り返し適用 ===\n');
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
  // Colossians 1:3-8
  // ──────────────────────────────────────────────
  console.log('[Colossians 1:3-8 — 折り返し適用]');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL');
  await wait(300);

  // 折り返し前の測定
  const colBefore = await getDiagramBB(pg);
  console.log(`  折り返し前: 幅${colBefore.xMax} 高さ${colBefore.yMax - colBefore.yMin}`);

  // Fold 1: "名詞句「πατρὶ τοῦ κυρίου」" を下へ・左へ
  const colDesc1 = '名詞句「πατρὶ τοῦ κυρίου」';
  const colFold1 = await applyFold(pg, colDesc1, 938, -1009);
  if (colFold1.found) {
    console.log(`  ✓ Fold1 適用: "${colDesc1}" nom=${colFold1.nom} → dy=+938 dx=-1009`);
  } else {
    console.log(`  ✗ Fold1 失敗: グループ "${colDesc1}" が見つからない`);
  }
  await wait(200);

  // 中間状態の確認
  const colMid = await getDiagramBB(pg);
  console.log(`  Fold1後: 幅${colMid.xMax} 高さ${colMid.yMax - colMid.yMin}`);

  // Fold 2: "節「καὶ ἐν παντὶ」" を下へ・左へ
  const colDesc2 = '節「καὶ ἐν παντὶ」';
  const colFold2 = await applyFold(pg, colDesc2, 1176, -1362);
  if (colFold2.found) {
    console.log(`  ✓ Fold2 適用: "${colDesc2}" nom=${colFold2.nom} → dy=+1176 dx=-1362`);
  } else {
    console.log(`  ✗ Fold2 失敗: グループ "${colDesc2}" が見つからない`);
  }
  await wait(200);

  // 折り返し後の測定
  const colAfter = await getDiagramBB(pg);
  console.log(`  折り返し後: 幅${colAfter.xMax} 高さ${colAfter.yMax - colAfter.yMin}`);

  // GM 状態確認 (x>780 の残存グループ)
  const colGroups = await measureGroups(pg);
  const colOver780 = colGroups.filter(g => g.minX > 780);
  console.log(`  780px超えグループ残存: ${colOver780.length}件`);
  colOver780.slice(0, 5).forEach(g =>
    console.log(`    x${g.minX}~${g.maxX} "${g.desc.substring(0, 40)}"`)
  );

  // XML 保存
  const colXmlAfter = await getXml(pg);
  fs.writeFileSync(path.join(XML_OUT, 'col_after_fold.xml'), colXmlAfter, 'utf8');
  console.log('  XML 保存: task7_xml/col_after_fold.xml');

  // スクリーンショット
  await fitView(pg);
  await wait(200);
  await ss(pg, 'col_fold_full');

  await show390(pg, 0);
  await wait(200);
  await ss(pg, 'col_fold_390_row1');

  await show390(pg, 0);
  await pg.evaluate(() => { view.y = 40 - 950 * 0.5; applyView(); });
  await wait(200);
  await ss(pg, 'col_fold_390_row2');

  await show390(pg);
  await pg.evaluate(() => { view.y = 40 - 1150 * 0.5; applyView(); });
  await wait(200);
  await ss(pg, 'col_fold_390_row3');

  // ──────────────────────────────────────────────
  // Luke 3:23-38
  // ──────────────────────────────────────────────
  console.log('\n[Luke 3:23-38 — 折り返し適用]');
  await loadVerse(pg, '03-luke.xml', 119);
  await pg.click('#mL');
  await wait(300);

  const lukBefore = await getDiagramBB(pg);
  console.log(`  折り返し前: 幅${lukBefore.xMax} 高さ${lukBefore.yMax - lukBefore.yMin}`);

  // Fold 1: τοῦ Ναούμ (gen9, x=781) → rk-dx=-780
  const lukDesc1 = '名詞句「τοῦ Ναοὺμ τοῦ」';
  const lukFold1 = await applyFold(pg, lukDesc1, 0, -780);
  if (lukFold1.found) {
    console.log(`  ✓ Fold1 適用: "${lukDesc1}" → dx=-780`);
  } else {
    console.log(`  ✗ Fold1 失敗: グループが見つからない`);
  }
  await wait(200);

  const lukMid1 = await getDiagramBB(pg);
  console.log(`  Fold1後: 幅${lukMid1.xMax} 高さ${lukMid1.yMax - lukMid1.yMin}`);

  // Fold 2: τοῦ Ἰωνάμ (gen35, now at x=781 after fold1) → rk-dx=-780
  const lukDesc2 = '名詞句「τοῦ Ἰωνὰμ τοῦ」';
  const lukFold2 = await applyFold(pg, lukDesc2, 0, -780);
  if (lukFold2.found) {
    console.log(`  ✓ Fold2 適用: "${lukDesc2}" → dx=-780`);
  } else {
    console.log(`  ✗ Fold2 失敗: グループが見つからない`);
  }
  await wait(200);

  const lukMid2 = await getDiagramBB(pg);
  console.log(`  Fold2後: 幅${lukMid2.xMax} 高さ${lukMid2.yMax - lukMid2.yMin}`);

  // Fold 3: τοῦ Ἔβερ (gen61, now at x=781 after fold2) → rk-dx=-780
  const lukDesc3 = '名詞句「τοῦ Ἔβερ τοῦ」';
  const lukFold3 = await applyFold(pg, lukDesc3, 0, -780);
  if (lukFold3.found) {
    console.log(`  ✓ Fold3 適用: "${lukDesc3}" → dx=-780`);
  } else {
    console.log(`  ✗ Fold3 失敗: グループが見つからない`);
  }
  await wait(200);

  const lukAfter = await getDiagramBB(pg);
  console.log(`  折り返し後: 幅${lukAfter.xMax} 高さ${lukAfter.yMax - lukAfter.yMin}`);

  // GM 状態確認
  const lukGroups = await measureGroups(pg);
  const lukOver780 = lukGroups.filter(g => g.minX > 780);
  console.log(`  780px超えグループ残存: ${lukOver780.length}件`);
  lukOver780.slice(0, 5).forEach(g =>
    console.log(`    x${g.minX}~${g.maxX} "${g.desc.substring(0, 40)}"`)
  );

  // XML 保存
  const lukXmlAfter = await getXml(pg);
  fs.writeFileSync(path.join(XML_OUT, 'luk_after_fold.xml'), lukXmlAfter, 'utf8');
  console.log('  XML 保存: task7_xml/luk_after_fold.xml');

  // スクリーンショット
  await fitView(pg);
  await wait(200);
  await ss(pg, 'luk_fold_full');

  await show390(pg, 0);
  await wait(200);
  await ss(pg, 'luk_fold_390_top');

  // 系譜部分 (y≈280 から)
  await pg.evaluate(() => { view.k = 0.5; view.x = 20; view.y = 40 - 280 * 0.5; applyView(); });
  await wait(200);
  await ss(pg, 'luk_fold_390_gen_fold1');

  // fold2 付近
  await pg.evaluate(() => { view.k = 0.5; view.x = 20; view.y = 40 - 2100 * 0.5; applyView(); });
  await wait(200);
  await ss(pg, 'luk_fold_390_gen_fold2');

  // fold3 付近
  await pg.evaluate(() => { view.k = 0.5; view.x = 20; view.y = 40 - 3300 * 0.5; applyView(); });
  await wait(200);
  await ss(pg, 'luk_fold_390_gen_fold3');

  // コンソールエラー
  console.log('\nコンソールエラー:', errs.length > 0 ? errs.join('; ') : 'なし');

  await b.close();
  console.log('\n=== Phase 2 完了 ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
