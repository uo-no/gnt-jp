// Diagnostic: check if loadBook returns false for Mark when both pages are open.
// Uses the ORIGINAL onchange handler (does not replace it), just monitors BOOK and notes.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  const pa=await b.newPage();pa.on('pageerror',e=>errs.push('A:'+e.message));
  const pb=await b.newPage();pb.on('pageerror',e=>errs.push('B:'+e.message));
  // Monitor notes/alerts on pa
  pa.on('console',m=>{if(m.type()==='log'||m.type()==='warn'||m.type()==='error')console.log('  pa console:',m.text())});
  await pa.goto('file://'+appOld);
  await pb.goto('file://'+appNew);
  // Patch the note() function on pa to log its messages
  await pa.evaluate(`const origNote=note; window.note=function(msg){console.log('NOTE: '+msg);origNote(msg)};`);
  // Patch loadBook to log its return value
  await pa.evaluate(`const origLoadBook=loadBook; window.loadBook=function(text){const r=origLoadBook(text);console.log('loadBook returned: '+r+', BOOK='+BOOK.name);return r};`);
  // Upload Philemon using ORIGINAL handler
  await pa.evaluate('window.__oldBook=BOOK');
  await(await pa.$('#fi')).uploadFile(dir+'18-philemon.xml');
  await pa.waitForFunction('BOOK&&BOOK.name==="Philemon"',{timeout:30000});
  console.log(`After Philemon: BOOK=${await pa.evaluate('BOOK.name')}`);
  // Upload Mark using ORIGINAL handler (both pages open)
  await pa.evaluate('window.__oldBook=BOOK');
  console.log('Uploading Mark (both pages open, original handler)...');
  await(await pa.$('#fi')).uploadFile(dir+'02-mark.xml');
  // Poll for 10 seconds
  for(let t=0;t<10;t++){
    await new Promise(r=>setTimeout(r,1000));
    const state=await pa.evaluate('({book:BOOK.name,changed:BOOK!==window.__oldBook})');
    console.log(`${t+1}s: ${JSON.stringify(state)}`);
    if(state.changed){console.log('BOOK changed!');break;}
  }
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
