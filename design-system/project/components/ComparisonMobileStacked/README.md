# ComparisonMobileStacked

Mobile Comparison Surface, designed from the question "what is Comparison Reading on a phone," not from shrinking the desktop two-pane layout. Full reasoning in `03-comparison-architecture.md` §5; this file covers the four concrete mechanics added to it (§5.3–§5.7).

**One continuous scroll, not two panes.** Translation A's verses, then a `space-7` gap crossed by a single `border-hairline` rule, then Translation B's verses — all in one scroll container, read top to bottom like a single long page. There is no independent scroll region per translation and no continuous scroll-sync between them: there is nothing to keep in sync, because there is only one scroll position (§5.3).

**Independent verse numbering, shared visual weight.** Each block numbers its own verses from 1; numbers are never prefixed or recolored to mark A vs. B (that would be a diff-style decoration). Which translation you're in is read from the sticky label (below), not from the number.

**Sticky Translation Label.** Each block's label (`口語訳（1955）`, `新改訳2017`) is `position: sticky; top: 0` within the scroll container. Scroll through A and its label stays pinned under the header; cross into B and B's label pushes A's off and takes over. Pure CSS, no scroll-position polling — this is the entire answer to "which translation am I reading" while scrolling, and it adds no always-visible chrome (§5.5).

**Tap a verse number to jump — once, not continuously.** Tapping a verse number scrolls to the same verse number in the other block (`scrollIntoView`, ease-out, 200–260ms) and flashes `accent-greek-100` behind the landed verse for 0.6s (same language as the Research-return highlight in `07-representative-screens.md` #9). Tapping verse *text* stays the Research entry point, as in Single reading — this is a deliberate, documented exception to `Verse`'s default tap behavior, scoped to Comparison only (see `Verse/README.md`). No arrows, chevrons or persistent jump icons sit on the page by default — discoverability is a one-time hint on first use, not permanent decoration (§5.6).

**Position is one value, not two.** Because the scroll is single and continuous, "current position" is just `{ side: "A" | "B", verse: n }` — the verse nearest the top. Store this in the Reading Position snapshot (`04-research-and-state-transitions.md`) and restore it after Research, after a Single↔Comparison round trip, and on relaunch. Chapter navigation resets it to verse 1 of both blocks, per `04`§4 — position is not carried across chapters.

## Open questions before implementation (`03-comparison-architecture.md` §5.10)

This component assumes: 1:1 verse-number correspondence between Translation A and B in most cases; that Translation B's text is available as in-app data (not confirmed — the live product currently only leaves the app for a true second translation); that the existing "recently read" history can store `{side, verse}`-level granularity; and that a verse-number tap gesture doesn't collide with existing highlight/word-tap handling. None of these were verified against the live implementation — confirm before building.
