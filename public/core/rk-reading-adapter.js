/**
 * rk-reading-adapter.js  Phase 4.0-C
 *
 * Converts SR (Structural Representation) + bible_data tokens
 * → RK word array format expected by RKReadingRenderer.loadWords().
 *
 * Input:
 *   srSentence  — one sentence object from sr/BOOK/CH.json
 *                 { ref, root: <SR tree node> }
 *   bdTokenMap  — Map<verseId, bdToken> built from bible_data/nt/BOOK/CH.json
 *                 verseId = bdToken.verseId  (e.g. "n43001001001")
 *
 * Output:
 *   Array of RK word rows:
 *   [ [greek, japanese, morphology, head_idx (1-based, 0=root), role, implied?] ]
 *
 * Algorithm:
 *   1. Collect all token nodes from SR tree, sort by surfaceIndex.
 *   2. Walk SR tree recursively, assigning each token a role and headSI.
 *   3. Map surfaceIndex → 1-based position.
 *   4. Output array using bible_data for japanese + morphology.
 *
 * Handled SR constructions:
 *   clause / clause cn=COORDINATION / clause cn=CONJOINED_CLAUSE
 *   group root, group as CONJOINED inner child
 *   phrase.np root (verbless title)
 *   phrase.pp cn=PREP_PHRASE
 *   phrase.np cn=ARTICULAR_NP / GENITIVE_MOD / CLAUSE_AS_NP
 *   phrase.np cn=APPOSITION / ADJ_MOD / NP_COMPLEX / ADV_MOD / DEMO_MOD / PREP_PHRASE
 *   clause cn=SUBORDINATE_CLAUSE / CONTENT_CLAUSE / NOMINALIZED_CLAUSE
 *   phrase.adjp
 *
 * Exports: window.RKReadingAdapter = { adaptSentence, buildTokenMap }
 */

