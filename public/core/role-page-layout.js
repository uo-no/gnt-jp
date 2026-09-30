/**
 * role-page-layout.js  RK-ARCH-04 Phase 2
 *
 * Converts Role Semantic Layout into Role Page Layout:
 * a structural description of HOW to arrange the diagram
 * (zones, wrapping, stacking, size estimates) with NO coordinates,
 * NO font metrics, NO DOM, and NO SVG.
 *
 * Pipeline position:
 *   buildRoleSemanticLayout()  (Phase 1)
 *    → buildRolePageLayout()   ← this module
 *    → Geometry                (Phase 3)
 *    → SVG Renderer            (Phase 4)
 *
 * All sizes are in logical units. Pixel conversion is Phase 3's responsibility.
 *
 * Exports: window.RolePageLayout = { buildRolePageLayout, DEFAULT_LAYOUT_PARAMS }
 */
(function (global) {
  'use strict';

  // ── Function label minimum widths ─────────────────────────────────────
  //
  // Minimum slot width in logical units, keyed by pipeline function name.
  // Calibrated for Japanese UI labels at 0.75rem (≈11px/CJK char, charWidth=8px).
  // Only covers functions whose labels render as .role-slot-fn on the baseline.
  // COPULA: excluded by role-renderer.js (fn !== 'COPULA' guard, line 258).
  // INDIRECT_OBJECT / AUX: raised slots — no foreignObject is generated.

  const _FUNCTION_LABEL_MIN_WIDTH = {
    SUBJECT:       3,   // 主語 2ch ≈ 22px → min 24px (3 units)
    PREDICATE:     3,   // 述語 2ch ≈ 22px → min 24px
    COMPLEMENT:    3,   // 補語 2ch ≈ 22px → min 24px
    OBJECT:        5,   // 目的語 3ch ≈ 33px → min 40px (5 units)
    SECOND_OBJECT: 8,   // 第二目的語 5ch × 12px = 60px → min 64px (8 units; 7→8 empirical fix)
  };

  // ── Default layout parameters ──────────────────────────────────────────

  const DEFAULT_LAYOUT_PARAMS = {
    textWrapWidth:  12,   // logical units: max width before wrapping FlatTextNode
    minSlotWidth:    2,   // logical units: minimum slot content width
    connectorGap:    1,   // logical units: width of semantic connector (divider)
    tokenWidth:      1,   // logical units per character (Greek text width estimate)
    lineHeight:    1.5,   // logical units: single-line slot height
    zoneGap:         1,   // logical units: vertical gap between zones
  };

  function _mergeParams(params) {
    if (!params) return DEFAULT_LAYOUT_PARAMS;
    return Object.assign({}, DEFAULT_LAYOUT_PARAMS, params);
  }

  // ── Width helpers ──────────────────────────────────────────────────────

  function _tokenCharWidth(tokens, params) {
    if (!tokens || tokens.length === 0) return 0;
    const chars = tokens.reduce((s, t) => s + (t.text ? t.text.length : 1), 0);
    const gaps  = Math.max(0, tokens.length - 1) * 1.0;
    return chars * params.tokenWidth + gaps;
  }

  function _stringCharWidth(str, params) {
    if (!str) return 0;
    return str.length * params.tokenWidth;
  }

  // ── TextWrapBlock ──────────────────────────────────────────────────────

  function _buildTextWrapBlock(flatNode, params) {
    const total          = _tokenCharWidth(flatNode.tokens, params);
    const estimatedWidth = Math.min(total, params.textWrapWidth);
    const estimatedLines = params.textWrapWidth > 0
      ? Math.max(1, Math.ceil(total / params.textWrapWidth))
      : 1;
    const estimatedHeight = estimatedLines * params.lineHeight;
    return {
      type:            'TextWrapBlock',
      tokens:          flatNode.tokens,
      tokenCount:      flatNode.tokenCount,
      maxWidth:        params.textWrapWidth,
      estimatedWidth,
      estimatedHeight,
      estimatedLines,
    };
  }

  // ── Modifier layout ────────────────────────────────────────────────────

  function _layoutModifierContent(content, params) {
    if (content.type === 'FlatTextNode') {
      const twb = _buildTextWrapBlock(content, params);
      return {
        displayMode:    'FLAT_WRAP',
        headTokens:     null,
        textWrapBlock:  twb,
        estimatedWidth:  twb.estimatedWidth,
        estimatedHeight: twb.estimatedHeight,
      };
    }
    // CompositeSlotNode (default for modifiers)
    const w = Math.max(params.minSlotWidth, _tokenCharWidth(content.headTokens, params));
    return {
      displayMode:    'COMPOSITE',
      headTokens:     content.headTokens,
      textWrapBlock:  null,
      estimatedWidth:  w,
      estimatedHeight: params.lineHeight,
    };
  }

  function _layoutModifier(modifier, params) {
    const cl = _layoutModifierContent(modifier.content, params);
    return {
      type:            'PLModifierLayout',
      label:           modifier.label,
      si:              modifier.si,
      displayMode:     cl.displayMode,
      headTokens:      cl.headTokens,
      textWrapBlock:   cl.textWrapBlock,
      estimatedWidth:  cl.estimatedWidth,
      estimatedHeight: cl.estimatedHeight,
    };
  }

  // ── Content layout ─────────────────────────────────────────────────────
  //
  // Handles all semantic content node types and returns a uniform
  // "content layout" descriptor that slot/raised/advPhrase builders consume.
  //
  // Return shape:
  //   { displayMode, headTokens?, textWrapBlock?, innerPageLayout?,
  //     clauseType?, bracketText?, compoundMembers?, conjunction?,
  //     modifiers, estimatedWidth, estimatedHeight, modifierHeight }

  function _layoutContent(content, params) {
    switch (content.type) {

      case 'CompositeSlotNode': {
        const w    = Math.max(params.minSlotWidth, _tokenCharWidth(content.headTokens, params));
        const mods = (content.modifiers || []).map(m => _layoutModifier(m, params));
        // Modifier height: sum of each modifier's height + inter-modifier gap
        const modH = mods.reduce((s, m) => s + m.estimatedHeight + params.zoneGap, 0);
        return {
          displayMode:     'COMPOSITE',
          headTokens:      content.headTokens,
          textWrapBlock:   null,
          innerPageLayout: null,
          clauseType:      null,
          bracketText:     null,
          compoundMembers: null,
          conjunction:     null,
          modifiers:       mods,
          estimatedWidth:  w,
          estimatedHeight: params.lineHeight,
          modifierHeight:  modH,
        };
      }

      case 'FlatTextNode': {
        const twb = _buildTextWrapBlock(content, params);
        return {
          displayMode:     'FLAT_WRAP',
          headTokens:      null,
          textWrapBlock:   twb,
          innerPageLayout: null,
          clauseType:      null,
          bracketText:     null,
          compoundMembers: null,
          conjunction:     null,
          modifiers:       [],
          estimatedWidth:  twb.estimatedWidth,
          estimatedHeight: twb.estimatedHeight,
          modifierHeight:  0,
        };
      }

      case 'ContentClauseNode': {
        // Bottom-up: inner layout must be computed first so its size
        // can propagate upward to the parent slot.
        const innerPL = buildRolePageLayout(content.innerLayout, params);
        const iw = innerPL ? innerPL.estimatedWidth  : params.minSlotWidth;
        const ih = innerPL ? innerPL.estimatedHeight : params.lineHeight;
        return {
          displayMode:     'CONTENT_CLAUSE',
          headTokens:      null,
          textWrapBlock:   null,
          innerPageLayout: innerPL,
          clauseType:      content.clauseType,
          bracketText:     null,
          compoundMembers: null,
          conjunction:     null,
          modifiers:       [],
          estimatedWidth:  Math.max(params.minSlotWidth, iw),
          estimatedHeight: Math.max(params.lineHeight,   ih),
          modifierHeight:  0,
        };
      }

      case 'NominalizedClauseNode': {
        const sw = Math.max(params.minSlotWidth, _stringCharWidth(content.bracketText, params));
        return {
          displayMode:     'NOMINALIZED',
          headTokens:      null,
          textWrapBlock:   null,
          innerPageLayout: null,
          clauseType:      null,
          bracketText:     content.bracketText,
          compoundMembers: null,
          conjunction:     null,
          modifiers:       [],
          estimatedWidth:  sw,
          estimatedHeight: params.lineHeight,
          modifierHeight:  0,
        };
      }

      case 'CompoundNode': {
        const memberLayouts = (content.members || []).map(m => _layoutContent(m, params));
        // Horizontal arrangement: sum widths + inter-member gaps
        const totalW = memberLayouts.reduce((s, m) => s + m.estimatedWidth, 0)
                     + Math.max(0, memberLayouts.length - 1) * params.connectorGap;
        const maxH   = memberLayouts.reduce(
          (mx, m) => Math.max(mx, m.estimatedHeight), params.lineHeight
        );
        // Propagate modifier height from members
        const maxModH = memberLayouts.reduce(
          (mx, m) => Math.max(mx, m.modifierHeight || 0), 0
        );
        return {
          displayMode:     'COMPOUND',
          headTokens:      null,
          textWrapBlock:   null,
          innerPageLayout: null,
          clauseType:      null,
          bracketText:     null,
          compoundMembers: memberLayouts,
          conjunction:     content.conjunction,
          modifiers:       [],
          estimatedWidth:  Math.max(params.minSlotWidth, totalW),
          estimatedHeight: maxH,
          modifierHeight:  maxModH,
        };
      }

      default:
        return {
          displayMode:     'COMPOSITE',
          headTokens:      [],
          textWrapBlock:   null,
          innerPageLayout: null,
          clauseType:      null,
          bracketText:     null,
          compoundMembers: null,
          conjunction:     null,
          modifiers:       [],
          estimatedWidth:  params.minSlotWidth,
          estimatedHeight: params.lineHeight,
          modifierHeight:  0,
        };
    }
  }

  // ── Slot layout ────────────────────────────────────────────────────────

  function _layoutSlot(slotNode, params) {
    const cl       = _layoutContent(slotNode.content, params);
    const labelMin = _FUNCTION_LABEL_MIN_WIDTH[slotNode.fn] || 0;
    return {
      type:             'PLSlotLayout',
      fn:               slotNode.fn,
      semanticConnector: slotNode.semanticConnector,
      si:               slotNode.si,
      displayMode:      cl.displayMode,
      headTokens:       cl.headTokens,
      textWrapBlock:    cl.textWrapBlock,
      innerPageLayout:  cl.innerPageLayout,
      clauseType:       cl.clauseType,
      bracketText:      cl.bracketText,
      compoundMembers:  cl.compoundMembers,
      modifiers:        cl.modifiers,
      estimatedWidth:   Math.max(cl.estimatedWidth, labelMin),
      fnLabelMinWidth:  labelMin,
      estimatedHeight:  cl.estimatedHeight,
      modifierHeight:   cl.modifierHeight,
    };
  }

  // ── Raised slot layout ─────────────────────────────────────────────────

  function _layoutRaisedSlot(raisedSlotNode, params) {
    const c = raisedSlotNode.content;
    let displayMode, headTokens = null, textWrapBlock = null, w, h;
    let modifiers = [], modifierHeight = 0;

    if (c.type === 'FlatTextNode') {
      const twb     = _buildTextWrapBlock(c, params);
      displayMode   = 'FLAT_WRAP';
      textWrapBlock = twb;
      w = twb.estimatedWidth;
      h = twb.estimatedHeight;
    } else {
      // CompositeSlotNode
      displayMode = 'COMPOSITE';
      headTokens  = c.headTokens;
      w = Math.max(params.minSlotWidth, _tokenCharWidth(c.headTokens, params));
      h = params.lineHeight;
      modifiers = (c.modifiers || []).map(m => _layoutModifier(m, params));
      modifierHeight = modifiers.reduce((s, m) => s + m.estimatedHeight + params.zoneGap, 0);
    }

    // Phase 5-1-F: IO fn label requires extra width and height.
    // 間接目的語 = 5 CJK chars × 12px ≈ 60px → 8 logical units (matches SECOND_OBJECT calibration).
    if (raisedSlotNode.fn === 'INDIRECT_OBJECT') {
      w = Math.max(w, 8);
      h += params.lineHeight;
    }

    return {
      type:             'PLRaisedSlotLayout',
      fn:               raisedSlotNode.fn,
      attachmentPoint:  raisedSlotNode.attachmentPoint,
      displayMode,
      headTokens,
      textWrapBlock,
      si:               raisedSlotNode.si,
      estimatedWidth:   Math.max(params.minSlotWidth, w),
      estimatedHeight:  Math.max(params.lineHeight, h),
      modifiers,
      modifierHeight,
    };
  }

  // ── AdvPhrase layout ───────────────────────────────────────────────────

  function _layoutAdvPhrase(advPhraseNode, params) {
    const { phraseType, diagonalLabel, attachedToFn } = advPhraseNode;

    if (phraseType === 'CLAUSE' || phraseType === 'PARTICIPLE') {
      // content is RoleSemanticLayout — recurse as independent sub-layout
      const innerPL = buildRolePageLayout(advPhraseNode.content, params);
      const iw = innerPL ? innerPL.estimatedWidth  : params.minSlotWidth;
      const ih = innerPL ? innerPL.estimatedHeight : params.lineHeight;
      return {
        type:             'PLAdvPhraseLayout',
        phraseType,
        diagonalLabel,
        attachedToFn,
        displayMode:      null,
        headTokens:       null,
        textWrapBlock:    null,
        innerPageLayout:  innerPL,
        estimatedWidth:   iw,
        estimatedHeight:  ih,
      };
    }

    // PP or ADV — content is CompositeSlotNode or FlatTextNode
    const cl = _layoutContent(advPhraseNode.content, params);
    return {
      type:             'PLAdvPhraseLayout',
      phraseType,
      diagonalLabel,
      attachedToFn,
      displayMode:      cl.displayMode,
      headTokens:       cl.headTokens,
      textWrapBlock:    cl.textWrapBlock,
      innerPageLayout:  null,
      estimatedWidth:   cl.estimatedWidth,
      estimatedHeight:  cl.estimatedHeight,
    };
  }

  // ── Structural root layout ─────────────────────────────────────────────

  function _layoutStructuralRoot(root, params) {

    // 1. Baseline slots — order is preserved exactly from semantic layout
    //    (canonical BASE_ORDER sort was done in Phase 1; do NOT re-sort here)
    const slotLayouts = (root.baseSlots || []).map(s => _layoutSlot(s, params));

    const connectorCount = slotLayouts.filter(s => s.semanticConnector !== null).length;
    const totalSlotW     = slotLayouts.reduce((s, sl) => s + sl.estimatedWidth, 0);
    const baselineW      = totalSlotW + connectorCount * params.connectorGap;

    // Baseline row height: max content height across all slots.
    // For ContentClauseNode slots, estimatedHeight includes the inner layout height,
    // propagating that height up to the baseline row level.
    const baselineH = slotLayouts.reduce(
      (mx, s) => Math.max(mx, s.estimatedHeight),
      params.lineHeight
    );

    const baselineRow = {
      type:                'PLBaselineRow',
      slots:               slotLayouts,
      totalEstimatedWidth: Math.max(0, baselineW),
      estimatedHeight:     baselineH,
    };

    // 2. Raised zone — IO and AUX above the baseline
    const raisedLayouts = (root.raisedSlots || []).map(s => _layoutRaisedSlot(s, params));
    const raisedH = raisedLayouts.length > 0
      ? raisedLayouts.reduce((mx, r) => Math.max(mx, r.estimatedHeight + (r.modifierHeight || 0)), 0) + params.zoneGap
      : 0;
    const raisedZone = {
      type:            'PLRaisedZone',
      slots:           raisedLayouts,
      estimatedHeight: raisedH,
    };

    // 3. Modifier zone — modifier L-bracket trees below baseline slots
    //    Overall height = the tallest modifier stack across all slots.
    const maxModH  = slotLayouts.reduce((mx, s) => Math.max(mx, s.modifierHeight || 0), 0);
    const modZoneH = maxModH > 0 ? maxModH + params.zoneGap : 0;
    const modifierZone = {
      type:              'PLModifierZone',
      maxModifierHeight: maxModH,
      estimatedHeight:   modZoneH,
    };

    // 4. Adv phrase zone — adverbial phrases and clauses stacked below
    const advLayouts = (root.advPhrases || []).map(a => _layoutAdvPhrase(a, params));
    const advH = advLayouts.reduce((s, a) => s + a.estimatedHeight + params.zoneGap, 0);
    const advW = advLayouts.length > 0
      ? advLayouts.reduce((mx, a) => Math.max(mx, a.estimatedWidth), 0)
      : 0;
    const advZone = {
      type:            'PLAdvZone',
      phrases:         advLayouts,
      estimatedWidth:  advW,
      estimatedHeight: advH,
    };

    // 5. Coordinated clause stack — vertically stacked sub-layouts
    const coordLayouts = (root.coordClauses || []).map(cc => {
      const innerRoot = _layoutStructuralRoot(cc.layout, params);
      return {
        type:            'PLCoordClauseLayout',
        conjunction:     cc.conjunction,
        innerRoot,
        estimatedWidth:  innerRoot.estimatedWidth,
        estimatedHeight: innerRoot.estimatedHeight,
      };
    });
    const coordH = coordLayouts.reduce((s, c) => s + c.estimatedHeight + params.zoneGap, 0);
    const coordW = coordLayouts.length > 0
      ? coordLayouts.reduce((mx, c) => Math.max(mx, c.estimatedWidth), 0)
      : 0;
    const coordStack = {
      type:            'PLCoordStack',
      clauses:         coordLayouts,
      estimatedWidth:  coordW,
      estimatedHeight: coordH,
    };

    // 6. Total estimated dimensions
    const estimatedWidth = Math.max(
      params.minSlotWidth,
      baselineRow.totalEstimatedWidth,
      advW,
      coordW
    );
    const estimatedHeight = Math.max(
      params.lineHeight,
      raisedZone.estimatedHeight
      + baselineRow.estimatedHeight
      + modifierZone.estimatedHeight
      + advZone.estimatedHeight
      + coordStack.estimatedHeight
    );

    return {
      type:          'PLRootNode',
      variant:       root.variant,
      baselineRow,
      raisedZone,
      modifierZone,
      advZone,
      coordStack,
      estimatedWidth,
      estimatedHeight,
    };
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * buildRolePageLayout(semanticLayout, layoutParams?)
   *
   * Converts a RoleSemanticLayout into a RolePageLayout.
   * Pure function: no DOM, no viewport, no SVG, no x/y coordinates.
   *
   * Width/height values are logical units; pixel conversion is Phase 3's job.
   *
   * @param  {RoleSemanticLayout}  semanticLayout
   * @param  {object}  [layoutParams]  — overrides for DEFAULT_LAYOUT_PARAMS
   * @returns {RolePageLayout}
   */
  function buildRolePageLayout(semanticLayout, layoutParams) {
    if (!semanticLayout) return null;
    const params = _mergeParams(layoutParams);

    const root = _layoutStructuralRoot(semanticLayout.root, params);

    const relClauses = (semanticLayout.relClauses || []).map(rc => {
      const innerPL = buildRolePageLayout(rc.innerLayout, params);
      return {
        type:             'PLRelClauseNode',
        antecedentRef:    rc.antecedentRef,
        antecedentSi:     rc.antecedentSi,
        innerPageLayout:  innerPL,
        estimatedWidth:   innerPL ? innerPL.estimatedWidth  : params.minSlotWidth,
        estimatedHeight:  innerPL ? innerPL.estimatedHeight : params.lineHeight,
      };
    });

    return {
      type:            'RolePageLayout',
      root,
      relClauses,
      antecedentLinks: semanticLayout.antecedentLinks || [],
      estimatedWidth:  root.estimatedWidth,
      estimatedHeight: root.estimatedHeight,
    };
  }

  global.RolePageLayout = { buildRolePageLayout, DEFAULT_LAYOUT_PARAMS };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
