/**
 * pb_1th36_verify.js — 1TH 3:6 ページ区切り機能検証
 * viewport: 390×844 (スマートフォン標準)
 *
 * 修正: pbSetBnd() 後は pbBnd グローバルを直接参照する (index 経由の alias バグを回避)
 */
const pu = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP    = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const XML    = path.join(__dirname, 'pb_candidates/cand_1_1TH_3_6_2.xml');
const SS_OUT = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/pb_1th36';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(SS_OUT)) fs.mkdirSync(SS_OUT, {recursive: true});

  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 390, height: 844},
  });
  const pg = await br.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));

  let pass = 0, fail = 0;
  const chk = (label, ok, detail) => {
    if (ok) { pass++; console.log('  [PASS]', label, detail || ''); }
    else     { fail++; console.log('  [FAIL]', label, detail || ''); }
  };
  const ss = async name => {
    await pg.screenshot({path: path.join(SS_OUT, name + '.png'), fullPage: false});
    console.log('  📷', name + '.png');
  };

  await pg.goto(APP); await wait(600);

  // 1TH 3:6 読み込み
  await pg.evaluate(xml => fresh(xml), fs.readFileSync(XML, 'utf8'));
  await wait(300);

  // sp-std 画角ガイド ON + スライス線 ON
  await pg.click('#vgTog'); await wait(100);
  await pg.select('#vgPre', 'sp-std'); await wait(200);
  await pg.evaluate(() => {
    document.querySelector('#vgSlChk').checked = true;
    vgSlOn = true;
    vgSlDraw();
  });
  chk('pbRow が sp-std で表示',
    await pg.evaluate(() => document.querySelector('#pbRow').style.display !== 'none'));

  // k=0.42 で全体が見えるズーム
  await pg.evaluate(() => { view.k = 0.42; view.x = 8; view.y = 8; applyView(); });
  await wait(100);

  // GM グループ一覧 (確認用ログ)
  const gmLog = await pg.evaluate(() => {
    const res = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      const minY = Math.min(...ws.map(w => w.y));
      const sib = g.parentNode
        ? [...g.parentNode.children].filter(c => c.tagName === 'wg' && GM.has(c)).length : 0;
      res.push({
        minY:   Math.round(minY),
        bottom: Math.round(pbGroupBottom(g)),
        sib,
        hasNext: !!pbNextGroup(g),
        label:  bd(g),
        cls:    g.getAttribute('class') || '',
      });
    }
    return res.sort((a, b) => a.minY - b.minY);
  });
  console.log('\nGM groups (' + gmLog.length + '件):');
  gmLog.forEach(g =>
    console.log(`  y=${g.minY} bot=${g.bottom} sib=${g.sib} next:${g.hasNext} cls="${g.cls}" "${g.label}"`)
  );

  // ── 境界グループ設定 (pbBnd に直接セット) ──
  // 条件: bottom≈750, siblingCount=4, hasNext=true (=「διὰ τοῦτο」前置詞句) — NPofNP inline後の新座標
  const findOk = await pg.evaluate(() => {
    let found = null;
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      const bot = Math.round(pbGroupBottom(g));
      const sib = g.parentNode
        ? [...g.parentNode.children].filter(c => c.tagName === 'wg' && GM.has(c)).length : 0;
      if (bot >= 745 && bot <= 760 && sib === 4 && !!pbNextGroup(g)) {
        found = g; break;
      }
    }
    if (!found) return null;
    pbSetBnd(found);
    return {
      label:  bd(pbBnd),
      bottom: Math.round(pbGroupBottom(pbBnd)),
      sib:    (() => {
        const p = pbBnd.parentNode;
        return p ? [...p.children].filter(c => c.tagName==='wg'&&GM.has(c)).length : 0;
      })(),
    };
  });
  chk('διὰ τοῦτο グループ特定・設定', !!findOk,
    findOk ? `bottom=${findOk.bottom} sib=${findOk.sib} "${findOk.label}"` : 'not found');
  if (!findOk) { await br.close(); process.exit(1); }
  await wait(100);

  // ── pbBnd を使って兄弟情報を取得 ──
  const before = await pg.evaluate(() => {
    const parent = pbBnd.parentNode;
    const siblings = [...parent.children].filter(c => c.tagName === 'wg' && GM.has(c));
    const bndI = siblings.indexOf(pbBnd);
    const yOf = g => {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      return ws.length ? Math.round(Math.min(...ws.map(w => w.y))) : null;
    };
    return {
      bndY:          yOf(pbBnd),
      bndBottom:     Math.round(pbGroupBottom(pbBnd)),
      bndI,
      totalSiblings: siblings.length,
      beforeYs:      siblings.slice(0, bndI).map(yOf),
      afterYs:       siblings.slice(bndI + 1).map(yOf),
      afterLabels:   siblings.slice(bndI + 1).map(s => bd(s)),
    };
  });

  console.log('\n境界グループ詳細 (pbBnd):');
  console.log(`  位置: siblings[${before.bndI}] / 計${before.totalSiblings}件`);
  console.log(`  content-y=${before.bndY} bottom=${before.bndBottom}`);
  console.log(`  前sibling(不動): ${before.beforeYs.length}件 y=[${before.beforeYs.join(', ')}]`);
  console.log(`  後sibling(移動): ${before.afterYs.length}件`);
  before.afterLabels.forEach((lbl, i) =>
    console.log(`    [${i}] y=${before.afterYs[i]} "${lbl}"`)
  );

  chk('境界後にグループが1件以上存在', before.afterYs.length >= 1,
    `後sibling数=${before.afterYs.length}`);

  // 全語位置のスナップショット (Undo検証用)
  const beforePos = await pg.evaluate(() =>
    words.map(w => ({x: Math.round(w.x), y: Math.round(w.y)}))
  );

  // UI状態確認
  const uiState = await pg.evaluate(() => ({
    hasLine:   !!pbg.querySelector('.pb-line'),
    hasLbl:    !!pbg.querySelector('.pb-lbl'),
    doEnabled: !$('#pbDoBtn').disabled,
  }));
  chk('境界ライン描画', uiState.hasLine);
  chk('境界ラベル描画', uiState.hasLbl);
  chk('後続↓ボタン有効', uiState.doEnabled);

  await ss('01_before_move');

  // ── 200px 移動実行 ──
  const GAP = 200;
  const applyOk = await pg.evaluate(gap => {
    const ng = pbNextGroup(pbBnd);
    if (!ng) return 'no-next';
    act(() => applyGroupDy(ng, dyOf(ng) + gap));
    return 'ok';
  }, GAP);
  chk('後続移動実行', applyOk === 'ok', applyOk);
  await wait(200);
  await ss('02_after_200px');

  // ── 移動後検証 (pbBnd 使用) ──
  const after = await pg.evaluate(() => {
    const parent = pbBnd.parentNode;
    const siblings = [...parent.children].filter(c => c.tagName === 'wg' && GM.has(c));
    const bndI = siblings.indexOf(pbBnd);
    const yOf = g => {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      return ws.length ? Math.round(Math.min(...ws.map(w => w.y))) : null;
    };
    return {
      bndY:     yOf(pbBnd),
      beforeYs: siblings.slice(0, bndI).map(yOf),
      afterYs:  siblings.slice(bndI + 1).map(yOf),
    };
  });

  chk('境界グループ不動',
    before.bndY === after.bndY,
    `before=${before.bndY} after=${after.bndY} Δy=${after.bndY - before.bndY}`);

  const prevOk = before.beforeYs.every((y, i) => y === after.beforeYs[i]);
  chk('境界より前のグループ不動', prevOk, `${before.beforeYs.length}件`);

  console.log('\n後続グループ移動量:');
  let allMoved = true;
  for (let i = 0; i < before.afterYs.length; i++) {
    const d = after.afterYs[i] - before.afterYs[i];
    const ok = Math.abs(d - GAP) <= 2;
    if (!ok) allMoved = false;
    console.log(`  sibling[${i}] before=${before.afterYs[i]} after=${after.afterYs[i]} Δy=${d} ${ok?'✓':'✗'}`);
  }
  chk(`後続sibling 全${before.afterYs.length}件が ${GAP}px 移動`, allMoved);

  // ── パン後: 境界線 content-y 不変確認 ──
  const pbY0 = await pg.evaluate(() => +pbg.querySelector('.pb-line')?.getAttribute('y1'));
  await pg.evaluate(() => { view.x = -150; view.y = 200; applyView(); });
  await wait(80);
  await ss('03_after_pan');
  const pbYPan = await pg.evaluate(() => +pbg.querySelector('.pb-line')?.getAttribute('y1'));
  chk('パン後も境界線 content-y が不変', Math.abs(pbY0 - pbYPan) < 0.01,
    `y1: ${pbY0.toFixed(1)} → ${pbYPan.toFixed(1)}`);
  const lblSX = await pg.evaluate(() => {
    const lbl = pbg.querySelector('.pb-lbl');
    return lbl ? Math.round(+lbl.getAttribute('x') * view.k + view.x) : null;
  });
  chk('パン後もラベル screen-x ≈ 6', Math.abs((lblSX || 0) - 6) <= 3, 'sx=' + lblSX);

  // ── Undo 検証 ──
  await pg.evaluate(() => { view.k = 0.42; view.x = 8; view.y = 8; applyView(); });
  await wait(50);
  await pg.click('#un'); await wait(300);
  await ss('04_after_undo');

  const undoPos = await pg.evaluate(() =>
    words.map(w => ({x: Math.round(w.x), y: Math.round(w.y)}))
  );
  let undoOk = true;
  const diffs = [];
  for (let i = 0; i < beforePos.length; i++) {
    if (beforePos[i].x !== undoPos[i].x || beforePos[i].y !== undoPos[i].y) {
      undoOk = false;
      diffs.push(`[${i}] Δx=${undoPos[i].x-beforePos[i].x} Δy=${undoPos[i].y-beforePos[i].y}`);
    }
  }
  chk('Undo で全語位置が正確に復元', undoOk,
    undoOk ? `${beforePos.length}語確認` : `差分${diffs.length}件: ${diffs.slice(0,3).join(' ')}`);

  // ── 画角ガイドと境界ラインの位置関係 ──
  const geoInfo = await pg.evaluate(() => {
    const guide1Y = vgOn && vgEls?.slices[0]
      ? +vgEls.slices[0].ln.getAttribute('y1') : null;
    const pbLineY = pbg.querySelector('.pb-line')
      ? +pbg.querySelector('.pb-line').getAttribute('y1') : null;
    return {guide1Y, pbLineY, k: view.k};
  });
  if (geoInfo.guide1Y && geoInfo.pbLineY) {
    const screenGuide = geoInfo.guide1Y * geoInfo.k + 8;  // view.y=8
    const screenPb    = geoInfo.pbLineY  * geoInfo.k + 8;
    console.log(`\n  画角ガイド 1画面目下端: content-y=${geoInfo.guide1Y?.toFixed(1)} → screen-y≈${screenGuide.toFixed(0)}px`);
    console.log(`  ページ境界ライン:        content-y=${geoInfo.pbLineY?.toFixed(1)} → screen-y≈${screenPb.toFixed(0)}px`);
  }

  chk('コンソールエラー 0件', errs.length === 0, `${errs.length}件`);
  if (errs.length) errs.slice(0, 3).forEach(e => console.log('  エラー:', e));

  await br.close();
  console.log(`\n=== 結果: ${pass} PASS / ${fail} FAIL ===`);
  console.log('📁 SS 保存先:', SS_OUT);
  if (fail > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
