# 独自ギリシャ語文法ナレッジベース・多言語SEO基盤仕様 v0.1

- Status: Design draft
- Date: 2026-10-30
- Scope: Bible Green / gnt-jp
- Implementation status: Documentation only. No production code or existing data is changed by this specification.

## 1. Purpose

Build an original Greek-grammar knowledge base and a multilingual educational/SEO content system that helps readers understand New Testament Greek in its textual context.

The system must not depend on quotations, direct translations, close paraphrases, or reproduction of the explanatory prose, examples, taxonomy, or chapter structure of Wallace's Greek Grammar Beyond the Basics. The Greek New Testament text, transparent linguistic observations, independently stated analytical criteria, and independently checked examples form the basis of the content.

This is not a project to translate an existing grammar book. It is an original explanatory resource connected to Bible Green's reading experience.

## 2. Fixed principles

1. Text-first evidence: Start from the Greek text, morphology, syntactic relations, clause structure, and context.
2. Independent analysis: Existing syntax labels and candidate classifications are an inventory to audit, not unquestionable authorities.
3. Proposition-based candidates: A syntax candidate expresses a grammatical proposition about a token or construction. It is not a translation choice or a theological conclusion.
4. Evidence before confidence: Separate observable facts, grammatical possibilities, and contextual interpretation.
5. Retain plausible alternatives: Exclude a candidate only when it conflicts with morphology, structure, a necessary condition, or a verified signal-requirement incompatibility. Do not eliminate merely because another candidate seems more likely.
6. Qualitative confidence: Use STRONG / MODERATE / WEAK with explicit evidence. Do not let a numeric score clamp turn a zero-evidence candidate into an apparently viable WEAK candidate. Record exclusion separately as an explicit boolean and reason.
7. Language-neutral knowledge: Store concepts, evidence, examples, and analysis separately from language-specific prose.
8. Localized, not mechanically translated: Each language version is written for its own readers and search intent while preserving the same underlying claims and evidence.
9. Traceability: Every explanatory claim should be traceable to text examples, analytical criteria, or explicitly identified external scholarship.
10. No production coupling during the design/audit phase: Do not change the live StudyPanel, syntax analyzer, or existing registry until the independent audit and migration plan are approved.

## 3. Current inventory and migration warning

The current working inventory is 242 active syntax types across 17 categories (previously audited count). This is a count of registered types, not the number of occurrences in the New Testament and not the number of SEO articles to publish.

The current public/assets/data/syntax-registry.json must not be adopted unchanged as the new independent knowledge base. Its metadata explicitly identifies Wallace as the source, describes the registry as based on Wallace's classification/analysis, and includes wallace_ref fields. This is a provenance and architecture warning, not a conclusion that every grammatical observation in the file is unusable.

Therefore:
- Preserve the current registry as a legacy/audit input during migration.
- Do not bulk-copy its definitions, descriptions, category hierarchy, or explanatory text into new content.
- Re-evaluate each candidate from the Greek text and independently defined criteria.
- Record a mapping from each legacy type to one of: retain_redefined, merge, split, replace, retire, unresolved.
- Keep a legacy crosswalk for regression and migration; do not expose legacy provenance fields as article content.
- Do not claim that all 242 labels are original merely because their wording is rewritten.

## 4. Three-layer architecture

### Layer A — Language-neutral knowledge

Stores stable identifiers and structured facts:
- grammatical concept and scope;
- observable morphology and syntactic relations;
- candidate propositions;
- inclusion/exclusion criteria;
- evidence signals and their reliability;
- Greek text examples and token/verse references;
- analytical notes and uncertainty;
- links to related concepts.

No user-facing explanatory paragraphs or SEO copy belong here.

### Layer B — Language-specific explanations

Stores localized terminology and explanations:
- display name and short definition;
- accessible explanation;
- technical explanation;
- terminology glossary;
- examples explained in the target language;
- warnings about common misunderstandings.

A language version may reorganize the explanation for its audience, but it must not change the underlying evidence or silently strengthen a grammatical claim.

### Layer C — Search and publication documents

Stores independently optimized pages:
- localized slug and URL;
- search intent and keyword cluster;
- title, description, headings and body;
- internal links and calls to open relevant Bible Green passages;
- canonical and language-alternate relationships;
- editorial status and review metadata.

Search metadata is language-specific. A Japanese keyword should not be mechanically translated into an English keyword.

## 5. Recommended content model

Use stable IDs that do not encode a language or a particular author's taxonomy.

### 5.1 Concept

Example shape:

~~~json
{
  "id": "case.genitive",
  "schema_version": "1.0",
  "kind": "grammatical_concept",
  "scope": "A case form and its syntactic functions in context",
  "status": "draft",
  "related_concepts": ["case.nominative", "case.dative"],
  "evidence_policy": "nt_text_first"
}
~~~

The example is a structural illustration, not a finished grammatical definition.

