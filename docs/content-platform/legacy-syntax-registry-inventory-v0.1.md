# 旧統語レジストリ初期棚卸し v0.1

- Date: 2026-10-30
- Source branch: main
- Source file: public/assets/data/syntax-registry.json
- Source blob: c44d13b6d128e3a6a2e302ad1ba0081d4cdadd00
- Method: read-only structural inventory; no grammatical validity judgments were made.
- Related machine-readable ledger: legacy-syntax-registry-inventory-v0.1.csv

## 1. Summary

| Item | Count |
|---|---:|
| Categories | 17 |
| Registered types | 242 |
| Types marked active | 242 |
| Types with wallace_ref | 242 |
| Types with Japanese description | 242 |
| Types with Japanese hint | 242 |
| Types with a detection object | 242 |
| Types with an XSC object | 242 |
| Types with a dictionary object | 28 |
| Types with reading_impact object | 29 |
| Types with alternatives | 238 |
| Types with example verse and Greek text | 238 |

Important: presence of a detection or XSC object does not mean its signals are complete, implemented, reliable, or independently validated. The registry metadata itself says only priority tiers 1–2 have complete detection signals and XSC weights. Some entries contain TODO/dead-signal notes, heuristic conditions, or incomplete fields. These require a separate logic audit.

## 2. Types by category

| Category ID | Types |
|---|---:|
| genitive | 22 |
| dative | 14 |
| participle | 17 |
| article | 11 |
| accusative | 7 |
| infinitive | 11 |
| verb | 48 |
| adjective | 11 |
| pronoun | 12 |
| nominative | 10 |
| vocative | 5 |
| clause | 12 |
| preposition | 7 |
| conjunction | 12 |
| particle | 21 |
| nominal_syntax | 12 |
| discourse | 10 |
| **Total** | **242** |

## 3. Provenance finding

All 242 type records contain a wallace_ref field. The registry metadata also identifies Wallace's Greek Grammar Beyond the Basics as its source and says its classification and analytical method were used as a reference.

This proves an explicit source mapping exists for every current type. It does not, by itself, prove that every grammatical observation is wrong, nor does it establish that every label is protected expression. It does mean the current hierarchy cannot simply be relabeled as an independent taxonomy.

## 4. Data completeness observations

- All 242 records have description_ja, hint_ja, detection, and xsc fields.
- Only 28 have a dictionary object and 29 have reading_impact.
- 238 have alternatives.
- 238 have both example_verse and example_greek.
- A field's existence is not a quality score. Review must inspect its content, source dependency, implementation, and evidential validity.
- Example verses and Greek snippets must be checked against canonical corpus token references before being used in new public articles.

## 5. Required next audit passes

### Pass A — Provenance and taxonomy
For each of the 242 types:
- identify which parts are general grammatical terminology or independently observable facts;
- identify dependence on source-specific category boundaries, subcategory ordering, definitions, and examples;
- determine whether the concept should be retained, redefined, merged, split, replaced, retired, or left unresolved.

### Pass B — Linguistic and corpus evidence
- verify each example against the Greek corpus;
- add multiple contrasting examples where necessary;
- distinguish structural evidence from semantic/contextual interpretation;
- record counterexamples and ambiguous cases.

### Pass C — Detector and ranking logic
- inspect required signals, conditions, exclusions, alternative candidates, and XSC weights;
- identify dead or unimplemented checks, heuristic-only checks, missing necessary conditions, and false exclusions;
- keep candidate generation, exclusion, and qualitative ranking separate;
- test that no score clamp or missing signal turns a no-evidence candidate into WEAK.

### Pass D — Independent knowledge model
Only after the above passes, define the language-neutral concepts and proposition IDs. Preserve a legacy crosswalk for regressions, but do not make the legacy taxonomy the new source of truth.

## 6. Scope limitation

This report is a structural inventory only. It does not certify the correctness of any of the 242 grammatical classifications, and it does not authorize article publication. No application code, runtime behavior, or production data was changed.
