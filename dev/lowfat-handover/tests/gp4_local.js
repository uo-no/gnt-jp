// paint() の実際の実行時間をブラウザ内計測 (startGroupDrag のクロージャを直接計測)
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
  await ev(`(()=>{const r=svg.getBoundingClientRect();const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;view.k=1;view.x=r.width/2-x;view.y=r.height/2-y;applyView()})()`);

  // ブラウザ内計測用計装をセット（startGroupDrag の paint をラップして計測）
  // startGroupDrag は次の pointerdown で実行され、その中で paint が定義される
  // → pointermove イベント毎の処理時間を window.__paintMs で記録
  await ev(`window.__paintMs=[];window.__origSGD=startGroupDrag;
    startGroupDrag=function(ev,e){
      // paint の前後にタイマーをはさむために startGroupDrag を入れ替えてはいるが
      // 実際にはクロージャ内の paint を外から差し替えることはできない
      // 代わりに pointermove イベントの処理時間全体を計測する
      const orig_mv_handler_catcher=(()=>{
        let captured=null;
        const origAEL=HTMLElement.prototype.addEventListener;
        HTMLElement.prototype.addEventListener=function(type,fn,opts){
          if(type==='pointermove'&&!captured){captured=fn;HTMLElement.prototype.addEventListener=origAEL;}
          origAEL.call(this,type,fn,opts);
        };
        __origSGD.call(this,ev,e);
        HTMLElement.prototype.addEventListener=origAEL;
        if(captured){
          const wrappedMv=function(x){
            const a=performance.now();captured.call(this,x);window.__paintMs.push(+(performance.now()-a).toFixed(3));
          };
          // イベントリスナーの差し替えはできないため別途計測
        }
      })();
      __origSGD.call(this,ev,e);
    };
  `);

  // より直接的な方法: pointermove の処理時間を addEventListener 全体ではなく
  // performance.measure で計測するため、SVGヒットエレメントの pointermove をモニタリング
  await ev(`window.__paintMs=[];
    const origSetAtt=SVGElement.prototype.setAttribute;
    let __frameStart=null,__frameCount=0;
    // pointermove ハンドラが呼ばれるたびに requestAnimationFrame で処理後の時刻を記録
    // 代わりに: 直接 pointermove のタイミングを performance.now で記録
    // SVGElement.prototype.setAttribute を利用して最初の呼び出し時刻を記録
  `);

  // 直接的な計測: ブラウザ内でドラッグをシミュレートして pointermove 1回の JS 時間を計測
  const mid=await ev(`(()=>{const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x,sy:r.top+view.y+y}})()`);

  await pg.mouse.move(mid.sx,mid.sy);
  await pg.mouse.down();

  // ブラウザ内で pointermove を手動ディスパッチして処理時間だけ計測
  const jsTime=await ev(`(()=>{
    // startGroupDrag が登録した pointermove ハンドラを手動で呼び出す代わりに
    // 実際の paint() ロジックを同等のコードで再現して計測
    const grpEdge=edges.filter(e=>e.kind==='mod'&&e.grp)[12];
    const g=grpEdge.grp;
    const ws=[...g.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const set=new Set(ws);
    const aff=edges.filter(ed=>set.has(ed.a)||set.has(ed.b));
    const y0=new Map(ws.map(w=>[w,w.y]));
    const N=40;let dv=5;

    // 修正後の paint() 相当: drawBoxes() なし
    let tNew=0;
    for(let i=0;i<N;i++){
      dv=i%2===0?5:-5;
      const a=performance.now();
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      tNew+=performance.now()-a;
    }
    ws.forEach(w=>{w.y=y0.get(w)});

    // 修正前の paint() 相当: drawBoxes() あり
    let tOld=0;
    for(let i=0;i<N;i++){
      dv=i%2===0?5:-5;
      const a=performance.now();
      ws.forEach(w=>{w.y=y0.get(w)+dv;w.g.setAttribute('transform',\`translate(\${w.x},\${w.y})\`)});
      aff.forEach(ed=>{const d=pd(ed);ed.el.setAttribute('d',d);ed.hit&&ed.hit.setAttribute('d',d)});
      drawBoxes();
      tOld+=performance.now()-a;
    }
    ws.forEach(w=>{w.y=y0.get(w)});

    return {
      '修正後paint()_ms_per_frame': +(tNew/N).toFixed(3),
      '修正前paint()_ms_per_frame': +(tOld/N).toFixed(3),
      '削減量_ms': +((tOld-tNew)/N).toFixed(3)
    }
  })()`);
  console.log('=== ブラウザ内計測: paint() の JS 実行時間 ===');
  console.log(JSON.stringify(jsTime, null, 2));
  await pg.mouse.up();

  // gc4 と同条件でステップ時間計測（修正後）
  await pg.mouse.move(mid.sx,mid.sy);
  await pg.mouse.down();
  const N=40;const t0=Date.now();
  for(let i=1;i<=N;i++) await pg.mouse.move(mid.sx,mid.sy+i*2);
  const ms=(Date.now()-t0)/N;
  console.log('\n=== gc4 相当の実測（修正後）===');
  console.log('1ステップあたり:', ms.toFixed(1), 'ms');
  console.log(ms<80 ? 'PASS (<80ms)' : 'FAIL (>=80ms)');
  await pg.mouse.up();

  await b.close();
  process.exit(0);
})().catch(e=>{console.log('ERR',e.stack.slice(0,800));process.exit(1)});
