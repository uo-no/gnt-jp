# Stage 4 Phase 4ah — UNREVIEWED 分解・監査計画

**Phase**: 4ah
**実施日**: 2026-11-04
**性格**: READ-ONLY 調査・計画 — bible_data・辞書・エンジン・baseline 変更なし

---

## 1. 作業前確認

| 項目 | 値 |
|------|-----|
| HEAD SHA | 4acb52bcd3077500904ddf07d91225b3bb5b2a1c |
| origin HEAD | 2120b4b4201a492bfd7f9f5e610e7b2833b02d31 |
| Phase 4ag 成果物 | stage4-phase4ag-residual-inventory.json / .md 存在確認 ✓ |
| Phase 4ag 整合性 | 全 10 チェック PASS / total=92,952 ✓ |

**Phase 4ag 分類結果（確認）:**

| state | 件数 |
|-------|------|
| IMPLEMENTED_AND_VERIFIED | 365 |
| HOLD_CONTEXT | 1 |
| HOLD_DATA_QUALITY | 7 |
| RETAIN_CONFIRMED | 46,225 |
| UNREVIEWED | 46,354 |
| **合計** | **92,952** |

---

## 2. UNREVIEWED 46,354件 — 監査根拠別分解

### 2.1 監査根拠の分類定義

| 分類 | 意味 |
|------|------|
| **INDIVIDUALLY_CONFIRMED_OK** | Phase 4h 全件照合で 1 token ずつ確認済み（変更不要と判定） |
| **SAMPLED_TOKEN** | Phase 4e/4f/4g のサンプルに含まれた token（個別確認あり） |
| **SAMPLED_INFERRED** | Strong の一部がサンプル確認済みだが、この token 自体は未サンプル（Strong 単位の推定） |
| **TRULY_UNREVIEWED** | Strong に対してサンプル含め一切の監査履歴なし |

### 2.2 分類別件数

| 監査根拠 | 件数 | 割合 |
|---------|------|------|
| INDIVIDUALLY_CONFIRMED_OK | 196 | 0.4% |
| SAMPLED_TOKEN | 786 | 1.7% |
| SAMPLED_INFERRED | 12482 | 26.9% |
| TRULY_UNREVIEWED | 32890 | 71.0% |
| **合計** | **46,354** | **100%** |

### 2.3 グループ別内訳

| Group | INDIV_OK | SAMPLED | INFERRED | TRULY_UNREV | 合計 |
|-------|----------|---------|----------|-------------|------|
| A | 196 | 786 | 12482 | 25620 | 39084 |
| F | - | - | - | 5544 | 5544 |
| G | - | - | - | 1657 | 1657 |
| H | - | - | - | 69 | 69 |

---

## 3. Group A — Tier 別詳細（39,084件）

### 3.1 Tier 定義と監査状況

| Tier | 頻度帯 | Group A strongs | UNREVIEWED tokens | 監査状況 | 実施 Phase |
|------|--------|----------------|-------------------|---------|-----------|
| 1 | ≥200 tokens | 20 | 8700 | Phase 4e 20件サンプル監査済み | 4e |
| 2 | 100-199 tokens | 36 | 4764 | Phase 4f 12-15件サンプル監査済み（G863/G1210/G2919は全件確認） | 4f/4g/4h |
| 3 | 50-99 tokens | 79 | 5548 | 未監査 | — |
| 4 | 20-49 tokens | 212 | 6534 | 未監査 | — |
| 5 | 10-19 tokens | 347 | 4585 | 未監査 | — |
| 6 | 5-9 tokens | 591 | 3895 | 未監査（全件スキャン対象だったが実監査なし） | — |
| 7 | 1-4 tokens | 2910 | 5058 | 未監査（全件スキャン対象だったが実監査なし） | — |

### 3.2 Tier 別監査根拠詳細

| Tier | INDIV_OK | SAMPLED | INFERRED | TRULY_UNREV | 合計 |
|------|----------|---------|----------|-------------|------|
| 1 | - | 376 | 8324 | - | 8700 |
| 2 | 196 | 410 | 4158 | - | 4764 |
| 3 | - | - | - | 5548 | 5548 |
| 4 | - | - | - | 6534 | 6534 |
| 5 | - | - | - | 4585 | 4585 |
| 6 | - | - | - | 3895 | 3895 |
| 7 | - | - | - | 5058 | 5058 |

### 3.3 重要な個別 Strong の確認状況

