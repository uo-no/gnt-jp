/**
 * 「詳しく見る」ボタン：AppState.inspect.data が設定済みなので openStudyPanel を直接呼ぶ
 */
function _wlvConcordanceClick(event) {
    if (event) event.preventDefault();
    const d = AppState.inspect.data;
    if (!d) return false;
    const morph = parseMorphForSearch(d.rawMorph || d.morph || '');
    const qs = new URLSearchParams();
    if (d.greek) qs.set('word', d.greek);
    if (d.lemma) qs.set('lemma', d.lemma);
    if (d.ref) qs.set('ref', d.ref);
    if (morph.pos) qs.set('pos', morph.pos);
    if (morph.tense) qs.set('tense', morph.tense);
    if (morph.mood) qs.set('mood', morph.mood);
    if (morph.voice) qs.set('voice', morph.voice);
    if (morph.pos !== 'V') {
        if (morph.gender) qs.set('gender', morph.gender);
        if (morph.number) qs.set('number', morph.number);
        if (morph.case) qs.set('case', morph.case);
    }
    qs.set('layers', 'lemma,morph');
    qs.set('tool', 'search');
    window.open('/search?' + qs.toString(), '_blank', 'noopener');
    return false;
}

function _wlvStudyBtnClick() {
    if (!AppState.inspect.data) return;
    const { greek, rawMorph, ref, lemma, strong } = AppState.inspect.data;

    /* word-flow を depth stack に追加（deep-reading の前に挿入）*/
    const stack = AppState.depth.stack;
    const top = stack[stack.length - 1];
    if (!top || top.type !== 'word-flow') {
        pushDepth({
            type:   'word-flow',
            label:  greek,
            strong: String(strong || ''),
        });
    }

    AppState.studyOrigin = { surface: _transA, entryPoint: 'wlv' };
    _setStudyTarget(AppState.inspect.data?.ref, AppState.inspect.data?.verseId);
    openInspectorDetail(greek, rawMorph, ref, lemma);
}

/**
 * openInspectorDetail — 単語詳細（Level3）表示の単一入口（Adapter Layer / Phase C-2）。
 *
 * chip 経路の Level3 遷移はこの関数を経由し、Desktop / Mobile の振り分けをここに閉じ込める。
 *   Desktop → openStudyPanel()（従来どおり Bottom Sheet）
 *   Mobile → #mobile-inspector-area 内で詳細表示（MobileVerseView 経路に統一）
 *
 * モバイル判定は _isActualMobile()（≤900px + タッチ）を使う。
 * MobileVerseView が開いていないモバイル文脈では、選択中の節コンテキスト
 * （AppState.selectedVerse）があれば先に MobileVerseView を開いてから詳細を表示し、
 * 呼び出し元によらずモバイルの表示経路が1つに揃うようにする。
 * 節コンテキストが無い場合のみ、従来どおり openStudyPanel にフォールバックする
 * （openStudyPanel は削除しない）。
 */
function openInspectorDetail(greek, rawMorph, ref, lemma) {
    const mvv = document.getElementById('mobile-verse-view');
    if (_isActualMobile() && mvv) {
        if (mvv.classList.contains('open')) {
            return _mobileInspectorDetail(greek, rawMorph, ref, lemma);
        }
        const sv = AppState.selectedVerse;
        if (sv && sv.vNum != null && Array.isArray(sv.elWords) && sv.elWords.length) {
            openMobileVerseView(sv.vNum, sv.elWords, null, sv.ch != null ? sv.ch : null);
            return _mobileInspectorDetail(greek, rawMorph, ref, lemma);
        }
    }
    return openStudyPanel(greek, rawMorph, ref, lemma);
}

/**
 * _mobileInspectorDetail — MobileVerseView 下部に単語詳細（Level3）を表示する（Phase C-3）。
 *
 * データは呼び出し直前に既存コード（_wlvChipClick）が設定した AppState.inspect.data を
 * SSOT とし、引数は fallback として使う。表示 HTML の生成は _renderMobileWordDetail に分離。
 * openStudyPanel / Bottom Sheet / AppState には触れない（inspect.data は読むだけ）。
 * 自動生成 Reading Notes（_renderReadingNotes）は移植しない。ユーザー手書きメモ（mvv）のみ末尾に追加。
 */
