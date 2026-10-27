/**
 * audit_det_wg_detail.cjs — 分類監査フェーズ2
 *
 * 目的:
 *   1. Category A (NPofNP) の実レイアウト座標を取得し、
 *      det が noun より大幅に低い位置に置かれていることを確認する
 *   2. NPofNP 内部構造を詳細集計する（wg頭語の有無）
 *   3. Category C (AdjpNp with wg children) の内部構造を確認
 *   4. Category D (NPDetAdj) の内部構造を確認
 *   5. Category E の rule 別に代表例を記録する
 */
'use strict';
const pu   = require('puppeteer-core');
const fs   = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const SS   = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/audit_det_wg2';
const wait = ms => new Promise(r => setTimeout(r, ms));

const BOOKS_4 = [
  '12-colossians.xml',
  '10-ephesians.xml',
  '11-philippians.xml',
  '13-1thessalonians.xml',
];

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
  // フェーズ1: NPofNP 内部構造の集計 (4書籍)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('フェーズ1: NPofNP 内部構造の集計 (COL/EPH/PHI/1TH)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const npofnpStats = { wHead: 0, wgHead: 0, total: 0, innerPatterns: {} };
  const catCStats   = { innerPatterns: {}, total: 0 };
  const catDStats   = { innerPatterns: {}, total: 0 };
  const catEExamples = {};

  for (const bookFile of BOOKS_4) {
    const fp = path.join(DATA, bookFile);
    if (!fs.existsSync(fp)) continue;
    const xml = fs.readFileSync(fp, 'utf8');

    const res = await pg.evaluate((xmlStr) => {
      const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
      const results = { npofnp: [], catC: [], catD: [], catE: [] };

      const articularWgs = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
      for (const wg of articularWgs) {
        const dkids = [...wg.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
        const detKids = dkids.filter(c => c.tagName === 'w' && c.getAttribute('class') === 'det');
        const wgKids  = dkids.filter(c => c.tagName === 'wg');
        const nonDetW = dkids.filter(c => c.tagName === 'w' && c.getAttribute('class') !== 'det');
        if (detKids.length === 0 || wgKids.length === 0) continue;

        const mainWg     = wgKids[0];
        const mainWgRule = mainWg.getAttribute('rule') || '';
        const adjpNpAllW = mainWgRule === 'AdjpNp' && [...mainWg.children].every(c => c.tagName === 'w');
        if (adjpNpAllW && wgKids.length === 1 && nonDetW.length === 0) continue; // Fix2 済み

        const firstW = wg.getElementsByTagName('w')[0];
        const ref    = firstW ? (firstW.getAttribute('ref') || '') : '';
        const textOf = n => [...n.getElementsByTagName('w')].map(w => w.textContent.trim()).join(' ');
        const fullText = textOf(wg).slice(0, 50);

        // NPofNP 詳細
        if (mainWgRule === 'NPofNP') {
          const inner = [...mainWg.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
          const innerPat = inner.map(c => {
            if (c.tagName === 'w') return `w.${c.getAttribute('class')||'?'}`;
            return `wg[${c.getAttribute('rule')||'?'}]`;
          }).join(' ');
          const headIsW = inner[0] && inner[0].tagName === 'w';
          // 頭語が noun/adj/verb か判定（NONHEAD 以外）
          const NONHEAD = new Set(['det','prep','conj']);
          const firstNonHead = inner.find(c => c.tagName==='w' && !NONHEAD.has(c.getAttribute('class')||''));
          const headTag = firstNonHead ? 'w' : (inner.find(c=>c.tagName==='wg') ? 'wg' : '?');
          results.npofnp.push({ ref, fullText, innerPat, headTag });
        }

        // AdjpNp with wg (Cat C)
        if (mainWgRule === 'AdjpNp') {
          const inner = [...mainWg.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
          const innerPat = inner.map(c => {
            if (c.tagName === 'w') return `w.${c.getAttribute('class')||'?'}`;
            return `wg[${c.getAttribute('rule')||'?'}]`;
          }).join(' ');
          results.catC.push({ ref, fullText, innerPat });
        }

        // NPDetAdj (Cat D)
        if (/DetAdj/.test(mainWgRule)) {
          const inner = [...mainWg.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
          const innerPat = inner.map(c => {
            if (c.tagName === 'w') return `w.${c.getAttribute('class')||'?'}`;
            return `wg[${c.getAttribute('rule')||'?'}]`;
          }).join(' ');
          results.catD.push({ ref, fullText, innerPat });
        }

        // Cat E (others)
        if (!/NPofNP|AdjpNp|DetAdj|NP-CL/.test(mainWgRule)) {
          results.catE.push({ ref, fullText, rule: mainWgRule });
        }
      }
      return results;
    }, xml);

    // NPofNP 集計
    for (const r of res.npofnp) {
      npofnpStats.total++;
      if (r.headTag === 'w') npofnpStats.wHead++;
      else npofnpStats.wgHead++;
      npofnpStats.innerPatterns[r.innerPat] = (npofnpStats.innerPatterns[r.innerPat]||0)+1;
    }
    // Cat C
    for (const r of res.catC) {
      catCStats.total++;
      catCStats.innerPatterns[r.innerPat] = (catCStats.innerPatterns[r.innerPat]||0)+1;
    }
    // Cat D
    for (const r of res.catD) {
      catDStats.total++;
      catDStats.innerPatterns[r.innerPat] = (catDStats.innerPatterns[r.innerPat]||0)+1;
    }
    // Cat E
    for (const r of res.catE) {
      if (!catEExamples[r.rule]) catEExamples[r.rule] = [];
      if (catEExamples[r.rule].length < 2) catEExamples[r.rule].push({ ...r, book: bookFile });
    }

    console.log(`[${bookFile}] NPofNP=${res.npofnp.length} CatC=${res.catC.length} CatD=${res.catD.length} CatE=${res.catE.length}`);
  }

  // NPofNP 内部パターン集計
  console.log(`\nNPofNP 内部 (4書籍合計: ${npofnpStats.total}件):`);
  console.log(`  頭語が w: ${npofnpStats.wHead}件, wg: ${npofnpStats.wgHead}件`);
  console.log('\n  内部パターン (上位15件):');
  Object.entries(npofnpStats.innerPatterns).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>
    console.log(`    ${String(v).padStart(4)}件  ${k}`));

  console.log(`\nCategory C AdjpNp内部 (${catCStats.total}件):`);
  Object.entries(catCStats.innerPatterns).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>
    console.log(`    ${String(v).padStart(4)}件  ${k}`));

  console.log(`\nCategory D NPDetAdj内部 (${catDStats.total}件):`);
  Object.entries(catDStats.innerPatterns).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([k,v])=>
    console.log(`    ${String(v).padStart(4)}件  ${k}`));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズ2: 実レイアウト確認 (COL 1:3 τοῦ κυρίου ἡμῶν)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('フェーズ2: Cat A 代表例の実レイアウト座標');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // COL 1:3-8 (col_final.xml) を使用し、実レイアウトを取得
  const colXml = fs.readFileSync('/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml/col_final.xml', 'utf8');
  await pg.evaluate(xml => fresh(xml), colXml);
  await wait(300);

  const catALayout = await pg.evaluate(() => {
    // DetNP または articular wg を持つ全 NP を走査
    const results = [];
    const wgs = [...window.doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
    for (const wg of wgs) {
      const dkids = [...wg.children].filter(c => c.tagName==='w' || c.tagName==='wg');
      const detKids = dkids.filter(c => c.tagName==='w' && c.getAttribute('class')==='det');
      const wgKids  = dkids.filter(c => c.tagName==='wg');
      if (!detKids.length || !wgKids.length) continue;

      const mainWg     = wgKids[0];
      const mainWgRule = mainWg.getAttribute('rule') || '';
      if (mainWgRule !== 'NPofNP') continue;

      const textOf = n => [...n.getElementsByTagName('w')].map(w => w.textContent.trim()).join(' ');
      const firstDetW  = detKids[0];
      const dw = EW.get(firstDetW);
      // NPofNP の最初の noun/adj word
      const NONHEAD = new Set(['det','prep','conj']);
      const headW = [...mainWg.getElementsByTagName('w')].find(w=>!NONHEAD.has(w.getAttribute('class')||''));
      const hw = headW ? EW.get(headW) : null;
      // NPofNP の gen 部分（最後のw）
      const allW = [...mainWg.getElementsByTagName('w')];
      const genW = allW.length>1 ? allW[allW.length-1] : null;
      const gw = genW ? EW.get(genW) : null;

      results.push({
        text:    textOf(wg).slice(0,40),
        detText: firstDetW.textContent.trim(),
        detY:    dw  ? Math.round(dw.y)  : null,
        headText: headW ? headW.textContent.trim() : '?',
        headY:   hw  ? Math.round(hw.y)  : null,
        genText: genW ? genW.textContent.trim() : '?',
        genY:    gw  ? Math.round(gw.y)  : null,
        sameLine: dw && hw ? Math.abs(dw.y - hw.y) < 2 : null,
        detBelowGen: dw && gw ? dw.y > gw.y : null,
      });
    }
    return results;
  });

  console.log(`Cat A (NPofNP) レイアウト (col_final.xml, ${catALayout.length}件):`);
  for (const r of catALayout) {
    console.log(`  "${r.text}"`);
    console.log(`    det "${r.detText}" y=${r.detY}  noun "${r.headText}" y=${r.headY}  gen "${r.genText}" y=${r.genY}`);
    console.log(`    同ライン: ${r.sameLine}  det は gen より下: ${r.detBelowGen}`);
  }

  // ズームアップ SS: NPofNP の例
  await pg.evaluate(() => { view.k = 0.9; view.x = 10; view.y = 10; applyView(); });
  await wait(100);
  await pg.screenshot({ path: path.join(SS, 'catA_col13_zoom.png'), fullPage: false });
  console.log('\n  📷 catA_col13_zoom.png (COL 1:3-8 全体)');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズ3: Cat C 代表例 (ὁ παλαιὸς ἡμῶν ἄνθρωπος)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('フェーズ3: Cat C 代表例の確認 (AdjpNp with wg)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ROM 6:6 ὁ παλαιὸς ἡμῶν ἄνθρωπος → COL の対応例を探す
  // COL 3:9 τὸν παλαιὸν ἄνθρωπον は AdjpNp([adj, noun]) で Fix2 対応済み
  // ここでは "ἡμῶν" が入る ROM 6:6 をロード

  // 検証: COL の AdjpNp with wg child を確認
  const colAdjpNpWg = await pg.evaluate(() => {
    const doc2 = window.doc;
    const results = [];
    const wgs = [...doc2.querySelectorAll('wg[rule="AdjpNp"]')];
    for (const wg of wgs) {
      const inner = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
      const hasWgChild = inner.some(c=>c.tagName==='wg');
      if (!hasWgChild) continue;
      const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
      const innerPat = inner.map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');
      results.push({ text: textOf(wg).slice(0,40), innerPat });
    }
    return results;
  });
  console.log(`COL 1:3-8 の AdjpNp(wg子あり): ${colAdjpNpWg.length}件`);
  colAdjpNpWg.forEach(r=>console.log(`  "${r.text}"  inner: ${r.innerPat}`));

  // ROM 6:6 の sentence を抽出
  const romXml = fs.readFileSync(path.join(DATA, '06-romans.xml'), 'utf8');
  const rom66Sent = await pg.evaluate((xmlStr) => {
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const w = doc.querySelector('w[ref="ROM 6:6!1"]');
    if (!w) return null;
    let s = w; while (s && s.tagName !== 'sentence') s = s.parentNode;
    return s ? new XMLSerializer().serializeToString(s) : null;
  }, romXml);

  if (rom66Sent) {
    await pg.evaluate(s => fresh(s), rom66Sent);
    await wait(200);

    const rom66Layout = await pg.evaluate(() => {
      const results = [];
      const wgs = [...window.doc.querySelectorAll('wg[rule="AdjpNp"]')];
      for (const wg of wgs) {
        const inner = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        if (!inner.some(c=>c.tagName==='wg')) continue;
        const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
        const innerPat = inner.map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');

        // NONHEAD以外の最初の w が adj かどうか
        const NONHEAD = new Set(['det','prep','conj']);
        const headW = inner.find(c=>c.tagName==='w'&&!NONHEAD.has(c.getAttribute('class')||''));
        const nounW = inner.find(c=>c.tagName==='w'&&c.getAttribute('class')==='noun');
        const hw = headW ? EW.get(headW) : null;
        const nw = nounW ? EW.get(nounW) : null;

        // 親が DetNP の場合の det を取得
        const parent = wg.parentNode;
        const detW = parent ? [...parent.children].find(c=>c.tagName==='w'&&c.getAttribute('class')==='det') : null;
        const dw = detW ? EW.get(detW) : null;

        results.push({
          text: textOf(wg).slice(0,50),
          innerPat,
          headText: headW?headW.textContent.trim():'?',
          headY: hw?Math.round(hw.y):null,
          nounText: nounW?nounW.textContent.trim():'?',
          nounY: nw?Math.round(nw.y):null,
          detText: detW?detW.textContent.trim():null,
          detY: dw?Math.round(dw.y):null,
        });
      }
      return results;
    });

    console.log('\nROM 6:6 AdjpNp(wg子あり) レイアウト:');
    rom66Layout.forEach(r => {
      console.log(`  "${r.text}"`);
      console.log(`    inner: ${r.innerPat}`);
      console.log(`    head "${r.headText}" y=${r.headY}  noun "${r.nounText}" y=${r.nounY}  det "${r.detText}" y=${r.detY}`);
    });

    await pg.evaluate(() => { view.k = 0.9; view.x = 10; view.y = 10; applyView(); });
    await wait(100);
    await pg.screenshot({ path: path.join(SS, 'catC_rom66.png'), fullPage: false });
    console.log('  📷 catC_rom66.png');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズ4: Cat D NPDetAdj の例 (1CO 7:14)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('フェーズ4: Cat D 代表例 (NPDetAdj)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const cor1Xml = fs.readFileSync(path.join(DATA, '07-1corinthians.xml'), 'utf8');
  const cor714Sent = await pg.evaluate((xmlStr) => {
    const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const w = doc.querySelector('w[ref="1CO 7:14!1"]');
    if (!w) return null;
    let s = w; while (s && s.tagName !== 'sentence') s = s.parentNode;
    return s ? new XMLSerializer().serializeToString(s) : null;
  }, cor1Xml);

  if (cor714Sent) {
    await pg.evaluate(s => fresh(s), cor714Sent);
    await wait(200);

    const cor714Layout = await pg.evaluate(() => {
      const results = [];
      const wgs = [...window.doc.querySelectorAll('wg[rule="NPDetAdj"], wg[rule="DetAdj"]')];
      for (const wg of wgs) {
        const textOf = n=>[...n.getElementsByTagName('w')].map(w=>w.textContent.trim()).join(' ');
        const inner = [...wg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const innerPat = inner.map(c=>c.tagName==='w'?`w.${c.getAttribute('class')||'?'}`:`wg[${c.getAttribute('rule')||'?'}]`).join(' ');
        // 全語 y 座標
        const allW = [...wg.getElementsByTagName('w')].map(w=>({t:w.textContent.trim(),y:Math.round((EW.get(w)||{y:null}).y)}));
        // 外側の親が detInline の場合の det を確認
        const parent = wg.parentNode;
        const detW = parent ? [...parent.children].find(c=>c.tagName==='w'&&c.getAttribute('class')==='det') : null;
        const dw = detW ? EW.get(detW) : null;
        results.push({
          rule: wg.getAttribute('rule')||'',
          text: textOf(wg).slice(0,50),
          innerPat,
          allW,
          detText: detW?detW.textContent.trim():null,
          detY: dw?Math.round(dw.y):null,
        });
      }
      return results;
    });

    console.log('1CO 7:14 NPDetAdj レイアウト:');
    cor714Layout.forEach(r => {
      console.log(`  rule="${r.rule}" "${r.text}"`);
      console.log(`    inner: ${r.innerPat}`);
      console.log(`    words: ${r.allW.map(w=>`${w.t}(y=${w.y})`).join(' ')}`);
      console.log(`    外側det "${r.detText}" y=${r.detY}`);
    });

    await pg.evaluate(() => { view.k = 0.9; view.x = 10; view.y = 10; applyView(); });
    await wait(100);
    await pg.screenshot({ path: path.join(SS, 'catD_1co714.png'), fullPage: false });
    console.log('  📷 catD_1co714.png');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // フェーズ5: Cat E 代表例まとめ
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('フェーズ5: Cat E 代表例 (rule 別)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  for (const [rule, exs] of Object.entries(catEExamples).sort((a,b)=>a[0].localeCompare(b[0]))) {
    console.log(`  rule="${rule}":`);
    exs.forEach(e => console.log(`    [${e.ref}] "${e.fullText}" (${e.book})`));
  }

  await br.close();
  console.log('\n監査完了');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
