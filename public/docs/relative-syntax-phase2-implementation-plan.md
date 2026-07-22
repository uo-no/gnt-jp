# 関係詞 Syntax Phase 2 実装計画(Stage K-4 実装計画)

策定日: 2026-07-20
位置づけ: docs/relative-syntax-phase2-design.md(K-4 責務設計・FROZEN 候補)を**唯一の設計前提**とし、
関係詞の role 注釈を利用して**構造的な節内役割を日本語描画へ限定的に反映する**実装計画。
語順再構成は本計画の対象外(K-5 / Phase 3)。
根拠: K-1(設計)・K-2(Phase 1 計画)・K-3(Phase 1 実装・getRelativeSyntax)・J-9(Morph v1 FROZEN)。

**本文書は設計・計画のみ。コード・擬似コード・JSON・TypeScript は含まない。本 Stage でコード・
データは変更しない。** bible_data / Morph v1 / Semantic / PhraseRenderer は変更しない。
語順再構成は行わない。Syntax が日本語文字列を生成する設計は採らない。K-3 の構造情報保持は再設計しない。

---

## 0. 現行挙動の把握(実測・計画の前提)

Phase 2 は既存の描画挙動の上に載るため、**現行の関係詞出力(束縛関係 1,071)を role 別に実測**した。

| role | 現行出力の末尾(助詞) | 所見 |
|---|---|---|
| **s(主語 379)** | (無)370 / を9 | **主語標示のギャップ**(頭語が無標)。Phase 2 の主対象 |
| o(目的語 348) | を296 / の32 / に20 | **既に を 中心**(case=accusative→を が role=o と一致) |
| io(間接 22) | に22 | **既に に**(case=dative→に が role=io と一致) |
| adv(71) | に37 / を10 / の23 | 混在(prep/case 依存)。**保留** |
| p(補語 10) | の7 / に2 | 混在 |
| (role 無) | の95 / を58 / に79 | case 由来の助詞 |

**重要な前提**: 既存の Morph case→格助詞 + Phase 3-A particle 層が、**o/io は case 経由で既に role 相当に
標示**している(case≈role のため)。**Phase 2 の主な追加価値は s-role の主語標示ギャップの補完**であり、
既存標示との**整合(二重付与・競合の回避)が中心課題**となる。

---

## 1. 実装範囲

- **role → 役割情報の描画連携のみ**(Syntax は構造的役割を提供・描画側が反映)。
- 対象 role: **s / o / io / p**。
- **adv は保留**(prep/case 依存で role 単独では助詞が決まらない)。
- **referent は保持のみ**(K-3 のまま。語順再構成は Phase 3)。
- **自由関係(referent 無 587)は対象外**(Semantic)。
- **role に基づく語順変更は行わない**。

---

## 2. 責務境界

| 責務 | 担当 | 内容 |
|---|---|---|
| role → 構造的役割の決定・提供 | **Syntax** | s/o/io/p の節内役割を注釈から提供(getRelativeSyntax・K-3) |
| **助詞文字列・語順・表層生成** | **Syntax ではない**(Presentation) | 役割助詞の文字列化・チップ表示は描画層 |
| 語順再構成 | PhraseRenderer(Phase 3) | 本計画対象外 |
| 自由関係・数量・不定・語義 | **Semantic** | referent 無・ὅσος 数量・ὅστις 不定 |

- **明記**: **「role → 構造的役割」は Syntax 責務**。**「助詞文字列・語順・表層生成」は Syntax 責務では
  ない**(描画層が決定)。Syntax は文字列を生成せず、構造情報を提供するのみ。
- Morph v1(主節格→格助詞)・Semantic(意味)とは別の統語責務(K-4 §3)。

---

## 3. 現行 resolve pipeline への影響確認

| 確認項目 | 計画上の扱い |
|---|---|
| **Morph Rule Engine v1 を壊さない** | Morph(gender→頭語・case→格助詞)は不変。Phase 2 は role 情報の描画連携のみで `_MORPH_STEM_RULES`・`_resolveMorph` に触れない |
| **既存 Syntax(preposition)と競合しない** | 前置詞 Syntax(`_resolveSyntax`・FROZEN)とは別責務。関係詞 role は独立に扱い、前置詞処理を変えない |
| **Semantic 短絡を維持** | pipeline 順序(semantic→syntax→morph→particle)は不変。Semantic 先行短絡を壊さない |
| **K-3 の role/referent 取得と整合** | getRelativeSyntax(read-only)をそのまま入力として用いる(再設計しない) |
| **chip⇔panel 表示関係を壊さない** | 描画連携は chip と panel の双方が同一の role 情報を参照するようにし、一致率 100% を維持 |
| **★既存 case→格助詞との整合(二重付与回避)** | **最重要**。o/io は既に を/に が付与済(§0)。Phase 2 が role 由来の助詞を**重複付与しない**こと(者をを 等の防止)を必須確認とする。主対象は s-role の無標ギャップ補完に絞る |

