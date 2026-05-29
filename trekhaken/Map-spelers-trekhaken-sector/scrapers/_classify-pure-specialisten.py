"""
_classify-pure-specialisten.py

Herclassificeert plaatsers.json:
- "Pure trekhaak-specialisten" blijven in plaatsers.json
- Generieke garages zonder trekhaak-relatie -> alle_garages.json (nieuw bestand)

Pure-specialist criteria (een record is specialist als ten minste 1 hit):
  1. Naam bevat: trekhaak, trekhaken, aanhang, aanhangwagen, towbar, trailer,
     attelage, remorque, attache, anhaenger, anhanger, kupplung
  2. Website domain bevat dezelfde stems
  3. Info-veld bevat trekhaak-context
  4. Aanwezig in een OEM-dealer-network bron (brink_dealer, gdw_dealer, etc.)
  5. Manueel gemarkeerd in seed-data (marktresearch, manual)
  6. Heeft >= 1 gevoerd-merk uit OEM-lijst (Brink/GDW/Westfalia/Bosal/...)
"""
import json, os, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8-sig')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

SPECIALIST_TERMS = re.compile(
    r'trekhaak|trekhake|aanhangwagen|aanhang(?!er)|towbar|trailer'
    r'|attelage|remorque|attache.?remorque|attaches?.?remorques?'
    r'|anh(a|ae|ä)nger|kupplung',
    re.IGNORECASE
)

OEM_SOURCES = {
    'brink_dealer_locator', 'gdw_dealer', 'westfalia_partner', 'bosal_dealer',
    'oris_dealer', 'acps_partner', 'sawiko_dealer', 'al_ko_dealer',
    'thule_dealer', 'manual', 'marktresearch', 'financials_companyweb'
}
OEM_MERKEN = {'brink', 'gdw', 'westfalia', 'bosal', 'oris', 'acps', 'sawiko',
              'al-ko', 'al ko', 'thule', 'steinhof', 'autohak', 'mvg'}


def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def text_blob(r):
    """Concatenate alle tekstuele velden in 1 string voor stem-detection"""
    parts = [
        r.get('naam', ''),
        r.get('website', ''),
        r.get('info', ''),
        ' '.join(r.get('merken_gevoerd') or []),
    ]
    return ' '.join(p for p in parts if p).lower()


def is_pure_specialist(r):
    blob = text_blob(r)
    # Regel 1+2+3: naam/website/info bevat trekhaak-term
    if SPECIALIST_TERMS.search(blob):
        return True, 'naam_website_info_bevat_trekhaak_term'
    # Regel 4: bron bevat OEM-dealer-locator
    bron = r.get('bron') or []
    if any(b in OEM_SOURCES for b in bron):
        return True, 'oem_dealer_bron'
    # Regel 5: heeft een OEM-merk gevoerd
    merken = [m.lower() for m in (r.get('merken_gevoerd') or [])]
    if any(any(o in m for o in OEM_MERKEN) for m in merken):
        return True, 'voert_oem_merk'
    return False, None


def main():
    plaatsers = load('plaatsers.json')
    verkopers = load('verkopers.json')
    distrs    = load('distributeurs.json')
    try:
        alle_garages = load('alle_garages.json')
    except FileNotFoundError:
        alle_garages = []

    # Index alle_garages op naam+plaats om dedup te doen
    seen_garages = {(g.get('naam', '').lower(), g.get('plaats', '').lower()) for g in alle_garages}

    pure = []
    verplaatst = []
    reasons = {}

    for r in plaatsers:
        is_spec, reason = is_pure_specialist(r)
        if is_spec:
            r['is_specialist'] = True
            r['specialist_reason'] = reason
            pure.append(r)
            reasons[reason] = reasons.get(reason, 0) + 1
        else:
            # Verplaats naar alle_garages — markeer als ex-plaatser
            key = (r.get('naam', '').lower(), r.get('plaats', '').lower())
            if key not in seen_garages:
                r['categorieen'] = ['alle_garages']
                r['primaire_categorie'] = 'alle_garages'
                r['is_specialist'] = False
                r['classified_from'] = 'plaatsers'
                alle_garages.append(r)
                seen_garages.add(key)
            verplaatst.append(r.get('naam', '?'))

    # Verkopers: alle behouden (zijn al expliciet "verkoper")
    # Distributeurs: idem

    save('plaatsers.json', pure)
    save('alle_garages.json', alle_garages)

    print('═══════════════════════════════════════════════════════════')
    print(f'Plaatsers herclassificatie gereed')
    print('═══════════════════════════════════════════════════════════')
    print()
    print(f'Originele plaatsers:     {len(plaatsers)}')
    print(f'-> Echte specialisten:    {len(pure)}')
    print(f'-> Verplaatst -> alle_garages: {len(verplaatst)}')
    print()
    print('Specialist-redenen (waarom in plaatsers):')
    for reason, n in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f'  {reason:40s} {n}')
    print()
    print('Eind-tellingen:')
    print(f'  plaatsers.json:      {len(pure)}')
    print(f'  verkopers.json:      {len(verkopers)}')
    print(f'  distributeurs.json:  {len(distrs)}')
    print(f'  alle_garages.json:   {len(alle_garages)}')
    print(f'  TOTAAL:              {len(pure) + len(verkopers) + len(distrs) + len(alle_garages)}')


if __name__ == '__main__':
    main()
