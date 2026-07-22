#!/usr/bin/env node
/**
 * re-m8d-builder-syntax-adoption-regression.cjs
 * Stage M-8d: Reading Japanese Builder Syntax Adoption の回帰基準。
 *
 * 固定対象（FROZEN baseline）:
 *   - Builder が採用する pronominal neuter の総数と before→after マッピング
 *   - 非変更ガード（masc/fem・Semantic先行すなわち・τοιοῦτος・adnominal参照先non-verb・非採用reading）
 *
 * engine は非改変（builder.js のみが M-8d 対象）。engine 出力の回帰は re-phase 系/re-stage 系が担保。
 * 本スクリプトは Builder の Syntax Adoption 出力（この→これ 等）を凍結する。
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

// ── FROZEN baseline（M-8d 実測・2026-07-22） ──────────────────────────
// M-15 反映移行(2026-07-22): 固定点反映で syntax pronominal 123件(この→これ115/これらの→これら6/
// あの→あれ2)が Data 化。179→56。pre-reflection historical=179（この→これ164/これらの→これら13/
// あの→あれ2・οὗτος177/ἐκεῖνος2）（data-role-migration-freeze・削除しない）。非変更ガードは全て0で不変。
const BASELINE = {
    syntaxAdoptedTotal: 56,
    byPair: { 'この→これ': 49, 'これらの→これら': 7 },
    byLemma: { 'οὗτος': 56 },
    // 非変更ガード（すべて 0）
    mascFemChanged: 0,
    semanticOverridden: 0,      // すなわち（Semantic 先行）
    toioutosChanged: 0,         // τοιοῦτος（質・非デイクシス）
    adnominalNonVerbChanged: 0, // 参照先 non-verb（連体）
    nonAdoptReadingMismatch: 0, // 非採用トークンは reading = resolve 出力（現状維持）
};

const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
const root = path.join(PUBLIC, 'bible_data', 'nt');
const byVid = {}; const all = []; const verses = {};
for (const b of fs.readdirSync(root)) {
    const bp = path.join(root, b); if (!fs.statSync(bp).isDirectory()) continue;
    for (const f of fs.readdirSync(bp).filter((x) => x.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(bp, f), 'utf8'));
        for (const t of arr) { if (t.verseId) byVid[t.verseId] = t; }
        verses[b + '/' + f] = arr; all.push(...arr);
    }
}
const builder = new ReadingJapaneseBuilder(engine);
builder.setCorpus(all);

const DEMO = new Set(['οὗτος', 'ἐκεῖνος', 'τοιοῦτος']);
const cur = { syntaxAdoptedTotal: 0, byPair: {}, byLemma: {}, mascFemChanged: 0, semanticOverridden: 0, toioutosChanged: 0, adnominalNonVerbChanged: 0, nonAdoptReadingMismatch: 0 };
for (const key of Object.keys(verses)) {
    const built = builder.buildVerse(verses[key]);
    for (const c of built.tokens) {
        const t = c.token; const res = engine.resolve(t); const disp = (res && res.japanese) || t.japanese || '';
        const lem = (t.lemma || '').normalize('NFC');
        if (c.syntaxAdopted) {
            cur.syntaxAdoptedTotal++;
            const p = c.syntaxAdopted.representative + '→' + c.syntaxAdopted.adopted;
            cur.byPair[p] = (cur.byPair[p] || 0) + 1;
            cur.byLemma[lem] = (cur.byLemma[lem] || 0) + 1;
        } else if (c.reading !== disp) {
            cur.nonAdoptReadingMismatch++;
        }
        if (DEMO.has(lem) && t.referent && (t.gender === 'masculine' || t.gender === 'feminine')) {
            const a = byVid[t.referent]; if (a && a.class === 'verb' && c.reading !== disp) cur.mascFemChanged++;
        }
        if (disp === 'すなわち' && c.reading !== disp) cur.semanticOverridden++;
        if (lem === 'τοιοῦτος' && c.reading !== disp) cur.toioutosChanged++;
        if (DEMO.has(lem) && t.referent && t.gender === 'neuter') {
            const a = byVid[t.referent]; if (a && a.class !== 'verb' && c.reading !== disp) cur.adnominalNonVerbChanged++;
        }
    }
}

let fail = 0; const log = (ok, msg) => { if (!ok) fail++; console.log((ok ? '  ok  ' : ' FAIL ') + msg); };
const eqObj = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log('── M-8d Builder Syntax Adoption 回帰 ──');
log(cur.syntaxAdoptedTotal === BASELINE.syntaxAdoptedTotal, `syntaxAdopted total = ${cur.syntaxAdoptedTotal} (基準 ${BASELINE.syntaxAdoptedTotal})`);
log(eqObj(cur.byPair, BASELINE.byPair), `byPair = ${JSON.stringify(cur.byPair)}`);
log(eqObj(cur.byLemma, BASELINE.byLemma), `byLemma = ${JSON.stringify(cur.byLemma)}`);
log(cur.mascFemChanged === 0, `masc/fem 誤変更 = ${cur.mascFemChanged}`);
log(cur.semanticOverridden === 0, `すなわち(Semantic先行)上書き = ${cur.semanticOverridden}`);
log(cur.toioutosChanged === 0, `τοιοῦτος 誤変更 = ${cur.toioutosChanged}`);
log(cur.adnominalNonVerbChanged === 0, `adnominal(参照先non-verb) 誤変更 = ${cur.adnominalNonVerbChanged}`);
log(cur.nonAdoptReadingMismatch === 0, `非採用トークン reading 不一致 = ${cur.nonAdoptReadingMismatch}`);
if (fail === 0) console.log('ALL PASS (8 checks) — M-8d Builder Syntax Adoption 基準を維持');
else { console.log(`FAIL: ${fail} 件`); process.exit(1); }
