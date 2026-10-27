const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';const S=JSON.parse(fs.readFileSync('/tmp/sets.json','utf8'));
const open=async(url)=>{const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto(url);return pg};
let b,errs=[];
(async()=>{b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});
const nu=await open('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html'),old=await open('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.before-zoom.html');const ev=(pg,f)=>pg.evaluate(f);
// A. 通常文 1 Corinthians 1:1-2 : initial view must be identical to before
const vN=await ev(nu,'({k:view.k,x:view.x,y:view.y,ref:$("#ref").textContent})'),vO=await ev(old,'({k:view.k,x:view.x,y:view.y})');
console.log('1コリント 1:1–2  現状',JSON.stringify({k:+vO.k.toFixed(4),x:Math.round(vO.x),y:Math.round(vO.y)}),' 変更後',JSON.stringify({k:+vN.k.toFixed(4),x:Math.round(vN.x),y:Math.round(vN.y)}),vN.ref);
ok(Math.abs(vN.k-vO.k)<1e-9&&Math.abs(vN.x-vO.x)<1e-6&&Math.abs(vN.y-vO.y)<1e-6,'通常文: 初期表示（倍率・位置）が変更前と完全に同じ');
const allIn=await ev(nu,`(()=>{const r=svg.getBoundingClientRect();return words.every(w=>{const g=w.g.getBoundingClientRect();return g.left>=r.left-1&&g.right<=r.right+1&&g.top>=r.top-1&&g.bottom<=r.bottom+1})})()`);ok(allIn,'通常文: 全語が初期表示に収まっている');
ok(await ev(nu,'minZoom()')===0.15,'通常文: ズーム下限は従来どおり0.15');
await old.close();
// B. 長文6文 + Luke : open from the full books
const books={'Luke':'03-luke.xml','Ephesians':'10-ephesians.xml','Colossians':'12-colossians.xml','2 Thessalonians':'14-2thessalonians.xml'};
const targets=[['Luke',S.idxLuke?119:119,165,40]];
const six=S.metaSel.slice(1,7);const pred={0:51,1:46,2:55,3:85,4:49,5:67};
const fileOf={};fs.readdirSync(dir).forEach(f=>{fileOf[f]=f});
const results=[];
async function openSentence(book,file,idx){await(await nu.$('#fi')).uploadFile(dir+file);await nu.waitForFunction(`BOOK&&BOOK.name==='${book}'`,{timeout:60000});await ev(nu,`go(${idx})`);
 return ev(nu,`(()=>{const r=svg.getBoundingClientRect();let vis=0;for(const w of words){const g=w.g.getBoundingClientRect();if(g.right>r.left&&g.left<r.right&&g.bottom>r.top&&g.top<r.bottom)vis++}return{k:+view.k.toFixed(4),font:+(22*view.k).toFixed(1),vis,n:words.length,x:Math.round(view.x),y:Math.round(view.y),first:(()=>{const g=words[0].g.getBoundingClientRect();return g.left>=r.left&&g.right<=r.right&&g.top>=r.top&&g.bottom<=r.bottom})(),minZoom:+minZoom().toFixed(4),ref:$('#ref').textContent,fitK:+fitInfo().k.toFixed(4)}})()`)}
const luke=await openSentence('Luke','03-luke.xml',119);console.log('\nLuke 3:23–38 初期表示',JSON.stringify(luke));
ok(luke.k===0.5&&luke.font===11,'Luke: 初期倍率 0.5（文字11px。変更前は約1.9px）');ok(luke.first,'Luke: 文の先頭の語が画面内にある（左上から表示）');ok(luke.vis>=30&&luke.vis<=50,`Luke: 初期表示で ${luke.vis}/${luke.n}語が見える（試算 40語）`);
ok(luke.minZoom===luke.fitK&&luke.fitK<0.15,`Luke: ズーム下限 = fit-all(${luke.fitK})（通常の0.15より小さい文のみ）`);
// zoom out to the floor, back in to the ceiling, pan, fit-all button, Auto Layout, navigation
await nu.mouse.move(700,350);for(let i=0;i<6;i++)await nu.mouse.wheel({deltaY:900});const kMin=await ev(nu,'view.k');ok(Math.abs(kMin-await ev(nu,'fitInfo().k'))<1e-9,'Luke: ホイールで fit-all(0.088)までズームアウトでき、それ以下には縮小しない（k='+kMin.toFixed(4)+'）');
await nu.mouse.move(700,350);for(let i=0;i<8;i++)await nu.mouse.wheel({deltaY:-1200});const kMax=await ev(nu,'view.k');ok(kMax===6,'Luke: ホイールで拡大の上限 6 まで拡大できる');
await nu.click('#zf');const fa=await ev(nu,`(()=>{const r=svg.getBoundingClientRect();return{k:+view.k.toFixed(4),all:words.every(w=>{const g=w.g.getBoundingClientRect();return g.left>=r.left-1&&g.right<=r.right+1&&g.top>=r.top-1&&g.bottom<=r.bottom+1})}})()`);ok(fa.all&&Math.abs(fa.k-luke.fitK)<1e-4,'Luke: 「全体」ボタン=fit-all（k='+fa.k+'）で全語が画面に収まる');
await nu.click('#zo');ok(Math.abs(await ev(nu,'view.k')-await ev(nu,'fitInfo().k'))<1e-9,'Luke: fit-all の状態から「－」を押しても下限で止まる');
await nu.click('#al');ok(await ev(nu,'view.k')===0.5,'Luke: Auto Layout は初期表示（0.5・先頭から）に戻す');
const v0=await ev(nu,'[view.x,view.y]');await nu.mouse.move(800,400);await nu.mouse.down();await nu.mouse.move(700,300,{steps:5});await nu.mouse.up();const v1=await ev(nu,'[view.x,view.y]');ok(Math.round(v1[0]-v0[0])===-100&&Math.round(v1[1]-v0[1])===-100,'Luke: パン（ドラッグ）が動く');
await nu.click('#zi');ok(Math.abs(await ev(nu,'view.k')-0.625)<1e-6,'Luke: 「＋」で 0.5→0.625 に拡大');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close()})().catch(e=>{console.log('ERR',e.stack.slice(0,700));process.exit(1)});
