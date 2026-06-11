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
 *   const registryJson = await fetch('./syntax-registry.json').then(r => r.json())
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
            const args = argsStr
                ? argsStr.split(',').map(a => a.trim().replace(/^['"]|['"]$/g, ''))
                : [];

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
CheckEvaluator.register('prev_pos_eq',
    (ctx, [posCode]) => ctx.prevPos === posCode
);
CheckEvaluator.register('prev_pos_in',
    (ctx, posCodes) => posCodes.includes(ctx.prevPos)
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

// ターゲットのレンマがリストに含まれるか（registry の named list 参照）
CheckEvaluator.register('target_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(ctx.target?.lemma ?? '');
    }
);

// ヘッド名詞のレンマがリストに含まれるか
CheckEvaluator.register('head_lemma_in_list',
    (ctx, [listName]) => {
        if (!ctx.headNoun) return false;
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(ctx.headNoun.lemma ?? '');
    }
);

// 動詞レンマがリストに含まれるか（節内動詞全体をスキャン）
CheckEvaluator.register('verb_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return (ctx.tokens ?? []).some(t => {
            // entryPosCode は morph-decoder.js 依存だが、ここでは ctx 経由で使用
            const posCode = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            return posCode === 'V' && list.has(t.lemma ?? '');
        });
    }
);

// コンテキスト: 節内に指定レンマが存在するか
CheckEvaluator.register('context_has_lemma_in',
    (ctx, lemmas) => (ctx.tokens ?? []).some(t => lemmas.includes(t.lemma ?? ''))
);

// コンテキスト: 節内動詞レンマがリストに含まれるか（DativeScorer 用）
CheckEvaluator.register('context_verb_lemma_in_list',
    (ctx, [listName]) => {
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return (ctx.tokens ?? []).some(t => {
            const posCode = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            return posCode === 'V' && list.has(t.lemma ?? '');
        });
    }
);

// コンテキスト: ヘッド名詞レンマがリストに含まれるか（コンテキスト版）
CheckEvaluator.register('context_head_lemma_in_list',
    (ctx, [listName]) => {
        if (!ctx.headNoun) return false;
        const list = ctx._registry?.getList?.(listName);
        if (!list) return false;
        return list.has(ctx.headNoun.lemma ?? '');
    }
);

// コンテキスト: 格・性・数が一致する名詞が存在するか（ParticipleScorer用）
CheckEvaluator.register('context_has_case_gender_number_match',
    (ctx) => ctx.matchingNoun != null
);

// コンテキスト: 節内に属格名詞が存在するか
CheckEvaluator.register('context_has_genitive_noun',
    (ctx) => ctx.genitiveNoun != null
);

// コンテキスト: 節内に比較級形容詞（-τερ語尾）が存在するか
CheckEvaluator.register('context_has_comparative_adj',
    (ctx) => (ctx.tokens ?? []).some(t => /τερ(ος|α|ον)/.test(t.word ?? ''))
);

// コンテキスト: 節内に否定・反抗語があるか
CheckEvaluator.register('context_has_negation',
    (ctx) => !!ctx.hasAdversative
);

