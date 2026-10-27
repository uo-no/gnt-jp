const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/home/claude/lf/lowfat/';
const PROP=`(books)=>{const R={sent:0,trials:0,fail:[],newCross:0,crossBase:0,maxPush:0,overlapFail:0,xFail:0,groupFail:0,boundFail:0,empty:0};
 const rect=w=>({l:w.x-3,r:w.x+w.w+3,t:w.y-22,b:w.y+8});
 const ovl=()=>{let n=0;for(let a=0;a<words.length;a++)for(let c=a+1;c<words.length;c++){const p=rect(words[a]),q=rect(words[c]);if(p.l<q.r&&q.l<p.r&&p.t<q.b&&q.t<p.b)n++}return n};
 const seg=(x1,y1,x2,y2,q)=>{let t0=0,t1=1;const dx=x2-x1,dy=y2-y1;const P=[-dx,dx,-dy,dy],Q=[x1-q.l,q.r-x1,y1-q.t,q.b-y1];for(let i=0;i<4;i++){if(P[i]===0){if(Q[i]<0)return false}else{const t=Q[i]/P[i];if(P[i]<0){if(t>t1)return false;if(t>t0)t0=t}else{if(t<t0)return false;if(t<t1)t1=t}}}return t1-t0>1e-9};
 const cross=()=>{let n=0;for(const ed of edges){if(ed.kind==='dash')continue;const A_=ed.a,B_=ed.b;let x1,y1,x2,y2;if(ed.kind==='mod'){x1=A_.x+Math.min(14,A_.w);y1=A_.y+4;x2=B_.x-PADX;y2=B_.y+4}else{x1=A_.x+A_.w+4;y1=A_.y+4;x2=B_.x-4;y2=B_.y+4}for(const o of words){if(o===A_||o===B_)continue;if(seg(x1,y1,x2,y2,rect(o)))n++}}return n};
 let seed=11;const rnd=m=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed%m};
 for(const si of books){doc=parse(BOOK.sents[si].xml);tag(null);layout();R.sent++;const gs=[...GM.keys()];if(!gs.length)continue;
  const base=new Map(words.map(w=>[w.el,{x:w.x,y:w.y}]));const o0=ovl(),c0=cross();R.crossBase+=c0;
  const picks=[];for(let k=0;k<Math.min(4,gs.length);k++)picks.push(gs[rnd(gs.length)]);
  for(const g of picks){for(const d of [18,72,180]){R.trials++;doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'));g.setAttribute('rk-dy',String(d));layout();
   const gm=GM.get(g);const inG=new Set([...g.getElementsByTagName('w')]);let bad='';
   if(ovl()>o0){R.overlapFail++;bad+='重なり増 '}
   let maxd=0;for(const w of words){const b=base.get(w.el);if(w.x!==b.x){R.xFail++;bad+='x ';break}}
   const gwords=words.filter(w=>inG.has(w.el));const eff=gwords.length?Math.round(gwords[0].y-base.get(gwords[0].el).y):0;
   if(!gwords.every(w=>Math.round(w.y-base.get(w.el).y)===eff)){R.groupFail++;bad+='グループ内の相対配置 '}
   if(eff<0||eff>d){R.boundFail++;bad+='移動量範囲 '}
   for(const w of words){if(inG.has(w.el))continue;const dd=Math.round(w.y-base.get(w.el).y);if(dd<0||dd>eff+1e-9&&dd>d){R.boundFail++;bad+='押し下げ量範囲 ';break}if(dd>R.maxPush)R.maxPush=dd}
   R.newCross+=Math.max(0,cross()-c0);
   if(bad&&R.fail.length<5)R.fail.push(BOOK.sents[si].info.short+' '+bad+'(d='+d+')')}}
  doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'))}
 return R}`;
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');
await(await pg.$('#fi')).uploadFile(dir+'07-1corinthians.xml');await pg.waitForFunction("BOOK&&BOOK.sents.length>400");
const idx=Array.from({length:524},(_,i)=>i).filter(i=>i%2===0);const R=await pg.evaluate(`(${PROP})(${JSON.stringify(idx)})`);
console.log('1 Corinthians 偶数番目の',R.sent,'文 × ランダム4グループ × オフセット{18,72,180}:',R.trials,'試行');
ok(R.overlapFail===0,'語の重なり: 全試行で増えない（'+R.overlapFail+'件）');ok(R.xFail===0,'水平座標: 全試行で不変（'+R.xFail+'件）');ok(R.groupFail===0,'グループ内の相対配置: 全試行で維持（'+R.groupFail+'件）');ok(R.boundFail===0,'移動量・押し下げ量が 0〜d の範囲（'+R.boundFail+'件）。最大押し下げ '+R.maxPush+'px');
console.log('  (参考) 線×語の交差: 基準 '+R.crossBase+' / 試行で新たに増えた交差の延べ '+R.newCross+' 件（移動で線が長くなるため。仕様上の要件外・情報として記録）');if(R.fail.length)console.log(R.fail);
// Luke: genealogy (hgt / hoist) interplay + drag performance
await(await pg.$('#fi')).uploadFile(dir+'03-luke.xml');await pg.waitForFunction("BOOK&&BOOK.name==='Luke'");await pg.evaluate('go(119)');await new Promise(r=>setTimeout(r,400));
const L=await pg.evaluate(`(()=>{const rect=w=>({l:w.x-3,r:w.x+w.w+3,t:w.y-22,b:w.y+8});const ovl=()=>{let n=0;for(let a=0;a<words.length;a++)for(let c=a+1;c<words.length;c++){const p=rect(words[a]),q=rect(words[c]);if(p.l<q.r&&q.l<p.r&&p.t<q.b&&q.t<p.b)n++}return n};
 const base=new Map(words.map(w=>[w.el,{x:w.x,y:w.y}]));const o0=ovl();const gs=[...GM.keys()];const res=[];
 // dets near their names before / after (hoist decisions use nominal heights and must not flip)
 const names=words.filter(w=>A(w.el,'class')==='noun'&&A(w.el.parentNode,'rule')==='Np-Appos');const mo=new Map();edges.filter(e=>e.kind==='mod').forEach(e=>{if(!mo.has(e.a))mo.set(e.a,[]);mo.get(e.a).push(e.b)});
 const detGap=()=>names.slice(0,60).map(X=>{const d=(mo.get(X)||[]).find(b=>A(b.el,'class')==='det');return d?Math.round(d.y-X.y):null}).join(',');const g0=detGap();
 for(const k of [30,70,110]){const g=gs[Math.min(k,gs.length-1)];document.createElement('x');doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'));g.setAttribute('rk-dy','180');layout();
  const inG=new Set([...g.getElementsByTagName('w')]);const gw=words.filter(w=>inG.has(w.el));const eff=gw.length?Math.round(gw[0].y-base.get(gw[0].el).y):0;
  res.push({k,words:gw.length,eff,overlap:ovl()-o0,xOk:words.every(w=>w.x===base.get(w.el).x),groupOk:gw.every(w=>Math.round(w.y-base.get(w.el).y)===eff),maxDelta:Math.max(...words.map(w=>Math.round(w.y-base.get(w.el).y))),minDelta:Math.min(...words.map(w=>Math.round(w.y-base.get(w.el).y)))})}
 doc.querySelectorAll('wg[rk-dy]').forEach(x=>x.removeAttribute('rk-dy'));layout();return{res,detGapUnchanged:detGap()===g0,groups:gs.length}})()`);
console.log('Luke 3:23–38（165語、グループ'+L.groups+'個）:',JSON.stringify(L.res));
ok(L.res.every(r=>r.overlap===0&&r.xOk&&r.groupOk&&r.minDelta>=0&&r.maxDelta<=180),'Luke: 系譜チェーン内のグループを+180 → 語の重なり0・x不変・グループ内相対配置維持・押し下げ量は0〜180');
ok(L.detGapUnchanged,'Luke: オフセットを外すと、系譜の τοῦ と人名の距離（hgt に基づく配置決定）が元どおり（hgt はオフセットを含まない通常高さで判定するため、配置決定が揺れない）');
console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,600));process.exit(1)});
