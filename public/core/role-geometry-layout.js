/**
 * role-geometry-layout.js  RK-ARCH-04 Phase 3-1 / 3-2 / 3-3 / 3-4 / 3-5
 *
 * Converts Role Page Layout into Role Geometry Layout:
 * pure coordinate data (frames, anchors, connector paths) for the diagram.
 *
 * Pipeline:
 *   buildRolePageLayout()        (Phase 2)
 *    → buildRoleGeometryLayout() ← this module (Phase 3)
 *    → SVG Renderer              (Phase 4)
 *
 * Phase 3-1 (complete):
 *   - Root frame + baseline geometry
 *   - Baseline slot frames and anchors (all displayModes)
 *   - Connectors: sp, po, complement, implied
 *   - Raised slots: IO and AUX (GRaisedNode with stemFrom/stemTo)
 *
 * Phase 3-2 (complete):
 *   - ContentClause placeholder slot (lineHeightPx height, placeholder width)
 *   - ContentClause inner diagram (recursive, absolute coordinates)
 *   - contentFrame / innerDiagram on GSlotNode
 *   - contentClause connector (placeholder bottom → inner diagram top)
 *   - Root frame height propagation through nested diagrams
 *
 * Phase 3-3 (complete):
 *   - Modifier zone (GModifierZoneNode)
 *   - Per-slot modifier entries (GModifierEntry)
 *   - Modifier node frames, L-bracket geometry (GModifierNode)
 *   - TextWrapBlock frame for FLAT_WRAP modifiers
 *   - Root height propagation includes modifier zone
 *
 * Phase 3-4 (complete):
 *   - Adverbial zone (GAdvPhraseNode[])
 *   - PP geometry: prepFrame + npFrame + diagonalFrom/To
 *   - ADV geometry: simple content frame
 *   - CLAUSE / PARTICIPLE: recursive innerDiagram (GRootNode)
 *   - Multi-adverbial vertical stacking with zoneGapPx gaps
 *   - Root width/height propagation includes adverbial zone
 *
 * Phase 3-5 (complete):
 *   - Coordination geometry (GCoordStackNode / GCoordClauseNode)
 *   - Coord clauses stacked vertically below adverbials
 *   - Each coord clause: full recursive GRootNode (innerRoot)
 *   - Relative Clause geometry (GRelClauseNode)
 *   - Antecedent link coordinates (GAntecedentLink)
 *   - Antecedent slot lookup: _findSlotBySi (slots / CC / coordStack / adv)
 *   - Root width/height includes coordStack; RoleGeometryLayout includes relClauses
 *
 * Coordinate system:
 *   Origin = top-left of diagram bounding box = (0, 0)
 *   +X = right, +Y = down
 *   All coordinates are ROOT-relative absolute pixels (no local/parent-relative coords in output).
 *
 * Exports: window.RoleGeometryLayout = { buildRoleGeometryLayout, DEFAULT_GEOMETRY_PARAMS }
 */
