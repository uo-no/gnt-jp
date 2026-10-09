# StudyPanel Layer Architecture 仕様（Phase ESM-14〜28）

作成: 2026-08-05
最終更新: 2026-08-05（Phase ESM-50-A、§4 Lemma/Strong根拠明文化・role参考記録追加）
位置づけ: Desktop StudyPanel / Mobile MVV（MobileVerseView）における単語情報の表示階層を、
Phase ESM-14〜27の監査（コード読解・実ブラウザ検証）で確認した**現在の実装事実**として固定する。
本書は**仕様の新設ではなく、既に実装されている構造の記録**である。ESM-23〜28時点でコード変更・UI変更は行っていない。

**用語上の注意（CLAUDE.mdとの関係）**: CLAUDE.md §8 が定義する「3階層 + 単純な戻る」（本文 → 節パネル → 単語詳細）は**ナビゲーション深度**（画面遷移と戻る操作の単位）を指す。本書が定義する Layer 1/2/3 は、それとは別の軸である**情報の目的による分類**であり、特に Layer 2 と Layer 3 は同じ「単語詳細」画面の中に共存する（常時表示か折りたたみかで区別される）。両者は数字が同じ「3」だが指しているものが異なるため、混同しないこと。対応関係は本書 §1 末尾の表を参照。

---

## 1. 基本思想

### Layer 1 — 「本文を読む入口」

**責務**: 節を見る／Greek Flowを見る／単語を識別する。

**含む情報**: Greek／最小Gloss／詳しく見る導線。

**現在の実装**:
- 節を見る: `_openWordListInternal()` → `#word-list-view`（Desktop）／`_mobileInspectorRender()` → `#mobile-inspector-area`（Mobile、listモード）
- Greek Flowを見る: `renderColumn()` / `WordOrderRenderer`（Desktop/Mobile共有）
- 単語を識別する（ドロワー）: `WordOrderRenderer`内`drawerHTML`（Desktop/Mobile共有コンポーネント）。Greek／Gloss／「詳しく見る →」のみで構成（ESM-18でresonance文を除去済み）。

### Layer 2 — 「読むための理解」

**責務**: 単語が文中でどのように働くかを理解する。

**含む情報**: Gloss／Wallace Reading Notes／Referent Evidence／Phrase Reading／Observation／Subjref。

**現在の実装**:

| 情報 | Desktop | Mobile |
|---|---|---|
| Gloss | `.rn-word-head .rn-ja`（常時表示） | `.mvv-l3-word`内（常時表示） |
| Wallace Reading Notes | `.rn-prose`（常時表示、条件付き） | `#mvv-reading-slot`（常時表示、条件付き、ESM-20） |
| Referent Evidence | `.rn-referent-evidence`（常時表示、条件付き） | `#mvv-reading-slot`内でWallace文と結合（常時表示、ESM-20） |
| Phrase Reading | 常時表示（条件付き） | `#mvv-reading-slot`（常時表示、条件付き、ESM-36） |
| Observation | 実装済み（条件付き、ESM-44-B表示整形済み） | 実装済み（ESM-45-B-1） |
| Subjref | `.rn-subjref-evidence`（常時表示、条件付き、ESM-39） | `#mvv-reading-slot`内で他要素と結合（常時表示、条件付き、ESM-39） |

### Layer 3 — 「さらに調べる」

**責務**: 必要な場合のみ深掘りする。

**含む情報**: Morphology／Lemma／Strong／Dictionary／Usage Trends／類義語比較／Research Links。

**現在の実装**:

| 情報 | Desktop | Mobile |
|---|---|---|
| Morphology | 「単語を詳しく調べる」折りたたみ | 同名折りたたみ |
| Lemma | 不在 | 「単語を詳しく調べる」折りたたみ |
| Strong | 不在 | 同上 |
| Dictionary | 「単語を詳しく調べる」折りたたみ（条件付き） | 不在 |
| Usage Trends | 「単語を詳しく調べる」折りたたみ | 不在 |
| 類義語比較 | 「意味が近い語と比べる」折りたたみ（`_buildClusterLayerHTML`、対話的） | 「意味を見る」折りたたみ（`_fillMvvSemanticSlot`、ドメインラベル列挙のみ） |
| Research Links | 「さらに調べる」折りたたみ | 不在 |

