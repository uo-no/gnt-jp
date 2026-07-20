/**
 * reading-engine.js — Reading Engine v2
 *
 * 目的: bible_data トークンの decoded フィールドを使って、
 *       ギリシャ語構造を反映した日本語グロスを段階的に生成する。
 *
 * インターフェース:
 *   resolve(token, context?) → ResolveResult | null
 *     null = 改善なし → 呼び出し元が w.japanese にフォールバック
 *
 * ResolveResult:
 *   { japanese: string, source: ResolveSource, confidence?: number, candidates?: string[] }
 *   .japanese は後方互換のため常に存在する。
 *
 * ResolveSource（列挙値）:
 *   'morph'    — Phase 1: 形態情報（case / mood / tense / voice）
 *   'syntax'   — Phase 2: 統語構造（SyntaxAnalyzer 注入）
 *   'particle' — Phase 3: 助詞の構造依存選択
 *   'lexicon'  — Phase 4: 語彙情報（_lexiconData）
 *   'semantic' — Phase 5: 文脈依存の多義語選択
 *   'phrase'   — Phase 6: 句レベルのレンダリング
 *   'policy'   — Phase 7: Reading Policy（Wallace 分類）
 *   'fallback' — 生成できない場合（null を返すので通常は使用しない。監査用）
 *
 * 設計原則:
 *   - morph 文字列を自前でパースしない（decoded フィールドを直接使う）
 *   - SyntaxAnalyzer は直接呼ばない（解析結果を context で受け取る）
 *   - 副作用なし・例外は null で吸収
 *   - 表示責務は呼び出し元が持つ
 *
 * ══════════════════════════════════════════════════════════════════
 * 凍結状況（変更時は対応する回帰テストへのケース追加が必須）
 *
 * Phase 1: Morphology Core   [FROZEN 2026-07-16]
 *   基準値: NT 137,741 tokens / morph 44,591 / 悪化ケース 0
 *   対象: _VERB_RULES / _CASE_PARTICLE / _PARTICLE_SKIP_GLOSSES /
 *         _resolveMorph とそのガード群
 *   検証: npm run test:re-phase1
 *   ※ 旧 _PASSIVE_SKIP_LEMMAS は Phase 4-A で ReadingLexicon へ移管
 *     （凍結プロトコル適用・基準値不変で挙動等価を検証済み）
 *
 * Phase 2-A: Syntax Layer    [FROZEN 2026-07-16]
 *   基準値: 2-A 分 3,210 件 / 悪化ケース 0
 *   対象: _PREP_PARTICLE / _EN_DATIVE_LEMMAS / _AGENT_PREP / _resolveSyntax
 *   検証: npm run test:re-phase2
 *
 * Phase 2-B: 前置詞テーブル拡張 [FROZEN 2026-07-16]
 *   基準値: 2-B 分 +1,056 件（syntax 総計 4,266）/ 悪化ケース 0
 *   対象: _PREP_PARTICLE_2B
 *   検証: npm run test:re-phase2
 *   拡張は常に追加方式（既存テーブルのエントリ変更は不可）。
 *
 * Phase 3-A: Particle Engine [FROZEN 2026-07-16]
 *   基準値: particle 3,131 件（は 2,225 / が 906）/ 悪化ケース 0
 *   対象: _resolveParticle / _COPULA_LEMMAS / _FINITE_MOODS
 *   検証: npm run test:re-phase3
 *   範囲は主格 noun/pron のみ。対格・与格は Phase 1 の責務。
 *   コプラ節・述語主格は Phase 5 Semantic / Reading Policy 領域。
 *
 * Phase 4-A: Lexicon Layer   [2026-07-16 実装]
 *   対象: setLexicon / _passiveAllowed（ReadingLexicon は core/reading-lexicon.js）
 *   データ: assets/data/reading-lexicon-data.js（lemmaId キー）
 *   劣化モード: lexicon 未注入 → 受動変換を全面スキップ（安全側）
 *   検証: npm run test:re-phase1（lexicon 注入・劣化モード両方の回帰を含む）
 *
 * Phase 5-A: Semantic Layer  [FROZEN 2026-07-17]
 *   基準値: 5-A 分 299 件（8 慣用句）/ 悪化ケース 0
 *   対象: _resolveSemantic の idiom 照合 / _idiomItemMatch / setSemanticData
 *   検証: npm run test:re-phase5
 *   完全一致のみ・推論禁止・不成立は必ず null → 既存チェーン。
 *
 * Phase 5-B: prepDomain    [FROZEN 2026-07-17]
 *   基準値: 5-B 分 +60 件（semantic 総計 359: πρός+人/固有名→のもとに 55 /
 *            περί+身体→の周りに 5）/ 悪化ケース 0
 *   対象: _resolvePrepDomain / _domainNumber
 *   データ: reading-semantic-data.js の prepDomain（exclude で用法例外を保護）
 *   検証: npm run test:re-phase5
 *   ἐπί 全般・ἐν+場所は監査で不採用（誤変換リスク。データ側コメント参照）。
 *
 * Phase 5-D: lnGloss      [FROZEN 2026-07-17]
 *   基準値: semantic-ln 106 件（semantic 総計 465 = idiom 299 + prep 60 + ln 106）
 *   対象: setLnGlossData / getLnAssist / _resolveLnGloss
 *   データ: assets/data/reading-ln-final-data.js（replace 区画のみ置換。
 *           assist は getLnAssist 参照のみ・UI 未使用。curation は
 *           reading-ln-curation.js → npm run build:ln-final で反映）
 *   検証: npm run test:re-phase5 + 実表示監査
 *         （scripts/re-phase5d-display-audit.cjs・600 節）
 *   判定基準: docs/reading-flow-gloss-policy.md（replace/assist/preserve）
 *
 * Phase 6 以降は semantic データ・照合種別を追加方式で拡張する。
 * 凍結済みコードには触れない。
 * ══════════════════════════════════════════════════════════════════
 */

