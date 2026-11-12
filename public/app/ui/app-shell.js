let _proximityTokens = [];

function cleanText(e) {
    const s = (e && typeof e === 'object') ? (e.text || e.normalized || '') : String(e || '');
    return s.replace(/[.,;:!?·—'··]+$/g, '').trim();
}


/* lexicon エントリの表示文字列を解決する唯一の関数。
   優先順位: gloss_ja（日本語）→ headword（正規表記）→ lexemeId（最終保証）
   UI はこの関数のみを経由し、直接の条件分岐・フォールバック記述は禁止。 */
function resolveDisplay(entry, lexemeId) {
    if (typeof window !== 'undefined' && window.I18N && I18N.lang === 'en') {
        return (entry && entry.gloss) || (entry && entry.headword) || lexemeId;
    }
    if (typeof window !== 'undefined' && window.I18N && I18N.lang === 'es') {
        /* ES: 辞書語義（senses 第1語義）があればそれ、無ければ見出し語（ギリシャ語） */
        const es = (typeof _esShortGloss === 'function') ? _esShortGloss(lexemeId) : null;
        return es || (entry && entry.headword) || lexemeId;
    }
    return (entry && entry.gloss_ja) || (entry && entry.headword) || lexemeId;
}

/* lemmaId に対応する語構成要素配列を返す。
   @returns {Array<{lexemeId:string}>|null}
   各要素は lexemeId（lexicon の主キー）のみを持つ。文字列一致は使用しない。 */
function getWordComposition(lemmaId) {
    if (!_compositionData || !lemmaId) return null;
    const entry = _compositionData[lemmaId];
    if (entry === null) return null;          // 明示的な単純語マーカー
    if (!entry) return null;                  // エントリなし（未整備）
    return Array.isArray(entry.components) && entry.components.length > 0
        ? entry.components
        : null;
}

/* 語源パーツ HTML を生成（日本語表示・クリック可能）
   parts: Array<{lexemeId:string}>
   UI の責務: lexicon 参照 → resolveDisplay 呼び出し → 描画。ロジックは持たない。 */
function _buildEtymPartsHTML(parts) {
    return parts.map(({ lexemeId }) => {
        const entry   = _lexiconData?.[lexemeId];
        const display = resolveDisplay(entry, lexemeId);
        return `<span class="rn-etym-part" data-lexeme-id="${_escH(lexemeId)}">${_escH(display)}</span>`;
    }).join('<span class="rn-etym-sep"> ＋ </span>');
}


/* 辞書本文の聖書参照ポップアップ。
   参照リンク（.rn-inline-bible-ref）のクリックを本文遷移の前に受け止め、
   その箇所の本文と、調べている語がそこでどう使われているかをその場で出す。
   本文へ進む導線はポップアップ内の「本文で見る」に残す。 */
const _REF_FORM_JA = {
    pos:    { noun: '名詞', adj: '形容詞', verb: '動詞', prep: '前置詞', conj: '接続詞', det: '限定詞', pron: '代名詞', adv: '副詞', ptcl: '添語', num: '数詞', intj: '間投詞' },
    case:   { nominative: '主格', genitive: '属格', dative: '与格', accusative: '対格', vocative: '呼格' },
    number: { singular: '単数', plural: '複数' },
    gender: { masculine: '男性', feminine: '女性', neuter: '中性' },
    tense:  { present: '現在', imperfect: '未完了過去', future: '未来', aorist: 'アオリスト', perfect: '完了', pluperfect: '過去完了' },
    voice:  { active: '能動', middle: '中動', passive: '受動' },
    mood:   { indicative: '直説法', subjunctive: '接続法', optative: '希求法', imperative: '命令法', infinitive: '不定詞', participle: '分詞' },
    person: { '1': '1人称', '2': '2人称', '3': '3人称' },
};
function _refFormJa(tok) {
    const m = _refForm(), parts = [];
    if (tok.tense)  parts.push(m.tense[tok.tense] || tok.tense);
    if (tok.voice)  parts.push(m.voice[tok.voice] || tok.voice);
    if (tok.mood)   parts.push(m.mood[tok.mood] || tok.mood);
    if (tok.person) parts.push(m.person[tok.person] || tok.person);
    if (tok.case)   parts.push(m.case[tok.case] || tok.case);
    if (tok.gender) parts.push(m.gender[tok.gender] || tok.gender);
    if (tok.number) parts.push(m.number[tok.number] || tok.number);
    return parts.join((window.I18N && I18N.lang !== 'ja') ? ' ' : '・');
}
const _REF_FORM_EN = {
    pos:    { noun: 'Noun', adj: 'Adjective', verb: 'Verb', prep: 'Preposition', conj: 'Conjunction', det: 'Determiner', pron: 'Pronoun', adv: 'Adverb', ptcl: 'Particle', num: 'Numeral', intj: 'Interjection' },
    case:   { nominative: 'Nominative', genitive: 'Genitive', dative: 'Dative', accusative: 'Accusative', vocative: 'Vocative' },
    number: { singular: 'Singular', plural: 'Plural' },
    gender: { masculine: 'Masculine', feminine: 'Feminine', neuter: 'Neuter' },
    tense:  { present: 'Present', imperfect: 'Imperfect', future: 'Future', aorist: 'Aorist', perfect: 'Perfect', pluperfect: 'Pluperfect' },
    voice:  { active: 'Active', middle: 'Middle', passive: 'Passive' },
    mood:   { indicative: 'Indicative', subjunctive: 'Subjunctive', optative: 'Optative', imperative: 'Imperative', infinitive: 'Infinitive', participle: 'Participle' },
    person: { '1': '1st person', '2': '2nd person', '3': '3rd person' },
};
const _REF_FORM_ES = {
    pos:    { noun: 'Sustantivo', adj: 'Adjetivo', verb: 'Verbo', prep: 'Preposición', conj: 'Conjunción', det: 'Determinante', pron: 'Pronombre', adv: 'Adverbio', ptcl: 'Partícula', num: 'Numeral', intj: 'Interjección' },
    case:   { nominative: 'Nominativo', genitive: 'Genitivo', dative: 'Dativo', accusative: 'Acusativo', vocative: 'Vocativo' },
    number: { singular: 'Singular', plural: 'Plural' },
    gender: { masculine: 'Masculino', feminine: 'Femenino', neuter: 'Neutro' },
    tense:  { present: 'Presente', imperfect: 'Imperfecto', future: 'Futuro', aorist: 'Aoristo', perfect: 'Perfecto', pluperfect: 'Pluscuamperfecto' },
    voice:  { active: 'Activa', middle: 'Media', passive: 'Pasiva' },
    mood:   { indicative: 'Indicativo', subjunctive: 'Subjuntivo', optative: 'Optativo', imperative: 'Imperativo', infinitive: 'Infinitivo', participle: 'Participio' },
    person: { '1': '1ª persona', '2': '2ª persona', '3': '3ª persona' },
};
function _refForm() {
    return (window.I18N && I18N.lang === 'es') ? _REF_FORM_ES : (window.I18N && I18N.lang === 'en') ? _REF_FORM_EN : _REF_FORM_JA;
}
/* 形態ラベル表（name キー）。従来は同内容が複数箇所に複製されていたものを集約。
   JA は従来定義と同値（person のみ追加、既存消費側は読まない）。 */
const MORPH_FULL_JA = {
    pos:    { V:'動詞', N:'名詞', A:'形容詞', R:'関係代名詞', P:'人称代名詞', T:'冠詞', D:'指示代名詞', ADV:'副詞', PREP:'前置詞', CONJ:'接続詞', PRT:'添語' },
    tense:  { present:'現在', imperfect:'未完了', future:'未来', aorist:'アオリスト', perfect:'完了', pluperfect:'大完了' },
    voice:  { active:'能動', middle:'中動', passive:'受動', 'middle deponent':'中動自動', 'middle or passive':'中動/受動' },
    mood:   { indicative:'直説法', subjunctive:'接続法', optative:'希求法', imperative:'命令法', infinitive:'不定詞', participle:'分詞' },
    gender: { masculine:'男性', feminine:'女性', neuter:'中性' },
    number: { singular:'単数', plural:'複数' },
    case:   { nominative:'主格', genitive:'属格', dative:'与格', accusative:'対格', vocative:'呼格' },
    person: { '1':'1人称', '2':'2人称', '3':'3人称' },
};
const MORPH_FULL_EN = {
    pos:    { V:'Verb', N:'Noun', A:'Adjective', R:'Relative pronoun', P:'Personal pronoun', T:'Article', D:'Demonstrative pronoun', ADV:'Adverb', PREP:'Preposition', CONJ:'Conjunction', PRT:'Particle' },
    tense:  { present:'Present', imperfect:'Imperfect', future:'Future', aorist:'Aorist', perfect:'Perfect', pluperfect:'Pluperfect' },
    voice:  { active:'Active', middle:'Middle', passive:'Passive', 'middle deponent':'Middle deponent', 'middle or passive':'Middle/Passive' },
    mood:   { indicative:'Indicative', subjunctive:'Subjunctive', optative:'Optative', imperative:'Imperative', infinitive:'Infinitive', participle:'Participle' },
    gender: { masculine:'Masculine', feminine:'Feminine', neuter:'Neuter' },
    number: { singular:'Singular', plural:'Plural' },
    case:   { nominative:'Nominative', genitive:'Genitive', dative:'Dative', accusative:'Accusative', vocative:'Vocative' },
    person: { '1':'1st person', '2':'2nd person', '3':'3rd person' },
};
const MORPH_FULL_ES = {
    pos:    { V:'Verbo', N:'Sustantivo', A:'Adjetivo', R:'Pronombre relativo', P:'Pronombre personal', T:'Artículo', D:'Pronombre demostrativo', ADV:'Adverbio', PREP:'Preposición', CONJ:'Conjunción', PRT:'Partícula' },
    tense:  { present:'Presente', imperfect:'Imperfecto', future:'Futuro', aorist:'Aoristo', perfect:'Perfecto', pluperfect:'Pluscuamperfecto' },
    voice:  { active:'Activa', middle:'Media', passive:'Pasiva', 'middle deponent':'Media deponente', 'middle or passive':'Media/Pasiva' },
    mood:   { indicative:'Indicativo', subjunctive:'Subjuntivo', optative:'Optativo', imperative:'Imperativo', infinitive:'Infinitivo', participle:'Participio' },
    gender: { masculine:'Masculino', feminine:'Femenino', neuter:'Neutro' },
    number: { singular:'Singular', plural:'Plural' },
    case:   { nominative:'Nominativo', genitive:'Genitivo', dative:'Dativo', accusative:'Acusativo', vocative:'Vocativo' },
    person: { '1':'1ª persona', '2':'2ª persona', '3':'3ª persona' },
};
function _morphFull() {
    return (window.I18N && I18N.lang === 'es') ? MORPH_FULL_ES : (window.I18N && I18N.lang === 'en') ? MORPH_FULL_EN : MORPH_FULL_JA;
}
function _personText(c) {
    return _morphFull().person[c]
        || ((window.I18N && I18N.lang === 'es') ? c + 'ª persona' : (window.I18N && I18N.lang === 'en') ? c + ' person' : c + '人称');
}

function _resolveLemmaId(strong) {
    const normStrong = normalizeStrong(strong);
    const candidate = 'grc:' + normStrong;
    return (_lexiconData && _lexiconData[candidate]) ? candidate : null;
}

/**
 * Strong番号を正規化して "G\d+" 形式に統一する。
 *   "3972"  → "G3972"
 *   "g3972" → "G3972"
 *   "G3972" → "G3972"
 * 数字部分が取れない場合は空文字を返す。
 */
function normalizeStrong(value) {
    const digits = String(value || '').replace(/[^0-9]/g, '');
    return digits ? 'G' + digits : '';
}





/* #open-source-btn の表示可否を同期する。app_url_import_source が今回の
   タブセッションに存在する限り表示し続ける（#open-panel-btnと同じ「値の有無だけで
   判定する条件付き表示」方式）。URL Import Engineの再解析・Router操作は行わない。
   init() から1回呼べば、以降のチャプター送り等はフルリロードのため再度init()が
   走り、この関数も再実行される（値はsessionStorageに残り続けるので表示も保持される）。 */
function _syncUrlImportSourceButton() {
    const btn = document.getElementById('open-source-btn');
    if (!btn) return;
    let sourceUrl = null;
    try {
        sourceUrl = sessionStorage.getItem('app_url_import_source');
    } catch (_) { /* 読み取り不可時は非表示のまま安全側に倒す */ }
    btn.style.display = sourceUrl ? 'block' : 'none';
}

/* app_url_import_source を http/https URL として検証済みの形で返す。
   改ざん・想定外の値混入時は null（_openUrlImportSource が利用）。 */
function _getValidUrlImportSource() {
    let sourceUrl = null;
    try {
        sourceUrl = sessionStorage.getItem('app_url_import_source');
    } catch (_) { return null; }
    if (!sourceUrl) return null;

    let parsed;
    try {
        parsed = new URL(sourceUrl);
    } catch (_) { return null; }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    return sourceUrl;
}

/* #open-source-btn クリック時。値が不正な場合（改ざん・想定外の値混入等）は
   window.open を呼ばず安全に無視する。新規タブで開くのみで、このアプリ自身の
   Router/表示状態には一切触れない。 */
function _openUrlImportSource() {
    const sourceUrl = _getValidUrlImportSource();
    if (!sourceUrl) return;
    window.open(sourceUrl, '_blank', 'noopener,noreferrer');
}

/* ══════════════════════════════════════════
   URL Import の逆方向: アプリ → 外部サイト（「外部の翻訳で比較」）
   現在地（getShareState()の読み取りのみ）を url-import-engine.js の
   generateExternalUrl(targetId, state) へそのまま渡してURLを生成する。
   UI（このファイル）は targetId という不透明な識別子しか扱わず、
   どのサイトか・どの訳か・version ID・URL構造は一切知らない
   （それらは url-import-engine.js 内に閉じている）。
   AppState/Router/transA・transBへの書き込みは一切行わない。
   読み方を選ぶメニュー内に表示する。

   比較対象を増やす場合:
     1) url-import-engine.js の COMPARE_TARGET_GENERATORS に生成関数を1つ追加
     2) 下の COMPARE_TARGETS に {id, label} を1行追加
   の2箇所のみでよく、このファイルのswitch/if分岐を増やす必要はない。
   ══════════════════════════════════════════ */

/* 比較対象一覧（データ駆動）。ここに無い項目は表示されない。
   id は url-import-engine.js の COMPARE_TARGET_GENERATORS のキーと対応させる。 */
const COMPARE_TARGETS = [
    { id: 'prs-shinkai2017', label: '新改訳2017（PRS）' },
    { id: 'biblecom-kyodo',  label: '新共同訳（Bible.com）' },
];

/* 「読み方を選ぶ」メニュー内に外部翻訳へのリンクを描画する。
   リンクは外部本文を新規タブで開き、アプリ側を同じ箇所の語順フローへ切り替える。 */
function _renderExternalCompareMenu(containerId) {
    const list = document.getElementById(containerId);
    if (!list) return;
    const engine = window.App && window.App.urlImport;
    const state = getShareState();
    list.replaceChildren();

    COMPARE_TARGETS.forEach(target => {
        const available = !!engine && !!engine.generateExternalUrl(target.id, state);
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'sb-row sb-external-compare-item' + (available ? '' : ' disabled');
        opt.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:var(--space-sm);box-sizing:border-box;width:100%;text-align:left;border:0;background:transparent;padding:var(--space-xs) var(--space-sm);font-family:inherit;font-size:var(--text-caption);font-weight:400;line-height:1.5;color:var(--text-sub);cursor:pointer;';
        opt.disabled = !available;
        const label = document.createElement('span');
        label.textContent = target.label;
        const external = document.createElement('span');
        external.textContent = '↗';
        external.setAttribute('aria-hidden', 'true');
        external.style.cssText = 'flex:none;font-size:var(--text-caption);color:var(--text-sub);';
        opt.append(label, external);
        if (available) opt.addEventListener('click', () => _openCompareTarget(target.id));
        list.appendChild(opt);
    });
}

/* 比較対象クリック時（案B）。クリック時点の最新状態から都度URLを生成する
   （事前計算したhrefを保持しない。節選択はリロード無しで変わりうるため）。
   生成できない場合は何もしない。
   外部サイトを新規タブで開いた後、自分側は既存の正規経路（window.App.bridge.
   openFlowTab()）でFLOW表示へ切り替える。openFlowTab()はrenderCurrentPage()
   経由でAppState.selectedVerseをリセットする（render()の既存仕様）ため、
   節が選択されていた場合は既存のapplyShareState()（URL Import時の節復元と
   同一経路）で同じverseへ復元する。url-import-engine.js・COMPARE_TARGETS・
   generateExternalUrl()・Router/AppState/transA・transB/MobileVerseViewは
   一切変更しない（既存の公開APIを呼ぶだけ）。 */
async function _openCompareTarget(targetId) {
    const engine = window.App && window.App.urlImport;
    const state = getShareState();
    const url = engine ? engine.generateExternalUrl(targetId, state) : null;
    if (!url) return;

    window.open(url, '_blank', 'noopener,noreferrer');

    if (window.App.bridge && typeof window.App.bridge.openFlowTab === 'function') {
        await window.App.bridge.openFlowTab();
        if (state.verse) applyShareState({ verse: state.verse });
    }
}

function getShareState() {
    const panelOpen = AppState.depth?.stack?.length > 0;

    return {
        book: AppState.location?.book?.key || '',
        chapter: AppState.selectedVerse?.ch ?? AppState.location?.chapter ?? '',
        verse: AppState.selectedVerse?.vNum || '',
        panel: panelOpen ? 'study' : '',
        word: (panelOpen && AppState.inspect?.data?.strong)
            ? String(AppState.inspect.data.strong).replace(/^G/, '')
            : '',
        transA: typeof _transA !== 'undefined' ? _transA : '',
        transB: typeof _transB !== 'undefined' ? _transB : '',
        mode: typeof _transMode !== 'undefined' ? _transMode : ''
    };
}


/* 前回値との比較による遷移検知。false→trueのエッジを検知した瞬間にのみ
   onboardingActiveをfalseへ戻し、最終状態を1回だけURLに反映する。
   ※ 変更: 判定基準を「!onboardingComplete」から「onboarding.isActive()」へ。
     旧実装はオンボーディングを起動しない新規ユーザー（onboardingComplete=false）で
     URL同期が永久凍結され URL共有が壊れるため。isActive()=実際に動作中かを見る。 */
function _syncOnboardingActiveFlag() {
    if (!window.App.onboarding) return;
    const active = !!(window.App.onboarding.isActive && window.App.onboarding.isActive());

    // オンボーディング終了エッジ（true→false）で最終状態を1回だけURLへ反映する。
    if (window.__onboardingActive && !active) {
        window.__onboardingActive = false;
        syncUrlState();
        return;
    }
    window.__onboardingActive = active;
}

function syncUrlState() {
    if (window.__onboardingActive) return;

    const url = ShareURLService.generate(getShareState());
    history.replaceState(null, '', url);
}


/* 画面下部の簡易トースト表示。#share-toast を共有部品として複数機能から利用する。 */
function _showToast(message, duration = 2000) {
    const t = document.getElementById('share-toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('visible');
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(() => t.classList.remove('visible'), duration);
}
function _showShareToast() { _showToast('URLをコピーしました'); }

/* 現在開いている節の ref を構造フィールド（bookKey/ch/verse）から組み立てる（ref パース禁止のSSOT原則に従う） */
function _currentVerseRef() {
    const bookKey = AppState.location.book ? AppState.location.book.key : '';
    /* Phase 3-6-J: 選択した節のchapterを使う（連続章でスクロール位置が前章でも正しい参照を生成する）。
       selectedVerse.ch は toBrowsing() で確定している。null の場合のみ location.chapter にフォールバック。 */
    const ch = AppState.selectedVerse?.ch ?? (AppState.location.chapter != null ? AppState.location.chapter : '');
    const vNum = AppState.selectedVerse.vNum;
    if (!bookKey || ch === '' || ch == null || vNum == null) return null;
    return `${bookKey} ${ch}:${vNum}`;
}


// ギリシャ語データが存在する書物のキーセット
const GREEK_BOOKS = new Set([
    // 新約
    'ROM','1CO','2CO','GAL','EPH','PHP','COL',
    '1TH','2TH','1TI','2TI','TIT','PHM',
    'MAT','MRK','LUK','JHN','ACT',
    'HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV',
    // 旧約（LXXデータがある書物）
    'GEN','EXO','LEV','NUM','DEU','JOS','JDG','RUT',
    '1SA','2SA','1KI','2KI','1CH','2CH',
    'EZR','NEH','EST','JOB','PSA','PRO','ECC','SNG',
    'ISA','JER','LAM','EZK','DAN',
    'HOS','JOL','AMO','OBA','JON','MIC','NAH','HAB','ZEP','HAG','ZEC','MAL',
]);

/* ══════════════════════════════════════════
   グローバル breadcrumb（空間ナビゲーション）
   ══════════════════════════════════════════ */
function renderGlobalBreadcrumb() {
    const el = document.getElementById('global-breadcrumb');
    if (!el) return;

    const loc = AppState.location;
    if (!loc.testament) {
        el.innerHTML = `<span class="gbc-item current">${_T('ui.bible', '聖書')}</span>`;
        return;
    }

    const items = [];

    /* パンくずは「書名 › 章番号 › 読み方」の並び（2026-11-08 整理）。
       新約聖書セグメントは廃止：緑版は新約のみで判別情報にならず、旧約は赤版（別アプリ）。
       各要素は「押すとその要素の選択が開く」に統一する。 */
    if (loc.book) {
        /* 書物 - クリックで書物選択へ（BOOK_SHORT 経由の略称を使用） */
        items.push(`<button class="gbc-item" onclick="_gbcGoBook()">${_bookShortTitle(loc.book)}</button>`);
    } else {
        /* 書物未選択時は「聖書」から書物選択へ（従来の新約聖書ボタンの受け皿） */
        items.push(`<button class="gbc-item" onclick="_gbcGoBook()">${_T('ui.bible', '聖書')}</button>`);
    }

    if (loc.chapter !== null) {
        const _maxCh = loc.book ? loc.book.ch : 1;
        const _ch    = loc.chapter;
        items.push(`<span class="gbc-sep">›</span>`);
        /* 章 - 左右矢印で前後章へ、章番号クリックで章選択へ */
        items.push(
            `<span class="gbc-item current gbc-chapter-nav">` +
            `<button class="gbc-ch-arrow" onclick="event.stopPropagation();_gbcPrevChapter()" aria-label="${_T('nav.prevChapter', '前の章')}"${_ch <= 1 ? ' disabled' : ''}>◀</button>` +
            `<button class="gbc-ch-label" onclick="_gbcGoChapter()">${(window.I18N && I18N.lang !== 'ja') ? String(_ch) : _ch + '章'}</button>` +
            `<button class="gbc-ch-arrow" onclick="event.stopPropagation();_gbcNextChapter()" aria-label="${_T('nav.nextChapter', '次の章')}"${_ch >= _maxCh ? ' disabled' : ''}>▶</button>` +
            `</span>`
        );

        /* 読み方：5項目のみ（JA1955 / WEB / 構造系3種）。BUN / DISCOURSE / その他の翻訳IDは表示しない */
        const _GBC_MODE_LABELS = {
            'JA1955':       _T('mode.JA1955', '口語訳'),
            'WEB':          _T('mode.WEB', 'World English Bible'),
            'RVR1909':      _T('mode.RVR1909', 'Reina-Valera 1909'),
            'WORD_ORDER':   _T('mode.WORD_ORDER', '語順で読む'),
            'DA_READING':   _T('mode.DA_READING', '文の構造で読む'),
            'ROLE_READING': _T('mode.ROLE_READING', '語の役割で読む'),
            'GREEK_TEXT':   _T('mode.GREEK_TEXT', 'ギリシャ語で読む'),
        };
        const _modeLabel = _GBC_MODE_LABELS[_transA];
        if (_modeLabel) {
            items.push(`<span class="gbc-sep">›</span>`);
            items.push(`<button class="gbc-item" onclick="_gbcGoMode()">${_modeLabel}</button>`);
        }
    }

    el.innerHTML = items.join('');
}

/* 書名クリック → 書物選択（サイドバー Layer 1）。旧 _gbcGoTestament の行き先を引き継ぐ */
function _gbcGoBook() {
    const loc = AppState.location;
    if (loc && loc.testament) sbSection = loc.testament;
    if (!_isSidebarOpen()) _openSidebar();
    sbGoTo(1, sbSection);
    AppState.clearDepth();
    renderDepthHistory();
}

function _gbcGoMode() {
    if (!_isSidebarOpen()) _openSidebar();
    sbGoTo(0);
    AppState.clearDepth();
    renderDepthHistory();
}

/* ══════════════════════════════════════════
   UI同期: AppState.ui.view を唯一のソースとして
   ヘッダー（document.title）/ パンくず（#global-breadcrumb）/
   サイドバーの選択状態（ツール・履歴の active クラス）をまとめて再描画する。
   showBookmarks() などの各ビュー関数は AppState.ui.view を設定して
   syncUIFromState() を呼ぶだけにし、ヘッダーやパンくずを個別にDOM操作しない。
   ══════════════════════════════════════════ */
/* i18n: 辞書（assets/i18n/<lang>.json）にキーがあればその文言、無ければ第2引数の日本語（既定文言）を返す。
   I18N 本体は assets/js/i18n.js。読み込みに失敗しても日本語表示のまま動く。 */
function _T(key, fallback) { return (window.T ? window.T(key, fallback) : fallback); }
function _viewLabel(view) { return _T('view.' + view, null) || VIEW_LABELS[view] || ''; }

const VIEW_LABELS = {
    howto:        '使い方',
    bookmarks:    'ブックマーク',
    highlights:   'ハイライト',
    recentVerses: '最近読んだ箇所',
    recentWords:  '最近見た単語',
    sourcePolicy: '出典・ポリシー',
    knowledge:    'まめ知識',
    changelog:    '更新情報',
};

const SIDEBAR_VIEW_NAV_IDS = {
    bookmarks:    'nav-bookmarks',
    highlights:   'nav-bookmarks',
    recentVerses: 'nav-recent-verses',
    recentWords:  'nav-recent-words',
};

/* 書物の短縮名（ウィンドウタブ表示用）。
   優先順位: book.shortTitle（将来 books.json に個別指定が追加された場合の
   フック。現状は全書物未設定で常にフォールバックする）
   → BOOK_SHORT[key]（既存。パンくず・最近見た節/単語・ブックマーク・
   メモ一覧など7箇所以上で既に使われている短縮表記。「出エジプト記」→
   「出エジプト」のように「記」「上/下」等を落とした形。books.json の
   book.name（フルタイトル）自体は変更しない）
   → book.name（既存のBOOK_SHORTに無い場合のみ、フルタイトルそのまま）。 */
function _bookShortTitle(book) {
    if (!book) return '';
    return book.shortTitle || _T('bookshort.' + book.key, BOOK_SHORT[book.key] || book.name);
}

/* タブ表示用の安全な最終フォールバック（rule③のtruncate相当）。
   現行データでは実際には発動しない長さだが、将来の書物追加・
   表示名変更に備えた保険として残す。 */
function _truncateTabLabel(s, max = 20) {
    if (!s) return s;
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function _bibleHeaderLabel() {
    const loc = AppState.location;
    if (!loc.testament) return _T('ui.bible', '聖書');
    if (!loc.book) return loc.testament === 'nt' ? _T('ui.newTestament', '新約聖書') : _T('ui.oldTestament', '旧約聖書');
    if (window.I18N && window.I18N.lang !== 'ja') {
        const enName = _bookShortName(loc.book.key || loc.book);
        return loc.chapter != null ? `${enName} ${loc.chapter}` : enName;
    }
    const shortName = _bookShortTitle(loc.book);
    return loc.chapter != null ? `${shortName} ${loc.chapter}章` : shortName;
}

function updateHeader(view) {
    const label = view === 'bible' ? _bibleHeaderLabel() : _viewLabel(view);
    const tabLabel = _truncateTabLabel(label, 20);
    document.title = tabLabel ? `${tabLabel}｜${_T('app.name', '聖書アプリ')}` : _T('app.name', '聖書アプリ');
    /* view-title は互換のため維持（該当要素が無い環境でも安全な no-op）。
       将来復活した場合に備え、こちらは短縮前のフルlabelを使う
       （フルタイトルは変更しない、という原則のため）。 */
    const titleEl = document.getElementById('view-title');
    if (titleEl) titleEl.innerText = label;
}

function updateBreadcrumb(view) {
    if (view === 'bible') {
        renderGlobalBreadcrumb();
        return;
    }
    const el = document.getElementById('global-breadcrumb');
    if (!el) return;
    /* 聖書の testament/book/chapter 固定表示を残さない：非bibleビューでは
       現在のビュー名のみを表示する単純なパンくずに切り替える。
       VIEW_LABELS の値はすべて本ファイル内の定数（ユーザー入力やentry.*データではない）。 */
    const label = _viewLabel(view);
    el.innerHTML = `<span class="gbc-item current">${label}</span>`;
}

function updateSidebarActive(view) {
    Object.values(SIDEBAR_VIEW_NAV_IDS).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    const activeId = SIDEBAR_VIEW_NAV_IDS[view];
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

function syncUIFromState() {
    updateHeader(AppState.ui.view);
    updateBreadcrumb(AppState.ui.view);
    updateSidebarActive(AppState.ui.view);
    /* MN: Mobile navigation sync */
    _syncMobileLocationLabel();
}

/* ══════════════════════════════════════════
   ナビゲーションヘルパー
   翻訳選択（transA/transB/mode）を保持したまま遷移する
   ══════════════════════════════════════════ */
function _navTo(book, ch) {
    const url = ShareURLService.generate({
        book,
        chapter: ch,
        verse: '',
        transA: _transA,
        transB: _transB,
        mode: _transMode,
    });

    /* ピッカー／節詳細表示からの遷移は、開閉履歴と内部状態を安全に初期化するため従来どおり再読み込みする。 */
    const mobileVerseView = document.getElementById('mobile-verse-view');
    const mobileBookPicker = document.getElementById('mobile-book-picker');
    const mobileModePicker = document.getElementById('mobile-mode-picker');
    const hasTransientOverlay =
        mobileVerseView?.classList.contains('open') ||
        mobileBookPicker?.classList.contains('mbp-open') ||
        mobileModePicker?.classList.contains('mmp-open');

    const area = document.getElementById('bible-text-area');
    if (hasTransientOverlay) {
        if (area) area.style.opacity = '0';
        setTimeout(() => { window.location.href = url.href; }, 150);
        return;
    }

    /* 通常の章移動はページ全体を再読み込みせず、既存の本文再描画経路を使う。
       非表示にしてから再描画すると失敗／キャンセル時に本文が透明のまま残るため、
       通常経路では opacity を変更しない。 */
    if (document.getElementById('bottom-depth-panel')?.classList.contains('open')) {
        closeStudyPanel();
    }
    closeMobileSidebar();
    history.pushState({ chapterNavigation: true }, '', url.href);

    renderCurrentPage().then(rendered => {
        if (rendered === false) return;
        const mainArea = document.getElementById('main-reading-area');
        if (mainArea) mainArea.scrollTop = 0;
        requestAnimationFrame(() => {
            if (area) area.style.opacity = '1';
        });
    }).catch(() => {
        if (area) area.style.opacity = '1';
    });
}

/* 章番号クリック → 章選択（サイドバー Layer 2）。旧 _gbcGoBook の行き先を引き継ぐ */
function _gbcGoChapter() {
    const loc = AppState.location;
    if (loc && loc.book) {
        const inNt = SB_BOOKS.nt.some(b => b.key === loc.book.key);
        sbSection  = inNt ? 'nt' : 'ot';
        sbBookKey  = loc.book.key;
        sbBookName = _bookFullName(loc.book.key);
        sbMaxCh    = loc.book.ch;
    }
    if (!_isSidebarOpen()) _openSidebar();
    sbGoTo(2);
    AppState.clearDepth();
    renderDepthHistory();
}

function _gbcPrevChapter() {
    const loc = AppState.location;
    if (!loc.book || loc.chapter === null) return;
    const prev = loc.chapter - 1;
    if (prev >= 1) _navTo(loc.book.key, prev);
}

function _gbcNextChapter() {
    const loc = AppState.location;
    if (!loc.book || loc.chapter === null) return;
    const next = loc.chapter + 1;
    if (next <= loc.book.ch) _navTo(loc.book.key, next);
}

/* ══════════════════════════════════════════
   読書深度スタック（読書の潜水履歴）
   ══════════════════════════════════════════ */

/**
 * depth stack にエントリを追加し、履歴を再描画する。
 * @param {Object} entry - { type, label, verse?, strong? }
 */
function pushDepth(entry) {
    AppState.depth.stack.push(entry);
    renderDepthHistory();
}

/**
 * 戻るボタンの表示内容（アイコン＋ラベル）。「履歴のどこへ戻るか」ではなく
 * 「今閉じようとしているレイヤーは何か」を表す。HIGに寄せて、階層を1段
 * 戻る場合はchevron「‹」、Panelそのものを閉じる場合は close「×」を使い分ける。
 * 現在の _panelContentMode（'word' = 単語詳細 / それ以外 = 節Panel）だけを見て、
 * 履歴（depth stack の中身）は一切参照しない。
 * renderDepthHistory() と _mobileOpenPanel() の両方から呼ばれる唯一の定義。
 */
function _panelBackState() {
    return (_panelContentMode === 'word') ? '‹' : '×';
}

/**
 * 戻るボタンのアイコン・ラベルをデスクトップ・モバイル両方に反映する。
 * 表示/非表示の制御は renderDepthHistory() が担う。
 * _panelContentMode だけを参照し、depth stack は一切見ない。
 */
function updatePanelBackButton() {
    const icon = _panelBackState();

    const btnIcon = document.getElementById('panel-back-icon');
    const btn     = document.getElementById('panel-back-btn');
    if (btnIcon) btnIcon.textContent = icon;
    if (btn)     btn.style.display   = 'flex';

    const mobileIcon = document.getElementById('mobile-panel-back-chevron');
    if (mobileIcon) mobileIcon.textContent = icon;
}

/**
 * 戻るボタンの表示/非表示とアイコン・ラベルを再描画する。
 * Panel が閉じている場合、または depth stack が空の場合は非表示。
 * Panel が開いており stack に戻り先がある場合（直接 Level 3 への遷移を含む）は表示する。
 */
function renderDepthHistory() {
    const btn = document.getElementById('panel-back-btn');
    if (!btn) return;

    const panelOpen = !!document.getElementById('bottom-depth-panel')?.classList.contains('open');
    const stack = AppState.depth.stack;
    if (!panelOpen || stack.length === 0) {
        btn.style.display = 'none';
        return;
    }

    updatePanelBackButton();
}

/**
 * StudyPanel の戻るボタン（デスクトップ #panel-back-btn / モバイル #mobile-panel-back /
 * モバイルスワイプ _mobileSwipeBack 共通）。
 *
 * 履歴（depth stack）は復元しない。Panelは常に3階層として扱い、現在開いている
 * レイヤーだけを判定して閉じる：
 *   Level 3（単語詳細 / _panelContentMode === 'word'）:
 *     - verse-flow がスタックにある（節タップ → 第二層 → 第三層）: Level 2（節Panel）へ戻る
 *     - verse-flow がない（本文から直接 Level 3）: Panel自体を閉じて本文へ戻る
 *   Level 2（節Panel  / _panelContentMode === 'verse'） → Panel自体を閉じる（本文は変更しない）
 * Level 1（Panel非表示）ではボタン自体が表示されないため、本関数は呼ばれない。
 */
function panelGoBack() {
    if (_panelContentMode === 'word') {
        if (AppState.studyOrigin?.entryPoint === 'wlv') {
            /* WLV-origin: verse-flow がスタックにある場合のみ Level 2（節word-list）へ戻る。
               ない場合（本文チップを直接タップして Level 3 へ進んだ）は Panel を閉じる。 */
            const hasVerseFlow = AppState.depth.stack.some(e => e.type === 'verse-flow');
            if (hasVerseFlow) {
                _openWordListInternal(AppState.selectedVerse.vNum, AppState.selectedVerse.elWords);
                /* #word-list-view は _openWordListInternal() 内で再生成されるため、
                   Level 3 へ進む直前に保存しておいたスクロール位置をここで読み戻す。 */
                if (_versePanelScrollTop != null) {
                    const listEl = document.getElementById('word-list-view');
                    if (listEl) listEl.scrollTop = _versePanelScrollTop;
                    _versePanelScrollTop = null;
                }
                renderDepthHistory();
            } else {
                /* 本文から直接 Level 3 へ進んだ: Panel を閉じて本文に戻る */
                closeStudyPanel();
            }
        } else {
            /* 非WLV-origin (HIERARCHICAL / RK / CF / 不明): Reading Surfaceが見えるようにPanelを閉じる */
            closeStudyPanel();
        }
    } else {
        /* Level 2 → Panelを閉じる。本文表示（章/節）は変更しない */
        closeStudyPanel();
    }
}

/* 内部: パネルを閉じてReadingへ（depth stackは変えない） */
function _syncReadingPanelPadding() {
    /* 全画面モードではパネルが背面を覆うため padding 補正は不要 */
    if (window.innerWidth <= 768) return;
    const area  = document.getElementById('main-reading-area');
    const panel = document.getElementById('bottom-depth-panel');
    if (!area || !panel) return;
    area.style.paddingBottom = panel.classList.contains('open') ? panel.offsetHeight + 'px' : '';
}

function _closeStudyPanelInternal() {
    const sidePanel    = document.getElementById('bottom-depth-panel');
    sidePanel.classList.remove('open');
    _syncReadingPanelPadding();

    const notesWrap = document.getElementById('reading-notes-wrap');
    /* close直前にスクロール位置を StudyPanelState へ保存（open後の2段rAFで復元する） */
    if (notesWrap) StudyPanelState.scrollTop = notesWrap.scrollTop;
    /* display:none で隠す。innerHTML破棄は禁止（DOMを維持して次のopenで位置を復元する） */
    if (notesWrap) { notesWrap.style.display = 'none'; }
    const notesArea = document.getElementById('reading-notes-area');
    /* クラスのみリセット。innerHTML = '' は禁止（_renderReadingNotes が全量置換するため不要） */
    if (notesArea) { notesArea.classList.remove('reading-deep-active'); }

    StudyPanelState.isOpen = false;

    document.getElementById('open-panel-btn').style.display =
        AppState.canReopen() ? 'block' : 'none';

    const rcb = document.getElementById('rcb-container');
    if (rcb) rcb.classList.remove('visible');

    const listEl = document.getElementById('word-list-view');
    if (listEl) listEl.remove();

    document.querySelectorAll('.verse-block').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.verse-pair-right').forEach(b => b.classList.remove('selected'));
    document.getElementById('active-v').innerText = '';

    document.getElementById('app').classList.remove('mobile-study-open');

    const panelEl = document.getElementById('bottom-depth-panel');
    if (panelEl) {
        panelEl.style.transform = '';
        panelEl.style.transition = '';
        /* inline height は消すが、ユーザー調整高さは StudyPanelState.height（SSOT）に
           保持されており、次回 open 時に _applyPanelHeightFromState() が復元する */
        panelEl.style.height = '';
    }

    if (window.App.onboarding) window.App.onboarding.onStudyPanelClosed();
    AppState.toReading();
    AppState.restoreScroll();
}

/* ── モバイル専用：フルスクリーン切り替えヘルパー ── */
function _isMobile() {
    return window.innerWidth <= 900;
}

/* コンテンツルーティング専用判定。幅だけでなくタッチ端末かどうかも見る。
   デスクトップをウィンドウ幅で縮小した場合に StudyPanel 経路を維持するため、
   openVerseInspector / openInspectorDetail / 本文FLOW chip の3か所でのみ使う。
   _isMobile() 自体は他用途（パネル高さ・スワイプ・CSS変数取得等）でそのまま使い続ける。 */
function _isActualMobile() {
    return window.innerWidth <= 900 && navigator.maxTouchPoints >= 1;
}



/* ── Sidebar 開閉（class toggle のみ。style操作・overlay・transform禁止）── */
function openSidebar() {
    /* StudyPanel（Y軸）との空間分離を維持 */
    const panel = document.getElementById('bottom-depth-panel');
    if (panel && panel.classList.contains('open')) closeStudyPanel();
    document.getElementById('nav-sidebar').classList.add('open');
}
function closeSidebar()        { document.getElementById('nav-sidebar').classList.remove('open'); }
function toggleSidebar()       { _isSidebarOpen() ? closeSidebar() : openSidebar(); }
function toggleMobileSidebar() { toggleSidebar(); }
function closeMobileSidebar()  { closeSidebar(); }
function _isSidebarOpen()      { return document.getElementById('nav-sidebar')?.classList.contains('open') ?? false; }
function _openSidebar()        { openSidebar(); }

window.addEventListener('resize', () => {
    closeMobileSidebar();
    _syncStudyVerseNav();
});
/* 開閉経路が別関数から実行された場合も、StudyPanel の状態変化に追従する。
   このスクリプトが DOMContentLoaded 後に評価された場合も初期化を取りこぼさない。 */
(() => {
    const bind = () => {
        const panel = document.getElementById('bottom-depth-panel');
        const mobileVerseView = document.getElementById('mobile-verse-view');
        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(() => _syncStudyVerseNav());
            if (panel) observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
            /* MVV 内で後から生成される語句ドロワーの開閉も追跡する。 */
            if (mobileVerseView) observer.observe(mobileVerseView, {
                attributes: true, attributeFilter: ['class'], subtree: true, childList: true
            });
        }
        _syncStudyVerseNav();
    };
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bind, { once: true });
    } else {
        bind();
    }
    window.addEventListener('pageshow', _syncStudyVerseNav);
    window.addEventListener('orientationchange', _syncStudyVerseNav);
})();

document.querySelector('.container')?.addEventListener('click', (e) => {
    if (!_isSidebarOpen()) return;
    if (document.getElementById('mobile-menu-btn')?.contains(e.target)) return;
    closeSidebar();
});

/* パンくず: メニュー閉時のみクリックでサイドバーを開く。開時は何もしない。
   stopPropagation で .container の閉じるハンドラへのバブリングを防ぐ。
   子ボタン（testament/book/chapter）のクリックも同様に伝播を止める。
   章矢印ボタン（.gbc-ch-arrow）は inline onclick 側で stopPropagation 済みだが、
   pointerdown/touchstart でも念のため委任ハンドラで止める。 */
document.getElementById('global-breadcrumb')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target.closest('.gbc-ch-arrow')) return;
    if (!_isSidebarOpen()) openSidebar();
});
document.getElementById('global-breadcrumb')?.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.gbc-ch-arrow')) e.stopPropagation();
});

