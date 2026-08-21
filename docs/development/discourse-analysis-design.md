# Discourse Analysis Mode 設計仕様書（DA-0）

作成: 2026-08-15
Phase: **DA-0（設計フェーズ・コード変更なし）**
State: DESIGN
Change Type: `DOCUMENTATION`（将来 `FEATURE` の前提設計）
位置づけ: 「読み方を選択」に新しい読み方として **語順フロー / 談話分析** を持たせるための、
**談話分析モードの定義・責務・境界・第一版scopeを確定する設計正典**。UI・データ・既存コードの実装は行わない。

根拠（FROZEN / 既存仕様）:
- `CLAUDE.md`（First Principle・L-0 Boundary）
- `docs/development/verse-representation-design.md`（Analysis → Representation → Renderer・DisplayMode Registry）
- `docs/development/reading-observation-information-architecture.md`（三つの家・**Passage=広さ軸**・FROZEN 2026-07-22）
- `docs/development/discourse-boundary-classification.md`（Discourse Layer(future)・指示詞 1,377・FROZEN候補 2026-07-20）
- `docs/development/neighborhood-view-design.md` / `flow-tree-representation-schema.md`（Structure Flow の責務）

Evidence 凡例: **CONFIRMED**（実コード/実データで確認）/ **OBSERVED**（実行・実測）/ **INFERRED**（設計上の推論）/ **NOT VERIFIED**。

---

## 0. 調査で確認した事実（DA-0-A の結論・Evidence 付き）

### 0.1 現行アーキテクチャ（CONFIRMED）

- **パイプライン**: `bible_data` → Analysis（Reading Engine 7フェーズ・FROZEN）→ **Representation**（`buildRepresentation(displayMode, verse, analysis)`）→ **Renderer Registry** → HTML。
  Representation は「意味の決定」と「表示」を切り離す唯一の受け渡し契約である
  （`verse-representation-design.md` §0・§A）。**CONFIRMED**。
- **DisplayMode Registry は実装済み**。`public/index.html:4430` `DISPLAY_MODE_REGISTRY = [ ...translations, { kind:'wordOrder' } ]`。
  `syntaxTree` は仕様のみ（`status:'planned'`・未実装）。**CONFIRMED**。
- **「読み方を選択」の現状**: Bible Picker のグループが、各翻訳（口語訳 / 文語訳 / 新改訳2017=planned）＋ **語順フロー** を提示する（`index.html:4423-4433`）。談話分析という選択肢は存在しない。**CONFIRMED**。

### 0.2 データに存在する一次注釈（CONFIRMED / OBSERVED）

`public/bible_data/nt/{BOOK}/{ch}.json` の各 token は以下を保持する（MACULA/Lowfat 由来・全 token 同一スキーマ）:

| フィールド | 内容 | John 全体の充足率（OBSERVED） |
|---|---|---|
| `role` | 統語役割 `s/v/o/io/vc/adv/p/aux/o2` | v=3100, o=737, s=724 … （空 9154/15625） |
| `class` | 品詞 `verb/noun/pron/det/conj/prep/adv/adj/ptcl/num` | pron=2416, conj=2004 |
| `frame` | PropBank 型 述語項構造 `A0:tokenId A1:tokenId A2:…` | **20.2%**（A0=2975, A1=1544, A2=449） |
| `referent` | 照応先 tokenId（源注釈） | **14.3%** |
| `subjref` | 主語照応（省略主語含む） | **12.2%** |
| `lemma` | 接続詞含む語彙（`γάρ/δέ/οὖν/ἀλλά/ἵνα/ὅτι/μέν …`） | 100% |

Romans の接続詞実測（OBSERVED）: `καί`203 / `δέ`145 / `γάρ`143 / `ἀλλά`69 / `οὖν`47 / `ὅτι`47 / `εἰ`43 / `ἵνα`29 / `μέν`16 …
→ **接続関係を表す語彙標識は決定的・高被覆で存在する**。

`public/assets/data/flow-tree/{BOOK}/{ch}.json` は `type:'clause'` ノードを一次構造として持つ
（Rom5 で clause=102 ノード・OBSERVED）。→ **clause は既にデータ上の一次単位である**。

### 0.3 既存の語順フローが surfacing している談話情報（CONFIRMED）

`index.html:6772-6832` の word-detail signal 生成が、接続詞を**語単位のインライン signal**として既に提示している:
`γάρ`「ここで理由が始まります」/ `ἀλλά`「しかしによる転換」/ `οὖν`「論理が結論へ進みます」/
`ἵνα`「目的節」/ `ὅτι`「内容・理由節」等。**CONFIRMED**。
→ 談話分析モードは、この**語単位 signal の焼き直しであってはならない**（§2・§8 参照）。

