# Research / Deep Dive Architecture / State Transition Architecture

## 1. Researchの位置づけ

ResearchはReadingとは異なる目的を持つが、Readingから切り離された別アプリではない。基本フローは一方向の固定シーケンスではなく、循環する：

```text
Read → Notice → Compare → Deep Dive → Return to Reading
```

Researchは「Readingから生じた疑問を深掘りするLayer」であり、常にBible Locationを保持したまま存在する。Research Surfaceに入った瞬間に「別の場所」に見えてはならない。

## 2. Research Surfaces

- 訳の違い／原文／語義／形態／統語／Structure Flow／Discourse
- Morph Search（`morph-search.html`）
- Syntax Search（`syntax-search.html`）

これらはいずれも独立したSurfaceとして存在してよいが、**Bible Locationを失わない**ことが必須条件である。既存実装のトップバーにある「調べるパネルを開閉する」ボタンは、Reading Surfaceを離れずにResearchへ入る導線としてすでに機能しており、この形（サイドパネル型の常設トグル）を軸に拡張する。

Morph/Syntax SearchをReading Surfaceに統合することが目的ではない——統合するのは画面そのものではなく、**導線とNavigation**である（`09 Existing Search Architecture` 制約）。具体的には：

- Reading Surface上で語をタップ → 語義・形態の要約をPopover表示（Progressive Disclosureの第一段階、`05`参照） → 「さらに調べる」→ Morph/Syntax Searchへ、現在のBible Locationと選択語を引き継いで遷移。
- `search-tool.html`（Concordance）は全聖書検索という独立した目的を持つため、Bible Location起点の導線は持たせず、Bottom Navigation / 左ナビの「検索」から独立して開く（`02`参照）。

## 3. Research Return

```text
Single      → Research → Single
Comparison  → Research → Comparison
```

ResearchによってReading Stateを意図せずSingleに戻したり、Translationを勝手に変更したりしない。Researchへ入る直前の Reading State / View Mode / Translation A・B / Reading Position は、Research中ずっと保持され、Research Panelを閉じた瞬間に完全に復元される。実装上は、Research起動を「画面遷移」ではなく「同じReading Surfaceの上に重なるPanel/Overlay」として扱うことでこれを保証する——Research用の別ルート・別画面を作らない。

## 4. Chapter Navigation

章を移動しても、Reading StateとView Modeは可能な限り維持する。

```text
MAT 1 + Comparison        →  MAT 2 + Comparison
JHN 1 + STRUCTURE         →  JHN 2 + STRUCTURE
```

「章が変わるたびに通常Readingへ戻る」という設計は避ける。Translation A/Bの組み合わせ、View Modeの選択は、章送り・書巻送りの操作では変化しない状態として扱う（例外：新しい書巻にComparison先のTranslationのデータが存在しない場合のみ、明示的な通知とともにSingleへフォールバックする——無言でのフォールバックは行わない）。

## 5. Reading Position — 永続化の設計

Reading Positionは次を単位として保持する：

```text
Book / Chapter / Verse
Reading State（Single / Comparison）
View Mode
Translation A / Translation B
実スクロール位置（近似）
```

既存実装の「最近読んだ箇所」履歴はこの一部（Book/Chapter/Verse）をすでに記録している。Design Systemはこれを拡張し、Reading State・View Mode・Translation A/Bも1つの「Reading Position スナップショット」として履歴・セッション復元の両方に使う。Research → Back、Comparison → Single切り替え → Comparison復帰、アプリ再起動後の再開、いずれも同じスナップショット機構を使うことで、「どこから来ても、元の状態に戻れる」という一貫性を保証する。

Mobile Comparison（`ComparisonMobileStacked`）は単一の連続スクロールのため（`03`§5.3）、「実スクロール位置」は`{ side: "A" | "B", verse: n }`という1つの値に単純化できる——AとBそれぞれの位置を別々に持つ必要はない。この単純化がReading Position履歴の既存データ構造で表現できるかは未確認であり、`03`§5.10の要確認事項として扱う。

## 6. State Transition Architecture（まとめ）

```text
                 ┌───────────────┐
   Chapter Nav → │  Reading      │ ← Chapter Nav
                 │  (Single or   │
                 │   Comparison) │
                 └──────┬────────┘
                        │ 語をタップ / さらに調べる
                        ▼
                 ┌───────────────┐
                 │   Research    │  Bible Location・Reading State・View Modeを継承
                 │  (Side Panel) │
                 └──────┬────────┘
                        │ 閉じる / 読書に戻る
                        ▼
                 元のReading State・View Mode・Translation A/Bへ完全復元
```

State Transitionの検証基準（`08 Critical Evaluation`で再度確認する）：

- どの遷移も、Bible Locationを失わないか
- どの遷移も、Reading State（Single/Comparison）を意図せず変えないか
- どの遷移も、View Modeを意図せず変えないか
- Chapter移動が、通常Readingへの強制リセットになっていないか
