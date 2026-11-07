# Stage 4 Phase 4j — G863 独立レビュー用事前監査資料

**Phase**: 4j 前段階
**作成日**: 2026-11-01
**目的**: ChatGPT による独立訳語監査のための準備資料
**対象**: G863 ἀφίημι Phase 4i APPROVED_FOR_CHANGE 96件
**bible_data 変更**: なし

---

## 1. 照合結果サマリー

| 検証項目 | 結果 |
|---------|------|
| 台帳件数 | 96 |
| ref重複 | なし ✓ |
| 訳語案漏れ | なし ✓ |
| currentJa不一致 | なし ✓ |
| Greek form不一致 | なし ✓ |
| その他問題 | なし ✓ |

---

## 2. 独立監査サマリー

| 判定 | 件数 | 内容 |
|------|------|------|
| **ACCEPT** | **93** | 推奨訳をそのまま採用可能 |
| **REVISE** | **0** | 推奨訳の変更が必要 |
| **HOLD** | **0** | 根拠不足 |
| **DUPLICATE_REVIEW** | **3** | 複数ref間の訳語一貫性確認が必要 |
| **合計** | **96** | |


### 非ACCEPT件一覧

- **MAT 5:24!1** [DUPLICATE_REVIEW] ἄφες (V-2AAM-2S) → 提案: `去る` / 代替: `残す`  
  【Policy P1】ἄφες/ἀφῆκεν に明示的な直接目的語あり。物が「その場に残る」文脈。「去る」(主語が去る)より「残す」(目的語を残す) の方が構造的意味に近い可能性。B-leave-remaining カテゴリとの一貫性を確認。

- **JHN 4:28!1** [DUPLICATE_REVIEW] ἀφῆκεν (V-AAI-3S) → 提案: `去る` / 代替: `残す`  
  【Policy P1】ἄφες/ἀφῆκεν に明示的な直接目的語あり。物が「その場に残る」文脈。「去る」(主語が去る)より「残す」(目的語を残す) の方が構造的意味に近い可能性。B-leave-remaining カテゴリとの一貫性を確認。

- **1CO 7:13!15** [DUPLICATE_REVIEW] ἀφιέτω (V-PAM-3S) → 提案: `去らせる` / 代替: `去る（妻主語として）`  
  【Policy P2】1CO 7:13 は妻が主語 (ἀφιέτω τὸν ἄνδρα)。「去らせる」(他動詞：〜を去らせる) は夫が妻を送り出す 7:12 との対称上使用。妻が夫を「去らせる」より「去る」の方が自然な読みとなる可能性あり。7:11・7:12 と同一語 (ἀφίημι) であることを踏まえ一貫性を確認。

---

## 3. Phase 4h B分類→C分類 再確定（4件）

| ref | 原文 | morph | en | Phase 4h | Phase 4i | 推奨 ja | 確認結果 |
|-----|------|-------|-----|----------|----------|---------|----------|
| MAT 27:49!5 | Ἄφες | V-2AAM-2S | leave ~ alone | B | C | 許す | ✓ 許可文脈確認済み |
| MRK 14:6!5 | Ἄφετε | V-2AAM-2P | leave ~ alone | B | C | 許す | ✓ 許可文脈確認済み |
| MRK 15:36!13 | Ἄφετε | V-2AAM-2P | leave | B | C | 許す | ✓ 許可文脈確認済み |
| JHN 12:7!5 | Ἄφες | V-2AAM-2S | leave ~ alone | B | C | 許す | ✓ 許可文脈確認済み |

