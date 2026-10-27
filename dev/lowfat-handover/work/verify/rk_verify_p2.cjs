/**
 * rk_verify_p2.cjs — Phase 2: LOWFATを基準としたRK図構造検証プロトタイプ
 *
 * READ-ONLY: 対象ファイルを変更しない / Git操作を行わない
 *
 * 検証対象:
 *   1. slot ordering (s / v / o)
 *   2. DetNP  (det inline, same y as head)
 *   3. PrepNp (prep same y as np head)
 *   4. NPofNP (modifier placed below head)
 *   5. Np-Appos
 *   6. predication=elided
 *   7. DetCL
 *
 * 出力: work/verify/output/phase2_report.json + .md
 *
 * 実行: node work/verify/rk_verify_p2.cjs
 *   (lowfat-handover/ から実行)
 */

'use strict';

const pu  = require('./../../tests/node_modules/puppeteer-core');
const fs  = require('fs');
const crypto = require('crypto');
const path   = require('path');

const APP     = 'file:///Users/373da/Claude/開発室/lowfat-handover/app/rk-diagram-m3.html';
const OUT_DIR = path.resolve(__dirname, 'output');
const wait    = ms => new Promise(r => setTimeout(r, ms));

// ── ソースファイル一覧 (SHA-256 記録対象) ──
const SOURCE_FILES = {
  col_final_xml: path.resolve(__dirname, '../../tests/task7_xml/col_final.xml'),
  col_1_1_xml:   path.resolve(__dirname, 'col_1_1.xml'),
  luk_before_xml: path.resolve(__dirname, '../../tests/task7_xml/luk_before.xml'),
  app_html:      path.resolve(__dirname, '../../app/rk-diagram-m3.html'),
};

function sha256(filepath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(filepath));
  return h.digest('hex').slice(0, 16);
}

function recordSHA() {
  const out = {};
  for (const [k, p] of Object.entries(SOURCE_FILES)) {
    out[k] = fs.existsSync(p) ? sha256(p) : 'NOT_FOUND';
  }
  return out;
}

// ── ブラウザ内で実行する共通ヘルパー ──
// (page.evaluate に文字列として渡す)
const BROWSER_HELPERS = `
  // ref → word object マップ
  function buildRefMap() {
    const m = new Map();
    for (const w of words) {
      const ref = w.el.getAttribute('ref');
      if (ref) m.set(ref, w);
    }
    return m;
  }

  // wg DOM 要素内の全 ref を返す
  function refsOf(wgEl) {
    return [...wgEl.querySelectorAll('w')].map(w => w.getAttribute('ref')).filter(Boolean);
  }

  // 平均 x
  function avgX(wObjs) {
    if (!wObjs.length) return null;
    return wObjs.reduce((s,w) => s + w.x, 0) / wObjs.length;
  }

  // 平均 y
  function avgY(wObjs) {
    if (!wObjs.length) return null;
    return wObjs.reduce((s,w) => s + w.y, 0) / wObjs.length;
  }

  function wordsForRefs(refs, refMap) {
    return refs.map(r => refMap.get(r)).filter(Boolean);
  }
`;

// ─────────────────────────────────────────────────────────────
// 個別チェック関数 (page.evaluate の引数として渡す)
// ─────────────────────────────────────────────────────────────

async function runChecks(page, xmlContent, checkFns) {
  // XMLをfreshでロード
  await page.evaluate(xml => fresh(xml), xmlContent);
  await wait(400);

  // wordsが空でないことを確認
  const wCount = await page.evaluate(() => words.length);
  if (wCount === 0) return [{id:'LOAD', verdict:'FAIL', detail:'words[] empty after fresh()'}];

  // ヘルパーを定義して全チェックを一度に実行
  return await page.evaluate(new Function('helperSrc', 'checkFns', `
    eval(helperSrc);
    const results = [];
    const refMap = buildRefMap();
    for (const [id, fn] of Object.entries(checkFns)) {
      try {
        const r = eval('(' + fn + ')')(doc, refMap);
        results.push(...r.map(item => ({id: id + '/' + item.id, ...item})));
      } catch(e) {
        results.push({id, verdict: 'ERROR', detail: e.message});
      }
    }
    return results;
  `), BROWSER_HELPERS, checkFns);
}

