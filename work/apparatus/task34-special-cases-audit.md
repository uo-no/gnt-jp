# Task 34 — 節範囲・WHspur・exact長文の個別監査

作成日: 2026-10-15  
種別: 個別エントリ監査（READ ONLY）  
対象: verseRange 未処理 2件 / exact 長文 9件 / WHspur 疑本文マーカー関連 11件

---

## 1. 監査対象一覧

| グループ | 件数 | 対象 ID |
|---|---|---|
| verseRange 未処理 | 2 | LUK-0961, JUD-0015 |
| exact 長文 | 9 | MAT-0816, MRK-0745, LUK-0427, LUK-0428, LUK-0463, JHN-0259, ACT-0808, ACT-1012, ROM-0229 |
| WHspur 1-reading | 6 | LUK-1050, LUK-1094, LUK-1099, LUK-1124, LUK-1139, LUK-1140 |
| WHspur 2-reading（Phase 3 除外分） | 5 | MRK-0923, MRK-0926, LUK-0962, LUK-0986, LUK-0987 |

**合計: 22件**

分類凡例:
- `自動生成可` — 既存または新規ジェネレーターで安全に生成できる
- `個別レビュー必須` — 事実の確認は可能だが、フォーマット・閾値について個別判断が必要
- `自動注釈対象外` — 自動生成できない。専用注釈または未出力を維持

---

## 2. verseRange 未処理 2件

### LUK-0961（ルカ 22:19-20）

**元データ（CONFIRMED）:**
```
tokenRefStatus: verse_range / verseRange: true
readings: 1件
  reading[0]: len=29 wits="WHspur Treg NIV RP"
              text="τὸ ὑπὲρ ὑμῶν … ἐκχυν[ν]όμενον"
              hasEllipsis: true / isOmission: false
```

**判定: `自動注釈対象外`**

**根拠:**
1. readings が 1件のみ — 比較対象の読みが存在しない
2. 全証人に WHspur が含まれる — WH によって当該箇所全体が疑義あり（spurious）とマークされている
3. reading text 自体に `…` を含む（元データ省略表示）
4. verseRange=true — 節跨ぎエントリ

この3条件が重なるエントリは MAT-0353 / LUK-0985 と同型（いずれも manual で `保留` 状態）。
読み差を記述する根拠がなく、自動生成する情報がない。

---

### JUD-0015（ユダ 1:22-23）

**元データ（CONFIRMED）:**
```
tokenRefStatus: verse_range / verseRange: true
readings: 3件
  reading[0]: len=70 wits="Treg NIV"
              text="διακρινομένους οὓς δὲ σῴζετε ἐκ πυρὸς ἁρ..."（全文 70字）
              hasEllipsis: false / isOmission: false
  reading[1]: len=63 wits="WH"
              text="διακρινομένους σῴζετε ἐκ πυρὸς ἁρπάζοντε..."（全文 63字）
              hasEllipsis: false / isOmission: false
  reading[2]: len=55 wits="RP"
              text="διακρινομένοι οὓς δὲ ἐν φόβῳ σῴζετε ἐκ π..."（全文 55字）
              hasEllipsis: false / isOmission: false
```

**判定: `個別レビュー必須`**

**根拠:**
- 3つの実際の読み差が存在する（WHspur なし、`…` なし）
- 全読みが現行 30字制限を超過（70 / 63 / 55字）
- verseRange=true — 節跨ぎエントリ

読み差の事実は明確に存在する。現行ジェネレーターの 30字制限では処理できないが、
上限を緩和したジェネレーターまたは手動注釈で対応可能。

将来の生成方針（Phase N+1 検討事項）:
- 上限を 80字程度に緩和する場合、LUK-0961 を除く本件のみが対象になる
- verseRange 対応は別途判断が必要（MAT-0004 / MRK-0392 は手動処理済み）

---

## 3. exact 長文 9件

すべて `tokenRefStatus=exact`、`verseRange=false`。
Phase 2 で 30字制限により除外された（`excludedLongIds`）。

