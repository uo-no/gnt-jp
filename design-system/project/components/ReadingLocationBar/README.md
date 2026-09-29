# ReadingLocationBar

The top-of-surface bar that answers "where am I in the Bible" (left, breadcrumb) separately from "how am I reading it" (right, chips). This split is the direct fix for the conflation found in the current 読み方を選ぶ picker (see `06-component-architecture.md`): Translation and View Mode are two different chips, never one flat label.

Left group uses `ui-label` at `ink-secondary`, with the current chapter promoted to `ink-primary` + 600 weight — it is the one piece of state that must never be ambiguous. Right group uses small `surface-sunken` chips; the active chip (the current View Mode, or Translation when relevant) switches to `accent-greek-100` fill with `ink-on-accent-tint` text — the only place on this bar where the Product Accent appears, and only as a tint, never a full fill.

Keep the bar to a single row on desktop; on mobile, collapse the right group into a single "···" affordance that opens the reading-mode sheet rather than wrapping chips onto a second line.
