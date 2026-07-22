# Docs 役割分離 移動計画 監査（Pre-Release）

実施日: 2026-07-23
目的: **public/docs = 利用者公開文書 / root docs = 開発・設計・監査証跡** に役割分離する移動計画を、
**監査として提示**する。**本 Stage は監査のみ。実際の移動はユーザ確認後に行う。**
制約遵守: ファイル削除禁止・内容変更禁止・runtime(index.html/core/assets/bible_data)変更禁止・git 履歴を壊さ
ない(移動は `git mv`)・**Reading Japanese Specification の公開経路は維持**。

---

## 1. public/docs 分類（159 md + 19 非md）

### A. 利用者公開として public/docs に残すもの

| ファイル | 理由 |
|---|---|
| **reading-japanese-specification.md** | **確定 A**。正典・README がリンク・利用者に参照させる文書。**公開経路維持(移動しない)** |

### A-候補（ユーザ判断・設計正典だが利用者公開の是非は選択）

| ファイル | 位置づけ |
|---|---|
| reading-japanese-policy.md（L-0） | 根幹原則。公開透明性のため A に残す選択も可／本質は開発向けなら B |
| phrase-reading.md | Phrase Reading 正典（設計向け）。B 寄りだが正典性あり |

→ **推奨**: 確定 A は spec のみ。policy / phrase-reading は**ユーザ選択**（残すなら A、寄せるなら B）。

### B. 開発証跡として root docs 側へ移すもの（= A を除く全 md）

**規則: `public/docs/*.md` のうち A(spec、任意で policy/phrase-reading)を除く全件を B とする。**
グループ別件数（B ≈ 156〜158 件）:

| グループ | 件数 | 例 |
|---|---|---|
| reading-japanese-*（spec 除く） | 30 | baseline / builder-* / adoption-* / editorial-* / lexical・rhetorical-audit / semantic・syntax-completion 等（M シリーズ） |
| reading-hint-* | 13 | SP-5〜SP-16 / R-1〜R-5 の設計・監査・改訂・完成報告 |
| search-* | 12 | 検索 UI の設計/監査 |
| relative-* | 10 | 関係詞 Morph/Syntax の design→implementation |
| morph-* / syntax-* / semantic-* | 6/5/4 | Morph/Syntax/Semantic の設計・実装 |
| studypanel-* | 3 | IA / scope / 認知負荷監査 |
| visual-* / reflexive-* / phrase-*（phrase-reading 除く場合） | 2/2/1 | UX 監査 / 再帰 Morph |
| 単発 | 各1 | tis-morph-*(2) / reading-word-separation / reading-semantic / reading-policy / reading-observation / reading-memo-* / reading-lexicon / reading-flow-gloss-policy / pronoun / silence / sidebar / related / todays / pattern 等 |

- **19 非md（`public/docs/output/` の json 等）**: 開発生成物。**B 相当(root 側 or 現状維持)**。docs 分類の対象外
  として別途判断可。

---

## 2. 移動対象一覧（提案）

- **移動する**: 上記 B（`public/docs/*.md` から A を除く全件）。
- **移動しない（public/docs 残置）**: `reading-japanese-specification.md`（＋ユーザが A とする policy/phrase-reading）。
- **移動先案**（root docs を汚さない形）:
  - 案 1（推奨・単一）: `docs/development/` に B を集約。
  - 案 2（分類）: `docs/{design,audit,report,history}/` へ種別配置。
  - 案 3（core コメント整合優先）: root `docs/` 直下（後述の core コメント `docs/xxx.md` と一致するが root が乱雑化）。
- **手段**: **`git mv`**（履歴を rename として保持・内容不変）。**B は一括で同一ディレクトリへ**移す（intra-doc の
  相対リンク保全のため・§4）。

---

## 3. README / リンク参照の確認

| 参照 | 状態 | 移動影響 |
|---|---|---|
| **docs/README.md → `../public/docs/reading-japanese-specification.md`** | 唯一の外部リンク。**spec は A で残置** | **影響なし・維持** ✓ |
| **アプリ内「出典・ポリシー」（index.html 7789）** | 「Reading Japanese Specification として公開」= **名称参照のみ（href なし）** | **影響なし** ✓ |
| **public/docs を指す他の html/js/json** | **なし**（runtime は md 非参照） | 影響なし |

