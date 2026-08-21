/**
 * dg-engine.js  P5 — Original Greek NT Diagram Grammar v1
 *
 * DiagramRepresentation (DR) derivation from Structural Representation (SR).
 * SR is SSOT. No new syntactic inference is performed here.
 *
 * Exports: window.DgEngine = { deriveDR, displayText }
 *
 * ──────────────────────────────────────────────────────────────────────
 * DR_Clause schema
 *   id               string
 *   conjunction      string|null   — leading conjunction token text
 *   slots            DR_Slot[]     — main-line elements sorted by surfaceIndex
 *   adverbialPhrases DR_AdvPhrase[] — ADVERBIAL phrase/token nodes
 *   adverbialClauses DR_Clause[]   — ADVERBIAL subordinate clauses
 *   isCoordination   boolean
 *   coordClauses     DR_Clause[]   — sub-clauses for COORDINATION root
 *   noVerb           boolean       — true when no COPULA/PREDICATE slot present
 *
 * DR_Slot
 *   fn         string   — function.canonical
 *   node       object   — SR node (phrase or token)
 *   connector  null | 'sp' | 'po' | 'complement' | 'implied'
 *                sp:         full vertical divider  S | P
 *                po:         short vertical divider P | O
 *                complement: backward diagonal      P \ C
 *                implied:    dashed diagonal for verbless predication
 *   si         number   — min surfaceIndex (for ordering)
 *
 * DR_AdvPhrase
 *   fn    string
 *   node  object
 *   si    number
 * ──────────────────────────────────────────────────────────────────────
 */
