#!/usr/bin/env node
/**
 * IGSD 語義定義のスウェーデン語訳（def_sv）を原データ（igsd/lemmas/G*.json）へ書き込む（#136）。
 *
 * 入力：scripts/igsd-def-sv-map.json（{ "<Gxxx>:<senseId>": "<スウェーデン語>" }。808語義）
 * 動作：各語義の def_es 行の直後に def_sv 行を挿入する（テキスト単位の挿入のため、他のフィールド・
 *       書式・エスケープは1バイトも変わらない）。def_sv が既にある語義は触らない（再実行しても同じ結果＝冪等）。
 * 使い方：node scripts/apply-igsd-def-sv.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "public", "assets", "data", "igsd", "lemmas");
const map = JSON.parse(fs.readFileSync(path.join(__dirname, "igsd-def-sv-map.json"), "utf8"));
let added = 0, skipped = 0;
const missing = [];

for (const f of fs.readdirSync(dir).filter(n => /^G.*\.json$/.test(n)).sort()) {
    const p = path.join(dir, f);
    const text = fs.readFileSync(p, "utf8");
    const data = JSON.parse(text);
    const strong = f.replace(/\.json$/, "");
    let idx = 0;
    /* senses[] の各語義は "def_es" 行を1つずつ持つ。出現順に senses[] と対応づけて挿入する。 */
    const out = text.replace(/^([ \t]*)"def_es": ("(?:[^"\\]|\\.)*")(,?)(\r?\n)/gm, (m, ind, val, comma, eol) => {
        const s = data.senses[idx++];
        if ("def_sv" in s) { skipped++; return m; }
        const sv = map[strong + ":" + s.id];
        if (typeof sv !== "string" || sv === "") { missing.push(strong + ":" + s.id); return m; }
        added++;
        /* def_es が語義の最後のフィールドの場合に備え、カンマの位置を保つ */
        return ind + '"def_es": ' + val + "," + eol + ind + '"def_sv": ' + JSON.stringify(sv) + comma + eol;
    });
    if (idx !== data.senses.length) throw new Error(f + ": def_es 行の数（" + idx + "）が語義数（" + data.senses.length + "）と一致しない");
    if (out !== text) fs.writeFileSync(p, out, "utf8");
}
console.log("def_sv 追加:", added, "／既存:", skipped, "／訳なし:", missing.length);
if (missing.length) { console.error(missing.join("\n")); process.exit(1); }
