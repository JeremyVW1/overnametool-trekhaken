"""
_merge-wave6.py

Universele merger voor Wave-6 agent-output JSON's.
Leest alle wave6{a-f}-*.json bestanden in data/_bron-cache/ en merge't ze
in plaatsers/verkopers/distributeurs/alle_garages.json.

Match-regels (in volgorde):
  1. BTW exact
  2. Website-domain (genormaliseerd)
  3. Naam-normalised + plaats-normalised

Categorie-bepaling per nieuw record (in volgorde):
  1. categorie_hint veld uit wave6 output (plaatser/verkoper/alle_garage)
  2. Naam bevat trekhaak/aanhang/attelage/remorque -> plaatser
  3. Default: alle_garages

Keten-records (Norauto/Halfords/Speedy/Midas/Auto5/etc) krijgen parent_btw veld
en categorie verkoper als de keten een retail-keten is.
"""

from __future__ import annotations

import glob
import io
import json
import os
import re
import sys
from typing import Any

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8-sig")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
CACHE = os.path.join(DATA, "_bron-cache")

SPECIALIST_TERMS = re.compile(
    r"trekhaak|trekhake|aanhangwagen|aanhang(?!er)|towbar|trailer"
    r"|attelage|remorque|attache.?remorque|attaches?.?remorques?"
    r"|anh(a|ae|ä)nger|kupplung",
    re.IGNORECASE,
)

# Trekhaak-OEM-merken: bedrijven die deze voeren = zeker trekhaak-plaatsing
TREKHAAK_OEM = {
    "brink", "gdw", "westfalia", "bosal", "oris", "acps", "sawiko",
    "al-ko", "al ko", "thule", "steinhof", "autohak", "mvg", "aceko", "vezeko",
}
# Aanhangwagen-merken: dealer = waarschijnlijk ook trekhaak-plaatsing
AANHANG_MERKEN = {
    "saris", "hapert", "humbaur", "anssems", "brenderup", "ifor williams",
    "eduard", "variant", "pongratz", "stema", "henra", "vlemmix", "wm-meyer",
    "vezeko", "dgs", "tijhof",
}
# Caravan/kampeerauto-only merken: zonder trekhaak-/aanhang-merk = GEEN trekhaak-focus
CARAVAN_ONLY_MERKEN = {
    "hobby", "fendt", "knaus", "tabbert", "hymer", "dethleffs", "adria",
    "pilote", "chausson", "lmc", "sterckeman", "eriba", "bürstner", "burstner",
    "weinsberg", "carado", "challenger",
}
CARAVAN_INFO_TERMS = re.compile(
    r"motorhome|kampeerauto|wohnmobil|camper(?!\s)|caravan",
    re.IGNORECASE,
)

RETAIL_KETENS = {
    "norauto", "halfords", "auto5", "feu vert", "feuvert",
    "kwik-fit", "kwikfit",
}


def load_json(path: str, default: Any = None) -> Any:
    try:
        with open(path, "r", encoding="utf-8-sig") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8-sig") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def norm_name(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^\w\s.\-]", "", s)
    return s


def norm_plaats(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"\(.*?\)", "", s)
    return s.strip()


def norm_domain(s: str | None) -> str:
    if not s:
        return ""
    s = s.lower().strip()
    s = re.sub(r"^https?://", "", s)
    s = s.lstrip("www.").rstrip("/")
    return s.split("/")[0]


def norm_btw(s: str | None) -> str:
    if not s:
        return ""
    return re.sub(r"[^0-9]", "", str(s))


def build_index(records: list[dict], source_name: str) -> dict:
    idx: dict = {}
    for r in records:
        btw = norm_btw(r.get("btw"))
        if btw:
            idx[("btw", btw)] = (source_name, r)
        dom = norm_domain(r.get("website"))
        if dom and dom not in {"auto5.be", "norauto.be", "halfords.be"}:
            # Skip keten-domains in dom-dedup (anders alle filialen = 1 record)
            idx[("dom", dom)] = (source_name, r)
        n = norm_name(r.get("naam"))
        p = norm_plaats(r.get("plaats") or r.get("adres", ""))
        if n:
            idx[("np", n, p)] = (source_name, r)
    return idx


