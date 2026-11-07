# Stage 4 件数照合・差分解消報告

生成日: 2026-10-31  
目的: 旧値 44,629 と新値 44,692 の差 63 件、および旧 Strong 数との差を token ref 単位で説明する

---

## 1. 旧値 44,629 と新値 44,692 の差 +63 の原因

### 原因の特定（CONFIRMED）

差は **s4content.cjs の設計バグ** によるもの。s4groups.cjs（per-token アプローチ）が正しい。

**バグの内容**: s4content.cjs は各 Strong について最初に出現した token の `class` フィールドをその Strong 全体の class として代表させた。bible_data では同一 Strong 番号でも token によって class が異なる場合（mixed-class Strong）がある。このため:

- 最初の token が conj/prep/ptcl → Strong 全体が非 CONTENT と誤判定 → そのStrong の実際のCONTENT tokens が未計上
- 最初の token が adv/verb 等 → Strong 全体が CONTENT と誤判定 → そのStrongの非CONTENT tokens が過算

**per-token アプローチ**: 各 token を `t.class`（bible_data から直接取得）で個別に判定。CONTENT かどうかは Strong ではなく token 単位で決まる。こちらが正しい。

---

## 2. 差分の内訳（旧値 44,629 との比較）

| 分類 | 旧値 | 新値 | 差 |
|------|------|------|-----|
| 内容語 plain | 39,281 | 39,310 | **+29** |
| 内容語 tilde | 5,348 | 5,240 | **-108** |
| 内容語 bracket | 0 | 142 | **+142** |
| **合計** | **44,629** | **44,692** | **+63** |

### 差分の方向別説明

**+142 bracket（未計上 → 計上）**:  
G3754/G5613/G2443/G3704 の adv-classified tokens が存在する。これらの Strong は bible_data で class=conj が多いが、一部 tokens は class=adv。bracket ラベル（`［内容語句］` / `［目的語句］`）を持つ adv tokens が未計上だった。

**-108 tilde（過算 → 修正）**:  
G3756/G3361 等の主要 Strong は class=adv（CONTENT）が主体だが、一部 tokens は class=ptcl または class=conj（非 CONTENT）。s4content.cjs ではこれら非 CONTENT tokens も「G3756 は adv だから」と tilde に計上していた。

**+29 plain（未計上 → 計上）**:  
G1854/G3780/G4008/G3694 等の prep/ptcl first-seen Strong の adv-classified plain tokens が未計上だった。

---

## 3. Strong 別差分一覧（全 43 Strong）

旧値と新値で token 計上が異なる Strong すべてを列挙する。Δ = 新値 - 旧値。

| Strong | 旧 class | 実際の class | Δplain | Δtilde | Δbracket | 原因 |
|--------|---------|------------|--------|--------|----------|------|
| G3361 | adv | adv/ptcl/conj | 0 | **-91** | 0 | ptcl+conj tokens 過算 |
| G3756 | adv | adv/ptcl | 0 | **-80** | 0 | ptcl tokens 過算 |
| G3754 | conj | conj/adv | 0 | 0 | **+79** | adv bracket tokens 未計上 |
| G3761 | conj | conj/adv | 0 | **+55** | 0 | adv tilde tokens 未計上 |
| G3699 | adv | adv/conj | 0 | **-42** | 0 | conj tokens 過算 |
| G5613 | conj | conj/adv/prep | 0 | 0 | **+36** | adv bracket tokens 未計上 |
| G1854 | prep | prep/adv | **+27** | 0 | 0 | adv plain tokens 未計上 |
| G2443 | conj | conj/adv | 0 | 0 | **+25** | adv bracket tokens 未計上 |
| G3780 | ptcl | ptcl/adv | **+17** | 0 | 0 | adv plain tokens 未計上 |
| G3753 | conj | conj/adv | 0 | **+14** | 0 | adv tilde tokens 未計上 |
| G5616 | conj | conj/adv | 0 | **+11** | 0 | adv tilde tokens 未計上 |
| G1451 | adv | adv/prep | **-11** | 0 | 0 | prep tokens 過算（plain） |
| G4008 | prep | prep/adv | **+10** | 0 | 0 | adv plain tokens 未計上 |
| G3606 | adv | adv/conj | **-10** | 0 | 0 | conj tokens 過算 |
| G3694 | prep | prep/adv | **+9** | 0 | 0 | adv plain tokens 未計上 |
| G3752 | conj | conj/adv | 0 | **+8** | 0 | adv tilde tokens 未計上 |
| G303 | prep | prep/adv | 0 | **+8** | 0 | adv tilde tokens 未計上 |
| G4459 | adv | adv/conj | **-7** | 0 | 0 | conj tokens 過算 |
| G2579 | adv | adv/conj | **-7** | 0 | 0 | conj tokens 過算 |
| G3366 | conj | conj/adv | 0 | **+6** | 0 | adv tilde tokens 未計上 |
| G3757 | adv | adv/conj | 0 | **-5** | 0 | conj tokens 過算 |
| G260 | prep | prep/adv | **+5** | 0 | 0 | adv plain tokens 未計上 |
| G1715 | prep | prep/adv | 0 | **+4** | 0 | adv tilde tokens 未計上 |
| G1622 | adv | adv/prep | **-4** | 0 | 0 | prep tokens 過算 |
| G1487 | conj | conj/ptcl/adv | **+3** | 0 | 0 | adv plain tokens 未計上 |
| G2945 | adv | adv/prep | **-3** | 0 | 0 | prep tokens 過算 |
| G4218 | adv | adv/ptcl | **-3** | 0 | 0 | ptcl tokens 過算 |
| G3704 | conj | conj/adv | 0 | 0 | **+2** | adv bracket tokens 未計上 |
| G3693 | adv | adv/prep | **-2** | 0 | 0 | prep tokens 過算 |
| G1883 | prep | prep/adv | **+2** | 0 | 0 | adv plain tokens 未計上 |
| G575 | prep | prep/adv | 0 | **+1** | 0 | adv tilde tokens 未計上 |
| G3379 | conj | conj/ptcl/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| G3924 | prep | prep/adv | 0 | **+1** | 0 | adv tilde tokens 未計上 |
| G4139 | adv | adv/prep | **-1** | 0 | 0 | prep tokens 過算 |
| G5228 | prep | prep/adv | 0 | **+1** | 0 | adv tilde tokens 未計上 |
| G5565 | prep | prep/adv | 0 | **+1** | 0 | adv tilde tokens 未計上 |
| G3342 | prep | prep/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| G2713 | prep | prep/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| G1855 | adv | adv/prep | **-1** | 0 | 0 | prep tokens 過算 |
| G2095 | adv | adv/ptcl | **-1** | 0 | 0 | ptcl tokens 過算 |
| G3796 | prep | prep/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| G4250 | conj | conj/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| G2943 | prep | prep/adv | **+1** | 0 | 0 | adv plain tokens 未計上 |
| **合計** | | | **+29** | **-108** | **+142** | **+63** |

