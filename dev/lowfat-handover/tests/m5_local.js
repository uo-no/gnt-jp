const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
const pg=await b.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);await pg.click('#zf');
const strip=x=>x.replace(/ rk-[xy]="[^"]*"/g,'');   // structure-only view of an XML string
const s0=await ev('ser()');const origBook=await ev("$('#sample').textContent");
const scr=async(px,py)=>ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${px}*view.k,r.top+view.y+${py}*view.k]})()`);
const wsc=async t=>ev(`(()=>{const g=words.find(w=>w.text==='${t}').g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);
const ctrlZ=async()=>{await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control')};const ctrlY=async()=>{await pg.keyboard.down('Control');await pg.keyboard.press('KeyY');await pg.keyboard.up('Control')};
// 0) dragged word is excluded from nearest-word candidates (pointer right on its own start position)
let a=await wsc('Παῦλος');await pg.mouse.move(a[0],a[1]);await pg.mouse.down();await pg.mouse.move(a[0]+2,a[1]+2,{steps:2});await pg.mouse.move(a[0]+20,a[1]+3,{steps:2});
const dtx=await ev("$('#dt').textContent");ok(/最近傍語：/.test(dtx)&&!/最近傍語：Παῦλος/.test(dtx),'ドラッグ語自身は最近傍語の候補から除外（自分の真上でも最近傍は別の語: '+(dtx.match(/最近傍語：(\S+?)（/)||[])[1]+'）');await pg.mouse.up();await ev('undoS.length&&undo()');ok(await ev('ser()')===s0,'  元に戻した');
// 1) layout mode: position only
await pg.click('#mL');a=await wsc('Παῦλος');await pg.mouse.move(a[0],a[1]);await pg.mouse.down();await pg.mouse.move(a[0]+120,a[1]+60,{steps:6});ok(await ev("gH.children.length===0"),'レイアウト編集中はM3のプレビューが出ない');await pg.mouse.up();
const s1=await ev('ser()');ok(strip(s1)===strip(s0)&&/rk-x/.test(s1)&&await ev("$('#dt').style.display")!=='block','レイアウト編集: 構造不変・rk-x/rk-yだけが付く（M3は動作しない）');
// 2) struct mode: far outside every frame -> position only, structure unchanged
await pg.click('#mS');await ev('view.x+=230;view.y+=170;applyView()');const o=await ev(`(()=>{const bx=boxes();return[Math.min(...bx.map(b=>b.x1))-120,Math.min(...bx.map(b=>b.y1))-80]})()`);
a=await wsc('Σωσθένης');const out=await scr(o[0],o[1]);await pg.mouse.move(a[0],a[1]);await pg.mouse.down();await pg.mouse.move(out[0],out[1],{steps:8});
const lk=await ev('({dt:$("#dt").textContent,hl:gH.querySelectorAll(".hl").length})');await pg.mouse.up();ok(lk.hl===0&&/枠の外：位置のみ変更/.test(lk.dt),'構造編集で全枠の外へ: 「枠の外：位置のみ変更」');
ok(strip(await ev('ser()'))===strip(s1),'  構造は変わらない（位置のみ）');
// 3) struct drop onto another phrase, then Undo/Redo exactness (3 ops)
const sA=await ev('ser()');const tw=await ev("(()=>{const w=words.find(x=>x.text==='ἐκκλησίᾳ');return[w.x+w.w/2,w.y-8]})()");
async function dropOn(word,t){const f=await wsc(word),to=await scr(t[0],t[1]);await pg.mouse.move(f[0],f[1]);await pg.mouse.down();await pg.mouse.move((f[0]+to[0])/2,(f[1]+to[1])/2,{steps:4});await pg.mouse.move(to[0],to[1],{steps:3});await pg.mouse.up()}
await dropOn('Ἰησοῦ',tw);const sB=await ev('ser()');ok(strip(sB)!==strip(sA),'構造編集ドロップ1: 所属変更');
const tw2=await ev("(()=>{const w=words.find(x=>x.text==='Κορίνθῳ,');return[w.x+w.w/2,w.y-8]})()");await dropOn('θεοῦ',tw2);const sC=await ev('ser()');
await pg.click('#mL');await dropOn('Χριστῷ',await ev("(()=>{const w=words.find(x=>x.text==='Χριστῷ');return[w.x+80,w.y+50]})()"));const sD=await ev('ser()');ok(sD!==sC,'レイアウト編集ドロップ: 位置のみ変更');
await ctrlZ();ok(await ev('ser()')===sC,'Undo 1回: 1つ前の状態');await ctrlZ();ok(await ev('ser()')===sB,'Undo 2回');await ctrlZ();ok(await ev('ser()')===sA,'Undo 3回: 操作前と完全一致');
await ctrlY();await ctrlY();await ctrlY();ok(await ev('ser()')===sD,'Redo 3回: 最終状態と完全一致');
// 4) tree drag & drop unchanged
const sT0=await ev('ser()');await ev(`(()=>{const ws=[...doc.getElementsByTagName('w')],gs=[...doc.getElementsByTagName('wg')].filter(g=>g!==ws[1].parentNode);const w=ws[1],g=gs[3];const row=[...document.querySelectorAll('.row')].find(r=>r._el===w),trow=[...document.querySelectorAll('.row')].find(r=>r._el===g);const d=new DataTransfer(),f=t=>new DragEvent(t,{dataTransfer:d,bubbles:true,cancelable:true});row.dispatchEvent(f('dragstart'));trow.dispatchEvent(f('dragover'));window.__tdt=$('#dt').textContent;trow.dispatchEvent(f('drop'));row.dispatchEvent(f('dragend'))})()`);
ok(await ev('ser()')!==sT0&&/を「.*」へ移動/.test(await ev('window.__tdt')),'ツリーのドラッグ＆ドロップ: 従来どおり所属変更＋移動先メッセージ');await ctrlZ();ok(await ev('ser()')===sT0,'  ツリー操作のUndo完全復元');
// 5) Save XML: every original attribute intact, only rk-x/rk-y/rk-status added, no internal ids
await ev(`$('#ma').click()`);const saved=await ev('bookXml()');
const attrs=t=>{const m={};for(const x of t.matchAll(/<w\s([^>]*)>/g)){const a=[...x[1].matchAll(/([\w:\-]+)="([^"]*)"/g)].filter(q=>!q[1].startsWith('rk-')).map(q=>q[1]+'='+q[2]);const id=a.find(q=>q.startsWith('xml:id='));m[id]=a.sort().join(';')}return m};
const A1=attrs(origBook),A2=attrs(saved);let diff=0;for(const k in A1)if(A1[k]!==A2[k])diff++;
const names=new Set([...saved.matchAll(/\s([\w:\-]+)="/g)].map(m=>m[1])),orig=new Set([...origBook.matchAll(/\s([\w:\-]+)="/g)].map(m=>m[1]));const extra=[...names].filter(n=>!orig.has(n));
ok(diff===0&&Object.keys(A1).length===Object.keys(A2).length,`Save XML: 全${Object.keys(A1).length}語の既存属性が元データと一致（差異${diff}）`);ok(extra.every(n=>['rk-x','rk-y','rk-status','rk-dy','rk-dx'].includes(n)),'Save XML: 追加された属性は '+JSON.stringify(extra)+' のみ（内部IDなし）');
ok(!/ uid=| rk-id=| data-uid/.test(saved),'内部IDはXMLに出ていない');
console.log('console/page errors:',errs.length,errs);ok(await ev("typeof M3diag==='undefined'"),'M3diag は残っていない');ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
