# FLOW Structure Audit Index

対象アプリ: gnt-jp。各Phaseは`public/index.html`および`public/core/*.js`を対象に、grep/Readによる機械的確認のみで実施された（コード変更なし）。

| Phase | Title | Scope |
|---|---|---|
| FLOW-01-A | wlv-phrase-sep 生成経路監査 | Rendering |
| FLOW-02-A | Flow Chip属性・ClauseAnalyzer対応監査 | Data / Rendering |
| FLOW-03-A | Flow Chip Responsibility Audit（責務監査） | Data / Rendering |
| FLOW-04-A | Information Layer Audit（情報レイヤー監査） | Data |
| FLOW-05-A | Presentation Responsibility Audit | Rendering |
| FLOW-06-A | Dependency Boundary Audit | Runtime |
| FLOW-07-A | Rendering Path Audit | Rendering |
| FLOW-08-A | Architecture Boundary Map Audit | Runtime / Rendering |
| FLOW-09-A | Data Ownership Audit | Data |
| FLOW-10-A | Event / Interaction Boundary Audit | Runtime |
| FLOW-11-A | Cache / State Consistency Audit | Runtime |
| FLOW-12-A | Error Boundary / Failure Path Audit | Failure |
| FLOW-13-A | Dependency / Coupling Boundary Audit | Runtime |
| FLOW-14-A | Dead Code / Reachability Audit | Runtime |
| FLOW-15-A | Data Ownership / Mutation Boundary Audit | Data |
| FLOW-16-A | Rendering Pipeline / DOM Mutation Audit | Rendering |
| FLOW-17-A | Async / State Transition Boundary Audit | Runtime |
| FLOW-18-A | Security / External Boundary Audit | Data / Failure |
| FLOW-19-A | Dependency / Module Graph Audit | Runtime |
| FLOW-20-A | Data Contract / Schema Consistency Audit | Schema |
| FLOW-21-A | Execution Path / Runtime Lifecycle Audit | Runtime |
| FLOW-22-A | Rendering / DOM Mutation Boundary Audit | Rendering |
| FLOW-23-A | Error / Failure Path Boundary Audit | Failure |
| FLOW-24-A | Performance / Resource Boundary Audit | Performance |
| FLOW-25-A | Security Boundary Audit（詳細補完） | Security |
| FLOW-26-A | Test / Verification Boundary Audit | Verification |
| FLOW-27-A | Deployment / Environment Boundary Audit | Deployment |
| FLOW-28-A | Architecture Baseline Freeze | Runtime / Rendering / Data / Failure / Performance / Security / Verification / Deployment |

---

## FLOW-01-A — wlv-phrase-sep 生成経路監査

- **Report location**: 本監査シリーズの会話ログ（FLOW-01-A実施ターン）
- **Main findings**: `wlv-phrase-sep`（Flow表示の句区切り記号）は`_wordToFlowChip()`内の`(pos==='CONJ'&&i>0)||(pos==='PREP'&&i>0)`という単一トークンのPOS判定のみで生成されることを確認した。SyntaxAnalyzer/PhraseAnalyzer/ClauseAnalyzer/Wallace分類/discourse情報のいずれも参照されない。`phrase`という名のデータ構造自体は存在しない。
- **Related boundaries**: Rendering

---

## FLOW-02-A — Flow Chip属性・ClauseAnalyzer対応監査

- **Report location**: 同上
- **Main findings**: `_wordToFlowChip()`が生成する18フィールドの元データ・生成ロジック・UI利用箇所を確認。`analysis[i]`（ReadingEngine.resolve()結果）には`relativeSyntax`/`demonstrativeSyntax`/`semanticInfo`が付帯されうるが、chip生成ロジックは`.japanese`/`.source`の2フィールドしか読まないことを確認した。`buildDiscourseFrame()`はFlow表示経路のどこからも呼ばれていない。
- **Related boundaries**: Data / Rendering

---

## FLOW-03-A — Flow Chip Responsibility Audit（責務監査）

- **Report location**: 同上
- **Main findings**: Flow Chipのライフサイクル（生成→保持→コピー→破棄）を確認。18フィールド中`signals`のみ生成後に一度も参照されないことをgrepで確認した。`AppState.inspect.data`はchip.xxxが完全代入方式でコピーされる先であることを確認。
- **Related boundaries**: Data / Rendering