// ─────────────────────────────────────────────────────────────
// チェック定義 (文字列で渡す — page.evaluate 経由)
// ─────────────────────────────────────────────────────────────

const CHECK_SLOT_ORDER = `function(doc, refMap) {
  const results = [];
  const clauses = doc.querySelectorAll('wg[class="cl"]');
  let idx = 0;
  for (const cl of clauses) {
    const sEl = cl.querySelector(':scope > wg[role="s"], :scope > w[role="s"]');
    const vEl = cl.querySelector(':scope > wg[role="v"], :scope > w[role="v"]');
    const oEl = cl.querySelector(':scope > wg[role="o"], :scope > w[role="o"]');
    if (!vEl) continue;

    const sRefs = sEl ? refsOf(sEl.tagName==='w' ? {querySelectorAll:()=>[sEl]} : sEl) : [];
    const vRefs = vEl ? (vEl.tagName==='w' ? [vEl.getAttribute('ref')] : refsOf(vEl)) : [];
    const oRefs = oEl ? (oEl.tagName==='w' ? [oEl.getAttribute('ref')] : refsOf(oEl)) : [];

    const sWords = wordsForRefs(sRefs, refMap);
    const vWords = wordsForRefs(vRefs, refMap);
    const oWords = wordsForRefs(oRefs, refMap);

    if (!vWords.length) continue;

    const id = 'slot' + (++idx);
    const vX = avgX(vWords);
    const evidence = [];
    let ok = true;

    if (sWords.length) {
      const sX = avgX(sWords);
      const pass = sX < vX;
      if (!pass) ok = false;
      evidence.push('avgX(s)=' + sX.toFixed(1) + (pass ? ' < ' : ' >= ') + 'avgX(v)=' + vX.toFixed(1));
    }
    if (oWords.length && vWords.length) {
      const oX = avgX(oWords);
      const pass = vX < oX;
      if (!pass) ok = false;
      evidence.push('avgX(v)=' + vX.toFixed(1) + (pass ? ' < ' : ' >= ') + 'avgX(o)=' + oX.toFixed(1));
    }

    if (evidence.length === 0) continue;
    results.push({
      id,
      verdict: ok ? 'PASS' : 'SUSPECT',
      detail: evidence.join('; '),
      vRef: vRefs[0] || '?',
    });
  }
  return results;
}`;

const CHECK_DET_NP = `function(doc, refMap) {
  const results = [];
  const detnps = doc.querySelectorAll('wg[rule="DetNP"]');
  const TOL = 8; // y tolerance px
  let idx = 0;
  for (const wg of detnps) {
    const detEl = wg.querySelector(':scope > w[class="det"]');
    if (!detEl) continue;
    const detRef = detEl.getAttribute('ref');
    const detWord = refMap.get(detRef);
    if (!detWord) continue;

    // 最初の非det word を head とみなす
    const ws = [...wg.querySelectorAll('w')].filter(w => w.getAttribute('class') !== 'det');
    if (!ws.length) continue;
    const headRef = ws[0].getAttribute('ref');
    const headWord = refMap.get(headRef);
    if (!headWord) continue;

    const yDiff = Math.abs(detWord.y - headWord.y);
    const xOk   = detWord.x < headWord.x;
    const yOk   = yDiff <= TOL;
    const ok = xOk && yOk;

    results.push({
      id: 'detnp' + (++idx),
      verdict: ok ? 'PASS' : 'SUSPECT',
      detail: 'det ' + detRef + ' y=' + detWord.y.toFixed(1) + ' x=' + detWord.x.toFixed(1) +
              ' | head ' + headRef + ' y=' + headWord.y.toFixed(1) + ' x=' + headWord.x.toFixed(1) +
              ' | yDiff=' + yDiff.toFixed(1) + '(<=' + TOL + '?' + yOk + ') xOk=' + xOk,
    });
  }
  return results;
}`;

