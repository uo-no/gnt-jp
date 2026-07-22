# 関係詞 Syntax Phase 2 責務設計(Stage K-4)

策定日: 2026-07-20
位置づけ: 関係詞 Syntax Rule Engine **Phase 2 の責務設計**。K-3(Phase 1・getRelativeSyntax 実装)で
Engine 内部に保持可能にした構造情報(role / referent)を、**将来的に日本語描画層へ渡す場合の
責務境界を定義**する。
根拠: relative-syntax-rule-design.md(K-1)・-implementation-plan.md(K-2)・-implementation-report.md(K-3)・
morph-rule-engine-v1-frozen.md(J-9)。

**本文書は責務設計のみ(実装仕様ではない)。コード・擬似コード・JSON は含まない。
reading-engine.js / bible_data は変更しない。** 数値はクリーン NT 実測(総 137,741)。

前提: K-3 の `getRelativeSyntax(token)` が束縛関係 1,071 件で {strong, role, referent} を read-only で
返す(自由関係 587 は null=対象外)。Morph v1(gender→頭語 者/もの)は FROZEN・実装済。

---

## 1. Syntax が保持する情報

Phase 1(K-3)で Engine 内部に保持可能となった構造情報:

| 情報 | 由来(注釈) | 内容 |
|---|---|---|
| **role**(節内役割) | bible_data `role` | s(主語)/ o(目的語)/ io(間接目的)/ p(補語)/ adv(副詞)/ o2(第二目的) |
| **referent**(先行詞リンク) | bible_data `referent` | 先行詞トークン ID(束縛関係のみ) |
| **strong**(関係詞種別) | bible_data `strong` | G3739 / G3748 / G3745 |
| (連携)**頭語** | Morph v1 出力 | 者(人)/ もの(事物)= Morph が gender で決定済 |

- Syntax が保持するのは **注釈由来の構造的事実のみ**(推論なし)。意味・談話は含まない。
- **自由関係(referent 無 587)は保持対象外**(Semantic 責務)。

---

## 2. Presentation / PhraseRenderer へ渡す情報の範囲

Syntax は **構造的事実(契約)を提供**し、描画側が **表示を決定**する。責務境界は次のとおり。

| 提供元 | 提供する / 決定する | 例 |
|---|---|---|
| **Syntax(提供)** | 構造的事実: role・referent・関係詞トークン位置・(Morph の)頭語 者/もの | 「role=o(節の目的語)」「referent=先行詞 X」 |
| **Presentation / PhraseRenderer(決定)** | 表示: 役割助詞の文字列・節の配置/語順・チップ表示 | 「者を」の描画・関係節を先行詞の前へ配置 |

- **Syntax = 「構造関係が何であるか」**(注釈由来の事実)。
  **描画 = 「それを日本語でどう見せるか」**(助詞文字列・語順・チップ)。
- Syntax は **文字列を生成しない**(Phase 1 と同じくデータを渡すのみ)。描画層が助詞・語順を実体化する。
- これは既存アーキテクチャ(Engine=読解生成 / Presentation=表示整形)の踏襲であり、Syntax は
  「構造情報の供給者」として振る舞う。

---

## 3. role による助詞変化の責務分類

**role → 役割助詞の決定は Syntax 担当**とする(描画は Presentation が担うが、どの助詞かの決定根拠は
role=Syntax)。

### 役割 → 日本語役割助詞(責務の対応・実装仕様ではない)

| role | 節内役割 | 日本語役割助詞(方向性) | 明確さ |
|---|---|---|---|
| s | 主語 | 〜が / 〜は | 明確 |
| o | 目的語 | 〜を | 明確 |
| io | 間接目的 | 〜に | 明確 |
| p | 補語 | 〜である 等 | 概ね明確 |
| o2 | 第二目的 | 〜を / 〜に | 概ね明確 |
| **adv** | 副詞的 | 前置詞・格に依存(に/で/から 等) | **不明確(要 prep/case)** |

- s/o/io/p は role のみで役割助詞が概ね一意。**adv は前置詞・格に依存**するため、role 単独では
  決まらず Phase 2 の第一次スコープから外す余地がある(prep 情報との協働・別途検討)。

### なぜ Morph 担当外か

- Morph v1 が扱う case→格助詞は **主節での役割**(αὐτós accusative=主節の目的語→彼を)。
- 関係詞の case/role は **従属節(関係節)内での役割**であり、主節の格ではない。Morph v1 は
  **関係詞の case→格助詞を明示的に対象外**とした(J-6b)。したがって role→助詞は Morph の領域外。

### なぜ Semantic 担当外か

- role は **注釈済みの文法的(統語)事実**(role フィールド・推論不要・決定的)。
- Semantic が扱うのは語義・談話・自由関係など **意味・文脈の判断**。主語/目的語という文法役割は
  意味判断ではなく構造事実であり、Semantic の領域ではない。

**結論**: role→役割助詞は **Syntax 担当**(Morph=主節格・Semantic=意味 のいずれでもない中間の
統語責務)。

---

## 4. referent を利用した語順再構成の責務分類

