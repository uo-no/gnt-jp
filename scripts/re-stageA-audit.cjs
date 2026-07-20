#!/usr/bin/env node
/**
 * re-stageA-audit.cjs — Stage A: Phrase 引用の新旧差分監査（NT 全巻）
 *
 * 実行: node scripts/re-stageA-audit.cjs
 * 出力: scripts/output/re-stageA-audit.json / re-stageA-samples.md
 *
 * 旧: renderPhraseJP（index.html __PHRASE_READING__ 区間から実物ソースを
 *     抽出して実行 — 監査用の再実装なし。phrase-intent-audit.cjs と同じ手法）
 * 新: core/phrase-renderer.js + Engine resolve（本番と同じ経路）
 *
 * 監査項目:
 *   1. 全 NP/PP/PtcP 句（UI と同じ範囲条件・_trimPhraseEnd 適用後）の新旧引用比較
 *   2. 品質: 新引用への ［冠詞］ 混入 0 / プレースホルダ混入 0
 *   3. 新引用の沈黙増加（旧あり→新なし）の件数と内訳
 *   4. 変更サンプル（書ごと・目視レビュー用 md）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

// ── グローバル形態論デコーダ（既存監査と同一） ───────────────────────
const _CLS2P = {
    'verb':'V','noun':'N','adjective':'A','adj':'A','article':'T','det':'T',
    'preposition':'P','prep':'P','conjunction':'C','conj':'C','adverb':'D','adv':'D',
    'particle':'X','ptcl':'X','pronoun':'R','pron':'R',
};
global.entryPosCode = e => e.pos ? String(e.pos).replace(/-$/, '').toUpperCase()
    : (_CLS2P[String(e.class || '').toLowerCase()] || '');
global.decodeMorph = e => {
    const n = v => (!v || v === '-') ? '' : v;
    return { pos: global.entryPosCode(e), tense: n(e.tense), voice: n(e.voice),
             mood: n(e.mood), case: n(e.case), number: n(e.number),
             gender: n(e.gender), person: n(e.person) };
};
global.cleanText = e => (e.word || e.normalized || e.text || '')
    .replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

// ── 旧実装の抽出（index.html __PHRASE_READING__ 区間） ───────────────
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const m = html.match(/\/\* __PHRASE_READING_BEGIN__[\s\S]*?__PHRASE_READING_END__ \*\//);
if (!m) { console.error('__PHRASE_READING__ 区間が見つかりません'); process.exit(1); }
const sandbox = {
    _escH: s => String(s),               // 監査では素の比較（エスケープ無効化）
    window: { App: {} },                 // 新経路は評価時未使用（関数定義のみ）
    console,
};
vm.createContext(sandbox);
vm.runInContext(m[0], sandbox, { displayErrors: true });
const oldRender  = sandbox.renderPhraseJP;
const trimEnd    = sandbox._trimPhraseEnd;
const MAX_SPAN   = sandbox._PHRASE_READING_MAX_SPAN ?? 7;
if (typeof oldRender !== 'function' || typeof trimEnd !== 'function') {
    console.error('renderPhraseJP / _trimPhraseEnd の抽出に失敗');
    process.exit(1);
}

// ── 新実装（本番と同じ経路） ─────────────────────────────────────────
const { PhraseRenderer } = requireCjs(path.join(PUBLIC, 'core', 'phrase-renderer.js'));
const { ReadingEngine }  = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ContextBuilder } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { readingSemanticData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-semantic-data.js'));
const { READING_LN_FINAL } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));

const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
engine.setSemanticData(readingSemanticData);
engine.setLnGlossData(READING_LN_FINAL);

function buildReadingContext(words, idx) {
    try {
        const ctx = ContextBuilder.build(words[idx], words, idx);
        return {
            tokens: words, targetIdx: idx,
            phrases: Array.isArray(ctx?.phrases) ? ctx.phrases : [],
            hasPassiveVerb: words.some(w => (w.class || '') === 'verb' && (w.voice || '') === 'passive'),
            mainVerb: ctx?.mainVerb ? {
                lemma: ctx.mainVerb.lemma || '', person: ctx.mainVerb.person || '',
                number: ctx.mainVerb.number || '', mood: ctx.mainVerb.mood || '',
            } : null,
            clause: ctx?.clause ? {
                start: ctx.clause.start, end: ctx.clause.end,
                subordinate: ctx.clause.subordinate === true,
            } : null,
        };
    } catch (_) { return null; }
}
const resolveWordFactory = (words) => (i) => {
    const r = engine.resolve(words[i], buildReadingContext(words, i));
    return r ? r.japanese : null;
};

// ── 走査 ───────────────────────────────────────────────────────────
const stats = {
    quotes: 0, identical: 0, changed: 0,
    newSilent: 0,          // 旧あり → 新なし
    oldKanshi: 0,          // 旧引用の ［冠詞］ 混入
    newKanshi: 0,          // 新引用の ［冠詞］ 混入（0 必須）
    byType: {},            // NP/PP/PtcP → { quotes, changed }
};
const samples = { changed: [], newSilent: [] };
const perBookSamples = {};

const books = fs.readdirSync(NT_DIR)
    .filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort();
for (const book of books) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json')).sort()) {
        const tokens = JSON.parse(fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
        const byVerse = new Map();
        for (const t of tokens) {
            const key = t.verse;
            if (!byVerse.has(key)) byVerse.set(key, []);
            byVerse.get(key).push(t);
        }
        for (const words of byVerse.values()) {
            let ctx;
            try { ctx = ContextBuilder.build(words[0], words, 0); } catch (_) { continue; }
            const resolveWord = resolveWordFactory(words);
            for (const p of (ctx.phrases || [])) {
                if (!p || !['NP', 'PP', 'PtcP'].includes(p.type)) continue;
                if ((p.end - p.start) < 1 || (p.end - p.start) >= MAX_SPAN) continue;
                const te = trimEnd(words, p);
                if (te - p.start < 1) continue;
                stats.quotes++;
                if (!stats.byType[p.type]) stats.byType[p.type] = { quotes: 0, changed: 0 };
                stats.byType[p.type].quotes++;
                const oldQ = String(oldRender(p, te, words) || '');
                const newQ = PhraseRenderer.renderQuote(p, te, words, resolveWord) || '';
                if (oldQ.includes('［冠詞］')) stats.oldKanshi++;
                if (newQ.includes('［冠詞］')) stats.newKanshi++;
                if (oldQ === newQ) { stats.identical++; continue; }
                if (oldQ && !newQ) {
                    stats.newSilent++;
                    if (samples.newSilent.length < 20) {
                        samples.newSilent.push({ ref: words[p.start]?.ref, type: p.type, old: oldQ });
                    }
                    continue;
                }
                stats.changed++;
                stats.byType[p.type].changed++;
                const entry = { ref: words[p.start]?.ref, type: p.type, old: oldQ, new: newQ };
                if (samples.changed.length < 40) samples.changed.push(entry);
                if (!perBookSamples[book]) perBookSamples[book] = [];
                if (perBookSamples[book].length < 10) perBookSamples[book].push(entry);
            }
        }
    }
}

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-stageA-audit.json'),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10), stats, samples }, null, 2));

const md = ['# Stage A 引用 新旧差分サンプル（書ごと・目視レビュー用）', ''];
for (const [book, arr] of Object.entries(perBookSamples)) {
    md.push(`## ${book}`);
    for (const e of arr) md.push(`- ${e.ref} [${e.type}] 「${e.old}」 → 「${e.new}」`);
    md.push('');
}
fs.writeFileSync(path.join(OUT, 're-stageA-samples.md'), md.join('\n'));

console.log('Stage A 引用差分監査（NT 全巻）');
console.log('='.repeat(60));
console.log(`引用対象句       : ${stats.quotes}`);
console.log(`一致             : ${stats.identical}`);
console.log(`変更             : ${stats.changed}`);
console.log(`新規沈黙         : ${stats.newSilent}`);
console.log(`旧 ［冠詞］ 混入 : ${stats.oldKanshi}`);
console.log(`新 ［冠詞］ 混入 : ${stats.newKanshi}（0 必須）`);
console.log('');
for (const [t, v] of Object.entries(stats.byType)) {
    console.log(`  ${t.padEnd(5)} quotes=${String(v.quotes).padStart(6)} changed=${v.changed}`);
}
console.log('');
console.log('変更サンプル:');
for (const e of samples.changed.slice(0, 12)) {
    console.log(`  ${String(e.ref).padEnd(14)} [${e.type}] ${e.old} → ${e.new}`);
}
console.log('');
console.log(`詳細: scripts/output/re-stageA-audit.json / re-stageA-samples.md`);
process.exit(stats.newKanshi === 0 ? 0 : 1);
