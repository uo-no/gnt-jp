# Stage 4 Phase 4i — G1210 δέω 保留事項整理

**Phase**: 4i  
**作成日**: 2026-11-01  
**Strong**: G1210 δέω  
**現在 `ja`**: 縛る（全 138件）  
**位置付け**: 今回変更なし。判断材料の整理のみ。

---

## 1. 問題の全体像

bible_data は G1210 (δέω = 縛る) に、語根の異なる3種類の語形を登録している。

| 分類 | 語根 | Strong標準 | 件数 | 現在 `ja` | 問題 |
|------|------|-----------|------|-----------|------|
| **deo-bind** | δέω (縛る) | G1210 ✓ | 43 | 縛る | 正確 |
| **dei-necessity** | δεῖ (〜しなければならない) | G1163 が標準 | 85 | 縛る | 語義エラー |
| **deom-hold** | δέομαι (求める・祈る) | G1189 が標準 | 10 | 縛る | 語義エラー + Strong 誤割当 |
| **合計** | | | **138** | | |

---

## 2. 問題 A: dei-necessity 85件（主問題）

### 2.1 問題の内容

bible_data には G1210 として 85件の δεῖ 形（must/ought/necessary/have to）が登録されており、`japanese = 縛る` となっている。

δεῖ は「〜しなければならない」という義務・必要性を表す不人称動詞であり、`縛る`（to bind/tie）とは意味的に正反対ではないが、読者に義務の構造を全く伝えない。

### 2.2 典型形と形態コード

| 形 | morph | 件数（概算） | 例 |
|----|-------|------------|-----|
| δεῖ | V-PAI-3S | ~70 | JHN 3:7 "you must be born again" |
| δεῖν | V-PAN | ~8 | LUK 24:26 "was it not necessary..." |
| δέῃ | V-PAS-3S | 2 | MAT 26:35 "even if I must die" |
| δέον | V-PAP-NSN | 3 | ACT 19:36 "it is necessary to be quiet" |
| δέοντα | V-PAP-APN | 1 | 1TI 5:13 "things they should not say" |

### 2.3 変更候補となる 85 refs

`stage4-phase4h-full-population-audit.json` → `populations.G1210.tokens` → `cluster === "dei-necessity"` の全件。

代表例:

| ref | 原文 | morph | en |
|-----|------|-------|----|
| JHN 3:7!8 | δεῖ | V-PAI-3S | must |
| MAT 16:21!11 | δεῖ | V-PAI-3S | must |
| LUK 4:43!13 | δεῖ | V-PAI-3S | must |
| LUK 9:22!3 | Δεῖ | V-PAI-3S | must |
| ACT 9:6!14 | δεῖ | V-PAI-3S | must |
| JHN 3:30!3 | δεῖ | V-PAI-3S | must |
| ROM 8:26!15 | δεῖ | V-PAI-3S | ought |
| HEB 2:1!3 | δεῖ | V-PAI-3S | must |
| 1CO 15:53!1 | δεῖ | V-PAI-3S | must |
| REV 4:1!23 | δεῖ | V-PAI-3S | must |

### 2.4 推奨 ja

`〜しなければならない`

理由: δεῖ の構造的意味（不人称義務表現）を直接示す。L-0 境界を守る（referent 不解決・文脈訳なし）。

### 2.5 変更前に確認が必要な事項

1. **bible_data の設計方針**: δεῖ を G1210 に含めているのは意図的か偶発的か。
   - Strong's Exhaustive Concordance では δεῖ = G1163 として独立させている。
   - 一部のデータソースは δεῖ を δέω の用法として G1210 に含める（語源的根拠あり）。
   - **この設計判断を変えずに `ja` だけを変えるか、Strong 番号も G1163 へ変更するかは、ユーザーが判断する事項。**

2. **変更後の一貫性**: G1210 が「縛る」と「〜しなければならない」の 2つの `ja` を持つ状況（Strong = 同一、意味 = 異なる）が Reading Japanese の原則に合うか。

