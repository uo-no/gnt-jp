#!/usr/bin/env node
/**
 * re-phase1-audit.cjs — Reading Engine Phase 1（Morphology Core）NT全巻監査
 *
 * 実行: node scripts/re-phase1-audit.cjs
 * 出力: scripts/output/re-phase1-audit.json + コンソールサマリ
 *
 * 監査レイヤー専用（読み取りのみ）: reading-engine.js の実物を requireCjs で
 * 読み込んで実行する（監査用の再実装なし）。
 *
 * 監査項目:
 *   1. カバレッジ — class × 形態素パターン別の morph / fallback 集計
 *   2. source 分析 — morph / fallback 割合
 *   3. 品質フラグ — 二重助詞・不自然な変換の機械検出 + サンプリング
 *   4. 未対応パターン — 変換を試みたが未変換に終わったケースの内訳
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

const { ReadingEngine, READING_ENGINE_VERSION } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ReadingLexicon } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));

// 本番と同じ構成: lexicon 注入済み engine（Phase 4-A で
// _PASSIVE_SKIP_LEMMAS が ReadingLexicon へ移管されたため必須）
const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));

// ── トークン収集 ────────────────────────────────────────────────────
function* allTokens() {
    const books = fs.readdirSync(NT_DIR).filter(b =>
        fs.statSync(path.join(NT_DIR, b)).isDirectory());
    for (const book of books) {
        const chapters = fs.readdirSync(path.join(NT_DIR, book))
            .filter(f => f.endsWith('.json'));
        for (const ch of chapters) {
            const tokens = JSON.parse(
                fs.readFileSync(path.join(NT_DIR, book, ch), 'utf8'));
            for (const t of tokens) yield t;
        }
    }
}

// ── 集計器 ─────────────────────────────────────────────────────────
const inc = (obj, key) => { obj[key] = (obj[key] || 0) + 1; };

const stats = {
    version: READING_ENGINE_VERSION,
    total: 0,
    noJapanese: 0,        // japanese が空/placeholder（エンジン対象外）
    morph: 0,
    fallback: 0,          // resolve → null（w.japanese 表示）
    byClass: {},          // class → { total, morph, fallback }
    verbDetail: {},       // mood|tense|voice → { total, changed, attempted_unchanged }
    caseDetail: {},       // class|case → { total, changed }
    qualityFlags: {
        doubleParticle: [],      // 助詞の二重付与疑い
        tildeGloss: [],          // 「〜」を含む gloss への変換
        bracketGloss: [],        // ［…］を含む gloss への変換
        longGloss: [],           // 8文字超の gloss への変換（句グロス疑い）
        weirdPassive: [],        // あられる 等の不自然受動疑い
        brokenImperative: [],    // 五段語幹+よ の破損命令形疑い
        brokenParticiple: [],    // 五段る→た の促音欠落疑い（なた/知た等）
    },
    samples: {},          // 変換種別ごとのサンプル
};

const PLACEHOLDERS = new Set(['', '—', '-', '読み込んでいます...']);
const PARTICLES = ['の', 'に', 'を', 'よ'];

function sampleKey(t, r) {
    const cls = (t.class || '?');
    if (cls === 'verb') return `verb:${t.mood || '?'}:${t.tense || '?'}:${t.voice || '?'}`;
    return `${cls}:${t.case || '?'}`;
}

function addSample(key, entry, max = 8) {
    if (!stats.samples[key]) stats.samples[key] = [];
    if (stats.samples[key].length < max) stats.samples[key].push(entry);
}

// ── メインループ ────────────────────────────────────────────────────
for (const t of allTokens()) {
    stats.total++;
    const cls = (t.class || 'none').toLowerCase();
    if (!stats.byClass[cls]) stats.byClass[cls] = { total: 0, morph: 0, fallback: 0 };
    stats.byClass[cls].total++;

    const base = t.japanese;
    if (PLACEHOLDERS.has(base || '')) {
        stats.noJapanese++;
        stats.byClass[cls].fallback++;
        stats.fallback++;
        continue;
    }

    const r = engine.resolve(t);

    // 動詞の詳細（変換を試みる領域: participle/infinitive/imperative/passive）
    if (cls === 'verb') {
        const key = `${t.mood || '-'}|${t.tense || '-'}|${t.voice || '-'}`;
        if (!stats.verbDetail[key]) stats.verbDetail[key] = { total: 0, changed: 0 };
        stats.verbDetail[key].total++;
        if (r) stats.verbDetail[key].changed++;
    }
    // 名詞・代名詞・形容詞の格詳細
    if (['noun', 'pron', 'adj'].includes(cls)) {
        const key = `${cls}|${t.case || '-'}`;
        if (!stats.caseDetail[key]) stats.caseDetail[key] = { total: 0, changed: 0 };
        stats.caseDetail[key].total++;
        if (r) stats.caseDetail[key].changed++;
    }

    if (!r) {
        stats.fallback++;
        stats.byClass[cls].fallback++;
        continue;
    }

    stats.morph++;
    stats.byClass[cls].morph++;

    const entry = { ref: t.ref, text: t.text, base, out: r.japanese };
    addSample(sampleKey(t, r), entry);

    // ── 品質フラグ ──
    const q = stats.qualityFlags;
    // 1. 二重助詞: base 末尾が助詞なのにさらに助詞を付けた
    //    （「〜もの」は名詞なので除外 — 忌まわしいものを 等は正しい）
    if (PARTICLES.includes(base.slice(-1)) && !/もの$/.test(base) &&
        PARTICLES.includes(r.japanese.slice(-1)) &&
        r.japanese.length === base.length + 1 &&
        q.doubleParticle.length < 30) {
        q.doubleParticle.push(entry);
    }
    // 2. 「〜」を含む gloss（前置詞的グロス）への格助詞/活用付与
    if (base.includes('〜') && q.tildeGloss.length < 30) q.tildeGloss.push(entry);
    // 3. ［…］記号入り gloss
    if (/[［\[]/.test(base) && q.bracketGloss.length < 30) q.bracketGloss.push(entry);
    // 4. 長い gloss（句グロス疑い・8文字超）
    if (base.length > 8 && q.longGloss.length < 30) q.longGloss.push(entry);
    // 5. 不自然受動の疑い（であられる/あられる。得られる・強いられる等は正しいので除外）
    if (/あられる$/.test(r.japanese) && q.weirdPassive.length < 30) {
        q.weirdPassive.push(entry);
    }
    // 6. 命令形の破損疑い: 五段動詞の語幹+よ（なよ/語よ等）。
    //    正しい形（せよ / え段・い段かな+よ / 見よ・得よ・出よ）は除外。
    if ((t.mood || '') === 'imperative' &&
        /[^えけせてねへめれげぜでべぺいきしちにひみりぎじびぴ見得出]よ$/.test(r.japanese) &&
        q.brokenImperative.length < 30) {
        q.brokenImperative.push(entry);
    }
    // 7. 分詞の促音欠落疑い: 五段る→た（なた/知た等）。
    //    base が「〜る」で、出力があ段・う段・お段かな or 漢字 + た で終わる場合。
    //    （正: なった/知った=促音、一段: めた/きた、WL: 見た/着た/来た）
    if ((t.mood || '') === 'participle' && /る$/.test(base) &&
        /[あかさたなはまやわらがざだばぱうすつぬふむゆぐずぶおこそとのほもよろごぞどぼ一-鿿]た$/.test(r.japanese) &&
        !/(見|得|出|着|来)た$/.test(r.japanese) && !/った$/.test(r.japanese) &&
        q.brokenParticiple.length < 30) {
        q.brokenParticiple.push(entry);
    }
}

// ── 未対応パターン抽出 ──────────────────────────────────────────────
// 「変換を試みる設計範囲なのに変換率が低い」パターンを検出する
const unsupported = [];
for (const [key, v] of Object.entries(stats.verbDetail)) {
    const [mood, tense, voice] = key.split('|');
    const attempted = ['participle', 'infinitive', 'imperative'].includes(mood)
        || voice === 'passive';
    if (attempted && v.total >= 20) {
        const rate = v.changed / v.total;
        if (rate < 0.7) {
            unsupported.push({
                pattern: `verb ${mood} ${tense} ${voice}`,
                total: v.total, changed: v.changed,
                rate: Number((rate * 100).toFixed(1)),
            });
        }
    }
}
for (const [key, v] of Object.entries(stats.caseDetail)) {
    const [cls, kase] = key.split('|');
    const attempted = ['noun', 'pron'].includes(cls) &&
        ['genitive', 'dative', 'accusative', 'vocative'].includes(kase);
    if (attempted && v.total >= 20) {
        const rate = v.changed / v.total;
        if (rate < 0.7) {
            unsupported.push({
                pattern: `${cls} ${kase}`,
                total: v.total, changed: v.changed,
                rate: Number((rate * 100).toFixed(1)),
            });
        }
    }
}
unsupported.sort((a, b) => b.total - a.total);
stats.unsupportedPatterns = unsupported;

// ── 出力 ───────────────────────────────────────────────────────────
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase1-audit.json'),
    JSON.stringify(stats, null, 2));

const pct = (n, d) => d ? (n / d * 100).toFixed(2) + '%' : '-';

console.log(`Reading Engine Phase 1 Audit (${READING_ENGINE_VERSION})`);
console.log('='.repeat(60));
console.log(`total tokens : ${stats.total}`);
console.log(`no japanese  : ${stats.noJapanese} (${pct(stats.noJapanese, stats.total)})`);
console.log(`morph        : ${stats.morph} (${pct(stats.morph, stats.total)})`);
console.log(`fallback     : ${stats.fallback} (${pct(stats.fallback, stats.total)})`);
console.log('');
console.log('── byClass ──');
for (const [cls, v] of Object.entries(stats.byClass).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${cls.padEnd(6)} total=${String(v.total).padStart(6)}  morph=${String(v.morph).padStart(6)} (${pct(v.morph, v.total)})`);
}
console.log('');
console.log('── verbDetail (top by total) ──');
const vd = Object.entries(stats.verbDetail).sort((a, b) => b[1].total - a[1].total);
for (const [key, v] of vd.slice(0, 25)) {
    console.log(`  ${key.padEnd(38)} total=${String(v.total).padStart(6)}  changed=${String(v.changed).padStart(6)} (${pct(v.changed, v.total)})`);
}
console.log('');
console.log('── caseDetail ──');
for (const [key, v] of Object.entries(stats.caseDetail).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${key.padEnd(20)} total=${String(v.total).padStart(6)}  changed=${String(v.changed).padStart(6)} (${pct(v.changed, v.total)})`);
}
console.log('');
console.log('── qualityFlags (counts) ──');
for (const [k, arr] of Object.entries(stats.qualityFlags)) {
    console.log(`  ${k}: ${arr.length}${arr.length ? '  e.g. ' + arr.slice(0, 3).map(e => `${e.base}→${e.out}`).join(' / ') : ''}`);
}
console.log('');
console.log('── unsupportedPatterns（変換率70%未満・20件以上）──');
for (const u of unsupported) {
    console.log(`  ${u.pattern.padEnd(40)} ${u.changed}/${u.total} (${u.rate}%)`);
}
console.log('');
console.log(`詳細: scripts/output/re-phase1-audit.json`);