function _mobileInspectorDetail(greek, rawMorph, ref, lemma) {
    const area = document.getElementById('mobile-inspector-area');
    if (!area) return;
    /* E-1B: Level2（一覧）から詳細へ入る直前に、一覧のスクロール位置を保存（戻る時に復元） */
    if (_mobileVerseInspectorMode === 'list') _mvvInspectorScrollTop = area.scrollTop;
    /* Level3（単語詳細）を描画するので内部状態は detail（戻るボタンが一覧へ戻す判定に使う） */
    _mobileVerseInspectorMode = 'detail';
    /* 語の分析中は節の読書メモを非表示にする。非同期注入されたメモにも CSS で適用する。 */
    const verseArea = document.getElementById('mobile-verse-area');
    if (verseArea) verseArea.classList.add('word-analysis-open');
    const passageNote = document.querySelector('#mobile-verse-view .mvv-passage-note');
    if (passageNote) passageNote.open = false;
    _syncMobileVerseViewBackLabel();
    _syncMobileVerseTitle();
    const d = AppState.inspect.data || {};

    /* Research Panel 導線用 URL（Desktop _renderReadingNotes と同じパラメータ規則）。
       rawMorph の解析は parseMorphForSearch() に委ねる（重複実装しない）。
       AppState.inspect.data から直接読み取り、undefined/null/空文字は省略する。 */
    const _mvvRm = (d.rawMorph || rawMorph) ? parseMorphForSearch(d.rawMorph || rawMorph) : {};
    const _mvvJword = d.jaWordDisplay || d.jaWord || '';

    /* StudyPanel parity: Concordance URL（Desktop _renderReadingNotes と同じパラメータ規則）。 */
    const _mvvConcordQs = new URLSearchParams();
    const _mvvGreek  = d.greek || greek || '';
    const _mvvLemma  = d.lemma || lemma || '';
    const _mvvRef    = d.ref   || ref   || '';
    if (_mvvGreek) _mvvConcordQs.set('word',  _mvvGreek);
    if (_mvvLemma) _mvvConcordQs.set('lemma', _mvvLemma);
    if (_mvvRef)   _mvvConcordQs.set('ref',   _mvvRef);
    if (_mvvRm.pos)    _mvvConcordQs.set('pos',    _mvvRm.pos);
    if (_mvvRm.tense)  _mvvConcordQs.set('tense',  _mvvRm.tense);
    if (_mvvRm.mood)   _mvvConcordQs.set('mood',   _mvvRm.mood);
    if (_mvvRm.voice)  _mvvConcordQs.set('voice',  _mvvRm.voice);
    if (_mvvRm.pos !== 'V') {
        if (_mvvRm.gender) _mvvConcordQs.set('gender', _mvvRm.gender);
        if (_mvvRm.number) _mvvConcordQs.set('number', _mvvRm.number);
        if (_mvvRm.case)   _mvvConcordQs.set('case',   _mvvRm.case);
    }
    _mvvConcordQs.set('layers', 'lemma,morph');
    _mvvConcordQs.set('tool',   'search');
    const _mvvConcordURL = `/search?${_mvvConcordQs.toString()}`;

    /* StudyPanel parity: Display Label（ReadingLexicon.getDisplayLabel から同期取得）。
       lemmaId は toBrowsing() 退避・復元により保持されている。 */
    const _mvvResolvedId = (d.lemmaId != null) ? d.lemmaId : _resolveLemmaId(d.strong || '');
    const _mvvDisplayLabel = (window.App?.readingLexicon?.getDisplayLabel(_mvvResolvedId)) || _mvvJword || '';

    /* StudyPanel parity: Morphological candidates（Desktop openStudyPanel と同じ経路）。 */
    const _mvvCandidates = getMorphCandidates(d.rawMorph || rawMorph || '', _mvvGreek).alternatives;

    /* StudyPanel parity: Experienced Reader labels（Desktop _renderReadingNotes と同じロジック）。
       AppState.inspect.data からは rawMorph が失われているため、引数の rawMorph を使う。 */
    let _mvvExpLabelHTML = '';
    if (window.App.onboarding?.getState()?.experiencedReader && _mvvRm.pos === 'V') {
        const _labels = [];
        if (typeof classifyMiddleVoice === 'function') {
            const mvc = classifyMiddleVoice(_mvvLemma, _mvvRm.voice);
            if (mvc) _labels.push(_T('exp.middleVoice', '中動態として読むこともできます'));
        }
        if (typeof detectDivinePassive === 'function' && typeof decodeMorph === 'function') {
            const dp = detectDivinePassive({ word: _mvvGreek, lemma: _mvvLemma, morph: d.rawMorph || rawMorph }, [], decodeMorph);
            if (dp && dp.isDivinePassive) _labels.push(_T('exp.impliedAgent', '行為者が暗示されています'));
        }
        if (_labels.length > 0) {
            _mvvExpLabelHTML = `<div class="rn-exp-labels" data-study-section="explabel">${
                _labels.map(l => `<span class="rn-exp-label">${l}</span>`).join('')
            }</div>`;
        }
    }

    /* 口語訳は Level3 の描画対象外。DOM を退避し、戻る際に再利用する。 */
    const translationNode = area.querySelector('.mvv-inline-translation');
    if (translationNode) {
        _mvvTranslationNode = translationNode;
        translationNode.remove();
    }

    /* 構造軸（冠詞付き不定詞）: desktop と同じ共通ヘルパーで検出し、
       「原文から確認できる情報」に形の事実として渡す。 */
    let _mvvStructureText = '';
    if (_mvvRm.mood === 'infinitive') {
        const _mvvStructFn = window.App?.syntax?.articularInfinitiveStructure;
        const _mvvScope = _wlvActiveScopeWords || _wlvWordCache;
        if (typeof _mvvStructFn === 'function' && Array.isArray(_mvvScope)) {
            const _mvvStructIdx = _mvvScope.findIndex(t => t.ref === _mvvRef);
            const _mvvStruct = _mvvStructIdx >= 0 ? _mvvStructFn(_mvvScope, _mvvStructIdx) : null;
            if (_mvvStruct) _mvvStructureText = (window.I18N && I18N.lang === 'es') ? (_mvvStruct.label_es || '') : (window.I18N && I18N.lang === 'en') ? (_mvvStruct.label_en || _mvvStruct.label_ja) : _mvvStruct.label_ja;
        }
    }

    area.innerHTML = _renderMobileWordDetail({
        greek:        _mvvGreek,
        lemma:        _mvvLemma,
        structureText: _mvvStructureText,
        rawMorph:     d.rawMorph || rawMorph || '',
        /* 表示用日本語（Presentation Policy 適用済みを優先） */
        gloss:        _mvvJword,
        displayLabel: _mvvDisplayLabel,
        strong:       d.strong   || '',
        resolvedId:   _mvvResolvedId,
        concordURL:   _mvvConcordURL,
        morphCandidates: _mvvCandidates,
        expLabelHTML: _mvvExpLabelHTML,
    });
    /* Phase D-3B: メモは固定領域 #mobile-verse-note-area にあり、Level3 でも同じ ref を編集する。
       ここでは動的領域に注入しない（Level 遷移で内容・開閉状態を保持するため）。 */

    /* Phase VR-4B-5: Representation lifecycle 是正。
       prefer verse-local words stored on DOM representation（_wlvChipClick が解決した
       _wlvActiveScopeWords）; _wlvWordCache remains legacy fallback only。
       _wlvChipClick と同じ scope の words を使うことで、chip・Inspector詳細・
       このスロットの3者が常に同一節を参照するようにする（節取り違え防止）。 */
    const _scopeWords = _wlvActiveScopeWords || _wlvWordCache;
    /* VR-2 Phase 2: _fillMvvReadingSlot/_fillMvvSemanticSlot は実際の配列位置を必要とする
       （下流関数は変更しない）ため、_wlvActiveTokenId から一度だけ findIndex() して idx を
       求める（find()+indexOf() の二重探索はしない）。 */
    const _scopeIdx = _scopeWords ? _scopeWords.findIndex(w => w.tokenId === _wlvActiveTokenId) : -1;

    /* StudyPanel parity: Reading prose / Phrase / Observation / Evidence を rich HTML で注入。 */
    _fillMvvReadingSlot(_scopeWords, _scopeIdx);
    /* LN 由来の意味グループ表示は一時停止中。データ・関数は保持し、再開条件は docs/DATA_LICENSE.md を参照。 */
    if (LN_RELATED_WORDS_ENABLED) {
        _fillMvvSemanticSlot(_mvvResolvedId, _mvvGreek, d.strong || '');
    }
    /* SF-22: Structure Flow を mobile 語詳細へ非同期注入（fire-and-forget・世代管理）。 */
    _fillMvvFlowSlot(AppState.inspect.data?.ref || ref);
    /* 語の役割の局所表示を非同期注入（fire-and-forget・世代管理）。 */
    _fillMvvRelationSlot(AppState.inspect.data?.ref || ref);
    /* 統語論ラベルを非同期注入（_buildSyntaxLabelHTML を desktop と共用）。 */
    _fillMvvSyntaxSlot(_scopeWords, AppState.inspect.data?.ref || ref);
    /* StudyPanel parity: Usage trends / Etymology / Abbott-Smith を非同期注入。 */
    _fillMvvLevel2Slot(_mvvResolvedId);
}

