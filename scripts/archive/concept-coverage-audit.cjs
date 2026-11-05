#!/usr/bin/env node
/**
 * concept-coverage-audit.cjs — Concept Coverage 監査（Pattern Search Phase 4-5）
 *
 * 実行: node scripts/concept-coverage-audit.cjs [--nt-only]
 * 出力: scripts/output/concept-coverage.{md,json} ＋ コンソール要約
 * 終了コード: FAIL（出現0の死んだ lemma）が1件でもあれば 1
 *
 * 目的: Concept を 30〜50 件へ拡張する前に、
 *   1. 既存 Concept のカバレッジ（lemma数・出現数・書巻数・節数）
 *   2. 高頻度なのに未登録のテーマ候補（gloss クラスタ / domain / lemma 頻度）
 *   3. Concept 間の出現数バランス
 *   4. ほとんど出現しない孤立 lemma
 *   を人間の判断材料として一覧化する。
 *
 * このツールは Concept を自動生成しない（候補の提示のみ）。
 * 読み取り専用: bible_data / lemma_dict / search-concepts /
 * semantic-domain-labels を参照するだけで、検索機能・UI・Runtime に触れない。
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');
const NT_ONLY = process.argv.includes('--nt-only');

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const conceptsFile = readJson(path.join(PUBLIC, 'assets', 'data', 'search-concepts.json'));
const booksMaster  = readJson(path.join(PUBLIC, 'books.json'));
const domainLabels = readJson(path.join(PUBLIC, 'assets', 'data', 'index', 'semantic-domain-labels.json'));

const concepts = conceptsFile.concepts || [];

/* 概念ごとの lemma 集合と、登録済み lemma / 発火語の全体集合 */
const conceptLemmas = new Map();   // id → Set<lemma>
const registeredLemmas = new Set();
const fireWords = new Set();       // label + aliases（候補キーワードの除外に使う）
for (const c of concepts) {
    const set = new Set((c.terms || []).filter(t => t.axis === 'lemma').map(t => t.value));
    conceptLemmas.set(c.id, set);
    for (const l of set) registeredLemmas.add(l);
    fireWords.add(c.label);
    for (const a of (c.aliases || [])) fireWords.add(a);
}

/* ── コーパス走査（book/章 ごとに読み捨て・集計のみ保持） ── */
const conceptStats = new Map(concepts.map(c =>
    [c.id, { occ: 0, books: new Set(), verses: new Set() }]));
const lemmaOcc   = new Map();   // lemma → 出現数（全コーパス）
const lemmaGloss = new Map();   // lemma → 代表グロス
const lemmaClass = new Map();   // lemma → class
const domainOcc  = new Map();   // domain code → 出現数

const CONTENT_CLASS = new Set(['noun', 'verb', 'adj', 'adjective']);

const books = NT_ONLY
    ? booksMaster.NT.map(b => ({ key: b.key, sub: 'nt' }))
    : [...booksMaster.NT.map(b => ({ key: b.key, sub: 'nt' })),
       ...booksMaster.OT.map(b => ({ key: b.key, sub: 'lxx' }))];

let totalTokens = 0, totalVerses = 0;
for (const b of books) {
    for (let ch = 1; ch <= 200; ch++) {
        const fp = path.join(PUBLIC, 'bible_data', b.sub, b.key, `${ch}.json`);
        if (!fs.existsSync(fp)) break;
        const tokens = readJson(fp);
        const seenVerse = new Set();
        for (const t of tokens) {
            totalTokens++;
            const lemma = t.lemma || '';
            const vKey  = String(t.ref || '').split('!')[0];
            if (vKey && !seenVerse.has(vKey)) { seenVerse.add(vKey); totalVerses++; }
            if (lemma) {
                lemmaOcc.set(lemma, (lemmaOcc.get(lemma) || 0) + 1);
                if (!lemmaGloss.get(lemma) && t.japanese) lemmaGloss.set(lemma, t.japanese);
                if (!lemmaClass.get(lemma) && t.class) lemmaClass.set(lemma, String(t.class).toLowerCase());
            }
            if (t.domain) domainOcc.set(t.domain, (domainOcc.get(t.domain) || 0) + 1);
            for (const [cid, set] of conceptLemmas) {
                if (set.has(lemma)) {
                    const s = conceptStats.get(cid);
                    s.occ++; s.books.add(b.key); s.verses.add(vKey);
                }
            }
        }
    }
    process.stderr.write(`  scanned ${b.key}\n`);
}

/* ── 監査1: 既存 Concept の coverage ── */
const coverage = concepts.map(c => {
    const s = conceptStats.get(c.id);
    return { id: c.id, label: c.label, terms: (c.terms || []).length,
             occurrences: s.occ, books: s.books.size, verses: s.verses.size };
});

