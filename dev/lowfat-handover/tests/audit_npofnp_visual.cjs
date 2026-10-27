const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const COL_XML = '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml';
const fs = require('fs');
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/audit_npofnp';
fs.mkdirSync(SSDIR, {recursive: true});
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('PAGE ERR:', e.message));
  await pg.goto(APP);
  await wait(600);
  const xml = fs.readFileSync(COL_XML, 'utf8');

  // detInline=true で COL ロード
  await pg.evaluate(xml => fresh(xml), xml);
  await wait(300);

  const diState = await pg.evaluate(() => detInline);
  console.log('detInline =', diState);

  // b2UL=true に切り替えてリドロー
  await pg.evaluate(xml => { b2UL = true; fresh(xml); }, xml);
  await wait(300);

  // b2Pairs を取得（テキスト + 座標）
  const b2Info = await pg.evaluate(() => b2Pairs.map((pr,i) => ({
    i: i+1,
    detText: pr.det ? pr.det.text : '?',
    nounText: pr.noun ? pr.noun.text : '?',
    detX: pr.det ? Math.round(pr.det.x) : 0,
    nounX: pr.noun ? Math.round(pr.noun.x) : 0,
    nounY: pr.noun ? Math.round(pr.noun.y) : 0,
    detY:  pr.det  ? Math.round(pr.det.y)  : 0,
    elOk: !!pr.el
  })));
  console.log(`\nb2Pairs (計${b2Info.length}件):`);
  b2Info.forEach(pr => console.log(
    `  ${pr.i}. det="${pr.detText}" x=${pr.detX} y=${pr.detY}  noun="${pr.nounText}" x=${pr.nounX} y=${pr.nounY}  same_y:${pr.detY===pr.nounY}  elOk:${pr.elOk}`
  ));

  // τὴν χάριν を探す（b2Pairs 12番目、x≈711）
  const tenCharin = b2Info.find(pr => pr.detText.includes('τὴν') && pr.nounText.includes('χάριν'));
  if (tenCharin) {
    console.log('\n✓ τὴν χάριν 発見:', JSON.stringify(tenCharin));
    const sameY = tenCharin.detY === tenCharin.nounY;
    console.log(`  同一ベースライン: ${sameY ? 'CONFIRMED' : 'FAIL'}`);
  } else {
    console.log('\nWARN: τὴν χάριν が b2Pairs に見つからない');
  }

  // NPofNP の属格句確認（χάριν より y が大きいペアを検索）
  if (tenCharin) {
    const nounY = tenCharin.nounY;
    // τοῦ θεοῦ は属格句なので χάριν の下にあるはず
    const lowerWords = await pg.evaluate((targetX, targetY) => {
      return words
        .filter(w => w.x > targetX - 50 && w.x < targetX + 300 && w.y > targetY && w.y < targetY + 120)
        .map(w => ({text: w.text, x: Math.round(w.x), y: Math.round(w.y)}))
        .sort((a,b) => a.y - b.y || a.x - b.x);
    }, tenCharin.nounX, nounY);
    console.log('\n χάριν より下の近傍語 (属格句候補):');
    lowerWords.forEach(w => console.log(`  "${w.text}" x=${w.x} y=${w.y}`));
    if (lowerWords.length > 0) {
      console.log('  → 属格句が χάριν y=' + nounY + ' より下に存在: CONFIRMED');
    }
  }

  // 全体 SS + τὴν χάριν ズームイン SS
  await pg.screenshot({path: `${SSDIR}/b2_full.png`, fullPage: false});
  console.log('\n📷 b2_full.png (b2UL=true 全体)');

  if (tenCharin) {
    const cx = tenCharin.detX, cy = tenCharin.detY;
    // コンテンツ座標をスクリーン座標に変換
    await pg.evaluate((cx, cy) => {
      view.x = -(cx - 80) * view.k;
      view.y = -(cy - 60) * view.k;
      applyView();
    }, cx, cy);
    await wait(100);
    await pg.screenshot({path: `${SSDIR}/zoom_ten_charin.png`, fullPage: false});
    console.log('📷 zoom_ten_charin.png (τὴν χάριν τοῦ θεοῦ ズームイン)');
  }

  await b.close();
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
