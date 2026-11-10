/* ══════════════════════════════════════════════════════════════
   i18n core — Phase 1a (English Showcase)

   UI strings are managed per LANGUAGE (not per translation).
   - Japanese is the default and stays in the code as the fallback
     value at every call site:  T('mode.WORD_ORDER', '語順で読む')
   - Other languages live in dictionary files: assets/i18n/<lang>.json
     A missing key falls back to the Japanese string at the call site,
     so a partial dictionary can never blank out the UI.
   - Static HTML nodes opt in with data-i18n="key"; their original
     Japanese text content is the fallback.
   - Long pages (How to Use / Sources & Policies) swap as whole
     templates under the keys page.howto / page.appinfo.
   Language choice persists in localStorage 'app_lang' and switching
   reloads the page, so every surface re-renders in the new language.
   On a first visit (nothing stored) the language is detected from
   the browser and then persisted the same way — see the detection
   block below. A /ja/ or /en/ path prefix overrides both.
   ══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    var STORAGE_KEY = 'app_lang';
    var SUPPORTED = ['ja', 'en', 'es'];

    /* Path-prefix language links (user decision, 2026-11-05):
       /ja/... and /en/... choose the UI language and remember it,
       so a link can be sent in a specific language, e.g.
       bible-text.pages.dev/en/ROM/1/WO. The prefix is stripped via
       replaceState before the app router reads the path, so the
       router only ever sees its usual /BOOK/CH/... paths. A prefix
       link wins over the stored preference. */
    var pathLang = null;
    try {
        var pm = window.location.pathname.match(/^\/(ja|en|es)(?=\/|$)/);
        if (pm) {
            pathLang = pm[1];
            var rest = window.location.pathname.slice(pm[0].length) || '/';
            window.history.replaceState(null, '', rest + window.location.search + window.location.hash);
        }
    } catch (_) { /* keep the path as-is; routing falls back to defaults */ }

    var lang = 'ja';
    var hasSaved = false;
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (SUPPORTED.indexOf(saved) >= 0) { lang = saved; hasSaved = true; }
    } catch (_) { /* localStorage unavailable: detection still applies for the session */ }
    if (!hasSaved && !pathLang) {
        /* First visit (user decision, 2026-11-05): detect the UI language
           from the browser instead of always landing on Japanese. Walk
           navigator.languages in the visitor's own priority order and
           take the first language we support; if none matches, fall back
           to English (the Showcase audience is non-Japanese). The result
           is persisted, so detection happens exactly once — afterwards
           the stored preference rules, and the header/FAB toggle remains
           the way to change it. Priority overall:
           path prefix > stored preference > detection > Japanese.
           When a new language ships (e.g. 'es' joins SUPPORTED), browser
           matching picks it up with no change here. */
        var detected = 'en';
        try {
            var navLangs = (navigator.languages && navigator.languages.length)
                ? navigator.languages : [navigator.language || ''];
            for (var ni = 0; ni < navLangs.length; ni++) {
                var primary = String(navLangs[ni] || '').toLowerCase().split('-')[0];
                if (SUPPORTED.indexOf(primary) >= 0) { detected = primary; break; }
            }
        } catch (_) { /* no navigator info: keep English as the first-visit default */ }
        lang = detected;
        try { localStorage.setItem(STORAGE_KEY, detected); } catch (_) {}
    }
    if (pathLang) {
        lang = pathLang;
        try { localStorage.setItem(STORAGE_KEY, pathLang); } catch (_) {}
    }

    var state = { lang: lang, dict: null };

    function t(key, fallback) {
        if (state.lang !== 'ja' && state.dict && typeof state.dict[key] === 'string') {
            return state.dict[key];
        }
        return fallback != null ? fallback : null;
    }

    function applyStatic(root) {
        if (!root || !root.querySelectorAll) return;
        var nodes = root.querySelectorAll('[data-i18n]');
        for (var i = 0; i < nodes.length; i++) {
            var el = nodes[i];
            if (el.dataset.ja == null) el.dataset.ja = el.textContent;
            el.textContent = t(el.getAttribute('data-i18n'), el.dataset.ja);
        }
        var titled = root.querySelectorAll('[data-i18n-title]');
        for (var k = 0; k < titled.length; k++) {
            var tel = titled[k];
            if (tel.dataset.jaTitle == null) tel.dataset.jaTitle = tel.getAttribute('title') || '';
            tel.setAttribute('title', t(tel.getAttribute('data-i18n-title'), tel.dataset.jaTitle));
        }
        var labelled = root.querySelectorAll('[data-i18n-aria-label]');
        for (var m = 0; m < labelled.length; m++) {
            var lel = labelled[m];
            if (lel.dataset.jaAriaLabel == null) lel.dataset.jaAriaLabel = lel.getAttribute('aria-label') || '';
            lel.setAttribute('aria-label', t(lel.getAttribute('data-i18n-aria-label'), lel.dataset.jaAriaLabel));
        }
        var btns = root.querySelectorAll('[data-lang-btn]');
        for (var j = 0; j < btns.length; j++) {
            var active = btns[j].getAttribute('data-lang-btn') === state.lang;
            btns[j].classList.toggle('active', active);
            btns[j].setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }

    var _origMeta = null;
    function _captureOrigMeta() {
        if (_origMeta) return;
        var og = document.querySelector('meta[property="og:title"]');
        var tw = document.querySelector('meta[name="twitter:title"]');
        _origMeta = {
            docTitle: document.title,
            ogTitle: og ? og.getAttribute('content') : null,
            twTitle: tw ? tw.getAttribute('content') : null
        };
    }

    function applyMeta() {
        document.documentElement.lang = state.lang === 'ja' ? 'ja' : state.lang;
        _captureOrigMeta();
        var desc = t('meta.description');
        if (desc) {
            var md = document.querySelector('meta[name="description"]');
            if (md) md.setAttribute('content', desc);
            var ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', desc);
            var twDesc = document.querySelector('meta[name="twitter:description"]');
            if (twDesc) twDesc.setAttribute('content', desc);
        }
        if (state.lang !== 'ja') {
            var titleStr = t('meta.title');
            if (titleStr) {
                document.title = titleStr;
                var ogT = document.querySelector('meta[property="og:title"]');
                if (ogT) ogT.setAttribute('content', titleStr);
                var twT = document.querySelector('meta[name="twitter:title"]');
                if (twT) twT.setAttribute('content', titleStr);
            }
        } else if (_origMeta) {
            if (_origMeta.docTitle) document.title = _origMeta.docTitle;
            var ogT2 = document.querySelector('meta[property="og:title"]');
            if (ogT2 && _origMeta.ogTitle != null) ogT2.setAttribute('content', _origMeta.ogTitle);
            var twT2 = document.querySelector('meta[name="twitter:title"]');
            if (twT2 && _origMeta.twTitle != null) twT2.setAttribute('content', _origMeta.twTitle);
        }
    }

    function rerenderDynamic() {
        /* Mode lists may already be rendered; redraw them in the new
           language. Each renderer no-ops when its DOM is absent. */
        ['_sbRenderModesL0', '_mmpRenderModes', '_syncMobileLocationLabel', 'syncUIFromState'].forEach(function (name) {
            if (typeof window[name] === 'function') {
                try { window[name](); } catch (_) { /* keep JA render */ }
            }
        });
    }

    function applyAll() {
        applyStatic(document);
        applyMeta();
        rerenderDynamic();
    }

    function setLang(next) {
        if (SUPPORTED.indexOf(next) < 0) return;
        try { localStorage.setItem(STORAGE_KEY, next); } catch (_) {}
        location.reload();
    }

    var ready = Promise.resolve();
    if (lang !== 'ja') {
        ready = fetch(new URL('../assets/i18n/' + lang + '.json', document.baseURI))
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (dict) {
                if (dict && Object.keys(dict).length > 0) {
                    state.dict = dict;
                } else {
                    /* Dictionary unavailable or empty: every string
                       falls back to Japanese, so the effective language
                       IS Japanese. Keep html lang, the language buttons
                       and I18N.lang honest instead of claiming 'en'.
                       The stored preference is left untouched, so a
                       later load with a working dictionary still opens
                       in the chosen language. */
                    state.lang = 'ja';
                }
                applyAll();
            })
            .catch(function () { state.lang = 'ja'; applyAll(); });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.documentElement.lang = state.lang === 'ja' ? 'ja' : state.lang;
        if (state.dict) applyAll();
        else applyStatic(document);
    });

    window.I18N = {
        t: t,
        setLang: setLang,
        applyStatic: applyStatic,
        ready: ready,
        get lang() { return state.lang; },
    };
    /* Short global alias used across index.html renderers. */
    window.T = t;
})();