#### Tier 1（20 Strong, Phase 4e サンプル監査済み）

Phase 4e では各 Strong から 20 件のサンプルを監査した。
総 token 数の内 **20 件のみ**がサンプル済みで、残りは **Strong 単位の推定** (SAMPLED_INFERRED)。

**注意:** Phase 4e のサンプルでいくつかの REVISION_CANDIDATE が発見された:
- auditSummary: CONFIRMED_OK=375, REVISION_CANDIDATE=18, CONTEXT_DEPENDENT=1, HOLD=6
- RC 18件は後続フェーズで実装済み (Phase 4ad 等)。残存 SAMPLED_INFERRED は OK 推定だが未証明。

Tier 1 主要 Strong（UNREVIEWED 件数上位）:

| Strong | Tier 1 Total tokens | UNREVIEWED | 監査根拠 |
|--------|---------------------|-----------|---------|
| G3004 | ? | 1164 | INFERRED=1144, SAMPLED=20 |
| G3956 | ? | 884 | INFERRED=864, SAMPLED=20 |
| G2036 | ? | 866 | INFERRED=846, SAMPLED=20 |
| G2192 | ? | 679 | INFERRED=659, SAMPLED=20 |
| G1096 | ? | 580 | INFERRED=560, SAMPLED=20 |
| G4160 | ? | 519 | INFERRED=500, SAMPLED=19 |
| G2064 | ? | 505 | INFERRED=485, SAMPLED=20 |
| G3708 | ? | 424 | INFERRED=404, SAMPLED=20 |
| G1325 | ? | 380 | INFERRED=360, SAMPLED=20 |
| G191 | ? | 361 | INFERRED=341, SAMPLED=20 |

#### Tier 2（36 Strong, Phase 4f サンプル + G863/G1210/G2919 全件確認）

**G863 ἀφίημι:** Phase 4h 全件確認 → 47件 INDIVIDUALLY_CONFIRMED_OK（"赦す" 維持）
**G1210 δέω:** Phase 4h 全件確認 → 43件 INDIVIDUALLY_CONFIRMED_OK（"縛る" 維持）
**G2919 κρίνω:** Phase 4h 全件確認 → 106件 INDIVIDUALLY_CONFIRMED_OK（"裁く" 維持）

残り 33 Strong（Phase 4f サンプルのみ）:
- Phase 4f サンプル: 12-15 件/Strong（auditSummary: CONFIRMED_OK=429, RC=20, HOLD=2）
- RC 20件は後続フェーズで実装済み。残存 SAMPLED_INFERRED は OK 推定だが未証明。

#### Tier 3-7（4,139 Strong — 完全未監査）

**一切の監査履歴なし。** Phase 4d dry run は計画文書であり、実際の監査は実施されていない。

Tier 3-7 は Stage 4 UNREVIEWED の最大リスク領域。

---

## 4. Group F / G / H — 未監査（7,270件）

| Group | 説明 | strongs | UNREVIEWED tokens | 監査状況 |
|-------|------|---------|-------------------|---------|
| F | pron plain（代名詞形式） | 46 | 5,544 | **完全未監査** |
| G | 関係代名詞 tilde | 3 | 1,657 | **完全未監査** |
| H | G4671 σοί | 1 | 69 | **完全未監査** |
| **合計** | | **50** | **7,270** | |

---

## 5. RETAIN_CONFIRMED 46,225件 — 根拠品質評価

Phase 4ag の RETAIN_CONFIRMED ラベルは確認の質を一律に保証しない。

| 品質区分 | 件数 | 根拠 | 評価 |
|---------|------|------|------|
| DESIGN_RULE (Group Z) | 40990 | 機能語除外設計（機能語は日本語gloss対象外） | **十分** — 設計上の除外 |
| ALL_INDIVIDUALLY_CONFIRMED (C+E) | 2636 | Phase 4c / Phase 4a 全件個別確認 | **十分** — 全件確認済み |
| PHASE4B_AUDITED (Group D) | 281 | Phase 4b 全対象 293 件（G756除く）審査 | **良好** — 全件審査・RC 実装済み |
| GROUP_RULE_INFERRED (Group B) | 2318 | εἰμί 述語構造・誤用 51件実装後の残存形 | **推定** — 個別確認なし・構造規則のみ |

**重要:** Group B OK（2,318件）は「εἰμί 述語の正常用法」という構造規則で RETAIN としているが、個別 token の Japanese 値を 1 件ずつ確認したわけではない。
Group B のリスクは低いとみられるが、厳密には SAMPLED_INFERRED と同等。

