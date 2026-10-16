# Search index prebuild migration

## Goal

Move the expensive work currently performed by `public/search-tool.html` on every page load into a reproducible data-generation step. The static site can continue to serve the result; no search API or server runtime is required.

## Findings from the current implementation

- `_buildFullIndex(['NT'])` fetches each NT chapter, parses JSON, maps every word to a normalized token object, and builds postings in the browser.
- Once NT is ready, LXX is fetched and indexed in the background.
- `_indexChapter` assigns `globalIdx = ALL_TOKENS.length`; phrase, proximity, result rendering, and token lookups depend on contiguous global indices.
- The current order is `books.json` order (NT followed by OT/LXX), chapter ascending, then source token order.
- Japanese substring candidates are separately built by `_buildL3Background` with `_addJpPartial`; this can consume substantial memory and is deliberately not included in schema v2 until size/latency is measured.

## Local fixture test

Run the isolated synthetic-data test (it does not require the full Bible corpus):

```sh
node tests/search/build-search-index.test.cjs
```

It checks NT/LXX separation, contiguous `globalIdx`, Greek normalization, Strong/morphology postings, and failure on a missing declared chapter. This fixture test is not a substitute for running the generator on the complete production data or comparing real search results.

## Schema v2 generator

Run:

```sh
node scripts/build-search-index.js
```

The generator reads the existing `books.json` and chapter JSON files without editing them, validates that every declared chapter exists and parses as an array, and writes:

- `public/search-index/nt/<BOOK>.json` (one shard per NT book)
- `public/search-index/lxx/<BOOK>.json` (one shard per LXX book)
- `public/search-index/meta.json` (ordered shard manifest, token ranges, raw/gzip sizes)

Each book shard contains normalized token records and inverted postings for lemma, surface text, Strong number, morphology, and the text-to-first-Japanese-gloss lookup. `globalIdx` remains global across the complete NT-then-LXX sequence. The manifest records shard order and global ranges; a content-derived source version lets the client reject stale assets. Sharding avoids a single 39 MiB NT file and a single 127 MiB LXX file, which may exceed per-asset deployment limits.

## Cloudflare Pages build integration

The runtime loader probes `/search-index/meta.json`, fetches the NT book shards concurrently, and merges them in manifest order before enabling search. It then fetches the LXX book shards in the background. Each individual shard stays small enough to assess against static-host asset limits. If generated files are missing or inconsistent, the legacy browser builder remains active.

To produce the assets during a Cloudflare Pages deployment, configure the Pages project build settings as follows (after the generation run and asset-size check pass):

- Build command: `node scripts/build-search-index.js`
- Build output directory: `public`
- Root directory: repository root

This is a dashboard-level setting, not something this repository can verify or apply automatically. Until the Pages build command is configured, production will use the legacy fallback unless generated files are otherwise present in `public/search-index/`.

## Migration gates

1. Generate the files in the repository's real build environment and record raw/gzipped sizes, token counts, and generation time.
2. The browser loader probes the manifest, loads NT book shards first, then LXX book shards in the background, and hydrates token/posting maps. Missing or inconsistent assets fall back to the legacy browser builder.
3. Run the generator against the complete repository data, record raw/gzipped sizes, and confirm Cloudflare Pages can build and serve the generated assets within its limits.
4. Compare result IDs for representative lemma, surface-form, Strong, morphology, Greek phrase, proximity, and Japanese phrase queries against the legacy builder before enabling generated assets in production.
5. Benchmark the Japanese partial index independently. Do not silently remove substring semantics; consider a compact representation only after parity tests exist.
6. Confirm the actual Cloudflare Pages build/deploy configuration and verify the deployed `/search-index/meta.json` before claiming the speedup is live.

## Important constraints

- Do not renumber or sort tokens independently of the source sequence; adjacency-based phrase search depends on contiguous `globalIdx`.
- Do not treat `ref` as a runtime identity key; it is display/debug data.
- Do not commit generated data until its size and deployment implications are measured.
- If source data is incomplete, generation must fail rather than silently emit a partial index.