/* Phase F-3: 語A解析中に語Bへ移動した場合、古い非同期結果の誤注入を防ぐ世代カウンタ。
   Level2 ドロワー用 _wlvResonanceGen とは独立させ、相互キャンセルを避ける。 */
let _mvvReadingGen = 0;

/**
 * _stripHTMLToText — HTML文字列からテキストのみを取り出す変換専用ユーティリティ（Phase ESM-36）。
 * 一時要素はDOMに追加しない（描画・副作用なし、実際の画面には一切現れない）。
 * innerHTMLへの書き込みはこの使い捨て要素に対してのみ行い、実際の表示スロットへは
 * 常に textContent のみを書く（Guard Rule はここでは崩さない）。
 * 入力は既存の生成関数（_escH でエスケープ済み）が返すHTMLのみを想定する。
 */
function _stripHTMLToText(html) {
    try {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || '').trim();
    } catch (_) {
        return '';
    }
}

/**
 * _fillMvvReadingSlot — 常時表示域（#mvv-reading-slot、.mvv-l3-word内）へ
 * 既存 ReadingFormatter 経由の語レベル読書メモを非同期注入する（Phase F-3）。
 * Phase ESM-9: Referent Evidence を統合（デスクトップ _renderReadingNotes と
 * 同じ位置関係＝Wallace文の直後）。ESM-8のモバイルヘッダー表示は廃止済み。
 * Phase ESM-20: Desktop Layer 2（常時表示）と揃えるため、折りたたみ「読みを深める」
 * から常時表示域へ移動。表示条件・生成ロジックは無変更、トグル対象を
 * 「<details>セクション」から「スロット自身」に変えただけ。
 * Phase ESM-36: Phrase Reading（かたまりの読書メモ）を追加。生成は既存
 * _buildPhraseReadingHTML() をそのまま利用し、新しい解析・Projectionは行わない
 * （_getReadingSupportProjection は _buildWordResonanceText と同じキャッシュを再利用するのみ）。
 * 戻り値はHTML（Desktop用）のため、_stripHTMLToText でプレーンテキスト化してから結合する。
 * Phase ESM-39: Subjref Evidence を追加（Referent Evidenceの直後）。生成源は
 * _resolveSubjrefEvidenceText の転写のみで、新しい主語判定ロジックは持たない。
 * Phase ESM-45-B-1: Observation を追加（Phrase Readingの直後・Referent Evidenceの前、
 * Desktop `_renderReadingNotes()` と同じ相対順序）。生成は既存 _buildObservationHTML()
 * をそのまま利用し、新しい解析・Projectionは行わない（Wallace/Phrase Readingと同じ
 * キャッシュを再利用するのみ）。existingTexts には sentence／phraseText を渡し、
 * Desktop側の [wordProseText, phraseReadingHTML] と同じ重複回避目的で使う。
 * 戻り値はHTMLのため、Desktop同様 _naturalizeObservationText() で角括弧引用のみ
 * 表示整形してから、_stripHTMLToText でプレーンテキスト化して結合する。
 *
 * 原則:
 *   - 文章生成は _buildWordResonanceText（＝ReadingFormatter.format/combine）と
 *     _buildPhraseReadingHTML／_buildObservationHTML のみ。ここでは新しい文章を作らない。
 *     Referent Evidence・Subjref Evidence も同様に新しい生成を行わず、
 *     _resolveReferentEvidenceText／_resolveSubjrefEvidenceText の転写のみ。
 *   - Guard Rule は ReadingFormatter 側（assertReadingTextSafe）で保証済み。注入は textContent のみ。
 *   - 該当なし（sentence／phraseText／observationText／referentEvidence／subjrefEvidence
 *     のいずれも無い＝静寂）のときはスロット自身を非表示。いずれか1つでも存在すれば
 *     表示する（ESM-7仕様の考え方を踏襲: 各要素は独立して表示条件を持つ）。
 *   - AppState / storage / URL は触れない。世代カウンタで stale 結果を破棄する。
 */
