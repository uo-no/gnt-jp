#!/usr/bin/env node
/**
 * rb-morph-diff-test.cjs  (Phase R-b 最終版, 許容差分台帳 2026-11-05)
 * decodeMorph 統一前後の差分テスト（3参照実装）
 *
 * 受け入れ基準:
 *   1. pos 以外: tense/voice/mood は old_syntax と完全一致。
 *   2. decodeMorph.pos 内部一貫性: 全トークンで decodeMorph.pos === entryPosCode(tok)。
 *   3. 解析側 posCode 差分: 以下の台帳カテゴリに全て収まること。台帳外 = FAIL。
 *      L2: LXX 全クラス old='' → new≠''（CATSS 2文字プレフィックス対応）
 *      L3: NT ptcl 'D'→'X'（PRT/ADV モーフ → 決定表の値）
 *      L4: NT Category B（class と morph が食い違うトークン。class が権威）
 *   4. NT 代名詞 posCode: 旧 index と不一致ゼロ（設計上保証される）
 *   5. サンプル章: ROM1/1CO1/1CH1 で代名詞 posCode が旧 index と不一致ゼロ。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

// ── 新デコーダ ──────────────────────────────────────────────
const { decodeMorph: decodeMorphNew, entryPosCode: entryPosCodeNew } =
    requireCjs(path.join(__dirname, '../public/assets/js/morph-decoder.js'));

// ── 旧 index.html 実装 ──────────────────────────────────────
function decodeMorphIndex(e) {
    if (!e || typeof e !== 'object') return {};
    return {
        pos:    e.pos || (e.class ? String(e.class).slice(0, 1).toUpperCase() : ''),
        tense:  e.tense  || '',
        voice:  e.voice  || '',
        mood:   e.mood   || '',
        case:   e.case   || '',
        number: e.number || '',
        gender: e.gender || '',
        person: e.person || '',
    };
}

// ── 旧 search-tool.html 実装 ────────────────────────────────
const _ST = {
    TENSE:  { P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect' },
    VOICE:  { A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive' },
    MOOD:   { I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle' },
    CASE:   { N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative' },
    NUMBER: { S:'singular',P:'plural' },
    GENDER: { M:'masculine',F:'feminine',N:'neuter' },
    C2P:    { verb:'V',noun:'N',adjective:'A',article:'T',preposition:'P',conjunction:'C',
              adverb:'D',particle:'X',pronoun:'P','relative pronoun':'R' },
};
function entryPosCodeSearch(e) {
    if (e.pos) return String(e.pos).replace(/-$/,'').toUpperCase();
    if (e.class) return _ST.C2P[String(e.class).toLowerCase()] || '';
    return '';
}
function decodeMorphSearch(e) {
    const n = v => (!v||v==='-')?'':v;
    if (e.tense||e.mood||e.voice) return {
        pos:entryPosCodeSearch(e),tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),
        case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};
    if (e.morph&&typeof e.morph==='object'){const m=e.morph;return{
        pos:n(e.pos||'').replace(/-$/,''),tense:n(m.tense),voice:n(m.voice),mood:n(m.mood),
        case:n(m.case),number:n(m.number),gender:n(m.gender),person:n(m.person)};}
    const raw=typeof e.morph==='string'?e.morph:'';
    const parts=raw.split('-');
    const pos=n(e.pos||parts[0]||'').replace(/-$/,'');
    if(pos.toUpperCase()==='V'&&parts[1]){
        const seg=parts[1],off=/^[0-9]/.test(seg)?1:0;
        return{pos,tense:_ST.TENSE[seg[off]]||'',voice:_ST.VOICE[seg[off+1]]||'',
            mood:_ST.MOOD[seg[off+2]]||'',person:seg[off+3]||'',
            number:_ST.NUMBER[seg[off+4]]||'',gender:'',case:''};}
    if(parts[1]){const seg=parts[1],hp=['1','2','3'].includes(seg[0]),b=hp?seg.slice(1):seg;
        return{pos,tense:'',voice:'',mood:'',person:hp?seg[0]:'',
            case:_ST.CASE[b[0]]||'',number:_ST.NUMBER[b[1]]||'',gender:_ST.GENDER[b[2]]||''};}
    return{pos,tense:'',voice:'',mood:'',case:'',number:'',gender:'',person:''};
}

// ── 旧 syntax-search.html 実装（参考記録用） ────────────────
const _SS_C2P = {
    'verb':'V','noun':'N','adjective':'A','article':'T',
    'preposition':'P','conjunction':'C','adverb':'D',
    'particle':'X','pronoun':'P','relative pronoun':'R',
    'personal pronoun':'P','demonstrative pronoun':'D',
};
const _SS = {
    TENSE:  { P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect' },
    VOICE:  { A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive' },
    MOOD:   { I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle' },
    CASE:   { N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative' },
    NUMBER: { S:'singular',P:'plural' },
    GENDER: { M:'masculine',F:'feminine',N:'neuter' },
};
function normalizeClassSS(c) {
    if (!c) return '';
    const map={prep:'preposition',adv:'adverb',conj:'conjunction',num:'numeral',
               adj:'adjective',det:'article',pron:'pronoun',ptcl:'particle',intj:'interjection'};
    return map[String(c).toLowerCase()]||String(c).toLowerCase();
}
function decodeMorphSyntax(e) {
    const n = v => (!v||v==='-')?'':v;
    const result=(function(){
        if (e.tense||e.mood||e.voice){
            const pos=_SS_C2P[normalizeClassSS(e.class)]??'';
            return{pos,tense:n(e.tense),voice:n(e.voice),mood:n(e.mood),
                case:n(e.case),number:n(e.number),gender:n(e.gender),person:n(e.person)};}
        if (e.morph&&typeof e.morph==='object'){const m=e.morph;return{
            pos:n(e.pos||'').replace(/-$/,''),tense:n(m.tense),voice:n(m.voice),mood:n(m.mood),
            case:n(m.case),number:n(m.number),gender:n(m.gender),person:n(m.person)};}
        const raw=typeof e.morph==='string'?e.morph:'';
        const parts=raw.split('-');
        const pos=n(e.pos||parts[0]||'').replace(/-$/,'');
        if(pos.toUpperCase()==='V'&&parts[1]){
            const seg=parts[1],off=/^[0-9]/.test(seg)?1:0;
            return{pos,tense:_SS.TENSE[seg[off]]||'',voice:_SS.VOICE[seg[off+1]]||'',
                mood:_SS.MOOD[seg[off+2]]||'',person:seg[off+3]||'',
                number:_SS.NUMBER[seg[off+4]]||'',gender:'',case:''};}
        if(parts[1]){const seg=parts[1],hp=['1','2','3'].includes(seg[0]),b=hp?seg.slice(1):seg;
            return{pos,tense:'',voice:'',mood:'',person:hp?seg[0]:'',
                case:_SS.CASE[b[0]]||'',number:_SS.NUMBER[b[1]]||'',gender:_SS.GENDER[b[2]]||''};}
        return{pos,tense:'',voice:'',mood:'',case:'',number:'',gender:'',person:''};
    })();
    if(!result.case&&!result.number&&!result.gender){
        const n2=v=>(!v||v==='-')?'':v;
        result.case=n2(e.case);result.number=n2(e.number);result.gender=n2(e.gender);
    }
    return result;
}

// ── 解析側 posCode シミュレーション ────────────────────────
function morphFallbackPos(t) {
    if (t.pos) return String(t.pos).replace(/-$/,'').toUpperCase();
    if (typeof t.morph === 'string' && t.morph) {
        const seg = t.morph.split('-')[0];
        if (seg === 'PREP' || seg === 'COND') return 'P';
        if (seg === 'CONJ') return 'C';
        if (seg === 'ADV' || seg === 'PRT') return 'D';
        if (seg === 'PART' || seg === 'INJ') return 'X';
        if (seg.length === 1) return seg;
    }
    if (t.mood || t.tense || t.voice) return 'V';
    return '';
}
function resolvePosSim_OldIndex(t) {
    // 旧 index では entryPosCode が global に存在しなかった → morph フォールバック直接
    return morphFallbackPos(t);
}
function resolvePosSim_New(t) {
    // 新ビルド: entryPosCode を呼び、非空なら採用、空なら morph フォールバック
    const r = entryPosCodeNew(t);
    if (r) return r;
    return morphFallbackPos(t);
}

// ── 許容差分台帳（2026-11-05 確定版）────────────────────────
// Category B NT サブグループ（class と morph が食い違うトークン）
function catBSubgroup(tok) {
    const cls = tok.class || '';
    const morphSeg = typeof tok.morph === 'string' ? tok.morph.split('-')[0] : '';
    const hasVerbFields = !!(tok.mood || tok.tense || tok.voice);
    // 主要グループ（ユーザー確認済み）
    if (cls === 'conj' && morphSeg === 'ADV')  return 'L4-conj/ADV';    // 1,011（ὡς・καθώς等）
    if (cls === 'adv'  && morphSeg === 'CONJ') return 'L4-adv/CONJ';   // 956（καί・ὅτι等）
    if (cls === 'conj' && morphSeg === 'PRT')  return 'L4-conj/PRT';   // 789（ἤ・τέ・μέν等）
    if (cls === 'conj' && morphSeg === 'COND') return 'L4-conj/COND';  // 740（εἰ・ἐάν）
    if (cls === 'ptcl' && morphSeg === 'COND') return 'L4-ptcl/COND';  // 102（εἰ系粒子）
    if (cls === 'prep' && morphSeg === 'ADV')  return 'L4-prep/ADV';   // 347（ἕως・ἄχρι等）
    if (cls === 'ptcl' && (morphSeg.startsWith('V') || hasVerbFields))
                                               return 'L4-ptcl/V';     // 232（ἰδού・ἴδε等）
    if (cls === 'adj')                         return 'L4-adj-series'; // 619（所有形容詞・実体詞化等）
    if (cls === 'noun' && (morphSeg === 'ARAM' || morphSeg === 'HEB'))
                                               return 'L4-noun/ARAM-HEB'; // 57（πάσχα等）
    if (cls === 'noun' && morphSeg.length === 1 && morphSeg !== 'N')
                                               return 'L4-noun/adj-morph'; // 24（noun/A等）
    // 僅少分（class は已知: conj/adv/prep/ptcl/noun の残余）
    if (cls === 'noun') return 'L4-noun/minor';
    if (cls === 'ptcl') return 'L4-ptcl/minor';
    if (cls === 'adv')  return 'L4-adv/minor';
    if (cls === 'conj') return 'L4-conj/minor';
    if (cls === 'prep') return 'L4-prep/minor';
    // 未知のクラス → FAIL
    return 'L4-UNKNOWN';
}

// 許容差分か判定し、カテゴリ文字列を返す。null = 台帳外 → FAIL
function getDiffCategory(corpus, tok, oldR, newR) {
    // L2: LXX 全クラス old='' → new≠''（CATSS 2文字プレフィックスが旧 index で空になった解消）
    if (corpus === 'LXX' && oldR === '' && newR !== '') return 'L2';
    // L3: NT ptcl 'D'→'X'
    if (corpus === 'NT' && tok.class === 'ptcl' && oldR === 'D' && newR === 'X') return 'L3';
    // L4: NT Category B（class ≠ 'pron' 、entryPosCode が class 由来の pos を返す）
    if (corpus === 'NT' && tok.class !== 'pron') {
        const classPos = entryPosCodeNew(tok);
        if (classPos && classPos === newR) {
            return catBSubgroup(tok);
        }
    }
    return null; // 台帳外
}

// ── 統計 ────────────────────────────────────────────────────
const FIELDS = ['pos','tense','voice','mood','case','number','gender','person'];
const stats = {
    total: 0,
    // new vs old_index
    ni: Object.fromEntries(FIELDS.map(f=>[f,0])),
    // new vs old_search
    ns: Object.fromEntries(FIELDS.map(f=>[f,0])),
    // new vs old_syntax (参考記録のみ)
    nss_pos: 0,
    nss_tvm: 0,
    unexplained_ns: 0,
    // pos 内部一貫性
    pos_inconsistent: 0,
    // 解析側 posCode 差分（カテゴリ別）
    resolve_cats: {},    // { L2: N, L3: N, 'L4-conj/ADV': N, ... }
    resolve_unknown: 0,
    resolve_unknown_examples: [],
};
const examples_ns = [];
const MAX_EX = 5;

// ── サンプル章チェック ──────────────────────────────────────
const sampleResults = [];
const sampleChapters = [
    { corpus:'NT',  book:'ROM', ch:'1.json', label:'ROM 1' },
    { corpus:'NT',  book:'1CO', ch:'1.json', label:'1CO 1' },
    { corpus:'LXX', book:'1CH', ch:'1.json', label:'1CH 1' },
];

function checkSampleChapter(corpus, label, chPath) {
    if (!fs.existsSync(chPath)) {
        sampleResults.push({ label, status:'FILE_NOT_FOUND' });
        return;
    }
    const tokens = JSON.parse(fs.readFileSync(chPath, 'utf8'));
    let total = 0, mismatch = 0;
    const examples = [];
    for (const tok of tokens) {
        const cls = (tok.class||'').toLowerCase();
        if (!cls.includes('pronoun') && cls !== 'pron') continue;
        total++;
        const nv = resolvePosSim_New(tok);
        const ov = resolvePosSim_OldIndex(tok);
        if (nv !== ov) {
            const cat = getDiffCategory(corpus, tok, ov, nv);
            if (cat === null) {
                mismatch++;
                if (examples.length < 3)
                    examples.push({ ref:tok.ref, class:tok.class, morph:tok.morph, new:nv, old:ov });
            }
        }
    }
    sampleResults.push({ label, total, mismatch, examples });
}

// ── NS 差分分類 ────────────────────────────────────────────
function classifyDiffNS(field, tok, nv, ov) {
    if (field === 'pos') return 'spec1_pos_normalization';
    if (field === 'case' && (tok.class==='ptcl'||tok.class==='particle') && ov!==''&&nv==='')
        return 'spec4_prt_n_no_case';
    if (['case','number','gender'].includes(field) && nv!==''&&ov==='')
        return 'spec2_fallback_filled';
    return 'UNEXPLAINED';
}

// ── トークン走査 ────────────────────────────────────────────
function scanDir(dir, corpus) {
    if (!fs.existsSync(dir)) return;
    for (const book of fs.readdirSync(dir)) {
        const bookDir = path.join(dir, book);
        if (!fs.statSync(bookDir).isDirectory()) continue;
        for (const chFile of fs.readdirSync(bookDir)) {
            const chPath = path.join(bookDir, chFile);
            const tokens = JSON.parse(fs.readFileSync(chPath, 'utf8'));
            for (const tok of tokens) {
                stats.total++;
                const nv  = decodeMorphNew(tok);
                const sv  = decodeMorphSearch(tok);
                const ssv = decodeMorphSyntax(tok);

                // ① pos 内部一貫性: decodeMorph.pos === entryPosCode(tok)
                const epc = entryPosCodeNew(tok);
                if (nv.pos !== epc) stats.pos_inconsistent++;

                // ② new vs old_search（合格基準）
                for (const f of FIELDS) {
                    if (nv[f] !== sv[f]) {
                        stats.ns[f]++;
                        const cls = classifyDiffNS(f, tok, nv[f], sv[f]);
                        if (cls === 'UNEXPLAINED') {
                            stats.unexplained_ns++;
                            if (examples_ns.length < MAX_EX)
                                examples_ns.push({corpus,f,tok:{ref:tok.ref,class:tok.class,morph:tok.morph},new:nv[f],search:sv[f]});
                        }
                    }
                }

                // ③ new vs old_index（参考: 旧 '-' 正規化差分）
                const iv = decodeMorphIndex(tok);
                for (const f of FIELDS) {
                    if (nv[f] !== iv[f]) stats.ni[f]++;
                }

                // ④ new vs old_syntax pos（参考記録のみ）
                if (nv.pos !== ssv.pos) stats.nss_pos++;
                if (nv.tense!==ssv.tense||nv.voice!==ssv.voice||nv.mood!==ssv.mood) stats.nss_tvm++;

                // ⑤ 解析側 posCode 差分（台帳検査）
                const oldR = resolvePosSim_OldIndex(tok);
                const newR = resolvePosSim_New(tok);
                if (oldR !== newR) {
                    const cat = getDiffCategory(corpus, tok, oldR, newR);
                    if (cat === null || cat === 'L4-UNKNOWN') {
                        stats.resolve_unknown++;
                        if (stats.resolve_unknown_examples.length < 5)
                            stats.resolve_unknown_examples.push({
                                corpus, class:tok.class, morph:tok.morph,
                                ref:tok.ref, old:oldR, new:newR, cat,
                            });
                    } else {
                        stats.resolve_cats[cat] = (stats.resolve_cats[cat] || 0) + 1;
                    }
                }
            }
        }
    }
}

// ── サンプル章チェック ──────────────────────────────────────
for (const { corpus, book, ch, label } of sampleChapters) {
    const baseDir = corpus==='NT' ? 'public/bible_data/nt' : 'public/bible_data/lxx';
    checkSampleChapter(corpus, label, path.join(baseDir, book, ch));
}

console.log('Running decodeMorph diff test (NT+LXX, 3参照, 許容台帳 2026-11-05)...');
scanDir('public/bible_data/nt', 'NT');
scanDir('public/bible_data/lxx', 'LXX');

// ── 出力 ────────────────────────────────────────────────────
const sep = '='.repeat(60);
console.log(`\n${sep}`);
console.log(`Total tokens: ${stats.total.toLocaleString()}`);

console.log(`\n【1】pos 以外フィールド (new vs old_syntax)`);
const tvm_ok = stats.nss_tvm === 0;
console.log(`  tense+voice+mood diff: ${stats.nss_tvm} (期待: 0) ${tvm_ok?'✓':'✗'}`);

console.log(`\n【2】decodeMorph.pos 内部一貫性`);
const pos_ok = stats.pos_inconsistent === 0;
console.log(`  pos ≠ entryPosCode: ${stats.pos_inconsistent} (期待: 0) ${pos_ok?'✓':'✗'}`);
console.log(`  new vs old_syntax pos 差分（参考・失敗扱いなし）: ${stats.nss_pos.toLocaleString()}`);

console.log(`\n【3】解析側 posCode 差分（台帳カテゴリ別）`);
// L2
const l2 = stats.resolve_cats['L2'] || 0;
console.log(`  L2 LXX old=''→class由来: ${l2.toLocaleString()}`);
// L3
const l3 = stats.resolve_cats['L3'] || 0;
console.log(`  L3 NT ptcl 'D'→'X':      ${l3.toLocaleString()}`);
// L4 breakdown
const L4_KEYS = [
    'L4-conj/ADV','L4-adv/CONJ','L4-conj/PRT','L4-conj/COND','L4-ptcl/COND',
    'L4-prep/ADV','L4-ptcl/V','L4-adj-series','L4-noun/ARAM-HEB',
    'L4-noun/adj-morph','L4-noun/minor','L4-ptcl/minor','L4-adv/minor',
    'L4-conj/minor','L4-prep/minor',
];
let l4total = 0;
for (const k of L4_KEYS) {
    const c = stats.resolve_cats[k] || 0;
    if (c > 0) {
        console.log(`  ${k.padEnd(22)}: ${c.toLocaleString()}`);
        l4total += c;
    }
}
console.log(`  L4 合計:               ${l4total.toLocaleString()}`);
// Unknown
console.log(`  台帳外（FAIL条件）:      ${stats.resolve_unknown} (期待: 0) ${stats.resolve_unknown===0?'✓':'✗'}`);
if (stats.resolve_unknown_examples.length > 0) {
    console.log(`  台帳外の例:`);
    for (const ex of stats.resolve_unknown_examples) console.log(`    ${JSON.stringify(ex)}`);
}

console.log(`\n【4】サンプル章 代名詞 posCode（新 vs 旧 index, 台帳外 = mismatch）`);
let samplePass = true;
for (const r of sampleResults) {
    if (r.status === 'FILE_NOT_FOUND') {
        console.log(`  ${r.label}: FILE_NOT_FOUND`);
        samplePass = false;
    } else {
        const ok = r.mismatch === 0;
        if (!ok) samplePass = false;
        console.log(`  ${r.label}: 代名詞 ${r.total} 件, 不一致 ${r.mismatch} 件 ${ok?'✓':'✗'}`);
        for (const m of r.examples)
            console.log(`    ref=${m.ref} class=${m.class} morph=${m.morph} new=${m.new} old=${m.old}`);
    }
}

console.log(`\n【参考】new vs old_search 差分（合格基準）`);
for (const f of FIELDS) {
    const c = stats.ns[f];
    if (c > 0) console.log(`  ${f.padEnd(8)}: ${c.toLocaleString()}`);
}
console.log(`  Unexplained: ${stats.unexplained_ns}`);

console.log(`\n【参考】new vs old_index 差分`);
for (const f of FIELDS) {
    const c = stats.ni[f];
    if (c > 0) console.log(`  ${f.padEnd(8)}: ${c.toLocaleString()}`);
}

if (examples_ns.length > 0) {
    console.log(`\n--- Unexplained new vs search ---`);
    for (const ex of examples_ns) console.log(JSON.stringify(ex));
}

const PASS = tvm_ok &&
             pos_ok &&
             stats.resolve_unknown === 0 &&
             stats.unexplained_ns === 0 &&
             samplePass;

console.log(`\n${sep}`);
console.log(PASS ? 'RESULT: PASS ✓' : 'RESULT: FAIL ✗ — stop condition triggered');
process.exit(PASS ? 0 : 1);
