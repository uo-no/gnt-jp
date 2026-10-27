const p=require('puppeteer-core');const fs=require('fs');const {REF,READ,matches}=require('./m7lib.js');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
const errs=[];const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);await(await pg.$('#fi')).uploadFile('/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/07-1corinthians.xml');await pg.waitForFunction("BOOK&&BOOK.sents.length>400");await ev('go(0)');await new Promise(r=>setTimeout(r,300));await ev(REF);await pg.click('#zf');
ok(await ev("typeof M3diag==='undefined'&&typeof m3Target==='function'"),'M3diag は存在せず、M3本体 m3Target は存在する');
const s0=await ev('ser()');
const scr=(px,py)=>ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${px}*view.k,r.top+view.y+${py}*view.k]})()`);
const wsc=i=>ev(`(()=>{const g=words[${i}].g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);
const world=t=>ev(`(()=>{const r=svg.getBoundingClientRect();return[(${t[0]}-r.left-view.x)/view.k,(${t[1]}-r.top-view.y)/view.k]})()`);
const undo=async()=>{await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control')};
// drag word index wi to world point; keep mouse down; returns {pw, elHandle set in window.__dw}
async function holdAt(wi,px,py){await ev(`window.__dw=words[${wi}].el`);const from=await wsc(wi),to=await scr(px,py);await pg.mouse.move(from[0],from[1]);await pg.mouse.down();await pg.mouse.move((from[0]+to[0])/2,(from[1]+to[1])/2,{steps:4});await pg.mouse.move(to[0],to[1],{steps:3});return world(to)}
async function check(label,wi,px,py,level=0){const pw=await holdAt(wi,px,py);const ref=await ev(`__ref(${pw[0]},${pw[1]},words[${wi}],${level})`);const pv=await ev(READ);ok(matches(pv,ref),`${label}: プレビュー(枠・リング・メッセージ)が参照実装と一致 [${ref.kind}${ref.n?'/候補'+ref.n+'段':''}${ref.same?'/所属変更なし':''}, 最近傍 ${ref.nearest} ${ref.nd}px]`);return{pw,ref,pv}}
async function dropAndVerify(label,ref){await pg.mouse.up();const after=await ev('gpath(window.__dw.parentNode)');if(ref.kind==='chain'&&!ref.same)ok(after===ref.target,`${label}: ドロップ後の所属 = プレビュー対象`);else ok(await ev('ser()').then(x=>x.replace(/ rk-[xy]="[^"]*"/g,''))===s0.replace(/ rk-[xy]="[^"]*"/g,''),`${label}: 構造変更なし（位置のみ）`);await undo();ok(await ev('ser()')===s0,`${label}: Undoで完全復元`)}
// ---- 1 Corinthians 1:1-2 ----
const tw=await ev("(()=>{const w=words.find(x=>x.text==='ἐκκλησίᾳ');return[w.x+w.w/2,w.y-8]})()");const wi=await ev("words.findIndex(w=>w.text==='Παῦλος')");
let r=await check('通常 別の句へ',wi,tw[0],tw[1]);await dropAndVerify('通常 別の句へ',r.ref);
const sib=await ev(`(()=>{for(const a of words)for(const c of words){if(a!==c&&a.el.parentNode===c.el.parentNode&&a.el.parentNode.tagName==='wg')return[words.indexOf(a),c.x+c.w/2,c.y-8]}})()`);
r=await check('2語句/同じ句の兄弟語の上',sib[0],sib[1],sib[2]);ok(r.ref.same&&/所属は変更なし/.test(r.pv.dt),'  → 「所属は変更なし（位置のみ）」');await dropAndVerify('2語句',r.ref);
const blank=await ev(`(()=>{const w0=words[0];let best=null,bd=-1;for(const f of boxes(w0)){for(let x=f.x1+8;x<f.x2;x+=24)for(let y=f.y1+8;y<f.y2;y+=24){let d=1e9;for(const o of words){if(o===w0)continue;d=Math.min(d,Math.hypot(Math.max(o.x-3-x,0,x-(o.x+o.w+3)),Math.max(o.y-22-y,0,y-(o.y+8))))}if(d>bd&&d<200){bd=d;best=[x,y,d]}}}return best})()`);
r=await check('空白位置',0,blank[0],blank[1]);await dropAndVerify('空白位置',r.ref);
const ctr=await ev(`(()=>{const w0=words[0];const f=boxes(w0).filter(b=>b.el!==w0.el.parentNode).sort((a,b)=>(b.x2-b.x1)-(a.x2-a.x1))[2];return[(f.x1+f.x2)/2,(f.y1+f.y2)/2]})()`);
r=await check('句の中心付近',0,ctr[0],ctr[1]);await dropAndVerify('句の中心付近',r.ref);
// outside every frame -> position only
const o=await ev(`(()=>{const bx=boxes();return[Math.min(...bx.map(b=>b.x1))-120,Math.min(...bx.map(b=>b.y1))-80]})()`);const oi=await ev("words.findIndex(w=>w.text==='Σωσθένης')");
await ev('view.x+=230;view.y+=170;applyView()');const out=await scr(o[0],o[1]);await ev(`window.__dw=words[${oi}].el`);const f0=await wsc(oi);await pg.mouse.move(f0[0],f0[1]);await pg.mouse.down();await pg.mouse.move(out[0],out[1],{steps:8});const refo=await ev(`__ref(${(await world(out))[0]},${(await world(out))[1]},words[${oi}],0)`);ok(refo.kind==='outside','  (参照実装でも枠の外)');const pvo=await ev(READ);ok(!pvo.hl&&/枠の外：位置のみ変更/.test(pvo.dt),'全枠の外: 「枠の外：位置のみ変更」');await pg.mouse.up();await undo();await pg.click('#zf');
// ---- Shift / Shift+Alt on 1 Corinthians (a point with >=3 candidate levels) ----
const deep=await ev(`(()=>{const w0=words[0];for(const f of boxes(w0)){for(let x=f.x1+6;x<f.x2;x+=14)for(let y=f.y1+6;y<f.y2;y+=14){const r=__ref(x,y,w0,0);if(r.kind==='chain'&&r.n>=3&&!r.same)return[x,y,r.n]}}return null})()`);
const pw=await holdAt(0,deep[0],deep[1]);const lv=[];
const grab=async(label,l)=>{const ref=await ev(`__ref(${pw[0]},${pw[1]},words[0],${l})`);const pv=await ev(READ);lv.push(ref.target);ok(matches(pv,ref),`  Shift試験 ${label}: プレビュー = 祖先チェーンの ${l+1}段目 (候補${ref.n}段)`)};
await grab('通常',0);await pg.keyboard.down('Shift');await grab('Shift',1);await pg.keyboard.down('Alt');await grab('Shift+Alt',2);await pg.keyboard.up('Alt');await grab('Alt解除→Shift',1);await pg.keyboard.up('Shift');await grab('Shift解除→通常',0);
ok(new Set([lv[0],lv[1],lv[2]]).size===3,'  通常/Shift/Shift+Alt の対象は互いに異なる（内側→外側）');
await pg.keyboard.down('Shift');await pg.keyboard.down('Alt');await pg.mouse.up();await pg.keyboard.up('Alt');await pg.keyboard.up('Shift');ok(await ev('gpath(window.__dw.parentNode)')===lv[2],'  Shift+Altを押したままドロップ → さらに外側の句へ所属変更');await undo();ok(await ev('ser()')===s0,'  Undoで完全復元');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
