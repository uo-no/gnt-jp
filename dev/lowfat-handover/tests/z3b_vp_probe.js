// z3b viewport-height probe: find the canvas height at which Colossians vis=85.
// Read-only diagnostic. Does not modify rk-diagram-m3.html.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const app='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const S=JSON.parse(fs.readFileSync('/tmp/sets.json','utf8'));
const m=S.metaSel[4]; // Colossians idx=2, pred=85

const MEAS=`(()=>{const r=svg.getBoundingClientRect();let vis=0;for(const w of words){const g=w.g.getBoundingClientRect();if(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom)vis++}const invis=[];for(const w of words){const g=w.g.getBoundingClientRect();if(!(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom))invis.push({t:w.text,mb:Math.round(r.bottom-g.top)})}return{vis,n:words.length,canvas:[Math.round(r.width),Math.round(r.height)],k:+view.k.toFixed(4),fitK:+fitInfo().k.toFixed(4),ref:$('#ref').textContent,first:(()=>{const g=words[0].g.getBoundingClientRect();return g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom})(),near_bottom:invis.filter(w=>w.mb>-60&&w.mb<20).map(w=>({t:w.t,mb:w.mb}))}})()`;

const measure=async(vpH)=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:vpH}});
  const pg=await b.newPage();
  await pg.goto('file://'+app);
  await pg.evaluate('window.__oldBook=BOOK');
  await(await pg.$('#fi')).uploadFile(dir+m.file);
  await pg.waitForFunction(`BOOK&&BOOK!==window.__oldBook&&BOOK.name==='${m.book}'`,{timeout:60000});
  await pg.evaluate(`go(${m.idx})`);
  const res=await pg.evaluate(MEAS);
  await b.close();
  return res;
};

(async()=>{
  console.log(`target: ${m.book} idx=${m.idx}, pred=85 (tolerance ±2 → pass if vis in [83,87])`);
  for(const vpH of [800,850,900,950,1000,1100]){
    const r=await measure(vpH);
    const pass=r.k===Math.max(r.fitK,0.5)&&r.first&&Math.abs(r.vis-85)<=2;
    console.log(`vp_h=${vpH} canvas_h=${r.canvas[1]} vis=${r.vis}/${r.n} k=${r.k} fitK=${r.fitK} first=${r.first} pass=${pass} ref=${r.ref}`);
    if(r.near_bottom.length) console.log('  near-bottom invisible:',JSON.stringify(r.near_bottom));
    if(r.vis>=83) {console.log('=> threshold reached at vp_h='+vpH+' (canvas_h='+r.canvas[1]+')');break;}
  }
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
