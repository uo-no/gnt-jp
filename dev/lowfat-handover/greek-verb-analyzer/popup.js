let allJsonData = []; // 全データを保持
let currentBook = "MAT";    // デフォルトの書
let currentChapter = "1"; // デフォルトの章
let currentVerse = "1";   // デフォルトの節
let hasRendered = false;  // 一度でも描画したか

const BOOK_NAME_JA = {
  "MAT": "マタイによる福音書", "MRK": "マルコによる福音書", "LUK": "ルカによる福音書", "JHN": "ヨハネによる福音書",
  "ACT": "使徒言行録", "ROM": "ローマの信徒への手紙", "1CO": "コリントの信徒への手紙一", "2CO": "コリントの信徒への手紙二",
  "GAL": "ガラテヤの信徒への手紙", "EPH": "エフェソの信徒への手紙", "PHP": "フィリピの信徒への手紙", "COL": "コロサイの信徒への手紙",
  "1TH": "テサロニケの信徒への手紙一", "2TH": "テサロニケの信徒への手紙二", "1TI": "テモテへの手紙一", "2TI": "テモテへの手紙二",
  "TIT": "テトスへの手紙", "PHM": "フィレモンへの手紙", "HEB": "ヘブライ人への手紙", "JAS": "ヤコブの手紙",
  "1PE": "ペトロの手紙一", "2PE": "ペトロの手紙二", "1JN": "ヨハネの手紙一", "2JN": "ヨハネの手紙二",
  "3JN": "ヨハネの手紙三", "JUD": "ユダの手紙", "REV": "ヨハネの黙示録"
};

// ── MorphGNT raw文字列のパース ────────────────────────────────────────────
const RAW_TENSE = { P:"present", I:"imperfect", F:"future", A:"aorist", X:"perfect", Y:"pluperfect" };
const RAW_VOICE = { A:"active", M:"middle", P:"passive", D:"middle" };
const RAW_MOOD  = { I:"indicative", D:"imperative", S:"subjunctive", O:"optative", N:"infinitive", P:"participle" };
const RAW_NUM   = { S:"singular", P:"plural", D:"dual" };
const RAW_PERS  = { "1":"1", "2":"2", "3":"3" };

function parseRaw(raw) {
  if (!raw || typeof raw !== "string" || raw.length < 4) return null;
  const cleanRaw = raw.replace(/-/g, "");
  if (cleanRaw[0] !== "V") return null;

  return {
    pos:    "V",
    tense:  RAW_TENSE[cleanRaw[1]] || null,
    voice:  RAW_VOICE[cleanRaw[2]] || null,
    mood:   RAW_MOOD[cleanRaw[3]]  || null,
    person: RAW_PERS[cleanRaw[4]]  || null,
    number: RAW_NUM[cleanRaw[5]]   || null
  };
}

function normalizeMorph(morph) {
  if (!morph) return { isVerb: false };

  if (morph.raw) {
    const parsed = parseRaw(String(morph.raw));
    if (parsed) return { isVerb: true, ...parsed };
  }

  if (typeof morph === 'string') {
    const parsed = parseRaw(morph);
    if (parsed) return { isVerb: true, ...parsed };
  }

  const isVerb = morph.pos === "V" || morph.partOfSpeech === "verb" || morph.type === "verb" || morph.tense;
  if (!isVerb) return { isVerb: false };

  const FIELD_TENSE = { "P":"present", "I":"imperfect", "F":"future", "A":"aorist", "X":"perfect", "Y":"pluperfect" };
  const FIELD_VOICE = { "A":"active", "M":"middle", "P":"passive", "D":"middle" };
  const FIELD_MOOD  = { "I":"indicative", "D":"imperative", "S":"subjunctive", "O":"optative", "N":"infinitive", "P":"participle" };
  const FIELD_NUM   = { "S":"singular", "P":"plural", "D":"dual" };
  const FIELD_PERS  = { "1":"1", "2":"2", "3":"3" };

  return {
    isVerb: true,
    tense:  FIELD_TENSE[morph.tense]  || morph.tense  || null,
    voice:  FIELD_VOICE[morph.voice]  || morph.voice  || null,
    mood:   FIELD_MOOD[morph.mood]    || morph.mood   || null,
    number: FIELD_NUM[morph.number]   || morph.number || null,
    person: FIELD_PERS[morph.person]  || morph.person || null
  };
}

