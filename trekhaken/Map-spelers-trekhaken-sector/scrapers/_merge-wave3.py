"""
_merge-wave3.py

Universele merger voor agent-output JSON's (Fasen 1-4).
Leest élk JSON-bestand in data/_bron-cache/ dat begint met 'agent-' of 'wave3-'
of 'oem-dealers' of 'kbo-' of 'branche-' of 'wallonie-', dedup tegen bestaande
plaatsers/verkopers/distributeurs/alle_garages.

Match-regels (in volgorde):
  1. BTW exact
  2. Website-domain (genormaliseerd)
  3. Naam-normalised + plaats-normalised

Bij match: vul ontbrekende velden bij, voeg bron-tag toe.
Bij geen match: nieuwe record, default categorie = 'plaatser' tenzij anders gemarkeerd.
"""
import json, os, sys, io, re, glob
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8-sig')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
CACHE = os.path.join(DATA, '_bron-cache')


def load_json(path, default=None):
    try:
        with open(path, 'r', encoding='utf-8-sig') as f:
            return json.load(f)
    except FileNotFoundError:
        return default
def save_json(path, data):
    with open(path, 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def norm_name(s):
    if not s: return ''
    s = s.lower().strip()
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'[^\w\s.\-]', '', s)
    return s

def norm_plaats(s):
    if not s: return ''
    s = s.lower().strip()
    s = re.sub(r'\(.*?\)', '', s)
    return s.strip()

def norm_domain(s):
    if not s: return ''
    s = s.lower().strip()
    s = re.sub(r'^https?://', '', s)
    s = s.lstrip('www.').rstrip('/')
    return s.split('/')[0]

def norm_btw(s):
    if not s: return ''
    return re.sub(r'[^0-9]', '', str(s))


def build_index(records, source_name):
    """Index een records-array op BTW / domain / naam+plaats. Returnt list van (key_type, key, record, source_name)."""
    idx = {}
    for r in records:
        btw = norm_btw(r.get('btw'))
        if btw:
            idx[('btw', btw)] = (source_name, r)
        dom = norm_domain(r.get('website'))
        if dom:
            idx[('dom', dom)] = (source_name, r)
        n = norm_name(r.get('naam'))
        p = norm_plaats(r.get('plaats') or r.get('adres', ''))
        if n:
            idx[('np', n, p)] = (source_name, r)
    return idx


def find_match(r, indexes):
    btw = norm_btw(r.get('btw'))
    if btw:
        for idx in indexes:
            if ('btw', btw) in idx:
                return idx[('btw', btw)]
    dom = norm_domain(r.get('website'))
    if dom:
        for idx in indexes:
            if ('dom', dom) in idx:
                return idx[('dom', dom)]
    n = norm_name(r.get('naam'))
    p = norm_plaats(r.get('plaats') or r.get('adres', ''))
    if n:
        for idx in indexes:
            if ('np', n, p) in idx:
                return idx[('np', n, p)]
            # ook proberen met lege plaats (sommige records hebben geen plaats)
            if ('np', n, '') in idx:
                return idx[('np', n, '')]
    return None


def merge_fields(target, new):
    """Vul ontbrekende velden in target met data uit new. Geen overschrijving."""
    for k, v in new.items():
        if k in ('naam',):
            continue
        if v in (None, '', []):
            continue
        if k == 'bron':
            existing = set(target.get('bron') or [])
            existing.update(v if isinstance(v, list) else [v])
            target['bron'] = sorted(existing)
        elif k == 'merken_gevoerd':
            existing = set((x.lower() for x in (target.get('merken_gevoerd') or [])))
            for m in v:
                if m.lower() not in existing:
                    target.setdefault('merken_gevoerd', []).append(m)
                    existing.add(m.lower())
        elif k == 'categorieen':
            existing = set(target.get('categorieen') or [])
            existing.update(v)
            target['categorieen'] = sorted(existing)
        elif target.get(k) in (None, '', []):
            target[k] = v


