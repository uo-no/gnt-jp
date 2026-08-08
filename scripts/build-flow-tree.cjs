#!/usr/bin/env node
/**
 * build-flow-tree.cjs — VR-6-B: Flow Tree Runtime Asset Builder
 *
 * 目的:
 *   lowfat XML（work/SBLGNT/lowfat/*.xml）を、既存の唯一の変換器
 *   core/flow-tree-adapter.js（buildFlowTree）で Flow Tree Representation へ変換し、
 *   ブラウザ runtime が verse/token 単位で取得できる chapter 単位 JSON 資産として保存する。
 *   出力: public/assets/data/flow-tree/{BOOK}/{chapter}.json
 *
 * 設計境界（厳守）:
 *   - tree 構築は flow-tree-adapter.js が唯一の変換器。ここでは requireCjs で再利用し、
 *     convertElement/buildFlowTree 相当を再実装・コピーしない。
 *   - XML → DOM は Node build 専用依存 @xmldom/xmldom の DOMParser で行い、adapter へ
 *     Document/Element を注入する（adapter は DOM 非依存設計のまま無変更）。新規 XML parser は書かない。
 *   - Representation schema（flow-tree-representation-schema.md）は SSOT。node 形は adapter 出力
 *     そのまま（id / parentId / type / tokens / children）。新しい node schema を発明しない。
 *   - L-0: tree から取得できる構造（parent / children / token参照 / node type / 階層）のみ保存。
 *     referent / antecedent / 主語補完 / semantic role / role / rule / confidence は保存しない
 *     （adapter がそもそも生成しない）。
 *
 * 保存単位:
 *   chapter 単位 JSON。1 chapter file は自己完結:
 *     { book, chapter, sentences: [ <adapter root node> ... ], refIndex: { "<ref>": <index> } }
 *   - sentences[i] は adapter の buildFlowTree().root（入れ子ツリー＝schema の Representation そのもの）。
 *     nodesById は root から一意に導出可能な索引のため保存しない（runtime loader が root を walk して
 *     再構築し {root, nodesById} を neighborhood-view.buildNeighborhoodView へ渡す。本フェーズは UI 非対象）。
 *   - refIndex: 当該 chapter に属する token ref → sentences[] 内 index。runtime が選択 token の ref から
 *     所属 sentence tree を引くための索引。
 *   - Greek の文は verse/chapter 境界をまたぐことがあるため、sentence は「その token がかかる各 chapter」の
 *     file へ格納し、各 file の refIndex はその chapter の token のみを覆う（file 間参照を作らない）。
 *
 * Failure Mode（検出したら部分生成物を残さず exit 1）:
 *   parseFail / tokenLoss / parentBroken / duplicateRef / refFormat mismatch。
 *   baseline（re-flowtree-adapter-realdata.cjs）: NT27書 8010 sent parseFail=0 tokenLoss=0 parentBroken=0。
 *
 * 実行: node scripts/build-flow-tree.cjs   /   npm run build:flow-tree
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const crypto = require('crypto');
const { DOMParser } = require('@xmldom/xmldom');

const ROOT       = path.resolve(__dirname, '..');
const PUBLIC     = path.join(ROOT, 'public');
const LOWFAT_DIR = path.join(ROOT, 'work', 'SBLGNT', 'lowfat');
const OUT_DIR    = path.join(PUBLIC, 'assets', 'data', 'flow-tree');

/* ── 既存 adapter を唯一の変換器として読み込む（コピーしない） ── */
function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}
const { buildFlowTree } = requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));

/* ── token ref の形式（"BOOK C:V!idx"）。CSS link 等の非 token ref は弾く ── */
const REF_RE = /^(\S+)\s+(\d+):(\d+)!(\d+)$/;
function parseRef(ref) {
    const m = REF_RE.exec(ref || '');
    if (!m) return null;
    return { book: m[1], chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10), idx: parseInt(m[4], 10) };
}

/* ── tree を walk して word node の token ref を文書順で収集 ── */
function collectWordRefs(root) {
    const refs = [];
    (function walk(n) {
        if (n.type === 'word' && Array.isArray(n.tokens) && n.tokens.length) refs.push(n.tokens[0]);
        (n.children || []).forEach(walk);
    })(root);
    return refs;
}

