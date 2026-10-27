// カテゴリD: 全Pauline書で det(sibling) + wg(NPDetAdj|DetAdj) を Puppeteer + DOMParser で抽出
const p = require('puppeteer-core');
const fs = require('fs'), path = require('path');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const wait = ms => new Promise(r => setTimeout(r, ms));

const PAULINE_XML = [
  '06-romans','07-1corinthians','08-2corinthians','09-galatians',
  '10-ephesians','11-philippians','12-colossians','13-1thessalonians',
  '14-2thessalonians','15-1timothy','16-2timothy','17-titus','18-philemon'
];
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';

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

  const allResults = [];

  for (const book of PAULINE_XML) {
    const xml = fs.readFileSync(path.join(DATA, book + '.xml'), 'utf8');
    const cases = await pg.evaluate((xmlStr) => {
      const doc2 = new DOMParser().parseFromString(xmlStr, 'text/xml');
      function dc(el) {
        const out=[]; let c=el.firstChild;
        while(c){if(c.nodeType===1)out.push(c);c=c.nextSibling;}
        return out;
      }
      function allW(el){ return Array.from(el.querySelectorAll('w')); }
      function A(el,a){ return el.getAttribute ? el.getAttribute(a)||'' : ''; }

      const result = [];
      const allWg = Array.from(doc2.querySelectorAll('wg'));
      for (const wg of allWg) {
        const rule = A(wg,'rule');
        if (!['NPDetAdj','DetAdj'].includes(rule)) continue;
        const parent = wg.parentNode;
        if (!parent) continue;
        const siblings = dc(parent);
        const detSibs = siblings.filter(s=>s.tagName==='w'&&A(s,'class')==='det');
        if (detSibs.length===0) continue;
        
        const wgKids = dc(wg);
        const kidInfo = wgKids.map(k=>({
          tag:k.tagName,
          cls:A(k,'class'),
          rule:A(k,'rule'),
          text:(A(k,'unicode')||k.textContent||'').trim().slice(0,20)
        }));
        const allWs = allW(wg);
        const firstRef = allWs[0] ? A(allWs[0],'ref') : '?';
        const wgText = allWs.map(w=>A(w,'unicode')||w.textContent.trim()).join(' ');
        const detTexts = detSibs.map(d=>A(d,'unicode')||d.textContent.trim());
        
        // wg の第一直接子の情報
        const firstKid = wgKids[0];
        const firstKidClass = firstKid ? A(firstKid,'class') : '';
        const firstKidTag = firstKid ? firstKid.tagName : '';
        
        result.push({
          ref: firstRef,
          rule,
          articular: A(wg,'articular'),
          parentRule: A(parent,'rule'),
          parentClass: A(parent,'class'),
          detTexts, wgText: wgText.slice(0,50),
          kids: kidInfo,
          firstKidTag, firstKidClass,
          sibCount: siblings.length
        });
      }
      return result;
    }, xml);
    for (const c of cases) { c.book = book.replace(/^\d+-/,''); allResults.push(c); }
  }

  await b.close();

  console.log(`=== カテゴリD: det + wg(NPDetAdj|DetAdj) ===`);
  console.log(`総件数: ${allResults.length}`);
  
  const byBook = {};
  allResults.forEach(r=>{byBook[r.book]=(byBook[r.book]||0)+1;});
  console.log('\n書別件数:');
  Object.entries(byBook).forEach(([b,n])=>console.log(`  ${b}: ${n}`));

  // 子構造の分類
  const byKids = {};
  allResults.forEach(r=>{
    const key = r.kids.map(k=>`${k.tag}[${k.cls||k.rule}]`).join('+');
    byKids[key]=(byKids[key]||0)+1;
  });
  console.log('\n直接子構造パターン:');
  Object.entries(byKids).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${n}x  ${k}`));

  console.log('\n全件詳細:');
  allResults.forEach((r,i)=>{
    console.log(`[${i+1}] ${r.book} ${r.ref}  rule=${r.rule}  articular=${r.articular}`);
    console.log(`  parent: class=${r.parentClass} rule=${r.parentRule}`);
    console.log(`  外側det: "${r.detTexts.join(',')}"`);
    console.log(`  wg全文: "${r.wgText}"`);
    console.log(`  直接子: ${r.kids.map(k=>`${k.tag}[${k.cls||k.rule}]="${k.text}"`).join(', ')}`);
  });

})().catch(e=>{ console.error('FATAL:', e.message); process.exit(1); });
