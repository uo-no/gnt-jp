const chromium=require('@sparticuz/chromium').default||require('@sparticuz/chromium');const p=require('puppeteer-core');
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};const dir='/home/claude/lf/lowfat/';
const T=`(async()=>{const R=[];const ck=(c,m)=>R.push([!!c,m]);
 const isCl=k=>k.tagName==='w'?A(k,'class')==='conj':(A(k,'class')==='cl'||A(k,'type')==='group'||/Conj/.test(A(k,'rule')||''));
 const load=si=>{doc=parse(BOOK.sents[si].xml);tag(null);layout()};
 const pos=()=>{const m=new Map();words.forEach(w=>m.set(w.el,{x:w.x,y:w.y,ay:w.ay,man:w.manual}));return m};
 const wof=g=>[...g.getElementsByTagName('w')];
 const delta=(a,b)=>{const o=new Map();for(const [el,pa] of a){const pb=b.get(el);o.set(el,{dx:pb.x-pa.x,dy:pb.y-pa.y})}return o};
 const allDx0=d=>[...d.values()].every(v=>v.dx===0);
 const changed=d=>[...d.entries()].filter(([e,v])=>v.dy!==0);
 const pick=(pred,from)=>{for(let si=from;si<BOOK.sents.length;si++){load(si);const r=pred(si);if(r)return {si,...r}}return null};
 // ===== 1. stack chain =====
 const S1=pick(si=>{const n=[...doc.getElementsByTagName('wg')].find(n=>{const ks=kids(n);return !ks.some(k=>SLOT[A(k,'role')])&&ks.some(k=>k.tagName==='wg')&&ks.every(isCl)&&ks.filter(k=>k.tagName==='wg').length>=3&&n.tagName!=='sentence'});return n?{n}:null},0);
 if(!S1){ck(false,'stack候補なし')}else{const Gs=kids(S1.n).filter(k=>k.tagName==='wg');const [G1,G2,G3]=Gs;const base=pos();const ids=Gs.map(g=>new Set(wof(g)));
  const run=(sets)=>{doc.querySelectorAll('wg[rk-dy]').forEach(g=>g.removeAttribute('rk-dy'));for(const [g,v] of sets)g.setAttribute('rk-dy',v);layout();return delta(base,pos())};
  let d=run([[G1,100]]);ck(allDx0(d),'stack(a): x は全語で不変');
  ck(wof(G1).every(w=>d.get(w).dy===100)&&Gs.slice(1).every(g=>wof(g).every(w=>d.get(w).dy===100)),'stack(a): G1を+100 → G1と後続のG2…G'+Gs.length+'の全語がちょうど+100（連鎖して押し下げ・相対配置維持）');
  ck(changed(d).every(([e,v])=>v.dy===100),'stack(a): 動いた語はすべて+100のみ（余分な移動なし。親の後続の兄弟へ伝わる分も同量）');
  const first=[...doc.getElementsByTagName('w')].indexOf(wof(G1)[0]);const before=[...d.entries()].filter(([e,v])=>[...doc.getElementsByTagName('w')].indexOf(e)<first-1);ck(before.every(([e,v])=>v.dy===0),'stack(a): G1より前の語は動かない');
  d=run([[G2,-50]]);ck([...d.values()].every(v=>v.dy===0&&v.dx===0),'stack(b): G2を上へ-50 → 直前のG1と重ならないようクランプされ、配置は不変');
  d=run([[G1,50],[G2,80]]);ck(wof(G1).every(w=>d.get(w).dy===50)&&wof(G2).every(w=>d.get(w).dy===80)&&wof(G3).every(w=>d.get(w).dy===80),'stack(c): G1+50, G2+80 → G1は+50、G2は+80（50+80=130 ではない＝二重適用なし）、G3は+80（連鎖）');
  d=run([[G2,80]]);ck(wof(G1).every(w=>d.get(w).dy===0)&&wof(G2).every(w=>d.get(w).dy===80)&&wof(G3).every(w=>d.get(w).dy===80),'stack(d): G2だけ+80 → G1不変、G2・G3は+80');
  d=run([[G1,40],[G3,10]]);ck(wof(G1).every(w=>d.get(w).dy===40)&&wof(G3).every(w=>d.get(w).dy===40),'stack(e): G1+40, G3+10 → G3は押し下げ(+40)の方が大きいので+10は効かない（必要な分だけ）');
  // idempotence: repeated layout / refresh does not accumulate
  const p1=pos();layout();layout();const p2=pos();ck([...p1.keys()].every(e=>p1.get(e).y===p2.get(e).y&&p1.get(e).x===p2.get(e).x),'冪等性: 同じrk-dyで再配置を繰り返しても座標が累積しない');
  doc.querySelectorAll('wg[rk-dy]').forEach(g=>g.removeAttribute('rk-dy'));layout();ck(allDx0(delta(base,pos()))&&changed(delta(base,pos())).length===0,'rk-dy を外すと元の配置に戻る');
  ck(true,'  (使用した文: '+BOOK.sents[S1.si].info.short+', 項目'+Gs.length+')')}
 // ===== 2. mods list =====
 const M2=pick(si=>{const by=new Map();edges.filter(e=>e.kind==='mod'&&e.grp).forEach(e=>{if(!by.has(e.a))by.set(e.a,[]);by.get(e.a).push(e.grp)});for(const [h,gs] of by){if(gs.length>=3&&gs.every(g=>g.parentNode===gs[0].parentNode))return{h,gs}}return null},0);
 if(!M2){ck(false,'mods候補なし')}else{const [A1,A2,A3]=M2.gs;const base=pos();const run=sets=>{doc.querySelectorAll('wg[rk-dy]').forEach(g=>g.removeAttribute('rk-dy'));for(const [g,v] of sets)g.setAttribute('rk-dy',v);layout();return delta(base,pos())};
  const d=run([[A2,60]]);const hd=[M2.h.el];ck(allDx0(d),'mods: x は全語で不変');ck(d.get(M2.h.el).dy===0&&wof(A1).every(w=>d.get(w).dy===0),'mods: 頭語と前のグループ(1つ目)は動かない');
  ck(wof(A2).every(w=>d.get(w).dy===60)&&wof(A3).every(w=>d.get(w).dy===60)&&changed(d).every(([e,v])=>v.dy===60),'mods: 2つ目を+60 → 2つ目・3つ目…が+60で連鎖、動いた語はすべて+60のみ');
  ck(true,'  (使用した文: '+BOOK.sents[M2.si].info.short+', 修飾グループ'+M2.gs.length+')')}
 // ===== 3. nested: parent offset and child offset are not applied twice =====
 const N3=pick(si=>{const by=new Map();edges.filter(e=>e.kind==='mod'&&e.grp).forEach(e=>{if(!by.has(e.a))by.set(e.a,[]);by.get(e.a).push(e.grp)});for(const [h,gs] of by){if(!gs.every(g=>g.parentNode===gs[0].parentNode))continue;for(const P of gs){const inner=[...by.entries()].filter(([h2,g2])=>P.contains(h2.el)&&g2.length>=2&&g2.every(g=>g.parentNode===g2[0].parentNode));if(inner.length)return{h,gs,P,C:inner[0][1]}}}return null},0);
 if(!N3){ck(false,'nested候補なし')}else{const base=pos();const C1=N3.C[0],C2=N3.C[1];doc.querySelectorAll('wg[rk-dy]').forEach(g=>g.removeAttribute('rk-dy'));N3.P.setAttribute('rk-dy',40);C2.setAttribute('rk-dy',30);layout();const d=delta(base,pos());
  ck(wof(C1).every(w=>d.get(w).dy===40),'入れ子: 親+40 のとき、子の1つ目は+40（親の分のみ）');ck(wof(C2).every(w=>d.get(w).dy===70),'入れ子: 親+40・子(2つ目)+30 → 子は+70（40+30。親の分が二重に加算されない）');
  const pi=N3.gs.indexOf(N3.P);if(pi>=0&&pi+1<N3.gs.length){const nx=N3.gs[pi+1];ck(wof(nx).every(w=>d.get(w).dy===70),'入れ子: 親の次の兄弟は+70（親+40 と、親が子の押し下げで伸びた30）')}
  ck(true,'  (使用した文: '+BOOK.sents[N3.si].info.short+')')}
 // ===== 4. horizontal columns are not moved =====
 const H4=pick(si=>{for(const n of doc.getElementsByTagName('wg')){const ks=kids(n);const slots=ks.filter(k=>SLOT[A(k,'role')]);if(slots.length<2)continue;for(const K of slots){if(K.tagName!=='wg')continue;const gs=edges.filter(e=>e.kind==='mod'&&e.grp&&K.contains(e.grp)&&e.grp!==K);if(gs.length>=2){const by=new Map();gs.forEach(e=>{if(!by.has(e.a))by.set(e.a,[]);by.get(e.a).push(e.grp)});for(const [h,g] of by)if(g.length>=2&&g.every(x=>x.parentNode===g[0].parentNode))return{n,K,slots,g}}}}return null},0);
 if(!H4){ck(false,'columns候補なし')}else{const base=pos();doc.querySelectorAll('wg[rk-dy]').forEach(g=>g.removeAttribute('rk-dy'));H4.g[1].setAttribute('rk-dy',90);layout();const d=delta(base,pos());const others=H4.slots.filter(k=>k!==H4.K);
  ck(others.every(k=>wof(k).every(w=>d.get(w).dy===0&&d.get(w).dx===0)),'列: 同じ節の別スロット（主語・動詞・目的語など横並び）の語は一切動かない');ck(allDx0(d),'列: x は全語で不変');
  ck(changed(d).length>0,'列: 対象スロット内の語は動いた（'+changed(d).length+'語）');ck(true,'  (使用した文: '+BOOK.sents[H4.si].info.short+')')}
 // ===== 5. manual words follow (no double application) =====
 const S5=pick(si=>{const n=[...doc.getElementsByTagName('wg')].find(n=>{const ks=kids(n);return !ks.some(k=>SLOT[A(k,'role')])&&ks.every(isCl)&&ks.filter(k=>k.tagName==='wg').length>=3&&n.tagName!=='sentence'});if(!n)return null;const Gs=kids(n).filter(k=>k.tagName==='wg');return Gs.every(g=>wof(g).length>=2)?{Gs}:null},0);
 if(!S5){ck(false,'manual候補なし')}else{const [G0,G1,G2]=S5.Gs;const mw=g=>{const w=words.find(x=>x.el===wof(g)[wof(g).length-1]);return w};
  const manualize=(g,dy)=>{const w=mw(g);w.el.setAttribute('rk-x',String(Math.round(w.x+3)));w.el.setAttribute('rk-y',String(Math.round(w.y+dy)))};
  manualize(G0,5);manualize(G1,7);manualize(G2,9);layout();const before=new Map(words.filter(w=>w.manual).map(w=>[w.el,{x:w.x,y:w.y,rel:w.y-w.ay}]));
  const ays=new Map(words.map(w=>[w.el,w.ay]));const targetY=GM.get(G1).py+100;const dd=groupDyFor(G1,targetY);ck(dd===100,'手動: groupDyFor(目標=現在位置+100) = '+dd+'（期待100）');
  applyGroupDy(G1,dd);const after=new Map(words.filter(w=>w.manual).map(w=>[w.el,{x:w.x,y:w.y,rel:w.y-w.ay}]));
  const e0=wof(G0).at(-1),e1=wof(G1).at(-1),e2=wof(G2).at(-1);
  ck(after.get(e0).y===before.get(e0).y,'手動: 前のグループ内の手動語は動かない');ck(after.get(e1).y===before.get(e1).y+100,'手動: 移動したグループ内の手動語は +100（自動配置語と同量）');ck(after.get(e2).y===before.get(e2).y+100,'手動: 押し下げられた後続グループ内の手動語も +100');
  ck([e0,e1,e2].every(e=>after.get(e).x===before.get(e).x),'手動: x座標は不変');ck([e0,e1,e2].every(e=>after.get(e).rel===before.get(e).rel),'手動: 自動配置位置との相対関係（語同士の相対位置）が維持される');
  const tw=words.map(w=>w.y).join();layout();layout();ck(words.map(w=>w.y).join()===tw,'手動: 再配置を繰り返しても二重適用されない');
  // clearing: manual words return with their group
  const nclr=clearAllGroupDy();const back=new Map(words.filter(w=>w.manual).map(w=>[w.el,w.y]));ck(nclr===1&&[e0,e1,e2].every(e=>back.get(e)===before.get(e).y),'手動: グループ移動の解除で、手動語も元の位置へ戻る（無関係な手動語は動かない）')}
 return R})()`;
(async()=>{const b=await p.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1280,height:800}});const errs=[];
const pg=await b.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));await pg.goto('file:///mnt/user-data/outputs/rk-diagram-m3.html');
await(await pg.$('#fi')).uploadFile(dir+'07-1corinthians.xml');await pg.waitForFunction("BOOK&&BOOK.sents.length>400");
const R=await pg.evaluate(T);R.forEach(([c,m])=>ok(c,m));console.log('errors',errs.length,errs);ok(errs.length===0,'console error 0');await b.close();process.exit(0)})().catch(e=>{console.log('ERR',e.stack.slice(0,500));process.exit(1)});
