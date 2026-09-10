/**
 * clause-flow-engine.js — Phase 6-2-C
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
 *    → ClauseFlowRenderer       (Phase 6-2-D — not yet implemented)
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
      var ref = tokens[i].evidence && tokens[i].evidence.ref;
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
      var verse = tokenRefs[i].split('!')[0];
      if (!seen[verse]) {
        seen[verse] = true;
        result.push(verse);
      }
    }
    return result;
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
        tokenRef: (relationMeta && relationMeta.contentConjunctionRef) || null,
      };
    }

    if (structuralRole === 'RELATIVE') {
      return {
        text:     null,
        label:    null,
        tokenRef: dr.relPronRef || null,
      };
    }

    // ADVERBIAL | PARTICIPIAL | COORDINATED
    return {
      text:     dr.conjunction    || null,
      label:    null,
      tokenRef: dr.conjunctionRef || null,
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
      var ref = allTokens[i].evidence && allTokens[i].evidence.ref;
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

      var isCC = slot.contentClause != null;
      result.push({
        function:        slot.fn,
        text:            window.DgEngine.displayText(slot.node),
        tokenRefs:       _collectNodeTokenRefs(slot.node),
        isContentClause: isCC,
        contentChildId:  isCC ? (parentPath + '.s[' + i + '].CC') : null,
      });
    }
    return result;
  }

  // ── Phrases ───────────────────────────────────────────────────────────

  /**
   * Convert DR adverbialPhrases to phrases array.
   * @param {object} dr
   * @returns {object[]}
   */
  function _buildPhrases(dr) {
    var advPhrases = dr.adverbialPhrases || [];
    var result = [];
    for (var i = 0; i < advPhrases.length; i++) {
      var ap = advPhrases[i];
      result.push({
        phraseType: ap.ppPrep != null ? 'PP' : 'ADV',
        prepText:   ap.ppPrep || null,
        text:       window.DgEngine.displayText(ap.node),
        npText:     ap.ppNpNode ? window.DgEngine.displayText(ap.ppNpNode) : null,
        tokenRefs:  _collectNodeTokenRefs(ap.node),
      });
    }
    return result;
  }

  // ── Children ──────────────────────────────────────────────────────────

  /**
   * Build children array in canonical order:
   *   [1] Content clause children (from slots with contentClause)
   *   [2] Adverbial clause children
   *   [3] Coordination children
   *   [4] Embedded relative clauses — v1: SKIP
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
        contentConjunction:    cc.conjunction    || null,
        contentConjunctionRef: cc.conjunctionRef || null,
        contentLabel:          cc.label          || null,
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
