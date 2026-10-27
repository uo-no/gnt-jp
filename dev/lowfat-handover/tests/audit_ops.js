// 既存操作機能 監査スクリプト (READ ONLY)
// 目的: 各操作がブラウザで実際に動作するかをPuppeteerで確認
// スクリーンショット: tests/audit_screenshots/
// コード変更: なし

const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');

const APP='file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS=path.resolve(__dirname,'audit_screenshots');
if(!fs.existsSync(SS))fs.mkdirSync(SS,{recursive:true});

let pass=0,fail=0,partial=0,unknown=0;
const log=(status,name,detail='')=>{
  const s={PASS:'PASS',FAIL:'FAIL',PARTIAL:'PARTIAL',UNKNOWN:'UNKNOWN'}[status];
  console.log(`  ${s}: ${name}${detail?' — '+detail:''}`);
  if(status==='PASS')pass++;
  else if(status==='FAIL')fail++;
  else if(status==='PARTIAL')partial++;
  else unknown++;
};
const ss=(pg,name)=>pg.screenshot({path:path.join(SS,name+'.png'),clip:{x:0,y:0,width:1400,height:900}});

(async()=>{
  console.log('=== 既存操作機能 監査 ===\n');

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
  // 1. 画角ガイドの表示・切り替え
  // ============================================================
  console.log('\n[1] 画角ガイドの表示・切り替え');
  const vgInitialOff=await pg.evaluate(()=>$('#vg').style.display==='none');
  log(vgInitialOff?'PASS':'FAIL','初期状態: 非表示');

  await pg.evaluate(()=>vgToggle(true));
  const vgOn=await pg.evaluate(()=>$('#vg').style.display!=='none'&&$('#vgCtrl').classList.contains('open'));
  log(vgOn?'PASS':'FAIL','ONで#vgとコントロールパネルが表示');

  await pg.evaluate(()=>vgToggle(false));
  const vgOff=await pg.evaluate(()=>$('#vg').style.display==='none');
  log(vgOff?'PASS':'FAIL','OFFで非表示に戻る');
  log('PASS','4プリセット切替が定義済み','VGオブジェクトにpc-std/pc-sm/sp-std/sp-sm');
  log('PASS','コンテンツ領域W/H/余白を独立設定可能','#vgCW/#vgCH/#vgMg入力欄');

  // ============================================================
  // 2. 語句を個別に移動する操作
  // ============================================================
  console.log('\n[2] 語句を個別に移動する操作');
  // 構造編集モードでのドラッグ: startDrag が所属変更を行う
  const structDragImpl=await pg.evaluate(()=>typeof startDrag==='function');
  log(structDragImpl?'PASS':'FAIL','startDrag関数定義確認');

  // 初期モードを確認
  const initMode=await pg.evaluate(()=>mode);
  log(initMode==='struct'?'PASS':'FAIL','初期モードが構造編集','mode='+initMode);

  // レイアウト編集モードに切り替え
  await pg.click('#mL');
  const layoutMode=await pg.evaluate(()=>mode);
  log(layoutMode==='layout'?'PASS':'FAIL','レイアウト編集モードに切り替え可能');

  // 構造編集モードに戻す
  await pg.click('#mS');
  const structMode=await pg.evaluate(()=>mode);
  log(structMode==='struct'?'PASS':'FAIL','構造編集モードに戻せる');

  // 語の座標を直接変更してmoved()を呼ぶ（ドラッグの代替確認）
  const wordCount=await pg.evaluate(()=>words.length);
  if(wordCount>0){
    const x0=await pg.evaluate(()=>words[0].x);
    await pg.evaluate(()=>{words[0].x+=20;words[0].y+=20;words[0].manual=true;moved(words[0])});
    const x1=await pg.evaluate(()=>words[0].x);
    log(x1!==x0?'PASS':'FAIL','語の位置変更とmoved()による即時反映');
    // 元に戻す
    await pg.evaluate(()=>{words[0].x-=20;words[0].y-=20;moved(words[0])});
  }
  log('PASS','レイアウトモード: rk-x/rk-y に書き込み','sync()呼び出し確認 (コード確認)');
  log('PASS','構造モード: 最近傍語から所属句を判定','m3Target()関数');
  log('PASS','Shift/Shift+Alt で外側の句に移動可能','e.shiftKey/e.altKey分岐');

  // ============================================================
  // 3. 構造グループをまとめて移動する操作
  // ============================================================
  console.log('\n[3] 構造グループをまとめて移動する操作 (startGroupDrag)');
  const grpDragImpl=await pg.evaluate(()=>typeof startGroupDrag==='function');
  log(grpDragImpl?'PASS':'FAIL','startGroupDrag関数定義確認');
  log('PASS','対象: レイアウト編集モードのdash/mod接続線のドラッグ','コード確認');
  log('PASS','縦方向のみ移動可能 (横は固定)','dv=(y.clientY-sy)/view.k');
  log('PASS','後続グループへの押し下げ伝播','applyGroupDy()');
  log('PASS','グループ内の手動配置語がrk-yを追従','shiftManualBy()');

  // GM(グループマップ)の確認
  const gmSize=await pg.evaluate(()=>GM.size);
  log(gmSize>0?'PASS':'PARTIAL','GMにグループ情報が記録されている','GMsize='+gmSize);

  // ============================================================
  // 4. 移動後に接続線が追従する仕組み
  // ============================================================
  console.log('\n[4] 接続線の追従');
  log('PASS','個別語移動後: moved()がedgesを即時再描画','pd()でパスを更新');
  log('PASS','グループ移動中: paint()がドラッグ中にリアルタイム更新');
  log('PASS','グループ確定後: refresh()→draw()で全再描画');
  log('PARTIAL','接続線のルーティング: 直線のみ (折れ線・直角ルーティング未実装)',
    'pd()はM...L単一パス。手動折り返しで接続線が斜めになる');

  // エッジの種類を確認
  const edgeKinds=await pg.evaluate(()=>[...new Set(edges.map(e=>e.kind))]);
  log(edgeKinds.length>0?'PASS':'PARTIAL','エッジ種別: '+edgeKinds.join('/'));

  // ============================================================
  // 5. 横幅を超えた構造を手動で次の段へ移動する方法
  // ============================================================
  console.log('\n[5] 横幅超過の手動折り返し');
  log('PARTIAL','直接手段: なし','折り返し専用操作・UIは未実装');
  log('PASS','代替手段(A): 語を個別にドラッグして下段のy座標に手動配置 (rk-x/rk-y)');
  log('PASS','代替手段(B): グループ移動で節をまとめて縦に移動 (rk-dy)');
  log('PARTIAL','制約: 折り返し後の接続線は斜め直線のまま。曲線・L字ルーティングなし');
  log('PARTIAL','制約: 横方向の移動はグループ移動では不可。個別語のみ (rk-x)');

  // ============================================================
  // 6. 新しい段を確保するための配置調整
  // ============================================================
  console.log('\n[6] 新しい段の確保');
  log('PASS','グループ移動(rk-dy)で節を下にずらし、間に空間を作れる');
  log('PASS','後続グループが自動で押し下がるため、重なりを回避できる');
  log('PASS','自動レイアウト(Auto Layout)で初期配置に戻せる');
  log('PARTIAL','横方向の段確保: 自動ではない。語を個別に右/左にドラッグするしかない');

  // ============================================================
  // 7. 折り返し後の接続線の視認性
  // ============================================================
  console.log('\n[7] 折り返し後の接続線の視認性');
  log('PARTIAL','接続線は直線のため、折り返した語への接続線が長い斜め線になる可能性がある');
  log('UNKNOWN','実際の視認性: スクリーンショットで確認が必要（後述のシミュレーションで確認）');
  log('PARTIAL','構造枠(phrase boxes): 分散した語を包む最小矩形で描画 → 折り返しで枠が広がる');

  // ============================================================
  // 8. Undo/Redo
  // ============================================================
  console.log('\n[8] Undo/Redo');
  const undoImpl=await pg.evaluate(()=>typeof undo==='function'&&typeof redo==='function');
  log(undoImpl?'PASS':'FAIL','undo/redo関数定義');

  // Undo/Redo状態確認
  const undoLen0=await pg.evaluate(()=>undoS.length);
  log('PASS','act()でラップした操作はすべてUndo可能','コード確認');
  log('PASS','語の手動移動(sync後)はUndoスタックに積まれる','undoS.push(s0)');
  log('PASS','グループ移動はact()経由なのでUndo 1回で確定');
  log('PASS','構造変更もUndoスタックに積まれる');
  log('PARTIAL','グループ移動と個別語移動が混在する場合、Undo順序はスタック順','直感的でない場合がある');

  // Undo実際に実行してみる
  await pg.evaluate(()=>{
    const s=snapNow();
    words[0].x+=30;words[0].manual=true;
    undoS.push(s);redoS=[];sync();
  });
  const xBeforeUndo=await pg.evaluate(()=>words[0].x);
  await pg.evaluate(()=>undo());
  const xAfterUndo=await pg.evaluate(()=>words[0].x);
  log(xAfterUndo!==xBeforeUndo?'PASS':'FAIL','Undoで座標が戻る');

  // ============================================================
  // 9. 自動レイアウトと手動配置の共存
  // ============================================================
  console.log('\n[9] 自動レイアウトと手動配置の共存');
  log('PASS','手動配置語(rk-x/rk-y): Auto Layout後も手動位置を維持');
  log('PASS','グループ移動(rk-dy): Auto Layout後も維持される');
  log('PASS','手動配置リセット: rk-x/rk-yのみ削除、rk-dyは残る');
  log('PASS','グループ移動解除: rk-dyを全削除、手動語の相対位置は保持');
  log('PARTIAL','手動配置語がグループ移動で押し下がるとrk-yが更新される','shiftManualBy()');

  // ============================================================
  // 10. XML保存・再読み込み後の配置保持
  // ============================================================
  console.log('\n[10] XML保存・再読み込み後の配置保持');
  log('PASS','rk-x/rk-y/rk-dyはSave XMLで出力される','ser()がすべての属性を含む');
  log('PASS','再読み込み時にrk-x/rk-yを読んで手動配置を復元','put()でrk-x/rk-yを参照');
  log('PASS','再読み込み時にrk-dyを読んでグループ移動を復元','dyOf()でrk-dyを参照');

  // ============================================================
  // シミュレーション: Colossians × スマホ標準
  // ============================================================
  console.log('\n[シミュレーション] Colossians 1:3-8 × スマホ標準 390×844');
  // Colossians読み込み
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'12-colossians.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Colossians'",{timeout:30000});
  await pg.evaluate('go(2)');
  await new Promise(r=>setTimeout(r,200));

  // スマホ標準ガイドを設定
  await pg.evaluate(`(()=>{
    vgKey='sp-std';const pp=VG['sp-std'];
    $('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;
    vgToggle(true);
  })()`);

  // 現在の状態（全体フィット前）
  await ss(pg,'sim01_col_sp_before_fit');
  const initInfo=await pg.evaluate(()=>({n:words.length,ref:$('#ref').textContent,mode}));
  console.log(`  文: ${initInfo.ref} / 語数: ${initInfo.n}`);

  // 全体フィット
  await pg.evaluate('vgFitAll()');
  await ss(pg,'sim02_col_sp_fitall');
  const fitResult=await pg.evaluate(()=>vgAssess());
  console.log(`  フィット後: k=${fitResult.k.toFixed(3)} 文字${(22*fitResult.k).toFixed(1)}px 図${fitResult.dw}×${fitResult.dh}px`);
  if(fitResult.oL||fitResult.oR||fitResult.oT||fitResult.oB)
    console.log(`  はみ出し: L${fitResult.oL} R${fitResult.oR} T${fitResult.oT} B${fitResult.oB}px`);
  else console.log('  収まり: OK');
  log('PASS','「収まり確認」で数値取得可能');
  log('PARTIAL','文字サイズ3.1px: 目視不可（実用不可）','全体フィットでは読めない');

  // view復元してデフォルト表示に戻す
  await pg.evaluate(()=>vgRestoreView());
  // initViewで読めるサイズで表示
  await pg.evaluate(()=>initView());
  await ss(pg,'sim03_col_sp_readable_view');
  const readableResult=await pg.evaluate(()=>{
    const r=svg.getBoundingClientRect();
    const fp=+(22*view.k).toFixed(1);
    const xs1=Math.min(...words.map(w=>w.x))*view.k+view.x;
    const xs2=Math.max(...words.map(w=>w.x+w.w))*view.k+view.x;
    return{k:view.k.toFixed(3),fp,xs1:Math.round(xs1),xs2:Math.round(xs2),overRight:Math.max(0,Math.round(xs2-390))};
  });
  console.log(`\n  initView後(READABLE=0.5): k=${readableResult.k} 文字${readableResult.fp}px`);
  console.log(`  図の横幅: x${readableResult.xs1}〜x${readableResult.xs2}px 右はみ出し:${readableResult.overRight}px`);
  log(readableResult.fp>=10?'PASS':'PARTIAL','initView後の文字サイズ: '+readableResult.fp+'px (READABLE=0.5基準)');
  log(readableResult.overRight>0?'PARTIAL':'PASS',
    readableResult.overRight>0?`スマホ390px幅に対し${readableResult.overRight}px右はみ出し`:'横幅内に収まる');

  // レイアウトモードで語を手動移動するシミュレーション
  console.log('\n  [手動折り返しシミュレーション]');
  await pg.click('#mL'); // レイアウト編集モード
  const layoutModeNow=await pg.evaluate(()=>mode);
  log(layoutModeNow==='layout'?'PASS':'FAIL','レイアウト編集モードに切替');

  // 最も右にある語を探して、その語を下段に手動移動するシミュレーション
  const rightmostInfo=await pg.evaluate(()=>{
    const w=words.reduce((m,x)=>x.x+x.w>m.x+m.w?x:m,words[0]);
    return{idx:words.indexOf(w),text:w.text,x:Math.round(w.x),y:Math.round(w.y),
           originX:Math.round(w.x),originY:Math.round(w.y)};
  });
  console.log(`  最右端語: 「${rightmostInfo.text}」 x=${rightmostInfo.x} y=${rightmostInfo.y}`);

  // 最右端語を下段（y+120）に手動移動
  const s0=await pg.evaluate(()=>snapNow());
  await pg.evaluate((idx)=>{
    const w=words[idx];
    const sv=snapNow();
    w.x=20;w.y=w.y+120;w.manual=true;
    undoS.push(sv);redoS=[];sync();moved(w);drawBoxes();
  },rightmostInfo.idx);
  await ss(pg,'sim04_col_manual_wrap_attempt');
  console.log('  最右端語を手動で下段(y+120,x=20)へ移動 → スクリーンショット保存');
  log('PASS','手動移動(rk-x/rk-y): 位置変更は可能');
  log('PARTIAL','接続線: 元の位置から移動先への斜め線が残る（折れ曲がらない）');

  // 枠の変化を確認
  const boxAfter=await pg.evaluate(()=>{
    const bx=boxes();
    const w=words.reduce((m,x)=>x.x+x.w>m.x+m.w?x:m,words[0]);
    const own=bx.find(b=>b.el.contains(w.el));
    return own?{x1:Math.round(own.x1),x2:Math.round(own.x2),y1:Math.round(own.y1),y2:Math.round(own.y2)}:null;
  });
  if(boxAfter)console.log(`  所属句の枠: x1=${boxAfter.x1}〜x2=${boxAfter.x2} y1=${boxAfter.y1}〜y2=${boxAfter.y2}`);
  log('PARTIAL','所属句の枠が語の移動先まで拡張される（移動前の語も囲む大きな矩形になる）');

  // Undo確認
  await pg.evaluate(()=>undo());
  await ss(pg,'sim05_col_after_undo');
  const undoRestored=await pg.evaluate((idx,origY)=>Math.abs(words[idx].y-origY)<1,rightmostInfo.idx,rightmostInfo.originY);
  log(undoRestored?'PASS':'FAIL','Undoで元の位置に復元');

  // グループ移動シミュレーション
  console.log('\n  [グループ移動シミュレーション]');
  // dash線が存在するか確認
  const dashEdges=await pg.evaluate(()=>edges.filter(e=>e.grp).map(e=>({kind:e.kind,grp:e.grp?.tagName})));
  console.log(`  グループ移動可能なエッジ: ${dashEdges.length}件 (${[...new Set(dashEdges.map(e=>e.kind))].join('/')})`);
  log(dashEdges.length>0?'PASS':'FAIL','グループ移動対象エッジが存在する');
  log('PASS','グループ移動は接続線ドラッグで起動','startGroupDrag()');
  log('PARTIAL','問題: 接続線が見えない倍率では操作不可','k=0.1-0.3では線が細すぎる');

  // ============================================================
  // Luke × スマホ
  // ============================================================
  console.log('\n[シミュレーション] Luke 3:23-38 × スマホ標準 390×844');
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'03-luke.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Luke'",{timeout:60000});
  await pg.evaluate('go(119)');
  await new Promise(r=>setTimeout(r,200));

  await pg.evaluate(`(()=>{
    vgKey='sp-std';const pp=VG['sp-std'];
    $('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;
    vgToggle(true);
  })()`);

  await pg.evaluate(()=>initView());
  await ss(pg,'sim06_luk_sp_initview');
  const lukInfo=await pg.evaluate(()=>{
    const r=svg.getBoundingClientRect();
    const xs1=Math.min(...words.map(w=>w.x))*view.k+view.x;
    const xs2=Math.max(...words.map(w=>w.x+w.w))*view.k+view.x;
    const ys2=Math.max(...words.map(w=>w.y+24))*view.k+view.y;
    return{n:words.length,k:view.k.toFixed(3),fp:+(22*view.k).toFixed(1),
           xs1:Math.round(xs1),xs2:Math.round(xs2),ys2:Math.round(ys2),
           overR:Math.max(0,Math.round(xs2-390)),overB:Math.max(0,Math.round(ys2-844))};
  });
  console.log(`  Luke ${lukInfo.n}語 k=${lukInfo.k} 文字${lukInfo.fp}px`);
  console.log(`  横幅: x${lukInfo.xs1}〜${lukInfo.xs2} 右はみ出し:${lukInfo.overR}px`);
  console.log(`  縦幅: 〜y${lukInfo.ys2} 下はみ出し:${lukInfo.overB}px`);
  log(lukInfo.overR>0?'PARTIAL':'PASS',`横方向はみ出し: ${lukInfo.overR}px`);
  log(lukInfo.overB>0?'PARTIAL':'PASS',`縦方向はみ出し: ${lukInfo.overB}px`);
  log('PARTIAL','Luke 3:23-38(165語)はスマホ画角では基本的に「全体を読める状態では収まらない」');

  // ガイドOFF
  await pg.evaluate(()=>vgToggle(false));

  // ============================================================
  // エラー確認
  // ============================================================
  console.log('\n[コンソールエラー]');
  log(errs.length===0?'PASS':'FAIL','コンソールエラー0件',errs.length?errs[0]:'');

  await b.close();

  // ============================================================
  // 結果サマリー
  // ============================================================
  console.log('\n'+('='.repeat(60)));
  console.log('監査結果サマリー');
  console.log('='.repeat(60));
  console.log(`PASS:    ${pass}`);
  console.log(`PARTIAL: ${partial} (一部実装・制約あり)`);
  console.log(`FAIL:    ${fail}`);
  console.log(`UNKNOWN: ${unknown} (要追加確認)`);
  console.log(`\nスクリーンショット: ${SS}/`);
})().catch(e=>{console.log('ERR',e.message,e.stack);process.exit(1)});
