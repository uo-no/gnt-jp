/**
 * task7_edge_audit.js — エッジ種別・座標・ルーティング監査
 * READ ONLY。コード・XML変更なし。
 */
const p = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DIR = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat/';
const VW = 1400, VH = 900;
const wait = ms => new Promise(r => setTimeout(r, ms));

async function loadVerse(pg, xmlFile, idx) {
  await pg.evaluate(() => { window.__oldBook = BOOK; });
  await (await pg.$('#fi')).uploadFile(DIR + xmlFile);
  await pg.waitForFunction(`BOOK && BOOK !== window.__oldBook`, {timeout: 30000});
  await pg.evaluate(i => go(i), idx);
  await wait(600);
}

(async () => {
  const b = await p.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox','--disable-dev-shm-usage'],
    defaultViewport: {width: VW, height: VH}
  });
  const pg = await b.newPage();
  await pg.goto(APP); await wait(600);

  // ── Colossians ──
  console.log('=== Colossians 1:3-8 エッジ監査 ===\n');
  await loadVerse(pg, '12-colossians.xml', 2);
  await pg.click('#mL'); await wait(300);

  const colEdges = await pg.evaluate(() => {
    return edges.map(e => {
      const a = e.a, b = e.b;
      const d = pd(e);
      const isL = /V/.test(d) && /H/.test(d);
      const isStraight = /L/.test(d) && !isL;
      // Extract coordinates
      const mMatch = d.match(/^M([0-9.-]+),([0-9.-]+)/);
      const sx = mMatch ? parseFloat(mMatch[1]) : 0;
      const sy = mMatch ? parseFloat(mMatch[2]) : 0;
      const vMatch = d.match(/V([0-9.-]+)/);
      const hMatch = d.match(/H([0-9.-]+)/);
      const lMatch = d.match(/L([0-9.-]+),([0-9.-]+)/);
      const tx = hMatch ? parseFloat(hMatch[1]) : (lMatch ? parseFloat(lMatch[1]) : 0);
      const ty_end = vMatch ? parseFloat(vMatch[1]) : (lMatch ? parseFloat(lMatch[2]) : sy);
      const dx = Math.abs(tx - sx);
      const dy = Math.abs(ty_end - sy);
      return {
        kind: e.kind,
        sx: Math.round(sx), sy: Math.round(sy),
        tx: Math.round(tx), ty: Math.round(ty_end),
        dx: Math.round(dx), dy: Math.round(dy),
        isL, isStraight,
        d: d.substring(0,60),
        aWord: [...(e.a.el||e.a).getElementsByTagName?.('w')??[]].map(w=>w.getAttribute('unicode')).slice(0,2).join(' ') || ''
      };
    }).filter(e => e.kind === 'mod' || e.kind === 'dash');
  });

  console.log('種別 | sx→tx(dx) | sy→ty(dy) | ルーティング | 始点語');
  console.log('─'.repeat(90));
  colEdges.forEach(e => {
    const route = e.isL ? 'L字形' : (e.isStraight ? '直線' : '不明');
    const flag = e.dx > 150 && e.dy > 40 && !e.isL ? '★L字不適用?' : (e.isL && (e.dx>150||e.dy>40) ? '✓L字' : '直線OK');
    console.log(`${e.kind.padEnd(5)} | x${e.sx}→${e.tx}(Δ${e.dx}) | y${e.sy}→${e.ty}(Δ${e.dy}) | ${route.padEnd(7)} ${flag.padEnd(12)} | "${e.aWord}"`);
  });

  // GM上にないが幅を占めるSLOT語句の座標
  console.log('\n--- SLOT語句の位置 (GM外、rk-dx不可) ---');
  const slotWords = await pg.evaluate(() => {
    // GM内のwg要素に含まれない語句 (SLOTエレメント)
    const gmWgs = new Set([...GM.keys()]);
    const result = [];
    for (const w of words) {
      let inGm = false;
      let el = w.el.parentElement;
      while (el) {
        if (gmWgs.has(el)) { inGm = true; break; }
        el = el.parentElement;
      }
      if (!inGm && w.x > 600) {
        result.push({unicode: w.el.getAttribute('unicode'), x: Math.round(w.x), y: Math.round(w.y), xw: Math.round(w.x+w.w)});
      }
    }
    return result;
  });
  slotWords.forEach(w => console.log(`  "${w.unicode}" x=${w.x}~${w.xw} y=${w.y}`));

  const colWidth = await pg.evaluate(() => Math.round(Math.max(...words.map(w=>w.x+w.w))));
  console.log(`\nColossians 全体幅: ${colWidth}px (GM外SLOTを含む)`);

  // ── Luke ──
  console.log('\n\n=== Luke 3:23-38 エッジ監査 ===\n');
  await loadVerse(pg, '03-luke.xml', 119);
  await pg.click('#mL'); await wait(300);

  const lukEdges = await pg.evaluate(() => {
    return edges.map(e => {
      const d = pd(e);
      const isL = /V/.test(d) && /H/.test(d);
      const mMatch = d.match(/^M([0-9.-]+),([0-9.-]+)/);
      const sx = mMatch ? parseFloat(mMatch[1]) : 0;
      const sy = mMatch ? parseFloat(mMatch[2]) : 0;
      const vMatch = d.match(/V([0-9.-]+)/);
      const hMatch = d.match(/H([0-9.-]+)/);
      const lMatch = d.match(/L([0-9.-]+),([0-9.-]+)/);
      const tx = hMatch ? parseFloat(hMatch[1]) : (lMatch ? parseFloat(lMatch[1]) : 0);
      const ty_end = vMatch ? parseFloat(vMatch[1]) : (lMatch ? parseFloat(lMatch[2]) : sy);
      const dx = Math.abs(tx - sx);
      const dy = Math.abs(ty_end - sy);
      return {kind: e.kind, sx: Math.round(sx), sy: Math.round(sy),
              tx: Math.round(tx), ty: Math.round(ty_end),
              dx: Math.round(dx), dy: Math.round(dy), isL,
              d: d.substring(0,70)};
    }).filter(e => (e.kind==='mod'||e.kind==='dash') && (e.dx>100||e.dy>100));
  });

  console.log('種別 | sx→tx(dx) | sy→ty(dy) | ルーティング');
  console.log('─'.repeat(80));
  lukEdges.forEach(e => {
    const route = e.isL ? 'L字形' : '直線';
    const flag = e.dx > 150 && e.dy > 40 && !e.isL ? '★L字不適用?' : (e.isL ? '✓L字' : '直線OK');
    console.log(`${e.kind.padEnd(5)} | x${e.sx}→${e.tx}(Δ${e.dx}) | y${e.sy}→${e.ty}(Δ${e.dy}) | ${route} ${flag}`);
  });

  // fold接続線のみ (L字形のもの)
  const lukLEdges = lukEdges.filter(e => e.isL);
  console.log(`\nL字形エッジ合計: ${lukLEdges.length}件`);
  lukLEdges.forEach(e => console.log(`  ${e.kind} ${e.d}`));

  await b.close();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
