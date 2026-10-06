/**
 * rk-reading-renderer-v.js  Phase L.2
 *
 * Vertical RK Reading Mode — SVG renderer.
 *
 * Layout model:
 *   Y-axis   = main structural hierarchy (S above V, O/Pred below V)
 *   X-axis   = same-level spatial placement
 *   coord    = cverbs spread right at coord-bar Y, connected by horizontal bar
 *   modifier = diagonal branch to lower-right of spine item (local space)
 *   sub      = dashed L-connector, placed below all coordinate content
 *
 * Input: same word array format as RKReadingRenderer (after loadWords()).
 * Exports: window.RKReadingRendererV = { renderSVGVertical }
 */

(function (global) {
  'use strict';

  // ── Constants ────────────────────────────────────────────────────────────
  const JP_FONT    = "'Noto Sans JP', 'Hiragino Sans', sans-serif";
  const FONT_M     = 20;   // main spine word
  const FONT_S     = 15;   // modifier / sub word
  const SPINE_H    = 36;   // vertical step between spine items
  const ITEM_GAP   = 22;   // connector line height between spine items
  const COORD_GAP_Y = 90;  // Y gap: verb → coord bar  (must be > SPINE_H + ITEM_GAP)
  const COORD_GAP_X = 60;  // min X gap between adjacent cverb spines
  const SUB_GAP_Y  = 80;   // Y gap before subordinate
  const LEFT_X     = 80;   // root spine left edge
  const START_Y    = 110;  // root verb Y (leaves room for subj + modifiers above)

  // ── Module state ─────────────────────────────────────────────────────────
  let _W = [];
  let _S = '';

  // ── SVG helpers ──────────────────────────────────────────────────────────
  let _cv = null;
  function _canvas() {
    if (!_cv && typeof document !== 'undefined') {
      try { _cv = document.createElement('canvas').getContext('2d'); } catch (_) {}
    }
    return _cv;
  }
  function tw(s, z) {
    const cv = _canvas();
    if (!cv) return String(s).length * (z || 18) * 0.85;
    cv.font = `${z || 18}px ${JP_FONT}`;
    return cv.measureText(String(s)).width;
  }
  const _esc = s => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const E  = s => { _S += s; };
  const ln = (x1, y1, x2, y2, col, dash) =>
    E(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="1.6"${dash ? ' stroke-dasharray="4 3"' : ''}/>`);

  function wd(w, x, y, z, anc) {
    if (!z)   z   = 18;
    if (!anc) anc = 'start';
    const disp = w.gl || w.g;
    const t    = tw(disp, z);
    const l    = anc === 'end' ? x - t : anc === 'middle' ? x - t / 2 : x;
    const fill = w.i ? `var(--${w.grp})` : 'var(--sub)';
    const da   = w.i
      ? ` data-i="${w.i}" data-grk="${_esc(w.g)}" style="--c:var(--${w.grp})"`
      : '';
    E(`<g class="wn"${da}>`);
    E(`<rect x="${l - 3}" y="${y - z}" width="${t + 6}" height="${z + 7}" rx="4"/>`);
    E(`<text x="${x}" y="${y}" font-size="${z}" font-family="${JP_FONT}" text-anchor="${anc}" fill="${fill}">${_esc(disp)}</text>`);
    E(`</g>`);
  }

  // ── Word graph helpers ────────────────────────────────────────────────────
  const kids   = i  => _W.filter(w => i && w.h === i);
  const _isVerbW = id => {
    const w = _W[id - 1];
    return (w.ps || '').toLowerCase().startsWith('verb') || w.g === '( )';
  };
  const CLZ = w =>
    ['verb', 'clause', 'cverb', 'relcl', 'advcl'].includes(w.r) ||
    (['coord', 'subj', 'obj', 'pred', 'appos', 'pobj', 'iobj', 'obj2'].includes(w.r) && _isVerbW(w.i));

  function own(w) {
    let c = w.h, n = 0;
    while (c && n++ < 99) {
      const p = _W[c - 1];
      if (CLZ(p)) return p.i;
      c = p.h;
    }
    return 0;
  }

  // Non-CLZ direct children (local modifiers of word w)
  function localMods(w) {
    if (!w.i) return [];
    return kids(w.i).filter(k => !CLZ(k));
  }

  // ── Draw a spine word with its baseline and local modifiers ──────────────
  // Returns { right, bottom } — rightmost X and bottommost Y used by this item
  function drawSpineWord(w, x0, y) {
    const disp = w.gl || w.g;
    const ww   = tw(disp, FONT_M) + 16;

    // Horizontal baseline
    ln(x0, y, x0 + ww, y, `var(--${w.grp})`);
    // Word text (above baseline)
    wd(w, x0 + 4, y - 7, FONT_M);

    // ── Local modifiers: diagonal branch to lower-right ────────────────
    // Exclude spine roles handled explicitly by vplace (subj/obj/pred/etc.)
    const SPINE = ['conj', 'cmark', 'subj', 'obj', 'pred', 'obj2', 'iobj', 'appos', 'det'];
    const mods = localMods(w).filter(m => !SPINE.includes(m.r));
    let right  = x0 + ww;
    let bottom = y;
    let modY   = y;   // running Y — tracks floor of previous modifier

    mods.forEach(m => {
      const mDisp = m.gl || m.g;
      const mw    = tw(mDisp, FONT_S) + 12;
      const mx    = x0 + ww + 24;   // X start of modifier baseline
      const my    = modY + 18;       // 18px below previous floor

      // Diagonal connector from word baseline edge
      ln(x0 + ww - 4, y + 2, mx, my, `var(--${m.grp})`);
      // Modifier baseline
      ln(mx, my, mx + mw, my, `var(--${m.grp})`);
      // Modifier word
      wd(m, mx + 3, my - 6, FONT_S);

      right  = Math.max(right,  mx + mw);
      bottom = Math.max(bottom, my + 8);
      modY   = my;   // floor advances to this modifier's baseline

      if (m.r === 'prep') {
        // Preposition: draw pobj and its det below the prep baseline
        const pobj = kids(m.i).find(k => k.r === 'pobj');
        if (pobj) {
          const pw  = tw(pobj.gl || pobj.g, FONT_S) + 12;
          const py  = my + 28;
          // Vertical line from prep to pobj
          ln(mx + mw / 2, my + 2, mx + mw / 2, py, `var(--${pobj.grp})`);
          ln(mx, py, mx + pw, py, `var(--${pobj.grp})`);
          wd(pobj, mx + 3, py - 6, FONT_S);
          right  = Math.max(right,  mx + pw);
          bottom = Math.max(bottom, py + 8);
          modY   = py;   // floor advances past pobj

          // Det of pobj
          const det = kids(pobj.i).find(k => k.r === 'det');
          if (det) {
            wd(det, mx + pw + 4, py - 5, FONT_S - 2);
            right = Math.max(right, mx + pw + 4 + tw(det.gl || det.g, FONT_S - 2) + 8);
          }
        }
      } else {
        // Other mods: show det inline
        const det = kids(m.i).find(k => k.r === 'det');
        if (det) {
          wd(det, mx + mw + 4, my - 5, FONT_S - 2);
          right = Math.max(right, mx + mw + 4 + tw(det.gl || det.g, FONT_S - 2) + 8);
        }
      }
    });

    return { right, bottom };
  }

  // ── Draw a det tag inline next to word (for subj/obj dets) ───────────────
  function drawDet(detW, x, y) {
    if (!detW) return x;
    const dw = tw(detW.gl || detW.g, FONT_S - 1) + 10;
    wd(detW, x + 3, y - 5, FONT_S - 1);
    return x + dw + 4;
  }

  // ── Place a clause subtree starting with verb v at (x0, yVerb) ──────────
  // Returns { bot, right }
  function vplace(v, x0, yVerb) {
    const subj   = kids(v.i).find(k => k.r === 'subj');
    const pred   = kids(v.i).find(k => k.r === 'pred');
    const obj    = kids(v.i).find(k => k.r === 'obj');
    const cp     = pred || obj;
    const cverbs = _W.filter(k => k.r === 'cverb' && k.h === v.i);
    const subs   = _W.filter(k => ['clause', 'advcl'].includes(k.r) && own(k) === v.i);

    let right = x0;
    let bot   = yVerb;

    // ── Subject (above verb) ─────────────────────────────────────────────
    const ySubj = yVerb - SPINE_H - ITEM_GAP;
    if (subj) {
      const sr = drawSpineWord(subj, x0, ySubj);
      // Det of subj inline
      const det = kids(subj.i).find(k => k.r === 'det');
      if (det) drawDet(det, sr.right, ySubj);
      right = Math.max(right, sr.right + (det ? tw(det.gl||det.g, FONT_S-1)+14 : 0));
      // Vertical connector subj → verb
      ln(x0 + 8, ySubj + 4, x0 + 8, yVerb - 4, 'var(--ink)');
    }

    // ── Verb ─────────────────────────────────────────────────────────────
    const vr = drawSpineWord(v, x0, yVerb);
    right = Math.max(right, vr.right);
    bot   = Math.max(bot,   vr.bottom);

    // ── Obj / Pred (below verb) ──────────────────────────────────────────
    let yObj = null;
    if (cp) {
      yObj = Math.max(yVerb + SPINE_H + ITEM_GAP, vr.bottom + ITEM_GAP);
      ln(x0 + 8, yVerb + 4, x0 + 8, yObj - 4, 'var(--ink)');
      const or = drawSpineWord(cp, x0, yObj);
      const det = kids(cp.i).find(k => k.r === 'det');
      if (det) drawDet(det, or.right, yObj);
      right = Math.max(right, or.right + (det ? tw(det.gl||det.g, FONT_S-1)+14 : 0));
      bot   = Math.max(bot,   or.bottom, yObj + 8);
    }

    // ── Coordinate clauses (horizontal bar below main content) ───────────
    if (cverbs.length > 0) {
      const yCoord = Math.max(bot, yObj || yVerb) + COORD_GAP_Y;

      // Vertical connector: root verb → coord bar
      ln(x0 + 8, yVerb + 4, x0 + 8, yCoord, 'var(--ink)');

      // First tick on the coord bar at root position
      ln(x0 + 2, yCoord - 6, x0 + 14, yCoord + 6, 'var(--ink)');

      let cvX = Math.max(right, x0) + COORD_GAP_X;

      cverbs.forEach((cv, idx) => {
        const cvSubj = kids(cv.i).find(k => k.r === 'subj');
        const cvPred = kids(cv.i).find(k => k.r === 'pred');
        const cvObj  = kids(cv.i).find(k => k.r === 'obj');
        const cvCp   = cvPred || cvObj;
        const conj   = kids(cv.i).find(k => k.r === 'conj');

        // Horizontal bar from previous position to this cverb
        ln(x0 + 8, yCoord, cvX + 8, yCoord, 'var(--ink)');

        // Conj label (centered above bar segment)
        if (conj) {
          const midX = (x0 + 8 + cvX + 8) / 2;
          wd(conj, midX, yCoord - 14, FONT_S, 'middle');
        }

        // Cverb subject above coord bar
        const yCvSubj = yCoord - SPINE_H - ITEM_GAP;
        if (cvSubj) {
          const csr = drawSpineWord(cvSubj, cvX, yCvSubj);
          const det  = kids(cvSubj.i).find(k => k.r === 'det');
          if (det) drawDet(det, csr.right, yCvSubj);
          right = Math.max(right, csr.right + (det ? tw(det.gl||det.g, FONT_S-1)+14 : 0));
          ln(cvX + 8, yCvSubj + 4, cvX + 8, yCoord - 4, 'var(--ink)');
        }

        // Cverb verb at coord bar
        const cvr = drawSpineWord(cv, cvX, yCoord);
        right = Math.max(right, cvr.right);
        bot   = Math.max(bot,   cvr.bottom);

        // Cverb obj/pred below
        if (cvCp) {
          const yCvObj = Math.max(yCoord + SPINE_H + ITEM_GAP, cvr.bottom + ITEM_GAP);
          ln(cvX + 8, yCoord + 4, cvX + 8, yCvObj - 4, 'var(--ink)');
          const cor = drawSpineWord(cvCp, cvX, yCvObj);
          const det  = kids(cvCp.i).find(k => k.r === 'det');
          if (det) drawDet(det, cor.right, yCvObj);
          right = Math.max(right, cor.right + (det ? tw(det.gl||det.g, FONT_S-1)+14 : 0));
          bot   = Math.max(bot,   cor.bottom, yCvObj + 8);
        } else {
          bot = Math.max(bot, yCoord + 8);
        }

        cvX = right + COORD_GAP_X;
      });
    }

    // ── Subordinate clauses (below all coordinate content) ───────────────
    if (subs.length > 0) {
      let ySub = bot + SUB_GAP_Y;
      const ancX = x0 + 28;   // L-connector horizontal run

      for (const s of subs) {
        const cmark = kids(s.i).find(k => ['conj', 'cmark', 'det'].includes(k.r));

        // Dashed L-connector: right from verb → down → left → down to sub
        ln(x0 + 16, yVerb, ancX, yVerb, 'var(--link)', true);
        ln(ancX, yVerb, ancX, ySub - 36, 'var(--link)', true);
        ln(ancX, ySub - 36, x0 + 4, ySub - 36, 'var(--link)', true);
        ln(x0 + 4, ySub - 36, x0 + 4, ySub, 'var(--link)', true);

        if (cmark) wd(cmark, x0 + 50, ySub - 44, FONT_S);

        const sr = vplace(s, x0 + 16, ySub);
        bot   = Math.max(bot,   sr.bot);
        right = Math.max(right, sr.right);
        ySub  = sr.bot + SUB_GAP_Y;
      }
    }

    return { bot: Math.max(bot, yVerb + 8), right };
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function renderSVGVertical(words) {
    _W = words;
    _S = '';

    const root = _W.find(w => w.r === 'verb');
    if (!root) throw 'verb ロールの語が見つかりません';

    const R  = vplace(root, LEFT_X, START_Y);
    const vw = R.right + 80;
    const vh = R.bot   + 60;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.style.width  = '100%';
    svg.style.height = 'auto';
    svg.innerHTML = _S;
    return svg;
  }

  global.RKReadingRendererV = { renderSVGVertical };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
