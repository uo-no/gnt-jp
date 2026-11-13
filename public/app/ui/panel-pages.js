/* ══════════════════════════════════════════
   検索ページへの文脈付き遷移
   ══════════════════════════════════════════ */
function goProximityPage() {
    const p = new URLSearchParams();

    const activeVEl   = document.getElementById('active-v');
    const activeVText = activeVEl ? activeVEl.innerText.replace(/\s*節\s*$/, '').trim() : '';

    const urlParams = Router.parse();
    const book = urlParams.book || '';
    const ch   = urlParams.chapter || '';

    /* AppState.inspect.data から語を取得（後方互換: _inspectData も同じ参照） */
    const inspData = AppState.inspect.data;
    if (inspData && inspData.greek) {
        p.set('word',  inspData.greek);
        if (inspData.lemma) p.set('lemma', inspData.lemma);
        const _gpm = parseMorphForSearch(inspData.rawMorph || '');
        console.info('[goProximityPage→search] 元トークン rawMorph:', inspData.rawMorph);
        console.info('[goProximityPage→search] parseMorphForSearch 入力:', inspData.rawMorph);
        console.info('[goProximityPage→search] parseMorphForSearch 出力:', _gpm);
        if (_gpm.pos)    p.set('pos',    _gpm.pos);
        if (_gpm.tense)  p.set('tense',  _gpm.tense);
        if (_gpm.mood)   p.set('mood',   _gpm.mood);
        if (_gpm.voice)  p.set('voice',  _gpm.voice);
        /* 動詞形（分詞含む）では格・数・性を送らない */
        if (_gpm.pos !== 'V') {
            if (_gpm.case)   p.set('case',   _gpm.case);
            if (_gpm.number) p.set('number', _gpm.number);
            if (_gpm.gender) p.set('gender', _gpm.gender);
        }
        p.set('layers', 'lemma,morph');
        console.info('[goProximityPage→search] URL パラメータ:', Object.fromEntries(p.entries()));
    }

    if (book && ch) {
        const ref = activeVText ? `${book}${ch}:${activeVText}` : `${book}${ch}`;
        p.set('ref', ref);
        if (activeVText) p.set('scope', 'verse');
    }

    const qs = p.toString();
    const url = qs ? `/search?${qs}` : '/search';
    const _stw = window.open(url, '_blank');
    if (_stw) _searchToolWindows.add(_stw);
}

function switchTab(evt, tabName) {
    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) tabContents[i].classList.remove("active");
    const tabBtns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < tabBtns.length; i++) tabBtns[i].classList.remove("active");
    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");
    document.getElementById('main-reading-area').scrollTop = 0;
}

let _renderCurrentPageToken = 0;

