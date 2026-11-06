let _cachedElByVerse = {};
/* Phase 2B-2: 追加章の elByVerse キャッシュ。キー: "bookKey|chapter"（文字列）、値: elByVerse オブジェクト。
   render() 呼び出し時に clear() する（DOMクリアとライフサイクルを一致させる）。 */
let _appendedChapterCache = new Map();
/*
 * _buildColumnBlock — VR-5-F-B: render() の「1列分の verse block 生成」処理を抽出。
 * VR-5-F-A監査（Migration Boundary Step 1）で「列生成ロジックはcolMode駆動で一般化容易」
 * と判定した範囲のみを対象とする。
 * columns.length は今回も2固定（colIndex は 0=左列 または 1=右列 のみ）。
 *   col      = 対象列（columns[colIndex] 相当、{colMode, jpData}）
 *   otherCol = もう一方の列（右列の翻訳フォールバック・wordOrder相互判定に使用）
 * className・dataset・onclick挙動は colIndex ごとに現行実装のまま保持し、表示結果を変えない。
 * VR-5-H-2: 列間の相互ハイライトは _selectVerseBlocks()（dataset.vnum ベース、列非依存）へ
 * 一般化したため、もう一方の columnBlock を直接受け取るパラメータ（旧 otherBlock）は
 * 不要になり削除した。
 */
/*
 * _selectVerseBlocks — VR-5-H-2: 節単位の選択状態管理を列非依存で行う。
 * VR-5-H-1で全列に付与した dataset.vnum を使い、column index / left-right class に
 * 依存せず「同一vNumを持つ表示中のverse-blockすべて」を selected にする。
 * single-modeでは block と pBlock が別コンテナ（#bible-text-area / #parallel-text-area）に
 * 存在するため、共通の親要素は使わずDOM全体検索（querySelectorAll）で成立させる。
 * document.querySelectorAll('.verse-block') は #main-reading-area 外に verse-block が
 * 存在しないため、旧実装の mainArea 限定版と結果集合は常に同一（挙動差分なし）。
 */
function _selectVerseBlocks(vNum, activeBlock, containerEl) {
    document.querySelectorAll('.verse-block.selected').forEach(b => b.classList.remove('selected'));
    const _svbScope = containerEl || document;
    _svbScope.querySelectorAll(`.verse-block[data-vnum="${vNum}"]`).forEach(b => b.classList.add('selected'));
    if (activeBlock) activeBlock.classList.add('selected');
}

