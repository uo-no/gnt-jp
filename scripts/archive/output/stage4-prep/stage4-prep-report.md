# Stage 4 準備報告書

生成日: 2026-10-30  
作成スクリプト: `scripts/audit-stage4-prep.cjs`, `scripts/audit-stage4-analyze.cjs`, `scripts/scratchpad/s4content.cjs`

---

## エグゼクティブサマリー

NT 全 137,741 トークンを token ref 単位で走査し、Stage 1〜3 / BL / S4 / ledger の監査履歴と照合した。残存 **92,952 件**が Stage 4 候補と確定した。

そのうち内容語（noun/verb/adj/adv/num）は **44,629 tokens / 4,211 Strongs**。

**重要な設計上の発見**: Stage 4 残存内容語に対して Stage 3 と同じ verse-level 自動照合（containsBase）を適用しても、JA1955 対応が確認できる内容語は **51 件（3 Strongs）のみ**。主因は動詞辞書形が JA1955 活用形と文字列一致しないこと（1文字漢字問題）。Stage 4 は **Strong 単位の語彙的審査**（verse-level 自動照合ではなく）に設計変更が必要である。

---

## 1. NT 全件照合：7 区分の確定

token ref 単位で NT 全件を走査し、各トークンを以下の区分に分類した。

| # | 区分 | 件数 | 照合基準 |
|---|------|------|---------|
| 1 | **stage3_pool** 監査済み | 28,219 | Stage 3 pool.json に ref が存在 |
| 2 | **bl_excluded** 恒久 BL | 15,883 | Strong ∈ {G5213, G5209, G5210, G5216, G2532, G846} |
| 3 | **s4_excluded** 暫定 S4 除外 | 156 | Strong ∈ {G4675, G4571, G4771, G4674}（σύ 単数形） |
| 4 | **ledger_approved** 承認済み | 148 | ledger で 修正承認/修正済み/現状維持 |
| 5 | **ledger_hold** 保留 | 49 | ledger で 判断保留 |
| 6 | **ledger_taigai** 対象外 | 303 | ledger で 対象外（今回） |
| 7 | **stage2_only** pattern | 31 | Stage 2 census に存在、Stage 3 pool 外 |
| 8 | **remaining** 未監査 | 92,952 | 上記いずれにも該当しない |
| | **合計** | **137,741** | ✅ NT 全件一致 |

**データ整合性**: 全区分の合計が NT 全体 137,741 件と一致することを `audit-stage4-prep.cjs` の実行結果で確認済み（CONFIRMED）。

### 区分の補足説明

- **stage3_pool（28,219）**: matchType = direct / kanji でフィルタリングされた集合。全件 Stage 3 監査済み。
- **bl_excluded（15,883）**: 6 Strong の全 NT 出現。Stage 2 の BL 集計（3,922 件）はこの subset（Stage 2 pool に入ったものの BL 除外分）であり、残り 11,961 件は Stage 2 にも収録されていない全 NT 出現分。
- **s4_excluded（156）**: σύ 単数形（Stage 4 先行処理済み）。当初の pool 外 σύ トークン。
- **ledger 合計（500）**: 承認済み 148 + 保留 49 + 対象外 303 = 500 件。このうち保留 49 件は Stage 5 候補。
- **stage2_only（31）**: matchType = pattern でマッチしたため Stage 3 pool（direct/kanji のみ）に入らなかった。内容語含む。
- **remaining（92,952）**: matchType が存在しない（実行時未計算）。Stage 4 の一次候補。

---

## 2. 残存 92,952 件の分析

### 2.1 品詞別分布（bible_data の class フィールドによる）

| class | tokens | 割合 |
|-------|--------|------|
| det（冠詞） | 19,940 | 21.5% |
| verb（動詞） | 25,341 | 27.3% |
| noun（名詞） | 8,767 | 9.4% |
| conj（接続詞） | 13,127 | 14.1% |
| prep（前置詞） | 9,697 | 10.4% |
| adj（形容詞） | 5,915 | 6.4% |
| pron（代名詞） | 7,270 | 7.8% |
| adv（副詞） | 4,502 | 4.8% |
| ptcl（助詞・小辞） | 1,016 | 1.1% |
| num（数詞） | 104 | 0.1% |
| intj（感嘆詞） | 10 | 0.0% |
| その他 | 7,263 | 7.8% |
| **合計** | **92,952** | |