**確認根拠**: 「leave ~ alone」構文 (ἄφες/ἄφετε + 対象 + [let's see / why do you?])は allow/permit = C に相当。B (depart) ではない。

---

## 4. 訳語別横断監査

### 去る（33件）

ἀφίημι の「立ち去る・離れる・去る」用法。主語が場所・人・物事から離脱する構造を表示。
「赦す」との意味的距離は明確（許免 ≠ 離脱）。
**確認点**: 直接目的語をとる文脈（MAT 5:24, JHN 4:28 等）では「去る」（主語が去る）vs「残す」（目的語が残る）の観点からDUPLICATE_REVIEWあり。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 4:11!2 | ἀφίησιν | V-PAI-3S | left |
| MAT 4:20!4 | ἀφέντες | V-2AAP-NPM | left |
| MAT 4:22!4 | ἀφέντες | V-2AAP-NPM | left |
| MAT 5:24!1 | ἄφες | V-2AAM-2S | leave |
| MAT 8:15!7 | ἀφῆκεν | V-AAI-3S | left |
| MAT 13:36!2 | ἀφεὶς | V-2AAP-NSM | left |
| MAT 18:12!16 | ἀφήσει | V-FAI-3S | leave |
| MAT 19:27!9 | ἀφήκαμεν | V-AAI-1P | left |
| MAT 19:29!4 | ἀφῆκεν | V-AAI-3S | left |
| MAT 22:22!5 | ἀφέντες | V-2AAP-NPM | left |
| MAT 26:44!2 | ἀφεὶς | V-2AAP-NSM | leaving |
| MRK 1:18!3 | ἀφέντες | V-2AAP-NPM | left |
| MRK 1:20!6 | ἀφέντες | V-2AAP-NPM | left |
| MRK 1:31!9 | ἀφῆκεν | V-AAI-3S | left |
| MRK 4:36!2 | ἀφέντες | V-2AAP-NPM | leaving |
| MRK 8:13!2 | ἀφεὶς | V-2AAP-NSM | left |
| MRK 10:28!8 | ἀφήκαμεν | V-AAI-1P | left |
| MRK 10:29!10 | ἀφῆκεν | V-AAI-3S | left |
| MRK 12:12!18 | ἀφέντες | V-2AAP-NPM | left |
| MRK 13:34!4 | ἀφεὶς | V-2AAP-NSM | left |
| LUK 4:39!9 | ἀφῆκεν | V-AAI-3S | left |
| LUK 5:11!8 | ἀφέντες | V-2AAP-NPM | left |
| LUK 10:30!24 | ἀφέντες | V-2AAP-NPM | leaving |
| LUK 18:28!7 | ἀφέντες | V-2AAP-NPM | left |
| LUK 18:29!12 | ἀφῆκεν | V-AAI-3S | left |
| JHN 4:3!1 | ἀφῆκεν | V-AAI-3S | left |
| JHN 4:28!1 | ἀφῆκεν | V-AAI-3S | left |
| JHN 4:52!18 | ἀφῆκεν | V-AAI-3S | left |
| JHN 8:29!9 | ἀφῆκέν | V-AAI-3S | left |
| JHN 14:18!2 | ἀφήσω | V-FAI-1S | leave |
| JHN 16:28!11 | ἀφίημι | V-PAI-1S | leaving |
| ACT 14:17!5 | ἀφῆκεν | V-AAI-3S | leave |
| HEB 6:1!2 | ἀφέντες | V-2AAP-NPM | leave |

### 許す（32件）

ἀφίημι の「許可する・させる・黙認する・委ねる」用法。命令形・許可文脈が主体。
「許す」は forgive/pardon と混同されるリスクがあるが、G863の許可文脈では適切。
**確認点**: 「許す」が forgiveness に近い意味に取られないか。文脈からは区別可能。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 3:15!8 | Ἄφες | V-2AAM-2S | let it be |
| MAT 3:15!19 | ἀφίησιν | V-PAI-3S | consented |
| MAT 5:40!11 | ἄφες | V-2AAM-2S | have |
| MAT 7:4!7 | Ἄφες | V-2AAM-2S | let |
| MAT 8:22!9 | ἄφες | V-2AAM-2S | let |
| MAT 13:30!1 | ἄφετε | V-2AAM-2P | let |
| MAT 15:14!1 | ἄφετε | V-2AAM-2P | let ~ alone |
| MAT 19:14!5 | Ἄφετε | V-2AAM-2P | let |
| MAT 23:13!24 | ἀφίετε | V-PAI-2P | allow |
| MAT 27:49!5 | Ἄφες | V-2AAM-2S | leave ~ alone |
| MRK 1:34!14 | ἤφιεν | V-IAI-3S | permit |
| MRK 5:19!3 | ἀφῆκεν | V-AAI-3S | let |
| MRK 5:37!3 | ἀφῆκεν | V-AAI-3S | allowed |
| MRK 7:12!2 | ἀφίετε | V-PAI-2P | permit |
| MRK 7:27!4 | Ἄφες | V-2AAM-2S | let |
| MRK 10:14!9 | Ἄφετε | V-2AAM-2P | let |
| MRK 11:6!10 | ἀφῆκαν | V-AAI-3P | let ~ go |
| MRK 11:16!3 | ἤφιεν | V-IAI-3S | allow |
| MRK 14:6!5 | Ἄφετε | V-2AAM-2P | leave ~ alone |
| MRK 15:36!13 | Ἄφετε | V-2AAM-2P | leave |
| LUK 6:42!8 | ἄφες | V-2AAM-2S | let |
| LUK 8:51!7 | ἀφῆκεν | V-AAI-3S | allow |
| LUK 9:60!4 | Ἄφες | V-2AAM-2S | let |
| LUK 12:39!16 | ἀφῆκεν | V-AAI-3S | let |
| LUK 13:8!7 | ἄφες | V-2AAM-2S | let ~ alone |
| LUK 18:16!7 | Ἄφετε | V-2AAM-2P | let |
| JHN 11:44!24 | ἄφετε | V-2AAM-2P | let |
| JHN 11:48!2 | ἀφῶμεν | V-2AAS-1P | go on |
| JHN 12:7!5 | Ἄφες | V-2AAM-2S | leave ~ alone |
| JHN 18:8!12 | ἄφετε | V-2AAM-2P | let |
| ACT 5:38!12 | ἄφετε | V-2AAM-2P | let ~ alone |
| REV 11:9!24 | ἀφίουσιν | V-PAI-3P | allow |

### 残される（9件）

受動形 (V-PPI/V-FPI/V-APS) で「置き去りにされる・残される」意味。
終末的取り残し文脈と建物の破壊文脈の両方を含む。受動態が態を正確に表示。
**確認点**: 「残される」と「残す」の態の区別が9件全件で正確か。受動形 morph を再確認。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 23:38!2 | ἀφίεται | V-PPI-3S | left |
| MAT 24:2!15 | ἀφεθῇ | V-APS-3S | left |
| MAT 24:40!11 | ἀφίεται | V-PPI-3S | left |
| MAT 24:41!10 | ἀφίεται | V-PPI-3S | left |
| MRK 13:2!13 | ἀφεθῇ | V-APS-3S | left |
| LUK 13:35!2 | ἀφίεται | V-PPI-3S | left |
| LUK 17:34!17 | ἀφεθήσεται | V-FPI-3S | left |
| LUK 17:35!13 | ἀφεθήσεται | V-FPI-3S | left |
| LUK 21:6!9 | ἀφεθήσεται | V-FPI-3S | left |

### 残す（7件）

「[誰かを/何かを]残す」= 死後残す + 贈り物として置いていく + 否定形で残存ゼロ。
7件で subcategory: B-leave-at-death/B-leave-remaining/B-leave-behind-gift。
**確認点**: 死文脈の「残す」と「去る」の境界。死別で配偶者/子を残す場合は「残す」が適切。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 22:25!16 | ἀφῆκεν | V-AAI-3S | left |
| MRK 12:19!15 | ἀφῇ | V-2AAS-3S | leaves |
| MRK 12:20!12 | ἀφῆκεν | V-AAI-3S | left |
| MRK 12:22!5 | ἀφῆκαν | V-AAI-3P | left |
| LUK 19:44!12 | ἀφήσουσιν | V-FAI-3P | leave |
| JHN 14:27!2 | ἀφίημι | V-PAI-1S | leave |
| HEB 2:8!14 | ἀφῆκεν | V-AAI-3S | left |

### 捨てる（7件）

意図的放棄・裏切り・見捨て文脈。en=abandoned/deserted/abandoning が全件に存在。
「去る」より強い「棄て・裏切り」のニュアンスを表示。
**確認点**: JHN 16:32「わたしを一人にして行く」は捨てる？去る？ 文脈は弟子の離散。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 26:56!15 | ἀφέντες | V-2AAP-NPM | deserted |
| MRK 7:8!1 | ἀφέντες | V-2AAP-NPM | abandoning |
| MRK 14:50!2 | ἀφέντες | V-2AAP-NPM | deserted |
| JHN 10:12!18 | ἀφίησιν | V-PAI-3S | leaves |
| JHN 16:32!14 | ἀφῆτε | V-2AAS-2P | leave |
| ROM 1:27!6 | ἀφέντες | V-2AAP-NPM | abandoned |
| REV 2:4!11 | ἀφῆκες | V-AAI-2S | abandoned |

### 去らせる（3件）

1CO 7 離縁文脈。ἀφίημι = 配偶者を送り出す（離縁）。
7:11・7:12 (夫主語) と7:13 (妻主語) で同じ語を使用。
**確認点**: 7:13で妻が夫を「去らせる」は不自然ではないか（DUPLICATE_REVIEW参照）。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| 1CO 7:11!15 | ἀφιέναι | V-PAN | divorce |
| 1CO 7:12!22 | ἀφιέτω | V-PAM-3S | divorce |
| 1CO 7:13!15 | ἀφιέτω | V-PAM-3S | divorce |

### 疎かにする（2件）

MAT 23:23×2のみ。en=neglected/neglecting。律法の重要事項を「なおざりにした」文脈。
「疎かにする」は neglect = 注意・配慮が不十分な状態の維持 を表示。「去る」より精確。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 23:23!18 | ἀφήκατε | V-AAI-2P | neglected |
| MAT 23:23!36 | ἀφιέναι | V-PAN | neglecting |

### 放つ（2件）

MAT 27:50 (霊を放つ) とMRK 15:37 (声を放つ) の2件。ἀφίημι = 解き放つ・放出する。
「放つ」は emit/release の意味を表示し「赦す」との意味差を明示。
**確認点**: 「霊を放つ」と「声を放つ」で同じ「放つ」が適切か。両者とも「解き放ち」の構造。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| MAT 27:50!8 | ἀφῆκεν | V-AAI-3S | gave up |
| MRK 15:37!4 | ἀφεὶς | V-2AAP-NSM | uttered |

### 黙認する（1件）

REV 2:20のみ。en=tolerate。悪い行為を許容・黙認する文脈。
「許す」(neutral permission) より「黙認する」が負の含意を表示する点で正確。

| ref | 原文 | morph | en |
|-----|------|-------|----|
| REV 2:20!6 | ἀφεῖς | V-PAI-2S | tolerate |

---

## 5. 全96件文脈付きレビュー表

**凡例**: Current = 現在のjapanese / Proposed = 推奨 / Cat = Cluster/Subcategory / Conf = 確信度 / Audit = 独立監査結果

### MAT（30件）

#### MAT 3:15!8

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | ἀποκριθεὶς δὲ ὁ Ἰησοῦς εἶπεν πρὸς αὐτόν Ἄφες ἄρτι οὕτως γὰρ πρέπον ἐστὶν ἡμῖν πλ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες V-2AAM-2S en=let it be. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let it be。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MAT 3:15!19

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίησιν |
| **Morph** | V-PAI-3S |
| **Context (verse)** | ἀποκριθεὶς δὲ ὁ Ἰησοῦς εἶπεν πρὸς αὐτόν Ἄφες ἄρτι οὕτως γὰρ πρέπον ἐστὶν ἡμῖν πλ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφίησιν V-PAI-3S en=consented. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowan |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=consented。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 ἀφίησιν en=consented = "then he permitted/allowed." 許す ✓ |

#### MAT 4:11!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίησιν |
| **Morph** | V-PAI-3S |
| **Context (verse)** | τότε ἀφίησιν αὐτὸν ὁ διάβολος καὶ ἰδοὺ ἄγγελοι προσῆλθον καὶ διηκόνουν αὐτῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφίησιν V-PAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MAT 4:20!4

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | οἱ δὲ εὐθέως ἀφέντες τὰ δίκτυα ἠκολούθησαν αὐτῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MAT 4:22!4

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | οἱ δὲ εὐθέως ἀφέντες τὸ πλοῖον καὶ τὸν πατέρα αὐτῶν ἠκολούθησαν αὐτῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MAT 5:24!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | ἄφες ἐκεῖ τὸ δῶρόν σου ἔμπροσθεν τοῦ θυσιαστηρίου καὶ ὕπαγε πρῶτον διαλλάγηθι τῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἄφες V-2AAM-2S en=leave. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **DUPLICATE_REVIEW** |
| **Review point** | 【Policy P1】ἄφες/ἀφῆκεν に明示的な直接目的語あり。物が「その場に残る」文脈。「去る」(主語が去る)より「残す」(目的語を残す) の方が構造的意味に近い可能性。B-leave-remaining カテゴリとの一貫性を確認。 |
| **Alternative** | 残す |

#### MAT 5:40!11

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | καὶ τῷ θέλοντί σοι κριθῆναι καὶ τὸν χιτῶνά σου λαβεῖν ἄφες αὐτῷ καὶ τὸ ἱμάτιον... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφες V-2AAM-2S en=have. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=have。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MAT 7:4!7

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | ἢ πῶς ἐρεῖς τῷ ἀδελφῷ σου Ἄφες ἐκβάλω τὸ κάρφος ἐκ τοῦ ὀφθαλμοῦ σου καὶ ἰδοὺ ἡ δ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες V-2AAM-2S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sense |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MAT 8:15!7

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ ἥψατο τῆς χειρὸς αὐτῆς καὶ ἀφῆκεν αὐτὴν ὁ πυρετός καὶ ἠγέρθη καὶ διηκόνει αὐ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 病気が去る用法（主語が熱/病気）。去る = 離れる ✓ |

#### MAT 8:22!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | ὁ δὲ Ἰησοῦς λέγει αὐτῷ Ἀκολούθει μοι καὶ ἄφες τοὺς νεκροὺς θάψαι τοὺς ἑαυτῶν νεκ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφες V-2AAM-2S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sense |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 「死人に死人を葬らせよ」= 許可命令。許す ✓ |

#### MAT 13:30!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ἄφετε συναυξάνεσθαι ἀμφότερα μέχρι τοῦ θερισμοῦ καὶ ἐν καιρῷ τοῦ θερισμοῦ ἐρῶ το... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MAT 13:36!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεὶς |
| **Morph** | V-2AAP-NSM |
| **Context (verse)** | Τότε ἀφεὶς τοὺς ὄχλους ἦλθεν εἰς τὴν οἰκίαν καὶ προσῆλθον αὐτῷ οἱ μαθηταὶ αὐτοῦ ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφεὶς V-2AAP-NSM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MAT 15:14!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ἄφετε αὐτούς τυφλοί εἰσιν ὁδηγοί τυφλῶν τυφλὸς δὲ τυφλὸν ἐὰν ὁδηγῇ ἀμφότεροι εἰς... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφετε V-2AAM-2P en=let ~ alone. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowa |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let ~ alone。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MAT 18:12!16

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήσει |
| **Morph** | V-FAI-3S |
| **Context (verse)** | τί ὑμῖν δοκεῖ ἐὰν γένηταί τινι ἀνθρώπῳ ἑκατὸν πρόβατα καὶ πλανηθῇ ἓν ἐξ αὐτῶν οὐ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφήσει V-FAI-3S en=leave. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leave。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 |

#### MAT 19:14!5

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ὁ δὲ Ἰησοῦς εἶπεν Ἄφετε τὰ παιδία καὶ μὴ κωλύετε αὐτὰ ἐλθεῖν πρός με τῶν γὰρ τοι... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 「子どもたちを来させなさい」= 許可命令。許す ✓ |

#### MAT 19:27!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήκαμεν |
| **Morph** | V-AAI-1P |
| **Context (verse)** | Τότε ἀποκριθεὶς ὁ Πέτρος εἶπεν αὐτῷ Ἰδοὺ ἡμεῖς ἀφήκαμεν πάντα καὶ ἠκολουθήσαμέν ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφήκαμεν V-AAI-1P en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MAT 19:29!4

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ πᾶς ὅστις ἀφῆκεν οἰκίας ἢ ἀδελφοὺς ἢ ἀδελφὰς ἢ πατέρα ἢ μητέρα ἢ γυναῖκα ἢ τ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MAT 22:22!5

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ ἀκούσαντες ἐθαύμασαν καὶ ἀφέντες αὐτὸν ἀπῆλθαν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MAT 22:25!16

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἦσαν δὲ παρ ἡμῖν ἑπτὰ ἀδελφοί καὶ ὁ πρῶτος γήμας ἐτελεύτησεν καὶ μὴ ἔχων σπέρμα ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-at-death |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. "Died, leaving his wife to his brother." = left behind at death. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 死後に〜を残す文脈 (en=left)。「残す」は「去る」より「死後に[配偶者・子孫を]残す」意味を直接表示。「赦す」との意味的距離も明確。 |

#### MAT 23:13!24

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίετε |
| **Morph** | V-PAI-2P |
| **Context (verse)** | Οὐαὶ δὲ ὑμῖν γραμματεῖς καὶ Φαρισαῖοι ὑποκριταί ὅτι κλείετε τὴν βασιλείαν τῶν οὐ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφίετε V-PAI-2P en=allow. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance se |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=allow。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 否定形で許可しない・させない文脈。許す ✓ |

#### MAT 23:23!18

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήκατε |
| **Morph** | V-AAI-2P |
| **Context (verse)** | Οὐαὶ ὑμῖν γραμματεῖς καὶ Φαρισαῖοι ὑποκριταί ὅτι ἀποδεκατοῦτε τὸ ἡδύοσμον καὶ τὸ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **疎かにする** |
| **Category** | B / B-neglect |
| **Rationale** | ἀφήκατε V-AAI-2P en=neglected. "You have neglected the weightier matters of the law." ἀφίημι = leave aside/neglect. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=neglected。MAT 23:23文脈：律法の重要な事柄をなおざりにする。「疎かにする」は neglect/leave aside の意味を正確に表示。 |

#### MAT 23:23!36

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφιέναι |
| **Morph** | V-PAN |
| **Context (verse)** | Οὐαὶ ὑμῖν γραμματεῖς καὶ Φαρισαῖοι ὑποκριταί ὅτι ἀποδεκατοῦτε τὸ ἡδύοσμον καὶ τὸ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **疎かにする** |
| **Category** | B / B-neglect |
| **Rationale** | ἀφιέναι V-PAN en=neglecting. "Without neglecting the others." Same passage as MAT 23:23!18. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=neglecting。MAT 23:23文脈：律法の重要な事柄をなおざりにする。「疎かにする」は neglect/leave aside の意味を正確に表示。 |

#### MAT 23:38!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίεται |
| **Morph** | V-PPI-3S |
| **Context (verse)** | ἰδοὺ ἀφίεται ὑμῖν ὁ οἶκος ὑμῶν ἔρημος... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφίεται V-PPI-3S en=left. "Your house is left desolate." Passive: [your house] is left/abandoned. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-PPI-3S)。「あなたの家は荒れ果てたまま残される」。ἀφίεται/ἀφίεται は放置・捨てられた状態を示す。「残される」は受動的放置を表す。 |

#### MAT 24:2!15

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεθῇ |
| **Morph** | V-APS-3S |
| **Context (verse)** | ὁ δὲ ἀποκριθεὶς εἶπεν αὐτοῖς Οὐ βλέπετε ταῦτα πάντα ἀμὴν λέγω ὑμῖν οὐ μὴ ἀφεθῇ ὧ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφεθῇ V-APS-3S en=left. "Not one stone will be left on another." Passive: [stone] not left/remaining. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-APS-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### MAT 24:40!11

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίεται |
| **Morph** | V-PPI-3S |
| **Context (verse)** | τότε δύο ἔσονται ἐν τῷ ἀγρῷ εἷς παραλαμβάνεται καὶ εἷς ἀφίεται... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφίεται V-PPI-3S en=left. "One will be taken and one will be left." Eschatological passive: left behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-PPI-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### MAT 24:41!10

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίεται |
| **Morph** | V-PPI-3S |
| **Context (verse)** | δύο ἀλήθουσαι ἐν τῷ μύλῳ μία παραλαμβάνεται καὶ μία ἀφίεται... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφίεται V-PPI-3S en=left. "One will be taken and one will be left." Eschatological passive: left behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-PPI-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### MAT 26:44!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεὶς |
| **Morph** | V-2AAP-NSM |
| **Context (verse)** | καὶ ἀφεὶς αὐτοὺς πάλιν ἀπελθὼν προσηύξατο ἐκ τρίτου τὸν αὐτὸν λόγον εἰπὼν πάλιν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφεὶς V-2AAP-NSM en=leaving. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leaving。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MAT 26:56!15

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | τοῦτο δὲ ὅλον γέγονεν ἵνα πληρωθῶσιν αἱ γραφαὶ τῶν προφητῶν τότε οἱ μαθηταὶ πάντ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφέντες V-2AAP-NPM en=deserted. "All the disciples deserted him and fled." ἀφίημι = forsake/abandon. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=deserted。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### MAT 27:49!5 ★B→C

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | οἱ δὲ λοιποὶ ἔλεγον Ἄφες ἴδωμεν εἰ ἔρχεται Ἠλίας σώσων αὐτόν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες ἴδωμεν = "let us see / wait and see." Imperative of ἀφίημι = allow/let. Context: bystanders saying "let him be, let |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 【B→C再確定済み】「leave ~ alone / let be」= C (allow/let). `許す` で正確。 |

#### MAT 27:50!8

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ὁ δὲ Ἰησοῦς πάλιν κράξας φωνῇ μεγάλῃ ἀφῆκεν τὸ πνεῦμα... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **放つ** |
| **Category** | B / B-release-spirit |
| **Rationale** | ἀφῆκεν τὸ πνεῦμα = "released his spirit." ἀφίημι = to release/let go. 赦す (forgive) ≠ release (spirit). 放つ = emit/release |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | ἀφῆκεν τὸ πνεῦμα = "released his spirit." 霊を解き放つ・霊が離れる。「赦す」でなく「放つ」が構造的意味を明示。JA1955: 「霊をわたしてしまわれた」参照。 |

### MRK（26件）

#### MRK 1:18!3

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ εὐθὺς ἀφέντες τὰ δίκτυα ἠκολούθησαν αὐτῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MRK 1:20!6

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ εὐθὺς ἐκάλεσεν αὐτούς καὶ ἀφέντες τὸν πατέρα αὐτῶν Ζεβεδαῖον ἐν τῷ πλοίῳ μετ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### MRK 1:31!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ προσελθὼν ἤγειρεν αὐτὴν κρατήσας τῆς χειρός καὶ ἀφῆκεν αὐτὴν ὁ πυρετός καὶ δ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 病気が去る用法（主語が熱/病気）。去る = 離れる ✓ |

#### MRK 1:34!14

| 項目 | 内容 |
|------|------|
| **Greek** | ἤφιεν |
| **Morph** | V-IAI-3S |
| **Context (verse)** | καὶ ἐθεράπευσεν πολλοὺς κακῶς ἔχοντας ποικίλαις νόσοις καὶ δαιμόνια πολλὰ ἐξέβαλ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἤφιεν V-IAI-3S en=permit. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance se |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=permit。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 ἤφιεν en=permit = "would not permit the demons." 否定形で許可しない意。許す ✓ |

#### MRK 4:36!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ ἀφέντες τὸν ὄχλον παραλαμβάνουσιν αὐτὸν ὡς ἦν ἐν τῷ πλοίῳ καὶ ἄλλα πλοῖα ἦν ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=leaving. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leaving。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MRK 5:19!3

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ οὐκ ἀφῆκεν αὐτόν ἀλλὰ λέγει αὐτῷ Ὕπαγε εἰς τὸν οἶκόν σου πρὸς τοὺς σούς καὶ ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῆκεν V-AAI-3S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 否定形で許可しない・させない文脈。許す ✓ |

#### MRK 5:37!3

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ οὐκ ἀφῆκεν οὐδένα μετ αὐτοῦ συνακολουθῆσαι εἰ μὴ τὸν Πέτρον καὶ Ἰάκωβον καὶ ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῆκεν V-AAI-3S en=allowed. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance  |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=allowed。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 否定形で許可しない・させない文脈。許す ✓ |

#### MRK 7:8!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | ἀφέντες τὴν ἐντολὴν τοῦ θεοῦ κρατεῖτε τὴν παράδοσιν τῶν ἀνθρώπων... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφέντες V-2AAP-NPM en=abandoning. "Abandoning the commandment of God." ἀφίημι = leave behind/abandon. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=abandoning。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### MRK 7:12!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίετε |
| **Morph** | V-PAI-2P |
| **Context (verse)** | οὐκέτι ἀφίετε αὐτὸν οὐδὲν ποιῆσαι τῷ πατρὶ ἢ τῇ μητρί... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφίετε V-PAI-2P en=permit. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance s |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=permit。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 否定形で許可しない・させない文脈。許す ✓ |

#### MRK 7:27!4

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | καὶ ἔλεγεν αὐτῇ Ἄφες πρῶτον χορτασθῆναι τὰ τέκνα οὐ γάρ καλόν ἐστιν λαβεῖν τὸν ἄ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες V-2AAM-2S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sense |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MRK 8:13!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεὶς |
| **Morph** | V-2AAP-NSM |
| **Context (verse)** | καὶ ἀφεὶς αὐτοὺς πάλιν ἐμβὰς ἀπῆλθεν εἰς τὸ πέραν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφεὶς V-2AAP-NSM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MRK 10:14!9

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ἰδὼν δὲ ὁ Ἰησοῦς ἠγανάκτησεν καὶ εἶπεν αὐτοῖς Ἄφετε τὰ παιδία ἔρχεσθαι πρός με μ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 「子どもたちを来させなさい」= 許可命令。許す ✓ |

#### MRK 10:28!8

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήκαμεν |
| **Morph** | V-AAI-1P |
| **Context (verse)** | Ἤρξατο λέγειν ὁ Πέτρος αὐτῷ Ἰδοὺ ἡμεῖς ἀφήκαμεν πάντα καὶ ἠκολουθήκαμέν σοι... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφήκαμεν V-AAI-1P en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 |

#### MRK 10:29!10

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἔφη ὁ Ἰησοῦς Ἀμὴν λέγω ὑμῖν οὐδείς ἐστιν ὃς ἀφῆκεν οἰκίαν ἢ ἀδελφοὺς ἢ ἀδελφὰς ἢ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 |

#### MRK 11:6!10

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκαν |
| **Morph** | V-AAI-3P |
| **Context (verse)** | οἱ δὲ εἶπαν αὐτοῖς καθὼς εἶπεν ὁ Ἰησοῦς καὶ ἀφῆκαν αὐτούς... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῆκαν V-AAI-3P en=let ~ go. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let ~ go。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MRK 11:16!3

| 項目 | 内容 |
|------|------|
| **Greek** | ἤφιεν |
| **Morph** | V-IAI-3S |
| **Context (verse)** | καὶ οὐκ ἤφιεν ἵνα τις διενέγκῃ σκεῦος διὰ τοῦ ἱεροῦ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἤφιεν V-IAI-3S en=allow. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sen |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=allow。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### MRK 12:12!18

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | Καὶ ἐζήτουν αὐτὸν κρατῆσαι καὶ ἐφοβήθησαν τὸν ὄχλον ἔγνωσαν γὰρ ὅτι πρὸς αὐτοὺς ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MRK 12:19!15

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῇ |
| **Morph** | V-2AAS-3S |
| **Context (verse)** | Διδάσκαλε Μωϋσῆς ἔγραψεν ἡμῖν ὅτι ἐάν τινος ἀδελφὸς ἀποθάνῃ καὶ καταλίπῃ γυναῖκα... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-at-death |
| **Rationale** | ἀφῇ V-2AAS-3S en=leaves. "If a man's brother dies and leaves a wife." = leaves behind widow at death. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 死後に〜を残す文脈 (en=leaves)。「残す」は「去る」より「死後に[配偶者・子孫を]残す」意味を直接表示。「赦す」との意味的距離も明確。 |

#### MRK 12:20!12

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἑπτὰ ἀδελφοὶ ἦσαν καὶ ὁ πρῶτος ἔλαβεν γυναῖκα καὶ ἀποθνῄσκων οὐκ ἀφῆκεν σπέρμα... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-at-death |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. "Died and left no children." = died leaving no offspring. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 死後に〜を残す文脈 (en=left)。「残す」は「去る」より「死後に[配偶者・子孫を]残す」意味を直接表示。「赦す」との意味的距離も明確。 |

#### MRK 12:22!5

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκαν |
| **Morph** | V-AAI-3P |
| **Context (verse)** | καὶ οἱ ἑπτὰ οὐκ ἀφῆκαν σπέρμα ἔσχατον πάντων καὶ ἡ γυνὴ ἀπέθανεν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-at-death |
| **Rationale** | ἀφῆκαν V-AAI-3P en=left. "All seven left no children and died." = died without leaving offspring. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 死後に〜を残す文脈 (en=left)。「残す」は「去る」より「死後に[配偶者・子孫を]残す」意味を直接表示。「赦す」との意味的距離も明確。 |

#### MRK 13:2!13

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεθῇ |
| **Morph** | V-APS-3S |
| **Context (verse)** | καὶ ὁ Ἰησοῦς εἶπεν αὐτῷ Βλέπεις ταύτας τὰς μεγάλας οἰκοδομάς οὐ μὴ ἀφεθῇ ὧδε λίθ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφεθῇ V-APS-3S en=left. "Not one stone will be left on another." Parallel to MAT 24:2. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-APS-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### MRK 13:34!4

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεὶς |
| **Morph** | V-2AAP-NSM |
| **Context (verse)** | ὡς ἄνθρωπος ἀπόδημος ἀφεὶς τὴν οἰκίαν αὐτοῦ καὶ δοὺς τοῖς δούλοις αὐτοῦ τὴν ἐξου... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφεὶς V-2AAP-NSM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### MRK 14:6!5 ★B→C

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ὁ δὲ Ἰησοῦς εἶπεν Ἄφετε αὐτήν τί αὐτῇ κόπους παρέχετε καλὸν ἔργον ἠργάσατο ἐν ἐμ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφετε αὐτήν = "leave her alone / let her be." Context: Jesus rebuking those criticizing Mary. = C (allow/permit). |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 【B→C再確定済み】「leave ~ alone / let be」= C (allow/let). `許す` で正確。 |

#### MRK 14:50!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ ἀφέντες αὐτὸν ἔφυγον πάντες... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφέντες V-2AAP-NPM en=deserted. "They all deserted him and fled." ἀφίημι = forsake/abandon. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=deserted。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### MRK 15:36!13 ★B→C

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | δραμὼν δέ τις καὶ γεμίσας σπόγγον ὄξους περιθεὶς καλάμῳ ἐπότιζεν αὐτόν λέγων Ἄφε... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφετε ἴδωμεν = "let us see / wait." Same construction as MAT 27:49!5. = C (allow). |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 【B→C再確定済み】「leave ~ alone / let be」= C (allow/let). `許す` で正確。 |

#### MRK 15:37!4

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεὶς |
| **Morph** | V-2AAP-NSM |
| **Context (verse)** | ὁ δὲ Ἰησοῦς ἀφεὶς φωνὴν μεγάλην ἐξέπνευσεν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **放つ** |
| **Category** | C / C-emit |
| **Rationale** | ἀφεὶς φωνὴν V-2AAP-NSM en=uttered. "Jesus uttered a loud cry." ἀφεὶς φωνήν = let out/released a voice. 放つ = emit/release |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | ἀφεὶς φωνήν = "having emitted a voice." ἀφίημι = 放出・解き放ち。「放つ」= emit/release/let out。「赦す」でないことを明示するうえで適切。MAT 27:50 との対照も確認。 |

### LUK（16件）

#### LUK 4:39!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ ἐπιστὰς ἐπάνω αὐτῆς ἐπετίμησεν τῷ πυρετῷ καὶ ἀφῆκεν αὐτήν παραχρῆμα δὲ ἀναστ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 病気が去る用法（主語が熱/病気）。去る = 離れる ✓ |

#### LUK 5:11!8

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | καὶ καταγαγόντες τὰ πλοῖα ἐπὶ τὴν γῆν ἀφέντες πάντα ἠκολούθησαν αὐτῷ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### LUK 6:42!8

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | πῶς δύνασαι λέγειν τῷ ἀδελφῷ σου Ἀδελφέ ἄφες ἐκβάλω τὸ κάρφος τὸ ἐν τῷ ὀφθαλμῷ σ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφες V-2AAM-2S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sense |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### LUK 8:51!7

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἐλθὼν δὲ εἰς τὴν οἰκίαν οὐκ ἀφῆκεν εἰσελθεῖν τινα σὺν αὐτῷ εἰ μὴ Πέτρον καὶ Ἰωάν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῆκεν V-AAI-3S en=allow. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance se |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=allow。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 否定形で許可しない・させない文脈。許す ✓ |

#### LUK 9:60!4

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | εἶπεν δὲ αὐτῷ Ἄφες τοὺς νεκροὺς θάψαι τοὺς ἑαυτῶν νεκρούς σὺ δὲ ἀπελθὼν διάγγελλ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες V-2AAM-2S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sense |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 「死人に死人を葬らせよ」= 許可命令。許す ✓ |

#### LUK 10:30!24

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | ὑπολαβὼν δὲ ὁ Ἰησοῦς εἶπεν Ἄνθρωπός τις κατέβαινεν ἀπὸ Ἰερουσαλὴμ εἰς Ἰεριχὼ καὶ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=leaving. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leaving。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### LUK 12:39!16

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | Τοῦτο δὲ γινώσκετε ὅτι εἰ ᾔδει ὁ οἰκοδεσπότης ποίᾳ ὥρᾳ ὁ κλέπτης ἔρχεται οὐκ ἂν ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῆκεν V-AAI-3S en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### LUK 13:8!7

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | ὁ δὲ ἀποκριθεὶς λέγει αὐτῷ Κύριε ἄφες αὐτὴν καὶ τοῦτο τὸ ἔτος ἕως ὅτου σκάψω περ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφες V-2AAM-2S en=let ~ alone. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowan |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let ~ alone。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### LUK 13:35!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίεται |
| **Morph** | V-PPI-3S |
| **Context (verse)** | ἰδοὺ ἀφίεται ὑμῖν ὁ οἶκος ὑμῶν λέγω δὲ ὑμῖν οὐ μὴ ἴδητέ με ἕως ἥξει ὅτε εἴπητε Ε... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφίεται V-PPI-3S en=left. "Your house is left/forsaken." Passive: house is left desolate. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-PPI-3S)。「あなたの家は荒れ果てたまま残される」。ἀφίεται/ἀφίεται は放置・捨てられた状態を示す。「残される」は受動的放置を表す。 |

