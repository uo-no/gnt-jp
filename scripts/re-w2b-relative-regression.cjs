#!/usr/bin/env node
/**
 * re-w2b-relative-regression.cjs — Phase W-2B 回帰テスト
 *   Relative Clause Support（ὅς / ὅστις / ὅσπερ）
 *
 * 実行: node scripts/re-w2b-relative-regression.cjs
 *       node scripts/re-w2b-relative-regression.cjs --verbose
 *
 * 目的:
 *   ClauseAnalyzer に関係詞節 clause.relative を追加し、clause.type→RELATIVE の
 *   橋渡しで既存 Reading 経路へ接続したことを検証する。
 *   engine ロジック・classifyDiscourseRelation・schema は非改変。
 *   RELATIVE テンプレートは先行詞（referent）を特定せず、headless relative でも成立する。
 *
 * §1  レジストリ／橋渡し／テンプレカバレッジ
 * §2  ὅς 検出
 * §3  ὅστις 検出
 * §4  span 妥当性
 * §5  Reading 到達（RELATIVE 文・UNCLASSIFIED 非フォールバック）
 * §6  Guard Rule（assertReadingTextSafe 非 throw／研究用語・referent 非漏洩）
 * §7  追加 QA（headless / antecedent-present / 長 span 代表ケース）
 * §8  既存6型の非悪化（回帰）＋ NT 全体スキャン（件数・静寂改善・表示過多監査）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const VERBOSE = process.argv.includes('--verbose');
const PUBLIC  = path.resolve(__dirname, '..', 'public');

// ── グローバル設定（syntax-analyzer.js が参照する morph デコーダ） ────────────
const _TENSE  = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect', Z:'pluperfect' };
const _VOICE  = { A:'active', M:'middle', P:'passive', D:'middle deponent', E:'middle or passive', N:'middle or passive' };
const _MOOD   = { I:'indicative', S:'subjunctive', O:'optative', M:'imperative', N:'infinitive', P:'participle' };
const _CASE   = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const _NUMBER = { S:'singular', P:'plural' };
const _GENDER = { M:'masculine', F:'feminine', N:'neuter' };
const _CLS2P  = {
    verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T',
    preposition:'P', prep:'P', conjunction:'C', conj:'C',
    adverb:'D', adv:'D', particle:'X', ptcl:'X', pronoun:'R', pron:'R',
};

global.entryPosCode = function (e) {
    if (!e || typeof e !== 'object') return '';
    if (e.pos)   return String(e.pos).replace(/-$/, '').toUpperCase();
    if (e.class) return _CLS2P[String(e.class).toLowerCase()] || '';
    return '';
};

global.decodeMorph = function (e) {
    const n = v => (!v || v === '-') ? '' : v;
    if (e.tense || e.mood || e.voice) {
        return {
            pos: global.entryPosCode(e),
            tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
            case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person),
        };
    }
    const raw   = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const pos   = n(e.pos || parts[0] || '').replace(/-$/, '');
    if (String(pos).toUpperCase() === 'V' && parts[1]) {
        const seg = parts[1], off = /^[0-9]/.test(seg) ? 1 : 0;
        return {
            pos, tense: _TENSE[seg[off]] || '', voice: _VOICE[seg[off + 1]] || '',
            mood: _MOOD[seg[off + 2]] || '', person: seg[off + 3] || '',
            number: _NUMBER[seg[off + 4]] || '', gender: '', case: '',
        };
    }
    if (parts[1]) {
        const seg = parts[1], hp = ['1','2','3'].includes(seg[0]), b = hp ? seg.slice(1) : seg;
        return {
            pos, tense: '', voice: '', mood: '', person: hp ? seg[0] : '',
            case: _CASE[b[0]] || '', number: _NUMBER[b[1]] || '', gender: _GENDER[b[2]] || '',
        };
    }
    return { pos, tense: '', voice: '', mood: '', case: '', number: '', gender: '', person: '' };
};

global.cleanText = function (e) {
    const s = (e && typeof e === 'object') ? (e.word || e.normalized || e.text || '') : String(e || '');
    return s.replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
};

// ── CJS ローダ ────────────────────────────────────────────────────────────────
function requireCjs(filePath) {
    const code    = fs.readFileSync(filePath, 'utf8');
    const mod     = { exports: {}, id: filePath, filename: filePath, loaded: false };
    const dir     = path.dirname(filePath);
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn      = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, dir, filePath);
    return mod.exports;
}
function loadJson(absPath) { return JSON.parse(fs.readFileSync(absPath, 'utf8')); }

const { SyntaxAnalyzer } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { PhraseAnalyzer } = requireCjs(path.join(PUBLIC, 'core', 'phrase-analyzer.js'));
const {
    ClauseAnalyzer, ReadingFormatter, assertReadingTextSafe,
    _WALLACE_TEXT, _CLAUSE_TYPE_TO_GLOSS_KEY,
} = requireCjs(path.join(PUBLIC, 'core', 'clause-analyzer.js'));

const syntaxRegistry = loadJson(path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'));
const phraseRegistry = loadJson(path.join(PUBLIC, 'assets', 'data', 'phrase-registry.json'));
const clauseRegistry = loadJson(path.join(PUBLIC, 'assets', 'data', 'clause-registry.json'));
const booksMaster    = loadJson(path.join(PUBLIC, 'books.json'));

const sa = new SyntaxAnalyzer(syntaxRegistry);
const pa = new PhraseAnalyzer(phraseRegistry);
const ca = new ClauseAnalyzer(clauseRegistry);
const rf = new ReadingFormatter();

// ── ユーティリティ ────────────────────────────────────────────────────────────
let PASS = 0, FAIL = 0;
function check(label, cond, detail = '') {
    if (cond) { if (VERBOSE) console.log(`  PASS  ${label}`); PASS++; }
    else { console.log(`  FAIL  ${label}${detail ? '  — ' + detail : ''}`); FAIL++; }
}
function section(t) { console.log(`\n${'='.repeat(58)}\n${t}\n${'='.repeat(58)}`); }
const NFC = s => (typeof s === 'string' && s.normalize) ? s.normalize('NFC') : s;

function loadChapter(bookKey, ch) {
    const isNT = booksMaster.NT.some(b => b.key === bookKey);
    const sub  = isNT ? booksMaster.corpora.NT : booksMaster.corpora.OT;
    const fp   = path.join(PUBLIC, 'bible_data', sub, bookKey, `${ch}.json`);
    if (!fs.existsSync(fp)) return [];
    return loadJson(fp);
}
function verseTokens(bookKey, ch, v) {
    const prefix = `${bookKey} ${ch}:${v}!`;
    return loadChapter(bookKey, ch).filter(t => t.ref && t.ref.startsWith(prefix));
}
function runPipeline(tokens) {
    const all           = sa.analyzeAll(tokens);
    const syntaxResults = all.results.map(r => r.output);
    const phraseResults = pa.analyze({ tokens, syntaxResults });
    const clauseResults = ca.analyze({ tokens, syntaxResults, phraseResults });
    return { syntaxResults, phraseResults, clauseResults };
}
// _buildWordResonanceText（index.html）が節文を得るのと同一経路を再現
function clauseSummary(tokens, clause) {
    const discourse = ca.classifyDiscourseRelation(tokens, clause);
    const formatted = rf.format({ clauseContext: { discourse, type: clause.type } });
    return (formatted && formatted.summary) || null;
}
// 先行詞の存在推定（表示には一切使わない・テストの分類目的のみ）。
// SyntaxAnalyzer の _hasAntecedent と同じ「性・数一致の先行名詞が存在するか」の真偽。
function hasAntecedent(tokens, anchorIdx) {
    const m = global.decodeMorph(tokens[anchorIdx]);
    if (!m.gender || !m.number) return false;
    for (let i = 0; i < anchorIdx; i++) {
        if (global.entryPosCode(tokens[i]) !== 'N') continue;
        const mm = global.decodeMorph(tokens[i]);
        if (mm.gender === m.gender && mm.number === m.number) return true;
    }
    return false;
}

// ════════════════════════════════════════════════════════════════════════════
section('§1. レジストリ／橋渡し／テンプレ カバレッジ');
check('clause.relative が clause-registry に存在', !!clauseRegistry.clauses['clause.relative']);
{
    const det = clauseRegistry.clauses['clause.relative']?.detection || {};
    check('markers.lemmas = [ὅς, ὅστις, ὅσπερ]',
        JSON.stringify((det.markers?.lemmas || []).map(NFC)) === JSON.stringify(['ὅς', 'ὅστις', 'ὅσπερ']));
    check('markers.pos = [R]（代名詞）', JSON.stringify(det.markers?.pos || []) === JSON.stringify(['R']));
    check('strategy = conjunction_anchor', det.strategy === 'conjunction_anchor');
}
check('_CLAUSE_TYPE_TO_GLOSS_KEY["clause.relative"] === "RELATIVE"',
    _CLAUSE_TYPE_TO_GLOSS_KEY['clause.relative'] === 'RELATIVE');
check('_WALLACE_TEXT.RELATIVE が存在（新規テンプレ）',
    typeof _WALLACE_TEXT.RELATIVE === 'string' && _WALLACE_TEXT.RELATIVE.length > 0);
check('採用文が仕様どおり',
    _WALLACE_TEXT.RELATIVE === 'ここでは、ある内容について、続くことばが詳しく述べられています。',
    _WALLACE_TEXT.RELATIVE);

const RELATIVE_TEXT     = _WALLACE_TEXT.RELATIVE;
const UNCLASSIFIED_TEXT = _WALLACE_TEXT.UNCLASSIFIED;

// テンプレは referent・研究用語を含まない（L-0 静的検査）
{
    const banned = ['関係詞', '先行詞', 'イエス', '彼ら', '彼女', 'referent', '関係代名詞'];
    const leaked = banned.filter(w => RELATIVE_TEXT.includes(w));
    check('RELATIVE 文が referent／研究用語を含まない', leaked.length === 0, `leaked=${leaked.join(',')}`);
}

// ════════════════════════════════════════════════════════════════════════════
section('§2. ὅς 検出');
{
    // MAT 1:16 「… ἐξ ἧς ἐγεννήθη Ἰησοῦς …」（ὅς 系、先行詞あり）
    const tokens = verseTokens('MAT', 1, 16);
    check('MAT 1:16 トークン取得', tokens.length > 0, `n=${tokens.length}`);
    const { clauseResults } = runPipeline(tokens);
    const rel = clauseResults.filter(c => c.type === 'clause.relative');
    check('MAT 1:16 に clause.relative 検出', rel.length > 0,
        `types=${clauseResults.map(c => c.type).join(',')}`);
    if (rel[0]) check('anchor lemma が ὅς', NFC(tokens[rel[0].anchor].lemma || tokens[rel[0].anchor].text) === 'ὅς');
}

// ════════════════════════════════════════════════════════════════════════════
section('§3. ὅστις 検出');
{
    // MAT 2:6 「… ἐκ σοῦ … ὅστις ποιμανεῖ …」
    const tokens = verseTokens('MAT', 2, 6);
    const rel = runPipeline(tokens).clauseResults.filter(c => c.type === 'clause.relative');
    check('MAT 2:6 に clause.relative 検出', rel.length > 0);
    const anchors = rel.map(c => NFC(tokens[c.anchor].lemma || tokens[c.anchor].text));
    check('anchor に ὅστις を含む', anchors.includes('ὅστις'), anchors.join(','));
}

// ════════════════════════════════════════════════════════════════════════════
section('§4. span 妥当性');
{
    const tokens = verseTokens('MAT', 1, 16);
    const cr = runPipeline(tokens).clauseResults.find(c => c.type === 'clause.relative');
    if (cr) {
        check('start ≤ anchor ≤ end', cr.start <= cr.anchor && cr.anchor <= cr.end,
            `start=${cr.start} anchor=${cr.anchor} end=${cr.end}`);
        check('confidence ∈ [0,1]', cr.confidence >= 0 && cr.confidence <= 1, String(cr.confidence));
        const VALID = ['major_conjunction', 'finite_verb', 'max_span', 'verse_end'];
        check('stopReason は有効値', VALID.includes(cr.stopReason), cr.stopReason);
        check('id フォーマット clause.relative:N', /^clause\.relative:\d+$/.test(cr.id), cr.id);
    } else { check('span 検証（clause.relative 前提）', false, '検出されず'); }
}

// ════════════════════════════════════════════════════════════════════════════
section('§5. Reading 到達（RELATIVE 文・UNCLASSIFIED 非フォールバック）');
{
    const tokens = verseTokens('MAT', 1, 16);
    const cr = runPipeline(tokens).clauseResults.find(c => c.type === 'clause.relative');
    if (cr) {
        const summary = clauseSummary(tokens, cr);
        check('summary が生成される（null でない）', !!summary);
        check('summary === _WALLACE_TEXT.RELATIVE', summary === RELATIVE_TEXT, summary);
        check('summary が UNCLASSIFIED 汎用文でない', summary !== UNCLASSIFIED_TEXT);
    } else { check('Reading 到達（前提）', false, 'clause.relative 未検出'); }

    // 橋渡し単体: discourse=UNCLASSIFIED でも clause.type で RELATIVE に解決される
    const direct = rf.format({
        clauseContext: { discourse: { type: 'UNCLASSIFIED', confidence: 0 }, type: 'clause.relative' },
    });
    check('format(clause.relative, discourse=UNCLASSIFIED) → RELATIVE 文',
        direct.summary === RELATIVE_TEXT, direct.summary);
    check('format 結果は UNCLASSIFIED 汎用文に落ちない', direct.summary !== UNCLASSIFIED_TEXT);
}

// ════════════════════════════════════════════════════════════════════════════
section('§6. Guard Rule（assertReadingTextSafe 非 throw）');
{
    let threw = false;
    try { assertReadingTextSafe(RELATIVE_TEXT); } catch (_) { threw = true; }
    check('RELATIVE 文は Guard を通過（内部語・数値の漏洩なし）', !threw);
}

// ════════════════════════════════════════════════════════════════════════════
section('§7. 追加 QA（headless / antecedent-present / 長 span 代表ケース）');
{
    // antecedent あり: MAT 1:16（ἧς の前に一致名詞 Μαρίας 等）
    {
        const t = verseTokens('MAT', 1, 16);
        const cr = runPipeline(t).clauseResults.find(c => c.type === 'clause.relative');
        check('antecedent-present 代表（MAT 1:16）検出', !!cr);
        if (cr) {
            check('  先行詞あり判定（テスト分類のみ）', hasAntecedent(t, cr.anchor));
            check('  RELATIVE 文へ到達', clauseSummary(t, cr) === RELATIVE_TEXT);
        }
    }
    // headless: MAT 1:25（先行名詞が一致しない ὅς 系）
    {
        const t = verseTokens('MAT', 1, 25);
        const cr = runPipeline(t).clauseResults.find(c => c.type === 'clause.relative');
        check('headless 代表（MAT 1:25）検出', !!cr);
        if (cr) {
            check('  headless 判定（先行詞なし・テスト分類のみ）', !hasAntecedent(t, cr.anchor));
            // headless でも同一の RELATIVE 文で成立（先行詞に依存しない文）
            check('  headless でも RELATIVE 文へ到達（先行詞非依存）', clauseSummary(t, cr) === RELATIVE_TEXT);
        }
    }
    // 長 span: MAT 2:9（ὃν εἶδον … 長い関係詞節・registry 例文）
    {
        const t = verseTokens('MAT', 2, 9);
        const cr = runPipeline(t).clauseResults.find(c => c.type === 'clause.relative');
        check('長 span 代表（MAT 2:9）検出', !!cr);
        if (cr) {
            check('  span 長 ≥ 10（長節でも破綻しない）', (cr.end - cr.start + 1) >= 10, `len=${cr.end - cr.start + 1}`);
            check('  RELATIVE 文へ到達', clauseSummary(t, cr) === RELATIVE_TEXT);
        }
    }
}

// ════════════════════════════════════════════════════════════════════════════
section('§8. 既存6型の非悪化（回帰）＋ NT 全体スキャン（件数・静寂改善・表示過多）');
{
    // 既存型（W-2A 後の6型）が既知の代表節で今も検出されること
    const legacy = [
        ['clause.purpose',   'MAT', 1, 22],
        ['clause.content',   'MAT', 2, 16],
        ['clause.reason',    'MAT', 3,  2],
        ['clause.condition', 'MAT', 4,  3],
        ['clause.contrast',  'MAT', 4,  4],
        ['clause.temporal',  'MAT', 7, 28],
    ];
    for (const [type, bk, ch, v] of legacy) {
        const toks = verseTokens(bk, ch, v);
        const found = runPipeline(toks).clauseResults.some(c => c.type === type);
        check(`既存型 ${type} 検出（${bk} ${ch}:${v}）`, found, `${bk} ${ch}:${v} n=${toks.length}`);
    }

    // NT 全体スキャン
    const NT = booksMaster.NT;
    const typeCount = {};
    const relReach = {};                 // relative 節が到達したテンプレ分布
    let verses = 0, versesWithClause = 0, exceptions = 0;
    let relClauses = 0, relOnlyVerses = 0;   // relative 追加で新たに非静寂になった節
    let fallbackToUnclassified = 0, nullOrThrow = 0;
    let relTokenSpanSum = 0, relSpanMax = 0;

    for (const b of NT) {
        for (let ch = 1; ch <= b.chapters; ch++) {
            const chap = loadChapter(b.key, ch);
            if (!chap.length) continue;
            const byVerse = new Map();
            for (const t of chap) {
                const k = t.ref.split('!')[0];
                if (!byVerse.has(k)) byVerse.set(k, []);
                byVerse.get(k).push(t);
            }
            for (const [, toks] of byVerse) {
                verses++;
                let res;
                try { res = runPipeline(toks); }
                catch (_) { exceptions++; continue; }
                const clauses = res.clauseResults;
                if (clauses.length > 0) versesWithClause++;
                const hasRel = clauses.some(c => c.type === 'clause.relative');
                const hasNonRel = clauses.some(c => c.type !== 'clause.relative');
                if (hasRel && !hasNonRel) relOnlyVerses++;
                for (const c of clauses) {
                    typeCount[c.type] = (typeCount[c.type] || 0) + 1;
                    if (c.type === 'clause.relative') {
                        relClauses++;
                        const len = c.end - c.start + 1;
                        relTokenSpanSum += len;
                        if (len > relSpanMax) relSpanMax = len;
                        let s = null;
                        try { s = clauseSummary(toks, c); }
                        catch (_) { nullOrThrow++; continue; }
                        if (s == null) { nullOrThrow++; continue; }
                        if (s === UNCLASSIFIED_TEXT) fallbackToUnclassified++;
                        const key = Object.keys(_WALLACE_TEXT).find(k => _WALLACE_TEXT[k] === s) || '(other)';
                        relReach[key] = (relReach[key] || 0) + 1;
                    }
                }
            }
        }
    }

    console.log(`  INFO  NT verses scanned          : ${verses}`);
    console.log(`  INFO  verses with >=1 clause      : ${versesWithClause}`);
    console.log(`  INFO  relative-only verses (静寂→表示): ${relOnlyVerses}`);
    console.log(`  INFO  pipeline exceptions          : ${exceptions}`);
    console.log('  INFO  clause type distribution:');
    for (const [k, v] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
        console.log(`          ${k.padEnd(20)} ${v}`);
    }
    console.log(`  INFO  clause.relative total        : ${relClauses}`);
    console.log(`  INFO  relative span avg / max      : ${(relTokenSpanSum / Math.max(1, relClauses)).toFixed(1)} / ${relSpanMax}`);
    console.log('  INFO  relative 節の到達テンプレ分布:');
    for (const [k, v] of Object.entries(relReach).sort((a, b) => b[1] - a[1])) {
        console.log(`          ${k.padEnd(16)} ${v}`);
    }

    check('パイプライン例外 0 件（既存経路を壊していない）', exceptions === 0, `${exceptions} 件`);
    check('clause.relative が NT 全体で検出される（>0）', relClauses > 0, `${relClauses}`);
    check('relative 節の UNCLASSIFIED 落ち 0 件', fallbackToUnclassified === 0, `${fallbackToUnclassified} 件`);
    check('relative 節の null / Guard throw 0 件', nullOrThrow === 0, `${nullOrThrow} 件`);
    check('relative 節の大半が RELATIVE 文へ到達', (relReach['RELATIVE'] || 0) >= relClauses * 0.9,
        `RELATIVE=${relReach['RELATIVE'] || 0}/${relClauses}`);
    // 表示過多監査: 平均 span が過度に長くないこと（設計値 max_span=20 内・平均は一桁台想定）
    check('relative span 平均が過度に長くない（< 12 語）', (relTokenSpanSum / Math.max(1, relClauses)) < 12,
        `avg=${(relTokenSpanSum / Math.max(1, relClauses)).toFixed(1)}`);
    // 既存6型が全滅していない
    for (const t of ['clause.purpose', 'clause.content', 'clause.reason', 'clause.condition', 'clause.contrast', 'clause.temporal']) {
        check(`既存型 ${t} が NT 全体で今も検出される`, (typeCount[t] || 0) > 0, `${typeCount[t] || 0}`);
    }
}

// ════════════════════════════════════════════════════════════════════════════
section('結果');
console.log(`  PASS: ${PASS}   FAIL: ${FAIL}`);
process.exit(FAIL === 0 ? 0 : 1);