### 2.2 jaType 別分布（token.japanese の型分類）

| jaType | tokens | 説明 |
|--------|--------|------|
| bracket | 27,329 | 構造ラベル（例: ［冠詞］, ［転換語句］） |
| tilde | 18,655 | 機能的ラベル（例: 〜ない, 〜の中に, 〜について） |
| plain | 46,968 | 通常の日本語テキスト |
| **合計** | **92,952** | |

### 2.3 区分の重要性

- **bracket（27,329）**: Reading Engine が付与した文法構造ラベル。JA1955 の訳語ではないため、Stage 4 の語彙的監査対象外
- **tilde（18,655）**: 機能語（前置詞・接続詞等）または copula/negation の構造ラベル。機能語は対象外。内容語 class の tilde（5,348 tokens）は別途検討
- **plain（46,968）**: このうち内容語 class は **39,281 tokens**（Stage 4 の中心対象）

---

## 3. 内容語の対象母集団

### 3.1 定義

Stage 4 の「内容語」= bible_data の `class` フィールドが以下のいずれか:

| class | 定義 | tokens |
|-------|------|--------|
| noun | 名詞 | 8,767 |
| verb | 動詞 | 25,341 |
| adj | 形容詞 | 5,915 |
| adv | 副詞 | 4,502 |
| num | 数詞 | 104 |
| **合計** | | **44,629** |

機能語（det/conj/prep/ptcl/intj）および pron（代名詞, 7,270）は条件付き対象（§3.4 参照）。

### 3.2 内容語の jaType 分布

| jaType | Strongs | tokens | 備考 |
|--------|---------|--------|------|
| plain | 4,182 | 39,281 | Stage 4 一次対象 |
| tilde | 29 | 5,348 | copula（〜である）+ 否定副詞（〜ない）。述語構造審査 |
| bracket | 0 | 0 | 内容語 class に bracket は存在しない |
| **合計** | **4,211** | **44,629** | |

> **重要**: tilde-label の 29 Strongs は εἰμί の各活用形（G2076, G2258, G2071, G1526, G1510, G1511 等）と否定副詞（G3756, G3361）が中心。mixed（plain と tilde が同一 Strong 内に混在）は 0 件。

### 3.3 Stage 3 との重複

| 区分 | Strongs | tokens | 説明 |
|------|---------|--------|------|
| Stage 3 にも存在する | 1,109 | 24,258 | Stage 3 pool の対象 Strong が remaining にも出現（別 token） |
| Stage 4 NEW | 3,102 | 20,371 | Stage 3 pool に未収録の Strong |

**解釈**: Stage 3 「監査済み」は同一 Strong の特定 ref（matchType=direct/kanji の token）が審査されたことを意味する。同 Strong の他の ref（matchType=none の token）は依然として Stage 4 の対象となる。

### 3.4 pron class の扱い（条件付き対象）

pron class は 7,270 tokens。Stage 4 の σύ 単数形（G4675/G4571/G4771/G4674）は S4 除外済み（156 件）。  
残存 pron の主要 Strong:

| Strong | japanese | n | 備考 |
|--------|----------|---|------|
| G3450 | 私 | 564 | ἐμοῦ (gen of ἐγώ) |
| G1473 | 私 | 453 | ἐγώ |
| G848 | 自分 | 437 | αὑτοῦ (reflexive) |
| G2257 | 私たち | 401 | ἡμῶν |
| G5101 | 誰 | 507 | τίς (interrogative) |
| G5100 | ある | 274 | τίς (indefinite) |
| G1438 | 自分自身 | 304 | ἑαυτοῦ |

推奨: S4 σύ 単数形と同じ Strong 単位照合アプローチで処理可能。Stage 4 開始時に方針を確定する。

---

## 4. 頻度別 Strong 集計

### 4.1 plain-label 内容語 Strongs の頻度分布

