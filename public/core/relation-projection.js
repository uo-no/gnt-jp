/**
 * relation-projection.js — Phase 6-2-E-3
 *
 * Relation Projection — ClauseFlowTree v1 → Relation[]
 *
 * Pure data transformation. No DOM, no layout, no inference.
 * L-0 boundary strictly maintained: only structural facts from CFT
 * and morphologically-confirmed referent data are projected.
 *
 * Pipeline position:
 *   ClauseFlowTree v1 (built by clause-flow-engine.js)
 *     + tokenMap  (Map<evidence.ref, elDataToken>)
 *     + elDataArr (flat elData token array for the chapter)
 *   → Relation[]
 *
 * Relation schema:
 *   { sourceId: string, targetId: string, type: RelationType, evidence?: object }
 *
 * RelationType values (v1):
 *   ADVERBIAL | CONTENT | RELATIVE | PARTICIPIAL |
 *   CLAUSE_AS_NP | NOMINALIZED_CLAUSE | COORDINATED |
 *   RELATIVE_ANTECEDENT
 *
 * CLAUSE_STACK handling:
 *   CLAUSE_STACK nodes are skipped in the Relation View.
 *   Their children connect directly to the CLAUSE_STACK's logical parent
 *   using each child's own structuralRole as the edge type.
 *
 * RELATIVE_ANTECEDENT derivation (3-step chain):
 *   relNode.marker.tokenRef
 *     → tokenMap.get(pronRef).referent   (MACULA verseId)
 *     → verseIdMap.get(referent).ref     (antecedent evidence.ref)
 *     → tokenRefToNodeId.get(antRef)     (CFT node containing antecedent)
 *   All eligibility guards match dg-engine.js deriveRelativeConnectors.
 *
 * Exports: window.RelationProjection = { buildRelationProjection }
 */
