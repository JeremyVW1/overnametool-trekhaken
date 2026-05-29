"""Wave-6 BTW-lookup merge — voor elke match update BTW + adres + telefoon + website + oprichting."""

from __future__ import annotations

import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")


def load(name: str) -> list:
    with open(os.path.join(DATA, name), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def save(name: str, data: list) -> None:
    with open(os.path.join(DATA, name), "w", encoding="utf-8-sig") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def norm(s: str | None) -> str:
    return (s or "").strip().lower()


def naam_match(a: str | None, b: str | None) -> bool:
    n1, n2 = norm(a), norm(b)
    if not n1 or not n2:
        return False
    return n1 == n2 or n2 in n1 or n1 in n2


ADDITIVE = ["btw", "adres", "telefoon", "website", "oprichting"]


def main() -> None:
    try:
        upd = load("_bron-cache/btw-lookups-wave6.json")
    except FileNotFoundError:
        print("btw-lookups-wave6.json niet gevonden — sla over.")
        return

    files = ["plaatsers.json", "verkopers.json", "distributeurs.json", "alle_garages.json"]
    arrays = {f: load(f) for f in files}

    stats = {"updated": 0, "not_found": []}
    for u in upd:
        match_naam = u.get("match_naam") or u.get("naam")
        if not match_naam:
            continue
        found = False
        for fname, arr in arrays.items():
            for r in arr:
                if naam_match(r.get("naam"), match_naam):
                    for fld in ADDITIVE:
                        if fld in u and u[fld]:
                            if fld == "btw" and not r.get("btw"):
                                r["btw"] = u["btw"]
                            elif fld != "btw" and not r.get(fld):
                                r[fld] = u[fld]
                    if u.get("info_add"):
                        r["info"] = (r.get("info", "") + " | " + u["info_add"]).strip(" |")
                    if u.get("adres"):
                        r["lat"] = None
                        r["lng"] = None
                    bron = r.get("bron") or []
                    if "btw_lookup_wave6" not in bron:
                        bron.append("btw_lookup_wave6")
                        r["bron"] = bron
                    stats["updated"] += 1
                    found = True
                    break
            if found:
                break
        if not found:
            stats["not_found"].append(match_naam)

    for fname, arr in arrays.items():
        save(fname, arr)

    print("Wave-6 BTW-lookup merge:")
    print(f"  Updated: {stats['updated']}/{len(upd)}")
    if stats["not_found"]:
        print(f"  Niet gevonden ({len(stats['not_found'])}):")
        for n in stats["not_found"][:15]:
            print(f"    - {n}")
        if len(stats["not_found"]) > 15:
            print(f"    ... +{len(stats['not_found']) - 15} more")


if __name__ == "__main__":
    main()