(function (global) {
  'use strict';

  // ── Default geometry parameters ────────────────────────────────────────

  const DEFAULT_GEOMETRY_PARAMS = {
    charWidth:      8,   // px per logical width unit  (estimatedWidth  × charWidth  = px)
    lineHeightPx:   24,  // px per logical height unit (estimatedHeight × lineHeightPx = px)
    connectorGapPx: 8,   // px width occupied by a semantic connector divider
    paddingX:       4,   // px horizontal padding inside diagram frame
    paddingY:       4,   // px vertical padding (reserved)
    zoneGapPx:      8,   // px gap between zones
    // Phase 3-2: ContentClause placeholder width on the baseline.
    // The inner layout width must NOT be used for the baseline slot.
    contentClausePlaceholderWidthPx: 16,
    // Phase 3-4: Adverbial zone geometry.
    // advIndentPx:       horizontal indent of adv content from the bracket anchor X.
    //                    Replaces the CSS `dg-adv-list { padding-left: 1.5rem }` (24px).
    // ppDiagonalOffsetPx: horizontal offset of the PP NP frame from the bracket anchor X.
    //                    Determines how far right the NP sits relative to advX.
    advIndentPx:        24,
    ppDiagonalOffsetPx: 16,
  };

  function _mergeParams(params) {
    if (!params) return DEFAULT_GEOMETRY_PARAMS;
    return Object.assign({}, DEFAULT_GEOMETRY_PARAMS, params);
  }

  // ── Guard helpers ──────────────────────────────────────────────────────

  function _fin(v) {
    return Number.isFinite(v) ? v : 0;
  }

  function _frame(x, y, w, h) {
    return {
      x:      _fin(Math.max(0, x)),
      y:      _fin(Math.max(0, y)),
      width:  _fin(Math.max(0, w)),
      height: _fin(Math.max(0, h)),
    };
  }

  function _pt(x, y) {
    return { x: _fin(x), y: _fin(y) };
  }

  // ── Slot dimension helpers ─────────────────────────────────────────────

  function _slotWidthPx(slotPL, params) {
    if (slotPL.displayMode === 'CONTENT_CLAUSE') {
      const labelMinPx = (slotPL.fnLabelMinWidth || 0) * params.charWidth;
      return Math.max(params.contentClausePlaceholderWidthPx, labelMinPx);
    }
    return slotPL.estimatedWidth * params.charWidth;
  }

  function _slotHeightPx(slotPL, params) {
    if (slotPL.displayMode === 'CONTENT_CLAUSE') {
      return params.lineHeightPx;
    }
    return Math.max(params.lineHeightPx, slotPL.estimatedHeight * params.lineHeightPx);
  }

  // ── Phase 3-4: AdvPhrase geometry helpers ──────────────────────────────

  function _buildPPAdvGeometry(advPL, advX, advY, params, bracketAnchorX, bracketTopY) {
    const { charWidth, lineHeightPx, ppDiagonalOffsetPx } = params;

    const prepLabel = advPL.diagonalLabel || '';
    const prepW = _fin(Math.max(charWidth * 2, prepLabel.length * charWidth));
    const prepH = lineHeightPx;

    const npW = _fin(Math.max(charWidth * 2, advPL.estimatedWidth * charWidth));
    const npH = _fin(Math.max(lineHeightPx, advPL.estimatedHeight * lineHeightPx));

    const npX = _fin(advX + ppDiagonalOffsetPx);
    const npY = _fin(advY + prepH);

    const prepFrame = _frame(advX, advY, prepW, prepH);
    const npFrame   = _frame(npX,  npY,  npW,  npH);

    const diagonalFrom = _pt(advX + prepW, advY);
    const diagonalTo   = _pt(npX, npY);

    let textWrapFrame = null;
    if (advPL.displayMode === 'FLAT_WRAP' && advPL.textWrapBlock) {
      const twb = advPL.textWrapBlock;
      textWrapFrame = _frame(
        npX, npY,
        _fin(Math.max(0, twb.estimatedWidth  * charWidth)),
        _fin(Math.max(0, twb.estimatedHeight * lineHeightPx))
      );
    }

    const totalW = _fin(Math.max(prepW, npX - advX + npW));
    const totalH = _fin(prepH + npH);

    return {
      type:           'GAdvPhraseNode',
      phraseType:     'PP',
      frame:          _frame(advX, advY, totalW, totalH),
      bracketAnchorX: _fin(bracketAnchorX),
      bracketTopY:    _fin(bracketTopY),
      prepFrame,
      npFrame,
      diagonalFrom,
      diagonalTo,
      textWrapFrame,
      innerDiagram: null,
    };
  }

  function _buildADVAdvGeometry(advPL, advX, advY, params, bracketAnchorX, bracketTopY) {
    const { charWidth, lineHeightPx } = params;

    const advW = _fin(Math.max(charWidth * 2, advPL.estimatedWidth * charWidth));
    const advH = _fin(Math.max(lineHeightPx, advPL.estimatedHeight * lineHeightPx));

    let textWrapFrame = null;
    if (advPL.displayMode === 'FLAT_WRAP' && advPL.textWrapBlock) {
      const twb = advPL.textWrapBlock;
      textWrapFrame = _frame(
        advX, advY,
        _fin(Math.max(0, twb.estimatedWidth  * charWidth)),
        _fin(Math.max(0, twb.estimatedHeight * lineHeightPx))
      );
    }

    return {
      type:           'GAdvPhraseNode',
      phraseType:     'ADV',
      frame:          _frame(advX, advY, advW, advH),
      bracketAnchorX: _fin(bracketAnchorX),
      bracketTopY:    _fin(bracketTopY),
      prepFrame:    null,
      npFrame:      null,
      diagonalFrom: null,
      diagonalTo:   null,
      textWrapFrame,
      innerDiagram: null,
    };
  }

  // ── Phase 3-5: Antecedent slot lookup ─────────────────────────────────
  //
  // Finds the GSlotNode whose .si matches targetSi, searching:
  //   1. gRoot.slots (direct baseline slots)
  //   2. ContentClause inner diagrams (slot.innerDiagram)
  //   3. CoordStack inner roots (gRoot.coordStack.clauses[].innerRoot)
  //   4. Adverbial inner diagrams (gRoot.adverbials[].innerDiagram)
  //
  // Returns the first matching GSlotNode, or null if not found.
  // Never throws; depth guard prevents runaway recursion.

  function _findSlotBySi(gRoot, targetSi, depth) {
    if (!gRoot || depth > 10) return null;
    if (typeof targetSi !== 'number') return null;

    // 1. Direct baseline slots
    for (const slot of (gRoot.slots || [])) {
      if (slot.si === targetSi) return slot;
      // 2. ContentClause inner diagrams
      if (slot.innerDiagram) {
        const found = _findSlotBySi(slot.innerDiagram, targetSi, depth + 1);
        if (found) return found;
      }
    }

    // 3. CoordStack inner diagrams
    const coordClauses = (gRoot.coordStack && gRoot.coordStack.clauses) || [];
    for (const cc of coordClauses) {
      if (cc.innerRoot) {
        const found = _findSlotBySi(cc.innerRoot, targetSi, depth + 1);
        if (found) return found;
      }
    }

    // 4. Adverbial inner diagrams
    for (const adv of (gRoot.adverbials || [])) {
      if (adv.innerDiagram) {
        const found = _findSlotBySi(adv.innerDiagram, targetSi, depth + 1);
        if (found) return found;
      }
    }

    return null;
  }

  // ── GRootNode builder ──────────────────────────────────────────────────

  /**
   * Build a GRootNode from a PLRootNode.
   *
   * offsetX / offsetY: ROOT-relative absolute origin of this diagram.
   * - Root-level call: (0, 0)
   * - Recursive calls (ContentClause, CLAUSE/PARTICIPLE adv, coord clause inner diagrams):
   *   absolute position supplied by the caller.
   *
   * All coordinates in the returned GRootNode are ROOT-relative absolute pixels.
   */
  function _buildGRootNode(plRoot, params, offsetX, offsetY) {
    const { charWidth, lineHeightPx, connectorGapPx, paddingX, zoneGapPx } = params;

    // ── 1. Raised zone height (px) ─────────────────────────────────────
    const raisedZone    = plRoot.raisedZone || { estimatedHeight: 0, slots: [] };
    const raisedZoneHPx = raisedZone.estimatedHeight * lineHeightPx;

    // ── 2. Baseline row height (px) ────────────────────────────────────
    // INVARIANT: ContentClause slots contribute lineHeightPx (placeholder),
    // NOT their inner layout height.
    const baselineRow = plRoot.baselineRow || { slots: [], totalEstimatedWidth: 0, estimatedHeight: 0 };
    const slots       = baselineRow.slots || [];

    const baselineRowHPx = slots.length > 0
      ? Math.max(...slots.map(s => _slotHeightPx(s, params)))
      : lineHeightPx;

    // ── 3. Baseline Y ──────────────────────────────────────────────────
    const baselineY = offsetY + raisedZoneHPx + baselineRowHPx;

    // ── 4. Baseline slots ──────────────────────────────────────────────
    let curX = offsetX + paddingX;
    const gSlots = [];
    let spConnectorX = null;

    for (const slotPL of slots) {
      if (slotPL.semanticConnector !== null) curX += connectorGapPx;

      const slotW = _slotWidthPx(slotPL, params);
      const slotH = _slotHeightPx(slotPL, params);
      const slotX = curX;
      const slotY = baselineY - slotH;

      gSlots.push({
        type:        'GSlotNode',
        fn:          slotPL.fn,
        si:          slotPL.si,
        displayMode: slotPL.displayMode,
        frame: _frame(slotX, slotY, slotW, slotH),
        anchors: {
          left:     _fin(slotX),
          right:    _fin(slotX + slotW),
          top:      _fin(slotY),
          bottom:   _fin(baselineY),
          centerX:  _fin(slotX + slotW / 2),
          centerY:  _fin(slotY + slotH / 2),
          baseline: _fin(baselineY),
        },
        contentFrame:    null,
        innerDiagram:    null,
        textWrapFrame:   null,
        modifierAnchorX: _fin(slotX + slotW / 2),
      });

      curX += slotW;
    }

    // ── 5. Connector geometry (sp / po / complement / implied) ─────────
    const gConnectors = [];

    for (let i = 0; i < slots.length; i++) {
      const slotPL   = slots[i];
      const gSlot    = gSlots[i];
      const connType = slotPL.semanticConnector;
      if (!connType) continue;

      const connX = _fin(gSlot.anchors.left - connectorGapPx / 2);

      if (connType === 'sp') {
        spConnectorX = connX;
        gConnectors.push({
          type: 'sp',
          from: _pt(connX, offsetY + raisedZoneHPx),
          to:   _pt(connX, baselineY),
          dash: null,
        });
      } else if (connType === 'po') {
        gConnectors.push({
          type: 'po',
          from: _pt(connX, baselineY - lineHeightPx),
          to:   _pt(connX, baselineY),
          dash: null,
        });
      } else if (connType === 'complement' || connType === 'implied') {
        const prevSlot = i > 0 ? gSlots[i - 1] : null;
        if (prevSlot) {
          gConnectors.push({
            type: connType,
            from: _pt(prevSlot.anchors.right, prevSlot.anchors.bottom),
            to:   _pt(gSlot.anchors.left,     gSlot.anchors.top),
            dash: connType === 'implied' ? '4 3' : null,
          });
        }
      }
    }

    // ── 6. Raised slot geometry (IO, AUX) ──────────────────────────────
    // Phase 5-1-A-G1: raisedCursorRight tracks the right edge (+ zoneGapPx) of
    // the last placed raised frame. When a slot's natural position overlaps a
    // previous slot, it is shifted rightward (horizontal stacking). raisedY and
    // raisedZoneHPx are never changed, so baseline geometry is unaffected.
    const gRaised = [];
    let raisedCursorRight = null;

    for (const raisedPL of (raisedZone.slots || [])) {
      const rW = _fin(raisedPL.estimatedWidth  * charWidth);
      const rH = _fin(raisedPL.estimatedHeight * lineHeightPx);

      let attachX = offsetX + paddingX;

      if (raisedPL.attachmentPoint === 'SP_DIVIDER') {
        attachX = spConnectorX !== null ? spConnectorX
                : (gSlots[0] ? gSlots[0].anchors.centerX : offsetX + paddingX);
      } else if (raisedPL.attachmentPoint === 'SUBJECT') {
        const s = gSlots.find(g => g.fn === 'SUBJECT');
        attachX = s ? s.anchors.centerX : (offsetX + paddingX);
      } else if (raisedPL.attachmentPoint === 'PREDICATE') {
        const s = gSlots.find(g => g.fn === 'PREDICATE') ||
                  gSlots.find(g => g.fn === 'COPULA');
        attachX = s ? s.anchors.centerX : (offsetX + paddingX);
      }

      // Natural left edge, centered on attachment point.
      const naturalX = attachX - rW / 2;

      // Collision avoidance: shift right only when this slot overlaps the previous.
      const actualX = (raisedCursorRight !== null && naturalX < raisedCursorRight)
        ? raisedCursorRight
        : naturalX;

      const frameX    = _fin(Math.max(0, actualX));
      const raisedY   = offsetY;

      // stemX: use attachX for non-displaced slots (preserves existing geometry),
      // use frame center for displaced slots (stem must originate from platform center).
      const stemX     = (actualX !== naturalX) ? _fin(frameX + rW / 2) : _fin(attachX);
      const stemFromY = _fin(raisedY + rH);

      let stemToY;
      if (raisedPL.attachmentPoint === 'PREDICATE') {
        const pred = gSlots.find(g => g.fn === 'PREDICATE') ||
                     gSlots.find(g => g.fn === 'COPULA');
        stemToY = pred ? pred.anchors.top : (offsetY + raisedZoneHPx);
      } else if (raisedPL.attachmentPoint === 'SUBJECT') {
        const subj = gSlots.find(g => g.fn === 'SUBJECT');
        stemToY = subj ? subj.anchors.top : (offsetY + raisedZoneHPx);
      } else {
        stemToY = offsetY + raisedZoneHPx;
      }

      const raisedModCenterX = _fin(frameX + rW / 2);
      const raisedMods = [];
      if (raisedPL.modifiers && raisedPL.modifiers.length > 0) {
        let modY = stemFromY + zoneGapPx;
        for (const modPL of raisedPL.modifiers) {
          const modW = _fin(Math.max(0, modPL.estimatedWidth  * charWidth));
          const modH = _fin(Math.max(lineHeightPx, modPL.estimatedHeight * lineHeightPx));
          let textWrapFrame = null;
          if (modPL.displayMode === 'FLAT_WRAP' && modPL.textWrapBlock) {
            const twb = modPL.textWrapBlock;
            textWrapFrame = _frame(
              raisedModCenterX, modY,
              _fin(Math.max(0, twb.estimatedWidth  * charWidth)),
              _fin(Math.max(0, twb.estimatedHeight * lineHeightPx))
            );
          }
          raisedMods.push({
            type:        'GModifierNode',
            displayMode: modPL.displayMode,
            frame:       _frame(raisedModCenterX, modY, modW, modH),
            textWrapFrame,
            bracketFrom: _pt(raisedModCenterX, stemFromY),
            bracketTo:   _pt(raisedModCenterX, _fin(modY + modH / 2)),
          });
          modY += modH + zoneGapPx;
        }
      }

      gRaised.push({
        type:            'GRaisedNode',
        fn:              raisedPL.fn,
        attachmentPoint: raisedPL.attachmentPoint,
        frame:    _frame(frameX, raisedY, rW, rH),
        stemFrom: _pt(stemX, stemFromY),
        stemTo:   _pt(stemX, _fin(stemToY)),
        modifiers: raisedMods,
      });

      // Advance cursor: right edge of this frame + zone gap.
      raisedCursorRight = _fin(frameX + rW + zoneGapPx);
    }

    // ── 7. Phase 3-2: ContentClause inner diagram geometry ─────────────
    let maxContentBottom = baselineY;

    for (let i = 0; i < slots.length; i++) {
      const slotPL = slots[i];
      const gSlot  = gSlots[i];

      if (slotPL.displayMode !== 'CONTENT_CLAUSE') continue;
      if (!slotPL.innerPageLayout) continue;

      const innerX = gSlot.frame.x;
      const innerY = _fin(baselineY + zoneGapPx);

      const innerRoot = _buildGRootNode(slotPL.innerPageLayout.root, params, innerX, innerY);

      const innerBottom = _fin(innerY + innerRoot.frame.height);
      if (innerBottom > maxContentBottom) maxContentBottom = innerBottom;

      gSlot.contentFrame = innerRoot.frame;
      gSlot.innerDiagram = innerRoot;

      gConnectors.push({
        type: 'contentClause',
        from: _pt(gSlot.anchors.centerX, baselineY),
        to:   _pt(gSlot.anchors.centerX, innerY),
        dash: null,
      });
    }

    // ── 8. Phase 3-3: Modifier Zone Geometry ──────────────────────────
    const gModifierEntries = [];
    let modZoneTopY    = maxContentBottom;
    let modZoneActualH = 0;

    const hasModifiers = slots.some(s => s.modifiers && s.modifiers.length > 0);

    if (hasModifiers) {
      modZoneTopY = maxContentBottom + zoneGapPx;

      for (let i = 0; i < slots.length; i++) {
        const slotPL = slots[i];
        if (!slotPL.modifiers || slotPL.modifiers.length === 0) continue;

        const gSlot       = gSlots[i];
        const slotCenterX = _fin(gSlot.modifierAnchorX);
        const gMods       = [];
        let modY          = modZoneTopY;

        for (let mi = 0; mi < slotPL.modifiers.length; mi++) {
          const modPL = slotPL.modifiers[mi];
          const modW  = _fin(Math.max(0, modPL.estimatedWidth  * charWidth));
          const modH  = _fin(Math.max(lineHeightPx, modPL.estimatedHeight * lineHeightPx));
          const modX  = slotCenterX;

          let textWrapFrame = null;
          if (modPL.displayMode === 'FLAT_WRAP' && modPL.textWrapBlock) {
            const twb = modPL.textWrapBlock;
            textWrapFrame = _frame(
              modX, modY,
              _fin(Math.max(0, twb.estimatedWidth  * charWidth)),
              _fin(Math.max(0, twb.estimatedHeight * lineHeightPx))
            );
          }

          gMods.push({
            type:        'GModifierNode',
            displayMode: modPL.displayMode,
            frame:       _frame(modX, modY, modW, modH),
            textWrapFrame,
            bracketFrom: _pt(slotCenterX, baselineY),
            bracketTo:   _pt(modX, _fin(modY + modH / 2)),
          });

          modY += modH + zoneGapPx;
        }

        const entryBottom   = modY;
        const entryMaxRight = gMods.length > 0
          ? Math.max(...gMods.map(m => m.frame.x + m.frame.width))
          : slotCenterX;

        if (entryBottom > maxContentBottom) maxContentBottom = entryBottom;

        gModifierEntries.push({
          type:        'GModifierEntry',
          slotFn:      slotPL.fn,
          slotSi:      slotPL.si,
          slotCenterX: slotCenterX,
          frame: _frame(
            slotCenterX,
            modZoneTopY,
            Math.max(0, entryMaxRight - slotCenterX),
            Math.max(0, entryBottom   - modZoneTopY)
          ),
          modifiers: gMods,
        });
      }

      modZoneActualH = Math.max(0, maxContentBottom - modZoneTopY);
    }

    // ── 9. Phase 3-4: Adverbial Zone Geometry ─────────────────────────

    const gAdvPhrases = [];
    const advZone     = plRoot.advZone || { phrases: [] };
    const advPhrases  = advZone.phrases || [];

    if (advPhrases.length > 0) {
      const { advIndentPx } = params;
      const bracketAnchorX  = _fin(offsetX + paddingX);
      const bracketTopY     = _fin(baselineY);
      const advX            = _fin(offsetX + paddingX + advIndentPx);
      let advY              = maxContentBottom + zoneGapPx;

      for (const advPL of advPhrases) {
        let gAdv;

        if (advPL.phraseType === 'PP') {
          gAdv = _buildPPAdvGeometry(advPL, advX, advY, params, bracketAnchorX, bracketTopY);

        } else if (advPL.phraseType === 'ADV') {
          gAdv = _buildADVAdvGeometry(advPL, advX, advY, params, bracketAnchorX, bracketTopY);

        } else if (advPL.phraseType === 'CLAUSE' || advPL.phraseType === 'PARTICIPLE') {
          if (advPL.innerPageLayout) {
            // Phase 5-1-B: conjunction label geometry.
            // diagonalLabel (conjunction word) exists in PL; generate prepFrame /
            // diagonalFrom / diagonalTo so the renderer can draw it without
            // recalculating coordinates. When diagonalLabel is null, labelH=0
            // and innerY=advY, preserving byte-identical geometry for that case.
            const conjLabel = advPL.diagonalLabel || null;
            const labelH    = conjLabel ? lineHeightPx : 0;
            const conjW     = conjLabel
              ? _fin(Math.max(charWidth * 2, conjLabel.length * charWidth))
              : 0;
            const innerY    = _fin(advY + labelH);

            const innerRoot = _buildGRootNode(advPL.innerPageLayout.root, params, advX, innerY);

            // Parent frame spans label area (advY..advY+labelH) + inner clause.
            // Must NOT be innerRoot.frame directly — that starts at innerY, missing labelH.
            const totalW = _fin(Math.max(conjW, innerRoot.frame.width));
            const totalH = _fin(labelH + innerRoot.frame.height);

            gAdv = {
              type:           'GAdvPhraseNode',
              phraseType:     advPL.phraseType,
              frame:          _frame(advX, advY, totalW, totalH),
              bracketAnchorX: _fin(bracketAnchorX),
              bracketTopY:    _fin(bracketTopY),
              prepFrame:      conjLabel ? _frame(advX, advY, conjW, lineHeightPx) : null,
              npFrame:        null,
              diagonalFrom:   conjLabel ? _pt(_fin(advX + conjW), _fin(advY))   : null,
              diagonalTo:     conjLabel ? _pt(_fin(advX),         _fin(innerY)) : null,
              textWrapFrame:  null,
              innerDiagram:   innerRoot,
            };
          } else {
            const advW = _fin(Math.max(charWidth * 2, advPL.estimatedWidth * charWidth));
            const advH = _fin(Math.max(lineHeightPx,  advPL.estimatedHeight * lineHeightPx));
            gAdv = {
              type:           'GAdvPhraseNode',
              phraseType:     advPL.phraseType,
              frame:          _frame(advX, advY, advW, advH),
              bracketAnchorX: _fin(bracketAnchorX),
              bracketTopY:    _fin(bracketTopY),
              prepFrame:      null,
              npFrame:        null,
              diagonalFrom:   null,
              diagonalTo:     null,
              textWrapFrame:  null,
              innerDiagram:   null,
            };
          }

        } else {
          const advW = _fin(Math.max(charWidth * 2, advPL.estimatedWidth * charWidth));
          const advH = _fin(Math.max(lineHeightPx,  advPL.estimatedHeight * lineHeightPx));
          gAdv = {
            type:           'GAdvPhraseNode',
            phraseType:     advPL.phraseType || 'UNKNOWN',
            frame:          _frame(advX, advY, advW, advH),
            bracketAnchorX: _fin(bracketAnchorX),
            bracketTopY:    _fin(bracketTopY),
            prepFrame:      null,
            npFrame:        null,
            diagonalFrom:   null,
            diagonalTo:     null,
            textWrapFrame:  null,
            innerDiagram:   null,
          };
        }

        const advBottom = _fin(gAdv.frame.y + gAdv.frame.height);
        if (advBottom > maxContentBottom) maxContentBottom = advBottom;

        gAdvPhrases.push(gAdv);
        advY = advBottom + zoneGapPx;
      }
    }

    // ── 10. Phase 3-5: Coordination Zone Geometry ──────────────────────
    //
    // Coord clauses are vertically stacked below adverbials:
    //   coordZoneTopY = maxContentBottom + zoneGapPx   (when clauses exist)
    //
    // Each coord clause is a full GRootNode at (offsetX, coordY),
    // horizontally aligned with the parent diagram (same left origin).
    //
    // Phase 2 contract (PLCoordClauseLayout):
    //   ccPL.conjunction  = string | null
    //   ccPL.innerRoot    = PLRootNode  (from _layoutStructuralRoot)

    const gCoordClauses = [];
    const plCoordStack   = plRoot.coordStack || { clauses: [] };
    const coordClausePLs = plCoordStack.clauses || [];

    let coordZoneTopY    = maxContentBottom;
    let coordZoneActualH = 0;

    if (coordClausePLs.length > 0) {
      coordZoneTopY = maxContentBottom + zoneGapPx;
      let coordY   = coordZoneTopY;

      for (const ccPL of coordClausePLs) {
        // Build inner GRootNode at absolute (offsetX, coordY).
        // Using offsetX (not offsetX+paddingX) so coord clauses align
        // horizontally with the parent diagram's left edge.
        const innerRoot = _buildGRootNode(ccPL.innerRoot, params, offsetX, coordY);
        const ccBottom  = _fin(innerRoot.frame.y + innerRoot.frame.height);

        gCoordClauses.push({
          type:        'GCoordClauseNode',
          conjunction: ccPL.conjunction,
          frame:       innerRoot.frame,
          innerRoot,
        });

        if (ccBottom > maxContentBottom) maxContentBottom = ccBottom;
        coordY = ccBottom + zoneGapPx;
      }

      coordZoneActualH = Math.max(0, maxContentBottom - coordZoneTopY);
    }

    // ── 11. Root frame ─────────────────────────────────────────────────
    // Width: rightmost edge of all content + right paddingX.
    const rightEdges = [
      offsetX + paddingX,
      ...gSlots.map(s  => s.anchors.right),
      ...gRaised.map(r => r.frame.x + r.frame.width),
      // Phase 3-2: ContentClause inner diagrams
      ...gSlots.filter(s => s.innerDiagram)
               .map(s => s.innerDiagram.frame.x + s.innerDiagram.frame.width),
      // Phase 3-3: modifier right edges
      ...gModifierEntries.map(e => e.frame.x + e.frame.width),
      // Phase 3-4: adverbial right edges
      ...gAdvPhrases.map(a => a.frame.x + a.frame.width),
      // Phase 3-5: coord clause right edges
      ...gCoordClauses.map(cc => cc.frame.x + cc.frame.width),
    ];
    const maxRight = Math.max(...rightEdges);
    const rootW    = _fin(Math.max(0, maxRight - offsetX + paddingX));

    // Height: from diagram top to the bottom of the deepest content.
    const rootH = _fin(Math.max(0, maxContentBottom - offsetY));

    // ── 12. Baseline span ──────────────────────────────────────────────
    const blX1 = gSlots.length > 0 ? gSlots[0].anchors.left                  : (offsetX + paddingX);
    const blX2 = gSlots.length > 0 ? gSlots[gSlots.length - 1].anchors.right : (offsetX + paddingX);

    return {
      type:    'GRootNode',
      variant: plRoot.variant,
      frame:   _frame(offsetX, offsetY, rootW, rootH),
      baseline: {
        y:  _fin(baselineY),
        x1: _fin(blX1),
        x2: _fin(blX2),
      },
      slots:  gSlots,
      raised: gRaised,
      modifiers: {
        type:    'GModifierZoneNode',
        frame:   _frame(offsetX, modZoneTopY, rootW, modZoneActualH),
        entries: gModifierEntries,
      },
      adverbials: gAdvPhrases,
      coordStack: {
        type:    'GCoordStackNode',
        frame:   _frame(offsetX, coordZoneTopY, rootW, coordZoneActualH),
        clauses: gCoordClauses,
      },
      connectors: gConnectors,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * buildRoleGeometryLayout(pageLayout, geometryParams?)
   *
   * Converts a RolePageLayout into a RoleGeometryLayout.
   * Pure function: no DOM, no viewport, no SVG, no font metrics.
   *
   * All output coordinates are ROOT-relative absolute pixels.
   *
   * Phase 3-5 adds:
   *   root.coordStack             — GCoordStackNode with GCoordClauseNode[] (each with innerRoot)
   *   gl.relClauses               — GRelClauseNode[] (each with innerDiagram)
   *   gl.antecedentLinks          — GAntecedentLink[] (antecedentAnchor + relClauseAnchor)
   *
   * @param  {RolePageLayout} pageLayout
   * @param  {object}         [geometryParams] — overrides for DEFAULT_GEOMETRY_PARAMS
   * @returns {RoleGeometryLayout | null}
   */
  function buildRoleGeometryLayout(pageLayout, geometryParams) {
    if (!pageLayout) return null;

    const params = _mergeParams(geometryParams);
    const root   = _buildGRootNode(pageLayout.root, params, 0, 0);

    // ── Phase 3-5: Relative Clause geometry ───────────────────────────
    //
    // Relative clauses are placed below the root diagram:
    //   relClause[0].y = root.frame.height + zoneGapPx
    //   relClause[i+1].y = relClause[i].frame.bottom + zoneGapPx
    //
    // Phase 2 contract (PLRelClauseNode):
    //   rcPL.antecedentRef      = string | null
    //   rcPL.antecedentSi       = number | null
    //   rcPL.innerPageLayout    = RolePageLayout | null

    const gRelClauses = [];
    let relClauseY = _fin(root.frame.height + params.zoneGapPx);

    for (const rcPL of (pageLayout.relClauses || [])) {
      if (!rcPL || !rcPL.innerPageLayout) {
        gRelClauses.push({
          type:          'GRelClauseNode',
          antecedentRef: rcPL ? (rcPL.antecedentRef || null) : null,
          antecedentSi:  rcPL ? (rcPL.antecedentSi  ?? null) : null,
          frame:         _frame(0, relClauseY, 0, 0),
          innerDiagram:  null,
        });
        continue;
      }
      const innerRoot = _buildGRootNode(rcPL.innerPageLayout.root, params, 0, relClauseY);
      const rcBottom  = _fin(innerRoot.frame.y + innerRoot.frame.height);

      gRelClauses.push({
        type:          'GRelClauseNode',
        antecedentRef: rcPL.antecedentRef || null,
        antecedentSi:  rcPL.antecedentSi  ?? null,
        frame:         innerRoot.frame,
        innerDiagram:  innerRoot,
      });
      relClauseY = rcBottom + params.zoneGapPx;
    }

    // ── Phase 3-5: Antecedent Link geometry ───────────────────────────
    //
    // Phase 2 contract (antecedentLinks entry):
    //   alPL.relClauseIndex   = number
    //   alPL.antecedentRef    = string | null
    //   alPL.antecedentSi     = number | null
    //
    // antecedentAnchor lookup:
    //   If antecedentSi is a valid number, search root slots for matching si.
    //   Found  → anchor = { x: slot.anchors.centerX, y: slot.anchors.bottom }
    //   Missing → anchor = null  (never throws)
    //
    // relClauseAnchor = top-left of the relative clause frame.
    // Phase 4 draws: antecedentAnchor → (vertical) → horizontal → relClauseAnchor.

    const gAntecedentLinks = [];

    for (const alPL of (pageLayout.antecedentLinks || [])) {
      const { relClauseIndex, antecedentSi, antecedentRef } = alPL;
      const relClause = gRelClauses[relClauseIndex] || null;

      let antecedentAnchor = null;
      if (typeof antecedentSi === 'number' && antecedentSi !== null) {
        const slot = _findSlotBySi(root, antecedentSi, 0);
        if (slot) {
          antecedentAnchor = {
            x: _fin(slot.anchors.centerX),
            y: _fin(slot.anchors.bottom),
          };
        }
      }

      const relClauseAnchor = relClause
        ? { x: _fin(relClause.frame.x), y: _fin(relClause.frame.y) }
        : { x: 0, y: 0 };

      gAntecedentLinks.push({
        type:             'GAntecedentLink',
        relClauseIndex,
        antecedentRef:    antecedentRef  || null,
        antecedentSi:     antecedentSi   ?? null,
        antecedentAnchor,
        relClauseAnchor,
      });
    }

    // Total dimensions: root + any rel clause extensions
    const totalHeight = gRelClauses.length > 0
      ? Math.max(root.frame.height,
          ...gRelClauses.filter(r => r.innerDiagram).map(r => r.frame.y + r.frame.height))
      : root.frame.height;

    const totalWidth = gRelClauses.length > 0
      ? Math.max(root.frame.width,
          ...gRelClauses.filter(r => r.innerDiagram).map(r => r.frame.x + r.frame.width))
      : root.frame.width;

    return {
      type:   'RoleGeometryLayout',
      width:  _fin(Math.max(0, totalWidth)),
      height: _fin(Math.max(0, totalHeight)),
      root,
      relClauses:      gRelClauses,
      antecedentLinks: gAntecedentLinks,
    };
  }

  global.RoleGeometryLayout = { buildRoleGeometryLayout, DEFAULT_GEOMETRY_PARAMS };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
