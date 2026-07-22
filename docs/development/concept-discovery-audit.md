# Concept Discovery Audit — Phase UX-5-1

作成日: 2026-07-14  
対象ファイル: `search-tool.html`  
データソース: `assets/data/search-concepts.json`（変更禁止）

---

## 0. 前提データ確認

| 項目 | 値 |
|---|---|
| Concept 数 | 37 |
| Related edges | 172 |
| Aliases | 65 |
| Lemma terms | 115 |
| Patterns 接続済み | 2 concepts（love, prayer） |
| SyntaxTypes 接続済み | 1 concept（prayer: 祈願の希求法） |

---

## 1. 現在 UX 評価

### 1-1. 空き状態（初回体験）の構成

現在の `#state-empty` は上から順に:

```
λόγος                         ← glyph
聖書を検索する                 ← title
日本語・ギリシャ語・Strong番号  ← desc

[最近の検索] （UX-4-2で追加、履歴ありの場合のみ）
[愛][信じる][ἀγαπάω][罪][希望][恵み]   ← example chips（固定）

[テーマから探す]               ← pattern-search-section（非同期ロード後表示）
[互いに+命令形][μηνα+命令形][ἵνα+接続法][εαν+接続法]   ← pattern chips
```

### 1-2. 評価スコア

| 観点 | スコア | 問題 |
|---|---|---|
| 初回ユーザーへの検索語提示 | ★★★☆☆ | 例チップはあるが「なぜこの語か」が伝わらない |
| 空状態からのテーマ探索 | ★★☆☆☆ | Pattern chips（文法パターン）はテーマ探索ではない |
| 検索語を知らない人への導線 | ★★☆☆☆ | 37 Concept の存在がユーザーに見えない |
| Concept Insight 到達率 | ★★★☆☆ | 「愛」など Concept 発火語を知っている人は到達できる |

### 1-3. 現在の Concept の役割

```
検索語入力（ユーザーが知っている語に依存）
↓
Concept 発火（resolveConcept が aliases・terms をマッチ）
↓
Insight 表示（関連ギリシャ語・関連概念・さらに詳しく）
```

**問題:** Concept Graph はユーザーが正しい検索語を入力できたときのみ機能する。  
「聖書を探求したいが、何を検索すればいいか分からない」層に届かない。

---

## 2. Concept 公開候補分類

分類基準:

- **A 検索入口候補:** 一般読者が意味を理解できる・聖書テーマとして自然・調べたい動機が生まれる・誤解が少ない
- **B 検索後 Insight 向き:** 重要だが入口としては抽象的・文脈理解が必要
- **C 入口には不向き:** 神学的説明が必要・初心者が検索語として選びにくい

### A: 検索入口候補（13件）

| id | label | aliases | terms数 | related数 | 入口適性理由 |
|---|---|---|---|---|---|
| love | 愛 | 愛する・愛情 | 4 | 3 | 最普遍的日本語。現 example chip に既存 |
| prayer | 祈り | 祈る・願う | **7** | 5 | 日常的動作語。terms 最多で展開豊富 |
| salvation | 救い | 救う・救済 | 4 | **14** | related 最多。福音の核心語 |
| sin | 罪 | 罪人・罪を犯す | 4 | 7 | **1009件**（最頻出）。moral concept で誰でも分かる |
| hope | 希望 | 望み・望む | 3 | 6 | 普遍的感情語 |
| faith | 信仰 | 信じる・信頼 | 3 | 11 | related 2位。Concept 網の中枢 |
| christ | キリスト | メシア | 1 | 4 | 中心人物。非クリスチャンにも既知 |
| cross | 十字架 | 十字架につける | 2 | 3 | 視覚的・具体的。宗教的シンボルとして既知 |
| resurrection | 復活 | よみがえり | 4 | 5 | 具体的・印象的。復活節で馴染みあり |
| grace | 恵み | 恩恵・恵む | 3 | 7 | 現 example chip に既存。キリスト教特有概念 |
| joy | 喜び | 喜ぶ | 2 | 4 | 普遍的感情語 |
| thanksgiving | 感謝 | 感謝する | 2 | 3 | 日常語 |
| peace | 平安 | 平和 | 5 | 3 | 普遍的感情語。aliases「平和」で非クリスチャンにも通じる |

### B: 検索後 Insight 向き（14件）

| id | label | Insight向き理由 |
|---|---|---|
| righteousness | 義 | 神学的（義認・正義など）。「sin → righteousness」経路で自然に到達 |
| holy-spirit | 御霊 | 神学的。aliases「聖霊」で一部理解可能。検索後の関連概念として自然 |
| redemption | 贖い | 神学難語（「あがない」も難しい）。「salvation → redemption」経路が適切 |
| reconciliation | 和解 | 文脈依存。「peace → reconciliation」経路で深まる |
| judgment | 裁き | 神学的。related 6件だが単体入口としては重い |
| law | 律法 | 神学背景必要。「sin/faith → law」経路が適切 |
| truth | 真理 | 哲学的広義性あり。「faith → truth」経路が安全 |
| temptation | 誘惑 | aliases「試練」含む。「prayer → temptation」経路が自然 |
| perseverance | 忍耐 | 日常語だが聖書的深みは文脈依存 |
| obedience | 従順 | 神学的含意。「faith → obedience」経路で深まる |
| witness | 証し | 「証人」の方が一般的。文脈依存 |
| god | 神 | 日本語「神」は神道との区別が曖昧。検索後に概念的深みが出る |
| repentance | 悔い改め | やや難語だが related 3件で到達可能 |
| gospel | 福音 | 重要だが「何が良い知らせか」の文脈が必要 |