/* ── 監査4: 孤立 lemma（出現 <5 は WARNING、0 は FAIL） ── */
const fails = [], warnings = [];
const lemmaDetail = [];
for (const c of concepts) {
    for (const l of conceptLemmas.get(c.id)) {
        const n = lemmaOcc.get(l) || 0;
        lemmaDetail.push({ concept: c.id, lemma: l, occ: n });
        if (n === 0) fails.push(`[lemma] ${c.id}: ${l} はコーパスに出現しない（死んだ Term）`);
        else if (n < 5) warnings.push(`[lemma] ${c.id}: ${l} の出現はわずか ${n} 回（孤立 lemma）`);
    }
}

/* ── 監査3: Concept バランス ── */
const sorted = [...coverage].sort((a, b) => b.occurrences - a.occurrences);
const hi = sorted[0], lo = sorted[sorted.length - 1];
const ratio = lo && lo.occurrences > 0 ? (hi.occurrences / lo.occurrences) : Infinity;
if (ratio > 20) warnings.push(
    `[balance] 出現数の偏りが ${ratio.toFixed(1)}倍: High ${hi.id} ${hi.occurrences} / Low ${lo.id} ${lo.occurrences}`);

/* ── 監査2: 高頻度未登録テーマ候補 ── */
/* (a) gloss の漢字キーワードクラスタ:
       未登録の内容語 lemma のグロスから漢字列を抽出し、
       キーワード → {出現合計, lemma数} で集計する。
       文法用語・既存発火語は除外。1文字キーワードは高頻度のみ採用 */
const STOP_KEYWORDS = new Set(['冠詞', '語句', '転換', '理由', '結論', '接続', '疑問',
    '否定', '関係', '指示', '人称', '代名詞', '前置', '感嘆', '間投']);
const kw = new Map();   // keyword → { occ, lemmas:Set }
for (const [lemma, occ] of lemmaOcc) {
    if (registeredLemmas.has(lemma)) continue;
    const cls = lemmaClass.get(lemma) || '';
    if (!CONTENT_CLASS.has(cls)) continue;
    const gloss = lemmaGloss.get(lemma) || '';
    const kanjiWords = gloss.match(/[一-鿿]+/g) || [];
    for (const w of new Set(kanjiWords)) {
        if (STOP_KEYWORDS.has(w)) continue;
        let e = kw.get(w);
        if (!e) { e = { occ: 0, lemmas: new Set() }; kw.set(w, e); }
        e.occ += occ; e.lemmas.add(lemma);
    }
}
const glossCandidates = [...kw.entries()]
    .filter(([w, e]) => !fireWords.has(w))
    .filter(([w, e]) => e.lemmas.size >= 2 && e.occ >= (w.length === 1 ? 300 : 150))
    .sort((a, b) => b[1].occ - a[1].occ)
    .slice(0, 25)
    .map(([w, e]) => ({ keyword: w, occurrences: e.occ, lemmaCount: e.lemmas.size,
        sampleLemmas: [...e.lemmas].sort((x, y) => (lemmaOcc.get(y) || 0) - (lemmaOcc.get(x) || 0)).slice(0, 5) }));

/* (a2) シードテーマの実測: Phase 4-5 仕様の候補例（人間の判断材料）。
   純粋な頻度順では「主・子・人」等の一般語が上位を占めるため、
   神学的テーマの候補はこの固定シード（自動追加はしない）を実測して提示する */
const SEED_THEMES = ['罪', '義', '御国', '王国', '霊', '命', '死', '復活', '栄光',
    '聖', '悔い改め', '希望', '平安', '真理', '従順'];
const seedCandidates = SEED_THEMES.map(w => {
    const e = kw.get(w);
    return { keyword: w,
             occurrences: e ? e.occ : 0,
             lemmaCount: e ? e.lemmas.size : 0,
             sampleLemmas: e ? [...e.lemmas].sort((x, y) => (lemmaOcc.get(y) || 0) - (lemmaOcc.get(x) || 0)).slice(0, 5) : [],
             registered: fireWords.has(w) };
}).filter(s => !s.registered);

/* (b) 高頻度 domain（Louw-Nida サブドメイン）: 上位を日本語ラベルつきで提示 */
const sub = domainLabels.subdomains || {};
const domainCandidates = [...domainOcc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([code, occ]) => ({ code, occ, label: (sub[code] && sub[code].title) || '(ラベルなし)' }));

/* (c) 高頻度未登録 lemma（素材リスト） */
const topLemmas = [...lemmaOcc.entries()]
    .filter(([l]) => !registeredLemmas.has(l) && CONTENT_CLASS.has(lemmaClass.get(l) || ''))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([l, n]) => ({ lemma: l, occ: n, gloss: lemmaGloss.get(l) || '' }));