async function _fillMvvReadingSlot(words, idx) {
    const slot = document.getElementById('mvv-reading-slot');
    if (!slot) return;
    const myGen = ++_mvvReadingGen;
    /* 開始時はいったん空＋非表示（内容が確定するまで見せない） */
    slot.innerHTML = '';
    slot.style.display = 'none';

    /* Desktop _renderReadingNotes と同じ生成経路（ReadingFormatter 統一版）。
       prose/phrase/observation は HTML を生成し、そのまま innerHTML へ注入する
       （既存の _escH + ReadingFormatter の Guard Rule で安全性を保証）。 */
    let wordProseText = null;
    let phraseReadingHTML = '';
    let observationHTML = '';
    try {
        wordProseText = await _buildWordResonanceText(words, idx);
    } catch (_) {
        wordProseText = null;
    }
    try {
        phraseReadingHTML = (await _buildPhraseReadingHTML(words, idx)) || '';
    } catch (_) { phraseReadingHTML = ''; }
    try {
        observationHTML = _naturalizeObservationText(
            (await _buildObservationHTML(words, idx, [wordProseText, phraseReadingHTML])) || ''
        );
    } catch (_) { observationHTML = ''; }
    const _trText = await _translationEvidenceText(words && words[idx] ? words[idx].ref : null);
    if (myGen !== _mvvReadingGen) return;   /* 既に別の語へ移動済み → 破棄 */

    /* Desktop と同じ HTML 構造で組み立てる（data-study-section も同じ値）。 */
    const proseHTML = wordProseText
        ? `<div class="rn-prose reading-block" data-study-section="reading"><p class="rn-prose-text reading-prose">${wordProseText}</p></div>`
        : '';

    const _reText = _resolveReferentEvidenceText(AppState.inspect.data?.referentEvidence);
    const referentEvidenceHTML = _reText
        ? `<div class="rn-referent-evidence" data-study-section="referent">${(window.I18N && I18N.lang === 'es') ? `Esta palabra se refiere a "${_escH(_reText)}".` : (window.I18N && I18N.lang === 'en') ? `This word refers to "${_escH(_reText)}".` : `この語は「${_escH(_reText)}」を指しています。`}</div>`
        : '';
    const _subjText = _resolveSubjrefEvidenceText(AppState.inspect.data?.subjrefEvidence);
    const _subjEvidenceText = _subjText
        ? _wallacePipeline?.rf?.formatSubjrefEvidence(_subjText)
        : null;
    const subjrefEvidenceHTML = _subjEvidenceText
        ? `<div class="rn-subjref-evidence" data-study-section="subjref">${_escH(_subjEvidenceText)}</div>`
        : '';

    const translationEvidenceHTML = _trText
        ? `<div class="rn-translation-evidence" data-study-section="translation">${_escH(_trText)}</div>`
        : '';
    const _repText = _repetitionEvidenceText(words, idx);
    const repetitionEvidenceHTML = _repText
        ? `<div class="rn-repetition-evidence" data-study-section="repetition">${_escH(_repText)}</div>`
        : '';

    const richHTML = [
        proseHTML,
        phraseReadingHTML ? `<div data-study-section="phrase">${phraseReadingHTML}</div>` : '',
        observationHTML   ? `<div data-study-section="observation">${observationHTML}</div>` : '',
        referentEvidenceHTML,
        subjrefEvidenceHTML,
        translationEvidenceHTML,
        repetitionEvidenceHTML,
    ].filter(Boolean).join('');

    /* HTMLタグだけ・空白だけの結果ではトグルを作らない。表示テキストがある場合のみ表示する。 */
    if (richHTML && _stripHTMLToText(richHTML)) {
        /* 第三層では第一層の節メモとは別に、この語に対応する読書メモを開いた状態で表示する。 */
        slot.innerHTML = `<button type="button" class="rn-word-reading-note-heading" aria-expanded="true">${_T('panel.wordReadingNote', 'この語の読書メモ')}</button><div class="rn-word-reading-note-body">${richHTML}</div>`;
        slot.style.display = 'block';
        const memoHeading = slot.querySelector('.rn-word-reading-note-heading');
        const memoBody = slot.querySelector('.rn-word-reading-note-body');
        if (memoHeading && memoBody) {
            memoHeading.addEventListener('click', () => {
                const isOpen = memoHeading.getAttribute('aria-expanded') === 'true';
                memoHeading.setAttribute('aria-expanded', String(!isOpen));
                memoBody.hidden = isOpen;
            });
        }
    } else {
        slot.innerHTML = '';
        slot.style.display = 'none';   /* 静寂：空のトグルを残さずスロット自身を非表示 */
    }
}

/* SF-22: mobile 語詳細 → Structure Flow を非同期注入。desktop の生成器
 * _buildFlowTreeNeighborhoodViewHTML(ref) を無改変で再利用（HTML は生成器内で _escH 済み、
 * desktop reading-notes-area と同一経路）。_fillMvvReadingSlot と同じ世代管理で、
 * 語/verse 切替時の stale 注入と inspector クローズ後の注入を防ぐ。SF-20 の FLOW 構造は不変。 */
