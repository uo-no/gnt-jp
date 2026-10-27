// Diagnostic: check why uploadFile to before-groupmove.html does not trigger BOOK change.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pageErrs=[];
  // Test A: upload Matthew to before-groupmove standalone (single page)
  const p1=await b.newPage();
  p1.on('pageerror',e=>pageErrs.push('p1 ERR:'+e.message));
  p1.on('console',m=>m.type()==='error'&&pageErrs.push('p1 CON:'+m.text()));
  await p1.goto('file://'+appOld);
  console.log('p1 (before-groupmove) loaded. BOOK:', await p1.evaluate('BOOK&&BOOK.name'));
  const fi1=await p1.$('#fi');
  console.log('p1 #fi element found:', !!fi1);
  await p1.evaluate('window.__oldBook=BOOK');
  const t1=Date.now();
  await(await p1.$('#fi')).uploadFile(dir+'18-philemon.xml'); // small file first
  console.log(`p1 uploadFile done in ${Date.now()-t1}ms`);
  // Check if BOOK changed without waitForFunction
  await new Promise(r=>setTimeout(r,2000));
  const book1=await p1.evaluate('BOOK&&BOOK.name');
  const changed1=await p1.evaluate('BOOK!==window.__oldBook');
  console.log(`p1 BOOK after upload: ${book1}, changed: ${changed1}`);
  // Test B: upload Matthew to current (new) page standalone
  const p2=await b.newPage();
  p2.on('pageerror',e=>pageErrs.push('p2 ERR:'+e.message));
  p2.on('console',m=>m.type()==='error'&&pageErrs.push('p2 CON:'+m.text()));
  await p2.goto('file://'+appNew);
  console.log('p2 (current) loaded. BOOK:', await p2.evaluate('BOOK&&BOOK.name'));
  await p2.evaluate('window.__oldBook=BOOK');
  const t2=Date.now();
  await(await p2.$('#fi')).uploadFile(dir+'18-philemon.xml');
  console.log(`p2 uploadFile done in ${Date.now()-t2}ms`);
  await new Promise(r=>setTimeout(r,2000));
  const book2=await p2.evaluate('BOOK&&BOOK.name');
  const changed2=await p2.evaluate('BOOK!==window.__oldBook');
  console.log(`p2 BOOK after upload: ${book2}, changed: ${changed2}`);
  // Test C: try uploadFile on p1 WHILE p2 is open (both pages open simultaneously)
  const p3=await b.newPage();
  p3.on('pageerror',e=>pageErrs.push('p3 ERR:'+e.message));
  await p3.goto('file://'+appOld);
  const p4=await b.newPage();
  p4.on('pageerror',e=>pageErrs.push('p4 ERR:'+e.message));
  await p4.goto('file://'+appNew);
  console.log('\nTest C: both pages open simultaneously');
  await p3.evaluate('window.__oldBook=BOOK');
  const t3=Date.now();
  await(await p3.$('#fi')).uploadFile(dir+'18-philemon.xml');
  console.log(`p3 uploadFile done in ${Date.now()-t3}ms`);
  await new Promise(r=>setTimeout(r,2000));
  console.log(`p3 BOOK: ${await p3.evaluate('BOOK&&BOOK.name')}, changed: ${await p3.evaluate('BOOK!==window.__oldBook')}`);
  console.log('Page errors:', pageErrs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message,e.stack.slice(0,400));process.exit(1)});
