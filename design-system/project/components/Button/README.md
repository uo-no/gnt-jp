# Button

Primary: `accent-greek-700` fill, `ink-on-accent` text, no border — reserve for the single most committing action in a panel (決定 in the reading-mode picker, for instance). Secondary: outlined in `border-strong`, `ink-primary` text. Ghost: no fill or border, `ink-secondary` text, for low-emphasis actions like Research entry points (さらに調べる).

Keep Primary Button usage rare inside the Reading Surface itself — most Reading-surface actions (changing verse, opening Research) should be Ghost or plain tap targets, not buttons. Frequent Primary buttons on a reading screen read as SaaS chrome, which this product avoids (`05-visual-language-and-foundations.md` §1).

**States.** Hover is confirmed in the current build (`.app-btn`, `components.css:146-149`); Pressed, Disabled and focus-visible were not found there and are not yet defined here — see `06-component-architecture.md` Component States before implementing.
