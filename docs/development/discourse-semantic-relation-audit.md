# DA-4 Semantic Discourse Relation Audit

作成: 2026-08-16
Phase: **DA-4（Read-only Evidence Audit）**
State: STATIC_AUDIT（READ ONLY）
対象コミット: `9fe85394`（DA-1 + DA-2b）
位置づけ: 「reason/result/contrast/purpose/condition/temporal/content/…」等の**意味的談話関係**を
Representation に **fact として**表現できるだけの **authoritative・deterministic な根拠**が
プロジェクトに存在するかを、実データ・実コードから判定する。実装方法を探す監査ではない。
根拠(FROZEN/既存): `discourse-connection-representation-audit.md`(DA-3)・`discourse-boundary-classification.md`・`CLAUDE.md`(L-0/First Principle)。

Evidence 凡例: **CONFIRMED**（実データ/実コード実測）。

---

## 1. Executive Summary

**NOT READY（PARTIAL / NEEDS NEW AUTHORITATIVE SOURCE）。**

> プロジェクトには、意味的談話関係を **fact として表現できる authoritative・deterministic なソースが存在しない**。
> 既存の `clause.discourse` は **project-generated なヒューリスティック**であり、**confidence は常に < 1.0（上限 0.95）**。
> 生の Lowfat/MACULA 源は syntactic 構造（rule/role/frame/referent）のみで、**意味的談話関係を注釈していない**。
> → **`relations[]` は空のまま維持する。現在の `clause.discourse` を Representation へ投影する経路は L-0 上 REJECT。**

意味関係の実装は、**新しい authoritative な談話関係注釈ソース**が導入され、かつ source/target を DA-2 Unit へ
決定的に対応づけられる場合に限り、将来フェーズで再検討する（それでも reading 面ではなく研究/任意層が妥当）。

---

## 2. Existing `clause.discourse` Evidence（§2・完全経路・CONFIRMED）

**生成経路:** `clause-analyzer.js`（`window.App.syntax.ClauseAnalyzer`）が `clause-registry.json` を用いて
`clause.discourse = { type, marker, confidence }` を **計算**する（`_setDisc`・line 118）。
**どの corpus 注釈ファイルからも読み込んでいない**（実測: `clause.discourse` は fetch/require 経由の外部注釈ではなく、コード内計算）。

1. **入力**: token 列（lemma / class / pos / mood / person / tense / book）＋ clause span（`start`/`end`）。
2. **ルール**: `detection.strategy` = `conjunction_anchor`（マーカー lemma で節頭を検出）/ `postpositive_anchor`（γάρ）＋ `pos` チェック ＋ `context_check` ＋ `following_mood` 一致判定。
3. **決定的か**: **否**。マーカー lemma を anchor に候補を立て、mood/genre/person/tense の signal で確率的に確定する。
4. **ヒューリスティックか**: **是**（Phase 10C `resolveDiscourseType` が `_DISC_BASE_SCORE` によるスコアリング＋tie-break、ハードコード confidence 0.82 等）。
5. **confidence 常に 1.0 か**: **否。上限 0.95・1.0 は存在しない**（§3）。
6. **confidence < 1.0 の原因**: `confidence_base`（0.75–0.9）＋`confidence_modifiers`（mood 一致/不一致・context_check）。基底が 1.0 未満。
7. **genre/mood/person/tense が分類に影響するか**: **是**（`buildDiscourseFrame` が book genre×3人称×過去時制で NARRATIVE/EXPLANATION を切替）。
8. **authoritative corpus 注釈か / project 生成解釈か**: **project 生成解釈**（`clause-registry` policy=「Wallace 文法分類を参考にしつつ独自作成」）。

→ **既存フィールドが Analysis に存在するというだけでは authoritative ではない**（§2 末尾の警告どおり）。`clause.discourse` は D 分類（heuristic）。

---

## 3. Confidence Distribution（§3・実測・CONFIRMED）

`clause-registry.json` の confidence パラメータ（deterministic に確定する上限/下限）:

| 型 | マーカー | base | 実効レンジ |
|---|---|---|---|
| clause.purpose | ἵνα/ὅπως | 0.90 | [0.65, **0.95**] |
| clause.condition | εἰ/ἐάν | 0.88 | [0.68, **0.95**] |
| clause.content | ὅτι | 0.75 | [0.75, 0.90] |
| clause.temporal | ὅτε/ὅταν | 0.85 | [0.70, 0.90] |
| clause.contrast | ἀλλά | 0.85 | [0.85, 0.85] 固定 |
| clause.reason | γάρ | 0.80 | [0.80, 0.80] 固定 |
| clause.relative | ὅς/ὅστις/ὅσπερ | 0.80 | [0.70, 0.85] |

