"""
_auto-generate-info.py

Voor élk record in plaatsers/verkopers/distributeurs zonder `info`-veld:
genereer een korte automatische beschrijving op basis van:
- naam-patroon (trekhaak/aanhang/garage/...)
- gevoerde merken (Brink/GDW/Westfalia/...)
- categorieën (plaatser/verkoper/distributeur)
- plaats + provincie + land
- oprichting (indien bekend = leeftijd)
- bron-tag (OEM dealer-locator, KBO, etc.)

Doel: élke record-pop-up heeft een korte zinvolle beschrijving van wat ze doen.
"""
import json, os, sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')

PROV_LBL = {
    'wvl':'West-Vlaanderen','ovl':'Oost-Vlaanderen','ant':'Antwerpen','vbr':'Vlaams-Brabant',
    'lim':'Limburg (BE)','bru':'Brussel','hai':'Henegouwen','lui':'Luik','nam':'Namen',
    'lux':'Luxemburg (BE)','bwa':'Waals-Brabant',
    'nh':'Noord-Holland','zh':'Zuid-Holland','ut':'Utrecht','gl':'Gelderland','ov':'Overijssel',
    'fl':'Flevoland','dr':'Drenthe','gr':'Groningen','fr':'Friesland','nb':'Noord-Brabant',
    'li':'Limburg (NL)','ze':'Zeeland',
}

def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def is_trekhaak_specialist_name(naam):
    if not naam: return False
    return bool(re.search(r'trekhaak|aanhang|attelage|remorque|towbar|attache|kupplung', naam, re.I))

def is_aanhangwagen_specialist(naam):
    if not naam: return False
    return bool(re.search(r'aanhang|trailer|remorque', naam, re.I))

def is_remorque_only(naam):
    if not naam: return False
    return bool(re.search(r'remorque|attache', naam, re.I)) and not re.search(r'trekhaak|aanhang', naam, re.I)

def is_garage_name(naam):
    if not naam: return False
    return bool(re.search(r'^garage |autoservice|auto.?service|car.?service|carrosserie|autobedrijf', naam, re.I))

def is_oem_dealer(bron):
    """Bron-array bevat OEM dealer-locator vermelding."""
    bron = bron or []
    return any(re.search(r'brink|gdw|westfalia|bosal|oris|sawiko|al.?ko|thule|eduard|ifor|atec|anssems|humbaur|hapert', b, re.I) for b in bron)

def leeftijd(oprichting):
    """Returnt 'X jaar bedrijf' of None."""
    if not oprichting:
        return None
    m = re.search(r'\b(19\d{2}|20\d{2})\b', str(oprichting))
    if not m:
        return None
    jaar = int(m.group(1))
    age = 2026 - jaar
    if age < 2:
        return 'pas opgericht (' + str(jaar) + ')'
    if age >= 50:
        return f'{age}+ jaar bedrijf (sinds {jaar})'
    if age >= 20:
        return f'{age} jaar bedrijf (sinds {jaar})'
    return f'opgericht {jaar}'


def generate_info(rec):
    naam = rec.get('naam', '')
    cats = rec.get('categorieen') or [rec.get('primaire_categorie', '')]
    merken = rec.get('merken_gevoerd', [])
    plaats = rec.get('plaats', '')
    provincie = PROV_LBL.get(rec.get('provincie'), '')
    bron = rec.get('bron', [])

    parts = []

    # Spec / Garage / Generiek
    if is_trekhaak_specialist_name(naam):
        if 'remorque' in naam.lower() or 'attache' in naam.lower():
            parts.append('Trekhaak- en aanhangwagen-specialist')
        elif 'aanhangwagen' in naam.lower() or 'trailer' in naam.lower():
            parts.append('Aanhangwagen-dealer met trekhaak-service')
        else:
            parts.append('Pure trekhaak-specialist')
    elif is_oem_dealer(bron):
        merken_str = '/'.join(sorted(set(merken))[:3]) if merken else 'multi-merk'
        parts.append(f'Erkende installateur ({merken_str})')
    elif 'plaatser' in cats:
        if is_garage_name(naam):
            parts.append('Garage met trekhaak-installatie')
        else:
            parts.append('Trekhaak-plaatser')
    elif 'verkoper' in cats:
        parts.append('Trekhaak-verkoper')
    elif 'distributeur' in cats:
        parts.append('Distributeur/groothandel')

    # Locatie
    if plaats:
        if provincie:
            parts.append(f'gevestigd in {plaats} ({provincie})')
        else:
            parts.append(f'gevestigd in {plaats}')
    elif provincie:
        parts.append(f'actief in {provincie}')

    # Leeftijd
    age = leeftijd(rec.get('oprichting'))
    if age:
        parts.append(age)

    # Merken (als nog niet vermeld)
    if merken and not is_oem_dealer(bron):
        merken_str = ', '.join(sorted(set(merken))[:5])
        parts.append(f'voert {merken_str}')

    # Webshop
    if rec.get('webshop') == 'Ja':
        parts.append('heeft eigen webshop')

    # Eerste letter hoofd, samenvoegen
    if not parts:
        return None
    desc = '. '.join(p.strip().rstrip('.') for p in parts) + '.'
    desc = desc[0].upper() + desc[1:]
    return desc


def main():
    files = ['plaatsers.json', 'verkopers.json', 'distributeurs.json']
    counts = {'updated': 0, 'already': 0, 'no_data': 0}

    for fname in files:
        arr = load(fname)
        for r in arr:
            if r.get('info') and len(r['info']) > 20:
                counts['already'] += 1
                continue
            desc = generate_info(r)
            if desc:
                # Behoud bestaande info als die er was, en voeg auto-info toe
                existing = (r.get('info') or '').strip()
                if existing:
                    r['info'] = existing + ' | ' + desc
                else:
                    r['info'] = desc
                r['_info_auto'] = True
                counts['updated'] += 1
            else:
                counts['no_data'] += 1
        save(fname, arr)

    print('Auto-info generator gereed:')
    print(f'  Records met auto-info toegevoegd: {counts["updated"]}')
    print(f'  Al een goede info aanwezig:       {counts["already"]}')
    print(f'  Geen data om iets te genereren:   {counts["no_data"]}')


if __name__ == '__main__':
    main()
