# StructuralNode

The Reed–Kellogg-style box used by STRUCTURE, CLAUSE_ROLE and RELATION — one shared component, not three. Reading axis runs left to right within a node's own words; the structural axis (hierarchy) runs top to bottom via `.children`, indented `space-5` per level with a `structural-connector` rule marking descent.

Three layers, three token families, never mixed: FUNCTION (`structural-function-*`, outer/primary nodes — subject, verb, object), CONSTRUCTION (`structural-construction-*`, a left-accent rather than a full border, for apposition and clause relationships), MORPHOLOGY (`structural-morphology-*`, small chips for case/tense/mood, deepest level). Every node's role is stated in a `structural-tag` label, not by color alone — required even though the color choices already differ in lightness, not just hue, for readers who quote a single node out of context.

Default to showing only the FUNCTION layer expanded (`06` Progressive Disclosure); CONSTRUCTION and MORPHOLOGY reveal on tap. Do not attempt pixel-perfect diagram lines connecting to a fixed grid — nesting and indentation alone should carry the hierarchy; this keeps the component usable at any text length, including a Comparison pane's narrower column.

**States.** The current build already has a confirmed focus-visible ring on sub-clauses (`.hdg-clause--sub`, `outline: 2px solid var(--color-domain, #7a7aaa)`, `index.html:4926-4929`) and a confirmed Collapsed state (`.hdg-collapsed`). The existing focus ring is colored per node type, not ink-colored — that's a real conflict with this system's `focus-ring` token (`05`§7), and it isn't resolved automatically in this system's favor. See `06-component-architecture.md` Component States before implementing.
