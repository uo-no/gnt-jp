/**
 * syntax-analyzer.js
 * Syntax Analysis Layer — 設計書
 *
 * 目的   : トークンと周辺文脈を受け取り、構文機能の「候補」を
 *          confidence 付きで返す。断定しない。UI に依存しない。
 * 参照   : syntax-registry.json (Wallace分類データ)
 * 依存   : morph-decoder.js (decodeMorph / entryPosCode / cleanText)
 * バージョン: 0.2.0
 */

// =============================================================
// § 0.  設計原則
// =============================================================
//
//  1. 断定しない
//     すべての出力は candidates[] 形式。単一の "答え" を返さない。
//     最高 confidence の候補であっても、UIが最終的に表示形式を決める。
//
//  2. Syntax Registry 参照方式
//     判定ルール・スコア重みは syntax-registry.json から読み込む。
//     コード内に分類名・スコア値をハードコードしない。
//
//  3. UI 非依存
//     HTML / DOM 操作を一切含まない。
//     入力 → 純粋なデータ変換 → 出力。
//
//  4. Wallace 分類を後から追加可能
//     Registry に stub エントリを追加するだけで候補が増える。
//     エンジンのコードを変更せずに拡張できる。
//
//  5. 段階的評価（Pipeline 方式）
//     解析は独立した Stage を直列に通過する。
//     各 Stage は前 Stage の出力を入力として受け取る。
//     Stage の追加・削除が容易な構造にする。


// =============================================================
// § 1.  モジュール構成
// =============================================================
//
//  syntax-analyzer.js
//  ├── RegistryLoader          Registry JSON を読み込み参照可能にする
//  ├── ContextBuilder          入力トークンから解析コンテキストを構築する
//  ├── CandidateScorer         Registry ルールに基づいて候補スコアを計算する
//  │   ├── GenitiveScorer      属格専用スコアラー
//  │   ├── DativeScorer        与格専用スコアラー
//  │   └── ParticipleScorer    分詞専用スコアラー
//  ├── CandidateNormalizer     候補スコアを confidence (0–1) に正規化する
//  ├── WordOrderAnalyzer       語順マーカーを検出し候補に反映する
//  └── SyntaxAnalyzer          公開インターフェース（エントリーポイント）


// =============================================================
// § 2.  入出力データ構造
// =============================================================

/**
 * --- 入力 ---
 *
 * @typedef {Object} AnalysisInput
 * @property {TokenEntry}   target   - 解析対象トークン
 * @property {TokenEntry[]} tokens   - 節内の全トークン（対象を含む）
 * @property {number}       targetIdx - tokens 内での対象のインデックス
 *
 * TokenEntry は morphology-data-schema.md で定義された構造を使用。
 * 最低限必要なフィールド:
 *   word, lemma, pos, morph (or tense/mood/voice/case/number/gender)
 *   ref, _bookKey
 */

/**
 * --- 出力 ---
 *
 * @typedef {Object} AnalysisOutput
 * @property {string}      targetWord   - cleanText(target)
 * @property {string}      targetLemma  - target.lemma
 * @property {DecodedMorph} morph       - decodeMorph(target) の結果
 * @property {Candidate[]} candidates   - 構文機能候補の配列（confidence 降順）
 * @property {WordOrderMark|null} wordOrder - 語順マーカー（存在する場合）
 * @property {ContextSummary} context   - 解析コンテキストのサマリー
 * @property {string}      version      - アナライザーのバージョン
 *
 * @example
 * {
 *   "targetWord":  "ἀγαπάω",
 *   "targetLemma": "ἀγαπάω",
 *   "morph": { "pos": "N", "case": "genitive", "number": "singular", ... },
 *   "candidates": [
 *     {
 *       "id":          "genitive.subjective",
 *       "confidence":  0.72,
 *       "label_ja":    "主語的属格",
 *       "label_en":    "Subjective Genitive",
 *       "wallace_ref": "§4.B.1 (pp.112–116)",
 *       "hint_ja":     "ヘッド名詞が示す動作の行為者として読む。",
 *       "signals_matched": ["action_noun_head", "agentive_semantics"],
 *       "signals_failed":  ["pronoun_genitive"],
 *       "raw_score":   72,
 *       "xsc": {
 *         "deltas": [
 *           { "signal_id": "action_noun_head", "value": 30, "label_ja": "動作名詞がヘッド" },
 *           { "signal_id": "agentive_semantics", "value": 20, "label_ja": "行為者として読めば自然" }
 *         ],
 *         "confidence_color": "#a09050"
 *       }
 *     },
 *     {
 *       "id":         "genitive.objective",
 *       "confidence":  0.50,
 *       ...
 *     }
 *   ],
 *   "wordOrder": {
 *     "type": "topicalized",
 *     "note": "動詞より前に置かれている。話題化・強調の可能性。"
 *   },
 *   "context": {
 *     "mainVerbWord":  "ἀγαπᾷ",
 *     "mainVerbLemma": "ἀγαπάω",
 *     "headNounWord":  "ἀγάπη",
 *     "prevPos":       "N",
 *     "prevLemma":     "ἀγάπη",
 *     "hasCopula":     false,
 *     "clauseLength":  7
 *   },
 *   "version": "0.1.0"
 * }
 */

/**
 * @typedef {Object} Candidate
 * @property {string}   id              - Registry の type.id（例: "genitive.subjective"）
 * @property {number}   confidence      - 0.0〜1.0（正規化済み確信度）
 * @property {string}   label_ja        - 日本語ラベル（Registry から）
 * @property {string}   label_en        - 英語ラベル（Registry から）
 * @property {string}   wallace_ref     - Wallace 参照（Registry から）
 * @property {string}   hint_ja         - 読解ヒント（Registry から）
 * @property {string}   status          - "active" | "stub"（Registry から）
 * @property {string[]} signals_matched - マッチしたシグナルIDの配列
 * @property {string[]} signals_failed  - マッチしなかったシグナルIDの配列
 * @property {number}   raw_score       - 正規化前の生スコア
 * @property {XscDetail} xsc            - XSCパネル描画用の内訳データ
 * @property {string[]} alternatives    - 競合候補の type.id 配列（Registry から）
 */

/**
 * @typedef {Object} XscDetail
 * @property {XscDelta[]} deltas          - スコア内訳（マッチしたシグナルのみ）
 * @property {string}     confidence_color - 確信度に応じた表示色（CSSカラー文字列）
 */

/**
 * @typedef {Object} XscDelta
 * @property {string} signal_id  - シグナルID（Registry の signals[].id）
 * @property {number} value      - スコア変化量（正 or 負）
 * @property {string} label_ja   - 日本語ラベル（Registry から）
 */

/**
 * @typedef {Object} WordOrderMark
 * @property {string} type  - "topicalized" | "fronted-subj" | "verb-initial"
 * @property {string} note  - 語順の解釈メモ（日本語）
 */

/**
 * @typedef {Object} ContextSummary
 * @property {string|null}  mainVerbWord   - 節の主動詞の表層形
 * @property {string|null}  mainVerbLemma  - 節の主動詞のレンマ
 * @property {string|null}  headNounWord   - 直前ヘッド名詞の表層形
 * @property {string}       prevPos        - 直前トークンの品詞コード
 * @property {string}       prevLemma      - 直前トークンのレンマ
 * @property {boolean}      hasCopula      - 節内にコプラ動詞が存在するか
 * @property {number}       clauseLength   - 節内のトークン数
 */


// =============================================================
// § 3.  RegistryLoader
// =============================================================

/**
 * RegistryLoader
 *
 * 役割: syntax-registry.json を読み込み、解析エンジンが参照可能な
 *       形式に変換してキャッシュする。
 *
 * 公開メソッド:
 *   load(registryJson)       → void         JSON オブジェクトを受け取り内部にセット
 *   getShared()              → SharedConfig 共通設定オブジェクトを返す
 *   getCategory(id)          → CategoryDef  カテゴリ定義を返す
 *   getType(typeId)          → TypeDef|null type定義を返す（例: "genitive.possessive"）
 *   getTypesForCase(caseVal) → TypeDef[]    指定した格に属する全 type を返す
 *   getTypesForMood(moodVal) → TypeDef[]    指定した法に属する全 type を返す
 *
 * 疑似コード:
 *
 *   class RegistryLoader {
 *     #registry = null
 *     #typeIndex = new Map()  // typeId → TypeDef の高速参照用インデックス
 *
 *     load(registryJson) {
 *       this.#registry = registryJson
 *       this.#buildIndex()
 *     }
 *
 *     #buildIndex() {
 *       // categories 以下を再帰的に走査して typeIndex を構築
 *       for each category in registry.categories:
 *         for each subcategory in category.subcategories:
 *           for each type in subcategory.types:
 *             this.#typeIndex.set(type.id, {
 *               ...type,
 *               categoryId:   categoryKey,    // "genitive" | "dative" | "participle"
 *               groupId:      subcategory.group_id,
 *             })
 *     }
 *
 *     getType(typeId) {
 *       return this.#typeIndex.get(typeId) ?? null
 *     }
 *
 *     getTypesForCase(caseVal) {
 *       // "genitive" → genitive カテゴリの全 type を返す
 *       // "dative"   → dative カテゴリの全 type を返す
 *       const categoryId = CASE_TO_CATEGORY[caseVal]  // { genitive:'genitive', dative:'dative', ... }
 *       if (!categoryId) return []
 *       return [...this.#typeIndex.values()].filter(t => t.categoryId === categoryId)
 *     }
 *
 *     getTypesForMood(moodVal) {
 *       // "participle" → participle カテゴリの全 type を返す
 *       const categoryId = MOOD_TO_CATEGORY[moodVal]  // { participle:'participle', ... }
 *       if (!categoryId) return []
 *       return [...this.#typeIndex.values()].filter(t => t.categoryId === categoryId)
 *     }
 *
 *     getShared() {
 *       return this.#registry.shared
 *     }
 *   }
 */


// =============================================================
// § 4.  ContextBuilder
// =============================================================

/**
 * ContextBuilder
 *
 * 役割: AnalysisInput からスコアラーが参照するコンテキスト情報を
 *       事前に計算してまとめる。各スコアラーが個別に走査しなくて済む。
 *
 * 公開メソッド:
 *   build(target, tokens, targetIdx) → AnalysisContext
 *
 * @typedef {Object} AnalysisContext
 * @property {TokenEntry}      target
 * @property {TokenEntry[]}    tokens
 * @property {number}          targetIdx
 * @property {DecodedMorph}    morph           - decodeMorph(target)
 * @property {string}          posCode         - entryPosCode(target)
 * @property {string}          word            - cleanText(target)
 *
 * // 周辺トークン
 * @property {TokenEntry|null} prevToken       - 直前トークン
 * @property {string}          prevPos         - entryPosCode(prevToken)
 * @property {string}          prevLemma       - prevToken.lemma
 * @property {TokenEntry|null} nextToken       - 直後トークン
 * @property {string}          nextPos         - entryPosCode(nextToken)
 *
 * // 節レベル情報
 * @property {TokenEntry|null} mainVerb        - 節の主動詞
 * @property {number}          mainVerbIdx     - 主動詞のインデックス（-1 なし）
 * @property {TokenEntry|null} copulaVerb      - コプラ動詞（εἰμί / γίνομαι）
 * @property {Map}             roleMap         - token → RoleInfo（初期推定）
 *
 * // 格情報（名詞系の場合）
 * @property {TokenEntry|null} headNoun        - 直前ヘッド名詞（属格用）
 * @property {boolean}         hasArticleBefore- 直前 or 2語前に冠詞があるか
 * @property {boolean}         isAfterPrep     - 直前が前置詞か
 *
 * // 分詞専用
 * @property {TokenEntry|null} matchingNoun    - 格・性・数が一致する名詞
 * @property {number}          matchScore      - 一致名詞とのスコア（0 なし）
 * @property {TokenEntry|null} genitiveNoun    - 節内の属格名詞（属格絶対用）
 * @property {TokenEntry|null} perceptionVerb  - 知覚・認識動詞（補語用法用）
 *
 * // 与格専用
 * @property {boolean}         hasGivingVerb   - 節内に授与・伝達動詞があるか
 * @property {boolean}         hasAdversative  - 節内に否定語・反抗語があるか
 *
 * 疑似コード:
 *
 *   build(target, tokens, targetIdx) {
 *     const morph   = decodeMorph(target)
 *     const posCode = entryPosCode(target)
 *     const word    = cleanText(target)
 *
 *     const prevToken = targetIdx > 0 ? tokens[targetIdx - 1] : null
 *     const prevPos   = prevToken ? entryPosCode(prevToken) : ''
 *     const prevLemma = prevToken?.lemma ?? ''
 *     const nextToken = targetIdx < tokens.length - 1 ? tokens[targetIdx + 1] : null
 *     const nextPos   = nextToken ? entryPosCode(nextToken) : ''
 *
 *     const mainVerb    = findMainVerb(tokens)
 *     const mainVerbIdx = mainVerb ? tokens.indexOf(mainVerb) : -1
 *     const copulaVerb  = findCopulaVerb(tokens)
 *
 *     // 初期役割マップ（軽量版）
 *     const roleMap = buildInitialRoleMap(tokens)
 *
 *     // 分詞専用
 *     const { matchingNoun, matchScore } = findMatchingNoun(target, tokens, targetIdx, morph)
 *     const genitiveNoun   = (morph.case === 'genitive') ? findGenitiveNoun(tokens, targetIdx) : null
 *     const perceptionVerb = findPerceptionVerb(tokens, targetIdx, REGISTRY.perceptionLemmas)
 *
 *     // 与格専用
 *     const hasGivingVerb  = tokens.some(t => REGISTRY.givingVerbLemmas.has(t.lemma))
 *     const hasAdversative = tokens.some(t => REGISTRY.adversativeLemmas.has(t.lemma))
 *                          || clauseHasNegation(tokens)
 *
 *     // ヘッド名詞（属格のヘッド探索）
 *     const headNoun = (morph.case === 'genitive') ? findHeadNoun(tokens, targetIdx) : null
 *
 *     return {
 *       target, tokens, targetIdx, morph, posCode, word,
 *       prevToken, prevPos, prevLemma, nextToken, nextPos,
 *       mainVerb, mainVerbIdx, copulaVerb, roleMap,
 *       headNoun, hasArticleBefore: checkArticleBefore(tokens, targetIdx),
 *       isAfterPrep: prevPos === 'P',
 *       matchingNoun, matchScore, genitiveNoun, perceptionVerb,
 *       hasGivingVerb, hasAdversative,
 *     }
 *   }
 */


// =============================================================
// § 5.  CandidateScorer（抽象基底）
// =============================================================

/**
 * CandidateScorer（抽象）
 *
 * 役割: Registry の type 定義を1件評価し、RawCandidate を返す。
 *       各格・品詞専用の具体クラスが継承する。
 *
 * @typedef {Object} RawCandidate
 * @property {string}   typeId          - Registry の type.id
 * @property {number}   rawScore        - 計算済み生スコア
 * @property {string[]} signalsMatched  - マッチしたシグナルID
 * @property {string[]} signalsFailed   - マッチしなかったシグナルID
 * @property {XscDelta[]} deltas        - XSC内訳（マッチシグナルのみ）
 * @property {TypeDef}  typeDef         - 元の Registry 定義（label等の参照用）
 *
 * 疑似コード:
 *
 *   abstract class CandidateScorer {
 *
 *     // サブクラスが実装: このスコアラーが担当するカテゴリかを判定
 *     abstract canHandle(ctx: AnalysisContext): boolean
 *
 *     // サブクラスが実装: カテゴリ内の全 type を候補化して返す
 *     abstract score(ctx: AnalysisContext, registry: RegistryLoader): RawCandidate[]
 *
 *     // 共通: 1つの type に対してシグナル評価を実行する
 *     _evaluateType(typeDef, ctx) {
 *       // 1. required_case / required_mood / required_pos をチェック
 *       if (typeDef.detection.required_case && ctx.morph.case !== typeDef.detection.required_case)
 *         return null  // このタイプは対象外
 *
 *       if (typeDef.status === 'stub')
 *         return {
 *           typeId: typeDef.id,
 *           rawScore: typeDef.xsc.default_confidence,
 *           signalsMatched: [], signalsFailed: [], deltas: [],
 *           typeDef,
 *         }
 *
 *       // 2. exclusions をチェック → 1件でも true なら rawScore = 0
 *       for (const excl of typeDef.detection.exclusions ?? []) {
 *         if (this._evalCheck(excl.check, ctx)) {
 *           return {
 *             typeId: typeDef.id,
 *             rawScore: 0,
 *             signalsMatched: [], signalsFailed: [excl.id], deltas: [],
 *             typeDef,
 *           }
 *         }
 *       }
 *
 *       // 3. signals を評価してスコアを積み上げる
 *       let score = typeDef.xsc.base_weight
 *       const matched = [], failed = [], deltas = []
 *
 *       for (const signal of typeDef.xsc.signals) {
 *         // condition がある場合はその check を評価
 *         const condition = typeDef.detection.conditions.find(c => c.id === signal.id)
 *         if (condition) {
 *           const hit = this._evalCheck(condition.check, ctx)
 *           if (hit) {
 *             score += signal.value
 *             matched.push(signal.id)
 *             deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja })
 *           } else {
 *             failed.push(signal.id)
 *           }
 *         } else {
 *           // condition なし = 常に加算（base_weight に組み込まれているシグナル）
 *           score += signal.value
 *           deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja })
 *         }
 *       }
 *
 *       return { typeId: typeDef.id, rawScore: score, signalsMatched: matched, signalsFailed: failed, deltas, typeDef }
 *     }
 *
 *     // 共通: check 疑似コードを実際の評価に変換するディスパッチャ
 *     _evalCheck(checkStr, ctx) {
 *       // registry-schema.md §8 の check 疑似コードを評価する
 *       // 実装方法: checkStr をパースして対応する述語関数を呼び出す
 *       //
 *       // 例:
 *       //   "prev_pos_eq('T')"      → ctx.prevPos === 'T'
 *       //   "NOT prev_pos_eq('P')"  → ctx.prevPos !== 'P'
 *       //   "target_case_eq('genitive')" → ctx.morph.case === 'genitive'
 *       //   "context_has_genitive_noun()" → ctx.genitiveNoun !== null
 *       //   "target_lemma_in_list('temporal_noun_lemmas')"
 *       //       → REGISTRY.getList('temporal_noun_lemmas').has(ctx.target.lemma)
 *       //
 *       // 未知の check 文字列 → false（安全側に倒す）
 *       return CheckEvaluator.eval(checkStr, ctx)
 *     }
 *   }
 */


// =============================================================
// § 6.  具体スコアラー（GenitiveScorer / DativeScorer / ParticipleScorer）
// =============================================================

/**
 * GenitiveScorer extends CandidateScorer
 *
 * canHandle(ctx): ctx.morph.case === 'genitive'
 *
 * score(ctx, registry):
 *   types = registry.getTypesForCase('genitive')
 *   // priority 昇順で評価し、rawScore > 0 の候補のみ返す
 *   return types
 *     .sort((a, b) => a.priority - b.priority)
 *     .map(type => this._evaluateType(type, ctx))
 *     .filter(result => result !== null && result.rawScore > 0)
 *
 * 評価の特殊ロジック（Registry の check に対応する補助):
 *
 *   "head_lemma_in_list('action_noun_lemmas')"
 *     → ctx.headNoun?.lemma が registry の action_noun_lemmas に含まれるか
 *
 *   "context_has_comparative_adj()"
 *     → tokens 内に -τερος 語尾を持つトークンがあるか（正規表現）
 *
 *   "genitive_subject_differs_from_main_subject()"
 *     → ctx.roleMap で 'subj' に割り当てられたトークンのレンマ ≠
 *       ctx.genitiveNoun?.lemma
 *
 *   "target_mood_eq('participle') AND target_case_eq('genitive')"
 *     → ctx.morph.mood === 'participle' && ctx.morph.case === 'genitive'
 */

/**
 * DativeScorer extends CandidateScorer
 *
 * canHandle(ctx): ctx.morph.case === 'dative'
 *
 * score(ctx, registry):
 *   types = registry.getTypesForCase('dative')
 *   // priority 昇順で評価
 *   return types
 *     .sort((a, b) => a.priority - b.priority)
 *     .map(type => this._evaluateType(type, ctx))
 *     .filter(result => result !== null && result.rawScore > 0)
 *
 * 評価の特殊ロジック:
 *
 *   "context_verb_lemma_in_list('giving_verb_lemmas')"
 *     → ctx.hasGivingVerb（ContextBuilder が事前計算）
 *
 *   "context_has_negation()"
 *     → ctx.hasAdversative（ContextBuilder が事前計算）
 *
 *   "context_verb_has_syn_prefix()"
 *     → tokens 内の動詞のレンマが 'συν-' で始まるか
 *       または σύν 複合語パターン（syn + 動詞幹）にマッチするか
 *
 *   "target_lemma_in_list('temporal_noun_lemmas')"
 *     → registry.getList('temporal_noun_lemmas').has(ctx.target.lemma)
 */

/**
 * ParticipleScorer extends CandidateScorer
 *
 * canHandle(ctx): ctx.morph.mood === 'participle'
 *
 * score(ctx, registry):
 *   types = registry.getTypesForMood('participle')
 *   return types
 *     .sort((a, b) => a.priority - b.priority)
 *     .map(type => this._evaluateType(type, ctx))
 *     .filter(result => result !== null && result.rawScore > 0)
 *
 * 評価の特殊ロジック:
 *
 *   "article_agrees_case_gender_number()"
 *     → ctx.prevPos === 'T' &&
 *       decodeMorph(ctx.prevToken).case   === ctx.morph.case &&
 *       decodeMorph(ctx.prevToken).gender === ctx.morph.gender &&
 *       decodeMorph(ctx.prevToken).number === ctx.morph.number
 *
 *   "context_has_case_gender_number_match()"
 *     → ctx.matchingNoun !== null（ContextBuilder が事前計算）
 *
 *   "distance_to_match_le(2)"
 *     → Math.abs(tokens.indexOf(ctx.matchingNoun) - ctx.targetIdx) <= 2
 *
 *   "main_verb_tense_eq('aorist') AND main_verb_mood_eq('imperative')"
 *     → ctx.mainVerb &&
 *       decodeMorph(ctx.mainVerb).tense === 'aorist' &&
 *       decodeMorph(ctx.mainVerb).mood  === 'imperative'
 *
 *   "context_verb_lemma_in_list('perception_verb_lemmas')"
 *     → ctx.perceptionVerb !== null（ContextBuilder が事前計算）
 */


// =============================================================
// § 7.  CheckEvaluator
// =============================================================

/**
 * CheckEvaluator
 *
 * 役割: Registry の detection.conditions[].check 文字列を
 *       実際のブール評価に変換するシングルトン。
 *
 * 設計方針:
 *   check 文字列を直接 eval() しない。
 *   関数テーブル（マップ）で疑似コード → 実装関数を対応させる。
 *
 * 疑似コード:
 *
 *   const CheckEvaluator = {
 *
 *     // check 文字列 → 評価関数のマップ
 *     // キー: check 疑似コードのパターン（文字列 or 正規表現）
 *     #handlers: Map<pattern, (ctx, args) => boolean>
 *
 *     eval(checkStr, ctx) {
 *       // NOT プレフィックスの処理
 *       const negated = checkStr.startsWith('NOT ')
 *       const base    = negated ? checkStr.slice(4) : checkStr
 *
 *       // AND 接続の処理（スペースで分割）
 *       if (base.includes(' AND ')) {
 *         const parts  = base.split(' AND ')
 *         const result = parts.every(p => this.eval(p.trim(), ctx))
 *         return negated ? !result : result
 *       }
 *
 *       // OR 接続の処理（スペースで分割）
 *       if (base.includes(' OR ')) {
 *         const parts  = base.split(' OR ')
 *         const result = parts.some(p => this.eval(p.trim(), ctx))
 *         return negated ? !result : result
 *       }
 *
 *       // 関数名と引数を抽出
 *       const match = base.match(/^(\w+)\(([^)]*)\)$/)
 *       if (!match) return false
 *       const [, funcName, argsStr] = match
 *       const args = argsStr ? argsStr.split(',').map(a => a.trim().replace(/['"]/g, '')) : []
 *
 *       // ハンドラーのディスパッチ
 *       const handler = this.#getHandler(funcName)
 *       if (!handler) {
 *         console.warn(`[CheckEvaluator] unknown check: ${funcName}`)
 *         return false  // 未知の check は安全側（false）
 *       }
 *       const result = handler(ctx, args)
 *       return negated ? !result : result
 *     }
 *
 *     #getHandler(funcName) {
 *       return this.#handlers.get(funcName) ?? null
 *     }
 *   }
 *
 * ハンドラー登録例:
 *
 *   CheckEvaluator.register('prev_pos_eq',
 *     (ctx, [posCode]) => ctx.prevPos === posCode
 *   )
 *   CheckEvaluator.register('prev_pos_in',
 *     (ctx, posCodes) => posCodes.includes(ctx.prevPos)
 *   )
 *   CheckEvaluator.register('target_case_eq',
 *     (ctx, [caseVal]) => ctx.morph.case === caseVal
 *   )
 *   CheckEvaluator.register('target_tense_eq',
 *     (ctx, [tenseVal]) => ctx.morph.tense === tenseVal
 *   )
 *   CheckEvaluator.register('target_tense_in',
 *     (ctx, tenseVals) => tenseVals.includes(ctx.morph.tense)
 *   )
 *   CheckEvaluator.register('target_mood_eq',
 *     (ctx, [moodVal]) => ctx.morph.mood === moodVal
 *   )
 *   CheckEvaluator.register('target_lemma_in_list',
 *     (ctx, [listName]) => REGISTRY.getList(listName).has(ctx.target.lemma)
 *   )
 *   CheckEvaluator.register('head_lemma_in_list',
 *     (ctx, [listName]) => ctx.headNoun
 *       ? REGISTRY.getList(listName).has(ctx.headNoun.lemma)
 *       : false
 *   )
 *   CheckEvaluator.register('context_has_case_gender_number_match',
 *     (ctx) => ctx.matchingNoun !== null
 *   )
 *   CheckEvaluator.register('context_has_genitive_noun',
 *     (ctx) => ctx.genitiveNoun !== null
 *   )
 *   CheckEvaluator.register('context_has_comparative_adj',
 *     (ctx) => ctx.tokens.some(t => (t.word || '').match(/τερ(ος|α|ον)/))
 *   )
 *   CheckEvaluator.register('context_has_negation',
 *     (ctx) => ctx.hasAdversative
 *   )
 *   CheckEvaluator.register('context_verb_lemma_in_list',
 *     (ctx, [listName]) => {
 *       const list = REGISTRY.getList(listName)
 *       return ctx.tokens.some(t => entryPosCode(t) === 'V' && list.has(t.lemma))
 *     }
 *   )
 *   CheckEvaluator.register('context_has_lemma_in',
 *     (ctx, lemmas) => ctx.tokens.some(t => lemmas.includes(t.lemma))
 *   )
 *   CheckEvaluator.register('context_verb_has_syn_prefix',
 *     (ctx) => ctx.tokens.some(t => {
 *       if (entryPosCode(t) !== 'V') return false
 *       const l = t.lemma || ''
 *       return l.startsWith('συν') || l.startsWith('συμ') || l.startsWith('συγ') || l.startsWith('συλ') || l.startsWith('συρ')
 *     })
 *   )
 *   CheckEvaluator.register('article_agrees_case_gender_number',
 *     (ctx) => {
 *       if (ctx.prevPos !== 'T') return false
 *       const pm = decodeMorph(ctx.prevToken)
 *       return pm.case === ctx.morph.case && pm.gender === ctx.morph.gender && pm.number === ctx.morph.number
 *     }
 *   )
 *   CheckEvaluator.register('main_verb_tense_eq',
 *     (ctx, [tenseVal]) => ctx.mainVerb ? decodeMorph(ctx.mainVerb).tense === tenseVal : false
 *   )
 *   CheckEvaluator.register('main_verb_mood_eq',
 *     (ctx, [moodVal]) => ctx.mainVerb ? decodeMorph(ctx.mainVerb).mood === moodVal : false
 *   )
 *   CheckEvaluator.register('genitive_subject_differs_from_main_subject',
 *     (ctx) => {
 *       if (!ctx.genitiveNoun) return false
 *       const subjToken = [...ctx.roleMap.entries()]
 *         .find(([, r]) => r.role === 'subj')?.[0]
 *       if (!subjToken) return true  // 主語不明 → 異なると推定
 *       return ctx.genitiveNoun.lemma !== subjToken.lemma
 *     }
 *   )
 *   CheckEvaluator.register('distance_to_match_le',
 *     (ctx, [n]) => ctx.matchingNoun
 *       ? Math.abs(ctx.tokens.indexOf(ctx.matchingNoun) - ctx.targetIdx) <= Number(n)
 *       : false
 *   )
 */