'use strict';

const READING_ENGINE_VERSION = '2.7.0-semantic-ln';

// ── ResolveSource 列挙値 ──────────────────────────────────────────
// 将来 Phase が追加されてもここに追記するだけでよい。
const ResolveSource = Object.freeze({
    MORPH:    'morph',
    SYNTAX:   'syntax',
    PARTICLE: 'particle',
    LEXICON:  'lexicon',
    SEMANTIC: 'semantic',
    PHRASE:   'phrase',
    POLICY:   'policy',
    FALLBACK: 'fallback',
});

// ── Phase 1: 動詞形態変換ルール ───────────────────────────────────
const _VERB_RULES = {
    // 現在分詞。一段/五段は仮名の段で判別する（2026-07-17 修正 —
    // 旧 [^ん]る→ながら は五段で「語ながら」「なながら」等のイ音便欠落を
    // 生成していた。part-aor / imp と同じ設計:
    // 一段=ながら / 五段=りながら / 判別不能な漢字語幹+る は fallback）。
    'part-pres': [
        [/する$/, 'しながら'], [/くる$/, 'きながら'], [/ある$/, 'ありながら'],
        // 一段確定（い段・え段かな + る）→ ながら
        [/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/, '$1ながら'],
        // 頻出一段・不規則（漢字語幹）
        [/(見|得|出|着|来)る$/, '$1ながら'],
        // 五段確定（あ・う・お段かな + る）→ りながら（なる→なりながら）
        [/([あかさたなはまやわらがざだばぱうすつぬふむゆぐずぶおこそとのほもよろごぞどぼ])る$/, '$1りながら'],
        [/つ$/, 'ちながら'], [/ぬ$/, 'にながら'], [/む$/, 'みながら'],
        [/ぶ$/, 'びながら'], [/う$/, 'いながら'], [/く$/, 'きながら'],
        [/す$/, 'しながら'], [/ぐ$/, 'ぎながら'],
    ],
    // アオリスト分詞。一段/五段は仮名の段で判別する（2026-07-17 修正 —
    // 旧 [^ん]る→た は五段で促音欠落「なた」「知た」を生成していた。
    // 命令形 imp と同じ設計: 判別できない漢字語幹+る は fallback）。
    'part-aor': [
        [/する$/, 'した'],     [/くる$/, 'きた'],
        // 一段確定（い段・え段かな + る）→ た
        [/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/, '$1た'],
        // 頻出一段・不規則（漢字語幹）
        [/(見|得|出|着|来)る$/, '$1た'],
        // 五段確定（あ・う・お段かな + る）→ った（なる→なった）
        [/([あかさたなはまやわらがざだばぱうすつぬふむゆぐずぶおこそとのほもよろごぞどぼ])る$/, '$1った'],
        [/つ$/, 'った'],       [/ぬ$/, 'んだ'], [/む$/, 'んだ'], [/ぶ$/, 'んだ'],
        [/う$/, 'った'],       [/く$/, 'いた'], [/す$/, 'した'], [/ぐ$/, 'いだ'],
    ],
    // 完了分詞（part-aor と同じ一段/五段判別）
    'part-perf': [
        [/する$/, 'してきた'], [/くる$/, 'きてきた'],
        [/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/, '$1てきた'],
        [/(見|得|出|着|来)る$/, '$1てきた'],
        [/([あかさたなはまやわらがざだばぱうすつぬふむゆぐずぶおこそとのほもよろごぞどぼ])る$/, '$1ってきた'],
        [/つ$/, 'ってきた'],   [/む$/, 'んできた'],
    ],
    'inf': [
        [/する$/, 'すること'], [/いる$/, 'いること'], [/える$/, 'えること'],
        [/くる$/, 'くること'],
        [/([^ん])る$/, '$1ること'],
        [/つ$/, 'つこと'],    [/ぬ$/, 'ぬこと'], [/む$/, 'むこと'], [/ぶ$/, 'ぶこと'],
        [/う$/, 'うこと'],    [/く$/, 'くこと'], [/す$/, 'すこと'],
    ],
    // 命令形。壊れた日本語を出さないことを最優先とする（Phase 1 監査 P1）。
    //   - る動詞は仮名の段で一段/五段を判別できる場合のみ変換する
    //     （一段=え段・い段かな+る → 〜よ / 五段=あ段・お段かな等+る → 〜れ）
    //   - 語幹が漢字の「〜る」は判別不能 → 頻出一段のみ個別対応、他は fallback
    //   - る以外の五段語尾（く/す/つ等）は語幹に関係なく確定的なので変換する
    'imp': [
        [/する$/, 'せよ'],
        // 一段確定: え段・い段かな + る（求めよ・食べよ・用いよ）
        [/([えけせてねへめれげぜでべぺいきしちにひみりぎじびぴ])る$/, '$1よ'],
        // 頻出一段（漢字語幹）
        [/(見|得|出)る$/, '$1よ'],
        // 五段確定: あ段・う段・お段かな + る（なれ・あれ）
        // ※「く」は除外（来る/くる の不規則活用を誤変換しないため）
        [/([あかさたなはまやわらがざだばぱうすつぬふむゆるぐずぶおこそとのほもよろごぞどぼ])る$/, '$1れ'],
        // 五段語尾（漢字語幹でも確定的）
        [/く$/, 'け'], [/ぐ$/, 'げ'], [/す$/, 'せ'], [/つ$/, 'て'],
        [/ぬ$/, 'ね'], [/ぶ$/, 'べ'], [/む$/, 'め'], [/う$/, 'え'],
    ],
    'pass': [
        [/する$/, 'される'],  [/いる$/, 'いられる'],
        [/([^ん])る$/, '$1られる'],
        [/つ$/, 'たれる'],    [/む$/, 'まれる'],
        [/ぶ$/, 'ばれる'],    [/く$/, 'かれる'], [/す$/, 'される'],
    ],
};

