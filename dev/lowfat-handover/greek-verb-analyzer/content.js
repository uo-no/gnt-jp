// Greek Verb Analyzer — ページに注入する解析パネル
// Shadow DOM の中に UI を作るので、閲覧中のサイトのCSSとは互いに影響しません。
(() => {
  if (window.__gvaLoaded) return; // 二重注入の防止
  window.__gvaLoaded = true;

  // ══════════════════════════════════════════════════════════════════
  // 定数
  // ══════════════════════════════════════════════════════════════════
  const BOOK_ORDER = [
    "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH",
    "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
  ];

  const BOOK_NAME_JA = {
    "MAT": "マタイによる福音書", "MRK": "マルコによる福音書", "LUK": "ルカによる福音書", "JHN": "ヨハネによる福音書",
    "ACT": "使徒言行録", "ROM": "ローマの信徒への手紙", "1CO": "コリントの信徒への手紙一", "2CO": "コリントの信徒への手紙二",
    "GAL": "ガラテヤの信徒への手紙", "EPH": "エフェソの信徒への手紙", "PHP": "フィリピの信徒への手紙", "COL": "コロサイの信徒への手紙",
    "1TH": "テサロニケの信徒への手紙一", "2TH": "テサロニケの信徒への手紙二", "1TI": "テモテへの手紙一", "2TI": "テモテへの手紙二",
    "TIT": "テトスへの手紙", "PHM": "フィレモンへの手紙", "HEB": "ヘブライ人への手紙", "JAS": "ヤコブの手紙",
    "1PE": "ペトロの手紙一", "2PE": "ペトロの手紙二", "1JN": "ヨハネの手紙一", "2JN": "ヨハネの手紙二",
    "3JN": "ヨハネの手紙三", "JUD": "ユダの手紙", "REV": "ヨハネの黙示録"
  };

  const BOOK_SHORT_JA = {
    "MAT": "マタイ", "MRK": "マルコ", "LUK": "ルカ", "JHN": "ヨハネ", "ACT": "使徒", "ROM": "ローマ",
    "1CO": "1コリント", "2CO": "2コリント", "GAL": "ガラテヤ", "EPH": "エフェソ", "PHP": "フィリピ", "COL": "コロサイ",
    "1TH": "1テサロニケ", "2TH": "2テサロニケ", "1TI": "1テモテ", "2TI": "2テモテ", "TIT": "テトス", "PHM": "フィレモン",
    "HEB": "ヘブライ", "JAS": "ヤコブ", "1PE": "1ペトロ", "2PE": "2ペトロ", "1JN": "1ヨハネ", "2JN": "2ヨハネ",
    "3JN": "3ヨハネ", "JUD": "ユダ", "REV": "黙示録"
  };

  // 動詞コード "PAI3S"（時制・態・法・人称・数）の読み解き  [CSSクラス名, 日本語ラベル]
  const TENSE = { P: ["present", "現在"], I: ["imperfect", "未完了"], F: ["future", "未来"], A: ["aorist", "アオリスト"], X: ["perfect", "完了"], Y: ["pluperfect", "過去完了"] };
  const VOICE = { A: ["active", "能動"], M: ["middle", "中動"], P: ["passive", "受動"] };
  const MOOD  = { I: ["indicative", "直説法"], D: ["imperative", "命令法"], S: ["subjunctive", "接続法"], O: ["optative", "希求法"], N: ["infinitive", "不定詞"], P: ["participle", "分詞"] };
  const PERSON = { "1": "1人称", "2": "2人称", "3": "3人称" };
  const NUMBER = { S: "単数", P: "複数", D: "双数" };

  // 用例検索に使う検索ツールのURL（公開している場所が変わったらここを書き換える）
  const SEARCH_TOOL_URL = "https://bible-text.pages.dev/search-tool";

  const DEFAULT_UI = {
    visible: true,
    collapsed: false,
    dock: true,
    dockWidth: 420,
    sync: true,
    syn: true,        // 統語論を、語のクリックで即表示する（OFF=従来の用例中心の表示）
    theme: "auto",    // "auto"（閲覧中のサイトに合わせる）| "light" | "dark"
    left: null,
    top: 72,
    width: 420,
    height: 520,
    ref: { book: "MAT", chapter: 1, verse: 1 }
  };

  // ══════════════════════════════════════════════════════════════════
  // URL → 聖書箇所の解析（popup.js から移植）
  // ══════════════════════════════════════════════════════════════════
  const BOOK_PATTERNS = [
    { patterns: ["1 corinthians", "1co", "1コリント", "コリント1", "コリントの信徒への手紙一"], code: "1CO" },
    { patterns: ["2 corinthians", "2co", "2コリント", "コリント2", "コリントの信徒への手紙二"], code: "2CO" },
    { patterns: ["1 thessalonians", "1th", "1テサロニケ", "テサロニケの信徒への手紙一"], code: "1TH" },
    { patterns: ["2 thessalonians", "2th", "2テサロニケ", "テサロニケの信徒への手紙二"], code: "2TH" },
    { patterns: ["1 timothy", "1ti", "1テモテ", "テモテへの手紙一"], code: "1TI" },
    { patterns: ["2 timothy", "2ti", "2テモテ", "テモテへの手紙二"], code: "2TI" },
    { patterns: ["1 peter", "1pe", "1ペテロ", "1ペトロ", "ペトロの手紙一"], code: "1PE" },
    { patterns: ["2 peter", "2pe", "2ペテロ", "2ペトロ", "ペトロの手紙二"], code: "2PE" },
    { patterns: ["1 john", "1jn", "1ヨハネ", "ヨハネの手紙一"], code: "1JN" },
    { patterns: ["2 john", "2jn", "2ヨハネ", "ヨハネの手紙二"], code: "2JN" },
    { patterns: ["3 john", "3jn", "3ヨハネ", "ヨハネの手紙三"], code: "3JN" },
    { patterns: ["matthew", "mat", "マタイ"], code: "MAT" },
    { patterns: ["mark", "mrk", "マルコ"], code: "MRK" },
    { patterns: ["luke", "luk", "ルカ"], code: "LUK" },
    { patterns: ["john", "jhn", "ヨハネ"], code: "JHN" },
    { patterns: ["acts", "act", "使徒"], code: "ACT" },
    { patterns: ["romans", "rom", "ローマ"], code: "ROM" },
    { patterns: ["galatians", "gal", "ガラテヤ"], code: "GAL" },
    { patterns: ["ephesians", "eph", "エフェソ", "エフェサ"], code: "EPH" },
    { patterns: ["philippians", "php", "フィリピ", "ピリピ"], code: "PHP" },
    { patterns: ["colossians", "col", "コロサイ"], code: "COL" },
    { patterns: ["titus", "tit", "テトス"], code: "TIT" },
    { patterns: ["philemon", "phm", "フィレモン"], code: "PHM" },
    { patterns: ["hebrews", "heb", "ヘブライ", "ヘブル"], code: "HEB" },
    { patterns: ["james", "jas", "ヤコブ"], code: "JAS" },
    { patterns: ["jude", "jud", "ユダ"], code: "JUD" },
    { patterns: ["revelation", "rev", "黙示録"], code: "REV" }
  ];

  const BOOK_CODE_ALIAS = {
    "MAR": "MRK", "JOH": "JHN", "PHI": "PHP", "JAM": "JAS",
    "1JO": "1JN", "2JO": "2JN", "3JO": "3JN"
  };

  function safeDecode(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  function toNum(v) {
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? 1 : n;
  }

  function makeRef(code, chapter, verse) {
    let c = String(code || "").toUpperCase();
    c = BOOK_CODE_ALIAS[c] || c;
    if (!BOOK_NAME_JA[c]) return null;
    return { book: c, chapter: toNum(chapter), verse: verse ? toNum(verse) : 1 };
  }

  function findBookInText(text) {
    const lower = text.toLowerCase();
    let best = null;
    for (const item of BOOK_PATTERNS) {
      for (const pat of item.patterns) {
        const escaped = pat.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const m = new RegExp(`(^|[^a-z0-9])${escaped}(?![a-z0-9])`, "i").exec(lower);
        if (m && (!best || m.index < best.index)) {
          best = { code: item.code, index: m.index, end: m.index + m[0].length };
        }
      }
    }
    return best;
  }

  function parseReferenceText(text) {
    const b = findBookInText(text);
    if (!b) return null;
    const rest = text.slice(b.end);
    const m = rest.match(/^[^\d]{0,12}(\d+)(?:\s*[:：.章\/_-]\s*(\d+))?/);
    return makeRef(b.code, m ? m[1] : "1", m && m[2] ? m[2] : "1");
  }

  function parsePageUrl(urlStr) {
    let u;
    try { u = new URL(urlStr); } catch (e) { return null; }
    const host = u.hostname.toLowerCase();
    const path = safeDecode(u.pathname);

    // YouVersion: /bible/1819/JHN.3.16.JA1955
    if (host === "bible.com" || host.endsWith(".bible.com")) {
      const m = path.match(/\/bible\/\d+\/([0-9a-z]{3})\.(\d+)(?:\.(\d+))?/i);
      return m ? makeRef(m[1], m[2], m[3]) : null;
    }
    // ともに聴く聖書(PRS): /ja/bible/jhn.3.jdb
    if (host === "prs.app" || host.endsWith(".prs.app") || host === "prsi.org" || host.endsWith(".prsi.org")) {
      const m = path.match(/\/bible\/([0-9a-z]{3})\.(\d+)(?:\.(\d+))?(?:\.[a-z0-9]+)?/i);
      return m ? makeRef(m[1], m[2], m[3]) : null;
    }
    // BibleGateway: /passage/?search=John+3%3A16
    if (host === "biblegateway.com" || host.endsWith(".biblegateway.com")) {
      const search = u.searchParams.get("search");
      if (!search) return null;
      return parseReferenceText(search.split(";")[0]);
    }
    // その他のサイト: パスとクエリから推測
    return parseReferenceText(safeDecode(u.pathname + " " + u.search).replace(/\+/g, " "));
  }

  // ══════════════════════════════════════════════════════════════════
  // 状態の保存（chrome.storage.local）
  // ══════════════════════════════════════════════════════════════════
  let ui = { ...DEFAULT_UI };
  let saveTimer = null;

  function alive() {
    try { return !!(chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
  }

  function saveUi(immediate) {
    clearTimeout(saveTimer);
    const run = () => { if (alive()) chrome.storage.local.set({ gva_ui: ui }).catch(() => {}); };
    if (immediate) run(); else saveTimer = setTimeout(run, 300);
  }

  // ══════════════════════════════════════════════════════════════════
  // データ読み込み（background経由・書単位でキャッシュ）
  // ══════════════════════════════════════════════════════════════════
  const bookCache = new Map();

  function indexBook(data) {
    const chapters = Object.keys(data).map(Number).sort((a, b) => a - b);
    const versesOf = {};
    for (const c of chapters) versesOf[c] = Object.keys(data[c]).map(Number).sort((a, b) => a - b);
    return { data, chapters, versesOf };
  }

  function loadBook(code) {
    if (!bookCache.has(code)) {
      const p = chrome.runtime.sendMessage({ type: "getBook", book: code }).then((res) => {
        if (!res || !res.ok) throw new Error((res && res.error) || "データを読み込めませんでした");
        return indexBook(res.data);
      });
      p.catch(() => bookCache.delete(code));
      bookCache.set(code, p);
    }
    return bookCache.get(code);
  }

  function errorText(e) {
    const msg = String((e && e.message) || e);
    if (/context invalidated/i.test(msg) || !alive()) return "拡張機能が更新されました。このページを再読み込みしてください。";
    return `読み込みエラー: ${msg}`;
  }

  // ══════════════════════════════════════════════════════════════════
  // 動詞コードの解釈
  // ══════════════════════════════════════════════════════════════════
  function decodeVerb(code) {
    if (!code) return null;
    const [t, v, m, p, n] = code;
    const tense = TENSE[t], voice = VOICE[v], mood = MOOD[m];
    const classes = ["verb-hit", tense && tense[0], (v === "M" || v === "P") && voice[0], mood && mood[0]].filter(Boolean);
    const info = [tense && tense[1], voice && voice[1], mood && mood[1], PERSON[p], NUMBER[n]].filter(Boolean).join("/");
    return { cls: classes.join(" "), info };
  }

  // ══════════════════════════════════════════════════════════════════
  // スタイル
  // ══════════════════════════════════════════════════════════════════
  const CSS = `
  :host { all: initial; }
  .panel {
    --bg: #ffffff; --bg-soft: #f9f9f8; --bg-hover: #f4f3ee; --fg: #1a1a18; --muted: #888880;
    --border: #e5e4de; --border-strong: #ccc9c0; --accent: #1a1a18; --on-accent: #ffffff;
    --mark: #fffacd; --on: #34a853; --on-text: #2b8a3e;
    color-scheme: light;
    position: fixed; z-index: 2147483647;
    display: flex; flex-direction: column;
    box-sizing: border-box; width: 420px; height: 520px;
    min-width: 320px; min-height: 160px; max-width: 96vw; max-height: 96vh;
    resize: both; overflow: hidden;
    background: var(--bg); color: var(--fg);
    border: 1px solid var(--border-strong); border-radius: 12px;
    box-shadow: 0 10px 36px rgba(0, 0, 0, 0.28);
    font: 14px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif;
    text-align: left; letter-spacing: normal;
  }
  /* ダーク: 値は従来の OS 連動のダークと同じ。JS が data-theme を必ず設定する（auto の判定結果も含む） */
  .panel[data-theme="dark"] {
    --bg: #1f1f1d; --bg-soft: #262624; --bg-hover: #30302d; --fg: #ecebe4; --muted: #9a998f;
    --border: #3a3a36; --border-strong: #4a4a45; --accent: #ecebe4; --on-accent: #1f1f1d;
    --mark: rgba(255, 233, 90, 0.22); --on: #4cb868; --on-text: #7fd394;
    color-scheme: dark;
  }
  .panel.collapsed { resize: none; height: auto !important; min-height: 0; }
  .panel *, .panel *::before, .panel *::after { box-sizing: border-box; }
  .panel button, .panel select { font: inherit; color: inherit; }

  /* 上部バー（ドラッグで移動） */
  .topbar {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 8px 6px 12px; cursor: grab; user-select: none; touch-action: none;
    border-bottom: 1px solid var(--border); background: var(--bg-soft);
  }
  .topbar:active { cursor: grabbing; }
  .brand { flex: 1; font-size: 12px; font-weight: 600; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .icon-btn {
    width: 26px; height: 26px; border: none; border-radius: 6px; background: transparent;
    color: var(--muted); font-size: 15px; line-height: 1; cursor: pointer; display: grid; place-items: center;
  }
  .icon-btn:hover { background: var(--bg-hover); color: var(--fg); }
  .panel :focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }

  /* 同期スイッチ */
  .sync-switch { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; flex-shrink: 0; margin-right: 4px; }
  .sync-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .sync-track { position: relative; width: 30px; height: 17px; border-radius: 9px; background: var(--border-strong); transition: background-color .2s; }
  .sync-knob { position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.3); transition: transform .2s; }
  .sync-switch input:checked + .sync-track { background: var(--on); }
  .sync-switch input:checked + .sync-track .sync-knob { transform: translateX(13px); }
  .sync-switch input:focus-visible + .sync-track { outline: 2px solid var(--accent); outline-offset: 2px; }
  .sync-text { font-size: 11px; line-height: 1; color: var(--muted); }
  .sync-text::after { content: "同期OFF"; }
  .sync-switch input:checked ~ .sync-text { color: var(--on-text); }
  .sync-switch input:checked ~ .sync-text::after { content: "同期ON"; }

  /* ナビゲーション */
  .nav { display: flex; align-items: center; gap: 6px; padding: 8px 10px 4px; }
  .btn {
    padding: 5px 10px; font-size: 13px; border: 1px solid var(--border-strong); border-radius: 8px;
    background: transparent; cursor: pointer; white-space: nowrap;
  }
  .btn:hover { background: var(--bg-hover); }
  .nav-title {
    flex: 1; min-width: 0; text-align: center; font-size: 13px; font-weight: 600;
    padding: 5px 8px; user-select: none;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* 節番号の帯 */
  .verse-strip { display: flex; gap: 6px; overflow-x: auto; padding: 4px 10px 8px; scrollbar-width: thin; flex: none; }
  .verse-chip {
    flex: 0 0 auto; min-width: 30px; height: 26px; padding: 0 8px; font-size: 12px;
    border: 1px solid var(--border-strong); border-radius: 13px; background: var(--bg); cursor: pointer;
  }
  .verse-chip:hover { background: var(--bg-hover); }
  .verse-chip.current { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }

  /* 解析結果 */
  .body { flex: 1; min-height: 0; overflow-y: auto; padding: 4px 10px 10px; }
  .output { background: var(--bg-soft); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; min-height: 60px; }
  .tokens { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
  .tok {
    display: flex; flex-direction: column; align-items: center; min-width: 45px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px;
    appearance: none; font: inherit; color: inherit; text-align: center; cursor: pointer;
  }
  .tok:hover { border-color: var(--accent); background: var(--bg-hover); transform: translateY(-1px); }
  .tok:active { transform: translateY(0); }
  .tok.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
  .word { font-size: 18px; line-height: 1.7; font-family: "Gentium Plus", "Cardo", "SBL Greek", "Palatino Linotype", "Times New Roman", serif; }
  .after { color: var(--muted); }
  .gloss { font-size: 11px; line-height: 1.5; color: var(--muted); border-top: 1px solid var(--border); width: 100%; text-align: center; padding-top: 2px; margin-top: 2px; }
  .message { color: var(--muted); font-size: 13px; }

  /* 時制の装飾 */
  .present    { text-decoration: underline; }
  .future     { text-decoration: underline double; }
  .aorist     { text-decoration: underline dotted; }
  .perfect    { text-decoration: underline wavy; }
  .imperfect, .pluperfect { text-decoration: none; }
  /* 態の装飾 */
  .middle::after, .passive::after { content: "*"; margin-left: 2px; font-size: .7em; vertical-align: super; opacity: .9; }
  /* 法による背景色 */
  .indicative, .imperative { background-color: var(--mark); padding: 0 3px; }
  .verb-hit { cursor: help; }

  /* 凡例 */
  .legend { margin-top: 10px; font-size: 12px; color: var(--muted); }
  .legend summary { cursor: pointer; user-select: none; }
  .legend-grid { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 8px; }
  .legend-item { display: flex; align-items: center; gap: 6px; }
  .legend-sample { font-size: 14px; color: var(--fg); padding: 0 2px; }

  /* ツールチップ（パネルの外にはみ出せるよう fixed） */
  .tip {
    position: fixed; display: none; z-index: 10; pointer-events: none;
    background: #1a1a18; color: #fff; font-size: 12px; line-height: 1.4; white-space: nowrap;
    padding: 4px 8px; border-radius: 6px;
  }

  /* オーバーレイ共通（用例一覧で使用） */
  .picker { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; gap: 10px; padding: 12px; background: var(--bg); }
  .picker[hidden] { display: none; }
  .picker select {
    min-width: 0; padding: 6px 8px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--bg-soft);
  }

  /* 用例の一覧 */
  .conc-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .conc-title { font-weight: 600; font-size: 14px; }
  .conc-lemma { font-family: "Gentium Plus", "Cardo", "SBL Greek", "Palatino Linotype", "Times New Roman", serif; font-size: 17px; }
  .conc-count { font-size: 12px; color: var(--muted); }
  .conc-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .conc-filter { display: flex; gap: 6px; flex-wrap: wrap; }
  .chip { padding: 3px 10px; font-size: 12px; border: 1px solid var(--border-strong); border-radius: 13px; background: var(--bg); cursor: pointer; }
  .chip:hover { background: var(--bg-hover); }
  .chip.on { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .conc-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
  .conc-item { border: 1px solid var(--border); border-radius: 8px; background: var(--bg-soft); padding: 8px 10px; }
  .conc-ref { appearance: none; border: none; background: none; padding: 0; margin: 0 0 2px; font-size: 12px; font-weight: 600; color: var(--on-text); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .conc-ref:hover { opacity: .75; }
  .conc-text { font-family: "Gentium Plus", "Cardo", "SBL Greek", "Palatino Linotype", "Times New Roman", serif; font-size: 16px; line-height: 1.8; }
  .conc-text .hit { background: var(--mark); border-radius: 3px; padding: 0 2px; font-weight: 600; }
  .conc-gloss { display: flex; flex-wrap: wrap; gap: 4px 8px; margin-top: 2px; color: var(--muted); font-size: 11px; line-height: 1.5; }
  .conc-gloss-word { display: inline-flex; align-items: baseline; gap: 2px; }
  .conc-gloss-word.hit { color: var(--on-text); font-weight: 600; }
  .conc-form { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* 選択した単語の詳細（用例検索） */
  .detail { flex: none; border-top: 1px solid var(--border); background: var(--bg-soft); padding: 8px 12px 10px; }
  .detail-hint { font-size: 12px; color: var(--muted); }
  .detail-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .detail-lemma { font-size: 18px; font-weight: 600; font-family: "Gentium Plus", "Cardo", "SBL Greek", "Palatino Linotype", "Times New Roman", serif; }
  .detail-gloss { font-size: 13px; }
  .detail-parse { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  .detail-actions a.btn, .detail-actions button.btn { text-decoration: none; color: var(--fg); display: inline-block; }
  .detail-actions .btn.primary { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .detail-actions .btn.primary:hover { opacity: .85; }
  .detail-warn { font-size: 12px; color: #b84a1a; margin-top: 6px; }
  .detail:empty { display: none; }
  .detail .icon-btn { margin-left: auto; align-self: flex-start; }

  .panel.collapsed .verse-strip, .panel.collapsed .body, .panel.collapsed .detail { display: none; }

  /* 分割ビュー（右端に固定） */
  .panel.docked {
    top: 0; right: 0; bottom: 0; left: auto; height: auto; max-height: none;
    min-width: 260px; max-width: 80vw; resize: none;
    border-radius: 0; border-width: 0 0 0 1px; box-shadow: -2px 0 12px rgba(0, 0, 0, 0.12);
  }
  .panel.docked .topbar { cursor: default; }
  .dock-handle { display: none; position: absolute; left: 0; top: 0; bottom: 0; width: 7px; z-index: 6; cursor: col-resize; touch-action: none; }
  .dock-handle:hover, .dock-handle.dragging { background: var(--border-strong); opacity: .6; }
  .panel.docked .dock-handle { display: block; }
  .icon-btn[hidden] { display: none; }
  /* 統語論ペイン（語の下に常時表示。語をクリックすると中身が切り替わる） */
  .syn-pane { flex: 1 1 0; min-height: 160px; display: none; flex-direction: column; border-top: 1px solid var(--border); background: var(--bg); }
  .panel.syn-open .syn-pane { display: flex; }
  .panel.syn-open .body { flex: 0 1 auto; max-height: 38%; }
  .panel.syn-open .detail { display: none; }
  .panel.collapsed .syn-pane { display: none; }
  .syn-top { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 6px 5px 12px; background: var(--bg-soft); border-bottom: 1px solid var(--border); min-height: 36px; }
  .syn-head { display: flex; align-items: baseline; gap: 8px; min-width: 0; overflow: hidden; }
  .syn-lemma { font-size: 16px; font-weight: 600; white-space: nowrap; font-family: "Gentium Plus", "Cardo", "SBL Greek", "Palatino Linotype", "Times New Roman", serif; }
  .syn-gloss { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .syn-actions { display: flex; align-items: center; gap: 4px; flex: none; }
  .syn-actions .btn { padding: 3px 9px; font-size: 12px; text-decoration: none; color: var(--fg); display: inline-block; }
  .syn-actions [hidden] { display: none; }
  .syn-frame { flex: 1; min-height: 0; width: 100%; border: 0; background: var(--bg); }   /* color-scheme は .panel から継承（iframe も同じテーマになる） */
  .syn-status { flex: none; padding: 10px 12px; font-size: 13px; color: var(--muted); display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .syn-status[hidden] { display: none; }
  .detail-hint .btn { margin-left: 8px; padding: 2px 8px; font-size: 12px; }
  @media (prefers-reduced-motion: reduce) { .sync-track, .sync-knob { transition: none; } }
  `;

  // ══════════════════════════════════════════════════════════════════
  // UIの組み立て
  // ══════════════════════════════════════════════════════════════════
  // innerHTML を使わず DOM API で組み立てる（Trusted Types を強制するサイトでも動くように）
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
  }

  let host = null;
  let els = null;
  let cur = { ...DEFAULT_UI.ref };
  let seq = 0;            // 古い非同期結果で上書きしないための通し番号
  let stripKey = null;
  let lastUrlKey = null;
  let pollTimer = null;
  let resizeObs = null;

  function buildLegend() {
    const item = (cls, label, sample = "［動詞］") =>
      h("div", { class: "legend-item" }, h("span", { class: `legend-sample ${cls}`, text: sample }), h("span", { text: label }));
    return h("details", { class: "legend" },
      h("summary", { text: "凡例" }),
      h("div", { class: "legend-grid" },
        item("present", "現在形"),
        item("aorist", "アオリスト形"),
        item("perfect", "完了形"),
        item("future", "未来形"),
        item("", "中動・受動態", "［動詞］*"),
        item("indicative", "直説法・命令法")
      )
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // テーマ（auto / light / dark）
  //   auto: 閲覧中のサイトの表示に合わせる。サイト専用の分岐は持たず、次の順で汎用的に判定する
  //     ① html のテーマ属性 / class   ② body のテーマ属性 / class
  //     ③ body → html の不透明な背景色   ④ パネルの隣の要素の不透明な背景色
  //     ⑤ color-scheme   ⑥ OS の設定   ⑦ light
  //   light / dark: 常にそのテーマ（auto の判定は行わない）
  // ══════════════════════════════════════════════════════════════════
  const THEME_MODES = ["auto", "light", "dark"];
  const THEME_NAME = { auto: "自動", light: "ライト", dark: "ダーク" };
  const THEME_ATTRS = ["data-theme", "data-color-scheme"];
  const DARK_LUMINANCE = 0.179;   // 白文字と黒文字のコントラストが等しくなる相対輝度。これ未満の背景は暗いと判断する
  let curTheme = "light";         // 確定したテーマ（panel と syntax iframe に適用している値）
  let themeAttrObs = null, themeHeadObs = null, themeMq = null, themeTimer = null;

  const asTheme = (v) => { v = String(v == null ? "" : v).trim().toLowerCase(); return v === "dark" || v === "light" ? v : null; };
  // class は「dark」「light」という単語（トークン）が完全一致する場合だけを見る（部分一致は見ない）
  const classThemeKey = (cls) => {
    const t = new Set(String(cls || "").toLowerCase().split(/\s+/));
    return (t.has("dark") ? "d" : "") + (t.has("light") ? "l" : "");
  };

  // 要素のテーマ表明。明示的な属性を class より優先する。判断できなければ null
  function elementTheme(el) {
    if (!el || !el.getAttribute) return null;
    const attr = new Set(THEME_ATTRS.map((a) => asTheme(el.getAttribute(a))).filter(Boolean));
    if (attr.size === 1) return [...attr][0];
    if (attr.size > 1) return null;                  // 属性どうしが矛盾している場合は判断しない
    const k = classThemeKey(el.getAttribute("class"));
    return k === "d" ? "dark" : k === "l" ? "light" : null;
  }

  function parseColor(str) {
    const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(String(str || "").trim());
    if (!m) return null;
    const a = m[4] === undefined ? 1 : (m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  function luminance({ r, g, b }) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  // 不透明（α≥0.95）な背景色だけを使う。透明は対象外
  function opaqueBgTheme(el) {
    try {
      const c = parseColor(getComputedStyle(el).backgroundColor);
      if (c && c.a >= 0.95) return luminance(c) < DARK_LUMINANCE ? "dark" : "light";
    } catch (e) { /* 取得できなければ判断しない */ }
    return null;
  }
  // パネルの隣のページ領域で、実際に見えている背景（最前面の不透明な背景）。取得できる時だけ
  function panelNeighborTheme() {
    if (!els || !host || typeof document.elementsFromPoint !== "function") return null;
    const r = els.panel.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const x = [r.left - 8, r.right + 8].find((v) => v >= 1 && v <= window.innerWidth - 1);
    if (x === undefined) return null;
    const y = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
    for (const el of document.elementsFromPoint(x, y)) {
      if (el === host) continue;
      const t = opaqueBgTheme(el);
      if (t) return t;
    }
    return null;
  }
  function colorSchemeTheme() {
    try {
      const cs = getComputedStyle(document.documentElement);
      return asTheme(cs.colorScheme || cs.getPropertyValue("color-scheme"));   // "light dark" など複数指定は判断しない
    } catch (e) { return null; }
  }
  function osTheme() {
    try { return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; } catch (e) { return null; }
  }
  function detectTheme() {
    const html = document.documentElement, body = document.body;
    return elementTheme(html) || elementTheme(body)
      || (body && opaqueBgTheme(body)) || opaqueBgTheme(html)
      || panelNeighborTheme() || colorSchemeTheme() || osTheme() || "light";
  }
  const resolveTheme = () => (ui.theme === "light" || ui.theme === "dark" ? ui.theme : detectTheme());

  function updateThemeBtn() {
    if (!els || !els.themeBtn) return;
    const m = THEME_MODES.includes(ui.theme) ? ui.theme : "auto";
    const next = THEME_NAME[THEME_MODES[(THEME_MODES.indexOf(m) + 1) % THEME_MODES.length]];
    const now = m === "auto" ? `自動（サイトに合わせる・現在: ${THEME_NAME[curTheme]}）` : `${THEME_NAME[m]}固定`;
    const text = `テーマ: ${now} — クリックで${next}`;
    els.themeBtn.textContent = m === "light" ? "☀\uFE0E" : m === "dark" ? "☾" : "◐";
    els.themeBtn.title = text;
    els.themeBtn.setAttribute("aria-label", text);
  }

  // 確定したテーマを panel と iframe に反映する（変わった時だけ）
  function applyTheme() {
    if (!els) return;
    const t = resolveTheme();
    if (els.panel.getAttribute("data-theme") !== t) els.panel.setAttribute("data-theme", t);
    if (t !== curTheme) {
      curTheme = t;
      if (synReady) postSyn({ type: "GVA_THEME", theme: t });
    }
    updateThemeBtn();
  }

  function scheduleThemeCheck(ms) {
    clearTimeout(themeTimer);
    themeTimer = setTimeout(() => { themeTimer = null; if (els && ui.theme === "auto") applyTheme(); }, ms);
  }
  const themeOnUserEvent = (e) => {
    if (host && e.composedPath && e.composedPath().includes(host)) return;   // パネル自身の操作では再判定しない
    scheduleThemeCheck(300);
  };
  const themeOnVisible = () => { if (!document.hidden) scheduleThemeCheck(150); };
  const themeOnFocus = () => scheduleThemeCheck(150);
  const themeOnMq = () => scheduleThemeCheck(0);

  // auto の時だけ監視する。ポーリングはしない。監視対象はテーマに関係する変化に限る
  function startThemeWatch() {
    stopThemeWatch();
    if (ui.theme !== "auto") return;
    // html / body の「テーマに関する属性・class（dark・light の単語）」が実際に変わった時だけ再判定。
    // 広告などによる無関係な class 変更や、body 配下の大量の DOM 変更（subtree は監視しない）では動かない
    themeAttrObs = new MutationObserver((records) => {
      for (const rec of records) {
        const name = rec.attributeName, now = rec.target.getAttribute(name);
        const changed = name === "class" ? classThemeKey(rec.oldValue) !== classThemeKey(now) : asTheme(rec.oldValue) !== asTheme(now);
        if (changed) { scheduleThemeCheck(50); return; }
      }
    });
    const opts = { attributes: true, attributeOldValue: true, attributeFilter: ["class", ...THEME_ATTRS] };
    themeAttrObs.observe(document.documentElement, opts);
    if (document.body) themeAttrObs.observe(document.body, opts);
    // head への <style> / <link rel=stylesheet> の追加・削除（テーマ用の CSS の差し替え）のみ
    if (document.head) {
      themeHeadObs = new MutationObserver((records) => {
        for (const rec of records) {
          for (const n of [...rec.addedNodes, ...rec.removedNodes]) {
            if (n.nodeType === 1 && (n.tagName === "STYLE" || (n.tagName === "LINK" && /stylesheet/i.test(n.getAttribute("rel") || "")))) { scheduleThemeCheck(150); return; }
          }
        }
      });
      themeHeadObs.observe(document.head, { childList: true });
    }
    try {
      themeMq = window.matchMedia("(prefers-color-scheme: dark)");
      themeMq.addEventListener ? themeMq.addEventListener("change", themeOnMq) : themeMq.addListener(themeOnMq);
    } catch (e) { themeMq = null; }
    document.addEventListener("visibilitychange", themeOnVisible);
    window.addEventListener("focus", themeOnFocus);
    // サイト側のテーマ切替ボタンなど（ページ内の操作）の後に一度だけ再判定する
    document.addEventListener("click", themeOnUserEvent, { capture: true, passive: true });
    document.addEventListener("keyup", themeOnUserEvent, { capture: true, passive: true });
  }
  function stopThemeWatch() {
    clearTimeout(themeTimer); themeTimer = null;
    if (themeAttrObs) { themeAttrObs.disconnect(); themeAttrObs = null; }
    if (themeHeadObs) { themeHeadObs.disconnect(); themeHeadObs = null; }
    if (themeMq) {
      themeMq.removeEventListener ? themeMq.removeEventListener("change", themeOnMq) : themeMq.removeListener(themeOnMq);
      themeMq = null;
    }
    document.removeEventListener("visibilitychange", themeOnVisible);
    window.removeEventListener("focus", themeOnFocus);
    document.removeEventListener("click", themeOnUserEvent, { capture: true });
    document.removeEventListener("keyup", themeOnUserEvent, { capture: true });
  }

  // auto → light → dark → auto
  function cycleTheme() {
    ui.theme = THEME_MODES[(THEME_MODES.indexOf(ui.theme) + 1) % THEME_MODES.length];
    saveUi(true);
    startThemeWatch();
    applyTheme();
  }

  function buildUi() {
    const syncInput = h("input", { type: "checkbox", id: "sync" });
    syncInput.checked = !!ui.sync;

    els = {};
    els.sync = syncInput;
    els.collapseBtn = h("button", { class: "icon-btn", title: "折りたたむ / 広げる", "aria-label": "折りたたむ" , text: "–" });
    els.dockBtn = h("button", { class: "icon-btn", text: "◧" });
    els.themeBtn = h("button", { class: "icon-btn", text: "◐" });   // 表示と説明文は updateThemeBtn() が設定
    els.closeBtn = h("button", { class: "icon-btn", title: "閉じる（ツールバーのアイコンで再表示）", "aria-label": "閉じる", text: "✕" });
    els.topbar = h("div", { class: "topbar" },
      h("span", { class: "brand", text: "Greek Verb Analyzer" }),
      h("label", { class: "sync-switch", title: "ON: 開いているページの聖句に自動で追従 / OFF: 表示を固定" },
        syncInput,
        h("span", { class: "sync-track" }, h("span", { class: "sync-knob" })),
        h("span", { class: "sync-text" })
      ),
      els.themeBtn,
      els.dockBtn,
      els.collapseBtn,
      els.closeBtn
    );

    els.prev = h("button", { class: "btn", text: "◀ 前", "aria-label": "前の節" });
    els.next = h("button", { class: "btn", text: "次 ▶", "aria-label": "次の節" });
    els.title = h("span", { class: "nav-title", text: "読み込み中..." });
    els.nav = h("div", { class: "nav" }, els.prev, els.title, els.next);

    els.strip = h("div", { class: "verse-strip" });
    els.output = h("div", { class: "output" });
    els.body = h("div", { class: "body" }, els.output, buildLegend());
    els.detail = h("div", { class: "detail" });
    els.tip = h("div", { class: "tip" });

    els.dockHandle = h("div", { class: "dock-handle", title: "ドラッグして幅を変更" });
    // 用例の一覧オーバーレイ
    els.concLemma = h("span", { class: "conc-lemma" });
    els.concCount = h("span", { class: "conc-count" });
    els.concClose = h("button", { class: "icon-btn", "aria-label": "用例を閉じる", text: "✕" });
    els.concFilter = h("div", { class: "conc-filter" });
    els.concList = h("div", { class: "conc-list" });
    els.concMore = h("button", { class: "btn", text: "さらに表示" });
    els.concStatus = h("div", { class: "message" });
    els.conc = h("div", { class: "picker conc", hidden: true },
      h("div", { class: "conc-top" },
        h("div", { class: "conc-head" }, h("span", { class: "conc-title", text: "用例" }), els.concLemma, els.concCount),
        els.concClose),
      els.concFilter,
      els.concList,
      els.concStatus,
      els.concMore
    );

    // 統語論ペイン（拡張機能内の syntax/syntax.html を iframe で埋め込む）
    els.synLemma = h("span", { class: "syn-lemma" });
    els.synGloss = h("span", { class: "syn-gloss" });
    els.synConc = h("button", { class: "btn", text: "用例", title: "この語の聖書中の用例を表示", hidden: true });
    els.synExt = h("a", { class: "btn", target: "_blank", rel: "noopener noreferrer", text: "検索 ↗", title: "公開の検索ツールで開く", hidden: true });
    els.synClose = h("button", { class: "icon-btn", "aria-label": "統語論を閉じる", title: "統語論を閉じる", text: "✕" });
    els.synStatus = h("div", { class: "syn-status", hidden: true });
    els.synFrame = null;
    els.synPane = h("div", { class: "syn-pane" },
      h("div", { class: "syn-top" },
        h("div", { class: "syn-head" }, els.synLemma, els.synGloss),
        h("div", { class: "syn-actions" }, els.synConc, els.synExt, els.synClose)),
      els.synStatus);

    els.panel = h("div", { class: "panel", role: "dialog", "aria-label": "Greek Verb Analyzer" },
      els.dockHandle, els.topbar, els.nav, els.strip, els.body, els.synPane, els.detail, els.conc, els.tip);
    els.panel.classList.toggle("syn-open", !!ui.syn);
    return els.panel;
  }

  // ── 配置・ドラッグ・サイズ ──────────────────────────────────────────
  function clampPos(left, top) {
    const w = els.panel.offsetWidth, vw = window.innerWidth, vh = window.innerHeight;
    return {
      left: Math.min(Math.max(0, left), Math.max(0, vw - Math.min(w, vw))),
      top: Math.min(Math.max(0, top), Math.max(0, vh - 48))
    };
  }

  function applyPos() {
    const p = clampPos(ui.left == null ? window.innerWidth - ui.width - 16 : ui.left, ui.top);
    els.panel.style.left = p.left + "px";
    els.panel.style.top = p.top + "px";
    return p;
  }

  // ── 分割ビュー: ページ本体を左へ押し縮める ──────────────────────────
  // <html> の右マージンだけでは動かない要素があるため、次を組み合わせる。
  //  1) html に margin-right + max-width（本文を押し縮める / width:100% / 100vw 対策）
  //  2) パネル領域にはみ出す要素を検出して対処する（scanOverflow）
  //     - position:fixed、body 自身が fixed、ICB 基準の absolute → right を寄せる
  //     - 通常フローで親の右端を越える要素（width:100vw、サイドバー分の左オフセット付き等）
  //       → 右端がパネルの左端に収まるよう max-width を決める
  //     どちらも、まず親/画面基準の指定を試し、それでも足りなければ px で上限を決める（fitAll）。
  // 変更したインラインスタイルは全て記録し、unsqueezePage() で元に戻す。
  const touched = new Map();     // 要素 -> Map(プロパティ -> 元のインライン値)
  const fixedBase = new Map();   // 位置をずらした要素 -> 元の「ビューポート右端からの距離」(px)
  const clamped = new Set();     // 幅を収めた要素
  let dockW = 0;
  let scanTimer = null, fitRaf = 0, bodyObs = null, rootObs = null;
  let watchTimer = null, pageEvtTimer = null, lastRefit = 0;

  // 開発用: 対処後もパネルに重なっている要素をコンソールへ出す（不要になったら false）
  const DEBUG_DOCK = true;
  let lastReport = "";
  function reportResidual(edge, vw) {
    const over = new Set();
    for (const el of [document.body, ...document.body.getElementsByTagName("*")]) {
      const r = el.getBoundingClientRect();
      if (r.width && r.height && r.right > edge + 1 && r.left < vw - 8) over.add(el);
    }
    const rows = [];
    for (const el of over) {
      if (el.parentElement && over.has(el.parentElement)) continue;   // 最も外側の要素だけ
      const c = getComputedStyle(el), r = el.getBoundingClientRect();
      rows.push({ tag: el.tagName, id: el.id, cls: String(el.className).slice(0, 40), pos: c.position,
        w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        minW: c.minWidth, maxW: c.maxWidth, ml: c.marginLeft, mr: c.marginRight });
    }
    const sig = dockW + ":" + rows.map((x) => x.tag + x.id + x.cls + x.w).join("|");
    if (sig === lastReport) return;
    lastReport = sig;
    console.info(`[GVA] パネル幅 ${dockW}px / まだ重なっている要素: ${rows.length}`);
    if (rows.length) console.table(rows.slice(0, 30));
  }

  function setImp(el, prop, value) {
    let m = touched.get(el);
    if (!m) touched.set(el, (m = new Map()));
    if (!m.has(prop)) m.set(prop, { value: el.style.getPropertyValue(prop), priority: el.style.getPropertyPriority(prop) });
    el.style.setProperty(prop, value, "important");
  }

  // 記録済みの要素をパネルの左端までに収める。
  // 1段階目: 画面/親基準の指定。2段階目: まだ右端がはみ出すなら px で上限を決める
  // （サイドバー分の左オフセットがある要素は、親の幅いっぱいでは収まらないため）
  function fitAll() {
    fitRaf = 0;
    if (!dockW) return;
    const edge = window.innerWidth - dockW;
    for (const [el, base] of fixedBase) {
      setImp(el, "right", (base + dockW) + "px");
      setImp(el, "max-width", `calc(100% - ${dockW}px)`);
    }
    for (const el of clamped) setImp(el, "max-width", "100%");
    for (const el of [...fixedBase.keys(), ...clamped]) {
      const r = el.getBoundingClientRect();
      if (r.right <= edge + 1) continue;
      const cs = getComputedStyle(el);
      const extra = cs.boxSizing === "border-box" ? 0
        : ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"].reduce((s, k) => s + (parseFloat(cs[k]) || 0), 0);
      setImp(el, "max-width", Math.max(80, Math.floor(edge - r.left - extra)) + "px");
    }
  }

  function scheduleFit() { if (!fitRaf) fitRaf = requestAnimationFrame(fitAll); }

  // レイアウトが後から変わった（サイドバーの開閉・ウィンドウ幅の変化など）ときに収め直す。
  //  - 右端がパネルにはみ出した            → 収め直す
  //  - px で上限を決めた要素の右端が手前で止まっている（＝空白ができた） → 収め直す
  // 追跡中の数個の要素の位置を読むだけなので軽い（問題がなければ何も書き換えない）
  const PX_CAP = /^\d+(\.\d+)?px$/;
  function checkFit(force) {
    if (!dockW) return;
    const now = Date.now();
    if (!force && now - lastRefit < 1000) return;   // 収まりきらない要素があっても連打しない
    const edge = window.innerWidth - dockW;
    for (const el of [...fixedBase.keys(), ...clamped]) {
      if (!el.isConnected) continue;
      const r = el.getBoundingClientRect();
      const capped = PX_CAP.test(el.style.getPropertyValue("max-width"));
      if (r.right > edge + 1 || (capped && r.right < edge - 2)) {
        lastRefit = now;
        fitAll();
        scheduleScan();
        return;
      }
    }
  }

  // クリックやアニメーション終了のあとに確認する（メニュー開閉など）
  function onPageEvent(e) {
    if (!dockW) return;
    clearTimeout(pageEvtTimer);
    const scan = e.type === "click";
    pageEvtTimer = setTimeout(() => { checkFit(true); if (scan) scheduleScan(); }, 150);
  }

  function translateX(cs) {
    if (!cs.transform || cs.transform === "none" || typeof DOMMatrix === "undefined") return 0;
    try { return new DOMMatrix(cs.transform).m41; } catch (e) { return 0; }
  }

  // 1回分の走査。新しく対処対象にした要素があれば true
  function scanPass() {
    const body = document.body;
    const vw = document.documentElement.clientWidth;        // スクロールバーを除く幅
    const edge = window.innerWidth - dockW;                  // パネルの左端
    const bodyStatic = getComputedStyle(body).position === "static";
    let added = false;

    for (const el of [body, ...body.getElementsByTagName("*")]) {
      if (fixedBase.has(el) || clamped.has(el)) continue;
      const r = el.getBoundingClientRect();
      // 非表示 / パネルに届かない / 画面外（スライドイン待機中のメニュー等）は対象外
      if (!r.width || !r.height || r.right <= edge + 1 || r.left >= vw - 8) continue;

      const cs = getComputedStyle(el);
      const pos = cs.position;

      if (pos === "fixed" || (el !== body && pos === "absolute" && bodyStatic && el.offsetParent === body)) {
        // ビューポート（ICB）基準の要素 → right を寄せる
        if (r.left < -1) continue;                                   // 左の画面外
        if (Math.abs(translateX(cs)) > 1) continue;                  // translateX(-50%) 等で中央寄せの要素は崩れるので触らない
        if (cs.right === "auto" && cs.left !== "0px") continue;
        fixedBase.set(el, Math.max(0, vw - r.right));
        added = true;
      } else if (el !== body && pos !== "absolute" && cs.display !== "inline") {
        // 通常フローの要素が親の右端を越えている → パネルの左端までに収める
        const p = el.parentElement;
        if (!p || r.right <= p.getBoundingClientRect().right + 1) continue;
        const po = getComputedStyle(p).overflowX;
        if (po === "auto" || po === "scroll") continue;                          // 本物の横スクロール領域
        if ((po === "hidden" || po === "clip") && r.width > vw * 1.05) continue;  // カルーセルの帯など
        if (cs.minWidth !== "auto" && cs.minWidth !== "0px") setImp(el, "min-width", "0");
        clamped.add(el);
        added = true;
      }
    }
    return added;
  }

  // パネル領域にはみ出している要素を探して対処する。
  // 親を収めた後で子が新たにはみ出すことがあるため、変化がなくなるまで数回繰り返す
  function scanOverflow() {
    scanTimer = null;
    if (!dockW || !document.body) return;
    for (const el of fixedBase.keys()) if (!el.isConnected) fixedBase.delete(el);
    for (const el of clamped) if (!el.isConnected) clamped.delete(el);

    for (let pass = 0; pass < 4; pass++) {
      if (!scanPass()) break;
      fitAll();
    }
    if (DEBUG_DOCK) reportResidual(window.innerWidth - dockW, document.documentElement.clientWidth);
  }

  function scheduleScan() {
    if (!dockW || scanTimer) return;
    scanTimer = setTimeout(scanOverflow, 300);
  }

  function watchPage() {
    // SPA 遷移などで後から追加される要素を拾う（要素の追加時のみ）
    if (!bodyObs && document.body) {
      bodyObs = new MutationObserver((muts) => {
        if (muts.some((m) => Array.from(m.addedNodes).some((n) => n.nodeType === 1))) scheduleScan();
      });
      bodyObs.observe(document.body, { childList: true, subtree: true });
    }
    // 後からレイアウトが変わる場合（サイドバーの開閉など）に追従する
    if (!watchTimer) {
      watchTimer = setInterval(() => { if (!document.hidden) checkFit(false); }, 400);
      document.addEventListener("click", onPageEvent, true);
      document.addEventListener("transitionend", onPageEvent, true);
    }
    // サイト側の JS が html の style を書き換えて余白を消した場合に付け直す
    if (!rootObs) {
      rootObs = new MutationObserver(() => {
        if (!dockW) return;
        const s = document.documentElement.style;
        if (s.getPropertyValue("margin-right") !== dockW + "px" || s.getPropertyPriority("margin-right") !== "important") {
          setImp(document.documentElement, "margin-right", dockW + "px");
        }
      });
      rootObs.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    }
  }

  function squeezePage(w) {
    dockW = w;
    const root = document.documentElement;
    setImp(root, "margin-right", w + "px");
    setImp(root, "max-width", `calc(100% - ${w}px)`);
    if (document.body) setImp(document.body, "max-width", "100%");
    for (const el of [root, document.body]) {   // min-width（100vw 等）があると max-width が効かない
      if (!el) continue;
      const mw = getComputedStyle(el).minWidth;
      if (mw !== "auto" && mw !== "0px") setImp(el, "min-width", "0");
    }
    scheduleFit();     // 既に見つけた要素は幅の変更（ドラッグ中）にも追従（フレームごとにまとめて）
    scheduleScan();
    watchPage();
  }

  function unsqueezePage() {
    if (!dockW) return;
    dockW = 0;
    clearTimeout(scanTimer); scanTimer = null;
    if (fitRaf) { cancelAnimationFrame(fitRaf); fitRaf = 0; }
    clearInterval(watchTimer); watchTimer = null;
    clearTimeout(pageEvtTimer); pageEvtTimer = null;
    document.removeEventListener("click", onPageEvent, true);
    document.removeEventListener("transitionend", onPageEvent, true);
    if (bodyObs) { bodyObs.disconnect(); bodyObs = null; }
    if (rootObs) { rootObs.disconnect(); rootObs = null; }
    for (const [el, props] of touched) {
      for (const [prop, orig] of props) {
        el.style.removeProperty(prop);
        if (orig.value) el.style.setProperty(prop, orig.value, orig.priority);
      }
    }
    touched.clear();
    fixedBase.clear();
    clamped.clear();
  }

  function maxDockWidth() { return Math.max(280, Math.floor(window.innerWidth * 0.7)); }

  // フローティング / 分割ビュー / 折りたたみ の見た目をまとめて反映
  function applyLayout() {
    const docked = !!ui.dock;
    els.panel.classList.toggle("docked", docked);
    els.panel.classList.toggle("collapsed", !docked && !!ui.collapsed);
    els.collapseBtn.hidden = docked;
    els.collapseBtn.textContent = ui.collapsed ? "+" : "–";
    els.collapseBtn.setAttribute("aria-label", ui.collapsed ? "広げる" : "折りたたむ");
    els.dockBtn.textContent = docked ? "❐" : "◧";
    els.dockBtn.title = docked ? "フローティング表示に戻す" : "右に固定してページを分割表示";
    els.dockBtn.setAttribute("aria-label", els.dockBtn.title);

    if (docked) {
      ui.dockWidth = Math.min(Math.max(280, ui.dockWidth), maxDockWidth());
      els.panel.style.width = ui.dockWidth + "px";
      els.panel.style.height = "";
      els.panel.style.left = "";
      els.panel.style.top = "";
      squeezePage(ui.dockWidth);
    } else {
      unsqueezePage();
      els.panel.style.width = ui.width + "px";
      els.panel.style.height = ui.height + "px";
      applyPos();
    }
  }

  function setupDockResize() {
    els.dockHandle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      els.dockHandle.setPointerCapture(e.pointerId);
      els.dockHandle.classList.add("dragging");
      const move = (ev) => {
        ui.dockWidth = Math.min(Math.max(280, window.innerWidth - ev.clientX), maxDockWidth());
        els.panel.style.width = ui.dockWidth + "px";
        squeezePage(ui.dockWidth);
      };
      const up = () => {
        els.dockHandle.classList.remove("dragging");
        els.dockHandle.removeEventListener("pointermove", move);
        els.dockHandle.removeEventListener("pointerup", up);
        els.dockHandle.removeEventListener("pointercancel", up);
        saveUi();
      };
      els.dockHandle.addEventListener("pointermove", move);
      els.dockHandle.addEventListener("pointerup", up);
      els.dockHandle.addEventListener("pointercancel", up);
    });
  }

  function setupDrag() {
    els.topbar.addEventListener("pointerdown", (e) => {
      if (ui.dock || e.button !== 0 || e.target.closest("button, label, input")) return;
      const r = els.panel.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      els.topbar.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const p = clampPos(ev.clientX - dx, ev.clientY - dy);
        els.panel.style.left = p.left + "px";
        els.panel.style.top = p.top + "px";
        ui.left = p.left; ui.top = p.top;
      };
      const up = () => {
        els.topbar.removeEventListener("pointermove", move);
        els.topbar.removeEventListener("pointerup", up);
        els.topbar.removeEventListener("pointercancel", up);
        saveUi();
      };
      els.topbar.addEventListener("pointermove", move);
      els.topbar.addEventListener("pointerup", up);
      els.topbar.addEventListener("pointercancel", up);
    });
  }

  function setupResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;
    resizeObs = new ResizeObserver(() => {
      if (!els || ui.collapsed || ui.dock) return;
      const w = els.panel.offsetWidth, hgt = els.panel.offsetHeight;
      if (w && hgt && (w !== ui.width || hgt !== ui.height)) {
        ui.width = w; ui.height = hgt;
        saveUi();
      }
    });
    resizeObs.observe(els.panel);
  }

  // ── ツールチップ ───────────────────────────────────────────────────
  function showTip(target) {
    const tip = els.tip;
    tip.textContent = target.dataset.info || "";
    tip.style.display = "block";
    const r = target.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.min(Math.max(4, left), window.innerWidth - tw - 4);
    let top = r.top - th - 6;
    if (top < 4) top = r.bottom + 6;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { if (els) els.tip.style.display = "none"; }

  // ══════════════════════════════════════════════════════════════════
  // 描画
  // ══════════════════════════════════════════════════════════════════
  function updateTitle() {
    const text = `${BOOK_NAME_JA[cur.book] || cur.book} ${cur.chapter}章 ${cur.verse}節`;
    els.title.textContent = text;
  }

  function showMessage(text) {
    curTokens = [];
    els.output.replaceChildren(h("span", { class: "message", text }));
    els.detail.replaceChildren();
  }

  let curTokens = [];

  function searchUrl(lemma, vcode) {
    const p = new URLSearchParams();
    p.set("tool", "search");
    p.set("lemma", lemma);
    if (vcode) { // 同じ活用（時制・態・法）に絞った検索
      const [t, v, m] = vcode;
      if (TENSE[t]) p.set("tense", TENSE[t][0]);
      if (VOICE[v]) p.set("voice", VOICE[v][0]);
      if (MOOD[m]) p.set("mood", MOOD[m][0]);
      p.set("layers", "lemma,morph");
    }
    return `${SEARCH_TOOL_URL}?${p.toString()}`;
  }

  function showDetailHint() {
    els.detail.replaceChildren(h("div", { class: "detail-hint", text: "↑ 単語をクリックすると、その語の用例を表示します" },
      h("button", { class: "btn", text: "統語論を表示", onclick: () => setSyn(true) })));
  }

  function showDetail(i) {
    const [text, , gloss, vcode, lemma] = curTokens[i];
    const dec = decodeVerb(vcode);
    const head = h("div", { class: "detail-head" },
      h("span", { class: "detail-lemma", text: lemma || text }),
      gloss ? h("span", { class: "detail-gloss", text: gloss }) : null,
      h("button", { class: "icon-btn", "aria-label": "選択を解除", title: "選択を解除", text: "✕",
        onclick: () => selectToken(-1) })
    );
    const kids = [head];
    if (dec) kids.push(h("div", { class: "detail-parse", text: `${text} — ${dec.info}` })); // 動詞だけ活用を表示（名詞等は語形が上のカードと同じ）
    const actions = h("div", { class: "detail-actions" });
    kids.push(actions);
    actions.append(h("button", { class: "btn primary", text: "統語論", title: "この語の文中での役割を、パネル内に表示", onclick: () => setSyn(true) }));
    if (lemma) {
      actions.append(h("button", { class: "btn", text: "用例を表示", title: "この語の聖書中の用例を表示", onclick: () => openConc(lemma, vcode) }));
      actions.append(h("a", { class: "btn", href: searchUrl(lemma, null), target: "_blank", rel: "noopener noreferrer", text: "検索 ↗", title: "公開の検索ツールで開く" }));
    } else {
      kids.push(h("div", { class: "detail-warn", text: "この語のレンマ情報がありません。拡張機能の data/ フォルダが古い可能性があります（build-data.js で作り直してください）。" }));
    }
    els.detail.replaceChildren(...kids);
  }

  // ── 用例一覧（パネル内に表示） ─────────────────────────────────────
  let conc = null;     // { lemma, vcode, filter: "all" | "form", offset, total }
  let concSeq = 0;

  function formLabel(vcode) {
    const dec = decodeVerb((vcode || "").slice(0, 3) + "--");
    return dec ? dec.info : "";
  }

  function renderConcFilter() {
    els.concFilter.replaceChildren();
    if (!conc.vcode) return;
    const chip = (key, label) => h("button", { class: "chip" + (conc.filter === key ? " on" : ""), text: label,
      onclick: () => { if (conc.filter !== key) { conc.filter = key; renderConcFilter(); loadConcPage(true); } } });
    els.concFilter.append(chip("all", "すべての形"), chip("form", `同じ活用のみ（${formLabel(conc.vcode)}）`));
  }

  function concItem(it) {
    const tok = it.tokens[it.ti];
    const dec = decodeVerb(tok[3]);
    const text = h("div", { class: "conc-text" });
    const gloss = h("div", { class: "conc-gloss" });

    it.tokens.forEach(([w, after, jp], idx) => {
      text.append(
        idx === it.ti ? h("span", { class: "hit", text: w }) : document.createTextNode(w),
        document.createTextNode((after || "") + " ")
      );

      if (jp) {
        gloss.append(
          h("span", {
            class: "conc-gloss-word" + (idx === it.ti ? " hit" : ""),
            text: jp
          })
        );
      }
    });

    return h("div", { class: "conc-item" },
      h("button", { class: "conc-ref", title: "この節を解析パネルで開く", text: `${BOOK_SHORT_JA[it.book] || it.book} ${it.ch}:${it.v}`,
        onclick: () => { closeConc(); showRef(it.book, it.ch, it.v, it.ti); } }),
      text,
      gloss,
      h("div", { class: "conc-form", text: dec ? `${tok[0]} — ${dec.info}` : tok[0] })
    );
  }

  async function loadConcPage(reset) {
    const my = ++concSeq;
    if (reset) { conc.offset = 0; els.concList.replaceChildren(); }
    els.concMore.hidden = true;
    els.concStatus.textContent = reset ? "用例を検索中…（初回は数秒かかることがあります）" : "読み込み中…";
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: "concordance", lemma: conc.lemma, offset: conc.offset, limit: 20,
        form: conc.filter === "form" ? (conc.vcode || "").slice(0, 3) : "" });
    } catch (e) {
      if (my === concSeq) els.concStatus.textContent = errorText(e);
      return;
    }
    if (my !== concSeq || !els) return;
    if (!res || !res.ok) { els.concStatus.textContent = `読み込みエラー: ${(res && res.error) || "応答がありません"}`; return; }

    conc.total = res.total;
    res.items.forEach((it) => els.concList.append(concItem(it)));
    conc.offset += res.items.length;
    els.concCount.textContent = `${res.total}件` + (conc.offset < res.total ? `（${conc.offset}件目まで表示）` : "");
    els.concStatus.textContent = res.total === 0 ? "用例が見つかりませんでした" : "";
    els.concMore.hidden = conc.offset >= res.total;
  }

  function openConc(lemma, vcode) {
    conc = { lemma, vcode: vcode || "", filter: "all", offset: 0, total: 0 };
    els.concLemma.textContent = lemma;
    els.concCount.textContent = "";
    els.conc.hidden = false;
    renderConcFilter();
    loadConcPage(true);
    els.concClose.focus();
  }

  function closeConc() {
    concSeq++;
    els.conc.hidden = true;
    conc = null;
  }

  // ── 統語論ペイン（パネル内に常時表示。語のクリックで iframe にメッセージを送って切り替える） ──
  let synReady = false;    // iframe 側の準備完了
  let synBroken = false;   // 6秒待っても準備完了が来ない（サイトのCSP等で埋め込めない）
  let synTimer = null;
  let synPending = null;   // 準備完了前に来た要求（完了後に送る）

  const synOrigin = () => { const u = new URL(chrome.runtime.getURL("")); return u.protocol + "//" + u.host; };
  const synRef = () => `${cur.book} ${cur.chapter}:${cur.verse}`;

  function synUrl(idx) {
    const p = new URLSearchParams({ ref: synRef(), idx: String(idx), theme: curTheme });
    return chrome.runtime.getURL("syntax/syntax.html") + "?" + p.toString();
  }

  // 統語論ペインを使う状態になったら、先に読み込んでおく（最初のクリックを速くする）
  function ensureSynFrame() {
    if (!els || els.synFrame || !ui.syn) return;
    els.synFrame = h("iframe", { class: "syn-frame", title: "統語論", src: synUrl(-1) });
    els.synPane.insertBefore(els.synFrame, els.synStatus);
    synTimer = setTimeout(() => {
      if (!els || synReady) return;
      synBroken = true;
      els.synFrame.hidden = true;
      renderSynStatus();
    }, 6000);
  }

  function renderSynStatus() {
    if (!synBroken) { els.synStatus.hidden = true; return; }
    const idx = selIdx >= 0 ? selIdx : -1;
    els.synStatus.replaceChildren(
      h("span", { text: "統語論を、このサイトの中には埋め込めませんでした（ページ側の設定による制限の可能性があります）。" }),
      h("a", { class: "btn primary", href: synUrl(idx), target: "_blank", rel: "noopener", text: "新しいタブで開く ↗" })
    );
    els.synStatus.hidden = false;
  }

  function updateSynHeader(idx) {
    const tok = idx >= 0 ? curTokens[idx] : null;
    if (!tok) {
      els.synLemma.textContent = "";
      els.synGloss.textContent = "↑ 単語をクリックすると、文中での役割を表示します";
      els.synConc.hidden = true;
      els.synExt.hidden = true;
      return;
    }
    const [text, , gloss, vcode, lemma] = tok;
    els.synLemma.textContent = lemma || text;
    els.synGloss.textContent = gloss || "";
    els.synConc.hidden = !lemma;
    els.synConc.onclick = () => { if (lemma) openConc(lemma, vcode); };
    els.synExt.hidden = !lemma;
    if (lemma) els.synExt.href = searchUrl(lemma, null);
  }

  function pushSyn(idx) {
    if (!els || !ui.syn) return;
    ensureSynFrame();
    updateSynHeader(idx);
    synPending = { type: "GVA_SYNTAX_SET", ref: synRef(), idx };
    if (synReady) postSyn(synPending);
    if (synBroken) renderSynStatus();
  }

  function postSyn(msg) {
    try { els.synFrame.contentWindow.postMessage(msg, synOrigin()); } catch (e) { /* 通信できない場合は何もしない */ }
  }

  function onSynMessage(ev) {
    if (!els || !els.synFrame || ev.source !== els.synFrame.contentWindow) return;
    if (ev.data && ev.data.type === "GVA_SYNTAX_READY") {
      clearTimeout(synTimer);
      synReady = true;
      synBroken = false;
      els.synStatus.hidden = true;
      els.synFrame.hidden = false;
      postSyn({ type: "GVA_THEME", theme: curTheme });   // 準備完了前にテーマが変わっていた場合に備える
      if (synPending) postSyn(synPending);
    }
  }

  function setSyn(on) {
    ui.syn = !!on;
    saveUi();
    els.panel.classList.toggle("syn-open", ui.syn);
    selectToken(selIdx); // 表示を切り替え先に合わせて更新
  }

  let selIdx = -1; // 選択中の語
  function selectToken(i) {
    if (i >= curTokens.length) i = -1;
    selIdx = i;
    els.output.querySelectorAll(".tok").forEach((el) => el.classList.toggle("selected", Number(el.dataset.i) === i));
    if (ui.syn) pushSyn(i);                       // 統語論ペインを更新（iframe は作り直さない）
    if (i < 0 || !curTokens[i]) showDetailHint(); else showDetail(i);
  }

  function renderTokens(tokens) {
    curTokens = tokens;
    const wrap = h("div", { class: "tokens" });
    tokens.forEach((token, i) => {
      const [text, after, gloss, vcode, lemma] = token;
      const dec = decodeVerb(vcode);
      const word = h("div", { class: "word" },
        dec ? h("span", { class: dec.cls, "data-info": dec.info, text }) : h("span", { text }),
        after ? h("span", { class: "after", text: after }) : null
      );
      const tokenLabel = ui.syn ? `${text}。クリックして文中での役割（統語論）を表示` : (lemma ? `${text} — ${lemma}。クリックして用例を表示` : `${text}。クリックして詳細を表示`);
      wrap.append(h("button", {
        class: "tok",
        "data-i": String(i),
        title: tokenLabel,
        "aria-label": tokenLabel,
        onclick: () => {
          selectToken(i);
          if (!ui.syn && lemma) openConc(lemma, vcode); // 統語論をOFFにしている時は従来どおり用例を開く
        }
      }, word, h("div", { class: "gloss", text: gloss || "(-)" })));
    });
    els.output.replaceChildren(wrap);
    selectToken(-1); // 節が変わったら選択を解除（統語論ペインにも新しい節を伝える）
  }

  function buildStrip(book) {
    const key = `${cur.book}.${cur.chapter}`;
    if (key !== stripKey) {
      stripKey = key;
      els.strip.replaceChildren();
      for (const v of book.versesOf[cur.chapter] || []) {
        els.strip.append(h("button", { class: "verse-chip", "data-verse": String(v), text: String(v),
          onclick: () => showRef(cur.book, cur.chapter, v) }));
      }
    }
    let currentChip = null;
    els.strip.querySelectorAll(".verse-chip").forEach((chip) => {
      const isCur = chip.dataset.verse === String(cur.verse);
      chip.classList.toggle("current", isCur);
      if (isCur) currentChip = chip;
    });
    if (currentChip) currentChip.scrollIntoView({ inline: "center", block: "nearest" });
  }

  // selectTi（省略可）: 用例から移動した時だけ渡す、節内の語の位置。表示後にその語を選択する
  async function showRef(bookCode, chapter, verse, selectTi) {
    if (!els) return;
    const my = ++seq;
    cur = { book: bookCode, chapter: Number(chapter), verse: Number(verse) };
    updateTitle();
    ui.ref = { ...cur };
    saveUi();
    if (!bookCache.has(cur.book)) showMessage("読み込み中…");

    let book;
    try {
      book = await loadBook(cur.book);
    } catch (e) {
      if (my === seq && els) showMessage(errorText(e));
      return;
    }
    if (my !== seq || !els) return;

    buildStrip(book);
    const tokens = book.data[cur.chapter] && book.data[cur.chapter][cur.verse];
    if (!tokens) {
      showMessage(`データが見つかりません (${BOOK_NAME_JA[cur.book]} ${cur.chapter}章 ${cur.verse}節)`);
      return;
    }
    renderTokens(tokens);
    els.body.scrollTop = 0;
    // 用例から移動した場合のみ、対応する語を選択（手動クリックと同じ selectToken を使う）。
    // 範囲外・不正な値は何もしない（renderTokens が作った「未選択」の状態のまま）。
    if (Number.isInteger(selectTi) && selectTi >= 0 && selectTi < tokens.length) {
      selectToken(selectTi);
      const sel = els.output.querySelector(".tok.selected");
      if (sel) sel.scrollIntoView({ block: "nearest" }); // 語の一覧の外に出ないように
    }
  }

  // 前の節・次の節へ（章・書の境界をまたいで移動）
  async function step(dir) {
    let book;
    try { book = await loadBook(cur.book); } catch (e) { showMessage(errorText(e)); return; }

    const verses = book.versesOf[cur.chapter] || [];
    const i = verses.indexOf(cur.verse);
    if (i === -1) {
      if (verses.length) showRef(cur.book, cur.chapter, verses[0]);
      return;
    }
    if (verses[i + dir] !== undefined) { showRef(cur.book, cur.chapter, verses[i + dir]); return; }

    const nextChapter = book.chapters[book.chapters.indexOf(cur.chapter) + dir];
    if (nextChapter !== undefined) {
      const vs = book.versesOf[nextChapter];
      showRef(cur.book, nextChapter, dir > 0 ? vs[0] : vs[vs.length - 1]);
      return;
    }

    const nextBookCode = BOOK_ORDER[BOOK_ORDER.indexOf(cur.book) + dir];
    if (!nextBookCode) return;
    try {
      const nb = await loadBook(nextBookCode);
      const ch = dir > 0 ? nb.chapters[0] : nb.chapters[nb.chapters.length - 1];
      const vs = nb.versesOf[ch];
      showRef(nextBookCode, ch, dir > 0 ? vs[0] : vs[vs.length - 1]);
    } catch (e) { showMessage(errorText(e)); }
  }

  // ══════════════════════════════════════════════════════════════════
  // ページとの同期（SPAのURL変更も検知）
  // ══════════════════════════════════════════════════════════════════
  function checkUrl(force) {
    if (!els) return;
    if (!alive()) { stopPolling(); showMessage(errorText(new Error("context invalidated"))); return; }
    if (!ui.sync) return;
    const ref = parsePageUrl(location.href);
    if (!ref) return;
    const key = `${ref.book}.${ref.chapter}.${ref.verse}`;
    if (!force && key === lastUrlKey) return; // 同じ参照なら再描画しない（◀▶で動かした位置を保つ）
    lastUrlKey = key;
    showRef(ref.book, ref.chapter, ref.verse);
  }

  function startPolling() {
    stopPolling();
    // YouVersion等はページ遷移なしでURLだけ書き換わるため、URLを定期的に確認する
    pollTimer = setInterval(() => { if (!document.hidden) checkUrl(false); }, 600);
    window.addEventListener("popstate", onNav);
    window.addEventListener("hashchange", onNav);
  }
  function stopPolling() {
    clearInterval(pollTimer); pollTimer = null;
    window.removeEventListener("popstate", onNav);
    window.removeEventListener("hashchange", onNav);
  }
  function onNav() { checkUrl(false); }
  function onWindowResize() { if (!els) return; if (ui.dock) applyLayout(); else applyPos(); }

  // ══════════════════════════════════════════════════════════════════
  // 取り付け・取り外し
  // ══════════════════════════════════════════════════════════════════
  function mount() {
    if (host) return;
    host = document.createElement("div");
    host.id = "gva-root";
    const shadow = host.attachShadow({ mode: "open" });

    // CSP の影響を受けにくい adoptedStyleSheets を優先
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS);
      shadow.adoptedStyleSheets = [sheet];
    } catch (e) {
      const style = document.createElement("style");
      style.textContent = CSS;
      shadow.append(style);
    }
    shadow.append(buildUi());
    document.documentElement.append(host);

    // サイト側のショートカットキーが、パネル操作中に反応しないようにする
    ["keydown", "keyup", "keypress"].forEach((t) => host.addEventListener(t, (e) => e.stopPropagation()));

    // 初期サイズ・位置
    applyLayout();
    applyTheme();        // 位置が決まってから判定（panel の隣の背景を見るため）
    startThemeWatch();
    setupDrag();
    setupDockResize();
    setupResizeObserver();
    window.addEventListener("resize", onWindowResize);

    // ボタン類
    els.prev.addEventListener("click", () => step(-1));
    els.next.addEventListener("click", () => step(1));
    // 参照箇所タイトルは表示専用。
    els.collapseBtn.addEventListener("click", () => {
      ui.collapsed = !ui.collapsed;
      applyLayout();
      saveUi(true);
    });
    els.dockBtn.addEventListener("click", () => {
      ui.dock = !ui.dock;
      applyLayout();
      saveUi(true);
    });
    els.closeBtn.addEventListener("click", () => setVisible(false));
    els.themeBtn.addEventListener("click", cycleTheme);

    els.sync.addEventListener("change", () => {
      ui.sync = els.sync.checked;
      saveUi(true);
      if (ui.sync) checkUrl(true); // ONに戻した瞬間に現在のページへ追従
    });

    // パネル内のキー操作（パネルにフォーカスがある時だけ）
    els.panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.conc.hidden) { closeConc(); return; }
      if (!els.conc.hidden || e.target.closest("select, input")) return;
      if (e.key === "ArrowLeft" || e.key === "h") step(-1);
      else if (e.key === "ArrowRight" || e.key === "l") step(1);
    });

    els.concClose.addEventListener("click", closeConc);
    els.synClose.addEventListener("click", () => setSyn(false));
    window.addEventListener("message", onSynMessage);
    els.concMore.addEventListener("click", () => loadConcPage(false));

    // 動詞ツールチップ
    els.output.addEventListener("mouseover", (e) => {
      const t = e.target.closest && e.target.closest(".verb-hit");
      if (t) showTip(t);
    });
    els.output.addEventListener("mouseout", hideTip);
    els.body.addEventListener("scroll", hideTip);

    // 最初の表示
    lastUrlKey = null;
    stripKey = null;
    const fromUrl = ui.sync ? parsePageUrl(location.href) : null;
    if (fromUrl) {
      lastUrlKey = `${fromUrl.book}.${fromUrl.chapter}.${fromUrl.verse}`;
      showRef(fromUrl.book, fromUrl.chapter, fromUrl.verse);
    } else {
      showRef(ui.ref.book, ui.ref.chapter, ui.ref.verse);
    }
    startPolling();
  }

  function unmount() {
    stopPolling();
    stopThemeWatch();
    window.removeEventListener("resize", onWindowResize);
    window.removeEventListener("message", onSynMessage);
    clearTimeout(synTimer); synReady = false; synBroken = false; synPending = null;
    if (resizeObs) { resizeObs.disconnect(); resizeObs = null; }
    unsqueezePage();
    if (host) host.remove();
    host = null; els = null;
  }

  function setVisible(v) {
    ui.visible = v;
    saveUi(true);
    if (v) mount(); else unmount();
  }

  // ══════════════════════════════════════════════════════════════════
  // 起動
  // ══════════════════════════════════════════════════════════════════
  const ready = (async () => {
    try {
      const r = await chrome.storage.local.get("gva_ui");
      ui = { ...DEFAULT_UI, ...(r.gva_ui || {}) };
      ui.ref = { ...DEFAULT_UI.ref, ...(ui.ref || {}) };
      if (!THEME_MODES.includes(ui.theme)) ui.theme = "auto";   // 未保存・不正な値は auto
    } catch (e) { /* 既定値で続行 */ }
    if (ui.visible) mount();
  })();

  // ツールバーのアイコン / ショートカットからの操作
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.type === "toggle") ready.then(() => setVisible(!host));
    else if (msg.type === "show") ready.then(() => { if (!host) setVisible(true); });
  });
})();
