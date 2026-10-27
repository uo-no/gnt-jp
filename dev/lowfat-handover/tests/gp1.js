const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const dir='/home/claude/lf/lowfat/';
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});
const pg=await b.newPage();pg.on('pageerror',e=>console.log('pageerror',e.message));await pg.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);
await(await pg.$('#fi')).uploadFile(dir+'03-luke.xml');await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");await ev('go(119)');await new Promise(r=>setTimeout(r,400));await pg.click('#mL');
await ev(`(()=>{const r=svg.getBoundingClientRect();const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;view.k=1;view.x=r.width/2-x;view.y=r.height/2-y;applyView()})()`);
const mid=await ev(`(()=>{const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x,sy:r.top+view.y+y}})()`);
// wrap the suspected pieces with timers
await ev(`window.__T={drawBoxes:[0,0],dt:[0,0],pd:[0,0],bd:[0,0]};const wrapF=(name,fn)=>function(){const a=performance.now();const r=fn.apply(this,arguments);__T[name][0]+=performance.now()-a;__T[name][1]++;return r};drawBoxes=wrapF('drawBoxes',drawBoxes);dt=wrapF('dt',dt);pd=wrapF('pd',pd);bd=wrapF('bd',bd);`);
await pg.mouse.move(mid.sx,mid.sy);await pg.mouse.down();const t0=Date.now();for(let i=1;i<=6;i++)await pg.mouse.move(mid.sx,mid.sy+i*2);const wall=(Date.now()-t0)/6;
console.log('1ステップの実測(ms):',wall.toFixed(0));console.log(JSON.stringify(await ev('Object.fromEntries(Object.entries(__T).map(([k,v])=>[k,{totalMs:Math.round(v[0]),calls:v[1],perCallMs:v[1]?+(v[0]/v[1]).toFixed(1):0}]))'),null,0));
await pg.mouse.up();
// is it the page or the DevTools input path? time an idle mouse move with no drag
const t1=Date.now();for(let i=1;i<=6;i++)await pg.mouse.move(10+i,10);console.log('(参考)ドラッグなしのマウス移動 1ステップ(ms):',((Date.now()-t1)/6).toFixed(0));
await b.close();process.exit(0)})();
