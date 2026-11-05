#!/usr/bin/env node
/**
 * exec-adoption-reflection.cjs — Stage M-15 Adoption Execution。
 *
 * M-13 A分類のうち「固定点」（M-15 Data Layer Boundary Freeze）のみを bible_data.japanese へ反映する。
 *   反映対象: 代名詞/関係詞の数・性・人称（私→私たち・彼→彼ら・〜する者→〜するもの）＋ Syntax pronominal（この→これ）
 *   反映対象外: 動詞屈折（Data 層保持対象外・engine 動的屈折のまま）
 *
 * after は case 認識で格助詞を除いた「格中立の代表形」（engine が格を動的付与）。語内「もの」は保持。
 * 機械適用のみ（before 一致検証 → after 置換）。engine/Builder ロジックは変更しない。
 *
 * 引数 --apply で実際に書き込む。無指定は dry-run（diff/backup 生成 + 全検証のみ・bible_data 不変）。
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const APPLY = process.argv.includes('--apply');
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
function requireCjs(fp) {
    const code = fs.readFileSync(fp, 'utf8'); const mod = { exports: {} };
    const fn = vm.runInThisContext('(function(module,exports,require,__dirname,__filename){\n' + code + '\n})', { filename: fp });
    fn(mod, mod.exports, require, path.dirname(fp), fp); return mod.exports;
}
const { ReadingEngine } = requireCjs(path.join(PUBLIC, 'core', 'reading-engine.js'));
const { ReadingLexicon } = requireCjs(path.join(PUBLIC, 'core', 'reading-lexicon.js'));
const { readingLexiconData } = requireCjs(path.join(PUBLIC, 'assets', 'data', 'reading-lexicon-data.js'));
const { ReadingJapaneseBuilder } = requireCjs(path.join(PUBLIC, 'core', 'reading-japanese-builder.js'));

const engine = new ReadingEngine();
engine.setLexicon(new ReadingLexicon(readingLexiconData));
const NTROOT = path.join(PUBLIC, 'bible_data', 'nt');
const all = []; const byVerse = {}; const fileOf = {}; // tid -> file rel path
for (const b of fs.readdirSync(NTROOT)) {
    const bp = path.join(NTROOT, b); if (!fs.statSync(bp).isDirectory()) continue;
    for (const f of fs.readdirSync(bp).filter((x) => x.endsWith('.json'))) {
        const rel = path.join('nt', b, f);
        const arr = JSON.parse(fs.readFileSync(path.join(bp, f), 'utf8'));
        for (const t of arr) { all.push(t); fileOf[t.verseId] = rel; const vk = t.verseId.slice(0, 9); (byVerse[vk] = byVerse[vk] || []).push(t); }
    }
}
const builder = new ReadingJapaneseBuilder(engine);
builder.setCorpus(all);
const led = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts', 'output', 'reading-japanese-editorial-review-records.json'), 'utf8'));
const accepted = new Set(led.records.filter((r) => r.status === 'Accepted').map((r) => r.verseId));

const CASEP = { genitive: 'の', dative: 'に', accusative: 'を', vocative: 'よ' };
function stripCase(reading, tk) { const p = CASEP[(tk.case || '').toLowerCase()]; if (p && reading.endsWith(p)) return reading.slice(0, -p.length); return reading; }
function morphReason(before, after) {
    if ((before === '私' || before === 'あなた') && (after === '私たち' || after === 'あなたがた')) return 'plural-person';
    if (before === '彼') return 'pronoun-gender-number';
    if (before.indexOf('する者') >= 0 || before.indexOf('するもの') >= 0) return 'relative-gender';
    return 'pronoun-morph-form';
}

// ── diff 生成（固定点のみ: verb 除外・case 認識 after） ──
const diff = [];
for (const vk of Object.keys(byVerse)) {
    if (!accepted.has(vk)) continue;
    const built = builder.buildVerse(byVerse[vk]);
    if (!(built.morphAdoptedCount > 0 || built.syntaxAdoptedCount > 0)) continue;
    for (const c of built.tokens) {
        const a = c.morphAdopted || c.syntaxAdopted; if (!a) continue;
        if ((c.token.class || '') === 'verb') continue; // 動詞屈折は Data 層保持対象外
        const source = c.morphAdopted ? 'morph' : 'syntax';
        const after = stripCase(c.reading, c.token);
        // no-op 除外: after==before は「名詞＋格助詞」の擬似採用（子ども→子どもの 等）で真の語形変化でない
        if (after === c.token.japanese) continue;
        const reason = source === 'syntax' ? c.syntaxAdopted.reason : morphReason(c.token.japanese, after);
        diff.push({ verseId: vk, tokenId: c.token.verseId, before: c.token.japanese, after, source, reason, file: fileOf[c.token.verseId] });
    }
}
const nMorph = diff.filter((d) => d.source === 'morph').length, nSyntax = diff.filter((d) => d.source === 'syntax').length;
console.log(`[diff] ${diff.length} token (morph ${nMorph} / syntax ${nSyntax})  mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`);

// ── 検証1: before==現japanese / after有効 / source / reason ──
const byId = {}; for (const t of all) byId[t.verseId] = t;
let vBefore = 0, vAfter = 0, vSrc = 0, vReason = 0;
for (const d of diff) {
    if (byId[d.tokenId].japanese !== d.before) vBefore++;
    if (!d.after || d.after === d.before) vAfter++;
    if (d.source !== 'morph' && d.source !== 'syntax') vSrc++;
    if (!d.reason) vReason++;
}
console.log(`[verify] before不一致=${vBefore} after無効=${vAfter} source不正=${vSrc} reason欠落=${vReason}`);
if (vBefore || vAfter || vSrc || vReason) { console.error('ABORT: 検証1 失敗'); process.exit(1); }

// ── 検証2: 冪等（after を反映→再走査で再採用0） ──
const diffMap = {}; for (const d of diff) diffMap[d.tokenId] = d.after;
const all2 = all.map((t) => diffMap[t.verseId] !== undefined ? Object.assign({}, t, { japanese: diffMap[t.verseId] }) : t);
const byVerse2 = {}; for (const t of all2) { const vk = t.verseId.slice(0, 9); (byVerse2[vk] = byVerse2[vk] || []).push(t); }
const b2 = new ReadingJapaneseBuilder(engine); b2.setCorpus(all2);
const diffTids = new Set(diff.map((d) => d.tokenId));
let reAdopt = 0;
for (const vk of Object.keys(byVerse2)) { if (!accepted.has(vk)) continue; const built = b2.buildVerse(byVerse2[vk]); for (const c of built.tokens) { if (diffTids.has(c.token.verseId) && (c.morphAdopted || c.syntaxAdopted)) reAdopt++; } }
console.log(`[verify] 冪等 再採用=${reAdopt}（0が必須）`);
if (reAdopt) { console.error('ABORT: 検証2（冪等）失敗'); process.exit(1); }

// ── バックアップ（before値 + pre-hash + timestamp） ──
const preHash = crypto.createHash('sha256').update(all.map((t) => t.verseId + '\t' + t.japanese).sort().join('\n')).digest('hex');
const backup = { stage: 'M-15', generated: new Date().toISOString(), preHash, count: diff.length, records: diff.map((d) => ({ tokenId: d.tokenId, before: d.before, after: d.after, file: d.file })) };
const outDir = path.join(ROOT, 'scripts', 'output');
// ガード: 反映後に dry-run すると diff=0 になる。空の diff で正規成果物を上書きしない（rollback 保全）。
if (diff.length === 0) {
    console.log('[guard] diff=0（反映済/対象なし）: 既存 diff/backup を上書きしない。');
} else {
    fs.writeFileSync(path.join(outDir, 'reading-japanese-adoption-diff.json'), JSON.stringify({ meta: { stage: 'M-15', total: diff.length, morph: nMorph, syntax: nSyntax, generated: backup.generated }, diff }, null, 1), 'utf8');
    fs.writeFileSync(path.join(outDir, 'reading-japanese-adoption-backup.json'), JSON.stringify(backup, null, 1), 'utf8');
    console.log(`[backup] pre-hash=${preHash.slice(0, 16)}… / diff+backup 出力済`);
}

if (!APPLY) { console.log('DRY-RUN 完了（bible_data 不変）。--apply で反映。'); process.exit(0); }

// ── 反映（file 単位・CRLF fidelity ガード → japanese のみ置換） ──
const byFile = {}; for (const d of diff) (byFile[d.file] = byFile[d.file] || []).push(d);
let changedTokens = 0, changedFiles = 0;
for (const rel of Object.keys(byFile)) {
    const fp = path.join(PUBLIC, 'bible_data', rel);
    const raw = fs.readFileSync(fp, 'utf8');
    const parsed = JSON.parse(raw);
    const trailing = raw.slice(raw.lastIndexOf(']') + 1);
    const rebuilt = JSON.stringify(parsed, null, 2).replace(/\n/g, '\r\n') + trailing;
    if (rebuilt !== raw) { console.error('ABORT: fidelity 不一致 ' + rel); process.exit(1); }
    const want = {}; for (const d of byFile[rel]) want[d.tokenId] = d;
    for (const t of parsed) { const d = want[t.verseId]; if (d) { if (t.japanese !== d.before) { console.error('ABORT: before不一致(適用時) ' + d.tokenId); process.exit(1); } t.japanese = d.after; changedTokens++; } }
    const newRaw = JSON.stringify(parsed, null, 2).replace(/\n/g, '\r\n') + trailing;
    fs.writeFileSync(fp, newRaw, 'utf8');
    changedFiles++;
}
console.log(`[apply] 変更 token=${changedTokens} / file=${changedFiles}`);

// ── 反映後 post-hash ──
const all3 = [];
for (const b of fs.readdirSync(NTROOT)) { const bp = path.join(NTROOT, b); if (!fs.statSync(bp).isDirectory()) continue; for (const f of fs.readdirSync(bp).filter((x) => x.endsWith('.json'))) { for (const t of JSON.parse(fs.readFileSync(path.join(bp, f), 'utf8'))) all3.push(t); } }
const postHash = crypto.createHash('sha256').update(all3.map((t) => t.verseId + '\t' + t.japanese).sort().join('\n')).digest('hex');
backup.postHash = postHash;
fs.writeFileSync(path.join(outDir, 'reading-japanese-adoption-backup.json'), JSON.stringify(backup, null, 1), 'utf8');
console.log(`[apply] post-hash=${postHash.slice(0, 16)}…`);
console.log('APPLY 完了。');
