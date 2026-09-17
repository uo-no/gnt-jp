#!/usr/bin/env node
/**
 * build-sr.cjs — Structural Representation (SR) Asset Builder
 *
 * 目的:
 *   Lowfat XML (work/SBLGNT/lowfat/*.xml) から Structural Representation (SR) を生成し、
 *   ブラウザ runtime が chapter 単位で取得できる JSON 資産として保存する。
 *   出力: public/assets/data/sr/{BOOK}/{chapter}.json
 *
 * 設計境界（厳守）:
 *   - flow-tree-adapter.js を呼ばない・変更しない。SR は独自の正規化ロジックを持つ。
 *   - build-flow-tree.cjs を変更しない。SR build は独立したスクリプト。
 *   - public/index.html, flow-tree/**, bible_data/** を変更しない（read-only inputs）。
 *   - SR renderer を本番 UI に接続しない（P1-SR Build フェーズの scope 外）。
 *   - Discourse relations (理由/結果/対比/条件/目的/時間) を生成しない。
 *   - L-0: label_ja は表示支援のみ。構造判定に使用しない。
 *   - DR-1/DR-2: morphCategory は badge のみ。function/construction を morph から導出しない。
 *
 * R-4: role whitelist {s,v,vc,o,o2,io,p,adv,aux}。unknown role → UNRESOLVED。
 * R-5: PtclCL → PARTICIPIAL_CLAUSE (Tier 1 昇格)。
 *
 * attribution:
 *   SBLGNT (© Faithlife / Logos Bible Software, CC BY 4.0)
 *   MACULA Greek Linguistic Datasets (© Biblica, Inc., CC BY 4.0)
 *   https://github.com/Clear-Bible/macula-greek/
 *
 * 実行: node scripts/build-sr.cjs [--book JHN] [--chapter 1] [--all]
 */
'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { DOMParser } = require('@xmldom/xmldom');

const ROOT          = path.resolve(__dirname, '..');
const LOWFAT_DIR    = path.join(ROOT, 'work', 'SBLGNT', 'lowfat');
const BIBLE_DATA_DIR = path.join(ROOT, 'public', 'bible_data', 'nt');
const SR_OUT_DIR    = path.join(ROOT, 'public', 'assets', 'data', 'sr');

// ── Constants ────────────────────────────────────────────────────────────

const CANONICAL_ROLES = new Set(['s', 'v', 'vc', 'o', 'o2', 'io', 'p', 'adv', 'aux']);

const ROLE_FN = {
    s: 'SUBJECT', v: 'PREDICATE', vc: 'COPULA', o: 'OBJECT', o2: 'OBJECT2',
    io: 'INDIRECT_OBJECT', p: 'COMPLEMENT', adv: 'ADVERBIAL', aux: 'AUX'
};

// Maps wg@class to SR node type
const CLASS_MAP = {
    cl: 'clause', np: 'phrase.np', pp: 'phrase.pp', vp: 'phrase.vp',
    adjp: 'phrase.adjp', advp: 'phrase.advp', nump: 'phrase.nump',
    adv: 'phrase.adv', conj: 'phrase.conj'
};

