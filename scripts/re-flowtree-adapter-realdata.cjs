#!/usr/bin/env node
/**
 * re-flowtree-adapter-realdata.cjs — Flow Tree Adapter 実データ（SBLGNT Lowfat 全27書）検証
 *
 * 実行: node scripts/re-flowtree-adapter-realdata.cjs
 *
 * 対象: public/core/flow-tree-adapter.js（実装変更なし）
 * 入力: work/SBLGNT/lowfat/*.xml（読み取り専用）
 * 設計正典:
 *   docs/development/flow-tree-adapter-design.md
 *   docs/development/flow-tree-representation-schema.md
 *
 * ── 依存についての明記（新規 npm 依存は追加していない） ──────────────
 * 本プロジェクトには XML パーサ（DOMParser・xmldom 等）が一切存在しない
 * （package.json / package-lock.json / node_modules を確認済み）。
 * 「新規依存追加はこの段階では勝手に行わない」という制約のもと、npm
 * パッケージは追加せず、代わりに本ファイル内に Lowfat の実際の XML構造
 * （属性は複数行に整形されるが本文には CDATA・self-closing タグ・
 * シングルクォート属性が存在しないことを事前確認済み）に限定した、
 * 依存なしの最小 XML パーサを実装した。
 *
 * この選択のトレードオフ:
 *   - 利点: 新規依存を追加しない。Lowfat の実際の構造に対しては動作する。
 *   - 欠点: 汎用XMLパーサ（xmldom等）と異なり、任意のXML（名前空間、
 *     DTD、未知のエンティティ等）には対応していない。妥当性は「Lowfat
 *     全27書に対して構文エラーなく解析できるか」という本スクリプト自身
 *     の実行結果（区分A）によってのみ裏付けられる。
 *
 * 「追加が必要な依存」の報告（今回は追加しない）:
 *   - 候補: `@xmldom/xmldom`（DOM Level 2 準拠、依存ゼロ、MIT）
 *   - 追加による影響: package.json の dependencies 変更、node_modules 増加。
 *     本プロジェクトはこれまで npm 依存を持たない静的構成（CLAUDE.md §2
 *     「サーバー・ビルド工程を持たない静的構成」）であり、devDependencies
 *     としての追加であっても、この方針との整合性確認が別途必要。
 *   - 既存設計との整合性: `flow-tree-adapter.js` 自体は `DOMParser` の
 *     有無を問わない設計（Document/Element を直接受け取れる）にして
 *     あるため、将来 xmldom 等を追加しても Adapter 本体の変更は不要。
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const LOWFAT_DIR = path.join(ROOT, 'work', 'SBLGNT', 'lowfat');

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {} };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { buildFlowTree, convertElement } =
    requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));

// ══════════════════════════════════════════════════════════════════
// § 最小 XML パーサ（Lowfat 構造専用。汎用性は主張しない）
// ══════════════════════════════════════════════════════════════════

function decodeEntities(s) {
    return s
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&');
}

function makeElement(tagName, attrs) {
    const children = [];
    return {
        tagName,
        children,
        getAttribute(name) {
            return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
        },
        getElementsByTagName(tag) {
            const out = [];
            (function walk(node) {
                for (const c of node.children) {
                    if (c.tagName === tag) out.push(c);
                    walk(c);
                }
            })(this);
            return out;
        },
    };
}

const TAG_RE  = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/**
 * Lowfat XML 文字列を Element ツリーへ変換する。
 * 最上位要素（<book> 等）を1つ返す。
 */
function parseLowfat(xmlString) {
    let s = xmlString.replace(/<\?[\s\S]*?\?>/g, '');
    s = s.replace(/<!--[\s\S]*?-->/g, '');

    const root = makeElement('#root', {});
    const stack = [root];

    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(s)) !== null) {
        const closing = match[1];
        const tagName = match[2];
        const attrStr = match[3];
        const selfClose = match[4];

        if (closing) {
            if (stack.length > 1) stack.pop();
            continue;
        }

        const attrs = {};
        ATTR_RE.lastIndex = 0;
        let am;
        while ((am = ATTR_RE.exec(attrStr)) !== null) {
            const value = am[2] !== undefined ? am[2] : am[3];
            attrs[am[1]] = decodeEntities(value);
        }
        const el = makeElement(tagName, attrs);
        stack[stack.length - 1].children.push(el);
        if (!selfClose) stack.push(el);
    }
    return root.children[0] || null;
}

// ══════════════════════════════════════════════════════════════════
// § 独立カウント（パーサに依存しない生文字列ベースの照合用）
// ══════════════════════════════════════════════════════════════════
function rawOpenTagCount(xmlString, tag) {
    const re = new RegExp(`<${tag}(?:\\s|>)`, 'g');
    return (xmlString.match(re) || []).length;
}

// ══════════════════════════════════════════════════════════════════
// § 検証本体
// ══════════════════════════════════════════════════════════════════

const BOOKS = fs.readdirSync(LOWFAT_DIR).filter(f => /^\d\d-.*\.xml$/.test(f)).sort();

