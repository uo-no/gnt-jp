const p=require('puppeteer-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);
await(await pg.$('#fi')).uploadFile(dir+'03-luke.xml');await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");await ev('go(119)');await new Promise(r=>setTimeout(r,400));
// 1) hgt (nominal heights) is offset-independent => hoist decisions cannot flip; deeper (non-hoisted) levels place τοῦ after the subtree, so their gap may grow by exactly the offset
const H=await ev(`(()=>{const gap=()=>{const mo=new Map();edges.filter(e=>e.kind==='mod').forEach(e=>{if(!mo.has(e.a))mo.set(e.a,[]);mo.get(e.a).push(e.b)});const nm=words.filter(w=>A(w.el,'class')==='noun'&&A(w.el.parentNode,'rule')==='Np-Appos');return nm.map(X=>{const d=(mo.get(X)||[]).find(b=>A(b.el,'class')==='det');return d?Math.round(d.y-X.y):null})};
 const apps=()=>[...doc.getElementsByTagName('wg')].filter(g=>A(g,'rule')==='Np-Appos');const hg=()=>apps().map(g=>hgt(g));
 const g0=gap(),h0=hg(),hoisted=h0.map(v=>v>=GEN_TH);const gs=[...GM.keys()];const out=[];
 for(const k of [10,30,50,70]){doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'));HM.clear();gs[k].setAttribute('rk-dy','180');layout();const g1=gap(),h1=hg();
  out.push({k,hgtSame:h1.every((v,i)=>v===h0[i]),hoistedLevelsSame:g0.every((v,i)=>!hoisted[i]||v===g1[i]),deepDelta:[...new Set(g0.map((v,i)=>hoisted[i]?null:(g1[i]-v)).filter(v=>v!==null))],hoistedN:hoisted.filter(Boolean).length,levels:g0.length})}
 doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'));layout();return out})()`);
console.log('  ',JSON.stringify(H));ok(H.every(h=>h.hgtSame),'hgt(): オフセットを付けても全段で同じ値（通常高さ。オフセットを含まない）');
ok(H.every(h=>h.hoistedLevelsSame),'hoist判定（人名の直下に τοῦ を置く段）: オフセットを付けても '+H[0].hoistedN+' 段すべてで τοῦ の位置関係が不変');
ok(H.every(h=>h.deepDelta.every(v=>v===0||v===180)),'hoistしない深い段: τοῦ は部分木の下に置かれるため、部分木が伸びる分(0 または 180)だけ下がる。それ以外の変化なし '+JSON.stringify(H.map(h=>h.deepDelta)));
// 2) real drag on Luke: a handle near the top at k=1
await pg.click('#mL');await ev('refresh()');await ev(`(()=>{const r=svg.getBoundingClientRect();const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;view.k=1;view.x=r.width/2-x;view.y=r.height/2-y;applyView()})()`);
const mid=await ev(`(()=>{const e=edges.filter(e=>e.kind==='mod'&&e.grp)[12];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=(+m[1]+ +m[3])/2,y=(+m[2]+ +m[4])/2;const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x,sy:r.top+view.y+y,nw:[...e.grp.getElementsByTagName('w')].length}})()`);
const s0=await ev('ser()');console.log('  対象グループの語数:',mid.nw);await pg.mouse.move(mid.sx,mid.sy);await pg.mouse.down();
const N=40;const t0=Date.now();for(let i=1;i<=N;i++)await pg.mouse.move(mid.sx,mid.sy+i*2);const ms=(Date.now()-t0)/N;console.log('  ドラッグ中 1ステップあたり(ms):',ms.toFixed(1));ok(ms<80,'Luke（165語）の大きなグループのドラッグ中も、1ステップ '+ms.toFixed(1)+'ms（再レイアウトは行わない）');
await pg.mouse.up();const dy=await ev(`[...doc.getElementsByTagName('wg')].filter(g=>g.hasAttribute('rk-dy')).map(g=>+A(g,'rk-dy'))`);ok(dy.length===1&&dy[0]>0,'Luke: ドロップで rk-dy が確定 '+JSON.stringify(dy));
const tc=await ev(`(()=>{const a=performance.now();undo();return Math.round(performance.now()-a)})()`);ok(await ev('ser()')===s0,'Luke: Undoで完全復元（'+tc+'ms）');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,600));process.exit(1)});