// Tier 1/2 construction map — R-5: PtclCL promoted to PARTICIPIAL_CLAUSE
const CONSTRUCTION_MAP = {
    // Tier 1 — canonical structural constructions
    'DetNP':          'ARTICULAR_NP',
    'DetNump':        'ARTICULAR_NP',
    'NPofNP':         'GENITIVE_MOD',
    'ofNPNP':         'GENITIVE_MOD',
    'PrepNp':         'PREP_PHRASE',
    'Np-Appos':       'APPOSITION',
    'sub-CL':         'SUBORDINATE_CLAUSE',
    'Conj-CL':        'CONJOINED_CLAUSE',
    'DetCL':          'NOMINALIZED_CLAUSE',
    'that-VP':        'CONTENT_CLAUSE',
    'PtclCL':         'PARTICIPIAL_CLAUSE',   // R-5
    'AdjpNp':         'ADJ_MOD',
    'NpAdjp':         'ADJ_MOD',
    'DetAdj':         'ADJ_MOD',
    'NPDetAdj':       'ADJ_MOD',
    'AdvpNp':         'ADV_MOD',
    'NpAdvp':         'ADV_MOD',
    'NumpNP':         'NUM_MOD',
    'NpNump':         'NUM_MOD',
    'NP-Demo':        'DEMO_MOD',
    'Demo-NP':        'DEMO_MOD',
    // Tier 2 — supporting construction variants
    'BeVerb':         'COPULAR_VP',
    'VerbBe':         'COPULAR_VP',
    'NP-CL':          'CLAUSE_AS_NP',
    'CL-NP':          'CLAUSE_AS_NP',
    'NpaNp':          'NP_COMPLEX',
    'aNpaNp':         'NP_COMPLEX',
    'All-NP':         'NP_COMPLEX',
    'NP-all':         'NP_COMPLEX',
    'QuanNP':         'NP_COMPLEX',
    'PronNP':         'NP_COMPLEX',
};

// Recognized role abbreviations in Tier-3 word-order rules
const WORD_ORDER_ABBREVS = new Set(['S', 'V', 'VC', 'O', 'O2', 'IO', 'P', 'ADV', 'AUX']);

// Discourse strings that MUST NOT appear in SR output (leak guard)
const DISCOURSE_STRINGS = [
    '理由', '結果', '対比', '条件', '目的', '時間',
    'reason', 'result', 'contrast', 'condition', 'purpose', 'cause'
];

const DATASET_ATTRIBUTION =
    'SBLGNT (© Faithlife / Logos Bible Software, CC BY 4.0); ' +
    'MACULA Greek Linguistic Datasets (© Biblica, Inc., CC BY 4.0), ' +
    'available at https://github.com/Clear-Bible/macula-greek/';

const SR_BUILDER_VERSION = '0.1';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ref format: "BOOK CH:V!IDX"  e.g. "JHN 1:1!1"
const REF_RE = /^(\S+)\s+(\d+):(\d+)!(\d+)$/;

const _SR_XML_NS = 'http://www.w3.org/XML/1998/namespace';
function _getWordVerseId(wEl) {
    const nsId = wEl.getAttributeNS ? wEl.getAttributeNS(_SR_XML_NS, 'id') : null;
    return nsId || wEl.getAttribute('xml:id') || wEl.getAttribute('ref');
}

// ── Role Normalization (R-4) ─────────────────────────────────────────────

function normalizeRole(roleRaw) {
    if (!roleRaw) return null;
    if (CANONICAL_ROLES.has(roleRaw)) {
        return { canonical: ROLE_FN[roleRaw], derivedFrom: ['role'], status: 'CONFIRMED' };
    }
    // R-4: malformed upstream value → UNRESOLVED; raw preserved in evidence
    return { canonical: 'UNRESOLVED', derivedFrom: ['role'], status: 'UNRESOLVED' };
}

// ── Construction Normalization ───────────────────────────────────────────

