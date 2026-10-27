const p=require('puppeteer-core');const fs=require('fs');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
(async()=>{const b=await p.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');const ev=f=>pg.evaluate(f);
await(await pg.$('#fi')).uploadFile(dir+'07-1corinthians.xml');await pg.waitForFunction("BOOK&&BOOK.sents.length>400");
const isCl=`(k=>k.tagName==='w'?A(k,'class')==='conj':(A(k,'class')==='cl'||A(k,'type')==='group'||/Conj/.test(A(k,'rule')||'')))`;
const PICK=kind=>`(()=>{let best=null,bs=0;for(let i=0;i<400;i++){doc=parse(BOOK.sents[i].xml);tag(null);layout();const es=edges.filter(e=>e.kind==='${kind}'&&e.grp);for(let j=0;j<es.length;j++){const g=es[j].grp;const base=new Map(words.map(w=>[w.el,w.y]));g.setAttribute('rk-dy','72');layout();const inG=new Set([...g.getElementsByTagName('w')]);const gm=GM.get(g);const pushed=words.filter(w=>!inG.has(w.el)&&w.y!==base.get(w.el)).length;g.removeAttribute('rk-dy');layout();if(pushed>bs&&words.length<=60){bs=pushed;best={si:i,j,pushed}}}}return best})()`;
const pgf=await b.newPage();await pgf.goto('file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html');await(await pgf.$('#fi')).uploadFile(dir+'07-1corinthians.xml');await pgf.waitForFunction('BOOK&&BOOK.sents.length>400');const D=await pgf.evaluate(PICK('dash'));const M=await pgf.evaluate(PICK('mod'));await pgf.close();console.log('dash 試験文:',JSON.stringify(D),' mod 試験文:',JSON.stringify(M));const si=D.si;
await ev(`go(${si})`);await new Promise(r=>setTimeout(r,300));ok(D&&D.pushed>=1,'dash試験文: '+await ev("$('#ref').textContent+' / '+words.length+'語'")+'（対象グループの後続で '+D.pushed+' 語が押し下げられる）');
const s0=await ev('ser()');const rm=async f=>f;
// helpers
const lineMid=async(kind,idx=0,tt=0.5)=>ev(`(()=>{const es=edges.filter(e=>e.kind==='${kind}'&&e.grp);const e=es[${idx}];if(!e)return null;const m=/M([-\\d.]+),([-\\d.]+)L([-\\d.]+),([-\\d.]+)/.exec(pd(e));const x=+m[1]+(+m[3]-+m[1])*${tt},y=+m[2]+(+m[4]-+m[2])*${tt};const r=svg.getBoundingClientRect();return{sx:r.left+view.x+x*view.k,sy:r.top+view.y+y*view.k,k:view.k,n:es.length}})()`);
const posMap=()=>ev(`words.map(w=>[w.el.getAttribute('xml:id'),w.x,w.y,w.manual])`);
const toObj=a=>{const m={};a.forEach(([id,x,y,man])=>m[id]={x,y,man});return m};
const grpInfo=(kind,idx)=>ev(`(()=>{const e=edges.filter(x=>x.kind==='${kind}'&&x.grp)[${idx}];const g=e.grp;const par=g.parentNode;const items=[...par.children].filter(c=>c.tagName==='wg');const ids=x=>[...x.getElementsByTagName('w')].map(w=>w.getAttribute('xml:id'));return{idx:items.indexOf(g),items:items.map(ids),conj:GM.get(g).conj?GM.get(g).conj.el.getAttribute('xml:id'):null,label:bd(g)}})()`);
await pg.click('#zf');
// ---- struct mode: dragging a line does NOT move groups (it pans, as before) ----
const m0=await lineMid('dash',D.j);await pg.mouse.move(m0.sx,m0.sy);await pg.mouse.down();await pg.mouse.move(m0.sx+20,m0.sy+60,{steps:5});await pg.mouse.up();
ok(await ev('ser()')===s0,'構造編集モード: 線のドラッグでグループは動かない（rk-dy なし・XML不変）');ok(await ev(`document.querySelector('#svg').classList.contains('lm')===false`),'構造編集モード: ヒット領域は無効');
await pg.click('#zf');
// ---- layout mode: dash line drag ----
await pg.click('#mL');ok(await ev(`document.querySelector('#svg').classList.contains('lm')`),'レイアウト編集モード: ヒット領域が有効');
const gi=await grpInfo('dash',D.j);const base=toObj(await posMap());const m1=await lineMid('dash',D.j);
const top=await ev(`document.elementFromPoint(${m1.sx},${m1.sy}).getAttribute('class')`);console.log('  ヒット対象のclass:',top);
const dv=72;await pg.mouse.move(m1.sx,m1.sy);await pg.mouse.down();await pg.mouse.move(m1.sx,m1.sy+dv*m1.k/2,{steps:4});
const pv=await ev(`$('#dt').textContent`);ok(/グループ移動：/.test(pv)&&/確定時/.test(pv),'ドラッグ中: プレビュー文 '+pv.slice(0,60));await pg.mouse.move(m1.sx,m1.sy+dv*m1.k,{steps:4});await pg.mouse.up();
const after=toObj(await posMap());const dyOf2=id=>Math.round(after[id].y-base[id].y);
const grpIds=await ev(`(()=>{const g=edges.filter(x=>x.kind==='dash'&&x.grp)[${D.j}].grp;return[...g.getElementsByTagName('w')].map(w=>w.getAttribute('xml:id'))})()`);
const order=await ev(`[...doc.getElementsByTagName('w')].map(w=>w.getAttribute('xml:id'))`);const firstIdx=Math.min(...grpIds.map(id=>order.indexOf(id)));
const changed=Object.keys(after).filter(id=>dyOf2(id)!==0);console.log('  dashドラッグ: 動いた語',changed.length,'/',Object.keys(after).length,' 動いた量の種類',JSON.stringify([...new Set(changed.map(dyOf2))]));
ok(Object.keys(after).every(id=>after[id].x===base[id].x),'dash: 水平座標は全語で不変');
const gdy=await ev(`[...doc.getElementsByTagName('wg')].filter(g=>g.hasAttribute('rk-dy')).map(x=>+A(x,'rk-dy'))`);ok(gdy.length===1&&gdy[0]===dv,'dash: 対象グループにだけ rk-dy='+dv+' が書かれた '+JSON.stringify(gdy)+'（押し下げた後続には属性を書かない）');
ok(grpIds.every(id=>dyOf2(id)===dv),'dash: 対象グループの全語が+'+dv+'（グループ内の相対配置を維持）');
ok(changed.every(id=>dyOf2(id)===dv),'dash: 動いた語はすべて +'+dv+' のみ（押し下げは必要な分だけ・連鎖しても量が増減しない）');
ok(changed.length>grpIds.length,'dash: 後続の流れの '+(changed.length-grpIds.length)+' 語が押し下げられた');
ok(Object.keys(after).filter(id=>order.indexOf(id)<firstIdx&&!(gi.conj===id)).every(id=>dyOf2(id)===0),'dash: 文書順でグループより前の語は動かない（無関係な句・節は動かない）');
ok(gi.conj&&dyOf2(gi.conj)===dv,'dash: 接続詞も同じ行として一緒に動く');
ok(await ev(`words.every(w=>!w.manual)`),'dash: 自動配置の語は手動化されない（rk-x/rk-y は付かない）');
const s1=await ev('ser()');const undoN1=await ev('undoS.length');ok(undoN1===1,'Undo履歴は1件（移動＋押し下げで1回の操作）');
await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control');ok(await ev('ser()')===s0,'Undo 1回で移動前の配置（XML）に完全復元');
await pg.keyboard.down('Control');await pg.keyboard.press('KeyY');await pg.keyboard.up('Control');ok(await ev('ser()')===s1,'Redo 1回で移動後に完全復元');
// ---- changes list / JSON ----
const chg=await ev(`$('#chg').innerText`);ok(/グループ移動 \(1\)/.test(chg)&&/縦オフセット: なし → \+72/.test(chg),'変更一覧にグループ単位で表示: '+chg.replace(/\n+/g,' / ').slice(0,90));
await ev(`dm('json')`);const js=await ev(`ta.value`);ok(/"groupOffsets"/.test(js)&&/"dy": 72/.test(js),'JSON表示に groupOffsets が出る');await ev(`dm('xml')`);await pg.click('#dc');
// ---- Auto Layout keeps rk-dy, no accumulation ----
const pa=toObj(await posMap());await pg.click('#al');const pb=toObj(await posMap());ok(Object.keys(pa).every(id=>pa[id].y===pb[id].y&&pa[id].x===pb[id].x)&&(await ev(`doc.querySelectorAll('wg[rk-dy]').length`))===1,'Auto Layout: rk-dy 維持・座標が累積しない');
await pg.click('#al');await pg.click('#al');ok(await ev(`+A(doc.querySelector('wg[rk-dy]'),'rk-dy')`)===dv,'Auto Layout を繰り返しても rk-dy は '+dv+' のまま');
// ---- Reset keeps rk-dy ----
await pg.click('#zf');const wi0=await ev(`words.findIndex((w,i)=>i>5)`);const wg0=await ev(`(()=>{const w=words[5];const g=w.g.getBoundingClientRect();return[g.x+g.width/2,g.y+g.height/2]})()`);await pg.mouse.move(wg0[0],wg0[1]);await pg.mouse.down();await pg.mouse.move(wg0[0]+30,wg0[1]+10,{steps:3});await pg.mouse.up();
ok(await ev(`doc.querySelectorAll('[rk-x]').length`)>=1,'語のドラッグ（レイアウト編集）は従来どおり手動配置になる');
await pg.click('#rs');ok((await ev(`doc.querySelectorAll('[rk-x]').length`))===0&&(await ev(`doc.querySelectorAll('wg[rk-dy]').length`))===1,'手動配置リセット: rk-x/rk-y だけが消え、rk-dy は残る（既存のResetの意味は不変）');
// ---- release button ----
const sBefore=await ev('ser()');await pg.click('#gx');ok((await ev(`doc.querySelectorAll('wg[rk-dy]').length`))===0&&/解除/.test(await ev(`$('#st').textContent`)),'解除ボタン: rk-dy がすべて消える');
const relPos=toObj(await posMap());ok(Object.keys(base).every(id=>relPos[id].y===base[id].y),'解除後: グループは通常の自動配置（移動前の座標）に戻る');
await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control');ok(await ev('ser()')===sBefore,'解除のUndo: 解除前に完全復元');await pg.keyboard.down('Control');await pg.keyboard.press('KeyY');await pg.keyboard.up('Control');ok((await ev(`doc.querySelectorAll('wg[rk-dy]').length`))===0,'解除のRedo: 再び解除');
await pg.click('#gx');ok(/解除するグループ移動はありません/.test(await ev(`$('#st').textContent`)),'解除対象がないとき: 何もせず案内を表示');
// ---- mod line drag (target is a wg) ----
await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control');await pg.keyboard.down('Control');await pg.keyboard.press('KeyZ');await pg.keyboard.up('Control');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,600));process.exit(1)});