### 0.4 既存 FROZEN 設計が「談話」をどこへ割り当てているか（CONFIRMED・最重要）

- `reading-observation-information-architecture.md`（FROZEN 2026-07-22）は情報を**三つの家**に分ける:
  **Reading（読む声）/ Word（StudyPanel・word-anchored・深さ軸 L1→L2→L3）/ Passage（別View・広さ軸）**。
  **Discourse は Passage の家（別 View・passage スコープ・広さ軸）に一意に割り当て済み**であり、
  「passage を word 深さ軸に混入させると progressive disclosure が破綻する（P1）」と明記されている。**CONFIRMED**。
- `discourse-boundary-classification.md`（FROZEN候補 2026-07-20）は、指示詞 1,377 件の
  この/これ/その/それ・照応（anaphora）の決定的解決を **Discourse Layer(future)** に割り当て、
  「**これがプロジェクトの主要な将来拡張ポイント**」「Discourse Layer が整備されるまで 1,192 件は未判定」と明記。**CONFIRMED**。

→ **談話分析モードは新規発明ではなく、既存 FROZEN 設計が予約済みの「Passage の家 / Discourse Layer(future)」の
最初の具体化である。** これは差別化の根拠であると同時に、L-0 の地雷原（照応解決）でもある（§7）。

### 0.5 前提の食い違い（NOT VERIFIED・要報告）

タスク前提「現在の main は SF-43 まで反映」「SF-37-B」は、**実リポジトリで確認できない**。
git log 最新は `SF-35-B`（`b7637d55` 系列）、`docs/development/` の SF 系文書は SF-29/SF-30 が最新。
**SF-37-B / SF-43 という識別子はコード・ドキュメントのいずれにも存在しない**（`grep` 実測）。
本設計は「実在する SF-35 系までの Structure Flow」を既存完成物として扱う。**NOT VERIFIED**（前提の名称）。
設計判断への影響はない（Structure Flow の責務境界は SF 番号に依存しない）が、Evidence Policy に従い明記する。

---

## 1. Executive Summary

**結論: 談話分析は独立した「読み方」として成立する。ただし第一版で扱えるのは
「節と節がどうつながっているか（接続関係）」だけである。Topic / Focus / Given-New は第一版に入れない。**

- 語順フロー / Syntax Tree は「**一文がどう組み立てられているか（文内の包含構造）**」を見る。単位は語、スコープは節/文、辺は「母子＝包含」。
- 談話分析は「**節と節が文脈の中でどうつながって議論が進むか**」を見る。単位は節、スコープは段落（複数節）、辺は「だから／なぜなら／しかし／その結果＝論理的接続」。
- 両者は**辺の意味が異なり、スコープが異なる**。既存 FROZEN の「三つの家（Word 深さ軸 / Passage 広さ軸）」に照らして、談話分析は Passage の家＝広さ軸に属し、Structure Flow（Word の家）とは軸が違う。したがって「Syntax Tree に色を付けただけ」にはならない。
- **第一版 scope = 接続関係のみ（Clause Connection View）**。接続詞という**決定的・語彙的・源データ由来**の標識に限定し、推論を持ち込まない。
- **Topic / Focus / Given-New / 照応解決は第一版の非対象**。決定的データが無く、L-0（推論禁止）に抵触するため。
- 最大の未解決リスク: **照応連鎖（referential continuity）を「価値の核」と誤認して referent resolution を UI に持ち込むこと**。`referent` は源注釈として存在するが、これを「この代名詞は◯◯を指す」と提示すれば L-0 違反である（§7）。

---

## 2. Why Discourse Analysis is a separate Reading Mode

「読み方」は First Principle（原著者の意図理解）に貢献する**別の読解の視点**であるときにのみ独立モードたりうる。

原著者の意図、とりわけ書簡（パウロ書簡）の意図は、**個々の文の内部構造よりも、節と節の論理的接続の連鎖**（`γάρ`＝根拠、`οὖν`＝帰結、`διό`＝それゆえ、`ἀλλά`＝転換、`μέν…δέ`＝対比）に強く現れる。
「なぜこの節がここに来るのか」「著者の議論はどう進んでいるのか」を追うことは、まさに **Reading-first（読むための研究）** そのものである。

これは既存モードのどれも主目的にしていない読解視点である:
- 翻訳モード: 訳文を読む（接続は訳文に溶けて、構造として可視化されない）。
- 語順フロー: 原文語順で語を追う。接続詞は語単位 signal として点在するが、**節間の接続の連鎖としては提示されない**。
- Structure Flow / Syntax Tree: 一文内の包含構造。**節をまたぐ論理接続は責務外**（`neighborhood-view-design.md` §3「構成語群を超える祖先階層は非観察対象」）。