(function (global) {
  'use strict';

  // Functions that appear on the main horizontal line
  const MAIN_FN = new Set([
    'SUBJECT', 'COPULA', 'PREDICATE', 'OBJECT',
    'COMPLEMENT', 'INDIRECT_OBJECT', 'SECOND_OBJECT', 'AUX',
  ]);

  // ── Surface-index helpers ─────────────────────────────────────────────

  function minSI(node) {
    if (!node) return Infinity;
    if (node.type === 'token') {
      return typeof node.surfaceIndex === 'number' ? node.surfaceIndex : Infinity;
    }
    let m = Infinity;
    for (const c of (node.children || [])) {
      const v = minSI(c);
      if (v < m) m = v;
    }
    return m === Infinity ? 0 : m;
  }

  function getTokens(node) {
    if (!node) return [];
    if (node.type === 'token') return [node];
    const out = [];
    for (const c of (node.children || [])) out.push(...getTokens(c));
    return out.sort((a, b) => (a.surfaceIndex ?? 0) - (b.surfaceIndex ?? 0));
  }

  function displayText(node) {
    return getTokens(node).map(t => t.text || '').join(' ').trim();
  }

  // ── Connector logic ───────────────────────────────────────────────────

  function connectorBetween(prevFn, curFn, noVerb) {
    const vc   = prevFn === 'COPULA'     || curFn === 'COPULA';
    const vp   = prevFn === 'PREDICATE'  || curFn === 'PREDICATE';
    const subj = prevFn === 'SUBJECT'    || curFn === 'SUBJECT';
    const comp = prevFn === 'COMPLEMENT' || curFn === 'COMPLEMENT';
    const obj  = prevFn === 'OBJECT'     || curFn === 'OBJECT';

    if (noVerb) {
      // Verbless predication: dashed diagonal between Subject and Complement
      if (subj && comp) return 'implied';
      // F-01 fix: multiple Complements in verbless clause connect with implied diagonal
      if (prevFn === 'COMPLEMENT' && curFn === 'COMPLEMENT') return 'implied';
      return null;
    }
    if (vc) {
      if (subj) return 'sp';
      if (comp) return 'complement';
      return null;
    }
    if (vp) {
      if (subj) return 'sp';
      if (comp) return 'complement';
      if (obj)  return 'po';
      return null;
    }
    return null;
  }

  // ── P5-D morphological helpers ────────────────────────────────────────
  // morph_raw format: V-{Tense}{Voice}{Mood}-{Case/Person}{Number}{Gender}
  // Position 4 (0-indexed) = Mood: 'P' = Participle, 'I' = Indicative, etc.

  function isParticiple(t) {
    const m = t.evidence && t.evidence.morph_raw;
    return typeof m === 'string' && m.startsWith('V-') && m.length > 4 && m[4] === 'P';
  }

  // Relative pronoun: morph starts with R- (ὅς/ἥ/ὅ) or K- (ὅσος correlative)
  function isRelPronToken(t) {
    const m = t.evidence && t.evidence.morph_raw;
    return typeof m === 'string' && (m.startsWith('R-') || m.startsWith('K-'));
  }

  // ── P6-C: Relative-clause connector helpers ───────────────────────────────

  // Nominal morph check (bible_data .morph field, e.g. "N-NSM", "A-NSM", "V-PAP-NSM").
  // Allows noun, adjective/numeral, nominal participle.
  // Forbids finite verb (R4), article, demonstrative, conjunction, particle, etc.
  function _isNominalMorph(morph) {
    if (!morph || typeof morph !== 'string') return false;
    if (morph.startsWith('N-')) return true;
    if (morph.startsWith('A-')) return true;
    // participle: V- with mood char 'P' at position 4 (e.g. V-PAP-NSM)
    return morph.startsWith('V-') && morph.length > 4 && morph[4] === 'P';
  }

  // Returns the first relative pronoun SR token found in the subtree, or null.
  function _findRelPronInSubtree(node) {
    if (!node) return null;
    if (node.type === 'token' && isRelPronToken(node)) return node;
    for (const c of (node.children || [])) {
      const found = _findRelPronInSubtree(c);
      if (found) return found;
    }
    return null;
  }

  // For a CLAUSE_AS_NP slot node, extracts embedded relative clause children and returns
  // { headSIs: Set<number>, embeddedClauses: [{dr, relPronRef, relPronNodeId}] } or null.
  // headSIs contains surface indices of NON-relative-clause children (head noun tokens).
  // If the node is not CLAUSE_AS_NP or has no embedded relative clauses, returns null.
  function _extractEmbeddedRelClauses(node) {
    if (!node || node.type === 'token') return null;
    const cn = node.construction && node.construction.canonical;
    if (cn !== 'CLAUSE_AS_NP') return null;

    const embeddedClauses = [];
    const headSIs = new Set();

    for (const child of (node.children || [])) {
      const relTok = (child.type === 'clause' || child.type === 'group')
        ? _findRelPronInSubtree(child) : null;
      if (relTok) {
        const dr = deriveFromNode(child);
        embeddedClauses.push({
          dr,
          relPronRef:    relTok.evidence ? (relTok.evidence.ref    || null) : null,
          relPronNodeId: relTok.evidence ? (relTok.evidence.nodeId || null) : null,
        });
      } else {
        getTokens(child).forEach(t => {
          if (typeof t.surfaceIndex === 'number') headSIs.add(t.surfaceIndex);
        });
      }
    }

    return embeddedClauses.length > 0 ? { headSIs, embeddedClauses } : null;
  }

  // Walk the SR tree rooted at sentenceRoot and collect all relative pronoun tokens.
  // Returns [{ relPronRef, relPronNodeId }] where relPronRef = evidence.ref (e.g. "JHN 1:9!6").
  function _collectRelPronTokens(node, results) {
    if (!node) return;
    if (node.type === 'token') {
      if (isRelPronToken(node) && node.evidence) {
        results.push({
          relPronRef:    node.evidence.ref    || null,
          relPronNodeId: node.evidence.nodeId || null,
          relPronText:   node.text            || '',
        });
      }
      return;
    }
    for (const c of (node.children || [])) _collectRelPronTokens(c, results);
  }

  // Derive relative clause connectors for one SR sentence.
  // sentenceRoot — SR root node
  // bdByRef      — Map<ref, bdToken>   (bible_data token keyed by w.ref e.g. "JHN 1:9!6")
  // bdById       — Map<verseId, bdToken> (bible_data token keyed by w.verseId / MACULA node ID)
  //
  // Returns Array<{ relPronRef, relPronText, targetRef, targetText, targetNodeId }>
  // Only entries that pass ALL eligibility checks are included.
  //
  // Eligibility checks (from P6-C mandate):
  //   1. Relative pronoun in SR
  //   2. bible_data token with matching ref exists
  //   3. .referent field exists (non-empty string)
  //   4. .referent has no space (R3 multi-token skip)
  //   5. target token exists in bdById
  //   6. target .morph passes _isNominalMorph (R4 finite verb excluded)
  function deriveRelativeConnectors(sentenceRoot, bdByRef, bdById) {
    const connectors = [];
    if (!sentenceRoot || !bdByRef || !bdById) return connectors;

    const relProns = [];
    _collectRelPronTokens(sentenceRoot, relProns);

    for (const rp of relProns) {
      if (!rp.relPronRef) continue;

      const bdTok = bdByRef.get(rp.relPronRef);
      if (!bdTok) continue;

      const referent = bdTok.referent;
      if (!referent || typeof referent !== 'string') continue;
      if (referent.includes(' ')) continue;          // R3: multi-token skip

      const targetTok = bdById.get(referent);
      if (!targetTok) continue;

      const targetMorph = targetTok.morph || '';
      if (!_isNominalMorph(targetMorph)) continue;  // R4 + non-nominal exclusion

      connectors.push({
        relPronRef:    rp.relPronRef,
        relPronText:   rp.relPronText,
        targetRef:     targetTok.ref    || null,
        targetText:    targetTok.text   || '',
        targetNodeId:  referent,
      });
    }

    return connectors;
  }

  // Extract PP internal structure: first token = preposition, rest = governed NP.
  // Returns { prepToken, npNode } or null when node is not a PREP_PHRASE.
  function extractPPStructure(node) {
    if (!node) return null;
    if ((node.construction && node.construction.canonical) !== 'PREP_PHRASE') return null;
    const ch = node.children || [];
    if (ch.length < 2) return null;
    const prepToken = ch[0];
    if (prepToken.type !== 'token') return null;
    // Single NP child or multiple — wrap multiples for displayText compatibility
    const npNode = ch.length === 2 ? ch[1] : { type: '_pp_np_group', children: ch.slice(1) };
    return { prepToken, npNode };
  }

  // ── Word-level modifier extraction ───────────────────────────────────
  // Uses SR construction.canonical and morph_raw — no new syntactic inference.

  // Shared helper for ADJ_MOD children.
  // Clause child → adjectival modifier. Token fn=PREDICATE/COPULA → adjectival modifier token.
  // Other tokens → head. Other nodes → all tokens to head.
  function _extractAdjMod(children, headSIs, modifiers) {
    for (const child of children) {
      if (child.type === 'clause') {
        modifiers.push({ node: child, label: '形容詞的修飾', si: minSI(child) });
      } else if (child.type === 'token') {
        const childFn = child.function?.canonical;
        if (childFn === 'PREDICATE' || childFn === 'COPULA') {
          modifiers.push({ node: child, label: '形容詞的修飾', si: child.surfaceIndex });
        } else {
          headSIs.add(child.surfaceIndex);
        }
      } else {
        getTokens(child).forEach(t => headSIs.add(t.surfaceIndex));
      }
    }
  }

  function isGenitiveToken(t) {
    const m = t.evidence && t.evidence.morph_raw;
    // morph_raw format: "POS-CaseNumberGender" e.g. "N-GSM" — case at index 2
    return typeof m === 'string' && m.length >= 3 && m[2] === 'G';
  }

  function allGenitiveTokens(node) {
    const toks = getTokens(node);
    return toks.length > 0 && toks.every(isGenitiveToken);
  }

  // Returns { headSIs: Set<number>, modifiers: [{node, label, si}] } or null.
  // Handles:
  //   Case A — slot node IS a GENITIVE_MOD construction
  //   Case B — slot node contains a direct ADV_MOD child (ARTICULAR_NP wrapper)
  //   Case C — slot node contains a direct GENITIVE_MOD child (ARTICULAR_NP wrapper)
  function extractSlotModifiers(node) {
    if (!node || node.type === 'token') return null;
    const cn = node.construction && node.construction.canonical;
    const children = node.children || [];

    // Case D: slot node IS ADJ_MOD construction (head noun + adjectival clause/token modifier)
    if (cn === 'ADJ_MOD') {
      const headSIs = new Set();
      const modifiers = [];
      _extractAdjMod(children, headSIs, modifiers);
      return modifiers.length > 0 ? { headSIs, modifiers } : null;
    }

    // Case A: slot itself is GENITIVE_MOD (e.g. EPH 2:8 s4 second COMPLEMENT)
    if (cn === 'GENITIVE_MOD') {
      const genitives = [], heads = [];
      for (const c of children) {
        if (c.type === 'token') {
          (isGenitiveToken(c) ? genitives : heads).push(c);
        } else {
          (allGenitiveTokens(c) ? genitives : heads).push(c);
        }
      }
      if (genitives.length > 0 && heads.length > 0) {
        const headSIs = new Set();
        heads.forEach(h => getTokens(h).forEach(t => headSIs.add(t.surfaceIndex)));
        return {
          headSIs,
          modifiers: genitives.map(g => ({ node: g, label: '属格修飾', si: minSI(g) })),
        };
      }
      return null;
    }

    // Case B/C: ARTICULAR_NP (or similar) whose direct children include ADV_MOD or GENITIVE_MOD
    const headSIs = new Set();
    const modifiers = [];
    let hasModifiers = false;

    for (const child of children) {
      const childCn = child.construction && child.construction.canonical;

      if (childCn === 'ADV_MOD') {
        // Case B: head = token children of ADV_MOD; modifier = phrase children of ADV_MOD
        hasModifiers = true;
        for (const a of (child.children || [])) {
          if (a.type === 'token') headSIs.add(a.surfaceIndex);
          else modifiers.push({ node: a, label: '副詞的修飾', si: minSI(a) });
        }

      } else if (childCn === 'GENITIVE_MOD') {
        // Case C: within GENITIVE_MOD, non-genitive = head, genitive = modifier;
        // ADJ_MOD child within GENITIVE_MOD handled via _extractAdjMod (Case D sub-case)
        hasModifiers = true;
        for (const g of (child.children || [])) {
          const gCn = g.construction?.canonical;
          if (gCn === 'ADJ_MOD') {
            _extractAdjMod(g.children || [], headSIs, modifiers);
          } else if (g.type === 'token') {
            if (isGenitiveToken(g)) modifiers.push({ node: g, label: '属格修飾', si: g.surfaceIndex });
            else headSIs.add(g.surfaceIndex);
          } else {
            if (allGenitiveTokens(g)) modifiers.push({ node: g, label: '属格修飾', si: minSI(g) });
            else getTokens(g).forEach(t => headSIs.add(t.surfaceIndex));
          }
        }

      } else {
        // Non-modifier child: all tokens belong to the head
        if (child.type === 'token') headSIs.add(child.surfaceIndex);
        else getTokens(child).forEach(t => headSIs.add(t.surfaceIndex));
      }
    }

    return (hasModifiers && modifiers.length > 0) ? { headSIs, modifiers } : null;
  }

  // Returns Greek text for the HEAD tokens of a slot (excluding extracted modifiers).
  // If headSIs is null, returns the full displayText (backwards-compatible).
  function headDisplayText(node, headSIs) {
    if (!headSIs || headSIs.size === 0) return displayText(node);
    const result = getTokens(node)
      .filter(t => headSIs.has(t.surfaceIndex))
      .map(t => t.text || '')
      .join(' ')
      .trim();
    return result || displayText(node); // safety fallback
  }

  // ── Clause-core derivation ────────────────────────────────────────────

  function deriveClauseCore(clauseNode, conjunction) {
    const mainSlots        = [];
    const adverbialPhrases = [];
    const adverbialClauses = [];

    for (const child of (clauseNode.children || [])) {
      const fn = child.function?.canonical;
      if (!fn) {
        // P5-E-1: fn=null structural container — traverse to reach fn-marked descendants
        if (child.type === 'clause' || child.type === 'group') {
          const sub = deriveFromNode(child);
          if (sub) {
            // P6-C: detect STANDALONE relative clause and annotate DR
            const relTok = _findRelPronInSubtree(child);
            if (relTok && relTok.evidence) {
              sub.isRelativeClause = true;
              sub.relPronRef = relTok.evidence.ref || null;
            }
            adverbialClauses.push(sub);
          }
        }
        continue;
      }

      if (fn === 'ADVERBIAL') {
        if (child.type === 'clause') {
          const sub = deriveFromNode(child);
          if (sub) adverbialClauses.push(sub);
        } else if (child.type === 'group') {
          // P5-D-1: adverbial group may contain multiple participial/adverbial clauses
          const groupClauses = (child.children || []).filter(
            c => c.type === 'clause' || c.type === 'group'
          );
          if (groupClauses.length > 0) {
            for (const gc of groupClauses) {
              const sub = deriveFromNode(gc);
              if (sub) adverbialClauses.push(sub);
            }
          } else {
            // Group with no inner clauses — render as phrase
            const ppS = extractPPStructure(child);
            adverbialPhrases.push({
              fn: 'ADVERBIAL', node: child, si: minSI(child),
              ppPrep: ppS ? ppS.prepToken.text : null,
              ppNpNode: ppS ? ppS.npNode : null,
              ppNpModInfo: ppS && ppS.npNode ? extractSlotModifiers(ppS.npNode) : null,
            });
          }
        } else {
          // P5-D-3: expose PP internal structure for adverbial phrases
          const ppS = extractPPStructure(child);
          adverbialPhrases.push({
            fn: 'ADVERBIAL', node: child, si: minSI(child),
            ppPrep: ppS ? ppS.prepToken.text : null,
            ppNpNode: ppS ? ppS.npNode : null,
            ppNpModInfo: ppS && ppS.npNode ? extractSlotModifiers(ppS.npNode) : null,
          });
        }
      } else if (MAIN_FN.has(fn)) {
        const modInfo = extractSlotModifiers(child);
        // P5-D-1: mark participial PREDICATE/COPULA slots
        const tok0 = child.type === 'token' ? child : (getTokens(child)[0] || null);
        const isParticipial = (fn === 'PREDICATE' || fn === 'COPULA') && tok0 ? isParticiple(tok0) : false;
        // P6-C: CLAUSE_AS_NP — extract embedded relative clauses, narrow headSIs
        const embeddedRelInfo = _extractEmbeddedRelClauses(child);
        mainSlots.push({
          fn, node: child, connector: null, si: minSI(child),
          modifiers: modInfo ? modInfo.modifiers : [],
          headSIs:   embeddedRelInfo ? embeddedRelInfo.headSIs : (modInfo ? modInfo.headSIs : null),
          isParticipial,
          embeddedRelClauses: embeddedRelInfo ? embeddedRelInfo.embeddedClauses : [],
        });
      }
    }

    mainSlots.sort((a, b) => a.si - b.si);

    const hasVerb = mainSlots.some(s => s.fn === 'COPULA' || s.fn === 'PREDICATE');

    for (let i = 1; i < mainSlots.length; i++) {
      mainSlots[i].connector = connectorBetween(
        mainSlots[i - 1].fn, mainSlots[i].fn, !hasVerb
      );
    }

    // P5-D-1: clause is participial when its primary PREDICATE/COPULA token is a participle
    const isParticipalClause = mainSlots.some(
      s => (s.fn === 'PREDICATE' || s.fn === 'COPULA') && s.isParticipial
    );

    return {
      id: clauseNode.id,
      conjunction,
      slots: mainSlots,
      adverbialPhrases,
      adverbialClauses,
      isCoordination: false,
      coordClauses: [],
      noVerb: !hasVerb,
      isParticipalClause,
    };
  }

  // ── Group derivation (UNRESOLVED construction) ────────────────────────

  function deriveFromGroup(node, conjunction) {
    const clauseChild  = (node.children || []).find(c => c.type === 'clause');
    const extraPhrases = (node.children || []).filter(
      c => c.type !== 'clause' && c.type !== 'token' && c.function?.canonical
    );

    let dr;
    if (clauseChild) {
      dr = deriveClauseCore(clauseChild, conjunction);
    } else {
      dr = {
        id: node.id, conjunction,
        slots: [], adverbialPhrases: [], adverbialClauses: [],
        isCoordination: false, coordClauses: [], noVerb: true,
        isParticipalClause: false,
      };
    }

    // Merge extra functional phrase siblings into main slots
    for (const p of extraPhrases) {
      const fn = p.function?.canonical;
      if (fn && MAIN_FN.has(fn)) {
        const modInfo = extractSlotModifiers(p);
        const tok0 = p.type === 'token' ? p : (getTokens(p)[0] || null);
        const isParticipial = (fn === 'PREDICATE' || fn === 'COPULA') && tok0 ? isParticiple(tok0) : false;
        dr.slots.push({
          fn, node: p, connector: null, si: minSI(p),
          modifiers: modInfo ? modInfo.modifiers : [],
          headSIs:   modInfo ? modInfo.headSIs   : null,
          isParticipial,
        });
      } else if (fn === 'ADVERBIAL') {
        const ppS = extractPPStructure(p);
        dr.adverbialPhrases.push({
          fn: 'ADVERBIAL', node: p, si: minSI(p),
          ppPrep: ppS ? ppS.prepToken.text : null,
          ppNpNode: ppS ? ppS.npNode : null,
          ppNpModInfo: ppS && ppS.npNode ? extractSlotModifiers(ppS.npNode) : null,
        });
      }
    }

    if (dr.slots.length > 1) {
      dr.slots.sort((a, b) => a.si - b.si);
      const hasVerb = dr.slots.some(s => s.fn === 'COPULA' || s.fn === 'PREDICATE');
      dr.noVerb = !hasVerb;
      for (let i = 1; i < dr.slots.length; i++) {
        dr.slots[i].connector = connectorBetween(
          dr.slots[i - 1].fn, dr.slots[i].fn, !hasVerb
        );
      }
    }
    // Recompute isParticipalClause to account for merged extra-phrase slots
    if (dr.slots.some(s => (s.fn === 'PREDICATE' || s.fn === 'COPULA') && s.isParticipial)) {
      dr.isParticipalClause = true;
    }

    return dr;
  }

  // ── Main derivation dispatcher ────────────────────────────────────────

  function deriveFromNode(node) {
    if (!node) return null;
    const cn = node.construction?.canonical;

    // COORDINATION: container for 3+ clauses joined by conjunctions
    if (cn === 'COORDINATION') {
      const coordClauses = [];
      for (const child of (node.children || [])) {
        if (child.type === 'clause') {
          coordClauses.push(deriveClauseCore(child, null));
        } else if (child.type === 'group') {
          const conjTok = (child.children || []).find(
            c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
          );
          const inner = (child.children || []).find(
            c => c.type === 'clause' || c.type === 'group'
          );
          if (inner) {
            const conj = conjTok?.text || null;
            const sub = inner.type === 'clause'
              ? deriveClauseCore(inner, conj)
              : deriveFromGroup(inner, conj);
            if (sub) coordClauses.push(sub);
          }
        }
      }
      return {
        id: node.id,
        conjunction: null,
        slots: [],
        adverbialPhrases: [],
        adverbialClauses: [],
        isCoordination: true,
        coordClauses,
        noVerb: false,
      };
    }

    // CONJOINED_CLAUSE: wrapper with leading CONJ token + inner content
    if (cn === 'CONJOINED_CLAUSE') {
      const conjTok = (node.children || []).find(
        c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
      );
      const inner = (node.children || []).find(c => c.type !== 'token');
      if (inner) {
        const dr = deriveFromNode(inner);
        if (dr) {
          dr.conjunction = conjTok?.text || null;
          return dr;
        }
      }
      return deriveClauseCore(node, conjTok?.text || null);
    }

    // SUBORDINATE_CLAUSE / RELATIVE_CLAUSE / CONTENT_CLAUSE / PARTICIPIAL_CLAUSE
    // Structure: [CONJ token] + [inner content clause]
    if (cn === 'SUBORDINATE_CLAUSE' || cn === 'RELATIVE_CLAUSE' ||
        cn === 'CONTENT_CLAUSE'    || cn === 'PARTICIPIAL_CLAUSE') {
      const conjTok = (node.children || []).find(
        c => c.type === 'token' && c.evidence?.morph_raw?.startsWith('CONJ')
      );
      const inner = (node.children || []).find(c => c.type === 'clause' || c.type === 'group');
      if (inner) {
        const dr = inner.type === 'clause'
          ? deriveClauseCore(inner, conjTok?.text || null)
          : deriveFromGroup(inner, conjTok?.text || null);
        return dr;
      }
      return deriveClauseCore(node, conjTok?.text || null);
    }

    // Regular clause (any other construction, including WORD_ORDER axis)
    if (node.type === 'clause') {
      return deriveClauseCore(node, null);
    }

    // Group (UNRESOLVED or otherwise)
    if (node.type === 'group') {
      return deriveFromGroup(node, null);
    }

    return null;
  }

  // ── Public API ────────────────────────────────────────────────────────

  function deriveDR(sentenceRoot) {
    try {
      return deriveFromNode(sentenceRoot);
    } catch (_) {
      return null;
    }
  }

  global.DgEngine = { deriveDR, displayText, headDisplayText, deriveRelativeConnectors };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