### CLAUDE.md「3階層」との対応関係

| CLAUDE.md の3階層 | 本書の Layer |
|---|---|
| 本文（Reading） | Layer 1 の前段（chip未クリック状態） |
| 節パネル | Layer 1 |
| 単語詳細 | Layer 2（常時表示部分）＋ Layer 3（折りたたみ部分）が同一画面に共存 |

---

## 2. Desktop / Mobileの設計方針

**Desktop**: 研究まで含めたフル読書環境。Layer 1〜3のすべての情報を、常時表示（Layer 2）と折りたたみ（Layer 3）に区別しつつ、単一のStudyPanel内に揃える。

**Mobile**: Desktop縮小版ではなく、**読むことを中心に再構成した別UI**。根拠は `_mobileInspectorDetail()` のコメント「自動生成 Reading Notes（`_renderReadingNotes`）は移植しない」であり、Desktopの情報生成関数をそのまま流用せず、必要な要素だけを個別に選び直して再配線する設計になっている（詳細はESM-21/22監査を参照）。

ただし以下はDesktop/Mobileで共有する：
- Layer 1（節パネル・Greek Flow・ドロワーは同一コンポーネント）
- Wallace Reading Notes（`_buildWordResonanceText()`を両者が同一引数パターンで呼ぶ。生成元・文言・表示条件が一致することをESM-21で実測確認済み）
- Referent Evidence（`_resolveReferentEvidenceText()`を両者が使用。生成元が一致）
- Morphology等一部Layer3情報（Morphologyは両者に存在。Lemma／Strongは§4参照）

**Mobile類義語比較の従来方針（ESM-27/28、2026-10一時停止）**: 従来はMobile版（`_fillMvvSemanticSlot()`、ドメインラベル列挙のみ）を現状維持としていたが、LN 注釈の利用・再配布条件と関連語候補の精度が未確認のため、2026-10時点では Desktop / Mobile の両方で LN 由来の関連語・意味グループ表示を一時停止する。関数とデータは削除しない。再開条件は `docs/DATA_LICENSE.md` を参照する。

理由:
- Mobileは独立した読書UIであり、Layer3であっても研究機能を全面移植する設計にしない（本節冒頭の方針と一致）。
- ドメインラベルの表示は既存の語義分類情報の転写であり、L-0境界（語義推定禁止）に抵触しない。
- Desktop相当の比較検索機能はDesktop側StudyPanelの責務として保持する。

---

## 3. 意図的な非一致（確定仕様）

以下はMobile非搭載として**正式仕様**である（ESM-27/28で確定）：

- Usage Trends
- Dictionary
- Research Links

**理由**:
- いずれもLayer 3（「さらに調べる」）に分類される（§1参照）。
- Mobileの「読むことに集中したUI」という設計方針（§2）と一致する。
- Desktop側StudyPanelの研究補助機能として、Desktop側の責務内に保持する。

**コード根拠**: `_mobileInspectorDetail()` が `_renderReadingNotes()` をそのまま移植しない設計であるため（同関数のコメントに明記）。全文検索の結果、これら3項目の生成コード（`usageTrendsHTML`／`abbottFullHTML`／`.rn-research-links`）は `_renderReadingNotes()` 内でのみ呼び出されており、Mobile側からの呼び出しは存在しない（ESM-21確認済み）。

※この非搭載は**「永久に追加しない」という禁止ではなく、現時点の責務分離**として記録する。将来Mobileへの追加を検討する余地は残す。