def main():
    plaatsers = load_json(os.path.join(DATA, 'plaatsers.json'), [])
    verkopers = load_json(os.path.join(DATA, 'verkopers.json'), [])
    distrs    = load_json(os.path.join(DATA, 'distributeurs.json'), [])
    alle_garages = load_json(os.path.join(DATA, 'alle_garages.json'), [])

    indexes = [
        build_index(plaatsers, 'plaatsers'),
        build_index(verkopers, 'verkopers'),
        build_index(distrs,    'distributeurs'),
        build_index(alle_garages, 'alle_garages'),
    ]

    # Cache-files matchen
    patterns = ['oem-dealers-*.json', 'kbo-naam-zoek-*.json', 'branche-*.json',
                'wallonie-*.json', 'wave3-*.json', 'agent-be-wave3-*.json']
    cache_files = []
    for p in patterns:
        cache_files.extend(glob.glob(os.path.join(CACHE, p)))

    if not cache_files:
        print('Geen wave3 cache-files gevonden. Niets te mergen.')
        print('Verwacht patronen: oem-dealers-*.json, kbo-naam-zoek-*.json, branche-*.json, wallonie-*.json')
        return

    total_in = 0
    updates = 0
    adds = {'plaatsers': 0, 'verkopers': 0, 'distributeurs': 0, 'alle_garages': 0}

    for f in cache_files:
        records = load_json(f, [])
        print(f'Verwerken: {os.path.basename(f)} ({len(records)} records)')
        total_in += len(records)
        for r in records:
            match = find_match(r, indexes)
            if match:
                _, existing = match
                merge_fields(existing, r)
                updates += 1
            else:
                cat = r.get('primaire_categorie') or 'plaatser'
                new = dict(r)
                new.setdefault('land', 'BE')
                new['primaire_categorie'] = cat
                new['categorieen'] = r.get('categorieen') or [cat]
                if cat == 'verkoper':
                    verkopers.append(new); adds['verkopers'] += 1
                elif cat == 'distributeur':
                    distrs.append(new); adds['distributeurs'] += 1
                elif cat == 'alle_garages':
                    alle_garages.append(new); adds['alle_garages'] += 1
                else:
                    plaatsers.append(new); adds['plaatsers'] += 1
                # Update indexes zodat opvolgende bron-files ook tegen new dedup-en
                idx_target = (plaatsers if cat == 'plaatser'
                              else verkopers if cat == 'verkoper'
                              else distrs if cat == 'distributeur'
                              else alle_garages)
                idx_idx = (0 if cat == 'plaatser'
                           else 1 if cat == 'verkoper'
                           else 2 if cat == 'distributeur'
                           else 3)
                btw = norm_btw(new.get('btw'))
                if btw:
                    indexes[idx_idx][('btw', btw)] = (cat, new)
                dom = norm_domain(new.get('website'))
                if dom:
                    indexes[idx_idx][('dom', dom)] = (cat, new)
                n = norm_name(new.get('naam'))
                p = norm_plaats(new.get('plaats') or new.get('adres', ''))
                if n:
                    indexes[idx_idx][('np', n, p)] = (cat, new)

    save_json(os.path.join(DATA, 'plaatsers.json'),     plaatsers)
    save_json(os.path.join(DATA, 'verkopers.json'),     verkopers)
    save_json(os.path.join(DATA, 'distributeurs.json'), distrs)
    save_json(os.path.join(DATA, 'alle_garages.json'),  alle_garages)

    print()
    print('═══════════════════════════════════════════════════════════')
    print(f'Wave-3 merge gereed')
    print('═══════════════════════════════════════════════════════════')
    print(f'Total input records:   {total_in}')
    print(f'Updates (match):       {updates}')
    print(f'Adds (new):            {sum(adds.values())}')
    print(f'  -> plaatsers:        +{adds["plaatsers"]}')
    print(f'  -> verkopers:        +{adds["verkopers"]}')
    print(f'  -> distributeurs:    +{adds["distributeurs"]}')
    print(f'  -> alle_garages:     +{adds["alle_garages"]}')
    print()
    print('Eind-tellingen:')
    print(f'  plaatsers.json:      {len(plaatsers)}')
    print(f'  verkopers.json:      {len(verkopers)}')
    print(f'  distributeurs.json:  {len(distrs)}')
    print(f'  alle_garages.json:   {len(alle_garages)}')


if __name__ == '__main__':
    main()