#### LUK 17:34!17

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεθήσεται |
| **Morph** | V-FPI-3S |
| **Context (verse)** | λέγω ὑμῖν ταύτῃ τῇ νυκτὶ ἔσονται δύο ἐπὶ κλίνης μιᾶς ὁ εἷς παραλημφθήσεται καὶ ὁ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφεθήσεται V-FPI-3S en=left. "The other will be left." Eschatological future passive: will be left behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-FPI-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### LUK 17:35!13

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεθήσεται |
| **Morph** | V-FPI-3S |
| **Context (verse)** | ἔσονται δύο ἀλήθουσαι ἐπὶ τὸ αὐτό ἡ μία παραλημφθήσεται ἡ δὲ ἑτέρα ἀφεθήσεται... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφεθήσεται V-FPI-3S en=left. "The other will be left." Eschatological future passive: will be left behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-FPI-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

#### LUK 18:16!7

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ὁ δὲ Ἰησοῦς προσεκαλέσατο αὐτὰ λέγων Ἄφετε τὰ παιδία ἔρχεσθαι πρός με καὶ μὴ κωλ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 「子どもたちを来させなさい」= 許可命令。許す ✓ |

#### LUK 18:28!7

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | Εἶπεν δὲ ὁ Πέτρος Ἰδοὺ ἡμεῖς ἀφέντες τὰ ἴδια ἠκολουθήσαμέν σοι... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### LUK 18:29!12

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ὁ δὲ εἶπεν αὐτοῖς Ἀμὴν λέγω ὑμῖν ὅτι οὐδείς ἐστιν ὃς ἀφῆκεν οἰκίαν ἢ γυναῖκα ἢ ἀ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 弟子が[すべて/網/家族等]を去る文脈。B-leave。去る ✓ |

