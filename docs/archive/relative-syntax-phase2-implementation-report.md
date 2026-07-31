# 関係詞 Syntax Phase 2 実装報告(Stage K-4 Phase 2)

実装日: 2026-07-20
位置づけ: docs/relative-syntax-phase2-implementation-plan.md(K-4 計画・FROZEN 候補)に基づく
Phase 2(role 情報を利用した限定的な描画連携)実装。設計は relative-syntax-phase2-design.md(K-4)。
**Phase 2 は日本語出力を変えない(バイト等価)構造情報の付帯と整合監査に限定**。語順再構成は Phase 3。
数値はクリーン NT 実測(総 137,741・重複「 2.json」不在)。

---

## 1. 変更ファイル一覧と変更内容

| ファイル | 変更内容 |
|---|---|
| public/core/reading-engine.js | **resolve() wrapper に Phase 2-A の付帯処理を追加**。resolve 結果が非 null かつ束縛関係の関係詞のとき、`result.relativeSyntax = getRelativeSyntax(token)`（{strong, role, referent}）を **read-only で付帯**。**result.japanese は不変・pipeline 順序/語幹決定/助詞は不変**。`_resolveUnsafe`/`_morphStem`/`_resolveMorph`/Morph Registry/前置詞 Syntax は一切変更なし |

**変更なし(制約遵守)**: bible_data / generated data / Semantic / **PhraseRenderer(phrase-renderer.js)** /
Morph Registry(`_MORPH_STEM_RULES`・7 lemma 不変)/ 前置詞 Syntax(`_resolveSyntax`)/ 語順。重複再混入 0。

---

## 2. Phase 2-A / 2-B / 2-C の実施結果

### Phase 2-A: role 情報を内部表現として保持・利用可能にする

- resolve 結果に **relativeSyntax(role/referent)を付帯**(束縛関係・非 null 結果のみ)。
- **日本語出力は完全不変(バイト等価)**。自由関係(referent 無)・非関係詞は付帯されない(getRelativeSyntax
  が null)。
- 検証: 束縛関係 japanese=「〜する者を」等 不変・relativeSyntax={strong,role,referent} 付帯 / 自由関係・
  αὐτós は付帯なし。付帯された束縛関係(非 null 結果)= **780 件**(残 291 の null 結果は
  getRelativeSyntax(token) で取得可能・K-3 のまま)。
- **完了条件(出力バイト等価)充足**。

### Phase 2-B: s / o / io / p の整合監査(出力変更なし)

- **重要な確定**: 関係詞の role(節内役割)を日本語の**助詞**で頭語(者/もの)に付けることは、節内役割が
  日本語では**語順(連体修飾=節が先行詞の前)で表現される**ため適切でない。よって Phase 2 では**出力を
  変えない**。role→助詞の出力反映は **Phase 3(語順再構成)の責務**。
- 既存 case→格助詞との整合を実測(束縛関係):

| role | 既存出力の一致 | 相違(既存 case 由来・Phase 2 で不変) |
|---|---|---|
| s(主語) | (無)85 | を9 |
| o(目的語) | を296 | の32 / に20 |
| io(間接) | に22 | 0(完全一致) |
| p(補語) | — | の7 / に2 |

- **二重助詞: 0**(真の助詞 2 連は 0。※「もの」の「の」を助詞と誤認する検出は補正済)。
  **破損形(新): 0**(re-stageB 正式指標)。
- **o/io は既存 case→格助詞と概ね一致**(io 完全一致)。**s は無標が主**(語順で表現=Phase 3)。
  role≠case の相違 約 90 件は **既存挙動で Phase 2 は変更しない**(byte 等価)。
- **s-role の主語標示は「者が」ではなく語順(Phase 3)で表現すべき**と確定。したがって Phase 2 で
  s-role に助詞を付与しない(誤標示回避)。**出力変更なし = 悪化 0**。

### Phase 2-C: NT 全巻・実 FS 回帰監査

- 全 8 スイート ALL PASS(基準値すべて不変)・re-stageB 出力バイト等価(identical=98,047 不変)・
  chip⇔panel 100%・破損形 0。詳細は §4/§5。

---

## 3. Gate G1〜G6 判定結果

| Gate | 判定 | 根拠 |
|---|---|---|
| **G1**(K-3 凍結・バイト等価) | **合格** | K-3 実装済・全回帰 ALL PASS |
| **G2**(role 対象 s/o/io/p 確定・adv 保留) | **合格** | 対象 role のみ監査・adv 対象外 |
| **G3**(Morph v1・前置詞 Syntax 非侵害) | **合格** | Registry/resolve pipeline/前置詞 Syntax 不変 |
| **G4**(悪化 0 測定 QA) | **合格** | before/after バイト等価・悪化 0(§5) |
| **G5**(chip⇔panel 100%・破損 0) | **合格** | re-stageB 監査で確認 |
| **G6**(FROZEN プロトコル) | **合格(適用不要)** | 出力バイト等価のため基準更新なし。回帰は既存基準で ALL PASS |

- **G1〜G6 すべて合格**。Phase 2 は出力を変えないため FROZEN プロトコルの基準更新は発生しなかった。

