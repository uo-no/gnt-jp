#!/usr/bin/env node
/**
 * build-apparatus-rdggen.cjs（実行キュー #117）
 *
 * apparatus.json の「単語形の読み」（空白で区切ると1語になる読み）のうち、
 * 既存の rdg データセット（apparatus-rdg-{ja,en,es}.json）にグロスが無いものへ、
 * bible_data の形索引からグロスを機械生成する（B分類の機械生成）。
 * 生成物は言語別に apparatus-{ja,en,es}-rdggen.json（既存 rdg と同じ形
 * { entries: { "<entryId>": { "<readingIdx>": "<gloss>" } } }）。
 * 既存 rdg エントリは上書きしない（既存がある読みは生成対象から外す。
 * 表示側のマージも既存優先：chapter-loaders.js の _loadApparatusRdg{Ja,En,Es}Data）。
 *
 * ── 照合（正規化は Greekn 形検索 #77 の normalizeGreek と同じ：
 *    NFD でアクセント・気息を落とす、⸀⸁⸂⸃⌈⌉.,;:· を除く、ς→σ、小文字化）──
 *   読み側は先に句読点・省略符号（᾽ ’ ʼ '）・数字・角括弧を除く（例 ἤνοιξε[ν] → ἤνοιξεν）。
 *   省略符号はトークン側も同様に除いて照合する。
 *
 *   候補 lemma 集合 = (a) lemma_dict の見出し語（正規化形一致）∪ (b) bible_data 全トークンの
 *   「正規化形 → lemma」索引。lemma の同一性は NFC で判定する（δέ / δέ のような
 *   tonos / oxia の符号位置違いを別 lemma と数えない）。
 *     - 候補が1つ                       → その lemma を採用
 *     - 候補が複数で、エントリ自身の lemma（tokenRefs が指すトークンの lemma）が
 *       ちょうど1つ含まれる              → その lemma を採用（自 lemma 解決）
 *     - それ以外の複数                   → 曖昧として付けない
 *     - 候補が0                          → 綴り違い照合（下記）。不成立なら引き先なし
 *   採用 lemma が見出し語一致なら (a)、そうでなければ (b) として数える。
 *
 *   綴り違い照合（ει/ι。WH の綴り ἀπέλειπον 等）：正規化形の ει を ι に寄せた鍵で
 *   トークン索引を引き、エントリ自身の lemma がちょうど1つ含まれる場合だけ、その lemma
 *   を採用する（自 lemma 以外へは決して付けない）。(b) の内数として別に数える。
 *
 * ── グロスの値（言語別。手書きの値・推測は持ち込まない）──
 *   JA = bible_data の japanese、EN = gloss-token/WEB、ES = gloss-token/RVR1909。
 *   (a) は採用 lemma の全トークンで最頻の値、(b) は「その正規化形 × 採用 lemma」の
 *   トークンで最頻の値（同数は lemma 全体での出現数が多い方、さらに同数なら文字列順で
 *   先のもの。再実行で同じ結果になる）。
 *   (a) で値が無い言語は (b) の値に落とし、それも無ければその言語は付けない。
 *   注：lemma_dict は見出し語の照合（lemma の特定）にだけ使い、lemma_dict 自身の
 *   japanese / english 値はグロスに使わない（japanese は 5,518 件中 3,860 件が
 *   空または「読み込んでいます...」で、残りも bible_data と乖離が大きく、採用済みの
 *   表示値ではないため。ES の値も持たない）。PR 本文の Specification Conflict を参照。
 *   値から除くもの：空、'*' '-' だけのプレースホルダ、[absorbed] / [absorbido] /
 *   [variant]（隣接トークンへ吸収された・訳なしの印でありグロスではない）。
 *   WEB / RVR1909 は前後の引用符・末尾の句読点を落とす。
 *
 * 対象外：語句単位の異読（2語以上）・omission（現行のまま）。SV は範囲外。
 *
 * 出力（冪等。日付などの実行時依存値は持たない）:
 *   public/assets/data/apparatus-{ja,en,es}-rdggen.json
 *
 * 再生成:
 *   node scripts/build-apparatus-rdggen.cjs
 */

