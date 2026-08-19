/**
 * public/core/icl-engine.js
 * P4-ICL Runtime Integration — production browser runtime
 *
 * Ported from P3-E/P3-I scratchpad PoC.
 * Exports: window.App.icl = { triggerICL, buildICLIndex, extractPresentationPayload }
 *
 * Constraints (frozen):
 *   - Wallace annotation only (r5_wallace = null on all candidates)
 *   - L-0 boundary: no 'correct'/'incorrect'/'definitive'/'best_interpretation' fields
 *   - JHN 1:1c predicate nominative sub_type: NEVER auto-determined
 *   - Presentation: max 3, no NONE, no ELIMINATE, no supplementation
 *   - Conservation: total_input_types = eliminated_count + surviving_count
 *   - deepFreeze on all CandidateSet outputs
 *   - feature flag: window.App.flags.iclEnabled
 */
(function () {
    'use strict';

    /* ──────────────────────────────────────────────────────────────────
       §1  Constants (P3-E constants.cjs)
    ────────────────────────────────────────────────────────────────── */

    const EVIDENCE_STRENGTH = Object.freeze({
        NONE: 'NONE', WEAK: 'WEAK', MODERATE: 'MODERATE', STRONG: 'STRONG',
    });
    const EVIDENCE_ORDER = Object.freeze({ STRONG: 0, MODERATE: 1, WEAK: 2, NONE: 3 });
    const CONFIDENCE_THRESHOLDS = Object.freeze({ strong: 0.75, moderate: 0.55 });
    const SCORE_CLAMP = Object.freeze({ min: 30, max: 99 });
    const MAX_SINGLE_SIGNAL_VALUE = 35;
    const ELIMINATION_RULES = Object.freeze({ E1: 'E-1', E2: 'E-2', E3: 'E-3', E4: 'E-4' });
    const WALLACE_CATEGORY = Object.freeze({ A: 'A', B: 'B', C: 'C' });
    const SIGNAL_CLASS = Object.freeze({ S1: 'S-1', S2: 'S-2', S3: 'S-3', S4: 'S-4', S5: 'S-5' });
    const MAX_PRESENTATION_CANDIDATES = 3;
    const ICL_VERSION = 'P4-runtime-1.0';

    // Nominal POS codes for category derivation
    const NOMINAL_POS = new Set(['N', 'A', 'R']);
    const CASE_MAP = Object.freeze({ G: 'genitive', D: 'dative', N: 'nominative', A: 'accusative', V: 'vocative', L: 'locative' });
    const IMPLEMENTED_CATEGORIES = new Set(['genitive', 'dative', 'nominative']);

    /* ──────────────────────────────────────────────────────────────────
       §1b  Greek Unicode normalization
       Registry lemma lists (e.g. ἀποθνήσκω) and bible_data lemmas
       (e.g. ἀποθνῄσκω) can differ in whether η carries an iota
       subscript (ῄ vs η). NFD + strip combining diacritics normalizes
       both to the same accentless base string for lemma-list lookup.
       This resolves AF-1 lemma-list mismatches in production.
    ────────────────────────────────────────────────────────────────── */

    function normGreek(s) {
        if (!s || typeof s !== 'string') return '';
        // NFD decomposes precomposed chars; then strip all combining diacritics
        // (U+0300–U+036F covers accents, breathings, iota subscript U+0345, etc.)
        return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    /* ──────────────────────────────────────────────────────────────────
       §2  deepFreeze
    ────────────────────────────────────────────────────────────────── */

    function deepFreeze(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        Object.getOwnPropertyNames(obj).forEach(name => {
            const val = obj[name];
            if (val && typeof obj === 'object') deepFreeze(val);
        });
        return Object.freeze(obj);
    }

    /* ──────────────────────────────────────────────────────────────────
       §3  Category derivation (P3-K §1.3 frozen)
    ────────────────────────────────────────────────────────────────── */

    function deriveCategory(morphRaw) {
        if (!morphRaw || typeof morphRaw !== 'string') return null;
        const pos = morphRaw.split('-')[0];
        if (!NOMINAL_POS.has(pos)) return null;
        const caseChar = morphRaw.length >= 3 ? morphRaw[2] : null;
        return CASE_MAP[caseChar] || null;
    }

    // Find morph_raw of the head token in an SR node (checks direct token children)
    function getNodeMorphRaw(srNode) {
        for (const ch of (srNode.children || [])) {
            if (ch.type === 'token' && ch.evidence) {
                const m = ch.evidence.morph_raw || ch.evidence.morph || '';
                if (m && deriveCategory(m) !== null) return m;
            }
        }
        return null;
    }

    /* ──────────────────────────────────────────────────────────────────
       §4  Head token identification (P3-E head_token.cjs)
    ────────────────────────────────────────────────────────────────── */

    const LEXICAL_POS = new Set(['N', 'A', 'R', 'V', 'D']);

    function morphPos(morph) { return morph ? morph.split('-')[0] : null; }
    function isNoun(morph)    { return morphPos(morph) === 'N'; }
    function isPronoun(morph) { return morphPos(morph) === 'R'; }
    function isLexical(morph) { return LEXICAL_POS.has(morphPos(morph)); }
    function isMainVerb(morph) {
        if (!morph || morphPos(morph) !== 'V') return false;
        const parts = morph.split('-');
        if (parts.length < 2) return false;
        const mood = (parts[1] || '')[3];
        return mood && mood !== 'P' && mood !== 'N';
    }

    function identifyHeadToken(srNode) {
        const children = (srNode.children || []);
        const tokens = children.filter(ch => ch.type === 'token' && ch.evidence && (ch.evidence.morph_raw || ch.evidence.morph));
        const result = { token: null, method: 'missing', ambiguous: false, candidates_considered: [], excluded: [], error: null };

        if (tokens.length === 0) {
            result.error = 'MISSING_HEAD: no token children in SR node';
            return result;
        }

        const lexical    = tokens.filter(t => isLexical(t.evidence.morph_raw || t.evidence.morph || ''));
        const nonLexical = tokens.filter(t => !isLexical(t.evidence.morph_raw || t.evidence.morph || ''));
        result.excluded = nonLexical.map(t => `${t.text} (${t.evidence.morph_raw || t.evidence.morph || ''} = non-lexical)`);

        if (lexical.length === 0) {
            result.error = 'MISSING_HEAD: all tokens are non-lexical';
            return result;
        }

        const nodeType  = srNode.type || '';
        const cnCanon   = (srNode.construction || {}).canonical || '';

        if (nodeType === 'phrase.np' || cnCanon.includes('NP')) {
            const nouns = lexical.filter(t => isNoun(t.evidence.morph_raw || t.evidence.morph || ''));
            result.candidates_considered = nouns.map(t => `${t.text} (${t.evidence.morph_raw || ''})`);
            if (nouns.length === 1) { result.token = nouns[0]; result.method = 'noun_from_np'; return result; }
            if (nouns.length > 1) { result.token = nouns[nouns.length - 1]; result.method = 'fallback_rightmost'; result.ambiguous = true; return result; }
            result.token = lexical[0]; result.method = 'fallback_firstlexical'; result.ambiguous = lexical.length > 1;
            result.candidates_considered = lexical.map(t => `${t.text} (${t.evidence.morph_raw || ''})`);
            return result;
        }

        if (nodeType === 'phrase.pp' || cnCanon.includes('PP')) {
            const prepIdx = tokens.findIndex(t => morphPos(t.evidence.morph_raw || t.evidence.morph || '') === 'P');
            const afterPrep = prepIdx >= 0 ? tokens.slice(prepIdx + 1) : tokens;
            const governed  = afterPrep.filter(t => isNoun(t.evidence.morph_raw || t.evidence.morph || '') || isPronoun(t.evidence.morph_raw || t.evidence.morph || ''));
            result.candidates_considered = governed.map(t => `${t.text} (${t.evidence.morph_raw || ''})`);
            if (governed.length >= 1) {
                result.token = governed[0];
                result.method = governed.length === 1 ? 'governed_noun_from_pp' : 'fallback_firstlexical';
                result.ambiguous = governed.length > 1;
                return result;
            }
        }

        result.token = lexical[0]; result.method = 'fallback_firstlexical'; result.ambiguous = lexical.length > 1;
        result.candidates_considered = lexical.map(t => `${t.text} (${t.evidence.morph_raw || ''})`);
        return result;
    }

    /* ──────────────────────────────────────────────────────────────────
       §5  Elimination rules (P3-E/P3-I eliminator)
    ────────────────────────────────────────────────────────────────── */

    const DATIVE_E3_RULES = {
        'dative.indirect_object': { condition: 'giving/communication verb must be present in clause',      applies: c => !c.isGivingVerb,      evidence: c => `${c.verbLemma} ∉ giving_verb_lemmas`,           wallaceCategory: WALLACE_CATEGORY.A },
        'dative.ethical':         { condition: 'first/second person personal pronoun must be dative token', applies: c => !c.isEthicalPronoun,  evidence: c => `${c.headLemma} ∉ ethical_pronoun_lemmas`,       wallaceCategory: WALLACE_CATEGORY.A },
        'dative.possession':      { condition: 'copula verb (εἰμί/γίνομαι) must be present in clause',     applies: c => !c.hasCopula,         evidence: c => `No copula in clause; main verb = ${c.verbLemma}`, wallaceCategory: WALLACE_CATEGORY.A },
        'dative.time':            { condition: 'temporal noun lemma required (ἡμέρα, ὥρα, νύξ, καιρός, χρόνος, σάββατον)', applies: c => !c.isTemporalNoun, evidence: c => `${c.headLemma} ∉ trigger_lemmas (dative.time)`, wallaceCategory: WALLACE_CATEGORY.A },
        'dative.association':     { condition: 'σύν-compound verb or σύν preposition required',            applies: c => !c.hasSynCompound && !c.hasSunPreposition, evidence: c => `${c.verbLemma} has no σύν- prefix`, wallaceCategory: WALLACE_CATEGORY.A },
        'dative.agent':           { condition: 'verb must be in passive voice',                            applies: c => !c.isPassive,         evidence: c => `Verb voice = active (${c.verbMorph}); agent dative requires passive`, wallaceCategory: WALLACE_CATEGORY.A },
        'dative.measure':         { condition: 'measure/degree lemma or comparative required',             applies: c => !c.isMeasureLemma,    evidence: c => `${c.headLemma} ∉ measure_lemmas`,               wallaceCategory: WALLACE_CATEGORY.A },
    };

    const NOMINATIVE_E3_RULES = {};

    const GENITIVE_E3_RULES = {
        'genitive.time':     { condition: 'temporal noun required (νύξ, ἡμέρα, ὥρα, καιρός, χρόνος, ἑσπέρα, σάββατον)', applies: c => !c.isTemporalNoun,       evidence: c => `${c.headLemma} ∉ trigger_lemmas (genitive.time)`, wallaceCategory: WALLACE_CATEGORY.A },
        'genitive.place':    { condition: 'recognized place noun required (ὕδωρ, γῆ, ὁδός, θάλασσα, οὐρανός, τόπος)',     applies: c => !c.isPlaceLemma,         evidence: c => `${c.headLemma} ∉ place_noun_lemmas`,            wallaceCategory: WALLACE_CATEGORY.A },
        'genitive.absolute': { condition: 'genitive participle must be present in clause',                                  applies: c => !c.hasGenitiveParticiple, evidence: () => 'No genitive participle found in clause tokens',  wallaceCategory: WALLACE_CATEGORY.A },
    };

    function applyEliminationRules(typeId, category, typeDef, ctx) {
        const rules = category === 'dative'    ? DATIVE_E3_RULES
                    : category === 'nominative' ? NOMINATIVE_E3_RULES
                    : category === 'genitive'   ? GENITIVE_E3_RULES
                    : {};
        const rule = rules[typeId];
        if (rule && rule.applies(ctx)) {
            return { eliminated: true, rule: ELIMINATION_RULES.E3, condition: rule.condition, evidence: rule.evidence(ctx), wallaceCategory: rule.wallaceCategory, provenance: 'syntax-registry.json lemma lists + SR morph/context scan' };
        }
        return { eliminated: false };
    }

    function applyWallaceBoundary(typeDef) {
        const wallaceRef = typeDef.wallace_ref || null;
        const wallaceCat = typeDef.wallace_category || WALLACE_CATEGORY.C;
        return { wallace_ref: wallaceRef, wallace_category: wallaceCat, computational_effect: wallaceCat === WALLACE_CATEGORY.C ? 'NONE' : 'allowed' };
    }

    /* ──────────────────────────────────────────────────────────────────
       §6  Signal evaluation / ranking (P3-E ranker + P3-I ranker_g)
    ────────────────────────────────────────────────────────────────── */

    function evaluateSingleSignal(signalId, ctx) {
        switch (signalId) {
            // Dative signals (P3-E)
            case 'giving_verb':            return !!ctx.isGivingVerb;
            case 'personal_noun':          return !!ctx.isPersonalNoun;
            case 'no_preposition':         return !ctx.hasPreposition;
            case 'after_preposition':      return !!ctx.hasPreposition;
            case 'benefactive_verb':       return !!ctx.isBenefactiveVerb;
            case 'no_indirect_obj_verb':   return !ctx.isGivingVerb;
            case 'adversative_verb':       return !!ctx.isAdversativeVerb;
            case 'negation_present':       return !!ctx.hasNegation;
            case 'reference_head':         return !!ctx.isReferenceHead;
            case 'theological_noun':       return !!ctx.isTheologicalNoun;
            case 'no_giving_verb':         return !ctx.isGivingVerb;
            case 'ethical_pronoun':        return !!ctx.isEthicalPronoun;
            case 'copula_present':         return !!ctx.hasCopula;
            case 'possessor_pronoun':      return !!ctx.isPossessorPronoun;
            case 'sphere_noun':            return !!ctx.isSphereNoun;
            case 'temporal_lemma':         return !!ctx.isTemporalNoun;
            case 'article_present':        return !!ctx.hasArticle;
            case 'instrumental_noun':      return !!ctx.isInstrumentalNoun;
            case 'passive_verb':           return !!ctx.isPassive;
            case 'substitutable_with_dia': return !!ctx.substituteWithDia;
            case 'manner_noun':            return !!ctx.isMannerNoun;
            case 'adverb_substitutable':   return !!ctx.adverbSubstitutable;
            case 'syn_verb':               return !!ctx.hasSynCompound;
            case 'prep_sun':               return !!ctx.hasSunPreposition;
            case 'perfect_passive':        return !!(ctx.isPassive && ctx.isPerfect);
            case 'personal_target':        return !!ctx.isPersonalNoun;
            case 'measure_lemma':          return !!ctx.isMeasureLemma;
            case 'comparative_present':    return !!ctx.hasComparative;
            case 'valency_dative_verb':    return !!ctx.isValencyDativeVerb;
            case 'action_noun':            return !!ctx.isActionNoun;
            case 'personal_noun_head':     return !!ctx.isPersonalNoun;
            // Genitive signals (P3-I)
            case 'partitive_trigger':      return !!ctx.isPartitiveTrigger;
            case 'plural_genitive':        return !!ctx.isPlural;
            case 'kinship_noun_head':      return !!ctx.isKinshipNoun;
            case 'material_lemma':         return !!ctx.isMaterialLemma;
            case 'has_head':              return true;
            case 'container_head':         return !!ctx.isContainerHead;
            case 'filling_verb':           return !!ctx.isFillingVerb;
            case 'attributed_head':        return !!ctx.isAttributedHead;
            case 'comparative_adjective':  return !!ctx.isComparativeAdj;
            case 'separation_verb':        return !!ctx.isSeparationVerb;
            case 'prep_apo_ek':           return !!ctx.hasApoEkPrep;
            case 'source_prep':            return !!ctx.hasSourcePrep;
            case 'place_lemma':            return !!ctx.isPlaceLemma;
            case 'genitive_participle':    return !!ctx.hasGenitiveParticiple;
            case 'genitive_noun_present':  return !!ctx.hasGenitiveNoun;
            case 'no_genitive_noun':       return !ctx.hasGenitiveNoun;
            case 'passive_main':           return !!ctx.isPassive;
            // DEFER: semantic/discourse analysis required — silent miss
            case 'follows_head_noun': case 'article_agreement': case 'qualitative_noun':
            case 'abstract_genitive': case 'adjectival_equivalent': case 'semitic_context':
            case 'head_is_abstract': case 'namely_substitutable': case 'no_possessive_semantics':
            case 'proper_name_genitive': case 'action_noun_head': case 'agentive_semantics':
            case 'pronoun_genitive': case 'head_is_action_noun': case 'patient_semantics':
            case 'distinct_subject': case 'same_subject_as_main': case 'divine_or_personal_source':
            case 'verbal_adjective_head': case 'abstract_target': case 'no_adnominal_head':
            case 'valency_genitive_verb':
                return false;
            default: return false;
        }
    }

    function classifySignal(signalId) {
        const structural = new Set(['passive_verb', 'perfect_passive', 'copula_present', 'article_present', 'no_preposition', 'after_preposition', 'passive_main', 'plural_genitive', 'genitive_participle', 'genitive_noun_present', 'no_genitive_noun', 'prep_apo_ek', 'source_prep', 'has_head']);
        const context    = new Set(['negation_present', 'syn_verb', 'prep_sun', 'adverb_substitutable', 'comparative_present']);
        if (structural.has(signalId)) return SIGNAL_CLASS.S1;
        if (context.has(signalId))    return SIGNAL_CLASS.S3;
        return SIGNAL_CLASS.S2;
    }

    function describeSignalEvidence(signalId, ctx) {
        switch (signalId) {
            case 'reference_head':        return `${ctx.verbLemma} ∈ reference_head_lemmas`;
            case 'theological_noun':      return `${ctx.headLemma} ∈ theological_noun_lemmas`;
            case 'no_giving_verb':        return `${ctx.verbLemma} ∉ giving_verb_lemmas`;
            case 'benefactive_verb':      return `${ctx.verbLemma} ∈ benefactive_verb_lemmas`;
            case 'no_indirect_obj_verb':  return `${ctx.verbLemma} ∉ giving_verb_lemmas (indirect-obj gate)`;
            case 'no_preposition':        return 'no preposition governs this constituent';
            case 'article_present':       return 'head noun is articular';
            case 'partitive_trigger':     return `${ctx.headLemma} ∈ partitive_trigger_lemmas`;
            case 'plural_genitive':       return `head morph ${ctx.headMorph} → plural`;
            case 'kinship_noun_head':     return `${ctx.headLemma} ∈ kinship_head_lemmas`;
            case 'material_lemma':        return `${ctx.headLemma} ∈ material_noun_lemmas`;
            case 'has_head':             return 'head token identified (Stage 1 passed)';
            case 'container_head':        return `${ctx.headLemma} ∈ container_noun_lemmas`;
            case 'filling_verb':          return `${ctx.verbLemma} ∈ filling_verb_lemmas`;
            case 'attributed_head':       return `${ctx.headLemma} ∈ attributed_head_lemmas`;
            case 'comparative_adjective': return `${ctx.headLemma} ∈ irregular_comparative_lemmas`;
            case 'separation_verb':       return `${ctx.verbLemma} ∈ separation_verb_lemmas`;
            case 'prep_apo_ek':          return 'ἀπό or ἐκ preposition present in clause';
            case 'source_prep':           return 'ἀπό, ἐκ, or παρά preposition present in clause';
            case 'genitive_participle':   return 'genitive participle token found in clause';
            case 'genitive_noun_present': return 'additional genitive noun found in clause';
            case 'no_genitive_noun':      return 'no additional genitive noun in clause';
            case 'passive_main':          return `verb voice = passive (${ctx.verbMorph})`;
            case 'temporal_lemma':        return `${ctx.headLemma} ∈ trigger_lemmas (temporal)`;
            case 'place_lemma':           return `${ctx.headLemma} ∈ place_noun_lemmas`;
            default:                      return `signal '${signalId}' condition met`;
        }
    }

    function toEvidenceStrength(rawScore, exclusionFired) {
        if (exclusionFired || rawScore <= 0) return EVIDENCE_STRENGTH.NONE;
        const clamped    = Math.min(SCORE_CLAMP.max, Math.max(SCORE_CLAMP.min, rawScore));
        const confidence = clamped / 100;
        if (confidence >= CONFIDENCE_THRESHOLDS.strong)   return EVIDENCE_STRENGTH.STRONG;
        if (confidence >= CONFIDENCE_THRESHOLDS.moderate) return EVIDENCE_STRENGTH.MODERATE;
        return EVIDENCE_STRENGTH.WEAK;
    }

    function srAlignment(typeId, srFunction) {
        if (!srFunction) return 'neutral';
        const ADVERBIAL_TYPES  = new Set(['dative.reference', 'dative.sphere', 'dative.means', 'dative.manner', 'dative.time', 'dative.interest_advantage', 'dative.interest_disadvantage', 'dative.measure', 'dative.association']);
        const OBJECT_TYPES     = new Set(['dative.indirect_object', 'dative.direct_object']);
        const POSSESSION_TYPES = new Set(['dative.possession']);
        const MODIFIER_GENITIVES = new Set(['genitive.possessive', 'genitive.descriptive', 'genitive.partitive', 'genitive.relationship', 'genitive.material', 'genitive.content', 'genitive.attributed', 'genitive.subjective', 'genitive.objective', 'genitive.plenary', 'genitive.comparison']);
        if (srFunction === 'ADVERBIAL') {
            if (ADVERBIAL_TYPES.has(typeId))   return 'aligned';
            if (OBJECT_TYPES.has(typeId))      return 'opposed';
            if (POSSESSION_TYPES.has(typeId))  return 'opposed';
        }
        if (srFunction === 'COMPLEMENT') {
            if (typeId === 'nominative.predicate_nominative') return 'aligned';
            if (typeId === 'genitive.predicate')              return 'aligned';
        }
        if (srFunction === 'SUBJECT') {
            if (typeId === 'nominative.subject')              return 'aligned';
        }
        if (srFunction === 'MODIFIER' && MODIFIER_GENITIVES.has(typeId)) return 'aligned';
        return 'neutral';
    }

    function evaluateSignals(typeDef, ctx) {
        const xsc = typeDef.xsc || {};
        let rawScore = xsc.base_weight || 0;
        const signalsFired  = [];
        const signalsMissed = [];

        const exclusions = (typeDef.detection || {}).exclusions || [];
        for (const excl of exclusions) {
            if (evaluateSingleSignal(excl.id, ctx)) {
                return { rawScore: 0, exclusion_fired: true, signalsFired: [], signalsMissed: [] };
            }
        }

        for (const sig of (xsc.signals || [])) {
            const raw = sig.value || 0;
            const capped = raw >= 0 ? Math.min(raw, MAX_SINGLE_SIGNAL_VALUE) : Math.max(raw, -MAX_SINGLE_SIGNAL_VALUE);
            if (evaluateSingleSignal(sig.id, ctx)) {
                rawScore += capped;
                signalsFired.push({ signal_id: sig.id, signal_class: classifySignal(sig.id), value: capped, label_ja: sig.label_ja || null, evidence: describeSignalEvidence(sig.id, ctx), eliminates_or_ranks: 'ranks', provenance: `syntax-registry.json → ${typeDef.id} → xsc.signals` });
            } else {
                signalsMissed.push(sig.id);
            }
        }
        return { rawScore, exclusion_fired: false, signalsFired, signalsMissed };
    }

    function rankCandidate(typeId, typeDef, ctx, srNode) {
        const { rawScore, exclusion_fired, signalsFired, signalsMissed } = evaluateSignals(typeDef, ctx);
        const clamped   = exclusion_fired ? SCORE_CLAMP.min : Math.min(SCORE_CLAMP.max, Math.max(SCORE_CLAMP.min, rawScore));
        const strength  = toEvidenceStrength(rawScore, exclusion_fired);
        const r1        = srAlignment(typeId, (srNode.function || {}).canonical);
        const wallaceRef = typeDef.wallace_ref || null;
        const wallaceCat = typeDef.wallace_category || WALLACE_CATEGORY.C;
        return {
            support_level:       strength,
            r1_sr_alignment:     r1,
            r2_grammar_signals:  signalsFired.filter(s => s.signal_class === SIGNAL_CLASS.S2 || s.signal_class === SIGNAL_CLASS.S1),
            r3_context_signals:  signalsFired.filter(s => s.signal_class === SIGNAL_CLASS.S3),
            r4_genre:            null,
            r5_wallace:          null, // Wallace annotation only — NEVER computational
            _internal: { base_weight: (typeDef.xsc || {}).base_weight || 0, raw_score: rawScore, clamped_score: clamped, confidence_internal: clamped / 100, exclusion_fired },
            signals_matched: signalsFired.map(s => s.signal_id),
            signals_missed:  signalsMissed,
        };
    }

    /* ──────────────────────────────────────────────────────────────────
       §7  Presentation selection (P3-E presenter.cjs)
    ────────────────────────────────────────────────────────────────── */

    function selectPresentation(candidates) {
        const eligible = candidates.filter(c => c.support_level !== EVIDENCE_STRENGTH.NONE);
        const sorted = eligible.slice().sort((a, b) => {
            const ld = EVIDENCE_ORDER[a.support_level] - EVIDENCE_ORDER[b.support_level];
            if (ld !== 0) return ld;
            const sa = a.ranking_trace._internal.clamped_score;
            const sb = b.ranking_trace._internal.clamped_score;
            if (sb !== sa) return sb - sa;
            const ao = { aligned: 0, neutral: 1, opposed: 2 };
            const aa = ao[a.ranking_trace.r1_sr_alignment] ?? 1;
            const ab = ao[b.ranking_trace.r1_sr_alignment] ?? 1;
            if (aa !== ab) return aa - ab;
            return a.candidate_id.localeCompare(b.candidate_id);
        });
        const presentation = sorted.slice(0, MAX_PRESENTATION_CANDIDATES);
        return { presentation, pruned: eligible.length - presentation.length };
    }

    /* ──────────────────────────────────────────────────────────────────
       §8  Context builder (P3-E + P3-I genitive extensions)
    ────────────────────────────────────────────────────────────────── */

    function isFiniteCopulaToken(t) {
        if (!t || !t.morph) return false;
        if (!t.morph.startsWith('V-')) return false;
        const _nl = normGreek(t.lemma || '');
        const isCopulaLemma = (_nl === normGreek('εἰμί') || _nl === normGreek('γίνομαι'));
        const isCopulaText  = (t.text === 'ἐστιν' || t.text === 'ἦν' || t.text === 'ἔστιν' || t.text === 'ἐστί');
        if (!isCopulaLemma && !isCopulaText) return false;
        const rest    = t.morph.slice(2);
        const tvmBlock = rest.split('-')[0];
        if (!tvmBlock || tvmBlock.length === 0) return false;
        const modeChar = tvmBlock[tvmBlock.length - 1];
        return modeChar !== 'N' && modeChar !== 'P';
    }

    function extractConstituentTokens(node) {
        const out = [];
        function walk(n) {
            if (!n) return;
            if (n.type === 'token') {
                out.push({ text: n.text || '', morph: (n.evidence || {}).morph_raw || n.morph || '', lemma: n.lemma || n.text || '', fn: (n.function || {}).canonical || '' });
                return;
            }
            for (const ch of (n.children || [])) walk(ch);
        }
        walk(node);
        return out;
    }

    function buildLemmaLists(allTypeDefs, category) {
        const lemmaLists = {};
        for (const typeDef of allTypeDefs) {
            const detection = typeDef.detection || {};
            for (const [key, val] of Object.entries(detection)) {
                if (!Array.isArray(val) || val.length === 0 || typeof val[0] !== 'string') continue;
                // A-1 fix: in genitive category, rename trigger_lemmas in genitive.partitive
                // to avoid collision with genitive.time.detection.trigger_lemmas
                if (category === 'genitive' && key === 'trigger_lemmas' && typeDef.id === 'genitive.partitive') {
                    lemmaLists['partitive_trigger_lemmas'] = lemmaLists['partitive_trigger_lemmas'] || new Set();
                    for (const lemma of val) lemmaLists['partitive_trigger_lemmas'].add(normGreek(lemma));
                } else {
                    lemmaLists[key] = lemmaLists[key] || new Set();
                    for (const lemma of val) lemmaLists[key].add(normGreek(lemma));
                }
            }
        }
        return lemmaLists;
    }

    function buildContext(headToken, clauseTokens, allTypeDefs, category, constituentTokens, governingClauseTokens) {
        if (!headToken) return null;
        const headLemma = headToken.lemma  || '';
        const headMorph = headToken.morph_raw || headToken.morph || '';
        const verbToken = clauseTokens.find(t => t.fn === 'PREDICATE' && /^V-/.test(t.morph));
        const verbLemma = verbToken ? (verbToken.lemma || '') : '';
        const verbMorph = verbToken ? (verbToken.morph || '') : '';

        function decodeVoice(morph) {
            if (!morph || !morph.startsWith('V-')) return 'unknown';
            const parts = morph.split('-');
            if (parts.length < 2) return 'unknown';
            const stripped = parts[1].replace(/^\d/, '');
            return stripped[1] === 'P' ? 'passive' : 'active';
        }
        const isPassive = decodeVoice(verbMorph) === 'passive';

        const lemmaLists = buildLemmaLists(allTypeDefs, category);

        function inList(listName, lemma) {
            if (!lemma || !listName) return false;
            return lemmaLists[listName] ? lemmaLists[listName].has(normGreek(lemma)) : false;
        }

        const _gcTokens = governingClauseTokens || clauseTokens;
        const hasCopula = _gcTokens.some(isFiniteCopulaToken);
        const hasArticle = clauseTokens.some(t => t.morph && t.morph.startsWith('T-') && Math.abs((t.position || 0) - (headToken.position || 0)) <= 1);
        const _cTokens = constituentTokens || [];
        const hasPreposition = _cTokens.some(t => t.morph && t.morph.startsWith('PREP'));
        const hasSynCompound = verbLemma.startsWith('συν') || verbLemma.startsWith('σύν');
        const hasSunPreposition = clauseTokens.some(t => t.morph === 'PREP' && (t.text === 'σύν' || t.text === 'σὺν'));

        // Genitive extensions
        const _aoEkTexts   = new Set(['ἀπό', "ἀπ᾽", "ἀπ'", 'ἐκ', 'ἐξ']);
        const _sourceTexts = new Set(['ἀπό', "ἀπ᾽", "ἀπ'", 'ἐκ', 'ἐξ', 'παρά', "παρ᾽", "παρ'"]);
        const hasApoEkPrep  = clauseTokens.some(t => t.morph === 'PREP' && _aoEkTexts.has(t.text));
        const hasSourcePrep = clauseTokens.some(t => t.morph === 'PREP' && _sourceTexts.has(t.text));
        const hasGenitiveParticiple = clauseTokens.some(t => {
            if (!t.morph || !t.morph.startsWith('V-')) return false;
            const parts = t.morph.split('-');
            const tvm = (parts[1] || '').replace(/^\d/, '');
            if (tvm.slice(-1) !== 'P') return false;
            return (parts[2] || '').startsWith('G');
        });
        const hasGenitiveNoun = clauseTokens.some(t => {
            if (!t.morph) return false;
            if (t.ref && headToken.ref && t.ref === headToken.ref) return false;
            if (!t.ref && t.text === headToken.text) return false;
            const isNominal = t.morph.startsWith('N-') || t.morph.startsWith('A-') || t.morph.startsWith('R-');
            const parts = t.morph.split('-');
            return isNominal && (parts[1] || '').startsWith('G');
        });
        const isPlural = headMorph.length >= 4 && headMorph[3] === 'P';

        return {
            headLemma, headMorph, verbLemma, verbMorph, isPassive,
            hasCopula, hasArticle, hasPreposition, hasSynCompound, hasSunPreposition,
            hasNegation: clauseTokens.some(t => t.text === 'οὐ' || t.text === 'μή' || t.text === 'οὐκ'),
            hasComparative: false,
            isGivingVerb:         inList('giving_verb_lemmas',        verbLemma),
            isBenefactiveVerb:    inList('benefactive_verb_lemmas',   verbLemma),
            isReferenceHead:      clauseTokens.some(t => inList('reference_head_lemmas', t.lemma || t.text)),
            isAdversativeVerb:    inList('adversative_verb_lemmas',   verbLemma),
            isValencyDativeVerb:  inList('valency_dative_verb_lemmas', verbLemma),
            isTheologicalNoun:    inList('theological_noun_lemmas',   headLemma),
            isSphereNoun:         inList('sphere_noun_lemmas',        headLemma),
            isTemporalNoun:       inList('trigger_lemmas',            headLemma),
            isPersonalNoun:       inList('personal_noun_lemmas',      headLemma),
            isEthicalPronoun:     inList('ethical_pronoun_lemmas',    headLemma),
            isInstrumentalNoun:   inList('instrumental_noun_lemmas',  headLemma),
            isMannerNoun:         inList('manner_noun_lemmas',        headLemma),
            isMeasureLemma:       inList('measure_lemmas',            headLemma),
            isActionNoun:         inList('action_noun_lemmas',        headLemma),
            isPossessorPronoun:   false,
            substituteWithDia:    false,
            adverbSubstitutable:  false,
            isPerfect:            verbMorph.includes('Pf') || verbMorph.includes('RF'),
            // Genitive extensions (P3-I)
            isPartitiveTrigger:   inList('partitive_trigger_lemmas', headLemma),
            isKinshipNoun:        inList('kinship_head_lemmas',      headLemma),
            isMaterialLemma:      inList('material_noun_lemmas',     headLemma),
            isPlaceLemma:         inList('place_noun_lemmas',        headLemma),
            isContainerHead:      inList('container_noun_lemmas',    headLemma),
            isFillingVerb:        inList('filling_verb_lemmas',      verbLemma),
            isAttributedHead:     inList('attributed_head_lemmas',   headLemma),
            isSeparationVerb:     inList('separation_verb_lemmas',   verbLemma),
            isComparativeAdj:     inList('irregular_comparative_lemmas', headLemma),
            isValencyGenitiveVerb: false,
            isPlural, hasApoEkPrep, hasSourcePrep, hasGenitiveParticiple, hasGenitiveNoun,
            _verbToken: verbToken, _headToken: headToken,
        };
    }

    /* ──────────────────────────────────────────────────────────────────
       §9  CandidateSet assembler
    ────────────────────────────────────────────────────────────────── */

    function buildEvidenceRefs(typeDef, rankResult, srNode) {
        const refs = [];
        refs.push({ tier: 'E-1', stage: 1, description: 'morphological case matches category', direction: 'supporting' });
        refs.push({ tier: 'E-2', stage: 2, description: `SR function = ${(srNode.function || {}).canonical} (${rankResult.r1_sr_alignment})`, direction: rankResult.r1_sr_alignment === 'aligned' ? 'supporting' : rankResult.r1_sr_alignment === 'opposed' ? 'opposing' : 'neutral' });
        for (const sig of rankResult.r2_grammar_signals.concat(rankResult.r3_context_signals)) {
            refs.push({ tier: 'E-4', stage: 4, description: `signal '${sig.signal_id}' fired (+${sig.value}): ${sig.evidence}`, direction: 'supporting' });
        }
        return refs;
    }

    function buildCandidateSet(srNode, clauseTokens, grammarCategory, registry, passageRef, governingClauseTokens) {
        const now = new Date().toISOString();

        // Stage 1: Head-Token Identification
        const headResult = identifyHeadToken(srNode);
        if (!headResult.token || headResult.method === 'missing') {
            return deepFreeze({
                schema_version: '0.1', generated_at: now, icl_phase: ICL_VERSION,
                sr_ref: passageRef, sr_node_type: srNode.type, sr_node_id: srNode.id || null,
                sr_function: srNode.function || {}, sr_construction: srNode.construction || null,
                grammar_category: grammarCategory,
                head_token: { method: 'missing', ambiguous: false, error: headResult.error },
                candidates: [], eliminated: [], presentation_candidates: [],
                total_input_types: 0, eliminated_count: 0, surviving_count: 0,
                presentation_count: 0, pruned_count: 0, has_unresolved: false,
                model_conflict: true, head_ambiguous: false, sealed: true,
                _diagnostic: { stage_failed: 'Stage 1', error: headResult.error },
            });
        }

        // headMorph = morph_raw || morph || '' (mandate)
        const rawHeadToken = headResult.token;
        const headToken = {
            ref:       (rawHeadToken.evidence || {}).ref  || rawHeadToken.ref || '',
            text:      rawHeadToken.text || '',
            lemma:     rawHeadToken.lemma || rawHeadToken.text || '',
            morph_raw: (rawHeadToken.evidence || {}).morph_raw || (rawHeadToken.evidence || {}).morph || rawHeadToken.morph || '',
            method:    headResult.method,
            ambiguous: headResult.ambiguous,
            candidates_considered: headResult.candidates_considered,
            excluded:              headResult.excluded,
        };

        // Stage 2: Candidate Generation
        const catDef = (registry.categories || {})[grammarCategory];
        if (!catDef) {
            return deepFreeze({
                schema_version: '0.1', generated_at: now, icl_phase: ICL_VERSION,
                sr_ref: passageRef, sr_node_type: srNode.type, sr_node_id: srNode.id || null,
                sr_function: srNode.function || {}, sr_construction: srNode.construction || null,
                grammar_category: grammarCategory, head_token: headToken,
                candidates: [], eliminated: [], presentation_candidates: [],
                total_input_types: 0, eliminated_count: 0, surviving_count: 0,
                presentation_count: 0, pruned_count: 0, has_unresolved: false,
                model_conflict: true, head_ambiguous: headResult.ambiguous, sealed: true,
                _diagnostic: { stage_failed: 'Stage 2', error: `Unknown grammar category: ${grammarCategory}` },
            });
        }

        const allTypeDefs = [];
        for (const sub of (catDef.subcategories || [])) for (const t of (sub.types || [])) allTypeDefs.push(t);
        for (const t of (catDef.types || [])) allTypeDefs.push(t);

        // Stage 3: Elimination
        const constituentTokens = extractConstituentTokens(srNode);
        const ctx = buildContext(headToken, clauseTokens, allTypeDefs, grammarCategory, constituentTokens, governingClauseTokens);

        const eliminated = [];
        const surviving  = [];
        for (const typeDef of allTypeDefs) {
            const elimResult = applyEliminationRules(typeDef.id, grammarCategory, typeDef, ctx);
            if (elimResult.eliminated) {
                eliminated.push({ candidate_id: typeDef.id, label_en: typeDef.label_en || '', elimination_rule: elimResult.rule, condition: elimResult.condition, evidence: elimResult.evidence, provenance: elimResult.provenance || 'syntax-registry.json', grammatical_status: 'excluded', wallace: applyWallaceBoundary(typeDef) });
            } else {
                surviving.push(typeDef);
            }
        }

        // Stage 4: Ranking
        const candidates = [];
        for (const typeDef of surviving) {
            const rankResult = rankCandidate(typeDef.id, typeDef, ctx, srNode);
            const wallace    = applyWallaceBoundary(typeDef);

            // JHN 1:1c guard (PERMANENT): predicate nominative sub_type is NEVER auto-determined
            let unresolvedReason = null;
            let unresolvedDimensions = [];
            if (typeDef.id === 'nominative.predicate_nominative') {
                unresolvedReason = 'Sub-type (qualitative/definite/indefinite) cannot be determined from structural evidence alone (L-0 boundary)';
                unresolvedDimensions = [{ dimension: 'sub_type', question: 'Is this predicate nominative qualitative, definite, or indefinite?', why_deferred: 'L-0: requires semantic analysis (Colwell/Harner). Automated assertion prohibited.', candidates: ['qualitative', 'definite', 'indefinite'] }];
            } else if (rankResult._internal.exclusion_fired) {
                unresolvedReason = 'No positive evidence; retained for audit completeness only';
            } else if (rankResult.support_level === EVIDENCE_STRENGTH.MODERATE && typeDef.id === 'dative.interest_advantage') {
                unresolvedReason = 'benefactive_verb_lemmas lists this verb but contextual fit requires semantic review';
            }

            const contextualStatus = rankResult.r1_sr_alignment === 'aligned' ? 'supported' : rankResult.r1_sr_alignment === 'opposed' ? 'opposed' : 'neutral';
            candidates.push({
                candidate_id: typeDef.id,
                claim: { type: 'grammatical_function', property: `${grammarCategory}_relationship`, value: typeDef.id.replace(`${grammarCategory}.`, ''), scope: { token_ref: headToken.ref, sr_node_type: srNode.type, sr_function: (srNode.function || {}).canonical || '' } },
                label_en:               typeDef.label_en || '',
                label_ja:               typeDef.label_ja || '',
                wallace_ref:            wallace.wallace_ref,
                hint_ja:                typeDef.hint_ja || null,
                grammatical_status:     'possible',
                contextual_status:      contextualStatus,
                support_level:          rankResult.support_level,
                evidence_refs:          buildEvidenceRefs(typeDef, rankResult, srNode),
                contradicting_evidence: rankResult.r1_sr_alignment === 'opposed' ? [{ tier: 'E-2', description: `SR function ${(srNode.function || {}).canonical} opposes ${typeDef.id}`, direction: 'opposing' }] : [],
                ranking_trace:          rankResult,
                unresolved_reason:      unresolvedReason,
                unresolved_dimensions:  unresolvedDimensions,
                provenance: {
                    token_ref:           headToken.ref,
                    token_text:          headToken.text,
                    token_lemma:         headToken.lemma,
                    token_morph:         headToken.morph_raw,
                    sr_node_type:        srNode.type,
                    sr_function:         (srNode.function || {}).canonical || '',
                    sr_derivedFrom:      (srNode.function || {}).derivedFrom || [],
                    head_identification: headToken.method,
                    head_ambiguous:      headToken.ambiguous,
                    evidence_stages:     [1, 2, 3, 4],
                    signals_matched:     rankResult.signals_matched,
                    signals_missed:      rankResult.signals_missed,
                    icl_version:         ICL_VERSION,
                },
                alternatives: typeDef.alternatives || [],
            });
        }

        // Stage 5: Presentation selection + seal
        const { presentation, pruned } = selectPresentation(candidates);
        const has_unresolved = candidates.some(c => c.unresolved_reason !== null && c.unresolved_reason !== undefined && c.support_level !== EVIDENCE_STRENGTH.NONE);

        return deepFreeze({
            schema_version:          '0.1',
            generated_at:            now,
            icl_phase:               ICL_VERSION,
            sr_ref:                  passageRef,
            sr_node_type:            srNode.type,
            sr_node_id:              srNode.id || null,
            sr_function:             srNode.function || {},
            sr_construction:         srNode.construction || null,
            grammar_category:        grammarCategory,
            head_token:              headToken,
            candidates,
            eliminated,
            presentation_candidates: presentation,
            total_input_types:       allTypeDefs.length,
            eliminated_count:        eliminated.length,
            surviving_count:         candidates.length,
            presentation_count:      presentation.length,
            pruned_count:            pruned,
            has_unresolved,
            model_conflict:          candidates.length === 0,
            head_ambiguous:          headToken.ambiguous,
            sealed:                  true,
        });
    }

    /* ──────────────────────────────────────────────────────────────────
       §10  SR Walker helpers
    ────────────────────────────────────────────────────────────────── */

    // Enrich SR node's direct token children with lemma from tokenMap (non-mutating)
    function enrichNodeWithLemma(srNode, tokenMap) {
        const enrichedChildren = (srNode.children || []).map(ch => {
            if (ch.type === 'token' && ch.id) {
                const bd = tokenMap.get(ch.id);
                if (bd && bd.lemma && !ch.lemma) return Object.assign({}, ch, { lemma: bd.lemma });
            }
            return ch;
        });
        return Object.assign({}, srNode, { children: enrichedChildren });
    }

    // Build clauseTokens from SR clause node, enriching lemma from tokenMap
    function buildClauseTokens(clauseNode, tokenMap) {
        const tokens = [];
        function collect(node) {
            if (!node) return;
            if (node.type === 'token') {
                const bd = (node.id && tokenMap) ? tokenMap.get(node.id) : null;
                tokens.push({
                    text:     node.text || '',
                    morph:    (node.evidence || {}).morph_raw || (node.evidence || {}).morph || node.morph || '',
                    lemma:    (bd && bd.lemma) ? bd.lemma : (node.lemma || node.text || ''),
                    fn:       (node.function || {}).canonical || '',
                    ref:      (node.evidence || {}).ref || node.ref || node.id || '',
                    position: node.surfaceIndex || 0,
                });
                return;
            }
            for (const ch of (node.children || [])) collect(ch);
        }
        collect(clauseNode);
        return tokens;
    }

    /* ──────────────────────────────────────────────────────────────────
       §11  triggerICL — single-node entry point
    ────────────────────────────────────────────────────────────────── */

    function triggerICL(srNode, clauseTokens, opts) {
        const { registry, passageRef, governingClauseTokens } = opts || {};
        try {
            const morphRaw = getNodeMorphRaw(srNode);
            const category = deriveCategory(morphRaw);
            if (!category) return { skipped: true, reason: 'non-nominal' };
            if (!IMPLEMENTED_CATEGORIES.has(category)) return { skipped: true, reason: `category ${category} not implemented` };
            return buildCandidateSet(srNode, clauseTokens || [], category, registry, passageRef || '', governingClauseTokens);
        } catch (err) {
            return { error: true, message: String(err), skipped: true };
        }
    }

    /* ──────────────────────────────────────────────────────────────────
       §12  buildICLIndex — chapter-level SR tree walker
    ────────────────────────────────────────────────────────────────── */

    function buildICLIndex(srTree, tokenMap, registry, passageRef) {
        const index = new Map();
        if (!srTree || !Array.isArray(srTree.sentences)) return index;
        if (!registry) return index;

        function walkNode(node, clauseTokens, govTokens) {
            if (!node) return;
            const ty = node.type || '';

            if (ty === 'clause') {
                const newCT = buildClauseTokens(node, tokenMap);
                for (const ch of (node.children || [])) walkNode(ch, newCT, newCT);
                return;
            }
            if (ty === 'group') {
                for (const ch of (node.children || [])) walkNode(ch, clauseTokens, govTokens);
                return;
            }
            if (ty === 'phrase.np' || ty === 'phrase.pp') {
                if (clauseTokens) {
                    try {
                        const enriched = enrichNodeWithLemma(node, tokenMap);
                        const cs = triggerICL(enriched, clauseTokens, { registry, passageRef, governingClauseTokens: govTokens });
                        if (cs && !cs.skipped && !cs.error && node.id) {
                            index.set(node.id, cs);
                        }
                    } catch (_) { /* skip node on error */ }
                }
                // Recurse into non-token children (nested NPs, relative clauses, etc.)
                for (const ch of (node.children || [])) {
                    if (ch.type !== 'token') walkNode(ch, clauseTokens, govTokens);
                }
                return;
            }
            for (const ch of (node.children || [])) walkNode(ch, clauseTokens, govTokens);
        }

        for (const sentence of srTree.sentences) {
            if (sentence && sentence.root) walkNode(sentence.root, null, null);
        }
        return index;
    }

    /* ──────────────────────────────────────────────────────────────────
       §13  extractPresentationPayload — with production guards
    ────────────────────────────────────────────────────────────────── */

    const L0_PROHIBITED_FIELDS = ['correct', 'incorrect', 'definitive', 'best_interpretation', 'sub_type'];

    function extractPresentationPayload(cs) {
        if (!cs || typeof cs !== 'object') throw new Error('[ICL Guard] cs must be an object');

        // Guard 1: Conservation law — total_input_types === |eliminated| + |candidates|
        const _elimLen = (cs.eliminated || []).length;
        const _survLen = (cs.candidates  || []).length;
        if (cs.total_input_types !== _elimLen + _survLen) {
            throw new Error(
                `[ICL Guard] conservation violation: total_input_types=${cs.total_input_types} !== eliminated(${_elimLen})+candidates(${_survLen})`
            );
        }

        // Guard 2: Presentation ceiling
        const presentable = cs.presentation_candidates || [];
        if (presentable.length > MAX_PRESENTATION_CANDIDATES) throw new Error(`[ICL Guard] presentation over ceiling: ${presentable.length}`);

        // Guard 3: NONE must not appear in presentation
        for (const c of presentable) {
            if (c.support_level === EVIDENCE_STRENGTH.NONE) throw new Error(`[ICL Guard] NONE candidate in presentation: ${c.candidate_id}`);
        }

        // Guard 4: L-0 prohibited fields
        for (const c of presentable) {
            for (const f of L0_PROHIBITED_FIELDS) {
                if (f in c) throw new Error(`[ICL Guard] L-0 field present: ${f} on ${c.candidate_id}`);
            }
        }

        // Guard 5: r5_wallace must be null (Wallace annotation only)
        for (const c of presentable) {
            const rt = c.ranking_trace || {};
            if (rt.r5_wallace !== null && rt.r5_wallace !== undefined) {
                throw new Error(`[ICL Guard] r5_wallace must be null (annotation only): ${c.candidate_id}`);
            }
        }

        // Build payload for _sdIclPanel
        return {
            passage_ref:            cs.sr_ref || '',
            token_text:             (cs.head_token || {}).text || '',
            grammar_category:       cs.grammar_category || '',
            icl_version:            cs.icl_phase || ICL_VERSION,
            presentation_candidates: presentable.map(c => ({
                candidate_id:     c.candidate_id,
                label_ja:         c.label_ja || '',
                label_en:         c.label_en || '',
                support_level:    c.support_level,
                wallace_ref:      c.wallace_ref || null,
                unresolved_reason: c.unresolved_reason || null,
                hint_ja:          c.hint_ja || null,
            })),
            has_unresolved:         cs.has_unresolved || false,
            candidateset_sealed:    cs.sealed || false,
        };
    }

    /* ──────────────────────────────────────────────────────────────────
       §14  Export
    ────────────────────────────────────────────────────────────────── */

    if (typeof window !== 'undefined') {
        window.App = window.App || {};
        window.App.icl = {
            triggerICL,
            buildICLIndex,
            extractPresentationPayload,
        };
        // Feature flag default (can be overridden before this script loads)
        window.App.flags = window.App.flags || {};
        if (window.App.flags.iclEnabled === undefined) {
            window.App.flags.iclEnabled = true;
        }
    }

})();
