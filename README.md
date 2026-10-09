# Morphology & Syntax Search — Detached Source Bundle

Snapshot from `uo-no/gnt-jp` main at commit `3c119c494faa27aa96d4440ff7dd9cb06f741c89`.

This curated bundle preserves the two standalone search pages and their runtime dependencies/data for local inspection and future browser-extension development. It is not a finished extension.

## Included
- Morphology and syntax search pages
- Shared CSS/JavaScript modules and book master
- Syntax analyzer and syntax registry
- Complete morphology index and NT/LXX Greek chapter data
- Japanese 1955 translation chapter data
- Lexicon data and existing index-generation scripts
- Selected design/implementation notes

## Local inspection
The original pages expect the `public/` folder to be the web server's document root. Start a local HTTP server from inside `public/` (for example, `python3 -m http.server 8000`) and open `/morph-search.html` or `/syntax-search.html`. Do not open them via `file://`; they use fetch().

## Important
The HTML pages still assume the original app's URL and navigation environment. This package does not contain a browser-extension manifest or adapters for third-party Bible websites. The main app's `main` branch is not changed by this package branch.
