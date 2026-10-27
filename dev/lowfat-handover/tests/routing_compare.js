// 接続線ルーティング比較スクリプト (READ ONLY for rk-diagram-m3.html)
// A: 現状直線, B: 長線の視覚的区別, C: L字ルーティング
// ブラウザ内でpd()を一時上書きして比較画像を生成。本体ファイル変更なし。

const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');

const APP='file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS=path.resolve(__dirname,'routing_compare_ss');
if(!fs.existsSync(SS))fs.mkdirSync(SS,{recursive:true});

// 1200×800のビューポートで比較
const VW=1200,VH=800;

// スクリーンショット: 全体
const ss=async(pg,name)=>pg.screenshot({path:path.join(SS,name+'.png'),
  clip:{x:0,y:0,width:VW,height:VH}});

// 接続線周辺を拡大したクロップ
const ssCrop=async(pg,name,x,y,w,h)=>{
  await pg.screenshot({path:path.join(SS,name+'.png'),clip:{x,y,width:w,height:h}});
};

/* ============================================================
   pd()の代替実装（ブラウザ内evaluate()で注入する文字列として定義）
   A: 変更なし（標準）
   B: 長い線（distance > LONG_TH）のみ半透明+破線に変更
   C: |dx|>DX_TH かつ |dy|>DY_TH の場合にL字ルーティング（縦→横）
   ============================================================ */

const PLAN_B_INJECT=`(()=>{
  // Plan B: 現在の全エッジを再描画し、長いものだけ視覚変更
  const LONG_TH=200;
  draw();
  edges.forEach(e=>{
    if(!e.el)return;
    const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist>LONG_TH){
      e.el.setAttribute('stroke-opacity','0.28');
      e.el.setAttribute('stroke-dasharray','7 4');
      e.el.setAttribute('stroke-width','1.5');
    }
  });
})()`;

const PLAN_C_INJECT=`(()=>{
  // Plan C: L字ルーティング（縦→横）を pd() に注入して全エッジを再描画
  // 長距離変位がある mod / dash エッジのみ対象（通常エッジは直線のまま）
  const DX_TH=150, DY_TH=40;
  const _pd_orig=pd;
  window.pd=function(e){
    const a=e.a,b=e.b,ay=a.y+4,by=b.y+4;
    const absdx=Math.abs(b.x-a.x),absdy=Math.abs(b.y-a.y);
    if(absdx>DX_TH&&absdy>DY_TH){
      if(e.kind==='mod'){
        // 縦: source.x を維持しながら target.y まで下がる → 横: target.x へ
        const sx=a.x+Math.min(14,a.w),tx=b.x-3;
        return \`M\${sx},\${ay}L\${sx},\${by}L\${tx},\${by}\`;
      }
      if(e.kind==='dash'){
        // 縦: source midX を維持しながら target 上端まで下がる → 横: target midX へ
        const sx=a.x+a.w/2,tx=b.x+b.w/2;
        return \`M\${sx},\${ay+6}L\${sx},\${by-24}L\${tx},\${by-24}\`;
      }
    }
    return _pd_orig(e);
  };
  draw();
  // 復元用の参照をグローバルに保持（次のrestore用）
  window._pd_backup=_pd_orig;
})()`;

const PLAN_C_RESTORE=`(()=>{
  if(window._pd_backup){window.pd=window._pd_backup;window._pd_backup=null;draw();}
})()`;

