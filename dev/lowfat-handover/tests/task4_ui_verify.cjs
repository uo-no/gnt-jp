/**
 * task4_ui_verify.cjs — 「※読書モード未実装」削除後の表示確認
 * 390×844 (sp) と 1280×800 (pc) の両方で確認
 */
const pu = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SS   = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/task4_ui';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(SS)) fs.mkdirSync(SS, {recursive: true});

  let pass = 0, fail = 0;
  const chk = (label, ok, detail) => {
    if (ok) { pass++; console.log('  [PASS]', label, detail || ''); }
    else     { fail++; console.log('  [FAIL]', label, detail || ''); }
  };

  // ─── 1. スマホ 390×844 ───
  console.log('\n=== スマホ 390×844 ===');
  {
    const br = await pu.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: 'shell', args: ['--no-sandbox'],
      defaultViewport: {width: 390, height: 844},
    });
    const pg = await br.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const ss = async name => {
      await pg.screenshot({path: path.join(SS, name + '.png'), fullPage: false});
      console.log('  📷', name + '.png');
    };

    await pg.goto(APP); await wait(600);

    // vgOn + sp-std
    await pg.click('#vgTog'); await wait(150);
    await pg.select('#vgPre', 'sp-std'); await wait(200);
    await ss('sp_vgon');

    // 「読書モード未実装」が画面に出ていないこと
    const bodyText = await pg.evaluate(() => document.body.innerText);
    chk('「読書モード」文言が画面から消えている (sp)',
      !bodyText.includes('読書モード'),
      bodyText.includes('読書モード') ? '残存あり' : '消去確認');

    // vgCtrl 内の HTML に span が残っていないこと
    const vgHtml = await pg.evaluate(() => document.querySelector('#vgCtrl').innerHTML);
    chk('HTML に ※読書モード が含まれない', !vgHtml.includes('読書モード'));

    // コンテンツ W/H/余白 行が壊れていないこと
    const cwVisible = await pg.evaluate(() => {
      const el = document.querySelector('#vgCW');
      return !!el && getComputedStyle(el).display !== 'none';
    });
    chk('vgCW input が表示されている', cwVisible);

    // 「収まり確認」ボタンをクリックして vgInfo を開く
    await pg.click('#vgChk'); await wait(200);
    const vgInfoText = await pg.evaluate(() => document.querySelector('#vgInfo')?.innerHTML || '');
    chk('vgInfo に「読書モード」が含まれない', !vgInfoText.includes('読書モード'),
      vgInfoText.includes('読書モード') ? '残存あり' : '消去確認');
    await ss('sp_vgcheck');

    // SVG ラベル (vg overlay) に残存しないこと
    const svgLbl = await pg.evaluate(() => {
      const lbl = document.querySelector('#vg text') || document.querySelector('.vg-lbl');
      return lbl ? lbl.textContent : '';
    });
    chk('SVG 画角ラベルに「読書モード」なし',
      !svgLbl.includes('読書モード'), `label="${svgLbl}"`);

    chk('コンソールエラー 0件 (sp)', errs.length === 0, `${errs.length}件`);
    if (errs.length) errs.forEach(e => console.log('  エラー:', e));
    await br.close();
  }

  // ─── 2. デスクトップ 1280×800 ───
  console.log('\n=== デスクトップ 1280×800 ===');
  {
    const br = await pu.launch({
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: 'shell', args: ['--no-sandbox'],
      defaultViewport: {width: 1280, height: 800},
    });
    const pg = await br.newPage();
    const errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
    const ss = async name => {
      await pg.screenshot({path: path.join(SS, name + '.png'), fullPage: false});
      console.log('  📷', name + '.png');
    };

    await pg.goto(APP); await wait(600);

    // vgOn (デスクトップ: PC標準のまま)
    await pg.click('#vgTog'); await wait(150);
    await ss('pc_vgon');

    const bodyText = await pg.evaluate(() => document.body.innerText);
    chk('「読書モード」文言が画面から消えている (pc)',
      !bodyText.includes('読書モード'));

    // pbRow は pc-std では非表示のまま
    const pbRowDisplay = await pg.evaluate(() => document.querySelector('#pbRow').style.display);
    chk('pbRow: pc-std で非表示 (変更なし)', pbRowDisplay === 'none', 'display=' + pbRowDisplay);

    chk('コンソールエラー 0件 (pc)', errs.length === 0, `${errs.length}件`);
    await br.close();
  }

  console.log(`\n=== 結果: ${pass} PASS / ${fail} FAIL ===`);
  console.log('📁 SS:', SS);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
