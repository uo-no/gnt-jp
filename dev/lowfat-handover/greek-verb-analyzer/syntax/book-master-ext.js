/* book-master.js の拡張機能版。books.json と章データを、拡張機能の中のファイルから読み込む。
   使われるAPIは syntax.js が呼ぶものだけ（load / pathFor / fetchJSON / attachWarningPanel ほか）。 */
(function () {
  'use strict';
  if (window.BookMaster) return;
  const url = (p) => (/^(https?:|chrome-extension:)/.test(p) ? p : chrome.runtime.getURL(p));
  window.__failedFetches = window.__failedFetches || [];
  let _master = null;

  async function fetchJSON(path) {
    try {
      const res = await fetch(url(path));
      if (!res.ok) { window.__failedFetches.push({ path, status: res.status }); return null; }
      return await res.json();
    } catch (err) {
      window.__failedFetches.push({ path, error: String(err) });
      return null;
    }
  }

  function load() {
    if (!_master) {
      _master = fetchJSON('books.json').then((data) => {
        if (!data) { _master = null; throw new Error('books.json を読み込めませんでした'); }
        const all = [...data.NT, ...data.OT];
        return {
          raw: data, NT: data.NT, OT: data.OT, ALL: all, groups: data.groups, corpora: data.corpora,
          byKey: new Map(all.map((b) => [b.key, b])),
          ntKeys: new Set(data.NT.map((b) => b.key)),
          codeToKey: new Map(all.map((b) => [b.code, b.key]))
        };
      });
    }
    return _master;
  }

  window.BookMaster = {
    load,
    fetchJSON,
    // 新約のみ同梱。章単位の詳細データ（build-data.js が作る data/syn/<書>/<章>.json）
    pathFor: async (key, ch) => `data/syn/${key}/${ch}.json`,
    folderFor: async () => 'nt',
    buildChapterTasks: async () => [],
    verifyCoverage: async () => {},
    getFailedFetches: () => window.__failedFetches.slice(),
    onFailure: () => {},
    attachWarningPanel: () => {},
    requireLoaded: () => {}
  };
})();
