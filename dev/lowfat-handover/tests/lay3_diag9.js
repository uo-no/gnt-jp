// Diagnostic: replicate lay3's exact loop for 3 files with extended waitForFunction timeout.
// Measure timing carefully to see if waitForFunction eventually fires or truly hangs.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).sort().slice(0,4); // first 4 books only
let b,errs=[];
const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));return pg};
(async()=>{
  b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pa=await open('file://'+appOld);
  const pb=await open('file://'+appNew);
  await new Promise(r=>setTimeout(r,3000)); // wait for both pages to initialize
  console.log(`pa=${await pa.evaluate('BOOK&&BOOK.name')}, pb=${await pb.evaluate('BOOK&&BOOK.name')}`);
  let total=0,changed=[],struct=0;
  for(const [i,f] of files.entries()){
    const res=[];
    for(const q of [pa,pb]){
      const label=q===pa?'pa':'pb';
      const tStart=Date.now();
      await q.evaluate('window.__oldBook=BOOK');
      const bookBefore=await q.evaluate('BOOK&&BOOK.name');
      await(await q.$('#fi')).uploadFile(dir+f);
      const tUpload=Date.now()-tStart;
      console.log(`[${f}] ${label}: upload done ${tUpload}ms, book_before=${bookBefore}`);
      // Use 300s timeout and measure actual time
      const tWait=Date.now();
      await q.waitForFunction(`BOOK&&BOOK!==window.__oldBook`,{timeout:300000,polling:100});
      const tWaitMs=Date.now()-tWait;
      const bookAfter=await q.evaluate('BOOK&&BOOK.name');
      console.log(`[${f}] ${label}: waitForFunction=${tWaitMs}ms, book=${bookAfter}`);
      await new Promise(r=>setTimeout(r,100));
      const tSig=Date.now();
      const sigRes=await q.evaluate(SIG);
      console.log(`[${f}] ${label}: SIG=${Date.now()-tSig}ms, sents=${sigRes.out.length}, struct_err=${sigRes.out.filter(r=>r[1]!==1).length}`);
      res.push(sigRes);
    }
    const A=res[0].out,B=res[1].out;
    const diff=A.filter((a,k)=>a[0]!==B[k][0]).length;
    A.forEach((a,k)=>{total++;if(a[0]!==B[k][0])changed.push(`${res[0].name} #${k+1}`);if(B[k][1]!==1)struct++});
    console.log(`[${f}] hash_diff=${diff}/${A.length}`);
  }
  console.log(`\nFINAL: total=${total} changed=${changed.length} struct_err=${struct}`);
  if(changed.length)console.log('changed:',changed.slice(0,10));
  console.log('errors:',errs.length);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
