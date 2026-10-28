#!/usr/bin/env node
/**
 * build-rk-offsets.cjs — 作業スペース（Lowfat文構造エディタ）で確定した
 * 手動オフセット（rk-x/rk-y/rk-w、rk-dx/rk-dy）を、アプリが消費する
 * JSON へ抽出する。
 *
 * 入力: エディタで保存した Lowfat XML（rk-* 属性を含むもの）
 * 出力: public/assets/data/rk-offsets/{BOOK}.json
 *   { words: { "<xml:id>": {x, y, w?} }, groups: { "<先頭ID>…<末尾ID>": {dx, dy} } }
 *
 * 実行: node scripts/build-rk-offsets.cjs <xmlDir> [outDir]
 *   xmlDir には 03-luke.xml / 12-colossians.xml のようなファイル名で置く。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

const BOOK_BY_NUM = {
  '01': 'MAT', '02': 'MRK', '03': 'LUK', '04': 'JHN', '05': 'ACT',
  '06': 'ROM', '07': '1CO', '08': '2CO', '09': 'GAL', '10': 'EPH',
  '11': 'PHP', '12': 'COL', '13': '1TH', '14': '2TH', '15': '1TI',
  '16': '2TI', '17': 'TIT', '18': 'PHM', '19': 'HEB', '20': 'JAS',
  '21': '1PE', '22': '2PE', '23': '1JN', '24': '2JN', '25': '3JN',
  '26': 'JUD', '27': 'REV'
};

function tokenRangeKey(wg) {
  const ws = wg.getElementsByTagName('w');
  if (!ws.length) return null;
  const first = ws[0].getAttribute('xml:id');
  const last = ws[ws.length - 1].getAttribute('xml:id');
  return first && last ? `${first}…${last}` : null;
}

function extract(xmlPath) {
  const doc = new DOMParser().parseFromString(fs.readFileSync(xmlPath, 'utf8'), 'application/xml');
  const words = {}, groups = {};
  for (const w of doc.getElementsByTagName('w')) {
    const x = w.getAttribute('rk-x'), y = w.getAttribute('rk-y'), rw = w.getAttribute('rk-w');
    if (x === null && y === null && rw === null) continue;
    const id = w.getAttribute('xml:id');
    if (!id) continue;
    const o = {};
    if (x !== null && y !== null) { o.x = +x; o.y = +y; }
    if (rw !== null) o.w = +rw;
    words[id] = o;
  }
  for (const g of doc.getElementsByTagName('wg')) {
    const dx = g.getAttribute('rk-dx'), dy = g.getAttribute('rk-dy');
    if (dx === null && dy === null) continue;
    const key = tokenRangeKey(g);
    if (!key) continue;
    const o = {};
    if (dx !== null) o.dx = +dx;
    if (dy !== null) o.dy = +dy;
    groups[key] = o;
  }
  return { words, groups };
}

function main() {
  const xmlDir = process.argv[2];
  const outDir = process.argv[3] || path.join(__dirname, '..', 'public', 'assets', 'data', 'rk-offsets');
  if (!xmlDir) { console.error('usage: node scripts/build-rk-offsets.cjs <xmlDir> [outDir]'); process.exit(1); }
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(xmlDir).filter(f => f.endsWith('.xml'))) {
    const num = f.slice(0, 2);
    const book = BOOK_BY_NUM[num];
    if (!book) { console.warn('skip (unknown book number):', f); continue; }
    const data = extract(path.join(xmlDir, f));
    const out = path.join(outDir, `${book}.json`);
    fs.writeFileSync(out, JSON.stringify(data));
    console.log(book, 'words:', Object.keys(data.words).length, 'groups:', Object.keys(data.groups).length, '->', out);
  }
}
main();
