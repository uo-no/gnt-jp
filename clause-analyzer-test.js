#!/usr/bin/env node
/**
 * clause-analyzer-test.js — Phase 10A 実装監査テスト
 *
 * 実行: node clause-analyzer-test.js
 *       node clause-analyzer-test.js --verbose
 *
 * 出力:
 *   §1  追加ファイル一覧
 *   §2  公開 API
 *   §3  ClauseResult 定義
 *   §4  registry type 一覧
 *   §5  代表節の検出テスト (MAT / ROM / JHN 各 type 1 例)
 *   §6  NT 全体スキャン（節数・type 件数・stopReason 分布）
 *   §7  SyntaxAnalyzer / PhraseAnalyzer 回帰テスト
 *   §8  Phase 10B 向け改善点
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const VERBOSE  = process.argv.includes('--verbose');
const BASE_DIR = path.resolve(__dirname);

// ── グローバル形態論デコーダ（syntax-analyzer.js が参照する） ───────────────
// syntax-analyzer.js は decodeMorph / entryPosCode / cleanText をグローバルスコープで
// 参照する設計。Node.js では global に設定してから require する必要がある。

const _TENSE  = {P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect'};
const _VOICE  = {A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive'};
const _MOOD   = {I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle'};
const _CASE   = {N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative'};
const _NUMBER = {S:'singular',P:'plural'};
const _GENDER = {M:'masculine',F:'feminine',N:'neuter'};
const _CLS2P  = {
    'verb':'V', 'noun':'N', 'adjective':'A', 'adj':'A',
    'article':'T', 'det':'T',
    'preposition':'P', 'prep':'P',
    'conjunction':'C', 'conj':'C',
    'adverb':'D', 'adv':'D',
    'particle':'X', 'ptcl':'X',
    'pronoun':'R', 'pron':'R',
};

global.entryPosCode = function(e) {
    if (e.pos)   return String(e.pos).replace(/-$/, '').toUpperCase();
    if (e.class) return _CLS2P[String(e.class).toLowerCase()] || '';
    return '';
};

global.decodeMorph = function(e) {
    const n = v => (!v || v === '-') ? '' : v;
    if (e.tense || e.mood || e.voice) {
        return {
            pos: global.entryPosCode(e),
            tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
            case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person),
        };
    }
    if (e.morph && typeof e.morph === 'object') {
        const m = e.morph;
        return {
            pos: n(e.pos || '').replace(/-$/, ''),
            tense: n(m.tense), voice: n(m.voice), mood: n(m.mood),
            case: n(m.case), number: n(m.number), gender: n(m.gender), person: n(m.person),
        };
    }
    const raw   = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const pos   = n(e.pos || parts[0] || '').replace(/-$/, '');
    if (pos.toUpperCase() === 'V' && parts[1]) {
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

global.cleanText = function(e) {
    return (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
};

// ── モジュールロード（グローバル設定後に行う） ────────────────────────────────

function loadJson(relPath) {
    return JSON.parse(fs.readFileSync(path.join(BASE_DIR, relPath), 'utf8'));
}

const { SyntaxAnalyzer }  = require(path.join(BASE_DIR, 'js', 'syntax-analyzer.js'));
const { PhraseAnalyzer }  = require(path.join(BASE_DIR, 'js', 'phrase-analyzer.js'));
const { ClauseAnalyzer }  = require(path.join(BASE_DIR, 'js', 'clause-analyzer.js'));

const syntaxRegistry  = loadJson('data/syntax-registry.json');
const phraseRegistry  = loadJson('data/phrase-registry.json');
const clauseRegistry  = loadJson('data/clause-registry.json');
const booksMaster     = loadJson('books.json');

const sa = new SyntaxAnalyzer(syntaxRegistry);
const pa = new PhraseAnalyzer(phraseRegistry);
const ca = new ClauseAnalyzer(clauseRegistry);

// ── ユーティリティ ────────────────────────────────────────────────────────────

function loadChapter(bookKey, ch) {
    const sub  = booksMaster.NT.some(b => b.key === bookKey) ? 'nt' : 'lxx';
    const fp   = path.join(BASE_DIR, 'bible_data', sub, bookKey, `${ch}.json`);
    if (!fs.existsSync(fp)) return [];
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function groupByVerse(tokens) {
    const map = new Map();
    for (const t of tokens) {
        const key = t.ref.split('!')[0];
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(t);
    }
    return map;
}

function runPipeline(tokens) {
    const all           = sa.analyzeAll(tokens);
    const syntaxResults = all.results.map(r => r.output);
    const phraseResults = pa.analyze({ tokens, syntaxResults });
    const clauseResults = ca.analyze({ tokens, syntaxResults, phraseResults });
    return { syntaxResults, phraseResults, clauseResults };
}

let PASS = 0, FAIL = 0;
function check(label, condition, detail = '') {
    if (condition) {
        console.log(`  PASS  ${label}`);
        PASS++;
    } else {
        console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`);
        FAIL++;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// § 1. 追加ファイル一覧
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 1. 追加ファイル一覧');
console.log('══════════════════════════════════════════════');

const newFiles = ['clause-analyzer.js', 'clause-registry.json', 'clause-analyzer-test.js'];
for (const f of newFiles) {
    const exists = fs.existsSync(path.join(BASE_DIR, f));
    console.log(`  ${exists ? 'OK' : 'MISSING'}  ${f}`);
}

// ════════════════════════════════════════════════════════════════════════════
// § 2. 公開 API
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 2. 公開 API');
console.log('══════════════════════════════════════════════');

check('ClauseAnalyzer はコンストラクタ', typeof ClauseAnalyzer === 'function');
const _inst = new ClauseAnalyzer(clauseRegistry);
check('instance.analyze は関数', typeof _inst.analyze === 'function');
check('analyze() は配列を返す', Array.isArray(_inst.analyze({ tokens: [], syntaxResults: [], phraseResults: [] })));
check('不正 registry で例外', (() => {
    try { new ClauseAnalyzer({}); return false; } catch(e) { return true; }
})());

// ════════════════════════════════════════════════════════════════════════════
// § 3. ClauseResult 定義確認
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 3. ClauseResult フィールド確認');
console.log('══════════════════════════════════════════════');

{
    // MAT 9:6: ἵνα εἰδῆτε ὅτι ἐξουσίαν ἔχει ὁ υἱὸς τοῦ ἀνθρώπου
    const tokens = loadChapter('MAT', 9).filter(t => t.ref.startsWith('MAT 9:6!'));
    const { clauseResults } = runPipeline(tokens);
    const cr = clauseResults.find(r => r.type === 'clause.purpose');
    if (cr) {
        const REQUIRED = ['id', 'type', 'start', 'end', 'anchor', 'confidence', 'parent', 'stopReason'];
        for (const f of REQUIRED) {
            check(`ClauseResult.${f} 存在`, f in cr);
        }
        check('id フォーマット', /^clause\.\w+:\d+$/.test(cr.id));
        check('start ≤ end', cr.start <= cr.end);
        check('anchor ∈ [start, end]', cr.anchor >= cr.start && cr.anchor <= cr.end);
        check('confidence ∈ [0,1]', cr.confidence >= 0 && cr.confidence <= 1);
        check('parent === null (Phase 10A)', cr.parent === null);
        const VALID_REASONS = ['major_conjunction', 'finite_verb', 'max_span', 'verse_end'];
        check('stopReason は有効値', VALID_REASONS.includes(cr.stopReason), cr.stopReason);
    } else {
        console.log('  INFO  MAT 9:6 に clause.purpose が検出されなかった（フィールド検証スキップ）');
        FAIL++;
    }
}

// ════════════════════════════════════════════════════════════════════════════
// § 4. registry type 一覧
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 4. registry type 一覧');
console.log('══════════════════════════════════════════════');

const expectedTypes = [
    'clause.purpose', 'clause.content', 'clause.reason',
    'clause.condition', 'clause.contrast',
];
for (const t of expectedTypes) {
    const def = clauseRegistry.clauses[t];
    console.log(`  ${def ? 'OK' : 'MISSING'}  ${t}  (strategy: ${def?.detection?.strategy ?? '?'})`);
    check(`${t} が registry に存在`, Boolean(def));
}

// ════════════════════════════════════════════════════════════════════════════
// § 5. 代表節の検出テスト
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 5. 代表節の検出テスト');
console.log('══════════════════════════════════════════════');

function testVerse(ref, expectedType, note) {
    const [bookKey, chv] = ref.split(' ');
    const [ch, v]        = chv.split(':');
    const chTokens       = loadChapter(bookKey, parseInt(ch));
    const tokens         = chTokens.filter(t => t.ref.startsWith(`${bookKey} ${ch}:${v}!`));
    const { clauseResults } = runPipeline(tokens);
    const found = clauseResults.find(r => r.type === expectedType);

    if (VERBOSE) {
        const texts = tokens.map(t => t.text).join(' ');
        console.log(`\n  [${ref}] ${texts}`);
        for (const r of clauseResults) {
            const span = tokens.slice(r.start, r.end + 1).map(t => t.text).join(' ');
            console.log(`    → ${r.type} [${r.start}..${r.end}] conf=${r.confidence} stop=${r.stopReason}`);
            console.log(`       "${span}"`);
        }
    }

    const detail = found
        ? `conf=${found.confidence} stop=${found.stopReason}`
        : `検出なし (found: ${clauseResults.map(r=>r.type).join(', ') || 'none'})`;
    check(`${ref} → ${expectedType}${note ? ' (' + note + ')' : ''}`, Boolean(found), detail);
    return found;
}

// clause.purpose — ἵνα
console.log('\n  ─── clause.purpose ───────────────────────');
testVerse('MAT 9:6',   'clause.purpose', 'ἵνα εἰδῆτε');
testVerse('JHN 3:16',  'clause.purpose', 'ἵνα πᾶς ὁ πιστεύων');
testVerse('ROM 5:21',  'clause.purpose', 'ἵνα βασιλεύσῃ');

// clause.content — ὅτι after declarative verb
console.log('\n  ─── clause.content ────────────────────────');
testVerse('JHN 4:1',   'clause.content', 'ἔγνω ὁ κύριος ὅτι...');
testVerse('ROM 6:9',   'clause.content', 'εἰδότες ὅτι...');
testVerse('JHN 11:27', 'clause.content', 'πεπίστευκα ὅτι...');

// clause.reason — γάρ postpositive (γάρ must be within first 4 tokens)
console.log('\n  ─── clause.reason ─────────────────────────');
testVerse('ROM 3:28',  'clause.reason', 'λογιζόμεθα γὰρ... [γάρ@1]');
testVerse('MAT 3:3',   'clause.reason', 'οὗτος γάρ ἐστιν... [γάρ@1]');
testVerse('JHN 3:17',  'clause.reason', 'οὐ γὰρ ἀπέστειλεν... [γάρ@1]');

// clause.condition — εἰ / ἐάν
console.log('\n  ─── clause.condition ──────────────────────');
testVerse('ROM 8:9',   'clause.condition', 'εἰ δὲ πνεῦμα θεοῦ...');
testVerse('MAT 4:3',   'clause.condition', 'Εἰ υἱὸς εἶ...');
testVerse('JHN 15:10', 'clause.condition', 'ἐὰν τὰς ἐντολάς μου τηρήσητε');

// clause.contrast — ἀλλά
console.log('\n  ─── clause.contrast ───────────────────────');
testVerse('MAT 4:4',   'clause.contrast', 'ἀλλ᾽ ἐπὶ παντὶ ῥήματι');
testVerse('JHN 1:13',  'clause.contrast', 'ἀλλ᾽ ἐκ θεοῦ ἐγεννήθησαν');
testVerse('ROM 1:21',  'clause.contrast', 'ἀλλ᾽ ἐματαιώθησαν');

// ════════════════════════════════════════════════════════════════════════════
// § 6. NT 全体スキャン
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 6. NT 全体スキャン');
console.log('══════════════════════════════════════════════');

const NT_BOOKS = booksMaster.NT.map(b => b.key);

let totalVerses  = 0;
const typeCounts = {};
const stopCounts = {};
for (const t of expectedTypes) typeCounts[t] = 0;

for (const bookKey of NT_BOOKS) {
    const bookDef = booksMaster.NT.find(b => b.key === bookKey);
    for (let ch = 1; ch <= bookDef.chapters; ch++) {
        const chTokens = loadChapter(bookKey, ch);
        if (chTokens.length === 0) continue;
        const byVerse = groupByVerse(chTokens);
        for (const [, verseTokens] of byVerse) {
            totalVerses++;
            const { clauseResults } = runPipeline(verseTokens);
            for (const r of clauseResults) {
                typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1;
                stopCounts[r.stopReason] = (stopCounts[r.stopReason] ?? 0) + 1;
            }
        }
    }
}

console.log(`\n  NT 節数 (verse): ${totalVerses.toLocaleString()}`);
console.log('\n  検出件数 by type:');
for (const [t, n] of Object.entries(typeCounts)) {
    console.log(`    ${t.padEnd(22)} ${String(n).padStart(5)}`);
}
const totalClauses = Object.values(typeCounts).reduce((a, b) => a + b, 0);
console.log(`    ${'合計'.padEnd(22)} ${String(totalClauses).padStart(5)}`);

console.log('\n  stopReason 分布:');
for (const [r, n] of Object.entries(stopCounts).sort((a, b) => b[1] - a[1])) {
    const pct = ((n / totalClauses) * 100).toFixed(1);
    console.log(`    ${r.padEnd(20)} ${String(n).padStart(5)} (${pct}%)`);
}

// ════════════════════════════════════════════════════════════════════════════
// § 7. SyntaxAnalyzer / PhraseAnalyzer 回帰テスト
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 7. 既存 Analyzer 回帰テスト');
console.log('══════════════════════════════════════════════');

function regressionSyntax(ref, expectedId, minConf) {
    const [bookKey, chv] = ref.split(' ');
    const [ch, v]        = chv.split(':').map(Number);
    const chTokens       = loadChapter(bookKey, ch);
    const verses         = groupByVerse(chTokens);
    const tokens         = verses.get(`${bookKey} ${ch}:${v}`) ?? [];
    const { syntaxResults } = runPipeline(tokens);
    const found = syntaxResults.some(r =>
        r?.candidates?.some(c => c.id === expectedId && c.confidence >= minConf)
    );
    check(`SyntaxAnalyzer ${ref} → ${expectedId}`, found);
}

function regressionPhrase(ref, expectedType, minConf) {
    const [bookKey, chv] = ref.split(' ');
    const [ch, v]        = chv.split(':').map(Number);
    const chTokens       = loadChapter(bookKey, ch);
    const verses         = groupByVerse(chTokens);
    const tokens         = verses.get(`${bookKey} ${ch}:${v}`) ?? [];
    const { phraseResults } = runPipeline(tokens);
    const found = phraseResults.some(r => r.type === expectedType && r.confidence >= minConf);
    check(`PhraseAnalyzer ${ref} → ${expectedType}`, found);
}

// SyntaxAnalyzer 回帰
regressionSyntax('ROM 3:28', 'dative.means',                    0.5);
regressionSyntax('EPH 2:8',  'dative.means',                    0.5);
regressionSyntax('MAT 8:1',  'participle.genitive_absolute',     0.7);

// PhraseAnalyzer 回帰
regressionPhrase('MAT 8:1',   'phrase.genitive_absolute',      0.7);
regressionPhrase('MAT 9:10',  'phrase.genitive_absolute',      0.7);
regressionPhrase('MAT 28:19', 'phrase.attendant_circumstance', 0.7);

// ClauseAnalyzer が syntaxResults / phraseResults を変更しないことを確認
{
    const tokens = loadChapter('MAT', 9).filter(t => t.ref.startsWith('MAT 9:6!'));
    const all    = sa.analyzeAll(tokens);
    const sr     = all.results.map(r => r.output);
    const pr     = pa.analyze({ tokens, syntaxResults: sr });
    const srStr  = JSON.stringify(sr);
    const prStr  = JSON.stringify(pr);
    ca.analyze({ tokens, syntaxResults: sr, phraseResults: pr });
    check('ClauseAnalyzer は syntaxResults を変更しない', JSON.stringify(sr) === srStr);
    check('ClauseAnalyzer は phraseResults を変更しない', JSON.stringify(pr) === prStr);
}

// ════════════════════════════════════════════════════════════════════════════
// § 8. Phase 10B 向け改善点
// ════════════════════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════════');
console.log('§ 8. Phase 10B 向け改善点 (上位 3 項目)');
console.log('══════════════════════════════════════════════');
console.log(`
  1. 節内部の καί による早期 span 切断（major_conjunction stop の過剰適用）
     ἵνα 節内で καί が等位接続詞として使われる場合
     (例: "ἵνα σωθῆτε καὶ ζήσητε") に span が καί で切断される。
     Phase 10B では κα の役割（節境界 vs 節内等位）を
     following_mood / 品詞コンテキストで区別し停止条件を精緻化する。

  2. γάρ 後置型の start 決定精度
     Phase 10A では start = 0（verse 先頭）を固定として使用するため、
     γάρ が節中程に現れる場合（前節が長い verse）に start が乖離する。
     また search_window=4 を超える位置の γάρ は全て未検出となる。
     Phase 10B では検出済み ClauseResult の end+1 から start を導出し
     search_window 制限も廃止または拡張する。

  3. ὅτι の content / reason 分類漏れ
     Phase 10A では context_check（前方宣言動詞）が失敗した ὅτι を
     出力しないため、causal 用法（「〜だから」）が全て未検出になる。
     Phase 10B では context_check 失敗時に clause.reason として
     低 confidence (0.55) で出力する fallback を実装する。
`);

// ════════════════════════════════════════════════════════════════════════════
// 集計
// ════════════════════════════════════════════════════════════════════════════

console.log('══════════════════════════════════════════════');
console.log(`テスト結果: PASS=${PASS}  FAIL=${FAIL}  合計=${PASS + FAIL}`);
console.log('══════════════════════════════════════════════\n');

if (FAIL > 0) process.exit(1);