// 名詞・代名詞の格助詞（主格は無標）
const _CASE_PARTICLE = {
    'genitive':   'の',
    'dative':     'に',
    'accusative': 'を',
    'vocative':   'よ',
};

// base 末尾が助詞で終わる代名詞（「これらの」等）への二重付与防止
const _TRAILING_PARTICLES = new Set(['の', 'に', 'を', 'よ']);

// 助詞を付与できないグロス（付けると日本語が壊れる）。
// τις「ある」→「あるを」「あるの」等の破損防止（Phase 2 監査で発見・
// 凍結プロトコルに従い回帰ケース追加のうえ修正）。
const _PARTICLE_SKIP_GLOSSES = new Set(['ある']);

// ── Morph Rule Registry（lemma 単位・strong キー）──────────────────
// J-3: αὐτός(G846)の gender/number 語幹選択。Data 代表語「彼」を起点に、
// 形態情報だけで語幹を分岐する（設計: docs/alphautos-morph-rule-design.md /
// docs/morph-rule-engine-implementation-spec.md）。
//   base（= Data 代表語）が rule.base と一致する時のみ発火する。これにより、
//   Semantic（lnGloss 等）が別の語を代入した token では Morph が語を上書きせず、
//   「Semantic > Morph」の優先関係を保つ。
//   intensive / identity（自身・同じ・まさに）は Semantic の責務であり本 Rule の
//   対象外（gender/number では区別できないため）。
// 追加・変更時は必ず scripts/re-phase1-regression.cjs に回帰ケースを足し、
// npm run test:re-phase1 全 PASS を確認すること（Phase 1 FROZEN プロトコル）。
const _MORPH_STEM_RULES = {
    'G846': {
        base: '彼',
        stems: {
            'masculine|singular': '彼',
            'masculine|plural':   '彼ら',
            'feminine|singular':  '彼女',
            'feminine|plural':    '彼女たち',
            'neuter|singular':    'それ',
            'neuter|plural':      'それら',
        },
    },
    // J-5: τίς(疑問詞・G5101)。gender で人/事物を分岐する。
    // masculine=人→誰（Data 代表語のまま）/ neuter=事物→何（主変換）。
    // feminine は stems に登録しない → _morphStem の `|| base` で「誰」のまま
    // （女性名詞への一致で人/物が referent 依存のため Semantic の責務。J-5 では変更しない）。
    // number は τίς の語幹をほぼ変えないため単複とも同一語幹。
    // why→なぜ / which→どれ・どの は Semantic が「何」を上書き（Semantic > Morph）。
    // 設計: docs/tis-morph-rule-design.md。
    'G5101': {
        base: '誰',
        stems: {
            'masculine|singular': '誰',
            'masculine|plural':   '誰',
            'neuter|singular':    '何',
            'neuter|plural':      '何',
        },
    },
};

// Morph Rule Registry による語幹選択。未登録 lemma・base 不一致・未定義の
// 形態組み合わせでは base をそのまま返す（既存挙動と完全同一・安全側 FB）。
function _morphStem(token, base) {
    const strong = (token.strong || '').replace(/^G0*/, 'G');
    const rule = _MORPH_STEM_RULES[strong];
    if (!rule || base !== rule.base) return base;
    const g = (token.gender || '').toLowerCase();
    const n = (token.number || '').toLowerCase();
    return rule.stems[g + '|' + n] || base;
}

// 受動変換スキップの語彙知識（デポネント・自動詞グロス）は Phase 4-A で
// ReadingLexicon（assets/data/reading-lexicon-data.js・lemmaId キー）へ
// 移管済み。engine は entry.deponent だけを参照する（_passiveAllowed）。
// 移管の挙動等価は 2026-07-16 の NT 全巻監査で基準値不変により検証済み。

function _applyRules(gloss, key) {
    for (const [pat, rep] of (_VERB_RULES[key] || [])) {
        if (pat.test(gloss)) return gloss.replace(pat, rep);
    }
    return gloss;
}

// ══════════════════════════════════════════════════════════════════
// Phase 2-A: Syntax Layer — 前置詞句の助詞決定
//                            [FROZEN 2026-07-16 / DO NOT MODIFY]
//
// Phase 2-A は NT 全巻監査済み・完了状態として固定（悪化ケース 0）。
// 基準値: syntax 3,210 件（εἰς 1,506 / ἐκ 766 / ἀπό 546 /
//          ἐν 146 / ὑπό 130 / σύν 116）
//
// 以下の定義（_PREP_PARTICLE / _EN_DATIVE_LEMMAS / _AGENT_PREP）と
// _resolveSyntax を変更する場合は必ず:
//   1. scripts/re-phase2-regression.cjs に回帰ケースを追加する
//   2. npm run test:re-phase2 全 PASS を確認する
//
// Phase 2-B 以降の拡張は既存エントリを変更せず「追加方式」で行う
// （新テーブル・新ホワイトリストの追加は可。既存 6 エントリの変更は不可）。
//
// 対象は「前置詞 lemma × 格 だけで意味を固定できる」組み合わせのみ。
// 多義的な前置詞（ἐπί・πρός・παρά+対格 等）はテーブルに入れず
// fallback する（Phase 1 と同じ安全原則:
// 改善できる場合のみ生成し、悪化する場合は fallback する）。
// ══════════════════════════════════════════════════════════════════

