#!/usr/bin/env node
/**
 * dryrun-ja1955-apply.cjs
 *
 * ja1955-nt-ledger.json の「修正承認」132件を bible_data/nt/ と照合し、
 * 変更計画（dry-run）を生成する。bible_data は一切変更しない。
 *
 * 確認事項:
 *  A) 修正承認132件がレジャーから正確に抽出できる
 *  B) 実JSONの現在値と台帳の currentJapanese が一致する
 *  C) PR #471 修正済み16件と重複していない
 *  D) 判断保留・現状維持・対象外が含まれていない
 *  E) 変更前後の値が正しい
 *
 * 実行: node scripts/dryrun-ja1955-apply.cjs [--verbose]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LEDGER     = path.join(__dirname, 'output/ja1955-nt-ledger.json');
const BIBLE_ROOT = path.join(__dirname, '..', 'public', 'bible_data', 'nt');
const VERBOSE    = process.argv.includes('--verbose');

// PR #471 適用済みref（修正済み16件 — 重複確認用）
const PR471_APPLIED = new Set([
  'JAS 1:2!7','1CO 10:13!1','1CO 10:13!24','1PE 1:6!11','1PE 4:12!9',
  '2PE 2:9!5','GAL 4:14!3','HEB 3:8!14','LUK 8:13!26','LUK 22:28!10',
  'REV 3:10!15','MAT 10:22!12','MAT 24:13!3','MRK 13:13!12',
  '2TI 2:10!4','2TI 2:12!2',
]);

// bible_data チャプターキャッシュ
const chapterCache = new Map();
function loadChapter(book, chapter) {
  const key = `${book}/${chapter}`;
  if (!chapterCache.has(key)) {
    const p = path.join(BIBLE_ROOT, book, `${chapter}.json`);
    chapterCache.set(key, JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  return chapterCache.get(key);
}
function getToken(book, chapter, ref) {
  const ch = loadChapter(book, chapter);
  return Object.values(ch).find(t => t.ref === ref) || null;
}

// --- 台帳読み込み ---
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));

// A: 修正承認だけを抽出
const approved = ledger.candidates.filter(c => c.status === '修正承認');

console.log('=== JA1955 dry-run ===');
console.log(`台帳 修正承認抽出: ${approved.length} 件\n`);

const errors      = [];
const overlaps    = [];
const plan        = [];
const byFile      = {};  // book/chapter → [changes]

for (const c of approved) {
  // D: PR #471 重複チェック
  if (PR471_APPLIED.has(c.ref)) {
    overlaps.push(c.ref);
    errors.push({ ref: c.ref, type: 'PR471_OVERLAP', msg: 'PR #471 修正済みrefが修正承認に含まれている' });
    continue;
  }

  // B: bible_data から実tokenを取得
  const token = getToken(c.book, c.chapter, c.ref);
  if (!token) {
    errors.push({ ref: c.ref, type: 'TOKEN_NOT_FOUND', msg: `bible_data/nt/${c.book}/${c.chapter}.json にref不存在` });
    continue;
  }

  // B: 実値と台帳のcurrentJapaneseの照合
  const actualJa = token.japanese ?? '';
  const ledgerJa = c.currentJapanese ?? c.japanese_before ?? '';
  if (actualJa !== ledgerJa) {
    errors.push({
      ref: c.ref,
      type: 'MISMATCH',
      msg: `実JSON japanese="${actualJa}" ≠ 台帳 currentJapanese="${ledgerJa}"`,
    });
    continue;
  }

  // E: 変更前後の確認
  const proposed = c.proposedJapanese;
  if (!proposed) {
    errors.push({ ref: c.ref, type: 'NO_PROPOSED', msg: 'proposedJapanese が空' });
    continue;
  }
  if (actualJa === proposed) {
    errors.push({ ref: c.ref, type: 'NOOP', msg: `現在値と変更後が同一 (${actualJa})` });
    continue;
  }

  const change = {
    ref:      c.ref,
    book:     c.book,
    chapter:  c.chapter,
    verse:    c.verse,
    tokenId:  token.tokenId,
    strong:   c.strong,
    text:     token.text,
    before:   actualJa,
    after:    proposed,
    evidence: c.ja1955Evidence ? c.ja1955Evidence.slice(0, 80) : '',
    reason:   c.decisionReason ? c.decisionReason.slice(0, 80) : '',
  };
  plan.push(change);

  const fileKey = `public/bible_data/nt/${c.book}/${c.chapter}.json`;
  if (!byFile[fileKey]) byFile[fileKey] = [];
  byFile[fileKey].push(change);
}

// --- 結果出力 ---
console.log('=== [A] 抽出件数 ===');
console.log(`  修正承認: ${approved.length} 件`);
console.log(`  変更計画生成: ${plan.length} 件`);
console.log(`  エラー/スキップ: ${errors.length} 件\n`);

console.log('=== [B] 実JSON照合 ===');
const matchCount = plan.length;
const mismatchCount = errors.filter(e => e.type === 'MISMATCH').length;
const notFoundCount = errors.filter(e => e.type === 'TOKEN_NOT_FOUND').length;
console.log(`  照合成功: ${matchCount} 件`);
console.log(`  値不一致: ${mismatchCount} 件`);
console.log(`  ref不存在: ${notFoundCount} 件\n`);

console.log('=== [C] PR #471 重複確認 ===');
if (overlaps.length === 0) {
  console.log('  重複なし ✓');
} else {
  console.log(`  重複 ${overlaps.length} 件:`, overlaps);
}
console.log('');

console.log('=== [D] 不正ステータス混入確認 ===');
const nonApproved = approved.filter(c => c.status !== '修正承認');
if (nonApproved.length === 0) {
  console.log('  修正承認以外は含まれていない ✓');
} else {
  console.log(`  異常: ${nonApproved.length} 件`, nonApproved.map(c => c.ref));
}
console.log('');

console.log('=== [E] 変更前後サンプル（最初の20件） ===');
for (const c of plan.slice(0, 20)) {
  console.log(`  ${c.ref.padEnd(18)} [${c.strong}] ${c.text.padEnd(14)} "${c.before}" → "${c.after}"`);
}
if (plan.length > 20) {
  console.log(`  ... (残り ${plan.length - 20} 件は --verbose で確認)`);
}
console.log('');

console.log('=== 変更予定ファイル一覧 ===');
const files = Object.keys(byFile).sort();
for (const f of files) {
  console.log(`  ${f}: ${byFile[f].length}件`);
}
console.log(`  合計: ${files.length} ファイル\n`);

if (VERBOSE) {
  console.log('=== 全変更計画 (--verbose) ===');
  for (const c of plan) {
    console.log(`${c.ref.padEnd(18)} [${c.strong}] "${c.before}"→"${c.after}" | ${c.reason.slice(0,60)}`);
  }
  console.log('');
}

if (errors.length > 0) {
  console.log('=== エラー詳細 ===');
  for (const e of errors) {
    console.log(`  [${e.type}] ${e.ref}: ${e.msg}`);
  }
  console.log('');
}

// Strong別集計
const byStrong = {};
for (const c of plan) {
  byStrong[c.strong] = (byStrong[c.strong] || 0) + 1;
}
console.log('=== Strong別変更件数 ===');
for (const [s, n] of Object.entries(byStrong).sort()) {
  console.log(`  ${s}: ${n}件`);
}
console.log('');

// dry-run 最終判定
const dryRunPass = errors.length === 0 && plan.length === approved.length && overlaps.length === 0;
console.log('=== dry-run 結果 ===');
if (dryRunPass) {
  console.log(`  PASS: ${plan.length}件の変更計画が生成されました。`);
  console.log('  bible_dataに変更はありません（dry-runのみ）。');
} else {
  console.log(`  FAIL: エラー${errors.length}件, 重複${overlaps.length}件`);
  console.log('  実データ変更前に上記エラーを解決してください。');
}
