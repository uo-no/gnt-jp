/**
 * build-gloss-en-senses.cjs — 英語UIの語義行（最大3件）用データ生成
 *
 * 源: public/assets/data/abbott-smith.tsv の description_en（Abbott-Smith 原文・
 * パブリックドメイン）。各エントリ冒頭の語義群を機械抽出し、
 * public/assets/data/lexicon/gloss-en-senses.json を生成する。
 *   { "2822": ["called", "invited"], ... }  ← キーは Strong 数字
 *
 * 抽出方針（監査可能性のため保守的）:
 *   - 頻度・見出し形・語源括弧・LXX 括弧注を除去し、最初の語義群だけを取る
 *   - 語義は英語のみ・短いものだけを検証して残す。検証を通らないエントリは
 *     出力に含めない（実行時は lexicon-lite の gloss へフォールバック）
 * 再生成: node scripts/build-gloss-en-senses.cjs
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TSV = path.join(ROOT, 'public', 'assets', 'data', 'abbott-smith.tsv');
const OUT = path.join(ROOT, 'public', 'assets', 'data', 'lexicon', 'gloss-en-senses.json');

const GREEK = /[Ͱ-Ͽἀ-῿]/;
const QUALIFIER_PREFIX = [
    /^in (an? )?(active|passive|middle|transitive|intransitive|figurative|literal|proper|collective) sense,?\s*/i,
    /^as (a )?subst\.?,?\s*/i,
    /^(fig\.|metaph\.|lit\.|prop\.|absol\.|abs\.)\s*/i,
];
const STOP_SENSE = new Set(['sense', 'subst', 'fig', 'metaph', 'lit', 'prop', 'absol', 'abs',
    'intrans', 'trans', 'reflex', 'pass', 'act', 'mid', 'c', 'cf', 'viz', 'al', 'a', 'the', 'to', 'of']);
/* 語義の中にこの語が混ざっていたら、その語義は採用しない（文法略号・ラテン語グロス等） */
const STOP_WORD = new Set(['lat', 'heb', 'aram', 'syr', 'vulg', 'lxx', 'voc', 'dat', 'acc', 'gen',
    'nom', 'indecl', 'aor', 'pres', 'fut', 'perf', 'impv', 'subj', 'ptc', 'dep', 'adj', 'adv',
    'prep', 'conj', 'pron', 'art', 'num', 'ord', 'cl', 'oratio', 'sermo', 'vox', 'verbum', 'homo']);

function stripParens(s, open, close) {
    let prev;
    do { prev = s; s = s.replace(new RegExp('\\' + open + '[^\\' + open + '\\' + close + ']*\\' + close, 'g'), ' '); } while (s !== prev);
    return s;
}

function pickSenses(seg) {
    let s = seg.split(/\.\s/)[0].trim().replace(/\.$/, '');
    for (const re of QUALIFIER_PREFIX) s = s.replace(re, '');
    const senses = [];
    for (let part of s.split(',')) {
        part = part.trim().replace(/^(and|or)\s+/i, '');
        if (!part) continue;
        if (GREEK.test(part)) continue;
        if (/\d/.test(part)) continue;
        if (!/^[A-Za-z][A-Za-z '\-]*$/.test(part)) continue;
        if (part.length < 2 || part.length > 40) continue;
        if (/\bNT\b/.test(part)) continue;
        if (/^as\s/i.test(part)) continue;                   // as medical term 等の用法注記
        if (/^without\b/i.test(part) || /\bin use\b/i.test(part)) continue;
        if (STOP_SENSE.has(part.toLowerCase())) continue;
        if (/^[a-z]+ly$/.test(part)) continue;               // generically 等の修飾語
        const words = part.toLowerCase().split(/[\s'\-]+/).map(w => w.replace(/[^a-z]/g, ''));
        if (words.some(w => STOP_WORD.has(w))) continue;
        if (/^[A-Z]{3,}$/.test(part)) part = part[0] + part.slice(1).toLowerCase();  // JESUS → Jesus
        senses.push(part);
        if (senses.length >= 3) break;
    }
    return senses;
}

function extractSenses(descEn) {
    if (!descEn) return null;
    let s = ' ' + descEn.trim();
    s = s.replace(/^\s*\d+\s+/, ' ');            // 頻度
    s = s.replace(/^\s*†\s*/, ' ');
    s = stripParens(s, '[', ']');                // LXX・出典注
    s = stripParens(s, '(', ')');                // 語源・参照
    s = s.replace(/\s+/g, ' ').trim();
    // 先頭の見出し形トークン（ギリシャ語・語尾形）を落とす。
    // ギリシャ語と英語が混ざったトークンは、ギリシャ語部分だけ落として残りを使う。
    const toks = s.split(',');
    let i = 0;
    while (i < toks.length) {
        const t = toks[i].trim();
        if (t === '' || /^-\S*$/.test(t)) { i++; continue; }
        if (GREEK.test(t)) {
            const rest = t.split(/\s+/).filter(w => !GREEK.test(w)).join(' ').trim();
            if (rest && !/^-\S*$/.test(rest)) { toks[i] = ' ' + rest; }
            else { i++; continue; }
        }
        break;
    }
    s = toks.slice(i).join(',');
    // 最初の語義群まで（; の手前）。: の手前が1件だけなら、: の後も拾う（ἄνθρωπος 型）
    let head = s.split(';')[0];
    let seg = head.split(':')[0];
    let senses = pickSenses(seg);
    if (senses.length === 1 && senses[0].length <= 12 && head.includes(':')) {
        const tail = head.split(':').slice(1).join(':').split(/\.\s/)[0];
        senses = senses.concat(pickSenses(tail)).slice(0, 3);
    }
    return senses.length ? senses : null;
}

const lines = fs.readFileSync(TSV, 'utf8').split(/\r?\n/);
const header = lines[0].split('\t');
const enIdx = header.indexOf('description_en');
const out = {};
let total = 0, withMulti = 0, withOne = 0;
for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split('\t');
    const strong = (cols[0] || '').trim();
    if (!strong) continue;
    total++;
    const senses = extractSenses(cols[enIdx] || '');
    if (senses) {
        out[strong] = senses;
        if (senses.length >= 2) withMulti++; else withOne++;
    }
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`entries: ${total}`);
console.log(`extracted: ${Object.keys(out).length} (${(Object.keys(out).length / total * 100).toFixed(1)}%) — >=2 senses: ${withMulti}, 1 sense: ${withOne}, fallback: ${total - Object.keys(out).length}`);
console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
// 監査サンプル
for (const g of ['2822', '1401', '26', '2316', '4102', '3056', '2424', '1223', '444', '5207']) {
    console.log(`G${g}:`, JSON.stringify(out[g] || null));
}
