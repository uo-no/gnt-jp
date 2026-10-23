#!/usr/bin/env node
/**
 * studypanel-evidence-first-audit.cjs
 *
 * Read-only NT-wide audit for the StudyPanel evidence-first initiative.
 * Reports morphology/type contradictions and suspicious infinitive analyses.
 *
 * Run: node scripts/studypanel-evidence-first-audit.cjs
 *      node scripts/studypanel-evidence-first-audit.cjs --verbose
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VERBOSE = process.argv.includes('--verbose');
const STRICT_EVIDENCE = process.argv.includes('--strict-evidence');
const PUBLIC = path.resolve(__dirname, '..', 'public');
const TENSE = { P:'present', I:'imperfect', F:'future', A:'aorist', X:'perfect', Z:'pluperfect' };
const VOICE = { A:'active', M:'middle', P:'passive', D:'middle deponent', E:'middle or passive', N:'middle or passive' };
const MOOD = { I:'indicative', S:'subjunctive', O:'optative', M:'imperative', N:'infinitive', P:'participle' };
const CASE = { N:'nominative', G:'genitive', D:'dative', A:'accusative', V:'vocative' };
const NUMBER = { S:'singular', P:'plural' };
const GENDER = { M:'masculine', F:'feminine', N:'neuter' };
const CLASS_POS = {
    verb:'V', noun:'N', adjective:'A', adj:'A', article:'T', det:'T',
    preposition:'P', prep:'P', conjunction:'C', conj:'C', adverb:'D', adv:'D',
    particle:'X', ptcl:'X', pronoun:'R', pron:'R', 'relative pronoun':'R',
    'personal pronoun':'R', 'demonstrative pronoun':'R'
};

global.entryPosCode = function (e) {
    if (!e || typeof e !== 'object') return '';
    if (e.pos) return String(e.pos).replace(/-$/, '').toUpperCase();
    return CLASS_POS[String(e.class || '').toLowerCase()] || '';
};
global.decodeMorph = function (e) {
    if (!e || typeof e !== 'object') return {};
    const n = v => (!v || v === '-') ? '' : v;
    if (e.tense || e.mood || e.voice) {
        return { pos: global.entryPosCode(e), tense:n(e.tense), voice:n(e.voice), mood:n(e.mood),
            case:n(e.case), number:n(e.number), gender:n(e.gender), person:n(e.person) };
    }
    const raw = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const pos = n(e.pos || parts[0] || '').replace(/-$/, '');
    if (String(pos).toUpperCase() === 'V' && parts[1]) {
        const seg = parts[1], off = /^[0-9]/.test(seg) ? 1 : 0;
        return { pos, tense:TENSE[seg[off]] || '', voice:VOICE[seg[off + 1]] || '',
            mood:MOOD[seg[off + 2]] || '', person:seg[off + 3] || '',
            number:NUMBER[seg[off + 4]] || '', gender:'', case:'' };
    }
    if (parts[1]) {
        const seg = parts[1], hp = ['1','2','3'].includes(seg[0]), b = hp ? seg.slice(1) : seg;
        return { pos, tense:'', voice:'', mood:'', person:hp ? seg[0] : '',
            case:CASE[b[0]] || '', number:NUMBER[b[1]] || '', gender:GENDER[b[2]] || '' };
    }
    return { pos, tense:'', voice:'', mood:'', person:'', case:'', number:'', gender:'' };
};
global.cleanText = e => String((e && typeof e === 'object') ? (e.word || e.normalized || e.text || '') : e || '')
    .replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();

function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod = { exports:{}, id:filePath, filename:filePath, loaded:false };
    const fn = vm.runInThisContext(`(function(module,exports,require,__dirname,__filename){\n${code}\n})`,
        { filename:filePath, displayErrors:true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}
const loadJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const books = loadJson(path.join(PUBLIC, 'books.json'));
const { SyntaxAnalyzer, ContextBuilder } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const registry = loadJson(path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'));
const analyzer = new SyntaxAnalyzer(registry);
const ntBooks = books.NT;
const failures = [];
const report = {
    books: 0, chapters: 0, verses: 0, tokens: 0, analyzedTokens: 0,
    nominativePendens: 0, discourseLeftDislocation: 0, imperativalInfinitive: 0,
    nominativeCaseConflicts: [], infinitiveMoodConflicts: [],
    eph110: { tokens: {}, candidates: [] },
    candidateStats: {}
};

function checkCandidate(token, candidate, ref, ctx = null) {
    const m = global.decodeMorph(token);
    const stats = report.candidateStats[candidate.id] || (report.candidateStats[candidate.id] = {
        count:0, matchedAny:0, noMatchedSignals:0, confidenceBelow40:0, signalCounts:{}
    });
    stats.count++;
    const matchedSignals = candidate.signals_matched || [];
    if (matchedSignals.length) stats.matchedAny++;
    else stats.noMatchedSignals++;
    if ((candidate.confidence ?? 0) < 0.4) stats.confidenceBelow40++;
    for (const signal of matchedSignals) {
        const id = signal && signal.id ? signal.id : String(signal);
        stats.signalCounts[id] = (stats.signalCounts[id] || 0) + 1;
    }
    const item = { ref, tokenId:token.tokenId || token.globalIdx || null,
        text:token.text || token.normalized || '', morph:token.morph || '',
        case:m.case || null, mood:m.mood || null, id:candidate.id,
        confidence:candidate.confidence, signals:(candidate.signals_matched || []).map(s => s && s.id || String(s)) };
    if (candidate.id === 'nominative.pendens') {
        report.nominativePendens++;
        if (m.case && !['nominative','vocative'].includes(m.case)) report.nominativeCaseConflicts.push(item);
        else if (!m.case) report.nominativeCaseConflicts.push({ ...item, issue:'case_unavailable' });
    }
    if (candidate.id === 'discourse.left_dislocation') report.discourseLeftDislocation++;
    if (candidate.id === 'infinitive.imperatival') {
        report.imperativalInfinitive++;
        if (m.mood && m.mood !== 'infinitive') report.infinitiveMoodConflicts.push(item);
        else if (!m.mood) report.infinitiveMoodConflicts.push({ ...item, issue:'mood_unavailable' });
    }
    if (ref.startsWith('EPH 1:10!')) {
        report.eph110.tokens[ref] = { tokenId:item.tokenId, text:item.text, morph:item.morph, case:item.case, mood:item.mood };
        if (['nominative.pendens','discourse.left_dislocation','infinitive.imperatival'].includes(candidate.id)) {
            report.eph110.candidates.push({
                ...item,
                context: ctx ? {
                    targetIdx:ctx.targetIdx, prevPos:ctx.prevPos,
                    prevToken:ctx.prevToken?.text || ctx.prevToken?.normalized || null,
                    governorPOS:ctx.governorPOS, governorLemma:ctx.governorLemma,
                    phraseType:ctx.phrase?.type || null,
                    clauseMainVerb:ctx.clause?.mainVerb?.text || ctx.clause?.mainVerb?.normalized || null,
                    clauseStart:ctx.clauseStart, clauseEnd:ctx.clauseEnd,
                    mainVerb:ctx.mainVerb?.text || ctx.mainVerb?.normalized || null
                } : null
            });
        }
    }
}

for (const book of ntBooks) {
    report.books++;
    for (let ch = 1; ch <= book.chapters; ch++) {
        const file = path.join(PUBLIC, 'bible_data', books.corpora.NT, book.key, `${ch}.json`);
        if (!fs.existsSync(file)) {
            failures.push(`Missing NT chapter data: ${book.key} ${ch}`);
            continue;
        }
        report.chapters++;
        const tokens = loadJson(file);
        const verses = new Map();
        for (const token of tokens) {
            if (!token.ref) continue;
            const ref = token.ref.split('!')[0];
            if (!verses.has(ref)) verses.set(ref, []);
            verses.get(ref).push(token);
        }
        for (const [ref, verseTokens] of verses) {
            report.verses++;
            report.tokens += verseTokens.length;
            if (ref === 'EPH 1:10') {
                for (const token of verseTokens) {
                    const m = global.decodeMorph(token);
                    report.eph110.tokens[token.ref] = {
                        tokenId:token.tokenId || token.globalIdx || null,
                        text:token.text || token.normalized || '',
                        morph:token.morph || '', case:m.case || null, mood:m.mood || null
                    };
                }
            }
            const all = analyzer.analyzeAll(verseTokens);
            for (let i = 0; i < all.results.length; i++) {
                const row = all.results[i];
                const token = verseTokens[i];
                if (!row || !row.output) continue;
                report.analyzedTokens++;
                const ctx = ref === 'EPH 1:10'
                    ? ContextBuilder.build(token, verseTokens, i, analyzer.registry)
                    : null;
                for (const candidate of row.output.candidates || []) checkCandidate(token, candidate, token.ref || ref, ctx);
            }
        }
    }
}

const errors = report.nominativeCaseConflicts.filter(x => x.issue !== 'case_unavailable');
const moodErrors = report.infinitiveMoodConflicts.filter(x => x.issue !== 'mood_unavailable');
const zeroEvidenceTypes = Object.entries(report.candidateStats)
    .filter(([, stats]) => stats.noMatchedSignals > 0)
    .map(([id, stats]) => ({ id, candidates:stats.count, noMatchedSignals:stats.noMatchedSignals }));
console.log('StudyPanel evidence-first NT audit');
console.log(JSON.stringify({
    coverage: { books:report.books, chapters:report.chapters, verses:report.verses,
        tokens:report.tokens, analyzedTokens:report.analyzedTokens },
    candidateCounts: { nominativePendens:report.nominativePendens,
        discourseLeftDislocation:report.discourseLeftDislocation,
        imperativalInfinitive:report.imperativalInfinitive },
    morphologyConflicts: { nominativePendens:errors.length, imperativalInfinitive:moodErrors.length },
    unavailableMorphology: {
        nominativePendens:report.nominativeCaseConflicts.filter(x => x.issue === 'case_unavailable').length,
        imperativalInfinitive:report.infinitiveMoodConflicts.filter(x => x.issue === 'mood_unavailable').length
    },
    EPH_1_10:report.eph110,
    candidateEvidenceGate: { strict:STRICT_EVIDENCE, zeroEvidenceTypes },
    candidateEvidenceStats:report.candidateStats
}, null, 2));

if (VERBOSE) {
    console.log('\nNominative-pendens case conflicts:\n' + JSON.stringify(errors, null, 2));
    console.log('\nImperatival-infinitive mood conflicts:\n' + JSON.stringify(moodErrors, null, 2));
}
if (failures.length || errors.length || moodErrors.length || (STRICT_EVIDENCE && zeroEvidenceTypes.length)) {
    for (const f of failures) console.error('FAIL', f);
    if (STRICT_EVIDENCE && zeroEvidenceTypes.length) console.error('FAIL: candidates with no matched evidence signals', JSON.stringify(zeroEvidenceTypes));
    process.exitCode = 1;
} else {
    console.log('\nPASS: no detected morphology/type contradictions in scanned NT candidates.');
}