- **GLOBAL confidence ceiling = 0.95。1.0 は存在しない。`confidence_base=1.0` の型はゼロ。**
- UNCLASSIFIED は confidence 0.0（`_discUnknown`）。
- 実データのマーカー出現数（ROM5/JHN3/PHP2/1JN1/GAL2 計・§11 の量的裏付け）:
  relative 30・content 28・reason 27・condition 25・purpose 24・contrast 19・temporal 3（計 156）。
  → **156 件すべて confidence < 1.0 で分類される**（1.0 は 0 件）。

**結論: `clause.discourse` は決定的 fact ではない。confidence を切り上げてはならない。**

---

## 4. Authoritative Source Audit（§4・CONFIRMED）

| 候補ソース | 実体 | 分類 | 意味関係に十分か |
|---|---|---|---|
| **Lowfat/MACULA `rule`** | syntactic 構造規則（DetNP/PrepNp/NPofNP/**sub-CL**/**CLaCL**/**Conj-CL**/V-O/Np-Appos…） | **B（構造注釈）** | ✗（構文であって談話関係ではない。sub-CL=従属節という構造で、reason/result 等ではない） |
| Lowfat `role` | 統語役割（s/v/o/adv…） | B（構造） | ✗ |
| Lowfat `frame` | PropBank 述語項（A0/A1） | B（構造/意味役割） | ✗（述語項であって節間談話関係ではない・被覆20%） |
| Lowfat `referent`/`subjref` | 照応（coreference） | B（構造） | ✗（照応・L-0 核心禁止） |
| **clause-registry + clause-analyzer `clause.discourse`** | 節型ヒューリスティック（confidence≤0.95） | **D（project 生成ヒューリスティック）** | ✗ |
| 接続詞 lemma（γάρ 等） | 語彙マーカー | **C（lexical のみ）** | ✗（DA-3 で確定: marker≠relation） |
| syntax-registry.json | Wallace 語レベル格用法・status=draft・「独自作成」 | D（語レベル・draft） | ✗（節間談話関係ではない） |
| bible_data token フィールド | discourse/relation フィールド **なし**（実測 NONE） | — | ✗ |

**A（explicit authoritative relation）に該当するソースはゼロ。** 存在するのは B（構造）・C（lexical）・D（heuristic）のみ。
§4 の規定「A のみ単独で十分。B は補助であって自動昇格しない。C/D/E は単独では不十分」に照らし、**意味関係を fact として表現する根拠は存在しない**。

---

## 5. Relation Matrix（§5・CONFIRMED）

| Relation | Explicit source? | Deterministic? | Confidence | Safe to represent? | Reason |
|---|---|---|---|---|---|
| reason (γάρ) | ✗（heuristic のみ） | ✗ | 0.80 固定 | **✗** | 源は marker のみ。reason は project 推定 |
| result (οὖν) | ✗（**registry にすら無い**） | ✗ | — | **✗** | οὖν→result はどこにも注釈されていない |
| contrast (ἀλλά) | ✗（heuristic のみ） | ✗ | 0.85 固定 | **✗** | marker のみ・関係は推定 |
| purpose (ἵνα) | ✗（heuristic のみ） | ✗ | ≤0.95 | **✗** | mood 依存の確率判定 |
| condition (εἰ/ἐάν) | ✗（heuristic のみ） | ✗ | ≤0.95 | **✗** | mood 依存 |
| temporal (ὅτε/ὅταν) | ✗（heuristic のみ） | ✗ | ≤0.90 | **✗** | mood 依存 |
| explanation | ✗（genre×tense 推定） | ✗ | 0.82 hardcoded | **✗** | NARRATIVE/EXPLANATION は genre 推定 |
| content (ὅτι) | ✗（heuristic のみ） | ✗ | ≤0.90 | **✗** | context_check 依存 |
| relative (ὅς…) | ✗（syntactic 近接） | ✗ | ≤0.85 | **✗** | 統語であって談話関係として fact 化不可 |

**接続詞が慣習的に関係と結び付くという理由で分類しない**（§5 規定）。全関係が「不可」。

---

## 6. Unit Mapping（§6・CONFIRMED）

仮に heuristic 関係を受け入れても、**source/target Unit の決定的対応づけが不可能**:

- `clause.discourse` は **1 つの clause の型**（「この節は目的節」）であり、**source→target のペアを持たない**（明示的 target Unit が無い）。
- clause-analyzer の clause span（`start`/`end` token index）は **flow-tree node（DA-2 Unit）とは別体系**。span→node.id の対応づけには **span 整合・最寄り clause 計算＝inference** が必要。
- → **§6 の「mapping に inference を要する場合は NOT READY」に該当。NOT READY。**