function toggleInfoCard() {
    const card = document.getElementById('info-overlay-card');
    if (!card) return;
    if (card.classList.contains('visible')) { card.classList.remove('visible'); return; }
    const btn = document.getElementById('sb-info-btn');
    if (btn) {
        const r = btn.getBoundingClientRect();
        card.style.left   = r.left + 'px';
        card.style.bottom = (window.innerHeight - r.top + 8) + 'px';
        card.style.top    = 'auto';
        card.style.right  = 'auto';
    }
    card.classList.add('visible');
}
function closeInfoCard() {
    document.getElementById('info-overlay-card')?.classList.remove('visible');
}
function _openFeedback() {
    const url = window.APP_CONFIG?.feedbackUrl;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
document.addEventListener('click', function(e) {
    const card = document.getElementById('info-overlay-card');
    if (!card?.classList.contains('visible')) return;
    const btn = document.getElementById('sb-info-btn');
    if (!card.contains(e.target) && !btn?.contains(e.target)) closeInfoCard();
});

/* ══════════════════════════════════════════
   サイドバー ドリルダウン
   ══════════════════════════════════════════ */
/* Phase 1a i18n: book names resolve through the UI dictionary
   (book.<KEY> / bookshort.<KEY>); the Japanese maps stay the fallback,
   so Japanese display is unchanged. */
function _bookFullName(key) { return _T('book.' + key, BOOK_NAME[key] || BOOK_SHORT[key] || key); }
function _bookShortName(key) { return _T('bookshort.' + key, BOOK_SHORT[key] || BOOK_NAME[key] || key); }
function _refTitle(key, ch, verse) {
    if (window.I18N && window.I18N.lang !== 'ja') return _bookShortName(key) + ' ' + ch + ':' + verse;
    return (BOOK_SHORT[key] || key) + ch + '章' + verse + '節';
}
function _bookChapterLabel(loc) {
    if (!loc.book || loc.chapter === null) return '本文';
    const short = _T('bookshort.' + loc.book.key, BOOK_SHORT[loc.book.key] || loc.book.name);
    return (window.I18N && window.I18N.lang !== 'ja') ? short + ' ' + loc.chapter : short + loc.chapter + '章';
}
function _rnFmtRef(tok) {
    const r = tok.ref || '';
    const m = r.match(/^([A-Z0-9]+)\s+(\d+):(\d+)/);
    if (m) return _refTitle(m[1], m[2], m[3]);
    const bk = tok.bookKey ? _bookShortName(tok.bookKey) : '';
    const ch = tok.ch != null ? tok.ch : '';
    const v  = tok.verse != null ? tok.verse : '';
    return bk + (ch !== '' ? ch + '章' : '') + (v !== '' ? v + '節' : '');
}

let sbSection  = 'nt';
let sbBookKey  = null;
let sbBookName = '';
let sbMaxCh    = 1;

function sbGoTo(layer, section) {
    document.querySelectorAll('.sb-layer').forEach(l => l.classList.remove('active'));
    document.getElementById('sb-layer' + layer).classList.add('active');

    /* Layer 0: sb-nt-row / sb-ot-row のアクティブ表示 + モードリスト更新 */
    if (layer === 0) {
        document.getElementById('sb-nt-row').classList.toggle('active', sbSection === 'nt');
        document.getElementById('sb-ot-row').classList.toggle('active', sbSection === 'ot');
        _sbRenderModesL0();
    }

    /* Layer 1: 書物一覧を描画 */
    if (layer === 1) {
        if (section) sbSection = section;
        _sbSyncNavHeaders();
        document.getElementById('sb-nt-row').classList.toggle('active', sbSection === 'nt');
        document.getElementById('sb-ot-row').classList.toggle('active', sbSection === 'ot');
        sbRenderBooks();
    }

    /* Layer 2: 章グリッドを描画 */
    if (layer === 2) {
        _sbSyncNavHeaders();
        document.getElementById('sb-l2-title').textContent = _bookFullName(sbBookKey);
        sbRenderChapters();
    }
}

/* Layer 1/2 のナビヘッダーのアクティブ状態を同期 */
function _sbSyncNavHeaders() {
    const isNt = sbSection === 'nt';
    ['sb-nav-nt', 'sb-nav-nt-l2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', isNt);
    });
    ['sb-nav-ot', 'sb-nav-ot-l2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', !isNt);
    });
}