// 前置詞 lemma × 目的語の格 → 助詞（無条件で安全な組み合わせのみ）
const _PREP_PARTICLE = {
    'ἐκ|genitive':    'から',
    'ἀπό|genitive':   'から',
    'εἰς|accusative': 'へ',
    'σύν|dative':     'と共に',
};

// ἐν + 与格「〜にあって」は目的語 lemma がこのリストの場合のみ適用する。
// ἐν は場所・手段・時など多義のため全件適用しない（Phase 2-A 制約）。
const _EN_DATIVE_LEMMAS = new Set(['Χριστός', 'κύριος', 'Ἰησοῦς', 'θεός']);

// 受動文の行為者: ὑπό + 属格 は節内に受動動詞がある場合のみ「〜によって」
const _AGENT_PREP = 'ὑπό';

// ══════════════════════════════════════════════════════════════════
// Phase 2-B: 前置詞テーブル拡張（追加方式 — Phase 2-A テーブルは不変更）
//                            [FROZEN 2026-07-16 / DO NOT MODIFY]
//
// 基準値: 2-B 追加分 1,056 件（διά|gen 351 / μετά|gen 336 / περί|gen 226 /
//          παρά|gen 78 / μετά|acc 35 / πρό|gen 30）。syntax 総計 4,266 件。
// 変更時は scripts/re-phase2-regression.cjs へ回帰ケース追加 →
// npm run test:re-phase2 全 PASS を確認すること。
//
// 採用基準は Phase 2-A と同じ「前置詞 lemma × 格 だけで意味を固定できる」
// もののみ。原因・理由・意味役割に依存する表現（διά+対格「のゆえに」・
// ἐπί 全般・παρά+与格/対格・περί+対格）は Phase 5 Semantic Layer の
// 領域として採用しない（2026-07-16 監査で判断）。
// Phase 2-C 以降の拡張も同様に新テーブル追加方式で行う。
// ══════════════════════════════════════════════════════════════════
const _PREP_PARTICLE_2B = {
    'μετά|genitive':   'と共に',
    'μετά|accusative': 'の後で',
    'περί|genitive':   'について',
    'πρό|genitive':    'の前に',
    'διά|genitive':    'を通して',
    'παρά|genitive':   'から',
};

// ══════════════════════════════════════════════════════════════════
// Phase 3-A: Particle Engine — 主格の は/が（最小実装）
//                            [FROZEN 2026-07-16 / DO NOT MODIFY]
//
// 基準値: particle 3,131 件（は 2,225 / が 906）/ 悪化ケース 0。
// 変更時は scripts/re-phase3-regression.cjs へ回帰ケース追加 →
// npm run test:re-phase3 全 PASS を確認すること。
//
// 対象は「構造情報だけで主語と確定できる主格 noun/pron」のみ。
// 対格→を・与格→に は Phase 1 Morphology の責務（凍結済み・変更しない）。
//
// 規則: 主節の主語 → は / 従属節の主語 → が（clause.subordinate のみで
// 決定。topicality 等の文脈判断は行わない — Phase 5 領域）。
//
// 除外（1つでも該当すれば fallback）:
//   - コプラ節（εἰμί/γίνομαι/ὑπάρχω）— 述語主格との区別は文脈判断のため
//     全面除外（NT 2,732件。Phase 5 Semantic / Reading Policy 領域）
//   - 節内に定形動詞なし / 動詞と人称・数が不一致
//   - PP 内 / NP の head でない / 節内に主語候補が複数（曖昧）
// ══════════════════════════════════════════════════════════════════
const _COPULA_LEMMAS = new Set(['εἰμί', 'γίνομαι', 'ὑπάρχω']);
const _FINITE_MOODS  = new Set(['indicative', 'subjunctive', 'imperative', 'optative']);

// ══════════════════════════════════════════════════════════════════
// Phase 5-A: Semantic Layer — 慣用句・固定表現（完全一致のみ）
//
// 設計原則（docs/reading-semantic.md）:
//   - 推論を行わない。照合するのは lemma 連鎖（NFC 正規化）と
//     形態制約（case/mood 等 = Macula の既存注釈）のみ
//   - テーブルは assets/data/reading-semantic-data.js（独立データ・
//     setSemanticData で注入。5-B/5-C も同ファイルに追加方式で拡張）
//   - 完全一致しなければ必ず null → 既存チェーンへ完全フォールバック
//   - 固定訳を表示するのはパターンの head 構成語のみ。
//     付随語（前置詞・冠詞）は既存表示のまま
// ══════════════════════════════════════════════════════════════════

/** 慣用句 seq の 1 項目とトークンの照合（完全一致・推論なし） */
function _idiomItemMatch(t, c) {
    if (!t || !c || typeof c.l !== 'string') return false;
    if ((t.lemma || '').normalize('NFC') !== c.l) return false;
    for (const k of ['case', 'gender', 'number', 'mood', 'tense', 'person']) {
        if (c[k] && (t[k] || '') !== c[k]) return false;
    }
    return true;
}

// ══════════════════════════════════════════════════════════════════
// Phase 5-B: Semantic Layer — 前置詞 × 格 × 目的語 domain（追加方式）
//
// Macula の token.domain（Louw-Nida ドメイン注釈）だけで意味を固定できる
// 組み合わせをテーブル照合する。推論は行わない。
// テーブルは reading-semantic-data.js の prepDomain セクション。
// 不一致は null → 5-A 後続チェーン（syntax/morph/particle）へ。
// ══════════════════════════════════════════════════════════════════

