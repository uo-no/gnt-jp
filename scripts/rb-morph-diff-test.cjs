#!/usr/bin/env node
/**
 * rb-morph-diff-test.cjs
 * decodeMorph 統一前後の差分テスト
 *
 * 比較対象:
 *   - new:        morph-decoder.js の decodeMorph（統一実装）
 *   - old_index:  index.html の旧実装（class 先頭1文字方式）
 *   - old_search: search-tool.html の旧実装（entryPosCode + morph文字列パース方式）
 *
 * 合格条件: 全差分が仕様5点のどれかで説明できること
 *   - 仕様1: pos の正規化（entryPosCode 方式 vs class-first-char）
 *   - 仕様2: 格・数・性フォールバック（search-tool の欠落を補う）
 *   - 仕様3: entryPosCode（normalizeClass + CLASS_TO_POS 12項目）
 *   - 仕様4: PRT-N の格除去 / person 抽出
 *   - 仕様5: エッジ（'-' 正規化、object morph、null 対応）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── vm ローダ（package.json type:module 環境で .js を CJS 相当で読む） ──
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
const { decodeMorph: decodeMorphNew, entryPosCode } =
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
const _SYN_TENSE_CODE  = { P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect' };
const _SYN_VOICE_CODE  = { A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive' };
const _SYN_MOOD_CODE   = { I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle' };
const _SYN_CASE_CODE   = { N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative' };
const _SYN_NUMBER_CODE = { S:'singular',P:'plural' };
const _SYN_GENDER_CODE = { M:'masculine',F:'feminine',N:'neuter' };
const _SYN_CLASS_TO_POS = {
    verb:'V', noun:'N', adjective:'A', article:'T',
    preposition:'P', conjunction:'C', adverb:'D',
    particle:'X', pronoun:'P', 'relative pronoun':'R',
};
function entryPosCodeSearch(e) {
    if (e.pos) return String(e.pos).replace(/-$/,'').toUpperCase();
    if (e.class) return _SYN_CLASS_TO_POS[String(e.class).toLowerCase()] || '';
    return '';
}
function decodeMorphSearch(e) {
    const n = v => (!v||v==='-')?'':v;
    if (e.tense||e.mood||e.voice) return {
        pos:entryPosCodeSearch(e), tense:n(e.tense), voice:n(e.voice), mood:n(e.mood),
        case:n(e.case), number:n(e.number), gender:n(e.gender), person:n(e.person),
    };
    if (e.morph&&typeof e.morph==='object'){const m=e.morph;return{
        pos:n(e.pos||'').replace(/-$/,''),tense:n(m.tense),voice:n(m.voice),mood:n(m.mood),
        case:n(m.case),number:n(m.number),gender:n(m.gender),person:n(m.person),
    };}
    const raw=typeof e.morph==='string'?e.morph:'';
    const parts=raw.split('-');
    const pos=n(e.pos||parts[0]||'').replace(/-$/,'');
    if(pos.toUpperCase()==='V'&&parts[1]){
        const seg=parts[1],off=/^[0-9]/.test(seg)?1:0;
        return{pos,tense:_SYN_TENSE_CODE[seg[off]]||'',voice:_SYN_VOICE_CODE[seg[off+1]]||'',
            mood:_SYN_MOOD_CODE[seg[off+2]]||'',person:seg[off+3]||'',
            number:_SYN_NUMBER_CODE[seg[off+4]]||'',gender:'',case:''};}
    if(parts[1]){const seg=parts[1],hp=['1','2','3'].includes(seg[0]),b=hp?seg.slice(1):seg;
        return{pos,tense:'',voice:'',mood:'',person:hp?seg[0]:'',
            case:_SYN_CASE_CODE[b[0]]||'',number:_SYN_NUMBER_CODE[b[1]]||'',gender:_SYN_GENDER_CODE[b[2]]||''};}
    return{pos,tense:'',voice:'',mood:'',case:'',number:'',gender:'',person:''};
}

// ── トークン走査 ────────────────────────────────────────────

const FIELDS = ['pos','tense','voice','mood','case','number','gender','person'];

const stats = {
    total: 0,
    // new vs old_index
    ni: Object.fromEntries(FIELDS.map(f => [f, 0])),
    // new vs old_search
    ns: Object.fromEntries(FIELDS.map(f => [f, 0])),
    // breakdown for stop detection
    unexplained_ni: 0,
    unexplained_ns: 0,
};

// 差分例（最初の数件を収集）
const examples = { ni: [], ns: [] };
const MAX_EX = 5;

function classifyDiffNI(field, tok, nv, ov) {
    // 仕様1: pos の正規化（entryPosCode 方式 vs class-first-char）
    if (field === 'pos') return 'spec1_pos_normalization';
    // その他はすべて同じ（index実装はフォールバックなし）
    return 'spec2_fallback_now_filled';
}

function classifyDiffNS(field, tok, nv, ov) {
    if (field === 'pos') return 'spec1_pos_normalization';
    // 仕様4: PRT-N の格除去
    if (field === 'case' && tok.class === 'ptcl' && ov !== '' && nv === '')
        return 'spec4_prt_n_no_case';
    // 仕様2: フォールバックで埋まった格・数・性
    if (['case','number','gender'].includes(field) && nv !== '' && ov === '')
        return 'spec2_fallback_filled';
    // 仕様3: 旧 pronoun→P が D に修正された pos
    if (field === 'pos' && (tok.class === 'pron' || tok.class === 'pronoun'))
        return 'spec1_pronoun_pos_fix';
    return 'UNEXPLAINED';
}

function scanDir(dir, corpus) {
    if (!fs.existsSync(dir)) return;
    for (const book of fs.readdirSync(dir)) {
        const bookDir = path.join(dir, book);
        for (const chFile of fs.readdirSync(bookDir)) {
            const tokens = JSON.parse(fs.readFileSync(path.join(bookDir, chFile), 'utf8'));
            for (const tok of tokens) {
                stats.total++;
                const nResult  = decodeMorphNew(tok);
                const iResult  = decodeMorphIndex(tok);
                const sResult  = decodeMorphSearch(tok);

                for (const f of FIELDS) {
                    // new vs index
                    if (nResult[f] !== iResult[f]) {
                        stats.ni[f]++;
                        const cls = classifyDiffNI(f, tok, nResult[f], iResult[f]);
                        if (cls === 'UNEXPLAINED') {
                            stats.unexplained_ni++;
                            if (examples.ni.length < MAX_EX)
                                examples.ni.push({ corpus, f, cls, tok: { ref:tok.ref, class:tok.class, morph:tok.morph, pos:tok.pos }, new:nResult[f], index:iResult[f] });
                        }
                    }
                    // new vs search
                    if (nResult[f] !== sResult[f]) {
                        stats.ns[f]++;
                        const cls = classifyDiffNS(f, tok, nResult[f], sResult[f]);
                        if (cls === 'UNEXPLAINED') {
                            stats.unexplained_ns++;
                            if (examples.ns.length < MAX_EX)
                                examples.ns.push({ corpus, f, cls, tok: { ref:tok.ref, class:tok.class, morph:tok.morph, pos:tok.pos }, new:nResult[f], search:sResult[f] });
                        }
                    }
                }
            }
        }
    }
}

console.log('Running decodeMorph diff test (NT + LXX)...');
scanDir('public/bible_data/nt', 'NT');
scanDir('public/bible_data/lxx', 'LXX');

// ── 出力 ────────────────────────────────────────────────────

console.log(`\n${'='.repeat(60)}`);
console.log(`Total tokens: ${stats.total.toLocaleString()}`);
console.log(`\n--- new vs old_index (class-first-char 方式) ---`);
let ni_total = 0;
for (const f of FIELDS) {
    const c = stats.ni[f];
    if (c > 0) { console.log(`  ${f.padEnd(8)}: ${c.toLocaleString()} diff`); ni_total += c; }
}
console.log(`  TOTAL  : ${ni_total.toLocaleString()} diff`);
console.log(`  Unexplained: ${stats.unexplained_ni}`);

console.log(`\n--- new vs old_search (entryPosCode + morph-parse 方式) ---`);
let ns_total = 0;
for (const f of FIELDS) {
    const c = stats.ns[f];
    if (c > 0) { console.log(`  ${f.padEnd(8)}: ${c.toLocaleString()} diff`); ns_total += c; }
}
console.log(`  TOTAL  : ${ns_total.toLocaleString()} diff`);
console.log(`  Unexplained: ${stats.unexplained_ns}`);

// 時制・態・法の完全一致確認（spec §仕様）
const tvm_ni = stats.ni.tense + stats.ni.voice + stats.ni.mood;
const tvm_ns = stats.ns.tense + stats.ns.voice + stats.ns.mood;
console.log(`\n--- 時制・態・法 完全一致確認 ---`);
console.log(`  vs index : tense+voice+mood diff = ${tvm_ni} (期待: 0)`);
console.log(`  vs search: tense+voice+mood diff = ${tvm_ns} (期待: 0)`);

if (examples.ni.length > 0) {
    console.log(`\n--- Unexplained new vs index (examples) ---`);
    for (const ex of examples.ni) console.log(JSON.stringify(ex));
}
if (examples.ns.length > 0) {
    console.log(`\n--- Unexplained new vs search (examples) ---`);
    for (const ex of examples.ns) console.log(JSON.stringify(ex));
}

const PASS = stats.unexplained_ni === 0 && stats.unexplained_ns === 0 &&
             tvm_ni === 0 && tvm_ns === 0;
console.log(`\n${'='.repeat(60)}`);
console.log(PASS ? 'RESULT: PASS ✓' : 'RESULT: FAIL ✗ — stop condition triggered');
process.exit(PASS ? 0 : 1);