function ruleConstruction(rule) {
    if (!rule) return null;

    // Tier 1/2: explicit map
    if (CONSTRUCTION_MAP[rule]) {
        return {
            canonical: CONSTRUCTION_MAP[rule],
            sourceRule: rule,
            derivedFrom: ['rule'],
            status: 'CONFIRMED'
        };
    }

    // Tier 3: word-order rules (e.g., "P-VC-S", "S-V-O", "V-S")
    if (rule.includes('-')) {
        const parts = rule.split('-');
        if (parts.length >= 2 && parts.every(p => WORD_ORDER_ABBREVS.has(p))) {
            return {
                canonical: null,
                axis: 'WORD_ORDER',
                sourceRule: rule,
                derivedFrom: ['rule'],
                status: 'CONFIRMED',
                note: 'clause constituent linear order'
            };
        }
    }

    // Tier 4: Conj{n}CL coordination variants (e.g., "Conj2CL", "Conj3CL")
    if (/^Conj\d/.test(rule)) {
        return {
            canonical: 'COORDINATION',
            sourceRule: rule,
            derivedFrom: ['rule'],
            status: 'CONFIRMED',
            note: 'coordination variant'
        };
    }

    // Tier 4: PrepNp / Pp variants not in explicit map
    if (rule.startsWith('Prep') || rule.endsWith('Pp')) {
        return {
            canonical: 'PREP_PHRASE',
            sourceRule: rule,
            derivedFrom: ['rule'],
            status: 'CONFIRMED',
            note: 'PP variant'
        };
    }

    // Tier 4: unmapped remainder — preserve source, no canonical
    return {
        canonical: null,
        sourceRule: rule,
        derivedFrom: ['rule'],
        status: 'UNRESOLVED',
        note: 'Tier4: no canonical mapping'
    };
}

// ── Morph Category (DR-1/DR-2 — badge only, never determines function) ──

function morphCategory(tok) {
    if (!tok) return null;
    const cats = [];
    // Morph is a badge; it does NOT set function.canonical or construction.canonical
    if (tok.mood === 'participle')   cats.push('participle');
    else if (tok.mood === 'infinitive')  cats.push('infinitive');
    if (tok.class === 'pron' && tok.type === 'relative') cats.push('relative_pronoun');
    return cats.length ? cats : null;
}

// ── Null stripping for compact output ────────────────────────────────────

function stripNulls(value) {
    if (value === null || value === undefined || value === '') return undefined;
    if (Array.isArray(value)) {
        const arr = value.map(stripNulls).filter(v => v !== undefined);
        return arr.length ? arr : undefined;
    }
    if (typeof value === 'object') {
        const out = {};
        for (const k of Object.keys(value)) {
            const v = stripNulls(value[k]);
            if (v !== undefined) out[k] = v;
        }
        return Object.keys(out).length ? out : undefined;
    }
    return value;
}

// ── Node Builder ─────────────────────────────────────────────────────────

function buildNode(el, parentId, bookCode, bibleIdx, seq) {
    const tag = el.tagName.toLowerCase();

    if (tag === 'w') {
        const ref = el.getAttribute('ref');
        // xml:id attribute (may be namespaced)
        const xmlId = el.getAttributeNS
            ? (el.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'id') || el.getAttribute('xml:id'))
            : el.getAttribute('xml:id');
        const nid  = xmlId || ref;
        const tok  = bibleIdx[ref] || null;
        const roleRaw = el.getAttribute('role');
        // Prefer unicode attribute (explicit Unicode form), fall back to text content
        const text = el.getAttribute('unicode')
            || el.getAttribute('normalized')
            || (el.firstChild ? el.firstChild.nodeValue : '')
            || '';

        return {
            id:           nid,
            type:         'token',
            parentId:     parentId || null,
            surfaceIndex: seq.i++,
            text,
            function:     normalizeRole(roleRaw),
            construction: null,
            morphCategory: morphCategory(tok),
            evidence: {
                nodeId:   nid,
                ref:      ref || null,
                role:     roleRaw || null,
                morph_raw: tok ? (tok.morph || null) : null
            },
            children: []
        };
    }

    // wg element
    const cls     = el.getAttribute('class') || '';
    const ntype   = CLASS_MAP[cls] || 'group';
    const rule    = el.getAttribute('rule') || el.getAttribute('Rule') || null;
    const roleRaw = el.getAttribute('role');
    const nodeIdAttr = el.getAttribute('nodeId') || null;

    // Collect all descendant token verseIds (the span of this constituent)
    const wElems   = Array.from(el.getElementsByTagName('w'));
    const tokenIds = wElems.map(w => _getWordVerseId(w)).filter(Boolean);

    // Stable node ID: prefer explicit nodeId, else derive from span
    let nid;
    if (nodeIdAttr) {
        nid = nodeIdAttr;
    } else if (tokenIds.length >= 2) {
        nid = `${bookCode}#${tokenIds[0]}…${tokenIds[tokenIds.length - 1]}`;
    } else if (tokenIds.length === 1) {
        nid = `${bookCode}#${tokenIds[0]}`;
    } else {
        nid = `${bookCode}#group-${seq.i}`;
    }

    const evidence = {
        nodeId: nid,
        rule:   rule    || null,
        role:   roleRaw || null
    };
    // Preserve structural evidence attributes (audit chain)
    for (const attr of ['junction', 'clauseType', 'articular', 'predication', 'type']) {
        const v = el.getAttribute(attr);
        if (v) evidence[attr] = v;
    }

    const node = {
        id:           nid,
        type:         ntype,
        parentId:     parentId || null,
        tokenIds,
        function:     normalizeRole(roleRaw),
        construction: ruleConstruction(rule),
        morphCategory: null,
        evidence,
        children:     []
    };

    // Structural flags for special constructions
    const flags = [];
    if (evidence.junction === 'apposition')      flags.push('APPOSITION(junction)');
    if (evidence.clauseType === 'nominalized')   flags.push('NOMINALIZED(clauseType)');
    if (evidence.predication === 'verbless')     flags.push('PREDICATION=verbless');
    if (evidence.predication === 'elided')       flags.push('PREDICATION=elided');
    if (flags.length) node.flags = flags;

    // Recurse children in SOURCE ORDER (R-1: preserves surfaceIndex monotonicity)
    for (const child of Array.from(el.childNodes)) {
        if (child.nodeType !== 1) continue;
        const ctag = child.tagName.toLowerCase();
        if (ctag === 'w' || ctag === 'wg') {
            node.children.push(buildNode(child, nid, bookCode, bibleIdx, seq));
        }
    }

    return node;
}