// コンテキスト: 動詞が συν- 複合語か
CheckEvaluator.register('context_verb_has_syn_prefix',
    (ctx) => (ctx.tokens ?? []).some(t => {
        const posCode = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
        if (posCode !== 'V') return false;
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

// 一致名詞との距離
CheckEvaluator.register('distance_to_match_le',
    (ctx, [n]) => {
        if (!ctx.matchingNoun) return false;
        const idx = (ctx.tokens ?? []).indexOf(ctx.matchingNoun);
        return Math.abs(idx - ctx.targetIdx) <= Number(n);
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
                rawScore:       typeDef.xsc?.default_confidence ?? 0,
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

        return { typeId: typeDef.id, rawScore: score, signalsMatched: matched, signalsFailed: failed, deltas, typeDef };
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
    /** 属格名詞にのみ対応する */
    canHandle(ctx) {
        return ctx.morph?.case === 'genitive';
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

        return types
            // priority 昇順で評価（数値が小さい方が先）
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            // null（対象外）と rawScore = 0 を除外
            .filter(result => result !== null && result.rawScore > 0);
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
        return ctx.morph?.case === 'dative';
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

        return types
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

        return types
            // priority 昇順で評価（数値が小さい方が先）
            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
            // 各 type を基底クラスの _evaluateType で評価:
            //   1. required_case/required_mood/required_pos チェック
            //   2. stub → default_confidence を rawScore とする
            //   3. exclusions → 1件でも true なら rawScore = 0
            //   4. detection.signals を評価し base_weight から weight 加算
            //      例: article_agrees_case_gender_number() → +weight
            //          context_has_case_gender_number_match() → +weight
            //          distance_to_match_le(2) → +weight
            //   5. RawCandidate { typeId, rawScore, signalsMatched, signalsFailed, deltas, typeDef } を返す
            .map(typeDef => this._evaluateType(typeDef, enrichedCtx))
            // null（required_* 不一致で対象外）と rawScore = 0 を除外
            .filter(result => result !== null && result.rawScore > 0);
    }
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            const m   = typeof decodeMorph  === 'function' ? decodeMorph(t)  : {};
            return pos === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        }) ?? null;
    }

    /** コプラ動詞を返す */
    function _findCopulaVerb(tokens) {
        return tokens.find(t => {
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            if (!['N','A','R','D','P'].includes(pos)) return false;
            const m = typeof decodeMorph === 'function' ? decodeMorph(t) : {};
            return m.case === 'genitive';
        }) ?? null;
    }

    /** 知覚・認識動詞を探す */
    function _findPerceptionVerb(tokens, _targetIdx, perceptionLemmas) {
        if (!perceptionLemmas || perceptionLemmas.size === 0) return null;
        return tokens.find(t => {
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            return pos === 'V' && perceptionLemmas.has(t.lemma ?? '');
        }) ?? null;
    }

    /** ヘッド名詞を探す（属格用：直前の名詞系トークン） */
    function _findHeadNoun(tokens, targetIdx) {
        for (let i = targetIdx - 1; i >= 0; i--) {
            const pos = typeof entryPosCode === 'function' ? entryPosCode(tokens[i]) : (tokens[i].pos ?? '');
            if (['N','A','R'].includes(pos)) return tokens[i];
            if (!['T','D'].includes(pos)) break; // 冠詞・副詞は飛ばす、それ以外で中断
        }
        return null;
    }

    /** 直前または2語前に冠詞があるかチェック */
    function _checkArticleBefore(tokens, targetIdx) {
        for (let back = 1; back <= 2; back++) {
            if (targetIdx - back < 0) break;
            const pos = typeof entryPosCode === 'function'
                ? entryPosCode(tokens[targetIdx - back])
                : (tokens[targetIdx - back].pos ?? '');
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            const m   = typeof decodeMorph  === 'function' ? decodeMorph(t)  : {};
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
                    const prevPos = prev ? (typeof entryPosCode === 'function' ? entryPosCode(prev) : (prev.pos ?? '')) : '';
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
            const morph   = typeof decodeMorph  === 'function' ? decodeMorph(target)  : {};
            const posCode = typeof entryPosCode === 'function' ? entryPosCode(target) : (target.pos ?? '');
            const word    = typeof cleanText    === 'function' ? cleanText(target)    : (target.word ?? '');

            // 周辺トークン
            const prevToken = targetIdx > 0 ? tokens[targetIdx - 1] : null;
            const prevPos   = prevToken
                ? (typeof entryPosCode === 'function' ? entryPosCode(prevToken) : (prevToken.pos ?? ''))
                : '';
            const prevLemma = prevToken?.lemma ?? '';
            const nextToken = targetIdx < tokens.length - 1 ? tokens[targetIdx + 1] : null;
            const nextPos   = nextToken
                ? (typeof entryPosCode === 'function' ? entryPosCode(nextToken) : (nextToken.pos ?? ''))
                : '';

            // 節レベル
            const mainVerb    = _findMainVerb(tokens);
            const mainVerbIdx = mainVerb ? tokens.indexOf(mainVerb) : -1;
            const copulaVerb  = _findCopulaVerb(tokens);
            const roleMap     = _buildInitialRoleMap(tokens);

            // 分詞専用
            const { matchingNoun, matchScore } = _findMatchingNoun(target, tokens, targetIdx, morph);
            const genitiveNoun   = (morph.case === 'genitive')
                ? _findGenitiveNoun(tokens, targetIdx)
                : null;
            const perceptionLemmas = registry?.getList?.('perception_verb_lemmas') ?? new Set();
            const perceptionVerb = _findPerceptionVerb(tokens, targetIdx, perceptionLemmas);

            // 属格用ヘッド名詞
            const headNoun = (morph.case === 'genitive') ? _findHeadNoun(tokens, targetIdx) : null;

            // 与格専用
            const givingLemmas     = registry?.getList?.('giving_verb_lemmas')     ?? new Set();
            const adversativeLemmas= registry?.getList?.('adversative_lemmas')     ?? new Set();
            const negationLemmas   = registry?.getList?.('negation_lemmas')        ?? new Set();

            const hasGivingVerb = tokens.some(t => {
                const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
                return pos === 'V' && givingLemmas.has(t.lemma ?? '');
            });

            const hasAdversative = tokens.some(t => {
                const l = t.lemma ?? '';
                return adversativeLemmas.has(l) || negationLemmas.has(l);
            }) || tokens.some(t => {
                const w = typeof cleanText === 'function' ? cleanText(t) : (t.word ?? '');
                return w === 'οὐ' || w === 'οὐκ' || w === 'οὐχ' || w === 'μή' || w === 'μηδέ';
            });

            return {
                target, tokens, targetIdx, morph, posCode, word,
                prevToken, prevPos, prevLemma,
                nextToken, nextPos,
                mainVerb, mainVerbIdx, copulaVerb, roleMap,
                headNoun,
                hasArticleBefore: _checkArticleBefore(tokens, targetIdx),
                isAfterPrep: prevPos === 'P',
                matchingNoun, matchScore,
                genitiveNoun, perceptionVerb,
                hasGivingVerb, hasAdversative,
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            const m   = typeof decodeMorph  === 'function' ? decodeMorph(t)  : {};
            return pos === 'V' && m.mood && m.mood !== 'participle' && m.mood !== 'infinitive';
        });
        if (mainVerbIdx < 0) return null;

        const pos  = typeof entryPosCode === 'function' ? entryPosCode(target) : (target.pos ?? '');
        const role = roleMap.get(target)?.role;

        if (!role || role === 'other' || role === 'conj') return null;
        if (SKIP_POS.has(pos)) return null;

        // ① 動詞より前の実質語 → topicalization / fronted-subj
        if (targetIdx < mainVerbIdx) {
            if (role === 'subj') {
                const effectiveStart = tokens.findIndex(t2 => {
                    const p = typeof entryPosCode === 'function' ? entryPosCode(t2) : (t2.pos ?? '');
                    return !SKIP_POS.has(p);
                });
                const hasPrior = tokens.slice(0, targetIdx).some(t2 => {
                    const p = typeof entryPosCode === 'function' ? entryPosCode(t2) : (t2.pos ?? '');
                    return !SKIP_POS.has(p);
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
                const p = typeof entryPosCode === 'function' ? entryPosCode(t2) : (t2.pos ?? '');
                return !SKIP_POS.has(p);
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
            new GenitiveScorer(),
            new DativeScorer(),
            new ParticipleScorer(),
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

        // 2. 担当スコアラーを選択（先頭一致・1件のみ）
        const scorer = this.scorers.find(s => s.canHandle(ctx));
        if (!scorer) {
            return this._emptyOutput(ctx);
        }

        // 3. 候補スコア計算
        const rawCandidates = scorer.score(ctx, this.registry);

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

// ブラウザ（script タグ）用
if (typeof window !== 'undefined') {
    window.SyntaxAnalyzer     = SyntaxAnalyzer;
}

// ES Module 用（バンドラー環境）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SyntaxAnalyzer, RegistryLoader, CheckEvaluator, CandidateNormalizer };
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
            const pos = typeof entryPosCode === 'function' ? entryPosCode(t) : (t.pos ?? '');
            const m   = typeof decodeMorph  === 'function' ? decodeMorph(t)  : {};
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
        'comparative_adjective_present':        'comparative_adjective',
        'separation_verb_present':              'separation_verb',
        'prep_apo_or_ek':                       'prep_apo_ek',
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
                rawScore:       typeDef.xsc?.default_confidence ?? 0,
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
            rawScore: score,
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
