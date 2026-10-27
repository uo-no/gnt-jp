/**
 * det_noun_audit.js — DetNP構造の実態調査
 *
 * 目的:
 *   lowfat XMLの DetNP wg / articular wg の子要素パターンを集計する。
 *   冠詞と名詞の対応関係がXMLで識別できるか、
 *   及び現在の phrase() ロジックがどのパターンで detInline の条件を満たすか確認する。
 *
 * 出力:
 *   1. 子パターン別の件数（[det, noun], [det, adj, noun] 等）
 *   2. 条件 ks[hi].tagName==='w' && rest.every(det) の充足・不充足
 *   3. Puppeteer: 実レイアウトで det が別行になる件数（detInline=false のとき）
 */
const pu = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── フェーズ1: XMLを正規表現で解析 ──
function childPattern(wgXml) {
  // wg直下の w のclass属性を列挙する（ネスト無視の近似）
  // 直接子のみ: ネストを1段だけ剥がして見る
  const direct = [];
  let depth = 0, i = 0;
  while (i < wgXml.length) {
    const openwg = wgXml.indexOf('<wg', i);
    const openw  = wgXml.indexOf('<w ',  i);
    const closewg = wgXml.indexOf('</wg>', i);
    // 次のタグを選ぶ
    let next = -1;
    let kind = '';
    const cands = [
      [openwg, 'openwg'], [openw, 'openw'], [closewg, 'closewg']
    ].filter(([p]) => p >= 0);
    cands.sort((a, b) => a[0] - b[0]);
    if (!cands.length) break;
    [next, kind] = cands[0];
    if (kind === 'closewg') { depth--; i = next + 5; continue; }
    if (kind === 'openwg')  { if (depth === 0) { depth++; i = next + 3; continue; } depth++; i = next + 3; continue; }
    if (kind === 'openw') {
      if (depth === 0) {
        // 直接子の <w
        const m = wgXml.slice(next, next + 300).match(/class="([^"]+)"/);
        direct.push(m ? m[1] : '?');
      }
      const end = wgXml.indexOf('</w>', next);
      i = end >= 0 ? end + 4 : next + 3;
      continue;
    }
    i = next + 1;
  }
  return direct;
}

function scanBook(bookFile) {
  const xml = fs.readFileSync(bookFile, 'utf8');
  const patterns = {};
  let pos = 0;
  while (true) {
    // DetNP wg を探す (rule="DetNP" OR articular="true")
    const a = xml.indexOf('rule="DetNP"', pos);
    const b = xml.indexOf('articular="true"', pos);
    if (a < 0 && b < 0) break;
    const start = (a < 0) ? b : (b < 0 ? a : Math.min(a, b));
    // wg タグの開始を探す（start の前）
    const wgStart = xml.lastIndexOf('<wg', start);
    if (wgStart < 0) { pos = start + 1; continue; }
    // wg の終了を探す（対応する </wg>）
    let depth = 0, i = wgStart;
    let wgEnd = -1;
    while (i < xml.length) {
      const o = xml.indexOf('<wg', i);
      const c = xml.indexOf('</wg>', i);
      if (c < 0) break;
      if (o >= 0 && o < c) { depth++; i = o + 3; }
      else { if (depth <= 1) { wgEnd = c + 5; break; } depth--; i = c + 5; }
    }
    if (wgEnd < 0) { pos = start + 1; continue; }
    const wgXml = xml.slice(wgStart, wgEnd);
    // 直接子の pattern
    const pat = childPattern(wgXml.slice(wgXml.indexOf('>') + 1));
    // ただし最初の > を skipped
    // 実際には wgXml 全体から直接子パターンを取るのは複雑なので
    // 簡易版: wg内の直接 <w class=> を抽出し、入れ子内の <w は除外
    const key = pat.join('+') || '(empty)';
    patterns[key] = (patterns[key] || 0) + 1;
    pos = wgEnd;
  }
  return patterns;
}

