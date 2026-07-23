#!/usr/bin/env node
/**
 * re-phase1-regression.cjs — Reading Engine Phase 1（Morphology Core）回帰テスト
 *
 * 実行: node scripts/re-phase1-regression.cjs
 *       npm run test:re-phase1
 *
 * Phase 1 は完了状態として固定済み（2026-07-16 監査・判定A）。
 * reading-engine.js の Morphology ロジックを変更する場合は:
 *   1. このファイルに回帰ケースを追加する
 *   2. 本テスト全 PASS を確認する
 *   3. Part 2 の NT 全巻基準値照合が PASS することを確認する
 *
 * Part 1: 単体回帰（Phase 1 監査で発見・修正した破損ケース + 正常系）
 * Part 2: NT 全巻基準値照合（scripts/re-phase1-audit.cjs を実行し、
 *         凍結時の基準値と比較する）
 *
 * 基準値（PHASE1_BASELINE）が意図的な改善で変わった場合は、
 * 監査で悪化ケース 0 を確認した上で本ファイルの基準値を更新すること。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const { execFileSync } = require('child_process');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

// ── Phase 1 凍結基準値（2026-07-16 監査） ───────────────────────────
const PHASE1_BASELINE = {
    totalTokens: 137741,
    // 32.37%（2026-07-16 τις「ある」ガード追加: 44,797 − 206 = 44,591）
    // 2026-07-16 Phase 4-A lemmaId キー移管: 44,591 − 2 = 44,589。
    // 旧 lemma 文字列ガードは JHN 7:53/8:1 の πορεύομαι（ύ=U+1F7B の
    // Unicode 表記ゆれ個体）を取り逃がして「行かれた」を生成していた。
    // lemmaId キーは表記ゆれの影響を受けず正しく捕捉する（2件の改善）。
    // 2026-07-17 分詞の五段促音修正: 44,589 − 308 = 44,281。
    // 旧 [^ん]る→た 規則が「なた」「知た」等の促音欠落を生成していた
    // （Phase 5-A 単体テスト中に発見）。仮名の段で一段/五段を判別し、
    // 五段は「った」、判別不能な漢字語幹+る は fallback（brokenParticiple
    // フラグを監査に追加して再発防止）。
    // 2026-07-17 現在分詞の五段イ音便修正: 44,281 − 345 = 43,936。
    // 旧 [^ん]る→ながら が「語ながら」「なながら」等（430件）を生成していた
    // （Phase 5-D 実表示監査で発見）。五段かな語幹は「りながら」で修正、
    // 判別不能な漢字語幹+る は fallback。
    // 2026-07-19 J-3: αὐτός(G846) Morph Rule 追加: 43,936 + 99 = 44,035。
    // gender/number 語幹選択（彼→彼ら/彼女/それ/それら）で主格の αὐτός 99件が
    // 新たに morph 解決（従来は null→fallback）。非主格1,581件は coverage 不変で
    // 出力のみ改善（彼の→彼らの 等）。クリーン NT で before/after 悪化 0 を確認
    // （αὐτós pron 4,982 中 1,680 改善・3,302 不変・悪化 0。scratchpad j3-beforeafter）。
    // 2026-07-19 J-5: τίς(G5101) Morph Rule 追加: 44,035 + 79 = 44,114。
    // neuter→何（誰→何）で主格 neuter τίς 79件が新たに morph 解決。neuter 全354件改善
    // （誰を→何を 等）・masculine 177・feminine 24 は誰のまま（悪化 0）。
    // 2026-07-20 M-7c: 純複数人称代名詞（1複 ἐγώ G2257/G2254/G2248/G2249→私たち・2複 σύ
    // G5216/G5209/G5210→あなたがた）追加: 44,251 + 363 = 44,614。主格複数 ἡμεῖς(127)+ὑμεῖς(236)
    // が新たに morph 解決（従来 null）。非主格1,724件は coverage 不変で出力のみ改善（私の→私たちの 等）。
    // クリーン NT で対象 2,087件が私/あなた→私たち/あなたがた（number 反映）・悪化 0・G4675(単数σου)/
    // G5213(既正)/単数人称は不変。設計: docs/morph-gap-resolution-design.md。
    // 2026-07-20 J-6b: 関係詞 ὅς/ὅστις/ὅσος Morph Rule（gender→頭語）追加: 44,114 + 137 = 44,251。
    // neuter→もの（〜する者→〜するもの）・ὅσος は だけ→者/もの。主格の neuter 関係詞 108件と
    // ὅσος masculine 主格 29件が新たに morph 解決（頭語 swap で stem 変化）。ὅς neuter 489・
    // ὅστις neuter 5・ὅσος 110 改善、masculine(ὅς/ὅστις)・feminine は非変更（悪化 0）。
    // 関係節・先行詞・格役割は Syntax 責務で対象外（docs/relative-morph-rule-design.md）。
    // M-15 反映移行(2026-07-22): 固定点2,537反映で該当語形がData化し morph 解決から外れた。
    // 44614→44396。pre-reflection historical=44614（data-role-migration-freeze・削除しない）。
    // 2026-07-23 1・2人称複数代名詞 number Data 固定点 adoption: 44396→44187（−209）。
    // 1・2人称複数代名詞の Data 層固定点 adoption により、主格209件（P-1NP 101 + P-2NP 108）で
    // engine morph 変換発火が不要化したため（stored が既に複数形→番号ルール不発火・主格は格助詞なしで
    // resolve=null）。表示・意味回帰なしを確認済み（display-equivalence 0・対象strong/lemmaはsemantic
    // データ非出現）。engine code 非改変の Data adoption 由来の意図的更新（FROZEN 破壊ではない）。
    // 設計・監査記録: docs/development/reading-japanese-plural-pronoun-number-adoption.md §2.1。
    morph:       44187,
    // 悪化ケース検出フラグはすべて 0 であること（tildeGloss / longGloss は
    // 精査済みの許容範囲なので基準に含めない）
    zeroFlags: ['doubleParticle', 'weirdPassive', 'brokenImperative'],
};

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { ReadingEngine, ResolveSource } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ReadingLexicon } =
    requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));

// 本番と同じ構成: lexicon 注入済み engine（Phase 4-A）
const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
// 劣化モード検証用: lexicon 未注入 engine
const engineNoLex = new ReadingEngine();

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

const V = (japanese, over = {}) => Object.assign(
    { class: 'verb', japanese, tense: 'aorist', voice: 'active', mood: 'imperative', case: '', lemma: '' }, over);
const N = (japanese, kase, cls = 'noun') =>
    ({ class: cls, japanese, case: kase, tense: '', voice: '', mood: '', lemma: '' });

const CASES = [
    // ── インターフェース（null / .japanese / source）
    ['null token',              () => engine.resolve(null), null],
    ['placeholder gloss',       () => engine.resolve(N('読み込んでいます...', 'genitive')), null],
    ['empty gloss',             () => engine.resolve(N('', 'genitive')), null],
    ['source = morph',          () => engine.resolve(N('神', 'genitive'))?.source, ResolveSource.MORPH],
    ['context 引数互換',        () => engine.resolve(N('神', 'genitive'), { tokens: [], targetIdx: 0 })?.japanese, '神の'],

    // ── 名詞・代名詞の格助詞
    ['noun 主格（無変換）',      () => engine.resolve(N('神', 'nominative')), null],
    ['noun 生格',               () => engine.resolve(N('神', 'genitive'))?.japanese, '神の'],
    ['noun 与格',               () => engine.resolve(N('神', 'dative'))?.japanese, '神に'],
    ['noun 対格',               () => engine.resolve(N('世界', 'accusative'))?.japanese, '世界を'],
    ['noun 呼格',               () => engine.resolve(N('兄弟', 'vocative'))?.japanese, '兄弟よ'],
    ['pron 生格',               () => engine.resolve(N('彼', 'genitive', 'pron'))?.japanese, '彼の'],
    ['pron 対格',               () => engine.resolve(N('あなた', 'accusative', 'pron'))?.japanese, 'あなたを'],

    // ── J-3: αὐτós(G846) Morph Rule（gender/number 語幹選択）
    // Data 代表語「彼」を起点に、形態情報だけで語幹を分岐する。
    ['αὐτός 男性単数 生格 → 彼の',   () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'masculine', number:'singular', case:'genitive',   tense:'',voice:'',mood:'',lemma:'' })?.japanese, '彼の'],
    ['αὐτός 男性複数 生格 → 彼らの', () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'masculine', number:'plural',   case:'genitive',   tense:'',voice:'',mood:'',lemma:'' })?.japanese, '彼らの'],
    ['αὐτός 男性複数 主格 → 彼ら',   () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'masculine', number:'plural',   case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '彼ら'],
    ['αὐτός 男性単数 主格 → null',   () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'masculine', number:'singular', case:'nominative', tense:'',voice:'',mood:'',lemma:'' }), null],
    ['αὐτός 女性単数 与格 → 彼女に', () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'feminine',  number:'singular', case:'dative',     tense:'',voice:'',mood:'',lemma:'' })?.japanese, '彼女に'],
    ['αὐτός 女性複数 生格 → 彼女たちの', () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'feminine', number:'plural', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '彼女たちの'],
    ['αὐτός 中性単数 対格 → それを', () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'neuter',    number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'それを'],
    ['αὐτός 中性複数 対格 → それらを', () => engine.resolve({ class:'pron', japanese:'彼', strong:'G846', gender:'neuter', number:'plural', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'それらを'],
    // 非対象 lemma は不変（strong 無しの「彼」は Rule 発火せず既存挙動）
    ['非G846「彼」生格 → 彼の（不変）', () => engine.resolve(N('彼', 'genitive', 'pron'))?.japanese, '彼の'],

    // ── J-5: τίς(G5101) Morph Rule（gender で人/事物を分岐）
    // masculine=誰（不変）/ neuter=何（主変換）/ feminine=誰（Morph 非変更・Semantic 責務）
    ['τίς 男性 対格 → 誰を（不変）',   () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'masculine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '誰を'],
    ['τίς 男性 主格 → null（誰）',     () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'masculine', number:'singular', case:'nominative', tense:'',voice:'',mood:'',lemma:'' }), null],
    ['τίς 中性 主格 → 何',            () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'neuter',    number:'singular', case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '何'],
    ['τίς 中性 対格 → 何を',          () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'neuter',    number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '何を'],
    ['τίς 中性 与格 → 何に',          () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'neuter',    number:'singular', case:'dative',     tense:'',voice:'',mood:'',lemma:'' })?.japanese, '何に'],
    ['τίς 女性 対格 → 誰を（Morph非変更）', () => engine.resolve({ class:'pron', japanese:'誰', strong:'G5101', gender:'feminine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '誰を'],

    // ── J-6b: 関係詞 ὅς(G3739)/ὅστις(G3748)/ὅσος(G3745) Morph Rule（gender→頭語のみ）
    // masculine→者（ὅς/ὅστις は不変）/ neuter→もの / feminine 非変更。case 助詞は Phase1 既存挙動。
    ['ὅς 男性 対格 → 〜する者を（不変）', () => engine.resolve({ class:'pron', japanese:'〜する者', strong:'G3739', gender:'masculine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜する者を'],
    ['ὅς 中性 主格 → 〜するもの',        () => engine.resolve({ class:'pron', japanese:'〜する者', strong:'G3739', gender:'neuter', number:'singular', case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜するもの'],
    ['ὅς 中性 対格 → 〜するものを',      () => engine.resolve({ class:'pron', japanese:'〜する者', strong:'G3739', gender:'neuter', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜するものを'],
    ['ὅς 女性 対格 → 〜する者を（非変更）', () => engine.resolve({ class:'pron', japanese:'〜する者', strong:'G3739', gender:'feminine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜する者を'],
    ['ὅστις 中性 主格 → 〜するもの',     () => engine.resolve({ class:'pron', japanese:'〜する者', strong:'G3748', gender:'neuter', number:'singular', case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜するもの'],
    ['ὅσος 男性 主格 → 〜する者',        () => engine.resolve({ class:'pron', japanese:'〜するだけ', strong:'G3745', gender:'masculine', number:'plural', case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜する者'],
    ['ὅσος 中性 対格 → 〜するものを',    () => engine.resolve({ class:'pron', japanese:'〜するだけ', strong:'G3745', gender:'neuter', number:'plural', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '〜するものを'],

    // ── J-8b: 再帰代名詞 ἐμαυτοῦ(G1683)→私自身 / σεαυτοῦ(G4572)→あなた自身（person は strong で一意）
    // ἑαυτοῦ(G1438/G848)は person-leveling で対象外＝Semantic 責務（自分自身/自分 維持）。case 助詞は Phase1。
    ['ἐμαυτοῦ 対格 → 私自身を',     () => engine.resolve({ class:'pron', japanese:'自分自身', strong:'G1683', gender:'masculine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '私自身を'],
    ['ἐμαυτοῦ 属格 → 私自身の',     () => engine.resolve({ class:'pron', japanese:'自分自身', strong:'G1683', gender:'masculine', number:'singular', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '私自身の'],
    ['σεαυτοῦ 対格 → あなた自身を', () => engine.resolve({ class:'pron', japanese:'自分自身', strong:'G4572', gender:'masculine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなた自身を'],
    ['σεαυτοῦ 与格 → あなた自身に', () => engine.resolve({ class:'pron', japanese:'自分自身', strong:'G4572', gender:'masculine', number:'singular', case:'dative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなた自身に'],
    ['ἑαυτοῦ G1438 対格 → 自分自身を（対象外・不変）', () => engine.resolve({ class:'pron', japanese:'自分自身', strong:'G1438', gender:'masculine', number:'singular', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '自分自身を'],

    // ── M-7c: 純複数人称代名詞の number 反映（1複 ἐγώ→私たち / 2複 σύ→あなたがた・gender 空・'|plural'）
    ['ἡμῶν G2257 属格 → 私たちの',   () => engine.resolve({ class:'pron', japanese:'私', strong:'G2257', gender:'', number:'plural', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '私たちの'],
    ['ἡμεῖς G2249 主格 → 私たち',    () => engine.resolve({ class:'pron', japanese:'私', strong:'G2249', gender:'', number:'plural', case:'nominative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '私たち'],
    ['ὑμᾶς G5209 対格 → あなたがたを', () => engine.resolve({ class:'pron', japanese:'あなた', strong:'G5209', gender:'', number:'plural', case:'accusative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなたがたを'],
    ['ὑμῶν G5216 属格 → あなたがたの', () => engine.resolve({ class:'pron', japanese:'あなた', strong:'G5216', gender:'', number:'plural', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなたがたの'],
    // 対象外: G5213(既にあなたがた)・G4675(単数σου・誤変換防止)・単数人称は不変
    ['G5213 与格 → あなたがたに（既正・不変）', () => engine.resolve({ class:'pron', japanese:'あなたがた', strong:'G5213', gender:'', number:'plural', case:'dative', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなたがたに'],
    ['G4675 単数σου 属格 → あなたの（誤変換なし）', () => engine.resolve({ class:'pron', japanese:'あなた', strong:'G4675', gender:'', number:'singular', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, 'あなたの'],
    ['単数 ἐγώ G3450 属格 → 私の（不変）', () => engine.resolve({ class:'pron', japanese:'私', strong:'G3450', gender:'', number:'singular', case:'genitive', tense:'',voice:'',mood:'',lemma:'' })?.japanese, '私の'],

    // ── P2 回帰: 末尾助詞ガード（子よよ・滅びのを 等の再発防止）
    ['「子よ」呼格 → fallback',       () => engine.resolve(N('子よ', 'vocative')), null],
    ['「滅びの」対格 → fallback',     () => engine.resolve(N('滅びの', 'accusative')), null],
    ['「万軍の」生格 → fallback',     () => engine.resolve(N('万軍の', 'genitive')), null],
    ['「反対に」対格 → fallback',     () => engine.resolve(N('反対に', 'accusative')), null],
    ['「これらの」pron → fallback',   () => engine.resolve(N('これらの', 'accusative', 'pron')), null],
    ['「もの」例外: 忌まわしいものを', () => engine.resolve(N('忌まわしいもの', 'accusative'))?.japanese, '忌まわしいものを'],
    ['「もの」例外: 盗んだものの',     () => engine.resolve(N('盗んだもの', 'genitive'))?.japanese, '盗んだものの'],
    // Phase 2 監査で発見: τις「ある」への助詞付与は破損（あるを/あるの/あるに）
    ['「ある」対格 → fallback',       () => engine.resolve(N('ある', 'accusative', 'pron')), null],
    ['「ある」生格 → fallback',       () => engine.resolve(N('ある', 'genitive', 'pron')), null],
    ['「ある」与格 → fallback',       () => engine.resolve(N('ある', 'dative', 'pron')), null],

    // ── 分詞・不定詞（Phase 1 中核）
    ['現在分詞',    () => engine.resolve(V('愛する', { mood: 'participle', tense: 'present' }))?.japanese, '愛しながら'],
    ['アオ分詞',    () => engine.resolve(V('来る', { mood: 'participle', tense: 'aorist' }))?.japanese, '来た'],
    ['完了分詞',    () => engine.resolve(V('する', { mood: 'participle', tense: 'perfect' }))?.japanese, 'してきた'],
    // 2026-07-17 修正: 五段る分詞の促音欠落（なた・知た）の再発防止
    ['アオ分詞 五段（なる→なった）',   () => engine.resolve(V('なる', { mood: 'participle', tense: 'aorist' }))?.japanese, 'なった'],
    ['アオ分詞 五段（立ち上がる）',     () => engine.resolve(V('立ち上がる', { mood: 'participle', tense: 'aorist' }))?.japanese, '立ち上がった'],
    ['アオ分詞 五段（〜である）',       () => engine.resolve(V('〜である', { mood: 'participle', tense: 'aorist' }))?.japanese, '〜であった'],
    ['アオ分詞 一段（求める）',         () => engine.resolve(V('求める', { mood: 'participle', tense: 'aorist' }))?.japanese, '求めた'],
    ['アオ分詞 一段WL（着る→着た）',    () => engine.resolve(V('着る', { mood: 'participle', tense: 'aorist' }))?.japanese, '着た'],
    ['アオ分詞 漢字+る → fallback',     () => engine.resolve(V('知る', { mood: 'participle', tense: 'aorist' })), null],
    ['アオ分詞 漢字+る → fallback（送る）', () => engine.resolve(V('送る', { mood: 'participle', tense: 'aorist' })), null],
    ['完了分詞 五段（なる→なってきた）', () => engine.resolve(V('なる', { mood: 'participle', tense: 'perfect' }))?.japanese, 'なってきた'],
    // 2026-07-17 修正（5-D 実表示監査で発見）: 現在分詞五段のイ音便欠落の再発防止
    ['現在分詞 五段（なる→なりながら）',     () => engine.resolve(V('なる', { mood: 'participle', tense: 'present' }))?.japanese, 'なりながら'],
    ['現在分詞 五段（とどまる）',            () => engine.resolve(V('とどまる', { mood: 'participle', tense: 'present' }))?.japanese, 'とどまりながら'],
    ['現在分詞 一段（求める）不変',          () => engine.resolve(V('求める', { mood: 'participle', tense: 'present' }))?.japanese, '求めながら'],
    ['現在分詞 一段WL（見る）不変',          () => engine.resolve(V('見る', { mood: 'participle', tense: 'present' }))?.japanese, '見ながら'],
    ['現在分詞 漢字+る → fallback（語る）',  () => engine.resolve(V('語る', { mood: 'participle', tense: 'present' })), null],
    ['現在分詞 漢字+る → fallback（座る）',  () => engine.resolve(V('座る', { mood: 'participle', tense: 'present' })), null],
    ['不定詞',      () => engine.resolve(V('救う', { mood: 'infinitive', tense: 'present' }))?.japanese, '救うこと'],
    ['直説法能動（無変換）', () => engine.resolve(V('語る', { mood: 'indicative', tense: 'present' })), null],

    // ── P1 回帰: 命令法（なよ・語よ 等の再発防止）
    ['する → せよ',              () => engine.resolve(V('する'))?.japanese, 'せよ'],
    ['結婚する → 結婚せよ',       () => engine.resolve(V('結婚する'))?.japanese, '結婚せよ'],
    ['なる（あ段五段）→ なれ',     () => engine.resolve(V('なる'))?.japanese, 'なれ'],
    ['〜である → 〜であれ',       () => engine.resolve(V('〜である'))?.japanese, '〜であれ'],
    ['求める（え段一段）→ 求めよ', () => engine.resolve(V('求める'))?.japanese, '求めよ'],
    ['食べる（え段一段）→ 食べよ', () => engine.resolve(V('食べる'))?.japanese, '食べよ'],
    ['用いる（い段一段）→ 用いよ', () => engine.resolve(V('用いる'))?.japanese, '用いよ'],
    ['見る（WL一段）→ 見よ',      () => engine.resolve(V('見る'))?.japanese, '見よ'],
    ['語る（漢字+る）→ fallback', () => engine.resolve(V('語る')), null],
    ['誇る（漢字+る）→ fallback', () => engine.resolve(V('誇る')), null],
    ['守る（漢字+る）→ fallback', () => engine.resolve(V('守る')), null],
    ['行く → 行け',              () => engine.resolve(V('行く'))?.japanese, '行け'],
    ['話す → 話せ',              () => engine.resolve(V('話す'))?.japanese, '話せ'],
    ['立つ → 立て',              () => engine.resolve(V('立つ'))?.japanese, '立て'],
    ['飲む → 飲め',              () => engine.resolve(V('飲む'))?.japanese, '飲め'],
    ['喜ぶ → 喜べ',              () => engine.resolve(V('喜ぶ'))?.japanese, '喜べ'],
    ['従う → 従え',              () => engine.resolve(V('従う'))?.japanese, '従え'],

    // ── 受動態（適用順: 受動 → 法）
    ['受動 直説法',           () => engine.resolve(V('呼ぶ', { mood: 'indicative', voice: 'passive' }))?.japanese, '呼ばれる'],
    ['受動 現在分詞',         () => engine.resolve(V('愛する', { mood: 'participle', tense: 'present', voice: 'passive' }))?.japanese, '愛されながら'],
    ['受動 命令法',           () => engine.resolve(V('惑わす', { mood: 'imperative', voice: 'passive' }))?.japanese, '惑わされよ'],

    // ── P3 回帰: である+受動ガード
    ['である+受動 → fallback', () => engine.resolve(V('十分である', { mood: 'indicative', voice: 'passive' })), null],

    // ── デポネントガード（答えられる 等の再発防止）
    //    Phase 4-A で ReadingLexicon（lemmaId キー・entry.deponent）へ移管。
    //    挙動は移管前と完全一致であること（凍結プロトコル）。
    ['ἀποκρίνομαι 受動 → fallback', () => engine.resolve(V('答える', { mood: 'indicative', voice: 'passive', lemma: 'ἀποκρίνομαι', lemmaId: 'grc:G611' })), null],
    ['γίνομαι 受動 → fallback',     () => engine.resolve(V('なる', { mood: 'indicative', voice: 'passive', lemma: 'γίνομαι', lemmaId: 'grc:G1096' })), null],
    ['γίνομαι 受動命令 → なれ',      () => engine.resolve(V('なる', { mood: 'imperative', voice: 'passive', lemma: 'γίνομαι', lemmaId: 'grc:G1096' }))?.japanese, 'なれ'],
    ['φοβέομαι 受動命令 → 恐れよ',   () => engine.resolve(V('恐れる', { mood: 'imperative', voice: 'passive', lemma: 'φοβέομαι', lemmaId: 'grc:G5399' }))?.japanese, '恐れよ'],
    ['真の受動は影響なし（γράφω）',  () => engine.resolve(V('書く', { mood: 'indicative', voice: 'passive', lemma: 'γράφω', lemmaId: 'grc:G1125' }))?.japanese, '書かれる'],
    ['lemmaId なし受動 → 変換あり',  () => engine.resolve(V('呼ぶ', { mood: 'indicative', voice: 'passive' }))?.japanese, '呼ばれる'],

    // ── Phase 4-A 劣化モード: lexicon 未注入 → 受動トークンは全変換なし（安全側）
    ['劣化モード: 受動 → fallback',      () => engineNoLex.resolve(V('書く', { mood: 'indicative', voice: 'passive', lemma: 'γράφω', lemmaId: 'grc:G1125' })), null],
    ['劣化モード: 受動命令も → fallback', () => engineNoLex.resolve(V('惑わす', { mood: 'imperative', voice: 'passive' })), null],
    ['劣化モード: 非受動は不変',         () => engineNoLex.resolve(V('行く'))?.japanese, '行け'],
    ['劣化モード: 格助詞は不変',         () => engineNoLex.resolve(N('神', 'genitive'))?.japanese, '神の'],
];

for (const [desc, fn, expect] of CASES) {
    let actual;
    try { actual = fn(); } catch (e) { actual = `EXCEPTION: ${e.message}`; }
    // ResolveResult の場合は .japanese を比較済み（fn 内で取り出す）。null 比較はそのまま。
    check(desc, actual, expect);
}
console.log(`Part 1: ${pass} passed, ${fail} failed`);

// ══════════════════════════════════════════════════════════════════
// Part 2: NT 全巻基準値照合
// ══════════════════════════════════════════════════════════════════
console.log('');
console.log('── Part 2: NT 全巻基準値照合（audit 実行中…） ──');

execFileSync('node', [path.join(__dirname, 're-phase1-audit.cjs')], { stdio: 'pipe' });
const audit = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'output', 're-phase1-audit.json'), 'utf8'));

check('total tokens（コーパス不変）', audit.total, PHASE1_BASELINE.totalTokens);
check('morph coverage（基準値一致）', audit.morph, PHASE1_BASELINE.morph);
for (const flag of PHASE1_BASELINE.zeroFlags) {
    check(`悪化ケース 0: ${flag}`, (audit.qualityFlags[flag] || []).length, 0);
}

// ══════════════════════════════════════════════════════════════════
console.log('');
if (fail === 0) {
    console.log(`ALL PASS (${pass} checks) — Phase 1 基準を維持`);
} else {
    console.log(`${fail} FAILED / ${pass} passed`);
    console.log('Morphology ロジックか bible_data が変わっています。');
    console.log('意図的な改善の場合: audit で悪化ケース 0 を確認し、PHASE1_BASELINE を更新してください。');
}
process.exit(fail ? 1 : 0);
