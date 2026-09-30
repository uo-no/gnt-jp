/**
 * role-renderer.js  RK-ARCH-04 Phase 4-3
 *
 * Pure SVG renderer for structural diagrams.
 * Converts (RoleGeometryLayout, RolePageLayout) → SVGElement.
 *
 * Architecture (dual-input):
 *   GL (RoleGeometryLayout) — WHERE: frames, anchors, baseline, connector points
 *   PL (RolePageLayout)     — WHAT:  headTokens, textWrapBlock, compoundMembers, bracketText
 *
 * Pipeline position:
 *   buildRoleSemanticLayout()  (Phase 1)
 *    → buildRolePageLayout()   (Phase 2)
 *    → buildRoleGeometryLayout() (Phase 3)
 *    → createRoleDiagramSvg(gl, pl, options)  ← this module (Phase 4)
 *
 * Purity contract:
 *   - No DOM measurement: getBoundingClientRect, offsetWidth, offsetHeight are ABSENT
 *   - No geometry recalculation: all coordinates read from GL as-is
 *   - No pipeline invocation: buildRoleSemanticLayout, buildRolePageLayout, buildRoleGeometryLayout absent
 *   - No ResizeObserver, no window.addEventListener('resize')
 *   - Returns SVGElement; never appends to document itself
 *
 * GL / PL matching rule:
 *   gl.root.slots[i]                  ↔  pl.root.baselineRow.slots[i]
 *   gl.root.raised[i]                 ↔  pl.root.raisedZone.slots[i]
 *   gSlot.innerDiagram                ↔  plSlot.innerPageLayout.root  (ContentClause recursive)
 *
 * Phase 4-3 implements:
 *   - SVG root + layer structure
 *   - Baseline (GRootNode.baseline → <path class="role-baseline">)
 *   - Core connectors: sp, po, complement, implied, contentClause
 *   - Baseline slots: all displayModes (foreignObject + XHTML content)
 *   - Raised slot stalks: stemFrom/stemTo → <path class="role-raised-stem">
 *   - ContentClause recursive rendering
 *   - Token click: options.onTokenClick(ref, tokenData)
 *
 * Phase 4-4:  modifiers, adverbials, PP diagonal, coordination (VALIDATED)
 * Phase 4-5-A: CSS compatibility (line-height / font)
 * Phase 4-5-B: Relative Clause recursive rendering (_renderRelClauses)
 * Phase 4-5-C: Antecedent Link path rendering (_renderAntecedentLinks, role-layer-links)
 *
 * Exports: window.RoleRenderer = { createRoleDiagramSvg, DEFAULT_RENDER_OPTIONS }
 */