### 5.2 Candidate proposition

A candidate is a claim that can be tested against a specific token or construction.

~~~json
{
  "id": "case.genitive.possession",
  "concept_id": "case.genitive",
  "claim_type": "syntactic_function",
  "proposition_key": "possessive_relation",
  "required_conditions": [],
  "supporting_signals": [],
  "contradicting_signals": [],
  "exclusion_rules": [],
  "confidence_policy": {
    "allowed": ["STRONG", "MODERATE", "WEAK"],
    "requires_positive_evidence": true
  },
  "status": "draft"
}
~~~

All user-facing wording belongs in the language layer. Candidate identity and logic must not depend on Japanese strings.

### 5.3 Evidence record

~~~json
{
  "id": "ev.jhn.1.1.example01",
  "passage_id": "JHN.1.1",
  "token_refs": ["JHN.1.1!token-id"],
  "observation": {
    "morphology": [],
    "relations": [],
    "clause_context": []
  },
  "supports": ["case.genitive.possession"],
  "limitations": [],
  "review_status": "unreviewed"
}
~~~

Use the repository's canonical book/chapter/verse/token identity. Do not invent or replace token IDs. Example IDs above are placeholders and must be resolved against actual corpus data before use.

### 5.4 Language resource

~~~json
{
  "concept_id": "case.genitive",
  "locale": "ja",
  "term": "属格",
  "short_definition": null,
  "plain_explanation": null,
  "technical_explanation": null,
  "common_misunderstandings": [],
  "review_status": "draft"
}
~~~

The English and Spanish records use the same concept_id but have independently written content.

### 5.5 SEO article

~~~json
{
  "article_id": "grammar.genitive.introduction",
  "locale": "ja",
  "concept_ids": ["case.genitive"],
  "slug": "greek-genitive-case",
  "search_intent": "informational",
  "keyword_cluster": [],
  "title": null,
  "meta_description": null,
  "sections": [],
  "passage_links": [],
  "related_articles": [],
  "canonical_group": "grammar.genitive.introduction",
  "status": "draft",
  "editorial_review": {
    "grammar": "pending",
    "source_independence": "pending",
    "language": "pending",
    "seo": "pending"
  }
}
~~~

canonical_group connects language equivalents; it does not imply that their titles, headings, body text, or slugs must be literal translations.

## 6. Candidate analysis and confidence policy

Keep the following distinctions explicit:

- Observation: What is directly visible in the text (form, agreement, position, dependency, clause relation).
- Grammatical possibility: What function(s) are compatible with the observation.
- Contextual judgment: Which possibility best explains the surrounding discourse and meaning.
- Interpretive consequence: What the analysis may contribute to understanding the passage. This must not be presented as mechanically determined by morphology alone.

Candidate generation, exclusion, and ranking are separate operations.

- Generation proposes all candidates compatible with the broad grammatical domain.
- Exclusion removes only candidates with a demonstrable contradiction or failed necessary condition.
- Ranking communicates relative explanatory strength but does not erase plausible alternatives.
- Exclusion state and its reason are explicit fields; a numeric score must never conceal exclusion.
- STRONG / MODERATE / WEAK must be calibrated against audited examples, not arbitrary score thresholds.
- When evidence is insufficient, return UNRESOLVED rather than manufacturing certainty.
- The UI may show a small number of candidates, but the internal record retains all surviving candidates and their evidence.

This continues the previously approved proposition-based CandidateSet direction: syntax candidates are not translation alternatives or theological positions. Wallace may be retained in an internal bibliography/cross-check record where appropriate, but never as the oracle that determines the candidate or its rank.

## 7. Multilingual content policy

Initial locale plan:
- ja — first editorial language and pilot.
- en — second language; independently researched search intent and terminology.
- es — planned third language; do not create low-quality machine-translated pages merely to increase URL count.

Rules:
1. Shared IDs and evidence are locale-neutral.
2. Terms and prose are locale-specific.
3. Each locale has its own keyword research, title, meta description, headings, examples of explanation, and internal-link strategy.
4. Translation may be used as a drafting aid only if the final version is independently reviewed and adapted; it must not be a sentence-by-sentence mirror.
5. Do not publish an incomplete locale page as if it were a complete equivalent. Use clear publication states.
6. Use locale-specific URLs and correct hreflang/canonical relationships when pages are published.
7. Keep Greek lemmas, morphology codes, verse references, and token identity stable across locales.
8. Maintain a terminology glossary per locale, including approved terms, prohibited ambiguous translations, and explanatory alternatives.

## 8. Article types and editorial template

Start with three article families:

1. Grammar concept pages: explain a grammatical feature and how to recognize it.
2. Passage-based reading pages: demonstrate how a grammatical observation contributes to reading a real passage.
3. Word/construction pages: explain a recurring form or construction using multiple New Testament examples.

