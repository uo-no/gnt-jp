#!/usr/bin/env node
"use strict";
/*
 * build-igsd-index.cjs — IGSD 索引ビルド
 *
 * public/assets/data/igsd/lemmas/*.json（1 ファイル = 1 見出し語、正本データ）を集約し、
 *   - index.json    : 見出し語ごとの要約（strong, strongs, lemma, status, senses[{id,label,count}], total）
 *   - sense-map.json: verseId -> "<Strong>:<senseId>" の全対応（<Strong> は見出し語の strong）
 * を生成する。生成物の仕様は Phase 1 設計 §2 に従う。
 *
 * 見出し語と Strong 番号:
 *   ファイル名は見出し語の代表 Strong（例 G3004.json）。1 ファイルが複数の Strong 番号を
 *   束ねる場合は strongs 配列を持つ（例 λέγω: G3004・G2036・G2046）。strongs が無い
 *   ファイルは strong 単独として扱う。index.json の strongs は常に配列で出力する。
 *
 * ビルド時検証:
 *   - assignments の verseId が bible_data に実在しない → エラー（終了コード非0、出力は書かない）
 *   - assignments の senseId がその lemma の senses に無い → エラー
 *   - 同じ verseId が複数の lemma に割り当てられている → エラー
 *   - status が final なのに bible_data 上の全トークン（strongs のいずれかと strong が一致）を
 *     assignments が覆っていない → 警告し、index.json では draft に落とす
 *
 * 使い方:
 *   node scripts/build-igsd-index.cjs [--lemmas-dir DIR] [--bible-data-dir DIR] [--out-dir DIR]
 *   node scripts/build-igsd-index.cjs --selftest
 */
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULTS = {
  lemmasDir: path.join(REPO_ROOT, "public/assets/data/igsd/lemmas"),
  bibleDataDir: path.join(REPO_ROOT, "public/bible_data/nt"),
  outDir: path.join(REPO_ROOT, "public/assets/data/igsd"),
};

function listJsonFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".json")) out.push(p);
    }
  })(dir);
  return out.sort();
}

function loadBibleData(bibleDataDir) {
  const verseIds = new Set();
  const byStrong = new Map(); // strong -> Set<verseId>
  for (const f of listJsonFiles(bibleDataDir)) {
    const toks = JSON.parse(fs.readFileSync(f, "utf8"));
    if (!Array.isArray(toks)) continue;
    for (const t of toks) {
      if (!t || !t.verseId) continue;
      verseIds.add(t.verseId);
      if (t.strong) {
        if (!byStrong.has(t.strong)) byStrong.set(t.strong, new Set());
        byStrong.get(t.strong).add(t.verseId);
      }
    }
  }
  return { verseIds, byStrong };
}

// 純粋な集約+検証（ファイル出力なし）。{ errors, warnings, index, senseMap } を返す。
function build(lemmasDir, bibleDataDir) {
  const errors = [];
  const warnings = [];
  const { verseIds, byStrong } = loadBibleData(bibleDataDir);

  const lemmaFiles = listJsonFiles(lemmasDir).filter((f) =>
    /^G\d+\.json$/.test(path.basename(f))
  );
  const seenVerse = new Map(); // verseId -> strong（重複検出）
  const index = [];
  const senseMap = {};

  for (const f of lemmaFiles) {
    const d = JSON.parse(fs.readFileSync(f, "utf8"));
    const { strong, lemma } = d;
    // strongs が無いファイルは strong 単独として扱う
    const strongs = Array.isArray(d.strongs) && d.strongs.length > 0 ? d.strongs : [strong];
    const senseIds = new Set((d.senses || []).map((s) => s.id));
    const assignments = d.assignments || {};
    const counts = {};
    for (const [verseId, senseId] of Object.entries(assignments)) {
      if (!verseIds.has(verseId)) {
        errors.push(`${strong}: assignments の verseId が bible_data に存在しない: ${verseId}`);
        continue;
      }
      if (!senseIds.has(senseId)) {
        errors.push(`${strong}: assignments の senseId が senses に無い: ${verseId} -> ${senseId}`);
        continue;
      }
      if (seenVerse.has(verseId)) {
        errors.push(`${strong}: verseId が ${seenVerse.get(verseId)} と重複して割り当てられている: ${verseId}`);
        continue;
      }
      seenVerse.set(verseId, strong);
      counts[senseId] = (counts[senseId] || 0) + 1;
      senseMap[verseId] = `${strong}:${senseId}`;
    }

    let status = d.status;
    if (status === "final") {
      const all = new Set();
      for (const s of strongs) for (const v of byStrong.get(s) || []) all.add(v);
      const missing = [...all].filter((v) => !(v in assignments));
      if (missing.length > 0) {
        warnings.push(
          `${strong} (${lemma}): final だが未割り当てトークンが ${missing.length} 件あるため index では draft に落とす`
        );
        status = "draft";
      }
    }

    index.push({
      strong,
      strongs,
      lemma,
      status,
      senses: (d.senses || []).map((s) => ({
        id: s.id,
        label: s.label,
        count: counts[s.id] || 0,
      })),
      total: Object.keys(assignments).length,
    });
  }

  index.sort((a, b) => a.strong.localeCompare(b.strong));
  return { errors, warnings, index, senseMap };
}

