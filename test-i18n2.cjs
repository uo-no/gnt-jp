// Phase 1a expansion checks: book names + StudyPanel headings.
// Usage: node serve_i18n.cjs (in another shell) + node test-i18n2.cjs
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/bible-app/harness/node_modules/jsdom');
const BASE = 'http://127.0.0.1:8943';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function check(name, cond, extra) { results.push([name, !!cond]); console.log((cond ? 'PASS' : 'FAIL') + ':', name, cond ? '' : (extra || '')); }

async function boot(path, opts = {}) {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, {
    url: BASE + path, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      const realFetch = (u, o) => fetch(new window.URL(u, window.document.baseURI).href, o);
      window.fetch = async (u, o) => {
        const url = new window.URL(u, window.document.baseURI).href;
        if (opts.dropKeys && url.includes('assets/i18n/en.json')) {
          const r = await realFetch(u, o);
          const dict = await r.json();
          for (const k of opts.dropKeys) delete dict[k];
          return { ok: true, json: async () => dict };
        }
        return realFetch(u, o);
      };
      if (opts.lang) { try { window.localStorage.setItem('app_lang', opts.lang); } catch (e) {} }
      window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.HTMLCanvasElement.prototype.getContext = () => ({ measureText: t => ({ width: [...t].length * 7.4 }), save() {}, restore() {}, scale() {}, translate() {}, fillText() {}, clearRect() {} });
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
    }
  });
  const { window } = dom; const { document } = window;
  await new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r); });
  await sleep(3500);
  if (window.I18N) { try { await window.I18N.ready; } catch (e) {} }
  await sleep(300);
  return { window, document };
}

async function openWordPanel({ window, document }) {
  window.eval("_sbSelectMode('WORD_ORDER')");
  await sleep(2500);
  const chip = document.querySelector('.wlv-chip');
  if (!chip) return false;
  chip.click();
  await sleep(1500);
  const more = [...document.querySelectorAll('button')].find(b => /詳しく見る|See details/.test(b.textContent || ''));
  if (!more) return false;
  more.click();
  await sleep(3000);
  return true;
}
function panelText(document) {
  const p = document.querySelector('#bottom-depth-panel');
  return p ? p.textContent : '';
}

(async () => {
  /* ── JA regression ── */
  {
    const ctx = await boot('/ROM/1');
    const { window, document } = ctx;
    check('JA resolver full', window.eval("_bookFullName('ROM')") === 'ローマ人への手紙');
    check('JA resolver short', window.eval("_bookShortName('ROM')") === 'ローマ');
    check('JA refTitle', window.eval("_refTitle('ROM',1,3)") === 'ローマ1章3節');
    check('JA chapter label', window.eval("_bookChapterLabel({book:{key:'ROM',name:'ローマ人への手紙'},chapter:1})") === 'ローマ1章');
    window.eval('sbGoTo(1)'); await sleep(300);
    const rows = [...document.querySelectorAll('#sb-book-list .sb-row span')].map(e => e.textContent);
    check('JA sidebar book list', rows.includes('ローマ人への手紙'), JSON.stringify(rows.slice(0, 6)));
    check('JA testament label', document.querySelector('[data-i18n="ui.newTestament"]').textContent === '新約聖書');
    const opened = await openWordPanel(ctx);
    check('JA word panel opens', opened);
    const ptxt = panelText(document);
    check('JA panel headings', ptxt.includes('形と関係を見る') && ptxt.includes('辞書的意味を見る') && ptxt.includes('記号の見方'), ptxt.slice(0, 200));
    window.close();
  }
  /* ── EN application ── */
  {
    const ctx = await boot('/ROM/1', { lang: 'en' });
    const { window, document } = ctx;
    check('EN resolver full', window.eval("_bookFullName('ROM')") === 'Romans');
    check('EN resolver short', window.eval("_bookShortName('1CO')") === '1 Corinthians');
    check('EN refTitle', window.eval("_refTitle('ROM',1,3)") === 'Romans 1:3');
    check('EN chapter label', window.eval("_bookChapterLabel({book:{key:'ROM',name:'ローマ人への手紙'},chapter:1})") === 'Romans 1');
    window.eval('sbGoTo(1)'); await sleep(300);
    const rows = [...document.querySelectorAll('#sb-book-list .sb-row span')].map(e => e.textContent);
    check('EN sidebar book list', rows.includes('Romans') && rows.includes('Matthew'), JSON.stringify(rows.slice(0, 6)));
    window.eval('sbGoTo(2)'); await sleep(200);
    check('EN sb-l2 title', document.getElementById('sb-l2-title').textContent === 'Romans', document.getElementById('sb-l2-title').textContent);
    check('EN testament label', document.querySelector('[data-i18n="ui.newTestament"]').textContent === 'New Testament');
    const opened = await openWordPanel(ctx);
    check('EN word panel opens', opened);
    const ptxt = panelText(document);
    check('EN panel heading: form', ptxt.includes('Form and relations'));
    check('EN panel heading: lexical', ptxt.includes('Dictionary meaning'));
    check('EN panel heading: symbols', ptxt.includes('How to read the symbols'));
    check('EN panel group labels', ptxt.includes('What the original text shows') && ptxt.includes('Meaning & lexical resources'));
    window.close();
  }
  /* ── Fallback: dropped keys stay Japanese ── */
  {
    const ctx = await boot('/ROM/1', { lang: 'en', dropKeys: ['book.ROM', 'bookshort.ROM', 'panel.formAndRelations'] });
    const { window, document } = ctx;
    check('FB book.ROM dropped -> JA full', window.eval("_bookFullName('ROM')") === 'ローマ人への手紙');
    check('FB other book stays EN', window.eval("_bookFullName('MAT')") === 'Matthew');
    check('FB refTitle mixes correctly', window.eval("_refTitle('ROM',1,3)") === 'ローマ 1:3', window.eval("_refTitle('ROM',1,3)"));
    window.close();
  }
  const failed = results.filter(r => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
})();