### 3.1 構造の共通パターン

JHN-0259 と ROM-0229 を除く 7件は同一構造を持つ。

| ID | loc | WH/Treg/NIV 読み（短） | RP 読み（長） |
|---|---|---|---|
| MAT-0816 | 28:9 | `καὶ`（3字） | 51字 |
| MRK-0745 | 13:14 | `ἑστηκότα`（8字） | 38字 |
| LUK-0427 | 9:55 | `αὐτοῖς`（6字） | 55字 |
| LUK-0428 | 9:56 | `καὶ`（3字） | 74字 |
| LUK-0463 | 10:22 | `πάντα`（5字） | 42字 |
| ACT-0808 | 21:22 | `ἀκούσονται`（10字） | 35字 |
| ACT-1012 | 26:30 | `Ἀνέστη`（6字） | 31字 |

**全7件の共通特徴（CONFIRMED）:**
- WH / Treg / NIV は短い読み（1〜2語）を持つ
- RP は WH/Treg/NIV の語を末尾に含む長い句を持つ（挿入型）
- WHspur なし / `…` なし

---

### MAT-0816（マタイ 28:9）

**元データ（CONFIRMED）:**
```
reading[0]: "καὶ"（3字）wits=WH Treg NIV
reading[1]: "Ὡς δὲ ἐπορεύοντο ἀπαγγεῖλαι τοῖς μαθηταῖς αὐτοῦ καὶ"（51字）wits=RP
```

**判定: `個別レビュー必須`**

RP は WH/Treg/NIV の `καὶ` に先行して節文を挿入する（WH/Treg/NIV 版は `καὶ` のみで先行文なし）。
読み差の事実は明確だが、51字は現行 30字制限を超過する。

---

### MRK-0745（マルコ 13:14）

**元データ（CONFIRMED）:**
```
reading[0]: "ἑστηκότα"（8字）wits=WH Treg NIV
reading[1]: "τὸ ῥηθὲν ὑπὸ Δανιὴλ τοῦ προφήτου ἑστὼς"（38字）wits=RP
```

**判定: `個別レビュー必須`**

RP はダニエル書への参照句を挿入。38字で現行制限超過。

---

### LUK-0427（ルカ 9:55）

**元データ（CONFIRMED）:**
```
reading[0]: "αὐτοῖς"（6字）wits=WH Treg NIV
reading[1]: "αὐτοῖς, καὶ εἶπεν, Οὐκ οἰδατε οἵου πνεύματός ἐστε ὑμεῖς"（55字）wits=RP
```

**判定: `個別レビュー必須`**

RP は `αὐτοῖς` の後に長文を付加。55字で現行制限超過。LUK-0428 と対をなす（同一箇所の連続したエントリ）。

---

### LUK-0428（ルカ 9:56）

**元データ（CONFIRMED）:**
```
reading[0]: "καὶ"（3字）wits=WH Treg NIV
reading[1]: "ὁ γὰρ υἱὸς τοῦ ἀνθρώπου οὐκ ἦλθεν ψυχὰς ἀνθρώπων ἀπολέσαι, ἀλλὰ σῶσαι. Καὶ"（74字）wits=RP
```

**判定: `個別レビュー必須`**

74字。LUK-0427 と対をなす。RP は節句を挿入後 `Καὶ` で繋ぐ。

---

### LUK-0463（ルカ 10:22）

**元データ（CONFIRMED）:**
```
reading[0]: "πάντα"（5字）wits=WH Treg NIV
reading[1]: "Καὶ στραφείς πρός τούς μαθητάς εἶπεν πάντα"（42字）wits=RP
```

**判定: `個別レビュー必須`**

42字。RP は `πάντα` の前に「弟子たちの方に向き言った」を挿入。

---

### JHN-0259（ヨハネ 7:52）

**元データ（CONFIRMED）:**
```
reading[0]: "ἐγείρεται"（9字）wits=WH Treg NIV
reading[1]: "ἐγηγέρται + 7:53–8:11: 53 καὶ ἐπορεύθη ἕκαστος εἰς τὸν οἶκον αὐτοῦ…"
            （1,205字）wits=RP
```