function sbGoBack(layer) { sbGoTo(layer); }

function sbRenderBooks() {
    const list = document.getElementById('sb-book-list');
    list.innerHTML = '';
    SB_BOOKS[sbSection].forEach(b => {
        const div = document.createElement('div');
        div.className = 'sb-row' + (b.key === sbBookKey ? ' active' : '');
        const hasGreek = GREEK_BOOKS.has(b.key);
        div.innerHTML = `<span>${_escH(_bookFullName(b.key))}</span><span class="sb-row-arrow">›</span>`;
        if (!hasGreek) {
            div.title = _T('ui.jaOnly', '日本語訳のみ');
            div.querySelector('span').style.color = 'var(--text-sub)';
        }
        div.onclick = () => {
            sbBookKey  = b.key;
            sbBookName = b.name;
            sbMaxCh    = b.ch;
            sbGoTo(2);
        };
        list.appendChild(div);
    });
}

function sbRenderChapters() {
    const urlParams = Router.parse();
    const currentCh = parseInt(urlParams.chapter || '1');
    const currentBook = urlParams.book || 'ROM';

    const grid = document.getElementById('sb-ch-grid');
    grid.innerHTML = '';
    for (let i = 1; i <= sbMaxCh; i++) {
        const btn = document.createElement('div');
        btn.className = 'sb-ch-btn' + (sbBookKey === currentBook && i === currentCh ? ' active' : '');
        btn.textContent = i;
        btn.onclick = () => {
            _navTo(sbBookKey, i);
        };
        grid.appendChild(btn);
    }
}

