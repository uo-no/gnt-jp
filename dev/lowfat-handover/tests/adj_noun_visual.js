const pu = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SS_OUT = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/adj_noun_ss';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(SS_OUT, {recursive: true});
  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900}
  });
  const pg = await br.newPage();
  pg.on('pageerror', e => console.error('ERR:', e.message));
  await pg.goto(APP); await wait(600);

  const sentXml = fs.readFileSync('/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/col39_sentence.xml', 'utf8');

  // A: detInline=false (旧)
  await pg.evaluate(xml => { detInline=false; fresh(xml); }, sentXml); await wait(300);
  await pg.evaluate(() => { view.k=0.55; view.x=10; view.y=10; applyView(); });
  await wait(100);
  await pg.screenshot({path: SS_OUT+'/col39_A_legacy.png', fullPage:false});
  console.log('📷 col39_A_legacy.png');

  // 語情報ログ（adj/noun の y 座標）
  const infoA = await pg.evaluate(() => {
    const res = [];
    doc.querySelectorAll('w').forEach(el => {
      const cls = el.getAttribute('class');
      if (!['adj','noun','det'].includes(cls)) return;
      const w = EW.get(el);
      if (w) res.push({cls, text:w.text, x:Math.round(w.x), y:Math.round(w.y)});
    });
    return res;
  });
  console.log('\n--- A (旧): det/adj/noun 位置 ---');
  infoA.slice(0,20).forEach(r=>console.log(`  ${r.cls.padEnd(5)} ${r.text.padEnd(15)} x=${r.x} y=${r.y}`));

  // B: detInline=true (新デフォルト)
  await pg.evaluate(xml => { detInline=true; fresh(xml); }, sentXml); await wait(300);
  await pg.evaluate(() => { view.k=0.55; view.x=10; view.y=10; applyView(); });
  await wait(100);
  await pg.screenshot({path: SS_OUT+'/col39_B_default.png', fullPage:false});
  console.log('📷 col39_B_default.png');

  const infoB = await pg.evaluate(() => {
    const res = [];
    doc.querySelectorAll('w').forEach(el => {
      const cls = el.getAttribute('class');
      if (!['adj','noun','det'].includes(cls)) return;
      const w = EW.get(el);
      if (w) res.push({cls, text:w.text, x:Math.round(w.x), y:Math.round(w.y)});
    });
    return res;
  });
  console.log('\n--- B (新): det/adj/noun 位置 ---');
  infoB.slice(0,20).forEach(r=>console.log(`  ${r.cls.padEnd(5)} ${r.text.padEnd(15)} x=${r.x} y=${r.y}`));

  // τὸν παλαιὸν ἄνθρωπον の y 一致確認
  const chkDet = infoB.find(r=>r.text.startsWith('τ')&&r.cls==='det'&&r.text.includes('ν'));
  const chkAdj = infoB.find(r=>r.text.includes('παλαι'));
  const chkNoun = infoB.find(r=>r.text.includes('ἄνθρωπ'));
  if(chkDet&&chkAdj&&chkNoun) {
    console.log('\n--- τὸν παλαιὸν ἄνθρωπον ---');
    console.log('  τ... det  y='+chkDet.y);
    console.log('  παλαιὸν  y='+chkAdj.y);
    console.log('  ἄνθρωπον y='+chkNoun.y);
    console.log('  det==noun (同一baseline)?', chkDet.y===chkNoun.y);
  }

  await br.close();
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1)});
