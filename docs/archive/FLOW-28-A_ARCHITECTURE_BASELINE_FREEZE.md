# Phase FLOW-28-A Report — Architecture Baseline Freeze

FLOW-20-A〜FLOW-27-Aの監査結果（FLOW-20-A〜23-Aは本監査シリーズの会話記録、FLOW-24-A〜27-Aは`scratchpad/`内の個別Reportファイル）を統合し、gnt-jpアプリケーションの現在状態をArchitecture Baselineとして記録する。コード・docs・コメントは変更していない。評価表現・改善提案・推測は含まない。統合作業のみを行った。

---

## 1. Audit Artifact Inventory

| Phase | Boundary | Artifact |
|---|---|---|
| FLOW-20-A | Data Contract | 会話記録（本監査シリーズ、`scratchpad/`に個別ファイル無し） |
| FLOW-21-A | Runtime Lifecycle | 会話記録（同上） |
| FLOW-22-A | Rendering Boundary | 会話記録（同上） |
| FLOW-23-A | Failure Boundary | 会話記録（同上） |
| FLOW-24-A | Performance Boundary | `scratchpad/FLOW-24-A_PERFORMANCE_RESOURCE_BOUNDARY_AUDIT.md` |
| FLOW-25-A | Security Boundary | `scratchpad/FLOW-25-A_SECURITY_BOUNDARY_AUDIT.md` |
| FLOW-26-A | Verification Boundary | `scratchpad/FLOW-26-A_TEST_VERIFICATION_BOUNDARY_AUDIT.md` |
| FLOW-27-A | Deployment Boundary | `scratchpad/FLOW-27-A_DEPLOYMENT_ENVIRONMENT_BOUNDARY_AUDIT.md` |

**確認できた事実**: FLOW-01-A〜FLOW-23-Aの成果は`scratchpad/STRUCTURE_AUDIT_SUMMARY.md`／`STRUCTURE_AUDIT_DETAIL_INDEX.md`として既に別途統合済みであることを確認した（本Phaseの対象範囲外）。

---

## 2. System Architecture Baseline Diagram

```
External Resources
   （bible_data／translation JSON、localStorage、URL、Google Fonts CDN）
   |
   | JSON / Storage / URL / CDN（FLOW-20, 25, 27で確認）
   ↓
Data Boundary
   token→ResolveResult→FlowChip→AppState.inspect.dataという
   field copyの連鎖。schema driftとしてjapanese→jaWord、
   morph→rawMorph/morphTextという改名を確認（FLOW-20）
   |
   | FLOW-20
   ↓
Application State / Cache
   AppState（完全代入中心）、4種モジュールレベルキャッシュ
   （words参照等価によるreplace方式）
   |
   | FLOW-21
   ↓
Runtime Lifecycle
   Bootstrap（<script>群→DOMContentLoaded→init()）→
   User Event→State Mutation→Analysis→Rendering→Async Completion
   |
   | FLOW-22
   ↓
Rendering Boundary
   innerHTML/textContent/classList/styleの4方式によるDOM構築。
   _escH()エスケープは箇所により経由・非経由が混在（FLOW-22確認）
   |
   | FLOW-23
   ↓
Failure Handling
   45件のtry/catch、null/空配列/空オブジェクト/固定文字列への
   フォールバック。ユーザー向け明示的エラー表示は1箇所のみ
   |
   | FLOW-24
   ↓
Resource Lifetime
   bible_data等は章単位lazy load。abbottSmithDict／
   _lexiconData等はページ全体保持。4キャッシュは節単位単一スロット
   |
   | FLOW-25
   ↓
Security Boundary
   URL/localStorage/postMessage（受信専用、origin確認なし）の
   各入力境界
   |
   | FLOW-26
   ↓
Verification Boundary
   scripts/*.cjsによる回帰テスト（手動実行）、CI上の自動実行は
   path-check.ymlのみ
   |
   | FLOW-27
   ↓
Deployment Environment
   Cloudflare Pages想定（_headers存在）、明示的build工程は
   確認できず、Google Fonts外部CDN依存あり
   |
   ↓
User Interface
```