- **中心リスクは既存 case→格助詞 / particle 層との競合**。Phase 2 は「既に role 相当に標示済みの
  o/io を二重処理しない」「s-role の無標を補う」形に限定し、既存標示を**置換ではなく整合**させる。

---

## 4. 実装順序(Phase 2-A / 2-B / 2-C)

### Phase 2-A: role 情報を内部表現として保持・利用可能にする

- **目的**: K-3 の getRelativeSyntax が返す role を、描画判断点(chip/panel 生成)で**利用可能な内部表現**
  として保持する(出力は変えない)。
- **変更対象**: role を描画層へ受け渡す内部経路(read-only 情報の伝搬)。
- **変更してはいけない範囲**: resolve 出力の日本語文字列・Morph v1・Semantic・pipeline 順序・
  getRelativeSyntax の仕様。
- **完了条件**: 描画判断点で束縛関係 1,071 の role が取得でき、**出力はバイト等価**(Phase 1 と同様)。

### Phase 2-B: s / o / io / p に限定した日本語描画連携

- **目的**: 描画層が role を参照し、**s-role の主語標示補完**を中心に、o/io/p の役割を(既存標示と整合
  させつつ)反映する。**Syntax は文字列を生成せず、描画層が助詞を実体化**。
- **変更対象**: 描画層(Presentation / chip 生成)における役割助詞の反映(既存 case→格助詞と非重複)。
- **変更してはいけない範囲**: Morph v1・PhraseRenderer・Semantic・語順・adv role・自由関係・
  reading-engine の resolve 語幹決定。
- **完了条件**: s/o/io/p の対象関係詞で役割が描画に反映され、**二重付与 0・破損形 0・chip⇔panel 100%**、
  before/after で悪化 0。

### Phase 2-C: 回帰監査・悪化監査・責務境界監査

- **目的**: Phase 2-B の変更が既存資産を壊していないこと、責務境界を逸脱していないことを監査。
- **変更対象**: 監査スクリプト・回帰基準(出力変化があれば FROZEN プロトコルで更新)。
- **変更してはいけない範囲**: 実装本体(監査は読み取り)。
- **完了条件**: §5 の QA 必須項目 ALL PASS・悪化 0・責務逸脱 0。

---

## 5. QA 計画

### 必須検証項目

| 項目 | 合格条件 |
|---|---|
| role 取得率維持 | 束縛関係 1,071 で role 取得が K-3 と同一 |
| referent 取得率維持 | 1,071 件で referent 保持が K-3 と同一(語順再構成なし) |
| **自由関係 587 件への影響 0** | referent 無 587 の出力・扱いが完全不変 |
| **Morph v1 回帰 0** | αὐτós/τίς/ὅς/ὅστις/ὅσος/ἐμαυτοῦ/σεαυτοῦ の resolve 出力・morph 基準 44,251 不変 |
| chip⇔panel 一致 | 一致率 100%・不一致 0 |
| 既存 8 スイート PASS | re-phase1〜5 / re-stageA/B/D/E ALL PASS |
| **悪化 0** | 下記定義で 0 |

### 「悪化 0」の測定(何を悪化とするか)

| 悪化の種別 | 測定方法 |
|---|---|
| **破損形の発生** | 者をを・者がを 等の二重助詞・不正形を検出(既存 brokenForm 監査を関係詞へ適用) |
| **役割と助詞の不一致** | role=o なのに が、role=s なのに を 等、role と描画助詞の不整合を検出 |
| **既存標示の劣化** | 既に role 相当に標示されていた o/io(を/に)が Phase 2 で誤って変わっていないか before/after 比較 |
| **chip⇔panel 乖離** | chip と panel の関係詞表示が相違した件数(0 必須) |
| **自由関係・非関係詞への波及** | referent 無・非関係詞トークンの出力変化(0 必須) |

