#!/usr/bin/env node
/**
 * build-syntax-index.js — Phase E: IndexBuilder
 *
 * 処理フロー:
 *   1. syntax-registry.json を読み込み new SyntaxAnalyzer(registryJson) を生成
 *   2. bible_data/{nt,lxx}/{BOOK_KEY}/{ch}.json を全書物・全章 fetch
 *   3. 各章の全トークンに対して syntaxAnalyzer.analyze() を実行
 *   4. candidates[].confidence >= 0.3 かつ上位1～2候補を採用
 *   5. syntaxId ごとに TokenRef[] を蓄積し sortKey 昇順でソート
 *   6. syntax-index/{typeId}.json に書き出す
 *   7. syntax-index/meta.json に SyntaxIndexMeta を書き出す
 *
 * 実行:
 *   node scripts/build-syntax-index.js [--base-url http://localhost:8080] [--nt-only]
 *
 * オプション:
 *   --base-url <url>   bible_data の取得先ベース URL（デフォルト: http://localhost:8080）
 *   --nt-only          NT のみ処理（デフォルト: false、全書物処理）
 *   --out-dir <dir>    出力先ディレクトリ（デフォルト: ./syntax-index）
 *   --analyzer <path>  syntax-analyzer.js のパス（デフォルト: ./js/syntax-analyzer.js）
 *   --registry <path>  syntax-registry.json のパス（デフォルト: ./data/syntax-registry.json）
 *   --batch-size <n>   並列 fetch 数（デフォルト: 10）
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── CLI 引数パース ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
    const i = args.indexOf(name);
    return (i !== -1 && args[i + 1]) ? args[i + 1] : defaultVal;
}
const BASE_URL     = getArg('--base-url',  'http://localhost:8080');
const OUT_DIR      = getArg('--out-dir',   './syntax-index');
const ANALYZER_PATH = getArg('--analyzer', './js/syntax-analyzer.js');
const REGISTRY_PATH = getArg('--registry', './data/syntax-registry.json');
const BATCH_SIZE   = parseInt(getArg('--batch-size', '10'), 10);
const NT_ONLY      = args.includes('--nt-only');

// ── 書物定義: books.json（全ページ・全スクリプト共通の単一の出典）───────────
// search-tool.html / morph-search.html / syntax-search.html はブラウザの
// fetch 経由で books.json を読むが、このスクリプトは Node なので fs で直接読む。
// データの「内容」は books.json 1箇所のみに存在し、ここにコピーは置かない。
const BOOKS_JSON_PATH = path.resolve(__dirname, 'books.json');
if (!fs.existsSync(BOOKS_JSON_PATH)) {
    console.error(`[ERROR] books.json が見つかりません: ${BOOKS_JSON_PATH}`);
    process.exit(1);
}
const booksMaster = JSON.parse(fs.readFileSync(BOOKS_JSON_PATH, 'utf8'));
const ALL_BOOKS = [...booksMaster.NT, ...booksMaster.OT].map(b => ({ key: b.key, ch: b.chapters }));
const NT_BOOKS  = new Set(booksMaster.NT.map(b => b.key));

// BOOK_ORDER: similar-syntax-search-spec.md § 3-3 準拠
// NT: 1–27 (MAT=1 … REV=27), LXX: 28以降
const BOOK_ORDER = {};
ALL_BOOKS.forEach((b, i) => { BOOK_ORDER[b.key] = i + 1; });

// 処理対象
const TARGET_BOOKS = NT_ONLY
    ? ALL_BOOKS.filter(b => NT_BOOKS.has(b.key))
    : ALL_BOOKS;

// ── 章数の実ファイル検証（books.json の宣言 vs bible_data/ の実際のファイル）───
// ブラウザ側（book-master.js）はファイルシステムを読めないため境界プローブで
// 代替検証するが、Node はここで実ディレクトリを直接スキャンして正確に検証できる。
function validateChapterCounts() {
    const warnings = [];
    for (const b of ALL_BOOKS) {
        const sub = NT_BOOKS.has(b.key) ? 'nt' : 'lxx';
        const dir = path.join(__dirname, 'bible_data', sub, b.key);
        if (!fs.existsSync(dir)) {
            warnings.push({ key: b.key, issue: 'missing_directory', dir });
            continue;
        }
        const actualChapters = fs.readdirSync(dir)
            .filter(f => f.endsWith('.json'))
            .map(f => parseInt(f.replace(/\.json$/, ''), 10))
            .filter(n => !Number.isNaN(n));
        const actualMax = actualChapters.length ? Math.max(...actualChapters) : 0;
        if (actualMax !== b.ch) {
            warnings.push({ key: b.key, issue: 'chapter_count_mismatch', declared: b.ch, actual: actualMax });
        }
    }
    if (warnings.length) {
        console.error(`[ERROR] books.json の章数と実ファイルが ${warnings.length} 件で不一致です:`);
        for (const w of warnings) {
            if (w.issue === 'missing_directory') {
                console.error(`  - ${w.key}: ディレクトリが存在しません (${w.dir})`);
            } else {
                console.error(`  - ${w.key}: books.json は ${w.declared} 章と宣言、実ファイルは ${w.actual} 章まで存在`);
            }
        }
        const warnPath = path.join(__dirname, 'syntax-index', '_book-validation-warnings.json');
        try {
            fs.mkdirSync(path.dirname(warnPath), { recursive: true });
            fs.writeFileSync(warnPath, JSON.stringify({ generatedAt: new Date().toISOString(), warnings }, null, 2));
            console.error(`[ERROR] 詳細を書き出しました: ${warnPath}`);
        } catch (e) {
            console.error('[ERROR] 警告ファイルの書き出しに失敗:', e.message);
        }
    } else {
        console.log('[OK] books.json の章数は実ファイルと完全に一致しています');
    }
    return warnings;
}

// ── 形態論デコーダ（syntax-search.html と同一ロジック） ────────────────────
const TENSE_CODE  = {P:'present',I:'imperfect',F:'future',A:'aorist',X:'perfect',Z:'pluperfect'};
const VOICE_CODE  = {A:'active',M:'middle',P:'passive',D:'middle deponent',E:'middle or passive',N:'middle or passive'};
const MOOD_CODE   = {I:'indicative',S:'subjunctive',O:'optative',M:'imperative',N:'infinitive',P:'participle'};
const CASE_CODE   = {N:'nominative',G:'genitive',D:'dative',A:'accusative',V:'vocative'};
const NUMBER_CODE = {S:'singular',P:'plural'};
const GENDER_CODE = {M:'masculine',F:'feminine',N:'neuter'};
const CLASS_TO_POS = {
    'verb':'V','noun':'N','adjective':'A','article':'T',
    'preposition':'P','conjunction':'C','adverb':'D',
    'particle':'X','pronoun':'P','relative pronoun':'R',
    'personal pronoun':'P','demonstrative pronoun':'D',
};

function entryPosCode(e) {
    if (e.pos)   return String(e.pos).replace(/-$/, '').toUpperCase();
    if (e.class) return CLASS_TO_POS[String(e.class).toLowerCase()] || '';
    return '';
}

function decodeMorph(e) {
    const n = v => (!v || v === '-') ? '' : v;
    if (e.tense || e.mood || e.voice) return {
        pos: entryPosCode(e), tense: n(e.tense), voice: n(e.voice), mood: n(e.mood),
        case: n(e.case), number: n(e.number), gender: n(e.gender), person: n(e.person),
    };
    if (e.morph && typeof e.morph === 'object') {
        const m = e.morph;
        return {
            pos: n(e.pos || '').replace(/-$/, ''), tense: n(m.tense), voice: n(m.voice),
            mood: n(m.mood), case: n(m.case), number: n(m.number),
            gender: n(m.gender), person: n(m.person),
        };
    }
    const raw   = typeof e.morph === 'string' ? e.morph : '';
    const parts = raw.split('-');
    const pos   = n(e.pos || parts[0] || '').replace(/-$/, '');
    if (pos.toUpperCase() === 'V' && parts[1]) {
        const seg = parts[1], off = /^[0-9]/.test(seg) ? 1 : 0;
        return {
            pos, tense: TENSE_CODE[seg[off]] || '', voice: VOICE_CODE[seg[off + 1]] || '',
            mood: MOOD_CODE[seg[off + 2]] || '', person: seg[off + 3] || '',
            number: NUMBER_CODE[seg[off + 4]] || '', gender: '', case: '',
        };
    }
    if (parts[1]) {
        const seg = parts[1], hp = ['1','2','3'].includes(seg[0]), b = hp ? seg.slice(1) : seg;
        return {
            pos, tense: '', voice: '', mood: '', person: hp ? seg[0] : '',
            case: CASE_CODE[b[0]] || '', number: NUMBER_CODE[b[1]] || '',
            gender: GENDER_CODE[b[2]] || '',
        };
    }
    return { pos, tense: '', voice: '', mood: '', case: '', number: '', gender: '', person: '' };
}

function cleanText(e) {
    return (e.word || e.normalized || e.text || '').replace(/[.,:;·⸀⸁⸂⸃⌈⌉]/g, '').trim();
}

// ── bible_data URL ───────────────────────────────────────────────────────────
function bibleDataUrl(bookKey, ch) {
    const sub = NT_BOOKS.has(bookKey) ? 'nt' : 'lxx';
    return `${BASE_URL}/bible_data/${sub}/${bookKey}/${ch}.json`;
}

// ── ファイルシステムから直接読む場合の試み ───────────────────────────────────
function bibleDataFilePath(bookKey, ch) {
    const sub = NT_BOOKS.has(bookKey) ? 'nt' : 'lxx';
    // スクリプト実行ディレクトリ基準で探す
    const candidates = [
        path.join(process.cwd(), 'bible_data', sub, bookKey, `${ch}.json`),
        path.join(process.cwd(), '..', 'bible_data', sub, bookKey, `${ch}.json`),
        path.join(__dirname, '..', 'bible_data', sub, bookKey, `${ch}.json`),
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

// failedChapters: { key, ch, reason }[] — サイレント化禁止。main() の最後に
// 件数とファイル一覧を必ず console.error し、JSON レポートにも書き出す。
const failedChapters = [];

async function fetchChapter(bookKey, ch) {
    // 1. ファイルシステムから直接読む
    const filePath = bibleDataFilePath(bookKey, ch);
    if (filePath) {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
                data.forEach(e => { e._bookKey = bookKey; });
                return data;
            }
            failedChapters.push({ key: bookKey, ch, reason: `不正なJSON形式（配列ではない）: ${filePath}` });
            return null;
        } catch (e) {
            failedChapters.push({ key: bookKey, ch, reason: `ファイル読み込み/解析エラー: ${filePath} — ${e.message}` });
            return null;
        }
    }

    // 2. ファイルが無い場合は HTTP fetch にフォールバック
    const url = bibleDataUrl(bookKey, ch);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            failedChapters.push({ key: bookKey, ch, reason: `HTTP ${res.status}: ${url}` });
            return null;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
            failedChapters.push({ key: bookKey, ch, reason: `不正なJSON形式（配列ではない）: ${url}` });
            return null;
        }
        data.forEach(e => { e._bookKey = bookKey; });
        return data;
    } catch (e) {
        failedChapters.push({ key: bookKey, ch, reason: `fetch エラー: ${url} — ${e.message}` });
        return null;
    }
}

// ── バッチ処理 ───────────────────────────────────────────────────────────────
async function fetchInBatches(tasks, size, onProgress) {
    let all = [];
    for (let i = 0; i < tasks.length; i += size) {
        const slice = tasks.slice(i, i + size);
        const results = await Promise.allSettled(
            slice.map(t => fetchChapter(t.key, t.ch))
        );
        results.forEach(r => {
            if (r.status === 'fulfilled' && Array.isArray(r.value)) {
                all = all.concat(r.value);
            }
        });
        onProgress(Math.min(i + size, tasks.length), tasks.length);
    }
    return all;
}

// ── メイン ───────────────────────────────────────────────────────────────────
async function main() {
    const startTime = Date.now();

    // 0. books.json の章数が実ファイルと一致しているか検証（構造的欠損の早期検出）
    validateChapterCounts();

    // 1. syntax-analyzer.js を読み込む
    const analyzerAbsPath = path.resolve(process.cwd(), ANALYZER_PATH);
    if (!fs.existsSync(analyzerAbsPath)) {
        console.error(`[ERROR] syntax-analyzer.js が見つかりません: ${analyzerAbsPath}`);
        console.error('  --analyzer オプションでパスを指定してください');
        process.exit(1);
    }
    // Node.js の require は CommonJS のみ対応。
    // syntax-analyzer.js がブラウザ向け ES モジュールの場合はラッパーが必要。
    let SyntaxAnalyzer;
    try {
        // CommonJS export を試みる
        const mod = require(analyzerAbsPath);
        SyntaxAnalyzer = mod.SyntaxAnalyzer || mod.default || mod;
        if (typeof SyntaxAnalyzer !== 'function') throw new Error('SyntaxAnalyzer が関数ではありません');
    } catch (e) {
        // ブラウザグローバル形式（window.SyntaxAnalyzer 等）のフォールバック
        try {
            const src = fs.readFileSync(analyzerAbsPath, 'utf8');
            // グローバルスコープをシミュレートして評価
            const globalProxy = new Proxy({}, {
                get: (_, k) => k === 'SyntaxAnalyzer' ? undefined : global[k],
                set: (_, k, v) => { if (k === 'SyntaxAnalyzer') SyntaxAnalyzer = v; return true; },
            });
            // Function コンストラクタで実行（グローバル this を差し替え）
            new Function('window', 'globalThis', src)(globalProxy, globalProxy);
            if (typeof SyntaxAnalyzer !== 'function') throw new Error('SyntaxAnalyzer クラスが見つかりません');
        } catch (e2) {
            console.error(`[ERROR] syntax-analyzer.js の読み込みに失敗しました`);
            console.error('  CommonJS エラー:', e.message);
            console.error('  グローバル評価エラー:', e2.message);
            process.exit(1);
        }
    }

    // 2. syntax-registry.json を読み込む
    const registryAbsPath = path.resolve(process.cwd(), REGISTRY_PATH);
    if (!fs.existsSync(registryAbsPath)) {
        console.error(`[ERROR] syntax-registry.json が見つかりません: ${registryAbsPath}`);
        process.exit(1);
    }
    let registryJson;
    try {
        registryJson = JSON.parse(fs.readFileSync(registryAbsPath, 'utf8'));
    } catch (e) {
        console.error('[ERROR] syntax-registry.json の解析に失敗しました:', e.message);
        process.exit(1);
    }

    // 3. SyntaxAnalyzer インスタンス生成
    let analyzer;
    try {
        analyzer = new SyntaxAnalyzer(registryJson);
        console.log('[OK] SyntaxAnalyzer 初期化完了');
        console.log(`     Registry version: ${registryJson.meta?.version}`);
    } catch (e) {
        console.error('[ERROR] SyntaxAnalyzer の初期化に失敗しました:', e.message);
        process.exit(1);
    }

    // 4. active type 一覧を収集
    const activeTypes = [];
    const stubTypes   = [];
    const categories  = registryJson.categories || {};
    for (const [, catVal] of Object.entries(categories)) {
        const subcats = catVal.subcategories || [];
        for (const sc of subcats) {
            for (const t of (sc.types || [])) {
                if (t.status === 'active') activeTypes.push(t.id);
                else stubTypes.push(t.id);
            }
        }
    }
    console.log(`[INFO] active types: ${activeTypes.length}, stub types: ${stubTypes.length}`);
    console.log(`[INFO] 対象書物: ${TARGET_BOOKS.length} 書物`);

    // 5. 全章パスを構築
    const tasks = [];
    for (const b of TARGET_BOOKS) {
        for (let c = 1; c <= b.ch; c++) {
            tasks.push({ key: b.key, ch: c });
        }
    }
    console.log(`[INFO] 全章数: ${tasks.length} 章`);

    // 6. 全 bible_data を取得
    console.log('[INFO] bible_data の取得を開始...');
    let lastPct = -1;
    const allTokens = await fetchInBatches(tasks, BATCH_SIZE, (done, total) => {
        const pct = Math.floor(done / total * 100);
        if (pct !== lastPct && pct % 5 === 0) {
            process.stdout.write(`\r  取得進捗: ${done}/${total} (${pct}%)`);
            lastPct = pct;
        }
    });
    console.log(`\n[OK] トークン総数: ${allTokens.length}`);

    // fetch失敗の可視化（サイレント化禁止）— 件数とファイル一覧を必ず出力する
    if (failedChapters.length) {
        console.error(`[ERROR] ${failedChapters.length} 章の取得に失敗しました:`);
        for (const f of failedChapters) console.error(`  - ${f.key} ${f.ch}章: ${f.reason}`);
        const failPath = path.join(__dirname, 'syntax-index', '_fetch-failures.json');
        try {
            fs.mkdirSync(path.dirname(failPath), { recursive: true });
            fs.writeFileSync(failPath, JSON.stringify({ generatedAt: new Date().toISOString(), failedChapters }, null, 2));
            console.error(`[ERROR] 詳細を書き出しました: ${failPath}`);
        } catch (e) {
            console.error('[ERROR] 失敗レポートの書き出しに失敗:', e.message);
        }
    } else {
        console.log('[OK] 全章の取得に成功しました（失敗0件）');
    }

    if (allTokens.length === 0) {
        console.error('[ERROR] トークンが1件も取得できませんでした。');
        console.error('  bible_data/ が以下のいずれかに必要です:');
        console.error('    ./bible_data/{nt|lxx}/{BOOK_KEY}/{ch}.json');
        console.error(`    または --base-url で HTTP サーバーを指定: ${BASE_URL}`);
        process.exit(1);
    }

    // 7. 節単位にグループ化
    const verseMap = new Map();
    
    for (const entry of allTokens) {
        const bookKey = entry.book;
        const chapter = parseInt(entry.chapter, 10);
        const verse   = parseInt(entry.verse, 10);
    
        if (!bookKey || Number.isNaN(chapter) || Number.isNaN(verse)) {
            continue;
        }
    
        const verseKey = `${bookKey}|${chapter}|${verse}`;
    
        if (!verseMap.has(verseKey)) {
            verseMap.set(verseKey, {
                bookKey,
                chapter,
                verse,
                tokens: []
            });
        }
    
        verseMap.get(verseKey).tokens.push(entry);
    }
    
    console.log(`[INFO] 節数: ${verseMap.size}`);
    
    // 8. 各節・各トークンを analyze し、インデックスを構築
    // syntaxIndex: Map<typeId, TokenRef[]>
    const syntaxIndex = new Map();
    for (const id of activeTypes) syntaxIndex.set(id, []);

    let totalTokensProcessed = 0;
    let totalHits = 0;
    let verseCount = 0;
    const verseTotal = verseMap.size;

    console.log('[INFO] 構文解析を開始...');
    lastPct = -1;

    for (const [ref, verse] of verseMap) {
        const { bookKey, chapter, verse: verseNum, tokens } = verse;
        const bookOrder = BOOK_ORDER[bookKey] || 99;
        const sortKey   = bookOrder * 1_000_000 + chapter * 1_000 + verseNum;

        // analyzeAll が実装されている場合はそちらを使用
        // analysisMap: globalIdx → AnalysisOutput（配列インデックス依存を排除）
        let analysisMap; // globalIdx → AnalysisOutput
        if (typeof analyzer.analyzeAll === 'function') {
            try {
                const results = analyzer.analyzeAll(tokens);
                analysisMap = new Map();
                if (Array.isArray(results)) {
                    results.forEach((out, _pos) => {
                        const gIdx = tokens[_pos]?.globalIdx;
                        if (gIdx != null) analysisMap.set(gIdx, out);
                    });
                } else if (results && typeof results === 'object') {
                    Object.entries(results).forEach(([_pos, v]) => {
                        const gIdx = tokens[Number(_pos)]?.globalIdx;
                        if (gIdx != null) analysisMap.set(gIdx, v);
                    });
                }
            } catch { analysisMap = null; }
        }

        for (const token of tokens) {
            totalTokensProcessed++;
            const globalIdx = token.globalIdx;

            let output = null;
            if (analysisMap && globalIdx != null && analysisMap.has(globalIdx)) {
                output = analysisMap.get(globalIdx);
            } else {
                // フォールバック: 個別 analyze
                // ★ targetIdx に配列 indexOf を使用禁止。
                //   analyzer 側が内部で位置を必要とする場合も globalIdx を渡す。
                if (globalIdx == null) continue;
                try {
                    output = analyzer.analyze({
                        target:     token,
                        tokens,
                        targetGlobalIdx: globalIdx,  // ★ SSOT: 配列インデックスではなく globalIdx
                    });
                } catch { continue; }
            }

            if (!output || !Array.isArray(output.candidates) || output.candidates.length === 0) continue;

            const candidates = output.candidates; // confidence 降順

            // 登録ルール（similar-syntax-search-spec.md § 7-1）:
            //   candidates[0] → 必ず登録（confidence >= 0.3 のとき）
            //   candidates[1] → confidence >= 0.5 かつ candidates[0] との差 < 0.2 のとき登録
            //   candidates[2] 以降 → 登録しない

            const word  = cleanText(token);
            const lemma = (token.lemma || '').trim();

            const toRegister = [];
            const c0 = candidates[0];
            if (c0 && c0.confidence >= 0.3 && c0.status === 'active') {
                toRegister.push(c0);
            }
            if (candidates.length >= 2) {
                const c1 = candidates[1];
                if (c1 && c1.status === 'active'
                    && c1.confidence >= 0.5
                    && (c0.confidence - c1.confidence) < 0.2) {
                    toRegister.push(c1);
                }
            }

            for (const cand of toRegister) {
                const typeId = cand.id;
                if (!syntaxIndex.has(typeId)) continue; // active type のみ

                /** @type {TokenRef} */
                const tokenRef = {
                    bookKey:    bookKey,
                    chapter:    chapter,
                    verse:      verseNum,
                    globalIdx:  globalIdx,          // ★ tokenIdx → globalIdx に統一
                    word:       word,
                    lemma:      lemma,
                    confidence: parseFloat(cand.confidence.toFixed(4)),
                    status:     cand.status,
                    sortKey:    sortKey,
                };

                syntaxIndex.get(typeId).push(tokenRef);
                totalHits++;
            }
        }

        verseCount++;
        const pct = Math.floor(verseCount / verseTotal * 100);
        if (pct !== lastPct && pct % 5 === 0) {
            process.stdout.write(`\r  解析進捗: ${verseCount}/${verseTotal} (${pct}%)`);
            lastPct = pct;
        }
    }
    console.log(`\n[OK] 解析完了: ${totalTokensProcessed} トークン, ${totalHits} ヒット`);

    // 9. sortKey 昇順でソート
    for (const [, refs] of syntaxIndex) {
        refs.sort((a, b) => a.sortKey - b.sortKey);
    }

    // 10. 出力ディレクトリを作成
    const outDirAbs = path.resolve(process.cwd(), OUT_DIR);
    fs.mkdirSync(outDirAbs, { recursive: true });

    // 11. type 単位で JSON を書き出す
    let filesWritten = 0;
    for (const [typeId, refs] of syntaxIndex) {
        const outPath = path.join(outDirAbs, `${typeId}.json`);
        fs.writeFileSync(outPath, JSON.stringify(refs, null, 2), 'utf8');
        filesWritten++;
        console.log(`  written: ${typeId}.json (${refs.length} hits)`);
    }

    // 12. meta.json を書き出す
    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    /** @type {SyntaxIndexMeta} */
    const meta = {
        version:      '1.0.0',
        built_at:     new Date().toISOString(),
        registry_ver: registryJson.meta?.version || 'unknown',
        analyzer_ver: '0.1.0',
        total_tokens: totalTokensProcessed,
        total_hits:   totalHits,
        coverage: {
            active_types: activeTypes.length,
            stub_types:   stubTypes.length,
        },
        build_options: {
            nt_only:    NT_ONLY,
            batch_size: BATCH_SIZE,
            elapsed_sec: parseFloat(elapsedSec),
        },
    };
    const metaPath = path.join(outDirAbs, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    console.log(`  written: meta.json`);

    // 13. 完了サマリー
    console.log('');
    console.log('══════════════════════════════════════════');
    console.log('  IndexBuilder 完了');
    console.log(`  処理時間:       ${elapsedSec} 秒`);
    console.log(`  総トークン数:   ${totalTokensProcessed.toLocaleString()}`);
    console.log(`  総ヒット数:     ${totalHits.toLocaleString()}`);
    console.log(`  active types:   ${activeTypes.length}`);
    console.log(`  出力ファイル数: ${filesWritten + 1} (${filesWritten} types + meta.json)`);
    console.log(`  出力先:         ${outDirAbs}`);
    console.log('══════════════════════════════════════════');
}

main().catch(e => {
    console.error('[FATAL]', e);
    process.exit(1);
});
