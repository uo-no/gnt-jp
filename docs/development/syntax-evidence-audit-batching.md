# StudyPanel syntax evidence audit: batch workflow

## Purpose

Avoid auditing one type per pull request. Use the registry inventory to split work into **semantic families**, then submit one focused PR per coherent batch. The inventory is diagnostic only: absence of `required_signals` is a review candidate, not proof of a defect.

## Run the inventory

```sh
node scripts/syntax-audit-inventory.cjs
node scripts/syntax-audit-inventory.cjs --json > /tmp/syntax-audit-inventory.json
```

The report checks all syntax type definitions in `public/assets/data/syntax-registry.json` for:
- unique type IDs;
- `detection.conditions` IDs linked to scored `xsc.signals`;
- `required_signals` linked to scored signals and declared conditions;
- conditions/exclusions with check expressions;
- per-family totals and a review queue of types without a required-signal gate.

These checks establish structural consistency only. They do not establish that a grammatical interpretation is correct, that a signal is semantically sufficient, or that a type must have a gate.

## Batch policy

For each family or coherent group:

1. **Inventory in one pass.** Use the report to find shared failure patterns rather than opening each type independently.
2. **Classify before editing.** Mark each candidate as (a) conjunctive structural pattern, (b) single positive lexical/structural cue, (c) alternative cues, (d) exclusion/negative cue, or (e) context-dependent semantic judgement.
3. **Batch only compatible changes.** One PR may cover multiple types when they share the same evidence principle. Do not batch unrelated meanings merely to increase the count.
4. **Protect representative examples.** Keep at least one positive representative per changed type where a suitable example exists, and add a negative/near-miss test when the change is meant to prevent a known false positive.
5. **Run both required checks.** Do not merge until VR-5 Regression Gate and Path Structure Check pass.
6. **Report three separate totals.** (i) types semantically audited, (ii) types changed and merged, and (iii) types still pending. Never count documentation-only, infrastructure-only, duplicate, or unmerged work as completed semantic audits.

## Baseline observed on 2026-10-24

The current registry contains **242 unique type IDs**. All 242 have at least one detection condition; all condition IDs currently map to a scored signal, and all condition/exclusion entries have a check expression. **27 types have `required_signals`; 215 types are review candidates for gate review**, not automatically 215 bugs. This is the structural starting point, not the denominator for semantic completion.

A historical target denominator of 240 appeared in conversational progress reports, but it is not the registry's type count. Progress should use the actual registry inventory (242) unless a narrower, explicitly enumerated scope is defined.

## Semantic audit ledger

As of this workflow's introduction, the recent evidence-gate series has completed the following unique type-level reviews with merged changes:

- PR #287: `nominative.title_nominative`
- PR #288: `nominative.exclamation`, `nominative.subject_with_infinitive`, `nominative.nominative_absolute`
- PR #289: `nominative.vocative_nominative`
- PR #291: `nominative.subject`, `nominative.predicate_nominative`, `nominative.apposition`
- PR #293: `genitive.direct_object`, `dative.direct_object`
- PR #294: `genitive.predicate`
- PR #295: `dative.possession`
- PR #296: `genitive.relationship`
- PR #297: `genitive.material`
- PR #298: `genitive.content`
- PR #299: `genitive.partitive`
- PR #300: `dative.time`
- PR #301: `dative.agent`
- PR #302: `dative.manner`
- PR #303: `dative.measure`
- PR #304: `dative.association`
- PR #305: `dative.interest_advantage`
- PR #306: `dative.reference`

This is **23 unique type-level reviews with merged changes** in that recent series. PR #290 duplicates the three types subsequently merged through PR #291 and is not counted separately. PRs #262–#268 improved infrastructure, condition/signal links, or scorer behavior; they are not counted as type-level semantic reviews. Earlier audits outside this explicitly listed series are not included in this subtotal.

## Next batching priority

Review the remaining dative candidates as a small family, starting with `dative.interest_disadvantage`, and explicitly separate negative polarity from positive evidence of disadvantage. Then group other no-gate types by shared semantic/structural pattern; do not add a gate solely because the inventory lists a type as ungated.
