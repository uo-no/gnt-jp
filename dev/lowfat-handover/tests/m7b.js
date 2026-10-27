const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const fs=require('fs');const {REF,READ,matches}=require('./m7lib.js');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});
const errs=[];const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await pg.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);await ev(REF);
await(await pg.$('#fi')).uploadFile('/home/claude/lf/lowfat/03-luke.xml');await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");await ev('go(119)');const s0=await ev('ser()');
const info=JSON.parse(fs.readFileSync('/tmp/lukeinfo.json','utf8'));const mode=process.argv[2]||'cases:0-9';
const undo=async()=>{await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control')};
async function setupDrag(px,py,near){await ev(near?`(()=>{const r=svg.getBoundingClientRect();view.k=1;view.x=r.width/2-${px};view.y=r.height/2-${py};applyView()})()`:'fit()');
  const wi=await ev(`(()=>{const r=svg.getBoundingClientRect();const c=words.map((w,i)=>({i,d:Math.hypot(w.x-${px},w.y-${py}),g:w.g.getBoundingClientRect()})).filter(o=>o.g.left>r.left+60&&o.g.right<r.right-60&&o.g.top>r.top+60&&o.g.bottom<r.bottom-40&&!(o.g.left<r.left+300&&o.g.top<r.top+60)).sort((a,b)=>a.d-b.d);return(c[3]||c[0]).i})()`);
  await ev(`window.__dw=words[${wi}].el`);const from=await ev(`(()=>{const g=words[${wi}].g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);
  const to=await ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${px}*view.k,r.top+view.y+${py}*view.k]})()`);
  await pg.mouse.move(from[0],from[1]);await pg.mouse.down();await pg.mouse.move((from[0]+to[0])/2,(from[1]+to[1])/2,{steps:3});await pg.mouse.move(to[0],to[1],{steps:3});
  const pw=await ev(`(()=>{const r=svg.getBoundingClientRect();return[(${to[0]}-r.left-view.x)/view.k,(${to[1]}-r.top-view.y)/view.k]})()`);return{wi,pw}}
if(mode.startsWith('cases:')){const [c0,c1]=mode.slice(6).split('-').map(Number);
 for(const [ci,[name,px,py,near]] of info.cases.entries()){if(ci<c0||ci>c1)continue;const {wi,pw}=await setupDrag(px,py,near);
  const ref=await ev(`__ref(${pw[0]},${pw[1]},words[${wi}],0)`);const pv=await ev(READ);ok(matches(pv,ref),`${name}: プレビュー = 参照実装 [${ref.kind}/候補${ref.n}段, 最近傍 ${ref.nearest} ${ref.nd}px]`);
  await pg.mouse.up();const after=await ev('gpath(window.__dw.parentNode)');ok(ref.same||ref.kind!=='chain'?true:after===ref.target,`${name}: ドロップ後の所属 = プレビューの対象`);await undo();ok(await ev('ser()')===s0,`${name}: Undoで完全復元`)}}
if(mode==='shift'){const F=info.cases[9];const {wi,pw}=await setupDrag(F[1],F[2],1);const lv=[];
 const grab=async(label,l)=>{const ref=await ev(`__ref(${pw[0]},${pw[1]},words[${wi}],${l})`);const pv=await ev(READ);lv.push(ref.target);ok(matches(pv,ref),`Luke Shift試験 ${label}: プレビュー = 祖先チェーン${l+1}段目 (候補${ref.n}段)`)};
 await grab('通常',0);await pg.keyboard.down('Shift');await grab('Shift',1);await pg.keyboard.down('Alt');await grab('Shift+Alt',2);await pg.keyboard.up('Alt');await grab('Alt解除',1);await pg.keyboard.up('Shift');await grab('Shift解除',0);
 ok(new Set(lv.slice(0,3)).size===3,'Luke: 通常/Shift/Shift+Altの対象が互いに異なる');await pg.keyboard.down('Shift');await pg.mouse.up();await pg.keyboard.up('Shift');ok(await ev('gpath(window.__dw.parentNode)')===lv[1],'Luke: Shiftを押したままドロップ → 1段外側の句');await undo();ok(await ev('ser()')===s0,'Luke: Undoで完全復元')}
if(mode==='amb'){const amb=await ev(`(()=>{const names=words.filter(w=>A(w.el,'class')==='noun'&&A(w.el.parentNode,'rule')==='Np-Appos');const a=names[8],b=names[9];return{x:(a.x+a.w/2+b.x+b.w/2)/2,y:(a.y+b.y)/2-8,a:a.text,b:b.text}})()`);
 const {wi,pw}=await setupDrag(amb.x,amb.y,1);const probe=async(dy)=>{const to=await ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${amb.x}*view.k,r.top+view.y+(${amb.y}+${dy})*view.k]})()`);await pg.mouse.move(to[0],to[1],{steps:3});const w2=await ev(`(()=>{const r=svg.getBoundingClientRect();return[(${to[0]}-r.left-view.x)/view.k,(${to[1]}-r.top-view.y)/view.k]})()`);const ref=await ev(`__ref(${w2[0]},${w2[1]},words[${wi}],0)`);const pv=await ev(READ);return{ref,pv}};
 const m=await probe(0),u=await probe(-8),d=await probe(8);console.log(`曖昧な2語の中間 (${amb.a} / ${amb.b}): 中間→最近傍 ${m.ref.nearest}(${m.ref.nd}px)  上へ8px→${u.ref.nearest}  下へ8px→${d.ref.nearest}`);
 ok(matches(m.pv,m.ref)&&matches(u.pv,u.ref)&&matches(d.pv,d.ref),'曖昧な位置でも、プレビュー（対象枠・最近傍語リング・距離表示）が参照実装と一致');ok(u.ref.nearest!==d.ref.nearest&&!!u.pv.ring&&!!d.pv.ring&&JSON.stringify(u.pv.ring)!==JSON.stringify(d.pv.ring),'8px動かすと最近傍語のリングが切り替わり、プレビューが追従');
 await pg.mouse.up();await undo();ok(await ev('ser()')===s0,'Undoで完全復元')}
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