function sbInitState(bookKey, ch) {
    const inNt = SB_BOOKS.nt.some(b => b.key === bookKey);
    sbSection = inNt ? 'nt' : 'ot';
    const books = SB_BOOKS[sbSection];
    const found = books.find(b => b.key === bookKey);
    if (found) {
        sbBookKey  = found.key;
        sbBookName = found.name;
        sbMaxCh    = found.ch;
    }
    /* 起動時: Layer 0 を表示（トップメニューから始める） */
    sbGoTo(0);
}

/* 読書モードの1行説明（入口導線 Phase 1）。サイドバー（Layer 0）とモバイルピッカーで共有する。
   文案は「読む言葉」で統一し、モードの使い分けが名前だけでも伝わるようにする。 */
const MODE_DESCRIPTIONS = {
    'JA1955':      'いつもの日本語訳で、まず通して読む',
    'WEB':         'World English Bible（英語訳）で、まず通して読む',
    'WORD_ORDER':  '原語の並びのまま、1語ずつ日本語で確かめる',
    'DA_READING':  '文の組み立てに沿って、並べ替えて読む',
    'ROLE_READING': '誰が・何を・どうしたか、語の役割で読む',
    'GREEK_TEXT':  'ギリシャ語の本文を、そのまま読む',
};
function _modeDesc(id) { return _T('modeDesc.' + id, null) || MODE_DESCRIPTIONS[id] || ''; }

/* 説明は「初めて選ぶとき」の足場であり、常設ではない。モード切り替えを
   累計3回したら、以後の一覧では説明を出さない（もう分かっている人には
   静寂を優先する）。「使い方」ページの説明は常時残るため、後からでも
   確認できる。localStorage が使えない環境では常時表示に倒れる。 */
const _FG_MODE_SWITCH_KEY = 'fg_mode_switch_count';
function _fgModeSwitchCount() {
    try { return parseInt(localStorage.getItem(_FG_MODE_SWITCH_KEY) || '0', 10) || 0; } catch (_) { return 0; }
}
function _fgCountModeSwitch() {
    try { localStorage.setItem(_FG_MODE_SWITCH_KEY, String(_fgModeSwitchCount() + 1)); } catch (_) {}
}
function _modeDescVisible() { return _fgModeSwitchCount() < 3; }

