# ProductAccent

Reference component, not a live UI element — shows the semantic structure of Product Accent across the current and future product families (see `01-product-family-and-reading-architecture.md` §2). `accent-greek-*` is the only family consumed by today's UI; `accent-hebrew-*` exists so a future 聖書［赤版］ can reuse every other token and component in this system unchanged, by swapping which family is "the" Product Accent.

Do not use `accent-hebrew-*` in any current-build screen. If a future Hebrew build needs a third color relationship (e.g. both products shown together in a cross-corpus surface), design that as its own decision when it becomes real — this component only documents the parallel structure, it does not prescribe a multi-accent UI.
