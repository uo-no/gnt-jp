/**
 * clause-flow-engine.js — Phase 6-2-C / SF-30 / SF-32 / SF-33
 *
 * ClauseFlowTree Builder — DR → Canonical ClauseFlowTree v1
 *
 * Converts a DR_Clause (from dg-engine.js deriveDR()) into a
 * Canonical ClauseFlowTree v1 containing structural facts and markers only.
 * No semantic inference. No layout. No DOM.
 *
 * Pipeline position:
 *   deriveDR(sentence.root)
 *    → _annotateRelClauses()    (index.html — adds relPronRef/isRelativeClause)
 *    → buildClauseFlowTree()    ← this module
 *    → ClauseFlowRenderer       (Phase 6-2-D)
 *
 * ClauseFlowTree schema:
 *   { sentenceRef, flatNodeCount, root: ClauseFlowNode, version: 1 }
 *
 * ClauseFlowNode schema:
 *   { id, sourcePath, nodeType, structuralRole, marker, predicate,
 *     arguments, phrases, flags, children, refs }
 *
 * nodeType values:
 *   ROOT | COORDINATION | CLAUSE_STACK | PARTICIPIAL_CLAUSE | VERBLESS_CLAUSE | CLAUSE
 *
 * structuralRole values:
 *   ROOT | CONTENT | RELATIVE | PARTICIPIAL | ADVERBIAL | COORDINATED
 *   CLAUSE_AS_NP | NOMINALIZED_CLAUSE
 *
 * SF-30: slot.modifiers clause children
 *   When a DR slot (SUBJECT/OBJECT/etc.) has clause-type entries in slot.modifiers
 *   (produced by dg-engine.extractSlotModifiers for ADJ_MOD constructions),
 *   _buildArguments limits tokenRefs to slot.headSIs (core NP only) and
 *   _buildChildren emits each clause modifier as a child ClauseFlowNode.
 *   sourcePath encodes slot affiliation: '<parentPath>.s[i].mod[j]'.
 *
 * SF-33: CLAUSE_AS_NP phrase children
 *   When a PP's NP child has construction.canonical === 'CLAUSE_AS_NP',
 *   _buildPhrases excludes embedded clause tokens from the phrase tokenRefs
 *   (keeping only prep + head NP tokens) and _buildChildren step [6] promotes
 *   each clause child within the NP to a CLAUSE_AS_NP child ClauseFlowNode.
 *   sourcePath: '<parentPath>.ap[i].can[j]' (i=adverbialPhrase index,
 *   j=clause-child index within ppNpNode.children).
 *
 * SF-35: Unified structural flattening — argument and phrase clause children
 *   Argument-side: when slot.node.cn === 'CLAUSE_AS_NP' or (type=clause,
 *   cn=NOMINALIZED_CLAUSE), clause children of slot.node are extracted from
 *   argument tokenRefs and emitted as child ClauseFlowNodes.
 *   sourcePath: '<parentPath>.s[i].can[j]'.
 *   Phrase-side: generalizes SF-33 — when ap.ppNpNode contains any type=clause
 *   child (any cn), clause tokens are excluded from phrase tokenRefs and each
 *   clause child is emitted as a child ClauseFlowNode via _buildChildren step [8].
 *   Step [6] retains exclusive responsibility for CLAUSE_AS_NP ppNpNode children.
 *   sourcePath: '<parentPath>.ap[i].can[j]' (same format as SF-33, extended).
 *
 * SF-37: GROUP argument direct clause children
 *   When slot.node.type === 'group', direct type=clause children are extracted from
 *   GROUP argument tokenRefs and emitted as child ClauseFlowNodes via _buildChildren step [9].
 *   sourcePath: '<parentPath>.s[i].can[j]' (same format as SF-35).
 *   Reuses _sf35ClauseRole for role assignment.
 *   Nested GROUP (GROUP → GROUP → clause) is deferred to SF-38.
 *
 * SF-38: GROUP argument nested clause children
 *   Extends SF-37 to clause descendants inside nested GROUP children.
 *   _sf38CollectDescClauseSIs() recursively collects all descendant clause token SIs
 *   from the GROUP subtree (stops at clause boundaries), replacing SF-37's flat
 *   direct-clause-only SI collection in _buildArguments().
 *   _buildChildren step [10] appends nested clause CF children after SF-37's step [9].
 *   can[j] counter continues from step [9] (direct clauses first, nested appended).
 *   sourcePath: '<parentPath>.s[i].can[j]' — same format, no new depth encoding.
 *   Maximum NT nesting depth = 2 (confirmed; depth ≥ 3 = 0 in full NT audit).
 *
 * Exports: window.ClauseFlowEngine = { buildClauseFlowTree }
 */
