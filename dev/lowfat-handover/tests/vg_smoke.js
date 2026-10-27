const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900}
  });
  const pg = await b.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto(APP);
  await wait(600);

  let pass = 0, fail = 0;
  function chk(label, ok, detail) {
    if (ok) { pass++; console.log('  [PASS]', label, detail || ''); }
    else     { fail++; console.log('  [FAIL]', label, detail || ''); }
  }

  // --- 初期状態 ---
  chk('vgSlLbl初期非表示',
    await pg.evaluate(() => document.querySelector('#vgSlLbl').style.display === 'none'));
  chk('vgSlOn初期false',
    await pg.evaluate(() => vgSlOn === false));
  chk('vgEls.slices長=5',
    await pg.evaluate(() => vgEls.slices.length === 5));

  // --- slices が #vp の子であること (コンテンツ空間) ---
  chk('slices の親が #vp',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.parentElement.id === 'vp')));

  // --- 画角ガイドON ---
  await pg.click('#vgTog');
  await wait(150);
  chk('画角ガイドON', await pg.evaluate(() => vgOn === true));

  // --- PC標準のまま: 区切り線非表示 ---
  chk('PC標準: ラベル非表示',
    await pg.evaluate(() => document.querySelector('#vgSlLbl').style.display === 'none'));
  chk('PC標準: 区切り線要素非表示',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.style.display === 'none')));

  // --- スマホ標準に切り替え ---
  await pg.select('#vgPre', 'sp-std');
  await wait(200);
  const lblSp = await pg.evaluate(() => document.querySelector('#vgSlLbl').style.display);
  chk('sp-std: ラベル表示', lblSp !== 'none', 'display=' + lblSp);
  chk('sp-std: チェックOFF時 区切り線非表示',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.style.display === 'none')));

  // --- チェックON: 区切り線表示 ---
  await pg.click('#vgSlChk');
  await wait(150);
  chk('チェックON: vgSlOn=true', await pg.evaluate(() => vgSlOn === true));
  chk('チェックON: 区切り線表示',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.style.display !== 'none')));

  // --- コンテンツ空間座標検証: y1 = n * (H / view.k), H=844 ---
  const positions = await pg.evaluate(() => vgEls.slices.map((s, i) => ({
    n: i + 1,
    y1: +s.ln.getAttribute('y1'),
    y2: +s.ln.getAttribute('y2'),
    x1: +s.ln.getAttribute('x1'),
    x2: +s.ln.getAttribute('x2'),
    lbl: s.lb.textContent,
    k: view.k,
    cH: 844 / view.k,
  })));
  console.log('  コンテンツ空間座標 (view.k=' + positions[0].k.toFixed(4) + '):');
  positions.forEach(pos => {
    const expY = pos.n * pos.cH;
    const yOk = Math.abs(pos.y1 - expY) < 0.01 && Math.abs(pos.y2 - expY) < 0.01;
    const lineOk = pos.x1 <= 0 && pos.x2 >= 390;
    const lblOk = pos.lbl === pos.n + '画面目の下端';
    chk(pos.n + '画面目 y=n×(H/k)・幅・ラベル', yOk && lineOk && lblOk,
      'y1=' + pos.y1.toFixed(1) + ' exp=' + expY.toFixed(1) + ' lbl="' + pos.lbl + '"');
  });

  // --- ラベル x がスクリーン左端付近に固定されること ---
  const lblScreenX = await pg.evaluate(() => {
    const s = vgEls.slices[0];
    const lx = +s.lb.getAttribute('x');
    return Math.round(lx * view.k + view.x);
  });
  chk('ラベル screen-x ≈ 4', Math.abs(lblScreenX - 4) <= 2, 'screen-x=' + lblScreenX);

  // --- チェックOFF: 非表示に戻る ---
  await pg.click('#vgSlChk');
  await wait(100);
  chk('チェックOFF: 区切り線非表示',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.style.display === 'none')));

  // --- スマホ小画面も動作確認 ---
  await pg.click('#vgSlChk');
  await wait(100);
  await pg.select('#vgPre', 'sp-sm');
  await wait(200);
  chk('sp-sm: ラベル表示',
    await pg.evaluate(() => document.querySelector('#vgSlLbl').style.display !== 'none'));
  const posSm = await pg.evaluate(() => ({
    y1: +vgEls.slices[0].ln.getAttribute('y1'),
    cH: 740 / view.k,
  }));
  chk('sp-sm: y1=740/k (H=740)', Math.abs(posSm.y1 - posSm.cH) < 0.01,
    'y1=' + posSm.y1.toFixed(1) + ' exp=' + posSm.cH.toFixed(1));

  // --- PC標準に戻す: ラベル・線が非表示 ---
  await pg.select('#vgPre', 'pc-std');
  await wait(150);
  chk('PC戻し: ラベル非表示',
    await pg.evaluate(() => document.querySelector('#vgSlLbl').style.display === 'none'));
  chk('PC戻し: 区切り線非表示',
    await pg.evaluate(() => vgEls.slices.every(s => s.ln.style.display === 'none')));

  // --- 画角ガイドOFF: #vg全体非表示 (既存動作) ---
  await pg.click('#vgTog');
  await wait(100);
  chk('#vg非表示 (既存動作)',
    await pg.evaluate(() => document.querySelector('#vg').style.display === 'none'));

  // --- applyView 追従確認: ズーム変更で y が再計算される ---
  // pg.select() でonchangeを発火させ #vgCH入力を正しく更新する
  await pg.click('#vgTog');
  await wait(100);
  await pg.select('#vgPre', 'sp-std');
  await wait(100);
  await pg.evaluate(() => {
    document.querySelector('#vgSlChk').checked = true;
    vgSlOn = true;
    vgSlDraw();
  });
  await wait(50);
  await pg.evaluate(() => { view.k = 0.3; applyView(); });
  await wait(50);
  const y03 = await pg.evaluate(() => +vgEls.slices[0].ln.getAttribute('y1'));
  const exp03 = 844 / 0.3;
  chk('ズーム k=0.3 で y=844/0.3', Math.abs(y03 - exp03) < 0.1,
    'y=' + y03.toFixed(1) + ' exp=' + exp03.toFixed(1));

  // パン変更でラベル x がスクリーン左端を追従する
  await pg.evaluate(() => { view.x = 200; applyView(); });
  await wait(50);
  const lblX2 = await pg.evaluate(() => {
    const lx = +vgEls.slices[0].lb.getAttribute('x');
    return Math.round(lx * view.k + view.x);
  });
  chk('パン後もラベル screen-x ≈ 4', Math.abs(lblX2 - 4) <= 2, 'screen-x=' + lblX2);

  // --- layout変更がないこと ---
  const xmlPath = path.resolve('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml');
  const colXml = fs.readFileSync(xmlPath, 'utf8');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(200);
  const dim = await pg.evaluate(() => ({
    maxX: Math.round(Math.max(...words.map(w => w.x + w.w))),
    maxY: Math.round(Math.max(...words.map(w => w.y))),
    wordCount: words.length, edgeCount: edges.length,
  }));
  chk('Col layout: maxX=1427', dim.maxX === 1427, 'maxX=' + dim.maxX); // detInline=true + NPofNP inline
  chk('Col layout: maxY=3050', dim.maxY === 3050, 'maxY=' + dim.maxY); // detInline=true + NPofNP inline
  chk('Col layout: wordCount>0', dim.wordCount > 0, 'words=' + dim.wordCount);

  // コンソールエラー
  chk('コンソールエラー0件', errs.length === 0, errs.length + '件');
  if (errs.length) errs.slice(0, 3).forEach(e => console.log('  エラー:', e));

  await b.close();
  console.log('\n=== 結果:', pass, 'PASS /', fail, 'FAIL ===');
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
