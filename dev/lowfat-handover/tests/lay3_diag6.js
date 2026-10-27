// Diagnostic: isolate the two-pages-open-then-upload failure pattern.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  // Reproduce lay3's pattern: open BOTH pages first, then upload to each
  const pa=await b.newPage();pa.on('pageerror',e=>errs.push('A:'+e.message));
  const pb=await b.newPage();pb.on('pageerror',e=>errs.push('B:'+e.message));
  pa.on('console',m=>{if(m.type()==='log')console.log('  pa:',m.text())});
  await pa.goto('file://'+appOld);
  await pb.goto('file://'+appNew);
  console.log(`pa=${await pa.evaluate('BOOK&&BOOK.name')}, pb=${await pb.evaluate('BOOK&&BOOK.name')}`);
  // Instrument pa
  await pa.evaluate(`window.__changeCount=0;document.getElementById('fi').addEventListener('change',()=>{window.__changeCount++;console.log('fi change, count='+window.__changeCount+', BOOK='+BOOK.name)})`);
  // Set oldBook and upload Philemon to pa
  await pa.evaluate('window.__oldBook=BOOK');
  console.log('Uploading Philemon to pa (both pages already open)...');
  const t0=Date.now();
  await(await pa.$('#fi')).uploadFile(dir+'18-philemon.xml');
  console.log(`uploadFile done: ${Date.now()-t0}ms, changeCount=${await pa.evaluate('window.__changeCount')}`);
  // Check status after 1s and 5s
  await new Promise(r=>setTimeout(r,1000));
  console.log(`1s: BOOK=${await pa.evaluate('BOOK&&BOOK.name')}, changed=${await pa.evaluate('BOOK!==window.__oldBook')}`);
  await new Promise(r=>setTimeout(r,4000));
  console.log(`5s: BOOK=${await pa.evaluate('BOOK&&BOOK.name')}, changed=${await pa.evaluate('BOOK!==window.__oldBook')}`);
  // Now try with waitForFunction but long timeout to measure actual time
  await pa.evaluate('window.__oldBook=BOOK');
  await(await pa.$('#fi')).uploadFile(dir+'02-mark.xml');
  const t1=Date.now();
  await pa.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:60000});
  console.log(`Mark waitForFunction: ${Date.now()-t1}ms, BOOK=${await pa.evaluate('BOOK.name')}`);
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
