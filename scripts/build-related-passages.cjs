#!/usr/bin/env node
/**
 * build-related-passages.cjs — #86 「関連する箇所」データの生成
 *
 * 入力: UBS Parallel Passage Database の ParallelPassages.xml
 *       （© 2023 United Bible Societies, CC BY-SA 4.0。
 *        https://github.com/ubsicap/ubs-open-license  parallel passages/ParallelPassages.xml）
 * 出力: public/assets/data/related-passages.json（生成物。直接編集しない）
 *
 * 使い方: node scripts/build-related-passages.cjs <ParallelPassages.xml のパス>
 *
 * 型フィールドは XML に無いため、グループの構成から導出する（解釈は加えない）:
 *   p（並行）= 同じグループ内の他の新約箇所
 *   o（旧約）= 同じグループ内の旧約箇所。LXX 本文（public/bible_data/lxx）に章・節があるかを確認して
 *              遷移先を決める。節が無ければ章、章が無ければ遷移先なし（b/c を持たない＝リンクにしない）。
 * 旧約のみのグループは使わない。同じ箇所が複数グループに出る場合は重複を除く。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'public', 'bible_data');
const outFile = path.join(root, 'public', 'assets', 'data', 'related-passages.json');

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/build-related-passages.cjs <ParallelPassages.xml>'); process.exit(1); }

const NT = new Set(['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV']);

const xml = fs.readFileSync(src, 'utf8').replace(/^﻿/, '');
const groups = [];
for (const m of xml.matchAll(/<Passage>([\s\S]*?)<\/Passage>/g)) {
    const refs = [...m[1].matchAll(/<Verse [^>]*>([^<]*)<\/Verse>/g)].map(x => x[1].trim());
    groups.push(refs);
}

/* "MRK 10:7-8" / "MRK 1:32,34" / "LUK 6:27-28,35" → { book, ch, verses:[…] }。解析できなければ null */
function parse(ref) {
    const m = /^([1-3A-Z]{3}) (\d+):([\d,\-]+)$/.exec(ref);
    if (!m) return null;
    const verses = [];
    for (const part of m[3].split(',')) {
        const r = /^(\d+)(?:-(\d+))?$/.exec(part);
        if (!r) return null;
        const a = +r[1], b = r[2] ? +r[2] : a;
        for (let v = a; v <= b; v++) verses.push(v);
    }
    return { ref, book: m[1], ch: +m[2], verses };
}

const lxxCache = new Map();
function lxxChapter(book, ch) {
    const key = book + '/' + ch;
    if (lxxCache.has(key)) return lxxCache.get(key);
    const f = path.join(dataDir, 'lxx', book, ch + '.json');
    let set = null;
    if (fs.existsSync(f)) {
        set = new Set();
        for (const t of JSON.parse(fs.readFileSync(f, 'utf8'))) {
            const r = /^[1-3A-Z]{3} \d+:(\d+)!/.exec(t.ref || '');
            if (r) set.add(+r[1]);
        }
    }
    lxxCache.set(key, set);
    return set;
}

/* ── MT → LXX 番号変換（旧約の遷移先・ラベル用） ── */
/* 詩篇: 先頭の節で分割される章（116, 147）は節で振り分ける。章のみを返す。 */
function psalmLxxChapter(ch, firstVerse) {
    if (ch <= 8) return ch;
    if (ch <= 10) return 9;
    if (ch <= 113) return ch - 1;
    if (ch <= 115) return 113;
    if (ch === 116) return firstVerse <= 9 ? 114 : 115;
    if (ch <= 146) return ch - 1;
    if (ch === 147) return firstVerse <= 11 ? 146 : 147;
    return ch;                                     // 148–150
}