(async()=>{
  console.log('=== 接続線ルーティング比較 ===\n');
  const b=await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell',args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{width:VW,height:VH}
  });
  const pg=await b.newPage();
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg.goto(APP);
  await new Promise(r=>setTimeout(r,500));

  // ============================================================
  // Colossians 1:3-8 比較
  // ============================================================
  console.log('[Colossians 1:3-8]');
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'12-colossians.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Colossians'",{timeout:30000});
  await pg.evaluate('go(2)');
  await new Promise(r=>setTimeout(r,200));

  // レイアウト編集モードへ
  await pg.click('#mL');

  // 最右端グループを折り返し (dy=100, dxは元x位置+20に収める)
  const colRightInfo=await pg.evaluate(()=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return null;
    const ws=[...rightGEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{desc:bd(rightGEl),x0:Math.round(Math.min(...ws.map(w=>w.x))),
           parent:edges.filter(ed=>ed.grp===rightGEl||ws.some(w=>ed.b===w))[0]?.a?.text};
  });
  console.log(`  折り返し対象: 「${colRightInfo.desc}」 x=${colRightInfo.x0} parent="${colRightInfo.parent}"`);

  // 折り返し適用
  await pg.evaluate((x0)=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(xw=>EW.get(xw)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return;
    act(()=>applyGroupOffset(rightGEl,100,-x0+20));
  },colRightInfo.x0);

  // ビューを折り返し箇所が見えるように調整
  await pg.evaluate((vw,vh)=>{
    const x1=Math.min(...words.map(w=>w.x))-30,x2=Math.max(...words.map(w=>w.x+w.w))+30;
    const y1=Math.min(...words.map(w=>w.y-30)),y2=Math.max(...words.map(w=>w.y+15));
    const W=vw-40,H=vh-80;
    const k=Math.min(W/(x2-x1||1),H/(y2-y1||1),1.0);
    view.k=k;view.x=20-x1*k;view.y=40-y1*k;applyView();
  },VW,VH);

  // Plan A (現状)
  await ss(pg,'col_A_straight');
  console.log('  Plan A: スクリーンショット取得');

  // Plan B (視覚的区別)
  await pg.evaluate(PLAN_B_INJECT);
  await ss(pg,'col_B_visual');
  console.log('  Plan B: スクリーンショット取得');

  // Plan A に戻す
  await pg.evaluate(()=>draw());

  // Plan C (L字)
  await pg.evaluate(PLAN_C_INJECT);
  await ss(pg,'col_C_elbow');
  console.log('  Plan C: スクリーンショット取得');

  // pd()を元に戻す
  await pg.evaluate(PLAN_C_RESTORE);

  // ズームアップ: 接続線周辺を拡大
  await pg.evaluate((vw,vh)=>{
    const movedWs=words.filter(w=>w.y>800);
    if(!movedWs.length)return;
    const x1=Math.min(...movedWs.map(w=>w.x))-100,x2=Math.max(...movedWs.map(w=>w.x+w.w))+200;
    const y1=Math.min(...movedWs.map(w=>w.y-200)),y2=Math.max(...movedWs.map(w=>w.y+100));
    const W=vw-40,H=vh-80;
    const k=Math.min(W/(x2-x1||1),H/(y2-y1||1),1.5);
    view.k=k;view.x=20-x1*k;view.y=40-y1*k;applyView();
  },VW,VH);
  await ss(pg,'col_A_zoom_straight');
  await pg.evaluate(PLAN_B_INJECT);
  await ss(pg,'col_B_zoom_visual');
  await pg.evaluate(()=>draw());
  await pg.evaluate(PLAN_C_INJECT);
  await ss(pg,'col_C_zoom_elbow');
  await pg.evaluate(PLAN_C_RESTORE);

  // Undo して Colossians をクリーン状態に
  await pg.evaluate(()=>undo());
  console.log('  Undo完了\n');

  // ============================================================
  // Luke 3:23-38 比較
  // ============================================================
  console.log('[Luke 3:23-38]');
  await pg.evaluate('window.__oldBook=BOOK');
  await (await pg.$('#fi')).uploadFile(DIR+'03-luke.xml');
  await pg.waitForFunction("BOOK&&BOOK!==window.__oldBook&&BOOK.name==='Luke'",{timeout:60000});
  await pg.evaluate('go(119)');
  await new Promise(r=>setTimeout(r,200));
  await pg.click('#mL');

  // スマホガイドON
  await pg.evaluate(`(()=>{vgKey='sp-std';const pp=VG['sp-std'];$('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;vgToggle(true)})()`);

  // 最右端グループを折り返し
  const lukRightInfo=await pg.evaluate(()=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return null;
    const ws=[...rightGEl.getElementsByTagName('w')].map(x=>EW.get(x)).filter(Boolean);
    return{x0:Math.round(Math.min(...ws.map(w=>w.x))),y0:Math.round(Math.min(...ws.map(w=>w.y)))};
  });

  await pg.evaluate((x0)=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(xw=>EW.get(xw)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return;
    const gm=GM.get(rightGEl);
    const targetDy=groupDyFor(rightGEl,gm.py+200)||0;
    act(()=>applyGroupOffset(rightGEl,targetDy,-dxOf(rightGEl)-x0+20));
  },lukRightInfo.x0);

  // 全体ビュー
  await pg.evaluate((vw,vh)=>{
    const x1=Math.min(...words.map(w=>w.x))-20,x2=Math.max(...words.map(w=>w.x+w.w))+20;
    const y1=Math.min(...words.map(w=>w.y-30)),y2=Math.max(...words.map(w=>w.y+15));
    const W=vw-40,H=vh-80;
    const k=Math.min(W/(x2-x1||1),H/(y2-y1||1),0.8);
    view.k=k;view.x=20-x1*k;view.y=40-y1*k;applyView();
  },VW,VH);

  await ss(pg,'luk_A_straight');
  await pg.evaluate(PLAN_B_INJECT);
  await ss(pg,'luk_B_visual');
  await pg.evaluate(()=>draw());
  await pg.evaluate(PLAN_C_INJECT);
  await ss(pg,'luk_C_elbow');
  await pg.evaluate(PLAN_C_RESTORE);

  // 接続線ズームアップ
  await pg.evaluate(()=>{
    // 最右端グループの周辺を拡大（移動後の位置付近）
    const movedWs=words.filter(w=>w.y>800);
    if(!movedWs.length)return;
    const cx=Math.min(...movedWs.map(w=>w.x))+100;
    const cy=Math.min(...movedWs.map(w=>w.y))-100;
    const k=0.7;
    view.k=k;view.x=100-cx*k;view.y=60-cy*k;applyView();
  });
  await ss(pg,'luk_A_zoom_straight');
  await pg.evaluate(PLAN_B_INJECT);
  await ss(pg,'luk_B_zoom_visual');
  await pg.evaluate(()=>draw());
  await pg.evaluate(PLAN_C_INJECT);
  await ss(pg,'luk_C_zoom_elbow');
  await pg.evaluate(PLAN_C_RESTORE);

  await pg.evaluate(()=>undo());
  console.log('  Undo完了\n');

  // ============================================================
  // 測定: 各案の接続線の最大長・交差推定
  // ============================================================
  console.log('[測定]');
  // Colossians の長線測定（折り返しなし=通常状態）
  await pg.evaluate('go(2)');
  await new Promise(r=>setTimeout(r,100));

  // 折り返しを再度適用して測定
  await pg.evaluate((x0)=>{
    let maxX=-Infinity,rightGEl=null;
    for(const[gEl]of GM){const ws=[...gEl.getElementsByTagName('w')].map(xw=>EW.get(xw)).filter(Boolean);if(!ws.length)continue;
      const rx=Math.max(...ws.map(w=>w.x+w.w));if(rx>maxX){maxX=rx;rightGEl=gEl}}
    if(!rightGEl)return;
    act(()=>applyGroupOffset(rightGEl,100,-x0+20));
  },colRightInfo.x0);

  const metrics=await pg.evaluate(()=>{
    const result=[];
    edges.forEach(e=>{
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const diag=Math.min(Math.abs(dx),Math.abs(dy))/(Math.max(Math.abs(dx),Math.abs(dy))||1);
      result.push({kind:e.kind,dist:Math.round(dist),dx:Math.round(dx),dy:Math.round(dy),
        // 斜め度: 0=純粋水平/縦, 1=45度
        diag:Math.round(diag*100)/100,
        aText:e.a.text,bText:e.b.text});
    });
    result.sort((a,b)=>b.dist-a.dist);
    return result.slice(0,10);
  });

  console.log('  折り返し後の接続線 距離TOP10:');
  metrics.forEach((m,i)=>console.log(`  ${(i+1)+'.'} ${m.kind} dist=${m.dist} dx=${m.dx} dy=${m.dy} diag=${m.diag}  「${m.aText}」→「${m.bText}」`));

  const longCount=await pg.evaluate(()=>{
    return edges.filter(e=>{
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
      return Math.sqrt(dx*dx+dy*dy)>150;
    }).length;
  });
  console.log(`  distance>150の接続線: ${longCount}件`);

  await pg.evaluate(()=>undo());

  // ============================================================
  // コンソールエラー確認
  // ============================================================
  const realErrs=errs.filter(e=>!/^(Puppeteer|Protocol|Failed to load)/.test(e));
  console.log(`\nコンソールエラー: ${realErrs.length===0?'0件':realErrs.join('; ')}`);

  await b.close();
  console.log('\nスクリーンショット: '+SS+'/');
  console.log('ファイル一覧:');
  fs.readdirSync(SS).sort().forEach(f=>console.log('  '+f));
})().catch(e=>{console.log('ERR',e.message,e.stack);process.exit(1)});
