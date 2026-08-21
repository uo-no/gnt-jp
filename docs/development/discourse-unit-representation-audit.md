# DA-2 Audit Report — Discourse Unit Representation 現状監査

作成: 2026-08-15
Phase: **DA-2（監査・設計フェーズ・コード変更なし）**
State: STATIC_AUDIT（READ ONLY）
位置づけ: 「Discourse Unit を Renderer が安全に扱える Representation としてどう表現するか」を、
**実コード・実データから確認**して確定する。実装は本監査提示後に別途判断する。
根拠(FROZEN/既存): `verse-representation-design.md`・`flow-tree-representation-schema.md`・
`reading-observation-information-architecture.md`・`discourse-analysis-design.md`(DA-0)・`CLAUDE.md`(L-0)。

Evidence 凡例: **CONFIRMED**(実コード/実データ) / **OBSERVED**(実測) / **INFERRED** / **NOT VERIFIED**。

---

## 1. Executive Summary

**判定: PARTIAL。**

| 層 | 判定 | 理由 |
|---|---|---|
| **Discourse Unit（単位境界）** | **PASS-ready** | 決定的な単位境界が既に2系統存在（flow-tree の構造ノード／clause-analyzer の clause span）。DA-1 が既に flow-tree sentence を単位として使用中。 |
| **構造関係（所属・包含・順序）** | **PASS-ready（representation-only）** | flow-tree の `parentId`/`children`/`tokens` が決定的な包含・所属・structural order を提供。新規推論不要。 |
| **意味関係（理由/目的/対比…）** | **NOT READY** | `clause.discourse.type` として Analysis に**既に存在するが、genre×人称×時制のヒューリスティック＋confidence(<1.0)**で導出されており、**決定的でない**。DA-2 §0 の禁止（根拠なき関係生成）に照らし、**確定 fact として Representation へ固めてはならない**。 |

結論: **単位（Unit）と構造関係（B）は既存構造で安全に表現できる。意味関係（C）は決定的根拠が無いため、DA-2 では確定表現しない（未解決保持）。** よって全体は PARTIAL。

---

## 2. Existing Evidence（Discourse Unit に利用可能な既存情報）

### 2.1 flow-tree（構造の一次データ・決定的）— CONFIRMED

