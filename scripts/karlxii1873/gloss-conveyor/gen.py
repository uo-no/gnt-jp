#!/usr/bin/env python3
"""Generate specs/<BOOK>-<CH>.py from singleton auto-fill + PART decisions.
Usage: gen.py <BOOK> <CH> <decisions.py>
decisions.py defines PART = {(verse:int, tokens:tuple): {tokenIndex: gloss}}
"""
import sys, json, importlib.util
book, ch, dec_path = sys.argv[1], sys.argv[2], sys.argv[3]
AL = '/home/hatch/workspace/bible-app/2026-11-07-spanish-rvr1909/conveyor/out'
align = json.load(open(f'{AL}/{book}-{ch}.json'))
spec = importlib.util.spec_from_file_location('dec', dec_path)
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
PART = mod.PART
G = {}
missing = []
for v, vd in align['verses'].items():
    for s in vd['segments']:
        if not s['tokens']:
            continue
        toks = tuple(s['tokens'])
        if len(toks) == 1:
            G[f"{v}!{toks[0]}"] = s['t'].strip()
        else:
            d = PART.get((int(v), toks))
            if d is None:
                missing.append((v, toks, s['t'].strip()))
            else:
                for t in toks:
                    if t not in d:
                        missing.append((v, toks, f"token {t} missing in PART"))
                    else:
                        G[f"{v}!{t}"] = d[t]
if missing:
    print(f"{len(missing)} MISSING decisions:")
    for m in missing[:40]: print(' ', m)
    sys.exit(1)
lines = [f"# {book} {ch} — ES (RVR1909) per-token glosses.",
         "# Keys: \"<verse>!<tokenIndex>\". Words are taken verbatim from the Phase 1",
         "# alignment segment texts; wordless tokens get exactly one bracket label.",
         "GLOSSES = {"]
cur = None
for k in sorted(G, key=lambda x: (int(x.split('!')[0]), int(x.split('!')[1]))):
    v = k.split('!')[0]
    if v != cur:
        lines.append(f"# verse {v}")
        cur = v
    g = G[k].replace('\\', '\\\\').replace('"', '\\"')
    lines.append(f'"{k}": "{g}",')
lines.append("}")
open(f'specs/{book}-{ch}.py', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
print(f"wrote specs/{book}-{ch}.py ({len(G)} glosses)")
