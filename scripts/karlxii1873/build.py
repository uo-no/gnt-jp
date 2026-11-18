#!/usr/bin/env python3
"""Assemble a KARLXII1873 alignment file from a drafting spec and validate it.
Usage: build.py BOOK CHAPTER SPEC_MODULE_PATH OUT_PATH REPO_PUBLIC_DIR
Validation mirrors the JA1955 program: segment texts concatenate exactly to
the KARLXII1873 verse text; token indices in range; no token used twice. Coverage is
reported per verse (unaligned Greek tokens listed)."""
import importlib.util, json, sys
from collections import defaultdict

book, ch, spec_path, out_path, pub = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
spec_mod = importlib.util.spec_from_file_location('spec', spec_path)
m = importlib.util.module_from_spec(spec_mod)
spec_mod.loader.exec_module(m)
import os
STATUS = os.environ.get('ALIGN_STATUS', 'validated (機械検証合格 2026-11-18; KARLXII1873 パイロット)')
SPEC = m.SPEC

tokens = json.load(open(f'{pub}/bible_data/nt/{book}/{ch}.json', encoding='utf-8'))
web = json.load(open(f'{pub}/translations/KARLXII1873/{book}/{ch}.json', encoding='utf-8'))
by_verse = defaultdict(list)
for t in tokens:
    by_verse[int(t['verse'])].append(t)
for v in by_verse:
    by_verse[v].sort(key=lambda x: int(x['tokenIndex']))

out = {'translation': 'KARLXII1873', 'book': book, 'chapter': ch,
       'status': STATUS, 'verses': {}}
ok = True
tot_tokens = tot_aligned = 0
for v in sorted(by_verse):
    if str(v) not in web['verses']:
        # [KARLXII1873 適応] 訳文に無い節（版の節区切り差）。全トークン未対応の空セグメントで出す
        print(f'v{v}: NO TRANSLATION VERSE -> empty segment (all {len(by_verse[v])} tokens unaligned)')
        tot_tokens += len(by_verse[v])
        out['verses'][str(v)] = {'segments': [{'t': '', 'tokens': None, 'note': '訳文にこの節なし（版の節区切り差）'}]}
        continue
    words = web['verses'][str(v)].split(' ')
    entries = SPEC.get(v)
    if entries is None:
        print(f'v{v}: NO SPEC')
        ok = False
        continue
    # spec must partition the words exactly
    expect = 1
    segs = []
    for idx, (w0, w1, toks, note) in enumerate(entries):
        if w0 != expect:
            print(f'v{v}: word gap/overlap at {w0}, expected {expect}')
            ok = False
        expect = w1 + 1
        # The renderer concatenates segment texts with '' — so each segment
        # except the last carries its trailing space (JA segments likewise
        # carry their punctuation).
        text = ' '.join(words[w0 - 1:w1]) + (' ' if idx < len(entries) - 1 else '')
        seg = {'t': text, 'tokens': toks}
        if note:
            seg['note'] = note
        segs.append(seg)
    if expect != len(words) + 1:
        print(f'v{v}: spec covers {expect - 1} of {len(words)} words')
        ok = False
    joined = ''.join(s['t'] for s in segs)
    if joined != web['verses'][str(v)]:
        print(f'v{v}: RECONSTRUCTION FAIL\n  joined: {joined!r}\n  source: {web["verses"][str(v)]!r}')
        ok = False
    seen = {}
    for i, s in enumerate(segs):
        for ti in s['tokens'] or []:
            if ti < 1 or ti > len(by_verse[v]):
                print(f'v{v} seg{i}: token {ti} out of range')
                ok = False
            if ti in seen:
                print(f'v{v} seg{i}: token {ti} already used in seg{seen[ti]}')
                ok = False
            seen[ti] = i
    n, a = len(by_verse[v]), len(seen)
    tot_tokens += n
    tot_aligned += a
    unaligned = [t for t in by_verse[v] if int(t['tokenIndex']) not in seen]
    ua = ', '.join(f"{t['tokenIndex']}:{t['text']}" for t in unaligned)
    print(f'v{v}: tokens {a}/{n} aligned; unaligned: {ua or "—"}')
    out['verses'][str(v)] = {'segments': segs}

print(f'\nTOTAL: {tot_aligned}/{tot_tokens} tokens aligned ({tot_aligned / tot_tokens * 100:.1f}%)')
print('ALL CHECKS PASSED' if ok else 'CHECKS FAILED')
if ok:
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print('wrote', out_path)
sys.exit(0 if ok else 1)