---

## 7. L-0 Audit（§8・FAIL if represented）

現在の `clause.discourse` を関係として Representation へ入れると、以下が発生する:

| L-0 リスク | 該当 |
|---|---|
| interpretation | **該当**（0.75–0.95 の推定を fact 化） |
| false certainty | **該当**（confidence<1.0 を確定として提示） |
| discourse inference | **該当**（marker/genre/mood から関係を推論） |
| ambiguity suppression | **該当**（候補を1つに畳む scoring） |
| clause meaning selection | **該当** |
| referent resolution | 不該当（本経路では未使用） |
| translation/naturalization | 不該当（ラベルのみ） |

**特に「理由/結果/対比/目的」は無害な UI ラベルではなく、解釈の主張である。** 源はその主張を保証しない（marker/構造のみ）。
→ **現データからの意味関係表現は L-0 FAIL。** `relations[]` は空を維持する。

---

## 8. Reading-First UX Audit（§9・CONFIRMED）

1. 読者は意味関係ラベルを必要とするか: **必ずしも否**。議論の流れは既存の**語彙マーカー表示（DA-3 connections）**で追える。
2. ラベルは読書を改善するか: 限定的。むしろ確定的関係の押し付けは誤読を招く（confidence 隠蔽）。
3. 認知負荷: **増える**（節ごとに関係ラベル）。
4. 文法/談話分析ツール化: **する**（reading-first に反する）。
5. 日本語聖書本文と競合: **する**（本文の読みを関係ラベルが覆う）。
6. 任意の study 情報として妥当か: 将来 authoritative source があれば **研究/任意層**としてのみ検討余地。
7. 将来 research mode 限定で保持可能か: **可（reading 面には出さない）**。

→ **意味関係ラベルは reading 面に属さない。** 仮に将来データが揃っても、既定の読書表示ではなく任意/研究スコープが妥当。

---

## 9. Existing UI Terminology Audit（§10・報告のみ・変更しない）

現状の discourse 系ユーザー可視語彙を分類（**いずれも DA-1/DA-2/DA-3 の Representation ではなく、既存の別レイヤ**）:

| UI 文言 | 場所 | 分類 | 判定 |
|---|---|---|---|
| `［理由語句］`/`［結論語句］`/`［対比語句］`/`［目的語句］`/`［内容語句］`/`［条件語句］`/`［転換語句］` | 接続詞の gloss（discourse view・語順フロー・語詳細） | **lexical gloss（語の gloss）** | 境界的だが**語の gloss**（`［…語句］`＝「[X]という種類の語」）。relation ではない。**relation へ昇格禁止**（DA-3 済み） |
| 「ここで理由が始まります」「論理が結論へ進みます」「『しかし』による転換」 | 語詳細 signal（`index.html:6830-`） | **reading hint（読解補助・soft）** | 既存・soft な読解示唆。「この節=理由」という確定主張ではない。**DA-4 スコープ外（変更しない）** |
| 「目的節」「内容・理由節」「条件節」 | 語詳細 signal（`6835-`, `7010-`, `7208-`） | **structural/grammatical label** | 文法ラベル（節型）。confidence を露出しない reading hint。**既存・変更しない** |
| ReadingFormatter 読書メモ | 節ノート（`clause.discourse` 由来） | project 生成の自然文（静寂ゲート・生ラベル非露出） | 既存・Representation 非経由・**変更しない** |

**注意点（報告）:** 語詳細の「目的節」等は node ではなく **soft な reading hint** として既存に存在し、confidence/生ラベルを露出しない設計。これらは **DA-4 の Representation 判定（relations[]=[]）とは別レイヤ**であり、本監査は**変更しない**（§10・§13 No-Code Rule）。ただし将来これらを Representation の relation として fact 化するのは L-0 上不可。

---

## 10. Negative Tests（§12・必須・CONFIRMED）

| 仮定 | プロジェクトデータの実態 | 判定 |
|---|---|---|
| **γάρ → reason** | 源は lemma=γάρ/class=conj/japanese=「［理由語句］」のみ。reason は clause-registry の heuristic（0.80）。**authoritative 注釈なし** | **不成立（普遍でない）** |
| **οὖν → result** | **clause-registry に οὖν の型が存在しない**。result 注釈はどこにも無い | **不成立（未注釈）** |
| **ἀλλά → contrast** | marker のみ。contrast は heuristic（0.85） | **不成立** |
| **ἵνα → purpose** | marker のみ。purpose は mood 依存 heuristic（≤0.95） | **不成立** |
| **ὅτι → content** | marker のみ。content は context_check 依存 heuristic（≤0.90） | **不成立** |

