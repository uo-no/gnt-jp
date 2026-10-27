// Check: does before-groupmove show same 79 visible words for Colossians 1:3-8?
// Purpose: confirm the 79 vs 85 discrepancy is environmental, not a regression.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const S=JSON.parse(fs.readFileSync('/tmp/sets.json','utf8'));
const m=S.metaSel[4]; // Colossians idx=2
const check=async(label,url)=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pg=await b.newPage();
  await pg.goto('file://'+url);
  const ev=f=>pg.evaluate(f);
  await pg.evaluate('window.__oldBook=BOOK');
  await(await pg.$('#fi')).uploadFile(dir+m.file);
  await pg.waitForFunction(`BOOK&&BOOK!==window.__oldBook&&BOOK.name==='${m.book}'`,{timeout:60000});
  await ev(`go(${m.idx})`);await new Promise(r=>setTimeout(r,300));
  const res=await ev(`(()=>{const r=svg.getBoundingClientRect();let vis=0;for(const w of words){const g=w.g.getBoundingClientRect();if(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom)vis++}return{n:words.length,vis,k:view.k,fitK:+fitInfo().k.toFixed(4),canvas:[Math.round(r.width),Math.round(r.height)]}})()`);
  console.log(`${label}: n=${res.n} vis=${res.vis} k=${res.k} fitK=${res.fitK} canvas=${JSON.stringify(res.canvas)}`);
  await b.close();
  return res.vis;
};
(async()=>{
  const v1=await check('before-groupmove','/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html');
  const v2=await check('current       ','/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  console.log(`\nbefore-groupmove: ${v1}, current: ${v2} — ${v1===v2?'SAME (environmental, not regression)':'DIFFERENT (potential regression)'}`);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