したがって談話分析は、既存モードの再表示ではなく、**新しい読解の視点＝新しい読み方**を生む。**判定: モード追加は正当（§8 で厳密比較）。**

---

## 3. Current Structure Flow / Syntax Tree responsibility（実測に基づく）

| 項目 | 実測された責務 | Evidence |
|---|---|---|
| 語順フロー（wordOrder） | 節の語を**原文語順**で chip 列として提示。各 chip は gloss・roleClass・morphText・語単位 signal を持つ | `verse-representation-design.md` §C-3・`index.html` `_wordToFlowChip` / signal 生成 6772-（CONFIRMED） |
| Structure Flow / NeighborhoodView | focus 語が**実際に属する構成語群**（直近の親配下の構成員）を、Flow Tree を根拠に観察可能にする射影。**文内の包含（母子）関係のみ**。role/relation は**表示しない** | `neighborhood-view-design.md` §0・§2・§7（CONFIRMED） |
| Syntax Tree（構文ツリー） | **未実装**。仕様のみ（node/edge・`edges[].relation` は将来 `role/frame` から変換）。`status:'planned'` | `verse-representation-design.md` §C-4（CONFIRMED・未実装） |

**共通点**: いずれも**一文の内部**を対象とし、辺の意味は「包含（syntax containment）」である。**節をまたがない。論理接続を辺として持たない。**
→ この空白（節間の論理接続・passage スコープ）が、談話分析が埋める領域である。

---

## 4. Definition of Discourse Analysis for this app

> **このアプリにおける談話分析とは、
> 「文がどう組み立てられているか」ではなく、
> 「複数の節が文脈の中でどのようにつながり、著者の思考／議論がどう進行しているか」を、
> 決定的な語彙的・構造的標識だけを根拠に観察可能にする読み方である。**

- **基本単位**: 節（clause）。flow-tree の `type:'clause'` を一次単位として利用する（CONFIRMED・データ上既存）。
- **スコープ**: 段落（複数節）＝ Passage の広さ軸。単節では談話にならない。
- **主対象**: 節と節の**接続関係**（辺）。副次的に、節内で接続を担う語（接続詞）を辺のラベル根拠として参照する。
- **根拠**: 接続詞 lemma（`γάρ/οὖν/δέ/ἀλλά/διό/ὥστε/ἵνα/ὅτι/εἰ/ἐάν/μέν…δέ`）という**源データ上の決定的事実**。
- **やらないこと**: 語義の確定・照応先の確定・Topic/Focus の推定・自然な訳文化（すべて L-0・§7）。

**「読むための談話」であって「談話分析学の専門画面」ではない。** 学術ラベル（Theme/Rheme, information packaging 等）を UI に露出しない（§10・§14）。

---

## 5. Candidate discourse dimensions（DA-0-B の評価）

各次元を 6 観点で評価する。**◎=第一版適格 / △=将来候補（L-0注意）/ ✗=不採用**。

| # | 次元 | 読む価値 | Reading-first整合 | L-0抵触 | UI安全表現 | Syntax差別化 | 判定可能データ | 総合 |
|---|---|---|---|---|---|---|---|---|
| 1 | **Discourse continuity（接続関係）** | 高（議論の流れ＝意図の核） | ◎ | **抵触なし**（接続詞は源データの決定的事実） | ◎（節間の辺＋ラベル） | ◎（Syntaxは包含・これは論理接続） | ◎ 接続詞 lemma・高被覆 | **◎ 第一版** |
| 2 | **Contrast（対比）** | 高（`μέν…δέ`/`οὐ…ἀλλά`） | ◎ | 抵触なし（語彙標識が決定的） | ◎ | ◎ | ◎ 特定 lemma・パターン | **◎ 第一版**（#1 の一種として統合） |
| 3 | **Clause-level information structure（frame A0/A1）** | 中（誰が誰に） | △ | 低（源注釈）だが**役割の言い換え**に滑りやすい | △ | ✗（role として既に Structure Flow が扱う領域と重複） | △ 20% 被覆・動詞限定 | **✗ 不採用**（Word の家・重複） |
| 4 | **Referential continuity（照応連鎖）** | 高（同一人物が続くか） | ○（追えると読みは助かる） | **高**（referent 解決＝L-0 の核心禁止） | △（誤解を生みやすい） | ○ | △ `referent/subjref` 14%・源注釈 | **△ DA-2 候補・強い制約付き（§6.4・§7）** |
| 5 | **Given / New（情報の既出/新規）** | 中 | △ | **高**（初出=New は禁止された単純推定・文脈追跡が必要） | △ | ○ | ✗ 情報状態の注釈が無い | **✗ 非対象（§6.3）** |
| 6 | **Topic（何について）** | 中 | △ | **高**（主語=Topic は禁止された単純推定） | △ | △ | ✗ topic 注釈が無い | **✗ 非対象（§6.1）** |
| 7 | **Focus（際立ち）** | 中 | △ | **高**（文頭=Focus は禁止された単純推定） | △ | △ | ✗ focus 注釈が無い | **✗ 非対象（§6.2）** |

