# ReadingStateSwitch

Switches Reading State — Single vs. Comparison — never Translation and never View Mode. This is the only control in the system that uses `radius-pill`; that shape is reserved for "this changes what state you are reading in," so do not reuse `radius-pill` for Translation pickers, View Mode pickers, or any other control.

Active thumb: `accent-greek-700` fill, `ink-on-accent` text. Inactive thumb: transparent, `ink-secondary` text. Track: `surface-sunken` with a `border-hairline` edge.

Place this at the top of the reading-mode panel (desktop) or as the first screen of the mobile reading-mode flow (`03-comparison-architecture.md` §5.6), above — never beside — the Translation and View Mode choices it gates.

**States.** Active/Inactive above is confirmed (`.bp-seg-btn`). Pressed and focus-visible were not found in the current build; apply `focus-ring` (`05`§7) when implementing, since this control must be keyboard-operable end to end — see `06-component-architecture.md` Component States.
