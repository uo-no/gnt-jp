#!/usr/bin/env node
/**
 * re-neighborhoodview-realdata.cjs — NeighborhoodView 実データ全27書監査（FLOW-TREE-11-B）
 *
 * 実行: node scripts/re-neighborhoodview-realdata.cjs
 *
 * 対象: public/core/neighborhood-view.js の buildNeighborhoodView() のみ。
 * 前提（今回は再検証しない。FLOW-TREE-12 = scripts/re-flowtree-adapter-realdata.cjs
 * により全27書で実測済みとして扱う）:
 *   Adapter structural completeness / token完全性 / wg完全性 / parent整合性 /
 *   structural order / deterministic / class→type mapping
 *
 * 検証経路:
 *   Lowfat XML → flow-tree-adapter.js（buildFlowTree） → buildNeighborhoodView()
 *     → NeighborhoodView Model
 *
 * 対象外: XML parser自体の検証・Adapter内部ロジック・Renderer・HTML生成・
 *         label生成・Display Policy・UI表示。
 *
 * 規模: サンプリング禁止。全27書・8,010 sentence・137,741 token 全件を
 *       focus として buildNeighborhoodView() を実行する（G. deterministic のみ、
 *       件数を明示したサンプリングを許可）。
 *
 * ── 依存についての明記 ──────────────────────────────────────────
 * 本ファイルは Lowfat 専用の最小 XML パーサ（scripts/re-flowtree-adapter-realdata.cjs
 * と同一方式）をこのファイル内に再実装する。新規 npm 依存は追加していない。
 * パーサ自体の妥当性は本監査の対象外（FLOW-TREE-12 で既に確認済み）。
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

const { buildFlowTree } = requireCjs(path.join(PUBLIC, 'core', 'flow-tree-adapter.js'));
const { buildNeighborhoodView } = requireCjs(path.join(PUBLIC, 'core', 'neighborhood-view.js'));

// ══════════════════════════════════════════════════════════════════
// § 最小 XML パーサ（re-flowtree-adapter-realdata.cjs と同一方式。対象外＝再検証しない）
// ══════════════════════════════════════════════════════════════════

function decodeEntities(s) {
    return s
        .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function makeElement(tagName, attrs) {
    const children = [];
    return {
        tagName, children,
        getAttribute(name) { return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null; },
        getElementsByTagName(tag) {
            const out = [];
            (function walk(node) { for (const c of node.children) { if (c.tagName === tag) out.push(c); walk(c); } })(this);
            return out;
        },
    };
}
const TAG_RE  = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;
const ATTR_RE = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
function parseLowfat(xmlString) {
    let s = xmlString.replace(/<\?[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '');
    const root = makeElement('#root', {});
    const stack = [root];
    let match;
    TAG_RE.lastIndex = 0;
    while ((match = TAG_RE.exec(s)) !== null) {
        const [, closing, tagName, attrStr, selfClose] = match;
        if (closing) { if (stack.length > 1) stack.pop(); continue; }
        const attrs = {};
        ATTR_RE.lastIndex = 0;
        let am;
        while ((am = ATTR_RE.exec(attrStr)) !== null) {
            attrs[am[1]] = decodeEntities(am[2] !== undefined ? am[2] : am[3]);
        }
        const el = makeElement(tagName, attrs);
        stack[stack.length - 1].children.push(el);
        if (!selfClose) stack.push(el);
    }
    return root.children[0] || null;
}

// ══════════════════════════════════════════════════════════════════
// § 監査ロジック
// ══════════════════════════════════════════════════════════════════

const ALLOWED_KEYS = ['children', 'expanded', 'isFocus', 'nodeId', 'tokens'].sort().join(',');

function collectFocusNodes(list) {
    const out = [];
    (function walk(node) {
        if (node.isFocus) out.push(node);
        node.children.forEach(walk);
    })({ children: list });
    return out;
}
/* 葉ノード（children.length===0。Adapter上は type==='word'）の tokens のみを
 * 集計する。非葉ノードの tokens は「配下の全 word ref の合算」を Adapter が
 * 既に保持している値（flow-tree-adapter.js の convertElement 内、
 * `tokens = words.map(w => w.getAttribute('ref'))`）であり、これは各子孫
 * word の tokens と重複する集合である。そのため非葉ノードまで合算すると
 * 二重カウントになる。「D. View構造完全性」が検証したいのは葉レベルでの
 * token の欠落・重複・過剰であり、その比較対象は葉のみの集合でなければならない。 */
