/**
 * relation-renderer.js — Phase 6-2-E-5-C
 *
 * Relation View Renderer — Relation[] → DOM (HTMLElement)
 *
 * Converts RelationProjection output into a 2-layer graph display:
 *   Layer 1: Structural Relations (top-down tree, solid edges)
 *   Layer 2: RELATIVE_ANTECEDENT Relations (Bezier cross-edges, dashed)
 *
 * E-5-C: Card structure enhancement.
 *   Arguments and Phrases are rendered as labelled group blocks within each
 *   node card instead of flat inline rows. The graph structure (Relation[],
 *   node count, edge count) is completely unchanged.
 *
 * No DOM queries outside the returned element.
 * No external libraries. No L-0 inference.
 * CLAUSE_STACK nodes are not rendered; their children are promoted.
 *
 * Pipeline position:
 *   ClauseFlowTree v1 + Relation[] + tokenMap
 *     → buildRelationView()
 *     → HTMLElement (.relation-view-wrapper)
 *
 * Exports: window.RelationRenderer = { buildRelationView }
 */
(function (global) {
  'use strict';

  // ── Layout constants ──────────────────────────────────────────────────────
  var NODE_W         = 180;  // fixed card width (px)
  var NODE_H         = 300;  // estimated card height for layout geometry
  var H_GAP          = 28;   // horizontal gap between sibling subtrees
  var V_GAP          = 100;  // vertical gap between depth levels
  var MAX_PRED_CHARS = 40;   // max Unicode codepoints for predicate text
  var ANT_CURVE_PAD  = 60;   // how far right RELATIVE_ANTECEDENT curves reach

  // ── Argument function → Japanese label ───────────────────────────────────
  var _ARG_FN_JA = {
    SUBJECT:         '主語',
    PREDICATE:       '述語',
    COPULA:          '繋辞',
    OBJECT:          '目的語',
    COMPLEMENT:      '補語',
    INDIRECT_OBJECT: '間接目的語',
    SECOND_OBJECT:   '第二目的語',
    OBJECT2:         '第二目的語',
    AUX:             '助動詞',
    ADVERBIAL:       '副詞的',
  };

  // ── Phrase type → Japanese label ──────────────────────────────────────────
  var _PHRASE_TYPE_JA = {
    PP:  '前置詞句',
    ADV: '副詞句',
  };

  // ── Labels ────────────────────────────────────────────────────────────────
  var ROLE_LABELS = {
    ROOT:               'ルート',
    ADVERBIAL:          '副詞節',
    CONTENT:            '内容節',
    RELATIVE:           '関係節',
    PARTICIPIAL:        '分詞節',
    CLAUSE_AS_NP:       '名詞節',
    NOMINALIZED_CLAUSE: '動名詞節',
    COORDINATED:        '等位',
  };

  var TYPE_LABELS = {
    ADVERBIAL:           '副詞節',
    CONTENT:             '内容節',
    RELATIVE:            '関係節',
    PARTICIPIAL:         '分詞節',
    CLAUSE_AS_NP:        '名詞節',
    NOMINALIZED_CLAUSE:  '動名詞節',
    COORDINATED:         '等位接続',
    RELATIVE_ANTECEDENT: '先行詞',
  };

  // Per-instance counter for unique SVG marker IDs
  var _uid = 0;

  // ── E-5-C: CSS injection ──────────────────────────────────────────────────
  // Group-structure styles are injected once into <head> by the renderer itself,
  // since the group classes are new in E-5-C and index.html is read-only.
  var _E5C_STYLE_ATTR = 'data-rr-e5c';

  function _ensureStyles() {
    if (!document.head) return;
    if (document.querySelector('style[' + _E5C_STYLE_ATTR + ']')) return;
    var style = document.createElement('style');
    style.setAttribute(_E5C_STYLE_ATTR, '');
    style.textContent = (
      // Wrapper for each arg/phrase group block (label + tokens rows)
      '.relation-node-group{margin-top:6px;}' +
      // Small muted uppercase label above each group
      '.relation-node-group-label{' +
        'font-size:9px;font-weight:600;' +
        'color:var(--text-secondary,#aaa);' +
        'text-transform:uppercase;letter-spacing:0.04em;' +
        'margin-bottom:2px;}' +
      // Token content row within a group
      '.relation-node-group-tokens{' +
        'font-size:12px;color:var(--text-primary,#333);' +
        'line-height:1.5;word-break:break-word;}'
    );
    document.head.appendChild(style);
  }

  // ── _emptyView ────────────────────────────────────────────────────────────
  function _emptyView(msg) {
    var div = document.createElement('div');
    div.className = 'relation-view-empty';
    div.textContent = msg;
    return div;
  }

  // ── _truncate ─────────────────────────────────────────────────────────────
  // Unicode-safe truncation at codepoint boundary.
  function _truncate(text, max) {
    if (!text) return '';
    var chars = Array.from(text);
    if (chars.length <= max) return text;
    return chars.slice(0, max).join('') + '…';
  }

  // ── _renderJaTokens ───────────────────────────────────────────────────────
  // Build a DocumentFragment of clickable Japanese token spans from tokenRefs.
  // For each ref: looks up elData token, prefers token.japanese, falls back to
  // token.text (Greek) when japanese is absent or bracket-prefixed.
  // Returns empty fragment if tokenRefs is empty, tokenMap absent, or no display text.
  function _renderJaTokens(tokenRefs, tokenMap, onTokenClick) {
    var frag = document.createDocumentFragment();
    if (!tokenRefs || !tokenRefs.length || !tokenMap) return frag;
    var first = true;
    for (var i = 0; i < tokenRefs.length; i++) {
      var token = tokenMap.get(tokenRefs[i]);
      if (!token) continue;
      // Prefer japanese; bracket-prefixed japanese → fall back to Greek
      var ja = token.japanese || '';
      var display = (ja && !/^[［〔「【（\[]/.test(ja)) ? ja : (token.text || '');
      if (!display) continue;
      if (!first) frag.appendChild(document.createTextNode(' '));
      first = false;
      var span = document.createElement('span');
      span.className   = 'dg-token';
      span.textContent = display;
      if (onTokenClick) {
        (function (tok) {
          span.addEventListener('click', function (ev) {
            ev.stopPropagation();
            onTokenClick(tok.ref, tok);
          });
        })(token);
      }
      frag.appendChild(span);
    }
    return frag;
  }

  // ── _renderPhraseGroup ────────────────────────────────────────────────────
  // Build a group block for a list of phrases sharing the same type label.
  // Each phrase occupies its own tokens row within the group.
  // Returns null when all phrases produce no displayable content (empty guard).
  function _renderPhraseGroup(phrList, labelText, tokenMap, onTokenClick) {
    if (!phrList || !phrList.length) return null;

    var rows = [];
    for (var i = 0; i < phrList.length; i++) {
      var p = phrList[i];
      var frag = null;
      if (p.tokenRefs && p.tokenRefs.length && tokenMap) {
        frag = _renderJaTokens(p.tokenRefs, tokenMap, onTokenClick);
        if (!frag.hasChildNodes()) frag = null;
      }
      var fallback = (!frag && p.text) ? p.text : null;
      if (frag || fallback) rows.push({ frag: frag, text: fallback });
    }
    if (!rows.length) return null; // Section 11: no empty groups

    var groupEl = document.createElement('div');
    groupEl.className = 'relation-node-group';

    var labelEl = document.createElement('div');
    labelEl.className = 'relation-node-group-label';
    labelEl.textContent = labelText;
    groupEl.appendChild(labelEl);

    for (var k = 0; k < rows.length; k++) {
      var rowEl = document.createElement('div');
      rowEl.className = 'relation-node-group-tokens';
      if (rows[k].frag) {
        rowEl.appendChild(rows[k].frag);
      } else {
        rowEl.textContent = rows[k].text;
      }
      groupEl.appendChild(rowEl);
    }

    return groupEl;
  }

  // ── _collectNodes ─────────────────────────────────────────────────────────
  // Walk CFT pre-order. Skip CLAUSE_STACK (promote children to logical parent).
  // Visited Set prevents infinite loops on malformed input.
  // Returns { nodes: Entry[], nodeMap: Map<id, Entry> }
  // Entry: { node, id, depth, logicalParentId, children: id[], x, y, subtreeW }
  function _collectNodes(cftRoot) {
    var nodes   = [];
    var nodeMap = new Map();
    var visited = new Set();

    function walk(node, parentId, depth) {
      if (!node) return;

      if (node.nodeType === 'CLAUSE_STACK') {
        var cs = node.children || [];
        for (var i = 0; i < cs.length; i++) walk(cs[i], parentId, depth);
        return;
      }

      var id = node.id || node.sourcePath;
      if (!id) return;
      if (visited.has(id)) return;
      visited.add(id);

      var entry = {
        node:            node,
        id:              id,
        depth:           depth,
        logicalParentId: parentId,
        children:        [],
        x:       0,
        y:       0,
        subtreeW: 0,
      };
      nodes.push(entry);
      nodeMap.set(id, entry);

      var ch = node.children || [];
      for (var i = 0; i < ch.length; i++) walk(ch[i], id, depth + 1);
    }

    walk(cftRoot, null, 0);

    // Build children arrays in nodeMap (pre-order preserves sibling order)
    for (var i = 0; i < nodes.length; i++) {
      var e = nodes[i];
      if (e.logicalParentId) {
        var parent = nodeMap.get(e.logicalParentId);
        if (parent) parent.children.push(e.id);
      }
    }

    return { nodes: nodes, nodeMap: nodeMap };
  }

  // ── Tree layout ───────────────────────────────────────────────────────────
  // Knuth-style centroid layout:
  //   Each leaf gets subtreeW = NODE_W + H_GAP.
  //   Each internal node gets subtreeW = sum of children subtreeW.
  //   Node x = leftEdge + (subtreeW - NODE_W) / 2  (centered over subtree).

  function _computeSubtreeW(id, nodeMap) {
    var entry = nodeMap.get(id);
    if (!entry) return NODE_W + H_GAP;
    if (entry.children.length === 0) {
      entry.subtreeW = NODE_W + H_GAP;
      return entry.subtreeW;
    }
    var total = 0;
    for (var i = 0; i < entry.children.length; i++) {
      total += _computeSubtreeW(entry.children[i], nodeMap);
    }
    entry.subtreeW = total;
    return total;
  }

  function _assignPositions(id, nodeMap, leftEdge) {
    var entry = nodeMap.get(id);
    if (!entry) return;
    entry.x = leftEdge + Math.round((entry.subtreeW - NODE_W) / 2);
    entry.y = entry.depth * (NODE_H + V_GAP);

    var cursor = leftEdge;
    for (var i = 0; i < entry.children.length; i++) {
      var childId    = entry.children[i];
      var childEntry = nodeMap.get(childId);
      _assignPositions(childId, nodeMap, cursor);
      cursor += childEntry ? childEntry.subtreeW : (NODE_W + H_GAP);
    }
  }

  // ── _getPredText ──────────────────────────────────────────────────────────
  // Predicate text with fallbacks for predicate-less node types.
  function _getPredText(node, sentenceRef) {
    if (node.predicate && node.predicate.text) return node.predicate.text;
    if (node.nodeType === 'COORDINATION') return '等位接続';
    if (node.nodeType === 'VERBLESS_CLAUSE') {
      var args = node.arguments || [];
      for (var i = 0; i < args.length; i++) {
        var fn = args[i].function;
        if ((fn === 'SUBJECT' || fn === 'COMPLEMENT') && args[i].text) {
          return args[i].text;
        }
      }
    }
    if (node.structuralRole === 'ROOT') return sentenceRef || null;
    return null;
  }

  // ── _renderNodeCard ───────────────────────────────────────────────────────
  // E-5-C: Arguments and Phrases are rendered as labelled group blocks.
  //
  // Structure per card:
  //   [role label]               — structural role (e.g. 副詞節)
  //   [marker]                   — relative pronoun / conjunction (if present)
  //   [predicate]                — main verb in Japanese (bold)
  //   [group: 主語]              — per non-content-clause argument
  //   [group: 目的語]
  //   ...
  //   [group: 前置詞句]          — all PP phrases merged under one label
  //   [group: 副詞句]            — all ADV phrases merged under one label
  //
  // Marker deduplication: the marker's tokenRef is excluded from arg/phrase
  // tokenRefs so the relative pronoun does not appear twice (once in the
  // marker section and once in the SUBJECT/OBJECT group).
  //
  // Empty groups are not rendered (Section 11 compliance).
  // Graph structure (Relation[], edges, node count) is completely unchanged.
  //
  // tokenMap: Map<ref, elDataToken>
  // onTokenClick: function(ref, token) — called when a token span is tapped
  function _renderNodeCard(entry, sentenceRef, tokenMap, onTokenClick) {
    var node = entry.node;

    var div = document.createElement('div');
    div.className  = 'relation-node';
    div.dataset.nodeId = entry.id;
    div.style.cssText = (
      'position:absolute;' +
      'left:'  + entry.x + 'px;' +
      'top:'   + entry.y + 'px;' +
      'width:' + NODE_W  + 'px;' +
      'box-sizing:border-box;'
    );

    // ── Role label ────────────────────────────────────────────────────────
    var header = document.createElement('div');
    header.className   = 'relation-node-role';
    header.textContent = ROLE_LABELS[node.structuralRole] || node.structuralRole || '';
    div.appendChild(header);

    // ── Marker (relative pronoun / conjunction) ───────────────────────────
    // Prefer Japanese from tokenRef; fall back to raw marker text.
    // markerRef is tracked here and excluded from arg/phrase tokenRefs below
    // to prevent the same token appearing twice in the card.
    var markerRef = null;
    if (node.marker) {
      var markerEl  = document.createElement('div');
      markerEl.className = 'relation-node-marker';
      var markerRendered = false;
      if (node.marker.tokenRef && tokenMap) {
        var mFrag = _renderJaTokens([node.marker.tokenRef], tokenMap, onTokenClick);
        if (mFrag.hasChildNodes()) {
          markerEl.appendChild(mFrag);
          markerRendered = true;
          markerRef = node.marker.tokenRef; // record for deduplication
        }
      }
      if (!markerRendered && node.marker.text) {
        markerEl.textContent = node.marker.text;
        markerRendered = true;
      }
      if (markerRendered) div.appendChild(markerEl);
    }

    // ── Predicate ─────────────────────────────────────────────────────────
    // Try tokenRefs for Japanese spans; fall back to text-based predicate.
    // Render logic is identical to E-4-E.
    var predEl       = document.createElement('div');
    predEl.className = 'relation-node-pred';
    var predRendered = false;
    if (node.predicate && node.predicate.tokenRefs && node.predicate.tokenRefs.length && tokenMap) {
      var predFrag = _renderJaTokens(node.predicate.tokenRefs, tokenMap, onTokenClick);
      if (predFrag.hasChildNodes()) {
        predEl.appendChild(predFrag);
        predRendered = true;
      }
    }
    if (!predRendered) {
      var predText = _getPredText(node, sentenceRef);
      if (predText) {
        predEl.textContent = _truncate(predText, MAX_PRED_CHARS);
        predRendered = true;
      }
    }
    if (predRendered) div.appendChild(predEl);

    // ── Argument groups ───────────────────────────────────────────────────
    // Each non-content-clause argument becomes its own labelled group block.
    // isContentClause args are excluded: they are already rendered as child
    // CFT nodes connected via CONTENT edges in the graph.
    var args = (node.arguments || []).filter(function (a) { return !a.isContentClause; });
    for (var i = 0; i < args.length; i++) {
      var a = args[i];

      // Exclude marker tokenRef from arg tokenRefs (relative pronoun deduplication).
      var argRefs = (markerRef && a.tokenRefs)
        ? a.tokenRefs.filter(function (r) { return r !== markerRef; })
        : (a.tokenRefs || []);

      var tokFrag = null;
      if (argRefs.length && tokenMap) {
        tokFrag = _renderJaTokens(argRefs, tokenMap, onTokenClick);
        if (!tokFrag.hasChildNodes()) tokFrag = null;
      }
      var fallbackText = (!tokFrag && a.text) ? a.text : null;
      if (!tokFrag && !fallbackText) continue; // skip empty groups (Section 11)

      var groupEl = document.createElement('div');
      groupEl.className = 'relation-node-group';

      var labelEl = document.createElement('div');
      labelEl.className   = 'relation-node-group-label';
      labelEl.textContent = a.function ? (_ARG_FN_JA[a.function] || a.function) : '';
      groupEl.appendChild(labelEl);

      var tokensEl = document.createElement('div');
      tokensEl.className = 'relation-node-group-tokens';
      if (tokFrag) {
        tokensEl.appendChild(tokFrag);
      } else {
        tokensEl.textContent = fallbackText;
      }
      groupEl.appendChild(tokensEl);
      div.appendChild(groupEl);
    }

    // ── Phrase groups ─────────────────────────────────────────────────────
    // Phrases are grouped by phraseType: PP → 前置詞句, ADV → 副詞句.
    // Multiple phrases of the same type share one group label; each phrase
    // occupies its own token row within that group.
    // Note: p.tokenRefs already includes the preposition token; p.prepText is
    // intentionally omitted to avoid Greek/Japanese duplication (E-4-E fix).
    var phrases = node.phrases || [];
    var ppPhrases   = [];
    var advPhrases  = [];
    var otherPhrases = [];

    for (var i = 0; i < phrases.length; i++) {
      var p = phrases[i];
      // Exclude marker tokenRef from phrase tokenRefs (deduplication guard).
      var phrRefs = (markerRef && p.tokenRefs)
        ? p.tokenRefs.filter(function (r) { return r !== markerRef; })
        : (p.tokenRefs || []);
      var pCopy = { tokenRefs: phrRefs, text: p.text, phraseType: p.phraseType };
      if (p.phraseType === 'PP')       ppPhrases.push(pCopy);
      else if (p.phraseType === 'ADV') advPhrases.push(pCopy);
      else                             otherPhrases.push(pCopy);
    }

    var ppGroup = _renderPhraseGroup(ppPhrases,  '前置詞句', tokenMap, onTokenClick);
    if (ppGroup) div.appendChild(ppGroup);

    var advGroup = _renderPhraseGroup(advPhrases, '副詞句',  tokenMap, onTokenClick);
    if (advGroup) div.appendChild(advGroup);

    // Unknown phraseType: render each individually with its type as label.
    for (var i = 0; i < otherPhrases.length; i++) {
      var op  = otherPhrases[i];
      var lbl = (op.phraseType && _PHRASE_TYPE_JA[op.phraseType])
        ? _PHRASE_TYPE_JA[op.phraseType]
        : (op.phraseType || '句');
      var grp = _renderPhraseGroup([op], lbl, tokenMap, onTokenClick);
      if (grp) div.appendChild(grp);
    }

    return div;
  }

  // ── SVG helpers ───────────────────────────────────────────────────────────
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function _svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function _buildSvg(canvasW, canvasH, uid) {
    var svg = _svgEl('svg', {
      'class':       'relation-edge-layer',
      'aria-hidden': 'true',
      'width':       canvasW,
      'height':      canvasH,
    });
    svg.style.cssText = (
      'position:absolute;top:0;left:0;' +
      'overflow:visible;pointer-events:none;'
    );

    var defs = _svgEl('defs', {});

    // Filled triangle arrowhead — Layer 1 structural edges
    var mFilled = _svgEl('marker', {
      id:           'rr-arrow-filled-' + uid,
      markerWidth:  '8',
      markerHeight: '8',
      refX:         '7',
      refY:         '3.5',
      orient:       'auto',
    });
    mFilled.appendChild(_svgEl('polygon', {
      points: '0 0, 7 3.5, 0 7',
      fill:   'var(--relation-edge-color,#555)',
    }));
    defs.appendChild(mFilled);

    // Open arrowhead — Layer 2 RELATIVE_ANTECEDENT edges
    var mOpen = _svgEl('marker', {
      id:           'rr-arrow-open-' + uid,
      markerWidth:  '9',
      markerHeight: '9',
      refX:         '8',
      refY:         '4.5',
      orient:       'auto',
    });
    mOpen.appendChild(_svgEl('polyline', {
      points:        '0 0, 8 4.5, 0 9',
      fill:          'none',
      stroke:        'var(--relation-antecedent-color,#4a7ca5)',
      'stroke-width': '1.5',
    }));
    defs.appendChild(mOpen);

    svg.appendChild(defs);
    return svg;
  }

  // Center-x of a node entry
  function _cx(entry) { return entry.x + NODE_W / 2; }
  // Center-y of a node entry (approximate — layout uses fixed NODE_H)
  function _cy(entry) { return entry.y + NODE_H / 2; }

  function _drawLayer1Edge(svg, srcEntry, tgtEntry, relType, uid) {
    var x1 = _cx(srcEntry);
    var y1 = srcEntry.y + NODE_H;
    var x2 = _cx(tgtEntry);
    var y2 = tgtEntry.y;

    svg.appendChild(_svgEl('line', {
      x1:             x1,
      y1:             y1,
      x2:             x2,
      y2:             y2,
      stroke:         'var(--relation-edge-color,#555)',
      'stroke-width': '1.5',
      'marker-end':   'url(#rr-arrow-filled-' + uid + ')',
    }));

    var label = TYPE_LABELS[relType] || relType;
    var tx    = Math.round((x1 + x2) / 2);
    var ty    = Math.round((y1 + y2) / 2);
    var text  = _svgEl('text', {
      x:          tx + 4,
      y:          ty,
      'font-size': '10',
      fill:        'var(--relation-edge-label-color,#888)',
    });
    text.textContent = label;
    svg.appendChild(text);
  }

  function _drawLayer2Edge(svg, srcEntry, tgtEntry, canvasW, uid) {
    // Route curve along the right margin, avoiding the tree body
    var x1      = srcEntry.x + NODE_W;  // right side of source
    var y1      = _cy(srcEntry);
    var x2      = tgtEntry.x + NODE_W;  // right side of target
    var y2      = _cy(tgtEntry);
    var curveX  = canvasW - ANT_CURVE_PAD;

    svg.appendChild(_svgEl('path', {
      d: (
        'M ' + x1 + ' ' + y1 +
        ' C ' + curveX + ' ' + y1 + ',' +
                curveX + ' ' + y2 + ',' +
                x2     + ' ' + y2
      ),
      fill:             'none',
      stroke:           'var(--relation-antecedent-color,#4a7ca5)',
      'stroke-width':   '1.5',
      'stroke-dasharray': '4 3',
      'marker-end':     'url(#rr-arrow-open-' + uid + ')',
    }));

    // Label near curve apex
    var labelX = curveX + 4;
    var labelY = Math.round((y1 + y2) / 2);
    var text   = _svgEl('text', {
      x:           labelX,
      y:           labelY,
      'font-size': '10',
      fill:        'var(--relation-antecedent-color,#4a7ca5)',
    });
    text.textContent = '先行詞';
    svg.appendChild(text);
  }

  // ── buildRelationView ─────────────────────────────────────────────────────
  /**
   * Build the Relation View DOM element.
   *
   * @param {object}   cft        ClauseFlowTree v1
   * @param {object[]} relations  Relation[] from RelationProjection
   * @param {Map}      tokenMap   Map<ref, elDataToken>
   * @param {object}   [options]  { onTokenClick: function(ref, token) }
   * @returns {HTMLElement}  .relation-view-wrapper (overflow-x: auto)
   */
  function buildRelationView(cft, relations, tokenMap, options) {
    _ensureStyles(); // E-5-C: inject group CSS once per document

    var uid         = ++_uid;
    var onTokenClick = (options && typeof options.onTokenClick === 'function')
        ? options.onTokenClick : null;

    var wrapper = document.createElement('div');
    wrapper.className  = 'relation-view-wrapper';
    wrapper.style.overflowX = 'auto';

    if (!cft || !cft.root) {
      wrapper.appendChild(_emptyView('（関係データなし）'));
      return wrapper;
    }

    var sentenceRef = cft.sentenceRef || '';

    // Collect visible nodes (CLAUSE_STACK stripped, visited guard applied)
    var col     = _collectNodes(cft.root);
    var nodes   = col.nodes;
    var nodeMap = col.nodeMap;

    if (nodes.length === 0) {
      wrapper.appendChild(_emptyView('（節データなし）'));
      return wrapper;
    }

    // Compute layout
    var rootId = nodes[0].id;
    _computeSubtreeW(rootId, nodeMap);
    _assignPositions(rootId, nodeMap, 0);

    // Canvas dimensions
    var maxRight = 0, maxBottom = 0;
    for (var i = 0; i < nodes.length; i++) {
      var e = nodes[i];
      if (e.x + NODE_W > maxRight)  maxRight  = e.x + NODE_W;
      if (e.y + NODE_H > maxBottom) maxBottom = e.y + NODE_H;
    }
    var canvasW = maxRight + ANT_CURVE_PAD + 50;
    var canvasH = maxBottom + 30;

    // Outer container
    var container = document.createElement('div');
    container.className  = 'relation-view';
    container.style.cssText = (
      'position:relative;' +
      'width:'     + canvasW + 'px;' +
      'height:'    + canvasH + 'px;'
    );
    wrapper.appendChild(container);

    // Partition relations into Layer 1 and Layer 2
    var safeRels = relations || [];
    var layer1   = [];
    var layer2   = [];
    for (var i = 0; i < safeRels.length; i++) {
      var rel = safeRels[i];
      if (rel.type === 'RELATIVE_ANTECEDENT') {
        layer2.push(rel);
      } else {
        layer1.push(rel);
      }
    }

    // SVG edge layer (appended first so it renders behind node cards)
    var svg = _buildSvg(canvasW, canvasH, uid);
    container.appendChild(svg);

    // Node card layer
    var nodeLayer = document.createElement('div');
    nodeLayer.className  = 'relation-node-layer';
    nodeLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    container.appendChild(nodeLayer);

    for (var i = 0; i < nodes.length; i++) {
      nodeLayer.appendChild(_renderNodeCard(nodes[i], sentenceRef, tokenMap, onTokenClick));
    }

    // Draw Layer 1 edges (solid, filled arrowhead)
    for (var i = 0; i < layer1.length; i++) {
      var rel = layer1[i];
      var src = nodeMap.get(rel.sourceId);
      var tgt = nodeMap.get(rel.targetId);
      if (src && tgt) _drawLayer1Edge(svg, src, tgt, rel.type, uid);
    }

    // Draw Layer 2 edges (dashed Bezier, open arrowhead)
    for (var i = 0; i < layer2.length; i++) {
      var rel = layer2[i];
      var src = nodeMap.get(rel.sourceId);
      var tgt = nodeMap.get(rel.targetId);
      if (src && tgt) _drawLayer2Edge(svg, src, tgt, canvasW, uid);
    }

    return wrapper;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  global.RelationRenderer = {
    buildRelationView: buildRelationView,
  };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
