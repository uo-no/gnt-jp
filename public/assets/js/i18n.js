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
   ══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';
    var STORAGE_KEY = 'app_lang';
    var SUPPORTED = ['ja', 'en'];

    var lang = 'ja';
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (SUPPORTED.indexOf(saved) >= 0) lang = saved;
    } catch (_) { /* localStorage unavailable: stay with Japanese */ }

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
        var btns = root.querySelectorAll('[data-lang-btn]');
        for (var j = 0; j < btns.length; j++) {
            var active = btns[j].getAttribute('data-lang-btn') === state.lang;
            btns[j].classList.toggle('active', active);
            btns[j].setAttribute('aria-pressed', active ? 'true' : 'false');
        }
    }

    function applyMeta() {
        document.documentElement.lang = state.lang === 'ja' ? 'ja' : state.lang;
        var desc = t('meta.description');
        if (desc) {
            var md = document.querySelector('meta[name="description"]');
            if (md) md.setAttribute('content', desc);
        }
    }

    function rerenderDynamic() {
        /* Mode lists may already be rendered; redraw them in the new
           language. Each renderer no-ops when its DOM is absent. */
        ['_sbRenderModes', '_sbRenderModesL0', '_mmpRenderModes'].forEach(function (name) {
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
                if (dict) state.dict = dict;
                applyAll();
            })
            .catch(function () { /* dictionary failed: Japanese UI stays */ });
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
