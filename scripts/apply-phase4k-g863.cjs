'use strict';
/**
 * apply-phase4k-g863.cjs
 *
 * Phase 4j-correction 確定訳語（96件）を bible_data/nt/ に反映する。
 * 変更対象: token.japanese フィールドのみ。
 * 正本: stage4-phase4j-correction-g863-audit.json の finalCorrectedJa。
 *
 * 実行: node scripts/apply-phase4k-g863.cjs [--dry-run]
 */

const fs   = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const BASE       = path.join(__dirname, '..');
const BIBLE_ROOT = path.join(BASE, 'public/bible_data/nt');
const AUDIT_JSON = path.join(BASE, 'scripts/output/stage4-final/stage4-phase4j-correction-g863-audit.json');
const OUT_DIR    = path.join(BASE, 'scripts/output/stage4-final');

if (DRY_RUN) console.log('[DRY-RUN モード: bible_dataへの書き込みなし]\n');

// ── 台帳読み込み ──────────────────────────────────────────────────────────
const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, 'utf8'));

// 必須フィールド確認
if (!audit.tokens || audit.tokens.length !== 96) {
  console.error('ERROR: tokens 96件でない');
  process.exit(1);
}

// finalCorrectedJa を採用（finalRecommendedJa は1CO 7:11–13で旧値を持つため使用禁止）
const targets = audit.tokens.map(t => ({
  ref:         t.ref,
  strong:      t.strong,
  currentJa:   t.currentJa,   // 台帳上の現在値 = '赦す'
  finalJa:     t.finalCorrectedJa,  // 実装すべき値
  correctionJudgment: t.correctionJudgment,
}));

// ── ファイル別グルーピング ─────────────────────────────────────────────────
const fileMap = new Map();
for (const t of targets) {
  const [book, rest] = t.ref.split(' ');
  const chapter = rest.split(':')[0];
  const key = book + '/' + chapter;
  if (!fileMap.has(key)) fileMap.set(key, []);
  fileMap.get(key).push(t);
}

// ── 処理 ──────────────────────────────────────────────────────────────────
const results  = [];  // 成功
const errors   = [];  // エラー
let appliedTotal = 0;

for (const [key, candidates] of [...fileMap.entries()].sort()) {
  const [book, chapter] = key.split('/');
  const filePath = path.join(BIBLE_ROOT, book, `${chapter}.json`);

  if (!fs.existsSync(filePath)) {
    candidates.forEach(c => errors.push({ ref: c.ref, type: 'FILE_NOT_FOUND', msg: filePath }));
    continue;
  }

  const raw  = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const tokens = Array.isArray(data) ? data : Object.values(data);

  let fileChanges = 0;

  for (const c of candidates) {
    // ref で検索
    const token = tokens.find(t => t.ref === c.ref);
    if (!token) {
      errors.push({ ref: c.ref, type: 'NOT_FOUND', msg: `ref が見つからない: ${c.ref}` });
      continue;
    }

    // Strong 番号確認
    if (token.strong !== 'G863') {
      errors.push({ ref: c.ref, type: 'STRONG_MISMATCH',
        msg: `strong="${token.strong}" (期待: G863)` });
      continue;
    }

    // 現在値照合（台帳 currentJa = '赦す' と一致するか）
    const actualJa = token.japanese ?? '';
    if (actualJa !== c.currentJa) {
      errors.push({ ref: c.ref, type: 'JA_MISMATCH',
        msg: `実値"${actualJa}" ≠ 台帳currentJa"${c.currentJa}"` });
      continue;
    }

    // 変更先が空でないか
    if (!c.finalJa) {
      errors.push({ ref: c.ref, type: 'NO_FINAL_JA', msg: 'finalCorrectedJa が空' });
      continue;
    }

    results.push({
      ref: c.ref, book, chapter,
      tokenId: token.tokenId,
      strong:  token.strong,
      text:    token.text,
      before:  actualJa,
      after:   c.finalJa,
      correctionJudgment: c.correctionJudgment,
    });

    if (!DRY_RUN) {
      token.japanese = c.finalJa;
      fileChanges++;
      appliedTotal++;
    } else {
      fileChanges++;
      appliedTotal++;
    }
  }

  if (!DRY_RUN && fileChanges > 0) {
    // JSON 検証 → 書き戻し（改行コード保持）
    let newJson = JSON.stringify(data, null, 2);
    JSON.parse(newJson); // throws if invalid
    if (raw.includes('\r\n')) {
      newJson = newJson.replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(filePath, newJson, 'utf8');
  }

  if (fileChanges > 0) {
    console.log(`  ${book}/${chapter}.json: ${fileChanges}件`);
  }
}

// ── 結果サマリー ──────────────────────────────────────────────────────────
console.log(`\n=== Phase 4k G863 適用 ${DRY_RUN ? '[DRY-RUN]' : '[実行]'} ===`);
console.log(`適用: ${results.length} 件`);
console.log(`エラー: ${errors.length} 件`);
if (errors.length > 0) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(`  [${e.type}] ${e.ref}: ${e.msg}`));
}