`public/assets/data/flow-tree/{BOOK}/{ch}.json`。ROM+JHN 実測（38,852 ノード走査）で、**非word ノードが持つフィールドは
`id / parentId / type / tokens / children / role / frame / referent のみ**。

| フィールド | 内容 | 性質 |
|---|---|---|
| `type` | `sentence`(top) / `clause`(7,743) / `group`(1,366) / `phrase.np`(5,230) / `phrase.pp`(1,735) / `word`(22,680) | 構造識別（Lowfat class の機械転記） |
| `parentId` / `children` | 包含階層（母子） | **構造関係（決定的）** |
| `tokens` | 構成 token 参照（"BOOK c:v!i"） | 所属（membership・決定的） |
| `role` | 統語役割 `v/adv/o/s/p/vc/io/aux/o2` | **統語**（≠discourse） |
| `frame` | word のみ・PropBank `A0/A1/A2` | 述語項構造（源注釈） |
| `referent` | word のみ・照応先 tokenId | 照応（源注釈） |

**`rule` / `clauseType` / 明示的 discourse relation フィールドは存在しない**（実測ゼロ）。
`flow-tree-adapter.js:94` が明示:「rule / clauseType / word type 等は依然として生成しない（SF-10 Tier3・非表示）」、
`:76`「別 relation への変換をしない」。→ **flow-tree は純粋な構造＋源注釈であり、談話関係を持たない**。

### 2.2 clause-registry.json ＋ clause-analyzer.js（節型分類・ヒューリスティック）— CONFIRMED

`public/assets/data/clause-registry.json` が **7 節型を定義**（`clause-analyzer.js:7` 依存）:

| id | label_ja | detection strategy | confidence_base |
|---|---|---|---|
| `clause.purpose` | 目的節 | conjunction_anchor（ἵνα/ὅπως＋mood） | 0.90 |
| `clause.condition` | 条件節 | conjunction_anchor | 0.88 |
| `clause.contrast` | 対比節 | conjunction_anchor | 0.85 |
| `clause.temporal` | 時間節 | conjunction_anchor | 0.85 |
| `clause.reason` | 理由節 | postpositive_anchor | 0.80 |
| `clause.relative` | 関係詞節 | conjunction_anchor | 0.80 |
| `clause.content` | 内容節 | conjunction_anchor（ὅτι） | 0.75 |

`clause-analyzer.js`(1,971行) が実行主体:
- clause span（`start`/`end` token index）を検出し、`clause.discourse = { type, marker, confidence }` を設定（`:117-122` `_setDisc`）。
- Phase 10C: γάρ/ὅτι/ἵνα を **書籍ジャンル×語り手視点×過去時制×mood** の signal で `NARRATIVE`/`EXPLANATION`/`CONTRAST_EXPLANATION`/`TRUE_NARRATIVE` 等へ分類し、**scoring＋confidence**で決定（`:169-355`）。
- **これは決定的注釈ではなくヒューリスティック推定**（confidence 0.75–0.9、genre 依存の fallback あり）。

**消費経路（CONFIRMED, `index.html:9281-9285`）**: `discourse.type / marker / confidence` は
**`ReadingFormatter.format()` の戻り値（title/summary/hint）にしか触れず、UI コードには一切登場しない**。
= **分類ラベルは表面化せず、自然文の読書メモ（静寂優先・言うことがある時だけ）へ変換**され、
`assertReadingTextSafe()` の Guard Rule で生ラベル/confidence の漏出を多重防止。

### 2.3 bible_data token（源注釈）— CONFIRMED

token に `role / class / frame(A0/A1・20%) / referent(14%) / subjref(12%) / lemma`。
接続詞は `class:'conj'` ＋ lemma（γάρ/δέ/οὖν/ἀλλά/μέν/ἵνα/ὅτι…）で100%取得可能（決定的・語彙的）。

### 2.4 DA-1 で既に実装済みの discourse Representation — CONFIRMED

`buildDiscourseRepresentation()`＋`DiscourseRenderer`＋`renderColumn` kind='discourse'。
Unit = flow-tree top-level sentence、接続 = 先頭接続詞 lemma の**転写のみ**。
**`clause.discourse.type` / confidence / clause-registry には一切触れていない**（grep 実測=NONE）。
= DA-1 は「決定的な語彙マーカー（A）」だけを使い「意味関係（C）」を持ち込んでいない。

### 2.5 その他 — CONFIRMED

- `syntax-registry.json`: Wallace **語レベル**分類（Genitive/Dative/Participle）・status=**draft**。節間 discourse relation ではない。
- データ内の "relation" 文字列は abbott-smith 辞書本文・adapter コメント等で、**節間談話関係の注釈ではない**。

---

## 3. Current Architecture（Analysis → Representation → Renderer）

```
bible_data token（role/class/frame/referent/lemma・源）           flow-tree（構造：parentId/children/tokens/type/role）
        │                                                                │
        ▼                                                                ▼
  Reading Engine resolve()（FROZEN）        ClauseAnalyzer（clause span＋clause.discourse=heuristic）
  SyntaxAnalyzer / PhraseAnalyzer                     │
        │                                             ▼
        │                             ReadingFormatter.format()（唯一の自然文生成源・discourse.typeを内部消費）
        ▼                                             ▼
  buildRepresentation(columnMode, verse, analysis)      （読書メモ＝自然文のみ・ラベル非表示）
   ├ kind:'translation' → TranslationRenderer
   ├ kind:'wordOrder'   → WordOrderRenderer
   └ kind:'discourse'   → DiscourseRenderer     ← DA-1（flow-tree sentence＋接続詞lemma転写）
        ▼
  renderColumn(representation)  → HTML