**判定: `自動注釈対象外`**

**根拠:**
1. RP 読みが 1,205字 — 異例の長文
2. RP 読みの内容は `ἐγηγέρται`（動詞語形差）に加え、`+ 7:53–8:11` という SBLGNT apparatus 記法で pericope adulterae（姦淫の女：ヨハネ 7:53–8:11）の全文を挿入している
3. `+` はここでは Phase 1 の添加読み（reading.text の先頭 `+`）と同じ文字だが、意味が異なる — SBLGNT apparatus 内でセクション追加を表す符号であり、読みの追加プレフィックスではない
4. このエントリは語形差（`ἐγείρεται` vs `ἐγηγέρται`）と pericope adulterae 挿入の複合問題であり、単純な読み差記述では誤解を招く

専用注釈または `保留` が適切。

---

### ACT-0808（使徒 21:22）

**元データ（CONFIRMED）:**
```
reading[0]: "ἀκούσονται"（10字）wits=WH Treg NIV
reading[1]: "δεῖ πλῆθος συνελθεῖν ἀκούσονται γὰρ"（35字）wits=RP
```

**判定: `個別レビュー必須`**

35字。現行 30字制限を 5字超過。RP は `ἀκούσονται γὰρ` の前に `δεῖ πλῆθος συνελθεῖν` を挿入。
7件のうち閾値に最も近いエントリの一つ。

---

### ACT-1012（使徒 26:30）

**元データ（CONFIRMED）:**
```
reading[0]: "Ἀνέστη"（6字）wits=WH Treg NIV
reading[1]: "Καὶ ταῦτα εἰπόντος αὐτοῦ ἀνέστη"（31字）wits=RP
```

**判定: `個別レビュー必須`**

31字。現行 30字制限を 1字超過。RP は `Ἀνέστη` の前に `Καὶ ταῦτα εἰπόντος αὐτοῦ` を挿入。
7件のうち最も閾値に近く、1字の差で除外されている。

---

### ROM-0229（ローマ 16:24）

**元データ（CONFIRMED）:**
```
reading[0]: "Ἀμήν"（4字）wits=RP
reading[1]: "25 Τῷ δὲ δυναμένῳ ὑμᾶς στηρίξαι…"（338字）wits=WH Treg NIV
```

**判定: `自動注釈対象外`**

**根拠:**
1. WH / Treg / NIV 読みが 338字の長文 — Romans 16:25–27 の Doxology 全文
2. 構造が他 7件の逆（RP が短く WH/Treg/NIV が長い）
3. Romans Doxology の配置（14章末 vs 15章末 vs 16章末 vs 省略）はローマ書の本文批判上の重要問題であり、単純な `読み差` 形式では不十分
4. 338字は現行制限の 10倍以上

専用注釈または `保留` が適切。

---

## 4. WHspur 疑本文マーカー関連

### 4.1 WHspur 1-reading 6件（LUK 23–24 章）

**元データ（CONFIRMED）:**

| ID | loc | len | wits | `…` |
|---|---|---|---|---|
| LUK-1050 | 23:34 | 15 | WHspur Treg NIV RP | あり |
| LUK-1094 | 24:6  | 25 | WHspur Treg NIV RP | なし |
| LUK-1099 | 24:12 | 17 | WHspur Treg NIV RP | あり |
| LUK-1124 | 24:40 | 22 | WHspur Treg NIV RP | あり |
| LUK-1139 | 24:51 | 29 | WHspur Treg NIV RP | なし |
| LUK-1140 | 24:52 | 20 | WHspur Treg NIV RP | なし |

全6件の共通特徴:
- readings が 1件のみ — 比較対象の読みが存在しない
- 全証人に WHspur が含まれる（WH が当該箇所を疑義ありとしてマーク）
- WHspur は代替読みではなく、WH 版が本文の真正性に疑義を示すためのマーカー
- Phase 3 では `oneReading` フィルター（rdgs.length < 2）で除外済み

