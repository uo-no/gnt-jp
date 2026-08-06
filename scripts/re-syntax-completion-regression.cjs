#!/usr/bin/env node
/**
 * re-syntax-completion-regression.cjs — Syntax Completion（Stage K-3 / L-3c）回帰テスト
 *
 * 実行: node scripts/re-syntax-completion-regression.cjs
 *       npm run test:re-syntax-completion
 *
 * 対象:
 *   - getRelativeSyntax(token)      Stage K-3（関係詞 role/referent 読み取り）
 *   - getDemonstrativeSyntax(token) Stage L-3c（指示詞 role/referent/adnominal 読み取り）
 *
 * 設計正典:
 *   docs/development/relative-syntax-rule-design.md（K-1）
 *   docs/archive/relative-syntax-rule-implementation-report.md（K-3、FROZEN候補 2026-07-20）
 *   docs/development/syntax-completion-design.md（L-3b）
 *   docs/archive/syntax-completion-implementation-report.md（L-3c、FROZEN候補 2026-07-20）
 *
 * K-3/L-3c は「bible_data に注釈済みの role/referent を read-only で読み取って返すだけ」の
 * 情報層であり、resolve() の japanese 出力は一切変えない（バイト等価）。本テストは
 * その読み取りロジック自体（推論混入 0・非対象への leak 0・安全 fallback）を検証する。
 * 変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する（崩れる場合は
 *      悪化 0 を監査で確認した上で SYNTAX_COMPLETION_BASELINE を更新する）
 *
 * Part 1: 単体回帰（合成トークンによる代表ケース・leak 確認・安全 fallback）
 * Part 2: NT 全巻基準値照合（bible_data を直接走査し getRelativeSyntax /
 *         getDemonstrativeSyntax を全トークンへ適用・集計。ESM-53-A で
 *         2026-07-20 版報告値との完全一致を実測確認済みの数値を基準値とする）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');

// ── Syntax Completion 凍結基準値（2026-07-20 実装報告 / ESM-53-A で現行 bible_data と
//    完全一致することを実測確認済み） ─────────────────────────────────────────
const SYNTAX_COMPLETION_BASELINE = {
    totalTokens: 137741,
    relative: {
        total: 1658,
        bound: 1071,   // getRelativeSyntax 非 null（referent 有）
        free:  587,    // referent 無 → null
        roleDist: { s: 379, o: 348, adv: 71, io: 22, p: 10, o2: 4 },   // bound 内訳
        referentResolved: { count: 1006, of: 1071 },                  // verseId 索引で解決可能
    },
    demonstrative: {
        bound: 1104,          // getDemonstrativeSyntax 非 null（referent 有）
        roleAnnotated: 576,   // bound 内訳（role 注釈あり）
        referentResolved: { count: 919, of: 1104 },
        adnominalDetermined: 0,   // adnominal は現行仕様で常に null（未判定）
    },
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
const engine = new ReadingEngine();

let pass = 0, fail = 0;
function check(desc, actual, expect) {
    const ok = actual === expect;
    ok ? pass++ : fail++;
    if (!ok) console.log(`FAIL  ${desc}: got=${JSON.stringify(actual)} expect=${JSON.stringify(expect)}`);
    return ok;
}

// ══════════════════════════════════════════════════════════════════
// Part 1: 単体回帰
// ══════════════════════════════════════════════════════════════════
console.log('── Part 1: 単体回帰 ──');

const tok = (over = {}) => Object.assign(
    { class: 'pron', lemma: '', strong: '', referent: '', role: '', japanese: 'X' }, over);

// ── K-3: getRelativeSyntax ──────────────────────────────────────────
// 束縛関係詞（referent 有）: role 別 6 区分
{
    const t = tok({ lemma: 'ὅς', strong: 'G3739', referent: 'n40001002001', role: 's' });
    const r = engine.getRelativeSyntax(t);
    check('K-3: 束縛関係詞 role=s → strong/role/referent 取得',
        JSON.stringify(r), JSON.stringify({ strong: 'G3739', role: 's', referent: 'n40001002001' }));
}
for (const role of ['o', 'adv', 'io', 'p', 'o2']) {
    const t = tok({ lemma: 'ὅς', strong: 'G3739', referent: 'n40001002001', role });
    const r = engine.getRelativeSyntax(t);
    check(`K-3: 束縛関係詞 role=${role} → role 取得`, r && r.role, role);
}
// 3 lemma（ὅς/ὅστις/ὅσος）とも対象になること
{
    const t = tok({ lemma: 'ὅστις', strong: 'G3748', referent: 'n40001002001', role: 's' });
    check('K-3: ὅστις(G3748) も対象', engine.getRelativeSyntax(t) !== null, true);
}
{
    const t = tok({ lemma: 'ὅσος', strong: 'G3745', referent: 'n40001002001', role: 's' });
    check('K-3: ὅσος(G3745) も対象', engine.getRelativeSyntax(t) !== null, true);
}
// 自由関係（referent 無）→ null
{
    const t = tok({ lemma: 'ὅς', strong: 'G3739', referent: '', role: 's' });
    check('K-3: 自由関係（referent 無）→ null', engine.getRelativeSyntax(t), null);
}
// role 未注釈（'-'/''）→ role は null（referent があれば object 自体は返る）
{
    const t = tok({ lemma: 'ὅς', strong: 'G3739', referent: 'n40001002001', role: '-' });
    const r = engine.getRelativeSyntax(t);
    check('K-3: role 未注釈(\'-\') → role null', r && r.role, null);
}
// 非関係詞（leak 確認）→ null
{
    const t = tok({ lemma: 'αὐτός', strong: 'G846', referent: 'n40001002001', role: 's' });
    check('K-3: 非関係詞（leak 確認）→ null', engine.getRelativeSyntax(t), null);
}
{
    const t = tok({ lemma: 'τίς', strong: 'G5101', referent: 'n40001002001', role: 's' });
    check('K-3: τίς（非関係詞・leak 確認）→ null', engine.getRelativeSyntax(t), null);
}
// 欠落・例外系（安全 fallback）
check('K-3: token null → null', engine.getRelativeSyntax(null), null);
check('K-3: token undefined → null', engine.getRelativeSyntax(undefined), null);
check('K-3: strong 空 → null', engine.getRelativeSyntax(tok({ referent: 'n1', role: 's' })), null);

// ── L-3c: getDemonstrativeSyntax ─────────────────────────────────────
// 3 lemma とも対象（束縛・role 有）
for (const lemma of ['οὗτος', 'ἐκεῖνος', 'τοιοῦτος']) {
    const t = tok({ lemma, referent: 'n40001002001', role: 's' });
    const r = engine.getDemonstrativeSyntax(t);
    check(`L-3c: 束縛指示詞 ${lemma} → lemma/role/referent/adnominal 取得`,
        JSON.stringify(r), JSON.stringify({ lemma, role: 's', referent: 'n40001002001', adnominal: null }));
}
// role 別（demonstrative 側でも役割コードが読める）
for (const role of ['o', 'adv', 'io', 'p']) {
    const t = tok({ lemma: 'οὗτος', referent: 'n40001002001', role });
    const r = engine.getDemonstrativeSyntax(t);
    check(`L-3c: 束縛指示詞 role=${role} → role 取得`, r && r.role, role);
}
// adnominal は仕様上つねに null（連体/代名詞の区別は未判定）
{
    const t = tok({ lemma: 'ἐκεῖνος', referent: 'n40001002001', role: 'o' });
    check('L-3c: adnominal は常に null（未判定・安全 fallback）',
        engine.getDemonstrativeSyntax(t).adnominal, null);
}
// 自由（referent 無）→ null
{
    const t = tok({ lemma: 'οὗτος', referent: '', role: 's' });
    check('L-3c: 自由（referent 無）→ null', engine.getDemonstrativeSyntax(t), null);
}
// role 未注釈 → role は null
{
    const t = tok({ lemma: 'οὗτος', referent: 'n40001002001', role: '' });
    check('L-3c: role 未注釈 → role null', engine.getDemonstrativeSyntax(t).role, null);
}
// 非指示詞（leak 確認）→ null
{
    const t = tok({ lemma: 'αὐτός', referent: 'n40001002001', role: 's' });
    check('L-3c: 非指示詞（leak 確認）→ null', engine.getDemonstrativeSyntax(t), null);
}
// 欠落・例外系
check('L-3c: token null → null', engine.getDemonstrativeSyntax(null), null);
check('L-3c: lemma 空 → null', engine.getDemonstrativeSyntax(tok({ referent: 'n1', role: 's' })), null);

// ── resolve() への read-only 付帯確認（japanese は既存 Phase 1 挙動のまま・不変であること） ──
{
    // 既存 Phase 1（J-6b）の確定挙動: ὅς 男性対格 → 〜する者を（re-phase1-regression.cjs 準拠）
    const t = { class: 'pron', japanese: '〜する者', strong: 'G3739', gender: 'masculine',
                number: 'singular', case: 'accusative', tense: '', voice: '', mood: '', lemma: '',
                referent: 'n40001002001', role: 's' };
    const r = engine.resolve(t, { tokens: [t], targetIdx: 0, phrases: [], hasPassiveVerb: false });
    check('resolve(): 束縛関係詞でも japanese は既存 Phase 1 挙動のまま（K-3 で書き換わらない）',
        r.japanese, '〜する者を');
    check('resolve(): relativeSyntax が read-only 付帯される',
        JSON.stringify(r.relativeSyntax), JSON.stringify({ strong: 'G3739', role: 's', referent: 'n40001002001' }));
}
{
    const t = { class: 'pron', japanese: 'これ', strong: 'G3778', gender: 'neuter',
                number: 'singular', case: 'accusative', tense: '', voice: '', mood: '', lemma: 'οὗτος',
                referent: 'n40001002001', role: 's' };
    const r = engine.resolve(t, { tokens: [t], targetIdx: 0, phrases: [], hasPassiveVerb: false });
    check('resolve(): 束縛指示詞でも japanese は既存挙動のまま（L-3c で書き換わらない）',
        r.japanese, 'これを');
    check('resolve(): demonstrativeSyntax が read-only 付帯される',
        JSON.stringify(r.demonstrativeSyntax),
        JSON.stringify({ lemma: 'οὗτος', role: 's', referent: 'n40001002001', adnominal: null }));
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（bible_data 直接走査） ──');

const allTokens = [];
const byVid = new Set();
for (const book of fs.readdirSync(NT_DIR)) {
    const bookPath = path.join(NT_DIR, book);
    if (!fs.statSync(bookPath).isDirectory()) continue;
    for (const file of fs.readdirSync(bookPath).filter((f) => f.endsWith('.json'))) {
        const arr = JSON.parse(fs.readFileSync(path.join(bookPath, file), 'utf8'));
        for (const t of arr) {
            allTokens.push(t);
            if (t.verseId) byVid.add(t.verseId);
        }
    }
}

const relStrongs = new Set(['G3739', 'G3748', 'G3745']);
const normStrong = (s) => {
    s = (s || '').trim();
    if (!s.startsWith('G')) return s;
    return s.replace(/^G0*/, 'G');
};