let _mvvFlowGen = 0;
async function _fillMvvFlowSlot(ref) {
    const slot0 = document.getElementById('mvv-flow-slot');
    if (!slot0) return;
    const myGen = ++_mvvFlowGen;
    slot0.innerHTML = '';
    let html = '';
    try { html = ref ? await _buildFlowTreeNeighborhoodViewHTML(ref, AppState.studyTarget?.verseId) : ''; } catch (_) { html = ''; }
    if (myGen !== _mvvFlowGen) return;                       /* 別の語/verse へ移動済み → 破棄 */
    const slot = document.getElementById('mvv-flow-slot');   /* inspector を閉じた後は null */
    if (!slot) return;
    slot.innerHTML = html || '';                             /* '' は空のまま（静寂） */
}

/* Phase F-4: 語A検索中に語Bへ移動した場合、古い semantic 結果の誤注入を防ぐ世代カウンタ。
   Reading Notes 用 _mvvReadingGen とは独立。 */
let _mvvSemanticGen = 0;

/**
 * _fillMvvSemanticSlot — Level3「意味を見る」（#mvv-semantic-slot）へ
 * 既存 semantic lookup 経路のドメインラベルを非同期注入する（Phase F-4）。
 *
 * 原則（semantic = 情報提供のみ）:
 *   - 既存経路（_ensureSemanticData → _resolveLemmaId → _lexiconData[id].domains → _getDomainLabel）
 *     のラベルをそのまま列挙するだけ。文脈解釈・意味決定・教理説明・補足文章は行わない。
 *   - 注入は textContent のみ（innerHTML 禁止）。
 *   - 該当なし（ラベルなし＝静寂）のときは「意味を見る」セクションごと非表示。
 *   - AppState / storage / URL は触れない。世代カウンタで stale 結果を破棄する。
 *   - Reading Notes（読みを深める）とは別スロット・別役割（こちらは語義の分類ラベル）。
 */
/* _fillMvvSemanticSlot — Desktop の _injectStudyPanelContent を再利用して
 * cluster chips を Mobile semantic slot へ注入する（StudyPanel parity）。
 * resolvedId / greek / strong は _mobileInspectorDetail が計算した値を引数で受け取る
 * （AppState.inspect.data?.lemmaId が toBrowsing() 退避・復元により保持されていることが前提）。
 * 世代管理は _mvvSemanticGen で stale 注入を防ぐ。
 */
async function _fillMvvSemanticSlot(resolvedId, greek, strong) {
    const slot = document.getElementById('mvv-semantic-slot');
    if (!slot) return;
    const section = slot.closest('.mvv-l3-section');
    const myGen = ++_mvvSemanticGen;
    slot.innerHTML = '';
    if (section) section.style.display = 'none';

    try {
        if (myGen !== _mvvSemanticGen) return;
        /* Desktop と同じ _injectStudyPanelContent を呼ぶ（内部で _ensureSemanticData を呼ぶ）。 */
        await _injectStudyPanelContent(slot, strong, resolvedId, greek);
    } catch (_) {
        /* 静寂：失敗時はセクションを非表示のまま */
    }
    if (myGen !== _mvvSemanticGen) return;

    const slotCheck = document.getElementById('mvv-semantic-slot');
    if (!slotCheck) return;
    if (slotCheck.innerHTML.trim()) {
        if (section) section.style.display = '';
    } else {
        if (section) section.style.display = 'none';   /* 静寂 */
    }
}

/* 統語論ラベルを mobile 語詳細の #mvv-syntax-slot へ非同期注入する。
 * _buildSyntaxLabelHTML（desktop と共通）を再利用し、世代管理で stale を防ぐ。 */
let _mvvSyntaxGen = 0;
async function _fillMvvSyntaxSlot(words, targetRef) {
    const slot = document.getElementById('mvv-syntax-slot');
    if (!slot) return;
    const myGen = ++_mvvSyntaxGen;
    slot.innerHTML = '';
    slot.style.display = 'none';
    let html = '';
    try { html = await _buildSyntaxLabelHTML(words, targetRef); } catch (_) { html = ''; }
    if (myGen !== _mvvSyntaxGen) return;
    if (html) {
        const group = slot.closest('[data-study-group="analysis"]');
        if (group) group.style.display = '';
        if (group && !group.querySelector('.rn-l3-group-label')) {
            const label = document.createElement('div');
            label.className = 'rn-l3-group-label';
            label.textContent = _T('panel.analysisInfo', '分析候補・統語情報');
            group.insertBefore(label, group.firstChild);
        }
        slot.innerHTML = html;
        slot.style.display = '';
    }
}

/* StudyPanel parity: _fillMvvLevel2Slot — 「辞書的意味を見る」内の非同期コンテンツ
 * （Usage trends / Etymology / Abbott-Smith）を _lexiconData 経由で注入する。
 * Desktop _renderReadingNotes の同名セクションと同じデータ・HTML 構造を使う。
 * 世代管理は _mvvLevel2Gen で stale 注入を防ぐ。 */
