// hitパス更新の有無で drawBoxes() のコストが変わるか計測
const p=require('puppeteer-core');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pg=await b.newPage();
  await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  const ev=f=>pg.evaluate(f);
  await(await pg.$('#fi')).uploadFile(dir+'03-luke.xml');
  await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");
  await ev('go(119)');
  await new Promise(r=>setTimeout(r,400));
  await pg.click('#mL');
  await ev('refresh()');

  const result=await ev(`(()=>{
    const grpEdge=edges.filter(e=>e.kind==='mod'&&e.grp)[12];
    const g=grpEdge.grp;
    const ws=[...g.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const set=new Set(ws);
    const aff=edges.filter(ed=>set.has(ed.a)||set.has(ed.b));
    const hitEdges=aff.filter(ed=>ed.hit);
    const y0=new Map(ws.map(w=>[w,w.y]));
    const N=30;

    // パターンA: hit更新なし → drawBoxes
    let tA=0;
    for(let i=0;i<N;i++){
      const dv=(i%2===0)?10:-10;
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      aff.forEach(ed=>ed.el.setAttribute('d',pd(ed)));
      const a=performance.now();
      drawBoxes();
      tA+=performance.now()-a;
      ws.forEach(w=>{w.y=y0.get(w)});
    }

    // パターンB: hit更新あり → drawBoxes
    let tB=0;
    for(let i=0;i<N;i++){
      const dv=(i%2===0)?10:-10;
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      const a=performance.now();
      drawBoxes();
      tB+=performance.now()-a;
      ws.forEach(w=>{w.y=y0.get(w)});
    }

    // パターンC: drawBoxes のみ (前処理なし)
    let tC=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      drawBoxes();
      tC+=performance.now()-a;
    }

    // パターンD: hit更新だけ (drawBoxesなし) の時間
    let tD=0;
    for(let i=0;i<N;i++){
      const dv=(i%2===0)?10:-10;
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      const a=performance.now();
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      tD+=performance.now()-a;
      ws.forEach(w=>{w.y=y0.get(w)});
    }

    // パターンE: hit数を強制的に増やして計測 (全82本のhitを更新)
    const allHit=edges.filter(e=>e.hit);
    let tE=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      allHit.forEach(ed=>{const d=pd(ed);ed.hit.setAttribute('d',d)});
      tE+=performance.now()-a;
    }

    return {
      'A_drawBoxesAfterNoHit':+(tA/N).toFixed(2),
      'B_drawBoxesAfterHit':+(tB/N).toFixed(2),
      'C_drawBoxesAlone':+(tC/N).toFixed(2),
      'D_hitUpdateOnly_10paths':+(tD/N).toFixed(2),
      'E_hitUpdateOnly_82paths':+(tE/N).toFixed(2),
      'hitEdgeCount':hitEdges.length,
      'totalHitCount':allHit.length
    }
  })()`);
  console.log('=== hitパス更新とdrawBoxes() の関係 ===');
  console.log(JSON.stringify(result, null, 2));

  await b.close();
  process.exit(0);
})().catch(e=>{console.log('ERR',e.stack.slice(0,800));process.exit(1)});
