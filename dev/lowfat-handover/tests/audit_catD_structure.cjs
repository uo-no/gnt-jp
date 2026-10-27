// カテゴリD: det + wg(NPDetAdj/DetAdj) 構造確認スクリプト
const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const wait = ms => new Promise(r => setTimeout(r, ms));

// 対象: Pauline 13書 1CO 1:1 開始URL
// 実データはアプリのXMLをブラウザでパースして確認

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900}
  });
  const pg = await b.newPage();
  pg.on('pageerror', e => console.error('PAGE_ERR:', e.message));
  await pg.goto(APP);
  await wait(800);

  const result = await pg.evaluate(() => {
    // Pauline books available in this build
    const books = [];
    // bookList から取得
    if (typeof bookList !== 'undefined') {
      books.push(...bookList.filter(b => typeof b === 'string'));
    }
    return { books: books.slice(0,5), hasBookList: typeof bookList !== 'undefined' };
  });
  console.log('bookList exists:', result.hasBookList);
  console.log('sample:', result.books);

  // 現在のXMLのwgを直接確認
  const catD = await pg.evaluate(() => {
    const cases = [];
    // 全wgを走査
    const allWg = Array.from(doc.querySelectorAll('wg'));
    for (const wg of allWg) {
      const rule = wg.getAttribute('rule') || '';
      if (!['NPDetAdj','DetAdj'].includes(rule)) continue;
      // この wg の親に det 単語があるか
      const parent = wg.parentNode;
      if (!parent) continue;
      const siblings = Array.from(parent.childNodes).filter(n => n.tagName==='w'||n.tagName==='wg');
      const detSibs = siblings.filter(s => s.tagName==='w' && s.getAttribute('class')==='det');
      if (detSibs.length === 0) continue;
      // 情報収集
      const refEl = wg.querySelector('w[ref]');
      const ref = refEl ? refEl.getAttribute('ref') : '?';
      const wText = Array.from(wg.querySelectorAll('w')).map(w=>w.getAttribute('unicode')||w.textContent.trim()).join(' ');
      const detText = detSibs.map(d=>d.getAttribute('unicode')||d.textContent.trim()).join(' ');
      // wg の直接子
      const wgKids = Array.from(wg.childNodes).filter(n=>n.tagName==='w'||n.tagName==='wg');
      const kidInfo = wgKids.map(k=>({
        tag: k.tagName,
        class: k.getAttribute('class')||'',
        rule: k.getAttribute('rule')||'',
        text: (k.getAttribute('unicode')||k.textContent||'').trim().slice(0,15)
      }));
      cases.push({
        ref, rule,
        parentRule: parent.getAttribute('rule')||'',
        parentClass: parent.getAttribute('class')||'',
        detText, wText: wText.slice(0,40),
        kids: kidInfo
      });
    }
    return cases;
  });
  
  console.log(`\n=== カテゴリD候補 (rule=NPDetAdj|DetAdj) in current book ===`);
  console.log(`件数: ${catD.length}`);
  catD.forEach((c,i) => {
    console.log(`\n[${i+1}] ref=${c.ref} rule=${c.rule}`);
    console.log(`  parent: class=${c.parentClass} rule=${c.parentRule}`);
    console.log(`  det: "${c.detText}"`);
    console.log(`  wg text: "${c.wText}"`);
    console.log(`  kids: ${JSON.stringify(c.kids)}`);
  });

  await b.close();
})().catch(e=>{ console.error('FATAL:', e.message); process.exit(1); });
