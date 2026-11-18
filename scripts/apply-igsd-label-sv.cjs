#!/usr/bin/env node
/**
 * IGSD 語義ラベルのスウェーデン語訳（label_sv）を原データ（igsd/lemmas/G*.json）へ書き込む（#135）。
 *
 * 入力：scripts/igsd-label-sv-map.json（{ "<日本語ラベル>": "<スウェーデン語>" }。日本語ラベル785種）
 * 動作：各語義の label_es 行の直後に label_sv 行を挿入する（テキスト単位の挿入のため、他のフィールド・
 *       書式・エスケープは1バイトも変わらない）。同一の日本語ラベルには同一の訳を当てる。
 *       label_sv が既にある語義は触らない（再実行しても同じ結果＝冪等）。
 * 使い方：node scripts/apply-igsd-label-sv.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "assets", "data", "igsd", "lemmas");
const map = JSON.parse(fs.readFileSync(path.join(__dirname, "igsd-label-sv-map.json"), "utf8"));
let added = 0, skipped = 0;
const missing = new Set();

for (const f of fs.readdirSync(dir).filter(n => /^G.*\.json$/.test(n)).sort()) {
    const p = path.join(dir, f);
    const text = fs.readFileSync(p, "utf8");
    const data = JSON.parse(text);
    const labelsByIdx = data.senses.map(s => s.label);
    let idx = 0;
    /* senses[] の各語義は "label_es" 行を1つずつ持つ。出現順に senses[] と対応づけて挿入する。 */
    const out = text.replace(/^([ \t]*)"label_es": (?:"(?:[^"\\]|\\.)*"),?\r?\n/gm, (m, ind) => {
        const s = data.senses[idx++];
        if ("label_sv" in s) { skipped++; return m; }
        const sv = map[s.label];
        if (typeof sv !== "string" || sv === "") { missing.add(s.label); return m; }
        added++;
        const eol = m.endsWith("\r\n") ? "\r\n" : "\n";
        return m + ind + '"label_sv": ' + JSON.stringify(sv) + "," + eol;
    });
    if (idx !== data.senses.length) throw new Error(f + ": label_es 行の数（" + idx + "）が語義数（" + data.senses.length + "）と一致しない");
    if (out !== text) fs.writeFileSync(p, out, "utf8");
}
console.log("label_sv 追加:", added, "／既存:", skipped, "／訳なし:", missing.size);
if (missing.size) { console.error([...missing].join("\n")); process.exit(1); }
