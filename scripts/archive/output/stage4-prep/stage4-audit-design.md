# Stage 4 監査設計案

生成日: 2026-10-30  
対象: NT 残存 92,952 件（内容語 4,211 Strongs / 44,629 tokens）

---

## 1. 設計方針

### 根拠となる発見

Stage 4 の残存内容語に対して **verse-level の containsBase() 自動照合を適用しても有効な成果は得られない**。

確認された事実（CONFIRMED）:
- Stage 3 pool の 92,952 件 remaining に対して `containsBase()` を実行したところ、JA1955 との対応が確認できた内容語はわずか **51 件（3 Strongs: G435/G3985/G3986）** に留まった
- 動詞最高頻度の G3004（言う, n=1,164）は JA1955 では「言われた」「言った」「言い」など活用形で現れる。`containsBase()` の kanji 抽出条件（2文字以上）を「言」（1文字）が満たさないためマッチしない
- 他の高頻度動詞 G2036（言う）, G2192（持つ）, G1096（なる）, G4160（行う）, G2064（来る）も同様に 1 文字漢字問題によりマッチ不可

### 採用する監査単位

**Strong 番号（lemma）単位の語彙的審査**

verse-by-verse の自動照合ではなく、各 Strong について  
「JA1955 にこの語のどの活用形・派生形が何通り現れるか」を語彙的に確認する。

---

## 2. 対象と除外

### 2.1 Stage 4 一次対象

| カテゴリ | Strongs 数 | tokens 数 | 条件 |
|---------|-----------|----------|------|
| plain-label 内容語 | 4,182 | 39,281 | class∈{verb,noun,adj,adv,num} かつ jaType=plain |
| stage2_only content | 11 | 31 | Stage2 census のみ収録の内容語 Strong |
| **小計** | **4,193** | **39,312** | |

### 2.2 条件付き対象（設計判断が必要）

| カテゴリ | Strongs 数 | tokens 数 | 理由 |
|---------|-----------|----------|------|
| tilde-label 内容語 | 29 | 5,348 | 系辞（〜である）・否定副詞（〜ない）。語彙的審査より述語構造審査が必要 |
| pron class | — | 7,270 | σύ 単数形は S4 除外済み。ego/hēmeis/demonstrative は未処理 |

**tilde-label 内容語の内訳**:
- εἰμί 各活用形（G2076/G2258/G2071/G1526/G1510/G1511/G2075/G1488/G5600/G2070 等, 合計 29 Strongs, 5,348 tokens）→ JA1955 では「ある」「いる」「〜だった」等の述語として現れる。Stage 4 では「述語構造グループ」として一括確認を推奨

**pron class の推奨方針**:  
- 高頻度代名詞（G3450 私 n=564, G1473 私 n=453, G2257 私たち n=401, G3165 私 n=288 等）は S4 σύ 方式（Strong 単位照合）に準ずる
- 疑問代名詞 G5101（誰/何 n=507）・不定代名詞 G5100（ある n=274）・再帰代名詞 G848（自分 n=437）は Strong 単位で扱える

### 2.3 Stage 4 除外

| カテゴリ | tokens 数 | 理由 |
|---------|----------|------|
| bracket-label | 27,329 | Reading Engine 付与の構造ラベル（冠詞・転換語句等）。JA1955 の訳語でない |
| 機能語（det/conj/prep/ptcl/intj） | 40,990 | 冠詞・接続詞・前置詞・助詞・感嘆詞。内容語監査の対象外 |
| 恒久 BL 6 Strongs | 15,883 | 全 NT 出現が除外済み |
| S4 除外（σύ 単数形） | 156 | 別途 Stage 4 処理済み |

---

## 3. 頻度別 Tier 設計

### 4,182 plain-label 内容語 Strongs の分布

| Tier | 頻度 | Strongs 数 | tokens 数 | 監査方法 |
|------|------|-----------|----------|---------|
| 1 | n ≥ 50 | 150 | 24,423 | 全件個別 Strong 審査（高優先） |
| 2 | 20 ≤ n < 50 | 216 | 6,636 | 個別 Strong 審査（品詞別バッチ） |
| 3 | 5 ≤ n < 20 | 941 | 8,519 | 品詞別グループ審査 + 抽出サンプル |
| 4 | n < 5 | 2,875 | 5,051 | サンプリング（全件監査はしない） |
| **合計** | | **4,182** | **44,629** | |

> **注**: Tier 1〜2 の合計は 366 Strongs / 31,059 tokens（全 tokens の 69.5%）。高頻度 Strong の審査を完了することで tokens 総数の 7 割をカバーできる。

---

## 4. 品詞別監査方法

### 4.1 動詞（verb, 1,782 Strongs, 25,341 tokens）

**問題**: JA1955 本文は活用形で記載されており、`token.japanese` の辞書形とは一致しない。

**審査手順（Strong 単位）**:
1. Strongs 辞書項目でギリシャ語 lemma と意味を確認
2. `token.japanese` の現行値（例: "言う"）を確認
3. JA1955 本文でこの Strong の出現箇所を数件サンプル確認
4. 以下を判定:
   - **OK**: 辞書形ラベルとして適切（言う → 言った/言われた等への対応が自然）
   - **AMBIGUOUS**: 複数語義があり Strong 単位では判定不可（例: G4160 行う/造る/する）
   - **CANDIDATE**: より正確なラベルに改善できる
   - **MISMATCH**: 明らかに誤対応

