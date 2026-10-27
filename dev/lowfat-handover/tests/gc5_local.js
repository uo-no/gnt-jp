const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
const DIR='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  await(await pg.$('#fi')).uploadFile(DIR+'07-1corinthians.xml');
  await pg.waitForFunction("BOOK&&BOOK.sents.length>400");
  const ev=f=>pg.evaluate(f);
  await ev('go(98)');await new Promise(r=>setTimeout(r,300));await pg.click('#mL');await pg.click('#zf');
  const ctrl=async k=>{await pg.keyboard.down('Control');await pg.keyboard.press(k);await pg.keyboard.up('Control')};

  // ---- A1. 語ドラッグ (rk-x/rk-y) ----
  const wc=await ev(`(()=>{const w=words[0];const g=w.g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);
  await pg.mouse.move(wc[0],wc[1]);await pg.mouse.down();await pg.mouse.move(wc[0]+24,wc[1]+6,{steps:4});await pg.mouse.up();
  ok(await ev(`words[0].el.hasAttribute('rk-x')`),'A1: 語ドラッグ: rk-x が設定される');

  // ---- A2. グループ縦横移動 (rk-dy=54, rk-dx=60) ----
  await ev(`(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,54,60))})()`);
  ok(await ev(`(()=>{const [gEl]=GM.keys();return dyOf(gEl)===54&&dxOf(gEl)===60})()`), 'A2: グループ移動: rk-dy=54 かつ rk-dx=60 が設定される');

  // ---- A3. Undo/Redo ----
  const sAfterMoves=await ev('ser()');
  await ctrl('KeyZ');
  ok(await ev(`(()=>{const [gEl]=GM.keys();return dyOf(gEl)===0&&dxOf(gEl)===0})()`), 'A3: Undo: rk-dy/rk-dx が消える');
  await ctrl('KeyY');
  ok(await ev('ser()')===sAfterMoves,'A4: Redo: 移動後の XML に完全復元');

  // ---- B. bookXml() で保存 ----
  const curSi=await ev('cur');
  const sess=await ev(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y].join(',')).join(';')`);
  const sessXml=await ev(`xmlNow(${curSi})`);
  const saved=await ev('bookXml()');
  fs.writeFileSync('/tmp/gc5_v1.xml',saved);
  ok(/rk-dy="54"/.test(saved),'B1: 保存XML: rk-dy="54" が含まれる');
  ok(/rk-dx="60"/.test(saved),'B2: 保存XML: rk-dx="60" が含まれる');
  ok(/rk-x=/.test(saved),'B3: 保存XML: rk-x が含まれる');
  ok(!/ uid=| rk-id=/.test(saved),'B4: 保存XML: 内部IDが出ない');

  // ---- C. 新ページで再読み込み (1サイクル目) ----
  const norm=x=>x.replace(/>\s+</g,'><');
  const pg2=await b.newPage();pg2.on('pageerror',e=>errs.push(e.message));pg2.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg2.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  await pg2.evaluate('window.__ob=BOOK');
  await(await pg2.$('#fi')).uploadFile('/tmp/gc5_v1.xml');
  await pg2.waitForFunction('BOOK&&BOOK!==window.__ob&&BOOK.sents.length>400',{timeout:60000});
  await pg2.evaluate(`go(${curSi})`);await new Promise(r=>setTimeout(r,400));
  const re1=await pg2.evaluate(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y].join(',')).join(';')`);
  ok(re1===sess,'C1: 再読み込み: 全語の座標がセッションと完全一致（rk-dy/rk-dx/rk-x 反映）');
  ok(norm(await pg2.evaluate(`xmlNow(${curSi})`))===norm(sessXml),'C2: 再読み込み: 文XML（rk-dy/rk-dx/rk-x含む）がセッションと一致');
  ok(await pg2.evaluate('undoS.length')===0,'C3: 再読み込みページ: Undo履歴が空（ロード直後はゼロから）');

  // ---- D. 冪等性: 再保存XMLが初回と一致 ----
  const saved2=await pg2.evaluate('bookXml()');
  fs.writeFileSync('/tmp/gc5_v2.xml',saved2);
  ok(norm(saved2)===norm(saved),'D1: 冪等性: 再保存XMLが初回保存と完全一致（往復で不変）');
  await pg2.close();

  // ---- E. 2サイクル目: ドリフトなし確認 ----
  const pg3=await b.newPage();pg3.on('pageerror',e=>errs.push(e.message));pg3.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg3.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');
  await pg3.evaluate('window.__ob=BOOK');
  await(await pg3.$('#fi')).uploadFile('/tmp/gc5_v2.xml');
  await pg3.waitForFunction('BOOK&&BOOK!==window.__ob&&BOOK.sents.length>400',{timeout:60000});
  await pg3.evaluate(`go(${curSi})`);await new Promise(r=>setTimeout(r,400));
  const re2=await pg3.evaluate(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y].join(',')).join(';')`);
  ok(re2===sess,'E1: 2サイクル目: 座標ドリフトなし（複数保存・再読み込みで不変）');
  await pg3.close();

  console.log('errors',errs.length,errs);ok(errs.length===0,'F1: console error 0');
  await b.close();process.exit(0);
})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