/* ── 出力 ── */
const result = {
    generated: new Date().toISOString(),
    corpus: { scope: NT_ONLY ? 'NT' : 'NT+LXX', tokens: totalTokens, verses: totalVerses },
    coverage, lemmaDetail,
    balance: { high: hi, low: lo, ratio: Number.isFinite(ratio) ? Number(ratio.toFixed(1)) : null },
    candidates: { glossClusters: glossCandidates, seedThemes: seedCandidates,
                  domains: domainCandidates, topLemmas },
    fails, warnings,
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'concept-coverage.json'), JSON.stringify(result, null, 2) + '\n');

const md = [];
md.push('# Concept Coverage Report');
md.push('');
md.push(`生成: ${result.generated} / コーパス: ${result.corpus.scope}（${totalTokens.toLocaleString()} トークン・${totalVerses.toLocaleString()} 節）`);
md.push('');
md.push('## Current Concepts（監査1）');
md.push('');
md.push('| Concept | Label | Terms | Hits | Books | Verses |');
md.push('|---|---|---|---|---|---|');
for (const c of coverage) md.push(`| ${c.id} | ${c.label} | ${c.terms} | ${c.occurrences} | ${c.books} | ${c.verses} |`);
md.push('');
md.push('### Concept 内 lemma 別出現（監査4の根拠）');
md.push('');
md.push('| Concept | Lemma | Hits |');
md.push('|---|---|---|');
for (const d of lemmaDetail.sort((a, b) => a.concept.localeCompare(b.concept) || b.occ - a.occ)) {
    md.push(`| ${d.concept} | ${d.lemma} | ${d.occ}${d.occ < 5 ? ' ⚠️' : ''} |`);
}
md.push('');
md.push('## Missing Concept Candidates（監査2・自動追加はしない）');
md.push('');
md.push('### (a) gloss キーワードクラスタ（未登録・内容語のみ）');
md.push('');
md.push('| Keyword | Hits | Lemma数 | 代表 lemma | reason |');
md.push('|---|---|---|---|---|');
for (const g of glossCandidates) {
    md.push(`| ${g.keyword} | ${g.occurrences} | ${g.lemmaCount} | ${g.sampleLemmas.join(' ')} | repeated gloss cluster |`);
}
md.push('');
md.push('### (a2) シードテーマの実測（神学的候補・自動追加はしない）');
md.push('');
md.push('| Theme | Hits | Lemma数 | 代表 lemma | reason |');
md.push('|---|---|---|---|---|');
for (const s of seedCandidates) {
    md.push(`| ${s.keyword} | ${s.occurrences} | ${s.lemmaCount} | ${s.sampleLemmas.join(' ')} | ${s.occurrences > 0 ? 'repeated gloss cluster' : 'gloss 未出現（要手動定義）'} |`);
}
md.push('');
md.push('### (b) 高頻度 Louw-Nida ドメイン（参考: domain 軸は未公開）');
md.push('');
md.push('| Domain | ラベル | Hits | reason |');
md.push('|---|---|---|---|');
for (const d of domainCandidates) md.push(`| ${d.code} | ${d.label} | ${d.occ} | high frequency domain |`);
md.push('');
md.push('### (c) 高頻度未登録 lemma（素材）');
md.push('');
md.push('| Lemma | Gloss | Hits |');
md.push('|---|---|---|');
for (const t of topLemmas) md.push(`| ${t.lemma} | ${t.gloss} | ${t.occ} |`);
md.push('');
md.push('## Balance（監査3）');
md.push('');
md.push(`High: ${hi.id} ${hi.occurrences} ／ Low: ${lo.id} ${lo.occurrences} ／ 比率 ${Number.isFinite(ratio) ? ratio.toFixed(1) + '倍' : '∞'}`);
md.push('');
if (fails.length)    { md.push('## FAIL');    md.push(''); for (const f of fails)    md.push(`- ❌ ${f}`); md.push(''); }
if (warnings.length) { md.push('## WARNING'); md.push(''); for (const w of warnings) md.push(`- ⚠️ ${w}`); md.push(''); }
md.push(`**STATUS: ${fails.length === 0 ? 'PASS' : 'FAIL'}**（FAIL ${fails.length} / WARNING ${warnings.length}）`);
fs.writeFileSync(path.join(OUT, 'concept-coverage.md'), md.join('\n') + '\n');

console.log(`Concept Coverage: ${concepts.length} 概念 / ${result.corpus.scope} ${totalTokens.toLocaleString()} tokens`);
console.log(`FAIL ${fails.length} / WARNING ${warnings.length} / 候補 gloss ${glossCandidates.length}・domain ${domainCandidates.length}・lemma ${topLemmas.length}`);
console.log('出力: scripts/output/concept-coverage.{md,json}');
process.exit(fails.length ? 1 : 0);
