/* ══════════════════════════════════════════
   URL共有機能: ShareURLService / Router / getShareState / applyShareState
   責務分離:
     ShareURLService.generate … state → URL（唯一の生成箇所）
     Router.parse             … URL → state（唯一の解析箇所、副作用なし）
     getShareState            … 現在のAppState → state（URL生成時は必ずここを経由）
     applyShareState          … state → UI反映（URL/Routerを参照しない）
   ══════════════════════════════════════════ */
const ShareURLService = {
    /* 内部ID → パスコード（Router._DISPLAY_CODE の逆マッピング）。
       JA1955 はデフォルトのため省略する（エントリなし = コードなし）。 */
    _PATH_CODE: {
        'WORD_ORDER':  'WO',
        'STRUCTURE':   'ST',
        'CLAUSE_ROLE': 'CR',
        'RELATION':    'RL',
        'DISCOURSE':   'DC',
        'BUN':         'BUN',
        'RK_READING':  'RK',
        'RK_READING_V': 'RKV',  /* Phase L.2 */
        'DA_READING': 'DA',
        'RK_READING_P': 'RKP',  /* Phase M */
        'ROLE_READING': 'WR',
    },

    /* state → canonical path-format URL。
       panel / word / tokenIndex はこのフェーズでシリアライズしない（Phase D/F で対応）。
       生成結果は Router.parse() で再解析したとき同一の state を返すことを保証する。 */
    generate(state) {
        const book    = state.book    || 'ROM';
        const chapter = state.chapter != null ? String(state.chapter) : '1';
        const verse   = state.verse   ? String(state.verse) : '';
        const isCompare = state.mode === 'compare' && state.transB;

        const codeA = this._PATH_CODE[state.transA] || null;
        const codeB = isCompare ? (this._PATH_CODE[state.transB] || null) : null;

        /* JA1955 (codeA===null) の場合 display='' → パスセグメント省略 = /BOOK/CHAPTER */
        let display = '';
        if (codeA && codeB) {
            display = codeA + '+' + codeB;
        } else if (codeA) {
            display = codeA;
        }

        const segs = [encodeURIComponent(book), encodeURIComponent(chapter)];
        if (verse)   segs.push(encodeURIComponent(verse));
        if (display) segs.push(display.split('+').map(encodeURIComponent).join('+'));

        const url = new URL(window.location.origin);
        url.pathname = '/' + segs.join('/');
        return url;
    }
};

const Router = {
    /* パス表示コード → 内部ID（旧URLエイリアスは normalizeModeId が担う） */
    _DISPLAY_CODE: {
        'WO': 'WORD_ORDER', 'ST': 'STRUCTURE',  'CR': 'CLAUSE_ROLE',
        'RL': 'RELATION',   'DC': 'DISCOURSE',  'BUN': 'BUN', 'JA1955': 'JA1955', 'WEB': 'WEB',
        'RK': 'RK_READING', 'RKV': 'RK_READING_V', 'RKP': 'RK_READING_P',  /* Phase L.2 / M */
        'DA': 'DA_READING',
        'WR': 'ROLE_READING',
    },

    /* /{BOOK}/{CH}[/{VERSE}[/{TOKEN_INDEX}]][/{DISPLAY}] を解析して state を返す。
       BOOK が既知の書物キーでない・CH が数字でない場合は null を返す。 */
    _parsePath(pathname) {
        const segs = pathname.split('/').filter(Boolean);
        if (segs.length < 2) return null;
        const bookKey = segs[0].toUpperCase();
        const allKeys = new Set([...SB_BOOKS.nt, ...SB_BOOKS.ot].map(b => b.key));
        if (!allKeys.has(bookKey)) return null;
        if (!/^\d+$/.test(segs[1])) return null;
        const out = {
            book: bookKey, chapter: segs[1],
            verse: null, tokenIndex: null,
            transA: null, transB: null, mode: null,
        };
        let i = 2;
        if (i < segs.length && /^\d+$/.test(segs[i])) {
            out.verse = segs[i++];
            if (i < segs.length && /^\d+$/.test(segs[i])) out.tokenIndex = segs[i++];
        }
        if (i < segs.length) {
            const parts = decodeURIComponent(segs[i]).toUpperCase().split('+');
            out.transA = this._DISPLAY_CODE[parts[0]] || null;
            if (parts.length > 1) {
                out.transB = this._DISPLAY_CODE[parts[1]] || null;
                out.mode = 'compare';
            }
        }
        return out;
    },

    /* パス形式（?book= なし）を優先し、なければ旧クエリ形式にフォールバックする。
       verse/panel/word は常にクエリパラメータから読む（書き込み側は Phase C で対応）。
       tokenIndex はパースのみ。init() は現在消費しない（将来フェーズで対応）。 */
    parse(location = window.location) {
        const p = new URLSearchParams(location.search);
        if (!p.get('book')) {
            const path = this._parsePath(location.pathname);
            if (path) {
                return {
                    book:       path.book,
                    chapter:    path.chapter,
                    verse:      path.verse   || p.get('verse'),
                    panel:      p.get('panel'),
                    word:       p.get('word'),
                    transA:     path.transA,
                    transB:     path.transB  || p.get('transB'),
                    mode:       path.mode    || p.get('mode'),
                    tokenIndex: path.tokenIndex,
                };
            }
        }
        return {
            book:    p.get('book'),
            chapter: p.get('ch'),
            verse:   p.get('verse'),
            panel:   p.get('panel'),
            word:    p.get('word'),
            transA:  p.get('transA'),
            transB:  p.get('transB'),
            mode:    p.get('mode'),
        };
    }
};

