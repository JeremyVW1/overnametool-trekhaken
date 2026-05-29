"""
Merge financials uit data/_bron-cache/financials-be.json met bestaande categorie-files.
Update bestaande records (op match-namen) of voeg nieuwe toe.
"""
import json, os, sys, io

# Force UTF-8 output op Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8') as f:
        return json.load(f)

def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def norm(s):
    return (s or '').strip().lower().replace('  ', ' ')

fins      = load('_bron-cache/financials-be.json')
plaatsers = load('plaatsers.json')
verkopers = load('verkopers.json')
distrs    = load('distributeurs.json')

# Index: name -> (array_name, record)
idx = {}
for arr_name, arr in [('plaatsers', plaatsers), ('verkopers', verkopers), ('distributeurs', distrs)]:
    for r in arr:
        idx[norm(r.get('naam', ''))] = (arr_name, r)

FIN_FIELDS = ['btw', 'cw_omzet', 'cw_brutomarge', 'cw_winst', 'cw_fte', 'cw_jaar', 'bizzy_ebitda', 'oprichting', 'financials_bron']

updates = 0
adds = 0

for f in fins:
    target = None
    target_arr = None
    for try_name in (f.get('match') or []) + [f['naam']]:
        key = norm(try_name)
        if key in idx:
            target_arr, target = idx[key]
            break

    if target:
        for fld in FIN_FIELDS:
            if fld in f and f[fld] is not None and f[fld] != '':
                target[fld] = f[fld]
        if 'info_extra' in f:
            target['info'] = (target.get('info', '') + ' | ' + f['info_extra']).strip(' |')
        bron = target.get('bron', [])
        if isinstance(bron, list) and 'financials_companyweb' not in bron:
            bron.append('financials_companyweb')
            target['bron'] = bron
        updates += 1
    else:
        cat = f.get('primaire_categorie', 'plaatser')
        new = {
            'naam': f['naam'],
            'land': 'BE',
            'provincie': f.get('provincie', ''),
            'plaats': f.get('stad', ''),
            'categorieen': f.get('categorieen', [cat]),
            'primaire_categorie': cat,
            'btw': f.get('btw'),
            'bron': ['financials_companyweb', 'agent_research_2026_05_29'],
        }
        for fld in ['cw_omzet', 'cw_brutomarge', 'cw_winst', 'cw_fte', 'cw_jaar', 'bizzy_ebitda', 'oprichting', 'info', 'financials_bron']:
            if fld in f and f[fld] is not None:
                new[fld] = f[fld]
        if cat == 'distributeur':  distrs.append(new)
        elif cat == 'verkoper':    verkopers.append(new)
        else:                      plaatsers.append(new)
        adds += 1

save('plaatsers.json',      plaatsers)
save('verkopers.json',      verkopers)
save('distributeurs.json',  distrs)

print(f'Records geupdate met financials: {updates}')
print(f'Nieuwe records toegevoegd:       {adds}')
print(f'  Plaatsers totaal:     {len(plaatsers)}')
print(f'  Verkopers totaal:     {len(verkopers)}')
print(f'  Distributeurs totaal: {len(distrs)}')