let _mvvLevel2Gen = 0;
async function _fillMvvLevel2Slot(resolvedId) {
    const etmSlot = document.getElementById('mvv-etymology-slot');
    const abbSlot = document.getElementById('mvv-abbott-slot');
    if (!etmSlot && !abbSlot) return;
    const myGen = ++_mvvLevel2Gen;
    if (etmSlot) etmSlot.innerHTML = '';
    if (abbSlot) abbSlot.innerHTML = '';

    try {
        await _ensureSemanticData();
        if (myGen !== _mvvLevel2Gen) return;

        const lexEntry   = resolvedId ? _lexiconData?.[resolvedId] : null;
        const contexts   = lexEntry?.contexts || {};
        const synopticRefs = contexts.synoptic_refs || [];
        const paulineRefs  = contexts.pauline_refs  || [];

        const _enUiAbbottMvv = window.I18N && I18N.lang !== 'ja';
        const _abbottDigitsMvv = resolvedId ? resolvedId.replace(/^grc:G/i, '') : '';
        let abbottSmithText = '';
        if (_enUiAbbottMvv && _abbottDigitsMvv) {
            await loadDict();
            abbottSmithText = abbottSmithDict?.[_abbottDigitsMvv]?.descriptionEn || '';
        } else {
            abbottSmithText = lexEntry?.abbottSmith || '';
        }

        /* 使用傾向は検索ツールで確認するため、第三層では重複表示しない。 */

        /* Etymology（Desktop _renderReadingNotes と同じ経路） */
        const compositionParts = getWordComposition(resolvedId);
        const etymologyHTML = compositionParts
            ? `<div class="rn-etymology" data-study-section="etymology">${_T('panel.etymology', '語源')}&emsp;<span class="rn-etymology-parts">${_buildEtymPartsHTML(compositionParts)}</span></div>`
            : '';

        /* Abbott-Smith full text */
        const abbottFullHTML = abbottSmithText
            ? `<div class="rn-dict-full-section" data-study-section="abbott">
                   <div class="rn-dict-full-text">${_enUiAbbottMvv ? _renderDictionaryLinkedText(abbottSmithText) : _renderAbbottFullText(abbottSmithText)}</div>
               </div>`
            : '';

        if (myGen !== _mvvLevel2Gen) return;
        const etmSlotCheck = document.getElementById('mvv-etymology-slot');
        const abbSlotCheck = document.getElementById('mvv-abbott-slot');
        if (!etmSlotCheck && !abbSlotCheck) return;
        if (etmSlotCheck) etmSlotCheck.innerHTML = etymologyHTML;
        if (abbSlotCheck) abbSlotCheck.innerHTML = abbottFullHTML;
        const lexicalHeading = document.getElementById('mvv-lexical-heading');
        const lexicalGroup = document.getElementById('mvv-lexical-group');
        const lexicalDetails = document.getElementById('mvv-lexical-details');
        if (lexicalHeading) lexicalHeading.style.display = (etymologyHTML || abbottFullHTML) ? '' : 'none';
        if (lexicalGroup) lexicalGroup.style.display = (etymologyHTML || abbottFullHTML) ? '' : 'none';
        if (lexicalDetails) lexicalDetails.style.display = (etymologyHTML || abbottFullHTML) ? '' : 'none';
    } catch (_) {
        /* 静寂：失敗時はスロット空のまま */
    }
}

/**
 * _renderMobileWordDetail — 単語詳細（Level3）の HTML を生成する。
 *
 * 役割は「読書補助」。研究画面化しない。構造（Phase ESM-20: Desktop StudyPanelと
 * Layer 2の常時表示範囲を一致させた区画）:
 *   【語】…常時表示（Layer 2 = 読む）: Greek + 日本語Gloss + #mvv-reading-slot
 *     （Wallace Reading Notes / Phrase Reading / Observation / Referent Evidence。
 *      内容生成ロジックは _fillMvvReadingSlot() のまま変更なし。該当なしの間は
 *      display:none で非表示＝静寂優先。ESM-16まで存在した「読みを深める」の
 *      折りたたみは廃止し、Desktop同様Layer 2として常時表示域に置く）
 *   〔形と関係を見る〕…折りたたみ（native details・既定開、Layer 3 = 調べる）:
 *     Lemma / Strong / Morphology・分析候補（Desktopの同名トグルに相当する研究情報）
 *   〔辞書的意味を見る〕…折りたたみ（native details・既定閉）＋語源・辞書全文スロット
 *     （内容が無い語ではセクションごと非表示。_fillMvvLevel2Slot が表示を制御）
 *   〔意味を見る〕…折りたたみ（native details・既定閉）＋空スロット #mvv-semantic-slot
 *
 * 折りたたみは native <details>/<summary> のみで実現（新規 AppState / storage / URL 状態なし）。
 * スロットは将来の非同期注入用に識別子だけ確保し、今は空（データ取得・文章生成は行わない）。
 * 形態情報タグは既存 buildMorphTagsHTML() を再利用（HTML の二重実装を避ける）。
 */
