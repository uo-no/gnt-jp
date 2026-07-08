# StudyPanel UX Preservation Audit（Phase 23.8）

- 監査日: 2026-07-07
- 目的: Wallace Engine（242 型）を StudyPanel に接続する**前に**、現在の利用体験を壊さず改善可能かを監査する。焦点は「何を追加するか」ではなく**「何を壊してはいけないか」**
- 本フェーズ: コード変更 0・UI 変更 0・Registry 変更 0（実コード読査に基づく監査のみ）
- 準拠: 設計理念正典（studypanel-design-principles.md・原則 1「補助であって代行ではない」）

---

## 1. 現在の利用者フロー監査

### 実測フロー（index.html 実コードより）

```
聖書本文（並列訳 / 読解フロー）                    …… 読書の主役・常時
  ↓ 節番号 or 語をタップ
節パネル（語チップ一覧 wlv + 「この節の読書メモ」）    …… 節の見渡し
  ↓ 語チップをタップ
単語詳細（LEVEL 1〜3 + リンク）
  ├ LEVEL 1（常時）: 見出し語 + 日本語グロス → rn-prose 1 文 → 経験者ラベル → 使用傾向
  ├ LEVEL 2（折りたたみ「単語を詳しく調べる」）: 形態グリッド・語源・Abbott-Smith 全文
  ├ LEVEL 3（折りたたみ「意味が近い語と比べる」): セマンティックレイヤー
  └ さらに調べる（常時）: 用例 / 語形 / 同じ構文 の 3 リンク（別画面へ）
  ← panelGoBack = 常に 1 階層だけ上へ（デスクトップ #panel-back-btn / モバイル #mobile-panel-back）
  ← closeStudyPanel = scrollTop 保存 → reopen で 2 段 rAF 復元
```

- **最初に見る情報**: 見出し語 + グロス（利用者の Q1「何？」への即答 — 現 UI で最も成功している応答）
- **クリック後に増える情報**: rn-prose 1 文・使用傾向・折りたたみ 2 つ・リンク 3 つ（LEVEL 1 は 1 画面に収まる量）
- **情報階層**: 常時 → 折りたたみ → 折りたたみ → 外部リンク、の 4 段。深掘りは常に**利用者の操作**で起きる（自動展開なし）
- **状態管理**: `StudyPanelState`（isOpen/height/scrollTop/isDragging）の一元管理・URL 共有からの復元（節→語の順で 1 フレーム遅延復元）・`_adjustReadingAreaForPanel` は「選択節が隠れる場合のみ差分スクロール」（scrollIntoView 禁止・固定 px 禁止）・モバイルは専用戻るボタン + word 時 80vh 上限 + flex-basis 収縮

### 評価

**骨格は初心者の本文理解に適合しており、優秀である。**「タップ → 即答 → 望めば深く → 必ず 1 段ずつ戻れる」という動線・「読書位置を絶対に飛ばさない」スクロール規約・静寂優先は、そのまま Phase 24 以降の器になる。問題は骨格ではなく**中身**（LEVEL 1 の 1 文が空疎・LEVEL 2 の筆頭が文法表・4 問中 3 問が未回答 — Phase 22.5）。

---

## 2. Reading Note 現状監査

- **種類**: ①節パネルの passage note（節ごとの discourse 文を combine() で 1 文に統合）②単語詳細の rn-prose（その語が属する最狭節の discourse 文 = ①と同一文になる）
- **生成条件**: discourse.type が UNCLASSIFIED 以外 / 語が節に属する。満たさなければ**完全非表示**（固定文で埋めない）
- **参照データ**: 節の discourse.type（14 種）+ clause.type（5 種）のみ。**Wallace Engine の情報利用は 0%**（syntaxResults は構造検出にのみ使用）
- **文章品質**: 文体統一（「ここでは、〜されています。」敬体・分析語ゼロ）・combine() の接続リズム（「、/、そして/、さらに」を discourse 種別で選択）・`assertReadingTextSafe` による内部用語漏れガード — **文の品質管理基盤は堅牢**

### A. 維持すべき既存資産（壊してはいけない）

1. 文体（「ここでは、〜」・敬体・1 文・分析語ゼロ）と combine() の読書リズム
2. **静寂優先**: 出せる内容がなければ何も出さない（フォールバック文で埋めない）
3. ReadingFormatter = 唯一の自然文生成源 + assertReadingTextSafe ガード
4. confidence 数値・marker・discourse.type を UI に出さない原則
5. 語チップの手書きミニ文言（CONJ_SIG「なぜなら、と理由へ進む」等）— 素朴だが理念に最も近い文体の実例

