#!/usr/bin/env node
/**
 * re-w2a-temporal-regression.cjs — Phase W-2A 回帰テスト
 *   Temporal Clause Support（ὅτε / ὅταν）
 *
 * 実行: node scripts/re-w2a-temporal-regression.cjs
 *       node scripts/re-w2a-temporal-regression.cjs --verbose
 *
 * 目的:
 *   既存 Wallace 資産（_WALLACE_TEXT.TEMPORAL）の未接続部分を、
 *   clause.temporal（ὅτε / ὅταν）の検出＋ clause.type→TEMPORAL 橋渡しで
 *   有効化したことを検証する。engine ロジック・テンプレートは非改変。
 *
 * §1  レジストリ／橋渡しカバレッジ
 * §2  ὅτε 検出（conj タグ）
 * §3  ὅταν 検出（conj / adv 両タグ）
 * §4  span 妥当性
 * §5  ReadingFormatter 到達（TEMPORAL 文・UNCLASSIFIED 非フォールバック）
 * §6  Guard Rule（assertReadingTextSafe 非 throw）
 * §7  既存5型の非悪化（回帰）＋ NT 全体スキャンによる静寂率変化
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

// ── CJS ローダ（package.json が "type":"module" でも .js を CJS として読む） ──
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

// ════════════════════════════════════════════════════════════════════════════
section('§1. レジストリ／橋渡しカバレッジ');
check('clause.temporal が clause-registry に存在', !!clauseRegistry.clauses['clause.temporal']);
{
    const det = clauseRegistry.clauses['clause.temporal']?.detection || {};
    check('markers.lemmas = [ὅτε, ὅταν]',
        JSON.stringify((det.markers?.lemmas || []).map(NFC)) === JSON.stringify(['ὅτε', 'ὅταν']));
    check('markers.pos に C と D を含む（conj/adv 両タグ許容）',
        (det.markers?.pos || []).includes('C') && (det.markers?.pos || []).includes('D'));
    check('strategy = conjunction_anchor', det.strategy === 'conjunction_anchor');
}
check('_CLAUSE_TYPE_TO_GLOSS_KEY["clause.temporal"] === "TEMPORAL"',
    _CLAUSE_TYPE_TO_GLOSS_KEY['clause.temporal'] === 'TEMPORAL');
check('_WALLACE_TEXT.TEMPORAL が既存（テンプレ非改変で再利用）',
    typeof _WALLACE_TEXT.TEMPORAL === 'string' && _WALLACE_TEXT.TEMPORAL.length > 0);

const TEMPORAL_TEXT     = _WALLACE_TEXT.TEMPORAL;
const UNCLASSIFIED_TEXT = _WALLACE_TEXT.UNCLASSIFIED;

// ════════════════════════════════════════════════════════════════════════════
section('§2. ὅτε 検出（conj タグ）');
{
    // MAT 7:28 「… ὅτε ἐτέλεσεν ὁ Ἰησοῦς …」（ὅτε, span 内に ὡς/ὥσπερ を含まない）
    const tokens = verseTokens('MAT', 7, 28);
    check('MAT 7:28 トークン取得', tokens.length > 0, `n=${tokens.length}`);
    const { clauseResults } = runPipeline(tokens);
    const temporal = clauseResults.filter(c => c.type === 'clause.temporal');
    check('MAT 7:28 に clause.temporal 検出', temporal.length > 0,
        `types=${clauseResults.map(c => c.type).join(',')}`);
    if (temporal[0]) {
        const anchorTok = tokens[temporal[0].anchor];
        check('anchor lemma が ὅτε', NFC(anchorTok.lemma || anchorTok.text) === 'ὅτε');
    }
}

// ════════════════════════════════════════════════════════════════════════════
section('§3. ὅταν 検出（conj / adv 両タグ）');
{
    // 1CO 15:27 「ὅταν δὲ εἴπῃ …」（ὅταν=conj）
    const t1 = verseTokens('1CO', 15, 27);
    const c1 = runPipeline(t1).clauseResults.filter(c => c.type === 'clause.temporal');
    check('1CO 15:27（ὅταν=conj）に clause.temporal 検出', c1.length > 0);

    // 1CO 15:24 「ὅταν παραδιδῷ …」（ὅταν=adv タグ — pos:['C','D'] が効くか）
    const t2 = verseTokens('1CO', 15, 24);
    const advTok = t2.find(t => NFC(t.lemma || t.text) === 'ὅταν');
    check('1CO 15:24 の ὅταν が adv タグである（テスト前提の確認）',
        advTok && ['adv', 'adverb'].includes(String(advTok.class)),
        `class=${advTok && advTok.class}`);
    const c2 = runPipeline(t2).clauseResults.filter(c => c.type === 'clause.temporal');
    check('1CO 15:24（ὅταν=adv）でも clause.temporal 検出（pos D 許容の効果）', c2.length > 0);
}

// ════════════════════════════════════════════════════════════════════════════
section('§4. span 妥当性');
{
    const tokens = verseTokens('MAT', 7, 28);
    const cr = runPipeline(tokens).clauseResults.find(c => c.type === 'clause.temporal');
    if (cr) {
        check('start ≤ anchor ≤ end', cr.start <= cr.anchor && cr.anchor <= cr.end,
            `start=${cr.start} anchor=${cr.anchor} end=${cr.end}`);
        check('confidence ∈ [0,1]', cr.confidence >= 0 && cr.confidence <= 1, String(cr.confidence));
        const VALID = ['major_conjunction', 'finite_verb', 'max_span', 'verse_end'];
        check('stopReason は有効値', VALID.includes(cr.stopReason), cr.stopReason);
        check('id フォーマット clause.temporal:N', /^clause\.temporal:\d+$/.test(cr.id), cr.id);
    } else { check('span 検証（clause.temporal 前提）', false, '検出されず'); }
}

// ════════════════════════════════════════════════════════════════════════════
section('§5. ReadingFormatter 到達（TEMPORAL 文・UNCLASSIFIED 非フォールバック）');
{
    // ὅτε 節（MAT 7:28）— span に ὡς/ὥσπερ を含まないため素直に TEMPORAL へ到達
    const t1 = verseTokens('MAT', 7, 28);
    const c1 = runPipeline(t1).clauseResults.find(c => c.type === 'clause.temporal');
    if (c1) {
        const summary = clauseSummary(t1, c1);
        check('ὅτε: summary が生成される（null でない）', !!summary);
        check('ὅτε: summary === _WALLACE_TEXT.TEMPORAL', summary === TEMPORAL_TEXT, summary);
        check('ὅτε: summary が UNCLASSIFIED 汎用文でない', summary !== UNCLASSIFIED_TEXT);
    } else { check('ὅτε ReadingFormatter 到達（前提）', false, 'clause.temporal 未検出'); }

    // ὅταν 節（MAT 5:11）
    const t2 = verseTokens('MAT', 5, 11);
    const c2 = runPipeline(t2).clauseResults.find(c => c.type === 'clause.temporal');
    if (c2) {
        check('ὅταν: summary === _WALLACE_TEXT.TEMPORAL', clauseSummary(t2, c2) === TEMPORAL_TEXT);
    } else { check('ὅταν ReadingFormatter 到達（前提）', false, 'MAT 5:11 で未検出'); }

    // 橋渡し単体: discourse=UNCLASSIFIED でも clause.type で TEMPORAL に解決される
    const direct = rf.format({
        clauseContext: { discourse: { type: 'UNCLASSIFIED', confidence: 0 }, type: 'clause.temporal' },
    });
    check('format(clause.temporal, discourse=UNCLASSIFIED) → TEMPORAL 文',
        direct.summary === TEMPORAL_TEXT, direct.summary);
    check('format 結果は UNCLASSIFIED 汎用文に落ちない', direct.summary !== UNCLASSIFIED_TEXT);
}

// ════════════════════════════════════════════════════════════════════════════
section('§6. Guard Rule（assertReadingTextSafe 非 throw）');
{
    let threw = false;
    try { assertReadingTextSafe(TEMPORAL_TEXT); } catch (_) { threw = true; }
    check('TEMPORAL 文は Guard を通過（内部語・数値の漏洩なし）', !threw);
}

// ════════════════════════════════════════════════════════════════════════════
section('§7. 既存5型の非悪化（回帰）＋ NT 全体スキャン（静寂率変化）');
{
    // 既存5型が既知の代表節で今も検出されること（挙動非変更の確認）。
    // フィクスチャは NT 全体スキャンで各型が最初に現れる節を採用（マーカー実在を確認済み）。
    const legacy = [
        ['clause.purpose',   'MAT', 1, 22],  // ἵνα
        ['clause.content',   'MAT', 2, 16],  // ὅτι
        ['clause.reason',    'MAT', 3,  2],  // γάρ
        ['clause.condition', 'MAT', 4,  3],  // εἰ/ἐάν
        ['clause.contrast',  'MAT', 4,  4],  // ἀλλά
    ];
    for (const [type, bk, ch, v] of legacy) {
        const toks = verseTokens(bk, ch, v);
        const found = runPipeline(toks).clauseResults.some(c => c.type === type);
        check(`既存型 ${type} 検出（${bk} ${ch}:${v}）`, found,
            `${bk} ${ch}:${v} n=${toks.length}`);
    }

    // NT 全体スキャン: 型別分布・静寂率変化・temporal 節の到達テンプレ分布。
    const NT = booksMaster.NT;
    const typeCount = {};
    const temporalReach = {};      // temporal 節が到達したテンプレ種別の分布
    let verses = 0, versesWithClause = 0, temporalClauses = 0;
    let temporalOnlyVerses = 0;    // temporal 追加で新たに非静寂になった節（静寂率改善）
    let fallbackToUnclassified = 0, nullOrThrow = 0, exceptions = 0;

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
                const hasTemporal = clauses.some(c => c.type === 'clause.temporal');
                const hasNonTemporal = clauses.some(c => c.type !== 'clause.temporal');
                if (hasTemporal && !hasNonTemporal) temporalOnlyVerses++;
                for (const c of clauses) {
                    typeCount[c.type] = (typeCount[c.type] || 0) + 1;
                    if (c.type === 'clause.temporal') {
                        temporalClauses++;
                        let s = null;
                        try { s = clauseSummary(toks, c); }
                        catch (_) { nullOrThrow++; continue; }   // Guard throw / 例外
                        if (s == null) { nullOrThrow++; continue; }
                        if (s === UNCLASSIFIED_TEXT) fallbackToUnclassified++;
                        const key = Object.keys(_WALLACE_TEXT).find(k => _WALLACE_TEXT[k] === s) || '(other)';
                        temporalReach[key] = (temporalReach[key] || 0) + 1;
                    }
                }
            }
        }
    }

    console.log(`  INFO  NT verses scanned          : ${verses}`);
    console.log(`  INFO  verses with >=1 clause      : ${versesWithClause}`);
    console.log(`  INFO  temporal-only verses (静寂→表示): ${temporalOnlyVerses}`);
    console.log(`  INFO  pipeline exceptions          : ${exceptions}`);
    console.log('  INFO  clause type distribution:');
    for (const [k, v] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
        console.log(`          ${k.padEnd(20)} ${v}`);
    }
    console.log(`  INFO  clause.temporal total        : ${temporalClauses}`);
    console.log('  INFO  temporal 節の到達テンプレ分布:');
    for (const [k, v] of Object.entries(temporalReach).sort((a, b) => b[1] - a[1])) {
        console.log(`          ${k.padEnd(16)} ${v}`);
    }

    check('パイプライン例外 0 件（既存経路を壊していない）', exceptions === 0, `${exceptions} 件`);
    check('clause.temporal が NT 全体で検出される（>0）', temporalClauses > 0, `${temporalClauses}`);
    // W-2A の中核目標: temporal 節が UNCLASSIFIED 汎用文へ潰れないこと。
    check('temporal 節の UNCLASSIFIED 落ち 0 件', fallbackToUnclassified === 0, `${fallbackToUnclassified} 件`);
    check('temporal 節の null / Guard throw 0 件', nullOrThrow === 0, `${nullOrThrow} 件`);
    // span 内 ὡς/ὥσπερ を含む節は既存 discourse 勾配で SIMILE/APPROX_CAUSE になる（設計通り・実テンプレ）。
    check('temporal 節の大半が TEMPORAL 文へ到達', (temporalReach['TEMPORAL'] || 0) >= temporalClauses * 0.9,
        `TEMPORAL=${temporalReach['TEMPORAL'] || 0}/${temporalClauses}`);
    // 既存5型が全滅していない（分布に残っている）ことの回帰確認
    for (const t of ['clause.purpose', 'clause.content', 'clause.reason', 'clause.condition', 'clause.contrast']) {
        check(`既存型 ${t} が NT 全体で今も検出される`, (typeCount[t] || 0) > 0, `${typeCount[t] || 0}`);
    }
}

// ════════════════════════════════════════════════════════════════════════════
section('結果');
console.log(`  PASS: ${PASS}   FAIL: ${FAIL}`);
process.exit(FAIL === 0 ? 0 : 1);
