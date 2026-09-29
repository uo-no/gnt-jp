# 聖書［緑版］Design System

For **uo-no/gnt-jp** (聖書アプリ, production: bible-text.pages.dev) — a Greek-Bible reading environment (Septuagint + Greek New Testament), first product in a future family that will add 聖書［赤版］ (Hebrew). Built from the existing product's real navigation, reading-mode picker, comparison setup and Structural Reading panel (inspected directly on the live site), re-expressed as semantic tokens and a stated architecture — not a re-skin. Full architecture, UX and screen-level detail live in the numbered sections indexed below; this file is the day-to-day usage rules.

## The one rule everything else follows

The Bible is the visual foreground. Reading is primary; every tool — Comparison, Research, Structural Reading, Navigation — is subordinate to it. Before adding or styling anything, ask: does this help the user read? If it doesn't, don't add it, and if it competes with `verse-ja` / `verse-source` for attention, mute it.

## Content fundamentals

- Write UI copy in the product's own register: quiet, exact, unadorned. No marketing verbs ("解き明かす", "体験する"), no exclamation points, no emoji. The existing app's own copy ("読み方を選ぶ", "調べるパネルを開閉する", "外部の翻訳で比較") is the tone reference — plain, functional Japanese noun/verb phrases, not slogans.
- Keep **Translation**, **Reading State** and **View / Reading Mode** verbally distinct, always. Never label a translation ("口語訳") and a view mode ("語順で読む") as peers in the same sentence or the same unstyled list — see `03-comparison-architecture.md` and `06-component-architecture.md` for why the current single flat picker list does exactly this and how to separate it.
- Brand copy (ウオノ / Fish Gate / "Beyond Boundaries. Beyond Translation.") belongs on Brand, About and Landing surfaces only. Do not put the tagline, wordmark lockup or marketing language inside the Reading Surface, Comparison Surface or Research panels.
- No logo file was available to copy into this system — the wordmark stays in `ui-title`/`ui-display` type (plain "聖書アプリ" / "Fish Gate", no drawn mark) until real brand assets are supplied. Do not draw or approximate a mark.

## Visual foundations

**Color.** Use `color.tokens` semantically, never as decoration:
- `surface-canvas` / `surface-raised` / `surface-sunken` for the three background layers (page, floating panel, secondary well) in every screen. Never introduce a fourth ad-hoc gray.
- `ink-primary` is reserved for Bible text and anything read continuously. UI chrome (labels, breadcrumb, buttons) uses `ink-secondary`; muted metadata uses `ink-tertiary`.
- `accent-greek-700` is the Product Accent for the current (Greek) product: selected navigation state, the active pill in a segmented control, primary buttons, the active reading-mode icon. Budget it like a highlighter, not a fill — most of a reading screen should show no green at all. Never tint the Bible text itself with the accent.
- `accent-hebrew-*` tokens exist now so a future 聖書［赤版］ can reuse this exact system by swapping the active Product Accent family — do not consume `accent-hebrew-*` anywhere in the current Greek-only build; they render correctly (checked for contrast) but are inventory for the roadmap, not live UI.
- `structural-function-*`, `structural-construction-*`, `structural-morphology-*` are a separate semantic channel from Product Accent. Structural Reading, WORD_ORDER and CLAUSE_ROLE modes use only these three, never `accent-greek-*` — mixing them would make the product accent mean two different things on the same screen.
- Every structural or state distinction also carries a text label or shape difference (see `structural-tag`), never color alone — required for the color-blind reader and for anyone quoting a screenshot in grayscale.
- `focus-ring` is deliberately ink-colored, not a hue, so focus is never mistaken for selection (`surface-selected`) or for a structural layer.

**Typography.** Three reading families, kept visually distinct on purpose: `reading-ja` (Mincho) for Japanese translation text, `reading-source` (Cardo/Gentium) for Greek — and, later, Hebrew — running text, `reading-en` for English scripture quotation. `ui-sans` handles all chrome in every language, including Japanese UI labels, so navigation never competes typographically with the text it navigates. Never set Bible text in `ui-sans`, and never set a button or breadcrumb in a reading family.
- `reading-en` is **reserved, not live** — the read-only audit of the current product confirmed no English body translation exists anywhere in the build today. Its font stack is defined in `tokens.json` so the family name and CSS values are settled in advance (same reasoning as `accent-hebrew-*`, `05`§4), but no `type.groups` style (a `verse-en`-equivalent size/line-height/weight) is defined yet, and none should be invented now. When an English scripture surface becomes real, size it against its own actual reading context (how much text, what screen, alongside which other language) rather than copying `verse-ja`'s or `verse-source`'s numbers — see `05`§3.
- Default to `verse-ja` / `verse-source` at their full line-height in Single reading. Drop to the `-comparison` variants only inside a Comparison pane, where two texts share the viewport — never shrink reading type simply to fit more chrome.
- Mixed-script lines (a Greek lemma inline with a Japanese gloss, a verse reference in English) should switch `font-family` per run via `lang`-scoped spans, not force one family to render all three scripts — Cardo does not carry Japanese, and Yu Mincho does not carry polytonic Greek diacritics reliably.
- `reading-source` was chosen in part because it is one of the few open, well-hinted serifs with credible support for both polytonic Greek and Hebrew — when 聖書［赤版］ ships, Hebrew running text should stay on `reading-source`, RTL-flowed, rather than get a new family.