---

## FLOW-04-A — Information Layer Audit（情報レイヤー監査）

- **Report location**: 同上
- **Main findings**: システム内25種の情報（Morphology〜Reading Memoまで）について生成元・保持形式・保持期間・利用箇所・未利用性を棚卸しした。`ResolveResult.confidence`/`.candidates`は型定義のみで値設定箇所が確認できなかった。`StudyPanelAdapter`/`AnnotationMapper`は呼び出し元0件を確認。
- **Related boundaries**: Data

---

## FLOW-05-A — Presentation Responsibility Audit

- **Report location**: 同上
- **Main findings**: 稼働中UI16種と、呼び出し元0件の`_renderMorphTab`系6関数・`_buildGreekTabHTML`を分離して確認した。各UIの入力・表示内容・レイヤー依存・判断ロジック（if/switch）有無を整理。
- **Related boundaries**: Rendering

---

## FLOW-06-A — Dependency Boundary Audit

- **Report location**: 同上
- **Main findings**: `_wordToFlowChip()`／`WordOrderRenderer`／`_wlvChipClick()`／StudyPanel／Mobile Inspector／Reading Engine／Reading Projection／PhraseRenderer／ClauseAnalyzer／AppState／Reading Memoの依存先・依存元・境界越えを確認。双方向依存・循環依存は確認できなかった。`core/*.js`はAppStateを一切参照しないことを確認。
- **Related boundaries**: Runtime

---

## FLOW-07-A — Rendering Path Audit

- **Report location**: 同上
- **Main findings**: DOMへ実際にHTML/テキストを注入する全Render Entry Pointを特定。`_fillWlvResonance()`が呼び出し元0件かつ対応DOM（`#wlv-dd-resonance`）が明示的に空文字列で上書きされていることを確認した。
- **Related boundaries**: Rendering

---

## FLOW-08-A — Architecture Boundary Map Audit

- **Report location**: 同上
- **Main findings**: 9つのLayer（Data/Analysis/Resolution/Context/Projection/ViewModel/Rendering/Persistence/GlobalState）に実装を分類し、Boundary Mapを作成した。AnalysisはResolution経路とProjection経路の2系統に分岐し、ViewModel Layerまで合流しないことを確認。
- **Related boundaries**: Runtime / Rendering

---

## FLOW-09-A — Data Ownership Audit

- **Report location**: 同上
- **Main findings**: 14種の主要データオブジェクトについて生成・保持・コピー・破棄を確認。`chip.xxx=`という直接代入は0件、`AppState.inspect.data`は常に完全代入のみ（部分フィールド代入0件）であることを機械的に確認した。
- **Related boundaries**: Data

---

## FLOW-10-A — Event / Interaction Boundary Audit

- **Report location**: 同上
- **Main findings**: Event Origin→Handler→State Mutation→Rendering→DOM Mutationの経路を確認。Flow Chipはinline onclick、節タップは`.onclick=`プロパティ代入、その他多数は`addEventListener`という3方式が併存することを確認した。
- **Related boundaries**: Runtime

---

## FLOW-11-A — Cache / State Consistency Audit

- **Report location**: 同上
- **Main findings**: 4種キャッシュの生成者・保持期間・参照者・更新条件を確認。いずれも`words`参照等価（`===`）によるreplace方式で、明示的delete/null化は確認できなかった。`AppState.location`は部分フィールド代入、`AppState.inspect.data`/`selectedVerse`は完全代入という異なる更新パターンを確認。
- **Related boundaries**: Runtime

---

## FLOW-12-A — Error Boundary / Failure Path Audit

- **Report location**: 同上
- **Main findings**: JSON fetch失敗・Wallace解析失敗・resolve()失敗の各経路を確認。`SyntaxAnalyzer`/`PhraseAnalyzer`/`ClauseAnalyzer`は内部にtry/catchを0件持たないことを確認。ユーザー向け明示的エラー表示は章描画失敗時の1箇所のみ確認した。
- **Related boundaries**: Failure

---

## FLOW-13-A — Dependency / Coupling Boundary Audit

- **Report location**: 同上
- **Main findings**: モジュール（ファイル）単位の依存方向を確認。`reading-japanese-builder.js`が`<script src>`0件で読み込まれていないことを新規確認した。Core→Rendering方向の依存は0件、Storage→UI方向の依存も0件を確認。
- **Related boundaries**: Runtime

