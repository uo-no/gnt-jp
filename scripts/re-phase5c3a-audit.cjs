#!/usr/bin/env node
/**
 * re-phase5c3a-audit.cjs — Phase 5-C3A: LN 最終辞書マージ監査
 *
 * 実行: node scripts/re-phase5c3a-audit.cjs
 * 出力: scripts/output/re-phase5c3a-audit.json
 *
 * 監査項目:
 *   - 自動件数 / 上書き件数 / 追加件数 / 未変更件数
 *   - キー欠落（curation エントリの gloss 欠落・空文字）
 *   - 重複（curation の gloss が auto と同一 = 無意味な上書き）
 *   - 不正 LN（LN コード形式 \\d+.\\d+[a-z]? に合わない curation キー）
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

const { READING_LN_GLOSS } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-gloss-data.js'));
const { READING_LN_CURATION } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-curation.js'));
const { READING_LN_FINAL } =
    requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js'));

const LN_RE = /^[0-9]+\.[0-9]+[a-z]?$/;

// ── 神学的定訳の保護台帳（docs/reading-flow-gloss-policy.md §6） ──────
// これらの (lemmaId, ln) が curation に追加された場合は警告する（5-C3C 条件 7）。
const PRESERVE_LEDGER = new Set([
    // σάρξ 肉
    'grc:G4561|26.7', 'grc:G4561|8.4', 'grc:G4561|8.63',
    // δικαιοσύνη 義
    'grc:G1343|88.13', 'grc:G1343|34.46',
    // χάρις 恵み
    'grc:G5485|88.66', 'grc:G5485|25.89',
    // πίστις 信仰
    'grc:G4102|31.85', 'grc:G4102|31.102', 'grc:G4102|31.104',
    // πνεῦμα 霊
    'grc:G4151|12.18', 'grc:G4151|12.33', 'grc:G4151|12.37',
    'grc:G4151|12.38', 'grc:G4151|12.39', 'grc:G4151|12.42', 'grc:G4151|26.9',
    // λόγος ことば（33.98 一般・33.1 ヨハネのロゴス）
    'grc:G3056|33.98', 'grc:G3056|33.1',
    // ζωή いのち / ἀγάπη 愛 / ἀλήθεια 真理
    'grc:G2222|23.88', 'grc:G26|25.43', 'grc:G225|72.2', 'grc:G225|70.4',
    // νόμος 律法
    'grc:G3551|33.55', 'grc:G3551|33.333', 'grc:G3551|33.56',
    'grc:G3551|33.58', 'grc:G3551|33.341',
]);

// ── 集計 ───────────────────────────────────────────────────────────
let autoPairs = 0;
for (const byLn of Object.values(READING_LN_GLOSS)) autoPairs += Object.keys(byLn).length;

let curationTotal = 0, overridden = 0, added = 0;
let modeReplace = 0, modeAssist = 0;
const missingGloss = [];   // キー欠落（gloss なし・空）
const missingMode = [];    // mode 欠落・不正（5-C3C 条件 1）
const preserveViolation = []; // 保護台帳違反（5-C3C 条件 7）
const redundant   = [];    // 重複（auto と同値の上書き）
const badLn       = [];    // 不正 LN 形式
for (const [lemmaId, byLn] of Object.entries(READING_LN_CURATION || {})) {
    for (const [ln, entry] of Object.entries(byLn || {})) {
        curationTotal++;
        if (!LN_RE.test(ln)) badLn.push(`${lemmaId} ${ln}`);
        if (PRESERVE_LEDGER.has(`${lemmaId}|${ln}`)) preserveViolation.push(`${lemmaId} ${ln}`);
        const gloss = entry && typeof entry.gloss === 'string' ? entry.gloss.trim() : '';
        const mode  = entry && typeof entry.mode === 'string' ? entry.mode : '';
        if (!gloss) { missingGloss.push(`${lemmaId} ${ln}`); continue; }
        if (mode !== 'replace' && mode !== 'assist') { missingMode.push(`${lemmaId} ${ln}`); continue; }
        if (mode === 'replace') modeReplace++; else modeAssist++;
        const autoGloss = READING_LN_GLOSS[lemmaId]?.[ln];
        if (autoGloss === undefined) added++;
        else if (autoGloss === gloss) { redundant.push(`${lemmaId} ${ln}`); overridden++; }
        else overridden++;
    }
}
const unchanged = autoPairs - overridden;

// ── 整合性: 削除禁止（auto の全対が final.auto に存在）・対数・freeze ──
// v2 形状: READING_LN_FINAL = { version, replace, assist, auto }
const FINAL_AUTO = READING_LN_FINAL.auto || {};
let finalPairs = 0, missingInFinal = 0, frozen = Object.isFrozen(READING_LN_FINAL);
for (const [lemmaId, byLn] of Object.entries(FINAL_AUTO)) {
    if (!Object.isFrozen(byLn)) frozen = false;
    finalPairs += Object.keys(byLn).length;
}
for (const [lemmaId, byLn] of Object.entries(READING_LN_GLOSS)) {
    for (const ln of Object.keys(byLn)) {
        if (FINAL_AUTO[lemmaId]?.[ln] === undefined) missingInFinal++;
    }
}
const expectedFinal = autoPairs + added;
// replace/assist 区画の件数照合
let finalReplace = 0, finalAssist = 0;
for (const byLn of Object.values(READING_LN_FINAL.replace || {})) finalReplace += Object.keys(byLn).length;
for (const byLn of Object.values(READING_LN_FINAL.assist || {}))  finalAssist  += Object.keys(byLn).length;

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

console.log('Phase 5-C3A LN 最終辞書マージ監査');
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
console.log(`不正 LN 形式             : ${report.checks.badLn.count}`);
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
