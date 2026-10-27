// Diagnostic: check if #fi change event fires on second upload after Matthew.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  const pa=await b.newPage();pa.on('pageerror',e=>errs.push('A:'+e.message));
  pa.on('console',m=>{if(m.type()==='log')console.log('  pa log:',m.text())});
  await pa.goto('file://'+appOld);
  // Instrument: count #fi change events
  await pa.evaluate(`window.__changeCount=0; document.getElementById('fi').addEventListener('change',()=>{window.__changeCount++;console.log('fi change fired, count='+window.__changeCount)})`);
  // Upload 1: Philemon (small, warm up)
  await pa.evaluate('window.__oldBook=BOOK');
  await(await pa.$('#fi')).uploadFile(dir+'18-philemon.xml');
  await pa.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:30000});
  console.log(`After Philemon: BOOK=${await pa.evaluate('BOOK.name')}, changeCount=${await pa.evaluate('window.__changeCount')}`);
  // Upload 2: Matthew
  await pa.evaluate('window.__oldBook=BOOK');
  await(await pa.$('#fi')).uploadFile(dir+'01-matthew.xml');
  await pa.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:60000});
  console.log(`After Matthew: BOOK=${await pa.evaluate('BOOK.name')}, changeCount=${await pa.evaluate('window.__changeCount')}`);
  // Open second page (this is what triggers the issue in lay3)
  const pb=await b.newPage();pb.on('pageerror',e=>errs.push('B:'+e.message));
  await pb.goto('file://'+appNew);
  await pb.evaluate('window.__oldBook=BOOK');
  await(await pb.$('#fi')).uploadFile(dir+'01-matthew.xml');
  await pb.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:60000});
  console.log(`pb after Matthew: BOOK=${await pb.evaluate('BOOK.name')}`);
  // Upload 3 to pa: Mark (second book — this is the failing case)
  await pa.evaluate('window.__oldBook=BOOK');
  console.log(`pa __oldBook before Mark: ${await pa.evaluate('window.__oldBook&&window.__oldBook.name')}`);
  console.log(`pa changeCount before Mark: ${await pa.evaluate('window.__changeCount')}`);
  const t=Date.now();
  await(await pa.$('#fi')).uploadFile(dir+'02-mark.xml');
  console.log(`Mark uploadFile done: ${Date.now()-t}ms`);
  console.log(`pa changeCount after upload: ${await pa.evaluate('window.__changeCount')}`);
  await new Promise(r=>setTimeout(r,2000)); // wait 2s instead of using waitForFunction
  console.log(`pa BOOK 2s after Mark upload: ${await pa.evaluate('BOOK&&BOOK.name')}`);
  console.log(`pa BOOK changed: ${await pa.evaluate('BOOK!==window.__oldBook')}`);
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
