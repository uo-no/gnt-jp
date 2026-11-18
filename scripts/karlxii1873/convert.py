#!/usr/bin/env python3
"""Karl XII:s bibel (1873) NT -> public/translations/KARLXII1873/<BOOK>/<CH>.json (#116)
入力: scrollmapper/bible_databases sources/sv/SweKarlXII1873/SweKarlXII1873.json（CrossWire SweKarlXII1873 由来、Public Domain）
使い方: convert.py <SweKarlXII1873.json> <repo_root>
検証: 章・節の集合が public/bible_data/nt と一致／マークアップ残渣スキャン0件。"""
import json,os,re,sys
src,root=sys.argv[1],sys.argv[2]
codes="MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split()
d=json.load(open(src,encoding='utf-8'))
nt=d['books'][39:]; assert len(nt)==27
RES=re.compile(r'[<>\\{}\[\]|_*#]|&\w+;|\b(?:strong|osisID|xml)\b|<w|\d')
nch=nv=diff=0
for b,c in zip(nt,codes):
    for ch in b['chapters']:
        n=ch['chapter']
        g=json.load(open(f'{root}/public/bible_data/nt/{c}/{n}.json',encoding='utf-8'))
        # 空節は版の節区切り差（前節に併合）。空文字の節は出力しない
        verses={str(v['verse']):v['text'].strip() for v in ch['verses'] if v['text'].strip()}
        gset=sorted({int(t['verse']) for t in g})  # bible_data はトークン配列
        sset=sorted(int(k) for k in verses)
        if sset!=gset: print('VERSE-SET DIFF',c,n,'sv-only',sorted(set(sset)-set(gset)),'grc-only',sorted(set(gset)-set(sset)));diff+=1
        for k,t in verses.items():
            assert not RES.search(t),(c,n,k,t[:60])
            if not t: print('EMPTY',c,n,k)
        out=f'{root}/public/translations/KARLXII1873/{c}'
        os.makedirs(out,exist_ok=True)
        json.dump({'book':c,'chapter':n,'verses':verses},open(f'{out}/{n}.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
        nch+=1;nv+=len(verses)
print('chapters',nch,'verses',nv,'verse-set diffs',diff)
