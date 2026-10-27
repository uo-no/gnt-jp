// hPhrase() vs phrase() 高さ整合 確認
// 対象: det+noun (w-head), det+AdjpNp (NPofNP/NPDetAdj は既存 shortcut あり)
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const wait = ms => new Promise(r => setTimeout(r, ms));

function extractSentence(xmlPath, bookNum, ch, vs) {
  const content = fs.readFileSync(xmlPath, 'utf8');
  const searchId = 'n' + bookNum + ch.padStart(3,'0') + vs.padStart(3,'0');
  const sentRe = /<sentence>([\s\S]*?)<\/sentence>/g;
  let m;
  while ((m = sentRe.exec(content)) !== null) {
    if (m[0].includes(searchId)) return '<sentence>' + m[1] + '</sentence>';
  }
  return null;
}

(async () => {
  const b = await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell', args:['--no-sandbox'],
    defaultViewport:{width:390,height:844} // sp-std viewport for pb check
  });
  const pg = await b.newPage();
  await pg.goto(APP);
  await wait(600);

  // ROW, GAPV の確認
  const consts = await pg.evaluate(() => ({ROW, GAPV, GAPH}));
  console.log('ROW=' + consts.ROW + ' GAPV=' + consts.GAPV + ' GAPH=' + consts.GAPH);
  console.log('hMods([w[det]]) = ROW + GAPV = ' + (consts.ROW + consts.GAPV) + 'px');
  console.log('hPhrase inconsistency per det+noun pair: ~' + (consts.ROW + consts.GAPV) + 'px (overestimate)\n');

  // COL 3:18 (Αἱ γυναῖκες) で hgt vs 実 maxY を比較
  const xml1 = extractSentence(DATA + '/12-colossians.xml', '51', '3', '18');
  
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml1);
  await wait(200);
  
  const check1 = await pg.evaluate(() => {
    // 実際の layout maxY
    const actualH = Math.max(...words.map(w => w.y)) + ROW;
    // hgt(sentence root) での推定高さ
    const root = doc.documentElement; // <sentence>
    const estimH = hgt(root);
    return {actualH: Math.round(actualH), estimH: Math.round(estimH), diff: Math.round(estimH - actualH)};
  });
  console.log('COL 3:18 (Αἱ γυναῖκες):');
  console.log('  phrase()  実高: ' + check1.actualH + 'px');
  console.log('  hgt(sent) 推定: ' + check1.estimH + 'px');
  console.log('  差分(過大推定): ' + check1.diff + 'px' + (check1.diff > 0 ? ' ← 過大' : ' (一致)'));

  // COL 3:21 (οἱ πατέρες) — det+noun 含む短い文
  const xml2 = extractSentence(DATA + '/12-colossians.xml', '51', '3', '21');
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml2);
  await wait(200);
  const check2 = await pg.evaluate(() => {
    const actualH = Math.max(...words.map(w => w.y)) + ROW;
    const estimH = hgt(doc.documentElement);
    return {actualH: Math.round(actualH), estimH: Math.round(estimH), diff: Math.round(estimH - actualH)};
  });
  console.log('\nCOL 3:21 (οἱ πατέρες):');
  console.log('  phrase()  実高: ' + check2.actualH + 'px');
  console.log('  hgt(sent) 推定: ' + check2.estimH + 'px');
  console.log('  差分: ' + check2.diff + 'px');

  // GAL 2:21 (τὴν χάριν τοῦ θεοῦ) — NPofNP shortcut あり → 一致するはず
  const xml3 = extractSentence(DATA + '/09-galatians.xml', '48', '2', '21');
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml3);
  await wait(200);
  const check3 = await pg.evaluate(() => {
    const actualH = Math.max(...words.map(w => w.y)) + ROW;
    const estimH = hgt(doc.documentElement);
    return {actualH: Math.round(actualH), estimH: Math.round(estimH), diff: Math.round(estimH - actualH)};
  });
  console.log('\nGAL 2:21 (τὴν χάριν τοῦ θεοῦ — NPofNP shortcut):');
  console.log('  phrase()  実高: ' + check3.actualH + 'px');
  console.log('  hgt(sent) 推定: ' + check3.estimH + 'px');
  console.log('  差分: ' + check3.diff + 'px');

  // 1CO 7:14 (NPDetAdj Pattern A — shortcut あり)
  const xml4 = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1co_7_14.xml', 'utf8');
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml4);
  await wait(200);
  const check4 = await pg.evaluate(() => {
    const actualH = Math.max(...words.map(w => w.y)) + ROW;
    const estimH = hgt(doc.documentElement);
    return {actualH: Math.round(actualH), estimH: Math.round(estimH), diff: Math.round(estimH - actualH)};
  });
  console.log('\n1CO 7:14 (NPDetAdj Pattern A — shortcut あり):');
  console.log('  phrase()  実高: ' + check4.actualH + 'px');
  console.log('  hgt(sent) 推定: ' + check4.estimH + 'px');
  console.log('  差分: ' + check4.diff + 'px');

  // AdjpNp チェック (COL 3:9)
  const xml5 = extractSentence(DATA + '/12-colossians.xml', '51', '3', '9');
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml5);
  await wait(200);
  const check5 = await pg.evaluate(() => {
    const actualH = Math.max(...words.map(w => w.y)) + ROW;
    const estimH = hgt(doc.documentElement);
    return {actualH: Math.round(actualH), estimH: Math.round(estimH), diff: Math.round(estimH - actualH)};
  });
  console.log('\nCOL 3:9 (τὸν παλαιὸν ἄνθρωπον — AdjpNp):');
  console.log('  phrase()  実高: ' + check5.actualH + 'px');
  console.log('  hgt(sent) 推定: ' + check5.estimH + 'px');
  console.log('  差分: ' + check5.diff + 'px');

  await b.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