'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const DATA_DIR  = path.join(ROOT, 'public', 'assets', 'data');
const NT_DIR    = path.join(ROOT, 'public', 'bible_data', 'nt');
const LEMMA_DICT_PATH = path.join(ROOT, 'public', 'bible_data', 'lemma_dict.json');
const APPARATUS_PATH  = path.join(DATA_DIR, 'apparatus.json');
const GLOSS_TOKEN_DIR = path.join(DATA_DIR, 'gloss-token');

const LANGS = ['ja', 'en', 'es'];
const SIDE_CAR = { en: 'WEB', es: 'RVR1909' };

/* Greekn 形検索 #77（search-tool.html normalizeGreek）と同一の正規化 */
function normalizeGreek(str) {
    return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[⸀⸁⸂⸃⌈⌉.,;:·]/g, '').replace(/ς/g, 'σ').toLowerCase().trim();
}
/* 省略符号（᾽ U+1FBD・’ U+2019・ʼ U+02BC・'）を除いてから正規化する */
const ELISION = /[᾽’ʼ']/g;
function formKey(str) { return normalizeGreek((str || '').replace(ELISION, '')); }
/* 綴り違い照合用の鍵（ει → ι） */
function itaKey(key) { return key.replace(/ει/g, 'ι'); }
/* 読みの文字列から句読点・省略符号・数字・角括弧などギリシャ文字以外を落とす */
function cleanReadingWord(text) {
    return text.normalize('NFC').replace(/[^Ͱ-Ͽἀ-῿]/g, '')
        .replace(/[;·᾽]/g, '');   /* ギリシャ疑問符・中点・コロニス（省略符号） */
}
const lemmaId = l => (l || '').normalize('NFC');

/* ── グロス値の整形・除外 ── */
const PLACEHOLDER = /^[*\-]+$/;
const NON_GLOSS = new Set(['[absorbed]', '[absorbido]', '[variant]']);
function cleanValue(lang, raw) {
    let v = (raw || '').trim();
    if (lang !== 'ja') {
        v = v.replace(/^[“"‘¿¡(]+/u, '').replace(/[\s,.;:!?”")]+$/u, '').trim();
    }
    if (!v || PLACEHOLDER.test(v) || NON_GLOSS.has(v)) return null;
    return v;
}
function addCount(map, key, v) {
    if (v == null) return;
    let m = map.get(key);
    if (!m) { m = new Map(); map.set(key, m); }
    m.set(v, (m.get(v) || 0) + 1);
}
/* 最頻値。同数は tie（lemma 全体での出現数）が多い方、さらに同数なら文字列順で先のもの */
function topValue(m, tie) {
    if (!m) return null;
    let best = null, bestN = -1, bestT = -1;
    for (const [v, n] of m) {
        const t = (tie && tie.get(v)) || 0;
        if (n > bestN || (n === bestN && (t > bestT || (t === bestT && v < best)))) { best = v; bestN = n; bestT = t; }
    }
    return best;
}
function sortedDir(dir) { return fs.readdirSync(dir).slice().sort(); }

/* ── 入力の読み込み ── */
const sidecar = { en: {}, es: {} };
for (const lang of ['en', 'es']) {
    const base = path.join(GLOSS_TOKEN_DIR, SIDE_CAR[lang]);
    for (const book of sortedDir(base)) {
        const bd = path.join(base, book);
        if (!fs.statSync(bd).isDirectory()) continue;
        for (const f of sortedDir(bd)) {
            if (!f.endsWith('.json')) continue;
            Object.assign(sidecar[lang], JSON.parse(fs.readFileSync(path.join(bd, f), 'utf8')).glosses || {});
        }
    }
}