function flattenLeafTokens(node, out) {
    if (!node.children || node.children.length === 0) {
        (node.tokens || []).forEach((t) => out.push(t));
    } else {
        node.children.forEach((c) => flattenLeafTokens(c, out));
    }
}
function maxDepth(node) {
    if (!node.children || node.children.length === 0) return 1;
    return 1 + Math.max(...node.children.map(maxDepth));
}
function isAncestorOfFocus(node) {
    if (node.isFocus) return true;
    return (node.children || []).some(isAncestorOfFocus);
}

const BOOKS = fs.readdirSync(LOWFAT_DIR).filter((f) => /^\d\d-.*\.xml$/.test(f)).sort();

let totalFocusRun = 0;
let totalSentencesProcessed = 0;
let adapterBuildFailures = 0; // 前提違反（0を期待。FLOW-TREE-12前提のズレ検知用）
const uncaughtExceptions = [];
let rangeErrorCount = 0;

let bFail = 0; const bFailExamples = [];
let cFail = 0; const cFailExamples = [];
let dFail = 0; const dFailExamples = [];
let eFail = 0; const eFailExamples = [];
let fFail = 0; const fFailExamples = [];
let hFail = 0; const hFailExamples = [];
let kFail = 0; const kFailExamples = [];

let nullCountI_i = 0;
let nullCountI_ii = 0;
const nullExamplesII = [];

let maxParentChainDepth = 0;
let maxConstituentTreeDepth = 0;

let detChecked = 0;
let detFail = 0;
const detSamplesLog = [];

function checkShape(node, ctx) {
    const keys = Object.keys(node).sort().join(',');
    if (keys !== ALLOWED_KEYS) {
        kFail++;
        if (kFailExamples.length < 10) kFailExamples.push({ ...ctx, nodeId: node.nodeId, keys });
    }
    (node.children || []).forEach((c) => checkShape(c, ctx));
}
function checkExpanded(node, ctx) {
    const should = node.children.length > 0 && isAncestorOfFocus(node);
    if (node.expanded !== should) {
        eFail++;
        if (eFailExamples.length < 10) eFailExamples.push({ ...ctx, nodeId: node.nodeId, actual: node.expanded, expected: should });
    }
    node.children.forEach((c) => checkExpanded(c, ctx));
}
function compareOrder(repNode, vmNode, ctx) {
    const repChildren = repNode.children || [];
    if (repChildren.length !== vmNode.children.length) {
        fFail++;
        if (fFailExamples.length < 10) fFailExamples.push({ ...ctx, nodeId: vmNode.nodeId, reason: 'length mismatch' });
        return;
    }
    for (let i = 0; i < repChildren.length; i++) {
        if (repChildren[i].id !== vmNode.children[i].nodeId) {
            fFail++;
            if (fFailExamples.length < 10) fFailExamples.push({ ...ctx, index: i, repId: repChildren[i].id, vmId: vmNode.children[i].nodeId });
        }
        compareOrder(repChildren[i], vmNode.children[i], ctx);
    }
}

console.log(`対象書: ${BOOKS.length} 冊\n`);
const startTime = Date.now();