/* 変換して { label, book, ch, verse|null } を返す。verse===null は章を開く。 */
function toLxx(o) {
    const first = o.verses[0];
    if (o.book === 'PSA') {
        const c = psalmLxxChapter(o.ch, first);
        return { label: `PSA ${c}`, book: 'PSA', ch: c, verse: null };
    }
    if (o.book === 'JER') {
        if (o.ch === 31) return { label: o.ref.replace(/^JER 31:/, 'JER 38:'), book: 'JER', ch: 38, verse: first };
        if (o.ch === 9 && o.ref === 'JER 9:23') return { label: 'JER 9:22', book: 'JER', ch: 9, verse: 22 };
    }
    if (o.book === 'PRO') {
        if (o.ref === 'PRO 25:21-22') return { label: 'PRO 27:21', book: 'PRO', ch: 27, verse: 21 };
        if (o.ref === 'PRO 26:11')    return { label: 'PRO 28:11', book: 'PRO', ch: 28, verse: 11 };
    }
    return { label: o.ref, book: o.book, ch: o.ch, verse: first };
}

/* 他の参照の範囲に完全に含まれる参照を落とす（同一範囲は先に出たものを残す）。 */
function dropContained(list) {
    return list.filter((x, i) => !list.some((y, j) =>
        j !== i && y.book === x.book && y.ch === x.ch &&
        x.verses.every(v => y.verses.includes(v)) &&
        (y.verses.length > x.verses.length || j < i)));
}

const out = {};
let ntVerses = 0, withOt = 0;
function slot(key) { return out[key] || (out[key] = { p: [], o: [] }); }

for (const refs of groups) {
    const ps = refs.map(parse).filter(Boolean);
    const nts = ps.filter(p => NT.has(p.book));
    const ots = ps.filter(p => !NT.has(p.book));
    if (!nts.length) continue;               // 旧約のみのグループは使わない
    for (const a of nts) {
        for (const v of a.verses) {
            const s = slot(`${a.book} ${a.ch}:${v}`);
            for (const b of nts) {
                if (b === a) continue;
                if (b.book === a.book && b.ch === a.ch && b.verses.includes(v)) continue;
                if (!s.p.some(x => x.ref === b.ref)) s.p.push(b);
            }
            for (const o of ots) {
                if (!s.o.some(x => x.ref === o.ref)) s.o.push(o);
            }
        }
    }
}

/* 区分ごとに、範囲に含まれる参照を落とし、旧約は LXX 番号へ変換して遷移先を確認する */
for (const k of Object.keys(out)) {
    const s = out[k];
    const p = dropContained(s.p).map(x => x.ref);
    const seen = new Set();
    const o = [];
    for (const x of dropContained(s.o)) {
        const t = toLxx(x);
        if (seen.has(t.label)) continue;
        seen.add(t.label);
        const item = { r: t.label };
        const set = lxxChapter(t.book, t.ch);
        if (set) {
            item.b = t.book; item.c = t.ch;
            if (t.verse != null && set.has(t.verse)) item.v = t.verse;
        }
        o.push(item);
    }
    if (p.length) s.p = p; else delete s.p;
    if (o.length) s.o = o; else delete s.o;
    if (!s.p && !s.o) delete out[k];
}

/* 参照順（書・章・節の出現順）に安定ソートしてキー順を固定する（差分を読みやすくする） */
const NT_ORDER = [...NT];
const keys = Object.keys(out).sort((x, y) => {
    const px = /^(\S+) (\d+):(\d+)$/.exec(x), py = /^(\S+) (\d+):(\d+)$/.exec(y);
    return (NT_ORDER.indexOf(px[1]) - NT_ORDER.indexOf(py[1])) || (+px[2] - +py[2]) || (+px[3] - +py[3]);
});
const sorted = {};
for (const k of keys) { sorted[k] = out[k]; if (out[k].o) withOt++; ntVerses++; }

const result = {
    _notice: 'Parallel passage data: UBS Parallel Passage Database, (c) 2023 United Bible Societies, licensed under CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Source: https://github.com/ubsicap/ubs-open-license (parallel passages/ParallelPassages.xml). This file is a derived work (grouped by New Testament verse; Old Testament targets resolved against the LXX text of this project) and is released under the same license, CC BY-SA 4.0. Generated by scripts/build-related-passages.cjs.',
    v: sorted
};
fs.writeFileSync(outFile, JSON.stringify(result));
console.log(`groups=${groups.length} ntVerses=${ntVerses} withOt=${withOt} -> ${path.relative(root, outFile)} (${fs.statSync(outFile).size} bytes)`);