3. **G1163 の状況**: G1163 が bible_data に存在するか、lexicon に登録されているかを確認する必要がある。存在しない場合は G1210 の `ja` 修正のみで対応。

---

## 3. 問題 B: deom-hold 10件（別問題）

### 3.1 問題の内容

以下の 10件は δέομαι（G1189 = 求める・願う・祈る）の活用形であるが、bible_data では `strong = G1210` かつ `japanese = 縛る` と登録されている。

これは:
1. **`japanese = 縛る` が意味的に完全に誤り**（δέομαι の意味は「求める」であり「縛る」ではない）
2. **`strong = G1210` も Strong's 標準と異なる**（δέομαι は G1189）

### 3.2 対象 10件

| ref | 原文 | morph | en | 正しい語根 |
|-----|------|-------|----|----------|
| MAT 9:38!1 | δεήθητε | V-AOM-2P | ask | δέομαι |
| LUK 5:12!23 | ἐδεήθη | V-API-3S | begged | δέομαι |
| LUK 8:38!1 | ἐδεῖτο | V-INI-3S | begged | δέομαι |
| LUK 9:40!2 | ἐδεήθην | V-API-1S | begged | δέομαι |
| LUK 10:2!13 | δεήθητε | V-AOM-2P | ask | δέομαι |
| LUK 22:32!3 | ἐδεήθην | V-API-1S | prayed | δέομαι |
| ACT 8:24!6 | Δεήθητε | V-AOM-2P | pray | δέομαι |
| ACT 10:2!17 | δεόμενος | V-PNP-NSM | prayed | δέομαι |
| ROM 1:10!6 | δεόμενος | V-PNP-NSM | asking | δέομαι |
| 2CO 5:20!11 | δεόμεθα | V-PNI-1P | implore | δέομαι |

### 3.3 選択肢

**選択肢 A: `token.japanese` のみ変更**  
`縛る` → `求める`（δέομαι の構造的意味）  
Strong 番号は G1210 のまま。bible_data 設計変更なし。

**選択肢 B: `strong` を G1189 へ変更**  
bible_data の `.strong` フィールドを G1210 → G1189 へ変更（10件）。  
lexicon が Strong 番号で引かれる場合は G1189 の `ja` も設定が必要。  
bible_data の設計変更を伴う。

**現時点の推奨**: 選択肢 A（`japanese` 修正のみ）を先行させる。  
Strong 番号変更は bible_data 設計に関わる判断であり、別途確認が必要。

### 3.4 推奨 ja

`求める`

---

## 4. 今回変更しない理由

G1210 の 85件・10件は以下の理由で今回（Phase 4i）では変更しない:

1. **G863 の 96件を先に確定・変更することが優先度が高い**。G863 は 67% が変更候補で影響が大きく、本 Phase のスコープとして設定されている。
2. **G1210 は bible_data の設計方針（G1163 との分離方針）の判断が先に必要**。この判断なしに `token.japanese` だけを変更しても、long-term の整合性が取れない。
3. **Phase 4i のスコープは G863 の台帳作成のみ**。

---

## 5. 次 Phase への引き継ぎ事項

| 事項 | 内容 | 必要な判断 |
|------|------|----------|
| dei-necessity 85件 | `japanese = 縛る` → `〜しなければならない` | bible_data の G1163/G1210 設計方針 |
| deom-hold 10件 | `japanese = 縛る` → `求める` | Strong 番号変更の有無 |
| G1163 の存在確認 | bible_data に G1163 が存在するか | 調査が必要 |

**G1210 変更のための必要情報（未取得）**:
1. bible_data に G1163 の strong フィールドを持つトークンが存在するか
2. `reading-engine.js` / `reading-lexicon.js` が Strong 番号でどのように lexicon を引いているか
3. G1163 に `ja` を設定する場合の `ja` 値の決定

---

*G1210 の変更実施は Phase 4j 以降にて、上記確認事項が解決された後に行う。*
