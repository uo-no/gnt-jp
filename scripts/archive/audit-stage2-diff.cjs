#!/usr/bin/env node
/**
 * audit-stage2-diff.cjs — タスク1: 148件差分の token ref 単位照合
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const OUT_DIR = path.join(__dirname, 'output', 'ja1955-full-audit', 'reports');

function getFileAtCommit(commit, filePath) {
  try {
    return JSON.parse(execSync(`git show ${commit}:${filePath}`, {cwd:REPO, maxBuffer:5*1024*1024}).toString());
  } catch { return null; }
}

// PR #471 の親コミット
const pr471Parent = execSync('git rev-parse 6738af25^', {cwd:REPO, encoding:'utf8'}).trim();

// PR #471 変更ファイル
const pr471Files = execSync('git show 6738af25 --name-only', {cwd:REPO, encoding:'utf8'})
  .split('\n').filter(l => /bible_data.*\.json/.test(l)).map(l=>l.trim());

// PR #472 (ebf70bc6) 変更ファイル
const pr472Files = execSync('git show ebf70bc6 --name-only', {cwd:REPO, encoding:'utf8'})
  .split('\n').filter(l => /bible_data.*\.json/.test(l)).map(l=>l.trim());

console.log(`PR#471変更ファイル: ${pr471Files.length}件`);
console.log(`commit ebf70bc6変更ファイル: ${pr472Files.length}件`);

function diffTokensInFile(filePath, oldCommit, newCommit) {
  const oldData = getFileAtCommit(oldCommit, filePath);
  const newData = getFileAtCommit(newCommit, filePath);
  if (!oldData || !newData) return [];

  const oldArr = Array.isArray(oldData) ? oldData : Object.values(oldData);
  const newArr = Array.isArray(newData) ? newData : Object.values(newData);

  const oldMap = new Map(oldArr.map(t => [t.ref, t]));
  const changed = [];

  for (const newTok of newArr) {
    const oldTok = oldMap.get(newTok.ref);
    if (!oldTok) continue;
    if (oldTok.japanese !== newTok.japanese) {
      changed.push({
        ref: newTok.ref,
        strong: newTok.strong,
        text: newTok.text || newTok.word || '',
        oldJapanese: oldTok.japanese,
        newJapanese: newTok.japanese,
        file: filePath,
      });
    }
  }
  return changed;
}

// PR #471 変更トークン（oldCommit = pr471Parent, newCommit = 6738af25）
const pr471Changes = [];
for (const f of pr471Files) {
  pr471Changes.push(...diffTokensInFile(f, pr471Parent, '6738af25'));
}

// PR #472 変更トークン（oldCommit = 6738af25, newCommit = ebf70bc6）
const pr472Changes = [];
for (const f of pr472Files) {
  pr472Changes.push(...diffTokensInFile(f, '6738af25', 'ebf70bc6'));
}

console.log(`PR#471変更トークン: ${pr471Changes.length}件`);
console.log(`commit ebf70bc6変更トークン: ${pr472Changes.length}件`);
console.log(`合計: ${pr471Changes.length + pr472Changes.length}件`);

// 現在の現状維持セットと照合
const censusData = JSON.parse(fs.readFileSync(path.join(OUT_DIR,'stage2-jikoji-census.json'),'utf8'));
const currentJikojiRefs = new Set(censusData.allTokens.map(t => t.ref));

const allChanges = [...pr471Changes, ...pr472Changes];
const nowJikoji = allChanges.filter(c => currentJikojiRefs.has(c.ref));
const notJikoji  = allChanges.filter(c => !currentJikojiRefs.has(c.ref));

console.log(`変更後に現状維持: ${nowJikoji.length}件`);
console.log(`変更後も非現状維持: ${notJikoji.length}件`);

// Strong別集計
const byStrong = {};
for (const c of allChanges) {
  if (!byStrong[c.strong]) byStrong[c.strong] = { total:0, nowJikoji:0, tokens:[] };
  byStrong[c.strong].total++;
  if (currentJikojiRefs.has(c.ref)) byStrong[c.strong].nowJikoji++;
  byStrong[c.strong].tokens.push(`${c.oldJapanese}→${c.newJapanese}`);
}

console.log('\nStrong別（現状維持になった変更）:');
Object.entries(byStrong).filter(([s,v])=>v.nowJikoji>0)
  .sort((a,b)=>b[1].total-a[1].total)
  .forEach(([s,v])=>console.log(` ${s}: 変更${v.total}件中${v.nowJikoji}件が現状維持 (${[...new Set(v.tokens)].join('、')})`));

// 書巻別集計
const byBook = {};
for (const c of nowJikoji) {
  const book = c.ref.split(' ')[0];
  byBook[book] = (byBook[book]||0)+1;
}
console.log('\n書巻別（現状維持になった変更）:', Object.entries(byBook).sort((a,b)=>b[1]-a[1]).map(([b,n])=>`${b}:${n}`).join(', '));

// 非現状維持になった変更の分析
console.log('\n変更後も非現状維持の件数:', notJikoji.length);
if (notJikoji.length > 0) {
  console.log('例:');
  notJikoji.slice(0,5).forEach(c => console.log(` ${c.ref}: ${c.oldJapanese}→${c.newJapanese}`));
}

// 旧データでの現状維持件数を確認するため、元来の判定ロジックを再現
// 変更されたトークンについて、OLD japaneseで判定したら現状維持だったか？
function stripBrackets(s) { return (s||'').replace(/^［(.*)］$/,'$1').replace(/^〔(.*)〕$/,'$1').trim(); }
function containsBase(vt, jb) {
  if (!vt||!jb) return false;
  const clean = stripBrackets(jb);
  if (!clean) return false;
  if (vt.includes(clean)) return true;
  const kanji = clean.replace(/[ぁ-ん]/g,'').replace(/[ァ-ン]/g,'').replace(/[a-zA-Z]/g,'').replace(/[ー]/g,'').trim();
  return kanji.length >= 2 && vt.includes(kanji);
}

// JA1955ロード
const jaCache = new Map();
function loadJA(book, ch) {
  const k = `${book}/${ch}`;
  if (!jaCache.has(k)) {
    try { jaCache.set(k, JSON.parse(fs.readFileSync(path.join(REPO,'public','translations','JA1955',book,ch+'.json'),'utf8')).verses||{}); }
    catch { jaCache.set(k,{}); }
  }
  return jaCache.get(k);
}

function parseRef(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)$/);
  if (!m) return null;
  return { book:m[1], chapter:m[2], verse:m[3] };
}

let wasJikoji = 0;
let wasNotJikoji = 0;
for (const c of allChanges) {
  const r = parseRef(c.ref);
  if (!r) continue;
  const vt = loadJA(r.book, r.chapter)[r.verse] || null;
  if (!vt) continue;
  // OLD japaneseで判定
  const oldVerdict = containsBase(vt, c.oldJapanese);
  if (oldVerdict) wasJikoji++;
  else wasNotJikoji++;
}

console.log(`\n旧japaneseで現状維持だったはず: ${wasJikoji}件`);
console.log(`旧japaneseで非現状維持: ${wasNotJikoji}件`);
console.log('差し引き（+が増加）:', nowJikoji.length - wasJikoji);

// 出力
const result = {
  title: 'タスク1: 148件差分の特定（token ref単位）',
  pr471: { count: pr471Changes.length, tokens: pr471Changes },
  pr472: { count: pr472Changes.length, tokens: pr472Changes },
  totalChanges: allChanges.length,
  expectedNetDiff: 148,
  nowJikoji: nowJikoji.length,
  nowJikojiTokens: nowJikoji,
  notJikoji: notJikoji.length,
  notJikojiTokens: notJikoji,
  wasJikojiBeforeChange: wasJikoji,
  byStrong,
  byBook,
  analysis: {
    oldJikojiCount: 32169,
    newJikojiCount: 32317,
    diff: 148,
    explanation: `${allChanges.length}件変更中、変更後に現状維持=${nowJikoji.length}件、変更前に現状維持だったが変更後は現状維持でなくなった件数=${wasJikoji - (allChanges.length - notJikoji.length)}件（推定）`
  }
};

fs.writeFileSync(path.join(OUT_DIR,'stage2-addendum-task1.json'), JSON.stringify(result, null, 2), 'utf8');
console.log('\nTask1 output:', path.join(OUT_DIR,'stage2-addendum-task1.json'));