### B. 改善対象（中身の欠落 — Phase 21–22.5 の台帳と同一）

なぜこの訳になるか（Q2・242 型未接続）/ まとまり情報（Q3・Phrase 空洞）/ 流れ情報（チップ CONJ_SIG に孤立・9 マーカーのみ）/ 再会情報（Q4・概念なし）/ Wallace 根拠（wallace_ref 等未使用）。

---

## 3. 情報接続経路監査

```
SyntaxAnalyzer.analyzeAll ──→ syntaxResults ──→ PhraseAnalyzer（registry 空 = 生成ゼロ）
                                   │                    ↓
                                   │（★教育情報はここで消える） ClauseAnalyzer
                                   │                    ↓
                                   ✗ 廃棄            discourse 14 種 + clause.type 5 種
                                                        ↓
                                                  ReadingFormatter（47 文・33 到達不能）
                                                        ↓
                                                    StudyPanel
```

- **粒度が落ちる点**: トークン粒度 → 節粒度（不可逆）。**情報が失われる点**: syntaxResults の候補列が構造検出後に捨てられる
- **最小変更の挿入点**: `_getWallaceClauseAnalysis()`（index.html）は既に `sa.analyzeAll(words)` の結果を手にしている（現在は clauseResults しかキャッシュしていない）。**Reading Support Projection はこの既存パイプラインの副産物（syntaxResults・ctx.phrases）を読むだけで成立**し、SyntaxAnalyzer にも ReadingFormatter にも触れない**並列位置**に挿入できる

### 判断: **B — 既存 Formatter を維持し、補助 Projection を追加する**

理由: ①Formatter は Reading 文の唯一生成源として品質保証機構（文体・combine・安全ガード）を持つ検証済み資産であり、置換は全読書文言を一斉にリスクへ晒す ②Projection は additive（無ければ何も出さない = 静寂優先と両立）で、失敗モードが「現状維持」に縮退する ③正典の役割分担とも一致する — Formatter の節文は「文脈の一言（Clause 層）」として残り、Projection が Q2/Q3（語・かたまり層）を新たに担う ④A 案（置換）は 23.6 の代替テスト・帰還テストを再設計から適用し直す必要があり、変更量・回帰面で不利。

---

## 4. UI 情報量監査

242 型の情報（type / hint / Wallace 説明 / alternatives / confidence / related）を**無階層に追加した場合のリスク**: LEVEL 1 が分析語で汚染される（正典 §8 違反）・選択麻痺（alternatives の羅列）・確度数値の露出（既存原則違反）・モバイル 80vh からの溢れ・「押しても増えない」問題が「押したら溢れる」問題に反転。**よって追加は必ず階層に割り付ける**:

| Layer | 表示条件 | 内容 | 既存の器 |
|---|---|---|---|
| **Layer 1 本文理解** | 常時 | 本文の言葉を使った 1 文（型名・用語なし） | 既存 rn-prose の**座席をそのまま使い、文の中身だけ良くする** |
| **Layer 2 理解補助** | 展開表示 | かたまり（Q3）・観察 1 点・流れの一言 | 既存 `details.rn-level-section` パターン（新 UI 部品不要） |
| **Layer 3 構文根拠** | 必要時 | 名前（label_ja）→ 平易な説明 → 聖書内の似た箇所（example） | 同上（LEVEL 2/3 と同型の折りたたみ） |
| **Layer 4 研究情報** | 外部 | alternatives・wallace_ref・多層ビュー | 既存「さらに調べる」リンク（**型を引き継ぐ**改良のみ）→ Syntax Search |

confidence は**どの層でも数値を出さない**（Layer 2 で「解釈が割れる箇所」の扱いにのみ内部利用）。

---

## 5. StudyPanel API 監査