**Phrase Reading／Observationについて（過去の設計課題・解消済み）**: 同じ `_mobileInspectorDetail()` の非移植コメントの対象に含まれていたが、この2項目はLayer 2（「読むための理解」）に分類されるため、上記3項目とは異なり非搭載を正式仕様として確定させなかった。当時（ESM-27/28時点）は、Layer 2はWallace Reading Notes／Referent Evidenceと同格の「読むために必要な情報」であるべき（§1）にもかかわらず非搭載である点に、Layer設計上の未解消の緊張があった。**この緊張は、Phrase ReadingのMobile追加（ESM-36）およびObservationのMobile追加（ESM-45-B-1）により解消済みである。** 両項目とも現在はDesktop/Mobile双方に実装されている。詳細は§4を参照。

---

## 4. 未確定事項

以下は仕様として未決定であり、本書はいずれの方向性も規定しない：

**注記（ESM-46-B）**: 本章には、現時点でも仕様未決定の項目（Lemma／Strong、Frame）と、既に実装済みで「現状の記録」へ位置づけが変わった項目（Phrase Reading／Observation／Subjref）が混在している。章タイトルは制定時（ESM-23）のまま維持しており、各項目冒頭の「状態」表示が現在の実装状況を示す一次情報である。

- **Lemma／StrongをDesktopにも追加するか**
  - **Layer 3分類の根拠**（ESM-47-A／49-A確認）: Lemma／Strongは、Layer 2の定義「単語が文中でどのように働くかを理解する」（§1）には該当しない。両者は文中での働きではなく単語そのものの同定情報（見出し語形・辞書番号）であり、読解に必須ではなく辞書引き・原語研究の入口情報という性質を持つ。この点でLayer 3（「さらに調べる」）の定義と整合する。
  - Desktop不在の理由を示す明示コメントはコード上に存在しない（ESM-26確認済み）。
  - Mobileには「単語を詳しく調べる」折りたたみ内に存在する。
  - Strongについては、CLAUDE.md §8「読む面に露出させないもの：分類ラベル・confidence数値・語形コード・生マーカー」との整合確認が必要（ESM-27）。Strong番号は語形コードに近い性質の技術識別子であり、Desktop追加の可否はこの原則との関係を先に判断してからでないと決められない。

- **Phrase Reading**（状態: Desktop/Mobileともに実装済み・ESM-36。以下は未確定事項ではなく現状の記録）
  - Layer 2（「読むための理解」）としての位置づけは変更なし（§1）。
  - Desktop・Mobileともに利用可能。Mobile側は`#mvv-reading-slot`（Wallace Reading Notes・Referent Evidenceと同じLayer2常時表示スロット）に統合表示される（ESM-36）。
  - Mobile実装はDesktopの既存生成ロジック`_buildPhraseReadingHTML()`をそのまま共有しており、新しい解析・Projection・Reading Engineの追加は行っていない（ESM-36）。
  - Mobile側では表示方式の違い（textContent専用スロット）により、`_buildPhraseReadingHTML()`が返すHTMLをプレーンテキストへ変換する処理（`_stripHTMLToText()`）を経由するが、これは実装詳細であり解析仕様の変更ではない（ESM-36）。
  - Wallace Reading Notes／Referent Evidenceと同一の解析基盤（`_getWallaceClauseAnalysis()`/`_getReadingSupportProjection()`）を共有する点、節生成率95.9%（7,610／7,939節、ESM-28-B実測）という発生頻度、L-0境界・Desktop品質（角括弧含有率0.37%、ESM-29-B）に関する記述は変更なし。

