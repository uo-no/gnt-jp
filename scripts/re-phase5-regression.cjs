#!/usr/bin/env node
/**
 * re-phase5-regression.cjs — Reading Engine Phase 5-A（Semantic Layer）回帰テスト
 *
 * 実行: node scripts/re-phase5-regression.cjs
 *       npm run test:re-phase5
 *
 * Phase 5-A（慣用句・固定表現）は 2026-07-17 NT 全巻監査・悪化ケース 0 で固定。
 * Semantic Layer（_resolveSemantic / _idiomItemMatch /
 * assets/data/reading-semantic-data.js の idioms）を変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する
 *
 * 設計原則（docs/reading-semantic.md）:
 *   - 完全一致のみ。推論禁止。不成立は必ず null → 既存チェーンへ
 *   - 使える context は tokens / targetIdx のみ
 *   - 固定訳はパターンの head 構成語にのみ表示する
 *
 * Part 1: 単体回帰（全パターン・不成立系・ガード・凍結互換）
 * Part 2: NT 全巻基準値照合（re-phase2-audit.cjs が semantic も集計する）
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Phase 5-A/5-B/5-D 凍結基準値（2026-07-17 NT全巻監査） ───────────
// 5-B 追加（2026-07-17）: semantic 299 → 359（+60 prepDomain）。
// 5-A の byIdiom 内訳は追加前後で不変（追加方式の実証）。
// 5-D 追加（2026-07-17）: semantic 359 → 465（+106 lnGloss replace）。
// 内訳: semantic-idiom 299 / semantic-prep 60 / semantic-ln 106。
// assist（πνεῦμα 23.186 息・4トークン）は置換しない = ln 計に含まれない。
const PHASE5A_BASELINE = {
    totalTokens: 137741,
    semantic:    465,
    semanticLn:  106,
    byIdiom: {
        'まことに言います':     69,
        'このため':             64,
        'こうして…が起こった':  61,
        '永遠に':               53,
        'ひそかに':             18,
        '断じてそうではない':   15,
        '一つ所に':             10,
        '絶えず':                9,
    },
    // Phase 5-B（prepDomain）
    byPrepDomain: {
        'πρός+対格+固有名 → のもとに': 48,
        'πρός+対格+人 → のもとに':      7,
        'περί+対格+身体 → の周りに':    5,
    },
    zeroFlags: ['doubleParticle', 'brokenWaGa', 'morphMismatch'],
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
const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { readingSemanticData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-semantic-data.js'));
const { READING_LN_FINAL } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));

// 本番と同じ構成（5-D: lnGloss 注入込み）
const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
engine.setSemanticData(readingSemanticData);
engine.setLnGlossData(READING_LN_FINAL);
// semantic 未注入（凍結互換の検証用）
const engineNoSem = new ReadingEngine();
engineNoSem.setLexicon(new ReadingLexicon(readingLexiconData));
// lnGloss 未注入（5-D 劣化モードの検証用）
const engineNoLn = new ReadingEngine();
engineNoLn.setLexicon(new ReadingLexicon(readingLexiconData));
engineNoLn.setSemanticData(readingSemanticData);

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

const tok = (lemma, over = {}) => Object.assign(
    { class: 'noun', lemma, japanese: 'X', case: '', gender: '', number: '',
      mood: '', tense: '', voice: '', person: '', lemmaId: '' }, over);
const ctx = (tokens, i) => ({ tokens, targetIdx: i, phrases: [], hasPassiveVerb: false });

function T(desc, fn, expectJa, expectSrc) {
    let r;
    try { r = fn(); } catch (e) { r = { japanese: `EXCEPTION: ${e.message}`, source: '?' }; }
    const ja  = r ? r.japanese : null;
    const src = r ? r.source : null;
    const ok  = ja === expectJa &&
        (expectSrc === undefined || src === expectSrc || expectJa === null);
    ok ? pass++ : fail++;
    if (!ok) console.log(`FAIL  ${desc}: got=${ja} [${src}] expect=${expectJa} [${expectSrc ?? ''}]`);
}

// ── 全 8 パターン（head で成立・固定訳）
{
    const t = [tok('διά', { class: 'prep' }),
               tok('οὗτος', { class: 'pron', japanese: 'これ', case: 'accusative', gender: 'neuter', number: 'singular' })];
    T('διὰ τοῦτο → このため', () => engine.resolve(t[1], ctx(t, 1)), 'このため', 'semantic');
}
{
    const t = [tok('εἰς', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('αἰών', { japanese: '世', case: 'accusative' })];
    T('εἰς τὸν αἰῶνα → 永遠に', () => engine.resolve(t[2], ctx(t, 2)), '永遠に', 'semantic');
}
{
    const t = [tok('μή', { class: 'ptcl' }),
               tok('γίνομαι', { class: 'verb', japanese: 'なる', mood: 'optative', tense: 'aorist' })];
    T('μὴ γένοιτο → 断じてそうではない', () => engine.resolve(t[1], ctx(t, 1)), '断じてそうではない', 'semantic');
}
{
    const t = [tok('καί', { class: 'conj' }),
               tok('γίνομαι', { class: 'verb', japanese: 'なる', mood: 'indicative', tense: 'aorist', person: '3', number: 'singular' })];
    T('καὶ ἐγένετο → こうして…が起こった', () => engine.resolve(t[1], ctx(t, 1)), 'こうして…が起こった', 'semantic');
}
{
    const t = [tok('ἀμήν', { class: 'ptcl' }),
               tok('λέγω', { class: 'verb', japanese: '言う', mood: 'indicative', tense: 'present', person: '1' })];
    T('ἀμὴν λέγω → まことに言います', () => engine.resolve(t[1], ctx(t, 1)), 'まことに言います', 'semantic');
}
{
    const t = [tok('διά', { class: 'prep' }),
               tok('πᾶς', { class: 'adj', japanese: 'すべて', case: 'genitive', gender: 'masculine', number: 'singular' })];
    T('διὰ παντός → 絶えず', () => engine.resolve(t[1], ctx(t, 1)), '絶えず', 'semantic');
}
{
    const t = [tok('κατά', { class: 'prep' }),
               tok('ἴδιος', { class: 'adj', japanese: '自分の', case: 'accusative', gender: 'feminine' })];
    T('κατʼ ἰδίαν → ひそかに', () => engine.resolve(t[1], ctx(t, 1)), 'ひそかに', 'semantic');
}
{
    const t = [tok('ἐπί', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('αὐτός', { class: 'pron', japanese: 'それ', case: 'accusative', gender: 'neuter' })];
    T('ἐπὶ τὸ αὐτό → 一つ所に', () => engine.resolve(t[2], ctx(t, 2)), '一つ所に', 'semantic');
}

// ── 不成立系（完全一致しない → 必ず既存チェーンへ）
{
    const t = [tok('μή', { class: 'ptcl' }),
               tok('γίνομαι', { class: 'verb', japanese: 'なる', mood: 'subjunctive', tense: 'aorist' })];
    const r = engine.resolve(t[1], ctx(t, 1));
    check('μὴ γένηται（接続法）→ semantic 不成立', r?.source !== 'semantic', true);
}
{
    const t = [tok('καί', { class: 'conj' }),
               tok('γίνομαι', { class: 'verb', japanese: 'なる', mood: 'participle', tense: 'aorist', voice: 'middle' })];
    const r = engine.resolve(t[1], ctx(t, 1));
    check('καὶ γενόμενος（分詞）→ semantic 不成立', r?.source !== 'semantic', true);
}
{
    const t = [tok('διά', { class: 'prep' }),
               tok('πᾶς', { class: 'adj', japanese: 'すべて', case: 'genitive', gender: 'masculine', number: 'singular' }),
               tok('προσευχή', { japanese: '祈り', case: 'genitive' })];
    T('διὰ πάσης+属格名詞 → 不成立（修飾構造）', () => engine.resolve(t[1], ctx(t, 1)), null);
}
{
    const t = [tok('διά', { class: 'prep', japanese: '〜を通して' }),
               tok('οὗτος', { class: 'pron', japanese: 'これ', case: 'accusative', gender: 'neuter', number: 'singular' })];
    T('非head 構成語（διά）→ fallback', () => engine.resolve(t[0], ctx(t, 0)), null);
}

// ── 優先順位: semantic > syntax（εἰς PP head でも慣用句が勝つ）
{
    const t = [tok('εἰς', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('αἰών', { japanese: '世', case: 'accusative' })];
    const c = { tokens: t, targetIdx: 2, phrases: [{ type: 'PP', start: 0, end: 2, head: 2 }], hasPassiveVerb: false };
    T('semantic > syntax（PP head でも永遠に）', () => engine.resolve(t[2], c), '永遠に', 'semantic');
}
// ── semantic 不発時は syntax が従来どおり発火（凍結維持の裏付け）
{
    const t = [tok('εἰς', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('κόσμος', { japanese: '世界', case: 'accusative' })];
    const c = { tokens: t, targetIdx: 2, phrases: [{ type: 'PP', start: 0, end: 2, head: 2 }], hasPassiveVerb: false };
    T('慣用句非該当の εἰς → syntax（世界へ）', () => engine.resolve(t[2], c), '世界へ', 'syntax');
}

// ── Unicode 表記ゆれ（NFC 正規化）
{
    const kaiVariant = 'κα' + String.fromCodePoint(0x1F77);   // ί = U+1F77 → NFC → U+03AF
    const t = [tok(kaiVariant, { class: 'conj' }),
               tok('γίνομαι', { class: 'verb', japanese: 'なる', mood: 'indicative', tense: 'aorist', person: '3', number: 'singular' })];
    T('NFC 正規化（表記ゆれ吸収）', () => engine.resolve(t[1], ctx(t, 1)), 'こうして…が起こった', 'semantic');
}

// ── Phase 5-B: prepDomain（2026-07-17 凍結）
{
    const t = [tok('πρός', { class: 'prep' }),
               tok('Ἰησοῦς', { japanese: 'イエス', case: 'accusative', domain: '93001' })];
    T('5-B: πρὸς Ἰησοῦν → のもとに', () => engine.resolve(t[1], ctx(t, 1)), 'イエスのもとに', 'semantic');
}
{
    const t = [tok('πρός', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('ἀνήρ', { japanese: '男', case: 'accusative', domain: '9002' })];
    T('5-B: πρὸς τοὺς ἄνδρας（冠詞介在・domain 9）', () => engine.resolve(t[2], ctx(t, 2)), '男のもとに', 'semantic');
}
{
    const t = [tok('περί', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('τράχηλος', { japanese: '首', case: 'accusative', domain: '8016' })];
    T('5-B: περὶ τὸν τράχηλον → の周りに', () => engine.resolve(t[2], ctx(t, 2)), '首の周りに', 'semantic');
}
// ── 5-B exclude（用法例外の保護）
{
    const t = [tok('πρός', { class: 'prep' }),
               tok('αἷμα', { japanese: '血', case: 'accusative', domain: '9017' })];
    T('5-B: πρὸς αἷμα → exclude（血を）', () => engine.resolve(t[1], ctx(t, 1)), '血を', 'morph');
}
{
    const t = [tok('πρός', { class: 'prep' }),
               tok('Βελιάρ', { japanese: 'ベリアル', case: 'accusative', domain: '93001' })];
    T('5-B: πρὸς Βελιάρ → exclude', () => engine.resolve(t[1], ctx(t, 1)), 'ベリアルを', 'morph');
}
// ── 5-B 不成立系（domain 違い・ἐπί 対象外・domain なし）
{
    const t = [tok('πρός', { class: 'prep' }),
               tok('θάλασσα', { japanese: '海', case: 'accusative', domain: '1021' })];
    T('5-B: πρός+場所 domain → 対象外（海を）', () => engine.resolve(t[1], ctx(t, 1)), '海を', 'morph');
}
{
    const t = [tok('ἐπί', { class: 'prep' }),
               tok('γῆ', { japanese: '地', case: 'genitive', domain: '1039' })];
    T('5-B: ἐπί は対象外（地の）', () => engine.resolve(t[1], ctx(t, 1)), '地の', 'morph');
}
{
    const t = [tok('πρός', { class: 'prep' }),
               tok('Ἰησοῦς', { japanese: 'イエス', case: 'accusative', domain: '' })];
    T('5-B: domain なし → fallback', () => engine.resolve(t[1], ctx(t, 1)), 'イエスを', 'morph');
}
// ── 5-A idiom が prepDomain より優先
{
    const t = [tok('εἰς', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('αἰών', { japanese: '世', case: 'accusative', domain: '67142' })];
    T('5-B: idiom > prepDomain', () => engine.resolve(t[2], ctx(t, 2)), '永遠に', 'semantic');
}
// ── prepDomain 未定義データ = 5-A のみ動作（追加方式の互換）
{
    const eng5a = new ReadingEngine();
    eng5a.setLexicon(new ReadingLexicon(readingLexiconData));
    eng5a.setSemanticData({ version: 1, idioms: readingSemanticData.idioms });
    const t = [tok('πρός', { class: 'prep' }),
               tok('Ἰησοῦς', { japanese: 'イエス', case: 'accusative', domain: '93001' })];
    T('5-B: prepDomain 未定義 → 5-A のみ', () => eng5a.resolve(t[1], ctx(t, 1)), 'イエスを', 'morph');
}

// ── Phase 5-D: lnGloss（2026-07-17 凍結）─────────────────────────
// replace: λόγος 57.228 → 申し開き（格助詞は既存チェーン再利用で維持）
{
    const t = [tok('λόγος', { japanese: 'ことば', lemmaId: 'grc:G3056', ln: '57.228', case: 'accusative' })];
    T('5-D replace: λόγον(57.228) → 申し開きを', () => engine.resolve(t[0], ctx(t, 0)), '申し開きを', 'semantic');
}
// replace + PP: base 置換後に syntax 再利用（前置詞助詞の維持）
{
    const t = [tok('ἐκ', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'genitive' }),
               tok('κόσμος', { japanese: '世界', lemmaId: 'grc:G2889', ln: '41.38', case: 'genitive' })];
    const c = Object.assign(ctx(t, 2),
        { phrases: [{ type: 'PP', start: 0, end: 2, head: 2, dependents: [] }] });
    T('5-D replace+PP: ἐκ τοῦ κόσμου → 世から', () => engine.resolve(t[2], c), '世から', 'semantic');
}
// preserve: σάρξ 26.7（保護台帳）→ 変更なし
{
    const t = [tok('σάρξ', { japanese: '肉', lemmaId: 'grc:G4561', ln: '26.7', case: 'genitive' })];
    T('5-D preserve: σαρκός(26.7) → 肉の [morph] 変更なし', () => engine.resolve(t[0], ctx(t, 0)), '肉の', 'morph');
}
// assist: πνεῦμα 23.186 → jaWord 変更なし（mode 違反の防止）
{
    const t = [tok('πνεῦμα', { japanese: '霊', lemmaId: 'grc:G4151', ln: '23.186', case: 'genitive' })];
    T('5-D assist: πνεύματος(23.186) → 霊の [morph] 変更なし', () => engine.resolve(t[0], ctx(t, 0)), '霊の', 'morph');
    check('5-D assist: getLnAssist で「息」取得可（UI 未使用）',
        engine.getLnAssist(t[0]), '息');
    check('5-D assist: preserve 対象は getLnAssist も null',
        engine.getLnAssist(tok('σάρξ', { lemmaId: 'grc:G4561', ln: '26.7' })), null);
}
// 未ロード: lnGloss 不活性（semantic inactive → 既存チェーン）
{
    const t = [tok('λόγος', { japanese: 'ことば', lemmaId: 'grc:G3056', ln: '57.228', case: 'accusative' })];
    T('5-D 未ロード → ことばを [morph]', () => engineNoLn.resolve(t[0], ctx(t, 0)), 'ことばを', 'morph');
}
// LN なし → fallback
{
    const t = [tok('λόγος', { japanese: 'ことば', lemmaId: 'grc:G3056', ln: '', case: 'accusative' })];
    T('5-D LN なし → ことばを [morph]', () => engine.resolve(t[0], ctx(t, 0)), 'ことばを', 'morph');
}
// 対応表にない ln（主要 ln = preserve 扱い）→ fallback
{
    const t = [tok('λόγος', { japanese: 'ことば', lemmaId: 'grc:G3056', ln: '33.98', case: 'accusative' })];
    T('5-D 主要 ln(33.98) → ことばを [morph]', () => engine.resolve(t[0], ctx(t, 0)), 'ことばを', 'morph');
}
// idiom > lnGloss（優先順位）
{
    const t = [tok('εἰς', { class: 'prep' }), tok('ὁ', { class: 'det', case: 'accusative' }),
               tok('αἰών', { japanese: '世', lemmaId: 'grc:G165', ln: '67.143', case: 'accusative' })];
    T('5-D idiom > lnGloss（永遠に）', () => engine.resolve(t[2], ctx(t, 2)), '永遠に', 'semantic');
}
// 複合 ln の先頭一致
{
    const t = [tok('κόσμος', { japanese: '世界', lemmaId: 'grc:G2889', ln: '41.38 1.39', case: 'accusative' })];
    T('5-D 複合 ln 先頭一致 → 世を', () => engine.resolve(t[0], ctx(t, 0)), '世を', 'semantic');
}

// ── 凍結互換
T('contextなし → semantic 不活性（morph）',
    () => engine.resolve(tok('αἰών', { japanese: '世', case: 'accusative' })), '世を', 'morph');
{
    const t = [tok('διά', { class: 'prep' }),
               tok('οὗτος', { class: 'pron', japanese: 'これ', case: 'accusative', gender: 'neuter', number: 'singular' })];
    T('semantic データ未注入 → 既存チェーン（これを）',
        () => engineNoSem.resolve(t[1], ctx(t, 1)), 'これを', 'morph');
}

console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（audit 実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-phase2-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'output', 're-phase2-audit.json'), 'utf8'));

check('total tokens（コーパス不変）', audit.total, PHASE5A_BASELINE.totalTokens);
check('semantic 件数（基準値一致）', audit.semantic, PHASE5A_BASELINE.semantic);
for (const [ja, count] of Object.entries(PHASE5A_BASELINE.byIdiom)) {
    check(`慣用句: ${ja}`, audit.byIdiom[ja]?.count ?? 0, count);
}
for (const [name, count] of Object.entries(PHASE5A_BASELINE.byPrepDomain)) {
    check(`prepDomain: ${name}`, audit.byPrepDomain[name]?.count ?? 0, count);
}
// Phase 5-D: lnGloss 総数（replace のみ。assist は置換しないため含まれない）
{
    let lnTotal = 0;
    for (const v of Object.values(audit.byLnGloss || {})) lnTotal += v.count;
    check('semantic-ln 件数（基準値一致）', lnTotal, PHASE5A_BASELINE.semanticLn);
}
for (const flag of PHASE5A_BASELINE.zeroFlags) {
    check(`悪化ケース 0: ${flag}`, (audit.qualityFlags[flag] || []).length, 0);
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Phase 5-A 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('Semantic Layer か bible_data が変わっています。');
    console.log('意図的な改善の場合: audit で悪化ケース 0 を確認し、PHASE5A_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
