/**
 * pb_candidate_scan.js — ページ区切り候補文スキャン
 * Node.js + puppeteer-core のみ (@xmldom 不要)
 *
 * フェーズ1: regex で sentence ブロック抽出 → 語数・isCl-stack 候補を絞る
 * フェーズ2: Puppeteer でレイアウト実測 → GM の hasNext:true グループ検出
 * 出力: y=844(sp-std 1画面目下端)に最も近い境界を持つ文 上位15件
 */
const pu = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── regex ヘルパ ──
function extractSentences(xml) {
  const out = [];
  let i = 0;
  while (true) {
    const s = xml.indexOf('<sentence', i);
    if (s < 0) break;
    const e = xml.indexOf('</sentence>', s);
    if (e < 0) break;
    out.push(xml.slice(s, e + '</sentence>'.length));
    i = e + 1;
  }
  return out;
}

// wg タグの直接子 wg を返す (正規表現で近似)
// wg の中の wg の depth 0 の子だけ取り出すのは難しいので
// 簡略版: "全 wg 数" と "isCl 候補となる wg の数" から判定
function prescanSent(sentXml) {
  // 語数
  const wCount = (sentXml.match(/<w /g) || []).length;
  if (wCount < 25) return false;

  // isCl チェック: class="cl" OR type="group" OR rule="...Conj..." の wg を数える
  const clWgCount = (sentXml.match(/class="cl"|type="group"|rule="[^"]*Conj/g) || []).length;
  // 2個以上の cl 相当 wg があれば候補とみなす (粗い判定)
  return clWgCount >= 2;
}

function firstRef(sentXml) {
  const m = sentXml.match(/ref="([^"]+)"/);
  return m ? m[1] : '';
}

// ── フェーズ1: プリフィルタ ──
function prescanBook(bookFile) {
  const xml = fs.readFileSync(bookFile, 'utf8');
  const sents = extractSentences(xml);
  const results = [];
  for (const s of sents) {
    if (!prescanSent(s)) continue;
    const wCount = (s.match(/<w /g) || []).length;
    results.push({ ref: firstRef(s), wordCount: wCount, sentXml: s });
  }
  return results;
}

// ── フェーズ2: Puppeteer レイアウト実測 ──
async function layoutCheck(pg, sentXml) {
  const loaded = await pg.evaluate(xml => {
    try { return fresh(xml); } catch(e) { return false; }
  }, sentXml);
  if (!loaded) return null;
  await wait(60);

  return await pg.evaluate(() => {
    if (!words.length) return null;
    const maxY = Math.max(...words.map(w => w.y));
    if (maxY < 500) return null;

    const gmList = [];
    for (const [g] of GM) {
      const ws = [...g.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean);
      if (!ws.length) continue;
      const bottom = Math.round(pbGroupBottom(g));
      const hasNext = !!pbNextGroup(g);
      if (!hasNext) continue;
      const parent = g.parentNode;
      const siblings = parent
        ? [...parent.children].filter(c => c.tagName === 'wg' && GM.has(c))
        : [];
      const nextEl = pbNextGroup(g);
      const nextWs = nextEl
        ? [...nextEl.getElementsByTagName('w')].map(e => EW.get(e)).filter(Boolean)
        : [];
      const nextMinY = nextWs.length ? Math.round(Math.min(...nextWs.map(w => w.y))) : null;
      const minY = Math.round(Math.min(...ws.map(w => w.y)));
      gmList.push({
        bottom, minY, nextMinY,
        siblingCount: siblings.length,
        label: bd(g),
        nextLabel: nextEl ? bd(nextEl) : '',
        cls: g.getAttribute('class') || '',
        parentTag: g.parentNode ? g.parentNode.tagName : '',
        parentCls: g.parentNode ? (g.parentNode.getAttribute('class') || '') : '',
      });
    }
    return { maxY: Math.round(maxY), wordCount: words.length, groups: gmList };
  });
}

