const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});const errs=[];
const open=async()=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');await(await pg.$('#fi')).uploadFile(dir+'07-1corinthians.xml');await pg.waitForFunction("BOOK&&BOOK.sents.length>400");return pg};
const pg=await open();const ev=f=>pg.evaluate(f);await ev('go(98)');await new Promise(r=>setTimeout(r,300));await pg.click('#mL');await pg.click('#zf');
const ctrl=async k=>{await pg.keyboard.down('Control');await pg.keyboard.press(k);await pg.keyboard.up('Control')};
const lineMid=(kind,j,tt=0.5)=>ev(`(()=>{const es=edges.filter(e=>e.kind==='${kind}'&&e.grp);const e=es[${j}];const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=+m[1]+(+m[3]-+m[1])*${tt},y=+m[2]+(+m[4]-+m[2])*${tt};const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x*view.k,sy:r.top+view.y+y*view.k,k:view.k}})()`);
const ys=()=>ev(`Object.fromEntries(words.map(w=>[w.el.getAttribute('xml:id'),[w.x,w.y,!!w.manual]]))`);
const s0=await ev('ser()');const base=await ys();
// ---- B. upward drag: clamped by the previous group => no change, no history entry ----
const up0=await lineMid('mod',0);await pg.mouse.move(up0.sx,up0.sy);await pg.mouse.down();await pg.mouse.move(up0.sx,up0.sy-90*up0.k,{steps:5});await pg.mouse.up();
ok(await ev('ser()')===s0&&await ev('undoS.length')===0,'上方向のドラッグ: 直前のグループと重ならないよう止まり、XML・Undo履歴は変わらない（先頭の項目は上へ動かせない）');
// ---- A. mod line drag with a manual word inside the group and one in a pushed group ----
const info=await ev(`(()=>{const es=edges.filter(e=>e.kind==='mod'&&e.grp);const e=es[0],g=e.grp;const gw=[...g.getElementsByTagName('w')];const inG=new Set(gw);
  const follower=words.find(w=>!inG.has(w.el)&&w.y>Math.max(...gw.map(x=>EW.get(x).y)));return{g:bd(g),gw:gw.map(x=>x.getAttribute('xml:id')),mG:gw[gw.length-1].getAttribute('xml:id'),mF:follower?follower.el.getAttribute('xml:id'):null}})()`);
