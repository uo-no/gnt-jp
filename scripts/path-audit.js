#!/usr/bin/env node
/**
 * path-audit.js — 旧ディレクトリパス参照の検出スクリプト
 *
 * 使用方法:
 *   node scripts/path-audit.js
 *   node scripts/path-audit.js --root /path/to/repo
 *
 * 終了コード:
 *   0 = 問題なし
 *   1 = 旧パス参照が1件以上検出された
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

const ROOT = (() => {
    const idx = process.argv.indexOf('--root');
    return idx !== -1 ? process.argv[idx + 1] : process.cwd();
})();

const TARGET_EXTS = new Set(['.js', '.html', '.md']);

const LEGACY_PATTERNS = [
    { pattern: /\.\/(data)\//g,    label: './data/',    hint: './assets/data/' },
    { pattern: /\.\/(js)\//g,      label: './js/',      hint: './core/ または ./assets/js/' },
    { pattern: /\.\/(index)\//g,   label: './index/',   hint: './assets/data/index/' },
    { pattern: /\.\/(lexicon)\//g, label: './lexicon/', hint: './assets/data/lexicon/' },
];

const IGNORE_DIRS  = new Set(['.git', 'node_modules', 'bible_data', 'morph-index', 'translations']);
const IGNORE_FILES = new Set(['scripts/path-audit.js']);

function walkFiles(dir, results = []) {
    for (const entry of readdirSync(dir)) {
        if (IGNORE_DIRS.has(entry)) continue;
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            walkFiles(fullPath, results);
        } else if (TARGET_EXTS.has(extname(entry))) {
            const rel = relative(ROOT, fullPath);
            if (!IGNORE_FILES.has(rel)) results.push(fullPath);
        }
    }
    return results;
}

function audit() {
    const files = walkFiles(ROOT);
    const findings = [];

    for (const filePath of files) {
        const relPath = relative(ROOT, filePath);
        const lines = readFileSync(filePath, 'utf8').split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            for (const { pattern, label, hint } of LEGACY_PATTERNS) {
                pattern.lastIndex = 0;
                if (pattern.test(line)) {
                    findings.push({ file: relPath, lineNo: i + 1, line: line.trim(), label, hint });
                }
            }
        }
    }

    if (findings.length === 0) {
        console.log('OK: 旧パス参照は検出されませんでした。');
        process.exit(0);
    }

    console.error(`\nFAIL: 旧パス参照が ${findings.length} 件検出されました\n`);

    const byLabel = {};
    for (const f of findings) {
        (byLabel[f.label] ??= []).push(f);
    }

    for (const [label, items] of Object.entries(byLabel)) {
        console.error(`--- ${label} (→ ${items[0].hint}) ---`);
        for (const { file, lineNo, line } of items) {
            console.error(`  ${file}:${lineNo}`);
            console.error(`    ${line}`);
        }
        console.error('');
    }

    process.exit(1);
}

audit();