---

## 6. 次フェーズ 監査計画

### 6.1 推奨優先順位

| 優先度 | 対象 | 件数 | 理由 |
|--------|------|------|------|
| **1** | INDIVIDUALLY_CONFIRMED_OK の正式承認 | 196 | Phase 4h 済み・低コストで RETAIN_CONFIRMED 昇格可能 |
| **2** | Group A Tier 2 残存 SAMPLED_INFERRED (G863/G1210/G2919 除く) | 4158 | 高頻度語・RC 解決済み・low-risk |
| **3** | Group A Tier 1 残存 SAMPLED_INFERRED | 8324 | 高頻度語・サンプル実施済み・RC 解決済み |
| **4** | Group H（G4671 σοί） | 69 | 1 Strong・全件確認可能 |
| **5** | Group G（関係代名詞 tilde）| 1,657 | 3 Strong |
| **6** | Group B OK 再確認サンプル | 2,318 | GROUP_RULE_INFERREDの品質向上 |
| **7** | Group F（代名詞 plain） | 5,544 | 46 Strong・代名詞固有の複雑さ |
| **8** | Group A Tier 3-5 | 16667 | 中頻度語・層化サンプリング推奨 |
| **9** | Group A Tier 6-7 | 8953 | 低頻度語・多数 Strong・全件スキャン可 |

### 6.2 各作業単位の詳細

---

#### Unit 1 — Phase 4h 確認済み 196件の正式 RETAIN_CONFIRMED 昇格（4ai）

| 項目 | 内容 |
|------|------|
| 対象 | G863(47) + G1210(43) + G2919(106) の UNREVIEWED 196件 |
| 監査方法 | Phase 4h エビデンスの確認（監査再実行不要）→ state 更新のみ |
| 判定基準 | changeNeeded=false が Phase 4h に記録済みであること |
| 成果物 | stage4-phase4ag-residual-inventory.json の 196件を RETAIN_CONFIRMED に更新 |
| 合格条件 | 更新後 UNREVIEWED=46,158、RETAIN_CONFIRMED=46,421、合計=92,952 |
| リスク | なし（Phase 4h の全件照合エビデンスあり） |
| 優先度 | HIGH — エビデンス完備・ゼロコスト実施 |

---

#### Unit 2 — Group A Tier 2 残存 SAMPLED_INFERRED の一括確認（4ai or 4aj）

| 項目 | 内容 |
|------|------|
| 対象 | Tier 2 (33 Strong, G863/G1210/G2919 除く) SAMPLED_INFERRED 4158件 |
| 監査方法 | Phase 4f 未サンプル分を tier2-remaining として全件照合（全 Strong で RC なし or RC 解決済みなら一括 OK） |
| 判定基準 | Phase 4f サンプル OK 率 ≥ 95%、かつ RC がすべて実装済みであること |
| 成果物 | tier2-remaining-audit.json + 実装不要確認レポート |
| 合格条件 | RETAIN_CONFIRMED 昇格 or 新規 RC 発見 → 別フェーズ実装 |
| リスク | 低（Phase 4f で既に RC 20件は解決済み、残存は CONFIRMED_OK 推定） |
| 優先度 | MEDIUM-HIGH |

---

#### Unit 3 — Group A Tier 1 残存 SAMPLED_INFERRED の一括確認

| 項目 | 内容 |
|------|------|
| 対象 | Tier 1 (20 Strong) SAMPLED_INFERRED 8324件 |
| 監査方法 | Phase 4e 未サンプル分を層化サンプリングで追加確認 or 全件照合 |
| 判定基準 | Phase 4e RC (18件) がすべて実装済みの Strong は一括 OK。未解決 RC のある Strong は Strong 単位の判定 |
| 成果物 | tier1-remaining-audit.json |
| 合格条件 | 未解決 RC ゼロ確認、または新規 RC 追加実装 |
| リスク | 中（G2983/G3056/G3762/G4160/G4183 は Phase 4ad 済み、G1520 は HOLD_DQ） |
| 優先度 | MEDIUM |

---

#### Unit 4 — Group H（G4671 σοί, 69件）全件確認