// =============================================================
// § 8.  CandidateNormalizer
// =============================================================

/**
 * CandidateNormalizer
 *
 * 役割: RawCandidate[] を受け取り、rawScore を 0.0〜1.0 の
 *       confidence に正規化して Candidate[] を返す。
 *
 * 正規化方式:
 *   Registry の score_clamp（min: 30, max: 99）を参照して正規化。
 *   confidence = clamp(rawScore, min, max) / 100
 *
 *   confidence ティア判定（Registry の confidence_thresholds を参照）:
 *     high   = confidence >= thresholds.high / 100
 *     medium = confidence >= thresholds.medium / 100
 *     low    = それ以外
 *
 * 疑似コード:
 *
 *   normalize(rawCandidates, shared) {
 *     const { min, max } = shared.score_clamp
 *     const { high: hThr, medium: mThr } = shared.confidence_thresholds
 *     const { high: hCol, medium: mCol, low: lCol } = shared.confidence_colors
 *
 *     return rawCandidates
 *       .map(raw => {
 *         const clamped    = Math.min(max, Math.max(min, raw.rawScore))
 *         const confidence = clamped / 100
 *         const tier       = clamped >= hThr ? 'high' : clamped >= mThr ? 'medium' : 'low'
 *         const confColor  = { high: hCol, medium: mCol, low: lCol }[tier]
 *         return {
 *           id:              raw.typeId,
 *           confidence,
 *           label_ja:        raw.typeDef.label_ja,
 *           label_en:        raw.typeDef.label_en,
 *           wallace_ref:     raw.typeDef.wallace_ref,
 *           hint_ja:         raw.typeDef.hint_ja,
 *           status:          raw.typeDef.status,
 *           signals_matched: raw.signalsMatched,
 *           signals_failed:  raw.signalsFailed,
 *           raw_score:       raw.rawScore,
 *           alternatives:    raw.typeDef.alternatives ?? [],
 *           xsc: {
 *             deltas:           raw.deltas,
 *             confidence_color: confColor,
 *           },
 *         }
 *       })
 *       .filter(c => c.confidence > 0)
 *       .sort((a, b) => b.confidence - a.confidence)
 *   }
 */


// =============================================================
// § 9.  WordOrderAnalyzer
// =============================================================

/**
 * WordOrderAnalyzer
 *
 * 役割: 語順の有標性を検出し、WordOrderMark を返す。
 *       現行 syntax-search.html の detectWordOrderMarkers() を
 *       UI非依存の純粋関数に抽出したもの。
 *
 * 公開メソッド:
 *   analyze(target, tokens, targetIdx, roleMap) → WordOrderMark | null
 *
 * 疑似コード:
 *
 *   analyze(target, tokens, targetIdx, roleMap) {
 *     const SKIP_POS  = new Set(['C', 'T'])
 *     const mainVerbIdx = tokens.findIndex(t => {
 *       const m = decodeMorph(t)
 *       return entryPosCode(t) === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive'
 *     })
 *     if (mainVerbIdx < 0) return null
 *
 *     const pos  = entryPosCode(target)
 *     const role = roleMap.get(target)?.role
 *
 *     if (!role || role === 'other' || role === 'conj') return null
 *     if (SKIP_POS.has(pos)) return null
 *
 *     // ① 動詞より前の実質語 → topicalization / fronted-subj
 *     if (targetIdx < mainVerbIdx) {
 *       if (role === 'subj') {
 *         const effectiveStart = tokens.findIndex(t2 => !SKIP_POS.has(entryPosCode(t2)))
 *         const hasPrior = tokens.slice(0, targetIdx).some(t2 => !SKIP_POS.has(entryPosCode(t2)))
 *         if (targetIdx === effectiveStart || !hasPrior) return null  // 無標
 *         return { type: 'fronted-subj', note: '主語が節の比較的前方に置かれている。強調・対比の可能性。' }
 *       }
 *       if (['obj','mod','prep','ptc','inf'].includes(role)) {
 *         const mainVerbWord = cleanText(tokens[mainVerbIdx])
 *         return { type: 'topicalized', note: `動詞「${mainVerbWord}」より前に置かれている。話題化・強調の可能性。` }
 *       }
 *     }
 *
 *     // ② 動詞が節の実質先頭 → verb-initial（動詞自身にのみ適用）
 *     if (targetIdx === mainVerbIdx) {
 *       const firstContentIdx = tokens.findIndex(t2 => !SKIP_POS.has(entryPosCode(t2)))
 *       if (mainVerbIdx === firstContentIdx && tokens.length > mainVerbIdx + 1) {
 *         return { type: 'verb-initial', note: '動詞が節の先頭に置かれている（動詞前置語順）。動作への焦点・物語的躍動感の可能性。' }
 *       }
 *     }
 *
 *     return null
 *   }
 */


// =============================================================
// § 10.  SyntaxAnalyzer（公開インターフェース）
// =============================================================

/**
 * SyntaxAnalyzer
 *
 * 役割: 全コンポーネントを統合する唯一のエントリーポイント。
 *       外部から呼び出すのはこのクラスのみ。
 *
 * 公開インターフェース:
 *
 *   class SyntaxAnalyzer {
 *
 *     constructor(registryJson) {
 *       this.registry   = new RegistryLoader()
 *       this.registry.load(registryJson)
 *       this.scorers    = [
 *         new GenitiveScorer(),
 *         new DativeScorer(),
 *         new ParticipleScorer(),
 *         // 将来追加: new AccusativeScorer(), new InfinitiveScorer(), ...
 *       ]
 *       this.normalizer = new CandidateNormalizer()
 *       this.woAnalyzer = new WordOrderAnalyzer()
 *       this.version    = '0.2.0'
 *     }
 *
 *     // ──────────────────────────────────────────────
 *     // analyze()  メイン解析エントリーポイント
 *     // ──────────────────────────────────────────────
 *     analyze(input: AnalysisInput): AnalysisOutput {
 *       const { target, tokens, targetIdx } = input
 *
 *       // 1. コンテキスト構築
 *       const ctx = ContextBuilder.build(target, tokens, targetIdx)
 *
 *       // 2. 担当スコアラーを選択
 *       const scorer = this.scorers.find(s => s.canHandle(ctx))
 *       if (!scorer) {
 *         // 担当スコアラーなし → 空の候補リストを返す
 *         return this._emptyOutput(ctx)
 *       }
 *
 *       // 3. 候補スコア計算
 *       const rawCandidates = scorer.score(ctx, this.registry)
 *
 *       // 4. 正規化
 *       const candidates = this.normalizer.normalize(rawCandidates, this.registry.getShared())
 *
 *       // 5. 語順解析
 *       const wordOrder = this.woAnalyzer.analyze(target, tokens, targetIdx, ctx.roleMap)
 *
 *       // 6. ContextSummary 構築
 *       const context = this._buildContextSummary(ctx)
 *
 *       return {
 *         targetWord:  ctx.word,
 *         targetLemma: target.lemma,
 *         morph:       ctx.morph,
 *         candidates,
 *         wordOrder,
 *         context,
 *         version: this.version,
 *       }
 *     }
 *
 *     // ──────────────────────────────────────────────
 *     // analyzeAll()  節内の全トークンをまとめて解析
 *     // ──────────────────────────────────────────────
 *     analyzeAll(tokens: TokenEntry[]): ClauseAnalysis {
 *       const results = tokens.map((t, i) => ({
 *         tokenIdx: i,
 *         word:     cleanText(t),
 *         output:   this.analyze({ target: t, tokens, targetIdx: i }),
 *       }))
 *       return {
 *         tokens,
 *         results,
 *         version: this.version,
 *       }
 *     }
 *
 *     _emptyOutput(ctx) {
 *       return {
 *         targetWord:  ctx.word,
 *         targetLemma: ctx.target.lemma,
 *         morph:       ctx.morph,
 *         candidates:  [],
 *         wordOrder:   null,
 *         context:     this._buildContextSummary(ctx),
 *         version:     this.version,
 *       }
 *     }
 *
 *     _buildContextSummary(ctx) {
 *       return {
 *         mainVerbWord:  ctx.mainVerb  ? cleanText(ctx.mainVerb)  : null,
 *         mainVerbLemma: ctx.mainVerb  ? ctx.mainVerb.lemma       : null,
 *         headNounWord:  ctx.headNoun  ? cleanText(ctx.headNoun)  : null,
 *         prevPos:       ctx.prevPos,
 *         prevLemma:     ctx.prevLemma,
 *         hasCopula:     ctx.copulaVerb !== null,
 *         clauseLength:  ctx.tokens.length,
 *       }
 *     }
 *   }
 *
 * // ──────────────────────────────────────────────
 * // ClauseAnalysis  analyzeAll() の戻り値型
 * // ──────────────────────────────────────────────
 * @typedef {Object} ClauseAnalysis
 * @property {TokenEntry[]} tokens
 * @property {TokenAnalysisEntry[]} results
 * @property {string} version
 *
 * @typedef {Object} TokenAnalysisEntry
 * @property {number}         tokenIdx
 * @property {string}         word
 * @property {AnalysisOutput} output
 */


// =============================================================
// § 11.  解析フロー（全体）
// =============================================================

/**
 *
 *  呼び出し元
 *    ↓  AnalysisInput { target, tokens, targetIdx }
 *    ↓
 *  SyntaxAnalyzer.analyze()
 *    │
 *    ├─ [1] ContextBuilder.build()
 *    │       └─ decodeMorph / entryPosCode / cleanText（morph-decoder.js）
 *    │       └─ findMainVerb / findCopulaVerb
 *    │       └─ findMatchingNoun / findGenitiveNoun / findPerceptionVerb
 *    │       └─ buildInitialRoleMap（軽量版 assignSyntacticRoles）
 *    │       └─ → AnalysisContext
 *    │
 *    ├─ [2] Scorer 選択
 *    │       GenitiveScorer.canHandle()   → morph.case === 'genitive'
 *    │       DativeScorer.canHandle()     → morph.case === 'dative'
 *    │       ParticipleScorer.canHandle() → morph.mood === 'participle'
 *    │       （該当なし → 空候補リスト）
 *    │
 *    ├─ [3] Scorer.score()
 *    │       └─ Registry.getTypesForCase() / getTypesForMood()
 *    │       └─ priority 昇順でループ
 *    │       └─ _evaluateType() per type
 *    │            ├─ stub → rawScore = default_confidence
 *    │            ├─ exclusions チェック → 0 なら rawScore = 0
 *    │            └─ signals × CheckEvaluator.eval() → rawScore 積算
 *    │       └─ → RawCandidate[]
 *    │
 *    ├─ [4] CandidateNormalizer.normalize()
 *    │       └─ clamp(rawScore, min, max)
 *    │       └─ confidence = clamped / 100
 *    │       └─ 降順ソート・confidence > 0 フィルタ
 *    │       └─ → Candidate[]
 *    │
 *    ├─ [5] WordOrderAnalyzer.analyze()
 *    │       └─ → WordOrderMark | null
 *    │
 *    └─ [6] AnalysisOutput 組立・返却
 *
 *  出力例（属格名詞の場合）:
 *  {
 *    "targetWord": "Χριστοῦ",
 *    "morph": { "pos": "N", "case": "genitive", ... },
 *    "candidates": [
 *      { "id": "genitive.subjective",  "confidence": 0.72, ... },
 *      { "id": "genitive.objective",   "confidence": 0.50, ... },
 *      { "id": "genitive.possessive",  "confidence": 0.45, ... }
 *    ],
 *    "wordOrder": null,
 *    "context": { "headNounWord": "ἀγάπη", ... }
 *  }
 */


// =============================================================
// § 12.  Wallace 分類の追加方法
// =============================================================

/**
 * ─────────────────────────────────────────────────────────────────
 * ケース A: 既存カテゴリ（genitive / dative / participle）への type 追加
 * ─────────────────────────────────────────────────────────────────
 * エンジンコードの変更は不要。Registry のみで完結する。
 *
 *   1. syntax-registry.json の該当カテゴリ（genitive / dative / participle）に
 *      新しい type エントリを追加する（registry-schema.md § 7 の形式に従う）。
 *
 *   2. status: "stub" で登録すると、即座に候補として出現する（低 confidence）。
 *      stub の confidence = xsc.default_confidence / 100
 *
 *   3. status: "active" にしたい場合:
 *      - detection.conditions に check 疑似コードを追加する。
 *      - xsc.signals にスコアシグナルを追加する。
 *      - 使用する check 疑似コードが CheckEvaluator に登録済みであることを確認。
 *        未知の check → console.warn + false（安全側）で fallback される。
 *
 *   4. 全く新しい check 疑似コードが必要な場合のみ:
 *      CheckEvaluator.register('new_check_name', (ctx, args) => boolean) を追加。
 *      registry-schema.md § 8 の check 疑似コードリファレンスにも追記すること。
 *
 *   5. reading_impact を付与する場合は registry-schema.md § 10 の impact_key 一覧
 *      に定義済みのキーを使用する。新しいキーが必要な場合は同 § 10 に追記してから
 *      使用すること（reading-impact-spec.md § 7 も参照）。
 *
 * ─────────────────────────────────────────────────────────────────
 * ケース B: 新カテゴリ（Nominative / Accusative / Infinitive 等）の追加
 * ─────────────────────────────────────────────────────────────────
 * Registry への追加に加え、エンジンコードの変更が必要になる。
 *
 *   1. syntax-registry.json に新カテゴリを追加する（registry-schema.md § 12-1 参照）。
 *      meta.version を MINOR でインクリメントする。
 *
 *   2. 対応する Scorer クラスを作成する（CandidateScorer を継承 / § 5 参照）。
 *      - canHandle(ctx): 新カテゴリのトークンを識別する条件を実装する
 *      - score(ctx, registry): registry.getTypesForCase() または
 *        getTypesForMood() を使って type 一覧を取得し評価する
 *
 *   3. SyntaxAnalyzer コンストラクタの scorers 配列に追加する（§ 10 参照）。
 *      例: this.scorers = [
 *            new GenitiveScorer(),
 *            new DativeScorer(),
 *            new ParticipleScorer(),
 *            new AccusativeScorer(),   // ← 追加
 *          ]
 *
 *   4. RegistryLoader の CASE_TO_CATEGORY / MOOD_TO_CATEGORY マップに
 *      新カテゴリのキーを追加する（§ 3 の getTypesForCase / getTypesForMood を参照）。
 *
 * ─────────────────────────────────────────────────────────────────
 * ケース A と B の違いのまとめ
 * ─────────────────────────────────────────────────────────────────
 *
 *   | 変更内容                          | Registry | Scorer | scorers配列 |
 *   |-----------------------------------|----------|--------|------------|
 *   | 既存カテゴリへの type 追加（stub） | ✅ 必要  | ❌ 不要 | ❌ 不要   |
 *   | 既存カテゴリへの type 追加（active）| ✅ 必要 | ❌ 不要 | ❌ 不要   |
 *   | 新カテゴリの追加                  | ✅ 必要  | ✅ 必要 | ✅ 必要   |
 *   | 新 check 疑似コードの追加         | ✅ 必要  | ✅ 必要 | ❌ 不要   |
 */


// =============================================================
// § 13.  エクスポート仕様
// =============================================================

/**
 * モジュールとして使用する場合（ES Module）:
 *
 *   export { SyntaxAnalyzer }
 *   export { RegistryLoader }        // テスト用
 *   export { CheckEvaluator }        // テスト用 / カスタム check 登録
 *   export { CandidateNormalizer }   // テスト用
 *
 * ブラウザのグローバルとして使用する場合（script タグ）:
 *
 *   window.SyntaxAnalyzer = SyntaxAnalyzer
 *
 * 初期化例:
 *
 *   // 1. Registry JSON を fetch
 *   const registryJson = await fetch('./assets/data/syntax-registry.json').then(r => r.json())
 *
 *   // 2. インスタンス生成
 *   const analyzer = new SyntaxAnalyzer(registryJson)
 *
 *   // 3. 単語を解析
 *   const result = analyzer.analyze({
 *     target:    tokens[3],   // 解析対象トークン
 *     tokens:    tokens,      // 節全体
 *     targetIdx: 3,           // インデックス
 *   })
 *
 *   // 4. 候補を利用（UIが担当）
 *   result.candidates.forEach(c => {
 *     console.log(c.id, c.confidence, c.label_ja)
 *   })
 *
 *   // 5. 節全体を一括解析
 *   const clauseResult = analyzer.analyzeAll(tokens)
 */


// =============================================================
// § 3.  RegistryLoader — 実装
// =============================================================

class RegistryLoader {
    #registry = null;
    #typeIndex = new Map(); // typeId → TypeDef（categoryId / groupId 付き）

    // 設計書の load(registryJson) に相当。
    // HTML 側は new SyntaxAnalyzer(registryJson) で渡すため、
    // constructor で受け取り即 load する。
    constructor(registryJson) {
        if (registryJson) {
            this.load(registryJson);
        }
    }

    load(registryJson) {
        this.#registry = registryJson;
        this.#typeIndex.clear();
        this.#buildIndex();
    }

    #buildIndex() {
        const categories = this.#registry?.categories;
        if (!categories || typeof categories !== 'object') return;

        for (const [categoryId, categoryDef] of Object.entries(categories)) {
            const subcategories = categoryDef.subcategories;
            if (!Array.isArray(subcategories)) continue;

            for (const subcategory of subcategories) {
                const types = subcategory.types;
                if (!Array.isArray(types)) continue;

                for (const typeDef of types) {
                    this.#typeIndex.set(typeDef.id, {
                        ...typeDef,
                        categoryId, // "genitive" | "dative" | "participle"
                        groupId: subcategory.group_id,
                    });
                }
            }
        }
    }

    getShared() {
        return this.#registry?.shared ?? null;
    }

    getCategory(categoryId) {
        return this.#registry?.categories?.[categoryId] ?? null;
    }

    getType(typeId) {
        return this.#typeIndex.get(typeId) ?? null;
    }

    // 格 → カテゴリID のマッピングは Registry の categories キーから動的に導出する。
    // ハードコード禁止のため、categories に "genitive"/"dative" キーが存在する限り
    // 自動的に対応する（CASE_TO_CATEGORY 相当を動的生成）。
    getTypesForCase(caseVal) {
        // Registry の categories キーを格名として直接使用。
        // "genitive" → categories.genitive, "dative" → categories.dative
        const categoryId = this.#resolveCaseCategory(caseVal);
        if (!categoryId) return [];
        return [...this.#typeIndex.values()].filter(t => t.categoryId === categoryId);
    }

    getTypesForMood(moodVal) {
        // "participle" → categories.participle など。
        const categoryId = this.#resolveMoodCategory(moodVal);
        if (!categoryId) return [];
        return [...this.#typeIndex.values()].filter(t => t.categoryId === categoryId);
    }

    getTypesForCategory(categoryId) {
        // 任意のカテゴリIDで全 type を返す汎用メソッド。
        // ArticleScorer など、格・法以外のカテゴリを扱うスコアラーが使用する。
        return [...this.#typeIndex.values()].filter(t => t.categoryId === categoryId);
    }

    // 格名 → categoryId の解決。
    // Registry の shared.case_codes に定義された格名をキーとして
    // categories に同名エントリがあればそれを使う。
    // fallback: 格名をそのまま categoryId として試みる。
    #resolveCaseCategory(caseVal) {
        if (!caseVal) return null;
        const categories = this.#registry?.categories;
        if (!categories) return null;
        // Registry categories に直接一致するキーがあればそれを使用
        if (Object.prototype.hasOwnProperty.call(categories, caseVal)) {
            return caseVal;
        }
        return null;
    }

    // 法名 → categoryId の解決（分詞など）
    #resolveMoodCategory(moodVal) {
        if (!moodVal) return null;
        const categories = this.#registry?.categories;
        if (!categories) return null;
        if (Object.prototype.hasOwnProperty.call(categories, moodVal)) {
            return moodVal;
        }
        return null;
    }

    /**
     * Registry の shared.lists から named list を Set で返す。
     * CheckEvaluator の target_lemma_in_list / head_lemma_in_list 等で使用。
     *
     * @param {string} listName - Registry の lists に定義されたリスト名
     * @returns {Set<string>}   - 空のリストの場合は空 Set
     */
    getList(listName) {
        const lists = this.#registry?.shared?.lists;
        if (!lists || !Array.isArray(lists[listName])) return new Set();
        return new Set(lists[listName]);
    }
}


// =============================================================
// § 7.  CheckEvaluator — 実装
// =============================================================

const CheckEvaluator = (() => {
    // check名 → (ctx, args) => boolean のマップ
    const _handlers = new Map();

    const _api = {
        /**
         * ハンドラーを登録する。
         * @param {string}   name    - check 関数名（例: "prev_pos_in"）
         * @param {Function} fn      - (ctx, args: string[]) => boolean
         */
        register(name, fn) {
            _handlers.set(name, fn);
        },

        /**
         * check 文字列を評価してブール値を返す。
         * 対応演算子: NOT (前置), AND (中置), OR (中置)
         *
         * @param {string}          checkStr - Registry の check 文字列
         * @param {AnalysisContext} ctx      - 解析コンテキスト
         * @returns {boolean}
         */
        eval(checkStr, ctx) {
            if (!checkStr || typeof checkStr !== 'string') return false;

            const str = checkStr.trim();

            // ── NOT プレフィックス ──────────────────────────────────────
            if (str.startsWith('NOT ')) {
                return !_api.eval(str.slice(4).trim(), ctx);
            }

            // ── AND（左結合・最低優先度）──────────────────────────────
            // AND/OR はネストした括弧を含まない単純な平坦式を想定。
            // 括弧なし AND → 全部 true で true
            if (str.includes(' AND ')) {
                return str.split(' AND ').every(part => _api.eval(part.trim(), ctx));
            }

            // ── OR ────────────────────────────────────────────────────
            if (str.includes(' OR ')) {
                return str.split(' OR ').some(part => _api.eval(part.trim(), ctx));
            }

            // ── 単項: funcName(args...) ───────────────────────────────
            const match = str.match(/^(\w+)\(([^)]*)\)$/);
            if (!match) {
                console.warn(`[CheckEvaluator] parse failed: "${str}"`);
                return false;
            }
            const [, funcName, argsStr] = match;
            // 引数: カンマ区切り・前後スペース・クォート除去
            // 引数全体が ['a','b','c'] のような配列リテラル1個の場合は
            // 外側の角括弧を除いた中身を同じ規則でカンマ分割する。
            let args;
            if (argsStr) {
                const trimmedArgsStr = argsStr.trim();
                const arrayMatch = trimmedArgsStr.match(/^\[([^\]]*)\]$/);
                const inner = arrayMatch ? arrayMatch[1] : trimmedArgsStr;
                args = inner
                    ? inner.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, ''))
                    : [];
            } else {
                args = [];
            }

            const handler = _handlers.get(funcName);
            if (!handler) {
                console.warn(`[CheckEvaluator] unknown check: "${funcName}"`);
                return false; // 安全側
            }
            return !!handler(ctx, args);
        },
    };

    return _api;
})();

// ── 組み込みハンドラー登録 ──────────────────────────────────────────

// 直前品詞
/**
 * Phase 4C: 節スコープのトークン列を返す共通ヘルパー。
 * clause 情報がない合成コンテキストでは全トークンにフォールバックする。
 * Clause を跨ぐ検索の禁止（Phase 4 制約）はこのヘルパー経由で保証される。
 */
function _clauseTokens(ctx) {
    const toks = ctx.tokens ?? [];
    const s = Number.isInteger(ctx.clauseStart) ? ctx.clauseStart : 0;
    const e = Number.isInteger(ctx.clauseEnd)   ? ctx.clauseEnd   : toks.length - 1;
    return toks.slice(s, e + 1);
}

CheckEvaluator.register('prev_pos_eq',
    (ctx, [posCode]) => ctx.prevPos === posCode
);
CheckEvaluator.register('prev_pos_in',
    (ctx, posCodes) => posCodes.includes(ctx.prevPos)
);

// ── Phase 4B: Governor ベースの支配判定 ─────────────────────────
// prev_pos_eq('P') は「直前トークンのみ」を見るため [P][T][N] 型
// （ἐν τῷ κόσμῳ 等）の前置詞支配を見逃していた。
// ctx.governor は冠詞介在も解決済みのため、こちらを単一情報源とする。
CheckEvaluator.register('governed_by_prep',
    (ctx) => ctx.governorPOS === 'P'
);
CheckEvaluator.register('governor_lemma_in',
    (ctx, lemmas) => ctx.governorPOS === 'P' && lemmas.includes(ctx.governorLemma ?? '')
);
CheckEvaluator.register('governor_lemma_eq',
    (ctx, [lemmaVal]) => ctx.governorPOS === 'P' && (ctx.governorLemma ?? '') === lemmaVal
);

// ── Phase 5: Valency / Clause / Head 派生判定 ────────────────────

// 支配動詞（節の定形動詞）が指定格を支配するか（verb_valency 辞書参照）
CheckEvaluator.register('valency_governs',
    (ctx, [caseVal]) => {
        const vv = ctx._registry?.getVerbValency?.(ctx.governorVerb?.lemma ?? '');
        return vv?.governs_case === caseVal;
    }
);

// 節内に complement='participle' の動詞（παύω 等）があるか
CheckEvaluator.register('valency_complement_participle',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const vv = ctx._registry?.getVerbValency?.(t.lemma ?? '');
        return vv?.complement === 'participle';
    })
);

// コプラ動詞（εἰμί/γίνομαι/ὑπάρχω）の定形が同一節内にあるか。
// 注: ctx.copulaVerb（詩節先頭のコプラ）ではなく節内を直接走査する。
//   ① 詩節前半の別節コプラを誤参照しない（1CO 6:19 前半 ἐστιν 問題）
//   ② 対象分詞自身（ὤν 等）をコプラとして数えない（HEB 5:8 問題）
CheckEvaluator.register('context_has_copula',
    (ctx) => {
        const COPULA = ['εἰμί', 'γίνομαι', 'ὑπάρχω'];
        return _clauseTokens(ctx).some(t => {
            if (t === ctx.target) return false;
            if (_resolveEntryPos(t) !== 'V') return false;
            if (!COPULA.includes(t.lemma ?? '')) return false;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        });
    }
);

// 対象の節が従属節か（従属接続詞・関係代名詞開始）
CheckEvaluator.register('clause_is_subordinate',
    (ctx) => ctx.subordinateClause === true
);

// 主動詞のレンマ判定（冗語的分詞: ἀποκριθεὶς εἶπεν 型）
CheckEvaluator.register('main_verb_lemma_in',
    (ctx, lemmas) => lemmas.includes(ctx.mainVerb?.lemma ?? '')
);

// 節内に定形動詞が存在しない（命令的分詞: ROM 12:9 型）
CheckEvaluator.register('clause_lacks_finite_verb',
    (ctx) => ctx.clause?.mainVerb == null
);

// 節内に不定詞があるか（対格主語: acc + inf 構文）
CheckEvaluator.register('clause_has_infinitive',
    (ctx) => _clauseTokens(ctx).some(t => {
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'infinitive';
    })
);

// 節内に完了受動の動詞形（定形・分詞とも）があるか（行為者与格: LUK 23:15 型）
CheckEvaluator.register('clause_has_perfect_passive',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.tense === 'perfect' && m.voice === 'passive';
    })
);

// head が -τος 型動形容詞（行為者属格: διδακτοὶ θεοῦ 型・Wallace pp.126–127）
CheckEvaluator.register('head_is_verbal_adjective',
    (ctx) => /τός$|τος$/.test(ctx.headLemma ?? '')
);

