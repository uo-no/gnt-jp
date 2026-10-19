# Design System ↔ Runtime Token Mapping

監査日: 2026-10-19

この文書は、Design Systemの `tokens.json` / 生成CSS `tokens.css` と、実際のアプリが参照する `public/css/tokens.css` の間の対応表。これは値を自動的に統一する指示ではない。差がある場合は用途を確認してから移行する。

## 正本の関係

- `design-system/project/tokens.json`: 設計トークンのソースデータ。
- `design-system/project/tokens.css`: 冒頭コメントに「generated from tokens.json」とある生成CSS。手編集しない。
- `public/css/tokens.css`: 現行アプリのruntime CSSが参照する共通トークン。上の生成CSSとは別名・別体系で運用されている。
- `public/search-tool.html`: `--s-*` の検索画面専用体系を持つ。アクセントの一部はruntime共通トークンを参照する。

## Color roles

| Design System token | DS value / intent | Runtime token / current value | Status |
|---|---|---|---|
| `surface-canvas` | `#fbfaf7`, warm reading canvas | `--bg: #fff` | Different; reading canvas warmth is not represented in runtime root |
| `surface-raised` | `#fff`, raised surfaces | `--bg: #fff` | Value aligned, role name differs |
| `surface-sunken` | `#f3f1ec` | `--bg-panel: #f3f1ec` | Value aligned |
| `ink-primary` | `#211f1a` | `--text: #211f1a` | Value aligned |
| `ink-secondary` | `#57534a` | `--text-sub: #57534a` | Value aligned |
| `ink-tertiary` | `#8a8577` | `--text-hint: #8a8577` | Value aligned |
| `border-hairline` | `#e6e2d7` | `--border: #e6e2d7` | Value aligned |
| `border-strong` | `#cdc7b6` | `--border-strong: #cdc7b6` | Value aligned |
| `accent-greek-700` | `#2c4f34`, green product accent | `--accent: #2c4f34` | Value aligned |
| `accent-greek-100` | `#e4ecdf`, selected tint | `--accent-light: rgba(44,79,52,.10)` | Different tint; compare in context before mapping |
| `accent-greek-600` | `#3c6b45`, hover/pressed | No exact runtime token | Missing runtime role token |
| `accent-greek-050` | `#f5f8f3`, faint hover wash | No exact runtime token | Missing runtime role token |
| `structural-function-fill/ink` | `#e3eddf / #375e2c` | `--structural-function-fill/ink` | Values aligned |
| `structural-construction-fill/ink` | `#cce6db / #2e5945` | `--structural-construction-fill/ink` | Values aligned; this is blue-green/teal, not purple |
| `structural-morphology-fill/ink` | `#e6f0ea / #316148` | `--structural-morphology-fill/ink` | Values aligned |
| `focus-ring` | `{ink-primary}` | `--focus-ring: var(--text)` | Value/role aligned; key active focus rules now reference it |
| `signal-attention-fill/ink` | `#faf0da / #8a5a14` | `--color-caution: #a09050` | Different semantic pairing; do not substitute without review |

## Typography roles

Design System has role-based type definitions; runtime has family and size tokens but does not have an equivalent role set for line-height and weight.

| Design System role | Size / line-height / weight | Runtime evidence | Status |
|---|---|---|---|
| `ui-caption` | 12 / 16px / 500 | `--text-caption: .75rem` (normally 12px); weight and line-height are local | Partial |
| `ui-label` | 13 / 18px / 500 | `--text-label: 13px`; line-height/weight local | Partial |
| `ui-body` | 15 / 22px / 400 | `--text-reading: 15px`, `--text-body: .9rem` (14.4px) | Similar but not exact |
| `ui-title` | 17 / 24px / 600 | No exact named runtime token | Missing mapping |
| `ui-display` | 22 / 28px / 600 | `--text-display: 2rem` (32px) | Different scale/role |
| `verse-ja` | 17 / 34px / 400 | Main app has local selectors using `--text-body-lg` (16px) and `line-height: 2.1` | Mismatch requires screen-by-screen review |
| `verse-ja-comparison` | 16 / 30px / 400 | Runtime value not yet mapped comprehensively | Audit needed |
| `verse-ja-compact` | 14 / 24px / 400 | Runtime value not yet mapped comprehensively | Audit needed |
| `verse-source` | 18 / 34px / 400 | `--font-greek` family exists; size/line-height are locally specified in multiple views | Partial |
| `word-source-inline` | 16 / 26px / 400 | Runtime size/line-height vary by context | Audit needed |
| `gloss-source` | 12 / 16px / 400 | Runtime size/line-height vary by context | Audit needed |

Runtime families: `--font-ui`, `--font-prose`, `--font-greek`. Design System families use different font stacks (`ui-sans`, `reading-ja`, `reading-source`, `reading-en`). Font-family choices need visual and glyph-coverage review; do not replace them solely because the role names appear equivalent.

## Spacing, shape, border, shadow

| Role | Design System | Runtime | Status |
|---|---|---|---|
| spacing | 4, 8, 12, 16, 24, 32, 48, 64px as role-based `space-1…8` | 4, 8, 16, 24, 32px as `--space-xs…xl`; direct 12/40/48/etc. remain | Partial mapping |
| radius | 4, 8, 16, 999px | 4, 8, 16, 999px via `--radius-*`; search uses 4/6/8/10px | Common values aligned, search has local roles |
| border width | 1 / 1.5 / 2px (hairline/strong/focus) | Mostly local border widths; no full common width scale | Missing role tokens |
| shadow | `shadow-panel`, `shadow-sheet` | `--shadow-card`; search has `--s-shadow-modal` | Partial; roles differ |
| opacity | Not represented as a full scale in DS tokens | `--opacity-primary/secondary/tertiary/disabled` | Runtime-only scale |
| motion | Separate `10-motion.md`; no motion family in JSON | `--duration-fast/base/slow` and `--ease-out`; search `--s-dur-*` | Parallel systems |

## Confirmed cleanup from this audit

- `public/index.html`: removed all five purple `#7a7aaa` fallback literals from `--color-domain` usages; runtime fallback now follows `--accent`.
- `public/index.html`: major focus-visible outlines use `--focus-ring`.
- `public/search-tool.html`: layer row and discovery verse focus-visible outlines use `--focus-ring`.
- User-selected highlight colors (yellow / blue / green / pink) are intentionally separate from Product Accent and must not be flattened to green.
- `public/css/components.css` contains legacy `.app-badge--blue/green/amber` definitions not referenced in the in-scope active pages. They are not changed until repository-wide dynamic usage is ruled out.

## Next sequence

1. Use this map to build a screen-specific matrix for Reading, StudyPanel, Search, Highlights, and History.
2. Confirm actual font-size / line-height / spacing values from active selectors for each screen.
3. Decide which runtime tokens should map to Design System roles and which are intentional app-specific roles.
4. Only then migrate selected CSS to shared tokens and run visual regression checks.
