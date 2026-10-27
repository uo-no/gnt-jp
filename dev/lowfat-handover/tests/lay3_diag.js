// Diagnostic: measure Matthew load time and SIG evaluation time on ONE page
// This is a one-off investigation script, not a modified test.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const app='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pg=await b.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+app);
  // Test 1: Matthew load time
  await pg.evaluate('window.__oldBook=BOOK');
  const t0=Date.now();
  await(await pg.$('#fi')).uploadFile(dir+'01-matthew.xml');
  await pg.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:300000});
  const tLoad=Date.now()-t0;
  console.log(`Matthew load time: ${tLoad}ms (sentences: ${await pg.evaluate('BOOK.sents.length')})`);
  // Test 2: SIG evaluation time
  const t1=Date.now();
  const res=await pg.evaluate(SIG);
  const tSig=Date.now()-t1;
  console.log(`Matthew SIG eval time: ${tSig}ms (sentences processed: ${res.out.length})`);
  console.log(`struct_changed: ${res.out.filter(r=>r[1]!==1).length} sentences`);
  // Test 3: single smallest book (Philemon) to confirm mechanism works
  await pg.evaluate('window.__oldBook=BOOK');
  const t2=Date.now();
  await(await pg.$('#fi')).uploadFile(dir+'18-philemon.xml');
  await pg.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:60000});
  const tLoad2=Date.now()-t2;
  console.log(`Philemon load time: ${tLoad2}ms`);
  const t3=Date.now();
  const res2=await pg.evaluate(SIG);
  console.log(`Philemon SIG eval time: ${Date.now()-t3}ms (${res2.out.length} sents)`);
  console.log(`errors: ${errs.length}`);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