/* ══════════════════════════════════════════
   URL Import: 外部の聖書Webサービス（ブックマークレット等）から渡された
   ?import=<URLエンコード済URL> を、通常の共有URL形式（?book/?ch/?verse）へ
   変換する。解析ロジックは core/url-import-engine.js に集約し、ここでは
   結果をURLへ書き戻す配線のみを行う（既存のRouter/init経路をそのまま使う）。
   init() の最初、Router.parse() より前に1回だけ呼ぶ。 ══════════════════════════════════════════ */
function _applyUrlImportIfPresent() {
    const params = new URLSearchParams(location.search);
    const imported = params.get('import');
    if (!imported) return;

    const engine = window.App && window.App.urlImport;
    const result = engine ? engine.parseBibleUrl(imported) : null;

    const url = new URL(window.location.href);
    url.searchParams.delete('import');

    if (result && result.book) {
        url.searchParams.set('book', result.book);
        url.searchParams.set('ch', String(result.chapter));
        if (result.verse != null) {
            url.searchParams.set('verse', String(result.verse));
        } else {
            url.searchParams.delete('verse');
        }
        /* URL Import経由の初期表示は「読解フロー」をデフォルトにする（transA未指定時のみ）。
           _transAを直接書き換えず、既存のRouter/init()経路（urlParams.transA読み取り→
           _applyTransMode）にそのまま委譲する。呼び出し元が明示的にtransAを指定していれば
           それを優先し、上書きしない。 */
        if (!params.has('transA')) {
            url.searchParams.set('transA', 'WORD_ORDER');
        }

        /* 「外部サイト＋聖書アプリ並列利用」の基盤として、import元の外部URLを
           このタブのセッション限りで保持する（sessionStorage。localStorageは使わない
           ＝ app-storage.js が扱う永続ユーザーデータとは責務が異なる一時情報のため）。
           保存に失敗しても（private mode等）本文表示には影響させない。
           読み出し・表示は _syncUrlImportSourceButton() / _openUrlImportSource() が担う。 */
        try {
            sessionStorage.setItem('app_url_import_source', imported);
        } catch (_) { /* 保存できなくてもアプリ動作は継続する */ }
    } else {
        _showToast('この聖書サービスには現在対応していません。', 3200);
    }
    history.replaceState(null, '', url);
}

function notifyAppStateChange() {
    syncUrlState();
}

/* 現在表示中のURLをそのままクリップボードへコピーする（URL生成ロジックは呼ばない）。 */
async function copyShareUrl() {
    const url = location.href;
    try {
        await navigator.clipboard.writeText(url);
        _showShareToast();
    } catch (e) {
        try {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            _showShareToast();
        } catch (e2) {
            console.warn('copyShareUrl: コピーに失敗しました', e2);
        }
    }
}

