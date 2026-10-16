# Search index prebuild migration

## Goal

Move the expensive work currently performed by `public/search-tool.html` on every page load into a reproducible data-generation step. The static site can continue to serve the result; no search API or server runtime is required.

## Findings from the current implementation

- `_buildFullIndex(['NT'])` fetches each NT chapter, parses JSON, maps every word to a normalized token object, and builds postings in the browser.
- Once NT is ready, LXX is fetched and indexed in the background.
- `_indexChapter` assigns `globalIdx = ALL_TOKENS.length`; phrase, proximity, result rendering, and token lookups depend on contiguous global indices.
- The current order is `books.json` order (NT followed by OT/LXX), chapter ascending, then source token order.
- Japanese substring candidates are separately built by `_buildL3Background` with `_addJpPartial`; this can consume substantial memory and is deliberately not included in schema v1 until size/latency is measured.

## Schema v1 generator

Run:

```sh
node scripts/build-search-index.js
```

The generator reads the existing `books.json` and chapter JSON files without editing them, validates that every declared chapter exists and parses as an array, and writes:

- `public/search-index/nt.json`
- `public/search-index/lxx.json`
- `public/search-index/meta.json`

The corpus files contain normalized token records and inverted postings for lemma, surface text, Strong number, morphology, and the text-to-first-Japanese-gloss lookup. `globalIdx` is kept global across both files, not reset per corpus. A content-derived source version allows the client to reject stale assets.

## Migration gates

1. Generate the files in the repository's real build environment and record raw/gzipped sizes, token counts, and generation time.
2. Wire the browser to fetch the prebuilt corpus file(s) and populate `ALL_TOKENS`, `SEARCH_INDEX`, `TEXT_TO_JP`, `lemmaIndex`, and `morphIndex` from them.
3. Keep the current browser builder as a fallback if a generated asset is missing, stale, or invalid.
4. Compare result IDs for representative lemma, surface-form, Strong, morphology, Greek phrase, proximity, and Japanese phrase queries against the legacy builder before enabling prebuilt assets by default.
5. Benchmark the Japanese partial index independently. Do not silently remove substring semantics; consider a compact representation only after parity tests exist.
6. Confirm Cloudflare Pages build/deploy behavior before claiming the generated files are live.

## Important constraints

- Do not renumber or sort tokens independently of the source sequence; adjacency-based phrase search depends on contiguous `globalIdx`.
- Do not treat `ref` as a runtime identity key; it is display/debug data.
- Do not commit generated data until its size and deployment implications are measured.
- If source data is incomplete, generation must fail rather than silently emit a partial index.
