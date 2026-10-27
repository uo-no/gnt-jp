/**
 * task7_audit.js — 6項目確認スクリプト
 *
 * 項目3: 座標の読込・保存・再読込再現性
 * 項目4: Auto Layout / 手動配置リセット / グループ移動を解除 の rk-dx/rk-dy への影響
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const XML_OUT = path.resolve('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml');
const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));

function check(label, ok, detail) {
  console.log(`  [${ok?'PASS':'FAIL'}] ${label}${detail?' — '+detail:''}`);
  return ok;
}

(async () => {
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

  let pass=0, fail=0;
  const P = (l,ok,d) => { const r=check(l,ok,d); ok?pass++:fail++; return r; };

  // =============================================
  // Col を col_final.xml から直接 loadBook で開く
  // =============================================
  console.log('\n=== 項目3: 座標の読込・保存・再読込再現性 ===');
  console.log('[Colossians — col_final.xml を loadBook で開く]');

  const colXml = fs.readFileSync(path.join(XML_OUT, 'col_final.xml'), 'utf8');

  // (a) loadBook で単一sentence XMLを開く
  const loaded = await pg.evaluate(xml => loadBook(xml), colXml);
  await wait(300);
  await pg.click('#mL');
  await wait(200);
  P('3a: loadBook(col_final.xml) 成功', loaded);

  // (b) rk-dx 属性が3件保持される
  const rkCount = await pg.evaluate(() =>
    [...doc.querySelectorAll('wg[rk-dx]')].length
  );
  P('3b: rk-dx 3件保持', rkCount === 3, `${rkCount}件`);

  // (c) GM グループの minX ≤ 780
  const over = await pg.evaluate(() => {
    const r = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const minX = Math.min(...ws.map(w=>w.x));
      if (minX > 780) r.push({desc: bd(gEl), minX: Math.round(minX)});
    }
    return r;
  });
  P('3c: 全GMグループ minX≤780', over.length===0, `超過${over.length}件`);

  // (d) serialize → reload で位置一致
  const xml1 = await pg.evaluate(() => new XMLSerializer().serializeToString(doc));
  await pg.evaluate(xml => loadBook(xml), xml1);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const pos1 = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));

  await pg.evaluate(xml => loadBook(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);
  const pos2 = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  P('3d: serialize → reload で位置一致', pos1===pos2);

  // =============================================
  // 項目4: ボタンの影響
  // =============================================
  console.log('\n=== 項目4: ボタン影響検証 ===');

  // リセット: col_final.xml を再ロード
  await pg.evaluate(xml => loadBook(xml), colXml);
  await wait(200);
  await pg.click('#mL');
  await wait(200);

  const baseRkDx = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);

  // [4a] Auto Layout (refresh+initView) → rk-dx/rk-dy 維持
  const beforeAL = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  await pg.click('#al');
  await wait(200);
  const afterAL_rk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const afterAL_pos = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  P('4a: Auto Layout後 rk-dx 維持', afterAL_rk === baseRkDx, `rk-dx ${afterAL_rk}件`);
  P('4a: Auto Layout後 配置位置維持', afterAL_pos === beforeAL);

  // [4b] 手動配置リセット → rk-x/rk-y のみ削除、rk-dx/rk-dy は維持
  await pg.click('#rs');
  await wait(200);
  const after_rs_rk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const after_rs_rkx = await pg.evaluate(() => [...doc.querySelectorAll('[rk-x]')].length);
  P('4b: 手動配置リセット後 rk-dx 維持', after_rs_rk === baseRkDx, `rk-dx ${after_rs_rk}件`);
  P('4b: 手動配置リセット後 rk-x は 0', after_rs_rkx === 0, `rk-x ${after_rs_rkx}件`);

  // [4c] グループ移動を解除 → rk-dx/rk-dy が全削除される (clearAllGroupDy)
  const beforeGX = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  await pg.click('#gx');
  await wait(200);
  const after_gx_rk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const after_gx_rky = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dy]')].length);
  const after_gx_pos = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  P('4c: グループ移動解除後 rk-dx = 0', after_gx_rk === 0, `rk-dx ${after_gx_rk}件`);
  P('4c: グループ移動解除後 rk-dy = 0', after_gx_rky === 0, `rk-dy ${after_gx_rky}件`);
  P('4c: グループ移動解除後 配置が変化', after_gx_pos !== beforeGX);

  // [4d] 解除後 Undo → rk-dx/rk-dy が復元される
  await pg.click('#un');
  await wait(200);
  const after_undo_rk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const after_undo_pos = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  P('4d: Undo後 rk-dx 復元', after_undo_rk === baseRkDx, `rk-dx ${after_undo_rk}件`);
  P('4d: Undo後 配置復元', after_undo_pos === beforeGX);

  // =============================================
  // Luke も同様に確認
  // =============================================
  console.log('\n[Luke — luk_after_fold.xml を loadBook で開く]');
  const lukXml = fs.readFileSync(path.join(XML_OUT, 'luk_after_fold.xml'), 'utf8');

  await pg.evaluate(xml => loadBook(xml), lukXml);
  await wait(300);
  await pg.click('#mL');
  await wait(200);

  const lukRk = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  P('3e: Luke rk-dx 3件', lukRk === 3, `${lukRk}件`);

  const lukOver = await pg.evaluate(() => {
    const r = [];
    for (const [gEl, gm] of GM) {
      const ws = [...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
      if (!ws.length) continue;
      const minX = Math.min(...ws.map(w=>w.x));
      if (minX > 780) r.push({desc: bd(gEl), minX: Math.round(minX)});
    }
    return r;
  });
  P('3f: Luke 全GMグループ minX≤780', lukOver.length===0, `超過${lukOver.length}件`);

  // Luke グループ移動解除 → Undo
  const lukBaseDx = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const lukBeforeGX = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  await pg.click('#gx');
  await wait(200);
  const lukAfterGX = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  P('4e: Luke グループ移動解除後 rk-dx=0', lukAfterGX === 0, `${lukAfterGX}件`);
  await pg.click('#un');
  await wait(200);
  const lukAfterUndo = await pg.evaluate(() => [...doc.querySelectorAll('wg[rk-dx]')].length);
  const lukAfterUndoPos = await pg.evaluate(() => words.map(w=>Math.round(w.x)).join(','));
  P('4f: Luke Undo後 rk-dx 復元', lukAfterUndo === lukBaseDx, `${lukAfterUndo}件`);
  P('4f: Luke Undo後 配置復元', lukAfterUndoPos === lukBeforeGX);

  // コンソールエラー
  P('console errors = 0', errs.length === 0, `${errs.length}件`);

  await b.close();
  console.log(`\n=== 検証結果: PASS ${pass} / FAIL ${fail} ===`);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