const tokenByRef = {};
const formIdx = new Map();      // formKey → Set(lemmaId)
const itaIdx  = new Map();      // itaKey  → Set(lemmaId)
const lemmaVals = { ja: new Map(), en: new Map(), es: new Map() };   // lemmaId → Map(value→n)
const formVals  = { ja: new Map(), en: new Map(), es: new Map() };   // formKey\tlemmaId → Map
const itaVals   = { ja: new Map(), en: new Map(), es: new Map() };   // itaKey\tlemmaId → Map
for (const book of sortedDir(NT_DIR)) {
    const bd = path.join(NT_DIR, book);
    if (!fs.statSync(bd).isDirectory()) continue;
    for (const f of sortedDir(bd)) {
        if (!f.endsWith('.json')) continue;
        for (const t of JSON.parse(fs.readFileSync(path.join(bd, f), 'utf8'))) {
            if (!t || !t.ref || !t.text || !t.lemma) continue;
            tokenByRef[t.ref] = t;
            const L = lemmaId(t.lemma);
            const k = formKey(t.text);
            if (!k) continue;
            const ik = itaKey(k);
            if (!formIdx.has(k)) formIdx.set(k, new Set());
            formIdx.get(k).add(L);
            if (!itaIdx.has(ik)) itaIdx.set(ik, new Set());
            itaIdx.get(ik).add(L);
            const vals = {
                ja: cleanValue('ja', t.japanese),
                en: cleanValue('en', sidecar.en[t.ref]),
                es: cleanValue('es', sidecar.es[t.ref]),
            };
            for (const lang of LANGS) {
                addCount(lemmaVals[lang], L, vals[lang]);
                addCount(formVals[lang], k + '\t' + L, vals[lang]);
                addCount(itaVals[lang], ik + '\t' + L, vals[lang]);
            }
        }
    }
}

const lemmaDict = JSON.parse(fs.readFileSync(LEMMA_DICT_PATH, 'utf8'));
const headIdx = new Map();      // formKey → Set(lemmaId)
for (const hw of Object.keys(lemmaDict)) {
    const k = formKey(hw);
    if (!k) continue;
    if (!headIdx.has(k)) headIdx.set(k, new Set());
    headIdx.get(k).add(lemmaId(hw));
}

const apparatus = JSON.parse(fs.readFileSync(APPARATUS_PATH, 'utf8'));
const existing = {};
for (const lang of LANGS) {
    existing[lang] = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `apparatus-rdg-${lang}.json`), 'utf8')).entries || {};
}

/* ── 照合（言語共通：どの lemma に、どの経路で決まるか）── */
function resolveLemma(entry, word) {
    const k = formKey(word);
    if (!k) return { kind: 'none' };
    const own = new Set((entry.tokenRefs || []).map(r => tokenByRef[r] && lemmaId(tokenByRef[r].lemma)).filter(Boolean));
    const head = headIdx.get(k) || new Set();
    const cand = new Set([...head, ...(formIdx.get(k) || [])]);
    if (cand.size === 0) {
        const ik = itaKey(k);
        if (ik !== k) {
            const ownHit = [...(itaIdx.get(ik) || [])].filter(L => own.has(L));
            if (ownHit.length === 1) return { kind: 'b', lemma: ownHit[0], key: ik, ita: true };
        }
        return { kind: 'none' };
    }
    let lemma = null, ownResolved = false;
    if (cand.size === 1) lemma = [...cand][0];
    else {
        const ownHit = [...cand].filter(L => own.has(L));
        if (ownHit.length !== 1) return { kind: 'amb', cand: [...cand].sort() };
        lemma = ownHit[0]; ownResolved = true;
    }
    return { kind: head.has(lemma) ? 'a' : 'b', lemma, key: k, ownResolved };
}
function glossFor(lang, res) {
    const lemmaM = lemmaVals[lang].get(res.lemma);
    if (res.ita) return { v: topValue(itaVals[lang].get(res.key + '\t' + res.lemma), lemmaM), via: 'b' };
    const formV = topValue(formVals[lang].get(res.key + '\t' + res.lemma), lemmaM);
    if (res.kind === 'a') {
        const lv = topValue(lemmaM);
        if (lv) return { v: lv, via: 'a' };
        return { v: formV, via: 'b' };
    }
    return { v: formV, via: 'b' };
}