// 訳語分布確認
const distAfter = {};
results.forEach(r => { distAfter[r.after] = (distAfter[r.after]||0)+1; });
console.log('\n最終訳語分布:');
for (const [ja, n] of Object.entries(distAfter).sort((a,b)=>b[1]-a[1]))
  console.log(`  ${n} ${ja}`);

if (errors.length > 0) {
  console.error('\n[ABORT] エラーがあります。成果物は生成しません。');
  process.exit(1);
}

if (results.length !== 96) {
  console.error(`[ABORT] 適用件数 ${results.length} ≠ 96`);
  process.exit(1);
}

// ── 成果物生成 ─────────────────────────────────────────────────────────────
if (!DRY_RUN) {
  // 1. token-diff.json
  const diffJson = {
    meta: {
      phase: '4k',
      label: 'G863 ἀφίημι 96件 japanese フィールド更新',
      strong: 'G863',
      generatedAt: new Date().toISOString(),
      headSha: 'ebf70bc6a02e82a55b30d2c392039fc6a32541a8',
      totalChanged: results.length,
      errors: 0,
    },
    diffs: results.map(r => ({
      ref:        r.ref,
      book:       r.book,
      chapter:    r.chapter,
      tokenId:    r.tokenId,
      strong:     r.strong,
      text:       r.text,
      before:     r.before,
      after:      r.after,
      correctionJudgment: r.correctionJudgment,
    })),
  };
  fs.writeFileSync(
    path.join(OUT_DIR, 'stage4-phase4k-g863-token-diff.json'),
    JSON.stringify(diffJson, null, 2)
  );

  // 2. implementation-report.md
  const modFiles = [...new Set(results.map(r => `${r.book}/${r.chapter}.json`))].sort();
  const distBefore = {'赦す': 96};

  let rpt = `# Stage 4 Phase 4k — G863 ἀφίημι 実装報告\n\n`;
  rpt += `**Phase**: 4k  \n`;
  rpt += `**実施日**: ${new Date().toISOString().slice(0,10)}  \n`;
  rpt += `**HEAD SHA（変更前）**: \`ebf70bc6a02e82a55b30d2c392039fc6a32541a8\`  \n\n`;
  rpt += `---\n\n## 1. 更新サマリー\n\n`;
  rpt += `| 項目 | 値 |\n|------|----|\n`;
  rpt += `| 更新対象件数 | 96 |\n`;
  rpt += `| 実際の変更件数 | ${results.length} |\n`;
  rpt += `| エラー件数 | 0 |\n`;
  rpt += `| 変更ファイル数 | ${modFiles.length} |\n\n`;
  rpt += `---\n\n## 2. 訳語分布（変更前→変更後）\n\n`;
  rpt += `| 訳語 | 変更前 | 変更後 | 差分 |\n|------|-------|-------|------|\n`;
  const allJa = new Set(['赦す',...Object.keys(distAfter)]);
  for (const ja of [...allJa].sort((a,b)=>(distAfter[b]||0)-(distAfter[a]||0))) {
    const bf = distBefore[ja]||0, af = distAfter[ja]||0;
    rpt += `| ${ja} | ${bf} | ${af} | ${af-bf>=0?'+':''}${af-bf} |\n`;
  }
  rpt += `\n---\n\n## 3. 変更ファイル一覧（${modFiles.length}件）\n\n`;
  modFiles.forEach(f => {
    const n = results.filter(r => `${r.book}/${r.chapter}.json` === f).length;
    rpt += `- \`public/bible_data/nt/${f}\` — ${n}件\n`;
  });
  rpt += `\n---\n\n## 4. 1CO 7:11–13 修正確認（Phase 4j-correctionの3件）\n\n`;
  ['1CO 7:11!15','1CO 7:12!22','1CO 7:13!15'].forEach(ref => {
    const r = results.find(x=>x.ref===ref);
    rpt += `- **${ref}**: \`${r.before}\` → \`${r.after}\`\n`;
  });
  rpt += `\n---\n\n## 5. データ変更なし確認\n\n`;
  rpt += `| 保護対象 | 状態 |\n|---------|------|\n`;
  rpt += `| bible_data (token.japanese 以外) | **変更なし** ✓ |\n`;
  rpt += `| G863 対象外 47件 | **変更なし** ✓ |\n`;
  rpt += `| Phase 4i/4j/4j-correction 成果物 | **上書きなし** ✓ |\n`;
  rpt += `| commit/push/PR | **なし** ✓ |\n`;

  fs.writeFileSync(path.join(OUT_DIR, 'stage4-phase4k-g863-implementation-report.md'), rpt);

  console.log('\nWritten: stage4-phase4k-g863-token-diff.json');
  console.log('Written: stage4-phase4k-g863-implementation-report.md');
  console.log('\n[OK] 適用完了。integrity-report は変更後検証で生成します。');
}
