#!/usr/bin/env node
/**
 * apply-ja1955.cjs
 *
 * ja1955-nt-ledger.json の「修正承認」132件を bible_data/nt/ に適用する。
 * 変更対象: token.japanese フィールドのみ。
 * 変更単位: token.ref（Strong番号一括置換禁止）。
 * PR #471 修正済み16件・判断保留55件・現状維持3件・対象外303件には触れない。
 *
 * 実行: node scripts/apply-ja1955.cjs [--backup-dir <path>] [--dry-run]
 *
 * オプション:
 *   --backup-dir <path>  バックアップ先（必須）
 *   --dry-run            適用せず確認のみ
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── 引数 ───────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const backupIdx  = args.indexOf('--backup-dir');
const BACKUP_DIR = backupIdx >= 0 ? args[backupIdx + 1] : null;

if (!DRY_RUN && !BACKUP_DIR) {
  console.error('ERROR: --backup-dir <path> が必要です（dry-runでない場合）');
  process.exit(1);
}

// ── パス ───────────────────────────────────────────────────────────────────
const LEDGER     = path.join(__dirname, 'output/ja1955-nt-ledger.json');
const BIBLE_ROOT = path.join(__dirname, '..', 'public', 'bible_data', 'nt');

// PR #471 適用済み ref（重複確認用）
const PR471_APPLIED = new Set([
  'JAS 1:2!7','1CO 10:13!1','1CO 10:13!24','1PE 1:6!11','1PE 4:12!9',
  '2PE 2:9!5','GAL 4:14!3','HEB 3:8!14','LUK 8:13!26','LUK 22:28!10',
  'REV 3:10!15','MAT 10:22!12','MAT 24:13!3','MRK 13:13!12',
  '2TI 2:10!4','2TI 2:12!2',
]);

// ── 台帳読み込み・抽出 ─────────────────────────────────────────────────────
const ledger   = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const approved = ledger.candidates.filter(c => c.status === '修正承認');

if (approved.length !== 132) {
  console.error(`ABORT: 修正承認件数が132件でない (${approved.length}件)。台帳を確認してください。`);
  process.exit(1);
}

// refで重複確認
const refSet = new Set(approved.map(c => c.ref));
if (refSet.size !== approved.length) {
  console.error(`ABORT: 修正承認に重複refが存在します`);
  process.exit(1);
}

// ── ファイル単位にグループ化 ───────────────────────────────────────────────
const fileMap = new Map(); // "book/chapter" → [candidate, ...]
for (const c of approved) {
  const key = `${c.book}/${c.chapter}`;
  if (!fileMap.has(key)) fileMap.set(key, []);
  fileMap.get(key).push(c);
}

console.log(`台帳 修正承認: ${approved.length} 件 / ${fileMap.size} ファイル`);
if (DRY_RUN) console.log('** DRY-RUN MODE — ファイルを変更しません **\n');

// ── バックアップ ───────────────────────────────────────────────────────────
let backupCount = 0;
if (!DRY_RUN && BACKUP_DIR) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const [key] of fileMap) {
    const [book, chapter] = key.split('/');
    const src = path.join(BIBLE_ROOT, book, `${chapter}.json`);
    const destDir = path.join(BACKUP_DIR, book);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, path.join(destDir, `${chapter}.json`));
    backupCount++;
  }
  console.log(`バックアップ完了: ${backupCount} ファイル → ${BACKUP_DIR}\n`);
}

// ── 適用 ──────────────────────────────────────────────────────────────────
const results = [];
const errors  = [];
let appliedTotal = 0;

for (const [key, candidates] of [...fileMap.entries()].sort()) {
  const [book, chapter] = key.split('/');
  const filePath = path.join(BIBLE_ROOT, book, `${chapter}.json`);

  // JSON読み込み
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const tokens = Object.values(data);

  let fileChanges = 0;

  for (const c of candidates) {
    // PR #471 重複ガード
    if (PR471_APPLIED.has(c.ref)) {
      errors.push({ ref: c.ref, type: 'PR471_OVERLAP', msg: 'PR #471 適用済み' });
      continue;
    }

    // tokenを ref で検索
    const token = tokens.find(t => t.ref === c.ref);
    if (!token) {
      errors.push({ ref: c.ref, type: 'NOT_FOUND', msg: `ref不存在: ${c.ref}` });
      continue;
    }

    // 現在値の照合
    const actualJa  = token.japanese ?? '';
    const ledgerJa  = c.currentJapanese ?? c.japanese_before ?? '';
    const proposed  = c.proposedJapanese;

    if (actualJa !== ledgerJa) {
      errors.push({ ref: c.ref, type: 'MISMATCH',
        msg: `実値"${actualJa}" ≠ 台帳currentJapanese"${ledgerJa}"` });
      continue;
    }

    if (!proposed) {
      errors.push({ ref: c.ref, type: 'NO_PROPOSED', msg: 'proposedJapanese が空' });
      continue;
    }

    // ── 適用 ──
    results.push({
      ref: c.ref, book, chapter,
      tokenId: token.tokenId,
      strong:  c.strong,
      text:    token.text,
      before:  actualJa,
      after:   proposed,
    });

    if (!DRY_RUN) {
      token.japanese = proposed;
      fileChanges++;
      appliedTotal++;
    } else {
      fileChanges++;
      appliedTotal++;
    }
  }

  // JSON書き戻し（DRY_RUNでない場合のみ）
  if (!DRY_RUN && fileChanges > 0) {
    // 書き戻し前にJSONとしてvalidかチェック
    let newJson = JSON.stringify(data, null, 2);
    JSON.parse(newJson); // throws if invalid
    // 元ファイルの改行コードを保持（CRLF/LF）
    if (raw.includes('\r\n')) {
      newJson = newJson.replace(/\n/g, '\r\n');
    }
    fs.writeFileSync(filePath, newJson, 'utf8');
  }

  if (fileChanges > 0) {
    console.log(`  ${book}/${chapter}.json: ${fileChanges}件`);
  }
}

// ── 結果サマリー ───────────────────────────────────────────────────────────
console.log(`\n=== 適用結果 ===`);
console.log(`  適用件数: ${appliedTotal} / 132`);
console.log(`  エラー件数: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n=== エラー詳細 ===');
  for (const e of errors) console.log(`  [${e.type}] ${e.ref}: ${e.msg}`);
}

// ── 構造検証（適用後） ───────────────────────────────────────────────────
if (!DRY_RUN) {
  console.log('\n=== 構造検証 ===');
  let jsonOk = 0;
  let jsonErr = 0;
  for (const [key] of fileMap) {
    const [book, chapter] = key.split('/');
    const fp = path.join(BIBLE_ROOT, book, `${chapter}.json`);
    try {
      JSON.parse(fs.readFileSync(fp, 'utf8'));
      jsonOk++;
    } catch (e) {
      jsonErr++;
      console.error(`  JSON ERROR: ${key}.json — ${e.message}`);
    }
  }
  console.log(`  JSON構文検証: ${jsonOk}件OK, ${jsonErr}件NG`);
}

// ── 終了判定 ──────────────────────────────────────────────────────────────
const success = appliedTotal === 132 && errors.length === 0;
console.log(`\n=== ${DRY_RUN ? 'DRY-RUN' : '適用'} ${success ? 'PASS ✓' : 'FAIL ✗'} ===`);
if (!success) process.exit(1);