function _buildColumnBlock(colIndex, col, otherCol, vNum, text, elByVerse, hasGreek, useVersePair, mainArea, book, ch) {
    const columnBlock = document.createElement('div');
    /* VR-5-H-1: 列共通で dataset.vnum を付与する（VR-5-G-A監査で確認した「右列にのみ
       dataset.vnum が存在する」非対称の解消）。すべての列を将来同じ VerseBlock として
       扱うための準備であり、既存の className・DOM構造・イベント挙動は変更しない。
       既存のセレクタ（_navigateVerse・_findVisibleVerseBlock・_setFlowInjection 等）は
       いずれも dataset.vnum の有無ではなく className で列を判別しているため、
       本変更はそれらの挙動に影響しない。 */
    columnBlock.dataset.vnum = vNum;
    /* VR-5-H-4: Flow 対象列の論理的根拠（col.colMode.kind）を DOM へ read-only 投影する。
       SSOT はあくまで col.colMode.kind であり、dataset.colMode はその索引投影にすぎない
       （DOM 側で書き換えない／Flow 判定ロジックをここへ移さない）。dataset.vnum と同型。
       _setFlowInjection() の Flow 対象探索が位置クラス（.verse-pair-right）ではなくこの値を
       索引として使う。 */
    columnBlock.dataset.colMode = col.colMode.kind;

    if (colIndex === 0) {
        // 左：聖書本文 or 読解フロー（ColumnMode.kind === 'wordOrder'）
        columnBlock.className = useVersePair ? 'verse-block verse-pair-left' : 'verse-block';

        if (col.colMode.kind === 'wordOrder') {
            const words = elByVerse[vNum] || [];
            if (words.length === 0) {
                columnBlock.innerHTML = `<div class="jp-section"><span class="v-num">${vNum}</span><div class="jp-text" style="color:var(--text-sub);font-size: var(--text-caption);opacity: var(--opacity-secondary);">${_T('col.noGreekDataShort', '原語データなし')}</div></div>`;
            } else {
                /* Phase VR-4A: 本文左列の語順フロー表示を Verse Representation Architecture
                   経由にする。WordOrderRenderer は chips[] のみを入力とするため、
                   出力は旧実装と完全一致（docs/development/verse-representation-design.md）。
                   book / ch は描画時コンテキスト（明示引数）を使用する。 */
                const _vrBookKey  = book ? book.key : '';
                const _vrCh       = ch != null ? ch : null;
                const _vrVerse    = buildVerse(_vrBookKey, _vrCh, vNum, words);
                const _vrAnalysis = getAnalysis(_vrVerse);
                const _vrRep      = buildRepresentation({ kind: 'wordOrder' }, _vrVerse, _vrAnalysis);
                /* 複数節が同時に描画されるため、idx は節内でのみ有効。
                   block 単位でchipデータを保持し、_wlvChipClick から節を跨いだ取り違えなく参照できるようにする。 */
                columnBlock._flowResolved = _vrAnalysis;
                columnBlock._flowChips = _vrRep.chips;
                /* Layer 2 Inspect: ReadingFormatterのclause解析には生トークン配列が
                   必要なため、chipデータと並べて words もそのまま保持しておく。 */
                columnBlock._flowWords = words;
                /* VR-5-H-12-D: JHN3:16 先頭chipへのアンカー付与は「本文左列の policy」として
                   呼び出し元で解決する（renderer 内の verse 固定判定を撤去）。判定源は
                   renderer が旧来参照していた representation.verseRef と同一。 */
                const _bodyVr = _vrRep && _vrRep.verseRef ? _vrRep.verseRef : {};
                const _bodyShowAnchor = _bodyVr.book === 'JHN' && _bodyVr.chapter === 3
                    && String(_bodyVr.verse) === '16';
                columnBlock.innerHTML = WordOrderRenderer.renderBodyColumn(_vrRep, { showOnboardingAnchor: _bodyShowAnchor });
                columnBlock.onclick = () => {
                    _selectVerseBlocks(vNum, columnBlock, mainArea);
                    AppState.toBrowsing(vNum, words, book, ch);
                    openVerseInspector(vNum, words, book, ch);
                    notifyAppStateChange();
                };
            }
        } else {
            /* Phase TR-1: 左列の翻訳表示を Verse Representation Architecture 経由にする。
               renderColumn() は TranslationRenderer（representation.text のみを入力とする）へ
               委譲するため、出力は旧実装と完全一致（docs/development/verse-representation-design.md）。
               ★ 翻訳は Greek Token を経由しないため tokens は空のまま Verse を構築する（VR-1設計書 A-3）。
               book / ch は描画時コンテキスト（明示引数）を使用する。 */
            const _trBookKey = book ? book.key : '';
            const _trCh      = ch != null ? ch : null;
            const _trVerse   = buildVerse(_trBookKey, _trCh, vNum, []);
            const _trRep     = buildRepresentation(col.colMode, _trVerse, null, text);
            columnBlock.innerHTML = renderColumn(_trRep);
        }
    } else {
        // 右：並列訳 or 読解フロー
        columnBlock.className = 'verse-block verse-pair-right';

        if (col.colMode.kind === 'wordOrder') {
            // _setFlowInjection('flow') が gf-verse-block を差し込むので
            // ここでは空コンテナのみ用意する（二重描画防止）
            columnBlock.innerHTML = '';
        } else if (!useVersePair && otherCol.colMode.kind === 'wordOrder') {
            // single-mode + transA=FLOW: 右列は不要
            columnBlock.innerHTML = '';
        } else {
            const rightText = (col.jpData && col.jpData.verses && col.jpData.verses[vNum]) ? col.jpData.verses[vNum] : (otherCol.jpData.verses[vNum] || '');
            /* Phase TR-2: 右列の翻訳表示を Verse Representation Architecture 経由にする。
               renderColumn() は TranslationRenderer（representation.text のみを入力とする）へ
               委譲するため、出力は旧実装と完全一致（docs/development/verse-representation-design.md）。
               ★ 翻訳は Greek Token を経由しないため tokens は空のまま Verse を構築する（VR-1設計書 A-3）。
               book / ch は描画時コンテキスト（明示引数）を使用する。 */
            const _trBookKeyR = book ? book.key : '';
            const _trChR      = ch != null ? ch : null;
            const _trVerseR   = buildVerse(_trBookKeyR, _trChR, vNum, []);
            const _trRepR     = buildRepresentation(col.colMode, _trVerseR, null, rightText);
            columnBlock.innerHTML = renderColumn(_trRepR);
            if (hasGreek) {
                columnBlock.onclick = () => {
                    _selectVerseBlocks(vNum, columnBlock, mainArea);
                    AppState.toBrowsing(vNum, elByVerse[vNum] || [], book, ch);
                    openVerseInspector(vNum, elByVerse[vNum] || [], book, ch);
                    notifyAppStateChange();
                };
            }
        }
    }

    return columnBlock;
}