// ── Chapter Invariant Validation ─────────────────────────────────────────

function validateChapter(chapterSR) {
    const errors = [];

    // Discourse leak guard: MUST NOT appear in SR output
    const srText = JSON.stringify(chapterSR);
    for (const s of DISCOURSE_STRINGS) {
        if (srText.includes(s)) errors.push(`Discourse leak: "${s}"`);
    }

    function flatTokens(node) {
        if (node.type === 'token') return [node];
        return (node.children || []).flatMap(flatTokens);
    }

    for (const sent of chapterSR.sentences) {
        const tokens = flatTokens(sent.root);

        // Token count internal consistency
        if (tokens.length !== sent.flatNodeCount) {
            errors.push(
                `Token count mismatch in ${sent.ref}: SR=${tokens.length} expected=${sent.flatNodeCount}`
            );
        }

        // Surface order: surfaceIndex non-decreasing (Rev 1:8 guard)
        const indices = tokens.map(t => t.surfaceIndex);
        for (let i = 1; i < indices.length; i++) {
            if (indices[i] < indices[i - 1]) {
                errors.push(
                    `Surface order violation in ${sent.ref}: ` +
                    `idx[${i}]=${indices[i]} < idx[${i - 1}]=${indices[i - 1]}`
                );
                break;
            }
        }

        // R-4: malformed role routing check
        // If function.canonical === UNRESOLVED, the raw role must NOT be a canonical role
        function checkR4(node) {
            if (node.function && node.function.canonical === 'UNRESOLVED') {
                const raw = (node.evidence || {}).role;
                if (raw && CANONICAL_ROLES.has(raw)) {
                    errors.push(
                        `R-4 violation: canonical role "${raw}" marked UNRESOLVED in ${sent.ref}`
                    );
                }
            }
            (node.children || []).forEach(checkR4);
        }
        checkR4(sent.root);
    }

    return errors;
}

// ── Bible data loader ────────────────────────────────────────────────────

