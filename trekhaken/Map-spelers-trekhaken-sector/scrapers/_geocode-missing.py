"""
_geocode-missing.py

Geocode alle records zonder lat/lng via Nominatim (gratis OpenStreetMap).
Rate-limit: 1.1 sec per request (Nominatim usage policy).
Cache: data/_bron-cache/_geocode-cache.json om dubbele queries te vermijden.

Usage:
  python scrapers/_geocode-missing.py
  python scrapers/_geocode-missing.py --limit 100   # alleen eerste N records
"""
import json, os, sys, io, time, urllib.parse, urllib.request, re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')
CACHE_FILE = os.path.join(DATA, '_bron-cache', '_geocode-cache.json')

USER_AGENT = 'overname-tool-trekhaken/1.0 (jeremyvanwetter@gmail.com)'
RATE_DELAY = 1.1   # sec tussen requests
TIMEOUT = 15       # sec

# CLI args
limit = None
for i, a in enumerate(sys.argv):
    if a == '--limit' and i + 1 < len(sys.argv):
        limit = int(sys.argv[i + 1])

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# Laad cache
try:
    with open(CACHE_FILE, 'r', encoding='utf-8-sig') as f:
        cache = json.load(f)
except FileNotFoundError:
    cache = {}

def save_cache():
    os.makedirs(os.path.dirname(CACHE_FILE), exist_ok=True)
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)

def build_query(rec):
    """Bouw een Nominatim-query string uit adres/plaats/land."""
    parts = []
    if rec.get('adres'):
        parts.append(rec['adres'])
    elif rec.get('plaats'):
        parts.append(rec['plaats'])
    if rec.get('land') == 'BE':
        parts.append('België')
    elif rec.get('land') == 'NL':
        parts.append('Nederland')
    return ', '.join(parts)

def geocode(q):
    """Query Nominatim. Returnt (lat, lng) of None bij failure."""
    if not q:
        return None
    key = q.lower().strip()
    if key in cache:
        c = cache[key]
        return (c['lat'], c['lng']) if c else None

    time.sleep(RATE_DELAY)
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode({
        'q': q,
        'format': 'json',
        'limit': 1,
        'addressdetails': 0,
        'countrycodes': 'be,nl',
    })
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept-Language': 'nl-BE,fr,nl,en'})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            data = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f'  ✗ HTTP fout: {e}')
        cache[key] = None
        return None

    if not data:
        cache[key] = None
        return None

    lat = float(data[0]['lat'])
    lng = float(data[0]['lon'])
    cache[key] = {'lat': lat, 'lng': lng}
    return (lat, lng)


def main():
    files = ['plaatsers.json', 'verkopers.json', 'distributeurs.json', 'alle_garages.json']
    all_records = []
    file_map = {}
    for fname in files:
        try:
            arr = load(fname)
            file_map[fname] = arr
            for r in arr:
                all_records.append((fname, r))
        except FileNotFoundError:
            file_map[fname] = []
            continue

    # Filter: alleen records zonder geldige lat/lng
    missing = [(f, r) for (f, r) in all_records
               if not (isinstance(r.get('lat'), (int, float)) and isinstance(r.get('lng'), (int, float)))]

    total = len(missing)
    print(f'Records zonder coords: {total} / {len(all_records)} totaal')
    if limit:
        missing = missing[:limit]
        print(f'(beperkt tot {limit} voor deze run)')

    success = 0
    failed = 0
    cache_hits = 0
    for i, (fname, r) in enumerate(missing, 1):
        q = build_query(r)
        if not q:
            failed += 1
            continue

        # Check cache zonder rate-limit
        key = q.lower().strip()
        if key in cache:
            cached_value = cache[key]
            if cached_value:
                r['lat'] = cached_value['lat']
                r['lng'] = cached_value['lng']
                success += 1
                cache_hits += 1
            else:
                failed += 1
            continue

        coords = geocode(q)
        if coords:
            r['lat'], r['lng'] = coords
            success += 1
            status = '✓'
        else:
            failed += 1
            status = '✗'

        if i % 20 == 0:
            print(f'  [{i}/{len(missing)}] {status} {r.get("naam","?")[:40]:<40} ({success} ok, {failed} fail, {cache_hits} cache)')
            save_cache()
            # Tussentijds opslaan
            for fn, arr in file_map.items():
                if arr:
                    save(fn, arr)

    save_cache()
    for fn, arr in file_map.items():
        if arr:
            save(fn, arr)

    print()
    print(f'KLAAR: {success} geocoded, {failed} faalde ({cache_hits} cache-hits)')


if __name__ == '__main__':
    main()