**結論**: 第一版で採るのは **#1 接続関係（#2 対比を内包）** のみ。#4 は将来の強制約付き候補。#3/#5/#6/#7 は不採用または非対象。

---

## 6. Topic / Focus / Given-New evaluation（DA-0 が特に厳密に検討を要求した項目）

### 6.1 Topic

- タスクの禁止事項「主語だから Topic」は、まさにこのアプリで避けるべき単純推定である。
- ギリシャ語の Topic は形態・語順・冠詞・文脈の相互作用で決まり、**単一の決定的信号が存在しない**。源データに topic 注釈は**無い**（CONFIRMED: token スキーマに該当フィールドなし）。
- Topic を出すには推論が必要 → **L-0 抵触**。**第一版 非対象。**

### 6.2 Focus

- 「文頭だから Focus」も禁止。前置（fronting）は Focus のことも Topic のことも背景設定のこともあり、**語順だけでは決定不能**。
- 源データに focus 注釈は**無い**。**第一版 非対象。**
- 注意ケース: 強調的代名詞（例 Gal 2:20 の `ἐγώ`）。人は「Focus だ」と言いたくなるが、これは**推論**であり、UI に「ここが焦点」と出せば L-0 違反。PoC でこの罠を明示的に検証する（§11-#10）。

### 6.3 Given / New

- 「初出=New」で良いか → **良くない**。New/Given は**先行文脈での既出性**に依存し、判定には
  1. どこまで context を遡るか（段落？書全体？）の恣意的境界、
  2. 「既出」を判定するための**照応解決（referential resolution）**、
  が必要になる。②はそのまま L-0 の核心禁止に触れる。
- 源データに情報状態（information status）の注釈は**無い**。lemma 反復（同一語の再出現）は corpus 生データとして観察可能だが、それは Given/New ではなく単なる反復であり、**Word の家（StudyPanel）の Lexical 責務**（`reading-observation-information-architecture.md` Phase3-6）。談話分析に持ち込むと責務が重複する。
- **第一版 非対象。** L-0 境界は「照応解決を要する瞬間」に引く（§7）。

### 6.4 三者に共通する判定原則（この設計の憲法）

> **決定的な語彙的・形態的・源注釈的標識が存在する談話事実だけを提示する。
> 推論を要する談話事実（Topic/Focus/Given/New/照応解決）は、注釈が来るまで Unresolved by Design として提示しない。**

これは `discourse-boundary-classification.md` §4（Builder に推論責任を移さない）および CLAUDE.md L-0 §4.1（静寂）と完全に一致する。

---

## 7. L-0 boundary（談話分析における「してはいけない」の線）

L-0（`CLAUDE.md` §4）を談話分析に適用した具体境界:

| 操作 | 判定 | 理由 |
|---|---|---|
| 接続詞 lemma から「節Aは節Bの根拠」と辺を引く | **可** | 接続詞は源データの決定的事実。辺は「`γάρ` がここにある」という事実の可視化 |
| 辺のラベルを「根拠 / 帰結 / 転換 / 対比 / 目的 / 条件」等の**読解語**で付す | **可（要編集レビュー）** | 接続詞の既定義（既存 signal と同一語彙集合）を転写する範囲に限る。新しい意味生成は不可 |
| `referent` を使って「この代名詞は◯◯（人物）を指す」と表示 | **不可（L-0 違反）** | 照応解決。`discourse-boundary-classification.md` が Discourse Layer(future) の責務とし、現在は未判定保持 |
| `subjref` から省略主語を補って訳文化 | **不可** | 補完・自然化。ReadingFormatter 以外の自然文生成源を作らない（CLAUDE.md §32） |
| Topic/Focus/Given/New を推定して色や記号で提示 | **不可** | 決定的信号なし・推論（§6） |
| 節間に接続詞が無い箇所で論理関係を**推定して補う** | **不可（静寂）** | asyndeton は「関係なし」ではなく「未判定」。空白を埋めない（CLAUDE.md §4.1） |
| 源注釈 `referent` の**存在そのもの**を「同一指示の候補リンク（源データ由来・未解決）」として、解決せずに観察提示 | **境界事案・DA-2 で要判定** | 「解決」ではなく「源注釈にリンクがある事実」の提示。ただし UI で「＝この人物」と誤読される危険が高く、第一版では扱わない（§13・§14） |

**L-0 の一線**: **「源データに事実として存在する接続標識の可視化」は可。「文脈から意味・指示・情報状態を確定する推論」は不可。**
談話分析はこの線の**手前**（可視化側）だけで第一版を構成する。

