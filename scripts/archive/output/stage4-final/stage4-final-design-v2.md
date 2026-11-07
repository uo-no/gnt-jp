# Stage 4 最終監査設計書 v2

生成日: 2026-10-31  
前版: `stage4-final-design.md`（v1, 2026-10-31 早版）  
更新内容: G4671 Group H 設計追加、Group C 否定機能監査設計、件数差分解消、全監査群確定

---

## 1. 最終件数（確定値）

### 1.1 NT 全件区分（変更なし）

| 区分 | tokens | 検証 |
|------|--------|------|
| stage3_pool 監査済み | 28,219 | pool.json ref 照合 |
| bl_excluded (恒久 BL) | 15,883 | Strong ∈ 6-set |
| s4_excluded (σύ 主格/属格/対格/所有) | 156 | Strong ∈ {G4771,G4675,G4571,G4674} |
| ledger_approved | 148 | |
| ledger_hold | 49 | |
| ledger_taigai | 303 | |
| stage2_only (pattern) | 31 | |
| remaining (Stage 4 候補) | 92,952 | |
| **合計** | **137,741** ✅ | |

> **G4675 格の訂正**: s4_excluded セットの G4675 は **σου（属格 / genitive）** であり、「与格」ではない。`stage3-addendum-report.md` 行 19・180 に「σοί（与格）」の誤記あり（元の監査データ JSON は変更しない。報告書上の誤記として記録）。

### 1.2 remaining 92,952 の最終監査群（確定値）

token ref 単位全件走査（Missing refs = 0）による per-token 分類。

| Group | 説明 | tokens | Strongs | 監査方針 |
|-------|------|--------|---------|---------|
| **A** | 内容語 plain | **39,310** | **4,195** | Strong 単位語彙審査 + token 文脈審査（AMBIGUOUS のみ） |
| **B** | εἰμί 述語構造（tilde verb） | **2,369** | **22** | Strong 単位語義確認 + 疑問 5 件個別調査 |
| **C** | 否定副詞機能監査 | **2,494** | **2** | Strong 単位基本機能確認 + 用法別サンプル |
| **D** | その他 tilde 内容語 | **377** | **16** | Strong 単位確認 + G756 個別調査 |
| **E** | 内容語 bracket（adv） | **142** | **4** | 一括 OK 確認（構造ラベル） |
| **F** | pron plain | **5,544** | **46** | Strong 単位基本語義 + 文脈サンプル |
| **G** | pron tilde（関係代名詞） | **1,657** | **3** | Strong 単位一括確認（3 Strongs） |
| **H** | G4671 σοί（σύ 与格, Group H） | **69** | **1** | 独立 pron 監査（本文書 §5 参照） |
| **Z** | 機能語（監査対象外） | **40,990** | **139** | 除外 |
| **合計** | | **92,952** ✅ | | |

**Stage 4 総監査対象**: A+B+C+D+E+F+G+H = **51,962 tokens**, 4,289 Strongs

---

## 2. 件数差分の解消（v1 からの更新）

### 旧値 44,629 と新値 44,692 の差 +63

原因: s4content.cjs の「Strong の first-seen class による代表」設計バグ。bible_data に mixed-class Strong（同一 Strong 番号でも token によって class が異なる）が 43 件存在し、旧メソッドで誤算が生じた。

| 分類 | 旧値（s4content.cjs） | 新値（s4groups.cjs） | 差 |
|------|---------------------|-------------------|-----|
| 内容語 plain | 39,281 | **39,310** | +29 |
| 内容語 tilde | 5,348 | **5,240** | -108 |
| 内容語 bracket | 0 | **142** | +142 |
| 合計 | 44,629 | **44,692** | +63 |

主要な差分 Strong（詳細は `stage4-count-reconciliation.md` §3 参照）:
- G3756 (-80 tilde): adv + ptcl 混在 → ptcl tokens 過算
- G3361 (-91 tilde): adv + ptcl + conj 混在 → 非 adv tokens 過算
- G3754 (+79 bracket): conj 主体だが adv tokens あり → 未計上
- G3761 (+55 tilde): conj 主体だが adv tokens あり → 未計上
- G5613 (+36 bracket), G2443 (+25 bracket), G1854 (+27 plain), G3780 (+17 plain) 等

