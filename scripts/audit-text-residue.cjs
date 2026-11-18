#!/usr/bin/env node
/**
 * 本文データの残渣スキャン（恒常チェック。キュー #148）
 *
 * 対象：
 *   - public/translations/{JA1955,BUN,WEB,RVR1909,KARLXII1873}/<書>/<章>.json の全節
 *   - public/assets/data/alignment/{WEB,RVR1909,KARLXII1873}/<書>/<章>.json の本文セグメント（segments[].t）
 *
 * 残渣の定義は機械的な断片パターンに限る（文体・旧字・旧仮名は見ない）：
 *   backslash   バックスラッシュ（USFM 記法・エスケープ崩れ）
 *   brace       波括弧 { }
 *   ruby-frag   ルビ記法の断片「](」「)}」
 *   usfm-frag   USFM の断片（+w、|strong=、|lemma= など）
 *   tag         <…> 形式のタグ（OSIS／HTML）
 *   attr        属性文字列 name="value"
 *   empty-verse 空文字の節（下の EXPECTED_MERGED_EMPTY に載っているものだけ許可）
 *
 * 空の節：文語訳 BUN は、次の節に統合されて元データで空の節を持つ。内容を勝手に埋めない。
 * 許可リストの各節について「次の非空の節が存在すること」を確認する。リスト外の空の節、
 * またはリストにあるのに空でなくなった節（リストの陳腐化）は失敗として報告する。
 *
 * 実行：node scripts/audit-text-residue.cjs     （npm run audit:text-residue）
 * 終了コード：0 = 残渣 0 件、1 = 残渣あり
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const TRANSLATIONS = ['JA1955', 'BUN', 'WEB', 'RVR1909', 'KARLXII1873'];
const ALIGNMENTS = ['WEB', 'RVR1909', 'KARLXII1873'];

// BUN の統合済み空節（2026-11-19 に統合先の本文を1件ずつ確認済み。#148）
const EXPECTED_MERGED_EMPTY = {
  BUN: new Set([
    '1CH 16:12', '1PE 3:1', '2CO 8:3', 'ACT 1:24', 'EPH 2:14', 'EPH 3:14', 'HEB 7:15',
    'JER 9:25', 'LUK 2:4', 'NUM 15:4', 'PRO 26:18', 'PSA 105:5', 'PSA 113:5', 'PSA 132:3',
    'PSA 132:4', 'PSA 49:8', 'PSA 50:16', 'PSA 58:4', 'PSA 63:5', 'PSA 66:13', 'PSA 76:8',
    'PSA 89:50', 'TIT 3:5'
  ])
};

const PATTERNS = [
  ['backslash', /\\/],
  ['brace', /[{}]/],
  ['ruby-frag', /\]\(|\)\}/],
  ['usfm-frag', /\+w\*?(?![A-Za-z])|\|(?:strong|lemma|x-[a-z]+|srcloc|gloss)=/i],
  ['tag', /<\/?[A-Za-z][^>]*>/],
  ['attr', /\b[A-Za-z][\w-]*="[^"]*"/]
];

function listChapterFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const book of fs.readdirSync(dir).sort()) {
    const bd = path.join(dir, book);
    if (!fs.statSync(bd).isDirectory()) continue;
    for (const f of fs.readdirSync(bd).sort((a, b) => parseInt(a) - parseInt(b))) {
      if (f.endsWith('.json')) out.push({ book, chapter: parseInt(f), file: path.join(bd, f) });
    }
  }
  return out;
}

const findings = [];
const stats = {};
const emptySeen = new Set();

function scanText(kind, label, ref, text) {
  for (const [name, re] of PATTERNS) {
    if (re.test(text)) findings.push({ kind, label, ref, type: name, sample: text.slice(0, 70) });
  }
}

for (const t of TRANSLATIONS) {
  const files = listChapterFiles(path.join(root, 'public/translations', t));
  let verses = 0;
  for (const { book, chapter, file } of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { findings.push({ kind: 'translation', label: t, ref: `${book} ${chapter}`, type: 'invalid-json', sample: e.message }); continue; }
    const vs = data.verses || {};
    const keys = Object.keys(vs).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b);
    for (const k of keys) {
      verses++;
      const ref = `${book} ${chapter}:${k}`;
      const v = vs[k];
      const text = typeof v === 'string' ? v : JSON.stringify(v);
      if (typeof v === 'string' && v.trim() === '') {
        const allowed = EXPECTED_MERGED_EMPTY[t] && EXPECTED_MERGED_EMPTY[t].has(ref);
        if (!allowed) { findings.push({ kind: 'translation', label: t, ref, type: 'empty-verse', sample: '' }); }
        else {
          emptySeen.add(t + ' ' + ref);
          const next = keys.find(x => Number(x) > Number(k) && typeof vs[x] === 'string' && vs[x].trim() !== '');
          if (!next) findings.push({ kind: 'translation', label: t, ref, type: 'empty-verse-no-merge-target', sample: '' });
        }
        continue;
      }
      scanText('translation', t, ref, text);
    }
  }
  stats[`translations/${t}`] = `${files.length}章 / ${verses}節`;
}

for (const t of ALIGNMENTS) {
  const files = listChapterFiles(path.join(root, 'public/assets/data/alignment', t));
  let segs = 0;
  for (const { book, chapter, file } of files) {
    let data;
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (e) { findings.push({ kind: 'alignment', label: t, ref: `${book} ${chapter}`, type: 'invalid-json', sample: e.message }); continue; }
    for (const [k, v] of Object.entries(data.verses || {})) {
      for (const s of (v && v.segments) || []) {
        segs++;
        if (typeof s.t === 'string') scanText('alignment', t, `${book} ${chapter}:${k}`, s.t);
      }
    }
  }
  stats[`alignment/${t}`] = `${files.length}章 / ${segs}セグメント`;
}

// 許可リストの陳腐化（リストにあるが、データ上は空でなくなった／存在しない）
for (const [t, set] of Object.entries(EXPECTED_MERGED_EMPTY)) {
  for (const ref of set) {
    if (!emptySeen.has(t + ' ' + ref)) findings.push({ kind: 'translation', label: t, ref, type: 'stale-allowlist-entry', sample: '許可リストにあるが空の節ではない' });
  }
}

for (const [k, v] of Object.entries(stats)) console.log(`scanned ${k}: ${v}`);
const byType = {};
for (const f of findings) byType[f.type] = (byType[f.type] || 0) + 1;
console.log(`allowed merged-empty verses: ${emptySeen.size}`);
if (findings.length) {
  console.log(`\nFAIL: ${findings.length} finding(s)`, byType);
  for (const f of findings.slice(0, 200)) console.log(`  [${f.type}] ${f.label} ${f.ref} ${f.sample}`);
  process.exit(1);
}
console.log('\nPASS: residue findings = 0');