---

## 8. Syntax Tree vs Discourse Analysis responsibility matrix（DA-0-C）

| 観点 | 語順フロー / Syntax Tree（Structure Flow） | 談話分析（Discourse Analysis） |
|---|---|---|
| 主目的 | この**一文がどう組み立てられているか**を見る | 節と節が**どうつながって議論が進むか**を見る |
| 見る対象 | 文内の構成語群・包含構造 | 節間の論理的接続の連鎖 |
| 基本単位 | 語（token）／構成語群 | 節（clause・flow-tree `type:'clause'`） |
| スコープ | 節・文（単節内） | 段落（複数節・Passage の広さ軸） |
| 親子関係（辺の意味） | **包含**（母子＝この語はこの句に属す） | **論理接続**（だから／なぜなら／しかし／その結果） |
| 辺の根拠 | Lowfat 構造（`children`） | 接続詞 lemma（源データの決定的事実） |
| Topic | 扱わない | **扱わない**（推論・非対象・§6.1） |
| Focus | 扱わない | **扱わない**（推論・非対象・§6.2） |
| Given/New | 扱わない | **扱わない**（照応解決を要する・非対象・§6.3） |
| Context | 単文内で完結 | **段落文脈が本質**（複数節を並べて初めて成立） |
| 既存 IA の家 | **Word の家**（深さ軸・word-anchored） | **Passage の家**（広さ軸・別 View）※ FROZEN 済み割当 |
| L-0 risk | 低（源構造の転写） | **中〜高**（照応・Topic/Focus の誘惑）→ §7 で線引き済み |

**判定（DA-0-C の問い「本当に新しい読み方が生まれるか」）: YES。**
辺の意味（包含 vs 論理接続）・単位（語 vs 節）・スコープ（文内 vs 段落）・IA の家（Word 深さ軸 vs Passage 広さ軸）の
**4点すべてで異なる**。既存 FROZEN IA が Passage を独立軸として要求している以上、これを Word 深さ軸（Syntax Tree）に
色付けで混入させることはむしろ FROZEN 違反（P1: progressive disclosure 破綻）となる。
→ **「Syntax Tree に色を付けただけ」を構造的に回避できる。**

---

## 9. Proposed Discourse Representation（DA-0-E・仕様のみ・実装しない）

既存 `verse-representation-design.md` の `kind` 判別式 Representation に、新しい `kind:'discourse'` を追加する形が
最適である（新 Renderer 1 本の追加のみで `render()` の `if` 分岐は増えない・§D-1 の設計に整合）。

```jsonc
{
  "kind": "discourse",
  "scope": { "corpus": "nt", "book": "ROM", "chapter": 5, "verseStart": 1, "verseEnd": 11 },
  "units": [
    // 単位＝節。ラベル・訳文は生成しない。既存の日本語表示値/tokenId を参照するだけ。
    { "unitId": "ROM5.1a", "clauseNodeId": "…flow-tree clause id…",
      "tokenRefs": ["…"], "verse": 1 }
  ],
  "relations": [
    // 辺＝節間の接続。source は接続詞 lemma（源データの事実）に限る。
    { "from": "ROM5.1a", "to": "ROM5.1b",
      "connectiveTokenId": "…", "connectiveLemma": "οὖν",
      "relationKey": "inference",        // 既定義キーの転写のみ（新規意味生成なし）
      "source": "lexical-connective" }
  ]
}
```

**設計制約（Renderer/Builder が守る境界）:**
- `relationKey` は**接続詞 lemma → 既定義キーの固定表**からの転写のみ。Builder が文脈から関係を推論しない。
- 接続詞が無い節境界（asyndeton）は `relations` に**辺を作らない**（静寂）。「関係不明の辺」を捏造しない。
- `units[].tokenRefs` は既存日本語表示値への**参照キー**のみ（`flow-tree-representation-schema.md` §5 と同一規律）。新しい日本語を生成しない。
- `referent/subjref/frame/topic/focus/givenNew` を Representation に**含めない**（第一版）。将来 DA-2 で `referent` を扱う場合も「解決値」ではなく「源注釈リンクの有無」に限定し、別フィールドとして厳格に隔離する。
- **UI から談話関係を推論する構造にしない。** Analysis（接続詞 lemma の読み取り）→ Representation（辺の構造化）→ Renderer（描画）の責務分離を維持する。

**relationKey 固定表（第一版・既存 signal 語彙と同一集合＝新語彙を増やさない）:**

