const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const fs=require('fs');
const dir='/home/claude/lf/lowfat/';const files=fs.readdirSync(dir).filter(f=>f.endsWith('.xml')).sort();const part=+process.argv[2],parts=+process.argv[3];
const SIG=`(()=>{const out=[];BOOK.sents.forEach(e=>{doc=parse(e.xml);tag(null);const s0=ser();layout();const s1=ser();let h=5381;const sg=words.map(w=>Math.round(w.x*10)+','+Math.round(w.y*10)).join(';')+'|'+edges.map(e=>e.kind+e.a.text+e.b.text+Math.round(e.a.x)+Math.round(e.b.y)).join(';');for(let i=0;i<sg.length;i++)h=((h<<5)+h+sg.charCodeAt(i))|0;out.push([h,s0===s1?1:0,words.length])});return{name:BOOK.name,out}})()`;
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});
const pa=await b.newPage(),pb=await b.newPage();await pa.goto('file:///mnt/user-data/outputs/rk-diagram-m3.before-genealogy.html');await pb.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');
let total=0,changed=[],struct=0;
for(const [i,f] of files.entries()){if(i%parts!==part)continue;const res=[];for(const q of [pa,pb]){await q.evaluate('window.__oldBook=BOOK');await(await q.$('#fi')).uploadFile(dir+f);await q.waitForFunction(`BOOK&&BOOK!==window.__oldBook`,{timeout:90000});await new Promise(r=>setTimeout(r,100));res.push(await q.evaluate(SIG))}
 const A=res[0].out,B=res[1].out;A.forEach((a,k)=>{total++;if(a[0]!==B[k][0])changed.push(res[0].name+' #'+(k+1)+' ('+a[2]+'語)');if(B[k][1]!==1)struct++})}
console.log('part',part,'文',total,'配置が変わった文',changed.length,changed.join(', '),'| 構造(XML)が変わった文',struct);await b.close()})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
