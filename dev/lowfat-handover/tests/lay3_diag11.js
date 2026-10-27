// Diagnostic: reproduce exact lay3 failure and identify minimum sleep to fix it.
// Uses the same open() function as original lay3 (no extra init wait).
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).sort().slice(0,3);
let b,errs=[];
const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto(url);return pg};
(async()=>{
  b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pa=await open('file://'+appOld);
  const pb=await open('file://'+appNew);
  // Add a post-open wait to allow both pages to fully initialize their sample book
  const initSleep=2000; // test with 2s
  console.log(`Waiting ${initSleep}ms for page initialization...`);
  await new Promise(r=>setTimeout(r,initSleep));
  console.log(`pa=${await pa.evaluate('BOOK&&BOOK.name')}, pb=${await pb.evaluate('BOOK&&BOOK.name')}`);
  let total=0,changed=[],struct=0;
  for(const [i,f] of files.entries()){
    const res=[];
    for(const q of [pa,pb]){
      const label=q===pa?'pa':'pb';
      await q.evaluate('window.__oldBook=BOOK');
      const t0=Date.now();
      await(await q.$('#fi')).uploadFile(dir+f);
      const tUpload=Date.now()-t0;
      await q.waitForFunction(`BOOK&&BOOK!==window.__oldBook`,{timeout:180000,polling:200});
      const tTotal=Date.now()-t0;
      const bookName=await q.evaluate('BOOK.name');
      console.log(`[${f}] ${label}: upload=${tUpload}ms total=${tTotal}ms book=${bookName}`);
      await new Promise(r=>setTimeout(r,100));
      const t1=Date.now();
      const sigRes=await q.evaluate(SIG);
      console.log(`[${f}] ${label}: SIG=${Date.now()-t1}ms sents=${sigRes.out.length} struct_err=${sigRes.out.filter(r=>r[1]!==1).length}`);
      res.push(sigRes);
    }
    const A=res[0].out,B=res[1].out;
    const diffCount=A.filter((a,k)=>a[0]!==B[k][0]).length;
    A.forEach((a,k)=>{total++;if(a[0]!==B[k][0])changed.push(`${res[0].name} #${k+1}`);if(B[k][1]!==1)struct++});
    console.log(`[${f}] hash_diff=${diffCount}/${A.length}`);
  }
  console.log(`\nSummary: total=${total} changed=${changed.length} struct_err=${struct}`);
  if(changed.length)console.log('changed:',changed.slice(0,20));
  console.log('errors:',errs.length);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
