/**
 * clause-flow-renderer.js — Phase 6-2-D-1
 *
 * ClauseFlow Renderer — ClauseFlowTree v1 → HTMLElement
 *
 * Pipeline position:
 *   ClauseFlowEngine.buildClauseFlowTree()
 *    → ClauseFlowTree v1
 *    → createClauseFlowView(cft, options)   ← this module
 *    → HTMLElement
 *
 * Purity contract:
 *   - No DOM measurement (getBoundingClientRect / offsetWidth / ResizeObserver absent)
 *   - No SVG
 *   - No pipeline invocation (DgEngine / RkRenderer / RkSemanticLayout etc. absent)
 *   - Returns HTMLElement; never appends to document itself
 *   - Does not mutate input CFT
 *   - global.document access for Node.js test compatibility
 *
 * Input schema (ClauseFlowTree v1):
 *   { version: 1, sentenceRef, flatNodeCount, root: ClauseFlowNode }
 *
 * ClauseFlowNode schema (read from clause-flow-engine.js):
 *   { id, sourcePath, nodeType, structuralRole, marker, predicate,
 *     arguments, phrases, flags, children, refs }
 *
 * nodeType values:
 *   ROOT | COORDINATION | CLAUSE_STACK | PARTICIPIAL_CLAUSE | VERBLESS_CLAUSE | CLAUSE
 *
 * structuralRole values:
 *   ROOT | CONTENT | RELATIVE | PARTICIPIAL | ADVERBIAL | COORDINATED
 *
 * Exports: window.ClauseFlowRenderer = { createClauseFlowView }
 */