#### LUK 19:44!12

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήσουσιν |
| **Morph** | V-FAI-3P |
| **Context (verse)** | καὶ ἐδαφιοῦσίν σε καὶ τὰ τέκνα σου ἐν σοί καὶ οὐκ ἀφήσουσιν λίθον ἐπὶ λίθον ἐν σ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-remaining |
| **Rationale** | ἀφήσουσιν V-FAI-3P en=leave. "They will not leave one stone upon another." = not leave remaining. 残す = leave/leave remai |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 「残す」= 否定文脈 ("not leave one stone / not leave anything [not subject]")。「石ひとつも残さない」という留保ゼロを表す構造。「残す」で正確。 |

#### LUK 21:6!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεθήσεται |
| **Morph** | V-FPI-3S |
| **Context (verse)** | Ταῦτα ἃ θεωρεῖτε ἐλεύσονται ἡμέραι ἐν αἷς οὐκ ἀφεθήσεται λίθος ἐπὶ λίθῳ ὃς οὐ κα... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残される** |
| **Category** | B / B-passive-left |
| **Rationale** | ἀφεθήσεται V-FPI-3S en=left. "Not one stone will be left." Future passive of left/remaining. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 受動形 (V-FPI-3S)。終末的「取り残される」文脈。能動形なら「残す」、受動形なら「残される」で態の区別が正確。 |