### C: 入口には不向き（10件）

| id | label | 非入口理由 |
|---|---|---|
| holy | 聖 | 抽象的な形容詞的概念。単体では「何を調べるか」が不明 |
| kingdom | 御国 | 「神の国」「天国」「御国」解釈が複数あり誤解を招く |
| glory | 栄光 | 神学的抽象概念。日常語的感覚では「賞賛」と混同されやすい |
| mission | 宣教 | 教会関係者向け専門語 |
| church | 教会 | 具体的だが「建物」と「信徒共同体」の区別が必要 |
| disciple | 弟子 | 物語文脈に依存。単体では広義すぎる |
| forgiveness | 赦し | 「許し」との字の違いが初心者に不明瞭 |
| eternal-life | 永遠の命 | ラベルが長い。文脈なしでは空虚に聞こえる |
| death | 死 | 普遍語だが聖書的 θάνατος（霊的死・物理的死）用法は複雑 |
| worship | 礼拝 | 宗教専門語。既存信者向け |

---

## 3. 表示方法比較

### A案: 空状態に Concept チップ表示（Top 8〜13）

```
聖書を検索する
日本語・ギリシャ語・Strong番号で検索できます

[最近の検索]（履歴あり時のみ）
  [愛] [罪] [希望]

[テーマから探す]           ← 新規セクション（既存の #pattern-search-section の上）
  [愛] [祈り] [救い] [罪] [希望] [信仰] [キリスト] [十字架]

[例]                       ← 既存 example chips（重複語を整理）
  [信じる] [ἀγαπάω]

[検索パターン]（非同期ロード後）
  [互いに+命令形] ...
```

**評価:**

| 観点 | 評価 |
|---|---|
| 初心者向き度 | ★★★★★ — テーマ名が見えるだけで探索意欲が生まれる |
| 情報量 | ★★★★☆ — 8件程度なら過多にならない |
| 既存 UI との整合性 | ★★★★★ — `.ex-chip` スタイル・`display:none` パターン再利用 |
| 実装コスト | ★★★★☆ — HTML + JS 1関数（`_renderConceptDiscoveryChips()`） |
| 既存 example chips 重複 | 要整理 — 愛・罪・希望・恵みが両方に出る（統合が望ましい） |

### B案: 「テーマから探す」ページ追加

**評価:**

| 観点 | 評価 |
|---|---|
| 学習価値 | ★★★★☆ — Concept の全体像が把握できる |
| 複雑化リスク | ★★☆☆☆ — 単一 HTML ファイルへのページ追加はルーティング不要だが責務超過 |
| 実装コスト | ★★☆☆☆ — display:none/block トグルで実装は可能だが保守性が下がる |
| StudyPanel との重複 | リスクあり — 概念解説ページは StudyPanel の役割と競合する |

→ **非推奨。** 別ファイル（concept-browser.html）ならあり得るが、search-tool.html の責務を超える。

### C案: 検索後のみ Related Concept から展開（現行維持）

**評価:**

| 観点 | 評価 |
|---|---|
| シンプル性 | ★★★★★ — 実装ゼロ |
| 発見性 | ★★☆☆☆ — 正しい語を知っている人のみ恩恵を受ける |
| Pattern chips との一貫性 | ★★☆☆☆ — 文法パターンは空き状態に出るのに概念テーマは出ない、アンバランス |

→ **補完として維持**。A案と組み合わせて「空き状態でも検索後でも Concept に触れられる」体験にする。

---

## 4. Progressive Disclosure 評価

### 初回画面に表示すべきもの（推奨構成）

```
level 0 （常時表示）
  └ glyph + title + desc

level 1 （履歴あり時のみ: UX-4-2 実装済み）
  └ 最近の検索（最大5件）

level 2 （Concept チップ: 新規追加候補）
  └ テーマで探す Top 8（非同期ロード後 _loadSearchConcepts が完了次第）

level 3 （既存 example chips: 整理後）
  └ 例: 信じる / ἀγαπάω（Concept chips と重複する語は除外）

level 4 （Pattern chips: 既存）
  └ テーマから探す（パターン検索）
```

### 避けるもの

| 項目 | 理由 |
|---|---|
| 37件全 Concept 一覧 | 情報過多。最初の画面で全件出すと「どこから始めれば」になる |
| Greek lemma 一覧 | 非専門家には接続できない |
| Louw-Nida / 神学分類 | 専門性が高すぎる |
| ドメイン分類 (`dom` フィールド) | 現データでは全件空文字列のため利用不可 |

