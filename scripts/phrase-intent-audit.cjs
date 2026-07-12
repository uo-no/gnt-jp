#!/usr/bin/env node
/**
 * phrase-intent-audit.cjs — Phrase Reading 意味層 NT全巻監査（Phase H）
 *
 * 実行: node scripts/phrase-intent-audit.cjs
 * 出力: scripts/output/phrase-intent-audit.{json,md}
 *
 * 監査レイヤー専用（読み取りのみ）: Analyzer / Registry / Projection /
 * 表示コードには一切影響しない。表示ロジックは index.html の
 * __PHRASE_READING__ / __OBSERVATION__ / __VERSE_NOTE__ マーカー区間から
 * **実物ソースを抽出して**実行する（監査用の再実装を作らない）。
 *
 * 監査項目（docs/phrase-reading.md Phase F / H）:
 *   1. 表示率     — 構造層・意味層のトークン別/節別表示率、Intent 分布
 *   2. 重複       — 同一ブロック内の同一文
 *   3. 文法用語漏洩 — 禁止語リスト（引用「…」内の本文は対象外）
 *   4. Passage Note との重複 — 節文と同一文
 *   5. Observation との重複  — 語文と同一文
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');

// ── グローバル形態論デコーダ（syntax-analyzer.js が参照する） ───────────────
const _TENSE  = {P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect'};
const _VOICE  = {A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive'};
const _MOOD   = {I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle'};
const _CASE   = {N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative'};
const _NUMBER = {S:'singular',P:'plural'};
const _GENDER = {M:'masculine',F:'feminine',N:'neuter'};
const _CLS2P  = {
    'verb':'V','noun':'N','adjective':'A','adj':'A','article':'T','det':'T',
    'preposition':'P','prep':'P','conjunction':'C','conj':'C','adverb':'D','adv':'D',
    'particle':'X','ptcl':'X','pronoun':'R','pron':'R',
};

global.entryPosCode = function(e) {
    if (e.pos)   return String(e.pos).replace(/-$/, '').toUpperCase();
    if (e.class) return _CLS2P[String(e.class).toLowerCase()] || '';
    return '';
};

global.decodeMorph = function(e) {
    const n = v => (!v || v === '-') ? '' : v;
    if (e.tense || e.mood || e.voice) {
        return {
            pos: global.entryPosCode(e),
            tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
            case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person),
        };
    }
    if (e.morph && typeof e.morph === 'object') {
        const m = e.morph;
        return {
            pos: n(e.pos || '').replace(/-$/, ''),
            tense: n(m.tense), voice: n(m.voice), mood: n(m.mood),
            case: n(m.case), number: n(m.number), gender: n(m.gender), person: n(m.person),
        };
    }
    const raw   = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const pos   = n(e.pos || parts[0] || '').replace(/-$/, '');
    if (pos.toUpperCase() === 'V' && parts[1]) {
        const seg = parts[1], off = /^[0-9]/.test(seg) ? 1 : 0;
        return {
            pos, tense: _TENSE[seg[off]] || '', voice: _VOICE[seg[off + 1]] || '',
            mood: _MOOD[seg[off + 2]] || '', person: seg[off + 3] || '',
            number: _NUMBER[seg[off + 4]] || '', gender: '', case: '',
        };
    }
    if (parts[1]) {
        const seg = parts[1], hp = ['1','2','3'].includes(seg[0]), b = hp ? seg.slice(1) : seg;
        return {
            pos, tense: '', voice: '', mood: '', person: hp ? seg[0] : '',
            case: _CASE[b[0]] || '', number: _NUMBER[b[1]] || '', gender: _GENDER[b[2]] || '',
        };
    }
    return { pos, tense: '', voice: '', mood: '', case: '', number: '', gender: '', person: '' };
};

global.cleanText = function(e) {
    return (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
};

// ── モジュール・データロード ────────────────────────────────────────────────
/* package.json の "type": "module" 下でも core/*.js を CJS として読む
   （genitive-regression-test.cjs と同じ手法） */
