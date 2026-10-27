// 画角ガイド 実データ検証スクリプト
// 目的: Luke3:23-38/Colossians1:3-8/サンプル文 × 4プリセット で収まりを実測
// 出力: 測定値一覧 + スクリーンショット
// 変更: なし（READ ONLY）

const p=require('puppeteer-core');
const fs=require('fs');
const path=require('path');

const APP='file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR='/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const SS_DIR='/Users/373da/Claude/開発室/lowfat-handover/tests/vg_screenshots';

const PRESETS=['pc-std','pc-sm','sp-std','sp-sm'];
const PRESET_LABELS={'pc-std':'PC標準 1280×800','pc-sm':'PC小 1280×720','sp-std':'スマホ 390×844','sp-sm':'スマホ小 360×740'};

const SENTENCES=[
  {id:'sample', label:'サンプル(1CO 1:1-2)', file:null, findIdx:null},
  {id:'col138', label:'Colossians 1:3-8', file:'12-colossians.xml', book:'Colossians', findIdx:()=>2},
  {id:'luk323', label:'Luke 3:23-38', file:'03-luke.xml', book:'Luke',
   findIdx:'BOOK.sents.findIndex(s=>s.xml.includes("LUK 3:23"))'},
];

if(!fs.existsSync(SS_DIR))fs.mkdirSync(SS_DIR,{recursive:true});

const results=[];
let pass=0,fail=0,mv=0; // pass/fail/要目視

const ok=(n,v)=>{if(v){pass++;return `PASS`}else{fail++;return `FAIL`}};

