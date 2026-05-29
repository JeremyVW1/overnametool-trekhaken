"""
_calc-top50.py

Bereken Top-50 overnamekandidaten op basis van EBITDA sweet spot, FTE, marge,
winstgevendheid en digitaliseringspotentieel. Output -> data/top50.json.

Scoring (gewichten uit sector.config.json):
  - EBITDA in sweet spot (150K-750K): 40 pt
  - Brutomarge per FTE (>=100K): 25 pt
  - FTE <= 15: 15 pt
  - Winstgevendheid (positieve winst): 10 pt
  - Digitaliseringspotentieel (geen webshop): 10 pt
"""
import json, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8-sig')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data')


def load(name):
    with open(os.path.join(DATA, name), 'r', encoding='utf-8-sig') as f:
        return json.load(f)
def save(name, data):
    with open(os.path.join(DATA, name), 'w', encoding='utf-8-sig') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def score(b, cfg):
    weights = cfg['scoring']['weights']
    ebmin, ebmax = cfg['scoring']['ebitda_sweet_spot']
    max_fte = cfg['scoring']['max_fte']
    min_marge = cfg['scoring']['min_brutomarge_per_fte']

    ebitda = b.get('bizzy_ebitda') or 0
    fte = b.get('cw_fte') or 0
    margin = b.get('cw_brutomarge') or 0
    winst = b.get('cw_winst') or 0
    webshop = (b.get('webshop') or '').lower()

    # 1) EBITDA
    if ebmin <= ebitda <= ebmax:
        s_ebitda = weights['ebitda']
    elif ebitda > 0:
        s_ebitda = weights['ebitda'] * 0.4
    else:
        s_ebitda = 0

    # 2) Marge per FTE
    if fte > 0 and margin > 0:
        per_fte = margin / fte
        s_marge = weights['brutomarge_per_fte'] * min(1.0, per_fte / min_marge)
    else:
        s_marge = 0

    # 3) FTE-grootte
    if 0 < fte <= max_fte:
        s_fte = weights['fte_grootte']
    elif fte > 0:
        s_fte = weights['fte_grootte'] * (max_fte / fte)
    else:
        s_fte = 0

    # 4) Winstgevendheid
    s_winst = weights['winstgevendheid'] if winst > 0 else 0

    # 5) Digitaliseringspotentieel
    if webshop in ('nee', 'no', '') or not webshop:
        s_dig = weights['digitaliseringspotentieel']
    else:
        s_dig = weights['digitaliseringspotentieel'] * 0.3

    total = round(s_ebitda + s_marge + s_fte + s_winst + s_dig)
    return total


def main():
    # Sector-config laden
    with open(os.path.join(ROOT, 'sector.config.json'), 'r', encoding='utf-8-sig') as f:
        cfg = json.load(f)

    # Alle records (plaatsers + verkopers + distributeurs)
    all_records = []
    for f in ('plaatsers.json', 'verkopers.json', 'distributeurs.json'):
        all_records.extend(load(f))

    # Filter: alleen records met minstens 1 financieel signaal
    scored = []
    for b in all_records:
        # Skip als geen enkele financial info
        if not any([b.get('bizzy_ebitda'), b.get('cw_winst') is not None,
                    b.get('cw_brutomarge'), b.get('cw_omzet')]):
            continue
        s = score(b, cfg)
        if s > 0:
            scored.append((s, b))

    # Sort descending
    scored.sort(key=lambda x: -x[0])

    # Top 50
    top50 = []
    for rang, (s, b) in enumerate(scored[:50], 1):
        eb = b.get('bizzy_ebitda')
        winst = b.get('cw_winst')
        if eb is not None and eb > 0:
            est_ebitda = f'€{eb/1000:.0f}K' if eb < 1000000 else f'€{eb/1000000:.2f}M'
        elif winst is not None and winst > 0:
            est_ebitda = f'€{winst/1000:.0f}K (winst)'
        else:
            est_ebitda = '?'
        cats = b.get('categorieen') or [b.get('primaire_categorie', '?')]
        top50.append({
            'rang': rang,
            'naam': b['naam'],
            'score': s,
            'fte': b.get('cw_fte'),
            'est_ebitda': est_ebitda,
            'activiteit': ' + '.join(c.capitalize() for c in cats),
            'btw': b.get('btw'),
            'plaats': b.get('plaats') or b.get('adres', ''),
            'provincie': b.get('provincie'),
            'notitie': (b.get('info') or '')[:200] or f"Brutomarge: {b.get('cw_brutomarge')}, Winst: {b.get('cw_winst')}, FTE: {b.get('cw_fte')}"
        })

    save('top50.json', top50)

    print('Top-50 herrekening gereed')
    print(f'Records met financials beschouwd: {len(scored)}')
    print(f'Top-50 geschreven:                {len(top50)}')
    print()
    if top50:
        print('Top-5:')
        for r in top50[:5]:
            print(f'  #{r["rang"]:>2}  score={r["score"]:>3}  {r["naam"][:40]:<40}  {r["est_ebitda"]}')


if __name__ == '__main__':
    main()