const TENSE_LABEL  = { present:"現在", imperfect:"未完了", future:"未来", aorist:"アオリスト", perfect:"完了", pluperfect:"過去完了" };
const VOICE_LABEL  = { active:"能動", middle:"中動", passive:"受動" };
const MOOD_LABEL   = { indicative:"直説法", subjunctive:"接続法", optative:"希求法", imperative:"命令法", infinitive:"不定詞", participle:"分詞" };
const PERSON_LABEL = { "1":"1人称", "2":"2人称", "3":"3人称" };
const NUMBER_LABEL = { singular:"単数", plural:"複数", dual:"双数" };

function getMorphLabel(morph) {
  return [
    TENSE_LABEL[morph.tense],
    VOICE_LABEL[morph.voice],
    MOOD_LABEL[morph.mood],
    PERSON_LABEL[morph.person],
    NUMBER_LABEL[morph.number]
  ].filter(Boolean).join("/");
}

function decorateWord(word, rawMorph) {
  const morph = normalizeMorph(rawMorph);
  if (!morph.isVerb) return `<span>${word}</span>`;

  const info = getMorphLabel(morph);
  const m = morph;
  const classes = ["verb-hit", m.tense || "", (m.voice === "middle" || m.voice === "passive") ? m.voice : "", m.mood || ""].filter(Boolean).join(" ");
  return `<span class="${classes}" data-info="${info}">${word}</span>`;
}

// ── 節番号の帯 ────────────────────────────────────────────────────────────
let stripKey = null; // 帯を最後に作った「書.章」

function renderVerseStrip() {
  const strip = document.getElementById("verse-strip");
  if (!strip) return;

  const key = `${currentBook}.${currentChapter}`;
  if (key !== stripKey) {
    stripKey = key;
    strip.innerHTML = "";
    const verses = [...new Set(
      allJsonData
        .filter(w => String(w.book || "").toUpperCase() === currentBook.toUpperCase() && String(w.chapter) === currentChapter)
        .map(w => Number(w.verse))
    )].sort((a, b) => a - b);

    verses.forEach(v => {
      const btn = document.createElement("button");
      btn.className = "verse-chip";
      btn.dataset.verse = String(v);
      btn.textContent = String(v);
      btn.addEventListener("click", () => renderVerse(currentBook, currentChapter, String(v)));
      strip.appendChild(btn);
    });
  }

  let currentChip = null;
  strip.querySelectorAll(".verse-chip").forEach(chip => {
    const isCurrent = chip.dataset.verse === String(Number(currentVerse));
    chip.classList.toggle("current", isCurrent);
    if (isCurrent) currentChip = chip;
  });
  if (currentChip) currentChip.scrollIntoView({ inline: "center", block: "nearest" });
}

// ── 節を描画するメイン関数 ────────────────────────────────────────────────
function renderVerse(bookName, chapterNum, verseNum) {
  hasRendered = true;
  currentBook = String(bookName);
  currentChapter = String(chapterNum);
  currentVerse = String(verseNum);

  console.log(`[UI描画] 描画対象: 書=${currentBook}, 章=${currentChapter}, 節=${currentVerse}`);

  const navTitle = document.getElementById("nav-title");
  if (navTitle) {
    const bookJa = BOOK_NAME_JA[currentBook] || currentBook;
    navTitle.textContent = `${bookJa} ${currentChapter}章 ${currentVerse}節`;
  }

  renderVerseStrip();

  const verseWords = allJsonData.filter(w => 
    String(w.book || "").toUpperCase() === currentBook.toUpperCase() && 
    String(w.chapter) === currentChapter && 
    String(w.verse) === currentVerse
  );

  if (verseWords.length === 0) {
    document.getElementById("output").innerHTML = `<span>データが見つかりません (${currentBook} ${currentChapter}章 ${currentVerse}節)</span>`;
    document.getElementById("outputCard").style.display = "block";
    return;
  }

  let html = `<div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start;">`;
  verseWords.forEach(w => {
    const token = w.text || w.word || "";
    const decoratedWord = decorateWord(token, w.morph);
    const gloss = w.japanese || w.gloss || "(-)";

    html += `
      <div style="display: flex; flex-direction: column; align-items: center; background: #fff; border: 0.5px solid #e5e4de; border-radius: 6px; padding: 6px 8px; min-width: 45px;">
        <div style="font-size: 16px; margin-bottom: 4px;">${decoratedWord}</div>
        <div style="font-size: 10px; color: #666; border-top: 0.5px solid #f0efeb; width: 100%; text-align: center; padding-top: 2px;">${gloss}</div>
      </div>
    `;
  });
  html += `</div>`;

  document.getElementById("output").innerHTML = html;
  document.getElementById("outputCard").style.display = "block";
}