function _renderMobileWordDetail(d) {
    const morphTags = d.rawMorph ? buildMorphTagsHTML(d.rawMorph) : '';

    /* Morphological candidates — Desktop _renderReadingNotes と同じ生成ロジック */
    const JPN_FULL_MC = _morphFull();
    const PERSON_JP_MC = _morphFull().person;
    let morphCandidatesHTML = '';
    if (Array.isArray(d.morphCandidates) && d.morphCandidates.length > 0) {
        const candItems = d.morphCandidates.map(c => {
            const parts = [_morphFull().pos.V];
            if (c.mood) parts.push(JPN_FULL_MC.mood[c.mood] || c.mood);
            if (c.voice) parts.push(JPN_FULL_MC.voice[c.voice] || c.voice);
            if (c.tense) parts.push(JPN_FULL_MC.tense[c.tense] || c.tense);
            if (c.mood === 'participle') {
                if (c.gender) parts.push(JPN_FULL_MC.gender[c.gender] || c.gender);
                if (c.number) parts.push(JPN_FULL_MC.number[c.number] || c.number);
                if (c.case) parts.push(JPN_FULL_MC.case[c.case] || c.case);
            } else {
                if (c.person) parts.push(_personText(c.person));
                if (c.number) parts.push(JPN_FULL_MC.number[c.number] || c.number);
            }
            return `<li class="rn-mc-item"><div class="rn-mc-chips">${parts.map(part => `<span class="rn-mc-chip">${_escH(part)}</span>`).join('')}</div></li>`;
        }).join('');
        morphCandidatesHTML = `<div data-study-section="candidates"><div class="rn-mc-details"><div class="rn-mc-label">${_T('panel.otherForms', '他に成立する形態')}</div><ul class="rn-mc-list">${candItems}</ul></div></div>`;
    }

    const hasStudyDetails = !!(d.lemma || d.strong || morphTags || morphCandidatesHTML);

    /* 日本語代表語義は画面ヘッダーに表示済み。StudyPanel内では重複表示しない。 */
    const shownLabel = '';

    /* 辞書的な説明は辞書全文のみを表示する。 */
    return `
      <div class="mvv-word-detail" style="padding:0 0 var(--space-lg);">
        <!-- 読書メモは語詳細全体をスクロール範囲として固定するため、Level3の内側ではなく最上位に置く。 -->
        <div id="mvv-reading-slot" style="display:none;margin:0;"></div>
        <!-- ギリシャ語見出し・日本語代表語義は画面ヘッダーに表示済み。重複する空領域は生成しない。 -->

        <!-- Experienced Reader labels（synchronous: _mobileInspectorDetail 生成済み） -->
        ${d.expLabelHTML || ''}

        <!-- SF-22: Structure Flow スロット（desktop reading-notes-area と同じ生成 HTML を非同期注入。
             生成物が自前の <details class="rn-level-section"> を持つため外側に details を足さない）。 -->
        <div id="mvv-flow-slot" data-study-section="structure" style="margin-top:var(--space-md);"></div>

        <!-- 語の役割の局所表示（選択語の文全体をパン可能な枠に表示）: _fillMvvRelationSlot が非同期注入 -->
        <div id="mvv-relation-slot" class="role-reading-view"></div>

        ${hasStudyDetails ? `
        <details class="mvv-l3-section rn-l3-entry" data-study-section="morphology" open>
          <summary class="mvv-l3-summary">${_T('panel.formAndRelations', '形と関係を見る')}</summary>
          <div class="mvv-l3-slot">
            ${(d.lemma || d.strong || morphTags) ? `<div class="rn-l3-group" data-study-group="facts"><div class="rn-l3-group-label">${_T('panel.factsFromText', '原文から確認できる情報')}</div>
              ${(d.lemma ? `<div>${_T('panel.lemmaPrefix', '見出し語: ')}<span class="mvv-l3-lemma">${_escH(d.lemma)}</span></div>` : '')}
              ${(d.strong ? `<div class="mvv-l3-strong" style="margin-top:var(--space-xs);">Strong: ${_escH(String(d.strong))}</div>` : '')}
              ${(morphTags ? `<div style="margin-top:var(--space-md);">${morphTags}</div>` : '')}
              ${(d.structureText ? `<div style="margin-top:var(--space-xs);">${_T('panel.structureLabel', '構造')}: ${_escH(d.structureText)}</div>` : '')}
            </div>` : ''}
            <div class="rn-l3-group" data-study-group="analysis" style="${morphCandidatesHTML ? '' : 'display:none;'}">
              ${(morphCandidatesHTML ? `<div class="rn-l3-group-label">${_T('panel.analysisInfo', '分析候補・統語情報')}</div>${morphCandidatesHTML}` : '')}
              <div id="mvv-syntax-slot" class="rn-syntax-labels" data-study-section="syntax" style="display:none;"></div>
            </div>
          </div>
        </details>
        <details class="mvv-l3-section rn-l3-entry" data-study-section="lexical" id="mvv-lexical-details" style="display:none;">
          <summary class="mvv-l3-summary">${_T('panel.lexicalMeaning', '辞書的意味を見る')}</summary>
          <div class="mvv-l3-slot">
            <div class="rn-l3-group" data-study-group="lexical" id="mvv-lexical-group" style="display:none;">
              <div class="rn-l3-group-label" id="mvv-lexical-heading" style="display:none;">${_T('panel.lexicalMaterials', '語義・語彙資料')}</div>
              <div class="rn-l3-group-content">
                <div id="mvv-etymology-slot"></div>
                <div id="mvv-abbott-slot"></div>
              </div>
            </div>
          </div>
        </details>` : ''}

${LN_RELATED_WORDS_ENABLED ? `
        <!-- TEMPORARILY DISABLED: LN 由来の関連語表示。再開条件は docs/DATA_LICENSE.md を参照。 -->
        <details class="mvv-l3-section" data-study-section="semantic">
          <summary class="mvv-l3-summary">関連する語を調べる</summary>
          <div class="mvv-l3-slot" id="mvv-semantic-slot"></div>
        </details>` : ''}

      </div>`;
}

/* ── 原語タブ ── */
function _buildGreekTabHTML(words) {
    const JPN_POS = { V:'動詞', N:'名詞', A:'形容詞', R:'関代', P:'代名', T:'冠詞', D:'指代', ADV:'副詞', PREP:'前置', CONJ:'接続', PRT:'添語' };
    /* Stage B: 原語タブも Engine を日本語の SSOT にする（cache 再利用） */
    const _gtResolved = _getVerseResolved(words);
    const rows = words.map((w, _gi) => {
        const pos     = (w.morph || '').split('-')[0];
        const posJpn  = JPN_POS[pos] || pos;
        const strong  = normalizeStrong(w.strong);
        const jaWord  = (_gtResolved && _gtResolved[_gi] &&
                         typeof _gtResolved[_gi].japanese === 'string')
            ? _gtResolved[_gi].japanese
            : (w.japanese || '—');
        return `<div style="display:flex;align-items:baseline;gap: var(--space-sm);padding: var(--space-xs) 0;border-bottom:1px solid rgba(0,0,0,0.04);">
            <span style="font-family: var(--font-greek);font-size:var(--text-title);color:var(--text-main);min-width:80px;flex-shrink:0;">${w.text || ''}</span>
            <span style="font-size: var(--text-caption);color:var(--text-sub);flex:1;">${jaWord}</span>
            <span style="font-size: var(--text-caption);color:var(--text-sub);opacity: var(--opacity-secondary);flex-shrink:0;">${posJpn}</span>
        </div>`;
    }).join('');
    return `<div style="font-size: var(--text-caption);font-weight:600;letter-spacing:0.06em;color:var(--text-sub);opacity: var(--opacity-secondary);margin-bottom: var(--space-sm);">${_T('ui.originalText', '原語一覧')}</div>
    ${rows}
    <p style="font-size: var(--text-caption);color:var(--text-sub);opacity: var(--opacity-secondary);margin-top: var(--space-sm);">${_T('ui.clickWordForDetails', '語をクリックすると詳細が開きます（通常タブ）')}</p>`;
}

