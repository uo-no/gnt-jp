# DA-2c Audit Report — Nested Discourse Unit UX / Renderer Architecture

作成: 2026-08-15
Phase: **DA-2c（UX/Renderer 監査・設計・コード変更なし）**
State: STATIC_AUDIT（READ ONLY）
位置づけ: DA-2b の「nested clause 階層が未 surface」制約について、**読者にとって最も安全で明快な**表現方法を、
実 flow-tree・実 renderer から判定する。目的は「全 clause を出す」ことではなく「構造を過負荷なく理解できる」こと。
根拠(FROZEN/既存): DA-2 Audit・DA-2a Schema・`discourse-analysis-design.md`(責務マトリクス)・`neighborhood-view-design.md`・`reading-observation-information-architecture.md`・`CLAUDE.md`(First Principle/L-0)。

Evidence 凡例: **CONFIRMED**（実データ/実コード実測）。

---

## 1. Executive Summary

- **nested 階層を discourse mode の視覚 unit として surface すべきではない。**
- **現在の top-level 表示で読書目的には十分**であり、nested containment は**既存の Structure Flow が既に担っている**（責務重複を作らない）。
- **推奨アーキテクチャ: E＋F（レイヤ分離）** — Discourse mode＝top-level の節間フロー（現状維持・F）、within-clause の入れ子構造＝既存 Structure Flow（E）、階層は Representation に**内部保持**（DA-2b 済み・表示はしない）。
- **DA-2c Decision: DEFER**（nested discourse renderer を今作らない）。

理由の核:
実データは、clause 入れ子が **深さ5–8・章あたり70–246ノード・うち20–30%が親とほぼ同span（冗長ラッパー）** であることを示す。
これを平面 renderer に全部出すと読書体験を破壊し（First Principle 違反）、しかも同じ構造情報は既に Structure Flow が word-anchored で提供している。
schema 完全性のために視覚を犠牲にしない、が本フェーズの結論。

---

## 2. Real Data Evidence（§5・§6・CONFIRMED）

実測（ROM5 / JHN3 / PHP2 / 1JN1 / GAL2・flow-tree 実データ）:

| 章 | top-level units | 全 clause node | 最大 clause 深さ | 親とほぼ同span（≥90%・冗長ラッパー） | 意味ある小span（<90%） | sibling clause ペア | sibling token 重複 |
|---|---|---|---|---|---|---|---|
| ROM 5 | 21 | 102 | 5 | 26 | 55 | 224 | **0** |
| JHN 3 | 42 | 246 | 8 | 34 | 170 | 912 | **0** |
| PHP 2 | 18 | 134 | 7 | 23 | 93 | 200 | **0** |
| 1JN 1 | 11 | 70 | 5 | 9 | 50 | 81 | **0** |
| GAL 2 | 22 | 142 | 7 | 18 | 101 | 285 | **0** |

**構造的性質（決定的）:**
- **sibling clause は全章で token 重複 0** → 兄弟節は互いに素（partition）。
- 親子は**純粋な包含**（child ⊂ parent・tree 構造）。partial overlap は原理的に発生しない。
- 入れ子は**深い（5–8）**。章あたり clause node は top-level の **3–6倍**。
- **20–30% は「親とほぼ同span」の冗長ラッパー**（clause が別 clause を実質同範囲で包む・読書上の別単位ではない）。
- 残りは意味ある小span（ἵνα/ὅτι/関係節等の従属節）。

**帰結:** 兄弟が素で親子が包含なので木のレイアウトは幾何的には可能。しかし「深さ5–8＋冗長ラッパー20-30%＋70-246単位」は**読者の認知負荷が過大**で、価値（意味ある従属節）に対してノイズ（冗長ラッパー・深さ）が大きすぎる。

---

## 3. §6 Token Overlap Classification（実測結論）

| パターン | 実データでの発生 |
|---|---|
| 1. identical span（完全一致） | 発生（nearIdentical のうち ratio=1.0 の一部）。冗長ラッパー |
| 2. child ⊂ parent（完全内包） | **支配的パターン**（全ての親子 clause）。 |
| 3. partial overlap（部分重複） | **発生しない**（tree 構造上ありえない） |
| 4. sibling overlap | **発生しない**（全章で 0） |
| 5. disjoint（互いに素） | 兄弟 clause は互いに素 |

→ 「全 clause を横並び unit にできない」という DA-2b の懸念の実体は、**partial overlap ではなく (a) 親子の入れ子重複（同 token が祖先 clause 全てに属す）と (b) 冗長ラッパー**である。

---

## 4. Current Renderer Constraints（§3・CONFIRMED）