| API | 状態 | 判定 |
|---|---|---|
| ReadingFormatter.format / combine | **使用中**（passage note・rn-prose） | 維持（唯一の文生成源） |
| _WALLACE_TEXT（47 文） | 使用中 14 + **到達不能 33** | 33 は Layer 1/3 の素材として将来利用可能 |
| **ReadingNoteLibrary（generateNote / suggest / group / cluster）** | **未使用**（UI からの呼び出し 0 — **suggest の 5 マーカー Tips も実際は表示されていない**。Phase 21 の記録を本監査で訂正） | 将来利用可能（Projection の部品候補）。削除は不可（core 資産・テスト対象） |
| **StudyPanelAdapter（5 カード）** | **未使用 — 原因判明: 意図的** | Phase 11D/12 で「Inspect/Study モード」という**未実装の別画面**向けに設計され、「Reading 面のテキスト生成経路には関与させない」制約付きで温存されたもの（コード内注記に明記）。孤児ではなく**設計済みの受け皿** — Layer 2–4 の ViewModel 候補として将来利用可能。削除候補ではない |
| phraseCard | 未使用（供給元 PhraseAnalyzer が空 registry で生成ゼロ） | 将来利用可能だが、Phrase 情報は Projection が Context Engine の ctx.phrases を読む方が最小変更（Phase 23 §9） |
| syntax data bridge | **存在しない** | Phase 24 の新設対象 = Reading Support Projection |
| UI バインディング | rn-\* を innerHTML 直接構築（アダプタ層なし） | 現状維持（変更は器の中身のみ） |

**削除候補: なし。** 未使用 API はいずれも意図的温存または将来の受け皿であり、削除は資産の廃棄になる。

---

## 6. 既存 UX 破壊リスク評価 — 「壊してはいけないもの」台帳

### Critical（壊れたら読書体験が崩壊する）
1. **主導線と戻る動作**: 本文→節→語の 3 階層・「戻る = 常に 1 階層上」・close→reopen の scrollTop 復元（2 段 rAF）
2. **読書位置の不可侵**: _adjustReadingAreaForPanel の最小差分スクロール規約（scrollIntoView 禁止・固定 px 禁止）
3. **静寂優先**: null → 完全非表示。Projection が「毎回何か言う」機構になった瞬間に崩壊する
4. **Layer 1 の無用語性**: 型名・確度数値・marker を常時層に出さない
5. **非同期の安全機構**: 世代カウンタ（_wlvResonanceGen / _wallacePassageNoteGen）と words 参照キャッシュ（_wallaceClauseCache）— Projection が重い**同期**処理を挟むと読書が止まる。既存の「非同期 + 古い結果を捨てる」パターンに従うこと

### High
6. ReadingFormatter 唯一生成源 + assertReadingTextSafe（新しい文もこの検査を通す）
7. URL 共有復元（節→語の遅延復元手順）
8. モバイル: 80vh 上限・flex-basis 収縮・#mobile-panel-back — 情報追加は折りたたみ内に限る

### Medium
9. 既存文言のスナップショット不在 — 表示文の回帰テストがないため、文言変更は目視検収が必要（エンジン側 1630 スイートは表示文を守らない）
10. 語チップの CONJ_SIG/CASE_SIG（第 3 の文言源）— 統合するまでは**変更しない**（二重管理だが現に機能している）

### 変更量見積り（Phase 24 実施時）
UI 変更 = 小（既存座席の中身 + 折りたたみ 1〜2 枚）/ データモデル = additive（Projection 新設のみ）/ API 変更 = **0**（全て読み取り）/ エンジン Regression = **0**（読むだけ・1630 スイート不変）/ モバイル = Medium（折りたたみ厳守で制御可能）。

---

## 7. 推奨実装方針（Phase 24 への提言）

```
本文（読書の主役）
 ↕ 語タップ / 帰還（原則 1）
StudyPanel — 既存の器を一切作り替えない
 ├ Layer 1: 既存 rn-prose の座席 ←「本文の言葉の 1 文」
 ├ Layer 2/3: 既存 details 折りたたみ ← かたまり・観察・名前・似た箇所
 └ Layer 4: 既存「さらに調べる」← 型を引き継いで Syntax Search へ
        ↑
Reading Support Projection（新設・読み取り専用・文章を持たない・非同期）
        ↑ syntaxResults（既存パイプラインの副産物）+ ctx.phrases + registry + 頻度統計
Wallace Engine 242 型（凍結・変更ゼロ）
```

実装原則: **additive only**（既存表示の削除・置換をしない）/ 座席は既存・変えるのは中身 / 新しい文も ReadingFormatter 経由 + 安全ガード / 非同期 + 世代カウンタの既存パターン / すべての新表示に 23.6 の 5 テスト（帰還・代替・順序・4 問・静寂）を適用。

**総合判定: 現 StudyPanel の UX 骨格（動線・階層・静寂・復元・モバイル対応）は保全に値する完成度であり、Wallace Engine の接続は既存の器の中身を埋める additive な Projection 方式で、UX を壊さずに実現可能である。** 本監査の §6 台帳を Phase 24 の検収チェックリストとすること。