/* サイドバーのモード一覧は Layer 0 のここだけが描く（旧 Layer 3 は廃止）。
   先頭項目は「基本訳スロット」: 固定の翻訳名ではなく UI 言語の基本訳
   （JA=JA1955／EN=WEB。Phase 1b の基準訳の仕組みに従う）で、ラベルと
   説明はその基本訳の既存キー（mode.<id> / modeDesc.<id>）から取る。
   外部比較リンク（新改訳2017・新共同訳）は当面ここでは描画しない。
   _renderExternalCompareMenu / COMPARE_TARGETS / _openCompareTarget は
   保持してあり、復帰はこの関数での描画再開だけで済む。 */
function _sbRenderModesL0() {
    const list = document.getElementById('sb-mode-list-l0');
    if (!list) return;
    const baseId = (window.I18N && I18N.lang === 'en') ? 'WEB' : (window.I18N && I18N.lang === 'es') ? 'RVR1909' : 'JA1955';
    const baseLabel = baseId === 'WEB'
        ? _T('mode.WEB.picker', 'Text (World English Bible)')
        : baseId === 'RVR1909'
        ? _T('mode.RVR1909.picker', 'Texto (Reina-Valera 1909)')
        : _T('mode.JA1955.picker', '本文（口語訳）');
    const items = [
        { id: baseId,       label: baseLabel },
        { id: 'WORD_ORDER', label: _T('mode.WORD_ORDER', '語順で読む')     },
        { id: 'DA_READING', label: _T('mode.DA_READING', '文の構造で読む') },
        { id: 'ROLE_READING', label: _T('mode.ROLE_READING', '語の役割で読む') },
        { id: 'GREEK_TEXT', label: _T('mode.GREEK_TEXT', 'ギリシャ語で読む') },
    ];
    list.innerHTML = items.filter(it => it.id !== 'ROLE_READING' || _roleReadingAvailable()).map(item => {
        const active = (_transA === item.id && _transMode === 'single') ? ' active' : '';
        return `<div class="sb-row${active}" onclick="_sbSelectMode('${item.id}')"><span class="sb-mode-text"><span class="menu-text">${_escH(item.label)}</span>${_modeDescVisible() ? `<span class="sb-mode-desc">${_escH(_modeDesc(item.id))}</span>` : ''}</span></div>`;
    }).join('');
}

function _sbSelectMode(id) {
    _fgCountModeSwitch();
    _transA = id;
    _applyTransMode('single');
    syncUrlState();
    renderCurrentPage();
    sbGoTo(0);
    closeSidebar();
}

/* ══════════════════════════════════════════
   使い方（入口導線 Phase 1）
   初見の人が「何をすればいいか」を3ステップで掴むための静的ページ。
   showAppInfo() と同じ .static-page 差し替え方式。文案は読む言葉で統一。
   ══════════════════════════════════════════ */
function showHowToUse() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');
    const parallel = document.getElementById('parallel-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'howto';
    syncUIFromState();

    const howtoHtml = _T('page.howto', null) || `
        <div class="static-page">

            <section>
                <h3>使い方</h3>
                <p>Bible Green は、ギリシャ語が読めなくても、原語のニュアンスまで日本語で読める聖書アプリです。使い方は3つだけです。</p>
            </section>

            <section>
                <h3>1. 節をタップする</h3>
                <p>読んでいる章の節をタップすると、その節の語が原語の順序で並びます。</p>
            </section>

            <section>
                <h3>2. 語をタップする</h3>
                <p>気になる語をタップすると、その語の意味と、文の中での働きが見られます。もっと深く見たいときは「語の意味や用法を調べる」から、文の中での関係の図や辞書の意味まで開けます。</p>
            </section>

            <section>
                <h3>3. 読み方を変える</h3>
                <p>メニューの「読み方」から切り替えられます。</p>
                <div class="card">
                    <div class="aspect-row"><span class="aspect-label">口語訳で読む</span><span class="aspect-desc">いつもの日本語訳で、まず通して読む</span></div>
                    <div class="aspect-row"><span class="aspect-label">語順で読む</span><span class="aspect-desc">原語の並びのまま、1語ずつ日本語で確かめる</span></div>
                    <div class="aspect-row"><span class="aspect-label">文の構造で読む</span><span class="aspect-desc">文の組み立てに沿って、並べ替えて読む</span></div>
                </div>
            </section>

            <section>
                <h3>図の見方</h3>
                <p>語の分析に出てくる図は、選んだ語が文のほかの語とどう関わっているかを表しています。図の上の「記号の見方」から、印の意味を確認できます。</p>
            </section>

            <section>
                <h3>実際に試してみる</h3>
                <p>ローマ書とヨハネの福音書の有名な箇所で、読み方を案内するツアーがあります。</p>
                <div class="back-wrap">
                    <button class="back-btn" onclick="if (window.App && window.App.onboarding && window.App.onboarding.resetAndReload) window.App.onboarding.resetAndReload();">ガイドツアーをやってみる</button>
                </div>
            </section>

            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">本文に戻る</button>
            </div>

        </div>
    `;
    app.innerHTML = howtoHtml;
    if (parallel) parallel.innerHTML = '';
}

/* ══════════════════════════════════════════
   出典・ポリシー
   ══════════════════════════════════════════ */
function showAppInfo() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');
    const parallel = document.getElementById('parallel-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'sourcePolicy';
    syncUIFromState();

    const infoHtml = _T('page.appinfo', null) || `
        <div class="static-page">

            <section>
                <h3>設計思想</h3>
                <p>このアプリは、ギリシャ語原典を「読む体験」に近づけることを目的としています。文法用語をできるだけ使わず、動詞のアスペクト（時間的な動きの質）を視覚的な記号で示すことで、原語が持つニュアンスを直感的に感じ取れるよう設計しました。</p>
                <div class="card">
                    <div class="aspect-row">
                        <span class="aspect-label"><span class="present-text">実線</span>　<span class="present-text">現在形</span></span>
                        <span class="aspect-desc">動作が今も続いている。「繰り返し」や「進行中」を示す。</span>
                    </div>
                    <div class="aspect-row">
                        <span class="aspect-label"><span class="aorist-text">点線</span>　<span class="aorist-text">アオリスト形</span></span>
                        <span class="aspect-desc">ひとつの出来事として起きた。過去の継続ではなく「事実の点」。</span>
                    </div>
                    <div class="aspect-row">
                        <span class="aspect-label"><span class="perfect-text">波線</span>　<span class="perfect-text">完了形</span></span>
                        <span class="aspect-desc">かつて起きたことの結果が今も残っている。過去と現在がつながる。</span>
                    </div>
                    <div class="aspect-row">
                        <span class="aspect-label"><span class="future-text">二重線</span>　<span class="future-text">未来形</span></span>
                        <span class="aspect-desc">これから必ず起こる、または起こすという確信・意志を示す。</span>
                    </div>
                    <div class="aspect-row">
                        <span class="aspect-label">*　中受動態</span>
                        <span class="aspect-desc">動作が自分自身に及んでいる（中動態）か、外から受けている（受動態）かを示す。</span>
                    </div>
                    <div class="aspect-row">
                        <span class="aspect-label"><span class="indicative-text">背景色</span>　<span class="indicative-text">直説法・命令法</span></span>
                        <span class="aspect-desc">文の主軸となる動詞。事実の断言、または強い呼びかけを示す。</span>
                    </div>
                </div>
            </section>

            <section>
                <h3>日本語表示について（Reading Japanese）</h3>
                <p>このアプリの日本語表示は、一般的な「翻訳」とは異なります。ギリシャ語本文の構造（数・性・人称・格・指示など）を読むための日本語表示です。</p>
                <p>語形や構造など、本文から決定できる情報だけを反映し、推測による補完や一方的な語義の選択は行いません。原文を起点として保ちながら、読みでたどれる形にしています。</p>
                <p>詳細な考え方は「Reading Japanese Specification」として公開しています。</p>
            </section>

            <section>
                <h3>出典</h3>
                <table>
                    <tr><th>ギリシャ語底本</th><td>SBL Greek New Testament (SBLGNT)<br><small>© Faithlife / Logos Bible Software, edited by Michael W. Holmes — CC BY 4.0</small></td></tr>
                    <tr><th>形態論解析</th><td>MACULA Greek Linguistic Datasets, available at <a href="https://github.com/Clear-Bible/macula-greek/" target="_blank" rel="noopener">https://github.com/Clear-Bible/macula-greek/</a><br><small>© Biblica, Inc. — CC BY 4.0</small></td></tr>
                    <tr><th>英語グロス</th><td>Cherith Glosses（Andi Wu）<br><small>© 2023 Cherith Analytics — CC BY 4.0</small></td></tr>
                    <tr><th>辞書データ</th><td>Abbott-Smith, <em>A Manual Greek Lexicon of the New Testament</em></td></tr>
                    <tr>
                      <th>構文分類体系</th>
                      <td>
                        Wallace, Daniel B. <em>Greek Grammar Beyond the Basics.</em> Zondervan, 1996.<br>
                        <small>Wallaceの文法分類体系と分析手法を参考にしつつ、解説文は日本語話者向けに独自作成しています。</small>
                      </td>
                    </tr>
                    <tr>
                      <th>日本語訳聖書</th>
                      <td>『聖書 口語訳』（日本聖書協会、1955年）、『聖書 文語訳』（日本聖書協会、1917年改訳）</td>
                    </tr>
                </table>
            </section>

            <section>
                <h3>プライバシー</h3>
                <p>現在このアプリは、個人情報やアクセスログをサーバーに送信・収集していません。読書の進捗やオンボーディングの状態は、お使いのブラウザの localStorage にのみ保存されます（サーバーには送られません）。</p>
                <p>将来的に機能を拡張する場合、情報収集を伴う変更を行う際は事前に明示し、同意いただいた上でのみ実施します。</p>
            </section>

            <section>
                <h3>AIの使用について</h3>
                <p>本アプリでは、聖書本文の表示、形態論解析、構文情報、辞書参照など、読解に関わるすべての主要機能にAIを使用していません。</p>
                <p>表示されるギリシャ語本文、日本語本文、語形情報、文法情報、および辞書・検索データは、すべて学術的データソースに基づいています。</p>
                <p>AIは主に開発工程におけるコーディング支援、および辞書データの翻訳・整備補助にのみ使用されています。</p>
                <p>そのため、アプリ内で提供される聖書本文および文法情報は、AIによって生成されたものではありません。</p>
            </section>

            <section>
                <h3>運営</h3>
                <p>このアプリは非商用・個人運営のプロジェクトです。© 2026 Hiroki Minamida</p>
            </section>

            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">本文に戻る</button>
            </div>
        </div>
    `;
    app.innerHTML = infoHtml;
}

/* ══════════════════════════════════════════
   Roadmap（ロードマップ）
   データは ./assets/data/roadmap.json から取得する（コードへのハードコード禁止）。
   各カテゴリは { category, summary, items[] } の形をとる。
   items は { title, detail } を持つ。
   ══════════════════════════════════════════ */

async function showRoadmap() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'roadmap';
    syncUIFromState();

    let categories = [];
    try {
        const res = await fetch('../assets/data/roadmap.json');
        if (res.ok) categories = await res.json();
    } catch (e) {
        console.warn('[Roadmap] roadmap.json の取得に失敗しました:', e);
    }

    const sectionsHtml = categories.map(cat => {
        const itemsHtml = (cat.items || []).map(item => `
            <div class="roadmap-item">
                <div class="roadmap-item-title">${_escH(item.title)}</div>
                <div class="roadmap-item-detail">${_escH(item.detail)}</div>
            </div>`).join('');
        return `
            <section>
                <h3>${_escH(cat.category)}</h3>
                <p class="changelog-story">${_escH(cat.summary)}</p>
                ${itemsHtml}
            </section>`;
    }).join('');

    const html = `
        <div class="static-page">
            <p class="roadmap-intro">このアプリが今後どのように成長するかをお伝えします。β版として利用いただいているあなたへの、現時点の見通しです。</p>
            ${sectionsHtml}
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">本文に戻る</button>
            </div>
        </div>
    `;
    app.innerHTML = html;
}

/* ══════════════════════════════════════════
   Changelog（更新情報）
   データは ./assets/data/changelog.json から取得する（コードへのハードコード禁止）。
   各リリースは { version, date, title, story, changes[] } の形をとる
   （title は現状未使用。将来の表示拡張に備えてデータ側にのみ存在する）。
   story は「何を変えたか」ではなく「なぜ変えたか」をユーザー視点・1行で表す文で、
   技術用語（関数名・DOM・クラス名等）は含めない。
   ══════════════════════════════════════════ */

