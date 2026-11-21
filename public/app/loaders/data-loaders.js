let abbottSmithDict = null;
let abbottSmithDictPromise = null;
/* ══════════════════════════════════════════
   Semantic layer data — Lexicon / Composition
   ══════════════════════════════════════════ */
let _lexiconData           = null;
let _compositionData       = null;
/* #105：語彙データは1本ずつ独立に取得する（1本の失敗で他を巻き込まない）。
   成功・確定の不在（404）は固定する。一時的な失敗の1本だけは {} で埋めて表示を続け（消費側は {} を前提にしている）、
   次の呼び出しでその1本だけを1回再取得する。契約（_glossDictReady が消費）：返す Promise は必ず解決し、拒否しない。 */
const _SEM_SPECS = [
    ['lex',  '../assets/data/lexicon/lexicon-lite.json',            d => {
        _lexiconData = d;
        /* Phase 4-C: ReadingLexicon を lexicon-lite で補強する
           （glossJa / abbottSmith — Phase 5 Semantic の語彙情報源）。
           失敗しても ReadingEngine の挙動には影響しない（deponent は基本層にある）。 */
        try { window.App?.readingLexicon?.enrich(_lexiconData); } catch (_) {}
    }],
    ['comp', '../assets/data/lexicon/lexicon-composition.json',     d => { _compositionData = d; }],
];
const _semPending = new Set(_SEM_SPECS.map(x => x[0]));   /* まだ確定していない（未取得／一時失敗の）データ */
let _semInflight = null;
function _ensureSemanticData() {
    if (_semPending.size === 0) return Promise.resolve();
    if (_semInflight) return _semInflight;
    const targets = _SEM_SPECS.filter(x => _semPending.has(x[0]));
    _semInflight = Promise.all(targets.map(async ([key, url, set]) => {
        const o = await _fetchJsonOutcome(url);
        if (o.ok) {
            set((o.data && typeof o.data === 'object') ? o.data : {});
            _semPending.delete(key);
        } else {
            console.warn('[SemanticData] load failed (will retry on next display):', url);
            set({});   /* 今回の表示は空で続ける（固定はしない：_semPending に残す） */
        }
    })).catch(e => {
        console.warn('[SemanticData] load error:', e);
    }).then(() => { _semInflight = null; });
    return _semInflight;
}
function loadDict() {
    if (abbottSmithDict) return Promise.resolve(abbottSmithDict);
    if (abbottSmithDictPromise) return abbottSmithDictPromise;

    abbottSmithDictPromise = (async () => {
        try {
            const resAbbott = await fetch('../assets/data/abbott-smith.tsv');
            if (!resAbbott.ok) throw new Error(`Abbott-Smith fetch failed: ${resAbbott.status}`);
            const textAbbott = await resAbbott.text();
            const parsed = {};
            textAbbott.split(/\r?\n/).forEach(row => {
                const cols = row.split('\t');
                const strong = String(cols[0]).trim();
                if (strong) parsed[strong] = {
                    description: cols[4]?.trim() || "",
                    descriptionEn: (cols[2]?.trim() || "").replace(/^\d+\s+/, "").replace(/^†\s*/, ""),
                    /* #107: 6列目 description_es（任意）。翻訳文は整った文として入る前提のため、descriptionEn の整形（番号・† の除去）はかけない */
                    descriptionEs: cols[5]?.trim() || "",
                    /* #119: 7列目 description_sv（任意）。ES と同じく整形はかけない。値が空の語は英語原文へ落とす（表示側） */
                    descriptionSv: cols[6]?.trim() || "",
                };
            });
            abbottSmithDict = parsed;
            return abbottSmithDict;
        } catch (e) {
            /* 失敗時は未読込状態を維持し、次回の要求で再試行できるようにする。 */
            console.error("Dict Error:", e);
            return null;
        } finally {
            abbottSmithDictPromise = null;
        }
    })();

    return abbottSmithDictPromise;
}
const _renderingVariantsPromises = {};
function _loadRenderingVariants() {
    /* 訳し分けデータは UI 言語の基底訳のものを使う（JA→JA1955、EN→WEB）。
       ファイルが無い言語では null（静寂）。 */
    const transId = ((typeof window !== 'undefined' && window.I18N && I18N.baseTranslation) || 'JA1955');
    if (!_renderingVariantsPromises[transId]) {
        _renderingVariantsPromises[transId] = _fetchJsonOutcome(new URL('assets/data/rendering-variants/' + transId + '.json', document.baseURI).href)
            .then(o => {
                /* #105：一時的な失敗は固定しない（次回の要求で再試行）。404（ファイル無しの言語）は null で確定。 */
                if (!o.ok) delete _renderingVariantsPromises[transId];
                return o.data;
            });
    }
    return _renderingVariantsPromises[transId];
}
/* 文脈導線（第4段階トラックb）: 章データの取得は章ごとにキャッシュする */
const _syntaxCtxChapterCache = new Map();
async function _fetchSyntaxChapterTokens(book, chapter) {
    const key = `${book}/${chapter}`;
    if (_syntaxCtxChapterCache.has(key)) return _syntaxCtxChapterCache.get(key);
    const testament = (typeof SB_BOOKS !== 'undefined' && SB_BOOKS.lxx && SB_BOOKS.lxx.some(b => b.key === book)) ? 'lxx' : 'nt';
    const o = await _fetchJsonOutcome(new URL(`bible_data/${testament}/${book}/${chapter}.json`, document.baseURI).href);
    const tokens = Array.isArray(o.data) ? o.data : null;
    if (o.ok) _syntaxCtxChapterCache.set(key, tokens);   /* #105：一時的な失敗は固定しない（次回の要求で再試行） */
    return tokens;
}
/* ══════════════════════════════════════════════════════════════════
   Reading Hint v1（SP-12）— 編集済み Editorial Asset の加算表示のみ。
   解析・生成・推論はしない（Runtime に AI なし）。engine / ReadingFormatter /
   Reading Memo / bible_data / StudyPanel には一切関与しない。
   失敗しても本文表示は不変（Hint を出さないだけ）。
   ════════════════════════════════════════════════════════════════ */