(function (global) {
  'use strict';

  // ── Argument function whitelist ────────────────────────────────────────
  var ARGUMENT_FNS = new Set([
    'SUBJECT', 'OBJECT', 'COMPLEMENT',
    'INDIRECT_OBJECT', 'SECOND_OBJECT', 'AUX',
  ]);

  // ── Token helpers ──────────────────────────────────────────────────────

  /**
   * Recursively collect tokens from an SR node, sorted by surfaceIndex.
   * Reimplemented here because dg-engine.js getTokens() is a private IIFE function.
   * @param {object} node
   * @returns {object[]}
   */
  function _getTokensSorted(node) {
    if (!node) return [];
    if (node.type === 'token') return [node];
    var tokens = [];
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      var sub = _getTokensSorted(children[i]);
      for (var j = 0; j < sub.length; j++) tokens.push(sub[j]);
    }
    return tokens.slice().sort(function (a, b) {
      return (a.surfaceIndex == null ? 0 : a.surfaceIndex) -
             (b.surfaceIndex == null ? 0 : b.surfaceIndex);
    });
  }

  /**
   * Collect token evidence.ref strings from an SR node.
   * Tokens without evidence.ref are silently skipped.
   * @param {object} node
   * @returns {string[]}
   */
  function _collectNodeTokenRefs(node) {
    var tokens = _getTokensSorted(node);
    var refs = [];
    for (var i = 0; i < tokens.length; i++) {
      var ref = tokens[i].evidence && tokens[i].evidence.nodeId;
      if (ref != null && ref !== '') refs.push(ref);
    }
    return refs;
  }

  /**
   * Collect token evidence.ref strings for only those tokens whose surfaceIndex
   * is present in headSIs. Used when slot.modifiers contains clause-type nodes
   * so that argument tokenRefs show only the core NP head tokens.
   * @param {object} node     slot.node
   * @param {Set}    headSIs  Set<number> from dg-engine extractSlotModifiers
   * @returns {string[]}
   */
  function _collectTokenRefsFromHeadSIs(node, headSIs) {
    var tokens = _getTokensSorted(node);
    var refs = [];
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (!headSIs.has(t.surfaceIndex)) continue;
      var ref = t.evidence && t.evidence.nodeId;
      if (ref != null && ref !== '') refs.push(ref);
    }
    return refs;
  }

  /**
   * Collect token refs from a DR node's OWN slots and adverbialPhrases only.
   * Does NOT include children (contentClause, adverbialClauses, coordClauses).
   * @param {object} dr
   * @returns {string[]}
   */
  function _collectOwnTokenRefs(dr) {
    var refs = [];
    var slots = dr.slots || [];
    for (var i = 0; i < slots.length; i++) {
      var slotRefs = _collectNodeTokenRefs(slots[i].node);
      for (var j = 0; j < slotRefs.length; j++) refs.push(slotRefs[j]);
    }
    var phrases = dr.adverbialPhrases || [];
    for (var i = 0; i < phrases.length; i++) {
      var phraseRefs = _collectNodeTokenRefs(phrases[i].node);
      for (var j = 0; j < phraseRefs.length; j++) refs.push(phraseRefs[j]);
    }
    return refs;
  }

  /**
   * Extract unique verse refs from tokenRefs, preserving first-occurrence order.
   * "COL 1:9!10" → "COL 1:9"
   * @param {string[]} tokenRefs
   * @returns {string[]}
   */
  function _collectVerseRefs(tokenRefs) {
    var seen = Object.create(null);
    var result = [];
    for (var i = 0; i < tokenRefs.length; i++) {
      var verse = tokenRefs[i].slice(0, 9); /* verseId prefix: n{bb}{ccc}{vvv} (9 chars) */
      if (!seen[verse]) {
        seen[verse] = true;
        result.push(verse);
      }
    }
    return result;
  }

  // ── SF-35 clause role helper ──────────────────────────────────────────

  /**
   * Determine structuralRole for a clause child promoted by SF-35.
   * parentCn: construction.canonical of the containing node (slot.node or ppNpNode).
   * @param {object} clauseChild
   * @param {string|undefined} parentCn
   * @returns {string}
   */
  function _sf35ClauseRole(clauseChild, parentCn) {
    var cn = clauseChild.construction && clauseChild.construction.canonical;
    if (cn === 'PARTICIPIAL_CLAUSE')                             return 'PARTICIPIAL';
    if (cn === 'SUBORDINATE_CLAUSE' || cn === 'CONTENT_CLAUSE') return 'CONTENT';
    if (cn === 'COORDINATION' || cn === 'CONJOINED_CLAUSE')     return 'COORDINATED';
    // bare (cn=undefined) or unrecognised
    if (parentCn === 'NOMINALIZED_CLAUSE')                      return 'NOMINALIZED_CLAUSE';
    return 'RELATIVE';
  }

  // SF-38 helpers: collect clause descendants from GROUP subtree
  function _sf38CollectDescClauseSIs(node, out) {
    var ch = node.children || [];
    for (var _i = 0; _i < ch.length; _i++) {
      if (ch[_i].type === 'clause') {
        var t = _getTokensSorted(ch[_i]);
        for (var _j = 0; _j < t.length; _j++) {
          out.add(t[_j].surfaceIndex);
        }
      } else if (ch[_i].type === 'group') {
        _sf38CollectDescClauseSIs(ch[_i], out);
      }
      // Do not recurse into clause nodes.
      // Their internal sub-clauses are owned by the clause subtree itself.
    }
  }

  function _sf38CollectNestedClauses(node, out) {
    var ch = node.children || [];
    for (var _i = 0; _i < ch.length; _i++) {
      if (ch[_i].type === 'clause') {
        out.push(ch[_i]);
      } else if (ch[_i].type === 'group') {
        _sf38CollectNestedClauses(ch[_i], out);
      }
    }
  }

  // ── NodeType ───────────────────────────────────────────────────────────

  /**
   * Determine nodeType from DR fields.
   * Priority (highest first): ROOT > COORDINATION > CLAUSE_STACK >
   *   PARTICIPIAL_CLAUSE > VERBLESS_CLAUSE > CLAUSE
   * @param {object} dr
   * @param {boolean} isRoot
   * @returns {string}
   */
  function _determineNodeType(dr, isRoot) {
    if (isRoot) return 'ROOT';
    if (dr.isCoordination) return 'COORDINATION';
    var slots     = dr.slots || [];
    var advClauses = dr.adverbialClauses || [];
    if (dr.noVerb && slots.length === 0 && !dr.isCoordination && advClauses.length > 0) {
      return 'CLAUSE_STACK';
    }
    if (dr.isParticipalClause) return 'PARTICIPIAL_CLAUSE';
    if (dr.noVerb && slots.length > 0) return 'VERBLESS_CLAUSE';
    return 'CLAUSE';
  }

  // ── Marker ────────────────────────────────────────────────────────────

  /**
   * Build the marker object for a node.
   * No semantic inference. marker.text is always raw conjunction text or null.
   * @param {object} dr
   * @param {string} structuralRole
   * @param {object|null} relationMeta  { contentConjunction, contentConjunctionRef, contentLabel }
   * @returns {object|null}
   */
  function _buildMarker(dr, structuralRole, relationMeta) {
    if (structuralRole === 'ROOT') return null;

    if (structuralRole === 'CONTENT') {
      return {
        text:     (relationMeta && relationMeta.contentConjunction)    || null,
        label:    (relationMeta && relationMeta.contentLabel)           || null,
        tokenRef: (relationMeta && (relationMeta.contentConjunctionNodeId || relationMeta.contentConjunctionRef)) || null,
      };
    }

    if (structuralRole === 'RELATIVE') {
      return {
        text:     null,
        label:    null,
        tokenRef: dr.relPronNodeId || null,
      };
    }

    // ADVERBIAL | PARTICIPIAL | COORDINATED
    return {
      text:     dr.conjunction       || null,
      label:    null,
      tokenRef: dr.conjunctionNodeId || null,
    };
  }

  // ── Predicate ─────────────────────────────────────────────────────────

  /**
   * Build predicate from PREDICATE/COPULA slots.
   * Uses window.DgEngine.displayText for text — do NOT reimplement.
   * @param {object} dr
   * @returns {object|null}
   */
  function _buildPredicate(dr) {
    var slots = dr.slots || [];
    var predSlots = [];
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].fn === 'PREDICATE' || slots[i].fn === 'COPULA') {
        predSlots.push(slots[i]);
      }
    }
    if (predSlots.length === 0) return null;

    if (predSlots.length === 1) {
      var s = predSlots[0];
      return {
        text:      window.DgEngine.displayText(s.node),
        tokenRefs: _collectNodeTokenRefs(s.node),
      };
    }

    // Multiple PREDICATE/COPULA slots (rare): merge by surfaceIndex order
    var allTokens = [];
    for (var i = 0; i < predSlots.length; i++) {
      var toks = _getTokensSorted(predSlots[i].node);
      for (var j = 0; j < toks.length; j++) allTokens.push(toks[j]);
    }
    allTokens = allTokens.slice().sort(function (a, b) {
      return (a.surfaceIndex == null ? 0 : a.surfaceIndex) -
             (b.surfaceIndex == null ? 0 : b.surfaceIndex);
    });
    var text = allTokens.map(function (t) { return t.text || ''; }).join(' ').trim();
    var tokenRefs = [];
    for (var i = 0; i < allTokens.length; i++) {
      var ref = allTokens[i].evidence && allTokens[i].evidence.nodeId;
      if (ref != null && ref !== '') tokenRefs.push(ref);
    }
    return { text: text, tokenRefs: tokenRefs };
  }

  // ── Arguments ─────────────────────────────────────────────────────────

  /**
   * Convert DR slots (excluding PREDICATE/COPULA) to arguments array.
   * Slot array order is preserved (already si-sorted by dg-engine).
   * @param {object} dr
   * @param {string} parentPath
   * @returns {object[]}
   */
  function _buildArguments(dr, parentPath) {
    var slots  = dr.slots || [];
    var result = [];
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (slot.fn === 'PREDICATE' || slot.fn === 'COPULA') continue;
      if (!ARGUMENT_FNS.has(slot.fn)) continue;

      // SF-30: when slot.modifiers contains clause-type nodes, limit tokenRefs to
      // slot.headSIs (core NP tokens only). The clause modifiers become children
      // via _buildChildren step [5]. headSIs must be non-null and non-empty to apply.
      // Genitive-only / PP-only modifiers (no clause child) fall through to current behavior.
      var _hasMod = false;
      var _modList = slot.modifiers || [];
      for (var _m = 0; _m < _modList.length; _m++) {
        if (_modList[_m].node && _modList[_m].node.type === 'clause') { _hasMod = true; break; }
      }
      var _tokenRefs = (_hasMod && slot.headSIs && slot.headSIs.size > 0)
        ? _collectTokenRefsFromHeadSIs(slot.node, slot.headSIs)
        : _collectNodeTokenRefs(slot.node);

      // SF-32: content-clause wrappers — zero tokenRefs; inner structure is
      // already present as a CONTENT child node from _buildChildren step [1].
      // Only applies to cn ∈ {SUBORDINATE_CLAUSE, CONTENT_CLAUSE, PARTICIPIAL_CLAUSE};
      // bare clauses (cn=undefined) and groups are excluded.
      if (slot.contentClause != null) {
        var _cn = slot.node.construction && slot.node.construction.canonical;
        if (_cn === 'SUBORDINATE_CLAUSE' ||
            _cn === 'CONTENT_CLAUSE'    ||
            _cn === 'PARTICIPIAL_CLAUSE') {
          _tokenRefs = [];
        }
      }

      // SF-35: CLAUSE_AS_NP argument / NOMINALIZED_CLAUSE argument clause extraction.
      // When slot.node.cn === 'CLAUSE_AS_NP' or (type=clause, cn=NOMINALIZED_CLAUSE),
      // exclude embedded clause-child tokens from tokenRefs, keeping only
      // head/non-clause tokens. Clause children become child ClauseFlowNodes via
      // _buildChildren step [7]. Only applied when contentClause is absent
      // (SF-32 zeroing takes precedence when contentClause is present).
      // Zero-clause-child cases fall through unchanged (compact nominalizations etc.).
      if (slot.contentClause == null) {
        var _sf35Cn = slot.node.construction && slot.node.construction.canonical;
        if (_sf35Cn === 'CLAUSE_AS_NP' ||
            (slot.node.type === 'clause' && _sf35Cn === 'NOMINALIZED_CLAUSE')) {
          var _sf35Ch = slot.node.children || [];
          var _sf35SIs = new Set();
          for (var _sf35ci = 0; _sf35ci < _sf35Ch.length; _sf35ci++) {
            if (_sf35Ch[_sf35ci].type !== 'clause') continue;
            var _sf35Toks = _getTokensSorted(_sf35Ch[_sf35ci]);
            for (var _sf35ti = 0; _sf35ti < _sf35Toks.length; _sf35ti++) {
              _sf35SIs.add(_sf35Toks[_sf35ti].surfaceIndex);
            }
          }
          if (_sf35SIs.size > 0) {
            var _sf35NodeToks = _getTokensSorted(slot.node);
            var _sf35Refs = [];
            for (var _sf35ti = 0; _sf35ti < _sf35NodeToks.length; _sf35ti++) {
              if (_sf35SIs.has(_sf35NodeToks[_sf35ti].surfaceIndex)) continue;
              var _sf35R = _sf35NodeToks[_sf35ti].evidence && _sf35NodeToks[_sf35ti].evidence.nodeId;
              if (_sf35R != null && _sf35R !== '') _sf35Refs.push(_sf35R);
            }
            _tokenRefs = _sf35Refs;
          }
        }
      }

      // SF-38: GROUP argument clause extraction (extends SF-37).
      // Recursively collects ALL descendant clause token SIs from the GROUP subtree
      // (including nested GROUP children; stops at clause boundaries).
      // For direct-only GROUPs (catA), behavior is identical to SF-37.
      // For nested-only GROUPs (catB), now fires and excludes nested clause tokens.
      // Clause children emitted via _buildChildren steps [9] (direct) and [10] (nested).
      if (slot.contentClause == null) {
        if (slot.node.type === 'group') {
          var _sf38SIs = new Set();
          _sf38CollectDescClauseSIs(slot.node, _sf38SIs);
          if (_sf38SIs.size > 0) {
            var _sf38NodeToks = _getTokensSorted(slot.node);
            var _sf38Refs = [];
            for (var _sf38ti = 0; _sf38ti < _sf38NodeToks.length; _sf38ti++) {
              if (_sf38SIs.has(_sf38NodeToks[_sf38ti].surfaceIndex)) continue;
              var _sf38R = _sf38NodeToks[_sf38ti].evidence && _sf38NodeToks[_sf38ti].evidence.nodeId;
              if (_sf38R != null && _sf38R !== '') _sf38Refs.push(_sf38R);
            }
            _tokenRefs = _sf38Refs;
          }
        }
      }

      var isCC = slot.contentClause != null;
      result.push({
        function:        slot.fn,
        text:            window.DgEngine.displayText(slot.node),
        tokenRefs:       _tokenRefs,
        isContentClause: isCC,
        contentChildId:  isCC ? (parentPath + '.s[' + i + '].CC') : null,
      });
    }
    return result;
  }

  // ── Phrases ───────────────────────────────────────────────────────────

  /**
   * Convert DR adverbialPhrases to phrases array.
   * SF-35 (subsumes SF-33): when ap.ppNpNode contains any type=clause child,
   * tokenRefs are limited to prep + non-clause NP tokens only. The clause tokens
   * are excluded here; the corresponding child ClauseFlowNodes are emitted by
   * _buildChildren step [6] (CLAUSE_AS_NP ppNpNode) or step [8] (all others).
   * When ppNpNode has no clause children, full tokenRefs are returned unchanged.
   * @param {object} dr
   * @returns {object[]}
   */
  function _buildPhrases(dr) {
    var advPhrases = dr.adverbialPhrases || [];
    var result = [];
    for (var i = 0; i < advPhrases.length; i++) {
      var ap = advPhrases[i];
      var tokenRefs;
      // SF-35: unified clause-child exclusion (subsumes SF-33 CLAUSE_AS_NP check).
      // For CLAUSE_AS_NP ppNpNode the output is identical to SF-33; for all other
      // ppNpNode types with clause children the same exclusion logic applies.
      if (ap.ppNpNode) {
        var _phr35Ch = ap.ppNpNode.children || [];
        var _phr35SIs = new Set();
        for (var _phr35i = 0; _phr35i < _phr35Ch.length; _phr35i++) {
          if (_phr35Ch[_phr35i].type !== 'clause') continue;
          var _phr35ClToks = _getTokensSorted(_phr35Ch[_phr35i]);
          for (var _phr35ti = 0; _phr35ti < _phr35ClToks.length; _phr35ti++) {
            _phr35SIs.add(_phr35ClToks[_phr35ti].surfaceIndex);
          }
        }
        if (_phr35SIs.size > 0) {
          var _phr35PPToks = _getTokensSorted(ap.node);
          var _phr35Refs = [];
          for (var _phr35ti = 0; _phr35ti < _phr35PPToks.length; _phr35ti++) {
            if (_phr35SIs.has(_phr35PPToks[_phr35ti].surfaceIndex)) continue;
            var _phr35R = _phr35PPToks[_phr35ti].evidence && _phr35PPToks[_phr35ti].evidence.nodeId;
            if (_phr35R != null && _phr35R !== '') _phr35Refs.push(_phr35R);
          }
          tokenRefs = _phr35Refs;
        } else {
          tokenRefs = _collectNodeTokenRefs(ap.node);
        }
      } else {
        tokenRefs = _collectNodeTokenRefs(ap.node);
      }
      result.push({
        phraseType: ap.ppPrep != null ? 'PP' : 'ADV',
        prepText:   ap.ppPrep || null,
        text:       window.DgEngine.displayText(ap.node),
        npText:     ap.ppNpNode ? window.DgEngine.displayText(ap.ppNpNode) : null,
        tokenRefs:  tokenRefs,
      });
    }
    return result;
  }

  // ── Modifier DR empty check ───────────────────────────────────────────

  /**
   * Return true when a DR derived from a slot modifier clause has no displayable content.
   * Mirrors dg-engine _isEmptyDR (private) — reimplemented here to avoid cross-module call.
   * @param {object} dr
   * @returns {boolean}
   */
  function _isModDrEmpty(dr) {
    if (!dr) return true;
    if (dr.isCoordination) return (dr.coordClauses || []).length === 0;
    return (dr.slots || []).length === 0 &&
           (dr.adverbialClauses || []).length === 0 &&
           (dr.adverbialPhrases || []).length === 0;
  }

  // ── Children ──────────────────────────────────────────────────────────

  /**
   * Build children array in canonical order:
   *   [1] Content clause children (from slots with contentClause)
   *   [2] Adverbial clause children
   *   [3] Coordination children
   *   [4] Embedded relative clauses — v1: SKIP
   *   [5] Slot modifier clause children (SF-30)
   *   [6] CLAUSE_AS_NP children from adverbialPhrases (SF-33)
   *   [7] CLAUSE_AS_NP / NOMINALIZED_CLAUSE argument slot clause children (SF-35)
   *   [8] Generalized ppNpNode clause children, non-CLAUSE_AS_NP phrases (SF-35)
   *   [9] GROUP argument direct clause children (SF-37)
   *   [10] GROUP argument nested clause children (SF-38)
   * @param {object} dr
   * @param {string} parentPath
   * @returns {ClauseFlowNode[]}
   */
  function _buildChildren(dr, parentPath) {
    var children = [];
    var slots    = dr.slots || [];

    // [1] Content clause children
    for (var i = 0; i < slots.length; i++) {
      var cc = slots[i].contentClause;
      if (!cc || !cc.innerDR) continue;
      var childPath = parentPath + '.s[' + i + '].CC';
      var meta = {
        contentConjunction:        cc.conjunction        || null,
        contentConjunctionRef:     cc.conjunctionRef     || null,
        contentConjunctionNodeId:  cc.conjunctionNodeId  || null,
        contentLabel:              cc.label              || null,
      };
      var child = _buildClauseFlowNode(cc.innerDR, childPath, 'CONTENT', meta);
      if (child) children.push(child);
    }

    // [2] Adverbial clause children
    var advClauses = dr.adverbialClauses || [];
    for (var i = 0; i < advClauses.length; i++) {
      var childDr   = advClauses[i];
      var childPath = parentPath + '.adv[' + i + ']';
      var role;
      if (childDr.isRelativeClause) {
        role = 'RELATIVE';
      } else if (childDr.isParticipalClause) {
        role = 'PARTICIPIAL';
      } else {
        role = 'ADVERBIAL';
      }
      var child = _buildClauseFlowNode(childDr, childPath, role, null);
      if (child) children.push(child);
    }

    // [3] Coordination children
    var coordClauses = dr.coordClauses || [];
    for (var i = 0; i < coordClauses.length; i++) {
      var childDr   = coordClauses[i];
      var childPath = parentPath + '.coord[' + i + ']';
      var child = _buildClauseFlowNode(childDr, childPath, 'COORDINATED', null);
      if (child) children.push(child);
    }

    // [4] Embedded relative clauses: v1 SKIP

    // [5] Slot modifier clause children (SF-30)
    // When a non-PRED/COPULA slot has clause-type entries in slot.modifiers
    // (produced by dg-engine.extractSlotModifiers for ADJ_MOD constructions),
    // derive a DR for each clause modifier and emit it as a child ClauseFlowNode.
    // sourcePath encodes parent slot: '<parentPath>.s[i].mod[j]'.
    // Only clause-type (.node.type === 'clause') modifiers are promoted;
    // token/phrase modifiers remain in the argument tokenRefs via headSIs filtering.
    for (var _si = 0; _si < slots.length; _si++) {
      var _slot = slots[_si];
      if (_slot.fn === 'PREDICATE' || _slot.fn === 'COPULA') continue;
      var _modList = _slot.modifiers || [];
      for (var _mi = 0; _mi < _modList.length; _mi++) {
        var _mod = _modList[_mi];
        if (!_mod.node || _mod.node.type !== 'clause') continue;
        try {
          var _modDr = window.DgEngine.deriveDR(_mod.node);
          if (!_modDr || _isModDrEmpty(_modDr)) continue;
          var _childPath = parentPath + '.s[' + _si + '].mod[' + _mi + ']';
          var _role = _modDr.isParticipalClause ? 'PARTICIPIAL' : 'ADVERBIAL';
          var _child = _buildClauseFlowNode(_modDr, _childPath, _role, null);
          if (_child) children.push(_child);
        } catch (_) { /* silent — modifier DR failure must not block parent node */ }
      }
    }

    // [6] CLAUSE_AS_NP children from adverbialPhrases (SF-33)
    // When a PP's NP child has construction.canonical === 'CLAUSE_AS_NP', each
    // clause child within that NP is promoted to a CLAUSE_AS_NP child ClauseFlowNode.
    // _buildPhrases() has already reduced the corresponding phrase tokenRefs to
    // prep + non-clause NP tokens only.
    // sourcePath: '<parentPath>.ap[i].can[j]' — i=adverbialPhrase index,
    // j=clause-child counter within ppNpNode.children (non-clause siblings skipped).
    var _advPhr = dr.adverbialPhrases || [];
    for (var _api = 0; _api < _advPhr.length; _api++) {
      var _ap = _advPhr[_api];
      if (!_ap.ppNpNode ||
          !_ap.ppNpNode.construction ||
          _ap.ppNpNode.construction.canonical !== 'CLAUSE_AS_NP') continue;
      var _canNpCh = _ap.ppNpNode.children || [];
      var _canIdx = 0;
      for (var _cci = 0; _cci < _canNpCh.length; _cci++) {
        if (_canNpCh[_cci].type !== 'clause') continue;
        try {
          var _canDR = window.DgEngine.deriveDR(_canNpCh[_cci]);
          if (_canDR) {
            var _canPath = parentPath + '.ap[' + _api + '].can[' + _canIdx + ']';
            var _canChild = _buildClauseFlowNode(_canDR, _canPath, 'CLAUSE_AS_NP', null);
            if (_canChild) children.push(_canChild);
          }
        } catch (_) { /* silent — must not block parent */ }
        _canIdx++;
      }
    }

    // [7] CLAUSE_AS_NP / NOMINALIZED_CLAUSE argument slot clause children (SF-35)
    // When a non-PRED/COPULA slot has slot.node.cn === 'CLAUSE_AS_NP' or
    // (type=clause, cn=NOMINALIZED_CLAUSE), each type=clause child of slot.node
    // is promoted to a child ClauseFlowNode.
    // _buildArguments() has already reduced the corresponding argument tokenRefs
    // to non-clause tokens only.
    // sourcePath: '<parentPath>.s[i].can[j]' — i=slot index, j=clause-child counter
    // (non-clause siblings skipped in counting).
    for (var _sf35si = 0; _sf35si < slots.length; _sf35si++) {
      var _sf35slot = slots[_sf35si];
      if (_sf35slot.fn === 'PREDICATE' || _sf35slot.fn === 'COPULA') continue;
      if (_sf35slot.contentClause != null) continue; // SF-32 handles these
      if (!_sf35slot.node) continue;
      var _sf35slotCn  = _sf35slot.node.construction && _sf35slot.node.construction.canonical;
      var _sf35isCAN   = (_sf35slotCn === 'CLAUSE_AS_NP');
      var _sf35isNOM   = (!_sf35isCAN &&
                          _sf35slot.node.type === 'clause' &&
                          _sf35slotCn === 'NOMINALIZED_CLAUSE');
      if (!_sf35isCAN && !_sf35isNOM) continue;
      var _sf35slotCh  = _sf35slot.node.children || [];
      var _sf35canIdx7 = 0;
      for (var _sf35ci7 = 0; _sf35ci7 < _sf35slotCh.length; _sf35ci7++) {
        if (_sf35slotCh[_sf35ci7].type !== 'clause') continue;
        try {
          var _sf35DR = window.DgEngine.deriveDR(_sf35slotCh[_sf35ci7]);
          if (_sf35DR) {
            var _sf35role  = _sf35isCAN
              ? 'CLAUSE_AS_NP'
              : _sf35ClauseRole(_sf35slotCh[_sf35ci7], _sf35slotCn);
            var _sf35path  = parentPath + '.s[' + _sf35si + '].can[' + _sf35canIdx7 + ']';
            var _sf35child = _buildClauseFlowNode(_sf35DR, _sf35path, _sf35role, null);
            if (_sf35child) children.push(_sf35child);
          }
        } catch (_) { /* silent — must not block parent */ }
        _sf35canIdx7++;
      }
    }

    // [8] Generalized ppNpNode clause children, non-CLAUSE_AS_NP phrases (SF-35)
    // Extends step [6] to all ppNpNode types that contain type=clause children.
    // Step [6] retains exclusive responsibility for CLAUSE_AS_NP ppNpNode (role=CLAUSE_AS_NP).
    // This step handles NOMINALIZED_CLAUSE, APPOSITION, NP_COMPLEX, ADJ_MOD,
    // GENITIVE_MOD, bare clause, PARTICIPIAL_CLAUSE, and any other ppNpNode type.
    // sourcePath: '<parentPath>.ap[i].can[j]' (same format as step [6]).
    for (var _sf35api8 = 0; _sf35api8 < _advPhr.length; _sf35api8++) {
      var _sf35ap8 = _advPhr[_sf35api8];
      if (!_sf35ap8.ppNpNode) continue;
      var _sf35apCn8 = _sf35ap8.ppNpNode.construction && _sf35ap8.ppNpNode.construction.canonical;
      if (_sf35apCn8 === 'CLAUSE_AS_NP') continue; // handled by step [6]
      var _sf35apCh8   = _sf35ap8.ppNpNode.children || [];
      var _sf35canIdx8 = 0;
      for (var _sf35apci8 = 0; _sf35apci8 < _sf35apCh8.length; _sf35apci8++) {
        if (_sf35apCh8[_sf35apci8].type !== 'clause') continue;
        try {
          var _sf35apDR8 = window.DgEngine.deriveDR(_sf35apCh8[_sf35apci8]);
          if (_sf35apDR8) {
            var _sf35apRole8  = _sf35ClauseRole(_sf35apCh8[_sf35apci8], _sf35apCn8);
            var _sf35apPath8  = parentPath + '.ap[' + _sf35api8 + '].can[' + _sf35canIdx8 + ']';
            var _sf35apChild8 = _buildClauseFlowNode(_sf35apDR8, _sf35apPath8, _sf35apRole8, null);
            if (_sf35apChild8) children.push(_sf35apChild8);
          }
        } catch (_) { /* silent — must not block parent */ }
        _sf35canIdx8++;
      }
    }

    // [9] GROUP argument direct clause children (SF-37)
    // When a non-PRED/COPULA slot has slot.node.type === 'group', each direct
    // type=clause child of that GROUP is promoted to a child ClauseFlowNode.
    // _buildArguments() has already excluded the clause children's tokens from
    // the argument tokenRefs. Only direct children are targeted; nested
    // GROUP → GROUP → clause structures are intentionally deferred to SF-38.
    // sourcePath: '<parentPath>.s[i].can[j]' — i=slot index, j=clause-child counter
    // (non-clause GROUP siblings are skipped in counting).
    for (var _sf37si = 0; _sf37si < slots.length; _sf37si++) {
      var _sf37slot = slots[_sf37si];
      if (_sf37slot.fn === 'PREDICATE' || _sf37slot.fn === 'COPULA') continue;
      if (_sf37slot.contentClause != null) continue; // SF-32 takes precedence
      if (!_sf37slot.node || _sf37slot.node.type !== 'group') continue;
      var _sf37slotCh  = _sf37slot.node.children || [];
      var _sf37canIdx9 = 0;
      for (var _sf37ci9 = 0; _sf37ci9 < _sf37slotCh.length; _sf37ci9++) {
        if (_sf37slotCh[_sf37ci9].type !== 'clause') continue;
        try {
          var _sf37DR = window.DgEngine.deriveDR(_sf37slotCh[_sf37ci9]);
          if (_sf37DR) {
            var _sf37role  = _sf35ClauseRole(_sf37slotCh[_sf37ci9], null);
            var _sf37path  = parentPath + '.s[' + _sf37si + '].can[' + _sf37canIdx9 + ']';
            var _sf37child = _buildClauseFlowNode(_sf37DR, _sf37path, _sf37role, null);
            if (_sf37child) children.push(_sf37child);
          }
        } catch (_) { /* silent — must not block parent */ }
        _sf37canIdx9++;
      }
    }

    // [10] GROUP argument nested clause children (SF-38)
    // Clause descendants of nested GROUP children, sorted by surfaceIndex.
    // can[j] continues after the direct-clause children emitted by SF-37.
    for (var _sf38si = 0; _sf38si < slots.length; _sf38si++) {
      var _sf38slot = slots[_sf38si];

      if (_sf38slot.fn === 'PREDICATE' || _sf38slot.fn === 'COPULA') continue;
      if (_sf38slot.contentClause != null) continue;
      if (!_sf38slot.node || _sf38slot.node.type !== 'group') continue;

      // Count direct clauses already emitted by SF-37.
      var _sf38canBase = 0;
      var _sf38dirCh = _sf38slot.node.children || [];

      for (var _sf38bi = 0; _sf38bi < _sf38dirCh.length; _sf38bi++) {
        if (_sf38dirCh[_sf38bi].type === 'clause') {
          _sf38canBase++;
        }
      }

      // Collect clauses under nested GROUP children.
      var _sf38nested = [];

      for (var _sf38gi = 0; _sf38gi < _sf38dirCh.length; _sf38gi++) {
        if (_sf38dirCh[_sf38gi].type !== 'group') continue;

        _sf38CollectNestedClauses(
          _sf38dirCh[_sf38gi],
          _sf38nested
        );
      }

      if (_sf38nested.length === 0) continue;

      // Deterministic source order.
      _sf38nested.sort(function(a, b) {
        var at = _getTokensSorted(a);
        var bt = _getTokensSorted(b);

        return (at.length ? at[0].surfaceIndex : 0) -
               (bt.length ? bt[0].surfaceIndex : 0);
      });

      for (var _sf38ni = 0; _sf38ni < _sf38nested.length; _sf38ni++) {
        try {
          var _sf38DR =
            window.DgEngine.deriveDR(_sf38nested[_sf38ni]);

          if (_sf38DR) {
            var _sf38role =
              _sf35ClauseRole(_sf38nested[_sf38ni], null);

            var _sf38path =
              parentPath +
              '.s[' + _sf38si + '].can[' +
              (_sf38canBase + _sf38ni) +
              ']';

            var _sf38child =
              _buildClauseFlowNode(
                _sf38DR,
                _sf38path,
                _sf38role,
                null
              );

            if (_sf38child) {
              children.push(_sf38child);
            }
          }
        } catch (_) {
          // Nested GROUP child failure must not block parent construction.
        }
      }
    }

    return children;
  }

  // ── Node Builder ───────────────────────────────────────────────────────

  /**
   * Build a single ClauseFlowNode from a DR_Clause.
   * Pure transformation — DR is never mutated.
   * @param {object}      dr             DR_Clause
   * @param {string}      sourcePath
   * @param {string}      structuralRole ROOT|CONTENT|RELATIVE|PARTICIPIAL|ADVERBIAL|COORDINATED
   * @param {object|null} relationMeta   { contentConjunction, contentLabel } for CONTENT nodes
   * @returns {object|null}
   */
  function _buildClauseFlowNode(dr, sourcePath, structuralRole, relationMeta) {
    try {
      var isRoot   = (structuralRole === 'ROOT');
      var nodeType = _determineNodeType(dr, isRoot);
      var marker   = _buildMarker(dr, structuralRole, relationMeta);
      var predicate = _buildPredicate(dr);
      var args     = _buildArguments(dr, sourcePath);
      var phrases  = _buildPhrases(dr);
      var children = _buildChildren(dr, sourcePath);

      var ownTokenRefs = _collectOwnTokenRefs(dr);
      var verseRefs    = _collectVerseRefs(ownTokenRefs);

      return {
        id:             dr.id || sourcePath,
        sourcePath:     sourcePath,
        nodeType:       nodeType,
        structuralRole: structuralRole,
        marker:         marker,
        predicate:      predicate,
        arguments:      args,
        phrases:        phrases,
        flags: {
          noVerb:             !!dr.noVerb,
          isParticipalClause: !!dr.isParticipalClause,
          isRelativeClause:   !!dr.isRelativeClause,
          isClauseStack:      nodeType === 'CLAUSE_STACK',
          isCoordination:     !!dr.isCoordination,
        },
        children: children,
        refs: {
          drId:      dr.id || null,
          verseRefs: verseRefs,
        },
      };
    } catch (_) {
      return null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Build a Canonical ClauseFlowTree v1 from a DR_Clause.
   *
   * The DR must be obtained externally via window.DgEngine.deriveDR().
   * Pass the annotated DR (after _annotateRelClauses) for correct
   * isRelativeClause / relPronRef values on adverbial sub-clauses.
   *
   * @param {object} dr             DR_Clause (from deriveDR)
   * @param {string} sentenceRef    sentence.ref  e.g. "COL 1:3"
   * @param {number} flatNodeCount  sentence.flatNodeCount
   * @returns {{ sentenceRef, flatNodeCount, root, version }|null}
   */
  function buildClauseFlowTree(dr, sentenceRef, flatNodeCount) {
    if (dr == null) return null;

    var root = _buildClauseFlowNode(dr, 'root', 'ROOT', null);
    if (root == null) return null;

    return {
      sentenceRef:   sentenceRef   || '',
      flatNodeCount: flatNodeCount || 0,
      root:          root,
      version:       1,
    };
  }

  // ── Export ────────────────────────────────────────────────────────────

  global.ClauseFlowEngine = { buildClauseFlowTree: buildClauseFlowTree };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