/**
 * domain コード → LN ドメイン番号。
 * コードは桁数不統一（'93001' と '033005'）のため「末尾 3 桁がサブ
 * ドメイン」として正規化する（docs/reading-semantic.md 監査で確定）。
 * 複数コードはスペース区切りの先頭を使う。不正は null。
 */
function _domainNumber(domain) {
    if (!domain) return null;
    const s = String(domain).split(' ')[0];
    if (!/^[0-9]+$/.test(s)) return null;
    return s.length > 3 ? parseInt(s.slice(0, -3), 10) : parseInt(s, 10);
}

// ── ReadingEngine ─────────────────────────────────────────────────
class ReadingEngine {
    constructor() {
        // Phase 4-A: ReadingLexicon（未注入 = null → 劣化モード）
        this._lexicon = null;
        // Phase 5-A: Semantic データ（未注入 = null → semantic 層は不活性）
        this._semantic = null;
        // Phase 5-D: LN 最終辞書（未注入 = null → lnGloss 照合は不活性）
        this._lnGloss = null;
    }

    /**
     * Semantic データ（reading-semantic-data.js の内容）を注入する（Phase 5-A）。
     * アプリ全体で共通のためインスタンスへ注入する。未注入の間は
     * semantic 層が不活性（既存チェーンと完全同一動作）。
     * @param {Object} data  { version, idioms: [...] }
     */
    setSemanticData(data) {
        this._semantic = (data && typeof data === 'object' && Array.isArray(data.idioms))
            ? data : null;
    }

    /**
     * LN 最終辞書（reading-ln-final-data.js の内容）を注入する（Phase 5-D-1）。
     * jaWord 置換に使うのは replace 区画のみ。assist 区画は getLnAssist() で
     * 参照可能だが表示には使わない（Phase 5-D-5: UI 未使用）。
     * 未注入 = 劣化モード（lnGloss 照合は不活性・既存チェーンと同一動作）。
     * @param {Object} data  { version, replace: {...}, assist: {...}, auto: {...} }
     */
    setLnGlossData(data) {
        this._lnGloss = (data && typeof data === 'object' &&
                         data.replace && typeof data.replace === 'object')
            ? data : null;
    }

    /**
     * assist 区画の参照（Phase 5-D-5）。jaWord は置換しない。
     * StudyPanel の補助表示（将来）向け。現時点で UI 未使用。
     * @returns {string|null} assist gloss
     */
    getLnAssist(token) {
        try {
            if (!this._lnGloss || !this._lnGloss.assist || !token) return null;
            const ln = (typeof token.ln === 'string' && token.ln)
                ? token.ln.split(' ')[0] : null;
            if (!ln || !token.lemmaId) return null;
            return this._lnGloss.assist[token.lemmaId]?.[ln] ?? null;
        } catch (_) {
            return null;
        }
    }

    /**
     * ReadingLexicon を注入する（Phase 4-A）。
     * lexicon はアプリ全体で共通のため、ResolveContext ではなく
     * インスタンスへ注入する。未注入の間は劣化モード
     * （受動変換を全面スキップ = 安全側）で動作する。
     * @param {ReadingLexicon} lexicon
     */
    setLexicon(lexicon) {
        this._lexicon = (lexicon && typeof lexicon.lookup === 'function') ? lexicon : null;
    }

    /**
     * 受動変換を行ってよい token か（Phase 4-A）。
     *   - lexicon 未注入 → false（劣化モード: 意味を壊さないことを最優先）
     *   - entry.deponent === true → false（デポネント・自動詞グロス）
     *   - 未登録 lemmaId → true（通常の受動変換）
     */
    _passiveAllowed(token) {
        if (!this._lexicon) return false;
        const entry = this._lexicon.lookup(token.lemmaId);
        return !(entry && entry.deponent === true);
    }

    /**
     * @param {Object} token    bible_data トークン（decoded フィールドを持つ）
     * @param {Object} [context] ResolveContext（Phase 2 以降で使用）
     *   context.tokens       — 節の全トークン
     *   context.targetIdx    — 対象語インデックス
     *   context.syntaxResults — SyntaxAnalyzer.analyzeAll() 結果（注入）
     *   context.projection   — ReadingSupportProjection（注入）
     *   context.lexicon      — _lexiconData（注入）
     * @returns {{ japanese: string, source: string, confidence?: number, candidates?: string[] } | null}
     */
    resolve(token, context) {
        try {
            return this._resolveUnsafe(token, context);
        } catch (_) {
            return null;
        }
    }

    _resolveUnsafe(token, _context) {
        if (!token || typeof token !== 'object') return null;

        const base = token.japanese;
        if (!base || base === '—' || base === '-' || base === '読み込んでいます...') return null;

        // Phase 5-A: Semantic（最上位 — 慣用句は syntax より優先。
        // εἰς τὸν αἰῶνα は syntax「世へ」より慣用句「永遠に」が正しい）。
        // context・semantic データの両方が揃った時のみ活性。
        // 不発時は既存チェーンと完全同一 = 凍結保証は Phase 2/3 と同じ機構。
        if (_context && this._semantic) {
            const semResult = this._resolveSemantic(token, _context);
            if (semResult) return semResult;
        }

        // Phase 5-D: lnGloss（semantic 第 3 照合 — idiom / prepDomain 不発時のみ
        // 到達する。優先順位: idiom → prepDomain → lnGloss → syntax → …）。
        // 未注入（劣化モード）では不活性 = 既存チェーンと完全同一。
        if (_context && this._lnGloss) {
            const lnResult = this._resolveLnGloss(token, _context);
            if (lnResult) return lnResult;
        }

        // Phase 2-A: Syntax（context が注入された時のみ活性。
        // context なしの呼び出しは Phase 1 と完全に同じ動作 = 凍結基準を守る）
        if (_context) {
            const synResult = this._resolveSyntax(token, base, _context);
            if (synResult) return synResult;
        }

        // Phase 1: Morphology [FROZEN]
        const morphResult = this._resolveMorph(token, base);
        if (morphResult) return morphResult;

        // Phase 3-A: Particle（morph が null を返す主格だけが到達する
        // ギャップフィラー。context なしでは不活性 = Phase 1 互換）
        if (_context) {
            const particleResult = this._resolveParticle(token, base, _context);
            if (particleResult) return particleResult;
        }

        // Phase 4+ はここに追加（注入された context を使う）

        return null;
    }