const vm = require('vm');
function requireCjs(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const mod  = { exports: {}, id: filePath, filename: filePath, loaded: false };
    const wrapped = `(function(module,exports,require,__dirname,__filename){\n${code}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: filePath, displayErrors: true });
    fn(mod, mod.exports, require, path.dirname(filePath), filePath);
    return mod.exports;
}

const { SyntaxAnalyzer, ContextBuilder } = requireCjs(path.join(PUBLIC, 'core', 'syntax-analyzer.js'));
const { PhraseAnalyzer }                 = requireCjs(path.join(PUBLIC, 'core', 'phrase-analyzer.js'));
const { ClauseAnalyzer, ReadingFormatter } = requireCjs(path.join(PUBLIC, 'core', 'clause-analyzer.js'));
const { ReadingSupportProjection }       = requireCjs(path.join(PUBLIC, 'core', 'reading-projection.js'));

const loadJson = rel => JSON.parse(fs.readFileSync(path.join(PUBLIC, rel), 'utf8'));
const syntaxRegistry = loadJson('assets/data/syntax-registry.json');
const phraseRegistry = loadJson('assets/data/phrase-registry.json');
const clauseRegistry = loadJson('assets/data/clause-registry.json');
const readingPolicy  = loadJson('assets/data/reading-policy.json');
const booksMaster    = loadJson('books.json');

const sa = new SyntaxAnalyzer(syntaxRegistry);
const pa = new PhraseAnalyzer(phraseRegistry);
const ca = new ClauseAnalyzer(clauseRegistry);
const rf = new ReadingFormatter();

const policyById = {};
for (const ph of (readingPolicy.phenomena || [])) {
    for (const id of (ph.ids || [])) policyById[id] = ph;
}
const policy = { rules: readingPolicy.display_rules || {}, byId: policyById };

// ── 表示層の実物ソース抽出（index.html） ────────────────────────────────────
const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');

function extractBlock(beginMarker, endMarker) {
    const b = html.indexOf(beginMarker);
    const e = html.indexOf(endMarker);
    if (b < 0 || e < 0 || e <= b) throw new Error('marker not found: ' + beginMarker);
    return html.slice(b, e);
}

const displaySrc = [
    extractBlock('/* __PHRASE_READING_BEGIN__', '/* __PHRASE_READING_END__ */'),
    extractBlock('/* __OBSERVATION_BEGIN__',    '/* __OBSERVATION_END__ */'),
    extractBlock('/* __VERSE_NOTE_BEGIN__',     '/* __VERSE_NOTE_END__ */'),
].join('\n');

/* サンドボックス: 実物の表示関数群を、UI 依存部だけスタブして実行する。
   env.proj は節ごとに差し替える（_getReadingSupportProjection の代替）。 */
const sandboxFactory = new Function('env', '_wallacePipeline', `
    const _escH = s => String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    const _getReadingSupportProjection = async () => env.proj;
    ${displaySrc}
    return { _buildPhraseReadingHTML, _buildObservationHTML,
             _phraseIntentLines, _PHRASE_INTENT_TEXT,
             _collectVerseNoteSentences, _policyScopes };
`);

const env = { proj: null };
const ui  = sandboxFactory(env, { policy });

// ── 監査ユーティリティ ──────────────────────────────────────────────────────
const htmlToLines = h => h
    ? [...String(h).matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(m => m[1])
    : [];

/* 禁止語（docs/phrase-reading.md Phase F ②）。引用「…」内の本文は対象外 */
const FORBIDDEN = /属格|与格|対格|主格|分詞|不定詞|迂言|絶対|同格|修飾|叙述|限定|構文|時制|接続法|希求法|命令法|Wallace|アオリスト|現在形|完了形|未完了|(?<![「])相(?![」])|態|(?<![律方文][ ]?)法/;
const stripQuotes = s => String(s).replace(/「[^」]*」/g, '「」');

/* Intent 選択の内訳記録用（表示ロジックには使わない — 実物は _phraseIntentLines） */
function bestPhraseCandidate(proj, idx) {
    const w = proj && proj.words ? proj.words[idx] : null;
    if (!w || !w.categories) return null;
    const rule    = policy.rules.phrase_reading || {};
    const minConf = policy.rules.min_confidence ?? 0.40;
    const prios   = rule.priorities || [];
    let best = null;
    for (const c of Object.values(w.categories)) {
        if (!c || c.confidence < minConf) continue;
        const ph = policyById[c.id];
        if (!ph || !ph.intent) continue;
        const scopes = ui._policyScopes(ph);
        if (!scopes.includes('phrase')) continue;
        const rank = prios.indexOf(ph.priority);
        if (rank < 0) continue;
        if (!best || rank < best.rank ||
            (rank === best.rank && c.confidence > best.confidence)) {
            best = { rank, confidence: c.confidence, id: c.id,
                     phenomenon: ph.phenomenon, intent: ph.intent };
        }
    }
    return best;
}

// ── NT 全巻スキャン ─────────────────────────────────────────────────────────
async function main() {
    const stats = {
        verses: 0, tokens: 0,
        structuralTokens: 0,          // 構造層ブロックが出たトークン
        semanticTokens: 0,            // 意味層（3文）が出たトークン
        semanticEligibleSilent: 0,    // 意味層候補はあるが構造層沈黙で非表示
        semanticVerses: new Set(),    // 意味層が出た節
        structuralVerses: new Set(),
        intentCounts: {},             // intent → token数
        phenomenonCounts: {},         // phenomenon → token数
        blockedPhenomenonCounts: {},  // 構造層沈黙で非表示の現象 → token数
        blockedIntentCounts: {},      // 同 intent → token数
        blockDupTokens: [],           // ブロック内重複
        forbiddenHits: new Map(),     // 漏洩文 → {count, sampleRef}
        passageDupes: [],             // Passage Note と同一文
        observationDupes: [],         // Observation と同一文
        observationShownWithSemantic: 0,
        errors: [],
    };

    const books = booksMaster.NT.map(b => b.key);
    for (const book of books) {
        for (let ch = 1; ch <= 200; ch++) {
            const fp = path.join(PUBLIC, 'bible_data', 'nt', book, `${ch}.json`);
            if (!fs.existsSync(fp)) break;
            const chapterTokens = JSON.parse(fs.readFileSync(fp, 'utf8'));
            const byVerse = new Map();
            for (const t of chapterTokens) {
                const key = t.ref.split('!')[0];
                if (!byVerse.has(key)) byVerse.set(key, []);
                byVerse.get(key).push(t);
            }

            for (const [vref, tokens] of byVerse) {
                stats.verses++;
                stats.tokens += tokens.length;
                let proj = null, clauseResults = [];
                try {
                    const all           = sa.analyzeAll(tokens);
                    const syntaxResults = all.results.map(r => r.output);
                    const phraseResults = pa.analyze({ tokens, syntaxResults });
                    clauseResults       = ca.analyze({ tokens, syntaxResults, phraseResults });
                    proj = ReadingSupportProjection.build({
                        tokens, syntaxResults, clauseResults,
                        contextBuilder: ContextBuilder, registry: sa.registry,
                    });
                } catch (e) {
                    stats.errors.push(`${vref}: ${e.message}`);
                    continue;
                }
                if (!proj) continue;
                env.proj = proj;

                /* Passage Note（節文）: projection 経路 + discourse 経路 */
                const verseNotes = new Set(ui._collectVerseNoteSentences(proj, policy));
                for (const clause of clauseResults) {
                    try {
                        const d = ca.classifyDiscourseRelation(tokens, clause);
                        if (!d?.type || d.type === 'UNCLASSIFIED') continue;
                        const f = rf.format({ discourse: d, type: clause.type });
                        if (f && f.summary) verseNotes.add(f.summary);
                    } catch (_) { /* 節文が無いだけ */ }
                }

                for (let idx = 0; idx < tokens.length; idx++) {
                    let phraseHTML = null;
                    try { phraseHTML = await ui._buildPhraseReadingHTML(tokens, idx); }
                    catch (e) { stats.errors.push(`${vref}!${idx + 1} phrase: ${e.message}`); }
                    const lines = htmlToLines(phraseHTML);
                    const intentLines = ui._phraseIntentLines(proj, idx);
                    const best = bestPhraseCandidate(proj, idx);

                    if (lines.length > 0) {
                        stats.structuralTokens++;
                        stats.structuralVerses.add(vref);
                    }
                    const semanticShown = lines.length > 0 && intentLines.length > 0;
                    if (semanticShown) {
                        stats.semanticTokens++;
                        stats.semanticVerses.add(vref);
                        if (best) {
                            stats.intentCounts[best.intent] =
                                (stats.intentCounts[best.intent] || 0) + 1;
                            stats.phenomenonCounts[best.phenomenon] =
                                (stats.phenomenonCounts[best.phenomenon] || 0) + 1;
                        }
                    } else if (intentLines.length > 0) {
                        stats.semanticEligibleSilent++;
                        if (best) {
                            stats.blockedPhenomenonCounts[best.phenomenon] =
                                (stats.blockedPhenomenonCounts[best.phenomenon] || 0) + 1;
                            stats.blockedIntentCounts[best.intent] =
                                (stats.blockedIntentCounts[best.intent] || 0) + 1;
                        }
                    }

                    /* ② ブロック内重複 */
                    if (new Set(lines).size !== lines.length) {
                        stats.blockDupTokens.push(`${vref}!${idx + 1}`);
                    }
                    /* ③ 文法用語漏洩（引用内は対象外） */
                    for (const line of lines) {
                        const bare = stripQuotes(line);
                        if (FORBIDDEN.test(bare)) {
                            const k = line.slice(0, 60);
                            const rec = stats.forbiddenHits.get(k) || { count: 0, sample: `${vref}!${idx + 1}` };
                            rec.count++;
                            stats.forbiddenHits.set(k, rec);
                        }
                    }
                    /* ④ Passage Note との重複 */
                    for (const line of lines) {
                        if (verseNotes.has(line)) {
                            stats.passageDupes.push(`${vref}!${idx + 1}: ${line.slice(0, 40)}`);
                        }
                    }
                    /* ⑤ Observation との重複 */
                    let obsHTML = null;
                    try { obsHTML = await ui._buildObservationHTML(tokens, idx, ['', phraseHTML || '']); }
                    catch (_) { /* Observation 側の失敗は本監査の対象外 */ }
                    const obsLines = htmlToLines(obsHTML);
                    if (semanticShown && obsLines.length > 0) stats.observationShownWithSemantic++;
                    for (const ol of obsLines) {
                        if (lines.includes(ol)) {
                            stats.observationDupes.push(`${vref}!${idx + 1}: ${ol.slice(0, 40)}`);
                        }
                    }
                }
            }
        }
        process.stderr.write(`  scanned ${book}\n`);
    }

    // ── 集計・出力 ──────────────────────────────────────────────────────────
    const pct = (n, d) => d ? (100 * n / d).toFixed(2) + '%' : '-';
    const result = {
        generated: new Date().toISOString(),
        totals: { verses: stats.verses, tokens: stats.tokens },
        display_rate: {
            structural_tokens: stats.structuralTokens,
            structural_token_rate: pct(stats.structuralTokens, stats.tokens),
            structural_verses: stats.structuralVerses.size,
            semantic_tokens: stats.semanticTokens,
            semantic_token_rate: pct(stats.semanticTokens, stats.tokens),
            semantic_verses: stats.semanticVerses.size,
            semantic_verse_rate: pct(stats.semanticVerses.size, stats.verses),
            semantic_eligible_but_structural_silent: stats.semanticEligibleSilent,
        },
        intent_distribution: Object.fromEntries(
            Object.entries(stats.intentCounts).sort((a, b) => b[1] - a[1])),
        phenomenon_distribution: Object.fromEntries(
            Object.entries(stats.phenomenonCounts).sort((a, b) => b[1] - a[1])),
        blocked_intent_distribution: Object.fromEntries(
            Object.entries(stats.blockedIntentCounts).sort((a, b) => b[1] - a[1])),
        blocked_phenomenon_distribution: Object.fromEntries(
            Object.entries(stats.blockedPhenomenonCounts).sort((a, b) => b[1] - a[1])),
        audits: {
            block_internal_duplicates: stats.blockDupTokens.length,
            block_internal_duplicate_samples: stats.blockDupTokens.slice(0, 10),
            forbidden_term_leaks: stats.forbiddenHits.size,
            forbidden_term_samples: [...stats.forbiddenHits.entries()].slice(0, 10)
                .map(([line, r]) => ({ line, count: r.count, sample: r.sample })),
            passage_note_duplicates: stats.passageDupes.length,
            passage_note_duplicate_samples: stats.passageDupes.slice(0, 10),
            observation_duplicates: stats.observationDupes.length,
            observation_duplicate_samples: stats.observationDupes.slice(0, 10),
            observation_shown_alongside_semantic: stats.observationShownWithSemantic,
        },
        pipeline_errors: stats.errors.length,
        pipeline_error_samples: stats.errors.slice(0, 10),
    };

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'phrase-intent-audit.json'),
        JSON.stringify(result, null, 2) + '\n');

    const md = [];
    md.push('# Phrase Reading 意味層 NT全巻監査（Phase H）');
    md.push('');
    md.push(`生成: ${result.generated} / 対象: NT ${stats.verses} 節・${stats.tokens} トークン`);
    md.push('');
    md.push('## 1. 表示率');
    md.push('');
    md.push('| 指標 | 値 |');
    md.push('|---|---|');
    md.push(`| 構造層ブロック表示トークン | ${stats.structuralTokens}（${result.display_rate.structural_token_rate}） |`);
    md.push(`| 意味層（3文）表示トークン | ${stats.semanticTokens}（${result.display_rate.semantic_token_rate}） |`);
    md.push(`| 意味層が出る節 | ${stats.semanticVerses.size} / ${stats.verses}（${result.display_rate.semantic_verse_rate}） |`);
    md.push(`| 意味層候補ありだが構造層沈黙 | ${stats.semanticEligibleSilent} トークン |`);
    md.push('');
    md.push('## 2. Intent 分布（意味層表示トークン）');
    md.push('');
    md.push('| Intent | 件数 |');
    md.push('|---|---|');
    for (const [k, v] of Object.entries(result.intent_distribution)) md.push(`| ${k} | ${v} |`);
    md.push('');
    md.push('## 3. 現象分布（上位20）');
    md.push('');
    md.push('| 現象 | 件数 |');
    md.push('|---|---|');
    for (const [k, v] of Object.entries(result.phenomenon_distribution).slice(0, 20)) md.push(`| ${k} | ${v} |`);
    md.push('');
    md.push('## 3b. 構造層沈黙により非表示の意味層候補（Intent 別）');
    md.push('');
    md.push('| Intent | 件数 |');
    md.push('|---|---|');
    for (const [k, v] of Object.entries(result.blocked_intent_distribution)) md.push(`| ${k} | ${v} |`);
    md.push('');
    md.push('### 現象別（上位20）');
    md.push('');
    md.push('| 現象 | 件数 |');
    md.push('|---|---|');
    for (const [k, v] of Object.entries(result.blocked_phenomenon_distribution).slice(0, 20)) md.push(`| ${k} | ${v} |`);
    md.push('');
    md.push('## 4. 品質監査');
    md.push('');
    md.push('| 監査 | 結果 |');
    md.push('|---|---|');
    md.push(`| ブロック内の同一文重複 | ${result.audits.block_internal_duplicates} 件 |`);
    md.push(`| 文法用語漏洩（引用外） | ${result.audits.forbidden_term_leaks} 種 |`);
    md.push(`| Passage Note と同一文 | ${result.audits.passage_note_duplicates} 件 |`);
    md.push(`| Observation と同一文 | ${result.audits.observation_duplicates} 件 |`);
    md.push(`| 意味層と Observation の同時表示 | ${result.audits.observation_shown_alongside_semantic} トークン |`);
    md.push(`| パイプライン例外 | ${result.pipeline_errors} 件 |`);
    md.push('');
    if (result.audits.forbidden_term_samples.length) {
        md.push('### 漏洩サンプル');
        md.push('');
        for (const s of result.audits.forbidden_term_samples) {
            md.push(`- ${s.line}（${s.count}件・例 ${s.sample}）`);
        }
        md.push('');
    }
    fs.writeFileSync(path.join(OUT, 'phrase-intent-audit.md'), md.join('\n') + '\n');

    console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