**プロジェクトデータは lexical marker と semantic discourse relation を明確に区別している**（源は marker/構造を持ち、関係は持たない）。
→ marker→relation の自動同一視は**データ上サポートされない**。負テスト **PASS（＝関係の自動確定は棄却される）**。

**Asyndetic ケース（§11 末尾）:** 接続詞の無い節境界に対する談話関係注釈は源に**存在しない**。asyndetic relation は inference になるため**表現しない**。

---

## 11. Real Data Validation（§11・CONFIRMED）

ROM5/JHN3/PHP2/1JN1/GAL2 で、意味関係の**明示ソースは発見されず**（A=0）。
発見されたのは:
- **語彙マーカー**（DA-3 connections・88 接続・全て決定的だが marker 止まり）。
- **heuristic 節型候補**（clause-registry マーカー 156 件・confidence 0.65–0.95・**1.0 は 0 件**）。
- **構造注釈**（Lowfat rule/role/frame/referent・談話関係ではない）。

**具体例（負の証拠）**: ROM 5:6 の γάρ — source Unit=ROM5:5節、target Unit=ROM5:6節、source 注釈=「lemma γάρ（marker）」のみ、confidence=（関係としては）該当注釈なし／heuristic なら reason 0.80、originating source= bible_data（marker）＋clause-registry（heuristic）、**explicit relation ではなく inferred**。
→ **どの例も、関係は inferred。明示 relation を持つ例はゼロ。**

---

## 12. Representation Decision（§7）

> **`relations: []` を維持する。**

現データには意味関係を安全に表現できる根拠が無い（A=0・confidence<1.0・source/target 対応が inference）。
詳細スキーマは設計しない（§7 規定: 証拠不十分なら空維持が正しいアーキテクチャ的帰結）。
DA-3 の `connections[]`（lexical・決定的）が、談話フローの**安全な表現の到達点**である。

---

## 13. Final Decision（§14）

# PARTIAL / NEEDS NEW AUTHORITATIVE SOURCE

- **READY ではない**: authoritative relation source が存在せず、confidence<1.0、source/target 対応が inference、L-0 FAIL。
- **単純 REJECT でもない**: 将来 authoritative な談話関係注釈（source→target→relation を明示）が導入されれば、**任意/研究スコープでの**表現余地は残る。
- ただし **現在の `clause.discourse` を Representation へ投影する経路は REJECT**（L-0 違反・false certainty）。
- **relations[] は空を維持**。意味関係は現時点で実装しない。

> 「現時点で意味的談話関係を実装すべきではない」——これが本監査の成功した結論である（§Final Rule）。

---

## 14. Future Reopen Condition（§12 要求）

意味的談話関係の実装を再検討してよいのは、以下が**すべて**満たされた時のみ:

1. **Authoritative な談話関係注釈ソース**が導入される（例: GNT の explicit discourse/RST 注釈で、各関係が **source span → target span → relation type** を明示。project 生成ヒューリスティックや confidence<1.0 の推定は不可）。
2. その注釈の **source/target span が flow-tree node.id（DA-2 Unit）へ決定的に対応づく**（最寄り clause 計算・span 整合の inference を要しない）。
3. 関係が **fact（confidence=1.0 相当の注釈事実）** として表現でき、候補畳み込み・genre/mood 依存を含まない。
4. **L-0 監査を通過**（false certainty・ambiguity suppression・interpretation を導入しない）。
5. reading-first UX 監査で、**既定の読書面ではなく任意/研究スコープ**に置くことが確認される。

いずれか一つでも欠ける限り、**`relations[]` は空**を維持する。

---

## Self Audit

| 方針 | 遵守 |
|---|---|
| READY を安易に選ばない | ✓（NOT READY） |
| confidence を切り上げない | ✓（実測 ceiling 0.95・1.0 は 0 件） |
| 既存フィールドを authoritative 扱いしない | ✓（clause.discourse=D heuristic） |
| 新外部ソースを導入しない／web で談話理論を探さない | ✓（既存プロジェクトデータのみ監査） |
| lexical marker ≠ semantic relation を明示検証 | ✓（負テスト §10） |
| コード変更なし | ✓ |

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-08-16 | 初版（DA-4。authoritative relation source=ゼロ・clause.discourse は heuristic（ceiling 0.95・1.0 は0件）・source/target 対応は inference・L-0 FAIL。判定 PARTIAL/NEEDS NEW AUTHORITATIVE SOURCE。relations[]空維持。コード変更なし） |
