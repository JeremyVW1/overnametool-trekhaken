"""
_merge-exact-addresses.py

Past exacte adressen/telefoon/BTW updates toe op bestaande records, en voegt
nieuwe records toe. Verwijdert ook verkeerd-gemapte records (zoals GDW-Gent
gerechtsdeurwaarder).
"""
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

def norm(s):
    return (s or '').strip().lower()


update_data = load('_bron-cache/exact-addresses-be.json')
updates = update_data['update_addresses']
new_recs = update_data.get('new_records', [])

files = ['plaatsers.json', 'verkopers.json', 'distributeurs.json', 'alle_garages.json']
all_arrays = {}
for f in files:
    try:
        all_arrays[f] = load(f)
    except FileNotFoundError:
        all_arrays[f] = []

# Build index op naam (lowercase)
def naam_match(rec_naam, match_naam):
    n1 = norm(rec_naam)
    n2 = norm(match_naam)
    return n1 == n2 or n2 in n1 or n1 in n2

stats = {'updated': 0, 'deleted': 0, 'added': 0, 'not_found': []}

# Pass 1: Updates
for upd in updates:
    found = False
    for fname, arr in all_arrays.items():
        # Verwijder bij verwijder_reden
        if 'verwijder_reden' in upd:
            new_arr = []
            for r in arr:
                if naam_match(r.get('naam'), upd['match_naam']):
                    print(f'  ✗ VERWIJDER: {r.get("naam")} - {upd["verwijder_reden"][:60]}')
                    # Clear lat/lng zodat de marker verdwijnt
                    stats['deleted'] += 1
                    found = True
                else:
                    new_arr.append(r)
            all_arrays[fname] = new_arr
            continue

        for r in arr:
            if naam_match(r.get('naam'), upd['match_naam']):
                if 'adres' in upd: r['adres'] = upd['adres']
                if 'plaats' in upd: r['plaats'] = upd['plaats']
                if 'telefoon' in upd and not r.get('telefoon'): r['telefoon'] = upd['telefoon']
                if 'website' in upd and not r.get('website'): r['website'] = upd['website']
                if 'btw_add' in upd and not r.get('btw'): r['btw'] = upd['btw_add']
                if 'info_add' in upd:
                    r['info'] = (r.get('info', '') + ' | ' + upd['info_add']).strip(' |')
                # Reset lat/lng zodat geocoder nieuw adres zal proberen
                if 'adres' in upd:
                    r['lat'] = None
                    r['lng'] = None
                stats['updated'] += 1
                found = True
                break
        if found:
            break
    if not found and 'verwijder_reden' not in upd:
        stats['not_found'].append(upd['match_naam'])

# Pass 2: Nieuwe records (alleen als nog niet bestaan)
def already_exists(naam, btw):
    for arr in all_arrays.values():
        for r in arr:
            if btw and r.get('btw') and re.sub(r'[^0-9]', '', r['btw']) == re.sub(r'[^0-9]', '', btw):
                return True
            if naam_match(r.get('naam'), naam):
                return True
    return False

for new in new_recs:
    if already_exists(new['naam'], new.get('btw')):
        continue
    cat = new.get('primaire_categorie', 'plaatser')
    if cat == 'verkoper':
        all_arrays['verkopers.json'].append(new)
    elif cat == 'distributeur':
        all_arrays['distributeurs.json'].append(new)
    elif cat == 'alle_garages':
        all_arrays['alle_garages.json'].append(new)
    else:
        all_arrays['plaatsers.json'].append(new)
    stats['added'] += 1

# Save
for fname, arr in all_arrays.items():
    save(fname, arr)

print()
print(f'Exacte adressen merge gereed:')
print(f'  Updated: {stats["updated"]}')
print(f'  Deleted: {stats["deleted"]}')
print(f'  Added:   {stats["added"]}')
if stats['not_found']:
    print(f'  Niet gevonden ({len(stats["not_found"])}):')
    for n in stats['not_found']:
        print(f'    - {n}')
print()
print('Eind-tellingen:')
for f, arr in all_arrays.items():
    print(f'  {f}: {len(arr)}')