// head レンマが対象より前に既出（前出指示用法・詩節内照応）
CheckEvaluator.register('head_lemma_repeated_earlier',
    (ctx) => {
        const l = ctx.headLemma ?? '';
        if (!l) return false;
        return (ctx.tokens ?? []).some((t, i) =>
            i < ctx.targetIdx && (t.lemma ?? '') === l);
    }
);

// 対象が主動詞より後方にある（副詞的分詞の手段用法等の位置ヒント）
CheckEvaluator.register('follows_main_verb',
    (ctx) => ctx.mainVerbIdx >= 0 && ctx.mainVerbIdx < ctx.targetIdx
);

// ── Phase 6: Accusative 完成用ハンドラ ───────────────────────────

// 節内に目的語補語動詞（καλέω/ποιέω/ἡγέομαι 等）があるか（valency 辞書）
CheckEvaluator.register('valency_object_complement',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        return ctx._registry?.getVerbValency?.(t.lemma ?? '')?.object_complement === true;
    })
);

// 節内に人物+事物二重対格動詞（διδάσκω/αἰτέω 等）があるか（valency 辞書）
CheckEvaluator.register('valency_double_accusative',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        return ctx._registry?.getVerbValency?.(t.lemma ?? '')?.double_accusative === 'person_thing';
    })
);

// 節内の対格「句」（連続する対格形トークンの塊）が 2 つ以上あるか。
// 二重対格構文（目的語+補語 / 人+物）の構造要件。
// "κύριον τὸν θεόν σου" は 1 塊（連続）、"ὑμᾶς … πάντα" は 2 塊。
CheckEvaluator.register('clause_has_two_acc_chunks',
    (ctx) => {
        const toks = _clauseTokens(ctx);
        let chunks = 0, inRun = false;
        for (const t of toks) {
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            const isAcc = m.case === 'accusative';
            if (isAcc && !inRun) { chunks++; inRun = true; }
            if (!isAcc) inRun = false;
        }
        return chunks >= 2;
    }
);

// 節内動詞と対象が登録済み同根ペア（cognate_pair_lemmas: "動詞|名詞" 形式）
CheckEvaluator.register('cognate_pair_match',
    (ctx) => {
        const pairs = ctx._registry?.getList?.('cognate_pair_lemmas');
        if (!pairs || pairs.size === 0) return false;
        const noun = ctx.target?.lemma ?? '';
        return _clauseTokens(ctx).some(t => {
            if (_resolveEntryPos(t) !== 'V') return false;
            return pairs.has(`${t.lemma ?? ''}|${noun}`);
        });
    }
);

// 節内に εἶναι / γίνεσθαι の不定詞があるか（述語対格: acc + inf コプラ構文）
CheckEvaluator.register('clause_has_copula_infinitive',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        if (!['εἰμί', 'γίνομαι'].includes(t.lemma ?? '')) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'infinitive';
    })
);

// ── Phase 9B: Tense/Aspect/Voice 用ハンドラ（再利用可能な統語事実のみ） ──

// 節内に現在時副詞（νῦν/ἄρτι/ἤδη/σήμερον）があるか
CheckEvaluator.register('clause_has_temporal_adverb',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['νῦν', 'ἄρτι', 'ἤδη', 'σήμερον'].includes(t.lemma ?? ''))
);

// 節内に反復標識（πολλάκις/δίς/τρίς/ὁσάκις/πάντοτε/ἀεί）があるか
CheckEvaluator.register('clause_has_iterative_marker',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['πολλάκις', 'δίς', 'τρίς', 'ὁσάκις', 'πάντοτε', 'ἀεί'].includes(t.lemma ?? ''))
);

// 節内に配分的時間表現（κατά + 時間名詞）があるか — 習慣の統語標識
CheckEvaluator.register('clause_has_distributive_temporal',
    (ctx, [listName]) => {
        const toks = _clauseTokens(ctx);
        if (!toks.some(t => (t.lemma ?? '') === 'κατά')) return false;
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return toks.some(t => list.has(t.lemma ?? ''));
    }
);

// 詩節が物語文脈か（過去直説法が 1 つ以上ある）
CheckEvaluator.register('clause_is_narrative',
    (ctx) => (ctx.tokens ?? []).some(t => {
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'indicative' && ['aorist', 'imperfect'].includes(m.tense ?? '');
    })
);

// 節内に未来参照（未来形動詞・αὔριον・μέλλω）があるか
CheckEvaluator.register('clause_has_future_reference',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (['αὔριον', 'μέλλω'].includes(t.lemma ?? '')) return true;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.tense === 'future';
    })
);

// 書き手 1 人称（書簡的アオリスト等・target_person_eq('1') の仕様別名）
CheckEvaluator.register('sender_first_person',
    (ctx) => String(ctx.morph?.person ?? '') === '1'
);

// 対象より前に過去の動詞形（アオリスト/未完了の直説法・アオリスト分詞）があるか
// — 起動的未完了の「開始点」標識
CheckEvaluator.register('past_verbal_before_target',
    (ctx) => (ctx.tokens ?? []).some((t, i) => {
        if (i >= (ctx.targetIdx ?? 0)) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        if (m.mood === 'indicative' && ['aorist', 'imperfect'].includes(m.tense ?? '')) return true;
        return m.mood === 'participle' && m.tense === 'aorist';
    })
);

// 節内に ὑπό + 属格の行為者句があるか（受動態の行為者明示）
CheckEvaluator.register('clause_has_agent_phrase',
    (ctx) => {
        const toks = _clauseTokens(ctx);
        return toks.some((t, i) => {
            if ((t.lemma ?? '') !== 'ὑπό') return false;
            for (let j = i + 1; j <= i + 3 && j < toks.length; j++) {
                const m = typeof decodeMorph === 'function' ? decodeMorph(toks[j]) : {};
                if (m.case === 'genitive') return true;
                if (_resolveEntryPos(toks[j]) !== 'T') return false;
            }
            return false;
        });
    }
);

// 節内に再帰代名詞（ἑαυτοῦ 系）があるか
CheckEvaluator.register('clause_has_reflexive',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['ἑαυτοῦ', 'σεαυτοῦ', 'ἐμαυτοῦ'].includes(t.lemma ?? ''))
);

// 節内に相互代名詞（ἀλλήλων）があるか
CheckEvaluator.register('clause_has_reciprocal_marker',
    (ctx) => _clauseTokens(ctx).some(t => (t.lemma ?? '') === 'ἀλλήλων')
);

// ── Phase 9A: Verb Mood 用ハンドラ（既存 ctx の読み取りのみ） ─────

// 独立節（従属接続詞・関係代名詞開始でない）
CheckEvaluator.register('main_clause',
    (ctx) => ctx.subordinateClause !== true
);
CheckEvaluator.register('clause_is_independent',
    (ctx) => ctx.subordinateClause !== true
);

// 節内に否定小辞（οὐ/μή 系）があるか
CheckEvaluator.register('negative_particle',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['οὐ', 'οὐκ', 'οὐχ', 'μή', 'μηδέ', 'οὐδέ'].includes(t.lemma ?? ''))
);

// 主動詞が未来形（既存 main_verb_tense_eq の別名・仕様指定）
CheckEvaluator.register('future_main_verb',
    (ctx) => {
        if (!ctx.mainVerb) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(ctx.mainVerb) : {};
        return m.tense === 'future';
    }
);

// 疑問節: 節内トークンの after に疑問符（ギリシャ語疑問符 U+037E または
// ASCII セミコロン）があるか、疑問詞（τίς/πῶς 等）が節内にあるか。
// Phase 17 修正: データの疑問符は U+037E。ASCII ';' のみの照合では句読点
// 経由の疑問検出が発火せず、疑問詞レンマ経由のみ機能していた。
const _QUESTION_MARK_RE = /[;;]/;
function _clauseIsQuestion(ctx) {
    return _clauseTokens(ctx).some(t =>
        _QUESTION_MARK_RE.test(String(t.after ?? '')) ||
        ['τίς', 'πῶς', 'ποῦ', 'πότε', 'ποῖος', 'πόθεν'].includes(t.lemma ?? ''));
}
CheckEvaluator.register('clause_is_question', _clauseIsQuestion);
CheckEvaluator.register('question_clause', _clauseIsQuestion);

// 対象が1人称複数
CheckEvaluator.register('first_person_plural',
    (ctx) => String(ctx.morph?.person ?? '') === '1' && ctx.morph?.number === 'plural'
);

// 対象の人称（'1'|'2'|'3'）
CheckEvaluator.register('target_person_eq',
    (ctx, [p]) => String(ctx.morph?.person ?? '') === String(p)
);

// 節内に ἵνα / ἐάν / 関係代名詞
CheckEvaluator.register('has_hina',
    (ctx) => _clauseTokens(ctx).some(t => (t.lemma ?? '') === 'ἵνα')
);
CheckEvaluator.register('has_ean',
    (ctx) => _clauseTokens(ctx).some(t => (t.lemma ?? '') === 'ἐάν')
);
CheckEvaluator.register('has_relative_pronoun',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['ὅς', 'ὅστις', 'ὅσπερ'].includes(t.lemma ?? ''))
);

// 詩節内に命令法動詞（対象以外）があるか
CheckEvaluator.register('is_imperative_context',
    (ctx) => (ctx.tokens ?? []).some(t => {
        if (t === ctx.target) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'imperative';
    })
);

// 祈願・切迫文脈: 詩節内に呼格がある（Πάτερ/κύριε 等の呼びかけ）
CheckEvaluator.register('is_volitive_context',
    (ctx) => (ctx.tokens ?? []).some(t => {
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.case === 'vocative';
    })
);

// 主動詞が対象より前（既存 follows_main_verb の別名・仕様指定）
CheckEvaluator.register('main_verb_before',
    (ctx) => ctx.mainVerbIdx >= 0 && ctx.mainVerbIdx < ctx.targetIdx
);

// οὐ μή が直前に連続（強調否定の定型）
CheckEvaluator.register('ou_me_before',
    (ctx) => {
        const ti = ctx.targetIdx ?? 0;
        const toks = ctx.tokens ?? [];
        return (toks[ti - 1]?.lemma ?? '') === 'μή' &&
               (toks[ti - 2]?.lemma ?? '') === 'οὐ';
    }
);

// 節頭が καί（物語の継続標識）
CheckEvaluator.register('clause_initial_kai',
    (ctx) => {
        const s = Number.isInteger(ctx.clauseStart) ? ctx.clauseStart : 0;
        return ((ctx.tokens ?? [])[s]?.lemma ?? '') === 'καί';
    }
);

// 詩節内に対象以外の過去直説法（アオリスト・未完了）があるか（物語文脈）
CheckEvaluator.register('verse_has_past_indicative',
    (ctx) => (ctx.tokens ?? []).some(t => {
        if (t === ctx.target) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'indicative' && ['aorist', 'imperfect'].includes(m.tense ?? '');
    })
);

// 節内に対象以外の現在直説法があるか（劇的アオリストの併置文脈）
CheckEvaluator.register('clause_has_present_indicative',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (t === ctx.target) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'indicative' && m.tense === 'present';
    })
);

// 詩節内に発話動詞（間接話法の母節動詞）があるか — 斜格希求法は
// 母節（別節）の動詞に依存するため、性質上のみ詩節スコープを許容する
CheckEvaluator.register('matrix_speech_verb',
    (ctx) => (ctx.tokens ?? []).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        return ['λέγω', 'ἐπερωτάω', 'ἐρωτάω', 'πυνθάνομαι', 'διαλογίζομαι']
            .includes(t.lemma ?? '');
    })
);

// ── Phase 8: Infinitive Engine 用ハンドラ（統語判定のみ） ─────────

// 節内に complement='infinitive' の補助動詞（δύναμαι/μέλλω 等）があるか
CheckEvaluator.register('valency_complement_infinitive',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        return ctx._registry?.getVerbValency?.(t.lemma ?? '')?.complement === 'infinitive';
    })
);

/**
 * 冠詞付き不定詞の後方走査: 不定詞から後方へ、μή・副詞・対格の
 * 介在語（対格主語 "πρὸ τοῦ σε Φίλιππον φωνῆσαι" / 否定 "διὰ τὸ μὴ ἔχειν"）を
 * 最大 4 語スキップし、冠詞の位置を返す。
 * @returns {number} 冠詞の index（なければ -1）
 */
function _articularInfArticleIdx(ctx) {
    const toks = ctx.tokens ?? [];
    let j = (ctx.targetIdx ?? 0) - 1, skipped = 0;
    while (j >= 0 && skipped < 4) {
        const t = toks[j];
        const pos = _resolveEntryPos(t);
        if (pos === 'T') return j;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        const skippable = (t.lemma === 'μή') || pos === 'D' ||
            (m.case === 'accusative' && ['N', 'A', 'R'].includes(pos));
        if (!skippable) return -1;
        j--; skipped++;
    }
    return -1;
}

// [前置詞][(後置小辞)*][冠詞][(μή/対格主語)*][不定詞] パターン
// （διὰ τό / ἐν τῷ / μετὰ δὲ τό 等 — μετὰ **δὲ** τὸ ἐγερθῆναι の
//   後置小辞介在にも対応する）
CheckEvaluator.register('articular_infinitive_prep_in',
    (ctx, prepLemmas) => {
        const ai = _articularInfArticleIdx(ctx);
        if (ai <= 0) return false;
        const POSTPOSITIVE = ['δέ', 'γάρ', 'οὖν', 'τε', 'μέν'];
        let k = ai - 1;
        while (k > 0 && POSTPOSITIVE.includes(ctx.tokens[k]?.lemma ?? '')) k--;
        const prep = ctx.tokens[k];
        return _resolveEntryPos(prep) === 'P' && prepLemmas.includes(prep?.lemma ?? '');
    }
);

// [τοῦ][(μή/対格)*][不定詞]（属格冠詞・前置詞なし）→ 目的の定型
CheckEvaluator.register('articular_infinitive_bare_genitive',
    (ctx) => {
        const ai = _articularInfArticleIdx(ctx);
        if (ai < 0) return false;
        const art = ctx.tokens[ai];
        const m = typeof decodeMorph === 'function' ? decodeMorph(art) : {};
        if (m.case !== 'genitive') return false;
        return ai === 0 || _resolveEntryPos(ctx.tokens[ai - 1]) !== 'P';
    }
);

// ── Phase 7: Article System 完成用ハンドラ（統語判定のみ） ────────

// 冠詞の head 名詞の直後が関係代名詞（registry リスト）または
// 一致する冠詞（第2限定位置）→ 後方照応（kataphoric）の構造標識
CheckEvaluator.register('head_followed_by_relative_or_article',
    (ctx, [listName]) => {
        const h = ctx.head?.idx ?? -1;
        if (h < 0) return false;
        const toks = ctx.tokens ?? [];
        const next = toks[h + 1];
        if (!next) return false;
        const rel = ctx._registry?.getList?.(listName);
        if (rel && rel.has(next.lemma ?? '')) return true;
        if (_resolveEntryPos(next) === 'T') {
            const hm = typeof decodeMorph === 'function' ? decodeMorph(toks[h]) : {};
            const nm = typeof decodeMorph === 'function' ? decodeMorph(next) : {};
            return hm.case === nm.case && hm.gender === nm.gender && hm.number === nm.number;
        }
        return false;
    }
);

// 冠詞名詞句に格・性・数一致の指示代名詞（registry リスト）が隣接
//（head の直後 or 冠詞の直前）→ 指示的用法（deictic）
CheckEvaluator.register('head_has_adjacent_demonstrative',
    (ctx, [listName]) => {
        const dem = ctx._registry?.getList?.(listName);
        if (!dem) return false;
        const h = ctx.head?.idx ?? -1;
        if (h < 0) return false;
        const toks = ctx.tokens ?? [];
        const hm = typeof decodeMorph === 'function' ? decodeMorph(toks[h]) : {};
        const agrees = (t) => {
            if (!t || !dem.has(t.lemma ?? '')) return false;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return m.case === hm.case && m.gender === hm.gender && m.number === hm.number;
        };
        return agrees(toks[h + 1]) || agrees(toks[ctx.targetIdx - 1]);
    }
);

// Granville Sharp TSKS 構文: [T][名詞][καί][無冠詞名詞]・格一致・単数・
// 第2名詞が非固有名詞（Wallace pp.270–290 の規則の統語的条件）
CheckEvaluator.register('tsks_construction',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const s1 = toks[ti + 1], kai = toks[ti + 2], s2 = toks[ti + 3];
        if (!s1 || !kai || !s2) return false;
        if ((kai.lemma ?? '') !== 'καί') return false;
        if (!['N', 'A'].includes(_resolveEntryPos(s1))) return false;
        if (!['N', 'A'].includes(_resolveEntryPos(s2))) return false;
        const m1 = typeof decodeMorph === 'function' ? decodeMorph(s1) : {};
        const m2 = typeof decodeMorph === 'function' ? decodeMorph(s2) : {};
        if (m1.case !== m2.case || !m1.case) return false;
        if (m1.number !== 'singular' || m2.number !== 'singular') return false;
        // 第2名詞は非固有名詞（レンマ小文字始まり）— Sharp 規則の適用範囲
        const l2 = s2.lemma ?? '';
        const c = l2.length ? l2.codePointAt(0) : 0;
        if (c >= 0x0391 && c <= 0x03A9) return false;
        return true;
    }
);

// Colwell 構文: 節内に定形コプラがあり、コプラより前に無冠詞の主格名詞
// （述語主格候補）が存在し、冠詞側の head が主格 → 冠詞は主語標識
// （Wallace pp.256–270: θεὸς ἦν ὁ λόγος）
CheckEvaluator.register('colwell_subject_article',
    (ctx) => {
        const hm = ctx.head
            ? (typeof decodeMorph === 'function' ? decodeMorph(ctx.head.token) : {})
            : {};
        if (hm.case !== 'nominative') return false;
        const toks = ctx.tokens ?? [];
        const s = Number.isInteger(ctx.clauseStart) ? ctx.clauseStart : 0;
        const e = Number.isInteger(ctx.clauseEnd) ? ctx.clauseEnd : toks.length - 1;
        // 節内の定形コプラ位置
        let cop = -1;
        for (let i = s; i <= e; i++) {
            const t = toks[i];
            if (_resolveEntryPos(t) !== 'V') continue;
            if (!['εἰμί', 'γίνομαι'].includes(t.lemma ?? '')) continue;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (m.mood && m.mood !== 'participle' && m.mood !== 'infinitive') { cop = i; break; }
        }
        if (cop < 0) return false;
        // コプラより前の無冠詞主格名詞（head 以外）
        for (let j = s; j < cop; j++) {
            const t = toks[j];
            if (j === (ctx.head?.idx ?? -1)) continue;
            if (!['N', 'A'].includes(_resolveEntryPos(t))) continue;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (m.case !== 'nominative') continue;
            if (j > 0 && _resolveEntryPos(toks[j - 1]) === 'T') continue; // 有冠詞は除外
            return true;
        }
        return false;
    }
);

// ── Phase 4A: Head ベースの隣接名詞判定 ─────────────────────────
// 旧 follows_head_noun は prev_pos_eq('N') で「直前が N」のみを判定し、
// GNT 最多数派の [N][T][gen]（冠詞介在）を見逃していた。
// ctx.head（後方 N/A/R・冠詞/副詞スキップ）を単一情報源とする。
CheckEvaluator.register('has_adnominal_head',
    (ctx) => ctx.head != null
);

// 直後品詞
CheckEvaluator.register('next_pos_in',
    (ctx, posCodes) => posCodes.includes(ctx.nextPos ?? '')
);

// 直前トークンのレンマ
CheckEvaluator.register('prev_token_lemma_in',
    (ctx, lemmas) => lemmas.includes(ctx.prevLemma ?? '')
);

// ターゲット格・時制・相・法
CheckEvaluator.register('target_case_eq',
    (ctx, [caseVal]) => ctx.morph?.case === caseVal
);
CheckEvaluator.register('target_tense_eq',
    (ctx, [tenseVal]) => ctx.morph?.tense === tenseVal
);
CheckEvaluator.register('target_tense_in',
    (ctx, tenseVals) => tenseVals.includes(ctx.morph?.tense ?? '')
);
CheckEvaluator.register('target_mood_eq',
    (ctx, [moodVal]) => ctx.morph?.mood === moodVal
);
CheckEvaluator.register('target_number_eq',
    (ctx, [numberVal]) => ctx.morph?.number === numberVal
);
CheckEvaluator.register('target_pos_eq',
    (ctx, [posVal]) => ctx.posCode === posVal
);
CheckEvaluator.register('target_is_proper_noun',
    (ctx) => {
        if (ctx.target?.type === 'proper') return true;
        // ギリシャ語固有名詞はレンマが大文字始まり（U+0391–U+03A9: Α–Ω）
        const lemma = ctx.target?.lemma ?? '';
        const code = lemma.length > 0 ? lemma.codePointAt(0) : 0;
        return code >= 0x0391 && code <= 0x03A9;
    }
);

// ターゲットのレンマがリストに含まれるか（registry の named list 参照）
CheckEvaluator.register('target_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(ctx.target?.lemma ?? '');
    }
);

// ヘッド名詞のレンマがリストに含まれるか（Phase 3: 共通 ctx.headLemma を参照）
CheckEvaluator.register('head_lemma_in_list',
    (ctx, [listName]) => {
        const lemma = ctx.headLemma || ctx.headNoun?.lemma || '';
        if (!lemma) return false;
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(lemma);
    }
);

// 動詞レンマがリストに含まれるか（Phase 4C: 節スコープに限定）
CheckEvaluator.register('verb_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return _clauseTokens(ctx).some(t => {
            return _resolveEntryPos(t) === 'V' && list.has(t.lemma ?? '');
        });
    }
);

// コンテキスト: 節内に指定レンマが存在するか（Phase 4C: 節スコープに限定）
CheckEvaluator.register('context_has_lemma_in',
    (ctx, lemmas) => _clauseTokens(ctx).some(t => lemmas.includes(t.lemma ?? ''))
);

// コンテキスト: 節内動詞レンマがリストに含まれるか（Phase 4C: 節スコープに限定。
// これにより MAT 2:8 型「別節の知覚動詞による complementary 誤発火」が解消される）
CheckEvaluator.register('context_verb_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return _clauseTokens(ctx).some(t => {
            return _resolveEntryPos(t) === 'V' && list.has(t.lemma ?? '');
        });
    }
);

// コンテキスト: ヘッド名詞レンマがリストに含まれるか（Phase 3: 共通 ctx.headLemma を参照）
CheckEvaluator.register('context_head_lemma_in_list',
    (ctx, [listName]) => {
        const lemma = ctx.headLemma || ctx.headNoun?.lemma || '';
        if (!lemma) return false;
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(lemma);
    }
);

// コンテキスト: 格・性・数が一致する名詞が存在するか（ParticipleScorer用）
// Phase 4A: 分詞は ctx.head（一致する N/A/R・冠詞除外）を単一情報源とする。
// 旧 matchingNoun は冠詞（T）にも一致したため「冠詞しか一致しない」場合に
// 形容詞用法を過大評価していた（冠詞は被修飾名詞ではない — Wallace pp.617–621）。
CheckEvaluator.register('context_has_case_gender_number_match',
    (ctx) => (ctx.morph?.mood === 'participle')
        ? ctx.head != null
        : ctx.matchingNoun != null
);

// 冠詞の直後の名詞のレンマがリストに含まれるか
// ArticleScorer 用（Phase 3: 前方スキャンは ContextBuilder の head 解決に統合済み。
// 冠詞トークンの ctx.headLemma = 直後 4 語以内の最初の N）
CheckEvaluator.register('following_noun_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        const lemma = ctx.headLemma ?? '';
        return lemma ? list.has(lemma) : false;
    }
);

// コンテキスト: 節内に属格名詞が存在するか
CheckEvaluator.register('context_has_genitive_noun',
    (ctx) => ctx.genitiveNoun != null
);

// コンテキスト: 節内に比較級形容詞（-τερ語尾）が存在するか
CheckEvaluator.register('context_has_comparative_adj',
    (ctx) => {
        // Phase 4C: 比較級の探索は節スコープに限定（別節の比較級による誤発火防止）
        const tokens = _clauseTokens(ctx);
        // Phase 10 バグ修正（Phase 7.6 で特定）: 形態素 degree フィールドを第一情報源に。
        // 旧実装は t.word（データに存在しないフィールド）参照 + アクセント付き
        // 正規表現のため、μείζων（lemma μέγας）等の不規則比較級を見逃していた。
        if (tokens.some(t => (t.degree ?? '') === 'comparative')) return true;
        if (tokens.some(t => /τερ(ος|α|ον)/.test(t.word ?? t.text ?? ''))) return true;
        // 不規則比較級（Wallace pp.110–112）— Phase 4.5D: registry を単一情報源とする
        // （genitive.comparison.detection.irregular_comparative_lemmas）
        const irr = ctx._registry?.getList?.('irregular_comparative_lemmas');
        if (!irr || irr.size === 0) return false;
        return tokens.some(t => irr.has(t.lemma ?? '') || irr.has(t.word ?? ''));
    }
);

// コンテキスト: 節内に否定・反抗語があるか
CheckEvaluator.register('context_has_negation',
    (ctx) => !!ctx.hasAdversative
);

// コンテキスト: 動詞が συν- 複合語か（Phase 4C: 節スコープに限定）
CheckEvaluator.register('context_verb_has_syn_prefix',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const l = t.lemma ?? '';
        return l.startsWith('συν') || l.startsWith('συμ') || l.startsWith('συγ')
            || l.startsWith('συλ') || l.startsWith('συρ');
    })
);

// 冠詞が格・性・数で一致するか（ParticipleScorer用）
CheckEvaluator.register('article_agrees_case_gender_number',
    (ctx) => {
        if (ctx.prevPos !== 'T') return false;
        if (!ctx.prevToken) return false;
        const pm = typeof decodeMorph === 'function' ? decodeMorph(ctx.prevToken) : {};
        return pm.case === ctx.morph?.case
            && pm.gender === ctx.morph?.gender
            && pm.number === ctx.morph?.number;
    }
);
// 冠詞が性のみで一致するか（article_agrees_case_gender_number の派生版）
CheckEvaluator.register('article_gender_matches',
    (ctx) => {
        if (ctx.prevPos !== 'T') return false;
        if (!ctx.prevToken) return false;
        const pm = typeof decodeMorph === 'function' ? decodeMorph(ctx.prevToken) : {};
        return pm.gender === ctx.morph?.gender;
    }
);
// 冠詞が数のみで一致するか（article_agrees_case_gender_number の派生版）
CheckEvaluator.register('article_number_matches',
    (ctx) => {
        if (ctx.prevPos !== 'T') return false;
        if (!ctx.prevToken) return false;
        const pm = typeof decodeMorph === 'function' ? decodeMorph(ctx.prevToken) : {};
        return pm.number === ctx.morph?.number;
    }
);

// 主動詞の時制・法
CheckEvaluator.register('main_verb_tense_eq',
    (ctx, [tenseVal]) => {
        if (!ctx.mainVerb) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(ctx.mainVerb) : {};
        return m.tense === tenseVal;
    }
);
CheckEvaluator.register('main_verb_mood_eq',
    (ctx, [moodVal]) => {
        if (!ctx.mainVerb) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(ctx.mainVerb) : {};
        return m.mood === moodVal;
    }
);
CheckEvaluator.register('main_verb_voice_eq',
    (ctx, [voiceVal]) => {
        if (!ctx.mainVerb) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(ctx.mainVerb) : {};
        return m.voice === voiceVal;
    }
);

// 属格絶対: 属格の行為者が節の主語と異なるか
CheckEvaluator.register('genitive_subject_differs_from_main_subject',
    (ctx) => {
        if (!ctx.genitiveNoun) return false;
        const subjEntry = ctx.roleMap
            ? [...ctx.roleMap.entries()].find(([, r]) => r.role === 'subj')
            : null;
        if (!subjEntry) return true; // 主語不明 → 異なると推定
        return ctx.genitiveNoun.lemma !== subjEntry[0].lemma;
    }
);

// 一致名詞との距離（Phase 4A: ctx.head の idx を単一情報源とする）
CheckEvaluator.register('distance_to_match_le',
    (ctx, [n]) => {
        const hi = ctx.head?.idx ?? -1;
        if (hi < 0) return false;
        return Math.abs(hi - ctx.targetIdx) <= Number(n);
    }
);


// =============================================================
// § 8.  CandidateNormalizer — 実装
// =============================================================