(async () => {
  // 書簡書・説話的長文を含む主要書
  const books = [
    '06-romans.xml', '07-1corinthians.xml', '08-2corinthians.xml',
    '09-galatians.xml', '10-ephesians.xml', '11-philippians.xml',
    '12-colossians.xml', '13-1thessalonians.xml', '19-hebrews.xml',
    '03-luke.xml', '04-john.xml', '01-matthew.xml', '05-acts.xml',
    '14-2thessalonians.xml', '15-1timothy.xml',
  ];

  // フェーズ1
  console.log('=== フェーズ1: プリフィルタ ===');
  let allCands = [];
  for (const book of books) {
    const fp = path.join(DATA, book);
    if (!fs.existsSync(fp)) { console.log('  SKIP (not found):', book); continue; }
    const found = prescanBook(fp);
    console.log(`  ${book}: ${found.length}件`);
    allCands = allCands.concat(found.map(c => ({...c, book})));
  }
  allCands.sort((a, b) => b.wordCount - a.wordCount);
  console.log(`  計 ${allCands.length}件 (語数降順)\n`);

  // フェーズ2
  console.log('=== フェーズ2: レイアウト実測 ===');
  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell', args: ['--no-sandbox'],
    defaultViewport: {width: 1400, height: 900},
  });
  const pg = await br.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(APP); await wait(600);

  const SCREEN = 844; // sp-std 1画面目下端
  const scored = [];
  const LIMIT = 300;
  let checked = 0;

  for (const cand of allCands.slice(0, LIMIT)) {
    const res = await layoutCheck(pg, cand.sentXml);
    checked++;
    if (!res || !res.groups.length) continue;

    for (const g of res.groups) {
      if (g.bottom < 300 || g.bottom > 1800) continue;
      const dist = Math.abs(g.bottom - SCREEN);
      scored.push({
        ref: cand.ref, book: cand.book, wordCount: cand.wordCount,
        totalH: res.maxY, dist, ...g,
        sentXml: cand.sentXml,
      });
    }
    if (checked % 30 === 0) {
      console.log(`  ${checked}/${Math.min(allCands.length, LIMIT)} 処理... 現在 ${scored.length}件ヒット`);
    }
  }

  await br.close();

  // y=844 に近い順 → sibling 数多い順
  scored.sort((a, b) => a.dist - b.dist || b.siblingCount - a.siblingCount);

  console.log('\n=== 結果: ページ区切り候補 (距離順) ===\n');
  const shown = new Set();
  let rank = 0;
  for (const s of scored) {
    if (shown.has(s.ref)) continue; // 同一文の複数境界は1件として表示
    shown.add(s.ref);
    rank++;
    console.log(`[${rank}] ${s.ref}  (${s.book})`);
    console.log(`    語数:${s.wordCount}  図高:${s.totalH}px`);
    console.log(`    境界 bottom:${s.bottom}px  (|844-bottom|=${s.dist}px)  sibling数:${s.siblingCount}`);
    console.log(`    境界グループ: "${s.label}"  (class="${s.cls}" parent:${s.parentTag}.${s.parentCls})`);
    console.log(`    次グループ: "${s.nextLabel}"  (y開始=${s.nextMinY})`);
    if (rank >= 15) break;
  }

  // 上位3文のXMLを保存 (後で実テスト用)
  const outDir = path.join(__dirname, 'pb_candidates');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  let saved = 0;
  for (const s of scored) {
    if (saved >= 3) break;
    // 重複スキップ
    const fname = `cand_${saved+1}_${s.ref.replace(/[^A-Za-z0-9]/g,'_')}.xml`;
    const already = fs.readdirSync(outDir).some(f => f.includes(s.ref.replace(/[^A-Za-z0-9]/g,'_')));
    if (already) continue;
    fs.writeFileSync(path.join(outDir, fname), s.sentXml, 'utf8');
    console.log(`\n💾 保存: tests/pb_candidates/${fname}`);
    saved++;
  }

  if (errs.length) {
    console.log('\nブラウザエラー (' + errs.length + '件):');
    errs.slice(0, 5).forEach(e => console.log('  ' + e));
  }
  console.log('\n完了');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
