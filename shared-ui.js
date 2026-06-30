/* shared-ui.js — ICONS SSOT + shared UI builders
   アイコンレジストリはこのファイルが唯一の定義箇所（SSOT）。
   各HTMLページは <script src="./shared-ui.js"> でこのファイルを読み込んでから
   自身のインラインスクリプトを実行する。SVGパスを直接書いてはならない。 */
const ICONS = {
    bookmark:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>',
    link:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    note:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>',
    menu:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h16M4 6h16M4 18h16"/></svg>',
    chevronDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    chevronRight:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
    chevronUp:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>',
    check:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    close:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    pin:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    search:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    radioFilled: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="7"/></svg>',
    trash:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    restore:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>',
};
function icon(name) {
    return ICONS[name] || '';
}
/* アイコン専用要素（子がアイコンのみ）を name で上書きする。
   name が falsy の場合は要素を空にする。
   子要素が他にあるケース（.note-dot 等）には使わないこと。 */
function renderIcon(el, name) {
    el.replaceChildren();
    if (name) el.insertAdjacentHTML('beforeend', icon(name));
}
/* data-icon="name" 要素へ、ページ読込時にSVGを挿入する。
   既存の子要素は壊さないよう先頭に追加する（renderIcon と異なり replaceChildren しない）。 */
function _renderStaticIcons() {
    document.querySelectorAll('[data-icon]').forEach(el => {
        const svg = icon(el.dataset.icon);
        if (svg) el.insertAdjacentHTML('afterbegin', svg);
    });
}

/**
 * buildInfoCard({ title, iconName, body })
 *   title    {string} — section label
 *   iconName {string} — Material Symbols ligature name (e.g. "menu_book") or emoji fallback
 *   body     {string|HTMLElement} — inner HTML string or DOM node for .info-card-body
 *
 * Returns an HTMLElement (.info-card) that collapses/expands on header click.
 * Requires components.css to be loaded.
 */
function buildInfoCard({ title, iconName, body }) {
    const card = document.createElement('div');
    card.className = 'info-card';

    const iconHtml = `<span class="info-card-icon material-symbols-outlined">${escHtml(iconName)}</span>`;

    card.innerHTML = `
        <div class="info-card-head" onclick="this.parentElement.classList.toggle('open')">
            ${iconHtml}
            <span class="info-card-title">${escHtml(title)}</span>
            <span class="info-card-arrow">${icon('chevronDown')}</span>
        </div>
        <div class="info-card-body"></div>`;

    const bodyEl = card.querySelector('.info-card-body');
    if (typeof body === 'string') {
        bodyEl.innerHTML = body;
    } else if (body instanceof Node) {
        bodyEl.appendChild(body);
    }

    return card;
}

function escHtml(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
