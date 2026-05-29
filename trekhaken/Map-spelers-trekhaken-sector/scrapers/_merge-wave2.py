"""
Merge agent-be-wave2.json (118 nieuwe BE-records) in bestaande files.
- Dedup op naam-lowercase + plaats-lowercase
- Bij match: voeg ontbrekende velden toe (zonder bestaande te overschrijven)
- Bij geen match: nieuwe record in juiste categorie-file
"""
import json, os, sys, io
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

wave2 = load('_bron-cache/agent-be-wave2.json')
plaatsers = load('plaatsers.json')
verkopers = load('verkopers.json')
distrs    = load('distributeurs.json')

idx = {}
for arr_name, arr in [('plaatsers', plaatsers), ('verkopers', verkopers), ('distributeurs', distrs)]:
    for r in arr:
        # Index zowel op naam+plaats als op website (voor cross-matching)
        n = norm(r.get('naam', ''))
        p = norm(r.get('plaats', ''))
        idx[(n, p)] = (arr_name, r)
        if r.get('website'):
            web = r['website'].lower().strip().lstrip('https://').lstrip('http://').rstrip('/')
            idx[('web', web)] = (arr_name, r)

ADDITIVE_FIELDS = ['adres', 'plaats', 'telefoon', 'website', 'btw', 'kvk', 'lat', 'lng']

updates = 0
adds = 0
add_log = {'plaatsers': 0, 'verkopers': 0, 'distributeurs': 0}

for r in wave2:
    n = norm(r.get('naam', ''))
    p = norm(r.get('plaats', ''))
    target = None
    if (n, p) in idx:
        _, target = idx[(n, p)]
    elif r.get('website'):
        web = r['website'].lower().strip().lstrip('https://').lstrip('http://').rstrip('/')
        if ('web', web) in idx:
            _, target = idx[('web', web)]

    if target:
        # Vul ontbrekende velden bij — overschrijf niet
        for fld in ADDITIVE_FIELDS:
            if fld in r and r[fld] not in (None, ''):
                if target.get(fld) in (None, ''):
                    target[fld] = r[fld]
        bron = target.get('bron', [])
        if isinstance(bron, list) and 'agent_research_2026_05_29_wave2' not in bron:
            bron.append('agent_research_2026_05_29_wave2')
            target['bron'] = bron
        updates += 1
    else:
        cat = r.get('primaire_categorie', 'plaatser')
        new = {
            'naam': r['naam'],
            'land': r.get('land', 'BE'),
            'provincie': r.get('provincie', ''),
            'plaats': r.get('plaats', ''),
            'adres': r.get('adres', ''),
            'telefoon': r.get('telefoon', ''),
            'website': r.get('website', ''),
            'btw': r.get('btw'),
            'categorieen': r.get('categorieen', [cat]),
            'primaire_categorie': cat,
            'bron': ['agent_research_2026_05_29_wave2'],
        }
        if cat == 'distributeur':
            distrs.append(new); add_log['distributeurs'] += 1
        elif cat == 'verkoper':
            verkopers.append(new); add_log['verkopers'] += 1
        else:
            plaatsers.append(new); add_log['plaatsers'] += 1
        adds += 1

save('plaatsers.json',     plaatsers)
save('verkopers.json',     verkopers)
save('distributeurs.json', distrs)

print(f'Wave-2 merge gereed:')
print(f'  Updated (match):   {updates}')
print(f'  Added (new):       {adds}')
print(f'    -> plaatsers:     +{add_log["plaatsers"]}')
print(f'    -> verkopers:     +{add_log["verkopers"]}')
print(f'    -> distributeurs: +{add_log["distributeurs"]}')
print()
print(f'EIND-tellingen:')
print(f'  plaatsers.json:     {len(plaatsers)}')
print(f'  verkopers.json:     {len(verkopers)}')
print(f'  distributeurs.json: {len(distrs)}')
print(f'  TOTAAL:             {len(plaatsers) + len(verkopers) + len(distrs)}')
