/**
 * audit_det_wg.cjs — detInline 未対応「det + wg」構造の分類監査
 *
 * 目的: DetNP / articular wg の直接子 wg を rule ごとに分類し、
 *       カテゴリ A-E に分けて件数・代表例を報告する。
 *       コード変更なし。READ ONLY 監査。
 */
'use strict';
const pu   = require('puppeteer-core');
const fs   = require('fs');
const path = require('path');

const APP  = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const DATA = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat';
const SS   = '/private/tmp/claude-501/-Users-373da-Claude-----gnt-jp/74df3736-90be-4a92-87d3-3205ce42f7fc/scratchpad/audit_det_wg';
const wait = ms => new Promise(r => setTimeout(r, ms));

// ── カテゴリ定義 ──────────────────────────────────────────────
// A: wg 頭語が NPofNP（内部に属格 wg を含む）
// B: wg 頭語が NP-CL / VPofCL / InfCL → 節・不定詞の名詞化
// C: wg 頭語が AdjpNp だが直接子に wg を含む（Fix2 条件外）
// D: wg 頭語が DetAdj / substantive adj → 形容詞実質名詞
// E: wg 頭語がその他（Np-Appos / NpPp / DetNP ネスト / 不明など）
function classify(wgRule, adjpNpHasWgChild) {
  if (!wgRule) return 'E';
  if (/NPofNP/.test(wgRule))               return 'A';
  if (/NP-CL|InfCL|VPofCL|CL/.test(wgRule)) return 'B';
  if (/AdjpNp/.test(wgRule) && adjpNpHasWgChild) return 'C';
  if (/DetAdj/.test(wgRule))               return 'D';
  return 'E';
}

const CAT_DESC = {
  A: 'det + wg(NPofNP) — 名詞に属格句が付属',
  B: 'det + wg(節/不定詞CL) — 冠詞が節・不定詞を名詞化',
  C: 'det + wg(AdjpNp で内部に wg 子あり) — Fix2 条件外の複合形容詞NP',
  D: 'det + wg(DetAdj) — 実質名詞形容詞',
  E: 'det + wg(その他: Np-Appos / NpPp / 不明など)',
};

