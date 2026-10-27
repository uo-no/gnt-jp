const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/home/claude/lf/lowfat/';
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);layout();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push(h)});return out})()`;
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});const errs=[];
const pa=await b.newPage(),pb=await b.newPage();[pa,pb].forEach(q=>{q.on('pageerror',e=>errs.push(e.message));q.on('console',m=>m.type()==='error'&&errs.push(m.text()))});
await pa.goto('file:///mnt/user-data/outputs/rk-diagram.html');await pb.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');
for(const [f,nm,min] of [['07-1corinthians.xml','1 Corinthians',400],['03-luke.xml','Luke',1000],['10-ephesians.xml','Ephesians',50]]){for(const q of [pa,pb]){await(await q.$('#fi')).uploadFile(dir+f);await q.waitForFunction(`BOOK&&BOOK.name==='${nm}'&&BOOK.sents.length>${min}`,{timeout:60000})}
 const A=await pa.evaluate(SIG),B=await pb.evaluate(SIG);ok(A.length===B.length&&A.every((v,i)=>v===B[i]),`${nm}: 全${A.length}文の語座標・線構成が公開版(rk-diagram.html)と完全一致`)}
console.log('errors',errs.length);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,500));process.exit(1)});