### JHN（13件）

#### JHN 4:3!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἀφῆκεν τὴν Ἰουδαίαν καὶ ἀπῆλθεν πάλιν εἰς τὴν Γαλιλαίαν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### JHN 4:28!1

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἀφῆκεν οὖν τὴν ὑδρίαν αὐτῆς ἡ γυνὴ καὶ ἀπῆλθεν εἰς τὴν πόλιν καὶ λέγει τοῖς ἀνθρ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **DUPLICATE_REVIEW** |
| **Review point** | 【Policy P1】ἄφες/ἀφῆκεν に明示的な直接目的語あり。物が「その場に残る」文脈。「去る」(主語が去る)より「残す」(目的語を残す) の方が構造的意味に近い可能性。B-leave-remaining カテゴリとの一貫性を確認。 |
| **Alternative** | 残す |

#### JHN 4:52!18

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | ἐπύθετο οὖν τὴν ὥραν παρ αὐτῶν ἐν ᾗ κομψότερον ἔσχεν εἶπαν οὖν αὐτῷ ὅτι Ἐχθὲς ὥρ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 病気が去る用法（主語が熱/病気）。去る = 離れる ✓ |

#### JHN 8:29!9

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκέν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καὶ ὁ πέμψας με μετ ἐμοῦ ἐστιν οὐκ ἀφῆκέν με μόνον ὅτι ἐγὼ τὰ ἀρεστὰ αὐτῷ ποιῶ π... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκέν V-AAI-3S en=left. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=left。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 |

