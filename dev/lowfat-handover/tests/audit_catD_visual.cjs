// カテゴリD 視覚確認: 1CO 7:14 ὁ ἀνὴρ ὁ ἄπιστος
const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const fs = require('fs');
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/catD';
fs.mkdirSync(SSDIR, {recursive: true});
const wait = ms => new Promise(r => setTimeout(r, ms));

const XML_714 = '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1co_7_14.xml';

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width:1400, height:900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('PAGE_ERR:', e.message));
  await pg.goto(APP);
  await wait(600);

  const xml = fs.readFileSync(XML_714, 'utf8');

  // ─── detInline=false (変更前の挙動) ───
  await pg.evaluate((x) => { detInline = false; fresh(x); }, xml);
  await wait(300);
  const before = await pg.evaluate(() => {
    // ὁ ἀνὴρ ὁ ἄπιστος の語を探す
    const pairs = [];
    for (const w of words) {
      if (['ἀνὴρ','γυνὴ','ἄπιστος'].includes(w.text)) {
        pairs.push({text: w.text, x: Math.round(w.x), y: Math.round(w.y)});
      }
    }
    return { pairs, maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))), maxY: Math.round(Math.max(...words.map(w=>w.y))), wordCount: words.length };
  });
  console.log('=== detInline=false (変更前) ===');
  console.log('maxX:', before.maxX, 'maxY:', before.maxY, 'words:', before.wordCount);
  console.log('key words:', JSON.stringify(before.pairs));
  await pg.screenshot({path: `${SSDIR}/before_full.png`, fullPage: false});
  console.log('📷 before_full.png');

  // ζητεῖ ἀνὴρ 周辺にズーム
  const anhr = before.pairs.find(p => p.text === 'ἀνὴρ');
  if (anhr) {
    await pg.evaluate((cx, cy) => { view.x = -(cx-120)*view.k; view.y = -(cy-60)*view.k; applyView(); }, anhr.x, anhr.y);
    await wait(100);
    await pg.screenshot({path: `${SSDIR}/before_zoom_anhr.png`, fullPage: false});
    console.log(`📷 before_zoom_anhr.png (ἀνὴρ at x=${anhr.x} y=${anhr.y})`);
  }

  // ─── detInline=true (変更後) ───
  await pg.evaluate((x) => { detInline = true; fresh(x); }, xml);
  await wait(300);
  const after = await pg.evaluate(() => {
    const pairs = [];
    for (const w of words) {
      if (['ὁ','ἡ','ἀνὴρ','γυνὴ','ἄπιστος'].includes(w.text)) {
        pairs.push({text: w.text, x: Math.round(w.x), y: Math.round(w.y)});
      }
    }
    return { pairs, maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))), maxY: Math.round(Math.max(...words.map(w=>w.y))), wordCount: words.length };
  });
  console.log('\n=== detInline=true (変更後) ===');
  console.log('maxX:', after.maxX, 'maxY:', after.maxY, 'words:', after.wordCount);
  console.log('key words:', JSON.stringify(after.pairs));

  await pg.screenshot({path: `${SSDIR}/after_full.png`, fullPage: false});
  console.log('📷 after_full.png');

  // ζητεῖ ἀνὴρ 周辺にズーム
  const anhrA = after.pairs.find(p => p.text === 'ἀνὴρ');
  const ohs = after.pairs.filter(p => p.text === 'ὁ');
  if (anhrA) {
    await pg.evaluate((cx, cy) => { view.x = -(cx-120)*view.k; view.y = -(cy-60)*view.k; applyView(); }, anhrA.x, anhrA.y);
    await wait(100);
    await pg.screenshot({path: `${SSDIR}/after_zoom_anhr.png`, fullPage: false});
    console.log(`📷 after_zoom_anhr.png (ἀνὴρ at x=${anhrA.x} y=${anhrA.y})`);
  }

  // ─── ベースライン確認 ───
  console.log('\n=== ベースライン確認 ===');
  // ὁ ἀνὴρ ὁ ἄπιστος: 外側ὁ と ἀνὴρ が同じ y であること
  if (ohs.length > 0 && anhrA) {
    // 外側の ὁ は ἀνὴρ と近い x にあるはず
    const outerOh = ohs.find(o => Math.abs(o.x - anhrA.x) < 100);
    if (outerOh) {
      console.log(`  外側 ὁ: x=${outerOh.x} y=${outerOh.y}`);
      console.log(`  ἀνὴρ:   x=${anhrA.x} y=${anhrA.y}`);
      console.log(`  同一ベースライン: ${outerOh.y === anhrA.y ? 'CONFIRMED' : 'FAIL (y差=' + (anhrA.y - outerOh.y) + ')'}`);
    }
    const apistos = after.pairs.find(p => p.text === 'ἄπιστος');
    if (apistos && anhrA) {
      console.log(`  ἄπιστος: x=${apistos.x} y=${apistos.y}`);
      console.log(`  ἄπιστος が ἀνὴρ より下: ${apistos.y > anhrA.y ? 'CONFIRMED (y差=' + (apistos.y - anhrA.y) + ')' : 'FAIL'}`);
    }
  }

  // ─── b2UL でアンダーライン確認 ───
  await pg.evaluate((x) => { b2UL = true; fresh(x); }, xml);
  await wait(300);
  const b2data = await pg.evaluate(() => b2Pairs.map(pr=>({
    det: pr.det ? pr.det.text : '?',
    noun: pr.noun ? pr.noun.text : '?',
    detX: Math.round(pr.det ? pr.det.x : 0),
    nounX: Math.round(pr.noun ? pr.noun.x : 0),
    detY: Math.round(pr.det ? pr.det.y : 0),
    nounY: Math.round(pr.noun ? pr.noun.y : 0),
    sameY: pr.det && pr.noun ? pr.det.y === pr.noun.y : false,
    elOk: !!pr.el
  })));
  console.log(`\n=== b2Pairs (b2UL=true): ${b2data.length}件 ===`);
  b2data.forEach((pr,i) => console.log(
    `  ${i+1}. det="${pr.det}" x=${pr.detX} y=${pr.detY}  noun="${pr.noun}" x=${pr.nounX} y=${pr.nounY}  same_y:${pr.sameY}  el:${pr.elOk}`
  ));

  if (anhrA) {
    await pg.evaluate((cx, cy) => { view.x = -(cx-120)*view.k; view.y = -(cy-60)*view.k; applyView(); }, anhrA.x, anhrA.y);
    await wait(100);
    await pg.screenshot({path: `${SSDIR}/b2_zoom_anhr.png`, fullPage: false});
    console.log(`📷 b2_zoom_anhr.png (b2UL=true ズームイン)`);
  }

  await b.close();
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
