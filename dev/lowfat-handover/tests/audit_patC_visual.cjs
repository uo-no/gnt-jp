// Pattern C 4件 変更前後の座標・視覚確認
const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const fs = require('fs');
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/patC';
fs.mkdirSync(SSDIR, {recursive: true});
const wait = ms => new Promise(r => setTimeout(r, ms));

const CASES = [
  { name:'ROM_12_2',  file:'rom_12_2.xml',      targets:['τὸ','θέλημα','τοῦ','θεοῦ,','τὸ'], mainNoun:'θέλημα' },
  { name:'EPH_1_13',  file:'eph_1_13.xml',       targets:['τῷ','πνεύματι','τῆς','ἐπαγγελίας','τῷ'], mainNoun:'πνεύματι' },
  { name:'1TH_4_8',   file:'1th_4_8_detail.xml', targets:['τὸ','πνεῦμα','αὐτοῦ','τὸ','ἅγιον'], mainNoun:'πνεῦμα' },
  { name:'2TI_4_18',  file:'2ti_4_18.xml',       targets:['τὴν','βασιλείαν','αὐτοῦ','τὴν','ἐπουράνιον·'], mainNoun:'βασιλείαν' },
];

(async () => {
  const b = await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell', args:['--no-sandbox'],
    defaultViewport:{width:1400,height:900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('PAGE_ERR:', e.message));
  await pg.goto(APP);
  await wait(600);

  for (const cas of CASES) {
    const xml = fs.readFileSync(`/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/${cas.file}`, 'utf8');
    console.log(`\n${'='.repeat(55)}`);
    console.log(`[${cas.name}]`);

    for (const mode of [false, true]) {
      await pg.evaluate((x, di) => { detInline = di; fresh(x); }, xml, mode);
      await wait(300);

      const info = await pg.evaluate((mainNoun) => {
        // 全語の座標を取得
        const byText = {};
        for (const w of words) {
          if (!byText[w.text]) byText[w.text] = [];
          byText[w.text].push({x:Math.round(w.x), y:Math.round(w.y), w:Math.round(w.w)});
        }
        // b2Pairs
        const b2 = b2Pairs.map(pr=>({
          det:pr.det?pr.det.text:'?',
          noun:pr.noun?pr.noun.text:'?',
          sameY:pr.det&&pr.noun?pr.det.y===pr.noun.y:false,
          elOk:!!pr.el
        }));
        // 主要名詞の位置
        const mn = byText[mainNoun] ? byText[mainNoun][0] : null;
        return {
          maxX:Math.round(Math.max(...words.map(w=>w.x+w.w))),
          maxY:Math.round(Math.max(...words.map(w=>w.y))),
          wordCount:words.length,
          mainNoun: mn,
          byText,
          b2
        };
      }, cas.mainNoun);

      const label = mode ? 'detInline=true (後)' : 'detInline=false (前)';
      console.log(`\n  ${label}: maxX=${info.maxX} maxY=${info.maxY} words=${info.wordCount}`);
      if (info.mainNoun) console.log(`  主要名詞 ${cas.mainNoun}: x=${info.mainNoun.x} y=${info.mainNoun.y}`);

      if (mode && info.b2.length > 0) {
        // b2Pairs確認: 今回の4件の冠詞が含まれているか
        const relevant = info.b2.filter(pr => pr.noun === cas.mainNoun);
        if (relevant.length > 0) {
          relevant.forEach(pr => {
            console.log(`  ✓ b2Pairs: det="${pr.det}" noun="${pr.noun}" same_y:${pr.sameY} el:${pr.elOk}`);
          });
        } else {
          console.log(`  NOTE: b2Pairs に ${cas.mainNoun} の対が見当たらない`);
        }
      }

      if (mode && info.mainNoun) {
        // 外側 det が mainNoun と同じ y か確認
        // 外側 det は mainNoun の直前にあるはず (x が小さい)
        const allDets = Object.entries(info.byText)
          .filter(([t,_]) => ['τὸ','τῷ','τὴν','ὁ','ἡ','τοῦ','τῆς','τοῖς','τὰ','τῇ'].includes(t))
          .flatMap(([t,ps]) => ps.map(p=>({text:t,...p})));
        // mainNoun の y と同じ det を探す
        const inlineDet = allDets.filter(d => d.y === info.mainNoun.y && d.x < info.mainNoun.x);
        if (inlineDet.length > 0) {
          inlineDet.forEach(d => console.log(`  外側det "${d.text}" x=${d.x} y=${d.y} → mainNoun y=${info.mainNoun.y}: 同一ベースライン CONFIRMED`));
        } else {
          console.log(`  NOTE: mainNoun y=${info.mainNoun.y} と同じ y の det が見当たらない`);
        }
      }

      // 対象語の座標（前後の変化確認用）
      for (const [t, positions] of Object.entries(info.byText)) {
        if (['θέλημα','πνεύματι','πνεῦμα','βασιλείαν'].includes(t) || 
            ['τὸ','τῷ','τὴν'].includes(t)) {
          positions.slice(0,3).forEach(pos => {
            // 重要語のみ表示
            if (t === cas.mainNoun || true) {
              // don't flood output
            }
          });
        }
      }
    }

    // スクリーンショット (detInline=true)
    await pg.evaluate((x) => { detInline=true; b2UL=false; fresh(x); }, xml);
    await wait(300);
    const mainInfo = await pg.evaluate((mainNoun) => {
      const mn = words.find(w=>w.text===mainNoun);
      return mn ? {x:Math.round(mn.x),y:Math.round(mn.y)} : null;
    }, cas.mainNoun);
    if (mainInfo) {
      await pg.evaluate((cx,cy) => { view.x=-(cx-120)*view.k; view.y=-(cy-60)*view.k; applyView(); }, mainInfo.x, mainInfo.y);
      await wait(100);
      await pg.screenshot({path:`${SSDIR}/${cas.name}_after.png`, fullPage:false});
      console.log(`\n  📷 ${cas.name}_after.png`);
    }
    // before
    await pg.evaluate((x) => { detInline=false; b2UL=false; fresh(x); }, xml);
    await wait(300);
    if (mainInfo) {
      await pg.evaluate((cx,cy) => { view.x=-(cx-120)*view.k; view.y=-(cy-60)*view.k; applyView(); }, mainInfo.x, mainInfo.y);
      await wait(100);
      await pg.screenshot({path:`${SSDIR}/${cas.name}_before.png`, fullPage:false});
      console.log(`  📷 ${cas.name}_before.png`);
    }
  }

  await b.close();
  console.log('\n\n完了');
})().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