#### JHN 10:12!18

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίησιν |
| **Morph** | V-PAI-3S |
| **Context (verse)** | ὁ μισθωτὸς καὶ οὐκ ὢν ποιμήν οὗ οὐκ ἔστιν τὰ πρόβατα ἴδια θεωρεῖ τὸν λύκον ἐρχόμ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφίησιν V-PAI-3S en=leaves. "The hired hand leaves the sheep and flees." = abandons the sheep in his care. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leaves。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### JHN 11:44!24

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ἐξῆλθεν ὁ τεθνηκὼς δεδεμένος τοὺς πόδας καὶ τὰς χεῖρας κειρίαις καὶ ἡ ὄψις αὐτοῦ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### JHN 11:48!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῶμεν |
| **Morph** | V-2AAS-1P |
| **Context (verse)** | ἐὰν ἀφῶμεν αὐτὸν οὕτως πάντες πιστεύσουσιν εἰς αὐτόν καὶ ἐλεύσονται οἱ Ῥωμαῖοι κ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφῶμεν V-2AAS-1P en=go on. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance s |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=go on。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### JHN 12:7!5 ★B→C

| 項目 | 内容 |
|------|------|
| **Greek** | Ἄφες |
| **Morph** | V-2AAM-2S |
| **Context (verse)** | εἶπεν οὖν ὁ Ἰησοῦς Ἄφες αὐτήν ἵνα εἰς τὴν ἡμέραν τοῦ ἐνταφιασμοῦ μου τηρήσῃ αὐτό... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | Ἄφες αὐτήν = "Leave her alone / allow her." Jesus allowing Mary's anointing act. = C (permit). |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 【B→C再確定済み】「leave ~ alone / let be」= C (allow/let). `許す` で正確。 |

#### JHN 14:18!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφήσω |
| **Morph** | V-FAI-1S |
| **Context (verse)** | Οὐκ ἀφήσω ὑμᾶς ὀρφανούς ἔρχομαι πρὸς ὑμᾶς... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφήσω V-FAI-1S en=leave. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leave。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### JHN 14:27!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίημι |
| **Morph** | V-PAI-1S |
| **Context (verse)** | εἰρήνην ἀφίημι ὑμῖν εἰρήνην τὴν ἐμὴν δίδωμι ὑμῖν οὐ καθὼς ὁ κόσμος δίδωσιν ἐγὼ δ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-behind-gift |
| **Rationale** | ἀφίημι V-PAI-1S en=leave. "Peace I leave with you." = I leave behind [as a gift] peace. 残す = leave/leave behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 「わたしはあなたがたに平和を残す」= ἀφίημι as leaving a parting gift. 「残す」は「贈り物として置いていく」意味を表し「去る」より適切。JA1955: 「わたしはあなた方に平和を残して行く」(残す + 去る 両方使用)。 |