(function (global) {
  'use strict';

  // ── Token collection ─────────────────────────────────────────────────

  function _collectTokens(node, out) {
    if (!node) return;
    if (node.type === 'token') { out.push(node); return; }
    for (const c of (node.children || [])) _collectTokens(c, out);
  }

  // ── Role/head assignment state ───────────────────────────────────────

  let _roleMap;   // Map<surfaceIndex, role string>
  let _headMap;   // Map<surfaceIndex, headSI>  (-1 = root)
  let _bd;        // Map<nodeId, bdToken>

  function _bdFor(srToken) {
    return _bd.get(srToken.evidence && srToken.evidence.nodeId) || null;
  }

  function _assign(si, role, headSI) {
    if (!_roleMap.has(si)) _roleMap.set(si, role);
    if (!_headMap.has(si)) _headMap.set(si, headSI);
  }

  // ── Tree walk helpers ────────────────────────────────────────────────

  // Find the verb token (fn=PREDICATE or fn=COPULA) among direct children
  function _findVerbToken(children) {
    for (const c of children) {
      if (c.type === 'token' && c.function) {
        const fn = c.function.canonical;
        if (fn === 'PREDICATE' || fn === 'COPULA') return c;
      }
    }
    // Fallback: any direct verb-class token
    for (const c of children) {
      if (c.type === 'token') {
        const bd = _bdFor(c);
        if (bd && bd.class === 'verb') return c;
      }
    }
    return null;
  }

  // ── NP processing ────────────────────────────────────────────────────

  function _processNP(node, parentHeadSI, role) {
    const cn = (node.construction && node.construction.canonical) || '';

    if (cn === 'ARTICULAR_NP') {
      const toks   = (node.children || []).filter(c => c.type === 'token');
      const nested = (node.children || []).filter(c => c.type !== 'token');

      let nounSI = -1;
      for (const sub of nested) {
        const s = _processNP(sub, parentHeadSI, role);
        if (s >= 0 && nounSI < 0) nounSI = s;
      }

      const nonArt = toks.filter(t => { const bd = _bdFor(t); return !(bd && bd.class === 'det'); });
      const arts   = toks.filter(t => { const bd = _bdFor(t); return bd && bd.class === 'det'; });

      if (nonArt.length > 0) {
        const headTok = nonArt[nonArt.length - 1];
        nounSI = headTok.surfaceIndex;
        _assign(nounSI, role, parentHeadSI);
      } else if (nounSI < 0 && toks.length > 0) {
        nounSI = toks[toks.length - 1].surfaceIndex;
        _assign(nounSI, role, parentHeadSI);
      }

      for (const art of arts) {
        _assign(art.surfaceIndex, 'det', nounSI >= 0 ? nounSI : parentHeadSI);
      }
      return nounSI;
    }

    if (cn === 'GENITIVE_MOD') {
      const toks   = (node.children || []).filter(c => c.type === 'token');
      const npKids = (node.children || []).filter(c => c.type !== 'token');

      let headSI = -1;
      if (toks.length > 0) {
        // First token = head noun; remaining direct tokens = genitives
        const main = toks[0];
        headSI = main.surfaceIndex;
        _assign(headSI, role, parentHeadSI);
        for (let i = 1; i < toks.length; i++) {
          _assign(toks[i].surfaceIndex, 'gen', headSI);
        }
        for (const sub of npKids) {
          _processNP(sub, headSI, 'gen');
        }
      } else if (npKids.length > 0) {
        // No direct token children — first NP child is head
        headSI = _processNP(npKids[0], parentHeadSI, role);
        for (const sub of npKids.slice(1)) {
          _processNP(sub, headSI >= 0 ? headSI : parentHeadSI, 'gen');
        }
      }
      return headSI;
    }

    if (cn === 'CLAUSE_AS_NP') {
      const toks    = (node.children || []).filter(c => c.type === 'token');
      const clauses = (node.children || []).filter(c => c.type === 'clause');
      const nps     = (node.children || []).filter(c => c.type === 'phrase.np');
      const groups  = (node.children || []).filter(c => c.type === 'group');

      let nounSI = -1;
      if (toks.length > 0) {
        const main = toks[toks.length - 1];
        nounSI = main.surfaceIndex;
        _assign(nounSI, role, parentHeadSI);
      } else if (nps.length > 0) {
        nounSI = _processNP(nps[0], parentHeadSI, role);
        for (const np of nps.slice(1)) {
          _processNP(np, nounSI >= 0 ? nounSI : parentHeadSI, 'adj');
        }
      }
      // When no direct token/NP head, the first clause or group IS the semantic head
      // (nominalized clause or coordinated group acting as the NP head).
      if (nounSI < 0 && clauses.length > 0) {
        nounSI = _processClause(clauses[0], parentHeadSI, role);
        for (const cl of clauses.slice(1)) {
          _processClause(cl, nounSI >= 0 ? nounSI : parentHeadSI, 'relcl');
        }
      } else {
        for (const cl of clauses) {
          _processClause(cl, nounSI >= 0 ? nounSI : parentHeadSI, 'relcl');
        }
      }
      if (nounSI < 0 && groups.length > 0) {
        const s = _processGroup(groups[0], parentHeadSI, role);
        if (s >= 0) nounSI = s;
        for (const grp of groups.slice(1)) {
          _processGroup(grp, nounSI >= 0 ? nounSI : parentHeadSI);
        }
      } else {
        for (const grp of groups) {
          _processGroup(grp, nounSI >= 0 ? nounSI : parentHeadSI);
        }
      }
      return nounSI;
    }

    if (cn === 'APPOSITION') {
      // First child = head, rest hang as adj modifiers
      const children = node.children || [];
      let headSI = -1;
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        const modHead = headSI >= 0 ? headSI : parentHeadSI;
        if (i === 0) {
          if (ch.type === 'token') {
            headSI = ch.surfaceIndex;
            _assign(headSI, role, parentHeadSI);
          } else if (ch.type === 'clause') {
            headSI = _processClause(ch, parentHeadSI, role === 'verb' ? 'verb' : 'relcl');
          } else {
            headSI = _processNP(ch, parentHeadSI, role);
          }
        } else {
          if (ch.type === 'token') {
            _assign(ch.surfaceIndex, 'adj', modHead);
          } else if (ch.type === 'clause') {
            _processClause(ch, modHead, 'relcl');
          } else if (ch.type === 'group') {
            _processGroup(ch, modHead);
          } else {
            _processNP(ch, modHead, 'adj');
          }
        }
      }
      return headSI;
    }

    if (cn === 'ADJ_MOD') {
      // Head noun + modifier (clause, adj phrase, etc.)
      const children = node.children || [];
      const toks = children.filter(c => c.type === 'token');
      const nonTok = children.filter(c => c.type !== 'token');

      let headSI = -1;

      if (toks.length > 0) {
        // Head is the last direct token (noun typically follows adjective in Greek)
        const headTok = toks[toks.length - 1];
        headSI = headTok.surfaceIndex;
        _assign(headSI, role, parentHeadSI);
        for (const t of toks) {
          if (t !== headTok) {
            const bd = _bdFor(t);
            _assign(t.surfaceIndex, bd && bd.class === 'det' ? 'det' : 'adj', headSI);
          }
        }
        for (const mod of nonTok) {
          if (mod.type === 'clause') _processClause(mod, headSI, 'relcl');
          else if (mod.type === 'phrase.pp') _processPP(mod, headSI);
          else _processNP(mod, headSI, 'adj');
        }
      } else if (nonTok.length > 0) {
        // No direct token children — first non-token child is the head NP/clause
        const headChild = nonTok[0];
        if (headChild.type === 'clause') {
          headSI = _processClause(headChild, parentHeadSI, role);
        } else {
          headSI = _processNP(headChild, parentHeadSI, role);
        }
        for (const mod of nonTok.slice(1)) {
          const modHead = headSI >= 0 ? headSI : parentHeadSI;
          if (mod.type === 'clause') _processClause(mod, modHead, 'relcl');
          else if (mod.type === 'phrase.pp') _processPP(mod, modHead);
          else _processNP(mod, modHead, 'adj');
        }
      }
      return headSI;
    }

    if (cn === 'NP_COMPLEX' || cn === 'ADV_MOD' || cn === 'DEMO_MOD') {
      // Complex / adverb-modified / demonstrative NP
      const children = node.children || [];
      const toks = children.filter(c => c.type === 'token');
      const mods = children.filter(c => c.type !== 'token');

      // Head: first non-det/non-adv/non-conj token
      const headTok = toks.find(t => {
        const bd = _bdFor(t);
        return bd && !['det', 'adv', 'conj'].includes(bd.class);
      }) || (toks.length > 0 ? toks[0] : null);

      let headSI = -1;
      if (headTok) {
        headSI = headTok.surfaceIndex;
        _assign(headSI, role, parentHeadSI);
      }
      for (const t of toks) {
        if (t !== headTok) {
          const bd = _bdFor(t);
          const r = bd && bd.class === 'det' ? 'det'
                  : bd && bd.class === 'adv'  ? 'adv'
                  : bd && bd.class === 'conj' ? 'conj'
                  : 'adj';
          _assign(t.surfaceIndex, r, headSI >= 0 ? headSI : parentHeadSI);
        }
      }
      for (let mi = 0; mi < mods.length; mi++) {
        const mod = mods[mi];
        const modHead = headSI >= 0 ? headSI : parentHeadSI;
        if (mod.type === 'clause') {
          _processClause(mod, modHead, 'relcl');
        } else if (mod.type === 'group') {
          // When no direct token head exists, propagate parent role through first group's NPs
          const groupNpRole = (headSI < 0 && mi === 0) ? role : 'adj';
          const s = _processGroup(mod, modHead, groupNpRole);
          if (headSI < 0 && s >= 0) headSI = s;
        } else if (mod.type === 'phrase.pp') {
          _processPP(mod, modHead);
        } else {
          // When no direct token head exists, propagate the parent role to the first NP child
          const modRole = (headSI < 0 && mi === 0) ? role : 'adj';
          const s = _processNP(mod, modHead, modRole);
          if (headSI < 0 && s >= 0) headSI = s;
        }
      }
      return headSI;
    }

    if (cn === 'PREP_PHRASE' && node.type === 'phrase.np') {
      // phrase.np labeled PREP_PHRASE: sub-NP + sub-PP (+ optional clause head)
      const children = node.children || [];
      const npChild  = children.find(c => c.type === 'phrase.np');
      const ppChild  = children.find(c => c.type === 'phrase.pp');
      const clChild  = children.find(c => c.type === 'clause');
      const toks     = children.filter(c => c.type === 'token');

      let headSI = -1;
      if (npChild) {
        headSI = _processNP(npChild, parentHeadSI, role);
      } else if (toks.length > 0) {
        headSI = toks[0].surfaceIndex;
        _assign(headSI, role, parentHeadSI);
        for (let i = 1; i < toks.length; i++) {
          _assign(toks[i].surfaceIndex, 'adj', headSI);
        }
      } else if (clChild) {
        // Nominalized clause (e.g., articular infinitive) as the NP head
        headSI = _processClause(clChild, parentHeadSI, role);
      }
      if (ppChild) {
        _processPP(ppChild, headSI >= 0 ? headSI : parentHeadSI);
      }
      return headSI;
    }

    // Fallback: collect all tokens, last substantive = head, rest = modifiers
    const toks = [];
    _collectTokens(node, toks);
    if (toks.length === 0) return -1;
    const headTok = toks[toks.length - 1];
    const headSI  = headTok.surfaceIndex;
    _assign(headSI, role, parentHeadSI);
    for (let i = 0; i < toks.length - 1; i++) {
      const bd = _bdFor(toks[i]);
      _assign(toks[i].surfaceIndex, bd && bd.class === 'det' ? 'det' : 'adj', headSI);
    }
    return headSI;
  }

  // ── PP processing ─────────────────────────────────────────────────────

  function _processPP(node, parentHeadSI) {
    const children = node.children || [];

    const prepTok = children.find(c => c.type === 'token');
    if (!prepTok) {
      // COORDINATION of PPs or wrapped PP — no direct prep token at this level
      for (const c of children) {
        if (c.type === 'phrase.pp') _processPP(c, parentHeadSI);
        else if (c.type === 'group')    _processGroup(c, parentHeadSI);
        else if (c.type === 'phrase.np') _processNP(c, parentHeadSI, 'pobj');
      }
      return -1;
    }

    // If first token is not a real preposition (conj, adv, particle, neg),
    // assign appropriate role and delegate child PPs to parentHeadSI.
    const prepBd = _bdFor(prepTok);
    if (prepBd && prepBd.class !== 'prep') {
      _assign(prepTok.surfaceIndex, prepBd.class === 'neg' ? 'neg' : 'conj', parentHeadSI);
      for (const c of children) {
        if (c === prepTok) continue;
        if (c.type === 'phrase.pp') _processPP(c, parentHeadSI);
        else if (c.type === 'group')    _processGroup(c, parentHeadSI);
        else if (c.type === 'phrase.np') _processNP(c, parentHeadSI, 'adv');
      }
      return parentHeadSI;
    }

    const prepSI = prepTok.surfaceIndex;
    _assign(prepSI, 'prep', parentHeadSI);

    const objChild = children.find(c => c !== prepTok);
    if (!objChild) return prepSI;

    if (objChild.type === 'token') {
      _assign(objChild.surfaceIndex, 'pobj', prepSI);
    } else if (objChild.type === 'phrase.pp') {
      // Nested PP as object (e.g., ἕως πρὸς X): process inner PP first, then
      // re-assign its prep token as 'pobj' so prepB() can find the required shelf entry.
      _processPP(objChild, prepSI);
      const innerTok = (objChild.children || []).find(c => c.type === 'token');
      if (innerTok) _roleMap.set(innerTok.surfaceIndex, 'pobj');
    } else {
      _processNP(objChild, prepSI, 'pobj');
    }
    return prepSI;
  }

  // ── AdjP processing ───────────────────────────────────────────────────

  function _processAdjP(node, parentHeadSI) {
    const children = node.children || [];
    const toks = children.filter(c => c.type === 'token');
    const mods = children.filter(c => c.type !== 'token');

    // First substantive token = head adjective
    const headTok = toks[0] || null;
    let headSI = -1;
    if (headTok) {
      headSI = headTok.surfaceIndex;
      _assign(headSI, 'adj', parentHeadSI);
    }
    for (let i = 1; i < toks.length; i++) {
      _assign(toks[i].surfaceIndex, 'gen', headSI >= 0 ? headSI : parentHeadSI);
    }
    for (const mod of mods) {
      const modHead = headSI >= 0 ? headSI : parentHeadSI;
      if (mod.type === 'phrase.np') _processNP(mod, modHead, 'gen');
      else if (mod.type === 'group') _processGroup(mod, modHead);
    }
    return headSI;
  }

  // ── Role mapping ──────────────────────────────────────────────────────

  function _fnToRole(fn, bdClass) {
    switch (fn) {
      case 'SUBJECT':         return 'subj';
      case 'PREDICATE':       return 'verb';
      case 'COPULA':          return 'verb';
      case 'OBJECT':          return 'obj';
      case 'COMPLEMENT':      return 'pred';
      case 'INDIRECT_OBJECT': return 'iobj';
      case 'ADVERBIAL':       return 'adv';
      default:
        if (bdClass === 'det')  return 'det';
        if (bdClass === 'adv')  return 'adv';
        if (bdClass === 'conj') return 'conj';
        // prep-class tokens as direct clause children have no pobj mechanism; treat as adverbial
        if (bdClass === 'prep') return 'adv';
        if (bdClass === 'adj')  return 'adj';
        return 'adv';
    }
  }

  // ── Clause-child dispatch ─────────────────────────────────────────────

  function _processClauseChild(child, verbSI) {
    const fn  = child.function && child.function.canonical;
    const cn  = child.construction && child.construction.canonical;

    if (child.type === 'token') {
      const bd   = _bdFor(child);
      const cls  = bd && bd.class;
      const role = _fnToRole(fn, cls);
      _assign(child.surfaceIndex, role, verbSI);
      return;
    }

    if (child.type === 'phrase.pp') {
      _processPP(child, verbSI);
      return;
    }

    if (child.type === 'phrase.np') {
      const npRole =
        fn === 'SUBJECT'         ? 'subj' :
        fn === 'OBJECT'          ? 'obj'  :
        fn === 'COMPLEMENT'      ? 'pred' :
        fn === 'INDIRECT_OBJECT' ? 'iobj' :
        fn === 'ADVERBIAL'       ? 'adv'  : 'subj';
      _processNP(child, verbSI, npRole);
      return;
    }

    if (child.type === 'phrase.adjp') {
      _processAdjP(child, verbSI);
      return;
    }

    if (child.type === 'group') {
      _processGroup(child, verbSI);
      return;
    }

    if (child.type === 'clause') {
      const clRole =
        fn === 'ADVERBIAL'  ? 'advcl'  :
        fn === 'SUBJECT'    ? 'clause' :
        fn === 'OBJECT'     ? 'clause' :
        fn === 'COMPLEMENT' ? 'clause' :
        cn === 'SUBORDINATE_CLAUSE'  ? 'advcl'  :
        cn === 'CONTENT_CLAUSE'      ? 'clause' :
        cn === 'NOMINALIZED_CLAUSE'  ? 'clause' :
        'clause';
      _processClause(child, verbSI, clRole);
      return;
    }
  }

  // ── Group as coordinated clause root ─────────────────────────────────

  // Called when a group is the root or the inner child of a CONJOINED_CLAUSE.
  // First clause child = root verb; additional clauses = cverb; groups = recurse.
  function _processGroupAsClause(node, parentHeadSI, verbRole) {
    const children = node.children || [];
    const clauses  = children.filter(c => c.type === 'clause');
    const groups   = children.filter(c => c.type === 'group');
    const toks     = children.filter(c => c.type === 'token');

    if (clauses.length > 0) {
      const rootVerbSI = _processClause(clauses[0], parentHeadSI, verbRole);
      for (const cl of clauses.slice(1)) {
        _processClause(cl, rootVerbSI, 'cverb');
      }
      for (const grp of groups) {
        _processGroup(grp, rootVerbSI);
      }
      // Token children of this group-as-clause are usually conj
      for (const tok of toks) {
        _assign(tok.surfaceIndex, 'conj', rootVerbSI);
      }
      return rootVerbSI;
    }

    if (groups.length > 0) {
      // No direct clause children — recurse into first group
      const rootVerbSI = _processGroupAsClause(groups[0], parentHeadSI, verbRole);
      for (const grp of groups.slice(1)) {
        _processGroup(grp, rootVerbSI);
      }
      for (const tok of toks) {
        _assign(tok.surfaceIndex, 'conj', rootVerbSI >= 0 ? rootVerbSI : parentHeadSI);
      }
      return rootVerbSI;
    }

    return -1;
  }

  // ── Main clause processor ─────────────────────────────────────────────

  // Returns verbSI of this clause (or parentHeadSI if verbless)
  function _processClause(node, parentHeadSI, verbRole) {
    // Handle group or phrase.np nodes passed to _processClause
    if (node.type === 'group') {
      return _processGroupAsClause(node, parentHeadSI, verbRole);
    }
    if (node.type === 'phrase.np') {
      return _processNP(node, parentHeadSI, verbRole === 'verb' ? 'subj' : verbRole);
    }

    const cn       = (node.construction && node.construction.canonical) || '';
    const children = node.children || [];

    // COORDINATION: first clause = root, groups = coordinated
    if (cn === 'COORDINATION') {
      const rootClause = children.find(c => c.type === 'clause');
      const groups     = children.filter(c => c.type === 'group');
      if (!rootClause) return -1;
      const rootVerbSI = _processClause(rootClause, parentHeadSI, verbRole);
      for (const grp of groups) {
        _processGroup(grp, rootVerbSI);
      }
      return rootVerbSI;
    }

    // CONJOINED_CLAUSE: leading conj token + inner clause or group
    if (cn === 'CONJOINED_CLAUSE') {
      const conjTok    = children.find(c => c.type === 'token');
      const innerCl    = children.find(c => c.type === 'clause');
      const innerGroup = children.find(c => c.type === 'group');

      if (innerCl) {
        const innerVerb = _processClause(innerCl, parentHeadSI, verbRole);
        if (conjTok) _assign(conjTok.surfaceIndex, 'conj', innerVerb);
        return innerVerb;
      }

      if (innerGroup) {
        const innerVerb = _processGroupAsClause(innerGroup, parentHeadSI, verbRole);
        if (conjTok) _assign(conjTok.surfaceIndex, 'conj', innerVerb >= 0 ? innerVerb : parentHeadSI);
        return innerVerb;
      }
      return -1;
    }

    // SUBORDINATE_CLAUSE: leading particle/conj token + inner clause (καθώς, ἵνα, ὅτι etc.)
    if (cn === 'SUBORDINATE_CLAUSE') {
      const conjTok = children.find(c => c.type === 'token');
      const innerCl = children.find(c => c.type === 'clause');
      if (innerCl) {
        const innerVerb = _processClause(innerCl, parentHeadSI, verbRole);
        if (conjTok) _assign(conjTok.surfaceIndex, 'conj', innerVerb >= 0 ? innerVerb : parentHeadSI);
        return innerVerb;
      }
    }

    // NOMINALIZED_CLAUSE: article (ὁ/τοῦ/τό) + inner clause (articular participle/infinitive)
    if (cn === 'NOMINALIZED_CLAUSE') {
      const nomArt  = children.find(c => c.type === 'token');
      const innerCl = children.find(c => c.type === 'clause');
      if (innerCl) {
        const innerVerb = _processClause(innerCl, parentHeadSI, verbRole);
        if (nomArt) _assign(nomArt.surfaceIndex, 'det', innerVerb >= 0 ? innerVerb : parentHeadSI);
        return innerVerb;
      }
    }

    // Implicit coordination: exactly one clause + one or more groups, no direct tokens
    // (JHN 1:3, JHN 1:4: outer clause with cn=undefined, children = clause + group)
    const clauseKids = children.filter(c => c.type === 'clause');
    const groupKids  = children.filter(c => c.type === 'group');
    const tokenKids  = children.filter(c => c.type === 'token');
    if (clauseKids.length === 1 && groupKids.length >= 1 && tokenKids.length === 0) {
      const rootVerbSI = _processClause(clauseKids[0], parentHeadSI, verbRole);
      for (const grp of groupKids) _processGroup(grp, rootVerbSI);
      return rootVerbSI;
    }

    // Simple clause: find main verb among direct children
    const verbTok = _findVerbToken(children);

    if (!verbTok) {
      // No direct verb token — check for function-bearing non-token children (verbless clause)
      const funcNonToken = children.filter(c =>
        c.type !== 'token' && c.function && c.function.canonical);

      if (funcNonToken.length > 0) {
        // Process each child by its function label, anchored to parentHeadSI
        for (const child of children) {
          _processClauseChild(child, parentHeadSI);
        }
        return parentHeadSI;
      }

      // Final fallback: first token = verb role, rest = adv
      const allToks = [];
      _collectTokens(node, allToks);
      if (allToks.length > 0) {
        const si = allToks[0].surfaceIndex;
        _assign(si, verbRole, parentHeadSI);
        allToks.slice(1).forEach(t => _assign(t.surfaceIndex, 'adv', si));
        return si;
      }
      return -1;
    }

    const verbSI = verbTok.surfaceIndex;
    _assign(verbSI, verbRole, parentHeadSI);

    for (const child of children) {
      if (child === verbTok) continue;
      _processClauseChild(child, verbSI);
    }

    return verbSI;
  }

  // ── Group processor ───────────────────────────────────────────────────

  // group: conj token + clause/group/NP/PP children (coordination pair or contrasted phrase)
  function _processGroup(node, rootVerbSI, npRole = 'adj') {
    const children = node.children || [];
    const conjTok  = children.find(c => c.type === 'token');
    const clauses  = children.filter(c => c.type === 'clause');
    const groups   = children.filter(c => c.type === 'group');
    const nps      = children.filter(c => c.type === 'phrase.np');
    const pps      = children.filter(c => c.type === 'phrase.pp');
    const otherToks = children.filter(c => c.type === 'token' && c !== conjTok);

    // Assign conjTok and any extra tokens (negations, alt conjunctions).
    // Use -1 when rootVerbSI is unknown; step iii re-roots h=-1 tokens to the main verb.
    const anchor = rootVerbSI >= 0 ? rootVerbSI : -1;
    if (conjTok) _assign(conjTok.surfaceIndex, 'conj', anchor);
    let otherTokHeadSI = -1;
    for (let ti = 0; ti < otherToks.length; ti++) {
      const t = otherToks[ti];
      const bd = _bdFor(t);
      // When npRole is inherited (non-adj) and the group has no phrase children,
      // the first substantive otherTok is the semantic head and receives npRole.
      const isHead = ti === 0 && npRole !== 'adj' &&
        nps.length === 0 && pps.length === 0 && groups.length === 0 && clauses.length === 0 &&
        !(bd && bd.class === 'neg');
      const r = (bd && bd.class === 'neg') ? 'neg' : isHead ? npRole : 'conj';
      _assign(t.surfaceIndex, r, anchor);
      if (isHead) otherTokHeadSI = t.surfaceIndex;
    }

    if (clauses.length === 0 && groups.length === 0 && nps.length === 0 && pps.length === 0) {
      return otherTokHeadSI;
    }

    let cverbSI = -1;

    if (clauses.length > 0) {
      cverbSI = _processClause(clauses[0], rootVerbSI, 'cverb');
      for (const cl of clauses.slice(1)) {
        _processClause(cl, rootVerbSI, 'cverb');
      }
    }

    for (const grp of groups) {
      _processGroup(grp, cverbSI >= 0 ? cverbSI : rootVerbSI);
    }

    let npHeadSI = -1;
    for (let ni = 0; ni < nps.length; ni++) {
      // First NP (when no cverb) may receive an inherited role (e.g. 'pobj') from the caller.
      const r = (ni === 0 && cverbSI < 0) ? npRole : 'adj';
      const s = _processNP(nps[ni], cverbSI >= 0 ? cverbSI : rootVerbSI, r);
      if (ni === 0 && npHeadSI < 0) npHeadSI = s;
    }

    for (const pp of pps) {
      _processPP(pp, cverbSI >= 0 ? cverbSI : rootVerbSI);
    }

    return cverbSI >= 0 ? cverbSI : npHeadSI;
  }

  // ── Build token map from bible_data chapter JSON ─────────────────────

  /**
   * Build a Map<verseId, bdToken> from a bible_data chapter object.
   * bible_data chapter JSON format: { "0": bdToken, "1": bdToken, ... }
   */
  function buildTokenMap(bdChapter) {
    const m = new Map();
    for (const tok of Object.values(bdChapter)) {
      if (tok && tok.verseId) m.set(tok.verseId, tok);
    }
    return m;
  }

  // ── Text helpers ──────────────────────────────────────────────────────

  function _clean(text) {
    return String(text).replace(/[,;.·—·;·]+$/, '').trim();
  }

  function _morphStr(bdToken) {
    if (!bdToken) return '';
    const cls   = bdToken.class || '';
    const morph = bdToken.morph || '';
    return (cls && morph) ? `${cls} ${morph}` : (morph || cls || '');
  }

  // ── Main export ──────────────────────────────────────────────────────

  /**
   * Convert one SR sentence + bible_data token map to RK word array.
   *
   * @param {object}   srSentence  — { ref, root }
   * @param {Map}      bdTokenMap  — Map<verseId, bdToken> from buildTokenMap()
   * @returns {Array}  RK word rows: [[greek, japanese, morphology, head, role], ...]
   */
  function adaptSentence(srSentence, bdTokenMap) {
    _roleMap = new Map();
    _headMap = new Map();
    _bd      = bdTokenMap;

    // 1. Collect and sort all tokens
    const allTokens = [];
    _collectTokens(srSentence.root, allTokens);
    allTokens.sort((a, b) => a.surfaceIndex - b.surfaceIndex);

    // 2. Build surfaceIndex → 1-based position map
    const siToPos = new Map();
    allTokens.forEach((t, i) => siToPos.set(t.surfaceIndex, i + 1));

    // 3. Walk SR tree to assign roles + heads
    // _processClause handles group/phrase.np roots via early dispatch
    _processClause(srSentence.root, -1, 'verb');

    // 4. Fill in any unassigned tokens (safety fallback)
    for (const t of allTokens) {
      const si = t.surfaceIndex;
      if (!_roleMap.has(si)) {
        const bd  = _bdFor(t);
        const cls = bd && bd.class;
        _roleMap.set(si, cls === 'det' ? 'det' : cls === 'conj' ? 'conj' : 'adv');
        _headMap.set(si, -1);
      }
    }

    // 4b. Normalise verb count and re-root h=-1 orphans to the main verb.

    // Step i: demote excess 'verb' tokens to 'cverb' (keeps the root verb = h=-1 winner)
    const verbTokens = allTokens.filter(t => _roleMap.get(t.surfaceIndex) === 'verb');
    if (verbTokens.length > 1) {
      const rootVerb = verbTokens.find(t => _headMap.get(t.surfaceIndex) === -1) || verbTokens[0];
      for (const t of verbTokens) {
        if (t !== rootVerb) _roleMap.set(t.surfaceIndex, 'cverb');
      }
    }

    // Step ii: promote when verbless (letter greetings, titles, doxologies)
    const verbCount = allTokens.filter(t => _roleMap.get(t.surfaceIndex) === 'verb').length;
    if (verbCount === 0) {
      const candidate =
        allTokens.find(t => _roleMap.get(t.surfaceIndex) === 'subj') ||
        allTokens.find(t => _roleMap.get(t.surfaceIndex) === 'pred') ||
        allTokens[0];
      if (candidate) {
        _roleMap.set(candidate.surfaceIndex, 'verb');
        _headMap.set(candidate.surfaceIndex, -1);
      }
    }

    // Step iii: re-root every remaining h=-1 token to the main verb.
    // Tokens reach h=-1 via: verbless handler (parentHeadSI=-1), safety fallback,
    // or unhandled constructions. The renderer never visits h=0 non-verb nodes.
    const mainVerb = allTokens.find(t => _roleMap.get(t.surfaceIndex) === 'verb');
    if (mainVerb) {
      const verbSI = mainVerb.surfaceIndex;
      for (const t of allTokens) {
        if (t !== mainVerb && _headMap.get(t.surfaceIndex) === -1) {
          _headMap.set(t.surfaceIndex, verbSI);
        }
      }
    }

    // 5. Build output rows
    return allTokens.map(t => {
      const bd      = _bdFor(t);
      const headSI  = _headMap.get(t.surfaceIndex);
      const headPos = headSI === undefined || headSI < 0 ? 0 : (siToPos.get(headSI) || 0);
      const role    = _roleMap.get(t.surfaceIndex) || 'adv';
      return [
        _clean(t.text),
        (bd && bd.japanese) || '',
        _morphStr(bd),
        headPos,
        role,
      ];
    });
  }

  /**
   * Build a Map<position, clickData> for StudyPanel integration.
   * Must be called AFTER adaptSentence() (uses the same bdTokenMap).
   *
   * @param {object} srSentence  — { ref, root }
   * @param {Map}    bdTokenMap  — Map<verseId, bdToken> from buildTokenMap()
   * @returns {Map<number, {greek, rawMorph, ref, lemma}>}
   *   position is 1-based (matches data-i attribute on SVG .wn elements)
   */
  function buildClickMap(srSentence, bdTokenMap) {
    const allTokens = [];
    _collectTokens(srSentence.root, allTokens);
    allTokens.sort((a, b) => a.surfaceIndex - b.surfaceIndex);

    const m = new Map();
    allTokens.forEach((t, i) => {
      const bd = bdTokenMap.get(t.evidence && t.evidence.nodeId) || null;
      m.set(i + 1, {
        greek:    _clean(t.text),
        rawMorph: (bd && bd.morph)  || '',
        ref:      (bd && bd.ref)    || '',
        lemma:    (bd && bd.lemma)  || '',
      });
    });
    return m;
  }

  global.RKReadingAdapter = { adaptSentence, buildTokenMap, buildClickMap };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