function run(opts) {
  const { errors, warnings, index, senseMap } = build(opts.lemmasDir, opts.bibleDataDir);
  for (const w of warnings) console.warn("WARN:", w);
  if (errors.length > 0) {
    for (const e of errors) console.error("ERROR:", e);
    console.error(`検証エラー ${errors.length} 件のため、出力ファイルは書きませんでした。`);
    return 1;
  }
  fs.mkdirSync(opts.outDir, { recursive: true });
  fs.writeFileSync(path.join(opts.outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
  fs.writeFileSync(path.join(opts.outDir, "sense-map.json"), JSON.stringify(senseMap, null, 2) + "\n");
  console.log(
    `OK: ${index.length} lemmas, ${Object.keys(senseMap).length} assignments -> index.json, sense-map.json`
  );
  return 0;
}

function selftest() {
  const fx = path.join(REPO_ROOT, "tests/fixtures/igsd");
  const lemmasDir = path.join(fx, "lemmas");
  const bibleDataDir = path.join(fx, "bible_data/nt");
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "igsd-selftest-"));
  let failures = 0;
  const check = (name, cond) => {
    console.log(`${cond ? "PASS" : "FAIL"}: ${name}`);
    if (!cond) failures++;
  };
  const mutatedLemmas = (fn) => {
    const dir = path.join(tmp, "lemmas");
    fs.mkdirSync(dir, { recursive: true });
    for (const f of fs.readdirSync(lemmasDir)) {
      const d = JSON.parse(fs.readFileSync(path.join(lemmasDir, f), "utf8"));
      fn(d, f);
      fs.writeFileSync(path.join(dir, f), JSON.stringify(d));
    }
    return dir;
  };

  // 正常系：生成と集計
  {
    const r = build(lemmasDir, bibleDataDir);
    check("正常系：エラーなし", r.errors.length === 0);
    check("正常系：警告なし（final の G9002 は全トークンを覆う）", r.warnings.length === 0);
    const g1 = r.index.find((x) => x.strong === "G9001");
    const g2 = r.index.find((x) => x.strong === "G9002");
    check("正常系：G9001 total=3, count 集計 2/1", g1 && g1.total === 3 && g1.senses[0].count === 2 && g1.senses[1].count === 1);
    check("正常系：G9002 は final のまま", g2 && g2.status === "final" && g2.total === 2);
    check("正常系：sense-map の対応", r.senseMap["n99001001001"] === "G9001:1" && r.senseMap["n99001001005"] === "G9002:1");
    // strongs を持つ見出し語（G9003 は G9003・G9004 の2つの Strong を束ねる）
    const g3 = r.index.find((x) => x.strong === "G9003");
    check("strongs：配列が index に出力される", g3 && JSON.stringify(g3.strongs) === JSON.stringify(["G9003", "G9004"]));
    check("strongs：strongs の無い見出し語は strong 単独の配列になる", JSON.stringify(g1.strongs) === JSON.stringify(["G9001"]));
    check("strongs：全 Strong のトークンを覆えば final のまま、total=3", g3 && g3.status === "final" && g3.total === 3);
    check("strongs：2つ目の Strong のトークンも sense-map に入る（値は見出し語の strong）", r.senseMap["n99002001003"] === "G9003:2");
  }
  // 異常系：存在しない verseId
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9001") d.assignments["n99001009999"] = "1";
    });
    const r = build(dir, bibleDataDir);
    check("異常系：存在しない verseId をエラーにする", r.errors.some((e) => e.includes("n99001009999")));
  }
  // 異常系：存在しない senseId
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9001") d.assignments["n99001001001"] = "9";
    });
    const r = build(dir, bibleDataDir);
    check("異常系：存在しない senseId をエラーにする", r.errors.some((e) => e.includes("senseId")));
  }
  // 異常系：verseId の重複割り当て
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9002") d.assignments["n99001001001"] = "1";
    });
    const r = build(dir, bibleDataDir);
    check("異常系：複数 lemma への重複割り当てをエラーにする", r.errors.some((e) => e.includes("重複")));
  }
  // 警告系：final なのに未割り当てがある
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9002") delete d.assignments["n99001001005"];
    });
    const r = build(dir, bibleDataDir);
    const g2 = r.index.find((x) => x.strong === "G9002");
    check("警告系：未割り当てのある final は警告して draft に落とす", r.warnings.length === 1 && g2.status === "draft");
  }
  // 警告系：strongs の2つ目の Strong のトークンが未割り当て
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9003") delete d.assignments["n99002001003"];
    });
    const r = build(dir, bibleDataDir);
    const g3 = r.index.find((x) => x.strong === "G9003");
    check("警告系：strongs の別 Strong のトークンが未割り当てなら final を draft に落とす", r.warnings.length === 1 && g3.status === "draft");
  }
  // 異常系：strongs を持つ見出し語でも senseId 検証は維持される
  {
    const dir = mutatedLemmas((d) => {
      if (d.strong === "G9003") d.assignments["n99002001003"] = "9";
    });
    const r = build(dir, bibleDataDir);
    check("異常系：strongs を持つ見出し語でも存在しない senseId はエラー", r.errors.some((e) => e.includes("G9003") && e.includes("senseId")));
  }
  // 出力の書き込みと読み戻し（正常系のみ、tmp へ）
  {
    const outDir = path.join(tmp, "out");
    const code = run({ lemmasDir, bibleDataDir, outDir });
    const idx = JSON.parse(fs.readFileSync(path.join(outDir, "index.json"), "utf8"));
    check("出力：index.json / sense-map.json を書ける", code === 0 && idx.length === 3 && Array.isArray(idx[0].strongs));
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(failures === 0 ? "SELFTEST: ALL PASS" : `SELFTEST: ${failures} FAILURES`);
  return failures === 0 ? 0 : 1;
}

function main(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--selftest") return selftest();
    else if (a === "--lemmas-dir") opts.lemmasDir = argv[++i];
    else if (a === "--bible-data-dir") opts.bibleDataDir = argv[++i];
    else if (a === "--out-dir") opts.outDir = argv[++i];
    else {
      console.error("unknown argument:", a);
      return 2;
    }
  }
  return run(opts);
}

process.exit(main(process.argv));