- **Observation**（状態: **Desktop/Mobile実装済み**。Desktop: ESM-44-B、Mobile: ESM-45-B-1。以下は未確定事項ではなく現状の記録）
  - Layer 2（「読むための理解」）としての位置づけは変更なし（§1）。
  - Desktop・Mobileともに利用可能。Mobile側は`#mvv-reading-slot`（Wallace Reading Notes・Phrase Reading・Referent Evidence・Subjrefと同じLayer2常時表示スロット）に統合表示される（ESM-45-B-1）。
  - 節生成率52.1%（4,136／7,939節、ESM-28-B実測）。
  - Wallace Reading Notes／Phrase Readingと同一の解析基盤（`_getWallaceClauseAnalysis()`/`_getReadingSupportProjection()`）を共有する。
  - 生成ロジックは無変更: `_buildObservationHTML()`／`_OBSERVATION_SENTENCES`／`_WORD_ROLE_TEXT`／`bible_data`／Reading Engineはいずれも変更していない（ESM-44-B／ESM-45-B-1とも）。Frame参照もない。

  **実装**:
  - Desktop: `_renderReadingNotes()`へ統合（ESM-44-B、表示整形適用）。
  - Mobile: `_fillMvvReadingSlot()`へ統合（ESM-45-B-1）。既存の`_buildObservationHTML()`をそのまま利用し、新規解析ロジックは追加していない。`combined`配列へ`observationText`として追加し、挿入位置はPhrase ReadingとReferent Evidenceの間。

  **表示仕様**（Desktop: ESM-44-B、Mobile: ESM-45-B-1で同一仕様を適用）:
  - 角括弧付き引用（「［転換語句］」等）は表示時整形される。
  - `_naturalizeObservationText()`という表示層専用の後処理関数（`_buildObservationHTML()`の戻り値に対してのみ適用、生成ロジック本体には触れない）で処理する。Desktop/Mobile共通で同一関数を使用する。
  - 対象は既知の7パターン（「［転換語句］」「［内容語句］」「［理由語句］」「［目的語句］」「［対比語句］」「［結論語句］」「［条件語句］」）のみの完全一致置換。それ以外の文字列には影響しない。
  - 置換後は「語」という汎用自己参照表現になる（例:「この「［転換語句］」で、話が次へ進みます。」→「この語で、話が次へ進みます。」）。
  - Mobile側では表示方式の違い（textContent専用スロット）により、整形後のHTMLをプレーンテキストへ変換する`_stripHTMLToText()`を経由する（Phrase Readingと同じ実装パターン、ESM-45-B-1）。

  **表示順**: Wallace Reading Notes → Phrase Reading → Observation → Referent Evidence → Subjref（Desktop・Mobile共通。ESM-45-B-1でMobileもこの順序に統一）。

  **L-0境界**（Desktop: ESM-44-B、Mobile: ESM-45-B-1とも確認済み）:
  - 新しい翻訳・推論・語義選択は行わない。
  - 既存Observation生成結果に対する表示整形のみで、データ層（`bible_data`）の変更はない。
  - `_WORD_ROLE_TEXT`の`nominative_pendens`が既に用いている汎用自己参照（「この語が、この文の主題です。」）と同種の表現であり、新しい表現方式の導入ではない。
  - Mobile追加においても`_buildObservationHTML()`／`_OBSERVATION_SENTENCES`／`_WORD_ROLE_TEXT`／`bible_data`／Reading Engineは変更なし、Frame参照もない（ESM-45-B-1）。