---

## FLOW-14-A — Dead Code / Reachability Audit

- **Report location**: 同上
- **Main findings**: index.html内245トップレベル関数を機械的に全件走査し、呼び出し元0件の26関数を確定リストとして特定した（誤検知7件を個別検証のうえ除外）。`_wallacePipeline.rf`は分割代入経由で使用されていることを訂正確認した。
- **Related boundaries**: Runtime

---

## FLOW-15-A — Data Ownership / Mutation Boundary Audit

- **Report location**: 同上
- **Main findings**: token/ResolveResult/FlowChip/ClauseResult/Projection/AppState.inspect.data/Cache/DOM保持objectについて、生成後mutationを機械的全文検索した。`AppState.depth.stack.push()`以外の対象オブジェクトへの生成後mutationは確認できなかった。
- **Related boundaries**: Data

---

## FLOW-16-A — Rendering Pipeline / DOM Mutation Audit

- **Report location**: 同上
- **Main findings**: Render入口一覧・Data→DOM経路・DOM生成方法・innerHTML/textContent Mutation・DOM Ownership・Render後Mutation・Event Binding・Desktop/Mobile差分・Async Rendering・DOM Leak/Orphanを網羅的に確認した。
- **Related boundaries**: Rendering

---

## FLOW-17-A — Async / State Transition Boundary Audit

- **Report location**: 同上
- **Main findings**: `AbortController`使用0件、`AppState`内`loading`フィールド0件を確認。3種のgeneration counter（`_mvvReadingGen`/`_mvvSemanticGen`/`_wallacePassageNoteGen`）が同一パターンで独立に実装されていることを確認。`_rtCallAI()`/`_fetchFlowAI`はfetch/awaitを含まないプレースホルダー/no-op実装であることを確認した。
- **Related boundaries**: Runtime

---

## FLOW-18-A — Security / External Boundary Audit

- **Report location**: 同上
- **Main findings**: URL/Message/Clipboard/Storageの外部入力経路を確認。`window.addEventListener('message', ...)`にorigin確認が無いことを確認。`localStorage`直接アクセスはindex.html側0件（app-storage.js単一窓口）。`_listItemCard()`の`opts.href`が`_escH()`を経由しないことをコード内コメントとともに確認した。
- **Related boundaries**: Data / Failure

---

## FLOW-19-A — Dependency / Module Graph Audit

- **Report location**: 同上
- **Main findings**: 全18件の`<script src>`読込順序を確認（`defer`属性は`shared-insight.js`の1件のみ、重複読込0件）。`window.App.bridge`（別名`window.AppBridge`）が`onboarding.js`との唯一の公開境界として機能することを確認した。循環依存は確認できなかった。
- **Related boundaries**: Runtime

---

## FLOW-20-A — Data Contract / Schema Consistency Audit

- **Report location**: 同上
- **Main findings**: 主要8オブジェクトのschema一覧・producer/consumer mapping・Missing Field・Type Boundary・Serialization Boundary・Schema Driftを確認。`bible_data.gloss`の消費箇所が確認できないこと、`gloss`という名前がbible_data側とFlow Chip側で無関係の2系統として存在することを確認した。
- **Related boundaries**: Schema

---

## FLOW-21-A — Execution Path / Runtime Lifecycle Audit

- **Report location**: 同上
- **Main findings**: Bootstrap Sequence（`<script>`実行→DOMContentLoaded→`init()`）を`init()`内部の完全なシーケンス（15ステップ）とともに確認。Object Lifetime・Navigation Lifecycle・Memory Retentionを確認した。
- **Related boundaries**: Runtime

---

## FLOW-22-A — Rendering / DOM Mutation Boundary Audit

- **Report location**: 同上
- **Main findings**: DOM Mutation全体件数（classList操作98件、style操作74件等）を機械的集計。`_renderReadingNotes()`の`${word}`/`${displayLabel}`および`WordOrderRenderer`の`${c.gloss}`が`_escH()`を経由しないことを個別確認した。
- **Related boundaries**: Rendering

---

## FLOW-23-A — Error / Failure Path Boundary Audit