const summary = {
    pass: [], warning: [], fail: [],
};

let totalSentences = 0, totalParseFail = 0;
let totalRawTokens = 0, totalCapturedTokens = 0, totalMissingTokens = 0, totalExtraTokens = 0;
let totalRawWg = 0, totalFlowNonWord = 0;
let totalParentBroken = 0, totalOrderBroken = 0;
let totalUnknownClassOccurrences = 0;
const unknownClassValues = new Set();
let totalDeterministicMismatch = 0;
let totalBooksProcessed = 0;

console.log(`対象書: ${BOOKS.length} 冊\n`);

for (const bookFile of BOOKS) {
    const bookId = bookFile.replace(/^\d\d-/, '').replace(/\.xml$/, '');
    const xml = fs.readFileSync(path.join(LOWFAT_DIR, bookFile), 'utf8');

    let bookEl;
    try {
        bookEl = parseLowfat(xml);
    } catch (e) {
        summary.fail.push(`${bookId}: パース例外 (${e.message})`);
        continue;
    }
    if (!bookEl) {
        summary.fail.push(`${bookId}: ルート要素を取得できなかった`);
        continue;
    }

    const rawWgInFile = rawOpenTagCount(xml, 'wg');
    const rawWInFile  = rawOpenTagCount(xml, 'w');
    const parsedWg = bookEl.getElementsByTagName('wg').length;
    const parsedW  = bookEl.getElementsByTagName('w').length;
    if (parsedWg !== rawWgInFile || parsedW !== rawWInFile) {
        summary.fail.push(
            `${bookId}: パーサ自己整合性エラー — <wg> raw=${rawWgInFile}/parsed=${parsedWg}, `
            + `<w> raw=${rawWInFile}/parsed=${parsedW}`
        );
        continue;
    }

    const sentences = bookEl.getElementsByTagName('sentence');
    totalSentences += sentences.length;
    totalBooksProcessed++;

    let bookRawTokens = 0, bookCapturedTokens = 0;
    let bookRawWg = 0, bookFlowNonWord = 0;
    let bookParentBroken = 0, bookOrderBroken = 0;
    let bookParseFail = 0;
    let bookDeterministicMismatch = 0;

    sentences.forEach((sentenceEl, idx) => {
        const scopeId = `${bookId.toUpperCase()}#${String(idx).padStart(5, '0')}`;

        // A. 全sentence処理可能性
        let result;
        try {
            result = buildFlowTree(sentenceEl, { scopeId });
        } catch (e) {
            bookParseFail++;
            return;
        }
        if (result === null) {
            bookParseFail++;
            return;
        }

        // B. token完全性
        const rawRefs = new Set(sentenceEl.getElementsByTagName('w').map(w => w.getAttribute('ref')).filter(Boolean));
        const capturedRefs = new Set();
        (function collect(node) {
            if (node.type === 'word') capturedRefs.add(node.tokens[0]);
            node.children.forEach(collect);
        })(result.root);
        bookRawTokens += rawRefs.size;
        bookCapturedTokens += capturedRefs.size;
        for (const r of rawRefs) if (!capturedRefs.has(r)) totalMissingTokens++;
        for (const r of capturedRefs) if (!rawRefs.has(r)) totalExtraTokens++;

        // C. wg完全性
        const rawWgHere = sentenceEl.getElementsByTagName('wg').length;
        let flowNonWordHere = 0;
        (function countNonWord(node) {
            if (node.type !== 'word') flowNonWordHere++;
            node.children.forEach(countNonWord);
        })(result.root);
        bookRawWg += rawWgHere;
        bookFlowNonWord += flowNonWordHere;

        // D. parent整合性
        for (const id in result.nodesById) {
            const node = result.nodesById[id];
            if (node.parentId !== null && !result.nodesById[node.parentId]) bookParentBroken++;
            for (const child of node.children) {
                if (child.parentId !== node.id) bookParentBroken++;
            }
        }

        // E. structural order保持（子要素のXML出現順とchildren配列順の一致）
        (function checkOrder(el, node) {
            if (!node) return;
            const childEls = (el.children || []).filter(c => c.tagName === 'wg' || c.tagName === 'w');
            // node.children は Failure Mode で一部欠落しうるため、captured分だけ突き合わせる
            let ci = 0;
            for (const ce of childEls) {
                if (ci >= node.children.length) break;
                const wanted = ce.tagName === 'w' ? (ce.getAttribute('xml:id') || ce.getAttribute('ref')) : null;
                if (wanted !== null && node.children[ci].type === 'word' && node.children[ci].id !== wanted) {
                    bookOrderBroken++;
                }
                ci++;
            }
            for (let i = 0; i < childEls.length && i < node.children.length; i++) {
                checkOrder(childEls[i], node.children[i]);
            }
        })(sentenceEl.getElementsByTagName('wg')[0] || sentenceEl, result.root);

        // F. type mapping（未知class検出）
        for (const cls of result.unknownClasses) {
            unknownClassValues.add(cls);
            totalUnknownClassOccurrences++;
        }

        // G. deterministic（同一sentenceの二回処理一致）
        const nodesById2 = {};
        let result2;
        try {
            result2 = buildFlowTree(sentenceEl, { scopeId });
        } catch (e) {
            result2 = null;
        }
        if (!result2 || JSON.stringify(result2.root) !== JSON.stringify(result.root)) {
            bookDeterministicMismatch++;
        }
    });

    totalParseFail += bookParseFail;
    totalRawTokens += bookRawTokens;
    totalCapturedTokens += bookCapturedTokens;
    totalRawWg += bookRawWg;
    totalFlowNonWord += bookFlowNonWord;
    totalParentBroken += bookParentBroken;
    totalOrderBroken += bookOrderBroken;
    totalDeterministicMismatch += bookDeterministicMismatch;

    console.log(
        `${bookId.padEnd(16)} sentences=${String(sentences.length).padStart(5)} `
        + `parseFail=${bookParseFail} tokenLoss=${bookRawTokens - bookCapturedTokens} `
        + `wgDiff=${bookRawWg - bookFlowNonWord} parentBroken=${bookParentBroken} `
        + `orderBroken=${bookOrderBroken} deterministicMismatch=${bookDeterministicMismatch}`
    );
}

