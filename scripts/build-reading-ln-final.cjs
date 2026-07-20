#!/usr/bin/env node
/**
 * build-reading-ln-final.cjs — LN→Gloss 最終辞書の生成（Phase 5-C3A）
 *
 * 実行: node scripts/build-reading-ln-final.cjs
 *       npm run build:ln-final
 * 入力: assets/data/reading-ln-gloss-data.js   （自動生成層 — 編集禁止）
 *       assets/data/reading-ln-curation.js     （人手キュレーション層）
 * 出力: assets/data/reading-ln-final-data.js   （上書き。手編集禁止）
 *
 * マージ規則（Phase 5-D で v2 化 — docs/reading-flow-gloss-policy.md §4）:
 *   出力は 3 区画:
 *     replace: mode='replace' の curation（Engine が jaWord 置換に使う唯一の区画）
 *     assist:  mode='assist' の curation（補助表示用・jaWord は置換しない・UI 未使用）
 *     auto:    自動生成層に curation をマージした参照辞書（Engine 未使用・監査用）
 *   - curation エントリは { gloss, mode, reason } 形式。mode は必須
 *     （欠落はスキップして警告 — 5-C3C 接続条件 1）
 *   - 削除は不可（auto の全 (lemmaId, ln) は必ず auto 区画に残る）
 *   - 不正な curation エントリ（gloss 欠落・空文字・mode 不正）はスキップして警告
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(PUBLIC, 'assets', 'data', 'reading-ln-final-data.js');

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

// ── マージ ─────────────────────────────────────────────────────────
// final: lemmaId → ln → gloss（可変コピーを作ってから curation を適用）
const final = {};
let autoPairs = 0;
for (const [lemmaId, byLn] of Object.entries(READING_LN_GLOSS)) {
    final[lemmaId] = {};
    for (const [ln, gloss] of Object.entries(byLn)) {
        final[lemmaId][ln] = gloss;
        autoPairs++;
    }
}

let overridden = 0, added = 0, skippedInvalid = 0;
let replaceCount = 0, assistCount = 0;
const replaceMap = {};   // Engine が使う唯一の区画
const assistMap  = {};   // 補助表示用（UI 未使用）
for (const [lemmaId, byLn] of Object.entries(READING_LN_CURATION || {})) {
    for (const [ln, entry] of Object.entries(byLn || {})) {
        const gloss = entry && typeof entry.gloss === 'string' ? entry.gloss.trim() : '';
        const mode  = entry && typeof entry.mode === 'string' ? entry.mode : '';
        if (!gloss) {
            console.warn(`  ⚠ 不正 curation（gloss 欠落）: ${lemmaId} ${ln} — スキップ`);
            skippedInvalid++;
            continue;
        }
        if (mode !== 'replace' && mode !== 'assist') {
            console.warn(`  ⚠ 不正 curation（mode 欠落/不正: '${mode}'）: ${lemmaId} ${ln} — スキップ`);
            skippedInvalid++;
            continue;
        }
        if (!final[lemmaId]) final[lemmaId] = {};
        if (final[lemmaId][ln] !== undefined) overridden++;
        else added++;
        final[lemmaId][ln] = gloss;
        const bucket = mode === 'replace' ? replaceMap : assistMap;
        if (!bucket[lemmaId]) bucket[lemmaId] = {};
        bucket[lemmaId][ln] = gloss;
        if (mode === 'replace') replaceCount++; else assistCount++;
    }
}

// ── 出力（決定的: lemmaId・ln をソート） ─────────────────────────────
const emit = (map, indent) => {
    const ids = Object.keys(map).sort();
    return ids.map(id => {
        const lns = Object.keys(map[id]).sort();
        const parts = lns.map(ln => `${JSON.stringify(ln)}: ${JSON.stringify(map[id][ln])}`);
        return `${indent}${JSON.stringify(id)}: Object.freeze({ ${parts.join(', ')} }),`;
    }).join('\n');
};
let finalPairs = 0;
for (const id of Object.keys(final)) finalPairs += Object.keys(final[id]).length;

const output = `/**
 * reading-ln-final-data.js — LN→Gloss 最終辞書（Phase 5-D 生成物 v2）
 *
 * ★ 生成ファイル — 手編集禁止。再生成: node scripts/build-reading-ln-final.cjs
 * ★ 人手修正は assets/data/reading-ln-curation.js で行い、再生成で反映する。
 *
 * 3 区画（docs/reading-flow-gloss-policy.md §3-4）:
 *   replace: Engine が jaWord 置換に使う唯一の区画（mode='replace' の curation）
 *   assist:  補助表示用（jaWord は置換しない。Phase 5-D 時点で UI 未使用）
 *   auto:    自動生成層 + curation の参照辞書（Engine 未使用・監査用）
 *
 * 生成時点: auto ${autoPairs} 対 / replace ${replaceCount} / assist ${assistCount}
 */

'use strict';

if (typeof window === 'undefined') { globalThis.window = globalThis; }

window.READING_LN_FINAL = Object.freeze({
    version: 2,
    replace: Object.freeze({
${emit(replaceMap, '        ')}
    }),
    assist: Object.freeze({
${emit(assistMap, '        ')}
    }),
    auto: Object.freeze({
${emit(final, '        ')}
    }),
});

// Node（監査・回帰テスト）用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { READING_LN_FINAL: window.READING_LN_FINAL };
}
`;

fs.writeFileSync(OUT, output);

console.log('build-reading-ln-final 完了');
console.log(`  自動生成（auto）対数 : ${autoPairs}`);
console.log(`  curation 上書き      : ${overridden}`);
console.log(`  curation 追加        : ${added}`);
console.log(`  replace / assist     : ${replaceCount} / ${assistCount}`);
console.log(`  不正エントリ skip    : ${skippedInvalid}`);
console.log(`  final(auto区画) 対数 : ${finalPairs}`);
console.log(`  出力                 : ${path.relative(ROOT, OUT)} (${(output.length / 1024).toFixed(0)} KB)`);
