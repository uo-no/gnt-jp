# Design QA Process
version: 1.0
scope: 聖書原文検索 — 全 UI 変更

---

## 目的

監査を**作る**のではなく、監査を**使って**実装品質を保証する。

「感覚的に直す」のではなく、「どの監査を満たすための修正か」を常に明確にする。  
変更の根拠が監査に紐付いていることが、この Process の保証する品質の定義である。

---

## フェーズ 1 — Issue 抽出

実装または画面を見て、問題を列挙する。

**ルール:**
- 解決策はまだ書かない
- 1つの問題 = 1 Issue
- Issue ID を付番する（Issue-001, Issue-002 …）

**形式:**

```
Issue-001
検索アプローチが2グループに分かれている

Issue-002
「詳細検索」というラベルが誤解を生む

Issue-003
語根カードだけが強調されている
```

Issue は画面を見た時の「気づき」の記録であり、判断ではない。  
この段階では Why も How も書かない。

---

## フェーズ 2 — 監査へのマッピング

各 Issue が、どの監査のどの項目に違反しているかを対応付ける。

**形式:**

| Issue | Audit | 項目 | Severity |
|-------|-------|------|----------|
| 検索アプローチが2グループに分かれている | Sidebar IA | IA-04 Choice Structure | P0 |
| 「詳細検索」ラベルが誤解を生む | Sidebar IA | IA-03 Semantic Label Accuracy | P0 |
| 語根カードだけが強調されている | Sidebar IA | IA-02 Approach Coordinate Parity | P0 |
| 検索ボタンの視覚重量が高すぎる | Visual Weight | `.run-btn` Gap +8 | P0 |
| 「本文で読む」ボタンが繰り返し出現 | Visual Rhythm | 繰り返しノイズ | P1 |

**マッピング不能な Issue の扱い:**

対応する監査項目が存在しない場合、その Issue は下記のいずれかに該当する:

1. 既存の監査が不足している → 監査を追加する
2. Issue の粒度が荒い → より具体的に分解する
3. UX の問題ではなく実装バグである → Issue ではなくバグとして分類する

---

## フェーズ 3 — 実装

**原則: 1 Issue につき 1 変更（1 PR または 1 コミット）**

Issue と変更の対応を明示することで、変更の根拠が追跡可能になる。

**形式:**

| PR | Issue | 内容 | 対象ファイル |
|----|-------|------|------------|
| PR-041 | Issue-003 | 検索ボタン削除 | search-tool.html |
| PR-042 | Issue-001, 003 | 語根カード均一化 + 4アプローチ同格展開 | search-tool.html |
| PR-043 | Issue-002 | 「詳細検索」ラベル廃止 | search-tool.html |

**変更禁止事項:**

- 根拠のない変更（どの Issue にも紐付かない変更）は実装しない
- 1つの PR で複数の Issue を混在させない（関連する Issue を束ねる場合は明示する）
- Severity P0 の Issue を残したまま P1 の Issue を実装しない

---

## フェーズ 4 — 再監査

変更後に、変更が触れた監査を再実行する。

**確認対象:**  
変更した要素が含まれる監査項目のみを対象とする。関係しない監査は再実行しない。

**形式:**

| Audit | 項目 | 変更前 | 変更後 |
|-------|------|--------|--------|
| Sidebar IA | IA-02 Approach Coordinate Parity | FAIL | PASS |
| Sidebar IA | IA-03 Semantic Label Accuracy | FAIL | PASS |
| Sidebar IA | IA-04 Choice Structure | FAIL | PASS |
| Visual Weight | `.run-btn` | P0 Gap +8 | 削除済み |

**判定:**

- 全 PASS → 次の Issue へ進む
- FAIL が残る → 実装をやり直す。別 Issue として追加しない。

---

## 実装の優先順位（改善ロードマップ）

P0 から順に実施する。P0 が残存する状態で P1 に着手しない。

### Phase A（P0）— Sidebar IA

| 内容 | 対象 Issue | 期待する改善 |
|------|-----------|------------|
| 語根カードの「単独強調」を廃止する | Issue-003 | IA-02 PASS |
| 「詳細検索」disclosure を廃止する | Issue-001, 002 | IA-01・03・04・05 PASS |
| 4アプローチを1グループとして同格展開する | Issue-001 | IA-04 PASS |

Phase A の3変更で Sidebar IA の P0 項目（IA-01〜05）がまとめて改善する。

### Phase B（P1）— Visual Rhythm / Interaction

| 内容 | 対象 Audit | 期待する改善 |
|------|-----------|------------|
| 「本文で読む」ボタンの視覚重量を調整する | Visual Rhythm, Visual Weight | 繰り返しノイズ削減 |
| 履歴表示タイミングの改善（blur delay） | Sidebar IA / IA-06 | P2 → PASS |
| 品詞アプローチ選択後の段階開示設計 | Sidebar IA / IA-05 | Progressive Disclosure 正用 |

### Phase C（P2）— 仕上げ

余白・アニメーション・タイポグラフィの細部調整。  
P0・P1 がすべて PASS した後に着手する。

---

## 完了条件（Definition of Done）

以下をすべて満たした状態を「完了」と定義する。

### Visual Audits

- [ ] Visual Weight — PASS（全要素のギャップ 0 以下）
- [ ] Attention — PASS（First Fixation が検索入力欄）
- [ ] Visual Rhythm — PASS（Fast スパイク 2連続以内）
- [ ] Density — PASS（左サイドバー視覚密度 ≤ 40%）
- [ ] Silence — PASS（本文前後に静寂ゾーンあり）
- [ ] Interaction — PASS（Primary 階層の逆転なし）

### IA Audits

- [ ] Sidebar IA — PASS（IA-00〜06 全項目）
- [ ] P0 FAIL = 0

### UX Audits（将来追加予定）

- [ ] Discovery Audit — PASS
- [ ] Search Funnel Audit — PASS

### 総合判定

- [ ] P0 FAIL = 0
- [ ] P1 FAIL = 0
- [ ] 重大な UX 上の矛盾なし（ユーザーの思考フローを阻害する Issue が残存しない）

---

## 監査ドキュメント一覧

| Audit | ドキュメント | 対象 |
|-------|------------|------|
| Visual Weight | `docs/visual-weight-audit.md` | 全 button・chip・badge |
| Attention | `docs/attention-audit.md` | 視線の流れ |
| Visual Rhythm | `docs/visual-rhythm-audit.md` | 重量 × テンポ |
| Interaction | `docs/interaction-audit.md` | Primary/Secondary 階層 |
| Density | `docs/density-audit.md` | 左右の情報密度バランス |
| Silence | `docs/silence-audit.md` | 静寂と余白の分布 |
| Sidebar IA | `docs/sidebar-ia-audit.md` | Sidebar の情報構造 |
