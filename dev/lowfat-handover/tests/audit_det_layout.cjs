/**
 * audit_det_layout.cjs — Cat A/C/D の実レイアウト座標確認 + SS
 */
'use strict';
const pu   = require('puppeteer-core');
const fs   = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const SS   = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/audit_layout';
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true });

  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
  });
  const pg = await br.newPage();
  pg.on('pageerror', e => console.error('PAGE ERROR:', e.message));
  await pg.goto(APP);
  await wait(600);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズA: NPofNP 実レイアウト (col_final.xml)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━━━━ Cat A: NPofNP レイアウト (COL 1:3-8) ━━━━━━\n');
  const colXml = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml', 'utf8');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(300);

  const catALayout = await pg.evaluate(() => {
    const results = [];
    const NONHEAD = new Set(['det','prep','conj']);
    // articular wg を直接 DOM から取得 (window.doc の代わりに doc を使用)
    const wgList = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
    for (const wg of wgList) {
      const dkids = [...wg.children].filter(c => c.tagName==='w' || c.tagName==='wg');
      const detKids = dkids.filter(c => c.tagName==='w' && c.getAttribute('class')==='det');
      const wgKids  = dkids.filter(c => c.tagName==='wg');
      if (!detKids.length || !wgKids.length) continue;

      const mainWg = wgKids[0];
      if ((mainWg.getAttribute('rule')||'') !== 'NPofNP') continue;

      const textOf = n => [...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
      const detEl  = detKids[0];
      const dw = EW.get(detEl);

      // NPofNP 内の最初の non-NONHEAD w を頭語候補とする
      const innerW = [...mainWg.children].filter(c=>c.tagName==='w');
      const innerWg = [...mainWg.children].filter(c=>c.tagName==='wg');
      const headW = innerW.find(c=>!NONHEAD.has(c.getAttribute('class')||''))
                 || (innerWg.length ? innerWg[0] : null);
      const hw = headW ? EW.get(headW) : null;

      // NPofNP の gen 部分（最後のwg か最後のw）
      const genEl = innerWg.length ? innerWg[innerWg.length-1] : innerW[innerW.length-1];
      const firstGenW = genEl && genEl.tagName==='wg'
        ? [...genEl.getElementsByTagName('w')][0]
        : genEl;
      const gw = firstGenW ? EW.get(firstGenW) : null;

      results.push({
        text: textOf(wg).slice(0,45),
        innerPat: [...mainWg.children].filter(c=>c.tagName==='w'||c.tagName==='wg')
          .map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' '),
        detText: detEl.textContent.trim(),
        detY:    dw  ? Math.round(dw.y)  : null,
        headText: headW ? (headW.tagName==='w' ? headW.textContent.trim() : textOf(headW).slice(0,20)) : '?',
        headY:   hw  ? Math.round(hw.y)  : null,
        genFirstText: firstGenW ? firstGenW.textContent.trim() : '?',
        genY:    gw  ? Math.round(gw.y)  : null,
        sameLine: dw && hw ? Math.abs(dw.y - hw.y) < 2 : null,
        detAboveGen: dw && gw ? dw.y < gw.y : null,
        dy_det_head: dw && hw ? Math.round(dw.y - hw.y) : null,
      });
    }
    return results;
  });

  console.log(`COL 1:3-8 NPofNP ケース: ${catALayout.length}件\n`);
  for (const r of catALayout) {
    console.log(`  "${r.text}"`);
    console.log(`    NPofNP inner: ${r.innerPat}`);
    console.log(`    det "${r.detText}" y=${r.detY}  head "${r.headText}" y=${r.headY}  gen1st "${r.genFirstText}" y=${r.genY}`);
    console.log(`    同ライン: ${r.sameLine}  det より gen が下: ${r.detAboveGen}  det-head Δy: ${r.dy_det_head}`);
  }

  // SS撮影
  await pg.evaluate(() => { view.k = 1.0; view.x = 10; view.y = 10; applyView(); });
  await wait(100);
  await pg.screenshot({ path: path.join(SS, 'catA_col13_full.png'), fullPage: false });
  console.log('\n  📷 catA_col13_full.png');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズB: ROM 6:6 — Cat C (AdjpNp with wg child)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━ Cat C: AdjpNp with wg (ROM 6:6) ━━━━━━\n');
  const romXml = fs.readFileSync(path.join(DATA, '06-romans.xml'), 'utf8');
  const rom66Sent = await pg.evaluate((xmlStr) => {
    const d = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const w = d.querySelector('w[ref="ROM 6:6!1"]');
    if (!w) return null;
    let s = w; while (s && s.tagName !== 'sentence') s = s.parentNode;
    return s ? new XMLSerializer().serializeToString(s) : null;
  }, romXml);

  if (rom66Sent) {
    await pg.evaluate(s => fresh(s), rom66Sent);
    await wait(200);

    const rom66 = await pg.evaluate(() => {
      const results = [];
      const NONHEAD = new Set(['det','prep','conj']);
      const wgList = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
      for (const wg of wgList) {
        const dkids = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const detKids = dkids.filter(c=>c.tagName==='w'&&c.getAttribute('class')==='det');
        const wgKids  = dkids.filter(c=>c.tagName==='wg');
        if (!detKids.length || !wgKids.length) continue;
        const mainWg = wgKids[0];
        if ((mainWg.getAttribute('rule')||'')!=='AdjpNp') continue;
        const inner = [...mainWg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        if (!inner.some(c=>c.tagName==='wg')) continue; // wg子なし → Fix2 対応済

        const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
        const innerPat = inner.map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');

        const detEl  = detKids[0];
        const dw = EW.get(detEl);
        const adjW = inner.find(c=>c.tagName==='w'&&c.getAttribute('class')==='adj');
        const nounW = inner.find(c=>c.tagName==='w'&&c.getAttribute('class')==='noun');
        const aw = adjW ? EW.get(adjW) : null;
        const nw = nounW ? EW.get(nounW) : null;
        // wg 子
        const wgChild = inner.find(c=>c.tagName==='wg');
        const wgFirstW = wgChild ? [...wgChild.getElementsByTagName('w')][0] : null;
        const gw = wgFirstW ? EW.get(wgFirstW) : null;

        results.push({
          text: textOf(wg).slice(0,50),
          innerPat,
          detText: detEl.textContent.trim(),
          detY: dw?Math.round(dw.y):null,
          adjText: adjW?adjW.textContent.trim():null,
          adjY: aw?Math.round(aw.y):null,
          nounText: nounW?nounW.textContent.trim():null,
          nounY: nw?Math.round(nw.y):null,
          wgRule: wgChild?wgChild.getAttribute('rule'):'',
          wgFirstText: wgFirstW?wgFirstW.textContent.trim():null,
          wgFirstY: gw?Math.round(gw.y):null,
        });
      }
      return results;
    });

    console.log(`ROM 6:6 Cat C ケース: ${rom66.length}件`);
    rom66.forEach(r => {
      console.log(`  "${r.text}"`);
      console.log(`    inner: ${r.innerPat}`);
      console.log(`    det "${r.detText}" y=${r.detY}  adj "${r.adjText}" y=${r.adjY}  noun "${r.nounText}" y=${r.nounY}`);
      console.log(`    wg[${r.wgRule}] first="${r.wgFirstText}" y=${r.wgFirstY}`);
    });

    await pg.evaluate(() => { view.k = 1.0; view.x = 10; view.y = 10; applyView(); });
    await wait(100);
    await pg.screenshot({ path: path.join(SS, 'catC_rom66.png'), fullPage: false });
    console.log('  📷 catC_rom66.png');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズC: 1CO 7:14 — Cat D (NPDetAdj)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━ Cat D: NPDetAdj (1CO 7:14) ━━━━━━\n');
  const cor1Xml = fs.readFileSync(path.join(DATA, '07-1corinthians.xml'), 'utf8');
  const cor714Sent = await pg.evaluate((xmlStr) => {
    const d = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const w = d.querySelector('w[ref="1CO 7:14!1"]');
    if (!w) return null;
    let s = w; while (s && s.tagName !== 'sentence') s = s.parentNode;
    return s ? new XMLSerializer().serializeToString(s) : null;
  }, cor1Xml);

  if (cor714Sent) {
    await pg.evaluate(s => fresh(s), cor714Sent);
    await wait(200);

    const cor714 = await pg.evaluate(() => {
      const results = [];
      const wgList = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
      for (const wg of wgList) {
        const dkids = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const detKids = dkids.filter(c=>c.tagName==='w'&&c.getAttribute('class')==='det');
        const wgKids  = dkids.filter(c=>c.tagName==='wg');
        if (!detKids.length || !wgKids.length) continue;
        const mainWg = wgKids[0];
        if (!/DetAdj/.test(mainWg.getAttribute('rule')||'')) continue;

        const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
        const innerPat = [...mainWg.children].filter(c=>c.tagName==='w'||c.tagName==='wg')
          .map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');
        const allW = [...wg.getElementsByTagName('w')].map(w=>({
          t: w.textContent.trim(),
          cls: w.getAttribute('class')||'',
          y: Math.round((EW.get(w)||{y:null}).y),
        }));

        const detEl = detKids[0];
        const dw = EW.get(detEl);
        // NPDetAdj の内部: head noun or NPofNP
        const innerFirst = [...mainWg.children].find(c=>c.tagName==='w'||c.tagName==='wg');
        const headFirstW = innerFirst && innerFirst.tagName==='w' ? innerFirst
          : (innerFirst && innerFirst.tagName==='wg' ? [...innerFirst.getElementsByTagName('w')][0] : null);
        const hfw = headFirstW ? EW.get(headFirstW) : null;

        results.push({
          rule: mainWg.getAttribute('rule')||'',
          text: textOf(wg).slice(0,50),
          innerPat,
          allW,
          detText: detEl.textContent.trim(),
          detY: dw?Math.round(dw.y):null,
          headFirstText: headFirstW?headFirstW.textContent.trim():null,
          headFirstY: hfw?Math.round(hfw.y):null,
        });
      }
      return results;
    });

    console.log(`1CO 7:14 Cat D ケース: ${cor714.length}件`);
    cor714.forEach(r => {
      console.log(`  rule="${r.rule}" "${r.text}"`);
      console.log(`    inner: ${r.innerPat}`);
      console.log(`    words: ${r.allW.map(w=>`${w.t}(${w.cls},y=${w.y})`).join(' ')}`);
      console.log(`    det "${r.detText}" y=${r.detY}  head1st "${r.headFirstText}" y=${r.headFirstY}`);
    });

    await pg.evaluate(() => { view.k = 1.0; view.x = 10; view.y = 10; applyView(); });
    await wait(100);
    await pg.screenshot({ path: path.join(SS, 'catD_1co714.png'), fullPage: false });
    console.log('  📷 catD_1co714.png');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズD: NPofNP wg-head ケース (ROM) の確認
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━ Cat A wg-head ケース (NPofNP where head=wg) ━━━━━━\n');
  // 例: wg[NpaNp] w.pron — coordinated NP
  const rom120Sent = await pg.evaluate((xmlStr) => {
    const d = new DOMParser().parseFromString(xmlStr, 'text/xml');
    // ROM 1:20 ἥ τε ἀΐδιος αὐτοῦ δύναμις — Cat E example, not NPofNP wg-head
    // Let's find the NPofNP wg-head case
    const ws = d.querySelectorAll('w');
    for (const w of ws) {
      const wg = w.parentNode;
      if (!wg || wg.tagName !== 'wg') continue;
      if ((wg.getAttribute('rule')||'') !== 'NPofNP') continue;
      const inner = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
      if (inner[0] && inner[0].tagName==='wg') {
        // found wg-head NPofNP — find its sentence
        let s = wg; while (s && s.tagName !== 'sentence') s = s.parentNode;
        return s ? new XMLSerializer().serializeToString(s) : null;
      }
    }
    return null;
  }, romXml);

  if (rom120Sent) {
    await pg.evaluate(s => fresh(s), rom120Sent);
    await wait(200);
    const wgHeadLayout = await pg.evaluate(() => {
      const NONHEAD = new Set(['det','prep','conj']);
      const results = [];
      const artWgs = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
      for (const wg of artWgs) {
        const dkids = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const detKids = dkids.filter(c=>c.tagName==='w'&&c.getAttribute('class')==='det');
        const wgKids  = dkids.filter(c=>c.tagName==='wg');
        if (!detKids.length||!wgKids.length) continue;
        const mainWg = wgKids[0];
        if ((mainWg.getAttribute('rule')||'')!=='NPofNP') continue;
        const inner = [...mainWg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const headIsWg = inner[0] && inner[0].tagName==='wg';
        if (!headIsWg) continue;
        const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
        const innerPat = inner.map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');
        const allW = [...wg.getElementsByTagName('w')].map(w=>({
          t: w.textContent.trim(),
          cls: w.getAttribute('class')||'',
          y: Math.round((EW.get(w)||{y:null}).y),
        }));
        results.push({ text: textOf(wg).slice(0,50), innerPat, allW });
      }
      return results;
    });
    console.log(`ROM NPofNP wg-head ケース: ${wgHeadLayout.length}件`);
    wgHeadLayout.slice(0,3).forEach(r => {
      console.log(`  "${r.text}"  inner: ${r.innerPat}`);
      console.log(`    words: ${r.allW.map(w=>`${w.t}(${w.cls},y=${w.y})`).join(' ')}`);
    });
    await pg.evaluate(() => { view.k = 1.0; view.x = 10; view.y = 10; applyView(); });
    await wait(100);
    await pg.screenshot({ path: path.join(SS, 'catA_wghead_rom.png'), fullPage: false });
    console.log('  📷 catA_wghead_rom.png');
  }

  await br.close();
  console.log('\n監査完了');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