for (const bookFile of BOOKS) {
    const bookId = bookFile.replace(/^\d\d-/, '').replace(/\.xml$/, '');
    const xml = fs.readFileSync(path.join(LOWFAT_DIR, bookFile), 'utf8');
    const bookEl = parseLowfat(xml);
    const sentences = bookEl.getElementsByTagName('sentence');

    // G. deterministic サンプル対象 sentence: 各書の「最初」と「最も長い」の2文
    const sentWordCounts = sentences.map((s) => s.getElementsByTagName('w').length);
    let longestIdx = 0, longestCount = -1;
    sentWordCounts.forEach((c, i) => { if (c > longestCount) { longestCount = c; longestIdx = i; } });
    const detSentenceIdxs = new Set([0, longestIdx]);

    let bookFocusRun = 0;

    sentences.forEach((sentenceEl, sIdx) => {
        const scopeId = `${bookId.toUpperCase()}#${String(sIdx).padStart(5, '0')}`;
        let representation;
        try {
            representation = buildFlowTree(sentenceEl, { scopeId });
        } catch (e) {
            adapterBuildFailures++;
            return;
        }
        if (!representation) { adapterBuildFailures++; return; }
        totalSentencesProcessed++;

        const wordNodes = [];
        for (const id in representation.nodesById) {
            const n = representation.nodesById[id];
            if (n.type === 'word') wordNodes.push(n);
        }

        let detFociRefs = null;
        if (detSentenceIdxs.has(sIdx) && wordNodes.length > 0) {
            const idxs = new Set([0, Math.floor(wordNodes.length / 2), wordNodes.length - 1]);
            detFociRefs = new Set(Array.from(idxs).map((i) => wordNodes[i].tokens[0]));
        }

        for (const wn of wordNodes) {
            const focusRef = wn.tokens[0];
            totalFocusRun++;
            bookFocusRun++;

            // 独立 parent chain 再走査（C・J 共通。neighborhood-view.js の
            // 内部実装を呼ばず、Representation を直接辿ることで NeighborhoodView
            // の判断を外側から検証する）
            const chain = [];
            let curId = wn.parentId;
            while (curId !== null && curId !== undefined && representation.nodesById[curId]) {
                chain.push(representation.nodesById[curId]);
                curId = representation.nodesById[curId].parentId;
            }
            if (chain.length > maxParentChainDepth) maxParentChainDepth = chain.length;

            let nv;
            try {
                nv = buildNeighborhoodView(representation, focusRef);
            } catch (e) {
                if (e instanceof RangeError) rangeErrorCount++;
                if (uncaughtExceptions.length < 20) {
                    uncaughtExceptions.push({ book: bookId, sentenceIdx: sIdx, focusRef, error: e.message });
                }
                continue;
            }

            if (nv === null) {
                if (wn.parentId === null) {
                    nullCountI_i++; // (i) 想定内: focus自身がroot（祖先が無い）
                } else {
                    nullCountI_ii++; // (ii) 未知の原因 → FAIL
                    if (nullExamplesII.length < 10) nullExamplesII.push({ book: bookId, sentenceIdx: sIdx, focusRef });
                }
                continue;
            }

            const ctx = { book: bookId, sentenceIdx: sIdx, focusRef };
            const anchorRepNode = representation.nodesById[nv.anchorId];

            // B. focus探索正確性
            const focusNodesFound = collectFocusNodes(nv.constituents);
            if (focusNodesFound.length !== 1
                || focusNodesFound[0].tokens.length !== 1
                || focusNodesFound[0].tokens[0] !== focusRef) {
                bFail++;
                if (bFailExamples.length < 10) bFailExamples.push({ ...ctx, foundCount: focusNodesFound.length });
            }

            // C. anchor探索妥当性
            if (nv.usedFallback === false) {
                if (!anchorRepNode || anchorRepNode.type !== 'clause') {
                    cFail++;
                    if (cFailExamples.length < 10) cFailExamples.push({ ...ctx, anchorId: nv.anchorId, reason: 'not clause or missing' });
                }
            } else {
                const hasClauseAncestor = chain.some((a) => a.type === 'clause');
                if (hasClauseAncestor) {
                    cFail++;
                    if (cFailExamples.length < 10) cFailExamples.push({ ...ctx, reason: 'fallback used but clause ancestor exists', anchorId: nv.anchorId });
                }
            }

            // D. View構造完全性
            if (anchorRepNode) {
                const flat = [];
                nv.constituents.forEach((c) => flattenLeafTokens(c, flat));
                const flatSet = new Set(flat);
                const dup = flat.length !== flatSet.size;
                const expectedSet = new Set(anchorRepNode.tokens);
                let missing = 0, extra = 0;
                for (const t of expectedSet) if (!flatSet.has(t)) missing++;
                for (const t of flatSet) if (!expectedSet.has(t)) extra++;
                if (dup || missing > 0 || extra > 0) {
                    dFail++;
                    if (dFailExamples.length < 10) dFailExamples.push({ ...ctx, dup, missing, extra });
                }
            }

            // E. expanded整合性
            nv.constituents.forEach((c) => checkExpanded(c, ctx));

            // F. structural order保持
            if (anchorRepNode) {
                const repChildren = anchorRepNode.children || [];
                if (repChildren.length !== nv.constituents.length) {
                    fFail++;
                    if (fFailExamples.length < 10) fFailExamples.push({ ...ctx, reason: 'top-level length mismatch' });
                } else {
                    for (let i = 0; i < repChildren.length; i++) {
                        if (repChildren[i].id !== nv.constituents[i].nodeId) {
                            fFail++;
                            if (fFailExamples.length < 10) fFailExamples.push({ ...ctx, index: i, repId: repChildren[i].id, vmId: nv.constituents[i].nodeId });
                        }
                        compareOrder(repChildren[i], nv.constituents[i], ctx);
                    }
                }
            }

            // H. 禁止情報非漏出 + K. ViewModel shape consistency
            const nvJson = JSON.stringify(nv.constituents);
            if (/"type"|"role"|"rule"|"semanticRole"/.test(nvJson)) {
                hFail++;
                if (hFailExamples.length < 10) hFailExamples.push(ctx);
            }
            nv.constituents.forEach((c) => checkShape(c, ctx));

            // J. constituent tree 最大深度
            let localMaxDepth = 0;
            nv.constituents.forEach((c) => { const d = maxDepth(c); if (d > localMaxDepth) localMaxDepth = d; });
            if (localMaxDepth > maxConstituentTreeDepth) maxConstituentTreeDepth = localMaxDepth;

            // G. deterministic（サンプルのみ）
            if (detFociRefs && detFociRefs.has(focusRef)) {
                detChecked++;
                detSamplesLog.push({ book: bookId, sentenceIdx: sIdx, focusRef });
                let nv2;
                try { nv2 = buildNeighborhoodView(representation, focusRef); } catch (e) { nv2 = { __error: e.message }; }
                if (JSON.stringify(nv) !== JSON.stringify(nv2)) detFail++;
            }
        }
    });

    console.log(`${bookId.padEnd(16)} sentences=${String(sentences.length).padStart(5)} focusRun=${bookFocusRun}`);
}