function loadBibleData(bookCode) {
    const bookDir = path.join(BIBLE_DATA_DIR, bookCode);
    if (!fs.existsSync(bookDir)) return {};
    const files = fs.readdirSync(bookDir).filter(f => /^\d+\.json$/.test(f));
    const index = {};
    for (const f of files) {
        try {
            const tokens = JSON.parse(fs.readFileSync(path.join(bookDir, f), 'utf8'));
            if (Array.isArray(tokens)) {
                for (const tok of tokens) {
                    if (tok.ref) index[tok.ref] = tok;
                }
            }
        } catch (_) { /* non-fatal: morph data unavailable for chapter */ }
    }
    return index;
}

// ── Ref parsing ──────────────────────────────────────────────────────────

function parseRef(ref) {
    const m = REF_RE.exec(ref || '');
    if (!m) return null;
    return {
        book:    m[1],
        chapter: parseInt(m[2], 10),
        verse:   parseInt(m[3], 10),
        idx:     parseInt(m[4], 10)
    };
}

// ── Book processor ───────────────────────────────────────────────────────

function processBook(bookFile, opts) {
    const bookPath = path.join(LOWFAT_DIR, bookFile);
    const xml = fs.readFileSync(bookPath, 'utf8');

    const parseErrors = [];
    const parser = new DOMParser({
        onError: (level, msg) => {
            if (level === 'fatalError' || level === 'error') {
                parseErrors.push(`xml ${level}: ${msg}`);
            }
        }
    });

    let doc;
    try {
        doc = parser.parseFromString(xml, 'text/xml');
    } catch (e) {
        return { error: `DOMParser exception: ${e.message}`, chapters: {}, bookCode: null };
    }
    if (!doc || !doc.documentElement) {
        return { error: 'documentElement null', chapters: {}, bookCode: null };
    }

    const sentences = Array.from(doc.getElementsByTagName('sentence'));
    if (sentences.length === 0) {
        return { error: 'no sentences found', chapters: {}, bookCode: null };
    }

    // Determine book code from first valid token ref
    let bookCode = null;
    outer: for (const sent of sentences) {
        for (const w of Array.from(sent.getElementsByTagName('w'))) {
            const p = parseRef(w.getAttribute('ref'));
            if (p) { bookCode = p.book; break outer; }
        }
    }
    if (!bookCode) {
        return { error: 'cannot determine book code from token refs', chapters: {}, bookCode: null };
    }

    // Book filter (skip if not requested)
    if (opts.book && bookCode !== opts.book) {
        return { chapters: {}, bookCode, skipped: true };
    }

    // Load all morph data for this book
    const bibleIdx = loadBibleData(bookCode);

    // chapters[chNum] = { sentences: [], xmlTokenCounts: [] }
    const chapters  = {};
    const failures  = [];
    let totalSentences   = 0;
    let totalTokensSR    = 0;
    let totalTokensXML   = 0;

    for (const sentEl of sentences) {
        // All valid token refs in this sentence
        const allWords    = Array.from(sentEl.getElementsByTagName('w'));
        const validWords  = allWords.filter(w => REF_RE.test(w.getAttribute('ref') || ''));

        if (validWords.length === 0) continue;

        const firstParsed = parseRef(validWords[0].getAttribute('ref'));
        if (!firstParsed) continue;

        const chNum = firstParsed.chapter;

        // Chapter filter
        if (opts.chapter !== undefined && chNum !== opts.chapter) continue;

        // Find the root structural element (first wg or w direct child of sentence)
        let rootEl = null;
        for (const child of Array.from(sentEl.childNodes)) {
            if (child.nodeType !== 1) continue;
            const ctag = child.tagName.toLowerCase();
            if (ctag === 'wg' || ctag === 'w') { rootEl = child; break; }
        }
        // Fallback: first wg descendant
        if (!rootEl) {
            const wgs = sentEl.getElementsByTagName('wg');
            if (wgs.length) rootEl = wgs[0];
        }
        if (!rootEl) {
            failures.push(`No root element for sentence at ${validWords[0].getAttribute('ref')}`);
            continue;
        }

        const seq = { i: 0 };
        let root;
        try {
            root = buildNode(rootEl, null, bookCode, bibleIdx, seq);
        } catch (e) {
            failures.push(
                `buildNode error at ${validWords[0].getAttribute('ref')}: ${e.message}`
            );
            continue;
        }

        const sentRef = `${firstParsed.book} ${firstParsed.chapter}:${firstParsed.verse}`;
        const sentObj = {
            ref:          sentRef,
            root,
            flatNodeCount: seq.i,         // token count (seq.i = number of w elements visited)
            xmlTokenCount: validWords.length  // for validation cross-check
        };

        if (!chapters[chNum]) chapters[chNum] = { sentences: [], failures: [] };
        chapters[chNum].sentences.push(sentObj);

        totalSentences++;
        totalTokensSR  += seq.i;
        totalTokensXML += validWords.length;
    }

    return {
        bookCode,
        chapters,
        totalSentences,
        totalTokensSR,
        totalTokensXML,
        failures,
        parseErrors
    };
}