def find_match(r: dict, indexes: list[dict]) -> tuple[str, dict] | None:
    btw = norm_btw(r.get("btw"))
    if btw:
        for idx in indexes:
            if ("btw", btw) in idx:
                return idx[("btw", btw)]

    dom = norm_domain(r.get("website"))
    if dom and dom not in {"auto5.be", "norauto.be", "halfords.be"}:
        for idx in indexes:
            if ("dom", dom) in idx:
                return idx[("dom", dom)]

    n = norm_name(r.get("naam"))
    p = norm_plaats(r.get("plaats") or r.get("adres", ""))
    if n:
        for idx in indexes:
            if ("np", n, p) in idx:
                return idx[("np", n, p)]
            if ("np", n, "") in idx:
                return idx[("np", n, "")]
    return None


def merge_fields(target: dict, new: dict) -> None:
    """Vul ontbrekende velden in target met data uit new. Geen overschrijving."""
    for k, v in new.items():
        if k == "naam":
            continue
        if v in (None, "", []):
            continue
        if k == "bron":
            existing = set(target.get("bron") or [])
            existing.update(v if isinstance(v, list) else [v])
            target["bron"] = sorted(existing)
        elif k in {"gevoerde_merken", "merken_gevoerd"}:
            existing = set(
                (x.lower() for x in (target.get("merken_gevoerd") or []))
            )
            for m in v:
                if m.lower() not in existing:
                    target.setdefault("merken_gevoerd", []).append(m)
                    existing.add(m.lower())
        elif k == "categorieen":
            existing = set(target.get("categorieen") or [])
            existing.update(v)
            target["categorieen"] = sorted(existing)
        elif target.get(k) in (None, "", []):
            target[k] = v


HOOG_KETENS = {
    "auto5", "norauto", "midas", "bosch car service", "boschcarservice",
    "quickly", "eurorepar",
}
HOOG_OEM_BRONNEN = {
    "brink_dealer_locator", "gdw_dealer", "westfalia_partner",
    "bosal_dealer", "oris_dealer", "acps_partner", "sawiko_dealer",
    "al_ko_dealer", "thule_dealer",
    "wave6c_norauto_auto5", "wave6c_midas", "wave6c_bosch_car_service",
    "wave6c_quickly",
}


def assess_trekhaak_zekerheid(r: dict) -> tuple[str, str]:
    """Bepaal (zekerheid, reden) voor of dit bedrijf echt trekhaken plaatst.

    zekerheid: 'hoog' | 'midden' | 'laag'
    """
    naam = (r.get("naam") or "").lower()
    info = (r.get("info") or "").lower()
    website = (r.get("website") or "").lower()
    merken_lc = [(m or "").lower() for m in (r.get("gevoerde_merken") or [])
                 + (r.get("merken_gevoerd") or [])]
    bron = [(b or "").lower() for b in (r.get("bron") or [])]
    keten = (r.get("keten") or "").lower().strip()
    blob = f"{naam} {info} {website}"

    # HOOG: trekhaak-term in naam/website/info (matcht ook trekhake/trekhaken/trekhakencenter)
    if re.search(
        r"trekhaak|trekhake|trekhaken|towbar|attelage|attache.?remorque"
        r"|anh(a|ae|ä)ngerkupplung|kupplung",
        blob,
    ):
        return "hoog", "trekhaak-term in naam/website/info"
    if any(any(t in m for t in TREKHAAK_OEM) for m in merken_lc):
        return "hoog", "voert trekhaak-OEM-merk (Brink/GDW/Westfalia/...)"
    if any(b in HOOG_OEM_BRONNEN for b in bron):
        return "hoog", "OEM dealer-locator bron of keten met bevestigd trekhaak-aanbod"
    if keten in HOOG_KETENS:
        return "hoog", f"keten {keten} met bevestigd trekhaak-installatie-aanbod"

    # MIDDEN: aanhangwagen-merk of aanhang/remorque in naam
    if re.search(r"aanhang|remorque|trailer(?!\.)|attache", blob):
        return "midden", "aanhang/remorque/trailer term in naam"
    if any(m in AANHANG_MERKEN for m in merken_lc):
        return "midden", "voert aanhangwagen-merk (Ifor Williams/Eduard/Saris/...)"

    # LAAG: pure caravan/kampeerauto zonder trekhaak/aanhang signaal
    if any(m in CARAVAN_ONLY_MERKEN for m in merken_lc) or CARAVAN_INFO_TERMS.search(blob):
        return "laag", "caravan/kampeerauto zonder trekhaak-signaal"

    # Default: laag
    return "laag", "geen expliciete trekhaak-indicatie"


