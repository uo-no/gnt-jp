/**
 * rk-semantic-layout.js  RK-ARCH-04 Phase 1
 *
 * Converts a DR (DiagramRepresentation from dg-engine.js) into an
 * RK Semantic Layout — a pure structural description of WHAT to diagram,
 * with no coordinates, no font metrics, no DOM, and no SVG.
 *
 * Pipeline position:
 *   deriveDR()
 *    → _annotateRelClauses()     (index.html — adds antecedentRef to DR)
 *    → buildRKSemanticLayout()   ← this module
 *    → RK Page Layout            (Phase 2)
 *    → Geometry                  (Phase 3)
 *    → SVG Renderer              (Phase 4)
 *
 * DR schema (from dg-engine.js):
 *   DR_Clause  { id, conjunction, slots, adverbialPhrases, adverbialClauses,
 *                isCoordination, coordClauses, noVerb, isParticipalClause }
 *   DR_Slot    { fn, node, connector, si, modifiers, headSIs, isParticipial,
 *                embeddedRelClauses, contentClause, compound }
 *   DR_AdvPhrase { fn, node, si, ppPrep, ppNpNode, ppNpModInfo }
 *
 * Exports: window.RkSemanticLayout = { buildRKSemanticLayout }
 */
(function (global) {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────

  // Provisional; Page Layout may tune this per deployment.
  const FLAT_THRESHOLD = 5;

  // Slots extracted from the main baseline and placed on a raised platform.
  const RAISED_FNS = new Set(['INDIRECT_OBJECT', 'AUX']);

  // Canonical left-to-right display order on the RK baseline.
  // Surface word order (si) is NOT used for baseline ordering.
  const BASE_ORDER = [
    'SUBJECT',
    'PREDICATE',
    'COPULA',
    'COMPLEMENT',
    'OBJECT',
    'SECOND_OBJECT',
  ];

  // ── Token helpers ─────────────────────────────────────────────────────

  function _countTokens(node) {
    if (!node) return 0;
    if (node.type === 'token') return 1;
    let n = 0;
    for (const c of (node.children || [])) n += _countTokens(c);
    return n;
  }

  function _collectTokens(node, out) {
    if (!node) return;
    if (node.type === 'token') { out.push(node); return; }
    for (const c of (node.children || [])) _collectTokens(c, out);
  }

  function _getTokens(node) {
    const out = [];
    _collectTokens(node, out);
    out.sort((a, b) => (a.surfaceIndex ?? 0) - (b.surfaceIndex ?? 0));
    return out;
  }

  // Collect direct and nested clause descendants of a GROUP subtree.
  // Stops at clause boundaries: sub-clauses inside a found clause are not collected.
  function _collectDescClauseNodes(node, out) {
    for (const c of (node.children || [])) {
      if (c.type === 'clause') {
        out.push(c);
      } else if (c.type === 'group') {
        _collectDescClauseNodes(c, out);
      }
    }
  }

  // Find a token whose evidence.ref matches the given ref string.
  // Used for antecedent SI resolution.
  function _findTokenByRef(node, ref) {
    if (!node) return null;
    if (node.type === 'token') {
      return (node.evidence && node.evidence.ref === ref) ? node : null;
    }
    for (const c of (node.children || [])) {
      const found = _findTokenByRef(c, ref);
      if (found) return found;
    }
    return null;
  }

  // Search all slot nodes in a DR clause for a token with matching evidence.ref.
  // Returns the token's surfaceIndex, or null if not found.
  function _findSiByRef(dr, ref) {
    if (!dr || !ref) return null;
    for (const slot of (dr.slots || [])) {
      const t = _findTokenByRef(slot.node, ref);
      if (t && typeof t.surfaceIndex === 'number') return t.surfaceIndex;
    }
    return null;
  }

  // ── Connector logic ───────────────────────────────────────────────────

  function computeSemanticConnector(fn, baseSlotFns, noVerb) {
    const hasSubj = baseSlotFns.has('SUBJECT');
    const hasVerb = baseSlotFns.has('PREDICATE') || baseSlotFns.has('COPULA');
    const hasObj  = baseSlotFns.has('OBJECT');

    switch (fn) {
      case 'SUBJECT':
        return null;                                      // canonical leftmost; no divider before it
      case 'PREDICATE':
      case 'COPULA':
        return hasSubj ? 'sp' : null;                    // S|V full vertical divider
      case 'OBJECT':
        return hasVerb ? 'po' : null;                    // V|O short vertical divider
      case 'SECOND_OBJECT':
        return hasObj ? 'po' : null;                     // O|O2 short vertical divider
      case 'COMPLEMENT':
        if (noVerb) return hasSubj ? 'implied' : null;  // dashed diagonal (verbless predication)
        return hasVerb ? 'complement' : null;            // backward diagonal
      default:
        return null;
    }
  }

  // ── Variant determination ─────────────────────────────────────────────

  function _determineVariant(baseSlots, noVerb) {
    if (!noVerb)              return 'MAIN_CLAUSE';
    if (baseSlots.length === 0) return 'CLAUSE_STACK';
    return 'VERBLESS_CLAUSE';
  }

  // ── RaisedSlot attachment point ───────────────────────────────────────

  function _ioAttachmentPoint(baseSlotFns) {
    const hasVerb = baseSlotFns.has('PREDICATE') || baseSlotFns.has('COPULA');
    return hasVerb ? 'SP_DIVIDER' : 'SUBJECT';
  }

  // ── Content builders ──────────────────────────────────────────────────

  function _buildCompositeSlotNode(node, headSIs, modifiers) {
    const allTokens = _getTokens(node);
    const headTokens = (headSIs && headSIs.size > 0)
      ? allTokens.filter(t => headSIs.has(t.surfaceIndex))
      : allTokens;

    return {
      type: 'CompositeSlotNode',
      headTokens,
      modifiers: (modifiers || []).map(_buildModifierNode),
    };
  }

  function _buildFlatTextNode(node) {
    return {
      type: 'FlatTextNode',
      tokens: _getTokens(node),
      tokenCount: _countTokens(node),
    };
  }

  // Forward declaration — defined after buildRKSemanticLayout.
  let _buildContentClauseNode;

  function _buildNominalizedClauseNode(node) {
    // Collect all tokens to form bracket text; no inner layout.
    const tokens = _getTokens(node);
    return {
      type: 'NominalizedClauseNode',
      bracketText: tokens.map(t => t.text || '').join(' ').trim(),
    };
  }

  // Build a ContentClauseNode for a GROUP slot with nested clause descendants but no
  // contentClause.  Prevents independent clause tokens from being collapsed into
  // a single FlatTextNode.  Uses the existing ContentClauseNode sub-layout path.
  function _buildGroupNestedClausesContent(descClauses) {
    const drs = [];
    for (const cl of descClauses) {
      const dr = global.DgEngine && global.DgEngine.deriveDR(cl);
      if (dr) drs.push(dr);
    }
    if (drs.length === 0) return null;
    const innerDR = drs.length === 1
      ? drs[0]
      : {
          id: null, conjunction: null, conjunctionRef: null,
          slots: [], adverbialPhrases: [], adverbialClauses: [],
          isCoordination: true, coordClauses: drs,
          noVerb: false, isParticipalClause: false,
        };
    return _buildContentClauseNode({ conjunction: null, innerDR, label: null });
  }

  function _buildCompoundNode(compound) {
    // compound: [{ node, headSIs, modifiers }, ...]  from _extractCompoundMembers
    const members = (compound || []).map(m => {
      const tc = _countTokens(m.node);
      if (m.headSIs === null && tc > FLAT_THRESHOLD) return _buildFlatTextNode(m.node);
      return _buildCompositeSlotNode(m.node, m.headSIs, m.modifiers);
    });
    return {
      type: 'CompoundNode',
      members,
      conjunction: null,   // conjunction token (if any) is inside the group node; not separately tracked in DR compound schema
    };
  }

  function _buildModifierNode(modifier) {
    // modifier: { node, label, si }
    const node = modifier.node;
    let content;
    const cn = node && node.construction && node.construction.canonical;

    if (cn === 'CONTENT_CLAUSE' || cn === 'SUBORDINATE_CLAUSE' ||
        cn === 'PARTICIPIAL_CLAUSE' || cn === 'RELATIVE_CLAUSE') {
      // Recursive layout for clause-type modifiers.
      // We don't re-derive the DR here; use CompositeSlotNode as safe fallback.
      content = _buildCompositeSlotNode(node, null, []);
    } else if (_countTokens(node) > FLAT_THRESHOLD) {
      content = _buildFlatTextNode(node);
    } else {
      content = _buildCompositeSlotNode(node, null, []);
    }

    return {
      type: 'ModifierNode',
      label: modifier.label,
      si: modifier.si,
      content,
    };
  }

  function _buildSlotContent(drSlot) {
    // Priority 1: contentClause (sub-diagram)
    if (drSlot.contentClause) {
      return _buildContentClauseNode(drSlot.contentClause);
    }

    // Priority 2: compound (2Np coordination within slot)
    if (drSlot.compound) {
      return _buildCompoundNode(drSlot.compound);
    }

    // Priority 3: NOMINALIZED_CLAUSE — bracket notation; no inner layout
    if (drSlot.node && drSlot.node.type !== 'token') {
      const cn = drSlot.node.construction && drSlot.node.construction.canonical;
      if (cn === 'NOMINALIZED_CLAUSE') {
        return _buildNominalizedClauseNode(drSlot.node);
      }
    }

    // Priority 3.5: GROUP with nested clause descendants and no contentClause.
    // Intercepts the FlatTextNode fallback for GROUP argument slots where
    // _extractContentClause returns null but the subtree contains clauses.
    if (!drSlot.contentClause && drSlot.node && drSlot.node.type === 'group') {
      const _descClauses = [];
      _collectDescClauseNodes(drSlot.node, _descClauses);
      if (_descClauses.length > 0) {
        const _groupContent = _buildGroupNestedClausesContent(_descClauses);
        if (_groupContent) return _groupContent;
      }
    }

    // Priority 4: FlatTextNode for headSIs=null + large token count
    const tokenCount = _countTokens(drSlot.node);
    if (drSlot.headSIs === null && tokenCount > FLAT_THRESHOLD) {
      return _buildFlatTextNode(drSlot.node);
    }

    // Priority 5: CompositeSlotNode (head tokens on baseline, modifiers below)
    return _buildCompositeSlotNode(drSlot.node, drSlot.headSIs, drSlot.modifiers);
  }

  // ── Slot builders ─────────────────────────────────────────────────────

  function _buildSlotNode(drSlot, baseSlotFns, noVerb) {
    return {
      type: 'SlotNode',
      fn: drSlot.fn,
      semanticConnector: computeSemanticConnector(drSlot.fn, baseSlotFns, noVerb),
      content: _buildSlotContent(drSlot),
      si: drSlot.si,
    };
  }

  function _buildRaisedSlotNode(drSlot, baseSlotFns, noVerb) {
    let attachmentPoint;
    if (drSlot.fn === 'INDIRECT_OBJECT') {
      attachmentPoint = _ioAttachmentPoint(baseSlotFns);
    } else {
      // AUX — always attaches above the predicate slot
      attachmentPoint = 'PREDICATE';
    }

    const tokenCount = _countTokens(drSlot.node);
    const content = (drSlot.headSIs === null && tokenCount > FLAT_THRESHOLD)
      ? _buildFlatTextNode(drSlot.node)
      : _buildCompositeSlotNode(drSlot.node, drSlot.headSIs, drSlot.modifiers);

    return {
      type: 'RaisedSlotNode',
      fn: drSlot.fn,
      attachmentPoint,
      content,
      si: drSlot.si,
    };
  }

  // ── AdvPhrase builders ────────────────────────────────────────────────

  function _buildAdvPhraseFromPhrase(drAdvPhrase) {
    let phraseType, diagonalLabel, content;

    if (drAdvPhrase.ppPrep) {
      phraseType    = 'PP';
      diagonalLabel = drAdvPhrase.ppPrep;
      const npNode  = drAdvPhrase.ppNpNode;
      const npMod   = drAdvPhrase.ppNpModInfo;
      if (npNode) {
        const tc = _countTokens(npNode);
        const headSIs = npMod ? npMod.headSIs : null;
        const mods    = npMod ? npMod.modifiers : [];
        content = (headSIs === null && tc > FLAT_THRESHOLD)
          ? _buildFlatTextNode(npNode)
          : _buildCompositeSlotNode(npNode, headSIs, mods);
      } else {
        content = _buildCompositeSlotNode(drAdvPhrase.node, null, []);
      }
    } else {
      phraseType    = 'ADV';
      diagonalLabel = null;
      const tc      = _countTokens(drAdvPhrase.node);
      content = tc > FLAT_THRESHOLD
        ? _buildFlatTextNode(drAdvPhrase.node)
        : _buildCompositeSlotNode(drAdvPhrase.node, null, []);
    }

    return {
      type: 'AdvPhraseNode',
      phraseType,
      diagonalLabel,
      content,
      attachedToFn: 'BASELINE',   // Phase 2 will refine attachment
    };
  }

  function _buildAdvPhraseFromClause(drClause) {
    // Non-relative adverbial clauses become AdvPhraseNode with inner layout.
    const phraseType = drClause.isParticipalClause ? 'PARTICIPLE' : 'CLAUSE';
    return {
      type: 'AdvPhraseNode',
      phraseType,
      diagonalLabel: drClause.conjunction || null,
      content: buildRKSemanticLayout(drClause),
      attachedToFn: 'BASELINE',
    };
  }

  // ── RelClause builder ─────────────────────────────────────────────────

  function _buildRelClauseNode(sc, parentDR) {
    const antecedentRef = sc.antecedentRef || null;
    const antecedentSi  = antecedentRef ? _findSiByRef(parentDR, antecedentRef) : null;
    return {
      type: 'RelClauseNode',
      antecedentRef,
      antecedentSi,
      innerLayout: buildRKSemanticLayout(sc),
    };
  }

  function _buildEmbeddedRelClauseNode(erc, parentDR) {
    const antecedentRef = erc.antecedentRef || null;
    const antecedentSi  = antecedentRef ? _findSiByRef(parentDR, antecedentRef) : null;
    return {
      type: 'RelClauseNode',
      antecedentRef,
      antecedentSi,
      innerLayout: erc.dr ? buildRKSemanticLayout(erc.dr) : null,
    };
  }

  // Collect all rel clauses from a DR: adverbialClauses + slot embeddedRelClauses.
  function _collectRelClauseNodes(dr) {
    const nodes = [];

    // From adverbialClauses with isRelativeClause=true
    for (const sc of (dr.adverbialClauses || [])) {
      if (sc.isRelativeClause) {
        nodes.push(_buildRelClauseNode(sc, dr));
      }
    }

    // From slot embeddedRelClauses (CLAUSE_AS_NP pattern)
    for (const slot of (dr.slots || [])) {
      for (const erc of (slot.embeddedRelClauses || [])) {
        if (erc.dr) {
          nodes.push(_buildEmbeddedRelClauseNode(erc, dr));
        }
      }
    }

    return nodes;
  }

  // ── CoordClause builder ───────────────────────────────────────────────

  function _buildCoordClauseNode(drClause) {
    return {
      type: 'CoordClauseNode',
      conjunction: drClause.conjunction || null,
      layout: _buildStructuralRoot(drClause),
    };
  }

  // ── StructuralRoot builder ────────────────────────────────────────────

  function _buildStructuralRoot(dr) {
    const drSlots = dr.slots || [];

    // 1. Partition slots: baseline vs raised
    const baseSlotDRs  = drSlots.filter(s => !RAISED_FNS.has(s.fn));
    const raisedSlotDRs = drSlots.filter(s => RAISED_FNS.has(s.fn));

    // 2. Compute semantic connector context from base slot fn set
    const baseSlotFns = new Set(baseSlotDRs.map(s => s.fn));

    // 3. Build SlotNodes with semantic connectors (surface-order connector is NOT used)
    const baseSlots = baseSlotDRs.map(s => _buildSlotNode(s, baseSlotFns, dr.noVerb));

    // 4. Sort into canonical RK display order (SUBJECT → P/C → C/O → O2)
    //    Tie-break by si to preserve consistent ordering when fn is repeated.
    baseSlots.sort((a, b) => {
      const oa = BASE_ORDER.indexOf(a.fn);
      const ob = BASE_ORDER.indexOf(b.fn);
      if (oa !== ob) return oa - ob;
      return (a.si ?? 0) - (b.si ?? 0);
    });

    // 5. Build raised slots (IO, AUX)
    const raisedSlots = raisedSlotDRs.map(s => _buildRaisedSlotNode(s, baseSlotFns, dr.noVerb));

    // 6. Build adverbial phrases (phrase-level adverbials)
    const advPhrasesFromPhrases = (dr.adverbialPhrases || []).map(_buildAdvPhraseFromPhrase);

    // 7. Build adverbial clauses (non-relative only; relative clauses go to relClauses)
    const advPhrasesFromClauses = (dr.adverbialClauses || [])
      .filter(sc => !sc.isRelativeClause)
      .map(_buildAdvPhraseFromClause);

    const advPhrases = [...advPhrasesFromPhrases, ...advPhrasesFromClauses];

    // 8. Build coordinated clauses
    const coordClauses = (dr.coordClauses || []).map(_buildCoordClauseNode);

    // 9. Determine structural variant
    const variant = _determineVariant(baseSlots, dr.noVerb);

    return {
      type: 'StructuralRootNode',
      variant,
      baseSlots,
      raisedSlots,
      advPhrases,
      coordClauses,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * buildRKSemanticLayout(dr)
   *
   * Converts a DR (post _annotateRelClauses) into an RK Semantic Layout.
   * Pure function: no DOM, no coordinates, no font metrics, no SVG.
   *
   * @param  {DR_Clause} dr — derived representation from deriveDR()
   * @returns {RKSemanticLayout}
   */
  function buildRKSemanticLayout(dr) {
    if (!dr) return null;

    const root         = _buildStructuralRoot(dr);
    const relClauses   = _collectRelClauseNodes(dr);
    const antecedentLinks = relClauses
      .map((rc, i) => ({
        relClauseIndex: i,
        antecedentRef:  rc.antecedentRef,
        antecedentSi:   rc.antecedentSi,
      }))
      .filter(al => al.antecedentRef !== null);

    return {
      type: 'RKSemanticLayout',
      root,
      relClauses,
      antecedentLinks,
    };
  }

  // Resolve forward reference for ContentClauseNode builder.
  _buildContentClauseNode = function (contentClause) {
    // contentClause: { conjunction: string|null, innerDR: DR_Clause, label: string|null }
    return {
      type: 'ContentClauseNode',
      clauseType: contentClause.conjunction || contentClause.label || 'clause',
      innerLayout: buildRKSemanticLayout(contentClause.innerDR),
    };
  };

  global.RkSemanticLayout = { buildRKSemanticLayout };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
