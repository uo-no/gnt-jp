#!/usr/bin/env node
/**
 * re-apparatus-reproducibility.cjs — build-apparatus.cjs 冪等性確認
 *
 * work/apparatus/sblgnt_tei.xml から apparatus.json を一時パスへ再生成し、
 * コミット済み public/assets/data/apparatus.json と比較する。
 *
 * 変動が許容される項目: _meta.generatedAt のみ。
 * それ以外の全フィールド（件数・構造・byVerse・各 entry の内容）が一致することを検証する。
 *
 * 生成物は OS tmpdir に出力し、検証後に必ず削除する。
 * コミット済みの apparatus.json は一切上書きしない。
 *
 * 前提条件:
 *   @xmldom/xmldom が node_modules に存在すること（npm install または npm ci 済み）。
 *   未インストールの場合は SKIP を返して終了する（CI では npm ci 後に実行する）。
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const PROJECT_ROOT   = path.join(__dirname, '..');
const COMMITTED_PATH = path.join(PROJECT_ROOT, 'public', 'assets', 'data', 'apparatus.json');
const BUILD_SCRIPT   = path.join(__dirname, 'build-apparatus.cjs');
const TEMP_PATH      = path.join(os.tmpdir(), `apparatus-repro-${Date.now()}.json`);

let failed = 0;
const results = [];

function check(name, cond, detail) {
  results.push(cond ? ['PASS', name] : ['FAIL', name + (detail ? ` — ${detail}` : '')]);
  if (!cond) failed++;
}

function cleanup() {
  if (fs.existsSync(TEMP_PATH)) fs.unlinkSync(TEMP_PATH);
}

function printResults() {
  console.log('\n=== re-apparatus-reproducibility ===');
  for (const [status, name] of results) {
    if (status === 'FAIL') console.log(`  FAIL: ${name}`);
  }
  const passed = results.filter(r => r[0] === 'PASS').length;
  console.log(`\n${passed}/${results.length} checks passed`);
  if (failed > 0) {
    console.log(`\nFAILED: ${failed} check(s)`);
    process.exit(1);
  } else {
    console.log('\nPASS');
  }
}

// ── 前提確認 ─────────────────────────────────────────────────────

// @xmldom/xmldom が利用可能か確認（未インストール時は SKIP）
try {
  require('@xmldom/xmldom');
} catch (_) {
  console.log('\n=== re-apparatus-reproducibility ===');
  console.log('SKIP: @xmldom/xmldom が node_modules にありません。');
  console.log('      npm install 後に再実行してください。');
  console.log('      CI では npm ci を実行してからこのテストを実行します。');
  process.exit(0);
}

check('BUILD_SCRIPT_EXISTS', fs.existsSync(BUILD_SCRIPT));
check('XML_SOURCE_EXISTS',
  fs.existsSync(path.join(PROJECT_ROOT, 'work', 'apparatus', 'sblgnt_tei.xml')));
check('COMMITTED_EXISTS', fs.existsSync(COMMITTED_PATH));

if (failed > 0) {
  printResults();
  process.exit(1);
}

// ── 再生成（一時パスへ出力） ─────────────────────────────────────

console.log(`再生成中: ${TEMP_PATH}`);
try {
  execSync(`node "${BUILD_SCRIPT}" --output "${TEMP_PATH}"`, {
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    timeout: 180000,
  });
} catch (e) {
  check('BUILD_SUCCEEDED', false, e.stderr ? e.stderr.toString().slice(0, 200) : e.message);
  cleanup();
  printResults();
  process.exit(1);
}
check('BUILD_SUCCEEDED', true);
check('TEMP_OUTPUT_EXISTS', fs.existsSync(TEMP_PATH));

// ── 読み込みと比較 ────────────────────────────────────────────────

let committed, rebuilt;
try {
  committed = JSON.parse(fs.readFileSync(COMMITTED_PATH, 'utf8'));
  rebuilt   = JSON.parse(fs.readFileSync(TEMP_PATH, 'utf8'));
} catch (e) {
  check('LOAD_BOTH', false, e.message);
  cleanup();
  printResults();
  process.exit(1);
}
check('LOAD_BOTH', true);

// _meta.generatedAt を正規化（変動が許容される唯一の項目）
function normalize(obj) {
  const c = JSON.parse(JSON.stringify(obj));
  if (c._meta) c._meta.generatedAt = '__normalized__';
  return c;
}

const normC = normalize(committed);
const normR = normalize(rebuilt);

// 件数一致
check('ENTRY_COUNT_MATCH',
  normC.entries.length === normR.entries.length,
  `committed=${normC.entries.length} rebuilt=${normR.entries.length}`
);

const rdgC = normC.entries.reduce((s, e) => s + (e.readings ? e.readings.length : 0), 0);
const rdgR = normR.entries.reduce((s, e) => s + (e.readings ? e.readings.length : 0), 0);
check('RDG_COUNT_MATCH', rdgC === rdgR, `committed=${rdgC} rebuilt=${rdgR}`);

check('BYVERSE_KEY_COUNT_MATCH',
  Object.keys(normC.byVerse).length === Object.keys(normR.byVerse).length,
  `committed=${Object.keys(normC.byVerse).length} rebuilt=${Object.keys(normR.byVerse).length}`
);

// 完全一致（正規化済み）
const jsonC = JSON.stringify(normC);
const jsonR = JSON.stringify(normR);
if (jsonC !== jsonR) {
  let firstDiff = -1;
  for (let i = 0; i < Math.min(jsonC.length, jsonR.length); i++) {
    if (jsonC[i] !== jsonR[i]) { firstDiff = i; break; }
  }
  check('FULL_MATCH', false, `JSON差異あり — 最初の差異位置 char ${firstDiff}`);
} else {
  check('FULL_MATCH', true);
}

cleanup();
printResults();