const out = { ja: {}, en: {}, es: {} };
const zero = () => ({ existing: 0, a: 0, b: 0, ambiguous: 0, noSource: 0 });
const report = {
    singleWordReadings: 0,
    common: { a: 0, b: 0, ambiguous: 0, noSource: 0, ownLemmaResolved: 0, spellingVariant: 0 },
    byLang: { ja: zero(), en: zero(), es: zero() },
};
for (const entry of apparatus.entries) {
    entry.readings.forEach((r, idx) => {
        if (r.isOmission || !r.text) return;
        if (r.text.trim().split(/\s+/).length !== 1) return;        // 単語形の読みのみ
        report.singleWordReadings++;
        const word = cleanReadingWord(r.text);
        const res = resolveLemma(entry, word);
        if (res.kind === 'amb') report.common.ambiguous++;
        else if (res.kind === 'none') report.common.noSource++;
        else {
            report.common[res.kind]++;
            if (res.ownResolved) report.common.ownLemmaResolved++;
            if (res.ita) report.common.spellingVariant++;
        }
        for (const lang of LANGS) {
            const st = report.byLang[lang];
            const ex = existing[lang][entry.id];
            if (ex && ex[String(idx)]) { st.existing++; continue; }   // 既存は上書きしない
            if (res.kind === 'amb') { st.ambiguous++; continue; }
            if (res.kind === 'none') { st.noSource++; continue; }
            const g = glossFor(lang, res);
            if (!g.v) { st.noSource++; continue; }
            st[g.via]++;
            (out[lang][entry.id] = out[lang][entry.id] || {})[String(idx)] = g.v;
        }
    });
}

const SRC = {
    ja: 'public/bible_data の japanese',
    en: 'public/assets/data/gloss-token/WEB',
    es: 'public/assets/data/gloss-token/RVR1909',
};
for (const lang of LANGS) {
    const entries = out[lang];
    const readings = Object.values(entries).reduce((s, e) => s + Object.keys(e).length, 0);
    const doc = {
        _meta: {
            description: `apparatus 単語形の読みのグロス（${lang.toUpperCase()}・機械生成 B分類、#117）。既存 apparatus-rdg-${lang}.json に無い読みだけを持つ`,
            generator: 'scripts/build-apparatus-rdggen.cjs',
            source: `${SRC[lang]}（lemma の特定は lemma_dict 見出し語＋bible_data 形索引、正規化は Greekn #77 と同じ）`,
            entriesCount: Object.keys(entries).length,
            readingsCovered: readings,
            coverage: report.byLang[lang],
        },
        entries,
    };
    const p = path.join(DATA_DIR, `apparatus-${lang}-rdggen.json`);
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
    console.log(`Written: ${path.relative(ROOT, p)} (${Object.keys(entries).length} entries, ${readings} readings)`);
}

console.log('\n── カバー率（単語形の読み）──');
console.log(`単語形の読み: ${report.singleWordReadings}`);
const c = report.common;
console.log(`言語共通（lemma の決定）: (a) 見出し語一致 ${c.a} / (b) 形索引一致 ${c.b}`
    + `（うち自 lemma で解決 ${c.ownLemmaResolved}、綴り違い ει/ι ${c.spellingVariant}）`
    + ` / 曖昧で見送り ${c.ambiguous} / 引き先なし ${c.noSource}`);
for (const lang of LANGS) {
    const s = report.byLang[lang];
    console.log(`  ${lang.toUpperCase()}: 既存あり（対象外） ${s.existing} / 生成 (a) ${s.a} / 生成 (b) ${s.b}`
        + ` / 曖昧で見送り ${s.ambiguous} / 引き先なし ${s.noSource}`);
}
