#!/usr/bin/env node
/**
 * corpus-metrics.cjs — GNT 全体走査による分類メトリクス生成（Phase 6）
 *
 * 実行: node scripts/corpus-metrics.cjs            → 全 NT 27 書を走査
 *       node scripts/corpus-metrics.cjs MAT PHM    → 指定書のみ
 *
 * 出力: scripts/output/book_summary.json
 *       scripts/output/book_summary.csv
 *
 * 各書について:
 *   - category frequency  : top 候補の型別・カテゴリ別頻度
 *   - top confusion       : top と 2 位の組（曖昧性の高いペア）上位 5 件
 *   - average confidence  : top 候補の平均 confidence
 *   - unresolved          : top confidence < 0.40（Discovery Card 非表示域）の件数
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const PUBLIC = path.resolve(__dirname, '..', 'public');

// ── ブラウザグローバルの最小シム（regression テストと同一契約） ──────────
function installGlobals() {
    if (global.decodeMorph) return;
    global.decodeMorph = function (e) {
        if (!e || typeof e !== 'object') return {};
        return {
            pos:    (e.pos || (e.class ? String(e.class).slice(0, 1).toUpperCase() : '')),
            tense:  e.tense || '', voice: e.voice || '', mood: e.mood || '',
            case:   e.case || '', number: e.number || '', gender: e.gender || '',
            person: e.person || '',
        };
    };
    global.cleanText = e => ((e && typeof e === 'object')
        ? (e.text || e.normalized || '') : String(e || ''))
        .replace(/[.,;:!?·—'··]+$/g, '').trim();
    global.entryPosCode = function (t) {
        if (!t || typeof t !== 'object') return '';
        if (t.pos) return String(t.pos).replace(/-$/, '').toUpperCase();
        if (t.class) {
            const m = { verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T',
                preposition:'P', prep:'P', conjunction:'C', conj:'C', adverb:'D', adv:'D',
                particle:'X', ptcl:'X', pronoun:'R', pron:'R', num:'M' };
            return m[String(t.class).toLowerCase()] || '';
        }
        if (t.mood || t.tense || t.voice) return 'V';
        return '';
    };
}

function requireCjs(filePath) {
    const vm = require('vm');
    const code = fs.readFileSync(filePath, 'utf8');
    const mod = { exports: {} };
    const fn = vm.runInThisContext(
        `(function(module,exports,require,__dirname,__filename){\n${code}\n})`,
        { filename: filePath });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

/**
 * 1 書のメトリクスを計算する。
 * @param {SyntaxAnalyzer} sa
 * @param {string} bookKey  例 'MAT'
 * @returns {Object} book summary entry
 */
function computeBookSummary(sa, bookKey) {
    const dir = path.join(PUBLIC, 'bible_data', 'nt', bookKey);
    const summary = {
        book: bookKey,
        analyzed: 0,
        average_confidence: 0,
        unresolved: 0,
        category_frequency: {},   // { genitive: { 'genitive.possessive': n, ... }, ... }
        top_confusion: [],        // [{ pair: 'a>b', count }] 上位5
    };
    if (!fs.existsSync(dir)) return summary;

    const confusion = new Map();
    let confSum = 0;

    for (const file of fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f))) {
        const chapter = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        // 詩節ごとにグループ化
        const byVerse = new Map();
        for (const t of chapter) {
            const key = (t.ref ?? '').split('!')[0];
            if (!byVerse.has(key)) byVerse.set(key, []);
            byVerse.get(key).push(t);
        }
        for (const tokens of byVerse.values()) {
            let all;
            try { all = sa.analyzeAll(tokens); } catch (_) { continue; }
            for (const r of (all.results ?? [])) {
                const cands = r.output?.candidates ?? [];
                if (!cands.length) continue;
                const top = cands[0];
                const cat = String(top.id ?? '').split('.')[0];
                if (!cat) continue;
                summary.analyzed++;
                confSum += top.confidence ?? 0;
                if ((top.confidence ?? 0) < 0.4) summary.unresolved++;
                summary.category_frequency[cat] ??= {};
                summary.category_frequency[cat][top.id] =
                    (summary.category_frequency[cat][top.id] ?? 0) + 1;
                const second = cands[1];
                if (second) {
                    const key = `${top.id}>${second.id}`;
                    confusion.set(key, (confusion.get(key) ?? 0) + 1);
                }
            }
        }
    }

    summary.average_confidence = summary.analyzed
        ? Number((confSum / summary.analyzed).toFixed(4)) : 0;
    summary.top_confusion = [...confusion.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pair, count]) => ({ pair, count }));
    return summary;
}

function toCsv(books) {
    const rows = [['book', 'analyzed', 'average_confidence', 'unresolved',
                   'top_type', 'top_type_count', 'top_confusion_pair', 'top_confusion_count']];
    for (const b of books) {
        let topType = '', topCount = 0;
        for (const cat of Object.values(b.category_frequency)) {
            for (const [id, n] of Object.entries(cat)) {
                if (n > topCount) { topCount = n; topType = id; }
            }
        }
        rows.push([b.book, b.analyzed, b.average_confidence, b.unresolved,
                   topType, topCount,
                   b.top_confusion[0]?.pair ?? '', b.top_confusion[0]?.count ?? 0]);
    }
    return rows.map(r => r.join(',')).join('\n') + '\n';
}

// ── CLI 実行 ──────────────────────────────────────────────────────────────
if (require.main === module) {
    installGlobals();
    console.debug = () => {};  // 走査中の Phase6c 等のデバッグログを抑制
    const { SyntaxAnalyzer } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
    const registry = JSON.parse(fs.readFileSync(
        path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'), 'utf8'));
    const booksMaster = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'books.json'), 'utf8'));
    const sa = new SyntaxAnalyzer(registry);

    const args = process.argv.slice(2);
    const bookKeys = args.length ? args : booksMaster.NT.map(b => b.key);

    const t0 = Date.now();
    const books = [];
    for (const key of bookKeys) {
        const s = computeBookSummary(sa, key);
        books.push(s);
        process.stdout.write(
            `  ${key.padEnd(4)} analyzed=${String(s.analyzed).padStart(6)}  ` +
            `avg=${s.average_confidence.toFixed(3)}  unresolved=${s.unresolved}\n`);
    }

    const totals = {
        analyzed: books.reduce((a, b) => a + b.analyzed, 0),
        unresolved: books.reduce((a, b) => a + b.unresolved, 0),
        average_confidence: Number((books.reduce(
            (a, b) => a + b.average_confidence * b.analyzed, 0) /
            Math.max(1, books.reduce((a, b) => a + b.analyzed, 0))).toFixed(4)),
    };

    const outDir = path.join(__dirname, 'output');
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'book_summary.json'),
        JSON.stringify({ generated: new Date().toISOString(),
                         engine_version: sa.version, totals, books }, null, 2) + '\n');
    fs.writeFileSync(path.join(outDir, 'book_summary.csv'), toCsv(books));

    console.log(`\n  合計 analyzed=${totals.analyzed} unresolved=${totals.unresolved} ` +
                `avg=${totals.average_confidence} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log('  → scripts/output/book_summary.json / book_summary.csv');
}

module.exports = { computeBookSummary, toCsv, installGlobals };