| connectiveLemma | relationKey | 読解ラベル（既存 signal と一致） |
|---|---|---|
| `γάρ` | reason | 根拠（なぜなら） |
| `οὖν` / `διό` / `ἄρα` | inference | 帰結（それゆえ） |
| `ἀλλά` | contrast | 転換（しかし） |
| `μέν…δέ` | correlative-contrast | 対比 |
| `δέ`（単独） | development | 展開（そして／一方） |
| `ὥστε` | result | 帰結（その結果） |
| `ἵνα` / `ὅπως` | purpose | 目的（〜するために） |
| `ὅτι` | content/reason | 内容・理由 |
| `εἰ` / `ἐάν` | condition | 条件 |
| `καί` | continuation | 継続（そして） |

（この表は既存 `index.html:6778-6790` の signal 辞書と語彙・訳語を意図的に一致させ、二重定義・語彙増殖を防ぐ。実装時は単一 SSOT 化を検討。）

---

## 10. Proposed Reading Mode UX（DA-0-D・概念のみ・実装しない）

**問い（DA-0-D）**: 語順フローと談話分析は「同じデータの別表示」か「別 Representation」か「別 Analysis」か。

**回答: 別 Representation を要する。同一 Analysis（接続詞は既に読み取り済み）から別 Builder で構築する。**
- 別 Analysis は不要: 接続詞 lemma・clause 境界は既存データ/既存読み取りに存在する（新解析エンジン不要）。
- 同一表示では不可: 語順フローは chip 列（語・水平）、談話分析は節を単位とする**縦の接続マップ**であり、Representation の形状（units/relations）が根本的に異なる。

**推奨 UX（1 案に絞る）: 「Clause Connection View（節接続ビュー）」**

```
「読み方を選択」
[ 翻訳 ]  [ 語順フロー ]  [ 談話分析 ]

談話分析（選択時）:
  段落（複数節）を、節を縦に積んだ流れとして提示する。
  各節の左端に、前の節との接続を短い読解ラベルで示す。

   ┌ (Rom 5:1) ……（節の既存日本語表示）……
   │  それゆえ ▸  ← οὖν（帰結）
   ├ (Rom 5:1) 私たちは…平和を持っている
   │  なぜなら ▸  ← γάρ（根拠）           ※接続詞がある辺だけ表示
   ├ (Rom 5:2) …
   │  （接続詞なし＝辺を描かない・静寂）
   ├ (Rom 5:3) …
```

- **表示するのは辺（接続）と節の既存日本語のみ。** 分類ラベル・confidence・語形コードは出さない（CLAUDE.md §11）。
- ラベルは読解語（根拠／帰結／しかし）に限り、学術用語（inference/adversative 等）を UI に出さない。
- 語順フローと**排他選択**（1 カラム 1 モード）。並列表示（VR-5）が解禁されれば「語順フロー × 談話分析」の 2 カラム同時も将来可能。
- **モバイル**: 節を縦積みするだけなので狭幅に素直に収まる（横 overflow リスクは Structure Flow 第1層のような問題を持ち込まない）。

---

## 11. PoC verses（DA-0-F・第一版検証コーパス）

各箇所が**何を検証するか**を明示する。コーパスに実在する書のみから選定（NT 27書 flow-tree 済み）。

| # | 箇所 | 含む特徴 | 談話分析 UI で検証すべきこと |
|---|---|---|---|
| 1 | **John 11:35** `ἐδάκρυσεν ὁ Ἰησοῦς` | 最小の単一主節・接続 | **下限**: 単節では談話が成立しないこと。辺ゼロで静かに縮退するか |
| 2 | **Mark 1:1** `Ἀρχὴ τοῦ εὐαγγελίου…` | 動詞なし・段落冒頭 | 冒頭節（前接続なし）で辺を捏造しないか |
| 3 | **John 3:16** `οὕτως γὰρ… ἵνα… μὴ… ἀλλά…` | 根拠 `γάρ`＋目的 `ἵνα`＋対比 | 複数種の接続が同一段落に共存する表示 |
| 4 | **Romans 5:1** `Δικαιωθέντες οὖν…` | 帰結 `οὖν`（前章からの接続） | **段落・章をまたぐ接続**。scope 境界の扱い |
| 5 | **Romans 6:1-2** `Τί οὖν ἐροῦμεν;… μὴ γένοιτο` | 修辞疑問＋強い否定＋転換 | 疑問・応答という談話手 の可視化（過剰解釈しないか） |
| 6 | **1 Cor 13:1-3** `ἐὰν… ἀλλά…` の並行 | 条件 `ἐάν` 連鎖＋対比 | 並行構造の連続する条件節を辺として並べられるか |
| 7 | **Ephesians 1:3-6** | 長大な periodic 文・入れ子関係節・`αὐτοῦ` 連続 | **照応の誘惑**（代名詞連鎖）に対して、referent を解決せず耐えられるか（§7） |
| 8 | **Philippians 2:6-8** `οὐχ… ἀλλά…`＋分詞連鎖 | 対比＋分詞節の連続 | 対比 `οὐ…ἀλλά` を 1 辺として正しく捉えるか |
| 9 | **Galatians 3:19-22** `τί οὖν…; …ἀλλά… ἵνα…` | 疑問＋帰結＋対比＋目的の密な連鎖 | 密な接続連鎖での可読性（辺の過密） |
| 10 | **Galatians 2:20** `ζῶ δὲ οὐκέτι ἐγώ, ζῇ δὲ ἐν ἐμοὶ Χριστός` | 強調 `ἐγώ`・`δέ` の対比・話者交替 | **Topic/Focus の罠**（§6.2）: 強調代名詞を「焦点」と推定して出さないこと |

