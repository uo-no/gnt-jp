#!/usr/bin/env node
/**
 * re-stageB-audit.cjs — Stage B: Flow chip の新旧差分監査（NT 全巻）
 *
 * 実行: node scripts/re-stageB-audit.cjs
 * 出力: scripts/output/re-stageB-audit.json / re-stageB-samples.md
 *
 * 旧: _wordToFlowChip の Tier 2 経路（resolved 未指定 = _naturalize 含む旧動作。
 *     index.html __FLOW_CHIP__ 区間から実物ソースを抽出して実行）
 * 新: Tier 0/1（本番と同じ Engine resolve cache を注入）
 *
 * 監査項目:
 *   1. チップ gloss の新旧差分（件数・サンプル）
 *   2. 破損形の残存 0（促音欠落分詞・五段命令よ・イ音便欠落ながら）
 *   3. chip ⇔ StudyPanel 一致率 100%（SSOT の機械検証）
 *   4. 性能（NT 全巻の resolve cache 生成時間 → 章平均）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

// ── グローバル形態論デコーダ ─────────────────────────────────────────
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

// ── Flow chip 実物ソースの抽出 ───────────────────────────────────────
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const m = html.match(/\/\* __FLOW_CHIP_BEGIN__[\s\S]*?__FLOW_CHIP_END__ \*\//);
if (!m) { console.error('__FLOW_CHIP__ 区間が見つかりません'); process.exit(1); }
const sandbox = {
    window: { App: {} },   // PresentationPolicy は抽出後に注入（下記）
    normalizeStrong: s => s || '',
    buildDepthGrammarClasses: () => [],
    _buildReadingContext: () => null,   // 監査では自前 context を使う
    console,
};
vm.createContext(sandbox);
vm.runInContext(m[0], sandbox, { displayErrors: true });
const chipFn = sandbox._wordToFlowChip;

// ── Engine（本番構成） ───────────────────────────────────────────────
const { ReadingEngine }  = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ContextBuilder } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { readingSemanticData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-semantic-data.js'));
const { READING_LN_FINAL } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));
const { PresentationPolicy } = requireCjs(path.join(PUBLIC, 'core', 'presentation-policy.js'));
sandbox.window.App.PresentationPolicy = PresentationPolicy;   // Stage C P1（chip 抽出区間へ注入）

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

// ── 破損形検出（Phase 1 監査と同じヒューリスティック） ───────────────
const AUO = 'あかさたなはまやわらがざだばぱうすつぬふむゆぐずぶおこそとのほもよろごぞどぼ';
function isBrokenForm(base, out, mood) {
    if (!/る$/.test(base || '') || out === base) return false;
    // 促音欠落: 五段かな/漢字 + た（った でない）
    if (new RegExp(`[${AUO}一-鿿]た$`).test(out) && !/った$/.test(out) &&
        !/(見|得|出|着|来)た$/.test(out)) return true;
    // イ音便欠落: 五段かな/漢字 + ながら（りながら でない）
    if (new RegExp(`[${AUO}一-鿿]ながら$`).test(out) && !/りながら$/.test(out) &&
        !/(見|得|出|着|来)ながら$/.test(out) && !/[いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ]ながら$/.test(out)) return true;
    // 五段命令 よ
    if (mood === 'imperative' &&
        /[^えけせてねへめれげぜでべぺいきしちにひみりぎじびぴ見得出]よ$/.test(out)) return true;
    return false;
}

// ── 走査 ───────────────────────────────────────────────────────────
const stats = {
    tokens: 0, changed: 0, identical: 0,
    presented: 0,   // Stage C P1: 括弧化された PP head（〜（へ）等）
    brokenOld: 0, brokenNew: 0,
    panelMatch: 0, panelMismatch: 0,
    resolveMs: 0, chapters: 0,
};
const samples = { changed: [], brokenNew: [], panelMismatch: [] };
const perBookSamples = {};

const books = fs.readdirSync(NT_DIR)
    .filter(b => fs.statSync(path.join(NT_DIR, b)).isDirectory()).sort();
for (const book of books) {
    for (const ch of fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json')).sort()) {
        const tokens = JSON.parse(fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
        const byVerse = new Map();
        for (const t of tokens) {
            if (!byVerse.has(t.verse)) byVerse.set(t.verse, []);
            byVerse.get(t.verse).push(t);
        }
        stats.chapters++;
        const t0 = Date.now();
        for (const words of byVerse.values()) {
            // 本番 _getVerseResolved 相当（節単位一括）
            const resolved = words.map((w, i) => {
                const c = buildReadingContext(words, i);
                return c ? (engine.resolve(w, c) || null) : null;
            });
            for (let i = 0; i < words.length; i++) {
                const w = words[i];
                stats.tokens++;
                const oldChip = chipFn(w, i, book, 1);                    // Tier 2（旧）
                const newChip = chipFn(w, i, book, 1, resolved[i], words); // Tier 0/1（新・P1 適用）
                const oldG = oldChip.gloss, newG = newChip.gloss;
                if (/（(にあって|のもとに|の周りに|を通して|によって|と共に|の後で|の前に|について|から|へ)）$/.test(newG)) stats.presented++;
                if (isBrokenForm(w.japanese, oldG, w.mood || '')) stats.brokenOld++;
                if (isBrokenForm(w.japanese, newG, w.mood || '')) {
                    stats.brokenNew++;
                    if (samples.brokenNew.length < 20) {
                        samples.brokenNew.push({ ref: w.ref, base: w.japanese, out: newG });
                    }
                }
                // chip ⇔ StudyPanel 一致（両面とも同じ Presentation Policy を適用）
                const panelJaRaw = (resolved[i] && typeof resolved[i].japanese === 'string')
                    ? resolved[i].japanese : (w.japanese || '—');
                const panelDisp = (resolved[i] && typeof resolved[i].japanese === 'string')
                    ? PresentationPolicy.formatDisplay(panelJaRaw, resolved[i].source, words, i)
                    : panelJaRaw;
                if (newChip.jaWord === panelJaRaw && newG === panelDisp) stats.panelMatch++;
                else {
                    stats.panelMismatch++;
                    if (samples.panelMismatch.length < 20) {
                        samples.panelMismatch.push(
                            { ref: w.ref, chip: newG, jaWord: newChip.jaWord, panel: panelDisp });
                    }
                }
                if (oldG === newG) { stats.identical++; continue; }
                stats.changed++;
                const entry = { ref: w.ref, text: w.text, old: oldG, new: newG };
                if (samples.changed.length < 40) samples.changed.push(entry);
                if (!perBookSamples[book]) perBookSamples[book] = [];
                if (perBookSamples[book].length < 8) perBookSamples[book].push(entry);
            }
        }
        stats.resolveMs += Date.now() - t0;
    }
}

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-stageB-audit.json'),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10), stats, samples }, null, 2));
const md = ['# Stage B チップ gloss 新旧差分サンプル（書ごと・目視レビュー用）', ''];
for (const [book, arr] of Object.entries(perBookSamples)) {
    md.push(`## ${book}`);
    for (const e of arr) md.push(`- ${e.ref} ${e.text}: 「${e.old}」 → 「${e.new}」`);
    md.push('');
}
fs.writeFileSync(path.join(OUT, 're-stageB-samples.md'), md.join('\n'));

const pct = (n, d) => d ? (n / d * 100).toFixed(2) + '%' : '-';
console.log('Stage B Flow chip 差分監査（NT 全巻）');
console.log('='.repeat(60));
console.log(`トークン           : ${stats.tokens}`);
console.log(`変更               : ${stats.changed} (${pct(stats.changed, stats.tokens)})`);
console.log(`P1 括弧化          : ${stats.presented}`);
console.log(`一致               : ${stats.identical}`);
console.log(`破損形（旧）       : ${stats.brokenOld}`);
console.log(`破損形（新）       : ${stats.brokenNew}（0 必須）`);
console.log(`chip⇔panel 一致    : ${stats.panelMatch} / 不一致 ${stats.panelMismatch}（0 必須）`);
console.log(`一致率             : ${pct(stats.panelMatch, stats.tokens)}`);
console.log(`性能: resolve+chip : 全 ${stats.chapters} 章 ${stats.resolveMs}ms（章平均 ${(stats.resolveMs / stats.chapters).toFixed(1)}ms）`);
console.log('');
console.log('変更サンプル:');
for (const e of samples.changed.slice(0, 12)) {
    console.log(`  ${String(e.ref).padEnd(14)} ${e.text}: ${e.old} → ${e.new}`);
}
console.log('');
console.log(`詳細: scripts/output/re-stageB-audit.json / re-stageB-samples.md`);
process.exit(stats.brokenNew === 0 && stats.panelMismatch === 0 ? 0 : 1);
