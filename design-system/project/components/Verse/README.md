# Verse

The atomic reading unit: a verse number paired with reading text, in either `verse-ja` (Japanese translations) or `verse-source` (Greek, and future Hebrew).

Compose it as a flex row: the number in `ui-caption` / `ink-tertiary`, gapped `space-2` from the text, which carries `ink-primary` and the language-appropriate reading style. Stack verses `space-5` apart in Single reading; drop to `space-4` only inside a compact context such as the book/chapter picker preview, and to `verse-ja-comparison` type inside a Comparison pane (see `ComparisonMobileStacked`).

Do not add a border, background, or card around a verse — the reading surface should look like a page, not a list of rows. The number's tap target should extend to cover the full verse (for Research entry), even though only the number is visually distinct.

**Exception — Comparison only:** inside `ComparisonMobileStacked`, the number and the text split their roles instead of sharing one Research tap target — number taps jump to the same verse number in the other translation, text taps stay the Research entry point. See `ComparisonMobileStacked/README.md` and `03-comparison-architecture.md` §5.6.

Never set verse text in `ui-sans` — reading type only, always.