(async()=>{
  console.log('=== 画角ガイド 実データ検証 ===\n');
  console.log(`対象ファイル: rk-diagram-m3.html`);
  console.log(`検証日時: ${new Date().toISOString()}\n`);

  const b=await p.launch({
    executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless:'shell',
    args:['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport:{width:1400,height:900}
  });
  const pg=await b.newPage();
  const errs=[];
  pg.on('pageerror',e=>errs.push(e.message));
  pg.on('console',m=>m.type()==='error'&&errs.push(m.text()));
  await pg.goto(APP);
  await new Promise(r=>setTimeout(r,500));

  for(const sent of SENTENCES){
    console.log(`\n${'='.repeat(50)}`);
    console.log(`文: ${sent.label}`);
    console.log('='.repeat(50));

    // 文の読み込み
    if(sent.file){
      await pg.evaluate('window.__oldBook=BOOK');
      await (await pg.$('#fi')).uploadFile(DIR+sent.file);
      await pg.waitForFunction(`BOOK&&BOOK!==window.__oldBook&&BOOK.name==='${sent.book}'`,{timeout:30000});
      const idx=typeof sent.findIdx==='string'
        ?await pg.evaluate(sent.findIdx)
        :sent.findIdx();
      if(idx<0){console.log(`  SKIP: ${sent.label} のsentence indexが見つからない`);continue}
      await pg.evaluate(`go(${idx})`);
      console.log(`  sentence idx=${idx}`);
    }
    // サンプルはデフォルトのまま

    // 語数・文参照を取得
    const info=await pg.evaluate(()=>({
      ref:$('#ref').textContent,
      n:words.length,
      svgW:Math.round(svg.getBoundingClientRect().width),
      svgH:Math.round(svg.getBoundingClientRect().height),
    }));
    console.log(`  ref: ${info.ref}  語数: ${info.n}  SVGキャンバス: ${info.svgW}×${info.svgH}px`);

    for(const preset of PRESETS){
      // プリセットを設定
      await pg.evaluate(`(()=>{
        vgKey='${preset}';
        const pp=VG['${preset}'];
        $('#vgCW').value=pp.cw;$('#vgCH').value=pp.ch;$('#vgMg').value=pp.mg;
        vgToggle(true);
      })()`);

      // 現在のviewを保存
      const viewBefore=await pg.evaluate(()=>({x:view.x,y:view.y,k:view.k}));

      // 「画角に合わせる」実行
      await pg.evaluate('vgFitAll()');
      const viewAfter=await pg.evaluate(()=>({x:view.x,y:view.y,k:view.k}));

      // 測定
      const a=await pg.evaluate(()=>vgAssess());
      const fontPx=a?+(22*viewAfter.k).toFixed(1):null;

      // スクリーンショット
      const ssName=`${sent.id}_${preset}.png`;
      await pg.screenshot({path:path.join(SS_DIR,ssName),clip:{x:0,y:0,width:1400,height:900}});

      // 収まり判定
      const fits=a&&!(a.oL||a.oR||a.oT||a.oB);
      const scrollH=a&&a.dw>a.p.cw;
      const scrollV=a&&a.dh>a.p.ch;

      // 文字サイズ評価: 基準未設定なので数値のみ記録
      // 8px以下は「要確認」、8px超は数値を記録
      const fontNote=fontPx===null?'N/A':fontPx<=8?`${fontPx}px [8px以下・要確認]`:`${fontPx}px`;

      const row={
        sent:sent.label,preset,label:PRESET_LABELS[preset],
        k:viewAfter.k.toFixed(3),fontPx,fontNote,
        fits,scrollH,scrollV,
        oL:a?.oL??0,oR:a?.oR??0,oT:a?.oT??0,oB:a?.oB??0,
        dw:a?.dw??0,dh:a?.dh??0,
        ssName,
      };
      results.push(row);

      console.log(`\n  [${PRESET_LABELS[preset]}]`);
      console.log(`    zoom k=${row.k}  文字${fontNote}`);
      if(a){
        if(fits){
          console.log(`    収まり: PASS  余白 L${a.mL} R${a.mR} T${a.mT} B${a.mB}px`);
        }else{
          console.log(`    収まり: FAIL  はみ出し L${row.oL} R${row.oR} T${row.oT} B${row.oB}px`);
        }
        console.log(`    図サイズ: ${row.dw}×${row.dh}px  横スクロール:${scrollH?'必要':'不要'}  縦スクロール:${scrollV?'必要':'不要'}`);
      }
      console.log(`    要目視: 文字読みやすさ・ノード/線の重なり  → ${ssName}`);

      // viewを復元
      await pg.evaluate(()=>vgRestoreView());
      const viewRestored=await pg.evaluate(()=>({x:view.x,y:view.y,k:view.k}));
      const restored=Math.abs(viewRestored.k-viewBefore.k)<0.001&&Math.abs(viewRestored.x-viewBefore.x)<0.5;
      console.log(`    view復元: ${restored?'PASS':'FAIL'}`);
    }

    // ガイドをOFFに戻す
    await pg.evaluate(()=>vgToggle(false));
  }

  // 保存データへの影響確認
  console.log(`\n${'='.repeat(50)}`);
  console.log('保存データへの影響確認');
  const xmlBefore=await pg.evaluate(()=>ser());
  await pg.evaluate(()=>vgToggle(true));
  await pg.evaluate('(()=>{vgKey="sp-std";const pp=VG["sp-std"];$("#vgCW").value=pp.cw;$("#vgCH").value=pp.ch;$("#vgMg").value=pp.mg;vgFitAll()})()');
  const xmlAfter=await pg.evaluate(()=>ser());
  const xmlUnchanged=xmlBefore===xmlAfter;
  console.log(`  XMLデータ変更: ${xmlUnchanged?'PASS (変更なし)':'FAIL (変更あり)'}`);
  await pg.evaluate(()=>vgRestoreView());
  await pg.evaluate(()=>vgToggle(false));

  // コンソールエラー確認
  console.log(`\nコンソールエラー: ${errs.length===0?'PASS (0件)':`FAIL (${errs.length}件)`}`);
  if(errs.length)errs.forEach(e=>console.log('  '+e));

  await b.close();

  // 結果サマリー
  console.log(`\n${'='.repeat(50)}`);
  console.log('結果サマリー');
  console.log('='.repeat(50));
  console.log(`\n${'文'.padEnd(22)}${'プリセット'.padEnd(18)}${'k'.padEnd(7)}${'文字'.padEnd(12)}${'収まり'.padEnd(7)}${'スクH'.padEnd(7)}${'スクV'}`);
  console.log('-'.repeat(80));
  for(const r of results){
    const fits_s=r.fits?'OK':'NG';
    const sh=r.scrollH?'必要':'不要';
    const sv=r.scrollV?'必要':'不要';
    console.log(`${r.sent.slice(0,20).padEnd(22)}${r.label.padEnd(18)}${r.k.padEnd(7)}${r.fontNote.padEnd(12)}${fits_s.padEnd(7)}${sh.padEnd(7)}${sv}`);
  }
  console.log('\n注: 文字読みやすさ・ノード/線の重なり → 要目視（スクリーンショット参照）');
  console.log(`スクリーンショット保存先: ${SS_DIR}`);
  console.log(`\nXML保存データ変更: ${xmlUnchanged?'なし':'あり'}`);
})().catch(e=>{console.log('ERR',e.message);process.exit(1)});