**差分は未解決要素なし**。43 Strongs の mixed-class 問題として完全説明できる。

### Strong 数の差異

| 数値 | 出典 | 定義 |
|------|------|------|
| 旧 4,211 | s4content.cjs | first-seen class が CONTENT の Strong 数 |
| 旧 4,182 | s4content.cjs | 旧 4,211 のうち plain tokens あり |
| **新 4,195** | s4groups.cjs Group A | class=CONTENT かつ jaType=plain の token を持つ Strong 数 |

4,195 = 4,182 + 13 (旧で non-CONTENT first-seen のため除外されていた adv plain Strong)  
4,211 - 4,195 = 16 (旧で CONTENT first-seen だが新方式では Group A に入らない Strong: 全 tokens が tilde/bracket のため Group B/C/D/E に割り当て)

---

## 3. σύ 格変化形の完全対応表（G4671 取り扱い含む）

| Strong | ギリシャ語 | 格 | 件数(NT全) | 現状 |
|--------|---------|-----|-----------|------|
| G4771 | σύ | 主格 | — | S4 除外済み |
| **G4675** | **σου** | **属格** | — | S4 除外済み（旧報告書に「与格」誤記あり → 訂正案記録済み） |
| **G4671** | **σοί** | **与格** | 69 | **Group H（独立監査対象）** |
| G4571 | σέ | 対格 | — | S4 除外済み |
| G4674 | σός | 所有形容詞 | — | S4 除外済み |

G4671（σοί, 与格）は S4 除外セットから漏れていた。Group H として独立監査対象に設定。既存 S4 集合への機械的追加はしない。

---

## 4. 各監査群の詳細確定案

### Group A — 内容語 plain（39,310 tokens, 4,195 Strongs）

**目的**: 現行 `token.japanese` ラベルが Reading Japanese として適切かを Strong 単位で確認する

**監査 A-1（Strong 単位語彙審査）**:
- 判定: OK / AMBIGUOUS / CANDIDATE / MISMATCH / SKIP
- Strong 単位で OK → 個々の token の japanese を自動確定しない

**監査 A-2（token 単位文脈審査）**: AMBIGUOUS/CANDIDATE/MISMATCH のみ実施

**Tier 別優先順位**:

| Tier | n | Strongs | tokens | 優先度 |
|------|---|---------|--------|--------|
| 1 | ≥200 | 20 | 8,724 | 最高 |
| 2 | 100-199 | 36 | 4,966 | 高 |
| 3 | 50-99 | 79 | 5,548 | 高 |
| 4 | 20-49 | 212 | 6,534 | 中 |
| 5 | 10-19 | 347 | 4,585 | 中 |
| 6 | 5-9 | 591 | 3,895 | 低 |
| 7 | <5 | 2,910 | 5,058 | サンプリング |

**Tier 1 全 20 Strongs**（動詞が 14、形容詞 4、名詞 2）:  
G3004(言う,1164), G3956(すべての,884), G2036(言う,866), G2192(持つ,679), G1096(なる,580), G4160(行う,520), G2064(来る,505), G3708(見る,424), G1325(与える,380), G191(聞く,361), G3056(ことば,330), G1492(知る,284), G3762(誰も〜ない,234), G2980(語る,234), G611(答える,231), G2983(受ける,225), G1831(出る,211), G1520(一つ,207), G4183(多くの,204), G2309(望む,201)

---

### Group B — εἰμί 述語構造（2,369 tokens, 22 Strongs）

**目的**: "〜である" ラベルが各 εἰμί 活用形の述語的機能を適切に表しているかを確認する

**設計**: `stage4-predicate-design.md` §2 参照  
**特記事項**: G680/G1573/G567/G4823/G566（5 Strongs）は εἰμί と無関係の lemma にもかかわらず "〜である" ラベル → 個別調査が必要

---

### Group C — 否定副詞機能監査（2,494 tokens, 2 Strongs）

**目的**: G3756（οὐ, 1,543 tokens）と G3361（μή, 951 tokens）の "〜ない" ラベルが各否定用法を適切に表しているかを確認する