日本語の自然な関係節は **連体修飾**(関係節が先行詞の前に来る)。Greek(先行詞 + 関係節)からの
順序反転が必要。

| 範囲 | 担当 | 内容 |
|---|---|---|
| **先行詞の同定** | **Syntax 単独可** | referent(先行詞トークン ID)から先行名詞を特定する(注釈読み取り) |
| **節と先行詞の関係付け** | **Syntax 単独可** | 「この関係節は先行詞 X を修飾する」という構造関係の提供 |
| **節境界の確定** | **Syntax 条件付** | 関係節に属するトークン範囲の確定(role 分布・トークン列から。単純節=可 / 複文・入れ子=難) |
| **語順再構成(節→先行詞前)** | **PhraseRenderer 協働必須** | トークンの表示順を並べ替えて連体修飾化する。表示レイアウトの再構成であり描画層の責務 |
| **表層生成** | **PhraseRenderer** | 並べ替え後の日本語表層(チップ列)の生成 |

- **Syntax 単独で可能**: 先行詞同定・節と先行詞のリンク・(単純節の)節境界。いずれも注釈由来。
- **PhraseRenderer 協働が必須**: 実際の並べ替え(節を先行詞の前へ)と表層生成。Syntax は順序を
  変えない(構造情報を渡すのみ)。並べ替えは既存 core/phrase-renderer.js(Stage A)級の再構成が要る。
- **先行詞解決には cross-file token index が必要**(referent が別節/別ファイルのトークンを指す場合)。

---

## 5. 対象外(Phase 2 で扱わない)

| 項目 | 理由 |
|---|---|
| **助詞変更の実装** | 本文書は責務設計のみ。実装は Phase 2 実装 Stage(Gate 充足後) |
| **語順変更の実装** | 同上。かつ PhraseRenderer 協働が前提(Phase 3 相当) |
| **whoever / whatever(自由関係)** | Semantic 領域(referent 無 587) |
| **数量(ὅσος)** | Semantic 領域 |
| **不定関係(ὅστις)** | Semantic 領域 |
| **自由関係詞解釈** | Semantic 領域 |
| **adv 役割の助詞決定** | prep/case 依存で role 単独では不明確・第一次スコープ外 |

---

## 6. Phase 2 実装開始 Gate(G1〜G6)

| Gate | 区分 | 条件 |
|---|---|---|
| **G1** | 実装前条件 | K-3(Phase 1・getRelativeSyntax)が実装済・バイト等価で凍結されている(充足) |
| **G2** | 実装前条件 | role→役割助詞の責務対応(§3)が確定し、対象 role(s/o/io/p)と対象外(adv)が切り分け済 |
| **G3** | 実装前条件 | 出力を変える範囲(役割助詞描画)が Morph v1・前置詞 Syntax(FROZEN)を侵さないことの確認 |
| **G4** | QA 条件 | before/after(NT 全巻・実 FS)で対象関係詞の役割助詞付与を測定し、**悪化 0** を確認できる |
| **G5** | QA 条件 | chip⇔panel 一致 100%・破損形 0 を維持できる QA ハーネスが用意されている |
| **G6** | 回帰保証 | 出力変化のため FROZEN プロトコル(回帰ケース追加 → 悪化 0 → 基準値更新)を適用し、既存回帰 8 スイートを再 PASS させる手順が定義されている |

### 補足(Gate の性格)

- Phase 2 は **出力を変える**(者→者が/者を)ため、Phase 1(バイト等価)と異なり FROZEN プロトコルが
  必須(G6)。役割助詞の付与は αὐτós/τίス の morph/particle 波及と同様、particle/stageB 基準へ波及する
  可能性があり、悪化 0 確認のうえ基準更新する。
- **語順再構成(節前置)は Phase 2 に含めない**(PhraseRenderer 協働=Phase 3)。Phase 2 は
  「役割助詞の描画」までに限定することで、Gate を段階的に充足させる。

---

## 責務凍結(候補)

```
[relative-syntax-phase2-design FROZEN候補 2026-07-20]
Syntax 保持: role(節内役割)/ referent(先行詞リンク)/ 頭語(Morph 連携)。自由関係は対象外(Semantic)
渡す範囲: Syntax=構造的事実(role/referent/位置/頭語) / 描画=助詞文字列・語順・チップ
role→助詞: Syntax 担当（Morph=主節格・Semantic=意味 のいずれでもない統語責務）。s/o/io/p 対象・adv 保留
referent→語順: 先行詞同定・節リンク=Syntax単独可 / 並べ替え・表層生成=PhraseRenderer 協働(Phase 3)
対象外: 助詞/語順の実装・whoever/whatever/数量/不定/自由関係(Semantic)・adv 助詞
Gate: G1〜G6(K-3凍結/責務確定/凍結資産非侵害/悪化0測定/chip⇔panel維持/FROZENプロトコル)
```

本設計は凍結可能な状態である。承認により FROZEN 化し、G1〜G6 充足後に Phase 2(役割助詞描画)実装へ進む。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(Syntax 保持情報・描画層への提供範囲・role→助詞=Syntax 責務・referent→語順の Syntax/PhraseRenderer 分担・対象外・Phase 2 Gate G1〜G6) |