/* Changelog画面。showAppInfo()/showMameKnowledge()と同じ .static-page 差し替え方式。
   story/changes は外部JSON（changelog.json）由来のため、entry系データと同じ規律として
   _escH() を必ず通してから描画する（生のテンプレートリテラル結合は禁止）。 */
async function showChangelog() {
    closeMobileSidebar();
    const app = document.getElementById('bible-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'changelog';
    syncUIFromState();

    let releases = [];
    try {
        const res = await fetch('../assets/data/changelog.json');
        if (res.ok) releases = await res.json();
    } catch (e) {
        console.warn('[Changelog] changelog.json の取得に失敗しました:', e);
    }

    const entriesHtml = releases.map(rel => {
        const changesHtml = (rel.changes || []).map(c => `<li>${_escH(c)}</li>`).join('');
        return `
            <section>
                <h3>${_escH(rel.version)} <span class="ui-caption">${_escH(rel.date)}</span></h3>
                <p class="changelog-story">${_escH(rel.story)}</p>
                <ul>${changesHtml}</ul>
            </section>`;
    }).join('');

    const html = `
        <div class="static-page">
            ${entriesHtml}
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">本文に戻る</button>
            </div>
        </div>
    `;
    app.innerHTML = html;
}

/* ブックマーク/メモ/最近読んだ箇所/最近見た単語、4ページ共通のカードUIヘルパー。
   ★ HTML安全性: entry系データと同様、ここを通る title/sub/meta は信頼できない値として
   _escH() で必ずエスケープする（生のテンプレートリテラル結合は禁止）。
   href が無い（構造化フィールドが欠けている＝旧データ等）場合はクリック不可カードにする。 */
/* 辞書本文の聖書参照・ギリシャ語から、本文／既存検索ツールへ移動できるようにする。 */
function _renderDictionaryLinkedText(value) {
    const source = String(value == null ? '' : value);
    const books = {
        matt:'MAT', matthew:'MAT', mt:'MAT', マタイ:'MAT', マタ:'MAT',
        mark:'MRK', mk:'MRK', マルコ:'MRK', マコ:'MRK',
        luke:'LUK', lk:'LUK', ルカ:'LUK',
        john:'JHN', jn:'JHN', ヨハネ:'JHN', ヨハ:'JHN',
        ヨハ一:'1JN', ヨハ二:'2JN', ヨハ三:'3JN', ヨ一:'1JN', ヨ二:'2JN', ヨ三:'3JN',
        acts:'ACT', act:'ACT', ac:'ACT', 使:'ACT', 使徒:'ACT', '使徒の働き':'ACT',
        rom:'ROM', romans:'ROM', ro:'ROM', ローマ:'ROM', ロマ:'ROM',
        '1 cor':'1CO', '1 corinthians':'1CO', コリント第一:'1CO', コリ一:'1CO',
        '2 cor':'2CO', '2 corinthians':'2CO', コリント第二:'2CO', コリ二:'2CO',
        gal:'GAL', galatians:'GAL', ガラテヤ:'GAL', ガラ:'GAL',
        eph:'EPH', ephesians:'EPH', エペソ:'EPH', エペ:'EPH',
        phil:'PHP', philippians:'PHP', ピリピ:'PHP', ピリ:'PHP',
        col:'COL', colossians:'COL', コロサイ:'COL', コロ:'COL',
        '1 thess':'1TH', '1 thessalonians':'1TH', テサロニケ第一:'1TH', テサ一:'1TH',
        '2 thess':'2TH', '2 thessalonians':'2TH', テサロニケ第二:'2TH', テサ二:'2TH',
        '1 tim':'1TI', '1 timothy':'1TI', テモテ第一:'1TI', テモ一:'1TI',
        '2 tim':'2TI', '2 timothy':'2TI', テモテ第二:'2TI', テモ二:'2TI',
        tit:'TIT', titus:'TIT', テトス:'TIT', テト:'TIT',
        phlm:'PHM', philem:'PHM', philemon:'PHM', ピレモン:'PHM', ピレ:'PHM',
        heb:'HEB', hebrews:'HEB', ヘブル:'HEB', ヘブ:'HEB',
        jas:'JAS', james:'JAS', ヤコブ:'JAS',
        '1 pet':'1PE', '1 peter':'1PE', ペテロ第一:'1PE', ペテ一:'1PE',
        '2 pet':'2PE', '2 peter':'2PE', ペテロ第二:'2PE', ペテ二:'2PE',
        '1 jn':'1JN', '1 john':'1JN', ヨハネ第一:'1JN',
        '2 jn':'2JN', '2 john':'2JN', ヨハネ第二:'2JN',
        '3 jn':'3JN', '3 john':'3JN', ヨハネ第三:'3JN',
        jude:'JUD', ユダ:'JUD', rev:'REV', revelation:'REV', 黙示録:'REV', 黙:'REV'
    };
    const bookNames = '(?:Matthew|Matt|Mt|Mark|Mk|Luke|Lk|John|Jn|Acts|Act|Ac|Romans|Rom|Ro|Corinthians|Cor|Galatians|Gal|Ephesians|Eph|Philippians|Phil|Colossians|Col|Thessalonians|Thess|Timothy|Tim|Titus|Tit|Philemon|Philem|Phlm|Hebrews|Heb|ヘブル|ヘブ|ピレモン|ピレ|テト|James|Jas|Peter|Pet|Jude|Revelation|Rev|ヨハネ第一|ヨハネ第二|ヨハネ第三|ヨハ一|ヨハ二|ヨハ三|ヨ一|ヨ二|ヨ三|コリント第一|コリント第二|テサロニケ第一|テサロニケ第二|テモテ第一|テモテ第二|ペテロ第一|ペテロ第二|使徒の働き|使|マタイ|マタ|マルコ|マコ|ルカ|ヨハネ|ヨハ|使徒|ユダ|ローマ|ロマ|コリ一|コリ二|ガラテヤ|ガラ|エペソ|エペ|ピリピ|ピリ|コロサイ|コロ|テサ一|テサ二|テモ一|テモ二|テトス|ピレモン|ヘブル|ヤコブ|ペテ一|ペテ二|黙示録|黙)';
    const pattern = new RegExp(
        '(?<full>(?<prefix>(?:1|2|3)\\s*)?(?<book>' + bookNames + ')\\.?\\s*(?<chapter>\\d{1,3}):(?<verse>\\d{1,3})(?:\\s*[-–]\\s*(?<endverse>\\d{1,3}))?)' +
        '|(?<single>(?<singleprefix>(?:2|3)\\s*)?(?<singlebook>Philemon|Philem|Phlm|ピレモン|ピレ|ヨハネ第二|ヨハネ第三|ヨハ二|ヨハ三|ヨ二|ヨ三|Jude|ユダ|ピレモン)\\s*(?<singleverse>\\d{1,3})(?!\\s*:))' +
        '|(?<continued>(?<sep>[,、;]\\s*)(?<cchapter>\\d{1,3}):(?<cverse>\\d{1,3})(?:\\s*[-–]\\s*(?<cendverse>\\d{1,3}))?)' +
        '|(?<continuedVerse>(?<vsep>[,、;]\\s*)(?<onlyverse>\\d{1,3})(?!\\s*[:\\d]))' +
        '|(?<greek>[\\u0370-\\u03FF\\u1F00-\\u1FFF]+(?:[\'’][\\u0370-\\u03FF\\u1F00-\\u1FFF]+)*)',
        'gi'
    );
    let html = '', cursor = 0, match, lastBookCode = null, lastChapter = null;
    while ((match = pattern.exec(source)) !== null) {
        html += _escH(source.slice(cursor, match.index)).replace(/\n/g, '<br>');
        const g = match.groups || {};
        if (g.full) {
            const name = ((g.prefix || '') + g.book).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
            const book = books[name];
            if (book) {
                lastBookCode = book;
                lastChapter = g.chapter;
                html += '<a class="rn-inline-bible-ref" href="/' + book + '/' + g.chapter + '/' + g.verse + '" title="聖書本文を開く">' + _escH(g.full) + '</a>';
            } else {
                lastBookCode = null;
                html += _escH(g.full);
            }
        } else if (g.single) {
            const singleName = ((g.singleprefix || '') + g.singlebook).toLowerCase().replace(/\s+/g, ' ').trim();
            const book = books[singleName];
            if (['JUD', 'PHM', '2JN', '3JN'].includes(book)) {
                lastBookCode = book;
                lastChapter = '1';
                html += '<a class="rn-inline-bible-ref" href="/' + book + '/1/' + g.singleverse + '" title="聖書本文を開く">' + _escH(g.single) + '</a>';
            } else {
                html += _escH(g.single);
            }
        } else if (g.continued) {
            html += _escH(g.sep);
            if (lastBookCode) {
                lastChapter = g.cchapter;
                html += '<a class="rn-inline-bible-ref" href="/' + lastBookCode + '/' + g.cchapter + '/' + g.cverse + '" title="聖書本文を開く">' + _escH(g.continued.slice(g.sep.length)) + '</a>';
            } else {
                html += _escH(g.continued.slice(g.sep.length));
            }
        } else if (g.continuedVerse) {
            html += _escH(g.vsep);
            if (lastBookCode && lastChapter) {
                html += '<a class="rn-inline-bible-ref" href="/' + lastBookCode + '/' + lastChapter + '/' + g.onlyverse + '" title="聖書本文を開く">' + _escH(g.onlyverse) + '</a>';
            } else {
                html += _escH(g.onlyverse);
            }
        } else if (g.greek) {
            const query = new URLSearchParams({ tool: 'search', word: g.greek, layers: 'lemma,morph' });
            html += '<a class="rn-inline-word-search" href="search-tool.html?' + query.toString() + '" title="検索ツールで調べる">' + _escH(g.greek) + '</a>';
        }
        cursor = pattern.lastIndex;
    }
    return html + _escH(source.slice(cursor)).replace(/\n/g, '<br>');
}

/* 文法略号の説明は表示言語ごとに管理する。辞書原文は変更しない。 */
const _ABBOTT_GRAMMAR_TERMS = {
    ja: {
        'gen.': '属格（「〜の」など）', 'acc.': '対格（動作の対象など）',
        'dat.': '与格（「〜に」など）', 'nom.': '主格（主語など）',
        'voc.': '呼格（呼びかけ）', 'loc.': '場所を表す格',
        'instr.': '手段を表す格', 'abl.': '起点・分離を表す格',
        'inf.': '不定詞', 'part.': '分詞', 'subj.': '接続法',
        'imper.': '命令法', 'impf.': '未完了過去形', 'pres.': '現在形',
        'aor.': 'アオリスト', 'fut.': '未来形', 'pl.': '複数形',
        'fem.': '女性形', 'cf.': '比較：', 'sc.': '省略を補うと：'
    },
    en: {
        'gen.': 'genitive', 'acc.': 'accusative', 'dat.': 'dative',
        'nom.': 'nominative', 'voc.': 'vocative', 'loc.': 'locative',
        'instr.': 'instrumental', 'abl.': 'ablative', 'inf.': 'infinitive',
        'part.': 'participle', 'subj.': 'subjunctive', 'imper.': 'imperative',
        'impf.': 'imperfect', 'pres.': 'present', 'aor.': 'aorist',
        'fut.': 'future', 'pl.': 'plural', 'fem.': 'feminine',
        'cf.': 'compare:', 'sc.': 'understand the omitted word as:'
    }
};

/* 表示時の補助だけを行い、原文・保存データは変更しない。 */
function _localizeAbbottAbbreviations(text, locale) {
    const _rawLang = String(locale || document.documentElement.lang || 'ja').toLowerCase().split('-')[0];
    /* Abbott-Smith 原文は英語のため、ES UI でも英語の略号展開を使う（EN と同じ扱い）。 */
    const language = _rawLang === 'es' ? 'en' : _rawLang;
    const terms = _ABBOTT_GRAMMAR_TERMS[language] || _ABBOTT_GRAMMAR_TERMS.ja;
    let result = String(text == null ? '' : text);

    /* 複合略号を先に処理し、構成要素だけが置換されて意味不明になるのを防ぐ。 */
    const compounds = language === 'en'
        ? [
            [/\bc\.\s*acc\.\s*et\s*inf\./gi, 'accusative-and-infinitive construction'],
            [/\bc\.\s*gen\.\s*\(?\s*pers\.\s*et\s*rei\s*\)?/gi, 'with the genitive of a person and a thing'],
            [/\bc\.\s*gen\./gi, 'with the genitive'],
            [/\bc\.\s*inf\./gi, 'with the infinitive'],
            [/\bc\.\s*dat\.\s*pers\./gi, 'with the dative of a person'],
            [/\bc\.\s*dat\.\s*rei\b/gi, 'with the dative of a thing'],
            [/\bc\.\s*acc\.\s*pers\./gi, 'with the accusative of a person'],
            [/\bc\.\s*acc\.\s*rei\b/gi, 'with the accusative of a thing'],
            [/\bc\.\s*gen\.\s*pers\./gi, 'with the genitive of a person'],
            [/\bc\.\s*gen\.\s*rei\b/gi, 'with the genitive of a thing'],
            [/\bacc\.\s*pers\./gi, 'accusative of a person'],
            [/\bacc\.\s*rei\b/gi, 'accusative of a thing'],
            [/\bgen\.\s*pers\./gi, 'genitive of a person'],
            [/\bgen\.\s*rei\b/gi, 'genitive of a thing'],
            [/\bgen\.\s*obj\./gi, 'objective genitive'],
            [/\bgen\.\s*subj\./gi, 'subjective genitive'],
            [/\bdat\.\s*pers\./gi, 'dative of a person'],
            [/\bdat\.\s*rei\b/gi, 'dative of a thing'],
            [/\bdat\.\s*instr\./gi, 'instrumental dative'],
            [/\bacc\.\s*loc\./gi, 'accusative of place'],
            [/\bgen\.\s*loc\./gi, 'genitive of place'],
            [/\bacc\.\s*temp\./gi, 'accusative of time'],
            [/\bacc\.\s*cogn\./gi, 'cognate accusative'],
            [/\bgen\.\s*part\./gi, 'partitive genitive'],
            [/\bdupl\.\s*acc\./gi, 'double accusative'],
            [/\bacc\.\s*fem\./gi, 'feminine accusative'],
            [/\bdat\.\s*pl\./gi, 'dative plural'],
            [/\bacc\.\s*ptcp\./gi, 'accusative with a participle'],
            [/\bart\.\s*inf\./gi, 'articular infinitive'],
            [/\bacc\.\s*pred\./gi, 'predicate accusative'],
            [/\bacc\.\s*obj\./gi, 'objective accusative'],
            [/\bacc\.\s*ref\./gi, 'accusative of reference'],
            [/\bgen\.\s*pun\./gi, 'genitive of punishment'],
            [/\bgen\.\s*pret\./gi, 'genitive of price'],
            [/\bsubj\.\s*aor\./gi, 'aorist subjunctive'],
            [/\binf\.\s*pres\./gi, 'present infinitive']
        ]
        : [
            [/\bc\.\s*acc\.\s*et\s*inf\./gi, '対格＋不定詞構文'],
            [/\bc\.\s*gen\.\s*\(?\s*pers\.\s*et\s*rei\s*\)?/gi, '人・事物を表す属格を伴って'],
            [/\bc\.\s*gen\./gi, '属格を伴って'],
            [/\bc\.\s*inf\./gi, '不定詞を伴って'],
            [/\bc\.\s*dat\.\s*pers\./gi, '人を表す与格を伴って'],
            [/\bc\.\s*dat\.\s*rei\b/gi, '事物を表す与格を伴って'],
            [/\bc\.\s*acc\.\s*pers\./gi, '人を表す対格を伴って'],
            [/\bc\.\s*acc\.\s*rei\b/gi, '事物を表す対格を伴って'],
            [/\bc\.\s*gen\.\s*pers\./gi, '人を表す属格を伴って'],
            [/\bc\.\s*gen\.\s*rei\b/gi, '事物を表す属格を伴って'],
            [/\bacc\.\s*pers\./gi, '人を表す対格'],
            [/\bacc\.\s*rei\b/gi, '事物を表す対格'],
            [/\bgen\.\s*pers\./gi, '人を表す属格'],
            [/\bgen\.\s*rei\b/gi, '事物を表す属格'],
            [/\bgen\.\s*obj\./gi, '目的語的属格'],
            [/\bgen\.\s*subj\./gi, '主語的属格'],
            [/\bdat\.\s*pers\./gi, '人を表す与格'],
            [/\bdat\.\s*rei\b/gi, '事物を表す与格'],
            [/\bdat\.\s*instr\./gi, '手段を表す与格'],
            [/\bacc\.\s*loc\./gi, '場所を表す対格'],
            [/\bgen\.\s*loc\./gi, '場所を表す属格'],
            [/\bacc\.\s*temp\./gi, '時間を表す対格'],
            [/\bacc\.\s*cogn\./gi, '同族目的語の対格'],
            [/\bgen\.\s*part\./gi, '部分を表す属格'],
            [/\bdupl\.\s*acc\./gi, '二重対格'],
            [/\bacc\.\s*fem\./gi, '女性形の対格'],
            [/\bdat\.\s*pl\./gi, '複数与格'],
            [/\bacc\.\s*ptcp\./gi, '分詞を伴う対格'],
            [/\bart\.\s*inf\./gi, '冠詞付き不定詞'],
            [/\bacc\.\s*pred\./gi, '述語的対格'],
            [/\bacc\.\s*obj\./gi, '目的語を表す対格'],
            [/\bacc\.\s*ref\./gi, '関係・観点を表す対格'],
            [/\bgen\.\s*pun\./gi, '処罰を表す属格'],
            [/\bgen\.\s*pret\./gi, '価格を表す属格'],
            [/\bsubj\.\s*aor\./gi, 'アオリスト接続法'],
            [/\binf\.\s*pres\./gi, '現在不定詞']
        ];
    compounds.forEach(([pattern, label]) => { result = result.replace(pattern, label); });

    /* ヘブライ語動詞の活用型略号。ギリシャ語の格・法の略号とは別に扱う。 */
    const hebrewStems = language === 'en'
        ? { 'hithp.': 'Hithpael stem', 'hith.': 'Hithpael stem', 'hi.': 'Hiphil stem', 'pi.': 'Piel stem', 'ni.': 'Nifal stem', 'pu.': 'Pual stem', 'ho.': 'Hofal stem' }
        : { 'hithp.': 'ヒトパエル形', 'hith.': 'ヒトパエル形', 'hi.': 'ヒフィル形', 'pi.': 'ピエル形', 'ni.': 'ニファル形', 'pu.': 'プアル形', 'ho.': 'ホファル形' };
    Object.keys(hebrewStems).sort((x, y) => y.length - x.length).forEach(abbr => {
        const escaped = abbr.replace(/\./g, '\\.');
        const pattern = new RegExp('(^|[^A-Za-z])' + escaped + '(?=\\s|$|[,;:)：、。）])', 'g');
        result = result.replace(pattern, (match, prefix) => prefix + hebrewStems[abbr]);
    });

    Object.keys(terms).sort((a, b) => b.length - a.length).forEach(abbr => {
        const escaped = abbr.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp('(^|[^A-Za-z])' + escaped + '(?=\\s|$|[,;:)：、。）])', 'g');
        result = result.replace(pattern, (match, prefix) => prefix + terms[abbr]);
    });
    /* 日本語化した文法用語の直後に原文由来の空白が残ると読みにくいため、
       変換済みラベルと日本語の間だけ空白を詰める。その他の原文の空白は維持する。 */
    if (language !== 'en') {
        const localizedLabels = [
            ...Object.values(terms),
            '対格＋不定詞構文', '属格を伴って', '不定詞を伴って',
            '人を表す対格', '事物を表す対格', '人を表す属格', '事物を表す属格',
            '目的語的属格', '主語的属格', '人を表す与格', '事物を表す与格',
            '手段を表す与格', '場所を表す対格', '場所を表す属格', '時間を表す対格',
            '同族目的語の対格', '部分を表す属格', '二重対格', '女性形の対格',
            '複数与格', '分詞を伴う対格', '冠詞付き不定詞', '述語的対格',
            '目的語を表す対格', '関係・観点を表す対格', '処罰を表す属格',
            '価格を表す属格', 'アオリスト接続法', '現在不定詞',
            'ヒトパエル形', 'ヒフィル形', 'ピエル形', 'ニファル形', 'プアル形', 'ホファル形'
        ];
        const labelAlternation = [...new Set(localizedLabels)]
            .sort((a, b) => b.length - a.length)
            .map(label => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');
        const labelBoundary = new RegExp('(' + labelAlternation + ')\\s+(?=[ぁ-んァ-ヶ一-龯])', 'g');
        result = result.replace(labelBoundary, '$1');
    }
    /* 日本語説明に残る通常の英語表現を、文脈が特定できる完全一致で訳す。
       略号・人名・ラテン語などを単語単位で誤変換しない。 */
    if (language === 'ja') {
        const ordinaryEnglishFragments = [
            ['英語 else', '英語「ほかの」'],
            ['（and, now, but）', '（「そして」「ところで」「しかし」）'],
            ['（but, on the other hand）', '（「しかし」「一方で」）'],
            ['（κατά，against）', '（κατά「〜に逆らって」）'],
            ['（英語訳では edify）', '（英語訳では「信仰を養い、成長させる」）'],
            ['宣言、message、宣教', '宣言、宣教内容（メッセージ）、宣教（行為）'],
            ['message', 'メッセージ'],
            ['preferring', '他の人を自分より優先する'],
            ['「完成的」action', '「完了・完成」を表す意味'],
            ['欽定訳の \\\"preferring\\\" に対応', '欽定訳の「他の人を自分より優先する」に対応']
        ];
        ordinaryEnglishFragments.forEach(([source, translation]) => {
            result = result.split(source).join(translation);
        });
    }
    return result;
}

/* 辞書セル内の丸数字（①②…）項目を、項目ごとに区切って描画する。
 * 辞書の文章そのものは変えず、表示上のまとまりだけを作る。
 * 丸数字の項目が2つ未満のセルは従来どおり一続きで描画する。 */
function _renderAbbottCellHTML(value) {
    const source = String(value == null ? '' : value);
    const parts = source.split(/(?=[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])/);
    const numbered = parts.filter(p => /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/.test(p.trim()));
    if (numbered.length < 2) return _renderDictionaryLinkedText(source);
    const segments = parts.map(p => p.trim()).filter(Boolean);
    return segments.map((trimmed, i) => {
        const html = _renderDictionaryLinkedText(trimmed);
        if (/^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]/.test(trimmed)) {
            return `<span class="rn-dict-item${i === 0 ? ' rn-dict-item-first' : ''}">${html}</span>`;
        }
        return `<span class="rn-dict-intro">${html}</span>`;
    }).join('');
}

function _renderAbbottFullText(text) {
    const source = _localizeAbbottAbbreviations(String(text == null ? '' : text));
    const re = /【([^】]+)】([^【]*)/g;
    const rows = [];
    let match;
    let cursor = 0;
    while ((match = re.exec(source)) !== null) {
        const prefix = source.slice(cursor, match.index).trim();
        if (prefix) rows.push({ label: '', value: prefix });
        rows.push({ label: match[1].trim(), value: match[2].trim() });
        cursor = re.lastIndex;
    }
    const tail = source.slice(cursor).trim();
    if (tail) rows.push({ label: '', value: tail });
    if (!rows.length) return _renderDictionaryLinkedText(source);
    return '<table class="rn-dict-full-table"><tbody>' + rows.map(row =>
        '<tr>' +
          (row.label
            ? '<th scope="row">' + _escH(row.label) + '</th>'
            : '<th scope="row" class="rn-dict-full-unlabeled"></th>') +
          '<td>' + _renderAbbottCellHTML(row.value) + '</td>' +
        '</tr>'
    ).join('') + '</tbody></table>';
}
function _listMetaDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dStart     = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
    const diffDays   = Math.round((todayStart - dStart) / 86400000);
    const isEn = window.I18N && I18N.lang !== 'ja';
    if (diffDays === 0) return isEn ? _T('ui.today', '今日') : '今日';
    if (diffDays === 1) return isEn ? _T('ui.yesterday', '昨日') : '昨日';
    if (diffDays >= 2 && diffDays <= 6) return isEn ? diffDays + _T('ui.daysAgoSuffix', '日前') : diffDays + '日前';
    if (diffDays === 7) return isEn ? _T('ui.oneWeekAgo', '1週間前') : '1週間前';
    if (window.I18N && I18N.lang === 'es') return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    if (isEn) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const DAY_JA = ['日', '月', '火', '水', '木', '金', '土'];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日（' + DAY_JA[d.getDay()] + '）';
}

