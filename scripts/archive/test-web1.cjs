// Phase 1b Step 1: WEB import + D1 wiring.
// EN UI defaults to WEB; JA UI defaults to JA1955; deep links honored;
// the Romans doxology sits at 16:25-27 (Greek-text versification).
const { JSDOM, VirtualConsole } = require('/home/hatch/workspace/bible-app/harness/node_modules/jsdom');
const BASE = 'http://127.0.0.1:8943';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = [];
function check(name, cond, extra) { results.push([name, !!cond]); console.log((cond ? 'PASS' : 'FAIL') + ':', name, cond ? '' : (extra || '')); }

async function boot(path, lang) {
  const res = await fetch(BASE + path);
  const html = await res.text();
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, {
    url: BASE + path, runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(window) {
      window.fetch = (u, o) => fetch(new window.URL(u, window.document.baseURI).href, o);
      window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.HTMLCanvasElement.prototype.getContext = () => ({ measureText: t => ({ width: [...t].length * 7.4 }), save() {}, restore() {}, scale() {}, translate() {}, fillText() {}, clearRect() {} });
      Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true });
      if (lang) { try { window.localStorage.setItem('app_lang', lang); } catch (e) {} }
    }
  });
  const { window } = dom;
  await new Promise(r => { if (window.document.readyState === 'complete') r(); else window.addEventListener('load', r); });
  await sleep(3200);
  return window;
}

(async () => {
  // JA regression
  let w = await boot('/ROM/1');
  check('JA default transA is JA1955', w.eval(`_transA`) === 'JA1955');
  check('JA ROM 1 shows Kougo text', w.document.body.textContent.includes('神の福音のために選び別たれ'));
  check('JA registry first is JA1955', w.eval(`TRANSLATION_REGISTRY[0].id`) === 'JA1955');
  check('JA registry includes WEB second', w.eval(`TRANSLATION_REGISTRY[1].id`) === 'WEB');
  w.close();

  // EN: D1
  w = await boot('/ROM/1', 'en');
  check('EN default transA is WEB', w.eval(`_transA`) === 'WEB', w.eval(`_transA`));
  check('EN ROM 1 shows WEB text', w.document.body.textContent.includes('Paul, a servant of Jesus Christ'));
  check('EN registry first is WEB', w.eval(`TRANSLATION_REGISTRY[0].id`) === 'WEB');
  w.close();

  // EN Romans 16: doxology relocated
  w = await boot('/ROM/16', 'en');
  const t16 = w.document.body.textContent;
  check('EN ROM 16 contains doxology', t16.includes('to the only wise God'));
  w.close();

  // EN Romans 14: no doxology at ch.14
  w = await boot('/ROM/14', 'en');
  check('EN ROM 14 has no doxology', !w.document.body.textContent.includes('Now to him who is able'));
  w.close();

  // JA deep link to WEB
  w = await boot('/ROM/1/WEB');
  check('JA deep link /ROM/1/WEB renders WEB', w.document.body.textContent.includes('Paul, a servant of Jesus Christ'));
  w.close();

  const failed = results.filter(r => !r[1]).length;
  console.log(`\n${results.length - failed}/${results.length} PASS`);
  process.exit(failed ? 1 : 0);
})();
