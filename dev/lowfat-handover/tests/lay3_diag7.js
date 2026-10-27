// Diagnostic: does rd.onload fire for the second upload? Instrument FileReader directly.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const errs=[];
  // Open both pages simultaneously (same as lay3)
  const pa=await b.newPage();pa.on('pageerror',e=>errs.push('A:'+e.message));
  const pb=await b.newPage();pb.on('pageerror',e=>errs.push('B:'+e.message));
  pa.on('console',m=>{if(m.type()==='log')console.log('  pa:',m.text())});
  await pa.goto('file://'+appOld);
  await pb.goto('file://'+appNew);
  // Instrument pa's #fi handler: wrap it to log FileReader events
  await pa.evaluate(`
    window.__loadCount=0; window.__errorCount=0;
    const fi=document.getElementById('fi');
    const origOnChange=fi.onchange;
    fi.onchange=function(e){
      const f=e.target.files[0];
      if(!f){console.log('fi change: no file');return;}
      console.log('fi change: file='+f.name+', size='+f.size);
      const rd=new FileReader();
      rd.onload=()=>{window.__loadCount++;console.log('rd.onload fired #'+window.__loadCount+', name='+f.name);loadBook(String(rd.result));note(f.name+' loaded')};
      rd.onerror=()=>{window.__errorCount++;console.log('rd.onerror fired #'+window.__errorCount)};
      rd.onabort=()=>{console.log('rd.onabort fired')};
      rd.readAsText(f);
      e.target.value='';
      console.log('fi change handler done, reading started for '+f.name);
    };
  `);
  // Upload 1: Philemon
  await pa.evaluate('window.__oldBook=BOOK');
  await(await pa.$('#fi')).uploadFile(dir+'18-philemon.xml');
  await pa.waitForFunction('BOOK&&BOOK.name==="Philemon"',{timeout:30000});
  console.log(`After Philemon: BOOK=${await pa.evaluate('BOOK.name')}, loadCount=${await pa.evaluate('window.__loadCount')}`);
  // Upload 2: Mark (both pages open)
  await pa.evaluate('window.__oldBook=BOOK');
  console.log('Uploading Mark to pa (pb still open)...');
  await(await pa.$('#fi')).uploadFile(dir+'02-mark.xml');
  // Wait and check in intervals
  for(let t=0;t<15;t++){
    await new Promise(r=>setTimeout(r,1000));
    const state=await pa.evaluate(`({book:BOOK.name,changed:BOOK!==window.__oldBook,loadCount:window.__loadCount,errorCount:window.__errorCount})`);
    console.log(`${t+1}s: ${JSON.stringify(state)}`);
    if(state.changed){console.log('BOOK changed!');break;}
  }
  console.log('errors:',errs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