- **DiscourseRenderer**: `units[]` を**平面**に縦連結。各 unit は `verseLabel＋words＋接続バッジ`。**onclick/選択なし＝表示専用**（`data-unit-id` 属性は持つが非interactive）。
- **buildDiscourseRepresentation**: DA-2b で top-level unit に `unitId/unitType/parentUnitId/tokenRefs` を逐語保持（内部に階層情報あり・表示は top-level のみ）。
- 平面 renderer に全 clause を渡すと、包含により **同 token が祖先 clause 全てに複製表示**され、冗長ラッパーで**ほぼ同じ行が何度も並ぶ**（ROM5 で 21→102）。これが「all-clause flat が unsafe」の実体。

**既存の階層 UI 機構（再利用候補・§4）:**
- **Structure Flow（NeighborhoodView）**: word タップ → その語が属する構成語群を、flow-tree の**最寄り clause anchor**基準で提示。**within-sentence の入れ子構造を既に担う**（`neighborhood-view-design.md`）。
- **disclosure/折りたたみ機構**: SF-43 mobile disclosure・`rn-level-section`・StudyPanel L3 折りたたみが**既に存在**（新 UI を発明する必要はない）。

→ **nested clause 階層のナビゲーションは、既に Structure Flow が word-anchored で提供している。** discourse mode で同じものを別レンダリングするのは責務重複（`discourse-analysis-design.md` 責務マトリクス: discourse＝節間 / syntax・structure＝節内）。

---

## 5. UX Options 評価（§13 Design Evaluation Matrix・1–5）

| 基準 | A Flat | B Tree | C Expandable | D Indicators | E Separate Layer | F Current |
|---|---:|---:|---:|---:|---:|---:|
| 構造忠実度 | 5 | 5 | 4 | 3 | 5* | 3 |
| 読書の明快さ | 1 | 2 | 4 | 4 | 5 | 5 |
| token 重複処理 | 1 | 3 | 4 | 5 | 5 | 5 |
| 選択互換 | 2 | 2 | 3 | 4 | 5 | 5 |
| Mobile UX | 1 | 1 | 3 | 4 | 5 | 5 |
| Desktop UX | 2 | 3 | 4 | 4 | 5 | 5 |
| 認知負荷 | 1 | 1 | 4 | 4 | 5 | 5 |
| FLOW 互換 | 2 | 2 | 4 | 4 | 5 | 5 |
| L-0 安全 | 5 | 5 | 5 | 5 | 5 | 5 |
| 実装リスク | 2 | 2 | 3 | 3 | 5 | 5 |
| **合計** | **22** | **26** | **38** | **41** | **50** | **48** |

\* E の構造忠実度は「Structure Flow 経由」で 5（discourse mode 自体は top-level）。

**主要トレードオフ:**
- **A/B（全 clause 平面/木）**: 構造は忠実だが、深さ5-8・冗長ラッパー・70-246単位で読書破壊。First Principle 違反。却下。
- **C（展開式）**: progressive disclosure で認知負荷を下げられるが、冗長ラッパーの除去・深さ制限・意味ある従属節のみ抽出という**新判定**が必要になり、実装と設計が増える。今は不要。
- **D（指標）**: top-level に「入れ子あり」の控えめな指標。低負荷だが、指標が意味関係と誤読されない配慮が要る（L-0）。将来候補。
- **E（レイヤ分離）**: nested 構造は既存 Structure Flow に委ね、discourse は節間フローに専念。**責務分離・実装ゼロ・最高スコア**。
- **F（現状＋内部保持）**: discourse 表示は top-level 維持、階層は Representation 内部（DA-2b）に保持。**実装ゼロ・読書最優先**。

---

## 6. Recommended Model（§14.5）— **E ＋ F**

> **Discourse mode は top-level の「節と節のつながり」を表示する（F・現状維持）。
> within-clause の入れ子構造は、既存 Structure Flow が word-anchored で提供する（E）。
> nested 階層は Representation に内部保持（DA-2b 済み）し、discourse の視覚 unit としては出さない。**

- 読者は「議論の運び」を discourse mode で、「この語がどの構成にあるか／従属節の内包」を Structure Flow で見る。**2つの読み方が責務分離のまま補完**する。
- 冗長ラッパー・深さ8 の木を読者に押し付けない（First Principle）。
- 新 renderer・新 UI パターンを発明しない（既存機構で足りる）。

---

## 7. Representation / Renderer Boundary（§10・§14.6・必須）

| 層 | 内容 |
|---|---|
| **Representation が持つもの** | 全 top-level unit＋各 unit の `unitId/unitType/parentUnitId/tokenRefs`（DA-2b・逐語）。**階層情報は内部に保持**（parentUnitId 等）。将来 nested を出す場合の素材は既にある。 |
| **Renderer が表示するもの** | **top-level units の節間フローのみ**（現状 DiscourseRenderer）。nested unit を視覚化しない。 |