/* 最近読んだ履歴のグルーピング用：今日 / 昨日 / それ以前 の3値のみ返す */
function _listMetaDateGroup(ts) {
    const isEn = window.I18N && I18N.lang !== 'ja';
    if (!ts) return isEn ? _T('ui.earlier', 'それ以前') : 'それ以前';
    const d = new Date(ts);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dStart     = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays   = Math.round((todayStart - dStart) / 86400000);
    if (diffDays === 0) return isEn ? _T('ui.today', '今日') : '今日';
    if (diffDays === 1) return isEn ? _T('ui.yesterday', '昨日') : '昨日';
    return isEn ? _T('ui.earlier', 'それ以前') : 'それ以前';
}

/* opts.actions はボタンHTML（呼び出し側が組み立てた定数テンプレート文字列）を想定し、
   ここでは追加のエスケープは行わない。カード全体のonclick（href遷移）とボタン操作が
   競合しないよう、actionsラッパーで event.stopPropagation() する。 */
function _listItemCard(opts) {
    const titleHtml   = `<div class="list-item-title">${_escH(opts.title || '')}</div>`;
    const previewHtml = opts.preview ? `<div class="list-item-preview">${_escH(opts.preview)}</div>` : '';
    const subHtml     = opts.sub ? `<div class="list-item-sub">${_escH(opts.sub)}</div>` : '';
    const metaHtml    = opts.meta ? `<div class="list-item-meta">${_escH(opts.meta)}</div>` : '';
    const hasHref = Boolean(opts.href);
    const onclickAttr = hasHref ? ` onclick="location.href='${opts.href}'"` : '';
    const keyboardAttr = hasHref ? ` tabindex="0" role="${opts.actions ? 'group' : 'link'}" onkeydown="if(event.target===this&&event.key==='Enter'){event.preventDefault();location.href='${opts.href}'}"` : '';
    const actionsHtml = opts.actions ? `<div class="list-item-actions" onclick="event.stopPropagation()">${opts.actions}</div>` : '';
    return `<div class="list-item-card"${onclickAttr}${keyboardAttr}><div class="list-item-main">${titleHtml}${previewHtml}${subHtml}</div>${metaHtml}${actionsHtml}</div>`;
}