/**
 * words キャッシュ：_wlvGetChipData が呼べるよう節ごとの words 配列を保持する。
 * openWordListInStudyPanel が呼ばれるたびに上書きされる。
 */
let _wlvWordCache = [];

/**
 * Phase VR-4B-3: WordOrder Representation.chips[] をクリック時まで保持するキャッシュ。
 * _wlvWordCache と対で、StudyPanel/Mobile Inspector（常に1節分のみ表示＝シングルトン）専用。
 * 複数節が同時に存在しうる Greek Flow View / 本文左列はこのグローバル変数を使わず、
 * DOM ノード（gfEl._flowChips / block._flowChips）に個別保存する
 * （docs/development/verse-representation-design.md、単一グローバルcacheは節取り違えを起こすため禁止）。
 */
let _wlvChipCache = [];

/* ══════════════════════════════════════════
   パネルリサイズ（縦方向ドラッグ - bottom-depth-panel）
   設計原則：
   - pointerdown / pointermove / pointerup / pointercancel のみ（mouse/touch分岐禁止）
   - setPointerCapture で捕捉 → pointerup/cancel で必ず releasePointerCapture
   - ドラッグ中は window/document 依存なし（capture で完結）
   - 高さは常に clamp で処理（状態依存でイベントを止めない）
   - isDragging / height は StudyPanelState で一元管理（height が SSOT）
   - DOM 反映は requestAnimationFrame で 1 フレーム 1 回にまとめる
   - offsetHeight の read-after-write 禁止（計算済みの値だけを書く）
   - 離した位置で停止する（スナップ・慣性なし）。次回 open も同じ高さ
   ══════════════════════════════════════════ */
(function() {
    const handle = document.getElementById('panel-resize-handle');
    const panel  = document.getElementById('bottom-depth-panel');
    if (!handle || !panel) return;

    let startY = 0, startH = 0;
    let pendingH = null;   /* rAF 反映待ちの高さ（null = なし） */
    let rafId    = 0;

    /* 計算済みの高さ h を DOM へ反映する（読み取りなし・書き込みのみ）。
       本文 padding も同じ h で直接同期し、offsetHeight の強制レイアウトを避ける */
    function _applyHeight(h) {
        if (window.innerWidth <= 768) return;   /* 全画面は CSS top/bottom 管理 */
        if (_isMobile()) {
            /* 769–900px：!important でドラッグ中の高さを反映 */
            panel.style.setProperty('height', h + 'px', 'important');
        } else {
            panel.style.height = h + 'px';
        }
        const area = document.getElementById('main-reading-area');
        if (area) area.style.paddingBottom = h + 'px';
    }

    function _flush() {
        rafId = 0;
        if (pendingH == null) return;
        const h = pendingH;
        pendingH = null;
        _applyHeight(h);
    }

    handle.addEventListener('pointerdown', (e) => {
        /* 768px以下は全画面モードのためリサイズ不要 */
        if (window.innerWidth <= 768) return;
        StudyPanelState.isDragging = true;
        startY = e.clientY;
        startH = panel.offsetHeight;
        handle.classList.add('dragging');
        /* captureにより、指がハンドル外に出ても pointermove を継続受信する */
        handle.setPointerCapture(e.pointerId);
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
        if (!StudyPanelState.isDragging) return;
        /* min/max は Geometry SSOT（CSS カスタムプロパティ）から取得。
           従来どおり move 毎に評価する（ドラッグ中のウィンドウリサイズ・
           帯域跨ぎでも旧実装と同じ振る舞いを保つ） */
        const { minH, maxH } = _panelGeomLimits(panel);
        /* clamp：max/min 状態でも反対方向にドラッグすれば必ず動く */
        const nh = Math.min(maxH, Math.max(minH, startH + (startY - e.clientY)));
        StudyPanelState.height = nh;   /* SSOT: 次回 open もこの高さで復元される */
        pendingH = nh;
        if (!rafId) rafId = requestAnimationFrame(_flush);
    });

    function _finishDrag(e) {
        if (!StudyPanelState.isDragging) return;
        StudyPanelState.isDragging = false;
        handle.classList.remove('dragging');
        document.body.style.userSelect = '';
        /* capture を必ず解放する（pointerup/cancel 両方から呼ばれる） */
        try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
        /* スナップ廃止（UX監査による）: 離した位置でそのまま停止する。
           rAF 待ちの高さがあれば即時反映して確定する */
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (pendingH != null) { const h = pendingH; pendingH = null; _applyHeight(h); }
        _syncReadingPanelPadding();   /* 終了時に1回だけ実測で最終同期 */
    }

    function _cancelDrag(e) {
        /* 着信・OSジェスチャーなどでキャンセルされた場合。高さはその場のまま */
        _finishDrag(e);
    }

    handle.addEventListener('pointerup',     _finishDrag);
    handle.addEventListener('pointercancel', _cancelDrag);
})();