class CandidateNormalizer {
    /**
     * RawCandidate[] → Candidate[]
     *
     * @param {RawCandidate[]} rawCandidates
     * @param {SharedConfig}   shared  - registry.getShared() の結果
     * @returns {Candidate[]}          - confidence 降順・confidence > 0 のみ
     */
    normalize(rawCandidates, shared) {
        if (!Array.isArray(rawCandidates) || rawCandidates.length === 0) return [];

        // Registry の shared から正規化パラメータを取得
        const clamp     = shared?.score_clamp     ?? { min: 30, max: 99 };
        const thres     = shared?.confidence_thresholds ?? { high: 70, medium: 50 };
        const colors    = shared?.confidence_colors     ?? { high: '#a09050', medium: '#708050', low: '#607060' };

        const { min: clampMin, max: clampMax } = clamp;
        const hThr = thres.high;
        const mThr = thres.medium;

        return rawCandidates
            // rawScore = 0 は除外（設計書: rawScore=0除外）
            .filter(raw => raw.rawScore > 0)
            .map(raw => {
                // score_clamp を適用
                const clamped    = Math.min(clampMax, Math.max(clampMin, raw.rawScore));
                // confidence は 0.0〜1.0
                const confidence = clamped / 100;
                // confidence ティア判定
                const tier       = clamped >= hThr ? 'high' : clamped >= mThr ? 'medium' : 'low';
                const confColor  = colors[tier] ?? colors.low;

                return {
                    id:              raw.typeId,
                    confidence,
                    label_ja:        raw.typeDef?.label_ja        ?? '',
                    label_en:        raw.typeDef?.label_en        ?? '',
                    wallace_ref:     raw.typeDef?.wallace_ref      ?? '',
                    hint_ja:         raw.typeDef?.hint_ja          ?? '',
                    status:          raw.typeDef?.status           ?? 'stub',
                    signals_matched: raw.signalsMatched            ?? [],
                    signals_failed:  raw.signalsFailed             ?? [],
                    raw_score:       raw.rawScore,
                    alternatives:    raw.typeDef?.alternatives     ?? [],
                    xsc: {
                        deltas:           raw.deltas ?? [],
                        confidence_color: confColor,
                    },
                };
            })
            // confidence > 0 フィルタ（clampMin/100 以上なら必ず > 0 だが念のため）
            .filter(c => c.confidence > 0)
            // confidence 降順ソート
            .sort((a, b) => b.confidence - a.confidence);
    }
}


// =============================================================
// § 6.  CandidateScorer 基底 — 実装
// =============================================================

/**
 * 同点候補の順位を安定化するための小加算スコアを計算する。
 *
 * final_score = base_weight + Σ signals.value + tie_break_score
 *
 * 構成:
 *   depth_score        — detection.conditions 数による意味的特異性 [0, 0.5, 1.0]
 *   axis_priority_score — 条件 ID から推定する分析レベル [0.5, 0.7, 1.0]
 *   specificity_score   — alternatives 数の逆数（競合候補が少ない＝より固有） [0, 1]
 *
 * 合計値を 0.3 でスケーリングし、最大値を 0.9 以下に抑える。
 * これにより整数シグナル差 1pt の逆転は起こらないことが保証される。
 */
function _computeTieBreakScore(typeDef) {
    const conditions   = typeDef.detection?.conditions   ?? [];
    const alternatives = typeDef.alternatives            ?? [];

    // ── depth_score ───────────────────────────────────────────
    // conditions 数（合計）を意味的特異性の代理指標とする。
    // 多い → より限定的な文脈にしか発動しない → leaf
    const condCount = conditions.length;
    const depth_score = condCount >= 3 ? 1.0 : condCount >= 1 ? 0.5 : 0.0;

    // ── axis_priority_score ───────────────────────────────────
    // condition.id から分析レベルを推定する。
    // clause-level: 節構造・主語関係・動詞語彙に依存する条件
    // syntax-level: 頭語・一致・隣接要素に依存する条件
    // morphology:   それ以外（形態素素性のみ）→ デフォルト
    const CLAUSE_IDS = new Set([
        'genitive_participle','distinct_subject','same_subject_as_main',
        'attendant_circumstance_pattern','main_verb_aorist_imperative',
        'has_perception_verb','has_giving_verb','has_adversative',
        'complementary_ptc_verb','periphrastic_verb_present',
        'has_ina_clause','has_hoti_clause','has_indirect_discourse',
    ]);
    const SYNTAX_IDS = new Set([
        'follows_head_noun','head_is_action_noun','head_is_abstract_or_symbol',
        'head_is_partitive_trigger','article_agreement','comparative_adjective_present',
        'separation_verb_present','matching_article_noun_present','matching_noun_agrees',
        'noun_follows','article_present','anarthrous','has_article',
    ]);

    let axis_priority_score = 0.5; // morphology (default)
    for (const c of conditions) {
        if (CLAUSE_IDS.has(c.id))  { axis_priority_score = 1.0; break; }
        if (SYNTAX_IDS.has(c.id))    axis_priority_score = Math.max(axis_priority_score, 0.7);
    }

    // ── specificity_score ─────────────────────────────────────
    // alternatives が少ないほど他候補と競合せず固有 → 高スコア
    const specificity_score = 1 / (1 + alternatives.length);

    // ── 合計・スケーリング ─────────────────────────────────────
    // 生合計 max = 1 + 1 + 1 = 3 → × 0.3 → max ≈ 0.9
    const TIE_BREAK_SCALE = 0.3;
    return ((depth_score + axis_priority_score + specificity_score) / 3) * TIE_BREAK_SCALE;
}


class CandidateScorer {
    /** サブクラスが実装: このスコアラーが対象を扱えるかを返す */
    canHandle(_ctx) { return false; }

    /** サブクラスが実装: RawCandidate[] を返す */
    score(_ctx, _registry) { return []; }

    /**
     * 1つの TypeDef を評価して RawCandidate | null を返す。
     * null: required_case/required_mood/required_pos 不一致で対象外。
     */
    _evaluateType(typeDef, ctx) {
        const det = typeDef.detection ?? {};

        // ── required_case / required_mood / required_pos チェック ──────
        if (det.required_case && ctx.morph?.case !== det.required_case) return null;
        if (det.required_mood && ctx.morph?.mood !== det.required_mood) return null;
        if (det.required_pos  && ctx.posCode        !== det.required_pos)  return null;

        // ── stub: シグナル評価なし・default_confidence を rawScore とする ─
        if (typeDef.status === 'stub') {
            return {
                typeId:         typeDef.id,
                rawScore:       (typeDef.xsc?.default_confidence ?? 0) + _computeTieBreakScore(typeDef),
                signalsMatched: [],
                signalsFailed:  [],
                deltas:         [],
                typeDef,
            };
        }

        // ── exclusions: 1件でも true なら rawScore = 0 ──────────────────
        for (const excl of det.exclusions ?? []) {
            if (this._evalCheck(excl.check, ctx)) {
                return {
                    typeId:         typeDef.id,
                    rawScore:       0,
                    signalsMatched: [],
                    signalsFailed:  [excl.id],
                    deltas:         [],
                    typeDef,
                };
            }
        }

        // ── signals 評価: base_weight から積み上げ ────────────────────
        let score       = typeDef.xsc?.base_weight ?? 0;
        const matched   = [];
        const failed    = [];
        const deltas    = [];
        const signals   = typeDef.xsc?.signals    ?? [];
        const conditions = det.conditions          ?? [];

        for (const signal of signals) {
            const condition = conditions.find(c => c.id === signal.id);
            if (condition) {
                const hit = this._evalCheck(condition.check, ctx);
                if (hit) {
                    score += signal.value;
                    matched.push(signal.id);
                    deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja ?? '' });
                } else {
                    failed.push(signal.id);
                }
            } else {
                // condition なし → 常に加算
                score += signal.value;
                deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja ?? '' });
            }
        }

        return { typeId: typeDef.id, rawScore: score + _computeTieBreakScore(typeDef), signalsMatched: matched, signalsFailed: failed, deltas, typeDef };
    }

    /**
     * check 文字列を CheckEvaluator 経由で評価する。
     */
    _evalCheck(checkStr, ctx) {
        return CheckEvaluator.eval(checkStr, ctx);
    }
}


// =============================================================
// § 6.  GenitiveScorer — 実装
// =============================================================

class GenitiveScorer extends CandidateScorer {
    /** 属格名詞にのみ対応する（冠詞は ArticleScorer が担当するため除外） */
    canHandle(ctx) {
        return ctx.morph?.case === 'genitive' && ctx.posCode !== 'T';
    }

    /**
     * Registry の genitive カテゴリ全 type を評価して RawCandidate[] を返す。
     *
     * @param {AnalysisContext} ctx
     * @param {RegistryLoader}  registry
     * @returns {RawCandidate[]}
     */
    score(ctx, registry) {
        const types = registry.getTypesForCase('genitive');
        if (!types || types.length === 0) return [];

        // registry の getList 参照を ctx に注入（head_lemma_in_list 等で使用）
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });

        const results = types
            // priority 昇順で評価（数値が小さい方が先）
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            // null（対象外）と rawScore = 0 を除外
            .filter(result => result !== null && result.rawScore > 0);

        // Phase 2: genitive.absolute 誤発火抑制
        // ① target が分詞形の場合 → ParticipleScorer の participle.genitive_absolute に委譲
        // ② target が名詞形の場合 → 近接 3 語以内に属格分詞がない場合は抑制
        //    (genitive.absolute は属格分詞＋属格名詞の構文を対象とするため)
        const gaCand = results.find(r => r.typeId === 'genitive.absolute');
        if (gaCand) {
            if (enrichedCtx.morph?.mood === 'participle') {
                // 分詞は ParticipleScorer が担当するため GenitiveScorer 側では除外
                gaCand.rawScore = 0;
            } else {
                // 名詞: 同一属格句（GenP）内に独立属格分詞がなければ非属格絶対構文として抑制。
                // Phase 4E: 旧「±3語以内」の距離窓を ctx.genitivePhrases（連続属格句・
                // 後置小辞透過）ベースに置換。GA は連続する属格句として実現される
                // （Wallace pp.654–655）ため、句境界が距離窓より正確な判定単位になる。
                // substantival 除外（旧 Phase 8 の Case 1/2）は句内判定として維持:
                //   Case 1: "τοῦ [ptc]"（冠詞直後）→ 限定用法 → GA 根拠にならない
                //   Case 2: "τοῦ νῦν ἐνεργοῦντος"（冠詞+副詞介在・格一致）→ 同上
                const ti   = enrichedCtx.targetIdx;
                const toks = enrichedCtx.tokens ?? [];
                const gp   = (enrichedCtx.genitivePhrases ?? [])
                    .find(p => ti >= p.start && ti <= p.end);
                let hasGaParticipleInPhrase = false;
                if (gp) {
                    for (let i = gp.start; i <= gp.end; i++) {
                        if (i === ti) continue;
                        const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
                        if (!(m.mood === 'participle' && m.case === 'genitive')) continue;
                        // Case 1: 直前が冠詞 → substantival → 除外
                        if (i > 0 && _resolveEntryPos(toks[i - 1]) === 'T') continue;
                        // Case 2: 2語前が冠詞 + 直前が非名詞系 + 格一致 → substantival → 除外
                        if (i >= 2) {
                            const p1 = _resolveEntryPos(toks[i - 1]);
                            const p2 = _resolveEntryPos(toks[i - 2]);
                            const p1isNonNominal = (p1 === 'D' || p1 === 'C' || p1 === 'X' || p1 === 'P');
                            if (p2 === 'T' && p1isNonNominal) {
                                const artCase = typeof decodeMorph === 'function'
                                    ? (decodeMorph(toks[i - 2])?.case ?? '')
                                    : '';
                                if (artCase === m.case) continue;
                            }
                        }
                        hasGaParticipleInPhrase = true;
                        break;
                    }
                }
                if (!hasGaParticipleInPhrase) gaCand.rawScore = 0;
            }
        }

        // Phase 6a: genitive.subjective / genitive.objective 誤発火抑制
        // agentive_semantics / patient_semantics が無条件発火するため
        // 構造的条件を後処理で補う。
        //
        // 抑制条件 ①: 前置詞支配属格 (isAfterPrep)
        //   前置詞が格の意味を決定するため subjective/objective は非適用。
        //   例: ἐκ βραχίονος, δι' ἔργων, μετὰ αὐτῶν
        //
        // 抑制条件 ②: head noun が action_noun_lemmas に存在しない
        //   Wallace GGBB pp.113-121: 動作名詞 head がなければ
        //   subjective/objective は構造的に成立しない。
        {
            const subj = results.find(r => r.typeId === 'genitive.subjective');
            const obj  = results.find(r => r.typeId === 'genitive.objective');
            if (subj || obj) {
                // Phase 4B: isAfterPrep（直前のみ）→ governor（冠詞介在の前置詞句も捕捉）
                const suppress = (enrichedCtx.governorPOS === 'P') ||
                    !registry.getList('action_noun_lemmas').has(
                        enrichedCtx.headLemma ?? ''
                    );
                if (suppress) {
                    if (subj) subj.rawScore = 0;
                    if (obj)  obj.rawScore  = 0;
                }
            }
        }

        // Phase 6c: genitive.possessive 降格（動作名詞ヘッド）
        // Wallace §4.B.1: ヘッドが動作名詞のとき subjective/objective が構造的に優先される。
        // possessive は所有関係を表し動作名詞とは相性が悪いため、
        // subjective または objective がスコアを持つ場合に possessive を降格する。
        {
            const poss = results.find(r => r.typeId === 'genitive.possessive');
            if (poss && poss.rawScore > 0) {
                const headLemma = enrichedCtx.headLemma ?? '';
                const isActionNounHead = registry.getList('action_noun_lemmas').has(headLemma);
                if (isActionNounHead) {
                    const subj = results.find(r => r.typeId === 'genitive.subjective' && r.rawScore > 0);
                    const obj  = results.find(r => r.typeId === 'genitive.objective'  && r.rawScore > 0);
                    if (subj || obj) {
                        // possessive を subjective/objective の最大スコアより低くする
                        const rival = Math.max(subj?.rawScore ?? 0, obj?.rawScore ?? 0);
                        if (poss.rawScore >= rival) {
                            poss.rawScore = Math.max(1, rival - 10);
                        }
                        if (typeof console !== 'undefined' && console.debug) {
                            console.debug(
                                '[SyntaxAnalyzer] Phase6c: action_noun_head=%s → possessive降格 %d→%d (subj=%d obj=%d)',
                                headLemma,
                                results.find(r => r.typeId === 'genitive.possessive')?.rawScore,
                                poss.rawScore,
                                subj?.rawScore ?? 0,
                                obj?.rawScore  ?? 0
                            );
                        }
                    }
                }
            }
        }

        // Phase 6b: genitive.source / genitive.separation 競合抑制
        // Wallace §4.C.6-4: Separation (Ablative) は広義のデフォルト。Source は起源特定の特殊例。
        // 分離動詞あり → separation 優先（src 抑制）。
        // 分離動詞なし → separation がデフォルト勝者（src を降格）。
        {
            const src = results.find(r => r.typeId === 'genitive.source');
            const sep = results.find(r => r.typeId === 'genitive.separation');
            if (src && sep && src.rawScore > 0 && sep.rawScore > 0) {
                // Phase 4.5D: ハードコード複製を廃止し registry を単一情報源とする
                const sepVerbs = registry.getList('separation_verb_lemmas') ?? new Set();
                const hasSepVerb = !!enrichedCtx.tokens?.some(
                    t => sepVerbs.has(t.lemma ?? '')
                );
                if (hasSepVerb) {
                    src.rawScore = 0;  // 分離動詞あり: source 抑制
                } else {
                    src.rawScore = Math.min(src.rawScore, sep.rawScore - 1); // separation をデフォルト優先
                }
            }
        }

        return results.filter(r => r.rawScore > 0);
    }
}


// =============================================================
// § 6.  DativeScorer — 実装
// =============================================================

class DativeScorer extends CandidateScorer {
    /**
     * 与格名詞にのみ対応する。
     * ParticipleScorer より先に登録されていても、分詞は morph.case が
     * 'dative' であると同時に morph.mood が 'participle' になる場合があるが、
     * SyntaxAnalyzer は scorers 配列の先頭一致で停止するため登録順に依存する。
     * 設計書の scorers 配列順（Genitive → Dative → Participle）を維持すること。
     */
    canHandle(ctx) {
        return ctx.morph?.case === 'dative' && ctx.posCode !== 'T';
    }

    /**
     * Registry の dative カテゴリ全 type を評価して RawCandidate[] を返す。
     *
     * @param {AnalysisContext} ctx
     * @param {RegistryLoader}  registry
     * @returns {RawCandidate[]}
     */
    score(ctx, registry) {
        // RegistryLoader 経由で dative カテゴリの全 type を取得
        const types = registry.getTypesForCase('dative');
        if (!types || types.length === 0) return [];

        // _registry を ctx に注入:
        //   - context_verb_lemma_in_list('giving_verb_lemmas') などのリスト参照で使用
        //   - target_lemma_in_list('temporal_noun_lemmas') など
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });

        const results = types
            // priority 昇順で評価（数値が小さい方が先）
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            // 各 type を基底クラスの _evaluateType で評価:
            //   1. required_case/required_mood/required_pos チェック
            //   2. stub → default_confidence を rawScore とする
            //   3. exclusions → 1件でも true なら rawScore = 0
            //   4. detection.signals を評価し base_weight から weight 加算
            //   5. RawCandidate { typeId, rawScore, signalsMatched, signalsFailed, deltas, typeDef } を返す
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            // null（required_* 不一致で対象外）と rawScore = 0 を除外
            .filter(result => result !== null && result.rawScore > 0);

        // Phase 3: 手段的与格の優先補正
        // πίστις / χάρις / δύναμις / πνεῦμα など道具的意味の強い名詞を
        // dative.sphere / dative.manner より dative.means が勝つよう補正する。
        // Phase 4.5D: 語彙リストは registry（dative.means.detection.
        // instrumental_noun_lemmas）を単一情報源とする。
        const INSTRUMENTAL_LEMMAS =
            registry.getList('instrumental_noun_lemmas') ?? new Set();
        const targetLemma = enrichedCtx.target?.lemma ?? '';
        // Phase 4F: 旧実装は「ἐν が target より前のどこかにある」という詩節全域
        // スキャンで補正を抑止していた（無関係な ἐν 句でも抑止される過剰判定）。
        // ctx.governor / ctx.phrase により「target 自身が前置詞句に属するか」を
        // 直接判定する。前置詞支配下なら格でなく前置詞が意味を決定するため
        // 道具的補正は非適用（Wallace: 前置詞句は前置詞の章の管轄）。
        const inPrepPhrase = enrichedCtx.governorPOS === 'P' ||
                             enrichedCtx.phrase?.type === 'PP';
        if (INSTRUMENTAL_LEMMAS.has(targetLemma) && !inPrepPhrase) {
            const means  = results.find(r => r.typeId === 'dative.means');
            const sphere = results.find(r => r.typeId === 'dative.sphere');
            const manner = results.find(r => r.typeId === 'dative.manner');
            // means: 45 + 35 = 80 (sphere の最大 65, manner の最大 75 を超える)
            if (means)  means.rawScore  += 35;
            if (sphere) sphere.rawScore  = Math.max(0, sphere.rawScore - 20);  // 65 → 45
            // χάρις 等が manner_noun_lemmas に含まれる場合も manner を抑制
            if (manner) manner.rawScore  = Math.max(0, manner.rawScore - 20);  // 75 → 55
        }

        return results;
    }
}


// =============================================================
// § 6.  ParticipleScorer — 実装
// =============================================================

class ParticipleScorer extends CandidateScorer {
    /**
     * 分詞（mood === 'participle'）にのみ対応する。
     * 格（case）には依存しない。属格分詞・主格分詞・与格分詞すべてを扱う。
     */
    canHandle(ctx) {
        return ctx.morph?.mood === 'participle';
    }

    /**
     * Registry の participle カテゴリ全 type を評価して RawCandidate[] を返す。
     *
     * @param {AnalysisContext} ctx
     * @param {RegistryLoader}  registry
     * @returns {RawCandidate[]}
     */
    score(ctx, registry) {
        // RegistryLoader 経由で participle カテゴリの全 type を取得
        // getTypesForMood('participle') は #resolveMoodCategory により
        // categories.participle の全 type を返す
        const types = registry.getTypesForMood('participle');
        if (!types || types.length === 0) return [];

        // _registry を ctx に注入:
        //   - context_verb_lemma_in_list('perception_verb_lemmas') などのリスト参照で使用
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });

        const results = types
            // priority 昇順で評価（数値が小さい方が先）
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);

        // Phase 2: participle.genitive_absolute 誤発火抑制
        // 属格絶対構文は原則無冠詞。冠詞付き属格分詞は限定用法（attributive）のため抑制。
        if (enrichedCtx.hasArticleBefore) {
            const ga = results.find(r => r.typeId === 'participle.genitive_absolute');
            if (ga) ga.rawScore = 0;
        }

        return results.filter(r => r.rawScore > 0);
    }
}


// =============================================================
// § 6m.  DiscourseScorer — 談話構造スコアラー（Phase 19 新設・Engine Extension）
// =============================================================
//
// Engine Extension: Discourse / Information Structure。
// GGBB に「談話」の独立章は存在しない。Wallace が各章で個別に扱う
// 語順・強調・談話的特徴（懸垂主格 pp.51–53・歴史的現在 pp.526–532・
// 状況分詞 pp.622–625・μέν…δέ p.672 等）のうち統語だけで検出可能な
// ものを横断的に整理した本エンジン独自レイヤーである
// （前置・転位・挿入・μέν…δέ 対比・背景/前景）。
// 意味解析・談話内容の解釈は行わない。アンカーは
//   V（背景/前景/挿入句）・N/R（前置・転位）・μέν/δέ（対比）。
// 既存カテゴリの判定は置き換えず談話層として並走する。

