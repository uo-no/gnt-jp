#!/usr/bin/env node
/**
 * re-phase5d-display-audit.cjs — Phase 5-D 実表示監査（5-D-8）
 *
 * 実行: node scripts/re-phase5d-display-audit.cjs
 * 出力: scripts/output/re-phase5d-display-audit.md
 *
 * MAT / JHN / ACT / ROM / HEB / REV の各 100 節について、
 * 本番と同じ経路（ContextBuilder → resolve）で語順フローの jaWord 列を
 * 生成する。semantic 変換を含む節は優先的に全件収録し、残りは章から
 * 均等サンプリングして 100 節に満たす。
 *
 * 確認項目（レビューは人間が .md を読む）:
 *   1. 日本語として破綻しない
 *   2. ギリシャ語を追いやすい
 *   3. 神学用語を壊していない
 *   4. 新改訳本文との差異が読者を混乱させない
 *   5. Phrase Reading と矛盾しない
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const OUT    = path.join(__dirname, 'output');

// グローバル形態論デコーダ（re-phase2-audit.cjs と同一）
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

const { ReadingEngine } = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
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

const BOOKS = ['MAT', 'JHN', 'ACT', 'ROM', 'HEB', 'REV'];
const PER_BOOK = 100;

const lines = [];
lines.push('# Phase 5-D 実表示監査（語順フロー表示ダンプ）');
lines.push('');
lines.push('生成: ' + new Date().toISOString().slice(0, 10) +
    ' / 各書 100 節（semantic 変換を含む節は全件優先収録・※印）');
lines.push('凡例: 【…】= semantic 変換（idiom / prepDomain / lnGloss）。他は既存チェーン出力。');
lines.push('');

const stats = { verses: 0, semanticVerses: 0, semanticTokens: 0 };

for (const book of BOOKS) {
    const chapters = fs.readdirSync(path.join(NT_DIR, book))
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));
    // 節ごとのトークン列を収集
    const verses = [];   // { ref, words }
    for (const ch of chapters) {
        const tokens = JSON.parse(fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
        const byVerse = new Map();
        for (const t of tokens) {
            const key = `${t.chapter}:${t.verse}`;
            if (!byVerse.has(key)) byVerse.set(key, []);
            byVerse.get(key).push(t);
        }
        for (const [key, words] of byVerse) verses.push({ ref: `${book} ${key}`, words });
    }
    // 各節をレンダリング
    const rendered = verses.map(v => {
        let hasSemantic = false;
        const parts = v.words.map((w, i) => {
            const c = buildReadingContext(v.words, i);
            const r = engine.resolve(w, c);
            const ja = r ? r.japanese : (w.japanese || w.text || '');
            if (r && r.source === 'semantic') { hasSemantic = true; stats.semanticTokens++; return `【${ja}】`; }
            return ja;
        });
        return { ref: v.ref, hasSemantic, flow: parts.join(' ') };
    });
    // 選定: semantic 節を全件 → 残りを均等サンプリング
    const sem = rendered.filter(r => r.hasSemantic);
    const rest = rendered.filter(r => !r.hasSemantic);
    const fill = [];
    const step = Math.max(1, Math.floor(rest.length / Math.max(1, PER_BOOK - sem.length)));
    for (let i = 0; i < rest.length && fill.length < PER_BOOK - sem.length; i += step) fill.push(rest[i]);
    const selected = [...sem, ...fill].slice(0, Math.max(PER_BOOK, sem.length));

    lines.push(`## ${book}（semantic 節 ${sem.length} / 収録 ${selected.length}）`);
    lines.push('');
    for (const r of selected) {
        lines.push(`- ${r.hasSemantic ? '※ ' : ''}**${r.ref}**  ${r.flow}`);
    }
    lines.push('');
    stats.verses += selected.length;
    stats.semanticVerses += sem.length;
}

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase5d-display-audit.md'), lines.join('\n'));

console.log('実表示監査ダンプ生成完了');
console.log(`  収録節数        : ${stats.verses}`);
console.log(`  semantic 節     : ${stats.semanticVerses}`);
console.log(`  semantic トークン: ${stats.semanticTokens}`);
console.log(`  出力: scripts/output/re-phase5d-display-audit.md`);