/*
 * render(columns, elData, hasGreek) — VR-5-E-1: render() 入口を2列固定引数（jpData/jpDataB）
 * から columns[] ベースへ移行。columns[i] = { colMode, jpData }。
 * 今回は入口（引数の受け取り方）のみの移行であり、内部は columns[0]/columns[1] を
 * 直接参照して既存の2列表示をそのまま維持する（columns.forEach() 化・N列Grid化は行わない）。
 * colMode は将来フェーズ（columns[].colMode を内部ループが直接消費する段階）向けに
 * columns[] へ含めているが、今回は render() 内部で _colA/_colB を従来どおり
 * _toColumnMode(_transA/_transB) から再計算し、表示結果を変更しない。
 */
function render(columns, elData, hasGreek) {
    const app          = document.getElementById('bible-text-area');
    const parallel     = document.getElementById('parallel-text-area');
    const mainArea     = document.getElementById('main-reading-area');

    // ── Study panel を閉じて Reading 状態に戻す ──
    closeStudyPanel();
    _closeReadingHintPopover(); /* 章移動などの再描画で開いていた Hint Popover を閉じる */
    /* 章が変わった場合は AppState を完全リセット（study.params も破棄） */
    AppState.mode                = 'reading';
    AppState.selectedVerse       = { vNum: null, elWords: [] };
    AppState.inspect.data        = null;
    AppState.study.params        = null;
    AppState.study.tab           = 'flow';
    AppState.scrollTop           = 0;
    AppState.clearDepth();
    _appendedChapterCache.clear(); /* Phase 2B-2: DOMクリアと同時に追加章キャッシュを破棄 */
app.innerHTML = '';
    parallel.innerHTML = '';
    /* compare モードで mainArea に直接追加した verse-pair / compare-chapter-block をクリア */
    mainArea.querySelectorAll('.verse-pair, .compare-chapter-block').forEach(el => el.remove());

    const elByVerse = {};
    if (elData && elData.length > 0) {
        elData.forEach(w => {
            const v = _elTokenVerse(w);
            if (v) { if (!elByVerse[v]) elByVerse[v] = []; elByVerse[v].push(w); }
        });
    }

    const openBtn = document.getElementById('open-panel-btn');
    if (!hasGreek) {
        document.getElementById('bottom-depth-panel').style.display = 'none';
        openBtn.style.display = 'none';
    }

    const useVersePair = mainArea.classList.contains('compare-mode');

    /* VR-5-E-2: render() 内部の A/B 固定参照を columns[] 参照へ整理する。
       columns.length は今回も2固定（columns[0]=左列, columns[1]=右列）。
       ColumnMode（_colA/_colB相当）は columns[].colMode（呼び出し元が _toColumnMode() で
       算出し columns[] 生成時に確定させた値、VR-5-E-1参照）からそのまま取得し、
       render() 内部での _toColumnMode(_transA/_transB) 再計算はしない
       （columns[] 生成と render() 呼び出しの間に await を挟まないため、値は一致する）。 */
    const colA  = columns[0];
    const colB  = columns[1];
    const _colA = colA.colMode;
    const _colB = colB.colMode;

    /* DA_READING: SBL sentence boundaries + leading conjunction rows + existing Word Order chips. */
    if (_colA.kind === 'da-reading') {
        renderDAReadingView(app, _sdChapterDataForRender, elData);
        /* DA-companion: 節タップでStudyPanelを開く。renderDAReadingView はclick handlerを
           付けないため、ここで .da-sentence 要素に追加する。chipタップは _wlvChipClick に委ねる。 */
        const _daBook = AppState.location.book;
        const _daCh   = AppState.location.chapter;
        app.querySelectorAll('.da-sentence').forEach(sentEl => {
            const _daWords = sentEl._flowWords;
            if (!_daWords || !_daWords.length) return;
            const _daVNum  = String(_daWords[0].verse);
            const _daVWords = elByVerse[_daVNum] || _daWords;
            sentEl.onclick = (e) => {
                if (e.target.closest('.wlv-chip')) return;
                _selectVerseBlocks(_daVNum, sentEl, app);
                AppState.toBrowsing(_daVNum, _daVWords, _daBook, _daCh);
                openVerseInspector(_daVNum, _daVWords, _daBook, _daCh);
                notifyAppStateChange();
            };
        });
        parallel.innerHTML = '';
        _cachedElByVerse = elByVerse;
        _proximityTokens = (elData || []).map(w => ({ text: w.text || '', lemma: w.lemma || w.text || '' }));
        return;
    }

    /* 語の役割で読む — 作業スペースで確定した RK レイアウトを SR JSON から再現する
       passage（章）単位の早期 return。既存 verse-loop には入らない。 */
    if (_colA.kind === 'role-reading') {
        _renderRoleReadingView(app, _sdChapterDataForRender, elData);
        if (useVersePair && _colB.kind === 'role-reading') {
            _renderRoleReadingView(parallel, _sdChapterDataForRender, elData);
        } else if (useVersePair) {
            parallel.innerHTML = '';
        }
        _cachedElByVerse   = elByVerse;
        _proximityTokens   = (elData || []).map(w => ({ text: w.text || '', lemma: w.lemma || w.text || '' }));
        return;
    }

    /* B列が passage-level（da-reading）の場合、verse-by-verse の B ブロックを
       生成しない。A 列は app へ verse-by-verse で描画する（単一列扱い）。 */
    const _bIsPassageLevel = useVersePair && (
        _colB.kind === 'da-reading'
    );

    /* 描画時コンテキスト: AppState.location はここ（render 開始時）で1回だけ読む。
       以降のクリックハンドラ閉包はこの値を使い、イベント発火時に AppState.location を再読しない。 */
    const _renderBook = AppState.location.book    || null;
    const _renderCh   = AppState.location.chapter != null ? AppState.location.chapter : null;

    /* Phase 2A: 単章コンテナ。single-mode（非 compare）でのみ生成する。
       useVersePair が false のとき _bIsPassageLevel は必ず false（verse-loop 経路のみ）。
       verse-block はこのコンテナ内に追加し、ループ後に app へ挿入する。 */
    const _chapterBlock = !useVersePair ? (() => {
        const _cb   = document.createElement('div');
        _cb.className        = 'chapter-block';
        _cb.dataset.book     = _renderBook ? (_renderBook.key || '') : '';
        _cb.dataset.chapter  = _renderCh != null ? String(_renderCh) : '';
        const _cbHdr = document.createElement('div');
        _cbHdr.className    = 'chapter-header';
        _cbHdr.setAttribute('aria-hidden', 'true');
        _cbHdr.textContent  = '· · ·';
        _cb.appendChild(_cbHdr);
        return _cb;
    })() : null;

    /* Phase 3-7-C: compare章コンテナ（desktop >768px のみ）。
       Mobile（≤768px）は mobile-verse-group を #bible-text-area へ積む既存方式を維持する。 */
    const _compareChapterBlock = (useVersePair && window.innerWidth > 768) ? (() => {
        const _ccb = document.createElement('div');
        _ccb.className       = 'compare-chapter-block';
        _ccb.dataset.book    = _renderBook ? (_renderBook.key || '') : '';
        _ccb.dataset.chapter = _renderCh != null ? String(_renderCh) : '';
        const _ccbHdr = document.createElement('div');
        _ccbHdr.className   = 'compare-chapter-header';
        _ccbHdr.setAttribute('aria-hidden', 'true');
        _ccbHdr.textContent = '· · ·';
        _ccb.appendChild(_ccbHdr);
        return _ccb;
    })() : null;

    Object.entries(colA.jpData.verses).forEach(([vNum, text]) => {
        /* VR-5-F-B: 左列・右列の生成処理を _buildColumnBlock() へ抽出（VR-5-F-A監査
           Migration Boundary Step 1）。
           VR-5-H-2: 列間の相互ハイライトは _selectVerseBlocks()（dataset.vnum ベース）へ
           一般化し、block/pBlock の直接参照を解消した（Step 2 の解消）。 */
        const block = _buildColumnBlock(0, colA, colB, vNum, text, elByVerse, hasGreek, useVersePair, _chapterBlock || _compareChapterBlock || mainArea, _renderBook, _renderCh);

        if (hasGreek && _colA.kind !== 'wordOrder') {
            block.onclick = () => {
                _selectVerseBlocks(vNum, block, _chapterBlock || _compareChapterBlock || mainArea);
                AppState.toBrowsing(vNum, elByVerse[vNum] || [], _renderBook, _renderCh);
                openVerseInspector(vNum, elByVerse[vNum] || [], _renderBook, _renderCh);
                notifyAppStateChange();
            };
        }

        if (_bIsPassageLevel) {
            /* B が passage-level: A ブロックのみ app へ追加（verse-pair 方式を使わない） */
            app.appendChild(block);
        } else {
            const pBlock = _buildColumnBlock(1, colB, colA, vNum, text, elByVerse, hasGreek, useVersePair, _chapterBlock || _compareChapterBlock || mainArea, _renderBook, _renderCh);
            if (useVersePair && window.innerWidth <= 768) {
                /* モバイル比較モード：節ごとにA訳→区切り→B訳を縦に積む */
                const verseGroup = document.createElement('div');
                verseGroup.className       = 'mobile-verse-group';
                verseGroup.dataset.vnum    = vNum;
                verseGroup.dataset.book    = _renderBook ? (_renderBook.key || '') : '';  /* Phase 3-7-F */
                verseGroup.dataset.chapter = _renderCh != null ? String(_renderCh) : ''; /* Phase 3-7-F */

                /* 節番号バッジ */
                const vBadge = document.createElement('div');
                vBadge.className = 'mobile-vnum-badge';
                vBadge.textContent = vNum;
                verseGroup.appendChild(vBadge);

                /* A訳ブロック */
                const aWrap = document.createElement('div');
                aWrap.className = 'mobile-trans-block mobile-trans-a';
                const aLabel = document.createElement('div');
                aLabel.className = 'mobile-trans-label';
                aLabel.textContent = (TRANSLATIONS[_transA] || {}).label || _transA;
                aWrap.appendChild(aLabel);
                aWrap.appendChild(block);
                verseGroup.appendChild(aWrap);

                /* 区切り線 */
                const sep = document.createElement('div');
                sep.className = 'mobile-verse-sep';
                verseGroup.appendChild(sep);

                /* B訳ブロック */
                const bWrap = document.createElement('div');
                bWrap.className = 'mobile-trans-block mobile-trans-b';
                const bLabel = document.createElement('div');
                bLabel.className = 'mobile-trans-label';
                bLabel.textContent = (TRANSLATIONS[_transB] || {}).label || _transB;
                bWrap.appendChild(bLabel);
                bWrap.appendChild(pBlock);
                verseGroup.appendChild(bWrap);

                app.appendChild(verseGroup);
            } else if (useVersePair) {
                const pairEl = document.createElement('div');
                pairEl.className = 'verse-pair';
                pairEl.appendChild(block);
                pairEl.appendChild(pBlock);
                /* Phase 3-7-C: desktop は compare-chapter-block へ、mobile は mainArea へ（従来どおり） */
                (_compareChapterBlock || mainArea).appendChild(pairEl);
            } else {
                (_chapterBlock || app).appendChild(block);
                parallel.appendChild(pBlock);
                /* Reading Hint: 主 Reading ビュー（非比較）の該当節 verse-block 右端に info アイコンを加算 */
                _appendReadingHint(block, vNum);
            }
        }
    });

    /* Phase 2A: 単章コンテナを app へ挿入する（compare 時は null なので何もしない）。 */
    if (_chapterBlock) { app.appendChild(_chapterBlock); }
    /* Phase 3-7-C: desktop compare の章コンテナを mainArea へ追加 */
    if (_compareChapterBlock) { mainArea.appendChild(_compareChapterBlock); }

_proximityTokens = (elData || []).map(w => ({ text: w.text || '', lemma: w.lemma || w.text || '' }));

    /* Greek Flow View: キャッシュ保存 */
    _cachedElByVerse = elByVerse;

    /* transB=FLOW（ColumnMode.kind==='wordOrder'）が選ばれているときは常にflowモードを起動する。
       VR-5-H-6: 旧「flow残留のリセット」分岐（_rightMode 依存）は削除。render() は判定前に
       DOM を全消去（app/parallel innerHTML='' ＋ .verse-pair remove）するため、非flow時に
       cleanup すべき gf-mode 残留は存在せず、当該分岐は表示上 no-op だった。 */
    if (_colB.kind === 'wordOrder') {
        _setFlowInjection('flow');
    }

    /* オンボーディング Flow ステップ中：モバイルCSS を上書きして右列を強制表示 */
    if (window.App.onboarding) {
        var _obState = window.App.onboarding.getState();
        if (!_obState.onboardingComplete && !_obState.onboardingSkipped
            && _obState.currentStep === 'gar17_clicked') {
            mainArea.querySelectorAll('.verse-pair-right').forEach(function(el) {
                el.style.display = 'block';
                el.style.visibility = 'visible';
            });
            if (document.getElementById('parallel-text-area')) {
                document.getElementById('parallel-text-area').style.display = 'block';
            }
        }
    }

    /* モバイル比較モード：1節ナビセットアップ */
    if (window.innerWidth <= 768 && mainArea.classList.contains('compare-mode')) {
        _mobileCompareSetup();
    } else {
        _mobileCompareTeardown();
    }

    /* Phase 2A-4/5: Focus Observer + Autoload を初期化。
       compare desktop（_compareChapterBlock）は Observer のみ初期化（Autoload は Phase 3-7-E 以降）。 */
    if (_chapterBlock) { _setupChapterObserver(); _setupAutoload(); }
    else if (_compareChapterBlock) { _setupChapterObserver(); _setupAutoload(); } /* Phase 3-7-D/E */

}