const CHECK_PREP_NP = `function(doc, refMap) {
  const results = [];
  const prepnps = doc.querySelectorAll('wg[rule="PrepNp"]');
  const TOL = 8;
  let idx = 0;
  for (const wg of prepnps) {
    const prepEl = wg.querySelector(':scope > w[class="prep"]');
    if (!prepEl) continue;
    const prepRef = prepEl.getAttribute('ref');
    const prepWord = refMap.get(prepRef);
    if (!prepWord) continue;

    // 最初の非prep word
    const ws = [...wg.querySelectorAll('w')].filter(w => w !== prepEl);
    if (!ws.length) continue;
    const headRef = ws[0].getAttribute('ref');
    const headWord = refMap.get(headRef);
    if (!headWord) continue;

    const yDiff = Math.abs(prepWord.y - headWord.y);
    const xOk   = prepWord.x < headWord.x;
    const yOk   = yDiff <= TOL;
    const ok = xOk && yOk;

    results.push({
      id: 'prepnp' + (++idx),
      verdict: ok ? 'PASS' : 'SUSPECT',
      detail: 'prep ' + prepRef + ' y=' + prepWord.y.toFixed(1) + ' x=' + prepWord.x.toFixed(1) +
              ' | np_head ' + headRef + ' y=' + headWord.y.toFixed(1) + ' x=' + headWord.x.toFixed(1) +
              ' | yDiff=' + yDiff.toFixed(1) + ' xOk=' + xOk,
    });
  }
  return results;
}`;

const CHECK_NP_OF_NP = `function(doc, refMap) {
  const results = [];
  const npofnps = doc.querySelectorAll('wg[rule="NPofNP"]');
  let idx = 0;
  for (const wg of npofnps) {
    // 子 wg / w を取得
    const children = [...wg.children];
    if (children.length < 2) continue;

    // head = 先頭 (非 NONHEAD) の w
    const allW = [...wg.querySelectorAll('w')];
    const NONHEAD = new Set(['det','prep','conj']);
    const headW = allW.find(w => !NONHEAD.has(w.getAttribute('class')));
    if (!headW) continue;
    const headRef = headW.getAttribute('ref');
    const headWord = refMap.get(headRef);
    if (!headWord) continue;

    // modifier = 残りの w 全て (head より下になるはず)
    const modWs = allW.filter(w => w !== headW);
    const modWords = modWs.map(w => refMap.get(w.getAttribute('ref'))).filter(Boolean);
    if (!modWords.length) continue;

    const modAvgY = avgY(modWords);
    const ok = headWord.y <= modAvgY;

    results.push({
      id: 'npofnp' + (++idx),
      verdict: ok ? 'PASS' : 'SUSPECT',
      detail: 'head ' + headRef + ' y=' + headWord.y.toFixed(1) +
              ' | modifiers avgY=' + modAvgY.toFixed(1) +
              ' | head.y <= modAvgY ? ' + ok,
    });
  }
  return results;
}`;

const CHECK_NP_APPOS = `function(doc, refMap) {
  const results = [];
  const appos = doc.querySelectorAll('wg[rule="Np-Appos"]');
  let idx = 0;
  for (const wg of appos) {
    const allW = [...wg.querySelectorAll('w')];
    const ws = allW.map(w => refMap.get(w.getAttribute('ref'))).filter(Boolean);
    if (!ws.length) continue;
    results.push({
      id: 'appos' + (++idx),
      verdict: 'UNDETERMINED',
      detail: 'Np-Appos hoist ロジックは複雑 — 人手確認が必要. words=' +
              ws.length + ' refs=' + allW.slice(0,2).map(w=>w.getAttribute('ref')).join(','),
    });
  }
  return results;
}`;

const CHECK_PRED_ELIDED = `function(doc, refMap) {
  const results = [];
  const elided = doc.querySelectorAll('wg[predication="elided"]');
  let idx = 0;
  for (const wg of elided) {
    const allW = [...wg.querySelectorAll('w')];
    const ws = allW.map(w => refMap.get(w.getAttribute('ref'))).filter(Boolean);
    // 動詞 class="verb" の語が words[] に存在しないことを確認
    const hasVerb = allW.some(w => w.getAttribute('class') === 'verb');
    const layoutHasVerb = ws.some(w => w.el.getAttribute('class') === 'verb');
    results.push({
      id: 'elided' + (++idx),
      verdict: hasVerb ? 'SUSPECT' : 'PASS',
      detail: 'LOWFATに verb あり=' + hasVerb +
              ' / layout に verb=' + layoutHasVerb +
              ' / 含む語数=' + ws.length +
              ' / 先頭ref=' + (allW[0] ? allW[0].getAttribute('ref') : '?'),
    });
  }
  if (!results.length) return [{id:'elided_na', verdict:'NOT_APPLICABLE', detail:'対象 wg[@predication="elided"] なし'}];
  return results;
}`;

