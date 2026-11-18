#!/usr/bin/env python3
"""Emit a pilot review sheet + display-surface samples for one chapter.
Usage: review.py BOOK CHAPTER ALIGNMENT_JSON REPO_PUBLIC_DIR"""
import json, sys
from collections import defaultdict
book, ch, al_path, pub = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
al = json.load(open(al_path, encoding='utf-8'))
tokens = json.load(open(f'{pub}/bible_data/nt/{book}/{ch}.json', encoding='utf-8'))
by_verse = defaultdict(list)
for t in tokens: by_verse[int(t['verse'])].append(t)
for v in by_verse: by_verse[v].sort(key=lambda x: int(x['tokenIndex']))
def gtext(v, tis):
    m = {int(t['tokenIndex']): t['text'] for t in by_verse[v]}
    return ' '.join(m[i] for i in tis)
print(f'# {book}{ch} RVR1909 対応表パイロット — レビュー用\n')
for v in sorted(by_verse, key=int):
    print(f'## {ch}:{v}')
    for s in al['verses'][str(v)]['segments']:
        g = gtext(v, s['tokens']) if s['tokens'] else '（対応なし）'
        note = f" ※{s['note']}" if 'note' in s else ''
        print(f"- {s['t'].strip()} → {g}{note}")
    print()