const elapsedMs = Date.now() - startTime;

// ══════════════════════════════════════════════════════════════════
console.log('\n=== 集計 ===\n');
console.log(`処理 sentence 数: ${totalSentencesProcessed} / focus 実行件数: ${totalFocusRun}`);
console.log(`実行時間: ${elapsedMs}ms`);
console.log(`前提違反（Adapter が null/例外。FLOW-TREE-12前提上0を期待）: ${adapterBuildFailures}`);
console.log(`捕捉不能例外（RangeError含む）: ${uncaughtExceptions.length}（うちRangeError: ${rangeErrorCount}）`);
console.log(`B focus探索不正: ${bFail}`);
console.log(`C anchor探索不正: ${cFail}`);
console.log(`D View構造不完全: ${dFail}`);
console.log(`E expanded不整合: ${eFail}`);
console.log(`F structural order不整合: ${fFail}`);
console.log(`H 禁止情報漏出: ${hFail}`);
console.log(`K shape不整合: ${kFail}`);
console.log(`I(i) 想定内null（focus自身がroot）: ${nullCountI_i}`);
console.log(`I(ii) 未知null: ${nullCountI_ii}`);
console.log(`G deterministic サンプル数: ${detChecked} / 不一致: ${detFail}`);
console.log(`J 最大 parent chain 深度: ${maxParentChainDepth} / 最大 constituent tree 深度: ${maxConstituentTreeDepth}`);

console.log('\n=== PASS / WARNING / FAIL 分離 ===\n');

console.log('--- PASS ---');
if (adapterBuildFailures === 0) console.log('前提確認  Adapter build 失敗0件（FLOW-TREE-12前提と整合）');
if (uncaughtExceptions.length === 0) console.log('PASS  A. 網羅的実行可能性（捕捉不能例外0件・137,741件相当のfocus全実行完走）');
if (bFail === 0) console.log('PASS  B. focus探索正確性（不正0件）');
if (cFail === 0) console.log('PASS  C. anchor探索妥当性（不正0件）');
if (dFail === 0) console.log('PASS  D. View構造完全性（token欠落・重複・過剰0件）');
if (eFail === 0) console.log('PASS  E. expanded整合性（不整合0件）');
if (fFail === 0) console.log('PASS  F. structural order保持（不整合0件）');
if (detChecked > 0 && detFail === 0) console.log(`PASS  G. deterministic（サンプル${detChecked}件、不一致0件）`);
if (hFail === 0) console.log('PASS  H. 禁止情報非漏出（漏出0件）');
if (nullCountI_ii === 0) console.log('PASS  I(ii). 未知原因のnull 0件');
if (rangeErrorCount === 0) console.log('PASS  J. 実行安定性（RangeError 0件）');
if (kFail === 0) console.log('PASS  K. ViewModel shape consistency（不整合0件）');