const BOOKS = [
  '06-romans.xml','07-1corinthians.xml','08-2corinthians.xml',
  '09-galatians.xml','10-ephesians.xml','11-philippians.xml',
  '12-colossians.xml','13-1thessalonians.xml','14-2thessalonians.xml',
  '15-1timothy.xml','16-2timothy.xml','17-titus.xml',
  '18-philemon.xml',
  // 追加で確認したければ以下をアンコメント
  // '01-matthew.xml','02-mark.xml','03-luke.xml','04-john.xml','05-acts.xml',
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

  // ── フェーズ1: XML 解析 ─────────────────────────────────────
  // DOMParser を使ってブラウザ内で全書籍を解析し、
  // det + wg パターンをすべて収集する
  const allResults = [];

  for (const bookFile of BOOKS) {
    const fp = path.join(DATA, bookFile);
    if (!fs.existsSync(fp)) { console.log('SKIP:', bookFile); continue; }
    const xml = fs.readFileSync(fp, 'utf8');

    const rows = await pg.evaluate((xmlStr, book) => {
      const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
      const rows = [];

      // DetNP または articular="true" の wg を列挙
      const wgs = [...doc.querySelectorAll('wg[rule="DetNP"], wg[articular="true"]')];
      for (const wg of wgs) {
        const rule = wg.getAttribute('rule') || '';
        const articular = wg.getAttribute('articular') || '';

        // 直接子 (w / wg) を取得
        const dkids = [...wg.children].filter(c => c.tagName === 'w' || c.tagName === 'wg');
        const detKids   = dkids.filter(c => c.tagName === 'w' && c.getAttribute('class') === 'det');
        const wgKids    = dkids.filter(c => c.tagName === 'wg');
        const nonDetW   = dkids.filter(c => c.tagName === 'w' && c.getAttribute('class') !== 'det');

        // 分類対象: det が1つ以上、かつ wg 子が1つ以上あるもの
        if (detKids.length === 0 || wgKids.length === 0) continue;
        // すでに既存 detInline 条件で対応済みのものを除外
        // (AdjpNp で直接子がすべて w) → 既対応
        const mainWg = wgKids[0];
        const mainWgRule = mainWg.getAttribute('rule') || '';
        const adjpNpAllW = mainWgRule === 'AdjpNp' &&
          [...mainWg.children].every(c => c.tagName === 'w');
        if (adjpNpAllW && wgKids.length === 1 && nonDetW.length === 0) continue; // Fix2 対応済み

        // AdjpNp に wg 子があるか
        const adjpNpHasWgChild = mainWgRule === 'AdjpNp' &&
          [...mainWg.children].some(c => c.tagName === 'wg');

        // 代表テキスト
        const textOf = n => [...n.getElementsByTagName('w')].map(w => w.textContent.trim()).join(' ');
        const detText  = detKids.map(d => d.textContent.trim()).join(' ');
        const wgText   = textOf(mainWg);
        const fullText = textOf(wg);

        // 参照
        const firstW = wg.getElementsByTagName('w')[0];
        const ref    = firstW ? (firstW.getAttribute('ref') || '') : '';

        // 頭語候補（mainWg の直接子から最初の noun/verb など）
        const mainWgChildren = [...mainWg.children].filter(c=>c.tagName==='w'||c.tagName==='wg');
        const headCand = mainWgChildren.find(c=>{
          if(c.tagName==='wg') return true;
          const cl = c.getAttribute('class')||'';
          return !['det','prep','conj'].includes(cl);
        });
        const headText = headCand ? (headCand.tagName==='w' ? headCand.textContent.trim() : textOf(headCand)) : '';

        // 子構造サマリ
        const childSummary = dkids.map(c=>{
          if(c.tagName==='w') return `w.${c.getAttribute('class')||'?'}`;
          return `wg[${c.getAttribute('rule')||'?'}]`;
        }).join(' ');

        rows.push({
          book,
          ref,
          detText,
          headText,
          fullText: fullText.slice(0, 60),
          wgRule: mainWgRule,
          childSummary,
          adjpNpHasWgChild,
          parentRule: rule,
          articular,
        });
      }
      return rows;
    }, xml, bookFile);

    allResults.push(...rows);
    console.log(`[${bookFile}] ${rows.length} ケース`);
  }

  // ── フェーズ2: 分類集計 ───────────────────────────────────
  const cats = { A: [], B: [], C: [], D: [], E: [] };
  for (const r of allResults) {
    const cat = classify(r.wgRule, r.adjpNpHasWgChild);
    r.cat = cat;
    cats[cat].push(r);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('  det + wg 未対応構造 分類結果');
  console.log('══════════════════════════════════════════════');
  console.log(`総件数: ${allResults.length} ケース（対象: ${BOOKS.length} 書籍）\n`);

  for (const cat of ['A','B','C','D','E']) {
    const list = cats[cat];
    console.log(`\n── カテゴリ ${cat}: ${list.length} 件 ──`);
    console.log(`   ${CAT_DESC[cat]}`);
    // rule 別内訳
    const byRule = {};
    for (const r of list) byRule[r.wgRule||'(none)'] = (byRule[r.wgRule||'(none)']||0)+1;
    Object.entries(byRule).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>
      console.log(`   rule="${k}": ${v}件`));
    // 代表例（最大5件）
    const examples = list.slice(0,5);
    if (examples.length) {
      console.log('   代表例:');
      for (const ex of examples) {
        console.log(`     [${ex.ref}] "${ex.fullText}"`);
        console.log(`       children: ${ex.childSummary}`);
        console.log(`       head候補: "${ex.headText}"`);
      }
    }
  }

  // 合計チェック
  const catTotal = Object.values(cats).reduce((s,v)=>s+v.length,0);
  console.log(`\n合計: ${catTotal} ケース（総件数 ${allResults.length} との差: ${allResults.length - catTotal}）`);

  // ── フェーズ3: カテゴリ A の詳細 (ἡ ἀγάπη τοῦ θεοῦ 型) ────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  カテゴリ A 詳細: NPofNP の内部構造');
  console.log('══════════════════════════════════════════════');

  // NPofNP の 内部構造を深掘りする (上位5件 + rule別内訳)
  const npofnpRules = {};
  for (const r of cats['A']) {
    // childSummary に NPofNP の子構造が入っていないので別途解析が必要
    npofnpRules[r.childSummary] = (npofnpRules[r.childSummary]||0)+1;
  }
  console.log('NPofNP 外側 childSummary 別:');
  Object.entries(npofnpRules).sort((a,b)=>b[1]-a[1]).slice(0,15).forEach(([k,v])=>
    console.log(`  ${String(v).padStart(4)}件  ${k}`));

  // ── フェーズ4: カテゴリ A 代表例の実レイアウト確認 ────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('  カテゴリ A 代表5件の実レイアウト (COL/EPH/PHI/1TH)');
  console.log('══════════════════════════════════════════════');

  // NPofNP の例から COL / EPH / 1TH を優先して5件選ぶ
  const bookPriority = ['12-colossians.xml','10-ephesians.xml','13-1thessalonians.xml','11-philippians.xml','06-romans.xml'];
  const catAExamples = [];
  for (const bp of bookPriority) {
    const found = cats['A'].filter(r=>r.book===bp).slice(0,2);
    catAExamples.push(...found);
    if (catAExamples.length >= 5) break;
  }
  if (catAExamples.length < 5) catAExamples.push(...cats['A'].filter(r=>!catAExamples.includes(r)).slice(0,5-catAExamples.length));

  for (const ex of catAExamples.slice(0,5)) {
    const fp = path.join(DATA, ex.book);
    const xml = fs.readFileSync(fp, 'utf8');

    // 当該 sentence を抽出して fresh() で描画
    const sentXml = await pg.evaluate((xmlStr, ref) => {
      const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
      const w = doc.querySelector(`w[ref="${ref}"]`);
      if (!w) return null;
      let s = w;
      while (s && s.tagName !== 'sentence') s = s.parentNode;
      return s ? new XMLSerializer().serializeToString(s) : null;
    }, xml, ex.ref);

    if (!sentXml) { console.log(`  [${ex.ref}] sentence 抽出不可`); continue; }

    await pg.evaluate(sxml => fresh(sxml), sentXml);
    await wait(150);

    const layout = await pg.evaluate((ref) => {
      // 当該 DetNP の冠詞と頭語の y 座標を取得
      const doc2 = window.doc;
      if (!doc2) return null;
      const dets = [...doc2.querySelectorAll('wg[rule="DetNP"] > w[class="det"], wg[articular="true"] > w[class="det"]')];
      const results = [];
      for (const det of dets) {
        const wRef = det.getAttribute('ref') || '';
        if (!wRef.startsWith(ref.slice(0,9))) continue;
        const dw = EW.get(det);
        const parent = det.parentNode;
        // 頭語: parent の直接子 wg (最初の)
        const wgChild = [...parent.children].find(c=>c.tagName==='wg');
        if (!wgChild) continue;
        const nouns = [...wgChild.getElementsByTagName('w')];
        const headW = nouns.find(w => !['det','prep','conj'].includes(w.getAttribute('class')||''));
        const hw = headW ? EW.get(headW) : null;
        results.push({
          ref: wRef,
          detText: det.textContent.trim(),
          detY: dw ? Math.round(dw.y) : null,
          headText: headW ? headW.textContent.trim() : '?',
          headY: hw ? Math.round(hw.y) : null,
          sameLine: dw && hw ? Math.abs(dw.y - hw.y) < 2 : null,
          wgRule: wgChild.getAttribute('rule')||'',
        });
      }
      return results;
    }, ex.ref);

    console.log(`\n  [${ex.ref}] "${ex.fullText}"`);
    console.log(`  children: ${ex.childSummary}`);
    if (layout && layout.length) {
      for (const l of layout) {
        console.log(`    det "${l.detText}" y=${l.detY}  head "${l.headText}" y=${l.headY}  同ライン: ${l.sameLine}  wgRule: ${l.wgRule}`);
      }
    } else {
      console.log('    レイアウト情報取得不可');
    }
  }

  // ── フェーズ5: スクリーンショット (COL の代表例) ────────────
  console.log('\n── スクリーンショット撮影 ──');
  const colAExs = cats['A'].filter(r=>r.book==='12-colossians.xml').slice(0,2);
  const colBExs = cats['B'].filter(r=>r.book==='12-colossians.xml').slice(0,1);
  const ssTargets = [...colAExs, ...colBExs];

  for (const ex of ssTargets) {
    const fp = path.join(DATA, ex.book);
    const xml = fs.readFileSync(fp, 'utf8');
    const sentXml = await pg.evaluate((xmlStr, ref) => {
      const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
      const w = doc.querySelector(`w[ref="${ref}"]`);
      if (!w) return null;
      let s = w;
      while (s && s.tagName !== 'sentence') s = s.parentNode;
      return s ? new XMLSerializer().serializeToString(s) : null;
    }, xml, ex.ref);

    if (!sentXml) continue;

    await pg.evaluate(sxml => fresh(sxml), sentXml);
    await wait(200);
    await pg.evaluate(() => { view.k = 0.6; view.x = 10; view.y = 10; applyView(); });
    await wait(100);

    const safeName = ex.ref.replace(/[^a-zA-Z0-9]/g, '_');
    const ssPath = path.join(SS, `cat${ex.cat}_${safeName}.png`);
    await pg.screenshot({ path: ssPath, fullPage: false });
    console.log(`  📷 cat${ex.cat} [${ex.ref}] → ${path.basename(ssPath)}`);
  }

  await br.close();
  console.log('\n監査完了');
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