// ══════════════════════════════════════════════════════════════════
console.log('\n=== 集計 ===\n');
console.log(`処理した書: ${totalBooksProcessed} / ${BOOKS.length}`);
console.log(`総 sentence 数: ${totalSentences}`);
console.log(`parse失敗（buildFlowTree が null/例外）: ${totalParseFail}`);
console.log(`raw token 数: ${totalRawTokens} / 捕捉 token 数: ${totalCapturedTokens}`);
console.log(`token 欠落: ${totalMissingTokens} / token 過剰: ${totalExtraTokens}`);
console.log(`raw wg 数: ${totalRawWg} / Flow 非word node 数: ${totalFlowNonWord}`);
console.log(`parent 整合性違反: ${totalParentBroken}`);
console.log(`structural order 違反: ${totalOrderBroken}`);
console.log(`未知 class 出現回数: ${totalUnknownClassOccurrences}（種類: ${[...unknownClassValues].join(', ') || 'なし'}）`);
console.log(`deterministic 不一致: ${totalDeterministicMismatch}`);

console.log('\n=== PASS / WARNING / FAIL 分離 ===\n');

console.log('--- PASS ---');
if (totalParseFail === 0) console.log(`PASS  A. 全 sentence 処理可能性（parse失敗0, 解析成功 ${totalSentences} sentence）`);
if (totalMissingTokens === 0 && totalExtraTokens === 0) console.log('PASS  B. token完全性（欠落0・過剰0）');
if (totalRawWg === totalFlowNonWord) console.log('PASS  C. wg完全性（raw wg数 = Flow 非word node数）');
if (totalParentBroken === 0) console.log('PASS  D. parent整合性（違反0）');
if (totalOrderBroken === 0) console.log('PASS  E. structural order保持（違反0）');
if (totalDeterministicMismatch === 0) console.log('PASS  G. deterministic（不一致0）');

console.log('\n--- WARNING（Failure Mode 発動の分離報告） ---');
if (totalUnknownClassOccurrences > 0) {
    console.log(`WARNING  F. 未知class検出: ${totalUnknownClassOccurrences} 件（種類: ${[...unknownClassValues].join(', ')}）`);
    console.log('         → Failure Mode が発動し、該当ノードは構造識別不能として破棄されている（token欠落として計上済み）');
} else {
    console.log('（未知class検出なし）');
}

console.log('\n--- FAIL ---');
let hasFail = false;
if (totalParseFail > 0) { console.log(`FAIL  A. parse失敗 ${totalParseFail} 件`); hasFail = true; }
if (totalMissingTokens > 0) { console.log(`FAIL  B. token欠落 ${totalMissingTokens} 件`); hasFail = true; }
if (totalExtraTokens > 0) { console.log(`FAIL  B. token過剰 ${totalExtraTokens} 件`); hasFail = true; }
if (totalRawWg !== totalFlowNonWord) { console.log(`FAIL  C. wg数不一致 raw=${totalRawWg} flow=${totalFlowNonWord}`); hasFail = true; }
if (totalParentBroken > 0) { console.log(`FAIL  D. parent破綻 ${totalParentBroken} 件`); hasFail = true; }
if (totalOrderBroken > 0) { console.log(`FAIL  E. children順序変更 ${totalOrderBroken} 件`); hasFail = true; }
if (totalDeterministicMismatch > 0) { console.log(`FAIL  G. deterministic不一致 ${totalDeterministicMismatch} 件`); hasFail = true; }
if (summary.fail.length > 0) { summary.fail.forEach(m => console.log('FAIL  ' + m)); hasFail = true; }
if (!hasFail) console.log('（FAILなし）');

console.log('');
console.log(hasFail ? 'FAIL項目あり（詳細は上記参照）' : `ALL PASS（未知class由来のWARNING ${totalUnknownClassOccurrences}件を除く）`);
process.exit(hasFail ? 1 : 0);