Recommended article structure:
- reader's question and concise answer;
- plain-language explanation;
- how to observe the form/structure in Greek;
- multiple New Testament examples;
- comparison with similar constructions;
- limits, ambiguity, and common misreadings;
- what the observation does and does not establish;
- links to the original text in Bible Green;
- related concepts and articles.

Avoid padding pages to a target word count. Publish only when the explanation adds distinct value.

## 9. Source independence and editorial review

Every article must pass four reviews:

### A. Textual and grammatical review
- Greek text and morphology checked against the repository corpus.
- Each example reference verified.
- Claims distinguish observation from inference.
- Alternative analyses and limitations are acknowledged.

### B. Source-independence review
- No quotation, direct translation, close paraphrase, or imitation of Wallace's prose, examples-as-explained, taxonomy structure, or chapter organization.
- The article's outline is derived from the reader's question and independently selected evidence.
- Any external scholarly source is recorded for internal provenance and fact-checking.
- Common grammatical terminology or independently verified grammatical facts are not treated as proprietary wording; nevertheless, source-specific formulations and distinctive structures are not reproduced.
- Do not remove citations to hide dependence. If a claim depends on a source, document that dependence and rewrite/reassess it.

### C. Language review
- Natural for the target language.
- Terms are consistent with that locale's glossary.
- No claim is stronger in translation/localization than in the source analysis.
- Examples and analogies are culturally and linguistically appropriate.

### D. SEO and reader-value review
- Search intent is clear.
- Title and description accurately represent the page.
- Article is not a near-duplicate of another page.
- Internal links lead to relevant concepts and Bible passages.
- The page helps readers understand Scripture rather than merely repeating keywords.

## 10. Initial pilot

Do not write 242 articles. First create a small, representative pilot of 5–10 articles after the inventory audit.

Suggested pilot coverage:
- one foundational case concept;
- one genitive/dative function with multiple live examples;
- one participle concept;
- one infinitive or clause-level construction;
- one conjunction/discourse relationship;
- one passage-based article that links analysis to Bible Green.

Select exact topics only after the 242-type audit and search-intent research. The pilot must test the data model, article workflow, language separation, and source-independence review before scaling.

## 11. Phased execution

### Phase 0 — Read-only audit (next)
- Snapshot current registry and related syntax data.
- Inventory all 242 types and 17 categories.
- Identify fields and files containing source-specific references, page references, labels, descriptions, or borrowed taxonomy.
- Map each legacy type to an independent review status.
- Identify existing canonical passage/token IDs and corpus evidence sources.
- No production edits.

### Phase 1 — Independent concept model
- Define concept IDs and proposition IDs.
- Define observation/evidence schema.
- Define generation, exclusion, and ranking contracts.
- Define qualitative confidence and unresolved states.
- Validate with a small set of contrasting passages, not just one favorable example.

### Phase 2 — Multilingual schema and glossary
- Finalize locale-independent and locale-specific JSON schemas.
- Define ja, en, es terminology workflow.
- Add schema validation and missing-translation checks.
- Keep SEO metadata out of the shared grammatical knowledge records.

### Phase 3 — Pilot content
- Research search intent separately for each language.
- Write 5–10 Japanese pilot articles.
- Independently prepare one English pilot only after the Japanese knowledge claims are stable.
- Review the article against the source-independence checklist.

### Phase 4 — Publication integration
- Design article URLs, canonical groups, hreflang, sitemap, structured data, and passage deep links.
- Implement only after the content model and pilot are approved.
- Keep SEO pages separate from the StudyPanel runtime; connect them through stable concept and passage IDs.

### Phase 5 — Scale and maintain
- Expand by topic clusters, not by raw registry count.
- Review updates when corpus, syntax analysis, or terminology changes.
- Track language-specific search performance and reader engagement.
- Keep a revision history for knowledge claims and localized pages.

## 12. Acceptance criteria

The design is ready for implementation only when:
- every concept and candidate has a stable language-neutral ID;
- article prose is stored separately by locale;
- the legacy 242-type inventory has an explicit disposition or unresolved status;
- no Wallace-derived text or taxonomy is copied into the new public knowledge layer;
- evidence links resolve to actual canonical corpus references;
- observation, grammatical possibility, contextual judgment, and interpretation are distinguishable;
- exclusions and confidence are independently testable;
- locale-specific SEO fields can differ without duplicating the underlying knowledge;
- schema validation and editorial review checks are defined;
- no production behavior has changed as a side effect of the documentation phase.

## 13. Immediate next task

Run Phase 0 as a read-only audit. Do not generate article prose yet. The first deliverable should be a migration ledger for all 242 legacy types with:
- legacy ID and category;
- current detection/evidence dependencies;
- source-specific metadata or references;
- independently verified textual basis;
- proposed disposition (retain_redefined, merge, split, replace, retire, unresolved);
- missing evidence and review status.

Only after that ledger is reviewed should the independent concept registry be populated.