async function renderCurrentPage() {
    const renderToken = ++_renderCurrentPageToken;
    document.body.classList.add('chapter-navigation-loading');
    document.getElementById('main-reading-area').classList.remove('static-view');
    const urlParams = Router.parse();
    const book = urlParams.book || 'ROM';
    const ch   = urlParams.chapter || '1';

    const isNt = SB_BOOKS.nt.some(b => b.key === book);

    const allBooks = [...SB_BOOKS.nt, ...SB_BOOKS.ot];
    const found = allBooks.find(b => b.key === book);

    /* location 更新 */
    AppState.location.testament = isNt ? 'nt' : 'ot';
    AppState.location.book      = found || null;
    AppState.location.chapter   = parseInt(ch);

    /* ヘッダー/パンくず/サイドバー選択状態は AppState.ui.view から一括同期する */
    AppState.ui.view = 'bible';
    syncUIFromState();

    const hasGreek = GREEK_BOOKS.has(book);

    try {
        /* VR-4-C Step 2: init() と同じ変換（_toColumnMode()、Step 1 参照）。 */
        const _colA = _toColumnMode(_transA);
        const _colB = _toColumnMode(_transB);

        /* ColumnMode が wordOrder / discourse（Greek由来・訳文なし）の場合は翻訳JSONをfetchしない */
        const jpData = _isGreekReadingMode(_colA.kind)
            ? null
            : await _fetchTranslation(_transA, book, ch);

        let jpDataB = null;
        if (_transMode === 'compare' && !_isGreekReadingMode(_colB.kind)) {
            jpDataB = await _fetchTranslation(_transB, book, ch);
        }

        let elData = [];
        if (hasGreek) {
            try {
                const testament = SB_BOOKS.nt.some(b => b.key === book) ? 'nt' : 'lxx';
                const elRes = await fetch(`../bible_data/${testament}/${book}/${ch}.json`);
                if (elRes.ok) elData = await elRes.json();
            } catch(e) {}
        }

        /* 口語訳アラインメント（パイロット）: 対応表とトークン索引を render() の前に先読みする。
           対応表が無い翻訳・書・章では null のまま（従来表示）。 */
        if (!_isGreekReadingMode(_colA.kind)) await _loadJaAlignForRender(_transA, book, ch);
        if (_transMode === 'compare' && !_isGreekReadingMode(_colB.kind)) await _loadJaAlignForRender(_transB, book, ch);
        /* Phase 1b Step 3: 英語UIでは WEB グロスも先読みする（日本語UIでは no-op）。 */
        await _loadGlossForRender(book, ch);
        await _loadAlignForRender(book, ch);
        if (elData && elData.length) _jaSegIndexTokens(book, ch, elData);

        /* DA-1: discourse は passage単位の clause 接続を描くため、flow-tree（clause/sentence
           構造の一次データ）を render() の前に先読みする。既存 _loadFlowTreeChapter() を再利用し、
           結果は render() が読む module 変数へ渡す（既存の翻訳fetchと同じく await 済みで一貫）。 */
        _dcvChapterTreeForRender = (_colA.kind === 'discourse')
            ? await _loadFlowTreeChapter(book, ch) : null;

        /* P2: structural-diagram は SR 章データを先読みして render() へ渡す。E-4-D: relation も同一SR JSONを使用。
           B列が passage-level の場合も同じ SR JSON を使用するため、_colB.kind も対象に含める。
           Phase E: rk-reading も同一 SR JSON を使用する。 */
        _sdChapterDataForRender = (
            _colA.kind === 'structural-diagram' || _colA.kind === 'hierarchical' || _colA.kind === 'relation' || _colA.kind === 'da-reading' || _colA.kind === 'rk-reading' || _colA.kind === 'rk-reading-v' || _colA.kind === 'rk-reading-p' || _colA.kind === 'role-reading' /* C-17 Phase 1 / E-4-D / Phase E / L.2 / M */
            || _colB.kind === 'structural-diagram' || _colB.kind === 'hierarchical' || _colB.kind === 'relation' || _colB.kind === 'da-reading' || _colB.kind === 'rk-reading' || _colB.kind === 'rk-reading-v' || _colB.kind === 'rk-reading-p' || _colB.kind === 'role-reading' /* B列 passage-level */
        ) ? await _loadSrChapter(book, ch) : null;


        /* VR-5-D: resolvedJpData 決定ロジックを _getVerseSource() へ抽出（VR-5-C 参照） */
        /* QA-02: 底本に無い節（翻訳にのみ存在）を読み方モードでも表示する */
        const _missingTexts = await _fetchMissingVerseTexts(book, ch, _colA.kind, elData);
        _missingVerseTextsForRender = _missingTexts;
        const resolvedJpData = _getVerseSource(_colA, jpData, elData, _missingTexts);
        if (!resolvedJpData) throw new Error('Not found');

        /* VR-5-E-1: render() 入口を columns[] ベースへ移行（columns[i] = { colMode, jpData }） */
        const columns = [
            { colMode: _colA, jpData: resolvedJpData },
            { colMode: _colB, jpData: jpDataB },
        ];
        /* 連続した章移動では、後から完了した古い fetch が新しい章を上書きしないようにする。 */
        if (renderToken !== _renderCurrentPageToken) return false;
        render(columns, elData, hasGreek && elData.length > 0);
        document.getElementById('active-v').innerText = "";
        syncUrlState();
        _applyHighlights();
        return true;

// 本文レンダリング完了後

        // ── オンボーディング：アンカー語付与 ──────────────────
        // ヨハネ3:16表示中かつオンボーディング未完了の場合のみ実行。
        // word-card の data-greek から対象語を探し、最初の1枚に
        // data-onboarding-anchor="true" を付与する。
        // 対象語優先順: ἠγάπησεν → οὕτως → （先頭カード）
    } catch (err) {
        if (renderToken !== _renderCurrentPageToken) return false;
        document.getElementById('bible-text-area').innerHTML = `<p style="color:red">データが見つかりません。</p>`;
        return false;
    } finally {
        /* 古いリクエストの完了では、新しい章のローディング表示を解除しない */
        if (renderToken === _renderCurrentPageToken) {
            document.body.classList.remove('chapter-navigation-loading');
            /* 初回スプラッシュがまだ出ていれば最低表示つきで終える */
            if (typeof _finishFirstLoadSplash === 'function') _finishFirstLoadSplash();
            else document.body.classList.remove('app-first-load');
        }
    }
}

