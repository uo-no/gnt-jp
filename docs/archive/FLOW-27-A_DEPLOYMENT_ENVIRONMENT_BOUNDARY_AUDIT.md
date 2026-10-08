# Phase FLOW-27-A Report — Deployment / Environment Boundary Audit

FLOW-01-A〜FLOW-26-Aの実装事実を前提とし、本Phaseで新規確認（`public/`直下構造、Google Fonts外部読込、`shared-ui.js`のアイコンSSOT実装、Web API使用状況、ES構文使用状況）に基づく。コード・docs・コメントは変更していない。評価表現・改善提案・推測は含まない。

---

## 1. Deployment Configuration Audit

| 項目 | 内容 |
|---|---|
| hosting platform | `public/_headers`ファイルの存在から**Cloudflare Pages**向け設定であることを確認した（このファイル形式はCloudflare Pages固有の規約） |
| production branch | リポジトリ内のファイルからは確認できなかった（`.github/workflows/path-check.yml`は`main`ブランチへの`push`/`pull_request`をトリガーとするが、これはCI設定であり、Cloudflare Pages側のproduction branch設定そのものではない） |
| build command | `package.json`内に明示的なbuildコマンド（例: `"build": "..."`）は確認できなかった |
| output directory | リポジトリ内のファイルからは確認できなかった |
| environment variables | リポジトリ内のファイル（`.env`等）に環境変数定義は確認できなかった |
| deployment config file | `wrangler.toml`は確認できなかった。`public/_headers`のみが確認できたCloudflare Pages関連の設定ファイルである |

**確認できた事実**:
- `.nvmrc`／`.node-version`は確認できなかった。`package.json`の`"engines": {"node": ">=18"}`（:27付近）のみがNode.jsバージョンに関する記載である。
- `README.md`は存在するが、`grep`による検索で`cloudflare`／`deploy`という語（大小文字問わず）は0件であった。

---

## 2. Build Boundary Audit

```
Git Repository
   |
   ↓
Build Process
   確認できた事実: package.jsonにdependencies/devDependenciesが0件（FLOW-26-A確認済み）、
   npm installに相当する依存インストール工程は不要と推定される構成であることを確認した。
   build:lexicon／build:ln-gloss／build:ln-finalという3件のscriptは存在するが、
   いずれも public/assets/data/ 配下の派生データファイルを生成するものであり、
   アプリ本体（index.html等）に対するバンドル・トランスパイル処理は確認できなかった。
   |
   ↓
Deployment Artifact
   public/ ディレクトリ配下のファイル群がそのまま配信対象になっていると推定される
   構成を確認した（index.html内の<script src>／CSSリンクがいずれも相対パスで
   public/配下の実ファイルを直接参照する構造、FLOW-19-A確認済み）。
   |
   ↓
Browser Runtime
```

### Repository → Build

- npm script: `build:lexicon`／`build:ln-gloss`／`build:ln-final`（`assets/data/`への派生データ生成用）
- package.json: `dependencies`/`devDependencies`フィールドなし
- build command: アプリ本体に対するもの確認できず
- dependency installation: `node_modules`を要する外部パッケージは確認できなかった
- generated file: `assets/data/reading-lexicon-data.js`等（`build:xxx`の出力先と推定される命名だが、生成トリガーの自動化有無は本Phaseでは未確認）

### Build → Artifact

- public directory: `public/`直下に`_headers`／`assets/`／`bible_data/`／`bookmarklet.html`／`books.json`／`core/`／`css/`／`docs/`／`index.html`／`morph-index/`／`morph-search.html`／`search-tool.html`／`syntax-search.html`／`translations/`を確認した
- assets生成: `public/assets/`直下は`data/`／`js/`／`ogp.png`のみ
- dataファイル配置: `public/bible_data/`（nt/lxx）／`public/translations/`／`public/morph-index/`
- static resource存在: 上記ディレクトリはいずれもリポジトリに実ファイルとしてコミットされていることを確認した（ビルド時に動的生成される一時ディレクトリという性質は確認できなかった）

---

## 3. Static Asset Boundary Audit

| resource | source | runtime access |
|---|---|---|
| JSON data | `public/bible_data/`／`public/assets/data/`（リポジトリ内静的ファイル） | `fetch('../bible_data/...')`等の相対パス（FLOW-18-A/24-A確認済み） |
| fonts | **`public/`配下に専用の`fonts/`ディレクトリは確認できなかった**。代わりに`index.html`内で外部CDN（`https://fonts.googleapis.com/css2?family=Gentium+Plus...`、`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined...`）から`<link rel="stylesheet">`により読み込まれることを確認した（:21, :25） | 外部リクエスト（同一オリジンではない） |
| CSS | `public/css/`（ディレクトリの存在を確認） | `<link>`タグ経由（相対パス、個別ファイル名は本Phaseでは列挙していない） |
| JS | `public/core/`／`public/assets/js/` | `<script src>`（FLOW-19-A確認済み、相対パス） |
| icons | **`public/`配下に専用の`icons/`ディレクトリは確認できなかった**。`public/assets/js/shared-ui.js`内の`ICONS`という定数オブジェクトに、SVGマークアップが**文字列としてハードコード**されており、`icon(name)`関数（:21-23）が名前引きで返す方式であることを確認した。外部ファイルへのfetchは行われない | JS内蔵（fetch不要） |