- **Report location**: 同上
- **Main findings**: index.html全体のtry/catch機械的件数（45件、対応一致、finally 0件）を確認。`_ensureSemanticData()`の多重実行防止フラグ＋二段階フォールバック構造、`_loadReadingHints()`の明示的空Mapフォールバックを個別確認。State Corruption Boundaryにおいて体系的な型検証は確認できなかった。
- **Related boundaries**: Failure

---

## FLOW-24-A — Performance / Resource Boundary Audit

- **Report location**: `scratchpad/FLOW-24-A_PERFORMANCE_RESOURCE_BOUNDARY_AUDIT.md`
- **Main findings**: `bible_data/nt`（113MB）／`lxx`（263MB）等の実ファイルサイズを計測し、章単位のlazy loadであることを確認した。`_ensureSemanticData()`がDOMContentLoaded内で`init()`と並行してfire-and-forget起動されることを確認。4種モジュールキャッシュは節単位の単一スロット保持である一方、`abbottSmithDict`／`_lexiconData`等はページ全体のライフタイムにわたり保持され続けることを確認した。`_verseResolveCache`と`_wallaceClauseCache`が同一節に対し独立した解析結果を並行保持する構造（重複保持）を確認した。
- **Related boundaries**: Performance

---

## FLOW-25-A — Security Boundary Audit（詳細補完）

- **Report location**: `scratchpad/FLOW-25-A_SECURITY_BOUNDARY_AUDIT.md`
- **Main findings**: `Router.parse()`が返す`book`は既知書籍リストとの照合で不一致時`null`化されること、`ch`が`parseInt()`で`NaN`になりうる一方bible_data fetch用URLには生の文字列`ch`が使われる（`chNum`とは別変数）ことを確認した。`app-storage.js`の`normalize()`はversion番号ではなく個別エントリの値の型でマイグレーション判定を行うことを確認。`postMessage(`という送信呼び出しが`index.html`内に0件であること（受信専用）を新規確認した。
- **Related boundaries**: Security

---

## FLOW-26-A — Test / Verification Boundary Audit

- **Report location**: `scratchpad/FLOW-26-A_TEST_VERIFICATION_BOUNDARY_AUDIT.md`
- **Main findings**: `package.json`に`dependencies`/`devDependencies`が0件であることを確認した。`"check": "sh .git/hooks/pre-commit"`が参照する実ファイルが存在しないことを確認。`.github/workflows/`にはpath-check.ymlのみ存在し、`test:re-*`系回帰テストのCI自動実行は確認できなかった。Playwrightがリポジトリ構成（`package.json`／設定ファイル）に組み込まれていないことを確認した。
- **Related boundaries**: Verification

---

## FLOW-27-A — Deployment / Environment Boundary Audit

- **Report location**: `scratchpad/FLOW-27-A_DEPLOYMENT_ENVIRONMENT_BOUNDARY_AUDIT.md`
- **Main findings**: `public/_headers`の存在からCloudflare Pages向け構成であることを確認した。`public/`配下に専用の`fonts/`／`icons/`ディレクトリが無く、フォントはGoogle Fonts外部CDN、アイコンは`shared-ui.js`内のインラインSVG文字列レジストリ（`ICONS`）から供給されることを確認。ES Modules構文（`import`/`export`）0件、`<script type="module">`0件、optional chaining 118件を確認した。
- **Related boundaries**: Deployment

---

## FLOW-28-A — Architecture Baseline Freeze

- **Report location**: `scratchpad/FLOW-28-A_ARCHITECTURE_BASELINE_FREEZE.md`
- **Main findings**: FLOW-20-A〜FLOW-27-Aの監査結果を11章構成（Audit Artifact Inventory／System Architecture Baseline Diagram／Data・Runtime・Rendering・Failure・Security・Verification・Deployment各Architecture Baseline／Current Constraints／Baseline Freeze Statement）で統合した。「確認できない」／「限定的」という現状記録を11項目の制約表としてまとめ、Baseline Freeze Statementを記載した。
- **Related boundaries**: Runtime / Rendering / Data / Failure / Performance / Security / Verification / Deployment

---

# Rules

禁止: 改善提案／リファクタリング提案／セキュリティ評価／「良い/悪い」等の品質評価／推測による設計意図記述
許可: 実装事実／ファイル名／関数名／データ構造／実行経路／確認済み件数
