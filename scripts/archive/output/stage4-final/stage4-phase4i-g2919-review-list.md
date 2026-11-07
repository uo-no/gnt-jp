# Stage 4 Phase 4i — G2919 κρίνω decide 候補確認リスト

**Phase**: 4i  
**作成日**: 2026-11-01  
**Strong**: G2919 κρίνω  
**現在 `ja`**: 裁く（全 115件）  
**位置付け**: 今回変更なし。9件の個別再確認と注記の整理のみ。

---

## 1. 概要

Phase 4h で G2919 κρίνω の全 115件を分類した結果:

| クラスター | 件数 | 割合 | 変更方向 |
|-----------|------|------|---------|
| judicial（裁く・裁判・断罪） | 106 | 92.2% | 維持 |
| decide（決める・定める） | 9 | 7.8% | 変更候補 |

9件の decide トークンについて、個別に最終確認を行う。

---

## 2. decide候補 9件 — 個別確認

### ACT 3:13!27 κρίναντος — 境界例

| 項目 | 値 |
|------|-----|
| ref | ACT 3:13!27 |
| 原文 | κρίναντος |
| morph | V-AAP-GSM |
| en | decided |
| 文脈 | "Pilate had decided to release him" |

**判定**: `REVIEW_NEEDED`

**理由**: ピラトの判断は judicial context（裁判官の職権による判断）であるとも取れる。en=decided は個人的意思決定に近いが、ピラトの行為は裁判手続きの一部（釈放の判決）。`決める` より `裁く` の方が文脈に近い可能性がある。

**推奨**: ユーザーが文脈確認の上判断。`裁く` 維持か `決める` への変更かを決定する。

---

### ACT 20:16!1 κεκρίκει — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | ACT 20:16!1 |
| 原文 | κεκρίκει |
| morph | V-LAI-3S |
| en | decided |
| 文脈 | "Paul had decided to sail past Ephesus" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: 旅程の個人的決定。裁判文脈なし。

---

### ACT 25:25!15 ἔκρινα — 確実に decide（文脈は法的だが意味は裁定）

| 項目 | 値 |
|------|-----|
| ref | ACT 25:25!15 |
| 原文 | ἔκρινα |
| morph | V-AAI-1S |
| en | decided |
| 文脈 | "I decided to send him to Caesar" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: フェストが上訴の手続きを認める行政的決定。en=decided が「断罪・裁く」でなく「決定する」の意味。

---

### ACT 27:1!3 ἐκρίθη — 確実に decide（受動形）

| 項目 | 値 |
|------|-----|
| ref | ACT 27:1!3 |
| 原文 | ἐκρίθη |
| morph | V-API-3S |
| en | decided |
| 文脈 | "When it was decided that we should sail to Italy" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`（`決められた` / 受動形として `決まった`も可）

**理由**: 旅程の公的決定。裁判文脈なし。受動形なので `決まった`・`決められた` も可。

---

### ROM 14:13!7 κρίνατε — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | ROM 14:13!7 |
| 原文 | κρίνατε |
| morph | V-AAM-2P |
| en | decide |
| 文脈 | "decide never to put a stumbling block or hindrance in the way of a brother" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: パウロの勧告。「〜しないと決める」は個人の意志決定。命令形 (κρίνατε) が「判決を下せ」ではなく「決意しなさい」として使われている。

---

### 1CO 2:2!3 ἔκρινά — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | 1CO 2:2!3 |
| 原文 | ἔκρινά |
| morph | V-AAI-1S |
| en | decided |
| 文脈 | "I decided to know nothing among you except Jesus Christ" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: パウロの個人的な宣教方針決定。

---

### 1CO 7:37!21 κέκρικεν — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | 1CO 7:37!21 |
| 原文 | κέκρικεν |
| morph | V-RAI-3S |
| en | determined |
| 文脈 | "has determined in his own heart not to marry his betrothed" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: 個人の心中での決意・解決。en=determined → `決める`。

---

### 2CO 2:1!1 ἔκρινα — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | 2CO 2:1!1 |
| 原文 | ἔκρινα |
| morph | V-AAI-1S |
| en | made up ~ mind |
| 文脈 | "I made up my mind not to make another painful visit" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: en=made up ~ mind。旅行計画の個人的決定。

---

### TIT 3:12!16 κέκρικα — 確実に decide

| 項目 | 値 |
|------|-----|
| ref | TIT 3:12!16 |
| 原文 | κέκρικα |
| morph | V-RAI-1S |
| en | decided |
| 文脈 | "I have decided to send Artemas or Tychicus to you" |

**判定**: `APPROVED_FOR_CHANGE` → `決める`

**理由**: パウロの人事・旅程決定。

---

## 3. サマリー

| 判定 | 件数 | refs |
|------|------|------|
| APPROVED_FOR_CHANGE → `決める` | 8 | ACT 20:16, ACT 25:25, ACT 27:1, ROM 14:13, 1CO 2:2, 1CO 7:37, 2CO 2:1, TIT 3:12 |
| REVIEW_NEEDED（境界例） | 1 | ACT 3:13!27 |
| KEEP_CURRENT（`裁く`維持） | 0 | — |

**境界例 ACT 3:13!27 の判断基準**:
- en=decided を優先して `決める` に変更する場合、ピラトの釈放判断を「個人的決定」として捉える
- 釈放を judicial act（裁判官の判決）として捉える場合は `裁く` 維持
- どちらも根拠があるため、ユーザーの最終判断を要する

---

## 4. ACT 27:1 受動形の注記

ACT 27:1!3 ἐκρίθη V-API-3S en=decided は受動形。  
`決める` の受動形に相当する日本語: `決まった`・`決められた`  
Reading Japanese の原則に従い受動構造を示す場合: `決まる`（受動）

変更する場合の推奨 `ja`: `決まる`（または `決める` に統一して受動性は ja1955 等で補完）

---

## 5. 今回変更しない理由

G2919 の 9件は Phase 4i では変更しない。理由:

1. **Phase 4i のスコープは G863 の台帳作成のみ**（G2919 は今回の承認範囲外）
2. **ACT 3:13 境界例の判断がペンディング**
3. **影響規模が最小（9件）** — G863 の 96件と G1210 の 85件への対応を優先する

---

## 6. 次 Phase への引き継ぎ事項

| 事項 | 内容 | 必要な判断 |
|------|------|----------|
| decide 8件 → `決める` | ACT 20:16 等の明確な decide トークン | 低難度、承認後実施可 |
| ACT 3:13!27 境界例 | `裁く` 維持 or `決める` 変更 | ユーザー判断 |
| ACT 27:1 受動形 | `決まる` or `決める` | ユーザー判断（小差）|

---

*G2919 の変更実施は、上記確認後の Phase 4j 以降にて行う。*
