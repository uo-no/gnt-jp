#!/usr/bin/env python3
"""gloss spec 生成補助（ES gloss-conveyor/gen.py の KARLXII1873 版）。
Usage:
  gloss-gen.py list <BOOK> <CH>            … 決定が要る複数トークンのセグメントを Greek つきで一覧
  gloss-gen.py gen  <BOOK> <CH> <dec.py>   … 単独トークンのセグメントは自動、複数トークンは dec.py の PART で specs/GLOSS-<BOOK>-<CH>.py を生成
dec.py: PART = {(verse:int, (tokens...)): {tokenIndex: gloss}}  （キーは list の出力どおり）
"""
import sys, json, os, importlib.util
here = os.path.dirname(os.path.abspath(__file__))
pub = os.path.join(here, '..', '..', 'public')
mode, book, ch = sys.argv[1], sys.argv[2], sys.argv[3]
align = json.load(open(f'{pub}/assets/data/alignment/KARLXII1873/{book}/{ch}.json', encoding='utf-8'))
toks = json.load(open(f'{pub}/bible_data/nt/{book}/{ch}.json', encoding='utf-8'))
gk = {}
for t in toks:
    gk[(int(t['verse']), int(t['tokenIndex']))] = t
if mode == 'list':
    for v, vd in sorted(align['verses'].items(), key=lambda x: int(x[0])):
        for s in vd['segments']:
            if s['tokens'] and len(s['tokens']) > 1:
                g = ' '.join(f"{i}:{gk[(int(v), i)]['text']}({gk[(int(v), i)]['english']})" for i in s['tokens'])
                print(f"({v}, {tuple(s['tokens'])}): 「{s['t'].strip()}」 ← {g}")
    sys.exit(0)
dec_path = sys.argv[4]
spec = importlib.util.spec_from_file_location('dec', dec_path)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
PART = mod.PART
G = {}; missing = []
for v, vd in align['verses'].items():
    for s in vd['segments']:
        if not s['tokens']: continue
        tk = tuple(s['tokens'])
        if len(tk) == 1:
            G[f"{v}!{tk[0]}"] = s['t'].strip()
        else:
            d = PART.get((int(v), tk))
            if d is None: missing.append((v, tk, s['t'].strip()))
            else:
                for t in tk:
                    if t not in d: missing.append((v, tk, f'token {t} missing'))
                    else: G[f"{v}!{t}"] = d[t]
if missing:
    print(f'{len(missing)} MISSING decisions:')
    for m in missing[:40]: print(' ', m)
    sys.exit(1)
L = [f'# {book} {ch} — KARLXII1873 per-token glosses（gloss-gen.py 生成）', 'GLOSSES = {']
cur = None
for k in sorted(G, key=lambda x: (int(x.split('!')[0]), int(x.split('!')[1]))):
    v = k.split('!')[0]
    if v != cur: L.append(f'# verse {v}'); cur = v
    L.append(f'{json.dumps(k)}: {json.dumps(G[k], ensure_ascii=False)},')
L.append('}')
out = f'{here}/specs/GLOSS-{book}-{ch}.py'
open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print(f'wrote {out} ({len(G)} glosses)')