**設計**: `stage4-negation-design.md` 参照  
**方針**: 通常の内容語語彙審査（Group A）に含めない。Strong 単位の基本機能確認 + 用法別サンプル。「現状維持」の一律判断はしない。

**確認する用法**:
- οὐ 直説法否定（主用法）
- μή 接続法/命令法/不定詞の否定（用法分岐）
- οὐ μή（強調否定）
- 否定疑問・二重否定

**Group Z に分類された否定副詞 tokens（171 tokens）**:  
G3756 ptcl 80 tokens + G3361 ptcl 57 + conj 34 = 171 tokens。bible_data で非 adv class の否定副詞。Group C 監査の参照情報として記録。

---

### Group D — その他 tilde 内容語（377 tokens, 16 Strongs）

**主要 Strong**:

| Strong | lemma | n | ja | 確認要否 |
|--------|-------|---|-----|---------|
| G3195 | μέλλω | 109 | 〜しようとする | 要確認 |
| G756 | ἄρχομαι | 84 | 〜である（※疑問） | **要個別調査** |
| G3761 | οὐδέ | 55 | 〜もない | 要確認（Group C に類似） |
| G3699 | ὅπου | 39 | 〜するところ | 要確認 |
| G1163 | δεῖ | 16 | 〜しなければならない | 要確認 |

> G756（ἄρχομαι = "to begin"）の japanese が "〜である" になっているのは異常。bible_data 実 tokens を個別確認する。

---

### Group E — 内容語 bracket（142 tokens, 4 Strongs）

| Strong | class | n | ja |
|--------|-------|---|-----|
| G3754（ὅτι） | adv tokens のみ | 79 | ［内容語句］ |
| G5613（ὡς） | adv tokens のみ | 36 | ［内容語句］ |
| G2443（ἵνα） | adv tokens のみ | 25 | ［目的語句］ |
| G3704（ὅπως） | adv tokens のみ | 2 | ［目的語句］ |

これらは bible_data で主に class=conj だが一部 tokens が class=adv。bracket ラベルは節構造を示す構造ラベル。語彙的修正不要。一括 OK 確認で完了。

---

### Group F — pron plain（5,544 tokens, 46 Strongs）

**設計**: `stage4-pron-design.md` §2-F 参照

**機能分類別件数**（概算）:
- 1人称単数（ἐγώ 格変化 7 Strongs）: ~1,795 tokens
- 1人称複数（ἡμεῖς 格変化 4 Strongs）: ~862 tokens
- 3人称再帰（αὑτοῦ/ἑαυτοῦ 4 Strongs）: ~812 tokens
- 指示代名詞（οὗτος/ἐκεῖνος 系 14 Strongs）: ~1,022 tokens
- 疑問代名詞（τίς 1 Strong）: 507 tokens
- 不定代名詞（τις 2 Strongs）: 279 tokens
- 相互代名詞（ἀλλήλων 1 Strong）: 100 tokens
- 性質・程度疑問（11 Strongs）: ~153 tokens
- その他（G5123 等 2 Strongs）: ~14 tokens

---

### Group G — pron tilde 関係代名詞（1,657 tokens, 3 Strongs）

| Strong | lemma | n | ja |
|--------|-------|---|-----|
| G3739 | ὅς/ἥ/ὅ（関係代名詞） | 1,408 | 〜する者 |
| G3748 | ὅστις | 139 | 〜する者 |
| G3745 | ὅσος | 111 | 〜するだけ |

"〜する者" は関係節構造を示す Reading Japanese 標識。Strong 単位（3 件）で一括確認。

---

### Group H — G4671 σοί 独立監査（69 tokens, 1 Strong）

**位置づけ**: σύ（2人称単数代名詞）の与格形。S4 除外セットから漏れていた。

**既存 S4 への機械的追加はしない理由**: S4 の σύ 処理は σύ の複数形・集合的用法の問題を扱う文脈で設計された先行処理。G4671 の 69 tokens は独立した監査対象として Group H で処理する。

**G4671 独立監査設計**:

**Step 1: 形態確認**  
G4671 = σοί（σύ の与格単数）。bible_data での japanese 値は "あなた"。