---

## 5. Concept ランキング案

### Top 5（必須）

| rank | id | label | 根拠 |
|---|---|---|---|
| 1 | love | 愛 | 最普遍的日本語・631件・aliases 3件・既存 example chip |
| 2 | salvation | 救い | related 14件（最多）・福音の核心語・aliases「救い主」含む |
| 3 | sin | 罪 | 1009件（最頻出）・moral concept・aliases「罪人」含む |
| 4 | faith | 信仰 | related 11件（2位）・Concept 網の中枢・aliases「信じる」 |
| 5 | prayer | 祈り | terms 7件（最多）・日常的動作語・syntax 接続済み |

**ランキング根拠の明記:**
- 「件数」= 語根検索の NT ヒット数（resolveTerm による）
- 「related 数」= search-concepts.json の related 配列長（Concept 展開の深さ）
- 「初心者理解度」= aliases に日常語が含まれるか、文脈不要で意味が伝わるか

### Top 10（推奨表示数）

| rank | id | label | 追加根拠 |
|---|---|---|---|
| 6 | christ | キリスト | 中心人物・aliases「メシア」・related 4件 |
| 7 | resurrection | 復活 | 具体的・印象的・復活節で既知 |
| 8 | cross | 十字架 | 視覚的・具体的・非クリスチャンにも既知 |
| 9 | grace | 恵み | キリスト教特有概念・related 7件・既存 example chip |
| 10 | hope | 希望 | 普遍的感情語・related 6件 |

**注:** Top 8 が空き状態の1行に収まる上限（`.ex-chip` の折り返しを考慮）。Top 10 は詳細ページや「すべて見る」展開のために確保。

---

## 6. 既存機能への影響確認

| コンポーネント | 監査結果 |
|---|---|
| resolveTerm | 変更禁止・監査対象外。A案では読み取り利用のみ |
| resolveConcept | 変更禁止・監査対象外。Concept 発火経路は現行維持 |
| search-concepts.json | 変更禁止。Top 8 選定はこのファイルの既存データから導出 |
| Wallace Engine | 変更禁止・監査対象外 |
| Pattern Engine | 変更禁止・監査対象外。`#pattern-search-section` との共存確認済み |
| StudyPanel | 変更禁止・監査対象外。本文タブは独立 |
| Concept Insight | 変更なし。検索後発火経路は現行維持 |

---

## 7. 推奨 UX 案

**A案（Concept chips）＋ C案（既存 Insight 維持）の組み合わせ**

```
[空き状態]                      [検索後]
  最近の検索（UX-4-2）            Concept Insight
  ↓                               ↓
  Concept chips（新規）           「関連する概念」チップ
  [愛][祈り][救い][罪][希望]      [信仰][恵み][喜び]
  [信仰][キリスト][十字架]         ↓
  ↓                               次の Concept Insight（チェーン）
  example chips（整理後）
  [信じる][ἀγαπάω]
  ↓
  Pattern chips（既存）
```

**「テーマを見て検索する（探索型）」と「語を知って検索する（検索型）」の両方をカバー。**

---

## 8. 実装優先順位案

### UX-5-2（次フェーズ推奨）: Concept Discovery Chips

変更対象:
- `search-tool.html`:
  - HTML: `#state-empty` 内に `#concept-discovery-section` を追加（`#history-recent-section` と `#pattern-search-section` の間）
  - JS: `_loadSearchConcepts()` 完了後に `_renderConceptDiscoveryChips()` を呼ぶ（Top 8 選定ロジックをここに持つ）
  - CSS: 既存 `.ex-chip` / `.empty-section-label` を再利用。新規トークン不要
  - example chips の整理: Concept chips と重複する「愛・罪・希望・恵み」を除外し、「信じる・ἀγαπάω」の2件に絞る

変更禁止: `search-concepts.json`・`resolveTerm`・`resolveConcept`・その他禁止コンポーネント

### UX-5-3（その次）: Related Concept Chain 強化

- Insight 内「関連する概念」から次の Concept Insight に遷移したとき、Insight の内容が更新される（現在: 検索後 Insight は最初の Concept のまま）

### UX-5-4（発展）: Concept サジェスト連携

- 検索入力途中で Concept label / aliases にマッチした場合、サジェスト候補に Concept を表示

---

## 9. 実装時に変更すべきファイル範囲（要約）

| ファイル | 変更内容 | 変更量 |
|---|---|---|
| `search-tool.html` | HTML: `#concept-discovery-section` 追加、JS: `_renderConceptDiscoveryChips()` 追加、example chips 整理 | 小（30行程度） |
| `assets/data/search-concepts.json` | **変更禁止** | — |
| `css/tokens.css` | 変更不要（既存トークン流用） | — |
| `index.html` | **変更禁止** | — |

---

## 付録: 参照ファイル

- [concept-discovery-candidates.json](output/concept-discovery-candidates.json) — 37件分類 + Top5/Top10 の機械可読データ
- [search-experience-audit.md](search-experience-audit.md) — Phase UX-3 全体 UX 監査