(function (global) {
  'use strict';

  // ── Japanese display labels ────────────────────────────────────────────────

  var ROLE_LABEL = {
    ROOT:        '主文',
    CONTENT:     '内容節',
    RELATIVE:    '関係節',
    PARTICIPIAL: '分詞節',
    ADVERBIAL:   '副詞節',
    COORDINATED: '等位節',
  };

  // NODETYPE_LABEL: empty string = no badge rendered.
  // PARTICIPIAL_CLAUSE is '' because structuralRole=PARTICIPIAL already shows '分詞節'.
  var NODETYPE_LABEL = {
    ROOT:               '',
    CLAUSE:             '',
    VERBLESS_CLAUSE:    '動詞省略',
    PARTICIPIAL_CLAUSE: '',
    CLAUSE_STACK:       '節群',
    COORDINATION:       '等位接続',
  };

  var ARG_LABEL = {
    SUBJECT:         '主語',
    OBJECT:          '目的語',
    COMPLEMENT:      '補語',
    INDIRECT_OBJECT: '間接目的語',
    SECOND_OBJECT:   '第二目的語',
    AUX:             '助動詞',
  };

  // ── Document access ───────────────────────────────────────────────────────

  function _doc() {
    return global.document || null;
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────

  function _el(tag, className) {
    var doc = _doc();
    if (!doc) throw new Error('ClauseFlowRenderer: document unavailable');
    var el = doc.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  function _setText(el, str) {
    el.textContent = str || '';
    return el;
  }

  // ── Token click ───────────────────────────────────────────────────────────

  function _makeClickable(el, tokenRefs, opts) {
    if (!tokenRefs || tokenRefs.length === 0 || !opts.onTokenClick) return;
    var ref  = tokenRefs[0];
    var data = opts.tokenMap ? (opts.tokenMap[ref] || null) : null;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    if (data && data.text) el.setAttribute('aria-label', data.text);
    el.classList.add('cf-clickable');
    el.addEventListener('click', function () { opts.onTokenClick(ref, data); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        opts.onTokenClick(ref, data);
      }
    });
  }

  // ── Predicate row ─────────────────────────────────────────────────────────

  function _renderPredicate(pred, opts) {
    if (!pred) return null;
    var row   = _el('div', 'cf-row cf-predicate');
    var label = _setText(_el('span', 'cf-label'), '述語');
    var val   = _setText(_el('span', 'cf-text cf-greek'), pred.text || '');
    _makeClickable(val, pred.tokenRefs, opts);
    row.appendChild(label);
    row.appendChild(val);
    return row;
  }

  // ── Argument row ──────────────────────────────────────────────────────────

  function _renderArgument(arg, opts) {
    var row   = _el('div', 'cf-row cf-argument');
    row.setAttribute('data-fn', arg.function || '');
    var label = _setText(_el('span', 'cf-label'), ARG_LABEL[arg.function] || arg.function || '');
    var cls   = arg.isContentClause ? 'cf-text cf-greek cf-text--cc' : 'cf-text cf-greek';
    var val   = _setText(_el('span', cls), arg.text || '');
    _makeClickable(val, arg.tokenRefs, opts);
    row.appendChild(label);
    row.appendChild(val);
    return row;
  }

  // ── Phrase row ────────────────────────────────────────────────────────────

  function _renderPhrase(phrase, opts) {
    var row   = _el('div', 'cf-row cf-phrase');
    row.setAttribute('data-phrase-type', phrase.phraseType || '');
    var labelText = phrase.phraseType === 'PP' ? 'PP' : '副詞';
    var label = _setText(_el('span', 'cf-label'), labelText);
    var displayText;
    if (phrase.phraseType === 'PP' && phrase.prepText) {
      displayText = phrase.prepText + ' ' + (phrase.npText || phrase.text || '');
    } else {
      displayText = phrase.text || '';
    }
    var val = _setText(_el('span', 'cf-text cf-greek'), displayText);
    _makeClickable(val, phrase.tokenRefs, opts);
    row.appendChild(label);
    row.appendChild(val);
    return row;
  }

  // ── Node ──────────────────────────────────────────────────────────────────

  function _renderNode(node, opts) {
    if (!node) return null;

    var nodeEl = _el('div', 'cf-node');
    nodeEl.setAttribute('data-node-type',       node.nodeType       || '');
    nodeEl.setAttribute('data-structural-role', node.structuralRole || '');
    nodeEl.setAttribute('data-source-path',     node.sourcePath     || '');

    // ── Header ──────────────────────────────────────────────────────────

    var headerEl    = _el('div', 'cf-node-header');
    var headerEmpty = true;

    // Marker: conjunction text or relative pronoun label — non-ROOT only
    if (node.marker && node.structuralRole !== 'ROOT') {
      var markerText = node.marker.text || node.marker.label;
      // P1-5: RELATIVE — resolve tokenRef to Greek text via tokenMap (token lookup, not inference)
      if (!markerText && node.marker.tokenRef && opts.tokenMap) {
        var _relTok = opts.tokenMap[node.marker.tokenRef];
        if (_relTok && _relTok.text) markerText = _relTok.text;
      }
      if (markerText) {
        headerEl.appendChild(_setText(_el('span', 'cf-marker cf-greek'), markerText));
        headerEmpty = false;
      }
    }

    // Role label — non-ROOT only
    if (node.structuralRole && node.structuralRole !== 'ROOT') {
      var roleLabel = ROLE_LABEL[node.structuralRole];
      if (roleLabel) {
        headerEl.appendChild(_setText(_el('span', 'cf-role'), roleLabel));
        headerEmpty = false;
      }
    }

    // NodeType badge — only when the label is non-empty (CLAUSE / ROOT have empty label)
    var nodetypeLabel = NODETYPE_LABEL[node.nodeType] || '';
    if (nodetypeLabel) {
      var typeEl = _setText(_el('span', 'cf-nodetype'), nodetypeLabel);
      typeEl.setAttribute('data-type', node.nodeType || '');
      headerEl.appendChild(typeEl);
      headerEmpty = false;
    }

    if (!headerEmpty) nodeEl.appendChild(headerEl);

    // ── Content: predicate + arguments + phrases ─────────────────────────

    // P1-1: flags.noVerb is a CFT structural fact — show hint when predicate slot is absent
    var _showVerblessHint = !node.predicate &&
                            node.flags && node.flags.noVerb &&
                            !node.flags.isClauseStack;

    var hasContent = node.predicate ||
                     _showVerblessHint ||
                     (node.arguments && node.arguments.length > 0) ||
                     (node.phrases   && node.phrases.length   > 0);

    if (hasContent) {
      var contentEl = _el('div', 'cf-node-content');

      var predRow = _renderPredicate(node.predicate, opts);
      if (predRow) contentEl.appendChild(predRow);

      if (_showVerblessHint) {
        var _omitRow = _el('div', 'cf-row cf-predicate');
        _omitRow.setAttribute('data-predicate-omitted', 'true');
        _omitRow.appendChild(_setText(_el('span', 'cf-label'), '述語'));
        _omitRow.appendChild(_setText(_el('span', 'cf-omitted-hint'), '述語省略'));
        contentEl.appendChild(_omitRow);
      }

      var args = node.arguments || [];
      for (var ai = 0; ai < args.length; ai++) {
        contentEl.appendChild(_renderArgument(args[ai], opts));
      }

      var phrases = node.phrases || [];
      for (var pi = 0; pi < phrases.length; pi++) {
        contentEl.appendChild(_renderPhrase(phrases[pi], opts));
      }

      nodeEl.appendChild(contentEl);
    }

    // ── Children ─────────────────────────────────────────────────────────

    var children = node.children || [];
    if (children.length > 0) {
      var childrenEl = _el('div', 'cf-children');
      for (var ci = 0; ci < children.length; ci++) {
        var childEl = _renderNode(children[ci], opts);
        if (childEl) childrenEl.appendChild(childEl);
      }
      nodeEl.appendChild(childrenEl);
    }

    return nodeEl;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Convert a ClauseFlowTree v1 into an HTMLElement tree.
   *
   * @param {object} cft      ClauseFlowTree v1
   *                          { version: 1, sentenceRef, flatNodeCount, root }
   * @param {object} options
   *   options.tokenMap       { [ref]: tokenData }
   *   options.onTokenClick   function(ref, tokenData)
   * @returns {HTMLElement|null}  .cf-tree root — null on any failure
   */
  function createClauseFlowView(cft, options) {
    if (!cft || cft.version !== 1 || !cft.root) return null;
    if (!_doc()) return null;

    var opts = {
      tokenMap:     (options && options.tokenMap)     || null,
      onTokenClick: (options && options.onTokenClick) || null,
    };

    try {
      var treeEl = _el('div', 'cf-tree');
      treeEl.setAttribute('data-sentence-ref', cft.sentenceRef || '');

      var rootNodeEl = _renderNode(cft.root, opts);
      if (!rootNodeEl) return null;

      treeEl.appendChild(rootNodeEl);
      return treeEl;
    } catch (_) {
      return null;
    }
  }

  // ── Export ────────────────────────────────────────────────────────────────

  global.ClauseFlowRenderer = {
    createClauseFlowView: createClauseFlowView,
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