- **Subjref**（状態: **Desktop/Mobile実装済み（ESM-39）**）
  - Frameとは分離して扱う（データ形状・実装難度が異なるため、Frame項目とは別個に判断する）。
  - Layer 2（「読むための理解」）情報である（§1）。データ形状は`referent`（Referent Evidenceが使用）と同型の単一参照。
  - Referent Evidence（代名詞・指示詞が指す先）と**補完関係**にある（動詞・分詞の暗示された主語を示す）。
  - NT全体で高頻度: トークン単位12.1%、節単位83.6%（ESM-32-A実測）。
  - Referent Evidenceでは扱えないケースが存在する（ESM-32-B確認）:
    - MAT 2:4「συναγαγών」— 節内に主語を示す名詞・代名詞が無いが、subjrefは前節（MAT 2:3）のトークンを指す。
    - MAT 3:16「ἐρχόμενον」— 主語がイエスではなく「霊」であることを示す。

  **表示文言**: 「この語の主語は「○○」です。」（Referent Evidenceの「この語は「○○」を指しています。」と構造的に対称）。

  **表示条件**（Referent Evidenceと同型）:
  - 単一subjrefのみ（複数値は静寂。実測1,784／16,625＝10.7%が複数値、ESM-32-A）。
  - 解決先の`japanese`が取得可能な場合のみ。
  - 上記いずれかを満たさない場合は静寂（表示しない）。

  **L-0境界**: `bible_data.subjref`が指す参照先tokenの`japanese`を転写するのみ。**複数tokenを結合した人物名・句への変換や意味統合は行わない**（Referent Evidenceと同じFailure Mode=null設計）。

  **表示順**: Wallace Reading Notes → Phrase Reading → Observation → Referent Evidence → Subjref。

  **実装**（ESM-39）:
  - `createSubjrefEvidence(rawToken)`／`_resolveSubjrefEvidenceText(subjrefEvidence)`（`createReferentEvidence()`/`_resolveReferentEvidenceText()`と同型、`public/index.html`）。
  - Desktop: `_renderReadingNotes()`内、`.rn-referent-evidence`の直後に`.rn-subjref-evidence`として挿入。
  - Mobile: `_fillMvvReadingSlot()`の`combined`配列へ`referentLine`の後段として統合。`AppState.toBrowsing()`リセット対策（ESM-25と同型）も`subjrefEvidence`へ適用済み。

  **MAT 2:4例に関する記録**（ESM-39実測）: この語のsubjrefが指す実際のトークンはMAT 2:3の「βασιλεὺς」（王。"ὁ βασιλεὺς Ἡρῴδης"＝「王ヘロデ」という同格句のうちの「王」）であり、表示は「この語の主語は「王」です。」となる。「ヘロデ」という人物名への意訳ではなく、参照先token単体の`japanese`（「王」）をそのまま表示することが、上記L-0境界（複数token結合・意味統合をしない）に沿った**仕様どおりの挙動**である。

  **未確定事項として残すもの**（実装Phase待ち）: 実装コード（`createSubjrefEvidence()`/解決関数等の新設）、Desktop/Mobile UIへの接続、詳細レイアウト（ラベル・区切り・折りたたみ有無等の具体的な表示配置）。これらは本Phaseでは確定しない。

- **FrameをDesktop/Mobileへ追加するか**（状態: 設計研究対象・追加判断保留、ESM-32-A/B）
  - NT全体で高頻度: トークン単位18.4%、節単位95.5%（ESM-32-A実測）。
  - 系図等の文脈で読解価値の可能性がある。例: MAT 1:2「ἐγέννησεν」（A0:Ἀβραάμ、A1:Ἰσαάκ）を自然文化できれば「アブラハムがイサクを生んだ」という関係理解に寄与する可能性がある（ESM-32-B）。
  - ただし、A0／A1／A2等は技術的役割ラベルであり、生表示は禁止。役割ラベルから自然文へ変換するには追加設計が必要。
  - **FrameはSubjrefとは異なり、単純な参照情報の転写ではない。**
  - 確認事項（今後）: 単純参照解決で済むケースと動詞フレームごとの役割解釈が必要なケースの区別、能動態／受動態への対応、L-0境界との整合。

### 参考: `bible_data.role`について（Layer対象外・ESM-46-A-1／48-A／49-A確認）

`bible_data.role`は構文的機能コード（s／o／v／adv等9種、NT付与率33.9%）であり、`reading-engine.js`内の`getRelativeSyntax()`／`getDemonstrativeSyntax()`／`getSemanticInfo()`が読み取り専用で限定利用している。**現状Desktop／Mobileいずれにも表示経路が無く**、本書が扱う表示階層（Layer 1/2/3）の対象には含めない。

**Frameとの違い（混同防止のため明記）**: `role`は値自体が普遍的な構文コード（`s`は常に「主語」を意味する）であり、動詞ごとに意味が変わるPropBank類似の意味役割である`frame`とは別物である。両者は`bible_data`内の別フィールドであり、実装上の関連も無い（Frame自体の実装コードは存在しない）。