| 項目 | 内容 |
|------|------|
| 対象 | Group H 69件、Strong = G4671 |
| 監査方法 | 全件照合（69件は少量） |
| 判定基準 | σοί（あなたに）の Japanese "あなた" が文脈的に妥当か全件確認 |
| 成果物 | group-h-audit.json |
| 合格条件 | RETAIN_CONFIRMED or RC 発見 → 実装 |
| リスク | 低（代名詞の Japanese 値は比較的安定） |
| 優先度 | MEDIUM（件数が少ないため低コスト） |

---

#### Unit 5 — Group G（関係代名詞 tilde, 1,657件）

| 項目 | 内容 |
|------|------|
| 対象 | Group G 1,657件、3 Strong |
| 監査方法 | 各 Strong から層化サンプリング（20-30件/Strong）→ RC 発見率で全件方針決定 |
| 判定基準 | RC 発見率 < 5% → SAMPLED_INFERRED RETAIN。RC ≥ 5% → 追加実装フェーズ |
| 成果物 | group-g-audit.json |
| 合格条件 | 全 3 Strong の方針確定 |
| リスク | 中（関係代名詞の "〜もの・こと" は文脈依存が多い可能性） |
| 優先度 | MEDIUM |

---

#### Unit 6 — Group B OK サンプル再確認（品質向上）

| 項目 | 内容 |
|------|------|
| 対象 | Group B OK 2,318件（εἰμί 述語・正常形） |
| 監査方法 | 層化サンプリング（各 Strong から 10-15件、計 100件程度） |
| 判定基準 | εἰμί 述語の Japanese "〜である"/"〜ある" が文脈的に正しいか確認 |
| 成果物 | group-b-ok-sample-audit.json |
| 合格条件 | RC 発見率 < 2% → 全件 GROUP_RULE_INFERRED を RETAIN 昇格 |
| リスク | 低（GROUP_RULE_INFERRED は構造的に正しいと考えられるが未証明） |
| 優先度 | LOW-MEDIUM（RC 発見リスクが低い） |

---

#### Unit 7 — Group F（代名詞 plain, 5,544件）

| 項目 | 内容 |
|------|------|
| 対象 | Group F 5,544件、46 Strong |
| 監査方法 | 各 Strong から層化サンプリング（件数に応じて 10-20件） |
| 判定基準 | 代名詞の Japanese 値（私・あなた・彼・それ 等）が一貫しているか |
| 成果物 | group-f-audit.json |
| 合格条件 | RC 発見率 < 5%、Strong 単位で方針確定 |
| リスク | 中（代名詞は数・格変化で日本語訳が変わるケースがある） |
| 優先度 | MEDIUM |

---

#### Unit 8 — Group A Tier 3-5（中頻度語 16,667件）

| 項目 | 内容 |
|------|------|
| 対象 | Tier 3-5 合計 16667件、638 Strong |
| 監査方法 | 層化サンプリング（morph zone 別）: Tier 3 は 15件/Strong、Tier 4-5 は 10件/Strong |
| 判定基準 | RC 率 < 5% / Strong → SAMPLED_INFERRED RETAIN。RC ≥ 5% → 実装候補 |
| 成果物 | tier3-5-audit.json |
| 合格条件 | 全 638 Strong の方針確定（RETAIN or RC 実装） |
| リスク | 高（全く未監査・RC がどの程度あるか不明） |
| 優先度 | MEDIUM（量が多い・リスク未知） |

---

#### Unit 9 — Group A Tier 6-7（低頻度語 8,953件）

| 項目 | 内容 |
|------|------|
| 対象 | Tier 6-7 合計 8953件、3,501 Strong |
| 監査方法 | 低頻度のため全件スキャン可（Tier 7 は 1-4件/Strong）。日本語値のパターンで一括判定 |
| 判定基準 | 現在の Japanese 値が RETAIN に値するか（主に "〜である" 誤用の有無） |
| 成果物 | tier6-7-scan.json |
| 合格条件 | 全 Strong の RETAIN/RC 分類完了 |
| リスク | 中（量は多いが 1-9件/Strong なので個別確認コストは低い） |
| 優先度 | LOW（低頻度語の誤訳が与える影響は相対的に小さい） |

---

## 7. 整合性チェック

| チェック | 期待値 | 実測値 | 判定 |
|---------|--------|--------|------|
| UNREVIEWED 総件数 | 46,354 | 46354 | ✓ PASS |
| 監査根拠別合計 = 46,354 | 46,354 | 46354 | ✓ PASS |
| Group A 合計 | 39,084 | 39084 | ✓ PASS |
| Group F+G+H 合計 | 7,270 | 7270 | ✓ PASS |

**Phase 4ah: PASS**
