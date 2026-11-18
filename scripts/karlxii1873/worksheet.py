#!/usr/bin/env python3
"""spec 作成用ワークシート。Usage: worksheet.py BOOK CH REPO_PUBLIC_DIR
節ごとに、訳文の語番号（単一スペース区切り・1始まり）と Greek トークン（tokenIndex:text(english)）を出す。"""
import json, sys
from collections import defaultdict
book, ch, pub = sys.argv[1], int(sys.argv[2]), sys.argv[3]
t = json.load(open(f'{pub}/bible_data/nt/{book}/{ch}.json', encoding='utf-8'))
s = json.load(open(f'{pub}/translations/KARLXII1873/{book}/{ch}.json', encoding='utf-8'))['verses']
bv = defaultdict(list)
for x in t: bv[int(x['verse'])].append(x)
for v in sorted(bv):
    bv[v].sort(key=lambda x: int(x['tokenIndex']))
    txt = s.get(str(v))
    print(f"\n## {v}: " + (' '.join(f"{i}:{w}" for i, w in enumerate(txt.split(' '), 1)) if txt else '（訳文にこの節なし）'))
    print('   ' + ' '.join(f"{x['tokenIndex']}:{x['text']}({x['english']})" for x in bv[v]))
sv_only = sorted(int(k) for k in s if int(k) not in bv)
if sv_only: print('\n※Karl XII のみの節（対象外）:', sv_only)
