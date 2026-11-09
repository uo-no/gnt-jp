// Phase 1a i18n local checks, modeled on test-phase1.cjs.
// Usage: node serve_i18n.cjs (in another shell) + node test-i18n.cjs
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

(async () => {
  /* ── JA (default): everything stays Japanese ── */
  {
    const { window, document } = await boot('/ROM/1');
    check('JA boot: body rendered', document.body.textContent.includes('パウロ'));
    const l0 = [...document.querySelectorAll('#sb-mode-list-l0 .menu-text')].map(e => e.textContent);
    check('JA L0 mode labels', l0.includes('口語訳で読む') && l0.includes('語順で読む'), JSON.stringify(l0));
    const descs = [...document.querySelectorAll('#sb-mode-list-l0 .sb-mode-desc')].map(e => e.textContent);
    check('JA L0 mode descriptions', descs.some(d => d.includes('いつもの日本語訳で')), JSON.stringify(descs));
    const info = [...document.querySelectorAll('#info-overlay-card [data-i18n]')].map(e => e.textContent);
    check('JA info card labels', info.includes('使い方') && info.includes('出典・ポリシー'), JSON.stringify(info));
    check('JA lang buttons present, ja active', !!document.querySelector('[data-lang-btn="en"]') && document.querySelector('[data-lang-btn="ja"]').classList.contains('active'));
    check('JA html lang', document.documentElement.lang === 'ja', document.documentElement.lang);
    window.showHowToUse();
    check('JA howto page', document.getElementById('bible-text-area').textContent.includes('ギリシャ語が読めなくても'));
    check('JA title', document.title.includes('聖書アプリ'), document.title);
    window.close();
  }
  /* ── EN: dictionary applied to converted surfaces ── */
  {
    const { window, document } = await boot('/ROM/1', { lang: 'en' });
    check('EN: I18N lang is en', window.I18N && window.I18N.lang === 'en');
    check('EN html lang', document.documentElement.lang === 'en', document.documentElement.lang);
    const l0 = [...document.querySelectorAll('#sb-mode-list-l0 .menu-text')].map(e => e.textContent);
    check('EN L0 mode labels', l0.includes('World English Bible') && l0.includes('Word Order') && l0.includes('Sentence Structure'), JSON.stringify(l0));
    const descs = [...document.querySelectorAll('#sb-mode-list-l0 .sb-mode-desc')].map(e => e.textContent);
    check('EN L0 mode descriptions', descs.some(d => d.includes('World English Bible')), JSON.stringify(descs));
    const info = [...document.querySelectorAll('#info-overlay-card [data-i18n]')].map(e => e.textContent);
    check('EN info card labels', info.includes('How to Use') && info.includes('Sources & Policies'), JSON.stringify(info));
    check('EN lang button active', document.querySelector('[data-lang-btn="en"]').classList.contains('active'));
    window.showHowToUse();
    const howto = document.getElementById('bible-text-area');
    check('EN howto page', howto.textContent.includes('no Greek required') && howto.textContent.includes('Back to the text'));
    check('EN title uses Bible Green', document.title.includes('Bible Green'), document.title);
    window.showAppInfo();
    const info2 = document.getElementById('bible-text-area');
    check('EN appinfo page', info2.textContent.includes('Design Philosophy') && info2.textContent.includes('On the Use of AI'));
    window._mmpRenderModes();
    const mmp = [...document.querySelectorAll('#mobile-mode-picker-content .mmp-row')].map(e => e.textContent);
    check('EN mobile picker labels', mmp.some(t => t.includes('Text (Kougo)')) && mmp.some(t => t.includes('Word Order')), JSON.stringify(mmp));
    window.close();
  }
  /* ── EN fallback: a missing key keeps the Japanese string ── */
  {
    const { window, document } = await boot('/ROM/1', { lang: 'en', dropKeys: ['menu.roadmap'] });
    const info = [...document.querySelectorAll('#info-overlay-card [data-i18n]')].map(e => e.textContent);
    check('Fallback: dropped key stays JA, others EN', info.includes('ロードマップ') && info.includes('How to Use'), JSON.stringify(info));
    window.close();
  }
  const failed = results.filter(r => !r[1]);
  console.log(failed.length === 0 ? '\nALL PASS' : `\n${failed.length} FAILED`);
  process.exit(failed.length ? 1 : 0);
})();