> **Representation 完全性は、全 unit の同時視覚表示を要求しない**（§10）。
> DA-2b の内部階層フィールドは「Rep が持つが Renderer が出さない」正しい状態であり、**契約欠陥ではない**（§11: DA-2a 契約は変更不要）。

---

## 8. Selection Model（§7・§14.7・実装しない）

現状: discourse unit は非interactive（選択なし）。token 選択は word chip（語順フロー）／word tap（本文）→ word detail → Structure Flow。

- token は**複数の構造 unit に属す**（包含）。「どの unit がアクティブか」を discourse mode で解く必要は**ない**（discourse unit を選択対象にしない）。
- 親子両ハイライトのような階層対応選択は **Structure Flow の責務**（既に最寄り clause anchor を持つ）。discourse mode に新選択モデルを導入しない。
- **推奨: discourse unit の選択・token ハイライトを DA-2c では導入しない**（現状の非interactive を維持）。既存 word selection と競合させない。

---

## 9. Mobile / Desktop Model（§8・§14.8）

- **Mobile 375px**: 深い木（深さ8）のインデント表示は横 overflow・タッチ困難で**不適**。現状 top-level 縦連結は 375px で安全（DA-1/DA-2b で確認済み・`flex-wrap`）。→ **mobile も top-level 維持**。
- **Desktop**: 同様に top-level 維持。将来 nested を出す場合も、木ではなく「1階層の展開（C）」に限定すべき。
- どちらも**現状の表示挙動を変えない**（DA-2b で display byte 一致を確認済み）。

---

## 10. L-0 Audit（§12・§14.9）

- 本推奨は**構造のみ**。parentUnitId/tokenRefs は flow-tree 逐語。**意味推論を一切要さない**。
- 「親子は構造関係であって談話関係ではない」を厳守（nesting から reason/result/contrast 等を生成しない）。
- Structure Flow も role/relation を表示しない設計（`neighborhood-view-design.md` §7）＝L-0 整合。
- **新規推論・referent 解決は発生しない。**

---

## 11. Implementation Scope（§14.10）

**DA-2c 推奨（E＋F）は実装ゼロ。** 変更ファイルなし。
- Representation: DA-2b のまま（階層内部保持）。
- Renderer: 現状のまま（top-level 表示）。
- DA-2a 契約: 変更不要（§11 遵守）。

（将来 Option C/D を採る場合の最小 scope・参考のみ）: `DiscourseRenderer`（展開/指標 UI）＋`buildDiscourseRepresentation`（意味ある従属節の抽出・冗長ラッパー除去・深さ制限）に限定。ただし「意味ある従属節」の抽出は新判定を伴うため、別フェーズで L-0 監査してから。

---

## 12. DA-2c Decision（§14.11）

# DEFER

- **nested discourse renderer を今作らない。** 現状の top-level 表示（F）＋既存 Structure Flow（E）＋Representation 内部階層保持（DA-2b）で、読書目的に十分。
- 実データが「全 clause surface は読書破壊・価値<ノイズ」を示し、同じ構造ニーズは Structure Flow が既に充足。schema 完全性のために視覚を犠牲にしない（本フェーズ最重要方針）。
- **DA-2a 契約は健全（変更不要）**。DA-2b の「Rep は階層を持つが Renderer は top-level のみ」は Rep/Presentation 分離の正しい状態。

**再開条件（将来 DA-2d 候補・DEFER 解除の判断材料）:**
- 読者から「従属節（ἵνα/ὅτι/関係節）の内包を discourse mode で見たい」という具体的読書ニーズが確認された場合に限り、
- **Option C を「意味ある従属節のみ・深さ1・冗長ラッパー除去・展開式」に厳しく限定**して別フェーズで設計する（全 clause 木は永久に不採用）。
- その際も Structure Flow との責務境界（節内は Structure Flow）を再確認する。

---

## Self Audit（§15 遵守）

| 方針 | 遵守 |
|---|---|
| schema 完全性を最適化しない／読書明快さを最適化 | ✓（DEFER・全 clause 却下） |
| First Principle（読書優先） | ✓ |
| 既存機構の再利用（新 UI 発明しない） | ✓（Structure Flow・既存 disclosure） |
| DA-2a 契約を変更しない | ✓（変更不要と判定） |
| L-0（意味推論なし） | ✓ |
| コード変更なし | ✓ |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-15 | 初版（DA-2c。実データで入れ子=深さ5-8/70-246ノード/冗長ラッパー20-30%/兄弟素・親子包含を実測。推奨 E＋F レイヤ分離。Decision=DEFER。DA-2a契約変更不要。コード変更なし） |
