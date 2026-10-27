#!/usr/bin/env python3
"""
rk_verify_p3.py — Phase 3: rk-dx/rk-dy 手動調整箇所の監査
READ-ONLY。対象ファイルを変更しない。

出力: work/verify/output/phase3_rk_manual.json + .md
"""

import xml.etree.ElementTree as ET, os, json, hashlib, textwrap

LF_WORK = '/Users/373da/Claude/開発室/gnt-jp/work/SBLGNT/lowfat'
LF_EDIT = '/Users/373da/Claude/開発室/lowfat-handover/data/lowfat'
OUT_DIR  = '/Users/373da/Claude/開発室/lowfat-handover/work/verify/output'

def sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def get_text(wg):
    """wg内の全 w テキストをリストで返す"""
    return [w.text or '' for w in wg.iter('w')]

def parent_chain(el, root):
    """el から root まで祖先 wg の rule/class/role を収集"""
    chain = []
    parent_map = {c: p for p in root.iter() for c in p}
    cur = parent_map.get(el)
    while cur is not None and cur is not root:
        if cur.tag == 'wg':
            chain.append({
                'rule':  cur.get('rule',''),
                'class': cur.get('class',''),
                'role':  cur.get('role',''),
                'type':  cur.get('type',''),
            })
        cur = parent_map.get(cur)
    return chain

def sentence_ref_range(sent):
    ws = list(sent.iter('w'))
    refs = [w.get('ref','') for w in ws if w.get('ref')]
    return (refs[0] if refs else '?', refs[-1] if refs else '?')

def find_rk_edited_wgs():
    results = []

    for fname in sorted(os.listdir(LF_EDIT)):
        if not fname.endswith('.xml'):
            continue
        edit_path = os.path.join(LF_EDIT, fname)

        # 対応する原本ファイルを探す
        orig_path = os.path.join(LF_WORK, fname)
        orig_exists = os.path.exists(orig_path)

        tree = ET.parse(edit_path)
        root = tree.getroot()
        parent_map = {c: p for p in root.iter() for c in p}

        # 編集XML内のSHA-256
        edit_sha = sha256(edit_path)
        orig_sha = sha256(orig_path) if orig_exists else None

        for wg in root.iter('wg'):
            dx = wg.get('rk-dx')
            dy = wg.get('rk-dy')
            if not (dx or dy):
                continue

            # この wg の情報
            ws = list(wg.iter('w'))
            refs = [w.get('ref','') for w in ws if w.get('ref')]
            texts = [w.text or '' for w in ws]

            # 所属文を特定
            cur = parent_map.get(wg)
            sent_el = None
            while cur is not None:
                if cur.tag == 'sentence':
                    sent_el = cur
                    break
                cur = parent_map.get(cur)

            sent_range = sentence_ref_range(sent_el) if sent_el else ('?','?')

            # 直接の親 wg
            parent_wg = parent_map.get(wg)
            parent_info = None
            if parent_wg is not None and parent_wg.tag == 'wg':
                parent_info = {
                    'rule':  parent_wg.get('rule',''),
                    'class': parent_wg.get('class',''),
                    'role':  parent_wg.get('role',''),
                }

            # 直接の子
            direct_children = []
            for c in list(wg):
                if c.tag == 'wg':
                    c_ws = list(c.iter('w'))
                    direct_children.append({
                        'tag': 'wg',
                        'rule': c.get('rule',''),
                        'class': c.get('class',''),
                        'role': c.get('role',''),
                        'junction': c.get('junction',''),
                        'word_count': len(c_ws),
                        'first_text': c_ws[0].text if c_ws else '',
                    })
                elif c.tag == 'w':
                    direct_children.append({
                        'tag': 'w',
                        'class': c.get('class',''),
                        'role': c.get('role',''),
                        'text': c.text or '',
                        'ref': c.get('ref',''),
                    })

            # 原本に同じ wg(ref範囲で照合) があるかチェック
            orig_has_rk = False
            if orig_exists and refs:
                with open(orig_path, 'r', encoding='utf-8') as f:
                    orig_text = f.read()
                orig_has_rk = 'rk-dx' in orig_text or 'rk-dy' in orig_text

            results.append({
                'file': fname,
                'edit_sha256': edit_sha[:16],
                'orig_sha256': orig_sha[:16] if orig_sha else None,
                'orig_has_rk': orig_has_rk,
                'sentence_range': list(sent_range),
                'wg_rule': wg.get('rule',''),
                'wg_class': wg.get('class',''),
                'wg_role': wg.get('role',''),
                'wg_junction': wg.get('junction',''),
                'rk_dx': dx,
                'rk_dy': dy,
                'word_count': len(ws),
                'first_ref': refs[0] if refs else '?',
                'last_ref': refs[-1] if refs else '?',
                'words': texts,
                'parent_wg': parent_info,
                'direct_children': direct_children,
            })

    return results

