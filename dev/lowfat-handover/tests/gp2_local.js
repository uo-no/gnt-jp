// 計測用: paint() の処理を分解してどの部分が重いか測定する
const p=require('puppeteer-core');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pg=await b.newPage();
  pg.on('pageerror',e=>console.log('pageerror',e.message));
  await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  const ev=f=>pg.evaluate(f);
  await(await pg.$('#fi')).uploadFile(dir+'03-luke.xml');
  await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");
  await ev('go(119)');
  await new Promise(r=>setTimeout(r,400));
  await pg.click('#mL');
  await ev('refresh()');
  await ev(`(()=>{const r=svg.getBoundingClientRect();const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;view.k=1;view.x=r.width/2-x;view.y=r.height/2-y;applyView()})()`);

  // 統計情報の取得
  const info=await ev(`(()=>{
    const grpEdge=edges.filter(e=>e.kind==='mod'&&e.grp)[12];
    const g=grpEdge.grp;
    const ws=[...g.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const set=new Set(ws);
    const aff=edges.filter(ed=>set.has(ed.a)||set.has(ed.b));
    const affWithHit=aff.filter(ed=>!!ed.hit);
    return{
      words:ws.length,
      affEdges:aff.length,
      affWithHit:affWithHit.length,
      totalEdges:edges.length,
      totalHit:edges.filter(e=>e.hit).length,
      totalWg:doc.querySelectorAll('wg').length,
      totalBoxes:boxes().length
    }
  })()`);
  console.log('=== 構造情報 ===');
  console.log(JSON.stringify(info, null, 2));

  // mousedown してドラッグ状態を作る
  const mid=await ev(`(()=>{const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x,sy:r.top+view.y+y}})()`);
  await pg.mouse.move(mid.sx,mid.sy);
  await pg.mouse.down();

  // paint() の各パーツを個別に計測
  const timing=await ev(`(()=>{
    const grpEdge=edges.filter(e=>e.kind==='mod'&&e.grp)[12];
    const g=grpEdge.grp;
    const ws=[...g.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const set=new Set(ws);
    const aff=edges.filter(ed=>set.has(ed.a)||set.has(ed.b));
    const y0=new Map(ws.map(w=>[w,w.y]));
    const N=20;const dv=10;

    // 1) wordトランスフォームだけ
    let t1=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      ws.forEach(w=>{w.y=y0.get(w)});
      t1+=performance.now()-a;
    }

    // 2) edge el だけ (hit なし)
    let t2=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d)});
      t2+=performance.now()-a;
    }

    // 3) hit パスも含む edge 更新
    let t3=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      t3+=performance.now()-a;
    }

    // 4) drawBoxes()
    let t4=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      drawBoxes();
      t4+=performance.now()-a;
    }

    // 5) idle (何もしない)
    let t5=0;
    for(let i=0;i<N;i++){
      const a=performance.now();
      // nothing
      t5+=performance.now()-a;
    }

    return{
      wordTransforms_ms:+(t1/N).toFixed(2),
      edgesNoHit_ms:+(t2/N).toFixed(2),
      edgesWithHit_ms:+(t3/N).toFixed(2),
      drawBoxes_ms:+(t4/N).toFixed(2),
      idle_ms:+(t5/N).toFixed(2),
      hitCostDiff_ms:+((t3-t2)/N).toFixed(2),
      totalPaintEstimate_ms:+((t1+t3+t4)/N).toFixed(2)
    }
  })()`);
  console.log('\n=== 処理別計測 (平均/20回) ===');
  console.log(JSON.stringify(timing, null, 2));

  // 実際のpaint()全体
  const paintTotal=await ev(`(()=>{
    const grpEdge=edges.filter(e=>e.kind==='mod'&&e.grp)[12];
    const g=grpEdge.grp;
    const ws=[...g.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const set=new Set(ws);
    const aff=edges.filter(ed=>set.has(ed.a)||set.has(ed.b));
    const y0=new Map(ws.map(w=>[w,w.y]));
    const N=20;let tot=0;
    for(let i=0;i<N;i++){
      const dv=(i%2===0)?10:-10;
      const a=performance.now();
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      drawBoxes();
      tot+=performance.now()-a;
      ws.forEach(w=>{w.y=y0.get(w)});
    }
    return +(tot/N).toFixed(2);
  })()`);
  console.log('\n=== paint() 全体 (平均/20回) ===', paintTotal, 'ms');

  // idle mouse.move (DevTools往復コスト)
  await pg.mouse.up();
  const N=10;const t6=Date.now();
  for(let i=0;i<N;i++) await pg.mouse.move(100+i, 100);
  console.log('\n=== idle mouse.move 往復コスト ===', ((Date.now()-t6)/N).toFixed(1), 'ms/step');

  await b.close();
  process.exit(0);
})().catch(e=>{console.log('ERR',e.stack.slice(0,800));process.exit(1)});