**判定（6件全て）: `自動注釈対象外`**

**根拠:**
- 単一 reading のため読み差を記述できない
- WHspur は版間の読みの差ではなく、WH が本文箇所全体に付した本文批判的マーカー
- 比較する対立読みが存在しない

参考: MAT-0353 / LUK-0985（verseRange + WHspur 1-reading）は manual で `保留` — 同様の扱いが適切。

---

### 4.2 WHspur 2-reading 5件（Mark 16 / Luke 22 章）

**元データ（CONFIRMED）:**

| ID | loc | trs | reading[0] | reading[1] |
|---|---|---|---|---|
| MRK-0923 | 16:9 | elision | `παρ᾽`（4字）WHspur Treg NIV | `ἀφ᾽`（3字）RP |
| MRK-0926 | 16:17 | phrase | `ταῦτα παρακολουθήσει`（20字）NIV RP | `ἀκολουθήσει ταῦτα`（17字）WHspur Treg |
| LUK-0962 | 22:20 | phrase | `καὶ τὸ ποτήριον ὡσαύτως`（23字）WHspur Treg NIV | `ὡσαύτως καὶ τὸ ποτήριον`（23字）RP |
| LUK-0986 | 22:43 | elision | `ἀπ᾽`（3字）NIV RP | `ἀπὸ τοῦ`（7字）WHspur Treg |
| LUK-0987 | 22:44 | phrase | `καὶ ἐγένετο`（11字）WHspur NIV | `ἐγένετο δὲ`（10字）Treg RP |

全5件の共通特徴（CONFIRMED）:
- readings が 2件存在する — 実際の読み差がある
- 全読みテキストが 30字以内
- `…` なし
- WHspur は一方の reading の証人リストに含まれる（全読みに全証人が WHspur なわけではない）
- Phase 3 では `whspur` フィルター（任意の reading の witnesses が WHspur を含む）で除外済み

**判定（5件全て）: `自動生成可`（ただし Phase N+1 — ジェネレーター修正要）**

**根拠:**
- 2つの実際の読みが存在し、両者ともテキストと証人を持つ
- `TEXT（WHspur Treg NIV）・TEXT（RP）` という出力形式は事実のみを示す — 差異の神学的・本文批判的な意味を断定しない
- WHspur を他の証人と同様に証人ラベルとして扱うことは、SBLGNT apparatus データの事実を反映する
- L-0: `WHspur` が何を意味するかの解釈は読者に委ねる

**必要な実装変更（IMPL-1）:**  
Phase 3 ジェネレーター（または Phase 4 新規ジェネレーター）の WHspur 除外条件を以下に修正:

```
現行: rdgs.some(r => r.witnesses.includes('WHspur'))
修正案: rdgs.every(r => r.witnesses.includes('WHspur'))
        // 全読みが WHspur を含む場合のみ除外（= 1-reading 相当）
```

または 5件のみを対象に手動記述する。

**MRK-0923 / MRK-0926 の文脈注記（INFERRED — 実装には含めない）:**  
これらは Mark 16:9-20（マルコ福音書長結末部）内のエントリ。WHspur は WH がこの区画全体を疑義ありとしていることを示す。
ただし、この文脈は自動生成の判断には関係しない — 事実の記述（読み差の存在）は変わらない。

---

## 5. 分類まとめ

### 自動生成可（Phase N+1 — ジェネレーター修正要）

| ID | loc | 条件 |
|---|---|---|
| MRK-0923 | 16:9 | WHspur 2-reading / 4+3字 |
| MRK-0926 | 16:17 | WHspur 2-reading / 20+17字 |
| LUK-0962 | 22:20 | WHspur 2-reading / 23+23字 |
| LUK-0986 | 22:43 | WHspur 2-reading / 3+7字 |
| LUK-0987 | 22:44 | WHspur 2-reading / 11+10字 |

必要変更: Phase 3 の `whspur` 除外条件の緩和（IMPL-1）。

### 個別レビュー必須

