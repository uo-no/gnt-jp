/* shared-ui.js — Study Panel shared UI builders */

/**
 * buildInfoCard({ title, icon, body })
 *   title {string} — section label (displayed in .info-card-title)
 *   icon  {string} — Material Symbols ligature name (e.g. "menu_book") or emoji fallback
 *   body  {string|HTMLElement} — inner HTML string or DOM node for .info-card-body
 *
 * Returns an HTMLElement (.info-card) that collapses/expands on header click.
 * Requires components.css to be loaded.
 */
function buildInfoCard({ title, icon, body }) {
    const card = document.createElement('div');
    card.className = 'info-card';

    const iconHtml = `<span class="info-card-icon material-symbols-outlined">${escHtml(icon)}</span>`;

    card.innerHTML = `
        <div class="info-card-head" onclick="this.parentElement.classList.toggle('open')">
            ${iconHtml}
            <span class="info-card-title">${escHtml(title)}</span>
            <span class="info-card-arrow">▾</span>
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