/* 最近読んだ箇所一覧画面。
   上部：「続きを読む」（最新1件 + 本文プレビュー）
   下部：「最近読んだ箇所」（今日 / 昨日 / それ以前 グループ）
   panel=study は付けない＝節へ移動するのみで Study Panel は開かない。 */
async function showRecentVerses() {
    closeMobileSidebar();

    const app = document.getElementById('bible-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'recentVerses';
    syncUIFromState();

    const recentVerses = window.App?.storage?.getRecentVerses() || [];

    if (!recentVerses.length) {
        app.innerHTML = `
            <div class="static-page list-page">
                <p class="list-item-empty">${_T('ui.noRecentVerses', '最近読んだ箇所はまだありません。')}</p>
                <div class="back-wrap">
                    <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
                </div>
            </div>`;
        return;
    }

    /* 続きを読む：最新1件 */
    const latest = recentVerses[0];
    const hasLatestLoc = latest.bookKey && latest.chapter != null && latest.verse != null;
    let continueHtml = '';
    if (hasLatestLoc) {
        const bookName = _bookFullName(latest.bookKey);
        const href = `index.html?book=${encodeURIComponent(latest.bookKey)}&ch=${encodeURIComponent(latest.chapter)}&verse=${encodeURIComponent(latest.verse)}`;
        let verseText = '';
        try {
            const _previewTrans = (window.I18N && I18N.lang === 'en') ? 'WEB' : (window.I18N && I18N.lang === 'es') ? 'RVR1909' : 'JA1955';
            const chData = await _fetchTranslation(_previewTrans, latest.bookKey, String(latest.chapter));
            verseText = chData?.verses?.[String(latest.verse)] || '';
        } catch(e) {}
        if (AppState.ui.view !== 'recentVerses') return;
        const previewHtml = verseText
            ? `<div class="rv-continue-preview">${_escH(verseText)}</div>`
            : `<div class="rv-continue-fallback">${_T('ui.youWereReadingHere', '今日、ここまで読みました。')}</div>`;
        continueHtml = `
            <section class="rv-continue-section">
                <div class="rv-section-label">${_T('ui.continueReading', '続きを読む')}</div>
                <div class="rv-continue-card" role="link" tabindex="0" onclick="location.href='${href}'" onkeydown="if(event.target===this&&event.key==='Enter'){event.preventDefault();location.href='${href}'}">
                    <div class="rv-continue-loc">${_escH(bookName)} ${_escH(String(latest.chapter))}:${_escH(String(latest.verse))}</div>
                    ${previewHtml}
                    <div class="rv-continue-action">${_T('ui.readArrow', '読む →')}</div>
                </div>
            </section>`;
    }

    /* 履歴：2件目以降をグルーピング */
    const historyItems = recentVerses.slice(1).filter(v => v.bookKey && v.chapter != null && v.verse != null);
    let historyHtml = '';
    if (historyItems.length) {
        const groups = {};
        const groupOrder = [];
        historyItems.forEach(v => {
            const label = _listMetaDateGroup(v.timestamp);
            if (!groups[label]) { groups[label] = []; groupOrder.push(label); }
            groups[label].push(v);
        });
        const groupsHtml = groupOrder.map(label => {
            const items = groups[label].map(v => {
                const bookName = _bookFullName(v.bookKey);
                const title = `${bookName} ${v.chapter}:${v.verse}`;
                const href = `index.html?book=${encodeURIComponent(v.bookKey)}&ch=${encodeURIComponent(v.chapter)}&verse=${encodeURIComponent(v.verse)}`;
                return _listItemCard({ title, href });
            }).join('');
            return `<div class="rv-group"><div class="rv-group-header">${_escH(label)}</div>${items}</div>`;
        }).join('');
        historyHtml = `
            <section class="rv-history-section">
                <div class="rv-section-label">${_T('ui.recentlyRead', '最近読んだ箇所')}</div>
                ${groupsHtml}
            </section>`;
    }

    app.innerHTML = `
        <div class="static-page list-page">
            ${continueHtml}
            ${historyHtml}
            <div class="back-wrap">
                <button class="back-btn" onclick="renderCurrentPage()">${_T('ui.backToText', '本文に戻る')}</button>
            </div>
        </div>`;
}

/* 最近見た単語一覧画面。showBookmarks()/showRecentVerses()と同じ .static-page 差し替え方式。
   URL生成は entry.bookKey / entry.chapter / entry.verse のみを使用する（ref文字列という概念自体が
   recentWords には存在しないため、解析の余地もない）。panel=study を付けて Study Panel を開くが、
   元の単語の自動選択やWord Card再生成は行わない（節へ移動するのみ）。 */
function showRecentWords() {
    closeMobileSidebar();

    const app = document.getElementById('bible-text-area');

    document.getElementById('main-reading-area').classList.add('single-mode');
    document.getElementById('main-reading-area').classList.add('static-view');
    document.getElementById('main-reading-area').scrollTop = 0;

    AppState.ui.view = 'recentWords';
    syncUIFromState();

    const recentWords = window.App.storage ? window.App.storage.getRecentWords() : [];

    const rowsHtml = recentWords.length
        ? recentWords.map(w => {
            const hasLoc = w.bookKey && w.chapter != null && w.verse != null;
            const href = hasLoc
                ? `index.html?book=${encodeURIComponent(w.bookKey)}&ch=${encodeURIComponent(w.chapter)}&verse=${encodeURIComponent(w.verse)}&panel=study`
                : '';
            const sub = hasLoc
                ? `${_refTitle(w.bookKey, Number(w.chapter), Number(w.verse))}`
                : _T('ui.locationUnknown', '節不明');
            return _listItemCard({ title: w.lemma || '', sub, meta: _listMetaDate(w.timestamp), href });
        }).join('')
        : `<p class="list-item-empty">${_T('ui.noRecentWords', '最近見た単語はまだありません。')}</p>`;

    const html = `
        <div class="static-page list-page">
            <section>
                ${rowsHtml}
            </section>
        </div>
    `;
    app.innerHTML = html;
}

/* 現在の book/chapter/verse が pericope の冒頭節（verseStart 一致）なら Hint を返す。無ければ null。 */
function _getReadingHintForVerse(bookKey, chapter, vNum) {
    if (!_readingHintIndex) return null;
    const list = _readingHintIndex.get(bookKey + '|' + chapter);
    if (!list) return null;
    const v = parseInt(vNum, 10);
    return list.find(h => parseInt(h.verseStart, 10) === v) || null;
}
/* ── Reading Hint Popover（本文位置を崩さない fixed カード。単一で使い回す） ── */
let _readingHintPopoverEl = null;
let _readingHintPopoverBtn = null;
function _closeReadingHintPopover() {
    if (_readingHintPopoverEl) { _readingHintPopoverEl.remove(); _readingHintPopoverEl = null; }
    if (_readingHintPopoverBtn) { _readingHintPopoverBtn.setAttribute('aria-expanded', 'false'); _readingHintPopoverBtn = null; }
    document.removeEventListener('keydown', _readingHintPopoverKeydown, true);
    document.removeEventListener('click', _readingHintPopoverOutside, true);
}
function _readingHintPopoverKeydown(e) { if (e.key === 'Escape') _closeReadingHintPopover(); }
function _readingHintPopoverOutside(e) {
    if (_readingHintPopoverEl && !_readingHintPopoverEl.contains(e.target)
        && (!_readingHintPopoverBtn || !_readingHintPopoverBtn.contains(e.target))) {
        _closeReadingHintPopover();
    }
}
function _toggleReadingHintPopover(btn, hintText, rangeText) {
    if (_readingHintPopoverBtn === btn) { _closeReadingHintPopover(); return; } /* 再クリックで閉じる */
    _closeReadingHintPopover();
    const pop = document.createElement('div');
    pop.className = 'reading-hint-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', '読書ヒント');
    const title = document.createElement('div');
    title.className = 'reading-hint-popover-title';
    title.textContent = '読書ヒント';
    pop.appendChild(title);
    if (rangeText) { /* 対象範囲（verseStart–verseEnd）を hintText の前に控えめに表示 */
        const range = document.createElement('div');
        range.className = 'reading-hint-popover-range';
        range.textContent = rangeText;
        pop.appendChild(range);
    }
    const body = document.createElement('div');
    body.className = 'reading-hint-popover-text';
    body.textContent = hintText; /* hintText のみ。Greek/lemma/数値/ラベルは出さない */
    pop.appendChild(body);
    document.body.appendChild(pop); /* DOM 最上位に置き z-index 競合を避ける（本文位置は不変） */
    /* ボタン基準で配置。画面端は内側へ寄せる */
    const r = btn.getBoundingClientRect();
    let left = r.right - pop.offsetWidth;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    if (top + pop.offsetHeight > window.innerHeight - 8) top = r.top - pop.offsetHeight - 6;
    if (top < 8) top = 8;
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
    _readingHintPopoverEl = pop;
    _readingHintPopoverBtn = btn;
    btn.setAttribute('aria-expanded', 'true');
    /* 開いた瞬間のクリックで即閉じしないよう次tickで購読（capture で確実に拾う） */
    setTimeout(() => {
        document.addEventListener('keydown', _readingHintPopoverKeydown, true);
        document.addEventListener('click', _readingHintPopoverOutside, true);
    }, 0);
}
/* ヒントがある節のみ、既存の節番号(.v-num)自体を Reading Hint の入口(Verse Anchor)にする。
   DOMは一切追加せず、本文開始位置・節番号幅・行送りを変えない。
   将来は同じ Verse Anchor から Passage Note / Reading Memo / Original Text / Share 等へ拡張可能。 */
function _appendReadingHint(block, vNum, _bookKeyHint, _chHint) {
    try {
        if (!block) return;
        const bookKey = _bookKeyHint != null ? _bookKeyHint : (AppState.location.book ? AppState.location.book.key : '');
        const chapter = _chHint  != null ? _chHint  : AppState.location.chapter;
        if (!bookKey || chapter == null) return;
        const hint = _getReadingHintForVerse(bookKey, chapter, vNum);
        if (!hint || !hint.hintText) return;
        const vnumEl = block.querySelector('.v-num');
        if (!vnumEl) return;
        vnumEl.classList.add('verse-anchor');
        vnumEl.setAttribute('role', 'button');
        vnumEl.setAttribute('tabindex', '0');
        vnumEl.setAttribute('aria-expanded', 'false');
        vnumEl.setAttribute('aria-label', vNum + '節の読書ヒントを開く');
        vnumEl.setAttribute('data-reading-hint', hint.id || '');
        const hintText = hint.hintText;
        /* 対象範囲：verseStart/verseEnd（既存フォーマット）から生成。同一節は「対象：N節」、範囲は「対象：S–E節」。 */
        const vs = parseInt(hint.verseStart, 10);
        const ve = parseInt(hint.verseEnd, 10);
        const rangeText = isFinite(vs)
            ? '対象：' + (isFinite(ve) && ve !== vs ? vs + '–' + ve : vs) + '節'
            : '';
        /* stopPropagation で節選択(.jp-section/verse-block の onclick)を発火させない */
        vnumEl.addEventListener('click', (e) => { e.stopPropagation(); _toggleReadingHintPopover(vnumEl, hintText, rangeText); });
        vnumEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); _toggleReadingHintPopover(vnumEl, hintText, rangeText); }
        });
    } catch (_) { /* 失敗しても本文表示は不変 */ }
}