#### JHN 16:28!11

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίημι |
| **Morph** | V-PAI-1S |
| **Context (verse)** | ἐξῆλθον ἐκ τοῦ πατρὸς καὶ ἐλήλυθα εἰς τὸν κόσμον πάλιν ἀφίημι τὸν κόσμον καὶ πορ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφίημι V-PAI-1S en=leaving. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leaving。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

#### JHN 16:32!14

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆτε |
| **Morph** | V-2AAS-2P |
| **Context (verse)** | ἰδοὺ ἔρχεται ὥρα καὶ ἐλήλυθεν ἵνα σκορπισθῆτε ἕκαστος εἰς τὰ ἴδια κἀμὲ μόνον ἀφῆ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφῆτε V-2AAS-2P en=leave. "You will leave me alone." = abandon/forsake me. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leave。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### JHN 18:8!12

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | ἀπεκρίθη Ἰησοῦς Εἶπον ὑμῖν ὅτι ἐγώ εἰμι εἰ οὖν ἐμὲ ζητεῖτε ἄφετε τούτους ὑπάγειν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφετε V-2AAM-2P en=let. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance sens |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

### ACT（2件）

#### ACT 5:38!12

| 項目 | 内容 |
|------|------|
| **Greek** | ἄφετε |
| **Morph** | V-2AAM-2P |
| **Context (verse)** | καὶ τὰ νῦν λέγω ὑμῖν ἀπόστητε ἀπὸ τῶν ἀνθρώπων τούτων καὶ ἄφετε αὐτούς ὅτι ἐὰν ᾖ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἄφετε V-2AAM-2P en=let ~ alone. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowa |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=let ~ alone。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

#### ACT 14:17!5

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | καίτοι οὐκ ἀμάρτυρον αὑτὸν ἀφῆκεν ἀγαθουργῶν οὐρανόθεν ὑμῖν ὑετοὺς διδοὺς καὶ κα... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφῆκεν V-AAI-3S en=leave. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leave。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

### ROM（1件）

#### ROM 1:27!6

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | ὁμοίως τε καὶ οἱ ἄρσενες ἀφέντες τὴν φυσικὴν χρῆσιν τῆς θηλείας ἐξεκαύθησαν ἐν τ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφέντες V-2AAP-NPM en=abandoned. "Men abandoned natural relations with women." ἀφίημι = forsake/give up. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=abandoned。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

### 1CO（3件）

#### 1CO 7:11!15

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφιέναι |
| **Morph** | V-PAN |
| **Context (verse)** | ἐὰν δὲ καὶ χωρισθῇ μενέτω ἄγαμος ἢ τῷ ἀνδρὶ καταλλαγήτω καὶ ἄνδρα γυναῖκα μὴ ἀφι... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去らせる** |
| **Category** | C / C-divorce |
| **Rationale** | ἀφιέναι V-PAN en=divorce. "The husband should not divorce his wife." ἀφίημι = send away/release (divorce). |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 1CO 7 離縁文脈。ἀφίημι = 配偶者を去らせる（離縁・送り出し）。en=divorce。「去らせる」は「夫が妻を送り出す」ユダヤ的離縁の構造を表示。「赦す」との意味距離明確。 |

#### 1CO 7:12!22

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφιέτω |
| **Morph** | V-PAM-3S |
| **Context (verse)** | Τοῖς δὲ λοιποῖς λέγω ἐγώ οὐχ ὁ κύριος εἴ τις ἀδελφὸς γυναῖκα ἔχει ἄπιστον καὶ αὕ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去らせる** |
| **Category** | C / C-divorce |
| **Rationale** | ἀφιέτω V-PAM-3S en=divorce. "He should not divorce her." ἀφίημι = release/send away. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 1CO 7 離縁文脈。ἀφίημι = 配偶者を去らせる（離縁・送り出し）。en=divorce。「去らせる」は「夫が妻を送り出す」ユダヤ的離縁の構造を表示。「赦す」との意味距離明確。 |

#### 1CO 7:13!15

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφιέτω |
| **Morph** | V-PAM-3S |
| **Context (verse)** | καὶ γυνὴ εἴ τις ἔχει ἄνδρα ἄπιστον καὶ οὗτος συνευδοκεῖ οἰκεῖν μετ αὐτῆς μὴ ἀφιέ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去らせる** |
| **Category** | C / C-divorce |
| **Rationale** | ἀφιέτω V-PAM-3S en=divorce. "She should not divorce him." ἀφίημι = release/send away. |
| **Confidence** | HIGH |
| **Audit** | **DUPLICATE_REVIEW** |
| **Review point** | 【Policy P2】1CO 7:13 は妻が主語 (ἀφιέτω τὸν ἄνδρα)。「去らせる」(他動詞：〜を去らせる) は夫が妻を送り出す 7:12 との対称上使用。妻が夫を「去らせる」より「去る」の方が自然な読みとなる可能性あり。7:11・7:12 と同一語 (ἀφίημι) であることを踏まえ一貫性を確認。 |
| **Alternative** | 去る（妻主語として） |

### HEB（2件）

#### HEB 2:8!14

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκεν |
| **Morph** | V-AAI-3S |
| **Context (verse)** | πάντα ὑπέταξας ὑποκάτω τῶν ποδῶν αὐτοῦ ἐν τῷ γὰρ ὑποτάξαι τὰ πάντα οὐδὲν ἀφῆκεν ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **残す** |
| **Category** | B / B-leave-remaining |
| **Rationale** | ἀφῆκεν V-AAI-3S en=left. "He left nothing not subject to him." = left no exception remaining. 残す = leave/leave remaining |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | 「残す」= 否定文脈 ("not leave one stone / not leave anything [not subject]")。「石ひとつも残さない」という留保ゼロを表す構造。「残す」で正確。 |

#### HEB 6:1!2

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφέντες |
| **Morph** | V-2AAP-NPM |
| **Context (verse)** | Διὸ ἀφέντες τὸν τῆς ἀρχῆς τοῦ Χριστοῦ λόγον ἐπὶ τὴν τελειότητα φερώμεθα μὴ πάλιν... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **去る** |
| **Category** | B / B-leave |
| **Rationale** | ἀφέντες V-2AAP-NPM en=leave. ἀφίημι = leave/depart. 赦す (forgive/pardon) does not represent this leave/depart sense. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=leave。ἀφίημι の離脱・立ち去り用法。「赦す」でないことを明示。 人物・イエス・船が場所・人から去る用法。去る ✓ |

### REV（3件）

#### REV 2:4!11

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφῆκες |
| **Morph** | V-AAI-2S |
| **Context (verse)** | ἀλλὰ ἔχω κατὰ σοῦ ὅτι τὴν ἀγάπην σου τὴν πρώτην ἀφῆκες... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **捨てる** |
| **Category** | B / B-abandon |
| **Rationale** | ἀφῆκες V-AAI-2S en=abandoned. "You have abandoned the love you had at first." ἀφίημι = forsake/leave behind. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=abandoned。ἀφίημι = abandon/forsake/desert。「捨てる」は「去る」より意図的放棄・裏切りの意味を明示し適切。 |

#### REV 2:20!6

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφεῖς |
| **Morph** | V-PAI-2S |
| **Context (verse)** | ἀλλὰ ἔχω κατὰ σοῦ ὅτι ἀφεῖς τὴν γυναῖκα Ἰεζάβελ ἡ λέγουσα ἑαυτὴν προφῆτιν καὶ δι... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **黙認する** |
| **Category** | C / C-tolerate |
| **Rationale** | ἀφεῖς V-PAI-2S en=tolerate. "You tolerate that woman Jezebel." ἀφίημι = permit/allow/tolerate. 黙認する = tacitly allow. |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=tolerate。ἀφεῖς = "you permit/allow/tolerate." REV 2:20 文脈：偽預言者イゼベルを黙認している。「黙認する」= tacitly permit something bad。「許す」(neutral permission)より stronger sense を表示。 |