const CHECK_DET_CL = `function(doc, refMap) {
  const results = [];
  const detcls = doc.querySelectorAll('wg[rule="DetCL"]');
  const TOL = 8;
  let idx = 0;
  for (const wg of detcls) {
    const detEl = wg.querySelector(':scope > w[class="det"]');
    if (!detEl) continue;
    const detRef = detEl.getAttribute('ref');
    const detWord = refMap.get(detRef);
    if (!detWord) continue;

    // cl 先頭語
    const clWg = wg.querySelector(':scope > wg[class="cl"]');
    const headEl = clWg ? clWg.querySelector('w') : null;
    if (!headEl) continue;
    const headRef = headEl.getAttribute('ref');
    const headWord = refMap.get(headRef);
    if (!headWord) continue;

    const yDiff = Math.abs(detWord.y - headWord.y);
    const xOk   = detWord.x < headWord.x;
    const yOk   = yDiff <= TOL;
    const ok = xOk && yOk;

    results.push({
      id: 'detcl' + (++idx),
      verdict: ok ? 'PASS' : 'SUSPECT',
      detail: 'det ' + detRef + ' y=' + detWord.y.toFixed(1) + ' x=' + detWord.x.toFixed(1) +
              ' | cl_head ' + headRef + ' y=' + headWord.y.toFixed(1) + ' x=' + headWord.x.toFixed(1) +
              ' | yDiff=' + yDiff.toFixed(1) + ' xOk=' + xOk,
    });
  }
  if (!results.length) return [{id:'detcl_na', verdict:'NOT_APPLICABLE', detail:'対象 wg[@rule="DetCL"] なし'}];
  return results;
}`;

// ─────────────────────────────────────────────────────────────
// Markdown レンダラー
// ─────────────────────────────────────────────────────────────