(function (global) {
  'use strict';

  // ── Namespaces ─────────────────────────────────────────────────────────

  var SVG_NS   = 'http://www.w3.org/2000/svg';
  var XHTML_NS = 'http://www.w3.org/1999/xhtml';

  // ── Default render options ─────────────────────────────────────────────

  var DEFAULT_RENDER_OPTIONS = {
    strokeMain:      'var(--text-main)',
    strokeSub:       'var(--text-sub)',
    strokeDomain:    'var(--color-domain, #7a7aaa)',
    coordTickLength: 8,
    coordLabelGap:   2,
  };

  // ── Document access ────────────────────────────────────────────────────
  //
  // Accessed via global.document so that:
  //   - In browser:     global = window, global.document = browser document
  //   - In Node.js test: global = fakeWindow, global.document = mock document
  //     (injected via: const fakeWindow = { document: mockDoc }; new Function('window', code)(fakeWindow))

  function _doc() {
    return global.document || null;
  }

  // ── SVG / XHTML element factory helpers ───────────────────────────────

  function _svgEl(tag, attrs) {
    var doc = _doc();
    var el = doc.createElementNS(SVG_NS, tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        var v = attrs[k];
        if (v !== undefined && v !== null) {
          el.setAttribute(k, String(v));
        }
      }
    }
    return el;
  }

  function _htmlEl(tag, attrs) {
    var doc = _doc();
    var el = doc.createElementNS(XHTML_NS, tag);
    if (attrs) {
      var keys = Object.keys(attrs);
      for (var ki = 0; ki < keys.length; ki++) {
        var k = keys[ki];
        var v = attrs[k];
        if (v !== undefined && v !== null) {
          el.setAttribute(k, String(v));
        }
      }
    }
    return el;
  }

  // Create a <path> with inline stroke style. No fill.
  function _svgPath(d, className, stroke, strokeWidth, dash) {
    var el = _svgEl('path', { class: className, d: d });
    var style = 'stroke:' + stroke + ';stroke-width:' + strokeWidth +
                ';fill:none;stroke-linecap:round';
    if (dash) style += ';stroke-dasharray:' + dash;
    el.setAttribute('style', style);
    return el;
  }

  // ── Token field accessors ─────────────────────────────────────────────
  //
  // SR JSON token node schema (confirmed from data/sr):
  //   { type:'token', text:'Παῦλος', evidence:{ ref:'ROM 1:1!1' }, surfaceIndex:0, ... }

  function _tokenRef(tok) {
    if (!tok) return null;
    return (tok.evidence && (tok.evidence.nodeId || tok.evidence.ref)) || null;
  }

  function _tokenText(tok) {
    return (tok && tok.text) ? tok.text : '';
  }

  // ── Token <span> rendering ─────────────────────────────────────────────

  function _renderToken(tok, opts) {
    var ref  = _tokenRef(tok);
    var text = _tokenText(tok);
    var span = _htmlEl('span', { class: 'role-token' });
    span.textContent = text;
    if (ref) {
      span.setAttribute('data-ref', ref);
      if (opts.onTokenClick) {
        // Capture ref/opts at bind time; no global lookups.
        var tokenData = (opts.tokenMap && opts.tokenMap[ref]) || null;
        span.addEventListener('click', (function (capturedRef, capturedData) {
          return function () { opts.onTokenClick(capturedRef, capturedData); };
        })(ref, tokenData));
      }
    }
    return span;
  }

  // ── Content-type renderers (PL content → XHTML elements) ──────────────

  // COMPOSITE: head tokens side-by-side (flex-wrap)
  function _renderComposite(headTokens, opts) {
    var wrap = _htmlEl('div', {
      class: 'role-composite',
      style: 'display:flex;flex-wrap:nowrap;gap:2px;align-items:flex-end;',
    });
    var toks = headTokens || [];
    for (var i = 0; i < toks.length; i++) {
      wrap.appendChild(_renderToken(toks[i], opts));
    }
    return wrap;
  }

  // FLAT_WRAP: all tokens space-separated, word-wrapping allowed
  function _renderFlatWrap(textWrapBlock, opts) {
    var wrap = _htmlEl('div', {
      class: 'role-flat-wrap',
      style: 'white-space:normal;word-break:break-word;',
    });
    var toks = (textWrapBlock && textWrapBlock.tokens) || [];
    for (var i = 0; i < toks.length; i++) {
      if (i > 0) {
        var sp = _htmlEl('span', {});
        sp.textContent = ' ';
        wrap.appendChild(sp);
      }
      wrap.appendChild(_renderToken(toks[i], opts));
    }
    return wrap;
  }

  // NOMINALIZED: bracket notation [text]
  function _renderNominalized(bracketText) {
    var wrap = _htmlEl('div', { class: 'role-nominalized', style: 'white-space:nowrap;' });
    wrap.textContent = '[' + (bracketText || '') + ']';
    return wrap;
  }

  // COMPOUND: vertical stack of members, each separated by a thin rule
  function _renderCompound(compoundMembers, opts) {
    var wrap = _htmlEl('div', {
      class: 'role-compound',
      style: 'display:flex;flex-direction:column;',
    });
    var members = compoundMembers || [];
    for (var i = 0; i < members.length; i++) {
      if (i > 0) {
        var sep = _htmlEl('div', {
          class: 'role-compound-sep',
          style: 'height:1px;background:currentColor;opacity:0.35;margin:2px 0;align-self:stretch;',
        });
        wrap.appendChild(sep);
      }
      var m = members[i];
      var memberEl;
      if (m.displayMode === 'FLAT_WRAP' && m.textWrapBlock) {
        memberEl = _renderFlatWrap(m.textWrapBlock, opts);
      } else {
        memberEl = _renderComposite(m.headTokens, opts);
      }
      wrap.appendChild(memberEl);
    }
    return wrap;
  }

  // ── Slot content div (XHTML root for foreignObject) ───────────────────
  //
  // fn:    from GL (GSlotNode.fn) — determines fn label and class
  // plSlot: from PL (PLSlotLayout) — provides text content

  function _renderSlotContentDiv(fn, plSlot, opts) {
    var outer = _htmlEl('div', {
      class:  'role-slot-content',
      style:  'overflow:visible;box-sizing:border-box;',
      xmlns:  XHTML_NS,
    });

    if (plSlot) {
      var mode = plSlot.displayMode;
      var contentEl;

      if (mode === 'FLAT_WRAP' && plSlot.textWrapBlock) {
        contentEl = _renderFlatWrap(plSlot.textWrapBlock, opts);
      } else if (mode === 'COMPOUND' && plSlot.compoundMembers) {
        contentEl = _renderCompound(plSlot.compoundMembers, opts);
      } else if (mode === 'NOMINALIZED' && plSlot.bracketText != null) {
        contentEl = _renderNominalized(plSlot.bracketText);
      } else if (mode === 'CONTENT_CLAUSE') {
        // Baseline slot shows a small placeholder; inner diagram rendered separately.
        var ph = _htmlEl('div', {
          class: 'role-content-clause-ph',
          style: 'font-style:italic;opacity:0.5;font-size:0.75rem;',
        });
        ph.textContent = '…';
        contentEl = ph;
      } else {
        // COMPOSITE (default)
        contentEl = _renderComposite(plSlot.headTokens, opts);
      }

      outer.appendChild(contentEl);
    }

    // Function label — omit for COPULA and AUX (they appear on the baseline line itself)
    if (fn && fn !== 'COPULA' && fn !== 'AUX') {
      var fnEl = _htmlEl('div', {
        class: 'role-slot-fn',
        style: 'font-size:0.75rem;color:' + opts.strokeSub + ';margin-top:1px;',
      });
      fnEl.textContent = fn;
      outer.appendChild(fnEl);
    }

    return outer;
  }

  // ── <foreignObject> slot rendering ─────────────────────────────────────

  function _renderSlot(gSlot, plSlot, slotLayer, opts) {
    var f  = gSlot.frame;
    var fn = gSlot.fn || '';

    var fo = _svgEl('foreignObject', {
      x:        f.x,
      y:        f.y,
      width:    f.width,
      height:   f.height,
      class:    'role-slot role-slot-' + fn.toLowerCase(),
      overflow: 'visible',
    });

    fo.appendChild(_renderSlotContentDiv(fn, plSlot, opts));
    slotLayer.appendChild(fo);
  }

  // ── Raised slot stalk rendering ────────────────────────────────────────
  //
  // GRaisedNode: { fn, attachmentPoint, frame, stemFrom:{x,y}, stemTo:{x,y} }
  // Draws the vertical stalk from the raised platform to the baseline.

  function _renderRaisedStem(gRaised, connLayer, opts) {
    var sf = gRaised.stemFrom;
    var st = gRaised.stemTo;
    if (!sf || !st) return;
    var d = 'M ' + sf.x + ' ' + sf.y + ' L ' + st.x + ' ' + st.y;
    connLayer.appendChild(
      _svgPath(d, 'role-raised-stem', opts.strokeSub, 1.5, null)
    );
  }

  // ── Raised slot content rendering ─────────────────────────────────────
  //
  // Phase 5-1-A: draws a foreignObject at GRaisedNode.frame using
  // PLRaisedSlotLayout content (displayMode / headTokens / textWrapBlock).
  // GRaisedNode.frame is pre-computed by role-geometry-layout.js.
  // PLRaisedSlotLayout shares the same content fields as PLSlotLayout, so
  // _renderSlotContentDiv is reused directly; no coordinate recalculation here.

  function _renderRaisedContent(gRaised, plRaised, slotLayer, opts) {
    if (!gRaised || !gRaised.frame || !plRaised) return;
    var f  = gRaised.frame;
    var fn = gRaised.fn || '';

    var fo = _svgEl('foreignObject', {
      x:        f.x,
      y:        f.y,
      width:    f.width,
      height:   f.height,
      class:    'role-slot role-slot-raised role-slot-' + fn.toLowerCase(),
      overflow: 'visible',
    });

    // Phase 5-1-F: pass fn so IO gets a label. AUX is excluded by the COPULA/AUX guard
    // in _renderSlotContentDiv. DOM post-process (Phase 4-6-B) converts to Japanese.
    fo.appendChild(_renderSlotContentDiv(fn, plRaised, opts));
    slotLayer.appendChild(fo);
  }

  // ── Core connector rendering ───────────────────────────────────────────
  //
  // GConnector: { type:'sp'|'po'|'complement'|'implied'|'contentClause',
  //               from:{x,y}, to:{x,y}, dash:null|'4 3' }
  //
  // Phase 4-3 covers all five connector types produced by Phase 3-1/3-2.

  function _renderConnectors(gConnectors, connLayer, opts) {
    var conns = gConnectors || [];
    for (var i = 0; i < conns.length; i++) {
      var conn = conns[i];
      var type = conn.type;
      var from = conn.from;
      var to   = conn.to;
      if (!from || !to) continue;

      var d   = 'M ' + from.x + ' ' + from.y + ' L ' + to.x + ' ' + to.y;
      var cls = 'role-connector role-connector-' + type;

      var stroke, sw, dash;
      if (type === 'sp' || type === 'po') {
        stroke = opts.strokeMain; sw = 2; dash = null;
      } else if (type === 'complement') {
        stroke = opts.strokeMain; sw = 2; dash = null;
      } else if (type === 'implied') {
        stroke = opts.strokeSub; sw = 1.5; dash = conn.dash || '4 3';
      } else {
        // contentClause (and any unknown future type)
        stroke = opts.strokeSub; sw = 1.5; dash = null;
      }

      connLayer.appendChild(_svgPath(d, cls, stroke, sw, dash));
    }
  }

  // ── Baseline rendering ─────────────────────────────────────────────────
  //
  // GRootNode.baseline: { y:number, x1:number, x2:number }

  function _renderBaseline(baseline, connLayer, opts) {
    if (!baseline) return;
    var x1 = baseline.x1;
    var x2 = baseline.x2;
    var y  = baseline.y;
    if (!Number.isFinite(x1) || !Number.isFinite(x2) || !Number.isFinite(y)) return;
    var d = 'M ' + x1 + ' ' + y + ' L ' + x2 + ' ' + y;
    connLayer.appendChild(_svgPath(d, 'role-baseline', opts.strokeMain, 2, null));
  }

  // ── Modifier rendering ─────────────────────────────────────────────────────
  //
  // GModifierNode.bracketFrom and .bracketTo share the same x (slotCenterX),
  // making the connector a vertical line from baseline to modifier midpoint.
  // GL/PL mapping: entries[e].slotSi → plSlots by .si; modifiers[j] by index.

  function _renderModifierContent(gMod, plMod, opts) {
    var outer = _htmlEl('div', {
      class:  'role-modifier-content',
      style:  'overflow:visible;box-sizing:border-box;',
      xmlns:  XHTML_NS,
    });
    if (plMod) {
      var contentEl;
      if (plMod.displayMode === 'FLAT_WRAP' && plMod.textWrapBlock) {
        contentEl = _renderFlatWrap(plMod.textWrapBlock, opts);
      } else {
        contentEl = _renderComposite(plMod.headTokens, opts);
      }
      outer.appendChild(contentEl);
    }
    return outer;
  }

  function _renderOneModifier(gMod, plMod, connLayer, slotLayer, opts) {
    var bf = gMod.bracketFrom;
    var bt = gMod.bracketTo;
    if (bf && bt) {
      var d = 'M ' + bf.x + ' ' + bf.y + ' L ' + bt.x + ' ' + bt.y;
      connLayer.appendChild(_svgPath(d, 'role-modifier-bracket', opts.strokeSub, 1, null));
    }
    var f = gMod.frame;
    if (!f) return;
    var fo = _svgEl('foreignObject', {
      x: f.x, y: f.y, width: f.width, height: f.height,
      class: 'role-modifier', overflow: 'visible',
    });
    fo.appendChild(_renderModifierContent(gMod, plMod, opts));
    slotLayer.appendChild(fo);
  }

  function _renderModifiers(gModifiers, plSlots, connLayer, slotLayer, opts) {
    if (!gModifiers || !gModifiers.entries) return;
    var entries = gModifiers.entries || [];
    for (var ei = 0; ei < entries.length; ei++) {
      var entry  = entries[ei];
      var plSlot = null;
      for (var pi = 0; pi < plSlots.length; pi++) {
        if (plSlots[pi].si === entry.slotSi) { plSlot = plSlots[pi]; break; }
      }
      var plMods = (plSlot && plSlot.modifiers) || [];
      var gMods  = entry.modifiers || [];
      for (var mi = 0; mi < gMods.length; mi++) {
        _renderOneModifier(gMods[mi], plMods[mi] || null, connLayer, slotLayer, opts);
      }
    }
  }

  // ── Adverbial rendering ────────────────────────────────────────────────────
  //
  // L-bracket path: M bracketAnchorX bracketTopY
  //                 L bracketAnchorX (frame.y+frame.height)
  //                 L (frame.x+frame.width) (frame.y+frame.height)
  //
  // GL/PL mapping: glRoot.adverbials[i] ↔ plRoot.advZone.phrases[i] by index.
  //
  // PP: diagonalLabel (string, not a token — no click) for prep,
  //     headTokens/textWrapBlock for NP (clickable).
  // CLAUSE/PARTICIPLE: recursive _renderGRootNode on innerDiagram.

  function _renderAdvLBracket(gAdv, cls, connLayer, opts) {
    var ax = gAdv.bracketAnchorX;
    var ty = gAdv.bracketTopY;
    var f  = gAdv.frame;
    if (!Number.isFinite(ax) || !Number.isFinite(ty) || !f) return;
    var bottom = f.y + f.height;
    var right  = f.x + f.width;
    var d = 'M ' + ax + ' ' + ty +
            ' L ' + ax + ' ' + bottom +
            ' L ' + right + ' ' + bottom;
    connLayer.appendChild(_svgPath(d, cls, opts.strokeSub, 1, null));
  }

  function _renderPPAdv(gAdv, plAdv, connLayer, slotLayer, opts) {
    _renderAdvLBracket(gAdv, 'role-adverbial-bracket role-adverbial-pp', connLayer, opts);

    var df = gAdv.diagonalFrom;
    var dt = gAdv.diagonalTo;
    if (df && dt) {
      var dPath = 'M ' + df.x + ' ' + df.y + ' L ' + dt.x + ' ' + dt.y;
      connLayer.appendChild(_svgPath(dPath, 'role-pp-diagonal', opts.strokeSub, 1, null));
    }

    var pf = gAdv.prepFrame;
    if (pf) {
      var foPrep = _svgEl('foreignObject', {
        x: pf.x, y: pf.y, width: pf.width, height: pf.height,
        class: 'role-pp-prep', overflow: 'visible',
      });
      var divPrep = _htmlEl('div', {
        class: 'role-pp-prep-content', style: 'overflow:visible;', xmlns: XHTML_NS,
      });
      var prepLabel = _htmlEl('span', { class: 'role-pp-label' });
      prepLabel.textContent = (plAdv && plAdv.diagonalLabel) ? plAdv.diagonalLabel : '';
      divPrep.appendChild(prepLabel);
      foPrep.appendChild(divPrep);
      slotLayer.appendChild(foPrep);
    }

    var nf = gAdv.npFrame;
    if (nf) {
      var foNP = _svgEl('foreignObject', {
        x: nf.x, y: nf.y, width: nf.width, height: nf.height,
        class: 'role-pp-np', overflow: 'visible',
      });
      var divNP = _htmlEl('div', {
        class: 'role-pp-np-content', style: 'overflow:visible;', xmlns: XHTML_NS,
      });
      var npContent;
      if (plAdv && plAdv.displayMode === 'FLAT_WRAP' && plAdv.textWrapBlock) {
        npContent = _renderFlatWrap(plAdv.textWrapBlock, opts);
      } else {
        npContent = _renderComposite(plAdv ? plAdv.headTokens : null, opts);
      }
      divNP.appendChild(npContent);
      foNP.appendChild(divNP);
      slotLayer.appendChild(foNP);
    }
  }

  function _renderADVAdv(gAdv, plAdv, connLayer, slotLayer, opts) {
    _renderAdvLBracket(gAdv, 'role-adverbial-bracket role-adverbial-adv', connLayer, opts);

    var f = gAdv.frame;
    if (!f) return;
    var fo = _svgEl('foreignObject', {
      x: f.x, y: f.y, width: f.width, height: f.height,
      class: 'role-adverbial role-adv-adv', overflow: 'visible',
    });
    var div = _htmlEl('div', { class: 'role-adv-content', style: 'overflow:visible;', xmlns: XHTML_NS });
    var contentEl;
    if (plAdv && plAdv.displayMode === 'FLAT_WRAP' && plAdv.textWrapBlock) {
      contentEl = _renderFlatWrap(plAdv.textWrapBlock, opts);
    } else {
      contentEl = _renderComposite(plAdv ? plAdv.headTokens : null, opts);
    }
    div.appendChild(contentEl);
    fo.appendChild(div);
    slotLayer.appendChild(fo);
  }

  function _renderClauseAdv(gAdv, plAdv, connLayer, slotLayer, opts) {
    var cls = gAdv.phraseType === 'PARTICIPLE'
      ? 'role-adverbial-bracket role-adverbial-participle'
      : 'role-adverbial-bracket role-adverbial-clause';
    _renderAdvLBracket(gAdv, cls, connLayer, opts);

    // Phase 5-1-B: conjunction label — coordinates supplied by GL, no recalculation here.
    var pf = gAdv.prepFrame;
    if (pf && plAdv && plAdv.diagonalLabel) {
      var df = gAdv.diagonalFrom;
      var dt = gAdv.diagonalTo;
      if (df && dt) {
        var dPath = 'M ' + df.x + ' ' + df.y + ' L ' + dt.x + ' ' + dt.y;
        connLayer.appendChild(_svgPath(dPath, 'role-clause-diagonal', opts.strokeSub, 1, '4 3'));
      }
      var fo = _svgEl('foreignObject', {
        x: pf.x, y: pf.y, width: pf.width, height: pf.height,
        class: 'role-clause-conj', overflow: 'visible',
      });
      var div = _htmlEl('div', {
        class: 'role-clause-conj-content', style: 'overflow:visible;', xmlns: XHTML_NS,
      });
      var span = _htmlEl('span', { class: 'role-clause-label' });
      span.textContent = plAdv.diagonalLabel;
      div.appendChild(span);
      fo.appendChild(div);
      slotLayer.appendChild(fo);
    }

    if (gAdv.innerDiagram) {
      var innerPLRoot = (plAdv && plAdv.innerPageLayout) ? plAdv.innerPageLayout.root : null;
      _renderGRootNode(gAdv.innerDiagram, innerPLRoot, connLayer, slotLayer, opts);
    }
  }

  function _renderAdverbials(gAdvPhrases, plAdvPhrases, connLayer, slotLayer, opts) {
    var gAdvs  = gAdvPhrases  || [];
    var plAdvs = plAdvPhrases || [];
    for (var ai = 0; ai < gAdvs.length; ai++) {
      var gAdv  = gAdvs[ai];
      var plAdv = plAdvs[ai] || null;
      var pt    = gAdv.phraseType;
      if (!pt) continue;
      if (pt === 'PP') {
        _renderPPAdv(gAdv, plAdv, connLayer, slotLayer, opts);
      } else if (pt === 'ADV') {
        _renderADVAdv(gAdv, plAdv, connLayer, slotLayer, opts);
      } else if (pt === 'CLAUSE' || pt === 'PARTICIPLE') {
        _renderClauseAdv(gAdv, plAdv, connLayer, slotLayer, opts);
      } else {
        // Unknown phraseType: render L-bracket + best-effort content (no throw)
        _renderAdvLBracket(gAdv, 'role-adverbial-bracket', connLayer, opts);
        var uf = gAdv.frame;
        if (uf) {
          var ufo = _svgEl('foreignObject', {
            x: uf.x, y: uf.y, width: uf.width, height: uf.height,
            class: 'role-adverbial', overflow: 'visible',
          });
          var udiv = _htmlEl('div', { class: 'role-adv-content', style: 'overflow:visible;', xmlns: XHTML_NS });
          udiv.appendChild(_renderComposite(plAdv ? plAdv.headTokens : null, opts));
          ufo.appendChild(udiv);
          slotLayer.appendChild(ufo);
        }
      }
    }
  }

  // ── Coordination renderer ──────────────────────────────────────────────
  //
  // Renders GCoordStackNode: R9 vertical connectors, R10 ticks,
  // conjunction labels, and recursive clause rendering.
  //
  // parentGlRoot: the enclosing GRootNode — supplies parentGlRoot.baseline.y
  //               for the R9 connector top-anchor.
  //
  // GL / PL clause matching: glStack.clauses[i] ↔ plStack.clauses[i] by index.

  function _renderCoordStack(glStack, plStack, parentGlRoot, connLayer, slotLayer, opts) {
    if (!glStack || !Array.isArray(glStack.clauses)) return;
    var gClauses  = glStack.clauses;
    var pClauses  = (plStack && plStack.clauses) || [];
    var parentBaselineY = (parentGlRoot && parentGlRoot.baseline) ? parentGlRoot.baseline.y : 0;
    var tickLen   = (opts.coordTickLength !== undefined) ? opts.coordTickLength : 8;
    var labelGap  = (opts.coordLabelGap  !== undefined) ? opts.coordLabelGap  : 2;

    for (var ci = 0; ci < gClauses.length; ci++) {
      var cc   = gClauses[ci];
      var ccPL = pClauses[ci] || null;
      if (!cc || !cc.innerRoot) continue;

      var fx = cc.innerRoot.frame.x;
      var fy = cc.innerRoot.frame.y;

      // R9 — vertical connector from parent baseline down to clause frame top
      var dConn = 'M ' + fx + ' ' + parentBaselineY + ' L ' + fx + ' ' + fy;
      connLayer.appendChild(_svgPath(dConn, 'role-coord-connector', opts.strokeSub, 1, null));

      // R10 — horizontal tick at clause baseline
      var bly = cc.innerRoot.baseline ? cc.innerRoot.baseline.y : fy;
      var dTick = 'M ' + fx + ' ' + bly + ' H ' + (fx + tickLen);
      connLayer.appendChild(_svgPath(dTick, 'role-coord-tick', opts.strokeSub, 1, null));

      // Conjunction label (SVG <text>)
      if (cc.conjunction) {
        var labelX = fx + tickLen + labelGap;
        var labelY = bly;
        var labelEl = _svgEl('text', {
          class:            'role-coord-label',
          x:                labelX,
          y:                labelY,
          'dominant-baseline': 'auto',
          fill:             opts.strokeSub,
        });
        labelEl.textContent = cc.conjunction;
        slotLayer.appendChild(labelEl);
      }

      // Recursive clause rendering — reuses full _renderGRootNode
      var ccInnerPL = (ccPL && ccPL.innerRoot) ? ccPL.innerRoot : null;
      _renderGRootNode(cc.innerRoot, ccInnerPL, connLayer, slotLayer, opts);
    }
  }

  // ── GRootNode recursive renderer ───────────────────────────────────────
  //
  // glRoot: GRootNode (WHERE — absolute pixel coordinates)
  // plRoot: PLRootNode (WHAT — content, tokens, text)
  //
  // GL / PL slot matching: glRoot.slots[i] ↔ plRoot.baselineRow.slots[i]
  // This invariant holds because Phase 1→2→3 preserve slot order.
  //
  // Phase 4-4-A: modifier connectors + adverbial L-brackets / PP diagonals.
  // Phase 4-4-B: coordStack — GCoordStackNode / GCoordClauseNode.
  // Phase 4-5: relClauses rendered via _renderRelClauses (top-level, not here).

  function _renderGRootNode(glRoot, plRoot, connLayer, slotLayer, opts) {
    if (!glRoot) return;

    // 1. Baseline — structural line the diagram hangs from
    _renderBaseline(glRoot.baseline, connLayer, opts);

    // 2. Core connectors: sp, po, complement, implied, contentClause
    _renderConnectors(glRoot.connectors, connLayer, opts);

    // 3. Raised slot stalks + content: IO, AUX
    var raised        = glRoot.raised || [];
    var plRaisedSlots = (plRoot && plRoot.raisedZone && plRoot.raisedZone.slots) || [];
    for (var ri = 0; ri < raised.length; ri++) {
      _renderRaisedStem(raised[ri], connLayer, opts);
      _renderRaisedContent(raised[ri], plRaisedSlots[ri] || null, slotLayer, opts);
      var raisedGMods  = (raised[ri].modifiers) || [];
      var raisedPLMods = ((plRaisedSlots[ri] || {}).modifiers) || [];
      for (var rmi = 0; rmi < raisedGMods.length; rmi++) {
        _renderOneModifier(raisedGMods[rmi], raisedPLMods[rmi] || null, connLayer, slotLayer, opts);
      }
    }

    // 4. Baseline slots: GL frame → foreignObject position, PL slot → content
    var plSlots = (plRoot && plRoot.baselineRow && plRoot.baselineRow.slots) || [];
    var glSlots = glRoot.slots || [];

    for (var si = 0; si < glSlots.length; si++) {
      var gSlot  = glSlots[si];
      var plSlot = plSlots[si] || null;

      _renderSlot(gSlot, plSlot, slotLayer, opts);

      // 5. ContentClause inner diagram (Phase 3-2 / recursive)
      //    GSlotNode.innerDiagram is a full GRootNode at absolute coordinates.
      //    PLSlotLayout.innerPageLayout.root is the matching PLRootNode.
      if (gSlot.innerDiagram && plSlot && plSlot.innerPageLayout) {
        _renderGRootNode(
          gSlot.innerDiagram,
          plSlot.innerPageLayout.root,
          connLayer,
          slotLayer,
          opts
        );
      }
    }

    // 6. Phase 4-4-A: Modifier connectors and content
    _renderModifiers(glRoot.modifiers, plSlots, connLayer, slotLayer, opts);

    // 7. Phase 4-4-A: Adverbial L-brackets, PP diagonals, and content
    var plAdvPhrases = (plRoot && plRoot.advZone && plRoot.advZone.phrases) || [];
    _renderAdverbials(glRoot.adverbials, plAdvPhrases, connLayer, slotLayer, opts);

    // 8. Phase 4-4-B: Coordination clause stack
    var plCoordStack = (plRoot && plRoot.coordStack) ? plRoot.coordStack : null;
    _renderCoordStack(glRoot.coordStack, plCoordStack, glRoot, connLayer, slotLayer, opts);

  }

  // ── Relative Clause renderer ───────────────────────────────────────────
  //
  // GRelClauseNode: { type, antecedentRef, antecedentSi, frame, innerDiagram }
  //   innerDiagram is a full GRootNode at ROOT-relative absolute coordinates.
  //
  // GL / PL mapping: glRelClauses[i] ↔ plRelClauses[i] by array index.
  // PL accessor: plRC.innerPageLayout.root → PLRootNode.
  //
  // Reuses _renderGRootNode — same full rendering as main root.
  // No geometry calculation; all coordinates supplied by GL.

  function _renderRelClauses(glRelClauses, plRelClauses, connLayer, slotLayer, opts) {
    if (!Array.isArray(glRelClauses)) return;
    var plRCs = Array.isArray(plRelClauses) ? plRelClauses : [];

    for (var i = 0; i < glRelClauses.length; i++) {
      var gRC = glRelClauses[i];
      if (!gRC) continue;
      if (!gRC.innerDiagram) continue;

      var plRC    = plRCs[i] || null;
      var plRoot  = (plRC && plRC.innerPageLayout && plRC.innerPageLayout.root)
                    ? plRC.innerPageLayout.root
                    : null;

      _renderGRootNode(gRC.innerDiagram, plRoot, connLayer, slotLayer, opts);
    }
  }

  // ── Antecedent Link renderer ───────────────────────────────────────────
  //
  // GAntecedentLink: { type, relClauseIndex, antecedentRef, antecedentSi,
  //                    antecedentAnchor: {x,y}|null, relClauseAnchor: {x,y} }
  //
  // Path per GL spec: M antX antY L antX rcY L rcX rcY
  //   antecedentAnchor → vertical → horizontal → relClauseAnchor
  //
  // antecedentAnchor === null: skip silently (antecedent slot not resolved by GL).
  // No coordinate calculation; all values read directly from GL.

  function _renderAntecedentLinks(glLinks, linkLayer, opts) {
    if (!Array.isArray(glLinks)) return;

    for (var i = 0; i < glLinks.length; i++) {
      var link = glLinks[i];
      if (!link) continue;
      if (!link.antecedentAnchor) continue;   // GL null = no resolved slot; skip
      if (!link.relClauseAnchor)  continue;

      var antX = link.antecedentAnchor.x;
      var antY = link.antecedentAnchor.y;
      var rcX  = link.relClauseAnchor.x;
      var rcY  = link.relClauseAnchor.y;

      var d = 'M ' + antX + ' ' + antY +
              ' L ' + antX + ' ' + rcY  +
              ' L ' + rcX  + ' ' + rcY;

      linkLayer.appendChild(
        _svgPath(d, 'role-antecedent-link', opts.strokeDomain, 1.5, '4 3')
      );
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * createRoleDiagramSvg(gl, pl, options?)
   *
   * Converts (RoleGeometryLayout, RolePageLayout) into a single SVGElement.
   *
   * @param {RoleGeometryLayout} gl  — coordinates, frames, connector paths
   * @param {RolePageLayout}     pl  — content: headTokens, textWrapBlock, etc.
   * @param {object}            [options]
   *   options.tokenMap     { [ref]: { text, japanese, morph, ref, lemma } }
   *   options.onTokenClick (ref, tokenData) => void
   *
   * @returns {SVGElement}
   *   The caller is responsible for appending the returned SVG to the DOM.
   *   This function never appends to document.body or any external element.
   *
   * @throws {Error} if gl or pl are null/undefined
   * @throws {Error} if DOM environment (document) is unavailable
   */
  function createRoleDiagramSvg(gl, pl, options) {
    if (!gl) throw new Error('RoleRenderer.createRoleDiagramSvg: gl (RoleGeometryLayout) is required');
    if (!pl) throw new Error('RoleRenderer.createRoleDiagramSvg: pl (RolePageLayout) is required');

    var doc = _doc();
    if (!doc) {
      throw new Error(
        'RoleRenderer.createRoleDiagramSvg: DOM unavailable. ' +
        'In browser: document must be present. ' +
        'In tests: inject fakeWindow.document before loading this module.'
      );
    }

    var opts = Object.assign({}, DEFAULT_RENDER_OPTIONS, options || {});

    var w = Number.isFinite(gl.width)  ? gl.width  : 0;
    var h = Number.isFinite(gl.height) ? gl.height : 0;

    // ── SVG root ──────────────────────────────────────────────────────────
    // Fixed-geometry canvas: width/height in px.
    // Caller's container uses overflow-x:auto for horizontal scroll.
    // width="100%" is prohibited (see architecture decision G).
    var svg = _svgEl('svg', {
      class:               'role-diagram-svg',
      width:               w,
      height:              h,
      viewBox:             '0 0 ' + w + ' ' + h,
      'aria-label':        '文の役割 構造ダイアグラム',
      role:                'img',
      'data-role-version': '4-3',
    });

    // ── Layer structure ───────────────────────────────────────────────────
    // SVG paint order: first child = lowest z-order.
    //   connLayer (z=0): baselines, connectors, brackets, coord connectors
    //   slotLayer (z=1): foreignObjects — slot content, modifiers, adv content
    //   linkLayer (z=2): antecedent links — rendered above FO content (Phase 4-5)
    var connLayer = _svgEl('g', {
      class:        'role-layer-connectors',
      'aria-hidden': 'true',
    });
    var slotLayer = _svgEl('g', {
      class: 'role-layer-slots',
    });
    var linkLayer = _svgEl('g', {
      class:        'role-layer-links',
      'aria-hidden': 'true',
    });

    svg.appendChild(connLayer);
    svg.appendChild(slotLayer);
    svg.appendChild(linkLayer);

    // ── Render root diagram ───────────────────────────────────────────────
    _renderGRootNode(
      gl.root,
      pl.root || null,
      connLayer,
      slotLayer,
      opts
    );

    // ── Phase 4-5-B: Relative Clause diagrams ────────────────────────────
    // Each GRelClauseNode.innerDiagram is a full GRootNode at absolute coords.
    // Rendered using existing _renderGRootNode — no new geometry logic.
    _renderRelClauses(
      gl.relClauses || [],
      pl.relClauses || [],
      connLayer,
      slotLayer,
      opts
    );

    // ── Phase 4-5-C: Antecedent → Relative Clause links ──────────────────
    // L-shaped paths: antecedentAnchor → vertical → horizontal → relClauseAnchor.
    // All coordinates from GL; null antecedentAnchor entries are skipped.
    _renderAntecedentLinks(
      gl.antecedentLinks || [],
      linkLayer,
      opts
    );

    return svg;
  }

  // ── Module export ──────────────────────────────────────────────────────

  global.RoleRenderer = {
    createRoleDiagramSvg:   createRoleDiagramSvg,
    DEFAULT_RENDER_OPTIONS: DEFAULT_RENDER_OPTIONS,
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
