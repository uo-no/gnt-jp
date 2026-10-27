// Diagnostic: test Matthew upload specifically in two-page setup.
// Check if Matthew loads on before-groupmove.html with/without other page open.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  // Test A: Matthew on before-groupmove, standalone (no second page)
  const pa=await b.newPage();pa.on('pageerror',e=>errs.push('A:'+e.message));
  await pa.goto('file://'+appOld);
  await pa.evaluate('window.__oldBook=BOOK');
  const t0=Date.now();
  await(await pa.$('#fi')).uploadFile(dir+'01-matthew.xml');
  const t1=Date.now();console.log(`Matthew uploadFile (pa standalone): ${t1-t0}ms`);
  await pa.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:120000});
  console.log(`Matthew waitForFunction (pa standalone): ${Date.now()-t1}ms, sents=${await pa.evaluate('BOOK.sents.length')}`);
  // Test B: Load Matthew on pb (current) standalone
  const pb=await b.newPage();pb.on('pageerror',e=>errs.push('B:'+e.message));
  await pb.goto('file://'+appNew);
  await pb.evaluate('window.__oldBook=BOOK');
  const t2=Date.now();
  await(await pb.$('#fi')).uploadFile(dir+'01-matthew.xml');
  const t3=Date.now();console.log(`Matthew uploadFile (pb standalone): ${t3-t2}ms`);
  await pb.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:120000});
  console.log(`Matthew waitForFunction (pb standalone): ${Date.now()-t3}ms, sents=${await pb.evaluate('BOOK.sents.length')}`);
  // Test C: Second upload to pa (Matthew again, simulating the two-page loop's second iteration reload)
  await pa.evaluate('window.__oldBook=BOOK');
  const t4=Date.now();
  await(await pa.$('#fi')).uploadFile(dir+'02-mark.xml');
  const t5=Date.now();console.log(`Mark uploadFile (pa after Matthew): ${t5-t4}ms`);
  await pa.waitForFunction('BOOK&&BOOK!==window.__oldBook',{timeout:120000});
  console.log(`Mark waitForFunction (pa): ${Date.now()-t5}ms, sents=${await pa.evaluate('BOOK.sents.length')}`);
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