---

## 3. Data Architecture Baseline

```
bible_data / translation / lexicon / syntax registry / localStorage / URL
   |
   ↓
Analysis Objects（ResolveResult / ClauseResult / Projection）
   |
   ↓
View Models（Flow Chip / AppState.inspect.data / Mobile Inspector d）
   |
   ↓
DOM
```

| 項目 | 内容 |
|---|---|
| producer | `bible_data`静的JSON（token）、`ReadingEngine.resolve()`（ResolveResult）、`_wordToFlowChip()`（Flow Chip）、`app-storage.js`（localStorage schema）(FLOW-20確認) |
| consumer | Analysis→Projection→Rendering各層。詳細はFLOW-20の Producer/Consumer Mapping表を参照 |
| serialization boundary | `JSON.stringify`/`JSON.parse`（localStorage）、`Response.json()`（fetch、`JSON.parse()`直接呼び出しはindex.html内0件）、`URLSearchParams`（URL）(FLOW-20/25確認) |
| 未消費field | `bible_data.gloss`（consumer確認できず）、`chip.signals`、`ResolveResult.confidence`/`.candidates`（値設定箇所確認できず）、`relativeSyntax.role`/`demonstrativeSyntax.role`（下流未読）(FLOW-20確認) |
| 確認できなかった領域 | fetchしたJSONの内部スキーマ検証（`res.ok`チェック以外の型検証）は確認できなかった(FLOW-25確認) |

---

## 4. Runtime Architecture Baseline

```
Page Load → Bootstrap → init() → State Creation → Fetch → Analysis → Render → Interaction → Navigation
```

| 項目 | 内容 |
|---|---|
| global lifetime object | `AppState`、4種モジュールレベルキャッシュ、`_wallacePipeline`、`window.App.*`はいずれもページロード時から存在しページ全体のライフタイムにわたり保持される(FLOW-21確認) |
| cache lifetime | `_verseResolveCache`/`_wallaceClauseCache`/`_wlvChipCache`/`_wlvWordCache`はいずれも`words`参照等価によるreplace方式、単一スロット保持(FLOW-11/21/24確認) |
| async boundary | `_ensureSemanticData()`はfire-and-forget起動＋多重実行防止フラグ、`_ensureWallacePipeline()`は初回失敗で恒久フラグ、3種generation counterによるstale結果破棄(FLOW-17/23/24確認) |
| cleanup確認状況 | 章移動時に`AppState`7項目の一括resetを確認したが、4種キャッシュへの明示的クリア処理は確認できなかった。`AppState.study.params=null`のみが明示的な参照解放として確認された(FLOW-11/15/21確認) |

---

## 5. Rendering Architecture Baseline

| 対象 | HTML生成経路 | innerHTML | textContent | DOM ownership | replacement lifecycle |
|---|---|---|---|---|---|
| `WordOrderRenderer` | representation.chips→テンプレートリテラル | `block.innerHTML`/`gfEl.innerHTML`/`listEl.innerHTML`（呼び出し元が実施） | 不使用 | 章描画関数／Greek Flow View切替処理が生成 | `app.innerHTML=''`等で一括除去(FLOW-16/22確認) |
| Flow Chip | `_wordToFlowChip()`→WordOrderRendererのHTML文字列内 | 親要素置換に含まれる | 不使用（表示は`c.gloss`のinnerHTML埋込） | 親`.verse-block`/`.gf-verse-block` | 親要素除去時に連動消滅 |
| Reading Notes | `_buildWordResonanceText()`等→`_renderReadingNotes()` | `reading-notes-area.innerHTML`（全置換） | 不使用 | `_renderReadingNotes()`が唯一のcreator/updater | 再描画のたび全置換(FLOW-16確認) |
| StudyPanel | `openStudyPanel()`→`_renderReadingNotes()` | 上記に同じ＋`sidePanel.classList`操作 | Drawer3要素（`#wlv-dd-*`）はtextContent | `bottom-depth-panel`（開閉はclass操作のみ） | 確認できなかった（削除ではなくclass操作中心） |
| Mobile Inspector | `_mobileInspectorDetail()`→`_renderMobileWordDetail()` | `#mobile-inspector-area.innerHTML`（全置換） | `#mvv-reading-slot`/`#mvv-semantic-slot`（非同期補完） | `_mobileInspectorDetail()`/`_fillMvvReadingSlot()`等 | 再描画のたび全置換(FLOW-07/16/22確認) |

