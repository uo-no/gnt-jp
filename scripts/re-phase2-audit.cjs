#!/usr/bin/env node
/**
 * re-phase2-audit.cjs — Reading Engine Phase 2-A（Syntax Layer）NT全巻監査
 *
 * 実行: node scripts/re-phase2-audit.cjs
 * 出力: scripts/output/re-phase2-audit.json + コンソールサマリ
 *
 * 本番と同じ経路を再現する:
 *   節トークン配列 → ContextBuilder.build()（実物）→ ResolveContext 抽出
 *   → ReadingEngine.resolve(token, context)
 *
 * 監査項目:
 *   1. source 分析 — syntax / morph / fallback の割合
 *   2. syntax 変換の前置詞×格別分布とサンプル
 *   3. 品質フラグ — 二重助詞・morph より悪化する形の機械検出
 *   4. Phase 1 凍結確認 — context 注入時でも morph の結果が変わらないこと
 *      （syntax が発火しないトークンで context なしと同一出力）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

// ── グローバル形態論デコーダ（syntax-analyzer.js が参照する。
//    phrase-intent-audit.cjs と同一） ─────────────────────────────────
const _CLS2P = {
    'verb':'V','noun':'N','adjective':'A','adj':'A','article':'T','det':'T',
    'preposition':'P','prep':'P','conjunction':'C','conj':'C','adverb':'D','adv':'D',
    'particle':'X','ptcl':'X','pronoun':'R','pron':'R',
};
global.entryPosCode = function(e) {
    if (e.pos)   return String(e.pos).replace(/-$/, '').toUpperCase();
    if (e.class) return _CLS2P[String(e.class).toLowerCase()] || '';
    return '';
};
global.decodeMorph = function(e) {
    const n = v => (!v || v === '-') ? '' : v;
    return {
        pos: global.entryPosCode(e),
        tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
        case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person),
    };
};
global.cleanText = function(e) {
    return (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { ReadingEngine, READING_ENGINE_VERSION } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ContextBuilder } =
    requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { ReadingLexicon } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { readingSemanticData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-semantic-data.js'));
const { READING_LN_FINAL } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));

// 本番と同じ構成: lexicon + semantic + lnGloss 注入済み engine（4-A / 5-A / 5-D）
const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
engine.setSemanticData(readingSemanticData);
engine.setLnGlossData(READING_LN_FINAL);

// ── 本番 _buildReadingContext と同じロジック ────────────────────────
function buildReadingContext(words, idx) {
    try {
        if (!Array.isArray(words) || !words[idx]) return null;
        const ctx = ContextBuilder.build(words[idx], words, idx);
        return {
            tokens:    words,
            targetIdx: idx,
            phrases:   Array.isArray(ctx?.phrases) ? ctx.phrases : [],
            hasPassiveVerb: words.some(w =>
                (w.class || '') === 'verb' && (w.voice || '') === 'passive'),
            // Phase 3-A: 主格の は/が 判定用（本番 _buildReadingContext と同一）
            mainVerb: ctx?.mainVerb ? {
                lemma:  ctx.mainVerb.lemma  || '',
                person: ctx.mainVerb.person || '',
                number: ctx.mainVerb.number || '',
                mood:   ctx.mainVerb.mood   || '',
            } : null,
            clause: ctx?.clause ? {
                start: ctx.clause.start,
                end:   ctx.clause.end,
                subordinate: ctx.clause.subordinate === true,
            } : null,
        };
    } catch (_) {
        return null;
    }
}

// ── 節単位のトークン収集 ────────────────────────────────────────────
function* allVerses() {
    const books = fs.readdirSync(NT_DIR).filter(b =>
        fs.statSync(path.join(NT_DIR, b)).isDirectory());
    for (const book of books) {
        const chapters = fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json'));
        for (const ch of chapters) {
            const tokens = JSON.parse(
                fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
            // verse フィールドでグループ化（本番の elByVerse と同じ粒度）
            const byVerse = new Map();
            for (const t of tokens) {
                const v = t.verse;
                if (!byVerse.has(v)) byVerse.set(v, []);
                byVerse.get(v).push(t);
            }
            for (const words of byVerse.values()) yield words;
        }
    }
}

// ── 集計 ───────────────────────────────────────────────────────────
const stats = {
    version: READING_ENGINE_VERSION,
    total: 0,
    semantic: 0,
    syntax: 0,
    particle: 0,
    morph: 0,
    fallback: 0,
    byPrep: {},          // prepLemma|case → { count, samples[] }
    byParticle: {},      // は / が → { count, samples[] }
    byIdiom: {},         // 5-A 固定訳 → { count, samples[] }
    byPrepDomain: {},    // 5-B ルール名 → { count, samples[] }
    byLnGloss: {},       // 5-D lemmaId|ln → { gloss, count, samples[] }
    qualityFlags: {
        doubleParticle: [],   // 出力末尾に助詞が重なった疑い（のから 等）
        brokenWaGa: [],       // は/が の破損疑い（もは・もが・のは 等）
        morphMismatch: [],    // syntax/particle 不発トークンで context 有無の結果が異なる（凍結違反）
    },
};

// 助詞の重なり疑い。ただし「〜もの」は名詞なので助詞が続いてよい
// （盗んだものから 等は正常出力 — REV 9:21 で検証済み）
const PART_END    = /[のにをよ](から|へ|と共に|によって|にあって)$/;
const MONO_EXEMPT = /もの(から|へ|と共に|によって|にあって)$/;

for (const words of allVerses()) {
    for (let i = 0; i < words.length; i++) {
        const t = words[i];
        stats.total++;

        const ctx = buildReadingContext(words, i);
        const r   = engine.resolve(t, ctx);
        const rNoCtx = engine.resolve(t);   // Phase 1 挙動（凍結照合用）

        if (!r) {
            stats.fallback++;
            // 凍結確認: context 有無で null/非null が食い違わないこと
            if (rNoCtx && stats.qualityFlags.morphMismatch.length < 20) {
                stats.qualityFlags.morphMismatch.push(
                    { ref: t.ref, base: t.japanese, noCtx: rNoCtx.japanese, withCtx: null });
            }
            continue;
        }

        if (r.source === 'semantic') {
            stats.semantic++;
            // 分類: 5-A idiom（固定訳）→ 5-D lnGloss（replace 区画一致）→ 5-B prepDomain
            const idiomJa = new Set(readingSemanticData.idioms.map(x => x.ja));
            const _lnFirst = (typeof t.ln === 'string' && t.ln) ? t.ln.split(' ')[0] : null;
            const _lnRep = _lnFirst ? READING_LN_FINAL.replace[t.lemmaId]?.[_lnFirst] : undefined;
            if (!idiomJa.has(r.japanese) && _lnRep !== undefined &&
                r.japanese.startsWith(_lnRep)) {
                const key = `${t.lemmaId}|${_lnFirst}`;
                if (!stats.byLnGloss[key]) stats.byLnGloss[key] = { gloss: _lnRep, count: 0, samples: [] };
                stats.byLnGloss[key].count++;
                if (stats.byLnGloss[key].samples.length < 5) {
                    stats.byLnGloss[key].samples.push(
                        { ref: t.ref, text: t.text, base: t.japanese, out: r.japanese });
                }
            } else if (idiomJa.has(r.japanese)) {
                const key = r.japanese;
                if (!stats.byIdiom[key]) stats.byIdiom[key] = { count: 0, samples: [] };
                stats.byIdiom[key].count++;
                if (stats.byIdiom[key].samples.length < 5) {
                    stats.byIdiom[key].samples.push({ ref: t.ref, text: t.text, base: t.japanese });
                }
            } else {
                const _dnum = (d => {
                    if (!d) return null;
                    const s = String(d).split(' ')[0];
                    if (!/^[0-9]+$/.test(s)) return null;
                    return s.length > 3 ? parseInt(s.slice(0, -3), 10) : parseInt(s, 10);
                })(t.domain);
                const rule = (readingSemanticData.prepDomain || []).find(x =>
                    r.japanese === (t.japanese || '') + x.ja && x.domain === _dnum) || { name: '?' };
                const key = rule.name;
                if (!stats.byPrepDomain[key]) stats.byPrepDomain[key] = { count: 0, samples: [] };
                stats.byPrepDomain[key].count++;
                if (stats.byPrepDomain[key].samples.length < 5) {
                    stats.byPrepDomain[key].samples.push(
                        { ref: t.ref, text: t.text, base: t.japanese, out: r.japanese });
                }
            }
        } else if (r.source === 'syntax') {
            stats.syntax++;
            // PP を特定して前置詞キーで分類
            const pp = ctx.phrases.find(p => p.type === 'PP' && p.head === i);
            const prepLemma = pp ? (words[pp.start]?.lemma || '?') : '?';
            const key = `${prepLemma}|${t.case || '?'}`;
            if (!stats.byPrep[key]) stats.byPrep[key] = { count: 0, samples: [] };
            stats.byPrep[key].count++;
            if (stats.byPrep[key].samples.length < 10) {
                stats.byPrep[key].samples.push(
                    { ref: t.ref, text: t.text, base: t.japanese, out: r.japanese });
            }
            // 品質: 助詞の重なり
            if (PART_END.test(r.japanese) && !MONO_EXEMPT.test(r.japanese) &&
                stats.qualityFlags.doubleParticle.length < 30) {
                stats.qualityFlags.doubleParticle.push(
                    { ref: t.ref, base: t.japanese, out: r.japanese });
            }
        } else if (r.source === 'particle') {
            stats.particle++;
            const p = r.japanese.slice(-1);   // は / が
            if (!stats.byParticle[p]) stats.byParticle[p] = { count: 0, samples: [] };
            stats.byParticle[p].count++;
            if (stats.byParticle[p].samples.length < 10) {
                stats.byParticle[p].samples.push(
                    { ref: t.ref, text: t.text, base: t.japanese, out: r.japanese });
            }
            // 品質: は/が の破損疑い（末尾助詞・も に重なる形。ものは/ものが は正常）
            if (/[のにをよも][はが]$/.test(r.japanese) && !/もの[はが]$/.test(r.japanese) &&
                stats.qualityFlags.brokenWaGa.length < 30) {
                stats.qualityFlags.brokenWaGa.push(
                    { ref: t.ref, base: t.japanese, out: r.japanese });
            }
        } else {
            stats.morph++;
            // 凍結確認: morph の結果は context なしと同一であること
            if ((!rNoCtx || rNoCtx.japanese !== r.japanese) &&
                stats.qualityFlags.morphMismatch.length < 20) {
                stats.qualityFlags.morphMismatch.push(
                    { ref: t.ref, base: t.japanese,
                      noCtx: rNoCtx?.japanese ?? null, withCtx: r.japanese });
            }
        }
    }
}

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase2-audit.json'),
    JSON.stringify(stats, null, 2));

const pct = (n, d) => d ? (n / d * 100).toFixed(2) + '%' : '-';

console.log(`Reading Engine Phase 2-A Audit (${READING_ENGINE_VERSION})`);
console.log('='.repeat(60));
console.log(`total tokens : ${stats.total}`);
console.log(`semantic     : ${stats.semantic} (${pct(stats.semantic, stats.total)})`);
console.log(`syntax       : ${stats.syntax} (${pct(stats.syntax, stats.total)})`);
console.log(`particle     : ${stats.particle} (${pct(stats.particle, stats.total)})`);
console.log(`morph        : ${stats.morph} (${pct(stats.morph, stats.total)})`);
console.log(`fallback     : ${stats.fallback} (${pct(stats.fallback, stats.total)})`);
console.log('');
console.log('── syntax 変換の分布（前置詞|格） ──');
for (const [key, v] of Object.entries(stats.byPrep).sort((a, b) => b[1].count - a[1].count)) {
    const ex = v.samples[0];
    console.log(`  ${key.padEnd(22)} ${String(v.count).padStart(5)}  e.g. ${ex.base}→${ex.out} (${ex.ref})`);
}
console.log('');
console.log('── semantic 変換の分布（5-A 慣用句） ──');
for (const [key, v] of Object.entries(stats.byIdiom).sort((a, b) => b[1].count - a[1].count)) {
    const ex = v.samples[0];
    console.log(`  ${key.padEnd(14)} ${String(v.count).padStart(5)}  e.g. ${ex.text} (${ex.ref})`);
}
console.log('');
console.log('── semantic 変換の分布（5-B prepDomain） ──');
for (const [key, v] of Object.entries(stats.byPrepDomain).sort((a, b) => b[1].count - a[1].count)) {
    const ex = v.samples[0];
    console.log(`  ${key.padEnd(28)} ${String(v.count).padStart(4)}  e.g. ${ex.base}→${ex.out} (${ex.ref})`);
}
console.log('');
console.log('── semantic 変換の分布（5-D lnGloss） ──');
let lnTotal = 0;
for (const [key, v] of Object.entries(stats.byLnGloss).sort((a, b) => b[1].count - a[1].count)) {
    lnTotal += v.count;
    const ex = v.samples[0];
    console.log(`  ${key.padEnd(20)} 「${v.gloss}」 ${String(v.count).padStart(4)}  e.g. ${ex.base}→${ex.out} (${ex.ref})`);
}
console.log(`  semantic-ln 計: ${lnTotal}`);
console.log('');
console.log('── particle 変換の分布（は/が） ──');
for (const [key, v] of Object.entries(stats.byParticle).sort((a, b) => b[1].count - a[1].count)) {
    const ex = v.samples[0];
    console.log(`  ${key.padEnd(4)} ${String(v.count).padStart(5)}  e.g. ${ex.base}→${ex.out} (${ex.ref})`);
}
console.log('');
console.log('── qualityFlags ──');
console.log(`  doubleParticle: ${stats.qualityFlags.doubleParticle.length}`);
for (const e of stats.qualityFlags.doubleParticle.slice(0, 5)) {
    console.log(`    ${e.ref} ${e.base} → ${e.out}`);
}
console.log(`  brokenWaGa: ${stats.qualityFlags.brokenWaGa.length}`);
for (const e of stats.qualityFlags.brokenWaGa.slice(0, 5)) {
    console.log(`    ${e.ref} ${e.base} → ${e.out}`);
}
console.log(`  morphMismatch（凍結違反）: ${stats.qualityFlags.morphMismatch.length}`);
for (const e of stats.qualityFlags.morphMismatch.slice(0, 5)) {
    console.log(`    ${e.ref} ${e.base}: noCtx=${e.noCtx} withCtx=${e.withCtx}`);
}
console.log('');
console.log(`詳細: scripts/output/re-phase2-audit.json`);