function renderMd(shaMap, allGroups) {
  const lines = [
    '# Phase 2: LOWFATを基準としたRK図構造検証',
    '',
    '**READ-ONLY 検証プロトタイプ — 対象ファイル変更なし**',
    '',
    '## SHA-256 (16 chars) — 検証前記録',
    '',
  ];
  for (const [k, v] of Object.entries(shaMap)) {
    lines.push(`- \`${k}\`: \`${v}\``);
  }
  lines.push('', '---', '');

  const verdictCounts = {PASS:0, SUSPECT:0, UNDETERMINED:0, NOT_APPLICABLE:0, ERROR:0, FAIL:0};

  for (const {label, xmlFile, results} of allGroups) {
    lines.push(`## ${label}`);
    lines.push(`XML: \`${path.basename(xmlFile)}\``);
    lines.push('');
    if (!results.length) {
      lines.push('- (結果なし)');
    }
    for (const r of results) {
      const emoji = r.verdict === 'PASS' ? '✅' :
                    r.verdict === 'SUSPECT' ? '⚠️' :
                    r.verdict === 'NOT_APPLICABLE' ? '—' :
                    r.verdict === 'UNDETERMINED' ? '❓' : '❌';
      lines.push(`- ${emoji} **${r.verdict}** \`${r.id}\`: ${r.detail}`);
      verdictCounts[r.verdict] = (verdictCounts[r.verdict] || 0) + 1;
    }
    lines.push('');
  }

  lines.push('---', '', '## まとめ', '');
  for (const [v, c] of Object.entries(verdictCounts)) {
    if (c) lines.push(`- ${v}: ${c}件`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────────────────────

(async () => {
  fs.mkdirSync(OUT_DIR, {recursive: true});

  // SHA-256 記録 (検証前)
  const shaMap = recordSHA();
  console.log('\n[SHA-256 before verification]');
  for (const [k, v] of Object.entries(shaMap)) console.log(`  ${k}: ${v}`);

  const br = await pu.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'shell',
    args: ['--no-sandbox'],
    defaultViewport: {width: 1280, height: 900},
  });
  const pg = await br.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  pg.on('console', m => m.type() === 'error' && errs.push(m.text()));

  await pg.goto(APP);
  await wait(800);

  const allGroups = [];

  // ── グループ 1: col_final.xml (COL 1:3-8) ──
  // slot ordering, DetNP, PrepNp, NPofNP, Np-Appos, DetCL
  console.log('\n[Loading col_final.xml]');
  const colXml = fs.readFileSync(SOURCE_FILES.col_final_xml, 'utf8');
  const colChecks = {
    slot: CHECK_SLOT_ORDER,
    detnp: CHECK_DET_NP,
    prepnp: CHECK_PREP_NP,
    npofnp: CHECK_NP_OF_NP,
    appos: CHECK_NP_APPOS,
    detcl: CHECK_DET_CL,
  };

  let colResults;
  try {
    colResults = await runChecks(pg, colXml, colChecks);
  } catch (e) {
    colResults = [{id:'COL_ERROR', verdict:'ERROR', detail: e.message}];
  }
  allGroups.push({label: 'COL 1:3-8 (col_final.xml)', xmlFile: SOURCE_FILES.col_final_xml, results: colResults});

  for (const r of colResults) {
    const mark = r.verdict === 'PASS' ? 'PASS' : r.verdict;
    console.log(`  [${mark}] ${r.id}: ${r.detail}`);
  }

  // ── グループ 2: col_1_1.xml (COL 1:1-2) — predication=elided ──
  console.log('\n[Loading col_1_1.xml]');
  const col11Xml = fs.readFileSync(SOURCE_FILES.col_1_1_xml, 'utf8');
  const elidedChecks = {elided: CHECK_PRED_ELIDED};

  let elidedResults;
  try {
    elidedResults = await runChecks(pg, col11Xml, elidedChecks);
  } catch (e) {
    elidedResults = [{id:'ELIDED_ERROR', verdict:'ERROR', detail: e.message}];
  }
  allGroups.push({label: 'COL 1:1-2 — predication=elided (col_1_1.xml)', xmlFile: SOURCE_FILES.col_1_1_xml, results: elidedResults});

  for (const r of elidedResults) {
    const mark = r.verdict === 'PASS' ? 'PASS' : r.verdict;
    console.log(`  [${mark}] ${r.id}: ${r.detail}`);
  }

  await br.close();

  // SHA-256 記録 (検証後) — ファイルが変更されていないことを確認
  const shaMapAfter = recordSHA();
  const shaChanged = Object.entries(shaMap).filter(([k,v]) => shaMapAfter[k] !== v);
  if (shaChanged.length) {
    console.error('\n[ERROR] SHA-256 mismatch after verification:');
    shaChanged.forEach(([k,v]) => console.error(`  ${k}: before=${v} after=${shaMapAfter[k]}`));
  } else {
    console.log('\n[SHA-256 unchanged] 全ソースファイル変更なし — CONFIRMED');
  }

  // コンソールエラー
  if (errs.length) {
    console.warn(`\n[CONSOLE ERRORS: ${errs.length}]`);
    errs.forEach(e => console.warn('  ' + e));
  }

  // 集計
  const allResults = allGroups.flatMap(g => g.results);
  const counts = {};
  for (const r of allResults) counts[r.verdict] = (counts[r.verdict] || 0) + 1;
  console.log('\n[Summary]');
  for (const [v, c] of Object.entries(counts)) console.log(`  ${v}: ${c}`);

  // 出力
  const jsonOut = {
    generated_at: new Date().toISOString(),
    sha256_before: shaMap,
    sha256_after: shaMapAfter,
    sha_unchanged: shaChanged.length === 0,
    console_errors: errs,
    groups: allGroups,
    summary: counts,
  };

  const jsonPath = path.join(OUT_DIR, 'phase2_report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2));
  console.log('\nJSON:', jsonPath);

  const mdPath = path.join(OUT_DIR, 'phase2_report.md');
  fs.writeFileSync(mdPath, renderMd(shaMap, allGroups));
  console.log('MD:  ', mdPath);

  if (counts.ERROR || counts.FAIL) process.exit(1);
})().catch(e => {
  console.error('FATAL:', e.message);
  console.error(e.stack);
  process.exit(1);
});
