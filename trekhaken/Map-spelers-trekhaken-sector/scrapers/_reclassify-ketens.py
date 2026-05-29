"""
_reclassify-ketens.py

Verplaatst keten-service-centra (Eurorepar/Midas/Bosch Car/Quickly/Kwikfit) uit
plaatsers naar alle_garages, en degradeert hun zekerheid naar midden of laag.

Reden: Jeremy wil dat 'plaatsers' alleen ECHTE trekhaak-specialisten bevat.
Keten-vestigingen plaatsen wel trekhaken maar het is een klein bijproduct van hun aanbod.

Regels:
  - Auto5/Norauto/Halfords/Feu Vert (RETAIL_KETENS)
      -> blijft 'verkoper', zekerheid = midden
  - Midas/Bosch Car Service/Quickly/Eurorepar/Kwikfit/AD/Speedy/1.2.3 (SERVICE_KETENS)
      -> verplaats naar 'alle_garages', zekerheid = midden
  - Carglass = ALLEEN ruiten, geen trekhaak -> alle_garages, zekerheid = laag
"""

from __future__ import annotations

import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

RETAIL_KETENS = [
    (re.compile(r"\bauto\s*5\b|\bauto5\b", re.IGNORECASE), "Auto5", "midden"),
    (re.compile(r"\bnorauto\b", re.IGNORECASE), "Norauto", "midden"),
    (re.compile(r"\bhalfords\b", re.IGNORECASE), "Halfords", "midden"),
    (re.compile(r"\bfeu\s*vert\b|\bfeuvert\b", re.IGNORECASE), "Feu Vert", "midden"),
]

SERVICE_KETENS = [
    (re.compile(r"\bmidas\b", re.IGNORECASE), "Midas", "midden"),
    (re.compile(r"bosch.car|bosch car service", re.IGNORECASE), "Bosch Car Service", "midden"),
    (re.compile(r"\bquickly\b", re.IGNORECASE), "Quickly", "midden"),
    (re.compile(r"\beurorepar\b", re.IGNORECASE), "Eurorepar", "midden"),
    (re.compile(r"\bkwikfit\b|\bkwik.fit\b", re.IGNORECASE), "Kwik-Fit", "midden"),
    (re.compile(r"\bad\s*auto.?service\b", re.IGNORECASE), "AD Auto Service", "midden"),
    (re.compile(r"\bspeedy\b(?!.+verhuis)", re.IGNORECASE), "Speedy", "midden"),
    (re.compile(r"\b1[.,]2[.,]3.?autoservice\b|\b123autoservice\b", re.IGNORECASE), "1.2.3.AutoService", "midden"),
    (re.compile(r"\bcarglass\b", re.IGNORECASE), "Carglass", "laag"),
]


def load(name: str) -> list:
    with open(os.path.join(DATA, name), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def save(name: str, data: list) -> None:
    with open(os.path.join(DATA, name), "w", encoding="utf-8-sig") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def detect_keten(naam: str) -> tuple[str, str, str] | None:
    """Returns (ketennaam, target_categorie, target_zekerheid) of None."""
    for pat, ketennaam, zek in RETAIL_KETENS:
        if pat.search(naam):
            return (ketennaam, "verkopers", zek)
    for pat, ketennaam, zek in SERVICE_KETENS:
        if pat.search(naam):
            return (ketennaam, "alle_garages", zek)
    return None


def main() -> None:
    cats = {
        "plaatsers": load("plaatsers.json"),
        "verkopers": load("verkopers.json"),
        "distributeurs": load("distributeurs.json"),
        "alle_garages": load("alle_garages.json"),
    }

    # Stats
    verplaatst: dict[tuple[str, str, str], int] = {}
    gedegradeerd: dict[str, int] = {}

    # Pass 1: scan alle records, detect keten, en mark voor verplaatsing
    nieuwe_cats = {k: [] for k in cats}
    for cat_name, lst in cats.items():
        for r in lst:
            naam = r.get("naam") or ""
            det = detect_keten(naam)
            if det is None:
                nieuwe_cats[cat_name].append(r)
                continue
            ketennaam, target_cat, target_zek = det

            # Update zekerheid
            old_zek = r.get("trekhaak_zekerheid")
            if old_zek != target_zek:
                r["trekhaak_zekerheid"] = target_zek
                r["zekerheid_reden"] = f"keten-vestiging {ketennaam} (trekhaak is bijaanbod, geen specialiteit)"
                gedegradeerd[ketennaam] = gedegradeerd.get(ketennaam, 0) + 1

            # Verplaats indien nodig
            if cat_name != target_cat:
                # Update categorie-velden
                primaire = (
                    "plaatser"
                    if target_cat == "plaatsers"
                    else "verkoper"
                    if target_cat == "verkopers"
                    else "distributeur"
                    if target_cat == "distributeurs"
                    else "alle_garages"
                )
                r["primaire_categorie"] = primaire
                existing_cats = set(r.get("categorieen") or [])
                # Verwijder oude primaire-categorie als die nu inkorrekt is
                old_primaire = (
                    "plaatser" if cat_name == "plaatsers"
                    else "verkoper" if cat_name == "verkopers"
                    else "distributeur" if cat_name == "distributeurs"
                    else "alle_garages"
                )
                existing_cats.discard(old_primaire)
                existing_cats.add(primaire)
                r["categorieen"] = sorted(existing_cats)
                r["classified_from"] = cat_name

                nieuwe_cats[target_cat].append(r)
                verplaatst[(ketennaam, cat_name, target_cat)] = verplaatst.get((ketennaam, cat_name, target_cat), 0) + 1
            else:
                nieuwe_cats[cat_name].append(r)

    for name, lst in nieuwe_cats.items():
        save(f"{name}.json", lst)

    print("═══════════════════════════════════════════════════════════")
    print("Keten-reclassificatie gereed")
    print("═══════════════════════════════════════════════════════════")
    print()
    if verplaatst:
        print("Verplaatsingen tussen categorieën:")
        for (ketennaam, src, dst), n in sorted(verplaatst.items()):
            print(f"  {ketennaam:<22} {src:<14} -> {dst:<14}  {n}")
    else:
        print("Geen verplaatsingen nodig.")
    print()
    print("Zekerheid gedegradeerd:")
    for ketennaam, n in sorted(gedegradeerd.items()):
        print(f"  {ketennaam:<22}  {n}")
    print()
    print("Nieuwe eind-tellingen:")
    for name, lst in nieuwe_cats.items():
        print(f"  {name}.json:        {len(lst)}")


if __name__ == "__main__":
    main()