// ── フェーズ2: Puppeteer でレイアウト実測 ──
async function layoutAudit(pg, sentXml) {
  const loaded = await pg.evaluate(xml => {
    try { return fresh(xml); } catch(e) { return false; }
  }, sentXml);
  if (!loaded) return null;
  await wait(40);
  return await pg.evaluate(() => {
    // detInline=false の状態で、det と noun が別の y 座標にある NP を探す
    const issues = [];
    doc.querySelectorAll('wg[articular="true"]').forEach(wg => {
      const dets = [...wg.children].filter(c => c.tagName==='w' && (c.getAttribute('class')||'').includes('det'));
      const nouns = [...wg.children].filter(c => c.tagName==='w' && !['det','prep','conj'].includes(c.getAttribute('class')||''));
      if (!dets.length || !nouns.length) return;
      const dw = EW.get(dets[0]), nw = nouns.length ? EW.get(nouns[0]) : null;
      if (!dw || !nw) return;
      const sameLine = Math.abs(dw.y - nw.y) < 2;
      if (!sameLine) {
        issues.push({
          ref: dets[0].getAttribute('ref') || '',
          detText: dw.text, nounText: nw.text,
          detY: Math.round(dw.y), nounY: Math.round(nw.y),
          rule: wg.getAttribute('rule') || '',
          children: [...wg.children].map(c => c.tagName+'.'+(c.getAttribute('class')||'')).join(' '),
        });
      }
    });
    return issues;
  });
}