/* ══════════════════════════════════════════
   まめ知識
   ══════════════════════════════════════════ */
function showMameKnowledge() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');
    const parallel = document.getElementById('parallel-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'knowledge';
    syncUIFromState();

    const contentHtml = `
<div class="static-page">
    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(event, 'doushi')">動詞の読み方</button>
        <button class="tab-btn" onclick="switchTab(event, 'kanji')">冠詞</button>
        <button class="tab-btn" onclick="switchTab(event, 'kaku')">格の特徴</button>
        <button class="tab-btn" onclick="switchTab(event, 'futei')">不定詞</button>
    </div>

    <div id="doushi" class="tab-content active">
        <section>
            <aside>
                ギリシャ語の動詞には「時制」だけでなく、動作の<strong>質・ありよう</strong>が刻まれている。これを「アスペクト」という。
            </aside>
            <h3>現在形</h3>
            <p>動作が今も続いている、または繰り返されている。<span class="aspect-read">→「〜し続けている」「〜しつづけなさい」と読むと通じやすい。</span></p>
            <h3>アオリスト形</h3>
            <p>ひとつの出来事として起きた、または起こしなさい。過去の「〜した」ではなく、出来事そのものを点として指し示すイメージ。<span class="aspect-read">→「〜した（という事実）」「〜しなさい（一度）」。</span></p>
            <h3>完了形</h3>
            <p>かつて起きたことの結果が、今この瞬間も続いている。過去と現在がつながっているのが完了形の核心。<span class="aspect-read">→「〜してあり、その状態にある」と読む。</span></p>
            <h3>未来形</h3>
            <p>これから必ず起こる、または起こすという確信・意志を示す。約束や預言にも多く使われる。<span class="aspect-read">→「〜するであろう」「〜するはずだ」。</span></p>
            <h3>なぜ他の動詞には印がないの？</h3>
            <p>接続法・分詞・不定詞などは、主動詞の意味を補う従属的な役割が多い。すべてに印をつけると視覚的なノイズになるため、あえて省いている。</p>
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </section>
    </div>

    <div id="kanji" class="tab-content">
        <section>
            <aside>
                ギリシャ語の冠詞は英語の「the」とは異なり、「それが何であるか（正体）」を示す装置。基本は次の対比で整理する。<br>
                <strong>冠詞あり</strong> → 正体が特定されている<br>
                <strong>冠詞なし</strong> → 性質・本質が強調されている
            </aside>
            <h3>①　基本機能</h3>
            <p>冠詞は対象を特定し、「これである」と指し示す。無冠詞は対象の性質や特徴に焦点を当てる。</p>
            <h3>②　冠詞ありの主な用法</h3>
            <ul>
                <li>既出の対象：前に言及されたもの</li>
                <li>文脈上明らかな対象：周知のもの</li>
                <li>唯一の存在（神、太陽など）</li>
                <li>クラスを代表するもの</li>
            </ul>
            <h3>③　無冠詞名詞の主な用法</h3>
            <ul>
                <li>性質の強調（どのような存在か）</li>
                <li>不特定（ある一つの〜）</li>
                <li>文脈上は特定される（固有名詞など）</li>
            </ul>
            <h3>④　主語と述語主格</h3>
            <p>「AはBである」では、冠詞がある方が主語。動詞の前に置かれた述語主格は無冠詞になりやすく、性質が強調される。</p>
            <h3>⑤　重要な文法規則</h3>
            <ul>
                <li><strong>コルウェルの規則：</strong>動詞の前の述語主格は無冠詞になりうる。</li>
                <li><strong>グランヴィル・シャープの規則：</strong>「冠詞＋A＋και＋B」は同一人物。</li>
                <li><strong>アポロニウスの規則：</strong>関連する名詞ペアは冠詞の有無が一致しやすい。</li>
            </ul>
            <h3>⑥　実体化（名詞化）の機能</h3>
            <p>冠詞＋不定詞＝「〜すること」、冠詞＋分詞＝「〜する者」。</p>
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </section>
    </div>

    <div id="kaku" class="tab-content">
        <section>
            <aside>
                5格（主・属・与・対・呼）を「誰が・誰の・誰に・何を・呼びかけ」を軸に整理する。
            </aside>
            <h3>①　主格</h3>
            <p>コアイメージは「主体・同一性」。主語や述語主格に使われる。冠詞・代名詞・固有名詞の順に主語になりやすい。</p>
            <h3>②　属格</h3>
            <p>コアイメージは「制限・関係（〜の）」。所有、関係、性質、同格などのほか、「〜から（分離）」も表す。主格的／目的格的属格の判断が重要。</p>
            <h3>③　与格</h3>
            <p>コアイメージは「関わり・影響」。間接目的語、利益、場所（〜において）、手段（〜によって）などを表す。</p>
            <h3>④　対格</h3>
            <p>コアイメージは「動作の到達点・範囲」。直接目的語、時間の長さ、方向。<strong>不定詞の主語が対格になる</strong>点に注意。</p>
            <h3>⑤　呼格</h3>
            <p>コアイメージは「呼びかけ」。主格が代用される場合は、より強調されたニュアンスを持つ。</p>
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </section>
    </div>

    <div id="futei" class="tab-content">
        <section>
            <aside>
                動詞の性質（相）と名詞の性質（〜すること）をあわせ持つ「動詞的名詞」。
            </aside>
            <h3>①　相（アスペクト）</h3>
            <ul>
                <li>現在不定詞：進行・継続（〜し続けること）</li>
                <li>アオリスト不定詞：単純な出来事（過去ではない）</li>
                <li>完了不定詞：動作の結果の状態</li>
            </ul>
            <h3>②　名詞的な使い方</h3>
            <p>主語や目的語として働く。「〜すること」と置き換えると読みやすい。</p>
            <h3>③　副詞的な使い方</h3>
            <p>理由（〜なので）・目的（〜するために）・結果（〜するほど）などの文脈で動詞を補う。</p>
            <h3>④　前置詞＋不定詞（時間関係）</h3>
            <ul>
                <li>μετὰ + 不定詞：〜した後で</li>
                <li>ἐν + 不定詞：〜している最中に</li>
                <li>πρὸ + 不定詞：〜する前に</li>
            </ul>
            <h3>⑤　読む手順</h3>
            <p>前の動詞を確認 → 前置詞の有無を確認 → 「〜すること」と代入 → 目的か理由かを検討 → 不定詞の主語（対格）を探す</p>
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </div>
    </div>
</div>

`;
    app.innerHTML = contentHtml;
}