| Tier | 頻度 | Strongs | tokens | 累積 tokens |
|------|------|---------|--------|------------|
| 1 | n ≥ 200 | 24 | 9,246 | 9,246 |
| 2 | 100 ≤ n < 200 | 42 | 6,044 | 15,290 |
| 3 | 50 ≤ n < 100 | 84 | 5,133 | 20,423 |
| 4 | 20 ≤ n < 50 | 216 | 6,636 | 27,059 |
| 5 | 10 ≤ n < 20 | 349 | 4,681 | 31,740 |
| 6 | 5 ≤ n < 10 | 592 | 3,838 | 35,578 |
| 7 | n < 5 | 2,875 | 3,703 | 39,281 |
| **合計** | | **4,182** | **39,281** | |

> n ≥ 50 の 150 Strongs で 20,423 tokens（51.8%）をカバー。n ≥ 20 の 366 Strongs で 27,059 tokens（68.9%）。

### 4.2 高頻度 Tier 1（n ≥ 200）上位 24 Strongs

| Strong | japanese | class | n remaining | s3 pool n |
|--------|----------|-------|------------|-----------|
| G3756 | 〜ない | adv | 1,623 | 0 | ← tilde
| G3004 | 言う | verb | 1,164 | 184 |
| G3361 | 〜ない | adv | 1,042 | 0 | ← tilde
| G2076 | 〜である | verb | 896 | 0 | ← tilde
| G3956 | すべての | adj | 884 | 360 |
| G2036 | 言う | verb | 866 | 56 |
| G2192 | 持つ | verb | 679 | 28 |
| G1096 | なる | verb | 580 | 87 |
| G4160 | 行う | verb | 520 | 46 |
| G2064 | 来る | verb | 505 | 125 |
| G2258 | 〜である | verb | 427 | 0 | ← tilde
| G3708 | 見る | verb | 424 | 95 |
| G1325 | 与える | verb | 380 | 89 |
| G191 | 聞く | verb | 361 | 87 |
| G3056 | ことば | noun | 330 | 0 |
| G1492 | 知る | verb | 284 | 44 |
| G2980 | 語る | verb | 234 | 29 |
| G611 | 答える | verb | 231 | 65 |
| G2983 | 受ける | verb | 225 | 56 |
| G1831 | 出る | verb | 211 | 44 |
| G1520 | 一つ | adj | 207 | 48 |
| G4183 | 多くの | adj | 204 | 105 |
| G2309 | 望む | verb | 201 | 19 |
| G2071 | 〜である | verb | 191 | 0 | ← tilde

> tilde-label の G3756/G3361/G2076/G2258/G2071 を除くと、実質 Tier 1 は 19 Strongs（plain-label）+ 24,423 tokens から tilde 分 3,757 tokens を引いた 20,666 tokens。

---

## 5. JA1955 verse-level 照合の限界（重要発見）

Stage 4 準備のために `containsBase()` を 92,952 件全件に適用したところ:

| 結果 | tokens | Strongs |
|------|--------|---------|
| JA1955 対応が確認できた内容語 | **51** | **3** |
| 対応が確認できなかった内容語 | 44,578 | 4,208 |

**確認できた 3 Strongs**:
- G435（ἀνήρ, 男, 1 件）
- G3985（πειράζω, 試みる, 19 件）
- G3986（πειρασμός, 試練, 27 件）

**原因の分析**（CONFIRMED）:

1. **1文字漢字問題**: 動詞の辞書形に含まれる漢字が 1 文字（言・持・見・知・来・出 等）のため `containsBase()` の kanji 抽出閾値（2文字以上）を満たさずマッチしない
2. **活用形の問題**: JA1955 は活用形（言われた・持っている・見た）で記載。辞書形ラベル（言う・持つ・見る）との文字列一致は成立しない
3. **漢字自体の違い**: 一部の動詞は活用・文体によって使用漢字が異なる（例: G4160 行う → JA1955 では「する」「なさる」「行なう」等が混在する可能性）

**設計上の帰結**: Stage 4 は **verse-level 自動照合ではなく、Strong-level 語彙的審査**として設計する必要がある（詳細は `stage4-audit-design.md` 参照）。

---

## 6. 既存 Stage との重複・除外確認表

