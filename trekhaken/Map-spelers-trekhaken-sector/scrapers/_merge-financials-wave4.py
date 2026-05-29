"""Idem aan _merge-financials-wave3.py maar leest financials-be-wave4.json."""
import json, os, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
def norm_btw(b):
    return re.sub(r'[^0-9]', '', str(b or ''))

FIN_FIELDS = ['cw_omzet','cw_brutomarge','cw_winst','cw_fte','cw_jaar','bizzy_ebitda','oprichting','financials_bron']

fins = load('_bron-cache/financials-be-wave4.json')
files = ['plaatsers.json','verkopers.json','distributeurs.json','alle_garages.json']
idx = {}
all_arrs = {}
for f in files:
    try:
        arr = load(f); all_arrs[f] = arr
        for r in arr:
            b = norm_btw(r.get('btw'))
            if b: idx[b] = (f, r)
    except: pass

updates = 0
unmatched = []
for f in fins:
    b = norm_btw(f.get('btw'))
    if not b: continue
    if b in idx:
        _, target = idx[b]
        for fld in FIN_FIELDS:
            if fld in f and f[fld] is not None and f[fld] != '':
                target[fld] = f[fld]
        if 'info_extra' in f:
            target['info'] = (target.get('info','') + ' | ' + f['info_extra']).strip(' |')
        bron = target.get('bron') or []
        if 'financials_pappers_wave4' not in bron:
            bron.append('financials_pappers_wave4'); target['bron'] = bron
        updates += 1
    else:
        unmatched.append(f.get('naam'))

for fname, arr in all_arrs.items():
    save(fname, arr)

print(f'Wave-4 financials merge gereed: {updates}/{len(fins)} records geupdate.')
if unmatched:
    print('Unmatched:', unmatched[:5], '...' if len(unmatched)>5 else '')