| 格 | 用法 | JA1955 での表現 |
|----|------|--------------|
| 与格 | 間接目的語（あなたに） | 動詞に吸収・省略 |
| 与格 | 利益与格（あなたのために） | "あなたに" または省略 |
| 与格 | 所有与格（あなたの） | "あなたの" または省略 |
| 与格 | 関連与格（あなたにとって） | "あなたには" または省略 |

**Step 2: JA1955 での明示/省略/吸収の分類**  
69 tokens を全件（または代表サンプル）で確認する。JA1955 で:
- 「あなた」「あなたに」が明示 → 照合可能
- 動詞形に吸収（「〜してください」など）→ 吸収として記録
- 省略 → 省略として記録

**Step 3: ラベル妥当性判定**  
"あなた" が G4671（与格）の Reading Japanese として適切か。与格用法（〜に / 〜のために）を "あなた" が十分に代表しているか確認。

**監査記録形式**:
```json
{
  "strong": "G4671",
  "lemma": "σοί",
  "case": "与格 (dative)",
  "n": 69,
  "current_japanese": "あなた",
  "ja1955_pattern_明示": "件数",
  "ja1955_pattern_吸収": "件数",
  "ja1955_pattern_省略": "件数",
  "label_assessment": "OK | CANDIDATE",
  "recommendation": "任意記入",
  "note": ""
}
```

---

### Group Z — 機能語（40,990 tokens, 139 Strongs）

**除外**: det/conj/prep/ptcl/intj class の全 tokens。内容語監査の対象外。  
**内訳**: det(19,796), conj(7,855 conj-pure + 609 mixed), prep(10,373 + mixed), ptcl(771 + mixed), intj(18) + others

---

## 5. 実施順序案（確定）

```
Phase 4a: 前提確認・設計完了（現在作業中）
  ✅ G4671 方針確定（Group H 独立監査）
  ✅ Group C 設計確定（否定表現機能監査）
  ✅ 件数差分解消（44,629 → 44,692 = +63, 理由説明完了）

Phase 4b: Group E + Group B/D 確認（一括系）
  E: 4 Strongs 一括確認（142 tokens）
  B: 22 Strongs 語形確認 + 5 件個別調査
  D: 16 Strongs + G756 個別調査（377 tokens）

Phase 4c: Group C 否定機能監査
  Strong 単位確認（G3756 / G3361）
  用法別サンプル（10〜20 件）

Phase 4d: Group A Tier 1-2（56 Strongs, 13,690 tokens）
  Tier 1: 20 Strongs（最高頻度動詞・名詞・形容詞）
  Tier 2: 36 Strongs

Phase 4e: Group G + F（pron 独立監査）
  G: 関係代名詞 3 Strongs（一括確認）
  H: G4671 全 69 tokens 確認
  F: 高頻度 pron（上位 5 Strongs: ~2,287 tokens）
  F: 残 41 Strongs

Phase 4f: Group A Tier 3-4（291 Strongs）

Phase 4g: Group A Tier 5-6（938 Strongs）

Phase 4h: Group A Tier 7（サンプリング, 2,910 Strongs）
```

---

## 6. 未解決事項（UNKNOWN / 要確認）

| # | 事項 | 現状 | 推奨対応 |
|---|------|------|---------|
| 1 | G756（ἄρχομαι）の "〜である" ラベル | 疑問あり | Phase 4b での個別調査 |
| 2 | Group Z の G3756/G3361 ptcl/conj tokens 171 件の bible_data class 不整合 | 記録済み | Stage 4 では記録のみ |
| 3 | Tier 7（n<5, 2,910 Strongs）のサンプリング率 | 未定 | 監査開始時に確定（10〜20% 推奨） |
| 4 | AMBIGUOUS 判定の Stage 5 送り方針 | 未定 | Stage 4 進行中に確定 |

---

## 7. 変更禁止事項

- 聖書 JSON（bible_data）を変更しない
- token.japanese を変更しない
- 既存承認済みデータ（ledger）を変更しない
- 恒久 BL・S4 除外集合を変更しない（G4671 は Group H として独立処理）
- `stage3-addendum-report.md` の誤記は訂正案を記録するが元ファイルを変更しない
- コミット・プッシュしない
- Stage 4 全件監査（翻訳修正）は本設計書作成段階では実施しない
- Stage 5 に着手しない
