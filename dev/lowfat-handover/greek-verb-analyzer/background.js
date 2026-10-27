// ── パネルの表示/非表示 ───────────────────────────────────────────────
// 既に content.js が入っているタブにはメッセージを送るだけ。
// 入っていないタブ（対応サイト以外）には、その場で注入してから表示する。
async function sendToTab(tab, type) {
  if (!tab || tab.id == null) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type });
  } catch (e) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tab.id, { type: "show" });
    } catch (err) {
      // chrome:// や Chrome ウェブストアなど、拡張機能が注入できないページ
      console.warn("このページには表示できません:", err.message);
      chrome.action.setBadgeText({ tabId: tab.id, text: "×" });
      chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#888888" });
    }
  }
}

chrome.action.onClicked.addListener((tab) => sendToTab(tab, "toggle"));

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === "toggle-panel") sendToTab(tab, "toggle");
});

// ── 聖書データの配信 ──────────────────────────────────────────────────
// content.js から「この書のデータをください」と頼まれたら data/<書>.json を返す。
// （ページ側から直接 fetch させないので、サイトのCSPや web_accessible_resources の影響を受けない）
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "getBook") return;
  if (!/^[0-9A-Z]{3}$/.test(String(msg.book))) {
    sendResponse({ ok: false, error: "invalid book" });
    return;
  }
  fetch(chrome.runtime.getURL(`data/${msg.book}.json`))
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => sendResponse({ ok: true, data }))
    .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
  return true; // 非同期で応答する
});

// ── 用例（コンコーダンス）検索 ────────────────────────────────────────
// 全27巻を読み込んで「レンマ → 出現箇所」の索引を作る。作成は最初の1回だけ（サービスワーカーが
// 停止された場合は、次の検索時に自動で作り直す）。
const BOOK_ORDER = [
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH",
  "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
];
let indexPromise = null;

function getIndex() {
  if (!indexPromise) {
    indexPromise = (async () => {
      const books = {};
      await Promise.all(BOOK_ORDER.map(async (code) => {
        const r = await fetch(chrome.runtime.getURL(`data/${code}.json`));
        if (!r.ok) throw new Error(`data/${code}.json: HTTP ${r.status}`);
        books[code] = await r.json();
      }));
      const num = (a, b) => a - b;
      const lemmas = new Map(); // レンマ → [[書, 章, 節, 語の位置], ...]（聖書の順）
      for (const code of BOOK_ORDER) {
        const b = books[code];
        for (const ch of Object.keys(b).map(Number).sort(num)) {
          for (const v of Object.keys(b[ch]).map(Number).sort(num)) {
            b[ch][v].forEach((tok, ti) => {
              const lemma = tok[4];
              if (!lemma) return;
              let list = lemmas.get(lemma);
              if (!list) lemmas.set(lemma, (list = []));
              list.push([code, ch, v, ti]);
            });
          }
        }
      }
      return { books, lemmas };
    })();
    indexPromise.catch(() => { indexPromise = null; });
  }
  return indexPromise;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== "concordance") return;
  (async () => {
    const lemma = String(msg.lemma || "");
    const offset = Math.max(0, parseInt(msg.offset, 10) || 0);
    const limit = Math.min(50, Math.max(1, parseInt(msg.limit, 10) || 20));
    const form = String(msg.form || "").slice(0, 3); // 時制・態・法の3文字コード（空なら全形）
    if (!lemma || lemma.length > 64) throw new Error("invalid lemma");

    const { books, lemmas } = await getIndex();
    let list = lemmas.get(lemma) || [];
    if (form) list = list.filter(([c, ch, v, ti]) => (books[c][ch][v][ti][3] || "").startsWith(form));

    const items = list.slice(offset, offset + limit).map(([book, ch, v, ti]) => ({
      book, ch, v, ti, tokens: books[book][ch][v]
    }));
    return { ok: true, total: list.length, items };
  })().then(sendResponse, (e) => sendResponse({ ok: false, error: String((e && e.message) || e) }));
  return true; // 非同期で応答する
});