// ── Output writer ────────────────────────────────────────────────────────

function writeChapter(bookCode, chNum, chData, dryRun) {
    // Validate before writing
    const chapterSR = {
        schemaVersion: SR_BUILDER_VERSION,
        source: {
            dataset:          DATASET_ATTRIBUTION,
            book:             bookCode,
            chapter:          chNum,
            buildDate:        BUILD_DATE,
            srBuilderVersion: SR_BUILDER_VERSION
        },
        sentences:      chData.sentences.map(s => ({
            ref:          s.ref,
            root:         s.root,
            flatNodeCount: s.flatNodeCount
        })),
        sentenceCount:  chData.sentences.length,
        totalNodeCount: chData.sentences.reduce((sum, s) => sum + s.flatNodeCount, 0)
    };

    const errors = validateChapter(chapterSR);
    if (errors.length) {
        return { errors, path: null };
    }

    // Token count vs XML cross-check
    const srTokens  = chData.sentences.reduce((sum, s) => sum + s.flatNodeCount,   0);
    const xmlTokens = chData.sentences.reduce((sum, s) => sum + s.xmlTokenCount, 0);
    if (srTokens !== xmlTokens) {
        return {
            errors: [`SR/XML token mismatch: SR=${srTokens} XML=${xmlTokens} in ${bookCode} ch${chNum}`],
            path: null
        };
    }

    // Serialize (strip nulls for compact output)
    const stripped  = stripNulls(chapterSR);
    const json      = JSON.stringify(stripped);
    const relPath   = path.join(bookCode, `${chNum}.json`);
    const absPath   = path.join(SR_OUT_DIR, relPath);

    if (!dryRun) {
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, json);
    }

    return { errors: [], path: relPath, byteSize: Buffer.byteLength(json, 'utf8') };
}

// ── Main ─────────────────────────────────────────────────────────────────

