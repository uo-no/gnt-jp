const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/home/claude/lf/lowfat/';const S=JSON.parse(fs.readFileSync('/tmp/sets.json','utf8'));
const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto(url);return pg};
let b,errs=[];
(async()=>{b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});
const nu=await open('file:///mnt/user-data/outputs/rk-diagram-m3.html');const ev=(pg,f)=>pg.evaluate(f);
const books={'Luke':'03-luke.xml','Ephesians':'10-ephesians.xml','Colossians':'12-colossians.xml','2 Thessalonians':'14-2thessalonians.xml'};
const targets=[['Luke',S.idxLuke?119:119,165,40]];
const six=S.metaSel.slice(1,7);const pred={0:51,1:46,2:55,3:85,4:49,5:67};
const fileOf={};fs.readdirSync(dir).forEach(f=>{fileOf[f]=f});
const results=[];
async function openSentence(book,file,idx){await ev(nu,'window.__oldBook=BOOK');await(await nu.$('#fi')).uploadFile(dir+file);await nu.waitForFunction(`BOOK&&BOOK!==window.__oldBook&&BOOK.name==='${book}'`,{timeout:60000});await ev(nu,`go(${idx})`);
 return ev(nu,`(()=>{const r=svg.getBoundingClientRect();let vis=0;for(const w of words){const g=w.g.getBoundingClientRect();if(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom)vis++}return{k:+view.k.toFixed(4),font:+(22*view.k).toFixed(1),vis,n:words.length,x:Math.round(view.x),y:Math.round(view.y),first:(()=>{const g=words[0].g.getBoundingClientRect();return g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom})(),minZoom:+minZoom().toFixed(4),ref:$('#ref').textContent,fitK:+fitInfo().k.toFixed(4)}})()`)}
const luke=await openSentence('Luke','03-luke.xml',119);
await nu.click('#nn');await new Promise(r=>setTimeout(r,200));const nx=await ev(nu,'({ref:$("#ref").textContent,k:+view.k.toFixed(4),n:words.length,fit:+fitInfo().k.toFixed(4)})');ok(nx.k===Math.max(nx.fit,0.5),`文移動(次の文 ${nx.ref}, ${nx.n}語): 初期表示 k=${nx.k}（max(fit-all ${nx.fit}, 0.5)）`);
await nu.click('#np');await new Promise(r=>setTimeout(r,200));ok(await ev(nu,'view.k')===0.5&&await ev(nu,'$("#ref").textContent')==='Luke 3:23–38','文移動(前の文で戻る): Lukeの初期表示 0.5 に戻る');
// 100-149語
for(const [i,m] of six.entries()){const file=m.file;const r=await openSentence(m.book,file,m.idx);console.log(`100–149語 #${i+1} ${m.book} ${r.ref}: k=${r.k} 文字${r.font}px 見える語 ${r.vis}/${r.n}（試算 ${pred[i]}） 先頭語 ${r.first?'画面内':'画面外'}`);ok(r.k===Math.max(r.fitK,0.5)&&r.first&&Math.abs(r.vis-pred[i])<=2,`  → 倍率 max(fit-all ${r.fitK}, 0.5)、先頭が見える、見える語数が試算と一致`)}
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
