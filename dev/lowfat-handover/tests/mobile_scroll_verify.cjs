/**
 * mobile_scroll_verify.cjs — 縦スクロール読書確認 390×844
 * Task 4: ページ区切り機能再評価 READ-ONLY
 *
 * 検証:
 * 1. 短文 (COL 3:18 相当) — 一画面内に収まるか
 * 2. 長文 (COL 1:3-8 = col_final.xml) — 縦スクロールで読めるか
 * 3. ページ区切りUIの可視性 (pbRow 表示条件)
 * 4. vgOn=false のときの pbRow 非表示
 */
const pu = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SS   = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/mobile_scroll';
const wait = ms => new Promise(r => setTimeout(r, ms));

// 短文 XML (inline): COL 3:18 相当 — 小さいXMLを直接書く
const SHORT_XML = `<sentence>
  <wg class="cl" role="">
    <wg class="np" role="s"><w class="noun" lemma="γυνή" morph="N-NF-P">Αἱ</w><w class="noun" lemma="γυνή" morph="N-NF-P">γυναῖκες</w></wg>
    <w class="verb" lemma="ὑποτάσσω" morph="V-PMM2P" role="v">ὑποτάσσεσθε</w>
    <wg class="pp" role="o"><w class="prep" lemma="τοῖς" morph="DMPD">τοῖς</w><w class="noun" lemma="ἀνήρ" morph="N-DM-P">ἀνδράσιν</w></wg>
  </wg>
</sentence>`;