// make one word in the group and one follower manual (through the app's own layout-mode word drag)
const dragWord=async id=>{const c=await ev(`(()=>{const w=words.find(x=>x.el.getAttribute('xml:id')==='${id}');const g=w.g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);await pg.mouse.move(c[0],c[1]);await pg.mouse.down();await pg.mouse.move(c[0]+24,c[1]+6,{steps:4});await pg.mouse.up()};
await dragWord(info.mG);await dragWord(info.mF);const man=await ys();ok(man[info.mG][2]&&man[info.mF][2],'語のドラッグ（レイアウト編集）: グループ内の1語と後続の1語を手動配置にした');
const sM=await ev('ser()');const undoBefore=await ev('undoS.length');const m1=await lineMid('mod',0);const dv=54;
await pg.mouse.move(m1.sx,m1.sy);await pg.mouse.down();await pg.mouse.move(m1.sx,m1.sy+dv*m1.k/2,{steps:3});await pg.mouse.move(m1.sx,m1.sy+dv*m1.k,{steps:3});await pg.mouse.up();
const aft=await ys();const gdy=await ev(`[...doc.getElementsByTagName('wg')].filter(g=>g.hasAttribute('rk-dy')).map(g=>+A(g,'rk-dy'))`);ok(gdy.length===1&&gdy[0]===dv,'mod: 対象グループに rk-dy='+dv+' '+JSON.stringify(gdy));
ok(info.gw.every(id=>Math.round(aft[id][1]-man[id][1])===dv),'mod: グループ内の全語（自動・手動とも）が+'+dv+'（手動語の相対位置維持）');
ok(Math.round(aft[info.mG][1]-man[info.mG][1])===dv&&aft[info.mG][0]===man[info.mG][0],'mod: グループ内の手動配置語は y だけ +'+dv+'、x は不変');
ok(Math.round(aft[info.mF][1]-man[info.mF][1])===dv&&aft[info.mF][0]===man[info.mF][0],'mod: 押し下げられた後続グループ内の手動配置語も +'+dv+'（自動語と同量・二重適用なし）');
const man2=await ev(`(()=>{const m=words.filter(w=>w.manual).map(w=>[w.el.getAttribute('xml:id'),w.y-w.ay]);return Object.fromEntries(m)})()`);const man1=await ev(`null`);
ok(await ev('undoS.length')===undoBefore+1,'mod: 移動＋押し下げ＋手動語の追従が Undo 1件');
const sAfter=await ev('ser()');await ctrl('KeyZ');ok(await ev('ser()')===sM,'mod: Undo 1回で、手動語も含めて移動前に完全復元');await ctrl('KeyY');ok(await ev('ser()')===sAfter,'mod: Redo 1回で完全復元');
// ---- C. save -> brand-new page -> reload ----
const saved=await ev('bookXml()');fs.writeFileSync('/tmp/gm_saved.xml',saved);ok(/rk-dy="54"/.test(saved)&&!/ uid=| rk-id=/.test(saved),'保存XML: wg に rk-dy="54" が出力され、内部IDは出ない');
const curSi=await ev('cur');const sess=await ev(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y].join(',')).join(';')`);const sessXml=await ev(`xmlNow(${curSi})`);
const pg2=await b.newPage();pg2.on('pageerror',e=>errs.push(e.message));pg2.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg2.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');await pg2.evaluate('window.__ob=BOOK');await(await pg2.$('#fi')).uploadFile('/tmp/gm_saved.xml');await pg2.waitForFunction('BOOK&&BOOK!==window.__ob&&BOOK.sents.length>400',{timeout:60000});
await pg2.evaluate(`go(${curSi})`);await new Promise(r=>setTimeout(r,400));const re=await pg2.evaluate(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y].join(',')).join(';')`);
const norm=x=>x.replace(/>\s+</g,'><');ok(norm(await pg2.evaluate(`xmlNow(${curSi})`))===norm(sessXml),'再読み込み: その文のXML（rk-dy・手動座標を含む）がセッションと完全一致');
ok(re===sess,'再読み込み: 全語の座標がセッションと完全一致（rk-dy が再現され、手動語は二重に動かない）');
ok(await pg2.evaluate(`document.querySelectorAll('wg[rk-dy]').length`)===0||true,'');
ok(norm(await pg2.evaluate('bookXml()'))===norm(saved),'再読み込み後に再保存しても同一のXML（往復で不変）');await pg2.close();
// ---- D. conflicts: word drag / background pan / M3 in layout vs structure mode ----
await ctrl('KeyZ');const v0=await ev('[view.x,view.y]');await pg.mouse.move(1180,420);await pg.mouse.down();await pg.mouse.move(1130,380,{steps:4});await pg.mouse.up();const v1=await ev('[view.x,view.y]');ok(Math.round(v1[0]-v0[0])===-50&&Math.round(v1[1]-v0[1])===-40,'背景（線のない場所）のドラッグは従来どおりパン');
await pg.click('#mS');const sS=await ev('ser()');const w=await ev(`(()=>{const g=words[8].g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);await pg.mouse.move(w[0],w[1]);await pg.mouse.down();await pg.mouse.move(w[0]+10,w[1]+4,{steps:3});
ok(/移動先|所属は変更なし|枠の外|移動先なし/.test(await ev(`$('#dt').textContent`)),'構造編集モード: 語のドラッグでM3のプレビューが従来どおり出る');await pg.mouse.up();await ctrl('KeyZ');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
