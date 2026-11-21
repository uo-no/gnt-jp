#!/usr/bin/env node
/**
 * re-phase5c3a-audit.cjs — Phase 5-C3A: センス最終辞書マージ監査
 *
 * 実行: node scripts/re-phase5c3a-audit.cjs
 * 出力: scripts/output/re-phase5c3a-audit.json
 *
 * 監査項目:
 *   - 自動件数 / 上書き件数 / 追加件数 / 未変更件数
 *   - キー欠落（curation エントリの gloss 欠落・空文字）
 *   - 重複（curation の gloss が auto と同一 = 無意味な上書き）
 *   - 不正キー（内部センスキー形式 s<n> に合わない curation キー）
 *   - 整合性: auto の全対が final に存在（削除禁止の検証）/ freeze 確認
 *
 * ReadingEngine には接続しない（Phase 5-C3B まで）。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { READING_SENSE_GLOSS } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-gloss-data.js'));
const { READING_SENSE_CURATION } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-curation.js'));
const { READING_SENSE_FINAL } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));

const LN_RE = /^s[1-9][0-9]*$/;   // 内部センスキー（scripts/migrate-semantic-keys.cjs）

// ── 神学的定訳の保護台帳（docs/reading-flow-gloss-policy.md §6） ──────
// これらの (lemmaId, sense) が curation に追加された場合は警告する（5-C3C 条件 7）。
// キーは不透明な内部センスキー（#196 で注釈コードから一括置換）。
const PRESERVE_LEDGER = new Set([
    // σάρξ 肉
    'grc:G4561|s1185', 'grc:G4561|s431', 'grc:G4561|s4760',
    // δικαιοσύνη 義
    'grc:G1343|s6358', 'grc:G1343|s17',
    // χάρις 恵み
    'grc:G5485|s715', 'grc:G5485|s8768',
    // πίστις 信仰
    'grc:G4102|s5050', 'grc:G4102|s6026', 'grc:G4102|s8683',
    // πνεῦμα 霊
    'grc:G4151|s417', 'grc:G4151|s5159', 'grc:G4151|s6389',
    'grc:G4151|s418', 'grc:G4151|s4884', 'grc:G4151|s2513', 'grc:G4151|s7436',
    // λόγος ことば（一般・ヨハネのロゴス）
    'grc:G3056|s3185', 'grc:G3056|s1928',
    // ζωή いのち / ἀγάπη 愛 / ἀλήθεια 真理
    'grc:G2222|s3052', 'grc:G26|s6022', 'grc:G225|s3884', 'grc:G225|s2247',
    // νόμος 律法
    'grc:G3551|s4791', 'grc:G3551|s3762', 'grc:G3551|s3655',
    'grc:G3551|s5103', 'grc:G3551|s3277',
]);

// ── 集計 ───────────────────────────────────────────────────────────
let autoPairs = 0;
for (const byLn of Object.values(READING_SENSE_GLOSS)) autoPairs += Object.keys(byLn).length;

let curationTotal = 0, overridden = 0, added = 0;
let modeReplace = 0, modeAssist = 0;
const missingGloss = [];   // キー欠落（gloss なし・空）
const missingMode = [];    // mode 欠落・不正（5-C3C 条件 1）
const preserveViolation = []; // 保護台帳違反（5-C3C 条件 7）
const redundant   = [];    // 重複（auto と同値の上書き）
const badLn       = [];    // 不正キー形式
for (const [lemmaId, byLn] of Object.entries(READING_SENSE_CURATION || {})) {
    for (const [ln, entry] of Object.entries(byLn || {})) {
        curationTotal++;
        if (!LN_RE.test(ln)) badLn.push(`${lemmaId} ${ln}`);
        if (PRESERVE_LEDGER.has(`${lemmaId}|${ln}`)) preserveViolation.push(`${lemmaId} ${ln}`);
        const gloss = entry && typeof entry.gloss === 'string' ? entry.gloss.trim() : '';
        const mode  = entry && typeof entry.mode === 'string' ? entry.mode : '';
        if (!gloss) { missingGloss.push(`${lemmaId} ${ln}`); continue; }
        if (mode !== 'replace' && mode !== 'assist') { missingMode.push(`${lemmaId} ${ln}`); continue; }
        if (mode === 'replace') modeReplace++; else modeAssist++;
        const autoGloss = READING_SENSE_GLOSS[lemmaId]?.[ln];
        if (autoGloss === undefined) added++;
        else if (autoGloss === gloss) { redundant.push(`${lemmaId} ${ln}`); overridden++; }
        else overridden++;
    }
}
const unchanged = autoPairs - overridden;

// ── 整合性: 削除禁止（auto の全対が final.auto に存在）・対数・freeze ──
// v2 形状: READING_SENSE_FINAL = { version, replace, assist, auto }
const FINAL_AUTO = READING_SENSE_FINAL.auto || {};
let finalPairs = 0, missingInFinal = 0, frozen = Object.isFrozen(READING_SENSE_FINAL);
for (const [lemmaId, byLn] of Object.entries(FINAL_AUTO)) {
    if (!Object.isFrozen(byLn)) frozen = false;
    finalPairs += Object.keys(byLn).length;
}
for (const [lemmaId, byLn] of Object.entries(READING_SENSE_GLOSS)) {
    for (const ln of Object.keys(byLn)) {
        if (FINAL_AUTO[lemmaId]?.[ln] === undefined) missingInFinal++;
    }
}
const expectedFinal = autoPairs + added;
// replace/assist 区画の件数照合
let finalReplace = 0, finalAssist = 0;
for (const byLn of Object.values(READING_SENSE_FINAL.replace || {})) finalReplace += Object.keys(byLn).length;
for (const byLn of Object.values(READING_SENSE_FINAL.assist || {}))  finalAssist  += Object.keys(byLn).length;

// ── レポート ────────────────────────────────────────────────────────
const report = {
    generated: new Date().toISOString().slice(0, 10),
    auto:        autoPairs,
    curation:    curationTotal,
    overridden,
    added,
    unchanged,
    finalPairs,
    modes: { replace: modeReplace, assist: modeAssist,
             finalReplace, finalAssist,
             modeCountConsistent: finalReplace === modeReplace && finalAssist === modeAssist },
    checks: {
        missingGloss:  { count: missingGloss.length, items: missingGloss.slice(0, 20) },
        missingMode:   { count: missingMode.length,  items: missingMode.slice(0, 20) },
        preserveViolation: { count: preserveViolation.length, items: preserveViolation.slice(0, 20) },
        redundant:     { count: redundant.length,    items: redundant.slice(0, 20) },
        badLn:         { count: badLn.length,        items: badLn.slice(0, 20) },
        deletedFromAuto: missingInFinal,             // 0 でなければ削除禁止違反
        finalCountConsistent: finalPairs === expectedFinal,
        frozen,
    },
};
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 're-phase5c3a-audit.json'),
    JSON.stringify(report, null, 2));

console.log('Phase 5-C3A センス最終辞書マージ監査');
console.log('='.repeat(60));
console.log(`自動件数（auto 対数）    : ${report.auto}`);
console.log(`curation エントリ        : ${report.curation}`);
console.log(`上書き件数               : ${report.overridden}`);
console.log(`追加件数                 : ${report.added}`);
console.log(`未変更件数               : ${report.unchanged}`);
console.log(`final 対数               : ${report.finalPairs}（期待値 ${expectedFinal}: ${report.checks.finalCountConsistent ? '一致' : '不一致 ✗'}）`);
console.log('');
console.log(`mode 内訳                : replace ${report.modes.replace} / assist ${report.modes.assist}（final 区画と一致: ${report.modes.modeCountConsistent ? 'OK' : 'NG'}）`);
console.log(`キー欠落（gloss なし）   : ${report.checks.missingGloss.count}`);
console.log(`mode 欠落/不正           : ${report.checks.missingMode.count}`);
console.log(`保護台帳違反             : ${report.checks.preserveViolation.count}`);
console.log(`重複（auto と同値）      : ${report.checks.redundant.count}`);
console.log(`不正キー形式             : ${report.checks.badLn.count}`);
console.log(`削除禁止違反             : ${report.checks.deletedFromAuto}`);
console.log(`freeze                   : ${report.checks.frozen ? 'OK' : 'NG'}`);
console.log('');
console.log('詳細: scripts/output/re-phase5c3a-audit.json');

const ok = report.checks.missingGloss.count === 0 &&
           report.checks.missingMode.count === 0 &&
           report.checks.preserveViolation.count === 0 &&
           report.checks.badLn.count === 0 &&
           report.checks.deletedFromAuto === 0 &&
           report.checks.finalCountConsistent &&
           report.modes.modeCountConsistent &&
           report.checks.frozen;
console.log(ok ? 'AUDIT PASS' : 'AUDIT FAIL');
process.exit(ok ? 0 : 1);