---

## 4. QA 結果

| 項目 | 結果 |
|---|---|
| role 取得率維持 | 束縛 1,071 で role 取得が K-3 と同一(付帯は非 null 結果 780・残は accessor で取得可) |
| referent 取得率維持 | 1,071 で referent 保持 同一(語順再構成なし) |
| **自由関係 587 件への影響 0** | referent 無は relativeSyntax 非付帯・出力不変 |
| **Morph v1 回帰 0** | re-phase1 104 checks ALL PASS・morph 44,251 不変・7 lemma 出力不変 |
| chip⇔panel 一致 | **100%(不一致 0)** |
| 既存 8 スイート | **ALL PASS** |
| 悪化 0 | **0**(§5) |

### 全既存回帰(ALL PASS)

re-phase1(104)/ re-phase2(47)/ re-phase3(27)/ re-phase5(55)/ re-stageA(19)/
re-stageB(27)/ re-stageD(18)/ re-stageE(16) — **すべて基準値不変で PASS**。
test:genitive FAIL=2 は Stage H-5 で確認済みの既存失敗。

---

## 5. NT 全巻 before/after 監査・悪化 0 の測定

- **before / after の日本語出力は完全に一致(バイト等価)**。Phase 2 は relativeSyntax の付帯(メタデータ)
  のみで japanese を変えない。re-stageB の 変更 39,694 / 一致 98,047 が**変化なし**= NT 全巻 137,741
  チップ出力がバイト等価。
- **悪化 0 の測定(計画 §5 の各種別)**:

| 悪化種別 | 結果 |
|---|---|
| 破損形の発生(者をを 等) | **0**(re-stageB 破損形（新）0・tail 助詞 2 連 0) |
| 役割と助詞の不一致(新規発生) | **0 新規**(role≠case の約 90 件は既存挙動・Phase 2 で不変) |
| 既存標示の劣化 | **0**(o→を・io→に 等 既存標示は完全不変) |
| chip⇔panel 乖離 | **0**(一致率 100%) |
| 自由関係・非関係詞への波及 | **0**(relativeSyntax 非付帯・出力不変) |

---

## 6. 二重助詞・破損形の確認結果

- **真の二重助詞: 0**(頭語 者/もの 以降の助詞列が 2 連以上になるものは 0)。
- **破損形(新): 0**(re-stageB 正式指標)。
- 補足: 初回監査で二重助詞 180・破損 31 と出たが、これは「もの」の「の」を助詞と誤認する検出器の
  **偽陽性**であり、tail(頭語以降)ベースの再監査で **0** と確定(実際の出力に二重助詞・破損なし)。

---

## 7. 未解決範囲

| 項目 | 責務 |
|---|---|
| **role→役割助詞の出力反映**(者が/者を の描画) | **Phase 3(語順再構成)**。節内役割は日本語では語順で表現されるため、助詞付与ではなく連体修飾(節→先行詞前)が必要 |
| **語順再構成**(関係節を先行詞の前へ) | Phase 3(PhraseRenderer 協働) |
| role≠case の相違 約 90 件 | Phase 3 で語順により解決 |
| adv role の助詞 | prep 依存・保留 |
| whoever/whatever(自由関係 587)・数量(ὅσος)・不定(ὅστις) | Semantic |

---

## 8. K-4 Phase 2 の凍結可否

- **凍結可能**。Phase 2 は relativeSyntax(role/referent)を resolve 結果に付帯し、**日本語出力を一切変えず
  (バイト等価)**、既存 case→格助詞との整合を監査した。全 Gate 合格・QA 必須項目 ALL PASS・悪化 0・
  二重助詞 0・破損形 0・Morph v1 非回帰・chip⇔panel 100%。
- **責務逸脱なし**: Syntax は文字列を生成せず(role を保持するのみ)、語順変更なし、case→格助詞の無断
  置換なし、Morph/PhraseRenderer/Semantic 不変。
- **確定した重要事項**: 関係詞の role は日本語では**語順**で表現されるため、role→助詞の出力反映は
  Phase 2 ではなく **Phase 3(語順再構成)** の責務。Phase 2 はその前提となる **構造情報の保持と整合確認**を
  完了した。

```
[relative-syntax-phase2-implementation FROZEN候補 2026-07-20]
Phase 2-A: relativeSyntax(role/referent) を resolve 結果へ read-only 付帯（束縛780・出力バイト等価）
Phase 2-B: role↔既存case標示の整合監査（io完全一致・o大半を・s無標）・二重助詞0・破損0・出力変更なし
確定: role→助詞の出力反映は語順=Phase 3 の責務。Phase 2 は情報保持と整合確認に限定
QA: 全8スイートALL PASS基準不変・Morph v1回帰0・chip⇔panel100%・自由関係587影響0・悪化0
Gate G1〜G6: 全合格（出力バイト等価のためFROZENプロトコル基準更新なし）
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版(Phase 2-A relativeSyntax 付帯・2-B 整合監査・2-C 回帰・バイト等価・悪化0・二重助詞0・破損0・role→助詞出力はPhase3確定) |