**記録要否の判断材料（結論は出さない）**:
- `relativeSyntax.role`／`demonstrativeSyntax.role`は`resolve()`結果へ付帯されるが、下流のどこにも消費されていない「休眠フィールド」である。
- 本書へ記載する場合: Layer外の内部実装情報として、UI非表示である旨の注記付きで参考記録する案がありうる。
- 記載しない場合: 本書のスコープ（StudyPanel／MVV表示階層の記録）に厳密に一致させ、reading-engine関連の技術文書側での記録に委ねる案がありうる。
- いずれを採るかは本Phaseでは判断しない。

### 判断材料の成熟度（横断整理・ESM-33-A）

上記5項目について、Layer分類／既存機能との関係／読解価値／発生頻度／L-0境界／技術情報露出リスク／実装コスト／Mobile追加判断状態の8軸で横断比較した結果を記録する。**これは実装の優先順位付けではなく、各項目についてどれだけ判断材料が揃っているか（成熟度）の整理である。** いずれの項目についても「追加する」「必須」という結論は出していない。

| 項目 | 判断材料の成熟度 | 根拠 |
|---|---|---|
| Phrase Reading | 比較的高い | Layer2分類確定・既存解析基盤共有・Desktop稼働実績（品質面の懸念未報告）・節単位95.9%という高頻度・低実装コストが揃っている（ESM-28-B/C、ESM-33-A）。 |
| Subjref | 比較的高い | `referent`と同型のデータ形状でReferent Evidenceとの補完関係が実例（MAT 2:4／MAT 3:16）で確認済み・高頻度（節単位83.6%）・低実装コスト。ただしDesktop/Mobileいずれにも実装実績が無い新規機能であり、Layer分類は「候補」段階（ESM-32-A/B、ESM-33-A）。 |
| Observation | 中程度 | Layer2分類確定・既存基盤共有だが、表現方式（引用埋込方式での既存bible_data表記規約の扱い）について別途「現状維持・継続検討」の状態にある（ESM-30/31-A）。 |
| Lemma／Strong | 他項目と性質が異なる | Layer3分類（他4項目のLayer2候補とは異なる）。論点はMobile Layer2追加ではなくDesktop側での表示要否であり、Strongについては§8整合の個別確認が前提として残る（ESM-26/27）。 |
| Frame | 相対的に低い | Layer分類自体が未確定（Layer2/Layer3の両候補が残る）・技術的役割ラベル（A0/A1/A2）の解釈が必要なため技術情報露出リスクと実装コストが最も高く、L-0境界の確認も残る（ESM-32-A/B、ESM-33-A）。 |

---

## 5. 開発ルール

今後、StudyPanel／MVVの表示内容を変更する際は以下を基準とする：

- **Layer 1**: 読む入口を汚さない。Greek／最小Gloss／詳しく見る導線以外を持ち込まない。
- **Layer 2**: 読解補助のみ配置する。「単語が文中でどう働くか」を説明しない情報（統計・外部リンク等）を混在させない。
- **Layer 3**: 調査情報は折りたたみ・任意閲覧にする。常時表示域を圧迫しない。

**Desktop/Mobile差分について**: 「DesktopにあるものをMobileへ全部移す」を前提にしない。Mobileは独立した読書体験として判断する。DesktopとMobileの差分を埋める変更を行う場合も、機械的な移植ではなく、Layer 1〜3それぞれの責務（§1）に照らして要否を個別に判断する。

---

## 6. 解決済み履歴

- **`AppState.toBrowsing()` によるinspect.dataリセット問題**（Mobile本文chip直接タップ経路限定でGloss／Strongが欠落していた、ESM-9/16/21で確認）: **ESM-25で修正済み**。`_wlvChipClick()`のMobile分岐で、`referentEvidence`と同じ要領で`jaWordDisplay`／`jaWord`／`strong`を退避・復元する対応を実施。経路A（verse-tap経由）／経路B（本文chip直接タップ）の表示結果が一致することを実測確認済み。§4の未確定事項からは削除した。