/* ── parent 整合性: 各 node の parentId が nodesById に存在し、親の children に含まれること ── */
function parentBrokenCount(nodesById) {
    let broken = 0;
    for (const id in nodesById) {
        const node = nodesById[id];
        if (node.parentId == null) continue;               // root
        const parent = nodesById[node.parentId];
        if (!parent) { broken++; continue; }
        if (!Array.isArray(parent.children) || parent.children.indexOf(node) === -1) broken++;
    }
    return broken;
}

/* ── 決定的 JSON 直列化（key 順は挿入順で安定） ── */
function stableStringify(obj) {
    return JSON.stringify(obj, null, 0);
}

// ══════════════════════════════════════════════════════════════════
// build
// ══════════════════════════════════════════════════════════════════
const BOOK_FILES = fs.readdirSync(LOWFAT_DIR).filter(f => /^\d\d-.*\.xml$/.test(f)).sort();

const counters = {
    books: 0, sentences: 0, tokens: 0,
    parseFail: 0, tokenLoss: 0, parentBroken: 0, duplicateRef: 0, refMismatch: 0,
    unknownClass: 0,
};
const failures = [];
const unknownClassValues = new Set();

/* chapters[BOOK][CH] = { book, chapter, sentences:[root...], refIndex:{ref:index}, _seen:Set } */
const chapters = {};
function chapterBucket(book, ch) {
    chapters[book] = chapters[book] || {};
    if (!chapters[book][ch]) chapters[book][ch] = { book, chapter: ch, sentences: [], refIndex: {}, _seen: new Set() };
    return chapters[book][ch];
}

const parser = new DOMParser({
    // XML パースエラーは Failure Mode として拾えるよう握りつぶさず記録
    onError: (level, msg) => { if (level === 'fatalError' || level === 'error') failures.push(`xml ${level}: ${msg}`); },
});

for (const bookFile of BOOK_FILES) {
    const stem   = bookFile.replace(/^\d\d-/, '').replace(/\.xml$/, '');
    const xml    = fs.readFileSync(path.join(LOWFAT_DIR, bookFile), 'utf8');

    let doc;
    try {
        doc = parser.parseFromString(xml, 'text/xml');
    } catch (e) {
        failures.push(`${stem}: DOMParser 例外 (${e.message})`);
        continue;
    }
    if (!doc || !doc.documentElement) { failures.push(`${stem}: documentElement なし`); continue; }

    const sentences = Array.from(doc.getElementsByTagName('sentence'));
    counters.books++;

    sentences.forEach((sentenceEl, idx) => {
        const scopeId = `${stem.toUpperCase()}#${String(idx).padStart(5, '0')}`;

        // 唯一の変換器（adapter）で tree 構築
        let result;
        try {
            result = buildFlowTree(sentenceEl, { scopeId });
        } catch (e) {
            counters.parseFail++; failures.push(`${scopeId}: buildFlowTree 例外 (${e.message})`); return;
        }
        if (result === null) { counters.parseFail++; failures.push(`${scopeId}: buildFlowTree null (Failure Mode)`); return; }

        if (Array.isArray(result.unknownClasses) && result.unknownClasses.length) {
            counters.unknownClass += result.unknownClasses.length;
            result.unknownClasses.forEach(c => unknownClassValues.add(c));
        }

        // token 完全性: raw（sentence 内 <w> の token ref）と captured（tree word node）を照合
        const rawRefs = new Set(
            Array.from(sentenceEl.getElementsByTagName('w'))
                .map(w => w.getAttribute('ref'))
                .filter(r => REF_RE.test(r || ''))
        );
        const capturedList = collectWordRefs(result.root);
        const capturedSet  = new Set(capturedList);

        // duplicate ref（同一 ref が tree 内 word node に複数回）
        if (capturedList.length !== capturedSet.size) {
            counters.duplicateRef += (capturedList.length - capturedSet.size);
            failures.push(`${scopeId}: duplicate token ref`);
        }
        // token loss（raw にあるが captured に無い）
        let lost = 0;
        for (const r of rawRefs) if (!capturedSet.has(r)) lost++;
        if (lost) { counters.tokenLoss += lost; failures.push(`${scopeId}: token loss ${lost}`); }

        // parent 整合性
        const pb = parentBrokenCount(result.nodesById);
        if (pb) { counters.parentBroken += pb; failures.push(`${scopeId}: parent broken ${pb}`); }

        counters.sentences++;
        counters.tokens += capturedSet.size;

        // chapter 割り当て（token がかかる各 chapter へ root を格納・refIndex を張る）
        const perChapterRefs = {};   // "BOOK|CH" -> [refs]
        for (const ref of capturedList) {
            const p = parseRef(ref);
            if (!p) { counters.refMismatch++; failures.push(`${scopeId}: ref 形式不一致 "${ref}"`); continue; }
            const key = `${p.book}|${p.chapter}`;
            (perChapterRefs[key] = perChapterRefs[key] || []).push(ref);
        }
        for (const key in perChapterRefs) {
            const [book, chStr] = key.split('|');
            const ch = parseInt(chStr, 10);
            const bucket = chapterBucket(book, ch);
            if (!bucket._seen.has(result.root)) {
                bucket._seen.add(result.root);
                bucket.sentences.push(result.root);
            }
            const sIndex = bucket.sentences.indexOf(result.root);
            for (const ref of perChapterRefs[key]) bucket.refIndex[ref] = sIndex;
        }
    });
}

