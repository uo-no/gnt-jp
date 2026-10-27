// Diagnostic: reproduce lay3's two-page architecture and measure per-book timing.
// Stops after 3 books (Matthew, Mark, Luke) to check if the mechanism works.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).sort();
const WAIT_MS=180000; // extended timeout to diagnose
(async()=>{
  const errs=[];
  const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push('PAGE ERR: '+e.message));pg.on('console',m=>m.type()==='error'&&errs.push('CONSOLE ERR: '+m.text()));await pg.goto(url);return pg};
  console.log('Opening two pages...');
  const t0=Date.now();
  const pa=await open('file://'+appOld);
  const pb=await open('file://'+appNew);
  console.log(`Both pages open: ${Date.now()-t0}ms`);
  console.log(`pa BOOK: ${await pa.evaluate('BOOK&&BOOK.name')}, pb BOOK: ${await pb.evaluate('BOOK&&BOOK.name')}`);
  let total=0,changed=[],struct=0;
  for(const [i,f] of files.entries()){
    if(i>2)break; // only first 3 books for diagnostic
    const res=[];
    for(const q of [pa,pb]){
      const label=q===pa?'pa(before-groupmove)':'pb(current)';
      const t1=Date.now();
      await q.evaluate('window.__oldBook=BOOK');
      await(await q.$('#fi')).uploadFile(dir+f);
      await q.waitForFunction(`BOOK&&BOOK!==window.__oldBook`,{timeout:WAIT_MS});
      const tLoad=Date.now()-t1;
      await new Promise(r=>setTimeout(r,100));
      const t2=Date.now();
      const sigRes=await q.evaluate(SIG);
      const tSig=Date.now()-t2;
      console.log(`[${f}] ${label}: load=${tLoad}ms sig=${tSig}ms sents=${sigRes.out.length} struct_err=${sigRes.out.filter(r=>r[1]!==1).length}`);
      res.push(sigRes);
    }
    const A=res[0].out,B=res[1].out;
    A.forEach((a,k)=>{total++;if(a[0]!==B[k][0])changed.push(res[0].name+' #'+(k+1)+' ('+a[2]+'語)');if(B[k][1]!==1)struct++});
    console.log(`  -> hashes match: ${A.filter((a,k)=>a[0]===B[k][0]).length}/${A.length}, changed: ${A.filter((a,k)=>a[0]!==B[k][0]).length}`);
  }
  console.log(`\nSummary: total=${total} changed=${changed.length} struct_err=${struct}`);
  console.log(`errors: ${errs.length}`, errs.slice(0,5));
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
