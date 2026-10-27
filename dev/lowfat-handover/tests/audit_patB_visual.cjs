// Pattern B 7件 現在の表示確認
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SSDIR = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/patB';
fs.mkdirSync(SSDIR, {recursive:true});
const wait = ms => new Promise(r => setTimeout(r, ms));

// 7件のサンプル XML (代表3件を task7_xml から探す、なければ省略)
// 1CO 10:24 の sentence を data から抽出
const py = require('child_process');

function extractSentence(xmlPath, ref) {
  // Python で sentence 抽出
  const script = `
import xml.etree.ElementTree as ET, re
tree = ET.parse('${xmlPath}')
# refをもとに wg[rule=NPofNP or DetCL] を含む sentence を探す
target_ref = '${ref}'
for sent in tree.getroot().iter('sentence'):
    ws = list(sent.iter('w'))
    refs = [w.get('ref','') for w in ws]
    if any(r.startswith(target_ref.rsplit('!',1)[0]) for r in refs):
        import xml.etree.ElementTree as ET2
        print(ET.tostring(sent, encoding='unicode'))
        break
`;
  try {
    return py.execSync('python3 -c "' + script.replace(/"/g,'\\"').replace(/\n/g,' ') + '"', {maxBuffer:4*1024*1024}).toString().trim();
  } catch(e) { return null; }
}

// Node fs で sentence を grep 抽出
function extractSentenceNode(xmlPath, verseRef) {
  const content = fs.readFileSync(xmlPath, 'utf8');
  // verseRef (e.g. "1CO 10:24") → "1CO 10:24" パターン
  const [book, cv] = verseRef.split(' ');
  const [ch, vs] = cv.split(':');
  // xml:id pattern: n46010024xxx (1CO=46, ch=10, vs=24)
  const bookNum = {'1CO':'46','2CO':'47'}[book] || '?';
  const searchId = 'n' + bookNum + ch.padStart(3,'0') + vs.padStart(3,'0');
  // searchId を含む sentence タグを探す
  const sentRe = /<sentence>([\s\S]*?)<\/sentence>/g;
  let m;
  while ((m=sentRe.exec(content)) !== null) {
    if (m[0].includes(searchId)) return '<sentence>' + m[1] + '</sentence>';
  }
  return null;
}

const DATA_DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const CASES = [
  {name:'1CO_10_24', file:'07-1corinthians.xml', verseRef:'1CO 10:24', outerDet:'τὸ', mainAdj:'ἑτέρου'},
  {name:'1CO_15_40', file:'07-1corinthians.xml', verseRef:'1CO 15:40', outerDet:'ἡ', mainAdj:'ἐπιγείων'},
  {name:'2CO_8_15',  file:'08-2corinthians.xml', verseRef:'2CO 8:15',  outerDet:'Ὁ',  mainAdj:'πολὺ'},
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

  for (const cas of CASES) {
    const xmlContent = extractSentenceNode(DATA_DIR + '/' + cas.file, cas.verseRef);
    if (!xmlContent) { console.log('[' + cas.name + '] sentence not found'); continue; }
    
    await pg.evaluate(xml => { detInline = true; fresh(xml); }, xmlContent);
    await wait(300);

    const info = await pg.evaluate((outerDet, mainAdj) => {
      const byText = {};
      for (const w of words) {
        if (!byText[w.text]) byText[w.text] = [];
        byText[w.text].push({x:Math.round(w.x), y:Math.round(w.y), w:Math.round(w.w)});
      }
      const outerDetPos = byText[outerDet] ? byText[outerDet][0] : null;
      const adjPos = Object.entries(byText).find(([t]) => t.startsWith(mainAdj.replace(/[.,;]/g,''))) ;
      const adjP = adjPos ? adjPos[1][0] : null;
      const sameY = outerDetPos && adjP ? outerDetPos.y === adjP.y : null;
      return {outerDetPos, adjP, sameY, wordCount: words.length,
              maxX: Math.round(Math.max(...words.map(w=>w.x+w.w))),
              maxY: Math.round(Math.max(...words.map(w=>w.y)))};
    }, cas.outerDet, cas.mainAdj);

    console.log('\n[' + cas.name + ']');
    console.log('  detInline=true: maxX=' + info.maxX + ' maxY=' + info.maxY);
    if (info.outerDetPos) console.log('  外側det "' + cas.outerDet + '": x=' + info.outerDetPos.x + ' y=' + info.outerDetPos.y);
    if (info.adjP) console.log('  adj "' + cas.mainAdj + '": x=' + info.adjP.x + ' y=' + info.adjP.y);
    if (info.sameY !== null) console.log('  同一ベースライン: ' + info.sameY + ' (期待: false=別行)');

    // スクリーンショット（外側detを中心に）
    if (info.outerDetPos) {
      await pg.evaluate((cx,cy) => { view.x=-(cx-80)*view.k; view.y=-(cy-80)*view.k; applyView(); }, info.outerDetPos.x, info.outerDetPos.y);
      await wait(100);
    }
    await pg.screenshot({path: SSDIR + '/' + cas.name + '_current.png', fullPage:false});
    console.log('  📷 ' + cas.name + '_current.png');
  }

  await b.close();
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