**確認できた事実**:
- fetch pathはFLOW-18-A/24-Aで確認済みのとおり、いずれも`../`から始まる相対パスで構成されている。
- case sensitivity（大文字小文字の区別）について、リポジトリ内のファイル名とfetchパス文字列との厳密な突合は本Phaseでは実施していない。
- missing file handling: `res.ok`チェックによる個別フォールバック（FLOW-12-A/23-A/25-A確認済み）。

---

## 4. Browser Runtime Environment Audit

| API | 使用箇所 | failure handling |
|---|---|---|
| `fetch()` | 多数（FLOW-18-A/24-A確認済み） | `res.ok`チェック＋`try/catch`（箇所により異なる、FLOW-23-A確認済み） |
| `localStorage` | `app-storage.js`単一窓口（FLOW-06-A/18-A確認済み） | `try/catch`保護（FLOW-18-A確認済み） |
| `URLSearchParams` | `Router.parse()`／`ShareURLService.generate()`等（FLOW-25-A確認済み） | 確認できなかった（`URLSearchParams`自体が例外を投げるケースへの対処は未確認） |
| `navigator.clipboard` | `copyShareUrl()`内`writeText()`1件（FLOW-18-A確認済み） | `try/catch`（:4730、`console.warn('copyShareUrl: コピーに失敗しました', e2)`） |
| `postMessage` | 受信のみ（`window.addEventListener('message', ...)`）、送信は0件（FLOW-25-A確認済み） | `if (!d \|\| !d.type) return;`という存在チェックのみ |
| DOM API（`querySelector`／`getElementById`等） | 広範に使用（FLOW-16-A/22-A確認済み） | `if (el) ...`という個別nullガードパターンが多数箇所で確認された |
| `requestAnimationFrame` | 9件（FLOW-17-A確認済み） | 確認できなかった |
| `ResizeObserver` | **0件**（本Phaseで新規確認） | 該当なし |
| `IntersectionObserver` | **0件**（本Phaseで新規確認） | 該当なし |
| `setInterval` | `_ensureSemanticData()`内のポーリング待機（FLOW-23-A確認済み） | `clearInterval(t)`による明示的解除あり |
| `document.replaceChildren` | `shared-ui.js`の`renderIcon()`内（:28、本Phaseで新規確認） | 該当なし |

**確認できた事実**: `ResizeObserver`／`IntersectionObserver`という比較的新しいWeb APIの使用は確認できなかった。DOM操作は`querySelector`系と`innerHTML`／`textContent`（FLOW-16-A/22-A確認済み）が中心である。

---

## 5. Browser Compatibility Boundary Audit

| feature | usage | location |
|---|---|---|
| optional chaining（`?.`） | **118件**（機械的件数集計、本Phaseで新規確認） | `public/index.html`全体 |
| `async`/`await` | 27件のasync function定義（FLOW-17-A確認済み） | 同上 |
| `Promise`／`Promise.all` | 複数箇所（FLOW-17-A/23-A確認済み） | 同上 |
| ES Modules（`import`/`export`文） | **0件**（本Phaseで新規確認） | — |
| `<script type="module">` | **0件**（本Phaseで新規確認） | — |
| テンプレートリテラル（`` ` ``） | 広範に使用（FLOW-16-A/22-A確認済みのHTML文字列生成手法） | 同上 |
| アロー関数 | 広範に使用（FLOW-10-A等で確認済みのイベントハンドラ記述） | 同上 |

**確認できた事実**:
- transpilation（Babel等によるコード変換）を行う設定ファイル（`.babelrc`／`babel.config.js`等）は確認できなかった。
- polyfillの読み込み（`core-js`等）は`<script src>`一覧（FLOW-19-A確認済みの18件）に含まれていないことを確認した。
- browser version dependencyについて、`package.json`にブラウザ対象範囲を指定する`browserslist`フィールドは確認できなかった。

---

## 6. Security Header / Hosting Boundary Audit

`public/_headers`の記載内容（FLOW-25-A確認済みの内容を本Phaseで再掲・表形式化）:

| header | value | 備考 |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | 記載値のみ |
| `X-Frame-Options` | `DENY` | 記載値のみ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 記載値のみ |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | 記載値のみ |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'` | 記載値のみ。`fonts.googleapis.com`／`fonts.gstatic.com`への許可が、2.で確認したGoogle Fonts外部読込と対応することを確認した |
| `Cache-Control` | **`public/_headers`内に記載は確認できなかった** | — |

---

## 7. Production Data Loading Boundary

