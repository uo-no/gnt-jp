# BottomNavigation

App-level destinations only: 聖書 (book/chapter home), 検索 (Concordance / full-text search), ノート (highlights + memos), その他 (history, settings, information). Never Reading, Comparison or Research — Reading is the default activity, Comparison is a Reading State, Research is a Deep Dive layer, none of them are peer "places" (see `02-information-and-navigation-architecture.md` §5).

The current build's third tab, 本文 ("body text"), names the surface the user is already looking at rather than a destination — replace it rather than keep it as a fourth peer. Active item: icon + label in `accent-greek-700`; inactive: `ink-tertiary`. Label always `ui-caption`. Icons here are placeholder squares — see the Iconography note in `README.md` (system root) before shipping real glyphs.

**States.** Pressed is confirmed in the current build (`rgba(0,0,0,0.05)` background, `index.html:6007`) — carry this forward as-is, it doesn't conflict with anything in this system. Selected-as-current-tab (something beyond the Active color rule above), focus-visible, and hover were not found in the current build and are not yet defined here either — see `06-component-architecture.md` Component States for the full breakdown before implementing.
