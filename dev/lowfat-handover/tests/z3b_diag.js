// Diagnostic: z3b Colossians 1:3-8 visible word count (79 vs predicted 85).
// Identify which 6 words are counted as invisible and measure their boundary distances.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const app='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const S=JSON.parse(fs.readFileSync('/tmp/sets.json','utf8'));
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pg=await b.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+app);
  const ev=f=>pg.evaluate(f);
  // Load Colossians 1:3-8 (6th entry in metaSel, index 3 in pred)
  const m=S.metaSel[4]; // metaSel.slice(1,7)[3] = metaSel[4] = Colossians idx=2
  console.log('Loading:',JSON.stringify(m));
  await pg.evaluate('window.__oldBook=BOOK');
  await(await pg.$('#fi')).uploadFile(dir+m.file);
  await pg.waitForFunction(`BOOK&&BOOK!==window.__oldBook&&BOOK.name==='${m.book}'`,{timeout:60000});
  await ev(`go(${m.idx})`);
  await new Promise(r=>setTimeout(r,300));
  // Get initial view state
  const state=await ev(`(()=>{
    const r=svg.getBoundingClientRect();
    const wdata=words.map(w=>{
      const g=w.g.getBoundingClientRect();
      const vis=g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom;
      const inOrig=g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom;
      // margin from viewport edges (positive=inside, negative=outside)
      const ml=g.left-r.left,mr=r.right-g.right,mt=g.top-r.top,mb=r.bottom-g.bottom;
      return{text:w.text,vis,inOrig,ml:Math.round(ml),mr:Math.round(mr),mt:Math.round(mt),mb:Math.round(mb)};
    });
    return{
      ref:$('#ref').textContent,k:view.k,font:22*view.k,fitK:fitInfo().k,
      n:words.length,
      vis_crossover:wdata.filter(w=>w.vis).length,
      vis_contained:wdata.filter(w=>w.inOrig).length,
      canvas:[Math.round(r.width),Math.round(r.height)],
      invisible:wdata.filter(w=>!w.vis).map(w=>({t:w.text,ml:w.ml,mr:w.mr,mt:w.mt,mb:w.mb})),
      border_words:wdata.filter(w=>w.vis&&(Math.abs(w.ml)<5||Math.abs(w.mr)<5||Math.abs(w.mt)<5||Math.abs(w.mb)<5)).map(w=>({t:w.text,ml:w.ml,mr:w.mr,mt:w.mt,mb:w.mb})),
    };
  })()`);
  console.log('ref:',state.ref,'k:',state.k,'fitK:',state.fitK);
  console.log('words total:',state.n,'visible(crossover):',state.vis_crossover,'visible(contained):',state.vis_contained);
  console.log('canvas:',state.canvas);
  console.log('invisible words:',JSON.stringify(state.invisible));
  console.log('border words (margin<5px):',JSON.stringify(state.border_words));
  // Also check how the test counts visible words (>r.left, <r.right, >r.top, <r.bottom)
  const testVis=await ev(`(()=>{const r=svg.getBoundingClientRect();let vis=0;for(const w of words){const g=w.g.getBoundingClientRect();if(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom)vis++}return vis})()`);
  console.log('test-method visible count:',testVis,'(same as z3b)');
  // Run z3b's exact check
  const fitK=await ev('+fitInfo().k.toFixed(4)');
  console.log(`max(fitK=${fitK}, 0.5)=`,Math.max(fitK,0.5),'actual k=',state.k);
  console.log('first word visible:',await ev(`(()=>{const r=svg.getBoundingClientRect();const g=words[0].g.getBoundingClientRect();return g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom})()`));
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message,e.stack.slice(0,300));process.exit(1)});