/* ══════════════════════════════════════════
   モバイル比較モード：1節ナビゲーション
   ══════════════════════════════════════════ */
let _mobileVerseList = [];   // { book, chapter, vnum } の配列（Phase 3-7-F: 章識別追加）
let _mobileVerseIdx  = 0;    // 現在表示中のインデックス

function _mobileCompareSetup() {
    if (window.innerWidth > 768) return;
    const area = document.getElementById('main-reading-area');
    if (!area || !area.classList.contains('compare-mode')) return;

    // 節リストを mobile-verse-group から収集（Phase 3-7-F: book/chapter/vnum で章識別）
    const groups = area.querySelectorAll('#bible-text-area .mobile-verse-group[data-vnum]');
    _mobileVerseList = Array.from(groups).map(g => ({
        book:    g.dataset.book    || '',
        chapter: g.dataset.chapter || '',
        vnum:    g.dataset.vnum    || '',
    }));
    if (_mobileVerseList.length === 0) return;

    _mobileVerseIdx = 0;
    _mobileVerseApply();

    const nav = document.getElementById('mobile-verse-nav');
    if (nav) nav.style.display = 'flex';
}

function _mobileVerseApply() {
    const area = document.getElementById('main-reading-area');
    if (!area) return;
    const cur = _mobileVerseList[_mobileVerseIdx];

    /* Phase 3-7-F: book + chapter + vnum の三つ組で対象を特定する。
       同じ節番号が異なる章に存在しても別章の節を誤選択しない。 */
    area.querySelectorAll('#bible-text-area .mobile-verse-group[data-vnum]').forEach(g => {
        const match = cur &&
            g.dataset.book    === cur.book &&
            g.dataset.chapter === cur.chapter &&
            g.dataset.vnum    === cur.vnum;
        g.style.display = match ? '' : 'none';
    });

    // ナビ表示を更新
    const numEl = document.getElementById('mvn-verse-num');
    if (numEl) numEl.textContent = cur ? cur.vnum : '';
    const prev = document.getElementById('mvn-prev');
    const next = document.getElementById('mvn-next');
    if (prev) prev.disabled = _mobileVerseIdx === 0;
    if (next) next.disabled = _mobileVerseIdx === _mobileVerseList.length - 1;

    // 先頭にスクロール
    const mainArea = document.getElementById('main-reading-area');
    if (mainArea) mainArea.scrollTop = 0;
}

