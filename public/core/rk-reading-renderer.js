/**
 * rk-reading-renderer.js  Phase 4.0-B
 *
 * Reed-Kellogg Reading Mode — SVG renderer.
 * Ported from Reference HTML "Reed-Kellogg 読書モード.html".
 *
 * Primary display: Japanese (w.gl).  Greek (w.g) available via inspect.
 *
 * Input word format (array):
 *   [greek, japanese_gloss, morphology, head_idx (1-based, 0=root), role, implied_subject?]
 *
 * Word object after loadWords():
 *   { i, g, gl, ps, h, r, imp, grp }
 *
 * Exports: window.RKReadingRenderer = { ROLE, loadWords, renderSVG }
 */

(function (global) {
  'use strict';

  // ── Role definitions ────────────────────────────────────────────────

  const ROLE = {
    subj:  ['主語',               'core', '動詞の動作・状態の主体。'],
    verb:  ['主動詞',             'core', '文の中心となる動詞。'],
    obj:   ['直接目的語',         'core', '動詞の動作を受ける語。'],
    obj2:  ['第二目的語',         'core', '二重対格などの2つ目の目的語。'],
    pred:  ['述語主格',           'core', '「AはBである」のB。'],
    appos: ['同格',               'core', '直前の語を言い換えて説明する名詞。'],
    clause:['従属節の動詞',       'core', '従属節の中心の動詞。'],
    cverb: ['並列節の動詞',       'core', '先行する節と並ぶ独立節の中心の動詞。'],
    iobj:  ['間接目的語',         'core', '動詞の行為が向かう先・受け手。'],
    relcl: ['関係節・分詞節(名詞修飾)', 'mod', '直前の名詞を修飾する節の動詞。'],
    advcl: ['副詞節・分詞節(動詞修飾)', 'adv', '動詞を副詞的に修飾する節の動詞。'],
    det:   ['冠詞',               'mod', '名詞を特定する。'],
    poss:  ['所有の属格',         'mod', '「〜の」と持ち主を示す。'],
    gen:   ['属格修飾',           'mod', '「〜の」と名詞を限定する。'],
    adj:   ['形容詞的修飾',       'mod', '名詞を性質で修飾する。'],
    voc:   ['呼びかけ',           'mod', '文の外側に置かれる呼びかけの語。'],
    auxv:  ['動詞の一部',         'mod', '主動詞と組みになる別の動詞形。'],
    advn:  ['副詞的名詞句',       'adv', '前置詞なしで動詞を修飾する格の名詞句。'],
    demo:  ['指示代名詞',         'mod', '名詞句の中で指示する代名詞。'],
    prep:  ['前置詞句(副詞的)',   'adv', '動詞を副詞的に修飾する前置詞句の頭。'],
    pobj:  ['前置詞の目的語',     'adv', '前置詞に支配される名詞。'],
    adv:   ['副詞',               'adv', '動詞を修飾する。'],
    neg:   ['否定辞',             'adv', '続く語句を否定する。'],
    coord: ['並列',               'link', 'καὶで結ばれた対等な語。'],
    conj:  ['接続詞・小辞',       'link', '語句や節をつなぐ。'],
    cmark: ['従属節の標識',       'link', 'ὅτι・ὥστε・ἵναなど、従属節を導く語。'],
  };

  // ── Text measurement (Japanese font) ────────────────────────────────

  let _cv = null;

  function _canvas() {
    if (!_cv && typeof document !== 'undefined') {
      try { _cv = document.createElement('canvas').getContext('2d'); } catch (_) {}
    }
    return _cv;
  }

  // Font for Japanese-primary display
  const JP_FONT = "'Noto Sans JP', 'Hiragino Sans', sans-serif";

  function tw(s, z) {
    if (z === undefined) z = 18;
    const cv = _canvas();
    if (!cv) return String(s).length * z * 0.85;
    cv.font = `${z}px ${JP_FONT}`;
    return cv.measureText(String(s)).width;
  }

  // ── Word loading ─────────────────────────────────────────────────────

  function loadWords(rows) {
    if (!Array.isArray(rows) || !rows.length) throw '語の配列が空です';
    const nw = rows.map((r, i) => {
      if (!Array.isArray(r) || r.length < 5 || !ROLE[r[4]])
        throw `${i + 1}番目の語: 形式または役割名が不正です (role="${r[4]}")`;
      const h = r[3];
      if (!(Number.isInteger(h) && h >= 0 && h <= rows.length && h !== i + 1))
        throw `${i + 1}番目の語: 係り先の番号が不正です (h=${h})`;
      return {
        i: i + 1,
        g:   r[0],      // Greek surface form
        gl:  r[1],      // Japanese gloss (primary display)
        ps:  r[2],      // morphology string
        h:   h,         // head index (1-based, 0 = root)
        r:   r[4],      // role
        imp: r[5],      // implied subject (optional)
        grp: ROLE[r[4]][1],
      };
    });
    if (nw.filter(w => w.r === 'verb').length !== 1)
      throw '役割 verb の語がちょうど1つ必要です';
    return nw;
  }

  // ── Rendering state (module-level, like Reference) ───────────────────

  let _W = [];   // current word list
  let _S = '';   // SVG string accumulator

  const _ROW_GAP = 20; // vertical gap between baseline rows (px)

  const kids  = i  => _W.filter(w => i && w.h === i);
  const sum   = a  => a.reduce((s, x) => s + x, 0);
  const mx    = a  => Math.max(0, ...a);
  const _esc  = s  => String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function sub(i, s) {
    if (!s) s = new Set();
    kids(i).forEach(k => { s.add(k.i); sub(k.i, s); });
    return s;
  }

  const MOD = ['det','poss','gen','adj','adv','neg','demo','iobj','appos','voc','auxv','advn','obj2','pobj'];

  function chainOf(i) {
    const out = [i];
    const walk = id => {
      kids(id).filter(k => k.r === 'coord' && !_isVerbW(k.i)).forEach(k => {
        out.push(k.i); walk(k.i);
      });
    };
    walk(i);
    return out;
  }

  // A word is "verb-like" if its morphology starts with 'verb', or it's an implied subject placeholder
  const _isVerbW = id => {
    const w = _W[id - 1];
    return (w.ps || '').toLowerCase().startsWith('verb') ||
           (w.ps || '').startsWith('動詞') ||
           w.g === '( )';
  };

  const CLZ = w =>
    ['verb', 'clause', 'cverb', 'relcl', 'advcl'].includes(w.r) ||
    (['coord', 'subj', 'obj', 'pred', 'appos', 'pobj', 'iobj', 'obj2'].includes(w.r) && _isVerbW(w.i));

  const E = s => { _S += s; };

  const ln = (a, b, c, d, col, dash) =>
    E(`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${col}" stroke-width="1.6"${dash ? ' stroke-dasharray="4 3"' : ''}/>`);

  // Draw a word in the SVG — primary text is Japanese (w.gl), Greek stored in data-grk
  function wd(w, x, y, z, anc) {
    if (z === undefined) z = 18;
    if (anc === undefined) anc = 'start';
    const disp = w.gl || w.g;
    const t = tw(disp, z);
    const l = anc === 'end' ? x - t : anc === 'middle' ? x - t / 2 : x;
    const fill = w.i ? `var(--${w.grp})` : 'var(--sub)';
    const dataAttrs = w.i
      ? ` data-i="${w.i}" data-grk="${_esc(w.g)}" style="--c:var(--${w.grp})"`
      : '';
    E(`<g class="wn"${dataAttrs}>`);
    E(`<rect x="${l - 3}" y="${y - z}" width="${t + 6}" height="${z + 7}" rx="4"/>`);
    E(`<text x="${x}" y="${y}" font-size="${z}" font-family="${JP_FONT}" text-anchor="${anc}" fill="${fill}">${_esc(disp)}</text>`);
    E(`</g>`);
  }

  const meas = h => ({ w: sum(h.map(b => b.w)), h: mx(h.map(b => b.H)) });

  // Phase O-2: Layout hanging blocks in rows when they would exceed wrapAt.
  // Returns { maxW, totalH }. Falls back to meas() semantics when wrapAt is absent.
  function measLayout(h, wrapAt) {
    if (!wrapAt || !h.length)
      return { maxW: sum(h.map(b => b.w)), totalH: mx(h.map(b => b.H)) };
    const rows = [[]];
    let rowW = 0;
    h.forEach(b => {
      if (rows[rows.length - 1].length > 0 && rowW + b.w > wrapAt)
        { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(b);
      rowW += b.w;
    });
    const maxW   = mx(rows.map(row => sum(row.map(b => b.w))));
    const totalH = sum(rows.map((row, i) =>
      mx(row.map(b => b.H)) + (i < rows.length - 1 ? 8 : 0)));
    return { maxW, totalH };
  }

  function hang(n) {
    const bs = [];
    kids(n.i).forEach(k => {
      if (MOD.includes(k.r) && !k.base) {
        bs.push(modB(k));
      } else if (k.r === 'prep') {
        chainOf(k.i).forEach((id, idx) => {
          if (idx > 0) {
            const cj = kids(id).find(z => z.r === 'conj');
            bs.push({ k: 'g', w: 26, H: 0, cj });
          }
          bs.push(prepB(_W[id - 1]));
        });
      } else if (k.r === 'conj' && n.r !== 'coord' && n.r !== 'cverb') {
        bs.push(modB(k, 1));
      }
    });
    return bs;
  }

  function modB(m, d) {
    const chain = chainOf(m.i).map(id => {
      const nd = _W[id - 1], h = hang(nd), s = meas(h);
      return { id, nd, h, cw: Math.max(tw(nd.gl || nd.g, 17) + 14, s.w + 10), hh: s.h };
    });
    const sw = sum(chain.map(u => u.cw)) + 28 * (chain.length - 1);
    return { k: 'm', chain, d, sw, w: Math.max(sw, 20) + 10, H: 32 + mx(chain.map(u => u.hh)) };
  }

  function prepB(p) {
    const ks   = kids(p.i);
    const neg  = ks.filter(k => k.r === 'neg');
    const adv  = ks.filter(k => k.r === 'adv');
    const o    = ks.find(k => k.r === 'pobj');
    if (!o) throw `「${p.gl || p.g}」(${p.i}番) に pobj (前置詞の目的語) がありません`;
    const lab  = [...adv, ...neg, p];
    const lw   = Math.max(30, sum(lab.map(x => tw(x.gl || x.g, 16) + 7)));
    const mem  = [o, ...kids(o.i).filter(k => k.r === 'coord')].map(m => {
      const h = hang(m), s = meas(h);
      return { m, h, hw: s.w, hh: s.h, cj: kids(m.i).find(k => k.r === 'conj') };
    });
    const sw   = mx(mem.map(x => Math.max(tw(x.m.gl || x.m.g, 17) + 14, x.hw)));
    return { k: 'p', p, lab, lw, mem, w: lw + sw + 10, H: 40 + sum(mem.map(x => x.hh)) + 46 * (mem.length - 1) };
  }

  // Phase O-2: wrapAt enables row-wrapping of hanging blocks.
  // Without wrapAt, behavior is identical to the pre-O-2 version.
  function dH(h, x, y, wrapAt) {
    if (!wrapAt) {
      let c = x;
      h.forEach(b => { dB(b, c, y); c += b.w; });
      return;
    }
    const rows = [[]];
    let rowW = 0;
    h.forEach(b => {
      if (rows[rows.length - 1].length > 0 && rowW + b.w > wrapAt)
        { rows.push([]); rowW = 0; }
      rows[rows.length - 1].push(b);
      rowW += b.w;
    });
    let cy = y;
    rows.forEach(row => {
      let cx = x;
      row.forEach(b => { dB(b, cx, cy); cx += b.w; });
      cy += mx(row.map(b => b.H)) + 8;
    });
  }

  function dB(b, x, y) {
    if (b.k === 'g') {
      if (b.cj) wd(b.cj, x + 8, y + 14, 15, 'middle');
      return;
    }
    if (b.k === 'm') {
      const col = `var(--${b.chain[0].nd.grp})`;
      ln(x + 18, y, x, y + 32, col, b.d);
      ln(x, y + 32, x + b.sw, y + 32, col, b.d);
      let cx = x + 7;
      b.chain.forEach((u, k) => {
        if (k > 0) {
          const cj = kids(u.id).find(z => z.r === 'conj');
          if (cj) wd(cj, cx + 10, y + 19, 14, 'middle');
          cx += 28;
        }
        wd(u.nd, cx, y + 26, 17);
        dH(u.h, cx - 7, y + 32);
        cx += u.cw;
      });
      return;
    }
    // PP block
    const sb  = x + b.lw - 4;
    const col = `var(--${b.p.grp})`;
    ln(sb + 18, y, sb, y + 40, col);
    let lx = sb - 2;
    [...b.lab].reverse().forEach(w => {
      wd(w, lx, y + 34, 16, 'end');
      lx -= tw(w.gl || w.g, 16) + 7;
    });
    b.mx = sb + 12;
    let my = y + 40;
    b.mem.forEach((m, i) => {
      ln(sb, my, sb + Math.max(tw(m.m.gl || m.m.g, 17) + 14, m.hw), my, `var(--${m.m.grp})`);
      wd(m.m, sb + 7, my - 6, 17);
      dH(m.h, sb, my);
      const nx = b.mem[i + 1];
      if (nx) {
        const ny = my + m.hh + 46;
        ln(sb, my, sb, ny, 'var(--link)', 1);
        if (nx.cj) wd(nx.cj, sb - 5, (my + ny) / 2 + 6, 15, 'end');
        my = ny;
      }
    });
  }

  // Baseline: S | V \ pred  or  S | V | obj
  // aw: available width for items (= availableWidth - clauseStartX). Omit for legacy single-row.
  function mk(v, aw) {
    const K    = r => kids(v.i).find(k => k.r === r);
    const subj = K('subj') || (v.imp ? { g: `(${v.imp})`, gl: `(${v.imp})` } : null);
    const ob   = K('obj');
    const pred = K('pred');
    const cp   = pred || ob;
    const ap   = cp && kids(cp.i).find(k => k.r === 'appos');
    const its  = [];
    if (ap) ap.base = 1;
    if (subj) its.push({ n: subj, s: '|' });
    its.push({ n: v, s: pred ? '\\' : ob ? 'o' : '' });
    if (cp)  its.push({ n: cp,  s: ap ? '=' : '' });
    if (ap)  its.push({ n: ap,  s: '' });

    its.forEach(it => {
      it.chain = it.n.i
        ? chainOf(it.n.i).map(id => {
            const nd = _W[id - 1], h = hang(nd), lOut = measLayout(h, aw);
            return { id, nd, h, cw: Math.max(tw(nd.gl || nd.g, 21) + 16, lOut.maxW + 10), hh: lOut.totalH };
          })
        : [{ id: 0, nd: it.n, h: [], cw: tw(it.n.gl || it.n.g, 21) + 16, hh: 0 }];
      it.hh = mx(it.chain.map(u => u.hh));
      it.tw = sum(it.chain.map(u => u.cw)) + 28 * (it.chain.length - 1);
      it.w  = it.tw + (it.s ? 30 : 0);
    });

    // Row assignment: wrap items at aw boundary (skip if aw not given)
    const rows = [[]];
    let cur = 0;
    its.forEach((it, idx) => {
      if (aw && cur > 0) {
        const checkW = (it.s && its[idx + 1]) ? it.w + its[idx + 1].w : it.w;
        if (cur + checkW > aw) { rows.push([]); cur = 0; }
      }
      rows[rows.length - 1].push(it);
      cur += it.w;
    });

    // Per-row hanging heights and y-offsets (relative to clause baseline y)
    const rowHHs = rows.map(row => mx(row.map(i => i.hh)));
    const rowYs  = [0];
    for (let i = 1; i < rows.length; i++)
      rowYs.push(rowYs[i - 1] + rowHHs[i - 1] + 32 + _ROW_GAP);

    const last = rows.length - 1;
    return {
      its,
      rows,
      rowYs,
      W:        mx(rows.map(row => sum(row.map(i => i.w)))),
      hh:       rowYs[last] + rowHHs[last] + 32,
      lastRowW: sum(rows[last].map(i => i.w)),
    };
  }

  // Draw a single baseline item at (cx, ry).
  // aw: total available width (SVG coordinates); used to compute dH wrapAt.
  function _drawItem(it, cx, ry, aw) {
    let cx0 = cx + 8;
    it.chain.forEach((u, k) => {
      if (k > 0) {
        const cj = kids(u.id).find(z => z.r === 'conj');
        if (cj) wd(cj, cx0 + 10, ry - 19, 15, 'middle');
        cx0 += 28;
      }
      wd(u.nd, cx0, ry - 9, 21);
      if (u.id) dH(u.h, cx0 - 8, ry, aw ? aw - (cx0 - 8) : undefined);
      cx0 += u.cw;
    });
    const sx = cx + it.tw + 15;
    if (it.s === '|')  ln(sx, ry - 16, sx, ry + 16, 'var(--ink)');
    if (it.s === 'o')  ln(sx, ry - 16, sx, ry,      'var(--ink)');
    if (it.s === '\\') ln(sx - 9, ry - 18, sx + 3, ry, 'var(--ink)');
    if (it.s === '=')  E(`<text x="${sx}" y="${ry - 8}" font-size="20" text-anchor="middle" fill="var(--ink)">=</text>`);
  }

  function dC(c, x, y, aw) {
    c.rows.forEach((rowItems, ri) => {
      const ry = y + c.rowYs[ri];
      const rW = sum(rowItems.map(i => i.w));
      ln(x, ry, x + rW, ry, 'var(--ink)');
      let cx = x;
      rowItems.forEach(it => { _drawItem(it, cx, ry, aw); cx += it.w; });
    });
  }

  // Find the owning CLZ ancestor of word w (the nearest CLZ-typed parent in the head chain)
  const own = w => {
    let c = w.h, n = 0;
    while (c && n++ < 99) {
      const p = _W[c - 1];
      if (CLZ(p)) return p.i;
      c = p.h;
    }
    return 0;
  };

  // Recursively place a clause node at (x, y)
  // kind: 'root' | 'sub' | 'co'
  // pa:   parent anchor { x, y } (for connector lines)
  // aw:   available width for reflow (optional)
  function _place(v, x, y, kind, pa, aw) {
    const c = mk(v, aw ? aw - x : undefined);
    const L = 'var(--link)';

    if (kind === 'root') {
      const cm = kids(v.i).find(k => ['cmark', 'conj'].includes(k.r));
      if (cm) { ln(x - 26, y, x - 26, y - 22, L, 1); wd(cm, x - 26, y - 27, 16, 'end'); }
    }
    if (kind === 'sub') {
      const cm = kids(v.i).find(k => ['cmark', 'conj', 'det'].includes(k.r));
      ln(pa.x, pa.y, pa.x + 18, pa.y, L, 1);
      ln(pa.x + 18, pa.y, pa.x + 18, y - 42, L, 1);
      ln(pa.x + 18, y - 42, x + 4, y - 42, L, 1);
      ln(x + 4, y - 42, x + 4, y, L, 1);
      if (cm) wd(cm, x + 80, y - 49, 19);
    }
    if (kind === 'co') {
      const cjs = kids(v.i).filter(k => k.r === 'conj');
      ln(x - 18, pa.y, x - 18, y, L, 1);
      ln(x - 18, y, x, y, L, 1);
      ln(x - 18, pa.y, x, pa.y, L, 1);
      cjs.forEach((cj, idx) => wd(cj, x - 24 - idx * 44, (pa.y + y) / 2 + 6, 16, 'end'));
    }

    dC(c, x, y, aw);
    let bot = y + c.hh, right = x + c.W, cy = bot + 90;
    _W.filter(k => CLZ(k) && own(k) === v.i).forEach(k => {
      const co = k.r === 'cverb' || k.r === 'coord';
      // Reflow: when the parent clause right edge exceeds available width,
      // reset sub-clause to the left margin instead of indenting further right.
      const childX = co ? x : (aw && x + c.W > aw ? 90 : x + 30);
      // Cap connection anchor so the rightward stub of the connection line stays within aw.
      const paX = aw ? Math.min(x + c.W, aw - 22) : x + c.W;
      const r   = _place(k, childX, cy, co ? 'co' : 'sub', { x: paX, y }, aw);
      bot   = Math.max(bot, r.bot);
      right = Math.max(right, r.right);
      cy    = r.bot + (co ? 60 : 80);
    });
    return { bot, right };
  }

  // ── Public API ───────────────────────────────────────────────────────

  /**
   * Render words[] → SVGElement.
   * Requires a DOM environment (browser).
   * @param {object[]} words          — from loadWords()
   * @param {number}   [availableWidth] — content area width for clause reflow (px)
   * @returns {SVGElement}
   */
  function renderSVG(words, availableWidth) {
    _W = words;
    _S = '';
    const root = _W.find(w => w.r === 'verb');
    if (!root) throw 'verb ロールの語が見つかりません';
    const aw  = (availableWidth > 0) ? availableWidth : undefined;
    const R   = _place(root, 90, 52, 'root', null, aw);
    // Phase O-3: +22 gives connector stub ≤18px beyond R.right.
    // vw = natural content width only; aw (reflow) is independent.
    const vw  = R.right + 22;
    const vh  = R.bot   + 40;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.dataset.w = String(vw);
    svg.dataset.h = String(vh);
    svg.style.width  = vw + 'px';
    svg.style.height = 'auto';
    svg.innerHTML = _S;
    return svg;
  }

  /**
   * List words that did not appear in the last renderSVG() call.
   * Call after renderSVG() to check for unrendered tokens.
   * @param {SVGElement} svg
   * @returns {string[]}  Greek forms of missing words
   */
  function unrenderedWords(svg) {
    const drawn = new Set([...svg.querySelectorAll('[data-i]')].map(e => +e.dataset.i));
    return _W.filter(w => !drawn.has(w.i)).map(w => w.g);
  }

  global.RKReadingRenderer = { ROLE, loadWords, renderSVG, unrenderedWords };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