// ══════════════════════════════════════════════════════════════════
// 検証（部分生成物を残さないため、書き込み前に全 FAIL を確定）
// ══════════════════════════════════════════════════════════════════
const hardFail =
    counters.parseFail > 0 || counters.tokenLoss > 0 || counters.parentBroken > 0 ||
    counters.duplicateRef > 0 || counters.refMismatch > 0 || failures.length > 0;

// 決定的出力ハッシュ（同一入力→同一出力の証跡）
const outputs = [];   // { relPath, json }
const bookKeys = Object.keys(chapters).sort();
for (const book of bookKeys) {
    const chKeys = Object.keys(chapters[book]).map(Number).sort((a, b) => a - b);
    for (const ch of chKeys) {
        const b = chapters[book][ch];
        const json = stableStringify({ book: b.book, chapter: b.chapter, sentences: b.sentences, refIndex: b.refIndex });
        outputs.push({ relPath: path.join(book, `${ch}.json`), json });
    }
}
const digest = crypto.createHash('sha256')
    .update(outputs.map(o => o.relPath + '\0' + o.json).join('\n'))
    .digest('hex');

console.log('── VR-6-B: Flow Tree Runtime Asset Builder ──\n');
console.log(`books processed : ${counters.books}`);
console.log(`sentences       : ${counters.sentences}`);
console.log(`tokens          : ${counters.tokens}`);
console.log(`output files    : ${outputs.length}`);
console.log(`parseFail       : ${counters.parseFail}`);
console.log(`tokenLoss       : ${counters.tokenLoss}`);
console.log(`parentBroken    : ${counters.parentBroken}`);
console.log(`duplicateRef    : ${counters.duplicateRef}`);
console.log(`refMismatch     : ${counters.refMismatch}`);
console.log(`unknownClass    : ${counters.unknownClass}${unknownClassValues.size ? ' (' + [...unknownClassValues].join(',') + ')' : ''}`);
console.log(`output digest   : ${digest}`);

if (hardFail) {
    console.log('\nFAIL: 完全性違反を検出。部分生成物は書き込まない。');
    failures.slice(0, 20).forEach(f => console.log('  FAIL ' + f));
    if (failures.length > 20) console.log(`  … 他 ${failures.length - 20} 件`);
    process.exit(1);
}

// dry-run（検証・ハッシュのみ、書き込まない）
if (process.argv.includes('--dry')) {
    console.log('\n--dry: 書き込みなし（検証・digest のみ）');
    process.exit(0);
}

// 書き込み（検証通過後のみ）。既存 flow-tree 出力を一旦クリアして stale を残さない。
fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const o of outputs) {
    const abs = path.join(OUT_DIR, o.relPath);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, o.json);
}
console.log(`\nOK: ${outputs.length} files written under public/assets/data/flow-tree/`);
process.exit(0);
