// Category D Pattern B の7件を正しいパスで再抽出
const p = require('puppeteer-core');
const fs = require('fs');
const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const wait = ms => new Promise(r => setTimeout(r, ms));

// ファイル名マップ
const BOOK_FILES = {
  'ROM':'06-romans','1CO':'07-1corinthians','2CO':'08-2corinthians',
  'GAL':'09-galatians','EPH':'10-ephesians','PHP':'11-philippians',
  'COL':'12-colossians','1TH':'13-1thessalonians','2TH':'14-2thessalonians',
  '1TI':'15-1timothy','2TI':'16-2timothy','TIT':'17-titus','PHM':'18-philemon'
};

(async () => {
  const b = await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell', args:['--no-sandbox'],
    defaultViewport:{width:1400,height:900}
  });
  const pg = await b.newPage();
  await pg.goto(APP);
  await wait(600);

  const allResults = [];

  for (const [bookKey, fileName] of Object.entries(BOOK_FILES)) {
    const url = `file:///Users/373da/Claude/開発室/lowfat-handover/data/lowfat/${fileName}.xml`;
    
    const results = await pg.evaluate(async (u, bk) => {
      try {
        const resp = await fetch(u);
        if (!resp.ok) return [];
        const text = await resp.text();
        const parser = new DOMParser();
        const d = parser.parseFromString(text, 'text/xml');
        
        const out = [];
        // 親wgの全直接子を調査: det(w) + head_wg(NPDetAdj|DetAdj) のパターン
        const allWg = d.querySelectorAll('wg');
        
        for (const wg of allWg) {
          const kids = [...wg.children].filter(c => c.tagName==='w'||c.tagName==='wg');
          if (kids.length < 2) continue;
          
          // det である w を探す
          const detKids = kids.filter(k => k.tagName==='w' && k.getAttribute('class')==='det');
          if (detKids.length === 0) continue;
          
          // head_wg (NPDetAdj or DetAdj) を探す
          const headWgs = kids.filter(k => k.tagName==='wg' && 
            (k.getAttribute('rule')==='NPDetAdj' || k.getAttribute('rule')==='DetAdj' || 
             k.getAttribute('rule')==='NPofNP' || k.getAttribute('rule')==='AdjpNp'));
          if (headWgs.length === 0) continue;
          
          for (const hWg of headWgs) {
            const hRule = hWg.getAttribute('rule');
            // hWg の直接子
            const hKids = [...hWg.children].filter(c => c.tagName==='w'||c.tagName==='wg');
            if (hKids.length === 0) continue;
            const firstKid = hKids[0];
            
            // Pattern B: head wg の最初の子が w[det]
            if (firstKid.tagName === 'w' && firstKid.getAttribute('class') === 'det') {
              // hWg の語テキスト
              const ws = [...hWg.getElementsByTagName('w')];
              const ref = ws[0] ? ws[0].getAttribute('ref') : '?';
              
              // 外側detのテキスト
              const outerDetTexts = detKids.map(d => d.getAttribute('unicode')||d.textContent.trim());
              
              // hWg の子構造詳細
              const hKidDetail = hKids.map(k => {
                if (k.tagName === 'w') return `w[${k.getAttribute('class')}:${k.getAttribute('unicode')||k.textContent.trim()}]`;
                return `wg[${k.getAttribute('rule')}]`;
              });
              
              // 親wgの全子構造
              const parentKidDetail = kids.map(k => {
                if (k.tagName === 'w') return `w[${k.getAttribute('class')||'?'}:${k.getAttribute('unicode')||k.textContent.trim().slice(0,8)}]`;
                return `wg[${k.getAttribute('rule')||'?'}]`;
              });
              
              // すべての語テキスト
              const allWords = ws.map(w => w.getAttribute('unicode')||w.textContent.trim()).join(' ');
              
              // 外側det が hWg より前にある？
              const hIdx = kids.indexOf(hWg);
              const outerDetsBefore = kids.slice(0, hIdx).filter(k => k.tagName==='w'&&k.getAttribute('class')==='det');
              
              out.push({
                bk, ref, hRule,
                outerDets: outerDetsBefore.map(d=>d.getAttribute('unicode')||d.textContent.trim()),
                hKidDetail, parentKidDetail,
                allWords: allWords.slice(0,80),
                parentRule: wg.getAttribute('rule') || '(none)'
              });
            }
          }
        }
        return out;
      } catch(e) {
        return [{error: e.message}];
      }
    }, url, bookKey);
    
    allResults.push(...results);
  }

  console.log(`\n${'='.repeat(65)}`);
  console.log('Pattern B 候補: outer-det + wg[head] where head の先頭が w[det]');
  console.log(`${'='.repeat(65)}`);
  console.log(`総件数: ${allResults.length}\n`);

  for (const r of allResults) {
    if (r.error) { console.log('ERROR:', r.error); continue; }
    console.log(`[${r.ref}] hWg=wg[${r.hRule}] parentRule=${r.parentRule}`);
    console.log(`  外側det: ${r.outerDets.length>0 ? r.outerDets.join(', ') : '(なし)'}`);
    console.log(`  親の子: ${r.parentKidDetail.join(' | ')}`);
    console.log(`  hWg の子: ${r.hKidDetail.join(' | ')}`);
    console.log(`  語列: "${r.allWords}"`);
    console.log();
  }

  await b.close();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
