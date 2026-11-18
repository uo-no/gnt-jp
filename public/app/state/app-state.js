/* ══════════════════════════════════════════
   翻訳マスター定義（TDZ対策：先頭で宣言）
   ══════════════════════════════════════════ */
const TRANSLATIONS = {
    'JA1955': { label: '口語訳（1955）',     code: 'JA1955' },
    'WEB':    { label: 'World English Bible（英語訳）', code: 'WEB' },
    'RVR1909': { label: 'Reina-Valera 1909', code: 'RVR1909' },
    'KARLXII1873': { label: 'Karl XII:s bibel (1873)', code: 'KARLXII1873' },
    'BUN':    { label: '文語訳',             code: 'BUN'    },
/*  'KAI17':  { label: '新改訳2017',         code: 'KAI17'  },
    'KYO':    { label: '聖書協会共同訳',     code: 'KYO'    },*/
    'WORD_ORDER': { label: '語順で読む',       code: 'WORD_ORDER' },
    'DA_READING': { label: '文の構造で読む',     code: 'DA_READING' },
    /* 語の役割で読む: 作業スペースで確定した RK 座標レイアウトを読むモード。
       章×デバイスの公開可否は rk-availability.json で管理する。 */
    'ROLE_READING': { label: '語の役割で読む',   code: 'ROLE_READING' },
    /* ギリシャ語で読む: bible_data の Greek token を連続した本文として読む。
       翻訳ではないため TRANSLATION_REGISTRY（人手翻訳のみ）からは除外する。 */
    'GREEK_TEXT': { label: 'ギリシャ語で読む',   code: 'GREEK_TEXT' },
    /* 旧モード（DISCOURSE / STRUCTURAL / STRUCTURE / CLAUSE_ROLE / RELATION /
       RK_READING / RK_READING_V）は 2026-10-28 のモード整理で登録を削除した。
       旧URLは _toColumnMode のフォールバックで「語順で読む」に着地する。
       実装（core スクリプト群）は参照閉包を確認してから別途撤去する。 */
};
const TRANS_LIST   = Object.entries(TRANSLATIONS).map(([id, t]) => ({ id, name: t.label, code: t.code }));
const TRANS_LABELS = Object.fromEntries(Object.entries(TRANSLATIONS).map(([id, t]) => [id, t.label]));

/**
 * VR-4-E: Translation Registry — 実際の人手翻訳のみ（'FLOW' を含まない）。
 * TRANSLATIONS（URL互換のため維持。'FLOW' を含む）から機械的に導出する。
 * Bible Picker の「翻訳を選択」グループはここを正とする。
 */
const TRANSLATION_REGISTRY = Object.entries(TRANSLATIONS)
    .filter(([id]) => id !== 'WORD_ORDER' && id !== 'DISCOURSE' && id !== 'STRUCTURAL' && id !== 'STRUCTURE' && id !== 'CLAUSE_ROLE' && id !== 'BUN' && id !== 'RELATION' && id !== 'RK_READING' && id !== 'RK_READING_V' && id !== 'DA_READING' && id !== 'ROLE_READING' && id !== 'GREEK_TEXT')
    .map(([id, t]) => ({ id, label: t.label, code: t.code }));
/* D1（Phase 1b）: 基準訳は UI 言語に従う。UI 言語の基準訳（I18N.baseTranslation：
   en＝WEB、es＝RVR1909、sv＝KARLXII1873）を翻訳一覧の先頭に置く。JA は JA1955 が元から先頭のため no-op。
   基準訳の対応表は assets/js/i18n.js の BASE_TRANSLATION が唯一の定義（#115）。 */
{
    const _baseId = window.I18N && window.I18N.baseTranslation;
    if (_baseId && _baseId !== 'JA1955') {
        const bi = TRANSLATION_REGISTRY.findIndex(t => t.id === _baseId);
        if (bi > 0) TRANSLATION_REGISTRY.unshift(TRANSLATION_REGISTRY.splice(bi, 1)[0]);
    }
}

/* DISPLAY_MODE_REGISTRY は #131（2026-11-18）で撤去した。利用箇所が定義のみ（ドット／ブラケット参照とも0件）で、
   定義時に TRANSLATIONS.WORD_ORDER.label 等を即時参照するため、エントリを外す・改名すると初期化が落ちて白画面になる地雷だった。
   ピッカーのモード一覧は app-shell.js が独自に持つ（この registry は参照されていなかった）。 */

/* アクティブ翻訳（A = メイン / B = 比較列）。_transA / _transB が唯一のSSOT（Phase TR-5）。 */
let _transMode   = 'single';
/* D1（Phase 1b）: 既定の基準訳は UI 言語に従う（英語 UI では WEB）。
   URL で明示された場合は init() の適用が優先する。 */
let _transA      = ((window.I18N && window.I18N.baseTranslation) || 'JA1955');
let _transB      = 'BUN';

/* Legacy Mode ID → 新 Mode ID の正規化マップ（URL deep link 互換）。
   ?transA=FLOW 等の旧 URL が引き続き動作するよう init() で適用する。 */
const LEGACY_MODE_IDS = { FLOW: 'WORD_ORDER', HIERARCHICAL: 'STRUCTURE', REED_KELLOGG: 'CLAUSE_ROLE' };
function normalizeModeId(id) { return LEGACY_MODE_IDS[id] || id; }

/* ══════════════════════════════════════════
   AppState - UI状態の一元管理
   ══════════════════════════════════════════
   設計方針:
     - グローバル状態はすべてここに集約する
     - DOM操作（display切替など）はこのオブジェクトに触れない
       → 実際のDOM操作は各関数が行う
     - 状態を「読む」ことで現在モードを判定できる
     - scroll位置は「Reading に戻る」ときに復元する

   状態遷移:
     reading  → 節クリック  → browsing
     browsing → 語カードクリック → popover表示（modeは browsing のまま）
     browsing → 「詳しく見る」 → study
     study    → 「テキストに戻る」 → reading（scroll復元）
     study    → 「分析に戻る」 → study（params保持・tab記憶）
   ══════════════════════════════════════════ */
