// Full lay3 comparison: before-groupmove vs current, all 26 books.
// Adds 2s initialization wait (diagnostic finding: pages need time to settle after goto).
// This is equivalent to lay3.js but with the initialization race condition resolved.
// NOTE: This is a diagnostic run, not an execution of lay3_local.js itself.
const p=require('puppeteer-core');const fs=require('fs');
const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const appOld='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-groupmove.html';
const appNew='/Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).sort();
let b,errs=[];
const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto(url);return pg};
(async()=>{
  const t_global=Date.now();
  b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
  const pa=await open('file://'+appOld);
  const pb=await open('file://'+appNew);
  await new Promise(r=>setTimeout(r,2000)); // allow sample-book initialization to complete
  console.log(`pages ready: pa=${await pa.evaluate('BOOK&&BOOK.name')}, pb=${await pb.evaluate('BOOK&&BOOK.name')}`);
  let total=0,changed=[],struct=0;
  for(const [i,f] of files.entries()){
    const res=[];
    for(const q of [pa,pb]){
      await q.evaluate('window.__oldBook=BOOK');
      await(await q.$('#fi')).uploadFile(dir+f);
      await q.waitForFunction(`BOOK&&BOOK!==window.__oldBook`,{timeout:180000,polling:200});
      await new Promise(r=>setTimeout(r,100));
      res.push(await q.evaluate(SIG));
    }
    const A=res[0].out,B=res[1].out;
    const diffCount=A.filter((a,k)=>a[0]!==B[k][0]).length;
    A.forEach((a,k)=>{total++;if(a[0]!==B[k][0])changed.push(`${res[0].name} #${k+1} (${a[2]}語)`);if(B[k][1]!==1)struct++});
    process.stdout.write(`${res[0].name}: ${A.length}文 diff=${diffCount}  `);
    if((i+1)%4===0)console.log('');
  }
  console.log('\n');
  console.log(`part 0 文 ${total} 配置が変わった文 ${changed.length}${changed.length?(' '+changed.join(', ')):''} | 構造(XML)が変わった文 ${struct}`);
  console.log(`elapsed: ${Math.round((Date.now()-t_global)/1000)}s, errors: ${errs.length}`);
  await b.close();
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