    // ── Phase 3-A: Particle Engine（主格の は/が） ──────────────────
    // context は呼び出し側が ContextBuilder から抽出した純粋データ:
    //   { tokens, targetIdx, phrases, mainVerb, clause }
    // 6 フィルタ（定形動詞・非コプラ・PP外・NP head・一致・候補唯一）を
    // すべて通過した場合のみ付与する。1つでも欠ければ null → fallback。
    _resolveParticle(token, base, context) {
        const cls = (token.class || '').toLowerCase();
        if (cls !== 'noun' && cls !== 'pron') return null;
        if ((token.case || '').toLowerCase() !== 'nominative') return null;

        const { tokens, targetIdx, phrases, mainVerb, clause } = context;
        if (!Array.isArray(tokens) || !Number.isInteger(targetIdx)) return null;
        if (tokens[targetIdx] !== token || !Array.isArray(phrases)) return null;
        if (!mainVerb || !clause) return null;

        // ガード: 共通（末尾助詞・付与不可グロス）+ particle 層専用の末尾「も」
        // （「あれも」+ は/が → あれもは/あれもが の破損防止）
        if (_TRAILING_PARTICLES.has(base.slice(-1)) && !/もの$/.test(base)) return null;
        if (_PARTICLE_SKIP_GLOSSES.has(base)) return null;
        if (base.slice(-1) === 'も') return null;

        // 定形動詞・非コプラ
        if (!_FINITE_MOODS.has((mainVerb.mood || '').toLowerCase())) return null;
        if (_COPULA_LEMMAS.has(mainVerb.lemma || '')) return null;

        // PP 外
        if (phrases.some(p => p.type === 'PP' && targetIdx >= p.start && targetIdx <= p.end)) {
            return null;
        }

        // NP の head であること（NP 外の単独主格は head 扱い）
        const np = phrases.find(p =>
            p.type === 'NP' && targetIdx >= p.start && targetIdx <= p.end);
        if (np && np.head !== targetIdx) return null;

        // 動詞との人称・数の一致（名詞主語は3人称動詞と一致）
        const vp = mainVerb.person || '';
        const vn = mainVerb.number || '';
        const tp = token.person || '';
        if (tp && vp && tp !== vp) return null;
        if (!tp && vp && vp !== '3') return null;
        if (token.number && vn && token.number !== vn) return null;

        // 節内の主語候補が唯一であること（複数 = 曖昧 → fallback）
        const start = Number.isInteger(clause.start) ? clause.start : 0;
        const end   = Number.isInteger(clause.end)
            ? Math.min(clause.end, tokens.length - 1) : tokens.length - 1;
        let candidates = 0;
        for (let j = start; j <= end; j++) {
            const w = tokens[j];
            const wc = (w?.class || '').toLowerCase();
            if ((wc !== 'noun' && wc !== 'pron') || (w.case || '') !== 'nominative') continue;
            const wnp = phrases.find(p => p.type === 'NP' && j >= p.start && j <= p.end);
            if (wnp && wnp.head !== j) continue;
            if (phrases.some(p => p.type === 'PP' && j >= p.start && j <= p.end)) continue;
            candidates++;
        }
        if (candidates !== 1) return null;

        const particle = clause.subordinate === true ? 'が' : 'は';
        return { japanese: base + particle, source: ResolveSource.PARTICLE };
    }

    // ── Phase 5-A: Semantic Layer（慣用句・完全一致のみ） ───────────
    // context から使うのは tokens / targetIdx のみ（設計制約）。
    // 対象トークンがパターンの head 位置にある場合だけ固定訳を返す。
    // 完全一致しなければ必ず null（既存チェーンへフォールバック）。
    _resolveSemantic(token, context) {
        const { tokens, targetIdx } = context;
        if (!Array.isArray(tokens) || !Number.isInteger(targetIdx)) return null;
        if (tokens[targetIdx] !== token) return null;

        for (const idiom of this._semantic.idioms) {
            if (!idiom || !Array.isArray(idiom.seq) || typeof idiom.ja !== 'string') continue;
            const head  = Number.isInteger(idiom.head) ? idiom.head : 0;
            const start = targetIdx - head;
            if (start < 0 || start + idiom.seq.length > tokens.length) continue;

            let ok = true;
            for (let k = 0; k < idiom.seq.length; k++) {
                if (!_idiomItemMatch(tokens[start + k], idiom.seq[k])) { ok = false; break; }
            }
            if (!ok) continue;

            // διὰ παντός 型の除外: パターン直後が属格名詞なら
            // 「διὰ πάσης＋名詞」の修飾構造であり慣用句ではない
            if (idiom.notNextGenNoun) {
                const nx = tokens[start + idiom.seq.length];
                if (nx && (nx.class || '') === 'noun' && (nx.case || '') === 'genitive') continue;
            }

            return { japanese: idiom.ja, source: ResolveSource.SEMANTIC };
        }

        // ── Phase 5-B: prepDomain（追加方式 — 慣用句不成立時のみ） ──
        if (Array.isArray(this._semantic.prepDomain)) {
            const pd = this._resolvePrepDomain(token, tokens, targetIdx);
            if (pd) return pd;
        }

        return null;
    }