- 測定は **NT 全巻・実 FS**(サンドボックス不可・重複「 2.json」不在を確認)。before = Phase 2 前、
  after = Phase 2-B 後。**悪化件数 0** を必須とする。

---

## 6. 実装開始 Gate(G1〜G6)

docs/relative-syntax-phase2-design.md の G1〜G6 を再掲し、判定条件・確認方法・不合格時の扱いを定義する。

| Gate | 判定条件 | 確認方法 | 不合格時 |
|---|---|---|---|
| **G1** | K-3(Phase 1)実装済・バイト等価で凍結 | K-3 report・回帰 ALL PASS | 着手中止(Phase 1 を先に固める) |
| **G2** | role→役割対応が確定・対象(s/o/io/p)と対象外(adv)切り分け済 | 本計画 §1/§2・K-4 設計 | 対象範囲を再定義するまで着手しない |
| **G3** | 出力変化範囲が Morph v1・前置詞 Syntax(FROZEN)を侵さない | 影響確認 §3・コードレビュー | 侵害があれば設計へ差し戻し |
| **G4** | before/after で悪化 0 を測定できる QA が用意 | §5 の悪化定義・census スクリプト | QA 未整備なら着手しない |
| **G5** | chip⇔panel 一致 100%・破損形 0 を維持する監査が用意 | re-stageB 監査の関係詞拡張 | 監査未整備なら着手しない |
| **G6** | 出力変化に対する FROZEN プロトコル(回帰追加→悪化0→基準更新)手順が定義 | §4 Phase 2-C・K-2 プロトコル | 手順未定義なら着手しない |

- **不合格時の共通原則**: いずれかの Gate 未充足なら Phase 2-B(出力変化)へ進まない。Phase 2-A
  (バイト等価の内部保持)までは G1/G2 充足で先行可能。

---

## 7. リリース判定基準(K-4 Phase 2 完了・凍結可能条件)

以下をすべて満たすとき Phase 2 を完了・FROZEN 判定プロトコル開始可能とする。

| # | 基準 |
|---|---|
| 1 | **role 対象範囲の逸脱なし**(s/o/io/p のみ・adv 保留) |
| 2 | **free relative(587)への影響 0** |
| 3 | **Morph v1 FROZEN 資産への侵害 0**(morph 44,251・7 lemma 出力不変) |
| 4 | **Syntax 責務の逸脱なし**(Syntax が文字列生成・語順変更をしていない) |
| 5 | **語順再構成の混入なし**(Phase 3 責務が混入していない) |
| 6 | **QA 必須項目 ALL PASS**(§5) |
| 7 | **悪化 0**(§5 の全種別) |
| 8 | **FROZEN 判定プロトコルを開始可能**(回帰基準の更新手順・監査が整備済) |

いずれか未達なら凍結しない(該当 Phase を保留・是正)。

---

## 責務凍結(候補)

```
[relative-syntax-phase2-implementation-plan FROZEN候補 2026-07-20]
範囲: role→役割情報の描画連携のみ・s/o/io/p 対象・adv 保留・referent 保持のみ・自由関係587対象外・語順変更なし
責務: role→構造的役割=Syntax / 助詞文字列・語順・表層=描画(Syntax非責務) / 語順再構成=Phase3 / 数量・不定・自由=Semantic
pipeline: Morph v1・前置詞Syntax・Semantic短絡・chip⇔panel を非侵害。★既存case→格助詞との整合(二重付与回避)が中心課題
順序: 2-A 内部保持(バイト等価) → 2-B s/o/io/p 描画連携(悪化0) → 2-C 回帰・悪化・責務境界監査
QA: role/referent取得維持・自由関係587影響0・Morph v1回帰0・chip⇔panel100%・8スイートPASS・悪化0(破損/役割不一致/既存劣化/乖離/波及)
Gate: G1〜G6（K-3凍結/責務確定/凍結資産非侵害/悪化0測定/chip⇔panel維持/FROZENプロトコル）
リリース: 対象逸脱なし・free影響0・Morph v1侵害0・Syntax責務逸脱なし・語順混入なし・QA ALL PASS・悪化0・FROZEN開始可
```

本計画は凍結可能な状態である。承認により FROZEN 化し、G1〜G6 充足後に Phase 2-A → 2-B → 2-C を実施する。

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-20 | 初版・凍結候補(現行挙動実測・実装範囲・責務境界・pipeline 影響[既存 case→格助詞整合]・2-A/2-B/2-C 順序・QA/悪化定義・Gate G1〜G6・リリース基準) |