| resource | path | loader | failure behavior |
|---|---|---|---|
| bible_data | `../bible_data/{testament}/{book}/{ch}.json` | 章描画関数内fetch | 内側`try/catch`＋`res.ok`チェック（FLOW-12-A/23-A確認済み） |
| translations | `transDataPath(transId, book, ch)`（内部構築URL） | `_fetchTranslation()` | `!jpData`時`throw new Error`→外側catch（FLOW-12-A確認済み） |
| lexicon | `../assets/data/lexicon/lexicon-lite.json`等5ファイル | `_ensureSemanticData()` | 個別`res.ok`フォールバック＋外側catch（FLOW-23-A/24-A確認済み） |
| syntax registry | `../assets/data/syntax-registry.json`等4ファイル | `_ensureWallacePipeline()` | 外側catch＋`_wallacePipelineFailed`恒久フラグ（FLOW-12-A確認済み） |
| reading hints | `../assets/data/reading-hints.json` | `_loadReadingHints()` | 空Mapフォールバック（FLOW-23-A確認済み） |
| roadmap/changelog | `../assets/data/roadmap.json`／`changelog.json` | `showRoadmap()`／`showChangelog()` | `console.warn`のみ（FLOW-12-A確認済み） |

---

## 8. Final Deployment Boundary Diagram

```
Repository（gnt-jp、public/配下にアプリ本体一式をコミット）
   |
   ↓ ビルド工程は確認できなかった（dependencies 0件、buildコマンド未確認）
Cloudflare Pages Build / Static Hosting
   確認事項: public/_headers によるセキュリティヘッダー付与のみ確認。
   明示的なbuildコマンド・output directory指定はリポジトリ内では確認できなかった
   |
   ↓
public Artifact
   確認事項: index.html／core/*.js／assets/*／bible_data/* 等がリポジトリの
   実ファイルそのままの構成で存在することを確認した
   |
   ↓
Browser Fetch
   確認事項: 全リソースが相対パスでのfetch、<script src>、<link>で取得される。
   Google Fontsのみ外部オリジン（fonts.googleapis.com/fonts.gstatic.com）
   |
   ↓
Application Runtime
   確認事項: ES Modules不使用（importなし）、Babel等のtranspile設定は
   確認できなかった。optional chaining等の比較的新しいES構文が
   polyfillなしで使用されている
   |
   ↓
User Interface
```

---

## 9. Final Deployment / Environment Summary

**1. Hosting configuration**: `public/_headers`の存在からCloudflare Pages向け構成であることを確認した。production branch・build command・output directory・environment variablesはいずれもリポジトリ内のファイルからは確認できなかった。

**2. Build boundary**: `package.json`に外部依存が無く、アプリ本体に対する明示的なビルド工程（バンドル・トランスパイル）は確認できなかった。`build:lexicon`等3件は`assets/data/`派生データ生成専用。

**3. Static asset boundary**: `public/`直下に想定されていた`fonts/`／`icons/`という専用ディレクトリは存在せず、フォントは外部CDN（Google Fonts）から、アイコンは`shared-ui.js`内のインラインSVG文字列レジストリ（`ICONS`）から供給されることを確認した。

**4. Browser API dependency**: `fetch`／`localStorage`／`URLSearchParams`／`navigator.clipboard`（writeTextのみ）／`postMessage`（受信のみ）／`requestAnimationFrame`／`setInterval`の使用を確認した。`ResizeObserver`／`IntersectionObserver`の使用は確認できなかった。

**5. Compatibility boundary**: optional chaining 118件、async/await 27関数、ES Modules構文0件、`<script type="module">`0件を確認した。transpilation・polyfillの設定は確認できなかった。

**6. Security header boundary**: `X-Content-Type-Options`／`X-Frame-Options`／`Referrer-Policy`／`Permissions-Policy`／`Content-Security-Policy`の記載を確認した。`Cache-Control`の記載は確認できなかった。

**7. Data loading boundary**: bible_data／translations／lexicon／syntax registry／reading hints／roadmap・changelogの各fetch経路とfailure behaviorを確認した（FLOW-12-A/23-A/24-A/25-Aとの整合を確認）。

**8. 未確認項目**:
- Cloudflare Pages側のbuild command／output directory／environment variables（リポジトリ外の管理画面設定であるため、本Phaseの確認範囲＝リポジトリ内では特定できなかった）
- production branch名の明示的な設定ファイル
- `Cache-Control`ヘッダーの設定有無
- ブラウザバージョン対応範囲（`browserslist`等の明示的指定）
- ケースセンシティブなパス不一致の有無（個別ファイルごとの突合は未実施）

---

## 完了条件

- [x] Deployment Configuration Audit完了
- [x] Build Boundary Audit完了
- [x] Static Asset Boundary Audit完了
- [x] Browser Runtime Environment Audit完了
- [x] Browser Compatibility Boundary Audit完了
- [x] Security Header / Hosting Boundary Audit完了
- [x] Production Data Loading Boundary確認完了
- [x] Final Deployment Boundary Diagram作成完了
- [x] Final Summary作成完了

FLOW-27-A 完了

---

コード・docs・コメントは変更していない。
確認できた実装事実のみを記録した。
