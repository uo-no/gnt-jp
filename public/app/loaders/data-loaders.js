let abbottSmithDict = null;
let abbottSmithDictPromise = null;
/* ══════════════════════════════════════════
   Semantic layer data — LN / Cluster / Lexicon / Domain Labels
   ══════════════════════════════════════════ */
let _lexiconData           = null;
let _lnIndexData           = null;
let _clusterIndexData      = null;
let _compositionData       = null;
let _semanticDomainLabels  = null;
let _lexiconLoading        = false;

async function _ensureSemanticData() {
    if (_lexiconData && _lnIndexData && _clusterIndexData && _compositionData && _semanticDomainLabels) return;
    if (_lexiconLoading) {
        await new Promise(res => {
            const t = setInterval(() => {
                if (_lexiconData && _lnIndexData && _clusterIndexData && _compositionData && _semanticDomainLabels) { clearInterval(t); res(); }
            }, 60);
        });
        return;
    }
    _lexiconLoading = true;
    try {
        const [lexRes, lnRes, clRes, compRes, sdlRes] = await Promise.all([
            fetch('../assets/data/lexicon/lexicon-lite.json'),
            fetch('../assets/data/index/domains-ln-index.json'),
            fetch('../assets/data/index/domains-cluster-index.json'),
            fetch('../assets/data/lexicon/lexicon-composition.json'),
            fetch('../assets/data/index/semantic-domain-labels.json'),
        ]);
        _lexiconData          = lexRes.ok   ? await lexRes.json()   : {};
        /* Phase 4-C: ReadingLexicon を lexicon-lite で補強する
           （glossJa / abbottSmith / semanticDomains — Phase 5 Semantic の語彙情報源）。
           失敗しても ReadingEngine の挙動には影響しない（deponent は基本層にある）。 */
        try { window.App?.readingLexicon?.enrich(_lexiconData); } catch (_) {}
        _lnIndexData          = lnRes.ok    ? await lnRes.json()    : {};
        _clusterIndexData     = clRes.ok    ? await clRes.json()    : {};
        _compositionData      = compRes.ok  ? await compRes.json()  : {};
        _semanticDomainLabels = sdlRes.ok   ? await sdlRes.json()   : {};
    } catch(e) {
        console.warn('[SemanticData] load failed:', e);
        _lexiconData = _lnIndexData = _clusterIndexData = _compositionData = {};
        _semanticDomainLabels = {};
    }
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
let _renderingVariantsPromise = null;
function _loadRenderingVariants() {
    if (!_renderingVariantsPromise) {
        _renderingVariantsPromise = fetch(new URL('assets/data/rendering-variants/JA1955.json', document.baseURI).href)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null);
    }
    return _renderingVariantsPromise;
}
/* 文脈導線（第4段階トラックb）: 章データの取得は章ごとにキャッシュする */
const _syntaxCtxChapterCache = new Map();
async function _fetchSyntaxChapterTokens(book, chapter) {
    const key = `${book}/${chapter}`;
    if (_syntaxCtxChapterCache.has(key)) return _syntaxCtxChapterCache.get(key);
    let tokens = null;
    try {
        const testament = (typeof SB_BOOKS !== 'undefined' && SB_BOOKS.lxx && SB_BOOKS.lxx.some(b => b.key === book)) ? 'lxx' : 'nt';
        const res = await fetch(new URL(`bible_data/${testament}/${book}/${chapter}.json`, document.baseURI).href);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) tokens = data;
        }
    } catch (_) { tokens = null; }
    _syntaxCtxChapterCache.set(key, tokens);
    return tokens;
}
/* ══════════════════════════════════════════════════════════════════
   Reading Hint v1（SP-12）— 編集済み Editorial Asset の加算表示のみ。
   解析・生成・推論はしない（Runtime に AI なし）。engine / ReadingFormatter /
   Reading Memo / bible_data / StudyPanel には一切関与しない。
   失敗しても本文表示は不変（Hint を出さないだけ）。
   ════════════════════════════════════════════════════════════════ */
let _readingHintIndex = null; // Map: `${bookKey}|${chapter}` -> [published hint, ...]
async function _loadReadingHints() {
    if (_readingHintIndex) return;
    try {
        const res = await fetch('../assets/data/reading-hints.json');
        const arr = res.ok ? await res.json() : [];
        const idx = new Map();
        for (const h of (Array.isArray(arr) ? arr : [])) {
            if (!h || h.status !== 'published' || !h.book || h.chapter == null) continue;
            const k = h.book + '|' + h.chapter;
            if (!idx.has(k)) idx.set(k, []);
            idx.get(k).push(h);
        }
        _readingHintIndex = idx;
    } catch (_) {
        _readingHintIndex = new Map(); /* 失敗しても継続（Hint 非表示） */
    }
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
        .then(r => (r && r.ok) ? r.json() : null)
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
                if (window.I18N && I18N.lang === 'en') {
                    const gl = _peekEl.querySelector('.word-peek-glosses');
                    const en = _enSenseText(_peekLemmaId);
                    if (gl && en && !gl.textContent) { gl.textContent = en; gl.hidden = false; }
                }
            }
        })
        .catch(() => { _peekLitePromise = null; });
}