console.log('\n--- WARNING（想定内のFailure Mode） ---');
console.log(`WARNING  I(i). focus自身がroot（clause祖先なし・祖先ゼロ）によるnull: ${nullCountI_i} 件`);
console.log('         → 既知の構造（sentence直下が単一<w>のみ。例: Acts 15:29型）。設計上想定される Failure Mode であり欠陥ではない。');

console.log('\n--- FAIL ---');
let hasFail = false;
if (adapterBuildFailures > 0) { console.log(`FAIL  前提違反: Adapter build 失敗 ${adapterBuildFailures} 件（FLOW-TREE-12の前提と矛盾。要再確認）`); hasFail = true; }
if (uncaughtExceptions.length > 0) { console.log(`FAIL  A. 捕捉不能例外 ${uncaughtExceptions.length} 件`); console.log('      例:', JSON.stringify(uncaughtExceptions.slice(0, 5), null, 2)); hasFail = true; }
if (bFail > 0) { console.log(`FAIL  B. focus探索不正 ${bFail} 件`); console.log('      例:', JSON.stringify(bFailExamples, null, 2)); hasFail = true; }
if (cFail > 0) { console.log(`FAIL  C. anchor探索不正 ${cFail} 件`); console.log('      例:', JSON.stringify(cFailExamples, null, 2)); hasFail = true; }
if (dFail > 0) { console.log(`FAIL  D. View構造不完全 ${dFail} 件`); console.log('      例:', JSON.stringify(dFailExamples, null, 2)); hasFail = true; }
if (eFail > 0) { console.log(`FAIL  E. expanded不整合 ${eFail} 件`); console.log('      例:', JSON.stringify(eFailExamples, null, 2)); hasFail = true; }
if (fFail > 0) { console.log(`FAIL  F. structural order不整合 ${fFail} 件`); console.log('      例:', JSON.stringify(fFailExamples, null, 2)); hasFail = true; }
if (detFail > 0) { console.log(`FAIL  G. deterministic不一致 ${detFail} 件（サンプル${detChecked}件中）`); hasFail = true; }
if (hFail > 0) { console.log(`FAIL  H. 禁止情報漏出 ${hFail} 件`); console.log('      例:', JSON.stringify(hFailExamples, null, 2)); hasFail = true; }
if (nullCountI_ii > 0) { console.log(`FAIL  I(ii). 未知原因のnull ${nullCountI_ii} 件`); console.log('      例:', JSON.stringify(nullExamplesII, null, 2)); hasFail = true; }
if (rangeErrorCount > 0) { console.log(`FAIL  J. RangeError（スタックオーバーフロー等） ${rangeErrorCount} 件`); hasFail = true; }
if (kFail > 0) { console.log(`FAIL  K. ViewModel shape不整合 ${kFail} 件`); console.log('      例:', JSON.stringify(kFailExamples, null, 2)); hasFail = true; }
if (!hasFail) console.log('（FAILなし）');

console.log('\n--- 未検証（対象外・本監査のスコープ外） ---');
console.log('- XML parser自体の妥当性（FLOW-TREE-12で確認済みの方式を再利用。本監査では再検証しない）');
console.log('- Adapter内部ロジック（structural completeness/determinism/type mapping。FLOW-TREE-12で検証済み前提）');
console.log('- Renderer / HTML生成 / label生成（neighborhood-view.js の責務外）');
console.log('- Display Policy（表示件数制御等）');
console.log('- public/index.html 上のUI表示・実ブラウザ動作（本監査は node script 経由の直接呼び出しのみ）');

console.log('');
console.log(hasFail ? 'FAIL項目あり（詳細は上記参照）' : `ALL PASS（WARNING ${nullCountI_i}件を除く）`);
process.exit(hasFail ? 1 : 0);