`_escH()`エスケープは`_renderReadingNotes()`の`${word}`/`${displayLabel}`、`WordOrderRenderer`の`${c.gloss}`では非経由、エラーメッセージの`${book}`/`${ch}`、`_listItemCard()`の`title`/`sub`/`meta`では経由と、箇所により混在することを確認した(FLOW-22/25確認)。

---

## 6. Failure Architecture Baseline

```
Failure → catch boundary → fallback value → caller handling → UI state
```

| 分類 | 内容 |
|---|---|
| null fallback | `ReadingEngine.resolve()`／`_getVerseResolved()`／`_getWallaceClauseAnalysis()`／`createReferentEvidence()`等、モジュールをまたいで共通の慣習として確認した(FLOW-12/23確認) |
| empty fallback | `_loadReadingHints()`の空Map、`_ensureSemanticData()`の空オブジェクト、`elData=[]`(FLOW-23確認) |
| console only | `console.warn`／`console.error`のみで処理を継続する箇所を多数確認した（`[SemanticData]`／`[Wallace]`／`bible_data fetch error`等）(FLOW-12/23確認) |
| user visible error | 章描画失敗時の`#bible-text-area`赤字メッセージ1箇所のみ確認した。それ以外は静寂（非表示）またはconsole出力のみ(FLOW-12/23確認) |

`SyntaxAnalyzer`／`PhraseAnalyzer`／`ClauseAnalyzer`は内部にtry/catchを0件持たず、index.html側の外側catchが唯一の捕捉点であることを確認した(FLOW-12確認)。

---

## 7. Security Architecture Baseline