function _mobileVerseNav(delta) {
    const next = _mobileVerseIdx + delta;
    if (next < 0 || next >= _mobileVerseList.length) return;
    _mobileVerseIdx = next;
    _mobileVerseApply();
}

function _mobileCompareTeardown() {
    const nav = document.getElementById('mobile-verse-nav');
    if (nav) nav.style.display = 'none';
    const area = document.getElementById('main-reading-area');
    if (area) area.querySelectorAll('#bible-text-area .mobile-verse-group').forEach(g => {
        g.style.display = '';
    });
    _mobileVerseList = [];
}

function _syncStudyVerseNav() {
    const nav = document.getElementById('study-verse-nav');
    const panel = document.getElementById('bottom-depth-panel');
    if (!nav || !panel) return;
    /* アプリのモバイルレイアウト基準（900px）に統一。word詳細だけを除外する。 */
    const mobileVerseView = document.getElementById('mobile-verse-view');
    /* MVV は z-index:200 で DepthPanel(z-index:150) 全体を覆う。
       節ナビも MVV 内に置き、実際に前面に出ている画面の open 状態で判定する。 */
    const wordDrawer = document.getElementById('wlv-detail-drawer');
    const isWordDrawerOpen = !!wordDrawer && wordDrawer.classList.contains('visible');
    const visible = window.innerWidth <= 768
        && !!mobileVerseView
        && mobileVerseView.classList.contains('open')
        && _panelContentMode !== 'word'
        && !isWordDrawerOpen;
    nav.classList.toggle('is-visible', visible);
    nav.style.setProperty('display', visible ? 'flex' : 'none', 'important');
    nav.style.setProperty('visibility', visible ? 'visible' : 'hidden', 'important');
    nav.style.setProperty('opacity', visible ? '1' : '0', 'important');
    nav.style.setProperty('pointer-events', visible ? 'auto' : 'none', 'important');
    /* nav は前面に出ている Mobile Verse View 内で画面右下に固定する。 */
    nav.style.setProperty('position', 'absolute', 'important');
    nav.style.setProperty('right', 'max(16px, env(safe-area-inset-right, 0px))', 'important');
    nav.style.setProperty('bottom', 'max(18px, env(safe-area-inset-bottom, 0px))', 'important');
    nav.style.setProperty('z-index', '1000', 'important');
}