**Spacing / density.** Spacing tokens are named by their reading role, not by size alone (see `spacing.tokens` usage notes) — `space-5` is "the gap between two verses," not "24px." Keep that mapping when adding new components: pick the token whose *usage* matches the relationship you're spacing, not the one whose pixel value happens to fit.

**Radius / shape.** `radius-sm`/`radius-md` for controls and structural boxes (square-cornered enough to read as diagram elements, not toy blocks); `radius-lg` only for sheets/panels that rise from a screen edge; `radius-pill` only for the Reading State segmented control and translation chips — do not use `radius-pill` decoratively elsewhere, it is reserved for "this is a mode switch."

**Shadow.** Two tokens only, both very soft (`shadow-panel`, `shadow-sheet`). No shadow on inline reading elements, ever — shadow marks something as floating above the reading surface, so use it only for panels and sheets that genuinely do.

## Iconography

No icon set shipped with the source repository at the time of writing. Specify icons as a single 24×24 grid, 1.5px stroke, rounded caps/joins, no fills except for the selected/active state (which fills with `accent-greek-700` at 100% and switches the glyph to `ink-on-accent`) — a restrained line-icon language, consistent with `radius-sm`/`radius-md`, not a two-tone or gradient icon style. Flag any icon added under this system as a placeholder until the product's own icon source is provided.

## Reading this system

Everything above is *how* to build. *What* to build — the architecture that makes these tokens meaningful — is documented in order:

1. `01-product-family-and-reading-architecture.md` — 聖書［緑版］/［赤版］ product family, Bible Location, Reading State, Translation, View Mode, Reading Position.
2. `02-information-and-navigation-architecture.md` — IA, navigation system, Desktop and Mobile spatial architecture, Bottom Navigation.
3. `03-comparison-architecture.md` — Comparison as a Reading State, synchronization model, Comparison UX, and the Mobile Comparison design in full (the brief's priority case).
4. `04-research-and-state-transitions.md` — Research/Deep Dive, Chapter Navigation, Reading Position persistence, State Transition rules.
5. `05-visual-language-and-foundations.md` — the reasoning behind the tokens above, plus motion and accessibility principles not expressible as tokens.
6. `06-component-architecture.md` — the component inventory, including a direct critique of the current 読み方を選ぶ picker.
7. `07-representative-screens.md` — the nine required screens, specified in full.
8. `08-critical-evaluation.md` — self-critical review against the brief's own checklist.
9. `09-implementation-priorities.md` — phased rollout that respects the existing engine, data model and search architecture.
10. `10-motion.md` — every motion value in the system in one place (durations, easing, what triggers them), since `tokens.json` has no motion token family.

Read `tokens.json` for exact values. Read a component's own `README.md` before using it.


---

## Consuming this system (generated — do not edit)

Every path named below is under `project/` in this design system: read `project/api/tokens.md`, not `api/tokens.md`.

If the text above differs on what to load or read, follow this section.

8 components are documented without a runnable `components/bundle.js`: read each card and long README and build to those guidelines. Tokens: read the values from the token cards; a Slides deck or Design canvas also takes `tokens.json` by file path.

**Read, per thing:** a component’s props, parts and examples: `api/components/<Comp>.md`; token values: `api/tokens.md`. After this README, fetch the cards and fonts you need in ONE message as parallel calls — none depends on another.

**Two rules.** Before you use a thing — a component, a token group, an icon, an asset — read its card from the index below; a value you did not read from a card is a guess. `tokens.json`, `manifest.json` and `design-system.json` are sources for tools: hand them over unread. `components/<Comp>/README.md` is the long-form second read a card links to; `SKILL.md` and `artifact-type/` beside them are authoring guidance, not needed to consume the system.

## Index (generated — do not edit)

**Tokens**

- `api/tokens.md` — Every token: surface, text, fill, border, palette, type, spacing, radius, shadow. (12.4k)

**Components** (`api/components/<Comp>.md`, 8)

- **Mobile**: `BottomNavigation` — App-level destinations only: 聖書 (book/chapter home), 検索 (Concordance / full-text search), ノート (highlights + memos), その他 (history, settings, information)
- **Controls**: `Button` — Primary: accent-greek-700 fill, ink-on-accent text, no border — reserve for the single most committing action in a panel (決定 in the reading-mode picker, for in… · `ReadingStateSwitch` — Switches Reading State — Single vs
- **Comparison**: `ComparisonMobileStacked` — Mobile Comparison Surface, designed from the question "what is Comparison Reading on a phone," not from shrinking the desktop two-pane layout
- **Foundations**: `ProductAccent` — Reference component, not a live UI element — shows the semantic structure of Product Accent across the current and future product families (see 01-product-fami…
- **Navigation**: `ReadingLocationBar` — The top-of-surface bar that answers "where am I in the Bible" (left, breadcrumb) separately from "how am I reading it" (right, chips)
- **Structural Reading**: `StructuralNode` — The Reed–Kellogg-style box used by STRUCTURE, CLAUSE_ROLE and RELATION — one shared component, not three
- **Reading**: `Verse` — The atomic reading unit: a verse number paired with reading text, in either verse-ja (Japanese translations) or verse-source (Greek, and future Hebrew)
