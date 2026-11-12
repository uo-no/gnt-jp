/* 言語ドロップダウンの開閉だけを扱う（切替処理そのものは I18N.setLang が持つ）。
   ボタン［data-lang-dd .lang-dd-btn］で開閉、選択・パネル外クリック・Esc で閉じる。 */
(function () {
    'use strict';
    function closeAll(except, restoreFocus) {
        var dds = document.querySelectorAll('[data-lang-dd]');
        for (var i = 0; i < dds.length; i++) {
            if (dds[i] === except) continue;
            var btn = dds[i].querySelector('.lang-dd-btn');
            var panel = dds[i].querySelector('.lang-dd-panel');
            if (!panel || panel.hidden) continue;
            panel.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
            if (restoreFocus) btn.focus();
        }
    }
    document.addEventListener('click', function (e) {
        var dd = e.target.closest ? e.target.closest('[data-lang-dd]') : null;
        if (!dd) { closeAll(null, false); return; }
        var btn = dd.querySelector('.lang-dd-btn');
        var panel = dd.querySelector('.lang-dd-panel');
        if (e.target.closest('.lang-dd-btn')) {
            var open = panel.hidden;
            closeAll(dd, false);
            panel.hidden = !open;
            btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        } else if (e.target.closest('.lang-dd-opt')) {
            panel.hidden = true;
            btn.setAttribute('aria-expanded', 'false');
        }
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll(null, true);
    });
})();