    // ── Phase 5-B: 前置詞 × 格 × 目的語 domain の照合 ────────────────
    // 使うのは token.domain / tokens / targetIdx のみ（設計制約）。
    // 対象語の直前（冠詞・形容詞を最大 2 語スキップ）に支配前置詞が
    // ある場合だけ照合する。不一致は null → 後続チェーンへ。
    _resolvePrepDomain(token, tokens, targetIdx) {
        const cls = (token.class || '').toLowerCase();
        if (cls !== 'noun' && cls !== 'pron') return null;

        const base = token.japanese;
        // ガード: 既存共通（末尾助詞・付与不可グロス）
        if (_TRAILING_PARTICLES.has(base.slice(-1)) && !/もの$/.test(base)) return null;
        if (_PARTICLE_SKIP_GLOSSES.has(base)) return null;

        // 支配前置詞の探索（後方 3 語以内・介在は det/adj のみ）
        let prepTok = null;
        for (let j = targetIdx - 1, steps = 0; j >= 0 && steps < 3; j--, steps++) {
            const c = (tokens[j]?.class || '').toLowerCase();
            if (c === 'det' || c === 'adj') continue;
            if (c === 'prep') prepTok = tokens[j];
            break;
        }
        if (!prepTok) return null;

        const prepLemma = (prepTok.lemma || '').normalize('NFC');
        const kase      = (token.case || '').toLowerCase();
        const dom       = _domainNumber(token.domain);
        if (dom === null) return null;

        const tokenLemma = (token.lemma || '').normalize('NFC');
        for (const rule of this._semantic.prepDomain) {
            if (!rule || typeof rule.ja !== 'string') continue;
            if (rule.prep !== prepLemma || rule.case !== kase || rule.domain !== dom) continue;
            if (Array.isArray(rule.exclude) && rule.exclude.includes(tokenLemma)) continue;
            return { japanese: base + rule.ja, source: ResolveSource.SEMANTIC };
        }
        return null;
    }

    // ── Phase 5-D: lnGloss（(lemmaId, token.ln) → キュレーション済み flow gloss）──
    // 「意味を推論する層」ではなく「確定済みの対応表を読み出す層」。
    // 照合条件: token.lemmaId + token.ln（先頭コード）が replace 区画に存在
    // すること（= mode='replace' の curation のみ。assist は置換しない）。
    //
    // ★ 設計判断: 素の gloss 置換ではなく「base の置換」として実装し、
    //   置換後の gloss を既存チェーン（syntax → morph → particle）に通す。
    //   これにより格助詞・前置詞句が維持される:
    //     ἐκ τοῦ κόσμου（41.38）: 世界から → 世から（○）/ 素置換なら 世（✗ 劣化）
    //     λόγον ἀποδώσουσιν:      ことばを → 申し開きを（○）
    //   既存レイヤーは base 引数を取る読み取り専用の再利用（凍結部の変更なし）。
    _resolveLnGloss(token, context) {
        const ln = (typeof token.ln === 'string' && token.ln)
            ? token.ln.split(' ')[0] : null;
        if (!ln || !token.lemmaId) return null;
        const gloss = this._lnGloss.replace[token.lemmaId]?.[ln];
        if (typeof gloss !== 'string' || !gloss) return null;

        // 置換後の base を既存チェーンへ（結果の source は semantic に統一）
        const syn = this._resolveSyntax(token, gloss, context);
        if (syn) return { japanese: syn.japanese, source: ResolveSource.SEMANTIC };
        const mor = this._resolveMorph(token, gloss);
        if (mor) return { japanese: mor.japanese, source: ResolveSource.SEMANTIC };
        const par = this._resolveParticle(token, gloss, context);
        if (par) return { japanese: par.japanese, source: ResolveSource.SEMANTIC };
        return { japanese: gloss, source: ResolveSource.SEMANTIC };
    }

    // ── Phase 2-A: Syntax Layer（前置詞句・PP 内属格・受動の行為者） ──
    // context は呼び出し側が ContextBuilder.build() から抽出した純粋データ:
    //   { tokens, targetIdx, phrases, hasPassiveVerb }
    // 成功時のみ ResolveResult を返す。該当なし・入力不備は null で
    // Morphology へ fallback する。
    _resolveSyntax(token, base, context) {
        const { tokens, targetIdx, phrases, hasPassiveVerb } = context;
        if (!Array.isArray(tokens) || !Number.isInteger(targetIdx)) return null;
        if (!Array.isArray(phrases) || tokens[targetIdx] !== token) return null;

        // 対象語が PP の head（前置詞の目的語）である場合のみ扱う
        const pp = phrases.find(p =>
            p.type === 'PP' && p.head === targetIdx && p.start !== p.head);
        if (!pp) return null;

        const prepLemma = tokens[pp.start]?.lemma || '';
        const kase      = (token.case || '').toLowerCase();
        if (!prepLemma || !kase) return null;

        // ガード: base が既に助詞で終わるグロスには付与しない（Phase 1 P2 と同基準）
        if (_TRAILING_PARTICLES.has(base.slice(-1)) && !/もの$/.test(base)) return null;
        // ガード: 助詞を付与できないグロス（「ある」等）
        if (_PARTICLE_SKIP_GLOSSES.has(base)) return null;

        let particle = null;

        // 受動文の行為者: ὑπό + 属格 + 節内に受動動詞
        if (prepLemma === _AGENT_PREP && kase === 'genitive') {
            if (hasPassiveVerb === true) particle = 'によって';
        }
        // ἐν + 与格: ホワイトリスト lemma のみ「にあって」
        else if (prepLemma === 'ἐν' && kase === 'dative') {
            if (_EN_DATIVE_LEMMAS.has(token.lemma || '')) particle = 'にあって';
        }
        // 無条件テーブル（lemma × 格で意味が固定できるもののみ）
        // Phase 2-A テーブル → ミス時のみ Phase 2-B 追加テーブル（追加方式）
        else {
            const key = `${prepLemma}|${kase}`;
            particle = _PREP_PARTICLE[key] || _PREP_PARTICLE_2B[key] || null;
        }

        if (!particle) return null;
        return { japanese: base + particle, source: ResolveSource.SYNTAX };
    }