const AppState = {
    /* 現在のモード: 'reading' | 'browsing' | 'study' */
    mode: 'reading',

    /* 選択中の節 */
    selectedVerse: {
        vNum:     null,   /* string: 節番号 e.g. "3" */
        elWords:  [],     /* Array: 節内の語形データ */
    },

    /* Inspect スナップショット（選択中の語） */
    inspect: {
        data: null,       /* { greek, strong, jpMorph, rawMorph, lemma, jaWord, desc, ref } */
    },

    /* Study 情報（タブ・params）*/
    study: {
        params: null,     /* _currentAnalysisParams と同内容 */
        tab:    'flow',   /* 最後に表示していたタブ。Study閉じても保持。 */
    },

    /* SP-1: StudyPanel起点（どの読書面からLevel3を開いたか）
       surface    = 読書面ID: 'JA1955' | 'FLOW' | 'HIERARCHICAL' | 'REED_KELLOGG' | 'CLAUSE_FLOW' | null
       entryPoint = 入口種別: 'wlv' | 'token' | 'head' | 'pp' | null
       closeStudyPanel() でクリア。reopenStudyPanel() はクリア後のnull状態を維持（Level2なし）。 */
    studyOrigin: {
        surface:    null,
        entryPoint: null,
    },

    /* SP-3: StudyTarget v0（何を調べているか）
       TOKEN target: { type: 'TOKEN', ref: 'JHN 3:1!1' }
       closeStudyPanel() / toReading() でクリア。reopenStudyPanel() で study.params.ref から再構築。
       studyOrigin（どこから来たか）・inspect.data（表示データ）とは別責務。 */
    studyTarget: null,

    /* 空間階層（聖書全体の"場所"） */
    location: {
        testament: null,  /* 'nt' | 'ot' */
        book:      null,  /* e.g. { key:'1CO', name:'コリント人への手紙 第一', ch:16 } */
        chapter:   null,  /* number */
    },

    /* 読書深度スタック */
    depth: {
        stack: [],        /* [ { type, label, verse?, strong? }, ... ] */
    },

    /* 本文スクロール位置（Study閉じたとき復元する） */
    scrollTop: 0,

    /* UI状態（ヘッダー/パンくず/サイドバーの選択表示の唯一のソース）。
       'bible' | 'bookmarks' | 'notes' | 'recentVerses' | 'recentWords' | 'sourcePolicy' | 'knowledge' | 'roadmap' | 'changelog' | 'svIntro' */
    ui: {
        view: 'bible',
    },

    /* ── ヘルパー ── */

    /* Reading 状態にリセット（scroll保持・study.tab保持） */
    toReading() {
        this.mode = 'reading';
        this.selectedVerse = { vNum: null, elWords: [] };
        this.inspect.data  = null;
        this.studyOrigin   = { surface: null, entryPoint: null };
        this.studyTarget   = null;
        /* study.params / study.tab はあえて保持する（再開ボタンのため） */
    },

    /* Browsing 状態に移行（節選択後） */
    toBrowsing(vNum, elWords, book, ch) {
        this.mode = 'browsing';
        /* ch: 選択節の属する章（URL divergence 防止のため selectedVerse に保持する。
           ch なし呼び出し元では null → getShareState() が location.chapter へフォールバック）。 */
        this.selectedVerse = { vNum, elWords: elWords || [], ch: ch != null ? ch : null };
        this.inspect.data  = null;

        /* 読書位置（節）の永続化：selectedVerse が確定する唯一の地点（SSOT）。
           ref・構造化フィールドはすべて book / ch / vNum から組み立てる（ref パース禁止のSSOT原則）。
           book / ch は描画時コンテキスト（明示引数）を優先し、省略時は this.location にフォールバック。 */
        if (window.App.storage) {
            const _bk = book || this.location.book;
            const bookKey = _bk ? _bk.key : '';
            const chapter = ch != null ? ch : (this.location.chapter != null ? this.location.chapter : '');
            if (bookKey && chapter !== '' && vNum != null) {
                window.App.storage.addRecentVerse({
                    ref: `${bookKey} ${chapter}:${vNum}`,
                    bookKey: bookKey,
                    chapter: chapter,
                    verse: Number(vNum),
                });
            }
        }
    },

    /* Study 状態に移行 */
    toStudy(params, tab) {
        this.mode = 'study';
        this.study.params = params;
        if (tab) this.study.tab = tab;
    },

    /* スクロール位置を保存 */
    saveScroll() {
        const el = document.getElementById('main-reading-area');
        if (el) this.scrollTop = el.scrollTop;
    },

/* スクロール位置を復元 */
    restoreScroll() {
        const el = document.getElementById('main-reading-area');
        if (el) el.scrollTop = this.scrollTop;
    },

    /* Study が再開できる状態か */
    canReopen() {
        return !!(this.study.params);
    },

    /* depth stack に追加 */
    pushDepth(entry) {
        this.depth.stack.push(entry);
    },

    /* depth stack をクリア */
    clearDepth() {
        this.depth.stack = [];
    },
};

/* onboarding（初回デモ）実行中はURL同期を止めるためのフラグ。
   onboarding.js 自体は変更しないため、index.html 側の既存onboardingフック
   呼び出し箇所（_syncOnboardingActiveFlag 参照）から getState().onboardingComplete
   の「状態遷移（false→true）」を検知して更新する。 */
window.__onboardingActive = false;
window.__onboardingPrevState = null;