def categorie_for_new_record(r: dict, zekerheid: str) -> str:
    """Bepaal categorie voor een nieuw record gebaseerd op hint + zekerheid."""
    hint = (r.get("categorie_hint") or "").lower().strip()

    # Expliciete overrides eerst
    if hint in {"distributeur", "distributeurs"}:
        return "distributeurs"
    if hint in {"verkoper", "verkopers"}:
        return "verkopers"

    # Keten = retail = verkoper
    keten = (r.get("keten") or "").lower().strip()
    if keten in RETAIL_KETENS:
        return "verkopers"

    # Zekerheid bepaalt of het in plaatsers mag
    if zekerheid == "hoog":
        # Hoog = altijd plaatser, ongeacht hint
        return "plaatsers"
    if zekerheid == "midden":
        # Midden = plaatser ALS hint plaatser is, anders alle_garages
        if hint in {"plaatser", "plaatsers", "alle_garage", "alle_garages", "garage", ""}:
            return "plaatsers"
        return "alle_garages"
    # Laag = nooit plaatser, altijd alle_garages (caravan/motorhome of generieke garage)
    return "alle_garages"


def normalize_record_schema(r: dict) -> dict:
    """Normaliseer wave6 schema naar canonical schema."""
    out = dict(r)

    # gevoerde_merken -> merken_gevoerd (canonical)
    if "gevoerde_merken" in out:
        merken = out.pop("gevoerde_merken")
        if merken and not out.get("merken_gevoerd"):
            out["merken_gevoerd"] = merken

    # categorie_hint wordt niet bewaard in eind-record
    out.pop("categorie_hint", None)

    # Bron normaliseren naar list
    bron = out.get("bron")
    if isinstance(bron, str):
        out["bron"] = [bron]

    out.setdefault("land", "BE")
    out["lat"] = out.get("lat")
    out["lng"] = out.get("lng")
    return out