class DiscourseScorer extends CandidateScorer {
    canHandle(ctx) {
        const pos = ctx.posCode;
        // A は右方転位の語彙的再指定（τόν ποτε τυφλόν = 独立用法形容詞）用
        if (['V', 'N', 'R', 'A'].includes(pos)) return true;
        return ['μέν', 'δέ'].includes(ctx.target?.lemma ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('discourse');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6l.  NominalSyntaxScorer — 名詞句構造スコアラー（Phase 18 新設・Engine Extension）
// =============================================================
//
// Engine Extension: Nominal Syntax。GGBB に「Nominal Syntax」という
// 章は存在しない。名詞句（NP）全体を横断解析するために本エンジンで
// 追加した独自レイヤーである（参照箇所: 冠詞 pp.206–254・修飾位置
// pp.306–314・名詞化 pp.231–238 等）。名詞句全体の構造を分類する。
// 既存カテゴリ（Article/Genitive/Adjective/…）の判定は置き換えず、
// 名詞句ヘッドにのみ候補を追加する: 名詞（N）、および冠詞に名詞化された
// 形容詞・分詞・前置詞句（οἱ πτωχοί / ὁ λέγων / τοῖς ἐν τῇ οἰκίᾳ）。
// 判定は Phrase API（ctx.phrase / genitivePhrases / samePhrase）の
// 読み取りのみで行う。

class NominalSyntaxScorer extends CandidateScorer {
    canHandle(ctx) {
        if (ctx.posCode === 'N') return true;
        // 名詞化ヘッド候補: 冠詞直前置の形容詞・前置詞・分詞
        if (ctx.prevPos !== 'T') return false;
        if (ctx.posCode === 'A' || ctx.posCode === 'P') return true;
        return ctx.posCode === 'V' && ctx.morph?.mood === 'participle';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('nominal_syntax');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6k.  ParticleScorer — 小辞スコアラー（Phase 17 新設）
// =============================================================
//
// Wallace §Particles（否定 pp.468–469・疑問 pp.465–468・強調/談話 pp.670–674）。
// 小辞トークン自身を分類する（否定・条件・疑問・焦点化・強調）。
// データ上の品詞クラスは adv/conj/ptcl/adj に分散するため、
// posCode ではなくレンマの閉クラス集合でゲートする（4.5D 前例）。
// δέ/μέν/γάρ/οὖν/τέ/ἐάν は接続詞層（ConjunctionScorer）とも並走し、
// 節層（ClauseScorer）を含む多層構造をなす。

const _PARTICLE_LEMMAS = new Set([
    'δέ', 'μέν', 'γάρ', 'οὖν', 'τέ', 'τε', 'γέ', 'γε', 'δή', 'τοι', 'περ',
    'μή', 'οὐ', 'οὐκ', 'οὐχ', 'ἄν', 'ἆρα', 'ἦ', 'μήτι',
    'ἐάν', 'μόνον', 'μόνος',
]);

class ParticleScorer extends CandidateScorer {
    canHandle(ctx) {
        return _PARTICLE_LEMMAS.has(ctx.target?.lemma ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('particle');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6j.  ConjunctionScorer — 接続詞スコアラー（Phase 16 新設）
// =============================================================
//
// Wallace §Conjunctions (pp.666–678)。
// 接続詞トークン自身を分類する（等位/従属）。節側の分類（clause.*）は
// ClauseScorer が同一トークンに対して並走し、二層構造をなす。
// 下の閉クラス集合は 12 型のレンマの合併（文法機能語の定数・4.5D 前例）。
// リスト外の接続詞（ἤ・οὐδέ・ἄρα 等）に床候補ノイズを出さないためのゲート。

const _CONJUNCTION_LEMMAS = new Set([
    'καί', 'τε', 'ἀλλά', 'δέ', 'οὖν', 'γάρ', 'μέν',
    'ἵνα', 'ὅπως', 'ὅτι', 'ὡς', 'ὅτε', 'ὅταν',
    'εἰ', 'ἐάν', 'ὥστε', 'καθώς', 'καθάπερ', 'ὥσπερ',
]);

class ConjunctionScorer extends CandidateScorer {
    canHandle(ctx) {
        if (ctx.posCode !== 'C') return false;
        return _CONJUNCTION_LEMMAS.has(ctx.target?.lemma ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('conjunction');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6i.  PrepositionScorer — 前置詞スコアラー（Phase 15 新設）
// =============================================================
//
// Wallace §Prepositions (pp.355–389)。
// 前置詞そのものの統語機能のみ（固有/非固有・目的語の格支配・
// 前置詞句の副詞的/形容詞的/名詞的機能）。格側の意味分類
// （genitive.agency 等）は既存の格カテゴリが扱い、ここでは触れない。
// 固有/非固有のレンマ判定は registry の check 文字列内リテラル配列で行う。

class PrepositionScorer extends CandidateScorer {
    canHandle(ctx) {
        return ctx.posCode === 'P';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('preposition');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6h.  ClauseScorer — 節構文スコアラー（Phase 14 新設）
// =============================================================
//
// Wallace §Clause Syntax + Conditional Sentences (pp.656–712)。
// アンカーは従属標識トークン（従属接続詞・関係代名詞）。
// 下の閉クラス集合は文法機能語の定数（Phase 4.5D の前例に従う）—
// καί/δέ 等の等位接続詞を除外し、節構文の候補ノイズを防ぐ。

const _CLAUSE_ANCHOR_LEMMAS = new Set([
    'εἰ', 'εἴπερ', 'ἐάν', 'ἐάνπερ', 'ὅτι', 'ἵνα', 'ὅπως', 'ὥστε',
    'ὅταν', 'ἐπάν', 'ὅτε', 'καθώς', 'καθάπερ', 'ὥσπερ',
    'ὅς', 'ὅστις', 'ὅσπερ',
]);

class ClauseScorer extends CandidateScorer {
    canHandle(ctx) {
        if (!['C', 'R'].includes(ctx.posCode)) return false;
        return _CLAUSE_ANCHOR_LEMMAS.has(ctx.target?.lemma ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('clause');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6g.  VocativeScorer — 呼格スコアラー（Phase 13 新設）
// =============================================================
//
// Wallace §Vocative (pp.65–71)。
// 呼格タグの名詞 + 感嘆 ὦ 直後の主格名詞（Ὦ βάθος 型）を対象とする。

class VocativeScorer extends CandidateScorer {
    canHandle(ctx) {
        if (ctx.posCode !== 'N') return false;
        const c = ctx.morph?.case ?? '';
        if (c === 'vocative') return true;
        // 感嘆 Ὦ + 主格（ROM 11:33 Ὦ βάθος）のみ主格を受ける
        return c === 'nominative' &&
            ((ctx.tokens ?? [])[(ctx.targetIdx ?? 0) - 1]?.lemma ?? '') === 'ὦ';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('vocative');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6f.  NominativeScorer — 主格スコアラー（Phase 12 新設）
// =============================================================
//
// Wallace §Nominative (pp.36–64)。
// 名詞（N）の主格のみ対象（形容詞・代名詞・分詞の主格は各カテゴリが扱う）。

class NominativeScorer extends CandidateScorer {
    /** 名詞の主格（+ 主格同形の呼格タグ = 呼格代用の受け皿）を対象とする */
    canHandle(ctx) {
        return ctx.posCode === 'N' &&
            ['nominative', 'vocative'].includes(ctx.morph?.case ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('nominative');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6e.  PronounScorer — 代名詞スコアラー（Phase 11 新設）
// =============================================================
//
// Wallace §Pronouns (pp.315–354)。
// ἕκαστος・ἐμός・限定位置 αὐτός はデータ上 adj タグのため R と A の
// 両方を対象とする（型側のレンマ条件で厳密にゲートされる）。

class PronounScorer extends CandidateScorer {
    canHandle(ctx) {
        return ctx.posCode === 'R' || ctx.posCode === 'A';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('pronoun');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6d.  AdjectiveScorer — 形容詞スコアラー（Phase 10 新設）
// =============================================================
//
// Wallace §Adjective (pp.291–314)。
// 判定は一致（格・性・数）・語順・冠詞・句境界のみ。

class AdjectiveScorer extends CandidateScorer {
    /** 形容詞（pos='A'）にのみ対応する */
    canHandle(ctx) {
        return ctx.posCode === 'A';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('adjective');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6c.  VerbScorer — 定形動詞（法）スコアラー（Phase 9A 新設）
// =============================================================
//
// Wallace Moods (pp.443–493) + 時制用法 (pp.514–565)。
// registry の categories.verb（required_mood で法ごとにゲート）を評価する。
// 判定は法・時制・人称・小辞・節構造のみ（意味論なし）。

class VerbScorer extends CandidateScorer {
    /** 定形動詞（直説法・命令法・接続法・希求法）にのみ対応する */
    canHandle(ctx) {
        return ctx.posCode === 'V' &&
            ['indicative', 'imperative', 'subjunctive', 'optative']
                .includes(ctx.morph?.mood ?? '');
    }

    score(ctx, registry) {
        const types = registry.getTypesForCategory('verb');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6b.  InfinitiveScorer — 不定詞スコアラー（Phase 8 新設）
// =============================================================
//
// Wallace §34 The Infinitive (pp.587–611)。
// 判定は前置詞+冠詞パターン・valency（補語動詞）・節構造のみ。

class InfinitiveScorer extends CandidateScorer {
    /** 不定詞（mood === 'infinitive'）にのみ対応する */
    canHandle(ctx) {
        return ctx.morph?.mood === 'infinitive';
    }

    score(ctx, registry) {
        const types = registry.getTypesForMood('infinitive');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 6a.  AccusativeScorer — 対格スコアラー（Phase 5 新設）
// =============================================================
//
// Wallace §5 Accusative (pp.176–205)。
// Phase 4.5 で Context API（head/governor/clause/phrase/valency）が
// 安定化したため、ContextBuilder を変更せずカテゴリ追加のみで実装できる。

class AccusativeScorer extends CandidateScorer {
    /** 対格名詞・形容詞・代名詞に対応する（冠詞は ArticleScorer が担当） */
    canHandle(ctx) {
        return ctx.morph?.case === 'accusative' && ctx.posCode !== 'T';
    }

    score(ctx, registry) {
        const types = registry.getTypesForCase('accusative');
        if (!types || types.length === 0) return [];
        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });
        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 3a.  ArticleScorer — 冠詞用法スコアラー
// =============================================================

class ArticleScorer extends CandidateScorer {
    /** 定冠詞（pos='T'）にのみ対応する */
    canHandle(ctx) {
        return ctx.posCode === 'T';
    }

    /**
     * Registry の article カテゴリ全 type を評価して RawCandidate[] を返す。
     *
     * @param {AnalysisContext} ctx
     * @param {RegistryLoader}  registry
     * @returns {RawCandidate[]}
     */
    score(ctx, registry) {
        const types = registry.getTypesForCategory('article');
        if (!types || types.length === 0) return [];

        const enrichedCtx = Object.assign(Object.create(ctx), { _registry: registry });

        return types
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            .filter(result => result !== null && result.rawScore > 0);
    }
}


// =============================================================
// § 3b.  _resolveEntryPos — POS コード解決ヘルパー
// =============================================================

/**
 * トークンの POS コードを解決する。
 * entryPosCode グローバルが利用可能な場合はそれを優先する。
 * 利用不可（Node.js テスト環境など）は morph 文字列と直接フィールドから推定する。
 *
 * morph 文字列の形式: "V-AOP-NPM" / "N-GSM" / "PREP" / "CONJ" / "ADV" など
 * 先頭セグメントが POS コード:
 *   - 単一文字 (V/N/A/T/P/R/D/X/I/B) → そのまま返す
 *   - "PREP" / "COND" → 前置詞 'P'
 *   - "CONJ"          → 接続詞 'C'
 *   - "ADV" / "PRT"   → 副詞・助詞 'D'
 *   - "PART" / "INJ"  → 不変化詞 'X'
 */
function _resolveEntryPos(t) {
    if (!t || typeof t !== 'object') return '';
    if (typeof entryPosCode === 'function') {
        const r = entryPosCode(t);
        if (r) return r;
    }
    if (t.pos) return String(t.pos).replace(/-$/, '').toUpperCase();
    if (typeof t.morph === 'string' && t.morph) {
        const seg = t.morph.split('-')[0];
        if (seg === 'PREP' || seg === 'COND') return 'P';
        if (seg === 'CONJ') return 'C';
        if (seg === 'ADV' || seg === 'PRT') return 'D';
        if (seg === 'PART' || seg === 'INJ') return 'X';
        if (seg.length === 1) return seg;
    }
    // 動詞固有フィールドが存在すれば動詞と判定
    if (t.mood || t.tense || t.voice) return 'V';
    return '';
}


// =============================================================
// § 4.  ContextBuilder — 実装
// =============================================================

/**
 * ContextBuilder
 *
 * 役割: AnalysisInput からスコアラーが参照するコンテキスト情報を
 *       事前に計算してまとめる。
 */
const ContextBuilder = (() => {

    // コプラ動詞レンマセット（findCopulaVerb 相当）
    const COPULA_LEMMAS = new Set([
        'εἰμί','εἶναι','ἐστιν','ἐστί','εἰσίν','ἦν','ἦσαν','ἔσται',
        'γίνομαι','γίνεσθαι','γίγνομαι',
    ]);

    /** 節の主動詞（分詞・不定詞以外の定形動詞）を返す */
    function _findMainVerb(tokens) {
        return tokens.find(t => {
            const pos = _resolveEntryPos(t);
            const m   = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return pos === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        }) ?? null;
    }

    /** コプラ動詞を返す */
    function _findCopulaVerb(tokens) {
        return tokens.find(t => {
            const pos = _resolveEntryPos(t);
            if (pos !== 'V') return false;
            const lemma = (t.lemma ?? '').trim();
            const word  = typeof cleanText === 'function' ? cleanText(t) : (t.word ?? '');
            return COPULA_LEMMAS.has(lemma) || COPULA_LEMMAS.has(word);
        }) ?? null;
    }

    /**
     * 格・性・数が一致する名詞を探す（分詞専用）
     * @returns {{ matchingNoun: TokenEntry|null, matchScore: number }}
     */
    function _findMatchingNoun(target, tokens, targetIdx, morph) {
        if (!morph.case || !morph.gender || !morph.number) {
            return { matchingNoun: null, matchScore: 0 };
        }
        let best = null;
        let bestDist = Infinity;
        tokens.forEach((t, i) => {
            if (i === targetIdx) return;
            const pos = _resolveEntryPos(t);
            if (!['N','T','A','R','D'].includes(pos)) return;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (m.case === morph.case && m.gender === morph.gender && m.number === morph.number) {
                const dist = Math.abs(i - targetIdx);
                if (dist < bestDist) { bestDist = dist; best = t; }
            }
        });
        return { matchingNoun: best, matchScore: best ? Math.max(0, 10 - bestDist) : 0 };
    }

    /** 属格名詞を探す（属格絶対用）—— 自分自身は除く */
    function _findGenitiveNoun(tokens, targetIdx) {
        return tokens.find((t, i) => {
            if (i === targetIdx) return false;
            const pos = _resolveEntryPos(t);
            if (!['N','A','R','D','P'].includes(pos)) return false;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return m.case === 'genitive';
        }) ?? null;
    }

    /** 知覚・認識動詞を探す */
    function _findPerceptionVerb(tokens, _targetIdx, perceptionLemmas) {
        if (!perceptionLemmas || perceptionLemmas.size === 0) return null;
        return tokens.find(t => {
            return _resolveEntryPos(t) === 'V' && perceptionLemmas.has(t.lemma ?? '');
        }) ?? null;
    }

    /** ヘッド名詞を探す（属格用：直前の名詞系トークン） */
    function _findHeadNoun(tokens, targetIdx) {
        for (let i = targetIdx - 1; i >= 0; i--) {
            const pos = _resolveEntryPos(tokens[i]);
            if (['N','A','R'].includes(pos)) return tokens[i];
            if (!['T','D'].includes(pos)) break; // 冠詞・副詞は飛ばす、それ以外で中断
        }
        return null;
    }

    // ═════════════════════════════════════════════════════════════
    // Phase 3 Context Engine — Head / Governor / Clause / Phrase
    // ═════════════════════════════════════════════════════════════

    /** 従属接続詞レンマ（節境界の開始標識） */
    const _SUBORDINATOR_LEMMAS = new Set([
        'ὅτι', 'ἵνα', 'ἐάν', 'εἰ', 'ὅταν', 'ὅτε', 'καθώς', 'ἐπεί', 'ἐπειδή',
        'ὥστε', 'ὅπως', 'πρίν', 'ἕως', 'μήποτε', 'ὅπου', 'ἐπάν', 'καθάπερ', 'ἡνίκα',
        'καίπερ', 'καίτοι',  // 譲歩小辞（καίπερ ὢν υἱός — 譲歩分詞節を従属節扱いにする）
    ]);
    /** 関係代名詞レンマ（節境界の開始標識） */
    const _RELATIVE_LEMMAS = new Set(['ὅς', 'ὅστις', 'ὅσπερ', 'οἷος', 'ὅσος']);

    /** トークン直後に節区切りの句読点（·.,;:）があるか（データの after フィールド） */
    function _hasClauseBreakAfter(t) {
        return /[·.,;:!?;]/.test(String(t?.after ?? ''));
    }

    /**
     * トークンが節の開始標識か:
     *   ① 従属接続詞・関係代名詞
     *   ② 文頭大文字語（text が大文字始まり かつ lemma が小文字始まり
     *      = 固有名詞ではなく文頭大文字化された語。句読点欠落時の補強）
     */
    function _isClauseOpener(t) {
        const lemma = String(t?.lemma ?? '');
        if (_SUBORDINATOR_LEMMAS.has(lemma) || _RELATIVE_LEMMAS.has(lemma)) return true;
        const txt = String(t?.text ?? t?.word ?? '');
        if (txt && lemma) {
            const tc = txt[0], lc = lemma[0];
            if (tc !== tc.toLowerCase() && lc === lc.toLowerCase()) return true;
        }
        return false;
    }

    /**
     * targetIdx を含む節の範囲を返す（実装3: Clause Segmentation）。
     * 区切り: 句読点（after フィールド）・従属接続詞・関係代名詞・文頭大文字。
     * @returns {{ start: number, end: number, subordinate: boolean }}
     */
    function _segmentClause(tokens, targetIdx) {
        let start = 0, end = tokens.length - 1;
        for (let i = targetIdx; i >= 1; i--) {
            if (_hasClauseBreakAfter(tokens[i - 1]) || _isClauseOpener(tokens[i])) {
                start = i;
                break;
            }
        }
        for (let i = targetIdx; i < tokens.length; i++) {
            if (i > targetIdx && _isClauseOpener(tokens[i])) { end = i - 1; break; }
            if (_hasClauseBreakAfter(tokens[i])) { end = i; break; }
        }
        const first = tokens[start];
        const firstLemma = String(first?.lemma ?? '');
        const subordinate =
            _SUBORDINATOR_LEMMAS.has(firstLemma) || _RELATIVE_LEMMAS.has(firstLemma);
        return { start, end, subordinate };
    }

    /**
     * Phase 4.5E: 詩節内の全節を線形分割して返す（入れ子対応の準備）。
     * _segmentClause と同一の境界規則を使用する。
     * parent は現状 null 固定（Phase 5 で従属節の親子解決を実装予定）。
     * @returns {Array<{start,end,index,subordinate,parent}>}
     */
    function _segmentAllClauses(tokens) {
        const clauses = [];
        let start = 0;
        for (let i = 0; i < tokens.length; i++) {
            if (i > start && _isClauseOpener(tokens[i])) {
                clauses.push({ start, end: i - 1 });
                start = i;
            }
            if (_hasClauseBreakAfter(tokens[i]) && i + 1 < tokens.length) {
                clauses.push({ start, end: i });
                start = i + 1;
            }
        }
        if (start < tokens.length) clauses.push({ start, end: tokens.length - 1 });
        clauses.forEach((c, idx) => {
            const fl = String(tokens[c.start]?.lemma ?? '');
            c.index       = idx;
            c.subordinate = _SUBORDINATOR_LEMMAS.has(fl) || _RELATIVE_LEMMAS.has(fl);
            c.parent      = null; // 入れ子（親節）解決は将来実装
        });
        return clauses;
    }

    /** 範囲内の最初の定形動詞（分詞・不定詞以外） */
    function _findMainVerbInRange(tokens, start, end) {
        for (let i = start; i <= end && i < tokens.length; i++) {
            const t = tokens[i];
            if (_resolveEntryPos(t) !== 'V') continue;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (m.mood && m.mood !== 'participle' && m.mood !== 'infinitive') return t;
        }
        return null;
    }

    /**
     * 全カテゴリ共通の Head 解決（実装1）。
     *   T（冠詞）      → 直後 5 語以内の最初の名詞（N）
     *   属格名詞       → 後方の N/A/R（冠詞・副詞スキップ）※既存 _findHeadNoun と同一
     *   分詞           → 格・性・数一致の最近接 N/A/R（冠詞は除外）
     *   その他の格名詞 → 後方の N/A/R（与格・将来の対格）
     * @returns {{ token, lemma, pos, idx } | null}
     */
    function _resolveHead(tokens, targetIdx, morph, posCode) {
        let tok = null;
        if (posCode === 'T') {
            // following_noun_in_list と同一の探索範囲（+4 語以内）
            for (let i = targetIdx + 1; i < targetIdx + 5 && i < tokens.length; i++) {
                if (_resolveEntryPos(tokens[i]) === 'N') { tok = tokens[i]; break; }
            }
        } else if (morph?.case === 'genitive') {
            tok = _findHeadNoun(tokens, targetIdx);
        } else if (morph?.mood === 'participle') {
            tok = _findAgreeingNominal(tokens, targetIdx, morph);
        } else if (morph?.case) {
            tok = _findHeadNoun(tokens, targetIdx);
        }
        if (!tok) return null;
        return {
            token: tok,
            lemma: tok.lemma ?? '',
            pos:   _resolveEntryPos(tok),
            idx:   tokens.indexOf(tok),
        };
    }

    /** 格・性・数が一致する最近接の N/A/R（冠詞 T は除外 — 分詞 head 用） */
    function _findAgreeingNominal(tokens, targetIdx, morph) {
        if (!morph.case || !morph.gender || !morph.number) return null;
        let best = null, bestDist = Infinity;
        tokens.forEach((t, i) => {
            if (i === targetIdx) return;
            if (!['N', 'A', 'R'].includes(_resolveEntryPos(t))) return;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (m.case === morph.case && m.gender === morph.gender && m.number === morph.number) {
                const d = Math.abs(i - targetIdx);
                if (d < bestDist) { bestDist = d; best = t; }
            }
        });
        return best;
    }

    /**
     * 句検出（実装4）: PP → 分詞句 → NP の優先順で重複なく検出する。
     * 別レイヤーとして属格句（連続する属格形トークン）も返す。
     * @returns {{ phrases: Array, genitivePhrases: Array }}
     */
    function _detectPhrases(tokens) {
        const n = tokens.length;
        const claimed = new Array(n).fill(false);
        const phrases = [];
        const posAt = (i) => _resolveEntryPos(tokens[i]);
        const morphAt = (i) => (typeof decodeMorph === 'function' ? decodeMorph(tokens[i]) : {});

        // ── PP: 前置詞 + (T|A|D)* + N/R ──
        for (let i = 0; i < n; i++) {
            if (claimed[i] || posAt(i) !== 'P') continue;
            let obj = -1;
            for (let j = i + 1; j < n && j <= i + 5; j++) {
                const pj = posAt(j);
                if (pj === 'N' || pj === 'R') { obj = j; break; }
                if (pj !== 'T' && pj !== 'A' && pj !== 'D') break;
            }
            const end = obj >= 0 ? obj : i;
            phrases.push({ type: 'PP', start: i, end });
            for (let k = i; k <= end; k++) claimed[k] = true;
        }

        // ── 分詞句: (T)? + PTC ──
        for (let i = 0; i < n; i++) {
            if (claimed[i] || posAt(i) !== 'V') continue;
            if (morphAt(i).mood !== 'participle') continue;
            const start = (i > 0 && !claimed[i - 1] && posAt(i - 1) === 'T') ? i - 1 : i;
            phrases.push({ type: 'PtcP', start, end: i });
            for (let k = start; k <= i; k++) claimed[k] = true;
        }

        // ── NP: 連続する T/A/N ──
        for (let i = 0; i < n; i++) {
            if (claimed[i] || !['T', 'A', 'N'].includes(posAt(i))) continue;
            let end = i;
            while (end + 1 < n && !claimed[end + 1] && ['T', 'A', 'N'].includes(posAt(end + 1))) end++;
            phrases.push({ type: 'NP', start: i, end });
            for (let k = i; k <= end; k++) claimed[k] = true;
        }

        // ── 属格句（重複可の別レイヤー）: 連続する属格形トークン ──
        // 後置小辞（δέ, γάρ, μέν, οὖν, τε）と等位接続 καί は、直後に属格が
        // 続く場合に限り透過する（"Τοῦ δὲ Ἰησοῦ γεννηθέντος"・"τοῦ θεοῦ καὶ πατρός"）。
        const _GENP_TRANSPARENT = new Set(['δέ', 'γάρ', 'μέν', 'οὖν', 'τε', 'καί']);
        const genitivePhrases = [];
        let gStart = -1;
        for (let i = 0; i <= n; i++) {
            let isGen = i < n && morphAt(i).case === 'genitive';
            if (!isGen && i < n && gStart >= 0 &&
                _GENP_TRANSPARENT.has(tokens[i]?.lemma ?? '')) {
                // Phase 4.5E: 連続する透過小辞（二重小辞 "μὲν γάρ" 等）を
                // まとめて先読みし、その先が属格なら句を継続する
                let j = i + 1;
                while (j < n && _GENP_TRANSPARENT.has(tokens[j]?.lemma ?? '')) j++;
                if (j < n && morphAt(j).case === 'genitive') isGen = true;
            }
            if (isGen && gStart < 0) gStart = i;
            if (!isGen && gStart >= 0) {
                genitivePhrases.push({ type: 'GenP', start: gStart, end: i - 1 });
                gStart = -1;
            }
        }

        phrases.sort((a, b) => a.start - b.start);

        // ── Phase 4.5B: 句の形態情報エンリッチ ──────────────────────
        // 各句に head（句内ヘッドの index）・headLemma・case/gender/number・
        // dependents（head 以外の構成トークン index）を付与する。
        //   PP   → 前置詞の目的語（末尾の N/R）が形態ヘッド
        //   PtcP → 分詞が形態ヘッド
        //   NP   → 句内の最後の N（なければ末尾トークン）
        //   GenP → 句内の最後の N/R（なければ末尾トークン）
        const enrich = (p, headIdxRule) => {
            let h = headIdxRule(p);
            if (h < p.start || h > p.end) h = p.end;
            const m = morphAt(h);
            p.head       = h;
            p.headLemma  = tokens[h]?.lemma ?? '';
            p.case       = m.case   ?? '';
            p.gender     = m.gender ?? '';
            p.number     = m.number ?? '';
            p.dependents = [];
            for (let k = p.start; k <= p.end; k++) if (k !== h) p.dependents.push(k);
            return p;
        };
        const lastPosIn = (p, poses) => {
            for (let k = p.end; k >= p.start; k--) {
                if (poses.includes(posAt(k))) return k;
            }
            return p.end;
        };
        phrases.forEach(p => {
            if (p.type === 'PP')       enrich(p, q => lastPosIn(q, ['N', 'R']));
            else if (p.type === 'PtcP') enrich(p, q => q.end);
            else                        enrich(p, q => lastPosIn(q, ['N']));
        });
        genitivePhrases.forEach(p => enrich(p, q => lastPosIn(q, ['N', 'R'])));

        return { phrases, genitivePhrases };
    }

    /** 直前または2語前に冠詞があるかチェック */
    function _checkArticleBefore(tokens, targetIdx) {
        for (let back = 1; back <= 2; back++) {
            if (targetIdx - back < 0) break;
            const pos = _resolveEntryPos(tokens[targetIdx - back]);
            if (pos === 'T') return true;
            if (pos !== 'A') break;
        }
        return false;
    }

    /**
     * 軽量役割マップ（初期推定）
     * assignSyntacticRoles の簡易版。SyntaxAnalyzer から独立して動作する。
     */
    function _buildInitialRoleMap(tokens) {
        const roles = new Map();
        tokens.forEach((t, idx) => {
            const pos = _resolveEntryPos(t);
            const m   = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            let role = 'other';
            if (pos === 'V') {
                role = m.mood === 'participle' ? 'ptc'
                     : m.mood === 'infinitive' ? 'inf'
                     : 'verb';
            } else if (pos === 'C') {
                role = 'conj';
            } else if (pos === 'P') {
                role = 'prep';
            } else if (['N','T','A','R','D'].includes(pos) || pos === '') {
                if (m.case === 'nominative') role = 'subj';
                else if (m.case === 'accusative') {
                    const prev = idx > 0 ? tokens[idx - 1] : null;
                    const prevPos = prev ? _resolveEntryPos(prev) : '';
                    role = prevPos === 'P' ? 'other' : 'obj';
                } else if (m.case === 'genitive' || m.case === 'dative') {
                    role = 'mod';
                }
            }
            roles.set(t, { role, idx });
        });
        return roles;
    }

    return {
        /**
         * AnalysisInput からコンテキストを構築する。
         *
         * @param {TokenEntry}   target
         * @param {TokenEntry[]} tokens
         * @param {number}       targetIdx
         * @param {RegistryLoader} [registry] - perception verb list 参照用（省略可）
         * @returns {AnalysisContext}
         */
        build(target, tokens, targetIdx, registry) {
            const morph   = typeof decodeMorph === 'function' ? decodeMorph(target) : {};
            const posCode = _resolveEntryPos(target);
            const word    = typeof cleanText   === 'function' ? cleanText(target)   : (target.word ?? '');

            // 周辺トークン
            const prevToken = targetIdx > 0 ? tokens[targetIdx - 1] : null;
            const prevPos   = prevToken ? _resolveEntryPos(prevToken) : '';
            const prevLemma = prevToken?.lemma ?? '';
            const nextToken = targetIdx < tokens.length - 1 ? tokens[targetIdx + 1] : null;
            const nextPos   = nextToken ? _resolveEntryPos(nextToken) : '';

            // 節レベル（実装3: Clause Segmentation）
            // mainVerb は節スコープの定形動詞を優先し、節内に定形動詞が
            // なければ従来どおり節（=詩節全体）レベルへフォールバックする。
            // これにより既存挙動（属格絶対など無動詞節）は不変のまま、
            // MAT 2:8 型（前半節の εἶπεν を誤参照）が是正される。
            const clauseSeg      = _segmentClause(tokens, targetIdx);
            const clauseMainVerb = _findMainVerbInRange(tokens, clauseSeg.start, clauseSeg.end);
            const verseMainVerb  = _findMainVerb(tokens);
            const mainVerb       = clauseMainVerb ?? verseMainVerb;
            const mainVerbIdx    = mainVerb ? tokens.indexOf(mainVerb) : -1;
            const copulaVerb     = _findCopulaVerb(tokens);
            const roleMap        = _buildInitialRoleMap(tokens);

            // 分詞専用
            // Phase 4C: genitiveNoun（属格絶対の主語候補）と perceptionVerb は
            // 節スコープに限定する（属格絶対は独立節・知覚動詞は同一節内で支配）。
            const clauseToks = tokens.slice(clauseSeg.start, clauseSeg.end + 1);
            const { matchingNoun, matchScore } = _findMatchingNoun(target, tokens, targetIdx, morph);
            const genitiveNoun   = (morph.case === 'genitive')
                ? _findGenitiveNoun(clauseToks, clauseToks.indexOf(target))
                : null;
            const perceptionLemmas = registry?.getList?.('perception_verb_lemmas') ?? new Set();
            const perceptionVerb = _findPerceptionVerb(clauseToks, clauseToks.indexOf(target), perceptionLemmas);

            // 属格用ヘッド名詞
            const headNoun = (morph.case === 'genitive') ? _findHeadNoun(tokens, targetIdx) : null;

            // 与格専用
            const givingLemmas     = registry?.getList?.('giving_verb_lemmas')     ?? new Set();
            const adversativeLemmas= registry?.getList?.('adversative_lemmas')     ?? new Set();
            const negationLemmas   = registry?.getList?.('negation_lemmas')        ?? new Set();

            // Phase 4C: 授与動詞・否定/逆接の検出も節スコープに限定
            const hasGivingVerb = clauseToks.some(t => {
                return _resolveEntryPos(t) === 'V' && givingLemmas.has(t.lemma ?? '');
            });

            const hasAdversative = clauseToks.some(t => {
                const l = t.lemma ?? '';
                return adversativeLemmas.has(l) || negationLemmas.has(l);
            }) || clauseToks.some(t => {
                const w = typeof cleanText === 'function' ? cleanText(t) : (t.word ?? '');
                return w === 'οὐ' || w === 'οὐκ' || w === 'οὐχ' || w === 'μή' || w === 'μηδέ';
            });

            // ── Phase 3 Context Engine ────────────────────────────────

            // 実装1: Head Resolution（全カテゴリ共通）
            const head = _resolveHead(tokens, targetIdx, morph, posCode);

            // 実装4: Phrase Detection
            const { phrases, genitivePhrases } = _detectPhrases(tokens);
            const phrase = phrases.find(p => targetIdx >= p.start && targetIdx <= p.end) ?? null;

            // 実装2: Governor Resolution
            //   前置詞（直前 or 冠詞を1語挟んで）> 節内定形動詞 > 詩節定形動詞
            let governorTok = null, governorIdx = -1;
            if (prevPos === 'P') {
                governorTok = prevToken; governorIdx = targetIdx - 1;
            } else if (prevPos === 'T' && targetIdx >= 2 &&
                       _resolveEntryPos(tokens[targetIdx - 2]) === 'P') {
                governorTok = tokens[targetIdx - 2]; governorIdx = targetIdx - 2;
            } else if (mainVerb) {
                governorTok = mainVerb; governorIdx = mainVerbIdx;
            }
            const governor = governorTok ? {
                token: governorTok,
                lemma: governorTok.lemma ?? '',
                pos:   _resolveEntryPos(governorTok),
                idx:   governorIdx,
            } : null;
            const governorVerb = mainVerb ?? null; // 支配動詞（前置詞の有無と独立）

            // 実装3: Clause API
            // Phase 4.5E: 詩節内の全節リスト（入れ子対応の準備。parent は null 固定）
            const clauses = _segmentAllClauses(tokens);
            const clause = {
                start:       clauseSeg.start,
                end:         clauseSeg.end,
                mainVerb:    clauseMainVerb,
                subordinate: clauseSeg.subordinate,
                index:       clauses.findIndex(
                    c => targetIdx >= c.start && targetIdx <= c.end),
                parent:      null, // 入れ子（親節）解決は将来実装
            };

            // 実装5: Dependency Helper（最小実装 — 完全依存構造解析ではない）
            const nearestFiniteVerb = (idx = targetIdx) => {
                let best = null, bestDist = Infinity;
                tokens.forEach((t, i) => {
                    if (_resolveEntryPos(t) !== 'V') return;
                    const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
                    if (!m.mood || m.mood === 'participle' || m.mood === 'infinitive') return;
                    const d = Math.abs(i - idx);
                    if (d < bestDist) { bestDist = d; best = t; }
                });
                return best;
            };
            const samePhrase = (a, b) => {
                const pa = phrases.find(p => a >= p.start && a <= p.end);
                return Boolean(pa && b >= pa.start && b <= pa.end);
            };
            const governs = (gIdx, dIdx) => {
                if (gIdx === dIdx) return false;
                const g = tokens[gIdx];
                const d = tokens[dIdx];
                if (!g || !d) return false;
                const gp = _resolveEntryPos(g);
                const dm = typeof decodeMorph === 'function' ? decodeMorph(d) : {};
                if (gp === 'P') {
                    // 前置詞は自分の PP 内の後続語を支配
                    const pp = phrases.find(p => p.type === 'PP' && p.start === gIdx);
                    return Boolean(pp && dIdx > gIdx && dIdx <= pp.end);
                }
                // Phase 4.5C: 名詞系（N/A/R）→ 属格修飾・限定分詞の支配
                if (['N', 'A', 'R'].includes(gp)) {
                    // 属格修飾: d の head 解決（後方 N/A/R）が g に一致
                    if (dm.case === 'genitive' && _findHeadNoun(tokens, dIdx) === g) {
                        return true;
                    }
                    // 限定分詞: d（分詞）の一致名詞解決が g に一致
                    if (dm.mood === 'participle' &&
                        _findAgreeingNominal(tokens, dIdx, dm) === g) {
                        return true;
                    }
                    return false;
                }
                if (gp === 'V') {
                    const m = typeof decodeMorph === 'function' ? decodeMorph(g) : {};
                    // Phase 4.5C: 属格絶対 — 属格分詞は同一 GenP 内の
                    // 属格名詞・代名詞（意味上の主語）を支配する
                    if (m.mood === 'participle') {
                        if (m.case !== 'genitive' || dm.case !== 'genitive') return false;
                        if (!['N', 'A', 'R'].includes(_resolveEntryPos(d))) return false;
                        const genp = genitivePhrases.find(
                            p => gIdx >= p.start && gIdx <= p.end);
                        return Boolean(genp && dIdx >= genp.start && dIdx <= genp.end);
                    }
                    if (m.mood === 'infinitive' || !m.mood) return false;
                    // 定形動詞は同一節内の語を支配（PP の目的語は前置詞が支配）
                    if (gIdx < clause.start || gIdx > clause.end) return false;
                    if (dIdx < clause.start || dIdx > clause.end) return false;
                    const dp = phrases.find(p => dIdx >= p.start && dIdx <= p.end);
                    if (dp && dp.type === 'PP' && dIdx > dp.start) return false;
                    return true;
                }
                return false;
            };
            const dependsOn = (dIdx, gIdx) => governs(gIdx, dIdx);

            // 実装6: semanticHints（カテゴリ横断の意味的ヒント集約）
            const semanticHints = {
                isAfterPrep:      prevPos === 'P',
                hasNegation:      hasAdversative,
                hasArticleBefore: _checkArticleBefore(tokens, targetIdx),
                isProperNoun:     (() => {
                    if (target?.type === 'proper') return true;
                    const l = target?.lemma ?? '';
                    const c = l.length > 0 ? l.codePointAt(0) : 0;
                    return c >= 0x0391 && c <= 0x03A9;
                })(),
            };

            return {
                target, tokens, targetIdx, morph, posCode, word,
                prevToken, prevPos, prevLemma,
                nextToken, nextPos,
                mainVerb, mainVerbIdx, copulaVerb, roleMap,
                headNoun,
                hasArticleBefore: semanticHints.hasArticleBefore,
                isAfterPrep: semanticHints.isAfterPrep,
                matchingNoun, matchScore,
                genitiveNoun, perceptionVerb,
                hasGivingVerb, hasAdversative,

                // ── Phase 3 共通 Context API ──────────────────────────
                head,
                headToken:  head?.token ?? null,
                headLemma:  head?.lemma ?? '',
                governor,
                governorVerb,
                governorLemma: governor?.lemma ?? '',
                governorPOS:   governor?.pos   ?? '',
                clause, clauses,
                clauseStart:       clause.start,
                clauseEnd:         clause.end,
                subordinateClause: clause.subordinate,
                phrases, phrase, genitivePhrases,
                semanticHints,
                governs, dependsOn, samePhrase, nearestFiniteVerb,
            };
        },
    };
})();


// =============================================================
// § 9.  WordOrderAnalyzer — 実装
// =============================================================

class WordOrderAnalyzer {
    /**
     * 語順の有標性を検出し、WordOrderMark | null を返す。
     *
     * @param {TokenEntry}   target
     * @param {TokenEntry[]} tokens
     * @param {number}       targetIdx
     * @param {Map}          roleMap
     * @returns {WordOrderMark|null}
     */
    analyze(target, tokens, targetIdx, roleMap) {
        const SKIP_POS = new Set(['C', 'T']);

        const mainVerbIdx = tokens.findIndex(t => {
            const pos = _resolveEntryPos(t);
            const m   = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return pos === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        });
        if (mainVerbIdx < 0) return null;

        const pos  = _resolveEntryPos(target);
        const role = roleMap.get(target)?.role;

        if (!role || role === 'other' || role === 'conj') return null;
        if (SKIP_POS.has(pos)) return null;

        // ① 動詞より前の実質語 → topicalization / fronted-subj
        if (targetIdx < mainVerbIdx) {
            if (role === 'subj') {
                const effectiveStart = tokens.findIndex(t2 => {
                    return !SKIP_POS.has(_resolveEntryPos(t2));
                });
                const hasPrior = tokens.slice(0, targetIdx).some(t2 => {
                    return !SKIP_POS.has(_resolveEntryPos(t2));
                });
                if (targetIdx === effectiveStart || !hasPrior) return null; // 無標
                return {
                    type: 'fronted-subj',
                    note: '主語が節の比較的前方に置かれている。強調・対比の可能性。',
                };
            }
            if (['obj','mod','prep','ptc','inf'].includes(role)) {
                const mainVerbWord = typeof cleanText === 'function'
                    ? cleanText(tokens[mainVerbIdx])
                    : (tokens[mainVerbIdx]?.word ?? '');
                return {
                    type: 'topicalized',
                    note: `動詞「${mainVerbWord}」より前に置かれている。話題化・強調の可能性。`,
                };
            }
        }

        // ② 動詞が節の実質先頭 → verb-initial（動詞自身にのみ適用）
        if (targetIdx === mainVerbIdx) {
            const firstContentIdx = tokens.findIndex(t2 => {
                return !SKIP_POS.has(_resolveEntryPos(t2));
            });
            if (mainVerbIdx === firstContentIdx && tokens.length > mainVerbIdx + 1) {
                return {
                    type: 'verb-initial',
                    note: '動詞が節の先頭に置かれている（動詞前置語順）。動作への焦点・物語的躍動感の可能性。',
                };
            }
        }

        return null;
    }
}


// =============================================================
// § 10.  SyntaxAnalyzer — 実装
// =============================================================

class SyntaxAnalyzer {
    /**
     * @param {Object} registryJson - syntax-registry.json の JSON オブジェクト
     */
    constructor(registryJson) {
        this.registry   = new RegistryLoader(registryJson);
        this.scorers    = [
            new ArticleScorer(),
            new GenitiveScorer(),
            new DativeScorer(),
            new AccusativeScorer(),   // Phase 5: Wallace §5 (pp.176–205)
            new ParticipleScorer(),
            new InfinitiveScorer(),   // Phase 8: Wallace §34 (pp.587–611)
            new VerbScorer(),         // Phase 9A/9B: Wallace Verb (pp.408–586)
            new AdjectiveScorer(),    // Phase 10: Wallace Adjective (pp.291–314)
            new PronounScorer(),      // Phase 11: Wallace Pronouns (pp.315–354)
            new NominativeScorer(),   // Phase 12: Wallace Nominative (pp.36–64)
            new VocativeScorer(),     // Phase 13: Wallace Vocative (pp.65–71)
            new ClauseScorer(),       // Phase 14: Wallace Clause Syntax (pp.656–712)
            new PrepositionScorer(),  // Phase 15: Wallace Prepositions (pp.355–389)
            new ConjunctionScorer(),  // Phase 16: Wallace Conjunctions (pp.666–678)
            new ParticleScorer(),     // Phase 17: Wallace Particles (negation/questions/emphasis)
            new NominalSyntaxScorer(),// Phase 18: Engine Extension — Nominal Syntax (NP 構造)
            new DiscourseScorer(),    // Phase 19: Engine Extension — Discourse (情報構造)
        ];
        this.normalizer = new CandidateNormalizer();
        this.woAnalyzer = new WordOrderAnalyzer();
        this.version    = '0.2.0';
    }

    // ──────────────────────────────────────────────────────────
    // analyze()  メイン解析エントリーポイント
    // ──────────────────────────────────────────────────────────
    /**
     * 単一トークンの構文機能を解析して AnalysisOutput を返す。
     *
     * @param {AnalysisInput} input
     * @returns {AnalysisOutput}
     */
    analyze(input) {
        const { target, tokens, targetIdx } = input;

        // 1. コンテキスト構築
        const ctx = ContextBuilder.build(target, tokens, targetIdx, this.registry);

        // 2. 担当スコアラーを全件選択（格と法の両方を持つトークン対応）
        // 例: 属格分詞は GenitiveScorer + ParticipleScorer の両方が処理する
        const activeScorers = this.scorers.filter(s => s.canHandle(ctx));
        if (!activeScorers.length) {
            return this._emptyOutput(ctx);
        }

        // 3. 候補スコア計算（全スコアラーの結果を統合）
        const rawCandidates = activeScorers.flatMap(s => s.score(ctx, this.registry));

        // 4. 正規化
        const candidates = this.normalizer.normalize(rawCandidates, this.registry.getShared());

        // 5. 語順解析
        const wordOrder = this.woAnalyzer.analyze(target, tokens, targetIdx, ctx.roleMap);

        // 6. ContextSummary 構築
        const context = this._buildContextSummary(ctx);

        return {
            targetWord:  ctx.word,
            targetLemma: target.lemma ?? '',
            morph:       ctx.morph,
            candidates,
            wordOrder,
            context,
            version: this.version,
        };
    }

    // ──────────────────────────────────────────────────────────
    // analyzeAll()  節内の全トークンをまとめて解析
    // ──────────────────────────────────────────────────────────
    /**
     * 節内の全トークンを解析して ClauseAnalysis を返す。
     *
     * @param {TokenEntry[]} tokens
     * @returns {ClauseAnalysis}
     */
    analyzeAll(tokens) {
        const results = tokens.map((t, i) => ({
            tokenIdx: i,
            word:     typeof cleanText === 'function' ? cleanText(t) : (t.word ?? ''),
            output:   this.analyze({ target: t, tokens, targetIdx: i }),
        }));
        return {
            tokens,
            results,
            version: this.version,
        };
    }

    // ──────────────────────────────────────────────────────────
    // プライベートヘルパー
    // ──────────────────────────────────────────────────────────

    _emptyOutput(ctx) {
        return {
            targetWord:  ctx.word,
            targetLemma: ctx.target?.lemma ?? '',
            morph:       ctx.morph,
            candidates:  [],
            wordOrder:   null,
            context:     this._buildContextSummary(ctx),
            version:     this.version,
        };
    }

    _buildContextSummary(ctx) {
        return {
            mainVerbWord:  ctx.mainVerb ? (typeof cleanText === 'function' ? cleanText(ctx.mainVerb) : (ctx.mainVerb.word ?? '')) : null,
            mainVerbLemma: ctx.mainVerb?.lemma ?? null,
            headNounWord:  ctx.headNoun ? (typeof cleanText === 'function' ? cleanText(ctx.headNoun) : (ctx.headNoun.word ?? '')) : null,
            prevPos:       ctx.prevPos,
            prevLemma:     ctx.prevLemma,
            hasCopula:     ctx.copulaVerb !== null,
            clauseLength:  ctx.tokens.length,
        };
    }
}


// =============================================================
// § 13.  グローバルエクスポート
// =============================================================

// ブラウザ（script タグ）用  ── STEP8: App.syntax 配下へ移行
if (typeof window !== 'undefined') {
    window.App = window.App || {};
    window.App.syntax = window.App.syntax || {};
    window.App.syntax.Analyzer = SyntaxAnalyzer;

    /* Phase 24: Reading Support Projection が Phrase API（句検出）を
       読み取り専用で参照するための追加公開（判定ロジックへの変更なし） */
    window.App.syntax.ContextBuilder = ContextBuilder;

    /* 互換エイリアス（既存の window.SyntaxAnalyzer 参照を壊さない） */
    window.SyntaxAnalyzer = window.App.syntax.Analyzer;
}

// ES Module 用（バンドラー環境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SyntaxAnalyzer, RegistryLoader, CheckEvaluator, CandidateNormalizer,
        ContextBuilder,
    };
}

// =============================================================
// § 14.  RegistryLoader.getList 拡張パッチ
// =============================================================
//
// 背景:
//   syntax-registry.json v0.1.0 では、named list（perception_verb_lemmas 等）が
//   shared.lists ではなく各 type.detection 内にインラインで定義されている。
//   また、check 文字列が参照するリスト名（action_noun_lemmas 等）と
//   detection 内の実際のキー名（trigger_head_lemmas / trigger_lemmas 等）が
//   異なる場合がある。さらに同一キー名（trigger_lemmas）でも type が異なれば
//   内容が異なる（partitive 用と time 用で別データ）。
//
// 解決方針:
//   1. RegistryLoader.prototype.load をラップし、load 時に
//      「type_id スコープ付き精密収集」でキャッシュを構築する。
//      収集テーブル: listName → Set<string>
//        - detection キー名がそのまま listName と一致する場合は直収集
//        - 一致しない場合は meta.list_aliases（または組み込みエイリアス）で解決
//   2. エイリアスは { listName: [ {typeId, detKey}, ... ] } 形式で
//      type_id を限定して収集することで、同名キー衝突（trigger_lemmas）を回避する。
//   3. shared.lists は将来のRegistry形式への前方互換として先に確認する。
//   4. 全処理は追記のみ。既存コードの変更なし。
//
// =============================================================

(function _patchRegistryLoaderGetList() {

    // ── インスタンスごとの解決済みリストキャッシュ（WeakMap）────────────
    // Map<listName, Set<string>> をインスタンスにバインドする
    const _resolvedCache = new WeakMap();

    // ── type_id スコープ付きエイリアス定義 ──────────────────────────────
    //
    // Registry v0.1.0 では check が参照するリスト名と detection のキーが異なる。
    // また trigger_lemmas は複数 type が持つが内容が異なるため、
    // type_id を指定して収集元を絞り込む。
    //
    // 形式: { listName: [ { typeId: string, detKey: string }, ... ] }
    //   typeId : 収集元となる type の id（例: "genitive.partitive"）
    //   detKey : その type.detection 内のキー名（例: "trigger_lemmas"）
    //
    // 優先順位:
    //   1. Registry の shared.list_aliases（将来定義された場合、同形式を想定）
    //   2. 以下の組み込みフォールバック（Registry v0.1.0 用）
    //
    const _BUILTIN_SCOPED_ALIASES = {
        // genitive.subjective / genitive.objective が head_lemma_in_list で参照
        // → 両 type の trigger_head_lemmas を合成（実質的に action noun セット）
        'action_noun_lemmas': [
            { typeId: 'genitive.subjective', detKey: 'trigger_head_lemmas' },
            { typeId: 'genitive.objective',  detKey: 'trigger_head_lemmas' },
        ],
        // genitive.partitive が head_lemma_in_list で参照（数量詞・代名詞）
        'partitive_trigger_lemmas': [
            { typeId: 'genitive.partitive', detKey: 'trigger_lemmas' },
        ],
        // genitive.time / dative.time が target_lemma_in_list で参照（時間名詞）
        'temporal_noun_lemmas': [
            { typeId: 'genitive.time', detKey: 'trigger_lemmas' },
            { typeId: 'dative.time',   detKey: 'trigger_lemmas' },
        ],
        // genitive.epexegetical が head_lemma_in_list で参照（抽象・象徴語）
        'abstract_symbol_lemmas': [
            { typeId: 'genitive.epexegetical', detKey: 'trigger_head_lemmas' },
        ],

        // genitive.relationship が head_lemma_in_list で参照（親族・関係名詞）
        'kinship_head_lemmas': [
            { typeId: 'genitive.relationship', detKey: 'kinship_head_lemmas' },
        ],

        // ── Article ───────────────────────────────────────────────────────
        // article.monadic が following_noun_in_list で参照（唯一的実体名詞）
        'monadic_noun_lemmas': [
            { typeId: 'article.monadic', detKey: 'monadic_noun_lemmas' },
        ],
        // article.par_excellence が following_noun_in_list で参照（卓越的役割名詞）
        'par_excellence_noun_lemmas': [
            { typeId: 'article.par_excellence', detKey: 'par_excellence_noun_lemmas' },
        ],
        // article.generic が following_noun_in_list で参照（総称的類名詞・Phase 5）
        'generic_noun_lemmas': [
            { typeId: 'article.generic', detKey: 'generic_noun_lemmas' },
        ],
        // ── Phase 7: Article System ───────────────────────────────────
        'well_known_noun_lemmas': [
            { typeId: 'article.well_known', detKey: 'well_known_noun_lemmas' },
        ],
        'abstract_article_lemmas': [
            { typeId: 'article.abstract', detKey: 'abstract_article_lemmas' },
        ],
        'demonstrative_lemmas': [
            { typeId: 'article.deictic', detKey: 'demonstrative_lemmas' },
        ],
        'relative_pronoun_lemmas': [
            { typeId: 'article.kataphoric', detKey: 'relative_pronoun_lemmas' },
        ],
        // ── Phase 9A: Verb Mood（verb カテゴリも inline 収集対象外） ──
        'futuristic_motion_lemmas': [
            { typeId: 'verb.futuristic_present', detKey: 'futuristic_motion_lemmas' },
        ],
        'epistolary_verb_lemmas': [
            { typeId: 'verb.epistolary_aorist', detKey: 'epistolary_verb_lemmas' },
        ],
        'impersonal_verb_lemmas': [
            { typeId: 'infinitive.subject', detKey: 'impersonal_verb_lemmas' },
        ],
        'inf_discourse_verb_lemmas': [
            { typeId: 'infinitive.indirect_discourse', detKey: 'inf_discourse_verb_lemmas' },
        ],
        'epexegetical_head_lemmas': [
            { typeId: 'infinitive.epexegetical', detKey: 'epexegetical_head_lemmas' },
        ],
        // ── Phase 9B: Tense/Aspect/Voice ──────────────────────────────
        'conative_verb_lemmas': [
            { typeId: 'verb.imperfect_conative', detKey: 'conative_verb_lemmas' },
        ],
        'distributive_temporal_lemmas': [
            { typeId: 'verb.imperfect_customary', detKey: 'distributive_temporal_lemmas' },
        ],
        'ingressive_stative_lemmas': [
            { typeId: 'verb.aorist_ingressive', detKey: 'ingressive_stative_lemmas' },
        ],
        'culminative_verb_lemmas': [
            { typeId: 'verb.aorist_culminative', detKey: 'culminative_verb_lemmas' },
        ],
        'intensive_perfect_lemmas': [
            { typeId: 'verb.perfect_intensive', detKey: 'intensive_perfect_lemmas' },
        ],
        'intensive_pluperfect_lemmas': [
            { typeId: 'verb.pluperfect_intensive', detKey: 'intensive_pluperfect_lemmas' },
        ],
        'imperatival_future_lemmas': [
            { typeId: 'verb.future_imperatival', detKey: 'imperatival_future_lemmas' },
        ],
        'direct_middle_lemmas': [
            { typeId: 'verb.voice_middle_direct', detKey: 'direct_middle_lemmas' },
        ],
        // ── Phase 10: Adjective ──────────────────────────────────────
        'comparative_irregular_lemmas': [
            { typeId: 'adjective.comparative', detKey: 'comparative_irregular_lemmas' },
        ],
        'superlative_irregular_lemmas': [
            { typeId: 'adjective.superlative', detKey: 'superlative_irregular_lemmas' },
        ],
        'gen_complement_adjective_lemmas': [
            { typeId: 'adjective.genitive_complement', detKey: 'gen_complement_adjective_lemmas' },
        ],
        // ── Phase 11: Pronoun ────────────────────────────────────────
        'personal_pronoun_lemmas': [
            { typeId: 'pronoun.personal', detKey: 'personal_pronoun_lemmas' },
        ],
        'autos_lemma': [
            { typeId: 'pronoun.intensive', detKey: 'autos_lemma' },
        ],
        'demonstrative_pronoun_lemmas': [
            { typeId: 'pronoun.demonstrative', detKey: 'demonstrative_pronoun_lemmas' },
        ],
        'relative_pronoun_lemmas_p': [
            { typeId: 'pronoun.relative', detKey: 'relative_pronoun_lemmas_p' },
        ],
        'interrogative_pronoun_lemmas': [
            { typeId: 'pronoun.interrogative', detKey: 'interrogative_pronoun_lemmas' },
        ],
        'indefinite_pronoun_lemmas': [
            { typeId: 'pronoun.indefinite', detKey: 'indefinite_pronoun_lemmas' },
        ],
        'distributive_pronoun_lemmas': [
            { typeId: 'pronoun.distributive', detKey: 'distributive_pronoun_lemmas' },
        ],
        'possessive_pronoun_lemmas': [
            { typeId: 'pronoun.possessive_pronoun', detKey: 'possessive_pronoun_lemmas' },
        ],
        // ── Phase 12: Nominative ─────────────────────────────────────
        'indeclinable_lemmas': [
            { typeId: 'nominative.indeclinable', detKey: 'indeclinable_lemmas' },
        ],
    };

    /**
     * エイリアス定義を取得する。
     * Registry の shared.list_aliases が定義されていればそちらを優先する。
     *
     * @param {RegistryLoader} instance
     * @returns {Object} listName → [{typeId, detKey}][] のマッピング
     */
    function _getScopedAliasMap(instance) {
        const shared = instance.getShared?.() ?? {};
        const fromRegistry = shared?.list_aliases ?? null;
        return fromRegistry ?? _BUILTIN_SCOPED_ALIASES;
    }

    /**
     * 全 type の detection からインラインリストを直接収集する。
     * キー名が listName と一致するものをそのまま取得する。
     *
     * @param {RegistryLoader} instance
     * @returns {Map<string, Set<string>>} detKey → Set<string>
     */
    function _collectDirectInlineLists(instance) {
        const result = new Map();
        // getTypesForCase / getTypesForMood は RegistryLoader の公開メソッドを利用
        const CASE_KEYS = ['genitive', 'dative', 'accusative', 'nominative', 'vocative'];
        const MOOD_KEYS = ['participle', 'infinitive', 'indicative', 'subjunctive', 'optative', 'imperative'];
        const seen = new Set();
        const allTypes = [];
        for (const c of CASE_KEYS) {
            for (const t of instance.getTypesForCase(c)) {
                if (!seen.has(t.id)) { seen.add(t.id); allTypes.push(t); }
            }
        }
        for (const m of MOOD_KEYS) {
            for (const t of instance.getTypesForMood(m)) {
                if (!seen.has(t.id)) { seen.add(t.id); allTypes.push(t); }
            }
        }
        for (const typeDef of allTypes) {
            const det = typeDef.detection ?? {};
            for (const [key, value] of Object.entries(det)) {
                if (key === 'conditions' || key === 'exclusions') continue;
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                    if (!result.has(key)) result.set(key, new Set());
                    value.forEach(v => result.get(key).add(v));
                }
            }
        }
        return result;
    }

    /**
     * スコープ付きエイリアスを解決して指定 listName の Set<string> を返す。
     * getType(typeId) を使い type を特定してから detKey の配列を収集する。
     *
     * @param {RegistryLoader} instance
     * @param {string}         listName
     * @returns {Set<string>|null}  null = エイリアス未定義
     */
    function _resolveAlias(instance, listName) {
        const aliasMap = _getScopedAliasMap(instance);
        const entries  = aliasMap[listName];
        if (!entries || !Array.isArray(entries) || entries.length === 0) return null;

        const merged = new Set();
        for (const { typeId, detKey } of entries) {
            const typeDef = instance.getType(typeId);
            if (!typeDef) continue;
            const det = typeDef.detection ?? {};
            const arr = det[detKey];
            if (Array.isArray(arr)) {
                arr.forEach(v => merged.add(v));
            }
        }
        return merged.size > 0 ? merged : null;
    }

    /**
     * インスタンスの解決済みキャッシュを取得。
     * 未構築の場合は direct 収集を行い初期化する（遅延初期化）。
     *
     * @param {RegistryLoader} instance
     * @returns {Map<string, Set<string>>}
     */
    function _getOrBuildCache(instance) {
        if (_resolvedCache.has(instance)) {
            return _resolvedCache.get(instance);
        }
        const cache = _collectDirectInlineLists(instance);
        _resolvedCache.set(instance, cache);
        return cache;
    }

    // ── RegistryLoader.prototype.load をラップ ────────────────────────────
    // load() 後にキャッシュをリセットして次回 getList 時に再構築させる。
    const _originalLoad = RegistryLoader.prototype.load;
    RegistryLoader.prototype.load = function load_patched(registryJson) {
        _originalLoad.call(this, registryJson);
        // キャッシュを無効化（次回 getList 呼び出し時に再構築）
        _resolvedCache.delete(this);
    };

    // ── RegistryLoader.prototype.getList を拡張版に差し替え ──────────────
    const _originalGetList = RegistryLoader.prototype.getList;

    RegistryLoader.prototype.getList = function getList_patched(listName) {
        // ① shared.lists を先に確認（将来のRegistry形式への前方互換）
        const fromShared = _originalGetList.call(this, listName);
        if (fromShared && fromShared.size > 0) {
            return fromShared;
        }

        // ② 解決済みキャッシュを確認
        const cache = _getOrBuildCache(this);
        if (cache.has(listName)) {
            return cache.get(listName);
        }

        // ③ スコープ付きエイリアスで解決
        const resolved = _resolveAlias(this, listName);
        if (resolved) {
            cache.set(listName, resolved); // キャッシュに追加
            return resolved;
        }

        // ④ どこにも見つからない → 空 Set（既存動作と同じ）
        return new Set();
    };

})();


// =============================================================
// § 15.  WordOrderAnalyzer 語順情報集約プロパティ拡張
// =============================================================
//
// 設計書 § 9 に記載された以下のプロパティを WordOrderAnalyzer に追加する:
//   targetBeforeVerb  : boolean — target が主動詞より前にあるか
//   targetAfterVerb   : boolean — target が主動詞より後にあるか
//   distanceToVerb    : number  — target と主動詞のトークン距離（-1 = 動詞なし）
//
// これらは analyze() の戻り値（WordOrderMark | null）ではなく、
// WordOrderAnalyzer インスタンスのメソッドとして提供する。
// SyntaxAnalyzer.analyze() は wordOrder フィールドを返す際に
// この情報を context に付与できる。
//
// 既存の analyze() メソッドは変更しない。
// 新メソッド analyzeWordOrderInfo() を追加する。
// =============================================================

(function _extendWordOrderAnalyzer() {

    /**
     * 語順情報を集約して返す。
     * WordOrderAnalyzer.prototype.analyze() とは独立したメソッド。
     *
     * @param {TokenEntry}   target
     * @param {TokenEntry[]} tokens
     * @param {number}       targetIdx
     * @returns {{ targetBeforeVerb: boolean, targetAfterVerb: boolean, distanceToVerb: number }}
     */
    WordOrderAnalyzer.prototype.analyzeWordOrderInfo = function analyzeWordOrderInfo(
        target, tokens, targetIdx
    ) {
        const mainVerbIdx = tokens.findIndex(t => {
            const pos = _resolveEntryPos(t);
            const m   = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return pos === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        });

        if (mainVerbIdx < 0) {
            return {
                targetBeforeVerb: false,
                targetAfterVerb:  false,
                distanceToVerb:   -1,
            };
        }

        const distance = targetIdx - mainVerbIdx; // 正 = 動詞より後、負 = 動詞より前

        return {
            targetBeforeVerb: targetIdx < mainVerbIdx,
            targetAfterVerb:  targetIdx > mainVerbIdx,
            distanceToVerb:   Math.abs(distance),
        };
    };

})();


// =============================================================
// § 16.  SyntaxAnalyzer._buildContextSummary 拡張
// =============================================================
//
// § 15 で追加した analyzeWordOrderInfo() の結果を
// AnalysisOutput.context に含めるため、
// SyntaxAnalyzer.prototype._buildContextSummary をオーバーライドする。
//
// 追加フィールド（ContextSummary 拡張）:
//   targetBeforeVerb : boolean
//   targetAfterVerb  : boolean
//   distanceToVerb   : number (-1 = 動詞なし)
//
// =============================================================

(function _extendSyntaxAnalyzerContextSummary() {

    const _original_buildContextSummary = SyntaxAnalyzer.prototype._buildContextSummary;

    SyntaxAnalyzer.prototype._buildContextSummary = function _buildContextSummary_patched(ctx) {
        // 元の _buildContextSummary を呼び出す
        const base = _original_buildContextSummary.call(this, ctx);

        // 語順情報を追加
        const woInfo = this.woAnalyzer.analyzeWordOrderInfo(
            ctx.target,
            ctx.tokens,
            ctx.targetIdx
        );

        return Object.assign(base, woInfo);
    };

})();


// =============================================================
// § 17.  CandidateScorer._evaluateType 拡張パッチ
// =============================================================
//
// 背景:
//   Registry v0.1.0 では detection.conditions[].id と xsc.signals[].id が
//   対応していない場合が37件存在する。
//   例: condition.id = "giving_communication_verb"
//       signal.id    = "giving_verb"
//
//   CandidateScorer._evaluateType の実装:
//     const condition = conditions.find(c => c.id === signal.id)
//   は condition.id === signal.id の完全一致を要求するため、
//   上記のような不一致があると condition の評価結果が signal に加算されない。
//
// 解決方針:
//   CandidateScorer.prototype._evaluateType をオーバーライドし、
//   signal.id に対応する condition が直接見つからない場合に
//   共有のフォールバックマッピング（_CONDITION_SIGNAL_MAP）を参照する。
//
//   このマッピングは Registry の shared.condition_signal_map が定義されていれば
//   そちらを優先する（将来のRegistry拡張への前方互換）。
//
// =============================================================

(function _patchCandidateScorerEvaluateType() {

    // ── condition.id → signal.id フォールバックマッピング ────────────────
    //
    // Registry v0.1.0 で condition.id と signal.id が不一致になっているペアの
    // 完全対応テーブル。
    //
    // 優先順位:
    //   1. Registry の shared.condition_signal_map（将来定義された場合）
    //   2. 以下の組み込みフォールバック
    //
    // キー   : condition.id
    // 値     : signal.id（このシグナルに加算する）
    //
    const _BUILTIN_CONDITION_SIGNAL_MAP = {
        // ── Genitive ──────────────────────────────────────────────────
        'head_is_partitive_trigger':            'partitive_trigger',
        'abstract_noun_genitive':               'abstract_genitive',
        'semantically_replaceable_by_adjective':'adjectival_equivalent',
        'paraphrasable_with_namely':            'namely_substitutable',
        'head_is_abstract_or_symbol':           'head_is_abstract',
        'head_is_action_noun':                  'action_noun_head',
        'head_is_kinship_noun':                 'kinship_noun_head',
        'comparative_adjective_present':        'comparative_adjective',
        'separation_verb_present':              'separation_verb',
        'prep_apo_or_ek':                       'prep_apo_ek',
        'prep_source_present':                  'source_prep',
        'temporal_noun':                        'temporal_lemma',

        // ── Dative ────────────────────────────────────────────────────
        'giving_communication_verb':            'giving_verb',
        'benefactive_context':                  'benefactive_verb',
        'adversative_context':                  'adversative_verb',
        'reference_head_word':                  'reference_head',
        'substitutable_with_dia':               'instrumental_noun',
        'abstract_manner_noun':                 'manner_noun',
        'syn_compound_verb':                    'syn_verb',
        'prep_sun_present':                     'prep_sun',

        // ── Participle ────────────────────────────────────────────────
        'matching_noun_present':                'matching_noun',
        'proximity_close':                      'proximity_2',
        'no_article_before_ptc':                'no_article',
        'article_before_ptc':                   'article_present',
        'article_full_agreement':               'article_case_match',
        'no_article_before':                    'no_article',
        'no_matching_noun':                     'no_match_noun',
        'temporal_tense':                       'tense_aorist',
        'aorist_tense':                         'aorist_ptc',
        'main_verb_aorist_imperative':          'aorist_imperative_main',
        'causal_adverb_present':                'causal_particle',
        'logical_discourse_marker':             'logical_context',
        'participle_case_genitive':             'ptc_genitive_case',
        'genitive_noun_in_context':             'genitive_noun_present',
        'distinct_from_main_subject':           'distinct_subject',
        'perception_cognition_verb':            'perception_verb',
    };

    // registry lint（orphan signal 検査）から参照できるように公開する。
    if (typeof globalThis !== 'undefined') {
        globalThis._BUILTIN_CONDITION_SIGNAL_MAP = _BUILTIN_CONDITION_SIGNAL_MAP;
    }

    // ── Phase 4.5A: Verb Valency Dictionary アクセサ ──────────────
    // shared.verb_valency（動詞の支配格・必須項・任意項）を返す。
    // Scorer からは未使用（将来の direct-object 型・complementary 判定の基盤）。
    if (typeof RegistryLoader !== 'undefined' &&
        !RegistryLoader.prototype.getVerbValency) {
        RegistryLoader.prototype.getVerbValency = function (lemma) {
            const vv = this.getShared?.()?.verb_valency ?? null;
            if (!vv || !lemma || String(lemma).startsWith('_')) return null;
            return vv[lemma] ?? null;
        };
    }

    /**
     * condition.id に対応する signal.id を返す。
     * 1. 直接一致（signal.id === condition.id）→ condition をそのまま返す（既存動作）
     * 2. フォールバックマッピングで解決
     *
     * @param {string}   conditionId   - condition.id
     * @param {Object[]} signals       - typeDef.xsc.signals
     * @param {Object[]} conditions    - typeDef.detection.conditions
     * @param {Object}   shared        - registry.getShared()（将来の map 参照用）
     * @returns {{ condition: Object|null, targetSignalId: string|null }}
     */
    function _resolveConditionToSignal(conditionId, signals, conditions, shared) {
        // ① 直接一致: signal.id === conditionId の signal を持つ condition
        const directCond = conditions.find(c => c.id === conditionId);
        if (directCond) {
            return { condition: directCond, targetSignalId: conditionId };
        }

        // ② フォールバックマップ参照
        const fallbackMap = shared?.condition_signal_map ?? _BUILTIN_CONDITION_SIGNAL_MAP;
        const mappedSignalId = fallbackMap[conditionId];
        if (mappedSignalId) {
            // conditionId → mappedSignalId の条件を返す
            const cond = conditions.find(c => c.id === conditionId);
            return { condition: cond ?? null, targetSignalId: mappedSignalId };
        }

        return { condition: null, targetSignalId: null };
    }

    // ── CandidateScorer.prototype._evaluateType をオーバーライド ─────────
    const _original_evaluateType = CandidateScorer.prototype._evaluateType;

    CandidateScorer.prototype._evaluateType = function _evaluateType_patched(typeDef, ctx) {
        const det = typeDef.detection ?? {};

        // required_case / required_mood / required_pos チェック（既存と同じ）
        if (det.required_case && ctx.morph?.case !== det.required_case) return null;
        if (det.required_mood && ctx.morph?.mood !== det.required_mood) return null;
        if (det.required_pos  && ctx.posCode        !== det.required_pos)  return null;

        // stub: 既存と同じ
        if (typeDef.status === 'stub') {
            return {
                typeId:         typeDef.id,
                rawScore:       (typeDef.xsc?.default_confidence ?? 0) + _computeTieBreakScore(typeDef),
                signalsMatched: [],
                signalsFailed:  [],
                deltas:         [],
                typeDef,
            };
        }

        // exclusions: 既存と同じ（1件でも true なら rawScore = 0）
        for (const excl of det.exclusions ?? []) {
            if (this._evalCheck(excl.check, ctx)) {
                return {
                    typeId:         typeDef.id,
                    rawScore:       0,
                    signalsMatched: [],
                    signalsFailed:  [excl.id],
                    deltas:         [],
                    typeDef,
                };
            }
        }

        // ── signals 評価（拡張版）────────────────────────────────────────
        let score       = typeDef.xsc?.base_weight ?? 0;
        const matched   = [];
        const failed    = [];
        const deltas    = [];
        const signals   = typeDef.xsc?.signals    ?? [];
        const conditions = det.conditions          ?? [];
        const shared    = ctx._registry?.getShared?.() ?? null;

        for (const signal of signals) {
            // ── まず既存ロジック: condition.id === signal.id で直接一致 ──
            const directCond = conditions.find(c => c.id === signal.id);
            if (directCond) {
                // 既存と同じ評価
                const hit = this._evalCheck(directCond.check, ctx);
                if (hit) {
                    score += signal.value;
                    matched.push(signal.id);
                    deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja ?? '' });
                } else {
                    failed.push(signal.id);
                }
                continue;
            }

            // ── フォールバック: condition_signal_map でシグナルに対応する condition を逆引き ──
            // signal.id に対応する condition.id を逆引きマップから探す
            const fallbackMap = shared?.condition_signal_map ?? _BUILTIN_CONDITION_SIGNAL_MAP;
            // fallbackMap は condition.id → signal.id なので、逆引きが必要
            // signal.id をターゲットに持つ全 conditionId を探す
            const mappedCondId = Object.entries(fallbackMap)
                .find(([, sigId]) => sigId === signal.id)
                ?.[0];

            if (mappedCondId) {
                const mappedCond = conditions.find(c => c.id === mappedCondId);
                if (mappedCond) {
                    const hit = this._evalCheck(mappedCond.check, ctx);
                    if (hit) {
                        score += signal.value;
                        matched.push(signal.id);
                        deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja ?? '' });
                    } else {
                        failed.push(signal.id);
                    }
                    continue;
                }
            }

            // ── condition なし → 既存と同じ: 常に加算 ──
            score += signal.value;
            deltas.push({ signal_id: signal.id, value: signal.value, label_ja: signal.label_ja ?? '' });
        }

        return {
            typeId: typeDef.id,
            rawScore: score + _computeTieBreakScore(typeDef),
            signalsMatched: matched,
            signalsFailed: failed,
            deltas,
            typeDef,
        };
    };

})();


// =============================================================
// § 18.  CheckEvaluator 追加ハンドラー
// =============================================================
//
// Registry v0.1.0 で使用されているが未登録だった check 関数を登録する。
//
// ① prev_token_lemma_eq(lemma)
//    直前トークンのレンマが指定値と一致するか。
//    dative.association: prev_token_lemma_eq('σύν')
//
// ② target_is_abstract_noun()
//    対象トークンが抽象名詞か（ヒューリスティック）。
//    genitive.attributive: ἁμαρτία, δικαιοσύνη, ζωή 等の抽象名詞が属格の場合。
//    実装: abstract_noun_lemmas リスト（Registry）またはフォールバックセットで判定。
//
// ③ has_adjectival_equivalent()
//    対応形容詞がある場合に true（ヒューリスティック・文脈依存）。
//    Registry が定義できないため、常に false を返す（安全側）。
//    warn なしで false を返すよう登録して console.warn を抑制する。
//
// ④ semantic_equivalence_test()
//    「すなわち」置換テスト（ヒューリスティック・自動判定困難）。
//    常に false（安全側）。warn 抑制のため登録。
//
// ⑤ semantic_substitution_test(prep)
//    前置詞句置換テスト（ヒューリスティック）。常に false。warn 抑制。
//
// ⑥ context_discourse_type_eq(type)
//    談話タイプ判定（論証的文体等）。自動判定不可。常に false。warn 抑制。
//
// =============================================================

// ① prev_token_lemma_eq
CheckEvaluator.register('prev_token_lemma_eq',
    (ctx, [lemmaVal]) => (ctx.prevLemma ?? '') === lemmaVal
);

// ② target_is_abstract_noun
//    Registry の abstract_noun_lemmas リストで判定。
//    リストが空の場合はフォールバックの抽象名詞セットを使用。
CheckEvaluator.register('target_is_abstract_noun',
    (ctx) => {
        // Registry の named list を優先参照
        const list = ctx._registry?.getList?.('abstract_noun_lemmas');
        if (list && list.size > 0) {
            return list.has(ctx.target?.lemma ?? '');
        }
        // フォールバック: 代表的なギリシャ語抽象名詞セット
        // （Registry に abstract_noun_lemmas が定義されていない場合の暫定対応）
        const ABSTRACT_NOUN_FALLBACK = new Set([
            'ἁμαρτία', 'δικαιοσύνη', 'ζωή', 'θάνατος', 'εἰρήνη', 'ἀγάπη',
            'πίστις', 'ἐλπίς', 'χάρις', 'δόξα', 'ἀλήθεια', 'σοφία',
            'γνῶσις', 'δύναμις', 'σωτηρία', 'κρίσις', 'ἀποκάλυψις',
            'εὐαγγέλιον', 'νόμος', 'χαρά', 'λύπη', 'φόβος',
        ]);
        return ABSTRACT_NOUN_FALLBACK.has(ctx.target?.lemma ?? '');
    }
);

// ③ has_adjectival_equivalent — ヒューリスティック・自動判定不可 → false
CheckEvaluator.register('has_adjectival_equivalent',
    (_ctx) => false
);

// ④ semantic_equivalence_test — ヒューリスティック → false
CheckEvaluator.register('semantic_equivalence_test',
    (_ctx) => false
);

// ⑤ semantic_substitution_test — ヒューリスティック → false
CheckEvaluator.register('semantic_substitution_test',
    (_ctx) => false
);

// ⑥ context_discourse_type_eq — 自動判定不可 → false
CheckEvaluator.register('context_discourse_type_eq',
    (_ctx) => false
);

// ⑦ context_lemma_in_list — 節内全トークンのレンマを named list と照合
//    dative.reference の reference_head_word 等で使用（POS 制限なし：
//    νεκρός は形容詞、ζάω は動詞・分詞で現れるため）。
//    Phase 4C: 節スコープに限定。
CheckEvaluator.register('context_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return _clauseTokens(ctx).some(t => list.has(t.lemma ?? ''));
    }
);

// ⑧ target_voice_eq — 対象トークンの態
CheckEvaluator.register('target_voice_eq',
    (ctx, [voiceVal]) => ctx.morph?.voice === voiceVal
);

// ⑨ 限定位置判定（分詞・形容詞共通アルゴリズム — Wallace pp.306–309/617–618）
//      第2限定位置: [N] [T] [対象]   例: τὸ ὕδωρ τὸ ζῶν / ὁ ποιμὴν ὁ καλός
//      第1限定位置: [T] [対象] [N]   例: ὁ ζῶν πατήρ / ὁ ἀγαθὸς ποιμήν
//    πᾶς ὁ πιστεύων のような量化詞先行は名詞（N）でないため限定位置と判定されない。
function _inAttributivePosition(ctx) {
    const ti   = ctx.targetIdx ?? -1;
    const toks = ctx.tokens ?? [];
    const m    = ctx.morph ?? {};
    if (ti < 1 || !m.case || !m.gender || !m.number) return false;
    const agreesN = (t) => {
        if (!t || _resolveEntryPos(t) !== 'N') return false;
        const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return mm.case === m.case && mm.gender === m.gender && mm.number === m.number;
    };
    if (_resolveEntryPos(toks[ti - 1]) !== 'T') return false;
    // 第2限定位置: 一致名詞が冠詞の直前
    if (ti >= 2 && agreesN(toks[ti - 2])) return true;
    // 第1限定位置: 一致名詞が対象の直後
    if (ti + 1 < toks.length && agreesN(toks[ti + 1])) return true;
    return false;
}
CheckEvaluator.register('ptc_in_attributive_position', _inAttributivePosition);
// Phase 10: 形容詞からも同一アルゴリズムを共通利用（仕様指定の共通化）
CheckEvaluator.register('in_attributive_position', _inAttributivePosition);

// ── Phase 10: Adjective System 用ハンドラ（読み取りのみ） ─────────

// 直前が冠詞
CheckEvaluator.register('has_article', (ctx) => ctx.prevPos === 'T');
CheckEvaluator.register('head_is_article', (ctx) => ctx.prevPos === 'T');

// 一致（格・性・数）する名詞 N が ±3 語以内にあるか
CheckEvaluator.register('adjective_has_agreeing_noun',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const m = ctx.morph ?? {};
        if (!m.case || !m.gender || !m.number) return false;
        for (let i = Math.max(0, ti - 3); i <= ti + 3 && i < toks.length; i++) {
            if (i === ti) continue;
            if (_resolveEntryPos(toks[i]) !== 'N') continue;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (mm.case === m.case && mm.gender === m.gender && mm.number === m.number) return true;
        }
        return false;
    }
);
CheckEvaluator.register('has_no_head_noun',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const m = ctx.morph ?? {};
        if (!m.case || !m.gender || !m.number) return true;
        for (let i = Math.max(0, ti - 3); i <= ti + 3 && i < toks.length; i++) {
            if (i === ti) continue;
            if (_resolveEntryPos(toks[i]) !== 'N') continue;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (mm.case === m.case && mm.gender === m.gender && mm.number === m.number) return false;
        }
        return true;
    }
);

// 述語位置: 冠詞付き一致名詞の外に立つ無冠詞形容詞
//   [Adj]...[T (小辞)* N] または [T (小辞)* N]...[Adj]（±4 語・後置小辞透過）
function _predicatePosition(ctx) {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const m = ctx.morph ?? {};
        if (!m.case || !m.gender || !m.number) return false;
        if (ctx.prevPos === 'T') return false;              // 自身が冠詞付き → 限定
        if (_inAttributivePosition(ctx)) return false;      // 限定位置 → 述語でない
        const POST = ['δέ', 'γάρ', 'οὖν', 'τε', 'μέν', 'καί'];
        const isArticularAgreeingN = (i) => {
            const t = toks[i];
            if (!t || _resolveEntryPos(t) !== 'N') return false;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            if (!(mm.case === m.case && mm.gender === m.gender && mm.number === m.number)) return false;
            let k = i - 1;
            while (k >= 0 && POST.includes(toks[k]?.lemma ?? '')) k--;
            return k >= 0 && _resolveEntryPos(toks[k]) === 'T';
        };
        for (let i = Math.max(0, ti - 5); i <= ti + 5 && i < toks.length; i++) {
            if (i === ti) continue;
            if (isArticularAgreeingN(i)) return true;
        }
        return false;
}
CheckEvaluator.register('predicate_position', _predicatePosition);
// Phase 11: 代名詞からの共通利用（強意 αὐτός の述語位置・仕様指定の別名）
CheckEvaluator.register('intensive_position', _predicatePosition);
CheckEvaluator.register('predicate_pronoun', _predicatePosition);

// ── Phase 11: Pronoun System 用ハンドラ（読み取りのみ） ───────────

// データの type タグ（personal/demonstrative/indefinite/possessive 等）
CheckEvaluator.register('pronoun_type',
    (ctx, [tv]) => String(ctx.target?.type ?? '') === String(tv)
);
// 形態アクセサ（仕様指定の別名群）
CheckEvaluator.register('pronoun_person',
    (ctx, [p]) => String(ctx.morph?.person ?? '') === String(p));
CheckEvaluator.register('pronoun_case',
    (ctx, [c]) => (ctx.morph?.case ?? '') === c);
CheckEvaluator.register('pronoun_number',
    (ctx, [n]) => (ctx.morph?.number ?? '') === n);
CheckEvaluator.register('pronoun_gender',
    (ctx, [g]) => (ctx.morph?.gender ?? '') === g);

// 再帰・相互代名詞（registry リスト参照）
CheckEvaluator.register('reflexive_pronoun',
    (ctx) => ['ἑαυτοῦ', 'σεαυτοῦ', 'ἐμαυτοῦ'].includes(ctx.target?.lemma ?? '')
);
CheckEvaluator.register('reciprocal_pronoun',
    (ctx) => (ctx.target?.lemma ?? '') === 'ἀλλήλων'
);

// 先行詞: 対象より前方に性・数一致の名詞（関係代名詞は格が節内機能で変わるため
// 格は照合しない — Wallace pp.336–337 の一致規則）
function _hasAntecedent(ctx) {
    const ti = ctx.targetIdx ?? -1;
    const toks = ctx.tokens ?? [];
    const m = ctx.morph ?? {};
    if (!m.gender || !m.number) return false;
    for (let i = 0; i < ti; i++) {
        if (_resolveEntryPos(toks[i]) !== 'N') continue;
        const mm = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
        if (mm.gender === m.gender && mm.number === m.number) return true;
    }
    return false;
}
CheckEvaluator.register('has_antecedent', _hasAntecedent);
CheckEvaluator.register('antecedent_agreement', _hasAntecedent);

// 対象が関係節（関係代名詞開始の節）内にあるか
CheckEvaluator.register('relative_clause',
    (ctx) => {
        const s = Number.isInteger(ctx.clauseStart) ? ctx.clauseStart : 0;
        return ['ὅς', 'ὅστις', 'ὅσπερ'].includes((ctx.tokens ?? [])[s]?.lemma ?? '');
    }
);

// ── Phase 19: Discourse System 用ハンドラ（読み取りのみ） ──────────

/** 節内で対象より後方に定形動詞（分詞・不定詞以外）があるか */
function _finiteVerbAfterTarget(ctx) {
    const clause = _clauseTokens(ctx);
    const rel = clause.indexOf(ctx.target);
    if (rel < 0) return false;
    return clause.some((t, k) => {
        if (k <= rel || _resolveEntryPos(t) !== 'V') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood && !['participle', 'infinitive'].includes(m.mood);
    });
}

/** 対象が節の最初の内容語か（接続詞・小辞・冠詞・否定辞を透過） */
function _clauseContentInitial(ctx) {
    const clause = _clauseTokens(ctx);
    for (const t of clause) {
        if (t === ctx.target) return true;
        const pos = _resolveEntryPos(t);
        if (['C', 'T', 'X', 'D'].includes(pos) ||
            _PARTICLE_LEMMAS.has(t?.lemma ?? '')) continue;
        return false;
    }
    return false;
}

// 節頭の主語（主格 + 後続の定形動詞）
CheckEvaluator.register('subject_before_verb',
    (ctx) => ['N', 'R'].includes(ctx.posCode) &&
             (ctx.morph?.case ?? '') === 'nominative' &&
             _clauseContentInitial(ctx) && _finiteVerbAfterTarget(ctx)
);

// 前置目的語（対格・前置詞支配でない + 後続の定形動詞）
CheckEvaluator.register('object_before_verb',
    (ctx) => ['N', 'R'].includes(ctx.posCode) &&
             (ctx.morph?.case ?? '') === 'accusative' &&
             ctx.governorPOS !== 'P' &&
             _clauseContentInitial(ctx) && _finiteVerbAfterTarget(ctx)
);

// 前置構成素（節頭の斜格 = 属格/与格/対格・前置詞支配でない + 後続の定形動詞）
CheckEvaluator.register('fronted_constituent',
    (ctx) => ['N', 'R'].includes(ctx.posCode) &&
             ['genitive', 'dative', 'accusative'].includes(ctx.morph?.case ?? '') &&
             ctx.governorPOS !== 'P' &&
             _clauseContentInitial(ctx) && _finiteVerbAfterTarget(ctx)
);

// 挿入発話動詞（λέγω/φημί/οἶμαι の1人称単数現在直説法・非節頭）
CheckEvaluator.register('parenthetical',
    (ctx) => {
        if (ctx.posCode !== 'V') return false;
        if (!['λέγω', 'φημί', 'οἶμαι', 'οἴομαι'].includes(ctx.target?.lemma ?? '')) return false;
        const m = ctx.morph ?? {};
        if (m.person !== '1' || m.number !== 'singular' ||
            m.tense !== 'present' || m.mood !== 'indicative') return false;
        return !_clauseContentInitial(ctx);
    }
);

// 右方転位（節末の有冠詞句 + 先行する一致代名詞）
CheckEvaluator.register('right_dislocation',
    (ctx) => {
        const clause = _clauseTokens(ctx);
        const rel = clause.indexOf(ctx.target);
        if (rel < 0) return false;
        // 対象が節末の内容語（後続は句読点まで何もない）
        if (rel !== clause.length - 1) return false;
        const m = ctx.morph ?? {};
        if (!m.case) return false;
        // 有冠詞句（直前方向に一致する冠詞・副詞透過）
        let hasArt = false;
        for (let k = rel - 1; k >= 0 && k >= rel - 3; k--) {
            const pos = _resolveEntryPos(clause[k]);
            if (pos === 'D' || pos === 'A' || pos === 'X') continue;   // ποτε(ptcl) 等を透過
            if (pos === 'T') {
                const am = typeof decodeMorph === 'function' ? decodeMorph(clause[k]) : {};
                hasArt = am.case === m.case;
            }
            break;
        }
        if (!hasArt) return false;
        // 先行する一致代名詞（動詞より前方も含む節内）
        return clause.some((t, k) => {
            if (k >= rel - 3) return false;
            if (_resolveEntryPos(t) !== 'R') return false;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return mm.case === m.case && mm.number === m.number;
        });
    }
);

// 対比標識（μέν + 後続 δέ / δέ + 先行 μέν — conjunction 層の談話再提示）
CheckEvaluator.register('contrast_marker',
    (ctx) => {
        const lm = ctx.target?.lemma ?? '';
        const toks = ctx.tokens ?? [];
        const i = ctx.targetIdx ?? 0;
        if (lm === 'μέν') return toks.some((t, k) => k > i && (t.lemma ?? '') === 'δέ');
        if (lm === 'δέ') return toks.some((t, k) => k < i && (t.lemma ?? '') === 'μέν');
        return false;
    }
);

// 説明的挿入の定型（中性 ὅ / τοῦτο + εἰμί 3人称単数現在）
CheckEvaluator.register('explanatory_parenthesis',
    (ctx) => {
        if ((ctx.target?.lemma ?? '') !== 'εἰμί') return false;
        const m = ctx.morph ?? {};
        if (m.person !== '3' || m.number !== 'singular' ||
            m.tense !== 'present' || m.mood !== 'indicative') return false;
        const prev = (ctx.tokens ?? [])[(ctx.targetIdx ?? 0) - 1];
        if (!prev) return false;
        const pm = typeof decodeMorph === 'function' ? decodeMorph(prev) : {};
        return ['ὅς', 'οὗτος'].includes(prev.lemma ?? '') && pm.gender === 'neuter';
    }
);

// 背景要素（従属節内の定形動詞・無冠詞の状況分詞）
CheckEvaluator.register('background_clause',
    (ctx) => {
        if (ctx.posCode !== 'V') return false;
        const m = ctx.morph ?? {};
        if (m.mood === 'participle') return ctx.prevPos !== 'T';   // 無冠詞状況分詞
        if (!m.mood || m.mood === 'infinitive') return false;
        return ctx.subordinateClause === true;
    }
);

// 前景要素（主節の直説法定形動詞）
CheckEvaluator.register('foreground_clause',
    (ctx) => {
        if (ctx.posCode !== 'V') return false;
        const m = ctx.morph ?? {};
        return m.mood === 'indicative' && ctx.subordinateClause !== true;
    }
);

// ── Phase 18: Nominal Syntax 用ハンドラ（Phrase API 読み取りのみ） ──

/** 対象が NP のヘッド名詞か（従属属格 = 先行名詞に係る属格は除外） */
function _isNpHead(ctx) {
    if (ctx.posCode !== 'N') return false;
    if ((ctx.morph?.case ?? '') !== 'genitive') return true;
    // 属格名詞: 前方（冠詞・形容詞・属格代名詞を透過）に名詞があれば従属属格
    const toks = ctx.tokens ?? [];
    for (let k = (ctx.targetIdx ?? 0) - 1, hops = 0; k >= 0 && hops < 4; k--, hops++) {
        const pos = _resolveEntryPos(toks[k]);
        if (pos === 'N') return false;
        if (!['T', 'A', 'R'].includes(pos)) break;
    }
    return true;
}

/** 対象（NP ヘッド）に冠詞が先行するか（形容詞・属格代名詞を透過） */
function _npHasArticle(ctx) {
    const toks = ctx.tokens ?? [];
    for (let k = (ctx.targetIdx ?? 0) - 1, hops = 0; k >= 0 && hops < 4; k--, hops++) {
        const t = toks[k];
        const pos = _resolveEntryPos(t);
        if (pos === 'T') return true;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        if (pos === 'A' || (pos === 'R' && m.case === 'genitive') ||
            _PREP_POSTPOSITIVES.has(t?.lemma ?? '')) continue;
        break;
    }
    return false;
}

/**
 * NP ヘッドの修飾語構成を数える（Phrase API 読み取りのみ）。
 *   - 句内の一致する形容詞（限定形容詞・反復冠詞形の後置形容詞）
 *   - 後続の属格従属句（句内の属格・句直後の属格代名詞/属格句）
 *   - 反復冠詞による分詞/前置詞句/形容詞の限定（第2限定位置）
 *   - 前置の冠詞＋前置詞句/分詞句＋主名詞（第1限定位置）
 * @returns {{count:number, hasGen:boolean, hasPtc:boolean, hasPP:boolean}}
 */
function _npModifiers(ctx) {
    const toks = ctx.tokens ?? [];
    const i = ctx.targetIdx ?? 0;
    const m = ctx.morph ?? {};
    const p = (ctx.phrase && ['NP', 'GenP'].includes(ctx.phrase.type)) ? ctx.phrase : null;
    const s = p ? p.start : Math.max(0, i - 3);
    const e = p ? p.end : i;
    const agrees = (mm) => mm.case === m.case && mm.number === m.number;
    const res = { count: 0, hasGen: false, hasPtc: false, hasPP: false };
    let adjSeen = false;
    // 句内: 一致する形容詞・後続属格
    for (let k = s; k <= e && k < toks.length; k++) {
        if (k === i) continue;
        const pos = _resolveEntryPos(toks[k]);
        const mm = typeof decodeMorph === 'function' ? decodeMorph(toks[k]) : {};
        if (pos === 'A' && agrees(mm) && !adjSeen) { res.count++; adjSeen = true; }
        if (k > i && mm.case === 'genitive' && m.case !== 'genitive' && !res.hasGen) {
            res.count++; res.hasGen = true;
        }
    }
    // 句直後の属格（属格代名詞 μου/ἡμῶν は NP 句に含まれないため別掲）
    let tail = (p ? p.end : i) + 1;
    if (!res.hasGen && m.case !== 'genitive') {
        const mm = toks[tail] ? decodeMorph(toks[tail]) : {};
        if (mm.case === 'genitive') {
            res.count++; res.hasGen = true;
            while (tail < toks.length &&
                   (decodeMorph(toks[tail]).case === 'genitive')) tail++;
        }
    } else if (res.hasGen) {
        while (tail < toks.length && decodeMorph(toks[tail]).case === 'genitive') tail++;
    }
    // 反復冠詞による限定（第2限定位置: … ὁ ἐν … / … ὁ λέγων / … τὸν ἐπιούσιον）
    const rep = toks[tail];
    if (rep && _resolveEntryPos(rep) === 'T' && agrees(decodeMorph(rep))) {
        const nx = toks[tail + 1];
        const nxPos = nx ? _resolveEntryPos(nx) : '';
        const nxM = nx ? decodeMorph(nx) : {};
        if (nxPos === 'P') { res.count++; res.hasPP = true; }
        else if (nxPos === 'V' && nxM.mood === 'participle') { res.count++; res.hasPtc = true; }
        else if (nxPos === 'A' && agrees(nxM)) { res.count++; }
    }
    // 前置の冠詞＋前置詞句/分詞句＋主名詞（第1限定位置: ὁ ἐν τοῖς οὐρανοῖς πατήρ）
    const before = (ctx.phrases ?? []).find(q =>
        ['PP', 'PtcP'].includes(q.type) && q.end === s - 1);
    if (before) {
        const art = toks[before.start - 1];
        if (art && _resolveEntryPos(art) === 'T' && agrees(decodeMorph(art))) {
            res.count++;
            if (before.type === 'PP') res.hasPP = true; else res.hasPtc = true;
        }
    }
    return res;
}

/** 属格連鎖の深さ: 1 + ヘッド後方の有冠詞属格 NP ユニット数 */
function _npDepth(ctx) {
    const toks = ctx.tokens ?? [];
    let depth = 1;
    let k = (ctx.targetIdx ?? 0) + 1;
    while (k < toks.length) {
        // ユニット: T(gen) (A(gen))* N(gen) — 有冠詞属格 NP のみ深さに数える
        if (_resolveEntryPos(toks[k]) !== 'T' ||
            decodeMorph(toks[k]).case !== 'genitive') break;
        let j = k + 1, found = -1;
        while (j < toks.length && j <= k + 3) {
            const pos = _resolveEntryPos(toks[j]);
            const mm = decodeMorph(toks[j]);
            if (mm.case !== 'genitive') break;
            if (pos === 'N' || pos === 'R') { found = j; break; }
            if (pos !== 'A') break;
            j++;
        }
        if (found < 0) break;
        depth++;
        k = found + 1;
    }
    return depth;
}

CheckEvaluator.register('head_noun', _isNpHead);
CheckEvaluator.register('np_has_article', _npHasArticle);
CheckEvaluator.register('np_modifier_count',
    (ctx, [min]) => _npModifiers(ctx).count >= Number(min ?? 1));
CheckEvaluator.register('np_has_genitive', (ctx) => _npModifiers(ctx).hasGen);
CheckEvaluator.register('np_has_participle', (ctx) => _npModifiers(ctx).hasPtc);
CheckEvaluator.register('np_has_pp', (ctx) => _npModifiers(ctx).hasPP);

// 同格並置: 隣接（冠詞介在可）の同格・同数の名詞
CheckEvaluator.register('np_has_apposition',
    (ctx) => {
        const toks = ctx.tokens ?? [];
        const i = ctx.targetIdx ?? 0;
        const m = ctx.morph ?? {};
        if (!m.case) return false;
        const agreeN = (t) => {
            if (!t || _resolveEntryPos(t) !== 'N') return false;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return mm.case === m.case && mm.number === m.number;
        };
        // コプラ節の主格ペアは述語主格（ὁ λόγος σὰρξ ἦν）と区別できないため、
        // 主格の裸隣接は同格と見なさない（有冠詞介在形のみ許可）
        const bareOk = m.case !== 'nominative';
        if (bareOk && agreeN(toks[i - 1])) return true;             // 直前の同格
        if (bareOk && agreeN(toks[i + 1])) return true;             // 直後の同格
        // 直後が一致する冠詞 → その次の名詞（Δαυὶδ τὸν βασιλέα）
        const nx = toks[i + 1];
        if (nx && _resolveEntryPos(nx) === 'T') {
            const mm = typeof decodeMorph === 'function' ? decodeMorph(nx) : {};
            if (mm.case === m.case && agreeN(toks[i + 2])) return true;
        }
        return false;
    });

CheckEvaluator.register('np_depth',
    (ctx, [min]) => _npDepth(ctx) >= Number(min ?? 2));

// 主名詞の句内位置（冠詞を除く内容語 2 以上の句のみ）
CheckEvaluator.register('head_position',
    (ctx, [which]) => {
        const p = ctx.phrase;
        if (!p || p.type !== 'NP') return false;
        const toks = ctx.tokens ?? [];
        const content = [];
        for (let k = p.start; k <= p.end; k++) {
            if (_resolveEntryPos(toks[k]) !== 'T') content.push(k);
        }
        if (content.length < 2) return false;
        const i = ctx.targetIdx ?? 0;
        return which === 'initial' ? content[0] === i
             : which === 'final'   ? content[content.length - 1] === i
             : false;
    });

// 呼格 NP ヘッド（呼格タグ、または ὦ 直後の主格）
CheckEvaluator.register('vocative_np',
    (ctx) => {
        const c = ctx.morph?.case ?? '';
        if (c === 'vocative') return true;
        return c === 'nominative' &&
            ((ctx.tokens ?? [])[(ctx.targetIdx ?? 0) - 1]?.lemma ?? '') === 'ὦ';
    });

// ── Phase 17: Particle System 用ハンドラ（読み取りのみ） ───────────

// 直前トークンが小辞閉クラスに属するか
CheckEvaluator.register('previous_particle',
    (ctx) => _PARTICLE_LEMMAS.has(
        (ctx.tokens ?? [])[(ctx.targetIdx ?? 0) - 1]?.lemma ?? '')
);

// 直後トークンが小辞閉クラスに属するか
CheckEvaluator.register('next_particle',
    (ctx) => _PARTICLE_LEMMAS.has(
        (ctx.tokens ?? [])[(ctx.targetIdx ?? 0) + 1]?.lemma ?? '')
);

// 対象より後方（同一詩節）に ἄν があるか
CheckEvaluator.register('has_following_an',
    (ctx) => (ctx.tokens ?? []).some((t, i) =>
        i > (ctx.targetIdx ?? 0) && (t.lemma ?? '') === 'ἄν')
);

// 節内に否定小辞があるか（既存 negative_particle と同一判定・仕様指定名）
CheckEvaluator.register('negative_environment',
    (ctx) => _clauseTokens(ctx).some(t =>
        ['οὐ', 'οὐκ', 'οὐχ', 'μή', 'μηδέ', 'οὐδέ'].includes(t.lemma ?? ''))
);

// οὐ μή の二重否定連接（οὐ 側・μή 側の両トークンで真）
CheckEvaluator.register('double_negative',
    (ctx) => {
        const toks = ctx.tokens ?? [], i = ctx.targetIdx ?? 0;
        const lm = ctx.target?.lemma ?? '';
        if (['οὐ', 'οὐκ', 'οὐχ'].includes(lm)) return (toks[i + 1]?.lemma ?? '') === 'μή';
        if (lm === 'μή') return ['οὐ', 'οὐκ', 'οὐχ'].includes(toks[i - 1]?.lemma ?? '');
        return false;
    }
);

// 焦点位置: 対象が節の第2位置（後置小辞の古典的スロット）にあるか
CheckEvaluator.register('is_focus_position',
    (ctx) => {
        const clause = _clauseTokens(ctx);
        return clause.indexOf(ctx.target) === 1;
    }
);

// ── Phase 16: Conjunction System 用ハンドラ（読み取りのみ） ────────

// 対象接続詞のレンマがリテラル配列に含まれるか（target_lemma_in の接続詞版）
CheckEvaluator.register('conj_lemma_in',
    (ctx, lemmas) => lemmas.includes(ctx.target?.lemma ?? '')
);

// 対象より後方（同一詩節）に δέ があるか（μέν…δέ 相関の前項判定）
CheckEvaluator.register('has_following_de',
    (ctx) => (ctx.tokens ?? []).some((t, i) =>
        i > (ctx.targetIdx ?? 0) && (t.lemma ?? '') === 'δέ')
);

// 対象より前方（同一詩節）に μέν があるか（μέν…δέ 相関の後項判定）
CheckEvaluator.register('has_preceding_men',
    (ctx) => (ctx.tokens ?? []).some((t, i) =>
        i < (ctx.targetIdx ?? 0) && (t.lemma ?? '') === 'μέν')
);

// 対象の節が従属節か（main_clause の否定・ContextBuilder の既存フラグを参照）
CheckEvaluator.register('clause_is_subordinate',
    (ctx) => ctx.subordinateClause === true
);

// ── Phase 15: Preposition System 用ハンドラ（読み取りのみ） ────────

// 後置小辞 — 文法機能語の閉クラス定数（Phase 4.5D の前例に従う）
const _PREP_POSTPOSITIVES = new Set(['μέν', 'δέ', 'γάρ', 'οὖν', 'τε']);

/** 前置詞直前の冠詞 index（後置小辞を透過）。なければ -1（ὁ δὲ ὀπίσω μου 対応） */
function _prepArticleIdx(ctx) {
    const toks = ctx.tokens ?? [];
    for (let k = (ctx.targetIdx ?? 0) - 1; k >= 0; k--) {
        const t = toks[k];
        if (_PREP_POSTPOSITIVES.has(t?.lemma ?? '')) continue;
        return _resolveEntryPos(t) === 'T' ? k : -1;
    }
    return -1;
}

/**
 * 冠詞＋前置詞句の主名詞（冠詞と一致する被限定語）が前後にあるか。
 *   後方: 冠詞の前（属格修飾語・後置小辞を透過）の名詞/形容詞。
 *         Πάτερ ἡμῶν ὁ ἐν τοῖς οὐρανοῖς — 主格冠詞↔呼格名詞の交替を許容。
 *   前方: 目的語句の後（定形動詞・句読点まで）の一致する名詞/形容詞/分詞。
 *         ὁ δὲ ὀπίσω μου ἐρχόμενος — 主名詞の格が目的語の格と同じ場合は
 *         目的語句との区別が統語だけでは付かないため検出しない（保守的）。
 * 見つからなければ独立用法（substantival_pp）側が立つ。
 */
function _ppArticleHead(ctx) {
    const toks = ctx.tokens ?? [];
    const artIdx = _prepArticleIdx(ctx);
    if (artIdx < 0) return false;
    const am = typeof decodeMorph === 'function' ? decodeMorph(toks[artIdx]) : {};
    const agrees = (m, allowVoc) => {
        if ((m.gender ?? '') !== (am.gender ?? '') ||
            (m.number ?? '') !== (am.number ?? '')) return false;
        if (m.case === am.case) return true;
        return allowVoc &&
            ['nominative', 'vocative'].includes(am.case ?? '') &&
            ['nominative', 'vocative'].includes(m.case ?? '');
    };
    // 後方（第2限定位置: 名詞＋冠詞＋前置詞句）
    // 一致チェックを先に行う: 属格冠詞の主名詞も属格のため
    // （τοῦ πατρός μου τοῦ ἐν οὐρανοῖς）、属格スキップより優先する。
    for (let k = artIdx - 1, hops = 0; k >= 0 && hops < 3; k--, hops++) {
        const t = toks[k];
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        if (['N', 'A'].includes(_resolveEntryPos(t)) && agrees(m, true)) return true;
        if (_PREP_POSTPOSITIVES.has(t?.lemma ?? '') || m.case === 'genitive') continue;
        break;
    }
    // 前方（第1限定位置: 冠詞＋前置詞句＋主名詞）
    let objCase = '';
    for (let k = (ctx.targetIdx ?? 0) + 1, hops = 0; k < toks.length && hops < 9; k++, hops++) {
        const t = toks[k];
        const pos = _resolveEntryPos(t);
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        if (pos === 'V' && m.mood !== 'participle') break;
        if (!objCase && m.case) {
            objCase = m.case;
        } else if (objCase && m.case && m.case !== objCase) {
            const headPos = ['N', 'A'].includes(pos) ||
                (pos === 'V' && m.mood === 'participle');
            if (headPos && agrees(m, false)) return true;
        }
        if (/[·;,.—]/.test(t?.after ?? '')) break;
    }
    return false;
}

// 前置詞の目的語の格（対象より後方で最初に格を持つトークン）が指定格か
CheckEvaluator.register('prep_object_case',
    (ctx, [caseVal]) => {
        const toks = ctx.tokens ?? [];
        for (let i = (ctx.targetIdx ?? 0) + 1, hops = 0;
             i < toks.length && hops < 6; i++, hops++) {
            const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (m.case) return m.case === caseVal;
        }
        return false;
    }
);

// 前置詞の直前（後置小辞を透過）に冠詞があるか
CheckEvaluator.register('prep_has_article',
    (ctx) => _prepArticleIdx(ctx) >= 0
);

// 冠詞＋前置詞句の主名詞が前後にあるか（限定的 vs 独立用法の分岐）
CheckEvaluator.register('pp_article_head', _ppArticleHead);

// ── Phase 14: Clause Syntax 用ハンドラ（読み取りのみ） ────────────

// 対象レンマがリテラル配列に含まれるか（registry の check 文字列内リスト）
CheckEvaluator.register('target_lemma_in',
    (ctx, lemmas) => lemmas.includes(ctx.target?.lemma ?? '')
);

// 節内に指定の法の定形動詞があるか
CheckEvaluator.register('clause_has_mood',
    (ctx, [moodVal]) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === moodVal;
    })
);

// 節内に過去の直説法（アオリスト・未完了）があるか（第2類条件文の前提節）
CheckEvaluator.register('clause_has_past_indicative',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'indicative' && ['aorist', 'imperfect', 'pluperfect'].includes(m.tense ?? '');
    })
);

// 条件標識より後方に ἄν があるか（第2類条件文の標識・Wallace pp.694–696）。
// 節分割が前提節と帰結節を切り分けられない場合（εἰ ἦς ὧδε οὐκ ἂν ἀπέθανεν）
// にも対応するため、対象（εἰ）以降の詩節全域を走査する。
CheckEvaluator.register('apodosis_has_an',
    (ctx) => {
        const toks = ctx.tokens ?? [];
        for (let i = (ctx.targetIdx ?? 0) + 1; i < toks.length; i++) {
            if ((toks[i].lemma ?? '') === 'ἄν') return true;
        }
        return false;
    }
);

// 対象より前方に指定レンマの動詞があるか（内容節の母動詞判定）
CheckEvaluator.register('verb_before_in',
    (ctx, lemmas) => (ctx.tokens ?? []).some((t, i) => {
        if (i >= (ctx.targetIdx ?? 0)) return false;
        if (_resolveEntryPos(t) !== 'V') return false;
        return lemmas.includes(t.lemma ?? '');
    })
);

// ── Phase 13: Vocative System 用ハンドラ（読み取りのみ） ──────────

// ὦ が直前にあるか
CheckEvaluator.register('vocative_marker',
    (ctx) => ((ctx.tokens ?? [])[ (ctx.targetIdx ?? 0) - 1 ]?.lemma ?? '') === 'ὦ'
);

// ±2 語以内に別の呼格トークン（呼格連鎖: Θεέ μου θεέ）
CheckEvaluator.register('adjacent_vocative',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        for (let i = Math.max(0, ti - 2); i <= ti + 2 && i < toks.length; i++) {
            if (i === ti) continue;
            if (!['N', 'A'].includes(_resolveEntryPos(toks[i]))) continue;
            const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (m.case === 'vocative') return true;
        }
        return false;
    }
);

// 隣接呼格と同一句か（Phrase API 読取）
CheckEvaluator.register('vocative_same_phrase',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        if (typeof ctx.samePhrase !== 'function') return false;
        for (let i = Math.max(0, ti - 2); i <= ti + 2 && i < toks.length; i++) {
            if (i === ti) continue;
            const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (m.case === 'vocative' && ctx.samePhrase(i, ti)) return true;
        }
        return false;
    }
);

// 命令法が詩節内にあるか（既存 is_imperative_context の仕様別名・対象自身も含む）
CheckEvaluator.register('imperative_nearby',
    (ctx) => (ctx.tokens ?? []).some(t => {
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'imperative';
    })
);

// ── Phase 12: Nominative System 用ハンドラ（読み取りのみ） ────────

// 主動詞との数の一致（名詞主語の一致判定）
CheckEvaluator.register('subject_agreement',
    (ctx) => {
        if (!ctx.mainVerb) return false;
        const vm = typeof decodeMorph === 'function' ? decodeMorph(ctx.mainVerb) : {};
        return Boolean(vm.number && vm.number === ctx.morph?.number);
    }
);

// 述語主格ペア: コプラ節内に別の主格（有冠詞名詞 or 代名詞 = 主語候補）が
// あり、自身は無冠詞（Wallace pp.42–46 の主語判定規則の裏返し）
CheckEvaluator.register('predicate_nom_pair',
    (ctx) => {
        if (ctx.prevPos === 'T') return false; // 自身が有冠詞 → 主語側
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const s = Number.isInteger(ctx.clauseStart) ? ctx.clauseStart : 0;
        const e = Number.isInteger(ctx.clauseEnd) ? ctx.clauseEnd : toks.length - 1;
        for (let i = s; i <= e; i++) {
            if (i === ti) continue;
            const pos = _resolveEntryPos(toks[i]);
            const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (m.case !== 'nominative') continue;
            if (pos === 'R') return true;                       // 代名詞 = 主語
            if (pos === 'N' && i > s && _resolveEntryPos(toks[i - 1]) === 'T') return true; // 有冠詞名詞 = 主語
        }
        return false;
    }
);

// roleMap 上で主語ロールか
CheckEvaluator.register('head_is_subject',
    (ctx) => ctx.roleMap?.get?.(ctx.target)?.role === 'subj'
);

// 同格: 直前（または直後）に隣接する主格名詞
function _appositionAdjacent(ctx) {
    const ti = ctx.targetIdx ?? -1;
    const toks = ctx.tokens ?? [];
    const isNomN = (t) => {
        if (!t || _resolveEntryPos(t) !== 'N') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.case === 'nominative';
    };
    return isNomN(toks[ti - 1]);
}
CheckEvaluator.register('apposition', _appositionAdjacent);
CheckEvaluator.register('apposition_same_phrase',
    (ctx) => {
        if (!_appositionAdjacent(ctx)) return false;
        return typeof ctx.samePhrase === 'function'
            ? ctx.samePhrase(ctx.targetIdx - 1, ctx.targetIdx)
            : false;
    }
);

// 懸垂主格: 後続（自節の外）に性・数一致の再開代名詞（αὐτός/οὗτος/ἐκεῖνος）
function _hasResumePronoun(ctx) {
    const toks = ctx.tokens ?? [];
    const e = Number.isInteger(ctx.clauseEnd) ? ctx.clauseEnd : toks.length - 1;
    const m = ctx.morph ?? {};
    for (let i = e + 1; i < toks.length; i++) {
        const t = toks[i];
        if (!['αὐτός', 'οὗτος', 'ἐκεῖνος'].includes(t.lemma ?? '')) continue;
        const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        if (mm.gender === m.gender && mm.number === m.number) return true;
    }
    return false;
}
CheckEvaluator.register('has_following_resume_pronoun', _hasResumePronoun);
CheckEvaluator.register('pendens', _hasResumePronoun);

// 懸垂主格の複合構造判定: ①有冠詞（後置小辞 γάρ/δέ の介在許容）
// ②自節に定形動詞なし（宙吊り）③後続節に性・数一致の再開代名詞
CheckEvaluator.register('pendens_structure',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const POST = ['δέ', 'γάρ', 'οὖν', 'τε', 'μέν'];
        let k = ti - 1;
        while (k >= 0 && POST.includes(toks[k]?.lemma ?? '')) k--;
        if (k < 0 || _resolveEntryPos(toks[k]) !== 'T') return false;
        if (ctx.clause?.mainVerb != null) return false;
        return _hasResumePronoun(ctx);
    }
);

// 呼びかけ文脈: 詩節内に 2 人称（σύ 系代名詞 or 2 人称定形動詞）
CheckEvaluator.register('vocative_context',
    (ctx) => (ctx.tokens ?? []).some(t => {
        if ((t.lemma ?? '') === 'σύ') return true;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return _resolveEntryPos(t) === 'V' && String(m.person ?? t.person ?? '') === '2' &&
               m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
    })
);

// 不変化固有名詞（registry リスト）
CheckEvaluator.register('indeclinable_noun',
    (ctx) => {
        const list = ctx._registry?.getList?.('indeclinable_lemmas');
        return Boolean(list && list.has(ctx.target?.lemma ?? ''));
    }
);

// 一致する主格分詞が節内にあるか（独立主格の随伴分詞）
CheckEvaluator.register('absolute_participle',
    (ctx) => _clauseTokens(ctx).some(t => {
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood === 'participle' && m.case === 'nominative' &&
               m.gender === ctx.morph?.gender && m.number === ctx.morph?.number;
    })
);

// 表題句: 詩節全体に定形動詞がない
function _verseWithoutFinite(ctx) {
    return !(ctx.tokens ?? []).some(t => {
        if (_resolveEntryPos(t) !== 'V') return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
    });
}
CheckEvaluator.register('verse_without_finite', _verseWithoutFinite);
CheckEvaluator.register('title_phrase',
    (ctx) => _verseWithoutFinite(ctx) &&
             (ctx.targetIdx ?? 99) - (ctx.clauseStart ?? 0) <= 2
);

// 対象がコプラより前にあるか
CheckEvaluator.register('subject_before_copula',
    (ctx) => {
        const cv = ctx.copulaVerb;
        if (!cv) return false;
        const i = (ctx.tokens ?? []).indexOf(cv);
        return i > (ctx.targetIdx ?? -1);
    }
);

// 節内定形動詞なし（既存 clause_lacks_finite_verb の仕様別名）
CheckEvaluator.register('clause_without_finite',
    (ctx) => ctx.clause?.mainVerb == null
);

// 節頭（節先頭から 3 語以内）
CheckEvaluator.register('clause_initial',
    (ctx) => (ctx.targetIdx ?? 99) - (ctx.clauseStart ?? 0) <= 2
);

// 節内に与格名詞（書簡挨拶の宛先）
CheckEvaluator.register('clause_has_dative_noun',
    (ctx) => _clauseTokens(ctx).some(t => {
        if (!['N', 'A', 'R'].includes(_resolveEntryPos(t))) return false;
        const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
        return m.case === 'dative';
    })
);

// 対象の直前が冠詞（別名・冠詞付き呼びかけ）
CheckEvaluator.register('has_article_before_target',
    (ctx) => ctx.prevPos === 'T'
);

// 比較級・最上級（形態 degree フィールド + registry 不規則リスト）
CheckEvaluator.register('comparative_degree',
    (ctx) => {
        if ((ctx.target?.degree ?? '') === 'comparative') return true;
        const list = ctx._registry?.getList?.('comparative_irregular_lemmas');
        return Boolean(list && list.has(ctx.target?.lemma ?? ''));
    }
);
CheckEvaluator.register('superlative_degree',
    (ctx) => {
        if ((ctx.target?.degree ?? '') === 'superlative') return true;
        const list = ctx._registry?.getList?.('superlative_irregular_lemmas');
        return Boolean(list && list.has(ctx.target?.lemma ?? ''));
    }
);

// 一致する固有名詞が隣接（エピセット: κράτιστε Θεόφιλε）
CheckEvaluator.register('adjacent_proper_noun_agrees',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        const m = ctx.morph ?? {};
        const isProperAgreeing = (t) => {
            if (!t || _resolveEntryPos(t) !== 'N') return false;
            const l = t.lemma ?? '';
            const c = l.length ? l.codePointAt(0) : 0;
            if (!(c >= 0x0391 && c <= 0x03A9)) return false;
            const mm = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return mm.case === m.case && mm.gender === m.gender && mm.number === m.number;
        };
        return isProperAgreeing(toks[ti + 1]) || isProperAgreeing(toks[ti - 1]);
    }
);

// 属格補語の支配（Dependency API: 属格語の governs 解決が当該形容詞）
CheckEvaluator.register('governs_genitive',
    (ctx) => {
        const ti = ctx.targetIdx ?? -1;
        const toks = ctx.tokens ?? [];
        if (typeof ctx.governs !== 'function') return false;
        for (let i = ti + 1; i <= ti + 3 && i < toks.length; i++) {
            const m = typeof decodeMorph === 'function' ? decodeMorph(toks[i]) : {};
            if (m.case === 'genitive' && ctx.governs(ti, i)) return true;
        }
        return false;
    }
);

// コプラ節（既存 context_has_copula の仕様別名）
CheckEvaluator.register('copular_clause',
    (ctx) => {
        const COPULA = ['εἰμί', 'γίνομαι', 'ὑπάρχω'];
        return _clauseTokens(ctx).some(t => {
            if (t === ctx.target) return false;
            if (_resolveEntryPos(t) !== 'V') return false;
            if (!COPULA.includes(t.lemma ?? '')) return false;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        });
    }
);