```

- **Representation は分析器ではない**（`verse-representation-design.md §0`）。Analysis の確定結果を転写する契約。
- `renderColumn` は kind 判別のみ（`:11450-11456`、wordOrder/translation/discourse の3分岐）。
- **discourse.type（意味関係）は Analysis→ReadingFormatter に閉じており、Representation 層には来ていない**。これは L-0 上健全な現状。

---

## 4. Unit Definition（候補比較）

| 候補 | 表す単位 | 境界の決定 | 現データに存在 | 新推論 | L-0 | Renderer価値 |
|---|---|---|---|---|---|---|
| token | 語 | tokenIndex | ○ | 不要 | 安全 | 談話単位として粗すぎ（低） |
| phrase | 句(np/pp) | flow-tree type=phrase.* | ○ | 不要 | 安全 | 句は構造・談話単位ではない（低） |
| **clause** | **節** | **flow-tree type='clause' / clause-analyzer start-end** | **○（両系統）** | **不要（構造）** | **安全（構造のみ使えば）** | **高（談話の基本単位）** |
| **sentence** | **独立文（top-level）** | **flow-tree sentences[]** | **○** | **不要** | **安全** | **高（段落内の主節連鎖・DA-1採用）** |
| discourse unit | 談話行為の単位 | — | ✗（明示注釈なし） | **要（推論）** | **抵触** | — |
| passage | 段落 | — | ✗（段落境界データなし・DA-0で確認） | 要 | 抵触 | — |

**採用すべき最小定義（提案）:**

> **Discourse Unit = clause（節）。上位コンテナとして sentence（独立文）を持つ2階層。
> 境界と包含は flow-tree の構造（`type` と `parentId`/`children`）から決定的に取得する。**

- flow-tree を単位源とする（決定的な全文分割・Structure Flow / DA-1 と同一の source of truth）。
- clause-analyzer の clause span は **discourse 検出とセット**であり、単位境界だけを借りると heuristic 混入リスク。→ **単位境界は flow-tree、意味関係は借りない**、で分離する。
- 「discourse unit」「passage」は明示注釈が無く推論を要するため **DA-2 では単位に採用しない**。

---

## 5. Relation Classification（3分類・厳密）

| 種別 | 具体 | 出典 | 決定的か | DA-2 の扱い |
|---|---|---|---|---|
| **A. 明示的既存 relation** | 接続詞 lemma（γάρ/οὖν/δέ/ἀλλά/μέν/ἵνα/ὅτι…） | bible_data token（class='conj'＋lemma） | **決定的（語彙事実）** | **投影可**。ただし lemma＝マーカーの存在事実まで。関係名（理由等）は付与しない（DA-1 と同方針） |
| A. 明示的既存（源注釈） | `frame`(A0/A1)・`referent`・`subjref` | bible_data token | 決定的（源注釈）だが **20/14/12%被覆・word限定** | **DA-2 単位間 relation には使わない**（述語項・照応であって節間談話関係ではない。referent は L-0 核心禁止＝DA-0 §7） |
| **B. 構造関係** | 包含（parent/child）・所属（member-of / tokens）・structural order | flow-tree | **決定的** | **Representation へ保持可（推奨）**。Unit の親子・所属・順序 |
| **C. 解釈/推論的 意味関係** | 理由/目的/対比/条件/時間/内容/関係、NARRATIVE/EXPLANATION | `clause.discourse.type`（clause-analyzer＋clause-registry） | **非決定的（confidence 0.75–0.9・genre依存）** | **DA-2 では確定表現しない**。既存 Analysis に存在しても heuristic のため、Representation に fact として固めない（§0 遵守） |

**核心判断:** C は「新規に私が作る」ものではなく既に Analysis に存在するが、**confidence<1.0 のヒューリスティック**である。
DA-2 の最終原則「**既に確定している構造を安全に表現する**」に照らし、**確定していない C を確定表現へ昇格させない**。
C を Representation に載せる場合でも、**confidence とともに逐語 passthrough し、未解決/候補として明示**するに留める（§7 参照。ただし DA-2 では DEFER 推奨）。

---

## 6. L-0 Safety Audit（新規推論の発生箇所）

| 監査点 | 判定 |
|---|---|
| DA-1 現 Representation | **安全**。接続詞 lemma＋既存 japanese 転写のみ。関係生成なし（実測 NONE） |
| Unit 境界を flow-tree から取る | **安全**。構造の読み取り（推論なし） |
| 構造関係（parent/child/tokens/order）を保持 | **安全**。決定的・Structure Comes From Source |
| 接続詞マーカー（A）を保持 | **安全**。語彙事実。ただし**関係名を付けない**線を厳守 |
| `clause.discourse.type` を Representation へ投影 | **危険（推論混入）**。confidence<1.0・genre依存。fact 化すれば §0 違反。→ **DA-2 では載せない（DEFER）** |
| `referent`/`subjref` を Unit relation 化 | **危険（照応解決）**。DA-0 §7・discourse-boundary-classification の L-0 核心禁止。→ **載せない** |
| asyndeton（接続詞なし境界）に関係を補完 | **禁止**。`relation:null / status:'unresolved'` で静寂保持 |

**結論: 構造層（B）＋語彙マーカー（A）に限定すれば L-0 抵触なし。意味関係（C）と照応は未解決保持。**

---

## 7. Representation Proposal（最小 schema・コード追加はしない）

DA-1 の `kind:'discourse'` Representation を**構造層に限って**拡張する最小案。**意味関係は持たない。**

```jsonc
{
  "kind": "discourse",
  "scope": { "book": "ROM", "chapter": 5 },        // 既存（passage境界は章。DA-0で確認）
  "units": [
    {
      "unitId": "…",                                // 一意（flow-tree node id 由来）
      "unitType": "sentence",                       // 'sentence' | 'clause'（flow-tree type の転写）
      "parentUnitId": null,                         // B: 包含（親Unit）。top-levelは null
      "tokenRefs": ["ROM 5:1!2", "…"],              // B: 所属（membership）。surface順は Renderer 責務
      "verseLabel": "5:1–2",                        // 表示補助（既存値から算出）
      "marker": {                                    // A: 決定的な語彙マーカー（無ければ null）
        "lemma": "οὖν", "greek": "οὖν",
        "ja": "［結論語句］",                        // 既存 bible_data.japanese の転写のみ
        "tokenId": "…"
      }
    }
  ],
  "connections": [                                   // A: マーカーに基づく隣接接続のみ（DA-1 と同じ）
    { "from": "unitId(i-1)", "to": "unitId(i)", "marker": { "lemma": "γάρ", "ja": "［理由語句］" } }
  ],
  "relations": [                                     // 未解決の保持スロット（§6）
    { "from": "…", "to": "…", "relation": null, "status": "unresolved" }
  ]
}
```

**設計制約（Representation が守る境界）:**
- `units[].parentUnitId` / `tokenRefs` は flow-tree 構造の**転写のみ**（B）。並べ替え・意味付与をしない（`flow-tree-representation-schema.md §4`）。
- `marker` は接続詞 lemma とその**既存 japanese 値の転写**（A）。**関係名（理由/目的/対比…）を付与しない。**
- **`relation` は原則 `null`＋`status:'unresolved'`**。`clause.discourse.type` を**ここへ投影しない**（C・heuristic）。
- referent/subjref/frame/topic/focus/given-new は**含めない**（DA-0 §13 の非対象を継承）。
- **UI から談話関係を推論する構造にしない**。Analysis→Representation→Renderer の分離維持。

**（将来オプション・DA-2 では DEFER）** どうしても既存 Analysis の分類を可視化する場合は、`relations[]` に
`{ relation: "<clause.discourse.type>", source: "clause-analyzer", confidence: 0.xx, status: "heuristic" }`
の形で **confidence・source・heuristic を明示した非確定 passthrough** に限る。fact 化は禁止。DA-2 では実装しない。

---

## 8. FLOW / UI Impact

| 対象 | 影響 |
|---|---|
| 既存 FLOW（語順フロー / wordOrder） | **no impact**（別 kind・DA-1 で回帰 byte 一致確認済み） |
| Structure Flow / Syntax Tree | **no impact**（flow-tree を読むだけ・renderer 非変更） |
| Reading Engine / ClauseAnalyzer / ReadingFormatter | **no impact**（clause.discourse は内部消費のまま・DA-2 は触れない） |
| DA-1 discourse Representation/Renderer | **representation-only**（units に parentUnitId/tokenRefs/unitType を追加する程度。renderer は現状の縦連鎖のまま、包含表示を足すか否かは別判断） |

**判定: representation-only（構造層のみ）。renderer 変更は任意・最小。Analysis 変更なし。**

---

## 9. Implementation Decision

**主判定: B（Representation だけ追加すればよい）— ただし構造層に限定。**
**意味関係については E（DA-2 ではまだ実装せず／決定的注釈が無い限り将来課題）。**

理由:
- Unit・構造関係（親子/所属/順序）・語彙マーカーは**既存構造（flow-tree＋token）で決定的に取得可能**。新データ構造・新 Analysis 不要（§8「新規データ構造禁止」に整合）。
- 意味関係（理由/目的/対比…）は既存 Analysis(`clause.discourse`)に存在するが**非決定的**であり、DA-2 §0・最終原則により**確定表現しない**。決定的な discourse annotation が入るまで未解決保持（`discourse-boundary-classification.md` の立場と一致）。

**却下した選択肢:**
- A（既存で充足）: DA-1 は sentence 単位＋マーカーのみで、**包含・所属・未解決保持が未表現**のため不十分。
- C（Analysis 不足）: 構造層は Analysis 不足ではない。意味関係は「不足」ではなく「**L-0 上あえて確定しない**」領域。
- D（UI のみ）: 単位の親子・所属を安全に扱うには Representation の明示が要る。

---

## 10. Recommended Next Step（1つに絞る）

> **DA-2a: §7 の「構造層のみの DiscourseUnit Representation 最小 schema」を確定する。**
> 具体的には、DA-1 の `buildDiscourseRepresentation()` 出力に
> **`unitId` / `unitType` / `parentUnitId` / `tokenRefs`（すべて flow-tree からの転写）** を追加する契約を確定し、
> **`relations` は `null`＋`unresolved` 固定**、`clause.discourse.type` は投影しない、を明文化する。
> 実装はこの schema をユーザー承認後に着手する（本監査では schema 提示まで）。

---

## Self Audit（DA-2 §11 禁止事項の遵守確認）

| 禁止項目 | 遵守 |
|---|---|
| 勝手な Relation 追加 | ✓（A/B のみ。C は未解決保持・投影しない） |
| 新しい意味ラベルの創作 | ✓（既存ラベルすら fact 化しない） |
| 原文からの談話関係推論 | ✓（構造・語彙の転写のみ） |
| UI 都合による Analysis 変更 | ✓（Analysis 非変更） |
| 既存 JSON の意味変更 | ✓（読み取りのみ） |
| L-0 迂回 heuristic 追加 | ✓（heuristic な clause.discourse を Representation へ載せない） |
| 大規模 refactor / speculative 実装 | ✓（監査のみ・コード変更なし） |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-15 | 初版（DA-2 監査。判定 PARTIAL。Unit=clause/sentence(flow-tree)、構造関係=B投影可、意味関係=C非確定保持。実装判断 B（構造層のみ）＋E（意味関係は将来）。コード変更なし） |