(function (global) {
  'use strict';

  // ── Valid structural roles that become Relation types ──────────────────
  // Matches structuralRole values in ClauseFlowTree v1 (clause-flow-engine.js).
  // ROOT is excluded: ROOT nodes have no incoming Relation.
  // CLAUSE_STACK is excluded: CLAUSE_STACK nodes are skipped entirely.
  var STRUCTURAL_ROLE_TYPES = new Set([
    'ADVERBIAL',
    'CONTENT',
    'RELATIVE',
    'PARTICIPIAL',
    'CLAUSE_AS_NP',
    'NOMINALIZED_CLAUSE',
    'COORDINATED',
  ]);

  // ── Morphology Guard ──────────────────────────────────────────────────
  // Identifies nominal morphology in elData .morph field.
  // Allows: noun (N-), adjective/numeral (A-), participial (V- mood=P at [4]).
  // Forbids: finite verb, article, conjunction, preposition, particle, etc.
  // Matches _isNominalMorph in dg-engine.js exactly.
  function _isNominalMorph(morph) {
    if (!morph || typeof morph !== 'string') return false;
    if (morph.startsWith('N-')) return true;
    if (morph.startsWith('A-')) return true;
    // Participial: V-XYP where morph[4] === 'P' (mood position)
    // e.g. V-AAP-NSM (aorist active participle), V-PAP-NPM (present active participle)
    // This check correctly excludes V-2AAI-2P (indicative, morph[4]='A') etc.
    return morph.startsWith('V-') && morph.length > 4 && morph[4] === 'P';
  }

  // ── Index: verseIdMap ─────────────────────────────────────────────────
  // Build Map<verseId, elDataToken> for O(1) antecedent token lookup.
  // elData.referent values are MACULA verseId strings (e.g. "n51001012003").
  function _buildVerseIdMap(elDataArr) {
    var map = new Map();
    for (var i = 0; i < elDataArr.length; i++) {
      var t = elDataArr[i];
      if (t.verseId) map.set(t.verseId, t);
    }
    return map;
  }

  // ── Index: tokenRefToNodeId ───────────────────────────────────────────
  // Build Map<tokenRef, CFT_nodeId> by walking the CFT in post-order.
  // Post-order (children before parent) ensures the most specific
  // (deepest) CFT node claims each token ref first.
  //
  // This is important for RELATIVE_ANTECEDENT precision: when a parent
  // node's isContentClause argument tokenRefs overlap with a child node's
  // own tokenRefs (e.g. ROOT's OBJECT content-clause wrapper covers all
  // sentence tokens), the child's more specific claim takes priority.
  // Without post-order, ROOT would claim πατρὶ (COL 1:12!3) even though
  // it properly belongs to the PARTICIPIAL_CLAUSE "εὐχαριστοῦντες τῷ πατρί".
  //
  // Only the first node to record a token ref is kept (no overwrite).
  function _buildTokenRefToNodeId(cftRoot) {
    var map = new Map();
    _indexNodeTokenRefs(cftRoot, map);
    return map;
  }

  function _indexNodeTokenRefs(node, map) {
    if (!node) return;
    var nodeId = node.id || node.sourcePath;
    if (!nodeId) return;

    // Post-order: recurse into children FIRST so deeper nodes take priority
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      _indexNodeTokenRefs(children[i], map);
    }

    // Then record this node's own token refs (only if not already claimed)
    var pred = node.predicate;
    if (pred && pred.tokenRefs) _recordRefs(pred.tokenRefs, nodeId, map);

    var args = node.arguments || [];
    for (var i = 0; i < args.length; i++) {
      _recordRefs(args[i].tokenRefs || [], nodeId, map);
    }

    var phrases = node.phrases || [];
    for (var i = 0; i < phrases.length; i++) {
      _recordRefs(phrases[i].tokenRefs || [], nodeId, map);
    }

    // Marker token ref (e.g. relative pronoun on RELATIVE nodes)
    if (node.marker && node.marker.tokenRef) {
      if (!map.has(node.marker.tokenRef)) map.set(node.marker.tokenRef, nodeId);
    }
  }

  function _recordRefs(refs, nodeId, map) {
    for (var i = 0; i < refs.length; i++) {
      if (!map.has(refs[i])) map.set(refs[i], nodeId);
    }
  }

  // ── RELATIVE_ANTECEDENT Derivation ────────────────────────────────────
  // Attempt to derive a RELATIVE_ANTECEDENT Relation for a node with
  // flags.isRelativeClause === true.
  //
  // Returns a Relation object or null if any guard fails.
  //
  // Guards (G1–G7 match dg-engine.js deriveRelativeConnectors; G8 is Projection-only):
  //   G1: marker.tokenRef must be present (relative pronoun ref)
  //   G2: tokenMap must contain the pronoun token
  //   G3: pronoun token must have a non-empty string .referent field
  //   G4: referent must not contain a space (multi-token antecedent skip)
  //   G5: antecedent token must exist in verseIdMap
  //   G6: antecedent token morph must be nominal (_isNominalMorph)
  //   G7: antecedent token ref must map to a CFT node in tokenRefToNodeId
  //       (fails for cross-sentence antecedents — correct L-0 behavior)
  //   G8: antecedent CFT node must differ from the relative clause node itself
  //       (prevents self-loops when the antecedent noun is in the same CFT node's
  //        own phrase tokenRefs, e.g. COL 1:24 σώματος in the RELATIVE's PP phrase)
  function _deriveAntecedentRelation(relNode, tokenMap, verseIdMap, tokenRefToNodeId) {
    var relNodeId = relNode.id || relNode.sourcePath;

    // G1
    var marker = relNode.marker;
    if (!marker || !marker.tokenRef) return null;
    var pronRef = marker.tokenRef;

    // G2
    var pronTok = tokenMap.get(pronRef);
    if (!pronTok) return null;

    // G3
    var referent = pronTok.referent;
    if (!referent || typeof referent !== 'string' || referent.trim() === '') return null;

    // G4: multi-token antecedent skip
    if (referent.indexOf(' ') !== -1) return null;

    // G5
    var antTok = verseIdMap.get(referent);
    if (!antTok) return null;

    // G6: nominal morphology guard
    if (!_isNominalMorph(antTok.morph)) return null;

    // G7: antecedent must be within this sentence's CFT
    var antNodeId = tokenRefToNodeId.get(antTok.verseId);
    if (!antNodeId) return null;

    // G8: self-loop prevention — antecedent node must differ from the relative clause node
    if (antNodeId === relNodeId) return null;

    return {
      sourceId: relNodeId,
      targetId: antNodeId,
      type:     'RELATIVE_ANTECEDENT',
      evidence: {
        derivedFrom:      'antecedent',
        tokenNodeId:      pronRef,
        antecedentNodeId: antTok.verseId,
        antecedentRef:    antTok.ref,
      },
    };
  }

  // ── Tree Traversal ────────────────────────────────────────────────────
  // Pre-order DFS over the CFT.
  // Emits one structural Relation per parent → child edge, using the
  // child's structuralRole as the Relation type.
  // CLAUSE_STACK nodes are skipped: their children are projected directly
  // to the CLAUSE_STACK's logical parent (i.e. the grandparent in the CFT).
  //
  // @param {object}      node             Current CFT node
  // @param {string|null} parentId         Logical parent's id (null for ROOT)
  // @param {Relation[]}  relations        Accumulator (mutated in place)
  // @param {Map}         tokenMap         Map<ref, elDataToken>
  // @param {Map}         verseIdMap       Map<verseId, elDataToken>
  // @param {Map}         tokenRefToNodeId Map<ref, CFT_nodeId>
  function _project(node, parentId, relations, tokenMap, verseIdMap, tokenRefToNodeId) {
    if (!node) return;

    // CLAUSE_STACK: transparent pass-through — skip this node,
    // pass the same parentId down to children so they connect directly
    // to the logical grandparent. Handles nested CLAUSE_STACKs naturally.
    if (node.nodeType === 'CLAUSE_STACK') {
      var csChildren = node.children || [];
      for (var i = 0; i < csChildren.length; i++) {
        _project(csChildren[i], parentId, relations, tokenMap, verseIdMap, tokenRefToNodeId);
      }
      return;
    }

    var nodeId = node.id || node.sourcePath;

    // Emit structural Relation from parent to this node.
    // ROOT nodes have no parent → no incoming Relation.
    if (node.structuralRole !== 'ROOT' && parentId !== null && nodeId) {
      var relType = node.structuralRole;
      if (STRUCTURAL_ROLE_TYPES.has(relType)) {
        relations.push({
          sourceId: parentId,
          targetId: nodeId,
          type:     relType,
          evidence: { derivedFrom: 'children' },
        });
      }
    }

    // RELATIVE_ANTECEDENT: only for nodes flagged as relative clauses.
    if (node.flags && node.flags.isRelativeClause && nodeId) {
      var antRel = _deriveAntecedentRelation(
        node, tokenMap, verseIdMap, tokenRefToNodeId
      );
      if (antRel) relations.push(antRel);
    }

    // Recurse into children in CFT children[] order (deterministic).
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      _project(children[i], nodeId, relations, tokenMap, verseIdMap, tokenRefToNodeId);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Build Relation[] from a ClauseFlowTree v1.
   *
   * Pure function — same inputs always produce identical output.
   * No DOM access, no external state, no side effects.
   *
   * Relation types produced (v1):
   *   ADVERBIAL, CONTENT, RELATIVE, PARTICIPIAL,
   *   CLAUSE_AS_NP, NOMINALIZED_CLAUSE, COORDINATED,
   *   RELATIVE_ANTECEDENT
   *
   * Types NOT produced (outside L-0):
   *   - Word-level dependency (no head/governor in any data source)
   *   - Modifier → head for non-clause modifiers (merged in CFT tokenRefs)
   *   - Adverbial clause → specific predicate target (no explicit data)
   *   - Pronoun → referent (Pronoun Resolution violates L-0)
   *   - PP → target noun or verb (no explicit data)
   *
   * @param {object}   cft        ClauseFlowTree v1 ({ sentenceRef, root, version, ... })
   * @param {Map}      tokenMap   Map<evidence.ref, elDataToken>
   * @param {object[]} elDataArr  Flat elData token array (chapter or sentence scope)
   * @returns {Relation[]}
   */
  function buildRelationProjection(cft, tokenMap, elDataArr) {
    if (!cft || !cft.root) return [];

    var safeTokenMap  = tokenMap  || new Map();
    var safeElData    = elDataArr || [];

    // Pre-build O(1) indexes before traversal
    var verseIdMap       = _buildVerseIdMap(safeElData);
    var tokenRefToNodeId = _buildTokenRefToNodeId(cft.root);

    var relations = [];
    _project(cft.root, null, relations, safeTokenMap, verseIdMap, tokenRefToNodeId);

    return relations;
  }

  // ── Export ────────────────────────────────────────────────────────────
  global.RelationProjection = {
    buildRelationProjection: buildRelationProjection,
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
