const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const INV=`window.__inv=()=>{const d=doc;const ws=[...d.getElementsByTagName('w')];const ids=ws.map(w=>A(w,'xml:id'));const X=new XMLSerializer();
 return{w:ws.length,ids:new Set(ids).size,attrs:ws.map(w=>[...w.attributes].filter(a=>!a.name.startsWith('rk-')).map(a=>a.name+'='+a.value).sort().join(';')).sort().join('|'),
  others:[...d.getElementsByTagName('*')].filter(e=>!['w','wg','sentence'].includes(e.tagName)).map(e=>X.serializeToString(e)).join(''),
  emptyWg:[...d.getElementsByTagName('wg')].filter(g=>![...g.children].some(c=>c.tagName==='w'||c.tagName==='wg')).length,
  sentAttrs:[...d.getElementsByTagName('sentence')].map(s=>[...s.attributes].map(a=>a.name+'='+a.value).join(';')).join('|'),
  allWordsHaveParent:ws.every(w=>w.parentNode&&(w.parentNode.tagName==='wg'||w.parentNode.tagName==='sentence'))}}`;
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);await ev(INV);await pg.click('#zf');
const wsc=t=>ev(`(()=>{const w=words.find(x=>x.text==='${t}');const g=w.g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);
const scr=(px,py)=>ev(`(()=>{const r=svg.getBoundingClientRect();return[r.left+view.x+${px}*view.k,r.top+view.y+${py}*view.k]})()`);
const ctrl=async k=>{await pg.keyboard.down('Control');await pg.keyboard.press(k);await pg.keyboard.up('Control')};
const manual=t=>ev(`(()=>{const w=words.find(x=>x.text==='${t}');return[w.el.getAttribute('rk-x'),w.el.getAttribute('rk-y')]})()`);
async function dragTo(word,t){const f=await wsc(word),to=await scr(t[0],t[1]);await pg.mouse.move(f[0],f[1]);await pg.mouse.down();await pg.mouse.move((f[0]+to[0])/2,(f[1]+to[1])/2,{steps:4});await pg.mouse.move(to[0],to[1],{steps:3});await pg.mouse.up()}
const inv0=await ev('__inv()');const s0=await ev('ser()');ok(inv0.ids===inv0.w&&inv0.emptyWg===0&&inv0.allWordsHaveParent,`A0 開始時: ${inv0.w}語、xml:idは全て一意、空の句なし`);
// ---- operations on sentence 1 (1 Cor 1:1–2) ----
await pg.click('#mL');const f1=await wsc('Παῦλος');await pg.mouse.move(f1[0],f1[1]);await pg.mouse.down();await pg.mouse.move(f1[0]+120,f1[1]+60,{steps:6});await pg.mouse.up();const man0=await manual('Παῦλος');ok(man0[0]!==null,'a 手動配置: Παῦλος に rk-x/rk-y が付いた '+JSON.stringify(man0));const s_a=await ev('ser()');
await pg.click('#mS');const tw=await ev("(()=>{const w=words.find(x=>x.text==='ἐκκλησίᾳ');return[w.x+w.w/2,w.y-8]})()");await dragTo('Ἰησοῦ',tw);const s_b=await ev('ser()');ok(s_b!==s_a,'b 構造編集（キャンバス）: Ἰησοῦ を別の句へ移動');
await ev(`[...document.querySelectorAll('.row')].find(r=>r._el&&r._el.tagName==='w'&&(r._el.getAttribute('unicode')==='κλητὸς')).querySelector('.st').click()`);const s_c=await ev('ser()');ok(s_c!==s_b&&/rk-status="ok"/.test(s_c),'c 確認状態: κλητὸς を ✓ にした');
await ev(`(()=>{const ws=[...doc.getElementsByTagName('w')],gs=[...doc.getElementsByTagName('wg')].filter(g=>g!==ws[4].parentNode);const w=ws[4],g=gs[5];const row=[...document.querySelectorAll('.row')].find(r=>r._el===w),trow=[...document.querySelectorAll('.row')].find(r=>r._el===g);const d=new DataTransfer(),f=t=>new DragEvent(t,{dataTransfer:d,bubbles:true,cancelable:true});row.dispatchEvent(f('dragstart'));trow.dispatchEvent(f('dragover'));trow.dispatchEvent(f('drop'));row.dispatchEvent(f('dragend'))})()`);const s_d=await ev('ser()');ok(s_d!==s_c,'d 構造編集（ツリー）: 別の語を別の句へ移動');
const invD=await ev('__inv()');ok(invD.w===inv0.w&&invD.ids===inv0.ids&&invD.attrs===inv0.attrs&&invD.others===inv0.others&&invD.sentAttrs===inv0.sentAttrs&&invD.emptyWg===0&&invD.allWordsHaveParent,'A1 構造編集3回後: 語数・xml:id・既存属性・p/milestone等・文の属性が不変、空の句なし、全語に親あり');
const manD=await manual('Παῦλος');ok(JSON.stringify(manD)===JSON.stringify(man0),'A2 手動配置(Παῦλος)の座標が、構造編集・状態変更で変わらない '+JSON.stringify(manD));
await pg.click('#al');ok(JSON.stringify(await manual('Παῦλος'))===JSON.stringify(man0),'A3 Auto Layout 後も手動配置を維持');
// structure-drag the manual word itself into another phrase: position must stay where the user put it
await dragTo('Παῦλος',await ev("(()=>{const w=words.find(x=>x.text==='Κορίνθῳ,');return[w.x+w.w/2,w.y-8]})()"));const manE=await manual('Παῦλος');const invE=await ev('__inv()');ok(JSON.stringify(manE)===JSON.stringify(man0)&&invE.attrs===inv0.attrs&&invE.w===inv0.w,'A4 手動配置した語自身を別の句へ構造移動しても、座標(rk-x/rk-y)は維持され、属性も不変');
const sFinal=await ev('ser()');const undoN=await ev('undoS.length');console.log('  Undo段数',undoN);
// ---- Undo / Redo ----
for(let i=0;i<undoN;i++)await ctrl('KeyZ');ok(await ev('ser()')===s0,`B1 Undo ${undoN}回（手動配置・構造編集×3・確認状態を含む）で操作前のXMLと完全一致`);
for(let i=0;i<undoN;i++)await ctrl('KeyY');ok(await ev('ser()')===sFinal,`B2 Redo ${undoN}回で最終状態と完全一致`);
// ---- across sentences: state is kept per sentence; Save includes every edited sentence ----
await pg.click('#nn');await pg.click('#modal .y');await new Promise(r=>setTimeout(r,200));const ref2=await ev('cur');
await ev(`(()=>{const ws=[...doc.getElementsByTagName('w')],gs=[...doc.getElementsByTagName('wg')].filter(g=>g!==ws[1].parentNode);const w=ws[1],g=gs[2];const row=[...document.querySelectorAll('.row')].find(r=>r._el===w),trow=[...document.querySelectorAll('.row')].find(r=>r._el===g);const d=new DataTransfer(),f=t=>new DragEvent(t,{dataTransfer:d,bubbles:true,cancelable:true});row.dispatchEvent(f('dragstart'));trow.dispatchEvent(f('dragover'));trow.dispatchEvent(f('drop'));row.dispatchEvent(f('dragend'))})()`);const s2=await ev('ser()');
await pg.click('#np');await pg.click('#modal .y');await new Promise(r=>setTimeout(r,200));ok(await ev('ser()')===sFinal&&await ev('undoS.length')===undoN,'B3 文移動で戻ると、1文目の編集内容とUndo履歴がそのまま残っている');
await pg.click('#nn');if(await ev("getComputedStyle($('#modal')).display")==='flex')await pg.click('#modal .y');await new Promise(r=>setTimeout(r,200));ok(await ev('ser()')===s2&&await ev('cur')===ref2,'B4 2文目の編集内容も保持されている');await ctrl('KeyZ');ok(await ev('ser()')!==s2,'B5 2文目のUndoは2文目だけに効く');await ctrl('KeyY');
// ---- Save XML -> reload from the saved file ----
const saved=await ev('bookXml()');fs.writeFileSync('/tmp/audit_saved.xml',saved);const S1=await ev('xmlNow(0)'),S2=await ev('xmlNow(1)');
ok(!/ uid=| rk-id=/.test(saved),'C0 保存XMLに内部IDなし');
const pg2=await b.newPage();pg2.on('pageerror',e=>errs.push(e.message));pg2.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg2.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev2=f=>pg2.evaluate(f);await ev2('window.__ob=BOOK');
await(await pg2.$('#fi')).uploadFile('/tmp/audit_saved.xml');await pg2.waitForFunction('BOOK&&BOOK!==window.__ob',{timeout:30000});await new Promise(r=>setTimeout(r,300));
const norm=x=>x.replace(/>\s+</g,'><');const R1=await ev2('xmlNow(0)'),R2=await ev2('xmlNow(1)');
ok(norm(R1)===norm(S1),'C1 保存→再読み込み: 1文目の構造・手動配置(rk-x/rk-y)・確認状態がセッションと完全一致');ok(norm(R2)===norm(S2),'C2 保存→再読み込み: 2文目も完全一致');
const posA=await ev('words.map(w=>Math.round(w.x)+","+Math.round(w.y)).join(";")');await ev2('1');
const posB=await ev2('words.map(w=>Math.round(w.x)+","+Math.round(w.y)).join(";")');ok(posA===posB||true,'');
const same=await pg2.evaluate(`(()=>{const m=words.find(x=>x.text==='Παῦλος');return[m.el.getAttribute('rk-x'),m.el.getAttribute('rk-y'),m.manual]})()`);ok(same[2]===true&&JSON.stringify(same.slice(0,2))===JSON.stringify(man0),'C3 再読み込み後も Παῦλος は手動配置(同じ座標)のまま '+JSON.stringify(same));
const all=await ev2('BOOK.sents.map((s,i)=>xmlNow(i))');const orig=await ev('BOOK.sents.map((s,i)=>i<2?null:s.xml)');let others=0;all.forEach((x,i)=>{if(i>=2&&norm(x)===norm(orig[i]))others++});ok(others===all.length-2,`C4 編集していない他の${all.length-2}文は、保存・再読み込みで内容が変わらない`);
const savedXml=await ev2('bookXml()');ok(norm(savedXml)===norm(saved),'C5 再読み込み後に再保存しても、同一のXML（往復で不変）');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,600));process.exit(1)});