(async () => {
  const books = [
    '12-colossians.xml', '10-ephesians.xml', '11-philippians.xml',
    '06-romans.xml', '07-1corinthians.xml', '13-1thessalonians.xml',
  ];

  // フェーズ1: パターン集計
  console.log('=== フェーズ1: DetNP 子パターン集計 ===\n');
  const total = {};
  for (const book of books) {
    const fp = path.join(DATA, book);
    if (!fs.existsSync(fp)) continue;
    const pats = scanBook(fp);
    console.log(`[${book}]`);
    Object.entries(pats).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
      console.log(`  ${String(v).padStart(4)}件  ${k}`);
      total[k] = (total[k] || 0) + v;
    });
  }
  console.log('\n[合計]');
  Object.entries(total).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) =>
    console.log(`  ${String(v).padStart(5)}件  ${k}`)
  );

  // フェーズ2: 実レイアウトで別行の案件を確認
  console.log('\n=== フェーズ2: 実レイアウト監査 (detInline=false) ===\n');
  const xmlPath = path.join(
    '/Users/373da/Claude/開発室/lowfat-handover/tests/task7_xml', 'col_final.xml'
  );
  if (!fs.existsSync(xmlPath)) { console.log('col_final.xml なし'); return; }

  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900},
  });
  const pg = await br.newPage();
  pg.on('pageerror', e => console.error('ERR:', e.message));
  await pg.goto(APP); await wait(600);

  // detInline=false が default なので変更不要
  const issues = await layoutAudit(pg, fs.readFileSync(xmlPath, 'utf8'));

  console.log(`Col 1:3-8 で det が別行になっているケース: ${issues?.length || 0}件`);
  if (issues?.length) {
    issues.slice(0, 10).forEach(i =>
      console.log(`  ref=${i.ref} det="${i.detText}"(y=${i.detY}) noun="${i.nounText}"(y=${i.nounY}) rule="${i.rule}" children: ${i.children}`)
    );
  }

  // detInline=true に切り替えて再確認
  await pg.evaluate(xml => fresh(xml), fs.readFileSync(xmlPath, 'utf8'));
  await wait(100);
  await pg.evaluate(() => { detInline = true; refresh(); });
  await wait(100);

  const issuesB = await pg.evaluate(() => {
    const issues = [];
    doc.querySelectorAll('wg[articular="true"]').forEach(wg => {
      const dets = [...wg.children].filter(c => c.tagName==='w' && (c.getAttribute('class')||'').includes('det'));
      const nouns = [...wg.children].filter(c => c.tagName==='w' && !['det','prep','conj'].includes(c.getAttribute('class')||''));
      if (!dets.length || !nouns.length) return;
      const dw = EW.get(dets[0]), nw = nouns.length ? EW.get(nouns[0]) : null;
      if (!dw || !nw) return;
      const sameLine = Math.abs(dw.y - nw.y) < 2;
      if (!sameLine) {
        issues.push({
          ref: dets[0].getAttribute('ref') || '',
          detText: dw.text, nounText: nw.text,
          detY: Math.round(dw.y), nounY: Math.round(nw.y),
          rule: wg.getAttribute('rule') || '',
          children: [...wg.children].map(c => c.tagName+'.'+(c.getAttribute('class')||'')).join(' '),
        });
      }
    });
    return issues;
  });
  console.log(`\ndetInline=true 後に残る別行ケース: ${issuesB?.length || 0}件`);
  if (issuesB?.length) {
    issuesB.forEach(i =>
      console.log(`  ref=${i.ref} det="${i.detText}"(y=${i.detY}) noun="${i.nounText}"(y=${i.nounY}) rule="${i.rule}" children: ${i.children}`)
    );
  }

  // 1TH 3:6 でも確認
  const th36Path = path.join(__dirname, 'pb_candidates/cand_1_1TH_3_6_2.xml');
  if (fs.existsSync(th36Path)) {
    await pg.evaluate(xml => { detInline=false; fresh(xml); }, fs.readFileSync(th36Path, 'utf8'));
    await wait(100);
    const issues36off = await pg.evaluate(() => {
      const r=[];
      doc.querySelectorAll('wg[articular="true"]').forEach(wg=>{
        const dets=[...wg.children].filter(c=>c.tagName==='w'&&(c.getAttribute('class')||'').includes('det'));
        const nouns=[...wg.children].filter(c=>c.tagName==='w'&&!['det','prep','conj'].includes(c.getAttribute('class')||''));
        if(!dets.length||!nouns.length)return;
        const dw=EW.get(dets[0]),nw=EW.get(nouns[0]);
        if(!dw||!nw)return;
        if(Math.abs(dw.y-nw.y)>2)r.push({ref:dets[0].getAttribute('ref')||'',det:dw.text,noun:nw.text,dy:Math.round(dw.y),ny:Math.round(nw.y),ch:[...wg.children].map(c=>c.tagName+'.'+c.getAttribute('class')).join(' ')});
      });
      return r;
    });
    console.log(`\n1TH 3:6 (detInline=false): 別行=${issues36off.length}件`);
    issues36off.forEach(i=>console.log(`  ${i.ref} "${i.det}"(y=${i.dy}) "${i.noun}"(y=${i.ny}) ch:${i.ch}`));

    await pg.evaluate(() => { detInline=true; refresh(); });
    await wait(100);
    const issues36on = await pg.evaluate(() => {
      const r=[];
      doc.querySelectorAll('wg[articular="true"]').forEach(wg=>{
        const dets=[...wg.children].filter(c=>c.tagName==='w'&&(c.getAttribute('class')||'').includes('det'));
        const nouns=[...wg.children].filter(c=>c.tagName==='w'&&!['det','prep','conj'].includes(c.getAttribute('class')||''));
        if(!dets.length||!nouns.length)return;
        const dw=EW.get(dets[0]),nw=EW.get(nouns[0]);
        if(!dw||!nw)return;
        if(Math.abs(dw.y-nw.y)>2)r.push({ref:dets[0].getAttribute('ref')||'',det:dw.text,noun:nw.text,dy:Math.round(dw.y),ny:Math.round(nw.y),ch:[...wg.children].map(c=>c.tagName+'.'+c.getAttribute('class')).join(' ')});
      });
      return r;
    });
    console.log(`1TH 3:6 (detInline=true): 別行=${issues36on.length}件`);
    issues36on.forEach(i=>console.log(`  ${i.ref} "${i.det}"(y=${i.dy}) "${i.noun}"(y=${i.ny}) ch:${i.ch}`));
  }

  await br.close();
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