（#1-#10 は simple clause / 複数節 / nested / pronoun / contrast / topic continuity / information change を網羅する。）

---

## 12. Minimum viable scope（DA-0-G・第一版の最小実装範囲）

> **第一版 = Clause Connection View（接続関係のみ）。**

含む:
- 単位: 節（flow-tree `type:'clause'`）。
- 辺: 接続詞 lemma（§9 固定表）に由来する節間接続のみ。
- ラベル: 既存 signal と同一の読解語のみ。
- スコープ: 段落（当面は「現在の節 ±数節」または章単位。境界は DA-1 で確定・§15）。

**含まない（Topic/Focus/Given-New を「3つあると分かりやすいから」で入れない・§6 の根拠に基づく）:**
- Topic（決定的信号なし・推論）→ 入れない。
- Focus（決定的信号なし・推論）→ 入れない。
- Given/New（照応解決を要する・注釈なし）→ 入れない。
- Referential continuity（`referent` 解決＝L-0 核心禁止）→ 入れない（DA-2 で強制約付き再検討）。
- frame A0/A1（Word の家・role と重複）→ 入れない。

**第一版が First Principle に答える一文**: 「なぜこの節がここに来るのか（著者の議論の運び）を、推論を足さずに追えるようにする。」
これ 1 点で読みへの貢献が説明でき、かつ L-0・既存 IA・既存 Architecture のいずれも侵さない。

---

## 13. Explicit non-goals（DA-0・明示的非対象）

1. Topic / Focus の推定・表示。
2. Given / New（情報状態）の判定・表示。
3. 照応解決（`referent`/`subjref` から「この語＝◯◯」を確定）。
4. 省略主語の補完・訳文化。
5. 接続詞の無い節境界への論理関係の補完（asyndeton を埋めない）。
6. frame（述語項構造）の談話分析としての可視化（Word の家・重複）。
7. 談話分析学の学術ラベル（Theme/Rheme, topicality, salience 等）の UI 露出。
8. Reading Japanese・ReadingFormatter・FROZEN 層への変更。
9. 語順フロー / Structure Flow の再設計・拡張。
10. 新しい自然文（節要約・段落要約）の生成。

---

## 14. Risks / unresolved issues（DA-0-H）

| リスク | 種別 | 扱い |
|---|---|---|
| **照応解決の誘惑**（`referent` があるから使いたくなる） | L-0 核心 | 第一版で `referent` を Representation に入れない。DA-2 で「解決せず源リンクの有無のみ」を厳格審査 |
| **強調代名詞を Focus と誤表示**（Gal 2:20 型） | L-0（推論） | Focus を非対象化（§6.2）。PoC #10 で回帰確認 |
| **段落スコープの境界が恣意的**（どこまでを 1 段落とするか） | 未確定 | DA-1 で確定。当面は章 or 固定窓。段落注釈は源データに無い（NOT VERIFIED: 段落境界データの有無は要確認） |
| **接続詞ラベルの過剰解釈**（`δέ` を常に対比とする等） | L-0（意味生成） | `δέ` 単独は development（中立）、対比は `μέν…δέ`/`ἀλλά` に限定（§9 表） |
| **語順フロー signal との二重定義**（同じ γάρ 説明が 2 箇所） | 責務重複 | §9 で語彙集合を一致させ、実装時 SSOT 化 |
| **接続詞なし節の扱い** | 静寂 | 辺を作らない。「不明」を可視化しない |
| **frame/referent の被覆不足**（14-20%） | データ | 第一版は接続詞（高被覆）のみに依存し、frame/referent に依存しない |
| **Discourse Layer(future) との関係**（指示詞解決） | 将来整合 | 談話分析モード（表示）と Discourse Layer（Reading Japanese 解決）は**別物**。前者は表示モード、後者は日本語確定層。混同しない |
| **SF-37-B/SF-43 前提の不一致** | 前提 | 実在しない（§0.5）。設計判断に影響なしだが記録 |