#### REV 11:9!24

| 項目 | 内容 |
|------|------|
| **Greek** | ἀφίουσιν |
| **Morph** | V-PAI-3P |
| **Context (verse)** | καὶ βλέπουσιν ἐκ τῶν λαῶν καὶ φυλῶν καὶ γλωσσῶν καὶ ἐθνῶν τὸ πτῶμα αὐτῶν ἡμέρας ... |
| **JA1955** | (JA1955なし)... |
| **Current** | 赦す |
| **Proposed** | **許す** |
| **Category** | C / C-allow |
| **Rationale** | ἀφίουσιν V-PAI-3P en=allow. ἀφίημι = let/allow/permit. 赦す (forgive/pardon) does not represent this permission/allowance  |
| **Confidence** | HIGH |
| **Audit** | **ACCEPT** |
| **Review point** | en=allow。ἀφίημι = let/allow/permit/consent。「許す」は許可・容認・委ねる等の許可系意味を統一表示。 |

---

## 6. 独立監査全件一覧（ref順）

| ref | Proposed | Audit | Alt / Note |
|-----|----------|-------|------------|
| MAT 3:15!8 | 許す | ACCEPT | — |
| MAT 3:15!19 | 許す | ACCEPT | — |
| MAT 4:11!2 | 去る | ACCEPT | — |
| MAT 4:20!4 | 去る | ACCEPT | — |
| MAT 4:22!4 | 去る | ACCEPT | — |
| MAT 5:24!1 | 去る | DUPLICATE_REVIEW | 残す |
| MAT 5:40!11 | 許す | ACCEPT | — |
| MAT 7:4!7 | 許す | ACCEPT | — |
| MAT 8:15!7 | 去る | ACCEPT | — |
| MAT 8:22!9 | 許す | ACCEPT | — |
| MAT 13:30!1 | 許す | ACCEPT | — |
| MAT 13:36!2 | 去る | ACCEPT | — |
| MAT 15:14!1 | 許す | ACCEPT | — |
| MAT 18:12!16 | 去る | ACCEPT | — |
| MAT 19:14!5 | 許す | ACCEPT | — |
| MAT 19:27!9 | 去る | ACCEPT | — |
| MAT 19:29!4 | 去る | ACCEPT | — |
| MAT 22:22!5 | 去る | ACCEPT | — |
| MAT 22:25!16 | 残す | ACCEPT | — |
| MAT 23:13!24 | 許す | ACCEPT | — |
| MAT 23:23!18 | 疎かにする | ACCEPT | — |
| MAT 23:23!36 | 疎かにする | ACCEPT | — |
| MAT 23:38!2 | 残される | ACCEPT | — |
| MAT 24:2!15 | 残される | ACCEPT | — |
| MAT 24:40!11 | 残される | ACCEPT | — |
| MAT 24:41!10 | 残される | ACCEPT | — |
| MAT 26:44!2 | 去る | ACCEPT | — |
| MAT 26:56!15 | 捨てる | ACCEPT | — |
| MAT 27:49!5 | 許す | ACCEPT | — |
| MAT 27:50!8 | 放つ | ACCEPT | — |
| MRK 1:18!3 | 去る | ACCEPT | — |
| MRK 1:20!6 | 去る | ACCEPT | — |
| MRK 1:31!9 | 去る | ACCEPT | — |
| MRK 1:34!14 | 許す | ACCEPT | — |
| MRK 4:36!2 | 去る | ACCEPT | — |
| MRK 5:19!3 | 許す | ACCEPT | — |
| MRK 5:37!3 | 許す | ACCEPT | — |
| MRK 7:8!1 | 捨てる | ACCEPT | — |
| MRK 7:12!2 | 許す | ACCEPT | — |
| MRK 7:27!4 | 許す | ACCEPT | — |
| MRK 8:13!2 | 去る | ACCEPT | — |
| MRK 10:14!9 | 許す | ACCEPT | — |
| MRK 10:28!8 | 去る | ACCEPT | — |
| MRK 10:29!10 | 去る | ACCEPT | — |
| MRK 11:6!10 | 許す | ACCEPT | — |
| MRK 11:16!3 | 許す | ACCEPT | — |
| MRK 12:12!18 | 去る | ACCEPT | — |
| MRK 12:19!15 | 残す | ACCEPT | — |
| MRK 12:20!12 | 残す | ACCEPT | — |
| MRK 12:22!5 | 残す | ACCEPT | — |
| MRK 13:2!13 | 残される | ACCEPT | — |
| MRK 13:34!4 | 去る | ACCEPT | — |
| MRK 14:6!5 | 許す | ACCEPT | — |
| MRK 14:50!2 | 捨てる | ACCEPT | — |
| MRK 15:36!13 | 許す | ACCEPT | — |
| MRK 15:37!4 | 放つ | ACCEPT | — |
| LUK 4:39!9 | 去る | ACCEPT | — |
| LUK 5:11!8 | 去る | ACCEPT | — |
| LUK 6:42!8 | 許す | ACCEPT | — |
| LUK 8:51!7 | 許す | ACCEPT | — |
| LUK 9:60!4 | 許す | ACCEPT | — |
| LUK 10:30!24 | 去る | ACCEPT | — |
| LUK 12:39!16 | 許す | ACCEPT | — |
| LUK 13:8!7 | 許す | ACCEPT | — |
| LUK 13:35!2 | 残される | ACCEPT | — |
| LUK 17:34!17 | 残される | ACCEPT | — |
| LUK 17:35!13 | 残される | ACCEPT | — |
| LUK 18:16!7 | 許す | ACCEPT | — |
| LUK 18:28!7 | 去る | ACCEPT | — |
| LUK 18:29!12 | 去る | ACCEPT | — |
| LUK 19:44!12 | 残す | ACCEPT | — |
| LUK 21:6!9 | 残される | ACCEPT | — |
| JHN 4:3!1 | 去る | ACCEPT | — |
| JHN 4:28!1 | 去る | DUPLICATE_REVIEW | 残す |
| JHN 4:52!18 | 去る | ACCEPT | — |
| JHN 8:29!9 | 去る | ACCEPT | — |
| JHN 10:12!18 | 捨てる | ACCEPT | — |
| JHN 11:44!24 | 許す | ACCEPT | — |
| JHN 11:48!2 | 許す | ACCEPT | — |
| JHN 12:7!5 | 許す | ACCEPT | — |
| JHN 14:18!2 | 去る | ACCEPT | — |
| JHN 14:27!2 | 残す | ACCEPT | — |
| JHN 16:28!11 | 去る | ACCEPT | — |
| JHN 16:32!14 | 捨てる | ACCEPT | — |
| JHN 18:8!12 | 許す | ACCEPT | — |
| ACT 5:38!12 | 許す | ACCEPT | — |
| ACT 14:17!5 | 去る | ACCEPT | — |
| ROM 1:27!6 | 捨てる | ACCEPT | — |
| 1CO 7:11!15 | 去らせる | ACCEPT | — |
| 1CO 7:12!22 | 去らせる | ACCEPT | — |
| 1CO 7:13!15 | 去らせる | DUPLICATE_REVIEW | 去る（妻主語として） |
| HEB 2:8!14 | 残す | ACCEPT | — |
| HEB 6:1!2 | 去る | ACCEPT | — |
| REV 2:4!11 | 捨てる | ACCEPT | — |
| REV 2:20!6 | 黙認する | ACCEPT | — |
| REV 11:9!24 | 許す | ACCEPT | — |

---

## 7. 保護条件確認

- bible_data 変更: **なし** ✓
- Phase 4i 台帳・変更計画の上書き: **なし** ✓
- G1210・G2919 への変更: **なし** ✓
- commit / push / PR: **なし** ✓

*このドキュメントは ChatGPT による独立監査のための参照資料。訳語変更の実施は別途ユーザー承認後とする。*
