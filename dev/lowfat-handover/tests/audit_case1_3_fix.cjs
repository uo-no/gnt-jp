// cases 1, 3 の修正確認
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/final_audit';
fs.mkdirSync(SSDIR, {recursive:true});
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

const CASES2 = [
  {
    id:'1b_det_noun',
    label:'det + noun (COL 3:18 — Αἱ γυναῖκες)',
    file: DATA + '/12-colossians.xml', bookNum:'51', ch:'3', vs:'18',
    outerDet:'Αἱ', mainWord:'γυναῖκες', expectSameY:true
  },
  {
    id:'1c_det_noun_simple',
    label:'det + noun (COL 3:21 — οἱ πατέρες)',
    file: DATA + '/12-colossians.xml', bookNum:'51', ch:'3', vs:'21',
    outerDet:'οἱ', mainWord:'πατέρες', expectSameY:true
  },
  {
    id:'3b_det_npofnp',
    label:'det + NPofNP (GAL 2:21 — τὴν χάριν τοῦ θεοῦ)',
    file: DATA + '/09-galatians.xml', bookNum:'48', ch:'2', vs:'21',
    outerDet:'τὴν', mainWord:'χάριν', expectSameY:true
  },
  {
    id:'3c_det_npofnp_php',
    label:'det + NPofNP (PHP 4:23 — ἡ χάρις τοῦ κυρίου)',
    file: DATA + '/11-philippians.xml', bookNum:'50', ch:'4', vs:'23',
    outerDet:'ἡ', mainWord:'χάρις', expectSameY:true
  },
];

(async () => {
  const b = await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell', args:['--no-sandbox'],
    defaultViewport:{width:1400,height:900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('ERR:', e.message));
  await pg.goto(APP);
  await wait(600);

  let passCount = 0, failCount = 0;
  const chk = (label, ok, detail) => {
    if (ok) { passCount++; console.log('  [PASS]', label, detail||''); }
    else     { failCount++; console.log('  [FAIL]', label, detail||''); }
  };

  for (const cas of CASES2) {
    const xml = extractSentence(cas.file, cas.bookNum, cas.ch, cas.vs);
    if (!xml) { console.log('[' + cas.id + '] NOT FOUND'); continue; }
    
    await pg.evaluate(x => { detInline=true; b2UL=false; b2Pairs=[]; fresh(x); }, xml);
    await wait(300);

    const info = await pg.evaluate((outerDet, mainWord) => {
      const byText = {};
      for (const w of words) {
        const t = w.text.replace(/[.,;·:!?]/g,'');
        if (!byText[t]) byText[t] = [];
        byText[t].push({x:Math.round(w.x), y:Math.round(w.y)});
      }
      const dk = outerDet.replace(/[.,;·:!?]/g,'');
      const nk = mainWord.replace(/[.,;·:!?]/g,'');
      const dp = byText[dk] ? byText[dk][0] : null;
      const np = byText[nk] ? byText[nk][0] : null;
      const sameY = dp && np ? dp.y === np.y : null;
      return {dp, np, sameY, wc:words.length,
              maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))),
              maxY: Math.round(Math.max(...words.map(w=>w.y)))};
    }, cas.outerDet, cas.mainWord);

    console.log('\n[' + cas.id + '] ' + cas.label);
    console.log('  words=' + info.wc + ' maxX=' + info.maxX + ' maxY=' + info.maxY);
    if (info.dp) console.log('  det "' + cas.outerDet + '": x=' + info.dp.x + ' y=' + info.dp.y);
    if (info.np) console.log('  noun "' + cas.mainWord + '": x=' + info.np.x + ' y=' + info.np.y);
    if (info.sameY !== null) {
      chk('sameY=' + cas.expectSameY, info.sameY === cas.expectSameY, 'actual=' + info.sameY);
    }

    // detInline=false との差分
    await pg.evaluate(x => { detInline=false; b2UL=false; fresh(x); }, xml);
    await wait(200);
    const off = await pg.evaluate(() => ({
      maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))),
      maxY: Math.round(Math.max(...words.map(w=>w.y)))
    }));
    console.log('  OFF: maxX=' + off.maxX + ' maxY=' + off.maxY);
    console.log('  Δ: ΔX=' + (info.maxX-off.maxX) + ' ΔY=' + (info.maxY-off.maxY));

    // スクリーンショット
    await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, xml);
    await wait(200);
    if (info.dp) {
      await pg.evaluate((cx,cy) => { view.x=-(cx-80)*view.k; view.y=-(cy-80)*view.k; applyView(); }, info.dp.x, info.dp.y);
      await wait(80);
    }
    await pg.screenshot({path: SSDIR + '/' + cas.id + '.png'});
    console.log('  📷 ' + cas.id + '.png');
  }

  await b.close();
  console.log('\n=== 結果: ' + passCount + ' PASS / ' + failCount + ' FAIL ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