function applyShareState(state) {
    if (!state.verse) return;   /* verse なし → 従来どおり章の先頭表示 */

    /* 1. verse復元 = 「本文をタップした場合と同じコードパス」に委譲する。
       可視の節ブロック（左カラム。旧実装の [data-vnum] は非表示の右カラム
       しか拾えなかった）を _findVisibleVerseBlock で特定し、その onclick を
       そのまま実行する。selected クラス・active-v 表示・AppState.toBrowsing・
       StudyPanel オープン・notifyAppStateChange（URL書き戻し）のすべてが
       通常の節タップ処理側で行われる — 検索専用の状態・分岐は持たない。
       スクロールは節を中央へ置き、パネル表示後の重なりは既存の
       _adjustReadingAreaForPanel（openStudyPanel 系の通常処理）が最小調整する。 */
    const words = _cachedElByVerse[state.verse] || [];
    /* book+chapter が指定されている場合は章スコープ検索で正確な節を取得する。
       book/chapter のない呼び出し（_openCompareTarget 経由）は従来の全域検索へフォールバック。 */
    const target = (state.book && state.chapter != null)
        ? (_findVerseInChapter(state.book, state.chapter, state.verse) || _findVisibleVerseBlock(state.verse))
        : _findVisibleVerseBlock(state.verse);

    if (!target) {
        console.warn('applyShareState: verse not found:', state.verse);
        return;
    }

    target.scrollIntoView({ block: 'center' });

    if (typeof target.onclick === 'function') {
        target.click();   /* ← ユーザーの節タップと同一経路 */

        /* 位置の微調整: パネルが開いた後、節を「パネル上端より上の可視領域」の
           中央へ置き、節と StudyPanel を同時に読める位置にする。調整後の位置を
           既存の AppState.saveScroll() で保存し直すことで、パネルを閉じた時も
           この読書位置へ戻る（既存のスクロール復元機構をそのまま利用）。 */
        requestAnimationFrame(() => {
            const area  = document.getElementById('main-reading-area');
            const panel = document.getElementById('bottom-depth-panel');
            if (!area || !panel) return;
            const aRect = area.getBoundingClientRect();
            const vRect = target.getBoundingClientRect();
            /* パネルはスライドイン中（transform 遷移）で getBoundingClientRect が
               まだ画面外を指すため、transform の影響を受けない offsetHeight から
               最終位置（ビューポート下端 − パネル高さ）を計算する */
            const visibleBottom = panel.classList.contains('open')
                ? Math.max(aRect.top + 40, window.innerHeight - panel.offsetHeight)
                : aRect.bottom;
            const desiredCenter = (aRect.top + visibleBottom) / 2;
            const delta = (vRect.top + vRect.height / 2) - desiredCenter;
            if (Math.abs(delta) > 1) area.scrollTop += delta;
            AppState.saveScroll();
        });
    } else {
        /* ギリシャ語データの無い本文などタップ不可の節: 従来どおり選択状態のみ
           復元する（タップしても何も起きない節でパネルを無理に開かない） */
        AppState.toBrowsing(state.verse, words);
        notifyAppStateChange();
        return;
    }

    /* 2. word復元（StudyPanel描画後に1フレーム遅延・従来どおり panel=study 時のみ）
       注: StudyPanelの語一覧は .word-card ではなく .wlv-chip（data-token-id属性、
       VR-2 Phase 2）で構成されている（実機検証で確認済み）。既存の
       _wlvChipClick / _wlvStudyBtnClick 経路（「詳しく見る」ボタンと同じ処理）を再利用する。 */
    if (state.panel !== 'study' || !state.word) return;
    const idx = words.findIndex(w => normalizeStrong(w.strong) === 'G' + state.word);
    if (idx === -1) {
        console.warn('applyShareState: word not found:', state.word);
        return;
    }
    const tokenId = words[idx].tokenId;
    /* chip の探索先は Desktop の #word-list-view と Mobile の #mobile-inspector-area の両方。
       MobileVerseView の一覧は非同期描画のため、見つかるまで一定フレーム再試行する
       （Desktop では従来どおり最初のフレームで見つかる）。 */
    let _shareWordTries = 0;
    const _tryShareWord = () => {
        const chipEl = document.querySelector(
            '#word-list-view .wlv-chip[data-token-id="' + tokenId + '"], ' +
            '#mobile-inspector-area .wlv-chip[data-token-id="' + tokenId + '"]');
        if (!chipEl) {
            if (++_shareWordTries < 90) { requestAnimationFrame(_tryShareWord); return; }
            console.warn('applyShareState: word chip not found:', state.word);
            return;
        }
        _wlvChipClick(chipEl, tokenId);
        _wlvStudyBtnClick();
    };
    requestAnimationFrame(_tryShareWord);
}
