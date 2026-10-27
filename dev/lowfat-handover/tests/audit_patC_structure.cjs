// Pattern C 4件 詳細構造監査 — READ ONLY
const p = require('puppeteer-core');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const fs = require('fs');
const wait = ms => new Promise(r => setTimeout(r, ms));

const CASES = [
  { name: 'ROM 12:2',  file: 'rom_12_2.xml',       verse: 'ROM 12:2' },
  { name: 'EPH 1:13',  file: 'eph_1_13.xml',        verse: 'EPH 1:13' },
  { name: '1TH 4:8',   file: '1th_4_8_detail.xml',  verse: '1TH 4:8' },
  { name: '2TI 4:18',  file: '2ti_4_18.xml',        verse: '2TI 4:18' },
];

function dc(el) {
  const out = []; let c = el.firstChild;
  while (c) { if (c.nodeType === 1) out.push(c); c = c.nextSibling; }
  return out;
}

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

  for (const cas of CASES) {
    const xml = fs.readFileSync(`/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/${cas.file}`, 'utf8');
    await pg.evaluate((x) => { detInline = false; fresh(x); }, xml);
    await wait(300);

    const info = await pg.evaluate((verseName) => {
      // NPDetAdj wg を探す
      function A(el, attr) { return el.getAttribute ? el.getAttribute(attr) || '' : ''; }
      function dc(el) { const o=[]; let c=el.firstChild; while(c){if(c.nodeType===1)o.push(c);c=c.nextSibling;} return o; }
      function allW(el) { return Array.from(el.querySelectorAll('w')); }
      function wgTree(el, depth) {
        const kids = dc(el).filter(k=>k.tagName==='w'||k.tagName==='wg');
        const text = el.tagName==='w' ? (A(el,'unicode')||el.textContent||'').trim() : '';
        const info = {
          tag: el.tagName,
          class: A(el,'class'),
          rule: A(el,'rule'),
          articular: A(el,'articular'),
          type: A(el,'type'),
          role: A(el,'role'),
          text: text,
          depth,
          kids: kids.map(k => wgTree(k, depth+1))
        };
        if (el.tagName === 'wg') {
          const ws = allW(el);
          info.fullText = ws.map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,60);
        }
        return info;
      }

      const allWg = Array.from(doc.querySelectorAll('wg'));
      const target = allWg.find(wg => A(wg,'rule')==='NPDetAdj');
      if (!target) return { error: 'NPDetAdj not found' };

      const parent = target.parentNode;
      const parentKids = dc(parent);
      const detSibs = parentKids.filter(s=>s.tagName==='w'&&A(s,'class')==='det');
      const outerDetText = detSibs.map(d=>A(d,'unicode')||d.textContent.trim()).join(' ');

      // target の直接子の詳細
      const targetKids = dc(target).filter(k=>k.tagName==='w'||k.tagName==='wg');
      
      // 先頭wg の中身
      const firstChild = targetKids[0];
      const secondChild = targetKids[1];
      
      let firstChildDetail = null;
      if (firstChild) {
        const firstKids = dc(firstChild).filter(k=>k.tagName==='w'||k.tagName==='wg');
        firstChildDetail = {
          tag: firstChild.tagName,
          class: A(firstChild,'class'),
          rule: A(firstChild,'rule'),
          articular: A(firstChild,'articular'),
          fullText: allW(firstChild).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,50),
          kids: firstKids.map(k=>({
            tag:k.tagName, class:A(k,'class'), rule:A(k,'rule'),
            text: (k.tagName==='w'?A(k,'unicode')||k.textContent.trim():''),
            fullText: k.tagName==='wg'?allW(k).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,30):''
          }))
        };
      }
      
      let secondChildDetail = null;
      if (secondChild) {
        const secondKids = dc(secondChild).filter(k=>k.tagName==='w'||k.tagName==='wg');
        secondChildDetail = {
          tag: secondChild.tagName,
          class: A(secondChild,'class'),
          rule: A(secondChild,'rule'),
          articular: A(secondChild,'articular'),
          fullText: allW(secondChild).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,50),
          kids: secondKids.map(k=>({
            tag:k.tagName, class:A(k,'class'), rule:A(k,'rule'),
            text: (k.tagName==='w'?A(k,'unicode')||k.textContent.trim():''),
            fullText: k.tagName==='wg'?allW(k).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,30):''
          }))
        };
      }

      // NONHEAD 定義: det, prep, conj
      const NONHEAD = new Set(['det','prep','conj']);
      
      // 現在の phrase() ロジックで hi を特定 (heuristic)
      const allKsAtParent = parentKids.filter(k=>k.tagName==='w'||k.tagName==='wg');
      let hi = allKsAtParent.findIndex(k=>k.tagName==='w'&&!NONHEAD.has(A(k,'class')));
      if(hi<0) hi = allKsAtParent.findIndex(k=>k.tagName==='wg');
      if(hi<0) hi = 0;
      const headEl = allKsAtParent[hi];

      return {
        verse: verseName,
        parentClass: A(parent,'class'),
        parentRule: A(parent,'rule'),
        outerDetText,
        targetFullText: allW(target).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,70),
        targetRule: A(target,'rule'),
        targetArticular: A(target,'articular'),
        numKids: targetKids.length,
        firstChild: firstChildDetail,
        secondChild: secondChildDetail,
        currentHeadTag: headEl ? headEl.tagName : '?',
        currentHeadClass: headEl ? A(headEl,'class') : '?',
        currentHeadRule: headEl ? A(headEl,'rule') : '?',
        currentHeadText: headEl ? (headEl.tagName==='w'?A(headEl,'unicode')||headEl.textContent.trim():allW(headEl).map(w=>A(w,'unicode')||w.textContent.trim()).join(' ').slice(0,30)) : '?',
      };
    }, cas.verse);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${cas.name}]`);
    if (info.error) { console.log('ERROR:', info.error); continue; }
    console.log(`  parent: class=${info.parentClass} rule=${info.parentRule}`);
    console.log(`  外側det: "${info.outerDetText}"`);
    console.log(`  NPDetAdj 全文: "${info.targetFullText}"`);
    console.log(`  NPDetAdj articular=${info.targetArticular}, 直接子数=${info.numKids}`);
    console.log(`  phrase()現在の head: tag=${info.currentHeadTag} class=${info.currentHeadClass} rule=${info.currentHeadRule} text="${info.currentHeadText}"`);
    
    if (info.firstChild) {
      console.log(`\n  [第1子 wg]: class=${info.firstChild.class} rule=${info.firstChild.rule} articular=${info.firstChild.articular}`);
      console.log(`    全文: "${info.firstChild.fullText}"`);
      console.log(`    直接子:`);
      info.firstChild.kids.forEach(k => {
        if (k.tag==='w') console.log(`      w[${k.class}] "${k.text}"`);
        else console.log(`      wg[${k.class}/${k.rule}] "${k.fullText}"`);
      });
    }
    if (info.secondChild) {
      console.log(`\n  [第2子 wg]: class=${info.secondChild.class} rule=${info.secondChild.rule} articular=${info.secondChild.articular}`);
      console.log(`    全文: "${info.secondChild.fullText}"`);
      console.log(`    直接子:`);
      info.secondChild.kids.forEach(k => {
        if (k.tag==='w') console.log(`      w[${k.class}] "${k.text}"`);
        else console.log(`      wg[${k.class}/${k.rule}] "${k.fullText}"`);
      });
    }
  }

  await b.close();
  console.log('\n\n監査完了');
})().catch(e=>{ console.error('FATAL:', e.message); process.exit(1); });