def main() -> None:
    plaatsers = load_json(os.path.join(DATA, "plaatsers.json"), [])
    verkopers = load_json(os.path.join(DATA, "verkopers.json"), [])
    distrs = load_json(os.path.join(DATA, "distributeurs.json"), [])
    alle_garages = load_json(os.path.join(DATA, "alle_garages.json"), [])

    cats_lists = {
        "plaatsers": plaatsers,
        "verkopers": verkopers,
        "distributeurs": distrs,
        "alle_garages": alle_garages,
    }

    indexes_by_cat = {cat: build_index(lst, cat) for cat, lst in cats_lists.items()}
    indexes_in_order = list(indexes_by_cat.values())

    patterns = ["wave6*.json"]
    cache_files: list[str] = []
    for p in patterns:
        cache_files.extend(sorted(glob.glob(os.path.join(CACHE, p))))

    if not cache_files:
        print("Geen wave6-cache-files gevonden in data/_bron-cache/. Niets te mergen.")
        return

    total_in = 0
    updates = 0
    adds = {"plaatsers": 0, "verkopers": 0, "distributeurs": 0, "alle_garages": 0}
    skipped_invalid = 0

    for f in cache_files:
        records = load_json(f, [])
        if not isinstance(records, list):
            print(f"  ! {os.path.basename(f)} bevat geen list, sla over")
            continue
        print(f"Verwerken: {os.path.basename(f)} ({len(records)} records)")
        total_in += len(records)
        for raw in records:
            if not isinstance(raw, dict) or not raw.get("naam"):
                skipped_invalid += 1
                continue
            r = normalize_record_schema(raw)
            match = find_match(r, indexes_in_order)
            if match:
                _, existing = match
                merge_fields(existing, r)
                updates += 1
                continue

            # Bepaal trekhaak-zekerheid voor classify + tool-display
            zekerheid, reden = assess_trekhaak_zekerheid(r)
            # Nieuwe record
            cat = categorie_for_new_record(r, zekerheid)
            new = dict(r)
            new["trekhaak_zekerheid"] = zekerheid
            new["zekerheid_reden"] = reden
            new["primaire_categorie"] = (
                "plaatser"
                if cat == "plaatsers"
                else "verkoper"
                if cat == "verkopers"
                else "distributeur"
                if cat == "distributeurs"
                else "alle_garages"
            )
            new["categorieen"] = sorted(
                set((r.get("categorieen") or []) + [new["primaire_categorie"]])
            )

            cats_lists[cat].append(new)
            adds[cat] += 1

            # Index updaten
            btw = norm_btw(new.get("btw"))
            if btw:
                indexes_by_cat[cat][("btw", btw)] = (cat, new)
            dom = norm_domain(new.get("website"))
            if dom and dom not in {"auto5.be", "norauto.be", "halfords.be"}:
                indexes_by_cat[cat][("dom", dom)] = (cat, new)
            n = norm_name(new.get("naam"))
            p = norm_plaats(new.get("plaats") or new.get("adres", ""))
            if n:
                indexes_by_cat[cat][("np", n, p)] = (cat, new)

    # Final pass: zorg dat ELK record een trekhaak_zekerheid heeft (ook bestaande)
    zekerheid_stats = {"hoog": 0, "midden": 0, "laag": 0}
    for cat_name, lst in cats_lists.items():
        for r in lst:
            if not r.get("trekhaak_zekerheid"):
                z, reden = assess_trekhaak_zekerheid(r)
                r["trekhaak_zekerheid"] = z
                r["zekerheid_reden"] = reden
            zekerheid_stats[r["trekhaak_zekerheid"]] += 1

    for name, lst in cats_lists.items():
        save_json(os.path.join(DATA, f"{name}.json"), lst)

    print()
    print("═══════════════════════════════════════════════════════════")
    print("Wave-6 merge gereed")
    print("═══════════════════════════════════════════════════════════")
    print(f"Input cache-files:     {len(cache_files)}")
    print(f"Total input records:   {total_in}")
    print(f"Updates (match):       {updates}")
    print(f"Adds (new):            {sum(adds.values())}")
    print(f"  -> plaatsers:        +{adds['plaatsers']}")
    print(f"  -> verkopers:        +{adds['verkopers']}")
    print(f"  -> distributeurs:    +{adds['distributeurs']}")
    print(f"  -> alle_garages:     +{adds['alle_garages']}")
    print(f"Skipped (invalid):     {skipped_invalid}")
    print()
    print("Eind-tellingen:")
    print(f"  plaatsers.json:      {len(plaatsers)}")
    print(f"  verkopers.json:      {len(verkopers)}")
    print(f"  distributeurs.json:  {len(distrs)}")
    print(f"  alle_garages.json:   {len(alle_garages)}")
    print(f"  TOTAAL:              {sum(len(l) for l in cats_lists.values())}")
    print()
    print("Trekhaak-zekerheid spreiding (alle 4 categorien):")
    print(f"  hoog:    {zekerheid_stats['hoog']}")
    print(f"  midden:  {zekerheid_stats['midden']}")
    print(f"  laag:    {zekerheid_stats['laag']}")


if __name__ == "__main__":
    main()