| Boundary | Confirmed behavior |
|---|---|
| URL boundary | `Router.parse()`は`URLSearchParams.get()`の戻り値をそのまま返す（型変換なし）。`book`は既知リストとの照合で不一致時`null`化。`ch`は`parseInt()`で`NaN`になりうるが、fetch URL構築には生の文字列が使われることを確認した(FLOW-18/25確認) |
| localStorage boundary | `app-storage.js`が単一窓口（`index.html`側からの直接アクセス0件）。`normalize()`はversion番号ではなく値の型でマイグレーション判定を行うことを確認した(FLOW-18/25確認) |
| HTML injection boundary | `_escH()`経由・非経由が箇所により混在（6.参照）。`opts.href`は`_escH()`を経由しないことをコード内コメントとともに確認した(FLOW-18/22確認) |
| postMessage boundary | 受信のみ（`postMessage(`送信呼び出し0件）。`e.origin`確認は確認できなかった。`d.type`の文字列一致判定のみで処理を分岐する(FLOW-18/25確認) |
| CSP/header boundary | `X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/`Permissions-Policy`/`Content-Security-Policy`の記載を確認した。`Cache-Control`は確認できなかった(FLOW-27確認) |

---

## 8. Verification Architecture Baseline

```
Verification Point → Feature Area
```

| Verification Point | Feature Area |
|---|---|
| `scripts/re-phase1〜5-regression.cjs` | Reading Engine Phase1-7 |
| `scripts/re-syntax-completion-regression.cjs`／`re-semantic-completion-regression.cjs` | K-3/L-3c/L-4c |
| `scripts/re-stageA/B/D/E-regression.cjs` | PhraseRenderer／Flow Renderer／ReadingContext／Presentation Policy相当 |
| `.github/workflows/path-check.yml` | 旧パス参照検出（CI自動実行、`main`ブランチ`push`/`pull_request`） |
| 手動Playwright実行（本監査シリーズ以前のセッション記録） | 実ブラウザでのUI確認（リポジトリへの恒久組み込みは確認できなかった） |

**確認できた事実**: `npm run test:xxx`系はいずれも手動実行であり、CI上での自動実行は`path-check.yml`のみであることを確認した。PhraseAnalyzer／ClauseAnalyzer／Projection単体、StudyPanel／Mobile Inspectorの自動E2Eテストは確認できなかった(FLOW-26確認)。

---

## 9. Deployment Architecture Baseline

```
Repository → Hosting → Static Asset → Browser
```

| 段階 | 確認内容 |
|---|---|
| Repository | `public/`配下にアプリ本体一式（index.html／core/*.js／assets/*／bible_data/*等）を実ファイルとしてコミット |
| Hosting | `public/_headers`の存在からCloudflare Pages向け構成と確認。`wrangler.toml`、明示的build command／output directoryはリポジトリ内に確認できなかった |
| Static Asset | JSON/JS/CSSは同一オリジンの相対パス。フォントとMaterial Symbolsは`fonts.googleapis.com`/`fonts.gstatic.com`という外部CDNへの依存を確認した。`fonts/`/`icons/`という専用ディレクトリは無く、アイコンは`shared-ui.js`内のインラインSVG文字列（`ICONS`）から供給される |
| Browser | ES Modules構文（`import`/`export`）0件、`<script type="module">`0件。optional chaining 118件使用の一方、transpile/polyfill設定は確認できなかった(FLOW-27確認) |

---

## 10. Current Constraints / Confirmed Conditions

| 項目 | 確認状態 |
|---|---|
| ES module使用 | 確認できない（0件、グローバルスクリプト方式） |
| build script（アプリ本体） | 確認できない（`build:lexicon`等3件は派生データ生成専用） |
| package依存（dependencies/devDependencies） | 確認できない（0件） |
| cache cleanup（明示的解放） | 限定的（`AppState.study.params=null`のみ確認、4種モジュールキャッシュへの明示的クリアは確認できない） |
| test automation（CI上の回帰テスト実行） | 限定的（`path-check.yml`のみ、`test:re-*`のCI自動実行は確認できない） |
| user visible error表示 | 限定的（章描画失敗時の1箇所のみ確認） |
| postMessage origin確認 | 確認できない |
| Analysis Layer内部のtry/catch（SyntaxAnalyzer等3モジュール） | 確認できない（0件） |
| `.git/hooks/pre-commit`実ファイル | 確認できない（`package.json`の`check`スクリプトが参照する対象は存在しない） |
| Cloudflare Pages側のbuild設定（管理画面側） | 確認できない（リポジトリ内では特定できない） |
| `reading-japanese-builder.js`のブラウザ実行時到達性 | 確認できない（`<script src>`0件） |
| `_escH()`エスケープの一貫性 | 限定的（箇所により経由・非経由が混在） |

---

## 11. Baseline Freeze Statement

本ドキュメントはFLOW-01-A〜FLOW-27-Aで確認された
実装状態を基準点として記録したものである。

以後の変更は、このBaselineとの差分として確認可能な状態にする。

---

## 完了条件

- [x] Audit Artifact Inventory完了
- [x] System Architecture Baseline Diagram作成完了
- [x] Data Architecture Baseline整理完了
- [x] Runtime Architecture Baseline整理完了
- [x] Rendering Architecture Baseline整理完了
- [x] Failure Architecture Baseline整理完了
- [x] Security Architecture Baseline整理完了
- [x] Verification Architecture Baseline整理完了
- [x] Deployment Architecture Baseline整理完了
- [x] Current Constraints / Confirmed Conditions記録完了
- [x] Baseline Freeze Statement記載完了

FLOW-28-A 完了

---

コード・docs・コメントは変更していない。
確認できた実装事実のみを統合した。
