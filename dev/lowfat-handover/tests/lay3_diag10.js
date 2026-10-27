// Diagnostic: check if pages initialize correctly in a fresh browser instance.
const p=require('puppeteer-core');
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
(async()=>{
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const paErrs=[],pbErrs=[];
  const pa=await b.newPage();
  pa.on('pageerror',e=>{paErrs.push('pa pageerror: '+e.message);console.log('pa pageerror:',e.message)});
  pa.on('console',m=>{if(m.type()==='error')console.log('pa console err:',m.text())});
  const pb=await b.newPage();
  pb.on('pageerror',e=>{pbErrs.push('pb pageerror: '+e.message);console.log('pb pageerror:',e.message)});
  pb.on('console',m=>{if(m.type()==='error')console.log('pb console err:',m.text())});
  console.log('Opening pa...');
  await pa.goto('file://'+appOld);
  console.log('pa goto done');
  console.log('Opening pb...');
  await pb.goto('file://'+appNew);
  console.log('pb goto done');
  await new Promise(r=>setTimeout(r,5000));
  console.log('After 5s sleep:');
  try{console.log('pa BOOK:',await pa.evaluate('typeof BOOK'));}catch(e){console.log('pa eval error:',e.message)}
  try{console.log('pb BOOK:',await pb.evaluate('typeof BOOK'));}catch(e){console.log('pb eval error:',e.message)}
  console.log('paErrs:',paErrs);
  console.log('pbErrs:',pbErrs);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