let _readingHintIndex = null; // Map: `${bookKey}|${chapter}` -> [published hint, ...]
let _readingHintInflight = null;
async function _loadReadingHints() {
    if (_readingHintIndex) return;
    if (_readingHintInflight) return _readingHintInflight;
    _readingHintInflight = (async () => {
        const o = await _fetchJsonOutcome('../assets/data/reading-hints.json');
        if (!o.ok) return;   /* #105：失敗しても本文は不変（Hint を出さない）。索引は固定せず、次の表示で1回再試行する */
        const arr = Array.isArray(o.data) ? o.data : [];
        const idx = new Map();
        for (const h of arr) {
            if (!h || h.status !== 'published' || !h.book || h.chapter == null) continue;
            const k = h.book + '|' + h.chapter;
            if (!idx.has(k)) idx.set(k, []);
            idx.get(k).push(h);
        }
        _readingHintIndex = idx;
    })().finally(() => { _readingHintInflight = null; });
    return _readingHintInflight;
}
/* ═════════════════════════════════════════════════════════════════
 * 節全体の読書メモ — ReadingFormatter 駆動版
 *
 * 旧 _buildPassageNote（CONJ_FEEL辞書 / imperatives・perfects・
 * passives・participles ヒューリスティック / METAPHOR辞書 / 呼格判定 /
 * 「原語の語順と品詞の流れは、上の原語の順序から確認できます。」を
 * 含む独自フォールバック文）は完全に削除した。
 *
 * UI生成の唯一ソースは clause-analyzer.js の ReadingFormatter.format()。
 * 本ブロックの役割は「SyntaxAnalyzer→PhraseAnalyzer→ClauseAnalyzer の
 * パイプラインを実行し、検出された節ごとに ReadingFormatter へ渡す」
 * という配線のみで、文章そのものは一切生成しない。
 *
 * フォールバックルール:
 *   - words が空 → null（節を組まない）
 *   - パイプライン未初期化 / 初期化失敗 → null（代替文で埋めない）
 *   - 節が1つも検出されない → null（多くの平叙文がこれに該当する。
 *     旧実装はここで汎用フォールバック文を出していたが、今回はそれを
 *     廃止し、読書メモという「言うことがある時だけ話す」静寂優先の
 *     設計にする）
 *   - 検出された節がいずれも discourse.type を持たない → null
 *
 * discourse.type / clause.type / marker / confidence は、
 * ReadingFormatter.format() の戻り値（{title, summary, hint,
 * confidenceText}）にしか触れないため、本ブロックのコードには
 * そもそも一切登場しない（Guard Rule は ReadingFormatter 側で
 * assertReadingTextSafe() により多重に保証済み）。
 * ═════════════════════════════════════════════════════════════════ */