function _navigateVerse(delta) {
    /* 現在の章の次の節ブロックを探してスクロール */
    const selectedBlocks = document.querySelectorAll('.verse-block.selected');
    let currentVNum = null;
    if (selectedBlocks.length > 0) {
        const vNumEl = selectedBlocks[0].querySelector('.v-num');
        if (vNumEl) currentVNum = parseInt(vNumEl.textContent.trim());
    }

    /* Phase 2A-4: 複数章が DOM にある場合に異なる章の同 vNum を誤選択しないよう、
       querySelectorAll を選択節の親 .chapter-block にスコープする。
       fallback: AppState.location の Focus Chapter → document（compare モード等）。 */
    let _navChBlock = null;
    if (selectedBlocks.length > 0) {
        _navChBlock = selectedBlocks[0].closest('.chapter-block') || null;
    }
    if (!_navChBlock) {
        const _nbk = AppState.location.book ? (AppState.location.book.key || '') : '';
        const _nch = AppState.location.chapter != null ? String(AppState.location.chapter) : '';
        if (_nbk && _nch) {
            _navChBlock = document.querySelector(`.chapter-block[data-book="${_nbk}"][data-chapter="${_nch}"]`);
        }
    }

    const allBlocks = (_navChBlock || document).querySelectorAll('.verse-pair-left, .verse-block:not(.verse-pair-left):not(.verse-pair-right)');
    const blockArr = Array.from(allBlocks);

    if (currentVNum !== null) {
        /* 現在の節の次を探す */
        let found = false;
        for (let i = 0; i < blockArr.length; i++) {
            const vEl = blockArr[i].querySelector('.v-num');
            if (!vEl) continue;
            const v = parseInt(vEl.textContent.trim());
            if (v === currentVNum + delta) {
                /* 節ブロックの既存クリック処理を通し、選択状態だけでなくStudyPanelの分析内容も更新する */
                blockArr[i].click();
                blockArr[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                found = true;
                break;
            }
        }
        if (!found) {
            /* 章末 → 次章へ遷移。章番号は scope block から直接読む（AppState.location より確実）。 */
            const _scopedCh = _navChBlock ? parseInt(_navChBlock.dataset.chapter, 10) : null;
            const _scopedBk = _navChBlock ? (_navChBlock.dataset.book || '') : '';
            const currentCh = (_scopedCh && !isNaN(_scopedCh)) ? _scopedCh : (AppState.location.chapter || 1);
            const nextCh    = currentCh + delta;
            const maxCh     = AppState.location.book ? AppState.location.book.ch : 999;
            if (nextCh >= 1 && nextCh <= maxCh) {
                /* Phase 2C-2: 隣章が DOM に存在する場合は scrollIntoView() で移動（フルリロード回避）。
                   AppState.location / URL / breadcrumb / title は Focus Chapter Observer が更新する。
                   隣章が DOM にない場合は従来の _navTo() にフォールバック。 */
                const _adjBk    = _scopedBk || (AppState.location.book ? AppState.location.book.key : '');
                const _adjBlock = _adjBk ? document.querySelector(
                    `.chapter-block[data-book="${_adjBk}"][data-chapter="${nextCh}"]`
                ) : null;
                if (_adjBlock) {
                    const _adjSel    = '.verse-pair-left, .verse-block:not(.verse-pair-left):not(.verse-pair-right)';
                    const _adjVerses = Array.from(_adjBlock.querySelectorAll(_adjSel));
                    const _adjTarget = delta > 0 ? _adjVerses[0] : _adjVerses[_adjVerses.length - 1];
                    if (_adjTarget) {
                        /* 隣章でも既存の節クリック処理を通して、選択節と分析内容を同期する */
                        _adjTarget.click();
                        _adjTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    } else {
                        _navTo(AppState.location.book.key, nextCh); /* 対象節なし → fallback */
                    }
                } else {
                    _navTo(AppState.location.book.key, nextCh);
                }
            }
        }
    } else {
        /* 節未選択 → 3:17へスクロール */
        for (let i = 0; i < blockArr.length; i++) {
            const vEl = blockArr[i].querySelector('.v-num');
            if (vEl && parseInt(vEl.textContent.trim()) === 17) {
                blockArr[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                break;
            }
        }
    }
}


/* ══════════════════════════════════════════
   翻訳モード管理
   ══════════════════════════════════════════ */

/* 翻訳マスター定義・変数はスクリプト先頭で宣言済み（TDZ対策） */


/*
 * _elTokenVerse — Greekトークン w から verse 番号文字列を返す。
 * NTトークン（bible_data/nt）は w.verse フィールドを持つ。
 * LXXトークン（bible_data/lxx）は w.verse を持たないため、
 * w.ref（"BOOK CH:VERSE!TOKEN" 形式）からコロン〜感嘆符間を切り出す。
 * どちらでも verse が取れない場合は null を返す。
 */
function _elTokenVerse(w) {
    if (w.verse != null) return String(w.verse);
    if (w.ref) {
        const c = w.ref.indexOf(':');
        if (c !== -1) {
            const b = w.ref.indexOf('!', c);
            return b !== -1 ? w.ref.slice(c + 1, b) : w.ref.slice(c + 1);
        }
    }
    return null;
}

/* Abbott-Smith ポップアップを開く。
   lexemeId で _lexiconData を直接引く。headword 文字列検索は行わない。 */
async function _openEtymPopup(lexemeId) {
    const entry = _lexiconData?.[lexemeId];
    const form  = entry?.headword || '';
    const enUi  = !!(window.I18N && I18N.lang === 'en');
    const esUi  = !!(window.I18N && I18N.lang === 'es');
    const gloss = esUi ? ((typeof _esShortGloss === 'function' ? _esShortGloss(lexemeId) : null) || '')
                : enUi ? (entry?.gloss || '') : (entry?.gloss_ja || '');
    let   desc  = entry?.abbottSmith || '';
    const digits = lexemeId ? lexemeId.replace(/^grc:G/i, '') : '';
    if (enUi || esUi) {
        /* 非日本語UI: 本文は Abbott-Smith 原文（description_en） */
        if (digits) {
            if (!abbottSmithDict) await loadDict();
            desc = abbottSmithDict?.[digits]?.descriptionEn || desc;
        }
    } else if (!desc && lexemeId) {
        if (!abbottSmithDict) await loadDict();
        desc = abbottSmithDict?.[digits]?.description || '';
    }
    const bd = document.getElementById('rn-etym-backdrop');
    if (!bd) return;
    document.getElementById('rn-etym-modal-gr').textContent = form;
    document.getElementById('rn-etym-modal-ja').textContent = gloss;
    const bodyEl = document.getElementById('rn-etym-modal-body');
    bodyEl.innerHTML = desc
        ? `<div class="rn-etym-as-label">Abbott-Smith</div>${_escH(desc).replace(/\n/g, '<br>')}`
        : '<span class="rn-etym-empty">' + _T('panel.noAbbottData', 'Abbott-Smithデータなし') + '</span>';
    bd.classList.add('open');
}

async function _openRefPopup(book, ch, verse, href) {
    const bd = document.getElementById('rn-ref-backdrop');
    if (!bd) { if (href) location.href = href; return; }
    const titleEl = document.getElementById('rn-ref-modal-title');
    const bodyEl  = document.getElementById('rn-ref-modal-body');
    if (titleEl) titleEl.textContent = _refTitle(book, ch, verse);
    const actionsHtml = `<div class="rn-ref-actions"><a class="rn-ref-open-btn" href="${_escH(href || ('/' + book + '/' + ch + '/' + verse))}">${_T('ref.seeInText', '本文で見る')}</a></div>`;
    if (bodyEl) bodyEl.innerHTML = '<span class="rn-etym-empty">' + _T('ui.loading', '読み込み中…') + '</span>';
    bd.classList.add('open');

    const data = (typeof _loadBdChapter === 'function') ? await _loadBdChapter(book, ch) : null;
    if (!bd.classList.contains('open')) return; /* 読み込み中に閉じられた */
    if (!Array.isArray(data)) {
        if (bodyEl) bodyEl.innerHTML = `<div class="rn-ref-note">${_T('ref.fetchFailed', 'この箇所の本文データを取得できませんでした。「本文で見る」から開いてください。')}</div>` + actionsHtml;
        return;
    }
    const toks = data.filter(t => String(t.chapter) === String(ch) && String(t.verse) === String(verse));
    if (!toks.length) {
        if (bodyEl) bodyEl.innerHTML = `<div class="rn-ref-note">${_T('ref.fetchFailed', 'この箇所の本文データを取得できませんでした。「本文で見る」から開いてください。')}</div>` + actionsHtml;
        return;
    }
    const curId = (typeof AppState !== 'undefined' && AppState.inspect && AppState.inspect.data)
        ? (AppState.inspect.data.lemmaId || _resolveLemmaId(AppState.inspect.data.strong))
        : null;
    const hits = curId ? toks.filter(t => t.lemmaId === curId) : [];
    const hitSet = new Set(hits);
    const verseHtml = toks.map(t => {
        const txt = _escH(t.text || '') + _escH(t.after || '');
        return hitSet.has(t) ? `<span class="rn-ref-hl">${txt}</span>` : txt;
    }).join(' ');
    let wordHtml = '';
    if (curId && hits.length) {
        const t = hits[0];
        const entry = (typeof _lexiconData !== 'undefined' && _lexiconData) ? _lexiconData[curId] : null;
        const headword = t.lemma || (entry && entry.headword) || '';
        const glossJa  = (entry && entry.gloss_ja) || '';
        const glossEn  = (entry && entry.gloss) || '';
        const formJa   = _refFormJa(t);
        const rows = [];
        if (headword) rows.push(`<div class="rn-ref-word-row"><dt>${_T('ref.lemma', '見出し語')}</dt><dd><span class="rn-ref-gr">${_escH(headword)}</span>${(window.I18N && I18N.lang === 'es') ? (((typeof _esShortGloss === 'function' ? _esShortGloss(curId) : null)) ? ' (' + _escH(_esShortGloss(curId)) + ')' : '') : (window.I18N && I18N.lang === 'en') ? (glossEn ? ' (' + _escH(glossEn) + ')' : '') : (glossJa ? '（' + _escH(glossJa) + '）' : '')}</dd></div>`);
        if (t.class)  rows.push(`<div class="rn-ref-word-row"><dt>${_T('morph.pos', '品詞')}</dt><dd>${_escH((t.class === 'noun' && t.type === 'proper') ? _T('morph.properNoun', '固有名詞') : (_refForm().pos[t.class] || t.class))}</dd></div>`);
        rows.push(`<div class="rn-ref-word-row"><dt>${_T('ref.form', '形')}</dt><dd><span class="rn-ref-gr">${_escH(t.text || '')}</span>${formJa ? '（' + _escH(formJa) + '）' : ''}</dd></div>`);
        const _meanGloss = _glossSidecarFor(t) || ((typeof _uiShortGloss === 'function' ? _uiShortGloss(t.lemmaId) : null)) || ((window.I18N && I18N.lang === 'es') ? '' : t.japanese);
        if (_meanGloss) rows.push(`<div class="rn-ref-word-row"><dt>${_T('ref.meaning', '意味')}</dt><dd>${_escH(_meanGloss)}</dd></div>`);
        wordHtml = `<div class="rn-ref-word-label">${_T('ref.wordInContext', 'この箇所での単語の説明')}</div><dl class="rn-ref-word-rows">${rows.join('')}</dl>`
            + (hits.length > 1 ? ((window.I18N && I18N.lang === 'es')
                ? `<div class="rn-ref-note">Este versículo contiene la misma palabra ${hits.length - 1} ${hits.length - 1 === 1 ? 'vez' : 'veces'} más (resaltada).</div>`
                : (window.I18N && I18N.lang === 'en')
                ? `<div class="rn-ref-note">This verse contains the same word ${hits.length - 1} more time(s) (highlighted).</div>`
                : `<div class="rn-ref-note">この節には他に${hits.length - 1}回、同じ語が出てきます（強調表示）。</div>`) : '');
    } else if (curId) {
        wordHtml = `<div class="rn-ref-note">${_T('ref.lemmaNotUsed', 'この箇所では見出し語そのものは使われていません。')}</div>`;
    }
    if (bodyEl) bodyEl.innerHTML = `<div class="rn-ref-verse">${verseHtml}</div>` + wordHtml + actionsHtml;
}