    // ── Phase 1: Morphology Layer ─────────────────────────────────
    _resolveMorph(token, base) {
        const cls   = (token.class  || '').toLowerCase();
        const tense = (token.tense  || '').toLowerCase();
        const voice = (token.voice  || '').toLowerCase();
        const mood  = (token.mood   || '').toLowerCase();
        const kase  = (token.case   || '').toLowerCase();

        let result  = base;
        let changed = false;

        if (cls === 'verb') {
            // 受動態を先に適用する（受動 → 法 の順）。
            // 逆順だと「愛しながら」に受動規則が掛からず受動の意味が失われる。
            // 先に「愛される」へ変換すれば分詞規則が「愛されながら」を生成できる。
            // 受動トークンの扱い（Phase 4-A で Lexicon へ移管）:
            //   - lexicon 未注入（劣化モード）→ 受動トークンは一切変換せず fallback
            //     （法変換だけ適用すると「惑わせ」のような意味逆転が起きるため全停止）
            //   - entry.deponent → 受動規則のみスキップ（法変換は適用 = 移管前と同一。
            //     γενήθητε →「なれ」が正しく出る）
            //   - ガード: 「〜である」への受動付与は必ず不自然になるため除外
            if (voice === 'passive') {
                if (!this._lexicon) return null;
                if (this._passiveAllowed(token) && !/である$/.test(base)) {
                    const r = _applyRules(result, 'pass');
                    if (r !== result) { result = r; changed = true; }
                }
            }
            if (mood === 'participle') {
                const kind = tense === 'present' ? 'part-pres'
                           : tense === 'aorist'  ? 'part-aor'
                           : tense === 'perfect' ? 'part-perf'
                           : null;
                if (kind) {
                    const r = _applyRules(result, kind);
                    if (r !== result) { result = r; changed = true; }
                }
            } else if (mood === 'infinitive') {
                const r = _applyRules(result, 'inf');
                if (r !== result) { result = r; changed = true; }
            } else if (mood === 'imperative') {
                const r = _applyRules(result, 'imp');
                if (r !== result) { result = r; changed = true; }
            }
        } else if (cls === 'noun' || cls === 'pron') {
            // J-3: Morph Rule Registry による語幹選択（gender/number）を、
            // 格助詞付与より前に適用する。未登録 lemma では stem === base のため、
            // 以降の処理は既存挙動と完全同一（バイト等価）。
            const stem = _morphStem(token, base);
            if (stem !== base) { result = stem; changed = true; }

            // ガード: result が既に助詞で終わるグロス（「子よ」「滅びの」「反対に」等）への
            // 二重付与を防ぐ（Phase 1 監査 P2）。
            // 例外: 「〜もの」は名詞（忌まわしいもの 等）なので付与してよい。
            // ガード: 助詞を付与できないグロス（「ある」等）も除外。
            const endsWithParticle = (_TRAILING_PARTICLES.has(result.slice(-1)) && !/もの$/.test(result))
                || _PARTICLE_SKIP_GLOSSES.has(result);
            if (endsWithParticle) {
                // 付与なし（stem が変わっていなければ null でフォールバック）
            } else {
                const p = _CASE_PARTICLE[kase];
                if (p) { result = result + p; changed = true; }
            }
        }

        if (!changed) return null;
        return { japanese: result, source: ResolveSource.MORPH };
    }
}

// ── グローバルエクスポート ─────────────────────────────────────────
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.readingEngine = new ReadingEngine();
    window.App.readingEngine.ResolveSource = ResolveSource;
    // Phase 4-A: Lexicon 注入。script タグの読み込み順
    // （reading-lexicon-data.js → reading-lexicon.js → 本ファイル）により
    // ここで常に利用可能。欠けている場合は劣化モード（受動変換なし）で動く。
    // Phase 4-C: インスタンスを App.readingLexicon として公開し、
    // lexicon-lite の非同期ロード後に enrich() できるようにする。
    if (window.App.ReadingLexicon && window.App.readingLexiconData) {
        window.App.readingLexicon =
            new window.App.ReadingLexicon(window.App.readingLexiconData);
        window.App.readingEngine.setLexicon(window.App.readingLexicon);
    }
    // Phase 5-A: Semantic データ注入（reading-semantic-data.js が先に読み込まれる）。
    // 欠けている場合は semantic 層が不活性（既存チェーンと同一動作）。
    if (window.App.readingSemanticData) {
        window.App.readingEngine.setSemanticData(window.App.readingSemanticData);
    }
    // Phase 5-D: LN 最終辞書注入（reading-ln-final-data.js が先に読み込まれる）。
    // 欠けている場合は lnGloss 照合が不活性（既存チェーンと同一動作）。
    if (window.READING_LN_FINAL) {
        window.App.readingEngine.setLnGlossData(window.READING_LN_FINAL);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReadingEngine, ResolveSource, READING_ENGINE_VERSION };
}
