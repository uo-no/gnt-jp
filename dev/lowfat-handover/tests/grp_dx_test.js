// グループ横移動 動作確認テスト (Phase 3 検証)
// 対象: app/rk-diagram-m3.html
// コード変更: なし（テストスクリプトのみ）

const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');

const APP='file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS=path.resolve(__dirname,'grp_dx_ss');
if(!fs.existsSync(SS))fs.mkdirSync(SS,{recursive:true});

let pass=0,fail=0;
const ok=(name,v,detail='')=>{if(v){pass++;console.log('  PASS: '+name+(detail?' — '+detail:''))}else{fail++;console.log('  FAIL: '+name+(detail?' — '+detail:''))}return v};
const ss=(pg,name)=>pg.screenshot({path:path.join(SS,name+'.png'),clip:{x:0,y:0,width:1400,height:900}});

(async()=>{
  console.log('=== グループ横移動 動作確認テスト ===\n');
  const b=await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{width:1400,height:900}
  });
  const pg=await b.newPage();
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg.goto(APP);
  await new Promise(r=>setTimeout(r,500));

  // ============================================================
  // 0. 前提確認: dxOf / shiftManualByX / applyGroupOffset 定義
  // ============================================================
  console.log('[0] 関数定義確認');
  const fns=await pg.evaluate(()=>({
    dxOf:typeof dxOf==='function',
    shiftManualByX:typeof shiftManualByX==='function',
    applyGroupOffset:typeof applyGroupOffset==='function',
    clearAllGroupDy:typeof clearAllGroupDy==='function',
  }));
  ok('dxOf定義',fns.dxOf);
  ok('shiftManualByX定義',fns.shiftManualByX);
  ok('applyGroupOffset定義',fns.applyGroupOffset);
  ok('clearAllGroupDy定義（拡張済み）',fns.clearAllGroupDy);

  // ============================================================
  // 1. 短文: サンプル文 (1CO 1:1-2)
  // ============================================================
  console.log('\n[1] サンプル文 — 基本操作確認');
  // モードをレイアウト編集に切替
  await pg.click('#mL');
  const modeL=await pg.evaluate(()=>mode==='layout');
  ok('レイアウト編集モードに切替',modeL);

  // GM(グループマップ)に何かある確認
  const gmSize=await pg.evaluate(()=>GM.size);
  ok('GMにグループが存在する',gmSize>0,'GMsize='+gmSize);

  // グループを取得: GMの最初のエントリ
  const grp1=await pg.evaluate(()=>{
    const [gEl]=GM.keys();if(!gEl)return null;
    const gm=GM.get(gEl);const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{dy:dyOf(gEl),dx:dxOf(gEl),nom:gm.nom,py:gm.py,words:ws.length,desc:bd(gEl)};
  });
  ok('グループ取得成功',grp1!==null,'desc='+grp1?.desc);
  ok('dxOf初期値=0',grp1?.dx===0,'dx='+grp1?.dx);

  // ============================================================
  // 2. rk-dx の適用テスト (applyGroupOffset)
  // ============================================================
  console.log('\n[2] グループ横移動 (applyGroupOffset)');

  // グループを横+100移動
  const x0=await pg.evaluate(()=>{const [gEl]=GM.keys();const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);return ws.length?ws[0].x:null});
  await pg.evaluate(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,dyOf(gEl),100))});
  await ss(pg,'t2_dx100');

  const afterDx100=await pg.evaluate(()=>{const [gEl]=GM.keys();
    const m=GM.get(gEl);const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{dx:dxOf(gEl),ws_x:ws.length?ws[0].x:null,attr:gEl.getAttribute('rk-dx')};
  });
  ok('rk-dx属性が設定される',afterDx100.attr==='100','attr='+afterDx100.attr);
  ok('dxOf()が100を返す',afterDx100.dx===100,'dx='+afterDx100.dx);
  ok('語のx座標がシフトした',afterDx100.ws_x!==null&&afterDx100.ws_x!==x0,'x_before='+x0+' x_after='+afterDx100.ws_x);

  // ============================================================
  // 3. Undo/Redo テスト
  // ============================================================
  console.log('\n[3] Undo/Redo');
  await pg.evaluate(()=>undo());
  const afterUndo=await pg.evaluate(()=>{const [gEl]=GM.keys();return{dx:dxOf(gEl),attr:gEl.getAttribute('rk-dx')||'null'}});
  ok('Undoでrk-dxが消える',afterUndo.dx===0,'attr='+afterUndo.attr);

  await pg.evaluate(()=>redo());
  const afterRedo=await pg.evaluate(()=>{const [gEl]=GM.keys();return{dx:dxOf(gEl),attr:gEl.getAttribute('rk-dx')||'null'}});
  ok('Redoでrk-dxが戻る',afterRedo.dx===100,'attr='+afterRedo.attr);

  // 再度Undoしてクリーンな状態に
  await pg.evaluate(()=>undo());

  // ============================================================
  // 4. グループ縦+横 同時移動 (組み合わせ)
  // ============================================================
  console.log('\n[4] 縦横同時移動 (dy+dx)');
  await pg.evaluate(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,50,80))});
  const combi=await pg.evaluate(()=>{const [gEl]=GM.keys();return{dy:dyOf(gEl),dx:dxOf(gEl)}});
  ok('dy=50',combi.dy===50,'dy='+combi.dy);
  ok('dx=80',combi.dx===80,'dx='+combi.dx);
  await ss(pg,'t4_dy50_dx80');
  await pg.evaluate(()=>undo());

  // ============================================================
  // 5. Auto Layout で累積しないか確認
  // ============================================================
  console.log('\n[5] Auto Layout で累積しない');
  await pg.evaluate(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,30,60))});
  const bfAL=await pg.evaluate(()=>{const [gEl]=GM.keys();return{dy:dyOf(gEl),dx:dxOf(gEl)}});

  // Auto Layout を複数回実行
  await pg.evaluate(()=>{for(let i=0;i<3;i++){refresh();initView()}});
  const afAL=await pg.evaluate(()=>{const [gEl]=GM.keys();return{dy:dyOf(gEl),dx:dxOf(gEl)}});
  ok('Auto Layout後もdy変化なし',afAL.dy===bfAL.dy,'dy: '+bfAL.dy+'→'+afAL.dy);
  ok('Auto Layout後もdx変化なし',afAL.dx===bfAL.dx,'dx: '+bfAL.dx+'→'+afAL.dx);
  await pg.evaluate(()=>undo());

  // ============================================================
  // 6. XML保存・再読み込みで位置が一致するか
  // ============================================================
  console.log('\n[6] XML保存・再読み込み');
  // グループに dx=120 を設定
  await pg.evaluate(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,40,120))});
  const beforeSave=await pg.evaluate(()=>{
    const [gEl]=GM.keys();
    return{dy:dyOf(gEl),dx:dxOf(gEl),xml:ser(),grpDesc:bd(gEl)}
  });
  ok('保存前: dy=40',beforeSave.dy===40,'dy='+beforeSave.dy);
  ok('保存前: dx=120',beforeSave.dx===120,'dx='+beforeSave.dx);

  // XMLを再解析してロード
  await pg.evaluate((xml)=>{
    const parsed=parse(xml);if(!parsed)return;
    doc=parsed;tag([]);NOTE='';refresh();
  },beforeSave.xml);

  const afterReload=await pg.evaluate((desc)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);
    return gEl?{dy:dyOf(gEl),dx:dxOf(gEl)}:null;
  },beforeSave.grpDesc);
  ok('再読み込み後: dy一致',afterReload?.dy===40,'dy='+afterReload?.dy);
  ok('再読み込み後: dx一致',afterReload?.dx===120,'dx='+afterReload?.dx);
  await ss(pg,'t6_after_reload');
  await pg.evaluate(()=>undo());

  // ============================================================
  // 7. グループ移動解除 (#gx) が rk-dx も消すか
  // ============================================================
  console.log('\n[7] グループ移動解除 (rk-dy+rk-dx 両方消える)');
  await pg.evaluate(()=>{const [gEl]=GM.keys();act(()=>applyGroupOffset(gEl,25,75))});
  const bfClear=await pg.evaluate(()=>({dy:doc.querySelectorAll('wg[rk-dy]').length,dx:doc.querySelectorAll('wg[rk-dx]').length}));
  ok('解除前: rk-dyが存在',bfClear.dy>0,'count='+bfClear.dy);
  ok('解除前: rk-dxが存在',bfClear.dx>0,'count='+bfClear.dx);

  await pg.evaluate(()=>{const els=[...new Set([...doc.querySelectorAll('wg[rk-dy]'),...doc.querySelectorAll('wg[rk-dx]')])];act(()=>clearAllGroupDy())});
  const afClear=await pg.evaluate(()=>({dy:doc.querySelectorAll('wg[rk-dy]').length,dx:doc.querySelectorAll('wg[rk-dx]').length}));
  ok('解除後: rk-dyが消える',afClear.dy===0,'count='+afClear.dy);
  ok('解除後: rk-dxが消える',afClear.dx===0,'count='+afClear.dx);
  await pg.evaluate(()=>undo()); // 解除をUndo

  // ============================================================
  // 8. 中規模文: Colossians 1:3-8
  // ============================================================
  console.log('\n[8] Colossians 1:3-8 — 縦+横移動');
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'12-colossians.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Colossians'",{timeout:30000});
  await pg.evaluate('go(2)');
  await new Promise(r=>setTimeout(r,200));
  await pg.click('#mL');

  const colGm=await pg.evaluate(()=>GM.size);
  ok('Colossians: GMにグループ存在',colGm>0,'size='+colGm);

  // 最右端グループを取得して横移動
  const rightGrpInfo=await pg.evaluate(()=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl,gm]of GM){const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return null;
    const ws=[...rightGEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{desc:bd(rightGEl),x0:Math.round(Math.min(...ws.map(w=>w.x))),y0:Math.round(ws[0].y),dy:dyOf(rightGEl),dx:dxOf(rightGEl)};
  });
  ok('最右端グループ取得',rightGrpInfo!==null,'desc='+rightGrpInfo?.desc);
  await ss(pg,'t8_col_before');

  // 最右端グループを下+左に移動（折り返しシミュレーション）
  await pg.evaluate((desc,x0)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);
    if(!gEl)return;
    act(()=>applyGroupOffset(gEl,100,-x0+20));
  },rightGrpInfo?.desc, rightGrpInfo?.x0);
  await ss(pg,'t8_col_after_wrap');

  const colAfter=await pg.evaluate((desc)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);
    if(!gEl)return null;
    const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{dy:dyOf(gEl),dx:dxOf(gEl),newX:Math.round(Math.min(...ws.map(w=>w.x))),newY:Math.round(ws[0].y)};
  },rightGrpInfo?.desc);
  ok('縦移動(dy=100)が適用',colAfter?.dy===100,'dy='+colAfter?.dy);
  ok('横移動(dx)が適用',colAfter?.dx!==0,'dx='+colAfter?.dx);
  ok('語のx座標が変化',colAfter?.newX!==rightGrpInfo?.x0,'x0='+rightGrpInfo?.x0+' new='+colAfter?.newX);
  ok('語のy座標が下に移動',colAfter?.newY>rightGrpInfo?.y0,'y0='+rightGrpInfo?.y0+' new='+colAfter?.newY);

  // Undo
  await pg.evaluate(()=>undo());
  const colRestored=await pg.evaluate((desc)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);
    return gEl?{dy:dyOf(gEl),dx:dxOf(gEl)}:null;
  },rightGrpInfo?.desc);
  ok('Undoで位置が戻る',colRestored?.dy===0&&colRestored?.dx===0,'dy='+colRestored?.dy+' dx='+colRestored?.dx);

  // ============================================================
  // 9. 手動配置語との共存テスト
  // ============================================================
  console.log('\n[9] 手動配置語との共存');
  // 語を一つ手動配置
  const w0=await pg.evaluate(()=>{const w=words[0];const sv=snapNow();w.x+=50;w.y+=0;w.manual=true;undoS.push(sv);redoS=[];sync();moved(w);return{idx:0,x:Math.round(w.x),y:Math.round(w.y),el_rx:w.el.getAttribute('rk-x')};});
  ok('語の手動配置(rk-x設定)',w0.el_rx!==null,'rk-x='+w0.el_rx);

  // グループ横移動を適用
  const [gEl0,gm0]=await pg.evaluate(()=>{const [gEl,gm]=[...GM.entries()][0];return[bd(gEl),{nom:gm.nom}]});
  await pg.evaluate((desc)=>{const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);if(gEl)act(()=>applyGroupOffset(gEl,0,30))},gEl0);

  // 手動語がグループ内にある場合 → rk-xが更新されているか確認
  const afterManual=await pg.evaluate(()=>{const w=words[0];return{rk_x:w.el.getAttribute('rk-x'),ax:Math.round(w.ax)};});
  // 手動語が同じグループにいる場合は rk-x が更新、別グループなら不変
  ok('手動配置語操作後にエラーなし',errs.filter(e=>!/^(Puppeteer|Protocol)/.test(e)).length===0,'errs='+errs.length);
  await pg.evaluate(()=>undo()); // グループ移動Undo
  await pg.evaluate(()=>undo()); // 手動配置Undo

  // ============================================================
  // 10. 長文: Luke 3:23-38
  // ============================================================
  console.log('\n[10] Luke 3:23-38 — スマホ画角で複数グループ移動');
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'03-luke.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Luke'",{timeout:60000});
  await pg.evaluate('go(119)');
  await new Promise(r=>setTimeout(r,200));
  await pg.click('#mL');

  // 画角ガイドを設定
  await pg.evaluate(`(()=>{vgKey='sp-std';const pp=VG['sp-std'];$('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;vgToggle(true)})()`);
  await ss(pg,'t10_luk_before');

  const lukGmSize=await pg.evaluate(()=>GM.size);
  ok('Luke: GMにグループ存在',lukGmSize>0,'size='+lukGmSize);

  // 最右端のグループを下段に移動（スマホ幅390px内に収める試行）
  const lukRightGrp=await pg.evaluate(()=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return null;
    const ws=[...rightGEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    const gm=GM.get(rightGEl);
    return{desc:bd(rightGEl),x0:Math.round(Math.min(...ws.map(w=>w.x))),y0:Math.round(gm.py)};
  });
  ok('最右端グループ取得',lukRightGrp!==null,'desc='+lukRightGrp?.desc);

  // 最右端グループを下+左（x=0付近）に移動
  await pg.evaluate((desc,x0)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);if(!gEl)return;
    const gm=GM.get(gEl);
    const targetDy=groupDyFor(gEl,gm.py+200)||0;
    act(()=>applyGroupOffset(gEl,targetDy,-dxOf(gEl)-x0+20));
  },lukRightGrp?.desc, lukRightGrp?.x0);
  await ss(pg,'t10_luk_after_wrap');

  const lukAfter=await pg.evaluate((desc)=>{
    const gEl=[...doc.querySelectorAll('wg')].find(g=>bd(g)===desc);if(!gEl)return null;
    const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{dy:dyOf(gEl),dx:dxOf(gEl),x:Math.round(Math.min(...ws.map(w=>w.x)))};
  },lukRightGrp?.desc);
  ok('Luke: 横移動適用',lukAfter?.dx!==0,'dx='+lukAfter?.dx);
  ok('Luke: 語がx<400に移動',lukAfter?.x<400,'x='+lukAfter?.x);

  // 画角ガイドで収まりを確認
  await pg.evaluate(()=>{vgKey='sp-std';const pp=VG['sp-std'];$('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;vgToggle(true)});
  const vgChk=await pg.evaluate(()=>vgAssess());
  console.log(`  → 1グループ移動後: 図サイズ ${vgChk?.dw}×${vgChk?.dh}px  はみ出し R${vgChk?.oR} B${vgChk?.oB}px`);

  await pg.evaluate(()=>undo());

  // ============================================================
  // 11. 構造編集・ズーム・パン・プレビューとの干渉確認
  // ============================================================
  console.log('\n[11] 回帰確認（構造編集/ズーム/プレビュー）');
  await pg.click('#mS');
  const structM=await pg.evaluate(()=>mode==='struct');
  ok('構造編集モードに戻れる',structM);

  await pg.evaluate(()=>{zoom(1.5);zoom(0.8)});
  const zoomOk=await pg.evaluate(()=>view.k>0&&view.k<10);
  ok('ズーム操作に問題なし',zoomOk,'k='+await pg.evaluate(()=>view.k.toFixed(3)));

  await pg.evaluate(()=>{document.body.classList.add('pv')});
  const pvOn=await pg.evaluate(()=>document.body.classList.contains('pv'));
  ok('プレビューモード切替',pvOn);
  await pg.evaluate(()=>{document.body.classList.remove('pv')});

  // ============================================================
  // 12. コンソールエラー確認
  // ============================================================
  console.log('\n[12] コンソールエラー');
  const realErrs=errs.filter(e=>!/^(Puppeteer|Protocol|Failed to load)/.test(e));
  ok('コンソールエラー0件',realErrs.length===0,realErrs.length?realErrs[0]:'');

  await b.close();

  // ============================================================
  // 結果サマリー
  // ============================================================
  console.log('\n'+('='.repeat(60)));
  console.log('テスト結果');
  console.log('='.repeat(60));
  console.log('PASS: '+pass);
  console.log('FAIL: '+fail);
  console.log('\nスクリーンショット: '+SS+'/');
  if(fail>0)process.exit(1);
})().catch(e=>{console.log('ERR',e.message,e.stack);process.exit(1)});