/**
 * Representation を HTML 文字列に変換する。Renderer Registry（VR-4-B §E で「今回は
 * 導入しない」と判断済み）は導入せず、現時点では kind による分岐で Renderer を
 * 呼ぶだけの薄いラッパーのまま維持する。
 * @param {Object} representation - buildRepresentation() の戻り値
 * @param {Object} [options] - VR-4-C Step 5: wordOrder の場合のみ WordOrderRenderer.render()
 *        へ素通しする（Representation Contract 自体は変更しない）
 * @returns {string}
 */
function renderColumn(representation, options) {
    try {
        if (!representation) return '';
        if (representation.kind === 'wordOrder') {
            return WordOrderRenderer.render(representation, options);
        }
        if (representation.kind === 'translation') {
            return TranslationRenderer.render(representation);
        }
        return ''; // 未実装 kind（syntaxTree 等）
    } catch (_) {
        return '';
    }
}
/*
 * _buildFlowJpData — ColumnMode.kind==='wordOrder'（_transA==='FLOW'）のとき elData から
 * jpData 互換オブジェクト { verses: { "1": "", ... } } を生成する。
 * text は空文字（FLOW チップが左列を担うため）。
 * VR-4-C Step 3: 既存 translation データロードパイプライン（jpData を消費する render()
 * 等）を wordOrder でもそのまま再利用するための互換シム。ColumnMode 導入後も、
 * render() 自体を columns[] ループ設計へ全面的に作り直すまでは必要であり続けるため、
 * 削除しない（VR-4-B §C「Temporary」判定）。表示差分を発生させないことを最優先し、
 * 今回のVR-4-Cでは維持する。
 */