(async () => {
  if (!fs.existsSync(SS)) fs.mkdirSync(SS, {recursive: true});

  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 390, height: 844},
  });
  const pg = await br.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));

  let pass = 0, fail = 0;
  const chk = (label, ok, detail) => {
    if (ok) { pass++; console.log('  [PASS]', label, detail || ''); }
    else     { fail++; console.log('  [FAIL]', label, detail || ''); }
  };
  const ss = async name => {
    await pg.screenshot({path: path.join(SS, name + '.png'), fullPage: false});
    console.log('  📷', name + '.png (390×844 viewport)');
  };

  await pg.goto(APP); await wait(600);

  // ── 1. 短文: デフォルト状態 (pbRow 非表示を確認) ──
  console.log('\n=== [1] 短文デフォルト状態 ===');
  await pg.evaluate(xml => fresh(xml), SHORT_XML);
  await wait(200);
  const pbRowDefault = await pg.evaluate(() => document.querySelector('#pbRow').style.display);
  chk('pbRow: デフォルト非表示', pbRowDefault === 'none', 'display=' + pbRowDefault);
  chk('vgOn: 初期false', await pg.evaluate(() => vgOn === false));
  await ss('01_short_default');

  // layout 寸法確認
  const shortDim = await pg.evaluate(() => ({
    maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
    maxY: Math.round(Math.max(...words.map(w => w.y))),
    wordCount: words.length,
  }));
  console.log(`  短文 layout: maxX=${shortDim.maxX} maxY=${shortDim.maxY} words=${shortDim.wordCount}`);

  // ── 2. 短文: vgOn + sp-std で pbRow 表示 ──
  console.log('\n=== [2] 短文 vgOn + sp-std ===');
  await pg.click('#vgTog'); await wait(150);
  await pg.select('#vgPre', 'sp-std'); await wait(200);
  const pbRowSp = await pg.evaluate(() => document.querySelector('#pbRow').style.display);
  chk('pbRow: sp-std + vgOn で表示', pbRowSp !== 'none', 'display=' + pbRowSp);
  await ss('02_short_sp_std');

  // vgOn=false に戻す
  await pg.click('#vgTog'); await wait(100);
  const pbRowOff = await pg.evaluate(() => document.querySelector('#pbRow').style.display);
  chk('pbRow: vgOff で再び非表示', pbRowOff === 'none', 'display=' + pbRowOff);

  // ── 3. 長文: COL 1:3-8 (col_final.xml) — デフォルト縦スクロール ──
  console.log('\n=== [3] 長文 COL 1:3-8 デフォルト表示 ===');
  const colXml = fs.readFileSync(
    '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml', 'utf8');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(300);

  const colDim = await pg.evaluate(() => ({
    maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
    maxY: Math.round(Math.max(...words.map(w => w.y))),
    wordCount: words.length,
    k: view.k,
    svgW: document.querySelector('#vp')?.getAttribute('width'),
    svgH: document.querySelector('#vp')?.getAttribute('height'),
  }));
  console.log(`  COL layout: maxX=${colDim.maxX} maxY=${colDim.maxY} words=${colDim.wordCount}`);
  console.log(`  view.k=${colDim.k} SVG: ${colDim.svgW}×${colDim.svgH}`);

  // デフォルト view.k で content高さ (px in screen)
  const screenH = await pg.evaluate(() => {
    const maxY = Math.max(...words.map(w => w.y)) + 38; // +ROW
    return Math.round(maxY * view.k);
  });
  console.log(`  content高さ (screen px): ${screenH}px (viewport=844px)`);
  chk('長文 content高さ > 844px (スクロール必要)', screenH > 844, `screenH=${screenH}px`);

  // SVG の overflow:auto で縦スクロール可能か確認
  const scrollInfo = await pg.evaluate(() => {
    const svg = document.querySelector('svg') || document.querySelector('#rk');
    const cont = document.querySelector('#rkCont') || document.querySelector('.rk-container') || svg?.parentElement;
    if (!cont) return {found: false};
    const st = getComputedStyle(cont);
    return {
      found: true,
      overflow: st.overflow,
      overflowY: st.overflowY,
      tagName: cont.tagName,
      id: cont.id,
      className: cont.className,
    };
  });
  console.log(`  スクロールコンテナ: tag=${scrollInfo.tagName} id="${scrollInfo.id}" overflow=${scrollInfo.overflow}/${scrollInfo.overflowY}`);

  await ss('03_long_default_top');

  // k=1.0 でフルサイズ表示してスクロール確認
  await pg.evaluate(() => { view.k = 1.0; view.x = 10; view.y = 10; applyView(); });
  await wait(150);
  await ss('04_long_k1_top');

  // k=0.4 で全体俯瞰
  await pg.evaluate(() => { view.k = 0.4; view.x = 10; view.y = 10; applyView(); });
  await wait(100);
  await ss('05_long_k04_overview');

  const screenH04 = await pg.evaluate(() => {
    const maxY = Math.max(...words.map(w => w.y)) + 38;
    return Math.round(maxY * view.k);
  });
  console.log(`  k=0.4 時 content高さ: ${screenH04}px`);

  // ── 4. 長文 + vgOn + sp-std: pbRow 表示・区切り線表示 ──
  console.log('\n=== [4] 長文 vgOn + sp-std + 区切り線 ===');
  await pg.click('#vgTog'); await wait(150);
  await pg.select('#vgPre', 'sp-std'); await wait(200);
  // 区切り線ON
  await pg.evaluate(() => {
    document.querySelector('#vgSlChk').checked = true;
    vgSlOn = true;
    vgSlDraw();
  });
  await wait(100);

  // 画角ガイド位置 (content 座標)
  const guideY1 = await pg.evaluate(() => {
    if (!vgEls?.slices?.[0]) return null;
    return +vgEls.slices[0].ln.getAttribute('y1');
  });
  console.log(`  1画面目下端 content-y: ${guideY1?.toFixed(1)}`);
  console.log(`  k=0.4時 screen-y: ${guideY1 ? Math.round(guideY1 * 0.4 + 10) : '?'}px`);

  await ss('06_long_sp_std_slices');

  // ── 5. PC プリセットで pbRow 状態確認 ──
  console.log('\n=== [5] PC プリセット: pbRow 非表示 ===');
  await pg.select('#vgPre', 'pc-std'); await wait(150);
  const pbRowPc = await pg.evaluate(() => document.querySelector('#pbRow').style.display);
  chk('pbRow: pc-std では非表示', pbRowPc === 'none', 'display=' + pbRowPc);

  // ── 6. GM サイズ確認 (ページ区切り対象グループ数) ──
  console.log('\n=== [6] GM グループ数 (長文) ===');
  // vgOn=sp-std のまま
  await pg.select('#vgPre', 'sp-std'); await wait(150);
  const gmSize = await pg.evaluate(() => GM.size);
  console.log(`  GM.size (移動可能グループ数): ${gmSize}`);

  // layout dimensions regression check
  const dimReg = await pg.evaluate(() => ({
    maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
    maxY: Math.round(Math.max(...words.map(w => w.y))),
  }));
  chk('COL layout baseline maxX=1427', dimReg.maxX === 1427, 'maxX=' + dimReg.maxX);
  chk('COL layout baseline maxY=3050', dimReg.maxY === 3050, 'maxY=' + dimReg.maxY);

  // コンソールエラー
  chk('コンソールエラー 0件', errs.length === 0, `${errs.length}件`);
  if (errs.length) errs.forEach(e => console.log('  エラー:', e));

  await br.close();
  console.log(`\n=== 結果: ${pass} PASS / ${fail} FAIL ===`);
  console.log('📁 SS:', SS);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