### 4.2 名詞（noun, 1,568 Strongs, 8,767 tokens）

- containsBase() が有効な Strongs（2文字以上の漢字を含む）は自動照合可能
- 残りは Strong 単位で辞書形を JA1955 本文で確認
- 格変化・複数形に注意（例: G3056 ことば/λόγος → λόγοι も「ことば」か「言葉」か）

### 4.3 形容詞（adj, 652 Strongs, 5,915 tokens）

- 述語形容詞 vs 限定形容詞の JA1955 表現の違いを確認
- 例: G3173（大きい/μέγας）→ JA1955 では「大きな/偉大な」等の変形が生じる

### 4.4 副詞（adv, 201 Strongs, 4,502 tokens）

- G3756（〜ない）, G3361（〜ない）は tilde-label（5,348 tokens の大半）
- plain-label adv のうち高頻度なもの: G3779（このように n=179）, G5568（詩篇）等
- 概ね JA1955 でそのまま現れるため照合しやすい

### 4.5 数詞（num, 8 Strongs, 104 tokens）

- 数字表現は JA1955 でほぼ直接確認可能
- n が少ないため全件審査が現実的

---

## 5. Stage 2 only 31 件の扱い

Stage 2 census に収録されているが Stage 3 pool（matchType=direct/kanji）に未収録の 31 件。

| Strong | n | class | japanese |
|--------|---|-------|---------|
| G1538 | 12 | adj | 各自/それぞれ |
| G5088 | 5 | verb | 産む |
| G3985 | 4 | verb | 試みる |
| G5278 | 2 | verb | 忍耐する |
| G1939 | 2 | noun | 欲望 |
| G435 | 1 | noun | 男 |
| G3986 | 1 | noun | 試練 |
| その他 | 4 | — | — |

**推奨**: Stage 4 Tier 3〜4 として一括処理（内容語として扱う）。  
G3985/G3986 の 5 件は JA1955 直接照合可能（containsBase 確認済み）。

---

## 6. 動詞辞書形マッチ問題への対処まとめ

Stage 3 の設計は「JA1955 本文に token.japanese の文字列が直接現れる」ことを前提とする verse-level 照合であった。

Stage 4 では **この前提を放棄する**。

代わりに:
- **語彙的対応の確認**: 各 Strong の lemma が JA1955 でどのように表現されているかを Strongs 辞書レベルで確認する
- **現行ラベルの適切性判定**: `token.japanese` 値が Reading Japanese として適切かを Strong 単位で判定する（token ごとの逐語確認は不要）
- **JA1955 サンプル確認**: 高頻度 Strong については代表 verse を 3〜5 件サンプルして実際の JA1955 表現を確認する

---

## 7. 監査実施の優先順位

```
Priority 1: Tier 1 verb (高頻度動詞, n≥50, ~60 Strongs)
  → 言う/持つ/なる/行う/来る/見る/与える/聞く/知る/語る...
  → 合計 ~15,000 tokens をカバー

Priority 2: Tier 1 noun + adj (高頻度名詞・形容詞, n≥50, ~90 Strongs)
  → ことば/業/世界/すべての/多くの/大きい/聖なる...

Priority 3: Tier 2 verb + noun (20≤n<50)

Priority 4: tilde-label content words (述語構造グループ)
  → εἰμί 形 29 Strongs を一括確認

Priority 5: pron class (照合方針確定後)

Priority 6: Tier 3〜4 + stage2_only 31件
```

---

## 8. 自動照合と手動審査の境界

| 方法 | 適用範囲 | 件数 |
|-----|---------|------|
| containsBase() 自動照合 | 2文字以上の漢字を含む名詞・形容詞 | ~数百件（推定） |
| JA1955 full-text grep | 特定漢字表現の全 verse 検索 | 都度実行 |
| **Strong 単位の語彙的審査** | 動詞全般 + 1文字漢字語 | **主要手段** |
| 逐語 verse 確認 | AMBIGUOUS・MISMATCH 候補のみ | 必要に応じて |

---

## 9. 成果物定義

Stage 4 監査の成果物形式:

```json
{
  "strong": "G3004",
  "lemma": "λέγω",
  "class": "verb",
  "japanese": "言う",
  "n_remaining": 1164,
  "audit_result": "OK | AMBIGUOUS | CANDIDATE | MISMATCH | SKIP",
  "evidence": "JA1955 使用表現の概要",
  "recommendation": "改善案（CANDIDATE/MISMATCH の場合のみ）",
  "note": "備考"
}
```

---

## 附記: 設計上の不確実性（UNKNOWN）

1. **pron class 7,270 件の最終方針** — S4 σύ 方式（既存方法論）に準拠するかどうかは、Stage 4 監査開始前に確定が必要
2. **tilde-label 述語構造（〜である）の監査基準** — 述語構造の「適切性」を何で測るかは別途定義が必要
3. **Tier 4（n<5）の監査必要性** — 2,875 Strongs / 5,051 tokens のうち、実際に JA1955 対応を確認すべき比率は未定