**外部 annotation が必要になるもの（現コーパスで不足）**: Topic/Focus/Given-New/照応解決/段落境界。これらは discourse annotation が来るまで扱わない（`discourse-boundary-classification.md` の立場を踏襲）。

---

## 15. DA-1 implementation prerequisites（DA-1 へ進む前提条件）

DA-1（実装フェーズ）着手の Entry Criteria:
1. **段落スコープの定義確定**: 「1 単位として提示する節範囲」の決定規則（章単位 / 固定窓 / 源データに段落境界があるか要調査）。
2. **接続詞 → relationKey 固定表の凍結**（§9）と、既存 signal 辞書（`index.html:6778`）との **SSOT 統合方針**の確定。
3. **clause 単位の取得経路確定**: flow-tree `type:'clause'` から談話単位を得る Adapter 契約（`flow-tree-representation-schema.md` の任意属性範囲で足りるか）。
4. **DisplayMode Registry への `kind:'discourse'` 追加**の VR フェーズ整合確認（`verse-representation-design.md` §C-1・Renderer 1 本追加で `if` を増やさない）。
5. **URL 状態設計**（`?transA=discourse` 等の共有・復元・後方互換／VR-4 のマッピング層に整合）。
6. **PoC #1-#10 の期待表示（辺の有無・ラベル）を Validation Matrix 化**（通常/境界/静寂/回帰）。
7. **G2（忠実性）編集レビュー**: 読解ラベルが翻訳的・推論的でないことを biblical-editor が確認（`verse-representation-design.md` E章 VR-4 に準拠）。

DA-1 で **最初に実装すべきもの**: 「1 段落・接続詞のある節境界のみに辺を引く Clause Connection View の最小 Renderer」。
Topic/Focus/Given-New/referent は DA-1 に**含めない**。

---

## 16. Final recommendation

- **談話分析モードを追加する（判定: 正当）。** ただし第一版は **接続関係（Clause Connection View）のみ**に限定する。
- これは既存 FROZEN 設計（Passage の広さ軸・Discourse Layer(future)）が予約済みの領域の、L-0 に触れない最小の第一歩である。
- **Topic / Focus / Given-New は第一版に入れない**（決定的データなし・推論・L-0）。「3 つあると分かりやすい」は採用理由にしない。
- 最大の未解決リスクは **照応解決（referent）を価値の核と誤認すること**。第一版は接続詞（高被覆・決定的）だけに立脚し、referent には触れない。
- Analysis → Representation → Renderer の責務分離を維持し、UI から談話関係を推論しない。

---

## Self Audit（DA-0 の 10 問・自己監査）

| # | 監査問 | 結果 | 根拠 |
|---|---|---|---|
| 1 | 談話分析は Syntax Tree と本当に異なるか | **YES** | 辺の意味（包含 vs 論理接続）・単位（語 vs 節）・スコープ（文 vs 段落）・IA の家（Word vs Passage）の 4 点で相違（§8） |
| 2 | Reading-first に反していないか | **反しない** | 「なぜこの節が来るか＝著者の議論」を追う＝読むための研究（§2・§12） |
| 3 | L-0 violation を誘発しないか | **誘発しない（第一版）** | 接続詞という源データの事実のみ可視化。推論次元は全て非対象（§6・§7・§13） |
| 4 | Topic/Focus を根拠なく推定していないか | **していない** | 両者を非対象化。強調代名詞の Focus 化を PoC #10 で回帰（§6.1-6.2・§11） |
| 5 | Referent resolution を暗黙導入していないか | **していない** | `referent` を Representation から除外（§9）。DA-2 で強制約付き（§7・§14） |
| 6 | UI に専門用語を増やしすぎていないか | **増やさない** | 読解ラベル（根拠/帰結/しかし）のみ・学術語 UI 露出禁止（§10・§13-7） |
| 7 | 現 Architecture を壊さず追加できるか | **YES** | `kind:'discourse'` 追加＋Renderer 1 本で `if` 分岐を増やさない（§9・DisplayMode Registry 既存） |
| 8 | PoC で本当に価値を検証できるか | **YES** | 下限（単節縮退）〜密な接続連鎖〜L-0 罠まで #1-#10 が網羅（§11） |
| 9 | 「あったら良さそう」だけで機能を増やしていないか | **増やしていない** | frame/Given-New/Topic/Focus を根拠付きで除外（§5・§6・§12） |
| 10 | 第一版 scope は十分小さいか | **YES** | 接続関係のみ・1 段落・接続詞のある辺のみ（§12・§15） |

**自己監査の結果、設計書の修正は不要（初版で 10 問すべて充足）。**

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-15 | 初版（DA-0。談話分析モードの定義・責務分離・L-0 境界・第一版 scope=接続関係のみ・PoC 10 箇所・非対象・DA-1 前提を確定。コード変更なし） |
