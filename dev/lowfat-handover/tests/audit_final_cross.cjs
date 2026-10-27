// detInline 横断最終監査
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/final_audit';
fs.mkdirSync(SSDIR, {recursive:true});
const wait = ms => new Promise(r => setTimeout(r, ms));

// 節参照から sentence を抽出 (xml:id ベース)
function extractSentence(xmlPath, bookNum, chStr, vsStr) {
  const content = fs.readFileSync(xmlPath, 'utf8');
  const searchId = 'n' + bookNum + chStr.padStart(3,'0') + vsStr.padStart(3,'0');
  const sentRe = /<sentence>([\s\S]*?)<\/sentence>/g;
  let m;
  while ((m = sentRe.exec(content)) !== null) {
    if (m[0].includes(searchId)) return '<sentence>' + m[1] + '</sentence>';
  }
  return null;
}

// 構造種別と代表例
const CASES = [
  {
    id: '1_det_noun',
    label: 'det + noun (w-head)',
    file: DATA + '/12-colossians.xml', bookNum:'51', ch:'1', vs:'3',
    targetWords: ['τῷ', 'θεῷ'], // COL 1:3
    expectSameY: true, outerDet: 'τῷ', mainWord: 'θεῷ'
  },
  {
    id: '2_det_adjpnp',
    label: 'det + AdjpNp (all-w children)',
    file: DATA + '/12-colossians.xml', bookNum:'51', ch:'3', vs:'9',
    targetWords: ['τὸν', 'παλαιὸν', 'ἄνθρωπον'], // COL 3:9
    expectSameY: true, outerDet: 'τὸν', mainWord: 'ἄνθρωπον'
  },
  {
    id: '3_det_npofnp',
    label: 'det + NPofNP',
    xmlSrc: '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml',
    targetWords: ['τὴν', 'χάριν', 'τοῦ', 'θεοῦ'],
    expectSameY: true, outerDet: 'τὴν', mainWord: 'χάριν'
  },
  {
    id: '4_det_npdetadj_a',
    label: 'det + NPDetAdj Pattern A (noun direct child)',
    xmlSrc: '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1co_7_14.xml',
    targetWords: ['ὁ', 'ἀνὴρ', 'ὁ', 'ἄπιστος'],
    expectSameY: true, outerDet: 'ὁ', mainWord: 'ἀνὴρ'
  },
  {
    id: '5_det_npdetadj_c',
    label: 'det + NPDetAdj Pattern C (NPofNP → noun)',
    xmlSrc: '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/1th_4_8_detail.xml',
    targetWords: ['τὸ', 'πνεῦμα', 'αὐτοῦ', 'τὸ', 'ἅγιον'],
    expectSameY: true, outerDet: 'τὸ', mainWord: 'πνεῦμα'
  },
  {
    id: '6_patB_nochange',
    label: 'Pattern B — 実体詞化 (inline NOT expected)',
    file: DATA + '/07-1corinthians.xml', bookNum:'46', ch:'10', vs:'24',
    targetWords: ['τὸ', 'τοῦ', 'ἑτέρου'],
    expectSameY: false, outerDet: 'τὸ', mainWord: 'ἑτέρου'
  },
  {
    id: '7_2co_8_15_detcl',
    label: 'Pattern B DetCL — 節名詞化 (inline NOT expected)',
    file: DATA + '/08-2corinthians.xml', bookNum:'47', ch:'8', vs:'15',
    targetWords: ['Ὁ', 'τὸ', 'πολὺ', 'ἐπλεόνασεν'],
    expectSameY: false, outerDet: 'Ὁ', mainWord: 'πολὺ'
  },
];