// ── 前の節・次の節へ移動するヘルパー関数 ──────────────────────────────────
function moveVerse(direction) {
  const targetBookStr = String(currentBook);
  const targetChapterStr = String(currentChapter);

  const verses = [...new Set(
    allJsonData
      .filter(w => String(w.book || "").toUpperCase() === targetBookStr.toUpperCase() && String(w.chapter) === targetChapterStr)
      .map(item => Number(item.verse))
  )].sort((a, b) => a - b);

  if (verses.length === 0) return;

  const currentIndex = verses.indexOf(Number(currentVerse));
  if (currentIndex === -1) {
    renderVerse(currentBook, currentChapter, String(verses[0]));
    return;
  }

  let nextIndex = currentIndex + direction;
  if (nextIndex >= 0 && nextIndex < verses.length) {
    renderVerse(currentBook, currentChapter, String(verses[nextIndex]));
  }
}

// ── URL解析（サイト別 + 汎用フォールバック） ─────────────────────────────
// 長い名称・番号付きの書を先に並べる（同一位置でヒットした場合は先頭が優先）
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

// サイト側の書コードの揺れ吸収用（念のため）
const BOOK_CODE_ALIAS = {
  "MAR": "MRK", "JOH": "JHN", "PHI": "PHP", "JAM": "JAS",
  "1JO": "1JN", "2JO": "2JN", "3JO": "3JN"
};

function safeDecode(str) {
  try { return decodeURIComponent(str); } catch (e) { return str; }
}

function toNumStr(v) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? "1" : String(n);
}

// 書コード + 章 + 節 から参照オブジェクトを作る（新約以外は null）
function makeRef(code, chapter, verse) {
  let c = String(code || "").toUpperCase();
  c = BOOK_CODE_ALIAS[c] || c;
  if (!BOOK_NAME_JA[c]) return null;
  return { book: c, chapter: toNumStr(chapter), verse: verse ? toNumStr(verse) : "1" };
}

// テキスト中から最初に現れる書名を探す
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

// 「John 3:16」「ヨハネ3章16節」「1 John 3」のような文字列を解析
function parseReferenceText(text) {
  const b = findBookInText(text);
  if (!b) return null;
  const rest = text.slice(b.end);
  const m = rest.match(/^[^\d]{0,12}(\d+)(?:\s*[:：.章\/_-]\s*(\d+))?/);
  return makeRef(b.code, m ? m[1] : "1", m && m[2] ? m[2] : "1");
}

// タブのURLから { book, chapter, verse } を取り出す。該当なしは null
function parseTabUrl(urlStr) {
  let u;
  try { u = new URL(urlStr); } catch (e) { return null; }
  const host = u.hostname.toLowerCase();
  const path = safeDecode(u.pathname);

  // YouVersion: /bible/1819/JHN.3.16.JA1955 , /ja/bible/111/1CO.13.NIV
  if (host === "bible.com" || host.endsWith(".bible.com")) {
    const m = path.match(/\/bible\/\d+\/([0-9a-z]{3})\.(\d+)(?:\.(\d+))?/i);
    return m ? makeRef(m[1], m[2], m[3]) : null;
  }

  // ともに聴く聖書(PRS): /ja/bible/jhn.3.jdb （節はURLに含まれない）
  if (host === "prs.app" || host === "prsi.org" || host.endsWith(".prsi.org")) {
    const m = path.match(/\/bible\/([0-9a-z]{3})\.(\d+)(?:\.(\d+))?(?:\.[a-z0-9]+)?/i);
    return m ? makeRef(m[1], m[2], m[3]) : null;
  }

  // BibleGateway: /passage/?search=John+3%3A16&version=NIV
  if (host === "biblegateway.com" || host.endsWith(".biblegateway.com")) {
    const search = u.searchParams.get("search");
    if (!search) return null;
    return parseReferenceText(search.split(";")[0]);
  }

  // その他のサイト: パスとクエリから推測
  return parseReferenceText(safeDecode(u.pathname + " " + u.search).replace(/\+/g, " "));
}

// ── アクティブタブとの同期 ────────────────────────────────────────────────
let lastTabKey = null; // 直前にタブから反映した「書.章.節」

