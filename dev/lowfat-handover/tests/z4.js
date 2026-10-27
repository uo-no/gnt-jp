const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const {REF,READ,matches}=require('./m7lib.js');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);await ev(REF);
const undo=async()=>{await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control')};
async function suite(label){const s0=await ev('ser()');const k0=await ev('view.k');
 // candidate world points inside the CURRENT view: near a word / blank inside a frame / >=3 candidate levels
 const pts=await ev(`(()=>{const r=svg.getBoundingClientRect();const x0=(70-view.x)/view.k,x1=(r.width-70-view.x)/view.k,y0=(120-view.y)/view.k,y1=(r.height-70-view.y)/view.k;const w0=words.find(w=>w.x>x0+40&&w.x<x1-80&&w.y>y0+30&&w.y<y1-40);
  const bx=boxes(w0);let blank=null,bd=-1,deep=null;for(let x=x0;x<x1;x+=Math.max(10,12/view.k))for(let y=y0;y<y1;y+=Math.max(10,12/view.k)){const f=bx.filter(b=>x>=b.x1&&x<=b.x2&&y>=b.y1&&y<=b.y2);if(!f.length)continue;let d=1e9;for(const o of words){if(o===w0)continue;d=Math.min(d,Math.hypot(Math.max(o.x-3-x,0,x-(o.x+o.w+3)),Math.max(o.y-22-y,0,y-(o.y+8))))}if(d>bd&&d<150){bd=d;blank=[x,y]}if(!deep){const rf=__ref(x,y,w0,0);if(rf.kind==='chain'&&rf.n>=3&&!rf.same)deep=[x,y]}}
  return{near:[w0.x+w0.w+20,w0.y-8],blank,deep}})()`);
 const doDrag=async(name,P,mods=[])=>{ // dragged word: a visible word that is not the nearest one, away from the zoom buttons
  const wi=await ev(`(()=>{const r=svg.getBoundingClientRect();const c=words.map((w,i)=>({i,d:Math.hypot(w.x-${P[0]},w.y-${P[1]}),g:w.g.getBoundingClientRect()})).filter(o=>o.g.left>r.left+60&&o.g.right<r.right-60&&o.g.top>r.top+80&&o.g.bottom<r.bottom-40&&o.d>30).sort((a,b)=>a.d-b.d);return(c[2]||c[0]).i})()`);
  await ev(`window.__dw=words[${wi}].el`);const from=await ev(`(()=>{const g=words[${wi}].g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`),to=await ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${P[0]}*view.k,r.top+view.y+${P[1]}*view.k]})()`);
  await pg.mouse.move(from[0],from[1]);await pg.mouse.down();await pg.mouse.move((from[0]+to[0])/2,(from[1]+to[1])/2,{steps:3});await pg.mouse.move(to[0],to[1],{steps:3});
  const pw=await ev(`(()=>{const r=svg.getBoundingClientRect();return[(${to[0]}-r.left-view.x)/view.k,(${to[1]}-r.top-view.y)/view.k]})()`);const out=[];
  const grab=async(tag,l)=>{const ref=await ev(`__ref(${pw[0]},${pw[1]},words[${wi}],${l})`);const pv=await ev(READ);ok(matches(pv,ref),`${label} k=${k0.toFixed(2)} ${name} ${tag}: プレビュー = 参照実装 [${ref.kind}/候補${ref.n||0}段, 最近傍 ${ref.nearest} ${ref.nd}px]`);out.push(ref.target)};
  await grab('通常',0);if(mods.length){await pg.keyboard.down('Shift');await grab('Shift',1);await pg.keyboard.down('Alt');await grab('Shift+Alt',2);await pg.keyboard.up('Alt');await pg.keyboard.up('Shift')}
  return{out,wi}};
 const a=await doDrag('近い語',pts.near);await pg.mouse.up();await undo();
 const bl=await doDrag('空白位置',pts.blank);await pg.mouse.up();await undo();
 if(pts.deep){const d=await doDrag('深い候補',pts.deep,[1]);ok(new Set(d.out).size===3,`${label}: 通常/Shift/Shift+Altの3つの対象が異なる`);await pg.keyboard.down('Shift');await pg.mouse.up();await pg.keyboard.up('Shift');ok(await ev('gpath(window.__dw.parentNode)')===d.out[1],`${label}: Shiftを押したままドロップ → 1段外側`);await undo()}
 ok(await ev('ser()')===s0,`${label}: 全操作後 Undoで完全復元`);
 // the same world point must give the same target regardless of the current zoom
 const same=await ev(`(()=>{const w0=words[0],P=${JSON.stringify(pts.near)};const sv=view.k;const r=[];for(const k of [0.1,0.5,1,3]){view.k=k;r.push(JSON.stringify(m3Target(P[0],P[1],w0,0).c&&gpath(m3Target(P[0],P[1],w0,0).c.el)))}view.k=sv;return r})()`);ok(new Set(same).size===1,`${label}: 同じワールド座標のドロップ先は倍率(0.1/0.5/1/3)に依存しない`)}
// 1 Corinthians 1:1-2 at its (unchanged) initial view, then Luke at the new initial view (k=0.5)
await suite('1コリント1:1–2');
await(await pg.$('#fi')).uploadFile('/home/claude/lf/lowfat/03-luke.xml');await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");await ev('go(119)');ok(await ev('view.k')===0.5,'Luke 初期表示 k=0.5 のまま試験');
await suite('ルカ3:23–38');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
