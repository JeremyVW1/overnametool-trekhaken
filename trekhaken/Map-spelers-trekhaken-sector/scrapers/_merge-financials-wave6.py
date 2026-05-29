"""Wave-6 financials merge — leest financials-be-wave6.json en update bestaande records."""

from __future__ import annotations

import io
import json
import os
import re
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")

FIN_FIELDS = [
    "cw_omzet",
    "cw_brutomarge",
    "cw_winst",
    "cw_fte",
    "cw_jaar",
    "bizzy_ebitda",
    "oprichting",
    "financials_bron",
]


def load(name: str) -> list:
    with open(os.path.join(DATA, name), "r", encoding="utf-8-sig") as f:
        return json.load(f)


def save(name: str, data: list) -> None:
    with open(os.path.join(DATA, name), "w", encoding="utf-8-sig") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def norm_btw(b: str | None) -> str:
    return re.sub(r"[^0-9]", "", str(b or ""))


def main() -> None:
    try:
        fins = load("_bron-cache/financials-be-wave6.json")
    except FileNotFoundError:
        print("financials-be-wave6.json niet gevonden — sla over.")
        return

    files = ["plaatsers.json", "verkopers.json", "distributeurs.json", "alle_garages.json"]
    idx: dict[str, tuple[str, dict]] = {}
    all_arrs: dict[str, list] = {}
    for f in files:
        try:
            arr = load(f)
            all_arrs[f] = arr
            for r in arr:
                b = norm_btw(r.get("btw"))
                if b:
                    idx[b] = (f, r)
        except FileNotFoundError:
            pass

    updates = 0
    unmatched: list[str] = []
    for f in fins:
        b = norm_btw(f.get("btw"))
        if not b:
            continue
        if b in idx:
            _, target = idx[b]
            for fld in FIN_FIELDS:
                if fld in f and f[fld] is not None and f[fld] != "":
                    target[fld] = f[fld]
            if "info_extra" in f and f["info_extra"]:
                target["info"] = (target.get("info", "") + " | " + f["info_extra"]).strip(" |")
            bron = target.get("bron") or []
            if "financials_pappers_wave6" not in bron:
                bron.append("financials_pappers_wave6")
                target["bron"] = bron
            updates += 1
        else:
            unmatched.append(f.get("naam") or "?")

    for fname, arr in all_arrs.items():
        save(fname, arr)

    print(f"Wave-6 financials merge gereed: {updates}/{len(fins)} records geupdate.")
    if unmatched:
        print("Unmatched (geen BTW-match in dataset):")
        for n in unmatched[:15]:
            print(f"  - {n}")
        if len(unmatched) > 15:
            print(f"  ... +{len(unmatched) - 15} more")


if __name__ == "__main__":
    main()