let relTotal = 0, relBound = 0, relFree = 0, relReferentResolved = 0;
const relRoleDist = {};
let demoBound = 0, demoRoleAnnotated = 0, demoReferentResolved = 0, demoAdnominalDetermined = 0;

for (const t of allTokens) {
    const strong = normStrong(t.strong);
    if (relStrongs.has(strong)) {
        relTotal++;
        const rs = engine.getRelativeSyntax(t);
        if (rs) {
            relBound++;
            if (byVid.has(rs.referent)) relReferentResolved++;
            if (rs.role) relRoleDist[rs.role] = (relRoleDist[rs.role] || 0) + 1;
        } else {
            relFree++;
        }
    }
    const ds = engine.getDemonstrativeSyntax(t);
    if (ds) {
        demoBound++;
        if (byVid.has(ds.referent)) demoReferentResolved++;
        if (ds.role) demoRoleAnnotated++;
        if (ds.adnominal !== null) demoAdnominalDetermined++;
    }
}

check('total tokens（コーパス不変）', allTokens.length, SYNTAX_COMPLETION_BASELINE.totalTokens);

check('K-3: 関係詞総数', relTotal, SYNTAX_COMPLETION_BASELINE.relative.total);
check('K-3: 束縛関係(referent有)', relBound, SYNTAX_COMPLETION_BASELINE.relative.bound);
check('K-3: 自由関係(referent無→null)', relFree, SYNTAX_COMPLETION_BASELINE.relative.free);
for (const [role, count] of Object.entries(SYNTAX_COMPLETION_BASELINE.relative.roleDist)) {
    check(`K-3: role内訳 ${role}`, relRoleDist[role] || 0, count);
}
check('K-3: referent解決率',
    relReferentResolved, SYNTAX_COMPLETION_BASELINE.relative.referentResolved.count);

check('L-3c: 束縛指示詞(referent有)', demoBound, SYNTAX_COMPLETION_BASELINE.demonstrative.bound);
check('L-3c: role注釈あり(bound内)', demoRoleAnnotated, SYNTAX_COMPLETION_BASELINE.demonstrative.roleAnnotated);
check('L-3c: referent解決率',
    demoReferentResolved, SYNTAX_COMPLETION_BASELINE.demonstrative.referentResolved.count);
check('L-3c: adnominal判定済み件数（常に0＝全件未判定・安全fallback）',
    demoAdnominalDetermined, SYNTAX_COMPLETION_BASELINE.demonstrative.adnominalDetermined);

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Syntax Completion（K-3/L-3c）基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('getRelativeSyntax/getDemonstrativeSyntax か bible_data の role/referent 注釈が変わっています。');
    console.log('意図的な改善の場合: 悪化 0 を確認した上で SYNTAX_COMPLETION_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