| NT 全体 | 137,741 | 基準値 |
|---------|---------|-------|
| Stage 3 pool 監査済み | 28,219 | direct/kanji matchType で JA1955 対応確認済み |
| Stage 3 で使用した pool (S3 抽出条件) | 28,219 | = BL除外 + S4除外 + matchType=direct/kanji の積集合 |
| 恒久 BL | 15,883 | 6 Strong の全 NT 出現（Stage 2 の BL 3,922 ≠ この数） |
| σύ 単数形（S4 処理済） | 156 | 専用処理 |
| ledger 承認済み | 148 | 修正確定 + 現状維持 |
| ledger 保留（Stage 5 候補） | 49 | 未確定 |
| ledger 対象外 | 303 | 今回の審査対象外と判定済み |
| Stage 2 census のみ（pattern） | 31 | Stage 3 未処理 |
| **Stage 4 候補（残存）** | **92,952** | 上記以外の全 NT トークン |

**検証**: 28,219 + 15,883 + 156 + 148 + 49 + 303 + 31 + 92,952 = **137,741** ✅

---

## 7. Stage 4 対象母集団の確定

### 7.1 確定した母集団

| 対象 | Strongs | tokens | 優先度 |
|------|---------|--------|--------|
| plain-label 内容語（一次対象） | 4,182 | 39,281 | 高 |
| stage2_only 内容語 | 11 | 31 | 中（Tier 3-4 に統合） |
| tilde-label 内容語（述語構造） | 29 | 5,348 | 中（一括確認） |
| pron class（方針確定後） | 未確定 | 7,270 | 要設計判断 |
| **内容語合計** | **4,222** | **51,930** | |

### 7.2 監査方法の確定

詳細は `stage4-audit-design.md` を参照。  
主要方針:

1. **Strong 単位（lemma-level）の語彙的審査** — verse-by-verse ではない
2. **頻度別 Tier 設計** — n ≥ 50 の 150 Strongs を最優先（44,629 tokens の 54.7%）
3. **動詞辞書形問題への対応** — containsBase() を使わず、Strongs 辞書 + JA1955 サンプル確認
4. **全件数の上限設定** — Tier 4（n<5, 2,875 Strongs）はサンプリング

---

## 8. 成果物一覧

| ファイル | 内容 | 件数 |
|---------|------|------|
| `stage4-prep-pool.json` | remaining 92,952 件全件（token ref リスト） | 92,952 |
| `stage4-prep-by-strong.json` | remaining の Strong 別集計 | 4,384 Strongs |
| `stage4-prep-by-book.json` | remaining の書巻別集計 | 27 書巻 |
| `stage4-prep-summary.json` | NT 全件カテゴリ分類サマリー（7 区分 + 整合性） | — |
| `stage4-stage2only.json` | Stage 2 census のみの 31 件 | 31 |
| `stage4-analysis-summary.json` | class × jaType × JA1955 分析サマリー | — |
| `stage4-content-strongs.json` | 4,211 content-word Strongs 全リスト（頻度・jaType 等） | 4,211 Strongs |
| `stage4-pool.json` | JA1955 直接照合可能内容語 51 件 | 51 |
| `stage4-pool-by-strong.json` | JA1955 直接照合 Strong 別（3 Strongs） | 3 |
| `stage4-final-summary.json` | 上記の統合サマリー | — |
| `stage4-audit-design.md` | Stage 4 監査設計案（本ファイルと対）| — |
| **本ファイル** `stage4-prep-report.md` | Stage 4 準備報告書 | — |

---

## 9. 未解決事項（UNKNOWN / DEFERRED）

| 事項 | 状態 | 影響 |
|------|------|------|
| pron 7,270 件の最終方針（S4 類似方式か否か） | UNKNOWN | Stage 4 実施前に確定が必要 |
| tilde-label 述語構造（〜である）の審査基準 | UNKNOWN | 監査開始前に確定が必要 |
| Tier 4（n<5, 2,875 Strongs）のサンプリング率 | DEFERRED | 実施方針で決定 |
| Stage 5（保留 49 件の再検討）との重複調整 | DEFERRED | Stage 5 開始時に整理 |

---

## 10. 次のステップ

Stage 4 準備は完了。Stage 4 実施のために確定が必要な事項:

1. **pron class の方針確定**（Stage 4 に含めるか、別立てにするか）
2. **tilde-label 述語構造の監査基準確定**（εἰμί 形をどう扱うか）
3. **Stage 4 監査開始**: Tier 1 plain-label verb（高頻度動詞 n≥50）から着手

今回の作業で Stage 4 で「何を」「何件」「どの方法で」監査するかが確定できる状態になった。
