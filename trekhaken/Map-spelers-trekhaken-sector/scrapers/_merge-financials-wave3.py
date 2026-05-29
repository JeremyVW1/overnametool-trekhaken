"""
_merge-financials-wave3.py

Leest data/_bron-cache/financials-be-wave3.json en injecteert financials in
plaatsers/verkopers/distributeurs/alle_garages op basis van BTW-match.
"""
import json, os, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8-sig')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def norm_btw(b):
    return re.sub(r'[^0-9]', '', str(b or ''))

FIN_FIELDS = ['cw_omzet', 'cw_brutomarge', 'cw_winst', 'cw_fte', 'cw_jaar',
              'bizzy_ebitda', 'oprichting', 'financials_bron']

fins = load('_bron-cache/financials-be-wave3.json')
plaatsers    = load('plaatsers.json')
verkopers    = load('verkopers.json')
distrs       = load('distributeurs.json')
try:
    alle_garages = load('alle_garages.json')
except FileNotFoundError:
    alle_garages = []

# Build index op BTW
idx = {}
for arr_name, arr in [('plaatsers', plaatsers), ('verkopers', verkopers),
                       ('distributeurs', distrs), ('alle_garages', alle_garages)]:
    for r in arr:
        b = norm_btw(r.get('btw'))
        if b:
            idx[b] = (arr_name, r)

updates = 0
unmatched = []
for f in fins:
    b = norm_btw(f.get('btw'))
    if not b:
        continue
    if b in idx:
        _, target = idx[b]
        for fld in FIN_FIELDS:
            if fld in f and f[fld] is not None and f[fld] != '':
                target[fld] = f[fld]
        if 'info_extra' in f:
            target['info'] = (target.get('info', '') + ' | ' + f['info_extra']).strip(' |')
        bron = target.get('bron') or []
        if 'financials_pappers_wave3' not in bron:
            bron.append('financials_pappers_wave3')
            target['bron'] = bron
        updates += 1
    else:
        unmatched.append(f.get('naam'))

save('plaatsers.json', plaatsers)
save('verkopers.json', verkopers)
save('distributeurs.json', distrs)
save('alle_garages.json', alle_garages)

print(f'Financials wave3 toegepast:')
print(f'  Updates: {updates} / {len(fins)} records')
if unmatched:
    print(f'  Unmatched (BTW niet gevonden in onze data):')
    for n in unmatched[:10]:
        print(f'    - {n}')