function main() {
    const args = process.argv.slice(2);
    const dryRun  = args.includes('--dry');
    const buildAll = args.includes('--all');

    let filterBook    = null;
    let filterChapter = undefined;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--book'    && args[i + 1]) filterBook    = args[i + 1];
        if (args[i] === '--chapter' && args[i + 1]) filterChapter = parseInt(args[i + 1], 10);
    }

    if (!buildAll && !filterBook) {
        console.error('Usage: node scripts/build-sr.cjs [--all] [--book BOOK] [--chapter N] [--dry]');
        process.exit(1);
    }

    const opts = { book: filterBook, chapter: filterChapter };

    const bookFiles = fs.readdirSync(LOWFAT_DIR)
        .filter(f => /^\d\d-.*\.xml$/.test(f))
        .sort();

    console.log('── SR Asset Builder v0.1 ──\n');
    console.log(`mode    : ${buildAll ? 'ALL' : 'book=' + filterBook + (filterChapter !== undefined ? ' ch=' + filterChapter : '')}`);
    console.log(`dry-run : ${dryRun}`);
    console.log(`source  : ${LOWFAT_DIR}`);
    console.log(`output  : ${SR_OUT_DIR}\n`);

    // Counters
    const totals = {
        books: 0, sentences: 0, tokensSR: 0, tokensXML: 0,
        chapters: 0, bytes: 0, failures: 0, invariantErrors: 0
    };
    const allFailures       = [];
    const allInvariantErrors = [];
    const outputs           = [];   // { relPath, digest } for build determinism

    for (const bookFile of bookFiles) {
        const result = processBook(bookFile, opts);

        if (result.skipped) continue;
        if (result.error) {
            allFailures.push(`${bookFile}: ${result.error}`);
            totals.failures++;
            continue;
        }

        const { bookCode, chapters, totalSentences, totalTokensSR, totalTokensXML, failures, parseErrors } = result;
        totals.books++;
        totals.sentences  += totalSentences   || 0;
        totals.tokensSR   += totalTokensSR    || 0;
        totals.tokensXML  += totalTokensXML   || 0;
        totals.failures   += (failures || []).length + (parseErrors || []).length;
        allFailures.push(...(failures || []).map(f => `${bookCode}: ${f}`));
        allFailures.push(...(parseErrors || []).map(f => `${bookCode}: ${f}`));

        const chNums = Object.keys(chapters).map(Number).sort((a, b) => a - b);
        for (const chNum of chNums) {
            const wr = writeChapter(bookCode, chNum, chapters[chNum], dryRun);
            if (wr.errors.length) {
                allInvariantErrors.push(...wr.errors.map(e => `${bookCode} ch${chNum}: ${e}`));
                totals.invariantErrors += wr.errors.length;
            } else {
                totals.chapters++;
                totals.bytes += wr.byteSize || 0;
                outputs.push({ relPath: wr.path, byteSize: wr.byteSize });
            }
        }

        process.stdout.write(`  ${bookCode}: ${totalSentences}s / ${totalTokensSR}t\n`);
    }

    // Build digest (determinism check)
    const digestInput = outputs.map(o => o.relPath).sort().join('\n');
    const buildDigest = crypto.createHash('sha256').update(digestInput).digest('hex').slice(0, 16);

    console.log('\n── Summary ──\n');
    console.log(`books processed  : ${totals.books}`);
    console.log(`sentences        : ${totals.sentences}`);
    console.log(`tokens (SR)      : ${totals.tokensSR}`);
    console.log(`tokens (XML)     : ${totals.tokensXML}`);
    console.log(`chapters written : ${totals.chapters}`);
    console.log(`total bytes      : ${totals.bytes.toLocaleString()} (${(totals.bytes / 1024 / 1024).toFixed(1)} MB)`);
    console.log(`build digest     : ${buildDigest}`);
    console.log(`failures         : ${totals.failures}`);
    console.log(`invariant errors : ${totals.invariantErrors}`);

    if (allFailures.length) {
        console.log('\nFAILURES:');
        allFailures.slice(0, 30).forEach(f => console.log('  FAIL ' + f));
        if (allFailures.length > 30) console.log(`  … +${allFailures.length - 30} more`);
    }
    if (allInvariantErrors.length) {
        console.log('\nINVARIANT ERRORS:');
        allInvariantErrors.slice(0, 30).forEach(e => console.log('  ERR  ' + e));
        if (allInvariantErrors.length > 30) console.log(`  … +${allInvariantErrors.length - 30} more`);
    }

    const hardFail = totals.failures > 0 || totals.invariantErrors > 0
        || totals.tokensSR !== totals.tokensXML;

    if (hardFail) {
        console.log('\nBUILD: FAIL');
        process.exit(1);
    }

    if (dryRun) {
        console.log('\nBUILD: PASS (--dry: no files written)');
    } else {
        console.log(`\nBUILD: PASS — ${totals.chapters} files written to public/assets/data/sr/`);
    }
    process.exit(0);
}

main();
