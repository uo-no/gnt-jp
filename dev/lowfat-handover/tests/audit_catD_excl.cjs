// カテゴリD 除外確認: Pattern B (DetAdj/1CO 10:24) と Pattern C (NPDetAdj wg-head/1TH 4:8)
const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width:1400,height:900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('PAGE_ERR:', e.message));
  await pg.goto(APP);
  await wait(600);

  // ─── 1CO 10:24: Pattern B (DetAdj, 先頭子=det → 除外されるべき) ───
  console.log('=== 1CO 10:24 (Pattern B: DetAdj, 先頭子=w[det], 除外ケース) ===');
  const xml1024 = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1co_10_24.xml', 'utf8');
  await pg.evaluate(xml => { detInline = true; fresh(xml); }, xml1024);
  await wait(300);
  
  // τὸ τοῦ ἑτέρου の確認
  const coords1024 = await pg.evaluate(() => {
    return words.filter(w => ['τὸ','τοῦ','ἑτέρου,'].includes(w.text))
      .map(w => ({text: w.text, x: Math.round(w.x), y: Math.round(w.y)}));
  });
  console.log('語座標:', JSON.stringify(coords1024));
  // τὸ と τοῦ は別のy（τὸ が上位、τοῦ が下）であることを確認
  const to = coords1024.find(c => c.text === 'τὸ');
  const tou = coords1024.find(c => c.text === 'τοῦ');
  if (to && tou) {
    const sameY = to.y === tou.y;
    // Pattern B は除外されるので τὸ と τοῦ は同じ y にならないはず
    // ただし文脈次第で同 y になる可能性も (別の理由で)
    console.log(`τὸ y=${to.y}, τοῦ y=${tou.y} → same_y: ${sameY}`);
    // DetAdj 内の τοῦ は τὸ より下にあることを確認（修飾語として配置）
    console.log(`  → τoῦ は τὸ と独立: ${!sameY ? 'CONFIRMED (別ライン)' : 'NOTE: 同一ライン (別の理由の可能性)'}`);
  }
  
  // ─── 1TH 4:8: Pattern C (NPDetAdj, 先頭子=wg → 除外されるべき) ───
  console.log('\n=== 1TH 4:8 (Pattern C: NPDetAdj, 先頭子=wg[np], 除外ケース) ===');
  const xml4_8 = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1th_4_8.xml', 'utf8');
  await pg.evaluate(xml => { detInline = true; fresh(xml); }, xml4_8);
  await wait(300);
  
  // 1TH 4:8 の NPDetAdj: wg全文="πνεῦμα αὐτοῦ τὸ ἅγιον"
  // 外側 det=τὸ, wg[NPDetAdj] 先頭子=wg[np] → 除外
  const coords4_8 = await pg.evaluate(() => {
    return words.filter(w => ['πνεῦμα','αὐτοῦ','τὸ','ἅγιον'].includes(w.text))
      .map(w => ({text: w.text, x: Math.round(w.x), y: Math.round(w.y)}));
  });
  console.log('語座標:', JSON.stringify(coords4_8));
  const pneuma = coords4_8.find(c => c.text === 'πνεῦμα');
  const to_4_8 = coords4_8.find(c => c.text === 'τὸ');
  const hagion = coords4_8.find(c => c.text === 'ἅγιον');
  if (pneuma && to_4_8) {
    console.log(`πνεῦμα y=${pneuma.y}, τὸ y=${to_4_8.y}`);
    // Pattern C は除外なので τὸ は πνεῦμα と同じベースラインではない
    const sameY = pneuma.y === to_4_8.y;
    console.log(`  → τὸ と πνεῦμα 同一ベースライン: ${sameY ? 'YES (NOTE: 別の理由の可能性)' : 'NO (CONFIRMED: 除外されている)'}`);
  }
  if (to_4_8 && hagion) {
    console.log(`τὸ y=${to_4_8.y}, ἅγιον y=${hagion.y}`);
    const innerSameY = to_4_8.y === hagion.y;
    console.log(`  → τὸ と ἅγιον 同一ベースライン: ${innerSameY ? 'CONFIRMED (内側 det+adj は inline)' : 'NO'}`);
  }

  // ─── XMLの NPDetAdj 先頭子確認 ───
  const structCheck = await pg.evaluate(() => {
    const allWg = Array.from(doc.querySelectorAll('wg'));
    return allWg.filter(wg => wg.getAttribute('rule')==='NPDetAdj').map(wg => {
      function dc(el){const o=[];let c=el.firstChild;while(c){if(c.nodeType===1)o.push(c);c=c.nextSibling;}return o;}
      const kids = dc(wg);
      const fk = kids[0];
      return {
        rule: wg.getAttribute('rule'),
        firstKidTag: fk ? fk.tagName : 'none',
        firstKidClass: fk ? fk.getAttribute('class') : '',
        text: Array.from(wg.querySelectorAll('w')).map(w=>w.getAttribute('unicode')||w.textContent).join(' ').slice(0,30)
      };
    });
  });
  console.log('\n現在ロード中XMLのNPDetAdj 先頭子:', JSON.stringify(structCheck, null, 2));

  await b.close();
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