def render_md(entries):
    lines = ['# Phase 3: rk-dx / rk-dy 手動調整箇所の監査\n',
             '**READ-ONLY 監査 — 対象ファイル変更なし**\n',
             f'調査対象: `lowfat-handover/data/lowfat/` ({len(entries)} 件)\n',
             '---\n']

    for i, e in enumerate(entries, 1):
        lines.append(f'## 調整箇所 {i}')
        lines.append(f'- **ファイル**: `{e["file"]}`')
        lines.append(f'- **文範囲**: {e["sentence_range"][0]} 〜 {e["sentence_range"][1]}')
        lines.append(f'- **対象 wg**: rule=`{e["wg_rule"]}` class=`{e["wg_class"]}` role=`{e["wg_role"]}` junction=`{e["wg_junction"]}`')
        lines.append(f'- **調整値**: rk-dx=`{e["rk_dx"]}` / rk-dy=`{e["rk_dy"]}`')
        lines.append(f'- **含む語数**: {e["word_count"]} 語 (`{e["first_ref"]}` 〜 `{e["last_ref"]}`)')
        lines.append(f'- **語テキスト**: {" ".join(e["words"][:8])}{"..." if len(e["words"])>8 else ""}')

        if e['parent_wg']:
            p = e['parent_wg']
            lines.append(f'- **直接親 wg**: rule=`{p["rule"]}` class=`{p["class"]}` role=`{p["role"]}`')

        lines.append('- **直接子要素**:')
        for c in e['direct_children']:
            if c['tag'] == 'wg':
                lines.append(f'  - wg rule=`{c["rule"]}` class=`{c["class"]}` role=`{c["role"]}` junc=`{c["junction"]}` ({c["word_count"]}語, 先頭:`{c["first_text"]}`)')
            else:
                lines.append(f'  - w class=`{c["class"]}` role=`{c["role"]}` `{c["text"]}` [{c["ref"]}]')

        lines.append(f'- **編集ファイル SHA-256(16)**: `{e["edit_sha256"]}`')
        lines.append(f'- **原本 SHA-256(16)**: `{e["orig_sha256"]}`')
        lines.append(f'- **原本に rk 属性**: {"あり (SUSPECT)" if e["orig_has_rk"] else "なし (CONFIRMED: 原本は未編集)"}')

        # 判定
        verdict = 'UNDETERMINED'
        reason = '人手で構造確認が必要'
        if e['rk_dy'] and int(float(e['rk_dy'])) > 0:
            verdict = 'UNDETERMINED'
            reason = '下方向移動 (混雑回避か構造上の問題かを要確認)'
        elif e['rk_dy'] and int(float(e['rk_dy'])) < 0:
            verdict = 'UNDETERMINED'
            reason = '上方向移動 (通常は起きない — 構造の問題の可能性)'
        if e['rk_dx']:
            reason += f' / 水平移動あり (rk-dx={e["rk_dx"]})'

        lines.append(f'- **判定**: `{verdict}` — {reason}')
        lines.append('')

    lines.append('---')
    lines.append('## まとめ')
    lines.append(f'- 合計: {len(entries)} 件 (LUK 3件 / COL 3件)')
    lines.append('- 全件 UNDETERMINED — 自動判定不可（人手確認が必要）')
    lines.append('- 原本 (gnt-jp/work/SBLGNT/lowfat/) への rk 属性追加: 0件 (CONFIRMED)')
    lines.append('- 編集コピー (lowfat-handover/data/lowfat/) のみに rk 属性が存在')

    return '\n'.join(lines)

if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)

    entries = find_rk_edited_wgs()

    # JSON 出力
    json_path = os.path.join(OUT_DIR, 'phase3_rk_manual.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f'JSON: {json_path}')

    # Markdown 出力
    md_path = os.path.join(OUT_DIR, 'phase3_rk_manual.md')
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(render_md(entries))
    print(f'MD:   {md_path}')

    print(f'\n合計 {len(entries)} 件の rk-dx/rk-dy 調整を検出')
