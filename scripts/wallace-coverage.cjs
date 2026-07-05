#!/usr/bin/env node
/**
 * wallace-coverage.cjs — Wallace (GGBB) 実装カバレッジレポート生成（Phase 7.5）
 *
 * 実行: node scripts/wallace-coverage.cjs
 * 出力: scripts/output/wallace_coverage.{json,csv,md}
 *
 * 監査レイヤー専用: registry / Scorer / Context Engine / 分類結果には
 * 一切影響しない（読み取りのみ）。
 *
 * 整合性チェック:
 *   FAIL: wallace_ref 空 / 型の重複登録 / registry⇔Scorer の参照不整合
 *   WARN: active なのにテスト未参照
 *   INFO: 同一 Wallace ページを共有する型の一覧
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');

// ── Wallace 章定義（GGBB 1996 の章構成・監査用の静的定義） ────────────────
const CHAPTERS = [
    { key: 'nominative',    label: 'Nominative',     pages: '36–64',    registryCategory: null },
    { key: 'vocative',      label: 'Vocative',       pages: '65–71',    registryCategory: null },
    { key: 'genitive',      label: 'Genitive',       pages: '72–136',   registryCategory: 'genitive' },
    { key: 'dative',        label: 'Dative',         pages: '137–175',  registryCategory: 'dative' },
    { key: 'accusative',    label: 'Accusative',     pages: '176–205',  registryCategory: 'accusative' },
    { key: 'article',       label: 'Article',        pages: '206–290',  registryCategory: 'article' },
    { key: 'adjective',     label: 'Adjective',      pages: '291–314',  registryCategory: null },
    { key: 'pronoun',       label: 'Pronoun',        pages: '315–354',  registryCategory: null },
    { key: 'infinitive',    label: 'Infinitive',     pages: '587–611',  registryCategory: null },
    { key: 'participle',    label: 'Participle',     pages: '612–655',  registryCategory: 'participle' },
    { key: 'clause_syntax', label: 'Clause Syntax',  pages: '656–712',  registryCategory: null },
    { key: 'nominal_syntax',label: 'Nominal Syntax', pages: '31–35',    registryCategory: null },
    { key: 'discourse',     label: 'Discourse',      pages: '—',        registryCategory: null },
];

// ── 収集ヘルパー ──────────────────────────────────────────────────────────
function collectTypes(node, out = []) {
    if (!node || typeof node !== 'object') return out;
    if (Array.isArray(node)) { node.forEach(n => collectTypes(n, out)); return out; }
    if (typeof node.id === 'string' && /^[a-z]+\.[a-z_]+$/.test(node.id) && node.xsc) {
        out.push(node);
    }
    Object.values(node).forEach(v => collectTypes(v, out));
    return out;
}

function generateCoverage() {
    const registry = JSON.parse(fs.readFileSync(
        path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'), 'utf8'));
    const analyzerSrc = fs.readFileSync(
        path.join(PUBLIC, 'core', 'syntax-analyzer.js'), 'utf8');
    const testSrc = fs.readFileSync(
        path.join(__dirname, 'genitive-regression-test.cjs'), 'utf8');

    const types = collectTypes(registry);
    const failures = [], warnings = [], infos = [];

    // ── 検査 2: 型の重複登録 ──
    {
        const seen = new Set();
        for (const t of types) {
            if (seen.has(t.id)) failures.push(`重複登録: ${t.id}`);
            seen.add(t.id);
        }
    }

    // ── 検査 1: wallace_ref 空 ──
    for (const t of types) {
        if (!t.wallace_ref || !String(t.wallace_ref).trim()) {
            failures.push(`wallace_ref が空: ${t.id}`);
        }
    }

    // ── 検査 4/5: registry ⇔ Scorer の参照整合 ──
    const scorerCats = new Set();
    for (const m of analyzerSrc.matchAll(/getTypesFor(?:Case|Mood|Category)\('([a-z]+)'\)/g)) {
        scorerCats.add(m[1]);
    }
    const registryCats = new Set(Object.keys(registry.categories ?? {}));
    for (const c of registryCats) {
        if (!scorerCats.has(c)) failures.push(`registry カテゴリ '${c}' を参照する Scorer がない`);
    }
    for (const c of scorerCats) {
        if (!registryCats.has(c)) failures.push(`Scorer が参照するカテゴリ '${c}' が registry にない`);
    }

    // ── 検査 3: active なのにテスト未参照（WARN） ──
    const tested = (id) => testSrc.includes(`'${id}'`) || testSrc.includes(`"${id}"`);
    for (const t of types) {
        if (t.status === 'active' && !tested(t.id)) {
            warnings.push(`active だがテスト未参照: ${t.id}`);
        }
    }

    // ── Phase 7.6: tested_examples 抽出 ──
    // テストソース中で型 id と同一行にある verse 参照（'BBB', c, v）を収集する。
    const testedExamples = new Map(); // id → Set('BBB c:v')
    for (const line of testSrc.split('\n')) {
        const refM = line.match(/'([A-Z0-9]{2,4})',\s*(\d+),\s*(\d+)/);
        if (!refM) continue;
        for (const t of types) {
            if (line.includes(`'${t.id}'`)) {
                if (!testedExamples.has(t.id)) testedExamples.set(t.id, new Set());
                testedExamples.get(t.id).add(`${refM[1]} ${refM[2]}:${refM[3]}`);
            }
        }
    }

    // ── Phase 7.6 検査: 代表例（example_verse）の欠落・重複 ──
    // representative-missing 免除リスト（Wallace 上代表例が稀少で文献確認待ちの型）
    const NO_REPRESENTATIVE_ALLOWED = new Set(['genitive.means']);
    for (const t of types) {
        if (t.status !== 'active') continue;
        if (!t.example_verse && !NO_REPRESENTATIVE_ALLOWED.has(t.id)) {
            failures.push(`representative missing: ${t.id}（example_verse なし）`);
        }
    }
    {
        const byVerse = new Map();
        for (const t of types) {
            if (!t.example_verse) continue;
            if (!byVerse.has(t.example_verse)) byVerse.set(t.example_verse, []);
            byVerse.get(t.example_verse).push(t.id);
        }
        for (const [verse, ids] of byVerse) {
            if (ids.length > 3) {
                warnings.push(`同一代表節が ${ids.length} 型で使用: ${verse} (${ids.join(', ')})`);
            } else if (ids.length > 1) {
                infos.push(`代表節の共有: ${verse} (${ids.join(', ')})`);
            }
        }
    }

    // ── 検査 6: 同一 Wallace ページ共有（INFO） ──
    {
        const byPage = new Map();
        for (const t of types) {
            const m = String(t.wallace_ref ?? '').match(/pp?\.\s*[\d–\-]+/);
            if (!m) continue;
            const key = m[0].replace(/\s+/g, '');
            if (!byPage.has(key)) byPage.set(key, []);
            byPage.get(key).push(t.id);
        }
        for (const [page, ids] of byPage) {
            if (ids.length > 1) infos.push(`同一ページ ${page}: ${ids.join(', ')}`);
        }
    }

    // ── 章別集計 ──
    const engineVersion = (analyzerSrc.match(/this\.version\s*=\s*'([^']+)'/) ?? [])[1] ?? '?';
    const testMentions = (prefix) =>
        (testSrc.match(new RegExp(`['"]${prefix}\\.`, 'g')) ?? []).length;

    const chapters = CHAPTERS.map(ch => {
        const catTypes = ch.registryCategory
            ? types.filter(t => t.id.startsWith(ch.registryCategory + '.'))
            : [];
        const active = catTypes.filter(t => t.status === 'active').length;
        const stub   = catTypes.filter(t => t.status === 'stub').length;
        const status = catTypes.length === 0 ? 'planned'
                     : stub > 0 ? 'partial' : 'complete';
        const testedCount = catTypes.filter(t => tested(t.id)).length;
        return {
            key: ch.key,
            label: ch.label,
            wallace_pages: ch.pages,
            registry_types: catTypes.length,
            active,
            stub,
            implemented: active,
            tested: testedCount,
            coverage: active > 0
                ? Number((testedCount / active * 100).toFixed(1)) : 0,
            regression_test_mentions: ch.registryCategory ? testMentions(ch.registryCategory) : 0,
            metrics_covered: catTypes.length > 0,
            status,
            types: catTypes.map(t => ({
                id: t.id,
                title: t.label_en ?? t.label_ja ?? '',
                wallace_ref: t.wallace_ref ?? '',
                representative: t.example_verse ?? null,
                active: t.status === 'active',
                tested: tested(t.id),
                tested_examples: [...(testedExamples.get(t.id) ?? [])],
                registry: true,
            })),
        };
    });

    // ── Metrics 引用（既存 book_summary.json を読むだけ） ──
    let metrics = null;
    const bsPath = path.join(OUT, 'book_summary.json');
    if (fs.existsSync(bsPath)) {
        const bs = JSON.parse(fs.readFileSync(bsPath, 'utf8'));
        const confusion = new Map();
        for (const b of bs.books ?? []) {
            for (const c of b.top_confusion ?? []) {
                confusion.set(c.pair, (confusion.get(c.pair) ?? 0) + c.count);
            }
        }
        metrics = {
            average_confidence: bs.totals?.average_confidence ?? null,
            unresolved: bs.totals?.unresolved ?? null,
            analyzed: bs.totals?.analyzed ?? null,
            top_confusion: [...confusion.entries()]
                .sort((a, b) => b[1] - a[1]).slice(0, 5)
                .map(([pair, count]) => ({ pair, count })),
        };
    }

    const report = {
        generated_at: new Date().toISOString(),
        wallace_version: registry.meta?.source ??
            'Wallace, Daniel B. Greek Grammar Beyond the Basics. Zondervan, 1996.',
        engine_version: engineVersion,
        summary: {
            implemented_categories: [...registryCats].length,
            implemented_types: types.length,
            active_types: types.filter(t => t.status === 'active').length,
            stub_types: types.filter(t => t.status === 'stub').length,
            tests: (testSrc.match(/\bcheck\(/g) ?? []).length,
            tested_types: types.filter(t => tested(t.id)).length,
            coverage_percent: Number((types.filter(t => t.status === 'active' && tested(t.id)).length /
                Math.max(1, types.filter(t => t.status === 'active').length) * 100).toFixed(1)),
            representative_examples_verified:
                types.filter(t => tested(t.id) && (testedExamples.get(t.id)?.size ?? 0) > 0).length,
        },
        chapters,
        validation: { failures, warnings, infos },
        metrics,
    };
    return report;
}

// ── 出力フォーマッタ ──────────────────────────────────────────────────────
function toCsv(report) {
    const rows = [['chapter', 'type_id', 'title', 'wallace_ref', 'status', 'active', 'tested']];
    for (const ch of report.chapters) {
        if (!ch.types.length) {
            rows.push([ch.label, '', '', `pp.${ch.wallace_pages}`, ch.status, '', '']);
            continue;
        }
        for (const t of ch.types) {
            rows.push([ch.label, t.id, `"${t.title}"`, `"${t.wallace_ref}"`,
                       ch.status, t.active, t.tested]);
        }
    }
    return rows.map(r => r.join(',')).join('\n') + '\n';
}

function toMarkdown(r) {
    const L = [];
    L.push('# Wallace Coverage Report', '');
    L.push(`Generated: ${r.generated_at}`);
    L.push(`Engine Version: ${r.engine_version}`);
    L.push(`Wallace: ${r.wallace_version}`, '', '---', '');
    L.push('## Summary', '');
    L.push(`- Categories: ${r.summary.implemented_categories}`);
    L.push(`- Types: ${r.summary.implemented_types} (active ${r.summary.active_types} / stub ${r.summary.stub_types})`);
    L.push(`- Tested types: ${r.summary.tested_types} / ${r.summary.active_types} ` +
           `(**${r.summary.coverage_percent}%**)`);
    L.push(`- Test assertions (call sites): ${r.summary.tests}`);
    const impl = r.chapters.filter(c => c.status !== 'planned').length;
    L.push(`- Chapter coverage: ${impl} / ${r.chapters.length}`, '', '---', '');

    for (const ch of r.chapters) {
        L.push(`## ${ch.label}`, '');
        L.push(`Status: **${ch.status}**  |  Pages: ${ch.wallace_pages}  |  ` +
               `Implemented: ${ch.implemented} / ${ch.registry_types}  |  ` +
               `Tested: ${ch.tested} (${ch.coverage}%)  |  ` +
               `Stub: ${ch.stub}  |  Test mentions: ${ch.regression_test_mentions}  |  ` +
               `Metrics: ${ch.metrics_covered ? '✓' : '—'}`, '');
        if (ch.types.length) {
            L.push('| Type | Wallace | Active | Tested | Examples |');
            L.push('|------|---------|--------|--------|----------|');
            for (const t of ch.types) {
                L.push(`| ${t.id} | ${t.wallace_ref} | ${t.active ? '✓' : '—'} | ` +
                       `${t.tested ? '✓' : '—'} | ${t.tested_examples.join(', ') || '—'} |`);
            }
            L.push('');
        }
        L.push('---', '');
    }

    // ── Regression Matrix ──
    L.push('## Regression Matrix', '');
    L.push('| Category | Type | Representative | Tested |');
    L.push('|----------|------|----------------|--------|');
    for (const ch of r.chapters) {
        for (const t of ch.types) {
            L.push(`| ${ch.label} | ${t.id.split('.')[1]} | ` +
                   `${t.representative ?? '—'} | ${t.tested ? '✓' : '—'} |`);
        }
    }
    L.push('', '---', '');

    L.push('## Validation', '');
    L.push(`- FAIL: ${r.validation.failures.length}`);
    r.validation.failures.forEach(f => L.push(`  - ❌ ${f}`));
    L.push(`- WARN: ${r.validation.warnings.length}`);
    r.validation.warnings.forEach(w => L.push(`  - ⚠️ ${w}`));
    L.push(`- INFO: ${r.validation.infos.length}`);
    r.validation.infos.forEach(i => L.push(`  - ℹ️ ${i}`));
    L.push('', '---', '');

    if (r.metrics) {
        L.push('## Corpus Metrics（book_summary.json より引用）', '');
        L.push(`- Representative Examples Verified: ` +
               `${r.summary.representative_examples_verified} / ${r.summary.active_types}`);
        L.push(`- Analyzed tokens: ${r.metrics.analyzed}`);
        L.push(`- Average confidence: ${r.metrics.average_confidence}`);
        L.push(`- Unresolved (<0.40): ${r.metrics.unresolved}`);
        L.push('- Top confusion:');
        for (const c of r.metrics.top_confusion) {
            L.push(`  - ${c.pair}: ${c.count}`);
        }
        L.push('');
    }
    return L.join('\n') + '\n';
}

function writeReports(report) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'wallace_coverage.json'),
        JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT, 'wallace_coverage.csv'), toCsv(report));
    fs.writeFileSync(path.join(OUT, 'wallace_coverage.md'), toMarkdown(report));
}

if (require.main === module) {
    const report = generateCoverage();
    writeReports(report);
    const v = report.validation;
    console.log(`Wallace Coverage: types=${report.summary.implemented_types} ` +
        `(active=${report.summary.active_types} stub=${report.summary.stub_types})`);
    console.log(`Validation: FAIL=${v.failures.length} WARN=${v.warnings.length} INFO=${v.infos.length}`);
    v.failures.forEach(f => console.log(`  FAIL  ${f}`));
    v.warnings.forEach(w => console.log(`  WARN  ${w}`));
    if (process.argv.includes('--verbose')) v.infos.forEach(i => console.log(`  INFO  ${i}`));
    console.log('→ scripts/output/wallace_coverage.{json,csv,md}');
    process.exit(v.failures.length > 0 ? 1 : 0);
}

module.exports = { generateCoverage, toCsv, toMarkdown, writeReports };
