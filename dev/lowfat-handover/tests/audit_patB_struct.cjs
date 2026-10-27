// Pattern B 7件構造監査
// 対象: wg[rule=DetAdj] を Pauline 書で抽出し親コンテキストと子構造を確認
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const wait = ms => new Promise(r => setTimeout(r, ms));

const BOOKS = ['ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM'];

(async () => {
  const b = await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell', args:['--no-sandbox'],
    defaultViewport:{width:1400,height:900}
  });
  const pg = await b.newPage();
  await pg.goto(APP);
  await wait(600);

  const results = [];

  for (const book of BOOKS) {
    let bdata;
    try {
      bdata = await pg.evaluate(bk => {
        if (!doc || !doc.querySelector) return null;
        return null; // will use fresh() instead
      }, book);
    } catch(e) {}

    // bible_data から取得
    const bookData = await pg.evaluate(async (bk) => {
      try {
        const resp = await fetch(`../bible_data/lowfat/${bk.toLowerCase()}.xml`);
        if (!resp.ok) return null;
        const text = await resp.text();
        const parser = new DOMParser();
        const d = parser.parseFromString(text, 'text/xml');
        
        const results = [];
        const detAdjs = d.querySelectorAll('wg[rule="DetAdj"]');
        
        for (const da of detAdjs) {
          const daKids = [...da.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
          if (daKids.length < 2) continue;
          
          const first = daKids[0];
          const second = daKids[1];
          
          // Pattern B: 最初の子が w[det]、2番目が w[adj]
          if (first.tagName !== 'w' || first.getAttribute('class') !== 'det') continue;
          if (second.tagName !== 'w') continue;
          
          // 親wgのruleと構造
          const parent = da.parentElement;
          const parentRule = parent ? parent.getAttribute('rule') : null;
          const parentTag = parent ? parent.tagName : null;
          
          // 親wgの兄弟を調査: 外側detがあるか
          let outerDet = null;
          let outerDetText = null;
          let daIndex = -1;
          
          if (parent) {
            const siblings = [...parent.children].filter(c => c.tagName==='w'||c.tagName==='wg');
            daIndex = siblings.indexOf(da);
            // 前の兄弟で class=det の w を探す
            for (let i = 0; i < daIndex; i++) {
              const sib = siblings[i];
              if (sib.tagName === 'w' && sib.getAttribute('class') === 'det') {
                outerDet = true;
                outerDetText = sib.getAttribute('unicode') || sib.textContent.trim();
              }
            }
          }
          
          // 節参照
          const words = [...da.getElementsByTagName('w')];
          const ref = words.length > 0 ? words[0].getAttribute('n') : null;
          
          // 語テキスト
          const detText = first.getAttribute('unicode') || first.textContent.trim();
          const adjText = second.getAttribute('unicode') || second.textContent.trim();
          
          // 親wgの全子要素の型を取得
          let parentKidTypes = [];
          if (parent) {
            parentKidTypes = [...parent.children]
              .filter(c => c.tagName==='w'||c.tagName==='wg')
              .map(c => {
                if (c.tagName === 'w') return `w[${c.getAttribute('class')||'?'}:${c.getAttribute('unicode')||c.textContent.trim().slice(0,8)}]`;
                return `wg[${c.getAttribute('rule')||'?'}]`;
              });
          }
          
          // さらに上の祖先を探す
          let grandParentRule = null;
          if (parent && parent.parentElement) {
            grandParentRule = parent.parentElement.getAttribute ? parent.parentElement.getAttribute('rule') : null;
          }
          
          results.push({
            ref, bk,
            detText, adjText,
            daKidCount: daKids.length,
            extraKids: daKids.slice(2).map(k => `${k.tagName}[${k.getAttribute('class')||k.getAttribute('rule')||'?'}]`),
            parentTag, parentRule, grandParentRule,
            daIndex, parentKidCount: parentKidTypes.length,
            parentKidTypes,
            outerDet, outerDetText
          });
        }
        return results;
      } catch(e) {
        return {error: e.message};
      }
    }, book);

    if (bookData && Array.isArray(bookData)) {
      results.push(...bookData);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`wg[rule=DetAdj] 全件 (Pattern B候補)`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`総件数: ${results.length}`);
  
  for (const r of results) {
    console.log(`\n[${r.ref}]`);
    console.log(`  DetAdj: "${r.detText}" + "${r.adjText}" (子${r.daKidCount}件${r.extraKids.length?', 追加:'+r.extraKids.join(','):''})`);
    console.log(`  親: ${r.parentTag}[rule=${r.parentRule}] 祖父:${r.grandParentRule||'n/a'}`);
    console.log(`  親の子構成 [${r.daIndex}]: ${r.parentKidTypes.join(' | ')}`);
    if (r.outerDet) {
      console.log(`  ★ 外側det: "${r.outerDetText}"`);
    }
  }

  await b.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
