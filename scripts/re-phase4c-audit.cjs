#!/usr/bin/env node
/**
 * re-phase4c-audit.cjs — Phase 4-C Lexicon Enrichment 監査
 *
 * 実行: node scripts/re-phase4c-audit.cjs
 * 出力: scripts/output/re-phase4c-audit.json + コンソールレポート
 *
 * 目的: Phase 5 Semantic Layer に必要な語彙情報が ReadingLexicon に
 *       揃っていることを確認する。
 *
 * 監査項目:
 *   1. glosses 複数候補カバレッジ（エントリ単位・NT トークン加重）
 *   2. enrich() 後の補強フィールドカバレッジ（glossJa / abbottSmith / ln / domains）
 *   3. lookup() の完全性（基本層 + 補強層の統合・凍結・deponent 維持）
 *   4. サンプルエントリの目視確認用ダンプ
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

const { ReadingLexicon, READING_LEXICON_VERSION } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const liteData = JSON.parse(fs.readFileSync(
    path.join(PUBLIC, 'assets', 'data', 'lexicon', 'lexicon-lite.json'), 'utf8'));

const lex = new ReadingLexicon(readingLexiconData);
const enrichedCount = lex.enrich(liteData);

// ── 1. エントリ単位カバレッジ ───────────────────────────────────────
const ids = Object.keys(readingLexiconData.entries);
const stat = {
    version: { data: readingLexiconData.version, lexicon: READING_LEXICON_VERSION },
    entries: ids.length,
    enriched: enrichedCount,
    glosses: { none: 0, single: 0, multi: 0, totalCandidates: 0 },
    fields:  { glossJa: 0, abbottSmith: 0, ln: 0, domains: 0 },
};
for (const id of ids) {
    const e = lex.lookup(id);
    const n = e.glosses.length;
    stat.glosses.totalCandidates += n;
    if (n === 0) stat.glosses.none++;
    else if (n === 1) stat.glosses.single++;
    else stat.glosses.multi++;
    if (e.glossJa) stat.fields.glossJa++;
    if (e.abbottSmith) stat.fields.abbottSmith++;
    if (e.semanticDomains?.ln?.length) stat.fields.ln++;
    if (e.semanticDomains?.domains?.length) stat.fields.domains++;
}

// ── 2. NT トークン加重カバレッジ（Semantic が実際に効く範囲） ────────
let tokTotal = 0, tokMulti = 0, tokLn = 0;
const multiSet = new Set(ids.filter(id => lex.lookup(id).glosses.length >= 2));
const lnSet    = new Set(ids.filter(id => lex.lookup(id).semanticDomains?.ln?.length));
for (const book of fs.readdirSync(NT_DIR).filter(b =>
        fs.statSync(path.join(NT_DIR, b)).isDirectory())) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book)).filter(f => f.endsWith('.json'))) {
        for (const t of JSON.parse(fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'))) {
            if (!t.lemmaId) continue;
            tokTotal++;
            if (multiSet.has(t.lemmaId)) tokMulti++;
            if (lnSet.has(t.lemmaId)) tokLn++;
        }
    }
}
stat.tokenWeighted = {
    total: tokTotal,
    multiGloss: tokMulti,
    multiGlossPct: Number((tokMulti / tokTotal * 100).toFixed(1)),
    lnAvailable: tokLn,
    lnAvailablePct: Number((tokLn / tokTotal * 100).toFixed(1)),
};

// ── 3. 完全性チェック ───────────────────────────────────────────────
const checks = [];
const ck = (name, ok) => checks.push({ name, ok });
{
    const logos = lex.lookup('grc:G3056');
    ck('λόγος: 複数 glosses', logos.glosses.length >= 3);
    ck('λόγος: 第一候補は実使用グロス（ことば）', logos.glosses[0] === 'ことば');
    ck('λόγος: glossJa 付与', !!logos.glossJa);
    ck('λόγος: abbottSmith 付与', !!logos.abbottSmith);
    ck('λόγος: ln コード付与', logos.semanticDomains.ln.length >= 5);
    ck('凍結: entry', Object.isFrozen(logos));
    ck('凍結: glosses', Object.isFrozen(logos.glosses));
    ck('凍結: semanticDomains', Object.isFrozen(logos.semanticDomains));
    const apo = lex.lookup('grc:G611');
    ck('deponent 維持（ἀποκρίνομαι）', apo.deponent === true);
    const depCount = ids.filter(id => lex.lookup(id).deponent).length;
    ck('deponent 19 件', depCount === 19);
    // enrich 前でも安全
    const cold = new ReadingLexicon(readingLexiconData);
    const coldE = cold.lookup('grc:G3056');
    ck('enrich 前: glossJa null', coldE.glossJa === null);
    ck('enrich 前: glosses は基本層から返る', coldE.glosses.length >= 3);
    ck('enrich 前: deponent 有効', cold.lookup('grc:G611').deponent === true);
    ck('enrich 不正入力で例外なし', cold.enrich(null) === 0);
}

// ── 4. サンプル ─────────────────────────────────────────────────────
const samples = {};
for (const [id, name] of [['grc:G3056', 'λόγος'], ['grc:G4151', 'πνεῦμα'],
                          ['grc:G2316', 'θεός'], ['grc:G1096', 'γίνομαι'],
                          ['grc:G4100', 'πιστεύω']]) {
    const e = lex.lookup(id);
    samples[name] = {
        glosses: e.glosses,
        glossJa: e.glossJa ? e.glossJa.slice(0, 40) : null,
        abbottSmith: e.abbottSmith ? `(${e.abbottSmith.length}字)` : null,
        ln: e.semanticDomains?.ln ?? null,
        deponent: e.deponent,
    };
}

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase4c-audit.json'),
    JSON.stringify({ stat, checks, samples }, null, 2));

const pct = (n, d) => (n / d * 100).toFixed(1) + '%';
console.log(`Phase 4-C Lexicon Enrichment Audit (data v${stat.version.data} / lexicon ${stat.version.lexicon})`);
console.log('='.repeat(64));
console.log(`エントリ数        : ${stat.entries}`);
console.log(`enrich 適用       : ${stat.enriched} (${pct(stat.enriched, stat.entries)})`);
console.log('');
console.log('── glosses（語義候補）──');
console.log(`  複数候補 (≥2)   : ${stat.glosses.multi} (${pct(stat.glosses.multi, stat.entries)})`);
console.log(`  単一候補        : ${stat.glosses.single}`);
console.log(`  候補なし        : ${stat.glosses.none}`);
console.log(`  平均候補数      : ${(stat.glosses.totalCandidates / stat.entries).toFixed(2)}`);
console.log('');
console.log('── enrich 後の補強フィールド ──');
console.log(`  glossJa         : ${stat.fields.glossJa} (${pct(stat.fields.glossJa, stat.entries)})`);
console.log(`  abbottSmith     : ${stat.fields.abbottSmith} (${pct(stat.fields.abbottSmith, stat.entries)})`);
console.log(`  ln (Louw-Nida)  : ${stat.fields.ln} (${pct(stat.fields.ln, stat.entries)})`);
console.log(`  domains         : ${stat.fields.domains} (${pct(stat.fields.domains, stat.entries)})`);
console.log('');
console.log('── NT トークン加重（Semantic が効く範囲）──');
console.log(`  複数候補 lemma のトークン : ${stat.tokenWeighted.multiGloss} / ${stat.tokenWeighted.total} (${stat.tokenWeighted.multiGlossPct}%)`);
console.log(`  ln 利用可能トークン       : ${stat.tokenWeighted.lnAvailable} / ${stat.tokenWeighted.total} (${stat.tokenWeighted.lnAvailablePct}%)`);
console.log('');
console.log('── 完全性チェック ──');
let fails = 0;
for (const c of checks) {
    if (!c.ok) fails++;
    console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}`);
}
console.log('');
console.log('── サンプル ──');
for (const [name, s] of Object.entries(samples)) {
    console.log(`  ${name}: glosses=${JSON.stringify(s.glosses.slice(0, 6))}${s.glosses.length > 6 ? '…' : ''} ln=${s.ln ? s.ln.length : 0}件 AS=${s.abbottSmith ?? 'なし'}`);
}
console.log('');
console.log(fails === 0 ? 'AUDIT PASS' : `AUDIT FAIL (${fails})`);
console.log(`詳細: scripts/output/re-phase4c-audit.json`);
process.exit(fails ? 1 : 0);
