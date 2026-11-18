#!/usr/bin/env python3
"""KARLXII1873 per-token gloss builder/validator（ES 版 gloss-conveyor/build.py の複製。検証ロジック不変）.
Usage: gloss-build.py <BOOK> <CH> <spec.py> <out.json> <align_dir> <bible_data_dir>
  align_dir = public/assets/data/alignment/KARLXII1873（<BOOK>/<CH>.json を読む）
Spec: GLOSSES = {"<verse>!<tokenIndex>": "<gloss>", ...}
Rules (mirroring the EN gloss-token conveyor, PRs #662-#689):
- gloss keys == exactly the tokens that appear in some alignment segment
- per segment: multiset of words of non-bracket glosses == multiset of segment text words
- wordless tokens get exactly one bracket label from BRACKETS
"""
import sys, json, importlib.util
from collections import Counter

BRACKETS = {"[artikel]","[partikel]","[övergång]","[neg.]","[prep.]","[relativ]","[innehåll]","[villkor]","[absorberad]"}

def main():
    book, ch, spec_path, out_path, align_dir, bd_dir = sys.argv[1:7]
    spec = importlib.util.spec_from_file_location("spec", spec_path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    G = mod.GLOSSES
    align = json.load(open(f"{align_dir}/{book}/{ch}.json", encoding="utf-8"))
    errors = []
    aligned = {}
    for v, vd in align["verses"].items():
        for s in vd["segments"]:
            if s["tokens"]:
                for t in s["tokens"]:
                    aligned[f"{v}!{t}"] = s
    # key set equality
    for k in sorted(set(aligned) - set(G)):
        errors.append(f"missing gloss for aligned token {k}")
    for k in sorted(set(G) - set(aligned)):
        errors.append(f"gloss for unaligned token {k}")
    # per-segment multiset check
    for v, vd in align["verses"].items():
        for s in vd["segments"]:
            if not s["tokens"]:
                continue
            want = Counter(s["t"].split())
            got = Counter()
            for t in s["tokens"]:
                g = G.get(f"{v}!{t}")
                if g is None: continue
                if g in BRACKETS: continue
                if g.startswith("["):
                    errors.append(f"{v}!{t}: unknown bracket label {g!r}")
                    continue
                got.update(g.split())
            if want != got:
                errors.append(f"verse {v} segment {s['t']!r}: words mismatch want={dict(want)} got={dict(got)}")
    if errors:
        print("FAILED")
        for e in errors[:30]: print(" -", e)
        print(f"({len(errors)} errors)")
        sys.exit(1)
    out = {
        "translation": "KARLXII1873",
        "book": book,
        "chapter": int(ch),
        "status": "token-level glosses (per-token partition of KARLXII1873 segment text; verified by exact word-multiset reconstruction)",
        "glosses": {f"{book} {ch}:{k.split('!')[0]}!{k.split('!')[1]}": G[k] for k in
                    sorted(G, key=lambda x: (int(x.split('!')[0]), int(x.split('!')[1])))},
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"ALL CHECKS PASSED  ({len(G)} glosses)")

if __name__ == "__main__":
    main()