- **「Reading Japanese Specification の公開経路は維持」= 満たされる**（spec を動かさないため）。

---

## 4. 移動による影響

| 項目 | 影響 | 対応 |
|---|---|---|
| **runtime コード** | **なし**——index/core/assets/bible_data は public/docs の .md を fetch/import しない | 不要 |
| **README リンク** | **なし**（spec 残置） | 不要 |
| **アプリ内リンク** | **なし**（名称参照のみ） | 不要 |
| **intra-doc クリックリンク** | `](search-experience-audit.md)` / `](concept-discovery-audit.md)` の **2 箇所**が doc 間の相対リンク。**B を同一ディレクトリへ一括移動すれば保全**（別々に移すと切れる） | B を一括で同一 dir へ |
| **プロース相互参照（45 文書「根拠(FROZEN): xxx.md」）** | **リンク構文でないため技術的リンク切れなし**。ファイル名で追える（可読性は微減） | 不要（任意で後日整理） |
| **core コメントの `docs/xxx.md` 参照（15 箇所）** | **現在 public/docs にあるのに `docs/` 表記でミスマッチ**。B を root `docs/` へ移すと**整合**（`docs/development/` 等サブフォルダなら依然ミスマッチ）。**いずれも runtime 非依存のコメント** | 案3なら整合・他案は現状維持（内容変更禁止のため触らない） |
| **git 履歴** | `git mv` で **rename として保持**（履歴を壊さない） | git mv 使用 |
| **回帰/scripts** | **なし**（scripts は scripts/output の json 参照・public/docs md 非参照） | 不要 |

- **最重要**: **移動は runtime に一切影響しない**。実質リスクは「intra-doc の 2 リンク（一括移動で回避）」のみ。

---

## 5. 今すぐ変更が必要か / 実行方針

- **セキュリティ・runtime 上は不要**（前監査で秘密/PII 0・md 非依存を確認）。**リリースを止める問題はない**。
- **役割分離としては実施推奨**だが、**削除なし・内容不変・`git mv` で履歴保持・B は一括移動**が条件。
- **確認後の実行手順(案)**:
  1. A を確定（spec のみ／policy・phrase-reading をどうするか）。
  2. 移動先を選択（案 1 `docs/development/` 推奨）。
  3. `git mv public/docs/<B各件> docs/development/`（一括・履歴保持）。**spec は動かさない**。
  4. 検証: README リンク有効・intra-doc 2 リンク有効・runtime 回帰 ALL PASS・git log --follow で履歴継続。

- **本 Stage では移動を実行しない**。上記 A/B と移動先の確認を待つ。

```
[docs-reorg-move-plan-audit 2026-07-23]
分類: A(public/docs残置)=reading-japanese-specification.md（確定・公開経路維持）。A候補(ユーザ判断)=reading-japanese-policy.md/phrase-reading.md。B(root docsへ移動)=A除く全public/docs md ≈156-158
B内訳: reading-japanese30(spec除く)/reading-hint13/search12/relative10/morph6/syntax5/semantic4/studypanel3/visual2/reflexive2/単発多数。非md19(output json)は別途
移動先案: 1)docs/development/集約(推奨) 2)docs/{design,audit,report,history} 3)root docs直下(coreコメントdocs/xxx.md整合だが乱雑)
手段: git mv(履歴保持・内容不変)。Bは同一dirへ一括(intra-doc相対リンク保全)
README/リンク: 外部リンクはREADME→spec 1件のみ=spec残置で影響なし。アプリ出典は名称参照(hrefなし)=影響なし。runtimeはpublic/docs md非参照
影響: runtime影響0/README影響0/アプリ影響0。intra-docクリックリンク2(search-experience-audit,concept-discovery-audit)=B一括移動で保全。プロース相互参照45はリンク構文でなく切れない。coreコメント15は現在public/docsとdocs/表記ミスマッチ・root docs移動で整合(サブフォルダなら現状維持)・非runtime。git mvで履歴保持
今すぐ: セキュリティ/runtime不要・リリース可。役割分離は推奨・削除なし内容不変git mv一括。実行はユーザ確認後(A確定+移動先選択→git mv→README/2リンク/回帰/履歴検証)
```

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-07-23 | 初版(A/B 分類・移動計画・README/リンク確認・影響報告・実行はユーザ確認後・spec 残置で公開経路維持・runtime 非依存・git mv で履歴保持) |
