#!/usr/bin/env node
/**
 * re-phase5c2-audit.cjs — Phase 5-C2: LN×Abbott 対応監査
 * （実装のみ・Engine 非接続。人間がレビューできる監査資料の生成）
 *
 * 実行: node scripts/re-phase5c2-audit.cjs
 * 出力: scripts/output/re-phase5c2-audit.json   … 全 (lemmaId, ln) レコード
 *       scripts/output/re-phase5c2-top100.json  … レビュー対象（上位 100 lemma の B/C）
 *
 * 入力: reading-ln-gloss-data.js / reading-lexicon-data.js /
 *       lexicon-lite.json / bible_data（NT）
 *
 * 自動分類（レビュー優先度の機械判定 — 語義の自然さ自体は判定しない）:
 *   A 一致       : 単一 ln の lemma、または多義 lemma の主要 ln
 *                  （現 gloss は使用実態の多数派 = 現状で十分）
 *   B 候補あり   : 多義 lemma の非主要 ln で、現 gloss 以外の候補
 *                  （Abbott-Smith 由来の日本語候補）が存在する
 *   C 要手動確認 : 非主要 ln だが代替候補がない（供給不足）、
 *                  または主要 ln が同数タイで自動決定不能
 *
 * ReadingEngine / ReadingLexicon / index.html / reading-semantic-data.js は
 * 一切変更しない。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { READING_LN_GLOSS } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-gloss-data.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const lite = JSON.parse(fs.readFileSync(
    path.join(PUBLIC, 'assets', 'data', 'lexicon', 'lexicon-lite.json'), 'utf8'));

// ── NT 走査: (lemmaId, ln) ごとの出現数・代表聖句、lemma ごとの総出現数 ──
const pairStats  = new Map();   // lemmaId|ln → { count, refs: [{ref, text}] }
const lemmaCount = new Map();   // lemmaId → NT 総出現数

for (const book of fs.readdirSync(NT_DIR)
        .filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort()) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json')).sort()) {
        for (const t of JSON.parse(
                fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'))) {
            if (!t.lemmaId) continue;
            lemmaCount.set(t.lemmaId, (lemmaCount.get(t.lemmaId) || 0) + 1);
            if (!t.ln || typeof t.ln !== 'string') continue;
            const ln = t.ln.split(' ')[0];
            const key = `${t.lemmaId}|${ln}`;
            if (!pairStats.has(key)) pairStats.set(key, { count: 0, refs: [] });
            const s = pairStats.get(key);
            s.count++;
            if (s.refs.length < 3) s.refs.push({ ref: t.ref, text: t.text });
        }
    }
}

// ── レコード生成 ────────────────────────────────────────────────────
const records = [];
for (const [lemmaId, byLn] of Object.entries(READING_LN_GLOSS)) {
    const liteE = lite[lemmaId] || {};
    const lexE  = readingLexiconData.entries[lemmaId] || {};
    const candidatesJa = Array.isArray(lexE.glosses) ? lexE.glosses : [];
    const lns = Object.keys(byLn);
    // lemma 内の主要 ln（出現数最大）と同数タイの検出
    let maxCount = -1, maxLn = null, tie = false;
    for (const ln of lns) {
        const c = pairStats.get(`${lemmaId}|${ln}`)?.count ?? 0;
        if (c > maxCount) { maxCount = c; maxLn = ln; tie = false; }
        else if (c === maxCount) tie = true;
    }
    for (const ln of lns) {
        const st = pairStats.get(`${lemmaId}|${ln}`) || { count: 0, refs: [] };
        const currentGloss = byLn[ln];
        const alternatives = candidatesJa.filter(g => g !== currentGloss);
        let cls;
        if (lns.length === 1) cls = 'A';
        else if (ln === maxLn && !tie) cls = 'A';
        else if (ln === maxLn && tie) cls = 'C';
        else cls = alternatives.length > 0 ? 'B' : 'C';
        records.push({
            lemma:       liteE.headword || '',
            lemmaId,
            ln,
            currentGloss,
            candidatesJa,                       // Abbott-Smith 由来の日本語抽出済み候補（4-C）
            alternatives,                       // 現 gloss 以外の候補
            glossEn:     liteE.gloss || '',     // lexicon-lite の英語 gloss（参考）
            glossJa:     liteE.gloss_ja || '',
            ntCount:     st.count,
            lemmaNtCount: lemmaCount.get(lemmaId) || 0,
            isDominantLn: ln === maxLn && !tie,
            refs:        st.refs,               // 代表聖句 3 件
            class:       cls,
        });
    }
}

// ── 並び順: 出現数 DESC → 分類 → lemma ──────────────────────────────
records.sort((a, b) =>
    (b.ntCount - a.ntCount) ||
    a.class.localeCompare(b.class) ||
    a.lemmaId.localeCompare(b.lemmaId) ||
    a.ln.localeCompare(b.ln));

// ── サマリー ────────────────────────────────────────────────────────
const summary = { A: 0, B: 0, C: 0 };
for (const r of records) summary[r.class]++;

// ── 上位 100 lemma のレビュー対象（B/C のみ） ────────────────────────
const reviewLemmas = [...new Set(
    records.filter(r => r.class !== 'A').map(r => r.lemmaId))]
    .sort((a, b) => (lemmaCount.get(b) || 0) - (lemmaCount.get(a) || 0))
    .slice(0, 100);
const reviewSet = new Set(reviewLemmas);
const top100 = reviewLemmas.map(id => ({
    lemmaId: id,
    lemma: (lite[id] || {}).headword || '',
    ntCount: lemmaCount.get(id) || 0,
    records: records.filter(r => r.lemmaId === id && r.class !== 'A'),
}));

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase5c2-audit.json'),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10),
                     summary, records }, null, 1));
fs.writeFileSync(path.join(OUT, 're-phase5c2-top100.json'),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10),
                     lemmas: top100.length, top100 }, null, 1));

console.log('Phase 5-C2 LN×Abbott 対応監査');
console.log('='.repeat(60));
console.log(`全レコード（lemmaId × ln）: ${records.length}`);
console.log(`  A 一致        : ${summary.A}`);
console.log(`  B 候補あり    : ${summary.B}`);
console.log(`  C 要手動確認  : ${summary.C}`);
console.log('');
console.log(`レビュー対象 lemma（B/C を持つ）: ${reviewSet.size >= 100 ? '100（上位抜粋）' : reviewSet.size}`);
console.log('');
console.log('── 上位レビュー対象サンプル（10 lemma） ──');
for (const e of top100.slice(0, 10)) {
    const r0 = e.records[0];
    console.log(`  ${e.lemma.padEnd(12)} (${e.lemmaId}, ${e.ntCount}回)  B/C ${e.records.length} 件  例: ln ${r0.ln} 現「${r0.currentGloss}」 候補 ${JSON.stringify(r0.alternatives.slice(0, 4))}`);
}
console.log('');
console.log('出力: scripts/output/re-phase5c2-audit.json / re-phase5c2-top100.json');