function _buildFlowJpData(elData) {
    if (!elData || elData.length === 0) return null;
    const verses = {};
    elData.forEach(w => {
        const v = _elTokenVerse(w);
        if (v && !(v in verses)) verses[v] = '';
    });
    if (Object.keys(verses).length === 0) return null;
    return { verses };
}

/* ── Greek Flow View: 1節分の右列HTML生成 ── */
/**
 * Phase VR-4B-3: 戻り値を HTML 文字列単体から { html, chips, words, analysis } へ変更。
 * Greek Flow View は複数節が同時に画面上へ存在しうるため、chips[] は単一のグローバル
 * キャッシュ（_wlvChipCache）ではなく DOM ノード（gfEl._flowChips 等）へ節ごとに個別保存
 * する必要がある。呼び出し元（_setFlowInjection）がその保存を行うため、ここでは
 * 生成した chips/words/analysis をそのまま返すだけに留める（WordOrderRenderer は無変更）。
 * 唯一の呼び出し元は _setFlowInjection のみ（他に参照なし）。
 */
function _buildGfVerseBlock(vNum, words, bookKey, ch) {
    if (!words || words.length === 0) {
        return {
            html: `<p style="font-size: var(--text-caption);color:var(--text-sub);opacity: var(--opacity-secondary);padding: var(--space-sm) 0;">${_T('col.noGreekData', 'この節の原語データがありません')}</p>`,
            chips: null, words: null, analysis: null,
        };
    }
    /* Phase VR-4A: Greek Flow View を Verse Representation Architecture 経由にする。
       WordOrderRenderer は chips[] のみを入力とするため、出力は旧実装と完全一致
       （docs/development/verse-representation-design.md）。
       bookKey / ch は呼び出し元（_setFlowInjection）が描画時に確定した値を渡す。省略時は AppState.location にフォールバック。 */
    const _gfBkKey    = bookKey != null ? bookKey : (AppState.location.book ? AppState.location.book.key : '');
    const _gfBkCh     = ch      != null ? ch      : (AppState.location.chapter != null ? AppState.location.chapter : null);
    const _vrVerse    = buildVerse(_gfBkKey, _gfBkCh, vNum, words);
    const _vrAnalysis = getAnalysis(_vrVerse);
    const _vrRep      = buildRepresentation({ kind: 'wordOrder' }, _vrVerse, _vrAnalysis);
    return {
        html: WordOrderRenderer.renderGreekFlowView(_vrRep),
        chips: _vrRep.chips, words, analysis: _vrAnalysis,
    };
}
