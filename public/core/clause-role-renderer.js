/**
 * CLAUSE_ROLE Diagram Renderer — v0.1
 *
 * Input:  { dr, tokenMap, siToRef, options }
 *   dr:       DiagramRepresentation from DgEngine.deriveDR()
 *   tokenMap: Map<evidence.ref, bdToken>
 *   siToRef:  Map<surfaceIndex, evidence.ref>
 *   options:  (reserved for future use)
 *
 * Output: SVG string (Reed-Kellogg style, Japanese display text)
 *
 * Phase 1 structures supported:
 *   1. Baseline  — S | V \ C or S | V | O (BASE_ORDER x-positions)
 *   2. Modifier  — 45° diagonal + horizontal branch (future: slot.modifiers)
 *   3. PP        — adverbialPhrases → diagonal + NP shelf (L-bracket)
 *   4. Verbless  — noVerb=true → dashed implied diagonal between S and C
 *   5. Coord     — coordClauses[] → vertical stack
 *   6. IO raised — INDIRECT_OBJECT above baseline with vertical stem
 *   7. Identity  — data-si attribute on text nodes for future interaction
 */
(function (global) {
  'use strict';

  // ── Slot display order ────────────────────────────────────────────────────
  const BASE_ORDER = ['SUBJECT', 'PREDICATE', 'COPULA', 'COMPLEMENT', 'OBJECT', 'SECOND_OBJECT'];
  const BASE_IDX   = Object.fromEntries(BASE_ORDER.map((fn, i) => [fn, i]));

  // ── Layout constants ──────────────────────────────────────────────────────
  const K = {
    CHAR_W:    13,   // px per Japanese character (approx)
    SLOT_PAD:  14,   // px padding each side of slot text
    MIN_W:     50,   // minimum slot width
    BL_Y:      44,   // baseline Y offset from top of clause frame
    SP_H:      14,   // half-height of sp (|) connector mark
    LBL_DY:    13,   // fn-label clearance below baseline
    PP_DX:     24,   // PP diagonal x-offset (rightward)
    PP_DY:     40,   // PP diagonal y-drop (downward)
    NP_PAD:    10,   // NP label padding each side
    NP_MIN_W:  60,   // minimum NP shelf width
    COORD_GAP:    60,   // vertical gap between coordination clauses
    IO_RAISE:     38,   // IO raised above baseline (px)
    IO_PP_GAP:    12,   // extra x-gap between IO stem and PP anchor (verbless only)
    PP_STACK_GAP:  6,   // vertical gap between stacked PP shelves
    NP_HEAD_LIMIT: 3,   // max display tokens per slot — applied to both headSIs and node-walk paths
    PAGE_PX:   24,   // page left/right padding
    PAGE_PY:   18,   // page top/bottom padding
    INK:       '#1a1a2e',
    FAINT:     '#777',
  };

  // ── Token helpers ─────────────────────────────────────────────────────────
  function _collectTokens(node, out) {
    if (!node) return;
    if (node.type === 'token') { out.push(node); return; }
    for (const c of (node.children || [])) _collectTokens(c, out);
  }

  function _getJa(si, siToRef, tokenMap) {
    const ref = siToRef.get(si);
    return ref ? (tokenMap.get(ref)?.japanese || '') : '';
  }

  function _clean(ja) {
    if (!ja || /^[［\[〔「【（]/.test(ja)) return '';
    return ja.replace(/^〜/, '');
  }

  function _slotText(slot, siToRef, tokenMap) {
    // 1. headSIs — preferred: head tokens only, filtered, capped at NP_HEAD_LIMIT
    if (slot.headSIs?.size > 0) {
      const d = [...slot.headSIs]
        .map(si => _clean(_getJa(si, siToRef, tokenMap)))
        .filter(Boolean).slice(0, K.NP_HEAD_LIMIT).join(' ');
      if (d) return d;
    }
    // 2. Tokens in node — first K.NP_HEAD_LIMIT unfiltered tokens (prevent NP explosion)
    if (slot.node) {
      const ts = [];
      _collectTokens(slot.node, ts);
      const filtered = ts
        .map(t => _clean(_getJa(t.surfaceIndex, siToRef, tokenMap)))
        .filter(Boolean);
      const d = filtered.slice(0, K.NP_HEAD_LIMIT).join(' ');
      if (d) return d;
    }
    // 3. si direct — last resort
    return _clean(_getJa(slot.si, siToRef, tokenMap));
  }

  function _slotW(text) {
    return Math.max(K.MIN_W, text.length * K.CHAR_W + K.SLOT_PAD * 2);
  }

  // ── Connector type between adjacent (sorted) slots ────────────────────────
  function _connType(fn1, fn2, noVerb) {
    if (noVerb) {
      // Multiple COMPLEMENTs connect with implied diagonal (mirrors DgEngine rule)
      if (fn1 === 'COMPLEMENT' && fn2 === 'COMPLEMENT') return 'implied';
      // S-nonS pair → implied dashed diagonal
      const a = fn1 === 'SUBJECT', b = fn2 === 'SUBJECT';
      if (a !== b) return 'implied';
      return null;
    }
    const isV = f => f === 'COPULA' || f === 'PREDICATE';
    if (isV(fn1) || isV(fn2)) {
      if (fn1 === 'SUBJECT'    || fn2 === 'SUBJECT')    return 'sp';
      if (fn1 === 'COMPLEMENT' || fn2 === 'COMPLEMENT') return 'complement';
      return 'po'; // OBJECT, SECOND_OBJECT, etc.
    }
    return null;
  }

  // ── SVG primitives ────────────────────────────────────────────────────────
  function _r(v) { return Math.round(v * 10) / 10; }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _line(x1, y1, x2, y2, dash) {
    const da = dash ? ` stroke-dasharray="${dash}"` : '';
    return `<line x1="${_r(x1)}" y1="${_r(y1)}" x2="${_r(x2)}" y2="${_r(y2)}" stroke="${K.INK}" stroke-width="1.5" stroke-linecap="round"${da}/>`;
  }

  function _text(x, y, s, opts) {
    const sz     = opts?.sz     ?? 13;
    const anchor = opts?.anchor ?? 'middle';
    const fill   = opts?.fill   ?? K.INK;
    const dataSi = opts?.si !== undefined ? ` data-si="${opts.si}"` : '';
    return `<text x="${_r(x)}" y="${_r(y)}" text-anchor="${anchor}" font-size="${sz}" fill="${fill}" font-family="'Noto Serif JP',serif"${dataSi}>${_esc(s)}</text>`;
  }

  function _fnLabel(fn) {
    const MAP = {
      SUBJECT: 'S', PREDICATE: 'V', COPULA: 'V',
      COMPLEMENT: 'C', OBJECT: 'O', SECOND_OBJECT: 'O2',
      INDIRECT_OBJECT: 'IO',
    };
    return MAP[fn] || '';
  }

  // ── Single clause renderer ────────────────────────────────────────────────
  // ox, oy: absolute SVG origin for this clause
  // Returns: { out: string[], frameW, frameH }
  function _renderClause(slots, advPhrases, noVerb, siToRef, tokenMap, ox, oy) {
    const out = [];
    const blY = oy + K.BL_Y;

    // ── Split IO from main baseline slots ─────────────────────────────────
    const io = slots.find(s => s.fn === 'INDIRECT_OBJECT');
    const main = slots
      .filter(s => s.fn !== 'INDIRECT_OBJECT')
      .sort((a, b) => (BASE_IDX[a.fn] ?? 99) - (BASE_IDX[b.fn] ?? 99));

    // ── Compute slot widths and x positions ───────────────────────────────
    // Slots are laid out contiguously — no gap; connectors are visual dividers
    let xAcc = 0;
    const lays = main.map(s => {
      const text = _slotText(s, siToRef, tokenMap);
      const w    = _slotW(text);
      const lay  = { fn: s.fn, text, w, x: xAcc, conn: null };
      xAcc += w;
      return lay;
    });
    const baseW = xAcc;

    // ── Connector types for adjacent BASE_ORDER pairs ─────────────────────
    for (let i = 1; i < lays.length; i++) {
      lays[i].conn = _connType(lays[i - 1].fn, lays[i].fn, noVerb);
    }

    // ── Draw continuous baseline ───────────────────────────────────────────
    if (lays.length > 0) {
      out.push(_line(ox, blY, ox + baseW, blY));
    }

    // ── Slot texts and fn-labels ───────────────────────────────────────────
    lays.forEach(s => {
      const mx = ox + s.x + s.w / 2;
      out.push(_text(mx, blY - 6, s.text));
      out.push(_text(mx, blY + K.LBL_DY + 2, _fnLabel(s.fn), { sz: 10, fill: K.FAINT }));
    });

    // ── Connector marks at slot boundaries ────────────────────────────────
    lays.forEach(s => {
      if (!s.conn) return;
      const bx = ox + s.x; // boundary x = left edge of this slot
      if (s.conn === 'sp') {
        // Full vertical | (S-V divider)
        out.push(_line(bx, blY - K.SP_H, bx, blY + K.SP_H));
      } else if (s.conn === 'po') {
        // Short vertical ¦ (V-O short divider)
        out.push(_line(bx, blY - K.SP_H, bx, blY));
      } else if (s.conn === 'complement') {
        // Backward diagonal \ (V-C complement)
        out.push(_line(bx - 7, blY - 13, bx + 2, blY + 2));
      } else if (s.conn === 'implied') {
        // Dashed diagonal (verbless implied predication)
        out.push(_line(bx - 7, blY - 13, bx + 2, blY + 2, '4 3'));
      }
    });

    // ── PP adverbials ─────────────────────────────────────────────────────
    // All PPs share ppAnchorX. Shelves stack vertically (increasing Y).
    // Diagonal always starts from (ppAnchorX, blY); shelves drop progressively.
    const vLay = lays.find(s => s.fn === 'COPULA' || s.fn === 'PREDICATE');
    const ppAnchorX = vLay
      ? ox + vLay.x + vLay.w / 2
      : ox + baseW + (io ? K.IO_PP_GAP : 0);

    let ppShelfY = blY + K.PP_DY;   // Y of current PP shelf, increases per PP
    let ppBelowY = blY;              // bottom of all PP content (for frameH)
    let ppRightX = ppAnchorX;        // rightmost x reached by PP shelves (for frameW)

    (advPhrases || []).forEach(p => {
      // Preposition Japanese
      const prepRef = siToRef.get(p.si);
      const prepJa  = _clean(tokenMap.get(prepRef)?.japanese || '');

      // NP head Japanese
      let npJa = '';
      if (p.ppNpModInfo?.headSIs?.size > 0) {
        npJa = [...p.ppNpModInfo.headSIs]
          .map(si => _clean(_getJa(si, siToRef, tokenMap)))
          .filter(Boolean).slice(0, K.NP_HEAD_LIMIT).join(' ');
      } else if (p.ppNpNode) {
        const ts = [];
        _collectTokens(p.ppNpNode, ts);
        npJa = ts
          .map(t => _clean(_getJa(t.surfaceIndex, siToRef, tokenMap)))
          .filter(Boolean).slice(0, K.NP_HEAD_LIMIT).join(' ');
      }

      const npW  = Math.max(K.NP_MIN_W, npJa.length * K.CHAR_W + K.NP_PAD * 2);
      const ax   = ppAnchorX;         // fixed for all PPs
      const bx   = ax + K.PP_DX;
      const by_  = ppShelfY;          // current shelf Y

      out.push(_line(ax, blY, bx, by_));             // diagonal from baseline anchor
      out.push(_line(bx, by_, bx + npW, by_));       // NP shelf

      if (prepJa) {
        // Prep label at actual midpoint of diagonal
        const mx = ax + K.PP_DX * 0.35;
        const my = blY + (by_ - blY) * 0.5 + 2;
        out.push(_text(mx, my, prepJa, { sz: 11, anchor: 'end' }));
      }
      if (npJa) {
        out.push(_text(bx + npW / 2, by_ - 5, npJa));
      }
      out.push(_text(bx + npW / 2, by_ + K.LBL_DY + 2, 'ADV', { sz: 10, fill: K.FAINT }));

      ppRightX  = Math.max(ppRightX, bx + npW);
      ppBelowY  = Math.max(ppBelowY, by_ + K.LBL_DY + 10);
      ppShelfY += K.PP_DY + K.LBL_DY + K.PP_STACK_GAP;
    });

    // ── IO raised above baseline ──────────────────────────────────────────
    if (io) {
      const ioText  = _slotText(io, siToRef, tokenMap);
      const ioW     = _slotW(ioText);

      // Stem anchors at: S|V boundary if verb present, else right of SUBJECT
      const spLay   = lays.find(s => s.conn === 'sp');
      const stemXRel = spLay
        ? spLay.x
        : (lays.length > 0 ? lays[lays.length - 1].x + lays[lays.length - 1].w : K.MIN_W);
      const stemX   = ox + stemXRel;
      const ioLineY = blY - K.IO_RAISE;

      // Vertical stem from baseline up to IO line
      out.push(_line(stemX, blY - K.SP_H, stemX, ioLineY + K.SP_H));
      // IO baseline segment
      out.push(_line(stemX - ioW / 2, ioLineY, stemX + ioW / 2, ioLineY));
      // IO text
      out.push(_text(stemX, ioLineY - 6, ioText));
      out.push(_text(stemX, ioLineY + K.LBL_DY + 2, 'IO', { sz: 10, fill: K.FAINT }));
    }

    // ── Compute frame bounding box ────────────────────────────────────────
    let frameW = Math.max(baseW, ppRightX - ox);
    if (io) {
      const spLay = lays.find(s => s.conn === 'sp');
      const ioW   = _slotW(_slotText(io, siToRef, tokenMap));
      const sxRel = spLay
        ? spLay.x
        : (lays.length > 0 ? lays[lays.length - 1].x + lays[lays.length - 1].w : K.MIN_W);
      frameW = Math.max(frameW, sxRel + ioW / 2);
    }

    let frameH = K.BL_Y + K.LBL_DY + 10;
    if (ppBelowY > blY) frameH = Math.max(frameH, ppBelowY - oy);
    // IO is above the baseline — doesn't extend frameH

    return { out, frameW, frameH };
  }

  // ── Main API ──────────────────────────────────────────────────────────────
  function createClauseRoleDiagramSvg({ dr, tokenMap, siToRef, options = {} }) {
    if (!dr) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80"></svg>';
    }

    const parts  = [];
    let totalW   = 0;
    let totalH   = K.PAGE_PY;

    if (dr.isCoordination && dr.coordClauses?.length) {
      // Coordination: stack clauses vertically
      let oy = K.PAGE_PY;
      const clauseBlYs = [];
      dr.coordClauses.forEach(cc => {
        clauseBlYs.push(oy + K.BL_Y);
        const { out, frameW, frameH } = _renderClause(
          cc.slots          || [],
          cc.adverbialPhrases || [],
          cc.noVerb         || false,
          siToRef, tokenMap,
          K.PAGE_PX, oy
        );
        parts.push(...out);
        totalW = Math.max(totalW, frameW + K.PAGE_PX * 2);
        oy    += frameH + K.COORD_GAP;
      });
      totalH = oy - K.COORD_GAP + K.PAGE_PY;

      // B-1: thin vertical axis spanning all clause baselines
      if (clauseBlYs.length >= 2) {
        const axX  = K.PAGE_PX - 8;
        const topY = clauseBlYs[0];
        const botY = clauseBlYs[clauseBlYs.length - 1];
        parts.push(`<line x1="${_r(axX)}" y1="${_r(topY)}" x2="${_r(axX)}" y2="${_r(botY)}" stroke="${K.FAINT}" stroke-width="1" stroke-linecap="round"/>`);
        // Optional conjunction label between consecutive clauses
        for (let ci = 1; ci < dr.coordClauses.length; ci++) {
          const cc = dr.coordClauses[ci];
          if (cc.conjunctionRef && tokenMap) {
            const conjJa = _clean(tokenMap.get(cc.conjunctionRef)?.japanese || '');
            if (conjJa) {
              const midY = (clauseBlYs[ci - 1] + clauseBlYs[ci]) / 2 + 4;
              parts.push(_text(axX + 4, midY, conjJa, { sz: 9, anchor: 'start', fill: K.FAINT }));
            }
          }
        }
      }
    } else {
      // Single clause
      const { out, frameW, frameH } = _renderClause(
        dr.slots            || [],
        dr.adverbialPhrases || [],
        dr.noVerb           || false,
        siToRef, tokenMap,
        K.PAGE_PX, K.PAGE_PY
      );
      parts.push(...out);
      totalW = frameW + K.PAGE_PX * 2;
      totalH = frameH + K.PAGE_PY * 2;
    }

    totalW = Math.max(totalW, 240);
    totalH = Math.max(totalH, 80);

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" data-cr-version="0.1">`,
      ...parts,
      '</svg>',
    ].join('\n');
  }

  // ── Module export ─────────────────────────────────────────────────────────
  const ClauseRoleRenderer = { createClauseRoleDiagramSvg };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClauseRoleRenderer;
  } else {
    global.ClauseRoleRenderer = ClauseRoleRenderer;
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
