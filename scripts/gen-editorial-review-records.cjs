#!/usr/bin/env node
/**
 * gen-editorial-review-records.cjs
 * Stage M-12: Reading Japanese Editorial Full Review Execution。
 *
 * M-11 schema に準拠した NT 全巻 7,939 verse の Review Record 台帳を生成する。
 *   Record = {verseId, status, adoption{morphCount,syntaxCount}, pending[{layer,reason,tokens}], reviewNotes, source}
 *
 * 判定基準は M-10 Pilot と同一（推論しない・未判定は Pending）。
 * bible_data / Builder / Engine は変更しない（読み取り + 台帳生成のみ・別台帳）。
 * 出力: scripts/output/reading-japanese-editorial-review-records.json（bible_data と分離）
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const PUBLIC = path.resolve(__dirname, '..', 'public');
function requireCjs(fp) {
    const code = fs.readFileSync(fp, 'utf8'); const mod = { exports: {} };
    const fn = vm.runInThisContext('(function(module,exports,require,__dirname,__filename){\n' + code + '\n})', { filename: fp });
    fn(mod, mod.exports, require, path.dirname(fp), fp); return mod.exports;
}
const { ReadingEngine } = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { ReadingJapaneseBuilder } = requireCjs(path.join(PUBLIC, 'core', 'reading-japanese-builder.js'));

const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
const root = path.join(PUBLIC, 'bible_data', 'nt');
const all = []; const byVid = {}; const byVerse = {};
for (const b of fs.readdirSync(root)) {
    const bp = path.join(root, b); if (!fs.statSync(bp).isDirectory()) continue;
    for (const f of fs.readdirSync(bp).filter((x) => x.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(bp, f), 'utf8'));
        for (const t of arr) { all.push(t); if (t.verseId) { byVid[t.verseId] = t; const vk = t.verseId.slice(0, 9); (byVerse[vk] = byVerse[vk] || []).push(t); } }
    }
}
const builder = new ReadingJapaneseBuilder(engine);
builder.setCorpus(all);

const DEMO = new Set(['οὗτος', 'ἐκεῖνος', 'τοιοῦτος']);
// Pending 優先順（1.直接reading影響 2.決定的情報不足 3.将来層責任）= Discourse > Semantic > Corpus
const LAYER_PRIORITY = { Discourse: 0, Semantic: 1, Corpus: 2, Syntax: 3, Morph: 4, Editorial: 5 };
const REASON = {
    Discourse: 'demonstrative の pronominal/adnominal・談話距離が未判定（この/その/あの・これ の選択は談話依存）',
    Semantic: '語義が非一意（intensive 自身 / 3人称再帰 / 副詞的τί=なぜ / 不定詞τις=ある の語選択が文脈依存）',
    Corpus: 'referent 注釈が不在（構造リンク欠落）',
    Editorial: '表示破損（決定的根拠で修正可能）',
};

const records = [];
const agg = { total: 0, Accepted: 0, 'Revise Required': 0, Pending: 0,
    layerOverlap: { Morph: 0, Syntax: 0, Semantic: 0, Discourse: 0, Corpus: 0, Editorial: 0 },
    layerPrimary: { Morph: 0, Syntax: 0, Semantic: 0, Discourse: 0, Corpus: 0, Editorial: 0 },
    multiLayer: 0, morphAdoptVerse: 0, syntaxAdoptVerse: 0 };

for (const vk of Object.keys(byVerse)) {
    agg.total++;
    const built = builder.buildVerse(byVerse[vk]);
    const morphCount = built.morphAdoptedCount, syntaxCount = built.syntaxAdoptedCount;
    if (morphCount > 0) agg.morphAdoptVerse++;
    if (syntaxCount > 0) agg.syntaxAdoptVerse++;
    const layerTokens = {}; let revise = false;
    for (const c of built.tokens) {
        const t = c.token; const lem = (t.lemma || '').normalize('NFC');
        if (DEMO.has(lem)) { const a = t.referent ? byVid[t.referent] : null; if (!(a && a.class === 'verb' && t.gender === 'neuter')) (layerTokens.Discourse = layerTokens.Discourse || []).push(t.verseId); }
        const si = engine.getSemanticInfo(t);
        if (si && (si.intensive || si.reflexivePerson === 3 || si.adverbial || si.pronType === 'indefinite')) (layerTokens.Semantic = layerTokens.Semantic || []).push(t.verseId);
        if (t.referent && !byVid[t.referent]) (layerTokens.Corpus = layerTokens.Corpus || []).push(t.verseId);
        if (/undefined|NaN|�|読み込ん/.test(c.reading)) { revise = true; (layerTokens.Editorial = layerTokens.Editorial || []).push(t.verseId); }
    }
    const layers = Object.keys(layerTokens).sort((a, b) => LAYER_PRIORITY[a] - LAYER_PRIORITY[b]);
    let status, pending = [];
    if (revise) { status = 'Revise Required'; agg['Revise Required']++; }
    else if (layers.length) {
        status = 'Pending'; agg.Pending++;
        if (layers.length > 1) agg.multiLayer++;
        pending = layers.map((L) => ({ layer: L, reason: REASON[L], tokens: layerTokens[L] }));
        for (const L of layers) agg.layerOverlap[L]++;
        agg.layerPrimary[layers[0]]++; // 主原因（優先順先頭）
    } else { status = 'Accepted'; agg.Accepted++; }
    records.push({ verseId: vk, status, adoption: { morphCount, syntaxCount }, pending, reviewNotes: '', source: 'editorial-review' });
}

const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'reading-japanese-editorial-review-records.json');
fs.writeFileSync(outFile, JSON.stringify({ meta: { stage: 'M-12', source: 'editorial-review', generated: new Date().toISOString().slice(0, 10), total: agg.total, note: 'bible_data と分離した別台帳・判定はM-10同一基準・推論なし' }, aggregate: agg, records }, null, 1), 'utf8');

console.log('=== M-12 Editorial Full Review Execution ===');
console.log('出力:', path.relative(path.resolve(__dirname, '..'), outFile));
console.log('総verse:', agg.total, '/ Record数:', records.length, '/ 検算 A+R+P:', agg.Accepted + agg['Revise Required'] + agg.Pending);
console.log('Accepted:', agg.Accepted, '/ Revise Required:', agg['Revise Required'], '/ Pending:', agg.Pending);
console.log('Pending layer別(のべ):', JSON.stringify(agg.layerOverlap));
console.log('Pending layer別(主原因):', JSON.stringify(agg.layerPrimary));
console.log('複数layer verse:', agg.multiLayer);
console.log('Adoption: Morph採用verse:', agg.morphAdoptVerse, '/ Syntax採用verse:', agg.syntaxAdoptVerse);
