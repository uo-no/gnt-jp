#!/usr/bin/env node
/**
 * re-phase5c-audit.cjs — Phase 5-C1 LN→Gloss 対応表監査
 *
 * 実行: node scripts/re-phase5c-audit.cjs
 * 出力: scripts/output/re-phase5c-audit.json + コンソールレポート
 *
 * Phase 5-C1 の生成物（reading-ln-gloss-data.js）の内容を監査する。
 * ReadingEngine には接続しない（Phase 5-C2 の判断材料）。
 *
 * 監査項目:
 *   1. lemma 数 / ln 数 / 対応表数 / 平均語義数
 *   2. 未対応 token 数（lemmaId・ln・japanese のいずれか欠落）
 *   3. 品質: placeholder 混入 0 / freeze 確認
 *   4. 高頻度 50 lemma のサンプル（多義 lemma の対応表プレビュー）
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

// ── 1. 対応表の基本統計 ─────────────────────────────────────────────
const lemmaIds = Object.keys(READING_LN_GLOSS);
const lnSet = new Set();
let pairCount = 0;
let multiSense = 0;   // ln を 2 種以上持つ lemma
const PLACEHOLDERS = new Set(['', '—', '-', '???', '読み込んでいます...']);
let badGloss = 0;
let frozenOk = Object.isFrozen(READING_LN_GLOSS);
for (const id of lemmaIds) {
    const m = READING_LN_GLOSS[id];
    if (!Object.isFrozen(m)) frozenOk = false;
    const lns = Object.keys(m);
    pairCount += lns.length;
    if (lns.length >= 2) multiSense++;
    for (const ln of lns) {
        lnSet.add(ln);
        if (PLACEHOLDERS.has(m[ln]) || typeof m[ln] !== 'string') badGloss++;
    }
}

// ── 2. NT トークンカバレッジ ────────────────────────────────────────
let scanned = 0, covered = 0, uncovered = 0;
const tokenCountByLemma = new Map();
for (const book of fs.readdirSync(NT_DIR)
        .filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort()) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json')).sort()) {
        for (const t of JSON.parse(
                fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'))) {
            scanned++;
            const ln = (typeof t.ln === 'string' && t.ln) ? t.ln.split(' ')[0] : null;
            const hit = t.lemmaId && ln &&
                READING_LN_GLOSS[t.lemmaId] &&
                READING_LN_GLOSS[t.lemmaId][ln] !== undefined;
            if (hit) covered++;
            else uncovered++;
            if (t.lemmaId) {
                tokenCountByLemma.set(t.lemmaId,
                    (tokenCountByLemma.get(t.lemmaId) || 0) + 1);
            }
        }
    }
}

// ── 3. 高頻度 50 lemma サンプル ─────────────────────────────────────
const top50 = [...tokenCountByLemma.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 50)
    .map(([id, count]) => ({
        lemmaId: id,
        tokens: count,
        senses: READING_LN_GLOSS[id] ? Object.keys(READING_LN_GLOSS[id]).length : 0,
        map: READING_LN_GLOSS[id] || null,
    }));

// ── 出力 ───────────────────────────────────────────────────────────
const report = {
    generated: new Date().toISOString().slice(0, 10),
    stats: {
        lemmaCount: lemmaIds.length,
        lnCodeCount: lnSet.size,
        pairCount,
        avgSensesPerLemma: Number((pairCount / lemmaIds.length).toFixed(2)),
        multiSenseLemmas: multiSense,
        ntTokens: scanned,
        coveredTokens: covered,
        uncoveredTokens: uncovered,
        uncoveredPct: Number((uncovered / scanned * 100).toFixed(2)),
        badGloss,
        frozen: frozenOk,
    },
    top50,
};
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase5c-audit.json'),
    JSON.stringify(report, null, 2));

const s = report.stats;
console.log('Phase 5-C1 LN→Gloss 対応表監査');
console.log('='.repeat(60));
console.log(`lemma 数            : ${s.lemmaCount}`);
console.log(`ln コード種類       : ${s.lnCodeCount}`);
console.log(`対応表数（対）      : ${s.pairCount}`);
console.log(`平均語義数 / lemma  : ${s.avgSensesPerLemma}`);
console.log(`多義（ln≥2）lemma   : ${s.multiSenseLemmas}`);
console.log(`NT トークン         : ${s.ntTokens}`);
console.log(`対応表ヒット        : ${s.coveredTokens}`);
console.log(`未対応 token 数     : ${s.uncoveredTokens} (${s.uncoveredPct}%)`);
console.log(`placeholder 混入    : ${s.badGloss}`);
console.log(`freeze              : ${s.frozen ? 'OK' : 'NG'}`);
console.log('');
console.log('── 高頻度 lemma サンプル（上位 15 / 全 50 は JSON 参照） ──');
for (const e of top50.slice(0, 15)) {
    const preview = e.map
        ? Object.entries(e.map).slice(0, 4).map(([ln, g]) => `${ln}:${g}`).join(' ')
        : '(対応なし)';
    console.log(`  ${e.lemmaId.padEnd(12)} tokens=${String(e.tokens).padStart(5)} senses=${String(e.senses).padStart(3)}  ${preview}${e.senses > 4 ? ' …' : ''}`);
}
console.log('');
console.log(`詳細: scripts/output/re-phase5c-audit.json`);
process.exit(s.badGloss === 0 && s.frozen ? 0 : 1);