// b2UL=false で最初のverseの状態で確認
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

  for (const cas of CASES) {
    console.log('\n' + '='.repeat(55));
    console.log('[' + cas.id + '] ' + cas.label);

    // XML を取得
    let xml;
    if (cas.xmlSrc) {
      xml = fs.readFileSync(cas.xmlSrc, 'utf8');
    } else {
      xml = extractSentence(cas.file, cas.bookNum, cas.ch, cas.vs);
    }
    if (!xml) { console.log('  ERROR: sentence not found'); failCount++; continue; }

    // detInline=true でレイアウト
    await pg.evaluate((x) => { detInline=true; b2UL=false; b2Pairs=[]; fresh(x); }, xml);
    await wait(300);

    const info = await pg.evaluate((outerDet, mainWord) => {
      const byText = {};
      for (const w of words) {
        const t = w.text.replace(/[.,;·:!?]/g,'');
        if (!byText[t]) byText[t] = [];
        byText[t].push({x:Math.round(w.x), y:Math.round(w.y), w:Math.round(w.w)});
      }
      const detKey = outerDet.replace(/[.,;·:!?]/g,'');
      const nounKey = mainWord.replace(/[.,;·:!?]/g,'');
      const detPos = byText[detKey] ? byText[detKey][0] : null;
      const nounPos = byText[nounKey] ? byText[nounKey][0] : null;
      const sameY = detPos && nounPos ? detPos.y === nounPos.y : null;
      return {
        detPos, nounPos, sameY,
        maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))),
        maxY: Math.round(Math.max(...words.map(w=>w.y))),
        wc: words.length,
        b2PairsCount: b2Pairs.length
      };
    }, cas.outerDet, cas.mainWord);

    console.log('  maxX=' + info.maxX + ' maxY=' + info.maxY + ' words=' + info.wc);
    if (info.detPos) console.log('  det "' + cas.outerDet + '": x=' + info.detPos.x + ' y=' + info.detPos.y);
    if (info.nounPos) console.log('  noun "' + cas.mainWord + '": x=' + info.nounPos.x + ' y=' + info.nounPos.y);
    if (info.sameY !== null) {
      chk('ベースライン確認 (expect sameY=' + cas.expectSameY + ')',
          info.sameY === cas.expectSameY,
          'sameY=' + info.sameY);
    } else {
      console.log('  SKIP: 語が見つからない');
    }

    // hPhrase vs phrase 高さ整合確認 (detInline=false との maxY 差分が想定内か)
    await pg.evaluate((x) => { detInline=false; b2UL=false; fresh(x); }, xml);
    await wait(200);
    const infoOff = await pg.evaluate(() => ({
      maxY: Math.round(Math.max(...words.map(w=>w.y))),
      maxX: Math.round(Math.max(...words.map(w=>w.x+w.w)))
    }));
    const deltaY = info.maxY - infoOff.maxY;
    const deltaX = info.maxX - infoOff.maxX;
    console.log('  detInline OFF: maxX=' + infoOff.maxX + ' maxY=' + infoOff.maxY);
    console.log('  Δ (ON-OFF): ΔX=' + deltaX + ' ΔY=' + deltaY + (cas.expectSameY ? ' (期待: ΔY<0, ΔX>0)' : ' (期待: ΔY≈0, ΔX≈0)'));

    // スクリーンショット
    await pg.evaluate((x) => { detInline=true; b2UL=false; fresh(x); }, xml);
    await wait(200);
    if (info.detPos) {
      await pg.evaluate((cx, cy) => { view.x=-(cx-80)*view.k; view.y=-(cy-80)*view.k; applyView(); }, info.detPos.x, info.detPos.y);
      await wait(100);
    }
    await pg.screenshot({path: SSDIR + '/' + cas.id + '.png', fullPage:false});
    console.log('  📷 ' + cas.id + '.png');
  }

  // phrase/hPhrase 高さ整合: COL full sentence でページ区切り高さを確認
  console.log('\n' + '='.repeat(55));
  console.log('[height_check] hPhrase vs phrase 高さ整合 (COL full)');
  const colXml = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml', 'utf8');
  await pg.evaluate(x => { detInline=true; b2UL=false; fresh(x); }, colXml);
  await wait(300);
  const colInfo = await pg.evaluate(() => {
    // COL の実際の layout を確認
    return {
      maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))),
      maxY: Math.round(Math.max(...words.map(w=>w.y))),
      wc: words.length
    };
  });
  console.log('  COL maxX=' + colInfo.maxX + ' maxY=' + colInfo.maxY + ' words=' + colInfo.wc);
  chk('COL maxX=1427 (回帰baseline)', colInfo.maxX === 1427, 'maxX=' + colInfo.maxX);
  chk('COL maxY=3050 (回帰baseline)', colInfo.maxY === 3050, 'maxY=' + colInfo.maxY);

  await b.close();
  console.log('\n=== 監査合計: ' + passCount + ' PASS / ' + failCount + ' FAIL ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