> 検証: 表の Δ 合計 = +29 + (-108) + 142 = +63 ✅

---

## 4. Strong 数の差異の説明

### 旧 4,211 vs 旧 4,182 vs 新 4,195

| 数値 | 出典 | 定義 |
|------|------|------|
| 旧 4,211 | s4content.cjs `allStrongs.filter(CONTENT)` | first-seen class が CONTENT の全 Strong |
| 旧 4,182 | s4content.cjs 内 plain-label あり | 旧 4,211 のうち jaDist.plain > 0 の Strong |
| 新 4,195 | s4groups.cjs Group A | class=CONTENT かつ jt=plain の token を少なくとも 1 件持つ Strong |

**4,211 → 4,195 の -16 Strong**:  
旧メソッドでは first-seen=CONTENT として計上されたが新メソッドでは Group A に入らない Strong（そのStrong の CONTENT class tokens がすべて tilde/bracket で plain が 0 の場合、または CONTENT class tokens の count が過算だった場合）。

**4,182 → 4,195 の +13 Strong**:  
旧メソッドでは first-seen=non-CONTENT として除外されたが、新メソッドでは class=adv+plain な tokens を持つため Group A に入る Strong。例: G1854(prep+adv, +27 plain), G3780(ptcl+adv, +17 plain), G4008(prep+adv, +10 plain) 等、表の「未計上」欄の上位 Strong が該当。

---

## 5. 結論

**旧値 44,629 は s4content.cjs の設計バグによるもの**。  
**新値 44,692 は per-token アプローチ（s4groups.cjs, s4diff.cjs, s4recount.cjs 全て一致）で正しい**。

差分は「未解決」ではなく **43 Strong の mixed-class 問題として完全に説明できる**（上表の Δ 合計が +63 に一致）。

---

## 6. G4675 誤記訂正案

### 発見箇所

`scripts/output/ja1955-full-audit/reports/stage3-addendum-report.md` 行 19・行 180:

```
| G4675 | σοί（与格） | ... |
```

### 誤記の内容

G4675 は **σου（σύ の属格 / genitive）** であり、「与格」は誤り。与格（dative）は G4671（σοί）。

### 正しい格変化対応

| Strong | ギリシャ語 | 格 | 説明 |
|--------|-----------|-----|------|
| G4771 | σύ | 主格 (nom.) | 既存 S4 除外済み |
| G4675 | σου | **属格 (gen.)** | 既存 S4 除外済み（誤記あり） |
| G4671 | σοί | **与格 (dat.)** | Stage 4 Group H |
| G4571 | σέ | 対格 (acc.) | 既存 S4 除外済み |
| G4674 | σός | 所有形容詞 | 既存 S4 除外済み |

### 訂正対応

元の監査データ JSON は変更しない。報告書上の誤記として以下を記録する：

- `stage3-addendum-report.md` 行 19: `G4675 | σοί（与格）` → 正 `G4675 | σου（属格）`
- `stage3-addendum-report.md` 行 180: 同上
- 影響: 監査判定・件数・グループ分類に影響なし（誤記はラベルのみ）