| ID | loc | 理由 | 長い読みの字数 |
|---|---|---|---|
| JUD-0015 | 1:22-23 | verseRange / 3読み / 超過 | 70 / 63 / 55字 |
| MAT-0816 | 28:9 | RP 長文 | 51字 |
| MRK-0745 | 13:14 | RP 長文 | 38字 |
| LUK-0427 | 9:55 | RP 長文 | 55字 |
| LUK-0428 | 9:56 | RP 長文 | 74字 |
| LUK-0463 | 10:22 | RP 長文 | 42字 |
| ACT-0808 | 21:22 | RP 長文（30字+5） | 35字 |
| ACT-1012 | 26:30 | RP 長文（30字+1） | 31字 |

共通の将来検討: 閾値を 40〜80字に緩和した Phase N+1 ジェネレーターで処理可能。ただし閾値変更の決定は別 Task とする。

### 自動注釈対象外

| ID | loc | 理由 |
|---|---|---|
| LUK-0961 | 22:19-20 | 1-reading / WHspur / 元データ`…` / verseRange |
| JHN-0259 | 7:52 | 1,205字 / pericope adulterae 挿入複合問題 |
| ROM-0229 | 16:24 | 338字 / Romans Doxology 配置問題 |
| LUK-1050 | 23:34 | WHspur 1-reading / 元データ`…` |
| LUK-1094 | 24:6 | WHspur 1-reading |
| LUK-1099 | 24:12 | WHspur 1-reading / 元データ`…` |
| LUK-1124 | 24:40 | WHspur 1-reading / 元データ`…` |
| LUK-1139 | 24:51 | WHspur 1-reading |
| LUK-1140 | 24:52 | WHspur 1-reading |

---

## 6. 実装変更が必要な項目

### IMPL-1: WHspur 2-reading 5件への対応

**変更対象:** Phase 3 ジェネレーター（`scripts/build-apparatus-ja-phase3.cjs`）または新規 Phase 4  
**変更内容:** WHspur 除外条件の緩和 — `rdgs.some(...)` → `rdgs.every(...)`  
**影響範囲:** Phase 3 エントリ数変化（+5件）、回帰テスト `ENTRY_COUNT_BASELINE` の更新が必要  
**FROZEN 変更:** Phase 3 output JSON は再生成が必要（変更手順を踏む）

---

## 7. 方針のみで対応可能な項目（実装変更なし）

### POLICY-1: exact 長文 7件（MAT-0816 等）の手動注釈方針

パターン: `短語（WH/Treg/NIV）` vs `RP が前後に文を挿入した長語句`

将来の Phase N+1 で閾値緩和が合意された場合の自動生成形式（案）:

```
TEXT（WIT）・TEXT（WIT）
（現行 Phase 2/3 と同じ形式。テキストが長くなるだけ）
```

別途閾値変更の判断が必要。

### POLICY-2: JHN-0259 / ROM-0229 の手動注釈方針

どちらも単純な `読み差` では表現しきれない。将来的な専用フォーマット（`特記` タグ等）の検討対象。
現状: 出力なし（apparatus-ja 4ファイルいずれにも含まれない）。この状態を維持する。

### POLICY-3: 自動注釈対象外 9件の方針

LUK-0961 / JHN-0259 / ROM-0229 / LUK-1050〜1140 の 9件:  
現状の `出力なし` を維持する。手動注釈が必要な場合は将来 Task として別途判断する。

---

## 8. 完了確認

- [x] 全対象22件のIDと判断理由が記録されている
- [x] 証人対応や読みを推測していない（INFERRED は 1箇所に限定し明示した）
- [x] 実装変更が必要な項目（IMPL-1）と方針のみで済む項目（POLICY-1〜3）が分離されている
- [x] manual / Phase 1 / Phase 2 / Phase 3 の既存JSONを変更していない
- [x] UIに関する変更を行っていない
- [x] 既存の未コミット変更を保持している
- [x] コミット・push・PRを行っていない

---

*監査 CONFIRMED: 上記は実コード・実データ・実行結果に基づく。推測は INFERRED として明示した。*
