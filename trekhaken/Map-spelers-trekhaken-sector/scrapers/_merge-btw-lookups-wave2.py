"""Merge btw-lookups-wave2.json: voor élke match update BTW + adres + telefoon + website + oprichting."""
import json, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
def norm(s):
    return (s or '').strip().lower()

def naam_match(a, b):
    n1, n2 = norm(a), norm(b)
    return n1 == n2 or n2 in n1 or n1 in n2

ADDITIVE = ['btw','adres','telefoon','website','oprichting']

upd = load('_bron-cache/btw-lookups-wave2.json')
files = ['plaatsers.json','verkopers.json','distributeurs.json','alle_garages.json']
arrays = {f: load(f) for f in files}

stats = {'updated': 0, 'not_found': []}
for u in upd:
    found = False
    for fname, arr in arrays.items():
        for r in arr:
            if naam_match(r.get('naam'), u['match_naam']):
                # Update velden bij die ontbreken; nieuwe BTW altijd toevoegen als die er niet was
                for fld in ADDITIVE:
                    if fld in u and u[fld]:
                        if fld == 'btw' and not r.get('btw'):
                            r['btw'] = u['btw']
                        elif fld != 'btw' and not r.get(fld):
                            r[fld] = u[fld]
                if 'info_add' in u:
                    r['info'] = (r.get('info','') + ' | ' + u['info_add']).strip(' |')
                # Reset coords als adres is bijgewerkt
                if u.get('adres'):
                    r['lat'] = None; r['lng'] = None
                bron = r.get('bron') or []
                if 'btw_lookup_wave2' not in bron:
                    bron.append('btw_lookup_wave2'); r['bron'] = bron
                stats['updated'] += 1
                found = True
                break
        if found: break
    if not found:
        stats['not_found'].append(u['match_naam'])

for fname, arr in arrays.items():
    save(fname, arr)

print(f'BTW-lookup wave2 merge:')
print(f'  Updated: {stats["updated"]}/{len(upd)}')
if stats['not_found']:
    print(f'  Niet gevonden ({len(stats["not_found"])}):')
    for n in stats['not_found']: print(f'    - {n}')