let _wallacePipeline       = null;  // { sa, pa, ca, rf } キャッシュ（初回のみ registry を fetch）
let _wallacePipelineFailed = false; // 初期化に失敗した場合は再試行せず静かに諦める
async function _ensureWallacePipeline() {
    if (_wallacePipeline || _wallacePipelineFailed) return _wallacePipeline;
    try {
        const [syntaxRegistry, phraseRegistry, clauseRegistry, readingPolicy] = await Promise.all([
            fetch('../assets/data/syntax-registry.json').then(r => r.json()),
            fetch('../assets/data/phrase-registry.json').then(r => r.json()),
            fetch('../assets/data/clause-registry.json').then(r => r.json()),
            fetch('../assets/data/reading-policy.json').then(r => r.json()),
        ]);
        const SyntaxAnalyzerCls = window.SyntaxAnalyzer || window.App?.syntax?.Analyzer;
        const PhraseAnalyzerCls = window.PhraseAnalyzer || window.App?.syntax?.PhraseAnalyzer;
        const ClauseAnalyzerCls = window.App?.syntax?.ClauseAnalyzer;
        const ReadingFormatterCls = window.App?.syntax?.ReadingFormatter;
        if (!SyntaxAnalyzerCls || !PhraseAnalyzerCls || !ClauseAnalyzerCls || !ReadingFormatterCls) {
            throw new Error('required analyzer classes not loaded');
        }
        /* Reading Policy（唯一の機械可読定義源）: 現象単位の scope / priority /
           verse_source を id 引きの索引にする。scope・priority をコードに書くことは
           禁止 — 変更は必ず assets/data/reading-policy.json で行う。 */
        const policyById = {};
        for (const ph of (readingPolicy.phenomena || [])) {
            for (const id of (ph.ids || [])) policyById[id] = ph;
        }
        _wallacePipeline = {
            sa: new SyntaxAnalyzerCls(syntaxRegistry),
            pa: new PhraseAnalyzerCls(phraseRegistry),
            ca: new ClauseAnalyzerCls(clauseRegistry),
            rf: new ReadingFormatterCls(),
            policy: { rules: readingPolicy.display_rules || {}, byId: policyById },
        };
    } catch (e) {
        console.warn('[Wallace] pipeline init failed:', e);
        _wallacePipelineFailed = true;
        _wallacePipeline = null;
    }
    return _wallacePipeline;
}
let _peekLiteData = null;
let _peekLitePromise = null;
function _peekEnsureLite() {
    if (_peekLitePromise) return;
    _peekLitePromise = fetch('../assets/data/lexicon/lexicon-lite.json')
        .then(r => _okJsonOrNull(r))
        .then(d => {
            _peekLiteData = (d && typeof d === 'object') ? d : null;
            /* カードが開いたままなら、回数の行を差し込む */
            if (_peekEl && _peekLemmaId) {
                const c = _peekCount(_peekLemmaId);
                const line = _peekEl.querySelector('.word-peek-count');
                if (line && c != null) {
                    line.textContent = _ntCountText(c);
                    line.hidden = false;
                }
                /* 英語UI: 辞書グロスの行も、lite 到着後に差し込む */
                if (window.I18N && I18N.lang !== 'ja') {
                    const gl = _peekEl.querySelector('.word-peek-glosses');
                    const en = _uiSenseText(_peekLemmaId);
                    if (gl && en && !gl.textContent) { gl.textContent = en; gl.hidden = false; }
                }
            }
        })
        .catch(() => { _peekLitePromise = null; });
}
