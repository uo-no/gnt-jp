#!/usr/bin/env node
/**
 * run-morph-index.cjs — build-morph-index.js の CommonJS ラッパー
 *
 * package.json が "type":"module" のため build-morph-index.js (.js) は
 * ESM として解釈され require() が使えない。
 * このラッパーは .cjs として CJS コンテキストで実行し、
 * vm 経由で build-morph-index.js を正しく走らせる。
 *
 * 実行: node scripts/run-morph-index.cjs
 */
'use strict';
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

const target = path.resolve(__dirname, 'build-morph-index.js');
const rawCode = fs.readFileSync(target, 'utf8');
// shebang行を除去してから vm に渡す（#! は JS 構文ではない）
const code = rawCode.startsWith('#!') ? rawCode.slice(rawCode.indexOf('\n') + 1) : rawCode;
const fn     = vm.runInThisContext(
    '(function(module,exports,require,__dirname,__filename){\n' + code + '\n})',
    { filename: target }
);
const mod = { exports: {} };
fn(mod, mod.exports, require, path.dirname(target), target);