function syncWithActiveTab() {
  // 「タブと同期」がオフの間は、タブの変化を無視して表示を固定する
  const syncToggle = document.getElementById("auto-sync-toggle");
  if (syncToggle && !syncToggle.checked) return;

  // ポップアップ自身ではなく、通常ブラウザウィンドウの直近フォーカス中のタブを対象にする
  chrome.windows.getLastFocused({ windowTypes: ["normal"] }, (win) => {
    if (chrome.runtime.lastError || !win) {
      if (!hasRendered) renderVerse(currentBook, currentChapter, currentVerse);
      return;
    }
    chrome.tabs.query({ active: true, windowId: win.id }, (tabs) => {
      const url = tabs[0]?.url;
      console.log("[URL解析] 対象タブURL:", url);
      const ref = url ? parseTabUrl(url) : null;

      if (ref) {
        const key = `${ref.book}.${ref.chapter}.${ref.verse}`;
        // 同じ参照なら再描画しない（◀▶で動かした位置がタブ更新でリセットされるのを防ぐ）
        if (key !== lastTabKey) {
          lastTabKey = key;
          renderVerse(ref.book, ref.chapter, ref.verse);
        }
      } else if (!hasRendered) {
        renderVerse(currentBook, currentChapter, currentVerse);
      }
    });
  });
}

// 初回同期より前に、保存済みのスイッチ状態を反映しておく
(function () {
  const t = document.getElementById('auto-sync-toggle');
  if (t) { try { t.checked = localStorage.getItem('autoSync') !== 'off'; } catch (e) {} }
})();

// ── データ読み込みと初期化 ────────────────────────────────────────────────
fetch("morphgnt.json")
  .then(res => res.json())
  .then(data => {
    allJsonData = data;
    console.log("morphgnt.json 読み込み完了. 総単語数:", data.length);

    // 初回起動時にURLと同期
    syncWithActiveTab();

    // タブの切り替えや更新時に自動同期
    // SPA(YouVersion等)のURL変更は status:complete にならないため changeInfo.url も見る
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active) {
        syncWithActiveTab();
      }
    });
    chrome.windows.onFocusChanged.addListener((winId) => {
      if (winId !== chrome.windows.WINDOW_ID_NONE) syncWithActiveTab();
    });
    chrome.tabs.onActivated.addListener(() => {
      syncWithActiveTab();
    });
  })
  .catch(err => {
    console.error("morphgnt.json 読み込みエラー:", err);
    const navTitle = document.getElementById("nav-title");
    if (navTitle) navTitle.textContent = "読み込みエラー";
  });

// ── 各種イベントリスナーの設定 ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 同期スイッチ：状態を記憶し、ONに戻した瞬間に現在のタブへ追従する
  const syncToggle = document.getElementById('auto-sync-toggle');
  if (syncToggle) {
    try { syncToggle.checked = localStorage.getItem('autoSync') !== 'off'; } catch (e) {}
    syncToggle.addEventListener('change', () => {
      try { localStorage.setItem('autoSync', syncToggle.checked ? 'on' : 'off'); } catch (e) {}
      if (syncToggle.checked) {
        lastTabKey = null; // 同じ参照でも再描画させる
        syncWithActiveTab();
      }
    });
  }

  const prevBtn = document.getElementById('prev-verse-btn');
  const nextBtn = document.getElementById('next-verse-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => moveVerse(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => moveVerse(1));
});

document.addEventListener('keydown', (e) => {
  const modal = document.getElementById('verse-modal');
  if (modal && modal.open) return;

  if (e.key === 'ArrowLeft' || e.key === 'h') {
    moveVerse(-1);
  } else if (e.key === 'ArrowRight' || e.key === 'l') {
    moveVerse(1);
  }
});

const modal = document.getElementById('verse-modal');
const openBtn = document.getElementById('nav-title'); // タイトルをタップして節選択を開く
const closeBtn = document.getElementById('close-verse-modal');
const verseGrid = document.getElementById('verse-grid');

if (openBtn) {
  openBtn.addEventListener('click', () => {
    verseGrid.innerHTML = '';
    const verses = [...new Set(
      allJsonData
        .filter(w => String(w.book || "").toUpperCase() === String(currentBook).toUpperCase() && String(w.chapter) === String(currentChapter))
        .map(item => String(item.verse))
    )].sort((a, b) => Number(a) - Number(b));

    if (verses.length === 0) {
      for (let i = 1; i <= 15; i++) verses.push(String(i));
    }

    verses.forEach(v => {
      const btn = document.createElement('button');
      btn.className = 'verse-grid-item';
      btn.textContent = v;
      btn.addEventListener('click', () => {
        renderVerse(currentBook, currentChapter, v);
        modal.close();
      });
      verseGrid.appendChild(btn);
    });
    modal.showModal();
  });
}

if (openBtn) {
  openBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openBtn.click();
    }
  });
}

if (closeBtn) closeBtn.addEventListener('click', () => modal.close());

if (modal) {
  modal.addEventListener('click', (e) => {
    const rect = modal.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      modal.close();
    }
  });
}